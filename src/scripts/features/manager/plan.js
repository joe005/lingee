import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import {
  TASK_STATUSES, mgrAddIssue, mgrCanDeleteTask, mgrCanManageProject, mgrCreateDevTask, mgrDeleteTask, mgrCreateTask, mgrCurrentPersonId, mgrExpert, mgrHasSessionPerm, mgrIsDevTask,
  mgrPersonName, mgrProjectById, mgrProjectMembers, mgrProjectTasks, mgrRelatedTask, mgrSaveTasks, mgrSetSessionPerm, mgrTaskById,
  mgrTaskKey, mgrTeam,
} from './data.js';
import { CV_MEMBERS } from '../collab/data.js';
import { tbTeamStages } from '../collab/tb-core.js';
import { tkCurrentStageHandlerId, tkUpdateTask } from '../tasks-v2/data.js';
import { defaultStageAssigneeId } from '../tasks-v2/stage-owner.js';
import { openTaskDetail } from '../tasks-v2/index.js';
import { mgrDateGet, mgrDateSet } from './datepicker.js';
import { mgrDay, mgrEsc } from './utils.js';
/* 管理 · 项目详情「计划与任务」：状态筛选、列表 / 里程碑 / 甘特图三种视图、
   右侧滑入的任务详情，以及新建任务弹窗（核心信息 / 补充信息，研发任务可编辑执行阶段）。 */

var STATUS_CHIPS = [
  ['all', '全部'],
  ['pending', '待处理'],
  ['in_progress', '进行中'],
  ['in_review', '待验收'],
  ['done', '已完成'],
];
var DOC_DIRS = ['会议纪要', '需求文档', '设计方案', '测试报告', '其他'];
var KPIS = ['交付及时率', '一次通过率', '缺陷回归通过率'];

var statusFilter = 'all';   /* 默认显示全部 */
var searchText = '';
var assigneeFilter = '';
var sortMode = 'raw';
var viewMode = 'list';
var collapsedMilestones = new Set();
var openRowMenu = null;
var openTaskId = null;

function matchStatus(status, filter) {
  if (filter === 'all') return true;
  if (filter === 'pending') return status === 'backlog' || status === 'planned' || status === 'blocked';
  return status === filter;
}
function statusName(id) {
  var s = TASK_STATUSES.find(function (x) { return x.id === id; });
  return s ? s.name : id || '—';
}
function statusTag(status) {
  var cls = {
    planned: 'neutral', backlog: 'neutral', in_progress: 'running', in_review: 'review',
    blocked: 'danger', done: 'done', cancelled: 'neutral',
  }[status] || 'neutral';
  return '<span class="mgr-tag mgr-tag--' + cls + '">' + mgrEsc(statusName(status)) + '</span>';
}
/* 当前处理人：有执行计划的任务看当前阶段执行人，与开发板块同口径 */
function handlerOf(task) { return tkCurrentStageHandlerId(task) || task.assignee || ''; }
/* 协作人筛选：任务负责人与协作人都算参与 */
function participantsOf(task) {
  var ids = [task.assignee].concat(task.collaborators || []).filter(Boolean).map(String);
  return ids.filter(function (id, i) { return ids.indexOf(id) === i; });
}
function isRdTask(task) { return !!task && (task.taskKind === 'rd' || task.issueType === '研发任务'); }
/* 「计划与任务」只放通用任务；研发任务在「研发任务」页签单独维护（features/manager/rd-tasks.js） */
function planTasks(projectId) {
  return mgrProjectTasks(projectId).filter(function (t) { return !mgrIsDevTask(t) && !isRdTask(t); });
}

/* 执行主体：当前阶段的智能体 > 任务挂的智能体团队 > 用户自己执行 */
function executorOf(task) {
  var plan = task.executionPlan || [];
  var stage = plan.find(function (s) { return s.status !== 'done'; }) || plan[plan.length - 1];
  var expert = stage && mgrExpert(stage.expertId);
  if (expert) return { name: expert.name, cls: 'expert' };
  var team = mgrTeam(task.teamId);
  if (team) return { name: team.name, cls: 'expert' };
  return { name: '用户执行', cls: 'user' };
}
function progressOf(task) {
  var plan = task.executionPlan || [];
  var total = plan.length || 1;
  var done = plan.length
    ? plan.filter(function (s) { return s.status === 'done'; }).length
    : task.status === 'done' ? 1 : 0;
  return { done: done, total: total, percent: Math.round((done / total) * 100) };
}
function stageState(stage) {
  return {
    pending: { label: '待执行', icon: '○', cls: 'pending' },
    running: { label: '执行中', icon: '◐', cls: 'running' },
    review: { label: '待验收', icon: '◉', cls: 'review' },
    done: { label: '通过', icon: '✓', cls: 'done' },
    blocked: { label: '已阻塞', icon: '⊘', cls: 'blocked' },
  }[stage.status || 'pending'] || { label: '待执行', icon: '○', cls: 'pending' };
}

/* 按里程碑分组：挂了里程碑的任务归到对应组，其余放在顶层 */
function groupByMilestone(project, tasks) {
  var groups = (project.milestones || []).map(function (m, i) {
    return { index: i, code: 'M' + (i + 1), name: m.name, date: m.date, tasks: [] };
  });
  var top = [];
  tasks.forEach(function (t) {
    var has = t.milestone !== undefined && t.milestone !== null && t.milestone !== '';
    var g = has ? groups[Number(t.milestone)] : null;
    if (g) g.tasks.push(t); else top.push(t);
  });
  return { milestones: groups.filter(function (g) { return g.tasks.length > 0; }), top: top };
}

