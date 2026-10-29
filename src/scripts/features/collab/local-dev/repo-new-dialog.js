import { $ } from '../../../core/dom.js';
import { gitRepoUrlError } from '../../../core/git-url.js';
import { toast } from '../../../core/toast.js';
import { tkBranchNameError } from '../../tasks-v2/git-branch.js';
import { tkCurrentUserId, tkGetPerson, tkProjectById, tkProjectsForCurrentUser } from '../../tasks-v2/data.js';
import { LD_WORKSPACE_ROOT, ldAdoptLocalCred, ldAuthFor, ldAuthUser, ldBindDir, ldCheckDir, ldDefaultPath, ldEsc, ldFindLocalCred, ldHide, ldMarkInitialized, ldMine, ldProjectStatus, ldPushIssueText, ldRecordChecks, ldRefresh, ldRemoteKey, ldRepoInfo, ldShow, ldVisible } from './core.js';
import { ldOpenAuth } from './auth-dialog.js';

/* 本地开发 · 新建空间弹窗（#ldRepoOverlay）。设置页入口暂时隐藏，新建任务的空间下拉通过 lingee:repo-project-new 打开。 */
var repoCheck = null;
var repoCheckTimer = 0;
var repoDirMode = 'auto';
var repoDirPath = '';
var repoOnCreated = null;
var repoProgress = 0;
var repoRun = 0;
/* ---------- 新建空间 ----------
   格式与 Manage「新建空间」的开发空间（协作开发）一致：空间名称、空间目标（预填）、Git 地址 + 基准分支，另选本机目录。
   Git 地址粘贴后自动检查（停止输入 0.5 秒、回车或离开输入框时）：
   1. 格式：一期只支持 HTTPS 地址，主机要像域名、要有仓库路径；
   2. 账号：这个平台没登录时先用本机凭据，没有就请用户登录，登录后自动重新检查；
   3. 连通：正式实现用这个账号的凭据跑 git ls-remote --symref <地址> HEAD（同时拿到默认分支）；能读只说明仓库可读，
      推送权限另用 git push --dry-run 校验（见 ldPushCheck）。区分连不上（网络 / 内网 / VPN）、仓库不存在或无权访问、能读但不能推送。
   基准分支检查前为 main / master / develop / 其他，检查通过后换成仓库里的分支并选中默认分支；名称没填时取仓库名，
   目标还是预填内容时换成仓库描述。创建：
   - 地址已是我的空间：直接使用该空间；
   - 否则通过 Manage 接口新建开发空间（负责人为本人），再初始化到所选本机目录。成员、里程碑在 Manage 空间详情里补。
   权限与 Manage「新建空间」一致：正式实现向 Manage 查询，没有权限时入口置灰。原型里能进 Manage 的人都能建。 */
/* 演示：这些仓库的默认分支、分支列表与描述（真实取自 git ls-remote --symref / --heads 与平台接口）；其余地址为 main、develop，默认 main。
   地址含 offline 视为连不上，含 private / missing 视为不存在或无权访问 */
