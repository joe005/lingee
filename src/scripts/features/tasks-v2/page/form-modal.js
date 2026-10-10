import { toast } from '../../../core/toast.js';
import { renderExpertChips } from '../../expert/chips.js';
import { TEAMS, set_activePick } from '../../expert/store.js';
import { TK_PEOPLE, TK_PRIORITIES, TK_STATUSES, tkCurrentUserId, tkGetTasks, tkPeopleInProject, tkProjectById, tkProjectsForCurrentUser } from '../data.js';
import { openNewIssueCreate } from '../new-issue-ui.js';
import { taskLabelCatalog, taskLabelColor } from './detail-panel.js';
import { pageState } from './page-state.js';
import { els, state } from './state.js';
import { escapeHtml } from './utils.js';
/* 任务页 · 新建 / 编辑任务弹窗与表单填充（拆分自 tasks-v2/index.js，逻辑未改） */
/* ---------- 表单填充 ---------- */
export function fillSelects() {
  function fill(el, arr, valKey, labelKey) {
    if (el) el.innerHTML = arr.map(function (item) { return '<option value="' + item[valKey] + '">' + escapeHtml(item[labelKey]) + '</option>'; }).join('');
  }
  fill(els.tkFormStatus, TK_STATUSES, 'id', 'name');
  fill(els.tkFormPriority, TK_PRIORITIES, 'id', 'name');
  fill(els.tkFormProject, tkProjectsForCurrentUser(), 'id', 'name');
  refreshFormAssignees();
  if (els.tkBulkAssigneeMenu) {
    els.tkBulkAssigneeMenu.innerHTML = TK_PEOPLE.map(function (p) {
      return '<div class="tk-popover-item" data-assignee="' + p.id + '">' + escapeHtml(p.name) + '</div>';
    }).join('');
  }
}
export function refreshFormAssignees(preferredId) {
  closeModalAssigneeMenu();
  var people = tkPeopleInProject(els.tkFormProject.value);
  var currentId = preferredId || els.tkFormAssignee.value;
  els.tkFormAssignee.innerHTML = people.map(function (person) {
    return '<option value="' + escapeHtml(person.id) + '">' + escapeHtml(person.name) + '</option>';
  }).join('');
  els.tkFormAssignee.value = people.some(function (person) { return person.id === currentId; }) ? currentId : (people[0]?.id || '');
  renderModalAssigneeTrigger();
}
pageState.modalAssigneeMenu = null;
export function renderModalAssigneeTrigger() {
  var trigger = document.getElementById('tkMcAssigneeTrigger');
  var person = tkPeopleInProject(els.tkFormProject.value).find(function (item) { return item.id === els.tkFormAssignee.value; });
  if (!trigger) return;
  trigger.querySelector('#tkMcAssigneeName').textContent = person?.name || '负责人';
  var avatar = trigger.querySelector('#tkMcAssigneeAvatar');
  avatar.textContent = person?.avatar || '?';
  avatar.style.background = person?.color || 'var(--fill-2)';
}
export function closeModalAssigneeMenu() {
  pageState.modalAssigneeMenu?.remove();
  pageState.modalAssigneeMenu = null;
  document.getElementById('tkMcAssigneeTrigger')?.setAttribute('aria-expanded', 'false');
}
export function openModalAssigneeMenu() {
  if (pageState.modalAssigneeMenu) { closeModalAssigneeMenu(); return; }
  var trigger = document.getElementById('tkMcAssigneeTrigger');
  var people = tkPeopleInProject(els.tkFormProject.value);
  pageState.modalAssigneeMenu = document.createElement('div');
  pageState.modalAssigneeMenu.className = 'tk-mc-assignee-menu';
  pageState.modalAssigneeMenu.innerHTML = '<input class="tk-mc-assignee-search" type="search" placeholder="搜索处理人" aria-label="搜索处理人" autocomplete="off"><div role="listbox" aria-label="处理人">'
    + people.map(function (person) { var selected = person.id === els.tkFormAssignee.value; return '<button type="button" class="tk-flow-field-menu-item' + (selected ? ' is-selected' : '') + '" role="option" aria-selected="' + selected + '" data-modal-assignee="' + escapeHtml(person.id) + '"><span class="tk-avatar-sm" style="background:' + escapeHtml(person.color || '') + '">' + escapeHtml(person.avatar || '?') + '</span><span>' + escapeHtml(person.name) + '</span><span class="tk-mc-assignee-check" aria-hidden="true">' + (selected ? '✓' : '') + '</span></button>'; }).join('')
    + '</div>';
  document.body.appendChild(pageState.modalAssigneeMenu);
  var rect = trigger.getBoundingClientRect();
  pageState.modalAssigneeMenu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - pageState.modalAssigneeMenu.offsetWidth - 8)) + 'px';
  pageState.modalAssigneeMenu.style.top = rect.bottom + pageState.modalAssigneeMenu.offsetHeight + 4 < window.innerHeight ? rect.bottom + 4 + 'px' : Math.max(8, rect.top - pageState.modalAssigneeMenu.offsetHeight - 4) + 'px';
  trigger.setAttribute('aria-expanded', 'true');
  pageState.modalAssigneeMenu.querySelector('input').focus({preventScroll:true});
}
export function tkRenderMoreMenu() {
  var menu = document.getElementById('tkMcMoreMenu');
  if (!menu) return;
  var fields = [
    {id:'tkFormStatus', label:'状态', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>'},
    {id:'tkFormProject', label:'项目', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18M3 12h18M3 17h18"/></svg>'},
    {id:'tkFormAssignee', label:'负责人', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>'},
    {id:'tkFormDue', label:'截止日期', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'},
  ];
  menu.innerHTML = fields.filter(function(f){ var el=document.getElementById(f.id); return el && (f.id === 'tkFormAssignee' ? document.getElementById('tkMcAssigneeTrigger').hidden : el.hidden); }).map(function(f){
    return '<button type="button" class="tk-mc-more-item" data-field="'+f.id+'"><span>'+f.label+'</span></button>';
  }).join('');
}
pageState.modalLabelSelection = [];
pageState.modalLabelPopover = null;
export function renderModalLabelPicker() {
  var trigger = document.getElementById('tkMcLabelPicker');
  if (!trigger) return;
  els.tkFormLabels.value = pageState.modalLabelSelection.join(',');
  trigger.innerHTML = pageState.modalLabelSelection.map(function (name) {
    return '<span class="tk-drawer-label"><span>' + escapeHtml(name) + '</span><button type="button" class="tk-drawer-label-remove" data-modal-label-remove="' + escapeHtml(name) + '" aria-label="移除标签 ' + escapeHtml(name) + '">×</button></span>';
  }).join('') + '<span class="tk-mc-label-add" aria-hidden="true">' + (pageState.modalLabelSelection.length ? '＋' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3h9l9 9-9 9-9-9z"/><circle cx="8" cy="8" r="1"/></svg>添加标签') + '</span>';
  trigger.setAttribute('aria-expanded', String(!!pageState.modalLabelPopover));
}
export function closeModalLabelPicker() {
  pageState.modalLabelPopover?.remove();
  pageState.modalLabelPopover = null;
  document.getElementById('tkMcLabelPicker')?.setAttribute('aria-expanded', 'false');
}
export function renderModalLabelOptions(query) {
  if (!pageState.modalLabelPopover) return;
  var normalized = query.trim().toLocaleLowerCase();
  var names = taskLabelCatalog().filter(function (name) { return name.toLocaleLowerCase().includes(normalized); });
  pageState.modalLabelPopover.querySelector('.tk-label-picker-options').innerHTML = names.map(function (name) {
    var selected = pageState.modalLabelSelection.includes(name);
    return '<button type="button" class="tk-label-option' + (selected ? ' selected' : '') + '" data-modal-label-option="' + escapeHtml(name) + '" role="option" aria-selected="' + selected + '"><span class="tk-label-color" style="background:' + taskLabelColor(name) + '"></span><span class="tk-label-option-name">' + escapeHtml(name) + '</span><span class="tk-label-check">' + (selected ? '✓' : '') + '</span></button>';
  }).join('') + (normalized && !taskLabelCatalog().some(function (name) { return name.toLocaleLowerCase() === normalized; })
    ? '<button type="button" class="tk-label-option" data-modal-label-create="' + escapeHtml(query.trim()) + '"><span class="tk-label-create-plus">＋</span><span class="tk-label-option-name">创建“' + escapeHtml(query.trim()) + '”</span></button>' : '');
}
export function openModalLabelPicker() {
  if (pageState.modalLabelPopover) { closeModalLabelPicker(); return; }
  var trigger = document.getElementById('tkMcLabelPicker');
  pageState.modalLabelPopover = document.createElement('div');
  pageState.modalLabelPopover.className = 'tk-label-popover tk-mc-label-popover';
  pageState.modalLabelPopover.innerHTML = '<div class="tk-label-search-wrap"><input type="search" class="tk-label-search" placeholder="搜索标签…" aria-label="搜索标签" autocomplete="off"></div><div class="tk-label-picker-options" role="listbox" aria-multiselectable="true"></div>';
  document.body.appendChild(pageState.modalLabelPopover);
  renderModalLabelOptions('');
  var rect = trigger.getBoundingClientRect();
  pageState.modalLabelPopover.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - pageState.modalLabelPopover.offsetWidth - 8)) + 'px';
  pageState.modalLabelPopover.style.top = (rect.bottom + pageState.modalLabelPopover.offsetHeight + 5 < window.innerHeight ? rect.bottom + 5 : Math.max(8, rect.top - pageState.modalLabelPopover.offsetHeight - 5)) + 'px';
  renderModalLabelPicker();
  pageState.modalLabelPopover.querySelector('input').focus({preventScroll:true});
}

/* ---------- 新建/编辑弹窗 ---------- */
export function openTaskModal(taskId, parentId) {
  if (!parentId && !taskId) { openNewIssueCreate(pageState.projectListMode ? pageState.projectListProjectId : ''); return; }
  if (!tkProjectsForCurrentUser().length) { toast('请先加入项目再创建任务', 'warning'); return; }
  fillSelects();
  state.editingTaskId = null;
  state.editingParentId = parentId || null;
  els.tkModalTitle.textContent = parentId ? '新增子任务' : (pageState.projectListMode ? '新建任务 · '+(tkProjectById(pageState.projectListProjectId)?.name||'项目') : '新建任务');
  tkMcSetMode('manual');
  if (els.tkMcAgentPrompt) els.tkMcAgentPrompt.value = '';
  els.tkFormTitle.value = '';
  els.tkFormDesc.value = '';
  els.tkFormStatus.value = 'backlog';
  els.tkFormPriority.value = 'medium';
  els.tkFormProject.insertAdjacentHTML('afterbegin','<option value="">请选择所属项目 *</option>');
  els.tkFormProject.value = pageState.projectListMode ? pageState.projectListProjectId : '';
  set_activePick({kind:'team', id: tkProjectById(els.tkFormProject.value)?.defaultTeam || TEAMS[0]?.id || '', auto:false}); renderExpertChips();
  refreshFormAssignees(tkCurrentUserId());
  els.tkFormDue.value = '';
  ['tkFormStatus','tkFormAssignee','tkFormDue'].forEach(function(fid){ var el=document.getElementById(fid); if(el) el.hidden=true; });
  els.tkFormProject.hidden=false;
  els.tkFormProject.disabled=!!(pageState.projectListMode&&!parentId);
  els.tkFormProject.setAttribute('aria-label','所属项目（必填）');
  els.tkFormProject.required=true;
  document.getElementById('tkMcAssigneeTrigger').hidden = true;
  closeModalAssigneeMenu();
  document.getElementById('tkMcMoreFields')?.classList.remove('open');
  var _mm=document.getElementById('tkMcMoreMenu'); if(_mm) _mm.style.display='none';
  tkRenderMoreMenu();
  els.tkFormLabels.value = '';
  closeModalLabelPicker();
  pageState.modalLabelSelection = [];
  renderModalLabelPicker();
  if (parentId) {
    var parent = tkGetTasks().find(function (x) { return x.id === parentId; });
    if (parent) {
      els.tkFormProject.value = parent.project;
      set_activePick({kind:'team', id: parent.teamId || tkProjectById(parent.project)?.defaultTeam || TEAMS[0]?.id || '', auto:false}); renderExpertChips();
      refreshFormAssignees(parent.assignee);
      els.tkFormPriority.value = parent.priority;
    }
  }
  els.tkModalOverlay.classList.remove('hidden');
  requestAnimationFrame(function () { els.tkModalOverlay.classList.add('show'); });
  setTimeout(function(){ if (els.tkFormTitle) els.tkFormTitle.focus(); }, 50);
}
export function tkMcSetMode(mode) {
  var isAgent = mode === 'agent';
  els.tkMcAgentPanel.classList.toggle('hidden', !isAgent);
  var title = document.getElementById('tkFormTitle');
  var desc = document.getElementById('tkFormDesc');
  if (title) title.classList.toggle('hidden', isAgent);
  if (desc) desc.classList.toggle('hidden', isAgent);
  var btn = els.tkMcAgent;
  if (btn) btn.innerHTML = isAgent
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 4l4 4-4 4"/><path d="M3 8h14"/><path d="M7 20l-4-4 4-4"/><path d="M21 16H7"/></svg>切换到手动'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4l-4 4 4 4"/><path d="M3 8h14"/><path d="M17 20l4-4-4-4"/><path d="M21 16H7"/></svg>切换到智能体';
  if (els.tkModalSave) els.tkModalSave.textContent = isAgent ? '发送' : '保存';
  var toggle = document.querySelector('#tkModalOverlay .tk-mc-toggle');
  if (toggle) toggle.style.display = isAgent ? 'none' : '';
  var attach = document.querySelector('#tkModalOverlay .tk-mc-attach');
  if (attach) attach.style.display = isAgent ? 'none' : '';
  if (isAgent && els.tkMcAgentPrompt) setTimeout(function(){ els.tkMcAgentPrompt.focus(); }, 50);
}
export function tkMcAgentSendMsg() {
  if (!els.tkFormProject.value) { toast('请选择所属项目', 'warning'); els.tkFormProject.focus(); return; }
  var prompt = els.tkMcAgentPrompt.value.trim();
  if (!prompt) { els.tkMcAgentPrompt.focus(); return; }
  els.tkMcAgentPrompt.value = '';
  els.tkModalSave.disabled = true;
  els.tkModalSave.innerHTML = '<span class="tk-mc-agent-sent">✓ 已发送</span>';
  setTimeout(function () {
    els.tkModalSave.disabled = false;
    els.tkModalSave.textContent = '发送';
    els.tkMcAgentPrompt.focus();
    toast('任务已提交，智能体处理结果将通过通知送达', 'success');
  }, 1500);
}
export function closeTaskModal() {
  closeModalLabelPicker();
  closeModalAssigneeMenu();
  els.tkModalOverlay.classList.remove('show');
  els.tkModalOverlay.classList.remove('tk-mc-fullscreen');
  setTimeout(function () { els.tkModalOverlay.classList.add('hidden'); }, 200);
}
