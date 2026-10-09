import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { CV_MEMBERS } from '../collab/data.js';
import { mgrAddProjectMembers, mgrCanManageProject, mgrProjectById } from './data.js';
import { mgrEsc } from './utils.js';
/* 管理 · 邀请成员：勾选尚未加入的灵基人员，指定本次加入的项目内角色（项目管理员 / 成员）后一次添加。
   人员取协作开发的人员数据（CV_MEMBERS），与「项目成员」弹窗共用；岗位角色在项目成员里再调整。 */

var projectId = null;
var trigger = null;
var draft = null;   /* 新建项目时的草稿模式：{ taken: () => 已选人员 ID, onConfirm(ids, asAdmin) }，不写入任何项目 */
var picked = new Set();
var query = '';

function candidates() {
  var taken;
  if (draft) taken = draft.taken();
  else {
    var p = projectId ? mgrProjectById(projectId) : null;
    if (!p) return [];
    taken = p.members || [];
  }
  var q = query.trim().toLocaleLowerCase();
  return CV_MEMBERS.filter(function (m) {
    return m.status !== 'disabled' && !taken.includes(m.id) && (!q || m.name.toLocaleLowerCase().includes(q));
  });
}
function syncConfirm() {
  var btn = $('#mgrInviteConfirm');
  btn.disabled = !picked.size;
  btn.textContent = picked.size ? '确定（' + picked.size + '）' : '确定';
}
function renderList() {
  var rows = candidates();
  $('#mgrInviteList').innerHTML = rows.length
    ? rows.map(function (m, i) {
      return '<label class="mgr-inv-row"><input type="checkbox" value="' + mgrEsc(m.id) + '"' + (picked.has(m.id) ? ' checked' : '') + '>' +
        '<span class="mgr-inv-avatar mgr-inv-avatar--' + (i % 4) + '" aria-hidden="true">' + mgrEsc(m.name[0] || '?') + '</span>' +
        '<span class="mgr-inv-name">' + mgrEsc(m.name) + '</span>' +
        (m.dept ? '<small class="mgr-inv-dept">' + mgrEsc(m.dept) + '</small>' : '') + '</label>';
    }).join('')
    : '<div class="mgr-inv-empty">' + (query.trim() ? '没有匹配的人员' : '所有人员都已在项目中') + '</div>';
}
function openInvite(id, from, draftOptions) {
  draft = draftOptions || null;
  if (!draft) {
    var p = mgrProjectById(id);
    if (!p) return;
    if (!mgrCanManageProject(p)) { toast('只有项目负责人、项目管理员或系统管理员可以邀请成员', 'warning'); return; }
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
  if (!mgrCanManageProject(p)) { toast('项目权限已变化，无法邀请成员', 'warning'); return; }
  var asAdmin = $('#mgrInviteOverlay input[name="mgrInviteRole"]:checked').value === 'admin';
  var count = picked.size;
  if (!mgrAddProjectMembers(p, Array.from(picked), asAdmin)) { toast('添加失败，请重试', 'error'); return; }
  closeInvite();
  toast('已添加 ' + count + ' 名' + (asAdmin ? '项目管理员' : '成员'), 'success');
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
