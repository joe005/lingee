import { billTemplateWithTokens } from '../../core/bill-template.js';
import { $ } from '../../core/dom.js';
import { input } from '../../core/view.js';
import { syncTogglePreviewBtn } from '../chat.js';
import { EX, xav, xesc } from '../expert/data.js';
import { teamById } from '../expert/store.js';
import { taskExecutorTeam } from '../expert/task-team.js';
import { tkGetTaskArtifacts, tkProjectById } from '../tasks-v2/data.js';
import { taskExecutionStages } from '../tasks-v2/task-execution.js';
import { conversationTaskId, set_conversationTaskId } from './sessions.js';
import { renderConversationTaskReference } from './task-conversation.js';
import { openChatDocViewer } from './doc-viewer.js';
/* 对话：发送按钮、消息列表、消息气泡与产物卡片、任务会话统一文案格式（拆自 composer.js） */

/* ---------- composer input + send ---------- */
var sendBtn=$('#sendBtn');
function refreshSend(){ sendBtn.classList.toggle('active', input.textContent.trim().length>0); }
var chatMessages=$('#chatMessages');
var messagesList=$('#messagesList');
function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
/* ---------- 任务会话统一文案格式 ----------
   提示语里的阶段名与产物一律从当前任务数据解析，不单独写死，
   保证「XX已完成，请确认」与产物卡片指向同一份阶段产物。 */
/* 阶段名 → 六阶段语义；「实现规划」须先于「实现」判断，避免误入编码实现 */
function stageSemantic(name) {
  var text = String(name || '');
  if (/需求/.test(text)) return 'requirements';
  if (/规划/.test(text)) return 'planning';
  if (/设计/.test(text)) return 'design';
  if (/编码|实现|开发/.test(text)) return 'implementation';
  if (/测试|验证|验收/.test(text)) return 'verification';
  if (/部署|交付|发布/.test(text)) return 'delivery';
  return '';
}
/* 语义 → 标准产物模板 id：实现规划暂无独立产物，并入技术文档（与 submitTaskStage 的模板口径一致） */
var STAGE_ARTIFACT_TEMPLATE = { requirements:'requirements', design:'technical', planning:'technical', implementation:'implementation', verification:'test', delivery:'delivery' };
function taskStageArtifact(task) {
  var artifacts = tkGetTaskArtifacts(task);
  var exact = artifacts.find(function (artifact) { return artifact.stageId === task.executionStageId; });
  if (exact) return exact;
  var stage = taskExecutionStages(task).find(function (row) { return row.id === task.executionStageId; });
  var templateId = stage ? STAGE_ARTIFACT_TEMPLATE[stageSemantic(stage.name)] : '';
  return (templateId && artifacts.find(function (artifact) { return artifact.id === templateId; })) || artifacts[0];
}
function taskStageName(task) {
  var stage = taskExecutionStages(task).find(function (row) { return row.id === task.executionStageId; });
  return stage?.name || '当前阶段';
}
/* 模拟会话静态提示语：按会话状态套统一句式「{阶段}+状态+行动指令」，阶段名从任务数据解析 */
function demoExchangeText(session, task, exchange) {
  if (!task) return exchange?.response || '';
  var stageName = taskStageName(task);
  switch (session.demoState) {
    case 'running': return '「' + stageName + '」正在执行，完成后提交产物。';
    case 'review': case 'ended': return '「' + stageName + '」已完成，请确认产物。';
    case 'confirmed': return '「' + stageName + '」已确认，任务交付完成。';
    case 'blocked': return '「' + stageName + '」执行中断，请查看失败原因。';
    default: return exchange?.response || '';
  }
}
/* 任务状态卡片回看补建的会话开场提示，同口径生成 */
function statusConversationOpeningText(task, blocked) {
  var stageName = taskStageName(task);
  if (blocked) return '「' + stageName + '」执行中断，请查看失败原因。';
  return '「' + stageName + '」已完成，请确认产物。';
}
function appendTaskArtifact(result, task, autoOpen) {
  var artifact = taskStageArtifact(task);
  if (!artifact) return;
  result.appendChild(createChatResultArtifactCard(task, artifact));
  var stages = taskExecutionStages(task);
  var next = stages[stages.findIndex(function (stage) { return stage.id === task.executionStageId; }) + 1];
  var closing = document.createElement('p');
  closing.className = 'chat-task-result-closing';
  closing.textContent = '「' + taskStageName(task) + '」产物已生成，' + (next ? '确认后提交并进入「' + next.name + '」。' : '确认后提交并完成任务。');
  result.appendChild(closing);
  if (autoOpen) openChatDocViewer(task, artifact, true);
}
/* 任务会话结果产物卡片：视觉与采购订单会话的 artifact-card 保持一致，点击打开产物预览。 */
function createChatResultArtifactCard(task, artifact) {
  if (artifact.format === 'html') return createArtifactCard({ title:artifact.type, onOpen:function () { openChatDocViewer(task, artifact); } });
  var card = document.createElement('div');
  card.className = 'artifact-card';
  card.innerHTML = '<div class="artifact-preview"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></div>'
    + '<div class="artifact-info"><div class="artifact-title">' + escapeHtml(artifact.type) + '</div></div>'
    + '<div class="artifact-action"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg></div>';
  card.addEventListener('click', function () { openChatDocViewer(task, artifact); });
  return card;
}
function setComposerTaskReference(taskId) {
  set_conversationTaskId(taskId == null ? null : Number(taskId));
  renderConversationTaskReference();
}
function scrollChatBottom(){ chatMessages.scrollTop=chatMessages.scrollHeight; }

