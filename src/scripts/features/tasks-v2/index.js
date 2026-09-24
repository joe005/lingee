/* 任务管理 v2 —— 核心交互逻辑入口
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 initTasksV2() 函数里，
   由 main.js 按拆分前的原始顺序调用。 */

import { $, $$ } from '../../core/dom.js';
import { showView, input, setNavActive } from '../../core/view.js';
import { toast } from '../../core/toast.js';
import {
  TK_STATUSES, TK_PRIORITIES, TK_PEOPLE, TK_AGENTS, TK_PROJECTS, TK_LABELS,
  TK_VIEWS, TK_FILTER_FIELDS, TK_OPERATORS, TK_TASKS, TK_CURRENT_USER,
  tkGetTaskArtifacts,
  tkGetTasks, tkSetTasks, tkAddTask, tkUpdateTask, tkDeleteTask,
  tkGetViews, tkAddView, tkDeleteView, tkRenameView,
  tkGetStatusName, tkGetPriorityName, tkGetPerson, tkGetProjectName,
  tkGetStatusObj, tkGetPriorityObj,
} from './data.js';

/* ---------- 状态 ---------- */
var state = {
  layout: 'board', viewMode: 'slide', scope: 'all', groupBy: 'status', sortBy: 'createDate', sortDir: 'desc',
  search: '', filters: [], selectedIds: new Set(), activeViewId: 'all',
  showSubtasks: true,
  cardProperties: { priority:true, description:false, assignee:true, startDate:false, dueDate:true, project:true, labels:false, childProgress:true },
  editingTaskId: null, drawerTaskId: null, editingParentId: null,
};
var els = {};
var drawerPreferredWidth = null;
var collapsedParents = new Set();
var subtaskSectionExpanded = new Map();
var flowAssigneeDraft = { taskId: null, assigneeId: '' };
var drawerCloseTimer = null;
var drawerOpenFrame = null;
var DRAWER_WIDTH_STORAGE_KEY = 'lingee_tasks_drawer_width';
var VIEW_STATE_STORAGE_KEY = 'lingee_tasks_view_state';

function persistViewState() {
  try {
    localStorage.setItem(VIEW_STATE_STORAGE_KEY, JSON.stringify({
      activeViewId:state.activeViewId,
      layout:state.layout,
      viewMode:state.viewMode,
      groupBy:state.groupBy,
      sortBy:state.sortBy,
      sortDir:state.sortDir,
      filters:state.filters,
      showSubtasks:state.showSubtasks,
      collapsedTaskIds:Array.from(collapsedParents),
      cardProperties:state.cardProperties,
    }));
  } catch (e) { /* 本地存储不可用时仍可在当前页面切换视图 */ }
}
function restoreViewState() {
  var saved;
  try { saved = JSON.parse(localStorage.getItem(VIEW_STATE_STORAGE_KEY) || 'null'); }
  catch (e) { return; }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
  var view = tkGetViews().find(function (v) { return v.id === saved.activeViewId; });
  if (saved.activeViewId && !view) return;
  state.activeViewId = view ? view.id : 'all';
  state.scope = view && ['all','members','agents','my_assigned','my_created'].includes(view.scope) ? view.scope : 'all';
  if (['board','list'].includes(saved.layout)) state.layout = saved.layout;
  if (['slide','full','split'].includes(saved.viewMode)) state.viewMode = saved.viewMode;
  if (['status','priority','assignee','project','none'].includes(saved.groupBy)) state.groupBy = saved.groupBy;
  if (['status','priority','dueDate','createDate','title','module','code','assignee','project'].includes(saved.sortBy)) state.sortBy = saved.sortBy;
  if (['asc','desc'].includes(saved.sortDir)) state.sortDir = saved.sortDir;
  if (typeof saved.showSubtasks === 'boolean') state.showSubtasks = saved.showSubtasks;
  if (Array.isArray(saved.collapsedTaskIds)) {
    var taskIds = new Set(tkGetTasks().map(function (t) { return t.id; }));
    collapsedParents = new Set(saved.collapsedTaskIds.filter(function (id) {
      return Number.isInteger(id) && taskIds.has(id);
    }));
  }
  if (saved.cardProperties && typeof saved.cardProperties === 'object') {
    Object.keys(state.cardProperties).forEach(function (key) {
      if (typeof saved.cardProperties[key] === 'boolean') state.cardProperties[key] = saved.cardProperties[key];
    });
  }
  if (Array.isArray(saved.filters)) {
    var fields = ['status','priority','dueDate','assignee','creator','project','projectStatus','label','keyword'];
    var operators = ['eq','neq','contains','not_contains','today','overdue','before','after'];
    state.filters = saved.filters.slice(0, 30).filter(function (f) {
      return f && fields.includes(f.field) && operators.includes(f.op) && typeof f.value === 'string';
    }).map(function (f) { return { field:f.field, op:f.op, value:f.value }; });
  }
}

/* ---------- 元素缓存 ---------- */
function cacheEls() {
  var ids = [
    'tkViewTabs','tkViewAdd','tkViewMenu','tkViewMenuNew','tkViewManage','tkViewOverflow','tkViewOverflowBtn','tkOverflowMenu',
    'tkSearch','tkFilterBtn','tkFilterLabel','tkFilterPanel','tkFilterPanelBody','tkFilterSubmenu','tkFilterChips','tkToolbarNew',
    'tkDisplayBtn','tkDisplayPopover','tkGroupSelect','tkViewModeSelect','tkSortSelect','tkSortDirection','tkShowSubtasks','tkCardProperties',
    'tkConnectBtn','tkConnectOverlay','tkConnectClose','tkConnectCancel',
    'tkLayoutToggle','tkBody','tkBoard','tkBoardScroll','tkList','tkListBody','tkListHead','tkSplitEmpty',
    'tkCheckAll','tkEmpty','tkResetFilter','tkBulkBar','tkBulkCount','tkBulkClear',
    'tkDrawer','tkDrawerClickaway','tkDrawerResize','tkDrawerClose','tkDrawerCode','tkDrawerBody','tkDrawerMore','tkDrawerSidebarToggle','tkDrawerChat',
    'tkModalOverlay','tkModalClose','tkModalCancel','tkModalSave','tkModalTitle',
    'tkFormTitle','tkFormDesc','tkFormStatus','tkFormPriority','tkFormAssignee','tkFormProject','tkFormDue','tkFormLabels',
    'tkSaveViewOverlay','tkSaveViewClose','tkSaveViewCancel','tkSaveViewConfirm','tkSaveViewName','tkSaveViewVisibility','tkSaveViewScope','tkSaveViewLayout','tkSaveViewSummary',
    'tkManageViewsOverlay','tkManageViewsClose','tkManageViewsCancel','tkManageList',
    'tkBulkStatusMenu','tkBulkAssigneeMenu',
  ];
  ids.forEach(function (id) { els[id] = document.getElementById(id); });
}

/* ---------- 工具函数 ---------- */
function escapeHtml(s) {
  return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';
}
function openTaskConversation() {
  showView('newtask');
  setNavActive('新会话');
}
function openTaskConversationWithTask(taskId) {
  var t = tkGetTasks().find(function (x) { return x.id === taskId; });
  closeDrawer();
  openTaskConversation();
  if (!t) return;
  var tags = document.getElementById('ntTags');
  if (tags) {
    tags.innerHTML = '<span class="ctag"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><span class="ctag-label">' + escapeHtml(t.code) + ' ' + escapeHtml(t.title) + '</span><button type="button" class="ctag-x" data-clear-task-ref data-tooltip="移除任务关联" aria-label="移除任务关联"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></span>';
    tags.classList.remove('hidden');
  }
  input.focus();
}
function showCardMenu(taskId, anchorEl, detailOnly) {
  document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();});
  var menu = document.createElement('div');
  menu.className = 'tk-card-menu' + (detailOnly ? ' tk-drawer-more-menu' : '') + ' show';
  var itemSvg = {
    chat: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    subtask: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    delete: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
  };
  menu.innerHTML = ''
    + (detailOnly ? '' : '<div class="tk-card-menu-item" data-card-task="' + taskId + '" data-card-action="chat">' + itemSvg.chat + '<span>发起会话</span></div>')
    + (detailOnly ? '' : '<div class="tk-card-menu-item" data-card-task="' + taskId + '" data-card-action="subtask">' + itemSvg.subtask + '<span>创建子任务</span></div>')
    + '<div class="tk-card-menu-item" data-card-task="' + taskId + '" data-card-action="copy">' + itemSvg.copy + '<span>复制</span></div>'
    + '<div class="tk-card-menu-item danger" data-card-task="' + taskId + '" data-card-action="delete">' + itemSvg.delete + '<span>删除</span></div>';
  document.body.appendChild(menu);
  menu.querySelectorAll('[data-card-action]').forEach(function(item) {
    item.addEventListener('click', function() {
      var act = item.getAttribute('data-card-action');
      var aid = parseInt(item.getAttribute('data-card-task'), 10);
      if (detailOnly && act === 'delete' && state.drawerTaskId === aid) closeDrawer();
      handleCardAction(act, aid);
      document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();});
      if (detailOnly) els.tkDrawerMore.setAttribute('aria-expanded', 'false');
    });
  });
  var rect = anchorEl.getBoundingClientRect();
  var top = rect.bottom + 4;
  var left = rect.right - menu.offsetWidth;
  if (left < 8) left = 8;
  if (top + menu.offsetHeight > window.innerHeight) top = rect.top - menu.offsetHeight - 4;
  menu.style.top = top + 'px';
  menu.style.left = left + 'px';
}
function handleCardAction(act, aid) {
  if (act === 'chat') { openTaskConversationWithTask(aid); }
  else if (act === 'edit') { openDrawer(aid); }
  else if (act === 'delete') { tkDeleteTask(aid); render(); }
  else if (act === 'copy') {
    var src = tkGetTasks().find(function(x){return x.id===aid;});
    if (src) { tkAddTask(Object.assign({}, src, {labels:(src.labels||[]).slice(), createDate:new Date().toISOString().slice(0,10)})); render(); }
  }
  else if (act === 'subtask') {
    var parent = tkGetTasks().find(function(x){return x.id===aid;});
    if (parent) {
      tkAddTask({ title: parent.title + ' - 子任务', desc:'', status:'backlog', priority: parent.priority || 'medium',
        assignee: parent.assignee || TK_CURRENT_USER, project: parent.project || 'p1',
        labels:(parent.labels||[]).slice(), dueDate:'', createDate:new Date().toISOString().slice(0,10),
        parentId: parent.id });
      render();
    }
  }
}
function priClass(p) { return 'tk-pri-' + (p || 'low'); }
function filterAssigneeOptions(menu, optionSelector, value) {
  if (!menu) return;
  var empty = menu.querySelector('.tk-assignee-empty');
  if (!empty) {
    empty = document.createElement('div');
    empty.className = 'tk-assignee-empty';
    empty.textContent = '无匹配的处理人';
    menu.appendChild(empty);
  }
  var query = value.trim().toLocaleLowerCase();
  var visible = 0;
  menu.querySelectorAll(optionSelector).forEach(function (item) {
    item.hidden = !item.textContent.toLocaleLowerCase().includes(query);
    if (!item.hidden) visible++;
  });
  empty.hidden = visible > 0;
}
function chooseFirstAssignee(menu, optionSelector, e) {
  if (e.key !== 'Enter' || e.isComposing || !menu || menu.hidden) return;
  var first = Array.from(menu.querySelectorAll(optionSelector)).find(function (item) { return !item.hidden; });
  if (first) { e.preventDefault(); first.click(); }
}
function stClass(s) {
  var map = { backlog: 'gray', in_progress: 'blue', in_review: 'orange', done: 'green', blocked: 'red' };
  return 'tk-st-' + (map[s] || 'gray');
}
function avatar(assignee) {
  var p = tkGetPerson(assignee);
  return '<span class="tk-avatar" style="background:' + p.color + '">' + escapeHtml(p.avatar) + '</span>';
}
function avatarSm(assignee) {
  var p = tkGetPerson(assignee);
  return '<span class="tk-avatar-sm" style="background:' + p.color + '">' + escapeHtml(p.avatar) + '</span>';
}
function fmtDate(d) {
  if (!d) return '—';
  var parts = d.split('-');
  return parts[1] + '/' + parts[2];
}
function isOverdue(d) {
  if (!d) return false;
  var today = new Date('2026-09-23');
  var due = new Date(d);
  return due < today;
}
function priWeight(p) {
  var w = { urgent: 4, high: 3, medium: 2, low: 1 };
  return w[p] || 0;
}

