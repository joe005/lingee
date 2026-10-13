import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { tkCurrentUserId, tkGetPerson, tkGetTasks, tkProjectById, tkProjectsForCurrentUser, tkUpdateTask } from '../tasks-v2/data.js';

/* 本地开发环境：开发在 Lingee 桌面客户端本地执行。
   - Git 随客户端内置，不要求用户安装；
   - Git 认证按平台（主机）配置一次访问令牌，所有项目共用；
   - 项目与本机目录绑定一次（自动拉取到默认目录或使用已有目录），以后对话和任务都用这个目录。
   入口：左侧栏项目分组的齿轮、协作开发顶部「本地环境」、进入时的提醒，都打开同一个「项目设置」弹窗。
   配置按「登录人 + 本机」保存在浏览器本地存储里，演示时可在项目设置里模拟新设备清空。 */

var LD_KEY = 'lingee_local_dev_v1';
var LD_GIT_VERSION = '2.47.1';
var setupProjectId = '';
var setupOnReady = null;
var setupDirMode = 'auto';
var setupExistingPath = '';
var setupPulling = 0;
var authHost = '';
var authOnSaved = null;
var reminderShown = false;
var panelChecks = null;
var settingsProjectId = '';

/* ---------- 存储 ---------- */
function ldReadAll() {
  try { return JSON.parse(localStorage.getItem(LD_KEY) || '{}') || {}; } catch (e) { return {}; }
}
function ldMine() {
  var all = ldReadAll(), me = tkCurrentUserId() || 'guest';
  var row = all[me] || {};
  return { auths: row.auths || {}, bindings: row.bindings || {}, detectedAt: row.detectedAt || '' };
}
function ldSaveMine(mine) {
  var all = ldReadAll(), me = tkCurrentUserId() || 'guest';
  all[me] = mine;
  try { localStorage.setItem(LD_KEY, JSON.stringify(all)); } catch (e) { /* 存储不可用时仅本次会话有效 */ }
}

