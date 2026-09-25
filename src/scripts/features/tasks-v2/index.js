import { initIssueNavigation } from './navigation.js';
import { initExecutionPlan } from './execution-plan.js';
import { initMyWork } from '../collab/my-work.js';
import { initWorkItemDetail, renderWorkItemDetail } from '../collab/work-item-detail.js';
import { initReviewCenter, renderReviewCenter } from '../collab/review-center.js';
import { openIssueDetail } from './issue-detail.js';
/* T00 结构拆分：index。保留原交互；事件在 init* 中按原顺序注册。 */
import { initTaskDetailPreferences, initTaskDetailWidth, initTaskDetailEvents, initTaskDetailSubtaskEvents, initTaskDetailGlobalEvents } from './issue-detail.js';
import { tkEnsureWorkspaceDemoTasks, tkPruneOrphanTasks, tkSyncPeople } from './data.js';
import { taskViewState } from './ui-state.js';
import { initTaskListDisplayEvents, initTaskListFilterEvents, initTaskListRowEvents } from './list.js';
import { initTaskCreateEvents } from './create.js';

import { $, $$ } from '../../core/dom.js';
import { renderListPageTabs } from '../shared/list-page-tabs.js';
import { showView, input, setNavActive } from '../../core/view.js';
import { toast } from '../../core/toast.js';
import { applyTaskListFieldSettings, renderTaskListTreeNodes, taskListVisibleColumnCount } from './list-template.js';
import { getDemoRunHeader } from './review-reports.js';
import { getDemoPreRun, getDemoStageRun } from './run-feedback.js';
import { CV_PROJECTS } from '../collab/data.js';
import { createDeliveryActivity } from '../collab/delivery-activity.js';
import { EXPERTS, PRESET_TEAMS, xav } from '../expert/data.js';
import { TEAMS } from '../expert/store.js';
import _iconDocument from '../../../assets/file-type-icons/document.png';
import _iconDoc from '../../../assets/file-type-icons/doc.png';
import _iconHtml from '../../../assets/file-type-icons/html.png';
import _iconImage from '../../../assets/file-type-icons/image.png';
import _iconExcel from '../../../assets/file-type-icons/excel.png';
var _artifactIcons = { requirements:_iconDocument, plan:_iconDocument, technical:_iconDoc, architecture:_iconHtml, prototype:_iconImage, test:_iconExcel, delivery:_iconDocument };
import {
  TK_STATUSES, TK_PRIORITIES, TK_PEOPLE, TK_AGENTS, TK_LABELS,
  TK_VIEWS, TK_FILTER_FIELDS, TK_OPERATORS, TK_TASKS, tkCurrentUserId, tkPeopleInProject, tkProjectsForCurrentUser,
  tkGetTaskArtifacts,
  tkGetTasks, tkSetTasks, tkAddTask, tkUpdateTask, tkDeleteTask,
  tkGetViews, tkAddView, tkDeleteView, tkRenameView,
  tkGetStatusName, tkGetPriorityName, tkGetPerson, tkGetProjectName,
  tkGetStatusObj, tkGetPriorityObj,
} from './data.js';

/* ---------- 状态 ---------- */
var LIST_FIELDS = [
  { id:'code', name:'编号' }, { id:'title', name:'标题', required:true },
  { id:'status', name:'状态' },
  { id:'priority', name:'优先级' }, { id:'assignee', name:'处理人' },
  { id:'project', name:'项目' }, { id:'due', name:'截止日期' },
  { id:'created', name:'创建时间' }, { id:'labels', name:'标签' },
];
var DEFAULT_LIST_FIELD_ORDER = LIST_FIELDS.map(function(field) { return field.id; });
var state = {
  layout: 'list', viewMode: 'slide', scope: 'all', groupBy: 'status', sortBy: 'createDate', sortDir: 'desc',
  search: '', filters: [], selectedIds: new Set(), activeViewId: 'all',
  showSubtasks: true,
  cardProperties: { priority:true, description:false, assignee:true, startDate:false, dueDate:true, project:true, labels:false, childProgress:true },
  listFieldOrder: DEFAULT_LIST_FIELD_ORDER.slice(), listFieldVisibility: { labels:false },
  editingTaskId: null, drawerTaskId: null, editingParentId: null,
};
var projectListMode = false;
var projectListProjectId = '';
var layoutBeforeProjectList = null;
var els = {};
var drawerPreferredWidth = null;
var collapsedParents = new Set();
var subtaskSectionExpanded = new Map();
var flowAssigneeDraft = { taskId: null, assigneeId: '' };
var legacyDetailPreview = false;
var lastOpenedTaskId = null;
var drawerCloseTimer = null;
var drawerOpenFrame = null;
var DRAWER_WIDTH_STORAGE_KEY = 'lingee_tasks_drawer_width';
var VIEW_STATE_STORAGE_KEY = 'lingee_tasks_view_state';
var TASK_START_LEGACY_KEY = 'lingee_tasks_start_action_legacy';
var TASK_START_PLAY_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4.7a1 1 0 0 1 1.52-.85l11 7.3a1 1 0 0 1 0 1.7l-11 7.3A1 1 0 0 1 7 19.3V4.7Z"/></svg>';
var TASK_START_CHAT_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
var taskStartLegacy = false;

function renderTaskStartAction() {
  var button = els.tkDrawerChat;
  if (!button) return;
  var label = taskStartLegacy ? '发起会话' : '开始执行';
  button.innerHTML = (taskStartLegacy ? TASK_START_CHAT_ICON : TASK_START_PLAY_ICON) + '<span>' + label + '</span>';
  button.setAttribute('aria-label', label);
}

