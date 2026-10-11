import needsColumnIcon from '../../../../assets/figma/task-board/needs.svg';
import runningColumnIcon from '../../../../assets/figma/task-board/running.svg';
import doneColumnIcon from '../../../../assets/figma/task-board/done.svg';
import boardMoreIcon from '../../../../assets/figma/task-list/more.svg';
import { taskExecutionStages } from '../task-execution.js';
import { $$ } from '../../../core/dom.js';
import { createDeliveryActivity } from '../../collab/delivery-activity.js';
import { taskConversationNeedsReply } from '../../composer.js';
import { AV_KEYS, EX, xav } from '../../expert/data.js';
import { taskExecutorTeam } from '../../expert/task-team.js';
import { renderListPageTabs } from '../../shared/list-page-tabs.js';
import { TK_FILTER_FIELDS, TK_OPERATORS, tkCanStartTask, tkCurrentStageHandlerId, tkCurrentUserId, tkGetPriorityObj, tkGetProjectName, tkGetViews, tkProjectById } from '../data.js';
import { taskCardAction, taskListKind } from '../list-kind.js';
import { applyTaskListFieldSettings, taskListVisibleColumnCount } from '../list-template.js';
import { taskViewState } from '../ui-state.js';
import { buildTaskTree, filterListStatus, getFilteredTasks, getGroupedTasks, listStatusPool, renderListTreeNodes, renderTreeNodes } from './filters.js';
import { render, showBoardOrList, showEmpty } from './layout.js';
import { filterOptionsFor, filterSections } from './menus.js';
import { pageState } from './page-state.js';
import { LIST_STATUS_TABS, els, state } from './state.js';
import { escapeHtml, fmtDate, statusSvg } from './utils.js';
/* 任务页 · 渲染：视图标签栏、看板、列表、筛选 Chip（拆分自 tasks-v2/index.js，逻辑未改） */
/* ---------- 渲染：视图标签栏 ---------- */
export function renderViewBar() {
  var listMode = state.layout === 'list' && !pageState.projectListMode;
  var viewAction = els.tkViewAdd.closest('.tk-view-action');
  if (viewAction) viewAction.hidden = listMode;
  if (listMode) {
    var groups = getGroupedTasks(getFilteredTasks(), 'status');
    els.tkViewTabs.innerHTML = LIST_STATUS_TABS.map(function (tab) {
      var groupKey = tab.id === 'running' ? 'in_progress' : tab.id;
      var count = groups.find(function (group) { return group.key === groupKey; })?.tasks.length || 0;
      var active = tab.id === state.listStatusTab;
      return '<button type="button" class="list-page-tab' + (active ? ' active' : '') + '" data-list-status="' + tab.id + '" role="tab" aria-selected="' + active + '"><span class="list-page-tab-name">' + (tab.id === 'needs' ? '需我处理' : tab.name) + '</span><span class="tk-list-tab-count">' + count + '</span></button>';
    }).join('');
    els.tkViewOverflow.classList.add('hidden');
    return;
  }
  els.tkViewTabs.innerHTML = renderListPageTabs(tkGetViews().map(function(view){return {id:view.id,name:view.name,removable:!view.builtin};}),state.activeViewId,'data-view-id');
}

/* ---------- 渲染：看板 ---------- */
export function renderBoard() {
  var tasks = getFilteredTasks();
  if (tasks.length === 0) { showEmpty(); return; }
  showBoardOrList();
  var groups = getGroupedTasks(tasks);
  var html = groups.map(function (g) {
    var tree = buildTaskTree(g.tasks);
    var cards = renderTreeNodes(tree.roots, tree.childrenMap, 0);
    var collapsed = taskViewState.collapsedBoardGroups.has(g.key);
    var toggleLabel = collapsed ? '展开分组' : '折叠分组';
    var arrow = collapsed ? '18 15 12 9 6 15' : '6 9 12 15 18 9';
    return '<div class="tk-board-col' + (collapsed ? ' is-collapsed' : '') + '" data-group-key="' + g.key + '">'
      + '<div class="tk-board-col-head"><div class="tk-board-col-head-left">'
      + (['needs','backlog','in_progress','done'].includes(g.key) ? '<img src="' + (g.key === 'done' ? doneColumnIcon : g.key === 'in_progress' ? runningColumnIcon : needsColumnIcon) + '" width="16" height="16" alt="">' : statusSvg(g.key))
      + '<span class="tk-board-col-name">' + escapeHtml(g.name) + '</span>'
      + '<span class="tk-board-col-count">' + g.tasks.length + '</span>'
      + '</div><div class="tk-board-col-head-right">'
      + '<button class="tk-board-col-toggle" data-toggle-col data-tooltip="' + toggleLabel + '" aria-label="' + toggleLabel + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="' + arrow + '"/></svg></button>'
      + '</div></div>'
      + '<div class="tk-board-col-body' + (collapsed ? ' collapsed' : '') + '">' + cards + '</div>'
      + '</div>';
  }).join('');
  els.tkBoardScroll.innerHTML = html;
}

