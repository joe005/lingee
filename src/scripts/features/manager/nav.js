import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { setUrlState, showView } from '../../core/view.js';
import { setChannel } from '../sidebar.js';
import { mgrProjectById } from './data.js';
import { currentProjectId, openProject, showList } from './projects.js';
/* 管理 · 侧栏菜单与路由：/manager?m=<菜单>&proj=<项目>。
   本次演示只开放「项目」菜单；决策中心、AI组织与「我的项目」下的提问保留入口，点击给出提示。 */

var MENU_LABELS = { 'ceo-home': '决策中心', 'organization-management': 'AI组织', 'ceo-projects': '项目' };
var DEMO_MENU = 'ceo-projects';
var pendingRoute = null;

function setMenuActive(menu) {
  $$('#mgrNav .mgr-nav-item').forEach(function (n) {
    n.classList.toggle('active', n.getAttribute('data-mgr-nav') === menu);
  });
}
function syncUrl() {
  if ($('#view-manager').classList.contains('hidden')) return;
  var proj = currentProjectId();
  setUrlState('/manager?m=' + DEMO_MENU + (proj ? '&proj=' + encodeURIComponent(proj) : ''));
}
/* 打开管理板块：切到「管理」页签、显示管理视图，再进入项目列表或指定项目 */
function openManager(projectId) {
  setChannel('manage');
  showView('manager');
  setMenuActive(DEMO_MENU);
  if (!projectId || !openProject(projectId)) showList();
  syncUrl();
}

/* 侧栏「项目」目录树只保留仍存在的项目，名称随重命名同步（删除项目后同步隐藏） */
function syncSideFolders() {
  $$('#mgrNav .mgr-side-folder').forEach(function (folder) {
    var head = folder.querySelector('[data-mgr-side-project]');
    var p = head ? mgrProjectById(head.getAttribute('data-mgr-side-project')) : null;
    folder.hidden = !!head && !p;
    var nameEl = folder.querySelector('.mgr-side-folder-name');
    if (p && nameEl) nameEl.textContent = p.name;
  });
}

/* route.js 在模块初始化前解析启动路由，先把管理板块的查询参数存下来 */
function setMgrPendingRoute(params) {
  pendingRoute = { m: params.get('m') || DEMO_MENU, proj: params.get('proj') || '' };
}

export function initManagerNav() {
  var nav = $('#mgrNav');
  nav.addEventListener('click', function (e) {
    var t = e.target;
    var item = t.closest('[data-mgr-nav]');
    if (item) {
      var menu = item.getAttribute('data-mgr-nav');
      if (menu === DEMO_MENU) openManager();
      else toast('「' + (MENU_LABELS[menu] || '该页面') + '」不在本次演示范围');
      /* view.js 的侧栏导航会按文字高亮被点的菜单，这里统一回到实际打开的菜单 */
      setMenuActive(DEMO_MENU);
      return;
    }
    var child = t.closest('[data-mgr-side-child]');
    if (child) { openManager(child.getAttribute('data-mgr-side-child')); return; }
    var folderHead = t.closest('.mgr-side-folder-head');
    if (folderHead) {
      var folder = folderHead.closest('.mgr-side-folder');
      if (folder.querySelector('.mgr-side-children')) {
        folderHead.setAttribute('aria-expanded', String(folder.classList.toggle('expanded')));
      } else {
        openManager(folderHead.getAttribute('data-mgr-side-project'));
      }
      return;
    }
    if (t.closest('[data-mgr-side-goto]')) toast('该提问不在本次演示范围');
  });
  nav.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var target = e.target.closest('[data-mgr-nav],[data-mgr-side-child],[data-mgr-side-goto]');
    if (target) { e.preventDefault(); target.click(); }
  });
  document.addEventListener('lingee:mgr-open', function () { openManager(); });
  document.addEventListener('lingee:mgr-projects-changed', function () { syncSideFolders(); syncUrl(); });
  syncSideFolders();
  if (pendingRoute) {
    var route = pendingRoute;
    pendingRoute = null;
    openManager(route.proj);
  }
}

export { openManager, setMgrPendingRoute, syncUrl };
