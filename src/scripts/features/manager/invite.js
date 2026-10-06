import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { withBase } from '../../core/base-path.js';
import { mgrCanManageProject, mgrProjectById, mgrProjectInvite } from './data.js';
/* 管理 · 邀请成员：生成项目邀请链接，复制后发给同事。
   与「项目成员」分工：邀请是发链接让对方自己加入，主动添加 / 设置角色 / 移除在成员弹窗里做。 */

var projectId = null;
var trigger = null;

function linkOf(project, token) {
  var base = location.origin && location.origin !== 'null' ? location.origin : '';
  return base + withBase('/manager') + '?m=ceo-projects&proj=' + encodeURIComponent(project.id) + '&invite=' + encodeURIComponent(token);
}
function render(regenerate) {
  var p = projectId ? mgrProjectById(projectId) : null;
  if (!p) return false;
  var invite = mgrProjectInvite(p, regenerate);
  if (!invite) { toast('生成邀请链接失败，请重试', 'error'); return false; }
  $('#mgrInviteProject').textContent = p.name;
  $('#mgrInviteLink').value = linkOf(p, invite.token);
  $('#mgrInviteExpire').textContent = '链接 ' + invite.days + ' 天内有效，截止 ' + invite.expires;
  $('#mgrInviteCopy').textContent = '复制链接';
  return true;
}
function openInvite(id, from) {
  var p = mgrProjectById(id);
  if (!p) return;
  if (!mgrCanManageProject(p)) { toast('只有项目负责人或系统管理员可以邀请成员', 'warning'); return; }
  projectId = id;
  trigger = from || null;
  if (!render(false)) return;
  var overlay = $('#mgrInviteOverlay');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  $('#mgrInviteCopy').focus();
}
function closeInvite() {
  var overlay = $('#mgrInviteOverlay');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  projectId = null;
  if (trigger && trigger.isConnected) trigger.focus();
  trigger = null;
}
/* 剪贴板接口在非安全上下文（如 file:// 直接打开）不可用，退回选中文本 + execCommand */
async function copyLink() {
  var input = $('#mgrInviteLink');
  var text = input.value;
  var ok = false;
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; }
  } catch (e) { ok = false; }
  if (!ok) {
    input.focus();
    input.select();
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  }
  if (ok) {
    $('#mgrInviteCopy').textContent = '已复制';
    toast('邀请链接已复制，可发给同事', 'success');
  } else {
    input.select();
    toast('复制失败，请手动选中链接复制', 'warning');
  }
}

export function initManagerInvite() {
  var overlay = $('#mgrInviteOverlay');
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay || e.target.closest('[data-mgr-invite-close]')) { closeInvite(); return; }
    if (e.target.closest('[data-mgr-invite-copy]')) { copyLink(); return; }
    if (e.target.closest('[data-mgr-invite-reset]')) {
      if (render(true)) toast('已重新生成，旧链接已失效', 'success');
    }
  });
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeInvite(); }
  });
  $('#mgrInviteLink').addEventListener('focus', function (e) { e.target.select(); });
}

export { openInvite };
