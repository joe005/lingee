import { taskCodeDeliveryContext } from './code-delivery-context.js';
import { tkGetPerson, tkPeopleInProject } from './data.js';
import { taskExecutionStages } from './task-execution.js';

let confirmAction = null;
let previousFocus = null;

function closeTaskConfirm(confirmed) {
  const overlay = document.getElementById('tkConfirmOverlay');
  if (overlay.hidden) return;
  overlay.hidden = true;
  const action = confirmAction;
  confirmAction = null;
  if (previousFocus?.isConnected) previousFocus.focus();
  previousFocus = null;
  if (confirmed && action) action();
}

export function showTaskConfirm(message, action, title, confirmLabel, tone, cancelLabel) {
  const overlay = document.getElementById('tkConfirmOverlay');
  previousFocus = document.activeElement;
  confirmAction = action;
  document.getElementById('tkConfirmTitle').textContent = title || '确认删除';
  document.getElementById('tkConfirmMessage').textContent = message;
  document.getElementById('tkConfirmOk').textContent = confirmLabel || '删除';
  document.getElementById('tkConfirmCancel').textContent = cancelLabel || '取消';
  overlay.dataset.tone = tone || 'danger';
  overlay.hidden = false;
  document.getElementById('tkConfirmCancel').focus();
}

export function showTaskStageConfirm(task, action) {
  const stages = taskExecutionStages(task);
  let index = stages.findIndex(stage => stage.id === task.executionStageId);
  if (index < 0 && task.executionPlan?.length) {
    index = stages.findIndex(stage => task.executionPlan.find(row => row.id === stage.id)?.status !== 'done');
  }
  if (index < 0) return;
  const next = stages[index + 1];
  const assigneeId = next && (task.flowAssignee || next.assigneeId || (!task.executionPlan?.length ? task.assignee : ''));
  /* 文案与客户端一致：下一阶段写评审人（即该阶段处理人），最后阶段写全部阶段完成 */
  const nextPlan = next && task.executionPlan?.find(row => row.id === next.id);
  const reviewerId = nextPlan?.reviewerId || assigneeId;
  const reviewerName = reviewerId ? tkPeopleInProject(task.project).find(person => person.id === reviewerId)?.name || tkGetPerson(reviewerId).name : '';
  const message = !next ? '通过后本任务的全部阶段完成。' : reviewerName ? '通过后进入「' + next.name + '」，评审人：' + reviewerName + '。' : '通过后进入「' + next.name + '」。';
  const codeContext = taskCodeDeliveryContext(task);
  const mergeHint = codeContext?.isDevelopment ? '系统会先检查并合并代码，合并成功后才完成审核和流转；失败则保留在本阶段。' : '';
  showTaskConfirm(message + mergeHint, action, '确认产物', '确认', 'primary');
}

export function initTaskConfirm() {
  const overlay = document.getElementById('tkConfirmOverlay');
  if (overlay.parentNode !== document.body) document.body.appendChild(overlay);
  document.getElementById('tkConfirmCancel').addEventListener('click', () => closeTaskConfirm(false));
  document.getElementById('tkConfirmOk').addEventListener('click', () => closeTaskConfirm(true));
  overlay.addEventListener('click', event => { if (event.target === overlay) closeTaskConfirm(false); });
  document.addEventListener('keydown', event => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeTaskConfirm(false); }
    if (event.key === 'Tab') {
      const cancel = document.getElementById('tkConfirmCancel');
      const ok = document.getElementById('tkConfirmOk');
      if (event.shiftKey && document.activeElement === cancel) { event.preventDefault(); ok.focus(); }
      else if (!event.shiftKey && document.activeElement === ok) { event.preventDefault(); cancel.focus(); }
    }
  });
}
