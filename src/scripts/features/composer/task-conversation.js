import { $ } from '../../core/dom.js';
import { showView, viewChat } from '../../core/view.js';
import { syncTogglePreviewBtn } from '../chat.js';
import { renderExpertChips } from '../expert/chips.js';
import { TEAMS } from '../expert/store.js';
import { tkCurrentStageHandlerId, tkGetTasks, tkPeopleInProject, tkProjectsForCurrentUser } from '../tasks-v2/data.js';
import { ldIsDevProject } from '../collab/local-dev.js';
import { taskExecutionStages } from '../tasks-v2/task-execution.js';
import { tkAnswerTaskSessionQuestion, tkGetMySessions, tkTaskSessionOpeningMessage } from '../tasks-v2/task-sessions.js';
import { appendAssistantMessage, appendUserMessage, escapeHtml, messagesList, resolveChatTeam, scrollChatBottom, statusConversationOpeningText, taskStageArtifact } from './messages.js';
import { closeTaskExceptionHistory } from './task-history.js';
import { taskConversationNeedsReply, activeResponseRun, activeSessionId, activeSessionTaskId, addSessionExchange, chatSessions, conversationTaskId, createChatSession, finishSessionExchange, isMyChatSession, renderChatSessions, saveChatSessions, seedCosmicDemoSessions, set_activeResponseRun } from './sessions.js';
import { openChatSession } from './session-open.js';
import { refreshChatStageConfirm } from './task-stage-confirm.js';
import { openChatDocViewer } from './doc-viewer.js';
import { appendTaskReadingSummary, simulateAIResponse } from './stream.js';
/* 任务对话：任务状态对话、阻塞继续、待回复问题、对话页任务侧栏（拆自 composer.js） */

