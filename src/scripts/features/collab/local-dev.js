import { $ } from '../../core/dom.js';
import { gitRemoteKey, gitRepoProblem, gitRepoUrlError } from '../../core/git-url.js';
import { toast } from '../../core/toast.js';
import { tkBranchNameError } from '../tasks-v2/git-branch.js';
import { tkCurrentStageHandlerId, tkCurrentUserId, tkGetPerson, tkProjectById, tkProjectsForCurrentUser, tkUpdateTask } from '../tasks-v2/data.js';

/* 本地开发环境：开发在 Lingee 桌面客户端本地执行。
   - Git 随客户端内置，不要求用户安装；
   - Git 账号按平台（主机）登录一次，所有空间按仓库主机自动匹配，不在空间里另选；
     一期登录方式：浏览器登录（平台已开启时）、访问令牌；不检测或配置 SSH。
   - 空间初始化到本机目录一次：默认是工作区目录下的「空间名」文件夹（与任务执行同一目录），可改为工作区目录内的其他文件夹；
     目录里已有该仓库就直接使用，否则在原目录就地初始化并保留已有文件；
   设置页和顶部「本地环境」浮层里每个空间只有一个「初始化」：先在弹窗确认账号与目录（可更改目录），再初始化；
   「我的空间」列出本人参与的全部研发空间，没配仓库的标「未配置仓库」，SSH 地址标「SSH 仓库」不检测；
   设置页打开时不检测，展示上次检测结果（按人保存），点「检测」才检测；没有 Git 时引导下载；
   本人手动开始任务时，环境未就绪则打开「准备执行环境」；原「本地环境配置」对话入口继续保留；
   换账号、改目录在「空间设置」弹窗里。
   协作开发「设置」页签负责查看和修改：Git 账号、我的空间两张卡片，更改目录用弹窗。
   「新建空间」：与 Manage「新建空间」同格式（名称、目标、Git 地址 + 基准分支），Git 地址自动校验格式与连通性，另选本机目录，一次完成 Manage 开发空间创建与本机初始化；
   设置页入口暂时隐藏；新建任务的空间下拉保留入口（lingee:repo-project-new 事件），权限与 Manage「新建空间」一致。
   就绪状态是「人 + 设备」维度的：真实客户端把各空间状态上报服务端，自动启动按阶段处理人查询；
   原型按登录人保存在浏览器本地存储里模拟上报，演示时可在设置页清空。 */

var LD_KEY = 'lingee_local_dev_v1';
var dirProjectId = '';
var dirTask = null;
var dirReturnFocus = null;
var dirMode = 'auto';        /* 初始化弹窗：auto 默认目录，existing 自定义目录 */
var dirPath = '';            /* 自定义目录 */
var dirSettings = false;     /* 空间设置：同一弹窗，主按钮为「保存」 */
var dirPulling = 0;
var authHost = '';
var authOnSaved = null;
var authCustom = false;      /* 「添加账号」：由用户选择平台，自建 GitLab 填写地址 */
var authPlatform = 'GitLab';
var detecting = false;
var localSettingsTab = 'spaces';
var dirOnReady = null;
var dirRun = 0;
var authRun = 0;
var settingsProjectId = '';
var repoCheck = null;        /* 新建空间：地址检查结果 { url, host, path, name, platform, state, message, branch, desc, readOnly } */
var repoCheckTimer = 0;
var repoDirMode = 'auto';    /* 空间目录：auto 默认目录，existing 自定义目录 */
var repoDirPath = '';
var repoOnCreated = null;    /* 建好（或选了已有空间）后回调空间 ID，新建任务用它选中空间 */
var repoProgress = 0;
var repoRun = 0;
var dirNetError = '';        /* 初始化时连通性检查失败的原因，显示在弹窗里 */

/* ---------- 存储 ---------- */
function ldReadAll() {
  try { return JSON.parse(localStorage.getItem(LD_KEY) || '{}') || {}; } catch (e) { return {}; }
}
/* 某个人上报的本机状态；不传时为当前登录人 */
function ldStateOf(userId) {
  var row = ldReadAll()[userId || tkCurrentUserId() || 'guest'] || {};
  var mine = Object.assign({}, row, { auths: row.auths || {}, bindings: row.bindings || {}, knownHosts: row.knownHosts || [], checks: row.checks || null, gitMissing: !!row.gitMissing, netDown: !!row.netDown });
  /* 公司 GitLab 的主机名是 git.kingdee.com：旧缓存里按 gitlab.kingdee.com 保存的账号迁过来（凭据按主机名匹配，名字不同就用不上） */
  if (mine.auths['gitlab.kingdee.com'] && !mine.auths['git.kingdee.com']) mine.auths['git.kingdee.com'] = mine.auths['gitlab.kingdee.com'];
  delete mine.auths['gitlab.kingdee.com'];
  ldEnsureDemoReady(mine, userId || tkCurrentUserId());
  return mine;
}
function ldMine() { return ldStateOf(); }
function ldSaveMine(mine) {
  var all = ldReadAll(), me = tkCurrentUserId() || 'guest';
  all[me] = mine;
  try { localStorage.setItem(LD_KEY, JSON.stringify(all)); } catch (e) { /* 存储不可用时仅本次会话有效 */ }
}

/* 吴晓锋（p23）的演示空间默认已完成认证与目录准备；不涉及真实 Git 凭据或拉取。
   按空间仓库补种，兼容已有缓存和稍后才恢复的空间；用户主动重绑或清空后不重复覆盖。 */
function ldEnsureDemoReady(mine, userId) {
  if (userId !== 'p23' || userId !== tkCurrentUserId() || mine.demoDefaultsDisabled) return;
  var seeded = mine.demoReadyRepos || {}, changed = false;
  tkProjectsForCurrentUser().forEach(function(project){
    var info = ldRepoInfo(project);
    if (!info || !info.valid || ldRemoteProtocol(info.repo) !== 'https' || seeded[project.id] === info.repo) return;
    var auth = mine.auths[info.host];
    if (!auth || (auth.expiresAt && auth.expiresAt < new Date().toISOString().slice(0,10))) {
      mine.auths[info.host] = { platform:info.platform, username:ldGitUsername(), account:tkGetPerson(userId)?.name || '吴晓锋',
        source:'local', sourceLabel:'演示预配置', scopes:['read_repository','write_repository'], expiresAt:'', savedAt:ldNow() };
    }
    if (!mine.bindings[project.id]) {
      mine.bindings[project.id] = { path:ldDefaultPath(project), mode:'auto', protocol:'https', writable:true, branch:info.baseBranch, syncedAt:ldNow() };
    }
    mine.gitMissing = false;
    if (!mine.knownHosts.includes(info.host)) mine.knownHosts.push(info.host);
    if (!mine.checks) mine.checks = { projects:{}, accounts:{} };
    mine.checks.projects = mine.checks.projects || {}; mine.checks.accounts = mine.checks.accounts || {};
    mine.checks.projects[project.id] = 'ready'; mine.checks.accounts[info.host] = 'ready';
    seeded[project.id] = info.repo;
    changed = true;
  });
  if (changed) {
    mine.demoReadyRepos = seeded;
    mine.detectedAt = mine.detectedAt || ldNow();
    ldSaveMine(mine);
  }
}

