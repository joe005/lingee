import { initSelectDropdowns } from '../../core/select-dropdown.js';
import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { CV_MEMBERS, cvCurrentUserName, cvPersonById } from '../collab/data.js';
import { tkBranchNameError } from '../tasks-v2/git-branch.js';
import {
  mgrAddProject, mgrCanManageProject, mgrMemberRole, mgrRenameError, mgrRenameProject, mgrSetProjectRepo, mgrCurrentPersonId, mgrDeleteProject, mgrProjectById,
  mgrProjectIssues, mgrProjectTasks, mgrProjects, mgrTeam, mgrTeams,
} from './data.js';
import { renderDetail, resetDetailTab } from './detail.js';
import { closeTaskPanel, resetPlanState } from './plan.js';
import { openInvite } from './invite.js';
import { hideSettings, openSettings } from './settings.js';
import { mgrEsc, mgrTag } from './utils.js';
/* 管理 · 项目：管理项目卡片栅格、进入 / 返回项目详情、新建项目弹窗。 */

var openProjectId = null;
var onRouteChange = function () {};

var CARD_CHEVRON = '<svg class="mgr-mcard-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

/* 新建项目模板：选中开发类模板时需要 Git 地址与智能体团队 */
var TEMPLATES = [
  { id: 'blank', name: '空白', goal: '' },
  { id: 'dev', name: '开发项目', dev: true, goal: '' },
  { id: 'budget', name: '预算目标制定', goal: '围绕年度预算目标拆解编制任务，按里程碑推进并沉淀编制产物' },
  { id: 'month', name: '月度经营分析', goal: '按月归集经营数据，输出差异归因与改进建议' },
  { id: 'ceo', name: 'CEO月度会议', goal: '围绕 CEO 月度会议组织议题收集、材料准备与决议跟进' },
  { id: 'adhoc', name: '临时决策会', goal: '为临时性决策快速组织背景调研与方案对比' },
  { id: 'ar', name: '应收改善', goal: '压降应收账期，建立回款跟进机制' },
  { id: 'inv', name: '库存周转优化', goal: '提升库存周转率，清理长龄库存并优化补货参数' },
];
var pickedTemplate = 'blank';
var pickedMembers = [];       /* 新建时额外邀请的成员 { id, admin }；创建人固定为负责人和成员 */

/* ---------- 列表（项目首页：待你处理 + 全部项目） ---------- */
var TODO_PREVIEW = 3;
var todoExpanded = false;
var projectQuery = '';

