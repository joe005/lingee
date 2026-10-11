/* 管理板块渲染小工具 */

function mgrEsc(v) {
  return String(v ?? '').replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
/* 2026-09-18 → 9/18 */
function mgrDay(v) {
  if (!v) return '—';
  var parts = String(v).slice(0, 10).split('-');
  return parts.length === 3 ? Number(parts[1]) + '/' + Number(parts[2]) : mgrEsc(v);
}
function mgrTag(text, cls) {
  return '<span class="mgr-tag mgr-tag--' + cls + '">' + mgrEsc(text) + '</span>';
}

/* 任务优先级标签：紧急 / 高 / 中 / 低（兼容中文取值），缺省按「中」 */
function mgrPriorityTag(priority) {
  var map = { urgent: ['紧急', 'danger'], high: ['高', 'warning'], medium: ['中', 'brand'], low: ['低', 'neutral'] };
  var alias = { '紧急': 'urgent', '高': 'high', '中': 'medium', '低': 'low' };
  var hit = map[alias[priority] || priority] || map.medium;
  return mgrTag(hit[0], hit[1]);
}

export { mgrDay, mgrEsc, mgrPriorityTag, mgrTag };
