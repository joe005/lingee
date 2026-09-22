import { CV_TASKS, CV_PROJECTS, CV_MEMBERS, CV_ARTIFACTS, cvInProject, cvProject, cvProjectName } from './data.js';
import { TEAMS } from '../expert/store.js';
import { xesc } from '../expert/data.js';
import { cvUpdateCounts } from './projects.js';
import { tbColumns, tbCurrentTeamId, tbLabel, tbMode, tbOwner, tbPriority, tbTaskId, tbGetSelected, tbSave, tbSetSelected, tbTeamName } from './tb-core.js';
/* 任务看板：列渲染、任务详情（打开/保存）、筛选与初始化
   共享状态与工具在 tb-core；新建任务在 new-task；任务对话在 task-chat。 */


let scope = 'all';
let returnFocus = null;

function filtered() {
  const search = (document.getElementById('tb-search')?.value || '').trim().toLowerCase();
  const execution = document.getElementById('tb-mode')?.value;
  return CV_TASKS.filter(cvInProject).filter(t =>
    (scope !== 'mine' || t.assignee === '张工') &&
    (scope !== 'attention' || ['待评审', '已失败'].includes(t.status)) &&
    (!execution || tbMode(t) === execution) &&
    (!search || (t.title + ' ' + t.sourceId).toLowerCase().includes(search)));
}
export function renderTaskSummary() {
  const el = document.getElementById('cv-task-stats');
  if (!el) return;
  const rows = CV_TASKS.filter(cvInProject);
  el.innerHTML = '<span><b>' + rows.length + '</b> 个任务</span><span class="tb-live">◐ ' + rows.filter(t => t.status === '进行中').length + ' 个任务执行中</span><span class="tb-summary-note">成员与专家共同参与 · 本地演示</span>';
  document.getElementById('tb-attention-count').textContent = rows.filter(t => ['待评审', '已失败'].includes(t.status)).length;
}
function card(t) {
  const index = CV_TASKS.indexOf(t);
  return ("<button class=\"tb-card\" data-tb-task=\"" + (index) + "\"><span class=\"tb-card-top\"><span>" + (xesc(t.sourceId)) + "</span><span class=\"tb-type\">" + (xesc(t.type)) + "</span></span><strong>" + (xesc(t.title)) + "</strong><span class=\"tb-description\">" + (xesc(t.desc)) + "</span><span class=\"tb-project\">" + (xesc(cvProjectName(t.project) + " · " + tbTeamName(t))) + "</span><span class=\"tb-card-bottom\"><span class=\"tb-person\"><i class=\"" + (t.assignee === 'AI开发Agent' ? 'tb-expert' : '') + "\">" + (t.assignee === 'AI开发Agent' ? '✦' : xesc((t.assignee || '待')[0])) + "</i>" + (xesc(tbOwner(t))) + "</span><span class=\"tb-priority\" data-priority=\"" + (xesc(tbPriority(t))) + "\">≋ " + (xesc(tbPriority(t))) + "</span></span><span class=\"tb-context\">" + (xesc(tbMode(t))) + "<span>" + (t.status === '待评审' ? '等待人工确认' : t.status === '已失败' ? '需要介入' : t.status === '进行中' ? '执行中 · ' + (t.progress || 0) + '%' : xesc(tbLabel(t.status))) + "</span></span></button>");
}
export function renderTaskBoard() {
  const grid = document.getElementById('cv-task-grid');
  if (!grid || !document.getElementById('tb-layout')) return;
  const rows = filtered();
  const list = document.getElementById('tb-layout').value === 'list';
  grid.className = list ? 'tb-board tb-list' : 'tb-board';
  grid.innerHTML = tbColumns.map(([status, title, tone, symbol]) => {
    const tasks = rows.filter(t => t.status === status);
    return ("<section class=\"tb-column tb-" + (tone) + "\"><header><span class=\"tb-column-title\"><i>" + (symbol) + "</i>" + (title) + "<small>" + (tasks.length) + "</small></span><button data-tb-add=\"" + (status) + "\" aria-label=\"在" + (title) + "中新建任务\">＋</button></header><div class=\"tb-cards\">" + (tasks.map(card).join('') || '<div class="tb-column-empty">暂无任务</div>') + "</div></section>");
  }).join('');
  document.getElementById('tb-empty').hidden = rows.length > 0;
  grid.hidden = rows.length === 0;
  renderTaskSummary();
}
function options(values, current) { return values.map(v => ("<option value=\"" + (xesc(v)) + "\" " + (v === current ? 'selected' : '') + ">" + (xesc(v)) + "</option>")).join(''); }
function artifactLink(a) {
  const url = String(a.url || '');
  const safe = /^(https?:\/\/|blob:|\/[^/]|\.\.?\/)/i.test(url);
  if (a.centerName) return '<button type="button" data-cv-art="预览" data-cv-art-name="' + xesc(a.centerName) + '"><span>↗</span><strong>' + xesc(a.name || '未命名产物') + '</strong><span>查看</span></button>';
  return safe ? '<a href="' + xesc(url) + '" target="_blank" rel="noopener noreferrer"><span>↗</span><strong>' + xesc(a.name || '未命名产物') + '</strong><span>查看</span></a>'
    : '<div class="tb-artifact-unavailable">' + xesc(a.name || '未命名产物') + '<span>暂无可查看的文件</span></div>';
}
const reviewTypes = ['需求评审', '方案评审', '代码评审', '测试评审', '交付评审'];
function currentUserName() { return document.getElementById('userName')?.textContent?.trim() || '当前用户'; }
function reviewArtifact(a, index) {
  return { id: String(a.id || a.name || 'artifact-' + index), name: String(a.name || a.file || a || '未命名产物'), version: String(a.version || '当前版本') };
}
function taskArtifacts(t) {
  const direct = (t.artifacts || []).map((a, index) => typeof a === 'string' ? { id: 'task-' + index, name: a, version: '当前版本' } : a);
  const linked = CV_ARTIFACTS.filter(a => a.project === t.project && a.src === t.title).map((a, index) => ({ ...a, id: 'center-' + t.project + '-' + index, centerName: a.name, name: a.file || a.name, version: a.date || '当前版本' }));
  const names = new Set(direct.map(a => a.name || a.file));
  return direct.concat(linked.filter(a => !names.has(a.name)));
}
function hasApprovedDelivery(t) {
  const latest = (t.reviews || []).slice().reverse().find(r => r.type === '交付评审');
  return latest?.status === 'approved';
}
function canDecideReview(r) { return document.body.dataset.role === 'owner' || r.reviewer === currentUserName(); }
function reviewStatus(status) {
  return status === 'approved' ? ['已通过', 'approved'] : status === 'changes_requested' ? ['要求修改', 'changes'] : ['待决策', 'pending'];
}
function defaultReviewDeadline() {
  const d = new Date(); d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}