/* ---------- 仓库解析 ---------- */
function ldEsc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
var ldRemoteKey = gitRemoteKey;
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
  /* Manage 空间同时保存 HTTPS 与 SSH 克隆地址（平台接口的 http_url_to_repo / ssh_url_to_repo）；
     没填 SSH 地址时按 git@<主机>:<路径>.git 推出。自建平台的 SSH 端口常常不是 22，写在 ssh:// 地址里 */
  var sshRepo = String(project.sshRepo || '').trim() || 'git@' + host + ':' + path + '.git';
  var portMatch = sshRepo.match(/^ssh:\/\/[^/]*:(\d+)\//i);
  var httpsRepo = /^https?:\/\//i.test(repo) ? repo : 'https://' + host + '/' + path + '.git';
  /* Manage 新建和修改时已做同一套静态校验，这里兜底历史数据 */
  var problem = gitRepoProblem(repo);
  return { repo:repo, valid:!problem, problem:problem, httpsRepo:httpsRepo, sshRepo:sshRepo, sshPort:portMatch ? Number(portMatch[1]) : 22,
    host:host, path:path, name:name, platform:platform, baseBranch:project.baseBranch || 'main' };
}
function ldRemoteProtocol(url) { return /^https?:\/\//i.test(String(url || '').trim()) ? 'https' : 'ssh'; }
export function ldCloneUrl(info) { return info.httpsRepo; }
function ldAuthProtocol() { return 'https'; }
function ldBindingProtocol(binding) { return binding?.protocol || 'https'; }
/* 空间目录：与任务执行（harness）同一目录。默认为工作区目录下的「空间名」文件夹，可改为工作区目录内的其他文件夹；
   任务执行只接受工作区目录内的目录，所以不能选 ~/Projects 等其他位置。工作区目录按登录身份区分，演示固定一个。 */
export var LD_WORKSPACE_ROOT = '~/lingeebuild/workspaces/<身份>';
export function ldDefaultPath(project) { return LD_WORKSPACE_ROOT + '/' + String(project?.name || project?.id || 'project').replace(/[\\/:*?"<>|]/g, '-'); }
export function ldInsideWorkspace(path) { return String(path || '').indexOf(LD_WORKSPACE_ROOT + '/') === 0; }
/* 空间目录绑定：与任务执行共用，写在工作区目录的 .lingee-project-bindings 下，不改动仓库文件 */
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
/* 一期只静默检测 HTTPS 凭据，不读取 SSH 密钥。正式实现用 `git credential fill`（protocol=https、host=<主机>）向凭据库查询是否存了凭据，
   不能以 ls-remote / clone 成功为准：公开仓库匿名就能读，读成功不代表本机有凭据，推送时照样鉴权失败。演示：github.com 有本机凭据。 */
var LD_LOCAL_CREDS = [
  { host:'github.com', platform:'GitHub', source:'Git 凭据管理器' },
];
/* 静默检测：不让 Git 或凭据管理器（GCM）弹出登录提示或窗口，找不到就直接返回 */
export var LD_QUIET_ENV = 'GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never ';

/* 平台的令牌创建页：GitHub、GitLab 用地址参数预填令牌名称和权限（GitLab 较新版本才支持预填），Gitee 只打开页面 */
export function ldTokenPage(platform, host) {
  if (platform === 'GitHub') return 'https://' + host + '/settings/tokens/new?scopes=repo&description=Lingee';
  if (platform === 'Gitee') return 'https://' + host + '/profile/personal_access_tokens';
  return 'https://' + host + '/-/user_settings/personal_access_tokens?name=Lingee&scopes=read_user,read_repository,write_repository';
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
/* 推送检查：以 `GIT_TERMINAL_PROMPT=0 git push --dry-run origin HEAD:refs/heads/_cred-probe` 的结果为准（不会真推送、不建远端分支），
   不按令牌权限推断。失败分三种，提示和处理不同：
   - scope：Access denied，令牌无效、过期或没勾写权限 → 重新创建令牌并登录；
   - role：403 not allowed to push，凭据没问题但账号在仓库里角色不够 → 找空间管理员升到 Developer（GitLab）/ Write（GitHub）及以上；
   - sso：GitHub 组织开启了 SAML SSO，令牌没授权 → 到令牌页点 Configure SSO › Authorize。
   演示：令牌含 readonly 为 scope，含 norole 为 role，GitHub 令牌含 sso 为 sso */
function ldPushIssue(auth) { return auth ? auth.pushIssue || (auth.readOnly ? 'scope' : '') : ''; }
function ldPushCheck(auth) { return !ldPushIssue(auth); }
export function ldPushIssueText(auth, platform) {
  var issue = ldPushIssue(auth), user = auth ? ldAuthUser(auth) : '';
  if (issue === 'role') return user + ' 在这个仓库没有推送角色，请空间管理员升为 ' + (platform === 'GitHub' ? 'Write' : 'Developer') + ' 及以上';
  if (issue === 'sso') return '令牌还没有授权组织 SSO：到 GitHub 令牌页点「Configure SSO › Authorize」后重新登录';
  if (issue === 'scope') return '令牌没有写权限（' + (platform === 'GitHub' ? 'repo' : 'write_repository') + '），请重新创建令牌并登录';
  return '';
}
/* 保存账号；换了账号后：
   - Lingee 管理的默认目录使用 HTTPS；旧原型的默认 SSH 绑定在重新登录后改为 HTTPS，指定目录保持用户自己的远端；
   - 对这个平台上已拉取的空间重新跑一次推送校验，不按账号类型推断。返回重新校验的空间数 */
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
    binding.pushIssue = ldPushIssue(auth);
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
  var today = new Date().toISOString().slice(0, 10), soon = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  var expired = !!auth.expiresAt && auth.expiresAt < today;
  /* 到期前 7 天提醒重新创建令牌，避免任务突然鉴权失败 */
  return Object.assign({}, auth, { expired:expired, expiring:!expired && !!auth.expiresAt && auth.expiresAt <= soon });
}
/* 账号按仓库主机自动匹配；写权限针对具体仓库，保存账号时判断不了，拉取或绑定目录时校验并记在 binding.writable 上 */
var LD_STATUS_LABELS = { ready:'已就绪', download:'未初始化', login:'未登录', expired:'凭据失效', noaccess:'无权访问', offline:'无法连接', mismatch:'目录不匹配', git:'Git 不可用', invalid:'地址不规范', notfound:'仓库不存在', norepo:'未配置仓库', ssh:'SSH 仓库', unchecked:'待检测' };
/* 状态颜色：已就绪绿，未初始化黄，地址无效、凭据失效红，其余橙 */
function ldStatusTone(key) { return key === 'ready' ? 'is-ok' : key === 'download' ? 'is-pending' : ['invalid', 'expired', 'notfound'].includes(key) ? 'is-danger' : ['unchecked', 'norepo', 'ssh'].includes(key) ? 'is-muted' : 'is-warn'; }
export function ldProjectStatus(projectId, userId) {
  var info = ldRepoInfo(tkProjectById(projectId));
  if (!info) return { needed:false, ready:true };
  if (!info.valid) return { needed:true, ready:false, invalid:true, info:info, key:'invalid', label:LD_STATUS_LABELS.invalid, reason:'Git 地址不规范：' + info.problem + '。' + ldRepoFixHint(tkProjectById(projectId)) };
  /* 一期本页只管 HTTPS；SSH 地址按本机已有 SSH 配置使用，不检测、不初始化 */
  if (ldRemoteProtocol(info.repo) !== 'https') return { needed:false, ready:true, ssh:true, info:info, key:'ssh', label:'SSH 仓库', reason:'一期不支持 SSH 地址：请在 Manage 把代码仓库改成 HTTPS 地址，再在这里登录 Git 账号' };
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
      : key === 'download' ? '空间代码尚未初始化到本机'
      : key === 'mismatch' ? '空间目录不是该空间的 HTTPS 仓库，请重新选择或使用默认目录，原目录保持不变'
      : key === 'noaccess' ? (ldPushIssueText(binding.pushIssue ? { pushIssue:binding.pushIssue, username:ldAuthUser(auth) } : auth, info.platform) || ldAuthUser(auth) + ' 没有该仓库的推送权限') : '' };

}
/* 谁来改地址：Manage 空间由能管理空间的人（负责人、空间管理员、系统管理员，与 Manage 一致）在「空间设置 › 代码仓库」修改；
   协作开发自己的空间由负责人在空间设置中修改 */
function ldRepoFixHint(project) {
  var me = tkCurrentUserId(), person = tkGetPerson(me);
  if (project?.space === 'manage') {
    var admins = (project.adminIds || []).filter(Boolean);
    if (admins.includes(me) || person?.workspaceRole === 'system_admin' || (person && project.owner === person.name)) return '请到 Manage「空间设置 › 代码仓库」修改';
    var names = admins.map(function (id) { return tkGetPerson(id)?.name; }).filter(Boolean);
    return '请联系空间管理员' + (names.length ? ' ' + names.join('、') : '') + ' 到 Manage「空间设置 › 代码仓库」修改';
  }
  var owner = project?.owner || '';
  return owner && owner !== tkGetPerson(me)?.name ? '请联系空间负责人 ' + owner + ' 在空间设置中修改' : '请在空间设置中修改';
}
/* 连通性：真实客户端用 git ls-remote 检查。连不上主机为「无法连接」；登录后仍拿不到仓库为「仓库不存在」（平台不区分不存在与无权访问）。
   「检测」和初始化时检查，结果记在 checks 里，下次检测或初始化成功前一直显示。
   演示：地址含 offline 或打开「演示：模拟网络不通」视为连不上，含 private / missing 视为仓库不存在 */
function ldNetCheck(info, auth) {
  if (!info?.valid || ldRemoteProtocol(info.repo) !== 'https') return null;
  if (ldMine().netDown || /offline/i.test(info.repo)) return { key:'offline', reason:'连不上 ' + info.host + '，请检查网络或代理；公司内部平台需要连接内网或 VPN' };
  if (auth && !auth.expired && /private|missing/i.test(info.repo)) return { key:'notfound', reason:'找不到这个仓库：地址可能有误，或 ' + ldAuthUser(auth) + ' 没有访问权限。请确认地址或更换账号' };
  return null;
}
/* 设置页和顶部提示用的状态：地址不规范实时判断；无法连接、仓库不存在取上次检测结果；未初始化读本地；其余按上次检测结果 */
function ldProjectView(project) {
  var st = ldProjectStatus(project.id);
  var checks = ldMine().checks || {};
  var last = (checks.projects || {})[project.id];
  if (!st.info) return { st:st, key:'norepo', reason:'没有配置代码仓库，' + ldRepoFixHint(project).replace(/修改$/, '填写') };
  if (st.invalid || st.ssh) return { st:st, key:st.key, reason:st.reason };
  if (last === 'git') return { st:st, key:'git', reason:'本机没有安装 Git，安装后点「检测」' };
  if (last === 'offline' || last === 'notfound') return { st:st, key:last, reason:(checks.reasons || {})[project.id] || '' };
  return { st:st, key:st.binding ? last : 'download', reason:st.reason };
}
/* 开发空间：有仓库地址、Manage 里的研发类空间，或协作开发自己的空间（不带 space:'manage'）。新建任务的空间下拉也用它 */
export function ldIsDevProject(project) { return !!project && (!!String(project.repo || '').trim() || project.containsRd === true || project.space !== 'manage'); }
/* 有仓库的空间；设置页「我的空间」另外列出没配仓库的开发空间 */
function ldMyDevProjects() {
  return tkProjectsForCurrentUser().filter(function (project) { return !!ldRepoInfo(project); });
}
function ldProjectsOnHost(host) {
  return ldMyDevProjects().filter(function (project) { return ldRepoInfo(project).host === host; });
}
/* 需要本人配置的空间；地址无效的要到 Manage 修正，SSH 仓库不检测，都不算在内 */
export function ldPendingProjects() {
  return ldMyDevProjects().filter(function (project) { var status = ldProjectStatus(project.id); return !status.ready && !status.invalid; });
}
/* 顶部提示：需要本人配置的空间，加上地址不规范、上次检测连不上或找不到仓库的空间（地址问题要找管理员改，也提示出来） */
function ldAttentionProjects() {
  var pendingIds = ldPendingProjects().map(function (project) { return project.id; });
  return ldMyDevProjects().filter(function (project) {
    var key = ldProjectView(project).key;
    return key === 'invalid' || key === 'offline' || key === 'notfound' || pendingIds.includes(project.id);
  });
}

/* ---------- 空间目录 ---------- */
/* 记录空间目录绑定（任务执行读同一份）；mode 为 auto（默认目录）或 existing（更改过的目录） */
export function ldBindDir(projectId, path, mode) {
  var info = ldRepoInfo(tkProjectById(projectId));
  var mine = ldMine();
  var auth = info ? mine.auths[info.host] : null;
  mine.bindings[projectId] = { path:path, mode:mode, protocol:ldAuthProtocol(auth), branch:info?.baseBranch || 'main', writable:ldPushCheck(auth), pushIssue:ldPushIssue(auth), syncedAt:ldNow() };
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
   - 必须在工作区目录内；目录里是别的仓库、已被其他空间使用、或已有文件与仓库文件同名时失败，原目录和原绑定不变；
   - 原目录下还有任务工作区时不允许更改目录（进行中的任务封存时要找原执行目录）。
   演示：路径含 outside 视为工作区外，含 other / 别的 视为别的仓库，含 used 视为已被其他空间使用，含 conflict 视为同名文件冲突，
   空间设置里路径含 busy 的原目录视为还有任务工作区。 */
export function ldCheckDir(projectId, path) {
  var current = ldMine().bindings[projectId];
  if (!ldInsideWorkspace(path) || /outside/i.test(path)) return '空间目录必须在工作区目录（' + LD_WORKSPACE_ROOT + '）内';
  if (current && current.path !== path && /busy/i.test(current.path)) return '原目录下还有任务工作区，请等任务完成并封存后再更改目录';
  if (/other|别的/.test(path)) return '目录里的仓库与空间仓库地址不一致';
  if (/used/i.test(path)) return '该目录已被其他空间使用';
  if (/conflict/i.test(path)) return '目录里已有文件与仓库文件同名，Git 未覆盖。请移走或改名这些文件后重试';
  return '';
}
/* 演示：系统目录选择器打开在工作区目录，固定返回其中的 <仓库名> 文件夹 */
function ldPickDir(info) { return LD_WORKSPACE_ROOT + '/' + info.name; }

/* ---------- 打开智能配置（对话） ----------
   由「本地环境配置」技能在对话里完成，一次对话只配置一个空间：检查 Git → Git 账号 → 空间目录 → 拉取代码 → 初始化本机配置。
   onReady 在空间就绪后由对话里的「继续执行任务」按钮调用。 */
export function ldOpenSetup(projectId, options) {
  if (!ldRepoInfo(tkProjectById(projectId))) { toast('该空间未配置代码仓库，无需准备本地环境', 'warning'); return; }
  var invalid = ldProjectStatus(projectId);
  if (invalid.invalid) { toast(ldEsc(invalid.reason), 'warning'); return; }
  toggleNavPop(false);
  closeProjectSettings();
  document.dispatchEvent(new CustomEvent('lingee:local-env-chat', { detail:{ projectIds:[projectId], onReady:options?.onReady || null } }));
}

/* ---------- 任务启动前自检 ----------
   按当前阶段处理人的设备状态判断（任务在处理人的电脑上执行）。
   处理人本人手动开始：进入准备执行环境弹窗，配好后接着执行；自动启动（阶段自动流转、保存并启动）或由别人触发：
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
/* 返回 true 表示可以直接执行；false 时已按场景处理（打开环境准备弹窗或转阻塞） */
export function ldGateTaskStart(task, options) {
  if (!task || !['planned','backlog'].includes(task.status)) return true;
  var me = tkCurrentUserId();
  var handlerId = tkCurrentStageHandlerId(task) || me;
  var status = ldProjectStatus(task.project, handlerId);
  if (status.ready && status.auth?.expiring && handlerId === me) toast(ldEsc(status.info.host) + ' 的访问令牌将于 ' + ldEsc(status.auth.expiresAt) + ' 到期，到期后任务会鉴权失败，请到「设置」重新登录', 'warning');
  if (status.ready) return true;
  if (options?.automatic || handlerId !== me) {
    var reason = handlerId === me ? status.reason : (tkGetPerson(handlerId)?.name || '处理人') + ' 的电脑上' + status.reason;
    ldBlockTaskForEnv(task, reason);
    toast('「' + ldEsc(task.title) + '」未启动：本地环境未就绪', 'warning');
    return false;
  }
  ldOpenDirModal(task.project, options?.onReady);
  dirTask = { id:task.id, title:task.title };
  $('#ldDirTitle').textContent = '准备执行环境';
  $('#ldDirOverlay').classList.add('ld-task-preparation');
  $('#ldDirOverlay [data-ld-dir-close].sync-modal__btn').textContent = '暂不执行';
  renderDirModal();
  return false;
}

/* ---------- 配置（设置页每个空间一个按钮） ----------
   1. 没有账号时先用本机已有的 HTTPS 凭据（点击即同意读取）；都没有就打开登录弹窗，登录后自动继续；
   2. 打开空间目录弹窗：默认目录或指定目录，确认后在弹窗里拉取（或校验已有目录），校验推送权限，写入本机配置；
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

/* ---------- 初始化空间 / 更改空间目录 ----------
   初始化前在弹窗里选择默认目录或自定义目录（工作区目录内）；已初始化的空间在「空间设置」里更改目录。
   目录里已有该仓库就直接使用，否则在原目录就地初始化并保留已有文件；校验失败时原目录和原绑定不变。 */
export function ldOpenDirModal(projectId, onReady, settings) {
  var project = tkProjectById(projectId);
  if (!ldRepoInfo(project)) { toast('该空间未配置代码仓库', 'warning'); return; }
  var binding = ldMine().bindings[projectId];
  dirTask = null;
  dirReturnFocus = document.activeElement;
  $('#ldDirOverlay').classList.remove('ld-task-preparation');
  $('#ldDirOverlay [data-ld-dir-close].sync-modal__btn').textContent = '取消';
  dirProjectId = projectId;
  dirRun++;
  dirOnReady = onReady || null;
  dirSettings = !!settings && !!binding;
  dirMode = binding && binding.path !== ldDefaultPath(project) ? 'existing' : 'auto';
  dirPath = dirMode === 'existing' ? binding.path : '';
  dirPulling = 0;
  dirNetError = '';
  $('#ldDirTitle').textContent = dirSettings ? '空间设置' : '初始化空间';
  $('#ldDirSub').textContent = project.name;
  $('#ldDirSub').title = project.name;
  renderDirModal();
  ldShow('#ldDirOverlay');
}
function renderDirModal() {
  if (dirTask) { renderTaskPreparation(); return; }
  var status = ldProjectStatus(dirProjectId);
  var info = status.info;
  if (!info) return;
  var busy = dirPulling ? ' disabled' : '';
  var defaultPath = ldDefaultPath(tkProjectById(dirProjectId));
  var target = dirMode === 'existing' ? dirPath : defaultPath;
  $('#ldDirBody').setAttribute('aria-busy', String(!!dirPulling));
  $('#ldDirBody').innerHTML = (dirPulling ? ldInitializationProgress(info) : '') + (dirSettings && !status.ready ? '<div class="ld-warn"><span>' + ldEsc(status.reason) + '</span></div>' : '')
    + '<div class="ld-config-row"><span class="ld-config-label">Git 账号</span><div class="ld-config-value ld-config-account">' +
    (status.authOk ? '<span>' + ldEsc(ldAuthUser(status.auth)) + ' <span class="ld-muted">· ' + ldEsc(info.host) + '</span></span><button type="button" class="ld-btn" data-ld-auth-open="' + ldEsc(info.host) + '"' + busy + '>更换账号</button>'
      : '<span class="ld-muted">未登录 ' + ldEsc(info.host) + '</span><button type="button" class="ld-btn" data-ld-auth-open="' + ldEsc(info.host) + '">登录</button>') + '</div></div>'
    + '<div class="ld-config-row"><span class="ld-config-label">代码仓库</span><div class="ld-config-value">' + ldReadonlyRepoHtml(info, false) + '</div></div>'
    + '<div class="ld-config-row ld-config-row--directory"><span class="ld-config-label" id="ldDirModeLabel">空间目录</span><div class="ld-config-value">'
    + '<div class="ld-choice ld-directory-cards" role="radiogroup" aria-labelledby="ldDirModeLabel">'
    + '<label class="ld-choice-item"><input type="radio" name="ldDirMode" value="auto"' + (dirMode === 'auto' ? ' checked' : '') + busy + '><span><strong>默认目录</strong><code class="ld-choice-path" title="' + ldEsc(defaultPath) + '">' + ldEsc(defaultPath) + '</code></span></label>'
    + '<label class="ld-choice-item"><input type="radio" name="ldDirMode" value="existing"' + (dirMode === 'existing' ? ' checked' : '') + busy + '><span><strong>自定义目录</strong><small>选择工作区目录内的文件夹</small></span></label>'
    + '</div>'
    + (dirMode === 'existing' ? '<div class="ld-path-row"><input type="text" class="ld-input" id="ldExistingPath" readonly placeholder="未选择" value="' + ldEsc(dirPath) + '" aria-label="自定义目录"><button type="button" class="ld-btn" data-ld-pick-dir' + busy + '>选择…</button></div>' : '') + '</div></div>'
    + (dirNetError ? '<div class="ld-warn" role="alert"><span>' + ldEsc(dirNetError) + '</span>' + (/找不到/.test(dirNetError) ? '<button type="button" class="ld-btn" data-ld-auth-open="' + ldEsc(info.host) + '">更换账号</button>' : '') + '</div>' : '')
    + (!status.writeOk ? '<div class="ld-warn"><span>' + ldEsc(status.reason) + '</span><button type="button" class="ld-btn" data-ld-auth-open="' + ldEsc(info.host) + '">更换账号</button></div>' : '')
    ;
  var done = $('#ldDirDone');
  /* 空间设置：目录改了才能保存，保存即在新目录完成初始化 */
  done.disabled = !status.authOk || !!dirPulling || !target || (dirSettings && target === status.binding?.path);
  done.textContent = dirPulling ? '正在初始化…' : dirSettings ? '保存' : '初始化';
}
/* 参照 Manage 的 Git 地址与分支组合，仅展示，不在本机设置中修改。 */
function ldReadonlyRepoHtml(info, showLabel) {
  return (showLabel === false ? '' : '<div class="ld-field-label">代码仓库</div>') + '<div class="ld-repo-readonly">' +
    '<code class="ld-repo-readonly-url" aria-label="Git 地址">' + ldEsc(info.repo) + '</code>' +
    '<span class="ld-repo-readonly-branch" aria-label="基准分支：' + ldEsc(info.baseBranch) + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10"/><path d="M18 10c0 4-6 3-12 7"/></svg><code>' + ldEsc(info.baseBranch) + '</code></span></div>';
}
function ldInitializationProgress(info) {
  var stages = ['校验仓库访问权限', '获取基准分支最新代码', '准备本机代码目录', '校验分支与推送权限'];
  var current = dirPulling === 0 ? -1 : dirPulling < 24 ? 0 : dirPulling < 56 ? 1 : dirPulling < 80 ? 2 : dirPulling < 100 ? 3 : 4;
  var label = current < 0 ? '等待开始' : current === 4 ? '准备完成' : stages[current];
  return '<section class="ld-init-progress" aria-label="初始化进度"><div class="ld-init-progress-head"><strong role="status">' + (dirPulling === 100 ? '初始化完成' : dirPulling ? '正在初始化，请稍候' : '等待初始化') + '</strong><span>' + dirPulling + '%</span></div>' +
    (dirPulling && dirPulling < 100 ? '<p class="ld-hint">正在从 <code>origin/' + ldEsc(info.baseBranch) + '</code> 获取最新代码。大型仓库可能需要较长时间，请保持网络连接。</p>' : '') +
    '<p class="ld-hint">' + label + '</p>' +
    '<div class="ld-progress" role="progressbar" aria-label="初始化基准分支 ' + ldEsc(info.baseBranch) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + dirPulling + '"><span style="width:' + dirPulling + '%"></span></div>' +
    '<ol class="ld-init-stages">' + stages.map(function (stage, index) {
      var done = current > index;
      return '<li class="' + (done ? 'is-done' : current === index ? 'is-current' : '') + '"><span aria-hidden="true">' + (done ? '✓' : index + 1) + '</span>' + stage + (index === 1 ? ' · ' + ldEsc(info.baseBranch) : '') + '</li>';
    }).join('') + '</ol></section>';
}
/* 首次执行在当前任务内完成准备，复用账号授权与目录初始化，不修改任务状态。 */
function renderTaskPreparation() {
  var status = ldProjectStatus(dirProjectId);
  var info = status.info;
  if (!info) return;
  if (status.invalid) {
    $('#ldDirBody').setAttribute('aria-busy', String(!!dirPulling));
  $('#ldDirBody').innerHTML = (dirPulling ? ldInitializationProgress(info) : '') + '<div class="ld-prep-intro"><strong>代码仓库需要管理员完善</strong><p>' + ldEsc(status.reason) + '</p></div>';
    $('#ldDirDone').disabled = true;
    $('#ldDirDone').textContent = '等待仓库配置';
    return;
  }
  var mine = ldMine(), auth = ldAuthFor(info.host);
  var gitOk = !mine.gitMissing;
  var authOk = !!auth && !auth.expired;
  var directoryOk = !!status.binding && status.protocolOk !== false;
  var busy = dirPulling ? ' disabled' : '';
  var target = dirMode === 'existing' ? dirPath : ldDefaultPath(tkProjectById(dirProjectId));
  function step(number, title, done, text, actions, body) {
    return '<li class="ld-prep-step"><span class="ld-step-mark' + (done ? ' is-done' : '') + '">' + (done ? '✓' : number) + '</span><div class="ld-step-main"><div class="ld-step-title">' + title + '<span class="ld-prep-state' + (done ? ' is-done' : '') + '">' + (done ? '已就绪' : '待完成') + '</span></div><p class="ld-step-text">' + text + '</p>' + (body || '') + '</div>' + (actions || '') + '</li>';
  }
  var login = '<button type="button" class="ld-btn" data-ld-auth-open="' + ldEsc(info.host) + '"' + busy + '>' + (authOk ? '更换账号' : '登录 Git 账号') + '</button>';
  var choices = '<div class="ld-choice" role="radiogroup" aria-label="本机目录">' +
    '<label class="ld-choice-item"><input type="radio" name="ldDirMode" value="auto"' + (dirMode === 'auto' ? ' checked' : '') + busy + '><span>默认目录<code class="ld-prep-path">' + ldEsc(ldDefaultPath(tkProjectById(dirProjectId))) + '</code></span></label>' +
    '<label class="ld-choice-item"><input type="radio" name="ldDirMode" value="existing"' + (dirMode === 'existing' ? ' checked' : '') + busy + '><span>自定义目录</span></label></div>' +
    (dirMode === 'existing' ? '<div class="ld-path-row"><input class="ld-input" readonly aria-label="本机目录" value="' + ldEsc(dirPath) + '" placeholder="请选择目录"><button type="button" class="ld-btn" data-ld-pick-dir' + busy + '>选择目录</button></div>' : '');
  $('#ldDirBody').innerHTML = '<div class="ld-prep-intro"><strong>' + ldEsc(dirTask.title) + '</strong><p>首次在本机执行此空间的任务，需要准备以下环境。完成后将继续当前任务。</p></div>' +
    ldReadonlyRepoHtml(info) +
    '<ol class="ld-steps">' +
    step(1, 'Git 工具', gitOk, gitOk ? '客户端已具备 Git 执行能力' : '本机 Git 不可用，请安装后重新检测', gitOk ? '' : '<div class="ld-row-actions"><button type="button" class="ld-btn" data-ld-download-git>获取 Git</button><button type="button" class="ld-btn" data-ld-prep-recheck>重新检测</button></div>') +
    step(2, 'Git 账号与权限', authOk && status.writeOk !== false, authOk ? ldEsc(ldAuthUser(auth)) + ' · ' + ldEsc(info.host) + (status.writeOk === false ? '，当前仓库无推送权限，请重新授权或联系仓库管理员' : '；准备时将校验仓库访问与推送权限') : '登录 ' + ldEsc(info.host) + ' 后即可访问此空间的仓库', login) +
    step(3, '本机代码目录', directoryOk, directoryOk ? '复用已初始化的目录' : '按下方基准分支获取最新代码；可使用默认目录或选择其他目录，已有文件会保留', '', directoryOk ? '<code class="ld-prep-path">' + ldEsc(status.binding.path) + '</code>' : choices) + '</ol>' +
    (dirNetError ? '<p class="ld-error" role="alert">' + ldEsc(dirNetError) + '</p>' : '') +
    (!status.ready && !dirPulling ? ldInitializationProgress(info) : '') +
    '<p class="ld-hint">账号按 Git 平台复用，目录按空间保存。后续可在「设置」中修改。</p>';
  var done = $('#ldDirDone');
  done.disabled = !gitOk || !authOk || !!dirPulling || !target;
  done.textContent = dirPulling ? '正在初始化…' : status.ready ? '开始执行任务' : '完成配置并开始执行';
}
function submitDirModal() {
  var status = ldProjectStatus(dirProjectId);
  if (!status.authOk || dirPulling) return;
  if (dirTask && status.ready) { var ready = dirOnReady; closeDirModal(); if (ready) ready(); return; }
  if (dirMode === 'existing' && !dirPath) { toast('请先选择目录', 'warning'); return; }
  var path = dirMode === 'existing' ? dirPath : ldDefaultPath(tkProjectById(dirProjectId));
  var error = ldCheckDir(dirProjectId, path);
  if (error) { toast(ldEsc(error), 'error'); return; }
  /* 下载前先检查仓库能否连通，失败时原目录和原绑定不变，在弹窗里提示 */
  var net = ldNetCheck(status.info, status.auth);
  dirNetError = net ? net.reason : '';
  if (net) { ldRecordChecks(status.info.host); ldRefresh(); renderDirModal(); return; }
  var projectId = dirProjectId, mode = dirMode, first = !status.binding;
  dirPulling = 8;
  renderDirModal();
  $('#ldDirBody').scrollTop = 0;
  var run = ++dirRun;
  var timer = setInterval(function () {
    if (dirProjectId !== projectId || run !== dirRun) { clearInterval(timer); return; }
    dirPulling = Math.min(100, dirPulling + 8);
    if (dirPulling < 100) { renderDirModal(); return; }
    clearInterval(timer);
    ldBindDir(projectId, path, mode);
    var after = ldProjectStatus(projectId);
    if (!after.ready) { dirPulling = 0; dirNetError = after.reason; renderDirModal(); return; }
    ldMarkInitialized(projectId);
    ldRecordChecks(after.info.host);
    renderDirModal();
    setTimeout(function () {
      if (dirProjectId !== projectId || run !== dirRun) return;
      var done = dirOnReady;
      closeDirModal();
      toast(first ? '「' + ldEsc(tkProjectById(projectId)?.name || '') + '」已就绪，已获取 ' + ldEsc(status.info.baseBranch) + ' 最新代码，目录：' + ldEsc(path) : '空间目录已更改为 ' + ldEsc(path), 'success');
      if (done) done();
    }, 600);
  }, 900);
}
function closeDirModal() {
  dirTask = null;
  dirProjectId = '';
  dirNetError = '';
  dirSettings = false;
  dirRun++;
  dirOnReady = null;
  dirPulling = 0;
  ldHide('#ldDirOverlay');
  $('#ldDirBody').setAttribute('aria-busy', 'false');
  if (dirReturnFocus?.isConnected) dirReturnFocus.focus();
  dirReturnFocus = null;
}

/* ---------- 登录 Git 账号弹窗 ----------
   设置页与任务对话共用。一期只用访问令牌（浏览器登录待平台授权应用就绪后接入）。
   从空间或账号行打开时平台已知；host 为空时是「添加账号」：选 GitLab / GitHub / Gitee，GitLab 填写平台地址。 */
var LD_KD_GITLAB = 'git.kingdee.com';
/* 获取访问令牌的步骤，按平台展开显示；权限只在步骤里说明，输入框下只提示保存位置 */
var LD_TOKEN_GUIDE = {
  GitHub:['打开 GitHub，进入 Settings › Developer settings › Personal access tokens', '经典令牌（classic）勾选 repo；或用细粒度令牌（Fine-grained），把 Contents 设为 Read and write', '组织开启了 SSO 时，在令牌旁点「Configure SSO › Authorize」，否则推送组织仓库会被拒', '复制令牌（只显示一次），粘贴到上方输入框'],
  GitLab:['打开 {host}，进入头像菜单 › Edit profile › Access tokens', '点「Add new token」，勾选 read_user、read_repository、write_repository，选一个到期时间（到期前 7 天 Lingee 会提醒）', '创建后复制令牌（只显示一次），粘贴到上方输入框'],
  Gitee:['打开 Gitee，进入设置 › 安全设置 › 私人令牌', '点「生成新令牌」，勾选 user_info、projects', '提交后复制令牌，粘贴到上方输入框'],
};
var LD_HOST_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/;
function ldAuthHostValue() {
  if (!authCustom) return authHost;
  if (authPlatform === 'KDGitLab') return LD_KD_GITLAB;
  if (authPlatform === 'GitHub') return 'github.com';
  if (authPlatform === 'Gitee') return 'gitee.com';
  return $('#ldAuthHost').value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
}
function ldAuthPlatformValue() { return authCustom ? (authPlatform === 'KDGitLab' ? 'GitLab' : authPlatform) : ldHostPlatform(authHost); }
/* 平台类型：已登录的账号记着，否则取这个平台上空间的类型 */
function ldHostPlatform(host) {
  var known = ldMine().auths[host], project = ldProjectsOnHost(host)[0];
  return known?.platform || (project ? ldRepoInfo(project).platform : /github/i.test(host) ? 'GitHub' : /gitee/i.test(host) ? 'Gitee' : 'GitLab');
}
export function ldOpenAuth(host, onSaved) {
  authHost = host || '';
  authCustom = !host;
  authPlatform = 'KDGitLab';
  authRun++;
  authOnSaved = onSaved || null;
  $('#ldAuthHost').value = '';
  $('#ldAuthToken').value = '';
  $('#ldAuthTitle').textContent = authCustom ? '添加 Git 账号' : '登录 Git 账号';
  $('#ldAuthSub').textContent = authCustom ? '' : host + ' · ' + ldHostPlatform(host);
  $('#ldAuthGuide').open = false;
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
  var fixedHost = authCustom && authPlatform !== 'GitLab' ? ldAuthHostValue() : '';
  $('#ldAuthHostShow').hidden = !fixedHost;
  $('#ldAuthHostShow').textContent = fixedHost ? '地址：' + fixedHost : '';
  $('#ldAuthHint').textContent = '令牌只保存在本机系统钥匙串';
  var guideHost = ldAuthHostValue() || '你的 GitLab';
  $('#ldAuthGuideSteps').innerHTML = (LD_TOKEN_GUIDE[ldAuthPlatformValue()] || LD_TOKEN_GUIDE.GitLab).map(function (step) {
    return '<li>' + ldEsc(step.replace('{host}', guideHost)) + '</li>';
  }).join('');
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
    /* 演示校验：过短视为格式错误；含 expired / bad 视为无效；含 readonly / norole / sso（GitHub）的令牌能保存，
       推送校验（push --dry-run）时才发现问题；含 soon 的令牌 5 天后到期，用来演示到期提醒 */
    if (token.length < 8) { setAuthError('令牌格式不正确'); return; }
    if (/expired|bad/i.test(token)) { setAuthError('令牌无效或已过期，请重新创建'); return; }
    /* 到期日由平台接口返回，演示固定 90 天 */
    var pushIssue = /readonly/i.test(token) ? 'scope' : /norole/i.test(token) ? 'role' : /sso/i.test(token) && ldAuthPlatformValue() === 'GitHub' ? 'sso' : '';
    saveAuth(host, { platform:ldAuthPlatformValue(), source:'token', pushIssue:pushIssue, expiresAt:new Date(Date.now() + (/soon/i.test(token) ? 5 : 90) * 864e5).toISOString().slice(0, 10) });
  }, 700);
}
function saveAuth(host, entry) {
  var rechecked = ldSaveAuthEntry(host, entry);
  var done = authOnSaved;
  ldHide('#ldAuthOverlay');
  authOnSaved = null;
  /* 登录后只重新检测这个平台及其空间 */
  ldRecordChecks(host);
  toast('登录成功' + (rechecked ? '，已重新校验 ' + rechecked + ' 个空间的推送权限' : ''), 'success');
  if (dirProjectId) renderDirModal();
  ldRefresh();
  if (done) done();
}

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
  import('../manager/data.js').then(function (manager) {
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

/* ---------- 空间设置弹窗 ---------- */
/* 空间设置与初始化共用同一弹窗布局（账号、代码仓库、空间目录二选一），只有标题和主按钮不同 */
export function ldOpenProjectSettings(projectId) {
  var project = tkProjectById(projectId);
  if (!project) { toast('空间不存在或已移除', 'warning'); return; }
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
  if (!status.needed) return '<div class="ld-panel"><p class="ld-empty">该空间没有代码仓库。</p></div>';
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
    + row('代码仓库', '<code title="' + ldEsc(info.repo) + '">' + ldEsc(info.repo) + '</code>' + muted(' · ' + ldEsc(info.baseBranch)))
    + row('空间目录', binding ? '<code title="' + ldEsc(binding.path) + '">' + ldEsc(binding.path) + '</code>' : muted('未初始化'),
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
   有未就绪空间时橙色提示「N 个空间环境未就绪」，点开列出这些空间，每个一个「配置」；全部就绪时不显示。 */
function renderNavStatus() {
  var btn = $('#ldNavStatus');
  if (!btn) return;
  var pending = ldAttentionProjects().length;
  btn.hidden = !pending;
  if (!pending) { toggleNavPop(false); return; }
  btn.querySelector('.ld-nav-text').textContent = pending + ' 个空间环境未就绪';
  btn.setAttribute('aria-label', '本地开发环境：' + pending + ' 个空间未就绪');
}
function renderNavPop() {
  var pop = $('#ldNavPop');
  var pending = ldAttentionProjects();
  pop.innerHTML = '<div class="ld-pop-head"><strong>本地环境未就绪</strong><span>配置后任务才能在本机执行</span></div>'
    + '<ul class="ld-pop-list">' + pending.map(function (project) {
      var view = ldProjectView(project);
      return '<li><span class="ld-pop-name"><strong>' + ldEsc(project.name) + '</strong><small title="' + ldEsc(view.reason) + '">' + ldEsc(view.reason) + '</small></span>'
        + '<span class="ld-pop-actions">' + ldProjectAction(project, view, 'ld-btn') + '</span></li>';
    }).join('') + '</ul>'
    + '<button type="button" class="ld-link ld-pop-more" data-ld-open-settings>在「设置」中查看全部</button>';
}
function toggleNavPop(open) {
  var pop = $('#ldNavPop'), btn = $('#ldNavStatus');
  if (!pop || !btn) return;
  if (open) {
    /* 打开前先按最新数据重算，数字和列表保持一致 */
    renderNavStatus();
    if (btn.hidden) return;
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
  return '<div class="ld-set-head"><h2>' + (LD_ICONS[icon] || '') + title + '</h2>' + (actions ? '<div class="ld-row-actions">' + actions + '</div>' : '') + '</div>';
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
  checks.reasons = checks.reasons || {};
  ldMyDevProjects().forEach(function (project) {
    var info = ldRepoInfo(project);
    if (host && info.host !== host) return;
    var status = ldProjectStatus(project.id);
    var net = status.invalid || status.key === 'git' ? null : ldNetCheck(info, status.auth);
    checks.projects[project.id] = net ? net.key : status.key;
    checks.reasons[project.id] = net ? net.reason : '';
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
/* 只列空间用到的平台、已登录的平台，以及 GitHub、Gitee 公有平台 */
function ldSettingsHosts() {
  var hosts = ldMyDevProjects().map(function (project) { return ldRepoInfo(project); }).filter(function (info) { return info.valid; }).map(function (info) { return info.host; });
  return [...new Set(hosts.concat(Object.keys(ldMine().auths), LD_PUBLIC_HOSTS))];
}
var LD_ACCOUNT_LABELS = { available:'可用', expiring:'即将过期', login:'未登录', expired:'凭据失效', git:'Git 不可用' };
function ldStateTag(key, labels) {
  if (!key) return '<span class="ld-state is-muted">待检测</span>';
  return '<span class="ld-state ' + (key === 'available' ? 'is-ok' : ldStatusTone(key)) + '">' + ((labels || LD_STATUS_LABELS)[key] || LD_STATUS_LABELS[key]) + '</span>';
}
function ldAccountSource(auth) {
  if (auth.source === 'local') return '来自本机凭据';
  if (auth.source === 'token') return '访问令牌';
  return '浏览器登录';
}
function panelSettingsNav() {
  document.querySelectorAll('#cv-local [data-ld-settings-tab]').forEach(function (button) {
    var selected = button.dataset.ldSettingsTab === localSettingsTab;
    button.classList.toggle('on', selected);
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  $('#ldDevelopmentPanel')?.setAttribute('aria-labelledby', localSettingsTab === 'git' ? 'ldGitTab' : 'ldSpacesTab');
}
function selectLocalSettingsTab(tab) {
  if (tab !== 'spaces' && tab !== 'git') return;
  localSettingsTab = tab;
  renderLocalPage();
  if ($('#ldDevelopmentPanel')) $('#ldDevelopmentPanel').scrollTop = 0;
}
function renderLocalPage() {
  var page = $('#ldPage');
  if (!page || !$('#cv-local')?.classList.contains('active')) return;
  panelSettingsNav();
  var mine = ldMine();
  var checks = mine.checks || { projects:{}, accounts:{} };
  /* 只列开发空间：有仓库地址、Manage 里的研发类空间（containsRd），或协作开发自己的空间；
     Manage 的会议、预算等普通空间不列。有仓库的在前，没配仓库的标「未配置仓库」 */
  var all = tkProjectsForCurrentUser().filter(ldIsDevProject);
  var projects = all.filter(function (project) { return !!ldRepoInfo(project); }).concat(all.filter(function (project) { return !ldRepoInfo(project); }));
  var keyOf = function (project) { return ldProjectView(project).key; };
  var pending = projects.filter(function (project) { var key = keyOf(project); return key && !['ready', 'norepo', 'ssh'].includes(key); }).length;
  var gitMissing = Object.values(checks.accounts).includes('git') || Object.values(checks.projects).includes('git');
  var expiringHost = Object.keys(mine.auths).find(function (host) { return ldAuthFor(host)?.expiring; });
  var banner = gitMissing ? '<div class="ld-set-banner" role="alert"><span>本机没有安装 Git，安装后点「检测」。</span><button type="button" class="ld-set-btn ld-set-btn--primary" data-ld-download-git>下载 Git</button></div>'
    : expiringHost ? '<div class="ld-set-banner" role="alert"><span>' + ldEsc(expiringHost) + ' 的访问令牌将于 ' + ldEsc(ldAuthFor(expiringHost).expiresAt) + ' 到期，到期后拉取和推送会失败，请重新创建令牌并登录。</span><button type="button" class="ld-set-btn ld-set-btn--primary" data-ld-auth-open="' + ldEsc(expiringHost) + '">重新登录</button></div>' : '';
  var actions = (checks.checkedAt && !detecting ? '<span class="ld-checked-at">上次检测 ' + ldEsc(checks.checkedAt) + '</span>' : '')
    + '<button type="button" class="ld-set-btn" data-ld-detect' + (detecting ? ' disabled aria-busy="true"' : '') + '>' + LD_ICONS.refresh + (detecting ? '检测中…' : '检测') + '</button>'
    + '<button type="button" class="ld-set-btn ld-set-btn--primary" data-ld-auth-add>' + LD_ICONS.plus + '添加</button>';
  var authCard = ldCardHead('key', 'Git 账号<small>空间会自动匹配平台，登录一次即可复用</small>', actions)
    + '<ul class="ld-list ld-list--auth" aria-label="Git 账号">' + ldListHead(['平台', '账号', '状态', '操作']) + ldSettingsHosts().map(function (host) {
      var auth = ldAuthFor(host);
      var key = checks.accounts[host];
      if (auth?.expiring && (!key || key === 'available')) key = 'expiring';
      /* 显示用户名，下方为邮箱与来源；演示邮箱取登录人邮箱，真实客户端取平台账号接口（取不到时只显示来源） */
      var detail = [ldAuthEmail(auth), auth ? ldAccountSource(auth) : ''].filter(Boolean).join(' · ');
      var account = auth ? '<strong title="' + ldEsc(ldAuthUser(auth)) + '">' + ldEsc(ldAuthUser(auth)) + '</strong><span title="' + ldEsc(detail) + '">' + ldEsc(detail) + '</span>' : '<span>—</span>';
      return '<li><span class="ld-list-main"><strong>' + ldEsc(ldHostPlatform(host)) + '</strong><span>' + ldEsc(host) + '</span></span>'
        + '<span class="ld-list-col ld-list-user">' + account + '</span>'
        + '<span class="ld-col-state">' + ldStateTag(key, LD_ACCOUNT_LABELS) + '</span>'
        + '<span class="ld-col-act"><button type="button" class="ld-set-btn' + (auth ? '' : ' ld-set-btn--primary') + '" data-ld-auth-open="' + ldEsc(host) + '">' + (auth ? '重新登录' : '登录') + '</button></span></li>';
    }).join('') + '</ul>';
  /* 暂时隐藏设置页的新建空间入口，保留创建流程供后续恢复。 */
  var repoNewBtn = '';
  var projectCard = ldCardHead(null, '我的空间' + (pending ? '<small class="ld-set-count">' + pending + ' 个空间需要处理</small>' : ''), repoNewBtn)
    + (projects.length ? '<ul class="ld-list" aria-label="我的空间">' + ldListHead(['空间', '空间目录', '状态', '操作']) + projects.map(function (project) {
      var view = ldProjectView(project), st = view.st, key = view.key;
      /* 未初始化的空间不显示路径，目录在初始化弹窗里选择 */
      var dir = st.binding;
      /* 地址不规范、连不上、找不到仓库、没配仓库：原因直接显示在地址下面，不只放在悬停提示里 */
      var problem = ['invalid', 'offline', 'notfound', 'norepo'].includes(key) && view.reason;
      return '<li><span class="ld-list-main"><strong title="' + ldEsc(project.name) + '">' + ldEsc(project.name) + '</strong><span title="' + ldEsc(st.info?.repo || '') + '">' + ldEsc(st.info?.repo || '—') + '</span>'
        + (problem ? '<span class="ld-row-problem' + (key === 'norepo' ? ' is-muted' : '') + '" title="' + ldEsc(view.reason) + '">' + ldEsc(view.reason) + '</span>' : '') + '</span>'
        + '<span class="ld-list-col">' + (dir && !st.invalid && !st.ssh ? '<code title="' + ldEsc(dir.path) + '">' + ldEsc(dir.path) + '</code>' : '—') + '</span>'
        + '<span class="ld-col-state" title="' + ldEsc(key && key !== 'ready' && !problem ? view.reason : '') + '">' + ldStateTag(key) + '</span>'
        + '<span class="ld-col-act">' + ldProjectAction(project, view, 'ld-set-btn') + '</span></li>';
    }).join('') + '</ul>'
      : '<div class="ld-set-empty">暂无可配置的开发空间，请联系空间管理员邀请你加入。</div>');
  page.innerHTML = (localSettingsTab === 'git'
    ? banner + '<section class="ld-set-card">' + authCard + '</section>'
    : '<section class="ld-set-card">' + projectCard + '</section>')
    + '<div class="ld-demo-links"><button type="button" class="ld-link ld-reset" data-ld-reset>演示：清空本机配置</button>'
    + '<button type="button" class="ld-link ld-reset" data-ld-toggle-git>' + (mine.gitMissing ? '演示：恢复已安装 Git' : '演示：模拟未安装 Git') + '</button>'
    + '<button type="button" class="ld-link ld-reset" data-ld-toggle-net>' + (mine.netDown ? '演示：恢复网络' : '演示：模拟网络不通') + '</button></div>';
}

/* 每个空间的操作：地址问题要找管理员改，这里不给按钮；连不上可重新检测，找不到仓库可更换账号 */
function ldProjectAction(project, view, cls) {
  var key = view.key, host = view.st.info?.host || '';
  if (key === 'invalid') return '<span class="ld-muted">待修改地址</span>';
  if (key === 'norepo') return '<span class="ld-muted">待配置仓库</span>';
  if (key === 'ssh') return '<span class="ld-muted">待改 HTTPS 地址</span>';
  if (key === 'noaccess') return view.st.binding?.pushIssue === 'role' ? '<span class="ld-muted">待管理员授权</span>' : '<button type="button" class="' + cls + ' ' + cls + '--primary" data-ld-auth-open="' + ldEsc(host) + '">重新登录</button>';
  if (key === 'offline') return '<button type="button" class="' + cls + '" data-ld-detect' + (detecting ? ' disabled' : '') + '>重新检测</button>';
  if (key === 'notfound') return '<button type="button" class="' + cls + '" data-ld-auth-open="' + ldEsc(host) + '">更换账号</button>';
  if (key === 'download' || !view.st.binding) return '<button type="button" class="' + cls + ' ' + cls + '--primary" data-ld-quick="' + ldEsc(project.id) + '">初始化</button>';
  return '<button type="button" class="' + cls + ' ' + cls + '--primary" data-ld-project-settings="' + ldEsc(project.id) + '">设置</button>';
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
  panel?.querySelector('.ld-settings-nav')?.addEventListener('keydown', function (e) {
    var button = e.target.closest('[data-ld-settings-tab]');
    if (!button || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    var tab = e.key === 'Home' ? 'spaces' : e.key === 'End' ? 'git' : localSettingsTab === 'spaces' ? 'git' : 'spaces';
    selectLocalSettingsTab(tab);
    panel.querySelector('[data-ld-settings-tab="' + tab + '"]')?.focus();
  });
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var settingsTab = t.closest('#cv-local [data-ld-settings-tab]');
    if (settingsTab) { selectLocalSettingsTab(settingsTab.dataset.ldSettingsTab); return; }
    if (!t.closest('#ldNavPop, #ldNavStatus') && $('#ldNavPop') && !$('#ldNavPop').hidden) toggleNavPop(false);
    if (t.closest('[data-ld-dir-close]') || t.id === 'ldDirOverlay') { closeDirModal(); return; }
    if (t.closest('[data-ld-project-close]') || t.id === 'ldProjectOverlay') { closeProjectSettings(); return; }
    if (t.closest('[data-ld-auth-close]') || t.id === 'ldAuthOverlay') { ldHide('#ldAuthOverlay'); authOnSaved = null; return; }
    if (t.closest('[data-ld-repo-close]') || t.id === 'ldRepoOverlay') { closeRepoModal(); return; }
    if (t.closest('#ldRepoSubmit')) { submitRepoNew(); return; }
    if (t.closest('[data-ld-repo-new]')) { ldOpenRepoNew(null); return; }
    if (t.closest('[data-ld-repo-login]') && repoCheck?.host) { ldOpenAuth(repoCheck.host, function () { repoCheck = null; runRepoCheck(); }); return; }
    if (t.closest('[data-ld-repo-recheck]')) { repoCheck = null; runRepoCheck(); return; }
    if (t.closest('[data-ld-repo-pick-dir]')) { repoDirPath = LD_WORKSPACE_ROOT + '/code/' + (repoCheck?.name || 'project'); renderRepoModal(); return; }
    if (t.closest('#ldDirDone')) { submitDirModal(); return; }
    if (t.closest('#ldAuthSubmit')) { submitAuth(); return; }
    if (t.closest('#ldAuthCreate') && !LD_HOST_RE.test(ldAuthHostValue())) { setAuthError('请先填写正确的平台地址，如 git.kingdee.com'); $('#ldAuthHost').focus(); return; }
    if (t.closest('#ldAuthCreate')) {
      /* 原型在新标签页打开真实的令牌创建页；桌面客户端里用系统浏览器打开 */
      var tokenPlatform = ldAuthPlatformValue();
      window.open(ldTokenPage(tokenPlatform, ldAuthHostValue()), '_blank', 'noopener');
      toast(tokenPlatform === 'Gitee' ? '已打开 Gitee 令牌页，请勾选 user_info、projects 后生成' : '已打开令牌创建页，名称和权限已预填');
      return;
    }
    var platformPick = t.closest('[data-ld-auth-platform]');
    if (platformPick) { authPlatform = platformPick.getAttribute('data-ld-auth-platform'); setAuthError(''); renderAuthPlatform(); return; }
    var authOpen = t.closest('[data-ld-auth-open]');
    if (authOpen) { ldOpenAuth(authOpen.getAttribute('data-ld-auth-open'), null); return; }
    if (t.closest('[data-ld-auth-add]')) { ldOpenAuth('', null); return; }
    if (t.closest('[data-ld-detect]')) { ldDetect(); return; }
    if (t.closest('[data-ld-prep-recheck]')) { renderDirModal(); return; }
    if (t.closest('[data-ld-download-git]')) { toast('已打开 ' + LD_GIT_DOWNLOAD + '（演示）'); return; }
    if (t.closest('[data-ld-toggle-git]')) {
      var gitState = ldMine();
      gitState.gitMissing = !gitState.gitMissing;
      ldSaveMine(gitState);
      toast(gitState.gitMissing ? '已模拟未安装 Git，点「检测」查看提示' : '已恢复，点「检测」更新状态');
      ldRefresh();
      return;
    }
    if (t.closest('[data-ld-toggle-net]')) {
      var netState = ldMine();
      netState.netDown = !netState.netDown;
      ldSaveMine(netState);
      toast(netState.netDown ? '已模拟网络不通，点「检测」查看提示' : '已恢复网络，点「检测」更新状态');
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
    if (t.closest('[data-ld-reveal]')) { toast('已打开空间目录（演示）'); return; }
    if (t.closest('[data-ld-reset]')) {
      ldSaveMine({ auths:{}, bindings:{}, checks:null, gitMissing:false, netDown:false, demoDefaultsDisabled:true });
      ldRefresh();
      toast('已清空本机配置', 'success');
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t instanceof HTMLInputElement && t.name === 'ldDirMode') { dirMode = t.value; renderDirModal(); return; }
    if (t instanceof HTMLInputElement && t.name === 'ldRepoDirMode') { repoDirMode = t.value; renderRepoModal(); return; }
    if (t instanceof HTMLElement && t.id === 'ldRepoBranch') {
      var custom = t.value === '__custom';
      $('#ldRepoBranchCustom').hidden = !custom;
      renderRepoModal();
      if (custom) $('#ldRepoBranchCustom').focus();
      return;
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target instanceof HTMLElement && (e.target.id === 'ldAuthHost' || e.target.id === 'ldAuthToken')) setAuthError('');
    if (e.target instanceof HTMLElement && ['ldRepoName', 'ldRepoGoal', 'ldRepoBranchCustom'].includes(e.target.id)) renderRepoModal();
    /* 地址改了就作废上次结果，停止输入 0.5 秒后自动检查 */
    if (e.target instanceof HTMLElement && e.target.id === 'ldRepoUrl') { repoRun++; repoCheck = null; renderRepoModal(); scheduleRepoCheck(500); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.id === 'ldRepoUrl') { e.preventDefault(); scheduleRepoCheck(0); return; }
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.id === 'ldAuthHost') { e.preventDefault(); $('#ldAuthToken').focus(); return; }
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.id === 'ldAuthToken') { e.preventDefault(); submitAuth(); return; }
    if (e.key !== 'Escape') return;
    if ($('#ldNavPop') && !$('#ldNavPop').hidden) { e.stopPropagation(); toggleNavPop(false); $('#ldNavStatus').focus(); return; }
    if (ldVisible('#ldAuthOverlay')) { e.stopPropagation(); ldHide('#ldAuthOverlay'); authOnSaved = null; }
    else if (ldVisible('#ldRepoOverlay')) { e.stopPropagation(); closeRepoModal(); }
    else if (ldVisible('#ldDirOverlay')) { e.stopPropagation(); closeDirModal(); }
    else if (ldVisible('#ldProjectOverlay')) { e.stopPropagation(); closeProjectSettings(); }
  }, true);
  window.addEventListener('resize', function () { toggleNavPop(false); });
  /* 进入协作开发（相当于打开客户端）时只检查就绪状态，不自动读取本机凭据 */
  document.addEventListener('lingee:collab-menu-open', renderNavStatus);
  /* 空间或任务变化（Manage 新建空间、改成员、改仓库，新建任务等）后重算「N 个空间环境未就绪」，避免数字过期 */
  document.addEventListener('lingee:mgr-projects-changed', ldRefresh);
  document.addEventListener('lingee:tasks-changed', renderNavStatus);
  /* 其他页面（新建任务的空间下拉）打开「新建空间」，detail.onCreated 收到空间（空间）ID */
  document.addEventListener('lingee:repo-project-new', function (e) { ldOpenRepoNew(e.detail?.onCreated || null); });
}
