import { CV_TASKS, CV_PROJECTS, cvProject } from './data.js';
import { TEAMS } from '../expert/store.js';
import { xesc } from '../expert/data.js';
import { cvUpdateCounts } from './projects.js';
import { tbSave } from './tb-core.js';
import { renderTaskBoard } from './task-board.js';
/* 新建任务弹窗：手动创建 / 通过智能体创建
   从 task-board.js 拆出，副作用集中在 initNewTask()。 */


let ntMode = 'manual';
let ntStatus = '未开始';
let ntFiles = [];

function ntRenderFiles() {
  const el = document.getElementById('cv-nt-file-list');
  if (!el) return;
  el.innerHTML = ntFiles.map((f, i) => '<span class="nt-file"><span class="nt-file-name">' + xesc(f) + '</span><button type="button" class="nt-file-x" data-nt-file="' + i + '">×</button></span>').join('');
}
function ntAddFile() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.multiple = true;
  inp.onchange = () => { Array.from(inp.files || []).forEach(f => ntFiles.push(f.name)); ntRenderFiles(); };
  inp.click();
}
export function cvOpenNewTask(status) {
  ntMode = 'manual';
  ntStatus = status || '未开始';
  const proj = CV_PROJECTS.find(p => p.id === cvProject) || CV_PROJECTS[0];
  document.getElementById('cv-nt-title').value = '';
  document.getElementById('cv-nt-desc').value = '';
  document.getElementById('cv-nt-prompt').value = '';
  document.getElementById('cv-nt-priority').selectedIndex = 0;
  document.getElementById('cv-nt-assignee').innerHTML = TEAMS.map(t => '<option>' + xesc(t.name) + '</option>').join('');
  document.getElementById('cv-nt-creator').innerHTML = TEAMS.map(t => '<option>' + xesc(t.name) + '</option>').join('');
  document.getElementById('cv-nt-hint-agent').textContent = TEAMS[0]?.name || '专家团';
  document.getElementById('cv-nt-proj-name').textContent = proj.name;
  document.getElementById('cv-nt-proj-name2').textContent = proj.name;
  ntFiles = []; ntRenderFiles();
  cvSetNewTaskMode('manual');
  document.getElementById('cv-newtask-overlay').style.display = 'flex';
  setTimeout(() => document.getElementById('cv-nt-title').focus(), 0);
}
export function cvCloseNewTask() { document.getElementById('cv-newtask-overlay').style.display = 'none'; }
function cvSetNewTaskMode(m) {
  ntMode = m;
  document.getElementById('cv-nt-manual').classList.toggle('hidden', m !== 'manual');
  document.getElementById('cv-nt-agent').classList.toggle('hidden', m !== 'agent');
  document.getElementById('cv-nt-mode-label').textContent = m === 'agent' ? '通过智能体创建' : '手动创建';
  document.getElementById('cv-nt-toggle').textContent = m === 'agent' ? '切换到手动创建' : '切换到智能体';
}
function cvToggleNewTaskMode() { cvSetNewTaskMode(ntMode === 'agent' ? 'manual' : 'agent'); }
function cvSubmitNewTask(keepOpen) {
  const proj = CV_PROJECTS.find(p => p.id === cvProject) || CV_PROJECTS[0];
  let title, desc, assignee, priority, fromAgent = ntMode === 'agent';
  if (fromAgent) {
    const prompt = (document.getElementById('cv-nt-prompt').value || '').trim();
    if (!prompt) { window.alert('请描述要让智能体做什么'); return; }
    assignee = document.getElementById('cv-nt-creator').value;
    title = prompt.length > 24 ? prompt.slice(0, 24) + '…' : prompt;
    desc = prompt;
    priority = '中';
  } else {
    title = (document.getElementById('cv-nt-title').value || '').trim();
    if (!title) { window.alert('请输入任务标题'); return; }
    desc = (document.getElementById('cv-nt-desc').value || '').trim();
    assignee = document.getElementById('cv-nt-assignee').value || '待分配';
    const pv = document.getElementById('cv-nt-priority').value;
    priority = pv === '无优先级' ? '中' : pv;
  }
  const t = { boardId: crypto.randomUUID(), source: fromAgent ? '智能体创建' : '手动创建', sourceId: 'TASK-' + Date.now().toString().slice(-6), size: '小', exec: '专家团', collab: '人Agent协作', progress: 0, status: ntStatus, mode: '多人协作', type: '需求', project: proj.id, teamId: TEAMS.find(team => team.name === assignee)?.id || '', title, desc, assignee, priority, files: ntFiles.slice(), activity: [{ author: '张工', text: fromAgent ? ('由 ' + assignee + ' 创建任务') : '创建了任务' }], artifacts: [] };
  CV_TASKS.unshift(t);
  tbSave(); renderTaskBoard(); cvUpdateCounts();
  if (keepOpen) { cvOpenNewTask(ntStatus); } else { cvCloseNewTask(); }
}

export function initNewTask() {
  window.cvOpenNewTask = cvOpenNewTask;
  if (!document.getElementById('cv-newtask-overlay')) return;
  document.getElementById('cv-nt-toggle').addEventListener('click', cvToggleNewTaskMode);
  document.getElementById('cv-nt-submit').addEventListener('click', () => cvSubmitNewTask(false));
  document.getElementById('cv-nt-continue').addEventListener('click', () => cvSubmitNewTask(true));
  const addFile = document.getElementById('cv-nt-addfile');
  if (addFile) addFile.addEventListener('click', ntAddFile);
  const fileList = document.getElementById('cv-nt-file-list');
  if (fileList) fileList.addEventListener('click', e => { const x = e.target.closest('[data-nt-file]'); if (x) { ntFiles.splice(+x.getAttribute('data-nt-file'), 1); ntRenderFiles(); } });
}
