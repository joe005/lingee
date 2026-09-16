import { $, $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { openNewAppModal } from './apps.js';
import { closeAll } from './dropdown.js';
/* 关联应用（新会话 + 会话页）与附件弹窗
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 关联应用 (搜索+两列列表) ---------- */
var appDd=$('#appDropdown');
var appChip=$('[data-chip]',appDd);
var appLabel=$('.chip-label',appDd);
var appSearchInput=$('#appSearchInput');
var appList=$('#appList');
var appItems=$$('.app-item',appList);
var fullAppData=[
  {app:'采购订单管理',code:'po_mgmt',cloud:'供应链云'},
  {app:'报价单管理',code:'quote_mgmt',cloud:'供应链云'},
  {app:'资产领用',code:'asset_use',cloud:'财务云'},
  {app:'请假管理',code:'leave_mgmt',cloud:'人力云'},
  {app:'库存领用',code:'stock_use',cloud:'供应链云'},
  {app:'费用报销单',code:'expense_reim',cloud:'财务云'},
  {app:'销售合同',code:'sales_contract',cloud:'合同云'},
  {app:'员工入职',code:'emp_onboard',cloud:'人力云'},
  {app:'出差申请',code:'travel_req',cloud:'费用云'},
  {app:'付款申请单',code:'pay_req',cloud:'财务云'},
  {app:'采购入库单',code:'po_inbound',cloud:'供应链云'},
  {app:'销售订单',code:'sales_order',cloud:'供应链云'},
  {app:'项目立项',code:'project_init',cloud:'项目云'},
  {app:'项目立项',code:'project_init_v2',cloud:'项目云'},
  {app:'固定资产',code:'fixed_asset',cloud:'财务云'},
  {app:'库存盘点',code:'stock_count',cloud:'供应链云'},
  {app:'应收单',code:'ar_bill',cloud:'财务云'},
  {app:'应付单',code:'ap_bill',cloud:'财务云'},
  {app:'考勤汇总',code:'attend_sum',cloud:'人力云'},
  {app:'预算编制',code:'budget_plan',cloud:'预算云'},
  {app:'银行对账单',code:'bank_recon',cloud:'财务云'}
];
function appDisplayName(d,list){
  var dup=list.filter(function(x){return x.app===d.app;}).length>1;
  return dup&&d.code?(d.app+' ('+d.code+')'):d.app;
}
var recentApps=[]; // 最多5个
function buildAppList(){
  appList.innerHTML='';
  fullAppData.forEach(function(d){
    var el=document.createElement('div'); el.className='app-item'; el.setAttribute('data-app',d.app);
    el.setAttribute('tabindex','-1');
    el.innerHTML='<div class="app-item-info"><div class="app-item-name">'+d.app+'</div><div class="app-item-cloud">'+d.cloud+'</div></div>';
    appList.appendChild(el);
  });
  appItems=$$('.app-item',appList);
  appItems.forEach(function(item){
    item.addEventListener('click',function(e){
      e.stopPropagation();
      var v=item.getAttribute('data-app');
      selectApp(v); toast('已关联应用：'+v);
      appDd.classList.remove('open');
    });
  });
}
function renderAppList(list){
  appList.innerHTML='';
  var currentApp=appLabel.textContent.trim();
  list.forEach(function(d){
    var el=document.createElement('div'); el.className='app-item'; el.setAttribute('data-app',d.app);
    el.setAttribute('tabindex','-1');
    if(d.app===currentApp) el.classList.add('checked');
    el.innerHTML='<div class="app-item-info"><div class="app-item-name">'+appDisplayName(d,list)+'</div><div class="app-item-cloud">'+d.cloud+'</div></div>';
    el.addEventListener('click',function(e){
      e.stopPropagation();
      selectApp(d.app); toast('已关联应用：'+d.app);
      appDd.classList.remove('open');
    });
    appList.appendChild(el);
  });
  appItems=$$('.app-item',appList);
}
function filterApps(q){
  q=q.trim().toLowerCase();
  if(!q){
    renderAppList(fullAppData);
    return;
  }
  var matched=fullAppData.filter(function(d){return d.app.toLowerCase().indexOf(q)>-1});
  renderAppList(matched);
  if(!matched.length){
    var empty=document.createElement('div'); empty.className='app-item-empty'; empty.textContent='无匹配应用';
    appList.appendChild(empty);
  }
  focusAppItem(0);
}
var appFocusedIdx=0;
function focusAppItem(idx){
  var visible=appItems.filter(function(i){return i.style.display!=='none'});
  if(!visible.length) return;
  if(idx<0) idx=visible.length-1;
  if(idx>=visible.length) idx=0;
  visible.forEach(function(i){i.classList.remove('focused')});
  visible[idx].classList.add('focused');
  appFocusedIdx=idx;
  visible[idx].scrollIntoView({block:'nearest'});
}
function getVisibleAppItems(){ return appItems.filter(function(i){return i.style.display!=='none'}); }
// 打开菜单时清空搜索，显示全量
function openAppDropdown(){
  closeAll(appDd);
  appDd.classList.add('open');
  appSearchInput.value='';
  renderAppList(fullAppData);
  requestAnimationFrame(function(){
    appSearchInput.focus();
  });
}
var appHoverT=null;
function selectApp(name){
  appDd.classList.remove('error');
  appItems.forEach(function(i){i.classList.remove('checked')});
  if(name){
    var it=$('.app-item[data-app="'+name+'"]',appDd); if(it) it.classList.add('checked');
    appLabel.textContent=name; appChip.classList.remove('muted'); appChip.classList.add('selected');
    // 加入最近列表
    recentApps=recentApps.filter(function(a){return a.app!==name});
    var d=fullAppData.filter(function(f){return f.app===name})[0];
    if(d) recentApps.unshift(d);
    if(recentApps.length>5) recentApps.pop();
  }else{
    appLabel.textContent='关联应用'; appChip.classList.add('muted'); appChip.classList.remove('selected');
  }
}
/* 新建按钮（底部固定） */
var expandAppBtn=$('#expandAppBtn');
var chatExpandAppBtn=$('#chatExpandAppBtn');
/* ---------- 会话页关联应用 (搜索+列表) ---------- */
var chatAppDd=$('#chatAppDropdown');
var chatAppChip=$('[data-chip]',chatAppDd);
var chatAppLabel=$('.chip-label',chatAppDd);
var chatAppSearchInput=$('#chatAppSearchInput');
var chatAppList=$('#chatAppList');
var chatAppItems=[];
var chatRecentApps=[];
function renderChatAppList(list){
  chatAppList.innerHTML='';
  var currentApp=chatAppLabel.textContent.trim();
  list.forEach(function(d){
    var el=document.createElement('div'); el.className='app-item'; el.setAttribute('data-app',d.app);
    el.setAttribute('tabindex','-1');
    if(d.app===currentApp) el.classList.add('checked');
    el.innerHTML='<div class="app-item-info"><div class="app-item-name">'+appDisplayName(d,list)+'</div><div class="app-item-cloud">'+d.cloud+'</div></div>';
    el.addEventListener('click',function(e){
      e.stopPropagation();
      selectChatApp(d.app); toast('已关联应用：'+d.app);
      chatAppDd.classList.remove('open');
    });
    chatAppList.appendChild(el);
  });
  chatAppItems=$$('.app-item',chatAppList);
}
function filterChatApps(q){
  q=q.trim().toLowerCase();
  if(!q){
    renderChatAppList(fullAppData);
    return;
  }
  var matched=fullAppData.filter(function(d){return d.app.toLowerCase().indexOf(q)>-1});
  renderChatAppList(matched);
  if(!matched.length){
    var empty=document.createElement('div'); empty.className='app-item-empty'; empty.textContent='无匹配应用';
    chatAppList.appendChild(empty);
  }
  focusChatAppItem(0);
}
var chatAppFocusedIdx=0;
function focusChatAppItem(idx){
  var visible=chatAppItems.filter(function(i){return i.style.display!=='none'});
  if(!visible.length) return;
  if(idx<0) idx=visible.length-1;
  if(idx>=visible.length) idx=0;
  visible.forEach(function(i){i.classList.remove('focused')});
  visible[idx].classList.add('focused');
  chatAppFocusedIdx=idx;
  visible[idx].scrollIntoView({block:'nearest'});
}
function getVisibleChatAppItems(){ return chatAppItems.filter(function(i){return i.style.display!=='none'}); }
function openChatAppDropdown(){
  closeAll(chatAppDd);
  chatAppDd.classList.add('open');
  chatAppSearchInput.value='';
  renderChatAppList(fullAppData);
  requestAnimationFrame(function(){
    chatAppSearchInput.focus();
  });
}
var chatAppHoverT=null;
function selectChatApp(name){
  chatAppDd.classList.remove('error');
  chatAppItems.forEach(function(i){i.classList.remove('checked')});
  if(name){
    var it=$('.app-item[data-app="'+name+'"]',chatAppDd); if(it) it.classList.add('checked');
    chatAppLabel.textContent=name; chatAppChip.classList.remove('muted'); chatAppChip.classList.add('selected');
    chatRecentApps=chatRecentApps.filter(function(a){return a.app!==name});
    var d=fullAppData.filter(function(f){return f.app===name})[0];
    if(d) chatRecentApps.unshift(d);
    if(chatRecentApps.length>5) chatRecentApps.pop();
  }else{
    chatAppLabel.textContent='关联应用'; chatAppChip.classList.add('muted'); chatAppChip.classList.remove('selected');
  }
}
/* ---------- 附件弹窗 ---------- */
var attachModal=$('#attachModal');
var addBtn=$('.round-btn[aria-label="add"]');
var chatAddBtn=$('.round-btn[aria-label="chat-add"]');
function openAttach(){
  closeAll(null);
  attachModal.classList.add('show');
}
function closeAttach(){
  attachModal.classList.remove('show');
}
function openFilePicker(){
  var fi=document.createElement('input');
  fi.type='file';
  fi.addEventListener('change',function(){
    if(fi.files.length>0) toast('已选择文件：'+fi.files[0].name);
  });
  fi.click();
}

export function initAttachApp() {
  buildAppList();
  appSearchInput.addEventListener('input',function(){ filterApps(this.value); });
  appSearchInput.addEventListener('keydown',function(e){
    if(e.key==='Escape'){ appDd.classList.remove('open'); return; }
    if(e.key==='ArrowDown' || e.key==='ArrowDown2' || e.key==='ArrowUp'){
      e.preventDefault();
      var visible=getVisibleAppItems();
      if(!visible.length) return;
      var next=appFocusedIdx+(e.key==='ArrowDown'?1:-1);
      focusAppItem(next);
      return;
    }
    if(e.key==='Enter'){
      e.preventDefault();
      var visible=getVisibleAppItems();
      if(visible.length) visible[appFocusedIdx].click();
    }
  });
  appDd.addEventListener('mouseenter',function(){
    clearTimeout(appHoverT);
    appHoverT=setTimeout(function(){ openAppDropdown(); },300);
  });
  appDd.addEventListener('mouseleave',function(){
    clearTimeout(appHoverT);
    appDd._closeT=setTimeout(function(){
      if(!appDd.querySelector(':hover')) appDd.classList.remove('open');
    },200);
  });
  if(expandAppBtn){
    expandAppBtn.addEventListener('click',function(e){
      e.stopPropagation();
      openNewAppModal('home');
    });
  }
  if(chatExpandAppBtn){
    chatExpandAppBtn.addEventListener('click',function(e){
      e.stopPropagation();
      openNewAppModal('chat');
    });
  }
  chatAppSearchInput.addEventListener('input',function(){ filterChatApps(this.value); });
  chatAppSearchInput.addEventListener('keydown',function(e){
    if(e.key==='Escape'){ chatAppDd.classList.remove('open'); return; }
    if(e.key==='ArrowDown' || e.key==='ArrowUp'){
      e.preventDefault();
      var visible=getVisibleChatAppItems();
      if(!visible.length) return;
      var next=chatAppFocusedIdx+(e.key==='ArrowDown'?1:-1);
      focusChatAppItem(next);
      return;
    }
    if(e.key==='Enter'){
      e.preventDefault();
      var visible=getVisibleChatAppItems();
      if(visible.length) visible[chatAppFocusedIdx].click();
    }
  });
  chatAppDd.addEventListener('mouseenter',function(){
    clearTimeout(chatAppHoverT);
    chatAppHoverT=setTimeout(function(){ openChatAppDropdown(); },300);
  });
  chatAppDd.addEventListener('mouseleave',function(){
    clearTimeout(chatAppHoverT);
    chatAppDd._closeT=setTimeout(function(){
      if(!chatAppDd.querySelector(':hover')) chatAppDd.classList.remove('open');
    },200);
  });
}

export function initAttachModal() {

}

export { addBtn, appChip, appDd, appDisplayName, attachModal, chatAddBtn, chatAppDd, closeAttach, fullAppData, openAppDropdown, openFilePicker, selectApp, selectChatApp };
