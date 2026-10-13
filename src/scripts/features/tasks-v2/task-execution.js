import { builtinDeliveryStages, deliveryStagesFor } from '../expert/delivery-stages.js';
import { EX, STAGES } from '../expert/data.js';
import { toast } from '../../core/toast.js';
import { escapeHtml } from './ui-utils.js';
import { tkCurrentStageHandlerId, tkCurrentUserId, tkGetPerson, tkGetTasks, tkGetTaskArtifacts, tkUpdateTask, tkCanViewTask, tkProjectById } from './data.js';

import { tbTeamStages } from '../collab/tb-core.js';
import { taskExecutorTeam } from '../expert/task-team.js';

const pendingStageReviews = new Map();

export function taskStageAgentName(task, stageId) {
  const entry = task.executionPlan?.find(row => row.id === stageId);
  const stage = taskExecutionStages(task).find(row => row.id === stageId);
  const team = taskExecutorTeam(task, tkProjectById(task.project));
  const matched = tbTeamStages(team, task).find(row => row.name === stage?.name || row.name === entry?.workType);
  const ids = task.expertId ? [task.expertId] : entry?.expertIds?.length ? entry.expertIds : matched?.expertIds || [];
  const executorId = entry?.executionExpertId || ids.find(id => EX[id]);
  return EX[executorId]?.name || '执行智能体';
}


export function taskExecutionStages(task) {
  return Array.isArray(task?.executionPlan) && task.executionPlan.length
    ? task.executionPlan.map(function (stage) { return {id:stage.id, name:stage.title || stage.workType, desc:stage.description || '', assigneeId:stage.assigneeId}; })
    : deliveryStagesFor(task?.teamId, task) || STAGES;
}

function stagePlan(task, stageId, status) {
  if (!Array.isArray(task.executionPlan)) return undefined;
  return task.executionPlan.map(function (stage) { return stage.id === stageId ? {...stage, status:status} : stage; });
}

export function taskStageHandoffPatch(task, assigneeId) {
  var waiting = !!task.executionStageId && task.status === 'in_progress';
  /* 流转覆盖当前处理人前记录历史处理人，「已办」视图据此识别本人处理过的任务。 */
  var previousAssignee = task.assignee;
  return {
    assignee:assigneeId, flowAssignee:'',
    ...(previousAssignee && previousAssignee !== assigneeId
      ? {assigneeHistory:(task.assigneeHistory || []).concat(previousAssignee)}
      : {}),
    ...(waiting ? {status:'backlog'} : {}),
    ...(Array.isArray(task.executionPlan) ? {executionPlan:task.executionPlan.map(function (stage) {
      return stage.id === task.executionStageId
        ? {...stage, assigneeId:assigneeId, ...(waiting ? {status:'pending'} : {})}
        : stage;
    })} : {}),
  };
}

export function startTaskStage(task, options) {
  if (!task) return {ok:false};
  var currentHandlerId = tkCurrentStageHandlerId(task);
  if (!options?.skipHandlerCheck && (!currentHandlerId || currentHandlerId !== tkCurrentUserId() || !tkCanViewTask(task))) {
    return {ok:false, message:'仅当前阶段处理人可开始执行'};
  }
  if (task.status === 'in_progress') {
    var current = taskExecutionStages(task).find(function (stage) { return stage.id === task.executionStageId; });
    if (!current && task.executionPlan?.length) {
      current = taskExecutionStages(task).find(function (stage) { return task.executionPlan.find(function (row) { return row.id === stage.id; })?.status !== 'done'; });
      if (current) tkUpdateTask(task.id,{executionStageId:current.id,executionPlan:stagePlan(task,current.id,'running')});
    }
    return {ok:!!current, stage:current};
  }
  if (!['planned','backlog'].includes(task.status)) return {ok:false};
  if (task.executionPlan?.length && task.executionPlan.some(function (stage) { return !stage.assigneeId; })) return {ok:false, message:'请先为执行计划的每个阶段指定负责人'};
  var stages = taskExecutionStages(task);
  var stage = stages.find(function (row) { return row.id === task.executionStageId; })
    || stages.find(function (row) { return task.executionPlan?.find(function (item) { return item.id === row.id; })?.status !== 'done'; })
    || stages[0];
  if (!stage) return {ok:false};
  var assigneeId = currentHandlerId || tkCurrentUserId() || task.assignee;
  tkUpdateTask(task.id, {status:'in_progress', assignee:assigneeId, executionStageId:stage.id, executionPlan:stagePlan(task,stage.id,'running'),
    ...(options?.fromSave ? {createdAndStarted:true} : {}),
    planStatus:task.executionPlan?.length ? 'confirmed' : task.planStatus,
    statusHistory:(task.statusHistory || []).concat({from:task.status,to:'in_progress',authorId:tkCurrentUserId(),stageId:stage.id,time:flowTimestamp(),creationStart:!!options?.fromSave,message:'开始执行「' + stage.name + '」'})});
  return {ok:true, stage:stage};
}

