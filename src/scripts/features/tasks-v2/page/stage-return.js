import stageReturnTemplate from '../../../../modals/tasks/stage-return.html?raw';
import { initSelectDropdowns } from '../../../core/select-dropdown.js';
import { toast } from '../../../core/toast.js';
import { tkGetTasks } from '../data.js';
import { returnableStages, returnTaskStage } from '../stage-return.js';
import { render } from './layout.js';
import { openDrawer } from './subtasks.js';

export function initStageReturn() {
  const dialog = document.createElement('dialog');
  dialog.className = 'tk-stage-return';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-labelledby', 'tkStageReturnTitle');
  dialog.innerHTML = stageReturnTemplate;
  document.body.appendChild(dialog);
  let taskId = null, trigger = null;
  const select = dialog.querySelector('select');
  const reason = dialog.querySelector('textarea');
  const error = dialog.querySelector('[role="alert"]');
  const counter = dialog.querySelector('#tkStageReturnCount');
  initSelectDropdowns([select]);
  select.style.display = 'none';
  select.parentElement.classList.add('shared-select-host');
  const selectTrigger = select.nextElementSibling;
  selectTrigger.classList.add('shared-select-trigger');
  select.addEventListener('invalid', event => {
    event.preventDefault();
    error.textContent = '请选择退回节点'; error.hidden = false;
    selectTrigger.focus();
  });
  reason.addEventListener('input', () => { counter.textContent = reason.value.length + '/' + reason.maxLength; });
  dialog.querySelectorAll('[data-return-cancel]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => {
    dialog.querySelector('.niu-select-popup').hidden = true;
    selectTrigger.setAttribute('aria-expanded', 'false');
    if (trigger?.isConnected) trigger.focus();
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-task-stage-return]');
    if (!button) return;
    taskId = Number(button.dataset.taskStageReturn);
    const task = tkGetTasks().find(row => row.id === taskId);
    const stages = returnableStages(task);
    if (!stages.length) { toast('当前没有可退回的上游节点', 'warning'); return; }
    trigger = button;
    select.replaceChildren(new Option('请选择节点', ''));
    select.options[0].disabled = true;
    stages.forEach(stage => select.add(new Option(stage.title || stage.workType, stage.id)));
    select.selectedIndex = 0;
    reason.value = ''; counter.textContent = '0/' + reason.maxLength; error.hidden = true;
    dialog.showModal(); select.focus();
  });
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const result = returnTaskStage(taskId, select.value, reason.value);
    if (!result.ok) { error.textContent = result.message; error.hidden = false; return; }
    dialog.close(); render(); openDrawer(taskId);
    toast('已退回所选节点，等待该节点处理人开始', 'success');
  });
}
