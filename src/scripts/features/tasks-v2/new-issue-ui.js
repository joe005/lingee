import stageTrashIcon from '../../../assets/figma/task-dialog/trash.svg';
import { showTaskConfirm } from './confirm.js';
import { initSelectDropdowns, niuSelectCaret } from '../../core/select-dropdown.js';
/* 新版任务界面原型。复用当前任务数据；执行计划只在当前页面会话中保存。 */
import { escapeHtml } from './ui-utils.js';
import { TK_STATUSES, tkAddTask, tkCurrentUserId, tkGetTasks, tkPeopleInProject, tkProjectsForCurrentUser, tkUpdateTask, tkProjectById } from './data.js';
import { CV_MEMBERS, CV_PROJECTS } from '../collab/data.js';
import { defaultStageAssigneeId } from './stage-owner.js';
import { tbTeamStages } from '../collab/tb-core.js';
import { TEAMS } from '../expert/store.js';
import { TEAM_STAGE_SCENARIOS } from '../expert/data.js';
import { toast } from '../../core/toast.js';
import { startTaskCreationChat } from '../composer.js';
import { startTaskStage } from './task-execution.js';

let renderTasks = () => {};
let refreshTaskDetail = () => {};
let currentTaskId = null;
let editingTaskId = null;
let copiedTaskFields = null;
let initialPlanSnapshot = '[]';
let initialCreateSnapshot = '';
function createSnapshot() {
  return JSON.stringify({
    fields: ['niuTitle','niuDescription','niuProject','niuType','niuPriority','niuSmartProject','niuSmartPrompt'].map(id => byId(id)?.value || ''),
    owner: selectedOwnerId, stages: draftStages,
  });
}
function requestCloseOverlays() {
  if (!byId('tkConfirmOverlay').hidden) return;
  if (!byId('niuCreateOverlay').hidden && !editingTaskId && createSnapshot() !== initialCreateSnapshot) {
    showTaskConfirm('关闭后，未保存的内容将丢失。', closeOverlays, '放弃更改？', '放弃更改', 'danger', '继续编辑');
    return;
  }
  closeOverlays();
}
let draftStages = [];
let draftConfirmed = false;
let selectedOwnerId = '';
let selectedProjectId = '';
let personPopupTarget = '';
let personPopupStageId = '';
let activePlanScope = 'existing';
const byId = id => document.getElementById(id);
const currentTask = () => activePlanScope === 'create'
  ? { project: byId('niuProject').value, assignee: selectedOwnerId, title: byId('niuTitle').value, desc: byId('niuDescription').value, issueType: byId('niuType').value, teamId: byId('niuTeam').value }
  : tkGetTasks().find(task => task.id === currentTaskId);
const projectName = id => tkProjectsForCurrentUser().find(project => project.id === id)?.name || '项目';
const personName = (projectId, id, fallback = '待分配') => tkPeopleInProject(projectId).find(person => person.id === id)?.name || fallback;
const hasTaskStarted = task => !['planned', 'backlog'].includes(task.status)
  || !['planned', 'backlog'].includes(task.initialStatus || task.status)
  || (task.statusHistory || []).some(change => !['planned', 'backlog'].includes(change.from) || !['planned', 'backlog'].includes(change.to));
const planLocked = () => {
  const taskId = activePlanScope === 'create' ? editingTaskId : currentTaskId;
  const task = tkGetTasks().find(item => item.id === taskId);
  return !!task && hasTaskStarted(task);
};

function closeOverlays() {
  closePersonPopup();
  closeProjectPopup();
  byId('niuCreateOverlay').hidden = true;
  byId('niuPlanOverlay').hidden = true;
}

function closePersonPopup() {
  byId('niuPersonPopup').hidden = true;
  document.querySelectorAll('[data-niu-owner-stage]').forEach(button => button.setAttribute('aria-expanded', 'false'));
  personPopupTarget = '';
  personPopupStageId = '';
}

function closeProjectPopup() {
  byId('niuProjectPopup').hidden = true;
  byId('niuProjectTrigger').setAttribute('aria-expanded', 'false');
}

function renderProjectOptions() {
  const query = byId('niuProjectSearch').value.trim().toLocaleLowerCase();
  const projects = tkProjectsForCurrentUser().filter(project => project.name.toLocaleLowerCase().includes(query));
  byId('niuProjectOptions').innerHTML = projects.length ? projects.map(project => '<button type="button" role="option" aria-selected="' + (project.id === selectedProjectId) + '" data-niu-project="' + escapeHtml(project.id) + '"><span>' + escapeHtml(project.name) + '</span><b>' + (project.id === selectedProjectId ? '✓' : '') + '</b></button>').join('') : '<p>没有匹配的项目</p>';
}

