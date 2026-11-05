import { toast } from '../../../core/toast.js';
import { ldBindingKey, ldAuthUser, ldBindingFor, ldEnvironmentId, ldTargetProject, ldBindDir, ldCheckDir, ldDefaultPath, ldEsc, ldMarkInitialized, ldNetCheck, ldProjectStatus, ldPushCheck, ldPushIssueText, ldRecordChecks, ldRefresh } from './core.js';
import { ldJobOf, ldJobRemove, ldJobSet } from './init-jobs.js';
import { LD_ICONS, ldInitProgressHtml, ldReadonlyRepoHtml } from './ui.js';

/* 本地开发 · 空间表单：代码仓库（只读）、Git 账号、本机目录三段，以及初始化执行。
   「初始化空间 / 空间设置」与「准备执行环境」两个弹窗各持一份表单状态，共用这里的渲染和执行逻辑，
   弹窗本身只管标题、说明和底部按钮。 */

export function ldNewSpaceForm(projectId) {
  var project = ldTargetProject(projectId);
  projectId = ldEnvironmentId(Object.assign({},project,{bindingKey:ldBindingKey(project)}));
  var binding = ldBindingFor(projectId);
  var mode = binding && (binding.mode === 'existing' || binding.path !== ldDefaultPath(project)) ? 'existing' : 'auto';
  return { projectId:projectId, mode:mode, path:mode === 'existing' ? binding.path : '', pulling:0, error:'', menu:false, run:0 };
}
export function ldSpaceFormTarget(form) {
  return form.mode === 'existing' ? form.path : ldDefaultPath(ldTargetProject(form.projectId));
}

/* Git 账号：账号按仓库主机自动匹配，同一平台登录一次即可复用；下拉里列出这个平台的账号，底部「新增账号」 */
function accountHtml(form, status) {
  var info = status.info, busy = form.pulling ? ' disabled' : '';
  var current = status.authOk ? ldAuthUser(status.auth) + ' · ' + info.host : '';
  /* 没有可用账号时账号框直接打开登录 */
  var trigger = '<button type="button" class="ld-select" data-ld-form-account' + (status.authOk ? '' : ' data-ld-auth-open="' + ldEsc(info.host) + '"') + ' aria-haspopup="listbox" aria-expanded="' + !!form.menu + '"' + busy + '>'
    + '<span class="' + (current ? '' : 'ld-select-placeholder') + '">' + ldEsc(current || (status.auth?.expired ? info.host + ' 的凭据已失效，请重新登录' : '请登录 ' + info.host + ' 的 Git 账号')) + '</span>' + LD_ICONS.chevron + '</button>';
  var menu = form.menu ? '<div class="ld-select-menu" role="listbox" aria-label="Git 账号">'
    + (status.authOk ? '<div class="ld-select-option is-on" role="option" aria-selected="true"><span>' + ldEsc(current) + '</span>' + LD_ICONS.check + '</div><div class="ld-select-divider" role="separator"></div>' : '')
    + '<button type="button" class="ld-select-add" data-ld-auth-open="' + ldEsc(info.host) + '">' + LD_ICONS.plus + '新增账号</button></div>' : '';
  return '<div class="ld-form-field"><span class="ld-form-label" id="ldFormAccount-' + ldEsc(form.projectId) + '">Git 账号<b class="ld-req" aria-hidden="true">*</b></span><div class="ld-select-wrap">' + trigger + menu + '</div></div>';
}

/* 本机目录：默认目录 / 自定义目录两张单选卡片，自定义选中后在卡片内选择文件夹 */
function directoryOptions(form) {
  var base = ldDefaultPath(ldTargetProject(form.projectId));
  return [base + '-dev', base + '-test'];
}
function directoryHtml(form) {
  var busy = form.pulling ? ' disabled' : '';
  var defaultPath = ldDefaultPath(ldTargetProject(form.projectId));
  var card = function (value, title, desc) {
    return '<label class="ld-dir-card"><input type="radio" name="ldFormDir-' + ldEsc(form.projectId) + '" data-ld-form-dir value="' + value + '"' + (form.mode === value ? ' checked' : '') + busy + '>'
      + '<span class="ld-dir-card-radio" aria-hidden="true"></span><span class="ld-dir-card-body"><strong>' + title + '</strong><span class="ld-dir-card-desc" title="' + ldEsc(desc) + '">' + ldEsc(desc) + '</span></span></label>';
  };
  var custom = card('existing', '自定义目录', form.path || '选择本机根目录内的文件夹');
  var picker = form.mode === 'existing'
    ? '<details class="ld-dir-picker"><summary>' + (form.path ? '重新选择' : '选择文件夹') + '</summary>'
      + '<div class="ld-dir-picker-options" role="group" aria-label="可选演示文件夹"><span class="ld-form-label">可选演示文件夹</span>'
      + directoryOptions(form).map(function (path, index) {
        return '<button type="button" class="ld-btn" data-ld-form-folder="' + index + '" title="' + ldEsc(path) + '"'
          + (path === form.path ? ' disabled' : '') + '>' + ldEsc(path) + '</button>';
      }).join('') + '</div></details>'
    : '';
  return '<div class="ld-form-field"><span class="ld-form-label">本机目录</span><div class="ld-dir-cards" role="radiogroup" aria-label="本机目录">'
    + card('auto', '默认目录', defaultPath) + custom + '</div>' + picker + '</div>';
}

