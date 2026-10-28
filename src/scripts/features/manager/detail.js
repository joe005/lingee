import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { mgrIsDevTask, mgrProjectById, mgrProjectIssues, mgrProjectPages, mgrTaskById } from './data.js';
import { feedHtml, initManagerFeed, resetFeed } from './feed.js';
import { openInvite } from './invite.js';
import { openMembers } from './members.js';
import { openTaskPanel, planWorkspaceHtml } from './plan.js';
import { rdWorkspaceHtml, resetRdState } from './rd-tasks.js';
import { openSubPage, spaceSchedules } from './space-pages.js';
import { mgrEsc } from './utils.js';
/* 管理 · 空间详情（对齐产品）：标题与操作、主栏页签（由空间设置「空间首页板块显示设置」决定）、
   右栏四张卡片（议题 / 空间概览 / 知识库 / 定时任务），点卡片进入对应子页面（space-pages.js）。 */

var detailTab = 'plan';
/* 空间详情主栏的页签由空间设置里的首页板块决定（顺序、开关、添加的 MCP / 知识板块） */
function enabledPages(p) { return mgrProjectPages(p).filter(function (x) { return x.enabled; }); }
function pageOf(p, id) { return mgrProjectPages(p).find(function (x) { return x.id === id; }) || null; }
var detailProjectId = null;

var CHEVRON = '<svg class="mgr-rail-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
var ICONS = {
  issues: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="6.5" r="3.5"/><circle cx="6.5" cy="17" r="3.5"/><circle cx="17.5" cy="17" r="3.5"/><path d="M9.2 14.5 10.5 9.5M14.8 14.5 13.5 9.5M10 17h4"/></svg>',
  overview: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/><path d="m16 8 5-5M17 3h4v4"/></svg>',
  knowledge: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01"/></svg>',
  schedule: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
};

var railCollapsed = false;
function syncRailCollapse() {
  var layout = document.querySelector('.mgr-pd-layout');
  var btn = $('#mgrPdRailToggle');
  if (layout) layout.classList.toggle('is-rail-collapsed', railCollapsed);
  if (btn) {
    btn.setAttribute('aria-expanded', String(!railCollapsed));
    btn.setAttribute('aria-label', railCollapsed ? '展开右侧栏' : '收起右侧栏');
    btn.setAttribute('data-tooltip', railCollapsed ? '展开右侧栏' : '收起右侧栏');
  }
}
function currentProject() { return detailProjectId ? mgrProjectById(detailProjectId) : null; }
/* 复制完整 Git 地址；剪贴板接口不可用时退回到选中文本复制 */
function copyText(text) {
  var done = function () { toast('已复制 Git 地址', 'success'); };
  if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text) && done(); }); return; }
  if (fallbackCopy(text)) done(); else toast('复制失败，请手动选择地址复制', 'warning');
}
function fallbackCopy(text) {
  var area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  var ok = false;
  try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
  area.remove();
  return ok;
}

/* ---------- 右栏 ---------- */
function railHead(kind, title, meta) {
  return '<button type="button" class="mgr-rail-head" data-mgr-sub="' + kind + '"><span class="mgr-rail-title">' + ICONS[kind] + title +
    (meta ? '<span class="mgr-rail-count">' + meta + '</span>' : '') + '</span>' + CHEVRON + '</button>';
}
function railHtml(p) {
  var pendingIssues = mgrProjectIssues(p.id).filter(function (i) { return i.status === '待处理'; }).length;
  var jobs = spaceSchedules(p);
  return '<div class="mgr-rail-card">' + railHead('issues', '议题', pendingIssues ? pendingIssues + ' 待处理' : '') + '</div>' +

    '<div class="mgr-rail-card">' + railHead('overview', '空间概览') +
    '<p class="mgr-rail-goal">' + mgrEsc(p.goal || p.desc || '—') + '</p>' +
    '<p class="mgr-rail-owner">负责人：' + mgrEsc(p.owner || '未指定') + '</p>' +
    '</div>' +

    '<div class="mgr-rail-card mgr-rail-card--kb"><span class="mgr-rail-head mgr-rail-head--split">' +
    '<button type="button" class="mgr-rail-head-main" data-mgr-sub="knowledge"><span class="mgr-rail-title">' + ICONS.knowledge + '知识库</span></button>' +
    '<button type="button" class="mgr-rail-icon" data-mgr-kb-upload aria-label="上传到空间知识库" data-tooltip="本地上传">' + ICONS.upload + '</button>' +
    '<button type="button" class="mgr-rail-icon" data-mgr-sub="knowledge" aria-label="打开知识库">' + CHEVRON + '</button></span></div>' +

    '<div class="mgr-rail-card">' + railHead('schedule', '定时任务', jobs.length + '个') +
    (jobs.length
      ? '<ul class="mgr-rail-jobs">' + jobs.slice(0, 3).map(function (j) {
        return '<li><span class="mgr-rail-job-name" title="' + mgrEsc(j.name) + '">' + mgrEsc(j.name) + '</span><span class="mgr-rail-job-plan">' + mgrEsc(j.plan) + '</span></li>';
      }).join('') + '</ul>'
      : '<p class="mgr-rail-goal">还没有定时任务</p>') + '</div>';
}