function persistViewState() {
  try {
    localStorage.setItem(VIEW_STATE_STORAGE_KEY, JSON.stringify({
      activeViewId:state.activeViewId,
      layout:projectListMode ? layoutBeforeProjectList : state.layout,
      viewMode:state.viewMode,
      groupBy:state.groupBy,
      sortBy:state.sortBy,
      sortDir:state.sortDir,
      filters:state.filters,
      showSubtasks:state.showSubtasks,
      collapsedTaskIds:Array.from(collapsedParents),
      cardProperties:state.cardProperties,
      listFieldOrder:state.listFieldOrder,
      listFieldVisibility:state.listFieldVisibility,
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
  state.scope = view && ['all','members','agents','my_assigned','in_progress'].includes(view.scope) ? view.scope : 'all';
  if (['board','list'].includes(saved.layout)) state.layout = saved.layout;
  if (['slide','full','split'].includes(saved.viewMode)) state.viewMode = saved.viewMode;
  if (['status','priority','assignee','project','none'].includes(saved.groupBy)) state.groupBy = saved.groupBy;
  if (['status','priority','dueDate','createDate','title','code','assignee','project'].includes(saved.sortBy)) state.sortBy = saved.sortBy;
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
  if (Array.isArray(saved.listFieldOrder)) {
    state.listFieldOrder = Array.from(new Set(saved.listFieldOrder.filter(function(id) { return DEFAULT_LIST_FIELD_ORDER.includes(id); }))).concat(DEFAULT_LIST_FIELD_ORDER.filter(function(id) { return !saved.listFieldOrder.includes(id); }));
  }
  if (saved.listFieldVisibility && typeof saved.listFieldVisibility === 'object') {
    LIST_FIELDS.forEach(function(field) {
      if (!field.required && typeof saved.listFieldVisibility[field.id] === 'boolean') state.listFieldVisibility[field.id] = saved.listFieldVisibility[field.id];
    });
  }
  if (Array.isArray(saved.filters)) {
    var fields = ['status','priority','dueDate','assignee','creator','project','projectStatus','label','keyword'];
    var operators = ['eq','neq','contains','not_contains','today','overdue','before','after'];
    state.filters = saved.filters.slice(0, 30).filter(function (f) {
      return f && fields.includes(f.field) && operators.includes(f.op) && typeof f.value === 'string';
    }).map(function (f) { return { field:f.field, op:f.op, value:f.value }; }).filter(function (f) {
      if (f.field === 'assignee' || f.field === 'creator') return TK_PEOPLE.some(function (person) { return person.id === f.value; });
      return f.field !== 'project' || tkProjectsForCurrentUser().some(function (project) { return project.id === f.value; });
    });
  }
}

/* ---------- 元素缓存 ---------- */
function cacheEls() {
  var ids = [
    'tkViewTabs','tkViewAdd','tkViewMenu','tkViewMenuNew','tkViewManage','tkViewOverflow','tkViewOverflowBtn','tkOverflowMenu',
    'tkSearch','tkFilterBtn','tkFilterLabel','tkFilterPanel','tkFilterPanelBody','tkFilterSubmenu','tkFilterChips','tkToolbarNew',
    'tkDisplayBtn','tkDisplayPopover','tkFieldsBtn','tkFieldsPopover','tkFieldsClose','tkFieldsSearch','tkFieldsList','tkFieldsSummary','tkGroupSelect','tkViewModeSelect','tkSortSelect','tkSortDirection','tkShowSubtasks','tkCardProperties','tkCardPropsSection',
    'tkLayoutToggle','tkBody','tkBoard','tkBoardScroll','tkList','tkListBody','tkListHead','tkSplitEmpty',
    'tkCheckAll','tkEmpty','tkResetFilter','tkBulkBar','tkBulkCount','tkBulkClear',
    'tkDrawer','tkDrawerClickaway','tkDrawerResize','tkDrawerClose','tkDrawerTitle','tkDrawerCode','tkDrawerBody','tkDrawerMore','tkDrawerSidebarToggle','tkDrawerChat',
    'tkModalOverlay','tkModalClose','tkModalSave','tkModalTitle','tkMcExpand','tkMcContinue','tkMcAgent','tkMcAgentPanel','tkMcAgentChat','tkMcAgentPrompt','tkMcAgentSend',
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
    + (detailOnly ? '' : '<div class="tk-card-menu-item" data-card-task="' + taskId + '" data-card-action="chat">' + (taskStartLegacy ? TASK_START_CHAT_ICON : TASK_START_PLAY_ICON) + '<span>' + (taskStartLegacy ? '发起会话' : '开始执行') + '</span></div>')
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
        assignee: parent.assignee || tkCurrentUserId(), project: parent.project || tkProjectsForCurrentUser()[0]?.id || '',
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
function statusSvg(status) {
  var s = TK_STATUSES.find(function(x){return x.id===status;});
  var icon = (s && s.icon) || 'circle';
  var colorMap={gray:'#9f9fa9',orange:'#cb9400',green:'#4aa651',red:'#ff6467',blue:'#0f92f7'};
  var color=colorMap[(s&&s.color)||'gray'];
  var CX=7,CY=7,OR=6,FR=3.5;
  function pie(p){var a=2*Math.PI*p;var ex=CX+FR*Math.sin(a);var ey=CY-FR*Math.cos(a);var la=p>0.5?1:0;return 'M'+CX+','+CY+' L'+CX+','+(CY-FR)+' A'+FR+','+FR+' 0 '+la+',1 '+ex.toFixed(2)+','+ey.toFixed(2)+' Z';}
  var dots='';for(var i=0;i<16;i++){var a=(i/16)*Math.PI*2-Math.PI/2;dots+='<circle cx="'+(CX+OR*Math.cos(a)).toFixed(2)+'" cy="'+(CY+OR*Math.sin(a)).toFixed(2)+'" r="0.55" fill="currentColor"/>';}
  var ring='<circle cx="'+CX+'" cy="'+CY+'" r="'+OR+'" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3.14 0" stroke-dashoffset="-0.7"/>';
  var paths={
    dotted:dots,
    circle:ring,
    half:ring+'<path d="'+pie(0.5)+'" fill="currentColor"/>',
    three_quarters:ring+'<path d="'+pie(0.75)+'" fill="currentColor"/>',
    check:'<circle cx="'+CX+'" cy="'+CY+'" r="'+OR+'" fill="currentColor"/><path d="M10.951 4.249C11.283 4.581 11.283 5.119 10.951 5.451L5.951 10.451C5.619 10.783 5.081 10.783 4.749 10.451L2.749 8.451C2.417 8.119 2.417 7.581 2.749 7.249C3.081 6.917 3.619 6.917 3.951 7.249L5.35 8.648L9.749 4.249C10.081 3.917 10.619 3.917 10.951 4.249Z" fill="white" stroke="none"/>',
    slash:ring+'<line x1="'+(CX+FR*Math.cos(Math.PI*0.75)).toFixed(2)+'" y1="'+(CY-FR*Math.sin(Math.PI*0.75)).toFixed(2)+'" x2="'+(CX+FR*Math.cos(-Math.PI*0.25)).toFixed(2)+'" y2="'+(CY-FR*Math.sin(-Math.PI*0.25)).toFixed(2)+'" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    cross:ring+'<path d="M5 5 L9 9 M9 5 L5 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  };
  return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="color:'+color+';flex:none">'+(paths[icon]||paths.circle)+'</svg>';
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
  var joinedProjectIds = new Set(tkProjectsForCurrentUser().map(function (project) { return project.id; }));
  tasks = tasks.filter(function (task) { return joinedProjectIds.has(task.project); });
  if (projectListMode && projectListProjectId) tasks = tasks.filter(function (task) { return task.project === projectListProjectId; });
  var scope = state.scope;
  if (scope === 'members') tasks = tasks.filter(function (t) { return !t.assignee || t.assignee.charAt(0) !== 'a'; });
  else if (scope === 'agents') tasks = tasks.filter(function (t) { return t.assignee && t.assignee.charAt(0) === 'a'; });
  else if (scope === 'my_assigned') tasks = tasks.filter(function (t) { return t.assignee === tkCurrentUserId(); });
  else if (scope === 'in_progress') tasks = tasks.filter(function (t) { return t.status === 'in_progress'; });
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
  return renderTaskListTreeNodes(tasks, childrenMap, depth, {
    collapsedParents:collapsedParents, selectedIds:state.selectedIds, drawerTaskId:state.drawerTaskId,
    escapeHtml:escapeHtml, isOverdue:isOverdue, stClass:stClass, priClass:priClass, statusSvg:statusSvg,
    avatarSm:avatarSm, fmtDate:fmtDate,
  });
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
    tkProjectsForCurrentUser().forEach(function (p) { groups[p.id] = { name: p.name, color: 'blue', tasks: [] }; keys.push(p.id); });
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
  els.tkViewTabs.innerHTML = renderListPageTabs(tkGetViews().map(function(view){return {id:view.id,name:view.name,removable:!view.builtin};}),state.activeViewId,'data-view-id');
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
      + statusSvg(g.key)
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
  return '<div class="tk-card' + sel + extraCls + '" draggable="true" data-task-id="' + t.id + '">'
    + '<button class="tk-card-more" data-card-more="' + t.id + '" data-tooltip="更多操作" aria-label="更多操作"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>'
    + '<div class="tk-card-top-row">' + toggle + spacer + '<div class="tk-card-code">' + escapeHtml(t.code) + '</div>' + childBadge + '</div>'
    + '<div class="tk-card-title">' + escapeHtml(t.title) + '</div>'
    + (props.description && t.desc ? '<div class="tk-card-description">' + escapeHtml(t.desc) + '</div>' : '')
    + (labels ? '<div class="tk-card-labels">' + labels + '</div>' : '')
    + '<div class="tk-card-foot"><div class="tk-card-foot-left">'
    + (props.priority ? '<span class="tk-card-priority">' + escapeHtml(pri.name) + '</span>' : '')
    + (props.startDate && t.startDate ? '<span class="tk-card-due">' + fmtDate(t.startDate) + '</span>' : '')
    + (props.dueDate && t.dueDate ? '<span class="tk-card-due' + (overdue ? ' overdue' : '') + '"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + fmtDate(t.dueDate) + '</span>' : '')
    + (props.project && t.project ? '<span class="tk-card-project">' + escapeHtml(tkGetProjectName(t.project)) + '</span>' : '')
    + '</div>' + (props.assignee ? avatar(t.assignee) : '') + '</div></div>';
}

/* ---------- 渲染：列表 ---------- */
function visibleListColumnCount() {
  return taskListVisibleColumnCount(state.listFieldOrder, state.listFieldVisibility);
}
function applyListFieldSettings() {
  applyTaskListFieldSettings(els.tkListHead, els.tkListBody, state.listFieldOrder, state.listFieldVisibility);
}
function renderList(tasks) {
  tasks = tasks || getFilteredTasks();
  if (tasks.length === 0 && state.viewMode === 'split') {
    showBoardOrList();
    els.tkListBody.innerHTML = '<tr class="tk-row-create"><td colspan="' + visibleListColumnCount() + '">没有匹配的任务</td></tr>';
    updateSortArrows();
    return;
  }
  if (tasks.length === 0) { showEmpty(); return; }
  showBoardOrList();
  var tree = buildTaskTree(tasks);
  var html = renderListTreeNodes(tree.roots, tree.childrenMap, 0);
  els.tkListBody.innerHTML = '<tr class="tk-row-create" id="tkRowCreate"><td colspan="' + visibleListColumnCount() + '"><button class="tk-inline-create-btn" id="tkInlineCreateBtn">+ 快速新建</button></td></tr>' + html;
  updateSortArrows();
}

function animateListSubtasks(toggleBtn) {
  var taskId = Number(toggleBtn.getAttribute('data-tk-toggle'));
  var opening = collapsedParents.has(taskId);
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 折叠箭头旋转 */
  function animateArrow() {
    var svg = els.tkListBody.querySelector('[data-tk-toggle="' + taskId + '"] svg');
    if (svg) svg.animate([
      { transform: opening ? 'rotate(-90deg)' : 'rotate(0deg)' },
      { transform: opening ? 'rotate(0deg)' : 'rotate(-90deg)' },
    ], { duration: 200, easing: 'cubic-bezier(.4,0,.2,0)' });
  }

  if (reduceMotion) {
    if (opening) collapsedParents.delete(taskId);
    else collapsedParents.add(taskId);
    render();
    return;
  }

  var parentRow = toggleBtn.closest('tr.tk-row');
  var parentDepth = Number(parentRow.getAttribute('data-depth'));

  function getChildRows(row) {
    var rows = [];
    var next = row.nextElementSibling;
    while (next && next.classList.contains('tk-row') && Number(next.getAttribute('data-depth')) > parentDepth) {
      rows.push(next);
      next = next.nextElementSibling;
    }
    return rows;
  }

  /* 设置 / 清除行内动画辅助样式（overflow + padding + border 归零） */
  function prepRow(row, height) {
    row.style.overflow = 'hidden';
    row.style.height = height + 'px';
    row.querySelectorAll('td').forEach(function (td) {
      td.style.overflow = 'hidden';
      td.style.paddingTop = '0px';
      td.style.paddingBottom = '0px';
      td.style.borderBottomWidth = '0px';
    });
  }
  function cleanupRow(row) {
    row.style.overflow = '';
    row.style.height = '';
    row.querySelectorAll('td').forEach(function (td) {
      td.style.overflow = '';
      td.style.paddingTop = '';
      td.style.paddingBottom = '';
      td.style.borderBottomWidth = '';
    });
  }

  if (!opening) {
    /* 折叠：子行从自然高度收缩到 0，下方行随高度减小自然上移 */
    var childRows = getChildRows(parentRow);
    var heights = childRows.map(function (r) { return r.getBoundingClientRect().height; });
    childRows.forEach(function (r, i) { prepRow(r, heights[i]); });
    var anims = childRows.map(function (r) {
      return r.animate([
        { opacity: 1 },
        { height: '0px', opacity: 0 },
      ], { duration: 200, easing: 'cubic-bezier(.4,0,.2,0)', fill: 'forwards' });
    });
    animateArrow();
    Promise.all(anims.map(function (a) { return a.finished; })).then(function () {
      collapsedParents.add(taskId);
      render();
    });
    return;
  }

  /* 展开：先渲染子行，再从高度 0 平滑展开到自然高度 */
  collapsedParents.delete(taskId);
  render();
  var newParentRow = els.tkListBody.querySelector('[data-tk-toggle="' + taskId + '"]');
  if (newParentRow) newParentRow = newParentRow.closest('tr.tk-row');
  if (!newParentRow) { animateArrow(); return; }
  parentDepth = Number(newParentRow.getAttribute('data-depth'));
  var newChildRows = getChildRows(newParentRow);
  var naturalHeights = newChildRows.map(function (r) { return r.getBoundingClientRect().height; });
  newChildRows.forEach(function (r) { prepRow(r, 0); });
  els.tkListBody.offsetHeight; /* 强制 reflow，确保 height:0 生效 */
  newChildRows.forEach(function (r, i) {
    r.animate([
      { opacity: 0 },
      { height: naturalHeights[i] + 'px', opacity: 1 },
    ], { duration: 240, easing: 'cubic-bezier(.4,0,.2,0)', fill: 'forwards' });
  });
  setTimeout(function () {
    newChildRows.forEach(cleanupRow);
  }, 280);
  animateArrow();
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
  tkSyncPeople();
  var joinedProjects = new Set(tkProjectsForCurrentUser().map(function (project) { return project.id; }));
  state.selectedIds.forEach(function (id) {
    var task = tkGetTasks().find(function (item) { return item.id === id; });
    if (!task || !joinedProjects.has(task.project)) state.selectedIds.delete(id);
  });
  if (state.drawerTaskId) {
    var openTask = tkGetTasks().find(function (item) { return item.id === state.drawerTaskId; });
    if (!openTask || !joinedProjects.has(openTask.project)) closeDrawer();
  }
  var split = state.viewMode === 'split';
  if (split) state.layout = 'list';
  els.tkToolbarNew.classList.remove('hidden');
  els.tkBody.classList.toggle('is-split', split);
  els.tkDrawer.classList.toggle('mode-full', state.viewMode === 'full');
  $$('[data-layout]', els.tkLayoutToggle).forEach(function (btn) {
    var active = btn.getAttribute('data-layout') === state.layout;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
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
  applyListFieldSettings();
  renderFilterChips(); updateBulkBar(); updateCheckAll();
  syncDrawerClickaway();
  persistViewState();
}

/* 项目详情复用视图、筛选与布局控制器，离开后恢复任务页布局。 */
export function tkSetProjectListMode(active, projectId) {
  if (active === projectListMode && (!active || projectListProjectId === projectId)) return;
  if (active) {
    if (!projectListMode) layoutBeforeProjectList = state.layout;
    projectListMode = true;
    projectListProjectId = projectId || '';
  } else {
    projectListMode = false;
    projectListProjectId = '';
    state.layout = layoutBeforeProjectList || state.layout;
    layoutBeforeProjectList = null;
  }
  if (els.tkBody) render();
}
var cardPropertyOptions = [
  ['priority','优先级'],['description','描述'],['assignee','负责人'],['startDate','开始日期'],
  ['dueDate','截止日期'],['project','项目'],['labels','标签'],['childProgress','子任务进度'],
];
var displayGroupOptions = [
  ['status','状态'],['priority','优先级'],['assignee','处理人'],['project','项目'],['none','不分组'],
];
var displaySortOptions = [
  ['status','状态'],['priority','优先级'],['dueDate','截止日期'],['createDate','创建时间'],
  ['code','编号'],['title','标题'],['assignee','处理人'],['project','项目'],
];
var displayChoiceMenu = null;
var displayChoiceTrigger = null;
function closeDisplayChoiceMenu(restoreFocus) {
  if (displayChoiceMenu) displayChoiceMenu.remove();
  displayChoiceMenu = null;
  if (displayChoiceTrigger) {
    displayChoiceTrigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) displayChoiceTrigger.focus({ preventScroll:true });
  }
  displayChoiceTrigger = null;
}
function openDisplayChoiceMenu(trigger, kind, focusEdge) {
  if (displayChoiceMenu && displayChoiceTrigger === trigger) { closeDisplayChoiceMenu(true); return; }
  closeDisplayChoiceMenu();
  var options = kind === 'group' ? displayGroupOptions : displaySortOptions;
  var selected = kind === 'group' ? state.groupBy : state.sortBy;
  var menu = document.createElement('div');
  menu.className = 'tk-flow-field-menu tk-display-choice-menu show';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', kind === 'group' ? '分组字段' : '排序字段');
  menu.innerHTML = options.map(function(option) {
    var active = option[0] === selected;
    return '<button type="button" class="tk-flow-field-menu-item tk-display-choice-option' + (active ? ' active' : '') + '" role="option" aria-selected="' + active + '" data-value="' + option[0] + '"><span>' + option[1] + '</span><span class="tk-display-choice-check" aria-hidden="true">' + (active ? '✓' : '') + '</span></button>';
  }).join('');
  document.body.appendChild(menu);
  displayChoiceMenu = menu;
  displayChoiceTrigger = trigger;
  trigger.setAttribute('aria-expanded', 'true');
  var rect = trigger.getBoundingClientRect();
  menu.style.minWidth = rect.width + 'px';
  menu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8)) + 'px';
  menu.style.top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - menu.offsetHeight - 8)) + 'px';
  menu.addEventListener('click', function(e) {
    e.stopPropagation();
    var option = e.target.closest('[data-value]');
    if (!option) return;
    if (kind === 'group') state.groupBy = option.getAttribute('data-value');
    else {
      state.sortBy = option.getAttribute('data-value');
      state.sortDir = state.sortBy === 'createDate' || state.sortBy === 'priority' ? 'desc' : 'asc';
    }
    closeDisplayChoiceMenu(true);
    render();
  });
  menu.addEventListener('keydown', function(e) {
    var items = Array.from(menu.querySelectorAll('.tk-display-choice-option'));
    var index = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDisplayChoiceMenu(true); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      var next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next].focus();
    }
  });
  var items = menu.querySelectorAll('.tk-display-choice-option');
  var activeOption = menu.querySelector('.tk-display-choice-option.active');
  (focusEdge === 'first' ? items[0] : focusEdge === 'last' ? items[items.length - 1] : activeOption || items[0]).focus({ preventScroll:true });
}
function renderDisplayControls() {
  els.tkGroupSelect.querySelector('.tk-display-choice-text').textContent = (displayGroupOptions.find(function(option) { return option[0] === state.groupBy; }) || displayGroupOptions[0])[1];
  els.tkViewModeSelect.value = state.viewMode;
  els.tkSortSelect.querySelector('.tk-display-choice-text').textContent = (displaySortOptions.find(function(option) { return option[0] === state.sortBy; }) || displaySortOptions[0])[1];
  els.tkSortDirection.dataset.direction = state.sortDir;
  var directionHint = state.sortDir === 'none' ? '未排序，点击切换为升序' : '当前' + (state.sortDir === 'asc' ? '升序，点击切换为降序' : '降序，点击切换为升序');
  els.tkSortDirection.setAttribute('aria-label', directionHint);
  els.tkSortDirection.setAttribute('data-tooltip', directionHint);
  els.tkShowSubtasks.checked = state.showSubtasks;
  els.tkCardPropsSection.classList.toggle('hidden', state.layout !== 'board');
  els.tkCardProperties.innerHTML = cardPropertyOptions.map(function (opt) {
    return '<button type="button" class="tk-display-property" data-card-property="' + opt[0] + '" aria-pressed="' + !!state.cardProperties[opt[0]] + '">' + opt[1] + '</button>';
  }).join('');
  els.tkFieldsSummary.textContent = state.listFieldOrder.filter(function(id) { return id === 'title' || state.listFieldVisibility[id] !== false; }).length + ' 个字段';
}
function renderFieldSettings() {
  var query = els.tkFieldsSearch.value.trim().toLocaleLowerCase();
  var fields = state.listFieldOrder.map(function(id) { return LIST_FIELDS.find(function(field) { return field.id === id; }); }).filter(function(field) {
    return field && field.name.toLocaleLowerCase().includes(query);
  });
  els.tkFieldsList.innerHTML = fields.length ? fields.map(function(field) {
    var checked = field.required || state.listFieldVisibility[field.id] !== false;
    return '<div class="tk-fields-item" data-field-id="' + field.id + '" draggable="true">' +
      '<span class="tk-fields-grip" role="button" tabindex="0" aria-label="调整' + field.name + '顺序">⋮⋮</span>' +
      '<label><input type="checkbox" data-field-visible="' + field.id + '"' + (checked ? ' checked' : '') + (field.required ? ' disabled' : '') + '><span>' + field.name + '</span></label>' +
      '</div>';
  }).join('') : '<div class="tk-fields-empty">没有匹配的字段</div>';
}
function closeFieldSettings() {
  els.tkFieldsPopover.classList.add('hidden');
  els.tkFieldsBtn.setAttribute('aria-expanded', 'false');
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
     var projectId = projectListProjectId || tkProjectsForCurrentUser()[0]?.id;
     if (!projectId || !tkProjectsForCurrentUser().some(function (project) { return project.id === projectId; })) { toast('请先加入项目再创建任务', 'warning'); render(); return; }
     tkAddTask({ id:mx+1, code:'T'+String(1000000+mx+1), title:title, desc:'', status:'backlog', priority:'medium', assignee: av || tkPeopleInProject(projectId)[0]?.id || '', project:projectId, labels:[], dueDate:'', createDate:new Date().toISOString().slice(0,10) });
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
  fill(els.tkFormProject, tkProjectsForCurrentUser(), 'id', 'name');
  refreshFormAssignees();
  if (els.tkBulkAssigneeMenu) {
    els.tkBulkAssigneeMenu.innerHTML = TK_PEOPLE.map(function (p) {
      return '<div class="tk-popover-item" data-assignee="' + p.id + '">' + escapeHtml(p.name) + '</div>';
    }).join('');
  }
}
function refreshFormAssignees(preferredId) {
  var people = tkPeopleInProject(els.tkFormProject.value);
  var currentId = preferredId || els.tkFormAssignee.value;
  els.tkFormAssignee.innerHTML = people.map(function (person) {
    return '<option value="' + escapeHtml(person.id) + '">' + escapeHtml(person.name) + '</option>';
  }).join('');
  els.tkFormAssignee.value = people.some(function (person) { return person.id === currentId; }) ? currentId : (people[0]?.id || '');
}

/* ---------- 新建/编辑弹窗 ---------- */
function openTaskModal(taskId, parentId) {
  if (!tkProjectsForCurrentUser().length) { toast('请先加入项目再创建任务', 'warning'); return; }
  fillSelects();
  state.editingTaskId = null;
  state.editingParentId = parentId || null;
  els.tkModalTitle.textContent = parentId ? '新增子任务' : '新建任务';
  var mcUser = document.getElementById('tkMcUser');
  if (mcUser) mcUser.textContent = (document.getElementById('userName') && document.getElementById('userName').textContent) || '吴晓峰';
  tkMcSetMode('manual');
  if (els.tkMcAgentPrompt) els.tkMcAgentPrompt.value = '';
  els.tkFormTitle.value = '';
  els.tkFormDesc.value = '';
  els.tkFormStatus.value = 'backlog';
  els.tkFormPriority.value = 'medium';
  els.tkFormProject.value = projectListProjectId || tkProjectsForCurrentUser()[0].id;
  refreshFormAssignees(tkCurrentUserId());
  els.tkFormDue.value = '';
  els.tkFormLabels.value = '';
  if (parentId) {
    var parent = tkGetTasks().find(function (x) { return x.id === parentId; });
    if (parent) {
      els.tkFormProject.value = parent.project;
      refreshFormAssignees(parent.assignee);
      els.tkFormPriority.value = parent.priority;
    }
  }
  els.tkModalOverlay.classList.remove('hidden');
  requestAnimationFrame(function () { els.tkModalOverlay.classList.add('show'); });
}
function tkMcSetMode(mode) {
  var isAgent = mode === 'agent';
  els.tkMcAgentPanel.classList.toggle('hidden', !isAgent);
  var title = document.getElementById('tkFormTitle');
  var desc = document.getElementById('tkFormDesc');
  if (title) title.classList.toggle('hidden', isAgent);
  if (desc) desc.classList.toggle('hidden', isAgent);
  var btn = els.tkMcAgent;
  if (btn) btn.innerHTML = isAgent
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 4l4 4-4 4"/><path d="M3 8h14"/><path d="M7 20l-4-4 4-4"/><path d="M21 16H7"/></svg>切换到手动'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4l-4 4 4 4"/><path d="M3 8h14"/><path d="M17 20l4-4-4-4"/><path d="M21 16H7"/></svg>切换到智能体';
  if (els.tkModalSave) els.tkModalSave.textContent = isAgent ? '发送' : '创建任务';
  var toggle = document.querySelector('#tkModalOverlay .tk-mc-toggle');
  if (toggle) toggle.style.display = isAgent ? 'none' : '';
  var attach = document.querySelector('#tkModalOverlay .tk-mc-attach');
  if (attach) attach.style.display = isAgent ? 'none' : '';
  if (isAgent && els.tkMcAgentPrompt) setTimeout(function(){ els.tkMcAgentPrompt.focus(); }, 50);
}
function tkMcAgentSendMsg() {
  var prompt = els.tkMcAgentPrompt.value.trim();
  if (!prompt) { els.tkMcAgentPrompt.focus(); return; }
  els.tkMcAgentPrompt.value = '';
  els.tkModalSave.disabled = true;
  els.tkModalSave.innerHTML = '<span class="tk-mc-agent-sent">✓ 已发送</span>';
  setTimeout(function () {
    els.tkModalSave.disabled = false;
    els.tkModalSave.textContent = '发送';
    els.tkMcAgentPrompt.focus();
    toast('任务已提交，智能体处理结果将通过通知送达', 'success');
  }, 1500);
}
function closeTaskModal() {
  els.tkModalOverlay.classList.remove('show');
  els.tkModalOverlay.classList.remove('tk-mc-fullscreen');
  setTimeout(function () { els.tkModalOverlay.classList.add('hidden'); }, 200);
}
function saveTask() {
  var title = els.tkFormTitle.value.trim();
  if (!title) { els.tkFormTitle.focus(); return; }
  if (!tkProjectsForCurrentUser().some(function (project) { return project.id === els.tkFormProject.value; })) { toast('请先加入项目再创建任务', 'warning'); return; }
  var createdForOpenParent = !state.editingTaskId && state.editingParentId && state.drawerTaskId === state.editingParentId;
  var labels = els.tkFormLabels.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (!tkPeopleInProject(els.tkFormProject.value).some(function (person) { return person.id === els.tkFormAssignee.value; })) { toast('请选择该项目成员作为处理人', 'warning'); return; }
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
    }
    tkAddTask(data);
  }
  var keepOpen = els.tkMcContinue && els.tkMcContinue.checked && !state.editingTaskId;
  if (keepOpen) {
    els.tkFormTitle.value = '';
    els.tkFormDesc.value = '';
    els.tkFormTitle.focus();
    toast('任务已创建，可继续创建下一个', 'success');
  } else {
    closeTaskModal();
  }
  render();
  if (createdForOpenParent && !keepOpen) openDrawer(state.drawerTaskId);
}

/* ---------- 评论 @ mention ---------- */
var mentionPanel = null;
var mentionItems = [];
var mentionIndex = 0;
var mentionTextarea = null;

function mentionMatches(item, query) {
  var q = query.trim().toLocaleLowerCase();
  return !q || item.name.toLocaleLowerCase().includes(q) || (item.role || '').toLocaleLowerCase().includes(q);
}

function mentionGroup(label, items, type) {
  if (!items.length) return '';
  return '<div class="tk-mention-group" role="group" aria-label="' + label + '">'
    + '<div class="tk-mention-group-label">' + label + '</div>'
    + items.map(function (item) {
      var avatar = item.k
        ? '<img class="tk-mention-avatar" src="' + xav(item.k) + '" alt="">'
        : '<span class="tk-mention-avatar" style="background:' + escapeHtml(item.color || 'var(--brand)') + '">' + escapeHtml(item.avatar || item.name.slice(0, 1)) + '</span>';
      return '<button type="button" role="option" aria-selected="false" class="tk-mention-item" data-mention-name="' + escapeHtml(item.name) + '" data-mention-type="' + type + '" data-mention-id="' + escapeHtml(item.id) + '">'
        + avatar + '<span class="tk-mention-name">' + escapeHtml(item.name) + '</span>'
        + (type === 'person' ? '' : '<span class="tk-mention-type">' + (type === 'team' ? '专家团成员' : '智能体') + '</span>') + '</button>';
    }).join('') + '</div>';
}

function setMentionIndex(index) {
  if (!mentionItems.length) return;
  mentionIndex = (index + mentionItems.length) % mentionItems.length;
  mentionItems.forEach(function (item, i) {
    item.classList.toggle('active', i === mentionIndex);
    item.setAttribute('aria-selected', String(i === mentionIndex));
  });
  mentionItems[mentionIndex].scrollIntoView({ block:'nearest' });
}

function createMentionPanel(textarea, query) {
  mentionTextarea = textarea;
  var mentionTask = tkGetTasks().find(function (task) { return task.id === state.drawerTaskId; });
  var project = CV_PROJECTS.find(function (row) { return row.id === mentionTask?.project; });
  var team = TEAMS.find(function (row) { return row.id === project?.defaultTeam; })
    || PRESET_TEAMS.find(function (row) { return row.id === project?.defaultTeam; });
  var teamIds = new Set(team?.members || []);
  var people = (mentionTask ? tkPeopleInProject(mentionTask.project) : TK_PEOPLE).filter(function (row) { return mentionMatches(row, query); });
  var members = (team?.members || []).map(function (id) { return EXPERTS.find(function (row) { return row.id === id; }); })
    .filter(Boolean).filter(function (row) { return mentionMatches(row, query); });
  var agents = EXPERTS.filter(function (row) { return !teamIds.has(row.id) && mentionMatches(row, query); })
    .concat(TK_AGENTS.filter(function (row) { return mentionMatches(row, query); }));
  var html = mentionGroup(team ? team.name + ' · 成员' : '专家团成员', members, 'team')
    + mentionGroup('人员', people, 'person') + mentionGroup('智能体', agents, 'agent');
  if (!html) html = '<div class="tk-mention-empty">无匹配结果</div>';
  if (!mentionPanel) {
    mentionPanel = document.createElement('div');
    mentionPanel.className = 'tk-mention-panel';
    mentionPanel.id = 'tkMentionPanel';
    mentionPanel.setAttribute('role', 'listbox');
    mentionPanel.setAttribute('aria-label', '@ 提及对象');
    mentionPanel.addEventListener('click', function (e) {
      var item = e.target.closest('.tk-mention-item');
      if (item && mentionTextarea) insertMention(mentionTextarea, item.getAttribute('data-mention-name'));
    });
    document.body.appendChild(mentionPanel);
  }
  mentionPanel.innerHTML = html;
  mentionPanel.classList.add('show');
  var rect = textarea.getBoundingClientRect();
  var panelHeight = Math.min(mentionPanel.scrollHeight, 300);
  var top = rect.bottom + 6;
  if (top + panelHeight > window.innerHeight - 8) top = rect.top - panelHeight - 6;
  mentionPanel.style.top = Math.max(8, top) + 'px';
  mentionPanel.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 304)) + 'px';
  mentionItems = Array.from(mentionPanel.querySelectorAll('.tk-mention-item'));
  mentionIndex = 0;
  setMentionIndex(0);
}

