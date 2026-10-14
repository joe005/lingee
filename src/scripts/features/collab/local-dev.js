import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { tkCurrentStageHandlerId, tkCurrentUserId, tkGetPerson, tkProjectById, tkProjectsForCurrentUser, tkUpdateTask } from '../tasks-v2/data.js';

/* 本地开发环境：开发在 Lingee 桌面客户端本地执行。
   - Git 随客户端内置，不要求用户安装；
   - Git 账号按平台（主机）登录一次，所有项目按仓库主机自动匹配，不在项目里另选；
     一期登录方式：浏览器登录（平台已开启时）、访问令牌；不检测或配置 SSH。
   - 项目初始化到本机目录一次：默认是工作区目录下的「项目名」文件夹（与任务执行同一目录），可改为工作区目录内的其他文件夹；
     目录里已有该仓库就直接使用，否则在原目录就地初始化并保留已有文件；
   设置页和顶部「本地环境」浮层里每个项目只有一个「初始化」：先在弹窗确认账号与目录（可更改目录），再初始化；
   「我的项目」列出本人参与的全部研发项目，没配仓库的标「未配置仓库」，SSH 地址标「SSH 仓库」不检测；
   设置页打开时不检测，展示上次检测结果（按人保存），点「检测」才检测；没有 Git 时引导下载；
   任务开始前未就绪时走对话（「本地环境配置」技能，composer/local-env-chat.js，本模块发 lingee:local-env-chat 事件打开）；
   换账号、改目录在「项目设置」弹窗里。
   协作开发「设置」页签负责查看和修改：Git 账号、我的项目两张卡片，更改目录用弹窗。
   就绪状态是「人 + 设备」维度的：真实客户端把各项目状态上报服务端，自动启动按阶段处理人查询；
   原型按登录人保存在浏览器本地存储里模拟上报，演示时可在设置页清空。 */

var LD_KEY = 'lingee_local_dev_v1';
var dirProjectId = '';
var dirMode = 'auto';        /* 初始化弹窗：auto 默认目录，existing 自定义目录 */
var dirPath = '';            /* 自定义目录 */
var dirSettings = false;     /* 项目设置：同一弹窗，主按钮为「保存」 */
var dirPulling = 0;
var authHost = '';
var authOnSaved = null;
var authCustom = false;      /* 「添加账号」：由用户选择平台，自建 GitLab 填写地址 */
var authPlatform = 'GitLab';
var detecting = false;
var dirOnReady = null;
var dirRun = 0;
var authRun = 0;
var settingsProjectId = '';

/* ---------- 存储 ---------- */
function ldReadAll() {
  try { return JSON.parse(localStorage.getItem(LD_KEY) || '{}') || {}; } catch (e) { return {}; }
}
/* 某个人上报的本机状态；不传时为当前登录人 */
function ldStateOf(userId) {
  var row = ldReadAll()[userId || tkCurrentUserId() || 'guest'] || {};
  return { auths: row.auths || {}, bindings: row.bindings || {}, knownHosts: row.knownHosts || [], checks: row.checks || null, gitMissing: !!row.gitMissing };
}
function ldMine() { return ldStateOf(); }
function ldSaveMine(mine) {
  var all = ldReadAll(), me = tkCurrentUserId() || 'guest';
  all[me] = mine;
  try { localStorage.setItem(LD_KEY, JSON.stringify(all)); } catch (e) { /* 存储不可用时仅本次会话有效 */ }
}

