import { taskExecutionStages, taskStageHandoffPatch } from './task-execution.js';
import { tkCanViewTask, tkCurrentStageHandlerId, tkCurrentUserId, tkGetTasks, tkPeopleInProject, tkUpdateTask } from './data.js';

/* 阶段转交：当前节点处理人把节点交给项目内其他成员，产物与记录保留。
   与退回一致，执行中（AI 正在运行）的节点不能转交，避免运行过程中换人。 */
const TRANSFERABLE_STATUS = ['backlog', 'in_review', 'blocked'];

function currentStageName(task) {
  return taskExecutionStages(task).find(stage => stage.id === task.executionStageId)?.name || '';
}
/* 可选接手人：任务所属项目的在职成员，排除自己 */
export function transferTargets(task) {
  const me = tkCurrentUserId();
  if (!task || !me || !tkCanViewTask(task) || tkCurrentStageHandlerId(task) !== me
    || !TRANSFERABLE_STATUS.includes(task.status)) return [];
  return tkPeopleInProject(task.project).filter(person => person.id !== me);
}
export function transferStageName(task) {
  return currentStageName(task);
}
export function transferTaskStage(taskId, targetId, reason) {
  const task = tkGetTasks().find(row => row.id === taskId);
  const target = transferTargets(task).find(person => person.id === targetId);
  if (!target) return { ok:false, message:'任务状态或权限已变化，无法转交' };
  const note = (reason || '').trim();
  if (!note) return { ok:false, message:'请填写转交说明' };
  const fromId = tkCurrentUserId();
  const stageName = currentStageName(task);
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  /* 与其他操作记录一致的本地时间 YYYY-MM-DD HH:mm:ss，详情按分钟展示 */
  const time = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' '
    + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  /* 复用流转的换人逻辑：同时更新当前节点处理人、任务负责人和历史处理人，「我的任务」范围随之变化 */
  tkUpdateTask(task.id, {
    ...taskStageHandoffPatch(task, targetId),
    stageTransfers:(task.stageTransfers || []).concat({
      stageId:task.executionStageId || '', stageName, fromId, toId:targetId, reason:note, authorId:fromId, createdAt:time,
    }),
  });
  return { ok:true, targetName:target.name };
}