export function submitTaskStage(task) {
  if (task?.status !== 'in_progress') return {ok:false};
  var stage = taskExecutionStages(task).find(function (row) { return row.id === task.executionStageId; });
  if (!stage && task.executionPlan?.length) stage = taskExecutionStages(task).find(function (row) { return task.executionPlan.find(function (item) { return item.id === row.id; })?.status !== 'done'; });
  if (!stage) return {ok:false};
  var artifacts = task.executionArtifacts || [];
  if (!tkGetTaskArtifacts(task).some(function (artifact) { return artifact.stageId === stage.id; })) {
    var now = new Date();
    var date = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
      + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    var templateId = /需求/.test(stage.name) ? 'requirements'
      : /设计|规划/.test(stage.name) ? 'technical'
      : /编码|实现|开发/.test(stage.name) ? 'implementation'
      : /测试|验证|验收/.test(stage.name) ? 'test'
      : /部署|交付|发布/.test(stage.name) ? 'delivery' : 'technical';
    var template = tkGetTaskArtifacts(task).find(function (artifact) { return artifact.id === templateId; });
    artifacts = artifacts.concat(template ? {
      ...template, id:'stage-' + stage.id, stageId:stage.id,
      status:'待评审', date:date,
    } : {
      id:'stage-' + stage.id, stageId:stage.id, type:'技术文档',
      docTitle:'《' + task.title + '》阶段执行记录', summary:stage.desc || task.title,
      status:'待评审', date:date, author:'执行 Agent',
      sections:[{heading:'执行目标',blocks:[{p:stage.desc || task.desc || task.title}]},
        {heading:'提交说明',blocks:[{p:'本阶段产物已生成，等待项目负责人确认；确认后提交并流转。'}]}],
    });
  }
  const agentName = taskStageAgentName(task, stage.id);
  const time = flowTimestamp();
  tkUpdateTask(task.id, {status:'in_review', executionStageId:stage.id, executionPlan:stagePlan(task,stage.id,'review'), executionArtifacts:artifacts,
    statusHistory:(task.statusHistory || []).concat({from:'in_progress',to:'in_review',author:agentName,actorKind:'agent',stageId:stage.id,time,message:'「' + stage.name + '」执行完成，提交评审'}),
    comments:task.comments || []});
  if (task.executionPlan?.find(function (row) { return row.id === stage.id; })?.requiresConfirmation === false) {
    const approved = reviewTaskStage(task, true, {automatic:true});
    if (approved.ok && approved.next) {
      // 等当前会话保存完成后再发起下一阶段，避免新会话覆盖本阶段结果。
      setTimeout(async function () {
        const current = tkGetTasks().find(function (row) { return row.id === task.id; });
        if (!current || current.status !== 'backlog' || current.executionStageId !== approved.next.id) return;
        if (tkCurrentStageHandlerId(current) !== tkCurrentUserId()) {
          toast(escapeHtml(stage.name) + '已完成，已流转给「' + escapeHtml(tkGetPerson(tkCurrentStageHandlerId(current)).name) + '」', 'success', 3000);
          return;
        }
        const nextStageActions = await import('./page/utils.js');
        const latest = tkGetTasks().find(function (row) { return row.id === task.id; });
        if (latest?.status === 'backlog' && latest.executionStageId === approved.next.id) {
          nextStageActions.startTaskExecution(task.id, {automatic:true, previousStageName:stage.name});
        }
      }, 0);
    }
    return approved.ok ? {ok:true, stage:stage, autoReviewed:true, next:approved.next, done:approved.done} : approved;
  }
  return {ok:true, stage:stage};
}

export function scheduleTaskStageStartedNotice(taskId, stageId) {
  if (!stageId || pendingStageReviews.has(taskId)) return;
  const timer = setTimeout(function () {
    pendingStageReviews.delete(taskId);
    const task = tkGetTasks().find(function (row) { return row.id === taskId; });
    if (!task || !['in_progress', 'in_review'].includes(task.status) || task.executionStageId !== stageId) return;
    document.dispatchEvent(new CustomEvent('lingee:task-stage-started-notice', {detail:{taskId:taskId, stageId:stageId}}));
  }, 5000);
  pendingStageReviews.set(taskId, timer);
}

