import { CV_TASKS, CV_PROJECTS, CV_MEMBERS, cvInProject, cvProject, cvProjectName } from './data.js';
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
export function openTask(index, status = '未开始') {
  const selected = index === null ? null : CV_TASKS[index];
  tbSetSelected(selected);
  const t = selected || { title: '', desc: '', status, assignee: '待分配', tbPriority: '中', project: cvProject || CV_PROJECTS[0].id, type: '需求', tbMode: '多人协作' };
  const selectedTeamId = tbCurrentTeamId(t.teamId === undefined ? CV_PROJECTS.find(p => p.id === t.project)?.defaultTeam : t.teamId);
  const teamOptions = [{ id: '', name: '不指定专家团' }, ...TEAMS].map(team => '<option value="' + xesc(team.id) + '" ' + (team.id === selectedTeamId ? 'selected' : '') + '>' + xesc(team.name) + '</option>').join('');
  /* 任务对话区由 task-chat 提供（挂 window，避免模块循环依赖） */
  const canSee = selected && window.tbCanSeeConv ? window.tbCanSeeConv(selected) : false;
  const convHtml = selected && window.tbConvListHtml ? window.tbConvListHtml(selected) : '';
  const convArea = selected ? (canSee ? convHtml : '<div class="tb-chat-empty">会话记录仅任务处理人可见。</div>') : '<div class="tb-chat-empty">创建任务后，就可以在这里发起会话推进。</div>';
  const workspace = document.getElementById('tb-workspace');
  returnFocus = document.activeElement;
  workspace.innerHTML = ("<form id=\"tb-form\" class=\"tb-detail-form\"><header class=\"tb-detail-head\"><button type=\"button\" data-tb-close aria-label=\"返回任务看板\">←</button><span>" + (selected ? xesc(cvProjectName(t.project)) + ' / ' + xesc(t.sourceId) : '任务 / 新建') + "</span><button type=\"button\" data-tb-close aria-label=\"关闭任务详情\">×</button></header><div class=\"tb-detail-layout\"><main class=\"tb-detail-main\"><label class=\"tb-title-label\"><span>任务标题</span><input name=\"title\" aria-label=\"任务标题\" required maxlength=\"120\" placeholder=\"这项任务要达成什么目标？\" value=\"" + xesc(t.title) + "\"></label><label class=\"tb-description-field\"><span>任务描述</span><textarea name=\"desc\" rows=\"5\" placeholder=\"补充背景、交付内容和验收标准\">" + xesc(t.desc || '') + "</textarea></label><section class=\"tb-detail-section\"><h3>附件 <small>" + ((t.files || []).length) + "</small></h3>" + (selected ? '<div class="tb-dropzone" data-tb-dropzone><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span class="tb-dropzone-t">拖拽文件到此处，或点击上传</span><span class="tb-dropzone-s">单个文件最大 100 MB</span></div>' : '') + "<div class=\"tb-files\" id=\"tb-files\">" + ((t.files || []).map(f => '<span class="tb-file">' + xesc(f) + '</span>').join('')) + "</div></section><section class=\"tb-detail-section tb-chat-section\"><div class=\"tb-chat-head\"><h3>任务对话</h3>" + (canSee ? '<button type="button" class="tb-conv-new-btn" data-conv-new>＋ 新会话</button>' : '') + "</div><div id=\"tb-conv-area\">" + convArea + "</div></section><section class=\"tb-detail-section\"><h3>交付产物 <small>" + ((t.artifacts || []).length) + "</small></h3><p>任务执行过程中生成并自动关联，只能在这里查看。</p><div class=\"tb-artifacts\">" + ((t.artifacts || []).map(a => '<a href="' + xesc(a.url) + '" target="_blank" rel="noopener noreferrer">↗ ' + xesc(a.name) + '</a>').join('') || '<span>还没有交付产物</span>') + "</div></section></main><aside class=\"tb-detail-aside\" aria-label=\"任务属性\"><h3>属性</h3><label>状态<select name=\"status\">" + tbColumns.map(c => '<option value="' + c[0] + '" ' + (t.status === c[0] ? 'selected' : '') + '>' + c[1] + '</option>').join('') + "</select></label><label>负责人<select name=\"assignee\">" + options([...new Set(['待分配', 'AI开发Agent', ...CV_MEMBERS.map(m => m.name), t.assignee])], t.assignee).replaceAll('>AI开发Agent<', '>开发专家<') + "</select></label><label>所属项目<select name=\"project\">" + CV_PROJECTS.map(p => '<option value="' + p.id + '" ' + (p.id === t.project ? 'selected' : '') + '>' + xesc(p.name) + '</option>').join('') + "</select></label><label>执行模式<select name=\"tbMode\">" + options(['单人执行', '多人协作'], tbMode(t)) + "</select></label><label>协作专家团<select name=\"teamId\">" + teamOptions + "</select></label><label>优先级<select name=\"tbPriority\">" + options(['高', '中', '低'], tbPriority(t)) + "</select></label><label>任务类型<select name=\"type\">" + options(['需求', 'Bug', '任务', '改进'], t.type) + "</select></label><div class=\"tb-detail-meta\"><span>来源</span><b>" + xesc(t.source || '对话自建') + "</b><span>任务编号</span><b>" + xesc(t.sourceId || '创建后生成') + "</b></div><footer><span>修改保存在当前浏览器</span><div class=\"tb-foot-acts\"><button type=\"button\" class=\"tb-transfer-btn\" data-tb-transfer>转交任务</button><button type=\"button\" data-tb-close>取消</button><button class=\"tb-primary\" type=\"submit\">" + (selected ? '保存修改' : '创建任务') + "</button></div></footer></aside></div></form>");
  document.getElementById('tb-board-view').hidden = true;
  workspace.hidden = false;
  document.getElementById('cv-tasks').classList.add('tb-detail-open');
  workspace.querySelector('[name="title"]').focus();
}
function closeTask() {
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
  const t = selected || { boardId: crypto.randomUUID(), source: '对话自建', sourceId: 'TASK-' + Date.now().toString().slice(-6), size: '小', exec: '专家团', progress: 0, activity: [], artifacts: [] };
  ['status', 'assignee', 'tbMode', 'tbPriority', 'project', 'type', 'teamId'].forEach(key => t[key] = f.get(key));
  t.title = title; t.desc = f.get('desc').trim(); t.collab = t.mode === '单人执行' ? '无需协作' : '人Agent协作';
  t.activity ||= []; t.artifacts ||= [];
  if (previous && previous.status !== t.status) t.activity.push({ author: '张工', text: tbLabel(previous.status) + ' → ' + tbLabel(t.status) });
  if (previous && previous.assignee !== t.assignee) t.activity.push({ author: '张工', text: '负责人变更为 ' + tbOwner(t) });
  const comment = (f.get('comment') || '').trim();
  if (comment) t.activity.push({ author: '张工', text: comment });
  if (!selected) { t.activity.push({ author: '张工', text: '创建了任务' }); CV_TASKS.unshift(t); }
  if (t.status === '已完成') t.progress = 100;
  else if (previous?.status === '已完成') t.progress = 0;
  tbSave(); renderTaskBoard(); cvUpdateCounts(); closeTask();
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
    else if (button.dataset.conv) window.tbOpenConv && window.tbOpenConv(button.dataset.conv);
    else if (button.hasAttribute('data-conv-back')) window.tbBackConv && window.tbBackConv();
    else if (button.hasAttribute('data-conv-new')) window.tbNewConv && window.tbNewConv();
    else if (button.hasAttribute('data-tb-transfer')) window.tbOpenTransfer && window.tbOpenTransfer();
    else if (button.id === 'tb-chat-send') window.tbChatSend && window.tbChatSend();
    else if (button.id === 'tb-reset') {
      document.getElementById('tb-search').value = ''; document.getElementById('tb-mode').value = '';
      panel.querySelector('[data-tb-scope="all"]').click();
    }
  });
  document.getElementById('tb-search').addEventListener('input', renderTaskBoard);
  ['tb-mode', 'tb-layout'].forEach(id => document.getElementById(id).addEventListener('change', renderTaskBoard));
  const ws = document.getElementById('tb-workspace');
  ws.addEventListener('submit', submitTask);
  ws.addEventListener('input', e => { if (e.target.name === 'title') e.target.setCustomValidity(''); });
}

export { closeTask, openTask as tbOpenTask };
