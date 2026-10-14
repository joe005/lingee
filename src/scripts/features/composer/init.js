import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { input, showView, viewChat } from '../../core/view.js';
import { addBtn, attachModal, chatAddBtn, closeAttach } from '../attach-app.js';
import { syncTogglePreviewBtn } from '../chat.js';
import { commitAssetDraft } from '../expert/asset-creation.js';
import { hideAssetEditorPanel, renderAssetCreationPanel } from '../expert/editor-panel.js';
import { renderExpertGrid, set_teamLayer } from '../expert/library.js';
import { cvRenderExperts, set_cvExpertLayer } from '../collab/experts.js';
import { teamById } from '../expert/store.js';
import { set__prevWishW } from '../sidebar.js';
import { tkCanStartTask, tkGetTasks, tkProjectsForCurrentUser } from '../tasks-v2/data.js';
import { refreshSend, sendBtn, setComposerTaskReference } from './messages.js';
import { closeTaskExceptionHistory } from './task-history.js';
import { activeResponseRun, activeSessionId, activeSessionTaskId, chatSessions, collapsedChatProjects, conversationTaskId, expandedChatProjects, renderChatSessions, saveChatSessions, set_activeResponseRun } from './sessions.js';
import { confirmTaskCreate, prepareTaskCreateDraft, renderTaskCreateChat } from './task-create-chat.js';
import { handleAssetCreateMessage, renderAssetCreateChat } from './asset-chat.js';
import { openChatSession } from './session-open.js';
import { answerTaskQuestion, renderChatTaskSide, renderConversationTaskReference } from './task-conversation.js';
import { clearChatTaskSide, confirmChatStage } from './task-stage-confirm.js';
import { chatViewerActiveKey, chatViewerTabs, closeChatDocViewer, refreshMountedTaskDetail, initChatDocViewerResize, openChatTaskViewer, renderChatViewerTab, setChatDocViewerWidth, set_chatViewerActiveKey } from './doc-viewer.js';
import { chatPreviewCloseBtn, chatResizer, listBodyEl, listCheckAll, previewRefreshBtn, previewUrlInput, previewVp, renderMcpList, sortState, sortTypeMap, switchPreviewTab } from './preview.js';
import { chatDoSend, chatInput, chatSendBtn, doSend, refreshChatSend } from './send.js';
import { bindAddDropdown } from './plus-menu.js';
import { initTaskMention, taskPicker } from './task-mention.js';
import { initLocalEnvChat } from './local-env-chat.js';
/* 对话：initComposer / initPlusMenu 事件接线（拆自 composer.js），由 main.js 按原顺序调用 */

