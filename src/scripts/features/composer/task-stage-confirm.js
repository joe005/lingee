import { toast } from '../../core/toast.js';
import { viewChat } from '../../core/view.js';
import { tkCurrentStageHandlerId, tkCurrentUserId, tkGetPerson, tkGetTasks, tkProjectById } from '../tasks-v2/data.js';
import { ldMine, ldStartGitInstall } from '../collab/local-dev.js';
import { taskCodeDeliveryContext } from '../tasks-v2/code-delivery-context.js';
import { reviewTaskStage, taskExecutionStages } from '../tasks-v2/task-execution.js';
import { showTaskConfirm, showTaskStageConfirm } from '../tasks-v2/confirm.js';
import { scrollChatBottom } from './messages.js';
import { activeResponseRun, activeSessionId, activeSessionTaskId, chatSessions, rememberActiveChatSession, renderChatSessions, saveChatSessions, set_activeResponseRun, set_activeSessionId, set_activeSessionTaskId } from './sessions.js';
import { renderChatTaskSide } from './task-conversation.js';
import { chatViewerActiveKey, chatViewerTabs, closeChatDocViewer, set_chatViewerActiveKey, set_chatViewerTabs } from './doc-viewer.js';
/* 任务对话：会话内「确认」按钮——确认产物、流转下一阶段（拆自 composer.js） */

/* ---------- 任务会话「确认」按钮：执行结束确认产物、流转下一阶段 ---------- */
/* 只在本轮回复结束、任务进入待评审后显示，且只给本阶段评审人和空间负责人看（与客户端一致）；
   点击与任务详情「通过审核」同一条流转链路。 */
function canReviewChatStage(task) {
  var me = tkCurrentUserId();
  if (!me || !task) return false;
  var planStage = task.executionPlan?.find(function (row) { return row.id === task.executionStageId; });
  if ((planStage?.reviewerId || tkCurrentStageHandlerId(task)) === me) return true;
  var owner = tkProjectById(task.project)?.owner;
  return !!owner && owner === tkGetPerson(me)?.name;
}
function chatStageConfirmInfo() {
  if (viewChat.classList.contains('task-exception-open')) return null;
  var task = tkGetTasks().find(function (row) { return row.id === activeSessionTaskId; });
  if (!task) return null;
  var stages = taskExecutionStages(task);
  var index = stages.findIndex(function (stage) { return stage.id === task.executionStageId; });
  if (index < 0 && task.executionPlan?.length) index = stages.findIndex(function (stage) { return task.executionPlan.find(function (row) { return row.id === stage.id; })?.status !== 'done'; });
  if (index < 0) return null;
  var visible = ['in_progress', 'in_review'].includes(task.status);
  if (!visible || !canReviewChatStage(task)) return null;
  var session = chatSessions.find(function (row) { return row.id === activeSessionId; });
  if (session?.stageId && session.stageId !== task.executionStageId) return null;
  if (session?.stageEndMarkers?.some(function (marker) { return marker.stageId === task.executionStageId; })) return null;
  if (session?.demoState && !['running','review','ended'].includes(session.demoState)
    && !(session.demoState === 'question' && session.demoQuestion?.continuationDone)) return null;
  var lastExchange = session?.exchanges.at(-1);
  var ready = task.status === 'in_review' && (session?.demoQuestion?.continuationDone || !!lastExchange && lastExchange.done && !lastExchange.waiting);
  return { task: task, ready: ready, nextStage: stages[index + 1] || null };
}
function chatStageConfirmTooltip(stageName) {
  return '确认「' + (stageName || '本阶段') + '」产物并进入下一阶段';
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
  var currentStage = taskExecutionStages(info.task).find(function (stage) { return stage.id === info.task.executionStageId; });
  var stageName = currentStage?.name || '本阶段';
  /* 最后一个阶段不显示流转说明，按钮仍为「确认」 */
  if (title) title.textContent = '「' + stageName + '」已完成，请确认产物。';
  if (guide) guide.textContent = info.nextStage ? '确认后流转至「' + (info.nextStage.name || '下一阶段') + '」。' : '';
  if (label) label.textContent = '确认';
  btn.setAttribute('aria-label', chatStageConfirmTooltip(stageName));
  btn.setAttribute('data-tooltip', '确认产物');
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
    renderChatTaskSide();
    scrollChatBottom();
  }
  renderChatSessions();
}
/* 开发阶段通过评审要把产物提交并推送到仓库：本阶段执行人是自己且本机没有 Git 时先引导安装 */
function chatStageNeedsGit(task) {
  if (!taskCodeDeliveryContext(task)?.isDevelopment) return false;
  var owner = tkCurrentStageHandlerId(task);
  return (!owner || owner === tkCurrentUserId()) && !!ldMine().gitMissing;
}
function confirmChatStage() {
  /* 点击时重新核对一次，可能已在任务详情或他人处处理 */
  var info = chatStageConfirmInfo();
  if (!info?.ready) {
    toast('该阶段已在别处处理过', 'warning');
    refreshChatStageConfirm();
    return;
  }
  if (chatStageNeedsGit(info.task)) {
    showTaskConfirm('本机没有安装 Git。通过评审需要把阶段产物提交并推送到仓库，请先安装 Git 后再确认。', function () {
      ldStartGitInstall(info.task.project);
    }, '需要安装 Git', '安装 Git', 'primary');
    return;
  }
  showTaskStageConfirm(info.task, function (evidence) {
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
    var reviewed = reviewTaskStage(currentInfo.task, true, evidence);
    if (!reviewed.ok) {
      toast(reviewed.message || '任务状态已变化，请刷新后重试', 'warning');
      return;
    }
    markChatStageEnd(reviewed.stage, reviewed.done);
    /* 流转后任务状态已变，lingee:task-updated 会触发 renderChatTaskSide 收起按钮 */
    toast('流转成功', 'success');
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
