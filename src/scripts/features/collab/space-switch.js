import { toast } from '../../core/toast.js';
import { readDefaultScope, saveDefaultScope, validDefaultScope } from './default-scope.js';
import { $ } from '../../core/dom.js';
import { WS_MAX_DEPTH, wsFlatTree, wsPath, wsPathNames } from '../../core/workspace-tree.js';
import { tkProjectsForCurrentUser } from '../tasks-v2/data.js';
import { getSpaceScope, setSpaceScope } from '../tasks-v2/page/space-filter.js';
import { canCreateChild, wsAvailable } from '../manager/workspaces.js';
import { ldIsDevProject } from './local-dev.js';
/* 协作开发顶部的空间 / 工作区切换（旧版顶部工作区标题的样式）：标题是当前范围，点开是下拉树——
   各开发空间 → 空间下的各级工作区。选择写入任务页的 project / workspaceId 筛选条件，
   与任务列表是同一份状态；各空间和工作区行内「＋」就地创建下级，设置 › 工作区维护完整信息。 */

var CARET = '<svg class="mgr-ws-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
var NODE_CARET = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
var PLUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
var STAR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg>';
var CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4 10-11"/></svg>';

var popOpen = false;
var query = '';
var collapsed = {};

function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
/* 管理与协作开发两类空间共用工作区能力，保留各自的持久化来源。 */
function canCreate(p, ws, depth) {
  return wsAvailable(p) && depth < WS_MAX_DEPTH && canCreateChild(p, ws);
}
function spaces() { return tkProjectsForCurrentUser().filter(ldIsDevProject); }

