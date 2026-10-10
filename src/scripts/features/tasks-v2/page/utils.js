import { toast } from '../../../core/toast.js';
import { input, setNavActive, showView } from '../../../core/view.js';
import { cvSwitchView } from '../../collab/view.js';
import { continueBlockedTaskConversation, openTaskExceptionHistory, openTaskSessionHistory, openTaskStatusConversation, sendComposerText, setComposerTaskReference } from '../../composer.js';
import { renderExpertChips } from '../../expert/chips.js';
import { set_activePick } from '../../expert/store.js';
import { showTaskConfirm, showTaskStageConfirm } from '../confirm.js';
import { TK_DELETE_BLOCKED_REASON, TK_STATUSES, tkCanDeleteTask, tkCanStartTask, tkCurrentStageHandlerId, tkCurrentUserId, tkDeleteTask, tkGetPerson, tkGetTasks, tkProjectById, tkUpdateTask } from '../data.js';
import { openNewIssueCopy } from '../new-issue-ui.js';
import { reviewTaskStage, scheduleTaskStageStartedNotice, startTaskStage } from '../task-execution.js';
import { TASK_SESSION_STATUS, tkAddTaskSession, tkGetMySessions, tkLatestStageSession, tkTaskSessionOpeningMessage, tkTaskSessionTitle } from '../task-sessions.js';
import { openListReviewPreview } from './detail-panel.js';
import { openTaskModal } from './form-modal.js';
import { render } from './layout.js';
import { pageState } from './page-state.js';
import { TASK_START_CHAT_ICON, TASK_START_PLAY_ICON, els, state, taskHeaderAction } from './state.js';
import { closeDrawer, openDrawer, taskCommentTimestamp } from './subtasks.js';
/* 任务页 · 工具函数：视图状态读写、开始按钮、人员与日期等（拆分自 tasks-v2/index.js，逻辑未改） */
/* ---------- 工具函数 ---------- */
export function escapeHtml(s) {
  return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';
}
function openTaskConversation() {
  showView('newtask');
  setNavActive('新会话');
}
/* 会话执行方跟随任务：指定了单个智能体就选它，否则选任务或项目的专家团 */
function pickTaskExecutor(task, project) {
  var teamId = task.teamId || (project && project.defaultTeam);
  if (task.expertId) set_activePick({kind:'expert', id:task.expertId, auto:false});
  else if (teamId) set_activePick({kind:'team', id:teamId, auto:false});
  else return;
  renderExpertChips();
}
/* origin 省略时按「开始执行」登记会话；传 null 表示继续已有会话，不再登记。 */
export function openTaskConversationWithTask(taskId, origin, autoSend) {
  var t = tkGetTasks().find(function (x) { return x.id === taskId; });
  if (t && origin !== null) tkAddTaskSession(t, origin || 'start', t.executionStageId || null);
  closeDrawer();
  if (t && autoSend) { startTaskConversationRun(t, origin || 'start'); return; }
  openTaskConversation();
  if (!t) return;
  var project = tkProjectById(t.project);
  pickTaskExecutor(t, project);
  setComposerTaskReference(t.id);
  input.focus();
}

