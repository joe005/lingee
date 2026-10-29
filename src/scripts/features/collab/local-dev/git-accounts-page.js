import { $ } from '../../../core/dom.js';
import { toast } from '../../../core/toast.js';
import { LD_ACCOUNT_LABELS, ldAuthFor, ldAuthUser, ldEsc, ldMine, ldRefresh, ldRemoveAuth } from './core.js';
import { ldGitInstallHtml } from './git-install.js';
import { ldSettingsTab, ldSettingsVisible } from './settings-page.js';
import { ldPlatformKey, ldPlatformLogo, ldStateTag } from './ui.js';

/* 本地开发 · 设置 ›「Git 账号」（#ldGitPanel）：只列已登录的账号，按平台分组（金蝶 GitLab / GitHub / Gitee / 其他 GitLab），每组两列卡片。
   卡片：平台标识（各平台不同）、账号名 + 状态、来源与到期日；悬停出现「···」（重新登录、删除）。未登录的平台不占位，从右上角「＋ 添加」登录；
   空间用到但还没登录的平台，在「我的空间」里提示并从那里登录。空间按仓库主机自动匹配账号，同一平台登录一次即可复用。
   顶部提示条：Git 未安装优先，其次令牌即将到期。 */
var menuHost = '';

var LOGOS = {
  more:'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
};

var GROUPS = { KDGitLab:'金蝶 GitLab', GitHub:'GitHub', Gitee:'Gitee', GitLab:'其他 GitLab' };
var GROUP_ORDER = ['KDGitLab', 'GitHub', 'Gitee', 'GitLab'];

function stateKey(host, checks) {
  var auth = ldAuthFor(host);
  if (ldMine().gitMissing) return 'git';
  var key = checks.accounts?.[host];
  if (auth?.expiring && (!key || key === 'available')) key = 'expiring';
  if (auth?.expired) key = 'expired';
  /* 已登录且可用、未登录（标题已写明）时不再加标签 */
  return key === 'available' || key === 'login' ? '' : key || '';
}
function descOf(auth) {
  if (auth.source === 'local') return '本机凭据';
  if (auth.source === 'token') return '访问令牌' + (auth.expiresAt ? ' · ' + auth.expiresAt + ' 到期' : '');
  return '浏览器登录';
}
function cardHtml(host, checks) {
  var auth = ldAuthFor(host), key = stateKey(host, checks);
  var avatar = '<span class="ld-acct-avatar">' + ldPlatformLogo(ldPlatformKey(host)) + '</span>';
  var name = ldAuthUser(auth);
  var open = menuHost === host;
  var action = '<div class="ld-acct-more"><button type="button" class="ld-acct-more-btn" data-ld-acct-more="' + ldEsc(host) + '" aria-haspopup="menu" aria-expanded="' + open + '" aria-label="' + ldEsc(name) + ' 的更多操作">' + LOGOS.more + '</button>'
    + (open ? '<div class="ld-acct-menu" role="menu"><button type="button" role="menuitem" data-ld-auth-open="' + ldEsc(host) + '">重新登录</button><button type="button" role="menuitem" class="is-danger" data-ld-acct-delete="' + ldEsc(host) + '">删除</button></div>' : '') + '</div>';
  return '<article class="ld-acct-card' + (open ? ' is-menu-open' : '') + '">' + avatar
    + '<div class="ld-acct-main"><div class="ld-acct-title"><strong title="' + ldEsc(name) + '">' + ldEsc(name) + '</strong>' + (key ? ldStateTag(key, LD_ACCOUNT_LABELS) : '') + '</div>'
    + '<span class="ld-acct-desc" title="' + ldEsc(host) + '">' + ldEsc(host + ' · ' + descOf(auth)) + '</span></div>'
    + '<div class="ld-acct-act">' + action + '</div></article>';
}
function render() {
  var panel = $('#ldGitPanel');
  if (!panel || !ldSettingsVisible() || ldSettingsTab() !== 'git') return;
  var mine = ldMine(), checks = mine.checks || { accounts:{} };
  var expiringHost = Object.keys(mine.auths).find(function (host) { return ldAuthFor(host)?.expiring; });
  var banner = mine.gitMissing ? ldGitInstallHtml('settings')
    : expiringHost ? '<div class="ld-git-banner" role="alert"><span class="ld-git-banner-text">' + ldEsc(expiringHost) + ' 的访问令牌将于 ' + ldEsc(ldAuthFor(expiringHost).expiresAt) + ' 到期，到期后拉取和推送会失败，请重新创建令牌并登录。</span><span class="ld-git-banner-links"><button type="button" class="ld-git-link" data-ld-auth-open="' + ldEsc(expiringHost) + '">重新登录</button></span></div>' : '';
  var groups = {};
  Object.keys(mine.auths).forEach(function (host) {
    var group = ldPlatformKey(host);
    (groups[group] = groups[group] || []).push(host);
  });
  var body = GROUP_ORDER.filter(function (group) { return groups[group]; }).map(function (group) {
    return '<section class="ld-acct-group" aria-label="' + GROUPS[group] + '"><h3>' + GROUPS[group] + '</h3><div class="ld-acct-grid">'
      + groups[group].map(function (host) { return cardHtml(host, checks); }).join('') + '</div></section>';
  }).join('') || '<div class="ld-acct-empty"><strong>还没有登录 Git 账号</strong><span>点右上角「＋ 添加」，登录金蝶 GitLab、GitHub、Gitee 或其他 GitLab 的账号。</span></div>';
  panel.innerHTML = banner + body;
}

export function initGitAccountsPage() {
  document.addEventListener('lingee:ld-settings-shown', render);
  document.addEventListener('lingee:local-dev-changed', render);
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    var more = t.closest('[data-ld-acct-more]');
    if (more) { var host = more.getAttribute('data-ld-acct-more'); menuHost = menuHost === host ? '' : host; render(); return; }
    var del = t.closest('[data-ld-acct-delete]');
    if (del) {
      var target = del.getAttribute('data-ld-acct-delete'), user = ldAuthFor(target) ? ldAuthUser(ldAuthFor(target)) : '';
      menuHost = '';
      ldRemoveAuth(target);
      ldRefresh();
      toast('已删除 ' + ldEsc(target) + ' 上的账号 ' + ldEsc(user), 'success');
      return;
    }
    /* 菜单里点了「重新登录」或点到外面都收起 */
    if (menuHost && (!t.closest('.ld-acct-menu') || t.closest('[data-ld-auth-open]'))) { menuHost = ''; render(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuHost) { e.stopPropagation(); var host = menuHost; menuHost = ''; render(); $('#ldGitPanel [data-ld-acct-more="' + host + '"]')?.focus(); }
  }, true);
}
