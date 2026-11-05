import {
  WS_MAX_DEPTH, WS_NAME_MAX, wsById, wsChildren, wsList,
} from '../../core/workspace-tree.js';
import { CV_MEMBERS, CV_PROJECTS, cvPersistProjects, cvPersonById, isWsHost, wsHost, wsHostSave } from '../collab/data.js';
import { tkUpdateTask } from '../tasks-v2/data.js';
import { mgrCanManageProject, mgrCurrentPersonId, mgrIsDevTask, mgrProjectById, mgrProjects, mgrProjectTasks, mgrSaveProjects } from './data.js';
/* 管理 · 工作区数据与权限（一期，原型）：工作区随空间保存在 project.workspaces，任务归属写在任务的 workspaceId。
   工作区隔离：工作区及其任务只对工作区成员与空间负责人 / 管理员可见，空间根下的任务不受影响；成员只要求是空间成员。
   权限只在前端模拟，正式实现由 Manage 统一校验。 */

var WS_EVENT = 'lingee:mgr-projects-changed';
var DONE_STATUSES = ['done', 'cancelled'];

/* ---------- 是否启用 ---------- */
/* 一期只对开发空间开放；创建第一个工作区后，范围切换、列、筛选等入口才出现 */
function wsAvailable(project) { return !!project && (!!project.containsRd || CV_PROJECTS.includes(project) || isWsHost(project)); }
/* 两类开发空间保留原有存储来源，工作区操作使用同一入口；独立工作区挂在 Build 内部容器上 */
function wsProjectById(id) {
  if (isWsHost({ id: id })) return wsHost();
  /* 协作开发空间在 Manage 也有同 id 记录，工作区数据在协作开发那条上，优先取它 */
  return CV_PROJECTS.find(function (p) { return p.id === id; }) || mgrProjectById(id) || null;
}

/* ---------- 关联管理工作区（Manage 开发空间） ---------- */
/* 可关联的是未归档的开发空间：Manage 的研发类空间，以及协作开发里建的空间（同属空间）；一个工作区最多关联一个，也可以不关联 */
function wsMappableSpaces() {
  return mgrProjects().filter(function (p) {
    return p.status !== 'archived' && (p.containsRd === true || ['devtest', 'collab', 'collaboration'].indexOf(p.template) >= 0);
  }).map(function (p) { return CV_PROJECTS.find(function (cv) { return cv.id === p.id; }) || p; })
    .concat(CV_PROJECTS.filter(function (p) { return p.status !== 'archived' && !mgrProjectById(p.id); }));
}
/* 工作区所属的管理工作区：空间下的工作区就是所在空间；独立工作区看关联字段，未关联返回 null */
function wsSpaceOf(project, ws) {
  if (!project) return null;
  if (!isWsHost(project)) return project;
  var id = ws && ws.spaceId;
  return id ? CV_PROJECTS.find(function (p) { return p.id === id; }) || mgrProjectById(id) || null : null;
}
/* 展示路径：「开发空间 / 工作区」，未关联的独立工作区只显示工作区名 */
function wsScopePath(project, ws) {
  if (!project) return '';
  if (!ws) return project.name;   /* 空间根即与空间同名的工作区 */
  var space = wsSpaceOf(project, ws);
  return space ? space.name + ' / ' + ws.name : ws.name;
}
function wsEnabled(project) { return wsAvailable(project) && wsList(project).length > 0; }

/* ---------- 人员与角色 ---------- */
function spaceOwnerId(project) {
  var m = CV_MEMBERS.find(function (x) { return x.name === project.owner && x.status !== 'disabled'; });
  return m ? m.id : '';
}
function spaceMemberIds(project) { return (project.members || []).filter(function (id) { return !!cvPersonById(id); }); }
function isSpaceMember(project, personId) { return (project.members || []).indexOf(personId) >= 0; }
function personName(id) { var p = cvPersonById(id); return p ? p.name : '已移除'; }

/* 负责人离开空间后回落到空间负责人 */
function wsOwnerId(project, ws) {
  return ws.ownerId && isSpaceMember(project, ws.ownerId) ? ws.ownerId : spaceOwnerId(project);
}
/* 成员只算仍在空间里的人，空间移除成员后自动不再是工作区成员 */
function wsMemberIds(project, ws) {
  var ids = (ws.memberIds || []).filter(function (id) { return isSpaceMember(project, id); });
  var owner = wsOwnerId(project, ws);
  if (owner && ids.indexOf(owner) < 0) ids.unshift(owner);
  return ids;
}
function isWsMember(project, ws, personId) { return !!personId && wsMemberIds(project, ws).indexOf(personId) >= 0; }