function rowsHtml() {
  var scope = getSpaceScope();
  var preferred = readDefaultScope();
  var q = query.trim().toLocaleLowerCase();
  function node(p, ws, depth, children, hasChildren) {
    var id = ws ? ws.id : '';
    var key = p.id + ':' + id;
    var open = !!q || !(Object.prototype.hasOwnProperty.call(collapsed, key) ? collapsed[key] : !ws && !hasChildren);
    var on = scope.project === p.id && scope.ws === id;
    var name = ws ? ws.name : p.name;
    var isDefault = !!preferred && preferred.project === p.id && preferred.ws === id;
    var defaultAction = '<button type="button" class="mgr-ws-icon-btn' + (isDefault ? ' is-default' : '') + '" data-cvss-default="' + esc(p.id) + '" data-cvss-default-ws="' + esc(id) + '" aria-pressed="' + isDefault + '" title="' + (isDefault ? '取消默认' : '设为默认') + '" aria-label="' + (isDefault ? '取消默认：' : '设为默认：') + esc(name) + '">' + STAR + '</button>';
    var path = ws ? p.name + ' / ' + wsPathNames(p, id).join(' / ') : p.name;
    var expandable = hasChildren;
    var toggle = expandable
      ? '<button type="button" class="mgr-ws-pop-toggle' + (open ? ' is-open' : '') + '" data-cvss-toggle="' + esc(key) + '" aria-label="' + (open ? '收起' : '展开') + esc(name) + '" aria-expanded="' + open + '">' + NODE_CARET + '</button>'
      : '<span class="mgr-ws-pop-toggle-gap"></span>';
    var add = canCreate(p, ws, depth)
      ? '<button type="button" class="mgr-ws-icon-btn" data-cvss-create="' + esc(p.id) + '" data-cvss-parent="' + esc(id) + '" title="' + (ws ? '创建下级工作区' : '创建工作区') + '" aria-label="在' + esc(path) + '下创建工作区">' + PLUS + '</button>' : '';
    return '<div role="treeitem" aria-level="' + (depth + 1) + '" aria-selected="' + on + '"' + (expandable ? ' aria-expanded="' + open + '"' : '') + '>' +
      '<div class="mgr-ws-pop-row' + (ws ? '' : ' mgr-ws-pop-row--space') + (on ? ' is-on' : '') + '" style="--ws-depth:' + depth + '">' + toggle +
      '<button type="button" class="mgr-ws-pop-pick" data-cvss-pick="' + esc(p.id) + '" data-cvss-ws="' + esc(id) + '" title="' + esc(path) + '"><span class="mgr-ws-pop-name">' + esc(name) + '</span>' + (isDefault ? '<small class="cv-space-default-label">默认</small>' : '') + (on ? '<b>' + CHECK + '</b>' : '') + '</button>' + defaultAction + add + '</div>' +
      (expandable && open ? '<div role="group">' + children + '</div>' : '') + '</div>';
  }
  var rows = spaces().map(function (p) {
    var tree = wsFlatTree(p);
    var hit = !q || p.name.toLocaleLowerCase().includes(q);
    /* 搜索匹配子项时保留祖先链，避免工作区脱离所属空间。 */
    var shown = new Set();
    tree.forEach(function (r) {
      if (hit || r.ws.name.toLocaleLowerCase().includes(q)) {
        wsPath(p, r.ws.id).forEach(function (w) { shown.add(w.id); });
      }
    });
    if (!hit && !shown.size) return '';
    function children(parentId) {
      return tree.filter(function (r) { return (r.ws.parentId || '') === parentId && shown.has(r.ws.id); }).map(function (r) {
        var body = children(r.ws.id);
        return node(p, r.ws, r.depth, body, !!body);
      }).join('');
    }
    var body = children('');
    return node(p, null, 0, body, !!body);
  }).join('');
  return rows || '<p class="mgr-ws-pop-empty">'+(q ? '没有匹配的空间或工作区' : '暂无可用空间')+'</p>';
}
function render() {
  var host = $('#cvSpaceSwitch');
  if (!host) return;
  var scope = getSpaceScope();
  var p = scope.project ? spaces().find(function (x) { return x.id === scope.project; }) : null;
  var names = p && scope.ws ? wsPathNames(p, scope.ws) : [];
  var path = p ? p.name + (names.length ? ' / ' + names.join(' / ') : '') : '暂无可用空间';
  var label = names.length ? names[names.length - 1] : (p ? p.name : '暂无可用空间');
  host.innerHTML = '<button type="button" class="mgr-ws-switch-btn" id="cvSpaceBtn" aria-haspopup="tree" aria-expanded="' + popOpen + '" aria-label="切换空间或工作区：' + esc(path) + '"><span class="mgr-ws-crumb" title="' + esc(path) + '">' + esc(label) + '</span>' + CARET + '</button>' +
    (popOpen ? '<div class="mgr-ws-pop" role="dialog" aria-label="切换空间或工作区"><label class="mgr-ws-pop-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>' +
      '<input type="search" id="cvSpaceSearch" value="' + esc(query) + '" placeholder="搜索空间或工作区…" aria-label="搜索空间或工作区" autocomplete="off"></label>' +
      '<div class="mgr-ws-pop-list" role="tree" id="cvSpaceList">' + rowsHtml() + '</div>' +
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
  /* 工作区随协作数据延迟恢复，恢复完成前不能把默认项误判为已删除。 */
  if (!$('#view-collab')?.hasAttribute('data-entry-ready')) return;
  var preferred = readDefaultScope();
  if (preferred && validDefaultScope(preferred)) setSpaceScope(preferred.project, preferred.ws);
  else {
    if (preferred) saveDefaultScope(null);
    var current = getSpaceScope();
    setSpaceScope(current.project, current.ws);
  }
}
export function initCollabSpaceSwitch() {
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
    var tg = t.closest('[data-cvss-toggle]');
    if (tg) {
      var id = tg.getAttribute('data-cvss-toggle');
      collapsed[id] = tg.getAttribute('aria-expanded') === 'true';
      var list = $('#cvSpaceList');
      if (list) {
        list.innerHTML = rowsHtml();
        var toggle = Array.from(list.querySelectorAll('[data-cvss-toggle]')).find(function (el) { return el.getAttribute('data-cvss-toggle') === id; });
        if (toggle) toggle.focus();
      }
      return;
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
      var parentId = create.getAttribute('data-cvss-parent');
      collapsed[target + ':'] = false;
      if (parentId) collapsed[target + ':' + parentId] = false;
      setPop(false);
      var btn = $('#cvSpaceBtn');
      if (btn) btn.focus();
      document.dispatchEvent(new CustomEvent('lingee:mgr-ws-create', { detail: { project: target, parentId: parentId } }));
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
  document.addEventListener('lingee:mgr-projects-changed', render);
}
