import stageTransferTemplate from '../../../../modals/tasks/stage-transfer.html?raw';
import { initSelectDropdowns } from '../../../core/select-dropdown.js';
import { toast } from '../../../core/toast.js';
import { tkGetTasks } from '../data.js';
import { transferStageName, transferTargets, transferTaskStage } from '../stage-transfer.js';
import { render } from './layout.js';
import { openDrawer } from './subtasks.js';

/* 转交弹窗沿用退回弹窗的样式类（.tk-stage-return-*），只有 id 与数据逻辑独立。 */
export function initStageTransfer() {
  const dialog = document.createElement('dialog');
  dialog.className = 'tk-stage-return tk-stage-transfer';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-labelledby', 'tkStageTransferTitle');
  dialog.innerHTML = stageTransferTemplate;
  document.body.appendChild(dialog);
  let taskId = null, trigger = null;
  const select = dialog.querySelector('select');
  const reason = dialog.querySelector('textarea');
  const error = dialog.querySelector('[role="alert"]');
  const counter = dialog.querySelector('#tkStageTransferCount');
  const notice = dialog.querySelector('#tkStageTransferNotice');
  initSelectDropdowns([select]);
  select.style.display = 'none';
  select.parentElement.classList.add('shared-select-host');
  const selectTrigger = select.nextElementSibling;
  selectTrigger.classList.add('shared-select-trigger');
  select.addEventListener('invalid', event => {
    event.preventDefault();
    error.textContent = '请选择转交对象'; error.hidden = false;
    selectTrigger.focus();
  });
  reason.addEventListener('input', () => { counter.textContent = reason.value.length + '/' + reason.maxLength; });
  dialog.querySelectorAll('[data-transfer-cancel]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => {
    dialog.querySelector('.niu-select-popup').hidden = true;
    selectTrigger.setAttribute('aria-expanded', 'false');
    if (trigger?.isConnected) trigger.focus();
  });
  /* 入口：详情底部按钮 [data-task-stage-transfer]，卡片「···」菜单通过事件进入 */
  function open(id, opener) {
    taskId = Number(id);
    const task = tkGetTasks().find(row => row.id === taskId);
    const people = transferTargets(task);
    if (!people.length) { toast('当前没有可转交的成员，或节点正在执行中', 'warning'); return; }
    trigger = opener || null;
    const stage = transferStageName(task);
    notice.textContent = '转交后由所选成员继续处理' + (stage ? '「' + stage + '」' : '该节点') + '，你将不再处理；产物和操作记录保留。';
    select.replaceChildren(new Option('请选择成员', ''));
    select.options[0].disabled = true;
    people.forEach(person => select.add(new Option(person.name, person.id)));
    select.selectedIndex = 0;
    select.dispatchEvent(new Event('change'));
    reason.value = ''; counter.textContent = '0/' + reason.maxLength; error.hidden = true;
    dialog.showModal(); selectTrigger.focus();
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-task-stage-transfer]');
    if (button) open(button.dataset.taskStageTransfer, button);
  });
  document.addEventListener('lingee:task-transfer', event => open(event.detail.taskId, event.detail.trigger));
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const result = transferTaskStage(taskId, select.value, reason.value);
    if (!result.ok) { error.textContent = result.message; error.hidden = false; return; }
    dialog.close(); render(); openDrawer(taskId);
    toast('已转交给「' + result.targetName + '」', 'success');
  });
}
