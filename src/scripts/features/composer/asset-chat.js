import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { showView, viewChat } from '../../core/view.js';
import { syncTogglePreviewBtn } from '../chat.js';
import { EX, xav, xesc } from '../expert/data.js';
import { applyAssetMessage, assetClarifyingQuestion, assetStarterPrompt, commitAssetDraft, newAssetDraft } from '../expert/asset-creation.js';
import { assetOwnerKey } from '../expert/layers.js';
import { hideAssetEditorPanel } from '../expert/editor-panel.js';
import { renderExpertGrid, set_teamLayer } from '../expert/library.js';
import { cvRenderExperts, set_cvExpertLayer } from '../collab/experts.js';
import { set_activePick } from '../expert/store.js';
import { appendAssistantMessage, appendUserMessage, messagesList, scrollChatBottom, setComposerTaskReference } from './messages.js';
import { closeTaskExceptionHistory } from './task-history.js';
import { activeResponseRun, activeSessionTaskId, createChatSession, renderChatSessions, saveChatSessions, set_activeResponseRun, set_activeSessionTaskId } from './sessions.js';
import { hideTaskQuestionPanel } from './task-create-chat.js';
import { openChatSession } from './session-open.js';
import { renderChatTaskSide } from './task-conversation.js';
import { closeChatDocViewer } from './doc-viewer.js';
import { chatInput, refreshChatSend } from './send.js';
/* 对话：对话式创建 / 编辑智能体与智能体团队（拆自 composer.js） */