function ownerAvatar(name) {
  return '<span class="mgr-home-owner-avatar" aria-hidden="true">' + mgrEsc((name || '?')[0]) + '</span>';
}
function cardHtml(p) {
  var tags = p.mgrOk
    ? mgrTag('运行正常', 'done')
    : (p.mgrRisk ? mgrTag(p.mgrRisk + ' 处风险', 'danger') : '') + (p.mgrDecide ? mgrTag(p.mgrDecide + ' 件待决策', 'warning') : '');
  return '<div class="mgr-mcard" data-mgr-project="' + mgrEsc(p.id) + '" role="button" tabindex="0" aria-label="查看项目：' + mgrEsc(p.name) + '">' +
    '<h3 class="mgr-mcard-title">' + mgrEsc(p.name) + '</h3>' +
    '<p class="mgr-mcard-desc">' + mgrEsc(p.desc) + '</p>' +
    '<div class="mgr-mcard-foot"><span class="mgr-mcard-owner">' + ownerAvatar(p.owner) + '<span>' + mgrEsc(p.owner || '未指定') + '</span></span>' +
    '<span class="mgr-mcard-tags">' + tags + '</span></div></div>';
}
/* 项目首页暂时只展示开发类项目（含研发任务），与开发无关的项目不出现在待你处理和全部项目里 */
function homeProjects() { return mgrProjects().filter(function (p) { return p.containsRd; }); }
/* 待你处理：分给我的未完成任务 + 我能管理的项目里待处理的议题 */
function pendingItems() {
  var me = mgrCurrentPersonId();
  var items = [];
  homeProjects().forEach(function (p) {
    mgrProjectIssues(p.id).forEach(function (i) {
      if (i.status === '待处理' && mgrCanManageProject(p)) items.push({ kind: '议题', title: i.title, project: p, meta: i.time || '' });
    });
    if (!me) return;
    mgrProjectTasks(p.id).forEach(function (t) {
      if (t.assignee !== me || t.status === 'done' || t.status === 'cancelled' || t.status === 'in_review') return;
      items.push({ kind: '任务', title: t.title || t.name || '未命名任务', project: p, meta: t.dueDate ? '截止 ' + t.dueDate : '' });
    });
  });
  return items;
}
function renderTodos() {
  var items = pendingItems();
  var shown = todoExpanded ? items : items.slice(0, TODO_PREVIEW);
  $('#mgrTodoCount').textContent = items.length;
  var all = $('#mgrTodoAll');
  all.hidden = items.length <= TODO_PREVIEW;
  all.setAttribute('aria-expanded', String(todoExpanded));
  all.firstChild.textContent = todoExpanded ? '收起 ' : '全部 ';
  $('#mgrTodoList').innerHTML = items.length
    ? shown.map(function (it) {
      return '<button type="button" class="mgr-todo-row" data-mgr-project="' + mgrEsc(it.project.id) + '">' +
        '<span class="mgr-todo-kind">' + it.kind + '</span><span class="mgr-todo-title">' + mgrEsc(it.title) + '</span>' +
        '<span class="mgr-todo-project">' + mgrEsc(it.project.name) + '</span>' +
        (it.meta ? '<span class="mgr-todo-meta">' + mgrEsc(it.meta) + '</span>' : '') + '</button>';
    }).join('')
    : '<div class="mgr-todo-empty"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>暂无待办</div>';
}
function renderList() {
  var all = homeProjects();
  var q = projectQuery.trim().toLocaleLowerCase();
  var list = q ? all.filter(function (p) { return (p.name + ' ' + (p.owner || '')).toLocaleLowerCase().includes(q); }) : all.slice();
  /* 按最近修改时间倒序；没改过的演示项目没有 updatedAt，排在后面并保持原有顺序（sort 稳定） */
  list.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
  $('#mgrHomeCount').textContent = all.length;
  $('#mgrAllCount').textContent = all.length;
  renderTodos();
  $('#mgrProjCards').innerHTML = list.length
    ? list.map(cardHtml).join('')
    : '<div class="mgr-empty">' + (q ? '没有匹配的项目。' : '还没有管理项目，点右上角「＋ 新建项目」创建。') + '</div>';
}
function showList() {
  openProjectId = null;
  hideSettings();
  closeTaskPanel();
  $('#mgrProjDetail').classList.add('hidden');
  $('#mgrProjList').classList.remove('hidden');
  renderList();
  onRouteChange();
}
function openProject(id) {
  var p = mgrProjectById(id);
  if (!p) { toast('未找到该项目'); return false; }
  openProjectId = id;
  hideSettings();
  resetDetailTab(p);
  resetPlanState();
  toggleMoreMenu(false);
  closeTaskPanel();
  $('#mgrProjList').classList.add('hidden');
  $('#mgrProjDetail').classList.remove('hidden');
  $('#mgrProjCrumbName').textContent = p.name;
  renderDetail(p);
  var scroll = $('#mgrProjDetail .mgr-scroll');
  if (scroll) scroll.scrollTop = 0;
  onRouteChange();
  return true;
}

/* ---------- 新建项目弹窗 ---------- */
function currentTemplate() { return TEMPLATES.find(function (t) { return t.id === pickedTemplate; }); }
/* 模板默认只显示前 5 个，其余通过「更多」展开；选中的模板在折叠区时自动展开 */
var TEMPLATE_VISIBLE = 5;
var templatesExpanded = false;
function renderTemplates() {
  var extra = TEMPLATES.slice(TEMPLATE_VISIBLE);
  var open = templatesExpanded || extra.some(function (t) { return t.id === pickedTemplate; });
  var chip = function (t) {
    var on = pickedTemplate === t.id;
    return '<button type="button" class="mgr-pe-tpl' + (on ? ' active' : '') + '" data-mgr-pe-tpl="' + mgrEsc(t.id) + '" role="radio" aria-checked="' + on + '">' + mgrEsc(t.name) + '</button>';
  };
  $('#mgrPeTplChips').innerHTML = TEMPLATES.slice(0, TEMPLATE_VISIBLE).map(chip).join('') +
    (open ? extra.map(chip).join('') : '') +
    (extra.length
      ? '<button type="button" class="mgr-pe-tpl mgr-pe-tpl-more" data-mgr-pe-tpl-more aria-expanded="' + open + '">' + (open ? '收起' : '更多') +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>'
      : '');
}
function syncDevExtra() {
  var tpl = currentTemplate();
  $('#mgrPeDevExtra').hidden = !(tpl && tpl.dev);
  syncSubtabs(!$('#mgrPeGoal').hidden);
  $('#mgrPeRepoError').hidden = true;
  $('#mgrPeBranchError').hidden = true;
  $('#mgrPeTeamError').hidden = true;
}
function pickTemplate(id) {
  var changed = pickedTemplate !== id;
  pickedTemplate = id;
  var tpl = currentTemplate();
  if (changed) $('#mgrPeGoal').value = tpl ? tpl.goal : '';
  renderTemplates();
  syncSubtabs(true);
  syncDevExtra();
  $('#mgrPeName').focus();
}

