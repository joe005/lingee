import { taskConversationNeedsReply } from '../../composer.js';
import { TK_PEOPLE, TK_PRIORITIES, TK_STATUSES, tkCanViewTask, tkGetPerson, tkGetProjectName, tkGetTasks, tkInMyTaskList, tkIsHandledByMe, tkProjectsForCurrentUser, tkWasTaskHandler } from '../data.js';
import { renderTaskListTreeNodes } from '../list-template.js';
import { taskExecutionStages } from '../task-execution.js';
import { pageState } from './page-state.js';
import { renderCard } from './render.js';
import { LIST_STATUS_TABS, state } from './state.js';
import { avatarSm, escapeHtml, fmtDate, isOverdue, priClass, priWeight, stClass, statusSvg } from './utils.js';
/* 任务页 · 筛选与排序、父子树、分组（拆分自 tasks-v2/index.js，逻辑未改） */
/* ---------- 筛选与排序 ---------- */
export function getFilteredTasks(skipField) {
  var tasks = tkGetTasks();
  tasks = tasks.filter(tkCanViewTask);
  if (pageState.projectListMode && pageState.projectListProjectId) tasks = tasks.filter(function (task) { return task.project === pageState.projectListProjectId; });
  /* 默认仅显示当前阶段由自己处理的任务；筛选了「负责人」（含全部选项）后按筛选查看他人任务。
     skipField 供筛选菜单计数复用：预览「负责人」选项时按放开默认过滤后的口径计数。 */
  if (!pageState.projectListMode && skipField !== 'assignee' && !state.filters.some(function (f) { return f.field === 'assignee'; })) tasks = tasks.filter(tkInMyTaskList);
  var scope = state.scope;
  if (scope === 'members') tasks = tasks.filter(function (t) { return !t.assignee || t.assignee.charAt(0) !== 'a'; });
  else if (scope === 'agents') tasks = tasks.filter(function (t) { return t.assignee && t.assignee.charAt(0) === 'a'; });
  else if (scope === 'my_assigned') tasks = tasks.filter(tkWasTaskHandler);
  else if (scope === 'in_progress') tasks = tasks.filter(function (t) { return t.status === 'in_progress'; });
  if (state.search) {
    var q = state.search.toLowerCase();
    tasks = tasks.filter(function (t) {
      return t.title.toLowerCase().indexOf(q) >= 0 || t.code.toLowerCase().indexOf(q) >= 0 || (t.desc && t.desc.toLowerCase().indexOf(q) >= 0);
    });
  }
  if (!state.showSubtasks) tasks = tasks.filter(function (t) { return !t.parentId; });
  var fields = [...new Set(state.filters.map(function (f) { return f.field; }).filter(function (field) { return field !== skipField; }))];
  fields.forEach(function (field) {
    var choices = state.filters.filter(function (f) { return f.field === field; });
    tasks = tasks.filter(function (t) { return choices.some(function (f) { return matchFilter(t, f); }); });
  });
  return tasks.slice().sort(function (a, b) {
    var sortKey = state.sortDir === 'none' ? 'updatedAt' : state.sortBy;
    var sortDir = state.sortDir === 'none' ? 'desc' : state.sortDir;
    var va, vb;
    switch (sortKey) {
      case 'priority': va = priWeight(a.priority); vb = priWeight(b.priority); break;
      case 'createDate': va = a.createDate || ''; vb = b.createDate || ''; break;
      case 'updatedAt': va = a.updatedAt || ''; vb = b.updatedAt || ''; break;
      case 'status': va = TK_STATUSES.findIndex(function (s) { return s.id === a.status; }); vb = TK_STATUSES.findIndex(function (s) { return s.id === b.status; }); break;
      case 'code': va = a.code; vb = b.code; break;
      case 'title': va = a.title; vb = b.title; break;
      case 'assignee': va = tkGetPerson(a.assignee).name; vb = tkGetPerson(b.assignee).name; break;
      case 'project': va = tkGetProjectName(a.project); vb = tkGetProjectName(b.project); break;
      default: va = 0; vb = 0;
    }
    if (va === vb) {
      var ia = typeof a.id === 'number' ? a.id : 0;
      var ib = typeof b.id === 'number' ? b.id : 0;
      return sortDir === 'asc' ? ia - ib : ib - ia;
    }
    return va < vb ? (sortDir === 'asc' ? -1 : 1) : (sortDir === 'asc' ? 1 : -1);
  });
}