function openProjectPopup() {
  byId('niuProjectSearch').value = '';
  renderProjectOptions();
  const popup = byId('niuProjectPopup');
  const trigger = byId('niuProjectTrigger');
  trigger.setAttribute('aria-expanded', 'true');
  popup.hidden = false;
  popup.scrollTop = 0;
  byId('niuPersonOptions').scrollTop = 0;
  const rect = trigger.getBoundingClientRect();
  const ph = popup.offsetHeight;
  const goDown = rect.bottom + ph + 8 <= window.innerHeight;
  popup.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 260)) + 'px';
  if (goDown) {
    popup.style.top = (rect.bottom + 4) + 'px';
    popup.style.bottom = 'auto';
  } else {
    popup.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
    popup.style.top = 'auto';
  }
  byId('niuProjectSearch').focus();
}

function selectProject(projectId) {
  if (projectId === selectedProjectId) {
    byId('niuSmartProject').value = projectId;
    closeProjectPopup();
    return;
  }
  if (planLocked() && draftStages.some(stage => !tkPeopleInProject(projectId).some(person => person.id === stage.assigneeId))) {
    const task = tkGetTasks().find(item => item.id === editingTaskId);
    if (task) projectId = task.project;
    toast('执行计划已锁定，阶段执行人不属于新项目', 'warning');
  }
  selectedProjectId = projectId;
  byId('niuProject').value = projectId;
  refreshTaskInfoErrors();
  byId('niuProjectTrigger').classList.toggle('is-placeholder', !projectId);
  byId('niuProjectName').textContent = projectId ? projectName(projectId) : '';
  byId('niuSmartProject').value = projectId;
  setDefaultStageOwner(projectId);
  if (!planLocked()) {
    draftStages = defaultPlanStages(projectId);
    draftConfirmed = false;
    byId('niuCreateStageCount').textContent = String(draftStages.length);
  }
  closePersonPopup();
  closeProjectPopup();
  if (projectId) { try { localStorage.setItem('lingee_task_last_project', projectId); } catch(e) {} }
}

function renderPersonOptions() {
  const projectId = currentTask()?.project;
  const chosen = draftStages.find(stage => stage.id === personPopupStageId)?.assigneeId;
  const query = byId('niuPersonSearch').value.trim().toLocaleLowerCase();
  const people = tkPeopleInProject(projectId).filter(person => person.name.toLocaleLowerCase().includes(query));
  byId('niuPersonOptions').innerHTML = people.length ? people.map(person => '<button type="button" role="option" aria-selected="' + (person.id === chosen) + '" data-niu-person="' + escapeHtml(person.id) + '"><span class="niu-person-avatar">' + escapeHtml(person.name.slice(0, 1)) + '</span><span>' + escapeHtml(person.name) + '</span><b>' + (person.id === chosen ? '✓' : '') + '</b></button>').join('') : '<p>没有匹配的项目成员</p>';
}

function openPersonPopup(target, stageId) {
  if (target === 'stage' && planLocked()) return;
  const projectId = currentTask()?.project;
  if (!projectId) { toast('请先选择项目', 'warning'); byId('niuProject').focus(); return; }
  personPopupTarget = target;
  personPopupStageId = stageId || '';
  const list = byId(activePlanScope === 'create' ? 'niuCreateStageList' : 'niuStageList');
  const trigger = list.querySelector('[data-niu-owner-stage="' + CSS.escape(stageId) + '"]');
  if (!trigger) return;
  const popup = byId('niuPersonPopup');
  byId('niuPersonSearch').value = '';
  renderPersonOptions();
  popup.hidden = false;
  popup.scrollTop = 0;
  byId('niuPersonOptions').scrollTop = 0;
  const rect = trigger.getBoundingClientRect();
  const ph = popup.offsetHeight;
  const goDown = rect.bottom + ph + 8 <= window.innerHeight;
  popup.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - popup.offsetWidth - 8)) + 'px';
  popup.style.top = Math.max(8, Math.min(goDown ? rect.bottom + 4 : rect.top - ph - 4, window.innerHeight - ph - 8)) + 'px';
  popup.style.bottom = 'auto';
  trigger.setAttribute('aria-expanded', 'true');
  byId('niuPersonSearch').focus({preventScroll:true});
}

/* 执行计划阶段的默认负责人：当前用户属于项目成员时用本人。 */
function setDefaultStageOwner(projectId) {
  const people = tkPeopleInProject(projectId);
  const creatorId = tkCurrentUserId();
  selectedOwnerId = people.some(person => person.id === creatorId) ? creatorId : '';
}

/* 执行计划的执行阶段选项：任务所选智能体团队的每个交付阶段一项，逐个预置、不重复；项目不绑定团队，没选团队时没有阶段可选。 */
const taskTeamOf = task => TEAMS.find(item => item.id === task?.teamId) || null;
const planStageOptions = projectId => { const task = currentTask(); const team = taskTeamOf(task); return team ? tbTeamStages(team, task).map(stage => ({ name: stage.name, desc: stage.desc || '' })) : []; };

