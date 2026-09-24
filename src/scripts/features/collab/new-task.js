import { CV_TASKS, CV_PROJECTS, cvProject, cvPeopleInProject } from './data.js';
import { TEAMS } from '../expert/store.js';
import { xesc } from '../expert/data.js';
import { cvUpdateCounts } from './projects.js';
import { tbSave, tbTeamStages } from './tb-core.js';
import { renderTaskBoard } from './task-board.js';
/* 新建任务弹窗：手动创建 / 一句话草拟。
   手动：关联项目 → 继承项目专家团 → 直接选人。
   一句话：本地规则整理可编辑草稿，创建前由用户确认项目、执行人与内容。
   从 task-board.js 拆出，副作用集中在 initNewTask()。 */


let ntMode = 'manual';
let ntStatus = '待办';
let ntFiles = [];
let ntTags = [];
let ntProjectId = '';
let ntTeamId = '';
let ntAssignee = '';
let ntTagEditing = false;
let ntExecMode = '单人执行';
let ntStagePlan = [];
let ntParentTaskId = '';
let ntParentIsGroup = false;
let ntDraftReady = false;

const NT_STATUS_LABELS = { '待规划': '待规划', '待办': '待办', '进行中': '进行中', '审核中': '审核中', '已完成': '已完成', '已阻塞': '已阻塞', '已取消': '已取消' };

function ntRenderFiles() {
  const el = document.getElementById('cv-nt-file-list');
  if (!el) return;
  const count = document.getElementById('cv-nt-attach-count');
  if (count) count.textContent = ntFiles.length ? String(ntFiles.length) : '';
  if (!ntFiles.length) {
    el.innerHTML = '<button type="button" class="nt-attach-empty" data-nt-attach-trigger><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>点击或拖拽上传文件</span><small>支持 Ctrl+V 粘贴截图</small></button>';
    return;
  }
  el.innerHTML = '<div class="nt-attach-grid">' + ntFiles.map((f, i) => '<span class="nt-attach-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg><span class="nt-attach-name">' + xesc(f) + '</span><button type="button" class="nt-attach-x" data-nt-file="' + i + '">×</button></span>').join('') + '<button type="button" class="nt-attach-more" data-nt-attach-trigger title="继续添加"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button></div>';
}
function ntAddFile() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.multiple = true;
  inp.onchange = () => { Array.from(inp.files || []).forEach(f => ntFiles.push(f.name)); ntRenderFiles(); };
  inp.click();
}

/* 标签 */
function ntRenderTagList() {
  const el = document.getElementById('cv-nt-tag-list');
  if (!el) return;
  el.innerHTML = ntTags.map((t, i) => '<span class="nt-chip nt-chip--tag">' + xesc(t) + '<button type="button" class="nt-tag-x" data-nt-tag-x="' + i + '">×</button></span>').join('');
}
function ntCommitTag(inp) {
  const v = inp.value.trim();
  if (v) ntTags.push(v);
  if (inp.parentNode) inp.remove();
  ntTagEditing = false;
  const btn = document.getElementById('cv-nt-addtag');
  if (btn) btn.style.display = '';
  ntRenderTagList();
}
function ntStartAddTag() {
  if (ntTagEditing) return;
  ntTagEditing = true;
  const wrap = document.getElementById('cv-nt-tags');
  const btn = document.getElementById('cv-nt-addtag');
  if (!wrap || !btn) return;
  btn.style.display = 'none';
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'nt-tag-input';
  inp.placeholder = '输入标签，回车确认';
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); ntCommitTag(inp); }
    else if (e.key === 'Escape') { inp.remove(); ntTagEditing = false; btn.style.display = ''; }
  });
  inp.addEventListener('blur', () => { if (document.body.contains(inp)) ntCommitTag(inp); });
  wrap.appendChild(inp);
  inp.focus();
}

