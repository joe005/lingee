import { $ } from '../../../core/dom.js';
import { requestDeleteConfirmation } from '../../../core/delete-confirm.js';
import { DELETE_ICON } from '../../../core/delete-icon.js';
import { toast } from '../../../core/toast.js';
import { LD_ACCOUNT_LABELS, ldAccountKey, ldAuthFor, ldAuthUser, ldDetectHost, ldEsc, ldIsDetectingHost, ldMine, ldRefresh, ldRemoveAuth } from './core.js';
import { ldGitInstallHtml } from './git-install.js';
import { ldSettingsTab, ldSettingsVisible } from './settings-page.js';
import { LD_ICONS, ldPlatformKey, ldPlatformLogo, ldStateTag } from './ui.js';

/* 本地开发 · 设置 ›「Git 账号」（#ldGitPanel）：只列已登录的账号，不分组，两列平铺；平台用各自的图标区分（金蝶 GitLab / GitHub / Gitee / 其他 GitLab），
   排序按平台固定顺序再按主机。卡片：平台标识、账号名 + 状态标签（可用显示绿色「可用」）、「主机 · 来源 · 到期日」（平台读得到到期日才显示）；悬停出现「···」。
   菜单：重新登录、检测（只检测这一个账号）、删除；无法连接时「检测」排第一（重新登录解决不了网络问题）；
   来源为本机凭据的账号是系统里原有的，不能真删，菜单写「移除」，确认后只让 Lingee 不再使用。
   未登录的平台不占位，从右上角「＋ 添加」登录；空间用到但还没登录的平台，在「我的空间」里提示并从那里登录。
   空间按仓库主机自动匹配账号，同一平台登录一次即可复用。顶部提示条：Git 未安装优先，其次令牌即将到期。 */
var menuHost = '';

var ICONS = {
  more:'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  key:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>',
  detect:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
};

var PLATFORM_ORDER = ['KDGitLab', 'GitHub', 'Gitee', 'GitLab'];

function stateKey(host, checks) {
  var auth = ldAuthFor(host);
  if (ldMine().gitMissing) return 'git';
  var key = checks.accounts?.[host];
  /* 卡片只列已登录账号：没检测过或记录为已登录，都按「可用」显示，检测后再更新 */
  if (!key || key === 'ready' || key === 'login') key = 'available';
  if (auth?.expiring && key === 'available') key = 'expiring';
  if (auth?.expired) key = 'expired';
  return key;
}
function descOf(auth) {
  if (auth.source === 'local') return '本机凭据';
  if (auth.source === 'token') return '访问令牌' + (auth.expiresAt ? auth.expired ? ' · 已于 ' + auth.expiresAt + ' 过期' : ' · ' + auth.expiresAt + ' 到期' : '');
  return '浏览器登录';
}
function menuItems(host, auth, key) {
  var login = { attr:'data-ld-auth-open="' + ldEsc(host) + '"', icon:ICONS.key, text:'重新登录' };
  var detect = { attr:'data-ld-acct-detect="' + ldEsc(host) + '"', icon:ICONS.detect, text:'检测' };
  var remove = { attr:'data-ld-acct-delete="' + ldEsc(host) + '"', icon:DELETE_ICON, text:auth.source === 'local' ? '移除' : '删除', danger:true };
  return key === 'offline' ? [detect, login, remove] : [login, detect, remove];
}
function cardHtml(host, checks) {
  var auth = ldAuthFor(host), key = stateKey(host, checks), detecting = ldIsDetectingHost(host);
  var avatar = '<span class="ld-acct-avatar">' + ldPlatformLogo(ldPlatformKey(host)) + '</span>';
  var name = ldAuthUser(auth);
  var open = menuHost === host;
  var menu = open ? '<div class="ld-acct-menu" role="menu">' + menuItems(host, auth, key).map(function (item) {
    return '<button type="button" role="menuitem"' + (item.danger ? ' class="is-danger"' : '') + ' ' + item.attr + '>' + item.icon + '<span>' + item.text + '</span></button>';
  }).join('') + '</div>' : '';
  var action = '<div class="ld-acct-more"><button type="button" class="ld-acct-more-btn" data-ld-acct-more="' + ldEsc(host) + '" aria-haspopup="menu" aria-expanded="' + open + '" aria-label="' + ldEsc(name) + ' 的更多操作">' + ICONS.more + '</button>' + menu + '</div>';
  var tag = detecting ? '<span class="ld-state is-muted" role="status">检测中…</span>' : key ? ldStateTag(key, LD_ACCOUNT_LABELS) : '';
  return '<article class="ld-acct-card' + (open ? ' is-menu-open' : '') + '"' + (detecting ? ' aria-busy="true"' : '') + '>' + avatar
    + '<div class="ld-acct-main"><div class="ld-acct-title"><strong title="' + ldEsc(name) + '">' + ldEsc(name) + '</strong>' + tag + '</div>'
    + '<span class="ld-acct-desc" title="' + ldEsc(host) + '">' + ldEsc(host + ' · ' + descOf(auth)) + '</span></div>'
    + '<div class="ld-acct-act">' + action + '</div></article>';
}
function sortedHosts(auths) {
  return Object.keys(auths).sort(function (a, b) {
    return PLATFORM_ORDER.indexOf(ldPlatformKey(a)) - PLATFORM_ORDER.indexOf(ldPlatformKey(b)) || a.localeCompare(b);
  });
}
function render() {
  var panel = $('#ldGitPanel');
  if (!panel || !ldSettingsVisible() || ldSettingsTab() !== 'git') return;
  var mine = ldMine(), checks = mine.checks || { accounts:{} };
  var expiringHost = Object.keys(mine.auths).find(function (host) { return ldAuthFor(host)?.expiring; });
  var banner = mine.gitMissing ? ldGitInstallHtml('settings')
    : expiringHost ? '<div class="ld-git-banner" role="alert"><span class="ld-git-banner-text">' + ldEsc(expiringHost) + ' 的访问令牌将于 ' + ldEsc(ldAuthFor(expiringHost).expiresAt) + ' 到期，到期后拉取和推送会失败，请重新创建令牌并登录。</span><span class="ld-git-banner-links"><button type="button" class="ld-git-link" data-ld-auth-open="' + ldEsc(expiringHost) + '">重新登录</button></span></div>' : '';
  var hosts = sortedHosts(mine.auths);
  var body = hosts.length ? '<div class="ld-acct-grid">' + hosts.map(function (host) { return cardHtml(host, checks); }).join('') + '</div>'
    : '<div class="ld-acct-empty"><strong>还没有登录 Git 账号</strong><span>登录金蝶 GitLab、GitHub、Gitee 或其他 GitLab 的账号，空间初始化时会自动复用。</span>'
      + '<button type="button" class="ld-set-btn ld-set-btn--primary" data-ld-auth-add>' + LD_ICONS.plus + '添加账号</button></div>';
  panel.innerHTML = banner + body;
}