/* 默认执行计划：按项目成员角色预选每个阶段的执行人；同角色多人先选第一人。 */
function defaultPlanStages(projectId) {
  const project = tkProjectById(projectId);
  const people = tkPeopleInProject(projectId);
  return planStageOptions(projectId).map(stage => ({
    id: crypto.randomUUID(), workType: stage.name, title: stage.name, description: stage.desc,
    assigneeId: defaultStageAssigneeId(project, people, CV_MEMBERS, stage.name),
    status: 'pending',
  }));
}

function setWizardStep(step) {
  const plan = step === 'plan';
  byId('niuInfoPane').hidden = plan;
  byId('niuCreatePlanPane').hidden = !plan;
  byId('niuCreateMode').hidden = plan || editingTaskId !== null;
  byId('niuWizardBack').hidden = !plan;
  byId('niuWizardNext').hidden = plan;
  byId('niuCreateSubmit').hidden = !plan;
  /* 新建时「保存任务」是次要按钮、「保存并启动」是主按钮；编辑已有任务只有「保存修改」 */
  const creating = editingTaskId === null;
  byId('niuCreateStart').hidden = !plan || !creating;
  byId('niuCreateSubmit').classList.toggle('niu-button-primary', !creating);
  byId('niuCreateSubmit').textContent = creating ? '保存任务' : '保存';
  byId('niuCreateOverlay').querySelectorAll('[data-niu-wizard-step]').forEach(item => {
    if (item.dataset.niuWizardStep === step) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
    item.toggleAttribute('data-complete', plan && item.dataset.niuWizardStep === 'info');
  });
  byId('niuCreateScroll').scrollTop = 0;
  if (plan) renderPlan();
}

function renderSmartProjectOptions() {
  const projects = tkProjectsForCurrentUser();
  byId('niuSmartProject').innerHTML = '<option value="">请选择所属项目</option>' + projects.map(project => '<option value="' + escapeHtml(project.id) + '">' + escapeHtml(project.name) + '</option>').join('');
  byId('niuSmartProject').value = projects.some(project => project.id === selectedProjectId) ? selectedProjectId : '';
}

function setCreateMode(mode) {
  const smart = mode === 'smart';
  if(smart){closeOverlays();startTaskCreationChat(selectedProjectId||'');return;}
  closeProjectPopup();
  closePersonPopup();
  byId('niuSmartPane').hidden = !smart;
  byId('niuWizardProgress').hidden = smart;
  byId('niuManualFooter').hidden = smart;
  byId('niuSmartFooter').hidden = !smart;
  byId('niuCreateMode').hidden = smart || editingTaskId !== null;
  byId('niuSmartBackHead').hidden = !smart;
  if (!smart) {
    byId('niuCreateHeading').textContent = editingTaskId === null ? '新建任务' : '编辑任务';
    setWizardStep('info');
    byId('niuTitle').focus();
    return;
  }
  byId('niuInfoPane').hidden = true;
  byId('niuCreatePlanPane').hidden = true;
  byId('niuCreateHeading').innerHTML = '智能创建任务 <span class="niu-smart-star">✦</span>';
  renderSmartProjectOptions();
  byId('niuCreateScroll').scrollTop = 0;
  byId(selectedProjectId ? 'niuSmartPrompt' : 'niuSmartProject').focus();
}

function submitSmartCreate() {
  const projectId = byId('niuSmartProject').value;
  const prompt = byId('niuSmartPrompt').value.trim();
  if (!tkProjectsForCurrentUser().some(project => project.id === projectId)) { toast('请选择所属项目', 'warning'); byId('niuSmartProject').focus(); return; }
  if (!prompt) { toast('请输入任务描述', 'warning'); byId('niuSmartPrompt').focus(); return; }
  selectProject(projectId);
  closeOverlays();
  startTaskCreationChat(projectId, prompt);
}

function renderOwner(projectId) {
  const name = selectedOwnerId ? personName(projectId, selectedOwnerId) : '选择负责人';
  byId('niuOwnerName').textContent = name;
  byId('niuOwnerAvatar').textContent = selectedOwnerId ? name.slice(0, 1) : '人';
}

/* 团队下拉：全部智能体团队，选完团队才加载执行阶段；项目不绑定团队，每个任务自己选 */
/* 任务类型读自智能体团队的开发流程（功能开发 / 缺陷修复）：没选团队时不可选，选了团队才加载，默认功能开发；
   功能开发存为任务类型「需求」、缺陷修复存为「缺陷」，阶段按此取路径 */
function syncFlowOptions(issueType) {
  const select = byId('niuType');
  if (!byId('niuTeam').value) {
    select.innerHTML = '<option value="">请先选择智能体团队</option>';
    select.disabled = true;
    return;
  }
  select.innerHTML = TEAM_STAGE_SCENARIOS.map(item => '<option value="' + (item.id === 'bug' ? '缺陷' : '需求') + '">' + escapeHtml(item.name) + '</option>').join('');
  select.value = issueType === '缺陷' ? '缺陷' : '需求';
  select.disabled = false;
}
function fillTeamOptions(selectedId, issueType) {
  const select = byId('niuTeam');
  select.innerHTML = '<option value=""></option>' + TEAMS.map(team => '<option value="' + escapeHtml(team.id) + '">' + escapeHtml(team.name) + '</option>').join('');
  select.value = TEAMS.some(team => team.id === selectedId) ? selectedId : '';
  select.disabled = false;
  syncFlowOptions(issueType);
}