var RECENT_CHATS_COLLAPSED_KEY = 'lingee-recent-chats-collapsed-v1';
function initRecentChatsToggle() {
  var section = document.getElementById('chatSessionSection');
  var toggle = document.getElementById('chatSessionToggle');
  if (!section || !toggle) return;
  var collapsed = false;
  try { collapsed = localStorage.getItem(RECENT_CHATS_COLLAPSED_KEY) === '1'; } catch (_) {}
  function apply() {
    section.classList.toggle('collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
  }
  apply();
  toggle.addEventListener('click', function () {
    collapsed = !collapsed;
    try { localStorage.setItem(RECENT_CHATS_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch (_) {}
    apply();
  });
}
function initComposer() {
  initRecentChatsToggle();
  initLocalEnvChat();
  $('#chatTaskProjectSelect').addEventListener('change',function(event){
    var session=chatSessions.find(function(row){return row.id===activeSessionId&&row.taskCreate;});
    var projectId=event.target.value;
    if(!session||session.taskCreate.status==='done'||!tkProjectsForCurrentUser().some(function(project){return project.id===projectId;}))return;
    session.taskCreate.projectId=projectId;session.projectId=projectId;
    if(session.taskCreate.prompt){set_activeResponseRun(activeResponseRun + 1);session.taskCreate.selectedStages=null;session.taskCreate.reviewers={};prepareTaskCreateDraft(session.taskCreate);session.taskCreate.status='confirm';}
    saveChatSessions();renderChatSessions();renderTaskCreateChat(session);chatInput.focus();
  });
  /* 智能体团队跟任务走：在创建任务对话里单独选，换团队后按新团队的阶段重新生成草稿 */
  $('#chatTaskTeamSelect').addEventListener('change',function(event){
    var session=chatSessions.find(function(row){return row.id===activeSessionId&&row.taskCreate;});
    var teamId=event.target.value;
    if(!session||session.taskCreate.status==='done'||!teamById(teamId))return;
    session.taskCreate.teamId=teamId;session.teamId=teamId;
    if(session.taskCreate.prompt){set_activeResponseRun(activeResponseRun + 1);session.taskCreate.selectedStages=null;session.taskCreate.reviewers={};prepareTaskCreateDraft(session.taskCreate);session.taskCreate.status='confirm';}
    saveChatSessions();renderChatSessions();renderTaskCreateChat(session);chatInput.focus();
  });
  document.addEventListener('lingee:chat-leave',hideAssetEditorPanel);
  document.addEventListener('lingee:asset-editor-saved',function(event){
    var edit=event.detail;
    chatSessions.filter(function(session){return session.assetEdit?.kind===edit.kind&&session.assetEdit?.id===edit.id;}).forEach(function(session){
      session.assetEdit.name=edit.name;
      session.title='编辑'+(edit.kind==='team'?'智能体团队':'智能体')+' · '+edit.name;
      if(session.id===activeSessionId)$('#chatTitle').textContent=session.title;
    });
    saveChatSessions();renderChatSessions();
  });
  document.querySelector('#view-chat .chat-container').addEventListener('click', function (event) {
    var assetSession=chatSessions.find(function(row){return row.id===activeSessionId&&row.assetCreate;});
    if(assetSession){
      var draft=assetSession.assetCreate;
      var answer=event.target.closest('[data-asset-answer]');
      if(answer){
        var question=draft.question;
        question.selected=Array.isArray(question.selected)?question.selected:[];
        var value=answer.dataset.assetAnswer;
        question.selected=question.selected.includes(value)?question.selected.filter(function(item){return item!==value;}):question.selected.concat(value);
        saveChatSessions();renderAssetCreateChat(assetSession);return;
      }
      if(event.target.closest('[data-asset-confirm]')){
        var picked=Array.isArray(draft.question?.selected)?draft.question.selected:[];
        if(!picked.length)return;
        chatInput.innerHTML='';handleAssetCreateMessage(assetSession,picked.join('、'));refreshChatSend();return;
      }
      if(event.target.closest('[data-asset-retry]')){
        var result=commitAssetDraft(draft,'personal');
        if(result.ok){
          if(draft.kind==='expert'){set_cvExpertLayer('personal');cvRenderExperts();}
          else{set_teamLayer('personal');renderExpertGrid();}
          toast('已创建'+(draft.kind==='team'?'智能体团队':'智能体'),'success');
        }else{draft.status='error';draft.error=result.message;}
        saveChatSessions();renderChatSessions();renderAssetCreateChat(assetSession);return;
      }
      if(event.target.closest('[data-asset-open]')){
        if(draft.status==='done')renderAssetCreationPanel(draft);return;
      }
      if(event.target.closest('[data-asset-return]')){
        showView('collab');window.cvSwitchView?.(draft.kind==='team'?'teams':'experts');return;
      }
    }
    var creation = chatSessions.find(function (row) { return row.id === activeSessionId && row.taskCreate; });
    if (creation && event.target.closest('[data-task-create-confirm]')) { confirmTaskCreate(creation); return; }
    if (creation && event.target.closest('[data-task-create-open]')) {
      import('../tasks-v2/index.js').then(function (module) { module.openTaskDetailFromSession(creation.taskId); });
      return;
    }
    if (creation && event.target.closest('[data-task-create-run]')) {
      var task = tkGetTasks().find(function (row) { return row.id === Number(creation.taskId); });
      if (!tkCanStartTask(task)) { toast('仅当前阶段负责人可立即执行', 'warning'); return; }
      import('../tasks-v2/index.js').then(function (module) { module.startTaskExecutionFromSession(task.id); });
      return;
    }
    var option = event.target.closest('[data-task-question-option]');
    if (!option) return;
    var session = chatSessions.find(function (row) { return row.id === activeSessionId; });
    var answer = session?.demoQuestion?.options[Number(option.getAttribute('data-task-question-option'))];
    if (answer) answerTaskQuestion(answer);
  });
  renderChatSessions();
  queueMicrotask(renderChatSessions);
  document.addEventListener('lingee:auth-changed', renderChatSessions);
  document.addEventListener('lingee:sidebar-filter', renderChatSessions);
  document.getElementById('chatSessionList').addEventListener('click', function (event) {
    var entry = event.target.closest('[data-chat-session]');
    if (entry) openChatSession(entry.getAttribute('data-chat-session'));
  });
  document.getElementById('chatProjectFolders').addEventListener('click', function (event) {
    var entry = event.target.closest('[data-chat-session]');
    if (entry) { openChatSession(entry.getAttribute('data-chat-session')); return; }
    var toggle = event.target.closest('[data-chat-project-toggle]');
    if (toggle) {
      expandedChatProjects.add(toggle.getAttribute('data-chat-project-toggle'));
      renderChatSessions();
      return;
    }
    var title = event.target.closest('.chat-project-title');
    if (!title) return;
    var id = title.closest('[data-chat-project]').getAttribute('data-chat-project');
    if (collapsedChatProjects.has(id)) collapsedChatProjects.delete(id); else collapsedChatProjects.add(id);
    title.closest('.chat-project-folder').classList.toggle('collapsed', collapsedChatProjects.has(id));
    title.setAttribute('aria-expanded', String(!collapsedChatProjects.has(id)));
    setTimeout(renderChatSessions, 180);
  });
  document.addEventListener('lingee:new-conversation', closeTaskExceptionHistory);
  document.addEventListener('lingee:new-conversation', clearChatTaskSide);
  document.addEventListener('lingee:task-updated', function (event) {
    if (event.detail?.task?.id === conversationTaskId) renderConversationTaskReference();
    if (event.detail?.task?.id === activeSessionTaskId) renderChatTaskSide();
    var selected = chatViewerTabs.find(function (tab) { return tab.key === chatViewerActiveKey; });
    if (selected?.kind === 'task' && selected.taskId === event.detail?.task?.id) {
      refreshMountedTaskDetail(selected.taskId);
    }
  });
  document.getElementById('chatStageConfirmBtn').addEventListener('click', confirmChatStage);
  document.getElementById('chatCurrentStageToggle').addEventListener('click', function () {
    if (document.getElementById('chatCurrentStage').classList.contains('is-horizontal')) return;
    var details = document.getElementById('chatCurrentStageDetails');
    details.hidden = !details.hidden;
    this.setAttribute('aria-expanded', String(!details.hidden));
  });
  function openHeaderTaskDetail() {
    var task = tkGetTasks().find(function (row) { return row.id === activeSessionTaskId; });
    if (task) openChatTaskViewer(task);
  }
  document.getElementById('chatTitle').addEventListener('click', openHeaderTaskDetail);
  var chatDocViewer = document.getElementById('chatDocViewer');
  if (chatDocViewer) {
    document.getElementById('chatDocViewerClose').addEventListener('click', closeChatDocViewer);
    document.getElementById('chatDocViewerTabs').addEventListener('click', function (event) {
      var remove = event.target.closest('[data-chat-preview-close]');
      if (remove) {
        var index = Number(remove.dataset.chatPreviewClose);
        var removed = chatViewerTabs.splice(index, 1)[0];
        if (removed?.key === chatViewerActiveKey) set_chatViewerActiveKey(chatViewerTabs[Math.min(index, chatViewerTabs.length - 1)]?.key || null);
        if (chatViewerTabs.length) renderChatViewerTab(); else closeChatDocViewer();
        return;
      }
      var tab = event.target.closest('[data-chat-preview-tab]');
      if (tab) { set_chatViewerActiveKey(chatViewerTabs[Number(tab.dataset.chatPreviewTab)]?.key || null); renderChatViewerTab(); }
    });
    var chatDocResize = document.getElementById('chatDocViewerResize');
    if (chatDocResize) initChatDocViewerResize(chatDocResize, chatDocViewer);
    window.addEventListener('resize', function () {
      if (!chatDocViewer.hidden) setChatDocViewerWidth(chatDocViewer);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !chatDocViewer.hidden) closeChatDocViewer();
    });
  }
  document.addEventListener('lingee:new-conversation', function () { setComposerTaskReference(null); });
  document.addEventListener('click', function (event) {
    if (event.target.closest('#ntTags [data-clear-task-ref]')) setComposerTaskReference(null);
  });
  input.addEventListener('input',refreshSend);
  input.addEventListener('keydown',function(e){
    if(e.key==='Enter' && !e.shiftKey){
      if(taskPicker && !taskPicker.hidden) return;
      e.preventDefault(); doSend();
    }
  });
  sendBtn.addEventListener('click',doSend);
  initTaskMention(input);
  initTaskMention(chatInput);
  if(chatPreviewCloseBtn){
    chatPreviewCloseBtn.addEventListener('click',function(){
      var view=document.getElementById('view-chat');
      var ps=document.getElementById('chatPreviewSide');
      view.classList.remove('preview-open');
      if(typeof syncTogglePreviewBtn==='function') syncTogglePreviewBtn();
      try{localStorage.setItem('chatPreviewOpen','0')}catch(e){}
      if(ps){ps.style.width='';ps.style.maxWidth='';}
    });
  }
  $$('.preview-tab').forEach(function(tab){
    tab.addEventListener('click',function(){
      switchPreviewTab(tab.getAttribute('data-tab'));
    });
  });
  renderMcpList();
  if(listBodyEl){
    listBodyEl.addEventListener('change',function(e){
      if(e.target.tagName!=='INPUT'||e.target.type!=='checkbox')return;
      var tr=e.target.closest('tr');
      if(!tr)return;
      tr.classList.toggle('on',e.target.checked);
    });
  }
  if(listCheckAll&&listBodyEl){
    listCheckAll.addEventListener('change',function(){
      var checked=listCheckAll.checked;
      $$('input[type=checkbox]',listBodyEl).forEach(function(cb){
        cb.checked=checked;
        var tr=cb.closest('tr');
        if(tr)tr.classList.toggle('on',checked);
      });
    });
  }
  $$('.list-table th.sortable').forEach(function(th){
    th.addEventListener('click',function(){
      var col=parseInt(th.getAttribute('data-col'),10);
      if(sortState.col===col){
        if(sortState.dir==='asc')sortState.dir='desc';
        else if(sortState.dir==='desc'){sortState.dir='';sortState.col=-1;}
        else sortState.dir='asc';
      }else{
        sortState.col=col;sortState.dir='asc';
      }
      $$('.list-table th.sortable').forEach(function(h){
        h.classList.remove('sort-asc','sort-desc');
        var arrow=h.querySelector('.sort-arrow');
        if(arrow)arrow.className='sort-arrow';
      });
      if(sortState.dir){
        th.classList.add('sort-'+sortState.dir);
        var arrow=th.querySelector('.sort-arrow');
        if(arrow)arrow.className='sort-arrow '+sortState.dir;
      }
      if(sortState.col>=0&&sortState.dir){
        var rows=Array.prototype.slice.call(listBodyEl.querySelectorAll('tr'));
        var type=sortTypeMap[sortState.col]||'text';
        rows.sort(function(a,b){
          var ca=a.children[sortState.col+1].textContent.trim();
          var cb=b.children[sortState.col+1].textContent.trim();
          var va,vb;
          if(type==='num'){
            va=parseFloat(ca.replace(/,/g,''))||0;
            vb=parseFloat(cb.replace(/,/g,''))||0;
          }else if(type==='date'){
            va=new Date(ca).getTime();
            vb=new Date(cb).getTime();
          }else{
            va=ca;vb=cb;
          }
          if(va<vb)return sortState.dir==='asc'?-1:1;
          if(va>vb)return sortState.dir==='asc'?1:-1;
          return 0;
        });
        rows.forEach(function(r){listBodyEl.appendChild(r)});
      }
    });
  });
  /* 实体节点切换 */
  $$('.entity-left-item').forEach(function(node){
    node.addEventListener('click',function(){
      $$('.entity-left-item').forEach(function(n){n.classList.remove('active')});
      node.classList.add('active');
    });
  });
  if(previewVp){
    previewVp.addEventListener('click',function(){
      var mobile=!previewVp.classList.contains('mobile');
      previewVp.classList.toggle('mobile',mobile);
      previewVp.setAttribute('aria-pressed',mobile?'true':'false');
      previewVp.setAttribute('data-tooltip',mobile?'切换到桌面尺寸':'切换到移动尺寸');
      var body=$('#previewBodyPreview');
      if(body) body.classList.toggle('vp-mobile',mobile);
    });
  }
  if(previewUrlInput){
    previewUrlInput.addEventListener('focus',function(){ this.select(); });
    previewUrlInput.addEventListener('keydown',function(e){
      if(e.key==='Enter'){
        var v=this.value.trim();
        if(!v) return;
        if(!/^[a-z][a-z0-9+.-]*:/i.test(v)) v='https://'+v;
        this.value=v;
        var f=$('#chatPreviewFrame');
        if(f){ var cur=f.getAttribute('src'); if(cur&&cur!==v) f.src=v; else f.src=v; }
        this.blur();
      }else if(e.key==='Escape'){
        this.blur();
      }
    });
  }
  if(previewRefreshBtn){
    previewRefreshBtn.addEventListener('click',function(){
      var frame=document.getElementById('chatPreviewFrame');
      if(frame&&frame.src){frame.src=frame.src}
    });
  }
  if(chatResizer){
    var _dragging=false;
    var _startX=0;
    var _startW=0;
    var _maxW=0;
    chatResizer.addEventListener('mousedown',function(e){
      _dragging=true;
      chatResizer.classList.add('dragging');
      document.body.style.cursor='col-resize';
      document.body.style.userSelect='none';
      var view=document.getElementById('view-chat');
      var ps=document.getElementById('chatPreviewSide');
      var cc=view.querySelector('.chat-container');
      view.classList.add('resizing');
      _startX=e.clientX;
      _startW=ps.offsetWidth;
      _maxW=view.offsetWidth-360-chatResizer.offsetWidth;
      if(_maxW<200)_maxW=200;
      if(cc)cc.style.minWidth='0';
      e.preventDefault();
    });
    document.addEventListener('mousemove',function(e){
      if(!_dragging)return;
      var delta=_startX-e.clientX;
      var w=_startW+delta;
      if(w<200)w=200;
      if(w>_maxW)w=_maxW;
      document.getElementById('chatPreviewSide').style.width=w+'px';
    });
    document.addEventListener('mouseup',function(){
      if(_dragging){
        _dragging=false;
        chatResizer.classList.remove('dragging');
        var view=document.getElementById('view-chat');
        view.classList.remove('resizing');
        var cc=view.querySelector('.chat-container');
        if(cc)cc.style.minWidth='';
        document.body.style.cursor='';
        document.body.style.userSelect='';
        var ps=document.getElementById('chatPreviewSide');
        set__prevWishW(null);
        if(ps&&ps.style.width)localStorage.setItem('chatPreviewWidth',ps.style.width);
      }
    });
  }
  /* 所有下拉面板关闭时恢复焦点到输入框 */
  $$('.dropdown').forEach(function(dd){
    new MutationObserver(function(mutations){
      mutations.forEach(function(m){
        if(m.attributeName==='class'){
          var wasOpen=m.oldValue&&m.oldValue.indexOf('open')>-1;
          if(wasOpen&&!dd.classList.contains('open')){
            if(!viewChat.classList.contains('hidden')){ chatInput.focus(); }
            else{ input.focus(); }
          }
        }
      });
    }).observe(dd,{attributes:true,attributeFilter:['class'],attributeOldValue:true});
  });
  chatInput.addEventListener('input',function(){
    refreshChatSend();
    if((this.textContent||'').trim()==='') this.innerHTML='';
  });
  chatInput.addEventListener('keydown',function(e){
    if(e.key==='Enter' && !e.shiftKey){
      if(taskPicker && !taskPicker.hidden) return;
      e.preventDefault(); chatDoSend();
    }
  });
  chatSendBtn.addEventListener('click',chatDoSend);
}

function initPlusMenu() {
  bindAddDropdown(addBtn);
  bindAddDropdown(chatAddBtn);
  $('.modal-close',attachModal) && $('.modal-close',attachModal).addEventListener('click',closeAttach);
  attachModal.addEventListener('click',function(e){
    if(e.target===attachModal) closeAttach();
  });
  $$('.attach-item',attachModal).forEach(function(item){
    item.addEventListener('click',function(){
      var name=$('.attach-name',item).textContent.trim();
      closeAttach();
      toast('已选择：'+name);
    });
  });

  /* header + footer small affordances */
  $$('.sb-head-icons .ic').forEach(function(i,idx){ i.addEventListener('click',function(){ toast(idx===0?'搜索':'折叠侧栏'); }); });
}

export { initComposer, initPlusMenu };
