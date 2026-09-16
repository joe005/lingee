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

  /* 以下函数已迁到 React/stores，保留 no-op 桩避免 bridge 引用报错 */
  function saveTeams(){}
  function rebuildExperts(){}
  function deleteMyExpert(id){ expertStore.deleteExpert(id); }
  function summon(kind,id,phrase){ /* moved to React */ }
  function startExpertByChat(){ /* moved to React */ }
  function startNewTaskWithMode(mode){ /* moved to React */ }
  function openAppCardChat(name){ /* moved to React */ }
  function resetPickForNewSession(){ /* moved to React */ }
  function applyModeSilent(mode){ /* moved to React */ }

  /* bridge 仍需的状态变量 */
  var _expertViewingId=null;
  var _expertEditId=null;
  var _teamEditingId=null;
  var teamDraft=null;
  var xeDraft=null, xeEditingId=null;

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
  var navItems=$$('.sb-scroll .nav-item');
  var navByName={};
  navItems.forEach(function(n){ navByName[n.textContent.trim()]=n; });

  function setNavActive(name){
    navItems.forEach(function(n){ n.classList.toggle('active', n.textContent.trim()===name); });
  }
  function applyMode(mode){ /* moved to React */ }
  /* mode items click 已迁到 React NewTaskView */

  /* ---------- view switching ---------- */
  var viewReact=$('#react-view-root');
  var REACT_VIEWS=['apps','skills','agents','design','home','newtask','chat','collab','settings'];
  function setUrlState(path,notifyReactRouter){
    try{history.replaceState(null,'',path);localStorage.setItem('lingeeUrlState',path)}catch(e){}
    if(notifyReactRouter){ try{ window.dispatchEvent(new PopStateEvent('popstate')); }catch(e){} }
  }
  function showView(which){
    if(viewReact) viewReact.classList.remove('hidden');
    $('.sidebar').classList.toggle('hidden', which==='design');
    closeAll(null);
    setUrlState('/'+which,true);
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
      if(name==='应用开发'||name==='苍穹应用') showView('apps');
      else if(name==='技能开发') showView('skills');
      else if(name==='智能体开发') showView('agents');
      else if(name==='协作开发') showView('collab');
      else if(name==='新会话') showView('newtask');
    });
  });

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
  var BUILTIN_EXPERTS=EXPERTS;
  var MY_EXPERTS=[];                 /* 我自己创建的专家，落 localStorage */
  var EX={};
  rebuildExperts();
  /* ---------- 能力项字典 ----------
     定义文件里能力项是机器标识（architecture.system-design · principal），
     直接摆到界面上没人看得懂。这里翻成中文名 + 等级，字典没覆盖的回退显示原串。 */
  /* ---------- 开工前需要的输入 ----------
     不再单独维护字段：需要什么输入，直接写进触发词的 [占位符] 里。
     发出去时占位符没被替换，就在会话里追问，而不是让专家拿着空输入硬跑。 */
  function askFor(name){ return ASK[name]||ASK_FALLBACK; }
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
  /* ---------- 编排推导：成员 → 任务 DAG ----------
     不再有交付强度这个旋钮：团里有谁，流程里就有哪一步。
     实现环节始终保留——没人能领时显式标红，这是要暴露的问题，不是可以省掉的步骤。 */
  /* ---------- 人工审核确认节点 ----------
     挂在某个流程步骤之后：这一步产出后编排暂停，等人点过才继续。
     只存步骤 id，成员变动导致步骤消失时自动失效，不需要迁移数据。 */
  /* ---------- 专家库视图 ---------- */
  var expertTab='team', expertKw='';
  var expertGrid=$('#expertGrid');
  /* cvRenderExperts 已迁到 React CollabView，保留 no-op 避免调用处报错 */
  function cvRenderExperts(){}
  function renderExpertGrid(){} /* moved to React */
  /* expert grid/search/tabs 事件已迁到 React CollabView */
  /* 发出去的话里还留着没填的 [占位符] —— 专家先问清楚再开工。
     一次把缺的都问完，别挤牙膏式来回问。 */
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
  /* ---------- 创建 / 编辑我的专家 ---------- */
  /* 两条路：手填这张表单，或者一句话交给 expert-manager 在对话里建（同 WorkBuddy） */
  var EXPERT_MANAGER={id:'expert-manager',
    ic:'<path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.2"/><path d="M18 6v6M15 9h6"/>'};
  var ONE_LINE_PROMPT='帮我创建一个 XXX 专家，擅长 XXXXX。我的经验是：[请补充你的行业背景、相关经验]';
  var forcedBuilder=null;
  /* ---------- 创建/编辑专家弹窗（Phase 2c antd 化） ----------
     React 侧（ExpertModals.jsx）自己管理表单状态，打开时从 bridge.getInitialData()
     读初始数据，保存时调 bridge.save(draft)。xeDraft/xeEditingId 仍在本文件维护
     供 bridge 方法读写，但 DOM 操作和事件监听全部删除。 */
  /* ---------- 专家团配置弹窗 ---------- */
  /* ---------- 专家团配置弹窗（Phase 2c antd 化） ----------
     React 侧（ExpertModals.jsx）通过 bridge 读写 teamDraft，每次修改后
     调 _teamBridge.touch() 触发 React 重渲染。计算函数（teamFlow/
     teamCoverage/teamLint）保持不变，React 直接调 bridge.getFlow 等。 */
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
  /* expert picker + mode click + resetPick 已迁到 React */

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
  var cvProject='';                    /* 空串 = 全部项目（个人视角的聚合视图） */
  var cvConfigOverride={};             /* {项目id:{配置卡 key:是否项目覆盖}} */
  function cvWorkspaceProjects(){
    return CV_PROJECTS.filter(function(p){ return p.workspace===cvWorkspace; });
  }
  function cvInProject(row){
    if(!cvProject) return true;
    if(row.projects) return row.projects==='*'||row.projects.indexOf(cvProject)>=0;
    return row.project===cvProject;
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
  function cvInjectCardActions(){} /* stub: moved to React */

  /* ============ VIEW SWITCHING ============ */
  function cvSwitchFilter(btn){
    var group=btn.closest('.filter-group');if(group){group.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('filter-btn--active');});}
    btn.classList.add('filter-btn--active');
    if(btn.closest('#cv-review')){cvApplyReviewFilters();}else{cvApplyFilters();}
  }
  function cvApplyFilters(){} /* stub: moved to React */
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
  function cvApplyReviewFilters(){} /* stub: moved to React */

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
  function cvOpenReviewDetail(){} /* stub: moved to React */
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
  function cvOpenConversation(){} /* stub: moved to React */

  
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
  function cvLoadSavedTasks(){} /* stub: moved to React */

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
  function cvSwitchView(){} /* stub: moved to React */
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
  function cvSetProject(){} /* stub: moved to React */
  function cvUpdateCounts(){} /* stub: moved to React */
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
  function cvRenderWsMenu(){} /* stub: moved to React */
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
  function cvUpdateMoreTrigger(){} /* stub: moved to React */
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
  function cvRenderTeamBind(){} /* stub: moved to React */
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
  function cvCaptureConfigDefaults(){} /* stub: moved to React */
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
  function cvApplyConfigScope(){} /* stub: moved to React */
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
  function cvInit(){} /* moved to React CollabView */
  /* expert search/new expert btn 事件已迁到 React CollabView */


  /* URL 直接进入协作开发 — React 路由处理 */
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
    toast:toastFn,
    showView:showView,
    setNavActive:setNavActive,
    openAppCardChat:function(){},
    startNewTaskWithMode:function(){},
    /* 协作开发弹窗 — CV modal 函数仍在 main.js */
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
      confirmNewProject:cvConfirmNewProject,
      getTasks:function(){ return CV_TASKS; },
      getReviews:function(){ return CV_REVIEWS; },
      getMembers:function(){ return CV_MEMBERS; },
      getProjects:function(){ return CV_PROJECTS; },
      getExperts:function(){ return expertStore.getExperts().map(expertStore.sanitizeExpert); },
      getTeams:function(){ return expertStore.getTeams(); },
      openTaskModal:function(){ _cvModalOpen('sync'); },
      openTeamModal:function(id){ modalStore.openModal('team','team-config'); _teamEditingId=id||null; },
      openExpertEditor:function(id){ modalStore.openModal('expertEdit','expert-edit'); _expertEditId=id||null; },
      openExpertModal:function(id){ _expertViewingId=id; modalStore.openModal('expert','expert-detail'); },
      summon:function(){}
    },
    /* 快捷键 + 新建应用 — 仍用 IIFE bridge */
    shortcut:{
      subscribe:_shortcutBridge.subscribe,
      getOpenModal:_shortcutBridge.getOpenModal,
      close:closeShortcut
    },
    newApp:{
      subscribe:_newAppBridge.subscribe,
      getOpenModal:_newAppBridge.getOpenModal,
      close:closeNewAppModal,
      getAppOptions:getFullAppOptions,
      confirm:confirmNewApp
    },
    /* 专家/专家团/成员 — 转发到 expert-store + modal-store */
    expert:{
      subscribe:function(fn){ return modalStore.subscribe('expert',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('expert'); },
      close:function(){ modalStore.closeModal('expert'); _expertViewingId=null; },
      getExpertId:function(){ return _expertViewingId; },
      getExpert:function(id){ return expertStore.sanitizeExpert(expertStore.getEx()[id]); },
      getAvatar:xav,
      callExpert:function(id,cmd){ modalStore.closeModal('expert'); },
      editExpert:function(id){ modalStore.closeModal('expert'); _expertEditId=id; modalStore.openModal('expertEdit','expert-edit'); },
      deleteExpert:expertStore.deleteExpert,
      viewExpert:function(id){ _expertViewingId=id; modalStore.openModal('expert','expert-detail'); }
    },
    expertEdit:{
      subscribe:function(fn){ return modalStore.subscribe('expertEdit',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('expertEdit'); },
      close:function(){ modalStore.closeModal('expertEdit'); },
      getEditingId:function(){ return _expertEditId; },
      getInitialData:function(){
        var e=_expertEditId?expertStore.getEx()[_expertEditId]:null;
        var editing=(e&&e.mine)?_expertEditId:null;
        var d=editing?{k:e.k,name:e.name,role:e.role,desc:e.desc,visibility:e.visibility==='private'?'private':'workspace',tags:e.tags.slice(),modes:e.modes.slice(),comp:e.comp.slice(),cmds:e.cmds.length?e.cmds.map(function(c){return c.slice()}):[['','']]}:blankExpert();
        return {draft:d,editingId:editing,title:editing?'编辑专家':'创建专家'};
      },
      getAvatars:function(){ return AV_KEYS; },
      getWorkModes:function(){ return WORK_MODES; },
      getAvatar:xav,
      save:function(d){
        if(!d.name){ toastFn('请填写专家名称','warning'); return; }
        if(!d.role){ toastFn('请填写职称','warning'); return; }
        if(!d.modes||!d.modes.length){ toastFn('至少勾选一项可承担的工作','warning'); return; }
        var cmds=(d.cmds||[]).map(function(c){return[String(c[0]||'').trim(),String(c[1]||'').trim()];}).filter(function(c){return c[0];});
        var rec={id:_expertEditId||('my-'+Date.now()),mine:true,k:d.k,name:d.name,role:d.role,by:'我创建的',desc:d.desc,visibility:d.visibility,tags:d.tags,modes:d.modes.slice(),comp:d.comp,cmds:cmds};
        if(_expertEditId) expertStore.updateExpert(_expertEditId,rec); else expertStore.addExpert(rec);
        modalStore.closeModal('expertEdit');
      },
      delete:expertStore.deleteExpert,
      startByChat:function(){}
    },
    team:{
      subscribe:function(fn){ return modalStore.subscribe('team',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('team'); },
      getVersion:function(){ return modalStore.getVersion('team'); },
      close:function(){ modalStore.closeModal('team'); },
      getEditingId:function(){ return _teamEditingId; },
      getInitialData:function(){
        if(!teamDraft) return null;
        return {name:teamDraft.name,desc:teamDraft.desc,visibility:teamDraft.visibility,preset:teamDraft.preset};
      },
      getDraft:function(){
        if(!teamDraft) return null;
        return {name:teamDraft.name,desc:teamDraft.desc,visibility:teamDraft.visibility,leadId:teamDraft.leadId,members:teamDraft.members.slice(),preset:teamDraft.preset,domains:(teamDraft.domains||[]).slice(),gates:teamGates(teamDraft).slice(),cmds:(teamDraft.cmds||[]).map(function(c){return c.slice()})};
      },
      getFlow:teamFlow,
      getCoverage:teamCoverage,
      getWarnings:teamLint,
      getActiveGates:activeGates,
      hasGate:hasGate,
      toggleGate:toggleGate,
      save:function(d){
        var name=(d.name||'').trim();
        if(!name){ toastFn('请填写专家团名称','warning'); return; }
        if(!d.members||!d.members.length){ toastFn('至少需要一位成员','warning'); return; }
        teamDraft.name=name; teamDraft.desc=d.desc||''; teamDraft.visibility=d.visibility||'workspace';
        teamDraft.leadId=d.leadId; teamDraft.members=d.members.slice();
        if(d.preset||!_teamEditingId){
          var nid='team-'+Date.now();
          expertStore.saveTeam({id:nid,preset:false,name:d.preset?name+' 副本':name,by:'我创建的',desc:d.desc,visibility:d.visibility,domains:(d.domains||[]).slice(),gates:teamGates(d).slice(),leadId:d.leadId,members:d.members.slice(),cmds:teamCmdList(d)});
        }else{
          var t=teamById(_teamEditingId);
          if(t){ t.name=name; t.desc=d.desc; t.visibility=d.visibility; t.leadId=d.leadId; t.members=d.members.slice(); t.cmds=teamCmdList(d); t.domains=(d.domains||[]).slice(); t.gates=teamGates(d).slice(); expertStore.saveTeam(t); }
        }
        modalStore.closeModal('team');
      },
      delete:function(id){ expertStore.deleteTeam(id); modalStore.closeModal('team'); },
      callTeam:function(id){ modalStore.closeModal('team'); },
      callTeamWithCmd:function(id,cmd){ modalStore.closeModal('team'); },
      getExpert:function(id){ return expertStore.sanitizeExpert(expertStore.getEx()[id]); },
      getAvatar:xav,
      openMemberPicker:function(){ modalStore.openModal('member','member-picker'); },
      setLead:function(id){ if(teamDraft){ teamDraft.leadId=id; modalStore.touch('team'); } },
      removeMember:function(id){ if(!teamDraft) return; teamDraft.members=teamDraft.members.filter(function(m){return m!==id;}); if(teamDraft.leadId===id) teamDraft.leadId=teamDraft.members[0]||null; modalStore.touch('team'); },
      addCmd:function(){ if(teamDraft){ teamDraft.cmds.push(['','']); modalStore.touch('team'); } },
      removeCmd:function(i){ if(!teamDraft) return; teamDraft.cmds.splice(i,1); if(!teamDraft.cmds.length) teamDraft.cmds.push(['','']); modalStore.touch('team'); },
      updateCmd:function(i,f,val){ if(teamDraft&&teamDraft.cmds[i]) teamDraft.cmds[i][f]=val; }
    },
    member:{
      subscribe:function(fn){ return modalStore.subscribe('member',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('member'); },
      close:function(){ modalStore.closeModal('member'); },
      getMembers:function(kw){
        if(!teamDraft) return [];
        kw=(kw||'').trim().toLowerCase();
        var wsOnly=teamDraft.visibility!=='private';
        return expertStore.getExperts().filter(function(e){
          if(wsOnly&&e.visibility==='private'&&teamDraft.members.indexOf(e.id)<0) return false;
          return !kw||(e.name+e.role+e.desc+e.tags.join()).toLowerCase().indexOf(kw)>=0;
        }).map(function(e){ return {id:e.id,k:e.k,name:e.name,desc:e.desc,ro:e.ro,modes:e.modes.slice(),isMember:teamDraft.members.indexOf(e.id)>=0}; });
      },
      toggleMember:function(id){
        if(!teamDraft) return;
        var i=teamDraft.members.indexOf(id);
        if(i<0){ teamDraft.members.push(id); if(!teamDraft.leadId) teamDraft.leadId=id; }
        else { teamDraft.members.splice(i,1); if(teamDraft.leadId===id) teamDraft.leadId=teamDraft.members[0]||null; }
        modalStore.touch('team');
      },
      getAvatar:xav
    },
    /* ERP 环境 — 转发到 env-store + modal-store */
    env:{
      subscribe:function(fn){ return modalStore.subscribe('env',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('env'); },
      getVersion:function(){ return modalStore.getVersion('env'); },
      touch:function(){ modalStore.touch('env'); },
      close:function(){ modalStore.closeModal('env'); },
      getMode:function(){ return envMode; },
      getInitialData:_getEnvInitialData,
      getDataCenters:function(){ return ENV_DATA_CENTERS; },
      save:_saveEnvFromReact,
      testConnection:function(){ toastFn('连接测试通过'); },
      toggleNormalAuth:function(){ envNormalAuthEnabled=!envNormalAuthEnabled; modalStore.touch('env'); },
      disconnect:function(){ _envDisconnectIndex=envEditIndex; modalStore.openModal('envDisconnect','env-disconnect'); },
      reauth:function(){ startAuthorize(envEditIndex, envEditIndex>=0&&ENV_ITEMS[envEditIndex]?ENV_ITEMS[envEditIndex].name:''); },
      getList:_envGetList,
      getListVersion:function(){ return _envListVersion; },
      deleteItem:_envDeleteItem,
      setDefault:_envSetDefault,
      testItem:_envTestConnection,
      copyUrl:_envCopyUrl,
      openModal:openEnvModal
    },
    envAuthorize:{
      subscribe:function(fn){ return modalStore.subscribe('envAuthorize',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('envAuthorize'); },
      close:closeAuthorize,
      retry:_retryAuthorize
    },
    consent:{
      subscribe:function(fn){ return modalStore.subscribe('consent',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('consent'); },
      close:function(){ modalStore.closeModal('consent'); },
      getStep:_getConsentStep,
      getDataCenters:function(){ return ENV_DATA_CENTERS; },
      getScopeList:function(){ return ERP_API_SCOPES; },
      login:_consentLogin,
      allow:_consentAllow,
      deny:_consentDeny,
      switchAccount:_consentSwitchAccount
    },
    envDisconnect:{
      subscribe:function(fn){ return modalStore.subscribe('envDisconnect',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('envDisconnect'); },
      close:closeDisconnect,
      getEnvName:function(){ return envDisconnectName; },
      confirm:_confirmDisconnect
    },
    envAuthConfirm:{
      subscribe:function(fn){ return modalStore.subscribe('envAuthConfirm',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('envAuthConfirm'); },
      close:_closeAuthConfirm,
      confirm:_confirmAuthConfirm
    },
    /* composer + chat — 转发到 chat-store + expert-store */
    composer:{
      send:function(text){
        if(!text||!text.trim()) return;
        var t=text.trim();
        showView('chat');
        chatStore.addUserMessage(t);
        chatStore.simulateResponse();
      },
      getMode:function(){ return ''; },
      setMode:function(mode){ applyMode(mode,true); },
      getExpert:function(){ return expertStore.getActivePick(); },
      clearExpert:function(){ expertStore.clearPick(); },
      openFilePicker:openFilePicker,
      getModes:function(){ return ['苍穹应用','通用应用','业务组件','技能开发','智能体开发','原型探索']; }
    },
    chat:{
      subscribe:function(fn){ return chatStore.subscribe(fn); },
      getMessages:function(){ return chatStore.getMessages(); },
      getVersion:function(){ return chatStore.getVersion(); },
      touch:chatStore.notify||function(){},
      clear:function(){ chatStore.clear(); },
      getTitle:function(){ return chatStore.getTitle(); },
      setTitle:function(t){ chatStore.setTitle(t); }
    }
  }

})();