/* 分段页签的滑块：量出选中页签的位置与宽度写到 CSS 变量，样式里用 transform 过渡实现滑动；
   首次定位不带动画，避免从左端滑入 */
function syncTabThumb() {
  var list = document.querySelector('.mgr-pd-tablist');
  var active = list && list.querySelector('.mgr-pd-tab.active');
  if (!active || !active.offsetWidth) return;
  list.style.setProperty('--thumb-x', active.offsetLeft + 'px');
  list.style.setProperty('--thumb-w', active.offsetWidth + 'px');
  if (!list.classList.contains('is-ready')) {
    void list.offsetWidth;
    list.classList.add('is-ready');
  }
}
function customPaneHtml(page) {
  if (!page) return '';
  var what = page.kind === 'mcp' ? 'MCP App「' + mgrEsc(page.source || page.name) + '」' : page.kind === 'kb' ? '知识文件「' + mgrEsc(page.source || page.name) + '」' : '「' + mgrEsc(page.name) + '」';
  return '<div class="mgr-empty">这里展示' + what + '的内容（原型演示）。</div>';
}
function renderDetail(p) {
  detailProjectId = p.id;
  $('#mgrProjDetailName').textContent = p.name;
  var pages = enabledPages(p);
  if (!pages.some(function (x) { return x.id === detailTab; })) detailTab = pages[0].id;
  $('#mgrPdTabs').innerHTML = pages.map(function (x) {
    var on = x.id === detailTab;
    return '<button type="button" class="mgr-pd-tab' + (on ? ' active' : '') + '" data-pdtab="' + mgrEsc(x.id) + '" role="tab" aria-selected="' + on + '">' + mgrEsc(x.name) + '</button>';
  }).join('');
  syncRailCollapse();
  syncTabThumb();
  $('#mgrPdViews').classList.toggle('hidden', detailTab !== 'plan');
  var plan = $('#mgrPdPlanPane'), rd = $('#mgrPdRdPane'), feed = $('#mgrPdFeedPane');
  plan.classList.toggle('hidden', detailTab !== 'plan');
  if (detailTab === 'plan') plan.innerHTML = planWorkspaceHtml(p);
  rd.classList.toggle('hidden', detailTab !== 'rd');
  if (detailTab === 'rd') rd.innerHTML = rdWorkspaceHtml(p);
  feed.classList.toggle('hidden', detailTab !== 'feed');
  if (detailTab === 'feed') feed.innerHTML = feedHtml(p);
  var custom = $('#mgrPdCustomPane');
  var isCustom = ['plan', 'rd', 'feed'].indexOf(detailTab) < 0;
  custom.classList.toggle('hidden', !isCustom);
  if (isCustom) custom.innerHTML = customPaneHtml(pageOf(p, detailTab));
  $('#mgrPdRail').innerHTML = railHtml(p);
}
function rerenderDetail() {
  var p = currentProject();
  if (!p || $('#mgrProjDetail').classList.contains('hidden')) return;
  renderDetail(p);
}
/* 进入详情时打开第一个显示的首页板块（开发空间默认是「研发任务」，其余是「计划与任务」） */
function resetDetailTab(p) {
  detailTab = p ? enabledPages(p)[0].id : 'plan';
  resetFeed();
  resetRdState();
}

export function initManagerDetail() {
  window.addEventListener('resize', syncTabThumb);
  initManagerFeed(rerenderDetail);
  var panel = $('#mgr-panel-projects');
  panel.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest('#mgrProjDetail')) return;
    if (t.closest('#mgrPdRailToggle')) { railCollapsed = !railCollapsed; syncRailCollapse(); syncTabThumb(); return; }
    var tab = t.closest('[data-pdtab]');
    if (tab) { detailTab = tab.getAttribute('data-pdtab'); rerenderDetail(); return; }
    var p = currentProject();
    if (!p) return;
    var sub = t.closest('[data-mgr-sub]');
    if (sub) { openSubPage(p.id, sub.getAttribute('data-mgr-sub')); return; }
    if (t.closest('[data-mgr-kb-upload]')) { toast('本地上传（演示）：文件会进入空间知识库的默认文件夹'); return; }
    if (t.closest('[data-mgr-copy-repo]')) { copyText(p.repo); return; }
    var inviteBtn = t.closest('[data-mgr-invite]');
    if (inviteBtn) { openInvite(p.id, inviteBtn); return; }
    if (t.closest('[data-mgr-members]')) openMembers(p.id);
  });
  /* 议题子页面里点「查看任务」：回到详情，切到任务所在页签并打开任务详情 */
  document.addEventListener('lingee:mgr-open-task', function (e) {
    var key = e.detail && e.detail.key;
    var task = key ? mgrTaskById(key) : null;
    if (!task) return;
    detailTab = mgrIsDevTask(task) ? 'rd' : 'plan';
    rerenderDetail();
    openTaskPanel(key);
  });
  document.addEventListener('lingee:mgr-tasks-changed', rerenderDetail);
  document.addEventListener('lingee:mgr-issues-changed', rerenderDetail);
  document.addEventListener('lingee:mgr-perm-changed', rerenderDetail);
  document.addEventListener('lingee:mgr-projects-changed', rerenderDetail);
  document.addEventListener('lingee:mgr-schedules-changed', rerenderDetail);
}

export { renderDetail, resetDetailTab };