/* 任务状态卡片回到对应的聊天；旧数据没有聊天记录时只补建一次。 */
function openTaskStatusConversation(task, options = {}) {
  if (!task) return;
  seedCosmicDemoSessions();
  var linked = chatSessions.filter(function (session) { return Number(session.taskId) === task.id && isMyChatSession(session); });
  var session = task.status === 'blocked'
    ? linked.find(function (row) { return row.demoState === 'blocked'; })
    : task.status === 'in_review'
      ? linked.find(function (row) { return row.demoState === 'question' && row.demoQuestion?.continuationDone; })
        || linked.find(function (row) { return row.demoState === 'review' || row.demoState === 'ended'; })
        || linked.find(function (row) { return !row.demoState && row.exchanges.some(function (exchange) { return exchange?.done; }); })
      : linked.find(function (row) { return row.demoState === 'question' && !row.demoQuestion?.answer; })
        || linked.find(function (row) { return row.demoState === 'question' && row.demoQuestion?.answer && !row.demoQuestion.continuationDone; })
        || linked.find(function (row) { return row.exchanges.some(function (exchange) { return exchange && !exchange.done && !exchange.waiting; }); })
        || linked.find(function (row) { return row.demoState === 'running'; });
  if (options.preferExisting && !session) session = linked.find(function (row) { return row.stageId === task.executionStageId; }) || linked[0];
  var created = false;
  if (!session) {
    created = true;
    session = createChatSession(task.title, task.id);
    var finished = task.status === 'in_review' || task.status === 'blocked';
    session.exchanges.push({
      prompt:tkTaskSessionOpeningMessage(task, 'start', task.executionStageId), done:finished,
      ...(task.status === 'blocked' ? {response:statusConversationOpeningText(task, true)}
        : task.status === 'in_review' ? {response:statusConversationOpeningText(task, false)} : {}),
    });
    if (finished) session.demoState = task.status === 'blocked' ? 'blocked' : 'review';
    if (task.status === 'blocked') session.demoFailure = task.blockedRun?.reason || '本次执行失败，请检查任务中的阻塞原因。';
    if (task.status === 'in_review') session.demoArtifact = true;
    saveChatSessions();
  }
  if (task.status === 'in_progress' && session.demoState === 'running' && session.exchanges.at(-1)?.done) {
    session.exchanges.at(-1).done = false;
    saveChatSessions();
  }
  if (session.demoQuestion && !session.demoQuestion.taskSessionId) {
    var taskSession = tkGetMySessions(task).find(function (row) { return row.stageId === task.executionStageId && row.status === 'active'; });
    if (taskSession) {
      session.demoQuestion.taskSessionId = taskSession.id;
      saveChatSessions();
    }
  }
  if (!created && activeSessionId === session.id && messagesList.querySelector('.message') && $('#chatTitle').textContent === task.title) {
    showView('chat');
    if (session.demoArtifact) {
      var existingArtifact = taskStageArtifact(task);
      if (existingArtifact) openChatDocViewer(task, existingArtifact);
    }
    renderChatSessions();
    return;
  }
  openChatSession(session.id);
}
function continueBlockedTaskConversation(task) {
  var session = chatSessions.find(function (row) { return row.id === activeSessionId && Number(row.taskId) === task.id; });
  if (!session) return;
  session.exchanges.forEach(function (exchange) { exchange.failure = session.demoFailure || task.blockedRun?.reason || '本次执行失败'; });
  session.demoState = 'running';
  session.demoArtifact = false;
  saveChatSessions();
  var prompt = '重试';
  set_activeResponseRun(activeResponseRun + 1);
  var exchangeIndex = addSessionExchange(prompt);
  appendUserMessage(prompt);
  var response = appendAssistantMessage(resolveChatTeam(session, task));
  simulateAIResponse(response, false, task, prompt, function () { finishSessionExchange(session.id, exchangeIndex); });
  renderChatTaskSide();
  scrollChatBottom();
}
function renderTaskQuestion(session, task) {
  var question = session.demoQuestion;
  appendUserMessage(question.prompt || '执行「测试验证」：完成采购订单规则配置清单，整理说明并归档 evidence 证据。');
  var response = appendAssistantMessage(resolveChatTeam(session, task));
  if (task) appendTaskReadingSummary(response, task);
  var process = document.createElement('div');
  response.appendChild(process);
  var steps = question.steps || [
    ['已核对规则动作类型与参数取值形状','清单字段与当前注册表逐项对齐。'],
    ['正在整理采购订单规则配置清单','已核对字段口径，尚未提交最终文件。'],
    ['归档 evidence 时发现冲突','系统导出映射与项目手工维护版本存在差异，等待确认采用哪份作为交付依据。'],
  ];
  process.innerHTML = '<div class="chat-task-process"><p>' + escapeHtml(question.intro || '正在完成采购订单规则配置清单的交付收口。') + '</p><ol>'
    + steps.map(function (step) { return '<li><strong>' + escapeHtml(step[0]) + '</strong><span>' + escapeHtml(step[1]) + '</span></li>'; }).join('')
    + '</ol><p>' + escapeHtml(question.closing || '归档前需要你确认一项取舍。') + '</p></div>';
  document.getElementById('chatTaskQuestionPanel')?.remove();
  if (!question.answer) {
    var panel = document.createElement('section');
    panel.id = 'chatTaskQuestionPanel';
    panel.className = 'chat-task-question-panel';
    panel.setAttribute('aria-label', 'AI 提问');
    panel.innerHTML = '<div class="chat-task-question-panel-inner"><div class="chat-task-question-panel-head"><strong>需要你的决定</strong><span>1 个问题</span></div>'
      + '<p>' + escapeHtml(question.text) + '</p><div class="chat-task-question-options">'
      + question.options.map(function (option, index) { return '<button type="button" data-task-question-option="' + index + '"><span>' + (index + 1) + '</span>' + escapeHtml(option) + '</button>'; }).join('')
      + '</div><small>也可以在下方输入自己的答复</small></div>';
    document.querySelector('#view-chat .chat-container').insertBefore(panel, document.getElementById('chatComposerWrap'));
  }
  if (question.answer) {
    appendUserMessage(question.answer);
    var acknowledgement = appendAssistantMessage(resolveChatTeam(session, task));
    acknowledgement.textContent = question.acknowledgement || '收到，将按你的决定整理 evidence 归档和交付说明，继续完成当前阶段。';
  }
}
function answerTaskQuestion(answer) {
  var session = chatSessions.find(function (row) { return row.id === activeSessionId; });
  if (!session?.demoQuestion || session.demoQuestion.answer) return false;
  session.demoQuestion.answer = answer;
  if (session.demoQuestion.taskSessionId) tkAnswerTaskSessionQuestion(session.demoQuestion.taskSessionId);
  saveChatSessions();
  openChatSession(session.id);
  return true;
}
function openTaskQuestionConversation(task, taskSession) {
  if (!task || !taskSession) return;
  closeTaskExceptionHistory();
  var session = chatSessions.find(function (row) { return row.taskId === task.id && row.demoQuestion?.taskSessionId === taskSession.id; });
  if (!session) {
    session = createChatSession(task.title, task.id);
    session.demoQuestion = {
      taskSessionId:taskSession.id,
      text:'归档 evidence 时，系统导出的动作参数映射与项目手工维护版本有差异。交付清单应以哪份为准？',
      options:['以当前系统导出的注册表为准，记录手工版本差异','保留项目手工维护版本，标注与注册表的差异'], answer:'',
    };
    saveChatSessions();
  }
  if (!session.demoQuestion.answer) {
    session.demoQuestion.text = '归档 evidence 时，系统导出的动作参数映射与项目手工维护版本有差异。交付清单应以哪份为准？';
    session.demoQuestion.options = ['以当前系统导出的注册表为准，记录手工版本差异','保留项目手工维护版本，标注与注册表的差异'];
    saveChatSessions();
  }
  openChatSession(session.id);
}
function getConversationTask() {
  return conversationTaskId == null ? null : tkGetTasks().find(function (task) { return task.id === conversationTaskId; }) || null;
}
function renderConversationTaskReference() {
  var task = getConversationTask();
  /* 任务发起的会话详情由标题旁的关联任务标签承载上下文。 */
  var tags = document.getElementById('ntTags');
  if (tags) {
    tags.classList.toggle('hidden', !task);
    tags.innerHTML = task ? '<span class="ctag" data-task-ref-id="' + task.id + '"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><span class="ctag-label">' + escapeHtml(task.code || '') + ' ' + escapeHtml(task.title || '') + '</span><button type="button" class="ctag-x" data-clear-task-ref aria-label="移除任务关联"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></span>' : '';
  }
  if (task && !viewChat.classList.contains('hidden')) $('#chatTitle').textContent = task.title;
}
function syncTaskCreateProjectPicker(){
  var session=chatSessions.find(function(row){return row.id===activeSessionId&&row.taskCreate;});
  var picker=$('#chatTaskProjectPicker'),select=$('#chatTaskProjectSelect');
  picker.hidden=!session||session.taskCreate.status==='done';
  viewChat.classList.toggle('task-builder-session',!picker.hidden);
  if(picker.hidden)return;
  /* 与新建任务一致，只列开发项目；从某个项目发起时保留该项目 */
  var projects=tkProjectsForCurrentUser().filter(function(project){return ldIsDevProject(project)||project.id===session.taskCreate.projectId;});
  select.innerHTML='<option value="" disabled hidden>选择项目</option>'+projects.map(function(project){return '<option value="'+escapeHtml(project.id)+'">'+escapeHtml(project.name)+'</option>';}).join('');
  select.value=session.taskCreate.projectId||'';
  var teamSelect=$('#chatTaskTeamSelect');
  teamSelect.innerHTML='<option value="" disabled hidden>选择智能体团队</option>'+TEAMS.map(function(team){return '<option value="'+escapeHtml(team.id)+'">'+escapeHtml(team.name)+'</option>';}).join('');
  teamSelect.value=session.taskCreate.teamId||'';
}
function renderChatTaskSide() {
  syncTaskCreateProjectPicker();
  var task = tkGetTasks().find(function (row) { return row.id === activeSessionTaskId; });
  var assetSession = chatSessions.find(function (row) { return row.id === activeSessionId && (row.assetCreate||row.assetEdit); });
  var expertDropdown = document.getElementById('chatExpertDropdown');
  var taskTeam = task ? resolveChatTeam(null, task) : null;
  expertDropdown.classList.toggle('task-team-locked', !!task || !!assetSession);
  viewChat.classList.toggle('expert-builder-session',!!assetSession?.assetCreate);
  expertDropdown.dataset.lockedTeamId = taskTeam?.id || '';
  expertDropdown.classList.remove('open');
  expertDropdown.querySelector('[data-chip]').setAttribute('aria-disabled', task || assetSession ? 'true' : 'false');
  renderExpertChips();
  if(assetSession?.assetCreate)document.getElementById('chatExpertLabel').textContent='智能体创建智能体';
  if (task) {
    viewChat.classList.remove('preview-open');
    var preview = document.getElementById('chatPreviewSide');
    if (preview) { preview.style.width = ''; preview.style.maxWidth = ''; }
    syncTogglePreviewBtn();
  }
  var title = document.getElementById('chatTitle');
  title.classList.toggle('is-task', !!task);
  title.setAttribute('aria-label', task ? '打开任务详情：' + task.title + (task.code ? ' #' + task.code : '') : '会话标题');
  if (task) title.setAttribute('data-tooltip', '打开任务详情');
  else title.removeAttribute('data-tooltip');
  if (task) title.textContent = task.title;
  if (task?.code) title.setAttribute('data-task-code', task.code);
  else title.removeAttribute('data-task-code');
  var stagePanel = document.getElementById('chatCurrentStage');
  var stages = task ? taskExecutionStages(task) : [];
  var session = chatSessions.find(function (row) { return row.id === activeSessionId; });
  var stageIndex = stages.findIndex(function (stage) { return stage.id === session?.stageId; });
  if (stageIndex < 0) stageIndex = stages.findIndex(function (stage) { return stage.id === task?.executionStageId; });
  if (stageIndex < 0 && task?.executionPlan?.length) stageIndex = stages.findIndex(function (stage) {
    return task.executionPlan.find(function (row) { return row.id === stage.id; })?.status !== 'done';
  });
  if (stageIndex < 0 && stages.length) stageIndex = task?.status === 'done' ? stages.length - 1 : 0;
  stagePanel.hidden = !task || stageIndex < 0;
  if (!stagePanel.hidden) {
    if (stagePanel.dataset.sessionId !== String(activeSessionId)) {
      stagePanel.dataset.taskId = String(task.id);
      stagePanel.dataset.sessionId = String(activeSessionId);
      document.getElementById('chatCurrentStageToggle').setAttribute('aria-expanded', 'false');
      document.getElementById('chatCurrentStageDetails').hidden = !document.getElementById('chatCurrentStage').classList.contains('is-horizontal');
    }
    var stage = stages[stageIndex];
    var people = tkPeopleInProject(task.project);
    document.getElementById('chatCurrentStageName').textContent = stage.name || '未命名阶段';
    document.getElementById('chatCurrentStageCount').textContent = (stageIndex + 1) + '/' + stages.length;
    document.getElementById('chatCurrentStageList').innerHTML = stages.map(function (row, index) {
      var planStage = task.executionPlan?.find(function (item) { return item.id === row.id; });
      var state = task.status === 'done' ? 'done' : planStage?.status || (index < stageIndex ? 'done' : 'pending');
      if (session?.stageEndMarkers?.some(function (marker) { return marker.stageId === row.id; })) state = 'done';
      if (!['done', 'running', 'review', 'blocked', 'pending'].includes(state)) state = 'pending';
      if (row.id === task.executionStageId && state !== 'done' && task.status === 'blocked') state = 'blocked';
      else if (row.id === task.executionStageId && state !== 'done' && task.status === 'in_review') state = 'review';
      else if (row.id === task.executionStageId && task.status === 'in_progress' && state === 'pending') state = 'running';
      var label = row.id === task.executionStageId && state === 'running' && taskConversationNeedsReply(task, true) ? '待回答' : state === 'done' ? '已完成' : state === 'running' ? '执行中' : state === 'review' ? '待评审' : state === 'blocked' ? '已阻塞' : index === stageIndex && task.status === 'backlog' ? '待开始' : '未开始';
      var handlerId = row.id === task.executionStageId ? tkCurrentStageHandlerId(task) || row.assigneeId : row.assigneeId || (!task.executionPlan?.length ? task.assignee : '');
      var handlerName = people.find(function (person) { return person.id === handlerId; })?.name || '待分配';
      var indexContent = state === 'done' ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 10 3.5 3.5 7.5-8"/></svg>' : index + 1;
      var autoPass = planStage?.requiresConfirmation === false;
      var auditBadge = autoPass ? '<span class="chat-stage-audit-mode" data-audit-mode="auto" data-tooltip="本阶段自动评审，无需人工确认">自动评审</span>' : '';
      var reviewerText = '评审人 ' + escapeHtml(handlerName);
      var horizontalStages = stagePanel.classList.contains('is-horizontal');
      var isNextStage = row.id === task.executionStageId && task.status !== 'done' && state !== 'done';
      return '<li class="chat-current-stage-row is-' + state + (isNextStage ? ' is-current' : '') + '"' + (isNextStage ? ' aria-current="step"' : '') + '><span class="chat-current-stage-index" aria-label="第' + (index + 1) + '阶段' + (state === 'done' ? '已完成' : '') + '">' + indexContent + '</span><span class="chat-current-stage-row-main"><strong>' + escapeHtml(row.name || '未命名阶段') + (horizontalStages ? '' : auditBadge) + '</strong>' + (horizontalStages ? auditBadge : '') + '<small>' + reviewerText + '</small></span><span class="chat-current-stage-status">' + label + '</span></li>';
    }).join('');
  } else { stagePanel.removeAttribute('data-task-id'); stagePanel.removeAttribute('data-session-id'); }
  /* 任务会话不提供历史版本入口，应用开发的 workspace 会话保留。 */
  document.getElementById('historyBtn')?.classList.toggle('hidden', !!task || viewChat.classList.contains('task-exception-open'));
  refreshChatStageConfirm();
  /* 创建会话生成任务后仍可继续对话；执行会话按任务状态控制输入区。 */
  document.getElementById('chatComposerWrap')?.classList.toggle('hidden', !!task && !session?.taskCreate && !['in_progress', 'in_review', 'blocked'].includes(task.status));
}

export { answerTaskQuestion, continueBlockedTaskConversation, getConversationTask, openTaskQuestionConversation, openTaskStatusConversation, renderChatTaskSide, renderConversationTaskReference, renderTaskQuestion, syncTaskCreateProjectPicker };
