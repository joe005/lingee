import { toast } from '../../core/toast.js';
import { readDefaultScope, saveDefaultScope, validDefaultScope } from './default-scope.js';
import { $ } from '../../core/dom.js';
import { wsScopeName } from '../../core/workspace-tree.js';
import { tkProjectsForCurrentUser, tkScopeProjects, tkVisibleWorkspaces } from '../tasks-v2/data.js';
import { getSpaceScope, setSpaceScope } from '../tasks-v2/page/space-filter.js';
import { canCreateWs, wsMappableSpaces, wsScopePath } from '../manager/workspaces.js';
import { WS_HOST_ID, wsHost } from './data.js';
import { ldIsDevProject } from './local-dev.js';
/* 协作开发顶部的空间 / 工作区切换（旧版顶部工作区标题的样式）：标题是当前范围，点开是列表——
   已关联的按开发空间分组（空间行只是分组，不能选中），其下为平级的与空间同名的工作区（空间根）、空间下的工作区和关联到该空间的独立工作区；
   未关联的独立工作区在分组之后平铺。选择写入任务页的 project / workspaceId 筛选条件，与任务列表是同一份状态；
   底部「＋ 创建工作区」所有 Build 用户可用，创建独立工作区，设置 › 通用维护关联。 */

var CARET = '<svg class="mgr-ws-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
var NODE_CARET = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
var PLUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
var STAR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg>';
var CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4 10-11"/></svg>';

var popOpen = false;
/* 列表视图：默认「全部工作区」平铺，不显示管理空间；「管理视图」按 Manage 空间分组。按本机记住，读写失败时回到平铺 */
var VIEW_KEY = 'lingee-collab-space-switch-view-v1';
var viewMode = (function () { try { return localStorage.getItem(VIEW_KEY) === 'manage' ? 'manage' : 'flat'; } catch (_) { return 'flat'; } })();
function setViewMode(mode) {
  viewMode = mode === 'manage' ? 'manage' : 'flat';
  try { localStorage.setItem(VIEW_KEY, viewMode); } catch (_) { /* 本地存储不可用时只在本次生效 */ }
}
var query = '';
var collapsed = {};

function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
/* 类型标签：分组行都是空间（Manage 开发空间与协作开发建的空间同属空间），可选行都是 Build 工作区（含与空间同名的工作区） */
var SPACE_KIND = '<small class="cv-space-kind">Manage空间</small>';
var WS_KIND = '<small class="cv-space-kind">Build工作区</small>';
function spaces() { return tkProjectsForCurrentUser().filter(ldIsDevProject); }
/* 独立工作区按关联的开发空间分组；关联的空间已不存在或已归档时按未关联平铺 */
function hostGroups() {
  var valid = {}, byspace = {}, flat = [];
  wsMappableSpaces().forEach(function (p) { valid[p.id] = p; });
  tkVisibleWorkspaces(wsHost()).forEach(function (row) {
    var sid = row.ws.spaceId;
    if (sid && valid[sid]) (byspace[sid] = byspace[sid] || []).push(row.ws); else flat.push(row.ws);
  });
  return { valid: valid, byspace: byspace, flat: flat };
}

