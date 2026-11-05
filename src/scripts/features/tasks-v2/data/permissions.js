import { CV_MEMBERS, cvWorkspaceRole, isWsHost, wsHost } from '../../collab/data.js';
import { tkAllProjects } from './external-projects.js';
import { tkCurrentStageHandlerId, tkCurrentUserId } from './people.js';
import { wsById, wsFlatTree, wsHasPerson } from '../../../core/workspace-tree.js';
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
/* 空间负责人、空间管理员与系统管理员可看到空间内全部工作区 */
function tkIsSpaceManager(project, me) {
  if (!project || !me) return false;
  return cvWorkspaceRole(me) === 'system_admin' || project.owner === me.name || (project.adminIds || []).includes(me.id);
}
/* 工作区隔离：工作区里的任务只对该工作区成员与空间管理者可见；默认工作区（空间根）的任务沿用原规则 */
function tkCanSeeWorkspace(project, workspaceId) {
  if (!workspaceId) return true;
  var me = CV_MEMBERS.find(function (person) { return person.id === tkCurrentUserId(); });
  if (tkIsSpaceManager(project, me)) return true;
  var ws = wsById(project, workspaceId);
  if (!ws) return false;
  if (wsHasPerson(ws, tkCurrentUserId())) return true;
  /* 独立工作区关联了开发空间时，该空间的负责人和管理员也能查看 */
  return isWsHost(project) && !!ws.spaceId && tkIsSpaceManager(tkAllProjects().find(function (p) { return p.id === ws.spaceId; }), me);
}
/* 当前用户可见的工作区（切换器、筛选、新建任务、默认范围共用） */
function tkVisibleWorkspaces(project, opts) {
  return project ? wsFlatTree(project, opts).filter(function (row) { return tkCanSeeWorkspace(project, row.ws.id); }) : [];
}
function tkCanViewTask(task) {
  if (!task) return false;
  var project = tkScopeProjects().find(function (row) { return row.id === task.project; });
  if (!project) return false;
  if (!tkCanSeeWorkspace(project, task.workspaceId)) return false;
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
    if (isWsHost(project)) return false;
    return (project.members || []).includes(userId)
      || CV_MEMBERS.some(function (person) { return person.id === userId && project.owner === person.name; });
  }) : [];
}
/* 任务范围：我加入的空间，加上我能看到工作区的独立工作区容器（切换器、默认范围、新建任务与查看权限用；空间下拉仍用上面的函数） */
function tkScopeProjects() {
  var host = wsHost();
  return tkProjectsForCurrentUser().concat(tkCurrentUserId() && tkVisibleWorkspaces(host).length ? [host] : []);
}

export { tkScopeProjects, tkCanSeeWorkspace, tkVisibleWorkspaces, tkCanStartTask, tkCanViewTask, tkInMyTaskList, tkIsHandledByMe, tkIsMyCurrentStage, tkIsMyStageDone, tkIsProjectOwner, tkParticipatesCurrentUser, tkProjectsForCurrentUser, tkWasTaskHandler };
