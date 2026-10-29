import { $, $$ } from '../../core/dom.js';
import { setUrlState, showView } from '../../core/view.js';
import { setChannel } from '../sidebar.js';
import { renderAssistant, renderOrg } from './assistant.js';
import { mgrProjects } from './data.js';
import { currentProjectId, openProject, showList } from './projects.js';
import { mgrEsc } from './utils.js';
/* 管理 · 侧栏菜单与路由（对齐产品）：小灵 / 空间 / AI 组织，地址 /manager?m=<菜单>&proj=<空间>。
   「我的空间 · 默认」下的会话进入小灵；「空间」目录树按空间列表渲染，点空间名进入空间详情。 */

var PANELS = { xiaoling: 'xiaoling', 'ceo-projects': 'projects', 'organization-management': 'org' };
var DEFAULT_MENU = 'ceo-projects';
var currentMenu = DEFAULT_MENU;
var pendingRoute = null;

var FOLDER_ICON = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';

function setMenuActive(menu) {
  $$('#mgrNav .mgr-nav-item').forEach(function (n) {
    n.classList.toggle('active', n.getAttribute('data-mgr-nav') === menu);
  });
}
function syncUrl() {
  if ($('#view-manager').classList.contains('hidden')) return;
  var proj = currentMenu === DEFAULT_MENU ? currentProjectId() : null;
  setUrlState('/manager?m=' + currentMenu + (proj ? '&proj=' + encodeURIComponent(proj) : ''));
  syncSideSpaces();
}
function showPanel(menu) {
  currentMenu = PANELS[menu] ? menu : DEFAULT_MENU;
  var panel = PANELS[currentMenu];
  $$('#view-manager > .mgr-panel').forEach(function (el) {
    el.classList.toggle('hidden', el.getAttribute('data-mgr-panel') !== panel);
  });
  setMenuActive(currentMenu);
}
/* 打开管理板块：切到「管理」页签、显示管理视图，再进入对应菜单（空间菜单可指定空间） */
function openManager(projectId, menu) {
  setChannel('manage');
  showView('manager');
  showPanel(menu || DEFAULT_MENU);
  if (currentMenu === 'xiaoling') renderAssistant();
  else if (currentMenu === 'organization-management') renderOrg();
  else if (!projectId || !openProject(projectId)) showList();
  syncUrl();
}

/* 侧栏「空间」目录树：与空间列表同口径（开发类空间和自己新建的空间），当前空间高亮 */
function syncSideSpaces() {
  var box = $('#mgrSideSpaces');
  if (!box) return;
  var current = currentMenu === DEFAULT_MENU ? currentProjectId() : null;
  var list = mgrProjects().filter(function (p) { return p.containsRd || p.custom; });
  box.innerHTML = list.map(function (p) {
    var on = p.id === current;
    return '<div class="mgr-side-folder' + (on ? ' is-current' : '') + '"><button type="button" class="mgr-side-folder-head" data-mgr-side-project="' + mgrEsc(p.id) + '"' + (on ? ' aria-current="page"' : '') + '>' +
      FOLDER_ICON + '<span class="mgr-side-folder-name">' + mgrEsc(p.name) + '</span></button></div>';
  }).join('') || '<div class="mgr-side-sub">还没有空间</div>';
}

/* route.js 在模块初始化前解析启动路由，先把管理板块的查询参数存下来 */
function setMgrPendingRoute(params) {
  pendingRoute = { m: params.get('m') || DEFAULT_MENU, proj: params.get('proj') || '' };
}

export function initManagerNav() {
  var nav = $('#mgrNav');
  nav.addEventListener('click', function (e) {
    var t = e.target;
    var item = t.closest('[data-mgr-nav]');
    if (item) {
      openManager(null, item.getAttribute('data-mgr-nav'));
      /* view.js 的侧栏导航会按文字高亮被点的菜单，这里统一回到实际打开的菜单 */
      setMenuActive(currentMenu);
      return;
    }
    var folderHead = t.closest('[data-mgr-side-project]');
    if (folderHead) { openManager(folderHead.getAttribute('data-mgr-side-project')); return; }
    var go = t.closest('[data-mgr-side-goto]');
    if (go) openManager(null, go.getAttribute('data-mgr-side-goto'));
  });
  nav.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var target = e.target.closest('[data-mgr-nav],[data-mgr-side-goto]');
    if (target) { e.preventDefault(); target.click(); }
  });
  /* detail.proj 可指定打开的空间（如待办里接受邀请后进入空间） */
  document.addEventListener('lingee:mgr-open', function (e) { openManager(e.detail && e.detail.proj); });
  document.addEventListener('lingee:mgr-projects-changed', function () { syncSideSpaces(); syncUrl(); });
  syncSideSpaces();
  if (pendingRoute) {
    var route = pendingRoute;
    pendingRoute = null;
    openManager(route.proj, route.m);
  }
}

export { openManager, setMgrPendingRoute, syncUrl };