var LD_DEMO_REPOS = {
  'github.com/kingdee/contract-center':{ desc:'合同起草、审批与履约跟踪', branch:'main', branches:['main', 'develop', 'release/1.0'] },
  'github.com/kingdee/asset-portal':{ desc:'固定资产盘点与折旧查询门户', branch:'develop', branches:['develop', 'main'] },
  'git.kingdee.com/cosmic/hr-onboarding':{ desc:'新员工入职流程自动化', branch:'master', branches:['master', 'dev', 'test'] },
  'git.kingdee.com/cosmic/budget-review':{ desc:'年度预算编制与评审', branch:'main', branches:['main', 'develop'] },
  'gitee.com/kingdee/mini-shop':{ desc:'小程序商城', branch:'master', branches:['master'] },
};
export function ldCanCreateProject() { return true; }
/* 这个仓库是否已经是我的空间（按统一后的远端地址比较） */
function ldProjectForRepo(url) {
  var key = ldRemoteKey(url);
  return tkProjectsForCurrentUser().find(function (project) { return project.repo && ldRemoteKey(project.repo) === key; }) || null;
}
/* 解析粘贴的地址；不合法时返回错误说明 */
function ldParseRepoUrl(text) {
  var url = String(text || '').trim();
  if (!url) return { error:'' };
  var error = gitRepoUrlError(url);
  if (error) return { error:error };
  var info = ldRepoInfo({ repo:url, id:'new' });
  return { url:url.replace(/\/+$/, ''), host:info.host, path:info.path, name:info.name, platform:info.platform };
}
var LD_DEFAULT_GOAL = '完成研发空间的需求交付与上线';
function ldRepoNameValue() { return $('#ldRepoName').value.trim(); }
function ldRepoGoalValue() { return $('#ldRepoGoal').value.trim(); }
/* 分支下拉：分支列表 + 「其他」手填；默认分支标注出来 */
function ldSetBranchOptions(branches, selected, defaultBranch) {
  $('#ldRepoBranch').innerHTML = branches.map(function (b) { return '<option value="' + ldEsc(b) + '">' + ldEsc(b) + (b === defaultBranch ? '（默认分支）' : '') + '</option>'; }).join('') + '<option value="__custom">其他</option>';
  $('#ldRepoBranch').value = selected;
  $('#ldRepoBranchCustom').hidden = selected !== '__custom';
}
function ldRepoBranchValue() { return $('#ldRepoBranch').value === '__custom' ? $('#ldRepoBranchCustom').value.trim() : $('#ldRepoBranch').value; }
/* 手填的分支先校验名称，正式实现再用 git ls-remote --heads 确认仓库里有这个分支 */
function ldRepoBranchError() { return tkBranchNameError(ldRepoBranchValue()); }
function ldRepoTargetPath() { return repoDirMode === 'existing' ? repoDirPath : ldDefaultPath({ name:ldRepoNameValue() || repoCheck?.name || 'project' }); }
/* 空间目录校验：工作区目录内、未被其他空间使用，其余按 ldCheckDir 的演示规则 */
function ldRepoDirError() {
  var path = ldRepoTargetPath();
  if (!path) return '';
  var used = Object.keys(ldMine().bindings).some(function (id) { return ldMine().bindings[id].path === path; });
  return used ? '该目录已被其他空间使用，请改用其他目录' : ldCheckDir('__new', path);
}
export function ldOpenRepoNew(onCreated) {
  if (!ldCanCreateProject()) { toast('你没有新建空间的权限，请联系 Manage 管理员', 'warning'); return; }
  repoOnCreated = onCreated || null;
  repoCheck = null;
  repoProgress = 0;
  repoDirMode = 'auto';
  repoDirPath = '';
  repoRun++;
  $('#ldRepoUrl').value = '';
  $('#ldRepoName').value = '';
  $('#ldRepoGoal').value = LD_DEFAULT_GOAL;
  $('#ldRepoBranchCustom').value = '';
  ldSetBranchOptions(['main', 'master', 'develop'], 'main', '');
  renderRepoModal();
  ldShow('#ldRepoOverlay');
  setTimeout(function () { $('#ldRepoName').focus(); }, 0);
}
function scheduleRepoCheck(delay) {
  clearTimeout(repoCheckTimer);
  repoCheckTimer = setTimeout(runRepoCheck, delay);
}
function runRepoCheck() {
  var parsed = ldParseRepoUrl($('#ldRepoUrl').value);
  if (repoCheck && parsed.url && repoCheck.url === parsed.url && repoCheck.state !== 'login') return;
  if (!parsed.url) { repoCheck = parsed.error ? { state:'error', message:parsed.error } : null; renderRepoModal(); return; }
  var existing = ldProjectForRepo(parsed.url);
  if (existing) { repoCheck = Object.assign(parsed, { state:'existing', message:'这个仓库已经是空间「' + existing.name + '」，将直接使用该空间', projectId:existing.id }); renderRepoModal(); return; }
  var auth = ldAuthFor(parsed.host);
  if ((!auth || auth.expired) && ldFindLocalCred(parsed.host)) { ldAdoptLocalCred(parsed.host); auth = ldAuthFor(parsed.host); }
  if (!auth || auth.expired) { repoCheck = Object.assign(parsed, { state:'login', message:(auth ? parsed.host + ' 的凭据已失效' : '还没有登录 ' + parsed.host + ' 的 Git 账号') + '，登录后才能检查和下载代码' }); renderRepoModal(); return; }
  repoCheck = Object.assign(parsed, { state:'checking', message:'正在连接 ' + parsed.host + '…' });
  renderRepoModal();
  var run = ++repoRun;
  setTimeout(function () {
    if (run !== repoRun || !ldVisible('#ldRepoOverlay')) return;
    var key = ldRemoteKey(parsed.url), demo = LD_DEMO_REPOS[key] || {};
    if (/offline/i.test(parsed.url)) repoCheck = Object.assign(parsed, { state:'error', message:'连不上 ' + parsed.host + '，请确认地址和网络；公司内部平台需要连接内网或 VPN' });
    else if (/private|missing/i.test(parsed.url)) repoCheck = Object.assign(parsed, { state:'error', message:'仓库不存在，或 ' + ldAuthUser(auth) + ' 没有访问权限，请确认地址或更换账号' });
    else {
      var branches = demo.branches || ['main', 'develop'];
      var issue = ldPushIssueText(auth, parsed.platform);
      repoCheck = Object.assign(parsed, { state:issue ? 'warn' : 'ok', branch:demo.branch || 'main', branches:branches, desc:demo.desc || '', readOnly:!!issue,
        message:(issue ? '可以读取，但推送校验没通过：' + issue + '；仍可创建，智能体暂时无法推送分支'
          : '可以访问 · ' + parsed.platform + ' · 账号 ' + ldAuthUser(auth) + ' · 默认分支 ' + (demo.branch || 'main')) });
      if (!ldRepoNameValue()) $('#ldRepoName').value = parsed.name;
      if (demo.desc && (!ldRepoGoalValue() || ldRepoGoalValue() === LD_DEFAULT_GOAL)) $('#ldRepoGoal').value = demo.desc;
      /* 已选「其他」手填的分支保留，否则换成仓库里的分支并选中默认分支 */
      if ($('#ldRepoBranch').value !== '__custom') ldSetBranchOptions(branches, repoCheck.branch, repoCheck.branch);
    }
    renderRepoModal();
  }, 800);
}
var LD_CHECK_ICONS = { ok:'✓', warn:'!', error:'!', login:'!', existing:'✓' };
function renderRepoModal() {
  var busy = !!repoProgress;
  var c = repoCheck;
  $('#ldRepoUrl').disabled = busy;
  $('#ldRepoUrl').setAttribute('aria-invalid', c && c.state === 'error' ? 'true' : 'false');
  $('#ldRepoCheck').className = 'ld-repo-check' + (c ? ' is-' + c.state : '');
  $('#ldRepoCheck').innerHTML = !c ? ''
    : (c.state === 'checking' ? '<span class="ld-spin" aria-hidden="true"></span>' : '<b aria-hidden="true">' + LD_CHECK_ICONS[c.state] + '</b>')
      + '<span>' + ldEsc(c.message) + '</span>'
      + (c.state === 'login' ? '<button type="button" class="ld-btn ld-btn--primary" data-ld-repo-login>登录</button>' : '')
      + (c.state === 'error' && c.host ? '<button type="button" class="ld-btn" data-ld-repo-recheck>重新检查</button>' : '');
  var passed = !!c && (c.state === 'ok' || c.state === 'warn');
  ['#ldRepoName', '#ldRepoGoal', '#ldRepoBranch', '#ldRepoBranchCustom'].forEach(function (sel) { $(sel).disabled = busy; });
  /* 分支只在出错时提示（「其他」还没填时不提示） */
  var branchError = $('#ldRepoBranch').value === '__custom' && !$('#ldRepoBranchCustom').value.trim() ? '' : ldRepoBranchError();
  $('#ldRepoBranchCustom').setAttribute('aria-invalid', branchError ? 'true' : 'false');
  $('#ldRepoBranchHint').textContent = branchError;
  $('#ldRepoBranchHint').hidden = !branchError;
  var dirError = ldRepoDirError();
  var defaultPath = ldDefaultPath({ name:ldRepoNameValue() || c?.name || '空间名称' });
  $('#ldRepoDir').innerHTML = '<div class="ld-choice" role="radiogroup" aria-labelledby="ldRepoDirLabel">'
    + '<label class="ld-choice-item"><input type="radio" name="ldRepoDirMode" value="auto"' + (repoDirMode === 'auto' ? ' checked' : '') + (busy ? ' disabled' : '') + '><span>默认目录<code class="ld-choice-path" title="' + ldEsc(defaultPath) + '">' + ldEsc(defaultPath) + '</code></span></label>'
    + '<label class="ld-choice-item"><input type="radio" name="ldRepoDirMode" value="existing"' + (repoDirMode === 'existing' ? ' checked' : '') + (busy ? ' disabled' : '') + '><span>自定义目录</span></label>'
    + '</div>'
    + (repoDirMode === 'existing' ? '<div class="ld-path-row"><input type="text" class="ld-input" readonly placeholder="未选择" value="' + ldEsc(repoDirPath) + '" aria-label="自定义目录"><button type="button" class="ld-btn" data-ld-repo-pick-dir' + (busy ? ' disabled' : '') + '>选择…</button></div>' : '')
    + (dirError && (repoDirMode === 'auto' || repoDirPath) ? '<p class="ld-error">' + ldEsc(dirError) + '</p>' : '');
  $('#ldRepoProgress').innerHTML = repoProgress ? '<div class="ld-progress" role="progressbar" aria-label="创建并初始化" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + repoProgress + '"><span style="width:' + repoProgress + '%"></span></div>' : '';
  var btn = $('#ldRepoSubmit');
  var existing = c && c.state === 'existing';
  btn.disabled = busy || !(existing || (passed && ldRepoNameValue() && ldRepoGoalValue() && !ldRepoBranchError() && ldRepoTargetPath() && !dirError));
  btn.textContent = busy ? (repoProgress < 30 ? '创建中…' : '初始化中…') : existing ? '使用这个空间' : '创建并初始化';
}
function closeRepoModal() {
  clearTimeout(repoCheckTimer);
  repoRun++;
  repoProgress = 0;
  repoOnCreated = null;
  ldHide('#ldRepoOverlay');
}
function finishRepo(projectId) {
  var done = repoOnCreated;
  closeRepoModal();
  ldRefresh();
  if (done) done(projectId);
}
function submitRepoNew() {
  var c = repoCheck;
  if (!c || repoProgress) return;
  if (c.state === 'existing') { var existing = tkProjectById(c.projectId); toast('已选择空间「' + ldEsc(existing?.name || '') + '」', 'success'); finishRepo(c.projectId); return; }
  if (c.state !== 'ok' && c.state !== 'warn') return;
  var name = ldRepoNameValue();
  if (!name) { toast('请填写空间名称', 'warning'); $('#ldRepoName').focus(); return; }
  var goal = ldRepoGoalValue();
  if (!goal) { toast('请填写空间目标', 'warning'); $('#ldRepoGoal').focus(); return; }
  var branchError = ldRepoBranchError();
  if (branchError) { toast(ldEsc(branchError), 'warning'); ($('#ldRepoBranch').value === '__custom' ? $('#ldRepoBranchCustom') : $('#ldRepoBranch')).focus(); return; }
  if (repoDirMode === 'existing' && !repoDirPath) { toast('请先选择目录', 'warning'); return; }
  var dirError = ldRepoDirError();
  if (dirError) { toast(ldEsc(dirError), 'error'); return; }
  var me = tkCurrentUserId(), person = tkGetPerson(me);
  var host = c.host, path = ldRepoTargetPath(), mode = repoDirMode;
  var id = 'proj-' + Date.now();
  var project = {
    id:id, name:name, desc:goal, goal:goal,
    instruction:'', dot:'blue', containsRd:true, space:'manage', template:'devtest',
    status:'planned', priority:'中', owner:person?.name || '未指定', platform:c.platform,
    repo:c.url, baseBranch:ldRepoBranchValue(), code:c.name.replace(/[^a-zA-Z0-9-]/g, '-').toUpperCase(),
    start:'', end:'', milestones:[], members:me ? [me] : [], memberRoles:{}, adminIds:[], teamIds:[], projectExperts:[],
    createdFrom:'build-repo', updatedAt:Date.now(),
  };
  var run = ++repoRun;
  repoProgress = 10;
  renderRepoModal();
  /* 通过 Manage 的数据接口创建开发空间；用时再加载，不改变模块求值顺序 */
  import('../../manager/data.js').then(function (manager) {
    if (run !== repoRun) return;
    if (!manager.mgrAddProject(project)) { repoProgress = 0; renderRepoModal(); toast('空间创建失败，请重试', 'error'); return; }
    document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail:{ created:id } }));
    var timer = setInterval(function () {
      if (run !== repoRun) { clearInterval(timer); return; }
      repoProgress = Math.min(100, repoProgress + 18);
      if (repoProgress < 100) { renderRepoModal(); return; }
      clearInterval(timer);
      ldBindDir(id, path, mode);
      ldMarkInitialized(id);
      ldRecordChecks(host);
      var after = ldProjectStatus(id);
      if (after.ready) toast('已创建「' + ldEsc(name) + '」，代码在 ' + ldEsc(path), 'success');
      else toast('已创建「' + ldEsc(name) + '」，但' + ldEsc(after.reason), 'warning');
      finishRepo(id);
    }, 300);
  }, function () { repoProgress = 0; renderRepoModal(); toast('空间创建失败，请重试', 'error'); });
}