/* 空间负责人 / 空间管理员 / 系统管理员 */
function isSpaceManager(project) { return mgrCanManageProject(project); }
/* 独立工作区的上级管理者：系统管理员，或关联开发空间的负责人 / 管理员 */
function isScopeManager(project, ws) {
  if (isSpaceManager(project)) return true;
  var space = isWsHost(project) ? wsSpaceOf(project, ws) : null;
  return !!space && mgrCanManageProject(space);
}
/* 工作区只有一级：负责人与管理员都只管本工作区 */
function isWsOwner(project, ws) {
  var me = mgrCurrentPersonId();
  return !!me && wsOwnerId(project, ws) === me;
}
function wsAdminIds(ws) { return Array.isArray(ws.adminIds) ? ws.adminIds : []; }
function isWsAdmin(project, ws) {
  var me = mgrCurrentPersonId();
  return !!me && isSpaceMember(project, me) && wsAdminIds(ws).indexOf(me) >= 0;
}
/* 管理本工作区：改名、排序、归档、成员、设置；删除与更换负责人不含工作区管理员 */
function canManageWs(project, ws) { return !!ws && (isScopeManager(project, ws) || isWsOwner(project, ws) || isWsAdmin(project, ws)); }
function canOwnWs(project, ws) { return !!ws && (isScopeManager(project, ws) || isWsOwner(project, ws)); }
/* 新建工作区：独立工作区所有 Build 用户都能建；空间下的旧工作区仍只由空间负责人 / 管理员新建 */
function canCreateWs(project) { return isWsHost(project) ? !!mgrCurrentPersonId() : isSpaceManager(project); }
/* 工作区隔离：只有工作区成员（含负责人、管理员）与上级管理者能看到该工作区及其任务 */
function wsVisible(project, ws) { return !!ws && (isScopeManager(project, ws) || isWsMember(project, ws, mgrCurrentPersonId())); }
/* 在工作区新建任务：空间级角色、工作区负责人与管理员、工作区成员；空间根不受限 */
function canCreateTaskIn(project, ws) {
  if (!ws) return true;
  if (ws.status === 'archived') return false;
  return canManageWs(project, ws) || isWsMember(project, ws, mgrCurrentPersonId());
}
/* ---------- 保存 ---------- */
function snapshot(project) { return JSON.stringify(project.workspaces || []); }
function commit(project, before, detail) {
  var prev = { updatedAt: project.updatedAt };
  project.updatedAt = Date.now();
  var saved = isWsHost(project) ? wsHostSave() : CV_PROJECTS.includes(project) ? cvPersistProjects() : mgrSaveProjects();
  if (!saved) {
    project.workspaces = JSON.parse(before);
    project.updatedAt = prev.updatedAt;
    return false;
  }
  document.dispatchEvent(new CustomEvent(WS_EVENT, { detail: Object.assign({ workspaces: project.id }, detail || {}) }));
  return true;
}
function genId() { return 'ws-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function fail(error) { return { ok: false, error: error }; }

/* ---------- 校验 ---------- */
function wsNameError(project, name, selfId) {
  var v = String(name || '').trim();
  if (!v) return '请填写工作区名称';
  if (v.length > WS_NAME_MAX) return '工作区名称不能超过 ' + WS_NAME_MAX + ' 个字';
  var dup = wsList(project).some(function (w) { return w.id !== selfId && w.name.trim() === v; });
  return dup ? (isWsHost(project) ? '已有同名工作区' : '空间下已有同名工作区') : '';
}
function wsSpaceError(project, spaceId) {
  if (!spaceId) return '';
  if (!isWsHost(project)) return '空间下的工作区不能更改关联';
  return wsMappableSpaces().some(function (p) { return p.id === spaceId; }) ? '' : '请选择有效的开发空间';
}

/* ---------- 增删改 ---------- */
function wsCreate(project, fields) {
  if (!canCreateWs(project)) return fail('没有权限新建工作区');
  var nameErr = wsNameError(project, fields.name, '');
  if (nameErr) return fail(nameErr);
  var ownerId = fields.ownerId || '';
  if (!ownerId || !isSpaceMember(project, ownerId)) return fail(isWsHost(project) ? '请选择负责人' : '请从空间成员中选择负责人');
  var spaceErr = wsSpaceError(project, fields.spaceId || '');
  if (spaceErr) return fail(spaceErr);
  var before = snapshot(project);
  var siblings = wsList(project);
  var ws = {
    id: genId(), name: String(fields.name).trim(), desc: String(fields.desc || '').trim(), ownerId: ownerId,
    memberIds: [ownerId], order: siblings.length ? Math.max.apply(null, siblings.map(function (w) { return w.order || 0; })) + 1 : 1,
    status: 'active', visibility: 'public', createdBy: mgrCurrentPersonId(), createdAt: Date.now(),
  };
  if (isWsHost(project)) ws.spaceId = fields.spaceId || '';
  project.workspaces = wsList(project).concat(ws);
  if (!commit(project, before, { created: ws.id })) return fail('保存失败，请重试');
  return { ok: true, ws: ws };
}
function wsUpdateInfo(project, id, fields) {
  var ws = wsById(project, id);
  if (!ws) return fail('工作区不存在');
  if (!canManageWs(project, ws)) return fail('没有权限修改该工作区');
  var nameErr = wsNameError(project, fields.name, ws.id);
  if (nameErr) return fail(nameErr);
  var mapping = isWsHost(project) && fields.spaceId !== undefined;
  var spaceErr = mapping ? wsSpaceError(project, fields.spaceId) : '';
  if (spaceErr) return fail(spaceErr);
  var before = snapshot(project);
  ws.name = String(fields.name).trim();
  ws.desc = String(fields.desc || '').trim();
  if (mapping) ws.spaceId = fields.spaceId || '';
  if (!commit(project, before, { renamed: ws.id })) return fail('保存失败，请重试');
  return { ok: true };
}
function wsReorder(project, id, dir) {
  var ws = wsById(project, id);
  if (!ws) return fail('工作区不存在');
  if (!canManageWs(project, ws)) return fail('没有权限调整排序');
  var sibs = wsChildren(project, '');
  var i = sibs.findIndex(function (w) { return w.id === id; });
  var j = i + (dir === 'up' ? -1 : 1);
  if (j < 0 || j >= sibs.length) return { ok: true };
  var before = snapshot(project);
  var moved = sibs.slice();
  moved.splice(j, 0, moved.splice(i, 1)[0]);
  moved.forEach(function (w, k) { w.order = k + 1; });
  if (!commit(project, before, { reordered: id })) return fail('保存失败，请重试');
  return { ok: true };
}

/* ---------- 任务统计 ---------- */
/* 工作区范围内的研发任务（主任务，不含子任务） */
function wsRdTasks(project) {
  return mgrProjectTasks(project.id).filter(function (t) { return mgrIsDevTask(t) && !t.parentId; });
}
function wsTasksOf(project, id) {
  return wsRdTasks(project).filter(function (t) { return t.workspaceId === id; });
}
function wsOpenTasks(project, id) {
  return wsTasksOf(project, id).filter(function (t) { return DONE_STATUSES.indexOf(t.status) < 0; });
}
/* 进度 = 本工作区任务汇总（不含已取消）；id 为空时为空间根汇总（全部任务） */
function wsProgress(project, id) {
  var list = id ? wsTasksOf(project, id) : wsRdTasks(project);
  list = list.filter(function (t) { return t.status !== 'cancelled'; });
  var done = list.filter(function (t) { return t.status === 'done'; }).length;
  return { done: done, total: list.length, percent: list.length ? Math.round((done / list.length) * 100) : 0 };
}
/* 成员名下该工作区内仍未完成的任务（当前处理人、后续阶段处理人、审核人） */
function personTaskLoad(task, personId) {
  if (task.assignee === personId) return true;
  return (task.executionPlan || []).some(function (st) { return st && st.status !== 'done' && (st.assigneeId === personId || st.reviewerId === personId); });
}
function wsMemberOpenTasks(project, ws, personId) {
  return wsOpenTasks(project, ws.id).filter(function (t) { return personTaskLoad(t, personId); });
}

/* ---------- 归档 / 恢复 / 删除 ---------- */
/* 归档预检：工作区仍有未完成任务时不能归档 */
function wsArchivePlan(project, id) {
  return { openCount: wsOpenTasks(project, id).length };
}
function wsArchive(project, id) {
  var ws = wsById(project, id);
  if (!ws) return fail('工作区不存在');
  if (!canManageWs(project, ws)) return fail('没有权限归档该工作区');
  var plan = wsArchivePlan(project, id);
  if (plan.openCount) return fail('还有 ' + plan.openCount + ' 个未完成任务，请先完成、移走或取消');
  var before = snapshot(project);
  ws.status = 'archived';
  if (!commit(project, before, { archived: id })) return fail('保存失败，请重试');
  return { ok: true };
}
function wsRestore(project, id) {
  var ws = wsById(project, id);
  if (!ws) return fail('工作区不存在');
  if (!canManageWs(project, ws)) return fail('没有权限恢复该工作区');
  var before = snapshot(project);
  ws.status = 'active';
  if (!commit(project, before, { restored: id })) return fail('保存失败，请重试');
  return { ok: true };
}
/* 只允许删除没有任务（含已完成）的工作区；有任务时改为归档 */
function wsDeleteBlockReason(project, id) {
  var ws = wsById(project, id);
  if (!ws) return '工作区不存在';
  if (!canOwnWs(project, ws)) return '没有权限删除该工作区';
  var n = wsTasksOf(project, id).length;
  if (n) return '还有 ' + n + ' 个任务，请先移走；需要保留历史任务时请改为归档';
  return '';
}
function wsDelete(project, id) {
  var reason = wsDeleteBlockReason(project, id);
  if (reason) return fail(reason);
  var before = snapshot(project);
  project.workspaces = wsList(project).filter(function (w) { return w.id !== id; });
  if (!commit(project, before, { deleted: id })) return fail('保存失败，请重试');
  return { ok: true };
}

/* ---------- 成员与负责人 ---------- */
function wsAddMembers(project, id, personIds, role) {
  var ws = wsById(project, id);
  if (!ws) return fail('工作区不存在');
  if (!canManageWs(project, ws)) return fail('没有权限管理该工作区的成员');
  var bad = personIds.filter(function (p) { return !isSpaceMember(project, p); });
  if (bad.length) return fail('只能添加空间成员');
  var before = snapshot(project);
  var set = (ws.memberIds || []).slice();
  personIds.forEach(function (p) { if (set.indexOf(p) < 0) set.push(p); });
  ws.memberIds = set;
  if (role === 'admin') ws.adminIds = Array.from(new Set(wsAdminIds(ws).concat(personIds)));
  if (!commit(project, before, { members: id })) return fail('保存失败，请重试');
  return { ok: true };
}
function wsRemoveMember(project, id, personId) {
  var ws = wsById(project, id);
  if (!ws) return fail('工作区不存在');
  if (!canManageWs(project, ws)) return fail('没有权限管理该工作区的成员');
  if (wsOwnerId(project, ws) === personId) return fail('负责人不能直接移除，请先更换负责人');
  var load = wsMemberOpenTasks(project, ws, personId);
  if (load.length) return fail(personName(personId) + ' 在该工作区仍有 ' + load.length + ' 个未完成任务，请先转交');
  var before = snapshot(project);
  ws.memberIds = (ws.memberIds || []).filter(function (p) { return p !== personId; });
  ws.adminIds = wsAdminIds(ws).filter(function (p) { return p !== personId; });
  if (!commit(project, before, { members: id })) return fail('保存失败，请重试');
  return { ok: true };
}
/* 成员自己离开工作区：负责人需先更换负责人，名下仍有未完成任务需先转交 */
function wsLeaveBlockReason(project, ws, personId) {
  if (!ws) return '工作区不存在';
  if (ws.status === 'archived') return '已归档的工作区不能离开';
  if ((ws.memberIds || []).indexOf(personId) < 0) return '你不是该工作区的成员';
  if (wsOwnerId(project, ws) === personId) return '你是该工作区的负责人，请先更换负责人再离开';
  var load = wsMemberOpenTasks(project, ws, personId);
  return load.length ? '你在该工作区仍有 ' + load.length + ' 个未完成任务，请先转交' : '';
}
function wsLeave(project, id, personId) {
  var ws = wsById(project, id), reason = wsLeaveBlockReason(project, ws, personId);
  if (reason) return fail(reason);
  var before = snapshot(project);
  ws.memberIds = (ws.memberIds || []).filter(function (p) { return p !== personId; });
  ws.adminIds = wsAdminIds(ws).filter(function (p) { return p !== personId; });
  if (!commit(project, before, { members: id })) return fail('保存失败，请重试');
  return { ok: true };
}
function wsSetOwner(project, id, personId) {
  var ws = wsById(project, id);
  if (!ws) return fail('工作区不存在');
  if (!canOwnWs(project, ws)) return fail('没有权限更换负责人');
  if (!isSpaceMember(project, personId)) return fail('请从空间成员中选择负责人');
  var before = snapshot(project);
  ws.ownerId = personId;
  if ((ws.memberIds || []).indexOf(personId) < 0) ws.memberIds = (ws.memberIds || []).concat(personId);
  if (!commit(project, before, { owner: id })) return fail('保存失败，请重试');
  return { ok: true };
}

/* ---------- 任务归属与移动 ---------- */
/* 任务涉及的人：当前处理人、各阶段处理人与审核人（含子任务） */
function taskPeople(project, task) {
  var ids = [];
  function add(p) { if (p && ids.indexOf(p) < 0) ids.push(p); }
  var family = [task].concat(mgrProjectTasks(project.id).filter(function (t) { return mgrIsDevTask(t) && t.parentId === task.id; }));
  family.forEach(function (t) {
    add(t.assignee);
    (t.executionPlan || []).forEach(function (st) { if (st) { add(st.assigneeId); add(st.reviewerId); } });
  });
  return ids;
}
function peopleNeedJoin(project, tasks, targetId) {
  if (!targetId) return [];
  var ws = wsById(project, targetId);
  var need = [];
  tasks.forEach(function (t) {
    taskPeople(project, t).forEach(function (p) {
      if (need.indexOf(p) < 0 && isSpaceMember(project, p) && !isWsMember(project, ws, p)) need.push(p);
    });
  });
  return need;
}
/* 移动预检：权限、归档、需要加入工作区的人（有成员管理权的人确认后加入，其他人不能移动） */
function wsPlanMove(project, tasks, targetId) {
  var target = targetId ? wsById(project, targetId) : null;
  if (targetId && !target) return { ok: false, error: '目标工作区不存在' };
  if (target && target.status === 'archived') return { ok: false, error: '目标工作区已归档，不能移入任务' };
  if (target && !canCreateTaskIn(project, target)) return { ok: false, error: '没有权限向该工作区移入任务' };
  var sources = {};
  tasks.forEach(function (t) { if (t.workspaceId) sources[t.workspaceId] = true; });
  var blockedSource = Object.keys(sources).some(function (sid) { var s = wsById(project, sid); return s && !canManageWs(project, s); });
  if (blockedSource) return { ok: false, error: '没有权限移出原工作区的任务' };
  var need = peopleNeedJoin(project, tasks, targetId);
  if (need.length && !canManageWs(project, target)) {
    return { ok: false, error: '处理人 ' + need.map(personName).join('、') + ' 不在目标工作区，请联系工作区负责人先加入' };
  }
  return { ok: true, join: need, target: target };
}
function wsMoveTasks(project, tasks, targetId) {
  var plan = wsPlanMove(project, tasks, targetId);
  if (!plan.ok) return plan;
  if (plan.join.length) {
    var added = wsAddMembers(project, targetId, plan.join);
    if (!added.ok) return added;
  }
  var ids = tasks.map(function (t) { return t.id; });
  tasks.forEach(function (t) {
    tkUpdateTask(t.id, { workspaceId: targetId || '' });
    mgrProjectTasks(project.id).forEach(function (s) {
      if (mgrIsDevTask(s) && s.parentId === t.id && ids.indexOf(s.id) < 0) tkUpdateTask(s.id, { workspaceId: targetId || '' });
    });
  });
  document.dispatchEvent(new Event('lingee:tasks-changed'));
  return { ok: true, joined: plan.join };
}

export {
  WS_MAX_DEPTH, WS_NAME_MAX, canCreateTaskIn, canCreateWs, isScopeManager, wsMappableSpaces, wsScopePath, wsSpaceOf, canManageWs, canOwnWs, isSpaceManager, isSpaceMember, isWsMember, personName, spaceMemberIds,
  wsAddMembers, wsAdminIds, wsArchive, wsArchivePlan, wsAvailable, wsCreate, wsDelete, wsDeleteBlockReason, wsEnabled, wsMemberIds, wsMemberOpenTasks, wsMoveTasks,
  wsLeave, wsLeaveBlockReason, wsVisible, wsNameError, wsProjectById, wsOpenTasks, wsOwnerId, wsPlanMove, wsProgress, wsRdTasks, wsRemoveMember, wsReorder, wsRestore, wsSetOwner, wsTasksOf, wsUpdateInfo,
};
