import { $ } from '../../core/dom.js';
import { mgrIsDevTask, mgrPersonName, mgrProjectById, mgrProjectTasks, mgrTaskKey } from './data.js';
import { tkCurrentStageHandlerId } from '../tasks-v2/data.js';
import { taskListKind } from '../tasks-v2/list-kind.js';
import { statusTag } from './plan.js';
import { mgrEsc, mgrPriorityTag } from './utils.js';
/* 管理 · 空间详情「研发任务」板块（对齐产品）：编号、任务名（标题 + 描述）、处理人、进度、优先级、状态。
   状态筛选为全部 / 草稿 / 待开始 / 进行中 / 待审核 / 已完成 / 已阻塞 / 已取消，点行在右侧打开任务详情；
   新任务通过空间底部的对话创建。数据与开发板块共用。 */

var RD_STATUS = [['all', '全部'], ['planned', '草稿'], ['backlog', '待开始'], ['in_progress', '进行中'], ['in_review', '待审核'], ['done', '已完成'], ['blocked', '已阻塞'], ['cancelled', '已取消']];
var statusFilter = 'all';
var searchText = '';

function rdTasks(projectId) {
  return mgrProjectTasks(projectId).filter(function (t) { return mgrIsDevTask(t) && !t.parentId; });
}
/* 行样式与「计划与任务」同一套（.mgr-task-table / .mgr-tk-*）：编号、任务、处理人、进展、状态 */
function rowHtml(r) {
  var t = r.task, info = r.info;
  var handler = tkCurrentStageHandlerId(t) || t.assignee || '';
  var plan = t.executionPlan || [];
  var total = plan.length || 1;
  var done = plan.length ? plan.filter(function (st) { return st.status === 'done'; }).length : t.status === 'done' ? 1 : 0;
  var percent = Math.round((done / total) * 100);
  var key = mgrTaskKey(t);
  return '<tr class="mgr-tk-row" data-task-status="' + mgrEsc(t.status) + '" data-mgr-task="' + mgrEsc(key) + '">' +
    '<td class="mgr-tk-code">' + mgrEsc(t.code || '') + '</td>' +
    '<td class="mgr-tk-title"><span class="mgr-tk-title-text">' + mgrEsc(t.title) + '</span>' +
    (t.desc ? '<div class="mgr-rd-hint" title="' + mgrEsc(t.desc) + '">' + mgrEsc(t.desc) + '</div>' : '') + '</td>' +
    '<td class="mgr-tk-assignee">' + mgrEsc(info.kind === 'done' ? '—' : mgrPersonName(handler) || '待分配') + '</td>' +
    '<td class="mgr-tk-progress"><span class="mgr-bar mgr-bar--sm"><span class="mgr-bar-fill" style="width:' + percent + '%"></span></span>' +
    '<span class="mgr-tk-progress-num">' + done + '/' + total + '</span></td>' +
    '<td class="mgr-tk-priority">' + mgrPriorityTag(t.priority) + '</td>' +
    '<td class="mgr-tk-status">' + statusTag(t.status) + '</td></tr>';
}

function rdWorkspaceHtml(project) {
  var all = rdTasks(project.id).map(function (t) { return { task: t, info: taskListKind(t) }; });
  var counts = {};
  RD_STATUS.forEach(function (c) {
    counts[c[0]] = all.filter(function (r) { return c[0] === 'all' || r.task.status === c[0]; }).length;
  });
  var q = searchText.trim().toLocaleLowerCase();
  var rows = all.filter(function (r) {
    if (statusFilter !== 'all' && r.task.status !== statusFilter) return false;
    return !q || [r.task.code, r.task.title].some(function (v) { return v && String(v).toLocaleLowerCase().includes(q); });
  });
  var body;
  if (!all.length) body = '<div class="mgr-empty mgr-rd-empty">暂无任务。在下方输入框描述你想创建的任务，灵基会帮你拆解规划。</div>';
  else if (!rows.length) body = '<div class="mgr-empty">没有符合条件的研发任务。<button type="button" class="mgr-link-btn" data-mgr-rd-reset>清除筛选</button></div>';
  else {
    body = '<table class="mgr-task-table mgr-rd-table"><colgroup><col class="mgr-rd-col-code"><col class="mgr-rd-col-title"><col class="mgr-rd-col-handler"><col class="mgr-rd-col-progress"><col class="mgr-rd-col-priority"><col class="mgr-rd-col-status"></colgroup><thead><tr><th>编号</th><th>任务名</th><th>处理人</th><th>进度</th><th>优先级</th><th>状态</th></tr></thead><tbody>' +
      rows.map(function (r) { return rowHtml(r); }).join('') + '</tbody></table>';
  }
  return '<div class="mgr-pd-filter-row mgr-rd-toolbar">' +
    '<select id="mgrRdStatus" aria-label="研发任务状态筛选">' +
    RD_STATUS.map(function (c) {
      return '<option value="' + c[0] + '"' + (statusFilter === c[0] ? ' selected' : '') + '>' + c[1] + ' ' + (counts[c[0]] || 0) + '</option>';
    }).join('') + '</select>' +
    '<label class="mgr-pd-search" for="mgrRdSearch"><input type="search" id="mgrRdSearch" value="' + mgrEsc(searchText) + '" placeholder="搜索编号或任务名" aria-label="搜索研发任务编号或任务名" autocomplete="off">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg></label></div>' +
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