function filteredTasks(project) {
  var list = planTasks(project.id).filter(function (t) { return matchStatus(t.status, statusFilter); });
  if (assigneeFilter) list = list.filter(function (t) { return participantsOf(t).indexOf(String(assigneeFilter)) >= 0; });
  var q = searchText.trim().toLocaleLowerCase();
  if (q) {
    list = list.filter(function (t) {
      return [t.code, t.title].some(function (v) { return v && String(v).toLocaleLowerCase().includes(q); });
    });
  }
  if (sortMode === 'due') {
    list = list.slice().sort(function (a, b) { return String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')); });
  } else if (sortMode === 'progress') {
    list = list.slice().sort(function (a, b) { return progressOf(b).percent - progressOf(a).percent; });
  }
  return list;
}

/* 删除入口：未开始的任务，且当前用户是项目负责人 / 系统管理员或任务创建人 */
function canDeleteTaskHere(task) {
  var project = mgrProjectById(task.project);
  if (!project || !mgrCanDeleteTask(task)) return false;
  return mgrCanManageProject(project) || (!!task.createdBy && task.createdBy === mgrCurrentPersonId());
}
function deleteMenuItem(task, key) {
  return canDeleteTaskHere(task)
    ? '<button type="button" role="menuitem" class="mgr-menu-danger" data-mgr-task-delete="' + mgrEsc(key) + '">删除任务</button>' : '';
}

/* 行操作：编辑图标 + 「···」菜单（研发任务不提供启动与子任务，执行与拆分在开发板块完成） */
var MENU_ICONS = {
  view: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  sub: '<path d="M12 5v14M5 12h14"/>',
  start: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  void: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  del: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>',
};
function menuItem(act, key, label, enabled, danger, reason) {
  return '<button type="button" role="menuitem" class="mgr-row-act' + (danger ? ' mgr-menu-danger' : '') + '"' +
    (enabled ? ' data-mgr-task-act="' + act + '" data-mgr-task-key="' + mgrEsc(key) + '"' : ' disabled title="' + mgrEsc(reason || '当前状态不可用') + '"') + '>' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + MENU_ICONS[act === 'force' ? 'start' : act] + '</svg>' + label + '</button>';
}
function rowActionsHtml(task, key) {
  var rd = mgrIsDevTask(task) || isRdTask(task);
  var st = task.status;
  var editable = st !== 'done';
  var items = menuItem('view', key, '查看详情', true) + menuItem('edit', key, '编辑任务', editable, false, '已完成的任务不能编辑');
  if (!rd) {
    items += menuItem('sub', key, '新建子任务', true) +
      menuItem('start', key, '启动', st === 'planned' || st === 'backlog', false, '只有待规划、待开始的任务可以启动') +
      menuItem('force', key, '强制启动', st === 'planned' || st === 'backlog' || st === 'blocked', false, '只有待规划、待开始、已阻塞的任务可以强制启动');
  }
  items += menuItem('void', key, '作废任务', st !== 'done' && st !== 'cancelled', false, '已完成或已取消的任务不能作废');
  items += canDeleteTaskHere(task)
    ? '<button type="button" role="menuitem" class="mgr-row-act mgr-menu-danger" data-mgr-task-delete="' + mgrEsc(key) + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + MENU_ICONS.del + '</svg>删除任务</button>'
    : menuItem('del', key, '删除任务', false, true, '只有未开始的任务，且需项目负责人或任务创建人才能删除');
  var open = openRowMenu === key;
  return '<button type="button" class="mgr-row-edit" aria-label="编辑任务"' +
    (editable ? ' data-mgr-task-act="edit" data-mgr-task-key="' + mgrEsc(key) + '" data-tooltip="编辑任务"' : ' disabled title="已完成的任务不能编辑"') + '>' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + MENU_ICONS.edit + '</svg></button>' +
    '<button type="button" class="mgr-row-more" data-mgr-row-menu="' + mgrEsc(key) + '" aria-haspopup="menu" aria-expanded="' + open + '" aria-label="任务操作">···</button>' +
    (open ? '<div class="mgr-row-menu" role="menu">' + items + '</div>' : '');
}
function stamp() {
  var d = new Date();
  var pad = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function setTaskStatus(task, to) {
  if (mgrIsDevTask(task)) tkUpdateTask(task.id, { status: to });
  else {
    task.statusHistory = (task.statusHistory || []).concat({ from: task.status, to: to, time: stamp(), authorId: mgrCurrentPersonId() });
    task.status = to;
    task.updatedAt = stamp();
    mgrSaveTasks();
  }
  document.dispatchEvent(new Event('lingee:mgr-tasks-changed'));
}
function runTaskAction(act, key) {
  var task = mgrTaskById(key);
  if (!task) return;
  openRowMenu = null;
  rerenderPlan();
  if (act === 'view') { openTaskPanel(key); return; }
  if (act === 'edit') {
    if (task.status === 'done') { toast('已完成的任务不能编辑', 'warning'); return; }
    openTaskNew(null, { edit: task });
    return;
  }
  if (act === 'sub') { openTaskNew(key); return; }
  if (act === 'start' || act === 'force') { setTaskStatus(task, 'in_progress'); toast(act === 'force' ? '已强制启动任务' : '任务已启动', 'success'); return; }
  if (act === 'void') { setTaskStatus(task, 'cancelled'); toast('任务已作废', 'success'); }
}

/* ---------- 列表视图 ---------- */
function taskRowHtml(task, canOpenSession, index) {
  var ex = executorOf(task);
  var key = mgrTaskKey(task);
  var collaborators = (task.collaborators || []).map(mgrPersonName).filter(Boolean);
  return '<tr class="mgr-tk-row" data-mgr-task="' + mgrEsc(key) + '">' +
    '<td class="mgr-tk-code">' + index + '</td>' +
    '<td class="mgr-tk-title"><span class="mgr-tk-title-text">' + mgrEsc(task.title) + '</span></td>' +
    '<td class="mgr-tk-session">—</td>' +
    '<td class="mgr-tk-executor">' + (ex.cls === 'expert' ? '<span class="mgr-executor mgr-executor--expert">' + mgrEsc(ex.name) + '</span>' : '—') + '</td>' +
    '<td class="mgr-tk-assignee">' + (collaborators.length ? mgrEsc(collaborators.join('、')) : '—') + '</td>' +
    '<td class="mgr-tk-due">' + mgrDay(task.dueDate) + '</td>' +
    '<td class="mgr-tk-status">' + statusTag(task.status) + '</td>' +
    '<td class="mgr-tk-actions">' + rowActionsHtml(task, key) + '</td></tr>';
}
function listViewHtml(project, tasks, canOpenSession) {
  var g = groupByMilestone(project, tasks);
  var rows = '';
  var n = 0;
  g.milestones.forEach(function (m) {
    var collapsed = collapsedMilestones.has(m.index);
    rows += '<tr class="mgr-ms-row"><td colspan="8">' +
      '<button type="button" class="mgr-ms-toggle" data-mgr-ms-toggle="' + m.index + '" aria-expanded="' + !collapsed + '" aria-label="展开或收起 ' + mgrEsc(m.name) + '">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '<svg class="mgr-ms-flag" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22V4"/><path d="M4 4h13l-2.5 4L17 12H4"/></svg>' +
      '<span class="mgr-ms-code">' + m.code + '</span><span class="mgr-ms-name">' + mgrEsc(m.name) + '</span>' +
      '<span class="mgr-ms-count">' + m.tasks.length + ' 项任务</span><span class="mgr-ms-due">截止 ' + mgrDay(m.date) + '</span></td></tr>';
    if (!collapsed) m.tasks.forEach(function (t) { rows += taskRowHtml(t, canOpenSession, ++n); });
  });
  g.top.forEach(function (t) { rows += taskRowHtml(t, canOpenSession, ++n); });
  if (!rows) return '<div class="mgr-empty">暂无任务。点「＋ 新建任务」创建通用任务；研发任务在「研发任务」页签维护。</div>';
  return '<table class="mgr-task-table"><thead><tr><th>序号</th><th>任务</th><th>关联会话</th><th>执行智能体</th><th>协作人</th><th>截止时间</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
    rows + '</tbody></table>';
}

/* ---------- 里程碑视图 ---------- */
function msTaskHtml(t) {
  return '<div class="mgr-ms-task" data-mgr-task="' + mgrEsc(mgrTaskKey(t)) + '" role="button" tabindex="0"><span class="mgr-tk-code">' + mgrEsc(t.code || '') +
    '</span><span class="mgr-tk-title-text">' + mgrEsc(t.title) + '</span>' + statusTag(t.status) + '</div>';
}
function milestoneViewHtml(project, tasks) {
  var g = groupByMilestone(project, tasks);
  var cards = g.milestones.map(function (m) {
    var done = m.tasks.filter(function (t) { return t.status === 'done'; }).length;
    var pct = m.tasks.length ? Math.round((done / m.tasks.length) * 100) : 0;
    return '<div class="mgr-ms-card"><div class="mgr-ms-card-head"><span class="mgr-ms-code">' + m.code + '</span><strong>' + mgrEsc(m.name) +
      '</strong><span class="mgr-ms-due">截止 ' + mgrDay(m.date) + '</span></div>' +
      '<div class="mgr-ms-card-progress"><span class="mgr-bar"><span class="mgr-bar-fill" style="width:' + pct + '%"></span></span><span>' +
      done + '/' + m.tasks.length + ' 完成</span></div><div class="mgr-ms-card-tasks">' +
      (m.tasks.map(msTaskHtml).join('') || '<span class="mgr-footnote">暂无任务</span>') + '</div></div>';
  }).join('');
  var rest = g.top.length
    ? '<div class="mgr-ms-card"><div class="mgr-ms-card-head"><strong>未挂里程碑</strong><span class="mgr-ms-count">' + g.top.length +
      ' 项</span></div><div class="mgr-ms-card-tasks">' + g.top.map(msTaskHtml).join('') + '</div></div>'
    : '';
  return '<div class="mgr-ms-cards">' + (cards + rest || '<div class="mgr-empty">项目未设置里程碑</div>') + '</div>';
}

/* ---------- 甘特图视图 ----------
   横轴是时间：按里程碑分组，每个任务一条横条，从创建日到截止日；没设截止日的任务
   画到今天（已完成的画到更新日），用虚边表示「未设截止」。里程碑用菱形标在日期上，
   竖线标出今天。点击任务行或横条打开任务详情。 */
var DAY_MS = 86400000;
function dayOf(v) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : NaN;
}
function ymd(ts) {
  var d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function mdText(ts) { var d = new Date(ts); return (d.getMonth() + 1) + '/' + d.getDate(); }
function ganttSpan(task, todayTs) {
  var start = dayOf(task.createDate || task.createdAt);
  var due = dayOf(task.dueDate);
  var finished = task.status === 'done' || task.status === 'cancelled';
  var open = isNaN(due);
  if (isNaN(start)) start = !isNaN(due) ? due : todayTs;
  var end = !open ? due : finished ? dayOf(task.updatedAt) : Math.max(todayTs, start);
  if (isNaN(end) || end < start) end = start;
  return { start: start, end: end, open: open };
}
function ganttBarClass(status) {
  return { done: 'is-done', in_progress: 'is-running', in_review: 'is-review', blocked: 'is-blocked', cancelled: 'is-cancelled' }[status] || 'is-pending';
}
function ganttViewHtml(project, tasks) {
  var todayTs = dayOf(ymd(Date.now()));
  var milestones = (project.milestones || []).map(function (m, i) { return { code: 'M' + (i + 1), name: m.name, ts: dayOf(m.date), index: i }; })
    .filter(function (m) { return !isNaN(m.ts); });
  var spans = tasks.map(function (t) { return { task: t, span: ganttSpan(t, todayTs) }; });
  if (!spans.length && !milestones.length) return '<div class="mgr-empty">暂无可排期的任务与里程碑</div>';

  var points = [todayTs];
  spans.forEach(function (x) { points.push(x.span.start, x.span.end); });
  milestones.forEach(function (m) { points.push(m.ts); });
  var min = Math.min.apply(null, points) - 3 * DAY_MS;
  var max = Math.max.apply(null, points) + 3 * DAY_MS;
  if (max - min < 21 * DAY_MS) max = min + 21 * DAY_MS;
  var total = max - min;
  var pct = function (ts) { return ((ts - min) / total) * 100; };

  /* 刻度：跨度不超过 10 周按周（周一），否则按月 */
  var weekly = total <= 70 * DAY_MS;
  var ticks = [];
  var cur = new Date(min);
  if (weekly) {
    cur.setDate(cur.getDate() + (8 - cur.getDay()) % 7);
    while (cur.getTime() <= max) { ticks.push({ ts: dayOf(ymd(cur.getTime())), label: mdText(cur.getTime()) }); cur.setDate(cur.getDate() + 7); }
  } else {
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    while (cur.getTime() <= max) {
      ticks.push({ ts: cur.getTime(), label: cur.getMonth() === 0 ? cur.getFullYear() + '年1月' : (cur.getMonth() + 1) + '月' });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }
  var lines = ticks.map(function (t) { return '<i class="mgr-gantt-line" style="left:' + pct(t.ts).toFixed(2) + '%"></i>'; }).join('') +
    '<i class="mgr-gantt-today" style="left:' + pct(todayTs).toFixed(2) + '%"><b>今天</b></i>';
  var head = '<div class="mgr-gantt-row mgr-gantt-axis"><div class="mgr-gantt-label">' + mgrEsc(ymd(min + 3 * DAY_MS)) + ' ~ ' + mgrEsc(ymd(max - 3 * DAY_MS)) + '</div><div class="mgr-gantt-track">' +
    ticks.map(function (t) { return '<span class="mgr-gantt-tick" style="left:' + pct(t.ts).toFixed(2) + '%">' + mgrEsc(t.label) + '</span>'; }).join('') + '</div></div>';

  var barRow = function (x) {
    var t = x.task, sp = x.span;
    var left = pct(sp.start), width = Math.max(pct(sp.end) - pct(sp.start), 0);
    var range = sp.open ? mdText(sp.start) + ' 起 · 未设截止' : sp.start === sp.end ? mdText(sp.start) : mdText(sp.start) + ' – ' + mdText(sp.end);
    var late = !sp.open && t.status !== 'done' && t.status !== 'cancelled' && sp.end < todayTs;
    var tip = (t.code || '') + ' ' + t.title + ' · ' + statusName(t.status) + ' · ' + range + (late ? ' · 已逾期' : '');
    var textLeft = left + width > 75;
    return '<div class="mgr-gantt-row mgr-gantt-task" data-mgr-gantt-task="' + mgrEsc(mgrTaskKey(t)) + '" role="button" tabindex="0" aria-label="' + mgrEsc(tip) + '">' +
      '<div class="mgr-gantt-label" title="' + mgrEsc(t.title) + '"><span class="mgr-tk-code">' + mgrEsc(t.code || '') + '</span><span class="mgr-gantt-name">' + mgrEsc(t.title) + '</span></div>' +
      '<div class="mgr-gantt-track"><span class="mgr-gantt-bar ' + ganttBarClass(t.status) + (sp.open ? ' is-open' : '') + (late ? ' is-late' : '') +
      '" style="left:' + left.toFixed(2) + '%;width:' + width.toFixed(2) + '%" title="' + mgrEsc(tip) + '"></span>' +
      '<span class="mgr-gantt-range" style="' + (textLeft ? 'right:' + (100 - left).toFixed(2) + '%;margin-right:6px' : 'left:' + (left + width).toFixed(2) + '%;margin-left:6px') + '">' + mgrEsc(range) + '</span></div></div>';
  };
  var msRow = function (m, count) {
    return '<div class="mgr-gantt-row mgr-gantt-ms-row"><div class="mgr-gantt-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 22V4"/><path d="M4 4h13l-2.5 4L17 12H4"/></svg>' +
      '<span class="mgr-ms-code">' + m.code + '</span><span class="mgr-gantt-name">' + mgrEsc(m.name) + '</span></div>' +
      '<div class="mgr-gantt-track"><span class="mgr-gantt-diamond" style="left:' + pct(m.ts).toFixed(2) + '%" title="' + mgrEsc(m.code + ' ' + m.name + ' · ' + ymd(m.ts)) + '"></span>' +
      '<span class="mgr-gantt-range" style="left:' + pct(m.ts).toFixed(2) + '%;margin-left:14px">' + mgrEsc(mdText(m.ts)) + (count ? ' · ' + count + ' 项任务' : '') + '</span></div></div>';
  };

  var groupRow = function (name) {
    return '<div class="mgr-gantt-row mgr-gantt-ms-row"><div class="mgr-gantt-label"><span class="mgr-gantt-name">' + mgrEsc(name) + '</span></div><div class="mgr-gantt-track"></div></div>';
  };
  /* 分组：每个里程碑下挂它的任务，未挂里程碑的放最后 */
  var rows = '';
  var byMs = {};
  var rest = [];
  spans.forEach(function (x) {
    var key = x.task.milestone;
    var has = key !== undefined && key !== null && key !== '' && (project.milestones || [])[Number(key)];
    if (has) (byMs[Number(key)] = byMs[Number(key)] || []).push(x); else rest.push(x);
  });
  (project.milestones || []).forEach(function (m, i) {
    var list = byMs[i] || [];
    var ms = milestones.find(function (x) { return x.index === i; });
    if (ms) rows += msRow(ms, list.length);
    else if (list.length) rows += groupRow(m.name);
    rows += list.map(barRow).join('');
  });
  if (rest.length) {
    if ((project.milestones || []).length) rows += groupRow('未挂里程碑');
    rows += rest.map(barRow).join('');
  }

  var legend = [['is-done', '已完成'], ['is-running', '执行中'], ['is-review', '待审核'], ['is-blocked', '已阻塞'], ['is-pending', '待开始']].map(function (l) {
    return '<span class="mgr-gantt-key"><i class="mgr-gantt-swatch ' + l[0] + '"></i>' + l[1] + '</span>';
  }).join('') + '<span class="mgr-gantt-key"><i class="mgr-gantt-swatch is-pending is-open"></i>未设截止</span>' +
    '<span class="mgr-gantt-key"><i class="mgr-gantt-diamond-key"></i>里程碑</span><span class="mgr-gantt-key"><i class="mgr-gantt-today-key"></i>今天</span>';
  return '<div class="mgr-gantt"><div class="mgr-gantt-scroll"><div class="mgr-gantt-body">' + head + '<div class="mgr-gantt-rows"><div class="mgr-gantt-lines">' + lines + '</div>' + rows + '</div></div></div>' +
    '<div class="mgr-gantt-legend">' + legend + '</div></div>';
}

/* ---------- 计划与任务工作区 ---------- */
function planWorkspaceHtml(project) {
  var all = planTasks(project.id);
  var counts = {};
  STATUS_CHIPS.forEach(function (c) {
    counts[c[0]] = c[0] === 'all' ? all.length : all.filter(function (t) { return matchStatus(t.status, c[0]); }).length;
  });
  var assignees = [];
  all.forEach(function (t) {
    participantsOf(t).forEach(function (h) {
      if (!assignees.some(function (a) { return String(a.id) === h; })) assignees.push({ id: h, name: mgrPersonName(h) });
    });
  });
  var tasks = filteredTasks(project);
  var canOpenSession = mgrHasSessionPerm();
  var body = viewMode === 'milestone' ? milestoneViewHtml(project, tasks)
    : viewMode === 'gantt' ? ganttViewHtml(project, tasks)
    : listViewHtml(project, tasks, canOpenSession);
  var opt = function (v, label, cur) { return '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + label + '</option>'; };
  return '<div class="mgr-pd-filter-row">' +
    '<select id="mgrPdStatus" aria-label="任务状态筛选">' +
    STATUS_CHIPS.map(function (c) { return opt(c[0], c[1] + ' ' + (counts[c[0]] || 0), statusFilter); }).join('') + '</select>' +
    '<select id="mgrPdAssignee" aria-label="协作人筛选"><option value="">全部协作人</option>' +
    assignees.map(function (a) { return opt(mgrEsc(a.id), mgrEsc(a.name), String(assigneeFilter)); }).join('') +
    '</select><select id="mgrPdSort" aria-label="排序">' +
    opt('raw', '原始顺序', sortMode) + opt('due', '按截止时间', sortMode) + opt('progress', '按进展', sortMode) + '</select>' +
    '<label class="mgr-pd-search" for="mgrPdSearch"><input type="search" id="mgrPdSearch" value="' + mgrEsc(searchText) + '" placeholder="搜索编号或任务名" aria-label="搜索编号或任务名" autocomplete="off">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg></label>' +
    '<div class="mgr-pd-newtask"><button type="button" class="lingee-create mgr-pd-newbtn" id="mgrPdTaskNew"><svg class="create-plus" width="10" height="10" viewBox="0 0 11 11" fill="none" aria-hidden="true"><path d="M5.25 0C5.66421 0 6 0.335786 6 0.75V4.5H9.75C10.1642 4.5 10.5 4.83579 10.5 5.25C10.5 5.66421 10.1642 6 9.75 6H6V9.75C6 10.1642 5.66421 10.5 5.25 10.5C4.83579 10.5 4.5 10.1642 4.5 9.75V6H0.75C0.335786 6 0 5.66421 0 5.25C0 4.83579 0.335786 4.5 0.75 4.5H4.5V0.75C4.5 0.335786 4.83579 0 5.25 0Z" fill="currentColor"/></svg>新建</button></div></div>' +
    '<div class="mgr-pd-table-wrap" id="mgrPdTaskArea" data-mgr-proj="' + mgrEsc(project.id) + '">' + body + '</div>' +
    '<p class="mgr-footnote" id="mgrPdPermNote"' + (canOpenSession ? ' hidden' : '') + '>当前演示角色无执行会话查看权限，仅展示任务元数据与执行状态。</p>';
}

/* 当前打开的项目（以任务区上的 data-mgr-proj 为准） */
function currentPlanProject() {
  var area = $('#mgrPdTaskArea');
  var id = area ? area.getAttribute('data-mgr-proj') : null;
  return id ? mgrProjectById(id) : null;
}
function rerenderPlan() {
  var pane = $('#mgrPdPlanPane');
  /* 「研发任务」页签共用行菜单，由它自己重绘 */
  if (pane && pane.classList.contains('hidden')) { document.dispatchEvent(new Event('lingee:mgr-rd-rerender')); return; }
  if (!pane) return;
  var project = currentPlanProject();
  if (project) pane.innerHTML = planWorkspaceHtml(project);
  floatRowMenu();
}
/* 行菜单浮在卡片之上：卡片有 overflow 裁剪，菜单改为按「···」按钮的位置固定定位，靠右对齐，空间不够时向上展开 */
function floatRowMenu() {
  var menu = document.querySelector('#mgrProjDetail .mgr-row-menu');
  if (!menu) return;
  var btn = menu.parentElement.querySelector('.mgr-row-more');
  var rect = btn.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.right = 'auto';
  menu.style.left = Math.max(8, rect.right - menu.offsetWidth) + 'px';
  var below = rect.bottom + 4;
  menu.style.top = (below + menu.offsetHeight > window.innerHeight - 8 ? Math.max(8, rect.top - 4 - menu.offsetHeight) : below) + 'px';
}
function closeRowMenu() {
  if (openRowMenu === null) return;
  openRowMenu = null;
  rerenderPlan();
}

/* ---------- 删除未开始的任务 ---------- */
var pendingTaskDelete = null;
function requestTaskDelete(key, trigger) {
  var task = mgrTaskById(key);
  if (!task || !canDeleteTaskHere(task)) { toast('只有未开始的任务可以删除，且需项目负责人或任务创建人操作', 'warning'); return; }
  pendingTaskDelete = { key: String(key), trigger: trigger || null };
  $('#mgrTaskDeleteMessage').textContent = '删除「' + task.title + '」后不可恢复，确定删除？';
  var overlay = $('#mgrTaskDeleteOverlay');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  overlay.querySelector('[data-mgr-task-delete-cancel]').focus();
}
function closeTaskDelete() {
  var overlay = $('#mgrTaskDeleteOverlay');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  pendingTaskDelete = null;
}
function confirmTaskDelete() {
  if (!pendingTaskDelete) return;
  var task = mgrTaskById(pendingTaskDelete.key);
  closeTaskDelete();
  if (!task || !canDeleteTaskHere(task)) { toast('任务状态已变化，不能删除', 'warning'); rerenderPlan(); return; }
  if (!mgrDeleteTask(task)) { toast('删除失败，请重试', 'error'); return; }
  closeTaskPanel();
  openRowMenu = null;
  rerenderPlan();
  toast('任务已删除', 'success');
}
/* 搜索时重绘会替换输入框，保留焦点与光标 */
function rerenderKeepSearchFocus() {
  var focused = document.activeElement && document.activeElement.id;
  rerenderPlan();
  if (focused !== 'mgrPdSearch') return;
  var input = $('#mgrPdSearch');
  if (!input) return;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}
function setPlanView(mode) {
  viewMode = mode === 'milestone' || mode === 'gantt' ? mode : 'list';
  document.querySelectorAll('[data-pdview]').forEach(function (b) {
    var on = b.getAttribute('data-pdview') === viewMode;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  rerenderPlan();
}
/* 切换项目时重置筛选状态 */
function resetPlanState() {
  statusFilter = 'all';
  searchText = '';
  assigneeFilter = '';
  sortMode = 'raw';
  openRowMenu = null;
  collapsedMilestones.clear();
}

/* ---------- 任务详情（右侧滑入） ---------- */
function sectionTitle(label, count) {
  return '<div class="mgr-sec-title"><i aria-hidden="true"></i>' + mgrEsc(label) +
    (count ? '<span class="mgr-sec-count">' + mgrEsc(count) + '</span>' : '') + '</div>';
}
function taskPanelHtml(task) {
  var plan = task.executionPlan || [];
  var ex = executorOf(task);
  var collaborators = (task.collaborators || []).map(mgrPersonName).filter(Boolean);
  var stages = plan.map(function (s, i) {
    var st = stageState(s);
    var expert = mgrExpert(s.expertId);
    return '<div class="mgr-task-stage-item"><div class="mgr-task-stage is-' + st.cls + '"><span class="mgr-task-stage-index">' +
      String(i + 1).padStart(2, '0') + '</span><div class="mgr-task-stage-main"><strong>' + mgrEsc(s.title || s.workType) +
      '</strong><span class="mgr-task-stage-meta">' + (expert ? '智能体「' + mgrEsc(expert.name) + '」执行' : mgrEsc(mgrPersonName(s.assigneeId))) +
      '</span></div><span class="mgr-task-stage-state st-' + st.cls + '"><i aria-hidden="true">' + st.icon + '</i>' + st.label + '</span></div></div>';
  }).join('');
  var events = [{ time: String(task.createDate || ''), text: '创建任务' }];
  (task.statusHistory || []).forEach(function (h) {
    events.push({ time: String(h.time || '').slice(0, 10), text: '状态由 ' + mgrEsc(statusName(h.from)) + ' 变更为 ' + mgrEsc(statusName(h.to)) });
  });
  if (task.status === 'done') events.push({ time: String(task.updatedAt || task.createDate || ''), text: '任务完成' });
  events = events.filter(function (e) { return e.time; }).sort(function (a, b) { return String(b.time).localeCompare(String(a.time)); });
  var doneStages = plan.filter(function (s) { return s.status === 'done'; }).length;
  var kv = function (k, v) {
    return '<div class="mgr-tp-kv-item"><span class="mgr-detail-key">' + k + '</span><span class="mgr-detail-value">' + v + '</span></div>';
  };
  var id = mgrEsc(mgrTaskKey(task));
  return '<div class="mgr-tp-titlerow"><h3 class="mgr-tp-title">' + mgrEsc(task.title) + '</h3><div class="mgr-tp-tags">' +
    (ex.cls === 'expert' ? '<span class="mgr-executor mgr-executor--expert">' + mgrEsc(ex.name) + '</span>' : '<span class="mgr-executor mgr-executor--user">用户执行</span>') +
    '<span class="mgr-tp-code">' + mgrEsc(task.code || '') + '</span>' +
    (isRdTask(task) ? '<span class="mgr-tag mgr-tag--brand">研发任务</span>' : '') + statusTag(task.status) + '</div></div>' +
    sectionTitle('执行概览') + '<div class="mgr-tp-kv">' +
    kv('当前处理人', mgrEsc(mgrPersonName(handlerOf(task)))) +
    kv('执行智能体', ex.cls === 'expert' ? mgrEsc(ex.name) : '—') +
    kv('协作人', collaborators.length ? mgrEsc(collaborators.join('、')) : '—') +
    kv('优先级', { urgent: '紧急', high: '高', medium: '中', low: '低' }[task.priority] || '中') +
    kv('计划截止', mgrDay(task.dueDate)) +
    kv('更新时间', mgrEsc(task.updatedAt || task.createDate || '—')) + '</div>' +
    sectionTitle('任务描述') + '<p class="mgr-tp-desc">' + mgrEsc(task.desc || '暂无任务描述') + '</p>' +
    sectionTitle('验收标准') + '<p class="mgr-tp-desc">' + mgrEsc(task.acceptance || '暂无验收标准') + '</p>' +
    (plan.length ? sectionTitle('执行阶段', doneStages + '/' + plan.length) + '<div class="mgr-task-stage-list" role="list">' + stages + '</div>' : '') +
    (events.length
      ? sectionTitle('进展记录', String(events.length)) + '<div class="mgr-tp-events">' + events.slice(0, 8).map(function (e) {
        return '<div class="mgr-tp-event"><span class="mgr-tp-event-time">' + mgrDay(e.time) + '</span><span class="mgr-tp-event-text">' + e.text + '</span></div>';
      }).join('') + '</div>'
      : '') +
    '<div class="mgr-tp-foot"><button type="button" class="mgr-btn mgr-btn--ghost" data-mgr-tp-edit>编辑</button>' +
    '<div class="mgr-tp-more"><button type="button" class="mgr-tp-more-btn" data-mgr-tp-more aria-haspopup="menu" aria-expanded="false" aria-label="更多操作">···</button>' +
    '<div class="mgr-tp-more-menu" role="menu" hidden>' +
    (mgrIsDevTask(task) ? '<button type="button" role="menuitem" data-mgr-task-open="' + id + '">在开发板块打开任务</button>' : '') +
    '<button type="button" role="menuitem" data-mgr-task-issue="' + id + '">升级为议题</button>' +
    deleteMenuItem(task, id) + '</div></div></div>';
}
function openTaskPanel(id) {
  openTaskId = String(id);
  renderTaskPanel();
}
function closeTaskPanel() {
  openTaskId = null;
  var wrap = $('#mgrTaskPanelWrap');
  if (!wrap) return;
  wrap.classList.add('is-closing');
  setTimeout(function () { wrap.classList.add('hidden'); wrap.classList.remove('is-closing', 'is-open'); }, 200);
}
function renderTaskPanel() {
  var wrap = $('#mgrTaskPanelWrap'), body = $('#mgrTaskPanelBody');
  if (!wrap || !body) return;
  if (openTaskId === null) { wrap.classList.add('hidden'); wrap.classList.remove('is-open'); return; }
  var task = mgrTaskById(openTaskId);
  if (!task) { closeTaskPanel(); return; }
  body.innerHTML = taskPanelHtml(task);
  wrap.classList.remove('hidden');
  requestAnimationFrame(function () { wrap.classList.add('is-open'); });
}

/* ---------- 新建任务弹窗 ---------- */
/* 研发任务的执行计划，对齐开发板块新建任务的执行计划表：
   执行阶段取自项目交付智能体团队的交付路径（智能体按阶段自动匹配），
   每个节点设置自动审核与执行人；执行人按项目角色默认匹配。 */
var draftStages = [];
var planProject = null;

function newStageId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'st-' + Math.random().toString(36).slice(2);
}
function projectTeamOf(project) {
  return mgrTeam(project.defaultTeam || (project.teamIds || [])[0]);
}
function stageOptions(project) {
  var title = ($('#mgrTnTitle') || {}).value || '';
  return tbTeamStages(projectTeamOf(project), { title: title, issueType: '研发任务' });
}
function stageFromOption(project, option) {
  return {
    id: newStageId(),
    workType: option.name,
    title: option.name,
    description: option.desc || '',
    expertId: (option.expertIds || [])[0] || '',
    expertIds: (option.expertIds || []).slice(),
    assigneeId: defaultStageAssigneeId(project, mgrProjectMembers(project), CV_MEMBERS, option.name),
    requiresConfirmation: true,
    status: 'pending',
  };
}
function resetDraftStages(project) {
  planProject = project;
  draftStages = stageOptions(project).map(function (o) { return stageFromOption(project, o); });
}
function renderStages() {
  var body = $('#mgrTnStages');
  var project = planProject;
  if (!body || !project) return;
  var options = stageOptions(project);
  var members = mgrProjectMembers(project);
  var team = projectTeamOf(project);
  $('#mgrTnPlanHint').textContent = team
    ? '按「' + team.name + '」的交付路径选择阶段，智能体按阶段自动匹配'
    : '项目未绑定交付智能体团队，按默认交付路径选择阶段';
  $('#mgrTnStageAdd').disabled = editLocked || !options.some(function (o) {
    return !draftStages.some(function (st) { return st.workType === o.name; });
  });
  if (editLocked) $('#mgrTnPlanHint').textContent = '任务已启动，执行计划不能修改';
  if (!draftStages.length) {
    body.innerHTML = '<tr><td colspan="5" class="mgr-tn-plan-empty">还没有工作阶段。点击「＋ 添加节点」开始。</td></tr>';
    return;
  }
  body.innerHTML = draftStages.map(function (st, i) {
    var n = i + 1;
    var opts = options.map(function (o) {
      return '<option value="' + mgrEsc(o.name) + '"' + (o.name === st.workType ? ' selected' : '') + '>' + mgrEsc(o.name) + '</option>';
    }).join('') + (options.some(function (o) { return o.name === st.workType; }) ? '' : '<option value="' + mgrEsc(st.workType) + '" selected>' + mgrEsc(st.workType) + '</option>');
    var owners = '<option value="">待分配</option>' + members.map(function (m) {
      return '<option value="' + mgrEsc(m.id) + '"' + (st.assigneeId === m.id ? ' selected' : '') + '>' + mgrEsc(m.name) + '</option>';
    }).join('');
    return '<tr class="mgr-tn-plan-row" data-mgr-tn-stage="' + mgrEsc(st.id) + '"><td>' + String(n).padStart(2, '0') + '</td>' +
      '<td><select data-mgr-tn-stage-type="' + mgrEsc(st.id) + '" aria-label="第 ' + n + ' 执行阶段">' + opts + '</select>' +
      '</td>' +
      '<td><label class="mgr-tn-review-switch"><input type="checkbox" data-mgr-tn-stage-review="' + mgrEsc(st.id) + '" aria-label="第 ' + n + ' 节点自动审核"' +
      (st.requiresConfirmation === false ? ' checked' : '') + '><span aria-hidden="true"></span></label></td>' +
      '<td><select data-mgr-tn-stage-owner="' + mgrEsc(st.id) + '" aria-label="第 ' + n + ' 节点审核人">' + owners + '</select></td>' +
      '<td><button type="button" class="mgr-tn-stage-remove" data-mgr-tn-stage-remove="' + mgrEsc(st.id) + '" aria-label="移除第 ' + n + ' 节点">×</button></td></tr>';
  }).join('');
  if (editLocked) body.querySelectorAll('select, input, button').forEach(function (el) { el.disabled = true; });
}
function addStage() {
  var project = planProject;
  if (!project) return;
  var used = new Set(draftStages.map(function (st) { return st.workType; }));
  var next = stageOptions(project).find(function (o) { return !used.has(o.name); });
  if (!next) { toast('智能体团队的交付阶段已全部加入执行计划', 'warning'); return; }
  draftStages.push(stageFromOption(project, next));
  renderStages();
  var selects = document.querySelectorAll('#mgrTnStages [data-mgr-tn-stage-type]');
  if (selects.length) selects[selects.length - 1].focus();
}
function stageById(id) { return draftStages.find(function (st) { return st.id === id; }); }
/* 保存时串成顺序依赖：每个节点依赖上一个节点 */
function collectStages() {
  var prev = null;
  return draftStages.map(function (st) {
    var stage = Object.assign({}, st);
    delete stage.expertIds;
    if (prev) stage.dependsOn = [prev];
    prev = stage.id;
    return stage;
  });
}
function syncRdPane() {
  var rd = document.querySelector('[data-mgr-tntype="rd"]');
  var on = !!(rd && rd.classList.contains('active'));
  var pane = $('#mgrTnRdPane');
  if (pane) pane.hidden = !on;
  /* 研发任务由执行计划驱动：隐藏附件 / 协作人 / 计划时间 / AI 验收 / 验收标准 */
  $('#mgrTnCore').classList.toggle('is-rd', on);
}
function syncSubCount() {
  var box = $('#mgrTnSubs');
  if (!box) return;
  var n = box.querySelectorAll('[data-mgr-tn-sub]').length;
  $('#mgrTnSubCount').textContent = String(n);
  var empty = box.querySelector('.mgr-tn-sub-empty');
  if (empty) empty.hidden = n > 0;
}
function addSubRow() {
  var box = $('#mgrTnSubs');
  if (!box) return;
  var row = document.createElement('div');
  row.className = 'mgr-tn-sub';
  row.setAttribute('data-mgr-tn-sub', '');
  row.innerHTML = '<input type="text" class="mgr-tn-sub-input" placeholder="子任务标题" aria-label="子任务标题">' +
    '<button type="button" class="mgr-tn-stage-remove" data-mgr-tn-sub-remove aria-label="删除子任务">×</button>';
  box.appendChild(row);
  syncSubCount();
  row.querySelector('input').focus();
}
function checkedCollaborators() {
  return Array.prototype.map.call(
    document.querySelectorAll('#mgrTnCollabPopup input[data-mgr-tn-collab]:checked'),
    function (el) { return el.getAttribute('data-mgr-tn-collab'); }
  );
}
function fillSelect(id, html) { var el = $(id); if (el) el.innerHTML = html; }

/* 新建任务弹窗由两个页签共用：「计划与任务」建通用任务，「研发任务」建研发任务 */
var taskNewProjectId = null;
var editingKey = null;
var editLocked = false;   /* 编辑已启动的研发任务：执行计划只读 */
function openTaskNew(parentId, opts) {
  /* 编辑任务：复用新建任务弹窗，带入已有内容，保存时更新原任务 */
  var editTask = (opts && opts.edit) || null;
  editingKey = editTask ? mgrTaskKey(editTask) : null;
  editLocked = false;
  var project = editTask ? mgrProjectById(editTask.project) : (opts && opts.project) || currentPlanProject();
  if (!project) { toast('请先打开项目详情', 'warning'); return; }
  var rdKind = editTask ? mgrIsDevTask(editTask) || isRdTask(editTask) : !!(opts && opts.kind === 'rd');
  taskNewProjectId = project.id;
  var overlay = $('#mgrTaskNewOverlay');
  if (!overlay) return;
  document.querySelectorAll('[data-mgr-tntab]').forEach(function (b) {
    var on = b.getAttribute('data-mgr-tntab') === 'core';
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  $('#mgrTnCore').hidden = false;
  $('#mgrTnExtra').hidden = true;
  /* 研发任务的「补充信息」只保留「是否里程碑」，父任务、前序等通用任务项隐藏 */
  document.querySelectorAll('#mgrTnExtra .mgr-tn-general-only').forEach(function (el) { el.hidden = rdKind; });
  /* 任务类型不让用户选，由入口页签决定 */
  document.querySelectorAll('[data-mgr-tntype]').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-mgr-tntype') === (rdKind ? 'rd' : 'general'));
  });
  $('#mgrTaskNewOverlay .mgr-projedit-title').textContent = editTask ? '编辑任务' : rdKind ? '新建研发任务' : '新建任务';
  /* 新建通用任务：「保存任务」+「保存并启动」；研发任务与编辑只有一个主按钮 */
  var twoButtons = !editTask && !rdKind;
  var saveBtn = $('#mgrTnSave');
  saveBtn.textContent = editTask ? '保存修改' : twoButtons ? '保存任务' : '保存';
  saveBtn.classList.toggle('sync-modal__btn--ghost', twoButtons);
  saveBtn.classList.toggle('sync-modal__btn--primary', !twoButtons);
  $('#mgrTnSaveStart').hidden = !twoButtons;
  $('#mgrTnTypeField').hidden = true;
  syncRdPane();
  ['#mgrTnTitle', '#mgrTnDesc', '#mgrTnAccept'].forEach(function (s) { $(s).value = ''; });
  mgrDateSet($('#mgrTnDue'), '');
  var aiBtn = $('#mgrTnAiBtn');
  aiBtn.setAttribute('data-ai', 'off');
  aiBtn.querySelector('span').textContent = 'AI 验收';
  var collabBtn = $('#mgrTnCollabBtn');
  collabBtn.setAttribute('data-collab-count', '0');
  collabBtn.querySelector('span').textContent = '添加协作人';
  var popup = $('#mgrTnCollabPopup');
  popup.innerHTML = mgrProjectMembers(project).map(function (m) {
    return '<label class="mgr-tn-collab-row"><input type="checkbox" data-mgr-tn-collab="' + mgrEsc(m.id) + '"><span>' + mgrEsc(m.name) + '</span></label>';
  }).join('') || '<p class="mgr-tn-sub-empty">项目暂无成员</p>';
  popup.hidden = true;
  $('#mgrTnAiMenu').hidden = true;
  resetDraftStages(project);
  renderStages();

  var tasks = mgrProjectTasks(project.id).filter(function (t) { return mgrIsDevTask(t) === rdKind; });
  fillSelect('#mgrTnParent', '<option value="">无（挂在本项目根任务下）</option>' + tasks.map(function (t) {
    return '<option value="' + mgrEsc(mgrTaskKey(t)) + '">' + mgrEsc((t.code || '') + ' ' + t.title) + '</option>';
  }).join(''));
  fillSelect('#mgrTnPre', '<option value="">无（不设前序）</option>' + tasks.map(function (t) {
    return '<option value="' + mgrEsc(mgrTaskKey(t)) + '">' + mgrEsc((t.code || '') + ' ' + t.title) + '</option>';
  }).join(''));
  if (parentId) $('#mgrTnParent').value = String(parentId);
  fillSelect('#mgrTnDir', DOC_DIRS.map(function (d) { return '<option value="' + mgrEsc(d) + '">' + mgrEsc(d) + '</option>'; }).join(''));
  fillSelect('#mgrTnKpi', '<option value="">选择关联指标（选填）</option>' + KPIS.map(function (k) { return '<option value="' + mgrEsc(k) + '">' + mgrEsc(k) + '</option>'; }).join(''));
  fillSelect('#mgrTnExec', '<option value="manual">手动启动</option><option value="auto">创建后立即执行</option>');
  $('#mgrTnMs').checked = false;
  $('#mgrTnMsLabel').textContent = '否';
  $('#mgrTnSubs').innerHTML = '<p class="mgr-tn-sub-empty">暂无子任务。点「添加子任务」创建，可批量添加给多位协作人。</p>';
  syncSubCount();
  var subField = $('#mgrTnSubs').closest('.mgr-tn-field');
  if (subField) subField.hidden = !!editTask || rdKind;
  if (editTask) fillEditTask(editTask, rdKind);
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  $('#mgrTnTitle').focus();
}
function fillEditTask(task, rd) {
  $('#mgrTnTitle').value = task.title || '';
  $('#mgrTnDesc').value = task.desc || '';
  $('#mgrTnAccept').value = task.acceptance || '';
  mgrDateSet($('#mgrTnDue'), task.dueDate || '');
  var aiOn = !!task.aiAccept;
  $('#mgrTnAiBtn').setAttribute('data-ai', aiOn ? 'on' : 'off');
  $('#mgrTnAiBtn').querySelector('span').textContent = aiOn ? 'AI 验收 · 开' : 'AI 验收';
  var picked = (task.collaborators || []).map(String);
  document.querySelectorAll('#mgrTnCollabPopup input[data-mgr-tn-collab]').forEach(function (el) {
    el.checked = picked.indexOf(el.getAttribute('data-mgr-tn-collab')) >= 0;
  });
  var n = checkedCollaborators().length;
  $('#mgrTnCollabBtn').querySelector('span').textContent = n ? '协作人 ' + n + ' 人' : '添加协作人';
  var self = mgrTaskKey(task);
  Array.prototype.forEach.call($('#mgrTnParent').options, function (o) { if (o.value === self) o.remove(); });
  Array.prototype.forEach.call($('#mgrTnPre').options, function (o) { if (o.value === self) o.remove(); });
  if (task.parentId != null && task.parentId !== '') $('#mgrTnParent').value = (rd ? 'tk' : '') + task.parentId;
  if (task.preTaskId) $('#mgrTnPre').value = (rd ? 'tk' : '') + task.preTaskId;
  if (task.docDir) $('#mgrTnDir').value = task.docDir;
  if (task.kpi) $('#mgrTnKpi').value = task.kpi;
  $('#mgrTnMs').checked = !!task.milestoneFlag;
  $('#mgrTnMsLabel').textContent = task.milestoneFlag ? '是' : '否';
  /* 研发任务：和新建一样展示执行计划；已启动（有阶段不是待执行）后只读 */
  if (rd) {
    var plan = task.executionPlan || [];
    editLocked = task.status !== 'backlog' || plan.some(function (st) { return st.status && st.status !== 'pending'; });
    draftStages = plan.map(function (st) {
      return Object.assign({}, st, { expertIds: st.expertId ? [st.expertId] : [] });
    });
    renderStages();
  }
}
function closeTaskNew() {
  var overlay = $('#mgrTaskNewOverlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
}
/* 父任务 / 前序任务只在同一份任务数据内关联：开发任务记开发任务编号，管理任务记管理任务编号 */
function sameStoreId(key, dev) {
  if (!key) return null;
  var isDevKey = key.indexOf('tk') === 0;
  if (isDevKey !== dev) return null;
  return Number(isDevKey ? key.slice(2) : key);
}
function saveTaskEdit(project, rd, title) {
  var task = mgrTaskById(editingKey);
  if (!task) { toast('任务已不存在', 'error'); closeTaskNew(); return; }
  var patch = {
    title: title,
    desc: $('#mgrTnDesc').value.trim(),
    dueDate: mgrDateGet($('#mgrTnDue')),
    collaborators: checkedCollaborators(),
    acceptance: $('#mgrTnAccept').value.trim(),
    docDir: $('#mgrTnDir').value || '',
    kpi: $('#mgrTnKpi').value || '',
    aiAccept: $('#mgrTnAiBtn').getAttribute('data-ai') === 'on',
    milestoneFlag: $('#mgrTnMs').checked,
  };
  if (rd && !editLocked) {
    var stages = collectStages();
    if (!stages.length) { toast('研发任务至少保留一个执行阶段', 'error'); return; }
    if (stages.some(function (st) { return !st.assigneeId; })) { toast('请为每个执行阶段选择审核人', 'error'); return; }
    patch.executionPlan = stages;
    patch.assignee = stages[0].assigneeId;
  }
  var parentId = sameStoreId($('#mgrTnParent').value, rd);
  var preId = sameStoreId($('#mgrTnPre').value, rd);
  patch.parentId = parentId !== null ? parentId : '';
  patch.preTaskId = preId !== null ? String(preId) : '';
  if (mgrIsDevTask(task)) tkUpdateTask(task.id, patch);
  else { Object.assign(task, patch, { updatedAt: stamp() }); mgrSaveTasks(); }
  closeTaskNew();
  document.dispatchEvent(new Event('lingee:mgr-tasks-changed'));
  toast('任务已保存', 'success');
}
function saveTaskNew(start) {
  var project = mgrProjectById(taskNewProjectId);
  if (!project) { toast('请先打开项目详情', 'warning'); return; }
  var rd = !!document.querySelector('[data-mgr-tntype="rd"].active');
  var title = $('#mgrTnTitle').value.trim();
  if (!title) { toast('请输入任务名', 'error'); $('#mgrTnTitle').focus(); return; }
  if (editingKey) { saveTaskEdit(project, rd, title); return; }
  var stages = rd ? collectStages() : [];
  if (rd && !stages.length) { toast('研发任务至少保留一个执行阶段', 'error'); return; }
  if (rd && stages.some(function (st) { return !st.assigneeId; })) { toast('请为每个执行阶段选择审核人', 'error'); return; }
  var members = mgrProjectMembers(project);
  var collaborators = checkedCollaborators();
  var me = mgrCurrentPersonId();
  var mine = members.find(function (m) { return m.id === me; });
  /* 研发任务按人员分配：任务当前处理人就是第一阶段的执行人 */
  var assignee = rd ? stages[0].assigneeId : collaborators[0] || (mine && mine.id) || (members[0] && members[0].id) || me || '';
  var parentId = sameStoreId($('#mgrTnParent').value, rd);
  var preId = sameStoreId($('#mgrTnPre').value, rd);
  var fields = Object.assign({
    title: title,
    desc: $('#mgrTnDesc').value.trim(),
    issueType: rd ? '研发任务' : '通用任务',
    status: 'backlog',
    dueDate: mgrDateGet($('#mgrTnDue')),
    assignee: assignee,
    createdBy: me,
    project: project.id,
    teamId: project.defaultTeam || '',
    labels: [rd ? '研发任务' : '通用任务'],
    collaborators: collaborators,
    acceptance: $('#mgrTnAccept').value.trim(),
    docDir: $('#mgrTnDir').value || '',
    kpi: $('#mgrTnKpi').value || '',
    aiAccept: $('#mgrTnAiBtn').getAttribute('data-ai') === 'on',
    milestoneFlag: $('#mgrTnMs').checked,
  }, parentId !== null ? { parentId: parentId } : {}, preId !== null ? { preTaskId: String(preId) } : {}, rd ? {
    taskKind: 'rd', executionMode: $('#mgrTnExec').value || 'manual', executionPlan: stages, planStatus: 'draft',
  } : {});
  var task = rd ? mgrCreateDevTask(fields) : mgrCreateTask(fields);
  document.querySelectorAll('#mgrTnSubs [data-mgr-tn-sub]').forEach(function (row) {
    var sub = ((row.querySelector('.mgr-tn-sub-input') || {}).value || '').trim();
    if (!sub) return;
    var subFields = { title: sub, issueType: '通用任务', status: 'backlog', assignee: assignee, createdBy: me, project: project.id, teamId: project.defaultTeam || '', parentId: task.id };
    if (rd) mgrCreateDevTask(subFields); else mgrCreateTask(subFields);
  });
  mgrSaveTasks();
  closeTaskNew();
  document.dispatchEvent(new Event('lingee:mgr-tasks-changed'));
  if (!rd) {
    if (start) setTaskStatus(task, 'in_progress');
    toast(start ? '任务已创建并启动' : '任务已创建', 'success');
    return;
  }
  toast('研发任务已分配给「' + mgrPersonName(assignee) + '」，待其在开发板块「任务」中开始执行', 'success');
}

function initTaskNewModal() {
  var overlay = $('#mgrTaskNewOverlay');
  if (!overlay) return;
  overlay.addEventListener('click', function (e) {
    var t = e.target;
    if (t === overlay || t.closest('[data-mgr-tntask-close]')) { closeTaskNew(); return; }
    var tab = t.closest('[data-mgr-tntab]');
    if (tab) {
      var name = tab.getAttribute('data-mgr-tntab');
      document.querySelectorAll('[data-mgr-tntab]').forEach(function (b) {
        var on = b.getAttribute('data-mgr-tntab') === name;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
      });
      $('#mgrTnCore').hidden = name !== 'core';
      $('#mgrTnExtra').hidden = name !== 'extra';
      return;
    }
    var type = t.closest('[data-mgr-tntype]');
    if (type) {
      document.querySelectorAll('[data-mgr-tntype]').forEach(function (b) { b.classList.toggle('active', b === type); });
      syncRdPane();
      return;
    }
    if (t.closest('#mgrTnCollabBtn')) {
      var pop = $('#mgrTnCollabPopup');
      pop.hidden = !pop.hidden;
      $('#mgrTnCollabBtn').setAttribute('aria-expanded', String(!pop.hidden));
      return;
    }
    var ai = t.closest('[data-mgr-tn-ai]');
    if (ai) {
      var on = ai.getAttribute('data-mgr-tn-ai') === 'on';
      var btn = $('#mgrTnAiBtn');
      btn.setAttribute('data-ai', on ? 'on' : 'off');
      btn.querySelector('span').textContent = on ? 'AI 验收 · 开' : 'AI 验收';
      $('#mgrTnAiMenu').hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      return;
    }
    if (t.closest('#mgrTnAiBtn')) {
      var menu = $('#mgrTnAiMenu');
      menu.hidden = !menu.hidden;
      $('#mgrTnAiBtn').setAttribute('aria-expanded', String(!menu.hidden));
      return;
    }
    var tool = t.closest('[data-mgr-tn-tool]');
    if (tool) { toast('「' + tool.getAttribute('data-mgr-tn-tool') + '」入口（演示占位）'); return; }
    if (t.closest('#mgrTnStageAdd')) { addStage(); return; }
    var rmStage = t.closest('[data-mgr-tn-stage-remove]');
    if (rmStage) {
      var rid = rmStage.getAttribute('data-mgr-tn-stage-remove');
      draftStages = draftStages.filter(function (st) { return st.id !== rid; });
      renderStages();
      return;
    }
    if (t.closest('#mgrTnSubAdd')) { addSubRow(); return; }
    var rmSub = t.closest('[data-mgr-tn-sub-remove]');
    if (rmSub) {
      var sub = rmSub.closest('[data-mgr-tn-sub]');
      if (sub) sub.remove();
      syncSubCount();
      return;
    }
    if (t.closest('#mgrTnSave')) { saveTaskNew(false); return; }
    if (t.closest('#mgrTnSaveStart')) { saveTaskNew(true); return; }
    if (!t.closest('.mgr-tn-pop-wrap')) {
      $('#mgrTnCollabPopup').hidden = true;
      $('#mgrTnAiMenu').hidden = true;
    }
  });
  overlay.addEventListener('change', function (e) {
    var typeSel = e.target.closest('[data-mgr-tn-stage-type]');
    if (typeSel) {
      var st = stageById(typeSel.getAttribute('data-mgr-tn-stage-type'));
      var opt = stageOptions(planProject).find(function (o) { return o.name === typeSel.value; });
      if (st && opt) {
        var fresh = stageFromOption(planProject, opt);
        st.workType = fresh.workType; st.title = fresh.title; st.description = fresh.description;
        st.expertId = fresh.expertId; st.expertIds = fresh.expertIds;
        if (!st.assigneeId) st.assigneeId = fresh.assigneeId;
        renderStages();
      }
      return;
    }
    var reviewBox = e.target.closest('[data-mgr-tn-stage-review]');
    if (reviewBox) { var rs = stageById(reviewBox.getAttribute('data-mgr-tn-stage-review')); if (rs) rs.requiresConfirmation = !reviewBox.checked; return; }
    var ownerSel = e.target.closest('[data-mgr-tn-stage-owner]');
    if (ownerSel) { var os = stageById(ownerSel.getAttribute('data-mgr-tn-stage-owner')); if (os) os.assigneeId = ownerSel.value; return; }
    if (e.target.matches('input[data-mgr-tn-collab]')) {
      var n = checkedCollaborators().length;
      var btn = $('#mgrTnCollabBtn');
      btn.setAttribute('data-collab-count', String(n));
      btn.querySelector('span').textContent = n ? '协作人 ' + n + ' 人' : '添加协作人';
    }
    if (e.target.id === 'mgrTnMs') $('#mgrTnMsLabel').textContent = e.target.checked ? '是' : '否';
  });
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.stopPropagation(); closeTaskNew(); }
  });
}

function initTaskDeleteModal() {
  var overlay = $('#mgrTaskDeleteOverlay');
  if (!overlay) return;
  overlay.addEventListener('click', function (e) {
    if (e.target.closest('[data-mgr-task-delete-confirm]')) { confirmTaskDelete(); return; }
    if (e.target === overlay || e.target.closest('[data-mgr-task-delete-cancel]')) closeTaskDelete();
  });
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeTaskDelete(); return; }
    if (e.key !== 'Tab') return;
    var cancel = overlay.querySelector('[data-mgr-task-delete-cancel]');
    var ok = overlay.querySelector('[data-mgr-task-delete-confirm]');
    if (e.shiftKey && document.activeElement === cancel) { e.preventDefault(); ok.focus(); }
    else if (!e.shiftKey && document.activeElement === ok) { e.preventDefault(); cancel.focus(); }
  });
}

export function initManagerPlan() {
  initTaskNewModal();
  initTaskDeleteModal();
  /* 固定定位的行菜单不随页面滚动，滚动或缩放时收起 */
  window.addEventListener('resize', closeRowMenu);
  document.addEventListener('scroll', function (e) {
    if (openRowMenu !== null && !(e.target.closest && e.target.closest('.mgr-row-menu'))) closeRowMenu();
  }, true);
  var panel = $('#mgr-panel-projects');
  if (!panel) return;
  panel.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('#mgrPdTaskNew')) { openTaskNew(null, { kind: 'general' }); return; }
    var view = t.closest('[data-pdview]');
    if (view) { setPlanView(view.getAttribute('data-pdview')); return; }
    var ms = t.closest('[data-mgr-ms-toggle]');
    if (ms) {
      var idx = Number(ms.getAttribute('data-mgr-ms-toggle'));
      if (collapsedMilestones.has(idx)) collapsedMilestones.delete(idx); else collapsedMilestones.add(idx);
      rerenderPlan();
      return;
    }
    var act = t.closest('[data-mgr-task-act]');
    if (act) { runTaskAction(act.getAttribute('data-mgr-task-act'), act.getAttribute('data-mgr-task-key')); return; }
    var rowMenu = t.closest('[data-mgr-row-menu]');
    if (rowMenu) {
      var rid = rowMenu.getAttribute('data-mgr-row-menu');
      openRowMenu = openRowMenu === rid ? null : rid;
      rerenderPlan();
      return;
    }
    var delBtn = t.closest('[data-mgr-task-delete]');
    if (delBtn) {
      openRowMenu = null;
      rerenderPlan();
      requestTaskDelete(delBtn.getAttribute('data-mgr-task-delete'), delBtn);
      return;
    }
    var issueBtn = t.closest('[data-mgr-task-issue]');
    if (issueBtn) {
      var task = mgrTaskById(issueBtn.getAttribute('data-mgr-task-issue'));
      var project = currentPlanProject();
      if (project && task) {
        mgrAddIssue(project.id, '任务「' + task.title + '」执行争议', '来自任务 ' + (task.code || ''));
        toast('已升级为议题：可在右栏「议题」中跟进', 'success');
      }
      openRowMenu = null;
      rerenderPlan();
      return;
    }
    var openBtn = t.closest('[data-mgr-task-open]');
    if (openBtn) {
      openRowMenu = null;
      rerenderPlan();
      var devTask = mgrTaskById(openBtn.getAttribute('data-mgr-task-open'));
      if (devTask && mgrIsDevTask(devTask)) { closeTaskPanel(); openTaskDetail(devTask.id); }
      return;
    }
    var perm = t.closest('[data-mgr-session-perm]');
    if (perm) {
      mgrSetSessionPerm(perm.checked);
      toast(perm.checked ? '已恢复会话查看权限（演示）' : '已切换为无权限演示：仅展示任务元数据与执行状态');
      return;
    }
    var msTask = t.closest('.mgr-ms-task');
    if (msTask && !t.closest('button')) { openTaskPanel(msTask.getAttribute('data-mgr-task')); return; }
    var ganttTask = t.closest('[data-mgr-gantt-task]');
    if (ganttTask) { openTaskPanel(ganttTask.getAttribute('data-mgr-gantt-task')); return; }
    if (t.closest('[data-mgr-tp-edit]')) { toast('任务编辑（演示占位）：任务信息在开发板块维护'); return; }
    var more = t.closest('[data-mgr-tp-more]');
    if (more) {
      var menu = more.closest('.mgr-tp-more').querySelector('.mgr-tp-more-menu');
      menu.hidden = !menu.hidden;
      more.setAttribute('aria-expanded', String(!menu.hidden));
      return;
    }
    if (!t.closest('.mgr-tp-more-menu')) {
      var openMenu = $('#mgrTaskPanelBody .mgr-tp-more-menu:not([hidden])');
      if (openMenu) openMenu.hidden = true;
    }
    if (t.closest('[data-mgr-taskpanel-close]')) { closeTaskPanel(); return; }
    var row = t.closest('.mgr-tk-row');
    if (row && !t.closest('button') && !t.closest('.mgr-row-menu')) {
      openRowMenu = null;
      openTaskPanel(row.getAttribute('data-mgr-task'));
      return;
    }
    if (!t.closest('.mgr-row-menu') && openRowMenu !== null) { openRowMenu = null; rerenderPlan(); }
  });
  panel.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var msTask = e.target.closest && e.target.closest('.mgr-ms-task');
    if (msTask) { e.preventDefault(); openTaskPanel(msTask.getAttribute('data-mgr-task')); }
    var gt = e.target.closest && e.target.closest('[data-mgr-gantt-task]');
    if (gt) { e.preventDefault(); openTaskPanel(gt.getAttribute('data-mgr-gantt-task')); }
  });
  panel.addEventListener('input', function (e) {
    if (e.target.id === 'mgrPdSearch') { searchText = e.target.value; rerenderKeepSearchFocus(); }
  });
  panel.addEventListener('change', function (e) {
    if (e.target.id === 'mgrPdStatus') { statusFilter = e.target.value; rerenderPlan(); }
    if (e.target.id === 'mgrPdAssignee') { assigneeFilter = e.target.value; rerenderPlan(); }
    if (e.target.id === 'mgrPdSort') { sortMode = e.target.value; rerenderPlan(); }
  });
  var wrap = $('#mgrTaskPanelWrap');
  if (wrap) {
    wrap.addEventListener('click', function (e) { if (e.target === wrap) closeTaskPanel(); });
    wrap.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); closeTaskPanel(); } });
  }
  document.addEventListener('lingee:mgr-tasks-changed', function () {
    rerenderPlan();
    if (openTaskId !== null) renderTaskPanel();
  });
  document.addEventListener('lingee:mgr-perm-changed', rerenderPlan);
}

export { STATUS_CHIPS, closeTaskPanel, matchStatus, openTaskNew, openTaskPanel, planWorkspaceHtml, resetPlanState, rowActionsHtml, statusTag };
