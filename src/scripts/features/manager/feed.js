import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { TASK_STATUSES, mgrIsDevTask, mgrPersonName, mgrProjectIssues, mgrProjectKnowledge, mgrProjectTasks, mgrTaskKey, mgrTeam } from './data.js';
import { mgrEsc } from './utils.js';
/* 管理 · 项目动态：活动流。由任务创建、状态变更和知识库归档汇总成时间线，
   可按来源（人工 / 专家 / 风险 / 系统）、任务和关键词过滤。 */

var SOURCES = [['all', '全部'], ['human', '人工'], ['agent', '专家'], ['risk', '风险'], ['system', '系统']];
var MAX_ITEMS = 60;

var sourceFilter = 'all';
var taskFilter = '';
var query = '';

function statusName(id) {
  var hit = TASK_STATUSES.find(function (s) { return s.id === id; });
  return hit ? hit.name : String(id || '');
}
/* "2026-10-03 11:18" → "10/3 11:18"；只有日期时只显示日期 */
function stamp(v) {
  var s = String(v || '');
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}:\d{2}))?/);
  return m ? Number(m[2]) + '/' + Number(m[3]) + (m[4] ? ' ' + m[4] : '') : s;
}
function agentName(p) {
  var team = mgrTeam(p.defaultTeam);
  return team ? team.name : '专家团';
}
function formatTime(ms) {
  var d = new Date(ms);
  var pad = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00';
}
function taskChip(t) { return (t.code || '') + ' | ' + t.title; }

function collect(p) {
  var items = [];
  mgrProjectTasks(p.id).forEach(function (t) {
    var key = mgrTaskKey(t);
    items.push({
      time: String(t.createdAt || t.createDate || ''), action: '任务创建', source: 'human', tone: 'create',
      actor: t.createdBy ? mgrPersonName(t.createdBy) : '系统任务', taskKey: key, task: taskChip(t),
      text: '创建任务：' + taskChip(t),
    });
    var history = t.statusHistory || [];
    history.forEach(function (h) {
      var person = h.authorId ? mgrPersonName(h.authorId) : '';
      /* 人工：开始执行、审核通过；专家：提交产物待审核；阻塞记为风险 */
      var source = h.to === 'blocked' ? 'risk' : h.from === 'in_progress' && h.to === 'in_review' ? 'agent' : person && (h.to === 'in_progress' || h.to === 'done') ? 'human' : 'system';
      items.push({
        time: String(h.time || ''), action: '任务状态变更', source: source, tone: source === 'agent' ? 'kb' : source === 'human' ? 'create' : source,
        actor: source === 'agent' ? agentName(p) : person || '系统任务', taskKey: key, task: taskChip(t),
        text: '任务状态变更：' + taskChip(t) + '（' + statusName(h.from) + ' → ' + statusName(h.to) + '）',
      });
    });
    /* 专家按阶段完成：在开始执行与提交待审核之间均匀分布 */
    var start = history.find(function (h) { return h.to === 'in_progress'; });
    var submit = history.find(function (h) { return h.to === 'in_review'; });
    var doneStages = mgrIsDevTask(t) && Array.isArray(t.executionPlan) ? t.executionPlan.filter(function (st) { return st.status === 'done'; }) : [];
    if (start && submit && doneStages.length) {
      var t0 = Date.parse(String(start.time).replace(' ', 'T')), t1 = Date.parse(String(submit.time).replace(' ', 'T'));
      if (!isNaN(t0) && !isNaN(t1) && t1 > t0) {
        doneStages.forEach(function (st, n) {
          items.push({
            time: formatTime(t0 + ((t1 - t0) * (n + 1)) / (doneStages.length + 1)), action: '阶段完成', source: 'agent', tone: 'kb',
            actor: agentName(p), taskKey: key, task: taskChip(t), text: '完成「' + (st.title || st.workType) + '」阶段：' + taskChip(t),
          });
        });
      }
    }
  });
  mgrProjectIssues(p.id).forEach(function (i) {
    if (!i.decision) return;
    items.push({
      time: String(i.decision.at || ''), action: '风险决策', source: 'human', tone: 'create', actor: i.decision.by || '决策人',
      taskKey: i.taskKey || '', task: '', text: i.status + '：「' + i.title + '」，' + i.decision.text,
    });
  });
  mgrProjectKnowledge(p.id).forEach(function (k) {
    items.push({
      time: String(k.archivedAt || ''), action: '知识库归档', source: 'agent', tone: 'kb',
      actor: k.agent || '专家', taskKey: '', task: '', text: '「' + k.title + '」归档到项目知识库',
    });
  });
  return items.filter(function (x) { return x.time; })
    .sort(function (a, b) { return String(b.time).localeCompare(String(a.time)); });
}

