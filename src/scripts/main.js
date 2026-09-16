import billTemplate from '../artifacts/purchase-order.html?raw';
import tokensCss from '../styles/tokens.css?raw';
import { EXPERT_AV, GATE_ICON, AV_KEYS, WORK_MODES, COMP_NAMES, COMP_LEVELS, COMP_RANK, ASK, ASK_FALLBACK, MODE_MATCH, KW_MATCH } from '../data/expert-data';
import { EXPERTS } from '../data/experts';
import { PRESET_TEAMS } from '../data/teams';
import { ENV_DATA_CENTERS, ERP_API_SCOPES } from '../data/environments';
import { CV_PROJECTS, CV_TASKS, CV_REVIEWS, CV_MEMBERS } from '../data/collab';
import { changelogData, changelogIcons } from '../data/changelog';
import { mockReplies, MODE_BUILDERS } from '../data/chat-data';
import { fullAppData } from '../data/apps-data';
import * as expertStore from '../stores/expert-store';
import * as envStore from '../stores/env-store';
import * as chatStore from '../stores/chat-store';
import * as modalStore from '../stores/modal-store';
import { xav, xesc, parseComp, splitList, splitLines, blankExpert } from '../lib/utils';
import { teamFlow, teamCoverage, teamLint, teamGates, hasGate, toggleGate, activeGates, teamById, teamDomains, teamCmdList } from '../lib/team-logic';
import { toast as toastFn } from '../lib/toast';

