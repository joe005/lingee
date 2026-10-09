import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import {
  mgrAiContribution, mgrCanManageProject, mgrDecideIssue, mgrProjectProgress, mgrExpert, mgrHasSessionPerm, mgrPersonName, mgrProjectById, mgrProjectIssues, mgrProjectKnowledge,
  mgrSaveProjects, mgrTaskById, mgrTeam, mgrTeams,
} from './data.js';
import { feedHtml, initManagerFeed, resetFeed } from './feed.js';
import { openInvite } from './invite.js';
import { openMembers } from './members.js';
import { openTaskPanel, planWorkspaceHtml } from './plan.js';
import { mgrEsc, mgrTag } from './utils.js';
/* 管理 · 项目详情：标题与标签、计划与任务 / 动态页签、右栏（议题 / 项目概览 / 知识库 / 智能体团队），
   以及右栏打开的议题、知识库、智能体团队维护弹窗。 */

var detailTab = 'plan';
var kbQuery = '';
var kbOpenId = null;
var detailProjectId = null;

var CHEVRON = '<svg class="mgr-rail-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

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

function projectStatusName(p) {
  return { planned: '规划中', in_progress: '进行中', paused: '已暂停', completed: '已完成', cancelled: '已取消' }[p.status] || '规划中';
}
function projectTeams(p) {
  var ids = p.teamIds && p.teamIds.length ? p.teamIds : p.defaultTeam ? [p.defaultTeam] : [];
  return ids.map(mgrTeam).filter(Boolean);
}
function currentProject() { return detailProjectId ? mgrProjectById(detailProjectId) : null; }

