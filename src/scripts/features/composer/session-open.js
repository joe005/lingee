import { $ } from '../../core/dom.js';
import { showView, viewChat } from '../../core/view.js';
import { syncTogglePreviewBtn } from '../chat.js';
import { appendAskCard } from '../expert/automatch.js';
import { renderExpertChips } from '../expert/chips.js';
import { pendingInputs } from '../expert/data.js';
import { hideAssetEditorPanel } from '../expert/editor-panel.js';
import { set_activePick } from '../expert/store.js';
import { tkGetTasks } from '../tasks-v2/data.js';
import { appendAssistantMessage, appendUserMessage, createChatResultArtifactCard, createFinalResult, demoExchangeText, escapeHtml, messagesList, resolveChatTeam, scrollChatBottom, setComposerTaskReference, taskStageArtifact } from './messages.js';
import { activeResponseRun, activeSessionId, activeSessionTaskId, chatSessions, finishSessionExchange, isMyChatSession, rememberActiveChatSession, renderChatSessions, renderChatStageEndMarkers, saveChatSessions, set_activeResponseRun, set_activeSessionId, set_activeSessionTaskId } from './sessions.js';
import { hideTaskQuestionPanel, renderTaskCreateChat, setTaskCreateChipLabel } from './task-create-chat.js';
import { renderAssetCreateChat, renderAssetEditChat } from './asset-chat.js';
import { renderChatTaskSide, renderTaskQuestion } from './task-conversation.js';
import { refreshChatStageConfirm } from './task-stage-confirm.js';
import { chatViewerActiveKey, chatViewerTabs, closeChatDocViewer, openChatDocViewer, set_chatViewerActiveKey, set_chatViewerTabs } from './doc-viewer.js';
import { appendTaskReadingSummary, renderMarkdown, simulateAIResponse } from './stream.js';
import { chatInput } from './send.js';
/* 对话：打开历史会话（拆自 composer.js） */