/* ---------- 筛选与排序 ---------- */
function getFilteredTasks() {
  var tasks = tkGetTasks();
  var scope = state.scope;
  if (scope === 'members') tasks = tasks.filter(function (t) { return !t.assignee || t.assignee.charAt(0) === 'u'; });
  else if (scope === 'agents') tasks = tasks.filter(function (t) { return t.assignee && t.assignee.charAt(0) === 'a'; });
  else if (scope === 'my_assigned') tasks = tasks.filter(function (t) { return t.assignee === TK_CURRENT_USER; });
  else if (scope === 'my_created') tasks = tasks.filter(function (t) { return t.createdBy === TK_CURRENT_USER; });
  if (state.search) {
    var q = state.search.toLowerCase();
    tasks = tasks.filter(function (t) {
      return t.title.toLowerCase().indexOf(q) >= 0 || t.code.toLowerCase().indexOf(q) >= 0 || (t.desc && t.desc.toLowerCase().indexOf(q) >= 0);
    });
  }
  if (!state.showSubtasks) tasks = tasks.filter(function (t) { return !t.parentId; });
  var fields = [...new Set(state.filters.map(function (f) { return f.field; }))];
  fields.forEach(function (field) {
    var choices = state.filters.filter(function (f) { return f.field === field; });
    tasks = tasks.filter(function (t) { return choices.some(function (f) { return matchFilter(t, f); }); });
  });
  return tasks.slice().sort(function (a, b) {
    var sortKey = state.sortDir === 'none' ? 'createDate' : state.sortBy;
    var sortDir = state.sortDir === 'none' ? 'desc' : state.sortDir;
    var va, vb;
    switch (sortKey) {
      case 'priority': va = priWeight(a.priority); vb = priWeight(b.priority); break;
      case 'dueDate': va = a.dueDate || '9999'; vb = b.dueDate || '9999'; break;
      case 'createDate': va = a.createDate || ''; vb = b.createDate || ''; break;
      case 'status': va = TK_STATUSES.findIndex(function (s) { return s.id === a.status; }); vb = TK_STATUSES.findIndex(function (s) { return s.id === b.status; }); break;
      case 'code': va = a.code; vb = b.code; break;
      case 'title': va = a.title; vb = b.title; break;
      case 'module': va = a.module || ''; vb = b.module || ''; break;
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
  if (field === 'creator') return (task.createdBy || TK_CURRENT_USER) === val;
  if (field === 'projectStatus') return val === 'active' && !!task.project;
  if (field === 'label' && op === 'eq') return (task.labels || []).includes(val);
  if (field === 'keyword') {
    if (op === 'contains') return (task.title + task.desc + task.code).toLowerCase().indexOf(String(val).toLowerCase()) >= 0;
    if (op === 'not_contains') return (task.title + task.desc + task.code).toLowerCase().indexOf(String(val).toLowerCase()) < 0;
  }
  if (field === 'dueDate') {
    var d = task.dueDate;
    if (!d) return false;
    if (op === 'before') return d < val;
    if (op === 'after') return d > val;
    if (op === 'today') { var today = '2026-09-23'; return d === today; }
    if (op === 'overdue') return isOverdue(d) && task.status !== 'done';
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
function buildTaskTree(tasks) {
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
function renderTreeNodes(tasks, childrenMap, depth) {
  return tasks.map(function (t) {
    var id = t.id;
    var children = childrenMap.get(id) || [];
    var hasChildren = children.length > 0;
    var isCollapsed = collapsedParents.has(id);
    var html = renderCard(t, { depth: depth, hasChildren: hasChildren, isCollapsed: isCollapsed, childCount: children.length });
    if (hasChildren && !isCollapsed) html += renderTreeNodes(children, childrenMap, depth + 1);
    return html;
  }).join('');
}
function renderListTreeNodes(tasks, childrenMap, depth) {
  return tasks.map(function (t) {
    var id = t.id;
    var children = childrenMap.get(id) || [];
    var hasChildren = children.length > 0;
    var isCollapsed = collapsedParents.has(id);
    var html = renderListRow(t, { depth: depth, hasChildren: hasChildren, isCollapsed: isCollapsed, childCount: children.length });
    if (hasChildren && !isCollapsed) html += renderListTreeNodes(children, childrenMap, depth + 1);
    return html;
  }).join('');
}

/* ---------- 分组 ---------- */
function getGroupedTasks(tasks) {
  if (state.groupBy === 'none') return [{ key: 'all', name: '全部', tasks: tasks }];
  var groups = {}, keys = [];
  if (state.groupBy === 'status') {
    TK_STATUSES.forEach(function (s) { groups[s.id] = { name: s.name, color: s.color, tasks: [] }; keys.push(s.id); });
  } else if (state.groupBy === 'priority') {
    TK_PRIORITIES.forEach(function (p) { groups[p.id] = { name: p.name, color: p.color, tasks: [] }; keys.push(p.id); });
  } else if (state.groupBy === 'assignee') {
    TK_PEOPLE.forEach(function (p) { groups[p.id] = { name: p.name, color: p.color, tasks: [] }; keys.push(p.id); });
    groups.unassigned = { name: '未分配', color: 'gray', tasks: [] }; keys.push('unassigned');
  } else if (state.groupBy === 'project') {
    TK_PROJECTS.forEach(function (p) { groups[p.id] = { name: p.name, color: 'blue', tasks: [] }; keys.push(p.id); });
    groups.none = { name: '无项目', color: 'gray', tasks: [] }; keys.push('none');
  }
  tasks.forEach(function (t) {
    var k = t[state.groupBy];
    if (!k) {
      if (state.groupBy === 'assignee') k = 'unassigned';
      else if (state.groupBy === 'project') k = 'none';
      else k = keys[0];
    }
    if (!groups[k]) { groups[k] = { name: k, color: 'gray', tasks: [] }; keys.push(k); }
    groups[k].tasks.push(t);
  });
  return keys.filter(function (k) { return groups[k].tasks.length > 0; }).map(function (k) {
    return { key: k, name: groups[k].name, color: groups[k].color, tasks: groups[k].tasks };
  });
}

/* ---------- 渲染：视图标签栏 ---------- */
function renderViewBar() {
  var views = tkGetViews();
  var html = views.map(function (v) {
    return '<div class="tk-view-tab' + (v.id === state.activeViewId ? ' active' : '') + '" data-view-id="' + v.id + '">'
      + '<span class="tk-tab-name">' + escapeHtml(v.name) + '</span>'
      + (v.builtin ? '' : '<span class="tk-tab-del" data-del-view="' + v.id + '" data-tooltip="删除视图" aria-label="删除视图"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>')
      + '</div>';
  }).join('');
  els.tkViewTabs.innerHTML = html;
}

/* ---------- 渲染：看板 ---------- */
function renderBoard() {
  var tasks = getFilteredTasks();
  if (tasks.length === 0) { showEmpty(); return; }
  showBoardOrList();
  var groups = getGroupedTasks(tasks);
  var html = groups.map(function (g) {
    var tree = buildTaskTree(g.tasks);
    var cards = renderTreeNodes(tree.roots, tree.childrenMap, 0);
    return '<div class="tk-board-col" data-group-key="' + g.key + '">'
      + '<div class="tk-board-col-head"><div class="tk-board-col-head-left">'
      + '<span class="tk-board-col-dot tk-st-' + (g.color || 'gray') + '"></span>'
      + '<span class="tk-board-col-name">' + escapeHtml(g.name) + '</span>'
      + '<span class="tk-board-col-count">' + g.tasks.length + '</span>'
      + '</div><div class="tk-board-col-head-right">'
      + '<button class="tk-board-col-toggle" data-toggle-col data-tooltip="折叠分组" aria-label="折叠分组"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>'
      + '<button class="tk-board-col-add" data-add-group="' + g.key + '" data-tooltip="新建任务" aria-label="新建任务"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>'
      + '</div></div>'
      + '<div class="tk-board-col-body">' + cards + '</div>'
      + '</div>';
  }).join('');
  els.tkBoardScroll.innerHTML = html;
}

function renderCard(t, opts) {
  opts = opts || {};
  var depth = opts.depth || 0;
  var hasChildren = !!opts.hasChildren;
  var isCollapsed = !!opts.isCollapsed;
  var childCount = opts.childCount || 0;
  var pri = tkGetPriorityObj(t.priority);
  var overdue = isOverdue(t.dueDate) && t.status !== 'done';
  var props = state.cardProperties;
  var labels = props.labels ? (t.labels || []).map(function (l) { return '<span class="tk-card-label">' + escapeHtml(l) + '</span>'; }).join('') : '';
  var sel = state.selectedIds.has(t.id) ? ' selected' : '';
  var toggle = hasChildren ? '<button class="tk-card-toggle' + (isCollapsed ? ' is-collapsed' : '') + '" data-tk-toggle="' + t.id + '" aria-expanded="' + !isCollapsed + '" aria-label="' + (isCollapsed ? '展开子任务' : '折叠子任务') + '"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 7.5 5 5 5-5"/></svg></button>' : '';
  var spacer = !hasChildren ? '<span class="tk-card-spacer"></span>' : '';
  var childBadge = hasChildren ? '<span class="tk-card-child-count"' + (isCollapsed ? '' : ' style="visibility:hidden"') + '>' + childCount + '</span>' : '';
  var extraCls = (depth ? ' tk-card--child' : '') + (hasChildren ? ' tk-card--parent' : '');
  return '<div class="tk-card' + sel + extraCls + '" draggable="true" data-task-id="' + t.id + '" style="margin-left:' + depth + 'em">'
    + '<button class="tk-card-more" data-card-more="' + t.id + '" data-tooltip="更多操作" aria-label="更多操作"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>'
    + '<div class="tk-card-top-row">' + toggle + spacer + '<div class="tk-card-code">' + escapeHtml(t.code) + '</div>' + childBadge + '</div>'
    + '<div class="tk-card-title">' + escapeHtml(t.title) + '</div>'
    + (props.description && t.desc ? '<div class="tk-card-description">' + escapeHtml(t.desc) + '</div>' : '')
    + (labels ? '<div class="tk-card-labels">' + labels + '</div>' : '')
    + '<div class="tk-card-foot"><div class="tk-card-foot-left">'
    + (props.priority ? '<span class="tk-card-priority ' + priClass(t.priority) + '">' + escapeHtml(pri.name) + '</span>' : '')
    + (props.startDate && t.startDate ? '<span class="tk-card-due">' + fmtDate(t.startDate) + '</span>' : '')
    + (props.dueDate && t.dueDate ? '<span class="tk-card-due' + (overdue ? ' overdue' : '') + '"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + fmtDate(t.dueDate) + '</span>' : '')
    + (props.project && t.project ? '<span class="tk-card-project">' + escapeHtml(tkGetProjectName(t.project)) + '</span>' : '')
    + '</div>' + (props.assignee ? avatar(t.assignee) : '') + '</div></div>';
}

/* ---------- 渲染：列表行（支持父子嵌套缩进） ---------- */
function renderListRow(t, opts) {
  opts = opts || {};
  var depth = opts.depth || 0;
  var hasChildren = !!opts.hasChildren;
  var isCollapsed = !!opts.isCollapsed;
  var childCount = opts.childCount || 0;
  var pri = tkGetPriorityObj(t.priority);
  var st = tkGetStatusObj(t.status);
  var person = tkGetPerson(t.assignee);
  var overdue = isOverdue(t.dueDate) && t.status !== 'done';
  var sel = state.selectedIds.has(t.id) ? ' selected' : '';
  var toggle = hasChildren ? '<button class="tk-row-toggle' + (isCollapsed ? ' is-collapsed' : '') + '" data-tk-toggle="' + t.id + '" aria-expanded="' + !isCollapsed + '" aria-label="' + (isCollapsed ? '展开子任务' : '折叠子任务') + '"><svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 7.5 5 5 5-5"/></svg></button>' : '';
  var spacer = !hasChildren ? '<span class="tk-row-spacer"></span>' : '';
  var childBadge = hasChildren ? '<span class="tk-row-child-count"' + (isCollapsed ? '' : ' style="visibility:hidden"') + '>' + childCount + '</span>' : '';
  var indentStyle = depth > 0 ? ' style="padding-left:calc(10px + ' + depth + 'em)"' : '';
  return '<tr class="tk-row' + sel + (state.drawerTaskId === t.id ? ' detail-active' : '') + (depth ? ' tk-row--child' : '') + (hasChildren ? ' tk-row--parent' : '') + '" data-task-id="' + t.id + '" data-depth="' + depth + '">'
    + '<td class="tk-col-check"><input type="checkbox" class="tk-row-check" data-task-id="' + t.id + '"' + (state.selectedIds.has(t.id) ? ' checked' : '') + '></td>'
    + '<td class="tk-col-code"><span class="tk-row-code">' + escapeHtml(t.code) + '</span></td>'
    + '<td class="tk-col-title"' + indentStyle + '><div class="tk-row-title-wrap">' + toggle + spacer + '<span class="tk-row-title-text">' + escapeHtml(t.title) + '</span>' + childBadge + '</div></td>'
    + '<td class="tk-col-module">' + escapeHtml(t.module || '—') + '</td>'
    + '<td class="tk-col-status"><span class="tk-row-status"><span class="tk-st-dot ' + stClass(t.status) + '"></span>' + escapeHtml(st.name) + '</span></td>'
    + '<td class="tk-col-priority"><span class="tk-row-priority ' + priClass(t.priority) + '">' + escapeHtml(pri.name) + '</span></td>'
    + '<td class="tk-col-assignee"><div class="tk-row-assignee">' + avatarSm(t.assignee) + '<span>' + escapeHtml(person.name) + '</span></div></td>'
    + '<td class="tk-col-project">' + escapeHtml(tkGetProjectName(t.project)) + '</td>'
    + '<td class="tk-col-due"><span class="tk-row-due' + (overdue ? ' overdue' : '') + '">' + (t.dueDate ? fmtDate(t.dueDate) : '—') + '</span></td>'
    + '<td class="tk-col-created">' + fmtDate(t.createDate) + '</td>'
    + '<td class="tk-col-actions"><button class="tk-card-more" data-card-more="' + t.id + '" data-tooltip="更多操作" aria-label="更多操作"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button></td></tr>';
}

/* ---------- 渲染：列表 ---------- */
function renderList(tasks) {
  tasks = tasks || getFilteredTasks();
  if (tasks.length === 0 && state.viewMode === 'split') {
    showBoardOrList();
    els.tkListBody.innerHTML = '<tr class="tk-row-create"><td colspan="11">没有匹配的任务</td></tr>';
    updateSortArrows();
    return;
  }
  if (tasks.length === 0) { showEmpty(); return; }
  showBoardOrList();
  var tree = buildTaskTree(tasks);
  var html = renderListTreeNodes(tree.roots, tree.childrenMap, 0);
  els.tkListBody.innerHTML = '<tr class="tk-row-create" id="tkRowCreate"><td colspan="11"><button class="tk-inline-create-btn" id="tkInlineCreateBtn">+ 快速新建</button></td></tr>' + html;
  updateSortArrows();
}

function animateListSubtasks(toggleBtn) {
  var taskId = Number(toggleBtn.getAttribute('data-tk-toggle'));
  var opening = collapsedParents.has(taskId);
  var before = new Map();
  els.tkListBody.querySelectorAll('tr.tk-row[data-task-id]').forEach(function (row) {
    before.set(row.getAttribute('data-task-id'), row.getBoundingClientRect().top);
  });
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!opening && !reduceMotion) {
    var parentRow = toggleBtn.closest('tr.tk-row');
    var parentDepth = Number(parentRow.getAttribute('data-depth'));
    var next = parentRow.nextElementSibling;
    var listRect = els.tkList.getBoundingClientRect();
    while (next && next.classList.contains('tk-row') && Number(next.getAttribute('data-depth')) > parentDepth) {
      var rowRect = next.getBoundingClientRect();
      if (rowRect.top >= listRect.top && rowRect.bottom <= listRect.bottom) {
        var ghost = document.createElement('table');
        ghost.className = 'tk-table tk-row-collapse-ghost';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.style.left = rowRect.left + 'px';
        ghost.style.top = rowRect.top + 'px';
        ghost.style.width = rowRect.width + 'px';
        var columns = document.createElement('colgroup');
        next.querySelectorAll('td').forEach(function (cell) {
          var col = document.createElement('col');
          col.style.width = cell.getBoundingClientRect().width + 'px';
          columns.appendChild(col);
        });
        ghost.appendChild(columns);
        var body = document.createElement('tbody');
        body.appendChild(next.cloneNode(true));
        ghost.appendChild(body);
        document.body.appendChild(ghost);
        var fade = ghost.animate([
          { opacity: 1, transform: 'translateY(0) scaleY(1)' },
          { opacity: 0, transform: 'translateY(-10px) scaleY(.92)' },
        ], { duration: 220, easing: 'cubic-bezier(.32,0,.67,0)', fill: 'forwards' });
        fade.onfinish = function () { this.effect.target.remove(); };
      }
      next = next.nextElementSibling;
    }
  }
  if (opening) collapsedParents.delete(taskId);
  else collapsedParents.add(taskId);
  render();
  if (reduceMotion) return;
  var inserted = 0;
  els.tkListBody.querySelectorAll('tr.tk-row[data-task-id]').forEach(function (row) {
    var previousTop = before.get(row.getAttribute('data-task-id'));
    if (previousTop === undefined) {
      row.animate([
        { opacity: 0, transform: 'translateY(-8px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 280, delay: Math.min(inserted++ * 18, 72), easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    } else {
      var shift = previousTop - row.getBoundingClientRect().top;
      if (Math.abs(shift) > 1) row.animate([
        { transform: 'translateY(' + shift + 'px)' },
        { transform: 'translateY(0)' },
      ], { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
  });
  var newToggle = els.tkListBody.querySelector('[data-tk-toggle="' + taskId + '"] svg');
  if (newToggle) newToggle.animate([
    { transform: opening ? 'rotate(-90deg)' : 'rotate(0deg)' },
    { transform: opening ? 'rotate(0deg)' : 'rotate(-90deg)' },
  ], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' });
}

function updateSortArrows() {
  $$('#tkListHead th[data-sort]').forEach(function (th) {
    th.classList.remove('sorted');
    var arrow = th.querySelector('.tk-sort-arrow');
    if (arrow) arrow.remove();
    var hint = th.querySelector('.tk-sort-hint');
    if (!hint) {
      hint = document.createElement('span');
      hint.className = 'tk-sort-hint';
      hint.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';
      th.appendChild(hint);
    }
    if (th.getAttribute('data-sort') === state.sortBy && state.sortDir !== 'none' && !(state.sortBy === 'createDate' && state.sortDir === 'desc')) {
      th.classList.add('sorted');
      var span = document.createElement('span');
      span.className = 'tk-sort-arrow';
      span.textContent = state.sortDir === 'asc' ? '↑' : '↓';
      th.appendChild(span);
    }
  });
}

/* ---------- 渲染：筛选 Chip ---------- */
function renderFilterChips() {
  if (state.filters.length === 0) { els.tkFilterChips.classList.add('hidden'); els.tkFilterChips.innerHTML = ''; return; }
  els.tkFilterChips.classList.remove('hidden');
  var html = state.filters.map(function (f, i) {
    var fieldDef = TK_FILTER_FIELDS.find(function (fd) { return fd.id === f.field; });
    var sectionDef = filterSections.find(function (section) { return section[0] === f.field; });
    var fieldName = sectionDef ? sectionDef[1] : fieldDef ? fieldDef.name : f.field;
    var ops = TK_OPERATORS[fieldDef ? fieldDef.type : 'text'] || [];
    var opDef = ops.find(function (o) { return o.value === f.op; });
    var opLabel = opDef ? opDef.label : f.op === 'eq' ? '是' : f.op;
    var val = f.value;
    var menuOpt = filterOptionsFor(f.field).find(function (o) { return o.value === f.value; });
    if (menuOpt) val = menuOpt.label;
    if (f.op === 'today') val = '今天';
    if (f.op === 'overdue') val = '已逾期';
    return '<span class="tk-chip"><span class="tk-chip-field">' + escapeHtml(fieldName) + '</span><span class="tk-chip-op">' + escapeHtml(opLabel) + '</span><span class="tk-chip-val">' + escapeHtml(val) + '</span><button class="tk-chip-remove" data-chip-idx="' + i + '" data-tooltip="移除筛选" aria-label="移除筛选"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></span>';
  }).join('') + '<button class="tk-chip-clear-all" id="tkChipClearAll">清除全部</button>';
  els.tkFilterChips.innerHTML = html;
}

/* ---------- 渲染：空状态 / 布局切换 / 批量栏 / 全选 ---------- */
function showEmpty() {
  els.tkBoard.classList.add('hidden'); els.tkList.classList.add('hidden'); els.tkEmpty.classList.remove('hidden');
}
function showBoardOrList() {
  els.tkEmpty.classList.add('hidden');
  if (state.layout === 'board') { els.tkBoard.classList.remove('hidden'); els.tkList.classList.add('hidden'); }
  else { els.tkList.classList.remove('hidden'); els.tkBoard.classList.add('hidden'); }
}
function updateBulkBar() {
  var count = state.selectedIds.size;
  if (count === 0) { els.tkBulkBar.classList.add('hidden'); return; }
  els.tkBulkBar.classList.remove('hidden'); els.tkBulkCount.textContent = count;
}
function render() {
  var split = state.viewMode === 'split';
  if (split) state.layout = 'list';
  els.tkToolbarNew.classList.toggle('hidden', state.layout !== 'list');
  els.tkBody.classList.toggle('is-split', split);
  els.tkDrawer.classList.toggle('mode-full', state.viewMode === 'full');
  $$('[data-layout]', els.tkLayoutToggle).forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-layout') === state.layout);
  });
  renderDisplayControls();
  updateFilterButton();
  renderViewBar();
  if (split) {
    var visibleTasks = getFilteredTasks();
    if (!visibleTasks.some(function (t) { return t.id === state.drawerTaskId; })) {
      state.drawerTaskId = visibleTasks.length ? visibleTasks[0].id : null;
    }
    renderList(visibleTasks);
    if (state.drawerTaskId) {
      els.tkSplitEmpty.classList.add('hidden');
      if (els.tkDrawer.getAttribute('data-task-id') !== String(state.drawerTaskId) || els.tkDrawer.classList.contains('hidden') || !els.tkDrawer.classList.contains('show')) openDrawer(state.drawerTaskId);
    } else {
      closeDrawer();
      els.tkSplitEmpty.classList.remove('hidden');
    }
  } else {
    els.tkSplitEmpty.classList.add('hidden');
    if (state.layout === 'board') renderBoard(); else renderList();
  }
  renderFilterChips(); updateBulkBar(); updateCheckAll();
  syncDrawerClickaway();
  persistViewState();
}
var cardPropertyOptions = [
  ['priority','优先级'],['description','描述'],['assignee','负责人'],['startDate','开始日期'],
  ['dueDate','截止日期'],['project','项目'],['labels','标签'],['childProgress','子任务进度'],
];
function sortDirectionLabel() {
  if (state.sortBy === 'createDate') return state.sortDir === 'desc' ? '最新优先' : '最早优先';
  if (state.sortBy === 'priority') return state.sortDir === 'desc' ? '最高优先级优先' : '最低优先级优先';
  if (state.sortBy === 'dueDate') return state.sortDir === 'asc' ? '最早日期优先' : '最晚日期优先';
  if (state.sortBy === 'title') return state.sortDir === 'asc' ? 'A 到 Z' : 'Z 到 A';
  return state.sortDir === 'asc' ? '正序' : '倒序';
}
function renderDisplayControls() {
  els.tkGroupSelect.value = state.groupBy;
  els.tkViewModeSelect.value = state.viewMode;
  els.tkSortSelect.value = state.sortBy;
  els.tkSortDirection.textContent = sortDirectionLabel();
  els.tkShowSubtasks.checked = state.showSubtasks;
  els.tkCardProperties.innerHTML = cardPropertyOptions.map(function (opt) {
    return '<button type="button" class="tk-display-property" data-card-property="' + opt[0] + '" aria-pressed="' + !!state.cardProperties[opt[0]] + '">' + opt[1] + '</button>';
  }).join('');
}
function positionPopover(popover, trigger, alignEnd) {
  var rect = trigger.getBoundingClientRect();
  var width = popover.offsetWidth;
  var left = alignEnd ? rect.right - width : rect.left;
  popover.style.left = Math.max(8, Math.min(left, window.innerWidth - width - 8)) + 'px';
  popover.style.top = Math.min(rect.bottom + 4, window.innerHeight - popover.offsetHeight - 8) + 'px';
}
function saveInlineTask() {
  var ti = els.tkListBody.querySelector('#tkInlineTitle');
  var saveBtn = els.tkListBody.querySelector('#tkInlineSave');
  if (!ti || !saveBtn || saveBtn.disabled) return;
  var title = ti.value.trim();
  if (!title) { ti.focus(); return; }
  var aw = els.tkListBody.querySelector('#tkInlineAssigneeWrap');
  var av = aw ? aw.getAttribute('data-value') : '';
  saveBtn.disabled = true;
  saveBtn.classList.add('is-loading');
  saveBtn.setAttribute('aria-busy', 'true');
  saveBtn.innerHTML = '<span class="tk-inline-save-spinner" aria-hidden="true"></span>确定中…';
  ti.disabled = true;
  var assigneeBtn = els.tkListBody.querySelector('#tkInlineAssigneeBtn');
  var cancelBtn = els.tkListBody.querySelector('#tkInlineCancel');
  if (assigneeBtn) assigneeBtn.querySelector('input').disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;
  setTimeout(function () {
    var mx = Math.max.apply(null, tkGetTasks().map(function(x){return x.id;}));
     tkAddTask({ id:mx+1, code:'T'+String(1000000+mx+1), title:title, desc:'', status:'backlog', priority:'medium', assignee: av||'u1', project:'p1', labels:[], dueDate:'', createDate:new Date().toISOString().slice(0,10) });
    render();
  }, 400);
}
function updateCheckAll() {
  if (els.tkCheckAll) {
    var tasks = getFilteredTasks();
    els.tkCheckAll.checked = tasks.length > 0 && tasks.every(function (t) { return state.selectedIds.has(t.id); });
  }
}

/* ---------- 表单填充 ---------- */
function fillSelects() {
  function fill(el, arr, valKey, labelKey) {
    if (el) el.innerHTML = arr.map(function (item) { return '<option value="' + item[valKey] + '">' + escapeHtml(item[labelKey]) + '</option>'; }).join('');
  }
  fill(els.tkFormStatus, TK_STATUSES, 'id', 'name');
  fill(els.tkFormPriority, TK_PRIORITIES, 'id', 'name');
  fill(els.tkFormAssignee, TK_PEOPLE, 'id', 'name');
  fill(els.tkFormProject, TK_PROJECTS, 'id', 'name');
  if (els.tkBulkAssigneeMenu) {
    els.tkBulkAssigneeMenu.innerHTML = TK_PEOPLE.map(function (p) {
      return '<div class="tk-popover-item" data-assignee="' + p.id + '">' + escapeHtml(p.name) + '</div>';
    }).join('');
  }
}

/* ---------- 新建/编辑弹窗 ---------- */
function openTaskModal(taskId, parentId) {
  state.editingTaskId = null;
  state.editingParentId = parentId || null;
  els.tkModalTitle.textContent = parentId ? '新增子任务' : '新建任务';
  els.tkFormTitle.value = '';
  els.tkFormDesc.value = '';
  els.tkFormStatus.value = 'backlog';
  els.tkFormPriority.value = 'medium';
  els.tkFormAssignee.value = TK_CURRENT_USER;
  els.tkFormProject.value = TK_PROJECTS[0].id;
  els.tkFormDue.value = '';
  els.tkFormLabels.value = '';
  if (parentId) {
    var parent = tkGetTasks().find(function (x) { return x.id === parentId; });
    if (parent) {
      els.tkFormProject.value = parent.project;
      els.tkFormPriority.value = parent.priority;
      els.tkFormAssignee.value = parent.assignee;
    }
  }
  els.tkModalOverlay.classList.remove('hidden');
  requestAnimationFrame(function () { els.tkModalOverlay.classList.add('show'); });
}
function closeTaskModal() {
  els.tkModalOverlay.classList.remove('show');
  setTimeout(function () { els.tkModalOverlay.classList.add('hidden'); }, 200);
}
function saveTask() {
  var title = els.tkFormTitle.value.trim();
  if (!title) { els.tkFormTitle.focus(); return; }
  var createdForOpenParent = !state.editingTaskId && state.editingParentId && state.drawerTaskId === state.editingParentId;
  var labels = els.tkFormLabels.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var data = {
    title: title, desc: els.tkFormDesc.value.trim(),
    status: els.tkFormStatus.value, priority: els.tkFormPriority.value,
    assignee: els.tkFormAssignee.value, project: els.tkFormProject.value,
    dueDate: els.tkFormDue.value, labels: labels,
  };
  if (state.editingTaskId) { tkUpdateTask(state.editingTaskId, data); }
  else {
    data.createDate = '2026-09-23';
    if (state.editingParentId) {
      data.parentId = state.editingParentId;
      var parentTask = tkGetTasks().find(function (t) { return t.id === state.editingParentId; });
      if (parentTask) data.module = parentTask.module;
    }
    tkAddTask(data);
  }
  closeTaskModal();
  render();
  if (createdForOpenParent) openDrawer(state.drawerTaskId);
}

/* ---------- 评论 @ mention ---------- */
var mentionPanel = null;
var mentionItems = [];
var mentionIndex = 0;

function createMentionPanel(textarea, query) {
  var people = TK_PEOPLE.filter(function (p) {
    return !query || p.name.toLowerCase().indexOf(query.toLowerCase()) >= 0;
  });
  var agents = TK_AGENTS.filter(function (a) {
    return !query || a.name.toLowerCase().indexOf(query.toLowerCase()) >= 0;
  });
  var html = '';
  if (people.length > 0) {
    html += '<div class="tk-mention-group"><div class="tk-mention-group-label">人员</div>';
    people.forEach(function (p) {
      html += '<div class="tk-mention-item" data-mention-name="' + escapeHtml(p.name) + '"><span class="tk-mention-avatar" style="background:' + p.color + '">' + escapeHtml(p.avatar) + '</span><span class="tk-mention-name">' + escapeHtml(p.name) + '</span><span class="tk-mention-type">人员</span></div>';
    });
    html += '</div>';
  }
  if (agents.length > 0) {
    html += '<div class="tk-mention-group"><div class="tk-mention-group-label">智能体</div>';
    agents.forEach(function (a) {
      html += '<div class="tk-mention-item" data-mention-name="' + escapeHtml(a.name) + '"><span class="tk-mention-avatar" style="background:' + a.color + '">' + escapeHtml(a.avatar) + '</span><span class="tk-mention-name">' + escapeHtml(a.name) + '</span><span class="tk-mention-type">智能体</span></div>';
    });
    html += '</div>';
  }
  if (!html) html = '<div class="tk-mention-empty">无匹配结果</div>';
  if (!mentionPanel) {
    mentionPanel = document.createElement('div');
    mentionPanel.className = 'tk-mention-panel';
    mentionPanel.addEventListener('click', function (e) {
      var item = e.target.closest('.tk-mention-item');
      if (item) {
        var ta = els.tkDrawerBody.querySelector('textarea');
        if (ta) insertMention(ta, item.getAttribute('data-mention-name'));
      }
    });
    document.body.appendChild(mentionPanel);
  }
  mentionPanel.innerHTML = html;
  var rect = textarea.getBoundingClientRect();
  mentionPanel.style.top = (rect.bottom + window.scrollY + 4) + 'px';
  mentionPanel.style.left = (rect.left + window.scrollX + 12) + 'px';
  mentionPanel.classList.add('show');
  mentionItems = mentionPanel.querySelectorAll('.tk-mention-item');
  mentionIndex = 0;
  if (mentionItems.length > 0) mentionItems[0].classList.add('active');
}

function closeMentionPanel() {
  if (mentionPanel) mentionPanel.classList.remove('show');
}

function insertMention(ta, name) {
  var pos = ta.selectionStart;
  var text = ta.value;
  var atPos = text.lastIndexOf('@', pos);
  if (atPos < 0) { closeMentionPanel(); return; }
  var before = text.substring(0, atPos);
  var after = text.substring(pos);
  ta.value = before + '@' + name + ' ' + after;
  var newPos = atPos + name.length + 2;
  ta.focus();
  ta.setSelectionRange(newPos, newPos);
  closeMentionPanel();
}

/* ---------- 任务详情面板 ---------- */
var propPickerOptions = {};
var propFieldKeys = { '状态':'status', '处理人':'assignee', '项目':'project', '模块':'module', '优先级':'priority', '截止日期':'dueDate' };
function propPicker(name, currentVal, options, isDate) {
  var display = isDate ? (currentVal || '—') : (options.find(function (o) { return o.value === currentVal; }) || {}).label || '—';
  if (isDate) {
    return '<div class="tk-prop-row"><span>' + name + '</span><input type="date" class="tk-prop-edit" data-prop="' + propFieldKeys[name] + '" value="' + escapeHtml(currentVal || '') + '"></div>';
  }
  propPickerOptions[name] = { options: options, currentVal: currentVal, key: propFieldKeys[name] };
  return '<div class="tk-prop-row"><span>' + name + '</span><div class="tk-prop-display" data-prop-name="' + escapeHtml(name) + '">' + (name === '处理人' ? '<input class="tk-prop-assignee-input" type="text" value="' + escapeHtml(display === '—' ? '' : display) + '" placeholder="处理人" aria-label="处理人" role="combobox" aria-expanded="false" autocomplete="off">' : escapeHtml(display)) + '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div></div>';
}
function renderTaskArtifacts(task) {
  var artifacts = tkGetTaskArtifacts(task);
  return '<div class="tk-artifacts-heading"><span>任务产物</span><span>' + artifacts.length + ' 项</span></div>' +
    '<div class="tk-artifacts-list">' + artifacts.map(function (artifact) {
      return '<details class="tk-artifact">' +
        '<summary class="tk-artifact-summary">' +
          '<span class="tk-artifact-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg></span>' +
          '<span class="tk-artifact-info"><span class="tk-artifact-title">' + escapeHtml(task.title + ' · ' + artifact.type) + '</span><span class="tk-artifact-subtitle">' + escapeHtml(artifact.summary) + '</span><span class="tk-artifact-meta">' + escapeHtml(artifact.author) + ' · ' + escapeHtml(artifact.date) + '</span></span>' +
          '<span class="tk-artifact-type">' + escapeHtml(artifact.type) + '</span>' +
          '<svg class="tk-artifact-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' +
        '</summary>' +
        '<div class="tk-artifact-preview">' +
          artifact.sections.map(function (section) {
            return '<div class="tk-artifact-section"><strong>' + escapeHtml(section.heading) + '</strong><p>' + escapeHtml(section.text) + '</p></div>';
          }).join('') +
        '</div></details>';
    }).join('') + '</div>';
}
function drawerWidthBounds() {
  return { min:480, max:Math.max(480, window.innerWidth - 240) };
}
function setDrawerWidth(width, remember) {
  var bounds = drawerWidthBounds();
  var next = Math.round(Math.min(bounds.max, Math.max(bounds.min, width)));
  els.tkDrawer.style.setProperty('--tk-drawer-width', next + 'px');
  els.tkDrawerResize.setAttribute('aria-valuemin', String(bounds.min));
  els.tkDrawerResize.setAttribute('aria-valuemax', String(bounds.max));
  els.tkDrawerResize.setAttribute('aria-valuenow', String(next));
  if (remember) {
    drawerPreferredWidth = next;
    try { localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(next)); }
    catch (e) { /* 本地存储不可用时保留当前页面的偏好 */ }
  }
  return next;
}
function applyDrawerWidth() {
  if (window.innerWidth <= 760) return;
  setDrawerWidth(drawerPreferredWidth || Math.min(900, window.innerWidth * .75), false);
}
function syncDrawerClickaway() {
  els.tkDrawerClickaway.classList.toggle('hidden', state.viewMode !== 'slide' || !els.tkDrawer.classList.contains('show'));
}
/* ---------- 子任务区域渲染（参考 Multica ProgressRing + ChevronDown） ---------- */
function renderSubtasksSection(t) {
  var children = tkGetTasks().filter(function (c) { return c.parentId === t.id; });
  if (!children.length) {
    return '<div class="tk-subtasks tk-subtasks-empty"><button type="button" class="tk-subtask-empty-add" data-drawer-subtask="' + t.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>添加子任务</span></button></div>';
  }
  var expanded = subtaskSectionExpanded.has(t.id) ? subtaskSectionExpanded.get(t.id) : true;
  var doneCount = children.filter(function (c) { return c.status === 'done'; }).length;
  var prog = children.length ? Math.round(doneCount / children.length * 100) : 0;
  var ringR = 7, ringC = 2 * Math.PI * ringR;
  var ringOffset = ringC * (1 - prog / 100);
  return '<div class="tk-subtasks' + (expanded ? '' : ' is-collapsed') + '">'
    + '<div class="tk-subtask-head">'
    + '<button type="button" class="tk-subtask-toggle" data-subtask-toggle="' + t.id + '" aria-expanded="' + expanded + '" aria-controls="tkSubtaskList"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg><span>子任务</span></button>'
    + '<svg class="tk-subtask-progress-ring" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="' + ringR + '" fill="none" stroke="var(--fill-2)" stroke-width="2"/><circle cx="8" cy="8" r="' + ringR + '" fill="none" stroke="var(--brand)" stroke-width="2" stroke-dasharray="' + ringC.toFixed(1) + '" stroke-dashoffset="' + ringOffset.toFixed(1) + '" stroke-linecap="round" transform="rotate(-90 8 8)"/></svg><span class="tk-subtask-badge">' + doneCount + '/' + children.length + '</span>'
    + '<button type="button" class="tk-subtask-add-btn" data-drawer-subtask="' + t.id + '" data-tooltip="添加子任务" aria-label="添加子任务"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>'
    + '</div>'
    + '<div class="tk-subtask-list" id="tkSubtaskList"' + (expanded ? '' : ' hidden') + '>'
    + children.map(function (c) {
        var st = tkGetStatusObj(c.status);
        return '<button type="button" class="tk-subtask-row" data-subtask-open="' + c.id + '"><span class="tk-subtask-status" data-tooltip="' + escapeHtml(st.name || '待处理') + '" role="img" aria-label="' + escapeHtml(st.name || '待处理') + '"><span class="tk-subtask-status-dot ' + stClass(c.status) + '"></span></span><span class="tk-subtask-title">' + escapeHtml(c.title) + '</span><span class="tk-subtask-meta">' + escapeHtml(tkGetPerson(c.assignee).name) + '</span></button>';
      }).join('')
    + '</div></div>';
}

function renderTaskComments(t) {
  var comments = t.comments || [];
  if (!comments.length) return '<div class="tk-drawer-comments-empty">暂无动态</div>';
  return comments.slice().reverse().map(function (entry) {
    var author = tkGetPerson(entry.authorId).name;
    var summary = '流转至「' + tkGetStatusName(entry.status) + '」，处理人「' + tkGetPerson(entry.assignee).name + '」';
    return '<div class="tk-drawer-comment">'
      + '<div class="tk-drawer-comment-head"><span class="tk-drawer-comment-author">' + escapeHtml(author) + '</span><span class="tk-drawer-comment-time">' + escapeHtml(entry.createdAt) + '</span></div>'
      + '<div class="tk-drawer-comment-action">' + escapeHtml(summary) + '</div>'
      + (entry.text ? '<div class="tk-drawer-comment-text">' + escapeHtml(entry.text) + '</div>' : '')
      + '</div>';
  }).join('');
}

function taskCommentTimestamp() {
  var now = new Date();
  function pad(value) { return String(value).padStart(2, '0'); }
  return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' '
    + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
}

function openDrawer(taskId) {
  var t = tkGetTasks().find(function (x) { return x.id === taskId; });
  if (!t) return;
  if (flowAssigneeDraft.taskId !== taskId) flowAssigneeDraft = { taskId: taskId, assigneeId: '' };
  state.drawerTaskId = taskId;
  els.tkDrawer.setAttribute('data-task-id', String(taskId));
  var person = tkGetPerson(t.assignee);
  var labelsHtml = (t.labels || []).map(function (l) {
    return '<span class="tk-drawer-label">' + escapeHtml(l) + '</span>';
  }).join('');
  var statusOpts = TK_STATUSES.map(function (s) { return { value: s.id, label: s.name }; });
  var priOpts = TK_PRIORITIES.map(function (p) { return { value: p.id, label: p.name }; });
  var peopleOpts = TK_PEOPLE.map(function (p) { return { value: p.id, label: p.name }; });
  var projOpts = TK_PROJECTS.map(function (p) { return { value: p.id, label: p.name }; });
  var moduleOpts = Array.from(new Set(tkGetTasks().filter(function (task) { return task.project === t.project && task.module; }).map(function (task) { return task.module; }))).sort().map(function (name) { return { value:name, label:name }; });
  els.tkDrawerCode.textContent = t.code;
  els.tkDrawerBody.innerHTML =
    '<div class="tk-drawer-main"><div class="tk-drawer-main-inner">' +
      '<h3 class="tk-drawer-title" contenteditable="true" data-field="title">' + escapeHtml(t.title) + '</h3>' +
      '<div class="tk-drawer-tabs">' +
        '<button type="button" class="tk-drawer-tab active" data-tab="info">基础信息</button>' +
        '<button type="button" class="tk-drawer-tab" data-tab="artifacts">产物</button>' +
        '<button type="button" class="tk-drawer-tab" data-tab="changelog">变更日志</button>' +
      '</div>' +
      '<div class="tk-drawer-tab-content active" data-tab-content="info">' +
        '<div class="tk-drawer-desc" contenteditable="true" data-field="desc">' + escapeHtml(t.desc || '点击添加描述…') + '</div>' +
        '<div class="tk-drawer-attachments">' +
          '<div class="tk-attach-dropzone" id="tkAttachDropzone" data-tooltip="添加附件" aria-label="添加附件">' +
            '<input type="file" id="tkAttachInput" multiple style="display:none">' +
            '<svg class="tk-attach-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>' +
          '</div>' +
          '<div class="tk-attach-list" id="tkAttachList"></div>' +
        '</div>' +
        renderSubtasksSection(t) +
        '<div class="tk-drawer-comments"><div class="tk-drawer-comments-title">动态</div>' +
          renderTaskComments(t) +
          '<div class="tk-drawer-flow-fields">' +
            '<div class="tk-flow-field"><span class="tk-flow-field-label">状态</span><div class="tk-flow-pills">' +
              TK_STATUSES.map(function(s) { return '<button type="button" class="tk-flow-pill' + (s.id === t.status ? ' active' : '') + '" data-flow-status="' + s.id + '">' + s.name + '</button>'; }).join('') +
            '</div></div>' +
            '<div class="tk-flow-field"><span class="tk-flow-field-label">处理人</span><div class="tk-flow-field-value tk-flow-field-lg' + (flowAssigneeDraft.assigneeId ? '' : ' is-placeholder') + '" data-flow-prop="assignee"><input class="tk-flow-field-text" type="text" value="' + (flowAssigneeDraft.assigneeId ? escapeHtml(tkGetPerson(flowAssigneeDraft.assigneeId).name) : '') + '" placeholder="请选择" aria-label="处理人" role="combobox" aria-expanded="false" autocomplete="off"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></div></div>' +
          '</div>' +
          '<div class="tk-drawer-comment-input"><textarea placeholder="输入评论… 使用 @ 提及人员"></textarea></div>' +
          '<button class="tk-drawer-flow-btn" data-action="flow">流转</button>' +
        '</div>' +
      '</div>' +
      '<div class="tk-drawer-tab-content" data-tab-content="artifacts" hidden>' +
        renderTaskArtifacts(t) +
      '</div>' +
      '<div class="tk-drawer-tab-content" data-tab-content="changelog" hidden>' +
        '<div class="tk-drawer-changelog-list">' +
          '<div class="tk-drawer-changelog-item"><span class="tk-drawer-changelog-time">' + escapeHtml(t.createDate + ' 09:30:00') + '</span><span class="tk-drawer-changelog-user">Alice</span>创建了任务</div>' +
          '<div class="tk-drawer-changelog-item"><span class="tk-drawer-changelog-time">' + escapeHtml(t.createDate + ' 10:15:30') + '</span><span class="tk-drawer-changelog-user">Alice</span>状态变更为「' + escapeHtml(tkGetStatusName(t.status)) + '」</div>' +
        '</div>' +
      '</div>' +
    '</div></div>' +
    '<div class="tk-drawer-sidebar" id="tkDrawerSidebar">' +
      '<div class="tk-drawer-prop-list" id="tkDrawerPropList">' +
        propPicker('状态', t.status, statusOpts) +
        propPicker('处理人', t.assignee, peopleOpts) +
        propPicker('项目', t.project, projOpts) +
        propPicker('模块', t.module, moduleOpts) +
        propPicker('优先级', t.priority, priOpts) +
        propPicker('截止日期', t.dueDate, null, true) +
        (labelsHtml ? '<div class="tk-prop-row"><span>标签</span><div class="tk-drawer-labels">' + labelsHtml + '</div></div>' : '') +
      '</div>' +
      '<div class="tk-prop-row"><span>创建者</span><span class="tk-prop-val">' + escapeHtml(person.name) + '</span></div>' +
      '<div class="tk-prop-row"><span>创建时间</span><span class="tk-prop-val">' + escapeHtml(t.createdAt || t.createDate) + '</span></div>' +
      '<div class="tk-prop-row"><span>更新时间</span><span class="tk-prop-val">' + escapeHtml(t.updatedAt || t.createdAt || t.createDate) + '</span></div>' +
    '</div>';
  /* 附件上传初始化 */
  (function(){
    var dz = els.tkDrawerBody.querySelector('#tkAttachDropzone');
    var fi = els.tkDrawerBody.querySelector('#tkAttachInput');
    var al = els.tkDrawerBody.querySelector('#tkAttachList');
    if (!dz || !fi || !al) return;
    function renderFiles(files) {
      Array.prototype.forEach.call(files, function(f) {
        var item = document.createElement('div');
        item.className = 'tk-attach-item';
        var sz = f.size < 1024 ? f.size + 'B' : f.size < 1048576 ? (f.size/1024).toFixed(1)+'KB' : (f.size/1048576).toFixed(1)+'MB';
        item.innerHTML = '<span class="tk-attach-item-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span><span class="tk-attach-item-name">' + escapeHtml(f.name) + '</span>' + (sz ? '<span class="tk-attach-item-size">' + sz + '</span>' : '') + '<button class="tk-attach-item-btn" data-tooltip="预览" aria-label="预览"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="tk-attach-item-btn" data-tooltip="下载" aria-label="下载"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button><button class="tk-attach-item-btn tk-attach-item-remove" data-attach-remove data-tooltip="删除" aria-label="删除"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
        al.appendChild(item);
      });
    }
    fi.onchange = function() { renderFiles(fi.files); fi.value=''; };
    dz.ondragover = function(e) { e.preventDefault(); dz.classList.add('dragover'); };
    dz.ondragleave = function() { dz.classList.remove('dragover'); };
    dz.ondrop = function(e) { e.preventDefault(); dz.classList.remove('dragover'); renderFiles(e.dataTransfer.files); };
  })();
  clearTimeout(drawerCloseTimer);
  cancelAnimationFrame(drawerOpenFrame);
  els.tkDrawer.classList.remove('hidden');
  if (state.viewMode === 'split') {
    els.tkDrawer.classList.add('show');
    syncDrawerClickaway();
    els.tkSplitEmpty.classList.add('hidden');
    els.tkListBody.querySelectorAll('tr[data-task-id]').forEach(function (row) {
      row.classList.toggle('detail-active', row.getAttribute('data-task-id') === String(taskId));
    });
    return;
  }
  drawerOpenFrame = requestAnimationFrame(function () {
    els.tkDrawer.classList.add('show');
    syncDrawerClickaway();
  });
}
function closeDrawer() {
  document.querySelectorAll('.tk-drawer-more-menu').forEach(function (m) { m.remove(); });
  els.tkDrawerMore.setAttribute('aria-expanded', 'false');
  flowAssigneeDraft = { taskId: null, assigneeId: '' };
  cancelAnimationFrame(drawerOpenFrame);
  els.tkDrawer.classList.remove('show');
  syncDrawerClickaway();
  clearTimeout(drawerCloseTimer);
  if (state.viewMode === 'split') {
    els.tkDrawer.classList.add('hidden');
    els.tkSplitEmpty.classList.remove('hidden');
    els.tkListBody.querySelectorAll('tr.detail-active').forEach(function (row) { row.classList.remove('detail-active'); });
    state.drawerTaskId = null;
    return;
  }
  drawerCloseTimer = setTimeout(function () {
    els.tkDrawer.classList.add('hidden');
  }, 250);
  state.drawerTaskId = null;
}

/* ---------- 筛选菜单 ---------- */
var activeFilterSection = 'status';
var filterSections = [
  ['status','状态','<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>'],
  ['priority','优先级','<path d="M4 19v-2M9 19v-6M14 19V9M19 19V4"/>'],
  ['dueDate','日期','<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>'],
  ['assignee','负责人','<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>'],
  ['creator','创建者','<circle cx="10" cy="8" r="4"/><path d="M3 21v-2a7 7 0 0 1 12-5M16 20l5-5M18 13l3 3"/>'],
  ['project','项目','<path d="M3 5h7l2 2h9v13H3z"/>'],
  ['projectStatus','项目状态','<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/>'],
  ['label','标签','<path d="M3 3h9l9 9-9 9-9-9z"/><circle cx="8" cy="8" r="1"/>'],
];
function filterOptionsFor(section) {
  var tasks = tkGetTasks();
  if (section === 'status') return [
    ['planned','待规划'],['backlog','待办'],['in_progress','进行中'],['in_review','审核中'],
    ['blocked','已阻塞'],['done','已完成'],['cancelled','已取消'],
  ].map(function (o) { return { value:o[0], label:o[1], count:tasks.filter(function (t) { return t.status === o[0]; }).length }; });
  if (section === 'priority') return TK_PRIORITIES.map(function (p) { return { value:p.id, label:p.name, count:tasks.filter(function (t) { return t.priority === p.id; }).length }; });
  if (section === 'assignee') return TK_PEOPLE.map(function (p) { return { value:p.id, label:p.name, count:tasks.filter(function (t) { return t.assignee === p.id; }).length }; });
  if (section === 'creator') return [{ value:TK_CURRENT_USER, label:tkGetPerson(TK_CURRENT_USER).name, count:tasks.filter(function (t) { return (t.createdBy || TK_CURRENT_USER) === TK_CURRENT_USER; }).length }];
  if (section === 'project') return TK_PROJECTS.map(function (p) { return { value:p.id, label:p.name, count:tasks.filter(function (t) { return t.project === p.id; }).length }; });
  if (section === 'projectStatus') return [{ value:'active', label:'进行中', count:tasks.filter(function (t) { return !!t.project; }).length }];
  if (section === 'label') return TK_LABELS.map(function (l) { return { value:l, label:l, count:tasks.filter(function (t) { return (t.labels || []).includes(l); }).length }; });
  return [];
}
function updateFilterButton() {
  var count = state.filters.length;
  els.tkFilterLabel.textContent = count ? count + ' 个筛选' : '筛选';
  els.tkFilterBtn.classList.toggle('has-filters', count > 0);
}
function renderFilterMenu() {
  els.tkFilterPanelBody.innerHTML = filterSections.map(function (section) {
    var count = state.filters.filter(function (f) { return f.field === section[0]; }).length;
    return '<button type="button" class="tk-filter-category' + (activeFilterSection === section[0] ? ' active' : '') + '" data-filter-section="' + section[0] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + section[2] + '</svg><span>' + section[1] + '</span>' + (count ? '<span class="tk-filter-count">' + count + '</span>' : '') + '<svg class="tk-filter-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 4 8 8-8 8"/></svg></button>';
  }).join('') + (state.filters.length ? '<button type="button" class="tk-filter-reset" id="tkFilterReset">重置全部筛选</button>' : '');
  renderFilterSubmenu();
}
function renderFilterSubmenu() {
  if (!activeFilterSection) { els.tkFilterSubmenu.classList.add('hidden'); return; }
  els.tkFilterSubmenu.classList.remove('hidden');
  if (activeFilterSection === 'dueDate') {
    var exact = state.filters.find(function (f) { return f.field === 'dueDate' && f.op === 'eq'; });
    els.tkFilterSubmenu.innerHTML = '<div class="tk-filter-date"><label for="tkFilterDate">截止日期</label><input type="date" id="tkFilterDate" value="' + (exact ? escapeHtml(exact.value) : '') + '"><button type="button" data-filter-date="today">今天</button><button type="button" data-filter-date="overdue">已逾期</button></div>';
    return;
  }
  els.tkFilterSubmenu.innerHTML = filterOptionsFor(activeFilterSection).map(function (option) {
    var checked = state.filters.some(function (f) { return f.field === activeFilterSection && f.value === option.value; });
    return '<button type="button" class="tk-filter-option" data-filter-value="' + escapeHtml(option.value) + '" aria-pressed="' + checked + '"><span class="tk-filter-check">' + (checked ? '✓' : '') + '</span>' + (activeFilterSection === 'status' ? '<span class="tk-filter-status-icon ' + option.value + '"></span>' : '') + '<span>' + escapeHtml(option.label) + '</span>' + (option.count ? '<span class="tk-filter-count">' + option.count + ' 个任务</span>' : '') + '</button>';
  }).join('');
}
function openFilterPanel() {
  els.tkDisplayPopover.classList.add('hidden');
  els.tkDisplayBtn.classList.remove('active');
  els.tkDisplayBtn.setAttribute('aria-expanded', 'false');
  els.tkFilterPanel.classList.remove('hidden');
  els.tkFilterBtn.classList.add('active');
  els.tkFilterBtn.setAttribute('aria-expanded', 'true');
  activeFilterSection = 'status';
  renderFilterMenu();
  positionPopover(els.tkFilterPanel, els.tkFilterBtn, true);
  var rect = els.tkFilterPanel.getBoundingClientRect();
  els.tkFilterSubmenu.classList.toggle('flip', rect.left < 200);
}
function closeFilterPanel() {
  els.tkFilterPanel.classList.add('hidden');
  els.tkFilterBtn.classList.remove('active');
  els.tkFilterBtn.setAttribute('aria-expanded', 'false');
}
function toggleFilterValue(field, value) {
  var index = state.filters.findIndex(function (f) { return f.field === field && f.value === value; });
  if (index >= 0) state.filters.splice(index, 1);
  else state.filters.push({ field:field, op:'eq', value:value });
  updateFilterButton(); render(); renderFilterMenu();
}

/* ---------- 视图管理 ---------- */
function openSaveView() {
  els.tkSaveViewName.value = '';
  els.tkSaveViewScope.value = state.scope;
  els.tkSaveViewLayout.value = state.layout;
  els.tkSaveViewVisibility.value = 'private';
  els.tkSaveViewSummary.textContent = state.filters.length ? '已包含 ' + state.filters.length + ' 个筛选条件和当前显示设置' : '已包含当前显示设置';
  els.tkSaveViewOverlay.classList.remove('hidden');
  requestAnimationFrame(function () { els.tkSaveViewOverlay.classList.add('show'); });
  els.tkSaveViewName.focus();
}
function closeSaveView() {
  els.tkSaveViewOverlay.classList.remove('show');
  setTimeout(function () { els.tkSaveViewOverlay.classList.add('hidden'); }, 200);
}
function confirmSaveView() {
  var name = els.tkSaveViewName.value.trim();
  if (!name) { els.tkSaveViewName.focus(); return; }
  var v = tkAddView(name, {
    scope: els.tkSaveViewScope.value,
    visibility: els.tkSaveViewVisibility.value,
    layout: els.tkSaveViewLayout.value,
    filters: state.filters.map(function (f) { return Object.assign({}, f); }),
    groupBy: state.groupBy,
    viewMode: state.viewMode,
    sortBy: state.sortBy,
    sortDir: state.sortDir,
    showSubtasks: state.showSubtasks,
    cardProperties: Object.assign({}, state.cardProperties),
  });
  state.activeViewId = v.id;
  state.scope = v.scope;
  state.layout = v.layout;
  closeSaveView();
  render();
}
function openManageViews() {
  var views = tkGetViews();
  els.tkManageList.innerHTML = views.map(function (v) {
    return '<div class="tk-manage-item" data-view-id="' + v.id + '"><div><span class="tk-manage-item-name">' + escapeHtml(v.name) + '</span>' + (v.builtin ? '<span class="tk-manage-item-builtin">内置</span>' : '') + '</div><div class="tk-manage-item-actions">'
      + (v.builtin ? '' : '<button data-rename-view="' + v.id + '" data-tooltip="重命名" aria-label="重命名"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>')
      + (v.builtin ? '' : '<button class="tk-manage-del" data-del-view="' + v.id + '" data-tooltip="删除" aria-label="删除"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>')
      + '</div></div>';
  }).join('');
  els.tkManageViewsOverlay.classList.remove('hidden');
  requestAnimationFrame(function () { els.tkManageViewsOverlay.classList.add('show'); });
}
function closeManageViews() {
  els.tkManageViewsOverlay.classList.remove('show');
  setTimeout(function () { els.tkManageViewsOverlay.classList.add('hidden'); }, 200);
}

/* ---------- 弹出菜单 ---------- */
var activePopover = null;
function showPopover(el, anchor) {
  hidePopover();
  var rect = anchor.getBoundingClientRect();
  el.style.top = (rect.bottom + window.scrollY + 4) + 'px';
  el.style.left = (rect.left + window.scrollX) + 'px';
  el.classList.add('show');
  activePopover = el;
}
function hidePopover() {
  if (activePopover) { activePopover.classList.remove('show'); activePopover = null; }
}

/* ---------- 拖拽 ---------- */
var dragTaskId = null;
function handleDragStart(e) {
  var card = e.target.closest('.tk-card');
  if (card) {
    dragTaskId = parseInt(card.getAttribute('data-task-id'), 10);
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }
}
function handleDragEnd(e) {
  var card = e.target.closest('.tk-card');
  if (card) card.classList.remove('dragging');
  $$('.tk-board-col-body').forEach(function (col) { col.classList.remove('drag-over'); });
  dragTaskId = null;
}
function handleDragOver(e) {
  if (dragTaskId !== null) {
    e.preventDefault();
    var col = e.target.closest('.tk-board-col-body');
    if (col) col.classList.add('drag-over');
  }
}
function handleDragLeave(e) {
  var col = e.target.closest('.tk-board-col-body');
  if (col) col.classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  var col = e.target.closest('.tk-board-col-body');
  if (!col || dragTaskId === null) return;
  col.classList.remove('drag-over');
  var boardCol = col.closest('.tk-board-col');
  var groupKey = boardCol.getAttribute('data-group-key');
  var patch = {};
  if (state.groupBy === 'status') patch.status = groupKey;
  else if (state.groupBy === 'priority') patch.priority = groupKey;
  else if (state.groupBy === 'assignee') patch.assignee = groupKey === 'unassigned' ? '' : groupKey;
  else if (state.groupBy === 'project') patch.project = groupKey === 'none' ? '' : groupKey;
  tkUpdateTask(dragTaskId, patch);
  render();
}

/* ---------- 事件绑定 ---------- */
function bindEvents() {
  /* 搜索 */
  els.tkSearch.addEventListener('input', function () { state.search = this.value; render(); });

  /* 布局切换 */
  $$('.tk-layout-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $$('.tk-layout-btn').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      state.layout = this.getAttribute('data-layout');
      if (state.viewMode === 'split' && state.layout === 'board') state.viewMode = 'slide';
      render();
    });
  });

  /* 连接第三方工具 */
  els.tkConnectBtn.addEventListener('click', function () {
    els.tkConnectOverlay.classList.remove('hidden');
    requestAnimationFrame(function () { els.tkConnectOverlay.classList.add('show'); });
  });
  function closeConnectOverlay() {
    els.tkConnectOverlay.classList.remove('show');
    setTimeout(function () { els.tkConnectOverlay.classList.add('hidden'); }, 200);
  }
  els.tkConnectClose.addEventListener('click', closeConnectOverlay);
  els.tkConnectCancel.addEventListener('click', closeConnectOverlay);
  els.tkConnectOverlay.addEventListener('click', function (e) {
    if (e.target === this) closeConnectOverlay();
    var btn = e.target.closest('.tk-connect-action');
    if (btn) {
      if (btn.textContent === '连接') { btn.textContent = '已连接'; btn.classList.add('connected'); }
      else { btn.textContent = '连接'; btn.classList.remove('connected'); }
    }
  });

  /* 显示设置 Popover */
  els.tkDisplayBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (els.tkDisplayPopover.classList.contains('hidden')) {
      closeFilterPanel();
      els.tkDisplayPopover.classList.remove('hidden');
      els.tkDisplayBtn.classList.add('active');
      els.tkDisplayBtn.setAttribute('aria-expanded', 'true');
      renderDisplayControls();
      positionPopover(els.tkDisplayPopover, els.tkDisplayBtn, true);
    } else {
      els.tkDisplayPopover.classList.add('hidden');
      els.tkDisplayBtn.classList.remove('active');
      els.tkDisplayBtn.setAttribute('aria-expanded', 'false');
    }
  });
  els.tkGroupSelect.addEventListener('change', function () {
    state.groupBy = this.value;
    render();
  });
  els.tkViewModeSelect.addEventListener('change', function () {
    state.viewMode = this.value;
    if (state.viewMode === 'split') state.layout = 'list';
    render();
  });
  els.tkSortSelect.addEventListener('change', function () {
    state.sortBy = this.value;
    state.sortDir = this.value === 'createDate' || this.value === 'priority' ? 'desc' : 'asc';
    renderDisplayControls();
    render();
  });
  els.tkSortDirection.addEventListener('click', function () {
    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    renderDisplayControls();
    render();
  });
  els.tkShowSubtasks.addEventListener('change', function () {
    state.showSubtasks = this.checked;
    render();
  });
  els.tkCardProperties.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-card-property]');
    if (!btn) return;
    var key = btn.getAttribute('data-card-property');
    state.cardProperties[key] = !state.cardProperties[key];
    renderDisplayControls();
    render();
  });
  els.tkDisplayPopover.addEventListener('click', function (e) { e.stopPropagation(); });
  document.addEventListener('click', function () {
    if (!els.tkDisplayPopover.classList.contains('hidden')) {
      els.tkDisplayPopover.classList.add('hidden');
      els.tkDisplayBtn.classList.remove('active');
      els.tkDisplayBtn.setAttribute('aria-expanded', 'false');
    }
  });

  /* 新建任务（列头 + 模态弹窗） */
  els.tkToolbarNew.addEventListener('click', function () { openTaskModal(null); });
  els.tkModalClose.addEventListener('click', closeTaskModal);
  els.tkModalCancel.addEventListener('click', closeTaskModal);
  els.tkModalSave.addEventListener('click', saveTask);
  els.tkModalOverlay.addEventListener('click', function (e) { if (e.target === this) closeTaskModal(); });

  /* 详情面板 */
  els.tkDrawerClose.addEventListener('click', closeDrawer);
  els.tkDrawerClickaway.addEventListener('click', closeDrawer);
  els.tkDrawerMore.addEventListener('click', function (e) {
    e.stopPropagation();
    var openMenu = document.querySelector('.tk-drawer-more-menu');
    if (openMenu) {
      openMenu.remove();
      this.setAttribute('aria-expanded', 'false');
    } else if (state.drawerTaskId) {
      showCardMenu(state.drawerTaskId, this, true);
      this.setAttribute('aria-expanded', 'true');
    }
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('.tk-drawer-more-menu') || e.target.closest('#tkDrawerMore')) return;
    document.querySelectorAll('.tk-drawer-more-menu').forEach(function (m) { m.remove(); });
    els.tkDrawerMore.setAttribute('aria-expanded', 'false');
  });
  els.tkDrawerResize.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || window.innerWidth <= 760 || state.viewMode !== 'slide') return;
    e.preventDefault();
    var handle = this;
    var pointerId = e.pointerId;
    var startX = e.clientX;
    var startWidth = els.tkDrawer.getBoundingClientRect().width;
    handle.setPointerCapture(pointerId);
    els.tkDrawer.classList.add('resizing');
    document.body.classList.add('tk-drawer-resizing');
    function move(ev) {
      if (ev.pointerId !== pointerId) return;
      setDrawerWidth(startWidth + startX - ev.clientX, false);
    }
    function end(ev) {
      if (ev.pointerId !== pointerId) return;
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      els.tkDrawer.classList.remove('resizing');
      document.body.classList.remove('tk-drawer-resizing');
      setDrawerWidth(els.tkDrawer.getBoundingClientRect().width, true);
    }
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  });
  els.tkDrawerResize.addEventListener('keydown', function (e) {
    if (window.innerWidth <= 760 || state.viewMode !== 'slide' || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    setDrawerWidth(els.tkDrawer.getBoundingClientRect().width + (e.key === 'ArrowLeft' ? 24 : -24), true);
  });
  window.addEventListener('resize', applyDrawerWidth);
  if (els.tkDrawerChat) {
    els.tkDrawerChat.addEventListener('click', function () {
      if (!state.drawerTaskId) return;
      openTaskConversationWithTask(state.drawerTaskId);
    });
  }
  if (els.tkDrawerSidebarToggle) {
    els.tkDrawerSidebarToggle.addEventListener('click', function () {
      var sb = els.tkDrawerBody.querySelector('.tk-drawer-sidebar');
      if (sb) sb.classList.toggle('hidden');
      els.tkDrawerSidebarToggle.classList.toggle('active');
    });
  }
  /* 评论 @ mention */
  els.tkDrawerBody.addEventListener('input', function (e) {
    if (!e.target.matches('textarea')) return;
    var ta = e.target;
    var pos = ta.selectionStart;
    var text = ta.value.substring(0, pos);
    var atPos = text.lastIndexOf('@');
    if (atPos < 0) { closeMentionPanel(); return; }
    if (atPos > 0 && text[atPos - 1] !== ' ' && text[atPos - 1] !== '\n') { closeMentionPanel(); return; }
    var query = text.substring(atPos + 1);
    if (/\s/.test(query)) { closeMentionPanel(); return; }
    createMentionPanel(ta, query);
  });
  els.tkDrawerBody.addEventListener('keydown', function (e) {
    if (!mentionPanel || !mentionPanel.classList.contains('show')) return;
    if (!e.target.matches('textarea')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      mentionIndex = Math.min(mentionIndex + 1, mentionItems.length - 1);
      mentionItems.forEach(function (item, i) { item.classList.toggle('active', i === mentionIndex); });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      mentionIndex = Math.max(mentionIndex - 1, 0);
      mentionItems.forEach(function (item, i) { item.classList.toggle('active', i === mentionIndex); });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (mentionItems[mentionIndex]) insertMention(e.target, mentionItems[mentionIndex].getAttribute('data-mention-name'));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeMentionPanel();
    }
  });

  /* 属性区折叠 */
  els.tkDrawerBody.addEventListener('click', function (e) {
    var toggle = e.target.closest('#tkDrawerPropToggle');
    if (toggle) {
      toggle.classList.toggle('collapsed');
      var list = els.tkDrawerBody.querySelector('#tkDrawerPropList');
      if (list) list.classList.toggle('collapsed');
      return;
    }
    /* 属性 Popover Picker（菜单添加到 body，避免侧边栏 overflow 裁切） */
    var display = e.target.closest('.tk-prop-display');
    if (display) {
      var propName = display.getAttribute('data-prop-name');
      var data = propPickerOptions[propName];
      var existing = document.querySelector('.tk-prop-menu.show');
      if (existing) {
        if (propName === '处理人' && e.target.closest('input')) return;
        existing.remove();
        if (propName === '处理人') return;
        return;
      }
      if (!data) return;
      var menu = document.createElement('div');
      menu.className = 'tk-prop-menu show';
      menu.setAttribute('data-prop', propName);
      menu.innerHTML = data.options.map(function (o) {
        return '<div class="tk-prop-menu-item' + (o.value === data.currentVal ? ' active' : '') + '" data-value="' + escapeHtml(o.value) + '">' + escapeHtml(o.label) + '</div>';
      }).join('');
      if (propName === '处理人') filterAssigneeOptions(menu, '.tk-prop-menu-item', '');
      menu.addEventListener('click', function (ev) {
        var item = ev.target.closest('.tk-prop-menu-item');
        if (item) {
          var prop = (propPickerOptions[menu.getAttribute('data-prop')] || {}).key;
          var val = item.getAttribute('data-value');
          if (state.drawerTaskId && prop && val) {
            tkUpdateTask(state.drawerTaskId, (function (p) { var o = {}; o[p] = val; return o; })(prop));
            render();
            openDrawer(state.drawerTaskId);
          }
          menu.remove();
        }
      });
      document.body.appendChild(menu);
      var rect = display.getBoundingClientRect();
      menu.style.top = (rect.bottom + 4) + 'px';
      menu.style.left = rect.left + 'px';
      if (propName === '处理人') {
        var propInput = display.querySelector('input');
        propInput.setAttribute('aria-expanded', 'true');
        if (e.target !== propInput) propInput.focus({ preventScroll: true });
      }
      return;
    }
    /* 三点菜单按钮 */
    var moreBtn = e.target.closest('[data-card-more]');
    if (moreBtn) { showCardMenu(moreBtn.getAttribute('data-card-more'), moreBtn); return; }
    /* 下拉菜单项 */
    var cardAct = e.target.closest('[data-card-action]');
    if (cardAct) {
      var aid = cardAct.getAttribute('data-card-task');
      var act = cardAct.getAttribute('data-card-action');
      if (act === 'chat') { openTaskConversationWithTask(parseInt(aid, 10)); } else if (act === 'edit') { openDrawer(aid); }
      else if (act === 'delete') { tkDeleteTask(aid); render(); }
      else if (act === 'copy') { var src = tkGetTasks().find(function(x){return x.id==aid;}); if (src) { var c = Object.assign({}, src, {id: Date.now(), code: 'T' + String(1000000 + Date.now() % 1000000)}); tkAddTask(c); render(); } }
      else if (act === 'subtask') { openTaskModal(null, parseInt(aid, 10)); document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();}); return; }
      document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();});
      return;
    }
    /* 状态胶囊按钮 */
    var flowPill = e.target.closest('[data-flow-status]');
    if (flowPill) {
      if (state.drawerTaskId) {
        tkUpdateTask(state.drawerTaskId, { status: flowPill.getAttribute('data-flow-status') });
        render();
        openDrawer(state.drawerTaskId);
      }
      return;
    }
    /* 处理人快捷选择：面板悬浮定位，不挤开内容 */
    var flowField = e.target.closest('[data-flow-prop]');
    if (flowField) {
      var existingFieldMenu = document.querySelector('.tk-flow-field-menu.show');
      if (existingFieldMenu) {
        if (e.target.closest('input')) return;
        existingFieldMenu.remove();
        return;
      }
      var fprop = flowField.getAttribute('data-flow-prop');
      var fopts = fprop === 'status' ? TK_STATUSES : TK_PEOPLE;
      var fieldMenu = document.createElement('div');
      fieldMenu.className = 'tk-flow-field-menu show';
      fopts.forEach(function (o) {
        var fieldItem = document.createElement('div');
        fieldItem.className = 'tk-flow-field-menu-item';
        if (fprop === 'assignee' && o.avatar) {
          fieldItem.innerHTML = '<span class="tk-avatar-sm" style="background:' + o.color + '">' + escapeHtml(o.avatar) + '</span><span>' + escapeHtml(o.name) + '</span>';
        } else {
          fieldItem.textContent = o.name;
        }
        fieldItem.addEventListener('click', function () {
          if (state.drawerTaskId) {
            if (fprop === 'assignee') {
              flowAssigneeDraft = { taskId: state.drawerTaskId, assigneeId: o.id };
              flowField.querySelector('.tk-flow-field-text').value = o.name;
              flowField.classList.remove('is-placeholder');
            } else {
              tkUpdateTask(state.drawerTaskId, (function (p) { var obj = {}; obj[p] = o.id; return obj; })(fprop));
              render();
              openDrawer(state.drawerTaskId);
            }
          }
          fieldMenu.remove();
          var fieldInput = flowField.querySelector('input');
          if (fieldInput) fieldInput.setAttribute('aria-expanded', 'false');
        });
        fieldMenu.appendChild(fieldItem);
      });
      if (fprop === 'assignee') filterAssigneeOptions(fieldMenu, '.tk-flow-field-menu-item', '');
      document.body.appendChild(fieldMenu);
      var fRect = flowField.getBoundingClientRect();
      fieldMenu.style.top = (fRect.bottom + 4) + 'px';
      fieldMenu.style.left = fRect.left + 'px';
      if (fprop === 'assignee') {
        var flowInput = flowField.querySelector('input');
        flowInput.setAttribute('aria-expanded', 'true');
        if (e.target !== flowInput) flowInput.focus({ preventScroll: true });
      }
      return;
    }
    /* 附件上传 */
    var dropzone = e.target.closest('#tkAttachDropzone');
    if (dropzone) {
      els.tkDrawerBody.querySelector('#tkAttachInput').click();
      return;
    }
    var attachRemove = e.target.closest('[data-attach-remove]');
    if (attachRemove) {
      attachRemove.closest('.tk-attach-item').remove();
      return;
    }
    /* 页签切换 */
    var drawerTab = e.target.closest('[data-tab]');
    if (drawerTab) {
      var tabName = drawerTab.getAttribute('data-tab');
      var tabContainer = drawerTab.parentElement;
      var contentContainer = tabContainer.parentElement;
      tabContainer.querySelectorAll('.tk-drawer-tab').forEach(function(t){t.classList.remove('active');});
      drawerTab.classList.add('active');
      contentContainer.querySelectorAll('.tk-drawer-tab-content').forEach(function(c){
        c.classList.toggle('active', c.getAttribute('data-tab-content') === tabName);
        c.hidden = c.getAttribute('data-tab-content') !== tabName;
      });
      return;
    }
    /* 流转按钮 */
    var flowBtn = e.target.closest('[data-action="flow"]');
    if (flowBtn) {
      if (state.drawerTaskId) {
        var flowTask = tkGetTasks().find(function (x) { return x.id === state.drawerTaskId; });
        if (flowTask) {
          if (!flowAssigneeDraft.assigneeId) {
            toast('请选择处理人', 'error');
            els.tkDrawerBody.querySelector('.tk-flow-field-text').focus();
            return;
          }
          var commentInput = els.tkDrawerBody.querySelector('.tk-drawer-comment-input textarea');
          var commentText = commentInput ? commentInput.value.trim() : '';
          var newComment = {
            authorId: TK_CURRENT_USER,
            createdAt: taskCommentTimestamp(),
            status: flowTask.status,
            assignee: flowAssigneeDraft.assigneeId,
            text: commentText,
          };
          tkUpdateTask(state.drawerTaskId, {
            assignee: flowAssigneeDraft.assigneeId,
            comments: (flowTask.comments || []).concat(newComment),
          });
          if (commentInput) commentInput.value = '';
          closeMentionPanel();
          flowAssigneeDraft = { taskId: state.drawerTaskId, assigneeId: '' };
          render();
          openDrawer(state.drawerTaskId);
          toast('流转成功', 'success');
        }
      }
      return;
    }
    /* 点击其他区域关闭属性菜单和处理人下拉 */
    var openMenu = document.querySelector('.tk-prop-menu.show');
    if (openMenu && !e.target.closest('.tk-prop-menu') && !e.target.closest('.tk-prop-display')) {
      openMenu.remove();
    }
    var ffm = document.querySelector('.tk-flow-field-menu.show');
    if (ffm && !e.target.closest('.tk-flow-field-menu') && !e.target.closest('[data-flow-prop]')) {
      ffm.remove();
    }
  });
  els.tkDrawerBody.addEventListener('input', function (e) {
    if (e.target.matches('.tk-prop-assignee-input')) {
      var propMenu = document.querySelector('.tk-prop-menu.show');
      if (!propMenu) { e.target.closest('.tk-prop-display').click(); propMenu = document.querySelector('.tk-prop-menu.show'); }
      filterAssigneeOptions(propMenu, '.tk-prop-menu-item', e.target.value);
    } else if (e.target.matches('.tk-flow-field-text')) {
      flowAssigneeDraft = { taskId: state.drawerTaskId, assigneeId: '' };
      var flowMenu = document.querySelector('.tk-flow-field-menu.show');
      if (!flowMenu) { e.target.closest('[data-flow-prop]').click(); flowMenu = document.querySelector('.tk-flow-field-menu.show'); }
      filterAssigneeOptions(flowMenu, '.tk-flow-field-menu-item', e.target.value);
    }
  });
  els.tkDrawerBody.addEventListener('keydown', function (e) {
    if (e.target.matches('.tk-prop-assignee-input')) chooseFirstAssignee(document.querySelector('.tk-prop-menu.show'), '.tk-prop-menu-item', e);
    if (e.target.matches('.tk-flow-field-text')) chooseFirstAssignee(document.querySelector('.tk-flow-field-menu.show'), '.tk-flow-field-menu-item', e);
  });
  els.tkDrawerBody.addEventListener('change', function (e) {
    if (!state.drawerTaskId) return;
    var sel = e.target.closest('[data-prop]');
    if (!sel) return;
    var prop = sel.getAttribute('data-prop');
    var patch = {}; patch[prop] = sel.value;
    tkUpdateTask(state.drawerTaskId, patch);
    render();
    openDrawer(state.drawerTaskId);
  });
  els.tkDrawerBody.addEventListener('blur', function (e) {
    if (!state.drawerTaskId) return;
    var el = e.target.closest('[data-field]');
    if (!el) return;
    var field = el.getAttribute('data-field');
    var val = el.textContent.trim();
    var t = tkGetTasks().find(function (x) { return x.id === state.drawerTaskId; });
    if (t && t[field] !== val) {
      var patch = {}; patch[field] = val;
      tkUpdateTask(state.drawerTaskId, patch);
      render();
      openDrawer(state.drawerTaskId);
    }
  }, true);

  /* 筛选面板 */
  els.tkFilterBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (els.tkFilterPanel.classList.contains('hidden')) openFilterPanel();
    else closeFilterPanel();
  });
  els.tkFilterPanel.addEventListener('click', function (e) { e.stopPropagation(); });
  els.tkFilterPanelBody.addEventListener('mouseover', function (e) {
    var btn = e.target.closest('[data-filter-section]');
    if (btn && btn.getAttribute('data-filter-section') !== activeFilterSection) {
      activeFilterSection = btn.getAttribute('data-filter-section');
      renderFilterMenu();
    }
  });
  els.tkFilterPanelBody.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-filter-section]');
    if (btn) { activeFilterSection = btn.getAttribute('data-filter-section'); renderFilterMenu(); return; }
    if (e.target.closest('#tkFilterReset')) {
      state.filters = []; updateFilterButton(); render(); renderFilterMenu();
    }
  });
  els.tkFilterSubmenu.addEventListener('click', function (e) {
    var option = e.target.closest('[data-filter-value]');
    if (option) { toggleFilterValue(activeFilterSection, option.getAttribute('data-filter-value')); return; }
    var dateBtn = e.target.closest('[data-filter-date]');
    if (dateBtn) {
      var op = dateBtn.getAttribute('data-filter-date');
      state.filters = state.filters.filter(function (f) { return f.field !== 'dueDate'; });
      state.filters.push({ field:'dueDate', op:op, value:'' });
      updateFilterButton(); render(); renderFilterMenu();
    }
  });
  els.tkFilterSubmenu.addEventListener('change', function (e) {
    if (e.target.id !== 'tkFilterDate') return;
    state.filters = state.filters.filter(function (f) { return f.field !== 'dueDate'; });
    if (e.target.value) state.filters.push({ field:'dueDate', op:'eq', value:e.target.value });
    updateFilterButton(); render(); renderFilterMenu();
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#tkFilterPanel') && !e.target.closest('#tkFilterBtn')) closeFilterPanel();
  });
  els.tkFilterChips.addEventListener('click', function (e) {
    var chipBtn = e.target.closest('[data-chip-idx]');
    if (chipBtn) {
      var idx = parseInt(chipBtn.getAttribute('data-chip-idx'), 10);
      state.filters.splice(idx, 1);
      updateFilterButton();
      render();
      return;
    }
    if (e.target.id === 'tkChipClearAll' || e.target.closest('#tkChipClearAll')) {
      state.filters = [];
      updateFilterButton();
      render();
    }
  });

  /* 列表表头排序 */
  els.tkListHead.addEventListener('click', function (e) {
    var th = e.target.closest('th[data-sort]');
    if (th) {
      var sortKey = th.getAttribute('data-sort');
      if (state.sortBy === sortKey) state.sortDir = state.sortDir === 'asc' ? 'desc' : state.sortDir === 'desc' ? 'none' : 'asc';
      else { state.sortBy = sortKey; state.sortDir = 'asc'; }
      render();
    }
  });

  /* 全选 */
  els.tkCheckAll.addEventListener('change', function () {
    var tasks = getFilteredTasks();
    if (this.checked) tasks.forEach(function (t) { state.selectedIds.add(t.id); });
    else tasks.forEach(function (t) { state.selectedIds.delete(t.id); });
    render();
  });

  /* 视图标签栏 */
  function closeViewMenu() {
    els.tkViewMenu.classList.add('hidden');
    els.tkViewAdd.setAttribute('aria-expanded', 'false');
  }
  els.tkViewAdd.addEventListener('click', function (e) {
    e.stopPropagation();
    var opening = els.tkViewMenu.classList.contains('hidden');
    els.tkViewMenu.classList.toggle('hidden', !opening);
    els.tkViewAdd.setAttribute('aria-expanded', String(opening));
    closeFilterPanel();
    els.tkDisplayPopover.classList.add('hidden');
    els.tkDisplayBtn.classList.remove('active');
    els.tkDisplayBtn.setAttribute('aria-expanded', 'false');
  });
  els.tkViewMenu.addEventListener('click', function (e) { e.stopPropagation(); });
  els.tkViewMenuNew.addEventListener('click', function () { closeViewMenu(); openSaveView(); });
  els.tkViewManage.addEventListener('click', function () { closeViewMenu(); openManageViews(); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.tk-view-action')) closeViewMenu(); });
  els.tkViewTabs.addEventListener('click', function (e) {
    var delBtn = e.target.closest('[data-del-view]');
    if (delBtn) {
      e.stopPropagation();
      var viewId = delBtn.getAttribute('data-del-view');
      tkDeleteView(viewId);
      if (state.activeViewId === viewId) { state.activeViewId = 'all'; state.scope = 'all'; }
      render();
      return;
    }
    var tab = e.target.closest('.tk-view-tab');
    if (tab) {
      var viewId = tab.getAttribute('data-view-id');
      state.activeViewId = viewId;
      var view = tkGetViews().find(function (v) { return v.id === viewId; });
      if (view && view.scope) {
        state.scope = view.scope;
      }
      if (view && !view.builtin) {
        state.filters = (view.filters || []).map(function (f) { return Object.assign({}, f); });
        state.groupBy = view.groupBy || 'status';
        state.viewMode = ['slide','full','split'].includes(view.viewMode) ? view.viewMode : 'slide';
        state.sortBy = view.sortBy || 'createDate';
        state.sortDir = view.sortDir || 'desc';
        state.layout = view.layout || 'board';
        state.showSubtasks = view.showSubtasks !== false;
        state.cardProperties = Object.assign({}, state.cardProperties, view.cardProperties || {});
        $$('[data-layout]', els.tkLayoutToggle).forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-layout') === state.layout); });
      }
      updateFilterButton();
      render();
    }
  });

  /* 保存视图弹窗 */
  els.tkSaveViewClose.addEventListener('click', closeSaveView);
  els.tkSaveViewCancel.addEventListener('click', closeSaveView);
  els.tkSaveViewConfirm.addEventListener('click', confirmSaveView);
  els.tkSaveViewOverlay.addEventListener('click', function (e) { if (e.target === this) closeSaveView(); });

  /* 管理视图弹窗 */
  els.tkManageViewsClose.addEventListener('click', closeManageViews);
  els.tkManageViewsCancel.addEventListener('click', closeManageViews);
  els.tkManageViewsOverlay.addEventListener('click', function (e) { if (e.target === this) closeManageViews(); });
  els.tkManageList.addEventListener('click', function (e) {
    var delBtn = e.target.closest('[data-del-view]');
    if (delBtn) {
      var viewId = delBtn.getAttribute('data-del-view');
      tkDeleteView(viewId);
      if (state.activeViewId === viewId) { state.activeViewId = 'all'; state.scope = 'all'; }
      openManageViews();
      render();
      return;
    }
    var renameBtn = e.target.closest('[data-rename-view]');
    if (renameBtn) {
      var viewId = renameBtn.getAttribute('data-rename-view');
      var view = tkGetViews().find(function (v) { return v.id === viewId; });
      if (view) {
        var newName = prompt('输入新名称', view.name);
        if (newName && newName.trim()) { tkRenameView(viewId, newName.trim()); openManageViews(); renderViewBar(); }
      }
    }
  });

  /* 批量操作 */
  els.tkBulkClear.addEventListener('click', function () { state.selectedIds.clear(); render(); });
  $$('[data-bulk]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var action = this.getAttribute('data-bulk');
      if (action === 'status') { showPopover(els.tkBulkStatusMenu, this); return; }
      if (action === 'assignee') { showPopover(els.tkBulkAssigneeMenu, this); return; }
      if (action === 'delete') {
        state.selectedIds.forEach(function (id) { tkDeleteTask(id); });
        state.selectedIds.clear();
        hidePopover();
        render();
      }
    });
  });
  els.tkBulkStatusMenu.addEventListener('click', function (e) {
    var item = e.target.closest('[data-status]');
    if (item) {
      var status = item.getAttribute('data-status');
      els.tkBulkStatusMenu.innerHTML = TK_STATUSES.map(function (s) {
        return '<div class="tk-popover-item" data-status="' + s.id + '">' + escapeHtml(s.name) + '</div>';
      }).join('');
      state.selectedIds.forEach(function (id) { tkUpdateTask(id, { status: status }); });
      hidePopover();
      render();
    }
  });
  els.tkBulkAssigneeMenu.addEventListener('click', function (e) {
    var item = e.target.closest('[data-assignee]');
    if (item) {
      var assignee = item.getAttribute('data-assignee');
      state.selectedIds.forEach(function (id) { tkUpdateTask(id, { assignee: assignee }); });
      hidePopover();
      render();
    }
  });

  /* 详情面板内：添加子任务 / 打开子任务 */
  els.tkDrawerBody.addEventListener('click', function (e) {
    var subToggle = e.target.closest('[data-subtask-toggle]');
    if (subToggle) {
      var subSection = subToggle.closest('.tk-subtasks');
      var subList = subSection.querySelector('.tk-subtask-list');
      var expanded = subToggle.getAttribute('aria-expanded') !== 'true';
      subtaskSectionExpanded.set(parseInt(subToggle.getAttribute('data-subtask-toggle'), 10), expanded);
      subToggle.setAttribute('aria-expanded', String(expanded));
      subSection.classList.toggle('is-collapsed', !expanded);
      subList.hidden = !expanded;
      return;
    }
    var addSubBtn = e.target.closest('[data-drawer-subtask]');
    if (addSubBtn) {
      var pid = parseInt(addSubBtn.getAttribute('data-drawer-subtask'), 10);
      openTaskModal(null, pid);
      return;
    }
    var openSub = e.target.closest('[data-subtask-open]');
    if (openSub) {
      var sid = parseInt(openSub.getAttribute('data-subtask-open'), 10);
      openDrawer(sid);
      return;
    }
  });

  /* 重置筛选 */
  els.tkResetFilter.addEventListener('click', function () {
    state.filters = []; state.search = ''; els.tkSearch.value = ''; updateFilterButton(); render();
  });

  /* 看板点击（列底新建 / 打开详情 / 多选 / 折叠子任务） */
  els.tkBoardScroll.addEventListener('click', function (e) {
    var toggleBtn = e.target.closest('[data-tk-toggle]');
    if (toggleBtn) {
      var tid = parseInt(toggleBtn.getAttribute('data-tk-toggle'), 10);
      var wasCollapsed = collapsedParents.has(tid);
      if (wasCollapsed) {
        collapsedParents.delete(tid);
        render();
        els.tkBoardScroll.classList.add('tk-just-expanded');
        setTimeout(function () { els.tkBoardScroll.classList.remove('tk-just-expanded'); }, 320);
      } else {
        var parentCard = toggleBtn.closest('.tk-card');
        if (parentCard) {
          var next = parentCard.nextElementSibling;
          while (next && next.classList.contains('tk-card--child')) {
            next.classList.add('tk-leaving');
            next = next.nextElementSibling;
          }
        }
        collapsedParents.add(tid);
        setTimeout(function () { render(); }, 260);
      }
      return;
    }
    var addBtn = e.target.closest('[data-add-group]');
    if (addBtn) {
      var groupKey = addBtn.getAttribute('data-add-group');
      openTaskModal(null);
      if (state.groupBy === 'status') els.tkFormStatus.value = groupKey;
      else if (state.groupBy === 'priority') els.tkFormPriority.value = groupKey;
      else if (state.groupBy === 'assignee' && groupKey !== 'unassigned') els.tkFormAssignee.value = groupKey;
      else if (state.groupBy === 'project' && groupKey !== 'none') els.tkFormProject.value = groupKey;
      return;
    }
    var moreBtnB = e.target.closest('[data-card-more]');
    if (moreBtnB) { showCardMenu(moreBtnB.getAttribute('data-card-more'), moreBtnB); return; }
    var cardAct = e.target.closest('[data-card-action]');
    if (cardAct) {
      var aid = cardAct.getAttribute('data-card-task');
      var act = cardAct.getAttribute('data-card-action');
      if (act === 'chat') { openTaskConversationWithTask(parseInt(aid, 10)); } else if (act === 'edit') { openDrawer(aid); }
      else if (act === 'delete') { tkDeleteTask(aid); render(); }
      else if (act === 'copy') { var src = tkGetTasks().find(function(x){return x.id==aid;}); if (src) { var c = Object.assign({}, src, {id: Date.now(), code: 'T' + String(1000000 + Date.now() % 1000000)}); tkAddTask(c); render(); } }
      else if (act === 'subtask') { openTaskModal(null, parseInt(aid, 10)); document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();}); return; }
      document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();});
      return;
    }
    document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();});
    var card = e.target.closest('.tk-card');
    if (card) {
      var id = parseInt(card.getAttribute('data-task-id'), 10);
      if (e.ctrlKey || e.metaKey) {
        if (state.selectedIds.has(id)) state.selectedIds.delete(id);
        else state.selectedIds.add(id);
        render();
      } else {
        openDrawer(id);
      }
    }
  });

  /* 看板拖拽 */
  els.tkBoardScroll.addEventListener('dragstart', handleDragStart);
  els.tkBoardScroll.addEventListener('dragend', handleDragEnd);
  els.tkBoardScroll.addEventListener('dragover', handleDragOver);
  els.tkBoardScroll.addEventListener('dragleave', handleDragLeave);
  els.tkBoardScroll.addEventListener('drop', handleDrop);

  /* 列表点击（折叠子任务 / 打开详情 / 多选） */
  els.tkListBody.addEventListener('click', function (e) {
    var toggleBtn = e.target.closest('[data-tk-toggle]');
    if (toggleBtn) {
      animateListSubtasks(toggleBtn);
      return;
    }
    var inlineCreateRow = e.target.closest('#tkRowCreate');
    if (inlineCreateRow && inlineCreateRow.querySelector('#tkInlineCreateBtn')) {
      if (state.viewMode === 'split') { openTaskModal(null); return; }
      inlineCreateRow.classList.add('is-editing');
      inlineCreateRow.innerHTML = '<td colspan="11"><div class="tk-inline-create-form"><input type="text" class="tk-inline-input" id="tkInlineTitle" placeholder="输入任务标题"><div class="tk-inline-dropdown" data-value="" id="tkInlineAssigneeWrap"><div class="tk-inline-select is-placeholder" id="tkInlineAssigneeBtn"><input type="text" id="tkInlineAssigneeInput" placeholder="处理人" aria-label="处理人" role="combobox" aria-expanded="false" autocomplete="off"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></div><div class="tk-inline-dropdown-menu" id="tkInlineAssigneeMenu" hidden>' + TK_PEOPLE.map(function(p){return '<div class="tk-inline-dropdown-item" data-assignee="'+p.id+'">'+p.name+'</div>';}).join('') + '</div></div><button class="tk-inline-save" id="tkInlineSave">确定</button><button class="tk-inline-cancel" id="tkInlineCancel">取消</button></div></td>';
      setTimeout(function(){ var i=els.tkListBody.querySelector('#tkInlineTitle'); if(i) i.focus(); },0);
      return;
    }
    var inlineSave = e.target.closest('#tkInlineSave');
    if (inlineSave) {
      saveInlineTask();
      return;
    }
    var inlineAssigneeBtn = e.target.closest('#tkInlineAssigneeBtn');
    if (inlineAssigneeBtn) {
      var amenu = els.tkListBody.querySelector('#tkInlineAssigneeMenu');
      if (amenu) {
        if (e.target.id !== 'tkInlineAssigneeInput') amenu.hidden = !amenu.hidden;
        else amenu.hidden = false;
        var quickInput = inlineAssigneeBtn.querySelector('input');
        quickInput.setAttribute('aria-expanded', String(!amenu.hidden));
        if (!amenu.hidden) {
          filterAssigneeOptions(amenu, '.tk-inline-dropdown-item', '');
          quickInput.focus({ preventScroll: true });
        }
      }
      return;
    }
    var inlineAssigneeItem = e.target.closest('[data-assignee]');
    if (inlineAssigneeItem) {
      var awrap = els.tkListBody.querySelector('#tkInlineAssigneeWrap');
      var abtn = els.tkListBody.querySelector('#tkInlineAssigneeBtn');
      var amnu = els.tkListBody.querySelector('#tkInlineAssigneeMenu');
      if (awrap) awrap.setAttribute('data-value', inlineAssigneeItem.getAttribute('data-assignee'));
      if (abtn) {
        abtn.querySelector('input').value = inlineAssigneeItem.textContent;
        abtn.classList.remove('is-placeholder');
        abtn.querySelector('input').setAttribute('aria-expanded', 'false');
      }
      if (amnu) amnu.hidden = true;
      if (abtn) abtn.querySelector('input').focus();
      return;
    }
    var inlineCancel = e.target.closest('#tkInlineCancel');
    if (inlineCancel) { render(); return; }
    if (inlineCreateRow) return;
    if (e.target.classList.contains('tk-row-check')) {
      var id = parseInt(e.target.getAttribute('data-task-id'), 10);
      if (e.target.checked) state.selectedIds.add(id);
      else state.selectedIds.delete(id);
      render();
      return;
    }
    var moreBtn2 = e.target.closest('[data-card-more]');
    if (moreBtn2) { showCardMenu(moreBtn2.getAttribute('data-card-more'), moreBtn2); return; }
    var cardAct2 = e.target.closest('[data-card-action]');
    if (cardAct2) {
      var aid2 = cardAct2.getAttribute('data-card-task');
      var act2 = cardAct2.getAttribute('data-card-action');
      if (act2 === 'chat') { openTaskConversationWithTask(parseInt(aid2, 10)); } else if (act2 === 'edit') { openDrawer(aid2); }
      else if (act2 === 'delete') { tkDeleteTask(aid2); render(); }
      else if (act2 === 'copy') { var src2 = tkGetTasks().find(function(x){return x.id==aid2;}); if (src2) { var c2 = Object.assign({}, src2, {id: Date.now(), code: 'T' + String(1000000 + Date.now() % 1000000)}); tkAddTask(c2); render(); } }
      else if (act2 === 'subtask') { openTaskModal(null, parseInt(aid2, 10)); document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();}); return; }
      document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();});
      return;
    }
    document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();});
    var row = e.target.closest('tr');
    if (row) {
      var id = parseInt(row.getAttribute('data-task-id'), 10);
      if (e.ctrlKey || e.metaKey) {
        if (state.selectedIds.has(id)) state.selectedIds.delete(id);
        else state.selectedIds.add(id);
        render();
      } else {
        openDrawer(id);
      }
    }
  });
  els.tkListBody.addEventListener('input', function (e) {
    if (e.target.id !== 'tkInlineAssigneeInput') return;
    var menu = els.tkListBody.querySelector('#tkInlineAssigneeMenu');
    var wrap = els.tkListBody.querySelector('#tkInlineAssigneeWrap');
    wrap.setAttribute('data-value', '');
    menu.hidden = false;
    e.target.setAttribute('aria-expanded', 'true');
    filterAssigneeOptions(menu, '.tk-inline-dropdown-item', e.target.value);
  });
  els.tkListBody.addEventListener('keydown', function (e) {
    if (e.target.id === 'tkInlineTitle' && e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      saveInlineTask();
    }
    if (e.target.id === 'tkInlineAssigneeInput') chooseFirstAssignee(els.tkListBody.querySelector('#tkInlineAssigneeMenu'), '.tk-inline-dropdown-item', e);
  });

  /* 看板列折叠 */
  els.tkBoardScroll.addEventListener('click', function (e) {
    var toggleBtn = e.target.closest('[data-toggle-col]');
    if (toggleBtn) {
      var body = toggleBtn.closest('.tk-board-col').querySelector('.tk-board-col-body');
      body.classList.toggle('collapsed');
      var toggleLabel = body.classList.contains('collapsed') ? '展开分组' : '折叠分组';
      toggleBtn.setAttribute('data-tooltip', toggleLabel);
      toggleBtn.setAttribute('aria-label', toggleLabel);
      var svg = toggleBtn.querySelector('svg');
      if (body.classList.contains('collapsed')) svg.innerHTML = '<polyline points="18 15 12 9 6 15"/>';
      else svg.innerHTML = '<polyline points="6 9 12 15 18 9"/>';
    }
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-clear-task-ref]')) {
      var tags = document.getElementById('ntTags');
      if (tags) { tags.innerHTML = ''; tags.classList.add('hidden'); }
    }
  });
  /* 点击外部关闭弹出菜单 */
  document.addEventListener('click', function (e) {
    hidePopover();
    var ffm = document.querySelector('.tk-flow-field-menu.show');
    if (ffm && !e.target.closest('.tk-flow-field-menu') && !e.target.closest('[data-flow-prop]')) {
      ffm.remove();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var hadOpen = false;
    if (!els.tkFilterPanel.classList.contains('hidden')) { closeFilterPanel(); hadOpen = true; }
    if (els.tkViewMenu && !els.tkViewMenu.classList.contains('hidden')) { closeViewMenu(); hadOpen = true; }
    if (!els.tkDisplayPopover.classList.contains('hidden')) {
      els.tkDisplayPopover.classList.add('hidden');
      els.tkDisplayBtn.classList.remove('active');
      els.tkDisplayBtn.setAttribute('aria-expanded', 'false');
      hadOpen = true;
    }
    var ffm = document.querySelector('.tk-flow-field-menu.show');
    if (ffm) { ffm.remove(); hadOpen = true; }
    if (!hadOpen && state.drawerTaskId && els.tkDrawer && els.tkDrawer.classList.contains('show')) {
      closeDrawer();
      e.preventDefault();
    }
  });
  /* 滚动与缩放时关闭悬浮菜单，避免定位错位 */
  window.addEventListener('scroll', function () {
    var ffm = document.querySelector('.tk-flow-field-menu.show');
    if (ffm) ffm.remove();
  }, true);
  window.addEventListener('resize', function () {
    var ffm = document.querySelector('.tk-flow-field-menu.show');
    if (ffm) ffm.remove();
  });
}

