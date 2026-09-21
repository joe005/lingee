import { CV_TASKS, CV_PROJECTS, CV_MEMBERS, cvInProject, cvProject, cvProjectName } from './data.js';
import { TEAMS } from '../expert/store.js';
import { xesc } from '../expert/data.js';
import { cvUpdateCounts } from './projects.js';

const columns = [
  ['未开始', '待开始', 'pending', '○'], ['进行中', '进行中', 'running', '◐'],
  ['待评审', '待确认', 'review', '◎'], ['已完成', '已完成', 'done', '✓'],
  ['已失败', '需处理', 'failed', '!'],
];
let scope = 'all';
let selected = null;
let returnFocus = null;
const storageKey = 'lingee_task_board_v1';
const legacyTeamIds = {
  'software-company':'general-app-dev', 'fast-app':'kingdee-saas-implementation',
  'cosmic-team':'cosmic-app-dev', 'web-team':'kingdee-secondary-dev',
};
function currentTeamId(id) { return legacyTeamIds[id] || id; }
function taskId(t) { return t.boardId || t.source + ':' + t.sourceId + ':' + t.project; }
function mode(t) { return t.mode || (t.collab === '无需协作' ? '单人执行' : '多人协作'); }
function owner(t) { return t.assignee === 'AI开发Agent' ? '开发专家' : t.assignee; }
function teamName(t) {
  const id = currentTeamId(t.teamId === undefined ? CV_PROJECTS.find(p => p.id === t.project)?.defaultTeam : t.teamId);
  return TEAMS.find(team => team.id === id)?.name || '未指定专家团';
}
function priority(t) { return t.priority || (t.type === 'Bug' ? '高' : '中'); }
function label(status) { return columns.find(c => c[0] === status)?.[1] || status; }
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(CV_TASKS)); return true; }
  catch { window.alert('本地空间不足，修改仅保留在本次打开的页面中。'); return false; }
}
function filtered() {
  const search = (document.getElementById('tb-search')?.value || '').trim().toLowerCase();
  const execution = document.getElementById('tb-mode')?.value;
  return CV_TASKS.filter(cvInProject).filter(t =>
    (scope !== 'mine' || t.assignee === '张工') &&
    (scope !== 'attention' || ['待评审', '已失败'].includes(t.status)) &&
    (!execution || mode(t) === execution) &&
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
  return ("<button class=\"tb-card\" data-tb-task=\"" + (index) + "\"><span class=\"tb-card-top\"><span>" + (xesc(t.sourceId)) + "</span><span class=\"tb-type\">" + (xesc(t.type)) + "</span></span><strong>" + (xesc(t.title)) + "</strong><span class=\"tb-description\">" + (xesc(t.desc)) + "</span><span class=\"tb-project\">" + (xesc(cvProjectName(t.project) + " · " + teamName(t))) + "</span><span class=\"tb-card-bottom\"><span class=\"tb-person\"><i class=\"" + (t.assignee === 'AI开发Agent' ? 'tb-expert' : '') + "\">" + (t.assignee === 'AI开发Agent' ? '✦' : xesc((t.assignee || '待')[0])) + "</i>" + (xesc(owner(t))) + "</span><span class=\"tb-priority\" data-priority=\"" + (xesc(priority(t))) + "\">≋ " + (xesc(priority(t))) + "</span></span><span class=\"tb-context\">" + (xesc(mode(t))) + "<span>" + (t.status === '待评审' ? '等待人工确认' : t.status === '已失败' ? '需要介入' : t.status === '进行中' ? '执行中 · ' + (t.progress || 0) + '%' : xesc(label(t.status))) + "</span></span></button>");
}
export function renderTaskBoard() {
  const grid = document.getElementById('cv-task-grid');
  if (!grid || !document.getElementById('tb-layout')) return;
  const rows = filtered();
  const list = document.getElementById('tb-layout').value === 'list';
  grid.className = list ? 'tb-board tb-list' : 'tb-board';
  grid.innerHTML = columns.map(([status, title, tone, symbol]) => {
    const tasks = rows.filter(t => t.status === status);
    return ("<section class=\"tb-column tb-" + (tone) + "\"><header><span class=\"tb-column-title\"><i>" + (symbol) + "</i>" + (title) + "<small>" + (tasks.length) + "</small></span><button data-tb-add=\"" + (status) + "\" aria-label=\"在" + (title) + "中新建任务\">＋</button></header><div class=\"tb-cards\">" + (tasks.map(card).join('') || '<div class="tb-column-empty">暂无任务</div>') + "</div></section>");
  }).join('');
  document.getElementById('tb-empty').hidden = rows.length > 0;
  grid.hidden = rows.length === 0;
  renderTaskSummary();
}
function options(values, current) { return values.map(v => ("<option value=\"" + (xesc(v)) + "\" " + (v === current ? 'selected' : '') + ">" + (xesc(v)) + "</option>")).join(''); }
function openTask(index, status = '未开始') {
  selected = index === null ? null : CV_TASKS[index];
  const t = selected || { title: '', desc: '', status, assignee: '待分配', priority: '中', project: cvProject || CV_PROJECTS[0].id, type: '需求', mode: '多人协作' };
  const selectedTeamId=currentTeamId(t.teamId === undefined ? CV_PROJECTS.find(p => p.id === t.project)?.defaultTeam : t.teamId);
  const teamOptions = [{id:'',name:'不指定专家团'}, ...TEAMS].map(team => '<option value="' + xesc(team.id) + '" ' + (team.id === selectedTeamId ? 'selected' : '') + '>' + xesc(team.name) + '</option>').join('');
  const workspace = document.getElementById('tb-workspace');
  returnFocus = document.activeElement;
  workspace.innerHTML = ("<form id=\"tb-form\" class=\"tb-detail-form\"><header class=\"tb-detail-head\"><button type=\"button\" data-tb-close aria-label=\"返回任务看板\">←</button><span>" + (selected ? xesc(cvProjectName(t.project)) + ' / ' + xesc(t.sourceId) : '任务 / 新建') + "</span><button type=\"button\" data-tb-close aria-label=\"关闭任务详情\">×</button></header><div class=\"tb-detail-layout\"><main class=\"tb-detail-main\"><label class=\"tb-title-label\"><span>任务标题</span><input name=\"title\" aria-label=\"任务标题\" required maxlength=\"120\" placeholder=\"这项任务要达成什么目标？\" value=\"" + xesc(t.title) + "\"></label><label class=\"tb-description-field\"><span>任务描述</span><textarea name=\"desc\" rows=\"5\" placeholder=\"补充背景、交付内容和验收标准\">" + xesc(t.desc || '') + "</textarea></label><section class=\"tb-detail-section\"><h3>交付产物 <small>" + ((t.artifacts || []).length) + "</small></h3><p>任务执行过程中生成并自动关联，只能在这里查看。</p><div class=\"tb-artifacts\">" + ((t.artifacts || []).map(a => '<a href="' + xesc(a.url) + '" target="_blank" rel="noopener noreferrer">↗ ' + xesc(a.name) + '</a>').join('') || '<span>还没有交付产物</span>') + "</div></section><section class=\"tb-detail-section tb-activity-section\"><h3>动态</h3><div class=\"tb-activity\">" + ((t.activity || []).map(a => '<p><i>' + xesc((a.author || '我')[0]) + '</i><b>' + xesc(a.author) + '</b><span>' + xesc(a.text) + '</span></p>').join('') || '<p class="tb-activity-empty">暂无协作记录</p>') + "</div><textarea name=\"comment\" rows=\"3\" aria-label=\"协作留言\" placeholder=\"留下进展、待确认问题或交接说明…\"></textarea></section></main><aside class=\"tb-detail-aside\" aria-label=\"任务属性\"><h3>属性</h3><label>状态<select name=\"status\">" + columns.map(c => '<option value="' + c[0] + '" ' + (t.status === c[0] ? 'selected' : '') + '>' + c[1] + '</option>').join('') + "</select></label><label>负责人<select name=\"assignee\">" + options([...new Set(['待分配', 'AI开发Agent', ...CV_MEMBERS.map(m => m.name), t.assignee])], t.assignee).replaceAll('>AI开发Agent<', '>开发专家<') + "</select></label><label>所属项目<select name=\"project\">" + CV_PROJECTS.map(p => '<option value="' + p.id + '" ' + (p.id === t.project ? 'selected' : '') + '>' + xesc(p.name) + '</option>').join('') + "</select></label><label>执行模式<select name=\"mode\">" + options(['单人执行', '多人协作'], mode(t)) + "</select></label><label>协作专家团<select name=\"teamId\">" + teamOptions + "</select></label><label>优先级<select name=\"priority\">" + options(['高', '中', '低'], priority(t)) + "</select></label><label>任务类型<select name=\"type\">" + options(['需求', 'Bug', '任务', '改进'], t.type) + "</select></label><div class=\"tb-detail-meta\"><span>来源</span><b>" + xesc(t.source || '对话自建') + "</b><span>任务编号</span><b>" + xesc(t.sourceId || '创建后生成') + "</b></div><footer><span>修改保存在当前浏览器</span><button type=\"button\" data-tb-close>取消</button><button class=\"tb-primary\" type=\"submit\">" + (selected ? '保存修改' : '创建任务') + "</button></footer></aside></div></form>");
  document.getElementById('tb-board-view').hidden = true;
  workspace.hidden = false;
  document.getElementById('cv-tasks').classList.add('tb-detail-open');
  workspace.querySelector('[name="title"]').focus();
}
function closeTask() {
  document.getElementById('tb-workspace').hidden = true;
  document.getElementById('tb-board-view').hidden = false;
  document.getElementById('cv-tasks').classList.remove('tb-detail-open');
  if(returnFocus?.isConnected) returnFocus.focus(); else document.getElementById('tb-create').focus();
}
function submitTask(event) {
  event.preventDefault();
  const f = new FormData(event.target);
  const title = f.get('title').trim();
  if (!title) { event.target.elements.title.setCustomValidity('请输入任务标题'); event.target.elements.title.reportValidity(); return; }
  const previous = selected && { status: selected.status, assignee: selected.assignee };
  const t = selected || { boardId: crypto.randomUUID(), source: '对话自建', sourceId: 'TASK-' + Date.now().toString().slice(-6), size: '小', exec: '专家团', progress: 0, activity: [], artifacts: [] };
  ['status', 'assignee', 'mode', 'priority', 'project', 'type', 'teamId'].forEach(key => t[key] = f.get(key));
  t.title = title; t.desc = f.get('desc').trim(); t.collab = t.mode === '单人执行' ? '无需协作' : '人Agent协作';
  t.activity ||= []; t.artifacts ||= [];
  if (previous && previous.status !== t.status) t.activity.push({author: '张工', text: label(previous.status) + ' → ' + label(t.status)});
  if (previous && previous.assignee !== t.assignee) t.activity.push({author: '张工', text: '负责人变更为 ' + owner(t)});
  const comment = (f.get('comment') || '').trim();
  if (comment) t.activity.push({author: '张工', text: comment});
  if (!selected) { t.activity.push({author: '张工', text: '创建了任务'}); CV_TASKS.unshift(t); }
  if (t.status === '已完成') t.progress = 100;
  else if (previous?.status === '已完成') t.progress = 0;
  save(); renderTaskBoard(); cvUpdateCounts(); closeTask();
}
export function initTaskBoard() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (Array.isArray(saved)) saved.forEach(t => {
      if (!t || typeof t.title !== 'string' || !columns.some(c => c[0] === t.status)) return;
      if(t.teamId) t.teamId=currentTeamId(t.teamId);
      const existing = CV_TASKS.find(row => taskId(row) === taskId(t));
      if (existing) Object.assign(existing, t); else CV_TASKS.push(t);
    });
  } catch { /* A damaged local snapshot must not prevent the demo from opening. */ }
  const panel = document.getElementById('cv-tasks');
  panel.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.tbScope) {
      scope = button.dataset.tbScope;
      panel.querySelectorAll('[data-tb-scope]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      renderTaskBoard();
    } else if (button.dataset.tbTask !== undefined) openTask(Number(button.dataset.tbTask));
    else if (button.dataset.tbAdd) openTask(null, button.dataset.tbAdd);
    else if (button.id === 'tb-create') openTask(null);
    else if (button.hasAttribute('data-tb-close')) closeTask();
    else if (button.id === 'tb-reset') {
      document.getElementById('tb-search').value = ''; document.getElementById('tb-mode').value = '';
      panel.querySelector('[data-tb-scope="all"]').click();
    }
  });
  document.getElementById('tb-search').addEventListener('input', renderTaskBoard);
  ['tb-mode', 'tb-layout'].forEach(id => document.getElementById(id).addEventListener('change', renderTaskBoard));
  document.getElementById('tb-workspace').addEventListener('submit', submitTask);
  document.getElementById('tb-workspace').addEventListener('input', e => { if (e.target.name === 'title') e.target.setCustomValidity(''); });
}