function closeMentionPanel() {
  if (mentionPanel) mentionPanel.classList.remove('show');
  mentionTextarea = null;
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
  ta.dispatchEvent(new Event('input', { bubbles:true }));
}

/* ---------- 任务详情面板 ---------- */
var propPickerOptions = {};
var propFieldKeys = { '状态':'status', '处理人':'assignee', '项目':'project', '模块':'module', '优先级':'priority', '截止日期':'dueDate' };
var taskLabelColors = Object.create(null);
var labelPickerMenu = null;
var labelPickerTaskId = null;
var labelPickerMode = 'pick';
var LABEL_PALETTE = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#6366f1','#a855f7','#ec4899','#64748b'];
function persistTaskLabelCatalog() {
  try { localStorage.setItem('lingee_task_label_catalog', JSON.stringify({ labels:TK_LABELS, colors:taskLabelColors })); }
  catch (e) { /* 本地存储不可用时仍可在当前页面编辑 */ }
}
function restoreTaskLabelCatalog() {
  try {
    var saved = JSON.parse(localStorage.getItem('lingee_task_label_catalog') || 'null');
    if (!saved || !Array.isArray(saved.labels)) return;
    TK_LABELS.splice(0, TK_LABELS.length, ...saved.labels.filter(function(name) { return typeof name === 'string' && name.trim(); }));
    if (saved.colors && typeof saved.colors === 'object') Object.keys(saved.colors).forEach(function(name) {
      if (/^#[0-9a-f]{6}$/i.test(saved.colors[name])) taskLabelColors[name] = saved.colors[name];
    });
  } catch (e) { /* 忽略损坏的本地缓存 */ }
}
function taskLabelColor(name) {
  if (taskLabelColors[name]) return taskLabelColors[name];
  var hash = 0;
  for (var i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return LABEL_PALETTE[hash % LABEL_PALETTE.length];
}
function taskLabelTextColor(color) {
  var r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
  return (r * .299 + g * .587 + b * .114) / 255 > .55 ? '#111827' : '#f9fafb';
}
function taskLabelCatalog() {
  return Array.from(new Set(TK_LABELS.concat(tkGetTasks().flatMap(function(t) { return t.labels || []; }))));
}
function renderTaskLabelTrigger(task) {
  var labels = task.labels || [];
  return '<div class="tk-label-picker" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false" aria-label="编辑标签">' +
    (labels.length ? labels.map(function(name) {
      var color = taskLabelColor(name);
      return '<span class="tk-drawer-label" style="background:' + color + ';color:' + taskLabelTextColor(color) + '"><span>' + escapeHtml(name) + '</span><button type="button" class="tk-drawer-label-remove" data-label-remove="' + escapeHtml(name) + '" aria-label="移除标签 ' + escapeHtml(name) + '">×</button></span>';
    }).join('') : '<span class="tk-label-placeholder"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3h9l9 9-9 9-9-9z"/><circle cx="8" cy="8" r="1"/></svg>添加标签</span>') +
    '</div>';
}
function closeTaskLabelPicker() {
  if (labelPickerMenu) labelPickerMenu.remove();
  labelPickerMenu = null;
  labelPickerTaskId = null;
  labelPickerMode = 'pick';
  var trigger = els.tkDrawerBody && els.tkDrawerBody.querySelector('.tk-label-picker');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}
function updateTaskLabels(task, labels) {
  tkUpdateTask(task.id, { labels: labels });
  var row = els.tkDrawerBody.querySelector('.tk-label-picker');
  if (row) row.outerHTML = renderTaskLabelTrigger(task);
  if (labelPickerMenu) els.tkDrawerBody.querySelector('.tk-label-picker').setAttribute('aria-expanded', 'true');
  render();
}
function renderTaskLabelChoices(query) {
  if (!labelPickerMenu || labelPickerMode !== 'pick') return;
  var task = tkGetTasks().find(function(t) { return t.id === labelPickerTaskId; });
  if (!task) return;
  var normalized = query.trim().toLocaleLowerCase();
  var labels = taskLabelCatalog().filter(function(name) { return name.toLocaleLowerCase().includes(normalized); });
  var list = labelPickerMenu.querySelector('.tk-label-picker-options');
  list.innerHTML = labels.map(function(name) {
    var selected = (task.labels || []).includes(name);
    return '<button type="button" class="tk-label-option' + (selected ? ' selected' : '') + '" data-label-option="' + escapeHtml(name) + '" role="option" aria-selected="' + selected + '"><span class="tk-label-color" style="background:' + taskLabelColor(name) + '"></span><span class="tk-label-option-name">' + escapeHtml(name) + '</span><span class="tk-label-check">' + (selected ? '✓' : '') + '</span></button>';
  }).join('');
  var exact = taskLabelCatalog().some(function(name) { return name.toLocaleLowerCase() === normalized; });
  if (normalized && !exact) list.innerHTML += '<button type="button" class="tk-label-option tk-label-create" data-label-create="' + escapeHtml(query.trim()) + '"><span class="tk-label-create-plus">＋</span><span class="tk-label-option-name">创建“' + escapeHtml(query.trim()) + '”</span><span class="tk-label-color" style="background:' + taskLabelColor(query.trim()) + '"></span></button>';
  if (!list.innerHTML) list.innerHTML = '<div class="tk-label-picker-empty">没有匹配的标签</div>';
}
function renderTaskLabelPickerBody() {
  labelPickerMode = 'pick';
  labelPickerMenu.innerHTML = '<div class="tk-label-search-wrap"><input type="search" class="tk-label-search" placeholder="搜索标签…" aria-label="搜索标签" autocomplete="off"></div><div class="tk-label-picker-options" role="listbox" aria-multiselectable="true"></div><div class="tk-label-popover-footer"><button type="button" data-label-manage>⚙ 管理标签</button></div>';
  renderTaskLabelChoices('');
  labelPickerMenu.querySelector('input').focus({ preventScroll:true });
}
function renderTaskLabelManager() {
  labelPickerMode = 'manage';
  labelPickerMenu.innerHTML = '<div class="tk-label-manager-head"><button type="button" data-label-back aria-label="返回标签选择">‹</button><strong>管理标签</strong></div>' +
    '<div class="tk-label-manager-list">' + taskLabelCatalog().map(function(name) {
      return '<div class="tk-label-manager-row"><input type="color" data-label-color="' + escapeHtml(name) + '" value="' + taskLabelColor(name) + '" aria-label="标签颜色 ' + escapeHtml(name) + '"><input type="text" data-label-rename="' + escapeHtml(name) + '" value="' + escapeHtml(name) + '" aria-label="标签名称"><button type="button" data-label-delete="' + escapeHtml(name) + '" aria-label="删除标签 ' + escapeHtml(name) + '">×</button></div>';
    }).join('') + '</div><div class="tk-label-manager-add"><input type="text" class="tk-label-manager-new" placeholder="新标签名称" aria-label="新标签名称"><button type="button" data-label-add>添加</button></div>';
}
function refreshTaskLabelDisplay() {
  var task = tkGetTasks().find(function(t) { return t.id === state.drawerTaskId; });
  var row = els.tkDrawerBody.querySelector('.tk-label-picker');
  if (task && row) {
    row.outerHTML = renderTaskLabelTrigger(task);
    els.tkDrawerBody.querySelector('.tk-label-picker').setAttribute('aria-expanded', 'true');
  }
  render();
}
function openTaskLabelPicker(trigger) {
  closeTaskLabelPicker();
  labelPickerTaskId = state.drawerTaskId;
  labelPickerMenu = document.createElement('div');
  labelPickerMenu.className = 'tk-label-popover';
  renderTaskLabelPickerBody();
  labelPickerMenu.addEventListener('input', function(e) {
    if (e.target.classList.contains('tk-label-search')) renderTaskLabelChoices(e.target.value);
  });
  labelPickerMenu.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeTaskLabelPicker(); return; }
    if (e.isComposing) return;
    if (e.key === 'Enter' && e.target.classList.contains('tk-label-manager-new')) {
      e.preventDefault();
      labelPickerMenu.querySelector('[data-label-add]').click();
      return;
    }
    if (e.key === 'Enter' && e.target.classList.contains('tk-label-search')) {
      var first = labelPickerMenu.querySelector('.tk-label-option');
      if (first) { e.preventDefault(); first.click(); }
    }
    if (e.key === 'ArrowDown' && e.target.classList.contains('tk-label-search')) {
      var option = labelPickerMenu.querySelector('.tk-label-option');
      if (option) { e.preventDefault(); option.focus(); }
    }
    var focusedOption = e.target.closest('.tk-label-option');
    if (focusedOption) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var options = Array.from(labelPickerMenu.querySelectorAll('.tk-label-option'));
        var index = options.indexOf(focusedOption) + (e.key === 'ArrowDown' ? 1 : -1);
        if (options[index]) options[index].focus();
        else labelPickerMenu.querySelector('.tk-label-search').focus();
      }
    }
  });
  labelPickerMenu.addEventListener('click', function(e) {
    if (e.target.closest('[data-label-manage]')) { renderTaskLabelManager(); return; }
    if (e.target.closest('[data-label-back]')) { renderTaskLabelPickerBody(); return; }
    var add = e.target.closest('[data-label-add]');
    if (add) {
      var newName = labelPickerMenu.querySelector('.tk-label-manager-new').value.trim();
      if (newName && !taskLabelCatalog().some(function(name) { return name.toLocaleLowerCase() === newName.toLocaleLowerCase(); })) {
        TK_LABELS.push(newName);
        persistTaskLabelCatalog();
        renderTaskLabelManager();
      }
      return;
    }
    var removeCatalog = e.target.closest('[data-label-delete]');
    if (removeCatalog) {
      var oldName = removeCatalog.getAttribute('data-label-delete');
      var index = TK_LABELS.indexOf(oldName);
      if (index >= 0) TK_LABELS.splice(index, 1);
      tkGetTasks().forEach(function(task) {
        if ((task.labels || []).includes(oldName)) tkUpdateTask(task.id, { labels: task.labels.filter(function(name) { return name !== oldName; }) });
      });
      delete taskLabelColors[oldName];
      persistTaskLabelCatalog();
      refreshTaskLabelDisplay();
      if (labelPickerMenu) renderTaskLabelManager();
      return;
    }
    var option = e.target.closest('[data-label-option]');
    var create = e.target.closest('[data-label-create]');
    if (!option && !create) return;
    var task = tkGetTasks().find(function(t) { return t.id === labelPickerTaskId; });
    if (!task) return;
    var name = option ? option.getAttribute('data-label-option') : create.getAttribute('data-label-create');
    var selected = task.labels || [];
    if (create && !TK_LABELS.includes(name)) { TK_LABELS.push(name); persistTaskLabelCatalog(); }
    updateTaskLabels(task, selected.includes(name) ? selected.filter(function(label) { return label !== name; }) : selected.concat(name));
    var search = labelPickerMenu && labelPickerMenu.querySelector('.tk-label-search');
    if (search) {
      if (create) search.value = '';
      renderTaskLabelChoices(search.value);
      search.focus({ preventScroll:true });
    }
  });
  labelPickerMenu.addEventListener('change', function(e) {
    var colorName = e.target.getAttribute('data-label-color');
    if (colorName) {
      taskLabelColors[colorName] = e.target.value;
      persistTaskLabelCatalog();
      refreshTaskLabelDisplay();
      return;
    }
    var oldName = e.target.getAttribute('data-label-rename');
    if (!oldName) return;
    var nextName = e.target.value.trim();
    if (!nextName || nextName === oldName || taskLabelCatalog().some(function(name) { return name.toLocaleLowerCase() === nextName.toLocaleLowerCase(); })) {
      e.target.value = oldName;
      return;
    }
    var index = TK_LABELS.indexOf(oldName);
    if (index >= 0) TK_LABELS[index] = nextName;
    else TK_LABELS.push(nextName);
    tkGetTasks().forEach(function(task) {
      if ((task.labels || []).includes(oldName)) tkUpdateTask(task.id, { labels: task.labels.map(function(name) { return name === oldName ? nextName : name; }) });
    });
    taskLabelColors[nextName] = taskLabelColors[oldName] || taskLabelColor(oldName);
    delete taskLabelColors[oldName];
    persistTaskLabelCatalog();
    refreshTaskLabelDisplay();
    if (labelPickerMenu) renderTaskLabelManager();
  });
  document.body.appendChild(labelPickerMenu);
  renderTaskLabelChoices('');
  var rect = trigger.getBoundingClientRect();
  labelPickerMenu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - labelPickerMenu.offsetWidth - 8)) + 'px';
  labelPickerMenu.style.top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - labelPickerMenu.offsetHeight - 8)) + 'px';
  trigger.setAttribute('aria-expanded', 'true');
  labelPickerMenu.querySelector('input').focus({ preventScroll:true });
}
function propPicker(name, currentVal, options, isDate) {
  var display = isDate ? (currentVal || '—') : (options.find(function (o) { return o.value === currentVal; }) || {}).label || '—';
  if (isDate) {
    return '<div class="tk-prop-row"><span>' + name + '</span><input type="date" class="tk-prop-edit" data-prop="' + propFieldKeys[name] + '" value="' + escapeHtml(currentVal || '') + '"></div>';
  }
  propPickerOptions[name] = { options: options, currentVal: currentVal, key: propFieldKeys[name] };
  return '<div class="tk-prop-row"><span>' + name + '</span><div class="tk-prop-display" data-prop-name="' + escapeHtml(name) + '">' + (name === '处理人' ? '<input class="tk-prop-assignee-input" type="text" value="' + escapeHtml(display === '—' ? '' : display) + '" placeholder="处理人" aria-label="处理人" role="combobox" aria-expanded="false" autocomplete="off">' : escapeHtml(display)) + '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div></div>';
}
function renderTaskArtifact(artifact) {
  return '<details class="tk-artifact">' +
        '<summary class="tk-artifact-summary">' +
          '<span class="tk-artifact-icon"><img src="' + (_artifactIcons[artifact.id] || _iconDocument) + '" width="16" height="16" alt=""></span>' +
          '<span class="tk-artifact-title">' + escapeHtml(artifact.type) + '</span>' +
          '<span class="tk-artifact-type">预览</span>' +
          '<svg class="tk-artifact-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' +
        '</summary>' +
        '<div class="tk-artifact-preview">' +
          '<p class="tk-artifact-subtitle">' + escapeHtml(artifact.summary) + '</p><div class="tk-artifact-meta">记录人 ' + escapeHtml(artifact.author) + ' · ' + escapeHtml(artifact.date) + '</div>' +
          artifact.sections.map(function (section) {
            return '<div class="tk-artifact-section"><strong>' + escapeHtml(section.heading) + '</strong><p>' + escapeHtml(section.text) + '</p></div>';
          }).join('') +
        '</div></details>';
}
function renderTaskArtifactSummary(artifacts) {
  return '<div class="tk-report-artifacts-summary"><strong>阶段产物 · ' + artifacts.length + ' 项</strong><span>'
    + escapeHtml(artifacts.length ? artifacts.map(function (artifact) { return artifact.type; }).join('、') : '尚无已完成阶段的产物')
    + '</span></div>';
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
        return '<button type="button" class="tk-subtask-row" data-subtask-open="' + c.id + '"><span class="tk-subtask-status" data-tooltip="' + escapeHtml(st.name || '待处理') + '" role="img" aria-label="' + escapeHtml(st.name || '待处理') + '">' + statusSvg(c.status) + '</span><span class="tk-subtask-title">' + escapeHtml(c.title) + '</span><span class="tk-subtask-meta">' + escapeHtml(tkGetPerson(c.assignee).name) + '</span></button>';
      }).join('')
    + '</div></div>';
}

