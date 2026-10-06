import { tkCanStartTask, tkCurrentStageHandlerId, tkCurrentUserId, tkGetPerson, tkGetStatusName } from './data.js';
import { taskExecutionStages } from './task-execution.js';
import { taskConversationNeedsReply, taskConversationQuestion } from '../composer.js';

/* 任务列表卡片与详情主操作共用的「轮到谁」判定。
   同一条任务对不同登录人展示不同：当前阶段处理人看到可操作的卡片，其他人只能查看进展。
   action 取值：start 开始执行 / review 验收产物 / reply 回答提问 / retry 重新执行 / detail 查看详情 / artifacts 查看产物。 */
function currentStageName(task) {
  var plan = Array.isArray(task.executionPlan) ? task.executionPlan : [];
  var stage = plan.find(function (row) { return row.id === task.executionStageId; })
    || plan.find(function (row) { return row.status !== 'done'; });
  if (stage) return stage.title || stage.workType || '';
  return taskExecutionStages(task).find(function (row) { return row.id === task.executionStageId; })?.name || '';
}

export function taskListKind(task) {
  var me = tkCurrentUserId();
  var handlerId = tkCurrentStageHandlerId(task);
  var mine = !!me && handlerId === me;
  var stage = currentStageName(task);
  var quoted = stage ? '「' + stage + '」' : '';
  var handler = handlerId ? tkGetPerson(handlerId).name : '';
  var waitingName = handler && handler !== '未分配' ? handler : '他人';
  var status = task.status;
  var reason = status === 'blocked' ? String(task.blockedRun?.reason || '').trim() : '';

  if (status === 'done') return { kind:'done', badge:'已完成', hint:'全部阶段已交付', action:'artifacts', label:'查看产物', needsMe:false };
  if (status === 'backlog' && mine && tkCanStartTask(task)) {
    return { kind:'start', badge:'待开始', hint:'轮到你开始执行' + quoted, action:'start', label:'交给AI执行', primary:true, needsMe:true };
  }
  if (status === 'in_review' && mine) {
    return { kind:'review', badge:'待确认', hint:'智能体团队已提交' + quoted + '产物，等待你确认', action:'review', label:'查看并验收产物', primary:true, needsMe:true };
  }
  if (status === 'in_progress' && taskConversationNeedsReply(task)) {
    var question = taskConversationQuestion(task);
    return { kind:'question', badge:'待回答', hint:'AI 正在等你回答' + (question ? '：' + question : ''), action:'reply', label:'回答提问', primary:true, needsMe:true };
  }
  if (status === 'blocked') {
    var blockedHint = (quoted ? quoted + '执行受阻' : '执行受阻') + (reason ? '：' + reason : '');
    return mine
      ? { kind:'blocked', badge:'已阻塞', hint:blockedHint, action:'retry', label:'重新执行', primary:true, needsMe:true }
      : { kind:'blocked', badge:'已阻塞', hint:blockedHint, action:'detail', label:'查看详情', needsMe:false };
  }
  if (status === 'backlog' || status === 'in_review') {
    return { kind:'waiting', badge:'待' + waitingName + (status === 'in_review' ? '确认' : '开始'), hint:'当前阶段' + quoted + '由' + waitingName + '处理', action:'detail', label:'查看详情', needsMe:false };
  }
  if (status === 'in_progress') {
    return { kind:'running', badge:'AI执行中', hint:'智能体团队正在执行' + quoted, action:'detail', label:'查看详情', needsMe:false };
  }
  return { kind:'waiting', badge:tkGetStatusName(status) || '待开始', hint:quoted ? '当前阶段' + quoted : '等待开始执行', action:'detail', label:'查看详情', needsMe:false };
}

/* 列表三个页签与协作开发菜单徽标共用同一口径。 */
export function taskNeedsMyAction(task) { return taskListKind(task).needsMe; }
