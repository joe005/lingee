import { $ } from '../../core/dom.js';
import { showView, viewChat } from '../../core/view.js';
import { tkGetTasks } from '../tasks-v2/data.js';
import { chatMessages, escapeHtml } from './messages.js';
import { activeSessionTaskId } from './sessions.js';
import { closeChatDocViewer } from './doc-viewer.js';
/* 任务对话：异常回看与历史会话回看（拆自 composer.js） */

var taskExceptionBack = null;
var taskExceptionPreviousTitle = '';
function closeTaskExceptionHistory() {
  var panel = document.getElementById('taskExceptionHistory');
  var back = document.getElementById('taskExceptionBack');
  viewChat.classList.remove('task-exception-open');
  closeChatDocViewer();
  if (panel) panel.remove();
  if (back) back.remove();
  if (taskExceptionPreviousTitle) $('#chatTitle').textContent = taskExceptionPreviousTitle;
  taskExceptionBack = null;
  /* 关闭异常回看后按当前会话是否任务会话恢复历史版本入口。 */
  $('#historyBtn').classList.toggle('hidden', !!tkGetTasks().find(function (row) { return row.id === activeSessionTaskId; }));
}
function openTaskExceptionHistory(task, onBack) {
  if (!task) return;
  closeTaskExceptionHistory();
  taskExceptionPreviousTitle = $('#chatTitle').textContent;
  taskExceptionBack = onBack;
  var run = task.blockedRun;
  var reason = run?.reason || '本次执行未完成，请查看任务动态中的异常信息。';
  var steps = Array.isArray(run?.steps) ? run.steps : [];
  var header = document.querySelector('#view-chat .chat-header');
  var back = document.createElement('button');
  back.type = 'button';
  back.id = 'taskExceptionBack';
  back.className = 'header-btn';
  back.setAttribute('aria-label', '返回任务详情');
  back.textContent = '←';
  back.addEventListener('click', function () {
    var callback = taskExceptionBack;
    closeTaskExceptionHistory();
    if (callback) callback();
  });
  header.prepend(back);
  var panel = document.createElement('div');
  panel.id = 'taskExceptionHistory';
  panel.className = 'task-exception-history';
  panel.innerHTML = '<div class="task-exception-intro"><span>历史会话 · ' + escapeHtml(String(task.code || '')) + '</span><strong>' + escapeHtml(String(task.title || '任务')) + '</strong><small>' + escapeHtml(String(run?.failedAt || task.createDate || '')) + '</small></div>'
    + '<div class="task-exception-message task-exception-user"><span>任务指令</span><p>' + escapeHtml(String(task.desc || task.title || '执行任务')) + '</p></div>'
    + '<div class="task-exception-message task-exception-agent"><span>' + escapeHtml(String(run?.agentName || '执行智能体')) + ' · 执行过程</span>'
    + (steps.length ? '<ol>' + steps.map(function (step, index) { return '<li class="' + (index === steps.length - 1 ? 'is-error' : '') + '"><strong>' + escapeHtml(String(step[0] || '执行步骤')) + '</strong><p>' + escapeHtml(String(step[1] || '')) + '</p></li>'; }).join('') + '</ol>' : '<p>运行在当前阶段停止，未产生完整步骤记录。</p>')
    + '<div class="task-exception-error"><strong>执行异常</strong><p>' + escapeHtml(String(reason)) + '</p></div>'
    + (run?.next ? '<p class="task-exception-next">建议处理：' + escapeHtml(String(run.next)) + '</p>' : '') + '</div>';
  chatMessages.appendChild(panel);
  $('#chatTitle').textContent = '异常会话 · ' + (task.title || '任务');
  viewChat.classList.add('task-exception-open');
  $('#historyBtn').classList.add('hidden');
  showView('chat');
  chatMessages.scrollTop = 0;
}
/* 任务详情「我的会话」的回看：与异常回放共用面板和返回按钮，可继续会话。 */
function openTaskSessionHistory(task, session, onBack, onContinue) {
  if (!task || !session) return;
  closeTaskExceptionHistory();
  taskExceptionPreviousTitle = $('#chatTitle').textContent;
  taskExceptionBack = onBack;
  var header = document.querySelector('#view-chat .chat-header');
  var back = document.createElement('button');
  back.type = 'button';
  back.id = 'taskExceptionBack';
  back.className = 'header-btn';
  back.setAttribute('aria-label', '返回任务详情');
  back.textContent = '←';
  back.addEventListener('click', function () {
    var callback = taskExceptionBack;
    closeTaskExceptionHistory();
    if (callback) callback();
  });
  header.prepend(back);
  var steps = Array.isArray(session.steps) ? session.steps : [];
  var panel = document.createElement('div');
  panel.id = 'taskExceptionHistory';
  panel.className = 'task-exception-history task-session-history';
  panel.innerHTML = '<div class="task-exception-intro"><span>我的会话 · ' + escapeHtml(String(task.code || '')) + '</span><strong>' + escapeHtml(String(session.title || task.title || '任务')) + '</strong><small>' + escapeHtml(String(session.startedAt || '')) + (session.lastAt && session.lastAt !== session.startedAt ? ' – ' + escapeHtml(String(session.lastAt)) : '') + ' · ' + escapeHtml(String(session.statusLabel || '')) + '</small></div>'
    + session.messages.map(function (message) {
      return message.role === 'user'
        ? '<div class="task-exception-message task-exception-user"><span>我</span><p>' + escapeHtml(String(message.text || '')) + '</p></div>'
        : '<div class="task-exception-message task-exception-agent"><span>' + escapeHtml(String(session.agentName || '执行智能体')) + '</span><p>' + escapeHtml(String(message.text || '')) + '</p></div>';
    }).join('')
    + (steps.length || session.error ? '<div class="task-exception-message task-exception-agent"><span>' + escapeHtml(String(session.agentName || '执行智能体')) + ' · 执行过程</span>'
      + (steps.length ? '<ol>' + steps.map(function (step, index) { return '<li class="' + (session.error && index === steps.length - 1 ? 'is-error' : '') + '"><strong>' + escapeHtml(String(step[0] || '执行步骤')) + '</strong><p>' + escapeHtml(String(step[1] || '')) + '</p></li>'; }).join('') + '</ol>' : '')
      + (session.error ? '<div class="task-exception-error"><strong>执行异常</strong><p>' + escapeHtml(String(session.error)) + '</p></div>' : '')
      + (session.next ? '<p class="task-exception-next">建议处理：' + escapeHtml(String(session.next)) + '</p>' : '') + '</div>' : '')
    + (onContinue ? '<div class="task-session-continue"><button type="button" class="task-session-continue-btn">继续这个会话</button></div>' : '');
  panel.querySelector('.task-session-continue-btn')?.addEventListener('click', function () {
    closeTaskExceptionHistory();
    onContinue();
  });
  chatMessages.appendChild(panel);
  $('#chatTitle').textContent = '我的会话 · ' + (task.title || '任务');
  viewChat.classList.add('task-exception-open');
  $('#historyBtn').classList.add('hidden');
  showView('chat');
  chatMessages.scrollTop = 0;
}

export { closeTaskExceptionHistory, openTaskExceptionHistory, openTaskSessionHistory };
