import { toast } from '../../core/toast.js';
import { readDefaultScope, saveDefaultScope, validDefaultScope } from './default-scope.js';
import { $ } from '../../core/dom.js';
import { wsScopeName } from '../../core/workspace-tree.js';
import { tkProjectsForCurrentUser, tkScopeProjects, tkVisibleWorkspaces } from '../tasks-v2/data.js';
import { getSpaceScope, setSpaceScope } from '../tasks-v2/page/space-filter.js';
import { canCreateWs, wsScopePath, wsSyncManageSpaces } from '../manager/workspaces.js';
import { WS_HOST_ID, wsHost } from './data.js';
import { ldIsDevProject, ldSetNavScope } from './local-dev.js';
/* 协作开发顶部的空间切换（2026-11-06：只有空间，没有工作区的概念）：标题是当前空间，点开是一级平铺的空间列表——
   我加入的空间、旧空间下的子工作区（各按一个空间展示）和在 Build 新建的空间。选择写入任务页的 project / workspaceId 筛选条件，
   与任务列表是同一份状态；底部「＋ 新建空间」所有 Build 用户可用，同时在 Manage 创建对应空间并同步成员。 */

var CARET = '<svg class="mgr-ws-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
var NODE_CARET = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
var PLUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
var STAR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg>';
var CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4 10-11"/></svg>';

var popOpen = false;
var manageSynced = false;
var query = '';

function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function spaces() { return tkProjectsForCurrentUser().filter(ldIsDevProject); }

function rowsHtml() {
  var scope = getSpaceScope();
  var preferred = readDefaultScope();
  var q = query.trim().toLocaleLowerCase();
  /* p 是任务归属的容器（空间或 Build 新建空间的容器），id 为空表示空间本身 */
  function scopeNode(p, id, name) {
    var on = scope.project === p.id && scope.ws === id;
    var isDefault = !!preferred && preferred.project === p.id && preferred.ws === id;
    var defaultAction = '<button type="button" class="mgr-ws-icon-btn' + (isDefault ? ' is-default' : '') + '" data-cvss-default="' + esc(p.id) + '" data-cvss-default-ws="' + esc(id) + '" aria-pressed="' + isDefault + '" title="' + (isDefault ? '取消默认' : '设为默认') + '" aria-label="' + (isDefault ? '取消默认：' : '设为默认：') + esc(name) + '">' + STAR + '</button>';
    return '<div role="treeitem" aria-level="1" aria-selected="' + on + '"><div class="mgr-ws-pop-row' + (on ? ' is-on' : '') + '" style="--ws-depth:0"><span class="mgr-ws-pop-toggle-gap"></span>' +
      '<button type="button" class="mgr-ws-pop-pick" data-cvss-pick="' + esc(p.id) + '" data-cvss-ws="' + esc(id) + '" title="' + esc(name) + '"><span class="mgr-ws-pop-name">' + esc(name) + '</span>' + (isDefault ? '<small class="cv-space-default-label">默认</small>' : '') + (on ? '<b>' + CHECK + '</b>' : '') + '</button>' + defaultAction + '</div></div>';
  }
  var host = wsHost();
  /* [容器, 子工作区 id, 名称]：每个旧空间和它下面的子工作区、Build 新建的空间都按一个空间平铺 */
  var items = [];
  spaces().forEach(function (p) {
    items.push([p, '', p.name]);
    tkVisibleWorkspaces(p).forEach(function (r) { items.push([p, r.ws.id, r.ws.name]); });
  });
  tkVisibleWorkspaces(host).forEach(function (r) { items.push([host, r.ws.id, r.ws.name]); });
  var rows = items.filter(function (it) { return !q || it[2].toLocaleLowerCase().includes(q); })
    .map(function (it) { return scopeNode(it[0], it[1], it[2]); }).join('');
  return rows || '<p class="mgr-ws-pop-empty">' + (q ? '没有匹配的空间' : '暂无可用空间') + '</p>';
}
function footHtml() {
  return canCreateWs(wsHost()) ? '<div class="mgr-ws-pop-foot"><button type="button" class="mgr-ws-pop-create" data-cvss-create="' + WS_HOST_ID + '">' + PLUS + '<span>新建空间</span></button></div>' : '';
}
function render() {
  var host = $('#cvSpaceSwitch');
  if (!host) return;
  var scope = getSpaceScope();
  var p = scope.project ? tkScopeProjects().filter(ldIsDevProject).find(function (x) { return x.id === scope.project; }) : null;
  var scopeName = p ? wsScopeName(p, scope.ws) : '';
  var curWs = p && scope.ws ? (p.workspaces || []).find(function (w) { return w.id === scope.ws; }) : null;
  var path = p ? wsScopePath(p, curWs) : '暂无可用空间';
  var label = p ? scopeName : '暂无可用空间';
  host.innerHTML = '<button type="button" class="mgr-ws-switch-btn" id="cvSpaceBtn" aria-haspopup="tree" aria-expanded="' + popOpen + '" aria-label="切换空间：' + esc(path) + '"><span class="mgr-ws-crumb" title="' + esc(path) + '">' + esc(label) + '</span>' + CARET + '</button>' +
    (popOpen ? '<div class="mgr-ws-pop" role="dialog" aria-label="切换空间"><label class="mgr-ws-pop-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>' +
      '<input type="search" id="cvSpaceSearch" value="' + esc(query) + '" placeholder="搜索空间…" aria-label="搜索空间" autocomplete="off"></label>' +
      '<div class="mgr-ws-pop-list" role="tree" id="cvSpaceList">' + rowsHtml() + '</div>' + footHtml() +
      '</div>' : '');
  if (popOpen && query) { var input = $('#cvSpaceSearch'); if (input) input.focus(); }
}
function setPop(on) {
  popOpen = on;
  if (!on) query = '';
  render();
  if (on) { var input = $('#cvSpaceSearch'); if (input) input.focus(); }
}

