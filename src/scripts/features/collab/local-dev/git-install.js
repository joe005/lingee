import { toast } from '../../../core/toast.js';
import { ldEsc, ldGitInstallState, ldMyDevProjects, ldRecordChecks, ldRefresh, ldSaveGitInstall, ldSetGitMissing } from './core.js';

/* 本地开发 · Git 未安装时跳转对话安装。
   设置页提示条、准备执行环境、我的空间行内的「安装 Git」都走这里：新建「安装 Git」对话并自动发送预置提示词，
   由对话模块（composer/git-install-chat.js）通过 lingee:git-install-progress 回报进度；
   以客户端检测到 git 可用为准判定完成，完成后弹出 toast 并自动检测。 */
var LD_GIT_DOWNLOAD = /Windows/i.test(navigator.userAgent) ? 'https://git-scm.com/download/win' : /Mac/i.test(navigator.userAgent) ? 'https://git-scm.com/download/mac' : 'https://git-scm.com/downloads';

/* 提示条按安装进度变化；where 为 settings（设置页）或 prep（准备执行环境）。
   对话归到发起的空间下（侧栏按空间列对话）；设置页顶部发起时归到第一个开发空间 */
export function ldGitInstallHtml(where, projectId) {
  var attr = 'data-ld-git-install="' + ldEsc(projectId || '') + '"';
  var state = ldGitInstallState();
  var link = function (data, text) { return '<button type="button" class="ld-git-link" ' + data + '>' + text + '</button>'; };
  var view = link('data-ld-git-install-view', '查看对话');
  var text, actions;
  if (state.status === 'running') { text = '正在新对话中安装 Git，完成后会自动检测。'; actions = view; }
  else if (state.status === 'waiting') { text = '安装需要你在对话中确认（如输入管理员密码、同意系统安装弹窗）。'; actions = view; }
  else if (state.status === 'failed') {
    text = 'Git 安装未完成：' + ldEsc(state.reason || '安装过程被中断') + '。可在对话中继续，或手动下载安装后点「检测」。';
    actions = view + link('data-ld-git-download', '手动下载') + link(attr, '重试');
  } else { text = '本机没有安装 Git，安装后即可使用代码仓库。'; actions = link(attr, '安装Git'); }
  var busy = state.status === 'running' || state.status === 'waiting';
  var icon = busy ? '<span class="ld-spin" aria-hidden="true"></span>'
    : '<svg class="ld-git-banner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/></svg>';
  return '<div class="ld-git-banner ld-git-banner--' + where + (busy ? ' is-busy' : '') + '" role="status">' + icon
    + '<span class="ld-git-banner-text">' + text + '</span><span class="ld-git-banner-links">' + actions + '</span></div>';
}

export function ldStartGitInstall(projectId) {
  var state = ldGitInstallState();
  /* 安装进行中不重复建对话，直接切到已有对话 */
  if (state.status === 'running' || state.status === 'waiting') { openChat(); return; }
  ldSaveGitInstall({ status:'running', reason:'' });
  ldRefresh();
  document.dispatchEvent(new CustomEvent('lingee:git-install-chat', { detail:{ action:'start', projectId:projectId || ldMyDevProjects()[0]?.id || '' } }));
}
function openChat() { document.dispatchEvent(new CustomEvent('lingee:git-install-chat', { detail:{ action:'open' } })); }

function onProgress(detail) {
  var status = detail?.status;
  if (status === 'done') {
    ldSetGitMissing(false);
    ldRecordChecks();
    ldRefresh();
    toast('Git 安装完成' + (detail.version ? '（' + ldEsc(detail.version) + '）' : ''), 'success');
    return;
  }
  /* 对话被关闭或中止：回到未安装，可重新发起 */
  ldSaveGitInstall(status === 'aborted' ? { status:'idle' } : { status:status, reason:detail.reason || '' });
  ldRefresh();
}

export function initGitInstall() {
  document.addEventListener('lingee:git-install-progress', function (e) { onProgress(e.detail || {}); });
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var install = t.closest('[data-ld-git-install]');
    if (install) { ldStartGitInstall(install.getAttribute('data-ld-git-install')); return; }
    if (t.closest('[data-ld-git-install-view]')) { openChat(); return; }
    if (t.closest('[data-ld-git-download]')) { window.open(LD_GIT_DOWNLOAD, '_blank', 'noopener'); }
  });
}