export function renderCard(t, opts) {
  opts = opts || {};
  var depth = opts.depth || 0;
  var hasChildren = !!opts.hasChildren;
  var isCollapsed = !!opts.isCollapsed;
  var childCount = opts.childCount || 0;
  var pri = tkGetPriorityObj(t.priority);
  var props = state.cardProperties;
  var sel = state.selectedIds.has(t.id) ? ' selected' : '';
  var toggle = hasChildren ? '<button class="tk-card-toggle' + (isCollapsed ? ' is-collapsed' : '') + '" data-tk-toggle="' + t.id + '" aria-expanded="' + !isCollapsed + '" aria-label="' + (isCollapsed ? '展开子任务' : '折叠子任务') + '"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 7.5 5 5 5-5"/></svg></button>' : '';
  var spacer = !hasChildren ? '<span class="tk-card-spacer"></span>' : '';
  var childBadge = hasChildren ? '<span class="tk-card-child-count"' + (isCollapsed ? '' : ' style="visibility:hidden"') + '>' + childCount + '</span>' : '';
  var extraCls = (depth ? ' tk-card--child' : '') + (hasChildren ? ' tk-card--parent' : '');
  var project = tkProjectById(t.project);
  var team = taskExecutorTeam(t, project);
  var isBacklog = t.status === 'backlog';
  var teamAvatarHtml, footExtraHtml;
  if (isBacklog) {
    var members = team ? (team.members || []).map(function(id){ return EX[id]; }).filter(Boolean) : [];
    teamAvatarHtml = members.length
      ? '<span class="tk-card-team-avatars">' + members.slice(0, 4).map(function(m){ return '<img class="tk-card-team-avatar" src="' + xav(m.k) + '" alt="" title="' + escapeHtml(m.name) + '">'; }).join('') + (members.length > 4 ? '<span class="tk-card-team-avatars-more">+' + (members.length - 4) + '</span>' : '') + '</span>'
      : (team ? '<img class="tk-card-team-avatar" src="' + xav(AV_KEYS[Math.abs(t.id) % AV_KEYS.length]) + '" alt="" title="' + escapeHtml(team.name) + '">' : '');
    footExtraHtml = (props.priority ? '<span class="tk-card-priority">' + escapeHtml(pri.name) + '</span>' : '')
      + (props.startDate && t.startDate ? '<span class="tk-card-due">' + fmtDate(t.startDate) + '</span>' : '')
      + (props.project && t.project ? '<span class="tk-card-project">' + escapeHtml(tkGetProjectName(t.project)) + '</span>' : '');
  } else {
    teamAvatarHtml = team ? '<img class="tk-card-team-avatar" src="' + xav(AV_KEYS[Math.abs(t.id) % AV_KEYS.length]) + '" alt="" title="' + escapeHtml(team.name) + '">' : '';
    var activity = createDeliveryActivity(t, project || {});
    var stages = activity.filter(function(e){ return e.expertId; });
    var latest = stages.length ? stages[stages.length - 1] : null;
    footExtraHtml = latest ? '<span class="tk-card-stage">' + escapeHtml(latest.stage) + '</span>' : '';
  }
  var needsReply = taskConversationNeedsReply(t);
  var cardState = taskListKind(t);
  var stateBadge = ['in_review','blocked'].includes(t.status) || cardState.kind === 'question'
    ? '<span class="tk-card-status" data-kind="' + cardState.kind + '">' + escapeHtml(cardState.badge) + '</span>' : '';
  var cardAction = isBacklog ? '<button type="button" class="tk-card-action tk-card-action--primary" data-card-play="' + t.id + '"' + (tkCanStartTask(t) ? '' : ' aria-disabled="true" title="仅当前阶段处理人可开始"') + '>开始</button>'
    : t.status === 'in_review' ? '<button type="button" class="tk-card-action tk-card-action--primary" data-card-review="' + t.id + '">查看产物</button>'
    : t.status === 'blocked' && tkCurrentStageHandlerId(t) === tkCurrentUserId() ? '<button type="button" class="tk-card-action tk-card-action--primary" data-card-retry="' + t.id + '">重试</button>'
    : needsReply ? '<button type="button" class="tk-card-action" data-card-session="' + t.id + '">回复</button>' : '';
  if (!pageState.projectListMode && document.querySelector('#cv-tasks-current #tkBoardScroll') === els.tkBoardScroll) {
    var plan = taskExecutionStages(t);
    var currentStage = plan.find(function (stage) { return stage.id === t.executionStageId; }) || (t.status === 'done' ? plan.at(-1) : plan[0]);
    var sharedAction = taskCardAction(t);
    var actionLabels = { [sharedAction.action]:sharedAction.label };
    var boardActionName = sharedAction.action;
    var boardAction = actionLabels[boardActionName] ? '<button type="button" class="tk-card-action" data-list-task-action="' + boardActionName + '" data-list-task-id="' + t.id + '">' + actionLabels[boardActionName] + '</button>' : '';
    var boardStatus = t.status === 'done' ? '' : '<span class="tk-card-status" data-kind="' + cardState.kind + '">' + escapeHtml(cardState.kind === 'review' ? '待确认' : cardState.badge) + '</span>';
    return '<div class="tk-card tk-card--figma' + sel + extraCls + (t.status === 'blocked' ? ' tk-card--blocked' : '') + '" draggable="true" data-task-id="' + t.id + '">'
      + '<button type="button" class="tk-card-more" data-card-more="' + t.id + '" aria-label="更多任务操作" aria-haspopup="menu"><img src="' + boardMoreIcon + '" width="16" height="16" alt=""></button>'
      + '<div class="tk-card-top-row">' + toggle + boardStatus + '<div class="tk-card-code">' + escapeHtml(t.code) + (props.project && t.project ? ' · ' + escapeHtml(tkGetProjectName(t.project)) : '') + '</div>' + childBadge + '</div>'
      + '<div class="tk-card-copy"><div class="tk-card-title">' + escapeHtml(t.title) + '</div>'
      + (t.desc ? '<div class="tk-card-description" title="' + escapeHtml(t.desc) + '">' + escapeHtml(t.desc) + '</div>' : '')
      + '</div><div class="tk-card-tags">' + (t.issueType ? '<span class="tk-card-type">' + escapeHtml(t.issueType) + '</span>' : '') + (props.priority ? '<span class="tk-card-priority" data-priority="' + escapeHtml(t.priority) + '">' + escapeHtml(pri.name) + '</span>' : '') + (props.startDate && t.startDate ? '<span class="tk-card-due">' + fmtDate(t.startDate) + '</span>' : '') + '</div>'
      + '<div class="tk-card-foot"><div class="tk-card-foot-left">' + teamAvatarHtml + '<span class="tk-card-stage">' + escapeHtml(currentStage?.name || '等待安排') + '</span></div><div class="tk-card-foot-actions">' + (boardAction || '<span class="tk-card-running-hint">' + escapeHtml(cardState.hint) + '</span>') + '</div></div></div>';
  }
  return '<div class="tk-card' + sel + extraCls + '" draggable="true" data-task-id="' + t.id + '">'
    + '<button class="tk-card-more" data-card-more="' + t.id + '" data-tooltip="更多操作" aria-label="更多操作"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>'
    + '<div class="tk-card-top-row">' + toggle + spacer + '<div class="tk-card-code">' + escapeHtml(t.code) + '</div>' + childBadge + stateBadge + '</div>'
    + '<div class="tk-card-title">' + escapeHtml(t.title) + '</div>'
    + (props.description && t.desc ? '<div class="tk-card-description">' + escapeHtml(t.desc) + '</div>' : '')
    + '<div class="tk-card-foot"><div class="tk-card-foot-left">' + teamAvatarHtml + footExtraHtml
    + '</div>' + cardAction + '</div></div>';
}

