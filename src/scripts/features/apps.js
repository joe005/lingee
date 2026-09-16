import { $, $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { applyMode, navItems, setNavActive, showView } from '../core/view.js';
import { appDd, appDisplayName, chatAppDd, fullAppData, selectApp, selectChatApp } from './attach-app.js';
import { syncTogglePreviewBtn } from './chat.js';
import { appendAssistantMessage, appendUserMessage, messagesList, simulateAIResponse } from './composer.js';
import { renderModeTag } from './expert/chips.js';
/* 应用开发：卡片、搜索、新建下拉、新建应用弹窗、右键菜单
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 新建应用弹窗 ---------- */
var newAppModal=$('#newAppModal');
var newAppClose=$('#newAppClose');
var newAppCancel=$('#newAppCancel');
var newAppConfirm=$('#newAppConfirm');
var newAppName=$('#newAppName');
var sourceAppGroup=$('#sourceAppGroup');
var sourceAppSearch=$('#sourceAppSearch');
var sourceAppList=$('#sourceAppList');
var sourceAppChip=$('#sourceAppChip');
var sourceAppLabel=$('#sourceAppLabel');
var sourceAppMenu=$('#sourceAppMenu');
var newAppSource='home';
function openSourceAppMenu(){
  var rect=sourceAppChip.getBoundingClientRect();
  var spaceBelow=window.innerHeight-rect.bottom-20;
  var maxH=Math.min(Math.max(spaceBelow,120),300);
  sourceAppMenu.style.cssText='position:fixed;display:flex;flex-direction:column;'
    +'top:'+(rect.bottom+4)+'px;left:'+rect.left+'px;width:'+rect.width+'px;'
    +'max-height:'+maxH+'px;overflow:hidden;z-index:400;'
    +'background:#fff;border:1px solid var(--border);border-radius:10px;'
    +'box-shadow:0 8px 24px rgba(0,0,0,.12);padding:0;min-width:'+rect.width+'px';
  sourceAppSearch.value='';
  renderSourceAppList(fullAppData);
  requestAnimationFrame(function(){sourceAppSearch.focus()});
}
function closeSourceAppMenu(){ sourceAppMenu.style.display='none'; }
function renderSourceAppList(list){
  sourceAppList.innerHTML='';
  list.forEach(function(d){
    var el=document.createElement('div');
    el.className='app-item';
    el.setAttribute('data-app',d.app);
    el.innerHTML='<div class="app-item-info"><div class="app-item-name">'+appDisplayName(d,list)+'</div><div class="app-item-cloud">'+d.cloud+'</div></div>';
    el.addEventListener('click',function(){
      $$('.app-item',sourceAppList).forEach(function(i){i.classList.remove('checked')});
      el.classList.add('checked');
      sourceAppLabel.textContent=d.app;
      sourceAppChip.classList.remove('muted');
      newAppName.value=d.app;
      closeSourceAppMenu();
      newAppName.focus();
    });
    sourceAppList.appendChild(el);
  });
}
function openNewAppModal(source){
  newAppSource=source||'home';
  newAppModal.classList.add('show');
  newAppName.value='';
  var sel=$('input[name="createType"]:checked');
  if(sel) sel.checked=false;
  var firstType=$('input[name="createType"][value="new"]');
  if(firstType) firstType.checked=true;
  sourceAppGroup.style.display='none';
  closeSourceAppMenu();
  sourceAppLabel.innerHTML='&nbsp;';
  sourceAppChip.classList.add('muted');
  sourceAppSearch.value='';
  renderSourceAppList(fullAppData);
  requestAnimationFrame(function(){newAppName.focus()});
}
function closeNewAppModal(){ newAppModal.classList.remove('show'); }
/* ---------- 应用开发 新建下拉 ---------- */
var appsNewBtn=$('.apps-new-btn');
var appsNewDd=$('#appsNewDropdown');

/* ---------- 右键菜单 ---------- */
var ctxMenu=$('#ctxMenu');
var ctxTarget=null;
function showCtxMenu(e,el){
  e.preventDefault();
  ctxTarget=el;
  ctxMenu.style.left=Math.min(e.clientX,document.documentElement.clientWidth-220)+'px';
  ctxMenu.style.top=Math.min(e.clientY,document.documentElement.clientHeight-260)+'px';
  ctxMenu.classList.add('show');
}
function hideCtxMenu(){ctxMenu.classList.remove('show');ctxTarget=null;}

export function initApps() {
  /* ---------- 我的应用 (apps view) ---------- */
  $$('#view-apps .tab').forEach(function(t){
    t.addEventListener('click',function(){
      $$('#view-apps .tab').forEach(function(i){i.classList.remove('active')});
      t.classList.add('active');
    });
  });
  $('.btn-new:not(.apps-new-btn)') && $('.btn-new:not(.apps-new-btn)').addEventListener('click',function(){});
  $$('.app-card').forEach(function(c){
    c.addEventListener('click',function(e){
      if(e.target.closest('.card-more')){ e.stopPropagation(); toast('更多操作'); return; }
      var name=$('.card-title',c).textContent.trim();
      showView('chat');
      setNavActive('新会话');
      var titleEl=$('#chatTitle');
      if(titleEl) titleEl.textContent=name;
      var emptyEl=$('#chatEmpty');
      if(emptyEl) emptyEl.remove();
      /* 打开预览面板加载表单 */
      var view=document.getElementById('view-chat');
      var frame=document.getElementById('chatPreviewFrame');
      var urlInput=document.getElementById('previewUrlText');
      var url='https://feature.kingdee.com:1026/feature_vb';
      if(frame) frame.src=url;
      if(urlInput) urlInput.value=url;
      if(view) view.classList.add('preview-open');
      if(typeof syncTogglePreviewBtn==='function') syncTogglePreviewBtn();
      try{localStorage.setItem('chatPreviewOpen','1')}catch(err){}
      var savedW=localStorage.getItem('chatPreviewWidth');
      var ps=document.getElementById('chatPreviewSide');
      if(savedW&&ps){ps.style.width=savedW;ps.style.maxWidth='none';}
    });
  });

  /* ---------- 应用开发搜索 ---------- */
  (function(){
    var appsSearchInput=$('#view-apps .apps-search input');
    var appsGrid=$('#view-apps .apps-grid');
    if(!appsSearchInput||!appsGrid) return;
    var emptyMsg=document.createElement('div');
    emptyMsg.className='apps-empty';
    emptyMsg.innerHTML='<div class="apps-empty-icon"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></div><div class="apps-empty-title">未找到匹配的应用</div>';
    emptyMsg.style.display='none';
    appsGrid.appendChild(emptyMsg);
    var searchWrap=appsSearchInput.parentElement;
    var clearBtn=document.createElement('button');
    clearBtn.className='apps-search-clear';
    clearBtn.setAttribute('aria-label','清除');
    clearBtn.innerHTML='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    searchWrap.appendChild(clearBtn);
    clearBtn.addEventListener('click',function(){
      appsSearchInput.value='';
      appsSearchInput.focus();
      searchWrap.classList.remove('has-text');
      doSearch();
    });
    var composing=false;
    function doSearch(){
      var q=appsSearchInput.value.trim().toLowerCase();
      searchWrap.classList.toggle('has-text',!!q);
      var cards=$$('.app-card',appsGrid);
      var visible=0;
      cards.forEach(function(c){
        var title=($('.card-title',c)||{}).textContent||'';
        var desc=($('.card-desc',c)||{}).textContent||'';
        var tags=$$('.ptag',c).map(function(t){return t.textContent.trim();}).join(' ');
        var text=(title+' '+desc+' '+tags).toLowerCase();
        var match=!q||text.indexOf(q)>-1;
        c.style.display=match?'':'none';
        if(match) visible++;
      });
      emptyMsg.style.display=visible?'none':'block';
    }
    appsSearchInput.addEventListener('compositionstart',function(){composing=true});
    appsSearchInput.addEventListener('compositionend',function(){composing=false;doSearch()});
    appsSearchInput.addEventListener('input',function(){
      if(composing) return;
      doSearch();
    });
  })();
}

export function initNewAppModal() {
  if(sourceAppChip) sourceAppChip.addEventListener('click',function(){
    if(sourceAppMenu.style.display==='flex'){ closeSourceAppMenu(); }
    else{ openSourceAppMenu(); }
  });
  if(sourceAppMenu) sourceAppMenu.addEventListener('click',function(e){ e.stopPropagation(); });
  document.addEventListener('click',function(e){
    if(sourceAppMenu && sourceAppMenu.style.display==='flex' && !e.target.closest('#sourceAppDropdown')){
      closeSourceAppMenu();
    }
  });
  if(sourceAppSearch) sourceAppSearch.addEventListener('input',function(){
    var q=this.value.trim().toLowerCase();
    if(!q){ renderSourceAppList(fullAppData); return; }
    renderSourceAppList(fullAppData.filter(function(d){return d.app.toLowerCase().indexOf(q)>-1}));
  });
  if(newAppClose) newAppClose.addEventListener('click',closeNewAppModal);
  if(newAppCancel) newAppCancel.addEventListener('click',closeNewAppModal);
  if(newAppModal) newAppModal.addEventListener('click',function(e){
    if(e.target===newAppModal) closeNewAppModal();
  });
  // 创建类型切换
  $$('input[name="createType"]').forEach(function(r){
    r.addEventListener('change',function(){
      var val=r.value;
      sourceAppGroup.style.display=(val==='extend'||val==='inherit')?'':'none';
    });
  });
  // 确认提交
  if(newAppConfirm) newAppConfirm.addEventListener('click',function(){
    var name=newAppName.value.trim();
    var type=$('input[name="createType"]:checked');
    var typeVal=type?type.value:'new';
    if(!name){ toast('请输入应用名称'); newAppName.focus(); return; }
    if(typeVal==='extend'||typeVal==='inherit'){
      var selected=sourceAppList.querySelector('.app-item.checked');
      if(!selected){ toast('请选择已有应用'); return; }
    }
    if(newAppSource==='home'){
      selectApp(name);
      appDd.classList.remove('open');
    }else{
      selectChatApp(name);
      chatAppDd.classList.remove('open');
    }
    toast('已新建并关联应用：'+name);
    closeNewAppModal();
  });
}

export function initAppsNewDropdown() {
  if(appsNewBtn&&appsNewDd){
    appsNewBtn.addEventListener('click',function(e){
      e.stopPropagation();
      var isOpen=appsNewDd.classList.toggle('open');
      if(isOpen){
        appsNewDd.style.top='';
        appsNewDd.style.right='';
        appsNewDd.style.left='';
        appsNewDd.style.minWidth='';
      }
    });
    $$('.apps-new-item',appsNewDd).forEach(function(item){
      item.addEventListener('click',function(){
        var mode=item.getAttribute('data-mode');
        appsNewDd.classList.remove('open');
        showView('newtask');
        setNavActive(mode);
        applyMode(mode,true);
        renderModeTag();
      });
    });
    document.addEventListener('click',function(){appsNewDd.classList.remove('open')});
  }
  // 给 sub-item 和 flat-item 绑定右键
  $$('.sub-item, .flat-item').forEach(function(item){
    item.addEventListener('contextmenu',function(e){showCtxMenu(e,item);});
  });
  // 点击 Workspace 的"···"按钮打开菜单
  $$('.group-head .more').forEach(function(more){
    more.style.cursor='pointer';
    more.addEventListener('click',function(e){
      e.stopPropagation();
      var group=more.closest('.group-head');
      var title=group.querySelector('.group-title');
      var titleText=title?title.textContent.trim():'';
      ctxTarget=group;
      var rect=more.getBoundingClientRect();
      ctxMenu.style.left=Math.min(rect.right+4,document.documentElement.clientWidth-220)+'px';
      ctxMenu.style.top=Math.min(rect.bottom+4,document.documentElement.clientHeight-200)+'px';
      ctxMenu.classList.add('show');
    });
  });
  // 点击 sub-item 进入会话详情
  $$('.sub-item').forEach(function(item){
    item.addEventListener('click',function(){
      var title=item.querySelector('.txt').textContent.trim();
      showView('chat');
      $('#chatTitle').textContent=title;
      messagesList.innerHTML='';
      appendUserMessage('帮我开发'+title+'功能');
      var responseEl=appendAssistantMessage();
      simulateAIResponse(responseEl,true);
      selectChatApp('采购订单管理');
      chatAppDd.classList.add('disabled');
      navItems.forEach(function(n){n.classList.remove('active')});
    });
  });
  // 点击菜单项
  $$('.ctx-item',ctxMenu).forEach(function(item){
    item.addEventListener('click',function(){
      var action=item.getAttribute('data-ctx');
      var name=ctxTarget?ctxTarget.textContent.trim():'';
      hideCtxMenu();
      if(action==='delete') toast('已删除：'+name);
      else if(action==='rename') toast('重命名：'+name);
      else if(action==='open') toast('打开文件夹：'+name);
    });
  });
  // 点击其他地方关闭菜单
  document.addEventListener('click',function(e){
    if(!e.target.closest('.ctxmenu')) hideCtxMenu();
  });
  // ESC 关闭菜单
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape') hideCtxMenu();
  });
}

export { closeNewAppModal, closeSourceAppMenu, ctxMenu, hideCtxMenu, newAppModal, openNewAppModal, sourceAppMenu };