export function openNewIssueCreate(projectId) {
  const projects = tkProjectsForCurrentUser();
  if (!projects.length) { toast('请先加入项目再创建任务', 'warning'); return; }
  closeOverlays();
  activePlanScope = 'create';
  currentTaskId = null;
  editingTaskId = null;
  copiedTaskFields = null;
  initialPlanSnapshot = '[]';
  draftStages = [];
  draftConfirmed = false;
  byId('niuCreateStageCount').textContent = '0';
  var lastProjectId = projectId || '';
  if (!lastProjectId) { try { lastProjectId = localStorage.getItem('lingee_task_last_project') || ''; } catch(e) {} }
  selectedProjectId = projects.some(project => project.id === lastProjectId) ? lastProjectId : '';
  byId('niuProject').value = selectedProjectId;
  byId('niuProjectTrigger').classList.toggle('is-placeholder', !selectedProjectId);
  byId('niuProjectName').textContent = selectedProjectId ? projectName(selectedProjectId) : '';
  byId('niuTitle').value = '';
  byId('niuDescription').value = '';
  byId('niuPriority').value = 'medium';
  fillTeamOptions('');
  setDefaultStageOwner(selectedProjectId);
  draftStages = selectedProjectId ? defaultPlanStages(selectedProjectId) : [];
  initialPlanSnapshot = JSON.stringify(draftStages);
  byId('niuCreateStageCount').textContent = String(draftStages.length);
  byId('niuCreateSubmit').textContent = '保存';
  byId('niuSmartPrompt').value = '';
  renderSmartProjectOptions();
  byId('niuCreateOverlay').hidden = false;
  clearTaskInfoErrors();
  setCreateMode('manual');
  renderPlan();
  byId('niuCreateScroll').scrollTop = 0;
  initialCreateSnapshot = createSnapshot();
}

export function openNewIssueCopy(taskId) {
  const source = tkGetTasks().find(task => task.id === Number(taskId));
  if (!source) { toast('未找到任务', 'warning'); return; }
  openNewIssueCreate(source.project);
  if (byId('niuCreateOverlay').hidden) return;
  byId('niuTitle').value = source.title || '';
  byId('niuDescription').value = source.desc || '';
  byId('niuPriority').value = source.priority || 'medium';
  fillTeamOptions(source.teamId, source.issueType);
  if (tkPeopleInProject(source.project).some(person => person.id === source.assignee)) selectedOwnerId = source.assignee;
  copiedTaskFields = { labels: [...(source.labels || [])], dueDate: source.dueDate || '', module: source.module || '' };
  draftStages = (source.executionPlan || defaultPlanStages(source.project, selectedOwnerId)).map(stage => ({
    ...stage, id: crypto.randomUUID(), status: 'pending', assigneeId: tkPeopleInProject(source.project).some(person => person.id === stage.assigneeId) ? stage.assigneeId : selectedOwnerId,
  }));
  byId('niuCreateStageCount').textContent = String(draftStages.length);
  byId('niuTitle').focus();
}

export function openNewIssueEdit(taskId) {
  const task = tkGetTasks().find(item => item.id === Number(taskId));
  if (!task) { toast('未找到任务', 'warning'); return; }
  const projects = tkProjectsForCurrentUser();
  if (!projects.some(project => project.id === task.project)) { toast('未加入该项目，无法编辑任务', 'warning'); return; }
  closeOverlays();
  activePlanScope = 'create';
  currentTaskId = task.id;
  editingTaskId = task.id;
  draftStages = (task.executionPlan || []).map(stage => ({ ...stage }));
  initialPlanSnapshot = JSON.stringify(draftStages);
  draftConfirmed = task.planStatus === 'confirmed';
  selectedProjectId = task.project;
  byId('niuProject').value = task.project;
  byId('niuProjectTrigger').classList.remove('is-placeholder');
  byId('niuProjectName').textContent = projectName(task.project);
  byId('niuTitle').value = task.title || '';
  byId('niuDescription').value = task.desc || '';
  byId('niuPriority').value = task.priority || 'medium';
  fillTeamOptions(task.teamId, task.issueType);
  byId('niuTeam').disabled = planLocked(); /* 任务启动后团队与执行计划一并锁定 */
  selectedOwnerId = task.assignee || '';
  byId('niuCreateSubmit').textContent = '保存修改';
  byId('niuCreateStageCount').textContent = String(draftStages.length);
  byId('niuCreateOverlay').hidden = false;
  setCreateMode('manual');
  renderPlan();
  byId('niuCreateScroll').scrollTop = 0;
}

function selectCreateTab(tab) {
  setWizardStep(tab);
}