function appendAssetCreateAgent(html,editing){
  var response=appendAssistantMessage(null);
  response.innerHTML='<div class="chat-agent-identity"><img class="task-create-avatar" src="'+xav('pm')+'" alt=""><strong>'+(editing?'智能体编辑助手':'智能体创建智能体')+'</strong><span class="chat-agent-state">对话'+(editing?'编辑':'创建')+' · 原型</span></div>'+html;
}
function assetCreateQuestionHtml(question,interactive){
  var selected=Array.isArray(question.selected)?question.selected:[];
  var options=question.options||[];
  return '<div class="asset-ask-question" role="group" aria-label="需要补充的信息"><strong>需要确认一件事</strong><p>'+xesc(question.text)+'</p>'
    +(interactive&&options.length?'<div class="asset-ask-options" role="group" aria-label="可选择的智能体">'+options.map(function(option,index){
      var expert=EX[Object.keys(EX).find(function(id){return EX[id]?.name===option;})],on=selected.includes(option);
      return '<button type="button" class="asset-ask-option'+(on?' is-selected':'')+'" data-asset-answer="'+xesc(option)+'" aria-pressed="'+on+'"><span class="asset-ask-option-index">'+(index+1)+'</span><span class="asset-ask-option-copy"><strong>'+xesc(option)+'</strong>'+(expert?.role?'<small>'+xesc(expert.role)+'</small>':'')+(expert?.desc?'<em>'+xesc(expert.desc)+'</em>':'')+'</span><span class="asset-ask-option-check" aria-hidden="true">'+(on?'✓':'')+'</span></button>';
    }).join('')+'</div><button type="button" class="asset-ask-confirm" data-asset-confirm '+(selected.length?'':'disabled')+'>选择后继续</button>':'')
    +(interactive?'<small>也可以直接在下方输入回答</small>':'')+'</div>';
}
function builderSkillChip(){
  return '<span class="builder-skill-mention" data-skill-mention="expert-builder" contenteditable="false" title="expert-builder · 创建智能体和智能体团队"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M8 12v2M16 12v2M9 17h6"/><circle cx="12" cy="2" r="1"/></svg><span>expert-builder</span></span>';
}
function builderInputText(){
  var copy=chatInput.cloneNode(true);copy.querySelectorAll('[data-skill-mention]').forEach(function(chip){chip.remove();});return copy.textContent.trim();
}
function ensureBuilderMention(){
  if(!chatInput.querySelector('[data-skill-mention="expert-builder"]'))chatInput.insertAdjacentHTML('afterbegin',builderSkillChip()+' ');
}
function renderAssetCreateChat(session){
  var draft=session.assetCreate,kindName=draft.kind==='team'?'智能体团队':'智能体';
  if(['draft','scope'].includes(draft.status)){
    draft.question=assetClarifyingQuestion(draft);
    draft.status=draft.question?'question':'ready';
  }
  messagesList.innerHTML='';
  hideTaskQuestionPanel();
  appendAssetCreateAgent('<p>请描述你想创建的'+kindName+'。信息足够时我会直接创建；需要补充时会在对话中询问。</p>');
  draft.messages.forEach(function(message,index){
    appendUserMessage(message);
    var question=draft.questions?.[index];
    if(question)appendAssetCreateAgent(assetCreateQuestionHtml(question,index===draft.messages.length-1&&draft.status==='question'));
  });
  if(draft.status==='question'&&draft.question&&!draft.questions?.[draft.messages.length-1])appendAssetCreateAgent(assetCreateQuestionHtml(draft.question,true));
  if(draft.status==='ready'||draft.status==='error')appendAssetCreateAgent('<p>'+xesc(draft.error||'已理解创建意图，正在保存…')+'</p><button type="button" class="asset-create-inline-action" data-asset-retry>重试创建</button>');
  else if(draft.status==='done')appendAssetCreateAgent('<div class="asset-create-result" data-asset-open><strong>已创建「'+xesc(draft.name)+'」</strong><p>已保存到我的'+kindName+'。点击下方卡片查看并完善配置。</p><button type="button" class="asset-create-inline-action" data-asset-open>查看'+kindName+'</button></div>');
  chatInput.contentEditable=draft.status==='done'?'false':'true';
  chatInput.setAttribute('data-placeholder',draft.status==='done'?'创建已完成':draft.status==='question'?'回答上面的问题…':'继续描述创建要求…');
  if(draft.status==='prompt'&&!draft.messages.length)chatInput.textContent=assetStarterPrompt(draft.kind);
  if(draft.status!=='done')ensureBuilderMention();
  document.getElementById('chatExpertLabel').textContent='智能体创建智能体';
  viewChat.classList.remove('preview-open');
  syncTogglePreviewBtn();
  hideAssetEditorPanel();
  refreshChatSend();
  scrollChatBottom();
}
function handleAssetCreateMessage(session,text){
  var draft=session.assetCreate;
  if(!applyAssetMessage(draft,text))return;
  if(draft.status==='ready'){
    var result=commitAssetDraft(draft,'personal');
    if(result.ok){
      if(draft.kind==='expert'){set_cvExpertLayer('personal');cvRenderExperts();}
      else{set_teamLayer('personal');renderExpertGrid();}
      toast('已创建'+(draft.kind==='team'?'智能体团队':'智能体'),'success');
    }else{draft.status='error';draft.error=result.message;}
  }
  saveChatSessions();renderChatSessions();renderAssetCreateChat(session);
}
function startAssetCreationChat(kind){
  if(kind!=='expert'&&kind!=='team')return;
  hideAssetEditorPanel();
  closeTaskExceptionHistory();
  set_activeResponseRun(activeResponseRun + 1);
  set_activeSessionTaskId(null);
  setComposerTaskReference(null);
  set_activePick({kind:'expert',id:'software-product-manager',auto:false});
  var session=createChatSession(kind==='team'?'创建智能体团队':'创建智能体',null);
  session.assetCreate=newAssetDraft(kind);
  session.ownerId=assetOwnerKey();
  saveChatSessions();
  renderChatSessions();
  showView('chat');
  closeChatDocViewer();
  $('#chatTitle').textContent=session.title;
  chatInput.innerHTML='';refreshChatSend();
  renderChatTaskSide();
  renderAssetCreateChat(session);
  refreshChatSend();
  chatInput.focus();
}
function startAssetEditChat(kind,id,name){
  if(!['expert','team'].includes(kind)||!id)return;
  closeTaskExceptionHistory();
  var session=createChatSession('编辑'+(kind==='team'?'智能体团队':'智能体')+' · '+name,null);
  session.assetEdit={kind:kind,id:id,name:name};
  session.ownerId=assetOwnerKey();
  saveChatSessions();
  openChatSession(session.id);
  chatInput.focus();
}
function renderAssetEditChat(session){
  var edit=session.assetEdit;
  messagesList.innerHTML='';
  hideTaskQuestionPanel();
  appendAssetCreateAgent('<p>正在编辑「'+xesc(edit.name)+'」。右侧是当前信息，可直接修改并保存；也可以告诉我需要调整的名称或说明。</p>',true);
  (session.exchanges||[]).forEach(function(exchange){
    appendUserMessage(exchange.prompt);
    appendAssetCreateAgent('<p>'+xesc(exchange.response||'请在右侧确认修改后保存。')+'</p>',true);
  });
  chatInput.contentEditable='true';
  chatInput.innerHTML='';
  chatInput.setAttribute('data-placeholder','描述要修改的名称或说明…');
  refreshChatSend();
  scrollChatBottom();
}

export { builderInputText, handleAssetCreateMessage, renderAssetCreateChat, renderAssetEditChat, startAssetCreationChat, startAssetEditChat };
