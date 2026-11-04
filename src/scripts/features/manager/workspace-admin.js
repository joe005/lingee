import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { cvPersonById } from '../collab/data.js';
import { WS_MAX_DEPTH, wsById, wsDepth, wsFlatTree, wsPathNames } from '../../core/workspace-tree.js';
import { mgrCurrentPersonId } from './data.js';
import {
  wsProjectById, canCreateChild, canCreateTaskIn, canManageWs, spaceMemberIds, personName,
  wsAddMembers, wsArchive, wsArchivePlan, wsCreate, wsDelete, wsDeleteBlockReason, wsMemberIds, wsMove, wsMoveTargets, wsMoveTasks,
  wsNameError, wsOwnerId, wsPlanMove, wsProgress, wsRemoveMember, wsReorder, wsRestore, wsSetOwner, wsTasksOf, wsUpdateInfo,
} from './workspaces.js';
import { mgrEsc } from './utils.js';
import { initSelectDropdowns } from '../../core/select-dropdown.js';
import { capabilitySave } from '../collab/capability-config.js';
import { recruitCatalog } from '../collab/recruitment-settings.js';
/* 工作区管理（空间负责人 / 管理员 / 工作区负责人；研发协同页「设置」页签）：左侧工作区树（行内新建下级、改名、移动、上下移、归档、删除），
   右侧选中工作区的基本信息、负责人、成员和危险操作。新建、移动、添加成员、归档、删除共用 #mgrWsDialog。
   弹窗同时给研发任务列表的「移动到工作区」使用（openMoveTasksDialog）。 */

var NBSP2 = '  ';
var projectId = null;
var selectedId = '';
var menuId = '';
var dlg = null;   /* 当前弹窗：{ onOk, trigger } */

function project() { return projectId ? wsProjectById(projectId) : null; }
var host = null;     /* 工作区管理的挂载容器（研发协同页「设置」页签） */
function visible() { return !!host && host.isConnected; }
function avatar(id) { var p = cvPersonById(id); return '<span class="mgr-ws-avatar" aria-hidden="true">' + mgrEsc((p ? p.name : '?').slice(0, 1)) + '</span>'; }

/* ---------- 弹窗 ---------- */
function showDialog(cfg) {
  var overlay = $('#mgrWsDialog');
  if (!overlay) return;
  $('#mgrWsDialogTitle').textContent = cfg.title;
  $('#mgrWsDialogBody').innerHTML = '<form id="mgrWsdForm" autocomplete="off" novalidate>' + cfg.body + '<p class="mgr-pe-error" id="mgrWsdError" hidden></p></form>';
  $('#mgrWsDialogFoot').innerHTML = '<button type="button" class="sync-modal__btn sync-modal__btn--ghost" data-mgr-wsd-close>取消</button>' +
    '<button type="button" class="sync-modal__btn ' + (cfg.danger ? 'mgr-delete-confirm' : 'sync-modal__btn--primary') + '" data-mgr-wsd-ok' + (cfg.okDisabled ? ' disabled' : '') + '>' + mgrEsc(cfg.ok || '确定') + '</button>';
  dlg = { onOk: cfg.onOk, trigger: document.activeElement };
  wiz = null;
  overlay.querySelector('.mgr-ws-dialog')?.classList.remove('is-wizard');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  initDialogSelects($('#mgrWsDialogBody'));
  if (cfg.bind) cfg.bind($('#mgrWsDialogBody'), $('#mgrWsDialogFoot [data-mgr-wsd-ok]'));
  var first = $('#mgrWsDialogBody input:not([type="checkbox"]), #mgrWsDialogBody select, #mgrWsDialogBody textarea') || $('#mgrWsDialogFoot [data-mgr-wsd-close]');
  if (first) first.focus();
}
function closeDialog() {
  var overlay = $('#mgrWsDialog');
  if (overlay) { overlay.style.display = 'none'; overlay.setAttribute('aria-hidden', 'true'); overlay.querySelector('.mgr-ws-dialog')?.classList.remove('is-wizard'); }
  var trigger = dlg && dlg.trigger;
  dlg = null; wiz = null;
  if (trigger && trigger.isConnected && trigger.focus) trigger.focus();
}
function dialogError(msg) {
  var el = $('#mgrWsdError');
  if (!el) return;
  el.textContent = msg || '';
  el.hidden = !msg;
}
function submitDialog() {
  if (!dlg) return;
  var okBtn = $('#mgrWsDialogFoot [data-mgr-wsd-ok]');
  if (okBtn && okBtn.disabled) return;
  var err = dlg.onOk();
  if (err === STAY) return;
  if (err) { dialogError(err); return; }
  closeDialog();
}

/* ---------- 下拉选项 ---------- */
function memberOptions(p, selected) {
  return spaceMemberIds(p).map(function (id) {
    return '<option value="' + mgrEsc(id) + '"' + (id === selected ? ' selected' : '') + '>' + mgrEsc(personName(id)) + '</option>';
  }).join('');
}