function matchFilter(task, filter) {
  var field = filter.field, op = filter.op, val = filter.value;
  if (!val && op !== 'today' && op !== 'overdue') return true;
  if (field === 'creator') return task.createdBy === val;
  /* 「已办」不是任务状态，而是本人处理过但已流转的视角；看板已隐藏该列，此处保留兼容已保存视图的筛选 */
  if (field === 'status' && val === 'handled') return op === 'neq' ? !tkIsHandledByMe(task) : tkIsHandledByMe(task);
  /* 「负责人：全部」是项目管理员的放开视角，展示权限内全部任务 */
  if (field === 'assignee' && val === 'all') return op === 'neq' ? false : true;
  if (field === 'keyword') {
    if (op === 'contains') return (task.title + task.desc + task.code).toLowerCase().indexOf(String(val).toLowerCase()) >= 0;
    if (op === 'not_contains') return (task.title + task.desc + task.code).toLowerCase().indexOf(String(val).toLowerCase()) < 0;
  }
  if (op === 'eq') return String(task[field]) === String(val);
  if (op === 'neq') return String(task[field]) !== String(val);
  if (op === 'contains') {
    var arr = task[field] || (typeof task[field] === 'string' ? task[field] : []);
    return Array.isArray(arr) ? arr.indexOf(val) >= 0 : String(arr).toLowerCase().indexOf(String(val).toLowerCase()) >= 0;
  }
  if (op === 'not_contains') {
    var arr2 = task[field] || [];
    return Array.isArray(arr2) ? arr2.indexOf(val) < 0 : String(arr2).toLowerCase().indexOf(String(val).toLowerCase()) < 0;
  }
  return true;
}

/* ---------- 父子树构建（参考 Multica sub-issues 按深度缩进） ---------- */
export function buildTaskTree(tasks) {
  var taskMap = new Map();
  tasks.forEach(function (t) { taskMap.set(t.id, t); });
  var childrenMap = new Map();
  var roots = [];
  tasks.forEach(function (t) {
    if (t.parentId && taskMap.has(t.parentId)) {
      if (!childrenMap.has(t.parentId)) childrenMap.set(t.parentId, []);
      childrenMap.get(t.parentId).push(t);
    } else roots.push(t);
  });
  return { roots: roots, childrenMap: childrenMap };
}
export function renderTreeNodes(tasks, childrenMap, depth) {
  return tasks.map(function (t) {
    var id = t.id;
    var children = childrenMap.get(id) || [];
    var hasChildren = children.length > 0;
    var isCollapsed = pageState.collapsedParents.has(id);
    var html = renderCard(t, { depth: depth, hasChildren: hasChildren, isCollapsed: isCollapsed, childCount: children.length });
    if (hasChildren && !isCollapsed) html += renderTreeNodes(children, childrenMap, depth + 1);
    return html;
  }).join('');
}
export function renderListTreeNodes(tasks, childrenMap, depth) {
  return renderTaskListTreeNodes(tasks, childrenMap, depth, {
    collapsedParents:pageState.collapsedParents, selectedIds:state.selectedIds, drawerTaskId:state.drawerTaskId,
    escapeHtml:escapeHtml, isOverdue:isOverdue, stClass:stClass, priClass:priClass, statusSvg:statusSvg,
    avatarSm:avatarSm, fmtDate:fmtDate, listStageProgress:listStageProgress, cardLayout:!pageState.projectListMode,
  });
}

function listStageProgress(task) {
  var stages = taskExecutionStages(task);
  if (!stages.length) stages = [{ id:'task', name:'任务处理' }];
  var index = stages.findIndex(function (stage) { return stage.id === task.executionStageId; });
  if (task.status === 'done') index = stages.length - 1;
  else if (index < 0) index = 0;
  return { name:stages[index]?.name || '任务处理', index:index, total:stages.length, stages:stages };
}

