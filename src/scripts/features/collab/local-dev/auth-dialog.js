import { $ } from '../../../core/dom.js';
import { toast } from '../../../core/toast.js';
import { ldEsc, ldHide, ldHostPlatform, ldRecordChecks, ldRefresh, ldSaveAuthEntry, ldShow, ldTokenPage, ldVisible } from './core.js';

/* 本地开发 · 登录 / 添加 Git 账号弹窗（#ldAuthOverlay）。设置页、空间表单与任务对话共用。
   一期只用访问令牌（浏览器登录待平台授权应用就绪后接入）。
   从空间或账号行打开时平台已知；host 为空时是「添加账号」：选金蝶 GitLab / GitHub / Gitee / 其他 GitLab，其他 GitLab 填写平台地址。
   任何位置带 data-ld-auth-open="<主机>" 的按钮都由这里打开，data-ld-auth-add 打开添加账号。 */
var authHost = '';
var authOnSaved = null;
var authCustom = false;
var authPlatform = 'KDGitLab';
var authRun = 0;
var LD_KD_GITLAB = 'git.kingdee.com';
/* 获取访问令牌的步骤：先点「去平台创建」打开已预填名称和权限的令牌页，按平台显示；常显在令牌输入框下方 */
var LD_TOKEN_GUIDE = {
  GitHub:['点上方「去平台创建」，在打开的 GitHub 页面登录', '权限已自动勾选好（repo），直接点页面底部的「Generate token」', '如果你的仓库属于公司组织，还要在新令牌旁点「Configure SSO」并授权该组织，否则代码推送不上去', '复制生成的令牌（离开页面后就看不到了），粘贴到上方输入框'],
  GitLab:['点上方「去平台创建」，在打开的 {host} 页面登录', '名称和权限已自动填好（read_user、read_repository、write_repository），选一个到期时间后点「Create personal access token」；到期前 7 天 Lingee 会提醒', '复制生成的令牌（离开页面后就看不到了），粘贴到上方输入框'],
  Gitee:['点上方「去平台创建」，在打开的 Gitee 私人令牌页登录', '点「生成新令牌」，勾选 user_info、projects 后提交', '复制生成的令牌（离开页面后就看不到了），粘贴到上方输入框'],
};
var LD_PLATFORM_LABELS = { KDGitLab:'金蝶 GitLab', GitHub:'GitHub', Gitee:'Gitee', GitLab:'其他 GitLab' };
var LD_PLATFORM_HOSTS = { KDGitLab:LD_KD_GITLAB, GitHub:'github.com', Gitee:'gitee.com' };
var LD_HOST_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/;
function ldAuthHostValue() {
  if (!authCustom) return authHost;
  if (LD_PLATFORM_HOSTS[authPlatform]) return LD_PLATFORM_HOSTS[authPlatform];
  return $('#ldAuthHost').value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
}
function ldAuthPlatformValue() { return authCustom ? (authPlatform === 'KDGitLab' ? 'GitLab' : authPlatform) : ldHostPlatform(authHost); }
/* 已知平台（从账号卡片、空间进入）时平台下拉按主机带出并锁定 */
function ldPlatformOption(host) {
  if (host === LD_KD_GITLAB) return 'KDGitLab';
  var platform = ldHostPlatform(host);
  return platform === 'GitHub' || platform === 'Gitee' ? platform : 'GitLab';
}
export function ldOpenAuth(host, onSaved) {
  authHost = host || '';
  authCustom = !host;
  authPlatform = authCustom ? 'KDGitLab' : ldPlatformOption(host);
  authRun++;
  authOnSaved = onSaved || null;
  $('#ldAuthToken').value = '';
  $('#ldAuthTitle').textContent = authCustom ? '添加 Git 账号' : '登录 Git 账号';
  $('#ldAuthPlatform').disabled = !authCustom;
  toggleAuthPlatformMenu(false);
  renderAuthPlatform();
  setAuthError('');
  setAuthBusy(false);
  ldShow('#ldAuthOverlay');
  setTimeout(function () { (authCustom ? $('#ldAuthPlatform') : $('#ldAuthToken')).focus(); }, 0);
}
/* 「Git 账号」一栏：已知平台只读显示「主机 · 平台」；其他 GitLab 可填写平台地址 */
function renderAuthPlatform() {
  var editable = authCustom && authPlatform === 'GitLab';
  $('#ldAuthPlatformText').textContent = LD_PLATFORM_LABELS[authPlatform];
  var host = $('#ldAuthHost');
  host.readOnly = !editable;
  if (!editable) host.value = ldAuthHostValue() + ' · ' + ldAuthPlatformValue();
  else if (/ · /.test(host.value)) host.value = '';
  host.placeholder = editable ? '填写平台地址，如 git.example.com' : '';
  $('#ldAuthHint').textContent = '令牌只保存在本机系统钥匙串';
  renderAuthGuide();
}
/* 平台下拉：与空间表单里的 Git 账号下拉同一套样式，当前项打勾 */
function toggleAuthPlatformMenu(open) {
  var menu = $('#ldAuthPlatformMenu');
  if (!menu) return;
  if (open) {
    menu.innerHTML = Object.keys(LD_PLATFORM_LABELS).map(function (key) {
      var on = key === authPlatform;
      return '<button type="button" class="ld-select-item' + (on ? ' is-on' : '') + '" role="option" aria-selected="' + on + '" data-ld-auth-platform="' + key + '"><span>' + LD_PLATFORM_LABELS[key] + '</span>'
        + (on ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>' : '') + '</button>';
    }).join('');
  }
  menu.hidden = !open;
  $('#ldAuthPlatform').setAttribute('aria-expanded', String(!!open));
}
function renderAuthGuide() {
  var guideHost = ldAuthHostValue() || '平台地址';
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
  ldRefresh();
  if (done) done();
}

function closeAuth() { ldHide('#ldAuthOverlay'); authOnSaved = null; }
export function initAuthDialog() {
  if (!$('#ldAuthOverlay')) return;
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('[data-ld-auth-close]') || t.id === 'ldAuthOverlay') { closeAuth(); return; }
    if (t.closest('#ldAuthPlatform')) { if (authCustom) toggleAuthPlatformMenu($('#ldAuthPlatformMenu').hidden); return; }
    var platformPick = t.closest('[data-ld-auth-platform]');
    if (platformPick) {
      authPlatform = platformPick.getAttribute('data-ld-auth-platform');
      toggleAuthPlatformMenu(false);
      setAuthError('');
      renderAuthPlatform();
      $('#ldAuthPlatform').focus();
      if (authPlatform === 'GitLab') $('#ldAuthHost').focus();
      return;
    }
    if (!t.closest('#ldAuthPlatformWrap') && !$('#ldAuthPlatformMenu').hidden) toggleAuthPlatformMenu(false);
    if (t.closest('#ldAuthSubmit')) { submitAuth(); return; }
    if (t.closest('#ldAuthCreate') && !LD_HOST_RE.test(ldAuthHostValue())) { setAuthError('请先填写正确的平台地址，如 git.kingdee.com'); $('#ldAuthHost').focus(); return; }
    if (t.closest('#ldAuthCreate')) {
      /* 原型在新标签页打开真实的令牌创建页；桌面客户端里用系统浏览器打开 */
      var tokenPlatform = ldAuthPlatformValue();
      window.open(ldTokenPage(tokenPlatform, ldAuthHostValue()), '_blank', 'noopener');
      toast(tokenPlatform === 'Gitee' ? '已打开 Gitee 令牌页，请勾选 user_info、projects 后生成' : '已打开令牌创建页，名称和权限已预填');
      return;
    }
    var authOpen = t.closest('[data-ld-auth-open]');
    if (authOpen) { ldOpenAuth(authOpen.getAttribute('data-ld-auth-open'), null); return; }
    if (t.closest('[data-ld-auth-add]')) ldOpenAuth('', null);
  });
  document.addEventListener('input', function (e) {
    if (e.target instanceof HTMLElement && (e.target.id === 'ldAuthHost' || e.target.id === 'ldAuthToken')) setAuthError('');
    if (e.target instanceof HTMLElement && e.target.id === 'ldAuthHost') renderAuthGuide();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.id === 'ldAuthHost') { e.preventDefault(); $('#ldAuthToken').focus(); return; }
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.id === 'ldAuthToken') { e.preventDefault(); submitAuth(); return; }
    if (e.key === 'Escape' && ldVisible('#ldAuthOverlay')) {
      e.stopPropagation();
      if (!$('#ldAuthPlatformMenu').hidden) { toggleAuthPlatformMenu(false); $('#ldAuthPlatform').focus(); return; }
      closeAuth();
    }
  }, true);
}