function renderDemoReviewReport(t, artifacts) {
  var report = t.reviewReport;
  if (!report) return '';
  return '<section class="tk-agent-report" aria-label="智能体执行结果报告">'
    + '<div class="tk-agent-report-head"><span class="tk-agent-report-mark" aria-hidden="true">✦</span><div class="tk-agent-report-heading"><strong>' + escapeHtml(report.teamName) + '</strong><span>智能体专家团执行结果报告</span></div><span class="tk-agent-report-state">' + (t.status === 'in_review' ? '待人工审核' : '已提交') + '</span></div>'
    + '<div class="tk-agent-report-meta">' + escapeHtml(report.runId) + ' · ' + escapeHtml(report.completedAt) + '</div>'
    + '<p class="tk-agent-report-summary">' + escapeHtml(report.summary) + '</p>'
    + '<div class="tk-agent-report-label">交付与验证</div><ul class="tk-agent-report-evidence">' + report.evidence.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul>'
    + renderTaskArtifactSummary(artifacts)
    + '<div class="tk-agent-report-review"><strong>请人工审核</strong><span>' + escapeHtml(report.review) + '</span></div>'
    + '<details class="tk-agent-report-members"><summary>查看 ' + report.members.length + ' 位专家的执行记录</summary><div class="tk-agent-report-member-list">'
    + report.members.map(function (member) { return '<div class="tk-agent-report-member"><span class="tk-agent-report-avatar">' + escapeHtml(member.name.slice(0, 1)) + '</span><div><div class="tk-agent-report-member-name">' + escapeHtml(member.name) + (member.lead ? '<em>组长</em>' : '') + '</div><p>' + escapeHtml(member.result) + '</p></div></div>'; }).join('')
    + '</div></details></section>';
}

