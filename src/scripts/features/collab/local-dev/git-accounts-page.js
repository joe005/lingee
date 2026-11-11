import { $ } from '../../../core/dom.js';
import { requestDeleteConfirmation } from '../../../core/delete-confirm.js';
import { DELETE_ICON } from '../../../core/delete-icon.js';
import { toast } from '../../../core/toast.js';
import { LD_ACCOUNT_LABELS, ldAccountKey, ldAuthFor, ldAuthUser, ldDetectHost, ldEsc, ldIsDetectingHost, ldMine, ldRefresh, ldRemoveAuth } from './core.js';
import { ldGitInstallHtml } from './git-install.js';
import { ldSettingsTab, ldSettingsVisible } from './settings-page.js';
import { LD_ICONS, ldPlatformKey, ldPlatformLogo, ldStateTag } from './ui.js';

/* Git 账号：两列卡片，上方展示平台图标、账号、状态与主机，下方展示 Git 账号和登录方式。
   不获取或推算到期日；凭据失效以检测结果为准。原有重新登录、检测和删除权限保持不变。 */
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
  if (!key || key === 'ready' || key === 'login' || key === 'expiring') key = 'available';
  if (auth?.expired) key = 'expired';
  return key;
}
function menuItems(host, auth, key) {
  var login = { attr:'data-ld-auth-open="' + ldEsc(host) + '"', icon:ICONS.key, text:'重新登录' };
  var detect = { attr:'data-ld-acct-detect="' + ldEsc(host) + '"', icon:ICONS.detect, text:'检测' };
  var remove = { attr:'data-ld-acct-delete="' + ldEsc(host) + '"', icon:DELETE_ICON, text:'删除', danger:true };
  var items = key === 'offline' ? [detect, login] : [login, detect];
  return auth.source === 'local' ? items : items.concat(remove);
}
function cardHtml(host, checks) {
  var auth = ldAuthFor(host), key = stateKey(host, checks), detecting = ldIsDetectingHost(host);
  var avatar = '<span class="ld-acct-avatar">' + ldPlatformLogo(ldPlatformKey(host)) + '</span>';
  var name = ldAuthUser(auth);
  var title = name;
  var loginMethod = auth.source === 'local' ? '本机凭据' : auth.source === 'token' ? '访问令牌' : '浏览器登录';
  var open = menuHost === host;
  var menu = open ? '<div class="ld-acct-menu" role="menu">' + menuItems(host, auth, key).map(function (item) {
    return '<button type="button" role="menuitem"' + (item.danger ? ' class="is-danger"' : '') + ' ' + item.attr + '>' + item.icon + '<span>' + item.text + '</span></button>';
  }).join('') + '</div>' : '';
  var action = '<div class="ld-acct-more"><button type="button" class="ld-acct-more-btn" data-ld-acct-more="' + ldEsc(host) + '" aria-haspopup="menu" aria-expanded="' + open + '" aria-label="' + ldEsc(name) + ' 的更多操作">' + ICONS.more + '</button>' + menu + '</div>';
  var tag = detecting ? '<span class="ld-state is-muted" role="status">检测中…</span>' : key ? ldStateTag(key, LD_ACCOUNT_LABELS) : '';
  return '<article class="ld-acct-card' + (open ? ' is-menu-open' : '') + '"' + (detecting ? ' aria-busy="true"' : '') + '><div class="ld-acct-header">' + avatar
    + '<div class="ld-acct-main"><div class="ld-acct-title"><strong title="' + ldEsc(title) + '">' + ldEsc(title) + '</strong>' + tag + '</div>'
    + '<span class="ld-acct-desc" title="' + ldEsc(host) + '">' + ldEsc(host) + '</span></div>'
    + '<div class="ld-acct-act">' + action + '</div></div>'
    + '<dl class="ld-acct-details"><div><dt>GIT 账号</dt><dd title="' + ldEsc(name) + '">' + ldEsc(name) + '</dd></div>'
    + '<div><dt>登录方式</dt><dd>' + loginMethod + '</dd></div></dl></article>';
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
  var banner = mine.gitMissing ? ldGitInstallHtml('settings') : '';
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
  /* 本机凭据不是 Lingee 保存的，菜单里不提供删除 */
  if (!auth || auth.source === 'local') return;
  var user = ldAuthUser(auth);
  var ok = await requestDeleteConfirmation('删除后将从系统 Git 凭据库清除 ' + host + ' 上账号 ' + user + ' 的令牌，终端和其他 Git 工具访问该主机也会失效；用到该平台的空间需要重新登录才能拉取和推送。',
    { title: '删除 Git 账号', confirmLabel: '确认删除' });
  if (!ok) return;
  ldRemoveAuth(host);
  ldRefresh();
  toast('已删除 ' + ldEsc(host) + ' 上的账号 ' + ldEsc(user), 'success');
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