/* 检测完成后在同一处反馈结果：可用给成功，其余按状态名提示 */
function detectAccount(host) {
  ldDetectHost(host, function () {
    var key = ldAccountKey(host);
    if (key === 'available') toast(ldEsc(host) + ' 的账号可用', 'success');
    else toast(ldEsc(host) + '：' + (LD_ACCOUNT_LABELS[key] || key), 'warning');
  });
}
async function deleteAccount(host) {
  var auth = ldAuthFor(host);
  if (!auth) return;
  var user = ldAuthUser(auth), local = auth.source === 'local';
  var ok = await requestDeleteConfirmation(local
    ? '移除后 Lingee 不再使用 ' + host + ' 上的账号 ' + user + '，系统里保存的凭据不会被清除，终端和其他 Git 工具不受影响。'
    : '删除后将清除 ' + host + ' 上账号 ' + user + ' 保存的访问令牌，用到该平台的空间需要重新登录才能拉取和推送。',
  { title: local ? '移除本机凭据' : '删除 Git 账号', confirmLabel: local ? '确认移除' : '确认删除' });
  if (!ok) return;
  ldRemoveAuth(host);
  ldRefresh();
  toast((local ? '已移除 ' : '已删除 ') + ldEsc(host) + ' 上的账号 ' + ldEsc(user), 'success');
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
    if (del) { menuHost = ''; render(); deleteAccount(del.getAttribute('data-ld-acct-delete')); return; }
    var detect = t.closest('[data-ld-acct-detect]');
    if (detect) { menuHost = ''; detectAccount(detect.getAttribute('data-ld-acct-detect')); return; }
    /* 菜单里点了「重新登录」或点到外面都收起 */
    if (menuHost && (!t.closest('.ld-acct-menu') || t.closest('[data-ld-auth-open]'))) { menuHost = ''; render(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuHost) { e.stopPropagation(); var host = menuHost; menuHost = ''; render(); $('#ldGitPanel [data-ld-acct-more="' + host + '"]')?.focus(); }
  }, true);
}
