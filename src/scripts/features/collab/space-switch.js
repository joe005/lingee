import { toast } from '../../core/toast.js';
import { readDefaultScope, saveDefaultScope, validDefaultScope } from './default-scope.js';
import { $ } from '../../core/dom.js';
import { wsScopeName } from '../../core/workspace-tree.js';
import { tkProjectsForCurrentUser, tkVisibleWorkspaces } from '../tasks-v2/data.js';
import { getSpaceScope, isAllSpaces, setAllSpaces } from '../tasks-v2/page/space-filter.js';
import { canCreateWs, wsOwnerId, wsScopePath, wsSyncManageSpaces } from '../manager/workspaces.js';
import { mgrCurrentPersonId, mgrPersonName } from '../manager/data.js';
import { WS_HOST_ID, wsHost } from './data.js';
import { ldIsDevProject, ldSetNavScope } from './local-dev.js';
/* 协作开发 · 设置页的空间切换（2026-11-18）：各页签各管各的空间筛选，不再有全局的顶部切换器。
   任务页签用工具栏里的空间筛选（tasks-v2/page/space-filter.js），开发智能体 / 团队页签各有自己的筛选（space-assets.js），
   设置页在卡片顶部用这个切换器决定正在设置哪个空间：只有具体空间，默认取星标的默认空间，选择只影响设置。
   列表平铺我加入的空间、旧空间下的子工作区（各按一个空间展示）和在 Build 新建的空间；
   底部「＋ 新建空间」所有 Build 用户可用，同时在 Manage 创建对应空间并同步成员。 */

var CARET = '<svg class="mgr-ws-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
var PLUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
var STAR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg>';
var CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4 10-11"/></svg>';

var popOpen = false;
var manageSynced = false;
var tasksDefaulted = false;
var query = '';
var settingsScope = { project: '', ws: '' };

