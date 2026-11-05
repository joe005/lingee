import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { cvPersonById } from '../collab/data.js';
import { wsById, wsFlatTree } from '../../core/workspace-tree.js';
import { mgrCurrentPersonId } from './data.js';
import {
  wsProjectById, canCreateTaskIn, canCreateWs, canManageWs, canOwnWs, spaceMemberIds, personName,
  wsAddMembers, wsAdminIds, wsVisible, wsArchive, wsArchivePlan, wsCreate, wsDelete, wsDeleteBlockReason, wsMemberIds, wsMoveTasks,
  wsNameError, wsOwnerId, wsPlanMove, wsProgress, wsRemoveMember, wsReorder, wsRestore, wsSetOwner, wsTasksOf, wsUpdateInfo, wsMappableSpaces,
} from './workspaces.js';
import { isWsHost } from '../collab/data.js';
import { buildRepoIdentity, buildRepoSave } from '../collab/repository-config.js';
import { basicRepoRowError } from '../collab/basic-settings-data.js';
import { mgrEsc } from './utils.js';
import { initSelectDropdowns } from '../../core/select-dropdown.js';
import { capabilitySave } from '../collab/capability-config.js';
import { recruitCatalog } from '../collab/recruitment-settings.js';
/* 工作区管理（空间负责人 / 管理员 / 工作区负责人与管理员）：左侧工作区列表（工作区只有一级，行内改名、上下移、归档、删除），
   右侧选中工作区的基本信息、负责人、成员和危险操作。新建、添加成员、归档、删除共用 #mgrWsDialog。
   弹窗同时给研发任务列表的「移动到工作区」使用（openMoveTasksDialog）。 */

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
  { key: 'assets', label: '开发智能体团队' },
];
var wiz = null;   /* { p, step, name, desc, ownerId, spaceId, repo, members, experts, teams } */
var BRANCHES = ['main', 'master', 'develop'];
function emptyRepo() { return { url: '', branchSel: 'main', branchCustom: '' }; }
function repoBranch(r) { return r.branchSel === '__custom' ? r.branchCustom.trim() : r.branchSel; }
/* 与「设置 › 仓库」一致：名称取自地址末段。本机目录属于执行者的设置，不在新建时配置 */
function repoConfig(r, wsId) {
  var url = r.url.trim();
  return { repo: url, baseBranch: repoBranch(r) || 'main', name: url.replace(/\/+$/, '').split('/').pop().replace(/\.git$/, ''), spaceId: wiz.p.id, workspaceId: wsId || '' };
}
/* Git 地址与基准分支同一行，沿用 Manage 新建空间的 .mgr-repo-row；选「其他」时在行内追加分支输入 */
function wizardRepoHtml() {
  var r = wiz.repo, custom = r.branchSel === '__custom';
  return '<div class="mgr-pe-field"><label for="mgrWsdRepo">Git 地址 <b aria-hidden="true">*</b><small>任务默认使用该仓库，创建后可在「设置 › 仓库」增加</small></label><div class="mgr-repo-row">' +
    '<input type="text" id="mgrWsdRepo" inputmode="url" maxlength="2000" placeholder="https://github.com/org/repo" autocomplete="off" value="' + mgrEsc(r.url) + '">' +
    '<div class="mgr-repo-branch shared-select-host"><svg class="mgr-repo-branch-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10"/><path d="M18 10c0 4-6 3-12 7"/></svg>' +
    '<select id="mgrWsdBranch" aria-label="基准分支">' + BRANCHES.concat('__custom').map(function (v) {
      return '<option value="' + v + '"' + (r.branchSel === v ? ' selected' : '') + '>' + (v === '__custom' ? '其他' : v) + '</option>';
    }).join('') + '</select></div>' +
    '<input type="text" id="mgrWsdBranchCustom" class="mgr-repo-branch-custom" maxlength="200" placeholder="分支名，如 release/2026" aria-label="自定义基准分支" autocomplete="off" value="' + mgrEsc(r.branchCustom) + '"' + (custom ? '' : ' hidden') + '>' +
    '</div></div>';
}
/* 成员来源：独立工作区从全部 Build 用户中选，空间下的工作区从空间成员中选 */
function poolLabel(p) { return isWsHost(p) ? 'Build 用户' : '空间成员'; }
function spaceOptions(selected) {
  return '<option value="">不关联</option>' + wsMappableSpaces().map(function (s) {
    return '<option value="' + mgrEsc(s.id) + '"' + (s.id === selected ? ' selected' : '') + '>' + mgrEsc(s.name) + '</option>';
  }).join('');
}