function renderDemoBlockedRun(t, artifacts) {
  var run = t.blockedRun;
  if (!run) return '';
  return '<section class="tk-blocked-run" aria-label="智能体失败运行记录">'
    + '<div class="tk-blocked-run-top"><span class="tk-blocked-run-avatar" aria-hidden="true">' + escapeHtml(run.agentName.slice(0, 1)) + '</span>'
    + '<div class="tk-blocked-run-main"><div class="tk-blocked-run-identity"><strong>' + escapeHtml(run.agentName) + '</strong><span>' + escapeHtml(run.teamName) + '</span></div>'
    + '<div class="tk-blocked-run-summary"><span class="tk-blocked-run-failed" role="status"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 4.5v4M8 11.2h.01"/></svg>运行失败</span>'
    + '<span class="tk-blocked-run-duration">' + escapeHtml(run.duration) + '</span><span class="tk-blocked-run-date">' + escapeHtml(run.failedAt) + '</span></div>'
    + '<p class="tk-blocked-run-reason">' + escapeHtml(run.reason) + '</p>'
    + '<details class="tk-blocked-run-activity"><summary>查看动态 · ' + run.steps.length + ' 个步骤<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></summary>'
    + '<ol class="tk-blocked-run-steps">' + run.steps.map(function (step, index) { return '<li class="' + (index === run.steps.length - 1 ? 'is-failed' : '') + '"><span class="tk-blocked-run-step-icon" aria-hidden="true">' + (index === run.steps.length - 1 ? '!' : '✓') + '</span><div><strong>' + escapeHtml(step[0]) + '</strong><p>' + escapeHtml(step[1]) + '</p></div></li>'; }).join('') + '</ol></details>'
    + renderTaskArtifactSummary(artifacts)
    + '<div class="tk-blocked-run-next"><strong>下一步</strong><span>' + escapeHtml(run.next) + '</span></div>'
    + (t.status === 'blocked' ? '<button type="button" class="tk-blocked-run-retry" data-action="blocked-retry"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M13 7a5 5 0 1 1-1.5-3.5M13 2v4H9"/></svg>重试任务</button>' : '')
    + '</div></div></section>';
}

function renderDemoCompletedRun(t, artifacts) {
  var run = t.completedRun;
  if (!run) return '';
  return '<section class="tk-blocked-run tk-completed-run" aria-label="智能体成功运行记录">'
    + '<div class="tk-blocked-run-top"><span class="tk-blocked-run-avatar" aria-hidden="true">' + escapeHtml(run.agentName.slice(0, 1)) + '</span>'
    + '<div class="tk-blocked-run-main"><div class="tk-blocked-run-identity"><strong>' + escapeHtml(run.agentName) + '</strong><span>' + escapeHtml(run.teamName) + '</span></div>'
    + '<div class="tk-blocked-run-summary"><span class="tk-blocked-run-failed" role="status"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="m5 8 2 2 4-4"/></svg>运行完成</span>'
    + '<span class="tk-blocked-run-duration">' + escapeHtml(run.duration) + '</span><span class="tk-blocked-run-date">' + escapeHtml(run.completedAt) + '</span></div>'
    + '<p class="tk-blocked-run-reason">' + escapeHtml(run.result) + '</p>'
    + '<details class="tk-blocked-run-activity"><summary>查看动态 · ' + run.steps.length + ' 个步骤<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></summary>'
    + '<ol class="tk-blocked-run-steps">' + run.steps.map(function (step) { return '<li><span class="tk-blocked-run-step-icon" aria-hidden="true">✓</span><div><strong>' + escapeHtml(step[0]) + '</strong><p>' + escapeHtml(step[1]) + '</p></div></li>'; }).join('') + '</ol></details>'
    + renderTaskArtifactSummary(artifacts)
    + '</div></div></section>';
}

function renderDemoTaskMaterials(t, artifacts) {
  var project = CV_PROJECTS.find(function (row) { return row.id === t.project; });
  var team = PRESET_TEAMS.find(function (row) { return row.id === project?.defaultTeam; });
  var stateLabel = t.status === 'in_progress' ? '执行中' : t.status === 'in_review' ? '待审核'
    : t.status === 'done' ? '已完成' : t.status === 'blocked' ? '已阻塞'
    : t.status === 'cancelled' ? '已取消' : '待执行';
  return '<section class="tk-agent-report tk-agent-report--materials" aria-label="智能体专家团执行资料">'
    + '<div class="tk-agent-report-head"><span class="tk-agent-report-mark" aria-hidden="true">✦</span><div class="tk-agent-report-heading"><strong>' + escapeHtml(team?.name || '任务专家团') + '</strong><span>智能体专家团执行资料</span></div><span class="tk-agent-report-state">' + stateLabel + '</span></div>'
    + renderTaskArtifactSummary(artifacts) + '</section>';
}

function renderTaskRunHeader(t) {
  var run = getDemoRunHeader(t);
  if (!run) return '';
  var agent = run.tone === 'idle'
    ? '<span class="tk-run-agent-empty">' + escapeHtml(run.agentName) + '</span>'
    : '<span class="tk-run-agent-avatar" aria-hidden="true">' + escapeHtml(run.agentName.slice(0, 1)) + '</span><span class="tk-run-agent-name">' + escapeHtml(run.agentName) + '</span>';
  return '<div class="tk-run-header tk-run-header--' + run.tone + '" aria-label="运行阶段：' + escapeHtml(run.stage) + '；处理智能体：' + escapeHtml(run.agentName) + '">'
    + '<span class="tk-run-stage"><i aria-hidden="true"></i>' + escapeHtml(run.stage) + '</span>'
    + '<span class="tk-run-agent">' + agent + '</span></div>';
}

function renderTaskRunIndicator(status) {
  if (status === 'running' || status === 'dispatched') return '<svg class="tk-feed-run-spinner" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 1.5a6.5 6.5 0 1 1-6.5 6.5"/></svg>';
  if (status === 'queued') return '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 4.5v4l2.5 1.5"/></svg>';
  if (status === 'waiting_local_directory') return '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M6 5v6m4-6v6"/></svg>';
  return statusSvg(status === 'failed' ? 'blocked' : status === 'cancelled' ? 'cancelled' : 'done');
}

function renderTaskRunFeedback(run) {
  var active = ['queued','dispatched','waiting_local_directory','running'].includes(run.status);
  var summary = active ? run.summary : '查看执行过程 · ' + run.steps.length + ' 个步骤';
  return '<details class="tk-feed-run tk-feed-run--' + run.status + '"><summary aria-label="' + escapeHtml(run.label + '，' + summary) + '">'
    + '<span class="tk-feed-run-indicator" aria-hidden="true">' + renderTaskRunIndicator(run.status) + '</span>'
    + (active ? '<span class="sr-only">' + escapeHtml(run.label) + '</span>' : '<span class="tk-feed-run-status">' + escapeHtml(run.label) + '</span>')
    + '<span class="tk-feed-run-summary"' + (active ? ' role="status"' : '') + ' title="' + escapeHtml(summary) + '">' + escapeHtml(summary) + '</span>'
    + (run.steps.length ? '<span class="tk-feed-run-duration">' + escapeHtml(run.duration) + '</span>' : '')
    + '<svg class="tk-feed-run-chevron" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></summary>'
    + '<div class="tk-feed-run-steps">' + (run.steps.length ? run.steps.map(function (step) {
      var kindLabel = ({thinking:'思考',tool:'执行',result:'结果',error:'错误'})[step.kind] || '步骤';
      return '<details class="tk-feed-run-step is-' + step.state + '"><summary><span class="tk-feed-step-icon" aria-hidden="true">' + (step.state === 'failed' ? '!' : step.state === 'running' ? '◌' : '✓') + '</span>'
        + '<span class="tk-feed-step-summary" title="' + escapeHtml(step.summary) + '">' + escapeHtml(step.summary) + '</span><small>' + kindLabel + '</small>'
        + '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></summary>'
        + '<p>' + escapeHtml(step.detail) + '</p></details>';
    }).join('') : '<p class="tk-feed-run-empty">暂无执行记录。</p>') + '</div></details>';
}

function renderTaskAgentFeedEntry(task, entry, artifacts) {
  var expert = EXPERTS.find(function (item) { return item.id === entry.expertId; });
  var stageArtifacts = artifacts.filter(function (artifact) { return artifact.stageId === entry.stageId; });
  var showRunFeedback = entry.state === 'running' || entry.state === 'blocked';
  return '<article class="tk-feed-card tk-feed-card--agent is-' + entry.state + '" aria-label="专家执行：' + escapeHtml(entry.stage) + '">'
    + '<header class="tk-feed-card-head tk-feed-card-head--agent"><img class="tk-feed-avatar tk-feed-avatar--agent" src="' + escapeHtml(xav(expert?.k)) + '" alt="">'
    + '<strong>' + escapeHtml(entry.author) + '</strong><span class="tk-feed-run-stage">· ' + escapeHtml(entry.stage) + '</span><time>' + escapeHtml(entry.time) + '</time></header>'
    + '<div class="tk-feed-card-content">'
    + (showRunFeedback ? renderTaskRunFeedback(getDemoStageRun(task, entry)) : '')
    + (entry.state === 'running' ? '' : '<p class="' + (entry.state === 'blocked' ? 'tk-feed-run-error' : '') + '">' + escapeHtml(entry.state === 'blocked' ? task.blockedRun?.reason || entry.text : entry.text) + '</p>')
    + (stageArtifacts.length ? '<div class="tk-delivery-artifacts"><span class="tk-delivery-artifacts-label">本阶段产物</span><div class="tk-artifacts-list">'
      + stageArtifacts.map(renderTaskArtifact).join('') + '</div></div>' : '')
    + '</div></article>';
}

function renderTaskPreRunFeedback(task) {
  var pending = getDemoPreRun(task);
  if (!pending) return '';
  return '<div class="tk-feed-pre-run" role="status"><span class="tk-feed-run-indicator" aria-hidden="true">' + renderTaskRunIndicator(task.status === 'cancelled' ? 'cancelled' : 'queued') + '</span>'
    + '<div><strong>' + escapeHtml(pending.label) + '</strong><p>' + escapeHtml(pending.summary) + '</p></div></div>';
}