function itemHtml(x) {
  return '<li class="mgr-fd-item"><span class="mgr-fd-time">' + mgrEsc(stamp(x.time)) + '</span><span class="mgr-fd-dot mgr-fd-dot--' + x.tone + '" aria-hidden="true"></span>' +
    '<div class="mgr-fd-body"><div class="mgr-fd-meta"><span class="mgr-fd-action mgr-fd-action--' + x.tone + '">' + mgrEsc(x.action) + '</span>' +
    '<span class="mgr-fd-actor">' + mgrEsc(x.actor) + '</span>' + (x.task ? '<span class="mgr-fd-task" title="' + mgrEsc(x.task) + '">' + mgrEsc(x.task) + '</span>' : '') + '</div>' +
    '<div class="mgr-fd-text">' + mgrEsc(x.text) + '</div></div></li>';
}

export function feedHtml(p) {
  var all = collect(p);
  var counts = { all: all.length };
  SOURCES.slice(1).forEach(function (s) { counts[s[0]] = all.filter(function (x) { return x.source === s[0]; }).length; });
  var tasks = mgrProjectTasks(p.id);
  if (taskFilter && !tasks.some(function (t) { return mgrTaskKey(t) === taskFilter; })) taskFilter = '';
  var q = query.trim().toLocaleLowerCase();
  var shown = all.filter(function (x) {
    return (sourceFilter === 'all' || x.source === sourceFilter) && (!taskFilter || x.taskKey === taskFilter) &&
      (!q || (x.text + ' ' + x.actor + ' ' + x.task).toLocaleLowerCase().includes(q));
  }).slice(0, MAX_ITEMS);
  return '<div class="mgr-fd">' +
    '<div class="mgr-fd-head"><h2 class="mgr-fd-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>活动流</h2>' +
    '<span class="mgr-fd-sub">项目中所有人机协作活动的实时记录</span>' +
    '<label class="mgr-fd-search"><input type="search" id="mgrFdSearch" value="' + mgrEsc(query) + '" placeholder="搜索任务、议题、专家、操作人" autocomplete="off" aria-label="搜索活动">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg></label>' +
    '<button type="button" class="mgr-fd-export" data-mgr-fd-export><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>导出</button></div>' +
    '<div class="mgr-fd-filters"><div class="mgr-fd-pills" role="tablist" aria-label="活动来源">' + SOURCES.map(function (s) {
      var on = sourceFilter === s[0];
      return '<button type="button" class="mgr-fd-pill' + (on ? ' active' : '') + '" role="tab" aria-selected="' + on + '" data-mgr-fd-source="' + s[0] + '">' + s[1] + ' <small>' + counts[s[0]] + '</small></button>';
    }).join('') + '</div>' +
    '</div>' +
    '<div class="mgr-fd-tasks" role="tablist" aria-label="按任务筛选"><button type="button" class="mgr-fd-task-tab' + (taskFilter ? '' : ' active') + '" role="tab" aria-selected="' + !taskFilter + '" data-mgr-fd-task="">全部任务</button>' +
    tasks.slice(0, 12).map(function (t) {
      var key = mgrTaskKey(t);
      var on = taskFilter === key;
      return '<button type="button" class="mgr-fd-task-tab' + (on ? ' active' : '') + '" role="tab" aria-selected="' + on + '" data-mgr-fd-task="' + mgrEsc(key) + '" title="' + mgrEsc(taskChip(t)) + '">' + mgrEsc(t.title) + '</button>';
    }).join('') + '</div>' +
    (shown.length
      ? '<ol class="mgr-fd-list">' + shown.map(itemHtml).join('') + '</ol>'
      : '<div class="mgr-empty">' + (all.length ? '没有符合条件的活动。' : '暂无动态。任务创建、执行与产物归档会展示在这里。') + '</div>') + '</div>';
}

export function initManagerFeed(rerender) {
  var pane = $('#mgrPdFeedPane');
  pane.addEventListener('click', function (e) {
    var src = e.target.closest('[data-mgr-fd-source]');
    if (src) { sourceFilter = src.getAttribute('data-mgr-fd-source'); rerender(); return; }
    var task = e.target.closest('[data-mgr-fd-task]');
    if (task) { taskFilter = task.getAttribute('data-mgr-fd-task'); rerender(); return; }
    if (e.target.closest('[data-mgr-fd-export]')) toast('导出活动流（演示）：导出文件功能尚未接入', 'warning');
  });
  pane.addEventListener('input', function (e) {
    if (e.target.id !== 'mgrFdSearch') return;
    query = e.target.value;
    var caret = e.target.selectionStart;
    rerender();
    var input = $('#mgrFdSearch');
    if (input) { input.focus(); input.setSelectionRange(caret, caret); }
  });
  pane.addEventListener('change', function (e) {
  });
}
/* 切换项目 / 重新进入详情时清空过滤条件 */
export function resetFeed() {
  sourceFilter = 'all';
  taskFilter = '';
  query = '';
}