function syncSubtabs(showGoal) {
  var tpl = currentTemplate();
  var dev = !!(tpl && tpl.dev);
  if (dev) showGoal = true;
  var tabs = $('#mgrProjEditForm .mgr-pe-subtabs');
  tabs.classList.toggle('mgr-pe-subtabs--plain', dev);
  tabs.setAttribute('role', dev ? 'group' : 'tablist');
  $('#mgrPeGoal').hidden = !showGoal;
  $('#mgrPeInstruction').hidden = showGoal;
  document.querySelectorAll('[data-mgr-pe-subtab]').forEach(function (b) {
    b.hidden = dev && b.getAttribute('data-mgr-pe-subtab') === 'instruction';
    var on = (b.getAttribute('data-mgr-pe-subtab') === 'goal') === showGoal;
    b.classList.toggle('active', !dev && on);
    b.disabled = dev;
    if (dev) {
      b.removeAttribute('role');
      b.removeAttribute('aria-selected');
    } else {
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(on));
    }
  });
}
/* ---------- 项目成员（创建人固定；其他人沿用项目详情里的「邀请成员」弹窗添加） ---------- */
function renderMemberChips() {
  var me = cvPersonById(mgrCurrentPersonId());
  $('#mgrPeMemberChips').innerHTML =
    (me ? '<span class="mgr-pe-member-chip is-fixed" title="创建人默认为项目负责人">' + mgrEsc(me.name) + '<small>负责人</small></span>' : '') +
    pickedMembers.map(function (x) { return { m: cvPersonById(x.id), admin: x.admin }; }).filter(function (x) { return x.m; }).map(function (x) {
      return '<span class="mgr-pe-member-chip">' + mgrEsc(x.m.name) + (x.admin ? '<small>项目管理员</small>' : '') +
        '<button type="button" class="mgr-pe-member-remove" data-mgr-pe-member-remove="' + mgrEsc(x.m.id) + '" aria-label="移除成员 ' + mgrEsc(x.m.name) + '">×</button></span>';
    }).join('') +
    '<button type="button" class="mgr-pe-member-add" id="mgrPeMemberAdd" aria-haspopup="dialog">＋ 邀请成员</button>';
}
function inviteForNewProject(trigger) {
  openInvite(null, trigger, {
    taken: function () { return [mgrCurrentPersonId()].concat(pickedMembers.map(function (x) { return x.id; })); },
    onConfirm: function (ids, admin) {
      ids.forEach(function (id) { if (!pickedMembers.some(function (x) { return x.id === id; })) pickedMembers.push({ id: id, admin: admin }); });
      renderMemberChips();
      $('#mgrPeMemberAdd').focus();
    },
  });
}
function selectedBaseBranch() {
  var v = $('#mgrPeBaseBranch').value;
  return (v === '__custom' ? $('#mgrPeBaseBranchCustom').value : v).trim();
}
function openProjectNew() {
  var overlay = $('#mgrProjEditOverlay');
  pickedTemplate = 'blank';
  templatesExpanded = false;
  renderTemplates();
  $('#mgrPeName').value = '';
  $('#mgrPeGoal').value = '';
  $('#mgrPeInstruction').value = '';
  $('#mgrPeRepo').value = '';
  $('#mgrPeBaseBranch').value = 'main';
  $('#mgrPeBaseBranchCustom').value = '';
  $('#mgrPeBaseBranchCustom').hidden = true;
  $('#mgrPeTeam').innerHTML = '<option value="">请选择智能体团队</option>' + mgrTeams().filter(function (t) { return t.preset; }).map(function (t) {
    return '<option value="' + mgrEsc(t.id) + '">' + mgrEsc(t.name) + '</option>';
  }).join('');
  pickedMembers = [];
  renderMemberChips();
  initSelectDropdowns([$('#mgrPeBaseBranch')]);
  $('#mgrPeBaseBranch').dispatchEvent(new Event('change', { bubbles: true }));
  syncSubtabs(true);
  syncDevExtra();
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  $('#mgrPeName').focus();
}
function closeProjectNew() {
  var overlay = $('#mgrProjEditOverlay');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
}
function repoCode(repo, id) {
  var m = String(repo || '').match(/\/([^/]+?)(?:\.git)?\/?$/);
  return (m ? m[1] : id).replace(/[^a-zA-Z0-9-]/g, '-').toUpperCase();
}
function submitProjectNew() {
  var name = $('#mgrPeName').value.trim();
  var goal = $('#mgrPeGoal').value.trim();
  var repo = $('#mgrPeRepo').value.trim();
  var teamId = $('#mgrPeTeam').value;
  var tpl = currentTemplate();
  var dev = !!(tpl && tpl.dev);
  if (!name) { toast('请填写项目名称', 'error'); $('#mgrPeName').focus(); return; }
  if (dev && !mgrTeam(teamId)) {
    $('#mgrPeTeamError').hidden = false;
    toast('开发类项目必须选择智能体团队', 'error');
    $('#mgrPeTeam').focus();
    return;
  }
  $('#mgrPeTeamError').hidden = true;
  if (dev && !repo) {
    $('#mgrPeRepoError').hidden = false;
    toast('开发类项目必须填写 Git 地址', 'error');
    $('#mgrPeRepo').focus();
    return;
  }
  $('#mgrPeRepoError').hidden = true;
  var baseBranch = selectedBaseBranch();
  var branchErr = dev ? tkBranchNameError(baseBranch) : '';
  if (branchErr) {
    var be = $('#mgrPeBranchError');
    be.textContent = branchErr;
    be.hidden = false;
    toast(branchErr, 'error');
    ($('#mgrPeBaseBranchCustom').hidden ? $('#mgrPeBaseBranch').nextElementSibling : $('#mgrPeBaseBranchCustom')).focus();
    return;
  }
  $('#mgrPeBranchError').hidden = true;
  var id = 'proj-' + Date.now();
  var me = mgrCurrentPersonId();
  var project = {
    id: id, name: name, desc: goal || name + '（管理板块创建）', goal: goal,
    instruction: dev ? '' : $('#mgrPeInstruction').value.trim(),
    dot: ['blue', 'orange', 'green'][mgrProjects().length % 3],
    containsRd: dev, space: 'manage',
    defaultTeam: dev ? teamId : '', teamIds: dev && teamId ? [teamId] : [],
    status: 'planned', priority: '中', owner: cvCurrentUserName() || '未指定',
    repo: dev ? repo : '', baseBranch: dev ? baseBranch : '', code: repoCode(repo, id),
    start: '', end: '', milestones: [], members: (me ? [me] : []).concat(pickedMembers.map(function (x) { return x.id; }).filter(function (id) { return id !== me; })), memberRoles: {},
    adminIds: pickedMembers.filter(function (x) { return x.admin && x.id !== me; }).map(function (x) { return x.id; }),
    projectExperts: [], updatedAt: Date.now(),
  };
  /* 岗位按岗位标签默认推断，之后可在「成员与权限」里调整 */
  project.members.forEach(function (id) {
    var person = cvPersonById(id);
    var role = person ? mgrMemberRole(project, person) : '';
    if (role) project.memberRoles[id] = role;
  });
  if (!mgrAddProject(project)) { toast('项目保存失败，请重试', 'error'); return; }
  closeProjectNew();
  toast('已创建项目：' + mgrEsc(name) + (tpl ? '（' + mgrEsc(tpl.name) + '）' : ''), 'success');
  if (!openProjectId) renderList();
}

