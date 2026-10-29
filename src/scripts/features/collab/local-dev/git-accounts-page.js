import { $ } from '../../../core/dom.js';
import { LD_ACCOUNT_LABELS, ldAuthEmail, ldAuthFor, ldAuthUser, ldEsc, ldHostPlatform, ldMine, ldSettingsHosts } from './core.js';
import { ldGitInstallHtml } from './git-install.js';
import { ldSettingsTab, ldSettingsVisible } from './settings-page.js';
import { ldStateTag } from './ui.js';

/* 本地开发 · 设置 ›「Git 账号」（#ldGitPanel）：按平台列出账号卡片。空间按仓库主机自动匹配账号，同一平台登录一次即可复用。
   顶部提示条：Git 未安装（跳转对话安装）优先，其次是令牌即将到期。 */
function sourceText(auth) {
  if (auth.source === 'local') return '来自本机凭据';
  if (auth.source === 'token') return '访问令牌' + (auth.expiresAt ? ' · ' + auth.expiresAt + ' 到期' : '');
  return '浏览器登录';
}
function cardHtml(host, checks) {
  var auth = ldAuthFor(host);
  var key = checks.accounts?.[host];
  if (auth?.expiring && (!key || key === 'available')) key = 'expiring';
  var detail = auth ? [ldAuthEmail(auth), sourceText(auth)].filter(Boolean).join(' · ') : '未登录';
  return '<article class="ld-git-card">'
    + '<div class="ld-git-card-main"><div class="ld-space-title"><strong>' + ldEsc(ldHostPlatform(host)) + '</strong>' + ldStateTag(key, LD_ACCOUNT_LABELS) + '</div>'
    + '<span class="ld-space-repo">' + ldEsc(host) + '</span></div>'
    + '<div class="ld-space-field"><span class="ld-space-label">账号</span><span class="ld-space-value">' + (auth ? ldEsc(ldAuthUser(auth)) : '—') + '</span>'
    + '<span class="ld-git-card-detail" title="' + ldEsc(detail) + '">' + ldEsc(detail) + '</span></div>'
    + '<div class="ld-space-act"><button type="button" class="ld-space-btn' + (auth ? '' : ' ld-space-btn--primary') + '" data-ld-auth-open="' + ldEsc(host) + '">' + (auth ? '重新登录' : '登录') + '</button></div>'
    + '</article>';
}
function render() {
  var panel = $('#ldGitPanel');
  if (!panel || !ldSettingsVisible() || ldSettingsTab() !== 'git') return;
  var mine = ldMine(), checks = mine.checks || { accounts:{} };
  var expiringHost = Object.keys(mine.auths).find(function (host) { return ldAuthFor(host)?.expiring; });
  var banner = mine.gitMissing ? ldGitInstallHtml('settings')
    : expiringHost ? '<div class="ld-git-banner" role="alert"><span class="ld-git-banner-text">' + ldEsc(expiringHost) + ' 的访问令牌将于 ' + ldEsc(ldAuthFor(expiringHost).expiresAt) + ' 到期，到期后拉取和推送会失败，请重新创建令牌并登录。</span><span class="ld-row-actions"><button type="button" class="ld-btn ld-btn--primary" data-ld-auth-open="' + ldEsc(expiringHost) + '">重新登录</button></span></div>' : '';
  panel.innerHTML = banner + '<p class="ld-git-hint">空间会按仓库地址自动匹配平台账号，同一平台登录一次即可复用。</p>'
    + '<div class="ld-git-grid" aria-label="Git 账号">' + ldSettingsHosts().map(function (host) { return cardHtml(host, checks); }).join('') + '</div>';
}

export function initGitAccountsPage() {
  document.addEventListener('lingee:ld-settings-shown', render);
  document.addEventListener('lingee:local-dev-changed', render);
}
