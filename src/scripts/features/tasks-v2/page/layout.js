import { taskConversationNeedsReply } from '../../composer.js';
import { $$ } from '../../../core/dom.js';
import { toast } from '../../../core/toast.js';
import { tkAddTask, tkCanViewTask, tkGetTasks, tkPeopleInProject, tkProjectsForCurrentUser, tkSyncPeople } from '../data.js';
import { syncDrawerClickaway } from './detail-panel.js';
import { filterListStatus, getFilteredTasks, getGroupedTasks, listStatusPool } from './filters.js';
import { openTaskModal } from './form-modal.js';
import { taskNeedsMyAction } from '../list-kind.js';
import { updateFilterButton } from './menus.js';
import { pageState } from './page-state.js';
import { applyListFieldSettings, latestListFieldVisibility, renderBoard, renderFilterChips, renderList, renderViewBar } from './render.js';
import { LIST_FIELDS, els, persistViewState, state } from './state.js';
import { closeDrawer, openDrawer } from './subtasks.js';
/* 任务页 · 空状态、布局切换、批量栏、全选、项目内列表模式、显示设置选项（拆分自 tasks-v2/index.js，逻辑未改） */
/* ---------- 渲染：空状态 / 布局切换 / 批量栏 / 全选 ---------- */
export function showEmpty() {
  els.tkBoard.classList.add('hidden'); els.tkList.classList.add('hidden'); els.tkEmpty.classList.remove('hidden');
}
export function showBoardOrList() {
  els.tkEmpty.classList.add('hidden');
  if (state.layout === 'board') { els.tkBoard.classList.remove('hidden'); els.tkList.classList.add('hidden'); }
  else { els.tkList.classList.remove('hidden'); els.tkBoard.classList.add('hidden'); }
}
function updateBulkBar() {
  var count = state.selectedIds.size;
  if (count === 0) { els.tkBulkBar.classList.add('hidden'); return; }
  els.tkBulkBar.classList.remove('hidden'); els.tkBulkCount.textContent = count;
}
export function render() {
  tkSyncPeople();
  state.selectedIds.forEach(function (id) {
    var task = tkGetTasks().find(function (item) { return item.id === id; });
    if (!tkCanViewTask(task)) state.selectedIds.delete(id);
  });
  if (state.drawerTaskId) {
    var openTask = tkGetTasks().find(function (item) { return item.id === state.drawerTaskId; });
    if (!tkCanViewTask(openTask)) closeDrawer();
  }
  var split = state.viewMode === 'split';
  if (split) state.layout = 'list';
  var tasksView = document.getElementById('view-tasks');
  tasksView?.classList.toggle('tk-list-mode', state.layout === 'list');
  tasksView?.classList.toggle('tk-project-list-mode', pageState.projectListMode);
  els.tkToolbarNewGroup.classList.remove('hidden');
  els.tkBody.classList.toggle('is-split', split);
  els.tkDrawer.classList.toggle('mode-full', state.viewMode === 'full');
  $$('[data-layout]', tasksView).forEach(function (btn) {
    var active = btn.getAttribute('data-layout') === state.layout;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  renderDisplayControls();
  updateFilterButton();
  renderViewBar();
  if (split) {
    var visibleTasks = getFilteredTasks();
    if (!pageState.projectListMode) visibleTasks = filterListStatus(visibleTasks);
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
  updateCollabReviewBadge();
}

/* 项目详情复用视图、筛选与布局控制器，离开后恢复任务页布局。 */
export function tkSetProjectListMode(active, projectId) {
  if (active === pageState.projectListMode && (!active || pageState.projectListProjectId === projectId)) return;
  if (active) {
    if (!pageState.projectListMode) {
      pageState.layoutBeforeProjectList = state.layout;
      pageState.viewBeforeProjectList = {activeViewId:state.activeViewId,scope:state.scope,filters:state.filters,search:state.search,viewMode:state.viewMode,sortBy:state.sortBy,sortDir:state.sortDir,showSubtasks:state.showSubtasks};
    }
    pageState.projectListMode = true;
    pageState.projectListProjectId = projectId || '';
    state.layout = 'list';
    state.activeViewId = 'all';state.scope = 'all';state.filters = [];state.search = '';state.viewMode = 'slide';state.sortBy = 'createDate';state.sortDir = 'desc';state.showSubtasks = true;
    if(els.tkSearch)els.tkSearch.value='';
  } else {
    pageState.projectListMode = false;
    pageState.projectListProjectId = '';
    state.layout = pageState.layoutBeforeProjectList || state.layout;
    pageState.layoutBeforeProjectList = null;
    if(pageState.viewBeforeProjectList){Object.assign(state,pageState.viewBeforeProjectList);if(els.tkSearch)els.tkSearch.value=state.search;pageState.viewBeforeProjectList=null;}
  }
  if (els.tkBody) render();
}
export function tkOpenProjectTaskCreate(projectId) {
  if (projectId !== pageState.projectListProjectId) tkSetProjectListMode(true, projectId);
  openTaskModal(null);
}
var cardPropertyOptions = [
  ['priority','优先级'],['description','描述'],['assignee','负责人'],['startDate','开始日期'],
  ['project','项目'],['childProgress','子任务进度'],
];
var displayGroupOptions = [
  ['status','状态'],['priority','优先级'],['assignee','处理人'],['project','项目'],['none','不分组'],
];
var displaySortOptions = [
  ['status','状态'],['priority','优先级'],['updatedAt','修改时间'],['createDate','创建时间'],
  ['code','编号'],['title','标题'],['assignee','处理人'],['project','项目'],
];
pageState.displayChoiceMenu = null;
pageState.displayChoiceTrigger = null;
export function closeDisplayChoiceMenu(restoreFocus) {
  if (pageState.displayChoiceMenu) pageState.displayChoiceMenu.remove();
  pageState.displayChoiceMenu = null;
  if (pageState.displayChoiceTrigger) {
    pageState.displayChoiceTrigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) pageState.displayChoiceTrigger.focus({ preventScroll:true });
  }
  pageState.displayChoiceTrigger = null;
}
export function openDisplayChoiceMenu(trigger, kind, focusEdge) {
  if (pageState.displayChoiceMenu && pageState.displayChoiceTrigger === trigger) { closeDisplayChoiceMenu(true); return; }
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
  pageState.displayChoiceMenu = menu;
  pageState.displayChoiceTrigger = trigger;
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
      state.sortDir = (state.sortBy === 'createDate' || state.sortBy === 'updatedAt' || state.sortBy === 'priority') ? 'desc' : 'asc';
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
export function renderDisplayControls() {
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
  var visibility = latestListFieldVisibility();
  els.tkFieldsSummary.textContent = state.listFieldOrder.filter(function(id) { return id === 'title' || visibility[id] !== false; }).length + ' 个字段';
}
export function renderFieldSettings() {
  var query = els.tkFieldsSearch.value.trim().toLocaleLowerCase();
  var fields = state.listFieldOrder.map(function(id) { return LIST_FIELDS.find(function(field) { return field.id === id; }); }).filter(function(field) {
    return field && field.id !== 'assignee' && field.name.toLocaleLowerCase().includes(query);
  });
  els.tkFieldsList.innerHTML = fields.length ? fields.map(function(field) {
    var checked = field.required || state.listFieldVisibility[field.id] !== false;
    return '<div class="tk-fields-item" data-field-id="' + field.id + '" draggable="true">' +
      '<span class="tk-fields-grip" role="button" tabindex="0" aria-label="调整' + field.name + '顺序">⋮⋮</span>' +
      '<label><input type="checkbox" data-field-visible="' + field.id + '"' + (checked ? ' checked' : '') + (field.required ? ' disabled' : '') + '><span>' + field.name + '</span></label>' +
      '</div>';
  }).join('') : '<div class="tk-fields-empty">没有匹配的字段</div>';
}
export function closeFieldSettings() {
  els.tkFieldsPopover.classList.add('hidden');
  els.tkFieldsBtn.setAttribute('aria-expanded', 'false');
}
export function positionPopover(popover, trigger, alignEnd) {
  var rect = trigger.getBoundingClientRect();
  var width = popover.offsetWidth;
  var left = alignEnd ? rect.right - width : rect.left;
  popover.style.left = Math.max(8, Math.min(left, window.innerWidth - width - 8)) + 'px';
  popover.style.top = Math.min(rect.bottom + 4, window.innerHeight - popover.offsetHeight - 8) + 'px';
}
export function saveInlineTask() {
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
     var projectId = pageState.projectListProjectId;
     if (!projectId || !tkProjectsForCurrentUser().some(function (project) { return project.id === projectId; })) { toast('请先加入项目再创建任务', 'warning'); render(); return; }
     tkAddTask({ id:mx+1, code:'T'+String(1000000+mx+1), title:title, desc:'', status:'backlog', priority:'medium', assignee: av || tkPeopleInProject(projectId)[0]?.id || '', project:projectId, labels:[], dueDate:'', createDate:new Date().toISOString().slice(0,10) });
    render();
    toast('创建成功', 'success');
  }, 400);
}
function updateCheckAll() {
  if (els.tkCheckAll) {
    var tasks = getFilteredTasks();
    els.tkCheckAll.checked = tasks.length > 0 && tasks.every(function (t) { return state.selectedIds.has(t.id); });
  }
}
/* 菜单徽标跟随当前视图的待我处理计数，包含管理员可见的人工待办。 */
export function updateCollabReviewBadge() {
  var badge = document.getElementById('collabReviewBadge');
  if (!badge) return;
  var count;
  if (state.layout === 'board' && !pageState.projectListMode) {
    count = getGroupedTasks(getFilteredTasks(), 'status').find(function (group) { return group.key === 'needs'; })?.tasks.length || 0;
  } else count = pageState.projectListMode ? listStatusPool().filter(taskNeedsMyAction).length : getGroupedTasks(getFilteredTasks(), 'status').find(function (group) { return group.key === 'needs'; })?.tasks.length || 0;
  badge.textContent = String(count);
  badge.style.display = count > 0 ? '' : 'none';
  badge.setAttribute('data-tooltip', count + ' 个任务需要处理');
  badge.setAttribute('aria-label', count + ' 个任务需要处理');
}