/* ---------- 右栏 ---------- */
/* AI 贡献：AI 代码生成率、AI 提交占比、阶段一次审核通过率，均来自任务的代码与审核记录 */
function aiCardHtml(p) {
  var ai = mgrAiContribution(p);
  if (!ai) return '';
  var stat = function (value, label, tip) {
    return '<div class="mgr-ai-stat" title="' + mgrEsc(tip) + '"><strong>' + value + '</strong><span>' + label + '</span></div>';
  };
  return '<div class="mgr-rail-card mgr-ai-card"><span class="mgr-rail-head"><span class="mgr-rail-title">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>AI 贡献</span></span>' +
    '<div class="mgr-ai-stats">' + stat(ai.codeRate + '%', 'AI 代码生成', '合入代码 ' + ai.lines + ' 行，其中 ' + ai.aiLines + ' 行由智能体生成') +
    stat(ai.commitRate + '%', 'AI 提交占比', '代码提交 ' + ai.commits + ' 次，其中 ' + ai.aiCommits + ' 次由智能体发起') +
    stat(ai.passRate + '%', '一次审核通过', '已审核阶段 ' + ai.stages + ' 个，按首次审核是否通过统计') + '</div></div>';
}
function railHtml(p) {
  var progress = mgrProjectProgress(p);
  var issues = mgrProjectIssues(p.id);
  var pendingIssues = issues.filter(function (i) { return i.status === '待处理'; }).length;
  var docs = mgrProjectKnowledge(p.id);
  var teams = projectTeams(p);
  var experts = (p.projectExperts || []).filter(mgrExpert);
  var now = new Date();
  var nextMs = (p.milestones || []).find(function (m) { return new Date(m.date + 'T23:59:59') >= now; });
  var members = p.members || [];
  var row = function (k, v) { return '<div class="mgr-detail-row"><span class="mgr-detail-key">' + k + '</span><span class="mgr-detail-value">' + v + '</span></div>'; };
  return '<div class="mgr-rail-card"><button type="button" class="mgr-rail-head" data-mgr-open-issues><span class="mgr-rail-title">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="6.5" r="3.5"/><circle cx="6.5" cy="17" r="3.5"/><circle cx="17.5" cy="17" r="3.5"/><path d="M9.2 14.5 10.5 9.5M14.8 14.5 13.5 9.5M10 17h4"/></svg>议题</span>' +
    '<span class="mgr-rail-meta">' + issues.length + ' 条' + (pendingIssues ? ' <em class="mgr-rail-badge">' + pendingIssues + ' 待处理</em>' : '') + '</span>' + CHEVRON + '</button></div>' +

    '<div class="mgr-rail-card"><span class="mgr-rail-head"><span class="mgr-rail-title">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/><path d="m16 8 5-5M17 3h4v4"/></svg>项目概览</span></span>' +
    '<p class="mgr-rail-goal">' + mgrEsc(p.goal || p.desc || '—') + '</p>' +
    row('负责人', mgrEsc(p.owner)) +
    row('周期', (p.start || p.end ? mgrEsc(p.start || '—') + ' ~ ' + mgrEsc(p.end || '—') : '<span class="mgr-footnote">未设置</span>')) +
    (p.priority ? row('优先级', mgrEsc(p.priority)) : '') +
    (nextMs ? row('下一里程碑', mgrEsc(nextMs.name) + ' ' + mgrEsc(nextMs.date)) : '') +
    (p.repo ? row('代码仓库', '<span title="' + mgrEsc(p.repo) + '">' + mgrEsc(p.repo.replace(/^https?:\/\//, '')) + '</span>') : '') +
    (p.repo ? row('基准分支', p.baseBranch ? mgrEsc(p.baseBranch) : '<span class="mgr-footnote">未设置（项目设置中配置）</span>') : '') +
    row('进度', '<span class="mgr-rail-progress" title="' + mgrEsc(progress.percent + '%' + (progress.detail ? ' · ' + progress.detail : '')) + '">' +
      '<span class="mgr-bar mgr-bar--inline" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + progress.percent + '"><span class="mgr-bar-fill" style="width:' + progress.percent + '%"></span></span>' +
      '<span class="mgr-rail-progress-text">' + progress.percent + '%' + (progress.detail ? '<small>' + mgrEsc(progress.detail) + '</small>' : '') + '</span></span>') +
    '<div class="mgr-rail-avatars">' + members.slice(0, 8).map(function (id) {
      var name = mgrPersonName(id);
      return '<span class="mgr-avatar" title="' + mgrEsc(name) + '">' + mgrEsc((name || '?').slice(0, 1)) + '</span>';
    }).join('') + (members.length > 8 ? '<span class="mgr-avatar mgr-avatar--more">+' + (members.length - 8) + '</span>' : '') + '</div></div>' +

    aiCardHtml(p) +

    '<div class="mgr-rail-card"><button type="button" class="mgr-rail-head" data-mgr-open-kb><span class="mgr-rail-title">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01"/></svg>知识库</span>' +
    '<span class="mgr-rail-meta">' + docs.length + ' 项</span>' + CHEVRON + '</button>' +
    (docs.slice(0, 1).map(function (d) { return '<span class="mgr-rail-doc" title="' + mgrEsc(d.title) + '">' + mgrEsc(d.title) + '</span>'; }).join('') ||
      '<span class="mgr-rail-doc mgr-rail-doc--empty">暂无归档产物</span>') +
    '<span class="mgr-rail-foot"><label class="mgr-perm-switch"><input type="checkbox" data-mgr-session-perm' + (mgrHasSessionPerm() ? ' checked' : '') +
    '><span>会话权限（演示）</span></label></span></div>' +

    '<div class="mgr-rail-card"><span class="mgr-rail-head"><span class="mgr-rail-title">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>智能体团队</span>' +
    '<button type="button" class="mgr-link-btn" data-mgr-open-team>管理</button></span>' +
    (teams.length
      ? teams.map(function (t) { return '<span class="mgr-rail-doc" title="' + mgrEsc(t.name) + '">' + mgrEsc(t.name) + (p.defaultTeam === t.id ? ' · 主' : '') + '</span>'; }).join('')
      : '<span class="mgr-rail-doc mgr-rail-doc--empty">未绑定交付智能体团队</span>') +
    (experts.length
      ? '<span class="mgr-rail-doc">项目智能体 ' + experts.length + ' 位：' + experts.slice(0, 3).map(function (id) { return mgrEsc(mgrExpert(id).name); }).join('、') + (experts.length > 3 ? ' 等' : '') + '</span>'
      : '') + '</div>';
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
function renderDetail(p) {
  detailProjectId = p.id;
  $('#mgrProjDetailName').textContent = p.name;
  $('#mgrProjDetailTags').innerHTML =
    mgrTag(projectStatusName(p), p.status === 'in_progress' ? 'running' : p.status === 'completed' ? 'done' : 'neutral') +
    (p.containsRd ? mgrTag('含研发任务', 'brand') : '') +
    (p.repo ? '<span class="mgr-tag mgr-tag--neutral" title="' + mgrEsc(p.repo) + '">Git</span>' : '');
  document.querySelectorAll('[data-pdtab]').forEach(function (b) {
    var on = b.getAttribute('data-pdtab') === detailTab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  syncRailCollapse();
  syncTabThumb();
  $('#mgrPdViews').classList.toggle('hidden', detailTab !== 'plan');
  var plan = $('#mgrPdPlanPane'), feed = $('#mgrPdFeedPane');
  plan.classList.toggle('hidden', detailTab !== 'plan');
  if (detailTab === 'plan') plan.innerHTML = planWorkspaceHtml(p);
  feed.classList.toggle('hidden', detailTab !== 'feed');
  if (detailTab === 'feed') feed.innerHTML = feedHtml(p);
  $('#mgrPdRail').innerHTML = railHtml(p);
  var ask = $('#mgrPdAskInput');
  if (ask) ask.placeholder = '问灵基：就「' + (detailTab === 'plan' ? '计划与任务' : '动态') + '」这个模块提问';
}
function rerenderDetail() {
  var p = currentProject();
  if (!p || $('#mgrProjDetail').classList.contains('hidden')) return;
  renderDetail(p);
  if (isOpen('#mgrTeamOverlay')) $('#mgrTeamBody').innerHTML = teamBodyHtml(p);
  if (isOpen('#mgrIssuesOverlay')) $('#mgrIssuesBody').innerHTML = issuesHtml(p);
  refreshKb();
}
/* 进入详情时回到「计划与任务」页签 */
function resetDetailTab() { detailTab = 'plan'; resetFeed(); }

/* ---------- 弹窗通用 ---------- */
function isOpen(sel) { var el = $(sel); return !!el && el.style.display !== 'none'; }
function openOverlay(sel) { var el = $(sel); el.style.display = 'flex'; el.setAttribute('aria-hidden', 'false'); }
function closeOverlay(sel) { var el = $(sel); if (!el) return; el.style.display = 'none'; el.setAttribute('aria-hidden', 'true'); }

/* ---------- 议题 ---------- */
function issuesHtml(p) {
  var list = mgrProjectIssues(p.id);
  if (!list.length) return '<div class="mgr-empty">暂无议题。任务行「···」→「升级为议题」会汇总到这里。</div>';
  var canDecide = mgrCanManageProject(p);
  return list.map(function (i) {
    var cls = { 待处理: 'warning', 处理中: 'running', 已批准: 'done', 已驳回: 'neutral' }[i.status] || 'neutral';
    var task = i.taskKey ? mgrTaskById(i.taskKey) : null;
    var pending = i.status === '待处理';
    return '<div class="mgr-issue-item"><div class="mgr-issue-main"><strong>' + mgrEsc(i.title) + '</strong><span class="mgr-issue-meta">' +
      mgrEsc(i.from || '') + (i.from ? ' · ' : '') + mgrEsc(i.time || '') + '</span>' +
      (i.impact && pending ? '<span class="mgr-issue-impact">' + mgrEsc(i.impact) + '</span>' : '') +
      (i.decision ? '<span class="mgr-issue-decision">' + mgrEsc(i.decision.by) + ' 决策：' + mgrEsc(i.decision.text) + '</span>' : '') +
      (task ? '<button type="button" class="mgr-link-btn mgr-issue-task" data-mgr-issue-task="' + mgrEsc(i.taskKey) + '">查看任务 ' + mgrEsc(task.code || '') + ' · ' + mgrEsc(task.title) + '</button>' : '') + '</div>' +
      '<div class="mgr-issue-side">' + mgrTag(i.status || '待处理', cls) +
      (pending && canDecide ? '<span class="mgr-issue-actions"><button type="button" class="mgr-btn mgr-btn--ghost" data-mgr-issue-decide="' + mgrEsc(i.id) + '" data-approve="0">驳回</button>' +
        '<button type="button" class="mgr-btn mgr-btn--primary" data-mgr-issue-decide="' + mgrEsc(i.id) + '" data-approve="1">批准</button></span>' : '') + '</div></div>';
  }).join('');
}

/* ---------- 知识库 ---------- */
function kbResult(p) {
  var all = mgrProjectKnowledge(p.id);
  var q = kbQuery.trim().toLocaleLowerCase();
  var list = q ? all.filter(function (k) {
    return [k.title, k.summary, k.type].some(function (v) { return v && String(v).toLocaleLowerCase().includes(q); });
  }) : all;
  var perm = mgrHasSessionPerm();
  var rows = list.map(function (k) {
    var src = k.sourceTaskId ? mgrTaskById(k.sourceTaskId) : null;
    var open = kbOpenId === k.id;
    return '<div class="mgr-kb-item' + (open ? ' is-open' : '') + '" data-mgr-kb="' + mgrEsc(k.id) + '">' +
      '<button type="button" class="mgr-kb-item-main" data-mgr-kb-toggle="' + mgrEsc(k.id) + '" aria-expanded="' + open + '">' +
      '<span class="mgr-kb-chevron" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></span>' +
      '<span class="mgr-kb-title">' + mgrEsc(k.title) + '</span>' + mgrTag(k.type || '文档', 'neutral') + (k.vectorIndexed ? mgrTag('已向量化', 'brand') : '') +
      '<span class="mgr-kb-meta">' + mgrEsc(k.archivedAt || '') + ' · ' + mgrEsc(k.archivedBy || '') + (src ? ' · 来源 ' + mgrEsc(src.code || src.title) : '') + '</span></button>' +
      (open
        ? '<div class="mgr-kb-detail"><p class="mgr-kb-summary">' + mgrEsc(k.summary || '') + '</p><div class="mgr-kb-actions">' +
          (perm && src
            ? '<button type="button" class="mgr-btn mgr-btn--ghost" data-mgr-kb-session="' + mgrEsc(src.id) + '">查看执行会话</button>'
            : '<span class="mgr-footnote">当前演示角色无会话查看权限，仅展示归档元数据与执行状态</span>') + '</div></div>'
        : '') + '</div>';
  }).join('');
  return {
    rows: rows || '<div class="mgr-empty">' + (all.length
      ? '没有符合「' + mgrEsc(kbQuery.trim()) + '」的归档，换个关键词试试'
      : '暂无归档产物。任务在开发板块执行完成后，可从产物区「上报知识库」归档到这里。') + '</div>',
    count: list.length + ' / ' + all.length + ' 条',
  };
}
function kbBodyHtml(p) {
  var r = kbResult(p);
  return '<div class="mgr-card mgr-proj-knowledge" data-mgr-proj-knowledge="' + mgrEsc(p.id) + '"><div class="mgr-card-head"><h3>项目知识库</h3>' +
    '<span>任务产物上报归档，支持向量检索（演示为标题/摘要过滤）</span></div><div class="mgr-card-body"><div class="mgr-kb-toolbar">' +
    '<input type="search" data-mgr-kb-search value="' + mgrEsc(kbQuery) + '" placeholder="输入关键词检索归档产物…" aria-label="检索项目知识库">' +
    '<span class="mgr-kb-count" data-mgr-kb-count>' + mgrEsc(r.count) + '</span></div><div class="mgr-kb-list" data-mgr-kb-list>' + r.rows + '</div></div></div>';
}
/* 只刷新列表与计数，保留检索框焦点 */
function refreshKb() {
  var p = currentProject();
  var body = $('#mgrKbBody [data-mgr-proj-knowledge]');
  if (!p || !body || !isOpen('#mgrKbOverlay')) return;
  var r = kbResult(p);
  body.querySelector('[data-mgr-kb-list]').innerHTML = r.rows;
  body.querySelector('[data-mgr-kb-count]').textContent = r.count;
}

/* ---------- 智能体团队与项目智能体 ---------- */
function teamBodyHtml(p) {
  var boundIds = projectTeams(p).map(function (t) { return t.id; });
  var addable = mgrTeams().filter(function (t) { return t.preset && !boundIds.includes(t.id); });
  var teamCards = projectTeams(p).map(function (t) {
    var lead = mgrExpert(t.leadId);
    var members = (t.members || []).filter(mgrExpert);
    return '<div class="mgr-team-card" data-mgr-team-card="' + mgrEsc(t.id) + '"><div class="mgr-team-card-head"><span class="mgr-team-name">' + mgrEsc(t.name) + '</span>' +
      (p.defaultTeam === t.id ? mgrTag('交付主团队', 'brand') : '') +
      '<button type="button" class="mgr-link-btn" data-mgr-team-remove="' + mgrEsc(t.id) + '" aria-label="移除智能体团队 ' + mgrEsc(t.name) + '">移除</button></div>' +
      '<p class="mgr-project-desc">' + mgrEsc(t.desc || '') + '</p>' +
      '<div class="mgr-detail-row"><span class="mgr-detail-key">负责人</span><span class="mgr-detail-value">' + (lead ? mgrEsc(lead.name) : '—') + '</span></div>' +
      '<div class="mgr-detail-row"><span class="mgr-detail-key">成员智能体</span><span class="mgr-detail-value mgr-team-experts">' +
      (members.slice(0, 8).map(function (id) { return '<span class="mgr-expert-chip">' + mgrEsc(mgrExpert(id).name) + '</span>'; }).join('') || '<span class="mgr-footnote">无成员智能体</span>') +
      (members.length > 8 ? '<span class="mgr-expert-chip mgr-expert-chip--more">+' + (members.length - 8) + '</span>' : '') + '</span></div></div>';
  }).join('');
  var teamPane = '<div class="mgr-team-pane" data-mgr-tm-pane="team">' +
    (teamCards || '<div class="mgr-empty">未绑定交付智能体团队</div>') +
    '<div class="mgr-team-add-row"><select data-mgr-team-add aria-label="添加智能体团队"><option value="">选择要添加的智能体团队</option>' +
    addable.map(function (t) { return '<option value="' + mgrEsc(t.id) + '">' + mgrEsc(t.name) + '</option>'; }).join('') +
    '</select><button type="button" class="mgr-btn mgr-btn--ghost" data-mgr-team-add-btn' + (addable.length ? '' : ' disabled') + '>添加智能体团队</button></div></div>';
  return '<div class="mgr-card mgr-proj-team" data-mgr-proj-team="' + mgrEsc(p.id) + '"><div class="mgr-tmtabs" role="tablist" aria-label="智能体团队">' +
    '<button type="button" class="mgr-tmtab active" role="tab" aria-selected="true">智能体团队</button></div><div class="mgr-card-body">' + teamPane +
    (p.containsRd ? '<p class="mgr-footnote">包含研发任务的项目，研发任务的阶段子任务模板来自交付智能体团队的交付路径。</p>' : '') + '</div></div>';
}
function saveProjectChange(p, msg) {
  p.updatedAt = Date.now();
  if (!mgrSaveProjects()) { toast('保存失败，本地存储不可用', 'error'); return; }
  toast(msg, 'success');
  rerenderDetail();
}

function initDetailModals() {
  var issues = $('#mgrIssuesOverlay'), kb = $('#mgrKbOverlay'), team = $('#mgrTeamOverlay');
  $('#mgrIssuesOverlay [data-mgr-issues-close]').addEventListener('click', function () { closeOverlay('#mgrIssuesOverlay'); });
  $('#mgrKbOverlay [data-mgr-kb-close]').addEventListener('click', function () { closeOverlay('#mgrKbOverlay'); });
  $('#mgrTeamOverlay [data-mgr-team-close]').addEventListener('click', function () { closeOverlay('#mgrTeamOverlay'); });
  [[issues, '#mgrIssuesOverlay'], [kb, '#mgrKbOverlay'], [team, '#mgrTeamOverlay']].forEach(function (pair) {
    pair[0].addEventListener('click', function (e) { if (e.target === pair[0]) closeOverlay(pair[1]); });
    pair[0].addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); closeOverlay(pair[1]); } });
  });
}

export function initManagerDetail() {
  initDetailModals();
  window.addEventListener('resize', syncTabThumb);
  initManagerFeed(rerenderDetail);
  var panel = $('#mgr-panel-projects');
  panel.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('#mgrPdRailToggle')) { railCollapsed = !railCollapsed; syncRailCollapse(); syncTabThumb(); return; }
    var tab = t.closest('[data-pdtab]');
    if (tab) { detailTab = tab.getAttribute('data-pdtab') === 'feed' ? 'feed' : 'plan'; rerenderDetail(); return; }
    var p = currentProject();
    if (!p) return;
    if (t.closest('[data-mgr-open-issues]')) { $('#mgrIssuesBody').innerHTML = issuesHtml(p); openOverlay('#mgrIssuesOverlay'); return; }
    var issueTask = t.closest('[data-mgr-issue-task]');
    if (issueTask) {
      closeOverlay('#mgrIssuesOverlay');
      detailTab = 'plan';
      rerenderDetail();
      openTaskPanel(issueTask.getAttribute('data-mgr-issue-task'));
      return;
    }
    var decide = t.closest('[data-mgr-issue-decide]');
    if (decide) {
      var approve = decide.getAttribute('data-approve') === '1';
      if (!mgrCanManageProject(p)) { toast('仅项目负责人、项目管理员或系统管理员可决策', 'warning'); return; }
      var done = mgrDecideIssue(decide.getAttribute('data-mgr-issue-decide'), approve);
      if (done) toast(approve ? '已批准，相关任务恢复执行' : '已驳回，决策已留痕', approve ? 'success' : 'info');
      return;
    }
    if (t.closest('[data-mgr-open-kb]')) { kbQuery = ''; kbOpenId = null; $('#mgrKbBody').innerHTML = kbBodyHtml(p); openOverlay('#mgrKbOverlay'); return; }
    if (t.closest('[data-mgr-open-team]')) { $('#mgrTeamBody').innerHTML = teamBodyHtml(p); openOverlay('#mgrTeamOverlay'); return; }
    var kbToggle = t.closest('[data-mgr-kb-toggle]');
    if (kbToggle) { var kid = kbToggle.getAttribute('data-mgr-kb-toggle'); kbOpenId = kbOpenId === kid ? null : kid; refreshKb(); return; }
    if (t.closest('[data-mgr-kb-session]')) { toast('执行会话跳转尚未就绪（演示）', 'warning'); return; }
    var inviteBtn = t.closest('[data-mgr-invite]');
    if (inviteBtn) { openInvite(p.id, inviteBtn); return; }
    if (t.closest('[data-mgr-members]')) { openMembers(p.id); return; }
    var addTeam = t.closest('[data-mgr-team-add-btn]');
    if (addTeam) {
      var tid = addTeam.closest('.mgr-team-add-row').querySelector('[data-mgr-team-add]').value;
      if (!tid || !mgrTeam(tid)) return;
      if (!(p.teamIds || []).includes(tid)) p.teamIds = (p.teamIds || []).concat(tid);
      if (!p.defaultTeam) p.defaultTeam = tid;
      saveProjectChange(p, '已添加智能体团队：' + mgrTeam(tid).name);
      return;
    }
    var rmTeam = t.closest('[data-mgr-team-remove]');
    if (rmTeam) {
      var rid = rmTeam.getAttribute('data-mgr-team-remove');
      var rt = mgrTeam(rid);
      if (!rt) return;
      p.teamIds = (p.teamIds || []).filter(function (x) { return x !== rid; });
      if (p.defaultTeam === rid) p.defaultTeam = p.teamIds[0] || '';
      saveProjectChange(p, '已移除智能体团队：' + rt.name + (p.containsRd && !p.teamIds.length ? '（包含研发任务，建议尽快重新绑定交付智能体团队）' : ''));
      return;
    }
    if (t.closest('#mgrPdAskSend')) {
      var input = $('#mgrPdAskInput');
      var q = input.value.trim();
      if (!q) { toast('先输入想问的问题'); return; }
      input.value = '';
      toast('已收到提问（演示）：「' + mgrEsc(q) + '」，AI 会基于项目上下文作答');
    }
  });
  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.id === 'mgrPdAskInput') { e.preventDefault(); $('#mgrPdAskSend').click(); }
  });
  panel.addEventListener('input', function (e) {
    if (e.target.closest('[data-mgr-kb-search]')) { kbQuery = e.target.value; refreshKb(); }
  });
  document.addEventListener('lingee:mgr-tasks-changed', rerenderDetail);
  document.addEventListener('lingee:mgr-issues-changed', rerenderDetail);
  document.addEventListener('lingee:mgr-perm-changed', rerenderDetail);
  document.addEventListener('lingee:mgr-projects-changed', rerenderDetail);
}

export { renderDetail, resetDetailTab };
