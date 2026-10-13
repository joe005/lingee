/* 预制任务的演示操作记录；保留已有真实操作，仅补缺失的历史。 */
import { TK_TASKS, tkGetTasks, tkGetPerson, tkUpdateTask } from './data.js';
import { taskExecutionStages, taskStageAgentName } from './task-execution.js';

export function initDemoOperationHistory() {
  const seeds = new Map(TK_TASKS.map(task => [task.id, task]));
  tkGetTasks().forEach(task => {
    if (!seeds.has(task.id) || task.demoOperationHistoryVersion === 7) return;
    const stages = taskExecutionStages(task);
    const plan = task.executionPlan || [];
    if (!stages.length || !plan.length) return;
    // 重建补造的演示记录，真实历史始终保留；兼容上一版缓存。
    const seedHistory = seeds.get(task.id).statusHistory || [];
    const existing = (task.statusHistory || []).filter(row => !row.demo).map((row, index, history) => {
      // 种子中的旧启动记录曾统一署名为任务创建人；仅修复这些已知预制记录。
      const seedRow = seedHistory.find(seed => seed.time === row.time && seed.from === row.from && seed.to === row.to);
      if (!seedRow) return row;
      row = {...row,seedRecord:true};
      const following = history.slice(index + 1);
      const boundary = following.findIndex(change => change.to === 'in_progress');
      const submit = (boundary < 0 ? following : following.slice(0, boundary)).find(change => change.stageId && change.to === 'in_review');
      const stageId = row.stageId || submit?.stageId || task.executionStageId;
      const entry = plan.find(stage => stage.id === stageId);
      const stage = stages.find(stage => stage.id === stageId);
      if (!entry || !stage) return row;
      if (['in_review','blocked'].includes(row.to)) return {...row,stageId,author:taskStageAgentName(task,stageId),actorKind:'agent'};
      if (row.to === 'done') return {...row,stageId,author:entry.requiresConfirmation === false ? taskStageAgentName(task,stageId) : tkGetPerson(entry.reviewerId || entry.assigneeId || task.assignee).name,actorKind:entry.requiresConfirmation === false ? 'agent' : 'person'};
      return row.to === 'in_progress' && row.from === 'backlog'
        ? {...row, stageId, authorId:entry.assigneeId || task.assignee, message:'开始执行「' + stage.name + '」'} : row;
    });
    const firstRealTime = existing[0]?.time;
    const date = task.createDate;
    if (!date) return;
    const generated = [];
    stages.forEach((stage, index) => {
      const entry = plan.find(row => row.id === stage.id);
      const active = stage.id === task.executionStageId;
      const completed = entry?.status === 'done' || task.status === 'done';
      if (!completed && (!active || ['backlog','planned','cancelled'].includes(task.status))) return;
      const agent = taskStageAgentName(task, stage.id);
      const person = entry?.assigneeId || task.assignee;
      const stamp = offset => date + ' ' + String(10 + index).padStart(2, '0') + ':' + String(offset).padStart(2, '0') + ':00';
      generated.push({from:'backlog',to:'in_progress',authorId:person,stageId:stage.id,time:stamp(0),message:'开始执行「' + stage.name + '」',demo:true});
      if (entry?.requiresConfirmation !== false && (completed || entry?.status === 'review' || (active && task.status === 'in_review'))) {
        generated.push({from:'in_progress',to:'in_review',author:agent,actorKind:'agent',stageId:stage.id,time:stamp(10),demo:true});
      }
      if (completed) {
        const next = stages[index + 1];
        const automatic = entry?.requiresConfirmation === false;
        generated.push({from:'in_review',to:next ? 'backlog' : 'done',author:automatic ? agent : tkGetPerson(entry?.reviewerId || person).name,actorKind:automatic ? 'agent' : 'person',stageId:stage.id,time:stamp(15),message:'「' + stage.name + '」' + (automatic ? '执行完成' : '评审通过') + (next ? '，流转至「' + next.name + '」' : '，任务已完成'),demo:true});
      } else if (active && task.status === 'blocked') {
        generated.push({from:'in_progress',to:'blocked',author:agent,actorKind:'agent',stageId:stage.id,time:stamp(10),demo:true});
      }
    });
    const recorded = new Set(existing.map((row, index) => {
      let stageId = row.stageId;
      if (!stageId && row.to === 'in_progress') {
        const namedStage = stages.find(stage => row.message === '开始执行「' + stage.name + '」');
        const following = existing.slice(index + 1);
        const boundary = following.findIndex(change => change.to === 'in_progress');
        const submit = (boundary < 0 ? following : following.slice(0, boundary)).find(change => change.stageId && change.to === 'in_review');
        stageId = namedStage?.id || submit?.stageId;
      }
      return stageId ? stageId + ':' + row.to : '';
    }));
    const missing = generated.filter(row => !recorded.has(row.stageId + ':' + row.to) && (!firstRealTime || row.time < firstRealTime));
    // 旧六阶段种子备注已由阶段操作历史覆盖，不再保留重复的流转说明。
    const seedComments = seeds.get(task.id).comments || [];
    const comments = (task.comments || []).filter(row => !(row.kind === 'flow'
      && /审核通过.*(?:流转|任务完成)/.test(row.text || '')
      && seedComments.some(seed => seed.createdAt === row.createdAt && seed.authorId === row.authorId && seed.text === row.text)));
    tkUpdateTask(task.id, {statusHistory:missing.concat(existing),comments,demoOperationHistoryVersion:7});
  });
}
