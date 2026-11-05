import { buildRepoList, buildTaskRepoConfig, buildRepoIdentity, buildRepoResolve } from '../repository-config.js';
import { wsFlatTree, wsPathNames } from '../../../core/workspace-tree.js';
import { gitRepoProblem } from '../../../core/git-url.js';
import { tkCurrentUserId, tkGetTasks, tkGetPerson, tkProjectById, tkProjectsForCurrentUser, tkScopeProjects, tkVisibleWorkspaces } from '../../tasks-v2/data.js';

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
  var mine = Object.assign({}, row, { auths: row.auths || {}, bindings: row.bindings || {}, repoBindings: row.repoBindings || {}, scopeBindings:row.scopeBindings || {}, knownHosts: row.knownHosts || [], checks: row.checks || null, gitMissing: !!row.gitMissing, netDown: !!row.netDown });
  /* 旧空间绑定按旧仓库迁入，保留路径；不会把旧目录误绑到新覆盖的仓库。 */
  if (!mine.repoBindingsMigrated) {
    Object.keys(mine.bindings).forEach(function (id) {
      var legacy = tkProjectById(id), binding = mine.bindings[id];
      var repo = binding.repo || legacy?.repo;
      if (!repo || !binding.path) return;
      var key = ldRemoteKey(repo);
      if (!mine.repoBindings[key]) mine.repoBindings[key] = Object.assign({}, binding, {repo:repo, repoKey:key});
    });
    mine.repoBindingsMigrated = true;
    if (!userId || userId === tkCurrentUserId()) ldSaveMine(mine);
  }
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
  try { localStorage.setItem(LD_KEY, JSON.stringify(all)); return true; } catch (e) { return false; }
}

/* 吴晓锋（p23）的演示空间默认已完成认证与目录准备；不涉及真实 Git 凭据或拉取。
   按空间仓库补种，兼容已有缓存和稍后才恢复的空间；用户主动重绑或清空后不重复覆盖。 */