/* ---------- 仓库解析 ---------- */
function ldEsc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
export function ldRepoInfo(project) {
  var repo = String(project?.repo || '').trim();
  if (!repo) return null;
  /* 兼容 https://host/path、git@host:path、只有主机没有路径等写法 */
  var rest = repo.replace(/^[a-z]+:\/\//i, '').replace(/^[^@/]+@/, '');
  var host = (/^[a-z]+:\/\//i.test(repo) ? rest.split('/')[0] : rest.split(/[/:]/)[0]) || repo;
  var path = rest.slice(host.length).replace(/^[/:]+/, '').replace(/\.git\/?$/, '').replace(/\/$/, '');
  var name = (path.split('/').pop() || project.id || 'project').replace(/[^\w.-]/g, '-');
  var platform = /github/i.test(host) ? 'GitHub' : /gitee/i.test(host) ? 'Gitee' : /codeup|aliyun/i.test(host) ? '云效 Codeup' : 'GitLab';
  return { repo:repo, host:host, name:name, platform:platform, baseBranch:project.baseBranch || 'main' };
}
function ldDefaultPath(info) { return '~/Lingee/' + info.name; }
function ldNow() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* ---------- 本机凭据检测 ----------
   客户端读取本机已有的 Git 凭据（macOS 钥匙串、Git 凭据管理器、~/.git-credentials），
   逐个用内置 Git 验证可访问后列出，免去重复配置。演示数据：本机钥匙串里有 github.com 的凭据。 */
var LD_LOCAL_CREDS = [
  { host:'github.com', platform:'GitHub', source:'macOS 钥匙串' },
];
function ldDetectLocalCreds() {
  var mine = ldMine(), me = tkGetPerson(tkCurrentUserId());
  var found = LD_LOCAL_CREDS.filter(function (cred) { return !mine.auths[cred.host]; });
  found.forEach(function (cred) {
    mine.auths[cred.host] = { platform:cred.platform, account:me?.name || '当前用户', source:'local', sourceLabel:cred.source,
      scopes:['read_repository','write_repository'], expiresAt:'', savedAt:ldNow() };
  });
  mine.detectedAt = ldNow();
  ldSaveMine(mine);
  return found;
}
function ldRunDetect(btn) {
  if (btn) { btn.disabled = true; btn.textContent = '检测中…'; }
  setTimeout(function () {
    var found = ldDetectLocalCreds();
    toast(found.length ? '检测到 ' + found.length + ' 个可用的本机凭据：' + found.map(function (cred) { return ldEsc(cred.host); }).join('、') : '没有发现新的可用凭据，可以手动新增认证', found.length ? 'success' : 'info');
    if ($('#ldSetupOverlay').style.display !== 'none') renderSetup();
    refreshProjectPanel();
  }, 600);
}
function ldAuthSourceText(auth) {
  return auth.source === 'local' ? '来自' + (auth.sourceLabel || '本机凭据') : '访问令牌' + (auth.expiresAt ? ' · 有效期至 ' + auth.expiresAt : '');
}

/* ---------- 就绪判断 ---------- */
function ldAuthFor(host) {
  var auth = ldMine().auths[host];
  if (!auth) return null;
  return Object.assign({}, auth, { expired: !!auth.expiresAt && auth.expiresAt < new Date().toISOString().slice(0, 10) });
}
export function ldProjectStatus(projectId) {
  var info = ldRepoInfo(tkProjectById(projectId));
  if (!info) return { needed:false, ready:true };
  var auth = ldAuthFor(info.host);
  var binding = ldMine().bindings[projectId] || null;
  var authOk = !!auth && !auth.expired;
  return { needed:true, ready:authOk && !!binding, info:info, auth:auth, authOk:authOk, binding:binding,
    reason:!auth ? '未配置 ' + info.host + ' 的 Git 认证' : auth.expired ? info.host + ' 的访问令牌已过期' : !binding ? '项目尚未绑定本地目录' : '' };
}
function ldMyDevProjects() {
  return tkProjectsForCurrentUser().filter(function (project) { return !!ldRepoInfo(project); });
}

/* ---------- 任务启动前自检 ----------
   手动开始：弹出准备面板，配好后接着执行；自动启动（阶段自动流转、保存并启动）：无人值守，
   转为已阻塞并写明原因，当前阶段处理人在「待我处理」里点「去配置」。 */
function ldStartStage(task) {
  var plan = Array.isArray(task.executionPlan) ? task.executionPlan : [];
  return plan.find(function (row) { return row.id === task.executionStageId; })
    || plan.find(function (row) { return row.status !== 'done'; }) || null;
}
export function ldBlockTaskForEnv(task, reason) {
  var stage = ldStartStage(task);
  tkUpdateTask(task.id, {
    status:'blocked',
    executionStageId:stage ? stage.id : task.executionStageId,
    executionPlan:Array.isArray(task.executionPlan) ? task.executionPlan.map(function (row) { return stage && row.id === stage.id ? Object.assign({}, row, {status:'blocked'}) : row; }) : task.executionPlan,
    blockedRun:{ kind:'local-env', resumeStatus:task.status, agentName:'Lingee 客户端', failedAt:ldNow(), duration:'0秒',
      reason:'本地开发环境未就绪：' + reason + '。',
      next:'在「准备本地开发环境」中完成 Git 认证和本地目录绑定，配好后自动继续执行。',
      steps:[['执行前环境自检', reason + '，未开始执行。']] },
    comments:(task.comments || []).concat({ kind:'comment', authorId:tkCurrentUserId(), createdAt:ldNow(), status:'blocked', assignee:task.assignee,
      text:'自动启动前检测到本地开发环境未就绪（' + reason + '），已转为已阻塞。' }),
  });
}
export function ldIsEnvBlocked(task) { return task?.status === 'blocked' && task.blockedRun?.kind === 'local-env'; }
/* 环境阻塞的任务恢复到阻塞前状态，再交给调用方重新开始执行 */
export function ldRestoreEnvBlocked(task) {
  if (!ldIsEnvBlocked(task)) return;
  var stage = ldStartStage(task);
  tkUpdateTask(task.id, {
    status:task.blockedRun.resumeStatus || 'backlog', blockedRun:null,
    executionPlan:Array.isArray(task.executionPlan) ? task.executionPlan.map(function (row) { return stage && row.id === stage.id ? Object.assign({}, row, {status:'pending'}) : row; }) : task.executionPlan,
  });
}
/* 返回 true 表示可以直接执行；false 时已按场景处理（弹面板或转阻塞） */
export function ldGateTaskStart(task, options) {
  if (!task || !['planned','backlog'].includes(task.status)) return true;
  var status = ldProjectStatus(task.project);
  if (status.ready) return true;
  if (options?.automatic) {
    ldBlockTaskForEnv(task, status.reason);
    toast('「' + ldEsc(task.title) + '」自动启动失败：本地开发环境未就绪，已转为已阻塞', 'warning');
    return false;
  }
  ldOpenSetup(task.project, { resumeLabel:'完成并开始执行', onReady:options?.onReady });
  return false;
}

/* ---------- 准备本地开发环境 ---------- */
export function ldOpenSetup(projectId, options) {
  var project = tkProjectById(projectId);
  if (!ldRepoInfo(project)) { toast('该项目未配置代码仓库，无需准备本地环境', 'warning'); return; }
  setupProjectId = projectId;
  setupOnReady = options?.onReady || null;
  setupDirMode = 'auto';
  setupExistingPath = '';
  $('#ldSetupDone').textContent = setupOnReady ? (options.resumeLabel || '完成并继续执行') : '完成';
  ldShow('#ldSetupOverlay');
  renderSetup();
}
function renderSetup() {
  var status = ldProjectStatus(setupProjectId);
  var info = status.info, project = tkProjectById(setupProjectId);
  if (!info) return;
  $('#ldSetupSub').textContent = project.name;
  var stepDone = function (done, n) { return '<span class="ld-step-mark' + (done ? ' is-done' : '') + '" aria-hidden="true">' + (done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' : n) + '</span>'; };
  var auth = status.auth;
  var authHtml = '<li class="ld-step' + (status.authOk ? ' is-done' : ' is-current') + '">' + stepDone(status.authOk, 1)
    + '<div class="ld-step-main"><div class="ld-step-title">Git 认证<span class="ld-step-meta">' + ldEsc(info.host) + ' · ' + ldEsc(info.platform) + '</span></div>'
    + (status.authOk
      ? '<p class="ld-step-text">已认证为 ' + ldEsc(auth.account) + '（' + ldEsc(ldAuthSourceText(auth)) + '）。每个平台只需配置一次，所有项目共用。</p>'
      : '<p class="ld-step-text">' + (auth?.expired ? '访问令牌已过期，请重新认证。' : '可以先检测本机已有的 Git 凭据，没有再配置访问令牌。') + '</p>')
    + '</div><div class="ld-step-actions">' + (status.authOk ? '' : '<button type="button" class="ld-btn" data-ld-detect>检测本机</button>')
    + '<button type="button" class="ld-btn' + (status.authOk ? '' : ' ld-btn--primary') + '" data-ld-auth-open="' + ldEsc(info.host) + '">' + (status.authOk ? '重新认证' : '配置令牌') + '</button></div></li>';
  var binding = status.binding, dirHtml;
  if (binding && !setupPulling) {
    dirHtml = '<li class="ld-step is-done">' + stepDone(true, 2) + '<div class="ld-step-main"><div class="ld-step-title">本地目录</div>'
      + '<p class="ld-step-text"><code>' + ldEsc(binding.path) + '</code> · ' + (binding.mode === 'existing' ? '使用已有目录' : '已拉取') + ' · ' + ldEsc(binding.branch) + '</p></div>'
      + '<button type="button" class="ld-btn" data-ld-rebind>更改</button></li>';
  } else {
    var disabled = !status.authOk || setupPulling ? ' disabled' : '';
    dirHtml = '<li class="ld-step' + (status.authOk ? ' is-current' : '') + '">' + stepDone(false, 2) + '<div class="ld-step-main"><div class="ld-step-title">本地目录</div>'
      + (status.authOk ? '' : '<p class="ld-step-text">完成 Git 认证后，再拉取代码或选择已有目录。</p>')
      + '<div class="ld-choice" role="radiogroup" aria-label="本地目录">'
      + '<label class="ld-choice-item"><input type="radio" name="ldDirMode" value="auto"' + (setupDirMode === 'auto' ? ' checked' : '') + disabled + '><span><strong>自动拉取（推荐）</strong><small>拉取到 <code>' + ldEsc(ldDefaultPath(info)) + '</code></small></span></label>'
      + '<label class="ld-choice-item"><input type="radio" name="ldDirMode" value="existing"' + (setupDirMode === 'existing' ? ' checked' : '') + disabled + '><span><strong>使用已有目录</strong><small>本机已有这个仓库时选择，会校验远端地址是否一致</small></span></label>'
      + '</div>'
      + (setupDirMode === 'existing' ? '<div class="ld-path-row"><input type="text" class="ld-input" id="ldExistingPath" readonly placeholder="未选择目录" value="' + ldEsc(setupExistingPath) + '" aria-label="已有目录"><button type="button" class="ld-btn" data-ld-pick-dir' + disabled + '>选择目录…</button></div>' : '')
      + (setupPulling ? '<div class="ld-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + setupPulling + '"><span style="width:' + setupPulling + '%"></span></div><p class="ld-step-text">' + (setupDirMode === 'existing' ? '正在校验目录…' : '正在拉取代码… ' + setupPulling + '%') + '</p>' : '')
      + '</div><button type="button" class="ld-btn ld-btn--primary" data-ld-bind' + disabled + '>' + (setupDirMode === 'existing' ? '绑定目录' : '开始拉取') + '</button></li>';
  }
  var ready = status.ready && !setupPulling;
  var readyHtml = '<li class="ld-step' + (ready ? ' is-done' : '') + '">' + stepDone(ready, 3) + '<div class="ld-step-main"><div class="ld-step-title">就绪</div>'
    + '<p class="ld-step-text">' + (ready ? '环境已就绪，这个项目的对话和任务都会在 <code>' + ldEsc(binding.path) + '</code> 中执行。' : '以上两步完成后，任务即可在本机执行。') + '</p></div></li>';
  $('#ldSetupBody').innerHTML = '<div class="ld-repo"><span class="ld-repo-label">代码仓库</span><code>' + ldEsc(info.repo) + '</code><span class="ld-tag">' + ldEsc(info.baseBranch) + '</span></div>'
    + '<p class="ld-desc">Git 已随 Lingee 客户端内置（' + LD_GIT_VERSION + '），无需另行安装。</p>'
    + '<ol class="ld-steps">' + authHtml + dirHtml + readyHtml + '</ol>';
  $('#ldSetupDone').disabled = !ready;
}
function bindProjectDir() {
  var status = ldProjectStatus(setupProjectId);
  if (!status.authOk || setupPulling) return;
  var info = status.info;
  if (setupDirMode === 'existing') {
    if (!setupExistingPath) { toast('请先选择目录', 'warning'); return; }
    if (/other|别的/.test(setupExistingPath)) { toast('该目录的远端地址与项目仓库不一致，请重新选择', 'error'); return; }
  }
  var path = setupDirMode === 'existing' ? setupExistingPath : ldDefaultPath(info);
  var projectId = setupProjectId, mode = setupDirMode;
  setupPulling = 8;
  renderSetup();
  var timer = setInterval(function () {
    setupPulling = Math.min(100, setupPulling + (mode === 'existing' ? 46 : 23));
    if (setupPulling < 100) { renderSetup(); return; }
    clearInterval(timer);
    setupPulling = 0;
    var mine = ldMine();
    mine.bindings[projectId] = { path:path, mode:mode, branch:info.baseBranch, syncedAt:ldNow() };
    ldSaveMine(mine);
    renderSetup();
    refreshProjectPanel();
    toast(mode === 'existing' ? '已绑定本地目录' : '代码已拉取到 ' + ldEsc(path), 'success');
  }, 320);
}
function finishSetup() {
  if (!ldProjectStatus(setupProjectId).ready) return;
  var done = setupOnReady;
  closeSetup();
  hideReminder();
  if (done) done();
  else toast('本地开发环境已就绪', 'success');
}
function closeSetup() {
  setupOnReady = null;
  setupPulling = 0;
  ldHide('#ldSetupOverlay');
  refreshProjectPanel();
}

/* ---------- Git 认证 ---------- */
export function ldOpenAuth(host, platform, onSaved) {
  authHost = host;
  authOnSaved = onSaved || null;
  var saved = host ? ldMine().auths[host] : null;
  $('#ldAuthTitle').textContent = host ? 'Git 认证' : '新增 Git 认证';
  $('#ldAuthHost').value = host;
  $('#ldAuthHost').placeholder = '如 git.kingdee.com';
  $('#ldAuthPlatform').value = saved?.platform || platform || 'GitLab';
  $('#ldAuthToken').value = '';
  $('#ldAuthToken').type = 'password';
  $('#ldAuthEye').setAttribute('aria-pressed', 'false');
  $('#ldAuthEye').setAttribute('aria-label', '显示令牌');
  syncAuthCreateLabel();
  setAuthError('');
  setAuthBusy(false);
  ldShow('#ldAuthOverlay');
  setTimeout(function () { (host ? $('#ldAuthToken') : $('#ldAuthHost')).focus(); }, 0);
}
function syncAuthCreateLabel() { $('#ldAuthCreate').textContent = '去 ' + $('#ldAuthPlatform').value + ' 创建访问令牌'; }
function setAuthError(text) {
  var el = $('#ldAuthError');
  el.textContent = text;
  el.hidden = !text;
  $('#ldAuthToken').setAttribute('aria-invalid', text ? 'true' : 'false');
}
function setAuthBusy(busy) {
  var btn = $('#ldAuthSubmit');
  btn.disabled = busy;
  btn.textContent = busy ? '验证中…' : '验证并保存';
}
function submitAuth() {
  var host = $('#ldAuthHost').value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  var token = $('#ldAuthToken').value.trim();
  if (!host) { setAuthError('请填写 Git 平台地址'); $('#ldAuthHost').focus(); return; }
  if (!token) { setAuthError('请粘贴访问令牌'); $('#ldAuthToken').focus(); return; }
  setAuthError('');
  setAuthBusy(true);
  setTimeout(function () {
    setAuthBusy(false);
    /* 演示校验：过短视为格式错误；含 expired / bad 视为无效；含 readonly 视为缺少写权限 */
    if (token.length < 8) { setAuthError('令牌格式不正确，请粘贴完整的访问令牌'); return; }
    if (/expired|bad/i.test(token)) { setAuthError('令牌无效或已过期，请重新创建后再粘贴'); return; }
    if (/readonly/i.test(token)) { setAuthError('权限不足：令牌缺少 write_repository，无法推送代码'); return; }
    var me = tkGetPerson(tkCurrentUserId());
    var expires = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
    var mine = ldMine();
    mine.auths[host] = { platform:$('#ldAuthPlatform').value, account:me?.name || '当前用户', source:'token', scopes:['read_repository','write_repository'], expiresAt:expires, savedAt:ldNow() };
    ldSaveMine(mine);
    var done = authOnSaved;
    ldHide('#ldAuthOverlay');
    authOnSaved = null;
    toast('已认证为 ' + ldEsc(me?.name || '当前用户') + '，令牌有效期至 ' + expires, 'success');
    if ($('#ldSetupOverlay').style.display !== 'none') renderSetup();
    refreshProjectPanel();
    if (done) done();
  }, 700);
}

/* ---------- 打开客户端时的提醒 ---------- */
function showReminder() {
  var pending = ldMyDevProjects().filter(function (project) { return !ldProjectStatus(project.id).ready; });
  var el = $('#ldReminder');
  if (!el || !pending.length) return;
  reminderShown = true;
  el.innerHTML = '<div class="ld-reminder-head"><strong>本地开发环境未就绪</strong><button type="button" class="sync-modal__close" data-ld-reminder-close aria-label="关闭提醒"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<p>' + pending.length + ' 个开发项目需要先完成 Git 认证和本地目录配置，否则任务自动启动时会被阻塞。</p>'
    + '<ul>' + pending.slice(0, 3).map(function (project) {
      return '<li><span>' + ldEsc(project.name) + '</span><button type="button" class="ld-btn ld-btn--primary" data-ld-setup-open="' + ldEsc(project.id) + '">去配置</button></li>';
    }).join('') + '</ul>'
    + (pending.length > 3 ? '<p class="ld-reminder-more">其余项目可在顶部「本地环境」或左侧栏项目的设置中配置</p>' : '');
  el.hidden = false;
}
function hideReminder() { var el = $('#ldReminder'); if (el) el.hidden = true; }

/* ---------- 项目设置弹窗 ---------- */
export function ldOpenProjectSettings(projectId) {
  var project = tkProjectById(projectId);
  if (!project) { toast('项目不存在或已移除', 'warning'); return; }
  settingsProjectId = projectId;
  panelChecks = null;
  $('#ldProjectSub').textContent = project.name;
  renderProjectSettings();
  ldShow('#ldProjectOverlay');
}
function renderProjectSettings() {
  var project = tkProjectById(settingsProjectId);
  if (project) $('#ldProjectBody').innerHTML = renderProjectPanel(project);
}
function closeProjectSettings() { settingsProjectId = ''; ldHide('#ldProjectOverlay'); }
function renderProjectPanel(project) {
  var status = ldProjectStatus(project.id);
  if (!status.needed) return '<div class="ld-panel"><p class="ld-empty">该项目未配置代码仓库，不需要本地开发环境。</p></div>';
  var info = status.info, auth = status.auth, binding = status.binding;
  var badge = function (ok, okText, badText) { return '<span class="ld-state ' + (ok ? 'is-ok' : 'is-warn') + '">' + (ok ? '✓ ' + okText : '! ' + badText) + '</span>'; };
  var checks = panelChecks && panelChecks.projectId === project.id ? panelChecks : null;
  var checkRow = function (label, ok, text, fix) {
    return '<li class="' + (ok ? 'is-ok' : 'is-warn') + '"><span class="ld-check-mark" aria-hidden="true">' + (ok ? '✓' : '!') + '</span><span class="ld-check-label">' + label + '</span><span class="ld-check-text">' + text + '</span>' + (!ok && fix ? fix : '') + '</li>';
  };
  return '<div class="ld-panel">'
    + '<div class="ld-panel-head' + (status.ready ? '' : ' is-warn') + '"><p>' + (status.ready ? '本地开发环境已就绪，这个项目的对话和任务在本机执行。' : '本地开发环境未就绪：' + ldEsc(status.reason) + '，任务自动启动时会被阻塞。') + '</p>'
    + (status.ready ? badge(true, '已就绪', '') : '<button type="button" class="ld-btn ld-btn--primary" data-ld-setup-open="' + ldEsc(project.id) + '">去配置</button>') + '</div>'
    + '<section class="ld-card"><h3>代码仓库<small>在 Manage 项目中维护，这里只读</small></h3><dl class="ld-dl">'
    + '<div><dt>仓库地址</dt><dd><code>' + ldEsc(info.repo) + '</code></dd></div>'
    + '<div><dt>基准分支</dt><dd>' + ldEsc(info.baseBranch) + '</dd></div>'
    + '<div><dt>任务分支</dt><dd><code>feature/&lt;任务编号&gt;</code>，开始执行时从基准分支拉取</dd></div></dl></section>'
    + '<section class="ld-card"><h3>Git 认证<small>按平台配置一次，所有项目共用，只对你本人生效</small></h3><div class="ld-row">'
    + '<div class="ld-row-main"><strong>' + ldEsc(info.host) + '</strong><span>' + ldEsc(auth?.platform || info.platform) + (auth ? ' · 已认证为 ' + ldEsc(auth.account) + ' · ' + ldEsc(ldAuthSourceText(auth)) : '') + '</span></div>'
    + badge(status.authOk, '已认证', auth?.expired ? '已过期' : '未认证')
    + '<div class="ld-row-actions">' + (auth ? '' : '<button type="button" class="ld-btn" data-ld-detect>检测本机</button>') + '<button type="button" class="ld-btn' + (status.authOk ? '' : ' ld-btn--primary') + '" data-ld-auth-open="' + ldEsc(info.host) + '">' + (auth ? '重新认证' : '配置令牌') + '</button>'
    + (auth ? '<button type="button" class="ld-btn ld-btn--danger" data-ld-auth-remove="' + ldEsc(info.host) + '">解除认证</button>' : '') + '</div></div></section>'
    + '<section class="ld-card"><h3>本地目录<small>只对这台电脑生效</small></h3>'
    + (binding
      ? '<div class="ld-row"><div class="ld-row-main"><strong><code>' + ldEsc(binding.path) + '</code></strong><span>' + (binding.mode === 'existing' ? '使用已有目录' : '自动拉取') + ' · 当前分支 ' + ldEsc(binding.branch) + ' · 最近同步 ' + ldEsc(binding.syncedAt) + '</span></div>'
        + '<div class="ld-row-actions"><button type="button" class="ld-btn" data-ld-reveal>在访达中打开</button><button type="button" class="ld-btn" data-ld-ide>用 IDE 打开</button><button type="button" class="ld-btn" data-ld-pull>立即拉取</button><button type="button" class="ld-btn" data-ld-rebind-project>更改目录</button></div></div>'
      : '<div class="ld-row"><div class="ld-row-main"><strong>尚未绑定本地目录</strong><span>首次使用时自动拉取到 <code>' + ldEsc(ldDefaultPath(info)) + '</code>，也可以选择本机已有的仓库目录</span></div>'
        + '<div class="ld-row-actions"><button type="button" class="ld-btn ld-btn--primary" data-ld-setup-open="' + ldEsc(project.id) + '">绑定目录</button></div></div>')
    + '</section>'
    + '<section class="ld-card"><h3>环境检测<small>任务执行前会自动检测；有问题时可在这里手动检测</small></h3>'
    + (checks ? '<ul class="ld-checks">'
      + checkRow('内置 Git', true, 'Git ' + LD_GIT_VERSION + '（随客户端内置）')
      + checkRow('Git 认证', checks.authOk, checks.authOk ? '令牌有效，具备读写权限' : '未配置或已过期', '<button type="button" class="ld-btn" data-ld-auth-open="' + ldEsc(info.host) + '">去认证</button>')
      + checkRow('远端连通', checks.authOk, checks.authOk ? '可以访问 ' + ldEsc(info.host) : '认证后才能检测', '')
      + checkRow('本地目录', checks.bound, checks.bound ? '目录存在，远端地址与项目一致' : '尚未绑定', '<button type="button" class="ld-btn" data-ld-setup-open="' + ldEsc(project.id) + '">绑定目录</button>')
      + '</ul>' : '')
    + '<div class="ld-card-foot"><button type="button" class="ld-btn" data-ld-check="' + ldEsc(project.id) + '">' + (checks ? '重新检测' : '检测环境') + '</button>'
    + '<button type="button" class="ld-link" data-ld-reset>模拟新设备（清空本机配置）</button></div></section>'
    + '</div>';
}
function refreshProjectPanel() {
  renderNavStatus();
  if ($('#ldNavPop') && !$('#ldNavPop').hidden) renderNavPop();
  if (settingsProjectId) renderProjectSettings();
  /* 左侧栏项目分组的未就绪标记随之刷新 */
  document.dispatchEvent(new CustomEvent('lingee:local-env-changed'));
}
/* 左侧栏项目分组：未就绪显示橙点，悬停出现设置齿轮 */
export function ldSidebarProjectExtra(projectId) {
  var status = ldProjectStatus(projectId);
  if (!status.needed) return '';
  return '<button type="button" class="ld-sb-gear' + (status.ready ? '' : ' is-warn') + '" data-ld-project-settings="' + ldEsc(projectId) + '" aria-label="项目设置' + (status.ready ? '' : '（本地开发环境未就绪）') + '" title="' + (status.ready ? '项目设置' : '本地开发环境未就绪，点击配置') + '">'
    + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
    + (status.ready ? '' : '<span class="ld-sb-dot" aria-hidden="true"></span>') + '</button>';
}

/* ---------- 顶部导航「本地环境」常驻入口 ---------- */
function renderNavStatus() {
  var btn = $('#ldNavStatus');
  if (!btn) return;
  var projects = ldMyDevProjects();
  btn.hidden = !projects.length;
  if (!projects.length) return;
  var pending = projects.filter(function (project) { return !ldProjectStatus(project.id).ready; }).length;
  btn.classList.toggle('is-warn', pending > 0);
  btn.querySelector('.ld-nav-text').textContent = pending ? pending + ' 个项目环境未就绪' : '本地环境已就绪';
  btn.setAttribute('aria-label', '本地开发环境：' + (pending ? pending + ' 个项目未就绪' : '全部已就绪'));
}
function renderNavPop() {
  var pop = $('#ldNavPop');
  var projects = ldMyDevProjects();
  var auths = ldMine().auths;
  var hosts = Object.keys(auths);
  pop.innerHTML = '<div class="ld-pop-head"><strong>本地开发环境</strong><span>Git ' + LD_GIT_VERSION + ' 已随客户端内置</span></div>'
    + '<div class="ld-pop-section"><div class="ld-pop-section-head"><h4>Git 认证</h4><div class="ld-row-actions"><button type="button" class="ld-btn" data-ld-detect>检测本机凭据</button><button type="button" class="ld-btn" data-ld-auth-new>＋ 新增</button></div></div>'
    + (hosts.length ? '<ul>' + hosts.map(function (host) {
      var auth = ldAuthFor(host), ok = !auth.expired;
      return '<li><span class="ld-pop-name"><strong>' + ldEsc(host) + '</strong><small>' + ldEsc(auth.account) + ' · ' + ldEsc(ldAuthSourceText(auth)) + '</small></span>'
        + '<span class="ld-state ' + (ok ? 'is-ok' : 'is-warn') + '">' + (ok ? '✓ 可用' : '! 已过期') + '</span>'
        + '<button type="button" class="ld-btn" data-ld-auth-open="' + ldEsc(host) + '">更新</button></li>';
    }).join('') + '</ul>'
      : '<p class="ld-pop-empty">还没有可用的 Git 认证。可以检测本机已有凭据，或新增访问令牌。</p>')
    + (ldMine().detectedAt ? '<p class="ld-pop-note">最近检测：' + ldEsc(ldMine().detectedAt) + '</p>' : '') + '</div>'
    + '<div class="ld-pop-section"><h4>项目</h4><ul>' + projects.map(function (project) {
      var st = ldProjectStatus(project.id);
      return '<li><span class="ld-pop-name"><strong>' + ldEsc(project.name) + '</strong><small>' + (st.ready ? ldEsc(st.binding.path) : ldEsc(st.reason)) + '</small></span>'
        + '<span class="ld-state ' + (st.ready ? 'is-ok' : 'is-warn') + '">' + (st.ready ? '✓ 已就绪' : '! 未就绪') + '</span>'
        + (st.ready ? '<button type="button" class="ld-btn" data-ld-project-settings="' + ldEsc(project.id) + '">设置</button>' : '<button type="button" class="ld-btn ld-btn--primary" data-ld-setup-open="' + ldEsc(project.id) + '">去配置</button>') + '</li>';
    }).join('') + '</ul></div>';
}
function toggleNavPop(open) {
  var pop = $('#ldNavPop'), btn = $('#ldNavStatus');
  if (!pop || !btn) return;
  if (open) {
    renderNavPop();
    var rect = btn.getBoundingClientRect();
    pop.hidden = false;
    pop.style.top = (rect.bottom + 8) + 'px';
    pop.style.left = Math.max(16, Math.min(rect.right - pop.offsetWidth, window.innerWidth - pop.offsetWidth - 16)) + 'px';
  } else pop.hidden = true;
  btn.setAttribute('aria-expanded', String(!!open));
}

function currentPanelProjectId() {
  var btn = document.querySelector('.ld-panel [data-ld-check]');
  return btn ? btn.getAttribute('data-ld-check') : '';
}

/* ---------- 显示与事件 ---------- */
function ldShow(sel) { var el = $(sel); el.style.display = 'flex'; el.setAttribute('aria-hidden', 'false'); }
function ldHide(sel) { var el = $(sel); el.style.display = 'none'; el.setAttribute('aria-hidden', 'true'); }

export function initLocalDev() {
  if (!$('#ldSetupOverlay')) return;
  renderNavStatus();
  window.addEventListener('resize', function () { toggleNavPop(false); });
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-ld-setup-close]') || t.id === 'ldSetupOverlay') { closeSetup(); return; }
    if (t.closest('[data-ld-project-close]') || t.id === 'ldProjectOverlay') { closeProjectSettings(); return; }
    if (t.closest('[data-ld-auth-close]') || t.id === 'ldAuthOverlay') { ldHide('#ldAuthOverlay'); authOnSaved = null; return; }
    if (t.closest('#ldSetupDone')) { finishSetup(); return; }
    if (t.closest('#ldAuthSubmit')) { submitAuth(); return; }
    if (t.closest('#ldAuthCreate')) { toast('已在浏览器打开 ' + ldEsc($('#ldAuthHost').value || authHost) + ' 的令牌创建页（名称与权限已预填，演示）'); return; }
    if (t.closest('#ldAuthEye')) {
      var input = $('#ldAuthToken'), show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      $('#ldAuthEye').setAttribute('aria-pressed', String(show));
      $('#ldAuthEye').setAttribute('aria-label', show ? '隐藏令牌' : '显示令牌');
      return;
    }
    var authOpen = t.closest('[data-ld-auth-open]');
    if (authOpen) {
      var host = authOpen.getAttribute('data-ld-auth-open');
      var pid = setupProjectId && $('#ldSetupOverlay').style.display !== 'none' ? setupProjectId : currentPanelProjectId();
      toggleNavPop(false);
      ldOpenAuth(host, authOpen.getAttribute('data-ld-platform') || ldProjectStatus(pid).info?.platform);
      return;
    }
    var authRemove = t.closest('[data-ld-auth-remove]');
    if (authRemove) {
      var mine = ldMine();
      delete mine.auths[authRemove.getAttribute('data-ld-auth-remove')];
      ldSaveMine(mine);
      panelChecks = null;
      refreshProjectPanel();
      toast('已解除认证，使用该平台的项目需要重新认证', 'success');
      return;
    }
    var setupOpen = t.closest('[data-ld-setup-open]');
    if (setupOpen) { hideReminder(); toggleNavPop(false); ldOpenSetup(setupOpen.getAttribute('data-ld-setup-open')); return; }
    if (t.closest('#ldNavStatus')) { toggleNavPop($('#ldNavPop').hidden); return; }
    if (t.closest('[data-ld-auth-new]')) { toggleNavPop(false); ldOpenAuth('', 'GitLab'); return; }
    var detect = t.closest('[data-ld-detect]');
    if (detect) { ldRunDetect(detect); return; }
    var projectSettings = t.closest('[data-ld-project-settings]');
    if (projectSettings) {
      e.preventDefault();
      e.stopPropagation();
      toggleNavPop(false);
      ldOpenProjectSettings(projectSettings.getAttribute('data-ld-project-settings'));
      return;
    }
    if (!t.closest('#ldNavPop') && $('#ldNavPop') && !$('#ldNavPop').hidden) toggleNavPop(false);
    if (t.closest('[data-ld-reminder-close]')) { hideReminder(); return; }
    if (t.closest('[data-ld-bind]')) { bindProjectDir(); return; }
    if (t.closest('[data-ld-pick-dir]')) {
      var info = ldProjectStatus(setupProjectId).info;
      setupExistingPath = '~/Projects/' + info.name;
      renderSetup();
      return;
    }
    if (t.closest('[data-ld-rebind]')) {
      var m = ldMine(); delete m.bindings[setupProjectId]; ldSaveMine(m);
      renderSetup();
      return;
    }
    if (t.closest('[data-ld-rebind-project]')) {
      var pidRebind = currentPanelProjectId(), m2 = ldMine();
      delete m2.bindings[pidRebind]; ldSaveMine(m2);
      ldOpenSetup(pidRebind);
      return;
    }
    if (t.closest('[data-ld-reveal]')) { toast('已在访达中打开项目目录（演示）'); return; }
    if (t.closest('[data-ld-ide]')) { toast('已用默认 IDE 打开项目目录（演示）'); return; }
    if (t.closest('[data-ld-pull]')) {
      var pidPull = currentPanelProjectId(), m3 = ldMine();
      if (!ldProjectStatus(pidPull).authOk) { toast('Git 认证未配置或已过期，请先认证', 'warning'); return; }
      if (m3.bindings[pidPull]) { m3.bindings[pidPull].syncedAt = ldNow(); ldSaveMine(m3); }
      refreshProjectPanel();
      toast('已拉取最新代码', 'success');
      return;
    }
    var check = t.closest('[data-ld-check]');
    if (check) {
      var st = ldProjectStatus(check.getAttribute('data-ld-check'));
      panelChecks = { projectId:check.getAttribute('data-ld-check'), authOk:st.authOk, bound:!!st.binding };
      refreshProjectPanel();
      return;
    }
    if (t.closest('[data-ld-reset]')) {
      ldSaveMine({ auths:{}, bindings:{} });
      panelChecks = null;
      reminderShown = false;
      refreshProjectPanel();
      toast('已清空本机的 Git 认证和目录绑定，下次进入协作开发会提醒配置', 'success');
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t instanceof HTMLInputElement && t.name === 'ldDirMode') { setupDirMode = t.value; renderSetup(); return; }
    if (t instanceof HTMLSelectElement && t.id === 'ldAuthPlatform') syncAuthCreateLabel();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.id === 'ldAuthToken') { e.preventDefault(); submitAuth(); return; }
    if (e.key !== 'Escape') return;
    if ($('#ldNavPop') && !$('#ldNavPop').hidden) { toggleNavPop(false); $('#ldNavStatus').focus(); return; }
    if ($('#ldAuthOverlay').style.display !== 'none') { e.stopPropagation(); ldHide('#ldAuthOverlay'); authOnSaved = null; }
    else if ($('#ldSetupOverlay').style.display !== 'none') { e.stopPropagation(); closeSetup(); }
    else if ($('#ldProjectOverlay').style.display !== 'none') { e.stopPropagation(); closeProjectSettings(); }
  }, true);
  /* 进入协作开发（相当于打开客户端）时检查一次，本次会话只提醒一次 */
  document.addEventListener('lingee:collab-menu-open', function () {
    if (!ldMine().detectedAt) ldDetectLocalCreds();
    renderNavStatus();
    if (reminderShown) return;
    setTimeout(showReminder, 400);
  });
}