function taskInfoValidationFields() {
  return [
    {input:byId('niuTitle'), control:byId('niuTitle'), valid:!!byId('niuTitle').value.trim()},
    {input:byId('niuDescription'), control:byId('niuDescription'), valid:!!byId('niuDescription').value.trim()},
    {input:byId('niuProject'), control:byId('niuProjectTrigger'), valid:tkProjectsForCurrentUser().some(item => item.id === byId('niuProject').value)},
    {input:byId('niuTeam'), control:byId('niuTeam').nextElementSibling, valid:!!byId('niuTeam').value},
    {input:byId('niuType'), control:byId('niuType').nextElementSibling, valid:!!byId('niuType').value},
  ];
}
function clearTaskInfoErrors() {
  taskInfoValidationFields().forEach(field => { field.control.classList.remove('niu-invalid'); field.control.removeAttribute('aria-invalid'); });
}
function refreshTaskInfoErrors() {
  taskInfoValidationFields().forEach(field => {
    if (field.valid) { field.control.classList.remove('niu-invalid'); field.control.removeAttribute('aria-invalid'); }
  });
}
function validateTaskInfo() {
  const fields = taskInfoValidationFields();
  fields.forEach(field => {
    field.control.classList.toggle('niu-invalid', !field.valid);
    field.control.setAttribute('aria-invalid', String(!field.valid));
  });
  const missing = fields.find(field => !field.valid);
  if (missing) {
    selectCreateTab('info');
    missing.control.focus();
    toast('请填写标红的必填项', 'warning');
    return false;
  }
  return true;
}

function createTask(startNow) {
  if (!validateTaskInfo()) return;
  const title = byId('niuTitle').value.trim();
  const description = byId('niuDescription').value.trim();
  const project = byId('niuProject').value;
  const issueType = byId('niuType').value;
  const teamId = byId('niuTeam').value;
  const owner = selectedOwnerId;
  if (!planLocked() && !draftStages.length) { toast('请至少添加一个执行阶段', 'warning'); selectCreateTab('plan'); byId('niuCreateAdd').focus(); return; }
  const originalProject = editingTaskId === null ? null : tkGetTasks().find(item => item.id === editingTaskId)?.project;
  const unassignedStage = (!planLocked() || project !== originalProject) && draftStages.find(stage => !tkPeopleInProject(project).some(person => person.id === stage.assigneeId));
  if (unassignedStage) { toast('请为节点选择当前项目的执行人', 'warning'); selectCreateTab('plan'); byId('niuCreateStageList').querySelector('[data-niu-owner-stage="' + CSS.escape(unassignedStage.id) + '"]')?.focus(); return; }
  if (editingTaskId !== null) {
    const task = tkGetTasks().find(item => item.id === editingTaskId);
    if (!task) { toast('未找到任务', 'warning'); closeOverlays(); return; }
    const patch = { title, desc: description, issueType,
      priority: byId('niuPriority').value, assignee: owner, project, teamId };
    if (!planLocked() && JSON.stringify(draftStages) !== initialPlanSnapshot) {
      patch.executionPlan = draftStages.map(stage => ({ ...stage }));
      patch.planStatus = 'draft';
    }
    tkUpdateTask(task.id, patch);
    renderTasks();
    refreshTaskDetail(task.id);
    closeOverlays();
    toast('任务已保存', 'success');
    return;
  }
  const created = tkAddTask({
    title, desc: description, issueType,
    status: 'backlog', priority: byId('niuPriority').value, dueDate: copiedTaskFields?.dueDate || '',
    assignee: owner, createdBy: tkCurrentUserId(), project, teamId, labels: copiedTaskFields?.labels || [], module: copiedTaskFields?.module || '',
    executionPlan: draftStages.map(stage => ({ ...stage })),
    planStatus: 'draft',
  });
  /* 「保存并启动」：创建人正好是第一阶段处理人时直接进入执行，否则只创建并提示 */
  let autoStarted = false;
  if (startNow && created) {
    const started = startTaskStage(created);
    autoStarted = !!started.ok;
    if (!started.ok) toast(started.message || '任务已创建，但暂时无法自动开始', 'warning');
  }
  renderTasks();
  closeOverlays();
  toast(autoStarted ? '任务已创建并开始执行' : '任务和执行计划草案已创建', 'success');
}