/* ---------- 新建工作区（向导：基本信息 → 成员 → 智能体 → 智能体团队） ---------- */
var STAY = { stay: true };
var WIZARD_STEPS = [
  { key: 'info', label: '基本信息' },
  { key: 'members', label: '成员' },
  { key: 'experts', label: '智能体' },
  { key: 'teams', label: '智能体团队' },
];
var wiz = null;   /* { p, step, name, desc, parentId, ownerId, members, experts, teams, rootAllowed, parents } */

function stepperHtml(step) {
  return '<ol class="mgr-ws-steps" aria-label="新建步骤">' + WIZARD_STEPS.map(function (st, i) {
    var cls = i < step ? ' is-done' : i === step ? ' is-current' : '';
    return '<li class="mgr-ws-step' + cls + '"' + (i === step ? ' aria-current="step"' : '') + '><span class="mgr-ws-step-dot">' + (i < step ? '✓' : i + 1) + '</span><span>' + mgrEsc(st.label) + '</span></li>';
  }).join('') + '</ol>';
}
function wizardInfoHtml() {
  var p = wiz.p;
  return '<div class="mgr-pe-field"><label for="mgrWsdName">名称 <b aria-hidden="true">*</b></label><input type="text" id="mgrWsdName" maxlength="30" placeholder="如：后端服务" value="' + mgrEsc(wiz.name) + '"></div>' +
    '<div class="mgr-pe-field"><label for="mgrWsdDesc">说明</label><textarea id="mgrWsdDesc" rows="2" maxlength="200" placeholder="这个工作区负责的范围（选填）">' + mgrEsc(wiz.desc) + '</textarea></div>' +
    '<div class="mgr-pe-field shared-select-host"><label for="mgrWsdParent">上级</label><select id="mgrWsdParent">' +
    (wiz.rootAllowed ? '<option value=""' + (wiz.parentId ? '' : ' selected') + '>' + mgrEsc(p.name) + '（空间，一级工作区）</option>' : '') +
    wiz.parents.map(function (r) { return '<option value="' + mgrEsc(r.ws.id) + '"' + (r.ws.id === wiz.parentId ? ' selected' : '') + '>' + NBSP2.repeat(r.depth - 1) + mgrEsc(r.ws.name) + '</option>'; }).join('') + '</select></div>' +
    '<div class="mgr-pe-field shared-select-host"><label for="mgrWsdOwner">负责人 <b aria-hidden="true">*</b></label><select id="mgrWsdOwner">' + memberOptions(p, wiz.ownerId) + '</select>' +
    '<p class="mgr-ws-hint">从空间成员中选择，负责人自动成为工作区成员。</p></div>';
}
function wizardMembersHtml() {
  var pool = spaceMemberIds(wiz.p);
  return '<p class="mgr-ws-hint mgr-ws-hint--top">选择加入工作区的成员，只能从空间成员中选；负责人自动加入。也可以跳过，创建后在「设置 → 成员」里添加。</p>' +
    '<div class="mgr-ws-pick-list">' + pool.map(function (m) {
      var owner = m === wiz.ownerId;
      return '<label class="mgr-ws-pick">' + '<input type="checkbox" data-wiz-member value="' + mgrEsc(m) + '"' + (owner || wiz.members.indexOf(m) >= 0 ? ' checked' : '') + (owner ? ' disabled' : '') + '>' +
        avatar(m) + '<span>' + mgrEsc(personName(m)) + '</span>' + (owner ? '<em class="mgr-ws-pick-tag">负责人</em>' : '') + '</label>';
    }).join('') + '</div>';
}
function wizardAssetsHtml(kind) {
  var label = kind === 'team' ? '智能体团队' : '智能体', picked = kind === 'team' ? wiz.teams : wiz.experts;
  var rows = recruitCatalog(wiz.p, kind);
  return '<p class="mgr-ws-hint mgr-ws-hint--top">选择本工作区成员可使用的' + label + '，只列企业自建的资产。可以跳过，创建后在「设置 → 智能体与团队」里添加。</p>' +
    (rows.length ? '<div class="mgr-ws-pick-list mgr-ws-asset-list">' + rows.map(function (r) {
      return '<label class="mgr-ws-pick mgr-ws-pick--asset"><input type="checkbox" data-wiz-asset value="' + mgrEsc(r.key) + '"' + (picked.indexOf(r.key) >= 0 ? ' checked' : '') + '>' +
        '<span class="mgr-ws-asset-copy"><strong>' + mgrEsc(r.data.name) + '</strong><small>V' + mgrEsc(r.version) + ' · 企业自建</small><span>' + mgrEsc(r.data.desc || '') + '</span></span></label>';
    }).join('') + '</div>' : '<p class="mgr-ws-empty">暂无可添加的企业自建' + label + '。</p>');
}
function wizardCollect() {
  var body = $('#mgrWsDialogBody');
  if (!body || !wiz) return;
  var step = WIZARD_STEPS[wiz.step].key;
  if (step === 'info') {
    wiz.name = $('#mgrWsdName').value; wiz.desc = $('#mgrWsdDesc').value;
    wiz.parentId = $('#mgrWsdParent').value; wiz.ownerId = $('#mgrWsdOwner').value;
  } else if (step === 'members') {
    wiz.members = Array.prototype.map.call(body.querySelectorAll('[data-wiz-member]:checked:not(:disabled)'), function (el) { return el.value; });
  } else {
    var picked = Array.prototype.map.call(body.querySelectorAll('[data-wiz-asset]:checked'), function (el) { return el.value; });
    if (step === 'teams') wiz.teams = picked; else wiz.experts = picked;
  }
}
function initDialogSelects(root) {
  root.querySelectorAll('select').forEach(function (select) {
    if (!(select instanceof HTMLSelectElement)) return;
    initSelectDropdowns([select]);
    var trigger = select.nextElementSibling;
    if (trigger) trigger.classList.add('shared-select-trigger');
  });
}
function renderWizard() {
  var overlay = $('#mgrWsDialog');
  if (!overlay || !wiz) return;
  var key = WIZARD_STEPS[wiz.step].key, last = wiz.step === WIZARD_STEPS.length - 1;
  $('#mgrWsDialogTitle').textContent = '新建工作区';
  $('#mgrWsDialogBody').innerHTML = stepperHtml(wiz.step) + '<form id="mgrWsdForm" autocomplete="off" novalidate>' +
    (key === 'info' ? wizardInfoHtml() : key === 'members' ? wizardMembersHtml() : wizardAssetsHtml(key === 'teams' ? 'team' : 'expert')) +
    '<p class="mgr-pe-error" id="mgrWsdError" hidden></p></form>';
  $('#mgrWsDialogFoot').innerHTML = '<button type="button" class="sync-modal__btn sync-modal__btn--ghost" data-mgr-wsd-close>取消</button>' +
    (wiz.step > 0 ? '<button type="button" class="sync-modal__btn sync-modal__btn--ghost" data-mgr-wsd-prev>上一步</button>' : '') +
    (last ? '' : '<button type="button" class="sync-modal__btn sync-modal__btn--ghost" data-mgr-wsd-skip>跳过并创建</button>') +
    '<button type="button" class="sync-modal__btn sync-modal__btn--primary" data-mgr-wsd-ok>' + (last ? '创建工作区' : '下一步') + '</button>';
  overlay.querySelector('.mgr-ws-dialog').classList.add('is-wizard');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  initDialogSelects($('#mgrWsDialogBody'));
  var first = $('#mgrWsDialogBody input:not([type="checkbox"]), #mgrWsDialogBody textarea') || $('#mgrWsDialogBody input[type="checkbox"]') || $('#mgrWsDialogFoot [data-mgr-wsd-ok]');
  if (first) first.focus();
}
function wizardStepError() {
  if (WIZARD_STEPS[wiz.step].key !== 'info') return '';
  var err = wsNameError(wiz.p, wiz.name, wiz.parentId, '');
  if (err) return err;
  return wiz.ownerId ? '' : '请选择负责人';
}
function wizardMove(delta) {
  wizardCollect();
  if (delta > 0) { var err = wizardStepError(); if (err) { dialogError(err); return; } }
  wiz.step = Math.max(0, Math.min(WIZARD_STEPS.length - 1, wiz.step + delta));
  renderWizard();
}
function wizardFinish() {
  wizardCollect();
  var p = wiz.p, err = wizardStepError();
  if (err) { if (wiz.step !== 0) { wiz.step = 0; renderWizard(); } dialogError(err); return STAY; }
  var res = wsCreate(p, { name: wiz.name, desc: wiz.desc, parentId: wiz.parentId, ownerId: wiz.ownerId });
  if (!res.ok) { if (wiz.step !== 0) { wiz.step = 0; renderWizard(); } dialogError(res.error); return STAY; }
  selectedId = res.ws.id;
  var warnings = [];
  if (wiz.members.length) { var added = wsAddMembers(p, res.ws.id, wiz.members); if (!added.ok) warnings.push('成员'); }
  var keys = wiz.teams.concat(wiz.experts);
  if (keys.length && capabilitySave(p, res.ws.id, { keys: keys, defaultKey: keys[0] })) warnings.push('智能体与团队');
  if (warnings.length) toast('已创建工作区「' + res.ws.name + '」，但' + warnings.join('、') + '未能添加，请到「设置」里重试', 'warning');
  else toast('已创建工作区「' + res.ws.name + '」', 'success');
  return '';
}
function openCreateDialog(parentId) {
  var p = project();
  if (!p) return;
  var parents = wsFlatTree(p).filter(function (row) { return row.depth < WS_MAX_DEPTH && canCreateChild(p, row.ws); });
  var rootAllowed = canCreateChild(p, null);
  if (!rootAllowed && !parents.length) { toast('没有权限新建工作区', 'warning'); return; }
  var pre = parentId && parents.some(function (r) { return r.ws.id === parentId; }) ? parentId : (rootAllowed ? '' : parents[0].ws.id);
  var members = spaceMemberIds(p);
  var me = members.indexOf(mgrCurrentPersonId()) >= 0 ? mgrCurrentPersonId() : (members[0] || '');
  wiz = { p: p, step: 0, name: '', desc: '', parentId: pre, ownerId: me, members: [], experts: [], teams: [], rootAllowed: rootAllowed, parents: parents };
  dlg = {
    trigger: document.activeElement,
    onOk: function () {
      if (wiz.step < WIZARD_STEPS.length - 1) { wizardMove(1); return STAY; }
      return wizardFinish();
    },
  };
  renderWizard();
}

