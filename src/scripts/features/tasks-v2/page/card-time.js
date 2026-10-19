import { escapeHtml } from '../ui-utils.js';

/* 只更新相对时间文本，避免定时重绘卡片影响滚动与拖拽。 */
export function relativeTaskTime(value, now = Date.now()) {
  var timestamp = Date.parse(String(value || '').replace(' ', 'T'));
  if (!Number.isFinite(timestamp)) return '';
  var minutes = Math.floor(Math.max(0, now - timestamp) / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return minutes + ' 分钟前';
  if (minutes < 1440) return Math.floor(minutes / 60) + ' 小时前';
  return Math.floor(minutes / 1440) + ' 天前';
}
export function renderTaskUpdatedTime(task) {
  var value = task.updatedAt;
  var text = relativeTaskTime(value);
  if (!text) return '';
  return '<time class="tk-card-updated-time" data-task-updated-time="' + escapeHtml(value) + '" datetime="' + escapeHtml(String(value).replace(' ', 'T')) + '" data-tooltip="更新时间：' + escapeHtml(value) + '" aria-label="更新时间：' + escapeHtml(value) + '">' + text + '</time>';
}
export function initTaskCardTimes() {
  function updateTimes() {
    if (document.hidden) return;
    document.querySelectorAll('[data-task-updated-time]').forEach(function(node){
      node.textContent = relativeTaskTime(node.dataset.taskUpdatedTime);
    });
  }
  setInterval(updateTimes, 60000);
  document.addEventListener('visibilitychange', updateTimes);
}