function renderPlan() {
  const task = currentTask();
  if (!task) return;
  const locked = planLocked();
  const disabled = locked ? ' disabled' : '';
  const completed = draftStages.filter(stage => stage.status === 'done').length;
  const banner = '<span class="niu-plan-state"><i></i>' + (draftConfirmed ? '已确认' : '计划草案') + ' · ' + draftStages.length + ' 个阶段</span><span>' + (locked ? '任务已启动，执行计划已锁定' : draftStages.every(stage => stage.assigneeId) ? '✓ 各阶段已分配执行人' : '部分阶段待分配执行人') + '</span>';
  const stageOptions = planStageOptions(task.project);
  const stageList = draftStages.length ? draftStages.map((stage, index) => {
    const options = stageOptions.map(row => '<option value="' + escapeHtml(row.name) + '"' + (row.name === stage.workType ? ' selected' : '') + '>' + escapeHtml(row.name) + '</option>').join('')
      + (stageOptions.some(row => row.name === stage.workType) || !stage.workType ? '' : '<option value="' + escapeHtml(stage.workType) + '" selected>' + escapeHtml(stage.workType) + '</option>');
    const confirmation = stage.requiresConfirmation !== false;
    const owner = '<button type="button" class="niu-stage-owner" data-niu-owner-stage="' + escapeHtml(stage.id) + '" aria-haspopup="listbox" aria-expanded="false" aria-label="选择第 ' + (index + 1) + ' 节点执行人"' + disabled + '>' + escapeHtml(personName(task.project, stage.assigneeId, '')) + niuSelectCaret + '</button>';
    const fields = '<div class="niu-stage-fields"><label><span>执行阶段</span><select data-niu-work-type="' + escapeHtml(stage.id) + '" aria-label="第 ' + (index + 1) + ' 执行阶段"' + disabled + '>' + options + '</select></label><label><span>阶段工作说明</span><input data-niu-description="' + escapeHtml(stage.id) + '" value="' + escapeHtml(stage.description || '') + '" placeholder="填写本节点要完成的工作" aria-label="第 ' + (index + 1) + ' 阶段工作说明"' + disabled + '></label></div>';
    const completion = '<div class="niu-stage-completion"><span class="niu-stage-label">完成方式</span><div class="niu-stage-choice" role="group" aria-label="第 ' + (index + 1) + ' 节点完成方式"><button type="button" data-niu-confirm-mode="' + escapeHtml(stage.id) + '" data-required="false" aria-pressed="' + (!confirmation) + '"' + disabled + '>直接继续</button><button type="button" data-niu-confirm-mode="' + escapeHtml(stage.id) + '" data-required="true" aria-pressed="' + confirmation + '"' + disabled + '>需要确认</button></div>' + owner + '</div>';
    const remove = locked ? '' : '<button type="button" class="niu-stage-remove" data-niu-remove="' + escapeHtml(stage.id) + '" aria-label="移除第 ' + (index + 1) + ' 节点"><img src="' + stageTrashIcon + '" width="16" height="16" alt=""></button>';
    if (activePlanScope === 'create') {
      const aiReview = !confirmation;
      const reviewMode = '<label class="niu-auto-review-switch"><input type="checkbox" data-niu-review-mode="' + escapeHtml(stage.id) + '" aria-label="第 ' + (index + 1) + ' 节点 AI 验收"' + (aiReview ? ' checked' : '') + (locked ? ' disabled' : '') + '><span aria-hidden="true"></span></label>';
      return '<tr class="niu-stage-row" data-niu-stage="' + escapeHtml(stage.id) + '"><td class="niu-stage-index">' + String(index + 1) + '</td><td><span class="niu-stage-name">' + escapeHtml(stage.workType || stage.title) + '</span></td><td class="niu-stage-review-cell">' + reviewMode + '</td><td>' + owner + '</td><td>' + remove + '</td></tr>';
    }
    return '<div class="niu-stage" data-niu-stage="' + escapeHtml(stage.id) + '"><span class="niu-stage-index">' + String(index + 1) + '</span>' + fields + completion + remove + '</div>';
  }).join('') : (activePlanScope === 'create' ? '<tr><td colspan="5" class="niu-plan-empty">' + (taskTeamOf(task) ? '还没有工作阶段。点击「＋ 添加节点」开始。' : '请先在任务信息里选择智能体团队，选完后加载执行阶段。') + '</td></tr>' : '<div class="niu-plan-empty">还没有工作阶段。添加阶段后可直接在分录中编辑。</div>');
  if (activePlanScope === 'create') {
    byId('niuCreateAdd').disabled = locked;
    byId('niuCreateStageCount').textContent = String(draftStages.length);
    byId('niuCreateStageList').innerHTML = stageList;
    initCreateSelects(Array.from(byId('niuCreateStageList').querySelectorAll('select')));
    return;
  }
  byId('niuBreadcrumb').textContent = '项目  /  ' + projectName(task.project) + '  /  ' + task.code;
  byId('niuPlanHeading').textContent = task.title;
  byId('niuPlanCode').textContent = task.code + ' · ' + (task.issueType || '未设置类型') + ' · 当前页面演示数据';
  byId('niuPlanTab').textContent = '执行计划 ' + draftStages.length;
  byId('niuPlanBanner').innerHTML = banner;
  byId('niuPlanConfirm').disabled = !draftStages.length || draftStages.some(stage => !stage.assigneeId);
  byId('niuPlanSave').disabled = locked;
  if (locked) byId('niuPlanConfirm').disabled = true;
  byId('niuAddToggle').disabled = locked;
  byId('niuPlanConfirm').textContent = draftConfirmed ? '已确认计划' : '确认计划';
  byId('niuStageList').innerHTML = stageList;
  initCreateSelects(Array.from(byId('niuStageList').querySelectorAll('select')));
  const teamName = TEAMS.find(team => team.id === task.teamId)?.name || '未设置';
  const statusName = TK_STATUSES.find(status => status.id === task.status)?.name || '待办';
  byId('niuPlanAside').innerHTML = '<dl><div><dt>状态</dt><dd>' + escapeHtml(statusName) + '</dd></div><div><dt>所属项目</dt><dd>' + escapeHtml(projectName(task.project)) + '</dd></div><div><dt>智能体团队</dt><dd>' + escapeHtml(teamName) + '</dd></div><div><dt>任务负责人</dt><dd>' + escapeHtml(personName(task.project, task.assignee)) + '</dd></div><div><dt>计划进度</dt><dd>' + completed + ' / ' + draftStages.length + '</dd></div></dl><div class="niu-progress"><span style="width:' + (draftStages.length ? completed / draftStages.length * 100 : 0) + '%"></span></div><p>工作类型决定每个阶段的职责。计划确认后再开始执行。</p>';
}