/* ---------- 列宽拖拽 ---------- */
var COL_WIDTHS_KEY = 'lingee_tasks_col_widths';
function loadColumnWidths() {
  try { return JSON.parse(localStorage.getItem(COL_WIDTHS_KEY) || '{}'); }
  catch (e) { return {}; }
}
function saveColumnWidths(widths) {
  try { localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(widths)); }
  catch (e) { /* 本地存储不可用时保留当前页面宽度 */ }
}
function initColumnResize() {
  if (!els.tkListHead) return;
  var saved = loadColumnWidths();
  els.tkListHead.querySelectorAll('th').forEach(function (th) {
    if (th.classList.contains('tk-col-check') || th.classList.contains('tk-col-actions')) return;
    if (th.querySelector('.tk-col-resize')) return; /* 已初始化 */
    var colKey = (th.className.match(/tk-col-(\w+)/) || [])[1];
    if (!colKey) return;
    if (saved[colKey]) th.style.width = saved[colKey] + 'px';
    var handle = document.createElement('div');
    handle.className = 'tk-col-resize';
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      var startX = e.clientX;
      var startWidth = th.getBoundingClientRect().width;
      var pointerId = e.pointerId;
      handle.setPointerCapture(pointerId);
      handle.classList.add('dragging');
      th.classList.add('resizing');
      document.body.classList.add('tk-col-resizing');
      function move(ev) {
        if (ev.pointerId !== pointerId) return;
        th.style.width = Math.max(50, Math.round(startWidth + (ev.clientX - startX))) + 'px';
      }
      function end(ev) {
        if (ev.pointerId !== pointerId) return;
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
        if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
        handle.classList.remove('dragging');
        th.classList.remove('resizing');
        document.body.classList.remove('tk-col-resizing');
        var w = loadColumnWidths();
        w[colKey] = Math.round(th.getBoundingClientRect().width);
        saveColumnWidths(w);
      }
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    });
    th.appendChild(handle);
  });
}

/* ---------- 初始化 ---------- */
export function initTasksV2() {
  cacheEls();
  restoreViewState();
  initColumnResize();
  try {
    var storedWidth = Number(localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY));
    if (Number.isFinite(storedWidth) && storedWidth >= 480) drawerPreferredWidth = storedWidth;
  } catch (e) { /* 本地存储不可用时使用默认宽度 */ }
  applyDrawerWidth();
  fillSelects();
  bindEvents();
  render();
}
