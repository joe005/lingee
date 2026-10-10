import { $$ } from '../../../core/dom.js';
import { toast } from '../../../core/toast.js';
import { TK_PEOPLE, TK_PRIORITIES, tkAddView, tkGetViews, tkIsProjectOwner, tkProjectsForCurrentUser, tkUpdateTask } from '../data.js';
import { getFilteredTasks } from './filters.js';
import { closeDisplayChoiceMenu, closeFieldSettings, positionPopover, render } from './layout.js';
import { pageState } from './page-state.js';
import { els, state } from './state.js';
import { escapeHtml, statusSvg } from './utils.js';
/* 任务页 · 筛选菜单、视图管理、弹出菜单、拖拽（拆分自 tasks-v2/index.js，逻辑未改） */
/* ---------- 筛选菜单 ---------- */
pageState.activeFilterSection = '';
export var filterSections = [
  ['status','状态','<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>'],
  ['issueType','任务类型','<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"/>'],
  ['priority','优先级','<path d="M4 19v-2M9 19v-6M14 19V9M19 19V4"/>'],
  ['assignee','处理人','<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>'],
  ['creator','创建者','<circle cx="10" cy="8" r="4"/><path d="M3 21v-2a7 7 0 0 1 12-5M16 20l5-5M18 13l3 3"/>'],
  ['project','项目','<path d="M3 5h7l2 2h9v13H3z"/>'],
  /* 「日期」「标签」字段已去除，不提供筛选入口 */
];
export function filterOptionsFor(section) {
  /* 计数与列表实际结果同口径：按当前视图可见基准统计（跳过本分类已选筛选），
     「N 个任务」即点选该项后列表显示的数量；协作开发徽标与默认口径一致。 */
  var tasks = getFilteredTasks(section);
  if (section === 'status') return [
    ['planned','待规划'],['backlog','待开始'],['in_progress','执行中'],['in_review','待审核'],
    ['blocked','已阻塞'],['done','已完成'],
    /* 「已取消」「已办」先隐藏，不提供筛选入口 */
  ].map(function (o) { return { value:o[0], label:o[1], count:tasks.filter(function (t) { return t.status === o[0]; }).length }; });
  if (section === 'issueType') return [['需求','需求'],['缺陷','缺陷']].map(function (o) { return { value:o[0], label:o[1], count:tasks.filter(function (t) { return t.issueType === o[0]; }).length }; });
  if (section === 'priority') return TK_PRIORITIES.map(function (p) { return { value:p.id, label:p.name, count:tasks.filter(function (t) { return t.priority === p.id; }).length }; });
  if (section === 'assignee') return (tkIsProjectOwner() ? [{ value:'all', label:'全部', count:tasks.length }] : []).concat(TK_PEOPLE.map(function (p) { return { value:p.id, label:p.name, count:tasks.filter(function (t) { return t.assignee === p.id; }).length }; }));
  if (section === 'creator') return TK_PEOPLE.map(function (p) { return { value:p.id, label:p.name, count:tasks.filter(function (t) { return t.createdBy === p.id; }).length }; });
  if (section === 'project') return tkProjectsForCurrentUser().map(function (p) { return { value:p.id, label:p.name, count:tasks.filter(function (t) { return t.project === p.id; }).length }; });
  return [];
}
export function updateFilterButton() {
  var count = state.filters.length;
  els.tkFilterLabel.textContent = count ? count + ' 个筛选' : '筛选';
  els.tkFilterBtn.classList.toggle('has-filters', count > 0);
}
export function renderFilterMenu() {
  els.tkFilterPanelBody.innerHTML = filterSections.map(function (section) {
    var count = state.filters.filter(function (f) { return f.field === section[0]; }).length;
    return '<button type="button" class="tk-filter-category' + (pageState.activeFilterSection === section[0] ? ' active' : '') + '" data-filter-section="' + section[0] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + section[2] + '</svg><span>' + section[1] + '</span>' + (count ? '<span class="tk-filter-count">' + count + '</span>' : '') + '<svg class="tk-filter-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 4 8 8-8 8"/></svg></button>';
  }).join('') + (state.filters.length ? '<button type="button" class="tk-filter-reset" id="tkFilterReset">重置全部筛选</button>' : '');
  renderFilterSubmenu();
  positionFilterSubmenu();
}
function renderFilterSubmenu() {
  if (!pageState.activeFilterSection) { els.tkFilterSubmenu.classList.add('hidden'); return; }
  els.tkFilterSubmenu.classList.remove('hidden');
  els.tkFilterSubmenu.innerHTML = filterOptionsFor(pageState.activeFilterSection).map(function (option) {
    var checked = state.filters.some(function (f) { return f.field === pageState.activeFilterSection && f.value === option.value; });
    return '<button type="button" class="tk-filter-option" data-filter-value="' + escapeHtml(option.value) + '" aria-pressed="' + checked + '"><span class="tk-filter-check">' + (checked ? '✓' : '') + '</span>' + (pageState.activeFilterSection === 'status' ? statusSvg(option.value) : '') + '<span>' + escapeHtml(option.label) + '</span>' + (option.count ? '<span class="tk-filter-count">' + option.count + ' 个任务</span>' : '') + '</button>';
  }).join('');
}
function positionFilterSubmenu() {
  var activeBtn = els.tkFilterPanelBody.querySelector('.tk-filter-category.active');
  if (!activeBtn) { els.tkFilterSubmenu.style.top = ''; return; }
  var panelRect = els.tkFilterPanel.getBoundingClientRect();
  var btnRect = activeBtn.getBoundingClientRect();
  var borderTop = parseFloat(getComputedStyle(els.tkFilterPanel).borderTopWidth) || 0;
  var top = btnRect.top - panelRect.top - borderTop;
  var subH = els.tkFilterSubmenu.offsetHeight;
  if (panelRect.top + top + subH > window.innerHeight - 8) {
    top = Math.max(0, window.innerHeight - 8 - panelRect.top - subH);
  }
  els.tkFilterSubmenu.style.top = top + 'px';
}
export function openFilterPanel() {
  closeDisplayChoiceMenu();
  closeFieldSettings();
  els.tkDisplayPopover.classList.add('hidden');
  els.tkDisplayBtn.classList.remove('active');
  els.tkDisplayBtn.setAttribute('aria-expanded', 'false');
  els.tkFilterPanel.classList.remove('hidden');
  els.tkFilterBtn.classList.add('active');
  els.tkFilterBtn.setAttribute('aria-expanded', 'true');
  pageState.activeFilterSection = '';
  renderFilterMenu();
  positionPopover(els.tkFilterPanel, els.tkFilterBtn, false);
  var rect = els.tkFilterPanel.getBoundingClientRect();
  els.tkFilterSubmenu.classList.toggle('flip', rect.right + 200 > window.innerWidth);
  positionFilterSubmenu();
}
export function closeFilterPanel() {
  els.tkFilterPanel.classList.add('hidden');
  els.tkFilterBtn.classList.remove('active');
  els.tkFilterBtn.setAttribute('aria-expanded', 'false');
}
export function toggleFilterValue(field, value) {
  var index = state.filters.findIndex(function (f) { return f.field === field && f.value === value; });
  if (index >= 0) state.filters.splice(index, 1);
  else state.filters.push({ field:field, op:'eq', value:value });
  updateFilterButton(); render(); renderFilterMenu();
}

