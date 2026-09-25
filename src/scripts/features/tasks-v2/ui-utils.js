/* T00 结构拆分：ui-utils。保留原交互；事件在 init* 中按原顺序注册。 */
import { tkGetPerson } from './data.js';

function escapeHtml(s) {
  return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';
}

function priClass(p) { return 'tk-pri-' + (p || 'low'); }

function filterAssigneeOptions(menu, optionSelector, value) {
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

function chooseFirstAssignee(menu, optionSelector, e) {
  if (e.key !== 'Enter' || e.isComposing || !menu || menu.hidden) return;
  var first = Array.from(menu.querySelectorAll(optionSelector)).find(function (item) { return !item.hidden; });
  if (first) { e.preventDefault(); first.click(); }
}

function stClass(s) {
  var map = { backlog: 'gray', in_progress: 'blue', in_review: 'orange', done: 'green', blocked: 'red' };
  return 'tk-st-' + (map[s] || 'gray');
}

function taskAvatar(assignee) {
  var p = tkGetPerson(assignee);
  return '<span class="tk-avatar" style="background:' + p.color + '">' + escapeHtml(p.avatar) + '</span>';
}

function avatarSm(assignee) {
  var p = tkGetPerson(assignee);
  return '<span class="tk-avatar-sm" style="background:' + p.color + '">' + escapeHtml(p.avatar) + '</span>';
}

function fmtDate(d) {
  if (!d) return '—';
  var parts = d.split('-');
  return parts[1] + '/' + parts[2];
}

function isOverdue(d) {
  if (!d) return false;
  var today = new Date('2026-09-23');
  var due = new Date(d);
  return due < today;
}

function priWeight(p) {
  var w = { urgent: 4, high: 3, medium: 2, low: 1 };
  return w[p] || 0;
}

function positionPopover(popover, trigger, alignEnd) {
  var rect = trigger.getBoundingClientRect();
  var width = popover.offsetWidth;
  var left = alignEnd ? rect.right - width : rect.left;
  popover.style.left = Math.max(8, Math.min(left, window.innerWidth - width - 8)) + 'px';
  popover.style.top = Math.min(rect.bottom + 4, window.innerHeight - popover.offsetHeight - 8) + 'px';
}

export { priWeight, isOverdue, escapeHtml, stClass, priClass, avatarSm, fmtDate, taskAvatar, positionPopover, filterAssigneeOptions, chooseFirstAssignee };
