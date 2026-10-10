import { els } from './state.js';
/* 任务页 · 列表列宽拖拽（拆分自 tasks-v2/index.js，逻辑未改） */
/* ---------- 列宽拖拽 ---------- */
var COL_WIDTHS_KEY = 'lingee_tasks_col_widths';
function loadColumnWidths() {
  try { return JSON.parse(localStorage.getItem(COL_WIDTHS_KEY) || '{}'); }
  catch (e) { return {}; }
}
function saveColumnWidths(widths) {
  try { localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(widths)); }
  catch (e) { /* 本地存储不可用时保留当前页面宽度 */ }
}
export function initColumnResize() {
  if (!els.tkListHead) return;
  var saved = loadColumnWidths();
  els.tkListHead.querySelectorAll('th').forEach(function (th) {
    if (th.classList.contains('tk-col-check') || th.classList.contains('tk-col-actions')) return;
    if (th.querySelector('.tk-col-resize')) return; /* 已初始化 */
    var colKey = (th.className.match(/tk-col-(\w+)/) || [])[1];
    if (!colKey) return;
    if (saved[colKey]) th.style.width = saved[colKey] + 'px';
    var handle = document.createElement('div');
    handle.className = 'tk-col-resize';
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      var startX = e.clientX;
      var startWidth = th.getBoundingClientRect().width;
      var pointerId = e.pointerId;
      handle.setPointerCapture(pointerId);
      handle.classList.add('dragging');
      th.classList.add('resizing');
      document.body.classList.add('tk-col-resizing');
      function move(ev) {
        if (ev.pointerId !== pointerId) return;
        th.style.width = Math.max(50, Math.round(startWidth + (ev.clientX - startX))) + 'px';
      }
      function end(ev) {
        if (ev.pointerId !== pointerId) return;
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', end);
        handle.removeEventListener('pointercancel', end);
        if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
        handle.classList.remove('dragging');
        th.classList.remove('resizing');
        document.body.classList.remove('tk-col-resizing');
        var w = loadColumnWidths();
        w[colKey] = Math.round(th.getBoundingClientRect().width);
        saveColumnWidths(w);
      }
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', end);
      handle.addEventListener('pointercancel', end);
    });
    th.appendChild(handle);
  });
}