function reviewScopeHtml(r) {
  if (r.artifacts?.length) return '<div class="tb-review-scope">' + r.artifacts.map(a => '<span><b>' + xesc(a.name) + '</b><small>' + xesc(a.version) + '</small></span>').join('') + '</div>';
  return '<div class="tb-review-snapshot"><strong>任务说明与验收标准</strong><div><small>任务描述</small><p>' + xesc(r.subject?.desc || '未填写') + '</p></div><div><small>验收标准</small><p>' + xesc(r.subject?.acceptance || '未填写') + '</p></div></div>';
}
function reviewCardHtml(r, current) {
  const state = reviewStatus(r.status);
  const decisions = (r.decisions || []).map(d => '<div class="tb-review-decision"><i>' + xesc((d.by || '评')[0]) + '</i><div><strong>' + xesc(d.by) + ' · ' + (d.action === 'approve' ? '通过' : '要求修改') + '</strong>' + (d.comment ? '<p>' + xesc(d.comment) + '</p>' : '') + '<small>' + xesc(d.at || '') + '</small></div></div>').join('');
  return '<article class="tb-review-card' + (current ? ' is-current' : '') + '"><header><div><span class="tb-review-state" data-state="' + state[1] + '">' + state[0] + '</span><strong>' + xesc(r.type) + ' · 第 ' + r.round + ' 轮</strong></div><small>' + xesc(r.createdAt || '') + '</small></header><dl><div><dt>评审人</dt><dd>' + xesc(r.reviewer) + '</dd></div><div><dt>发起人</dt><dd>' + xesc(r.requestedBy) + '</dd></div><div><dt>截止时间</dt><dd>' + xesc(r.deadline || '未设置') + '</dd></div></dl>' + reviewScopeHtml(r) + (decisions ? '<div class="tb-review-decisions">' + decisions + '</div>' : '') + '</article>';
}
function reviewPaneHtml(t) {
  const reviews = t.reviews || [];
  const pending = reviews.slice().reverse().find(r => r.status === 'pending');
  const proj = CV_PROJECTS.find(p => p.id === t.project);
  const projectPeople = (proj?.members || []).map(id => CV_MEMBERS.find(m => m.id === id)).filter(Boolean);
  const people = projectPeople.length ? projectPeople : CV_MEMBERS;
  const reviewers = [...new Set(people.map(p => p.name))];
  const artifacts = taskArtifacts(t).map(reviewArtifact);
  let current = '';
  if (pending) {
    const allowed = canDecideReview(pending);
    current = reviewCardHtml(pending, true) + '<div class="tb-review-action">' + (allowed ? '<label>评审意见<textarea id="tb-review-comment" rows="3" placeholder="说明通过依据，或指出需要修改的内容"></textarea></label><div><button type="button" data-review-decision="changes">要求修改</button><button type="button" class="tb-primary" data-review-decision="approve">通过评审</button></div>' : '<p>等待 ' + xesc(pending.reviewer) + ' 给出评审结论。</p>') + '</div>';
  } else if (t.status === '已完成') {
    current = '<div class="tb-review-closed"><i>✓</i><div><strong>任务评审已结束</strong><p>如需发起新一轮评审，请先把任务状态改为“进行中”并保存。</p></div></div>';
  } else {
    const artifactChoices = artifacts.length ? '<fieldset><legend>评审产物 <small>代码、测试和交付评审必须选择</small></legend>' + artifacts.map(a => '<label><input type="checkbox" data-review-artifact="' + xesc(a.id) + '" checked><span>' + xesc(a.name) + '<small>' + xesc(a.version) + '</small></span></label>').join('') + '</fieldset>' : '<div class="tb-review-no-artifact">当前没有交付产物，可先发起需求或方案评审。</div>';
    current = '<div class="tb-review-start"><div><strong>发起一轮评审</strong><p>冻结本轮评审范围，评审结论会驱动任务状态。</p></div><div class="tb-review-form"><label>评审类型<select id="tb-review-type">' + options(reviewTypes, '需求评审') + '</select></label><label>评审人<select id="tb-reviewer">' + options(reviewers, reviewers[0]) + '</select></label><label>截止时间<input id="tb-review-deadline" type="date" value="' + defaultReviewDeadline() + '"></label></div>' + artifactChoices + '<button type="button" class="tb-primary tb-review-start-btn" data-review-start>发起评审</button></div>';
  }
  const history = reviews.slice().reverse().filter(r => r !== pending).map(r => reviewCardHtml(r, false)).join('');
  return current + (history ? '<div class="tb-review-history"><h4>历史评审 <span>' + (reviews.length - (pending ? 1 : 0)) + '</span></h4>' + history + '</div>' : '');
}
let formSnapshot = '';
function detailSnapshot() { return JSON.stringify([...new FormData(document.getElementById('tb-form'))]); }
function confirmLeave() { return document.getElementById('tb-workspace').hidden || detailSnapshot() === formSnapshot || window.confirm('有尚未保存的修改，确定放弃这些修改吗？'); }
function selectDetailTab(name) {
  const ws = document.getElementById('tb-workspace');
  ws.querySelectorAll('[data-detail-tab]').forEach(b => {
    const active = b.dataset.detailTab === name;
    b.setAttribute('aria-selected', String(active)); b.tabIndex = active ? 0 : -1;
  });
  ws.querySelectorAll('[data-detail-pane]').forEach(p => p.hidden = p.dataset.detailPane !== name);
}
function reopenTaskTab(t, tab) {
  renderTaskBoard(); cvUpdateCounts(); openTask(CV_TASKS.indexOf(t)); selectDetailTab(tab);
}
function startTaskReview() {
  const t = tbGetSelected(); if (!t) return;
  if (detailSnapshot() !== formSnapshot) { window.alert('请先保存任务修改，再发起评审。'); return; }
  if (t.status === '已完成') { window.alert('已完成任务如需继续，请先将状态改为“进行中”并保存。'); return; }
  if ((t.reviews || []).some(r => r.status === 'pending')) { window.alert('当前已有一轮评审等待处理。'); return; }
  const type = document.getElementById('tb-review-type')?.value;
  const reviewer = document.getElementById('tb-reviewer')?.value;
  const deadline = document.getElementById('tb-review-deadline')?.value;
  const allArtifacts = taskArtifacts(t).map(reviewArtifact);
  const ids = [...document.querySelectorAll('[data-review-artifact]:checked')].map(el => el.dataset.reviewArtifact);
  const artifacts = allArtifacts.filter(a => ids.includes(a.id));
  if (!reviewer) { window.alert('请选择评审人。'); return; }
  if (['代码评审','测试评审','交付评审'].includes(type) && !artifacts.length) { window.alert(type + '必须至少绑定一个交付产物。'); return; }
  if (type === '交付评审' && !(t.acceptance || '').trim()) { window.alert('请先填写并保存验收标准。'); return; }
  t.reviews ||= [];
  const round = t.reviews.filter(r => r.type === type).length + 1;
  t.reviews.push({ id: crypto.randomUUID(), type, round, status: 'pending', reviewer, requestedBy: currentUserName(), deadline, createdAt: new Date().toLocaleString('zh-CN', { hour12: false }), artifacts, subject: { title: t.title, desc: t.desc || '', acceptance: t.acceptance || '' }, decisions: [] });
  t.status = '待评审';
  t.activity ||= []; t.activity.push({ author: currentUserName(), text: '发起' + type + '，评审人：' + reviewer });
  tbSave(); reopenTaskTab(t, 'reviews');
}
function decideTaskReview(action) {
  const t = tbGetSelected(); if (!t) return;
  if (detailSnapshot() !== formSnapshot) { window.alert('请先保存任务修改，再处理评审。'); return; }
  const review = (t.reviews || []).slice().reverse().find(r => r.status === 'pending');
  if (!review || !canDecideReview(review)) return;
  const comment = (document.getElementById('tb-review-comment')?.value || '').trim();
  if (action === 'changes' && !comment) { window.alert('请说明需要修改的内容。'); return; }
  review.status = action === 'approve' ? 'approved' : 'changes_requested';
  review.decidedAt = new Date().toLocaleString('zh-CN', { hour12: false });
  review.decisions ||= []; review.decisions.push({ by: currentUserName(), action, comment, at: review.decidedAt });
  t.activity ||= [];
  if (action === 'approve') {
    const completed = review.type === '交付评审';
    t.status = completed ? '已完成' : '进行中';
    if (completed) t.progress = 100;
    t.activity.push({ author: currentUserName(), text: review.type + '已通过' + (completed ? '，任务完成' : '，任务继续推进') });
  } else {
    t.status = '进行中';
    t.activity.push({ author: currentUserName(), text: review.type + '要求修改：' + comment });
  }
  tbSave(); reopenTaskTab(t, 'reviews');
}
export function openTask(index, status = '未开始') {
  const selected = index === null ? null : CV_TASKS[index];
  tbSetSelected(selected);
  const t = selected || { title: '', desc: '', status, assignee: '待分配', priority: '中', project: cvProject || CV_PROJECTS[0].id, type: '需求', mode: '多人协作' };
  const selectedTeamId = tbCurrentTeamId(t.teamId === undefined ? CV_PROJECTS.find(p => p.id === t.project)?.defaultTeam : t.teamId);
  const teamOptions = [{ id: '', name: '不指定专家团' }, ...TEAMS].map(team => '<option value="' + xesc(team.id) + '" ' + (team.id === selectedTeamId ? 'selected' : '') + '>' + xesc(team.name) + '</option>').join('');
  const canSee = selected && window.tbCanSeeConv ? window.tbCanSeeConv(selected) : false;
  const convArea = !selected ? '<div class="tb-detail-empty">创建任务后，就可以在这里发起会话。</div>'
    : canSee ? window.tbConvListHtml(selected) : '<div class="tb-detail-empty"><strong>会话仅处理人可见</strong><span>请联系当前负责人，或转交给自己后继续协作。</span></div>';
  const artifacts = taskArtifacts(t);
  const reviews = t.reviews || [];
  const pendingReview = reviews.find(r => r.status === 'pending');
  const canComplete = t.status === '已完成' || hasApprovedDelivery(t);
  const col = tbColumns.find(c => c[0] === t.status) || tbColumns[0];
  const hints = {
    '未开始': ['准备开始', '明确任务目标与验收标准，确认负责人后发起会话。'],
    '进行中': ['正在推进', '通过任务对话同步进展，在交付产物中查看输出。'],
    '待评审': ['等待确认', '核对交付内容与验收标准，再决定下一步。'],
    '已完成': ['任务已标记完成', '可回看交付产物与任务动态。'],
    '已失败': ['需要介入', '在任务对话中确认阻塞原因，必要时转交负责人。'],
  };
  const hint = hints[t.status] || hints['未开始'];
  const workspace = document.getElementById('tb-workspace');
  if (workspace.hidden) returnFocus = document.activeElement;
  workspace.innerHTML = `
    <form id="tb-form" class="tb-detail-form">
      <header class="tb-detail-head">
        <button type="button" data-tb-close aria-label="返回任务看板">←</button>
        <span class="tb-detail-crumb">${xesc(cvProjectName(t.project))}<span>/</span><b>${xesc(t.sourceId || '新建任务')}</b></span>
        <div class="tb-detail-actions"><span id="tb-save-state" role="status">修改后保存</span>${selected ? '<button type="button" data-tb-transfer>转交</button>' : ''}<button class="tb-primary" type="submit">${selected ? '保存修改' : '创建任务'}</button></div>
      </header>
      <div class="tb-detail-layout">
        <main class="tb-detail-main">
          <div class="tb-task-heading">
            <div class="tb-task-kicker"><span class="tb-status-pill" data-tone="${col[2]}">${col[3]} ${col[1]}</span><span>${xesc(t.type)} · ${xesc(t.sourceId || '待生成编号')}</span></div>
            <input class="tb-task-title" name="title" aria-label="任务标题" required maxlength="120" placeholder="这项任务要达成什么目标？" value="${xesc(t.title)}">
            <div class="tb-task-byline">负责人 · ${xesc(tbOwner(t))}<span>／</span>${xesc(tbTeamName(t))}</div>
          </div>
          <div class="tb-next-step"><i>${col[3]}</i><div><strong>${hint[0]}</strong><p>${hint[1]}</p></div>${canSee ? '<button type="button" data-detail-jump="conversations">进入对话 ↗</button>' : ''}</div>
          <div class="tb-detail-tabs" role="tablist" aria-label="任务内容">
            ${[['overview','概览'],['conversations','任务对话'],['artifacts','交付产物 <small>' + artifacts.length + '</small>'],['reviews','评审 <small' + (pendingReview ? ' class="is-alert"' : '') + '>' + reviews.length + '</small>'],['activity','动态']].map(([id,label],i) => '<button type="button" role="tab" id="tb-tab-' + id + '" aria-controls="tb-pane-' + id + '" aria-selected="' + !i + '" tabindex="' + (i ? -1 : 0) + '" data-detail-tab="' + id + '">' + label + '</button>').join('')}
          </div>
          <section class="tb-detail-pane" role="tabpanel" id="tb-pane-overview" aria-labelledby="tb-tab-overview" data-detail-pane="overview">
            <label class="tb-description-field"><span>任务描述</span><textarea name="desc" rows="3" placeholder="说明业务背景、目标与交付范围">${xesc(t.desc || '')}</textarea></label>
            <label class="tb-acceptance-field"><span>验收标准 <small>怎样才算完成</small></span><textarea name="acceptance" rows="3" placeholder="写下可核验的结果，每行一条">${xesc(t.acceptance || '')}</textarea></label>
            <section class="tb-detail-section tb-attachments"><h3>参考附件 <small>${(t.files || []).length}</small></h3><div class="tb-files" id="tb-files">${(t.files || []).map(f => '<span class="tb-file">' + xesc(f) + '</span>').join('')}</div>
            ${selected ? '<button type="button" class="tb-dropzone" data-tb-dropzone><span>＋ 添加参考文件</span><small>或拖拽到此处</small></button>' : ''}
            <p class="tb-file-note">本地演示仅记录文件名，文件内容不会上传。</p></section>
          </section>
          <section class="tb-detail-pane" role="tabpanel" id="tb-pane-conversations" aria-labelledby="tb-tab-conversations" data-detail-pane="conversations" hidden>
            <div class="tb-pane-heading"><div><h3>任务对话</h3><p>围绕任务沟通，每次会话独立保留。</p></div>${canSee ? '<button type="button" class="tb-conv-new-btn" data-conv-new>＋ 新会话</button>' : ''}</div><div id="tb-conv-area">${convArea}</div>
          </section>
          <section class="tb-detail-pane" role="tabpanel" id="tb-pane-artifacts" aria-labelledby="tb-tab-artifacts" data-detail-pane="artifacts" hidden>
            <div class="tb-pane-heading"><div><h3>交付产物</h3><p>关联任务执行的输出，在这里只读查看。</p></div><div class="tb-pane-actions"><span class="tb-readonly">只读</span>${selected ? '<button type="button" data-detail-jump="reviews">发起评审</button>' : ''}</div></div>
            <div class="tb-artifacts">${artifacts.map(artifactLink).join('') || '<div class="tb-detail-empty"><span class="tb-empty-icon">▤</span><strong>还没有交付产物</strong><span>执行产物关联后，会出现在这里。</span></div>'}</div>
          </section>
          <section class="tb-detail-pane" role="tabpanel" id="tb-pane-reviews" aria-labelledby="tb-tab-reviews" data-detail-pane="reviews" hidden>
            <div class="tb-pane-heading"><div><h3>评审门禁</h3><p>冻结评审范围，保留每轮结论，并由结论驱动任务状态。</p></div>${pendingReview ? '<span class="tb-review-pending">等待 ' + xesc(pendingReview.reviewer) + '</span>' : ''}</div>
            <div class="tb-reviews">${selected ? reviewPaneHtml(t) : '<div class="tb-detail-empty">创建任务后才能发起评审。</div>'}</div>
          </section>
          <section class="tb-detail-pane" role="tabpanel" id="tb-pane-activity" aria-labelledby="tb-tab-activity" data-detail-pane="activity" hidden>
            <div class="tb-pane-heading"><div><h3>任务动态</h3><p>记录任务状态与负责人变更。</p></div></div>
            <div class="tb-activity">${(t.activity || []).slice().reverse().map(a => '<p><i>' + xesc((a.author || '系')[0]) + '</i><b>' + xesc(a.author || '系统') + '</b><span>' + xesc(a.text) + '</span></p>').join('') || '<div class="tb-detail-empty">暂无任务动态</div>'}</div>
          </section>
        </main>
        <aside class="tb-detail-aside" aria-label="任务属性">
          <h3>任务属性</h3>
          <label>状态<select name="status">${tbColumns.map(c => '<option value="' + c[0] + '" ' + (t.status === c[0] ? 'selected' : '') + (c[0] === '已完成' && !canComplete ? ' disabled' : '') + '>' + c[1] + (c[0] === '已完成' && !canComplete ? '（需交付评审）' : '') + '</option>').join('')}</select></label>
          <label>负责人<select name="assignee">${options([...new Set(['待分配','AI开发Agent',...CV_MEMBERS.map(m => m.name),...TEAMS.map(team => team.name),t.assignee].filter(Boolean))],t.assignee).replaceAll('>AI开发Agent<','>开发专家<')}</select></label>
          <label>优先级<select name="priority">${options([...new Set(['高','中','低',tbPriority(t)])],tbPriority(t))}</select></label>
          <label>任务类型<select name="type">${options(['需求','Bug','任务','改进'],t.type)}</select></label>
          <h3 class="tb-aside-divider">项目与协作</h3>
          <label>所属项目<select name="project">${CV_PROJECTS.map(p => '<option value="' + p.id + '" ' + (p.id === t.project ? 'selected' : '') + '>' + xesc(p.name) + '</option>').join('')}</select></label>
          <label>执行模式<select name="mode">${options(['单人执行','多人协作'],tbMode(t))}</select></label>
          <label class="tb-team-field">专家团<select name="teamId">${teamOptions}</select></label>
          <div class="tb-detail-meta"><span>来源</span><b>${xesc(t.source || '对话自建')}</b><span>任务编号</span><b>${xesc(t.sourceId || '创建后生成')}</b></div>
          <div class="tb-local-note">本地演示 · 修改保存在当前浏览器<br>“已完成”由交付评审通过后自动进入。</div>
        </aside>
      </div>
    </form>`;
  document.getElementById('tb-board-view').hidden = true;
  workspace.hidden = false;
  document.getElementById('cv-tasks').classList.add('tb-detail-open');
  formSnapshot = detailSnapshot();
  workspace.querySelector('[data-tb-close]').focus({ preventScroll: true });
}
function closeTask() {
  if (!confirmLeave()) return;
  document.getElementById('tb-workspace').hidden = true;
  document.getElementById('tb-board-view').hidden = false;
  document.getElementById('cv-tasks').classList.remove('tb-detail-open');
  if (returnFocus?.isConnected) returnFocus.focus(); else document.getElementById('tb-create').focus();
}
function submitTask(event) {
  event.preventDefault();
  const selected = tbGetSelected();
  const f = new FormData(event.target);
  const title = f.get('title').trim();
  if (!title) { event.target.elements.title.setCustomValidity('请输入任务标题'); event.target.elements.title.reportValidity(); return; }
  const previous = selected && { status: selected.status, assignee: selected.assignee };
  const requestedStatus = f.get('status');
  const pendingReview = selected && (selected.reviews || []).some(r => r.status === 'pending');
  if (pendingReview && requestedStatus !== '待评审') { window.alert('当前评审尚未处理，任务需要保持“待确认”。'); selectDetailTab('reviews'); return; }
  if (previous?.status !== '已完成' && requestedStatus === '已完成' && !hasApprovedDelivery(selected)) { window.alert('任务完成前需要通过交付评审。'); selectDetailTab('reviews'); return; }
  const t = selected || { boardId: crypto.randomUUID(), source: '对话自建', sourceId: 'TASK-' + Date.now().toString().slice(-6), size: '小', exec: '专家团', progress: 0, activity: [], artifacts: [] };
  ['status', 'assignee', 'mode', 'priority', 'project', 'type', 'teamId'].forEach(key => t[key] = f.get(key));
  t.acceptance = (f.get('acceptance') || '').trim();
  t.title = title; t.desc = f.get('desc').trim(); t.collab = t.mode === '单人执行' ? '无需协作' : '人Agent协作';
  t.activity ||= []; t.artifacts ||= [];
  if (previous && previous.status !== t.status) t.activity.push({ author: '张工', text: tbLabel(previous.status) + ' → ' + tbLabel(t.status) });
  if (previous && previous.assignee !== t.assignee) t.activity.push({ author: '张工', text: '负责人变更为 ' + tbOwner(t) });
  const comment = (f.get('comment') || '').trim();
  if (comment) t.activity.push({ author: '张工', text: comment });
  if (!selected) { t.activity.push({ author: '张工', text: '创建了任务' }); CV_TASKS.unshift(t); }
  if (t.status === '已完成') t.progress = 100;
  else if (previous?.status === '已完成') t.progress = 0;
  const tab = document.querySelector('[data-detail-tab][aria-selected="true"]')?.dataset.detailTab || 'overview';
  const saved = tbSave(); renderTaskBoard(); cvUpdateCounts();
  openTask(CV_TASKS.indexOf(t)); selectDetailTab(tab);
  document.getElementById('tb-save-state').textContent = saved ? '已保存到本地' : '未持久保存';
}
export function initTaskBoard() {
  try {
    const saved = JSON.parse(localStorage.getItem('lingee_task_board_v1') || 'null');
    if (Array.isArray(saved)) saved.forEach(t => {
      if (!t || typeof t.title !== 'string' || !tbColumns.some(c => c[0] === t.status)) return;
      if (t.teamId) t.teamId = tbCurrentTeamId(t.teamId);
      const existing = CV_TASKS.find(row => tbTaskId(row) === tbTaskId(t));
      if (existing) Object.assign(existing, t); else CV_TASKS.push(t);
    });
  } catch { /* A damaged local snapshot must not prevent the demo from opening. */ }
  const panel = document.getElementById('cv-tasks');
  panel.addEventListener('click', event => {
    if (event.target.closest('[data-tb-dropzone]')) { if (window.tbAddFile) window.tbAddFile(); return; }
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.tbScope) {
      scope = button.dataset.tbScope;
      panel.querySelectorAll('[data-tb-scope]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      renderTaskBoard();
    } else if (button.dataset.tbTask !== undefined) openTask(Number(button.dataset.tbTask));
    else if (button.dataset.tbAdd) window.cvOpenNewTask && window.cvOpenNewTask(button.dataset.tbAdd);
    else if (button.id === 'tb-create') window.cvOpenNewTask && window.cvOpenNewTask();
    else if (button.hasAttribute('data-tb-close')) closeTask();
    else if (button.hasAttribute('data-review-start')) startTaskReview();
    else if (button.dataset.reviewDecision) decideTaskReview(button.dataset.reviewDecision);
    else if (button.dataset.detailTab || button.dataset.detailJump) selectDetailTab(button.dataset.detailTab || button.dataset.detailJump);
    else if (button.dataset.conv) { if (confirmLeave()) window.tbOpenConv && window.tbOpenConv(button.dataset.conv); }
    else if (button.hasAttribute('data-conv-back')) window.tbBackConv && window.tbBackConv();
    else if (button.hasAttribute('data-conv-new')) { if (confirmLeave()) window.tbNewConv && window.tbNewConv(); }
    else if (button.hasAttribute('data-tb-transfer')) {
      if (confirmLeave()) { openTask(CV_TASKS.indexOf(tbGetSelected())); window.tbOpenTransfer && window.tbOpenTransfer(); }
    }
    else if (button.id === 'tb-chat-send') window.tbChatSend && window.tbChatSend();
    else if (button.id === 'tb-reset') {
      document.getElementById('tb-search').value = ''; document.getElementById('tb-mode').value = '';
      panel.querySelector('[data-tb-scope="all"]').click();
    }
  });
  const search = document.getElementById('tb-search');
  const enableSearch = () => search.removeAttribute('readonly');
  search.addEventListener('pointerdown', enableSearch, { once: true });
  search.addEventListener('keydown', enableSearch, { once: true });
  search.addEventListener('input', renderTaskBoard);
  ['tb-mode', 'tb-layout'].forEach(id => document.getElementById(id).addEventListener('change', renderTaskBoard));
  const ws = document.getElementById('tb-workspace');
  ws.addEventListener('submit', submitTask);
  ws.addEventListener('input', e => {
    if (e.target.name === 'title') e.target.setCustomValidity('');
    document.getElementById('tb-save-state').textContent = detailSnapshot() === formSnapshot ? '修改后保存' : '有未保存修改';
  });
  ws.addEventListener('keydown', e => {
    const tab = e.target.closest('[data-detail-tab]');
    if (!tab || !['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    e.preventDefault();
    const tabs = [...ws.querySelectorAll('[data-detail-tab]')];
    const index = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectDetailTab(tabs[index].dataset.detailTab); tabs[index].focus();
  });
}

export { closeTask, openTask as tbOpenTask };
