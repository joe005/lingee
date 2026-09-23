/* 任务管理 v2 —— 核心交互逻辑入口
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 initTasksV2() 函数里，
   由 main.js 按拆分前的原始顺序调用。 */

import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { showView, input } from '../../core/view.js';
import {
  TK_STATUSES, TK_PRIORITIES, TK_PEOPLE, TK_AGENTS, TK_PROJECTS, TK_LABELS,
  TK_VIEWS, TK_FILTER_FIELDS, TK_OPERATORS, TK_TASKS, TK_CURRENT_USER,
  tkGetTasks, tkSetTasks, tkAddTask, tkUpdateTask, tkDeleteTask,
  tkGetViews, tkAddView, tkDeleteView, tkRenameView,
  tkGetStatusName, tkGetPriorityName, tkGetPerson, tkGetProjectName,
  tkGetStatusObj, tkGetPriorityObj,
} from './data.js';

/* ---------- 状态 ---------- */
var state = {
  layout: 'board', scope: 'all', groupBy: 'status', sortBy: 'priority', sortDir: 'desc',
  search: '', filters: [], selectedIds: new Set(), activeViewId: 'all',
  editingTaskId: null, drawerTaskId: null,
};
var els = {};

/* ---------- 元素缓存 ---------- */
function cacheEls() {
  var ids = [
    'tkViewTabs','tkViewAdd','tkViewManage','tkViewOverflow','tkViewOverflowBtn','tkOverflowMenu',
    'tkSearch','tkFilterBtn','tkFilterPanel','tkFilterPanelBody','tkFilterAddRow','tkFilterApply',
    'tkFilterClear','tkFilterClose','tkFilterChips',
    'tkDisplayBtn','tkDisplayPopover','tkGroupSelect','tkSortSelect',
    'tkLayoutToggle','tkBoard','tkBoardScroll','tkList','tkListBody','tkListHead',
    'tkCheckAll','tkEmpty','tkResetFilter','tkBulkBar','tkBulkCount','tkBulkClear',
    'tkDrawerOverlay','tkDrawer','tkDrawerClose','tkDrawerCode','tkDrawerBody','tkDrawerMore','tkDrawerSidebarToggle','tkDrawerChat',
    'tkModalOverlay','tkModalClose','tkModalCancel','tkModalSave','tkModalTitle',
    'tkFormTitle','tkFormDesc','tkFormStatus','tkFormPriority','tkFormAssignee','tkFormProject','tkFormDue','tkFormLabels',
    'tkSaveViewOverlay','tkSaveViewClose','tkSaveViewCancel','tkSaveViewConfirm','tkSaveViewName',
    'tkManageViewsOverlay','tkManageViewsClose','tkManageViewsCancel','tkManageList',
    'tkBulkStatusMenu','tkBulkAssigneeMenu',
  ];
  ids.forEach(function (id) { els[id] = document.getElementById(id); });
}

/* ---------- 工具函数 ---------- */
function escapeHtml(s) {
  return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';
}
function priClass(p) { return 'tk-pri-' + (p || 'low'); }
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
  if (scope === 'mine') {
    tasks = tasks.filter(function (t) { return t.assignee === TK_CURRENT_USER; });
  } else if (scope === 'attention') {
    tasks = tasks.filter(function (t) {
      return t.status !== 'done' && (t.assignee === TK_CURRENT_USER || t.priority === 'urgent');
    });
  }
  if (state.search) {
    var q = state.search.toLowerCase();
    tasks = tasks.filter(function (t) {
      return t.title.toLowerCase().indexOf(q) >= 0 || t.code.toLowerCase().indexOf(q) >= 0 || (t.desc && t.desc.toLowerCase().indexOf(q) >= 0);
    });
  }
  state.filters.forEach(function (f) {
    tasks = tasks.filter(function (t) { return matchFilter(t, f); });
  });
  return tasks.slice().sort(function (a, b) {
    var va, vb;
    switch (state.sortBy) {
      case 'priority': va = priWeight(a.priority); vb = priWeight(b.priority); break;
      case 'dueDate': va = a.dueDate || '9999'; vb = b.dueDate || '9999'; break;
      case 'createDate': va = a.createDate || ''; vb = b.createDate || ''; break;
      case 'code': va = a.code; vb = b.code; break;
      case 'title': va = a.title; vb = b.title; break;
      default: va = 0; vb = 0;
    }
    return va < vb ? (state.sortDir === 'asc' ? -1 : 1) : va > vb ? (state.sortDir === 'asc' ? 1 : -1) : 0;
  });
}

function matchFilter(task, filter) {
  var field = filter.field, op = filter.op, val = filter.value;
  if (!val && op !== 'today' && op !== 'overdue') return true;
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
      + (v.builtin ? '' : '<span class="tk-tab-del" data-del-view="' + v.id + '"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>')
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
    var cards = g.tasks.map(function (t) { return renderCard(t); }).join('');
    return '<div class="tk-board-col" data-group-key="' + g.key + '">'
      + '<div class="tk-board-col-head"><div class="tk-board-col-head-left">'
      + '<span class="tk-board-col-dot tk-st-' + (g.color || 'gray') + '"></span>'
      + '<span class="tk-board-col-name">' + escapeHtml(g.name) + '</span>'
      + '<span class="tk-board-col-count">' + g.tasks.length + '</span>'
      + '</div><div class="tk-board-col-head-right">'
      + '<button class="tk-board-col-add" data-add-group="' + g.key + '" title="新建任务"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>'
      + '<button class="tk-board-col-toggle" data-toggle-col><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>'
      + '</div></div>'
      + '<div class="tk-board-col-body">' + cards + '</div>'
      + '</div>';
  }).join('');
  els.tkBoardScroll.innerHTML = html;
}

