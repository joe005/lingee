import { gitRemoteKey, gitRepoProblem } from '../../../core/git-url.js';
import { tkCurrentUserId, tkGetPerson, tkProjectById, tkProjectsForCurrentUser } from '../../tasks-v2/data.js';

/* 本地开发 · 数据核心：本机状态存储、仓库解析、Git 账号、空间就绪判断、目录绑定与检测结果。
   只放数据和判断，不渲染界面；状态变化后调用 ldRefresh() 广播 lingee:local-dev-changed，
   设置页、导航提醒、各弹窗各自监听并重绘，互不直接调用渲染函数。
   就绪状态是「人 + 设备」维度的：真实客户端把各空间状态上报服务端，自动启动按阶段处理人查询；
   原型按登录人保存在浏览器本地存储里模拟上报，演示时可在设置页清空。 */

export var LD_KEY = 'lingee_local_dev_v1';
/* ---------- 存储 ---------- */
export function ldReadAll() {
  try { return JSON.parse(localStorage.getItem(LD_KEY) || '{}') || {}; } catch (e) { return {}; }
}
/* 某个人上报的本机状态；不传时为当前登录人 */
export function ldStateOf(userId) {
  var row = ldReadAll()[userId || tkCurrentUserId() || 'guest'] || {};
  var mine = Object.assign({}, row, { auths: row.auths || {}, bindings: row.bindings || {}, knownHosts: row.knownHosts || [], checks: row.checks || null, gitMissing: !!row.gitMissing, netDown: !!row.netDown });
  /* 公司 GitLab 的主机名是 git.kingdee.com：旧缓存里按 gitlab.kingdee.com 保存的账号迁过来（凭据按主机名匹配，名字不同就用不上） */
  if (mine.auths['gitlab.kingdee.com'] && !mine.auths['git.kingdee.com']) mine.auths['git.kingdee.com'] = mine.auths['gitlab.kingdee.com'];
  delete mine.auths['gitlab.kingdee.com'];
  ldEnsureDemoReady(mine, userId || tkCurrentUserId());
  return mine;
}
export function ldMine() { return ldStateOf(); }
export function ldSaveMine(mine) {
  var all = ldReadAll(), me = tkCurrentUserId() || 'guest';
  all[me] = mine;
  try { localStorage.setItem(LD_KEY, JSON.stringify(all)); } catch (e) { /* 存储不可用时仅本次会话有效 */ }
}

/* 吴晓锋（p23）的演示空间默认已完成认证与目录准备；不涉及真实 Git 凭据或拉取。
   按空间仓库补种，兼容已有缓存和稍后才恢复的空间；用户主动重绑或清空后不重复覆盖。 */