export function listStatusPool(ignoreProjectContext) {
  var tasks = tkGetTasks().filter(tkCanViewTask);
  if (!ignoreProjectContext && pageState.projectListMode && pageState.projectListProjectId) tasks = tasks.filter(function (task) { return task.project === pageState.projectListProjectId; });
  /* 与列表同口径：默认只算当前阶段由我处理的任务，负责人筛选了「全部」等人员时放开 */
  var byAssignee = state.filters.some(function (f) { return f.field === 'assignee'; });
  if ((!pageState.projectListMode || ignoreProjectContext) && !byAssignee) tasks = tasks.filter(tkInMyTaskList);
  if (!state.showSubtasks) tasks = tasks.filter(function (task) { return !task.parentId; });
  return tasks;
}

export function filterListStatus(tasks) {
  if (!pageState.projectListMode) {
    var key = state.listStatusTab === 'running' ? 'in_progress' : state.listStatusTab;
    return getGroupedTasks(tasks, 'status').find(function (group) { return group.key === key; })?.tasks || [];
  }
  var tab = LIST_STATUS_TABS.find(function (item) { return item.id === state.listStatusTab; }) || LIST_STATUS_TABS[0];
  return tasks.filter(tab.match);
}

/* ---------- 分组 ---------- */
export function getGroupedTasks(tasks, groupBy = state.groupBy) {
  if (groupBy === 'none') return [{ key: 'all', name: '全部', tasks: tasks }];
  var groups = {}, keys = [];
  if (groupBy === 'status') {
    /* 视觉稿顺序：待我处理、执行中、已完成；待开始与待规划并入待我处理，卡片保留实际状态。 */
    [{id:'needs',name:'待我处理',color:'orange'}, {id:'in_progress',name:'执行中',color:'blue'},
      {id:'done',name:'已完成',color:'green'}]
      .forEach(function (group) { groups[group.id] = {name:group.name,color:group.color,tasks:[]}; keys.push(group.id); });
  } else if (groupBy === 'priority') {
    TK_PRIORITIES.forEach(function (p) { groups[p.id] = { name: p.name, color: p.color, tasks: [] }; keys.push(p.id); });
  } else if (groupBy === 'assignee') {
    TK_PEOPLE.forEach(function (p) { groups[p.id] = { name: p.name, color: p.color, tasks: [] }; keys.push(p.id); });
    groups.unassigned = { name: '未分配', color: 'gray', tasks: [] }; keys.push('unassigned');
  } else if (groupBy === 'project') {
    tkProjectsForCurrentUser().forEach(function (p) { groups[p.id] = { name: p.name, color: 'blue', tasks: [] }; keys.push(p.id); });
    groups.none = { name: '无项目', color: 'gray', tasks: [] }; keys.push('none');
  }
  tasks.forEach(function (t) {
    var k = t[groupBy];
    if (groupBy === 'status') {
      if (k === 'planned' || k === 'backlog') k = 'needs';
      else if (['in_progress','in_review','blocked'].includes(k)) k = (k === 'in_review' || k === 'blocked' || taskConversationNeedsReply(t, true)) ? 'needs' : 'in_progress';
    }
    /* 已取消与个人已办的任务不上板；执行中/待审核/已阻塞等活跃任务即使本人处理过也保留 */
    if (t.status === 'cancelled' || (!['in_progress', 'in_review', 'blocked'].includes(t.status) && tkIsHandledByMe(t))) return;
    if (!k) {
      if (groupBy === 'assignee') k = 'unassigned';
      else if (groupBy === 'project') k = 'none';
      else k = keys[0];
    }
    if (!groups[k]) { groups[k] = { name: k, color: 'gray', tasks: [] }; keys.push(k); }
    groups[k].tasks.push(t);
  });
  /* 按状态分组时保留空列：状态卡片即使没有任务也显示，便于了解全部状态并拖拽流转 */
  var keepEmptyGroups = groupBy === 'status';
  return keys.filter(function (k) { return keepEmptyGroups || groups[k].tasks.length > 0; }).map(function (k) {
    return { key: k, name: groups[k].name, color: groups[k].color, tasks: groups[k].tasks };
  });
}
