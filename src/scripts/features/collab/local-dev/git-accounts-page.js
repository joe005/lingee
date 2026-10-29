import { $ } from '../../../core/dom.js';
import { toast } from '../../../core/toast.js';
import { LD_ACCOUNT_LABELS, ldAuthFor, ldAuthUser, ldEsc, ldHostPlatform, ldMine, ldRefresh, ldRemoveAuth, ldSettingsHosts } from './core.js';
import { ldGitInstallHtml } from './git-install.js';
import { ldSettingsTab, ldSettingsVisible } from './settings-page.js';
import { ldStateTag } from './ui.js';

/* 本地开发 · 设置 ›「Git 账号」（#ldGitPanel）：按平台分组（GitHub / 金蝶 GitLab / Gitee / 其他 GitLab），每组两列账号卡片。
   卡片：平台头像、账号名 + 状态、来源与到期日；已登录的账号悬停出现「···」（重新登录、删除），未登录的给「登录」。
   空间按仓库主机自动匹配账号，同一平台登录一次即可复用。顶部提示条：Git 未安装优先，其次令牌即将到期。 */
var LD_KD_HOST = 'git.kingdee.com';
var menuHost = '';

/* 平台头像：识别平台用的简化标识，未登录为钥匙图标 */
var LOGOS = {
  GitHub:'<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>',
  GitLab:'<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="#e24329" d="m12 21.4 3.7-11.3H8.3z"/><path fill="#fc6d26" d="m12 21.4-3.7-11.3H3.1z"/><path fill="#fca326" d="M3.1 10.1 2 13.5a.75.75 0 0 0 .27.84L12 21.4z"/><path fill="#e24329" d="M3.1 10.1h5.2L6.06 3.2a.38.38 0 0 0-.72 0z"/><path fill="#fc6d26" d="m12 21.4 3.7-11.3h5.2z"/><path fill="#fca326" d="m20.9 10.1 1.1 3.4a.75.75 0 0 1-.27.84L12 21.4z"/><path fill="#e24329" d="M20.9 10.1h-5.2l2.24-6.9a.38.38 0 0 1 .72 0z"/></svg>',
  Gitee:'<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm4.05 3.56v1.5a.3.3 0 0 1-.3.3h-4.6a1.5 1.5 0 0 0-1.5 1.5v4.6c0 .17.13.3.3.3h3.8a.3.3 0 0 0 .3-.3v-1.2a.3.3 0 0 0-.3-.3h-2.4a.3.3 0 0 1-.3-.3v-1.5a.3.3 0 0 1 .3-.3h4.2a.3.3 0 0 1 .3.3v3.9a2.1 2.1 0 0 1-2.1 2.1H8.7a.3.3 0 0 1-.3-.3v-6.6a3.3 3.3 0 0 1 3.3-3.3h4.05a.3.3 0 0 1 .3.3Z"/></svg>',
  key:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="15.5" cy="8.5" r="4.5"/><path d="M12.3 11.7 4 20"/><path d="m6.5 17.5 2 2"/><path d="m9 15 1.5 1.5"/></svg>',
  more:'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
};

function groupOf(host) {
  if (host === LD_KD_HOST) return '金蝶 GitLab';
  var platform = ldHostPlatform(host);
  return platform === 'GitHub' || platform === 'Gitee' ? platform : '其他 GitLab';
}
var GROUP_ORDER = ['GitHub', '金蝶 GitLab', 'Gitee', '其他 GitLab'];

function stateKey(host, checks) {
  var auth = ldAuthFor(host);
  if (ldMine().gitMissing) return 'git';
  var key = checks.accounts?.[host];
  if (auth?.expiring && (!key || key === 'available')) key = 'expiring';
  if (auth?.expired) key = 'expired';
  /* 已登录且可用、未登录（标题已写明）时不再加标签 */
  return key === 'available' || key === 'login' ? '' : key || '';
}
function descOf(auth, host) {
  if (!auth) return '还没有登录 ' + host + ' 的账号';
  if (auth.source === 'local') return '本机凭据';
  if (auth.source === 'token') return '访问令牌' + (auth.expiresAt ? ' · ' + auth.expiresAt + ' 到期' : '');
  return '浏览器登录';
}
function cardHtml(host, checks) {
  var auth = ldAuthFor(host), key = stateKey(host, checks);
  var platform = groupOf(host) === 'Gitee' ? 'Gitee' : groupOf(host) === 'GitHub' ? 'GitHub' : 'GitLab';
  var avatar = auth ? '<span class="ld-acct-avatar is-' + platform.toLowerCase() + '">' + LOGOS[platform] + '</span>' : '<span class="ld-acct-avatar is-empty">' + LOGOS.key + '</span>';
  var name = auth ? ldAuthUser(auth) : '未登录';
  var open = menuHost === host;
  var action = auth
    ? '<div class="ld-acct-more"><button type="button" class="ld-acct-more-btn" data-ld-acct-more="' + ldEsc(host) + '" aria-haspopup="menu" aria-expanded="' + open + '" aria-label="' + ldEsc(name) + ' 的更多操作">' + LOGOS.more + '</button>'
      + (open ? '<div class="ld-acct-menu" role="menu"><button type="button" role="menuitem" data-ld-auth-open="' + ldEsc(host) + '">重新登录</button><button type="button" role="menuitem" class="is-danger" data-ld-acct-delete="' + ldEsc(host) + '">删除</button></div>' : '') + '</div>'
    : '<button type="button" class="ld-acct-login" data-ld-auth-open="' + ldEsc(host) + '">登录</button>';
  return '<article class="ld-acct-card' + (open ? ' is-menu-open' : '') + '">' + avatar
    + '<div class="ld-acct-main"><div class="ld-acct-title"><strong title="' + ldEsc(name) + '">' + ldEsc(name) + '</strong>' + (key ? ldStateTag(key, LD_ACCOUNT_LABELS) : '') + '</div>'
    + '<span class="ld-acct-desc" title="' + ldEsc(host) + '">' + ldEsc(descOf(auth, host)) + '</span></div>'
    + '<div class="ld-acct-act">' + action + '</div></article>';
}
function render() {
  var panel = $('#ldGitPanel');
  if (!panel || !ldSettingsVisible() || ldSettingsTab() !== 'git') return;
  var mine = ldMine(), checks = mine.checks || { accounts:{} };
  var expiringHost = Object.keys(mine.auths).find(function (host) { return ldAuthFor(host)?.expiring; });
  var banner = mine.gitMissing ? ldGitInstallHtml('settings')
    : expiringHost ? '<div class="ld-git-banner" role="alert"><span class="ld-git-banner-text">' + ldEsc(expiringHost) + ' 的访问令牌将于 ' + ldEsc(ldAuthFor(expiringHost).expiresAt) + ' 到期，到期后拉取和推送会失败，请重新创建令牌并登录。</span><span class="ld-git-banner-links"><button type="button" class="ld-git-link" data-ld-auth-open="' + ldEsc(expiringHost) + '">重新登录</button></span></div>' : '';
  var groups = new Map();
  ldSettingsHosts().forEach(function (host) {
    var group = groupOf(host);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(host);
  });
  panel.innerHTML = banner + GROUP_ORDER.filter(function (group) { return groups.has(group); }).map(function (group) {
    return '<section class="ld-acct-group" aria-label="' + group + '"><h3>' + group + '</h3><div class="ld-acct-grid">'
      + groups.get(group).map(function (host) { return cardHtml(host, checks); }).join('') + '</div></section>';
  }).join('');
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