/* 交付智能体的任务：测试验证通过后直接提交上架，后续由管理员审核，「提交上架」阶段随之完成。 */
export function isAgentSubmitStep(task) {
  if (!task?.deliversAgent || task.status !== 'in_review') return false;
  var stages = taskExecutionStages(task);
  var index = stages.findIndex(function (stage) { return stage.id === task.executionStageId; });
  var builtin = builtinDeliveryStages(task.teamId);
  return index >= 0 && index === stages.length - (builtin ? 1 : 2);
}
export function approveAndSubmitAgent(task) {
  if (!isAgentSubmitStep(task)) return {ok:false};
  var reviewed = reviewTaskStage(task, true);
  if (!reviewed.ok) return reviewed;
  var current = tkGetTasks().find(function (row) { return row.id === task.id; });
  var last = taskExecutionStages(current).slice(-1)[0];
  tkUpdateTask(task.id, {status:'done', executionStageId:last.id, executionPlan:stagePlan(current, last.id, 'done'), assigneeHistory:current.assigneeHistory});
  return {ok:true, stage:reviewed.stage, done:true};
}

function flowTimestamp() {
  var now = new Date();
  function pad(value) { return String(value).padStart(2, '0'); }
  return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' '
    + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
}

export function reviewTaskStage(task, approved, options) {
  if (task?.status !== 'in_review') return {ok:false};
  var stages = taskExecutionStages(task);
  var index = stages.findIndex(function (stage) { return stage.id === task.executionStageId; });
  if (index < 0 && task.executionPlan?.length) index = stages.findIndex(function (stage) { return task.executionPlan.find(function (row) { return row.id === stage.id; })?.status !== 'done'; });
  if (index < 0) return {ok:false};
  var stage = stages[index], next = stages[index + 1];
  var plan = stagePlan(task, stage.id, approved ? 'done' : 'running');
  var nextAssignee = approved && next ? task.flowAssignee || next.assigneeId || (!task.executionPlan?.length ? task.assignee : '') : '';
  if (approved && next && !nextAssignee) return {ok:false, message:'请先指定下一阶段处理人'};
  if (approved && next && plan) plan = plan.map(function (row) { return row.id === next.id ? {...row,assigneeId:nextAssignee,status:'pending'} : row; });
  var patch = {status:approved ? next ? 'backlog' : 'done' : 'in_progress',
    executionStageId:approved && next ? next.id : stage.id, executionPlan:plan};
  if (approved) {
    /* 通过即流转：上一处理人与审核人记入历史处理人（「已办」据此识别），并追加与手动流转一致的动态记录。 */
    var reviewerId = tkCurrentUserId();
    var history = (task.assigneeHistory || []).slice();
    [task.assignee, reviewerId].forEach(function (id) {
      if (id && id !== nextAssignee && !history.includes(id)) history.push(id);
    });
    patch.assigneeHistory = history;
    if (next) {
      patch.assignee = nextAssignee;
      patch.flowAssignee = '';
      patch.comments = (task.comments || []).concat([{kind:'flow', authorId:reviewerId, createdAt:flowTimestamp(), fromStatus:'in_review', fromAssignee:task.assignee, status:'backlog', assignee:nextAssignee, text:''}]);
    }
    var artifacts = (task.executionArtifacts || []).map(function (artifact) {
      return artifact.stageId === stage.id ? {...artifact, status:'已通过'} : artifact;
    });
    if (artifacts.length) patch.executionArtifacts = artifacts;
  }
  if (options?.automatic && approved) {
    var automaticHistory = (task.statusHistory || []).slice();
    var submitted = automaticHistory.at(-1);
    if (submitted?.stageId === stage.id && submitted.to === 'in_review' && submitted.actorKind === 'agent') automaticHistory.pop();
    patch.statusHistory = automaticHistory.concat({from:task.status,to:patch.status,author:taskStageAgentName(task, stage.id),actorKind:'agent',stageId:stage.id,time:flowTimestamp(),message:'「' + stage.name + '」执行完成' + (next ? '，流转至「' + next.name + '」' : '，任务已完成')});
    if (patch.comments) patch.comments = task.comments || [];
  } else {
    patch.statusHistory = (task.statusHistory || []).concat({from:task.status,to:patch.status,authorId:tkCurrentUserId(),actorKind:'person',stageId:stage.id,time:flowTimestamp(),message:'「' + stage.name + '」' + (approved ? '评审通过' + (next ? '，流转至「' + next.name + '」' : '，任务已完成') : '评审未通过，继续执行')});
    // 阶段审核与流转合并为一条操作记录。
    if (patch.comments) patch.comments = task.comments || [];
  }
  tkUpdateTask(task.id, patch);
  /* 交付智能体的任务：「提交上架」阶段通过后，智能体开发里的对应智能体同步为已提交 */
  if (approved && !next && task.deliversAgent) document.dispatchEvent(new CustomEvent('lingee:agent-delivered', {detail:{name:task.deliversAgent}}));
  return {ok:true, stage:stage, next:approved ? next : null, done:approved && !next};
}
