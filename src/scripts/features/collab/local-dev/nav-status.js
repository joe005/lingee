import { $ } from '../../../core/dom.js';
import { ldAttentionProjects, ldEsc, ldProjectView, ldRepoInfo } from './core.js';
import { ldProjectAction } from './ui.js';

/* 本地开发 · 协作开发顶部「N 个目录未就绪」提醒与浮层（#ldNavStatus / #ldNavPop）。
   统计任务页当前空间关联的仓库；任务页选「全部空间」时范围为空，统计我能看到的所有空间（同一仓库目录只算一次），
   浮层里每个仓库注明所属空间。有未就绪的仓库时橙色提示，点开列出这些仓库及各自操作；
   都已就绪时与客户端一致显示绿色「空间已就绪」，点击打开设置（data-ld-open-settings 由 actions.js 统一处理）。
   当前范围由协作开发在初始化时注入（ldSetNavScope），本模块不反向依赖任务页。 */
var navScope = function () { return null; };
export function ldSetNavScope(provider) { if (typeof provider === 'function') navScope = provider; }
function scopedAttention() {
  var scope = navScope();
  var list = ldAttentionProjects();
  if (!scope || !scope.project) return list;
  return list.filter(function (env) {
    return (env.usages || []).some(function (u) { return u.spaceId === scope.project && (u.workspaceId || '') === (scope.ws || ''); });
  });
}
function renderNavStatus() {
  var btn = $('#ldNavStatus');
  if (!btn) return;
  var pending = scopedAttention().length;
  btn.hidden = false;
  btn.classList.toggle('is-ready', !pending);
  if (!pending) {
    toggleNavPop(false);
    btn.dataset.ldOpenSettings = '';
    btn.removeAttribute('aria-haspopup');
    btn.querySelector('.ld-nav-text').textContent = '空间已就绪';
    btn.setAttribute('aria-label', '空间已就绪，打开设置');
    return;
  }
  btn.removeAttribute('data-ld-open-settings');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.querySelector('.ld-nav-text').textContent = pending + ' 个目录未就绪';
  btn.setAttribute('aria-label', '本地开发环境：' + pending + ' 个目录未就绪');
}
function renderNavPop() {
  var pop = $('#ldNavPop');
  var scope = navScope(), allSpaces = !scope || !scope.project;
  pop.innerHTML = '<div class="ld-pop-head"><strong>' + (allSpaces ? '仓库目录未就绪' : '当前空间仓库未就绪') + '</strong><span>初始化本机执行目录后，任务才能在本机执行</span></div>'
    + '<ul class="ld-pop-list">' + scopedAttention().map(function (project) {
      var view = ldProjectView(project);
      /* 全部空间时注明仓库所属空间（同一仓库被多个空间使用时都列出） */
      var spaces = allSpaces ? Array.from(new Set((project.usages || []).map(function (u) { return u.name; }).filter(Boolean))).join('、') : '';
      var detail = (spaces ? spaces + ' · ' : '') + view.reason;
      /* 已限定在当前工作区，名称显示仓库名（取自仓库地址），不再重复工作区路径 */
      var repoName = (ldRepoInfo(project) || {}).name || String(project.repo || '').replace(/\/+$/, '').split('/').pop().replace(/\.git$/, '') || project.name;
      return '<li><span class="ld-pop-name"><strong title="' + ldEsc(project.repo || repoName) + '">' + ldEsc(repoName) + '</strong><small title="' + ldEsc(detail) + '">' + ldEsc(detail) + '</small></span>'
        + '<span class="ld-pop-actions">' + ldProjectAction(project, view, 'ld-btn') + '</span></li>';
    }).join('') + '</ul>'
    + '<button type="button" class="ld-link ld-pop-more" data-ld-open-settings>在「设置」中查看全部</button>';
}
export function toggleNavPop(open) {
  var pop = $('#ldNavPop'), btn = $('#ldNavStatus');
  if (!pop || !btn) return;
  if (open) {
    /* 打开前先按最新数据重算，数字和列表保持一致 */
    renderNavStatus();
    if (btn.hidden || btn.classList.contains('is-ready')) return;
    renderNavPop();
    pop.hidden = false;
    var rect = btn.getBoundingClientRect();
    pop.style.top = (rect.bottom + 8) + 'px';
    pop.style.left = Math.max(16, Math.min(rect.right - pop.offsetWidth, window.innerWidth - pop.offsetWidth - 16)) + 'px';
  } else pop.hidden = true;
  btn.setAttribute('aria-expanded', String(!!open));
}

export function initNavStatus() {
  renderNavStatus();
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest('#ldNavStatus')) { if (!t.closest('#ldNavStatus').classList.contains('is-ready')) toggleNavPop($('#ldNavPop').hidden); return; }
    /* 浮层里点了任何操作或点到外面都收起 */
    if ($('#ldNavPop') && !$('#ldNavPop').hidden && (!t.closest('#ldNavPop') || t.closest('button'))) toggleNavPop(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !$('#ldNavPop') || $('#ldNavPop').hidden) return;
    e.stopPropagation();
    toggleNavPop(false);
    $('#ldNavStatus').focus();
  }, true);
  window.addEventListener('resize', function () { toggleNavPop(false); });
  document.addEventListener('lingee:local-dev-changed', function () {
    renderNavStatus();
    if ($('#ldNavPop') && !$('#ldNavPop').hidden) renderNavPop();
  });
  /* 进入协作开发（相当于打开客户端）时只检查就绪状态，不自动读取本机凭据；任务变化后重算数字 */
  document.addEventListener('lingee:collab-menu-open', renderNavStatus);
  document.addEventListener('lingee:tasks-changed', renderNavStatus);
  /* 顶部切换工作区后按新范围重算 */
  document.addEventListener('lingee:tk-space-changed', function () {
    renderNavStatus();
    if ($('#ldNavPop') && !$('#ldNavPop').hidden) renderNavPop();
  });
}