function openChatSession(sessionId) {
  var session = chatSessions.find(function (row) { return row.id === sessionId; });
  if (!session || !isMyChatSession(session)) return;
  if (session.taskId != null && !session.stageId) {
    var sessionTask = tkGetTasks().find(function (row) { return row.id === Number(session.taskId); });
    session.stageId = session.stageEndMarkers?.[0]?.stageId || sessionTask?.executionStageId || '';
    saveChatSessions();
  }
  set_activeResponseRun(activeResponseRun + 1);
  set_activeSessionId(session.id);
  rememberActiveChatSession(session.id);
  set_activeSessionTaskId(session.taskId == null ? null : Number(session.taskId));
  document.getElementById('chatCurrentStageToggle').setAttribute('aria-expanded', 'false');
  document.getElementById('chatCurrentStageDetails').hidden = !document.getElementById('chatCurrentStage').classList.contains('is-horizontal');
  showView('chat');
  messagesList.innerHTML = '';
  hideTaskQuestionPanel();
  closeChatDocViewer();
  hideAssetEditorPanel();
  set_chatViewerTabs([]);
  set_chatViewerActiveKey(null);
  if(session.assetEdit)set_activePick({kind:session.assetEdit.kind,id:session.assetEdit.id,auto:false});
  renderChatTaskSide();
  setComposerTaskReference(activeSessionTaskId);
  $('#chatTitle').textContent = session.title;
  if(session.assetEdit){
    viewChat.classList.remove('preview-open');
    syncTogglePreviewBtn();
    renderAssetEditChat(session);
    document.dispatchEvent(new CustomEvent('lingee:asset-edit-session',{detail:session.assetEdit}));
    renderChatSessions();
    return;
  }
  if(session.assetCreate){
    set_activePick({kind:'expert',id:'software-product-manager',auto:false});
    renderChatTaskSide();
    renderAssetCreateChat(session);
    renderChatSessions();
    return;
  }
  if (session.taskCreate) {
    set_activePick({kind:'expert', id:'software-product-manager', auto:false});
    renderExpertChips();
    setTaskCreateChipLabel();
    renderTaskCreateChat(session);
    renderChatSessions();
    return;
  }
  chatInput.contentEditable = 'true';
  chatInput.setAttribute('data-placeholder', '输入消息…');
  var task = tkGetTasks().find(function (row) { return row.id === activeSessionTaskId; });
  $('#chatTitle').textContent = task ? task.title : session.title;
  if (session.demoState && session.demoState !== 'running') {
    if (session.demoState !== 'question') session.exchanges.forEach(function (exchange, index) {
      if (!exchange) return;
      appendUserMessage(exchange.prompt);
      var response = appendAssistantMessage(resolveChatTeam(session, task));
      if (task) appendTaskReadingSummary(response, task);
      var timeline = document.createElement('div');
      timeline.className = 'work-steps';
      response.appendChild(timeline);
      var result = createFinalResult(false);
      result.querySelector('.markdown-content').innerHTML = renderMarkdown(demoExchangeText(session, task, exchange));
      timeline.appendChild(result);
      if (session.demoState === 'blocked' || exchange.failure) {
        var failure = document.createElement('div');
        failure.className = 'task-exception-error';
        failure.innerHTML = '<strong>执行失败</strong><p>' + escapeHtml(exchange.failure || session.demoFailure || 'AI 点数不足，无法继续解析扩展属性锁定规则。补充点数后可重试本阶段。') + '</p>';
        result.appendChild(failure);
      }
      if (task && session.demoArtifact && !exchange.failure) {
        var artifact = taskStageArtifact(task);
        if (artifact) result.appendChild(createChatResultArtifactCard(task, artifact));
      }
      renderChatStageEndMarkers(session, index, false);
    });
    if (session.demoQuestion) {
      renderTaskQuestion(session, task);
      if (session.demoQuestion.answer && task) {
        var continuation = appendAssistantMessage(resolveChatTeam(session, task));
        simulateAIResponse(continuation, !!session.demoQuestion.continuationDone, task, session.demoQuestion.answer, function () {
          session.demoQuestion.continuationDone = true;
          session.demoArtifact = true;
          saveChatSessions();
          renderChatSessions();
        });
      }
    }
    else document.getElementById('chatTaskQuestionPanel')?.remove();
    if (session.demoArtifact && task) {
      var previewArtifact = taskStageArtifact(task);
      if (previewArtifact) openChatDocViewer(task, previewArtifact);
    }
    if (session.demoQuestion) renderChatStageEndMarkers(session, session.exchanges.length - 1, true);
    else if (!session.exchanges.length) renderChatStageEndMarkers(session, -1, false);
    renderChatSessions();
    refreshChatStageConfirm();
    scrollChatBottom();
    return;
  }
  session.exchanges.forEach(function (exchange, index) {
    appendUserMessage(exchange.prompt);
    if (exchange.waiting) { appendAskCard(pendingInputs(exchange.prompt)); return; }
    var response = appendAssistantMessage(resolveChatTeam(session, task));
    if (exchange.failure) {
      var failedResult = createFinalResult(false);
      failedResult.querySelector('.markdown-content').innerHTML = renderMarkdown(exchange.response || '上次执行未完成。');
      var failure = document.createElement('div');
      failure.className = 'task-exception-error';
      failure.innerHTML = '<strong>执行失败</strong><p>' + escapeHtml(exchange.failure) + '</p>';
      failedResult.appendChild(failure);
      response.appendChild(failedResult);
      return;
    }
    simulateAIResponse(response, !!exchange.done, task, exchange.prompt, function () { finishSessionExchange(session.id, index); });
    renderChatStageEndMarkers(session, index, false);
  });
  if (session.demoState === 'running' && task?.status === 'in_review' && session.exchanges.some(function (exchange) { return exchange.done; })) {
    var readyArtifact = taskStageArtifact(task);
    if (readyArtifact) openChatDocViewer(task, readyArtifact);
  }
  if (session.demoQuestion) renderTaskQuestion(session, task);
  else document.getElementById('chatTaskQuestionPanel')?.remove();
  if (session.demoQuestion) renderChatStageEndMarkers(session, session.exchanges.length - 1, true);
  else if (!session.exchanges.length) renderChatStageEndMarkers(session, -1, false);
  renderChatSessions();
  scrollChatBottom();
}

export { openChatSession };
