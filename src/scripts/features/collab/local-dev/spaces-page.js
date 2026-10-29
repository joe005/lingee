import { $ } from '../../../core/dom.js';
import { ldAuthUser, ldEsc, ldMine, ldProjectView, ldSettingsProjects } from './core.js';
import { ldGitInstallHtml } from './git-install.js';
import { ldSettingsTab, ldSettingsVisible } from './settings-page.js';
import { ldProjectAction, ldStateTag } from './ui.js';

/* 本地开发 · 设置 ›「我的空间」（#ldSpacesPanel）：每个开发空间一张卡片，
   左侧空间名称 + 状态 + 仓库地址，中间 Git 账号与空间目录，右侧按状态给「初始化 / 设置 / 待配置」等操作。 */
function cardHtml(project) {
  var view = ldProjectView(project), st = view.st, key = view.key;
  var binding = st.binding && !st.invalid && !st.ssh ? st.binding : null;
  /* 地址不规范、连不上、找不到仓库、没配仓库：原因直接显示在地址下面 */
  var problem = ['invalid', 'offline', 'notfound'].includes(key) && view.reason;
  var account = !st.info ? '—' : st.authOk ? ldEsc(ldAuthUser(st.auth)) : st.auth?.expired ? '凭据失效' : '未登录';
  var tagTitle = key && key !== 'ready' && !problem ? ' title="' + ldEsc(view.reason) + '"' : '';
  return '<article class="ld-space-card">'
    + '<div class="ld-space-main"><div class="ld-space-title"><strong title="' + ldEsc(project.name) + '">' + ldEsc(project.name) + '</strong><span' + tagTitle + '>' + ldStateTag(key) + '</span></div>'
    + '<span class="ld-space-repo" title="' + ldEsc(st.info?.repo || '') + '">' + ldEsc(st.info?.repo || '未配置代码仓库') + '</span>'
    + (problem ? '<span class="ld-space-problem" title="' + ldEsc(view.reason) + '">' + ldEsc(view.reason) + '</span>' : '') + '</div>'
    + '<div class="ld-space-field"><span class="ld-space-label">GIT 账号</span><span class="ld-space-value">' + account + '</span></div>'
    + '<div class="ld-space-field ld-space-field--dir">' + (binding ? '<span class="ld-space-label">空间目录</span><code class="ld-space-value" title="' + ldEsc(binding.path) + '">' + ldEsc(binding.path) + '</code>' : '') + '</div>'
    + '<div class="ld-space-act">' + ldProjectAction(project, view, 'ld-space-btn') + '</div>'
    + '</article>';
}
function render() {
  var panel = $('#ldSpacesPanel');
  if (!panel || !ldSettingsVisible() || ldSettingsTab() !== 'spaces') return;
  var projects = ldSettingsProjects();
  var gitMissing = ldMine().gitMissing;
  panel.innerHTML = (gitMissing ? ldGitInstallHtml('settings') : '')
    + (projects.length ? '<div class="ld-space-list" aria-label="我的空间">' + projects.map(cardHtml).join('') + '</div>'
      : '<div class="ld-set-empty">暂无可配置的开发空间，请联系空间管理员邀请你加入。</div>');
}

export function initSpacesPage() {
  document.addEventListener('lingee:ld-settings-shown', render);
  document.addEventListener('lingee:local-dev-changed', render);
}
