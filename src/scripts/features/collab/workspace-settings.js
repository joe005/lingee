import { canViewWorkspaceSettings, initBasicSettings, renderBasicSettings } from './basic-settings.js';
import { $ } from '../../core/dom.js';
import { initWorkspaceAdmin } from '../manager/workspace-admin.js';
import { getSpaceScope } from '../tasks-v2/page/space-filter.js';
/* 协作开发 · 设置：通用、仓库、成员、我的空间及 Git 账号。
   管理的空间就是顶部切换器选中的空间，这里不再单独选；没有可用空间时提示先创建或加入空间。
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

function mount() {
  var basic = $('#cvBasicSettingsHost');
  if (!basic) return;
  var management = canViewWorkspaceSettings();
  if (!management && currentTab !== 'git') currentTab = 'repo';
  var personal = currentTab === 'git';
  basic.hidden = personal;
  if (personal) basic.innerHTML = '';
  $('#ldPersonalSettings').hidden = !personal;
  $('#cvWorkspaceSettingsLabel').hidden = !management;
  document.querySelectorAll('[data-cv-basic-tab]').forEach(function (button) {
    var tab = button.dataset.cvBasicTab;
    button.hidden = !management && tab !== 'git' && tab !== 'repo';
    var on = tab === currentTab;
    button.classList.toggle('is-on', on);
    if (on) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  var scope = getSpaceScope();
  mountedScope = scope.project + ':' + scope.ws;
  mountedManagement = management;
  document.dispatchEvent(new CustomEvent('lingee:settings-category', { detail: { tab: currentTab } }));
  if (!personal) renderBasicSettings(basic, currentTab);
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
  syncAdminTab();
  document.addEventListener('lingee:mgr-projects-changed', function () {
    if (visible() && mountedManagement !== canViewWorkspaceSettings()) mount();
  });
  /* 初始化时人员数据可能还没就绪：页面加载完成、每次进入协作开发时再判断一次 */
  window.addEventListener('load', syncAdminTab);
  var view = $('#view-collab');
  if (view) new MutationObserver(syncAdminTab).observe(view, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('lingee:ld-settings-shown', function (e) {
    if (e.detail && e.detail.tab === 'workspaces') mount();
  });
  // 同一工作区内切换账号时，范围不变也要重新计算编辑权限。
  document.addEventListener('lingee:auth-changed', function () { if (visible()) mount(); });
  /* 顶部切换了空间：正在看设置时跟着换 */
  document.addEventListener('lingee:tk-space-changed', function () { var scope = getSpaceScope(); if (visible() && mountedScope !== scope.project + ':' + scope.ws) mount(); });
}
