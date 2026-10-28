import { taskExecutionStages } from './task-execution.js';
import { tkCanViewTask, tkCurrentStageHandlerId, tkCurrentUserId, tkGetTasks, tkUpdateTask } from './data.js';

/* 旧任务的计划来自团队模板，与详情页一致：当前节点之前已完成，人员沿用任务处理人。
   只在确认退回时写入显式计划，查看入口不修改已有数据。 */
function returnExecutionPlan(task) {
  if (task.executionPlan?.length) return task.executionPlan;
  const stages = taskExecutionStages(task);
  const current = stages.findIndex(stage => stage.id === task.executionStageId);
  if (current < 0) return [];
  return stages.map((stage, index) => ({
    id:stage.id, title:stage.name, workType:stage.name, description:stage.desc || '',
    assigneeId:stage.assigneeId || task.assignee,
    status:index < current ? 'done' : index === current
      ? ({in_review:'review',blocked:'blocked',in_progress:'running'}[task.status] || 'pending') : 'pending',
  }));
}
/* 退回只作用于当前节点；退回区间重置，产物与执行记录保留。 */
export function returnableStages(task) {
  if (!task || !tkCanViewTask(task) || tkCurrentStageHandlerId(task) !== tkCurrentUserId()
    || !['backlog', 'in_review', 'blocked'].includes(task.status)) return [];
  const plan = returnExecutionPlan(task);
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
  const plan = returnExecutionPlan(task);
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
