import { tkGetTasks } from '../tasks-v2/data.js';
import { escapeHtml } from './messages.js';
/* 任务对话：输入 # 唤起任务选择（拆自 composer.js） */

/* ---------- # 唤起任务选择 ---------- */
var taskPicker = null;
var taskPickerItems = [];
var taskPickerIdx = -1;
var taskPickerRange = null;

function ensureTaskPicker() {
  if (taskPicker) return taskPicker;
  taskPicker = document.createElement('div');
  taskPicker.className = 'tk-mention-picker';
  taskPicker.hidden = true;
  document.body.appendChild(taskPicker);
  taskPicker.addEventListener('mousedown', function (e) {
    var item = e.target.closest('.tk-mention-item');
    if (item) { e.preventDefault(); confirmTaskMention(parseInt(item.dataset.idx, 10)); }
  });
  return taskPicker;
}

function showTaskPicker(anchorEl, query) {
  var picker = ensureTaskPicker();
  var tasks = tkGetTasks();
  var q = query.trim().toLowerCase();
  var matches = q ? tasks.filter(function (t) {
    return (t.code || '').toLowerCase().indexOf(q) > -1 || (t.title || '').toLowerCase().indexOf(q) > -1;
  }) : tasks;
  matches = matches.slice(0, 20);
  taskPickerItems = matches;
  taskPickerIdx = matches.length ? 0 : -1;
  if (!matches.length) {
    picker.innerHTML = '<div class="tk-mention-empty">没有匹配的任务</div>';
  } else {
    picker.innerHTML = matches.map(function (t, i) {
      var sel = i === 0 ? ' selected' : '';
      return '<div class="tk-mention-item' + sel + '" data-idx="' + i + '">'
        + '<span class="tk-mention-code">' + escapeHtml(t.code || '') + '</span>'
        + '<span class="tk-mention-title">' + escapeHtml(t.title || '') + '</span>'
        + '</div>';
    }).join('');
  }
  var rect = anchorEl.getBoundingClientRect();
  picker.style.left = rect.left + 'px';
  picker.style.top = (rect.bottom + 4) + 'px';
  picker.style.minWidth = Math.max(280, rect.width) + 'px';
  picker.hidden = false;
}

function hideTaskPicker() {
  if (taskPicker) taskPicker.hidden = true;
  taskPickerItems = [];
  taskPickerIdx = -1;
  taskPickerRange = null;
}

function highlightPickerItem(idx) {
  if (!taskPicker) return;
  var items = taskPicker.querySelectorAll('.tk-mention-item');
  items.forEach(function (el, i) { el.classList.toggle('selected', i === idx); });
  if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
}

function confirmTaskMention(idx) {
  var task = taskPickerItems[idx];
  if (!task || !taskPickerRange) { hideTaskPicker(); return; }
  var sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(taskPickerRange);
  taskPickerRange.deleteContents();
  var chip = document.createElement('span');
  chip.className = 'ctag';
  chip.contentEditable = 'false';
  chip.dataset.taskId = String(task.id);
  chip.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
    + '<span class="ctag-label">' + escapeHtml(task.code || '') + ' ' + escapeHtml(task.title || '') + '</span>'
    + '<button type="button" class="ctag-x" contenteditable="false" aria-label="移除任务关联"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
  taskPickerRange.insertNode(chip);
  var sp = document.createTextNode('\u00A0');
  chip.parentNode.insertBefore(sp, chip.nextSibling);
  var r = document.createRange();
  r.setStartAfter(sp);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
  hideTaskPicker();
}

function detectMention(ed) {
  var sel = window.getSelection();
  if (!sel.rangeCount) return null;
  var range = sel.getRangeAt(0);
  if (!ed.contains(range.startContainer)) return null;
  var node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  var text = node.textContent.substring(0, range.startOffset);
  var m = text.match(/(?:^|\s)#([^\s#]{0,30})$/);
  if (!m) return null;
  var hashOffset = range.startOffset - m[0].length + (m[1].length ? 0 : 0);
  var prefix = m[0];
  var atIdx = prefix.lastIndexOf('#');
  hashOffset = range.startOffset - prefix.length + atIdx;
  var r = document.createRange();
  r.setStart(node, hashOffset);
  r.setEnd(node, range.startOffset);
  return { query: m[1], range: r };
}

function initTaskMention(ed) {
  if (!ed) return;
  ed.addEventListener('input', function () {
    var hit = detectMention(ed);
    if (hit) {
      taskPickerRange = hit.range;
      showTaskPicker(ed, hit.query);
    } else {
      hideTaskPicker();
    }
  });
  ed.addEventListener('keydown', function (e) {
    if (!taskPicker || taskPicker.hidden) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (taskPickerIdx < taskPickerItems.length - 1) { taskPickerIdx++; highlightPickerItem(taskPickerIdx); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (taskPickerIdx > 0) { taskPickerIdx--; highlightPickerItem(taskPickerIdx); }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (taskPickerIdx >= 0) confirmTaskMention(taskPickerIdx);
    } else if (e.key === 'Escape') {
      hideTaskPicker();
      e.preventDefault();
    }
  });
  ed.addEventListener('blur', function () { setTimeout(hideTaskPicker, 150); });
  ed.addEventListener('click', function (e) {
    var x = e.target.closest('.ctag-x');
    if (!x) return;
    e.preventDefault();
    var tag = x.closest('.ctag');
    if (!tag) return;
    var sp = tag.nextSibling;
    tag.remove();
    if (sp && sp.nodeType === Node.TEXT_NODE && sp.textContent === '\u00A0') sp.remove();
  });
}

export { initTaskMention, taskPicker };
