import { TK_PEOPLE, tkGetTasks, tkGetViews, tkIsMyStageDone, tkProjectsForCurrentUser } from '../data.js';
import { taskListKind, taskNeedsMyAction } from '../list-kind.js';
import { taskViewState } from '../ui-state.js';
import { pageState } from './page-state.js';
/* 任务页 · 任务页状态、常量与元素缓存（拆分自 tasks-v2/index.js，逻辑未改） */
/* ---------- 状态 ---------- */
export var LIST_FIELDS = [
  { id:'code', name:'编号' }, { id:'title', name:'标题', required:true },
  { id:'status', name:'状态' }, { id:'type', name:'任务类型' },
  { id:'priority', name:'优先级' }, { id:'assignee', name:'处理人' },
  { id:'project', name:'项目' },
  { id:'created', name:'创建时间' },
  { id:'desc', name:'描述' },
];
export var DEFAULT_LIST_FIELD_ORDER = LIST_FIELDS.map(function(field) { return field.id; });
/* 页签按「轮到谁」划分：待我处理＝当前阶段由我开始／验收／回答提问／重试；
   其余未完成任务（AI 执行中或等待他人处理）归入执行中。 */
export var LIST_STATUS_TABS = [
  { id:'needs', name:'待我处理', match:function (task) { return taskNeedsMyAction(task); } },
  { id:'running', name:'执行中', match:function (task) { return task.status !== 'done' && task.status !== 'cancelled' && !taskNeedsMyAction(task) && !tkIsMyStageDone(task); } },
  /* 已完成：任务整体完成，或我负责的阶段已做完（后续阶段由他人处理） */
  { id:'done', name:'已完成', match:function (task) { return task.status === 'done' || tkIsMyStageDone(task); } },
];
export var state = {
  layout: 'list', viewMode: 'slide', scope: 'all', groupBy: 'status', sortBy: 'updatedAt', sortDir: 'desc',
  search: '', filters: [], selectedIds: new Set(), activeViewId: 'all',
  listStatusTab: 'needs',
  showSubtasks: true,
  cardProperties: { priority:true, description:false, assignee:true, startDate:false, project:false, childProgress:true },
  listFieldOrder: DEFAULT_LIST_FIELD_ORDER.slice(), listFieldVisibility: { desc:false },
  editingTaskId: null, drawerTaskId: null, editingParentId: null,
};
pageState.projectListMode = false;
pageState.projectListProjectId = '';
pageState.layoutBeforeProjectList = null;
pageState.viewBeforeProjectList = null;
export var els = {};
pageState.drawerPreferredWidth = null;
pageState.docPreviewCloseTimer = null;
pageState.docPreviewSavedDrawerWidth = null;
/* 产物预览支持浏览器页签式多开：docPreviewTabs 按打开顺序存产物对象，docPreviewActiveId 是当前页签。 */
pageState.docPreviewTabs = [];
pageState.listReviewPreviewTaskId = null;
pageState.listReviewPreviewArtifactId = null;
pageState.listReviewPreviewFocus = null;
pageState.docPreviewActiveId = null;
pageState.collapsedParents = new Set();
export var subtaskSectionExpanded = new Map();
pageState.flowAssigneeDraft = { taskId: null, assigneeId: '' };
pageState.taskDetailVersion = 'latest';
export var TASK_DETAIL_VERSION_STORAGE_KEY = 'lingee_tasks_detail_version';
pageState.lastOpenedTaskId = null;
pageState.drawerCloseTimer = null;
pageState.drawerOpenFrame = null;
export var DRAWER_WIDTH_STORAGE_KEY = 'lingee_tasks_drawer_width';
var VIEW_STATE_STORAGE_KEY = 'lingee_tasks_view_state';
var CARD_PROP_REV = 2; /* 卡片显示属性默认值版本：升版把存量配置一次性回落新默认 */
export var TASK_START_LEGACY_KEY = 'lingee_tasks_start_action_legacy';
export var TASK_START_PLAY_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4.7a1 1 0 0 1 1.52-.85l11 7.3a1 1 0 0 1 0 1.7l-11 7.3A1 1 0 0 1 7 19.3V4.7Z"/></svg>';
export var TASK_START_CHAT_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
pageState.taskStartLegacy = false;

