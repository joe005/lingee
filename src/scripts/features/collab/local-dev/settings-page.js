import { $ } from '../../../core/dom.js';
import { toast } from '../../../core/toast.js';
import { ldEsc, ldIsDetecting, ldMine, ldRefresh, ldSaveMine } from './core.js';
import { LD_ICONS } from './ui.js';

/* 本地开发 · 协作开发「设置」页签外壳（#cv-local）：顶部分段页签「我的空间 / Git 账号」、上次检测与「检测」、演示入口。
   两个页签的内容分别由 spaces-page.js、git-accounts-page.js 渲染到各自面板，
   这里只负责切换面板显隐并广播 lingee:ld-settings-shown，不渲染页签内容。 */
var tab = 'spaces';
export function ldSettingsTab() { return tab; }
export function ldSettingsVisible() { return !!$('#cv-local')?.classList.contains('active'); }

function renderShell() {
  if (!ldSettingsVisible()) return;
  document.querySelectorAll('#cv-local [data-ld-settings-tab]').forEach(function (button) {
    var selected = button.dataset.ldSettingsTab === tab;
    button.classList.toggle('is-on', selected);
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  $('#ldSpacesPanel').hidden = tab !== 'spaces';
  $('#ldGitPanel').hidden = tab !== 'git';
  var checks = ldMine().checks || {}, detecting = ldIsDetecting();
  $('#ldSettingsTools').innerHTML = (checks.checkedAt && !detecting ? '<span class="ld-checked-at">上次检测：' + ldEsc(checks.checkedAt) + '</span>' : '')
    + (tab === 'git' ? '<button type="button" class="ld-set-btn" data-ld-auth-add>' + LD_ICONS.plus + '添加</button>' : '')
    + '<button type="button" class="ld-set-btn ld-set-btn--primary" data-ld-detect' + (detecting ? ' disabled aria-busy="true"' : '') + '>' + LD_ICONS.refresh + (detecting ? '检测中…' : '检测') + '</button>';
  var mine = ldMine();
  $('#ldDemoLinks').innerHTML = '<button type="button" class="ld-link" data-ld-reset>演示：清空本机配置</button>'
    + '<button type="button" class="ld-link" data-ld-toggle-git>' + (mine.gitMissing ? '演示：恢复已安装 Git' : '演示：模拟未安装 Git') + '</button>'
    + '<button type="button" class="ld-link" data-ld-toggle-net>' + (mine.netDown ? '演示：恢复网络' : '演示：模拟网络不通') + '</button>';
}
function selectTab(next) {
  if (next !== 'spaces' && next !== 'git') return;
  tab = next;
  renderShell();
  document.dispatchEvent(new CustomEvent('lingee:ld-settings-shown', { detail:{ tab:tab } }));
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
  var panel = $('#cv-local');
  if (!panel) return;
  /* 切到「设置」页签时渲染 */
  new MutationObserver(function () { if (ldSettingsVisible()) selectTab(tab); }).observe(panel, { attributes:true, attributeFilter:['class'] });
  panel.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var tabBtn = t.closest('[data-ld-settings-tab]');
    if (tabBtn) { selectTab(tabBtn.dataset.ldSettingsTab); return; }
    if (t.closest('[data-ld-toggle-git]')) { demoToggle('gitMissing', '已模拟未安装 Git，点「检测」查看提示', '已恢复，点「检测」更新状态'); return; }
    if (t.closest('[data-ld-toggle-net]')) { demoToggle('netDown', '已模拟网络不通，点「检测」查看提示', '已恢复网络，点「检测」更新状态'); return; }
    if (t.closest('[data-ld-reset]')) {
      ldSaveMine({ auths:{}, bindings:{}, checks:null, gitMissing:false, netDown:false, demoDefaultsDisabled:true });
      ldRefresh();
      toast('已清空本机配置', 'success');
    }
  });
  panel.querySelector('.ld-settings-tabs')?.addEventListener('keydown', function (e) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    var next = e.key === 'Home' ? 'spaces' : e.key === 'End' ? 'git' : tab === 'spaces' ? 'git' : 'spaces';
    selectTab(next);
    panel.querySelector('[data-ld-settings-tab="' + next + '"]')?.focus();
  });
  document.addEventListener('lingee:local-dev-changed', renderShell);
}
