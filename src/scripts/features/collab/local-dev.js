import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { tkCurrentUserId, tkGetPerson, tkGetTasks, tkProjectById, tkProjectsForCurrentUser, tkUpdateTask } from '../tasks-v2/data.js';

/* 本地开发环境：开发在 Lingee 桌面客户端本地执行。
   - Git 随客户端内置，不要求用户安装；
   - Git 认证按平台（主机）配置一次访问令牌，所有项目共用；
   - 项目与本机目录绑定一次（自动拉取到默认目录或使用已有目录），以后对话和任务都用这个目录。
   入口在协作开发「设置」页签（智能体团队之后）：Git 认证列表与各项目状态，可打开项目设置；进入时另有一次提醒。
   配置按「登录人 + 本机」保存在浏览器本地存储里，演示时可在项目设置里模拟新设备清空。 */

var LD_KEY = 'lingee_local_dev_v1';
var setupProjectId = '';
var setupOnReady = null;
var setupDirMode = 'auto';
var setupExistingPath = '';
var setupPulling = 0;
var authHost = '';
var authOnSaved = null;
var reminderShown = false;
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
/* 项目目录：默认放在 ~/Lingee/<仓库名>，也可以为每个项目指定已有目录 */
function ldDefaultPath(info) { return '~/Lingee/' + info.name; }
function ldDirText(binding) { return (binding.mode === 'existing' ? '指定目录' : '默认目录') + ' · '; }
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
function ldGitUsername() {
  var me = tkGetPerson(tkCurrentUserId()) || {};
  var prefix = String(me.email || '').split('@')[0].replace(/\*/g, '');
  return prefix || 'user' + String(me.id || tkCurrentUserId() || '').replace(/\D/g, '');
}
function ldAuthUser(auth) { return auth.username || ldGitUsername(); }
function ldDetectLocalCreds() {
  var mine = ldMine(), me = tkGetPerson(tkCurrentUserId());
  var found = LD_LOCAL_CREDS.filter(function (cred) { return !mine.auths[cred.host]; });
  found.forEach(function (cred) {
    mine.auths[cred.host] = { platform:cred.platform, username:ldGitUsername(), account:me?.name || '当前用户', source:'local', sourceLabel:cred.source,
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
    toast(found.length ? '检测到 ' + found.map(function (cred) { return ldEsc(cred.host); }).join('、') : '本机没有可用凭据', found.length ? 'success' : 'info');
    if ($('#ldSetupOverlay').style.display !== 'none') renderSetup();
    refreshProjectPanel();
  }, 600);
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
/* 项目里的 Git 认证从「设置」已有的认证中选择；与仓库不同平台的不可选，最后一项可新增 */
function ldAuthSelect(projectId) {
  var info = ldProjectStatus(projectId).info, auths = ldMine().auths;
  var hosts = Object.keys(auths);
  var current = auths[info.host] ? info.host : '';
  return '<select class="ld-input ld-select ld-auth-pick" data-ld-auth-pick="' + ldEsc(projectId) + '" aria-label="选择 Git 认证">'
    + (current ? '' : '<option value="" selected disabled>选择认证</option>')
    + hosts.map(function (host) {
      var auth = ldAuthFor(host), match = host === info.host;
      return '<option value="' + ldEsc(host) + '"' + (host === current ? ' selected' : '') + (match ? '' : ' disabled') + '>'
        + ldEsc(ldAuthUser(auth)) + ' · ' + ldEsc(host) + (match ? (auth.expired ? '（已过期）' : '') : '（平台不一致）') + '</option>';
    }).join('')
    + '<option value="__add">＋ 添加认证…</option></select>';
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
      next:'配置本地环境后自动继续执行。',
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
    toast('「' + ldEsc(task.title) + '」未启动：本地环境未配置', 'warning');
    return false;
  }
  ldOpenSetup(task.project, { resumeLabel:'完成并执行', onReady:options?.onReady });
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
  var mark = function (done, n) { return '<span class="ld-step-mark' + (done ? ' is-done' : '') + '" aria-hidden="true">' + (done ? '✓' : n) + '</span>'; };
  var auth = status.auth, binding = status.binding;
  var authHtml = '<li class="ld-step">' + mark(status.authOk, 1)
    + '<div class="ld-step-main"><div class="ld-step-title">Git 认证</div><p class="ld-step-text">' + (status.authOk ? ldEsc(ldAuthUser(auth)) + ' · ' + ldEsc(info.host) : ldEsc(info.host) + (auth?.expired ? ' · 令牌已过期' : ' · 未认证')) + '</p></div>'
    + '<div class="ld-step-actions">' + (status.authOk ? '' : '<button type="button" class="ld-btn" data-ld-detect>检测本机</button>') + ldAuthSelect(setupProjectId) + '</div></li>';
  var dirHtml;
  if (binding && !setupPulling) {
    dirHtml = '<li class="ld-step">' + mark(true, 2) + '<div class="ld-step-main"><div class="ld-step-title">项目目录</div><p class="ld-step-text"><code>' + ldEsc(binding.path) + '</code></p></div>'
      + '<div class="ld-step-actions"><button type="button" class="ld-btn" data-ld-rebind>更改</button></div></li>';
  } else {
    var disabled = !status.authOk || setupPulling ? ' disabled' : '';
    dirHtml = '<li class="ld-step">' + mark(false, 2) + '<div class="ld-step-main"><div class="ld-step-title">项目目录</div>'
      + '<div class="ld-choice" role="radiogroup" aria-label="本地目录">'
      + '<label class="ld-choice-item"><input type="radio" name="ldDirMode" value="auto"' + (setupDirMode === 'auto' ? ' checked' : '') + disabled + '><span>默认目录 <code>' + ldEsc(ldDefaultPath(info)) + '</code></span></label>'
      + '<label class="ld-choice-item"><input type="radio" name="ldDirMode" value="existing"' + (setupDirMode === 'existing' ? ' checked' : '') + disabled + '><span>指定目录（本机已有这个仓库时）</span></label>'
      + '</div>'
      + (setupDirMode === 'existing' ? '<div class="ld-path-row"><input type="text" class="ld-input" id="ldExistingPath" readonly placeholder="未选择" value="' + ldEsc(setupExistingPath) + '" aria-label="已有目录"><button type="button" class="ld-btn" data-ld-pick-dir' + disabled + '>选择…</button></div>' : '')
      + (setupPulling ? '<div class="ld-progress" role="progressbar" aria-label="' + (setupDirMode === 'existing' ? '校验目录' : '拉取代码') + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + setupPulling + '"><span style="width:' + setupPulling + '%"></span></div>' : '')
      + '</div><div class="ld-step-actions"><button type="button" class="ld-btn ld-btn--primary" data-ld-bind' + disabled + '>' + (setupPulling ? (setupDirMode === 'existing' ? '校验中…' : '拉取中…') : setupDirMode === 'existing' ? '绑定' : '拉取') + '</button></div></li>';
  }
  $('#ldSetupBody').innerHTML = '<ol class="ld-steps">' + authHtml + dirHtml + '</ol>';
  $('#ldSetupDone').disabled = !(status.ready && !setupPulling);
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
    toast(mode === 'existing' ? '已绑定目录' : '代码已拉取', 'success');
  }, 320);
}
function finishSetup() {
  if (!ldProjectStatus(setupProjectId).ready) return;
  var done = setupOnReady;
  closeSetup();
  hideReminder();
  if (done) done();
  else toast('本地环境已就绪', 'success');
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
  $('#ldAuthTitle').textContent = host ? 'Git 认证' : '添加 Git 认证';
  $('#ldAuthHost').value = host;
  $('#ldAuthHost').placeholder = 'git.kingdee.com';
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
function syncAuthCreateLabel() { /* 获取令牌的链接文案固定，平台切换时无需更新 */ }
function setAuthError(text) {
  var el = $('#ldAuthError');
  el.textContent = text;
  el.hidden = !text;
  $('#ldAuthToken').setAttribute('aria-invalid', text ? 'true' : 'false');
}
function setAuthBusy(busy) {
  var btn = $('#ldAuthSubmit');
  btn.disabled = busy;
  btn.textContent = busy ? '验证中…' : '保存';
}
function submitAuth() {
  var host = $('#ldAuthHost').value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  var token = $('#ldAuthToken').value.trim();
  if (!host) { setAuthError('请填写平台地址'); $('#ldAuthHost').focus(); return; }
  if (!token) { setAuthError('请填写令牌'); $('#ldAuthToken').focus(); return; }
  setAuthError('');
  setAuthBusy(true);
  setTimeout(function () {
    setAuthBusy(false);
    /* 演示校验：过短视为格式错误；含 expired / bad 视为无效；含 readonly 视为缺少写权限 */
    if (token.length < 8) { setAuthError('令牌格式不正确'); return; }
    if (/expired|bad/i.test(token)) { setAuthError('令牌无效或已过期'); return; }
    if (/readonly/i.test(token)) { setAuthError('令牌缺少写权限'); return; }
    var me = tkGetPerson(tkCurrentUserId());
    var expires = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
    var mine = ldMine();
    mine.auths[host] = { platform:$('#ldAuthPlatform').value, username:ldGitUsername(), account:me?.name || '当前用户', source:'token', scopes:['read_repository','write_repository'], expiresAt:expires, savedAt:ldNow() };
    ldSaveMine(mine);
    var done = authOnSaved;
    ldHide('#ldAuthOverlay');
    authOnSaved = null;
    toast('认证成功', 'success');
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
  el.innerHTML = '<div class="ld-reminder-head"><strong>本地环境未配置</strong><button type="button" class="sync-modal__close" data-ld-reminder-close aria-label="关闭提醒"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
    + '<p>配置后任务才能在本机执行。</p>'
    + '<ul>' + pending.slice(0, 3).map(function (project) {
      return '<li><span>' + ldEsc(project.name) + '</span><button type="button" class="ld-btn ld-btn--primary" data-ld-setup-open="' + ldEsc(project.id) + '">配置</button></li>';
    }).join('') + '</ul>'
    + (pending.length > 3 ? '<p class="ld-reminder-more">还有 ' + (pending.length - 3) + ' 个，见「设置」</p>' : '');
  el.hidden = false;
}
function hideReminder() { var el = $('#ldReminder'); if (el) el.hidden = true; }

/* ---------- 项目设置弹窗 ---------- */
export function ldOpenProjectSettings(projectId) {
  var project = tkProjectById(projectId);
  if (!project) { toast('项目不存在或已移除', 'warning'); return; }
  settingsProjectId = projectId;
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
  if (!status.needed) return '<div class="ld-panel"><p class="ld-empty">该项目没有代码仓库。</p></div>';
  var info = status.info, auth = status.auth, binding = status.binding;
  var row = function (label, value, actions) {
    return '<div class="ld-kv-row"><dt>' + label + '</dt><dd>' + value + '</dd><div class="ld-kv-actions">' + (actions || '') + '</div></div>';
  };
  var muted = function (text) { return '<span class="ld-muted">' + text + '</span>'; };
  return '<div class="ld-panel">'
    + (status.ready ? '' : '<div class="ld-warn"><span>' + ldEsc(status.reason) + '</span><button type="button" class="ld-btn ld-btn--primary" data-ld-setup-open="' + ldEsc(project.id) + '">配置</button></div>')
    + '<dl class="ld-kv">'
    + row('代码仓库', '<code>' + ldEsc(info.repo.replace(/^https?:\/\//, '')) + '</code>' + muted(' · ' + ldEsc(info.baseBranch)))
    + row('Git 认证', status.authOk ? ldEsc(ldAuthUser(auth)) + muted(' · ' + ldEsc(info.host)) : muted(auth?.expired ? '令牌已过期' : '未认证'),
        ldAuthSelect(project.id))
    + row('项目目录', binding ? ldDirText(binding) + '<code>' + ldEsc(binding.path) + '</code>' : muted('未设置'),
        binding ? '<button type="button" class="ld-btn" data-ld-reveal>打开</button><button type="button" class="ld-btn" data-ld-rebind-project>更改</button>'
          : '<button type="button" class="ld-btn" data-ld-setup-open="' + ldEsc(project.id) + '">设置</button>')
    + '</dl>'
    + '<button type="button" class="ld-link ld-reset" data-ld-reset>演示：清空本机配置</button>'
    + '</div>';
}
function refreshProjectPanel() {
  renderNavStatus();
  renderLocalPage();
  if (settingsProjectId) renderProjectSettings();
}

/* ---------- 协作开发「设置」页签 ---------- */
function renderNavStatus() {
  var dot = $('#ldTabDot');
  if (!dot) return;
  dot.hidden = !ldMyDevProjects().some(function (project) { return !ldProjectStatus(project.id).ready; });
}
var LD_ICONS = {
  key: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8"/><path d="m16 7 3 3"/><path d="m18.5 4.5 2 2"/></svg>',
  repo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10"/><path d="M18 10c0 4-6 3-12 7"/></svg>',
  edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
};
function ldListHead(cols) {
  return '<li class="ld-list-head" aria-hidden="true"><span class="ld-list-main">' + cols[0] + '</span><span class="ld-list-col">' + cols[1] + '</span><span class="ld-col-state">' + cols[2] + '</span><span class="ld-col-act">' + cols[3] + '</span></li>';
}
function ldCardHead(icon, title, actions) {
  return '<div class="ld-set-head"><h2>' + LD_ICONS[icon] + title + '</h2>' + (actions ? '<div class="ld-row-actions">' + actions + '</div>' : '') + '</div>';
}
function renderLocalPage() {
  var page = $('#ldPage');
  if (!page || !$('#cv-local')?.classList.contains('active')) return;
  var mine = ldMine();
  var projects = ldMyDevProjects();
  var hosts = Object.keys(mine.auths);
  var authCard = ldCardHead('key', 'Git 认证', '<button type="button" class="ld-set-btn" data-ld-detect>检测本机</button><button type="button" class="ld-set-btn" data-ld-auth-new>添加</button>')
    + (hosts.length ? '<ul class="ld-list" aria-label="Git 认证">' + ldListHead(['平台', '用户名', '状态', '操作']) + hosts.map(function (host) {
      var auth = ldAuthFor(host);
      return '<li><span class="ld-list-main"><strong>' + ldEsc(host) + '</strong><span>' + ldEsc(auth.platform) + '</span></span>'
        + '<span class="ld-list-col">' + ldEsc(ldAuthUser(auth)) + '</span>'
        + '<span class="ld-col-state"><span class="ld-state ' + (auth.expired ? 'is-warn' : 'is-ok') + '">' + (auth.expired ? '已过期' : '可用') + '</span></span>'
        + '<span class="ld-col-act"><button type="button" class="ld-set-btn" data-ld-auth-open="' + ldEsc(host) + '">更换</button></span></li>';
    }).join('') + '</ul>'
      : '<div class="ld-set-empty">暂无认证</div>');
  var projectCard = ldCardHead('repo', '我的项目<small>来自 Manage 中我参与或负责的项目</small>')
    + (projects.length ? '<ul class="ld-list" aria-label="我的项目">' + ldListHead(['项目', '项目目录', '状态', '操作']) + projects.map(function (project) {
      var st = ldProjectStatus(project.id);
      /* 没设置过的项目按默认目录展示，拉取后才算就绪 */
      var dir = st.binding || { mode:'auto', path:ldDefaultPath(st.info) };
      return '<li><span class="ld-list-main"><strong>' + ldEsc(project.name) + '</strong><span>' + ldEsc(st.info.host) + '</span></span>'
        + '<span class="ld-list-col"><span class="ld-dir-mode">' + (dir.mode === 'existing' ? '指定' : '默认') + '</span><code>' + ldEsc(dir.path) + '</code></span>'
        + '<span class="ld-col-state"><span class="ld-state ' + (st.ready ? 'is-ok' : 'is-warn') + '">' + (st.ready ? '已就绪' : st.authOk ? '未拉取' : '未认证') + '</span></span>'
        + '<span class="ld-col-act">' + (st.ready ? '<button type="button" class="ld-set-btn" data-ld-project-settings="' + ldEsc(project.id) + '">设置</button>'
          : '<button type="button" class="ld-set-btn ld-set-btn--primary" data-ld-setup-open="' + ldEsc(project.id) + '">配置</button>') + '</span></li>';
    }).join('') + '</ul>'
      : '<div class="ld-set-empty">你参与的项目都没有代码仓库</div>');
  page.innerHTML = '<section class="ld-set-card">' + authCard + '</section>'
    + '<section class="ld-set-card">' + projectCard + '</section>'
    + '<button type="button" class="ld-link ld-reset" data-ld-reset>演示：清空本机配置</button>';
}

function currentPanelProjectId() { return settingsProjectId; }

/* 选择后重绘，下拉恢复为当前生效的认证 */
function refreshAfterPick() {
  if ($('#ldSetupOverlay').style.display !== 'none') renderSetup();
  refreshProjectPanel();
}

/* ---------- 显示与事件 ---------- */
function ldShow(sel) { var el = $(sel); el.style.display = 'flex'; el.setAttribute('aria-hidden', 'false'); }
function ldHide(sel) { var el = $(sel); el.style.display = 'none'; el.setAttribute('aria-hidden', 'true'); }

export function initLocalDev() {
  if (!$('#ldSetupOverlay')) return;
  renderNavStatus();
  /* 切到「设置」页签时渲染页面 */
  var panel = $('#cv-local');
  if (panel) new MutationObserver(renderLocalPage).observe(panel, { attributes:true, attributeFilter:['class'] });
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-ld-setup-close]') || t.id === 'ldSetupOverlay') { closeSetup(); return; }
    if (t.closest('[data-ld-project-close]') || t.id === 'ldProjectOverlay') { closeProjectSettings(); return; }
    if (t.closest('[data-ld-auth-close]') || t.id === 'ldAuthOverlay') { ldHide('#ldAuthOverlay'); authOnSaved = null; return; }
    if (t.closest('#ldSetupDone')) { finishSetup(); return; }
    if (t.closest('#ldAuthSubmit')) { submitAuth(); return; }
    if (t.closest('#ldAuthCreate')) { toast('已打开 ' + ldEsc($('#ldAuthHost').value || authHost) + ' 的令牌创建页，权限已预填（演示）'); return; }
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
      ldOpenAuth(host, authOpen.getAttribute('data-ld-platform') || ldProjectStatus(pid).info?.platform);
      return;
    }
    var setupOpen = t.closest('[data-ld-setup-open]');
    if (setupOpen) { hideReminder(); ldOpenSetup(setupOpen.getAttribute('data-ld-setup-open')); return; }
    if (t.closest('[data-ld-auth-new]')) { ldOpenAuth('', 'GitLab'); return; }
    var detect = t.closest('[data-ld-detect]');
    if (detect) { ldRunDetect(detect); return; }
    var projectSettings = t.closest('[data-ld-project-settings]');
    if (projectSettings) {
      ldOpenProjectSettings(projectSettings.getAttribute('data-ld-project-settings'));
      return;
    }
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
    if (t.closest('[data-ld-reveal]')) { toast('已在访达中打开（演示）'); return; }
    if (t.closest('[data-ld-reset]')) {
      ldSaveMine({ auths:{}, bindings:{} });
      reminderShown = false;
      refreshProjectPanel();
      toast('已清空本机配置', 'success');
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t instanceof HTMLInputElement && t.name === 'ldDirMode') { setupDirMode = t.value; renderSetup(); return; }
    if (t instanceof HTMLSelectElement && t.hasAttribute('data-ld-auth-pick')) {
      var pickInfo = ldProjectStatus(t.getAttribute('data-ld-auth-pick')).info;
      if (t.value === '__add') { ldOpenAuth(pickInfo.host, pickInfo.platform); refreshAfterPick(); return; }
      toast('已选择 ' + ldEsc(t.value) + ' 的认证', 'success');
      refreshAfterPick();
      return;
    }
    if (t instanceof HTMLSelectElement && t.id === 'ldAuthPlatform') syncAuthCreateLabel();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.id === 'ldAuthToken') { e.preventDefault(); submitAuth(); return; }
    if (e.key !== 'Escape') return;
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