export function ldSpaceFormHtml(form) {
  var status = ldProjectStatus(form.projectId);
  var info = status.info;
  if (!info) return '';
  /* 初始化进行中只显示进度，表单收起（UE） */
  if (form.pulling) return ldInitProgressHtml(info, form.pulling, ldSpaceFormTarget(form));
  return '<div class="ld-form-field"><span class="ld-form-label">代码仓库</span>' + ldReadonlyRepoHtml(info) + '</div>'
    + accountHtml(form, status)
    + directoryHtml(form)
    + (form.error ? '<div class="ld-warn" role="alert"><span>' + ldEsc(form.error) + '</span>' + (/找不到|不存在/.test(form.error) ? '<button type="button" class="ld-btn" data-ld-auth-open="' + ldEsc(info.host) + '">更换账号</button>' : '') + '</div>' : '')
    + (status.authOk && !status.writeOk ? '<div class="ld-warn"><span>' + ldEsc(status.reason) + '</span><button type="button" class="ld-btn" data-ld-auth-open="' + ldEsc(info.host) + '">更换账号</button></div>' : '');
}

/* 表单内的点击与单选；返回 true 表示已处理，调用方随后重绘 */
export function ldSpaceFormClick(form, target) {
  if (target.closest('[data-ld-auth-open]')) { form.menu = false; return true; }   /* 登录弹窗由 auth-dialog.js 打开 */
  if (target.closest('[data-ld-form-account]')) {
    var status = ldProjectStatus(form.projectId);
    form.menu = !form.menu;
    return true;
  }
  var folder = target.closest('[data-ld-form-folder]');
  if (folder && form.mode === 'existing' && !form.pulling) {
    var path = directoryOptions(form)[folder.dataset.ldFormFolder];
    if (!path) return false;
    form.path = path;
    form.error = '';
    return true;
  }
  if (form.menu && !target.closest('.ld-select-wrap')) { form.menu = false; return true; }
  return false;
}
export function ldSpaceFormChange(form, target) {
  if (!(target instanceof HTMLInputElement) || !target.hasAttribute('data-ld-form-dir')) return false;
  form.mode = target.value;
  form.error = '';
  return true;
}

/* 初始化：先校验目录与连通性（失败时原目录和原绑定不变），再按进度获取基准分支代码并写入本机绑定。
   hooks.render 每步重绘；hooks.done(first, path) 成功后调用，弹窗关了（后台初始化）也会调用。返回是否已开始。
   进度记在 init-jobs.js，导航气泡据此展示后台任务。 */
export function ldRunSpaceInit(form, hooks) {
  var status = ldProjectStatus(form.projectId);
  if (!status.authOk || status.key === 'git' || form.pulling) return false;
  if (ldJobOf(form.projectId)) { toast('这个仓库正在初始化，请等待完成', 'warning'); return false; }
  if (form.mode === 'existing' && !form.path) { toast('请先选择目录', 'warning'); return false; }
  var path = ldSpaceFormTarget(form);
  var error = ldCheckDir(form.projectId, path);
  if (error) { form.error = error; hooks.render(); return false; }
  var net = ldNetCheck(status.info, status.auth);
  form.error = net ? net.reason : '';
  if (net) { ldRecordChecks(status.info.host); ldRefresh(); hooks.render(); return false; }
  if (!ldPushCheck(status.auth)) {
    form.error = ldPushIssueText(status.auth, status.info.platform);
    hooks.render();
    return false;
  }
  var projectId = form.projectId, mode = form.mode, first = !status.binding;
  var name = ldTargetProject(projectId)?.name || '';
  form.menu = false;
  form.pulling = 8;
  ldJobSet(projectId, { name:name, branch:status.info.baseBranch, pulling:8, background:false });
  hooks.render();
  var run = ++form.run;
  var timer = setInterval(function () {
    if (run !== form.run) { clearInterval(timer); return; }
    form.pulling = Math.min(100, form.pulling + 8);
    ldJobSet(projectId, { pulling:form.pulling });
    if (form.pulling < 100) { hooks.render(); return; }
    clearInterval(timer);
    if (!ldBindDir(projectId, path, mode)) { form.pulling = 0; form.error = '本机目录绑定保存失败，请重试'; ldJobRemove(projectId); hooks.render(); return; }
    var after = ldProjectStatus(projectId);
    if (!after.ready) { form.pulling = 0; form.error = after.reason; ldJobRemove(projectId); hooks.render(); return; }
    ldMarkInitialized(projectId);
    ldRecordChecks(after.info.host);
    ldRefresh();
    hooks.render();
    setTimeout(function () {
      if (run !== form.run) return;
      ldJobRemove(projectId);
      toast(first ? '「' + ldEsc(name) + '」已就绪，已获取 ' + ldEsc(status.info.baseBranch) + ' 最新代码，目录：' + ldEsc(path) : '仓库已重新初始化，目录：' + ldEsc(path), 'success');
      hooks.done(first, path);
    }, 600);
  }, 900);
  return true;
}
/* 「停止」：作废进行中的初始化，回到表单（目录和绑定保持原样） */
export function ldCancelSpaceInit(form) {
  if (!form) return;
  form.run++;
  form.pulling = 0;
  ldJobRemove(form.projectId);
}
/* 「后台初始化」：弹窗关闭后继续跑，进度显示在导航气泡里 */
export function ldBackgroundSpaceInit(form) { if (form?.pulling) ldJobSet(form.projectId, { background:true }); }
export function ldSpaceInitRunning(projectId) { return !!ldJobOf(projectId); }
