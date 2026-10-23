import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { input, showView } from '../../core/view.js';
import { appChip, appDd, chatAppDd, selectChatApp } from '../attach-app.js';
import { appendAskCard, appendAutoNote, autoMatch } from '../expert/automatch.js';
import { renderExpertChips } from '../expert/chips.js';
import { pendingInputs } from '../expert/data.js';
import { pickValid, set_activePick } from '../expert/store.js';
import { tkGetTasks } from '../tasks-v2/data.js';
import { appendAssistantMessage, appendUserMessage, messagesList, refreshSend, resolveChatTeam } from './messages.js';
import { closeTaskExceptionHistory } from './task-history.js';
import { activeResponseRun, activeSessionId, activeSessionTaskId, addSessionExchange, chatSessions, createChatSession, finishSessionExchange, renderChatSessions, saveChatSessions, set_activeResponseRun, set_activeSessionTaskId } from './sessions.js';
import { answerTaskCreateMessage, hideTaskQuestionPanel } from './task-create-chat.js';
import { builderInputText, handleAssetCreateMessage, renderAssetEditChat } from './asset-chat.js';
import { answerTaskQuestion, getConversationTask, renderChatTaskSide, renderConversationTaskReference } from './task-conversation.js';
import { chatViewerActiveKey, chatViewerTabs, closeChatDocViewer, set_chatViewerActiveKey, set_chatViewerTabs } from './doc-viewer.js';
import { simulateAIResponse } from './stream.js';
import { handleLocalEnvSend } from './local-env-chat.js';
/* 对话：新会话与对话页的发送、发送拦截器（拆自 composer.js） */

/* 演示流程（如新会话里用智能体开发创建设备故障诊断助手）可接管首页发送；返回 true 表示已处理 */
var newtaskSendInterceptor=null;
function setNewtaskSendInterceptor(fn){ newtaskSendInterceptor=typeof fn==='function'?fn:null; }
function doSend(automatic){
  var t=input.textContent.trim();
  if(!t){ input.focus(); return; }
  /* 苍穹应用模式未选择关联应用时拦截；带任务关联的会话不依赖关联应用 */
  var modeEl=$('.mode-item.checked');
  var currentMode=modeEl?modeEl.getAttribute('data-val'):'';
  if(automatic !== true && newtaskSendInterceptor && !getConversationTask() && newtaskSendInterceptor(t, currentMode)){ input.innerHTML=''; refreshSend(); return; }
  if(automatic !== true && currentMode==='苍穹应用' && appChip.classList.contains('muted') && !getConversationTask()){
    toast('请先选择关联应用','error');
    appDd.classList.remove('error');
    void appDd.offsetWidth;
    appDd.classList.add('error');
    return;
  }
  var autoPicked=false;
  /* 已选开发快捷卡片由对应 builder 承接，不再叠加关键词匹配的专家团。 */
  if(!pickValid()&&!currentMode){
    var am=autoMatch(t);
    if(am){ set_activePick(am); renderExpertChips(); autoPicked=true; }
  }
  showView('chat');
  var linkedTask = getConversationTask();
  messagesList.innerHTML = '';
  hideTaskQuestionPanel();
  set_activeSessionTaskId(linkedTask ? linkedTask.id : null);
  set_activeResponseRun(activeResponseRun + 1);
  closeChatDocViewer();
  set_chatViewerTabs([]);
  set_chatViewerActiveKey(null);
  $('#chatTitle').textContent = linkedTask ? linkedTask.title : t.slice(0, 60);
  var session = createChatSession($('#chatTitle').textContent, activeSessionTaskId);
  var exchangeIndex = addSessionExchange(t);
  renderChatTaskSide();
  renderConversationTaskReference();
  var empty=$('#chatEmpty');
  if(empty) empty.remove();
  appendUserMessage(t);
  if(autoPicked) appendAutoNote();
  input.innerHTML=''; refreshSend();
  var pend=linkedTask ? [] : pendingInputs(t);
  if(pend.length && appendAskCard(pend)){
    /* 缺输入就停在追问上，确认完再执行 */
    session.exchanges[exchangeIndex].waiting = true;
    saveChatSessions();
    renderChatSessions();
  }else{
    var responseEl=appendAssistantMessage(resolveChatTeam(session, linkedTask));
    simulateAIResponse(responseEl,false,linkedTask,t,function () { finishSessionExchange(session.id, exchangeIndex); });
  }
  chatInput.innerHTML='';
  var chatSend=$('#chatSendBtn');
  chatSend.classList.remove('active');
  chatInput.focus();
  if (linkedTask) {
    selectChatApp('');
    chatAppDd.classList.remove('disabled');
  } else {
    /* 独立演示会话沿用示例应用。 */
    selectChatApp('采购订单管理');
    chatAppDd.classList.add('disabled');
  }
}

