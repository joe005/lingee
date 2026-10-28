import { initSelectDropdowns } from '../../core/select-dropdown.js';
import { $ } from '../../core/dom.js';
import { gitRepoUrlError } from '../../core/git-url.js';
import { toast } from '../../core/toast.js';
import { cvCurrentUserName, cvPersonById } from '../collab/data.js';
import { tkBranchNameError } from '../tasks-v2/git-branch.js';
import {
  mgrAddProject, mgrCanManageProject, mgrMemberRole, mgrRenameError, mgrRenameProject, mgrSetProjectRepo, mgrCurrentPersonId, mgrDeleteProject, mgrProjectById,
  mgrProjectTasks, mgrProjects, mgrSpaceTeamId, mgrTeam, mgrTeams,
} from './data.js';
import { renderDetail, resetDetailTab } from './detail.js';
import { closeTaskPanel, openTaskNew, resetPlanState } from './plan.js';
import { hideSettings, openSettings } from './settings.js';
import { hideSubPage } from './space-pages.js';
import { mgrEsc } from './utils.js';
/* 管理 · 空间（对齐产品）：空间卡片栅格与搜索、进入 / 返回空间详情、新建空间弹窗、底部对话创建任务。 */

var openProjectId = null;
var onRouteChange = function () {};

/* 新建空间模板：通用模板填目标 / 空间指令和智能体团队；「协作开发」是开发空间，填空间目标（预填）与 Git 地址 */
var TEMPLATES = [
  { id: 'blank', name: '空白', goal: '' },
  { id: 'exec', name: '管理例会', goal: '围绕高管会议组织议题收集、材料准备与决议跟进' },
  { id: 'budget', name: '预算目标', goal: '围绕年度预算目标拆解编制任务，按里程碑推进并沉淀编制产物' },
  { id: 'talent', name: '人才布局', goal: '盘点关键岗位与人才梯队，形成招聘与培养计划' },
  { id: 'devtest', name: '协作开发', goal: '完成研发项目的需求交付与上线', dev: true },
];
var pickedTemplate = 'blank';
var pickedTeams = [];         /* 新建空间时添加的智能体团队 ID */

/* ---------- 列表（空间首页：空间卡片栅格） ---------- */
var projectQuery = '';

