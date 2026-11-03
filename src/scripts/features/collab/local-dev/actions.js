import { requestDeleteConfirmation } from '../../../core/delete-confirm.js';
import { ldOpenPersonalSettings } from './settings-page.js';
import { toast } from '../../../core/toast.js';
import { ldRepoInfo, ldScopeBindingKey, ldEnvironmentId, ldAssignScopeDirectory, ldRefresh, ldTargetProject, ldForgetRepoBinding, ldAdoptLocalCred, ldDetect, ldFindLocalCred, ldProjectStatus } from './core.js';
import { ldOpenAuth } from './auth-dialog.js';
import { ldOpenSpaceDialog } from './space-dialog.js';

/* 本地开发 · 跨界面共用的按钮动作：设置页卡片、导航浮层里同名的 data-ld-* 按钮统一在这里分发。
   登录（data-ld-auth-open）由 auth-dialog.js、安装 Git（data-ld-git-install）由 git-install.js 各自处理。 */

/* 初始化：没有账号时先用本机已有的 HTTPS 凭据，都没有就打开登录弹窗，登录后自动继续打开初始化弹窗 */
export function ldQuickSetup(projectId, directoryMode) {
  var status = ldProjectStatus(projectId);
  if (!status.info || status.ready && !directoryMode || status.invalid) return;
  if (!status.authOk) {
    var cred = ldFindLocalCred(status.info.host) ? ldAdoptLocalCred(status.info.host) : null;
    if (!cred) { ldOpenAuth(status.info.host, function () { ldOpenSpaceDialog(projectId,null,directoryMode); }); return; }
  }
  ldOpenSpaceDialog(projectId,null,directoryMode);
}
export function ldOpenProjectSettings(projectId) {
  if (!ldTargetProject(projectId)) { toast('空间不存在或已移除', 'warning'); return; }
  ldOpenSpaceDialog(projectId);
}

export function initLocalDevActions() {
  document.addEventListener('change', function (e) {
    var select = e.target;
    if (!(select instanceof HTMLSelectElement) || !select.hasAttribute('data-ld-scope-directory')) return;
    var target = select.getAttribute('data-ld-scope-directory');
    if (select.value === '__new') {
      var info = ldRepoInfo(ldTargetProject(target));
      info.bindingKey = 'scope:' + ldScopeBindingKey(info);
      info.name = '独立目录 · ' + info.name;
      ldOpenSpaceDialog(ldEnvironmentId(info)); ldRefresh(); return;
    }
    var error = ldAssignScopeDirectory(target,select.value);
    if (error) { toast(error,'warning'); ldRefresh(); } else toast('本机目录选择已保存','success');
  });

  document.addEventListener('click', async function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var mode = t.closest('[data-ld-directory-mode]');
    if (mode && !mode.disabled) { ldQuickSetup(mode.getAttribute('data-ld-directory-target'),mode.getAttribute('data-ld-directory-mode')); return; }
    var cleanup = t.closest('[data-ld-forget-repo]');
    if (cleanup) { if (await requestDeleteConfirmation('移除这条本机绑定记录？磁盘上的代码目录会保留。', {title:'清理本机绑定', confirmLabel:'移除绑定'})) { var error = ldForgetRepoBinding(cleanup.getAttribute('data-ld-forget-repo')); toast(error || '已移除绑定，原目录已保留', error ? 'warning' : 'success'); } return; }
    var quick = t.closest('[data-ld-quick]');
    if (quick) { ldQuickSetup(quick.getAttribute('data-ld-quick')); return; }
    var settings = t.closest('[data-ld-project-settings]');
    if (settings) { ldOpenProjectSettings(settings.getAttribute('data-ld-project-settings')); return; }
    var dirOpen = t.closest('[data-ld-dir-open]');
    if (dirOpen) { ldOpenSpaceDialog(dirOpen.getAttribute('data-ld-dir-open')); return; }
    if (t.closest('[data-ld-detect]')) { ldDetect(); return; }
    if (t.closest('[data-ld-open-settings]')) { ldOpenPersonalSettings(); return; }
    if (t.closest('[data-ld-reveal]')) toast('已打开空间目录（演示）');
  });
}