/* 产物预览与应用共用同一份设计令牌 */
const billTemplateWithTokens = billTemplate.replace(
  '/* 令牌由 tokens.css 注入 */',
  tokensCss.replace(/\/\*[\s\S]*?\*\//g, '').trim()
);


(function(){
  var $=function(s,el){return (el||document).querySelector(s)};
  var $$=function(s,el){return Array.prototype.slice.call((el||document).querySelectorAll(s))};

  /* ---------- 消息数据模型（Phase 3 数据驱动） ----------
     chat 视图的消息列表改为数据数组，React 组件（ChatView.jsx）渲染。
     simulateAIResponse 往数组里 push 步骤/结果，每次变更调 _chatTouch() 触发 React 重渲染。 */
  var CHAT_MESSAGES=[];
  var _chatVersion=0;
  var _chatListeners=[];
  function _chatTouch(){
    _chatVersion++;
    _chatListeners.slice().forEach(function(fn){ try{fn();}catch(e){} });
  }
  function _simulateResponse(){
    var msgId=Date.now();
    var msg={id:msgId,type:'assistant',steps:[],result:null,streaming:true};
    CHAT_MESSAGES.push(msg);
    var steps=[{title:'需求分析'},{title:'开发页面'},{title:'测试验收'}];
    var currentStepIdx=0;
    function addNextStep(){
      if(currentStepIdx>=steps.length){
        msg.streaming=false;
        msg.result={markdown:mockReplies?mockReplies[Math.floor(Math.random()*(mockReplies.length||1))]||'已完成':'已完成',artifact:true};
        _chatTouch();
        if(window.__lingeeBridge&&window.__lingeeBridge.chat) window.__lingeeBridge.chat.touch();
        return;
      }
      msg.steps.push({title:steps[currentStepIdx].title,status:'running'});
      _chatTouch();
      if(window.__lingeeBridge&&window.__lingeeBridge.chat) window.__lingeeBridge.chat.touch();
      setTimeout(function(){
        msg.steps[currentStepIdx].status='done';
        currentStepIdx++;
        _chatTouch();
        if(window.__lingeeBridge&&window.__lingeeBridge.chat) window.__lingeeBridge.chat.touch();
        setTimeout(addNextStep,300);
      },800+Math.random()*600);
    }
    addNextStep();
  }

  /* ---------- 弹窗状态桥工厂（Phase 2b antd 化，见 docs/react-migration-plan.md） ----------
     和 _cvModalState（协作开发 7 个弹窗，Phase 2）用的是同一套模式：这里只广播
     "当前该开哪个弹窗"，具体判断/落库/联动 UI 仍然 100% 留在本文件对应的业务
     函数里，React 侧（*Modals.jsx）只负责收集表单值后调用 window.__lingeeBridge
     里对应命名空间的函数。每个"弹窗场景"（会话页关联应用、专家/专家团、ERP
     环境、快捷键面板）各自一份实例，互不干扰。 */
  function _makeModalBridge(){
    var state={name:null,version:0};
    var listeners=[];
    function notify(){ listeners.slice().forEach(function(fn){ try{fn(state);}catch(e){} }); }
    function open(name){ state={name:name,version:0}; notify(); }
    function close(name){ if(!name||state.name===name){ state={name:null,version:0}; notify(); } }
    function isOpen(name){ return state.name===name; }
    function subscribe(fn){ listeners.push(fn); return function(){ var i=listeners.indexOf(fn); if(i>=0)listeners.splice(i,1); }; }
    function touch(){ state.version++; notify(); }
    return {open:open, close:close, isOpen:isOpen, subscribe:subscribe, getOpenModal:function(){ return state.name; }, getVersion:function(){ return state.version; }, touch:touch};
  }

  /* ---------- 登录鉴权 ---------- */
  var loginOverlay=$('#loginOverlay');
  var loginForm=$('#loginForm');
  var loginBtn=$('#loginBtn');
  var loginError=$('#loginError');
  var LOGIN_KEY='lingee_auth_session';
  var REMEMBER_KEY='lingee_remember_user';

  var USER_NAMES={
    'wei_bu@kingdee.com':{name:'Wei',avatar:'W'},
    'wuhc2023@gmail.com':{name:'Chao',avatar:'C'},
    '6686612@qq.com':{name:'Joe',avatar:'J'},
    '17299999999':{name:'Dev',avatar:'D'},
    'liangpingxian@gmail.com':{name:'Xian',avatar:'L'}
  };
  var USER_CREDENTIALS={
    'wei_bu@kingdee.com':'lingee520',
    'wuhc2023@gmail.com':'lingee520',
    '6686612@qq.com':'lingee520',
    '17299999999':'KDadm!@#2022',
    'liangpingxian@gmail.com':'lingee520'
  };

  function getAuthedUser(){
    try{ return sessionStorage.getItem(LOGIN_KEY)||null; }catch(e){ return null; }
  }
  function setAuthed(user){
    try{ sessionStorage.setItem(LOGIN_KEY,user); }catch(e){}
  }
  function applyUserInfo(user){
    var info=USER_NAMES[user]||{name:'Joe',avatar:'J'};
    var av=$('#userAvatar'),nm=$('#userName');
    if(av) av.textContent=info.avatar;
    if(nm) nm.textContent=info.name;
  }
  /* 登录框登录后仍留在 DOM 里，Chrome 会把整页当登录页，
     往搜索框之类的文本框推荐保存的账号。禁用掉就不再是自动填充来源。 */
  var _loginFormHome=null, _loginFormNode=null;
  function setLoginFieldsEnabled(on){
    var form=$('#loginForm');
    if(on){
      /* 密码框在初始 HTML 里是 type="text"，到这里才变回 password。
         Chrome 在解析阶段就靠 type="password" 判定「这是登录页」，
         一旦判定，本页任何文本框聚焦时都会被推荐保存的账号。 */
      var pw=$('#loginPass');
      if(pw && pw.hasAttribute('data-pw')) pw.setAttribute('type','password');
    }
    if(!on){
      /* 登录成功后把整个表单摘出 DOM。只 disabled 不够：Chrome 仍会把本页当登录页，
         往任意文本框推荐保存的账号（会被当成搜索关键词，把列表筛空）。 */
      if(form){ _loginFormHome=form.parentNode; _loginFormNode=form; form.remove(); }
    }else if(_loginFormNode && _loginFormHome && !_loginFormNode.isConnected){
      _loginFormHome.appendChild(_loginFormNode);
    }
  }
  function showLogin(){
    if(loginOverlay) loginOverlay.classList.remove('hidden');
    setLoginFieldsEnabled(true);
  }
  function hideLogin(){
    if(loginOverlay) loginOverlay.classList.add('hidden');
    setLoginFieldsEnabled(false);
  }

  /* 恢复记住的账号和密码 */
  try{
    var saved=localStorage.getItem(REMEMBER_KEY);
    if(saved){
      saved=JSON.parse(saved);
      var inp=$('#loginUser'); if(inp) inp.value=saved.u||'';
      var pp=$('#loginPass'); if(pp) pp.value=saved.p||'';
      var cb=$('#loginRemember'); if(cb) cb.checked=true;
    }
  }catch(e){}

  if(loginForm){
    loginForm.addEventListener('submit',function(e){
      e.preventDefault();
      var user=$('#loginUser').value.trim();
      var pass=$('#loginPass').value.trim();
      if(!user||!pass){
        loginError.textContent='请输入账号和密码';
        return;
      }
      if(USER_CREDENTIALS[user] && USER_CREDENTIALS[user]===pass){
        loginError.textContent='';
        loginBtn.classList.add('loading');
        loginBtn.disabled=true;
        loginBtn.textContent='登录中';
        var remember=$('#loginRemember');
        try{
          if(remember&&remember.checked) localStorage.setItem(REMEMBER_KEY,JSON.stringify({u:user,p:pass}));
          else localStorage.removeItem(REMEMBER_KEY);
        }catch(e){}
        setTimeout(function(){
          setAuthed(user);
          applyUserInfo(user);
          hideLogin();
          loginBtn.classList.remove('loading');
          loginBtn.disabled=false;
          loginBtn.textContent='登录';
        },800);
      }else{
        loginError.textContent='账号或密码错误，请重试';
        $('#loginPass').value='';
        $('#loginPass').focus();
      }
    });
    loginBtn.addEventListener('click',function(){});

  /* 登录页全局回车快捷键 */
  document.addEventListener('keydown',function(e){
    if(e.key==='Enter'&&loginOverlay&&!loginOverlay.classList.contains('hidden')&&loginBtn&&!loginBtn.disabled)
      loginForm.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
  });
  }

  /* 未登录则显示登录页，已登录则恢复用户信息 */
  var _authedUser=getAuthedUser();
  if(!_authedUser){
    showLogin();
    try{localStorage.removeItem('lingeeUrlState')}catch(e){}
  }else{
    applyUserInfo(_authedUser);
    hideLogin();
  }

  /* ---------- 滚动条：滚动时显示，停留后延迟隐藏 ---------- */
  var _scrollTimers=new WeakMap();
  var _sbHideDelay=1500;
  var _sbHovered=null;
  var _sbDragging=false;
  function _sbSchedule(t){
    var old=_scrollTimers.get(t);
    if(old)clearTimeout(old);
    _scrollTimers.set(t,setTimeout(function(){
      /* 指针停在该滚动区内或正在拖拽滑块时不隐藏，避免够不到 */
      if(_sbHovered===t||_sbDragging){ _sbSchedule(t); return; }
      t.classList.remove('scrolling');
    },_sbHideDelay));
  }
  document.addEventListener('scroll',function(e){
    var t=e.target;
    if(t&&t.nodeType===1&&t!==document){
      t.classList.add('scrolling');
      _sbSchedule(t);
    }
  },true);
  document.addEventListener('mouseover',function(e){
    var t=e.target;
    while(t&&t.nodeType===1){
      if(t.classList&&t.classList.contains('scrolling')){ _sbHovered=t; return; }
      t=t.parentElement;
    }
    _sbHovered=null;
  },true);
  document.addEventListener('mousedown',function(){_sbDragging=true},true);
  document.addEventListener('mouseup',function(){
    _sbDragging=false;
    if(_sbHovered)_sbSchedule(_sbHovered);
  },true);

  /* ---------- toast ---------- */
  var toastEl=$('#toast'),toastT;
  function toast(msg,type){
    var icon='';
    if(type==='error'){
      icon='<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16v.5"/></svg>';
    }else if(type==='success'){
      icon='<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>';
    }else{
      icon='<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
    }
    toastEl.innerHTML=icon+'<span class="toast-text">'+msg+'</span>';
    toastEl.className='toast'+(type?' '+type:'');
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT=setTimeout(function(){toastEl.classList.remove('show')},type==='error'?3000:2000);
  }

  /* 搜索框默认 readonly，用户点进去才可写。Chrome 不对只读输入框做自动填充，
     这是唯一能真正拦住的办法——type="search" 和 autocomplete="off" 它都不认。 */
  (function unlockSearchOnFocus(){
    function unlock(el){
      if(el && el.tagName==='INPUT' && el.readOnly && el.getAttribute('type')==='search'){
        el.removeAttribute('readonly');
      }
    }
    ['focusin','pointerdown'].forEach(function(ev){
      document.addEventListener(ev,function(e){ unlock(e.target); },true);
    });
  })();
  var changelogReadIds=(function(){
    try{ return JSON.parse(localStorage.getItem('changelog_read_ids')||'[]'); }catch(e){return [];}
  })();
  function saveReadIds(){ localStorage.setItem('changelog_read_ids',JSON.stringify(changelogReadIds)); }
  function getUnreadCount(){ return changelogData.filter(function(l){return changelogReadIds.indexOf(l.id)===-1;}).length; }
  function formatRelativeDate(dateStr){
    var now=new Date(),date=new Date(dateStr),diffMs=now.getTime()-date.getTime(),diffMins=Math.floor(diffMs/60000);
    if(diffMins<1) return '刚刚';
    if(diffMins<60) return diffMins+' 分钟前';
    var diffHours=Math.floor(diffMins/60);
    if(diffHours<24) return diffHours+' 小时前';
    var diffDays=Math.floor(diffHours/24);
    if(diffDays===1) return '昨天';
    if(diffDays<7) return diffDays+' 天前';
    if(diffDays<30) return Math.floor(diffDays/7)+' 周前';
    return dateStr;
  }
  var bellBtn=$('#notificationBell'),bellBadge=$('#notificationBadge'),changelogPanel=$('#changelogPanel'),changelogBody=$('#changelogBody'),changelogOverlay=null;
  function updateBellBadge(){
    var c=getUnreadCount();
    bellBtn.classList.toggle('has-unread',c>0);
    if(c>0){ bellBadge.style.display='';bellBadge.textContent=c>99?'99+':c; }
    else{ bellBadge.style.display='none'; }
  }
  function renderChangelog(tab){
    var list=tab==='unread'?changelogData.filter(function(l){return changelogReadIds.indexOf(l.id)===-1;}):changelogData;
    if(list.length===0){ changelogBody.innerHTML='<div class="changelog-empty">暂无'+(tab==='unread'?'未读':'')+'通知</div>';return; }
    var html='';
    list.forEach(function(log,i){
      var isRead=changelogReadIds.indexOf(log.id)!==-1;
      html+='<div class="changelog-notification'+(isRead?'':' unread')+'" data-id="'+log.id+'">';
      html+='<div class="changelog-noti-header">';
      html+='<div class="changelog-noti-avatar" style="background:'+log.iconBg+';color:'+log.iconColor+'">';
      html+=changelogIcons[log.id]||'';
      html+='</div>';
      html+='<span class="changelog-noti-team">'+log.team+'</span>';
      html+='<span class="changelog-noti-date">'+formatRelativeDate(log.date)+'</span>';
      if(isRead){
        // 已读 → 显示 EyeOff（闭眼）→ 标记未读
        html+='<button class="changelog-noti-toggle" data-action="unread" data-tooltip="标记未读"><svg class="ic ic-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button>';
      }else{
        // 未读 → 显示 Eye（睁眼）→ 标记已读
        html+='<button class="changelog-noti-toggle" data-action="read" data-tooltip="标记已读"><svg class="ic ic-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>';
      }
      html+='</div>';
      html+='<div class="changelog-noti-body">';
      log.body.split('\n').forEach(function(line,li){
        if(line==='') html+='<br>';
        else html+='<p>'+line.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,function(m,text,url){
          return '<a href="'+url+'" target="_blank" class="changelog-link">'+text+'</a>';
        })+'</p>';
      });
      html+='</div>';
      if(i<list.length-1) html+='<div class="changelog-noti-divider"></div>';
      html+='</div>';
    });
    changelogBody.innerHTML=html;
    var demoLink=changelogBody.querySelector('a[href="#demo"]');
    if(demoLink){
      demoLink.addEventListener('click',function(e){
        e.preventDefault();
        closeChangelog();
        showView('newtask');
        setNavActive('新会话');
        applyMode('苍穹应用',true);
        setTimeout(function(){ openAppDropdown(); },250);
      });
    }
  }
  function openChangelog(){
    var currentTab=($('.changelog-tab.active')||$('.changelog-tab[data-tab="all"]')).getAttribute('data-tab');
    renderChangelog(currentTab);
    changelogPanel.style.display='';
    if(!changelogOverlay){
      changelogOverlay=document.createElement('div');
      changelogOverlay.className='changelog-overlay-transparent';
      changelogOverlay.addEventListener('click',closeChangelog);
      document.body.appendChild(changelogOverlay);
    }else{ changelogOverlay.style.display=''; }
  }
  function closeChangelog(){
    changelogPanel.style.display='none';
    if(changelogOverlay) changelogOverlay.style.display='none';
  }
  function markAllRead(){
    changelogReadIds=[];
    changelogData.forEach(function(l){ changelogReadIds.push(l.id); });
    saveReadIds(); updateBellBadge();
    renderChangelog(($('.changelog-tab.active')||$('.changelog-tab[data-tab="all"]')).getAttribute('data-tab'));
    var unreadTab=$('.changelog-tab[data-tab="unread"]');
    if(unreadTab) unreadTab.innerHTML='未读';
  }
  function markAsRead(id){
    if(changelogReadIds.indexOf(id)!==-1) return;
    changelogReadIds.push(id); saveReadIds(); updateBellBadge();
    var tab=$('.changelog-tab.active');
    if(tab.getAttribute('data-tab')==='unread'){ renderChangelog('unread'); }
    else{ renderChangelog('all'); }
    var unreadTab=$('.changelog-tab[data-tab="unread"]');
    var c=getUnreadCount();
    unreadTab.innerHTML='未读'+(c?' '+c:'');
  }
  function markAsUnread(id){
    var idx=changelogReadIds.indexOf(id);
    if(idx===-1) return;
    changelogReadIds.splice(idx,1); saveReadIds(); updateBellBadge();
    var tab=$('.changelog-tab.active');
    if(tab.getAttribute('data-tab')==='unread'){ renderChangelog('unread'); }
    else{ renderChangelog('all'); }
    var unreadTab=$('.changelog-tab[data-tab="unread"]');
    var c=getUnreadCount();
    unreadTab.innerHTML='未读'+(c?' '+c:'');
  }
  // 铃铛点击（与 Build_demo 一致：先 markAllRead 再打开面板）
  bellBtn.addEventListener('click',function(e){
    e.stopPropagation();
    if(changelogPanel.style.display!=='none'){ closeChangelog(); return; }
    markAllRead();
    openChangelog();
  });
  // Tab 切换
  $$('.changelog-tab').forEach(function(tab){
    tab.addEventListener('click',function(){
      $$('.changelog-tab').forEach(function(t){t.classList.remove('active');});
      tab.classList.add('active');
      renderChangelog(tab.getAttribute('data-tab'));
    });
  });
  // 全部已读
  $('#markAllReadBtn').addEventListener('click',function(){ markAllRead(); });
  // 事件委托：标记已读/未读
  document.addEventListener('click',function(e){
    var btn=e.target.closest('.changelog-noti-toggle');
    if(!btn) return;
    var noti=btn.closest('.changelog-notification');
    if(!noti) return;
    var id=noti.getAttribute('data-id');
    if(btn.getAttribute('data-action')==='read') markAsRead(id);
    else if(btn.getAttribute('data-action')==='unread') markAsUnread(id);
  });
  // ESC 关闭
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape' && changelogPanel.style.display!=='none') closeChangelog();
  });
  updateBellBadge();

  /* ---------- dropdowns (hover 200ms) ---------- */
  function closeAll(except){
    $$('.dropdown.open').forEach(function(d){ if(d!==except) d.classList.remove('open'); });
  }
  var hoverTimer=null;
  function openDd(dd){
    closeAll(dd);
    dd.classList.add('open');
  }
  function closeDdDelayed(dd){
    clearTimeout(dd._closeT);
    dd._closeT=setTimeout(function(){
      if(!dd.querySelector(':hover')) dd.classList.remove('open');
    },200);
  }
  if($$('.dropdown').length) $$('.dropdown').forEach(function(dd){
    var chip=$('[data-chip]',dd);
    if(!chip) return;
    /* 用 id 判断而非变量引用：appDd / chatAppDd 在本行之后才赋值，
       用变量会因 var 提升恒为 undefined，导致专用下拉被重复绑定 */
    if(dd.id==='appDropdown' || dd.id==='chatAppDropdown') return;
    if(dd.classList.contains('field-dd')) return; // 表单内下拉改为点击展开
    var t=null;
    dd.addEventListener('mouseenter',function(){
      clearTimeout(t);
      clearTimeout(dd._closeT);
      t=setTimeout(function(){ openDd(dd); },300);
    });
    dd.addEventListener('mouseleave',function(){
      clearTimeout(t);
      closeDdDelayed(dd);
    });
  });
  // close when clicking outside
  document.addEventListener('click',function(e){
    if(!e.target.closest('.dropdown')) closeAll(null);
  });

  /* 下拉面板动态高度 — 不溢出屏幕 */
  function adjustMenuHeight(dd){
    var menu=dd.querySelector('.menu');
    if(!menu) return;
    var rect=dd.getBoundingClientRect();
    var spaceBelow=window.innerHeight - rect.bottom - 20;
    var spaceAbove=rect.top - 20;
    var maxH;
    if(spaceBelow < 200 && spaceAbove > spaceBelow){
      menu.style.top='auto';
      menu.style.bottom='calc(100% + 10px)';
      maxH=Math.min(spaceAbove,400);
    }else{
      menu.style.top='';
      menu.style.bottom='';
      maxH=Math.min(Math.max(spaceBelow,120),400);
    }
    menu.style.maxHeight=maxH+'px';
    var list=menu.querySelector('.app-list');
    if(list) list.style.maxHeight=(maxH-60)+'px';
  }
  if($$('.dropdown').length) $$('.dropdown').forEach(function(dd){
    new MutationObserver(function(){
      if(dd.classList.contains('open')){
        requestAnimationFrame(function(){ adjustMenuHeight(dd); });
      }
    }).observe(dd,{attributes:true,attributeFilter:['class']});
  });

  /* generic single-select menus (model / workspace) */
  function initGenericKbd(dd){
    var chip=$('[data-chip]',dd);
    if(chip) chip.setAttribute('tabindex','0');
    function getItems(){ return $$('.menu-item',dd); }
    function getFocusedIdx(){
      var items=getItems();
      for(var i=0;i<items.length;i++){ if(items[i].classList.contains('focused')) return i; }
      return -1;
    }
    function focusItem(idx){
      var items=getItems();
      if(!items.length) return;
      if(idx<0) idx=items.length-1;
      if(idx>=items.length) idx=0;
      items.forEach(function(i){i.classList.remove('focused')});
      items[idx].classList.add('focused');
      items[idx].scrollIntoView({block:'nearest'});
    }
    dd.addEventListener('keydown',function(e){
      if(!dd.classList.contains('open')) return;
      if(e.key==='Escape'){ dd.classList.remove('open'); return; }
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();
        var idx=getFocusedIdx();
        if(idx===-1) idx=e.key==='ArrowDown'?-1:0;
        focusItem(idx+(e.key==='ArrowDown'?1:-1));
        return;
      }
      if(e.key==='Enter'){
        e.preventDefault();
        var idx=getFocusedIdx();
        var items=getItems();
        if(idx>=0&&items[idx]) items[idx].click();
        else if(items.length) items[0].click();
      }
    });
    new MutationObserver(function(mutations){
      mutations.forEach(function(m){
        var wasOpen=m.oldValue&&m.oldValue.indexOf('open')>-1;
        var isOpen=dd.classList.contains('open');
        if(!wasOpen&&isOpen){} // 打开时不默认聚焦
        if(wasOpen&&!isOpen) getItems().forEach(function(i){i.classList.remove('focused')});
      });
    }).observe(dd,{attributes:true,attributeFilter:['class'],attributeOldValue:true});
  }
  ['model','workspace','tenant'].forEach(function(key){
    $$('.dropdown[data-dd="'+key+'"]').forEach(function(dd){
      initGenericKbd(dd);
      $$('.menu-item',dd).forEach(function(item){
        item.addEventListener('click',function(e){
          e.stopPropagation();
          $$('.menu-item',dd).forEach(function(i){i.classList.remove('checked')});
          item.classList.add('checked');
          $('.chip-label',dd).textContent=item.getAttribute('data-val');
          var ch=$('[data-chip]',dd); if(ch) ch.classList.remove('muted');
          dd.classList.remove('open');
        });
      });
    });
  });

  /* ---------- 关联应用 (搜索+两列列表) ---------- */
  var appDd=$('#appDropdown');
  var appChip=$('[data-chip]',appDd);
  var appLabel=$('.chip-label',appDd);
  var appSearchInput=$('#appSearchInput');
  var appList=$('#appList');
  var appItems=$$('.app-item',appList);
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
  buildAppList();
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
  appSearchInput.addEventListener('input',function(){ filterApps(this.value); });
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
  var appHoverT=null;
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
  if(expandAppBtn){
    expandAppBtn.addEventListener('click',function(e){
      e.stopPropagation();
      openNewAppModal('home');
    });
  }
  var chatExpandAppBtn=$('#chatExpandAppBtn');
  if(chatExpandAppBtn){
    chatExpandAppBtn.addEventListener('click',function(e){
      e.stopPropagation();
      openNewAppModal('chat');
    });
  }
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
  chatAppSearchInput.addEventListener('input',function(){ filterChatApps(this.value); });
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
  var chatAppHoverT=null;
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
  /* ---------- mode ↔ sidebar sync ---------- */
  var modeItems=$$('.mode-item');
  var input=$('#composerInput');
  var navItems=$$('.sb-scroll .nav-item');
  var navByName={};
  navItems.forEach(function(n){ navByName[n.textContent.trim()]=n; });

  function setNavActive(name){
    navItems.forEach(function(n){ n.classList.toggle('active', n.textContent.trim()===name); });
  }
  function applyMode(mode,fromChip){
    if(modeItems.length) modeItems.forEach(function(m){ m.classList.toggle('checked', m.getAttribute('data-val')===mode); });
    if(appDd) appDd.classList.remove('error');
    if(input) input.setAttribute('data-placeholder','布置'+mode+'任务');
    if(appDd) appDd.classList.toggle('hidden', mode!=='苍穹应用');
    if(mode!=='苍穹应用' && appDd){ appDd.classList.remove('open'); }
    if(input) input.focus();
  }
  /* mode items click 已迁到 React NewTaskView */

  /* ---------- view switching ---------- */
  var viewHome=$('#view-home'), viewNew=$('#view-newtask'), viewChat=$('#view-chat'), viewApps=$('#view-apps'), viewSkills=$('#view-skills'), viewAgents=$('#view-agents'), viewCollab=$('#view-collab'), viewDesign=$('#view-design'), viewSettings=$('#view-settings');
  var viewReact=$('#react-view-root');
  /* 已迁移到 React 的顶层视图：内容改由 src/views/*View.jsx 渲染进 #react-view-root，
     #view-apps/#view-skills/#view-agents 这三个原容器留空、永久隐藏（见 index.html）。
     showView() 本身的调用方（侧边栏点击、首页卡片、URL 恢复……）完全不用改，
     这里只是多一条「这三个名字改成显隐 #react-view-root」的分支——React 那边用
     BrowserRouter（不是 HashRouter，见 src/App.jsx 顶部注释），和这里一样认
     location.pathname，不需要再单独维护一份 hash。 */
  var REACT_VIEWS=['apps','skills','agents','design','home','newtask','chat','collab','settings'];
  function setUrlState(path,notifyReactRouter){
    try{history.replaceState(null,'',path);localStorage.setItem('lingeeUrlState',path)}catch(e){}
    /* react-router 的 BrowserRouter 只在 popstate 事件上重新读 location 决定渲染哪个
       路由——history.replaceState() 本身不会触发这个事件（浏览器规范如此，只有前进/
       后退才会），所以从 vanilla 侧切到应用/技能/智能体开发这三个 React 视图时，光改
       URL 不够，路由不会跟着变，界面会停在上一个 React 视图不动。手动派发一个
       popstate 补上这个通知，让 react-router 用改过的新 URL 重新算一遍。 */
    if(notifyReactRouter){
      try{ window.dispatchEvent(new PopStateEvent('popstate')); }catch(e){}
    }
  }
  function showView(which){
    if(REACT_VIEWS.indexOf(which)>=0){
      viewHome.classList.add('hidden'); viewNew.classList.add('hidden'); viewChat.classList.add('hidden');
      viewApps.classList.add('hidden'); viewSkills.classList.add('hidden'); viewAgents.classList.add('hidden');
      viewCollab.classList.add('hidden'); viewDesign.classList.add('hidden'); viewSettings.classList.add('hidden');
      if(viewReact) viewReact.classList.remove('hidden');
      $('.sidebar').classList.remove('hidden');
      closeAll(null);
      setUrlState('/'+which,true);
      return;
    }
    if(viewReact) viewReact.classList.add('hidden');
    viewHome.classList.toggle('hidden', which!=='home');
    viewNew.classList.toggle('hidden', which!=='newtask');
    viewChat.classList.toggle('hidden', which!=='chat');
    viewApps.classList.toggle('hidden', which!=='apps');
    viewSkills.classList.toggle('hidden', which!=='skills');
    viewAgents.classList.toggle('hidden', which!=='agents');
    viewCollab.classList.toggle('hidden', which!=='collab');
    viewDesign.classList.toggle('hidden', which!=='design');
    viewSettings.classList.toggle('hidden', which!=='settings');
    $('.sidebar').classList.toggle('hidden', which==='design');
    closeAll(null);
    if(which!=='design') setUrlState('/'+which);
  }



  /* 预览面板已迁到 React ChatView */

  /* ---------- 用户菜单：头像 / 姓名 ---------- */
  var userWrap=$('.user-wrap'), userBtn=$('#userBtn');
  function closeUserMenu(){
    if(!userWrap)return;
    userWrap.classList.remove('open');
    if(userBtn) userBtn.setAttribute('aria-expanded','false');
  }
  if(userBtn){
    userBtn.addEventListener('click',function(e){
      e.stopPropagation();
      var open=!userWrap.classList.contains('open');
      userWrap.classList.toggle('open',open);
      userBtn.setAttribute('aria-expanded',open?'true':'false');
    });
    userBtn.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); userBtn.click(); }
    });
    document.addEventListener('click',function(e){
      if(userWrap&&!userWrap.contains(e.target)) closeUserMenu();
    });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeUserMenu(); });
  }
  var userMenuSettings=$('#userMenuSettings');
  if(userMenuSettings){
    userMenuSettings.addEventListener('click',function(){
      closeUserMenu();
      showView('settings');
      $$('.nav-item').forEach(function(n){n.classList.remove('active')});
    });
  }
  var userMenuLogout=$('#userMenuLogout');
  if(userMenuLogout) userMenuLogout.addEventListener('click',function(){
    closeUserMenu();
    try{ sessionStorage.removeItem(LOGIN_KEY); }catch(e){}
    if(loginForm) loginForm.reset();
    if(loginError) loginError.textContent='';
    /* 重新回填记住的账号和密码 */
    try{
      var saved=localStorage.getItem(REMEMBER_KEY);
      if(saved){
        saved=JSON.parse(saved);
        var inp=$('#loginUser'); if(inp) inp.value=saved.u||'';
        var pp=$('#loginPass'); if(pp) pp.value=saved.p||'';
        var cb=$('#loginRemember'); if(cb) cb.checked=true;
      }
    }catch(e){}
    showLogin();
    $('#loginUser').focus();
  });

  /* ---------- 表单内下拉：点击展开 ---------- */
  $$('.dropdown.field-dd').forEach(function(dd){
    var chip=$('[data-chip]',dd);
    if(!chip) return;
    chip.addEventListener('click',function(e){
      e.stopPropagation();
      var willOpen=!dd.classList.contains('open');
      closeAll(null);
      dd.classList.toggle('open',willOpen);
      if(willOpen&&typeof adjustMenuHeight==='function') adjustMenuHeight(dd);
    });
    chip.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); chip.click(); }
    });
  });

  /* ---------- 设置页：环境配置（Phase 3 数据驱动） ----------
     env 列表改为 ENV_ITEMS 数据数组，React 组件（SettingsView.jsx）渲染列表。
     不再有 DOM 元素管理（hydrateEnvItem/bindEnvMore/syncConnTag 等全部删除）。
     env 弹窗 bridge 也改为读写 ENV_ITEMS 而非 DOM dataset。 */
  var ENV_ITEMS=[
    {name:'scm-dev',url:'https://scmdev.kingdee.com:8443/ierp',product:'XK',source:'local',
     dataCenter:'1561691182942805271',clientId:'lingee-build-scm-dev',clientSecret:'',
     gateway:'acgw-scm-dev',normalAccessToken:true,proxyUser:'',
     envConn:'auth',grantedBy:'吴**超',grantedAt:'09-01',lastUsed:'今天 14:32',isDefault:true},
    {name:'fi-uat',url:'https://fiuat.kingdee.com/ierp',product:'XH',source:'local',
     dataCenter:'1288162917259',clientId:'lingee-build-fi-uat',clientSecret:'',
     gateway:'',normalAccessToken:true,proxyUser:'',
     envConn:'auth',grantedBy:'吴**超',grantedAt:'08-27',lastUsed:'08-28 16:40',grantState:'expired',isDefault:false},
    {name:'hr-sit',url:'http://172.20.31.86:8081/ierp',product:'XK',source:'cloud',
     dataCenter:'1561691182942805271',clientId:'lingee-build-hr-sit',clientSecret:'',
     gateway:'acgw-hr-sit',normalAccessToken:true,proxyUser:'',
     envConn:'cred',isDefault:false},
    {name:'legacy-v79',url:'http://172.20.28.204:8080/ierp',product:'XK',source:'local',
     dataCenter:'1288162917259',clientId:'lingee-build-legacy-v79',clientSecret:'',
     gateway:'acgw-legacy-v79',normalAccessToken:false,proxyUser:'erp-openapi-agent',
     envConn:'cred',isDefault:false}
  ];
  var _envListVersion=0;
  function _envTouch(){ _envListVersion++; if(window.__lingeeBridge&&window.__lingeeBridge.env) window.__lingeeBridge.env.touch(); }
  function _envGetList(){ return ENV_ITEMS.map(function(e,i){return Object.assign({index:i},e);}); }
  function _envDeleteItem(i){
    if(i<0||i>=ENV_ITEMS.length) return;
    var name=ENV_ITEMS[i].name;
    ENV_ITEMS.splice(i,1);
    _envTouch();
    toast('已删除：'+name);
  }
  function _envSetDefault(i){
    ENV_ITEMS.forEach(function(e,j){ e.isDefault=(j===i); });
    _envTouch();
    toast('已设为默认：'+ENV_ITEMS[i].name);
  }
  function _envTestConnection(i){
    var item=ENV_ITEMS[i]; if(!item) return;
    item._testing=true; _envTouch();
    setTimeout(function(){
      item._testing=false;
      item._testResult='连通正常 '+(60+Math.floor(Math.random()*180))+'ms';
      _envTouch();
      toast(item.name+'：连通正常');
    },700+Math.random()*600);
  }
  function _envCopyUrl(i){
    var item=ENV_ITEMS[i]; if(!item) return;
    if(navigator.clipboard) navigator.clipboard.writeText(item.url);
    toast('已复制地址：'+item.url);
  }
  var envMode='create';
  var envEditIndex=-1;
  var envProduct='';
  var envOriginalProduct='';
  var envMaskedValue='********';
  var envNormalAuthEnabled=false;
  var envConnMode='cred';
  var envConnSupported=false;
  var envConnBlocked='';
  var envAuthorizeTimer=null;
  var envAuthorizeIndex=-1;
  var envAuthorizeName='';
  var envAuthorizeDc='';
  var erpBrowserSession=null;
  var envDisconnectIndex=-1;
  var envDisconnectName='';

  function probeAuthSupport(url){
    var u=(url||'').toLowerCase();
    if(!u) return false;
    if(/legacy|192\.168\.|172\.\d+\.|10\.\d+\.|:8080|:8081/.test(u)) return false;
    return true;
  }
  function connBlockedReason(){
    return envConnSupported ? '' : '该环境的苍穹版本不支持 OAuth 授权，请在「OpenAPI 第三方应用」中创建应用后填写凭证。';
  }
  function normalizeEnvUrl(raw){
    var t=String(raw||'').trim().replace(/\/+$/,'');
    if(!t) return '';
    var out;
    if(/^https?:\/\//i.test(t)) out=t;
    else{ var m=t.match(/^(https?):\/*(.*)$/i); out=m?(m[1].toLowerCase()+'://'+m[2]):('http://'+t); }
    try{ var u=new URL(out); return (u.origin+u.pathname).replace(/\/+$/,''); }catch(e){ return out; }
  }
  function _validateEnvForm(d){
    if(!d.name||!d.name.trim()) return {ok:false,msg:'请输入环境名'};
    if(!d.url||!d.url.trim()) return {ok:false,msg:'请输入环境地址'};
    if(envConnMode!=='auth'){
      if(!d.product) return {ok:false,msg:'请选择环境类型'};
      if(!d.dataCenter) return {ok:false,msg:'请选择数据中心'};
      if(!d.clientId||!d.clientId.trim()) return {ok:false,msg:'请输入应用 ID'};
      if(!d.clientSecret||!d.clientSecret.trim()) return {ok:false,msg:'请输入密钥'};
      if(d.product==='XK' && (!d.gateway||!d.gateway.trim())) return {ok:false,msg:'请输入网关标识'};
      if(!envNormalAuthEnabled && (!d.proxyUser||!d.proxyUser.trim())) return {ok:false,msg:'请输入代理用户'};
    }
    return {ok:true};
  }

  function openEnvModal(mode,index){
    envMode=mode==='view'?'view':(mode==='edit'?'edit':'create');
    envEditIndex=(envMode==='create')?-1:(index||-1);
    var item=envEditIndex>=0?ENV_ITEMS[envEditIndex]:null;
    envOriginalProduct=item?(item.product||''):'';
    if(envMode==='create'){ envConnSupported=false; envConnBlocked=''; envConnMode='auth'; }
    else if(item){ envConnSupported=item.envConn==='auth'||probeAuthSupport(item.url); envConnBlocked=''; envConnMode=item.envConn||'cred'; }
    _envBridge.open('env-config');
  }
  function closeEnvModal(){ _envBridge.close('env-config'); }

  function _getEnvInitialData(){
    if(envEditIndex<0||!ENV_ITEMS[envEditIndex]){
      return {mode:'create',fields:{name:'',url:'',product:'',dataCenter:'',clientId:'',clientSecret:'',gateway:'',proxyUser:'',isDefault:false},
              connMode:'auth',normalAuthEnabled:true,preset:false,connState:'none'};
    }
    var e=ENV_ITEMS[envEditIndex];
    var normalAuth=e.normalAccessToken!==false;
    var conn=e.envConn||'cred';
    return {
      mode:envMode,
      fields:{name:e.name,url:e.url,product:e.product||'',dataCenter:e.dataCenter||'',
              clientId:e.clientId||'',clientSecret:envMaskedValue,
              gateway:(e.product==='XK'?envMaskedValue:''),
              proxyUser:normalAuth?'':(e.proxyUser||''),isDefault:!!e.isDefault},
      connMode:conn==='auth'?'auth':'cred',
      normalAuthEnabled:normalAuth,
      preset:e.source==='cloud',
      connState:e.grantState==='revoked'?'disconnected':(e.grantedBy?'connected':'none')
    };
  }
  function _saveEnvFromReact(d){
    var v=_validateEnvForm(d);
    if(!v.ok){ toast(v.msg,'warning'); return; }
    var name=d.name.trim();
    var url=normalizeEnvUrl(d.url);
    if(envMode==='view'&&envEditIndex>=0){
      ENV_ITEMS[envEditIndex].isDefault=d.isDefault;
      if(d.isDefault) ENV_ITEMS.forEach(function(e,j){ if(j!==envEditIndex) e.isDefault=false; });
      closeEnvModal(); _envTouch(); toast('已更新默认环境设置'); return;
    }
    if(envConnMode==='auth'&&envMode==='create'){
      envAuthorizeIndex=-1; envAuthorizeName=name;
      _envAuthorizeBridge.open('env-authorize');
      if(envAuthorizeTimer) clearTimeout(envAuthorizeTimer);
      envAuthorizeTimer=setTimeout(function(){ envAuthorizeTimer=null; _consentBridge.open('consent'); },900);
      return;
    }
    if(envMode==='edit'&&envEditIndex>=0){
      var e=ENV_ITEMS[envEditIndex];
      e.name=name; e.url=url; e.product=d.product||'';
      e.dataCenter=d.dataCenter||''; e.clientId=(d.clientId||'').trim();
      if(d.clientSecret&&d.clientSecret!==envMaskedValue) e.clientSecret=d.clientSecret.trim();
      if(d.product==='XK'&&d.gateway&&d.gateway!==envMaskedValue) e.gateway=d.gateway.trim();
      else if(d.product!=='XK') e.gateway='';
      e.normalAccessToken=envNormalAuthEnabled;
      if(envNormalAuthEnabled) e.proxyUser='';
      else e.proxyUser=(d.proxyUser||'').trim();
      if(d.isDefault) ENV_ITEMS.forEach(function(it,j){ it.isDefault=(j===envEditIndex); });
      closeEnvModal(); _envTouch();
      toast('已更新环境：'+name); return;
    }
    /* 新增（凭证模式） */
    ENV_ITEMS.push({name:name,url:url,product:d.product||'',source:'local',
      dataCenter:d.dataCenter||'',clientId:(d.clientId||'').trim(),clientSecret:(d.clientSecret||'').trim(),
      gateway:d.product==='XK'?(d.gateway||'').trim():'',normalAccessToken:true,proxyUser:'',
      envConn:'cred',isDefault:!!d.isDefault});
    if(d.isDefault) ENV_ITEMS.forEach(function(it,j){ if(j!==ENV_ITEMS.length-1) it.isDefault=false; });
    closeEnvModal(); _envTouch();
    toast('已新增环境：'+name);
  }

  /* ---------- 授权流程 ---------- */
  function startAuthorize(index,name){
    envAuthorizeIndex=index>=0?index:-1;
    envAuthorizeName=name||'新环境';
    _envAuthorizeBridge.open('env-authorize');
    if(envAuthorizeTimer) clearTimeout(envAuthorizeTimer);
    envAuthorizeTimer=setTimeout(function(){ envAuthorizeTimer=null; _consentBridge.open('consent'); },900);
  }
  function closeAuthorize(){
    if(envAuthorizeTimer){ clearTimeout(envAuthorizeTimer); envAuthorizeTimer=null; }
    _consentBridge.close('consent');
    _envAuthorizeBridge.close('env-authorize');
  }
  function _retryAuthorize(){ startAuthorize(envAuthorizeIndex,envAuthorizeName); }

  /* ---------- 浏览器授权页 ---------- */
  function erpOrigin(){
    var item=envAuthorizeIndex>=0?ENV_ITEMS[envAuthorizeIndex]:null;
    if(envEditIndex>=0&&ENV_ITEMS[envEditIndex]) item=ENV_ITEMS[envEditIndex];
    return (item?item.url:'')||'https://erp.example.com';
  }
  function sameHost(url){
    try{ return !!erpBrowserSession && new URL(url).host===erpBrowserSession.host; }
    catch(e){ return false; }
  }
  function _getConsentStep(){
    var reused=sameHost(erpOrigin());
    return reused?'grant':'login';
  }
  function _consentLogin(){
    try{ erpBrowserSession={host:new URL(erpOrigin()).host,user:'吴**超'}; }catch(e){ erpBrowserSession=null; }
    _consentBridge.close('consent');
    _consentBridge.open('consent');
  }
  function finishAuthorize(granted){
    envAuthorizeDc=ENV_DATA_CENTERS[0].id;
    _consentBridge.close('consent');
    if(envAuthorizeIndex>=0&&ENV_ITEMS[envAuthorizeIndex]){
      var e=ENV_ITEMS[envAuthorizeIndex];
      e.envConn='auth';
      if(granted){ e.grantState=''; e.grantedBy='吴**超'; e.grantedAt='今天'; e.lastUsed='刚刚'; e.dataCenter=envAuthorizeDc; }
      else{ e.grantState=e.grantedBy?'revoked':'none'; }
    }else{
      /* OAuth 新增 */
      ENV_ITEMS.push({name:envAuthorizeName,url:erpOrigin(),product:'',source:'local',
        dataCenter:envAuthorizeDc,clientId:'',clientSecret:'',gateway:'',
        normalAccessToken:true,proxyUser:'',envConn:'auth',isDefault:false,
        grantedBy:granted?'吴**超':'',grantedAt:granted?'今天':'',lastUsed:granted?'刚刚':'',
        grantState:granted?'':'none'});
      _envTouch();
    }
    closeAuthorize(); closeEnvModal();
    toast(granted?('已连接：'+envAuthorizeName):('已保存：'+envAuthorizeName+'（未授权）'));
  }
  function _consentAllow(){ finishAuthorize(true); }
  function _consentDeny(){ finishAuthorize(false); }
  function _consentSwitchAccount(){ erpBrowserSession=null; _consentBridge.close('consent'); _consentBridge.open('consent'); }

  /* ---------- 断开连接 ---------- */
  function openDisconnect(index,name){
    envDisconnectIndex=index>=0?index:-1;
    envDisconnectName=name||'该环境';
    _envDisconnectBridge.open('env-disconnect');
  }
  function closeDisconnect(){ _envDisconnectBridge.close('env-disconnect'); }
  function _confirmDisconnect(){
    if(envDisconnectIndex>=0&&ENV_ITEMS[envDisconnectIndex]){
      ENV_ITEMS[envDisconnectIndex].grantState='revoked';
      _envTouch();
    }
    closeDisconnect(); closeEnvModal();
  }

  /* ---------- 启用 AccessToken 确认 ---------- */
  function _openAuthConfirm(){ _envAuthConfirmBridge.open('env-auth-confirm'); }
  function _closeAuthConfirm(){ _envAuthConfirmBridge.close('env-auth-confirm'); }
  function _confirmAuthConfirm(){ _closeAuthConfirm(); envNormalAuthEnabled=true; _envBridge.touch(); }

  /* ---------- 其它工具函数 ---------- */
  function _testEnvConnection(){ toast('连接测试通过'); }
  function _envToggleNormalAuth(){
    if(envNormalAuthEnabled){ envNormalAuthEnabled=false; _envBridge.touch(); return; }
    _openAuthConfirm();
  }
  function _envDisconnectAction(){
    var name=envEditIndex>=0&&ENV_ITEMS[envEditIndex]?ENV_ITEMS[envEditIndex].name:'';
    openDisconnect(envEditIndex,name);
  }
  function _envReauth(){
    var name=envEditIndex>=0&&ENV_ITEMS[envEditIndex]?ENV_ITEMS[envEditIndex].name:'';
    startAuthorize(envEditIndex,name);
  }



  /* ---------- 侧边栏图标功能 ---------- */
  var sbSearchIcon=$('#sbSearchIcon');
  var sbCollapseIcon=$('#sbCollapseIcon');
  var sbSearch=$('#sbSearch');
  var sbSearchInput=$('#sbSearchInput');
  var sidebarEl=$('.sidebar');
  var newProjectIcon=$('#newProjectIcon');
  var viewToggleIcon=$('#viewToggleIcon');
  var sbScroll=$('.sb-scroll');
  /* 搜索：点击展开/收起 */
  var sbSearchClose=$('#sbSearchClose');
  function closeSbSearch(){
    sbSearch.classList.remove('show');
    sbSearchInput.value='';
    filterSidebar('');
  }
  if(sbSearchIcon){
    sbSearchIcon.addEventListener('click',function(){
      sbSearch.classList.toggle('show');
      if(sbSearch.classList.contains('show')){
        sbSearchInput.focus();
      }else{
        closeSbSearch();
      }
    });
    sbSearchInput.addEventListener('input',function(){ filterSidebar(this.value); });
    sbSearchInput.addEventListener('keydown',function(e){
      if(e.key==='Escape'){ closeSbSearch(); sbSearchIcon.focus(); }
    });
  }
  if(sbSearchClose){
    sbSearchClose.addEventListener('click',closeSbSearch);
  }
  function filterSidebar(q){
    q=q.trim().toLowerCase();
    $$('.sub-item, .flat-item',sbScroll).forEach(function(item){
      var txt=item.textContent.trim().toLowerCase();
      item.style.display=(!q||txt.indexOf(q)>-1)?'':'none';
    });
    $$('.group-head',sbScroll).forEach(function(h){
      if(!q){ h.style.display=''; return; }
      var group=h.nextElementSibling;
      var hasVisible=false;
      while(group && !group.classList.contains('group-head') && !group.classList.contains('section-label')){
        if(group.classList.contains('sub-item') && group.style.display!=='none'){ hasVisible=true; break; }
        group=group.nextElementSibling;
      }
      h.style.display=hasVisible?'':'none';
    });
  }
  /* 侧边栏宽度变化时，把腾出/占用的空间给预览区，保持会话区宽度不变 */
  var _prevWishW=null;
  function absorbSidebarDelta(fn){
    var view=document.getElementById('view-chat');
    var ps=document.getElementById('chatPreviewSide');
    var open=view&&view.classList.contains('preview-open')&&ps;
    var before=open?sidebarEl.offsetWidth:0;
    fn();
    if(!open)return;
    var delta=before-sidebarEl.offsetWidth;
    if(!delta)return;
    var want=(_prevWishW==null?ps.offsetWidth:_prevWishW)+delta;
    _prevWishW=want;
    var w=want;
    var maxW=view.offsetWidth-360-(chatResizer?chatResizer.offsetWidth:1);
    if(w>maxW)w=maxW;
    if(w<200)w=200;
    ps.style.maxWidth='none';
    ps.style.width=w+'px';
    try{localStorage.setItem('chatPreviewWidth',w+'px')}catch(e){}
  }
  /* 收起/展开侧边栏（折叠状态持久化到 localStorage） */
  function syncCollapseIcon(){
    if(!sbCollapseIcon)return;
    var collapsed=sidebarEl.classList.contains('collapsed');
    sbCollapseIcon.setAttribute('data-tooltip',collapsed?'展开侧边栏':'收起侧边栏');
    sbCollapseIcon.innerHTML=collapsed
      ? '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>'
      : '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>';
  }
  function setSidebarCollapsed(collapsed){
    absorbSidebarDelta(function(){ sidebarEl.classList.toggle('collapsed',collapsed); });
    syncCollapseIcon();
    try{localStorage.setItem('sidebarCollapsed',collapsed?'1':'0')}catch(e){}
  }
  /* 刷新后保持折叠状态：先于首帧应用，避免展开再收起的闪动 */
  if(localStorage.getItem('sidebarCollapsed')==='1'){
    sidebarEl.classList.add('collapsed');
  }
  syncCollapseIcon();
  if(sbCollapseIcon){
    sbCollapseIcon.addEventListener('click',function(){
      setSidebarCollapsed(!sidebarEl.classList.contains('collapsed'));
    });
  }
  /* 展开侧边栏浮动按钮 */
  var expandBtn=$('#expandSidebarBtn');
  if(expandBtn){
    expandBtn.addEventListener('click',function(){ setSidebarCollapsed(false); });
  }
  /* 新增项目 */
  if(newProjectIcon){
    newProjectIcon.addEventListener('click',function(e){
      e.stopPropagation();
      var fi=document.createElement('input');
      fi.type='file';
      fi.addEventListener('change',function(){
        if(fi.files.length>0) toast('已选择文件：'+fi.files[0].name);
      });
      fi.click();
    });
  }
  /* 显示设置：紧凑/详细 */
  if(viewToggleIcon){
    viewToggleIcon.addEventListener('click',function(){
      sbScroll.classList.toggle('compact');
    });
  }

  /* ---------- sidebar nav ---------- */
  navItems.forEach(function(n){
    n.addEventListener('click',function(){
      var name=n.textContent.trim();
      setNavActive(name);
      if(name==='应用开发' || name==='苍穹应用'){
        showView('apps');
      }else if(name==='技能开发'){
        showView('skills');
      }else if(name==='智能体开发'){
        showView('agents');
      }else if(name==='协作开发'){
        showView('collab');
        cvInit();
        cvSwitchView(cvLastTab);
      }else if(name==='新会话'){
        showView('newtask');
        input.setAttribute('data-placeholder','布置任务');
        appDd.classList.add('hidden');
        modeItems.forEach(function(m){m.classList.remove('checked')});
      }
    });
  });
  function applyModeSilent(mode){
    modeItems.forEach(function(m){ m.classList.toggle('checked', m.getAttribute('data-val')===mode); });
    input.focus();
  }

  /* ---------- 我的应用 (apps view) ---------- */
  $$('#view-apps .tab').forEach(function(t){
    t.addEventListener('click',function(){
      $$('#view-apps .tab').forEach(function(i){i.classList.remove('active')});
      t.classList.add('active');
    });
  });
  $('.btn-new:not(.apps-new-btn)') && $('.btn-new:not(.apps-new-btn)').addEventListener('click',function(){});
  /* 卡片点击打开会话预览。抽成具名函数：应用开发/技能开发/智能体开发三个卡片网格
     的 React 版本（src/views/*View.jsx）也调用这同一份逻辑（window.__lingeeBridge），
     避免两边各写一份、行为跑偏。 */
  function openAppCardChat(name){
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
  }
  $$('.app-card').forEach(function(c){
    c.addEventListener('click',function(e){
      if(e.target.closest('.card-more')){ e.stopPropagation(); toast('更多操作'); return; }
      var name=$('.card-title',c).textContent.trim();
      openAppCardChat(name);
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

  /* ---------- segmented tabs (工作 / 开发) ---------- */
  $$('.seg-item').forEach(function(s){
    s.addEventListener('click',function(){
      $$('.seg-item').forEach(function(i){i.classList.remove('active')});
      s.classList.add('active');
      toast(s.textContent.trim());
    });
  });

  /* ---------- project groups collapse ---------- */
  $$('.project-group').forEach(function(g){
    var head=$('.group-head',g);
    if(!head) return;
    head.addEventListener('click',function(){
      g.classList.toggle('collapsed');
      var c=$('.caret',head); if(c) c.classList.toggle('rot', g.classList.contains('collapsed'));
    });
  });
  // standalone second group-head (rotate its caret only)
  $$('.sb-scroll > .group-head').forEach(function(h){
    h.addEventListener('click',function(){ var c=$('.caret',h); if(c) c.classList.toggle('rot'); });
  });

  /* ---------- composer input + send ---------- */
  var sendBtn=$('#sendBtn');
  function refreshSend(){ if(sendBtn) sendBtn.classList.toggle('active', input.textContent.trim().length>0); }
  /* composer input/send 事件已迁到 React NewTaskView */
  var chatMessages=$('#chatMessages');
  var messagesList=$('#messagesList');
  /* 预览面板关闭按钮 */
  /* 预览面板关闭/页签/MCP 列表已迁到 React */
  /* MCP 工具列表渲染 */
  renderMcpList();
  var listBodyEl=$('#listBody');
  if(listBodyEl){
    listBodyEl.addEventListener('change',function(e){
      if(e.target.tagName!=='INPUT'||e.target.type!=='checkbox')return;
      var tr=e.target.closest('tr');
      if(!tr)return;
      tr.classList.toggle('on',e.target.checked);
    });
  }
  var listCheckAll=$('#listCheckAll');
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
  /* 列表点击表头排序 */
  var sortState={col:-1,dir:''};
  var sortTypeMap={0:'text',1:'text',2:'text',3:'text',4:'date',5:'num',6:'text'};
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
  /* 预览尺寸切换：桌面 / 移动 */
  var previewVp=$('#previewViewport');
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
  /* 顶部网址可编辑 */
  var previewUrlInput=$('#previewUrlText');
  if(previewUrlInput){
    var _urlCommitted=previewUrlInput.value;
    previewUrlInput.addEventListener('focus',function(){ this.select(); });
    previewUrlInput.addEventListener('keydown',function(e){
      if(e.key==='Enter'){
        var v=this.value.trim();
        if(!v){ this.value=_urlCommitted; this.blur(); return; }
        if(!/^[a-z][a-z0-9+.-]*:/i.test(v)) v='https://'+v;
        this.value=v;
        _urlCommitted=v;
        this.blur();
      }else if(e.key==='Escape'){
        this.value=_urlCommitted;
        this.blur();
      }
    });
    previewUrlInput.addEventListener('blur',function(){ this.value=_urlCommitted; this.scrollLeft=0; });
  }
  /* 预览面板刷新按钮 */
  var previewRefreshBtn=$('#previewRefresh');
  if(previewRefreshBtn){
    previewRefreshBtn.addEventListener('click',function(){
      var frame=document.getElementById('chatPreviewFrame');
      if(frame&&frame.src){frame.src=frame.src}
    });
  }
  /* 分栏拖拽 + localStorage 缓存 */
  var chatResizer=$('#chatResizer');
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
      ps.style.maxWidth='none';
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
        _prevWishW=null;
        if(ps&&ps.style.width)localStorage.setItem('chatPreviewWidth',ps.style.width);
      }
    });
  }
  /* simple markdown → HTML renderer */
  /* 预览区开关状态：以 localStorage 为唯一来源，默认收起 */
  /* ---------- chat composer 发送 ---------- */
  var chatInput=$('#chatInput');
  /* 所有下拉面板关闭时恢复焦点到输入框 */
  if($$('.dropdown').length) $$('.dropdown').forEach(function(dd){
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
  /* chat input/send 已迁到 React ChatView */
  /* 历史记录面板已迁到 React */

  /* ---------- 新建应用弹窗（Phase 2b antd 化，见 docs/react-migration-plan.md） ----------
     会话页/首页"关联应用"下拉里的"新建应用"子弹窗，已迁到 antd Modal +
     Select（见 src/components/chatapp/NewAppModal.jsx）。原来手写的"选择应用"
     浮层（sourceAppMenu 一套 DOM+定位逻辑）整个删掉，改用 antd Select 自带的
     搜索下拉——这正是方案 §3.2 说的"不要为了长得像又拼一遍 antd 已经提供的
     交互"。这里只广播开关状态和来源（home=首页 / chat=会话页），表单校验、
     确认后的落库（selectApp/selectChatApp）仍在这个文件里。 */
  var _newAppBridge=_makeModalBridge();
  var newAppSource='home';
  function openNewAppModal(source){
    newAppSource=source||'home';
    _newAppBridge.open('newapp');
  }
  function closeNewAppModal(){ _newAppBridge.close('newapp'); }
  function getFullAppOptions(){
    return fullAppData.map(function(d){
      return {value:d.app,label:appDisplayName(d,fullAppData),cloud:d.cloud};
    });
  }
  /* 校验 + 落库 + toast，供 React 侧表单提交时调用；校验不通过只 toast，不关弹窗。 */
  function confirmNewApp(payload){
    payload=payload||{};
    var name=(payload.name||'').trim();
    var typeVal=payload.type||'new';
    if(!name){ toast('请输入应用名称'); return; }
    if((typeVal==='extend'||typeVal==='inherit') && !payload.sourceApp){
      toast('请选择已有应用'); return;
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
  }

  /* ---------- 专家/专家团弹窗 bridge（Phase 2c antd 化） ----------
     4 个弹窗各自一个 bridge 实例。teamDraft/xeDraft 仍在本文件维护，
     React 侧通过 bridge.getDraft() 读取、bridge.updateXxx() 修改，
     每次修改后调 _teamBridge.touch() 触发 React 重渲染。 */
  var _expertBridge=_makeModalBridge();
  var _expertViewingId=null;
  var _expertEditBridge=_makeModalBridge();
  var _expertEditId=null;
  var _teamBridge=_makeModalBridge();
  var _teamEditingId=null;
  var _memberBridge=_makeModalBridge();
  /* ERP 环境弹窗 bridge（Phase 2d antd 化） */
  var _envBridge=_makeModalBridge();
  var _envAuthorizeBridge=_makeModalBridge();
  var _consentBridge=_makeModalBridge();
  var _envDisconnectBridge=_makeModalBridge();
  var _envAuthConfirmBridge=_makeModalBridge();

  /* ---------- ＋号菜单：上传文件 ---------- */
  var addBtn=$('.round-btn[aria-label="add"]');
  var chatAddBtn=$('.round-btn[aria-label="chat-add"]');
  function openFilePicker(){
    var fi=document.createElement('input');
    fi.type='file';
    fi.addEventListener('change',function(){
      if(fi.files.length>0) toast('已选择文件：'+fi.files[0].name);
    });
    fi.click();
  }
  /* ---------- ＋按钮下拉菜单 ---------- */
  bindAddDropdown(addBtn);
  bindAddDropdown(chatAddBtn);

  /* header + footer small affordances */
  $$('.sb-head-icons .ic').forEach(function(i,idx){ i.addEventListener('click',function(){ toast(idx===0?'搜索':'折叠侧栏'); }); });

  /* 首页导航卡片已迁到 React，见 src/views/HomeView.jsx */

  /* ---------- Logo 点击回首页 ---------- */
  var brandEl=$('.brand');
  if(brandEl){
    brandEl.style.cursor='pointer';
    brandEl.addEventListener('click',function(){
      showView('newtask');
      setNavActive('新会话');
      input.setAttribute('data-placeholder','布置任务');
      appDd.classList.add('hidden');
      modeItems.forEach(function(m){m.classList.remove('checked')});
      input.focus();
    });
  }

  /* ---------- 应用开发 新建下拉 ---------- */
  /* 从卡片网格页发起「新建」：跳到新会话并预选模式。抽成具名函数，
     应用开发页的 React 版本通过 window.__lingeeBridge 调这同一份逻辑。 */
  function startNewTaskWithMode(mode){
    showView('newtask');
    setNavActive(mode);
    applyMode(mode,true);
    renderModeTag();
  }
  var appsNewBtn=$('.apps-new-btn');
  var appsNewDd=$('#appsNewDropdown');
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
        startNewTaskWithMode(mode);
      });
    });
    document.addEventListener('click',function(){appsNewDd.classList.remove('open')});
  }

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

  /* ---------- URL 参数自动测试 ---------- */
  var testParam=new URLSearchParams(location.search).get('test');
  if(testParam){
    input.textContent=testParam;
    refreshSend();
    setTimeout(doSend,300);
  }

  /* ---------- custom tooltip (300ms delay) ---------- */
  var tipEl=document.createElement('div');
  tipEl.className='native-tip';
  document.body.appendChild(tipEl);
  var tipTimer;
  function positionTip(el,text){
    tipEl.textContent=text;
    tipEl.classList.add('show');
    var r=el.getBoundingClientRect();
    var tw=tipEl.offsetWidth, th=tipEl.offsetHeight;
    var x=r.left+r.width/2-tw/2;
    var y=r.top-th-4;
    if(y<4) y=r.bottom+4;
    if(x<4) x=4;
    if(x+tw>window.innerWidth-4) x=window.innerWidth-4-tw;
    tipEl.style.left=x+'px';
    tipEl.style.top=y+'px';
  }
  document.addEventListener('mouseover',function(e){
    var el=e.target.closest('[data-tooltip]');
    if(!el) return;
    clearTimeout(tipTimer);
    tipTimer=setTimeout(function(){ positionTip(el,el.getAttribute('data-tooltip')); },300);
  });
  document.addEventListener('mouseout',function(e){
    var el=e.target.closest('[data-tooltip]');
    if(!el) return;
    clearTimeout(tipTimer);
    tipEl.classList.remove('show');
  });

  /* ---------- 全局键盘快捷键 (W3C keydown) ----------
     快捷键面板本身已迁到 antd Modal（src/components/shortcut/ShortcutModal.jsx），
     这里只广播开关状态，面板内容是纯静态展示，不需要经业务函数。 */
  var _shortcutBridge=_makeModalBridge();
  function openShortcut(){ _shortcutBridge.open('shortcut'); }
  function closeShortcut(){ _shortcutBridge.close('shortcut'); }

  document.addEventListener('keydown',function(e){
    var mod=e.metaKey||e.ctrlKey;
    var key=e.key.toLowerCase();
    var inEditable=(e.target.isContentEditable||e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA');

    /* ⌘/Ctrl+/ — 显示快捷键帮助 */
    if(mod && key==='/'){
      e.preventDefault();
      openShortcut();
      return;
    }
    /* ⌘/Ctrl+K — 搜索 */
    if(mod && key==='k'){
      e.preventDefault();
      if(sbSearchIcon) sbSearchIcon.click();
      return;
    }
    /* ⌘/Ctrl+B — 折叠侧边栏 */
    if(mod && key==='b'){
      e.preventDefault();
      if(sbCollapseIcon) sbCollapseIcon.click();
      return;
    }
    /* ⌘/Ctrl+N — 新会话 */
    if(mod && key==='n' && !e.shiftKey){
      e.preventDefault();
      showView('newtask');
      setNavActive('新会话');
      if(input){ input.setAttribute('data-placeholder','布置任务'); input.innerHTML=''; input.focus(); }
      if(appDd) appDd.classList.add('hidden');
      if(modeItems) modeItems.forEach(function(m){m.classList.remove('checked')});
      return;
    }
    /* ⌘/Ctrl+Shift+H — 历史记录 */
    if(mod && e.shiftKey && key==='h'){
      e.preventDefault();
      if(historyBtn) historyBtn.click();
      return;
    }
    /* Alt+1~4 — 模式切换 */
    if(e.altKey && !mod && !e.shiftKey){
      var modes=['技能开发','智能体开发','通用应用','苍穹应用'];
      var idx={'1':0,'2':1,'3':2,'4':3}[key];
      if(idx!==undefined){
        e.preventDefault();
        if(modeItems && modeItems[idx]) modeItems[idx].click();
        return;
      }
    }
    /* Esc — 关闭面板/下拉/搜索/右键/帮助 */
    if(key==='escape' && !mod && !e.shiftKey && !e.altKey){
      if(_shortcutBridge.isOpen('shortcut')){ closeShortcut(); return; }
      if(_newAppBridge.isOpen('newapp')){ closeNewAppModal(); return; }
      if(_expertBridge.isOpen('expert-detail')){ closeExpertModal(); return; }
      if(_expertEditBridge.isOpen('expert-edit')){ closeExpertEditor(); return; }
      if(_teamBridge.isOpen('team-config')){ closeTeamModal(); return; }
      if(_memberBridge.isOpen('member-picker')){ closeMemberModal(); return; }
      if(_envAuthConfirmBridge.isOpen('env-auth-confirm')){ _closeAuthConfirm(); return; }
      if(_consentBridge.isOpen('consent')){ _consentBridge.close('consent'); return; }
      if(_envAuthorizeBridge.isOpen('env-authorize')){ closeAuthorize(); return; }
      if(_envDisconnectBridge.isOpen('env-disconnect')){ closeDisconnect(); return; }
      if(_envBridge.isOpen('env-config')){ closeEnvModal(); return; }
      if(historyPanel && historyPanel.classList.contains('show')){ closeHistory(); return; }
      if(ctxMenu && ctxMenu.classList.contains('show')){ hideCtxMenu(); return; }
      if(sbSearch && sbSearch.classList.contains('show')){
        sbSearchInput.value=''; filterSidebar(''); sbSearch.classList.remove('show');
        return;
      }
      closeAll(null);
    }
  });

  /* Enter 键在可聚焦元素上触发 click (W3C accessibility) */
  $$('.nav-item, .sub-item, .mode-item, .seg-item, .sb-head-icons .ic, .lbl-icons .ic').forEach(function(el){
    el.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); el.click(); }
    });
  });

  /* ---------- Design System 交互 ---------- */

  /* 路径优先解析视图，兼容旧 ?view= 链接，无则从 localStorage 恢复 */
  var _savedPath=localStorage.getItem('lingeeUrlState')||'';
  var _pathParts=location.pathname.replace(/^\/+|\/+$/g,'').split('/');
  var dsViewParam=_pathParts[0]||'';
  if(!dsViewParam){
    var _oldView=new URLSearchParams(location.search).get('view');
    if(_oldView) dsViewParam=_oldView;
    else if(_savedPath){ var _m=_savedPath.match(/\/([^\/?]+)/); if(_m) dsViewParam=_m[1]; }
  }
  /* 专家视图已并入协作开发，兼容旧链接 */
  if(dsViewParam==='experts') dsViewParam='collab';
  var dsSearch='?'+(dsViewParam?'view='+dsViewParam:'');
  var dsTokenParam=new URLSearchParams(location.search).get('token')||new URLSearchParams(dsSearch).get('token');
  /* design 已迁到 React 路由，BrowserRouter 自动处理 /design */
  if(dsViewParam==='design'){
    showView('design');
    if(navItems) navItems.forEach(function(n){n.classList.remove('active')});
  }else if(dsViewParam==='chat'){
    showView('chat');
    setNavActive('新会话');
    /* 恢复会话内容 */
    var title='采购订单管理应用开发';
    $('#chatTitle').textContent=title;
    if(messagesList) messagesList.innerHTML='';
    appendUserMessage('帮我开发'+title+'功能');
    var responseEl=appendAssistantMessage();
    simulateAIResponse(responseEl,true);
    selectChatApp('采购订单管理');
    if(chatAppDd) chatAppDd.classList.add('disabled');
  }else if(dsViewParam && dsViewParam!=='newtask'){
    showView(dsViewParam);
    if(dsViewParam==='skills') setNavActive('技能开发');
    else if(dsViewParam==='agents') setNavActive('智能体开发');
    else if(dsViewParam==='apps') setNavActive('应用开发');
    else if(dsViewParam==='collab'){
      setNavActive('协作开发');
      /* 协作开发模块在文件末尾才初始化，这里只记下要打开的页签 */
      cvPendingTab=new URLSearchParams(dsSearch).get('tab')||'tasks';
      cvPendingProj=new URLSearchParams(dsSearch).get('proj')||'';
    }
  }else{
    /* 默认显示新会话 */
    showView('newtask');
    setNavActive('新会话');
  }


  /* ============================================================
     专家 / 专家团
     数据取自 lingee-build/packages/opencode/builtin-experts/
     技能名取自 packages/opencode/builtin-skills/
     ============================================================ */
  var EXPERTS=[
    {id:'software-team-lead',k:'lead',name:'软件团队负责人',role:'交付负责人',by:'Lingee 内置',
     desc:'协调范围、分工、集成、风险与交付闭环，是专家团里唯一能开 kickoff 与做最终集成确认的角色。',
     tags:['交付管理','团队协调'],modes:['分析','设计','集成','评审','验证','恢复'],
     comp:['delivery.orchestration · principal','delivery.integration · advanced'],
     cmds:[['帮我把[交付目标]拆成范围、非目标和验收门禁','闭合范围，明确谁负责、做到什么算完'],
           ['这次交付复盘一下，还有哪些残余风险','汇总各角色证据，给出关闭或升级建议']]},
    {id:'software-product-manager',k:'pm',name:'软件产品经理',role:'产品经理',by:'Lingee 内置',
     desc:'把用户目标翻译成有优先级、可观察的需求与验收条件。',
     tags:['需求分析','验收设计'],modes:['分析','设计','评审'],
     comp:['product.requirements · principal','product.acceptance-design · advanced'],
     cmds:[['把[用户目标]拆成一份带验收条件的清单','把目标整理成有范围、可验收的需求'],
           ['帮我给这些需求补齐验收标准','补上可观察、可验证的验收条件'],
           ['这次哪些事不做？帮我列一下非目标','明确边界，防止范围蔓延']]},
    {id:'software-architect',k:'arch',name:'软件架构师',role:'软件架构师',by:'Lingee 内置',
     desc:'设计可演进的系统边界、合同、数据流与失败处理，产出架构文档与可执行的实现计划。',
     tags:['软件架构','可靠性'],modes:['分析','设计','集成','评审','恢复'],
     comp:['architecture.system-design · principal','architecture.reliability · advanced'],
     cmds:[['按[需求]设计系统的边界、合同和失败处理','从需求产出可演进的架构方案与迁移路径'],
           ['这几个方案怎么选？帮我做技术选型','按质量属性评估备选方案并记录取舍'],
           ['把架构拆成可以直接开工的实现计划','产出带可执行验证命令的编码任务图']]},
    {id:'software-engineer',k:'eng',name:'软件工程师',role:'软件工程师',by:'Lingee 内置',
     desc:'实现可维护的软件变更并完成针对性验证，只改授权范围内的代码。',
     tags:['软件实现','系统集成'],modes:['分析','设计','实现','集成','验证','恢复'],
     comp:['engineering.implementation · advanced','engineering.integration · advanced'],
     skills:['cosmic-app-builder','general-app-builder','site-builder'],
     cmds:[['按[验收条件]把功能实现出来','完成最小完整变更并跑通验证'],
           ['这个 bug 帮我复现并修掉','定位根因、修复并补回归测试'],
           ['做一个单页小工具，一次写完','小应用一次性写完全部代码 + build 验证']]},
    {id:'software-qa-engineer',k:'qa',name:'软件测试工程师',role:'质量工程师',by:'Lingee 内置',
     desc:'独立验证验收行为、回归影响与交付风险，给出基于证据的质量结论。',
     tags:['质量保障','独立验证'],modes:['分析','设计','评审','验证'],
     comp:['quality.verification · principal','quality.regression-analysis · advanced'],
     cmds:[['针对[变更说明]出一份验证计划','按风险模型设计验收与回归场景'],
           ['帮我端到端跑一遍，看看能不能过','实际跑 build、请求与用例并留存证据'],
           ['这个版本能发吗？给个质量结论','给出 pass / pass-with-risk / fail 与理由']]},
    {id:'code-reviewer',k:'cr',name:'代码评审专家',role:'实现代码评审',by:'Lingee 内置',ro:true,
     desc:'独立评审实现代码的正确性、并发安全与合同落实情况，只读不改。',
     tags:['只读评审','正确性'],modes:['评审','验证'],
     comp:['implementation-correctness · principal','concurrent-commit-model · principal'],
     cmds:[['帮我评审这段代码有没有正确性问题','把合同义务追溯到代码路径，报告可复现的缺陷']]},
    {id:'security-reviewer',k:'sec',name:'安全评审专家',role:'应用安全评审',by:'Lingee 内置',ro:true,
     desc:'基于信任边界建立威胁模型，演练滥用、竞态与绕过场景并给出风险判定。',
     tags:['只读评审','威胁建模'],modes:['评审','验证'],
     comp:['application-security · principal','filesystem-safety · advanced'],
     cmds:[['这个功能有安全风险吗？帮我做威胁建模','演练滥用与绕过场景，判断风险是否可接受']]},
    {id:'read-only-analyst',k:'ana',name:'只读分析专家',role:'软件分析',by:'Lingee 内置',ro:true,
     desc:'在不改动工作区的前提下做有边界的源码分析与结论交叉验证。',
     tags:['只读分析'],modes:['分析','评审','验证'],
     comp:['software.analysis · advanced'],
     cmds:[['帮我读一下这块代码是怎么跑的','有边界地读源码，给出结论与证据，不改文件']]},
    {id:'frontend-engineer',k:'fe',name:'前端工程专家',role:'前端工程师',by:'Lingee 内置',
     desc:'金蝶前端规范下的组件实现、响应式布局与交互调试。',
     tags:['React','响应式','组件库'],modes:['设计','实现','验证'],
     comp:['engineering.frontend · advanced'],skills:['cosmic-kwc-builder','frontend-design'],
     cmds:[['按[设计稿与规范]把页面实现出来','实现响应式页面与交互'],
           ['帮我抽一个可复用的组件','产出符合金蝶前端规范的组件'],
           ['页面和设计稿对不上，帮我调一下','把实现调到与设计稿一致']]},
    {id:'ux-designer',k:'ux',name:'界面设计专家',role:'交互 / 视觉设计',by:'Lingee 内置',
     desc:'信息架构、交互流程与视觉规范，产出可直接交付前端的设计说明。',
     tags:['交互设计','视觉规范'],modes:['分析','设计','评审'],
     comp:['design.interaction · advanced'],skills:['prototype-builder','frontend-design'],
     cmds:[['围绕[用户目标]先对齐设计目标','产出设计简报，对齐业务目标与设计策略'],
           ['帮我梳理这个模块的信息架构','理清导航、层级与页面骨架'],
           ['帮我走查一下这个页面','对已实现页面做规范与可用性检查']]},
    {id:'cosmic-form',k:'form',name:'苍穹表单专家',role:'苍穹表单',by:'Lingee 内置',
     desc:'KDDP 表单引擎的字段、校验、联动与权限配置。',
     tags:['表单设计','字段校验'],modes:['分析','设计','实现'],
     comp:['cosmic.form-design · advanced'],skills:['cosmic-requirements-spec'],
     cmds:[['按[已确认需求]建一张苍穹单据','设计表单结构与字段'],
           ['这几个字段要联动，帮我配一下','配置校验规则与字段联动逻辑'],
           ['这张单据的权限怎么配？','设置单据与字段级权限']]},
    {id:'cosmic-workflow',k:'flow',name:'苍穹工作流专家',role:'苍穹工作流',by:'Lingee 内置',
     desc:'审批链配置与流程调试，处理加签、会签、条件流转等复杂场景。',
     tags:['审批链','流程调试'],modes:['分析','设计','实现','验证'],
     comp:['cosmic.workflow · advanced'],
     cmds:[['按[已确认需求]设计一条苍穹审批流程','梳理审批场景并配置工作流'],
           ['我的审批流节点卡住了，帮我排查','定位节点为什么不流转']]},
    {id:'cosmic-report',k:'rpt',name:'苍穹报表专家',role:'苍穹报表',by:'Lingee 内置',
     desc:'报表建模、取数逻辑与图表配置，兼顾查询性能与交互式分析。',
     tags:['报表建模','取数逻辑'],modes:['分析','设计','实现'],
     comp:['cosmic.report · advanced'],
     cmds:[['按[已确认需求]做一张报表','设计报表数据模型与取数逻辑'],
           ['报表查得太慢了，帮我优化','优化取数与查询性能']]},
    {id:'cosmic-plugin',k:'plug',name:'苍穹二开插件专家',role:'苍穹二开',by:'Lingee 内置',
     desc:'基于扩展点开发二开插件，处理注册、生命周期调试与升级兼容。',
     tags:['插件开发','扩展点'],modes:['设计','实现','验证','恢复'],
     comp:['cosmic.plugin · advanced'],skills:['cosmic-reverse-engineering'],
     cmds:[['在[应用编码]里基于扩展点写一个二开插件','定位扩展点并实现插件逻辑'],
           ['插件注册了但不生效，帮我看看','排查注册与生命周期问题']]},
    {id:'cosmic-api',k:'api',name:'苍穹集成接口专家',role:'苍穹集成',by:'Lingee 内置',
     desc:'开放接口对接、鉴权配置与数据同步，含异常重试与幂等设计。',
     tags:['接口对接','鉴权'],modes:['设计','实现','集成','验证'],
     comp:['cosmic.integration · advanced'],
     cmds:[['按[接口契约]对接苍穹开放接口','确认契约与鉴权方式并实现对接'],
           ['接口鉴权怎么配？','配置鉴权与安全策略'],
           ['两边数据要同步，帮我设计方案','设计幂等同步任务与异常重试']]}
  ];
  var BUILTIN_EXPERTS=EXPERTS;
  var MY_EXPERTS=[];                 /* 我自己创建的专家，落 localStorage */
  var EX={};
  function rebuildExperts(){
    EXPERTS=BUILTIN_EXPERTS.concat(MY_EXPERTS);
    EX={}; EXPERTS.forEach(function(e){EX[e.id]=e});
  }
  rebuildExperts();
  /* ---------- 能力项字典 ----------
     定义文件里能力项是机器标识（architecture.system-design · principal），
     直接摆到界面上没人看得懂。这里翻成中文名 + 等级，字典没覆盖的回退显示原串。 */
  /* ---------- 开工前需要的输入 ----------
     不再单独维护字段：需要什么输入，直接写进触发词的 [占位符] 里。
     发出去时占位符没被替换，就在会话里追问，而不是让专家拿着空输入硬跑。 */
  function askFor(name){ return ASK[name]||ASK_FALLBACK; }
  /* 文本里没被替换掉的 [占位符] */
  function pendingInputs(text){
    var out=[], re=/\[([^\[\]\n]{1,20})\]/g, m;
    while((m=re.exec(String(text||'')))){ if(out.indexOf(m[1])<0) out.push(m[1]); }
    return out;
  }
  /* 触发词里的占位符高亮显示 */
  function phraseHtml(t){
    return xesc(t).replace(/\[([^\[\]]{1,20})\]/g,'<em class="x-ph">[$1]</em>');
  }
  /* 'architecture.system-design · principal' → 结构化 */
  function compChip(v){
    var c=(v&&typeof v==='object')?v:parseComp(v);
    return '<span class="ptag ptag-comp" title="'+xesc(c.id)+'">'+xesc(c.name)
      +(c.level?'<i class="ptag-lv lv-'+xesc(c.lv)+'">'+xesc(c.level)+'</i>':'')+'</span>';
  }
  /* 一个团覆盖到的能力项：同一能力取成员里的最高等级 */
  function teamCoverage(t){
    var best={};
    (t.members||[]).forEach(function(id){
      var e=EX[id]; if(!e) return;
      (e.comp||[]).forEach(function(v){
        var c=parseComp(v);
        if(!best[c.id]||c.rank>best[c.id].rank) best[c.id]=c;
      });
    });
    return Object.keys(best).map(function(k){return best[k]})
      .sort(function(a,b){return b.rank-a.rank||a.name.localeCompare(b.name)});
  }

  var PRESET_TEAMS=[
    {id:'software-company',preset:true,name:'软件开发团队',by:'Lingee 内置',
     desc:'跨职能软件产品交付团队，覆盖需求、架构、实现、质量与集成的完整闭环。也是新建任务时的默认选择。',
     domains:['通用软件','后端','前端','数据库'],
     gates:['design','verify'],
     leadId:'software-team-lead',
     members:['software-team-lead','software-product-manager','software-architect','software-engineer','software-qa-engineer'],
     cmds:[['帮我把这个想法做成一个能上线的功能','从需求到验收走完整闭环'],
           ['这个模块要重做，帮我走一遍完整流程','需求、架构、实现、测试、集成逐环节推进'],
           ['需求还没理清，先帮我拆一版方案再动手','先出需求与实现计划，评审通过再编码']]},
    {id:'fast-app',preset:true,name:'应用速成小队',by:'Lingee 内置',
     desc:'工程师一次性写完全部代码，QA 端到端验证。适合单页应用、小游戏、原型页这类一次交付的活。',
     domains:['单页应用','原型','小工具'],
     gates:[],
     leadId:'software-engineer',
     members:['software-engineer','software-qa-engineer'],
     cmds:[['做一个单页小工具，今天就要用','一次性写完代码并跑通 build'],
           ['帮我快速搭个原型页看看效果','省掉评审环节，直接实现 + 自检'],
           ['写个小游戏练手','小体量一次交付']]},
    {id:'cosmic-team',preset:true,name:'苍穹交付团队',by:'Lingee 内置',
     desc:'面向苍穹配置化交付：需求规格 → 表单与流程配置 → 报表 → 二开插件 → 接口集成。',
     domains:['苍穹','表单','工作流','报表','集成'],
     gates:['requirement'],
     leadId:'software-team-lead',
     members:['software-team-lead','software-product-manager','cosmic-form','cosmic-workflow','cosmic-report','cosmic-api'],
     cmds:[['帮我在苍穹上做一套请假申请，从单据到审批','表单、流程、报表、接口一条龙配下来'],
           ['这个业务要在苍穹落地，帮我出方案','先出需求规格，再分头配置'],
           ['苍穹这块单据和流程都要改，帮我排一下','按依赖顺序编排配置任务']]},
    {id:'web-team',preset:true,name:'网页交付小队',by:'Lingee 内置',
     desc:'设计与前端配对交付：信息架构与视觉规范先行，前端按规范实现并做设计走查。',
     domains:['Web','前端','视觉设计'],
     gates:['design'],
     leadId:'ux-designer',
     members:['ux-designer','frontend-engineer','software-qa-engineer'],
     cmds:[['帮我做一个官网首页，设计和前端都要','先出设计规范，再按规范实现'],
           ['这几个页面要重新设计并实现','信息架构先行，前端跟进，最后走查'],
           ['按这份设计稿把页面实现出来并走查一遍','实现 + 设计一致性检查']]}
  ];

  /* ---------- 持久化：只存自建专家团与当前选择 ----------
     内置团不入库，这样以后改内置定义能直接生效，不会被旧缓存盖住 */
  var TEAM_STORE_KEY='lingee.experts.v1';
  var TEAMS=PRESET_TEAMS.slice();
  /* 选中对象：团或单个专家，同一语义位、只能选其一
     —— 对应 lingee-build 的 mode: team / personal */
  var activePick={kind:null,id:''};   /* 默认不指定，由系统自动匹配 */
  function pickName(){
    if(activePick.kind==='team') return (teamById(activePick.id)||{}).name||'';
    if(activePick.kind==='expert') return (EX[activePick.id]||{}).name||'';
    return '';
  }
  function pickValid(){
    if(activePick.kind==='team') return !!teamById(activePick.id);
    if(activePick.kind==='expert') return !!EX[activePick.id];
    return false;
  }
  function clearPick(){ activePick={kind:null,id:'',auto:false}; }

  function loadTeams(){
    var raw=null;
    try{ raw=localStorage.getItem(TEAM_STORE_KEY); }catch(e){ return; }
    if(!raw) return;
    var d;
    try{ d=JSON.parse(raw); }catch(e){ return; }
    if(!d||typeof d!=='object') return;
    var mine=Array.isArray(d.experts)?d.experts:[];
    MY_EXPERTS=mine.filter(function(e){
      return e&&typeof e.id==='string'&&e.id.indexOf('my-')===0&&typeof e.name==='string'&&e.name
        &&Array.isArray(e.modes)&&e.modes.length;
    }).map(function(e){
      return {id:e.id,mine:true,k:AV_KEYS.indexOf(e.k)>=0?e.k:'eng',
        name:e.name,role:e.role||'自定义专家',by:'我创建的',desc:e.desc||'',
        tags:Array.isArray(e.tags)?e.tags:[],
        modes:e.modes.filter(function(m){return WORK_MODES.indexOf(m)>=0}),
        comp:Array.isArray(e.comp)?e.comp:[],
        cmds:(Array.isArray(e.cmds)?e.cmds:[]).filter(function(c){return Array.isArray(c)&&c[0]}),

      };
    }).filter(function(e){ return e.modes.length; });
    rebuildExperts();

    var custom=Array.isArray(d.teams)?d.teams:[];
    var valid=custom.filter(function(t){
      return t&&typeof t.id==='string'&&!t.preset&&typeof t.name==='string'
        &&Array.isArray(t.members)&&t.members.every(function(m){return !!EX[m]});
    }).map(function(t){
      return {id:t.id,preset:false,name:t.name,by:t.by||'我创建的',desc:t.desc||'',
        domains:Array.isArray(t.domains)?t.domains:[],
        gates:Array.isArray(t.gates)?t.gates.filter(function(g){return typeof g==='string'}):[],
        leadId:EX[t.leadId]?t.leadId:(t.members[0]||null),members:t.members.slice(),
        cmds:(Array.isArray(t.cmds)?t.cmds:[]).filter(function(c){return Array.isArray(c)&&c[0]})};
    });
    TEAMS=PRESET_TEAMS.slice().concat(valid);
  }
  function saveTeams(){
    try{
      localStorage.setItem(TEAM_STORE_KEY, JSON.stringify({
        v:1,
        teams:TEAMS.filter(function(t){return !t.preset}).map(function(t){
          return {id:t.id,name:t.name,by:t.by,desc:t.desc,domains:t.domains||[],
                  gates:teamGates(t),leadId:t.leadId,members:t.members,cmds:t.cmds};
        }),
        experts:MY_EXPERTS.map(function(e){
          return {id:e.id,k:e.k,name:e.name,role:e.role,desc:e.desc,tags:e.tags,
                  modes:e.modes,comp:e.comp,cmds:e.cmds};
        })
      }));
    }catch(e){ /* 隐私模式 / 配额满：原型退化为内存态，不打扰用户 */ }
  }
  function teamById(id){ for(var i=0;i<TEAMS.length;i++) if(TEAMS[i].id===id) return TEAMS[i]; return null; }

  /* ---------- 编排推导：成员 → 任务 DAG ----------
     不再有交付强度这个旋钮：团里有谁，流程里就有哪一步。
     实现环节始终保留——没人能领时显式标红，这是要暴露的问题，不是可以省掉的步骤。 */
  function teamFlow(t){
    function any(){ for(var i=0;i<arguments.length;i++) if(t.members.indexOf(arguments[i])>=0) return arguments[i]; return null; }
    function byMode(m,skip){ for(var i=0;i<t.members.length;i++){ if(t.members[i]===skip) continue; var e=EX[t.members[i]]; if(e&&e.modes.indexOf(m)>=0) return t.members[i]; } return null; }
    var f=[], multi=t.members.length>1;
    var lead=any('software-team-lead');
    if(multi && lead) f.push({id:'kickoff',k:'analyze',title:'协调范围与门禁',who:lead});
    var pm=any('software-product-manager');
    if(pm) f.push({id:'requirement',k:'analyze',title:'分析需求与验收',who:pm});
    var des=any('software-architect','ux-designer');
    if(des) f.push({id:'design',k:'design',title:'设计方案与实现计划',who:des});
    var rev=any('code-reviewer','read-only-analyst');
    if(rev) f.push({id:'precode-review',k:'review',title:'编码准入评审',who:rev});
    f.push({id:'implement',k:'implement',title:'实现编码任务',
      who:any('software-engineer','frontend-engineer','cosmic-form','cosmic-workflow','cosmic-report','cosmic-plugin','cosmic-api')||byMode('实现')});
    var sec=any('security-reviewer');
    if(sec) f.push({id:'security-review',k:'review',title:'安全评审',who:sec});
    var qa=any('software-qa-engineer')||byMode('验证',lead);
    if(qa) f.push({id:'verify',k:'test',title:'质量验证',who:qa});
    var itg=lead||any('software-architect')||byMode('集成');
    if(multi && itg) f.push({id:'integrate',k:'integrate',title:'集成与交付确认',who:itg});
    return f;
  }
  /* ---------- 人工审核确认节点 ----------
     挂在某个流程步骤之后：这一步产出后编排暂停，等人点过才继续。
     只存步骤 id，成员变动导致步骤消失时自动失效，不需要迁移数据。 */
  function teamGates(t){ return Array.isArray(t&&t.gates)?t.gates:[]; }
  function hasGate(t,stepId){ return teamGates(t).indexOf(stepId)>=0; }
  /* 只统计当前流程里真实存在的步骤上挂的确认点 */
  function activeGates(t,flow){
    var f=flow||teamFlow(t);
    return f.filter(function(s){ return hasGate(t,s.id); });
  }
  function toggleGate(t,stepId){
    if(!t) return;
    if(!Array.isArray(t.gates)) t.gates=[];
    var i=t.gates.indexOf(stepId);
    if(i>=0) t.gates.splice(i,1); else t.gates.push(stepId);
  }

  function teamLint(t){
    var w=[];
    var canImpl=false;
    t.members.forEach(function(id){ if(EX[id]&&EX[id].modes.indexOf('实现')>=0) canImpl=true; });
    if(!canImpl) w.push('没有成员具备「实现」工作模式，实现任务无人可领取。');
    var canVerify=false;
    t.members.forEach(function(id){ if(EX[id]&&EX[id].modes.indexOf('验证')>=0) canVerify=true; });
    if(!canVerify) w.push('没有成员具备「验证」工作模式，产出不会被检查，建议加入「软件测试工程师」。');
    return w;
  }

  /* 专家团的领域标签：优先用团自己声明的，没有就从成员标签聚合 */
  function teamDomains(t){
    if(t&&t.domains&&t.domains.length) return t.domains;
    var seen={},out=[];
    (t&&t.members||[]).forEach(function(id){
      var e=EX[id]; if(!e) return;
      (e.tags||[]).forEach(function(g){ if(!seen[g]){seen[g]=1;out.push(g);} });
    });
    return out;
  }

  /* ---------- 专家库视图 ---------- */
  var expertTab='team', expertKw='';
  var expertGrid=$('#expertGrid');
  function facesHtml(ids,n){
    return '<span class="x-faces">'+ids.slice(0,n||4).map(function(i){
      return '<img src="'+xav(EX[i].k)+'" alt="">'; }).join('')+'</span>';
  }
  /* cvRenderExperts 已迁到 React CollabView，保留 no-op 避免调用处报错 */
  function cvRenderExperts(){}
  function renderExpertGrid(){} /* moved to React */
  $$('#expertTabs .tab').forEach(function(t){
    t.addEventListener('click',function(){
      $$('#expertTabs .tab').forEach(function(i){i.classList.remove('active')});
      t.classList.add('active');
      expertTab=t.getAttribute('data-etab');
      renderExpertGrid();
    });
  });
  var expertSearchInput=$('#expertSearchInput');
  if(expertSearchInput) expertSearchInput.addEventListener('input',function(){ expertKw=this.value; renderExpertGrid(); });
  if(expertGrid) expertGrid.addEventListener('click',function(e){
    var ct=e.target.closest('[data-call-team]');
    if(ct){ summon('team',ct.getAttribute('data-call-team')); return; }
    var ce=e.target.closest('[data-call-expert]');
    if(ce){ summon('expert',ce.getAttribute('data-call-expert')); return; }
    if(e.target.closest('[data-new-team]')){ openTeamModal(null); return; }
    if(e.target.closest('[data-new-expert]')){ openExpertEditor(null); return; }
    var tc=e.target.closest('[data-team]'); if(tc){ openTeamModal(tc.getAttribute('data-team')); return; }
    var ec=e.target.closest('[data-expert]'); if(ec){ openExpertModal(ec.getAttribute('data-expert')); return; }
  });

  /* ---------- 专家详情弹窗（Phase 2c antd 化） ---------- */
  function openExpertModal(id){
    _expertViewingId=id;
    _expertBridge.open('expert-detail');
  }
  function closeExpertModal(){
    _expertViewingId=null;
    _expertBridge.close('expert-detail');
  }
  function _sanitizeExpert(e){
    if(!e) return null;
    return {id:e.id,k:e.k,name:e.name,role:e.role,by:e.by,desc:e.desc,
            tags:e.tags||[],modes:e.modes||[],comp:(e.comp||[]).map(parseComp),
            cmds:e.cmds||[],skills:e.skills,mine:e.mine,ro:e.ro};
  }

  /* ---------- 没选专家时的自动匹配 ---------- */
  function autoMatch(text){
    var t=String(text||'');
    var hits=KW_MATCH.filter(function(r){
      return r.kw.some(function(k){ return t.toLowerCase().indexOf(k.toLowerCase())>=0; });
    }).filter(function(r){ return !!EX[r.id]; });

    /* 跨了两个以上领域，一个人扛不住，上专家团 */
    if(hits.length>=2){
      var cosmic=hits.filter(function(r){ return r.id.indexOf('cosmic-')===0; }).length;
      var pick=cosmic>=2?'cosmic-team':'software-company';
      if(teamById(pick)) return {kind:'team',id:pick,auto:true};
    }
    if(hits.length===1) return {kind:'expert',id:hits[0].id,auto:true};

    var modeEl=$('.mode-item.checked'), m=modeEl?MODE_MATCH[modeEl.getAttribute('data-val')]:null;
    if(m && ((m.kind==='team'&&teamById(m.id))||(m.kind==='expert'&&EX[m.id])))
      return {kind:m.kind,id:m.id,auto:true};

    return teamById('software-company')?{kind:'team',id:'software-company',auto:true}:null;
  }
  /* 召唤 = 选中这个专家/专家团 + 把第一条触发词带进输入框 */
  function summon(kind,id,phrase){
    var o = kind==='team' ? teamById(id) : EX[id];
    if(!o) return;
    activePick={kind:kind,id:id,auto:false};
    renderExpertChips();
    showView('newtask'); setNavActive('新会话');
    var text = phrase || ((o.cmds&&o.cmds.length)?o.cmds[0][0]:'');
    if(input){
      input.setAttribute('data-placeholder','布置任务');
      input.textContent=text;
      input.focus();
      try{
        var r=document.createRange(); r.selectNodeContents(input); r.collapse(false);
        var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      }catch(err){}
    }
    if(typeof refreshSend==='function') refreshSend();
    toast('已召唤「'+o.name+'」','success');
  }

  /* 发出去的话里还留着没填的 [占位符] —— 专家先问清楚再开工。
     一次把缺的都问完，别挤牙膏式来回问。 */
  function appendAskCard(names){
    if(!messagesList||!names.length) return false;
    var who = activePick.kind==='expert' ? EX[activePick.id] : null;
    var av = who ? '<img src="'+xav(who.k)+'" alt="">' : '';
    var box=document.createElement('div');
    box.className='ask-card';
    box.innerHTML='<div class="ask-head">'+av
      +'<span>开始之前，我需要先确认'+(names.length>1?' '+names.length+' 件事':'一件事')+'</span></div>'
      +names.map(function(n,qi){
        var a=askFor(n);
        return '<div class="ask-q" data-ask-q="'+qi+'">'
          +'<div class="ask-q-t"><span class="x-ph">['+xesc(n)+']</span>'+xesc(a.q)+'</div>'
          +'<div class="ask-opts">'
          +a.o.map(function(t,oi){
            return '<button type="button" class="ask-opt" data-ask-pick="'+qi+'" data-ask-oi="'+oi+'">'+xesc(t)+'</button>';
          }).join('')
          +'<button type="button" class="ask-opt ask-opt-other" data-ask-pick="'+qi+'" data-ask-oi="-1">其它…</button>'
          +'</div></div>';
      }).join('')
      +'<div class="ask-foot" id="askFoot">选一个，或直接在下面输入框补充</div>';
    messagesList.appendChild(box);
    scrollChatBottom();
    return true;
  }
  if(messagesList) messagesList.addEventListener('click',function(ev){
    var b=ev.target.closest('[data-ask-pick]');
    if(!b) return;
    var q=b.closest('.ask-q');
    q.querySelectorAll('.ask-opt').forEach(function(x){ x.classList.remove('on') });
    b.classList.add('on');
    q.classList.add('answered');
    var card=b.closest('.ask-card');
    var all=card.querySelectorAll('.ask-q').length;
    var done=card.querySelectorAll('.ask-q.answered').length;
    var foot=card.querySelector('.ask-foot');
    if(done>=all){
      foot.textContent='已确认，继续执行';
      foot.classList.add('ask-foot-done');
    }else{
      foot.textContent='还剩 '+(all-done)+' 项待确认';
    }
  });

  function appendAutoNote(){
    if(!messagesList||!activePick.auto||!pickValid()) return;
    var isTeam=activePick.kind==='team';
    var av=isTeam
      ? teamById(activePick.id).members.slice(0,3).map(function(i){return '<img src="'+xav(EX[i].k)+'" alt="">'}).join('')
      : '<img src="'+xav(EX[activePick.id].k)+'" alt="">';
    var why=isTeam?'这次要跨多个环节，交给一个专家团':'按你描述的内容匹配到这位专家';
    var note=document.createElement('div');
    note.className='auto-note';
    note.innerHTML='<span class="auto-note-av">'+av+'</span>'
      +'<span class="auto-note-b">你没有指定专家，已自动匹配 <b>'+xesc(pickName())+'</b>'
      +'<i>'+why+'。想换人，点下方输入框左侧的专家按钮。</i></span>';
    messagesList.appendChild(note);
  }

  /* ---------- 创建 / 编辑我的专家 ---------- */
  /* 两条路：手填这张表单，或者一句话交给 expert-manager 在对话里建（同 WorkBuddy） */
  var EXPERT_MANAGER={id:'expert-manager',
    ic:'<path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.2"/><path d="M18 6v6M15 9h6"/>'};
  var ONE_LINE_PROMPT='帮我创建一个 XXX 专家，擅长 XXXXX。我的经验是：[请补充你的行业背景、相关经验]';
  var forcedBuilder=null;

  function startExpertByChat(){
    closeExpertEditor();
    closeExpertModal();
    forcedBuilder=EXPERT_MANAGER;
    $$('.mode-item').forEach(function(m){ m.classList.remove('checked') });
    showView('newtask'); setNavActive('新会话');
    renderModeTag();
    if(input){
      input.setAttribute('data-placeholder','布置任务');
      input.textContent=ONE_LINE_PROMPT;
      input.focus();
      try{
        var r=document.createRange(); r.selectNodeContents(input); r.collapse(false);
        var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      }catch(err){}
    }
    toast('已切到 expert-manager，把这句话补完就行','info');
  }

  function deleteMyExpert(id){
    var e=EX[id]; if(!e||!e.mine) return;
    var used=TEAMS.filter(function(t){ return t.members.indexOf(id)>=0; });
    var msg='删除专家「'+e.name+'」？此操作不可撤销。';
    if(used.length) msg+='\n他还在 '+used.length+' 个专家团里，删除后会一并移出。';
    if(!window.confirm(msg)) return;
    MY_EXPERTS=MY_EXPERTS.filter(function(x){ return x.id!==id; });
    rebuildExperts();
    TEAMS.forEach(function(t){
      if(t.preset) return;
      t.members=t.members.filter(function(m){ return m!==id; });
      if(t.leadId===id) t.leadId=t.members[0]||null;
    });
    if(activePick.kind==='expert'&&activePick.id===id) clearPick();
    closeExpertModal();
    saveTeams(); renderExpertGrid(); renderExpertChips(); cvRenderExperts();
    toast('已删除「'+e.name+'」','success');
  }

  /* ---------- 创建/编辑专家弹窗（Phase 2c antd 化） ----------
     React 侧（ExpertModals.jsx）自己管理表单状态，打开时从 bridge.getInitialData()
     读初始数据，保存时调 bridge.save(draft)。xeDraft/xeEditingId 仍在本文件维护
     供 bridge 方法读写，但 DOM 操作和事件监听全部删除。 */
  var xeDraft=null, xeEditingId=null;
  function openExpertEditor(id){
    var e=id?EX[id]:null;
    xeEditingId=(e&&e.mine)?id:null;
    xeDraft = xeEditingId
      ? {k:e.k,name:e.name,role:e.role,desc:e.desc,visibility:e.visibility==='private'?'private':'workspace',tags:e.tags.slice(),modes:e.modes.slice(),
         comp:e.comp.slice(),cmds:e.cmds.length?e.cmds.map(function(c){return c.slice()}):[['','']]}
      : blankExpert();
    _expertEditBridge.open('expert-edit');
  }
  function closeExpertEditor(){ _expertEditBridge.close('expert-edit'); }
  function _getExpertEditInitialData(){
    if(!xeDraft) return null;
    return {k:xeDraft.k,name:xeDraft.name,role:xeDraft.role,desc:xeDraft.desc,
            visibility:xeDraft.visibility,tags:xeDraft.tags.slice(),modes:xeDraft.modes.slice(),
            comp:xeDraft.comp.slice(),cmds:xeDraft.cmds.map(function(c){return c.slice()})};
  }
  function _saveExpertFromReact(d){
    if(!d.name){ toast('请填写专家名称','warning'); return; }
    if(!d.role){ toast('请填写职称，它会显示在名字后面','warning'); return; }
    if(!d.modes||!d.modes.length){ toast('至少勾选一项「可承担的工作」，否则他在专家团里领不到任务','warning'); return; }
    var cmds=(d.cmds||[]).map(function(c){ return [String(c[0]||'').trim(),String(c[1]||'').trim()]; })
                   .filter(function(c){ return c[0]; });
    var rec={id:xeEditingId||('my-'+Date.now()),mine:true,k:d.k,name:d.name,role:d.role,by:'我创建的',
             desc:d.desc,visibility:d.visibility,tags:d.tags,modes:d.modes.slice(),comp:d.comp,cmds:cmds};
    if(xeEditingId){
      for(var i=0;i<MY_EXPERTS.length;i++) if(MY_EXPERTS[i].id===xeEditingId){ MY_EXPERTS[i]=rec; break; }
      toast('已保存','success');
    }else{
      MY_EXPERTS.push(rec);
      toast('专家「'+rec.name+'」已创建','success');
    }
    rebuildExperts();
    closeExpertEditor();
    saveTeams(); renderExpertGrid(); renderExpertChips(); cvRenderExperts();
  }
  /* ---------- 专家团配置弹窗 ---------- */
  /* ---------- 专家团配置弹窗（Phase 2c antd 化） ----------
     React 侧（ExpertModals.jsx）通过 bridge 读写 teamDraft，每次修改后
     调 _teamBridge.touch() 触发 React 重渲染。计算函数（teamFlow/
     teamCoverage/teamLint）保持不变，React 直接调 bridge.getFlow 等。 */
  var teamDraft=null, teamEditingId=null;
  function teamCmdList(d){
    return (d.cmds||[]).map(function(c){ return [String(c[0]||'').trim(),String(c[1]||'').trim()]; })
                       .filter(function(c){ return c[0]; });
  }
  function openTeamModal(id){
    var t=id?teamById(id):null;
    teamEditingId=id||null;
    teamDraft=t?{name:t.name,desc:t.desc,visibility:t.visibility==='private'?'private':'workspace',leadId:t.leadId,members:t.members.slice(),preset:!!t.preset,
                 domains:(t.domains||[]).slice(),gates:teamGates(t).slice(),
                 cmds:(t.cmds&&t.cmds.length)?t.cmds.map(function(c){return c.slice()}):[['','']]}
              :{name:'',desc:'',visibility:'workspace',leadId:'software-team-lead',members:['software-team-lead','software-engineer'],preset:false,
                 domains:[],gates:['implement'],
                 cmds:[['','']]};
    _teamBridge.open('team-config');
  }
  function closeTeamModal(){ _teamBridge.close('team-config'); }
  function _getTeamInitialData(){
    if(!teamDraft) return null;
    return {name:teamDraft.name,desc:teamDraft.desc,visibility:teamDraft.visibility,preset:teamDraft.preset};
  }
  function _getTeamDraft(){
    if(!teamDraft) return null;
    return {name:teamDraft.name,desc:teamDraft.desc,visibility:teamDraft.visibility,
            leadId:teamDraft.leadId,members:teamDraft.members.slice(),preset:teamDraft.preset,
            domains:(teamDraft.domains||[]).slice(),gates:teamGates(teamDraft).slice(),
            cmds:(teamDraft.cmds||[]).map(function(c){return c.slice()})};
  }
  function _saveTeamFromReact(d){
    var name=(d.name||'').trim();
    if(!name){ toast('请填写专家团名称','warning'); return; }
    if(!d.members||!d.members.length){ toast('至少需要一位成员','warning'); return; }
    /* 把 React 侧的改动同步到 teamDraft 再走原有落库逻辑 */
    teamDraft.name=name; teamDraft.desc=d.desc||''; teamDraft.visibility=d.visibility||'workspace';
    teamDraft.leadId=d.leadId; teamDraft.members=d.members.slice();
    if(d.preset || !teamEditingId){
      var nid='team-'+Date.now();
      TEAMS.push({id:nid,preset:false,name:d.preset?name+' 副本':name,by:'我创建的',
        desc:d.desc,visibility:d.visibility,domains:(d.domains||[]).slice(),gates:teamGates(d).slice(),
        leadId:d.leadId,members:d.members.slice(),cmds:teamCmdList(d)});
      toast(d.preset?'已另存为你的专家团':'专家团已创建','success');
    }else{
      var t=teamById(teamEditingId);
      t.name=name; t.desc=d.desc; t.visibility=d.visibility; t.leadId=d.leadId; t.members=d.members.slice(); t.cmds=teamCmdList(d);
      t.domains=(d.domains||[]).slice(); t.gates=teamGates(d).slice();
      toast('已保存','success');
    }
    closeTeamModal();
    saveTeams(); renderExpertGrid(); renderExpertChips(); cvRenderExperts();
  }
  function _deleteTeam(id){
    var t=teamById(id); if(!t||t.preset) return;
    TEAMS=TEAMS.filter(function(x){ return x.id!==id; });
    if(activePick.kind==='team'&&activePick.id===id) clearPick();
    closeTeamModal();
    saveTeams(); renderExpertGrid(); renderExpertChips(); cvRenderExperts();
    toast('已删除「'+t.name+'」','success');
  }
  function _setTeamLead(id){ if(teamDraft){ teamDraft.leadId=id; _teamBridge.touch(); } }
  function _removeTeamMember(id){
    if(!teamDraft) return;
    teamDraft.members=teamDraft.members.filter(function(m){return m!==id});
    if(teamDraft.leadId===id) teamDraft.leadId=teamDraft.members[0]||null;
    _teamBridge.touch();
  }
  function _addTeamCmd(){ if(teamDraft){ teamDraft.cmds.push(['','']); _teamBridge.touch(); } }
  function _removeTeamCmd(i){
    if(!teamDraft) return;
    teamDraft.cmds.splice(i,1);
    if(!teamDraft.cmds.length) teamDraft.cmds.push(['','']);
    _teamBridge.touch();
  }
  function _updateTeamCmd(i,f,val){ if(teamDraft&&teamDraft.cmds[i]) teamDraft.cmds[i][f]=val; }

  /* ---------- 添加成员弹窗（Phase 2c antd 化） ---------- */
  function openMemberModal(){ _memberBridge.open('member-picker'); }
  function closeMemberModal(){ _memberBridge.close('member-picker'); }
  function _getMemberList(kw){
    if(!teamDraft) return [];
    kw=(kw||'').trim().toLowerCase();
    var wsOnly=teamDraft.visibility!=='private';
    return EXPERTS.filter(function(e){
      if(wsOnly&&e.visibility==='private'&&teamDraft.members.indexOf(e.id)<0) return false;
      return !kw || (e.name+e.role+e.desc+e.tags.join()).toLowerCase().indexOf(kw)>=0;
    }).map(function(e){
      return {id:e.id,k:e.k,name:e.name,desc:e.desc,ro:e.ro,modes:e.modes.slice(),
              isMember:teamDraft.members.indexOf(e.id)>=0};
    });
  }
  function _toggleMember(id){
    if(!teamDraft) return;
    var i=teamDraft.members.indexOf(id);
    if(i<0){ teamDraft.members.push(id); if(!teamDraft.leadId) teamDraft.leadId=id; }
    else { teamDraft.members.splice(i,1); if(teamDraft.leadId===id) teamDraft.leadId=teamDraft.members[0]||null; }
    _teamBridge.touch();
  }
  var newExpertEntryBtn=$('#newExpertEntryBtn');
  if(newExpertEntryBtn) newExpertEntryBtn.addEventListener('click',function(){
    if(expertTab==='team') openTeamModal(null); else openExpertEditor(null);
  });

  /* ---------- composer：选中对象渲染为顶部标签 + 下拉选择 ---------- */
  function pickIconSvg(){
    return activePick.kind==='team'
      ? '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.2"/><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4"/><path d="M15.4 5.2a3.2 3.2 0 0 1 0 5.6"/></svg>'
      : '<img class="ctag-av" src="'+xav(EX[activePick.id].k)+'" alt="">';
  }

  /* 模式 → builder 名。来源见 lingee-build packages/kcode-web/src/components/prompt-input.tsx
     starterRecommendationCards；技能/智能体两项用 1.x 线的新名（用户确认） */
  function renderModeTag(){} /* moved to React */
  document.addEventListener('click',function(ev){
    if(ev.target.closest('[data-clear-mode]')){
      ev.stopPropagation();
      $$('.mode-item').forEach(function(m){ m.classList.remove('checked') });
      forcedBuilder=null;
      renderModeTag(); return;
    }
    if(ev.target.closest('.mode-item')){ forcedBuilder=null; setTimeout(renderModeTag,0); }
  });
  function renderExpertChips(){} /* moved to React */
  function openExpertPicker(pfx){
    var dd=$('#'+pfx+'ExpertDropdown'); if(!dd) return;
    var si=$('#'+pfx+'ExpertSearchInput');
    closeAll(null);
    renderExpertPicker(pfx, si?si.value:'');
    dd.classList.add('open');
    if(si) setTimeout(function(){ si.focus() },40);
  }
  ['nt','chat'].forEach(function(pfx){
    var dd=$('#'+pfx+'ExpertDropdown'); if(!dd) return;
    var chipEl=dd.querySelector('[data-chip]'), si=$('#'+pfx+'ExpertSearchInput');
    chipEl.addEventListener('click',function(ev){
      ev.stopPropagation();
      if(dd.classList.contains('open')) dd.classList.remove('open');
      else openExpertPicker(pfx);
    });
    if(si) si.addEventListener('input',function(){ renderExpertPicker(pfx,this.value) });
    dd.addEventListener('click',function(ev){
      var n;
      if(n=ev.target.closest('[data-pick-team]')){
        var tid=n.getAttribute('data-pick-team');
        if(activePick.kind==='team'&&activePick.id===tid) clearPick();   /* 再点一次取消 */
        else activePick={kind:'team',id:tid,auto:false};
        saveTeams(); renderExpertChips(); dd.classList.remove('open'); return;
      }
      if(n=ev.target.closest('[data-pick-expert]')){
        var eid=n.getAttribute('data-pick-expert');
        if(activePick.kind==='expert'&&activePick.id===eid) clearPick();
        else activePick={kind:'expert',id:eid,auto:false};
        saveTeams(); renderExpertChips(); dd.classList.remove('open'); return;
      }
      if(ev.target.closest('[data-goto-experts]')){
        dd.classList.remove('open');
        showView('collab'); setNavActive('协作开发'); cvInit(); cvSwitchView('teams');
      }
    });

  });

  /* 新会话不继承上一次的专家/专家团选择 */
  function resetPickForNewSession(){
    if(forcedBuilder){ forcedBuilder=null; renderModeTag(); }
    if(!activePick.kind) return;
    clearPick(); renderExpertChips();
  }
  navItems.forEach(function(n){
    n.addEventListener('click',function(){ if(n.textContent.trim()==='新会话') resetPickForNewSession(); });
  });
  if(brandEl) brandEl.addEventListener('click',resetPickForNewSession);
  /* home card resetPick 已随 HomeView 迁移删除 */
  document.addEventListener('keydown',function(e){
    if((e.metaKey||e.ctrlKey) && !e.shiftKey && (e.key||'').toLowerCase()==='n') resetPickForNewSession();
  });

  loadTeams();
  renderExpertChips();
  renderModeTag();
  renderExpertGrid();



  /* ============================================================
     协作开发（任务管理 / 待评审 / 协作人员 / 专家 / 专家团 / 设置）
     任务、评审、协作人员数据与交互移植自协作开发原型稿
     ============================================================ */
  /* 项目维度：任务 / 评审 / 协作人员按项目分；专家与专家团为全局资产，项目内只绑定默认专家团。
     工作区是项目归属的顶层容器，一次只能激活一个。 */
  var CV_WORKSPACES=[
    {id:'finance-domain',name:'财务域工作区',short:'财'},
    {id:'purchase-domain',name:'采购域工作区',short:'采'}
  ];
  var cvWorkspace=CV_WORKSPACES[0].id;
  /* 项目状态：人定的「还做不做」，跟任务状态（干出来的进度）是两套词表，配色沿用任务同义色 */
  var CV_PROJECT_STATUS=[
    {id:'planning',label:'计划中',tone:'#b8b8b8'},
    {id:'active',label:'进行中',tone:'#4d89ff'},
    {id:'paused',label:'已暂停',tone:'#c06010'},
    {id:'done',label:'已完成',tone:'#08a040'},
    {id:'cancelled',label:'已取消',tone:'#e04a3a'}
  ];
  function cvProjectStatusMeta(id){
    for(var i=0;i<CV_PROJECT_STATUS.length;i++){ if(CV_PROJECT_STATUS[i].id===id) return CV_PROJECT_STATUS[i]; }
    return CV_PROJECT_STATUS[0];
  }
  var cvProject='';                    /* 空串 = 全部项目（个人视角的聚合视图） */
  var cvConfigOverride={};             /* {项目id:{配置卡 key:是否项目覆盖}} */
  function cvProjectById(id){
    for(var i=0;i<CV_PROJECTS.length;i++){ if(CV_PROJECTS[i].id===id) return CV_PROJECTS[i]; }
    return null;
  }
  function cvProjectName(id){ var p=cvProjectById(id); return p?p.name:'未归属项目'; }
  function cvWorkspaceProjects(){
    return CV_PROJECTS.filter(function(p){ return p.workspace===cvWorkspace; });
  }
  function cvInProject(row){
    if(!cvProject) return true;
    if(row.projects) return row.projects==='*'||row.projects.indexOf(cvProject)>=0;
    return row.project===cvProject;
  }
  function cvProjectTag(row){
    if(cvProject) return '';           /* 项目态下不必重复显示项目名 */
    return '<span class="cv-proj-tag">'+cvProjectName(row.project)+'</span>';
  }
  var CV_REVIEW_ARTIFACTS={
  0:{tabs:['源代码','技术方案'],content:{
  '源代码':'<h1>审批流插件 - 源代码</h1><p>文件: ApprovalFlowPlugin.java</p><pre>public class ApprovalFlowPlugin extends AbstractPlugin {\n  @Override\n  public void execute(ExecutionContext ctx) {\n    ApprovalContext ac = ctx.getApprovalContext();\n    List&lt;ApprovalNode&gt; nodes = ac.getApprovalNodes();\n    for (ApprovalNode node : nodes) {\n      if (node.isTimeout(30, TimeUnit.MINUTES)) {\n        handleTimeout(node, ac);\n        continue;\n      }\n      if (node.getStatus() == NodeStatus.PENDING) {\n        notifyApprover(node);\n      }\n    }\n    // 多级审批流转\n    if (ac.allNodesProcessed()) {\n      ctx.complete();\n    }\n  }\n  private void handleTimeout(ApprovalNode node, ApprovalContext ac) {\n    // 超时自动升级\n    ac.escalateToSuperior(node);\n  }\n}</pre><p>文件: ApprovalFlowService.java</p><pre>public class ApprovalFlowService {\n  public ApprovalResult submit(ExpenseReport report) {\n    ApprovalFlow flow = buildFlow(report);\n    flow.start();\n    return flow.getResult();\n  }\n}</pre>',
  '技术方案':'<h1>审批流插件技术方案</h1><h2>1. 概述</h2><p>基于苍穹插件机制实现费用报销多级审批流转，支持串行/并行审批、超时自动升级、异常回退。</p><h2>2. 核心设计</h2><h3>2.1 审批节点模型</h3><table><tr><th>字段</th><th>类型</th><th>说明</th></tr><tr><td>nodeId</td><td>String</td><td>节点唯一标识</td></tr><tr><td>approver</td><td>String</td><td>审批人ID</td></tr><tr><td>status</td><td>Enum</td><td>PENDING/APPROVED/REJECTED</td></tr><tr><td>timeout</td><td>int</td><td>超时时间(分钟)</td></tr></table><h3>2.2 流转规则</h3><ul><li>串行模式：按节点顺序依次审批</li><li>并行模式：同级节点同时审批，全部通过后进入下一级</li><li>超时处理：超过 timeout 分钟自动升级到上级</li></ul><h2>3. 异常处理</h2><ul><li>审批人离职：自动转交代理人</li><li>审批人拒绝：流程回退到发起人</li><li>系统异常：记录日志并发送告警</li></ul>'}},
  1:{tabs:['技术方案','需求规格'],content:{
  '技术方案':'<h1>多级审批流性能优化方案</h1><h2>1. 性能问题分析</h2><p>当前审批流在 5000+ 并发场景下平均响应时间 > 3s，瓶颈在数据库查询和节点状态同步。</p><h2>2. 优化方案</h2><h3>2.1 缓存优化</h3><ul><li>审批节点状态缓存到 Redis，TTL 5 分钟</li><li>批量查询替代循环单条查询</li></ul><h3>2.2 异步化</h3><ul><li>通知发送改为异步消息队列</li><li>超时检查改为定时任务批量扫描</li></ul><h3>2.3 数据库优化</h3><table><tr><th>优化项</th><th>预计提升</th></tr><tr><td>索引优化</td><td>40%</td></tr><tr><td>分页查询</td><td>30%</td></tr><tr><td>读写分离</td><td>20%</td></tr></table>',
  '需求规格':'<h1>需求规格说明书 - PRD</h1><h2>1. 背景与目标</h2><p>随着报销业务量增长，现有审批流在高峰期出现严重性能瓶颈，需要优化以支持千人并发审批。</p><h2>2. 功能需求</h2><h3>2.1 性能指标</h3><ul><li>支持 1000+ 并发审批</li><li>平均响应时间 < 500ms</li><li>99.9% 请求在 1s 内完成</li></ul><h3>2.2 兼容性</h3><ul><li>向下兼容现有审批流配置</li><li>支持灰度发布</li></ul>'}},
  2:{tabs:['技术方案','需求规格','源代码'],content:{
  '技术方案':'<h1>权限体系重构技术方案 - Spec</h1><h2>1. 设计目标</h2><p>基于 RBAC 模型重构权限体系，实现数据权限与功能权限分离，支持角色继承和细粒度授权。</p><h2>2. 权限模型</h2><h3>2.1 角色层级</h3><table><tr><th>层级</th><th>角色</th><th>权限范围</th></tr><tr><td>L1</td><td>系统管理员</td><td>全部</td></tr><tr><td>L2</td><td>部门管理员</td><td>本部门</td></tr><tr><td>L3</td><td>普通用户</td><td>个人数据</td></tr></table><h3>2.2 权限类型</h3><ul><li>功能权限：菜单、按钮、API 接口</li><li>数据权限：行级、列级过滤</li><li>字段权限：字段可见/可编辑</li></ul>',
  '需求规格':'<h1>权限体系重构需求规格</h1><h2>1. 业务背景</h2><p>当前权限体系不支持角色继承，数据权限与功能权限耦合，维护成本高。</p><h2>2. 功能需求</h2><ul><li>支持角色继承，子角色自动继承父角色权限</li><li>数据权限支持行级过滤（按部门/项目）</li><li>支持字段级权限控制</li><li>权限变更实时生效，无需重新登录</li></ul>',
  '源代码':'<h1>权限服务 - 源代码</h1><pre>public class PermissionService {\n  public boolean hasPermission(String userId, String resource, String action) {\n    List&lt;Role&gt; roles = roleService.getUserRoles(userId);\n    return roles.stream().anyMatch(r ->\n      r.hasPermission(resource, action) ||\n      (r.getParent() != null && r.getParent().hasPermission(resource, action))\n    );\n  }\n  public DataFilter getDataFilter(String userId, String resource) {\n    List&lt;Role&gt; roles = roleService.getUserRoles(userId);\n    return DataFilterComposer.compose(roles, resource);\n  }\n}</pre>'}},
  3:{tabs:['源代码','技术方案'],content:{
  '源代码':'<h1>打印模板优化 - 源代码</h1><pre>public class PrintTemplateRenderer {\n  public byte[] render(ExpenseReport report, TemplateConfig config) {\n    Workbook wb = new XSSFWorkbook();\n    Sheet header = wb.createSheet("报销单");\n    // 页眉\n    if (config.hasHeader()) {\n      renderHeader(header, config.getHeader());\n    }\n    // 水印\n    if (config.hasWatermark()) {\n      addWatermark(wb, config.getWatermark());\n    }\n    // 数据行\n    renderRows(header, report.getItems());\n    return wb.getBytes();\n  }\n}</pre>',
  '技术方案':'<h1>打印模板优化方案</h1><h2>1. 需求</h2><p>支持自定义页眉页脚、水印、多页打印、Excel 格式输出。</p><h2>2. 技术选型</h2><ul><li>基于 Apache POI 5.x 生成 Excel</li><li>水印通过 Sheet 背景图实现</li><li>页眉页脚通过 HeaderFooter API</li></ul>'}},
  4:{tabs:['源代码','单元测试'],content:{
  '源代码':'<h1>附件上传 502 修复 - 源代码</h1><pre>public class AttachmentUploadHandler {\n  @Override\n  public UploadResult handle(UploadRequest req) {\n    int maxRetry = 3;\n    for (int i = 0; i &lt; maxRetry; i++) {\n      try {\n        return uploadToStorage(req.getFile());\n      } catch (StorageException e) {\n        if (i == maxRetry - 1) throw e;\n        Thread.sleep(1000 * (i + 1)); // 指数退避\n      }\n    }\n    throw new StorageException("Upload failed after retries");\n  }\n}</pre>',
  '单元测试':'<h1>附件上传 - 单元测试报告</h1><h2>测试用例</h2><table><tr><th>用例</th><th>输入</th><th>预期</th><th>结果</th></tr><tr><td>正常上传</td><td>1MB 文件</td><td>成功</td><td>✅ 通过</td></tr><tr><td>弱网重试</td><td>模拟 502</td><td>重试 3 次后成功</td><td>✅ 通过</td></tr><tr><td>超时</td><td>10s 超时</td><td>返回超时错误</td><td>✅ 通过</td></tr><tr><td>空文件</td><td>0 字节</td><td>拒绝上传</td><td>✅ 通过</td></tr></table><p>覆盖率: 95% | 通过: 4/4</p>'}},
  5:{tabs:['需求规格','源代码'],content:{
  '需求规格':'<h1>需求规格 - 团建费选项</h1><h2>1. 需求描述</h2><p>在费用类型下拉中增加"团建费"选项，归属"部门活动费用"类别。</p><h2>2. 验收标准</h2><ul><li>费用类型下拉列表中可见"团建费"</li><li>选择后归属类别显示为"部门活动费用"</li><li>报销统计报表中可按团建费维度统计</li></ul>'}},
  6:{tabs:['需求规格'],content:{
  '需求规格':'<h1>多币种报销需求规格 - PRD</h1><h2>1. 业务背景</h2><p>随着国际化业务扩展，员工出差涉及多币种报销，需支持原币金额与本位币金额双重记录。</p><h2>2. 功能需求</h2><h3>2.1 币种管理</h3><ul><li>支持人民币(CNY)、美元(USD)、欧元(EUR)、日元(JPY)、港币(HKD)</li><li>币种汇率每日自动更新，支持手动调整</li></ul><h3>2.2 报销录入</h3><ul><li>选择币种后自动带出当日汇率</li><li>原币金额 + 汇率 = 本位币金额（自动计算，可手动修正）</li><li>同一报销单支持多币种明细行</li></ul><h2>3. 验收标准</h2><table><tr><th>场景</th><th>预期</th></tr><tr><td>单币种报销</td><td>正常提交审批</td></tr><tr><td>多币种混合报销</td><td>按行汇总本位币金额</td></tr><tr><td>汇率手动修正</td><td>记录修正人和修正时间</td></tr></table>'}},
  7:{tabs:['测试用例','测试报告','源代码'],content:{
  '测试用例':'<h1>费用明细列表页 - 测试用例</h1><h2>测试场景</h2><table><tr><th>用例</th><th>输入</th><th>预期</th><th>优先级</th></tr><tr><td>正常分页查询</td><td>page=1,size=20</td><td>返回 20 条数据</td><td>P0</td></tr><tr><td>大数据量查询</td><td>10000 条数据</td><td>响应 &lt; 500ms</td><td>P0</td></tr><tr><td>模糊搜索</td><td>keyword="差旅"</td><td>返回含"差旅"的记录</td><td>P1</td></tr><tr><td>时间范围筛选</td><td>startDate ~ endDate</td><td>返回范围内数据</td><td>P1</td></tr><tr><td>空结果处理</td><td>查无数据</td><td>显示"暂无数据"</td><td>P2</td></tr><tr><td>权限过滤</td><td>普通用户</td><td>仅返回本人数据</td><td>P0</td></tr></table>',
  '测试报告':'<h1>费用明细列表页 - 测试报告</h1><h2>执行结果</h2><table><tr><th>用例</th><th>结果</th><th>备注</th></tr><tr><td>正常分页查询</td><td>✅ 通过</td><td>-</td></tr><tr><td>大数据量查询</td><td>✅ 通过</td><td>平均 280ms</td></tr><tr><td>模糊搜索</td><td>✅ 通过</td><td>-</td></tr><tr><td>时间范围筛选</td><td>✅ 通过</td><td>-</td></tr><tr><td>空结果处理</td><td>✅ 通过</td><td>-</td></tr><tr><td>权限过滤</td><td>❌ 失败</td><td>部门管理员可见下级数据，实际返回空</td></tr></table><p>通过: 5/6 | 覆盖率: 87%</p>',
  '源代码':'<h1>费用明细列表页 - 源代码</h1><pre>public class ExpenseDetailListService {\n  public PageResult&lt;ExpenseDetail&gt; query(ExpenseQuery query) {\n    // 权限过滤\n    if (!query.getUser().isAdmin()) {\n      query.setUserId(query.getUser().getId());\n    }\n    // 分页查询\n    return expenseDetailDao.selectByPage(query, query.getPage(), query.getSize());\n  }\n}</pre>'}},
  8:{tabs:['部署方案','运维手册'],content:{
  '部署方案':'<h1>审批流插件部署方案</h1><h2>1. 部署策略</h2><h3>1.1 灰度发布</h3><ul><li>第一阶段：10% 流量灰度，观察 2 小时</li><li>第二阶段：50% 流量，观察 4 小时</li><li>第三阶段：100% 全量发布</li></ul><h3>1.2 回滚方案</h3><ul><li>自动回滚：错误率 &gt; 5% 时自动触发</li><li>手动回滚：一键切换到旧版本</li><li>数据回滚：审批流状态数据不回滚，仅回滚插件代码</li></ul><h2>2. 监控告警</h2><table><tr><th>指标</th><th>阈值</th><th>告警方式</th></tr><tr><td>审批流错误率</td><td>&gt; 1%</td><td>钉钉 + 邮件</td></tr><tr><td>审批响应时间</td><td>&gt; 2s</td><td>钉钉</td></tr><tr><td>审批队列积压</td><td>&gt; 100 条</td><td>钉钉 + 短信</td></tr></table>',
  '运维手册':'<h1>审批流插件 - 运维手册</h1><h2>1. 常用命令</h2><pre># 查看插件状态\nkubectl get pods -l app=approval-flow-plugin\n\n# 查看插件日志\nkubectl logs -f deployment/approval-flow-plugin\n\n# 回滚到上一版本\nkubectl rollout undo deployment/approval-flow-plugin</pre><h2>2. 常见问题</h2><h3>2.1 审批流卡住</h3><ul><li>检查 Redis 连接是否正常</li><li>检查审批节点状态是否为 PENDING</li><li>查看审批超时配置是否生效</li></ul><h3>2.2 性能下降</h3><ul><li>检查数据库索引是否生效</li><li>检查缓存命中率</li><li>查看是否有慢查询</li></ul>'}}
  };
  var CV_REVIEW_COMMENTS={
  0:[{author:'李工',avatar:'李',type:'comment',text:'代码结构清晰，但建议将审批超时逻辑抽离为独立的 TimeoutHandler 类，提高可测试性。',time:'今日 14:20'},{author:'陈晨',avatar:'陈',type:'comment',text:'单元测试覆盖了多级审批场景，但缺少异常分支测试（审批人离职、系统异常等）。',time:'今日 15:30'}],
  1:[{author:'王工',avatar:'王',type:'comment',text:'缓存方案合理，但需要考虑 Redis 宕机时的降级策略。建议增加本地缓存兜底。',time:'昨日 16:00'},{author:'张工',avatar:'张',type:'pass',text:'方案整体可行，性能指标满足要求。同意推进。',time:'今日 09:15'}],
  2:[{author:'王工',avatar:'王',type:'comment',text:'RBAC 模型设计合理，角色继承逻辑需要补充循环依赖检测。',time:'2 天前 10:00'},{author:'陈晨',avatar:'陈',type:'comment',text:'数据权限行级过滤方案需要验证大数据量下的性能。',time:'昨日 14:30'},{author:'李工',avatar:'李',type:'reject',text:'PermissionService.hasPermission 方法在角色链较深时性能有问题，建议增加缓存。',time:'今日 11:00'}],
  3:[{author:'陈晨',avatar:'陈',type:'comment',text:'水印实现方案可行，但多页打印时页眉需要每页重复渲染。',time:'3 小时前'}],
  4:[{author:'刘洋',avatar:'刘',type:'comment',text:'指数退避策略合理，但建议增加熔断机制，避免连续重试拖垮系统。',time:'1 小时前'}],
  5:[{author:'吴芳',avatar:'吴',type:'pass',text:'需求简单明确，实现完整，同意合入。',time:'昨日 14:30'}],
  6:[{author:'王工',avatar:'王',type:'comment',text:'多币种需求描述清晰，但汇率自动更新的时间需要明确（每日凌晨还是实时？）',time:'今日 10:00'}],
  7:[{author:'李工',avatar:'李',type:'reject',text:'权限过滤用例失败，部门管理员可见下级数据的逻辑有 Bug，需要修复后重新提交。',time:'今日 14:00'},{author:'陈晨',avatar:'陈',type:'comment',text:'测试用例覆盖了主要场景，建议增加并发查询的用例。',time:'今日 15:30'}],
  8:[{author:'王工',avatar:'王',type:'comment',text:'灰度发布策略合理，建议第一阶段缩短到 1 小时。',time:'昨日 16:00'}]
  };
  /* level/owner：协作身份分级（所有者/管理员/成员），见 cvCurrentLevel 等函数。
     梁平已经带着「所有者」角色标签，所有者身份归他；isMe 的张工给管理员，方便登录后
     直接体验"调整他人身份/移除成员"这套权限交互，不用切账号。 */
  var CV_ICON_OWNER='<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16l-2-9 5.5 4L12 4l3.5 7L21 7l-2 9H5zm0 2h14v2H5v-2z"/></svg>';
  var CV_ICON_ADMIN='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg>';
  var CV_ICON_MEMBER='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>';
  /* 协作身份分级：所有者 > 管理员 > 成员。只有所有者能调整管理员身份，
     管理员能管普通成员但动不了另一个管理员，谁都改不了自己。 */
  function cvCurrentMember(){ return CV_MEMBERS.filter(function(m){return m.isMe;})[0]||null; }
  function cvCurrentLevel(){
    var me=cvCurrentMember();if(!me)return'member';
    return me.owner?'owner':(me.level==='admin'?'admin':'member');
  }
  function cvCanManageMembers(){ var lv=cvCurrentLevel();return lv==='owner'||lv==='admin'; }
  function cvCanRemoveMember(target){
    if(!target||target.isMe||target.owner)return false;
    var lv=cvCurrentLevel();
    if(lv==='owner')return true;
    if(lv==='admin')return target.level!=='admin';
    return false;
  }
  function cvCanToggleLevel(target){
    if(!target||target.isMe||target.owner)return false;
    var lv=cvCurrentLevel();
    if(lv==='owner')return true;
    if(lv==='admin')return target.level!=='admin';
    return false;
  }
  function cvCloseMemberLevelMenus(exceptWrap){
    document.querySelectorAll('.member-level-menu').forEach(function(d){
      if(!exceptWrap||d.parentNode!==exceptWrap) d.remove();
    });
  }
  function cvToggleMemberLevelMenu(btn,idx,ev){
    if(ev){ev.stopPropagation();ev.preventDefault();}
    var wrap=btn.parentNode;
    var existing=wrap.querySelector('.member-level-menu');
    cvCloseMemberLevelMenus(wrap);
    if(existing){existing.remove();return;}
    var m=CV_MEMBERS[idx];if(!m)return;
    var menu=document.createElement('div');menu.className='member-level-menu';
    [{level:'member',text:'成员',desc:'可参与任务与评审',icon:CV_ICON_MEMBER},
     {level:'admin',text:'管理员',desc:'可管理人员与项目设置',icon:CV_ICON_ADMIN}].forEach(function(o){
      var active=m.level===o.level;
      var item=document.createElement('div');
      item.className='member-level-menu__item'+(active?' member-level-menu__item--active':'');
      item.innerHTML=o.icon+'<span class="member-level-menu__text"><b>'+o.text+'</b><small>'+o.desc+'</small></span>'
        +(active?'<svg class="member-level-menu__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':'');
      item.onclick=function(e){e.stopPropagation();menu.remove();cvSetMemberLevel(idx,o.level);};
      menu.appendChild(item);
    });
    wrap.appendChild(menu);
  }
  document.addEventListener('click',function(){cvCloseMemberLevelMenus(null);});
  function cvSetMemberLevel(idx,level){
    var m=CV_MEMBERS[idx];if(!m)return;
    if(!cvCanToggleLevel(m)){
      if(m.isMe)cvToast('不能修改自己的身份','warning');
      else if(m.owner)cvToast('所有者身份不可修改','warning');
      else cvToast('只有所有者可以调整管理员身份','warning');
      return;
    }
    if(m.level===level)return;
    m.level=level;
    cvRenderMembers();cvRenderMemberStats();cvApplyFilters();
    cvToast(m.name+' 已设为'+(level==='admin'?'管理员':'成员'),'success');
  }

  var CV_WORKFLOW = ['需求分析','方案设计','开发实现','代码审查','测试验证','部署发布'];
  var CV_WORKFLOW_ROLES = {'需求分析':'需求人员','方案设计':'架构人员','开发实现':'开发人员','代码审查':'开发人员','测试验证':'测试人员','部署发布':'运维人员'};
  var CV_THIRD_PARTY_MEMBERS=[
    {name:'钱涛',email:'qian***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
    {name:'宋宇',email:'song***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
    {name:'冯远',email:'feng***@kingdee.com',role:'架构',tag:'member-tag--arch',dept:'架构部'},
    {name:'许诺',email:'xu***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
    {name:'韩梅',email:'han***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
    {name:'罗静',email:'luo***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
    {name:'杨帆',email:'yang***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'},
    {name:'唐辉',email:'tang***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'},
    {name:'蒋雯',email:'jiang***@kingdee.com',role:'需求',tag:'member-tag--pm',dept:'产品部'},
    {name:'何欣',email:'he***@kingdee.com',role:'需求',tag:'member-tag--pm',dept:'产品部'},
    {name:'梁平',email:'liang***@kingdee.com',role:'产品',tag:'member-tag--pm',dept:'产品部'},
    {name:'范晨',email:'fan***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
    {name:'董睿',email:'dong***@kingdee.com',role:'架构',tag:'member-tag--arch',dept:'架构部'},
    {name:'贾旭',email:'jia***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
    {name:'武威',email:'wu***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'}
  ];

  function cvRenderTaskStats(){
    var counts={未开始:0,待评审:0,进行中:0,已完成:0,已失败:0};
    var rows=CV_TASKS.filter(cvInProject);
    rows.forEach(function(t){counts[t.status]=(counts[t.status]||0)+1;});
    var el=document.getElementById('cv-task-stats');if(!el)return;
    var stats=[
      {num:rows.length,label:'全部任务',color:'var(--text)',status:'全部状态'},
      {num:counts['未开始']||0,label:'未开始',color:'var(--text-secondary)',status:'未开始'},
      {num:counts['待评审']||0,label:'待评审',color:'var(--warning)',status:'待评审'},
      {num:counts['进行中']||0,label:'进行中',color:'var(--dot-blue)',status:'进行中'},
      {num:counts['已完成']||0,label:'已完成',color:'var(--success)',status:'已完成'},
      {num:counts['已失败']||0,label:'已失败',color:'var(--danger)',status:'已失败'}
    ];
    el.innerHTML=stats.map(function(s){
      return '<div class="stat" onclick="cvClickStat(this,\''+s.status+'\')"><div class="stat-num" style="color:'+s.color+'">'+s.num+'</div><div class="stat-label">'+s.label+'</div></div>';
    }).join('');
  }
  function cvBuildTaskCard(t,i){
    var typeCls={'需求':'badge-type','Bug':'badge-bug','任务':'badge-task','改进':'badge-improve'}[t.type]||'badge-type';
    var sizeCls=t.size==='大'?'badge-size-l':'badge-size-s';
    var srcCls={'Jira':'source-tag--jira','TAPD':'source-tag--tapd','对话自建':'source-tag--build','API':'source-tag--api','飞书':'source-tag--feishu'}[t.source]||'source-tag--build';
    var execCls=t.exec==='专家团'?'badge-expert':'badge-auto';
    var statusMap={'未开始':'pending','待评审':'review','进行中':'running','已完成':'done','已失败':'fail'};
    var sc=statusMap[t.status]||'pending';
    var nodeMap={'未开始':'需求分析','待评审':'代码审查','进行中':'开发实现','已完成':'部署发布','已失败':'开发实现'};
    var node=nodeMap[t.status]||'需求分析';
    return '<div class="card" data-type="'+t.type+'" data-status="'+t.status+'" data-collab="'+t.collab+'" data-size="'+t.size+'" data-idx="'+i+'">'
      +'<div class="card-top"><div class="card-row">'
      +'<span class="badge '+typeCls+'">'+t.type+'</span>'
      +'<span class="badge '+sizeCls+'">'+t.size+'</span>'
      +'<span class="source-tag '+srcCls+'">'+t.source+'</span>'
      +'<span class="badge-status badge-status--'+sc+'"><span class="badge-status-dot"></span>'+t.status+'</span>'
      +cvProjectTag(t)
      +'</div><span class="badge '+execCls+'">'+t.exec+'</span></div>'
      +'<div class="card-title">'+t.title+'</div>'
      +'<div class="card-desc">'+t.desc+'</div>'
      +'<div class="card-footer"><div class="assignee"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'+t.assignee+'</div><span style="font-size:11px;color:var(--text-soft)">'+t.source+' '+t.sourceId+'</span></div>'
      +'</div>';
  }
  function cvRenderReviewStats(){
    var el=document.getElementById('cv-review-stats');if(!el)return;
    var rows=CV_REVIEWS.filter(cvInProject);
    var urgent=rows.filter(function(r){return r.priority==='紧急';}).length;
    var mine=rows.filter(function(r){return r.from==='张工';}).length;
    var assigned=rows.filter(function(r){return r.reviewer==='张工';}).length;
    var stats=[
      {num:rows.length,label:'待评审',color:'var(--warning)',filter:'全部待评审'},
      {num:urgent,label:'即将到期',color:'var(--danger)',filter:'紧急'},
      {num:mine,label:'我发起的',color:'var(--dot-blue)',filter:'我发起的'},
      {num:assigned,label:'分配给我',color:'var(--success)',filter:'分配给我的'}
    ];
    el.innerHTML=stats.map(function(s){
      return '<div class="stat" onclick="cvClickReviewStat(this,\''+s.filter+'\')"><div class="stat-num" style="color:'+s.color+'">'+s.num+'</div><div class="stat-label">'+s.label+'</div></div>';
    }).join('');
  }
  function cvBuildReviewCard(r,i){
    var typeCls={'需求':'badge-type','Bug':'badge-bug','任务':'badge-task','改进':'badge-improve'}[r.type]||'badge-type';
    var sizeCls=r.size==='大'?'badge-size-l':'badge-size-s';
    var srcCls={'Jira':'source-tag--jira','TAPD':'source-tag--tapd','对话自建':'source-tag--build','API':'source-tag--api','飞书':'source-tag--feishu'}[r.source]||'source-tag--build';
    var artHtml=r.artifacts.map(function(a){return '<span class="review-artifact">'+a+'</span>';}).join(' · ');
    return '<div class="card" data-idx="'+i+'" onclick="cvOpenReviewDetail('+i+')">'
      +'<div class="card-top"><div class="card-row">'
      +'<span class="badge '+typeCls+'">'+r.type+'</span>'
      +'<span class="badge '+sizeCls+'">'+r.size+'</span>'
      +'<span class="source-tag '+srcCls+'">'+r.source+'</span>'
      +'<span class="badge-status badge-status--review"><span class="badge-status-dot"></span>待评审</span>'
      +cvProjectTag(r)
      +'</div><span class="badge badge-expert">'+r.exec+'</span></div>'
      +'<div class="card-title">'+r.title+'</div>'
      +'<div class="card-desc">'+r.desc+'</div>'
      +'<div class="review-info">'
      +'<div class="review-info-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>评审人: <b>'+r.reviewer+'</b> <span>('+r.reviewerRole+')</span></div>'
      +'<div class="review-info-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="'+r.deadlineColor+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>截止: <b style="color:'+r.deadlineColor+'">'+r.deadline+'</b></div>'
      +'<div class="review-info-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>产物: '+artHtml+'</div>'
      +'</div>'
      +'<div class="card-actions"><span class="card-node"><span class="card-node-dot"></span>'+r.reviewType+'</span><div style="display:flex;gap:4px;margin-left:auto">'
      +'<button class="act-btn act-btn--exec" onclick="event.stopPropagation();cvReviewPass('+i+')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>通过</button>'
      +'<button class="act-btn act-btn--reject" onclick="event.stopPropagation();cvReviewReject('+i+')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>驳回</button>'
      +'<button class="card-view-btn" onclick="event.stopPropagation();cvOpenReviewDetail('+i+')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>查看对话</button>'
      +'</div></div></div>';
  }
  function cvRenderMembers(){
    var el=document.getElementById('cv-member-list');if(!el)return;
    var addBtn=document.getElementById('cv-add-member-btn');
    if(addBtn)addBtn.style.display=cvCanManageMembers()?'':'none';
    el.innerHTML=CV_MEMBERS.map(function(m,i){
      if(!cvInProject(m)) return '';
      var tagHtml=m.roles.map(function(r){return '<span class="member-tag '+r.tag+'">'+r.text+'</span>';}).join('');
      var statusCls=m.status==='available'?'member-status--available':'member-status--busy';
      var statusText=m.status==='available'?'可用':'繁忙';
      var avatarCls=m.isMe?'member-avatar member-avatar--me':'member-avatar';
      var nameCls=m.isMe?'member-name member-name--me':'member-name';
      var isAdmin=m.level==='admin';
      var levelText=m.owner?'所有者':(isAdmin?'管理员':'成员');
      var levelIcon=m.owner?CV_ICON_OWNER:(isAdmin?CV_ICON_ADMIN:CV_ICON_MEMBER);
      var levelCls='member-level '+(m.owner?'member-level--owner':(isAdmin?'member-level--admin':'member-level--member'));
      var levelHtml;
      if(cvCanToggleLevel(m)){
        var caret='<svg class="member-level-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
        levelHtml='<div class="member-level-wrap"><button type="button" class="'+levelCls+'" onclick="cvToggleMemberLevelMenu(this,'+i+',event)" title="设置协作身份，点击选择">'+levelIcon+levelText+caret+'</button></div>';
      }else{
        var lockTitle=m.isMe?'不能修改自己的身份':(m.owner?'所有者身份不可修改':'只有所有者可以调整管理员身份');
        levelHtml='<span class="'+levelCls+' member-level--static" title="'+lockTitle+'">'+levelIcon+levelText+'</span>';
      }
      var delHtml=cvCanRemoveMember(m)?'<button class="member-del" onclick="cvDeleteMember('+i+')" title="移除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>':'';
      return '<div class="member-row" data-role="'+m.roles.map(function(r){return r.text;}).join(' ')+'">'
        +'<div class="'+avatarCls+'">'+m.name[0]+'</div>'
        +'<div class="member-info"><div class="'+nameCls+'">'+m.name+(m.isMe?' （你）':'')+'</div><div class="member-email">'+m.email+'</div><div class="member-tags">'+tagHtml+'</div></div>'
        +'<span class="member-status '+statusCls+'">'+statusText+'</span>'
        +'<span class="member-source">'+m.source+'</span>'
        +levelHtml
        +delHtml
        +'</div>';
    }).join('');
  }
  function cvRenderMemberStats(){
    var el=document.getElementById('cv-member-stats');if(!el)return;
    var counts={需求:0,架构:0,开发:0,测试:0,运维:0,产品:0};
    var rows=CV_MEMBERS.filter(cvInProject);
    rows.forEach(function(m){m.roles.forEach(function(r){var k=r.text;if(counts[k]!==undefined)counts[k]++;});});
    var stats=[
      {num:rows.length,label:'全部成员',color:'var(--text)'},
      {num:counts['需求'],label:'需求人员',color:'var(--dot-blue)'},
      {num:counts['架构'],label:'架构人员',color:'var(--brand)'},
      {num:counts['开发'],label:'开发人员',color:'var(--success)'},
      {num:counts['测试'],label:'测试人员',color:'var(--warning)'},
      {num:counts['运维'],label:'运维人员',color:'var(--danger)'},
      {num:counts['产品'],label:'产品人员',color:'#7858f9'}
    ];
    el.innerHTML=stats.map(function(s){return '<div class="stat"><div class="stat-num" style="color:'+s.color+'">'+s.num+'</div><div class="stat-label">'+s.label+'</div></div>';}).join('');
  }
  function cvInjectCardActions(){
    document.querySelectorAll('#cv-task-grid .card').forEach(function(card){
      if(card.querySelector('.card-actions'))return;
      var idx=parseInt(card.getAttribute('data-idx'));
      var t=CV_TASKS[idx];if(!t)return;
      var status=t.status;
      var nodeMap={'未开始':'需求分析','待评审':'代码审查','进行中':'开发实现','已完成':'部署发布','已失败':'开发实现'};
      var node=nodeMap[status]||'需求分析';
      var execBtn='<button class="act-btn act-btn--exec" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-exec-overlay\')" title="执行任务"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>执行</button>';
      var transferBtn='<button class="act-btn act-btn--transfer" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-transfer-overlay\')" title="转交任务"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>转交</button>';
      var twistBtn='<button class="act-btn act-btn--twist" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-twist-overlay\')" title="扭转任务"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.7"/><polyline points="21 3 21 9 15 9"/></svg>扭转</button>';
      var reviewBtn='<button class="act-btn act-btn--review" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-review-overlay\')" title="发起评审"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>评审</button>';
      var viewBtn='<button class="card-view-btn" onclick="event.stopPropagation();cvOpenConversation(this.closest(\'.card\'))" title="查看对话"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>查看对话</button>';
      var btns='';
      if(status==='未开始'){btns=execBtn+transferBtn+twistBtn+reviewBtn;}
      else if(status==='待评审'){btns=reviewBtn+viewBtn;}
      else{btns=viewBtn;card.classList.add('card--clickable');card.onclick=function(e){if(!e.target.closest('.act-btn')&&!e.target.closest('.card-view-btn'))cvOpenConversation(card);};}
      var ad=document.createElement('div');ad.className='card-actions';
      ad.innerHTML='<span class="card-node"><span class="card-node-dot"></span>'+node+'</span><div style="display:flex;gap:4px;margin-left:auto">'+btns+'</div>';
      card.appendChild(ad);
      if(status==='进行中'){}
    });
  }

  /* ============ VIEW SWITCHING ============ */
  function cvSwitchFilter(btn){
    var group=btn.closest('.filter-group');if(group){group.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('filter-btn--active');});}
    btn.classList.add('filter-btn--active');
    if(btn.closest('#cv-review')){cvApplyReviewFilters();}else{cvApplyFilters();}
  }
  function cvApplyFilters(){
    var taskView=document.getElementById('cv-tasks');
    if(taskView&&taskView.classList.contains('active')){
      var typeF=cvGetFilterVal(taskView,'type');
      var statusF=cvGetFilterVal(taskView,'status');
      var collabF=cvGetFilterVal(taskView,'collab');
      var sizeF=cvGetFilterVal(taskView,'size');
      var search=(taskView.querySelector('input')||{}).value||'';
      search=search.toLowerCase();
      taskView.querySelectorAll('.card').forEach(function(card){
        var match=true;
        if(typeF&&typeF!=='全部'&&card.getAttribute('data-type')!==typeF)match=false;
        if(match&&statusF&&statusF!=='全部状态'&&card.getAttribute('data-status')!==statusF)match=false;
        if(match&&collabF&&collabF!=='全部协作'&&card.getAttribute('data-collab')!==collabF)match=false;
        if(match&&sizeF&&sizeF!=='全部大小'){
          var cs=card.getAttribute('data-size');if((sizeF==='小任务'&&cs!=='小')||(sizeF==='大任务'&&cs!=='大'))match=false;
        }
        if(match&&search){
          var title=(card.querySelector('.card-title')||{}).textContent||'';if(title.toLowerCase().indexOf(search)<0)match=false;
        }
        card.style.display=match?'':'none';
      });
    }
    var memberView=document.getElementById('cv-members');
    if(memberView&&memberView.classList.contains('active')){
      var roleF=cvGetFilterVal(memberView,'role');
      var msearch=(memberView.querySelector('input')||{}).value||'';
      msearch=msearch.toLowerCase();
      memberView.querySelectorAll('.member-row').forEach(function(row){
        var match=true;
        if(roleF&&roleF!=='全部'){
          var roles=row.getAttribute('data-role')||'';if(roles.indexOf(roleF)<0)match=false;
        }
        if(match&&msearch){
          var name=(row.querySelector('.member-name')||{}).textContent||'';
          var email=(row.querySelector('.member-email')||{}).textContent||'';
          if(name.toLowerCase().indexOf(msearch)<0&&email.toLowerCase().indexOf(msearch)<0)match=false;
        }
        row.style.display=match?'':'none';
      });
    }
  }
  function cvGetFilterVal(view,type){
    var g=view.querySelector('[data-filter-type="'+type+'"]');if(!g)return null;
    var a=g.querySelector('.filter-btn--active');return a?a.textContent.trim():null;
  }

  /* ============ STATS CLICK ============ */
  function cvClickStat(stat,status){
    var view=stat.closest('.cv-panel');if(!view)return;
    view.querySelectorAll('.stat').forEach(function(s){s.classList.remove('stat--active');});
    stat.classList.add('stat--active');
    if(status==='全部状态'){
      view.querySelectorAll('.filter-group').forEach(function(g){
        g.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('filter-btn--active');});
        var first=g.querySelector('.filter-btn');if(first)first.classList.add('filter-btn--active');
      });
    }else if(status){
      var sg=view.querySelector('[data-filter-type="status"]');if(sg){
        sg.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('filter-btn--active');});
        var match=Array.prototype.find.call(sg.querySelectorAll('.filter-btn'),function(b){return b.textContent.trim()===status;});
        if(match)match.classList.add('filter-btn--active');
      }
    }
    cvApplyFilters();
  }
  function cvClickReviewStat(stat,filter){
    var view=stat.closest('.cv-panel');if(!view)return;
    view.querySelectorAll('.stat').forEach(function(s){s.classList.remove('stat--active');});
    stat.classList.add('stat--active');
    if(filter&&filter!=='全部待评审'){
      var groups=view.querySelectorAll('.filter-group');
      groups.forEach(function(g){
        var match=Array.prototype.find.call(g.querySelectorAll('.filter-btn'),function(b){return b.textContent.trim()===filter;});
        if(match){
          g.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('filter-btn--active');});
          match.classList.add('filter-btn--active');
        }
      });
    }
    cvApplyReviewFilters();
  }
  function cvApplyReviewFilters(){
    var view=document.getElementById('cv-review');if(!view)return;
    var typeF=cvGetFilterVal(view,'review-type');
    var priorityF=cvGetFilterVal(view,'review-priority');
    var search=(view.querySelector('input')||{}).value||'';search=search.toLowerCase();
    view.querySelectorAll('.card').forEach(function(card){
      var match=true;var idx=parseInt(card.getAttribute('data-idx'));
      var r=CV_REVIEWS[idx];if(!r){card.style.display='none';return;}
      if(typeF&&typeF!=='全部待评审'){
        if(typeF==='我发起的'&&r.from!=='张工')match=false;
        if(typeF==='分配给我的'&&r.reviewer!=='张工')match=false;
      }
      if(match&&priorityF&&priorityF!=='全部优先级'&&r.priority!==priorityF)match=false;
      if(match&&search){if(r.title.toLowerCase().indexOf(search)<0)match=false;}
      card.style.display=match?'':'none';
    });
  }

  /* ============ 弹窗状态桥（Phase 2 antd 化，见 docs/react-migration-plan.md） ============
     同步任务/执行/转交/扭转/评审/添加人员/新建项目这 7 个弹窗的 DOM 已经从
     index.html 删除，改由 src/components/collab/CollabModals.jsx 用 antd
     Modal/Form 渲染。这里只广播"哪个弹窗要开"，弹窗打开后要做的判断、落库、
     联动其它 UI（卡片状态、toast、任务列表）仍然 100% 留在这个文件里，React
     侧只负责收集表单值后调用 window.__lingeeBridge.collab 里对应的函数，不
     重新发明这些判断。 */
  var _cvModalState={name:null};
  var _cvModalListeners=[];
  function _cvModalNotify(){ _cvModalListeners.slice().forEach(function(fn){ try{fn(_cvModalState);}catch(e){} }); }
  function _cvModalOpen(name){ _cvModalState={name:name}; _cvModalNotify(); }
  function _cvModalClose(name){ if(!name||_cvModalState.name===name){ _cvModalState={name:null}; _cvModalNotify(); } }
  function _cvModalSubscribe(fn){ _cvModalListeners.push(fn); return function(){ var i=_cvModalListeners.indexOf(fn); if(i>=0)_cvModalListeners.splice(i,1); }; }
  var CV_TASK_MODAL_IDS={'cv-exec-overlay':'exec','cv-transfer-overlay':'transfer','cv-twist-overlay':'twist','cv-review-overlay':'review'};

  /* ============ SYNC MODAL ============ */
  function cvOpenSyncModal(){ _cvModalOpen('sync'); }
  function cvCloseSyncModal(){ _cvModalClose('sync'); }
  function cvBuildSyncTaskData(form,status){
    form=form||{};
    var title=(form.title||'').trim();
    if(!title){cvToast('请输入任务标题','warning');return null;}
    return{title:title,desc:(form.desc||'').trim(),type:form.type||'需求',priority:form.priority||'中',
      source:form.source||'对话自建',size:form.size||'小任务',status:status||'未开始',
      collab:form.collab||'Agent间协作',assignee:status==='进行中'?'AI开发Agent':'待分配',progress:0};
  }
  function cvSaveTaskToStorage(task){
    var tasks=[];try{tasks=JSON.parse(localStorage.getItem('build_tasks')||'[]');}catch(e){}
    tasks.unshift(task);localStorage.setItem('build_tasks',JSON.stringify(tasks));
  }
  /* 弹窗里的任务落库：归一化字段并挂到当前项目（聚合视图下默认第一个项目） */
  function cvNormalizeTask(task){
    var big=task.size==='大任务';
    return {type:task.type,size:big?'大':'小',source:task.source,sourceId:task.sourceId||'新建',
      exec:big?'专家团':'自动执行',status:task.status,collab:task.collab,title:task.title,
      desc:task.desc||'暂无描述',assignee:task.assignee,progress:task.progress||0,
      project:task.project||cvProject||CV_PROJECTS[0].id};
  }
  function cvAddTask(task){
    var row=cvNormalizeTask(task);
    CV_TASKS.unshift(row);
    cvRenderTaskStats(); cvRenderTasks(); cvInjectCardActions(); cvApplyFilters(); cvUpdateCounts();
    return row;
  }
  function cvSaveSyncTask(form){
    var task=cvBuildSyncTaskData(form,'未开始');if(!task)return;
    var row=cvAddTask(task);cvSaveTaskToStorage(row);cvCloseSyncModal();
    cvToast('任务已保存到「'+cvProjectName(row.project)+'」任务列表','success');
  }
  function cvStartSyncTask(form){
    var task=cvBuildSyncTaskData(form,'未开始');if(!task)return;
    var row=cvAddTask(task);cvSaveTaskToStorage(row);cvCloseSyncModal();
    cvToast('任务已创建到「'+cvProjectName(row.project)+'」，可点击「执行」启动','success');
  }

  /* ============ TASK MODALS ============ */
  function cvOpenTaskModal(id){ _cvModalOpen(CV_TASK_MODAL_IDS[id]||id); }
  function cvCloseTaskModal(id){ _cvModalClose(CV_TASK_MODAL_IDS[id]||id); }
  /* 数据 getter：只返回数据，具体怎么排布是 CollabModals.jsx 的事 */
  function cvGetMembersForModal(){
    return CV_MEMBERS.map(function(m){return{name:m.name,roles:m.roles.map(function(r){return r.text;})};});
  }
  function cvCurrentWorkflowNode(){
    var card=window.cvCard;var node='开发实现';
    if(card){var na=card.querySelector('.card-node');if(na)node=na.textContent.replace(/^[\s​]+/,'').trim();}
    return node;
  }
  function cvGetReviewCandidates(){
    var role=CV_WORKFLOW_ROLES[cvCurrentWorkflowNode()]||'开发人员';
    return CV_MEMBERS.filter(function(m){return m.roles.some(function(r){return r.text.indexOf(role)>=0||role.indexOf(r.text)>=0;});})
      .map(function(m){return{name:m.name,roles:m.roles.map(function(r){return r.text;})};});
  }
  function cvGetWorkflowState(){
    var currentNode=cvCurrentWorkflowNode();
    var currentIdx=CV_WORKFLOW.indexOf(currentNode);if(currentIdx<0)currentIdx=0;
    var steps=CV_WORKFLOW.map(function(step,i){
      return{name:step,phase:i<currentIdx?'done':(i===currentIdx?'current':'pending'),
        status:i<currentIdx?'已完成':(i===currentIdx?'当前节点':CV_WORKFLOW_ROLES[step])};
    });
    var nextIdx=Math.min(currentIdx+1,CV_WORKFLOW.length-1);
    return{steps:steps,nextLabel:CV_WORKFLOW[nextIdx]+' → '+CV_WORKFLOW_ROLES[CV_WORKFLOW[nextIdx]]};
  }
  function cvGetDefaultArtifacts(){
    return[['code','</>','源代码','ExpensePlugin.java'],['test','T','单元测试','ExpenseTest.java'],['spec','S','需求规格','PRD.md'],['doc','D','技术方案','TechSpec.md']]
      .map(function(a){return{kind:a[0],badge:a[1],name:a[2],file:a[3]};});
  }

  /* ============ CONFIRM ACTIONS ============ */
  function cvConfirmExec(collabMode){
    var mode=collabMode||'Agent间协作';
    cvCloseTaskModal('cv-exec-overlay');
    var card=window.cvCard;var taskTitle='新任务';
    if(card){
      var titleEl=card.querySelector('.card-title');if(titleEl)taskTitle=titleEl.textContent;
      card.setAttribute('data-status','进行中');
      var sb=card.querySelector('.badge-status');if(sb){sb.className='badge-status badge-status--running';sb.innerHTML='<span class="badge-status-dot"></span>进行中';}
      var node=card.querySelector('.card-node');if(node)node.innerHTML='<span class="card-node-dot" style="background:var(--dot-blue)"></span>开发实现';
      card.querySelector('.card-actions')&&(card.querySelector('.card-actions').style.display='none');
    }
    cvAddSidebarConversation(taskTitle);cvSwitchToChat();cvToast('任务已启动执行！协作模式：'+mode,'success');
    cvSimulateExecution(taskTitle,card);
  }
  function cvConfirmTransfer(personName){
    cvCloseTaskModal('cv-transfer-overlay');
    cvToast('任务已转交给：'+(personName||'李工'),'success');
  }
  function cvConfirmTwist(){cvCloseTaskModal('cv-twist-overlay');cvToast('任务已扭转到下一节点：代码审查，产物已自动传递给审查人员','info');}
  function cvConfirmReview(personName){
    cvCloseTaskModal('cv-review-overlay');
    if(window.cvCard){
      window.cvCard.setAttribute('data-status','待评审');
      var sb=window.cvCard.querySelector('.badge-status');if(sb){sb.className='badge-status badge-status--review';sb.innerHTML='<span class="badge-status-dot"></span>待评审';}
      var node=window.cvCard.querySelector('.card-node');if(node){node.innerHTML='<span class="card-node-dot" style="background:var(--warning)"></span>代码审查';node.style.background='var(--warning-bg)';node.style.color='var(--warning)';}
    }
    cvToast('评审已发起！评审人：'+(personName||'王工')+'，任务状态已变更为「待评审」','success');
  }

  /* ============ REVIEW ACTIONS ============ */
  function cvReviewPass(i){
    cvToast('评审通过！任务已流转到测试验证节点','success');
    var grid=document.getElementById('cv-review-grid');if(grid){var card=grid.children[i];if(card){card.style.transition='opacity .3s';card.style.opacity='0.3';}}
  }
  function cvReviewReject(i){cvToast('评审驳回！任务已退回给开发人员','error');}
  function cvOpenReviewDetail(i){
    var r=CV_REVIEWS[i];if(!r)return;
    window.cvReviewIdx=i;
    var titleEl=document.getElementById('cv-rv-title');if(titleEl)titleEl.textContent=r.title;
    var arts=CV_REVIEW_ARTIFACTS[i]||{tabs:['产物'],content:{'产物':'<p>暂无产物内容</p>'}};
    var tabsEl=document.getElementById('cv-rv-art-tabs');
    if(tabsEl){tabsEl.innerHTML=arts.tabs.map(function(t,idx){return '<button class="rv-art-tab'+(idx===0?' rv-art-tab--active':'')+'" onclick="cvSwitchArtifact('+i+',\''+t+'\')">'+t+'</button>';}).join('');}
    cvSwitchArtifact(i,arts.tabs[0]);
    var headerEl=document.getElementById('cv-rv-panel-header');
    if(headerEl){headerEl.innerHTML='<div class="rv-panel-title">评审信息</div><div class="rv-panel-info"><div class="rv-panel-info-item">评审人: <b>'+r.reviewer+'</b> ('+r.reviewerRole+')</div><div class="rv-panel-info-item">截止: <b style="color:'+r.deadlineColor+'">'+r.deadline+'</b></div><div class="rv-panel-info-item">发起人: <b>'+r.from+'</b> ('+r.fromTime+')</div><div class="rv-panel-info-item">优先级: <b>'+r.priority+'</b></div></div>';}
    cvRenderReviewComments(i);
    document.querySelectorAll('#view-collab .cv-panel').forEach(function(v){v.classList.remove('active');});
    var view=document.getElementById('cv-review-detail');if(view)view.classList.add('active');
  }
  function cvSwitchArtifact(idx,tab){
    var arts=CV_REVIEW_ARTIFACTS[idx];if(!arts)return;
    var tabsEl=document.getElementById('cv-rv-art-tabs');
    if(tabsEl){tabsEl.querySelectorAll('.rv-art-tab').forEach(function(t){t.classList.toggle('rv-art-tab--active',t.textContent===tab);});}
    var bodyEl=document.getElementById('cv-rv-art-body');
    if(bodyEl){bodyEl.innerHTML='<div class="rv-doc">'+(arts.content[tab]||'<p>暂无内容</p>')+'</div>';}
  }
  function cvRenderReviewComments(idx){
    var el=document.getElementById('cv-rv-comments');if(!el)return;
    var comments=CV_REVIEW_COMMENTS[idx]||[];
    var bm={'pass':['rv-comment-badge--pass','通过'],'reject':['rv-comment-badge--reject','驳回'],'comment':['rv-comment-badge--comment','评论']};
    el.innerHTML=comments.map(function(c){var b=bm[c.type]||['rv-comment-badge--comment','评论'];return '<div class="rv-comment"><div class="rv-comment-avatar '+(c.isAgent?'rv-comment-avatar--agent':'')+'">'+(c.avatar||c.author[0])+'</div><div class="rv-comment-body"><div class="rv-comment-header"><span class="rv-comment-author">'+c.author+'</span><span class="rv-comment-badge '+b[0]+'">'+b[1]+'</span><span class="rv-comment-time">'+c.time+'</span></div><div class="rv-comment-text">'+c.text+'</div></div></div>';}).join('');
  }
  function cvSubmitReview(type){
    var input=document.getElementById('cv-rv-input');var text=input?input.value.trim():'';
    if(!text&&type==='comment'){cvToast('请输入评审意见','warning');return;}
    var idx=window.cvReviewIdx;var r=CV_REVIEWS[idx];if(!r)return;
    var el=document.getElementById('cv-rv-comments');
    if(el&&text){var bm={'pass':['rv-comment-badge--pass','通过'],'reject':['rv-comment-badge--reject','驳回'],'comment':['rv-comment-badge--comment','评论']};var b=bm[type]||['rv-comment-badge--comment','评论'];var d=document.createElement('div');d.className='rv-comment';d.innerHTML='<div class="rv-comment-avatar">我</div><div class="rv-comment-body"><div class="rv-comment-header"><span class="rv-comment-author">张工（你）</span><span class="rv-comment-badge '+b[0]+'">'+b[1]+'</span><span class="rv-comment-time">刚刚</span></div><div class="rv-comment-text">'+text+'</div></div>';el.appendChild(d);el.scrollTop=el.scrollHeight;}
    if(input)input.value='';
    if(type==='pass'){cvToast('评审通过！任务已流转到测试验证节点','success');var g=document.getElementById('cv-review-grid');if(g&&g.children[idx]){g.children[idx].style.transition='opacity .3s';g.children[idx].style.opacity='0.4';}}
    else if(type==='reject'){cvToast('评审驳回！任务已退回给开发人员','error');}
    else{cvToast('评审意见已提交','info');}
  }

  /* ============ CHAT ============ */
  function cvSwitchToChat(){
    cvShowPanel('chat');
  }
  function cvAddChatMessage(type,text){
    var body=document.getElementById('cv-chat-body');if(!body)return;
    var msg=document.createElement('div');msg.className='chat-msg chat-msg--'+type;
    var avatar=type==='agent'?'AI':'我';
    var time=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    msg.innerHTML='<div class="chat-msg-avatar">'+avatar+'</div><div><div class="chat-msg-bubble">'+text+'</div><div class="chat-msg-time">'+time+'</div></div>';
    body.appendChild(msg);body.scrollTop=body.scrollHeight;
  }
  function cvAddChatTyping(){
    var body=document.getElementById('cv-chat-body');if(!body)return;
    if(document.getElementById('cv-chat-typing-indicator'))return;
    var t=document.createElement('div');t.className='chat-msg chat-msg--agent';t.id='cv-chat-typing-indicator';
    t.innerHTML='<div class="chat-msg-avatar">AI</div><div class="chat-typing"><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span></div>';
    body.appendChild(t);body.scrollTop=body.scrollHeight;
  }
  function cvRemoveChatTyping(){var t=document.getElementById('cv-chat-typing-indicator');if(t&&t.parentNode)t.parentNode.removeChild(t);}
  function cvSimulateExecution(taskTitle,card){
    var titleEl=document.getElementById('cv-chat-task-title');if(titleEl)titleEl.textContent=taskTitle;
    var badge=document.getElementById('cv-chat-status-badge');if(badge){badge.className='chat-status-badge chat-status-badge--running';badge.innerHTML='<span style="width:6px;height:6px;border-radius:50%;background:var(--dot-blue);animation:cvPulse 1.5s infinite"></span>执行中';}
    var body=document.getElementById('cv-chat-body');if(body)body.innerHTML='';
    var steps=[
      {delay:500,msg:'正在分析任务需求...'},
      {delay:2000,msg:'已生成需求规格说明书，包含 3 个功能点和 5 个验收标准。'},
      {delay:3000,msg:'正在设计技术方案，确定使用苍穹元数据 + KWC 页面开发模式...'},
      {delay:3000,msg:'技术方案已就绪。开始生成业务对象和字段定义...'},
      {delay:3000,msg:'已生成 5 个业务对象、12 个字段、2 个表单页面。正在生成后端插件代码...'},
      {delay:3000,msg:'插件代码已生成完成。正在执行单元测试...'},
      {delay:2500,msg:'单元测试全部通过（8/8）。正在生成测试报告...'},
      {delay:2000,msg:'执行完成！所有产物已生成。',done:true}
    ];
    var i=0;
    function next(){
      if(i>=steps.length)return;var step=steps[i];
      setTimeout(function(){
        cvRemoveChatTyping();cvAddChatMessage('agent',step.msg);
        if(step.done){
          var b=document.getElementById('cv-chat-status-badge');if(b){b.className='chat-status-badge chat-status-badge--done';b.innerHTML='<span style="width:6px;height:6px;border-radius:50%;background:var(--success)"></span>已完成';}
          if(card){
            card.setAttribute('data-status','已完成');
            var sb=card.querySelector('.badge-status');if(sb){sb.className='badge-status badge-status--done';sb.innerHTML='<span class="badge-status-dot"></span>已完成';}
            var node=card.querySelector('.card-node');if(node)node.innerHTML='<span class="card-node-dot" style="background:var(--brand)"></span>部署发布';
            var ca=card.querySelector('.card-actions');if(ca)ca.style.display='';ca.innerHTML='<span class="card-node"><span class="card-node-dot" style="background:var(--brand)"></span>部署发布</span><div style="display:flex;gap:4px;margin-left:auto"><button class="card-view-btn" onclick="event.stopPropagation();cvOpenConversation(this.closest(\'.card\'))" title="查看对话"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>查看对话</button></div>';
            card.classList.add('card--clickable');card.onclick=function(e){if(!e.target.closest('.card-view-btn'))cvOpenConversation(card);};
          }
          var conv=document.querySelector('.sub-item.cv-running');if(conv){conv.classList.remove('cv-running');var dot=conv.querySelector('.dot');if(dot)dot.className='dot green';}
          if(body){
            var artDiv=document.createElement('div');artDiv.className='chat-artifacts';
            artDiv.innerHTML='<div class="chat-artifacts-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>产物列表</div>';
            var arts=[['spec','S','需求规格说明书','PRD.md','已归档'],['doc','D','技术方案文档','TechSpec.md','已归档'],['code','</>','业务对象定义','ExpenseBO.java','已归档'],['code','</>','插件源代码','ExpensePlugin.java','已归档'],['test','T','单元测试','ExpenseTest.java','8/8通过'],['code','</>','表单页面','ExpenseForm.kwc','已归档']];
            var iconMap={'spec':'artifact-icon--spec','doc':'artifact-icon--doc','code':'artifact-icon--code','test':'artifact-icon--test'};
            arts.forEach(function(a){artDiv.innerHTML+='<div class="artifact-item"><div class="artifact-icon '+(iconMap[a[0]]||'artifact-icon--doc')+'">'+a[1]+'</div><span>'+a[2]+'</span><span class="artifact-meta">'+a[4]+'</span></div>';});
            body.appendChild(artDiv);body.scrollTop=body.scrollHeight;
          }
          cvToast('任务执行完成！','success');
        }else{cvAddChatTyping();i++;next();}
      },step.delay);
    }
    cvAddChatTyping();i=1;next();
  }
  function cvSendChatMessage(){
    var input=document.getElementById('cv-chat-input');if(!input||!input.value.trim())return;
    cvAddChatMessage('user',input.value.trim());input.value='';cvAddChatTyping();
    setTimeout(function(){cvRemoveChatTyping();cvAddChatMessage('agent','收到，正在处理您的请求...');},1500);
  }

  /* ============ OPEN CONVERSATION ============ */
  function cvOpenConversation(card){
    if(!card)return;
    var titleEl=card.querySelector('.card-title');var taskTitle=titleEl?titleEl.textContent:'任务对话';
    var status=card.getAttribute('data-status')||'未开始';
    window.cvCard=card;
    var titleInput=document.getElementById('cv-chat-task-title');if(titleInput)titleInput.textContent=taskTitle;
    var badge=document.getElementById('cv-chat-status-badge');
    if(badge){
      var sm={'未开始':['pending','var(--text-secondary)','未开始'],'待评审':['review','var(--warning)','待评审'],'进行中':['running','var(--dot-blue)','执行中'],'已完成':['done','var(--success)','已完成'],'已失败':['fail','var(--danger)','已失败']};
      var s=sm[status]||['pending','var(--text-secondary)','未开始'];
      badge.className='chat-status-badge chat-status-badge--'+s[0];
      badge.innerHTML='<span style="width:6px;height:6px;border-radius:50%;background:'+s[1]+(status==='进行中'?';animation:cvPulse 1.5s infinite':'')+'"></span>'+s[2];
    }
    var body=document.getElementById('cv-chat-body');if(body)body.innerHTML='';
    var dialogues={
      '进行中':[['agent','正在分析任务需求...'],['agent','已生成需求规格说明书，包含 3 个功能点和 5 个验收标准。'],['agent','正在设计技术方案，确定使用苍穹元数据 + KWC 页面开发模式...'],['agent','技术方案已就绪。开始生成业务对象和字段定义...'],['user','字段命名规范要符合公司标准，请参考 ERP 字段命名规范。'],['agent','已调整字段命名规范。已生成 5 个业务对象、12 个字段。正在生成后端插件代码...']],
      '待评审':[['agent','已完成任务开发，以下是生成的产物，请评审。'],['user','代码质量如何？有没有安全问题？'],['agent','代码已通过 SAST 扫描，无安全漏洞。单元测试覆盖率 92%。'],['agent','等待评审人确认...']],
      '已完成':[['agent','正在分析任务需求...'],['agent','已生成需求规格说明书。'],['agent','技术方案已就绪，开始生成代码...'],['agent','插件代码已生成完成。单元测试全部通过（8/8）。'],['user','测试报告发一下。'],['agent','已生成测试报告，所有验收标准均通过。'],['agent','执行完成！所有产物已生成并归档。']],
      '已失败':[['agent','正在分析任务需求...'],['agent','已生成需求规格说明书。'],['agent','开始生成代码...'],['agent','执行过程中出现错误：插件编译失败，缺少依赖 com.kingdee.cosmic.*'],['user','检查一下依赖配置。'],['agent','已排查，苍穹 SDK 版本不兼容。需要升级到 7.0+ 版本。'],['agent','任务执行失败，请检查环境配置后重试。']]
    };
    var msgs=dialogues[status]||[];msgs.forEach(function(m){cvAddChatMessage(m[0],m[1]);});
    var artifacts={
      '进行中':[['spec','S','需求规格说明书','PRD.md','已生成'],['doc','D','技术方案文档','TechSpec.md','已生成'],['code','</>','业务对象定义','ExpenseBO.java','已生成'],['code','</>','表单页面','ExpenseForm.kwc','生成中...']],
      '待评审':[['code','</>','插件源代码','ExpensePlugin.java','待评审'],['test','T','单元测试','ExpenseTest.java','8/8通过'],['spec','S','需求规格','PRD.md','已生成'],['doc','D','技术方案','TechSpec.md','已生成']],
      '已完成':[['spec','S','需求规格说明书','PRD.md','已归档'],['doc','D','技术方案文档','TechSpec.md','已归档'],['code','</>','业务对象定义','ExpenseBO.java','已归档'],['code','</>','插件源代码','ExpensePlugin.java','已归档'],['test','T','单元测试','ExpenseTest.java','8/8通过'],['code','</>','表单页面','ExpenseForm.kwc','已归档']],
      '已失败':[['spec','S','需求规格说明书','PRD.md','已生成'],['doc','D','技术方案文档','TechSpec.md','已生成'],['code','</>','插件源代码','ExpensePlugin.java','编译失败']]
    };
    var arts=artifacts[status]||[];
    if(arts.length>0&&body){
      var artDiv=document.createElement('div');artDiv.className='chat-artifacts';
      artDiv.innerHTML='<div class="chat-artifacts-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>产物列表</div>';
      var iconMap={'spec':'artifact-icon--spec','doc':'artifact-icon--doc','code':'artifact-icon--code','test':'artifact-icon--test'};
      arts.forEach(function(a){artDiv.innerHTML+='<div class="artifact-item"><div class="artifact-icon '+(iconMap[a[0]]||'artifact-icon--doc')+'">'+a[1]+'</div><span>'+a[2]+'</span><span class="artifact-meta">'+a[4]+'</span></div>';});
      body.appendChild(artDiv);body.scrollTop=body.scrollHeight;
    }
    cvSwitchToChat();
  }

  
  function cvOpenAddMemberModal(){
    if(!cvCanManageMembers()){cvToast('没有添加协作人员的权限','warning');return;}
    _cvModalOpen('addmember');
  }
  function cvCloseAddMemberModal(){ _cvModalClose('addmember'); }
  function cvFindThirdPartyMembers(q){
    q=(q||'').toLowerCase();
    var existing=CV_MEMBERS.map(function(m){return m.name;});
    return CV_THIRD_PARTY_MEMBERS.filter(function(m){
      return(m.name.toLowerCase().indexOf(q)>=0||m.email.toLowerCase().indexOf(q)>=0)&&existing.indexOf(m.name)<0;
    });
  }
  function cvConfirmAddMembers(selected,level){
    selected=selected||[];
    if(selected.length===0){cvToast('请选择要添加的人员','warning');return;}
    var tagMap={'开发':'member-tag--dev','架构':'member-tag--arch','测试':'member-tag--qa','运维':'member-tag--ops','需求':'member-tag--pm','产品':'member-tag--pm'};
    var lvl=level==='admin'?'admin':'member';
    selected.forEach(function(p){
      CV_MEMBERS.push({name:p.name,email:p.email,roles:[{tag:tagMap[p.role]||'member-tag--dev',text:p.role}],status:'available',source:'直接添加',level:lvl,
        projects:cvProject?[cvProject]:CV_PROJECTS.map(function(pp){return pp.id;})});
    });
    cvRenderMembers();cvRenderMemberStats();cvCloseAddMemberModal();
    cvToast('已添加 '+selected.length+' 名协作人员为'+(lvl==='admin'?'管理员':'成员'),'success');
  }
  function cvDeleteMember(idx){
    if(!CV_MEMBERS[idx])return;
    if(CV_MEMBERS[idx].isMe){cvToast('不能移除自己','warning');return;}
    if(!cvCanRemoveMember(CV_MEMBERS[idx])){cvToast('没有权限移除该成员','warning');return;}
    var name=CV_MEMBERS[idx].name;
    CV_MEMBERS.splice(idx,1);cvRenderMembers();cvRenderMemberStats();
    cvToast('已移除：'+name,'info');
  }
  function cvLoadSavedTasks(){
    try{
      var tasks=JSON.parse(localStorage.getItem('build_tasks')||'[]');
      tasks.forEach(function(task){CV_TASKS.unshift(cvNormalizeTask(task));});
    }catch(e){}
  }

  var CV_THIRD_PARTY_MEMBERS=[
    {name:'钱涛',email:'qian***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
    {name:'宋宇',email:'song***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
    {name:'冯远',email:'feng***@kingdee.com',role:'架构',tag:'member-tag--arch',dept:'架构部'},
    {name:'许诺',email:'xu***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
    {name:'韩梅',email:'han***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
    {name:'罗静',email:'luo***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
    {name:'杨帆',email:'yang***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'},
    {name:'唐辉',email:'tang***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'},
    {name:'蒋雯',email:'jiang***@kingdee.com',role:'需求',tag:'member-tag--pm',dept:'产品部'},
    {name:'何欣',email:'he***@kingdee.com',role:'需求',tag:'member-tag--pm',dept:'产品部'},
    {name:'梁平',email:'liang***@kingdee.com',role:'产品',tag:'member-tag--pm',dept:'产品部'},
    {name:'范晨',email:'fan***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
    {name:'董睿',email:'dong***@kingdee.com',role:'架构',tag:'member-tag--arch',dept:'架构部'},
    {name:'贾旭',email:'jia***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
    {name:'武威',email:'wu***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'}
  ];

  /* ---------- 面板切换 ---------- */
  var cvInited=false, cvLastTab='tasks';
  window.cvCard=null; window.cvReviewIdx=0;
  var cvPendingTab, cvPendingProj;   /* 由上面的 URL 恢复逻辑先行赋值，故此处不带初始值 */
  function cvToast(msg,type){ toast(msg, type==='error'?'error':undefined); }
  function cvShowPanel(name){
    $$('#view-collab .cv-panel').forEach(function(p){ p.classList.toggle('active', p.id==='cv-'+name); });
    $$('#cvTabNav .tab-nav-item').forEach(function(t){
      t.classList.toggle('tab-nav-item--active', t.getAttribute('data-cvview')===name);
    });
    cvUpdateMoreTrigger(name);
  }
  function cvSwitchView(name){
    cvLastTab=(name==='chat'||name==='review-detail')?cvLastTab:name;
    cvShowPanel(name);
    if(name==='teams') renderExpertGrid();
    if(name==='experts') cvRenderExperts();
    if(name==='projects') cvRenderProjectsPanel();
    cvSyncUrl();
  }
  /* 执行中的任务在侧边栏项目下挂一条会话 */
  function cvAddSidebarConversation(title){
    var group=$('.sb-scroll .project-group');
    if(!group) return;
    var item=document.createElement('div');
    item.className='sub-item cv-running';
    item.innerHTML='<span class="dot blue"></span><span class="txt">'+xesc(title)+'</span>';
    item.addEventListener('click',function(){ showView('collab'); setNavActive('协作开发'); cvSwitchView('chat'); });
    var head=group.querySelector('.group-head');
    if(head&&head.nextSibling) group.insertBefore(item,head.nextSibling); else group.appendChild(item);
  }

  /* ---------- 专家管理：分组卡片 ---------- */
  var cvExpertKw='';
  function cvExpertGroups(){
    var kw=cvExpertKw.trim();
    var rows=EXPERTS.filter(function(e){
      if(!kw) return true;
      return (e.name+e.role+e.desc+(e.tags||[]).join()).indexOf(kw)>=0;
    });
    return [
      {title:'Lingee 内置',desc:'随产品一起维护，覆盖交付全流程与苍穹、前端等领域',list:rows.filter(function(e){return e.by==='Lingee 内置'})},
      {title:'我创建的',desc:'你自己建的专家，可随时改配置或删除',list:rows.filter(function(e){return e.mine})}
    ];
  }
  function cvTeamCountOf(id){
    return TEAMS.filter(function(t){ return t.members.indexOf(id)>=0 }).length;
  }
  function cvBuildExpertCard(e){
    var tags=(e.tags||[]).map(function(t){return '<span class="expert-skill">'+xesc(t)+'</span>'}).join('');
    var cmds=(e.cmds||[]).length, comps=(e.comp||[]).length;
    /* 「能承担哪些工作」比「有几种工作模式」更能决定选不选他，直接摆出来 */
    var mAll=e.modes||[], mShow=mAll.slice(0,3), mRest=mAll.length-mShow.length;
    var modeRow=mAll.length
      ? '<div class="expert-modes" title="可承担 '+xesc(mAll.join(' / '))+'"><span class="expert-modes-k">可承担</span>'
        +mShow.map(function(m){return '<span class="expert-mode">'+xesc(m)+'</span>'}).join('')
        +(mRest>0?'<span class="expert-mode expert-mode-more">+'+mRest+'</span>':'')+'</div>'
      : '';
    return '<div class="expert-card" data-cv-expert="'+e.id+'">'
      +'<button type="button" class="expert-chat-btn" data-cv-call="'+e.id+'" title="召唤这位专家">召唤</button>'
      +'<div class="expert-head"><img class="expert-av" src="'+xav(e.k)+'" alt="">'
      +'<div><div class="expert-name">'+xesc(e.name)
      +(e.ro?'<span class="expert-flag">只读</span>':'')
      +(e.visibility==='private'?'<span class="expert-flag">个人</span>':'')+'</div>'
      +'<div class="expert-role">'+xesc(e.role)+'</div></div></div>'
      +'<div class="expert-intro">'+xesc(e.desc)+'</div>'
      +'<div class="expert-skills">'+tags+'</div>'
      +modeRow
      +'<div class="expert-stats">'
      +'<div><div class="expert-stat-val">'+cvTeamCountOf(e.id)+'</div><div class="expert-stat-label">所在专家团</div></div>'
      +'<div><div class="expert-stat-val">'+comps+'</div><div class="expert-stat-label">能力项</div></div>'
      +'<div><div class="expert-stat-val">'+cmds+'</div><div class="expert-stat-label">触发词</div></div>'
      +'</div></div>';
  }

  /* ---------- 项目（与任务管理平级的独立页签，归属当前工作区） ---------- */
  function cvProjectTaskStats(pid){
    var tasks=CV_TASKS.filter(function(t){return t.project===pid;});
    var n=function(s){return tasks.filter(function(t){return t.status===s;}).length;};
    return {total:tasks.length,done:n('已完成'),doing:n('进行中'),review:n('待评审'),blocked:n('已失败')};
  }
  function cvProjectProgressHtml(done,total){
    if(!total) return '<span class="cv-proj-progress__none">暂无任务</span>';
    var pct=Math.round(done/total*100), r=7, circ=2*Math.PI*r;
    var tone=pct>=100?'#08a040':pct>50?'#4d89ff':'#b8b8b8';
    return '<span class="cv-proj-progress"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">'
      +'<circle cx="9" cy="9" r="'+r+'" fill="none" stroke="#ececec" stroke-width="2.5"/>'
      +'<circle cx="9" cy="9" r="'+r+'" fill="none" stroke="'+tone+'" stroke-width="2.5" stroke-dasharray="'+circ+'" stroke-dashoffset="'+(circ*(1-done/total))+'" stroke-linecap="round" transform="rotate(-90 9 9)"/>'
      +'</svg><span class="cv-proj-progress__text">'+done+'/'+total+'</span></span>';
  }
  function cvProjectOwners(){
    var set=[]; cvWorkspaceProjects().forEach(function(p){ if(p.owner && set.indexOf(p.owner)<0) set.push(p.owner); });
    return set;
  }
  /* 卡片上「状态」「负责人」就地改：点开小弹层直接选，不用进详情 */
  function cvToggleProjectField(field,id,el,ev){
    if(ev) ev.stopPropagation();
    var wrap=el.parentNode;
    var already=wrap.querySelector('.cv-proj-pop');
    $$('.cv-proj-pop').forEach(function(d){ d.remove(); });
    if(already) return; /* 再点一下同一个触发器，只收起 */
    var p=cvProjectById(id); if(!p) return;
    var opts = field==='status'
      ? CV_PROJECT_STATUS.map(function(s){ return {value:s.id,label:s.label,tone:s.tone}; })
      : cvProjectOwners().map(function(o){ return {value:o,label:o}; }).concat([{value:'',label:'无负责人'}]);
    var current = field==='status' ? p.status : p.owner;
    var dd=document.createElement('div'); dd.className='cv-proj-pop';
    opts.forEach(function(o){
      var item=document.createElement('div');
      item.className='cv-proj-pop-item'+(o.value===current?' cv-proj-pop-item--active':'');
      item.innerHTML=(o.tone?'<span class="cv-proj-pop-dot" style="background:'+o.tone+'"></span>':'')+xesc(o.label);
      item.addEventListener('click',function(e){
        e.stopPropagation();
        if(field==='status') p.status=o.value; else p.owner=o.value;
        dd.remove();
        cvRenderProjectsPanel();
      });
      dd.appendChild(item);
    });
    wrap.appendChild(dd);
  }
  document.addEventListener('click',function(){ $$('.cv-proj-pop').forEach(function(d){ d.remove(); }); });
  function cvPopulateProjectFilters(){
    var sf=$('#cvProjectStatusFilter');
    if(sf) sf.innerHTML='<option value="">全部状态</option>'+CV_PROJECT_STATUS.map(function(s){
      return '<option value="'+s.id+'"'+(cvProjectStatusF===s.id?' selected':'')+'>'+s.label+'</option>';
    }).join('');
    var of=$('#cvProjectOwnerFilter');
    if(of) of.innerHTML='<option value="">全部负责人</option>'+cvProjectOwners().map(function(o){
      return '<option value="'+xesc(o)+'"'+(cvProjectOwnerF===o?' selected':'')+'>'+xesc(o)+'</option>';
    }).join('')+'<option value="__none__"'+(cvProjectOwnerF==='__none__'?' selected':'')+'>无负责人</option>';
  }
  function cvFilteredProjects(){
    var q=cvProjectQuery.trim().toLowerCase();
    return cvWorkspaceProjects().filter(function(p){
      if(cvProjectStatusF && p.status!==cvProjectStatusF) return false;
      if(cvProjectOwnerF==='__none__' ? p.owner : (cvProjectOwnerF && p.owner!==cvProjectOwnerF)) return false;
      if(!q) return true;
      return (p.name+' '+(p.desc||'')+' '+(p.repo||'')).toLowerCase().indexOf(q)>=0;
    });
  }
  function cvSetProject(id){
    cvProject=id||'';
    cvRenderProjectsPanel();
    cvRenderTaskStats(); cvRenderTasks(); cvInjectCardActions();
    cvRenderReviewStats(); cvRenderReviews();
    cvRenderMemberStats(); cvRenderMembers();
    cvApplyFilters(); cvApplyReviewFilters();
    cvRenderTeamBind(); cvApplyConfigScope(); cvUpdateCounts();
    cvSyncUrl();
  }
  function cvUpdateCounts(){
    var tc=$('#cvTaskCount'); if(tc) tc.textContent=CV_TASKS.filter(cvInProject).length;
    var rc=$('#cvReviewCount'); if(rc) rc.textContent=CV_REVIEWS.filter(cvInProject).length;
  }
  function cvSyncUrl(){
    setUrlState('/collab?tab='+cvLastTab+(cvProject?'&proj='+cvProject:''));
  }
  /* ---------- 新建项目弹窗 ---------- */
  var CV_PROJECT_DOTS=['blue','orange','green'];
  function cvOpenNewProjectModal(){ _cvModalOpen('newproject'); }
  function cvCloseNewProjectModal(){ _cvModalClose('newproject'); }
  function cvConfirmNewProject(form){
    form=form||{};
    var name=(form.name||'').trim();
    if(!name){ toast('请输入项目名称','warning'); return; }
    var statusMeta=CV_PROJECT_STATUS.filter(function(s){return s.id===form.statusId;})[0]||CV_PROJECT_STATUS[0];
    var repo=(form.repo||'').trim();
    var id='p'+Date.now();
    CV_PROJECTS.push({
      id:id,name:name,dot:CV_PROJECT_DOTS[CV_PROJECTS.length%CV_PROJECT_DOTS.length],
      defaultTeam:null,workspace:cvWorkspace,
      desc:(form.desc||'').trim(),status:statusMeta.id,
      owner:form.owner||'',repo:repo||null,updated:'刚刚'
    });
    cvCloseNewProjectModal();
    cvSetProject(id);
    toast('已创建项目「'+name+'」','success');
  }
  if(cvProjectGrid) cvProjectGrid.addEventListener('click',function(e){
    if(e.target.closest('[data-cv-proj-add]')){ cvOpenNewProjectModal(); return; }
    var it=e.target.closest('[data-cv-proj]'); if(!it) return;
    cvSetProject(it.getAttribute('data-cv-proj'));
  });
  if(cvProjectSearchInput) cvProjectSearchInput.addEventListener('input',function(){
    cvProjectQuery=this.value; cvRenderProjectsPanel();
  });
  if(cvProjectStatusSel) cvProjectStatusSel.addEventListener('change',function(){
    cvProjectStatusF=this.value; cvRenderProjectsPanel();
  });
  if(cvProjectOwnerSel) cvProjectOwnerSel.addEventListener('change',function(){
    cvProjectOwnerF=this.value; cvRenderProjectsPanel();
  });
  var cvNewProjectBtn=$('#cvNewProjectBtn');
  if(cvNewProjectBtn) cvNewProjectBtn.addEventListener('click',function(){ cvOpenNewProjectModal(); });

  /* ---------- 工作区：项目归属的顶层容器，一次只能激活一个 ---------- */
  function cvWorkspaceName(id){
    var w=CV_WORKSPACES.filter(function(w){return w.id===id})[0];
    return w?w.name:'工作区';
  }
  function cvRenderWsMenu(){
    var trigger=$('#cvWsLabel'); if(trigger) trigger.textContent=cvWorkspaceName(cvWorkspace);
    var dot=$('#cvWsDot'); if(dot) dot.textContent=(CV_WORKSPACES.filter(function(w){return w.id===cvWorkspace})[0]||{}).short||'';
    var menu=$('#cvWsMenu'); if(!menu) return;
    menu.innerHTML=CV_WORKSPACES.map(function(w){
      return '<div class="cv-proj-item'+(w.id===cvWorkspace?' checked':'')+'" data-cv-ws="'+w.id+'">'
        +'<span class="cv-proj-n">'+xesc(w.name)+'</span>'
        +'<svg class="ic ic-sm cv-proj-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>';
    }).join('')
      +'<div class="menu-divider"></div>'
      +'<div class="cv-proj-item cv-proj-add" data-cv-ws-add>'
      +'<svg class="ic ic-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>'
      +'<span class="cv-proj-n">新建工作区</span></div>';
  }
  function cvSetWorkspace(id){
    if(id===cvWorkspace) return;
    cvWorkspace=id;
    cvRenderWsMenu();
    /* 切换工作区后，若当前选中的项目不属于新工作区，回到「全部项目」聚合视角 */
    if(cvProject && !cvWorkspaceProjects().some(function(p){return p.id===cvProject})){
      cvSetProject('');
    }else{
      cvRenderProjectsPanel();
    }
  }
  var cvWsBtn=$('#cvWsBtn');
  if(cvWsBtn) cvWsBtn.addEventListener('click',function(e){
    e.stopPropagation();
    $('#cvWsSwitch').classList.toggle('open');
  });
  var cvWsMenu=$('#cvWsMenu');
  if(cvWsMenu) cvWsMenu.addEventListener('click',function(e){
    if(e.target.closest('[data-cv-ws-add]')){ $('#cvWsSwitch').classList.remove('open'); toast('新建工作区（示意）'); return; }
    var it=e.target.closest('[data-cv-ws]'); if(!it) return;
    $('#cvWsSwitch').classList.remove('open');
    cvSetWorkspace(it.getAttribute('data-cv-ws'));
  });

  /* ---------- 「管理」收纳菜单：协作人员/专家/专家团/设置，选中态跟随当前页签，不做持久化 ---------- */
  var CV_MORE_VIEWS={members:'协作人员管理',experts:'专家管理',teams:'专家团管理',config:'设置'};
  function cvUpdateMoreTrigger(name){
    var isMore=!!CV_MORE_VIEWS[name];
    var label=$('#cvMoreLabel'); if(label) label.textContent=isMore?CV_MORE_VIEWS[name]:'管理';
    var btn=$('#cvMoreBtn'); if(btn) btn.classList.toggle('tab-nav-item--active',isMore);
    $$('#cvMoreMenu .cv-proj-item').forEach(function(it){
      it.classList.toggle('checked',isMore&&it.getAttribute('data-cvview')===name);
    });
  }
  var cvMoreBtn=$('#cvMoreBtn');
  if(cvMoreBtn) cvMoreBtn.addEventListener('click',function(e){
    e.stopPropagation();
    $('#cvMoreSwitch').classList.toggle('open');
  });
  var cvMoreMenu=$('#cvMoreMenu');
  if(cvMoreMenu) cvMoreMenu.addEventListener('click',function(e){
    var it=e.target.closest('[data-cvview]'); if(!it) return;
    $('#cvMoreSwitch').classList.remove('open');
    cvSwitchView(it.getAttribute('data-cvview'));
  });
  document.addEventListener('click',function(){
    $$('#view-collab .cv-proj.open').forEach(function(el){el.classList.remove('open')});
  });

  /* ---------- 专家团：项目默认路由绑定 ---------- */
  function cvRenderTeamBind(){
    var bar=$('#cvTeamBind'); if(!bar) return;
    bar.classList.toggle('hidden',!cvProject);
    if(!cvProject) return;
    var proj=cvProjectById(cvProject); if(!proj) return;
    var nameEl=$('#cvBindProjName'); if(nameEl) nameEl.textContent=proj.name;
    var team=proj.defaultTeam?TEAMS.filter(function(t){return t.id===proj.defaultTeam})[0]:null;
    var lb=$('#cvBindTeamLabel'); if(lb) lb.textContent=team?team.name:'未指定';
    var menu=$('#cvBindMenu');
    if(menu) menu.innerHTML=[{id:'',name:'不绑定',desc:'大任务改为人工确认后路由'}]
      .concat(TEAMS.map(function(t){return {id:t.id,name:t.name,desc:t.members.length+' 位专家'}}))
      .map(function(t){
        return '<div class="cv-proj-item'+(t.id===(proj.defaultTeam||'')?' checked':'')+'" data-cv-bind="'+t.id+'">'
          +'<span class="cv-proj-n">'+xesc(t.name)+'<em>'+xesc(t.desc)+'</em></span>'
          +'<svg class="ic ic-sm cv-proj-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>';
      }).join('');
  }
  var cvBindBtn=$('#cvBindBtn');
  if(cvBindBtn) cvBindBtn.addEventListener('click',function(e){
    e.stopPropagation();
    $('#cvBindSwitch').classList.toggle('open');
  });
  var cvBindMenu=$('#cvBindMenu');
  if(cvBindMenu) cvBindMenu.addEventListener('click',function(e){
    var it=e.target.closest('[data-cv-bind]'); if(!it) return;
    var proj=cvProjectById(cvProject); if(!proj) return;
    proj.defaultTeam=it.getAttribute('data-cv-bind')||null;
    $('#cvBindSwitch').classList.remove('open');
    cvRenderTeamBind();
    toast(proj.defaultTeam?('已将「'+proj.name+'」的大任务默认路由到 '+$('#cvBindTeamLabel').textContent):'已取消默认路由，大任务改为人工确认');
  });
  document.addEventListener('click',function(){
    $$('#view-collab .cv-proj.open').forEach(function(el){el.classList.remove('open')});
  });

  /* ---------- 设置：全局默认 / 项目覆盖 ---------- */
  var cvConfigValues={};               /* {'global'|项目id:{开关 key:是否开启}} */
  function cvConfigScopeKey(card){
    /* 全局设置项永远读写全局；项目可覆盖项在「项目覆盖」时读写本项目 */
    if(card.getAttribute('data-cv-level')==='global') return 'global';
    return (cvProject && cvConfigOverridden(card.getAttribute('data-cv-config'))) ? cvProject : 'global';
  }
  function cvCaptureConfigDefaults(){
    if(cvConfigValues.global) return;
    var g={};
    $$('#cv-config [data-cv-toggle]').forEach(function(t){ g[t.getAttribute('data-cv-toggle')]=t.classList.contains('on'); });
    cvConfigValues.global=g;
  }
  function cvApplyConfigValues(){
    $$('#cv-config .config-card').forEach(function(card){
      var scope=cvConfigScopeKey(card), store=cvConfigValues[scope]||{};
      $$('[data-cv-toggle]',card).forEach(function(t){
        var k=t.getAttribute('data-cv-toggle');
        var v=(k in store)?store[k]:cvConfigValues.global[k];
        t.classList.toggle('on',!!v);
      });
    });
  }
  function cvConfigOverridden(key){
    return !!(cvProject && cvConfigOverride[cvProject] && cvConfigOverride[cvProject][key]);
  }
  function cvApplyConfigScope(){
    $$('#cv-config .config-card').forEach(function(card){
      var key=card.getAttribute('data-cv-config');
      var level=card.getAttribute('data-cv-level');
      var chip=card.querySelector('[data-cv-scope-chip]');
      var locked;
      if(!cvProject){
        locked=false;
        if(chip){ chip.textContent=level==='global'?'全局设置':'全局默认'; chip.className='cv-scope-chip'; }
      }else if(level==='global'){
        locked=true;
        if(chip){ chip.textContent='全局设置 · 项目不可改'; chip.className='cv-scope-chip'; }
      }else{
        locked=!cvConfigOverridden(key);
        if(chip){
          chip.textContent=locked?'跟随全局':'项目覆盖';
          chip.className='cv-scope-chip cv-scope-chip--btn'+(locked?'':' cv-scope-chip--on');
          chip.setAttribute('role','button');
        }
      }
      card.classList.toggle('cv-card-locked',locked);
    });
    cvApplyConfigValues();
  }
  var cvConfigPanel=$('#cv-config');
  if(cvConfigPanel) cvConfigPanel.addEventListener('click',function(e){
    var tg=e.target.closest('[data-cv-toggle]');
    if(tg){
      var tcard=tg.closest('.config-card');
      if(tcard.classList.contains('cv-card-locked')) return;
      var scope=cvConfigScopeKey(tcard);
      if(!cvConfigValues[scope]) cvConfigValues[scope]={};
      cvConfigValues[scope][tg.getAttribute('data-cv-toggle')]=!tg.classList.contains('on');
      cvApplyConfigValues();
      return;
    }
    var chip=e.target.closest('.cv-scope-chip--btn'); if(!chip||!cvProject) return;
    var card=chip.closest('.config-card'), key=card.getAttribute('data-cv-config');
    if(!cvConfigOverride[cvProject]) cvConfigOverride[cvProject]={};
    var on=!cvConfigOverridden(key);
    cvConfigOverride[cvProject][key]=on;
    if(on && !cvConfigValues[cvProject]){
      cvConfigValues[cvProject]={};      /* 首次覆盖时继承一份全局值再改 */
      Object.keys(cvConfigValues.global).forEach(function(k){ cvConfigValues[cvProject][k]=cvConfigValues.global[k]; });
    }
    cvApplyConfigScope();
    toast(on?('「'+cvProjectName(cvProject)+'」已改为项目覆盖，可单独调整'):'已恢复跟随全局设置');
  });

  /* ---------- 初始化 ---------- */
  function cvInit(){
    if(cvInited) return;
    cvInited=true;
    cvLoadSavedTasks();
    cvRenderTaskStats(); cvRenderTasks();
    cvRenderReviewStats(); cvRenderReviews();
    cvRenderMemberStats(); cvRenderMembers();
    cvInjectCardActions();
    cvCaptureConfigDefaults();
    cvRenderWsMenu(); cvRenderProjectsPanel(); cvRenderTeamBind(); cvApplyConfigScope(); cvUpdateCounts();
    cvUpdateMoreTrigger(cvLastTab);
  }
  var cvExpertSearch=$('#cvExpertSearch');
  if(cvExpertSearch) cvExpertSearch.addEventListener('input',function(){ cvExpertKw=this.value; cvRenderExperts(); });
  var cvNewExpertBtn=$('#cvNewExpertBtn');
  if(cvNewExpertBtn) cvNewExpertBtn.addEventListener('click',function(){ openExpertEditor(null) });
  var cvExpertSections=$('#cvExpertSections');
  if(cvExpertSections) cvExpertSections.addEventListener('click',function(e){
    var call=e.target.closest('[data-cv-call]');
    if(call){ summon('expert',call.getAttribute('data-cv-call')); return; }
    if(e.target.closest('[data-cv-new-expert]')){ openExpertEditor(null); return; }
    var card=e.target.closest('[data-cv-expert]');
    if(card) openExpertModal(card.getAttribute('data-cv-expert'));
  });


  /* URL 直接进入协作开发时，等模块加载完再渲染 */
  if(cvPendingTab){
    cvInit();
    if(cvPendingProj) cvSetProject(cvPendingProj);
    cvSwitchView(cvPendingTab);
    cvPendingTab=null; cvPendingProj=null;
  }

  /* 内联事件用到的函数挂到 window */
  window.cvSwitchView=cvSwitchView;
  window.cvSwitchFilter=cvSwitchFilter;
  window.cvApplyFilters=cvApplyFilters;
  window.cvApplyReviewFilters=cvApplyReviewFilters;
  window.cvClickStat=cvClickStat;
  window.cvClickReviewStat=cvClickReviewStat;
  window.cvOpenSyncModal=cvOpenSyncModal;
  window.cvCloseSyncModal=cvCloseSyncModal;
  window.cvSaveSyncTask=cvSaveSyncTask;
  window.cvStartSyncTask=cvStartSyncTask;
  window.cvOpenTaskModal=cvOpenTaskModal;
  window.cvCloseTaskModal=cvCloseTaskModal;
  window.cvConfirmExec=cvConfirmExec;
  window.cvConfirmTransfer=cvConfirmTransfer;
  window.cvConfirmTwist=cvConfirmTwist;
  window.cvConfirmReview=cvConfirmReview;
  window.cvReviewPass=cvReviewPass;
  window.cvReviewReject=cvReviewReject;
  window.cvOpenReviewDetail=cvOpenReviewDetail;
  window.cvSwitchArtifact=cvSwitchArtifact;
  window.cvSubmitReview=cvSubmitReview;
  window.cvSendChatMessage=cvSendChatMessage;
  window.cvOpenConversation=cvOpenConversation;
  window.cvOpenAddMemberModal=cvOpenAddMemberModal;
  window.cvCloseAddMemberModal=cvCloseAddMemberModal;
  window.cvConfirmAddMembers=cvConfirmAddMembers;
  window.cvDeleteMember=cvDeleteMember;
  window.cvToggleMemberLevelMenu=cvToggleMemberLevelMenu;
  window.cvOpenNewProjectModal=cvOpenNewProjectModal;
  window.cvCloseNewProjectModal=cvCloseNewProjectModal;
  window.cvConfirmNewProject=cvConfirmNewProject;
  window.cvToggleProjectField=cvToggleProjectField;

  /* 未登录时清理 URL，确保页面仅显示登录页 */
  if(!_authedUser) history.replaceState(null,'','/');

  /* ---------- React 集成桥 ----------
     应用开发/技能开发/智能体开发三个卡片网格页已迁到 src/views/*View.jsx（见
     docs/react-migration-plan.md Phase 1）。它们复用这里现成的「打开会话预览」
     「从卡片网格发起新建」「toast」逻辑，而不是各写一份，避免两边行为跑偏。
     showView 仍是唯一的视图切换入口，React 侧不直接操作 .view 的 hidden class。 */
  window.__lingeeBridge={
    toast:toast,
    showView:showView,
    setNavActive:setNavActive,
    openAppCardChat:openAppCardChat,
    startNewTaskWithMode:startNewTaskWithMode,
    /* ---------- 协作开发弹窗（Phase 2 antd 化） ----------
       src/components/collab/CollabModals.jsx 通过这里读取"当前该开哪个弹窗"
       和弹窗要展示的数据，并把表单结果交回这些业务函数处理——保存到哪个数组、
       触发什么 toast、联动卡片状态，判断逻辑都还在本文件里，不在 React 侧
       重新发明一遍。 */
    collab:{
      subscribe:_cvModalSubscribe,
      getOpenModal:function(){ return _cvModalState.name; },
      closeSync:cvCloseSyncModal,
      saveSyncTask:cvSaveSyncTask,
      startSyncTask:cvStartSyncTask,
      closeTaskModal:function(name){ _cvModalClose(name); },
      getMembers:cvGetMembersForModal,
      getReviewCandidates:cvGetReviewCandidates,
      getWorkflowState:cvGetWorkflowState,
      getDefaultArtifacts:cvGetDefaultArtifacts,
      confirmExec:cvConfirmExec,
      confirmTransfer:cvConfirmTransfer,
      confirmTwist:cvConfirmTwist,
      confirmReview:cvConfirmReview,
      closeAddMember:cvCloseAddMemberModal,
      findThirdPartyMembers:cvFindThirdPartyMembers,
      confirmAddMembers:cvConfirmAddMembers,
      closeNewProject:cvCloseNewProjectModal,
      getProjectStatusOptions:function(){ return CV_PROJECT_STATUS.map(function(s){return{id:s.id,label:s.label};}); },
      getProjectOwnerOptions:cvProjectOwners,
      confirmNewProject:cvConfirmNewProject
    },
    /* ---------- 快捷键面板（Phase 2b antd 化） ---------- */
    shortcut:{
      subscribe:_shortcutBridge.subscribe,
      getOpenModal:_shortcutBridge.getOpenModal,
      close:closeShortcut
    },
    /* ---------- 新建应用弹窗（Phase 2b antd 化） ---------- */
    newApp:{
      subscribe:_newAppBridge.subscribe,
      getOpenModal:_newAppBridge.getOpenModal,
      close:closeNewAppModal,
      getAppOptions:getFullAppOptions,
      confirm:confirmNewApp
    },
    /* ---------- 专家详情弹窗（Phase 2c antd 化） ---------- */
    expert:{
      subscribe:_expertBridge.subscribe,
      getOpenModal:_expertBridge.getOpenModal,
      close:closeExpertModal,
      getExpertId:function(){ return _expertViewingId; },
      getExpert:function(id){ return _sanitizeExpert(EX[id]); },
      getAvatar:xav,
      callExpert:function(id,cmd){ closeExpertModal(); summon('expert',id,cmd); },
      editExpert:function(id){ closeExpertModal(); openExpertEditor(id); },
      deleteExpert:deleteMyExpert,
      viewExpert:openExpertModal
    },
    /* ---------- 创建/编辑专家弹窗（Phase 2c antd 化） ---------- */
    expertEdit:{
      subscribe:_expertEditBridge.subscribe,
      getOpenModal:_expertEditBridge.getOpenModal,
      close:closeExpertEditor,
      getEditingId:function(){ return _expertEditId; },
      getInitialData:_getExpertEditInitialData,
      getAvatars:function(){ return AV_KEYS; },
      getWorkModes:function(){ return WORK_MODES; },
      getAvatar:xav,
      save:_saveExpertFromReact,
      delete:deleteMyExpert,
      startByChat:startExpertByChat
    },
    /* ---------- 专家团配置弹窗（Phase 2c antd 化） ---------- */
    team:{
      subscribe:_teamBridge.subscribe,
      getOpenModal:_teamBridge.getOpenModal,
      getVersion:_teamBridge.getVersion,
      close:closeTeamModal,
      getEditingId:function(){ return _teamEditingId; },
      getInitialData:_getTeamInitialData,
      getDraft:_getTeamDraft,
      getFlow:teamFlow,
      getCoverage:teamCoverage,
      getWarnings:teamLint,
      getActiveGates:activeGates,
      hasGate:hasGate,
      toggleGate:toggleGate,
      save:_saveTeamFromReact,
      delete:_deleteTeam,
      callTeam:function(id){ closeTeamModal(); summon('team',id); },
      callTeamWithCmd:function(id,cmd){ closeTeamModal(); summon('team',id,cmd); },
      getExpert:function(id){ return _sanitizeExpert(EX[id]); },
      getAvatar:xav,
      openMemberPicker:openMemberModal,
      setLead:_setTeamLead,
      removeMember:_removeTeamMember,
      addCmd:_addTeamCmd,
      removeCmd:_removeTeamCmd,
      updateCmd:_updateTeamCmd
    },
    /* ---------- 添加成员弹窗（Phase 2c antd 化） ---------- */
    member:{
      subscribe:_memberBridge.subscribe,
      getOpenModal:_memberBridge.getOpenModal,
      close:closeMemberModal,
      getMembers:_getMemberList,
      toggleMember:_toggleMember,
      getAvatar:xav
    },
    /* ---------- ERP 环境弹窗（Phase 2d antd 化） ---------- */
    env:{
      subscribe:_envBridge.subscribe,
      getOpenModal:_envBridge.getOpenModal,
      getVersion:_envBridge.getVersion,
      touch:_envTouch,
      close:closeEnvModal,
      getMode:function(){ return envMode; },
      getInitialData:_getEnvInitialData,
      getDataCenters:function(){ return ENV_DATA_CENTERS; },
      save:_saveEnvFromReact,
      testConnection:_testEnvConnection,
      toggleNormalAuth:_envToggleNormalAuth,
      disconnect:_envDisconnectAction,
      reauth:_envReauth,
      getList:_envGetList,
      getListVersion:function(){ return _envListVersion; },
      deleteItem:_envDeleteItem,
      setDefault:_envSetDefault,
      testItem:_envTestConnection,
      copyUrl:_envCopyUrl,
      openModal:openEnvModal
    },
    envAuthorize:{
      subscribe:_envAuthorizeBridge.subscribe,
      getOpenModal:_envAuthorizeBridge.getOpenModal,
      close:closeAuthorize,
      retry:_retryAuthorize
    },
    consent:{
      subscribe:_consentBridge.subscribe,
      getOpenModal:_consentBridge.getOpenModal,
      close:function(){ _consentBridge.close('consent'); },
      getStep:_getConsentStep,
      getDataCenters:function(){ return ENV_DATA_CENTERS; },
      getScopeList:function(){ return ERP_API_SCOPES; },
      login:_consentLogin,
      allow:_consentAllow,
      deny:_consentDeny,
      switchAccount:_consentSwitchAccount
    },
    envDisconnect:{
      subscribe:_envDisconnectBridge.subscribe,
      getOpenModal:_envDisconnectBridge.getOpenModal,
      close:closeDisconnect,
      getEnvName:function(){ return envDisconnectName; },
      confirm:_confirmDisconnect
    },
    envAuthConfirm:{
      subscribe:_envAuthConfirmBridge.subscribe,
      getOpenModal:_envAuthConfirmBridge.getOpenModal,
      close:_closeAuthConfirm,
      confirm:_confirmAuthConfirm
    },
    /* ---------- composer + chat（Phase 3 数据驱动） ---------- */
    composer:{
      send:function(text){
        if(!text||!text.trim()) return;
        var t=text.trim();
        /* 模式检查 */
        var modeEl=$('.mode-item.checked');
        var currentMode=modeEl?modeEl.getAttribute('data-val'):'';
        /* 自动匹配专家 */
        if(!pickValid()){
          var am=autoMatch(t);
          if(am){ activePick=am; renderExpertChips(); }
        }
        /* 切到 chat 视图 */
        showView('chat');
        /* 添加用户消息 */
        CHAT_MESSAGES.push({id:Date.now(),type:'user',text:t});
        /* 添加助手消息 + 模拟响应 */
        _simulateResponse();
        _chatTouch();
        /* 清空输入（React 侧处理） */
        if(input){ input.innerHTML=''; refreshSend(); }
        if(chatInput){ chatInput.innerHTML=''; }
        /* 聚焦 chat 输入 */
        if(chatInput) setTimeout(function(){chatInput.focus();},100);
      },
      getMode:function(){
        var modeEl=$('.mode-item.checked');
        return modeEl?modeEl.getAttribute('data-val'):'';
      },
      setMode:function(mode){ applyMode(mode,true); },
      getExpert:function(){ return activePick; },
      clearExpert:function(){ clearPick(); renderExpertChips(); },
      openFilePicker:openFilePicker,
      getModes:function(){
        return ['苍穹应用','通用应用','业务组件','技能开发','智能体开发','原型探索'];
      }
    },
    chat:{
      subscribe:function(fn){ _chatListeners.push(fn); return function(){ var i=_chatListeners.indexOf(fn); if(i>=0)_chatListeners.splice(i,1); }; },
      getMessages:function(){ return CHAT_MESSAGES; },
      getVersion:function(){ return _chatVersion; },
      touch:_chatTouch,
      clear:function(){ CHAT_MESSAGES=[]; _chatTouch(); },
      getTitle:function(){ return $('#chatTitle')?$('#chatTitle').textContent:''; },
      setTitle:function(t){ if($('#chatTitle')) $('#chatTitle').textContent=t; }
    },
    /* ---------- 协作开发（Phase 3 数据暴露） ---------- */
    collab:{
      getTasks:function(){ return (typeof CV_TASKS!=='undefined')?CV_TASKS:[]; },
      getReviews:function(){ return (typeof CV_REVIEWS!=='undefined')?CV_REVIEWS:[]; },
      getMembers:function(){ return (typeof CV_MEMBERS!=='undefined')?CV_MEMBERS:[]; },
      getProjects:function(){ return (typeof CV_PROJECTS!=='undefined')?CV_PROJECTS:[]; },
      getExperts:function(){ return (typeof EXPERTS!=='undefined')?EXPERTS.map(function(e){return{id:e.id,name:e.name,role:e.role,by:e.by,desc:e.desc,tags:e.tags,modes:e.modes,k:e.k,mine:e.mine,ro:e.ro};}):[]; },
      getTeams:function(){ return (typeof TEAMS!=='undefined')?TEAMS.map(function(t){return{id:t.id,name:t.name,by:t.by,desc:t.desc,preset:t.preset,members:(t.members||[]).map(function(m){return EXPERTS.find(function(e){return e.id===m;})||{id:m};}).filter(Boolean),domains:t.domains||[]};}):[]; },
      openTaskModal:function(){ if(typeof _cvModalOpen==='function') _cvModalOpen('sync'); },
      openTeamModal:function(id){ if(typeof openTeamModal==='function') openTeamModal(id); },
      openExpertEditor:function(id){ if(typeof openExpertEditor==='function') openExpertEditor(id); },
      openExpertModal:function(id){ if(typeof openExpertModal==='function') openExpertModal(id); },
      summon:function(kind,id){ if(typeof summon==='function') summon(kind,id); }
    }
  };

})();