function stepperHtml(step) {
  return '<ol class="mgr-ws-steps" aria-label="新建步骤">' + WIZARD_STEPS.map(function (st, i) {
    var cls = i < step ? ' is-done' : i === step ? ' is-current' : '';
    return '<li class="mgr-ws-step' + cls + '"' + (i === step ? ' aria-current="step"' : '') + '><span class="mgr-ws-step-dot">' + (i < step ? '✓' : i + 1) + '</span><span>' + mgrEsc(st.label) + '</span></li>';
  }).join('') + '</ol>';
}
function wizardInfoHtml() {
  var p = wiz.p;
  return '<div class="mgr-pe-field"><label for="mgrWsdName">名称 <b aria-hidden="true">*</b></label><input type="text" id="mgrWsdName" maxlength="30" placeholder="如：后端服务" value="' + mgrEsc(wiz.name) + '"></div>' +
    '<div class="mgr-pe-field"><label for="mgrWsdDesc">说明 <b aria-hidden="true">*</b></label><textarea id="mgrWsdDesc" rows="2" maxlength="200" placeholder="这个工作区负责的范围">' + mgrEsc(wiz.desc) + '</textarea></div>' +
    wizardRepoHtml() +
    /* 负责人与关联管理空间是两类信息，上下分开；说明收进标签旁的小字，基本信息一屏放下、默认不出现滚动条 */
    '<div class="mgr-pe-field shared-select-host"><label for="mgrWsdOwner">负责人 <b aria-hidden="true">*</b></label><select id="mgrWsdOwner">' + memberOptions(p, wiz.ownerId) + '</select></div>' +
    (isWsHost(p) ? '<div class="mgr-pe-field shared-select-host"><label for="mgrWsdSpace">关联管理空间<small>选填，对应 Manage 的开发空间，创建后可在「设置 › 通用」修改</small></label><select id="mgrWsdSpace">' + spaceOptions(wiz.spaceId) + '</select></div>' : '');
}
/* 成员：按姓名、邮箱、手机号或工号搜索添加，添加时选成员或管理员；负责人固定在列表首行 */
var ROLE_LABEL = { member: '成员', admin: '管理员' };
function wizardCandidates() {
  var q = wiz.memberQuery.trim().toLocaleLowerCase();
  /* 搜索结果可多选勾选，勾选状态跨搜索词保留，点「添加」一次加入 */
  if (!q) return '';
  var taken = wiz.members.map(function (m) { return m.id; }).concat(wiz.ownerId);
  var rows = spaceMemberIds(wiz.p).filter(function (id) { return taken.indexOf(id) < 0; }).map(function (id) { return cvPersonById(id); }).filter(function (m) {
    return m && m.status !== 'disabled' && [m.name, m.email, m.phone, m.employeeId, m.id].some(function (v) { return String(v || '').toLocaleLowerCase().includes(q); });
  });
  return rows.length ? rows.slice(0, 20).map(function (m) {
    var on = wiz.memberPicked.indexOf(m.id) >= 0;
    return '<label class="mgr-ws-candidate"><input type="checkbox" data-wiz-member-pick value="' + mgrEsc(m.id) + '"' + (on ? ' checked' : '') + '>' + avatar(m.id) +
      '<span class="mgr-ws-candidate-copy"><strong>' + mgrEsc(m.name) + '</strong><small>' + mgrEsc(m.email || m.dept || '') + '</small></span></label>';
  }).join('') : '<p class="mgr-ws-empty">没有匹配的可添加人员</p>';
}
function confirmLabel() { return wiz.memberPicked.length ? '添加（' + wiz.memberPicked.length + '）' : '添加'; }
function syncConfirm() {
  var btn = $('#mgrWsDialogBody [data-wiz-member-confirm]');
  if (btn) { btn.disabled = !wiz.memberPicked.length; btn.textContent = confirmLabel(); }
}
function addPendingMember() {
  if (!wiz.memberPicked.length) { dialogError('请先在搜索结果中勾选人员'); return; }
  wizardCollect();
  var role = wiz.memberRole === 'admin' ? 'admin' : 'member';
  wiz.memberPicked.forEach(function (id) {
    if (id !== wiz.ownerId && !wiz.members.some(function (m) { return m.id === id; })) wiz.members.push({ id: id, role: role });
  });
  wiz.memberPicked = []; wiz.memberQuery = '';
  renderWizard();
  var search = $('#mgrWsdMemberSearch'); if (search) search.focus();
}
function wizardMembersHtml() {
  var rows = [{ id: wiz.ownerId, role: 'owner' }].concat(wiz.members);
  function roleOptions(selected) {
    return ['member', 'admin'].map(function (r) { return '<option value="' + r + '"' + (selected === r ? ' selected' : '') + '>' + ROLE_LABEL[r] + '</option>'; }).join('');
  }
  /* 搜索 → 点选候选人 → 选角色 → 点「添加」；已添加的成员可在列表里改角色 */
  return '<div class="mgr-ws-member-add"><div class="mgr-ws-member-search"><div class="mgr-ws-member-input"><input type="search" id="mgrWsdMemberSearch" autocomplete="off" placeholder="搜索姓名、邮箱、手机号或工号" aria-label="搜索要添加的成员" aria-controls="mgrWsdMemberResults" value="' + mgrEsc(wiz.memberQuery) + '">' +
    '<div class="mgr-ws-candidates" id="mgrWsdMemberResults" role="listbox" aria-label="可添加的人员">' + wizardCandidates() + '</div></div>' +
    '<span class="shared-select-host mgr-ws-role-host"><select id="mgrWsdMemberRole" aria-label="添加为">' + roleOptions(wiz.memberRole) + '</select></span>' +
    '<button type="button" class="sync-modal__btn sync-modal__btn--primary mgr-ws-member-confirm" data-wiz-member-confirm' + (wiz.memberPicked.length ? '' : ' disabled') + '>' + confirmLabel() + '</button></div></div>' +
    '<ul class="mgr-ws-member-list" aria-label="已添加的成员">' + rows.map(function (row) {
      var p = cvPersonById(row.id);
      if (!p) return '';
      var role = row.role === 'owner' ? '<em class="mgr-ws-pick-tag">负责人</em>'
        : '<span class="shared-select-host mgr-ws-row-role"><select data-wiz-member-role="' + mgrEsc(row.id) + '" aria-label="' + mgrEsc(p.name) + '的角色">' + roleOptions(row.role) + '</select></span>';
      return '<li>' + avatar(row.id) + '<span class="mgr-ws-candidate-copy"><strong>' + mgrEsc(p.name) + '</strong><small>' + mgrEsc(p.email || p.dept || '') + '</small></span>' + role +
        (row.role === 'owner' ? '' : '<button type="button" class="mgr-ws-text-btn" data-wiz-member-remove="' + mgrEsc(row.id) + '" aria-label="移除' + mgrEsc(p.name) + '">移除</button>') + '</li>';
    }).join('') + '</ul>';
}
/* 智能体团队优先：选中团队后，团队依赖的智能体自动带出（智能体一步里勾选且锁定），创建时一并添加 */
function teamDeps() {
  var experts = recruitCatalog(wiz.p, 'expert'), deps = {};
  recruitCatalog(wiz.p, 'team').filter(function (t) { return wiz.teams.indexOf(t.key) >= 0; }).forEach(function (t) {
    (t.data.members || []).forEach(function (id) {
      var row = experts.find(function (e) { return e.data.id === id; });
      if (row) (deps[row.key] = deps[row.key] || []).push(t.data.name);
    });
  });
  return deps;
}
function teamMemberNames(team) {
  var experts = recruitCatalog(wiz.p, 'expert');
  return (team.data.members || []).map(function (id) { var row = experts.find(function (e) { return e.data.id === id; }); return row ? row.data.name : ''; }).filter(Boolean);
}
function wizardAssetRows(kind) {
  var picked = kind === 'team' ? wiz.teams : wiz.experts, deps = kind === 'expert' ? teamDeps() : {};
  var rows = recruitCatalog(wiz.p, kind, wiz.assetQuery);
  var label = kind === 'team' ? '开发智能体团队' : '开发智能体';
  if (!rows.length) return '<p class="mgr-ws-empty">' + (wiz.assetQuery.trim() ? '没有匹配的' + label + '。' : '暂无可添加的企业自建' + label + (kind === 'team' ? '，可先选择下方的开发智能体，或在「开发智能体团队 › 更多」中添加后再分配。' : '。')) + '</p>';
  return rows.map(function (r) {
    var auto = deps[r.key], members = kind === 'team' ? teamMemberNames(r) : [];
    var note = auto ? '<em class="mgr-ws-asset-dep">随团队「' + mgrEsc(auto.join('」「')) + '」带出</em>'
      : members.length ? '<em class="mgr-ws-asset-dep is-muted">包含 ' + members.length + ' 个开发智能体：' + mgrEsc(members.join('、')) + '</em>' : '';
    return '<label class="mgr-ws-pick mgr-ws-pick--asset' + (auto ? ' is-auto' : '') + '"><input type="checkbox" data-wiz-asset="' + kind + '" value="' + mgrEsc(r.key) + '"' + (auto || picked.indexOf(r.key) >= 0 ? ' checked' : '') + (auto ? ' disabled' : '') + '>' +
      '<span class="mgr-ws-asset-copy"><strong>' + mgrEsc(r.data.name) + '</strong><small>V' + mgrEsc(r.version) + ' · 企业自建' + (r.scope === 'workspace' ? ' · 工作区可用' : '') + '</small>' + (r.data.desc ? '<span>' + mgrEsc(r.data.desc) + '</span>' : '') + note + '</span></label>';
  }).join('');
}
/* 开发智能体与团队合并为一步：一个搜索框同时筛两组，团队在前；勾选团队后下方智能体立即带出依赖 */
function wizardAssetsHtml() {
  return '<p class="mgr-ws-hint mgr-ws-hint--top">优先选择开发智能体团队，团队依赖的开发智能体会自动带出，也可再补充单独使用的开发智能体。</p>' +
    '<div class="mgr-ws-asset-search"><input type="search" id="mgrWsdAssetSearch" autocomplete="off" placeholder="搜索开发智能体团队或开发智能体" aria-label="搜索开发智能体团队或开发智能体" aria-controls="mgrWsdTeamList mgrWsdExpertList" value="' + mgrEsc(wiz.assetQuery) + '"></div>' +
    '<div class="mgr-ws-asset-scroll"><h4 class="mgr-ws-asset-title">开发智能体团队</h4><div class="mgr-ws-pick-list mgr-ws-asset-list" id="mgrWsdTeamList">' + wizardAssetRows('team') + '</div>' +
    '<h4 class="mgr-ws-asset-title">开发智能体</h4><div class="mgr-ws-pick-list mgr-ws-asset-list" id="mgrWsdExpertList">' + wizardAssetRows('expert') + '</div></div>';
}
function refreshAssetLists(which) {
  if (which !== 'expert') { var t = $('#mgrWsdTeamList'); if (t) t.innerHTML = wizardAssetRows('team'); }
  var x = $('#mgrWsdExpertList'); if (x) x.innerHTML = wizardAssetRows('expert');
}
function wizardCollect() {
  var body = $('#mgrWsDialogBody');
  if (!body || !wiz) return;
  var step = WIZARD_STEPS[wiz.step].key;
  if (step === 'info') {
    wiz.name = $('#mgrWsdName').value; wiz.desc = $('#mgrWsdDesc').value;
    wiz.ownerId = $('#mgrWsdOwner').value;
    if ($('#mgrWsdSpace')) wiz.spaceId = $('#mgrWsdSpace').value;
    wiz.repo.url = $('#mgrWsdRepo').value;
    wiz.repo.branchSel = $('#mgrWsdBranch').value;
    wiz.repo.branchCustom = $('#mgrWsdBranchCustom').value;
  } else if (step === 'members') {
    if ($('#mgrWsdMemberSearch')) wiz.memberQuery = $('#mgrWsdMemberSearch').value;
    if ($('#mgrWsdMemberRole')) wiz.memberRole = $('#mgrWsdMemberRole').value;
  } else {
    /* 勾选状态随点击实时记录（搜索会隐藏未匹配项），这里只同步搜索词 */
    if ($('#mgrWsdAssetSearch')) wiz.assetQuery = $('#mgrWsdAssetSearch').value;
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
  /* 负责人改成已添加的人时，从成员列表去掉，避免重复 */
  wiz.members = wiz.members.filter(function (m) { return m.id !== wiz.ownerId; });
  var key = WIZARD_STEPS[wiz.step].key, last = wiz.step === WIZARD_STEPS.length - 1;
  $('#mgrWsDialogTitle').textContent = '新建工作区';
  $('#mgrWsDialogBody').innerHTML = stepperHtml(wiz.step) + '<form id="mgrWsdForm" autocomplete="off" novalidate>' +
    (key === 'info' ? wizardInfoHtml() : key === 'members' ? wizardMembersHtml() : wizardAssetsHtml()) +
    '<p class="mgr-pe-error" id="mgrWsdError" hidden></p></form>';
  $('#mgrWsDialogFoot').innerHTML = '<button type="button" class="sync-modal__btn sync-modal__btn--ghost" data-mgr-wsd-close>取消</button>' +
    (wiz.step > 0 ? '<button type="button" class="sync-modal__btn sync-modal__btn--ghost" data-mgr-wsd-prev>上一步</button>' : '') +
    (last || wiz.step === 0 ? '' : '<button type="button" class="sync-modal__btn sync-modal__btn--ghost" data-mgr-wsd-skip>跳过并创建</button>') +
    '<button type="button" class="sync-modal__btn sync-modal__btn--primary" data-mgr-wsd-ok>' + (last ? '创建工作区' : '下一步') + '</button>';
  overlay.querySelector('.mgr-ws-dialog').classList.add('is-wizard');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  initDialogSelects($('#mgrWsDialogBody'));
  var first = $('#mgrWsDialogBody input:not([type="checkbox"]), #mgrWsDialogBody textarea') || $('#mgrWsDialogBody input[type="checkbox"]') || $('#mgrWsDialogFoot [data-mgr-wsd-ok]');
  if (first) first.focus();
}
function infoError() {
  var err = wsNameError(wiz.p, wiz.name, '');
  if (err) return err;
  if (!String(wiz.desc || '').trim()) return '请填写说明';
  return wiz.ownerId ? '' : '请选择负责人';
}
/* 仓库必填：校验地址、分支、Git 账号与可访问性 */
function repoError() {
  var r = wiz.repo;
  if (!r.url.trim()) return '请填写 Git 地址';
  if (r.branchSel === '__custom' && !r.branchCustom.trim()) return '请输入自定义分支名称';
  var err = basicRepoRowError({ repo: r.url.trim(), baseBranch: repoBranch(r) });
  return err || '';
}
function wizardStepError() {
  var key = WIZARD_STEPS[wiz.step].key;
  return key === 'info' ? infoError() || repoError() : '';
}
function wizardMove(delta) {
  wizardCollect();
  if (delta > 0) { var err = wizardStepError(); if (err) { dialogError(err); return; } }
  wiz.step = Math.max(0, Math.min(WIZARD_STEPS.length - 1, wiz.step + delta));
  renderWizard();
}
function wizardFinish() {
  wizardCollect();
  var p = wiz.p, err = infoError() || repoError();
  if (err) { if (wiz.step !== 0) { wiz.step = 0; renderWizard(); } dialogError(err); return STAY; }
  var res = wsCreate(p, { name: wiz.name, desc: wiz.desc, ownerId: wiz.ownerId, spaceId: wiz.spaceId });
  if (!res.ok) { if (wiz.step !== 0) { wiz.step = 0; renderWizard(); } dialogError(res.error); return STAY; }
  selectedId = res.ws.id;
  var warnings = [];
  if (wiz.repo.url.trim()) {
    var cfg = repoConfig(wiz.repo, res.ws.id);
    if (!buildRepoSave(p, res.ws.id, { repositories: [{ repo: cfg.repo, baseBranch: cfg.baseBranch, name: cfg.name, desc: '' }], defaultRepo: buildRepoIdentity(cfg.repo) })) warnings.push('仓库');
  }
  /* 负责人已在创建时加入；其余按添加时选的角色写入 */
  var plain = wiz.members.filter(function (m) { return m.role !== 'admin' && m.id !== wiz.ownerId; }).map(function (m) { return m.id; });
  var admins = wiz.members.filter(function (m) { return m.role === 'admin' && m.id !== wiz.ownerId; }).map(function (m) { return m.id; });
  if ((plain.length && !wsAddMembers(p, res.ws.id, plain).ok) || (admins.length && !wsAddMembers(p, res.ws.id, admins, 'admin').ok)) warnings.push('成员');
  var keys = Array.from(new Set(wiz.teams.concat(Object.keys(teamDeps()), wiz.experts)));
  if (keys.length && capabilitySave(p, res.ws.id, { keys: keys, defaultKey: keys[0] })) warnings.push('开发智能体与团队');
  if (warnings.length) toast('已创建工作区「' + res.ws.name + '」，但' + warnings.join('、') + '未能添加，请到「设置」里重试', 'warning');
  else toast('已创建工作区「' + res.ws.name + '」', 'success');
  return '';
}
function openCreateDialog(spaceId) {
  var p = project();
  if (!p) return;
  if (!canCreateWs(p)) { toast(isWsHost(p) ? '请先登录再新建工作区' : '只有空间负责人或管理员可以新建工作区', 'warning'); return; }
  var members = spaceMemberIds(p);
  var me = members.indexOf(mgrCurrentPersonId()) >= 0 ? mgrCurrentPersonId() : (members[0] || '');
  /* 关联管理空间默认不关联，由用户自己选 */
  wiz = { p: p, step: 0, name: '', desc: '', ownerId: me, spaceId: '', repo: emptyRepo(), members: [], memberQuery: '', memberPicked: [], memberRole: 'member', experts: [], teams: [], assetQuery: '' };
  dlg = {
    trigger: document.activeElement,
    onOk: function () {
      if (wiz.step < WIZARD_STEPS.length - 1) { wizardMove(1); return STAY; }
      return wizardFinish();
    },
  };
  renderWizard();
}

/* ---------- 添加成员 ---------- */
function openAddMembersDialog(id) {
  var p = project();
  var ws = p && wsById(p, id);
  if (!ws) return;
  var have = wsMemberIds(p, ws);
  var pool = spaceMemberIds(p).filter(function (m) { return have.indexOf(m) < 0; });
  if (!pool.length) { toast(poolLabel(p) + '都已在该工作区', 'warning'); return; }
  showDialog({
    title: '添加成员 · ' + ws.name, ok: '添加',
    body: '<p class="mgr-ws-hint mgr-ws-hint--top">只能添加' + poolLabel(p) + '；成员只在本工作区生效。</p>' +
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
  if (plan.openCount) { toast('「' + ws.name + '」还有 ' + plan.openCount + ' 个未完成任务，请先完成、移走或取消', 'warning'); return; }
  showDialog({
    title: '归档工作区', ok: '归档',
    body: '<p class="mgr-ws-confirm-text">归档「' + mgrEsc(ws.name) + '」后，其中的任务保留只读，不能再新建任务，可随时恢复。</p>' ,
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
      rows.map(function (r) { return '<option value="' + mgrEsc(r.ws.id) + '">' + mgrEsc(r.ws.name) + '</option>'; }).join('') + '</select>' +
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
  var manage = canManageWs(p, ws);
  var archived = ws.status === 'archived';
  var items = [];
  if (manage && !archived) { items.push(['rename', '改名']); items.push(['up', '上移']); items.push(['down', '下移']); }
  if (manage) items.push([archived ? 'restore' : 'archive', archived ? '恢复' : '归档']);
  if (canOwnWs(p, ws)) items.push(['delete', '删除工作区', true]);
  if (!items.length) return '';
  return '<div class="mgr-ws-menu" role="menu" data-id="' + mgrEsc(ws.id) + '">' + items.map(function (it) {
    return '<button type="button" role="menuitem"' + (it[2] ? ' class="is-danger"' : '') + ' data-mgr-ws-act="' + it[0] + '">' + it[1] + '</button>';
  }).join('') + '</div>';
}
function treeHtml(p) {
  var rows = wsFlatTree(p, { archived: true }).filter(function (r) { return wsVisible(p, r.ws); });
  if (!rows.length) return '<div class="mgr-ws-empty">还没有工作区。工作区用来在空间内划分工作范围：任务、成员按工作区归属。</div>';
  return '<ul class="mgr-ws-tree" role="listbox" aria-label="工作区">' + rows.map(function (row) {
    var w = row.ws;
    var prog = wsProgress(p, w.id);
    var on = w.id === selectedId;
    var hasMenu = menuHtml(p, w);
    return '<li class="mgr-ws-node' + (on ? ' is-on' : '') + (w.status === 'archived' ? ' is-archived' : '') + '" role="option" aria-selected="' + on + '">' +
      '<button type="button" class="mgr-ws-node-main" data-mgr-ws-select="' + mgrEsc(w.id) + '"><span class="mgr-ws-node-name" title="' + mgrEsc(w.name) + '">' + mgrEsc(w.name) + '</span>' +
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
  var prog = wsProgress(p, ws.id);
  var info = '<section class="mgr-ws-card"><div class="mgr-ws-card-head"><h2>基本信息</h2>' + (archived ? '<span class="mgr-ws-tag">已归档</span>' : '') + '</div>' +
    '<p class="mgr-ws-path">' + mgrEsc(p.name + ' / ' + ws.name) + '</p>' +
    '<div class="mgr-ws-field"><label for="mgrWsInfoName">名称 <b aria-hidden="true">*</b></label><input type="text" id="mgrWsInfoName" maxlength="30" value="' + mgrEsc(ws.name) + '"' + (editable ? '' : ' disabled') + '></div>' +
    '<div class="mgr-ws-field"><label for="mgrWsInfoDesc">描述</label><textarea id="mgrWsInfoDesc" rows="2" maxlength="200"' + (editable ? '' : ' disabled') + '>' + mgrEsc(ws.desc || '') + '</textarea></div>' +
    '<div class="mgr-ws-field-row"><div class="mgr-ws-field"><label>创建者</label><div class="mgr-ws-static">' + mgrEsc(creator) + '</div></div>' +
    '<div class="mgr-ws-field"><label>可见性</label><div class="mgr-ws-static">仅工作区成员与空间负责人、管理员可见</div></div></div>' +
    '<p class="mgr-pe-error" id="mgrWsInfoError" hidden></p>' +
    (editable ? '<div class="mgr-ws-actions"><button type="button" class="mgr-ws-btn mgr-ws-btn--primary" data-mgr-ws-save>保存</button></div>' : '<p class="mgr-ws-hint">' + (archived ? '已归档的工作区只读，恢复后可编辑。' : '只有空间负责人、空间管理员和该工作区负责人可修改。') + '</p>') + '</section>';
  var ownerBlock = '<div class="mgr-ws-owner"><span class="mgr-ws-owner-label">负责人</span>' + avatar(owner) + '<b>' + mgrEsc(personName(owner)) + '</b>' +
    (editable && canOwnWs(p, ws) ? '<select id="mgrWsOwnerSelect" aria-label="更换负责人">' + memberOptions(p, owner) + '</select><button type="button" class="mgr-ws-btn mgr-ws-btn--ghost" data-mgr-ws-owner>更换</button>' : '') + '</div>';
  var membersCard = '<section class="mgr-ws-card"><div class="mgr-ws-card-head"><h2>成员 <span class="mgr-ws-count">' + members.length + '</span></h2>' +
    (editable ? '<button type="button" class="mgr-ws-btn mgr-ws-btn--ghost" data-mgr-ws-addmember>添加成员</button>' : '') + '</div>' + ownerBlock +
    '<ul class="mgr-ws-members">' + members.map(function (m) {
      var isOwner = m === owner;
      return '<li>' + avatar(m) + '<span class="mgr-ws-member-name">' + mgrEsc(personName(m)) + '</span><span class="mgr-ws-tag' + (isOwner ? ' is-brand' : '') + '">' + (isOwner ? '负责人' : wsAdminIds(ws).indexOf(m) >= 0 ? '管理员' : '成员') + '</span>' +
        (editable && !isOwner ? '<button type="button" class="mgr-ws-text-btn" data-mgr-ws-remove="' + mgrEsc(m) + '">移出</button>' : '') + '</li>';
    }).join('') + '</ul>' +
    '<p class="mgr-ws-hint">成员平行维护，只要求是空间成员；处理人、审核人必须是工作区成员。</p></section>';
  var stats = '<section class="mgr-ws-card"><div class="mgr-ws-card-head"><h2>任务与进度</h2></div>' +
    '<div class="mgr-ws-stats"><div><b>' + prog.done + '/' + prog.total + '</b><span>已完成 / 总任务</span></div><div><b>' + prog.percent + '%</b><span>进度</span></div></div>' +
    '</section>';
  var deleteRow = canOwnWs(p, ws);
  var danger = manage ? '<section class="mgr-ws-card mgr-ws-card--danger"><div class="mgr-ws-card-head"><h2>危险操作</h2></div>' +
    '<div class="mgr-ws-danger-row"><div><b>' + (archived ? '恢复工作区' : '归档工作区') + '</b><p>' + (archived ? '恢复后可继续新建和处理任务。' : '任务与知识保留只读，不能再新建任务；进行中的任务需先完成、移走或取消，可随时恢复。') + '</p></div>' +
    '<button type="button" class="mgr-ws-btn mgr-ws-btn--ghost" data-mgr-ws-act-page="' + (archived ? 'restore' : 'archive') + '">' + (archived ? '恢复' : '归档') + '</button></div>' +
    (deleteRow ? '<div class="mgr-ws-danger-row"><div><b>删除工作区</b><p>只能删除没有任务的工作区，需输入完整名称确认；有历史任务时请改为归档。</p></div>' +
    '<button type="button" class="mgr-ws-btn mgr-ws-btn--danger" data-mgr-ws-act-page="delete">删除工作区</button></div>' : '') + '</section>' : '';
  return info + membersCard + stats + danger;
}
function headActions(p) {
  var canNew = canCreateWs(p);
  return canNew ? '<button type="button" class="mgr-ws-btn mgr-ws-btn--primary" data-mgr-ws-new>新建工作区</button>' : '';
}
function render() {
  var p = project();
  if (!p || !visible()) return;
  if (selectedId && !wsById(p, selectedId)) selectedId = '';
  if (selectedId && !wsVisible(p, wsById(p, selectedId))) selectedId = '';
  if (!selectedId) { var first = wsFlatTree(p, { archived: true }).filter(function (r) { return wsVisible(p, r.ws); })[0]; selectedId = first ? first.ws.id : ''; }
  var total = wsFlatTree(p, { archived: true }).filter(function (r) { return wsVisible(p, r.ws); }).length;
  host.innerHTML = '<div class="mgr-ws-toolbar"><h2>工作区管理</h2><span class="mgr-ws-toolbar-sub">' + mgrEsc(p.name) + '</span><div class="mgr-ws-toolbar-actions">' + headActions(p) + '</div></div>' +
    '<div class="mgr-ws-layout"><section class="mgr-ws-card mgr-ws-tree-card"><div class="mgr-ws-card-head"><h2>工作区 <span class="mgr-ws-count">' + total + '</span></h2></div>' + treeHtml(p) +
    '<p class="mgr-ws-hint">工作区在空间下平铺，每个任务只属于一个工作区。</p></section>' +
    '<div class="mgr-ws-detail">' + detailHtml(p) + '</div></div>';
}

function runAct(act, id) {
  var p = project();
  var ws = p && wsById(p, id);
  if (!ws) return;
  if (act === 'rename') {
    selectedId = id;
    render();
    var input = host && host.querySelector('#mgrWsInfoName');
    if (input && !input.disabled) { input.focus(); input.select(); }
    return;
  }
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
  if (t.closest('[data-mgr-ws-new]')) { openCreateDialog(); return; }
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
  if (opts && opts.create) openCreateDialog();
  return true;
}
function unmountWorkspaceAdmin() {
  if (host) { host.removeEventListener('click', onHostClick); host.removeEventListener('input', onHostInput); }
  host = null;
  menuId = '';
  closeDialog();
}

/* 不进管理页，直接在当前页面弹出新建（顶部下拉里的「创建工作区」） */
function openCreateWorkspace(id, spaceId) {
  if (!wsProjectById(id)) return;
  projectId = id;
  selectedId = '';
  openCreateDialog(spaceId || '');
}

export function initWorkspaceAdmin() {
  var overlay = $('#mgrWsDialog');
  if (!overlay) return;
  document.addEventListener('click', function (e) {
    /* 页面点击已重绘时被点元素会脱离文档，按事件路径判断是否点在行内菜单上 */
    var inMenu = e.composedPath().some(function (n) { return n.classList && n.classList.contains('mgr-ws-node-more'); });
    if (menuId && visible() && !inMenu) { menuId = ''; render(); }
  });
  /* 勾选候选人时保持搜索框焦点，浮层不收起 */
  overlay.addEventListener('mousedown', function (e) {
    if (e.target.closest('#mgrWsdMemberResults')) e.preventDefault();
  });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay || e.target.closest('[data-mgr-wsd-close]')) { closeDialog(); return; }
    if (e.target.closest('[data-mgr-wsd-prev]')) { wizardMove(-1); return; }
    if (e.target.closest('[data-wiz-member-confirm]') && wiz) { addPendingMember(); return; }
    var removeBtn = e.target.closest('[data-wiz-member-remove]');
    if (removeBtn && wiz) {
      wizardCollect();
      wiz.members = wiz.members.filter(function (m) { return m.id !== removeBtn.dataset.wizMemberRemove; });
      renderWizard();
      var again = $('#mgrWsdMemberSearch'); if (again) again.focus();
      return;
    }
    if (e.target.closest('[data-mgr-wsd-skip]')) { var skipped = wizardFinish(); if (skipped !== STAY) closeDialog(); return; }
    if (e.target.closest('[data-mgr-wsd-ok]')) submitDialog();
  });
  overlay.addEventListener('submit', function (e) { e.preventDefault(); submitDialog(); });
  /* 成员步骤：输入即刷新候选，只重绘候选区以保持输入焦点；回车不提交向导 */
  overlay.addEventListener('input', function (e) {
    if (wiz && e.target.id === 'mgrWsdAssetSearch') {
      wiz.assetQuery = e.target.value;
      refreshAssetLists();
      return;
    }
    if (!wiz || e.target.id !== 'mgrWsdMemberSearch') return;
    wiz.memberQuery = e.target.value;
    var box = $('#mgrWsdMemberResults'); if (box) box.innerHTML = wizardCandidates();
  });
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.target.id === 'mgrWsdMemberSearch' || e.target.id === 'mgrWsdAssetSearch')) {
      e.preventDefault();
      if (e.target.id === 'mgrWsdMemberSearch' && wiz && wiz.memberPicked.length) addPendingMember();
    }
  });
  overlay.addEventListener('change', function (e) {
    if (wiz && e.target.id === 'mgrWsdMemberRole') wiz.memberRole = e.target.value;
    if (wiz && e.target.matches('[data-wiz-member-pick]')) {
      var id = e.target.value, at = wiz.memberPicked.indexOf(id);
      if (e.target.checked && at < 0) wiz.memberPicked.push(id);
      if (!e.target.checked && at >= 0) wiz.memberPicked.splice(at, 1);
      syncConfirm();
      dialogError('');
    }
    if (wiz && e.target.matches('[data-wiz-member-role]')) {
      var row = wiz.members.find(function (m) { return m.id === e.target.dataset.wizMemberRole; });
      if (row) row.role = e.target.value === 'admin' ? 'admin' : 'member';
    }
    if (wiz && e.target.matches('[data-wiz-asset]') && !e.target.disabled) {
      var isTeam = e.target.dataset.wizAsset === 'team', list = isTeam ? wiz.teams : wiz.experts, key = e.target.value, at = list.indexOf(key);
      if (e.target.checked && at < 0) list.push(key);
      if (!e.target.checked && at >= 0) list.splice(at, 1);
      /* 团队增减后，下方智能体的「随团队带出」立即更新 */
      if (isTeam) refreshAssetLists('expert');
    }
  });
  /* 基本信息：基准分支选「其他」时显示行内分支输入，不重绘以保留输入焦点 */
  overlay.addEventListener('change', function (e) {
    if (!wiz || e.target.id !== 'mgrWsdBranch') return;
    var custom = $('#mgrWsdBranchCustom');
    if (!custom) return;
    custom.hidden = e.target.value !== '__custom';
    if (!custom.hidden) custom.focus();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (dlg) { e.stopPropagation(); closeDialog(); return; }
    if (menuId && visible()) { menuId = ''; render(); }
  }, true);
  document.addEventListener('lingee:mgr-projects-changed', render);
  document.addEventListener('lingee:tasks-changed', render);
  document.addEventListener('lingee:mgr-ws-create', function (e) {
    var d = e.detail || {};
    if (d.project) openCreateWorkspace(d.project, d.spaceId);
  });
}

export { mountWorkspaceAdmin, openCreateDialog, openMoveTasksDialog, unmountWorkspaceAdmin };