export function openNewIssuePlan(taskId) {
  const task = tkGetTasks().find(item => item.id === Number(taskId));
  if (!task) { toast('未找到任务', 'warning'); return; }
  currentTaskId = task.id;
  activePlanScope = 'existing';
  draftStages = (task.executionPlan || []).map(stage => ({ ...stage }));
  draftConfirmed = task.planStatus === 'confirmed';
  closeOverlays();
  byId('niuPlanOverlay').hidden = false;
  renderPlan();
}

function addStage() {
  if (planLocked()) { toast('任务已启动，执行计划已锁定', 'warning'); return; }
  const task = currentTask();
  if (!task?.project) { toast('请先选择所属项目', 'warning'); selectCreateTab('info'); byId('niuProjectTrigger').focus(); return; }
  const used = new Set(draftStages.map(stage => stage.workType));
  const next = planStageOptions(task.project).find(stage => !used.has(stage.name));
  if (!next) { toast('智能体团队的交付阶段已全部加入执行计划', 'warning'); return; }
  draftStages.push({ id: crypto.randomUUID(), workType: next.name, title: next.name, description: next.desc, assigneeId: defaultStageAssigneeId(tkProjectById(task.project), tkPeopleInProject(task.project), CV_MEMBERS, next.name), status: 'pending' });
  draftConfirmed = false;
  renderPlan();
  const list = byId(activePlanScope === 'create' ? 'niuCreateStageList' : 'niuStageList');
  list.querySelector('.niu-stage:last-child select')?.focus();
}

function savePlan(confirm) {
  const task = currentTask();
  if (!task) return;
  if (planLocked()) { toast('任务已启动，执行计划已锁定', 'warning'); return; }
  if (confirm && (!draftStages.length || draftStages.some(stage => !stage.assigneeId))) { toast('请先为每个阶段指定执行人', 'warning'); return; }
  draftConfirmed = !!confirm;
  tkUpdateTask(task.id, { executionPlan: draftStages.map(stage => ({ ...stage })), planStatus: draftConfirmed ? 'confirmed' : 'draft' });
  renderPlan();
  renderTasks();
  toast(confirm ? '执行计划已确认' : '执行计划已保存', 'success');
}

function initCreateSelects(selects = [byId('niuTeam'), byId('niuType'), byId('niuPriority')]) {
  const caret = byId('niuProjectTrigger').querySelector('.niu-person-chevron');
  if (caret) caret.outerHTML = niuSelectCaret;
  initSelectDropdowns(selects, closeProjectPopup);
}