/* ---------- 移动工作区 ---------- */
function openMoveDialog(id) {
  var p = project();
  var ws = p && wsById(p, id);
  if (!ws) return;
  var targets = wsMoveTargets(p, id);
  if (!targets.length) { toast('没有可移动到的位置：不能移到自己或下级下面，且最多 ' + WS_MAX_DEPTH + ' 级', 'warning'); return; }
  showDialog({
    title: '移动工作区', ok: '移动',
    body: '<div class="mgr-pe-field"><label for="mgrWsdTarget">将「' + mgrEsc(ws.name) + '」移动到</label><select id="mgrWsdTarget">' +
      targets.map(function (t) { return '<option value="' + mgrEsc(t.id) + '"' + (t.id === (ws.parentId || '') ? ' selected' : '') + '>' + mgrEsc(t.label) + '</option>'; }).join('') + '</select>' +
      '<p class="mgr-ws-hint">不能移到自己或下级下面；移动后整棵子树最多 ' + WS_MAX_DEPTH + ' 级，且同一父级下名称不能重复。</p></div>',
    onOk: function () {
      var res = wsMove(p, id, $('#mgrWsdTarget').value);
      if (!res.ok) return res.error;
      toast('已移动「' + ws.name + '」', 'success');
      return '';
    },
  });
}

