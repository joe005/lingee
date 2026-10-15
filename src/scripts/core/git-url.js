/* Git 地址静态校验：只看格式，不联网。
   Manage 新建空间与「空间设置 › 代码仓库」、Build 新建空间与设置页「我的项目」共用同一套规则，
   能否连通由 Build 客户端在检测、初始化时用 git ls-remote 检查。 */

/* 远端地址统一成 host/path 再比较：git@host:a/b.git、ssh://git@host:22/a/b、https://host/a/b 视为同一仓库 */
export function gitRemoteKey(url) { return remotePath(url).toLowerCase(); }
/* 同上，保留大小写，用于提示里的正确写法 */
function remotePath(url) {
  return String(url || '').trim()
    .replace(/^[a-z+]+:\/\//i, '').replace(/^[^@/]+@/, '')
    .replace(/^([^/:]+):\d+\//, '$1/').replace(/^([^/:]+):/, '$1/')
    .replace(/\.git\/?$/, '').replace(/\/$/, '');
}

/* 末尾的 .git 可带可不带（git clone 两种都接受），提示里统一不带 */
var SAMPLE = 'https://github.com/<组或用户名>/<仓库名>';
/* 只校验格式确定能判断的情况，宁可放过也不误报（Manage 连不上私有云仓库，没法联网确认）：
   - 所有地址：要像地址（主机像域名、有路径、没有空格）；含 /-/ 的是 GitLab 网页地址（「-」不能当组名或仓库名）。
   - GitHub、Gitee（主机名含 github / gitee，含企业版）：路径固定为「用户名或组织/仓库名」两段，少一段不完整，多出来的是网页地址。
   - GitLab 和其他私有云平台（如 git.company.com、Gerrit、Bitbucket Server）路径规则各不相同，不查段数，只做第一条。
   末尾带不带 .git 都算规范。 */
function platformOf(host) { return /github/.test(host) ? 'github' : /gitee/.test(host) ? 'gitee' : ''; }
export function gitRepoProblem(repo) {
  var url = String(repo || '').trim();
  var key = remotePath(url);
  var host = (key.split('/')[0] || url).toLowerCase();
  var parts = key.slice(host.length + 1).split('/').filter(Boolean);
  var scheme = /^http:\/\//i.test(url) ? 'http://' : 'https://';   /* 提示里的正确写法沿用原来的协议 */
  if (/\s/.test(url)) return '地址里有空格，正确格式如 ' + SAMPLE;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/.test(host) || !parts.length) return '不是 Git 仓库地址，正确格式如 ' + SAMPLE;
  var dash = parts.indexOf('-');
  if (dash >= 2) return '这是仓库网页地址，不是克隆地址，应为 ' + scheme + host + '/' + parts.slice(0, dash).join('/');
  var platform = platformOf(host);
  if (platform && parts.length < 2) return '地址不完整，需要「组或用户名/仓库名」两段，如 ' + scheme + host + '/<组或用户名>/<仓库名>';
  if ((platform === 'github' || platform === 'gitee') && parts.length > 2) return '这是仓库网页地址，不是克隆地址，应为 ' + scheme + host + '/' + parts.slice(0, 2).join('/');
  return '';
}

/* 表单里填写的地址：一期用 HTTPS + 访问令牌拉代码，接受 https:// 和 http://（内网平台可能没配证书），不接受 SSH；
   再按上面的规则检查；空值由表单自己判断必填 */
export function gitRepoUrlError(repo) {
  var url = String(repo || '').trim();
  if (!url) return '';
  if (/^git@|^ssh:\/\//i.test(url)) return '请填写 HTTPS 地址，正确格式如 ' + SAMPLE + '；SSH 地址暂不支持';
  if (!/^https?:\/\//i.test(url)) return '地址要以 https:// 或 http:// 开头，正确格式如 ' + SAMPLE;
  return gitRepoProblem(url);
}