/* 项目 → 专家团：一个项目只绑定一个专家团 */
function ntTeamOfProject(pid) {
  const proj = CV_PROJECTS.find(p => p.id === pid);
  const tid = (proj && proj.defaultTeam) || (TEAMS[0] && TEAMS[0].id);
  return TEAMS.find(t => t.id === tid) || TEAMS[0] || null;
}
/* Task 只选业务负责人（实际的人）。 */
function ntPeopleOfProject(pid) {
  const proj = CV_PROJECTS.find(p => p.id === pid);
  return proj ? cvPeopleInProject(proj) : [];
}
function ntRenderTeam() {
  const team = ntProjectId ? ntTeamOfProject(ntProjectId) : null;
  ntTeamId = team ? team.id : '';
}
function ntRenderGroups() {
  const field = document.getElementById('cv-nt-group-field');
  const select = document.getElementById('cv-nt-group');
  if (!field || !select) return;
  field.classList.toggle('hidden', !!ntParentTaskId);
  select.innerHTML = '<option value="">无上级任务</option>' + CV_TASKS.filter(t => t.project === ntProjectId && t.kind === 'epic').map(t => '<option value="' + xesc(t.boardId) + '">' + xesc(t.title) + '</option>').join('');
  select.disabled = !ntProjectId;
}
/* 负责人：从项目成员中选人。 */
function ntRenderPeople() {
  const members = ntPeopleOfProject(ntProjectId);
  const el = document.getElementById('cv-nt-people');
  if (!el) return;
  el.disabled = !ntProjectId || !members.length;
  if (el.disabled) {
    ntAssignee = '';
    el.innerHTML = '<option value="">' + (ntProjectId ? '请先为项目添加成员' : '请先选择项目') + '</option>';
    return;
  }
  if (!members.some(m => m.name === ntAssignee)) ntAssignee = members[0].name;
  el.innerHTML = members.map(m => '<option value="' + xesc(m.name) + '"' + (m.name === ntAssignee ? ' selected' : '') + '>' + xesc(m.name) + '</option>').join('');
}
/* 多人协作：按专家团覆盖的阶段逐一指定执行人，每人只负责并启动自己那一段。 */
function ntStagesFieldVisible() {
  return ntExecMode === '多人协作';
}
function ntSetExecMode(m) {
  ntExecMode = m === '多人协作' ? '多人协作' : '单人执行';
  document.querySelectorAll('#cv-nt-exec-mode .nt-seg-btn').forEach(b => {
    const selected = b.getAttribute('data-nt-exec') === ntExecMode;
    b.classList.toggle('on', selected);
    b.setAttribute('aria-checked', String(selected));
    b.tabIndex = selected ? 0 : -1;
  });
  const single = document.getElementById('cv-nt-single-field');
  const stagesField = document.getElementById('cv-nt-stages-field');
  if (single) single.classList.toggle('hidden', ntExecMode !== '单人执行');
  if (stagesField) stagesField.classList.toggle('hidden', !ntStagesFieldVisible());
  if (ntExecMode === '多人协作') {
    ntRenderStages();
    stagesField?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
/* 阶段流程节点：节点本身是开关，节点下方选择执行人。 */
function ntRenderStages() {
  const el = document.getElementById('cv-nt-stage-list');
  if (!el) return;
  const team = ntTeamId ? TEAMS.find(t => t.id === ntTeamId) : null;
  const stages = tbTeamStages(team);
  const members = ntPeopleOfProject(ntProjectId);
  const count = document.getElementById('cv-nt-stage-count');
  if (count) count.textContent = '';
  if (!ntProjectId || !members.length) { el.innerHTML = '<span class="nt-people-empty">' + (ntProjectId ? '请先为项目添加成员' : '请先选择项目') + '</span>'; ntStagePlan = []; return; }
  if (!ntStagePlan.length || ntStagePlan[0].teamId !== ntTeamId) {
    ntStagePlan = stages.map((s, i) => ({ id: s.id, name: s.name, teamId: ntTeamId, checked: true, assignee: members[i % members.length].name }));
  }
  if (count) count.textContent = ntStagePlan.filter(s => s.checked).length + ' / ' + ntStagePlan.length;
  el.innerHTML = ntStagePlan.map((sp, i) => {
    const node = '<div class="nt-flow-item" data-state="' + (sp.checked ? 'on' : 'off') + '">'
      + '<button type="button" class="nt-flow-node" aria-pressed="' + sp.checked + '" data-nt-stage-toggle="' + sp.id + '" title="' + xesc(sp.name) + (sp.checked ? '（点击取消该阶段）' : '（点击加入该阶段）') + '">'
      + '<span class="nt-flow-dot">' + (sp.checked ? '✓' : (i + 1)) + '</span>'
      + '<span class="nt-flow-name">' + xesc(sp.name) + '</span>'
      + '</button>'
      + (sp.checked
        ? '<select class="nt-flow-person" data-person-select data-nt-stage-assignee="' + sp.id + '" aria-label="' + xesc(sp.name) + ' 执行人">' + members.map(m => '<option' + (m.name === sp.assignee ? ' selected' : '') + '>' + xesc(m.name) + '</option>').join('') + '</select>'
        : '<span class="nt-flow-person nt-flow-person--off">未启用</span>')
      + '</div>';
    return node;
  }).join('');
}
function ntOnProjectChange() {
  const sel = document.getElementById('cv-nt-project');
  ntProjectId = sel ? sel.value : '';
  ntAssignee = '';
  ntStagePlan = [];
  ntRenderTeam(); ntRenderPeople(); ntRenderGroups();
  if (ntExecMode === '多人协作') ntRenderStages();
}
/* 原型仅根据项目名称匹配归属，不调用模型服务。 */
function ntInferProject(prompt) {
  const p = prompt || '';
  for (const proj of CV_PROJECTS) { if (p.indexOf(proj.name) >= 0) return proj.id; }
  return ntProjectId || cvProject || (CV_PROJECTS[0] && CV_PROJECTS[0].id);
}
function ntAppendDraftMessage(kind, text) {
  const log = document.getElementById('cv-nt-agent-messages');
  if (!log) return;
  const item = document.createElement('p');
  item.className = 'nt-agent-message nt-agent-message--' + kind;
  item.textContent = text;
  log.appendChild(item);
  log.scrollTop = log.scrollHeight;
}
function ntBuildDraft(message) {
  const first = message.split(/[。！？\n]/)[0].replace(/^(?:请帮我|帮我|我想|我要|我希望)\s*/, '').replace(/^(?:做一个|开发一个|实现一个)/, '实现 ');
  if (/CRM/i.test(message) && /客户管理/.test(message)) {
    return {
      title: '实现 CRM 客户管理',
      desc: '实现 CRM 系统的客户管理模块，建议覆盖以下功能（请确认范围）：\n\n1. 客户信息：创建、编辑、查询与详情查看\n2. 联系人：为客户维护姓名、职位、电话和邮箱\n3. 跟进记录：记录沟通内容、时间和方式\n4. 客户标签：按标签筛选与分组\n5. 数据导入导出：支持 Excel/CSV 批量导入和导出',
      question: '草稿列出了客户信息、联系人、跟进记录、标签和导入导出。这些都要放进第一期吗？'
    };
  }
  return { title: (first || message).slice(0, 120), desc: message, question: '已整理到左侧草稿。还需要哪些功能或完成标准？可以继续补充，也可以直接确认创建。' };
}
function ntSendDraftMessage() {
  const input = document.getElementById('cv-nt-prompt');
  const message = (input?.value || '').trim();
  if (!message) { input?.focus(); return false; }
  ntAppendDraftMessage('user', message);
  input.value = '';
  if (!ntDraftReady) {
    ntDraftReady = true;
    const draft = ntBuildDraft(message);
    document.getElementById('cv-nt-draft-title').value = draft.title;
    document.getElementById('cv-nt-draft-desc').value = draft.desc;
    document.getElementById('cv-nt-draft-empty').classList.add('hidden');
    document.getElementById('cv-nt-draft-content').classList.remove('hidden');
    document.getElementById('cv-nt-submit').disabled = false;
    document.getElementById('cv-nt-continue').disabled = false;
    const project = ntInferProject(message);
    const select = document.getElementById('cv-nt-project');
    if (select && project) { select.value = project; ntOnProjectChange(); }
    ntAppendDraftMessage('assistant', draft.question);
  } else {
    const desc = document.getElementById('cv-nt-draft-desc');
    if (/^(都需要|都要|全部需要|全部都要)[。！!]?$/i.test(message) && desc.value.includes('建议覆盖以下功能（请确认范围）')) {
      desc.value = desc.value.replace('建议覆盖以下功能（请确认范围）', '包含以下功能');
      ntAppendDraftMessage('assistant', '好的，已确认这些功能都在范围内。它们要全部放进第一期，还是分阶段交付？');
    } else {
      desc.value = (desc.value.trim() + '\n\n补充要求：' + message).trim();
      ntAppendDraftMessage('assistant', '已补充到任务描述。请核对左侧草稿与下方属性。');
    }
  }
  input.focus();
  return true;
}
export function cvOpenNewTask(status, ctx) {
  ntMode = 'manual';
  ntStatus = status || '待办';
  ntParentTaskId = ctx?.parentTaskId || '';
  ntParentIsGroup = !!ntParentTaskId && CV_TASKS.some(t => t.boardId === ntParentTaskId && t.kind === 'epic');
  ntProjectId = ctx?.projectId || cvProject || '';
  ntAssignee = '';
  ntFiles = [];
  ntTags = [];
  ntStagePlan = [];
  ntDraftReady = false;
  const psel = document.getElementById('cv-nt-project');
  if (psel) {
    psel.innerHTML = '<option value="">请选择项目</option>' + CV_PROJECTS.map(p => '<option value="' + p.id + '"' + (p.id === ntProjectId ? ' selected' : '') + '>' + xesc(p.name) + '</option>').join('');
    psel.disabled = !!ntParentTaskId;
  }
  document.getElementById('cv-nt-title').value = '';
  document.getElementById('cv-nt-desc').value = '';
  document.getElementById('cv-nt-prompt').value = '';
  document.getElementById('cv-nt-draft-title').value = '';
  document.getElementById('cv-nt-draft-desc').value = '';
  document.getElementById('cv-nt-draft-empty').classList.remove('hidden');
  document.getElementById('cv-nt-draft-content').classList.add('hidden');
  document.getElementById('cv-nt-agent-messages').innerHTML = '<p class="nt-agent-welcome">说出想完成的事，我会先整理成草稿。你可以继续补充，也可以直接编辑左侧内容。</p>';
  document.getElementById('cv-nt-priority').value = '中';
  document.getElementById('cv-nt-more').open = false;
  const tagInput = document.querySelector('#cv-nt-tags .nt-tag-input');
  if (tagInput) tagInput.remove();
  ntTagEditing = false;
  document.getElementById('cv-nt-addtag').style.display = '';
  const chip = document.getElementById('cv-nt-status-chip');
  if (chip) chip.textContent = NT_STATUS_LABELS[ntStatus] || '待开始';
  const statusProperty = document.getElementById('cv-nt-status-property');
  if (statusProperty) statusProperty.textContent = NT_STATUS_LABELS[ntStatus] || '待开始';
  const modes = document.getElementById('cv-nt-modes');
  if (modes) modes.classList.toggle('hidden', !!ntParentTaskId);
  ['cv-nt-agent-trigger', 'cv-nt-manual-trigger'].forEach(id => {
    const trigger = document.getElementById(id);
    if (trigger) trigger.classList.toggle('hidden', !!ntParentTaskId || id === 'cv-nt-manual-trigger');
  });
  const parentBanner = document.getElementById('cv-nt-parent-banner');
  if (parentBanner) {
    parentBanner.classList.toggle('hidden', !ntParentTaskId);
    const t = document.getElementById('cv-nt-parent-title');
    if (t) t.textContent = ctx?.parentTitle || '';
    const label = document.getElementById('cv-nt-parent-label');
    if (label) label.textContent = ntParentIsGroup ? '正在' : '正在为';
    const suffix = document.getElementById('cv-nt-parent-suffix');
    if (suffix) suffix.textContent = ntParentIsGroup ? '下创建子任务' : '新增子任务';
  }
  ntRenderTagList();
  ntRenderTeam(); ntRenderPeople(); ntRenderGroups();
  const groupSelect = document.getElementById('cv-nt-group');
  if (groupSelect && ctx?.groupId && Array.from(groupSelect.options).some(option => option.value === ctx.groupId)) groupSelect.value = ctx.groupId;
  ntRenderFiles();
  ntSetExecMode('单人执行');
  cvSetNewTaskMode('manual');
  document.getElementById('cv-newtask-overlay').style.display = 'flex';
  setTimeout(() => document.getElementById(ntMode === 'agent' ? 'cv-nt-prompt' : 'cv-nt-title').focus(), 0);
}
export function cvCloseNewTask() { document.getElementById('cv-newtask-overlay').style.display = 'none'; }
function cvSetNewTaskMode(m) {
  ntMode = m;
  const modal = document.querySelector('#cv-newtask-overlay .nt-modal');
  if (modal) modal.classList.toggle('nt-modal--agent', m === 'agent');
  document.getElementById('cv-nt-manual').classList.toggle('hidden', m !== 'manual');
  document.getElementById('cv-nt-agent').classList.toggle('hidden', m !== 'agent');
  const properties = document.getElementById('cv-nt-properties');
  if (properties) properties.classList.remove('hidden');
  const stagesField = document.getElementById('cv-nt-stages-field');
  if (stagesField) (m === 'agent' ? document.getElementById('cv-nt-draft-content') : document.getElementById('cv-nt-manual')).appendChild(stagesField);
  if (stagesField) stagesField.classList.toggle('hidden', !ntStagesFieldVisible());
  document.getElementById('cv-nt-mode-label').textContent = ntParentTaskId ? (ntParentIsGroup ? '新建任务' : '新增子任务') : (m === 'agent' ? '一句话创建' : '手动创建');
  const agentTrigger = document.getElementById('cv-nt-agent-trigger');
  const manualTrigger = document.getElementById('cv-nt-manual-trigger');
  if (agentTrigger) agentTrigger.classList.toggle('hidden', m === 'agent' || !!ntParentTaskId);
  if (manualTrigger) manualTrigger.classList.toggle('hidden', m !== 'agent' || !!ntParentTaskId);
  if (agentTrigger) agentTrigger.setAttribute('aria-pressed', String(m === 'agent'));
  if (manualTrigger) manualTrigger.setAttribute('aria-pressed', String(m === 'manual'));
  document.getElementById('cv-nt-submit').disabled = m === 'agent' && !ntDraftReady;
  document.getElementById('cv-nt-continue').disabled = m === 'agent' && !ntDraftReady;
  if (document.getElementById('cv-newtask-overlay').style.display !== 'none') {
    document.getElementById(m === 'agent' ? 'cv-nt-prompt' : 'cv-nt-title').focus();
  }
}
function cvSubmitNewTask(keepOpen) {
  const fromAgent = ntMode === 'agent';
  let title, desc, assignee, priority, projectId, team, stagePlan, mode;
  if (fromAgent) {
    if (!ntDraftReady) { window.alert('请先输入一句话描述任务'); return; }
    if (document.getElementById('cv-nt-prompt').value.trim()) { ntSendDraftMessage(); return; }
    title = (document.getElementById('cv-nt-draft-title').value || '').trim();
    desc = (document.getElementById('cv-nt-draft-desc').value || '').trim();
  } else {
    title = (document.getElementById('cv-nt-title').value || '').trim();
    desc = (document.getElementById('cv-nt-desc').value || '').trim();
  }
  if (!ntProjectId) { window.alert('请先关联一个项目'); return; }
  if (!title) { window.alert('请输入任务标题'); return; }
  projectId = ntProjectId;
  team = TEAMS.find(t => t.id === ntTeamId) || TEAMS[0];
  const pv = document.getElementById('cv-nt-priority').value;
  priority = pv === '无优先级' ? '中' : pv;
  mode = ntExecMode;
  if (!['单人执行', '多人协作'].includes(mode)) { window.alert('请选择执行方式'); return; }
  if (!ntPeopleOfProject(projectId).length) { window.alert('请先为项目添加成员，再选择执行人'); return; }
  if (mode === '多人协作') {
    const checked = ntStagePlan.filter(s => s.checked);
    if (!checked.length) { window.alert('请至少选择一个阶段'); return; }
    if (checked.some(s => !s.assignee)) { window.alert('请为每个已选阶段指定执行人'); return; }
    stagePlan = checked.map(s => ({ id: s.id, name: s.name, assignee: s.assignee }));
    assignee = stagePlan[0].assignee;
  } else {
    if (!ntAssignee) { window.alert('请选择任务负责人'); return; }
    assignee = ntAssignee;
  }
  if (!stagePlan) stagePlan = tbTeamStages(team).map(s => ({ id: s.id, name: s.name, assignee }));
  const proj = CV_PROJECTS.find(p => p.id === projectId) || CV_PROJECTS[0];
  const stageActivity = stagePlan ? ('各阶段执行人：' + stagePlan.map(s => s.name + '·' + s.assignee).join('、')) : null;
  const parentTaskId = ntParentTaskId || document.getElementById('cv-nt-group')?.value || undefined;
  const parentIsGroup = !!parentTaskId && CV_TASKS.some(t => t.boardId === parentTaskId && t.project === proj.id && t.kind === 'epic');
  const t = { boardId: crypto.randomUUID(), kind: 'task', parentTaskId, source: fromAgent ? '一句话创建' : (parentTaskId ? (parentIsGroup ? '父任务下创建' : '父任务下推') : '手动创建'), sourceId: 'TASK-' + Date.now().toString().slice(-6), size: '小', exec: '专家团', collab: mode === '单人执行' ? '无需协作' : '人Agent协作', progress: 0, status: ntStatus, mode, stage: stagePlan ? stagePlan[0].id : undefined, stagePlan, type: '需求', project: proj.id, title, desc, assignee, priority, tags: ntTags.slice(), files: ntFiles.slice(), activity: [{ author: '张工', text: fromAgent ? ('根据草稿创建任务，由 ' + assignee + ' 负责') : '创建了任务', time: new Date().toLocaleString('zh-CN', { hour12: false }) }].concat(stageActivity ? [{ author: '张工', text: stageActivity, time: new Date().toLocaleString('zh-CN', { hour12: false }) }] : []), artifacts: [] };
  CV_TASKS.unshift(t);
  tbSave(); renderTaskBoard(); cvUpdateCounts();
  if (parentTaskId) window.cvRenderProjectDetail && window.cvRenderProjectDetail();
  const reopenCtx = ntParentTaskId
    ? { parentTaskId: ntParentTaskId, projectId: proj.id, parentTitle: document.getElementById('cv-nt-parent-title')?.textContent }
    : { projectId: proj.id, groupId: parentIsGroup ? parentTaskId : '' };
  if (keepOpen) {
    cvOpenNewTask(ntStatus, reopenCtx);
    if (fromAgent) cvSetNewTaskMode('agent');
  } else { cvCloseNewTask(); }
  if (parentTaskId && !parentIsGroup && !keepOpen && window.tbReopenTask) window.tbReopenTask(parentTaskId);
}

export function initNewTask() {
  window.cvOpenNewTask = cvOpenNewTask;
  window.cvCloseNewTask = cvCloseNewTask;
  if (!document.getElementById('cv-newtask-overlay')) return;
  document.querySelectorAll('#cv-newtask-overlay [data-nt-mode]').forEach(button => {
    button.addEventListener('click', () => cvSetNewTaskMode(button.getAttribute('data-nt-mode')));
  });
  document.getElementById('cv-nt-draft-send').addEventListener('click', ntSendDraftMessage);
  document.getElementById('cv-nt-prompt').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ntSendDraftMessage(); }
  });
  document.getElementById('cv-nt-submit').addEventListener('click', () => cvSubmitNewTask(false));
  document.getElementById('cv-nt-continue').addEventListener('click', () => cvSubmitNewTask(true));
  document.getElementById('cv-nt-project').addEventListener('change', ntOnProjectChange);
  const execMode = document.getElementById('cv-nt-exec-mode');
  if (execMode) execMode.addEventListener('click', e => {
    const b = e.target.closest('[data-nt-exec]');
    if (b) ntSetExecMode(b.getAttribute('data-nt-exec'));
  });
  if (execMode) execMode.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
    const options = Array.from(execMode.querySelectorAll('[data-nt-exec]'));
    const current = options.indexOf(document.activeElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : (current + (['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : options.length - 1)) % options.length;
    e.preventDefault();
    options[next].focus();
    ntSetExecMode(options[next].getAttribute('data-nt-exec'));
  });
  const stageList = document.getElementById('cv-nt-stage-list');
  if (stageList) {
    stageList.addEventListener('click', e => {
      const btn = e.target.closest('[data-nt-stage-toggle]');
      if (btn) { const sp = ntStagePlan.find(s => s.id === btn.getAttribute('data-nt-stage-toggle')); if (sp) sp.checked = !sp.checked; ntRenderStages(); }
    });
    stageList.addEventListener('change', e => {
      const sel = e.target.closest('[data-nt-stage-assignee]');
      if (sel) { const sp = ntStagePlan.find(s => s.id === sel.getAttribute('data-nt-stage-assignee')); if (sp) sp.assignee = sel.value; }
    });
  }
  const attachDrop = document.getElementById('cv-nt-file-list');
  if (attachDrop) {
    attachDrop.addEventListener('click', e => { if (e.target.closest('[data-nt-attach-trigger]')) ntAddFile(); });
    attachDrop.addEventListener('dragover', e => { e.preventDefault(); attachDrop.classList.add('is-dragover'); });
    attachDrop.addEventListener('dragleave', () => attachDrop.classList.remove('is-dragover'));
    attachDrop.addEventListener('drop', e => {
      e.preventDefault(); attachDrop.classList.remove('is-dragover');
      Array.from(e.dataTransfer?.files || []).forEach(f => ntFiles.push(f.name));
      ntRenderFiles();
    });
  }
  const addtag = document.getElementById('cv-nt-addtag');
  if (addtag) addtag.addEventListener('click', ntStartAddTag);
  document.getElementById('cv-nt-tags-trigger')?.addEventListener('click', () => {
    document.getElementById('cv-nt-more').open = true;
    ntStartAddTag();
  });
  document.getElementById('cv-nt-attach-trigger')?.addEventListener('click', ntAddFile);
  const tagList = document.getElementById('cv-nt-tag-list');
  if (tagList) tagList.addEventListener('click', e => {
    const x = e.target.closest('[data-nt-tag-x]');
    if (x) { ntTags.splice(+x.getAttribute('data-nt-tag-x'), 1); ntRenderTagList(); }
  });
  const people = document.getElementById('cv-nt-people');
  if (people) people.addEventListener('change', () => { ntAssignee = people.value; });
  const fileList = document.getElementById('cv-nt-file-list');
  if (fileList) fileList.addEventListener('click', e => { const x = e.target.closest('[data-nt-file]'); if (x) { ntFiles.splice(+x.getAttribute('data-nt-file'), 1); ntRenderFiles(); } });
}
