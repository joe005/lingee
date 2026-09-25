/* T00 结构拆分：create。保留原交互；事件在 init* 中按原顺序注册。 */
import { escapeHtml } from './ui-utils.js';
import { els, setTaskViewState, taskViewState } from './ui-state.js';
import { TK_STATUSES, TK_PRIORITIES, tkProjectsForCurrentUser, TK_PEOPLE, tkPeopleInProject, tkCurrentUserId, tkGetTasks, tkUpdateTask, tkAddTask } from './data.js';
import { toast } from '../../core/toast.js';
import { projectListProjectId, render } from './list.js';
import { openDrawer } from './issue-detail.js';

function fillSelects() {
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

function refreshFormAssignees(preferredId) {
  var people = tkPeopleInProject(els.tkFormProject.value);
  var currentId = preferredId || els.tkFormAssignee.value;
  els.tkFormAssignee.innerHTML = people.map(function (person) {
    return '<option value="' + escapeHtml(person.id) + '">' + escapeHtml(person.name) + '</option>';
  }).join('');
  els.tkFormAssignee.value = people.some(function (person) { return person.id === currentId; }) ? currentId : (people[0]?.id || '');
}

function openTaskModal(taskId, parentId) {
  if (!tkProjectsForCurrentUser().length) { toast('请先加入项目再创建任务', 'warning'); return; }
  fillSelects();
  setTaskViewState({ editingTaskId: null });
  setTaskViewState({ editingParentId: parentId || null });
  els.tkModalTitle.textContent = parentId ? '新增子任务' : '新建任务';
  els.tkFormTitle.value = '';
  els.tkFormDesc.value = '';
  els.tkFormStatus.value = 'backlog';
  els.tkFormPriority.value = 'medium';
  els.tkFormProject.value = projectListProjectId || tkProjectsForCurrentUser()[0].id;
  refreshFormAssignees(tkCurrentUserId());
  els.tkFormDue.value = '';
  els.tkFormLabels.value = '';
  if (parentId) {
    var parent = tkGetTasks().find(function (x) { return x.id === parentId; });
    if (parent) {
      els.tkFormProject.value = parent.project;
      refreshFormAssignees(parent.assignee);
      els.tkFormPriority.value = parent.priority;
    }
  }
  els.tkModalOverlay.classList.remove('hidden');
  requestAnimationFrame(function () { els.tkModalOverlay.classList.add('show'); });
}

function closeTaskModal() {
  els.tkModalOverlay.classList.remove('show');
  setTimeout(function () { els.tkModalOverlay.classList.add('hidden'); }, 200);
}

function saveTask() {
  var title = els.tkFormTitle.value.trim();
  if (!title) { els.tkFormTitle.focus(); return; }
  if (!tkProjectsForCurrentUser().some(function (project) { return project.id === els.tkFormProject.value; })) { toast('请先加入项目再创建任务', 'warning'); return; }
  var createdForOpenParent = !taskViewState.editingTaskId && taskViewState.editingParentId && taskViewState.drawerTaskId === taskViewState.editingParentId;
  var labels = els.tkFormLabels.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (!tkPeopleInProject(els.tkFormProject.value).some(function (person) { return person.id === els.tkFormAssignee.value; })) { toast('请选择该项目成员作为处理人', 'warning'); return; }
  var data = {
    title: title, desc: els.tkFormDesc.value.trim(),
    status: els.tkFormStatus.value, priority: els.tkFormPriority.value,
    assignee: els.tkFormAssignee.value, project: els.tkFormProject.value,
    dueDate: els.tkFormDue.value, labels: labels,
  };
  if (taskViewState.editingTaskId) { tkUpdateTask(taskViewState.editingTaskId, data); }
  else {
    data.createDate = '2026-09-23';
    if (taskViewState.editingParentId) {
      data.parentId = taskViewState.editingParentId;
      var parentTask = tkGetTasks().find(function (t) { return t.id === taskViewState.editingParentId; });
      if (parentTask) data.module = parentTask.module;
    }
    tkAddTask(data);
  }
  closeTaskModal();
  render();
  if (createdForOpenParent) openDrawer(taskViewState.drawerTaskId);
}

function initTaskCreateEvents() {
els.tkToolbarNew.addEventListener('click', function () { openTaskModal(null); });
els.tkModalClose.addEventListener('click', closeTaskModal);
els.tkModalCancel.addEventListener('click', closeTaskModal);
els.tkModalSave.addEventListener('click', saveTask);
els.tkFormProject.addEventListener('change', function () { refreshFormAssignees(tkCurrentUserId()); });
els.tkModalOverlay.addEventListener('click', function (e) { if (e.target === this) closeTaskModal(); });
}

export { fillSelects, initTaskCreateEvents, openTaskModal, refreshFormAssignees };