/* ---------- 渲染：列表 ---------- */
export function latestListFieldVisibility() {
  return Object.assign({}, state.listFieldVisibility, {assignee:false});
}
export function visibleListColumnCount() {
  return taskListVisibleColumnCount(state.listFieldOrder, latestListFieldVisibility());
}
export function applyListFieldSettings() {
  applyTaskListFieldSettings(els.tkListHead, els.tkListBody, state.listFieldOrder, latestListFieldVisibility());
}
export function renderList(tasks) {
  tasks = tasks || getFilteredTasks();
  if (!pageState.projectListMode) tasks = filterListStatus(tasks);
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
  var quickCreate = pageState.projectListMode ? '<tr class="tk-row-create" id="tkRowCreate"><td colspan="' + visibleListColumnCount() + '"><button class="tk-inline-create-btn" id="tkInlineCreateBtn">+ 快速新建</button></td></tr>' : '';
  els.tkListBody.innerHTML = quickCreate + html;
  updateSortArrows();
}

export function animateListSubtasks(toggleBtn) {
  var taskId = Number(toggleBtn.getAttribute('data-tk-toggle'));
  var opening = pageState.collapsedParents.has(taskId);
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
    if (opening) pageState.collapsedParents.delete(taskId);
    else pageState.collapsedParents.add(taskId);
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
      pageState.collapsedParents.add(taskId);
      render();
    });
    return;
  }

  /* 展开：先渲染子行，再从高度 0 平滑展开到自然高度 */
  pageState.collapsedParents.delete(taskId);
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
    if (th.getAttribute('data-sort') === state.sortBy && state.sortDir !== 'none' && !((state.sortBy === 'createDate' || state.sortBy === 'updatedAt') && state.sortDir === 'desc')) {
      th.classList.add('sorted');
      var span = document.createElement('span');
      span.className = 'tk-sort-arrow';
      span.textContent = state.sortDir === 'asc' ? '↑' : '↓';
      th.appendChild(span);
    }
  });
}

/* ---------- 渲染：筛选 Chip ---------- */
export function renderFilterChips() {
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