export function initNewIssueUI(renderCallback, detailCallback) {
  initCreateSelects();
  ['niuTitle','niuDescription','niuTeam','niuType'].forEach(id => {
    byId(id).addEventListener('input', refreshTaskInfoErrors);
    byId(id).addEventListener('change', refreshTaskInfoErrors);
  });
  renderTasks = renderCallback;
  refreshTaskDetail = detailCallback;
  byId('niuProjectTrigger').addEventListener('click', openProjectPopup);
  byId('niuProjectSearch').addEventListener('input', renderProjectOptions);
  byId('niuPersonSearch').addEventListener('input', renderPersonOptions);
  byId('niuCreateSubmit').addEventListener('click', () => createTask(false));
  byId('niuCreateStart').addEventListener('click', () => createTask(true));
  byId('niuWizardNext').addEventListener('click', () => {
    if (validateTaskInfo()) { setWizardStep('plan'); byId('niuCreatePlanPane').focus({ preventScroll: true }); }
  });
  byId('niuWizardBack').addEventListener('click', () => { setWizardStep('info'); byId('niuInfoPane').focus({ preventScroll: true }); });
  byId('niuSmartCreate').addEventListener('click', () => setCreateMode('smart'));
  byId('niuSmartBackHead').addEventListener('click', () => setCreateMode('manual'));
  byId('niuSmartSubmit').addEventListener('click', submitSmartCreate);
  byId('niuSmartProject').addEventListener('change', event => selectProject(event.target.value));
  byId('niuTeam').addEventListener('change', () => {
    syncFlowOptions('需求');
    if (activePlanScope !== 'create' || planLocked() || !selectedProjectId) return;
    draftStages = defaultPlanStages(selectedProjectId);
    draftConfirmed = false;
    byId('niuCreateStageCount').textContent = String(draftStages.length);
  });
  byId('niuType').addEventListener('change', () => {
    if (activePlanScope !== 'create' || planLocked() || !selectedProjectId) return;
    draftStages = defaultPlanStages(selectedProjectId);
    draftConfirmed = false;
    byId('niuCreateStageCount').textContent = String(draftStages.length);
  });
  byId('niuSmartPrompt').addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); submitSmartCreate(); }
  });
  byId('niuAddToggle').addEventListener('click', () => addStage());
  byId('niuCreateAdd').addEventListener('click', () => addStage());
  byId('niuPlanSave').addEventListener('click', () => savePlan(false));
  byId('niuPlanConfirm').addEventListener('click', () => savePlan(true));
  document.addEventListener('input', event => {
    const input = event.target.closest('[data-niu-description]');
    if (!input || planLocked()) return;
    const stage = draftStages.find(item => item.id === input.dataset.niuDescription);
    if (stage) { stage.description = input.value; draftConfirmed = false; }
  });
  document.addEventListener('change', event => {
    if (event.target.closest('[data-niu-description]')) { renderPlan(); return; }
    const reviewMode = event.target.closest('[data-niu-review-mode]');
    if (reviewMode) {
      if (planLocked()) return;
      const stage = draftStages.find(item => item.id === reviewMode.dataset.niuReviewMode);
      if (stage) {
        stage.requiresConfirmation = !reviewMode.checked;
        draftConfirmed = false;
        renderPlan();
      }
      return;
    }
    const select = event.target.closest('[data-niu-work-type]');
    if (!select || planLocked()) return;
    const stage = draftStages.find(item => item.id === select.dataset.niuWorkType);
    if (!stage) return;
    if (select.value !== stage.workType && draftStages.some(item => item.id !== stage.id && item.workType === select.value)) {
      toast('「' + select.value + '」阶段已在执行计划中，请选择其他交付阶段', 'warning');
      renderPlan();
      return;
    }
    const stageOptions = planStageOptions(currentTask()?.project);
    const previousDefault = stageOptions.find(row => row.name === stage.workType)?.desc || '';
    const updateDescription = !stage.description || stage.description === previousDefault;
    stage.workType = select.value;
    stage.title = select.value;
    if (updateDescription) stage.description = stageOptions.find(row => row.name === select.value)?.desc || '';
    stage.assigneeId = defaultStageAssigneeId(tkProjectById(currentTask()?.project), tkPeopleInProject(currentTask()?.project), CV_MEMBERS, select.value);
    draftConfirmed = false;
    renderPlan();
  });
  document.addEventListener('click', event => {
    const person = event.target.closest('[data-niu-person]');
    if (person && personPopupTarget) {
      if (planLocked()) { closePersonPopup(); return; }
      const stage = draftStages.find(item => item.id === personPopupStageId);
      if (stage) { stage.assigneeId = person.dataset.niuPerson; draftConfirmed = false; }
      closePersonPopup();
      renderPlan();
      return;
    }
    const owner = event.target.closest('[data-niu-owner-stage]');
    if (owner) { openPersonPopup('stage', owner.dataset.niuOwnerStage); return; }
    const remove = event.target.closest('[data-niu-remove]');
    if (remove) {
      if (planLocked()) return;
      draftStages = draftStages.filter(stage => stage.id !== remove.dataset.niuRemove);
      draftConfirmed = false;
      renderPlan();
      return;
    }
    if (event.target.closest('[data-niu-close]')) requestCloseOverlays();
    const projectOption = event.target.closest('[data-niu-project]');
    if (projectOption) { selectProject(projectOption.dataset.niuProject); return; }
    const plan = event.target.closest('[data-niu-plan]');
    if (plan) openNewIssuePlan(plan.dataset.niuPlan);
    if (personPopupTarget && !event.target.closest('#niuPersonPopup')) closePersonPopup();
    if (!byId('niuProjectPopup').hidden && !event.target.closest('#niuProjectPopup, #niuProjectTrigger')) closeProjectPopup();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !byId('tkConfirmOverlay').hidden) return;
    if (!byId('niuPersonPopup').hidden) closePersonPopup();
    else if (!byId('niuProjectPopup').hidden) closeProjectPopup();
    else if (!byId('niuCreateOverlay').hidden || !byId('niuPlanOverlay').hidden) requestCloseOverlays();
  });
  [byId('niuCreateOverlay'), byId('niuPlanOverlay')].forEach(overlay => overlay.addEventListener('click', event => { if (event.target === overlay) requestCloseOverlays(); }));
}