/* 详情主操作与列表卡片同一口径：只有轮到当前登录人时才出现，操作按任务状态变化。 */
export function taskHeaderAction(task) {
  if (!task) return null;
  if (task.status === 'planned') return {label:'加入待开始',action:'queue'};
  var info = taskListKind(task);
  return info.primary ? {label:info.action === 'review' ? '前往确认' : info.label, action:info.action} : null;
}

function placeTaskActionButton(button, atBottom) {
  if (atBottom) {
    if (button.parentNode !== els.tkDrawerFoot) els.tkDrawerFoot.appendChild(button);
    els.tkDrawerFoot.hidden = false;
    els.tkDrawerFoot.classList.add('is-start-action');
    return;
  }
  if (button.parentNode !== els.tkDrawerHeadActions) els.tkDrawerHeadActions.insertBefore(button, els.tkDrawerMore);
  els.tkDrawerFoot.hidden = true;
  els.tkDrawerFoot.classList.remove('is-start-action');
}

export function renderTaskStartAction() {
  var button = els.tkDrawerChat;
  if (!button) return;
  if (pageState.taskDetailVersion === 'latest') {
    var task = tkGetTasks().find(function (row) { return row.id === state.drawerTaskId; });
    var action = taskHeaderAction(task);
    placeTaskActionButton(button, !!action && action.action !== 'queue');
    button.hidden = !action;
    if (!action) return;
    button.dataset.taskAction = action.action;
    button.innerHTML = '<span>' + action.label + '</span>';
    button.setAttribute('aria-label', action.label);
    return;
  }
  placeTaskActionButton(button, false);
  button.hidden = false;
  button.dataset.taskAction = 'legacy-chat';
  var label = pageState.taskStartLegacy ? '发起会话' : '开始执行';
  button.innerHTML = '<span>' + label + '</span>';
  button.setAttribute('aria-label', label);
}

