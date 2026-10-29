import { toast } from '../../core/toast.js';
import { viewChat } from '../../core/view.js';
import { tkGetTasks } from '../tasks-v2/data.js';
import { taskCodeDeliveryContext } from '../tasks-v2/code-delivery-context.js';
import { reviewTaskStage, taskExecutionStages } from '../tasks-v2/task-execution.js';
import { showTaskStageConfirm } from '../tasks-v2/confirm.js';
import { scrollChatBottom } from './messages.js';
import { activeResponseRun, activeSessionId, activeSessionTaskId, appendChatStageEndMarker, chatSessions, rememberActiveChatSession, renderChatSessions, saveChatSessions, set_activeResponseRun, set_activeSessionId, set_activeSessionTaskId } from './sessions.js';
import { renderChatTaskSide } from './task-conversation.js';
import { chatViewerActiveKey, chatViewerTabs, closeChatDocViewer, set_chatViewerActiveKey, set_chatViewerTabs } from './doc-viewer.js';
/* 任务对话：会话内「确认」按钮——确认产物、流转下一阶段（拆自 composer.js） */

/* ---------- 任务会话「确认」按钮：执行结束确认产物、流转下一阶段 ---------- */
/* 只在本轮回复结束、任务进入待评审后显示；点击与任务详情「通过审核」同一条流转链路。 */
function chatStageConfirmInfo() {
  if (viewChat.classList.contains('task-exception-open')) return null;
  var task = tkGetTasks().find(function (row) { return row.id === activeSessionTaskId; });
  if (!task) return null;
  var stages = taskExecutionStages(task);
  var index = stages.findIndex(function (stage) { return stage.id === task.executionStageId; });
  if (index < 0 && task.executionPlan?.length) index = stages.findIndex(function (stage) { return task.executionPlan.find(function (row) { return row.id === stage.id; })?.status !== 'done'; });
  if (index < 0) return null;
  var visible = ['in_progress', 'in_review'].includes(task.status);
  if (!visible) return null;
  var session = chatSessions.find(function (row) { return row.id === activeSessionId; });
  if (session?.stageId && session.stageId !== task.executionStageId) return null;
  if (session?.stageEndMarkers?.some(function (marker) { return marker.stageId === task.executionStageId; })) return null;
  if (session?.demoState && !['running','review','ended'].includes(session.demoState)
    && !(session.demoState === 'question' && session.demoQuestion?.continuationDone)) return null;
  var lastExchange = session?.exchanges.at(-1);
  var ready = task.status === 'in_review' && (session?.demoQuestion?.continuationDone || !!lastExchange && lastExchange.done && !lastExchange.waiting);
  return { task: task, ready: ready, nextStage: stages[index + 1] || null };
}
function chatStageConfirmTooltip(task, nextStage) {
  if (!nextStage) return '确认产物，完成任务';
  return '确认产物，进入「' + (nextStage.name || '下一阶段') + '」';
}
function refreshChatStageConfirm() {
  var btn = document.getElementById('chatStageConfirmBtn');
  if (!btn) return;
  var info = chatStageConfirmInfo();
  document.getElementById('chatStageGuide')?.classList.toggle('hidden', !info?.ready);
  btn.disabled = !info?.ready;
  if (!info?.ready) return;
  var label = document.getElementById('chatStageConfirmLabel');
  var title = document.getElementById('chatStageGuideTitle');
  var guide = document.getElementById('chatStageGuideText');
  var isLast = !info.nextStage;
  var currentStage = taskExecutionStages(info.task).find(function (stage) { return stage.id === info.task.executionStageId; });
  if (title) title.textContent = '「' + (currentStage?.name || '当前阶段') + '」已完成，请确认产物。';
  if (guide) guide.textContent = isLast ? '确认后任务完成。' : '确认后流转至「' + (info.nextStage?.name || '下一阶段') + '」。';
  if (label) label.textContent = isLast ? '完成' : '确认';
  btn.setAttribute('aria-label', chatStageConfirmTooltip(info.task, info.nextStage));
  btn.setAttribute('data-tooltip', chatStageConfirmTooltip(info.task, info.nextStage));
}
/* 会话里记下阶段结束分隔线 */
function markChatStageEnd(stage, done) {
  var session = chatSessions.find(function (row) { return row.id === activeSessionId; });
  if (!session || !stage) return;
  session.demoState = done ? 'confirmed' : 'ended';
  if (!Array.isArray(session.stageEndMarkers)) session.stageEndMarkers = [];
  if (!session.stageEndMarkers.some(function (marker) { return marker.stageId === stage.id; })) {
    var marker = {
      stageId: stage.id,
      stageName: stage.name,
      afterExchangeIndex: session.exchanges.length - 1,
      afterQuestion: !!session.demoQuestion,
    };
    session.stageEndMarkers.push(marker);
    saveChatSessions();
    appendChatStageEndMarker(marker);
    renderChatTaskSide();
    scrollChatBottom();
  }
  renderChatSessions();
}
function confirmChatStage() {
  var info = chatStageConfirmInfo();
  if (!info?.ready) return;
  showTaskStageConfirm(info.task, function () {
    var currentInfo = chatStageConfirmInfo();
    if (!currentInfo?.ready || currentInfo.task.id !== info.task.id) return;
    /* 开发阶段与任务详情「通过审核」一致：先模拟检查并合并本轮分支，合并成功才流转（提示由合并流程给出） */
    if (taskCodeDeliveryContext(currentInfo.task)?.isDevelopment) {
      var taskId = currentInfo.task.id;
      var devStage = taskExecutionStages(currentInfo.task).find(function (stage) { return stage.id === currentInfo.task.executionStageId; });
      document.addEventListener('lingee:task-stage-completed', function onMerged(event) {
        if (event.detail?.taskId !== taskId) return;
        document.removeEventListener('lingee:task-stage-completed', onMerged);
        if (activeSessionTaskId === taskId) markChatStageEnd(devStage, false);
      });
      document.dispatchEvent(new CustomEvent('lingee:code-delivery-approve', { detail: { taskId: taskId } }));
      return;
    }
    var reviewed = reviewTaskStage(currentInfo.task, true);
    if (!reviewed.ok) {
      toast(reviewed.message || '任务状态已变化，请刷新后重试', 'warning');
      return;
    }
    markChatStageEnd(reviewed.stage, reviewed.done);
    /* 流转后任务状态已变，lingee:task-updated 会触发 renderChatTaskSide 收起按钮 */
    toast(reviewed.done ? '任务完成' : '流转成功', 'success');
  });
}
function clearChatTaskSide() {
  document.getElementById('chatTaskQuestionPanel')?.remove();
  set_activeSessionTaskId(null);
  set_activeSessionId(null);
  rememberActiveChatSession(null);
  set_activeResponseRun(activeResponseRun + 1);
  renderChatTaskSide();
  renderChatSessions();
}
/* 从应用/智能体卡片打开独立演示对话：脱离上一个任务会话并收起产物预览 */
function resetChatForStandalone() {
  clearChatTaskSide();
  closeChatDocViewer();
  set_chatViewerTabs([]);
  set_chatViewerActiveKey(null);
}

export { clearChatTaskSide, confirmChatStage, refreshChatStageConfirm, resetChatForStandalone };