function restoreDefaultScope() {
  /* 空间随协作数据延迟恢复，恢复完成前不能把默认项误判为已删除。 */
  if (!$('#view-collab')?.hasAttribute('data-entry-ready')) return;
  /* 之前在 Build 建的空间补齐 Manage 侧的同步记录（每次加载一次，已有的只更新字段） */
  if (!manageSynced) manageSynced = wsSyncManageSpaces() || true;
  var preferred = readDefaultScope();
  if (preferred && validDefaultScope(preferred)) setSpaceScope(preferred.project, preferred.ws);
  else {
    if (preferred) saveDefaultScope(null);
    var current = getSpaceScope();
    setSpaceScope(current.project, current.ws);
  }
}
export function initCollabSpaceSwitch() {
  /* 顶部「N 个目录未就绪」只统计当前空间的仓库 */
  ldSetNavScope(getSpaceScope);
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
      toast(cancel ? '已取消默认' : '已设为默认，下次进入协作开发时自动选中', 'success'); return;
    }
    var pick = t.closest('[data-cvss-pick]');
    if (pick) {
      popOpen = false;
      query = '';
      setSpaceScope(pick.getAttribute('data-cvss-pick'), pick.getAttribute('data-cvss-ws') || '');
      render();
      return;
    }
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
  /* 初始化时任务筛选尚未恢复，等页面加载完成后再应用默认范围。 */
  window.addEventListener('load', restoreDefaultScope, { once: true });
  var view = $('#view-collab');
  if (view) {
    var wasVisible = !view.classList.contains('hidden');
    var wasReady = view.hasAttribute('data-entry-ready');
    new MutationObserver(function () {
      var visible = !view.classList.contains('hidden');
      var ready = view.hasAttribute('data-entry-ready');
      if (ready && (!wasReady || visible && !wasVisible)) restoreDefaultScope();
      wasVisible = visible;
      wasReady = ready;
    }).observe(view, { attributes: true, attributeFilter: ['class','data-entry-ready'] });
  }
  document.addEventListener('lingee:auth-changed', function () { setSpaceScope('', ''); restoreDefaultScope(); render(); });
  document.addEventListener('lingee:tk-space-changed', render);
  document.addEventListener('lingee:mgr-projects-changed', function (e) {
    /* 新建空间后直接切换到它 */
    var d = e.detail || {};
    if (d.workspaces === WS_HOST_ID && d.created) { setSpaceScope(WS_HOST_ID, d.created); return; }
    render();
  });
}
