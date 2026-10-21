import { toast } from '../../../core/toast.js';
import { tkGetTasks } from '../data.js';
import { returnableStages, returnTaskStage } from '../stage-return.js';
import { render } from './layout.js';
import { openDrawer } from './subtasks.js';

export function initStageReturn() {
  const dialog = document.createElement('dialog');
  dialog.className = 'tk-stage-return';
  dialog.setAttribute('aria-labelledby', 'tkStageReturnTitle');
  dialog.innerHTML = '<form><h2 id="tkStageReturnTitle">退回上游节点</h2><p>从所选节点按原流程重新执行，历史产物和记录保留。</p><label for="tkStageReturnTarget">退回节点 <span class="tk-stage-return-required" aria-hidden="true">*</span></label><select id="tkStageReturnTarget" required><option value="">请选择节点</option></select><label for="tkStageReturnReason">退回原因 <span class="tk-stage-return-required" aria-hidden="true">*</span></label><textarea id="tkStageReturnReason" rows="4" maxlength="1000" placeholder="说明上游产物的问题及需要调整的内容" required></textarea><p class="tk-stage-return-error" role="alert" hidden></p><div class="tk-stage-return-actions"><button type="button" data-return-cancel>取消</button><button type="submit">确认退回</button></div></form>';
  document.body.appendChild(dialog);
  let taskId = null, trigger = null;
  const select = dialog.querySelector('select');
  const reason = dialog.querySelector('textarea');
  const error = dialog.querySelector('[role="alert"]');
  dialog.querySelector('[data-return-cancel]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { if (trigger?.isConnected) trigger.focus(); });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-task-stage-return]');
    if (!button) return;
    taskId = Number(button.dataset.taskStageReturn);
    const task = tkGetTasks().find(row => row.id === taskId);
    const stages = returnableStages(task);
    if (!stages.length) { toast('当前没有可退回的上游节点', 'warning'); return; }
    trigger = button;
    select.replaceChildren(new Option('请选择节点', ''));
    stages.forEach(stage => select.add(new Option(stage.title || stage.workType, stage.id)));
    reason.value = ''; error.hidden = true;
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
