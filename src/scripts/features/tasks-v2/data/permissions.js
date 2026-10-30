import { CV_MEMBERS, cvWorkspaceRole } from '../../collab/data.js';
import { tkAllProjects } from './external-projects.js';
import { tkCurrentStageHandlerId, tkCurrentUserId } from './people.js';
/* 任务数据：「我的任务」归属与查看 / 开始权限（拆自 tasks-v2/data.js） */

/* 任务页签按人员分配：默认只列出与我当前相关的任务——
   当前阶段由我处理，或我负责的阶段已经做完（归入「已完成」）。
   工作区管理员通过「负责人 → 全部」筛选查看他人任务。 */
function tkIsMyCurrentStage(task) {
  var me = tkCurrentUserId();
  return !!me && !!task && task.status !== 'done' && task.status !== 'cancelled' && tkCurrentStageHandlerId(task) === me;
}
/* 我负责的阶段已完成：任务整体完成，或流转到他人处理的后续阶段 */
function tkIsMyStageDone(task) {
  var me = tkCurrentUserId();
  if (!me || !task || task.status === 'cancelled') return false;
  // 整体完成以任务状态为准，兼容阶段状态未同步和审核人参与的记录。
  if (task.status === 'done') return tkWasTaskHandler(task);
  var plan = Array.isArray(task.executionPlan) ? task.executionPlan : [];
  if (!plan.length) return task.status === 'done' && task.assignee === me;
  var didStage = plan.some(function (stage) { return stage && stage.status === 'done' && stage.assigneeId === me; });
  return didStage && (task.status === 'done' || tkCurrentStageHandlerId(task) !== me);
}
function tkInMyTaskList(task) {
  return tkIsMyCurrentStage(task) || tkIsMyStageDone(task);
}
function tkCanStartTask(task) {
  var me = tkCurrentUserId();
  return !!me && task?.status === 'backlog' && tkCanViewTask(task) && tkCurrentStageHandlerId(task) === me;
}
/* 当前或历史节点负责人均保留在「我负责」，任务完成后也不丢失。 */
function tkWasTaskHandler(task) {
  var me = tkCurrentUserId();
  return !!me && !!task && (task.assignee === me
    || (task.assigneeHistory || []).includes(me)
    || (task.executionPlan || []).some(function (stage) { return stage && (stage.assigneeId === me || stage.reviewerId === me); }));
}
/* 已办是个人视图：有实际处理或审核记录，且已不再是当前阶段处理人。 */
function tkIsHandledByMe(task) {
  var me = tkCurrentUserId();
  if (!me || !task || tkCurrentStageHandlerId(task) === me) return false;
  var completedStage = (task.executionPlan || []).some(function (stage) {
    return stage?.status === 'done' && (stage.assigneeId === me || stage.reviewerId === me);
  });
  var approvedReview = (task.statusHistory || []).some(function (entry) {
    return entry?.from === 'in_review' && entry.authorId === me && ['backlog', 'done'].includes(entry.to);
  });
  var handedOffWork = (task.comments || []).some(function (comment) {
    return comment?.kind === 'flow' && comment.fromAssignee === me && comment.assignee !== me
      && ['in_progress', 'in_review', 'blocked'].includes(comment.fromStatus);
  });
  var transferredOut = (task.stageTransfers || []).some(function (change) { return change.fromId === me; });
  return completedStage || approvedReview || handedOffWork || transferredOut;
}
/* 普通成员仅能查看自己参与的任务；管理员可查看所属项目内他人任务。 */
function tkParticipatesCurrentUser(task) {
  var me = tkCurrentUserId();
  if (!me || !task) return false;
  return tkWasTaskHandler(task) || task.createdBy === me
    || (task.comments || []).some(function (c) { return c && (c.authorId === me || c.assignee === me); })
    || (task.statusHistory || []).some(function (entry) { return entry && entry.authorId === me; });
}
function tkCanViewTask(task) {
  if (!task) return false;
  var project = tkProjectsForCurrentUser().find(function (row) { return row.id === task.project; });
  if (!project) return false;
  var me = CV_MEMBERS.find(function (person) { return person.id === tkCurrentUserId(); });
  return cvWorkspaceRole(me) === 'system_admin' || tkParticipatesCurrentUser(task);
}
/* 工作区管理员拥有所属项目数据的查看权限；任务页默认仅显示自己参与的任务，
   通过筛选「负责人」的「全部」选项查看所有人，普通成员不显示该选项。 */
function tkIsProjectOwner() {
  var me = CV_MEMBERS.find(function (person) { return person.id === tkCurrentUserId(); });
  return !!me && cvWorkspaceRole(me) === 'system_admin';
}
function tkProjectsForCurrentUser() {
  var userId = tkCurrentUserId();
  return userId ? tkAllProjects().filter(function (project) {
    return (project.members || []).includes(userId)
      || CV_MEMBERS.some(function (person) { return person.id === userId && project.owner === person.name; });
  }) : [];
}

export { tkCanStartTask, tkCanViewTask, tkInMyTaskList, tkIsHandledByMe, tkIsMyCurrentStage, tkIsMyStageDone, tkIsProjectOwner, tkParticipatesCurrentUser, tkProjectsForCurrentUser, tkWasTaskHandler };