export function persistViewState() {
  try {
    localStorage.setItem(VIEW_STATE_STORAGE_KEY, JSON.stringify({
      activeViewId:pageState.projectListMode ? pageState.viewBeforeProjectList?.activeViewId : state.activeViewId,
      layout:pageState.projectListMode ? pageState.layoutBeforeProjectList : state.layout,
      viewMode:pageState.projectListMode ? pageState.viewBeforeProjectList?.viewMode : state.viewMode,
      groupBy:state.groupBy,
      sortBy:state.sortBy,
      sortDir:state.sortDir,
      filters:pageState.projectListMode ? pageState.viewBeforeProjectList?.filters : state.filters,
      showSubtasks:state.showSubtasks,
      collapsedTaskIds:Array.from(pageState.collapsedParents),
      collapsedBoardGroups:Array.from(taskViewState.collapsedBoardGroups),
      cardProperties:state.cardProperties,
      cardPropRev:CARD_PROP_REV,
      listFieldOrder:state.listFieldOrder,
      listFieldVisibility:state.listFieldVisibility,
    }));
  } catch (e) { /* 本地存储不可用时仍可在当前页面切换视图 */ }
}
export function restoreViewState() {
  var saved;
  try { saved = JSON.parse(localStorage.getItem(VIEW_STATE_STORAGE_KEY) || 'null'); }
  catch (e) { return; }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
  var view = tkGetViews().find(function (v) { return v.id === saved.activeViewId; });
  state.activeViewId = view ? view.id : 'all';
  state.scope = view && ['all','members','agents','my_assigned','in_progress'].includes(view.scope) ? view.scope : 'all';
  if (['board','list'].includes(saved.layout)) state.layout = saved.layout;
  if (['slide','full','split'].includes(saved.viewMode)) state.viewMode = saved.viewMode;
  if (['status','priority','assignee','project','none'].includes(saved.groupBy)) state.groupBy = saved.groupBy;
  if (['status','priority','createDate','updatedAt','title','code','assignee','project'].includes(saved.sortBy)) state.sortBy = saved.sortBy;
  if (['asc','desc'].includes(saved.sortDir)) state.sortDir = saved.sortDir;
  if (typeof saved.showSubtasks === 'boolean') state.showSubtasks = saved.showSubtasks;
  if (Array.isArray(saved.collapsedTaskIds)) {
    var taskIds = new Set(tkGetTasks().map(function (t) { return t.id; }));
    pageState.collapsedParents = new Set(saved.collapsedTaskIds.filter(function (id) {
      return Number.isInteger(id) && taskIds.has(id);
    }));
  }
  if (Array.isArray(saved.collapsedBoardGroups)) {
    taskViewState.collapsedBoardGroups = new Set(saved.collapsedBoardGroups.filter(function (k) {
      return typeof k === 'string';
    }));
  }
  if (saved.cardProperties && typeof saved.cardProperties === 'object') {
    Object.keys(state.cardProperties).forEach(function (key) {
      if (typeof saved.cardProperties[key] === 'boolean') state.cardProperties[key] = saved.cardProperties[key];
    });
  }
  if (saved.cardPropRev !== CARD_PROP_REV) {
    /* v2：卡片项目名改默认不显示，旧存量配置一次性回落新默认；此后用户显式开启仍被尊重 */
    state.cardProperties.project = false;
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
    var fields = ['status','priority','issueType','assignee','creator','project','keyword'];
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
export function cacheEls() {
  var ids = [
    'tkViewTabs','tkViewAdd','tkViewMenu','tkViewMenuNew','tkViewManage','tkViewOverflow','tkViewOverflowBtn','tkOverflowMenu',
    'tkSearch','tkFilterBtn','tkFilterLabel','tkFilterPanel','tkFilterPanelBody','tkFilterSubmenu','tkFilterChips','tkToolbarNewGroup','tkToolbarNew','tkToolbarNewArrow','tkToolbarNewMenu','tkImportExcel',
    'tkDisplayBtn','tkDisplayPopover','tkFieldsBtn','tkFieldsPopover','tkFieldsClose','tkFieldsSearch','tkFieldsList','tkFieldsSummary','tkGroupSelect','tkViewModeSelect','tkSortSelect','tkSortDirection','tkShowSubtasks','tkCardProperties','tkCardPropsSection',
    'tkLayoutToggle','tkBody','tkBoard','tkBoardScroll','tkList','tkListBody','tkListHead','tkSplitEmpty',
    'tkCheckAll','tkEmpty','tkResetFilter','tkBulkBar','tkBulkCount','tkBulkClear',
    'tkDrawer','tkDrawerClickaway','tkDrawerResize','tkDrawerClose','tkDrawerTitle','tkDrawerCode','tkDrawerBody','tkDrawerMore','tkDrawerChat','tkDrawerHeadActions','tkDrawerFoot',
    'tkModalOverlay','tkModalClose','tkModalSave','tkModalTitle','tkMcExpand','tkMcContinue','tkMcAgent','tkMcAgentPanel','tkMcAgentChat','tkMcAgentPrompt','tkMcAgentSend',
    'tkFormTitle','tkFormDesc','tkFormStatus','tkFormPriority','tkFormAssignee','tkFormProject','tkFormDue','tkFormLabels',
    'tkSaveViewOverlay','tkSaveViewClose','tkSaveViewCancel','tkSaveViewConfirm','tkSaveViewName','tkSaveViewVisibility','tkSaveViewScope','tkSaveViewLayout','tkSaveViewSummary',
    'tkManageViewsOverlay','tkManageViewsClose','tkManageViewsCancel','tkManageList',
    'tkBulkStatusMenu','tkBulkAssigneeMenu',
    'tkListReviewOverlay','tkListReviewClose','tkListReviewTitle','tkListReviewMeta','tkListReviewTabs','tkListReviewCount','tkListReviewBody','tkListReviewRevise','tkListReviewApprove','tkListReviewHint',
    'tkImportOverlay','tkImportClose','tkImportCancel','tkImportConfirm','tkImportProject','tkImportDropZone','tkImportFileInput','tkImportFileBar','tkImportFileName','tkImportFileSize','tkImportFileRemove','tkImportPreview','tkImportPreviewLabel','tkImportPreviewHint','tkImportTableHead','tkImportTableBody','tkImportError','tkImportErrorMsg','tkDownloadTplBtn',
  ];
  ids.forEach(function (id) { els[id] = document.getElementById(id); });
}