/* 「开始执行」直接发起会话并进入运行中：沿用任务专家团与开场指令，不再跳输入框等手动发送 */
function startTaskConversationRun(task, origin) {
  var project = tkProjectById(task.project);
  pickTaskExecutor(task, project);
  setComposerTaskReference(task.id);
  setNavActive('新会话');
  sendComposerText(tkTaskSessionOpeningMessage(task, origin, task.executionStageId || null));
}
export function retryBlockedTask(task) {
  if (task?.status !== 'blocked') return;
  if (tkCurrentStageHandlerId(task) !== tkCurrentUserId()) { toast('仅当前阶段处理人可重试', 'warning'); return; }
  closeDrawer();
  openTaskStatusConversation(task);
  tkUpdateTask(task.id, { status:'in_progress', comments:(task.comments || []).concat({
    kind:'comment', authorId:tkCurrentUserId(), createdAt:taskCommentTimestamp(),
    status:'in_progress', assignee:task.assignee, text:'已提交重试，保留上次失败运行记录。',
  }) });
  tkAddTaskSession(task, 'retry', task.executionStageId);
  render();
  continueBlockedTaskConversation(tkGetTasks().find(function (row) { return row.id === task.id; }));
}
export function startTaskExecution(taskId, options) {
  var task = tkGetTasks().find(function (row) { return row.id === taskId; });
  if (!task) return;
  var started = startTaskStage(task, options);
  if (!started.ok) { if (started.message) toast(started.message, 'warning'); else openDrawer(taskId); return; }
  scheduleTaskStageStartedNotice(taskId, started.stage?.id);
  render();
  /* 「智能体开发」阶段直接进入智能体开发界面（对话创建智能体、编辑、测试、提交），不走通用任务会话 */
  if (started.stage?.name === '智能体开发') {
    closeDrawer();
    document.dispatchEvent(new CustomEvent('lingee:agent-dev-open', { detail: { taskId: taskId } }));
    toast('已进入智能体开发，请在会话中创建并测试智能体', 'success');
    return;
  }
  openTaskConversationWithTask(taskId, 'start', true);
  toast('已进入' + (started.stage?.name || '当前节点') + '，会话已发起并运行中', 'success');
}
export function startTaskExecutionFromSession(taskId) {
  startTaskExecution(Number(taskId));
}
export function handleTaskHeaderAction() {
  var task = tkGetTasks().find(function (row) { return row.id === state.drawerTaskId; });
  var action = taskHeaderAction(task)?.action;
  if (!action) return;
  if (action === 'queue') {
    tkUpdateTask(task.id, {status:'backlog'});
    render();
    openDrawer(task.id);
  } else if (action === 'start') {
    startTaskExecution(task.id);
  } else if (action === 'retry') retryBlockedTask(task);
  else if (action === 'review') openListReviewPreview(task.id, els.tkDrawerChat);
  else if (action === 'reply') { closeDrawer(); openTaskStatusConversation(task); }
}
function returnToTaskDetail(task) {
  var taskView = document.getElementById('view-tasks');
  var wasEmbedded = taskView?.classList.contains('pj-embedded-task-view') || !!taskView?.closest('#view-collab');
  return function () {
    if (wasEmbedded) {
      showView('collab');
      cvSwitchView('tasks');
    } else showView('tasks');
    openDrawer(task.id);
  };
}
export function openMyTaskSession(task, session) {
  var back = returnToTaskDetail(task);
  var view = Object.assign({}, session, { title: tkTaskSessionTitle(session), statusLabel: TASK_SESSION_STATUS[session.status] || '' });
  closeDrawer();
  openTaskSessionHistory(task, view, back, session.status === 'active' ? function () { openTaskConversationWithTask(task.id, null); } : null);
}
/* 阻塞阶段优先打开自己那条异常会话，没有时回退到运行记录回放。 */
export function viewBlockedTaskSession(task) {
  var session = tkLatestStageSession(task, task.executionStageId, 'failed');
  if (session) openMyTaskSession(task, session);
  else openBlockedTaskSession(task);
}
export function openBoardTaskSession(task) {
  if (!task) return;
  if (['in_progress','in_review','blocked'].includes(task.status)) {
    closeDrawer();
    openTaskStatusConversation(task);
    return;
  }
  var sessions = tkGetMySessions(task);
  var current = sessions.find(function (session) { return session.stageId === task.executionStageId && session.status === 'active'; })
    || sessions.find(function (session) { return session.stageId === task.executionStageId; });
  if (current) openMyTaskSession(task, current);
  else openDrawer(task.id);
}
function openBlockedTaskSession(task) {
  var taskView = document.getElementById('view-tasks');
  var wasEmbedded = taskView?.classList.contains('pj-embedded-task-view') || !!taskView?.closest('#view-collab');
  closeDrawer();
  openTaskExceptionHistory(task, function () {
    if (wasEmbedded) {
      showView('collab');
      cvSwitchView('tasks');
    } else showView('tasks');
    openDrawer(task.id);
  });
}
export function showCardMenu(taskId, anchorEl, detailOnly) {
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
    + (detailOnly || anchorEl.closest('.tk-card') || !tkCanStartTask(tkGetTasks().find(function (task) { return task.id === Number(taskId); })) ? '' : '<div class="tk-card-menu-item" data-card-task="' + taskId + '" data-card-action="chat">' + (pageState.taskStartLegacy ? TASK_START_CHAT_ICON : TASK_START_PLAY_ICON) + '<span>' + (pageState.taskStartLegacy ? '发起会话' : '开始执行') + '</span></div>')
    + (detailOnly ? '' : '<div class="tk-card-menu-item" data-card-task="' + taskId + '" data-card-action="copy">' + itemSvg.copy + '<span>复制</span></div>')
    + (tkCanDeleteTask(tkGetTasks().find(function (task) { return task.id === Number(taskId); }))
      ? '<div class="tk-card-menu-item danger" data-card-task="' + taskId + '" data-card-action="delete">' + itemSvg.delete + '<span>删除</span></div>'
      : '<div class="tk-card-menu-item danger is-disabled" aria-disabled="true" title="' + TK_DELETE_BLOCKED_REASON + '" data-card-task="' + taskId + '" data-card-action="delete">' + itemSvg.delete + '<span>删除</span></div>');
  document.body.appendChild(menu);
  menu.querySelectorAll('[data-card-action]').forEach(function(item) {
    item.addEventListener('click', function() {
      if (item.getAttribute('aria-disabled') === 'true') { toast(TK_DELETE_BLOCKED_REASON, 'warning'); return; }
      var act = item.getAttribute('data-card-action');
      var aid = parseInt(item.getAttribute('data-card-task'), 10);
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
export function confirmTaskStageApproval(task, reopenDrawer, onApproved) {
  if (!task || task.status !== 'in_review') return;
  showTaskStageConfirm(task, function () {
    var currentTask = tkGetTasks().find(function (row) { return row.id === task.id; });
    var reviewed = reviewTaskStage(currentTask, true);
    if (!reviewed.ok) { toast(reviewed.message || '任务状态已变化，请刷新后重试', 'warning'); return; }
    render();
    if (reopenDrawer) openDrawer(task.id);
    if (onApproved) onApproved(reviewed);
    toast(reviewed.done ? '最终节点审核通过，任务已完成' : '审核通过，已流转到' + reviewed.next.name + '，等待处理人开始', 'success');
    document.dispatchEvent(new CustomEvent('lingee:task-stage-completed', {detail:{taskId:task.id}}));
  });
}
export function confirmDeleteTask(taskId) {
  var task = tkGetTasks().find(function (item) { return item.id === Number(taskId); });
  if (!task) return;
  if (!tkCanDeleteTask(task)) { toast(TK_DELETE_BLOCKED_REASON, 'warning'); return; }
  showTaskConfirm('确定删除任务「' + task.title + '」吗？', function () {
    if (state.drawerTaskId === task.id) closeDrawer();
    tkDeleteTask(task.id);
    render();
    toast('删除成功', 'success');
  });
}
function handleCardAction(act, aid) {
  if (act === 'chat') startTaskExecution(aid);
  else if (act === 'delete') confirmDeleteTask(aid);
  else if (act === 'copy') openNewIssueCopy(aid);
  else if (act === 'subtask') openTaskModal(null, aid);
}

export function priClass(p) { return 'tk-pri-' + (p || 'low'); }
export function filterAssigneeOptions(menu, optionSelector, value) {
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
export function chooseFirstAssignee(menu, optionSelector, e) {
  if (e.key !== 'Enter' || e.isComposing || !menu || menu.hidden) return;
  var first = Array.from(menu.querySelectorAll(optionSelector)).find(function (item) { return !item.hidden; });
  if (first) { e.preventDefault(); first.click(); }
}
export function stClass(s) {
  var map = { backlog: 'gray', in_progress: 'blue', in_review: 'orange', done: 'green', blocked: 'red' };
  return 'tk-st-' + (map[s] || 'gray');
}
export function statusSvg(status) {
  var s = TK_STATUSES.find(function(x){return x.id===status;});
  var icon = (s && s.icon) || (status === 'handled' ? 'check' : 'circle');
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
export function avatarSm(assignee) {
  var p = tkGetPerson(assignee);
  return '<span class="tk-avatar-sm" style="background:' + p.color + '">' + escapeHtml(p.avatar) + '</span>';
}
export function fmtDate(d) {
  if (!d) return '—';
  var parts = d.split('-');
  return parts[1] + '/' + parts[2];
}
export function isOverdue(d) {
  if (!d) return false;
  var today = new Date('2026-09-23');
  var due = new Date(d);
  return due < today;
}
export function priWeight(p) {
  var w = { urgent: 4, high: 3, medium: 2, low: 1 };
  return w[p] || 0;
}