function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function spaces() { return tkProjectsForCurrentUser().filter(ldIsDevProject); }
/* 我能看到的开发空间，平铺为 [容器, 子工作区 id, 名称]；各页签的空间筛选共用这份列表 */
export function visibleSpaceItems() {
  var items = [];
  spaces().forEach(function (p) {
    items.push([p, '', p.name]);
    tkVisibleWorkspaces(p).forEach(function (r) { items.push([p, r.ws.id, r.ws.name]); });
  });
  tkVisibleWorkspaces(wsHost()).forEach(function (r) { items.push([wsHost(), r.ws.id, r.ws.name]); });
  return items;
}
/* 空间图标：名称首字放在彩色方块上，颜色按空间 ID 固定，与项目文件夹图标同一组色 */
var ICON_COLORS = ['blue', 'orange', 'green', 'purple', 'teal', 'rose'];
function spaceIcon(p, wsId, name, size) {
  var key = p.id + ':' + wsId, h = 0;
  for (var i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return '<span class="cv-space-icon cv-space-icon--' + ICON_COLORS[h % ICON_COLORS.length] + (size ? ' cv-space-icon--' + size : '') + '" aria-hidden="true">' + esc(Array.from(String(name || '空').trim())[0] || '空') + '</span>';
}
/* 我创建的：空间（或 Build 新建的空间）的创建人或负责人是我；其余为我加入的 */
function relationLabel(p, wsId) {
  var me = mgrCurrentPersonId();
  if (!me) return '';
  var ws = wsId ? (p.workspaces || []).find(function (w) { return w.id === wsId; }) : null;
  var mine = ws ? (ws.createdBy === me || wsOwnerId(p, ws) === me) : (p.createdBy === me || !!p.owner && p.owner === mgrPersonName(me));
  return mine ? '我创建的' : '我加入的';
}
function findItem(scope) { return scope && visibleSpaceItems().find(function (it) { return it[0].id === scope.project && it[1] === (scope.ws || ''); }); }
/* 设置页当前空间：选过的仍可访问就用它，否则用默认空间，再否则第一个可访问的空间 */
export function getSettingsScope() {
  var item = findItem(settingsScope);
  if (!item) {
    var preferred = readDefaultScope();
    item = (preferred && validDefaultScope(preferred) && findItem(preferred)) || visibleSpaceItems()[0];
  }
  return item ? { project: item[0].id, ws: item[1] } : { project: '', ws: '' };
}
export function setSettingsScope(project, ws) {
  settingsScope = { project: project || '', ws: ws || '' };
  popOpen = false;
  query = '';
  render();
  document.dispatchEvent(new Event('lingee:settings-space-changed'));
}

function rowsHtml() {
  var scope = getSettingsScope();
  var preferred = readDefaultScope();
  var q = query.trim().toLocaleLowerCase();
  function scopeNode(p, id, name) {
    var on = scope.project === p.id && scope.ws === id;
    var isDefault = !!preferred && preferred.project === p.id && preferred.ws === id;
    var defaultAction = '<button type="button" class="mgr-ws-icon-btn' + (isDefault ? ' is-default' : '') + '" data-cvss-default="' + esc(p.id) + '" data-cvss-default-ws="' + esc(id) + '" aria-pressed="' + isDefault + '" title="' + (isDefault ? '取消默认' : '设为默认') + '" aria-label="' + (isDefault ? '取消默认：' : '设为默认：') + esc(name) + '">' + STAR + '</button>';
    return '<div role="treeitem" aria-level="1" aria-selected="' + on + '"><div class="mgr-ws-pop-row' + (on ? ' is-on' : '') + '" style="--ws-depth:0"><span class="mgr-ws-pop-toggle-gap"></span>' +
      '<button type="button" class="mgr-ws-pop-pick" data-cvss-pick="' + esc(p.id) + '" data-cvss-ws="' + esc(id) + '" title="' + esc(name) + '">' + spaceIcon(p, id, name, 'sm') + '<span class="mgr-ws-pop-name">' + esc(name) + '</span>' + (isDefault ? '<small class="cv-space-default-label">默认</small>' : '') + (on ? '<b>' + CHECK + '</b>' : '') + '</button>' + defaultAction + '</div></div>';
  }
  var rows = visibleSpaceItems().filter(function (it) { return !q || it[2].toLocaleLowerCase().includes(q); })
    .map(function (it) { return scopeNode(it[0], it[1], it[2]); }).join('');
  return rows || '<p class="mgr-ws-pop-empty">' + (q ? '没有匹配的空间' : '暂无可用空间') + '</p>';
}
function footHtml() {
  return canCreateWs(wsHost()) ? '<div class="mgr-ws-pop-foot"><button type="button" class="mgr-ws-pop-create" data-cvss-create="' + WS_HOST_ID + '">' + PLUS + '<span>新建空间</span></button></div>' : '';
}
function render() {
  var host = $('#cvSpaceSwitch');
  if (!host) return;
  var item = findItem(getSettingsScope());
  var p = item ? item[0] : null, wsId = item ? item[1] : '';
  var curWs = p && wsId ? (p.workspaces || []).find(function (w) { return w.id === wsId; }) : null;
  var path = p ? wsScopePath(p, curWs) : '暂无可用空间';
  var label = p ? wsScopeName(p, wsId) : '暂无可用空间';
  var relation = p ? relationLabel(p, wsId) : '';
  host.innerHTML = '<button type="button" class="mgr-ws-switch-btn cv-space-switch-card" id="cvSpaceBtn" aria-haspopup="tree" aria-expanded="' + popOpen + '" aria-label="切换要设置的空间：' + esc(path) + (relation ? '，' + relation : '') + '">' +
    (p ? spaceIcon(p, wsId, label) : '') + '<span class="cv-space-switch-text"><span class="cv-space-switch-name"><span class="mgr-ws-crumb" title="' + esc(path) + '">' + esc(label) + '</span>' + CARET + '</span>' + (relation ? '<small>' + relation + '</small>' : '') + '</span></button>' +
    (popOpen ? '<div class="mgr-ws-pop" role="dialog" aria-label="切换空间"><label class="mgr-ws-pop-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>' +
      '<input type="search" id="cvSpaceSearch" value="' + esc(query) + '" placeholder="搜索空间…" aria-label="搜索空间" autocomplete="off"></label>' +
      '<div class="mgr-ws-pop-list" role="tree" id="cvSpaceList">' + rowsHtml() + '</div>' + footHtml() +
      '</div>' : '');
  if (popOpen && query) { var input = $('#cvSpaceSearch'); if (input) input.focus(); }
}
function syncNewSpaceItem() {
  var item = $('#tkNewSpace');
  if (item) item.hidden = !$('#view-collab')?.contains(item) || !canCreateWs(wsHost());
}
function setPop(on) {
  popOpen = on;
  if (!on) query = '';
  render();
  if (on) { var input = $('#cvSpaceSearch'); if (input) input.focus(); }
}

function restoreDefaults() {
  /* 空间随协作数据延迟恢复，恢复完成前不能把默认项误判为已删除。 */
  if (!$('#view-collab')?.hasAttribute('data-entry-ready')) return;
  /* 之前在 Build 建的空间补齐 Manage 侧的同步记录（每次加载一次，已有的只更新字段） */
  if (!manageSynced) manageSynced = wsSyncManageSpaces() || true;
  var preferred = readDefaultScope();
  if (preferred && !validDefaultScope(preferred)) saveDefaultScope(null);
  /* 任务页默认显示全部空间：每次加载或换账号后应用一次，之后保留用户在任务页的选择 */
  if (!tasksDefaulted && visibleSpaceItems().length) { tasksDefaulted = true; setAllSpaces(); }
  render();
}
export function initCollabSpaceSwitch() {
  /* 顶部「N 个目录未就绪」跟任务页的空间筛选：选具体空间时只算该空间，全部空间时算我能看到的所有空间 */
  ldSetNavScope(function () { return isAllSpaces() ? null : getSpaceScope(); });
  var host = $('#cvSpaceSwitch');
  if (!host) return;
  render();
  host.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('#cvSpaceBtn')) { setPop(!popOpen); return; }
    var defaultButton = t.closest('[data-cvss-default]');
    if (defaultButton) {
      var targetScope = { project: defaultButton.dataset.cvssDefault, ws: defaultButton.dataset.cvssDefaultWs || '' };
      var previous = readDefaultScope();
      var cancel = previous && previous.project === targetScope.project && previous.ws === targetScope.ws;
      if (!saveDefaultScope(cancel ? null : targetScope)) { toast('默认设置保存失败，请重试', 'warning'); return; }
      render();
      var replacement = Array.from(host.querySelectorAll('[data-cvss-default]')).find(function (button) { return button.dataset.cvssDefault === targetScope.project && button.dataset.cvssDefaultWs === targetScope.ws; });
      if (replacement) replacement.focus();
      toast(cancel ? '已取消默认' : '已设为默认，进入设置和新建任务时默认使用该空间', 'success'); return;
    }
    var pick = t.closest('[data-cvss-pick]');
    if (pick) { setSettingsScope(pick.getAttribute('data-cvss-pick'), pick.getAttribute('data-cvss-ws') || ''); return; }
    var create = t.closest('[data-cvss-create]');
    if (create) {
      var target = create.getAttribute('data-cvss-create');
      setPop(false);
      var btn = $('#cvSpaceBtn');
      if (btn) btn.focus();
      document.dispatchEvent(new CustomEvent('lingee:mgr-ws-create', { detail: { project: target } }));
    }
  });
  host.addEventListener('input', function (e) {
    if (e.target.id !== 'cvSpaceSearch') return;
    query = e.target.value;
    var list = $('#cvSpaceList');
    if (list) list.innerHTML = rowsHtml();
  });
  document.addEventListener('click', function (e) {
    /* 点击处理中弹层可能已重绘，被点元素脱离文档，按事件路径判断 */
    if (popOpen && e.composedPath().indexOf(host) < 0) setPop(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && popOpen) { e.stopPropagation(); setPop(false); var btn = $('#cvSpaceBtn'); if (btn) btn.focus(); }
  }, true);
  window.addEventListener('load', restoreDefaults, { once: true });
  var view = $('#view-collab');
  if (view) {
    var wasReady = view.hasAttribute('data-entry-ready');
    new MutationObserver(function () {
      var ready = view.hasAttribute('data-entry-ready');
      if (ready && !wasReady) restoreDefaults();
      wasReady = ready;
    }).observe(view, { attributes: true, attributeFilter: ['data-entry-ready'] });
  }
  document.addEventListener('lingee:auth-changed', function () { tasksDefaulted = false; settingsScope = { project: '', ws: '' }; restoreDefaults(); syncNewSpaceItem(); document.dispatchEvent(new Event('lingee:settings-space-changed')); });
  /* 任务页「新建 ▾」里的「新建空间」，与切换器底部入口打开同一个弹窗 */
  document.addEventListener('click', function (e) { if (e.target.closest('#tkToolbarNewArrow')) syncNewSpaceItem(); }, true);
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#tkNewSpace')) return;
    $('#tkToolbarNewMenu')?.classList.add('hidden');
    $('#tkToolbarNewArrow')?.setAttribute('aria-expanded', 'false');
    document.dispatchEvent(new CustomEvent('lingee:mgr-ws-create', { detail: { project: WS_HOST_ID } }));
  });
  syncNewSpaceItem();
  document.addEventListener('lingee:mgr-projects-changed', function (e) {
    /* 新建空间后设置页切到它，方便接着配置仓库、成员和智能体 */
    var d = e.detail || {};
    if (d.workspaces === WS_HOST_ID && d.created) { setSettingsScope(WS_HOST_ID, d.created); return; }
    render();
  });
}