/* ---------- 添加成员 ---------- */
function openAddMembersDialog(id) {
  var p = project();
  var ws = p && wsById(p, id);
  if (!ws) return;
  var have = wsMemberIds(p, ws);
  var pool = spaceMemberIds(p).filter(function (m) { return have.indexOf(m) < 0; });
  if (!pool.length) { toast('空间成员都已在该工作区', 'warning'); return; }
  showDialog({
    title: '添加成员 · ' + ws.name, ok: '添加',
    body: '<p class="mgr-ws-hint mgr-ws-hint--top">只能添加空间成员；成员只在本工作区生效，不要求是上级工作区成员。</p>' +
      '<div class="mgr-ws-pick-list">' + pool.map(function (m) {
        return '<label class="mgr-ws-pick">' + '<input type="checkbox" value="' + mgrEsc(m) + '">' + avatar(m) + '<span>' + mgrEsc(personName(m)) + '</span></label>';
      }).join('') + '</div>',
    onOk: function () {
      var ids = Array.prototype.map.call(document.querySelectorAll('#mgrWsDialogBody input[type="checkbox"]:checked'), function (el) { return el.value; });
      if (!ids.length) return '请至少选择一位成员';
      var res = wsAddMembers(p, id, ids);
      if (!res.ok) return res.error;
      toast('已添加 ' + ids.length + ' 位成员', 'success');
      return '';
    },
  });
}