export function initRepoNewDialog() {
  if (!$('#ldRepoOverlay')) return;
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-ld-repo-close]') || t.id === 'ldRepoOverlay') { closeRepoModal(); return; }
    if (t.closest('#ldRepoSubmit')) { submitRepoNew(); return; }
    if (t.closest('[data-ld-repo-new]')) { ldOpenRepoNew(null); return; }
    if (t.closest('[data-ld-repo-login]') && repoCheck?.host) { ldOpenAuth(repoCheck.host, function () { repoCheck = null; runRepoCheck(); }); return; }
    if (t.closest('[data-ld-repo-recheck]')) { repoCheck = null; runRepoCheck(); return; }
    if (t.closest('[data-ld-repo-pick-dir]')) { repoDirPath = LD_WORKSPACE_ROOT + '/code/' + (repoCheck?.name || 'project'); renderRepoModal(); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t instanceof HTMLInputElement && t.name === 'ldRepoDirMode') { repoDirMode = t.value; renderRepoModal(); return; }
    if (t instanceof HTMLElement && t.id === 'ldRepoBranch') {
      var custom = t.value === '__custom';
      $('#ldRepoBranchCustom').hidden = !custom;
      renderRepoModal();
      if (custom) $('#ldRepoBranchCustom').focus();
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target instanceof HTMLElement && ['ldRepoName', 'ldRepoGoal', 'ldRepoBranchCustom'].includes(e.target.id)) renderRepoModal();
    /* 地址改了就作废上次结果，停止输入 0.5 秒后自动检查 */
    if (e.target instanceof HTMLElement && e.target.id === 'ldRepoUrl') { repoRun++; repoCheck = null; renderRepoModal(); scheduleRepoCheck(500); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.id === 'ldRepoUrl') { e.preventDefault(); scheduleRepoCheck(0); return; }
    if (e.key === 'Escape' && ldVisible('#ldRepoOverlay') && !ldVisible('#ldAuthOverlay')) { e.stopPropagation(); closeRepoModal(); }
  }, true);
  /* 其他页面（新建任务的空间下拉）打开「新建空间」，detail.onCreated 收到空间 ID */
  document.addEventListener('lingee:repo-project-new', function (e) { ldOpenRepoNew(e.detail?.onCreated || null); });
}
