import {
  WS_MAX_DEPTH, WS_NAME_MAX, wsById, wsChildren, wsDepth, wsFlatTree, wsHeight, wsList, wsPath, wsPathNames, wsSubtreeIds, wsTaskInScope,
} from '../../core/workspace-tree.js';
import { CV_MEMBERS, CV_PROJECTS, cvPersistProjects, cvPersonById } from '../collab/data.js';
import { tkUpdateTask } from '../tasks-v2/data.js';
import { mgrCanManageProject, mgrCurrentPersonId, mgrIsDevTask, mgrProjectById, mgrProjectTasks, mgrSaveProjects } from './data.js';
/* 管理 · 工作区数据与权限（一期，原型）：工作区随空间保存在 project.workspaces，任务归属写在任务的 workspaceId。
   一期所有工作区统一「公开」；成员平行维护（只要求是空间成员）；Git 仓库仍用空间默认值，不在工作区上设置。
   权限只在前端模拟，正式实现由 Manage 统一校验。 */

var WS_EVENT = 'lingee:mgr-projects-changed';
var DONE_STATUSES = ['done', 'cancelled'];

/* ---------- 是否启用 ---------- */
/* 一期只对开发空间开放；创建第一个工作区后，范围切换、列、筛选等入口才出现 */
function wsAvailable(project) { return !!project && (!!project.containsRd || CV_PROJECTS.includes(project)); }
/* 两类开发空间保留原有存储来源，工作区操作使用同一入口。 */
function wsProjectById(id) { return mgrProjectById(id) || CV_PROJECTS.find(function (p) { return p.id === id; }) || null; }
function wsEnabled(project) { return wsAvailable(project) && wsList(project).length > 0; }

/* ---------- 人员与角色 ---------- */
function spaceOwnerId(project) {
  var m = CV_MEMBERS.find(function (x) { return x.name === project.owner && x.status !== 'disabled'; });
  return m ? m.id : '';
}
function spaceMemberIds(project) { return (project.members || []).filter(function (id) { return !!cvPersonById(id); }); }
function isSpaceMember(project, personId) { return (project.members || []).indexOf(personId) >= 0; }
function personName(id) { var p = cvPersonById(id); return p ? p.name : '已移除'; }