function initProjectNewModal() {
  var overlay = $('#mgrProjEditOverlay');
  overlay.addEventListener('click', function (e) {
    var t = e.target;
    if (t === overlay || t.closest('[data-mgr-projedit-close]')) { closeProjectNew(); return; }
    var memberRm = t.closest('[data-mgr-pe-member-remove]');
    if (memberRm) {
      var rmId = memberRm.getAttribute('data-mgr-pe-member-remove');
      pickedMembers = pickedMembers.filter(function (x) { return x.id !== rmId; });
      renderMemberChips();
      return;
    }
    if (t.closest('#mgrPeMemberAdd')) { inviteForNewProject(t.closest('#mgrPeMemberAdd')); return; }
    if (t.closest('[data-mgr-pe-tpl-more]')) { templatesExpanded = !templatesExpanded; renderTemplates(); return; }
    var tplBtn = t.closest('[data-mgr-pe-tpl]');
    if (tplBtn) { pickTemplate(tplBtn.getAttribute('data-mgr-pe-tpl')); return; }
    var sub = t.closest('[data-mgr-pe-subtab]');
    if (sub) { syncSubtabs(sub.getAttribute('data-mgr-pe-subtab') === 'goal'); return; }
  });
  overlay.addEventListener('input', function (e) {
    if (e.target.id === 'mgrPeBaseBranchCustom') $('#mgrPeBranchError').hidden = true;
  });
  overlay.addEventListener('change', function (e) {
    if (e.target.id === 'mgrPeTeam') $('#mgrPeTeamError').hidden = true;
    if (e.target.id === 'mgrPeBaseBranch') {
      var custom = $('#mgrPeBaseBranchCustom');
      custom.hidden = e.target.value !== '__custom';
      $('#mgrPeBranchError').hidden = true;
      if (!custom.hidden) custom.focus();
    }
  });
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.stopPropagation(); closeProjectNew(); }
  });
  $('#mgrPeSubmit').addEventListener('click', submitProjectNew);
}