/* ---------- 归档 / 删除 ---------- */
function openArchiveDialog(id) {
  var p = project();
  var ws = p && wsById(p, id);
  if (!ws) return;
  var plan = wsArchivePlan(p, id);
  if (plan.openCount) { toast('「' + ws.name + '」及下级还有 ' + plan.openCount + ' 个未完成任务，请先完成、移走或取消', 'warning'); return; }
  showDialog({
    title: '归档工作区', ok: '归档',
    body: '<p class="mgr-ws-confirm-text">归档「' + mgrEsc(ws.name) + '」后，其中的任务保留只读，不能再新建任务，可随时恢复。</p>' +
      (plan.cascade.length ? '<p class="mgr-ws-confirm-text">下列下级工作区会一并归档：' + plan.cascade.map(function (w) { return '「' + mgrEsc(w.name) + '」'; }).join('') + '</p>' : ''),
    onOk: function () {
      var res = wsArchive(p, id);
      if (!res.ok) return res.error;
      toast('已归档「' + ws.name + '」', 'success');
      return '';
    },
  });
}
function openDeleteDialog(id) {
  var p = project();
  var ws = p && wsById(p, id);
  if (!ws) return;
  var reason = wsDeleteBlockReason(p, id);
  if (reason) { toast(reason, 'warning'); return; }
  showDialog({
    title: '删除工作区', ok: '删除', danger: true, okDisabled: true,
    body: '<p class="mgr-ws-confirm-text">删除后不可恢复。请输入完整的工作区名称 <b>' + mgrEsc(ws.name) + '</b> 确认删除。</p>' +
      '<div class="mgr-pe-field"><input type="text" id="mgrWsdConfirm" aria-label="输入工作区名称确认删除" placeholder="' + mgrEsc(ws.name) + '"></div>',
    bind: function (body, ok) {
      body.querySelector('#mgrWsdConfirm').addEventListener('input', function (e) { ok.disabled = e.target.value.trim() !== ws.name; });
    },
    onOk: function () {
      var res = wsDelete(p, id);
      if (!res.ok) return res.error;
      selectedId = '';
      toast('已删除「' + ws.name + '」', 'success');
      return '';
    },
  });
}

/* ---------- 移动任务到工作区（研发任务列表多选后调用） ---------- */
function openMoveTasksDialog(p, tasks, done) {
  var rows = wsFlatTree(p).filter(function (r) { return canCreateTaskIn(p, r.ws); });
  if (!rows.length && !tasks.some(function (t) { return t.workspaceId; })) { toast('没有可移入的工作区', 'warning'); return; }
  function joinNote(targetId) {
    var plan = wsPlanMove(p, tasks, targetId);
    if (!plan.ok) return '<span class="is-error">' + mgrEsc(plan.error) + '</span>';
    return plan.join.length ? '处理人 ' + plan.join.map(function (m) { return mgrEsc(personName(m)); }).join('、') + ' 不在目标工作区，确认后将同时加入工作区。' : '处理人都已在目标工作区，只改归属，任务编号、阶段、产物和分支不变。';
  }
  showDialog({
    title: '移动到工作区', ok: '移动',
    body: '<div class="mgr-pe-field"><label for="mgrWsdTarget">将 ' + tasks.length + ' 个任务移动到</label><select id="mgrWsdTarget"><option value="">' + mgrEsc(p.name) + '（空间根，不归入工作区）</option>' +
      rows.map(function (r) { return '<option value="' + mgrEsc(r.ws.id) + '">' + NBSP2.repeat(r.depth - 1) + mgrEsc(r.ws.name) + '</option>'; }).join('') + '</select>' +
      '<p class="mgr-ws-hint" id="mgrWsdNote">' + joinNote('') + '</p></div>',
    bind: function (body) {
      body.querySelector('#mgrWsdTarget').addEventListener('change', function (e) { body.querySelector('#mgrWsdNote').innerHTML = joinNote(e.target.value); });
    },
    onOk: function () {
      var res = wsMoveTasks(p, tasks, $('#mgrWsdTarget').value);
      if (!res.ok) return res.error;
      toast('已移动 ' + tasks.length + ' 个任务' + (res.joined.length ? '，并把 ' + res.joined.map(personName).join('、') + ' 加入工作区' : ''), 'success');
      if (done) done();
      return '';
    },
  });
}

/* ---------- 页面渲染 ---------- */
var MORE_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';