function renderTaskHumanFeedEntry(event) {
  var entry = event.entry;
  var author = event.type === 'delivery' ? entry.author : tkGetPerson(entry.authorId).name;
  var content = event.type === 'delivery' ? entry.text : entry.text || '';
  var subject = event.type === 'delivery' ? entry.stage : '';
  return '<article class="tk-feed-card tk-feed-card--human" aria-label="' + escapeHtml(author) + '的评论">'
    + '<header class="tk-feed-card-head"><span class="tk-feed-avatar tk-feed-avatar--human" aria-hidden="true">' + escapeHtml(author.slice(0, 1)) + '</span>'
    + '<strong>' + escapeHtml(author) + '</strong><time>' + escapeHtml(event.time) + '</time></header>'
    + '<div class="tk-feed-card-content">' + (subject ? '<span class="tk-feed-comment-context">' + escapeHtml(subject) + '</span>' : '')
    + '<p>' + escapeHtml(content) + '</p></div></article>';
}

function feedLeadIcon(event) {
  var entry = event.entry;
  if (event.type === 'status') return statusSvg(entry.to);
  if (event.type === 'delivery') {
    var sid = entry.stageId || '';
    if (sid === 'status-flow' || /状态/.test(entry.stage)) return statusSvg('in_progress');
    if (sid === 'kickoff' || /创建/.test(entry.stage)) return statusSvg('planned');
    if (sid === 'assignee') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--text-soft);flex:none"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
    if (sid === 'comment' || /沟通/.test(entry.stage)) return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--text-soft);flex:none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
    if (sid === 'progress' || /进度/.test(entry.stage)) return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--text-soft);flex:none"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
    return '<span class="tk-feed-activity-avatar" aria-hidden="true">' + escapeHtml((entry.author || '?').slice(0, 1)) + '</span>';
  }
  return statusSvg(entry.status || 'in_progress');
}

function taskStatusActivityEvents(task, activity) {
  var lastExpert = activity.filter(function (entry) { return entry.expertId; }).at(-1);
  var initialStatus = task.initialStatus || task.status;
  var creator = tkGetPerson(task.createdBy).name;
  var assignee = tkGetPerson(task.assignee).name;
  var transitions = [];
  function add(from, to, time, author) {
    transitions.push({ type:'status', time:time, entry:{ from:from, to:to, author:author } });
  }
  if (lastExpert && ['in_review','done'].includes(initialStatus)) {
    add('in_progress', 'in_review', task.reviewReport?.completedAt || task.createDate + ' 16:40', lastExpert.author);
  }
  if (initialStatus === 'done') add('in_review', 'done', task.createDate + ' 17:00', assignee);
  if (initialStatus === 'blocked' && lastExpert) add('in_progress', 'blocked', lastExpert.time, lastExpert.author);
  if (initialStatus === 'cancelled') add('backlog', 'cancelled', task.createDate + ' 09:16', creator);
  (task.statusHistory || []).forEach(function (change) {
    add(change.from, change.to, change.time, tkGetPerson(change.authorId).name);
  });
  return transitions;
}

function taskActivityMessage(event) {
  var entry = event.entry;
  if (event.type === 'status') return '状态从 ' + tkGetStatusName(entry.from) + ' 改为 ' + tkGetStatusName(entry.to);
  if (event.type === 'delivery') {
    if (entry.stageId === 'kickoff') return '创建了这个任务';
    if (entry.stageId === 'status-flow') return '状态从 ' + tkGetStatusName('backlog') + ' 改为 ' + tkGetStatusName('in_progress');
    if (entry.stageId === 'assignee') {
      var assigneeName = entry.text.match(/「([^」]+)」/)?.[1];
      return assigneeName ? '分配给 ' + assigneeName : '更改了负责人';
    }
    return entry.stage + ' · ' + entry.text;
  }
  if (entry.kind === 'status' && entry.fromStatus) return '状态从 ' + tkGetStatusName(entry.fromStatus) + ' 改为 ' + tkGetStatusName(entry.status);
  return entry.text || '更新了任务';
}

var _expandedActivityIds = new Set();
var _collapsedActivityIds = new Set();
var _showOlderActivityIds = new Set();
var ACTIVITY_VISIBLE_LIMIT = 8;

function renderTaskSystemFeedGroup(events, isLatest) {
  var id = 'act-' + events[0].time.replace(/[^0-9]/g, '') + '-' + events.length;
  var userExpanded = _expandedActivityIds.has(id);
  var userCollapsed = _collapsedActivityIds.has(id);
  var expanded = userExpanded ? true : userCollapsed ? false : isLatest;
  var count = events.length;
  if (!expanded) {
    return '<div class="tk-feed-activity-block" data-activity-id="' + id + '">'
      + '<button type="button" class="tk-feed-activity-toggle" data-activity-toggle="' + id + '"><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m6 3 5 5-5 5"/></svg>'
      + '<span>' + count + ' 条动态</span></button></div>';
  }
  var hiddenOlder = isLatest && !_showOlderActivityIds.has(id) && count > ACTIVITY_VISIBLE_LIMIT
    ? count - ACTIVITY_VISIBLE_LIMIT : 0;
  var visible = hiddenOlder > 0 ? events.slice(-ACTIVITY_VISIBLE_LIMIT) : events;
  var showHeader = hiddenOlder === 0;
  return '<div class="tk-feed-activity-block" data-activity-id="' + id + '">'
    + (showHeader ? '<button type="button" class="tk-feed-activity-toggle" data-activity-toggle="' + id + '"><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m3 6 5 5 5-5"/></svg><span>' + count + ' 条动态</span></button>' : '')
    + (hiddenOlder > 0 ? '<button type="button" class="tk-feed-activity-toggle tk-feed-activity-more" data-activity-older="' + id + '"><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m6 3 5 5-5 5"/></svg><span>显示更多旧动态（' + hiddenOlder + ' 条）</span></button>' : '')
    + '<div class="tk-feed-activity-rows">'
    + visible.map(function (event) {
      var entry = event.entry;
      var author = event.type === 'delivery' || event.type === 'status' ? entry.author : tkGetPerson(entry.authorId).name;
      var message = taskActivityMessage(event);
      return '<div class="tk-feed-activity-row"><span class="tk-feed-activity-lead">' + feedLeadIcon(event) + '</span>'
        + '<strong>' + escapeHtml(author) + '</strong><span class="tk-feed-activity-message" title="' + escapeHtml(message) + '">' + escapeHtml(message) + '</span>'
        + '<time>' + escapeHtml(event.time) + '</time></div>';
    }).join('') + '</div></div>';
}

function renderTaskComments(t) {
  var comments = t.comments || [];
  var project = CV_PROJECTS.find(function (row) { return row.id === t.project; });
  var activity = createDeliveryActivity(t, project, {
    creator:tkGetPerson(t.createdBy).name,
    blockedReason:t.blockedRun?.reason,
    assigneeName:tkGetPerson(t.assignee).name,
  });
  var completedStages = new Set(activity.filter(function (entry) { return entry.state === 'done'; }).map(function (entry) { return entry.stageId; }));
  var artifacts = tkGetTaskArtifacts(t).filter(function (artifact) { return completedStages.has(artifact.stageId); });
  var reportHtml = renderDemoReviewReport(t, artifacts) + renderDemoBlockedRun(t, artifacts) + renderDemoCompletedRun(t, artifacts);
  if (!reportHtml) reportHtml = renderDemoTaskMaterials(t, artifacts);
  if (legacyDetailPreview) {
    /* 废弃页面只保留旧版评论列表，不渲染新版才有的智能体执行报告与专家团交付过程动态 */
    if (!comments.length) return '<div class="tk-drawer-comments-empty">暂无评论</div>';
    return comments.slice().reverse().map(function (entry) {
      var author = tkGetPerson(entry.authorId).name;
      var summary = '流转至「' + tkGetStatusName(entry.status) + '」，处理人「' + tkGetPerson(entry.assignee).name + '」';
      return '<div class="tk-drawer-comment">'
        + '<div class="tk-drawer-comment-head"><span class="tk-drawer-comment-author">' + escapeHtml(author) + '</span><span class="tk-drawer-comment-time">' + escapeHtml(entry.createdAt) + '</span></div>'
        + (entry.kind === 'comment' ? '' : '<div class="tk-drawer-comment-action">' + escapeHtml(summary) + '</div>')
        + (entry.text ? '<div class="tk-drawer-comment-text">' + escapeHtml(entry.text) + '</div>' : '')
        + '</div>';
    }).join('');
  }
  var events = activity.map(function (entry, index) {
    return { type:'delivery', time:entry.time, index:index, entry:entry };
  }).concat(taskStatusActivityEvents(t, activity).map(function (event, index) {
    return Object.assign({index:activity.length + index}, event);
  }), comments.map(function (entry, index) {
    return { type:'comment', time:entry.createdAt || '', index:activity.length + 10 + index, entry:entry };
  })).sort(function (left, right) {
    return left.time.localeCompare(right.time) || left.index - right.index;
  });
  if (!events.length) return reportHtml || '<div class="tk-drawer-comments-empty">暂无动态</div>';
  var sections = [];
  events.forEach(function (event) {
    var isAgent = event.type === 'delivery' && event.entry.expertId;
    var isComment = event.type === 'comment' && event.entry.kind === 'comment'
      || event.type === 'delivery' && ['comment', 'progress'].includes(event.entry.stageId);
    if (!isAgent && !isComment) {
      var previous = sections[sections.length - 1];
      if (previous?.kind === 'system') previous.events.push(event);
      else sections.push({ kind:'system', events:[event] });
    } else sections.push({ kind:isAgent ? 'agent' : 'comment', event:event });
  });
  var latestSystemIndex = -1;
  sections.forEach(function (section, index) { if (section.kind === 'system') latestSystemIndex = index; });
  return reportHtml + '<div class="tk-feed" aria-label="任务动态">' + sections.map(function (section, index) {
    if (section.kind === 'system') return renderTaskSystemFeedGroup(section.events, index === latestSystemIndex);
    if (section.kind === 'agent') return renderTaskAgentFeedEntry(t, section.event.entry, artifacts);
    return renderTaskHumanFeedEntry(section.event);
  }).join('') + renderTaskPreRunFeedback(t) + '</div>';
}

function renderTaskCommentComposer() {
  return '<div class="tk-comment-composer" aria-label="发表评论">'
    + '<textarea class="tk-comment-composer-input" rows="2" placeholder="留下评论… 使用 @ 提及人员、智能体或专家团成员" aria-label="评论内容" aria-autocomplete="list" aria-controls="tkMentionPanel"></textarea>'
    + '<div class="tk-comment-composer-foot">'
      + '<span class="tk-comment-composer-hint">⌘ / Ctrl + Enter 发送</span>'
      + '<button type="button" class="tk-comment-composer-attach" data-action="comment-attach" aria-label="添加任务附件" title="添加任务附件"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>'
      + '<button type="button" class="tk-comment-composer-send" data-action="comment-send" aria-label="发送评论" title="发送评论" disabled><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7M12 5v14"/></svg></button>'
    + '</div></div>';
}

function sendTaskComment() {
  if (!state.drawerTaskId) return;
  var task = tkGetTasks().find(function (row) { return row.id === state.drawerTaskId; });
  var input = els.tkDrawerBody.querySelector('.tk-comment-composer-input');
  var text = input?.value.trim();
  if (!task || !text) return;
  tkUpdateTask(task.id, { comments:(task.comments || []).concat({
    kind:'comment', authorId:tkCurrentUserId(), createdAt:taskCommentTimestamp(),
    status:task.status, assignee:task.assignee, text:text,
  }) });
  closeMentionPanel();
  render();
  openDrawer(task.id);
  els.tkDrawerBody.querySelector('.tk-comment-composer-input')?.focus();
}

function taskCommentTimestamp() {
  var now = new Date();
  function pad(value) { return String(value).padStart(2, '0'); }
  return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' '
    + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
}

