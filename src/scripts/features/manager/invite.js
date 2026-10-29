import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { CV_MEMBERS } from '../collab/data.js';
import { mgrCanManageProject, mgrInviteProjectMembers, mgrPendingInviteIds, mgrProjectById } from './data.js';
import { mgrEsc } from './utils.js';
/* 管理 · 邀请成员：勾选尚未加入的灵基人员，指定接受后的空间内角色（空间管理员 / 成员）后一次发出邀请；
   被邀请人在自己的待办里接受后才加入空间，待接受的人在列表里置灰。
   人员取协作开发的人员数据（CV_MEMBERS），与「空间成员」弹窗共用；岗位角色在空间成员里再调整。 */

var projectId = null;
var trigger = null;
var draft = null;   /* 新建空间时的草稿模式：{ taken: () => 已选人员 ID, onConfirm(ids, asAdmin) }，不写入任何空间 */
var picked = new Set();
var query = '';

function candidates() {
  var taken, pending = [];
  if (draft) taken = draft.taken();
  else {
    var p = projectId ? mgrProjectById(projectId) : null;
    if (!p) return [];
    taken = p.members || [];
    pending = mgrPendingInviteIds(p);
  }
  var q = query.trim().toLocaleLowerCase();
  return CV_MEMBERS.filter(function (m) {
    return m.status !== 'disabled' && !taken.includes(m.id) && (!q || m.name.toLocaleLowerCase().includes(q));
  }).map(function (m) { return { person: m, pending: pending.includes(m.id) }; });
}
function syncConfirm() {
  var btn = $('#mgrInviteConfirm');
  btn.disabled = !picked.size;
  var label = draft ? '确定' : '发送邀请';
  btn.textContent = picked.size ? label + '（' + picked.size + '）' : label;
}
function renderList() {
  var rows = candidates();
  $('#mgrInviteList').innerHTML = rows.length
    ? rows.map(function (row, i) {
      var m = row.person;
      var meta = row.pending ? '<small class="mgr-inv-pending">待接受</small>' : (m.dept ? '<small class="mgr-inv-dept">' + mgrEsc(m.dept) + '</small>' : '');
      return '<label class="mgr-inv-row' + (row.pending ? ' is-pending' : '') + '"' + (row.pending ? ' title="已发出邀请，等待对方在待办中接受"' : '') + '>' +
        '<input type="checkbox" value="' + mgrEsc(m.id) + '"' + (row.pending ? ' disabled' : (picked.has(m.id) ? ' checked' : '')) + '>' +
        '<span class="mgr-inv-avatar mgr-inv-avatar--' + (i % 4) + '" aria-hidden="true">' + mgrEsc(m.name[0] || '?') + '</span>' +
        '<span class="mgr-inv-name">' + mgrEsc(m.name) + '</span>' + meta + '</label>';
    }).join('')
    : '<div class="mgr-inv-empty">' + (query.trim() ? '没有匹配的人员' : '所有人员都已在空间中') + '</div>';
}
function openInvite(id, from, draftOptions) {
  draft = draftOptions || null;
  if (!draft) {
    var p = mgrProjectById(id);
    if (!p) return;
    if (!mgrCanManageProject(p)) { toast('只有空间负责人、空间管理员或系统管理员可以邀请成员', 'warning'); return; }
  }
  projectId = draft ? null : id;
  trigger = from || null;
  picked.clear();
  query = '';
  $('#mgrInviteSearch').value = '';
  $('#mgrInviteOverlay input[name="mgrInviteRole"][value="member"]').checked = true;
  renderList();
  syncConfirm();
  var overlay = $('#mgrInviteOverlay');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  $('#mgrInviteSearch').focus();
}
function closeInvite() {
  var overlay = $('#mgrInviteOverlay');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  projectId = null;
  draft = null;
  picked.clear();
  if (trigger && trigger.isConnected) trigger.focus();
  trigger = null;
}
function confirmInvite() {
  if (draft) {
    if (!picked.size) return;
    var onConfirm = draft.onConfirm;
    var chosen = Array.from(picked);
    var admin = $('#mgrInviteOverlay input[name="mgrInviteRole"]:checked').value === 'admin';
    closeInvite();
    onConfirm(chosen, admin);
    return;
  }
  var p = projectId ? mgrProjectById(projectId) : null;
  if (!p || !picked.size) return;
  if (!mgrCanManageProject(p)) { toast('空间权限已变化，无法邀请成员', 'warning'); return; }
  var asAdmin = $('#mgrInviteOverlay input[name="mgrInviteRole"]:checked').value === 'admin';
  var count = mgrInviteProjectMembers(p, Array.from(picked), asAdmin);
  if (count < 0) { toast('邀请发送失败，请重试', 'error'); return; }
  closeInvite();
  if (count) toast('已向 ' + count + ' 人发送邀请，对方在待办中接受后加入空间', 'success');
}

export function initManagerInvite() {
  var overlay = $('#mgrInviteOverlay');
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay || e.target.closest('[data-mgr-invite-close]')) { closeInvite(); return; }
    if (e.target.closest('#mgrInviteConfirm')) confirmInvite();
  });
  overlay.addEventListener('change', function (e) {
    if (e.target.type !== 'checkbox') return;
    if (e.target.checked) picked.add(e.target.value); else picked.delete(e.target.value);
    syncConfirm();
  });
  overlay.addEventListener('input', function (e) {
    if (e.target.id !== 'mgrInviteSearch') return;
    query = e.target.value;
    renderList();
  });
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeInvite(); }
  });
}

export { openInvite };