function appendUserMessage(text){
  var msg=document.createElement('div');
  msg.className='message user';
  msg.innerHTML='<div class="message-content"><p>'+escapeHtml(text)+'</p></div>';
  messagesList.appendChild(msg);
  scrollChatBottom();
}

function resolveChatTeam(session, task){
  if (session?.previewRepair) return null;
  /* 管理板块立项的项目（如设备巡检维修系统建设）不在 CV_PROJECTS 里，按任务项目统一查找 */
  var project = tkProjectById(task?.project || session?.projectId);
  if (task?.expertId) return taskExecutorTeam(task, project);
  if(task) return teamById(task.teamId || '');
  var pick=session?.executionPick;
  if(pick?.kind==='expert'&&EX[pick.id]) return {id:'expert:'+pick.id,name:EX[pick.id].name,members:[pick.id]};
  if(pick) return pick.kind==='team' ? teamById(pick.id) : null;
  return teamById(session?.teamId || '');
}
function teamAvatarHtml(team){
  var members = (team.members || []).map(function (id) { return EX[id]; }).filter(Boolean).slice(0, 3);
  return '<span class="chat-team-avatars" role="img" aria-label="' + xesc(team.name) + '成员头像">'
    + members.map(function (member) { return '<img src="' + xesc(xav(member.k)) + '" alt="" title="' + xesc(member.name) + '">'; }).join('') + '</span>';
}
function appendAssistantMessage(team){
  var msg=document.createElement('div');
  msg.className='message assistant';
  msg.innerHTML='<div class="message-content">'
    + (team ? '<div class="chat-agent-identity">' + teamAvatarHtml(team) + '<strong>' + escapeHtml(team.name) + '</strong></div>' : '')
    + '<div class="assistant-response"></div></div>';
  messagesList.appendChild(msg);
  return msg.querySelector('.assistant-response');
}

function createFinalResult(withHeader){
  var result=document.createElement('div');
  result.className='work-step done final-step' + (withHeader ? '' : ' bare');
  result.innerHTML=(withHeader?'<div class="step-header">'
    +'<div class="step-left">'
    +'<svg class="step-icon done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>'
    +'<span class="step-title">生成结果</span></div>'
    +'</div>':'')
    +'<div class="markdown-content"></div>';
  return result;
}

function createArtifactCard(options){
  var card=document.createElement('div');
  card.className='artifact-card';
  card.innerHTML='<div class="artifact-preview"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></div>'
    +'<div class="artifact-info"><div class="artifact-title">'+escapeHtml(options?.title || '采购订单')+'</div></div>'
    +'<div class="artifact-action"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg></div>';
  function openPreview(){
    if (options?.onOpen) { options.onOpen(); return; }
    var view=document.getElementById('view-chat');
    var frame=document.getElementById('chatPreviewFrame');
    var side=document.getElementById('chatPreviewSide');
    if(side) side.classList.remove('is-browser');
    if(frame){
      var html=billTemplateWithTokens;
      var blob=new Blob([html],{type:'text/html'});
      frame.src=URL.createObjectURL(blob);
      view.classList.add('preview-open');
      if(typeof syncTogglePreviewBtn==='function') syncTogglePreviewBtn();
      try{localStorage.setItem('chatPreviewOpen','1')}catch(e){}
      var savedW=localStorage.getItem('chatPreviewWidth');
      var ps=document.getElementById('chatPreviewSide');
      if(savedW&&ps){ps.style.width=savedW;}
    }
  }
  card.addEventListener('click',openPreview); /* 仅点击卡片时展开预览 */
  card._openPreview=openPreview;
  return card;
}

export { appendAssistantMessage, appendTaskArtifact, appendUserMessage, chatMessages, createArtifactCard, createChatResultArtifactCard, createFinalResult, demoExchangeText, escapeHtml, messagesList, refreshSend, resolveChatTeam, scrollChatBottom, sendBtn, setComposerTaskReference, stageSemantic, statusConversationOpeningText, taskStageArtifact };
