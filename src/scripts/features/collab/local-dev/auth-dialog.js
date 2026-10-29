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
/* 获取访问令牌的步骤，按平台展开显示；权限只在步骤里说明，输入框下只提示保存位置 */
var LD_TOKEN_GUIDE = {
  GitHub:['打开 GitHub，进入 Settings › Developer settings › Personal access tokens', '经典令牌（classic）勾选 repo；或用细粒度令牌（Fine-grained），把 Contents 设为 Read and write', '组织开启了 SSO 时，在令牌旁点「Configure SSO › Authorize」，否则推送组织仓库会被拒', '复制令牌（只显示一次），粘贴到上方输入框'],
  GitLab:['打开 {host}，进入头像菜单 › Edit profile › Access tokens', '点「Add new token」，勾选 read_user、read_repository、write_repository，选一个到期时间（到期前 7 天 Lingee 会提醒）', '创建后复制令牌（只显示一次），粘贴到上方输入框'],
  Gitee:['打开 Gitee，进入设置 › 安全设置 › 私人令牌', '点「生成新令牌」，勾选 user_info、projects', '提交后复制令牌，粘贴到上方输入框'],
};
var LD_HOST_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/;
function ldAuthHostValue() {
  if (!authCustom) return authHost;
  if (authPlatform === 'KDGitLab') return LD_KD_GITLAB;
  if (authPlatform === 'GitHub') return 'github.com';
  if (authPlatform === 'Gitee') return 'gitee.com';
  return $('#ldAuthHost').value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
}
function ldAuthPlatformValue() { return authCustom ? (authPlatform === 'KDGitLab' ? 'GitLab' : authPlatform) : ldHostPlatform(authHost); }
export function ldOpenAuth(host, onSaved) {
  authHost = host || '';
  authCustom = !host;
  authPlatform = 'KDGitLab';
  authRun++;
  authOnSaved = onSaved || null;
  $('#ldAuthHost').value = '';
  $('#ldAuthToken').value = '';
  $('#ldAuthTitle').textContent = authCustom ? '添加 Git 账号' : '登录 Git 账号';
  $('#ldAuthSub').textContent = authCustom ? '' : host + ' · ' + ldHostPlatform(host);
  $('#ldAuthGuide').open = false;
  renderAuthPlatform();
  setAuthError('');
  setAuthBusy(false);
  ldShow('#ldAuthOverlay');
  setTimeout(function () { (authCustom ? $('#ldAuthHost') : $('#ldAuthToken')).focus(); }, 0);
}
function renderAuthPlatform() {
  $('#ldAuthPlatformBox').hidden = !authCustom;
  $('#ldAuthHostBox').hidden = !authCustom || authPlatform !== 'GitLab';
  document.querySelectorAll('[data-ld-auth-platform]').forEach(function (btn) {
    var on = btn.getAttribute('data-ld-auth-platform') === authPlatform;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-checked', String(on));
  });
  var fixedHost = authCustom && authPlatform !== 'GitLab' ? ldAuthHostValue() : '';
  $('#ldAuthHostShow').hidden = !fixedHost;
  $('#ldAuthHostShow').textContent = fixedHost ? '地址：' + fixedHost : '';
  $('#ldAuthHint').textContent = '令牌只保存在本机系统钥匙串';
  var guideHost = ldAuthHostValue() || '你的 GitLab';
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
    if (t.closest('#ldAuthSubmit')) { submitAuth(); return; }
    if (t.closest('#ldAuthCreate') && !LD_HOST_RE.test(ldAuthHostValue())) { setAuthError('请先填写正确的平台地址，如 git.kingdee.com'); $('#ldAuthHost').focus(); return; }
    if (t.closest('#ldAuthCreate')) {
      /* 原型在新标签页打开真实的令牌创建页；桌面客户端里用系统浏览器打开 */
      var tokenPlatform = ldAuthPlatformValue();
      window.open(ldTokenPage(tokenPlatform, ldAuthHostValue()), '_blank', 'noopener');
      toast(tokenPlatform === 'Gitee' ? '已打开 Gitee 令牌页，请勾选 user_info、projects 后生成' : '已打开令牌创建页，名称和权限已预填');
      return;
    }
    var platformPick = t.closest('[data-ld-auth-platform]');
    if (platformPick) { authPlatform = platformPick.getAttribute('data-ld-auth-platform'); setAuthError(''); renderAuthPlatform(); return; }
    var authOpen = t.closest('[data-ld-auth-open]');
    if (authOpen) { ldOpenAuth(authOpen.getAttribute('data-ld-auth-open'), null); return; }
    if (t.closest('[data-ld-auth-add]')) ldOpenAuth('', null);
  });
  document.addEventListener('input', function (e) {
    if (e.target instanceof HTMLElement && (e.target.id === 'ldAuthHost' || e.target.id === 'ldAuthToken')) setAuthError('');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.id === 'ldAuthHost') { e.preventDefault(); $('#ldAuthToken').focus(); return; }
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.id === 'ldAuthToken') { e.preventDefault(); submitAuth(); return; }
    if (e.key === 'Escape' && ldVisible('#ldAuthOverlay')) { e.stopPropagation(); closeAuth(); }
  }, true);
}