function ownerAvatar(name) {
  return '<span class="mgr-home-owner-avatar" aria-hidden="true">' + mgrEsc((name || '?')[0]) + '</span>';
}
function cardHtml(p) {
  return '<div class="mgr-mcard" data-mgr-project="' + mgrEsc(p.id) + '" role="button" tabindex="0" aria-label="进入空间：' + mgrEsc(p.name) + '">' +
    '<h3 class="mgr-mcard-title">' + mgrEsc(p.name) + '</h3>' +
    '<p class="mgr-mcard-desc">' + mgrEsc((p.goal || p.desc || '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '').trim()) + '</p>' +
    '<div class="mgr-mcard-foot"><span class="mgr-mcard-owner">' + ownerAvatar(p.owner) + '<span>' + mgrEsc(p.owner || '未指定') + '</span></span></div></div>';
}
/* 空间首页暂时只展示开发类空间（含研发任务）；非开发类的预置演示空间不出现，但用户自己新建的空间（含空白类）都要显示，否则创建后看不到 */
function homeProjects() { return mgrProjects().filter(function (p) { return p.containsRd || p.custom; }); }
function renderList() {
  var all = homeProjects();
  var q = projectQuery.trim().toLocaleLowerCase();
  var list = q ? all.filter(function (p) { return (p.name + ' ' + (p.owner || '')).toLocaleLowerCase().includes(q); }) : all.slice();
  /* 按最近修改时间倒序；没改过的演示空间没有 updatedAt，排在后面并保持原有顺序（sort 稳定） */
  list.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
  $('#mgrProjCards').innerHTML = list.length
    ? list.map(cardHtml).join('')
    : '<div class="mgr-empty">' + (q ? '没有匹配的空间。' : '还没有空间，点右上角「新建空间」创建。') + '</div>';
  renderAskSpaces();
}
function showList() {
  openProjectId = null;
  hideSettings();
  hideSubPage();
  closeTaskPanel();
  $('#mgrProjDetail').classList.add('hidden');
  $('#mgrProjList').classList.remove('hidden');
  renderList();
  onRouteChange();
}
function openProject(id) {
  var p = mgrProjectById(id);
  if (!p) { toast('未找到该空间'); return false; }
  openProjectId = id;
  hideSettings();
  hideSubPage();
  resetDetailTab(p);
  resetPlanState();
  toggleMoreMenu(false);
  closeTaskPanel();
  $('#mgrProjList').classList.add('hidden');
  $('#mgrProjDetail').classList.remove('hidden');
  renderDetail(p);
  var scroll = $('#mgrProjDetail .mgr-scroll');
  if (scroll) scroll.scrollTop = 0;
  onRouteChange();
  return true;
}

/* ---------- 底部对话：描述想创建的任务，AI 拆解规划（原型：打开带入内容的新建任务弹窗） ---------- */
var askSpaceId = '';
function renderAskSpaces() {
  var menu = $('#mgrAskSpaceMenu');
  if (!menu) return;
  menu.innerHTML = homeProjects().map(function (p) {
    var on = p.id === askSpaceId;
    return '<button type="button" class="mgr-ask-space-option' + (on ? ' is-on' : '') + '" role="option" aria-selected="' + on + '" data-mgr-ask-space="' + mgrEsc(p.id) + '">' + mgrEsc(p.name) + '</button>';
  }).join('') || '<div class="mgr-ask-space-empty">还没有空间</div>';
  var picked = askSpaceId ? mgrProjectById(askSpaceId) : null;
  if (!picked) askSpaceId = '';
  $('#mgrAskSpaceLabel').textContent = picked ? picked.name : '选择空间';
}
function toggleAskSpaces(open) {
  var menu = $('#mgrAskSpaceMenu');
  var btn = $('#mgrAskSpaceBtn');
  if (!menu || !btn) return;
  var show = open === undefined ? menu.hidden : open;
  menu.hidden = !show;
  btn.setAttribute('aria-expanded', String(show));
}
/* 第一句（冒号前）作任务名（不超过 30 字），全文作任务描述 */
function draftFrom(text, project) {
  var first = text.split(/[\n。！？!?；;：:]/).map(function (x) { return x.trim(); }).filter(Boolean)[0] || text;
  return { title: first.length > 30 ? first.slice(0, 30) : first, desc: text, teamId: mgrSpaceTeamId(project) };
}
function createTaskFromAsk(project, input) {
  var text = input.value.trim();
  if (!text) { toast('先描述你想创建的任务'); input.focus(); return; }
  input.value = '';
  openTaskNew(null, { kind: project.containsRd ? 'rd' : 'general', project: project, draft: draftFrom(text, project) });
}

/* ---------- 新建空间弹窗 ---------- */
function currentTemplate() { return TEMPLATES.find(function (t) { return t.id === pickedTemplate; }) || TEMPLATES[0]; }
function isDevKind() { return !!currentTemplate().dev; }
function renderTemplates() {
  $('#mgrPeTplChips').innerHTML = TEMPLATES.map(function (t) {
    var on = pickedTemplate === t.id;
    return '<button type="button" class="mgr-pe-tpl' + (on ? ' active' : '') + '" data-mgr-pe-tpl="' + mgrEsc(t.id) + '" role="radio" aria-checked="' + on + '">' + mgrEsc(t.name) + '</button>';
  }).join('');
}
function pickTemplate(id) {
  if (pickedTemplate === id) return;
  pickedTemplate = id;
  $('#mgrPeGoal').value = currentTemplate().goal;
  renderTemplates();
  syncKind(true);
  $('#mgrPeName').focus();
}
/* 开发空间：目标改为「空间目标」普通标签，隐藏空间指令与智能体团队，显示 Git 地址；通用空间恢复「目标 / 空间指令」页签 */
function syncKind(showGoal) {
  var dev = isDevKind();
  if (dev) showGoal = true;
  var tabs = $('#mgrProjEditForm .mgr-pe-subtabs');
  tabs.classList.toggle('mgr-pe-subtabs--plain', dev);
  tabs.setAttribute('role', dev ? 'group' : 'tablist');
  $('#mgrPeGoal').hidden = !showGoal;
  $('#mgrPeGoal').placeholder = '为什么建立这个空间，需要达成什么经营结果';
  $('#mgrPeInstruction').hidden = showGoal;
  document.querySelectorAll('[data-mgr-pe-subtab]').forEach(function (b) {
    var isGoal = b.getAttribute('data-mgr-pe-subtab') === 'goal';
    b.hidden = dev && !isGoal;
    if (isGoal) b.innerHTML = (dev ? '空间目标' : '目标') + ' <b aria-hidden="true">*</b>';
    var on = isGoal === showGoal;
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
  $('#mgrPeDevExtra').hidden = !dev;
  $('#mgrPeTeamField').hidden = dev;
  $('#mgrPeRepoError').hidden = true;
  $('#mgrPeBranchError').hidden = true;
}
/* ---------- 智能体团队（通用空间） ---------- */
function renderTeamChips() {
  $('#mgrPeTeamChips').innerHTML = pickedTeams.map(function (id) { return mgrTeam(id); }).filter(Boolean).map(function (t) {
    return '<span class="mgr-pe-member-chip">' + mgrEsc(t.name) +
      '<button type="button" class="mgr-pe-member-remove" data-mgr-pe-team-remove="' + mgrEsc(t.id) + '" aria-label="移除智能体团队 ' + mgrEsc(t.name) + '">×</button></span>';
  }).join('');
}
function toggleTeamPop(open) {
  var pop = $('#mgrPeTeamPop');
  var show = open === undefined ? pop.hidden : open;
  if (show) {
    var list = mgrTeams().filter(function (t) { return pickedTeams.indexOf(t.id) < 0; });
    pop.innerHTML = list.length
      ? list.map(function (t) { return '<button type="button" class="mgr-pe-team-option" role="option" data-mgr-pe-team-pick="' + mgrEsc(t.id) + '">' + mgrEsc(t.name) + '</button>'; }).join('')
      : '<p class="mgr-tn-sub-empty">智能体团队都已添加</p>';
  }
  pop.hidden = !show;
  $('#mgrPeTeamAdd').setAttribute('aria-expanded', String(show));
}
function selectedBaseBranch() {
  var v = $('#mgrPeBaseBranch').value;
  return (v === '__custom' ? $('#mgrPeBaseBranchCustom').value : v).trim();
}
function openProjectNew() {
  var overlay = $('#mgrProjEditOverlay');
  pickedTemplate = 'blank';
  pickedTeams = [];
  renderTemplates();
  renderTeamChips();
  toggleTeamPop(false);
  $('#mgrPeName').value = '';
  $('#mgrPeGoal').value = '';
  $('#mgrPeInstruction').value = '';
  $('#mgrPeRepo').value = '';
  $('#mgrPeRepo').removeAttribute('aria-invalid');
  $('#mgrPeBaseBranch').value = 'main';
  $('#mgrPeBaseBranchCustom').value = '';
  $('#mgrPeBaseBranchCustom').hidden = true;
  initSelectDropdowns([$('#mgrPeBaseBranch')]);
  $('#mgrPeBaseBranch').dispatchEvent(new Event('change', { bubbles: true }));
  syncKind(true);
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
  var tpl = currentTemplate();
  var dev = isDevKind();
  if (!name) { toast('请填写空间名称', 'error'); $('#mgrPeName').focus(); return; }
  if (!goal) {
    toast(dev ? '请填写空间目标' : '请填写目标', 'error');
    syncKind(true);
    $('#mgrPeGoal').focus();
    return;
  }
  /* Git 地址只做静态校验（Manage 所在环境可能连不上代码平台），能否连通由 Build 客户端检测 */
  var repoErr = dev ? (repo ? gitRepoUrlError(repo) : '请填写 Git 地址') : '';
  if (repoErr) {
    $('#mgrPeRepoError').textContent = repoErr;
    $('#mgrPeRepoError').hidden = false;
    $('#mgrPeRepo').setAttribute('aria-invalid', 'true');
    toast(repo ? 'Git 地址格式不正确' : '请填写 Git 地址', 'error');
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
    id: id, name: name, desc: goal, goal: goal,
    instruction: dev ? '' : $('#mgrPeInstruction').value.trim(),
    dot: ['blue', 'orange', 'green'][mgrProjects().length % 3],
    containsRd: dev, space: 'manage', template: tpl.id,
    status: 'planned', priority: '中', owner: cvCurrentUserName() || '未指定',
    repo: dev ? repo : '', baseBranch: dev ? baseBranch : '', code: repoCode(repo, id),
    start: '', end: '', milestones: [], members: me ? [me] : [], memberRoles: {}, adminIds: [],
    teamIds: dev ? [] : pickedTeams.slice(), projectExperts: [], updatedAt: Date.now(),
  };
  /* 岗位按岗位标签默认推断，之后可在「成员与权限」里调整 */
  project.members.forEach(function (pid) {
    var person = cvPersonById(pid);
    var role = person ? mgrMemberRole(project, person) : '';
    if (role) project.memberRoles[pid] = role;
  });
  if (!mgrAddProject(project)) { toast('空间保存失败，请重试', 'error'); return; }
  closeProjectNew();
  toast('已创建空间：' + mgrEsc(name), 'success');
  if (!openProjectId) renderList();
}

function initProjectNewModal() {
  var overlay = $('#mgrProjEditOverlay');
  overlay.addEventListener('click', function (e) {
    var t = e.target;
    if (t === overlay || t.closest('[data-mgr-projedit-close]')) { closeProjectNew(); return; }
    var teamRm = t.closest('[data-mgr-pe-team-remove]');
    if (teamRm) {
      var rmId = teamRm.getAttribute('data-mgr-pe-team-remove');
      pickedTeams = pickedTeams.filter(function (x) { return x !== rmId; });
      renderTeamChips();
      return;
    }
    var teamPick = t.closest('[data-mgr-pe-team-pick]');
    if (teamPick) {
      pickedTeams.push(teamPick.getAttribute('data-mgr-pe-team-pick'));
      renderTeamChips();
      toggleTeamPop(false);
      $('#mgrPeTeamAdd').focus();
      return;
    }
    if (t.closest('#mgrPeTeamAdd')) { toggleTeamPop(); return; }
    if (!t.closest('#mgrPeTeamPop')) toggleTeamPop(false);
    var tplBtn = t.closest('[data-mgr-pe-tpl]');
    if (tplBtn) { pickTemplate(tplBtn.getAttribute('data-mgr-pe-tpl')); return; }
    var sub = t.closest('[data-mgr-pe-subtab]');
    if (sub) { syncKind(sub.getAttribute('data-mgr-pe-subtab') === 'goal'); return; }
  });
  overlay.addEventListener('input', function (e) {
    if (e.target.id === 'mgrPeBaseBranchCustom') $('#mgrPeBranchError').hidden = true;
    if (e.target.id === 'mgrPeRepo') { $('#mgrPeRepoError').hidden = true; e.target.removeAttribute('aria-invalid'); }
  });
  /* 离开 Git 地址输入框时就提示格式问题，不等到点「创建」 */
  $('#mgrPeRepo').addEventListener('blur', function (e) {
    var err = gitRepoUrlError(e.target.value);
    if (!err) return;
    $('#mgrPeRepoError').textContent = err;
    $('#mgrPeRepoError').hidden = false;
    e.target.setAttribute('aria-invalid', 'true');
  });
  overlay.addEventListener('change', function (e) {
    if (e.target.id === 'mgrPeBaseBranch') {
      var custom = $('#mgrPeBaseBranchCustom');
      custom.hidden = e.target.value !== '__custom';
      $('#mgrPeBranchError').hidden = true;
      if (!custom.hidden) custom.focus();
    }
  });
  overlay.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    if (!$('#mgrPeTeamPop').hidden) { toggleTeamPop(false); $('#mgrPeTeamAdd').focus(); return; }
    closeProjectNew();
  });
  $('#mgrPeSubmit').addEventListener('click', submitProjectNew);
}

/* ---------- 删除空间 ----------
   仅负责人（或系统管理员）可删；不校验空间下已有任务，删除时任务一并清理。 */
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
  if (!mgrCanManageProject(p)) return '只有空间负责人或系统管理员可以删除空间';
  return '';
}
function requestDelete(trigger) {
  var p = mgrProjectById(openProjectId);
  if (!p) return;
  var reason = deleteBlockReason(p);
  if (reason) { toast(reason, 'warning'); return; }
  pendingDelete = { projectId: p.id, trigger: trigger || null };
  $('#mgrProjDeleteMessage').textContent = '删除「' + p.name + '」后不可恢复，空间下的任务（' + mgrProjectTasks(p.id).length + ' 项）和议题会一并删除，确定删除？';
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
  if (!p) { closeDelete(false); toast('空间已不存在', 'warning'); showList(); return; }
  /* 弹窗打开期间任务或权限可能已变化，确认时再查一次 */
  if (deleteBlockReason(p)) { closeDelete(false); toast('空间权限已变化，请重新检查', 'warning'); return; }
  if (!mgrDeleteProject(p.id)) { toast('删除失败，请重试', 'error'); return; }
  closeDelete(false);
  showList();
  toast('空间已删除', 'success');
}
/* ---------- 重命名空间 ---------- */
var renameTrigger = null;
function requestRename(trigger) {
  var p = mgrProjectById(openProjectId);
  if (!p) return;
  if (!mgrCanManageProject(p)) { toast('只有空间负责人或系统管理员可以重命名空间', 'warning'); return; }
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
  if (!p) { closeRename(false); toast('空间已不存在', 'warning'); return; }
  var name = $('#mgrProjRenameInput').value;
  if (name.trim() === p.name) { closeRename(); return; }
  var err = mgrRenameError(p, name);
  if (err) { setRenameError(err); $('#mgrProjRenameInput').focus(); return; }
  if (!mgrRenameProject(p, name)) { setRenameError('保存失败，请重试'); return; }
  closeRename();
  toast('空间已重命名', 'success');
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

/* ---------- 空间设置 · 代码仓库 ---------- */
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
  if (!mgrCanManageProject(p)) { toast('只有空间负责人或系统管理员可以修改空间设置', 'warning'); return; }
  repoTrigger = trigger || null;
  $('#mgrRepoUrl').value = p.repo || '';
  var base = p.baseBranch || 'main';
  var preset = BASE_PRESETS.includes(base);
  $('#mgrRepoBase').value = preset ? base : '__custom';
  $('#mgrRepoBaseCustom').value = preset ? '' : base;
  syncRepoCustom();
  $('#mgrRepoUrlRequired').hidden = !p.containsRd;
  setRepoError('');
  $('#mgrRepoUrl').removeAttribute('aria-invalid');
  var overlay = $('#mgrProjRepoOverlay');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  initSelectDropdowns([$('#mgrRepoBase')]);
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
  if (!p) { closeRepoSettings(false); toast('空间已不存在', 'warning'); return; }
  var repo = $('#mgrRepoUrl').value.trim();
  var baseSel = $('#mgrRepoBase').value;
  var base = (baseSel === '__custom' ? $('#mgrRepoBaseCustom').value : baseSel).trim();
  if (!repo && p.containsRd) { setRepoError('包含研发任务的空间必须填写 Git 地址'); $('#mgrRepoUrl').focus(); return; }
  var urlErr = gitRepoUrlError(repo);
  if (urlErr) { setRepoError(urlErr); $('#mgrRepoUrl').setAttribute('aria-invalid', 'true'); $('#mgrRepoUrl').focus(); return; }
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
  overlay.addEventListener('input', function () { setRepoError(''); $('#mgrRepoUrl').removeAttribute('aria-invalid'); });
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
    if (t.closest('#mgrAskSpaceBtn')) { toggleAskSpaces(); return; }
    var spaceOpt = t.closest('[data-mgr-ask-space]');
    if (spaceOpt) {
      askSpaceId = spaceOpt.getAttribute('data-mgr-ask-space');
      renderAskSpaces();
      toggleAskSpaces(false);
      $('#mgrListAskInput').focus();
      return;
    }
    if (!t.closest('.mgr-ask-space')) toggleAskSpaces(false);
    if (t.closest('[data-mgr-ask-voice]')) { toast('语音输入暂未接入，请输入任务描述'); return; }
    if (t.closest('[data-mgr-ask-expert]')) { toast('选择专家（演示）：默认由灵基按任务内容匹配'); return; }
    if (t.closest('#mgrListAskSend')) {
      var picked = askSpaceId ? mgrProjectById(askSpaceId) : null;
      if (!picked) { toast('请先选择空间', 'warning'); toggleAskSpaces(true); return; }
      var input = $('#mgrListAskInput');
      if (!input.value.trim()) { toast('先描述你想创建的任务'); input.focus(); return; }
      openProject(picked.id);
      createTaskFromAsk(picked, input);
      return;
    }
    if (t.closest('#mgrPdAskSend')) {
      var cur = mgrProjectById(openProjectId);
      if (cur) createTaskFromAsk(cur, $('#mgrPdAskInput'));
      return;
    }
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
    if (e.key === 'Escape' && e.target.closest && e.target.closest('.mgr-ask-space') && !$('#mgrAskSpaceMenu').hidden) {
      toggleAskSpaces(false);
      $('#mgrAskSpaceBtn').focus();
      return;
    }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target.id === 'mgrListAskInput' || e.target.id === 'mgrPdAskInput') {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $(e.target.id === 'mgrListAskInput' ? '#mgrListAskSend' : '#mgrPdAskSend').click(); }
      return;
    }
    var card = e.target.closest && e.target.closest('#mgrProjCards [data-mgr-project]');
    if (card && card === e.target) { e.preventDefault(); openProject(card.getAttribute('data-mgr-project')); }
  });
  renderList();
}

function openProjectId_() { return openProjectId; }

export { openProject, openProjectId_ as currentProjectId, openProjectNew, showList };