/* ---------- 删除项目 ----------
   仅负责人（或系统管理员）可删；不校验项目下已有任务，删除时任务一并清理。 */
var pendingDelete = null;

function toggleMoreMenu(open) {
  var btn = $('[data-mgr-proj-more]');
  var menu = $('#mgrProjDetail .mgr-proj-more-menu');
  if (!btn || !menu) return;
  var show = open === undefined ? menu.hidden : open;
  menu.hidden = !show;
  btn.setAttribute('aria-expanded', String(show));
}
function deleteBlockReason(p) {
  if (!mgrCanManageProject(p)) return '只有项目负责人或系统管理员可以删除项目';
  return '';
}
function requestDelete(trigger) {
  var p = mgrProjectById(openProjectId);
  if (!p) return;
  var reason = deleteBlockReason(p);
  if (reason) { toast(reason, 'warning'); return; }
  pendingDelete = { projectId: p.id, trigger: trigger || null };
  $('#mgrProjDeleteMessage').textContent = '删除「' + p.name + '」后不可恢复，项目下的任务（' + mgrProjectTasks(p.id).length + ' 项）和议题会一并删除，确定删除？';
  var overlay = $('#mgrProjDeleteOverlay');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  overlay.querySelector('[data-mgr-delete-cancel]').focus();
}
function closeDelete(restoreFocus) {
  var overlay = $('#mgrProjDeleteOverlay');
  var trigger = pendingDelete && pendingDelete.trigger;
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  pendingDelete = null;
  if (restoreFocus !== false && trigger && trigger.isConnected) trigger.focus();
}
function confirmDelete() {
  if (!pendingDelete) return;
  var p = mgrProjectById(pendingDelete.projectId);
  if (!p) { closeDelete(false); toast('项目已不存在', 'warning'); showList(); return; }
  /* 弹窗打开期间任务或权限可能已变化，确认时再查一次 */
  if (deleteBlockReason(p)) { closeDelete(false); toast('项目权限已变化，请重新检查', 'warning'); return; }
  if (!mgrDeleteProject(p.id)) { toast('删除失败，请重试', 'error'); return; }
  closeDelete(false);
  showList();
  toast('项目已删除', 'success');
}
/* ---------- 重命名项目 ---------- */
var renameTrigger = null;
function requestRename(trigger) {
  var p = mgrProjectById(openProjectId);
  if (!p) return;
  if (!mgrCanManageProject(p)) { toast('只有项目负责人或系统管理员可以重命名项目', 'warning'); return; }
  renameTrigger = trigger || null;
  var input = $('#mgrProjRenameInput');
  input.value = p.name;
  setRenameError('');
  var overlay = $('#mgrProjRenameOverlay');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  input.focus();
  input.select();
}
function setRenameError(msg) {
  var err = $('#mgrProjRenameError');
  err.textContent = msg;
  err.hidden = !msg;
  $('#mgrProjRenameInput').setAttribute('aria-invalid', String(!!msg));
}
function closeRename(restoreFocus) {
  var overlay = $('#mgrProjRenameOverlay');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  if (restoreFocus !== false && renameTrigger && renameTrigger.isConnected) renameTrigger.focus();
  renameTrigger = null;
}
function confirmRename() {
  var p = mgrProjectById(openProjectId);
  if (!p) { closeRename(false); toast('项目已不存在', 'warning'); return; }
  var name = $('#mgrProjRenameInput').value;
  if (name.trim() === p.name) { closeRename(); return; }
  var err = mgrRenameError(p, name);
  if (err) { setRenameError(err); $('#mgrProjRenameInput').focus(); return; }
  if (!mgrRenameProject(p, name)) { setRenameError('保存失败，请重试'); return; }
  $('#mgrProjCrumbName').textContent = p.name;
  closeRename();
  toast('项目已重命名', 'success');
}
function initProjectRename() {
  var overlay = $('#mgrProjRenameOverlay');
  overlay.addEventListener('click', function (e) {
    if (e.target.closest('[data-mgr-rename-confirm]')) { confirmRename(); return; }
    if (e.target === overlay || e.target.closest('[data-mgr-rename-cancel]')) closeRename();
  });
  overlay.addEventListener('input', function (e) { if (e.target.id === 'mgrProjRenameInput') setRenameError(''); });
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeRename(); return; }
    if (e.key === 'Enter' && e.target.id === 'mgrProjRenameInput' && !e.isComposing) { e.preventDefault(); confirmRename(); }
  });
}