function menuHtml(p, ws) {
  var depth = wsDepth(p, ws.id);
  var manage = canManageWs(p, ws);
  var archived = ws.status === 'archived';
  var items = [];
  if (!archived && canCreateChild(p, ws) && depth < WS_MAX_DEPTH) items.push(['child', '新建下级']);
  if (manage && !archived) { items.push(['rename', '改名']); items.push(['move', '移动']); items.push(['up', '上移']); items.push(['down', '下移']); }
  if (manage) items.push([archived ? 'restore' : 'archive', archived ? '恢复' : '归档']);
  if (manage) items.push(['delete', '删除工作区', true]);
  if (!items.length) return '';
  return '<div class="mgr-ws-menu" role="menu" data-id="' + mgrEsc(ws.id) + '">' + items.map(function (it) {
    return '<button type="button" role="menuitem"' + (it[2] ? ' class="is-danger"' : '') + ' data-mgr-ws-act="' + it[0] + '">' + it[1] + '</button>';
  }).join('') + '</div>';
}
function treeHtml(p) {
  var rows = wsFlatTree(p, { archived: true });
  if (!rows.length) return '<div class="mgr-ws-empty">还没有工作区。工作区用来在空间内划分工作范围：任务、成员按工作区归属，进度逐级汇总。</div>';
  return '<ul class="mgr-ws-tree" role="tree">' + rows.map(function (row) {
    var w = row.ws;
    var prog = wsProgress(p, w.id);
    var on = w.id === selectedId;
    var hasMenu = menuHtml(p, w);
    return '<li class="mgr-ws-node' + (on ? ' is-on' : '') + (w.status === 'archived' ? ' is-archived' : '') + '" role="treeitem" aria-selected="' + on + '" style="--ws-depth:' + (row.depth - 1) + '">' +
      '<button type="button" class="mgr-ws-node-main" data-mgr-ws-select="' + mgrEsc(w.id) + '"><span class="mgr-ws-node-name" title="' + mgrEsc(wsPathNames(p, w.id).join(' / ')) + '">' + mgrEsc(w.name) + '</span>' +
      (w.status === 'archived' ? '<span class="mgr-ws-tag">已归档</span>' : '') +
      '<span class="mgr-ws-node-meta">' + mgrEsc(personName(wsOwnerId(p, w))) + ' · ' + prog.done + '/' + prog.total + '</span></button>' +
      (hasMenu ? '<span class="mgr-ws-node-more"><button type="button" class="mgr-ws-icon-btn" data-mgr-ws-menu="' + mgrEsc(w.id) + '" aria-haspopup="menu" aria-expanded="' + (menuId === w.id) + '" aria-label="' + mgrEsc(w.name) + ' 的更多操作">' + MORE_ICON + '</button>' + (menuId === w.id ? hasMenu : '') + '</span>' : '') +
      '</li>';
  }).join('') + '</ul>';
}
function detailHtml(p) {
  var ws = wsById(p, selectedId);
  if (!ws) return '<div class="mgr-ws-card mgr-ws-detail-empty">在左侧选择一个工作区，查看和维护它的信息、负责人与成员。</div>';
  var manage = canManageWs(p, ws);
  var archived = ws.status === 'archived';
  var editable = manage && !archived;
  var creator = ws.createdBy ? personName(ws.createdBy) : '—';
  var owner = wsOwnerId(p, ws);
  var members = wsMemberIds(p, ws);
  var own = wsTasksOf(p, ws.id, false).length;
  var all = wsTasksOf(p, ws.id, true).length;
  var prog = wsProgress(p, ws.id);
  var info = '<section class="mgr-ws-card"><div class="mgr-ws-card-head"><h2>基本信息</h2>' + (archived ? '<span class="mgr-ws-tag">已归档</span>' : '') + '</div>' +
    '<p class="mgr-ws-path">' + mgrEsc(p.name + ' / ' + wsPathNames(p, ws.id).join(' / ')) + '</p>' +
    '<div class="mgr-ws-field"><label for="mgrWsInfoName">名称 <b aria-hidden="true">*</b></label><input type="text" id="mgrWsInfoName" maxlength="30" value="' + mgrEsc(ws.name) + '"' + (editable ? '' : ' disabled') + '></div>' +
    '<div class="mgr-ws-field"><label for="mgrWsInfoDesc">描述</label><textarea id="mgrWsInfoDesc" rows="2" maxlength="200"' + (editable ? '' : ' disabled') + '>' + mgrEsc(ws.desc || '') + '</textarea></div>' +
    '<div class="mgr-ws-field-row"><div class="mgr-ws-field"><label>创建者</label><div class="mgr-ws-static">' + mgrEsc(creator) + '</div></div>' +
    '<div class="mgr-ws-field"><label>可见性</label><div class="mgr-ws-static">公开（空间成员可见，仅工作区成员可新建和处理）</div></div></div>' +
    '<p class="mgr-pe-error" id="mgrWsInfoError" hidden></p>' +
    (editable ? '<div class="mgr-ws-actions"><button type="button" class="mgr-ws-btn mgr-ws-btn--primary" data-mgr-ws-save>保存</button></div>' : '<p class="mgr-ws-hint">' + (archived ? '已归档的工作区只读，恢复后可编辑。' : '只有空间负责人、空间管理员和该工作区负责人可修改。') + '</p>') + '</section>';
  var ownerBlock = '<div class="mgr-ws-owner"><span class="mgr-ws-owner-label">负责人</span>' + avatar(owner) + '<b>' + mgrEsc(personName(owner)) + '</b>' +
    (editable ? '<select id="mgrWsOwnerSelect" aria-label="更换负责人">' + memberOptions(p, owner) + '</select><button type="button" class="mgr-ws-btn mgr-ws-btn--ghost" data-mgr-ws-owner>更换</button>' : '') + '</div>';
  var membersCard = '<section class="mgr-ws-card"><div class="mgr-ws-card-head"><h2>成员 <span class="mgr-ws-count">' + members.length + '</span></h2>' +
    (editable ? '<button type="button" class="mgr-ws-btn mgr-ws-btn--ghost" data-mgr-ws-addmember>添加成员</button>' : '') + '</div>' + ownerBlock +
    '<ul class="mgr-ws-members">' + members.map(function (m) {
      var isOwner = m === owner;
      return '<li>' + avatar(m) + '<span class="mgr-ws-member-name">' + mgrEsc(personName(m)) + '</span><span class="mgr-ws-tag' + (isOwner ? ' is-brand' : '') + '">' + (isOwner ? '负责人' : '成员') + '</span>' +
        (editable && !isOwner ? '<button type="button" class="mgr-ws-text-btn" data-mgr-ws-remove="' + mgrEsc(m) + '">移出</button>' : '') + '</li>';
    }).join('') + '</ul>' +
    '<p class="mgr-ws-hint">成员平行维护，只要求是空间成员；处理人、审核人必须是工作区成员。</p></section>';
  var stats = '<section class="mgr-ws-card"><div class="mgr-ws-card-head"><h2>任务与进度</h2></div>' +
    '<div class="mgr-ws-stats"><div><b>' + own + '</b><span>本级任务</span></div><div><b>' + all + '</b><span>含下级任务</span></div><div><b>' + prog.done + '/' + prog.total + '</b><span>已完成 / 总任务</span></div><div><b>' + prog.percent + '%</b><span>进度</span></div></div>' +
    '</section>';
  var danger = manage ? '<section class="mgr-ws-card mgr-ws-card--danger"><div class="mgr-ws-card-head"><h2>危险操作</h2></div>' +
    '<div class="mgr-ws-danger-row"><div><b>' + (archived ? '恢复工作区' : '归档工作区') + '</b><p>' + (archived ? '恢复后可继续新建和处理任务。' : '任务与知识保留只读，不能再新建任务；进行中的任务需先完成、移走或取消，可随时恢复。') + '</p></div>' +
    '<button type="button" class="mgr-ws-btn mgr-ws-btn--ghost" data-mgr-ws-act-page="' + (archived ? 'restore' : 'archive') + '">' + (archived ? '恢复' : '归档') + '</button></div>' +
    '<div class="mgr-ws-danger-row"><div><b>删除工作区</b><p>只能删除没有任务和下级的工作区，需输入完整名称确认；有历史任务时请改为归档。</p></div>' +
    '<button type="button" class="mgr-ws-btn mgr-ws-btn--danger" data-mgr-ws-act-page="delete">删除工作区</button></div></section>' : '';
  return info + membersCard + stats + danger;
}
function headActions(p) {
  var canNew = canCreateChild(p, null) || wsFlatTree(p).some(function (r) { return r.depth < WS_MAX_DEPTH && canCreateChild(p, r.ws); });
  return canNew ? '<button type="button" class="mgr-ws-btn mgr-ws-btn--primary" data-mgr-ws-new>新建工作区</button>' : '';
}
function render() {
  var p = project();
  if (!p || !visible()) return;
  if (selectedId && !wsById(p, selectedId)) selectedId = '';
  if (!selectedId) { var first = wsFlatTree(p, { archived: true })[0]; selectedId = first ? first.ws.id : ''; }
  var total = wsFlatTree(p, { archived: true }).length;
  host.innerHTML = '<div class="mgr-ws-toolbar"><h2>工作区管理</h2><span class="mgr-ws-toolbar-sub">' + mgrEsc(p.name) + '</span><div class="mgr-ws-toolbar-actions">' + headActions(p) + '</div></div>' +
    '<div class="mgr-ws-layout"><section class="mgr-ws-card mgr-ws-tree-card"><div class="mgr-ws-card-head"><h2>工作区 <span class="mgr-ws-count">' + total + '</span></h2></div>' + treeHtml(p) +
    '<p class="mgr-ws-hint">最多 ' + WS_MAX_DEPTH + ' 级；每个工作区只有一个上级，任务只属于一个位置。</p></section>' +
    '<div class="mgr-ws-detail">' + detailHtml(p) + '</div></div>';
}

