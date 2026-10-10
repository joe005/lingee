import { $ } from '../../core/dom.js';
import { mgrIsDevTask, mgrPersonName, mgrProjectById, mgrProjectTasks, mgrTaskKey } from './data.js';
import { tkCurrentStageHandlerId } from '../tasks-v2/data.js';
import { taskListKind } from '../tasks-v2/list-kind.js';
import { taskExecutionStages } from '../tasks-v2/task-execution.js';
import { STATUS_CHIPS, matchStatus, openTaskNew, openTaskPanel, rowActionsHtml, statusTag } from './plan.js';
import { mgrEsc } from './utils.js';
/* 管理 · 项目详情「研发任务」页签：研发任务与「计划与任务」分开，按阶段推进、由智能体团队执行。
   列表沿用开发板块最初的任务卡片字段（状态、编号、标题、轮到谁的提示、阶段进度、执行团队、当前处理人、操作），
   表格样式与「计划与任务」一致。数据与开发板块共用。 */

var statusFilter = 'all';
var searchText = '';

function rdTasks(projectId) {
  return mgrProjectTasks(projectId).filter(function (t) { return mgrIsDevTask(t) && !t.parentId; });
}
/* 阶段进度：与开发板块任务卡片同口径 */
function stageProgress(task) {
  var stages = taskExecutionStages(task);
  if (!stages.length) stages = [{ id: 'task', name: '任务处理' }];
  var index = stages.findIndex(function (s) { return s.id === task.executionStageId; });
  if (task.status === 'done') index = stages.length - 1;
  else if (index < 0) {
    var plan = task.executionPlan || [];
    index = Math.max(0, plan.findIndex(function (s) { return s.status !== 'done'; }));
  }
  return { name: stages[index] ? stages[index].name : '任务处理', index: index, total: stages.length, stages: stages };
}
/* 行样式与「计划与任务」同一套（.mgr-task-table / .mgr-tk-*）：编号、任务、处理人、进展、状态 */
function rowHtml(r) {
  var t = r.task, info = r.info, p = r.progress;
  var handler = tkCurrentStageHandlerId(t) || t.assignee || '';
  var plan = t.executionPlan || [];
  var total = plan.length || 1;
  var done = plan.length ? plan.filter(function (st) { return st.status === 'done'; }).length : t.status === 'done' ? 1 : 0;
  var percent = Math.round((done / total) * 100);
  var key = mgrTaskKey(t);
  return '<tr class="mgr-tk-row" data-mgr-task="' + mgrEsc(key) + '">' +
    '<td class="mgr-tk-code">' + mgrEsc(t.code || '') + '</td>' +
    '<td class="mgr-tk-title"><span class="mgr-tk-title-text">' + mgrEsc(t.title) + '</span>' +
    '<div class="mgr-rd-hint" title="' + mgrEsc(info.hint) + '">' + mgrEsc(info.hint) + '</div></td>' +
    '<td class="mgr-tk-assignee">' + mgrEsc(info.kind === 'done' ? '—' : mgrPersonName(handler) || '待分配') + '</td>' +
    '<td class="mgr-tk-progress"><span class="mgr-bar mgr-bar--sm"><span class="mgr-bar-fill" style="width:' + percent + '%"></span></span>' +
    '<span class="mgr-tk-progress-num">' + done + '/' + total + '</span></td>' +
    '<td class="mgr-tk-status">' + statusTag(t.status) + '</td>' +
    '<td class="mgr-tk-actions">' + rowActionsHtml(t, key) + '</td></tr>';
}

function rdWorkspaceHtml(project) {
  var all = rdTasks(project.id).map(function (t) { return { task: t, info: taskListKind(t), progress: stageProgress(t) }; });
  var counts = {};
  STATUS_CHIPS.forEach(function (c) {
    counts[c[0]] = all.filter(function (r) { return matchStatus(r.task.status, c[0]); }).length;
  });
  var q = searchText.trim().toLocaleLowerCase();
  var rows = all.filter(function (r) {
    if (!matchStatus(r.task.status, statusFilter)) return false;
    return !q || [r.task.code, r.task.title].some(function (v) { return v && String(v).toLocaleLowerCase().includes(q); });
  });
  var body;
  if (!all.length) body = '<div class="mgr-empty">暂无研发任务。点「新建研发任务」选择智能体团队，按其交付阶段创建，任务分配给第一阶段执行人后在开发板块执行。</div>';
  else if (!rows.length) body = '<div class="mgr-empty">没有符合条件的研发任务。<button type="button" class="mgr-link-btn" data-mgr-rd-reset>清除筛选</button></div>';
  else {
    body = '<table class="mgr-task-table"><thead><tr><th>编号</th><th>任务</th><th>当前处理人</th><th>进展</th><th>状态</th><th aria-label="操作"></th></tr></thead><tbody>' +
      rows.map(function (r) { return rowHtml(r); }).join('') + '</tbody></table>';
  }
  return '<div class="mgr-pd-filter-row mgr-rd-toolbar">' +
    '<select id="mgrRdStatus" aria-label="研发任务状态筛选">' +
    STATUS_CHIPS.map(function (c) {
      return '<option value="' + c[0] + '"' + (statusFilter === c[0] ? ' selected' : '') + '>' + c[1] + ' ' + (counts[c[0]] || 0) + '</option>';
    }).join('') + '</select>' +
    '<label class="mgr-pd-search" for="mgrRdSearch"><input type="search" id="mgrRdSearch" value="' + mgrEsc(searchText) + '" placeholder="搜索编号或任务名" aria-label="搜索研发任务编号或任务名" autocomplete="off">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg></label>' +
    '<div class="mgr-pd-newtask"><button type="button" class="mgr-pd-newbtn" id="mgrRdTaskNew"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>新建任务</button></div></div>' +
    '<div class="mgr-pd-table-wrap" id="mgrRdArea" data-mgr-proj="' + mgrEsc(project.id) + '">' + body + '</div>';
}

function currentRdProject() {
  var area = $('#mgrRdArea');
  var id = area ? area.getAttribute('data-mgr-proj') : null;
  return id ? mgrProjectById(id) : null;
}
function rerenderRd(keepSearchFocus) {
  var pane = $('#mgrPdRdPane');
  if (!pane || pane.classList.contains('hidden')) return;
  var project = currentRdProject();
  if (!project) return;
  pane.innerHTML = rdWorkspaceHtml(project);
  if (!keepSearchFocus) return;
  var input = $('#mgrRdSearch');
  if (!input) return;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}
function resetRdState() { statusFilter = 'all'; searchText = ''; }

export function initManagerRdTasks() {
  var panel = $('#mgr-panel-projects');
  if (!panel) return;
  panel.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest('#mgrPdRdPane')) return;
    if (t.closest('#mgrRdTaskNew')) { openTaskNew(null, { kind: 'rd', project: currentRdProject() }); return; }
    if (t.closest('[data-mgr-rd-reset]')) { resetRdState(); rerenderRd(); return; }
  });
  panel.addEventListener('input', function (e) {
    if (e.target.id === 'mgrRdSearch') { searchText = e.target.value; rerenderRd(true); }
  });
  panel.addEventListener('change', function (e) {
    if (e.target.id === 'mgrRdStatus') { statusFilter = e.target.value; rerenderRd(); }
  });
  document.addEventListener('lingee:mgr-rd-rerender', function () { rerenderRd(); });
  document.addEventListener('lingee:mgr-perm-changed', function () { rerenderRd(); });
  document.addEventListener('lingee:tasks-changed', function () { rerenderRd(); });
}

export { rdTasks, rdWorkspaceHtml, resetRdState };
