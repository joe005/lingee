import { $ } from '../../../core/dom.js';
import { ldBindingKey, ldEnvironmentId, ldRemoteKey, ldEsc, ldMine, ldProjectView, ldSettingsProjects } from './core.js';
import { ldGitInstallHtml } from './git-install.js';
import { ldSettingsTab, ldSettingsVisible } from './settings-page.js';
import { ldProjectAction, ldStateTag } from './ui.js';

/* 本地开发 · 设置 ›「本机环境」（#ldSpacesPanel）：每个开发空间一个紧凑列表行，
   左侧空间名称 + 状态 + 仓库地址，下方按需显示空间目录，右侧按状态给「初始化 / 设置 / 待配置」等操作。 */
function cardHtml(project) {
  var view = ldProjectView(project), st = view.st, key = project.unused ? 'unused' : view.key;
  var binding = st.binding && !st.invalid && !st.ssh ? st.binding : null;
  /* 地址不规范、连不上、找不到仓库、没配仓库：原因直接显示在地址下面 */
  var problem = ['invalid', 'offline', 'notfound'].includes(key) && view.reason;
  var tagTitle = key && key !== 'ready' && !problem ? ' title="' + ldEsc(view.reason) + '"' : '';
  return '<article class="ld-space-card">'
    + '<div class="ld-space-main"><div class="ld-space-title"><strong title="' + ldEsc(project.name) + '">' + ldEsc(project.name) + '</strong><span' + tagTitle + '>' + ldStateTag(key) + '</span></div>'
    + '<span class="ld-space-repo" title="' + ldEsc(st.info?.repo || '') + '">' + ldEsc(st.info?.repo || '未配置代码仓库') + '</span>'
    + '<div class="ld-space-usages">' + (project.usages || []).map(function (scope) { return '<span class="ld-env-usage" title="' + ldEsc(scope.name) + '">' + ldEsc(scope.name) + '</span>'; }).join('') + '</div>'
    + (binding ? '<div class="ld-space-meta"><span class="ld-space-field ld-space-field--dir"><span class="ld-space-label">目录</span><code class="ld-space-value" title="' + ldEsc(binding.path) + '">' + ldEsc(binding.path) + '</code></span></div>' : '')
    + (problem ? '<span class="ld-space-problem" title="' + ldEsc(view.reason) + '">' + ldEsc(view.reason) + '</span>' : '') + '</div>'
    + '<div class="ld-space-act">' + ldProjectAction(project, view, 'ld-space-btn') + '</div>'
    + '</article>';
}
function scopeChoices(project) {
  if (!project.usages?.length) return '';
  var mine = ldMine(), repoKey = ldRemoteKey(project.repo);
  var copies = Object.entries(mine.repoBindings).filter(function (row) { return row[0] !== repoKey && row[1].repoKey === repoKey; });
  return '<details class="ld-scope-directories"><summary>工作范围使用的目录 · ' + project.usages.length + '</summary><div>' + project.usages.map(function (scope) {
    var target = ldEnvironmentId(Object.assign({},project,scope,{bindingKey:''})), selected = ldBindingKey(target);
    return '<label><span title="' + ldEsc(scope.name) + '">' + ldEsc(scope.name) + '</span><select data-ld-scope-directory="' + ldEsc(target) + '" aria-label="' + ldEsc(scope.name) + '的本机目录"><option value="' + ldEsc(repoKey) + '"' + (selected === repoKey ? ' selected' : '') + '>默认复用目录</option>' + copies.map(function (row) { return '<option value="' + ldEsc(row[0]) + '"' + (selected === row[0] ? ' selected' : '') + '>' + ldEsc(row[1].path) + '</option>'; }).join('') + '<option value="__new">使用独立目录…</option></select></label>';
  }).join('') + '</div></details>';
}
function groupedHtml(projects) {
  var groups = new Map();
  projects.forEach(function (p) { var key = ldRemoteKey(p.repo); if (!groups.has(key)) groups.set(key,[]); groups.get(key).push(p); });
  return Array.from(groups.values()).map(function (rows) {
    var root = rows.find(function (p) { return !p.isCopy; });
    return '<section class="ld-repo-group">' + (root ? cardHtml(root) : '') + rows.filter(function (p) { return p.isCopy; }).map(function (p) { return '<div class="ld-repo-copy"><span class="cv-basic-note">独立目录</span>' + cardHtml(p) + '</div>'; }).join('') + (root ? scopeChoices(root) : '') + '</section>';
  }).join('');
}

function render() {
  var panel = $('#ldSpacesPanel');
  if (!panel || !ldSettingsVisible() || ldSettingsTab() !== 'spaces') return;
  var projects = ldSettingsProjects();
  var gitMissing = ldMine().gitMissing;
  panel.innerHTML = (gitMissing ? ldGitInstallHtml('settings') : '')
    + (projects.length ? '<div class="ld-space-list" aria-label="本机环境">' + groupedHtml(projects) + '</div>'
      : '<div class="ld-set-empty">暂无已配置的代码仓库，请先在「工作区设置 › 仓库」配置。</div>');
}

export function initSpacesPage() {
  document.addEventListener('lingee:ld-settings-shown', render);
  document.addEventListener('lingee:local-dev-changed', render);
}
