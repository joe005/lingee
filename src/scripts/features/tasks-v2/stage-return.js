import { tkCanViewTask, tkCurrentStageHandlerId, tkCurrentUserId, tkGetTasks, tkUpdateTask } from './data.js';

/* 退回只作用于当前节点；退回区间重置，产物与执行记录保留。 */
export function returnableStages(task) {
  if (!task || !tkCanViewTask(task) || tkCurrentStageHandlerId(task) !== tkCurrentUserId()
    || !['backlog', 'in_review', 'blocked'].includes(task.status)) return [];
  const plan = task.executionPlan || [];
  const current = plan.findIndex(stage => stage.id === task.executionStageId);
  if (current < 1 || ['running', 'dispatched', 'done'].includes(plan[current].status)) return [];
  return plan.slice(0, current).filter(stage => stage.status === 'done');
}
export function returnTaskStage(taskId, targetId, reason) {
  const task = tkGetTasks().find(row => row.id === taskId);
  const target = returnableStages(task).find(stage => stage.id === targetId);
  if (!target) return { ok:false, message:'任务状态或权限已变化，无法退回该节点' };
  if (!reason?.trim()) return { ok:false, message:'请填写退回原因' };
  if (!target.assigneeId) return { ok:false, message:'目标节点未指定处理人，请先完善执行计划' };
  const plan = task.executionPlan;
  const from = plan.find(stage => stage.id === task.executionStageId);
  const index = plan.findIndex(stage => stage.id === targetId);
  const time = new Date().toISOString();
  const message = '「' + (from.title || from.workType) + '」退回至「' + (target.title || target.workType) + '」：' + reason.trim();
  const patch = {
    status:'backlog', executionStageId:targetId, assignee:target.assigneeId, flowAssignee:'', blockedRun:null,
    executionPlan:plan.map((stage, i) => i >= index ? {...stage, status:'pending'} : stage),
    statusHistory:(task.statusHistory || []).concat({from:task.status,to:'backlog',authorId:tkCurrentUserId(),actorKind:'person',stageId:targetId,time,message}),
    stageReturns:(task.stageReturns || []).concat({fromStageId:from.id,toStageId:targetId,reason:reason.trim(),authorId:tkCurrentUserId(),createdAt:time}),
  };
  tkUpdateTask(task.id, patch);
  return {ok:true};
}
