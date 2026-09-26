/* 任务详情「我的会话」区块：只列出当前用户围绕该任务发起的会话标题，默认折叠，没有会话时不显示。
   点击会话由 index.js 传入的回调打开会话详情，本模块不直接跳转页面。 */
import { escapeHtml } from './ui-utils.js';
import { tkGetMySessions, tkTaskSessionTitle } from './task-sessions.js';

var expandedByTask = new Map();
var CHEVRON_DOWN = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

function renderRow(session) {
  var title = tkTaskSessionTitle(session);
  return '<button type="button" class="tk-my-session-row" data-my-session-open="' + session.id + '" title="' + escapeHtml(title) + '">'
    + '<span class="tk-my-session-title">' + escapeHtml(title) + '</span></button>';
}

export function renderMySessionsSection(task) {
  var sessions = tkGetMySessions(task);
  if (!sessions.length) return '';
  var expanded = expandedByTask.get(task.id) === true;
  return '<section class="tk-my-sessions' + (expanded ? '' : ' is-collapsed') + '" data-my-sessions="' + task.id + '" aria-label="我的会话">'
    + '<div class="tk-my-sessions-head">'
    + '<button type="button" class="tk-my-sessions-toggle" data-my-sessions-toggle aria-expanded="' + expanded + '" aria-controls="tkMySessionsList">' + CHEVRON_DOWN + '<span>我的会话</span></button>'
    + '<span class="tk-my-sessions-count">' + sessions.length + '</span>'
    + '</div>'
    + '<div class="tk-my-sessions-list" id="tkMySessionsList"' + (expanded ? '' : ' hidden') + '>' + sessions.map(renderRow).join('') + '</div>'
    + '</section>';
}

/* 处理区块内的点击；返回 true 表示事件已被消费。 */
export function handleMySessionsClick(e, task, actions) {
  var section = e.target.closest('[data-my-sessions]');
  if (!section || !task) return false;
  if (e.target.closest('[data-my-sessions-toggle]')) {
    expandedByTask.set(task.id, expandedByTask.get(task.id) !== true);
    var parent = section.parentNode;
    section.outerHTML = renderMySessionsSection(task);
    parent.querySelector('[data-my-sessions="' + task.id + '"] [data-my-sessions-toggle]')?.focus();
    return true;
  }
  var row = e.target.closest('[data-my-session-open]');
  if (row) {
    var id = Number(row.getAttribute('data-my-session-open'));
    var session = tkGetMySessions(task).find(function (item) { return item.id === id; });
    if (session) actions.openSession(task, session);
    return true;
  }
  return false;
}