export function ldEnsureDemoReady(mine, userId) {
  if (userId !== 'p23' || userId !== tkCurrentUserId() || mine.demoDefaultsDisabled) return;
  var seeded = mine.demoReadyRepos || {}, changed = false;
  tkProjectsForCurrentUser().forEach(function(project){
    var info = ldRepoInfo(project);
    if (!info || !info.valid || ldRemoteProtocol(info.repo) !== 'https' || seeded[project.id]) return;
    var auth = mine.auths[info.host];
    if (!auth || (auth.expiresAt && auth.expiresAt < new Date().toISOString().slice(0,10))) {
      mine.auths[info.host] = { platform:info.platform, username:ldGitUsername(), account:tkGetPerson(userId)?.name || '吴晓锋',
        source:'local', sourceLabel:'演示预配置', scopes:['read_repository','write_repository'], expiresAt:'', savedAt:ldNow() };
    }
    if (!mine.repoBindings[info.repoKey]) {
      mine.repoBindings[info.repoKey] = { repo:info.repo, repoKey:info.repoKey, path:ldDefaultPath(project), mode:'auto', protocol:'https', writable:true, branch:info.baseBranch, syncedAt:ldNow() };
    }
    mine.gitMissing = false;
    if (!mine.knownHosts.includes(info.host)) mine.knownHosts.push(info.host);
    if (!mine.checks) mine.checks = { projects:{}, accounts:{} };
    mine.checks.projects = mine.checks.projects || {}; mine.checks.accounts = mine.checks.accounts || {};
    mine.checks.projects[info.repoKey] = 'ready'; mine.checks.accounts[info.host] = 'ready';
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
export var ldRemoteKey = buildRepoIdentity;
/* 环境引用携带解析后的配置，初始化期间配置变更也不切换仓库。 */
export function ldEnvironmentId(config) {
  return 'repo-env:' + encodeURIComponent(JSON.stringify({ repo:config.repo || '', baseBranch:config.baseBranch || 'main', name:config.name || '', spaceId:config.spaceId || '', workspaceId:config.workspaceId || '', bindingKey:config.bindingKey || '' }));
}
export function ldTargetProject(target) {
  if (typeof target === 'string' && target.startsWith('repo-env:')) {
    try { return Object.assign(JSON.parse(decodeURIComponent(target.slice(9))), { id:target, _repoResolved:true }); } catch (_) { return null; }
  }
  if (target && typeof target === 'object' && target._repoResolved) return target;
  var p = typeof target === 'object' ? target : tkProjectById(target);
  return p ? Object.assign({}, p, buildRepoResolve(p, p.workspaceId || ''), { _repoResolved:true }) : null;
}
export function ldScopeBindingKey(info) { return JSON.stringify([info.spaceId || '',info.workspaceId || '',info.repoKey || ldRemoteKey(info.repo)]); }
export function ldBindingKey(target, userId) {
  var project = ldTargetProject(target);
  if (!project) return '';
  return project.bindingKey || (project.spaceId && ldStateOf(userId).scopeBindings[ldScopeBindingKey(project)]) || ldRemoteKey(project.repo);
}
export function ldBindingFor(target, userId) {
  return ldStateOf(userId).repoBindings[ldBindingKey(target,userId)] || null;
}
export function ldTaskEnvironmentId(task, userId) {
  var p = tkProjectById(task.project), mine = ldStateOf(userId);
  var config = buildTaskRepoConfig(task, p), saved = mine.taskDirectories?.[task.id];
  var fixedKey = saved?.bindingKey || (saved ? Object.keys(mine.repoBindings).find(key => mine.repoBindings[key].path === saved.repositoryDirectory && mine.repoBindings[key].repoKey === ldRemoteKey(config.repo)) : '');
  return ldEnvironmentId(Object.assign({},config,{name:p?.name || task.title || '',spaceId:task.project,workspaceId:task.workspaceId || '',bindingKey:fixedKey || ''}));
}
export function ldRepoInfo(project) {
  project = ldTargetProject(project);
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
    host:host, path:path, name:name, platform:platform, baseBranch:project.baseBranch || 'main', repoKey:key, spaceId:project.spaceId || '', workspaceId:project.workspaceId || '', bindingKey:project.bindingKey || '' };
}
export function ldRemoteProtocol(url) { return /^https?:\/\//i.test(String(url || '').trim()) ? 'https' : 'ssh'; }
export function ldCloneUrl(info) { return info.httpsRepo; }
export function ldAuthProtocol() { return 'https'; }
export function ldBindingProtocol(binding) { return binding?.protocol || 'https'; }
/* 本机根目录：仓库克隆与隔离任务目录均位于根内，绑定按仓库归属；演示路径按登录身份隔离。 */
export var LD_WORKSPACE_ROOT = '~/lingeebuild/workspaces/<身份>';
export function ldDefaultPath(project) {
  var info = ldRepoInfo(project);
  if (!info) return '';
  var sameNames = new Set(ldMyDevProjects().map(function (p) { return ldRepoInfo(p); }).filter(function (i) { return i && i.name === info.name; }).map(function (i) { return i.repoKey; }));
  var folder = info.name;
  if (sameNames.size > 1) folder = [info.host, info.path.split('/').slice(0, -1).join('-'), info.name].filter(Boolean).join('-').replace(/[^\w.-]/g, '-');
  var saved = ldReadAll()[tkCurrentUserId() || 'guest']?.repoBindings || {};
  if (Object.keys(saved).some(function (key) { return key !== info.repoKey && saved[key].path === LD_WORKSPACE_ROOT + '/' + folder; })) folder = info.repoKey.replace(/[^\w.-]/g, '-');
  if (info.bindingKey && info.bindingKey !== info.repoKey) {
    var owner = [info.spaceId,info.workspaceId];
    try { if (info.bindingKey.startsWith('scope:')) owner = JSON.parse(info.bindingKey.slice(6)); } catch (_) {}
    folder += '-scope-' + encodeURIComponent(owner[0] + '-' + (owner[1] || 'root'));
  }
  return LD_WORKSPACE_ROOT + '/' + folder;
}
export function ldInsideWorkspace(path) {
  return String(path || '').startsWith(LD_WORKSPACE_ROOT + '/') && !String(path).split('/').includes('..') && !/[\\\x00-\x1f]/.test(String(path));
}
export function ldLocalConfigPath(target) {
  var info = ldRepoInfo(ldTargetProject(target));
  return LD_WORKSPACE_ROOT + '/.lingee-repository-bindings/' + encodeURIComponent(ldBindingKey(target) || info?.repoKey || String(target)) + '.json';
}
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
  Object.values(mine.repoBindings).forEach(function (binding) {
    if (ldRepoInfo({repo:binding.repo,_repoResolved:true})?.host !== host) return;
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
export var LD_STATUS_LABELS = { ready:'已就绪', download:'未初始化', login:'未登录', expired:'凭据失效', noaccess:'无权访问', offline:'无法连接', mismatch:'目录不匹配', git:'Git 不可用', invalid:'地址不规范', notfound:'仓库不存在', norepo:'未配置仓库', ssh:'SSH 仓库', unchecked:'待检测', missing:'目录丢失', unused:'可清理' };
/* 状态颜色：已就绪绿，未初始化黄，地址无效、凭据失效红，其余橙 */
export function ldStatusTone(key) { return key === 'ready' ? 'is-ok' : key === 'download' ? 'is-pending' : ['invalid', 'expired', 'notfound'].includes(key) ? 'is-danger' : ['unchecked', 'norepo', 'ssh'].includes(key) ? 'is-muted' : 'is-warn'; }
export function ldProjectStatus(projectId, userId) {
  var info = ldRepoInfo(ldTargetProject(projectId));
  if (!info) return { needed:true, ready:false, key:'norepo', label:'未配置仓库', reason:'当前范围未配置代码仓库，请到 Build「设置 › 仓库」配置' };
  if (!info.valid) return { needed:true, ready:false, invalid:true, info:info, key:'invalid', label:LD_STATUS_LABELS.invalid, reason:'Git 地址不规范：' + info.problem + '。' + ldRepoFixHint(ldTargetProject(projectId)) };
  /* 一期本页只管 HTTPS；SSH 地址按本机已有 SSH 配置使用，不检测、不初始化 */
  if (ldRemoteProtocol(info.repo) !== 'https') return { needed:true, ready:false, ssh:true, info:info, key:'ssh', label:'SSH 仓库', reason:'请到 Build「设置 › 仓库」把地址改为 HTTPS 后准备本机环境' };
  var auth = ldAuthFor(info.host, userId);
  var binding = ldBindingFor(projectId,userId);
  /* Git 不可用时仍带上账号与目录，卡片照常显示账号和已绑定目录 */
  if (ldStateOf(userId).gitMissing) return { needed:true, ready:false, info:info, auth:auth, authOk:!!auth && !auth.expired, writeOk:true, protocolOk:true, binding:binding, key:'git', label:'Git 不可用', reason:'本机没有安装 Git，点「安装 Git」由智能体帮你完成安装' };
  var authOk = !!auth && !auth.expired && auth.source !== 'ssh';
  var writeOk = !binding || binding.writable !== false;
  /* 一期仅支持 HTTPS，保留已有 SSH 目录，不改它的远端。 */
  var protocolOk = !binding || ldBindingProtocol(binding) === 'https';
  var missing = !!binding && (binding.directoryMissing === true || /(?:missing-dir|目录丢失)/.test(binding.path));
  var ready = authOk && !!binding && !missing && protocolOk && writeOk;
  /* 状态与客户端一致：已就绪、未初始化、未登录、凭据失效、无权访问、目录不匹配、Git 不可用、地址无效 */
  var key = !auth ? 'login' : auth.expired || !authOk ? 'expired' : !binding ? 'download' : missing ? 'missing' : !protocolOk ? 'mismatch' : !writeOk ? 'noaccess' : 'ready';
  return { needed:true, ready:ready, info:info, auth:auth, authOk:authOk, writeOk:writeOk, protocolOk:protocolOk, binding:binding, key:key, label:LD_STATUS_LABELS[key],
    reason:key === 'login' ? '还没有登录 ' + info.host + ' 的 Git 账号'
      : key === 'expired' ? '本机保存的凭据被平台拒绝，可能已过期或被撤销，请重新登录'
      : key === 'download' ? '仓库尚未初始化到本机'
      : key === 'missing' ? '本机目录已丢失或移走，请重新绑定'
      : key === 'mismatch' ? '本机目录不是该 HTTPS 仓库，请重新选择或使用默认目录，原目录保持不变'
      : key === 'noaccess' ? (ldPushIssueText(binding.pushIssue ? { pushIssue:binding.pushIssue, username:ldAuthUser(auth) } : auth, info.platform) || ldAuthUser(auth) + ' 没有该仓库的推送权限') : '' };

}
/* 谁来改地址：Manage 空间由能管理空间的人（负责人、空间管理员、系统管理员，与 Manage 一致）在「空间设置 › 代码仓库」修改；
   协作开发自己的空间由负责人在空间设置中修改 */
export function ldRepoFixHint() { return '请到 Build「设置 › 工作区设置 › 仓库」修改，或联系该范围负责人'; }
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
  var last = (checks.projects || {})[ldBindingKey(project.id)];
  if (!st.info) return { st:st, key:'norepo', reason:'没有配置代码仓库，' + ldRepoFixHint(project).replace(/修改$/, '填写') };
  if (st.invalid || st.ssh) return { st:st, key:st.key, reason:st.reason };
  /* Git 是否可用随本机实时判断，不等「检测」 */
  if (st.key === 'git' || st.key === 'missing') return { st:st, key:st.key, reason:st.reason };
  if (last === 'offline' || last === 'notfound') return { st:st, key:last, reason:(checks.reasons || {})[ldBindingKey(project.id)] || '' };
  return { st:st, key:st.binding ? (last || st.key) : 'download', reason:st.reason };
}
/* 开发空间：有仓库地址、Manage 里的研发类空间，或协作开发自己的空间（不带 space:'manage'）。新建任务的空间下拉也用它 */
export function ldIsDevProject(project) { return !!project && (project.space !== 'manage' || project.containsRd === true || ['devtest','collab','collaboration'].includes(project.template)); }
/* 按规范化仓库聚合当前用户的有效开发范围，避免重复初始化。 */
export function ldMyDevProjects() {
  var groups = new Map();
  tkScopeProjects().filter(ldIsDevProject).forEach(function (p) {
    if (p.status === 'archived') return;
    /* 独立工作区容器没有根范围，只取我能看到的工作区 */
    var rows = p.wsHost ? tkVisibleWorkspaces(p) : wsFlatTree(p);
    (p.wsHost ? [] : [{ id:'', name:p.name }]).concat(rows.map(function (row) { return { id:row.ws.id, name:p.wsHost ? row.ws.name : p.name + ' / ' + wsPathNames(p, row.ws.id).join(' / ') }; })).forEach(function (scope) {
      buildRepoList(p, scope.id).repositories.forEach(function (config) {
        var key = ldRemoteKey(config.repo);
        if (!groups.has(key)) groups.set(key, Object.assign({}, config, {id:ldEnvironmentId(config), usages:[]}));
        groups.get(key).usages.push({spaceId:p.id,workspaceId:scope.id,name:scope.name,baseBranch:config.baseBranch});
      });
    });
  });
  return Array.from(groups.values());
}
export function ldProjectsOnHost(host) {
  return ldMyDevProjects().filter(function (project) { return ldRepoInfo(project).host === host; });
}
/* 需要本人配置的空间；地址无效的要到 Manage 修正，SSH 仓库不检测，都不算在内 */
export function ldPendingProjects() {
  return ldActiveEnvironments().filter(function (project) { var status = ldProjectStatus(project.id); return !status.ready && !status.invalid; });
}
/* 顶部提示：需要本人配置的空间，加上地址不规范、上次检测连不上或找不到仓库的空间（地址问题要找管理员改，也提示出来） */
export function ldAttentionProjects() {
  var pendingIds = ldPendingProjects().map(function (project) { return project.id; });
  return ldActiveEnvironments().filter(function (project) {
    var key = ldProjectView(project).key;
    return key === 'invalid' || key === 'offline' || key === 'notfound' || pendingIds.includes(project.id);
  });
}

/* ---------- 空间目录 ---------- */
/* 记录空间目录绑定（任务执行读同一份）；mode 为 auto（默认目录）或 existing（更改过的目录） */
export function ldBindDir(projectId, path, mode) {
  var info = ldRepoInfo(ldTargetProject(projectId));
  if (!info || ldCheckDir(projectId, path)) return false;
  var mine = ldMine(), auth = mine.auths[info.host], bindingKey = ldBindingKey(projectId);
  mine.repoBindings[bindingKey] = { repo:info.repo, repoKey:info.repoKey, path:path, mode:mode, protocol:ldAuthProtocol(auth), branch:info.baseBranch, writable:ldPushCheck(auth), pushIssue:ldPushIssue(auth), syncedAt:ldNow() };
  if (info.spaceId) mine.scopeBindings[ldScopeBindingKey(info)] = bindingKey;
  if (!ldSaveMine(mine)) return false;
  ldRefresh(); return true;
}
export function ldMarkInitialized(projectId) {
  var info = ldRepoInfo(ldTargetProject(projectId)), mine = ldMine();
  if (!info || !mine.repoBindings[ldBindingKey(projectId)]) return false;
  mine.repoBindings[ldBindingKey(projectId)].initializedAt = ldNow();
  return ldSaveMine(mine);
}
export function ldRepoHasRunningTasks(repoKey) {
  return tkGetTasks().some(function (task) {
    return task.repoSnapshot && ldRemoteKey(task.repoSnapshot.repo) === repoKey && !['done', 'cancelled'].includes(task.status);
  });
}
export function ldCheckDir(projectId, path) {
  var info = ldRepoInfo(ldTargetProject(projectId)), mine = ldMine();
  if (!info) return '请先配置代码仓库';
  var bindingKey = ldBindingKey(projectId), current = mine.repoBindings[bindingKey];
  var scopeError = ldScopeDirectoryChangeError(info,bindingKey); if (scopeError) return scopeError;
  if (!ldInsideWorkspace(path) || /outside/i.test(path)) return '本机目录必须在本机根目录（' + LD_WORKSPACE_ROOT + '）内';
  if (current && current.path !== path && (ldBindingHasRunningTasks(bindingKey) || /busy/i.test(current.path))) return '该仓库还有进行中的任务，请完成后再更改本机目录';
  if (/other|别的/.test(path)) return '目录里的仓库与当前仓库地址不一致';
  if (Object.keys(mine.repoBindings).some(function (key) { return key !== bindingKey && mine.repoBindings[key].path === path; })) return '该目录已有绑定，请选择列表中的已有目录或使用不同目录';
  if (/conflict/i.test(path)) return '目录里已有同名文件，未覆盖；请移走或改名后重试';
  return '';
}
export function ldPickDir(info) { return ldDefaultPath(Object.assign({},info,{_repoResolved:true})); }
export function ldForgetRepoBinding(repoKey) {
  if (ldBindingHasRunningTasks(repoKey)) return '目录还有未结束任务，暂不能清理绑定';
  var mine = ldMine(); delete mine.repoBindings[repoKey];
  Object.keys(mine.scopeBindings).forEach(function (key) { if (mine.scopeBindings[key] === repoKey) delete mine.scopeBindings[key]; });
  if (!ldSaveMine(mine)) return '保存失败，请重试';
  ldRefresh(); return '';
}

/* ---------- 检测结果 ----------
   设置页打开时不检测，展示上次结果；点「检测」或登录、初始化成功后更新（只更新相关平台）。
   结果按登录人保存（真实客户端存本机配置目录，只有状态，不含凭据）。 */
var LD_PUBLIC_HOSTS = ['github.com', 'gitee.com'];
export var LD_ACCOUNT_LABELS = { available:'可用', expiring:'即将过期', login:'未登录', expired:'凭据失效', offline:'无法连接', git:'Git 不可用' };
/* 凭据失效按本地已知的到期日判断（正式实现以平台接口 401 为准）；失效以外，网络不通时连平台验证不了，记为无法连接 */
export function ldAccountKey(host) {
  if (ldMine().gitMissing) return 'git';
  var auth = ldAuthFor(host);
  if (!auth) return 'login';
  if (auth.expired || auth.source === 'ssh') return 'expired';
  return ldMine().netDown ? 'offline' : 'available';
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
  ldActiveEnvironments().forEach(function (project) {
    var info = ldRepoInfo(project);
    if (host && info.host !== host) return;
    var status = ldProjectStatus(project.id);
    var net = status.invalid || status.key === 'git' ? null : ldNetCheck(info, status.auth);
    checks.projects[ldBindingKey(project.id)] = net ? net.key : status.key;
    checks.reasons[ldBindingKey(project.id)] = net ? net.reason : '';
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
/* 账号卡片菜单里的「检测」：只检测这个平台的账号，卡片上显示「检测中…」，完成后回调给出结果提示 */
var detectingHosts = new Set();
export function ldIsDetectingHost(host) { return detectingHosts.has(host); }
export function ldDetectHost(host, done) {
  if (detecting || detectingHosts.has(host)) return;
  detectingHosts.add(host);
  ldRefresh();
  setTimeout(function () {
    detectingHosts.delete(host);
    ldRecordChecks(host);
    ldRefresh();
    if (done) done();
  }, 900);
}
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
/* 环境列表保留不再使用的旧仓库绑定；进行中的任务仍可沿用。 */
export function ldSettingsProjects() {
  var projects = ldMyDevProjects(), saved = ldMine().repoBindings;
  var used = new Set(projects.map(function (p) { return ldRemoteKey(p.repo); }));
  projects.forEach(function (p) { p.bindingKey = ldRemoteKey(p.repo); p.id = ldEnvironmentId(p); });
  Object.keys(saved).forEach(function (key) {
    if (used.has(key)) return;
    var binding = saved[key]; if (!binding.repo) return;
    var repoKey = binding.repoKey || ldRemoteKey(binding.repo), parent = projects.find(function (p) { return !p.isCopy && ldRemoteKey(p.repo) === repoKey; });
    var usages = (parent?.usages || []).filter(function (scope) { return ldBindingKey(ldEnvironmentId(Object.assign({},binding,scope))) === key; });
    projects.push({id:ldEnvironmentId({repo:binding.repo,baseBranch:binding.branch,bindingKey:key,name:'独立目录 · ' + repoKey.split('/').pop()}),bindingKey:key,repo:binding.repo,
      name:repoKey.split('/').pop(),groupKey:repoKey,isCopy:key !== repoKey,usages:usages,unused:!usages.length && !ldBindingHasRunningTasks(key)});
  });
  return projects;
}
export function ldActiveEnvironments() {
  var rows = new Map();
  ldMyDevProjects().forEach(function (project) {
    project.usages.forEach(function (scope) {
      var target = Object.assign({},project,scope,{bindingKey:'',_repoResolved:true});
      var key = ldBindingKey(target); target.bindingKey = key; target.id = ldEnvironmentId(target);
      if (!rows.has(key)) rows.set(key,target);
    });
  });
  return Array.from(rows.values());
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
  var initialized = !!status.info && !status.invalid && status.key !== 'missing' && (!!binding && status.protocolOk !== false && !ldStateOf(userId).gitMissing);
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
/* 删除本机保存的某个平台账号（只删本机凭据记录，不动空间目录）；之后这个平台上的空间显示未登录 */
export function ldRemoveAuth(host) {
  var mine = ldMine();
  delete mine.auths[host];
  ldSaveMine(mine);
  ldRecordChecks(host);
}

/* 任务目录是当前用户本机信息，不写入团队任务对象。原型记录隔离目录；真实 worktree 由客户端创建。 */
export function ldRememberTaskDirectory(task, snapshot, userId) {
  if (!snapshot) return true;
  if (userId !== tkCurrentUserId()) return true;
  var mine = ldMine(), bindingKey = ldBindingKey(ldTaskEnvironmentId(task,userId),userId), binding = mine.repoBindings[bindingKey];
  if (!binding) return false;
  mine.taskDirectories = mine.taskDirectories || {};
  if (mine.taskDirectories[task.id]) return true;
  var segment = encodeURIComponent(String(task.code || task.id)) + '-' + encodeURIComponent(String(task.id));
  var taskDirectory = binding.path + '/.lingee-tasks/' + segment;
  mine.taskDirectories[task.id] = { bindingKey:bindingKey, spaceId:task.project, workspaceId:task.workspaceId || '', repoKey:snapshot.repoKey, repositoryDirectory:binding.path,
    taskDirectory:taskDirectory, workingDirectory:taskDirectory, branch:snapshot.baseBranch };
  return ldSaveMine(mine);
}

export function ldTaskDirectory(task) { return ldMine().taskDirectories?.[task.id] || null; }

/* Personal scope preference, separate from shared repository configuration. */
export function ldBindingHasRunningTasks(bindingKey) {
  var mine = ldMine();
  return tkGetTasks().some(function (task) {
    if (!task.repoSnapshot || ['done','cancelled'].includes(task.status)) return false;
    var saved = mine.taskDirectories?.[task.id];
    var key = saved?.bindingKey || (saved ? Object.keys(mine.repoBindings).find(id => mine.repoBindings[id].path === saved.repositoryDirectory) : ldRemoteKey(task.repoSnapshot.repo));
    return key === bindingKey;
  });
}
export function ldScopeDirectoryChangeError(info,bindingKey) {
  if (!info.spaceId) return '';
  var current = ldBindingKey(ldEnvironmentId(Object.assign({},info,{bindingKey:''})));
  return current !== bindingKey && tkGetTasks().some(function (task) { return task.repoSnapshot && task.project === info.spaceId && (task.workspaceId || '') === info.workspaceId && !['done','cancelled'].includes(task.status); }) ? '当前工作范围还有未结束任务，暂不能更换目录' : '';
}
export function ldAssignScopeDirectory(target,bindingKey) {
  var info = ldRepoInfo(ldTargetProject(target)), mine = ldMine();
  if (!info?.spaceId) return '请选择工作区';
  if (bindingKey !== info.repoKey && mine.repoBindings[bindingKey]?.repoKey !== info.repoKey) return '目录不属于当前仓库';
  var error = ldScopeDirectoryChangeError(info,bindingKey); if (error) return error;
  mine.scopeBindings[ldScopeBindingKey(info)] = bindingKey;
  if (!ldSaveMine(mine)) return '保存失败，请重试';
  ldRefresh(); return '';
}