/* ---------- 视图管理 ---------- */
export function openSaveView() {
  els.tkSaveViewName.value = '';
  els.tkSaveViewScope.value = state.scope;
  els.tkSaveViewLayout.value = state.layout;
  els.tkSaveViewVisibility.value = 'private';
  els.tkSaveViewSummary.textContent = state.filters.length ? '已包含 ' + state.filters.length + ' 个筛选条件和当前显示设置' : '已包含当前显示设置';
  els.tkSaveViewOverlay.classList.remove('hidden');
  requestAnimationFrame(function () { els.tkSaveViewOverlay.classList.add('show'); });
  els.tkSaveViewName.focus();
}
export function closeSaveView() {
  els.tkSaveViewOverlay.classList.remove('show');
  setTimeout(function () { els.tkSaveViewOverlay.classList.add('hidden'); }, 200);
}
export function confirmSaveView() {
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
  toast('保存成功', 'success');
}
export function openManageViews() {
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
export function closeManageViews() {
  els.tkManageViewsOverlay.classList.remove('show');
  setTimeout(function () { els.tkManageViewsOverlay.classList.add('hidden'); }, 200);
}

/* ---------- 弹出菜单 ---------- */
var activePopover = null;
export function showPopover(el, anchor) {
  hidePopover();
  var rect = anchor.getBoundingClientRect();
  el.style.top = (rect.bottom + window.scrollY + 4) + 'px';
  el.style.left = (rect.left + window.scrollX) + 'px';
  el.classList.add('show');
  activePopover = el;
}
export function hidePopover() {
  if (activePopover) { activePopover.classList.remove('show'); activePopover = null; }
}

/* ---------- 拖拽 ---------- */
var dragTaskId = null;
export function handleDragStart(e) {
  var card = e.target.closest('.tk-card');
  if (card) {
    dragTaskId = parseInt(card.getAttribute('data-task-id'), 10);
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }
}
export function handleDragEnd(e) {
  var card = e.target.closest('.tk-card');
  if (card) card.classList.remove('dragging');
  $$('.tk-board-col-body').forEach(function (col) { col.classList.remove('drag-over'); });
  dragTaskId = null;
}
export function handleDragOver(e) {
  if (dragTaskId !== null) {
    e.preventDefault();
    var col = e.target.closest('.tk-board-col-body');
    if (col) col.classList.add('drag-over');
  }
}
export function handleDragLeave(e) {
  var col = e.target.closest('.tk-board-col-body');
  if (col) col.classList.remove('drag-over');
}
export function handleDrop(e) {
  e.preventDefault();
  var col = e.target.closest('.tk-board-col-body');
  if (!col || dragTaskId === null) return;
  col.classList.remove('drag-over');
  var boardCol = col.closest('.tk-board-col');
  var groupKey = boardCol.getAttribute('data-group-key');
  if (groupKey === 'cancelled') return;
  if (state.groupBy === 'status' && groupKey === 'needs') { toast('待我处理由任务状态和当前处理人自动归类', 'info'); return; }
  var patch = {};
  if (state.groupBy === 'status') patch.status = groupKey;
  else if (state.groupBy === 'priority') patch.priority = groupKey;
  else if (state.groupBy === 'assignee') patch.assignee = groupKey === 'unassigned' ? '' : groupKey;
  else if (state.groupBy === 'project') patch.project = groupKey === 'none' ? '' : groupKey;
  tkUpdateTask(dragTaskId, patch);
  render();
}