/* 负责人离开空间后回落：上级负责人 → 空间负责人 */
function wsOwnerId(project, ws) {
  var chain = wsPath(project, ws.id).reverse();
  for (var i = 0; i < chain.length; i += 1) {
    var id = chain[i].ownerId;
    if (id && isSpaceMember(project, id)) return id;
  }
  return spaceOwnerId(project);
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
/* 本工作区或任一上级工作区的负责人 */
function isWsOwnerChain(project, ws) {
  var me = mgrCurrentPersonId();
  return !!me && wsPath(project, ws.id).some(function (w) { return wsOwnerId(project, w) === me; });
}
/* 管理本工作区及下级：改名、移动、归档、删除、成员与负责人、设置 */
function canManageWs(project, ws) { return !!ws && (isSpaceManager(project) || isWsOwnerChain(project, ws)); }
function canCreateChild(project, parent) { return parent ? canManageWs(project, parent) : isSpaceManager(project); }
/* 在工作区新建任务：空间级角色、工作区负责人链、工作区成员；空间根不受限 */
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
  if (!(CV_PROJECTS.includes(project) ? cvPersistProjects() : mgrSaveProjects())) {
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
function wsNameError(project, name, parentId, selfId) {
  var v = String(name || '').trim();
  if (!v) return '请填写工作区名称';
  if (v.length > WS_NAME_MAX) return '工作区名称不能超过 ' + WS_NAME_MAX + ' 个字';
  var dup = wsChildren(project, parentId).some(function (w) { return w.id !== selfId && w.name.trim() === v; });
  return dup ? '同一父级下已有同名工作区' : '';
}

/* ---------- 增删改 ---------- */
function wsCreate(project, fields) {
  var parentId = fields.parentId || '';
  var parent = parentId ? wsById(project, parentId) : null;
  if (parentId && !parent) return fail('上级工作区不存在');
  if (parent && parent.status === 'archived') return fail('上级工作区已归档，不能新建下级');
  if (!canCreateChild(project, parent)) return fail('没有权限新建工作区');
  if (parent && wsDepth(project, parent.id) >= WS_MAX_DEPTH) return fail('最多支持 ' + WS_MAX_DEPTH + ' 级工作区，超过请改用标签或拆分空间');
  var nameErr = wsNameError(project, fields.name, parentId, '');
  if (nameErr) return fail(nameErr);
  var ownerId = fields.ownerId || '';
  if (!ownerId || !isSpaceMember(project, ownerId)) return fail('请从空间成员中选择负责人');
  var before = snapshot(project);
  var siblings = wsChildren(project, parentId);
  var ws = {
    id: genId(), name: String(fields.name).trim(), desc: String(fields.desc || '').trim(), parentId: parentId, ownerId: ownerId,
    memberIds: [ownerId], order: siblings.length ? Math.max.apply(null, siblings.map(function (w) { return w.order || 0; })) + 1 : 1,
    status: 'active', visibility: 'public', createdBy: mgrCurrentPersonId(), createdAt: Date.now(),
  };
  project.workspaces = wsList(project).concat(ws);
  if (!commit(project, before, { created: ws.id })) return fail('保存失败，请重试');
  return { ok: true, ws: ws };
}
function wsUpdateInfo(project, id, fields) {
  var ws = wsById(project, id);
  if (!ws) return fail('工作区不存在');
  if (!canManageWs(project, ws)) return fail('没有权限修改该工作区');
  var nameErr = wsNameError(project, fields.name, ws.parentId, ws.id);
  if (nameErr) return fail(nameErr);
  var before = snapshot(project);
  ws.name = String(fields.name).trim();
  ws.desc = String(fields.desc || '').trim();
  if (!commit(project, before, { renamed: ws.id })) return fail('保存失败，请重试');
  return { ok: true };
}
/* 可作为新上级的位置：不能是自己或下级，移动后不超过层级上限、不重名；非空间级角色只能在自己负责的范围内移动 */
function wsMoveTargets(project, id) {
  var ws = wsById(project, id);
  if (!ws) return [];
  var height = wsHeight(project, id);
  var banned = wsSubtreeIds(project, id);
  var targets = [];
  if (isSpaceManager(project) && !wsNameError(project, ws.name, '', ws.id)) targets.push({ id: '', label: '空间根（一级工作区）', depth: 0 });
  wsFlatTree(project).forEach(function (row) {
    var w = row.ws;
    if (banned.indexOf(w.id) >= 0) return;
    if (row.depth + height > WS_MAX_DEPTH) return;
    if (wsNameError(project, ws.name, w.id, ws.id)) return;
    if (!isSpaceManager(project)) {
      /* 负责人只能移动到自己负责的范围内（目标需在本人负责链下），且不能移出自己负责的工作区 */
      if (!canManageWs(project, w)) return;
    }
    targets.push({ id: w.id, label: wsPathNames(project, w.id).join(' / '), depth: row.depth });
  });
  return targets;
}
function wsMove(project, id, parentId) {
  var ws = wsById(project, id);
  if (!ws) return fail('工作区不存在');
  if (!canManageWs(project, ws)) return fail('没有权限移动该工作区');
  var ok = wsMoveTargets(project, id).some(function (t) { return t.id === (parentId || ''); });
  if (!ok) return fail('不能移动到该位置：不能移到自己或下级下面，且移动后最多 ' + WS_MAX_DEPTH + ' 级');
  var before = snapshot(project);
  var siblings = wsChildren(project, parentId || '');
  ws.parentId = parentId || '';
  ws.order = siblings.length ? Math.max.apply(null, siblings.map(function (w) { return w.order || 0; })) + 1 : 1;
  if (!commit(project, before, { moved: ws.id })) return fail('保存失败，请重试');
  return { ok: true };
}
function wsReorder(project, id, dir) {
  var ws = wsById(project, id);
  if (!ws) return fail('工作区不存在');
  if (!canManageWs(project, ws)) return fail('没有权限调整排序');
  var sibs = wsChildren(project, ws.parentId);
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
function wsTasksOf(project, id, withDescendants) {
  var ids = withDescendants ? wsSubtreeIds(project, id) : [id];
  return wsRdTasks(project).filter(function (t) { return ids.indexOf(t.workspaceId) >= 0; });
}
function wsOpenTasks(project, id, withDescendants) {
  return wsTasksOf(project, id, withDescendants).filter(function (t) { return DONE_STATUSES.indexOf(t.status) < 0; });
}
/* 进度 = 本级及全部下级任务汇总（不含已取消）；id 为空时为空间根汇总（全部任务） */
function wsProgress(project, id) {
  var list = id ? wsTasksOf(project, id, true) : wsRdTasks(project);
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
  return wsOpenTasks(project, ws.id, false).filter(function (t) { return personTaskLoad(t, personId); });
}

/* ---------- 归档 / 恢复 / 删除 ---------- */
/* 归档预检：本工作区及下级仍有未完成任务时不能归档；下级未归档的会一并归档 */
function wsArchivePlan(project, id) {
  var ids = wsSubtreeIds(project, id);
  var open = wsOpenTasks(project, id, true);
  return { openCount: open.length, cascade: ids.slice(1).map(function (x) { return wsById(project, x); }).filter(function (w) { return w && w.status !== 'archived'; }) };
}
function wsArchive(project, id) {
  var ws = wsById(project, id);
  if (!ws) return fail('工作区不存在');
  if (!canManageWs(project, ws)) return fail('没有权限归档该工作区');
  var plan = wsArchivePlan(project, id);
  if (plan.openCount) return fail('还有 ' + plan.openCount + ' 个未完成任务，请先完成、移走或取消');
  var before = snapshot(project);
  wsSubtreeIds(project, id).forEach(function (x) { var w = wsById(project, x); if (w) w.status = 'archived'; });
  if (!commit(project, before, { archived: id })) return fail('保存失败，请重试');
  return { ok: true };
}
function wsRestore(project, id) {
  var ws = wsById(project, id);
  if (!ws) return fail('工作区不存在');
  if (!canManageWs(project, ws)) return fail('没有权限恢复该工作区');
  var parent = wsById(project, ws.parentId);
  if (parent && parent.status === 'archived') return fail('上级工作区已归档，请先恢复「' + parent.name + '」');
  var before = snapshot(project);
  ws.status = 'active';
  if (!commit(project, before, { restored: id })) return fail('保存失败，请重试');
  return { ok: true };
}
/* 只允许删除没有任务（含已完成）、没有下级的工作区；有内容时改为归档 */
function wsDeleteBlockReason(project, id) {
  var ws = wsById(project, id);
  if (!ws) return '工作区不存在';
  if (!canManageWs(project, ws)) return '没有权限删除该工作区';
  if (wsChildren(project, id).length) return '还有下级工作区，请先移动或删除下级';
  var n = wsTasksOf(project, id, false).length;
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
function wsAddMembers(project, id, personIds) {
  var ws = wsById(project, id);
  if (!ws) return fail('工作区不存在');
  if (!canManageWs(project, ws)) return fail('没有权限管理该工作区的成员');
  var bad = personIds.filter(function (p) { return !isSpaceMember(project, p); });
  if (bad.length) return fail('只能添加空间成员');
  var before = snapshot(project);
  var set = (ws.memberIds || []).slice();
  personIds.forEach(function (p) { if (set.indexOf(p) < 0) set.push(p); });
  ws.memberIds = set;
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
  if (!commit(project, before, { members: id })) return fail('保存失败，请重试');
  return { ok: true };
}
function wsSetOwner(project, id, personId) {
  var ws = wsById(project, id);
  if (!ws) return fail('工作区不存在');
  if (!canManageWs(project, ws)) return fail('没有权限更换负责人');
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
  WS_MAX_DEPTH, WS_NAME_MAX, canCreateChild, canCreateTaskIn, canManageWs, isSpaceManager, isSpaceMember, isWsMember, personName, spaceMemberIds,
  wsAddMembers, wsArchive, wsArchivePlan, wsAvailable, wsCreate, wsDelete, wsDeleteBlockReason, wsEnabled, wsMemberIds, wsMemberOpenTasks, wsMove, wsMoveTargets, wsMoveTasks,
  wsNameError, wsProjectById, wsOpenTasks, wsOwnerId, wsPlanMove, wsProgress, wsRdTasks, wsRemoveMember, wsReorder, wsRestore, wsSetOwner, wsTasksOf, wsUpdateInfo,
};