function startTaskConversationSimulation(taskId) {
  if (getConversationTask()?.id !== taskId) return;
  var task = getConversationTask();
  input.textContent = task.desc || task.title || '开始执行任务';
  refreshSend();
  doSend(true);
}

/* 任务「开始执行」等入口直接以指定文本发起会话：不进输入框，落到聊天页即运行中 */
function sendComposerText(text){
  text=String(text||'').trim();
  if(!text) return;
  closeTaskExceptionHistory();
  input.textContent=text;
  refreshSend();
  doSend();
}

/* ---------- chat composer 发送 ---------- */
var chatInput=$('#chatInput');
var chatSendBtn=$('#chatSendBtn');
function refreshChatSend(){ chatSendBtn.classList.toggle('active', builderInputText().length>0); }
/* 演示流程（如智能体开发）可临时接管会话发送；返回 true 表示已处理 */
var chatSendInterceptor=null;
function setChatSendInterceptor(fn){ chatSendInterceptor=typeof fn==='function'?fn:null; }
function chatDoSend(){
  var t=builderInputText();
  if(!t){ chatInput.focus(); return; }
  if(chatSendInterceptor&&chatSendInterceptor(t)){ chatInput.innerHTML=''; refreshChatSend(); return; }
  if(handleLocalEnvSend(t)){ chatInput.innerHTML=''; refreshChatSend(); chatInput.focus(); return; }
  var assetEditing=chatSessions.find(function(row){return row.id===activeSessionId&&row.assetEdit;});
  if(assetEditing){
    var edit=assetEditing.assetEdit;
    var field=/^(?:把|将)?(?:智能体|智能体团队|数字员工|智能体团队|智能体)?(?:的)?(名称|名字|简介|说明|描述)(?:改为|改成|修改为|设为|设置为|：|:|是)\s*[「“]?(.+?)[」”]?\s*$/.exec(t);
    var target=field&&(field[1]==='名称'||field[1]==='名字'?(edit.kind==='team'?'teamName':'xeName'):(edit.kind==='team'?'teamDesc':'xeDesc'));
    var inputEl=target&&document.getElementById(target);
    if(inputEl){inputEl.value=field[2].replace(/^[「“]|[」”]$/g,'').trim();inputEl.dispatchEvent(new Event('input',{bubbles:true}));}
    var response=inputEl?'已在右侧更新'+(field[1]==='名称'||field[1]==='名字'?'名称':'说明')+'，请确认并保存。':'你可以在右侧修改完整配置；对话支持“名称改为…”或“说明改为…”。';
    assetEditing.exchanges.push({prompt:t,response:response});
    saveChatSessions();
    chatInput.innerHTML='';renderAssetEditChat(assetEditing);chatInput.focus();return;
  }
  var assetCreation=chatSessions.find(function(row){return row.id===activeSessionId&&row.assetCreate;});
  if(assetCreation){
    if(assetCreation.assetCreate.status==='done')return;
    chatInput.innerHTML='';
    handleAssetCreateMessage(assetCreation,t);
    refreshChatSend();chatInput.focus();return;
  }
  var creation = chatSessions.find(function (row) { return row.id === activeSessionId && row.taskCreate; });
  if (creation) { if (answerTaskCreateMessage(creation, t)) { chatInput.innerHTML=''; refreshChatSend(); } chatInput.focus(); return; }
  if (answerTaskQuestion(t)) { chatInput.innerHTML=''; refreshChatSend(); return; }
  var session = chatSessions.find(function (row) { return row.id === activeSessionId; }) || createChatSession($('#chatTitle').textContent || t.slice(0, 60),activeSessionTaskId);
  var exchangeIndex = addSessionExchange(t);
  renderChatTaskSide();
  var empty=$('#chatEmpty');
  if(empty) empty.remove();
  appendUserMessage(t);
  chatInput.innerHTML=''; refreshChatSend();
  var task = tkGetTasks().find(function (row) { return row.id === activeSessionTaskId; });
  var responseEl=appendAssistantMessage(resolveChatTeam(session, task));
  set_activeResponseRun(activeResponseRun + 1);
  simulateAIResponse(responseEl,false,task,t,function () { finishSessionExchange(session.id, exchangeIndex); });
  chatInput.focus();
}

export { chatDoSend, chatInput, chatSendBtn, doSend, refreshChatSend, sendComposerText, setChatSendInterceptor, setNewtaskSendInterceptor, startTaskConversationSimulation };