function renderCard(t) {
  var pri = tkGetPriorityObj(t.priority);
  tkGetPerson(t.assignee);
  var overdue = isOverdue(t.dueDate) && t.status !== 'done';
  var labels = (t.labels || []).map(function (l) { return '<span class="tk-card-label">' + escapeHtml(l) + '</span>'; }).join('');
  var sel = state.selectedIds.has(t.id) ? ' selected' : '';
  return '<div class="tk-card' + sel + '" draggable="true" data-task-id="' + t.id + '">'
    + '<button class="tk-card-more" data-card-menu="' + t.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>'
    + '<div class="tk-card-code">' + escapeHtml(t.code) + '</div>'
    + '<div class="tk-card-title">' + escapeHtml(t.title) + '</div>'
    + (labels ? '<div class="tk-card-labels">' + labels + '</div>' : '')
    + '<div class="tk-card-foot"><div class="tk-card-foot-left">'
    + '<span class="tk-card-priority ' + priClass(t.priority) + '">' + escapeHtml(pri.name) + '</span>'
    + (t.dueDate ? '<span class="tk-card-due' + (overdue ? ' overdue' : '') + '"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + fmtDate(t.dueDate) + '</span>' : '')
    + '</div>' + avatar(t.assignee) + '</div></div>';
}

/* ---------- 渲染：列表 ---------- */
function renderList() {
  var tasks = getFilteredTasks();
  if (tasks.length === 0) { showEmpty(); return; }
  showBoardOrList();
  var html = tasks.map(function (t) {
    var pri = tkGetPriorityObj(t.priority);
    var st = tkGetStatusObj(t.status);
    var person = tkGetPerson(t.assignee);
    var overdue = isOverdue(t.dueDate) && t.status !== 'done';
    var sel = state.selectedIds.has(t.id) ? ' selected' : '';
    return '<tr class="tk-row' + sel + '" data-task-id="' + t.id + '">'
      + '<td class="tk-col-check"><input type="checkbox" class="tk-row-check" data-task-id="' + t.id + '"' + (state.selectedIds.has(t.id) ? ' checked' : '') + '></td>'
      + '<td class="tk-col-code"><span class="tk-row-code">' + escapeHtml(t.code) + '</span></td>'
      + '<td class="tk-col-title">' + escapeHtml(t.title) + '</td>'
      + '<td class="tk-col-status"><span class="tk-row-status"><span class="tk-st-dot ' + stClass(t.status) + '"></span>' + escapeHtml(st.name) + '</span></td>'
      + '<td class="tk-col-priority"><span class="tk-row-priority ' + priClass(t.priority) + '">' + escapeHtml(pri.name) + '</span></td>'
      + '<td class="tk-col-assignee"><div class="tk-row-assignee">' + avatarSm(t.assignee) + '<span>' + escapeHtml(person.name) + '</span></div></td>'
      + '<td class="tk-col-project">' + escapeHtml(tkGetProjectName(t.project)) + '</td>'
      + '<td class="tk-col-due"><span class="tk-row-due' + (overdue ? ' overdue' : '') + '">' + (t.dueDate ? fmtDate(t.dueDate) : '—') + '</span></td>'
      + '<td class="tk-col-created">' + fmtDate(t.createDate) + '</td>'
      + '<td class="tk-col-actions"><button class="tk-card-more" data-card-menu="' + t.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button></td></tr>';
  }).join('');
  els.tkListBody.innerHTML = '<tr class="tk-row-create" id="tkRowCreate"><td colspan="10"><button class="tk-inline-create-btn" id="tkInlineCreateBtn">+ 新建</button></td></tr>' + html;
  updateSortArrows();
}

function updateSortArrows() {
  $$('#tkListHead th[data-sort]').forEach(function (th) {
    th.classList.remove('sorted');
    var arrow = th.querySelector('.tk-sort-arrow');
    if (arrow) arrow.remove();
    if (th.getAttribute('data-sort') === state.sortBy) {
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
    var fieldName = fieldDef ? fieldDef.name : f.field;
    var ops = TK_OPERATORS[fieldDef ? fieldDef.type : 'text'] || [];
    var opDef = ops.find(function (o) { return o.value === f.op; });
    var opLabel = opDef ? opDef.label : f.op;
    var val = f.value;
    if (fieldDef && fieldDef.type === 'select') {
      var opt = fieldDef.options.find(function (o) { return o.value === f.value; });
      val = opt ? opt.label : f.value;
    }
    return '<span class="tk-chip"><span class="tk-chip-field">' + escapeHtml(fieldName) + '</span><span class="tk-chip-op">' + escapeHtml(opLabel) + '</span><span class="tk-chip-val">' + escapeHtml(val) + '</span><button class="tk-chip-remove" data-chip-idx="' + i + '"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></span>';
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
  renderViewBar();
  if (state.layout === 'board') renderBoard(); else renderList();
  renderFilterChips(); updateBulkBar(); updateCheckAll();
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
function openTaskModal(taskId) {
  state.editingTaskId = null;
  els.tkModalTitle.textContent = '新建任务';
  els.tkFormTitle.value = '';
  els.tkFormDesc.value = '';
  els.tkFormStatus.value = 'backlog';
  els.tkFormPriority.value = 'medium';
  els.tkFormAssignee.value = TK_CURRENT_USER;
  els.tkFormProject.value = TK_PROJECTS[0].id;
  els.tkFormDue.value = '';
  els.tkFormLabels.value = '';
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
  var labels = els.tkFormLabels.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var data = {
    title: title, desc: els.tkFormDesc.value.trim(),
    status: els.tkFormStatus.value, priority: els.tkFormPriority.value,
    assignee: els.tkFormAssignee.value, project: els.tkFormProject.value,
    dueDate: els.tkFormDue.value, labels: labels,
  };
  if (state.editingTaskId) { tkUpdateTask(state.editingTaskId, data); }
  else { data.createDate = '2026-09-23'; tkAddTask(data); }
  closeTaskModal();
  render();
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
function propPicker(name, currentVal, options, isDate) {
  var display = isDate ? (currentVal || '—') : (options.find(function (o) { return o.value === currentVal; }) || {}).label || '—';
  var opts = isDate
    ? '<input type="date" class="tk-prop-edit" data-prop="' + name + '" value="' + escapeHtml(currentVal || '') + '">'
    : '<div class="tk-prop-menu" data-prop="' + name + '">' + options.map(function (o) {
      return '<div class="tk-prop-menu-item' + (o.value === currentVal ? ' active' : '') + '" data-value="' + escapeHtml(o.value) + '">' + escapeHtml(o.label) + '</div>';
    }).join('') + '</div>';
  return '<div class="tk-prop-row"><span>' + name + '</span><div class="tk-prop-display" data-prop-name="' + name + '">' + escapeHtml(display) + '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>' + opts + '</div>';
}
function openDrawer(taskId) {
  var t = tkGetTasks().find(function (x) { return x.id === taskId; });
  if (!t) return;
  state.drawerTaskId = taskId;
  var person = tkGetPerson(t.assignee);
  var labelsHtml = (t.labels || []).map(function (l) {
    return '<span class="tk-drawer-label">' + escapeHtml(l) + '</span>';
  }).join('');
  var statusOpts = TK_STATUSES.map(function (s) { return { value: s.id, label: s.name }; });
  var priOpts = TK_PRIORITIES.map(function (p) { return { value: p.id, label: p.name }; });
  var peopleOpts = TK_PEOPLE.map(function (p) { return { value: p.id, label: p.name }; });
  var projOpts = TK_PROJECTS.map(function (p) { return { value: p.id, label: p.name }; });
  els.tkDrawerCode.textContent = t.code;
  els.tkDrawerBody.innerHTML =
    '<div class="tk-drawer-main"><div class="tk-drawer-main-inner">' +
      '<div class="tk-drawer-breadcrumb"><span>' + escapeHtml(tkGetProjectName(t.project)) + '</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg><span>' + escapeHtml(t.code) + '</span></div>' +
      '<h3 class="tk-drawer-title" contenteditable="true" data-field="title">' + escapeHtml(t.title) + '</h3>' +
      '<div class="tk-drawer-tabs">' +
        '<button type="button" class="tk-drawer-tab active" data-tab="info">基础信息</button>' +
        '<button type="button" class="tk-drawer-tab" data-tab="artifacts">产物</button>' +
        '<button type="button" class="tk-drawer-tab" data-tab="changelog">变更日志</button>' +
      '</div>' +
      '<div class="tk-drawer-tab-content active" data-tab-content="info">' +
        '<div class="tk-drawer-desc" contenteditable="true" data-field="desc">' + escapeHtml(t.desc || '点击添加描述…') + '</div>' +
        '<div class="tk-drawer-attachments">' +
          '<div class="tk-attach-dropzone" id="tkAttachDropzone">' +
            '<input type="file" id="tkAttachInput" multiple style="display:none">' +
            '<svg class="tk-attach-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>' +
          '</div>' +
          '<div class="tk-attach-list" id="tkAttachList"></div>' +
        '</div>' +
        '<div class="tk-drawer-comments"><div class="tk-drawer-comments-title">评论</div>' +
          '<div class="tk-drawer-comment"><div class="tk-drawer-comment-head"><span class="tk-drawer-comment-author">Alice</span><span class="tk-drawer-comment-time">2 天前</span></div><div class="tk-drawer-comment-text">接口定义已确认，可以开始联调。</div></div>' +
          '<div class="tk-drawer-flow-fields">' +
            '<div class="tk-flow-field"><span class="tk-flow-field-label">状态</span><div class="tk-flow-pills">' +
              TK_STATUSES.map(function(s) { return '<button type="button" class="tk-flow-pill' + (s.id === t.status ? ' active' : '') + '" data-flow-status="' + s.id + '">' + s.name + '</button>'; }).join('') +
            '</div></div>' +
            '<div class="tk-flow-field"><span class="tk-flow-field-label">处理人</span><div class="tk-flow-field-value tk-flow-field-lg" data-flow-prop="assignee">' + escapeHtml(person.name) + '</div></div>' +
          '</div>' +
          '<div class="tk-drawer-comment-input"><textarea placeholder="输入评论… 使用 @ 提及人员"></textarea></div>' +
          '<button class="tk-drawer-flow-btn" data-action="flow">流转</button>' +
        '</div>' +
      '</div>' +
      '<div class="tk-drawer-tab-content" data-tab-content="artifacts" hidden>' +
        '<div class="tk-drawer-empty-tab">暂无产物</div>' +
      '</div>' +
      '<div class="tk-drawer-tab-content" data-tab-content="changelog" hidden>' +
        '<div class="tk-drawer-changelog-list">' +
          '<div class="tk-drawer-changelog-item"><span class="tk-drawer-changelog-time">2026-09-23</span><span class="tk-drawer-changelog-user">Alice</span>创建了任务</div>' +
          '<div class="tk-drawer-changelog-item"><span class="tk-drawer-changelog-time">2026-09-23</span><span class="tk-drawer-changelog-user">Alice</span>状态变更为「待处理」</div>' +
        '</div>' +
      '</div>' +
    '</div></div>' +
    '<div class="tk-drawer-sidebar" id="tkDrawerSidebar">' +
      '<div class="tk-drawer-prop-list" id="tkDrawerPropList">' +
        propPicker('状态', t.status, statusOpts) +
        propPicker('执行人', t.assignee, peopleOpts) +
        propPicker('项目', t.project, projOpts) +
        propPicker('优先级', t.priority, priOpts) +
        propPicker('截止日期', t.dueDate, null, true) +
        (labelsHtml ? '<div class="tk-prop-row"><span>标签</span><div class="tk-drawer-labels">' + labelsHtml + '</div></div>' : '') +
        '<button class="tk-prop-add">+ 添加属性</button>' +
      '</div>' +
      '<div class="tk-prop-row"><span>创建者</span><span class="tk-prop-val">' + escapeHtml(person.name) + '</span></div>' +
      '<div class="tk-prop-row"><span>创建时间</span><span class="tk-prop-val">' + escapeHtml(t.createDate) + '</span></div>' +
      '<div class="tk-prop-row"><span>更新时间</span><span class="tk-prop-val">' + escapeHtml(t.createDate) + '</span></div>' +
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
        item.innerHTML = '<span class="tk-attach-item-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span><span class="tk-attach-item-name">' + escapeHtml(f.name) + '</span>' + (sz ? '<span class="tk-attach-item-size">' + sz + '</span>' : '') + '<button class="tk-attach-item-btn" title="预览"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="tk-attach-item-btn" title="下载"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button><button class="tk-attach-item-btn tk-attach-item-remove" data-attach-remove title="删除"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
        al.appendChild(item);
      });
    }
    fi.onchange = function() { renderFiles(fi.files); fi.value=''; };
    dz.ondragover = function(e) { e.preventDefault(); dz.classList.add('dragover'); };
    dz.ondragleave = function() { dz.classList.remove('dragover'); };
    dz.ondrop = function(e) { e.preventDefault(); dz.classList.remove('dragover'); renderFiles(e.dataTransfer.files); };
  })();
  els.tkDrawerOverlay.classList.remove('hidden');
  els.tkDrawer.classList.remove('hidden');
  requestAnimationFrame(function () {
    els.tkDrawerOverlay.classList.add('show');
    els.tkDrawer.classList.add('show');
  });
}
function closeDrawer() {
  els.tkDrawerOverlay.classList.remove('show');
  els.tkDrawer.classList.remove('show');
  setTimeout(function () {
    els.tkDrawerOverlay.classList.add('hidden');
    els.tkDrawer.classList.add('hidden');
  }, 250);
  state.drawerTaskId = null;
}

/* ---------- 筛选面板 ---------- */
function openFilterPanel() {
  els.tkFilterPanel.classList.remove('hidden');
  els.tkFilterBtn.classList.add('active');
  var rect = els.tkFilterBtn.getBoundingClientRect();
  els.tkFilterPanel.style.top = (rect.bottom + window.scrollY + 4) + 'px';
  els.tkFilterPanel.style.left = (rect.left + window.scrollX) + 'px';
  if (state.filters.length === 0) addFilterRow();
  else renderFilterRows();
}
function closeFilterPanel() {
  els.tkFilterPanel.classList.add('hidden');
  els.tkFilterBtn.classList.remove('active');
}
function addFilterRow() {
  state.filters.push({ field: 'status', op: 'eq', value: '' });
  renderFilterRows();
}
function renderFilterRows() {
  els.tkFilterPanelBody.innerHTML = state.filters.map(function (f, i) {
    var fieldDef = TK_FILTER_FIELDS.find(function (fd) { return fd.id === f.field; });
    var ops = TK_OPERATORS[fieldDef ? fieldDef.type : 'text'] || [];
    var valHtml = '';
    if (fieldDef && fieldDef.type === 'select') {
      valHtml = '<select class="tk-filter-val">' + fieldDef.options.map(function (o) {
        return '<option value="' + o.value + '"' + (o.value === f.value ? ' selected' : '') + '>' + escapeHtml(o.label) + '</option>';
      }).join('') + '</select>';
    } else if (fieldDef && fieldDef.type === 'date') {
      valHtml = '<input type="date" class="tk-filter-val" value="' + escapeHtml(f.value) + '">';
    } else {
      valHtml = '<input type="text" class="tk-filter-val" placeholder="输入关键词" value="' + escapeHtml(f.value) + '">';
    }
    if (f.op === 'today' || f.op === 'overdue') {
      valHtml = '<input type="text" class="tk-filter-val" disabled placeholder="无需输入">';
    }
    return '<div class="tk-filter-row" data-row="' + i + '">'
      + '<select class="tk-filter-field">' + TK_FILTER_FIELDS.map(function (fd) {
        return '<option value="' + fd.id + '"' + (fd.id === f.field ? ' selected' : '') + '>' + escapeHtml(fd.name) + '</option>';
      }).join('') + '</select>'
      + '<select class="tk-filter-op">' + ops.map(function (o) {
        return '<option value="' + o.value + '"' + (o.value === f.op ? ' selected' : '') + '>' + escapeHtml(o.label) + '</option>';
      }).join('') + '</select>'
      + valHtml
      + '<button class="tk-filter-remove" data-remove-row="' + i + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'
      + '</div>';
  }).join('');
}
function collectFilterRows() {
  var rows = $$('.tk-filter-row', els.tkFilterPanelBody);
  var filters = [];
  rows.forEach(function (row) {
    var fieldEl = row.querySelector('.tk-filter-field');
    var opEl = row.querySelector('.tk-filter-op');
    var valEl = row.querySelector('.tk-filter-val');
    filters.push({
      field: fieldEl ? fieldEl.value : 'status',
      op: opEl ? opEl.value : 'eq',
      value: valEl && !valEl.disabled ? valEl.value : '',
    });
  });
  state.filters = filters;
}

/* ---------- 视图管理 ---------- */
function openSaveView() {
  els.tkSaveViewName.value = '';
  els.tkSaveViewOverlay.classList.remove('hidden');
  requestAnimationFrame(function () { els.tkSaveViewOverlay.classList.add('show'); });
}
function closeSaveView() {
  els.tkSaveViewOverlay.classList.remove('show');
  setTimeout(function () { els.tkSaveViewOverlay.classList.add('hidden'); }, 200);
}
function confirmSaveView() {
  var name = els.tkSaveViewName.value.trim();
  if (!name) { els.tkSaveViewName.focus(); return; }
  var v = tkAddView(name);
  state.activeViewId = v.id;
  closeSaveView();
  renderViewBar();
}
function openManageViews() {
  var views = tkGetViews();
  els.tkManageList.innerHTML = views.map(function (v) {
    return '<div class="tk-manage-item" data-view-id="' + v.id + '"><div><span class="tk-manage-item-name">' + escapeHtml(v.name) + '</span>' + (v.builtin ? '<span class="tk-manage-item-builtin">内置</span>' : '') + '</div><div class="tk-manage-item-actions">'
      + (v.builtin ? '' : '<button data-rename-view="' + v.id + '" title="重命名"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>')
      + (v.builtin ? '' : '<button class="tk-manage-del" data-del-view="' + v.id + '" title="删除"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>')
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
      render();
    });
  });

  /* 显示设置 Popover */
  els.tkDisplayBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (els.tkDisplayPopover.classList.contains('hidden')) {
      els.tkDisplayPopover.classList.remove('hidden');
      els.tkDisplayBtn.classList.add('active');
      els.tkGroupSelect.value = state.groupBy;
      els.tkSortSelect.value = state.sortBy;
      var rect = els.tkDisplayBtn.getBoundingClientRect();
      els.tkDisplayPopover.style.top = (rect.bottom + window.scrollY + 4) + 'px';
      els.tkDisplayPopover.style.left = (rect.right + window.scrollX - 200) + 'px';
    } else {
      els.tkDisplayPopover.classList.add('hidden');
      els.tkDisplayBtn.classList.remove('active');
    }
  });
  els.tkGroupSelect.addEventListener('change', function () {
    state.groupBy = this.value;
    render();
  });
  els.tkSortSelect.addEventListener('change', function () {
    state.sortBy = this.value;
    render();
  });
  els.tkDisplayPopover.addEventListener('click', function (e) { e.stopPropagation(); });
  document.addEventListener('click', function () {
    if (!els.tkDisplayPopover.classList.contains('hidden')) {
      els.tkDisplayPopover.classList.add('hidden');
      els.tkDisplayBtn.classList.remove('active');
    }
  });

  /* 新建任务（列头 + 模态弹窗） */
  els.tkModalClose.addEventListener('click', closeTaskModal);
  els.tkModalCancel.addEventListener('click', closeTaskModal);
  els.tkModalSave.addEventListener('click', saveTask);
  els.tkModalOverlay.addEventListener('click', function (e) { if (e.target === this) closeTaskModal(); });

  /* 详情面板 */
  els.tkDrawerClose.addEventListener('click', closeDrawer);
  els.tkDrawerOverlay.addEventListener('click', closeDrawer);
  if (els.tkDrawerChat) {
    els.tkDrawerChat.addEventListener('click', function () {
      if (!state.drawerTaskId) return;
      var t = tkGetTasks().find(function (x) { return x.id === state.drawerTaskId; });
      if (!t) return;
      closeDrawer();
      showView('newtask');
      var tags = document.getElementById('ntTags');
      if (tags) {
        tags.innerHTML = '<span class="ctag"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><span class="ctag-label">' + escapeHtml(t.code) + ' ' + escapeHtml(t.title) + '</span><button type="button" class="ctag-x" data-clear-task-ref aria-label="移除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></span>';
        tags.classList.remove('hidden');
      }
      input.focus();
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
    /* 属性 Popover Picker */
    var display = e.target.closest('.tk-prop-display');
    if (display) {
      var row = display.closest('.tk-prop-row');
      var menu = row.querySelector('.tk-prop-menu');
      if (menu) {
        els.tkDrawerBody.querySelectorAll('.tk-prop-menu.show').forEach(function (m) { if (m !== menu) m.classList.remove('show'); });
        menu.classList.toggle('show');
      }
      return;
    }
    var item = e.target.closest('.tk-prop-menu-item');
    if (item) {
      var menu = item.closest('.tk-prop-menu');
      var prop = menu.getAttribute('data-prop');
      var val = item.getAttribute('data-value');
      if (state.drawerTaskId && prop && val) {
        tkUpdateTask(state.drawerTaskId, (function (p) { var o = {}; o[p] = val; return o; })(prop));
        render();
        openDrawer(state.drawerTaskId);
      }
      menu.classList.remove('show');
      return;
    }
    /* 卡片三个点菜单 */
    var cardMenuBtn = e.target.closest('[data-card-menu]');
    if (cardMenuBtn) {
      var exist = cardMenuBtn.parentElement.querySelector('.tk-card-menu');
      if (exist) { exist.remove(); return; }
      document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();});
      var cid = cardMenuBtn.getAttribute('data-card-menu');
      var m = document.createElement('div');
      m.className = 'tk-card-menu';
      m.innerHTML = '<div class="tk-card-menu-item" data-card-action="edit" data-card-task="'+cid+'">编辑</div><div class="tk-card-menu-item" data-card-action="copy" data-card-task="'+cid+'">复制</div><div class="tk-card-menu-item danger" data-card-action="delete" data-card-task="'+cid+'">删除</div>';
      cardMenuBtn.parentElement.appendChild(m);
      return;
    }
    var cardAct = e.target.closest('[data-card-action]');
    if (cardAct) {
      var aid = cardAct.getAttribute('data-card-task');
      var act = cardAct.getAttribute('data-card-action');
      if (act === 'edit') { openDrawer(aid); }
      else if (act === 'delete') { tkDeleteTask(aid); render(); }
      else if (act === 'copy') { var src = tkGetTasks().find(function(x){return x.id==aid;}); if (src) { var c = Object.assign({}, src, {id: Date.now(), code: 'TSK-' + String(Date.now()).slice(-3)}); tkAddTask(c); render(); } }
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
    /* 处理人快捷选择 */
    var flowField = e.target.closest('[data-flow-prop]');
    if (flowField) {
      var existingFieldMenu = flowField.parentElement.querySelector('.tk-flow-field-menu');
      if (existingFieldMenu) { existingFieldMenu.remove(); return; }
      var fprop = flowField.getAttribute('data-flow-prop');
      var fopts = fprop === 'status' ? TK_STATUSES : TK_PEOPLE;
      var fieldMenu = document.createElement('div');
      fieldMenu.className = 'tk-flow-field-menu';
      fopts.forEach(function (o) {
        var fieldItem = document.createElement('div');
        fieldItem.className = 'tk-flow-field-menu-item';
        fieldItem.textContent = o.name;
        fieldItem.addEventListener('click', function () {
          if (state.drawerTaskId) {
            tkUpdateTask(state.drawerTaskId, (function (p) { var obj = {}; obj[p] = o.id; return obj; })(fprop));
            render();
            openDrawer(state.drawerTaskId);
          }
          fieldMenu.remove();
        });
        fieldMenu.appendChild(fieldItem);
      });
      flowField.parentElement.appendChild(fieldMenu);
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
          var flowStatusName = tkGetStatusObj(flowTask.status).name;
          var flowAssigneeName = tkGetPerson(flowTask.assignee).name;
          toast('流转成功：状态「' + flowStatusName + '」，处理人「' + flowAssigneeName + '」', 'success');
        }
      }
      return;
    }
    /* 点击其他区域关闭属性菜单 */
    var openMenu = els.tkDrawerBody.querySelector('.tk-prop-menu.show');
    if (openMenu && !e.target.closest('.tk-prop-menu') && !e.target.closest('.tk-prop-display')) {
      openMenu.classList.remove('show');
    }
  });
  els.tkDrawerBody.addEventListener('change', function (e) {
    if (!state.drawerTaskId) return;
    var sel = e.target.closest('[data-prop]');
    if (!sel) return;
    var prop = sel.getAttribute('data-prop');
    var patch = {}; patch[prop] = sel.value;
    tkUpdateTask(state.drawerTaskId, patch);
    render();
  });
  els.tkDrawerBody.addEventListener('blur', function (e) {
    if (!state.drawerTaskId) return;
    var el = e.target.closest('[data-field]');
    if (!el) return;
    var field = el.getAttribute('data-field');
    var val = el.textContent.trim();
    var t = tkGetTasks().find(function (x) { return x.id === state.drawerTaskId; });
    if (t && t[field] !== val) { t[field] = val; render(); }
  }, true);

  /* 筛选面板 */
  els.tkFilterBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (els.tkFilterPanel.classList.contains('hidden')) openFilterPanel();
    else closeFilterPanel();
  });
  els.tkFilterClose.addEventListener('click', closeFilterPanel);
  els.tkFilterAddRow.addEventListener('click', addFilterRow);
  els.tkFilterApply.addEventListener('click', function () { collectFilterRows(); render(); closeFilterPanel(); });
  els.tkFilterClear.addEventListener('click', function () { state.filters = []; renderFilterRows(); render(); });
  els.tkFilterPanelBody.addEventListener('change', function (e) {
    var row = e.target.closest('.tk-filter-row');
    if (row) {
      var idx = parseInt(row.getAttribute('data-row'), 10);
      if (e.target.classList.contains('tk-filter-field')) {
        var newField = e.target.value;
        var fieldDef = TK_FILTER_FIELDS.find(function (fd) { return fd.id === newField; });
        var ops = TK_OPERATORS[fieldDef ? fieldDef.type : 'text'] || [];
        state.filters[idx].field = newField;
        state.filters[idx].op = ops[0] ? ops[0].value : 'eq';
        state.filters[idx].value = '';
        renderFilterRows();
      } else if (e.target.classList.contains('tk-filter-op')) {
        state.filters[idx].op = e.target.value;
        renderFilterRows();
      }
    }
  });
  els.tkFilterPanelBody.addEventListener('input', function (e) {
    if (e.target.classList.contains('tk-filter-val')) {
      var row = e.target.closest('.tk-filter-row');
      if (row) {
        var idx = parseInt(row.getAttribute('data-row'), 10);
        state.filters[idx].value = e.target.value;
      }
    }
  });
  els.tkFilterPanelBody.addEventListener('click', function (e) {
    var removeBtn = e.target.closest('[data-remove-row]');
    if (removeBtn) {
      var idx = parseInt(removeBtn.getAttribute('data-remove-row'), 10);
      state.filters.splice(idx, 1);
      renderFilterRows();
    }
  });
  els.tkFilterChips.addEventListener('click', function (e) {
    var chipBtn = e.target.closest('[data-chip-idx]');
    if (chipBtn) {
      var idx = parseInt(chipBtn.getAttribute('data-chip-idx'), 10);
      state.filters.splice(idx, 1);
      render();
      return;
    }
    if (e.target.id === 'tkChipClearAll' || e.target.closest('#tkChipClearAll')) {
      state.filters = [];
      render();
    }
  });

  /* 列表表头排序 */
  els.tkListHead.addEventListener('click', function (e) {
    var th = e.target.closest('th[data-sort]');
    if (th) {
      var sortKey = th.getAttribute('data-sort');
      if (state.sortBy === sortKey) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
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
  els.tkViewAdd.addEventListener('click', openSaveView);
  els.tkViewManage.addEventListener('click', openManageViews);
  els.tkViewTabs.addEventListener('click', function (e) {
    var delBtn = e.target.closest('[data-del-view]');
    if (delBtn) {
      e.stopPropagation();
      var viewId = delBtn.getAttribute('data-del-view');
      tkDeleteView(viewId);
      if (state.activeViewId === viewId) state.activeViewId = 'all';
      renderViewBar();
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
      if (state.activeViewId === viewId) state.activeViewId = 'all';
      openManageViews();
      renderViewBar();
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

  /* 重置筛选 */
  els.tkResetFilter.addEventListener('click', function () {
    state.filters = []; state.search = ''; els.tkSearch.value = ''; render();
  });

  /* 看板点击（列底新建 / 打开详情 / 多选） */
  els.tkBoardScroll.addEventListener('click', function (e) {
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
    var cardMenuBtn = e.target.closest('[data-card-menu]');
    if (cardMenuBtn) {
      var exist = cardMenuBtn.parentElement.querySelector('.tk-card-menu');
      if (exist) { exist.remove(); return; }
      document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();});
      var cid = cardMenuBtn.getAttribute('data-card-menu');
      var m = document.createElement('div');
      m.className = 'tk-card-menu';
      m.innerHTML = '<div class="tk-card-menu-item" data-card-action="edit" data-card-task="'+cid+'">编辑</div><div class="tk-card-menu-item" data-card-action="copy" data-card-task="'+cid+'">复制</div><div class="tk-card-menu-item danger" data-card-action="delete" data-card-task="'+cid+'">删除</div>';
      cardMenuBtn.parentElement.appendChild(m);
      return;
    }
    var cardAct = e.target.closest('[data-card-action]');
    if (cardAct) {
      var aid = cardAct.getAttribute('data-card-task');
      var act = cardAct.getAttribute('data-card-action');
      if (act === 'edit') { openDrawer(aid); }
      else if (act === 'delete') { tkDeleteTask(aid); render(); }
      else if (act === 'copy') { var src = tkGetTasks().find(function(x){return x.id==aid;}); if (src) { var c = Object.assign({}, src, {id: Date.now(), code: 'TSK-' + String(Date.now()).slice(-3)}); tkAddTask(c); render(); } }
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

  /* 列表点击（打开详情 / 多选） */
  els.tkListBody.addEventListener('click', function (e) {
    var inlineCreateBtn = e.target.closest('#tkInlineCreateBtn');
    if (inlineCreateBtn) {
      var row = inlineCreateBtn.closest('tr');
      row.innerHTML = '<td colspan="10"><div class="tk-inline-create-form"><input type="text" class="tk-inline-input" id="tkInlineTitle" placeholder="输入任务标题"><div class="tk-inline-dropdown" data-value="" id="tkInlineAssigneeWrap"><button type="button" class="tk-inline-select" id="tkInlineAssigneeBtn">选择处理人</button><div class="tk-inline-dropdown-menu" id="tkInlineAssigneeMenu" hidden>' + TK_PEOPLE.map(function(p){return '<div class="tk-inline-dropdown-item" data-assignee="'+p.id+'">'+p.name+'</div>';}).join('') + '</div></div><button class="tk-inline-save" id="tkInlineSave">保存</button><button class="tk-inline-cancel" id="tkInlineCancel">取消</button></div></td>';
      setTimeout(function(){ var i=els.tkListBody.querySelector('#tkInlineTitle'); if(i) i.focus(); },0);
      return;
    }
    var inlineSave = e.target.closest('#tkInlineSave');
    if (inlineSave) {
      var ti = els.tkListBody.querySelector('#tkInlineTitle');
      var aw = els.tkListBody.querySelector('#tkInlineAssigneeWrap');
      var av = aw ? aw.getAttribute('data-value') : '';
      if (ti && ti.value.trim()) {
        var mx = Math.max.apply(null, tkGetTasks().map(function(x){return x.id;}));
        tkAddTask({ id:mx+1, code:'TSK-'+String(mx+1).padStart(3,'0'), title:ti.value.trim(), desc:'', status:'backlog', priority:'medium', assignee: av||'u1', project:'p1', labels:[], dueDate:'', createDate:new Date().toISOString().slice(0,10) });
        render();
      }
      return;
    }
    var inlineAssigneeBtn = e.target.closest('#tkInlineAssigneeBtn');
    if (inlineAssigneeBtn) {
      var amenu = els.tkListBody.querySelector('#tkInlineAssigneeMenu');
      if (amenu) amenu.hidden = !amenu.hidden;
      return;
    }
    var inlineAssigneeItem = e.target.closest('[data-assignee]');
    if (inlineAssigneeItem) {
      var awrap = els.tkListBody.querySelector('#tkInlineAssigneeWrap');
      var abtn = els.tkListBody.querySelector('#tkInlineAssigneeBtn');
      var amnu = els.tkListBody.querySelector('#tkInlineAssigneeMenu');
      if (awrap) awrap.setAttribute('data-value', inlineAssigneeItem.getAttribute('data-assignee'));
      if (abtn) abtn.textContent = inlineAssigneeItem.textContent;
      if (amnu) amnu.hidden = true;
      return;
    }
    var inlineCancel = e.target.closest('#tkInlineCancel');
    if (inlineCancel) { render(); return; }
    if (e.target.classList.contains('tk-row-check')) {
      var id = parseInt(e.target.getAttribute('data-task-id'), 10);
      if (e.target.checked) state.selectedIds.add(id);
      else state.selectedIds.delete(id);
      render();
      return;
    }
    var cardMenuBtn2 = e.target.closest('[data-card-menu]');
    if (cardMenuBtn2) {
      var exist2 = cardMenuBtn2.parentElement.querySelector('.tk-card-menu');
      if (exist2) { exist2.remove(); return; }
      document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();});
      var cid2 = cardMenuBtn2.getAttribute('data-card-menu');
      var m2 = document.createElement('div');
      m2.className = 'tk-card-menu';
      m2.innerHTML = '<div class="tk-card-menu-item" data-card-action="edit" data-card-task="'+cid2+'">编辑</div><div class="tk-card-menu-item" data-card-action="copy" data-card-task="'+cid2+'">复制</div><div class="tk-card-menu-item danger" data-card-action="delete" data-card-task="'+cid2+'">删除</div>';
      cardMenuBtn2.parentElement.appendChild(m2);
      return;
    }
    var cardAct2 = e.target.closest('[data-card-action]');
    if (cardAct2) {
      var aid2 = cardAct2.getAttribute('data-card-task');
      var act2 = cardAct2.getAttribute('data-card-action');
      if (act2 === 'edit') { openDrawer(aid2); }
      else if (act2 === 'delete') { tkDeleteTask(aid2); render(); }
      else if (act2 === 'copy') { var src2 = tkGetTasks().find(function(x){return x.id==aid2;}); if (src2) { var c2 = Object.assign({}, src2, {id: Date.now(), code: 'TSK-' + String(Date.now()).slice(-3)}); tkAddTask(c2); render(); } }
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

  /* 看板列折叠 */
  els.tkBoardScroll.addEventListener('click', function (e) {
    var toggleBtn = e.target.closest('[data-toggle-col]');
    if (toggleBtn) {
      var body = toggleBtn.closest('.tk-board-col').querySelector('.tk-board-col-body');
      body.classList.toggle('collapsed');
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
  document.addEventListener('click', function () { hidePopover(); });
}

/* ---------- 初始化 ---------- */
export function initTasksV2() {
  cacheEls();
  fillSelects();
  bindEvents();
  render();
}
