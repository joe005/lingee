import { $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { showView } from '../core/view.js';
import { closeAll } from './dropdown.js';
import { getEnvOptions } from './env.js';
/* 输入框里的 ERP 环境选择器：标签行「环境」芯片 + 「＋」菜单 → 连接器里的「金蝶 ERP」分组（展开即环境实例）。
   新会话页和会话页共用同一份环境列表与当前选择；列表来自 env.js 的 getEnvOptions()，
   当前环境 == 设置页里「启用」的那个环境（同一时间只能启用一个）；选择其他环境即启用它、禁用原来的，
   先弹确认。启用 / 新增 / 重新授权通过 lingee:env-enable / env-create / env-reauth 事件交给 env.js，不直接碰设置页。 */

var envs=[];
var currentName='';
/* 点了需要授权的环境后，等授权成功再选中 */
var awaitingReauth='';

var CHECK_ICON='<svg class="env-pick-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
var PENDING_ACTION={expired:'重新授权',revoked:'重新授权',none:'去授权'};
var PENDING_REASON={expired:'授权已失效',revoked:'已断开连接',none:'尚未完成授权'};

function findEnv(name){
  return envs.filter(function(e){ return e.name===name; })[0]||null;
}
function escHtml(text){
  return String(text).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; });
}
function hostOf(url){
  return String(url).replace(/^[a-z]+:\/\//i,'').replace(/\/.*$/,'');
}
/* 当前环境就是启用的那个；没有启用的环境时为空 */
function ensureCurrent(){
  var enabled=envs.filter(function(e){ return e.enabled; })[0];
  currentName=enabled?enabled.name:'';
}

function itemHtml(env){
  var cls='app-item env-pick-item'+(env.name===currentName?' checked':'')+(env.pending?' is-pending':'');
  var tags=(env.source==='cloud'?'<span class="env-pick-tag cloud">云端</span>':'');
  var meta=env.pending
    ?'<span class="env-pick-meta warn">'+PENDING_ACTION[env.pending]+'</span>'
    :'<span class="env-pick-meta">'+escHtml(hostOf(env.url))+'</span>';
  var title=env.pending?PENDING_REASON[env.pending]+'，点击'+PENDING_ACTION[env.pending]:env.url;
  return '<div class="'+cls+'" role="option" tabindex="-1" aria-selected="'+(env.name===currentName)+'" data-env="'+escHtml(env.name)+'" title="'+escHtml(title)+'">'
    +'<div class="app-item-info"><div class="env-pick-name"><span class="env-pick-name-text">'+escHtml(env.name)+'</span>'+tags+'</div>'+meta+CHECK_ICON+'</div></div>';
}

function renderList(root){
  var list=root.querySelector('.env-pick-list, .app-list');
  if(!list) return;
  var input=root.querySelector('.app-search input, .env-pick-search input');
  var q=input?input.value.trim().toLowerCase():'';
  var matched=envs.filter(function(e){
    return !q||e.name.toLowerCase().indexOf(q)>-1||e.url.toLowerCase().indexOf(q)>-1;
  });
  if(!envs.length) list.innerHTML='<div class="app-item-empty">还没有 ERP 环境</div>';
  else if(!matched.length) list.innerHTML='<div class="app-item-empty">无匹配环境</div>';
  else list.innerHTML=matched.map(itemHtml).join('');
}

function renderChip(root){
  var chip=root.querySelector('[data-chip]');
  var label=root.querySelector('.chip-label');
  if(!chip||!label) return;
  var cur=findEnv(currentName);
  var empty=!envs.length;
  root.classList.toggle('is-empty',empty);
  root.classList.toggle('is-warn',empty||!cur||!!cur.pending);
  if(empty){
    label.textContent='配置环境';
    chip.setAttribute('aria-label','配置 ERP 环境');
  }else{
    label.textContent=cur?cur.name:'未启用环境';
    chip.setAttribute('aria-label','ERP 环境：'+(cur?cur.name:'未启用')+(cur&&cur.pending?'（'+PENDING_REASON[cur.pending]+'）':''));
  }
  var warn=root.querySelector('.env-pick-warn');
  if(warn) warn.textContent=!empty&&cur&&cur.pending?PENDING_REASON[cur.pending]:'';
}

/* 「金蝶 ERP」连接器：没有环境时只显示「连接」，有环境时显示当前环境并可展开实例列表 */
function renderGroup(root){
  var cur=findEnv(currentName);
  var empty=!envs.length;
  root.classList.toggle('is-empty',empty);
  root.classList.toggle('is-warn',!!(cur&&cur.pending)||(!cur&&!empty));
  var head=root.querySelector('[data-env-toggle]');
  if(head){
    head.setAttribute('aria-expanded',!empty&&root.classList.contains('expanded')?'true':'false');
    if(empty) head.removeAttribute('role'); else head.setAttribute('role','button');
  }
}

function renderAll(){
  $$('[data-env-picker]').forEach(function(root){
    renderList(root);
    if(root.querySelector('[data-chip]')) renderChip(root);
    var state=root.querySelector('[data-env-state]');
    if(state) state.textContent=currentName||(envs.length?'未启用':'');
    if(root.classList.contains('env-pick-group')) renderGroup(root);
  });
}

function refresh(){
  envs=getEnvOptions();
  ensureCurrent();
  renderAll();
  /* 重新授权成功后接着走启用流程 */
  if(awaitingReauth){
    var target=findEnv(awaitingReauth);
    if(!target){ awaitingReauth=''; }
    else if(!target.pending){ var name=awaitingReauth; awaitingReauth=''; choose(name); }
  }
}

/* 选择即启用：已是启用环境就什么都不做；已有其他启用环境时先确认，因为会禁用它 */
function choose(name){
  var env=findEnv(name);
  if(!env) return;
  closeAll(null);
  if(env.pending){
    awaitingReauth=name;
    document.dispatchEvent(new CustomEvent('lingee:env-reauth',{detail:{name:name}}));
    return;
  }
  if(env.enabled) return;
  var other=envs.filter(function(e){ return e.enabled; })[0];
  if(other) openEnableConfirm(other.name,name);
  else enableNow(name);
}
function enableNow(name){
  document.dispatchEvent(new CustomEvent('lingee:env-enable',{detail:{name:name}}));
}

var enableConfirmTarget='';
function enableConfirmModal(){ return document.getElementById('envEnableConfirmModal'); }
function openEnableConfirm(fromName,toName){
  var modal=enableConfirmModal();
  if(!modal){ enableNow(toName); return; }
  enableConfirmTarget=toName;
  document.getElementById('envEnableConfirmFrom').textContent=fromName;
  document.getElementById('envEnableConfirmTo').textContent=toName;
  modal.classList.add('show');
  var cancel=document.getElementById('envEnableConfirmCancel');
  if(cancel) setTimeout(function(){ cancel.focus(); },30);
}
function closeEnableConfirm(){
  var modal=enableConfirmModal();
  if(modal) modal.classList.remove('show');
  enableConfirmTarget='';
}

function goCreate(){
  closeAll(null);
  document.dispatchEvent(new CustomEvent('lingee:env-create'));
}
function goManage(){
  closeAll(null);
  showView('settings');
  $$('.nav-item').forEach(function(n){ n.classList.remove('active'); });
}

function visibleItems(root){
  return $$('.env-pick-item',root);
}
function focusItem(root,idx){
  var items=visibleItems(root);
  if(!items.length) return;
  if(idx<0) idx=items.length-1;
  if(idx>=items.length) idx=0;
  items.forEach(function(i){ i.classList.remove('focused'); });
  items[idx].classList.add('focused');
  items[idx].scrollIntoView({block:'nearest'});
}
function focusedIndex(root){
  var items=visibleItems(root);
  for(var i=0;i<items.length;i++){ if(items[i].classList.contains('focused')) return i; }
  return -1;
}

function bindRoot(root){
  var dd=root.classList.contains('dropdown')?root:null;
  var chip=root.querySelector('[data-chip]');
  var input=root.querySelector('.app-search input, .env-pick-search input');
  if(dd&&chip){
    chip.addEventListener('click',function(e){
      e.stopPropagation();
      if(dd.classList.contains('is-empty')){ goCreate(); return; }
      var wasOpen=dd.classList.contains('open');
      closeAll(null);
      if(wasOpen) return;
      if(input) input.value='';
      renderList(root);
      dd.classList.add('open');
      if(input) requestAnimationFrame(function(){ input.focus(); });
    });
    new MutationObserver(function(){
      chip.setAttribute('aria-expanded',dd.classList.contains('open')?'true':'false');
      if(!dd.classList.contains('open')) visibleItems(root).forEach(function(i){ i.classList.remove('focused'); });
    }).observe(dd,{attributes:true,attributeFilter:['class']});
  }
  /* 连接器里的「金蝶 ERP」分组：点击标题行展开 / 收起实例列表 */
  var toggle=root.querySelector('[data-env-toggle]');
  function toggleGroup(){
    if(root.classList.contains('is-empty')) return;
    root.classList.toggle('expanded');
    renderGroup(root);
  }
  if(toggle){
    toggle.addEventListener('keydown',function(e){
      if(e.target!==toggle) return;
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); e.stopPropagation(); toggleGroup(); }
    });
  }
  if(input){
    input.addEventListener('input',function(){ renderList(root); focusItem(root,0); });
  }
  if(dd){
    dd.addEventListener('keydown',function(e){
      if(e.key==='Escape'&&dd.classList.contains('open')){
        e.stopPropagation(); dd.classList.remove('open'); if(chip) chip.focus(); return;
      }
      if(e.target.closest&&e.target.closest('[data-env-act]')) return;
      if(!dd.classList.contains('open')){
        if(e.key==='ArrowDown'&&chip&&e.target===chip&&!dd.classList.contains('is-empty')){ e.preventDefault(); chip.click(); focusItem(root,0); }
        return;
      }
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();
        var idx=focusedIndex(root);
        if(idx===-1) idx=e.key==='ArrowDown'?-1:0;
        focusItem(root,idx+(e.key==='ArrowDown'?1:-1));
      }else if(e.key==='Enter'){
        var items=visibleItems(root);
        var cur=items[focusedIndex(root)];
        if(cur){ e.preventDefault(); choose(cur.getAttribute('data-env')); }
      }
    });
  }
  root.addEventListener('click',function(e){
    var item=e.target.closest('.env-pick-item');
    if(item&&root.contains(item)){ e.stopPropagation(); choose(item.getAttribute('data-env')); return; }
    var act=e.target.closest('[data-env-act]');
    if(act&&root.contains(act)){
      e.stopPropagation();
      if(act.getAttribute('data-env-act')==='create') goCreate(); else goManage();
      return;
    }
    if(toggle&&e.target.closest('[data-env-toggle]')){ e.stopPropagation(); toggleGroup(); }
  });
  root.addEventListener('keydown',function(e){
    var act=e.target.closest&&e.target.closest('[data-env-act]');
    if(act&&(e.key==='Enter'||e.key===' ')){
      e.preventDefault();
      if(act.getAttribute('data-env-act')==='create') goCreate(); else goManage();
    }
  });
}

export function initEnvPicker() {
  $$('[data-env-picker]').forEach(bindRoot);
  document.addEventListener('lingee:envs-changed',refresh);
  ['envEnableConfirmClose','envEnableConfirmCancel'].forEach(function(id){
    var btn=document.getElementById(id);
    if(btn) btn.addEventListener('click',closeEnableConfirm);
  });
  var ok=document.getElementById('envEnableConfirmOk');
  if(ok) ok.addEventListener('click',function(){
    var name=enableConfirmTarget;
    closeEnableConfirm();
    if(name) enableNow(name);
  });
  var modal=enableConfirmModal();
  if(modal) modal.addEventListener('click',function(e){ if(e.target===modal) closeEnableConfirm(); });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&modal&&modal.classList.contains('show')) closeEnableConfirm();
  });
  refresh();
}