function runAct(act, id) {
  var p = project();
  var ws = p && wsById(p, id);
  if (!ws) return;
  if (act === 'child') { openCreateDialog(id); return; }
  if (act === 'rename') {
    selectedId = id;
    render();
    var input = host && host.querySelector('#mgrWsInfoName');
    if (input && !input.disabled) { input.focus(); input.select(); }
    return;
  }
  if (act === 'move') { openMoveDialog(id); return; }
  if (act === 'up' || act === 'down') {
    var r = wsReorder(p, id, act);
    if (!r.ok) toast(r.error, 'warning');
    return;
  }
  if (act === 'archive') { openArchiveDialog(id); return; }
  if (act === 'restore') {
    var res = wsRestore(p, id);
    toast(res.ok ? '已恢复「' + ws.name + '」' : res.error, res.ok ? 'success' : 'warning');
    return;
  }
  if (act === 'delete') openDeleteDialog(id);
}

function onHostClick(e) {
  var t = e.target;
  if (t.closest('[data-mgr-ws-new]')) { openCreateDialog(selectedId && canCreateChild(project(), wsById(project(), selectedId)) ? selectedId : ''); return; }
  var more = t.closest('[data-mgr-ws-menu]');
  if (more) { var mid = more.getAttribute('data-mgr-ws-menu'); menuId = menuId === mid ? '' : mid; render(); return; }
  var act = t.closest('[data-mgr-ws-act]');
  if (act) { var menu = act.closest('.mgr-ws-menu'); var wid = menu.getAttribute('data-id'); menuId = ''; runAct(act.getAttribute('data-mgr-ws-act'), wid); render(); return; }
  var sel = t.closest('[data-mgr-ws-select]');
  if (sel) { selectedId = sel.getAttribute('data-mgr-ws-select'); menuId = ''; render(); return; }
  var p = project();
  if (!p) return;
  if (t.closest('[data-mgr-ws-save]')) {
    var res = wsUpdateInfo(p, selectedId, { name: $('#mgrWsInfoName').value, desc: $('#mgrWsInfoDesc').value });
    var err = $('#mgrWsInfoError');
    if (!res.ok) { err.textContent = res.error; err.hidden = false; $('#mgrWsInfoName').focus(); return; }
    toast('已保存工作区信息', 'success');
    return;
  }
  if (t.closest('[data-mgr-ws-owner]')) {
    var r = wsSetOwner(p, selectedId, $('#mgrWsOwnerSelect').value);
    toast(r.ok ? '已更换负责人' : r.error, r.ok ? 'success' : 'warning');
    return;
  }
  if (t.closest('[data-mgr-ws-addmember]')) { openAddMembersDialog(selectedId); return; }
  var rm = t.closest('[data-mgr-ws-remove]');
  if (rm) {
    var pid = rm.getAttribute('data-mgr-ws-remove');
    var rr = wsRemoveMember(p, selectedId, pid);
    toast(rr.ok ? '已把 ' + personName(pid) + ' 移出工作区' : rr.error, rr.ok ? 'success' : 'warning');
    return;
  }
  var pa = t.closest('[data-mgr-ws-act-page]');
  if (pa) runAct(pa.getAttribute('data-mgr-ws-act-page'), selectedId);
}
function onHostInput(e) { if (e.target.id === 'mgrWsInfoName') { var err = $('#mgrWsInfoError'); if (err) err.hidden = true; } }