/* ---------- 项目设置 · 代码仓库 ---------- */
var BASE_PRESETS = ['main', 'master', 'develop'];
var repoTrigger = null;
function setRepoError(msg) {
  var el = $('#mgrRepoError');
  el.textContent = msg;
  el.hidden = !msg;
}
function syncRepoCustom() {
  var custom = $('#mgrRepoBaseCustom');
  custom.hidden = $('#mgrRepoBase').value !== '__custom';
  return custom;
}
function openRepoSettings(trigger) {
  var p = mgrProjectById(openProjectId);
  if (!p) return;
  if (!mgrCanManageProject(p)) { toast('只有项目负责人或系统管理员可以修改项目设置', 'warning'); return; }
  repoTrigger = trigger || null;
  $('#mgrRepoUrl').value = p.repo || '';
  var base = p.baseBranch || 'main';
  var preset = BASE_PRESETS.includes(base);
  $('#mgrRepoBase').value = preset ? base : '__custom';
  $('#mgrRepoBaseCustom').value = preset ? '' : base;
  syncRepoCustom();
  $('#mgrRepoUrlRequired').hidden = !p.containsRd;
  setRepoError('');
  var overlay = $('#mgrProjRepoOverlay');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  $('#mgrRepoUrl').focus();
}
function closeRepoSettings(restoreFocus) {
  var overlay = $('#mgrProjRepoOverlay');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  if (restoreFocus !== false && repoTrigger && repoTrigger.isConnected) repoTrigger.focus();
  repoTrigger = null;
}
function saveRepoSettings() {
  var p = mgrProjectById(openProjectId);
  if (!p) { closeRepoSettings(false); toast('项目已不存在', 'warning'); return; }
  var repo = $('#mgrRepoUrl').value.trim();
  var baseSel = $('#mgrRepoBase').value;
  var base = (baseSel === '__custom' ? $('#mgrRepoBaseCustom').value : baseSel).trim();
  if (!repo && p.containsRd) { setRepoError('包含研发任务的项目必须填写 Git 地址'); $('#mgrRepoUrl').focus(); return; }
  var err = repo ? tkBranchNameError(base) : '';
  if (err) { setRepoError(err); (baseSel === '__custom' ? $('#mgrRepoBaseCustom') : $('#mgrRepoBase')).focus(); return; }
  if (!mgrSetProjectRepo(p, repo, base)) { setRepoError('保存失败，请重试'); return; }
  closeRepoSettings();
  toast(repo ? '代码仓库已保存，基准分支：' + mgrEsc(base) : '已清除代码仓库', 'success');
}
function initRepoSettings() {
  var overlay = $('#mgrProjRepoOverlay');
  overlay.addEventListener('click', function (e) {
    if (e.target.closest('[data-mgr-repo-confirm]')) { saveRepoSettings(); return; }
    if (e.target === overlay || e.target.closest('[data-mgr-repo-cancel]')) closeRepoSettings();
  });
  overlay.addEventListener('change', function (e) {
    if (e.target.id !== 'mgrRepoBase') return;
    setRepoError('');
    var custom = syncRepoCustom();
    if (!custom.hidden) custom.focus();
  });
  overlay.addEventListener('input', function () { setRepoError(''); });
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeRepoSettings(); return; }
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !e.isComposing) { e.preventDefault(); saveRepoSettings(); }
  });
}

