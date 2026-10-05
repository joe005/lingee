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

export { mgrDay, mgrEsc, mgrTag };