/* 挂载到容器：渲染指定空间的工作区管理；opts.create 直接打开新建弹窗 */
function mountWorkspaceAdmin(el, id, opts) {
  unmountWorkspaceAdmin();
  if (!el || !wsProjectById(id)) return false;
  host = el;
  projectId = id;
  selectedId = (opts && opts.select) || '';
  menuId = '';
  host.addEventListener('click', onHostClick);
  host.addEventListener('input', onHostInput);
  render();
  if (opts && opts.create) openCreateDialog(opts.parentId || '');
  return true;
}
function unmountWorkspaceAdmin() {
  if (host) { host.removeEventListener('click', onHostClick); host.removeEventListener('input', onHostInput); }
  host = null;
  menuId = '';
  closeDialog();
}

/* 不进管理页，直接在当前页面弹出新建（顶部下拉里的「创建工作区」） */
function openCreateWorkspace(id, parentId) {
  if (!wsProjectById(id)) return;
  projectId = id;
  selectedId = '';
  openCreateDialog(parentId || '');
}

export function initWorkspaceAdmin() {
  var overlay = $('#mgrWsDialog');
  if (!overlay) return;
  document.addEventListener('click', function (e) {
    /* 页面点击已重绘时被点元素会脱离文档，按事件路径判断是否点在行内菜单上 */
    var inMenu = e.composedPath().some(function (n) { return n.classList && n.classList.contains('mgr-ws-node-more'); });
    if (menuId && visible() && !inMenu) { menuId = ''; render(); }
  });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay || e.target.closest('[data-mgr-wsd-close]')) { closeDialog(); return; }
    if (e.target.closest('[data-mgr-wsd-prev]')) { wizardMove(-1); return; }
    if (e.target.closest('[data-mgr-wsd-skip]')) { var skipped = wizardFinish(); if (skipped !== STAY) closeDialog(); return; }
    if (e.target.closest('[data-mgr-wsd-ok]')) submitDialog();
  });
  overlay.addEventListener('submit', function (e) { e.preventDefault(); submitDialog(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (dlg) { e.stopPropagation(); closeDialog(); return; }
    if (menuId && visible()) { menuId = ''; render(); }
  }, true);
  document.addEventListener('lingee:mgr-projects-changed', render);
  document.addEventListener('lingee:tasks-changed', render);
  document.addEventListener('lingee:mgr-ws-create', function (e) {
    var d = e.detail || {};
    if (d.project) openCreateWorkspace(d.project, d.parentId);
  });
}

export { mountWorkspaceAdmin, openCreateDialog, openMoveTasksDialog, unmountWorkspaceAdmin };