function initProjectDelete() {
  var overlay = $('#mgrProjDeleteOverlay');
  overlay.addEventListener('click', function (e) {
    if (e.target.closest('[data-mgr-delete-confirm]')) { confirmDelete(); return; }
    if (e.target === overlay || e.target.closest('[data-mgr-delete-cancel]')) closeDelete();
  });
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDelete(); return; }
    if (e.key !== 'Tab') return;
    var cancel = overlay.querySelector('[data-mgr-delete-cancel]');
    var ok = overlay.querySelector('[data-mgr-delete-confirm]');
    if (e.shiftKey && document.activeElement === cancel) { e.preventDefault(); ok.focus(); }
    else if (!e.shiftKey && document.activeElement === ok) { e.preventDefault(); cancel.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#mgrProjDetail .mgr-proj-more')) toggleMoreMenu(false);
  });
}

export function initManagerProjects(routeChanged) {
  if (routeChanged) onRouteChange = routeChanged;
  initProjectNewModal();
  initProjectDelete();
  initProjectRename();
  initRepoSettings();
  var panel = $('#mgr-panel-projects');
  panel.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-mgr-proj-back]')) { showList(); return; }
    if (t.closest('#mgrProjNew')) { openProjectNew(); return; }
    if (t.closest('[data-mgr-proj-more]')) { toggleMoreMenu(); return; }
    if (t.closest('[data-mgr-settings]')) { openSettings(openProjectId); return; }
    var repoEdit = t.closest('[data-mgr-repo-edit]');
    if (repoEdit) { openRepoSettings(repoEdit); return; }
    if (t.closest('[data-mgr-proj-rename]')) { toggleMoreMenu(false); requestRename($('[data-mgr-proj-more]')); return; }
    var del = t.closest('[data-mgr-proj-delete]');
    if (del) { toggleMoreMenu(false); requestDelete($('[data-mgr-proj-more]')); return; }
    if (t.closest('#mgrListAskSend')) {
      var input = $('#mgrListAskInput');
      var q = input.value.trim();
      if (!q) { toast('先输入想问的问题'); return; }
      input.value = '';
      toast('已收到提问（演示）：「' + mgrEsc(q) + '」，AI 会基于项目上下文作答');
      return;
    }
    if (t.closest('#mgrTodoAll')) { todoExpanded = !todoExpanded; renderTodos(); return; }
    var card = t.closest('#mgrProjList [data-mgr-project]');
    if (card) openProject(card.getAttribute('data-mgr-project'));
  });
  panel.addEventListener('input', function (e) {
    if (e.target.id !== 'mgrProjSearch') return;
    projectQuery = e.target.value;
    renderList();
  });
  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && e.target.closest && e.target.closest('#mgrProjDetail .mgr-proj-more')) {
      toggleMoreMenu(false);
      $('[data-mgr-proj-more]').focus();
      return;
    }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.id === 'mgrListAskInput') {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#mgrListAskSend').click(); }
      return;
    }
    var card = e.target.closest && e.target.closest('#mgrProjCards [data-mgr-project]');
    if (card && card === e.target) { e.preventDefault(); openProject(card.getAttribute('data-mgr-project')); }
  });
  renderList();
}

function openProjectId_() { return openProjectId; }

export { openProject, openProjectId_ as currentProjectId, openProjectNew, showList };
