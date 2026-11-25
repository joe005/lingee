import '../../styles/parts/app-detail.css';
import { $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { requestDeleteConfirmation } from '../core/delete-confirm.js';
/* 应用开发：应用详情弹窗与卡片更多菜单（2026-11-25 与客户端对齐）
   - 点击应用卡片弹出「应用详情」：名称、类型标签、说明、「新增任务」，文件统计（文件总数、代码文件、配置/资源）和文件树
   - 卡片悬停显示「···」，菜单为编辑、删除；编辑改名称和说明，删除需确认；只在当前页面生效
   文件数据为演示数据，按应用名稳定生成，不读取本机工作区。 */

var ICON = {
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m14 6 4 4"/>',
  trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>'
};
function svg(name, size) {
  return '<svg class="ic" width="' + (size || 16) + '" height="' + (size || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[name] + '</svg>';
}
function esc(text) { return String(text || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function hash(text) { var h = 0; for (var i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0; return h; }
function slug(name) {
  var ascii = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return ascii || 'app' + (hash(name) % 1000);
}

/* 演示文件树：前后端分目录 + 文档目录 + 根目录配置，数量按应用名稳定生成 */
function appFiles(name) {
  var h = hash(name), base = slug(name);
  var code = 18 + h % 14, config = 9 + (h >> 4) % 10;
  return {
    total: code + config, code: code, config: config,
    tree: [
      { name: 'client', dir: true, children: ['src/App.tsx', 'src/pages/List.tsx', 'src/pages/Detail.tsx', 'src/api.ts', 'vite.config.ts'] },
      { name: 'docs', dir: true, children: ['requirements.md', 'design.md', 'api.md'] },
      { name: 'server', dir: true, children: ['src/index.ts', 'src/routes.ts', 'src/db.ts', 'src/seed.ts'] },
      { name: 'package-lock.json' }, { name: 'package.json' }, { name: base + '.db' }, { name: base + '.db-shm' }, { name: 'README.md' }
    ]
  };
}
function fileBadge(name) {
  var ext = (name.split('.').pop() || '').toLowerCase();
  return ext === 'json' ? '{}' : /^db/.test(ext) ? 'DB' : ext === 'md' ? 'MD' : ext === 'ts' || ext === 'tsx' ? 'TS' : '·';
}
function treeHtml(tree) {
  return tree.map(function (node) {
    if (!node.dir) return '<li class="app-detail-file"><span class="app-detail-file-badge">' + fileBadge(node.name) + '</span><span>' + esc(node.name) + '</span></li>';
    return '<li class="app-detail-dir"><button type="button" class="app-detail-dir-toggle" aria-expanded="false">' + svg('chevron', 14) + svg('folder', 16) + '<span>' + esc(node.name) + '</span></button>'
      + '<ul hidden>' + node.children.map(function (child) { return '<li class="app-detail-file"><span class="app-detail-file-badge">' + fileBadge(child) + '</span><span>' + esc(child) + '</span></li>'; }).join('') + '</ul></li>';
  }).join('');
}

function cardInfo(card) {
  return {
    name: card.querySelector('.card-title')?.textContent.trim() || '',
    desc: card.querySelector('.card-desc')?.textContent.trim() || '',
    type: card.dataset.appType || '通用',
    icon: card.querySelector('.card-icon')?.innerHTML || ''
  };
}

var overlay = null;
function closeDetail() {
  if (!overlay) return;
  overlay.remove();
  overlay = null;
  document.removeEventListener('keydown', onKeyDown, true);
}
function onKeyDown(event) { if (event.key === 'Escape') { event.preventDefault(); closeDetail(); } }

export function openAppDetail(card) {
  closeDetail();
  var info = cardInfo(card), files = appFiles(info.name);
  overlay = document.createElement('div');
  overlay.className = 'app-detail-overlay';
  overlay.innerHTML = '<section class="app-detail" role="dialog" aria-modal="true" aria-labelledby="appDetailTitle">'
    + '<header class="app-detail-head"><h3 id="appDetailTitle">应用详情</h3><button type="button" class="app-detail-close" data-app-detail-close aria-label="关闭">' + svg('close', 16) + '</button></header>'
    + '<div class="app-detail-body">'
    + '<div class="app-detail-summary"><span class="app-detail-icon">' + info.icon + '</span>'
    + '<div class="app-detail-name"><div><strong>' + esc(info.name) + '</strong><span class="app-detail-type">' + esc(info.type) + '</span></div><p>' + esc(info.desc) + '</p></div>'
    + '<button type="button" class="app-detail-task" data-app-detail-task>新增任务</button></div>'
    + '<div class="app-detail-stats">'
    + '<div><strong>' + files.total + '</strong><span>文件总数</span></div>'
    + '<div class="is-code"><strong>' + files.code + '</strong><span>代码文件</span></div>'
    + '<div class="is-config"><strong>' + files.config + '</strong><span>配置/资源</span></div></div>'
    + '<ul class="app-detail-tree">' + treeHtml(files.tree) + '</ul>'
    + '</div></section>';
  overlay.addEventListener('click', function (event) {
    if (event.target === overlay || event.target.closest('[data-app-detail-close]')) { closeDetail(); return; }
    var toggle = event.target.closest('.app-detail-dir-toggle');
    if (toggle) {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.nextElementSibling.hidden = !open;
      return;
    }
    if (event.target.closest('[data-app-detail-task]')) {
      /* 新增任务：回到新会话，按应用类型切到对应模式，由用户继续描述任务 */
      closeDetail();
      var mode = info.type === '苍穹' ? '苍穹应用' : '通用应用';
      document.dispatchEvent(new CustomEvent('lingee:newtask-open', { detail: { mode: mode } }));
      toast('为「' + info.name + '」新增任务，请在输入框描述需求', 'success');
    }
  });
  document.addEventListener('keydown', onKeyDown, true);
  document.body.appendChild(overlay);
  overlay.querySelector('[data-app-detail-close]').focus();
}

/* ---------- 卡片更多菜单：编辑、删除 ---------- */
var menu = null;
function closeMenu() { if (menu) { menu.remove(); menu = null; } }
function openMenu(button) {
  closeMenu();
  var card = button.closest('.app-card');
  menu = document.createElement('div');
  menu.className = 'app-card-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = '<button type="button" role="menuitem" data-app-act="edit">' + svg('edit', 14) + '编辑</button>'
    + '<button type="button" role="menuitem" data-app-act="delete">' + svg('trash', 14) + '删除</button>';
  document.body.appendChild(menu);
  var rect = button.getBoundingClientRect();
  menu.style.top = (rect.bottom + 4) + 'px';
  menu.style.left = Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8) + 'px';
  menu.addEventListener('click', function (event) {
    var item = event.target.closest('[data-app-act]');
    if (!item) return;
    closeMenu();
    if (item.dataset.appAct === 'edit') editCard(card);
    else deleteCard(card);
  });
}
function editCard(card) {
  var info = cardInfo(card);
  var box = document.createElement('div');
  box.className = 'app-detail-overlay';
  box.innerHTML = '<form class="app-detail app-edit" role="dialog" aria-modal="true" aria-labelledby="appEditTitle">'
    + '<header class="app-detail-head"><h3 id="appEditTitle">编辑应用</h3><button type="button" class="app-detail-close" data-app-edit-cancel aria-label="关闭">' + svg('close', 16) + '</button></header>'
    + '<div class="app-detail-body"><label class="app-edit-field"><span>名称</span><input name="name" maxlength="40" required></label>'
    + '<label class="app-edit-field"><span>说明</span><textarea name="desc" rows="3" maxlength="200"></textarea></label>'
    + '<p class="app-edit-error" hidden>请填写名称</p></div>'
    + '<footer class="app-edit-actions"><button type="button" data-app-edit-cancel>取消</button><button type="submit">保存</button></footer></form>';
  var form = box.querySelector('form');
  form.elements.name.value = info.name;
  form.elements.desc.value = info.desc;
  function close() { box.remove(); document.removeEventListener('keydown', onEsc, true); }
  function onEsc(event) { if (event.key === 'Escape') { event.preventDefault(); close(); } }
  box.addEventListener('click', function (event) { if (event.target === box || event.target.closest('[data-app-edit-cancel]')) close(); });
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var name = form.elements.name.value.trim();
    if (!name) { form.querySelector('.app-edit-error').hidden = false; form.elements.name.focus(); return; }
    card.querySelector('.card-title').textContent = name;
    var desc = card.querySelector('.card-desc');
    if (desc) desc.textContent = form.elements.desc.value.trim();
    close();
    toast('已保存', 'success');
  });
  document.addEventListener('keydown', onEsc, true);
  document.body.appendChild(box);
  form.elements.name.focus();
}
function deleteCard(card) {
  var name = cardInfo(card).name;
  requestDeleteConfirmation('删除后「' + name + '」将从应用列表移除。').then(function (ok) {
    if (!ok) return;
    card.remove();
    toast('删除成功', 'success');
  });
}

export function initAppCardMenus() {
  $$('#view-apps .apps-grid .app-card').forEach(function (card) {
    if (card.querySelector('.app-card-more')) return;
    var more = document.createElement('button');
    more.type = 'button';
    more.className = 'app-card-more';
    more.setAttribute('aria-label', '更多操作');
    more.setAttribute('aria-haspopup', 'menu');
    more.textContent = '···';
    card.appendChild(more);
  });
  document.addEventListener('click', function (event) {
    var more = event.target.closest('#view-apps .app-card-more');
    if (more) { event.stopPropagation(); event.preventDefault(); openMenu(more); return; }
    if (menu && !event.target.closest('.app-card-menu')) closeMenu();
  }, true);
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', closeMenu);
}