function openDrawer(taskId, legacyMode) {
  closeTaskLabelPicker();
  var t = tkGetTasks().find(function (x) { return x.id === taskId; });
  if (!t) return;
  if (!tkProjectsForCurrentUser().some(function (project) { return project.id === t.project; })) { toast('未加入该项目，无法查看任务', 'warning'); return; }
  if (legacyMode === true) legacyDetailPreview = true;
  else if (lastOpenedTaskId !== taskId) legacyDetailPreview = false;
  lastOpenedTaskId = taskId;
  if (flowAssigneeDraft.taskId !== taskId) {
    var savedAssignee = tkPeopleInProject(t.project).some(function (person) { return person.id === t.flowAssignee; }) ? t.flowAssignee : '';
    flowAssigneeDraft = { taskId: taskId, assigneeId: savedAssignee };
  }
  state.drawerTaskId = taskId;
  els.tkDrawer.setAttribute('data-task-id', String(taskId));
  var person = tkGetPerson(t.assignee);
  var creator = tkGetPerson(t.createdBy);
  var statusOpts = TK_STATUSES.map(function (s) { return { value: s.id, label: s.name }; });
  var priOpts = TK_PRIORITIES.map(function (p) { return { value: p.id, label: p.name }; });
  var peopleOpts = tkPeopleInProject(t.project).map(function (p) { return { value: p.id, label: p.name }; });
  var projOpts = tkProjectsForCurrentUser().map(function (p) { return { value: p.id, label: p.name }; });
  els.tkDrawerTitle.textContent = t.title;
  els.tkDrawerCode.textContent = '#' + t.code;
  els.tkDrawer.classList.toggle('tk-drawer--legacy', legacyDetailPreview);
  els.tkDrawerBody.innerHTML =
    '<div class="tk-drawer-main"><div class="tk-drawer-main-inner">' +
      '<div class="tk-drawer-tabs">' +
        '<button type="button" class="tk-drawer-tab active" data-tab="info">基础信息</button>' +
        '<button type="button" class="tk-drawer-tab" data-tab="changelog">变更日志</button>' +
      '</div>' +
      '<div class="tk-drawer-tab-content active" data-tab-content="info">' +
        (legacyDetailPreview ? '<div class="tk-legacy-detail-note">废弃页面 · 旧版任务详情</div>' : '') +
        '<div class="tk-drawer-desc" contenteditable="true" data-field="desc">' + escapeHtml(t.desc || '点击添加描述…') + '</div>' +
        '<div class="tk-drawer-attachments">' +
          '<div class="tk-attach-dropzone" id="tkAttachDropzone" role="button" tabindex="0" data-tooltip="添加附件（支持粘贴、拖拽）" aria-label="添加附件（支持粘贴、拖拽）">' +
            '<input type="file" id="tkAttachInput" multiple style="display:none">' +
            '<svg class="tk-attach-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>' +
          '</div>' +
          '<div class="tk-attach-list" id="tkAttachList"></div>' +
        '</div>' +
        renderSubtasksSection(t) +
        '<div class="tk-drawer-comments"><div class="tk-drawer-comments-head"><div class="tk-drawer-comments-title">动态</div>' + (legacyDetailPreview ? '' : renderTaskRunHeader(t)) + '</div>' +
          renderTaskComments(t) +
          (legacyDetailPreview ? '<div class="tk-drawer-flow-fields">' +
            '<div class="tk-flow-field"><span class="tk-flow-field-label">状态</span><div class="tk-flow-pills">' +
              TK_STATUSES.map(function(s) { return '<button type="button" class="tk-flow-pill' + (s.id === t.status ? ' active' : '') + '" data-flow-status="' + s.id + '">' + s.name + '</button>'; }).join('') +
            '</div></div>' +
            '<div class="tk-flow-field"><span class="tk-flow-field-label">处理人</span><div class="tk-flow-field-value tk-flow-field-lg' + (flowAssigneeDraft.assigneeId ? '' : ' is-placeholder') + '" data-flow-prop="assignee"><input class="tk-flow-field-text" type="text" value="' + (flowAssigneeDraft.assigneeId ? escapeHtml(tkGetPerson(flowAssigneeDraft.assigneeId).name) : '') + '" placeholder="请选择" aria-label="处理人" role="combobox" aria-expanded="false" autocomplete="off"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></div></div>' +
          '</div>' +
          '<div class="tk-drawer-comment-input"><textarea placeholder="输入评论… 使用 @ 提及人员"></textarea></div>' +
          '<button class="tk-drawer-flow-btn" data-action="flow">流转</button>' : renderTaskCommentComposer()) +
        '</div>' +
      '</div>' +
      '<div class="tk-drawer-tab-content" data-tab-content="changelog" hidden>' +
        '<div class="tk-drawer-changelog-list">' +
          '<div class="tk-drawer-changelog-item"><span class="tk-drawer-changelog-time">' + escapeHtml(t.createDate + ' 09:30:00') + '</span><span class="tk-drawer-changelog-user">' + escapeHtml(creator.name) + '</span>创建了任务</div>' +
          '<div class="tk-drawer-changelog-item"><span class="tk-drawer-changelog-time">' + escapeHtml(t.createDate + ' 10:15:30') + '</span><span class="tk-drawer-changelog-user">' + escapeHtml(creator.name) + '</span>状态变更为「' + escapeHtml(tkGetStatusName(t.status)) + '」</div>' +
        '</div>' +
      '</div>' +
    '</div></div>' +
    '<div class="tk-drawer-sidebar" id="tkDrawerSidebar">' +
      '<div class="tk-drawer-prop-list" id="tkDrawerPropList">' +
        propPicker('状态', t.status, statusOpts) +
        propPicker('处理人', t.assignee, peopleOpts) +
        propPicker('项目', t.project, projOpts) +
        propPicker('优先级', t.priority, priOpts) +
        propPicker('截止日期', t.dueDate, null, true) +
        '<div class="tk-prop-row"><span>标签</span>' + renderTaskLabelTrigger(t) + '</div>' +
      '</div>' +
      '<div class="tk-prop-row"><span>创建者</span><span class="tk-prop-val">' + escapeHtml(creator.name) + '</span></div>' +
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
    dz.onkeydown = function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); }
    };
    dz.ondragover = function(e) { e.preventDefault(); dz.classList.add('dragover'); };
    dz.ondragleave = function() { dz.classList.remove('dragover'); };
    dz.ondrop = function(e) { e.preventDefault(); dz.classList.remove('dragover'); renderFiles(e.dataTransfer.files); };
    els.tkDrawer.onpaste = function(e) {
      if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
      var files = Array.from((e.clipboardData && e.clipboardData.items) || []).map(function(item) {
        return item.kind === 'file' ? item.getAsFile() : null;
      }).filter(Boolean);
      if (files.length) { e.preventDefault(); renderFiles(files); }
    };
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
export function openLegacyTaskDetail() {
  var available = tkGetTasks().filter(function (task) {
    return tkProjectsForCurrentUser().some(function (project) { return project.id === task.project; });
  });
  var task = available.find(function (row) { return row.id === lastOpenedTaskId; })
    || available.find(function (row) { return row.status === 'in_review'; }) || available[0];
  showView('tasks');
  if (task) openDrawer(task.id, true);
  else toast('暂无可预览的任务详情', 'warning');
}
function closeDrawer() {
  closeTaskLabelPicker();
  closeMentionPanel();
  document.querySelectorAll('.tk-drawer-more-menu').forEach(function (m) { m.remove(); });
  els.tkDrawerMore.setAttribute('aria-expanded', 'false');
  flowAssigneeDraft = { taskId: null, assigneeId: '' };
  legacyDetailPreview = false;
  lastOpenedTaskId = null;
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
  if (section === 'creator') return TK_PEOPLE.map(function (p) { return { value:p.id, label:p.name, count:tasks.filter(function (t) { return t.createdBy === p.id; }).length }; });
  if (section === 'project') return tkProjectsForCurrentUser().map(function (p) { return { value:p.id, label:p.name, count:tasks.filter(function (t) { return t.project === p.id; }).length }; });
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
    return '<button type="button" class="tk-filter-option" data-filter-value="' + escapeHtml(option.value) + '" aria-pressed="' + checked + '"><span class="tk-filter-check">' + (checked ? '✓' : '') + '</span>' + (activeFilterSection === 'status' ? statusSvg(option.value) : '') + '<span>' + escapeHtml(option.label) + '</span>' + (option.count ? '<span class="tk-filter-count">' + option.count + ' 个任务</span>' : '') + '</button>';
  }).join('');
}
function openFilterPanel() {
  closeDisplayChoiceMenu();
  closeFieldSettings();
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
    listFieldOrder: state.listFieldOrder.slice(),
    listFieldVisibility: Object.assign({}, state.listFieldVisibility),
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
  var enableTaskSearch = function () { els.tkSearch.removeAttribute('readonly'); };
  els.tkSearch.addEventListener('pointerdown', enableTaskSearch, { once:true });
  els.tkSearch.addEventListener('keydown', enableTaskSearch, { once:true });
  els.tkSearch.addEventListener('input', function () { state.search = this.value; render(); });

  /* 布局切换 */
  $$('.tk-layout-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.layout = this.getAttribute('data-layout');
      if (state.viewMode === 'split' && state.layout === 'board') state.viewMode = 'slide';
      render();
    });
  });

  /* 显示设置 Popover */
  els.tkDisplayBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (els.tkDisplayPopover.classList.contains('hidden')) {
      closeFilterPanel();
      closeDisplayChoiceMenu();
      closeFieldSettings();
      els.tkDisplayPopover.classList.remove('hidden');
      els.tkDisplayBtn.classList.add('active');
      els.tkDisplayBtn.setAttribute('aria-expanded', 'true');
      renderDisplayControls();
      positionPopover(els.tkDisplayPopover, els.tkDisplayBtn, true);
    } else {
      closeDisplayChoiceMenu();
      closeFieldSettings();
      els.tkDisplayPopover.classList.add('hidden');
      els.tkDisplayBtn.classList.remove('active');
      els.tkDisplayBtn.setAttribute('aria-expanded', 'false');
    }
  });
  els.tkFieldsBtn.addEventListener('click', function () {
    closeDisplayChoiceMenu();
    var opening = els.tkFieldsPopover.classList.contains('hidden');
    if (!opening) { closeFieldSettings(); return; }
    els.tkFieldsPopover.classList.remove('hidden');
    els.tkFieldsPopover.classList.toggle('flip', els.tkDisplayPopover.getBoundingClientRect().left < 320);
    els.tkFieldsPopover.style.maxHeight = Math.max(240, window.innerHeight - els.tkDisplayPopover.getBoundingClientRect().top - 12) + 'px';
    els.tkFieldsBtn.setAttribute('aria-expanded', 'true');
    els.tkFieldsSearch.value = '';
    renderFieldSettings();
    els.tkFieldsSearch.focus({ preventScroll:true });
  });
  els.tkFieldsClose.addEventListener('click', closeFieldSettings);
  var enableFieldsSearch = function() { els.tkFieldsSearch.removeAttribute('readonly'); };
  els.tkFieldsSearch.addEventListener('pointerdown', enableFieldsSearch, { once:true });
  els.tkFieldsSearch.addEventListener('keydown', enableFieldsSearch, { once:true });
  els.tkFieldsSearch.addEventListener('input', renderFieldSettings);
  els.tkFieldsList.addEventListener('change', function(e) {
    var id = e.target.getAttribute('data-field-visible');
    if (!id || id === 'title') return;
    state.listFieldVisibility[id] = e.target.checked;
    render();
  });
  var draggedFieldId = null;
  els.tkFieldsList.addEventListener('dragstart', function(e) {
    var item = e.target.closest('.tk-fields-item');
    if (!item) return;
    draggedFieldId = item.getAttribute('data-field-id');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedFieldId);
    item.classList.add('dragging');
  });
  els.tkFieldsList.addEventListener('dragover', function(e) {
    var item = e.target.closest('.tk-fields-item');
    if (!draggedFieldId || !item || item.getAttribute('data-field-id') === draggedFieldId) return;
    e.preventDefault();
    els.tkFieldsList.querySelectorAll('.drop-before,.drop-after').forEach(function(row) { row.classList.remove('drop-before','drop-after'); });
    item.classList.add(e.clientY < item.getBoundingClientRect().top + item.offsetHeight / 2 ? 'drop-before' : 'drop-after');
  });
  els.tkFieldsList.addEventListener('drop', function(e) {
    var item = e.target.closest('.tk-fields-item');
    if (!draggedFieldId || !item) return;
    e.preventDefault();
    var targetId = item.getAttribute('data-field-id');
    if (targetId !== draggedFieldId) {
      var after = item.classList.contains('drop-after');
      state.listFieldOrder = state.listFieldOrder.filter(function(id) { return id !== draggedFieldId; });
      state.listFieldOrder.splice(state.listFieldOrder.indexOf(targetId) + (after ? 1 : 0), 0, draggedFieldId);
      renderFieldSettings();
      render();
    }
    draggedFieldId = null;
  });
  els.tkFieldsList.addEventListener('dragend', function() {
    draggedFieldId = null;
    els.tkFieldsList.querySelectorAll('.dragging,.drop-before,.drop-after').forEach(function(row) { row.classList.remove('dragging','drop-before','drop-after'); });
  });
  els.tkFieldsList.addEventListener('keydown', function(e) {
    var grip = e.target.closest('.tk-fields-grip');
    if (!grip || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    var item = grip.closest('.tk-fields-item');
    var id = item.getAttribute('data-field-id');
    var next = e.key === 'ArrowUp' ? item.previousElementSibling : item.nextElementSibling;
    if (!next || !next.classList.contains('tk-fields-item')) return;
    var targetId = next.getAttribute('data-field-id');
    state.listFieldOrder = state.listFieldOrder.filter(function(key) { return key !== id; });
    state.listFieldOrder.splice(state.listFieldOrder.indexOf(targetId) + (e.key === 'ArrowDown' ? 1 : 0), 0, id);
    renderFieldSettings();
    render();
    var moved = els.tkFieldsList.querySelector('[data-field-id="' + id + '"] .tk-fields-grip');
    if (moved) moved.focus();
  });
  els.tkGroupSelect.addEventListener('click', function () { openDisplayChoiceMenu(this, 'group'); });
  els.tkGroupSelect.addEventListener('keydown', function(e) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openDisplayChoiceMenu(this, 'group', e.key === 'ArrowDown' ? 'first' : 'last'); } });
  els.tkViewModeSelect.addEventListener('change', function () {
    state.viewMode = this.value;
    if (state.viewMode === 'split') state.layout = 'list';
    render();
  });
  els.tkSortSelect.addEventListener('click', function () { openDisplayChoiceMenu(this, 'sort'); });
  els.tkSortSelect.addEventListener('keydown', function(e) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openDisplayChoiceMenu(this, 'sort', e.key === 'ArrowDown' ? 'first' : 'last'); } });
  els.tkSortDirection.addEventListener('click', function () {
    closeDisplayChoiceMenu();
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
  els.tkDisplayPopover.addEventListener('click', function (e) {
    if (!e.target.closest('#tkGroupSelect,#tkSortSelect')) closeDisplayChoiceMenu();
    e.stopPropagation();
  });
  document.addEventListener('click', function () {
    closeDisplayChoiceMenu();
    if (!els.tkDisplayPopover.classList.contains('hidden')) {
      closeFieldSettings();
      els.tkDisplayPopover.classList.add('hidden');
      els.tkDisplayBtn.classList.remove('active');
      els.tkDisplayBtn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('focusin', function(e) {
    if (displayChoiceMenu && !displayChoiceMenu.contains(e.target) && e.target !== displayChoiceTrigger) closeDisplayChoiceMenu();
  });

  /* 新建任务（列头 + 模态弹窗） */
  els.tkToolbarNew.addEventListener('click', function () { openTaskModal(null); });
  els.tkModalClose.addEventListener('click', closeTaskModal);
  els.tkModalSave.addEventListener('click', function () {
    if (!els.tkMcAgentPanel.classList.contains('hidden')) tkMcAgentSendMsg();
    else saveTask();
  });
  els.tkFormProject.addEventListener('change', function () { refreshFormAssignees(tkCurrentUserId()); });
  els.tkModalOverlay.addEventListener('click', function (e) { if (e.target === this) closeTaskModal(); });
  els.tkModalOverlay.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!els.tkMcAgentPanel.classList.contains('hidden')) tkMcAgentSendMsg();
      else saveTask();
    }
    if (e.key === 'Escape') closeTaskModal();
  });
  if (els.tkMcExpand) els.tkMcExpand.addEventListener('click', function () { els.tkModalOverlay.classList.toggle('tk-mc-fullscreen'); });
  if (els.tkMcAgent) els.tkMcAgent.addEventListener('click', function () { tkMcSetMode(els.tkMcAgentPanel.classList.contains('hidden') ? 'agent' : 'manual'); });

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
    var lastRightClickToggle = 0;
    function toggleTaskStartAction() {
      taskStartLegacy = !taskStartLegacy;
      try { localStorage.setItem(TASK_START_LEGACY_KEY, taskStartLegacy ? '1' : '0'); } catch (err) { /* 本地存储不可用时仅在当前页面生效 */ }
      renderTaskStartAction();
      lastRightClickToggle = Date.now();
    }
    els.tkDrawerChat.addEventListener('pointerdown', function (e) {
      if (e.button !== 2) return;
      e.preventDefault();
      toggleTaskStartAction();
    });
    els.tkDrawerChat.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      if (Date.now() - lastRightClickToggle > 500) toggleTaskStartAction();
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
  document.addEventListener('pointerdown', function (e) {
    if (mentionPanel?.classList.contains('show') && !e.target.closest('.tk-mention-panel, .tk-drawer-comment-input, .tk-comment-composer')) closeMentionPanel();
  });
  els.tkDrawerBody.addEventListener('input', function (e) {
    if (!e.target.matches('textarea')) return;
    var ta = e.target;
    if (ta.classList.contains('tk-comment-composer-input')) {
      var send = els.tkDrawerBody.querySelector('.tk-comment-composer-send');
      if (send) send.disabled = !ta.value.trim();
    }
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
    if (e.isComposing || e.keyCode === 229) return;
    if (e.target.matches('.tk-comment-composer-input') && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      sendTaskComment();
      return;
    }
    if (!mentionPanel || !mentionPanel.classList.contains('show')) return;
    if (!e.target.matches('textarea')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex(mentionIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex(mentionIndex - 1);
    } else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      if (!mentionItems.length) return;
      e.preventDefault();
      insertMention(e.target, mentionItems[mentionIndex].getAttribute('data-mention-name'));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeMentionPanel();
    }
  });

  /* 属性区折叠 */
  els.tkDrawerBody.addEventListener('click', function (e) {
    if (e.target.closest('[data-action="comment-send"]')) { sendTaskComment(); return; }
    if (e.target.closest('[data-action="blocked-retry"]')) {
      var retryTask = tkGetTasks().find(function (row) { return row.id === state.drawerTaskId; });
      if (retryTask?.status === 'blocked' && retryTask.blockedRun) {
        tkUpdateTask(retryTask.id, { status:'in_progress', comments:(retryTask.comments || []).concat({
          kind:'comment', authorId:tkCurrentUserId(), createdAt:taskCommentTimestamp(),
          status:'in_progress', assignee:retryTask.assignee, text:'已提交重试，保留上次失败运行记录。',
        }) });
        render();
        openDrawer(retryTask.id);
      }
      return;
    }
    if (e.target.closest('[data-action="comment-attach"]')) {
      els.tkDrawerBody.querySelector('#tkAttachInput')?.click();
      return;
    }
    var labelRemove = e.target.closest('[data-label-remove]');
    if (labelRemove && state.drawerTaskId) {
      var taskForRemove = tkGetTasks().find(function(t) { return t.id === state.drawerTaskId; });
      if (taskForRemove) updateTaskLabels(taskForRemove, (taskForRemove.labels || []).filter(function(name) { return name !== labelRemove.getAttribute('data-label-remove'); }));
      if (labelPickerMenu && labelPickerMode === 'pick') renderTaskLabelChoices(labelPickerMenu.querySelector('.tk-label-search').value);
      return;
    }
    var labelTrigger = e.target.closest('.tk-label-picker');
    if (labelTrigger) {
      if (labelPickerMenu) closeTaskLabelPicker();
      else openTaskLabelPicker(labelTrigger);
      return;
    }
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
            var patch = {}; patch[prop] = val;
            if (prop === 'project') {
              var task = tkGetTasks().find(function (row) { return row.id === state.drawerTaskId; });
              if (task && !tkPeopleInProject(val).some(function (person) { return person.id === task.assignee; })) patch.assignee = tkPeopleInProject(val)[0]?.id || '';
            }
            tkUpdateTask(state.drawerTaskId, patch);
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
      var flowTask = tkGetTasks().find(function (task) { return task.id === state.drawerTaskId; });
      var fopts = fprop === 'status' ? TK_STATUSES : tkPeopleInProject(flowTask?.project);
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
              tkUpdateTask(state.drawerTaskId, { flowAssignee: o.id });
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
            authorId: tkCurrentUserId(),
            createdAt: taskCommentTimestamp(),
            status: flowTask.status,
            assignee: flowAssigneeDraft.assigneeId,
            text: commentText,
          };
          tkUpdateTask(state.drawerTaskId, {
            assignee: flowAssigneeDraft.assigneeId,
            flowAssignee: '',
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
    if (e.target.matches('.tk-label-picker') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (labelPickerMenu) closeTaskLabelPicker(); else openTaskLabelPicker(e.target);
    }
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
  els.tkDrawer.addEventListener('blur', function (e) {
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
    closeDisplayChoiceMenu();
    closeFieldSettings();
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
    var tab = e.target.closest('.list-page-tab');
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
        state.layout = view.layout || 'list';
        state.showSubtasks = view.showSubtasks !== false;
        state.cardProperties = Object.assign({}, state.cardProperties, view.cardProperties || {});
        if (Array.isArray(view.listFieldOrder)) state.listFieldOrder = Array.from(new Set(view.listFieldOrder.filter(function(id) { return DEFAULT_LIST_FIELD_ORDER.includes(id); }))).concat(DEFAULT_LIST_FIELD_ORDER.filter(function(id) { return !view.listFieldOrder.includes(id); }));
        if (view.listFieldVisibility) state.listFieldVisibility = Object.assign({ labels:false }, view.listFieldVisibility);
        $$('[data-layout]', els.tkLayoutToggle).forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-layout') === state.layout); });
      }
      updateFilterButton();
      render();
    }
  });
  els.tkViewTabs.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.list-page-tab')) { e.preventDefault(); e.target.click(); }
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
      if (action === 'assignee') {
        var selectedTasks = tkGetTasks().filter(function (task) { return state.selectedIds.has(task.id); });
        var candidates = selectedTasks.length ? tkPeopleInProject(selectedTasks[0].project).filter(function (person) {
          return selectedTasks.every(function (task) { return tkPeopleInProject(task.project).some(function (member) { return member.id === person.id; }); });
        }) : [];
        els.tkBulkAssigneeMenu.innerHTML = candidates.map(function (person) { return '<div class="tk-popover-item" data-assignee="' + person.id + '">' + escapeHtml(person.name) + '</div>'; }).join('') || '<div class="tk-popover-item">所选任务没有共同的项目成员</div>';
        showPopover(els.tkBulkAssigneeMenu, this);
        return;
      }
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
      state.selectedIds.forEach(function (id) { var task = tkGetTasks().find(function (row) { return row.id === id; }); if (task && tkPeopleInProject(task.project).some(function (person) { return person.id === assignee; })) tkUpdateTask(id, { assignee: assignee }); });
      hidePopover();
      render();
    }
  });

  /* 详情面板内：添加子任务 / 打开子任务 */
  els.tkDrawerBody.addEventListener('click', function (e) {
    var actToggle = e.target.closest('[data-activity-toggle]');
    if (actToggle) {
      var aid = actToggle.getAttribute('data-activity-toggle');
      if (_expandedActivityIds.has(aid)) { _expandedActivityIds.delete(aid); _collapsedActivityIds.add(aid); }
      else if (_collapsedActivityIds.has(aid)) { _collapsedActivityIds.delete(aid); _expandedActivityIds.add(aid); }
      else { _expandedActivityIds.add(aid); }
      openDrawer(state.drawerTaskId);
      return;
    }
    var actOlder = e.target.closest('[data-activity-older]');
    if (actOlder) {
      _showOlderActivityIds.add(actOlder.getAttribute('data-activity-older'));
      openDrawer(state.drawerTaskId);
      return;
    }
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
      else if (state.groupBy === 'assignee' && groupKey !== 'unassigned') { var memberProject = tkProjectsForCurrentUser().find(function (project) { return tkPeopleInProject(project.id).some(function (person) { return person.id === groupKey; }); }); if (memberProject) { els.tkFormProject.value = memberProject.id; refreshFormAssignees(groupKey); } }
      else if (state.groupBy === 'project' && groupKey !== 'none') { els.tkFormProject.value = groupKey; refreshFormAssignees(); }
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
      inlineCreateRow.innerHTML = '<td colspan="' + visibleListColumnCount() + '"><div class="tk-inline-create-form"><input type="text" class="tk-inline-input" id="tkInlineTitle" placeholder="输入任务标题"><div class="tk-inline-dropdown" data-value="" id="tkInlineAssigneeWrap"><div class="tk-inline-select is-placeholder" id="tkInlineAssigneeBtn"><input type="text" id="tkInlineAssigneeInput" placeholder="处理人" aria-label="处理人" role="combobox" aria-expanded="false" autocomplete="off"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></div><div class="tk-inline-dropdown-menu" id="tkInlineAssigneeMenu" hidden>' + tkPeopleInProject(projectListProjectId || tkProjectsForCurrentUser()[0]?.id).map(function(p){return '<div class="tk-inline-dropdown-item" data-assignee="'+p.id+'">'+p.name+'</div>';}).join('') + '</div></div><button class="tk-inline-save" id="tkInlineSave">确定</button><button class="tk-inline-cancel" id="tkInlineCancel">取消</button></div></td>';
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
    if (labelPickerMenu && !e.target.closest('.tk-label-popover') && !e.target.closest('.tk-label-picker')) closeTaskLabelPicker();
    var ffm = document.querySelector('.tk-flow-field-menu.show');
    if (ffm && !e.target.closest('.tk-flow-field-menu') && !e.target.closest('[data-flow-prop]')) {
      ffm.remove();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var hadOpen = false;
    if (displayChoiceMenu) { closeDisplayChoiceMenu(true); e.preventDefault(); return; }
    if (!els.tkFilterPanel.classList.contains('hidden')) { closeFilterPanel(); hadOpen = true; }
    if (els.tkViewMenu && !els.tkViewMenu.classList.contains('hidden')) { closeViewMenu(); hadOpen = true; }
    if (!els.tkFieldsPopover.classList.contains('hidden')) { closeFieldSettings(); e.preventDefault(); return; }
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
    if (displayChoiceMenu) closeDisplayChoiceMenu();
    var ffm = document.querySelector('.tk-flow-field-menu.show');
    if (ffm) ffm.remove();
  }, true);
  window.addEventListener('resize', function () {
    if (displayChoiceMenu) closeDisplayChoiceMenu();
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
  restoreTaskLabelCatalog();
  tkPruneOrphanTasks();
  tkSyncPeople();
  cacheEls();
  try { taskStartLegacy = localStorage.getItem(TASK_START_LEGACY_KEY) === '1'; } catch (e) { taskStartLegacy = false; }
  renderTaskStartAction();
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
  document.addEventListener('cv-workspace-change',()=>{
    tkPruneOrphanTasks();
    tkEnsureWorkspaceDemoTasks();
    Object.assign(taskViewState,{activeViewId:'all',scope:'all',filters:[],search:''});
    fillSelects();render();
  });
  // 隐藏骨架在旧初始化结束后接线，不改变现有事件顺序和首屏。
  initExecutionPlan();
  initMyWork();
  initWorkItemDetail();
  initReviewCenter();
  initIssueNavigation({ issue: openIssueDetail, workItem: renderWorkItemDetail, review: renderReviewCenter });
}
var propFieldKeys = { '状态':'status', '处理人':'assignee', '项目':'project', '优先级':'priority', '截止日期':'dueDate' };