export function ldEnsureDemoReady(mine, userId) {
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
export function ldEsc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
}
export var ldRemoteKey = gitRemoteKey;
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
export function ldRemoteProtocol(url) { return /^https?:\/\//i.test(String(url || '').trim()) ? 'https' : 'ssh'; }
export function ldCloneUrl(info) { return info.httpsRepo; }
export function ldAuthProtocol() { return 'https'; }
export function ldBindingProtocol(binding) { return binding?.protocol || 'https'; }
/* 空间目录：与任务执行（harness）同一目录。默认为工作区目录下的「空间名」文件夹，可改为工作区目录内的其他文件夹；
   任务执行只接受工作区目录内的目录，所以不能选 ~/Projects 等其他位置。工作区目录按登录身份区分，演示固定一个。 */
export var LD_WORKSPACE_ROOT = '~/lingeebuild/workspaces/<身份>';
export function ldDefaultPath(project) { return LD_WORKSPACE_ROOT + '/' + String(project?.name || project?.id || 'project').replace(/[\\/:*?"<>|]/g, '-'); }
export function ldInsideWorkspace(path) { return String(path || '').indexOf(LD_WORKSPACE_ROOT + '/') === 0; }
/* 空间目录绑定：与任务执行共用，写在工作区目录的 .lingee-project-bindings 下，不改动仓库文件 */
export function ldLocalConfigPath(projectId) { return LD_WORKSPACE_ROOT + '/.lingee-project-bindings/' + projectId + '.json'; }
export function ldNow() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* ---------- Git 账号 ----------
   浏览器登录要用平台上注册的 OAuth 应用：公有平台由 Lingee 内置；自建平台（如 git.kingdee.com）
   需要管理员在「系统集成」里登记应用后才开启，否则使用访问令牌。演示数据：自建平台都未开启。 */
export var LD_OAUTH_HOSTS = ['github.com', 'gitlab.com', 'gitee.com'];
export function ldOauthSupported(host) { return LD_OAUTH_HOSTS.includes(String(host || '').toLowerCase()); }
/* 一期只静默检测 HTTPS 凭据，不读取 SSH 密钥。正式实现用 `git credential fill`（protocol=https、host=<主机>）向凭据库查询是否存了凭据，
   不能以 ls-remote / clone 成功为准：公开仓库匿名就能读，读成功不代表本机有凭据，推送时照样鉴权失败。演示：github.com 有本机凭据。 */
export var LD_LOCAL_CREDS = [
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
export function ldPushIssue(auth) { return auth ? auth.pushIssue || (auth.readOnly ? 'scope' : '') : ''; }
export function ldPushCheck(auth) { return !ldPushIssue(auth); }
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
export function ldSaveAuthEntry(host, entry) {
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
export function ldAuthFor(host, userId) {
  var auth = ldStateOf(userId).auths[host];
  if (!auth) return null;
  var today = new Date().toISOString().slice(0, 10), soon = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  var expired = !!auth.expiresAt && auth.expiresAt < today;
  /* 到期前 7 天提醒重新创建令牌，避免任务突然鉴权失败 */
  return Object.assign({}, auth, { expired:expired, expiring:!expired && !!auth.expiresAt && auth.expiresAt <= soon });
}
/* 账号按仓库主机自动匹配；写权限针对具体仓库，保存账号时判断不了，拉取或绑定目录时校验并记在 binding.writable 上 */
export var LD_STATUS_LABELS = { ready:'已就绪', download:'未初始化', login:'未登录', expired:'凭据失效', noaccess:'无权访问', offline:'无法连接', mismatch:'目录不匹配', git:'Git 不可用', invalid:'地址不规范', notfound:'仓库不存在', norepo:'未配置仓库', ssh:'SSH 仓库', unchecked:'待检测' };
/* 状态颜色：已就绪绿，未初始化黄，地址无效、凭据失效红，其余橙 */
export function ldStatusTone(key) { return key === 'ready' ? 'is-ok' : key === 'download' ? 'is-pending' : ['invalid', 'expired', 'notfound'].includes(key) ? 'is-danger' : ['unchecked', 'norepo', 'ssh'].includes(key) ? 'is-muted' : 'is-warn'; }
export function ldProjectStatus(projectId, userId) {
  var info = ldRepoInfo(tkProjectById(projectId));
  if (!info) return { needed:false, ready:true };
  if (!info.valid) return { needed:true, ready:false, invalid:true, info:info, key:'invalid', label:LD_STATUS_LABELS.invalid, reason:'Git 地址不规范：' + info.problem + '。' + ldRepoFixHint(tkProjectById(projectId)) };
  /* 一期本页只管 HTTPS；SSH 地址按本机已有 SSH 配置使用，不检测、不初始化 */
  if (ldRemoteProtocol(info.repo) !== 'https') return { needed:false, ready:true, ssh:true, info:info, key:'ssh', label:'SSH 仓库', reason:'一期不支持 SSH 地址：请在 Manage 把代码仓库改成 HTTPS 地址，再在这里登录 Git 账号' };
  var auth = ldAuthFor(info.host, userId);
  var binding = ldStateOf(userId).bindings[projectId] || null;
  /* Git 不可用时仍带上账号与目录，卡片照常显示账号和已绑定目录 */
  if (ldStateOf(userId).gitMissing) return { needed:true, ready:false, info:info, auth:auth, authOk:!!auth && !auth.expired, writeOk:true, protocolOk:true, binding:binding, key:'git', label:'Git 不可用', reason:'本机没有安装 Git，点「安装 Git」由智能体帮你完成安装' };
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
export function ldRepoFixHint(project) {
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
export function ldNetCheck(info, auth) {
  if (!info?.valid || ldRemoteProtocol(info.repo) !== 'https') return null;
  if (ldMine().netDown || /offline/i.test(info.repo)) return { key:'offline', reason:'连不上 ' + info.host + '，请检查网络或代理；公司内部平台需要连接内网或 VPN' };
  if (auth && !auth.expired && /private|missing/i.test(info.repo)) return { key:'notfound', reason:'找不到这个仓库：地址可能有误，或 ' + ldAuthUser(auth) + ' 没有访问权限。请确认地址或更换账号' };
  return null;
}
/* 设置页和顶部提示用的状态：地址不规范实时判断；无法连接、仓库不存在取上次检测结果；未初始化读本地；其余按上次检测结果 */
export function ldProjectView(project) {
  var st = ldProjectStatus(project.id);
  var checks = ldMine().checks || {};
  var last = (checks.projects || {})[project.id];
  if (!st.info) return { st:st, key:'norepo', reason:'没有配置代码仓库，' + ldRepoFixHint(project).replace(/修改$/, '填写') };
  if (st.invalid || st.ssh) return { st:st, key:st.key, reason:st.reason };
  /* Git 是否可用随本机实时判断，不等「检测」 */
  if (st.key === 'git') return { st:st, key:'git', reason:st.reason };
  if (last === 'offline' || last === 'notfound') return { st:st, key:last, reason:(checks.reasons || {})[project.id] || '' };
  return { st:st, key:st.binding ? last : 'download', reason:st.reason };
}
/* 开发空间：有仓库地址、Manage 里的研发类空间，或协作开发自己的空间（不带 space:'manage'）。新建任务的空间下拉也用它 */
export function ldIsDevProject(project) { return !!project && (!!String(project.repo || '').trim() || project.containsRd === true || project.space !== 'manage'); }
/* 有仓库的空间；设置页「我的空间」另外列出没配仓库的开发空间 */
export function ldMyDevProjects() {
  return tkProjectsForCurrentUser().filter(function (project) { return !!ldRepoInfo(project); });
}
export function ldProjectsOnHost(host) {
  return ldMyDevProjects().filter(function (project) { return ldRepoInfo(project).host === host; });
}
/* 需要本人配置的空间；地址无效的要到 Manage 修正，SSH 仓库不检测，都不算在内 */
export function ldPendingProjects() {
  return ldMyDevProjects().filter(function (project) { var status = ldProjectStatus(project.id); return !status.ready && !status.invalid; });
}
/* 顶部提示：需要本人配置的空间，加上地址不规范、上次检测连不上或找不到仓库的空间（地址问题要找管理员改，也提示出来） */
export function ldAttentionProjects() {
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
export function ldPickDir(info) { return LD_WORKSPACE_ROOT + '/' + info.name; }

/* ---------- 检测结果 ----------
   设置页打开时不检测，展示上次结果；点「检测」或登录、初始化成功后更新（只更新相关平台）。
   结果按登录人保存（真实客户端存本机配置目录，只有状态，不含凭据）。 */
var LD_PUBLIC_HOSTS = ['github.com', 'gitee.com'];
export var LD_ACCOUNT_LABELS = { available:'可用', expiring:'即将过期', login:'未登录', expired:'凭据失效', git:'Git 不可用' };
export function ldAccountKey(host) {
  if (ldMine().gitMissing) return 'git';
  var auth = ldAuthFor(host);
  return !auth ? 'login' : auth.expired || auth.source === 'ssh' ? 'expired' : 'available';
}
/* 只列空间用到的平台、已登录的平台，以及 GitHub、Gitee 公有平台 */
export function ldSettingsHosts() {
  var hosts = ldMyDevProjects().map(function (project) { return ldRepoInfo(project); }).filter(function (info) { return info.valid; }).map(function (info) { return info.host; });
  return [...new Set(hosts.concat(Object.keys(ldMine().auths), LD_PUBLIC_HOSTS))];
}
export function ldRecordChecks(host) {
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
/* 「检测」：演示里 0.9 秒后写入结果；真实客户端读取本机凭据并用 git ls-remote / 平台接口验证一次 */
var detecting = false;
export function ldIsDetecting() { return detecting; }
export function ldDetect() {
  if (detecting) return;
  detecting = true;
  ldRefresh();
  setTimeout(function () {
    detecting = false;
    ldRecordChecks();
    ldRefresh();
  }, 900);
}
/* 设置页「我的空间」列出的开发空间：有仓库的在前，没配仓库的标「未配置仓库」 */
export function ldSettingsProjects() {
  var all = tkProjectsForCurrentUser().filter(ldIsDevProject);
  return all.filter(function (project) { return !!ldRepoInfo(project); }).concat(all.filter(function (project) { return !ldRepoInfo(project); }));
}

/* ---------- 执行前检查（只读本机，不联网） ----------
   AI 执行启动前只看本机绑定记录、目录、目录里的仓库远端与 Git 是否可用；不拉代码、不校验远端权限。
   initialized 为 true 即可直接执行；凭据、网络等问题由执行过程报错，不在这一步拦截。
   同一空间短时间内多次启动复用一次结果（演示 3 秒），任何状态变化（ldRefresh）后清空。 */
var preflightCache = new Map();
export function ldPreflight(projectId, userId) {
  var key = (userId || tkCurrentUserId()) + ':' + projectId;
  var hit = preflightCache.get(key);
  if (hit && Date.now() - hit.at < 3000) return hit.result;
  var status = ldProjectStatus(projectId, userId);
  var binding = status.binding;
  var initialized = !status.needed || (!!binding && status.protocolOk !== false && !ldStateOf(userId).gitMissing);
  var result = { status:status, initialized:initialized };
  preflightCache.set(key, { at:Date.now(), result:result });
  return result;
}

/* ---------- 广播与显示工具 ---------- */
export function ldRefresh() {
  preflightCache.clear();
  document.dispatchEvent(new CustomEvent('lingee:local-dev-changed'));
}
export function ldShow(sel) { var el = document.querySelector(sel); el.style.display = 'flex'; el.setAttribute('aria-hidden', 'false'); }
export function ldHide(sel) { var el = document.querySelector(sel); el.style.display = 'none'; el.setAttribute('aria-hidden', 'true'); }
export function ldVisible(sel) { var el = document.querySelector(sel); return !!el && el.style.display !== 'none'; }
/* 平台类型：已登录的账号记着，否则取这个平台上空间的类型 */
export function ldHostPlatform(host) {
  var known = ldMine().auths[host], project = ldProjectsOnHost(host)[0];
  return known?.platform || (project ? ldRepoInfo(project).platform : /github/i.test(host) ? 'GitHub' : /gitee/i.test(host) ? 'Gitee' : 'GitLab');
}
/* Git 对话安装的进度：idle 未发起，running 安装中，waiting 等待用户在对话里确认，failed 失败，按登录人保存 */
export function ldGitInstallState() { return ldMine().gitInstall || { status:'idle' }; }
export function ldSaveGitInstall(next) {
  var mine = ldMine();
  mine.gitInstall = next;
  ldSaveMine(mine);
}
export function ldSetGitMissing(missing) {
  var mine = ldMine();
  mine.gitMissing = !!missing;
  if (!missing) mine.gitInstall = { status:'idle' };
  ldSaveMine(mine);
}