/* ---------- 仓库解析 ---------- */
function ldEsc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
/* 远端地址统一成 host/path 再比较：git@host:a/b.git、ssh://git@host:22/a/b、https://host/a/b 视为同一仓库 */
function ldRemoteKey(url) {
  return String(url || '').trim()
    .replace(/^[a-z+]+:\/\//i, '').replace(/^[^@/]+@/, '')
    .replace(/^([^/:]+):\d+\//, '$1/').replace(/^([^/:]+):/, '$1/')
    .replace(/\.git\/?$/, '').replace(/\/$/, '').toLowerCase();
}
export function ldRepoInfo(project) {
  var repo = String(project?.repo || '').trim();
  if (!repo) return null;
  var key = ldRemoteKey(repo);
  var host = key.split('/')[0] || repo;
  var path = key.slice(host.length + 1);
  var name = (path.split('/').pop() || project.id || 'project').replace(/[^\w.-]/g, '-');
  /* 平台类型：Manage 登记代码仓库时已知（project.platform）；没有时按主机名推断，自建平台由客户端探测接口确认
     （/api/v4/version 为 GitLab、/api/v3/meta 为 GitHub Enterprise），用户不需要填写 */
  var platform = project.platform || (/github/i.test(host) ? 'GitHub' : /gitee/i.test(host) ? 'Gitee' : /codeup|aliyun/i.test(host) ? '云效 Codeup' : 'GitLab');
  /* Manage 项目同时保存 HTTPS 与 SSH 克隆地址（平台接口的 http_url_to_repo / ssh_url_to_repo）；
     没填 SSH 地址时按 git@<主机>:<路径>.git 推出。自建平台的 SSH 端口常常不是 22，写在 ssh:// 地址里 */
  var sshRepo = String(project.sshRepo || '').trim() || 'git@' + host + ':' + path + '.git';
  var portMatch = sshRepo.match(/^ssh:\/\/[^/]*:(\d+)\//i);
  var httpsRepo = /^https?:\/\//i.test(repo) ? repo : 'https://' + host + '/' + path + '.git';
  /* Manage 不校验 Git 地址格式，随手填的「git」「geti」不能当成平台：主机要像域名（带点）且有仓库路径 */
  var valid = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/.test(host) && !!path;
  return { repo:repo, valid:valid, httpsRepo:httpsRepo, sshRepo:sshRepo, sshPort:portMatch ? Number(portMatch[1]) : 22,
    host:host, path:path, name:name, platform:platform, baseBranch:project.baseBranch || 'main' };
}
function ldRemoteProtocol(url) { return /^https?:\/\//i.test(String(url || '').trim()) ? 'https' : 'ssh'; }
export function ldCloneUrl(info) { return info.httpsRepo; }
function ldAuthProtocol() { return 'https'; }
function ldBindingProtocol(binding) { return binding?.protocol || 'https'; }
/* 项目目录：与任务执行（harness）同一目录。默认为工作区目录下的「项目名」文件夹，可改为工作区目录内的其他文件夹；
   任务执行只接受工作区目录内的目录，所以不能选 ~/Projects 等其他位置。工作区目录按登录身份区分，演示固定一个。 */
export var LD_WORKSPACE_ROOT = '~/lingeebuild/workspaces/<身份>';
export function ldDefaultPath(project) { return LD_WORKSPACE_ROOT + '/' + String(project?.name || project?.id || 'project').replace(/[\\/:*?"<>|]/g, '-'); }
export function ldInsideWorkspace(path) { return String(path || '').indexOf(LD_WORKSPACE_ROOT + '/') === 0; }
/* 项目目录绑定：与任务执行共用，写在工作区目录的 .lingee-project-bindings 下，不改动仓库文件 */
export function ldLocalConfigPath(projectId) { return LD_WORKSPACE_ROOT + '/.lingee-project-bindings/' + projectId + '.json'; }
function ldNow() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* ---------- Git 账号 ----------
   浏览器登录要用平台上注册的 OAuth 应用：公有平台由 Lingee 内置；自建平台（如 git.kingdee.com）
   需要管理员在「系统集成」里登记应用后才开启，否则使用访问令牌。演示数据：自建平台都未开启。 */
var LD_OAUTH_HOSTS = ['github.com', 'gitlab.com', 'gitee.com'];
export function ldOauthSupported(host) { return LD_OAUTH_HOSTS.includes(String(host || '').toLowerCase()); }
/* 一期只静默检测 HTTPS 凭据，不读取 SSH 密钥。演示：github.com 有本机凭据。 */
var LD_LOCAL_CREDS = [
  { host:'github.com', platform:'GitHub', source:'Git 凭据管理器' },
];
/* 静默检测：不让 Git 或凭据管理器（GCM）弹出登录提示或窗口，找不到就直接返回 */
export var LD_QUIET_ENV = 'GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never ';

export function ldTokenPage(platform, host) {
  if (platform === 'GitHub') return 'https://' + host + '/settings/tokens/new';
  if (platform === 'Gitee') return 'https://' + host + '/profile/personal_access_tokens';
  if (platform === 'GitLab') return 'https://' + host + '/-/user_settings/personal_access_tokens';
  return 'https://' + host + ' 的个人设置 › 访问令牌';
}
/* 演示：真实账号名由平台 /user 接口返回 */
export function ldGitUsername() {
  var me = tkGetPerson(tkCurrentUserId()) || {};
  var prefix = String(me.email || '').split('@')[0].replace(/\*/g, '');
  return prefix || 'user' + String(me.id || tkCurrentUserId() || '').replace(/\D/g, '');
}
export function ldAuthUser(auth) { return auth.username || ldGitUsername(); }
export function ldAuthEmail(auth) { return auth ? auth.email || tkGetPerson(tkCurrentUserId())?.email || '' : ''; }
/* 账号下方的来源说明；界面上不出现令牌本身 */
export function ldSourceLabel(auth) {
  if (auth.source === 'local') return '本机凭据';
  if (auth.source === 'token') return '访问令牌' + (auth.expiresAt ? ' · ' + auth.expiresAt + ' 到期' : '');
  return '浏览器登录 · 自动续期';
}
export function ldFindLocalCred(host) { return LD_LOCAL_CREDS.find(function (cred) { return cred.host === host; }) || null; }
/* 推送检查：正式实现结合平台权限接口与 git push --dry-run；dry-run 不保证真实推送成功。
   演示：含 readonly 的令牌没有写权限，其他账号都有 */
function ldPushCheck(auth) { return !auth?.readOnly; }
/* 保存账号；换了账号后：
   - Lingee 管理的默认目录使用 HTTPS；旧原型的默认 SSH 绑定在重新登录后改为 HTTPS，指定目录保持用户自己的远端；
   - 对这个平台上已拉取的项目重新跑一次推送校验，不按账号类型推断。返回重新校验的项目数 */
function ldSaveAuthEntry(host, entry) {
  var me = tkGetPerson(tkCurrentUserId());
  var mine = ldMine();
  var auth = mine.auths[host] = Object.assign({ username:ldGitUsername(), account:me?.name || '当前用户', savedAt:ldNow() }, entry);
  var rechecked = 0;
  ldProjectsOnHost(host).forEach(function (project) {
    var binding = mine.bindings[project.id];
    if (!binding) return;
    if (binding.mode !== 'existing') {
      binding.protocol = ldAuthProtocol(auth);
      delete binding.sshCommand;
    }
    binding.writable = ldPushCheck(auth);
    rechecked++;
  });
  ldSaveMine(mine);
  return rechecked;
}
export function ldAdoptLocalCred(host) {
  var cred = ldFindLocalCred(host);
  if (!cred) return null;
  ldSaveAuthEntry(host, { platform:cred.platform, source:'local', sourceLabel:cred.source, expiresAt:'' });
  ldRefresh();
  return cred;
}
/* ---------- 就绪判断 ---------- */
function ldAuthFor(host, userId) {
  var auth = ldStateOf(userId).auths[host];
  if (!auth) return null;
  return Object.assign({}, auth, { expired: !!auth.expiresAt && auth.expiresAt < new Date().toISOString().slice(0, 10) });
}
/* 账号按仓库主机自动匹配；写权限针对具体仓库，保存账号时判断不了，拉取或绑定目录时校验并记在 binding.writable 上 */
var LD_STATUS_LABELS = { ready:'已就绪', download:'未初始化', login:'未登录', expired:'凭据失效', noaccess:'无权访问', offline:'无法连接', mismatch:'目录不匹配', git:'Git 不可用', invalid:'地址无效', norepo:'未配置仓库', ssh:'SSH 仓库', unchecked:'待检测' };
/* 状态颜色：已就绪绿，未初始化黄，地址无效、凭据失效红，其余橙 */
function ldStatusTone(key) { return key === 'ready' ? 'is-ok' : key === 'download' ? 'is-pending' : key === 'invalid' || key === 'expired' ? 'is-danger' : ['unchecked', 'norepo', 'ssh'].includes(key) ? 'is-muted' : 'is-warn'; }
export function ldProjectStatus(projectId, userId) {
  var info = ldRepoInfo(tkProjectById(projectId));
  if (!info) return { needed:false, ready:true };
  if (!info.valid) return { needed:true, ready:false, invalid:true, info:info, key:'invalid', label:'地址无效', reason:'仓库地址「' + info.repo + '」不是有效的仓库地址，请在项目设置中修正' };
  /* 一期本页只管 HTTPS；SSH 地址按本机已有 SSH 配置使用，不检测、不初始化 */
  if (ldRemoteProtocol(info.repo) !== 'https') return { needed:false, ready:true, ssh:true, info:info, key:'ssh', label:'SSH 仓库', reason:'SSH 地址按本机已有 SSH 配置使用，本页只管理 HTTPS 账号' };
  if (ldStateOf(userId).gitMissing) return { needed:true, ready:false, info:info, key:'git', label:'Git 不可用', reason:'本机没有安装 Git，安装后点「检测」' };
  var auth = ldAuthFor(info.host, userId);
  var binding = ldStateOf(userId).bindings[projectId] || null;
  var authOk = !!auth && !auth.expired && auth.source !== 'ssh';
  var writeOk = !binding || binding.writable !== false;
  /* 一期仅支持 HTTPS，保留已有 SSH 目录，不改它的远端。 */
  var protocolOk = !binding || ldBindingProtocol(binding) === 'https';
  var ready = authOk && !!binding && protocolOk && writeOk;
  /* 状态与客户端一致：已就绪、未初始化、未登录、凭据失效、无权访问、目录不匹配、Git 不可用、地址无效 */
  var key = !auth ? 'login' : auth.expired || !authOk ? 'expired' : !binding ? 'download' : !protocolOk ? 'mismatch' : !writeOk ? 'noaccess' : 'ready';
  return { needed:true, ready:ready, info:info, auth:auth, authOk:authOk, writeOk:writeOk, protocolOk:protocolOk, binding:binding, key:key, label:LD_STATUS_LABELS[key],
    reason:key === 'login' ? '还没有登录 ' + info.host + ' 的 Git 账号'
      : key === 'expired' ? '本机保存的凭据被平台拒绝，可能已过期或被撤销，请重新登录'
      : key === 'download' ? '项目代码尚未初始化到本机'
      : key === 'mismatch' ? '项目目录不是该项目的 HTTPS 仓库，请重新选择或使用默认目录，原目录保持不变'
      : key === 'noaccess' ? ldAuthUser(auth) + ' 没有该仓库的访问权限，请更换账号或联系项目管理员' : '' };

}
/* 有仓库的项目；设置页「我的项目」另外列出没配仓库的项目 */
function ldMyDevProjects() {
  return tkProjectsForCurrentUser().filter(function (project) { return !!ldRepoInfo(project); });
}
function ldProjectsOnHost(host) {
  return ldMyDevProjects().filter(function (project) { return ldRepoInfo(project).host === host; });
}
/* 需要本人配置的项目；地址无效的要到 Manage 修正，SSH 仓库不检测，都不算在内 */
export function ldPendingProjects() {
  return ldMyDevProjects().filter(function (project) { var status = ldProjectStatus(project.id); return !status.ready && !status.invalid; });
}

/* ---------- 项目目录 ---------- */
/* 记录项目目录绑定（任务执行读同一份）；mode 为 auto（默认目录）或 existing（更改过的目录） */
export function ldBindDir(projectId, path, mode) {
  var info = ldRepoInfo(tkProjectById(projectId));
  var mine = ldMine();
  var auth = info ? mine.auths[info.host] : null;
  mine.bindings[projectId] = { path:path, mode:mode, protocol:ldAuthProtocol(auth), branch:info?.baseBranch || 'main', writable:ldPushCheck(auth), syncedAt:ldNow() };
  ldSaveMine(mine);
  ldRefresh();
}
export function ldMarkInitialized(projectId) {
  var mine = ldMine();
  if (!mine.bindings[projectId]) return;
  mine.bindings[projectId].initializedAt = ldNow();
  ldSaveMine(mine);
}
/* 校验所选目录（真实客户端读取目录里的仓库与目录标记）：
   - 必须在工作区目录内；目录里是别的仓库、已被其他项目使用、或已有文件与仓库文件同名时失败，原目录和原绑定不变；
   - 原目录下还有任务工作区时不允许更改目录（进行中的任务封存时要找原执行目录）。
   演示：路径含 outside 视为工作区外，含 other / 别的 视为别的仓库，含 used 视为已被其他项目使用，含 conflict 视为同名文件冲突，
   项目设置里路径含 busy 的原目录视为还有任务工作区。 */
export function ldCheckDir(projectId, path) {
  var current = ldMine().bindings[projectId];
  if (!ldInsideWorkspace(path) || /outside/i.test(path)) return '项目目录必须在工作区目录（' + LD_WORKSPACE_ROOT + '）内';
  if (current && current.path !== path && /busy/i.test(current.path)) return '原目录下还有任务工作区，请等任务完成并封存后再更改目录';
  if (/other|别的/.test(path)) return '目录里的仓库与项目仓库地址不一致';
  if (/used/i.test(path)) return '该目录已被其他项目使用';
  if (/conflict/i.test(path)) return '目录里已有文件与仓库文件同名，Git 未覆盖。请移走或改名这些文件后重试';
  return '';
}
/* 演示：系统目录选择器打开在工作区目录，固定返回其中的 <仓库名> 文件夹 */
function ldPickDir(info) { return LD_WORKSPACE_ROOT + '/' + info.name; }

/* ---------- 打开智能配置（对话） ----------
   由「本地环境配置」技能在对话里完成，一次对话只配置一个项目：检查 Git → Git 账号 → 项目目录 → 拉取代码 → 初始化本机配置。
   onReady 在项目就绪后由对话里的「继续执行任务」按钮调用。 */
export function ldOpenSetup(projectId, options) {
  if (!ldRepoInfo(tkProjectById(projectId))) { toast('该项目未配置代码仓库，无需准备本地环境', 'warning'); return; }
  var invalid = ldProjectStatus(projectId);
  if (invalid.invalid) { toast(ldEsc(invalid.reason), 'warning'); return; }
  toggleNavPop(false);
  closeProjectSettings();
  document.dispatchEvent(new CustomEvent('lingee:local-env-chat', { detail:{ projectIds:[projectId], onReady:options?.onReady || null } }));
}

/* ---------- 任务启动前自检 ----------
   按当前阶段处理人的设备状态判断（任务在处理人的电脑上执行）。
   处理人本人手动开始：进入智能配置对话，配好后接着执行；自动启动（阶段自动流转、保存并启动）或由别人触发：
   无人值守，转为已阻塞并写明原因，处理人在「待我处理」里点「去配置」。 */
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
/* 返回 true 表示可以直接执行；false 时已按场景处理（进入智能配置对话或转阻塞） */
export function ldGateTaskStart(task, options) {
  if (!task || !['planned','backlog'].includes(task.status)) return true;
  var me = tkCurrentUserId();
  var handlerId = tkCurrentStageHandlerId(task) || me;
  var status = ldProjectStatus(task.project, handlerId);
  if (status.ready) return true;
  if (options?.automatic || handlerId !== me) {
    var reason = handlerId === me ? status.reason : (tkGetPerson(handlerId)?.name || '处理人') + ' 的电脑上' + status.reason;
    ldBlockTaskForEnv(task, reason);
    toast('「' + ldEsc(task.title) + '」未启动：本地环境未就绪', 'warning');
    return false;
  }
  ldOpenSetup(task.project, { onReady:options?.onReady });
  return false;
}

/* ---------- 配置（设置页每个项目一个按钮） ----------
   1. 没有账号时先用本机已有的 HTTPS 凭据（点击即同意读取）；都没有就打开登录弹窗，登录后自动继续；
   2. 打开项目目录弹窗：默认目录或指定目录，确认后在弹窗里拉取（或校验已有目录），校验推送权限，写入本机配置；
   3. 目录或权限有问题时在当前弹窗重选目录、更换账号后重试。 */
function ldQuickSetup(projectId) {
  var status = ldProjectStatus(projectId);
  if (status.ready || status.invalid) return;
  var info = status.info;
  if (!status.authOk) {
    var cred = ldFindLocalCred(info.host) ? ldAdoptLocalCred(info.host) : null;
    if (!cred) { ldOpenAuth(info.host, function () { ldQuickSetup(projectId); }); return; }
  }
  ldOpenDirModal(projectId);
}

/* ---------- 初始化项目 / 更改项目目录 ----------
   初始化前在弹窗里选择默认目录或自定义目录（工作区目录内）；已初始化的项目在「项目设置」里更改目录。
   目录里已有该仓库就直接使用，否则在原目录就地初始化并保留已有文件；校验失败时原目录和原绑定不变。 */
export function ldOpenDirModal(projectId, onReady, settings) {
  var project = tkProjectById(projectId);
  if (!ldRepoInfo(project)) { toast('该项目未配置代码仓库', 'warning'); return; }
  var binding = ldMine().bindings[projectId];
  dirProjectId = projectId;
  dirRun++;
  dirOnReady = onReady || null;
  dirSettings = !!settings && !!binding;
  dirMode = binding && binding.path !== ldDefaultPath(project) ? 'existing' : 'auto';
  dirPath = dirMode === 'existing' ? binding.path : '';
  dirPulling = 0;
  $('#ldDirTitle').textContent = dirSettings ? '项目设置' : '初始化项目';
  $('#ldDirSub').textContent = project.name;
  $('#ldDirSub').title = project.name;
  renderDirModal();
  ldShow('#ldDirOverlay');
}
function renderDirModal() {
  var status = ldProjectStatus(dirProjectId);
  var info = status.info;
  if (!info) return;
  var busy = dirPulling ? ' disabled' : '';
  var defaultPath = ldDefaultPath(tkProjectById(dirProjectId));
  var target = dirMode === 'existing' ? dirPath : defaultPath;
  $('#ldDirBody').innerHTML = (dirSettings && !status.ready ? '<div class="ld-warn"><span>' + ldEsc(status.reason) + '</span></div>' : '')
    + (status.authOk ? '<p class="ld-dir-account"><span title="' + ldEsc(ldAuthUser(status.auth) + ' · ' + info.host) + '">账号：' + ldEsc(ldAuthUser(status.auth)) + ' · ' + ldEsc(info.host) + '</span><button type="button" class="ld-link" data-ld-auth-open="' + ldEsc(info.host) + '"' + busy + '>更换账号</button></p>'
      : '<div class="ld-warn"><span>未登录 ' + ldEsc(info.host) + ' 的 Git 账号，登录后才能下载代码</span><button type="button" class="ld-btn ld-btn--primary" data-ld-auth-open="' + ldEsc(info.host) + '">登录</button></div>')
    + '<div class="ld-field-label">代码仓库</div><p class="ld-dir-repo"><code title="' + ldEsc(info.repo) + '">' + ldEsc(info.repo.replace(/^https?:\/\//, '')) + '</code></p>'
    + '<div class="ld-field-label" id="ldDirModeLabel">项目目录</div>'
    + '<div class="ld-choice" role="radiogroup" aria-labelledby="ldDirModeLabel">'
    + '<label class="ld-choice-item"><input type="radio" name="ldDirMode" value="auto"' + (dirMode === 'auto' ? ' checked' : '') + busy + '><span>默认目录<code class="ld-choice-path" title="' + ldEsc(defaultPath) + '">' + ldEsc(defaultPath) + '</code></span></label>'
    + '<label class="ld-choice-item"><input type="radio" name="ldDirMode" value="existing"' + (dirMode === 'existing' ? ' checked' : '') + busy + '><span>自定义目录<small class="ld-choice-hint">选择工作区目录内的文件夹；已有该仓库就直接使用，否则在该目录下载代码，已有文件保留</small></span></label>'
    + '</div>'
    + (dirMode === 'existing' ? '<div class="ld-path-row"><input type="text" class="ld-input" id="ldExistingPath" readonly placeholder="未选择" value="' + ldEsc(dirPath) + '" aria-label="自定义目录"><button type="button" class="ld-btn" data-ld-pick-dir' + busy + '>选择…</button></div>' : '')
    + (dirSettings ? '<button type="button" class="ld-link" data-ld-reveal>打开目录</button>' : '')
    + (!status.writeOk ? '<div class="ld-warn"><span>' + ldEsc(status.reason) + '</span><button type="button" class="ld-btn" data-ld-auth-open="' + ldEsc(info.host) + '">更换账号</button></div>' : '')
    + (dirPulling ? '<div class="ld-progress" role="progressbar" aria-label="初始化" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + dirPulling + '"><span style="width:' + dirPulling + '%"></span></div>' : '');
  var done = $('#ldDirDone');
  /* 项目设置：目录改了才能保存，保存即在新目录完成初始化 */
  done.disabled = !status.authOk || !!dirPulling || !target || (dirSettings && target === status.binding?.path);
  done.textContent = dirPulling ? '初始化中…' : dirSettings ? '保存' : '初始化';
}
function submitDirModal() {
  var status = ldProjectStatus(dirProjectId);
  if (!status.authOk || dirPulling) return;
  if (dirMode === 'existing' && !dirPath) { toast('请先选择目录', 'warning'); return; }
  var path = dirMode === 'existing' ? dirPath : ldDefaultPath(tkProjectById(dirProjectId));
  var error = ldCheckDir(dirProjectId, path);
  if (error) { toast(ldEsc(error), 'error'); return; }
  var projectId = dirProjectId, mode = dirMode, first = !status.binding;
  dirPulling = 8;
  renderDirModal();
  var run = ++dirRun;
  var timer = setInterval(function () {
    if (dirProjectId !== projectId || run !== dirRun) { clearInterval(timer); return; }
    dirPulling = Math.min(100, dirPulling + 23);
    if (dirPulling < 100) { renderDirModal(); return; }
    clearInterval(timer);
    dirPulling = 0;
    ldBindDir(projectId, path, mode);
    var after = ldProjectStatus(projectId);
    if (!after.ready) { renderDirModal(); return; }
    ldMarkInitialized(projectId);
    ldRecordChecks(after.info.host);
    var done = dirOnReady;
    closeDirModal();
    toast(first ? '「' + ldEsc(tkProjectById(projectId)?.name || '') + '」已就绪，代码在 ' + ldEsc(path) : '项目目录已更改为 ' + ldEsc(path), 'success');
    if (done) done();
  }, 320);
}
function closeDirModal() {
  dirProjectId = '';
  dirSettings = false;
  dirRun++;
  dirOnReady = null;
  dirPulling = 0;
  ldHide('#ldDirOverlay');
}

/* ---------- 登录 Git 账号弹窗 ----------
   设置页与任务对话共用。一期只用访问令牌（浏览器登录待平台授权应用就绪后接入）。
   从项目或账号行打开时平台已知；host 为空时是「添加账号」：选 GitLab / GitHub / Gitee，GitLab 填写平台地址。 */
var LD_TOKEN_SCOPES = {
  GitHub:'需要 repo 权限，令牌保存在系统钥匙串',
  GitLab:'需要 read_user、read_repository、write_repository 权限，令牌保存在系统钥匙串',
  Gitee:'需要 user_info、projects 权限，令牌保存在系统钥匙串',
};
var LD_HOST_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/;
function ldAuthHostValue() {
  if (!authCustom) return authHost;
  if (authPlatform === 'GitHub') return 'github.com';
  if (authPlatform === 'Gitee') return 'gitee.com';
  return $('#ldAuthHost').value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
}
function ldAuthPlatformValue() { return authCustom ? authPlatform : ldHostPlatform(authHost); }
/* 平台类型：已登录的账号记着，否则取这个平台上项目的类型 */
function ldHostPlatform(host) {
  var known = ldMine().auths[host], project = ldProjectsOnHost(host)[0];
  return known?.platform || (project ? ldRepoInfo(project).platform : /github/i.test(host) ? 'GitHub' : /gitee/i.test(host) ? 'Gitee' : 'GitLab');
}
export function ldOpenAuth(host, onSaved) {
  authHost = host || '';
  authCustom = !host;
  authPlatform = 'GitLab';
  authRun++;
  authOnSaved = onSaved || null;
  $('#ldAuthHost').value = '';
  $('#ldAuthToken').value = '';
  $('#ldAuthTitle').textContent = authCustom ? '添加 Git 账号' : '登录 Git 账号';
  $('#ldAuthSub').textContent = authCustom ? '选择平台并填写访问令牌' : host + ' · ' + ldHostPlatform(host);
  renderAuthPlatform();
  setAuthError('');
  setAuthBusy(false);
  ldShow('#ldAuthOverlay');
  setTimeout(function () { (authCustom ? $('#ldAuthHost') : $('#ldAuthToken')).focus(); }, 0);
}
function renderAuthPlatform() {
  $('#ldAuthPlatformBox').hidden = !authCustom;
  $('#ldAuthHostBox').hidden = !authCustom || authPlatform !== 'GitLab';
  document.querySelectorAll('[data-ld-auth-platform]').forEach(function (btn) {
    var on = btn.getAttribute('data-ld-auth-platform') === authPlatform;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-checked', String(on));
  });
  var hint = LD_TOKEN_SCOPES[ldAuthPlatformValue()] || LD_TOKEN_SCOPES.GitLab;
  $('#ldAuthHint').textContent = hint;
  $('#ldAuthHint').title = hint;
}
function setAuthError(text) {
  var el = $('#ldAuthError');
  el.textContent = text;
  el.hidden = !text;
  $('#ldAuthToken').setAttribute('aria-invalid', text ? 'true' : 'false');
}
function setAuthBusy(busy) {
  var btn = $('#ldAuthSubmit');
  btn.disabled = busy;
  btn.textContent = busy ? '验证中…' : '验证并登录';
}
function submitAuth() {
  var host = ldAuthHostValue();
  var token = $('#ldAuthToken').value.trim();
  if (authCustom && !LD_HOST_RE.test(host)) { setAuthError('请填写正确的平台地址，如 git.kingdee.com'); $('#ldAuthHost').focus(); return; }
  if (!token) { setAuthError('请填写访问令牌'); $('#ldAuthToken').focus(); return; }
  setAuthError('');
  setAuthBusy(true);
  var run = ++authRun;
  setTimeout(function () {
    if (run !== authRun || !ldVisible('#ldAuthOverlay')) return;
    setAuthBusy(false);
    /* 演示校验：过短视为格式错误；含 expired / bad 视为无效；含 readonly 的令牌能保存，初始化时才发现缺少写权限 */
    if (token.length < 8) { setAuthError('令牌格式不正确'); return; }
    if (/expired|bad/i.test(token)) { setAuthError('令牌无效或已过期，请重新创建'); return; }
    /* 到期日由平台接口返回，演示固定 90 天 */
    saveAuth(host, { platform:ldAuthPlatformValue(), source:'token', readOnly:/readonly/i.test(token), expiresAt:new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10) });
  }, 700);
}
function saveAuth(host, entry) {
  var rechecked = ldSaveAuthEntry(host, entry);
  var done = authOnSaved;
  ldHide('#ldAuthOverlay');
  authOnSaved = null;
  /* 登录后只重新检测这个平台及其项目 */
  ldRecordChecks(host);
  toast('登录成功' + (rechecked ? '，已重新校验 ' + rechecked + ' 个项目的推送权限' : ''), 'success');
  if (dirProjectId) renderDirModal();
  ldRefresh();
  if (done) done();
}

/* ---------- 项目设置弹窗 ---------- */
/* 项目设置与初始化共用同一弹窗布局（账号、代码仓库、项目目录二选一），只有标题和主按钮不同 */
export function ldOpenProjectSettings(projectId) {
  var project = tkProjectById(projectId);
  if (!project) { toast('项目不存在或已移除', 'warning'); return; }
  toggleNavPop(false);
  ldOpenDirModal(projectId, null, true);
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
  /* 账号按仓库主机自动匹配，这里只读；没有可用账号或没有写权限时给登录入口 */
  var authValue = status.authOk ? ldEsc(ldAuthUser(auth)) + muted(' · ' + ldEsc(info.host)) : muted(auth?.expired ? '凭据失效' : '未登录 ' + ldEsc(info.host));
  var authAction = '<button type="button" class="ld-btn" data-ld-auth-open="' + ldEsc(info.host) + '">' + (status.authOk ? '更换账号' : '登录') + '</button>';
  return '<div class="ld-panel">'
    + (status.ready ? '' : '<div class="ld-warn"><span>' + ldEsc(status.reason) + '</span></div>')
    + '<dl class="ld-kv">'
    + row('Git 账号', authValue, authAction)
    + row('代码仓库', '<code title="' + ldEsc(info.repo) + '">' + ldEsc(info.repo.replace(/^https?:\/\//, '')) + '</code>' + muted(' · ' + ldEsc(info.baseBranch)))
    + row('项目目录', binding ? '<code title="' + ldEsc(binding.path) + '">' + ldEsc(binding.path) + '</code>' : muted('未初始化'),
        binding ? '<button type="button" class="ld-btn" data-ld-dir-open="' + ldEsc(project.id) + '"' + (status.authOk ? '' : ' disabled title="请先登录 Git 账号"') + '>更改目录</button><button type="button" class="ld-btn" data-ld-reveal>打开</button>'
          : '<button type="button" class="ld-btn" data-ld-dir-open="' + ldEsc(project.id) + '"' + (status.authOk ? '' : ' disabled title="请先登录 Git 账号"') + '>设置</button>')
    + '</dl>'
    + '</div>';
}
function ldRefresh() {
  renderNavStatus();
  renderLocalPage();
  if (settingsProjectId) renderProjectSettings();
  if ($('#ldNavPop') && !$('#ldNavPop').hidden) renderNavPop();
}

/* ---------- 协作开发「设置」页签 ---------- */
/* ---------- 顶部导航右上角「本地环境」状态与浮层 ----------
   有未就绪项目时橙色提示「N 个项目环境未就绪」，点开列出这些项目，每个一个「配置」；全部就绪时不显示。 */
function renderNavStatus() {
  var btn = $('#ldNavStatus');
  if (!btn) return;
  var pending = ldPendingProjects().length;
  btn.hidden = !pending;
  if (!pending) { toggleNavPop(false); return; }
  btn.querySelector('.ld-nav-text').textContent = pending + ' 个项目环境未就绪';
  btn.setAttribute('aria-label', '本地开发环境：' + pending + ' 个项目未就绪');
}
function renderNavPop() {
  var pop = $('#ldNavPop');
  var pending = ldPendingProjects();
  pop.innerHTML = '<div class="ld-pop-head"><strong>本地环境未就绪</strong><span>配置后任务才能在本机执行</span></div>'
    + '<ul class="ld-pop-list">' + pending.map(function (project) {
      var st = ldProjectStatus(project.id);
      return '<li><span class="ld-pop-name"><strong>' + ldEsc(project.name) + '</strong><small>' + ldEsc(st.reason) + '</small></span>'
        + '<span class="ld-pop-actions"><button type="button" class="ld-btn ld-btn--primary" data-ld-quick="' + ldEsc(project.id) + '">初始化</button></span></li>';
    }).join('') + '</ul>'
    + '<button type="button" class="ld-link ld-pop-more" data-ld-open-settings>在「设置」中查看全部</button>';
}
function toggleNavPop(open) {
  var pop = $('#ldNavPop'), btn = $('#ldNavStatus');
  if (!pop || !btn) return;
  if (open) {
    renderNavPop();
    pop.hidden = false;
    var rect = btn.getBoundingClientRect();
    pop.style.top = (rect.bottom + 8) + 'px';
    pop.style.left = Math.max(16, Math.min(rect.right - pop.offsetWidth, window.innerWidth - pop.offsetWidth - 16)) + 'px';
  } else pop.hidden = true;
  btn.setAttribute('aria-expanded', String(!!open));
}
var LD_ICONS = {
  refresh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
  plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  key: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8"/><path d="m16 7 3 3"/><path d="m18.5 4.5 2 2"/></svg>',
  folder: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.6l2 2.2h7.4A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/></svg>',
};
function ldListHead(cols) {
  return '<li class="ld-list-head" aria-hidden="true"><span class="ld-list-main">' + cols[0] + '</span><span class="ld-list-col">' + cols[1] + '</span><span class="ld-col-state">' + cols[2] + '</span><span class="ld-col-act">' + cols[3] + '</span></li>';
}
function ldCardHead(icon, title, actions) {
  return '<div class="ld-set-head"><h2>' + LD_ICONS[icon] + title + '</h2>' + (actions ? '<div class="ld-row-actions">' + actions + '</div>' : '') + '</div>';
}
/* ---------- 检测结果 ----------
   设置页打开时不检测，展示上次结果；点「检测」或登录、初始化成功后更新（只更新相关平台）。
   结果按登录人保存（真实客户端存本机配置目录，只有状态，不含凭据）。 */
var LD_PUBLIC_HOSTS = ['github.com', 'gitee.com'];
var LD_GIT_DOWNLOAD = /Windows/i.test(navigator.userAgent) ? 'https://git-scm.com/download/win' : /Mac/i.test(navigator.userAgent) ? 'https://git-scm.com/download/mac' : 'https://git-scm.com/downloads';
function ldAccountKey(host) {
  if (ldMine().gitMissing) return 'git';
  var auth = ldAuthFor(host);
  return !auth ? 'login' : auth.expired || auth.source === 'ssh' ? 'expired' : 'available';
}
function ldRecordChecks(host) {
  var mine = ldMine();
  var checks = mine.checks || { projects:{}, accounts:{} };
  ldMyDevProjects().forEach(function (project) {
    var info = ldRepoInfo(project);
    if (!host || info.host === host) checks.projects[project.id] = ldProjectStatus(project.id).key;
  });
  ldSettingsHosts().forEach(function (item) { if (!host || item === host) checks.accounts[item] = ldAccountKey(item); });
  var d = new Date();
  checks.checkedAt = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  mine.checks = checks;
  ldSaveMine(mine);
}
function ldDetect() {
  if (detecting) return;
  detecting = true;
  renderLocalPage();
  /* 演示：真实客户端会读取本机凭据并用 git ls-remote / 平台接口验证一次 */
  setTimeout(function () {
    detecting = false;
    ldRecordChecks();
    renderLocalPage();
    renderNavStatus();
  }, 900);
}
/* 只列项目用到的平台、已登录的平台，以及 GitHub、Gitee 公有平台 */
function ldSettingsHosts() {
  var hosts = ldMyDevProjects().map(function (project) { return ldRepoInfo(project); }).filter(function (info) { return info.valid; }).map(function (info) { return info.host; });
  return [...new Set(hosts.concat(Object.keys(ldMine().auths), LD_PUBLIC_HOSTS))];
}
var LD_ACCOUNT_LABELS = { available:'可用', login:'未登录', expired:'凭据失效', git:'Git 不可用' };
function ldStateTag(key, labels) {
  if (!key) return '<span class="ld-state is-muted">待检测</span>';
  return '<span class="ld-state ' + (key === 'available' ? 'is-ok' : ldStatusTone(key)) + '">' + ((labels || LD_STATUS_LABELS)[key] || LD_STATUS_LABELS[key]) + '</span>';
}
function ldAccountSource(auth) {
  if (auth.source === 'local') return '来自本机凭据';
  if (auth.source === 'token') return '访问令牌';
  return '浏览器登录';
}
function renderLocalPage() {
  var page = $('#ldPage');
  if (!page || !$('#cv-local')?.classList.contains('active')) return;
  var mine = ldMine();
  var checks = mine.checks || { projects:{}, accounts:{} };
  /* 列出本人参与的全部项目：有仓库的在前，没配仓库的标「未配置仓库」 */
  var all = tkProjectsForCurrentUser();
  var projects = all.filter(function (project) { return !!ldRepoInfo(project); }).concat(all.filter(function (project) { return !ldRepoInfo(project); }));
  /* 未初始化读本地即可判断，不用检测；其余按上次检测结果 */
  var keyOf = function (project) {
    var st = ldProjectStatus(project.id);
    if (!st.info) return 'norepo';
    if (st.invalid || st.ssh) return st.key;
    if (checks.projects[project.id] === 'git') return 'git';
    return st.binding ? checks.projects[project.id] : 'download';
  };
  var pending = projects.filter(function (project) { var key = keyOf(project); return key && !['ready', 'invalid', 'norepo', 'ssh'].includes(key); }).length;
  var gitMissing = Object.values(checks.accounts).includes('git') || Object.values(checks.projects).includes('git');
  var banner = gitMissing ? '<div class="ld-set-banner" role="alert"><span>本机没有安装 Git，安装后点「检测」。</span><button type="button" class="ld-set-btn ld-set-btn--primary" data-ld-download-git>下载 Git</button></div>' : '';
  var actions = (checks.checkedAt && !detecting ? '<span class="ld-checked-at">上次检测 ' + ldEsc(checks.checkedAt) + '</span>' : '')
    + '<button type="button" class="ld-set-btn" data-ld-detect' + (detecting ? ' disabled aria-busy="true"' : '') + '>' + LD_ICONS.refresh + (detecting ? '检测中…' : '检测') + '</button>'
    + '<button type="button" class="ld-set-btn ld-set-btn--primary" data-ld-auth-add>' + LD_ICONS.plus + '添加账号</button>';
  var authCard = ldCardHead('key', 'Git 账号<small>项目会自动匹配平台，登录一次即可复用</small>', actions)
    + '<ul class="ld-list ld-list--auth" aria-label="Git 账号">' + ldListHead(['平台', '账号', '状态', '操作']) + ldSettingsHosts().map(function (host) {
      var auth = ldAuthFor(host);
      var key = checks.accounts[host];
      /* 显示用户名，下方为邮箱与来源；演示邮箱取登录人邮箱，真实客户端取平台账号接口（取不到时只显示来源） */
      var detail = [ldAuthEmail(auth), auth ? ldAccountSource(auth) : ''].filter(Boolean).join(' · ');
      var account = auth ? '<strong title="' + ldEsc(ldAuthUser(auth)) + '">' + ldEsc(ldAuthUser(auth)) + '</strong><span title="' + ldEsc(detail) + '">' + ldEsc(detail) + '</span>' : '<span>—</span>';
      return '<li><span class="ld-list-main"><strong>' + ldEsc(ldHostPlatform(host)) + '</strong><span>' + ldEsc(host) + '</span></span>'
        + '<span class="ld-list-col ld-list-user">' + account + '</span>'
        + '<span class="ld-col-state">' + ldStateTag(key, LD_ACCOUNT_LABELS) + '</span>'
        + '<span class="ld-col-act"><button type="button" class="ld-set-btn' + (auth ? '' : ' ld-set-btn--primary') + '" data-ld-auth-open="' + ldEsc(host) + '">' + (auth ? '重新登录' : '登录') + '</button></span></li>';
    }).join('') + '</ul>';
  var projectCard = ldCardHead('folder', '我的项目' + (pending ? '<small class="ld-set-count">' + pending + ' 个项目需要处理</small>' : ''))
    + (projects.length ? '<ul class="ld-list" aria-label="我的项目">' + ldListHead(['项目', '项目目录', '状态', '操作']) + projects.map(function (project) {
      var st = ldProjectStatus(project.id);
      var key = keyOf(project);
      /* 未初始化的项目不显示路径，目录在初始化弹窗里选择 */
      var dir = st.binding;
      var reason = key === 'norepo' ? '项目没有配置代码仓库，请在项目设置中填写仓库地址' : st.reason;
      return '<li><span class="ld-list-main"><strong title="' + ldEsc(project.name) + '">' + ldEsc(project.name) + '</strong><span title="' + ldEsc(st.info?.repo || '') + '">' + ldEsc(st.info?.repo || '—') + '</span></span>'
        + '<span class="ld-list-col">' + (dir && !st.invalid && !st.ssh ? '<code title="' + ldEsc(dir.path) + '">' + ldEsc(dir.path) + '</code>' : '—') + '</span>'
        + '<span class="ld-col-state" title="' + ldEsc(key && key !== 'ready' ? reason : '') + '">' + ldStateTag(key) + '</span>'
        + '<span class="ld-col-act">' + (key === 'invalid' || key === 'norepo' ? '<span class="ld-muted" title="' + ldEsc(reason) + '">在项目设置中修正</span>'
          : key === 'ssh' ? '<span class="ld-muted">—</span>'
          : key === 'download' ? '<button type="button" class="ld-set-btn ld-set-btn--primary" data-ld-quick="' + ldEsc(project.id) + '">初始化</button>'
          : '<button type="button" class="ld-set-btn ld-set-btn--primary" data-ld-project-settings="' + ldEsc(project.id) + '">设置</button>') + '</span></li>';
    }).join('') + '</ul>'
      : '<div class="ld-set-empty">暂无项目</div>');
  page.innerHTML = banner
    + '<section class="ld-set-card">' + authCard + '</section>'
    + '<section class="ld-set-card">' + projectCard + '</section>'
    + '<div class="ld-demo-links"><button type="button" class="ld-link ld-reset" data-ld-reset>演示：清空本机配置</button>'
    + '<button type="button" class="ld-link ld-reset" data-ld-toggle-git>' + (mine.gitMissing ? '演示：恢复已安装 Git' : '演示：模拟未安装 Git') + '</button></div>';
}

/* ---------- 显示与事件 ---------- */
function ldShow(sel) { var el = $(sel); el.style.display = 'flex'; el.setAttribute('aria-hidden', 'false'); }
function ldHide(sel) { var el = $(sel); el.style.display = 'none'; el.setAttribute('aria-hidden', 'true'); }
function ldVisible(sel) { var el = $(sel); return !!el && el.style.display !== 'none'; }

export function initLocalDev() {
  if (!$('#ldDirOverlay')) return;
  renderNavStatus();
  /* 切到「设置」页签时渲染页面 */
  var panel = $('#cv-local');
  if (panel) new MutationObserver(renderLocalPage).observe(panel, { attributes:true, attributeFilter:['class'] });
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    if (!t.closest('#ldNavPop, #ldNavStatus') && $('#ldNavPop') && !$('#ldNavPop').hidden) toggleNavPop(false);
    if (t.closest('[data-ld-dir-close]') || t.id === 'ldDirOverlay') { closeDirModal(); return; }
    if (t.closest('[data-ld-project-close]') || t.id === 'ldProjectOverlay') { closeProjectSettings(); return; }
    if (t.closest('[data-ld-auth-close]') || t.id === 'ldAuthOverlay') { ldHide('#ldAuthOverlay'); authOnSaved = null; return; }
    if (t.closest('#ldDirDone')) { submitDirModal(); return; }
    if (t.closest('#ldAuthSubmit')) { submitAuth(); return; }
    if (t.closest('#ldAuthCreate') && !LD_HOST_RE.test(ldAuthHostValue())) { setAuthError('请先填写正确的平台地址，如 git.kingdee.com'); $('#ldAuthHost').focus(); return; }
    if (t.closest('#ldAuthCreate')) {
      toast('已打开 ' + ldEsc(ldTokenPage(ldAuthPlatformValue(), ldAuthHostValue())) + '，读写仓库权限已预填（演示）');
      return;
    }
    var platformPick = t.closest('[data-ld-auth-platform]');
    if (platformPick) { authPlatform = platformPick.getAttribute('data-ld-auth-platform'); setAuthError(''); renderAuthPlatform(); return; }
    var authOpen = t.closest('[data-ld-auth-open]');
    if (authOpen) { ldOpenAuth(authOpen.getAttribute('data-ld-auth-open'), null); return; }
    if (t.closest('[data-ld-auth-add]')) { ldOpenAuth('', null); return; }
    if (t.closest('[data-ld-detect]')) { ldDetect(); return; }
    if (t.closest('[data-ld-download-git]')) { toast('已打开 ' + LD_GIT_DOWNLOAD + '（演示）'); return; }
    if (t.closest('[data-ld-toggle-git]')) {
      var gitState = ldMine();
      gitState.gitMissing = !gitState.gitMissing;
      ldSaveMine(gitState);
      toast(gitState.gitMissing ? '已模拟未安装 Git，点「检测」查看提示' : '已恢复，点「检测」更新状态');
      ldRefresh();
      return;
    }
    var setupOpen = t.closest('[data-ld-setup-open]');
    if (setupOpen) { ldOpenSetup(setupOpen.getAttribute('data-ld-setup-open')); return; }
    var projectSettings = t.closest('[data-ld-project-settings]');
    if (projectSettings) { ldOpenProjectSettings(projectSettings.getAttribute('data-ld-project-settings')); return; }
    var dirOpen = t.closest('[data-ld-dir-open]');
    if (dirOpen) { ldOpenDirModal(dirOpen.getAttribute('data-ld-dir-open')); return; }
    if (t.closest('#ldNavStatus')) { toggleNavPop($('#ldNavPop').hidden); return; }
    var quick = t.closest('[data-ld-quick]');
    if (quick) { toggleNavPop(false); ldQuickSetup(quick.getAttribute('data-ld-quick')); return; }
    if (t.closest('[data-ld-open-settings]')) { toggleNavPop(false); window.cvSwitchView?.('local'); return; }
    if (t.closest('[data-ld-pick-dir]')) {
      dirPath = ldPickDir(ldProjectStatus(dirProjectId).info);
      renderDirModal();
      return;
    }
    if (t.closest('[data-ld-reveal]')) { toast('已打开项目目录（演示）'); return; }
    if (t.closest('[data-ld-reset]')) {
      ldSaveMine({ auths:{}, bindings:{}, checks:null, gitMissing:false });
      ldRefresh();
      toast('已清空本机配置', 'success');
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t instanceof HTMLInputElement && t.name === 'ldDirMode') { dirMode = t.value; renderDirModal(); return; }
  });
  document.addEventListener('input', function (e) {
    if (e.target instanceof HTMLElement && (e.target.id === 'ldAuthHost' || e.target.id === 'ldAuthToken')) setAuthError('');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.id === 'ldAuthHost') { e.preventDefault(); $('#ldAuthToken').focus(); return; }
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.id === 'ldAuthToken') { e.preventDefault(); submitAuth(); return; }
    if (e.key !== 'Escape') return;
    if ($('#ldNavPop') && !$('#ldNavPop').hidden) { e.stopPropagation(); toggleNavPop(false); $('#ldNavStatus').focus(); return; }
    if (ldVisible('#ldAuthOverlay')) { e.stopPropagation(); ldHide('#ldAuthOverlay'); authOnSaved = null; }
    else if (ldVisible('#ldDirOverlay')) { e.stopPropagation(); closeDirModal(); }
    else if (ldVisible('#ldProjectOverlay')) { e.stopPropagation(); closeProjectSettings(); }
  }, true);
  window.addEventListener('resize', function () { toggleNavPop(false); });
  /* 进入协作开发（相当于打开客户端）时只检查就绪状态，不自动读取本机凭据 */
  document.addEventListener('lingee:collab-menu-open', renderNavStatus);
}
