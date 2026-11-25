import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { memberAddPicked, memberAvatar, memberCandidates } from './basic-settings.js';

/* 设置 › 成员 ›「添加成员」弹窗（UE 2026-11-25）：搜索姓名、邮箱或部门，勾选多人后一次添加，角色为成员。
   换搜索词后已勾选的保留；弹窗外层沿用「添加智能体」弹窗的样式。 */
var picked = [], onDone = null, returnFocus = null;
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
function overlay() { return $('#cvMemberAddOverlay'); }
function renderOptions() {
  var keyword = $('#cvMemberAddSearch').value, rows = memberCandidates(keyword);
  $('#cvMemberAddOptions').innerHTML = rows.length ? rows.map(function (m) {
    var on = picked.includes(m.id), meta = [m.dept, m.email].filter(Boolean).join(' · ');
    return '<label class="cv-recruit-option cv-member-pick"><input type="checkbox" data-member-add-key="' + esc(m.id) + '"' + (on ? ' checked' : '') + '>'
      + memberAvatar(m.name, 'cv-pick-avatar') + '<span><strong>' + esc(m.name) + '</strong><small title="' + esc(meta) + '">' + esc(meta) + '</small></span></label>';
  }).join('') : '<div class="cv-recruit-empty">' + (keyword.trim() ? '没有匹配的可添加成员' : '没有可添加的成员') + '</div>';
  syncFooter();
}
function syncFooter() {
  $('#cvMemberAddCount').textContent = '已选 ' + picked.length + ' 人';
  $('#cvMemberAddConfirm').disabled = !picked.length;
}
function close() {
  overlay().hidden = true; onDone = null;
  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
}
export function openMemberAddDialog(trigger, done) {
  if (!overlay()) return;
  picked = []; onDone = done; returnFocus = trigger;
  $('#cvMemberAddSearch').value = ''; $('#cvMemberAddError').hidden = true;
  overlay().hidden = false; renderOptions(); $('#cvMemberAddSearch').focus();
}
export function initMemberAddDialog() {
  var box = overlay(); if (!box) return;
  $('#cvMemberAddSearch').addEventListener('input', function (e) { if (!e.isComposing) renderOptions(); });
  $('#cvMemberAddSearch').addEventListener('compositionend', renderOptions);
  $('#cvMemberAddOptions').addEventListener('change', function (e) {
    var id = e.target.dataset.memberAddKey; if (!id) return;
    picked = e.target.checked ? picked.concat(id) : picked.filter(function (x) { return x !== id; });
    $('#cvMemberAddError').hidden = true; syncFooter();
  });
  $('#cvMemberAddConfirm').addEventListener('click', function () {
    var result = memberAddPicked(picked);
    if (result.error) {
      picked = picked.slice(result.added);
      $('#cvMemberAddError').textContent = result.error; $('#cvMemberAddError').hidden = false;
      if (result.added && onDone) onDone();
      renderOptions(); return;
    }
    var done = onDone; close(); if (done) done();
    toast('已添加 ' + result.added + ' 位成员', 'success');
  });
  box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('[data-member-add-close]')) close(); });
  box.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    var controls = Array.from(box.querySelectorAll('button:not(:disabled),input:not(:disabled)')).filter(function (el) { return el.getClientRects().length; });
    var first = controls[0], last = controls[controls.length - 1];
    if (e.shiftKey && e.target === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && e.target === last) { e.preventDefault(); first?.focus(); }
  });
  document.addEventListener('lingee:settings-space-changed', function () { if (!box.hidden) close(); });
}
