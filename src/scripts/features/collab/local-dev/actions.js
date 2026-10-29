import { toast } from '../../../core/toast.js';
import { tkProjectById } from '../../tasks-v2/data.js';
import { ldAdoptLocalCred, ldDetect, ldFindLocalCred, ldProjectStatus } from './core.js';
import { ldOpenAuth } from './auth-dialog.js';
import { ldOpenSpaceDialog } from './space-dialog.js';

/* 本地开发 · 跨界面共用的按钮动作：设置页卡片、导航浮层里同名的 data-ld-* 按钮统一在这里分发。
   登录（data-ld-auth-open）由 auth-dialog.js、安装 Git（data-ld-git-install）由 git-install.js 各自处理。 */

/* 初始化：没有账号时先用本机已有的 HTTPS 凭据，都没有就打开登录弹窗，登录后自动继续打开初始化弹窗 */
export function ldQuickSetup(projectId) {
  var status = ldProjectStatus(projectId);
  if (status.ready || status.invalid) return;
  if (!status.authOk) {
    var cred = ldFindLocalCred(status.info.host) ? ldAdoptLocalCred(status.info.host) : null;
    if (!cred) { ldOpenAuth(status.info.host, function () { ldOpenSpaceDialog(projectId); }); return; }
  }
  ldOpenSpaceDialog(projectId);
}
export function ldOpenProjectSettings(projectId) {
  if (!tkProjectById(projectId)) { toast('空间不存在或已移除', 'warning'); return; }
  ldOpenSpaceDialog(projectId);
}

export function initLocalDevActions() {
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var quick = t.closest('[data-ld-quick]');
    if (quick) { ldQuickSetup(quick.getAttribute('data-ld-quick')); return; }
    var settings = t.closest('[data-ld-project-settings]');
    if (settings) { ldOpenProjectSettings(settings.getAttribute('data-ld-project-settings')); return; }
    var dirOpen = t.closest('[data-ld-dir-open]');
    if (dirOpen) { ldOpenSpaceDialog(dirOpen.getAttribute('data-ld-dir-open')); return; }
    if (t.closest('[data-ld-detect]')) { ldDetect(); return; }
    if (t.closest('[data-ld-open-settings]')) { window.cvSwitchView?.('local'); return; }
    if (t.closest('[data-ld-reveal]')) toast('已打开空间目录（演示）');
  });
}
