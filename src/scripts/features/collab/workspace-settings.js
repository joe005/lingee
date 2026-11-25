import { canViewWorkspaceSettings, initBasicSettings, renderBasicSettings } from './basic-settings.js';
import { $ } from '../../core/dom.js';
import { initWorkspaceAdmin } from '../manager/workspace-admin.js';
import { getSettingsScope } from './space-switch.js';
import { settingsRepoPending } from './basic-settings.js';
import { ldMine } from './local-dev/core.js';
import { ldGitInstallHtml } from './local-dev/git-install.js';
/* 协作开发 · 设置：通用、仓库、成员、我的空间及 Git 账号。
   管理的空间由设置卡片顶部的空间切换器选择（space-switch.js），与任务等页签的筛选互不影响；没有可用空间时提示先创建或加入空间。
   面板与弹窗在 manager/workspace-admin.js，与管理板块共用同一份数据；页签的切换由 local-dev/settings-page.js
   负责，它广播 lingee:ld-settings-shown；创建工作区在顶部下拉里就地完成。 */

var currentTab = 'general';
var mountedScope = '';
var mountedManagement = false;

function visible() { var el = $('#ldWorkspacesPanel'); return !!el && !el.hidden && !!$('#cv-local')?.classList.contains('active'); }

/* 设置对所有用户开放，本机配置人人可用，空间配置沿用各自权限。 */
function syncAdminTab() {
  var button = document.querySelector('#cvTabNav [data-cvview="local"]');
  if (button) button.hidden = false;
}

/* 「第三方集成 › 禅道」暂时下线（2026-11-18）：入口和分组标题都不显示，页面代码保留，恢复时从这里去掉即可 */
var OFFLINE_TABS = ['zentao'];
/* 所有成员都能看的分类：基本信息（非负责人、管理员只读）、Git 账号、仓库；其余需要空间管理权限 */
var PERSONAL_TABS = ['general', 'git', 'repo'];
/* 本机没装 Git：提示条放在设置卡片上方，切到哪个分类都在（UE 2026-11-25） */
function renderGitBanner() {
  var box = $('#cvSettingsGitBanner');
  if (!box) return;
  var missing = !!ldMine().gitMissing;
  box.hidden = !missing;
  box.innerHTML = missing ? ldGitInstallHtml('settings') : '';
}
/* 当前空间有仓库还没初始化本机目录：仓库分类和左上角空间图标显示红点 */
function renderRepoDot() {
  var pending = settingsRepoPending();
  document.querySelectorAll('[data-cv-repo-dot]').forEach(function (dot) { dot.hidden = !pending; });
  $('#cvSpaceSwitch')?.classList.toggle('is-repo-pending', pending);
}
function mount() {
  var basic = $('#cvBasicSettingsHost');
  if (!basic) return;
  var management = canViewWorkspaceSettings();
  if (OFFLINE_TABS.indexOf(currentTab) >= 0) currentTab = 'repo';
  if (!management && PERSONAL_TABS.indexOf(currentTab) < 0) currentTab = 'general';
  var personal = currentTab === 'git';
  basic.hidden = personal;
  if (personal) basic.innerHTML = '';
  $('#ldPersonalSettings').hidden = !personal;
  $('#cvIntegrationSettingsLabel').hidden = true;
  document.querySelectorAll('[data-cv-basic-tab]').forEach(function (button) {
    var tab = button.dataset.cvBasicTab;
    button.hidden = OFFLINE_TABS.indexOf(tab) >= 0 || (!management && PERSONAL_TABS.indexOf(tab) < 0);
    var on = tab === currentTab;
    button.classList.toggle('is-on', on);
    if (on) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  var scope = getSettingsScope();
  mountedScope = scope.project + ':' + scope.ws;
  mountedManagement = management;
  document.dispatchEvent(new CustomEvent('lingee:settings-category', { detail: { tab: currentTab } }));
  if (!personal) renderBasicSettings(basic, currentTab);
  renderGitBanner(); renderRepoDot();
}

export function initCollabWorkspaceSettings() {
  if (!$('#ldWorkspacesPanel')) return;
  initWorkspaceAdmin();
  initBasicSettings($('#cvBasicSettingsHost'));
  $('#ldWorkspacesPanel').addEventListener('click', function (e) {
    var button = e.target.closest('[data-cv-basic-tab]');
    if (!button || button.hidden || button.dataset.cvBasicTab === currentTab) return;
    currentTab = button.dataset.cvBasicTab;
    mount();
  });
  document.addEventListener('lingee:open-personal-settings', function () { currentTab = 'repo'; mount(); });
  /* 开发智能体 / 团队页签空态「去设置添加」：直接打开当前空间的智能体分类 */
  document.addEventListener('lingee:open-space-settings', function (e) { currentTab = (e.detail && e.detail.tab) || 'general'; mount(); });
  syncAdminTab();
  document.addEventListener('lingee:local-dev-changed', function () { if (visible()) { renderGitBanner(); renderRepoDot(); } });
  document.addEventListener('lingee:mgr-projects-changed', function () {
    if (visible() && mountedManagement !== canViewWorkspaceSettings()) mount();
  });
  /* 初始化时人员数据可能还没就绪：页面加载完成、每次进入协作开发时再判断一次 */
  window.addEventListener('load', syncAdminTab);
  var view = $('#view-collab');
  if (view) new MutationObserver(syncAdminTab).observe(view, { attributes: true, attributeFilter: ['class'] });
  /* 每次进入设置默认聚焦「通用」：离开设置时把分类复位；「目录未就绪」等入口在打开前指定分类，不受影响 */
  var localPanel = $('#cv-local'), wasActive = !!localPanel?.classList.contains('active');
  if (localPanel) new MutationObserver(function () {
    var active = localPanel.classList.contains('active');
    if (wasActive && !active) currentTab = 'general';
    wasActive = active;
  }).observe(localPanel, { attributes: true, attributeFilter: ['class'] });
  /* 顶部「‹ 设置」：记住进入设置前的页签，点击返回该页签 */
  var lastTab = 'tasks';
  document.addEventListener('click', function (e) {
    var tab = e.target.closest('#cvTabNav [data-cvview]');
    if (tab && tab.dataset.cvview !== 'local') lastTab = tab.dataset.cvview;
    if (e.target.closest('#cvSettingsBack') && typeof window.cvSwitchView === 'function') window.cvSwitchView(lastTab);
  });
  document.addEventListener('lingee:ld-settings-shown', function (e) {
    if (e.detail && e.detail.tab === 'workspaces') mount();
  });
  // 同一工作区内切换账号时，范围不变也要重新计算编辑权限。
  document.addEventListener('lingee:auth-changed', function () { if (visible()) mount(); });
  /* 设置卡片顶部切换了空间 */
  document.addEventListener('lingee:settings-space-changed', function () { var scope = getSettingsScope(); if (visible() && mountedScope !== scope.project + ':' + scope.ws) mount(); });
}