function rowsHtml() {
  var scope = getSpaceScope();
  var preferred = readDefaultScope();
  var q = query.trim().toLocaleLowerCase();
  /* 空间行只是分组标题：点名称展开 / 收起，不能选中；可选的是下面平级的「默认工作区」和各工作区 */
  function spaceNode(p, children) {
    var key = p.id + ':';
    var open = !!q || !(Object.prototype.hasOwnProperty.call(collapsed, key) && collapsed[key]);
    return '<div role="treeitem" aria-level="1" aria-expanded="' + open + '">' +
      '<div class="mgr-ws-pop-row mgr-ws-pop-row--space" style="--ws-depth:0">' +
      '<button type="button" class="mgr-ws-pop-toggle' + (open ? ' is-open' : '') + '" data-cvss-toggle="' + esc(key) + '" aria-label="' + (open ? '收起' : '展开') + esc(p.name) + '" aria-expanded="' + open + '">' + NODE_CARET + '</button>' +
      '<button type="button" class="mgr-ws-pop-pick" data-cvss-toggle="' + esc(key) + '" aria-expanded="' + open + '" title="' + esc(p.name) + '"><span class="mgr-ws-pop-name">' + esc(p.name) + '</span>' + SPACE_KIND + '</button></div>' +
      (open ? '<div role="group">' + children + '</div>' : '') + '</div>';
  }
  /* p 是任务归属的容器（空间或独立工作区容器），group 是展示用的开发空间名；平铺行 depth 为 0 */
  function scopeNode(p, id, name, group, depth, kind) {
    var on = scope.project === p.id && scope.ws === id;
    var isDefault = !!preferred && preferred.project === p.id && preferred.ws === id;
    var path = group ? group + ' / ' + name : name;
    depth = depth == null ? 1 : depth;
    var defaultAction = '<button type="button" class="mgr-ws-icon-btn' + (isDefault ? ' is-default' : '') + '" data-cvss-default="' + esc(p.id) + '" data-cvss-default-ws="' + esc(id) + '" aria-pressed="' + isDefault + '" title="' + (isDefault ? '取消默认' : '设为默认') + '" aria-label="' + (isDefault ? '取消默认：' : '设为默认：') + esc(path) + '">' + STAR + '</button>';
    return '<div role="treeitem" aria-level="' + (depth + 1) + '" aria-selected="' + on + '"><div class="mgr-ws-pop-row' + (on ? ' is-on' : '') + '" style="--ws-depth:' + depth + '"><span class="mgr-ws-pop-toggle-gap"></span>' +
      '<button type="button" class="mgr-ws-pop-pick" data-cvss-pick="' + esc(p.id) + '" data-cvss-ws="' + esc(id) + '" title="' + esc(path) + '"><span class="mgr-ws-pop-name">' + esc(name) + '</span>' + (kind === false ? '' : WS_KIND) + (isDefault ? '<small class="cv-space-default-label">默认</small>' : '') + (on ? '<b>' + CHECK + '</b>' : '') + '</button>' + defaultAction + '</div></div>';
  }
  var host = wsHost(), groups = hostGroups();
  var mine = spaces(), seen = {};
  /* 我加入的空间在前；只通过独立工作区关联到的开发空间也显示为分组 */
  var groupSpaces = mine.concat(Object.keys(groups.byspace).filter(function (id) {
    return !mine.some(function (p) { return p.id === id; });
  }).map(function (id) { return groups.valid[id]; }));
  var sections = groupSpaces.filter(function (p) { if (seen[p.id]) return false; seen[p.id] = true; return true; }).map(function (p) {
    var member = mine.indexOf(p) >= 0;
    /* [容器, 工作区 id, 名称]：空间自己的同名工作区与工作区，加上关联到它的独立工作区 */
    var items = (member ? [[p, '', p.name]].concat(tkVisibleWorkspaces(p).map(function (r) { return [p, r.ws.id, r.ws.name]; })) : [])
      .concat((groups.byspace[p.id] || []).map(function (w) { return [host, w.id, w.name]; }));
    return { space: p, items: items };
  });
  var loose = groups.flat.filter(function (w) { return !q || w.name.toLocaleLowerCase().includes(q); });
  var rows;
  if (viewMode === 'flat') {
    /* 全部工作区：所有可见工作区一级平铺，不显示管理空间；搜索匹配工作区名或所属空间名，悬停显示完整路径 */
    rows = sections.map(function (sec) {
      return sec.items.filter(function (it) { return !q || it[2].toLocaleLowerCase().includes(q) || sec.space.name.toLocaleLowerCase().includes(q); })
        .map(function (it) { return scopeNode(it[0], it[1], it[2], sec.space.name, 0, false); }).join('');
    }).join('') + loose.map(function (w) { return scopeNode(host, w.id, w.name, '', 0, false); }).join('');
  } else {
    rows = sections.map(function (sec) {
      var hit = !q || sec.space.name.toLocaleLowerCase().includes(q);
      /* 搜索命中工作区时连同所属空间一起显示 */
      var shown = sec.items.filter(function (it) { return hit || it[2].toLocaleLowerCase().includes(q); });
      return shown.length ? spaceNode(sec.space, shown.map(function (it) { return scopeNode(it[0], it[1], it[2], sec.space.name, 1); }).join('')) : '';
    }).join('') + loose.map(function (w) { return scopeNode(host, w.id, w.name, '', 0); }).join('');
  }
  return rows || '<p class="mgr-ws-pop-empty">'+(q ? '没有匹配的空间或工作区' : '暂无可用工作区')+'</p>';
}
function footHtml() {
  return canCreateWs(wsHost()) ? '<div class="mgr-ws-pop-foot"><button type="button" class="mgr-ws-pop-create" data-cvss-create="' + WS_HOST_ID + '">' + PLUS + '<span>创建工作区</span></button></div>' : '';
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
  host.innerHTML = '<button type="button" class="mgr-ws-switch-btn" id="cvSpaceBtn" aria-haspopup="tree" aria-expanded="' + popOpen + '" aria-label="切换空间或工作区：' + esc(path) + '"><span class="mgr-ws-crumb" title="' + esc(path) + '">' + esc(label) + '</span>' + CARET + '</button>' +
    (popOpen ? '<div class="mgr-ws-pop" role="dialog" aria-label="切换空间或工作区"><label class="mgr-ws-pop-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>' +
      '<input type="search" id="cvSpaceSearch" value="' + esc(query) + '" placeholder="' + (viewMode === 'flat' ? '搜索工作区…' : '搜索空间或工作区…') + '" aria-label="搜索空间或工作区" autocomplete="off"></label>' +
      '<div class="cv-space-view" role="group" aria-label="列表视图">' + [['flat', '全部工作区'], ['manage', '管理视图']].map(function (v) {
        return '<button type="button" data-cvss-view="' + v[0] + '" aria-pressed="' + (viewMode === v[0]) + '"' + (viewMode === v[0] ? ' class="is-on"' : '') + '>' + v[1] + '</button>';
      }).join('') + '</div>' +
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
    var viewBtn = t.closest('[data-cvss-view]');
    if (viewBtn) {
      setViewMode(viewBtn.dataset.cvssView);
      render();
      var again = host.querySelector('[data-cvss-view="' + viewMode + '"]'); if (again) again.focus();
      return;
    }
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
    /* 新建独立工作区后直接切换到它 */
    var d = e.detail || {};
    if (d.workspaces === WS_HOST_ID && d.created) { setSpaceScope(WS_HOST_ID, d.created); return; }
    render();
  });
}
