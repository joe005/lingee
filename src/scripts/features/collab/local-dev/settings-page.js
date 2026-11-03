import { $ } from '../../../core/dom.js';
import { toast } from '../../../core/toast.js';
import { ldEsc, ldIsDetecting, ldMine, ldRefresh, ldSaveMine } from './core.js';
import { LD_ICONS } from './ui.js';

/* 本机个人配置合并到设置 › 基础；分类切换由 workspace-settings.js 统一控制。 */
var tab = 'workspaces';
export function ldSettingsTab() { return tab; }
export function ldSettingsVisible() { return !!$('#cv-local')?.classList.contains('active'); }
/* 环境提醒等旧入口统一跳转到当前工作区的设置 › 仓库。 */
export function ldOpenPersonalSettings() {
  document.dispatchEvent(new Event('lingee:open-personal-settings'));
  document.dispatchEvent(new CustomEvent('lingee:collab-nav', { detail: { tab: 'local' } }));
}
function renderShell() {
  if (!ldSettingsVisible() || (tab !== 'spaces' && tab !== 'git')) return;
  $('#ldPersonalSectionTitle').textContent = tab === 'git' ? 'Git 账号' : '本机环境';
  $('#ldSpacesPanel').hidden = tab !== 'spaces';
  $('#ldEnvironmentNote').hidden = tab !== 'spaces';
  $('#ldGitPanel').hidden = tab !== 'git';
  var checks = ldMine().checks || {}, detecting = ldIsDetecting();
  $('#ldSettingsTools').innerHTML = (checks.checkedAt && !detecting ? '<span class="ld-checked-at">上次检测：' + ldEsc(checks.checkedAt) + '</span>' : '')
    + '<button type="button" class="ld-set-btn' + (tab === 'git' ? '' : ' ld-set-btn--primary') + '" data-ld-detect' + (detecting ? ' disabled aria-busy="true"' : '') + '>' + LD_ICONS.refresh + (detecting ? '检测中…' : '检测') + '</button>'
    + (tab === 'git' ? '<button type="button" class="ld-set-btn ld-set-btn--primary" data-ld-auth-add>' + LD_ICONS.plus + '添加</button>' : '');
  var mine = ldMine();
  $('#ldDemoLinks').innerHTML = '<button type="button" class="ld-link" data-ld-reset>演示：清空本机配置</button>'
    + '<button type="button" class="ld-link" data-ld-toggle-git>' + (mine.gitMissing ? '演示：恢复已安装 Git' : '演示：模拟未安装 Git') + '</button>'
    + '<button type="button" class="ld-link" data-ld-toggle-net>' + (mine.netDown ? '演示：恢复网络' : '演示：模拟网络不通') + '</button>';
}
function demoToggle(field, onText, offText) {
  var mine = ldMine();
  mine[field] = !mine[field];
  if (field === 'gitMissing') mine.gitInstall = { status:'idle' };
  ldSaveMine(mine);
  toast(mine[field] ? onText : offText);
  ldRefresh();
}

export function initSettingsPage() {
  var panel = $('#ldPersonalSettings'), workspacePanel = $('#cv-local');
  if (!panel || !workspacePanel) return;
  new MutationObserver(function () {
    if (workspacePanel.classList.contains('active')) {
      $('#ldWorkspacesPanel').hidden = false;
      document.dispatchEvent(new CustomEvent('lingee:ld-settings-shown', { detail: { tab: 'workspaces' } }));
    }
  }).observe(workspacePanel, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('lingee:settings-category', function (e) {
    tab = e.detail.tab === 'spaces' || e.detail.tab === 'git' ? e.detail.tab : 'workspaces';
    renderShell();
    if (tab !== 'workspaces') document.dispatchEvent(new CustomEvent('lingee:ld-settings-shown', { detail: { tab: tab } }));
  });
  panel.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-ld-toggle-git]')) { demoToggle('gitMissing', '已模拟未安装 Git，点「检测」查看提示', '已恢复，点「检测」更新状态'); return; }
    if (t.closest('[data-ld-toggle-net]')) { demoToggle('netDown', '已模拟网络不通，点「检测」查看提示', '已恢复网络，点「检测」更新状态'); return; }
    if (t.closest('[data-ld-reset]')) {
      ldSaveMine({ auths:{}, bindings:{}, checks:null, gitMissing:false, netDown:false, demoDefaultsDisabled:true });
      ldRefresh();
      toast('已清空本机配置', 'success');
    }
  });
  document.addEventListener('lingee:local-dev-changed', renderShell);
}
