import billTemplate from '../artifacts/purchase-order.html?raw';
import tokensCss from '../styles/tokens.css?raw';

/* 产物预览与应用共用同一份设计令牌 */
const billTemplateWithTokens = billTemplate.replace(
  '/* 令牌由 tokens.css 注入 */',
  tokensCss.replace(/\/\*[\s\S]*?\*\//g, '').trim()
);


(function(){
  var $=function(s,el){return (el||document).querySelector(s)};
  var $$=function(s,el){return Array.prototype.slice.call((el||document).querySelectorAll(s))};

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
  function showLogin(){
    if(loginOverlay) loginOverlay.classList.remove('hidden');
  }
  function hideLogin(){
    if(loginOverlay) loginOverlay.classList.add('hidden');
  }

  /* 恢复记住的账号 */
  try{
    var savedUser=localStorage.getItem(REMEMBER_KEY);
    if(savedUser){
      var inp=$('#loginUser');
      if(inp) inp.value=savedUser;
      var cb=$('#loginRemember');
      if(cb) cb.checked=true;
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
          if(remember&&remember.checked) localStorage.setItem(REMEMBER_KEY,user);
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
  }

  /* 未登录则显示登录页，已登录则恢复用户信息 */
  var _authedUser=getAuthedUser();
  if(!_authedUser){
    showLogin();
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
    if(type==='error'){
      toastEl.innerHTML='<svg class="toast-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ef4444"/><path d="M12 8v5M12 16v.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>'
        +'<span class="toast-text">'+msg+'</span>'
        +'<svg class="toast-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
      toastEl.className='toast error';
      toastEl.classList.add('show');
      clearTimeout(toastT);
      toastT=setTimeout(function(){toastEl.classList.remove('show')},3000);
      var closeBtn=$('.toast-close',toastEl);
      if(closeBtn) closeBtn.onclick=function(){toastEl.classList.remove('show')};
    }else{
      toastEl.textContent=msg;
      toastEl.className='toast';
      toastEl.classList.add('show');
      clearTimeout(toastT);
      toastT=setTimeout(function(){toastEl.classList.remove('show')},2000);
    }
  }

  /* ---------- Changelog / 更新通知（与 Build_demo 完全一致） ---------- */
  var changelogData=[
    {id:'12',date:'2026-09-09',iconBg:'#eef3ff',iconColor:'#495dff',team:'新增协作开发模块',body:'左侧「专家」菜单改为「协作开发」，下设任务管理、待评审、协作人员管理、专家管理、专家团管理与设置六个页签；新增项目维度，任务、评审、协作人员按项目划分，专家与专家团为全局资产、项目内只绑定默认专家团。'},
    {id:'11',date:'2026-09-08',iconBg:'#eef3ff',iconColor:'#495dff',team:'原型新增登录页',body:'新增登录页，需账号密码登录后才能查看原型。'},
    {id:'10',date:'2026-08-27',iconBg:'#eef3ff',iconColor:'#495dff',team:'苍穹应用开发 · 预览区新增列表页签',body:'预览面板页签新增「列表」选项，支持列表视图展示。'},
    {id:'9',date:'2026-08-27',iconBg:'#e8faef',iconColor:'#08a040',team:'苍穹应用开发 · 历史版本',body:'新增历史记录面板，支持查看版本时间线与版本描述，可回退到历史版本。'},
    {id:'8',date:'2026-07-30',iconBg:'#fff1e8',iconColor:'#ff8d42',team:'新增 Design System 模块',body:'涵盖基础、布局、导航、数据录入、数据展示、反馈 6 大类共 67 个组件，提供组件预览、设计令牌展示、图标库等能力，作为 Lingee 统一的设计规范与组件文档平台。'},
    {id:'7',date:'2026-07-28',iconBg:'#eef3ff',iconColor:'#495dff',team:'应用开发关联应用交互优化',body:'1、会话框：项目选择与应用选择分开展示\n2、下拉面板去除创建应用流程，调整为关联选择全量应用\n3、苍穹应用：选择关联苍穹应用，发起会话时应用开发列表自动创建展示苍穹应用卡片\n4、通用应用：无需关联应用，自动生成产物应用卡片\n5、未选择开发模式，意图识别苍穹应用开发时，会话过程收集苍穹应用编码\n6、选择应用时，下次新会话按项目记忆用户选项\n\n[视觉稿](https://www.figma.com/design/F8s5P9Y8f1Bq2GkXKCkC7L/%E5%BC%80%E5%8F%91?node-id=0-1&t=DHlFenPtUNP6C7Z5-1)'},
  ];
  // 每个数据条目对应的 avatar SVG 图标（与 Build_demo 的 lucide 图标一致）
  var changelogIcons={
    '12':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>',
    '11':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>',
    '9':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.36 2.64L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>',
    '10':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
    '8':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125 0-.945.748-1.688 1.688-1.688h1.999c3.586 0 6.539-2.918 6.539-6.5C22 6.48 17.5 2 12 2z"/></svg>',
    '7':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    '6':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M12 3a9 9 0 0 0 0 18M3 12h18"/></svg>',
    '5':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  };
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
  $$('.dropdown').forEach(function(dd){
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
  $$('.dropdown').forEach(function(dd){
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
  // 清空输入时恢复空提示占位符
  input.addEventListener('input',function(){
    var text=this.textContent||'';
    if(text.trim()===''){ this.innerHTML=''; }
  });
  var navItems=$$('.sb-scroll .nav-item');
  var navByName={};
  navItems.forEach(function(n){ navByName[n.textContent.trim()]=n; });

  function setNavActive(name){
    navItems.forEach(function(n){ n.classList.toggle('active', n.textContent.trim()===name); });
  }
  function applyMode(mode,fromChip){
    modeItems.forEach(function(m){ m.classList.toggle('checked', m.getAttribute('data-val')===mode); });
    appDd.classList.remove('error');
    input.setAttribute('data-placeholder','布置'+mode+'任务');
    appDd.classList.toggle('hidden', mode!=='苍穹应用');
    if(mode!=='苍穹应用'){ appDd.classList.remove('open'); }
    input.focus();
  }
  modeItems.forEach(function(item){
    item.addEventListener('click',function(){
      applyMode(item.getAttribute('data-val'),true);
    });
  });

  /* ---------- view switching ---------- */
  var viewHome=$('#view-home'), viewNew=$('#view-newtask'), viewChat=$('#view-chat'), viewApps=$('#view-apps'), viewSkills=$('#view-skills'), viewAgents=$('#view-agents'), viewCollab=$('#view-collab'), viewDesign=$('#view-design'), viewSettings=$('#view-settings');
  function setUrlState(search){
    history.replaceState(null,'',search);
    try{localStorage.setItem('lingeeUrlState',search)}catch(e){}
  }
  function showView(which){
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
    if(which!=='design') setUrlState('?view='+which);
  }



  /* ---------- 预览：编辑 / 选择元素按钮 ---------- */
  function previewDoc(){
    var f=$('#chatPreviewFrame');
    try{ return f&&f.contentDocument }catch(e){ return null }
  }
  var previewEditBtn=$('#previewEdit'), previewPickBtn=$('#previewPick');
  function setPickMode(on){
    var d=previewDoc(); if(!d||!d.body)return;
    d.body.classList.toggle('pick-mode',on);
    if(on&&!d._pickBound){
      d._pickBound=true;
      d.addEventListener('mouseover',function(e){
        if(!d.body.classList.contains('pick-mode'))return;
        if(d._hovered) d._hovered.style.outline='';
        d._hovered=e.target;
        e.target.style.outline='2px solid #495dff';
        e.target.style.outlineOffset='-2px';
      },true);
      d.addEventListener('click',function(e){
        if(!d.body.classList.contains('pick-mode'))return;
        e.preventDefault(); e.stopPropagation();
        var t=e.target;
        var n=t.tagName.toLowerCase()+(t.className?'.'+String(t.className).split(' ').join('.'):'');
        toast('已选中 '+n);
      },true);
    }
    if(!on&&d._hovered){ d._hovered.style.outline=''; d._hovered=null; }
  }
  if(previewEditBtn){
    previewEditBtn.addEventListener('click',function(){
      var on=!previewEditBtn.classList.contains('on');
      previewEditBtn.classList.toggle('on',on);
      previewEditBtn.setAttribute('aria-pressed',on?'true':'false');
      var d=previewDoc(); if(d) d.designMode=on?'on':'off';
      if(on&&previewPickBtn&&previewPickBtn.classList.contains('on')){
        previewPickBtn.classList.remove('on');
        previewPickBtn.setAttribute('aria-pressed','false');
        setPickMode(false);
      }
      toast(on?'已进入编辑模式，可直接修改页面文字':'已退出编辑模式');
    });
  }
  if(previewPickBtn){
    previewPickBtn.addEventListener('click',function(){
      var on=!previewPickBtn.classList.contains('on');
      previewPickBtn.classList.toggle('on',on);
      previewPickBtn.setAttribute('aria-pressed',on?'true':'false');
      if(on&&previewEditBtn&&previewEditBtn.classList.contains('on')){
        previewEditBtn.classList.remove('on');
        previewEditBtn.setAttribute('aria-pressed','false');
        var d=previewDoc(); if(d) d.designMode='off';
      }
      setPickMode(on);
    });
  }

  /* ---------- 标题栏：切换预览展开 / 收起 ---------- */
  var togglePreviewBtn=$('#togglePreviewBtn');
  function syncTogglePreviewBtn(){
    if(!togglePreviewBtn)return;
    var open=$('#view-chat').classList.contains('preview-open');
    togglePreviewBtn.classList.toggle('on',open);
    togglePreviewBtn.setAttribute('aria-pressed',open?'true':'false');
    togglePreviewBtn.setAttribute('data-tooltip',open?'收起预览':'显示预览');
  }
  if(togglePreviewBtn){
    togglePreviewBtn.addEventListener('click',function(){
      var view=$('#view-chat');
      if(view.classList.contains('preview-open')){
        var cb=$('#chatPreviewClose'); if(cb) cb.click();
      }else{
        var card=$('.artifact-card');
        if(card) card.click(); else return;
      }
      syncTogglePreviewBtn();
    });
  }

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
    /* 重新回填记住的账号 */
    try{
      var savedUser=localStorage.getItem(REMEMBER_KEY);
      if(savedUser){
        var inp=$('#loginUser'); if(inp) inp.value=savedUser;
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

  /* ---------- 设置页：环境配置 ---------- */
  /* 环境项操作菜单 */
  function closeEnvMenus(except){
    $$('.env-more-wrap.open').forEach(function(w){ if(w!==except) w.classList.remove('open'); });
  }
  function bindEnvMore(btn){
    var wrap=btn.closest('.env-more-wrap');
    var item=btn.closest('.env-item');
    var isCloud=item.dataset.envSource==='cloud'||!!item.querySelector('.env-tag.cloud');
    var primaryMode=isCloud?'view':'edit';
    var primaryLabel=isCloud?'查看':'编辑';
    var main=item.querySelector('.env-main');
    if(main&&!main.hasAttribute('data-edit-bound')){
      main.setAttribute('data-edit-bound','true');
      main.setAttribute('role','button');
      main.setAttribute('tabindex','0');
      main.setAttribute('aria-label',primaryLabel+'环境 '+item.querySelector('.env-name').textContent);
      main.addEventListener('click',function(){ openEnvModal(primaryMode,item); });
      main.addEventListener('keydown',function(e){
        if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openEnvModal(primaryMode,item); }
      });
    }
    var editMenu=$('.env-mi[data-act="edit"]',wrap);
    if(editMenu&&isCloud){ editMenu.setAttribute('data-act','view'); editMenu.textContent='查看'; }
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      var open=!wrap.classList.contains('open');
      closeEnvMenus(wrap);
      wrap.classList.toggle('open',open);
      btn.setAttribute('aria-expanded',open?'true':'false');
    });
    $$('.env-mi',wrap).forEach(function(mi){
      mi.addEventListener('click',function(e){
        e.stopPropagation();
        wrap.classList.remove('open');
        var name=item.querySelector('.env-name').textContent;
        var act=mi.getAttribute('data-act');
        if(act==='test'){
          runEnvTest(item);
        }else if(act==='copy'){
          var url=item.querySelector('.env-url').textContent;
          if(navigator.clipboard) navigator.clipboard.writeText(url);
          toast('已复制地址：'+url);
        }else if(act==='default'){
          $$('.env-tag.def').forEach(function(t){t.remove()});
          var head=item.querySelector('.env-head');
          var tag=document.createElement('span');
          tag.className='env-tag def'; tag.textContent='默认';
          head.insertBefore(tag, head.querySelector('.env-tag'));
          toast('已设为默认：'+name);
        }else if(act==='delete'){
          item.remove();
          toast('已删除：'+name);
        }else if(act==='edit'){
          openEnvModal('edit',item);
        }else if(act==='view'){
          openEnvModal('view',item);
        }
      });
    });
  }
  /* 连通性测试：原型内以模拟延迟与结果呈现 */
  function runEnvTest(item){
    var name=item.querySelector('.env-name').textContent;
    var head=item.querySelector('.env-head');
    var old=head.querySelector('.env-status');
    if(old) old.remove();
    var badge=document.createElement('span');
    badge.className='env-status testing';
    badge.innerHTML='<span class="env-spinner"></span>连通中';
    head.appendChild(badge);
    setTimeout(function(){
      badge.className='env-status ok';
      badge.textContent='连通正常 '+(60+Math.floor(Math.random()*180))+'ms';
      toast(name+'：连通正常');
    },700+Math.random()*600);
  }
  /* 列表不展示认证状态标签：是否启用普通 AccessToken 在表单内已有明确表达，
     列表再挂一枚红标只是噪音。这里只负责清掉演示数据里遗留的标签。 */
  function syncAuthTag(item){
    var tag=item.querySelector('.env-tag.legacy-auth');
    if(tag) tag.remove();
  }
  /* 列表只保留 默认 / 本地-云端 两类标签：产品类型在表单里已有「环境类型」字段，
     列表再挂一枚彩色标签只是噪音 */
  function syncProductTag(item,product){
    var tag=item.querySelector('.env-tag.product');
    if(tag) tag.remove();
  }
  var demoGatewayByName={
    'scm-dev':'acgw-scm-dev',
    'hr-sit':'acgw-hr-sit',
    'legacy-v79':'acgw-legacy-v79'
  };
  function hydrateEnvItem(item,index){
    var sourceTag=item.querySelector('.env-tag.local,.env-tag.cloud');
    /* 列表行不展示具体版本，适用版本在页面标题区统一说明 */
    var versionTag=item.querySelector('.env-ver');
    if(versionTag) versionTag.remove();
    var name=item.querySelector('.env-name').textContent.trim().toLowerCase();
    /* 演示数据模拟历史记录只有网关标识、没有产品类型的情况 */
    if(!item.hasAttribute('data-env-gateway')&&demoGatewayByName[name]) item.dataset.envGateway=demoGatewayByName[name];
    var existingProductTag=item.querySelector('.env-tag.product');
    var product=item.dataset.envProduct
      ||(existingProductTag&&existingProductTag.classList.contains('XK')?'XK':'')
      ||((item.dataset.envGateway||'').trim()?'XK':'XH');
    item.dataset.envProduct=product;
    item.dataset.envSource=item.dataset.envSource||(sourceTag&&sourceTag.classList.contains('cloud')?'cloud':'local');
    item.dataset.envDataCenter=item.dataset.envDataCenter||(index%2?'1288162917259':'1561691182942805271');
    item.dataset.envClientId=item.dataset.envClientId||('lingee-build-'+name);
    /* 演示数据：legacy 开头的环境模拟尚未启用普通 AccessToken 认证的历史配置 */
    var normalAuth=item.hasAttribute('data-normal-access-token')
      ?item.dataset.normalAccessToken==='true'
      :name.indexOf('legacy')===-1;
    item.dataset.normalAccessToken=normalAuth?'true':'false';
    if(!normalAuth) item.dataset.proxyUser=item.dataset.proxyUser||'erp-openapi-agent';
    /* 演示数据：外网地址的环境已迁到授权连接，fi-uat 模拟授权失效；
       内网地址（hr-sit / legacy-v79）对应老版本苍穹，保持应用凭证 */
    if(!item.dataset.envConn){
      var cloudIssued=item.dataset.envSource==='cloud';
      item.dataset.envConn=(!cloudIssued&&(name==='scm-dev'||name==='fi-uat'))?'auth':'cred';
    }
    if(item.dataset.envConn==='auth'&&!item.dataset.grantedBy){
      item.dataset.grantedBy='吴**超';
      item.dataset.grantedAt=name==='fi-uat'?'08-27':'09-01';
      item.dataset.lastUsed=name==='fi-uat'?'08-28 16:40':'今天 14:32';
      if(name==='fi-uat') item.dataset.grantState='expired';
    }
    syncProductTag(item,product);
    syncAuthTag(item);
    syncConnTag(item);
  }

  /* 列表行：连接方式标签 + 授权归属副行。凭证模式不显示授权人，
     因为那种模式下令牌绑的是配置里写死的代理用户，跟实际使用者无关 */
  function syncConnTag(item){
    var head=item.querySelector('.env-head');
    var main=item.querySelector('.env-main');
    if(!head||!main) return;
    item.querySelectorAll('.env-tag.conn').forEach(function(t){ t.remove(); });
    var oldSub=main.querySelector('.env-sub'); if(oldSub) oldSub.remove();
    var oldBtn=item.querySelector('.env-inline-btn'); if(oldBtn) oldBtn.remove();
    var isAuth=item.dataset.envConn==='auth';
    var state=item.dataset.grantState||'';
    var pending=state==='expired'||state==='revoked'||state==='none';
    var tag=document.createElement('span');
    /* 一行只挂一枚连接方式标签：同一环境同时只启用一种 */
    tag.className='env-tag conn '+(isAuth?(pending?'reauth':'auth'):'cred');
    tag.textContent=isAuth?(pending?(state==='expired'?'授权已失效':'未授权'):'OAuth 授权'):'第三方应用';
    head.appendChild(tag);
    item.classList.toggle('needs-reauth',isAuth&&pending);
    if(isAuth){
      var sub=document.createElement('div');
      sub.className='env-sub'+(pending?' warn':'');
      sub.textContent=state==='none'
        ? '配置已保存，还没有完成授权'
        : (state==='revoked'
            ? '已断开连接，重新授权后可以继续使用'
            : (state==='expired'
                ? '授权已失效，可能是被撤销或长期未使用'
                : '授权人 '+(item.dataset.grantedBy||'')+' · '+(item.dataset.grantedAt||'')+' 授权 · '+(item.dataset.lastUsed||'')+' 使用'));
      main.appendChild(sub);
    }
    if(isAuth&&pending){
      var btn=document.createElement('button');
      btn.className='env-inline-btn';
      btn.type='button';
      btn.textContent=state==='none'?'去授权':'重新授权';
      btn.addEventListener('click',function(e){
        e.stopPropagation();
        startAuthorize(item,item.querySelector('.env-name').textContent.trim());
      });
      item.insertBefore(btn,item.querySelector('.env-more-wrap'));
    }
  }
  $$('#view-settings .env-item').forEach(hydrateEnvItem);
  $$('.env-more').forEach(bindEnvMore);
  document.addEventListener('click',function(){ closeEnvMenus(null); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeEnvMenus(null); });

  var envModal=$('#envModal');
  var envConfigForm=$('#envConfigForm');
  var envProductSelect=$('#envProduct');
  var envMode='create';
  var envEditItem=null;
  var envProduct='';
  var envOriginalProduct='';
  var envMaskedValue='********';
  var envNormalAuthEnabled=false;

  /* ---------- 连接方式：授权连接 / 应用凭证 ---------- */
  /* 演示用探测：内网地址、非标端口、legacy 命名视作老版本苍穹，落回应用凭证。
     真实实现是探测 {url}/.well-known/oauth-authorization-server，
     404 / 非 JSON / 超时一律判定不支持，静默回落，不报错。 */
  function probeAuthSupport(url){
    var u=(url||'').toLowerCase();
    if(!u) return false;
    if(/legacy|192\.168\.|172\.\d+\.|10\.\d+\.|:8080|:8081/.test(u)) return false;
    return true;
  }
  var envConnMode='cred';
  var envConnSupported=false;
  var envConnBlocked='';        /* 非空表示 OAuth 授权不可选，内容是原因 */
  var envProbeTimer=null;

  /* OAuth 授权要在本机浏览器里逐人确认，老版本苍穹没有这套端点。
     云端下发的配置由企业管理中心统一维护，本机连选都不用选，走的是只读展示那条路。 */
  function connBlockedReason(){
    return envConnSupported ? '' : '该环境的苍穹版本不支持 OAuth 授权，请在「OpenAPI 第三方应用」中创建应用后填写凭证。';
  }

  function setConnNote(text,warn,spin){
    var note=$('#envConnNote'); if(!note) return;
    note.className='env-conn-note'+(warn?' warn':'');
    note.innerHTML='';
    if(spin){
      var dot=document.createElement('span');
      dot.className='env-probe-dot';
      note.appendChild(dot);
    }
    if(text){
      var span=document.createElement('span');
      span.textContent=text;
      note.appendChild(span);
    }
  }

  /* 说明这一行只讲一件事，优先级从高到低：不可选原因 > 已建环境不能改 > 当前选择的前提 */
  function syncConnNote(){
    var isAuth=envConnMode==='auth';
    if(envMode!=='create'){
      setConnNote(envEditItem&&envEditItem.dataset.envSource==='cloud'
        ? '该环境由企业管理中心下发，授权类型随下发配置，本机不能改。'
        : '授权类型在新增环境时选定，之后不能修改。要换一种请新增环境。',false,false);
      return;
    }
    if(envConnBlocked){ setConnNote(envConnBlocked,false,false); return; }
    /* OAuth 下方已有三条说明，这里再补一句是重复 */
    setConnNote(isAuth?'':'需要先在 ERP 的「OpenAPI 第三方应用」里创建应用，拿到 ID 和密钥。',false,false);
  }

  function applyConnMode(mode){
    envConnMode=mode==='auth'?'auth':'cred';
    var isAuth=envConnMode==='auth';
    var creating=envMode==='create';
    /* 已建环境不给切换入口：单选组换成一行只读文字。
       第三方应用连这行都不摆——下面整段「连接凭证」已经把话说完了 */
    var seg=$('#envConnSeg'), cur=$('#envConnCurrent'), sec=$('#envConnSection');
    if(sec&&!creating) sec.classList.toggle('hidden',!isAuth);
    if(seg) seg.classList.toggle('hidden',!creating);
    if(cur) cur.classList.toggle('hidden',creating);
    if(!creating&&cur){
      $('#envConnCurrentName').textContent='OAuth 授权';
      $('#envConnCurrentHint').textContent='在浏览器登录 ERP 并确认授权';
    }
    var tabAuth=$('#envTabAuth'), tabCred=$('#envTabCred');
    if(tabAuth){
      tabAuth.setAttribute('aria-checked',isAuth?'true':'false');
      tabAuth.disabled=!!envConnBlocked;
      tabAuth.querySelector('.env-conn-opt-hint').textContent=
        envConnBlocked?'该环境不支持':'在浏览器登录 ERP 并确认授权';
    }
    if(tabCred) tabCred.setAttribute('aria-checked',isAuth?'false':'true');
    var authPanel=$('#envAuthPanel');
    if(authPanel) authPanel.classList.toggle('hidden',!isAuth);
    var cred=$('#envCredentialSection');
    if(cred) cred.classList.toggle('hidden',isAuth);
    /* 普通 Access Token 区块只对「尚未迁移的历史环境」出现，迁移不可回退，
       已启用的环境再摆一个开关是误导。新增态与 OAuth 一律不显示。 */
    var legacy=$('#envLegacyAuthSection');
    if(legacy) legacy.classList.toggle('hidden',
      isAuth||creating||!envEditItem||envEditItem.dataset.normalAccessToken!=='false');
    /* 环境类型全链路只用来决定要不要填网关标识，OAuth 没有那个字段，
       后端也不读它（kd-auth 里 x-acgw-identity 有值就注入，跟类型解耦），所以这里不问 */
    var pf=$('#envProductField'); if(pf) pf.classList.toggle('hidden',isAuth);
    var pd=$('#envProduct');
    if(pd){ pd.required=!isAuth; if(isAuth) setEnvFieldError(pd,''); }
    /* 数据中心在 ERP 的授权页面里选，授权成功后回填。让用户先在这里选一遍，
       再去授权页面选第二遍，两处不一致时谁说了算又是一笔糊涂账 */
    var dcf=$('#envDataCenterField'); if(dcf) dcf.classList.toggle('hidden',isAuth);
    var dc=$('#envDataCenter');
    if(dc){ dc.required=!isAuth; if(isAuth) setEnvFieldError(dc,''); }
    /* OAuth 不填凭证，凭证相关的校验一并放开 */
    ['#envClientId','#envClientSecret','#envGateway','#envProxyUser'].forEach(function(sel){
      var el=$(sel); if(el){ el.required=!isAuth; if(isAuth) setEnvFieldError(el,''); }
    });
    syncAuthGrant();
    syncConnNote();
    syncEnvFooter();
  }

  /* 已连接的环境把授权归属摆出来，用户才知道现在这条连接算在谁头上 */
  function syncAuthGrant(){
    var grant=$('#envAuthGrant'), points=$('#envAuthPoints');
    if(!grant||!points) return;
    /* 从来没授权成功过的环境没有归属可展示，摆一张全是「—」的卡片没有意义 */
    var saved=envEditItem&&envEditItem.dataset.envConn==='auth'&&envConnMode==='auth'
      &&!!envEditItem.dataset.grantedBy;
    grant.classList.toggle('hidden',!saved);
    points.classList.toggle('hidden',!!saved);
    if(!saved){
      var hidden=$('#envAuthScopeList');
      if(hidden) hidden.classList.add('hidden');
      return;
    }
    $('#envAuthGrantBy').textContent=envEditItem.dataset.grantedBy||'—';
    $('#envAuthGrantDc').textContent=dataCenterLabel(envEditItem.dataset.envDataCenter);
    var st=envEditItem.dataset.grantState;
    $('#envAuthGrantAt').textContent=(envEditItem.dataset.grantedAt||'—')
      +(st==='expired'?'（已失效）':(st==='revoked'?'（已断开）':''));

    var toggle=$('#envAuthScopeToggle');
    if(toggle){
      toggle.textContent=ERP_API_SCOPES.length+' 项 API 权限';
      toggle.setAttribute('aria-expanded','false');
    }
    var list=$('#envAuthScopeList');
    if(list){ list.classList.add('hidden'); renderScopeList(list,ERP_API_SCOPES); }
  }

  /* 底部按钮随模式与场景切换：授权模式没有「测试连接」，
     连接动作本身就是一次真实验证 */
  function syncEnvFooter(){
    var isAuth=envConnMode==='auth';
    var viewing=envMode==='view';
    var creating=envMode==='create';
    var savedAuth=!!(envEditItem&&envEditItem.dataset.envConn==='auth');
    var t=$('#envTest'), c=$('#envModalConfirm'), d=$('#envDisconnect'), r=$('#envReauth');
    var gs=(envEditItem&&envEditItem.dataset.grantState)||'';
    var pending=gs==='expired'||gs==='revoked'||gs==='none';
    var connected=isAuth&&savedAuth&&!creating&&!viewing;
    if(t) t.classList.toggle('hidden',isAuth||viewing);
    if(d) d.classList.toggle('hidden',!(connected&&!pending));
    /* 授权还有效时不摆「重新授权」：那是失效后的补救动作，平时出现只会让人以为出了问题 */
    if(r){
      r.classList.toggle('hidden',!(connected&&pending));
      r.textContent=gs==='none'?'去授权':'重新授权';
    }
    if(c){
      c.textContent=(isAuth&&!savedAuth&&!viewing)?'连接 ERP':'保存';
      c.classList.remove('hidden');
    }
  }

  /* 数据中心候选必须基于当前地址取，所以它不是一份写死的下拉：
     地址没填之前下拉是空的、禁用的，拉取入口跟着地址走 */
  var ENV_DATA_CENTERS=[
    {id:'1561691182942805271',name:'多维联合集团有限公司'},
    {id:'1288162917259',name:'蓝海集团测试数据中心'}
  ];
  var envDcLoading=false;
  function dataCenterName(id){
    for(var i=0;i<ENV_DATA_CENTERS.length;i++){
      if(ENV_DATA_CENTERS[i].id===id) return ENV_DATA_CENTERS[i].name;
    }
    return '—';
  }
  /* 回填的数据中心要连账套号一起显示：光看名字对不上 ERP 里的哪一套 */
  function dataCenterLabel(id){
    var name=dataCenterName(id);
    return name==='—'?'—':name+'（'+id+'）';
  }
  function renderDataCenters(loaded,keep){
    var sel=$('#envDataCenter'); if(!sel) return;
    var want=keep!==undefined?keep:sel.value;
    sel.innerHTML='';
    var ph=document.createElement('option');
    ph.value=''; ph.textContent=envDcLoading?'拉取中...':'请选择数据中心';
    sel.appendChild(ph);
    if(loaded) ENV_DATA_CENTERS.forEach(function(d){
      var o=document.createElement('option');
      o.value=d.id; o.textContent=d.name+'（'+d.id+'）';
      sel.appendChild(o);
    });
    sel.value=loaded?(want||''):'';
    sel.disabled=envMode!=='create'||!loaded;
  }
  function syncDcRefresh(){
    var btn=$('#envDcRefresh'); if(!btn) return;
    /* 已建环境的地址不能改，数据中心也就没有重新拉的余地 */
    btn.classList.toggle('hidden',envMode!=='create');
    var url=$('#envUrl');
    btn.disabled=envDcLoading||!((url&&url.value||'').trim());
    btn.textContent=envDcLoading?'拉取中...':'重新拉取数据中心';
  }
  function loadDataCenters(){
    if(envDcLoading) return;
    envDcLoading=true;
    renderDataCenters(false,'');
    syncDcRefresh();
    setTimeout(function(){
      envDcLoading=false;
      renderDataCenters(true,'');
      setEnvFieldError($('#envDataCenter'),'');
      syncDcRefresh();
    },700);
  }

  function resetConnSection(){
    if(envProbeTimer){ clearTimeout(envProbeTimer); envProbeTimer=null; }
    envConnSupported=false;
    envConnBlocked='';
    var sec=$('#envConnSection'); if(sec) sec.classList.add('hidden');
    var seg=$('#envConnSeg'); if(seg) seg.classList.remove('probing');
    setConnNote('',false,false);
  }

  /* 地址填完就静默探测。老版本苍穹永远没有这个端点，
     把它说成「检测失败」会让用户以为自己填错了地址 */
  function runProbe(url){
    if(envMode!=='create') return;
    if(envProbeTimer) clearTimeout(envProbeTimer);
    var sec=$('#envConnSection'), seg=$('#envConnSeg');
    if(!sec) return;
    sec.classList.remove('hidden');
    if(seg) seg.classList.add('probing');
    setConnNote('正在检测该环境是否支持 OAuth 授权',false,true);
    envProbeTimer=setTimeout(function(){
      envProbeTimer=null;
      envConnSupported=probeAuthSupport(url);
      envConnBlocked=connBlockedReason();
      if(seg) seg.classList.remove('probing');
      /* 探测结果只用来决定 OAuth 能不能选。不支持就退回第三方应用，
         原因由说明行讲；卡片本身已经灰掉，再标一次黄只是重复报警 */
      applyConnMode(envConnBlocked?'cred':envConnMode);
    },900);
  }

  var envConnSeg=$('#envConnSeg');
  if(envConnSeg){
    envConnSeg.addEventListener('click',function(e){
      var opt=e.target.closest('.env-conn-opt');
      if(!opt||opt.disabled) return;
      applyConnMode(opt.getAttribute('data-mode'));
    });
    /* 单选组按方向键换选项，跟系统里的单选按钮一致 */
    envConnSeg.addEventListener('keydown',function(e){
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.key)===-1) return;
      var opts=$$('.env-conn-opt',envConnSeg).filter(function(o){ return !o.disabled; });
      if(opts.length<2) return;
      e.preventDefault();
      var i=opts.indexOf(document.activeElement);
      var next=opts[(i+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)+opts.length)%opts.length];
      next.focus();
      applyConnMode(next.getAttribute('data-mode'));
    });
  }

  /* ---------- 授权流程 ---------- */
  var envAuthorizeModal=$('#envAuthorizeModal');
  var envAuthorizeTimer=null;
  var envAuthorizeTarget=null;   /* 已有环境行，重新授权时用 */
  var envAuthorizeName='';
  var envAuthorizeDc='';         /* 授权页面选定并回传的数据中心 */
  /* 授权申请的 API 清单。来自苍穹的「API 授权清单」，是全局稳定的接口标识，
     授权页面按这份逐条列出让用户确认，回调后原样回填到配置里 */
  var ERP_API_SCOPES=[
    {name:'查询采购订单',    path:'/kapi/v2/scm/pm/PurOrder'},
    {name:'保存采购订单',    path:'/kapi/v2/scm/pm/PurOrder/save'},
    {name:'提交审核采购订单', path:'/kapi/v2/scm/pm/PurOrder/submitAndAudit'},
    {name:'查询采购入库单',  path:'/kapi/v2/scm/im/PurInBill'},
    {name:'查询物料',       path:'/kapi/v2/bd/Material'},
    {name:'查询供应商',      path:'/kapi/v2/bd/Supplier'}
  ];
  function renderScopeList(el,items){
    if(!el) return;
    el.innerHTML='';
    items.forEach(function(it){
      var li=document.createElement('li');
      var nm=document.createElement('span');
      nm.className='env-scope-name'; nm.textContent=it.name;
      var pt=document.createElement('span');
      pt.className='env-scope-path'; pt.textContent=it.path; pt.title=it.path;
      li.appendChild(nm); li.appendChild(pt);
      el.appendChild(li);
    });
  }

  function setAuthorizeState(state){
    ['waiting','failed'].forEach(function(s){
      var el=$('#envAuthorize'+s.charAt(0).toUpperCase()+s.slice(1));
      if(el) el.classList.toggle('hidden',s!==state);
    });
    var alt=$('#envAuthorizeAlt');
    if(alt) alt.textContent=state==='failed'?'重新授权':'没有跳转？重新打开';
  }

  function startAuthorize(item,name){
    envAuthorizeTarget=item||null;
    envAuthorizeName=name||'新环境';
    if(!envAuthorizeModal) return;
    setAuthorizeState('waiting');
    envAuthorizeModal.classList.add('show');
    if(envAuthorizeTimer) clearTimeout(envAuthorizeTimer);
    /* 演示：0.9 秒后「浏览器打开了授权页」。真实实现是拉起系统浏览器，
       随后等 kingdee-lingee:// 协议回调，5 分钟超时 */
    envAuthorizeTimer=setTimeout(function(){
      envAuthorizeTimer=null;
      openConsent();
    },900);
  }

  /* ── 浏览器里的两屏：先登录苍穹，再确认授权。
        这两屏都不是客户端界面，用户是离开客户端之后看到它们的 ── */
  var erpConsentModal=$('#erpConsentModal');
  /* 回调域跟着客户端所在通道走：stable→app.lingee.com，beta→devtest.kingdee.com。
     灵基是公有云，这个域在任何通道下都在客户网络之外，所以授权码必然经过灵基基础设施
     ——整条路成立的前提是苍穹侧强制校验 PKCE，令牌换不走。演示按正式版取值 */
  var LINGEE_CALLBACK='https://app.lingee.com/auth/oauth2/callback?client_type=kingdee-lingee';
  function erpOrigin(){
    return (($('#envUrl').value||'').trim()||'https://erp.example.com').replace(/\/+$/,'');
  }
  /* 系统浏览器里的 ERP 登录态。同一台 ERP 已经登录过（自己登的，或者同事那套
     单点登录带进来的），authorize 端点直接渲染同意页，不再要求登录一次。
     这是走系统浏览器换来的：内嵌 webview 有独立 cookie，拿不到这份登录态。 */
  var erpBrowserSession=null;   /* {host, user} */
  function sameHost(url){
    try{ return !!erpBrowserSession && new URL(url).host===erpBrowserSession.host; }
    catch(e){ return false; }
  }
  function setConsentStep(step,reused){
    var login=$('#consentLogin'), grant=$('#consentGrant'), addr=$('#consentUrl');
    var onGrant=step==='grant';
    var sso=$('#consentSso');
    if(sso) sso.classList.toggle('hidden',!(onGrant&&reused));
    if(login) login.classList.toggle('hidden',onGrant);
    if(grant) grant.classList.toggle('hidden',!onGrant);
    /* 地址栏跟着走：登录页带 redirect，授权页才是 authorize 端点。
       redirect_uri 用客户端当前通道的 baseURL 回调页（客户端已登录灵基，这个域是已知的），
       它再回跳 kingdee-lingee:// 把授权码交给本机。客户 ERP 白名单里只需登记这一个 URL。 */
    if(addr) addr.textContent=onGrant
      ? erpOrigin()+'/oauth2/authorize?client_id=lingee-build&response_type=code'
        +'&code_challenge=…&code_challenge_method=S256'
        +'&redirect_uri='+encodeURIComponent(LINGEE_CALLBACK)+'&state=…'
      : erpOrigin()+'/login?redirect=%2Foauth2%2Fauthorize%3Fclient_id%3Dlingee-build';
    if(onGrant){
      var id=($('#consentDc')&&$('#consentDc').value)||ENV_DATA_CENTERS[0].id;
      $('#consentDcName').textContent=dataCenterName(id);
      $('#consentScopeCount').textContent=String(ERP_API_SCOPES.length);
      renderScopeList($('#consentScopeList'),ERP_API_SCOPES);
    }
  }
  function openConsent(){
    if(!erpConsentModal) return;
    var sel=$('#consentDc');
    if(sel){
      sel.innerHTML='';
      ENV_DATA_CENTERS.forEach(function(d){
        var o=document.createElement('option');
        o.value=d.id; o.textContent=d.name+'（'+d.id+'）';
        sel.appendChild(o);
      });
      /* 重新授权沿用原账套，新增默认落在第一个 */
      sel.value=(envAuthorizeTarget&&envAuthorizeTarget.dataset.envDataCenter)||ENV_DATA_CENTERS[0].id;
    }
    setConsentTab('qr');
    var u=$('#consentUser'); if(u) u.value='';
    var pw=$('#consentPwd'); if(pw) pw.value='';
    /* 已有登录态就跳过登录页，只留下授权确认这一步 */
    var reused=sameHost(erpOrigin());
    setConsentStep(reused?'grant':'login',reused);
    erpConsentModal.classList.add('show');
  }
  function closeConsent(){ if(erpConsentModal) erpConsentModal.classList.remove('show'); }
  function setConsentTab(which){
    var qr=which==='qr';
    var tq=$('#consentTabQr'), tp=$('#consentTabPwd');
    if(tq){ tq.classList.toggle('active',qr); tq.setAttribute('aria-selected',qr?'true':'false'); }
    if(tp){ tp.classList.toggle('active',!qr); tp.setAttribute('aria-selected',qr?'false':'true'); }
    var pq=$('#consentQrPane'), pp=$('#consentPwdPane');
    if(pq) pq.classList.toggle('hidden',!qr);
    if(pp) pp.classList.toggle('hidden',qr);
  }
  var consentTabQr=$('#consentTabQr');
  if(consentTabQr) consentTabQr.addEventListener('click',function(){ setConsentTab('qr'); });
  var consentTabPwd=$('#consentTabPwd');
  if(consentTabPwd) consentTabPwd.addEventListener('click',function(){ setConsentTab('pwd'); });
  function consentLoggedIn(){
    try{ erpBrowserSession={host:new URL(erpOrigin()).host,user:'吴**超'}; }catch(e){ erpBrowserSession=null; }
    setConsentStep('grant',false);
  }
  var consentQr=$('#consentQr');
  if(consentQr) consentQr.addEventListener('click',consentLoggedIn);
  var consentLoginBtn=$('#consentLoginBtn');
  if(consentLoginBtn) consentLoginBtn.addEventListener('click',consentLoggedIn);
  var consentSwitch=$('#consentSwitch');
  if(consentSwitch) consentSwitch.addEventListener('click',function(){
    /* 换人授权就得重新登录：登录态属于浏览器，不属于这条环境配置 */
    erpBrowserSession=null;
    setConsentTab('qr');
    setConsentStep('login',false);
  });

  /* 回调落地：授权成功就把配置写全，拒绝就把配置写成「未授权」。
     两种都写：环境名、地址、授权类型是用户已经填好的，因为对方点了拒绝
     就把它们丢掉，等于逼人再填一遍 */
  function finishAuthorize(granted){
    envAuthorizeDc=($('#consentDc')&&$('#consentDc').value)||ENV_DATA_CENTERS[0].id;
    closeConsent();
    if(envAuthorizeTarget){
      var t=envAuthorizeTarget;
      t.dataset.envConn='auth';
      if(granted){
        t.dataset.grantState='';
        t.dataset.grantedBy='吴**超';
        t.dataset.grantedAt='今天';
        t.dataset.lastUsed='刚刚';
        t.dataset.envDataCenter=envAuthorizeDc;
      }else{
        t.dataset.grantState=t.dataset.grantedBy?'revoked':'none';
      }
      syncConnTag(t);
    }else{
      addAuthEnvRow(envAuthorizeName,envAuthorizeDc,granted);
    }
    closeAuthorize();
    closeEnvModal();
    toast(granted?('已连接：'+envAuthorizeName):('已保存：'+envAuthorizeName+'（未授权）'));
  }
  var consentAllow=$('#consentAllow');
  if(consentAllow) consentAllow.addEventListener('click',function(){ finishAuthorize(true); });
  var consentDeny=$('#consentDeny');
  if(consentDeny) consentDeny.addEventListener('click',function(){ finishAuthorize(false); });
  function closeAuthorize(){
    if(envAuthorizeTimer){ clearTimeout(envAuthorizeTimer); envAuthorizeTimer=null; }
    closeConsent();
    if(envAuthorizeModal) envAuthorizeModal.classList.remove('show');
  }

  var envAuthorizeAlt=$('#envAuthorizeAlt');
  if(envAuthorizeAlt) envAuthorizeAlt.addEventListener('click',function(){
    /* 演示：等待态点一次进入唤起失败，失败态点一次重新等待 */
    if($('#envAuthorizeFailed')&&!$('#envAuthorizeFailed').classList.contains('hidden')){
      startAuthorize(envAuthorizeTarget,envAuthorizeName);
    }else{
      if(envAuthorizeTimer){ clearTimeout(envAuthorizeTimer); envAuthorizeTimer=null; }
      setAuthorizeState('failed');
    }
  });
  ['#envAuthorizeClose','#envAuthorizeCancel'].forEach(function(sel){
    var b=$(sel); if(b) b.addEventListener('click',closeAuthorize);
  });

  /* ---------- 断开连接 ---------- */
  var envDisconnectModal=$('#envDisconnectModal');
  var envDisconnectTarget=null;
  function openDisconnect(item,name){
    envDisconnectTarget=item||null;
    var n=$('#envDisconnectName'); if(n) n.textContent=name||'该环境';
    if(envDisconnectModal) envDisconnectModal.classList.add('show');
  }
  function closeDisconnect(){ if(envDisconnectModal) envDisconnectModal.classList.remove('show'); }
  ['#envDisconnectClose','#envDisconnectCancel'].forEach(function(sel){
    var b=$(sel); if(b) b.addEventListener('click',closeDisconnect);
  });
  var envDisconnectConfirm=$('#envDisconnectConfirm');
  if(envDisconnectConfirm) envDisconnectConfirm.addEventListener('click',function(){
    /* 两步都要做：调撤销端点让服务端作废授权记录，再删本地令牌。
       只删本地是「本地遗忘」，令牌在 ERP 侧仍然有效到自然过期 */
    /* 断开不改授权类型：环境仍然是 OAuth，只是回到「未授权」，重新授权就能用 */
    if(envDisconnectTarget){
      envDisconnectTarget.dataset.grantState='revoked';
      syncConnTag(envDisconnectTarget);
    }
    closeDisconnect();
    closeEnvModal();
  });
  /* 认证态以「是否普通 AccessToken 认证」表达：启用后隐藏代理用户，且不可回退 */
  function setNormalAuthEnabled(enabled){
    envNormalAuthEnabled=!!enabled;
    /* 「代理用户控制」提示只在走普通 AccessToken 时才该出现：仍用代理用户认证的
       环境反而需要它开着，这时候弹这句话是自相矛盾的。 */
    var createNotice=$('#envCreateNotice');
    if(createNotice) createNotice.classList.toggle('hidden',!envNormalAuthEnabled);
    var authSwitch=$('#envAuthSwitch');
    var authState=$('#envAuthState');
    var authDesc=$('#envAuthDesc');
    var proxyUserField=$('#envProxyUserField');
    var proxyUser=$('#envProxyUser');
    if(authSwitch){
      authSwitch.classList.toggle('on',envNormalAuthEnabled);
      authSwitch.setAttribute('aria-checked',envNormalAuthEnabled?'true':'false');
    }
    if(authState){
      authState.textContent=envNormalAuthEnabled?'已启用':'未启用';
      authState.classList.toggle('enabled',envNormalAuthEnabled);
    }
    if(authDesc) authDesc.textContent=envNormalAuthEnabled
      ?'保存后切换为普通 AccessToken 认证，且不能切回原有认证方式。请先在 ERP 第三方应用中关闭「代理用户控制」。'
      :'该环境仍使用历史认证方式，需要填写代理用户。启用普通 AccessToken 认证后不可恢复。';
    /* 未启用普通 AccessToken 时才需要代理用户 */
    if(proxyUserField) proxyUserField.classList.toggle('hidden',envNormalAuthEnabled);
    if(proxyUser) proxyUser.required=!envNormalAuthEnabled;
  }
  /* 不可逆二次确认：只拦「未启用 → 启用」方向；保存前关回去无需确认 */
  var envAuthConfirmModal=$('#envAuthConfirmModal');
  function closeAuthConfirm(){ if(envAuthConfirmModal) envAuthConfirmModal.classList.remove('show'); }
  var envAuthSwitch=$('#envAuthSwitch');
  if(envAuthSwitch) envAuthSwitch.addEventListener('click',function(){
    if(envAuthSwitch.disabled) return;
    if(envNormalAuthEnabled){ setNormalAuthEnabled(false); return; }
    if(envAuthConfirmModal) envAuthConfirmModal.classList.add('show');
  });
  ['#envAuthConfirmClose','#envAuthConfirmCancel'].forEach(function(sel){
    var b=$(sel); if(b) b.addEventListener('click',closeAuthConfirm);
  });
  var envAuthConfirmOk=$('#envAuthConfirmOk');
  if(envAuthConfirmOk) envAuthConfirmOk.addEventListener('click',function(){
    closeAuthConfirm();
    setNormalAuthEnabled(true);
  });
  if(envAuthConfirmModal) envAuthConfirmModal.addEventListener('click',function(e){
    if(e.target===envAuthConfirmModal) closeAuthConfirm();
  });
  function setEnvProduct(product){
    envProduct=product;
    if(envProductSelect&&envProductSelect.value!==product) envProductSelect.value=product;
    var gatewayField=$('#envGatewayField');
    var gateway=$('#envGateway');
    var needsGateway=product==='XK';
    if(gatewayField) gatewayField.classList.toggle('hidden',!needsGateway);
    if(gateway){
      gateway.required=needsGateway;
      if(!needsGateway) gateway.value='';
    }
  }
  if(envProductSelect) envProductSelect.addEventListener('change',function(){
    setEnvProduct(this.value);
    if(envMode==='edit'&&this.value==='XK'&&envOriginalProduct==='XK') $('#envGateway').value=envMaskedValue;
  });
  /* ── 校验：一次性报出全部错误 ──
     早期版本用 form.reportValidity()，浏览器每次只弹第一个不合规字段，
     用户填一个再报一个，一个空表单要来回点好几轮。这里改成自己标。 */
  function envFieldOf(el){ return el?el.closest('.env-field'):null; }
  function setEnvFieldError(el,msg){
    var f=envFieldOf(el); if(!f) return;
    var err=f.querySelector('.env-err');
    if(!err){ err=document.createElement('small'); err.className='env-err'; f.appendChild(err); }
    err.textContent=msg||'';
    f.classList.toggle('invalid',!!msg);
  }
  function clearEnvErrors(){
    $$('#envConfigForm .env-field').forEach(function(f){
      f.classList.remove('invalid');
      var e=f.querySelector('.env-err'); if(e) e.textContent='';
    });
  }
  /* 地址归一化：补协议头、去 query/hash、去尾斜杠 */
  function normalizeEnvUrl(raw){
    var t=String(raw||'').trim().replace(/\/+$/,'');
    if(!t) return '';
    var out;
    if(/^https?:\/\//i.test(t)) out=t;
    else{ var m=t.match(/^(https?):\/*(.*)$/i); out=m?(m[1].toLowerCase()+'://'+m[2]):('http://'+t); }
    try{ var u=new URL(out); return (u.origin+u.pathname).replace(/\/+$/,''); }catch(e){ return out; }
  }
  function isVisibleField(el){
    var f=envFieldOf(el);
    if(!f||f.classList.contains('hidden')) return false;
    var sec=f.closest('.env-form-section');
    return !(sec&&sec.classList.contains('hidden'));
  }
  function validateEnvForm(){
    clearEnvErrors();
    var ok=true;
    var nameInput=$('#envName'), urlInput=$('#envUrl');
    var name=(nameInput.value||'').trim();
    if(!name){ setEnvFieldError(nameInput,'请输入环境名'); ok=false; }
    else if(envMode==='create'){
      var dup=$$('#view-settings .env-item .env-name').some(function(n){
        return n.textContent.trim()===name;
      });
      if(dup){ setEnvFieldError(nameInput,'环境名已存在'); ok=false; }
    }
    var url=(urlInput.value||'').trim();
    if(!url){ setEnvFieldError(urlInput,'请输入环境地址'); ok=false; }
    else{
      var n=normalizeEnvUrl(url);
      if(n!==urlInput.value) urlInput.value=n;
      try{
        if(/\/[^/]+\.(?:html?|jsp|php|aspx?|do)$/i.test(new URL(n).pathname)){
          setEnvFieldError(urlInput,'地址不应包含页面文件名，请填写 ERP 服务根地址'); ok=false;
        }
      }catch(e){ /* 归一化后仍非法：交给接口调用时报错 */ }
    }
    if(!envProductSelect.value){ setEnvFieldError(envProductSelect,'请选择环境类型'); ok=false; }
    var dc=$('#envDataCenter');
    if(!dc.value){ setEnvFieldError(dc,'请选择数据中心'); ok=false; }
    var clientId=$('#envClientId');
    if(!(clientId.value||'').trim()){ setEnvFieldError(clientId,'请输入第三方应用 ID'); ok=false; }
    var secret=$('#envClientSecret');
    if(!(secret.value||'').trim()){ setEnvFieldError(secret,'请输入第三方应用密钥'); ok=false; }
    var gateway=$('#envGateway');
    if(isVisibleField(gateway)&&!(gateway.value||'').trim()){
      setEnvFieldError(gateway,'请输入网关标识'); ok=false;
    }
    var proxy=$('#envProxyUser');
    if(isVisibleField(proxy)&&!(proxy.value||'').trim()){
      setEnvFieldError(proxy,'请输入代理用户'); ok=false;
    }
    return ok;
  }
  function openEnvModal(mode,item){
    if(!envModal)return;
    envMode=mode==='view'?'view':(mode==='edit'?'edit':'create');
    envEditItem=envMode==='create'?null:item;
    envOriginalProduct=envEditItem?(envEditItem.dataset.envProduct||''):'';
    if(envConfigForm) envConfigForm.reset();
    clearEnvErrors();
    var editing=envMode==='edit'&&envEditItem;
    var viewing=envMode==='view'&&envEditItem;
    var existing=editing||viewing;
    var nameInput=$('#envName');
    var urlInput=$('#envUrl');
    var dataCenterSelect=$('#envDataCenter');
    var clientSecret=$('#envClientSecret');
    var clientId=$('#envClientId');
    var gateway=$('#envGateway');
    var proxyUser=$('#envProxyUser');
    var authSwitch=$('#envAuthSwitch');
    var defaultCheckbox=$('#envDefault');
    var confirmButton=$('#envModalConfirm');
    var cancelButton=$('#envModalCancel');
    $('#envModalTitle').textContent=viewing?'查看 ERP 环境':(editing?'编辑 ERP 环境':'新增 ERP 环境');
    $('#envSecretRequired').classList.remove('hidden');
    $('#envGatewayRequired').classList.remove('hidden');
    nameInput.readOnly=!!existing;
    urlInput.readOnly=!!existing;
    envProductSelect.disabled=!!existing;
    dataCenterSelect.disabled=!!existing;
    clientId.readOnly=!!viewing;
    clientSecret.readOnly=!!viewing;
    gateway.readOnly=!!viewing;
    proxyUser.readOnly=!!viewing;
    authSwitch.disabled=!!viewing;
    defaultCheckbox.disabled=false;
    confirmButton.classList.remove('hidden');
    confirmButton.textContent='保存';
    cancelButton.textContent=viewing?'关闭':'取消';
    clientSecret.required=true;
    if(existing){
      nameInput.value=envEditItem.querySelector('.env-name').textContent.trim();
      urlInput.value=envEditItem.querySelector('.env-url').textContent.trim();
      renderDataCenters(true,envEditItem.dataset.envDataCenter||'1561691182942805271');
      $('#envClientId').value=envEditItem.dataset.envClientId||'';
      $('#envDefault').checked=!!envEditItem.querySelector('.env-tag.def');
      setEnvProduct(envOriginalProduct||'XH');
      clientSecret.value=envMaskedValue;
      $('#envGateway').value=envOriginalProduct==='XK'?envMaskedValue:'';
      /* 已启用普通 AccessToken 的环境不再展示认证区块（迁移不可回退） */
      var normalAuth=envEditItem.dataset.normalAccessToken!=='false';
      $('#envLegacyAuthSection').classList.toggle('hidden',normalAuth);
      $('#envProxyUser').value=normalAuth?'':(envEditItem.dataset.proxyUser||'');
      setNormalAuthEnabled(normalAuth);
    }else{
      $('#envClientId').value='';
      renderDataCenters(false,'');
      $('#envLegacyAuthSection').classList.add('hidden');
      $('#envProxyUser').value='';
      setNormalAuthEnabled(true);
      setEnvProduct('');
    }
    /* 连接方式：编辑/查看态按已存模式渲染，新增态等地址填完再探测 */
    resetConnSection();
    if(existing){
      envConnSupported=envEditItem.dataset.envConn==='auth'||probeAuthSupport(urlInput.value);
      envConnBlocked='';
      $('#envConnSection').classList.remove('hidden');
      applyConnMode(envEditItem.dataset.envConn==='auth'?'auth':'cred');
    }else{
      $('#envConnSection').classList.remove('hidden');
      applyConnMode('auth');
    }
    syncDcRefresh();
    envModal.classList.add('show');
    /* 只在新增时聚焦环境名：编辑/查看态它是只读的，聚焦只会画出一圈没有意义的焦点环 */
    setTimeout(function(){ if(nameInput && !existing) nameInput.focus(); },60);
  }
  function closeEnvModal(){ if(envModal) envModal.classList.remove('show'); resetConnSection(); }
  /* 地址变了就丢弃已选数据中心：旧数据中心不属于新地址 */
  var envUrlInput=$('#envUrl');
  if(envUrlInput){
    envUrlInput.addEventListener('input',function(){
      var dc=$('#envDataCenter');
      if(dc&&dc.value){ dc.value=''; setEnvFieldError(dc,''); }
      setEnvFieldError(envUrlInput,'');
      syncDcRefresh();
    });
    envUrlInput.addEventListener('blur',function(){
      /* 地址清空只是回到「还没探测」，授权类型该摆着还是摆着 */
      if(!(envUrlInput.value||'').trim()){
        if(envProbeTimer){ clearTimeout(envProbeTimer); envProbeTimer=null; }
        envConnSupported=false; envConnBlocked='';
        var seg0=$('#envConnSeg'); if(seg0) seg0.classList.remove('probing');
        applyConnMode(envConnMode);
        return;
      }
      envUrlInput.value=normalizeEnvUrl(envUrlInput.value);
      runProbe(envUrlInput.value);
      /* 地址填完静默拉一次；失败不打扰，用户还可以点「重新拉取」 */
      var dc=$('#envDataCenter');
      if(envMode==='create'&&dc&&dc.options.length<2) loadDataCenters();
    });
  }
  var envAuthScopeToggle=$('#envAuthScopeToggle');
  if(envAuthScopeToggle) envAuthScopeToggle.addEventListener('click',function(){
    var list=$('#envAuthScopeList'); if(!list) return;
    var open=list.classList.contains('hidden');
    list.classList.toggle('hidden',!open);
    envAuthScopeToggle.setAttribute('aria-expanded',open?'true':'false');
  });

  var envDcRefreshBtn=$('#envDcRefresh');
  if(envDcRefreshBtn) envDcRefreshBtn.addEventListener('click',function(){
    var url=$('#envUrl');
    if(!((url&&url.value||'').trim())){ setEnvFieldError(url,'请输入环境地址'); return; }
    loadDataCenters();
  });

  var envDisconnectBtn=$('#envDisconnect');
  if(envDisconnectBtn) envDisconnectBtn.addEventListener('click',function(){
    openDisconnect(envEditItem,$('#envName').value||'');
  });
  var envReauthBtn=$('#envReauth');
  if(envReauthBtn) envReauthBtn.addEventListener('click',function(){
    startAuthorize(envEditItem,$('#envName').value||'');
  });
  var envAdd=$('#envAdd');
  if(envAdd) envAdd.addEventListener('click',function(){ openEnvModal('create'); });
  ['#envModalClose','#envModalCancel'].forEach(function(sel){
    var b=$(sel); if(b) b.addEventListener('click',closeEnvModal);
  });
  if(envModal) envModal.addEventListener('click',function(e){ if(e.target===envModal) closeEnvModal(); });
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape') return;
    /* 二次确认浮在配置弹窗之上，Escape 先关它 */
    if(envAuthConfirmModal&&envAuthConfirmModal.classList.contains('show')){ closeAuthConfirm(); return; }
    if(envModal&&envModal.classList.contains('show')) closeEnvModal();
  });
  var envTest=$('#envTest');
  if(envTest){
    envTest.addEventListener('click',function(){
      if(!envConfigForm||!validateEnvForm()) return;
      envTest.disabled=true;
      envTest.textContent='测试中…';
      setTimeout(function(){
        envTest.disabled=false;
        envTest.textContent='测试连接';
        toast('连接测试通过');
      },700);
    });
  }
  if(envConfigForm){
    envConfigForm.addEventListener('submit',function(e){
      e.preventDefault();
      if(envMode==='view'&&envEditItem){
        var viewList=$('#view-settings .env-list');
        var viewIsDefault=$('#envDefault').checked;
        if(viewIsDefault){
          $$('.env-tag.def',viewList).forEach(function(t){t.remove()});
          var viewHead=envEditItem.querySelector('.env-head');
          var viewTag=document.createElement('span');
          viewTag.className='env-tag def'; viewTag.textContent='默认';
          viewHead.insertBefore(viewTag,viewHead.querySelector('.env-tag'));
        }else{
          var viewOldDefault=envEditItem.querySelector('.env-tag.def');
          if(viewOldDefault) viewOldDefault.remove();
        }
        closeEnvModal();
        toast('已更新默认环境设置');
        return;
      }
      /* 选了 OAuth 的新增：不落盘，先去浏览器换令牌，回调成功后才写配置 */
      if(envConnMode==='auth'&&envMode==='create'){
        var authName=($('#envName').value||'').trim();
        var authUrl=($('#envUrl').value||'').trim();
        var okName=true;
        if(!authName){ setEnvFieldError($('#envName'),'请输入环境名'); okName=false; }
        if(!authUrl){ setEnvFieldError($('#envUrl'),'请输入环境地址'); okName=false; }
        if(!okName) return;
        startAuthorize(null,authName);
        return;
      }
      if(!validateEnvForm()) return;
      var name=($('#envName').value||'').trim();
      var url=($('#envUrl').value||'').trim();
      var type=envProduct==='XK'?'AI 套件':'AI 星瀚';
      var isDef=$('#envDefault').checked;
      var list=$('#view-settings .env-list');
      if(envMode==='edit'&&envEditItem){
        envEditItem.querySelector('.env-name').textContent=name;
        envEditItem.querySelector('.env-url').textContent=url;
        envEditItem.dataset.envProduct=envProduct;
        envEditItem.dataset.envDataCenter=$('#envDataCenter').value;
        envEditItem.dataset.envClientId=($('#envClientId').value||'').trim();
        var secret=($('#envClientSecret').value||'').trim();
        var gateway=($('#envGateway').value||'').trim();
        if(secret&&secret!==envMaskedValue) envEditItem.dataset.envClientSecret=secret;
        if(gateway&&gateway!==envMaskedValue) envEditItem.dataset.envGateway=gateway;
        else if(envProduct!=='XK') delete envEditItem.dataset.envGateway;
        syncProductTag(envEditItem,envProduct);
        var wasNormalAuth=envEditItem.dataset.normalAccessToken!=='false';
        envEditItem.dataset.normalAccessToken=envNormalAuthEnabled?'true':'false';
        if(envNormalAuthEnabled){
          delete envEditItem.dataset.proxyUser;
        }else{
          envEditItem.dataset.proxyUser=($('#envProxyUser').value||'').trim();
        }
        syncAuthTag(envEditItem);
        syncConnTag(envEditItem);
        if(isDef){
          $$('.env-tag.def',list).forEach(function(t){t.remove()});
          var editHead=envEditItem.querySelector('.env-head');
          var editTag=document.createElement('span');
          editTag.className='env-tag def'; editTag.textContent='默认';
          editHead.insertBefore(editTag,editHead.querySelector('.env-tag'));
        }else{
          var oldDefault=envEditItem.querySelector('.env-tag.def');
          if(oldDefault) oldDefault.remove();
        }
        closeEnvModal();
        toast(!wasNormalAuth&&envNormalAuthEnabled
          ?'已更新环境并切换为普通 AccessToken 认证：'+name
          :'已更新环境：'+name);
        return;
      }
      if(isDef) $$('.env-tag.def',list).forEach(function(t){t.remove()});
      var item=document.createElement('div');
      item.className='env-item';
      item.dataset.envProduct=envProduct;
      item.dataset.envSource='local';
      item.dataset.envDataCenter=$('#envDataCenter').value;
      item.dataset.envClientId=($('#envClientId').value||'').trim();
      item.dataset.envClientSecret=($('#envClientSecret').value||'').trim();
      item.dataset.normalAccessToken='true';
      if(envProduct==='XK') item.dataset.envGateway=($('#envGateway').value||'').trim();
      item.innerHTML='<div class="env-main"><div class="env-head"><span class="env-name"></span>'
        +(isDef?'<span class="env-tag def">默认</span>':'')
        +'<span class="env-tag '+item.dataset.envSource+'">'+(item.dataset.envSource==='cloud'?'云端':'本地')+'</span></div>'
        +'<div class="env-url"></div></div>'
        +'<div class="env-more-wrap"><button class="env-more" data-tooltip="更多" aria-label="更多" aria-haspopup="true">'
        +'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>'
        +'<div class="env-menu"><div class="env-mi" data-act="edit">编辑</div><div class="env-mi" data-act="test">测试连接</div><div class="env-mi" data-act="copy">复制地址</div><div class="env-mi" data-act="default">设为默认</div><div class="env-mi-sep"></div><div class="env-mi danger" data-act="delete">删除</div></div></div>';
      item.querySelector('.env-name').textContent=name;
      item.querySelector('.env-url').textContent=url;
      item.dataset.envConn='cred';
      syncConnTag(item);
      bindEnvMore(item.querySelector('.env-more'));
      list.appendChild(item);
      closeEnvModal();
      toast('已新增环境：'+name);
    });
  }

  /* 授权成功后建行。地址和数据中心由授权结果决定，不再从表单取 */
  function addAuthEnvRow(name,dataCenterId,granted){
    var list=$('#view-settings .env-list');
    if(!list) return;
    var isDef=$('#envDefault')&&$('#envDefault').checked;
    if(isDef) $$('.env-tag.def',list).forEach(function(t){t.remove()});
    var url=($('#envUrl').value||'').trim()||'https://example.com/ierp';
    var item=document.createElement('div');
    item.className='env-item';
    item.dataset.envSource='local';
    item.dataset.envConn='auth';
    /* 环境类型和数据中心都由 ERP 在授权时确定，本机不猜 */
    item.dataset.envProduct='';
    item.dataset.envDataCenter=dataCenterId||ENV_DATA_CENTERS[0].id;
    item.dataset.normalAccessToken='true';
    if(granted){
      item.dataset.grantedBy='吴**超';
      item.dataset.grantedAt='今天';
      item.dataset.lastUsed='刚刚';
    }else{
      item.dataset.grantState='none';
    }
    item.innerHTML='<div class="env-main"><div class="env-head"><span class="env-name"></span>'
      +(isDef?'<span class="env-tag def">默认</span>':'')
      +'<span class="env-tag local">本地</span></div>'
      +'<div class="env-url"></div></div>'
      +'<div class="env-more-wrap"><button class="env-more" data-tooltip="更多" aria-label="更多" aria-haspopup="true">'
      +'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>'
      +'<div class="env-menu"><div class="env-mi" data-act="edit">编辑</div><div class="env-mi" data-act="copy">复制地址</div><div class="env-mi" data-act="default">设为默认</div><div class="env-mi-sep"></div><div class="env-mi danger" data-act="delete">删除</div></div></div>';
    item.querySelector('.env-name').textContent=name;
    item.querySelector('.env-url').textContent=url;
    syncConnTag(item);
    bindEnvMore(item.querySelector('.env-more'));
    list.appendChild(item);
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
  $('.btn-new') && $('.btn-new').addEventListener('click',function(){ toast('新建应用（示意）'); });
  $$('.app-card').forEach(function(c){
    c.addEventListener('click',function(e){
      if(e.target.closest('.card-more')){ e.stopPropagation(); toast('更多操作'); return; }
      toast('打开应用：'+$('.card-title',c).textContent.trim());
    });
  });

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
  function refreshSend(){ sendBtn.classList.toggle('active', input.textContent.trim().length>0); }
  input.addEventListener('input',refreshSend);
  input.addEventListener('keydown',function(e){
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); doSend(); }
  });
  sendBtn.addEventListener('click',doSend);
  var chatMessages=$('#chatMessages');
  var messagesList=$('#messagesList');
  function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function scrollChatBottom(){ chatMessages.scrollTop=chatMessages.scrollHeight; }

  function appendUserMessage(text){
    var msg=document.createElement('div');
    msg.className='message user';
    msg.innerHTML='<div class="message-content"><p>'+escapeHtml(text)+'</p></div>';
    messagesList.appendChild(msg);
    scrollChatBottom();
  }

  function appendAssistantMessage(){
    var msg=document.createElement('div');
    msg.className='message assistant';
    msg.innerHTML='<div class="message-content"><div class="assistant-response"></div></div>';
    messagesList.appendChild(msg);
    return msg.querySelector('.assistant-response');
  }

  function createWorkStep(title,status){
    var step=document.createElement('div');
    step.className='work-step '+status;
    var iconHtml=status==='done'
      ?'<svg class="step-icon done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
      :'<svg class="step-icon running" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
    var statusHtml=status==='running'?'<span class="step-status">执行中…</span>':'';
    step.innerHTML='<div class="step-header">'
      +'<div class="step-left">'+iconHtml+'<span class="step-title">'+title+'</span></div>'
      +'<div class="step-right">'+statusHtml+'</div>'
      +'</div>';
    return step;
  }

  function createFinalResult(){
    var result=document.createElement('div');
    result.className='work-step done final-step';
    result.innerHTML='<div class="step-header">'
      +'<div class="step-left">'
      +'<svg class="step-icon done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>'
      +'<span class="step-title">生成结果</span></div>'
      +'</div>'
      +'<div class="markdown-content"></div>';
    return result;
  }

  function createArtifactCard(){
    var card=document.createElement('div');
    card.className='artifact-card';
    card.innerHTML='<div class="artifact-preview"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></div>'
      +'<div class="artifact-info"><div class="artifact-title">采购订单</div></div>'
      +'<div class="artifact-action"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg></div>';
    function openPreview(){
      var view=document.getElementById('view-chat');
      var frame=document.getElementById('chatPreviewFrame');
      if(frame){
        var html=billTemplateWithTokens;
        var blob=new Blob([html],{type:'text/html'});
        frame.src=URL.createObjectURL(blob);
        view.classList.add('preview-open');
        if(typeof syncTogglePreviewBtn==='function') syncTogglePreviewBtn();
        try{localStorage.setItem('chatPreviewOpen','1')}catch(e){}
        var savedW=localStorage.getItem('chatPreviewWidth');
        var ps=document.getElementById('chatPreviewSide');
        if(savedW&&ps){ps.style.width=savedW;ps.style.maxWidth='none';}
      }
    }
    card.addEventListener('click',openPreview); /* 仅点击卡片时展开预览 */
    card._openPreview=openPreview;
    return card;
  }
  /* 预览面板关闭按钮 */
  var chatPreviewCloseBtn=$('#chatPreviewClose');
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
  /* 预览面板页签切换 */
  function switchPreviewTab(target){
    $$('.preview-tab').forEach(function(t){t.classList.toggle('active',t.getAttribute('data-tab')===target)});
    var bodies={preview:$('#previewBodyPreview'),list:$('#previewBodyList'),entity:$('#previewBodyEntity'),plugin:$('#previewBodyPlugin'),api:$('#previewBodyApi')};
    Object.keys(bodies).forEach(function(k){
      if(bodies[k]){bodies[k].classList.toggle('hidden',k!==target)}
    });
    var nav=$('#previewNav');
    if(nav){nav.classList.toggle('hidden',target!=='preview')}
    try{localStorage.setItem('chatPreviewTab',target)}catch(e){}
  }
  $$('.preview-tab').forEach(function(tab){
    tab.addEventListener('click',function(){
      switchPreviewTab(tab.getAttribute('data-tab'));
    });
  });
  /* 列表勾选联动行高亮 */
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

  var mockReplies=[
    '已完成采购订单管理应用的开发，以下是实现方案：\n\n## 功能模块\n\n**1. 采购订单创建**\n- 支持选择供应商、采购员、币别、付款条件\n- 明细行可添加物料编码、名称、规格、数量、单价\n- 自动计算含税金额、折扣金额、总金额\n\n**2. 审批流程**\n- 草稿 → 提交 → 部门主管审核 → 财务复核 → 总经理审批（金额>10万触发）\n- 审批意见可追溯，支持驳回退回至草稿\n\n**3. 变更与关闭**\n- 已审核订单支持变更，记录变更前后差异\n- 支持手工关闭和自动关闭（到货完成后自动关闭）\n\n## 技术要点\n- 基于苍穹平台 DynamicObject 实现单据模型，主表 + 明细表关联\n- 使用 QFilter 构建多维度查询（供应商、日期范围、单据状态）\n- 审批流集成 ProcessPlugin，支持节点回退和会签\n\n如需调整字段或流程配置，随时告诉我。',
    '采购订单管理应用开发完成，核心交付内容如下：\n\n**已完成模块：**\n1. 采购订单单据模型（含 32 个字段，覆盖供应商、采购组织、明细行等）\n2. 列表页与详情页（支持批量审核、按状态筛选、模糊搜索）\n3. 审批流程（三级审核：部门主管 → 财务 → 总经理）\n4. 报表导出（PDF / Excel，支持自定义模板）\n\n**关键实现：**\n- 明细行金额自动计算：含税金额 = 数量 × 含税单价，折扣金额自动倒算\n- 供应商联动带出付款条件、币别、默认税率\n- 采购订单与入库单上下游联动，支持部分到货和分批入库\n\n**性能指标：**\n- 列表查询响应 < 200ms（万级数据量）\n- 审批提交 < 500ms\n\n可以直接发布到测试环境验证，或需要我调整某些细节？',
    '基于采购订单管理需求，已完成应用搭建，以下是关键设计：\n\n## 数据模型\n- **采购订单主表**：单据编号、供应商、采购组织、币别、付款条件、交货日期、采购员\n- **采购订单明细**：物料编码、物料名称、规格型号、采购数量、单位、含税单价、金额、税率\n\n## 页面布局\n- 列表页：按单据状态（草稿 → 已提交 → 已审核 → 已关闭）分类筛选\n- 详情页：头信息 + 明细行 + 审批记录三段式布局\n- 支持从采购申请单下推生成采购订单，自动带出明细行\n\n## 业务规则\n1. 同一供应商同月采购金额超 50 万，自动触发总经理审批\n2. 含税金额 = 数量 × 含税单价，折扣金额 = 不含税金额 × 折扣率\n3. 到货数量不可超过采购数量，超量时拦截并提示\n4. 已关闭订单不允许生成入库单\n\n需要我针对哪个模块进一步展开说明？'
  ];

  /* simple markdown → HTML renderer */
  function renderMarkdown(text){
    var html=escapeHtml(text);
    html=html.replace(/^### (.+)$/gm,'<h3>$1</h3>');
    html=html.replace(/^## (.+)$/gm,'<h2>$1</h2>');
    html=html.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    html=html.replace(/`([^`]+)`/g,'<code>$1</code>');
    var lines=html.split('\n');
    var out=[];
    var inUl=false,inOl=false;
    for(var i=0;i<lines.length;i++){
      var line=lines[i];
      if(/^\- (.+)$/.test(line)){
        if(!inUl){out.push('<ul>');inUl=true;}
        out.push('<li>'+line.replace(/^\- /,'')+'</li>');
      } else if(/^\d+\. (.+)$/.test(line)){
        if(!inOl){out.push('<ol>');inOl=true;}
        out.push('<li>'+line.replace(/^\d+\. /,'')+'</li>');
      } else {
        if(inUl){out.push('</ul>');inUl=false;}
        if(inOl){out.push('</ol>');inOl=false;}
        if(line.trim()===''){out.push('');}
        else if(/^<(h[23]|ul|ol|li)/.test(line)){out.push(line);}
        else out.push('<p>'+line+'</p>');
      }
    }
    if(inUl)out.push('</ul>');
    if(inOl)out.push('</ol>');
    return out.join('\n');
  }

  function streamText(targetEl,text,onDone){
    var idx=0;
    var cursor=document.createElement('span');
    cursor.className='cursor-blink';
    cursor.textContent='▌';
    targetEl.appendChild(cursor);
    targetEl.style.whiteSpace='pre-wrap';
    targetEl.style.wordBreak='break-word';
    var timer=null,done=false;
    function finish(){
      if(done) return;
      done=true;
      clearTimeout(timer);
      cursor.remove();
      targetEl.innerHTML=renderMarkdown(text);
      targetEl.style.whiteSpace='';
      targetEl.style.wordBreak='';
      document.removeEventListener('keydown',finish);
      document.removeEventListener('click',finish);
      if(onDone) onDone();
    }
    function typeNext(){
      if(done) return;
      if(idx<text.length){
        cursor.insertAdjacentText('beforebegin',text[idx]);
        idx++;
        scrollChatBottom();
        var delay=text[idx-1]==='\n'?80:Math.random()*20+15;
        timer=setTimeout(typeNext,delay);
      }else{
        finish();
      }
    }
    document.addEventListener('keydown',finish);
    document.addEventListener('click',finish);
    typeNext();
  }

  /* 预览区开关状态：以 localStorage 为唯一来源，默认收起 */
  function syncPreviewOpen(artifact){
    var apply=function(){
      var v=document.getElementById('view-chat');
      if(!v)return;
      if(localStorage.getItem('chatPreviewOpen')==='1'){
        if(!v.classList.contains('preview-open')&&artifact&&artifact._openPreview) artifact._openPreview();
        /* 恢复预览页签选择 */
        var savedTab='preview';
        try{savedTab=localStorage.getItem('chatPreviewTab')||'preview'}catch(e){}
        switchPreviewTab(savedTab);
      }else{
        v.classList.remove('preview-open');
        var ps=document.getElementById('chatPreviewSide');
        if(ps){ps.style.width='';ps.style.maxWidth='';}
      }
    };
    apply();
    /* 初始化中若有其它逻辑改动了面板，再以存储值校正一次 */
    requestAnimationFrame(apply);
  }
  function simulateAIResponse(responseEl,instant){
    var steps=[{title:'需求分析'},{title:'开发页面'},{title:'测试验收'}];
    var timeline=document.createElement('div');
    timeline.className='work-steps';
    responseEl.appendChild(timeline);

    if(instant){
      steps.forEach(function(s){
        timeline.appendChild(createWorkStep(s.title,'done'));
      });
      var result=createFinalResult();
      timeline.appendChild(result);
      var mc=result.querySelector('.markdown-content');
      var text=mockReplies[Math.floor(Math.random()*mockReplies.length)];
      mc.innerHTML=renderMarkdown(text);
      var artifact=createArtifactCard();
      result.appendChild(artifact);
      scrollChatBottom(); /* 预览区保持收起，等待用户点击产物卡片 */
      /* 预览区开关完全由 chatPreviewOpen 决定；默认收起 */
      syncPreviewOpen(artifact);
      return;
    }

    var stepEls=[];
    var currentStepIdx=0;

    function addNextStep(){
      if(currentStepIdx>=steps.length){
        var result=createFinalResult();
        timeline.appendChild(result);
        var mc=result.querySelector('.markdown-content');
        var text=mockReplies[Math.floor(Math.random()*mockReplies.length)];
        streamText(mc,text,function(){
          var artifact=createArtifactCard();
          result.appendChild(artifact);
          scrollChatBottom();
        });
        return;
      }
      var step=createWorkStep(steps[currentStepIdx].title,'running');
      timeline.appendChild(step);
      stepEls.push(step);
      scrollChatBottom();
      setTimeout(function(){
        step.classList.remove('running');
        step.classList.add('done');
        var icon=step.querySelector('.step-icon');
        icon.className='step-icon done';
        icon.innerHTML='<path d="M20 6 9 17l-5-5"/>';
        step.querySelector('.step-status')&&step.querySelector('.step-status').remove();
        currentStepIdx++;
        setTimeout(addNextStep,300);
      },800+Math.random()*600);
    }
    addNextStep();
  }

  function doSend(){
    var t=input.textContent.trim();
    if(!t){ input.focus(); return; }
    /* 苍穹应用模式未选择关联应用时拦截 */
    var modeEl=$('.mode-item.checked');
    var currentMode=modeEl?modeEl.getAttribute('data-val'):'';
    if(currentMode==='苍穹应用' && appChip.classList.contains('muted')){
      toast('请先选择关联应用','error');
      appDd.classList.remove('error');
      void appDd.offsetWidth;
      appDd.classList.add('error');
      return;
    }
    var autoPicked=false;
    if(!pickValid()){
      var am=autoMatch(t);
      if(am){ activePick=am; renderExpertChips(); autoPicked=true; }
    }
    showView('chat');
    $('#chatTitle').textContent='采购订单管理应用开发';
    var empty=$('#chatEmpty');
    if(empty) empty.remove();
    appendUserMessage(t);
    if(autoPicked) appendAutoNote();
    input.innerHTML=''; refreshSend();
    var responseEl=appendAssistantMessage();
    simulateAIResponse(responseEl);
    chatInput.innerHTML='';
    var chatSend=$('#chatSendBtn');
    chatSend.classList.remove('active');
    chatInput.focus();
    /* 会话详情页关联应用默认选中"采购订单管理"，不可编辑 */
    selectChatApp('采购订单管理');
    chatAppDd.classList.add('disabled');
  }

  /* ---------- chat composer 发送 ---------- */
  var chatInput=$('#chatInput');
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
  var chatSendBtn=$('#chatSendBtn');
  function refreshChatSend(){ chatSendBtn.classList.toggle('active', chatInput.textContent.trim().length>0); }
  chatInput.addEventListener('input',function(){
    refreshChatSend();
    if((this.textContent||'').trim()==='') this.innerHTML='';
  });
  chatInput.addEventListener('keydown',function(e){
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); chatDoSend(); }
  });
  chatSendBtn.addEventListener('click',chatDoSend);
  function chatDoSend(){
    var t=chatInput.textContent.trim();
    if(!t){ chatInput.focus(); return; }
    var empty=$('#chatEmpty');
    if(empty) empty.remove();
    appendUserMessage(t);
    chatInput.innerHTML=''; refreshChatSend();
    var responseEl=appendAssistantMessage();
    simulateAIResponse(responseEl);
    chatInput.focus();
  }

  /* ---------- 历史记录面板 ---------- */
  var historyBtn=$('#historyBtn');
  var historyPanel=$('#historyPanel');
  var historyOverlay=$('#historyOverlay');
  function closeHistory(){
    historyPanel.classList.remove('show');
    historyOverlay.classList.remove('show');
  }
  if(historyBtn){
    historyBtn.addEventListener('click',function(){
      historyPanel.classList.add('show');
      historyOverlay.classList.add('show');
    });
    $('#historyPanelClose').addEventListener('click',closeHistory);
    historyOverlay.addEventListener('click',closeHistory);
    $$('.history-item-restore').forEach(function(btn){
      btn.addEventListener('click',function(e){
        e.stopPropagation();
        var item=btn.closest('.history-item');
        var ver=item.querySelector('.history-item-time').textContent.trim();
        toast('已恢复 '+ver);
        closeHistory();
      });
    });
  }

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
  if(sourceAppSearch) sourceAppSearch.addEventListener('input',function(){
    var q=this.value.trim().toLowerCase();
    if(!q){ renderSourceAppList(fullAppData); return; }
    renderSourceAppList(fullAppData.filter(function(d){return d.app.toLowerCase().indexOf(q)>-1}));
  });
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
  if(addBtn) addBtn.addEventListener('click',function(e){
    e.stopPropagation();
    openFilePicker();
  });
  if(chatAddBtn) chatAddBtn.addEventListener('click',function(e){
    e.stopPropagation();
    openFilePicker();
  });
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

  /* ---------- 首页导航卡片 ---------- */
  $$('#view-home .home-card').forEach(function(c){
    c.addEventListener('click',function(e){
      var view=c.getAttribute('data-view');
      var mode=c.getAttribute('data-mode');
      if(!view) return;
      e.preventDefault();
      if(view==='newtask'){
        showView('newtask');
        if(mode){
          setNavActive(mode);
          applyMode(mode,false);
        }else{
          setNavActive('新会话');
          input.setAttribute('data-placeholder','布置任务');
          appDd.classList.add('hidden');
          modeItems.forEach(function(m){m.classList.remove('checked')});
        }
      }else if(view==='apps'){
        showView('apps');
        setNavActive('苍穹应用');
      }
    });
  });

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

  /* ---------- 全局键盘快捷键 (W3C keydown) ---------- */
  var shortcutOverlay=$('#shortcutOverlay');
  var shortcutClose=$('#shortcutClose');
  function closeShortcut(){ shortcutOverlay.classList.remove('show'); }
  if(shortcutClose) shortcutClose.addEventListener('click',closeShortcut);
  if(shortcutOverlay) shortcutOverlay.addEventListener('click',function(e){
    if(e.target===shortcutOverlay) closeShortcut();
  });

  document.addEventListener('keydown',function(e){
    var mod=e.metaKey||e.ctrlKey;
    var key=e.key.toLowerCase();
    var inEditable=(e.target.isContentEditable||e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA');

    /* ⌘/Ctrl+/ — 显示快捷键帮助 */
    if(mod && key==='/'){
      e.preventDefault();
      shortcutOverlay.classList.add('show');
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
      if(shortcutOverlay && shortcutOverlay.classList.contains('show')){ closeShortcut(); return; }
      if(newAppModal && newAppModal.classList.contains('show')){ closeNewAppModal(); closeSourceAppMenu(); return; }
      if(sourceAppMenu && sourceAppMenu.style.display==='flex'){ closeSourceAppMenu(); return; }
      if(historyPanel && historyPanel.classList.contains('show')){ closeHistory(); return; }
      if(attachModal && attachModal.classList.contains('show')){ closeAttach(); return; }
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
  var dsPaletteBtn=$('#userMenuDesignSystem');
  var dsNavEl=$('#dsNav');
  var dsOverviewGrid=$('#dsOverviewGrid');
  var dsCompDetail=$('#dsCompDetail');
  var dsDetailBody=$('#dsDetailBody');
  var dsHeroTitle=$('#dsHeroTitle');
  var dsHeroDesc=$('#dsHeroDesc');

  /* 组件描述（参考 Ant Design） */
  var dsCompDesc={
    Button:'按钮用于触发一个即时操作',
    FloatButton:'悬浮在页面边缘的按钮，用于快速操作',
    Icon:'语义化的矢量图形，可通过配置展示不同图标',
    Typography:'文本的基本格式化，包括标题、段落、文本等',
    Divider:'分割内容的分割线',
    Flex:'弹性布局容器，提供 flex 布局的快捷方式',
    Grid:'24 栅格化系统，用于区域间隔布局',
    Layout:'页面整体布局容器，支持侧边栏、内容区等结构',
    Masonry:'瀑布流布局，按列排列不等高内容',
    Space:'设置组件之间的间距',
    Splitter:'可拆分的面板布局，支持拖拽调整面板大小',
    Anchor:'锚点链接，用于快速跳转到页面内指定位置',
    Breadcrumb:'显示当前页面在层级结构中的位置',
    Dropdown:'向下弹出的菜单列表',
    Menu:'为页面和功能提供导航的菜单列表',
    Pagination:'采用分页的形式分隔长列表，按页加载内容',
    Steps:'引导用户按照流程完成任务的导航条',
    Tabs:'用于将大量内容进行分类，按标签页分隔展示',
    AutoComplete:'输入框自动完成功能，根据输入内容提供建议',
    Cascader:'指在选择框中选择层级结构的数据',
    Checkbox:'用户通过勾选进行多项选择',
    ColorPicker:'通过拖拽颜色选择器来选择颜色',
    DatePicker:'输入或选择日期的控件',
    Form:'高性能表单控件，支持数据校验和数据管理',
    Input:'通过鼠标或键盘输入内容，是最基础的表单类控件',
    InputNumber:'通过鼠标或键盘输入内容，范围为数字',
    Mentions:'在输入中提及团队成员',
    Radio:'在多个互斥的选项中选择的单选框',
    Rate:'对事物进行评级操作',
    Select:'用于收集用户提供的选项',
    Slider:'通过拖动滑块选择数值',
    Switch:'用于在两个状态之间切换',
    TimePicker:'输入或选择时间的控件',
    Transfer:'双栏列表选择组件，用于将数据在两栏之间选择',
    TreeSelect:'树型选择控件，支持多选和搜索',
    Upload:'将文件上传到服务器',
    Avatar:'代表用户或事物，支持图片、图标或字符展示',
    Badge:'出现在按钮、图标旁的数字或状态标记',
    Calendar:'按照日历形式展示数据的容器',
    Card:'通用卡片容器，用于展示信息聚合',
    Carousel:'轮播展示一组内容',
    Collapse:'可以折叠/展开的内容区域',
    Descriptions:'展示多个字段信息列表',
    Empty:'暂无数据时的展示状态',
    Image:'相比原生的 img 标签提供了更多的功能和样式控制',
    List:'最基础的列表展示，可以承载文字、图片等信息',
    Popover:'点击或悬浮时弹出的气泡卡片内容',
    QRCode:'生成并展示二维码',
    Segmented:'分段控制器，用于在多个选项间切换',
    Statistic:'展示统计数值',
    Table:'展示行列数据',
    Tag:'进行标记和分类的小标签',
    Timeline:'按时间顺序展示的信息列表',
    Tooltip:'简单的文字提示气泡框',
    Tour:'用于引导用户了解产品功能',
    Tree:'用于展示有层级关系的数据结构',
    Alert:'用于页面中展示重要的提示信息',
    Drawer:'从屏幕边缘滑出的面板，用于承载相关内容',
    Message:'全局展示操作反馈信息',
    Modal:'模态对话框，用于重要的交互确认',
    Notification:'向用户展示通知提醒信息',
    Popconfirm:'点击元素时弹出确认气泡框',
    Progress:'展示操作的当前进度',
    Result:'用于反馈处理结果',
    Skeleton:'在内容加载时展示占位图形',
    Spin:'用于页面或区块的加载中状态',
    Watermark:'在页面上添加水印信息',
    Affix:'将页面元素固定在可视范围内',
    App:'提供全局化配置的包裹组件',
    BorderBeam:'为元素添加边框流光动画效果',
    ConfigProvider:'为组件提供全局统一的配置',
    Util:'提供工具类方法',
    GlobalStyles:'设计令牌，定义色彩、圆角、间距、阴影等基础视觉规范'
  };

  /* 分类数据 */
  var dsCategories=[
    {name:'基础',en:'General',count:5,color:'#495dff',bg:'#eef3ff',icon:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z"/>'},
    {name:'布局',en:'Layout',count:7,color:'#ff8d42',bg:'#fff1e8',icon:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'},
    {name:'导航',en:'Navigation',count:7,color:'#8b5cf6',bg:'#f3eefe',icon:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'},
    {name:'数据录入',en:'Data Entry',count:18,color:'#08cc50',bg:'#e8faef',icon:'<path d="M17 3a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'},
    {name:'数据展示',en:'Data Display',count:19,color:'#3a7bff',bg:'#eef3ff',icon:'<path d="M3 3v18h18"/><path d="M7 16l4-4 3 3 5-6"/>'},
    {name:'反馈',en:'Feedback',count:12,color:'#e04a3a',bg:'#fee',icon:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'},
    ];

  /* 渲染分类总览网格 */
  function renderOverview(){
    if(dsCompDetail) dsCompDetail.style.display='none';
    if(dsHeroTitle) dsHeroTitle.textContent='Lingee 组件总览';
    if(dsHeroDesc) dsHeroDesc.textContent='按组件职责与抽象层级划分为 6 大类，覆盖基础、布局、导航、数据录入、数据展示、反馈。';
    if(dsOverviewGrid){
      var html='';
      dsCategories.forEach(function(cat){
        html+='<div class="ds-color-card" style="cursor:pointer" data-cat="'+cat.en+'">'
          +'<div class="ds-color-swatch" style="background:'+cat.bg+';display:flex;align-items:center;justify-content:center">'
          +'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="'+cat.color+'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:28px;height:28px">'+cat.icon+'</svg>'
          +'</div>'
          +'<div class="ds-color-meta">'
          +'<div class="ds-color-name">'+cat.name+'</div>'
          +'<div class="ds-color-val">'+cat.en+' · '+cat.count+' 组件</div>'
          +'</div></div>';
      });
      dsOverviewGrid.innerHTML=html;
    }
    /* 高亮"组件总览" */
    $$('.ds-nav-link',dsNavEl).forEach(function(l){l.classList.toggle('active',l.getAttribute('data-target')==='overview')});
  }

  /* ---------- 全局样式渲染（合并表格） ---------- */
  function renderGlobalStyles(){
    var html='';
    /* === 1. 色彩 === */
    /* 色值从 :root 实时读取，杜绝文档与代码漂移 */
    var _rootStyle=getComputedStyle(document.documentElement);
    function tok(name){ return _rootStyle.getPropertyValue(name).trim(); }
    function T(name,label,desc){ return {name:label,val:tok(name),varName:name,desc:desc}; }
    var colorGroups=[
      {title:'主色',colors:[
        T('--brand','Primary','品牌主色，用于主按钮、选中态、强调'),
        T('--brand-hover','Primary Hover','主色悬浮态'),
        T('--brand-active','Primary Active','主色按下态'),
        T('--brand-fill','Primary Light','主色浅背景，用于标签、行悬浮'),
        T('--focus-ring','Focus Ring','焦点环色，输入框聚焦、链接高亮')
      ]},
      {title:'文字色',colors:[
        T('--text','Text Primary','正文主文字色'),
        T('--text-secondary','Text Secondary','次级文字（对比度 4.5:1），表单标签、表头、未选中页签'),
        T('--text-muted','Text Muted','辅助文字，描述与说明'),
        T('--text-soft','Text Soft','最弱文字，禁用态、占位符')
      ]},
      {title:'背景与填充',colors:[
        T('--bg','Background','页面主背景'),
        T('--sidebar-bg','Sidebar BG','侧边栏背景'),
        T('--fill-1','Fill 1','浅填充，表头与合计行'),
        T('--fill-2','Fill 2','更浅填充，表格斑马纹'),
        T('--hover','Hover BG','列表项悬浮背景'),
        T('--active','Active BG','列表项选中背景')
      ]},
      {title:'描边',colors:[
        T('--border','Border','默认边框，卡片与分割线'),
        T('--border-hover','Border Hover','边框悬浮态'),
        T('--border-focus','Border Focus','边框聚焦态'),
        T('--divider','Divider','弱分隔线，卡片内分区、表格行线')
      ]},
      {title:'状态色',colors:[
        T('--success','Success','成功色'),
        T('--success-bg','Success BG','成功浅背景'),
        T('--warning','Warning','警示色'),
        T('--warning-bg','Warning BG','警示浅背景'),
        T('--danger','Danger','危险色，同时用于金额强调'),
        T('--danger-bg','Danger BG','危险浅背景'),
        T('--dot-blue','Dot Blue','蓝点，进行中'),
        T('--dot-orange','Dot Orange','橙点，等待中'),
        T('--dot-green','Dot Green','绿点，已完成')
      ]},
      {title:'滚动条',colors:[
        T('--scroll-thumb','Scroll Thumb','滚动条滑块'),
        T('--scroll-thumb-hover','Scroll Thumb Hover','滑块悬浮态')
      ]}
    ];
    var tc=0;colorGroups.forEach(function(g){tc+=g.colors.length});
    html+='<div class="ds-table-group"><div class="ds-table-group-title">色彩 Color</div>';
    html+='<table class="ds-table"><colgroup><col style="width:44px"><col><col style="width:80px"><col style="width:140px"><col></colgroup><thead><tr><th></th><th>名称</th><th>色值</th><th>CSS 变量</th><th>描述</th></tr></thead><tbody>';
    colorGroups.forEach(function(g){
      html+='<tr><td colspan="5" style="font-weight:600;background:#f9f9f9;color:var(--text-muted);font-size:14px;padding:4px 10px">'+g.title+'</td></tr>';
      g.colors.forEach(function(c){
        var bd=['#ffffff','#fbfbfb','#f0f0f0','#ebebeb','#efefef','#eef3ff','#e8faef','#fff1e8','#fee'].indexOf(c.val)>-1?'border:1px solid #ddd':'';
        html+='<tr><td><span class="ds-swatch-sm" style="background:'+c.val+';'+bd+'"></span></td><td>'+c.name+'</td><td style="font-family:Monaco,Menlo,monospace">'+c.val+'</td><td style="font-family:Monaco,Menlo,monospace;color:var(--text-muted)">'+(c.varName||'—')+'</td><td>'+c.desc+'</td></tr>';
      });
    });
    html+='</tbody></table></div>';

    /* === 2. 字体 === */
    var fontFam='-apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", "Microsoft YaHei", sans-serif';
    var sizes=[
      {px:'11px',use:'辅助标签 · 版本号'},{px:'12px',use:'描述文字 · 标签'},
      {px:'13px',use:'正文小 · 导航项'},{px:'14px',use:'正文 · 菜单项 (base)'},
      {px:'15px',use:'卡片标题 · 弹窗标题'},{px:'16px',use:'弹窗标题 · 模态框'},
      {px:'17px',use:'品牌名 · 导航品牌'},{px:'19px',use:'侧边栏品牌'},
      {px:'23px',use:'页面标题'},{px:'28px',use:'首页 Logo'},{px:'32px',use:'Hero 标题'}
    ];
    var weights=[{w:'400',name:'Regular',desc:'正文、描述文字默认字重'},{w:'500',name:'Medium',desc:'导航项、标签、按钮文字'},{w:'600',name:'Semibold',desc:'卡片标题、分组标题'},{w:'700',name:'Bold',desc:'页面标题、品牌名'}];
    html+='<div class="ds-table-group"><div class="ds-table-group-title">字体 Typography</div>';
    var monoFam='Monaco, Menlo, Consolas, "Courier New", monospace';
    var mono='font-family:Monaco,Menlo,monospace;font-size:14px';
    html+='<table class="ds-table"><colgroup><col style="width:100px"><col><col style="width:260px"></colgroup><thead><tr><th>属性</th><th>值</th><th>使用场景</th></tr></thead><tbody>';
    html+='<tr><td>Font Family</td><td style="'+mono+'">'+fontFam+'</td><td>全站默认，界面所有文字</td></tr>';
    html+='<tr><td>Mono Family</td><td style="'+mono+'">'+monoFam+'</td><td>仅用于代码、类名、标识符</td></tr>';
    html+='<tr><td>Numeric</td><td style="'+mono+'">font-variant-numeric: tabular-nums</td><td>金额、编号、日期等需列对齐的数字；在 body 全局开启，不要只加在单列</td></tr>';
    html+='</tbody></table>';
    html+='<div class="ds-note">数字对齐使用 <code>tabular-nums</code> 等宽数字特性，不要改用等宽字体族 — 同一页面混用两套字形会造成视觉不一致。</div>';
    html+='<table class="ds-table" style="margin-top:12px"><colgroup><col style="width:60px"><col><col style="width:200px"></colgroup><thead><tr><th>字号</th><th>示例</th><th>描述</th></tr></thead><tbody>';
    sizes.forEach(function(s){html+='<tr><td style="font-family:Monaco,Menlo,monospace">'+s.px+'</td><td class="ds-type-sample" style="font-size:'+s.px+'">Lingee 设计系统</td><td>'+s.use+'</td></tr>'});
    html+='</tbody></table>';
    html+='<table class="ds-table" style="margin-top:12px"><colgroup><col style="width:60px"><col style="width:100px"><col><col></colgroup><thead><tr><th>字重</th><th>名称</th><th>示例</th><th>描述</th></tr></thead><tbody>';
    weights.forEach(function(wt){html+='<tr><td style="font-family:Monaco,Menlo,monospace">'+wt.w+'</td><td>'+wt.name+'</td><td style="font-weight:'+wt.w+';font-size:14px">Lingee — AI 编程伙伴</td><td>'+wt.desc+'</td></tr>'});
    html+='</tbody></table></div>';

    /* === 3. 阴影 === */
    var shadows=[
      {name:'Pill Shadow',val:'0 1px 2px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.04)',varName:'--pill-shadow',use:'分段控件 · 标签页'},
      {name:'Card Hover',val:'0 4px 16px rgba(0,0,0,.07)',use:'首页卡片悬浮'},
      {name:'Composer',val:'0 4px 24px rgba(0,0,0,.05)',use:'输入框投影'},
      {name:'Menu Shadow',val:'0 8px 28px rgba(0,0,0,.12),0 2px 6px rgba(0,0,0,.06)',varName:'--menu-shadow',use:'下拉菜单 · 右键菜单'},
      {name:'Modal',val:'0 12px 40px rgba(0,0,0,.15),0 4px 12px rgba(0,0,0,.08)',use:'弹窗投影'},
      {name:'Panel',val:'0 16px 48px rgba(0,0,0,.18)',use:'快捷键面板 · 抽屉'},
      {name:'Button Glow',val:'0 2px 8px rgba(73,93,255,.28)',use:'主按钮投影'},
      {name:'Tooltip',val:'0 2px 8px rgba(0,0,0,.15)',use:'提示气泡'}
    ];
    html+='<div class="ds-table-group"><div class="ds-table-group-title">阴影 Shadow</div>';
    html+='<table class="ds-table"><colgroup><col style="width:44px"><col style="width:120px"><col><col style="width:160px"></colgroup><thead><tr><th></th><th>名称</th><th>CSS 值</th><th>描述</th></tr></thead><tbody>';
    shadows.forEach(function(s){
      html+='<tr><td><span class="ds-shadow-sm" style="box-shadow:'+s.val+'"></span></td><td>'+s.name+'</td><td style="font-family:Monaco,Menlo,monospace;font-size:14px;color:var(--text-muted)">'+s.val+(s.varName?' <span style="color:#7c7cf0">var('+s.varName+')</span>':'')+'</td><td>'+s.use+'</td></tr>';
    });
    html+='</tbody></table></div>';

    /* === 4. 圆角 === */
    var radii=[
      {px:'4px',use:'标签 · kbd'},{px:'6px',use:'徽标 · 小按钮'},
      {px:'8px',use:'导航项 · chip · 图标按钮'},{px:'10px',use:'搜索框 · 标签页 · 按钮组'},
      {px:'12px',use:'消息气泡 · 右键菜单'},{px:'14px',use:'弹窗 · 下拉菜单 · 组件卡'},
      {px:'16px',use:'首页卡片 · 应用卡片 · 通知面板'},{px:'20px',use:'输入框 (Composer)'}
    ];
    html+='<div class="ds-table-group"><div class="ds-table-group-title">圆角 Radius</div>';
    html+='<table class="ds-table"><colgroup><col style="width:44px"><col style="width:60px"><col></colgroup><thead><tr><th></th><th>值</th><th>描述</th></tr></thead><tbody>';
    radii.forEach(function(r){
      html+='<tr><td><span class="ds-radius-sm" style="border-radius:'+r.px+'"></span></td><td style="font-family:Monaco,Menlo,monospace">'+r.px+'</td><td>'+r.use+'</td></tr>';
    });
    html+='</tbody></table></div>';
    return html;
  }

  /* ---------- 图标库渲染 ---------- */
  /* 30 个项目高频图标（含后续可能用到的），Lucide 风格：stroke 1.7 / fill none / 24×24 */
  var dsIcons=[
    {name:'search',label:'搜索',paths:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'},
    {name:'plus-circle',label:'新增',paths:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'},
    {name:'settings',label:'设置',paths:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'},
    {name:'folder',label:'文件夹',paths:'<path d="M4 20V6a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>'},
    {name:'pencil',label:'编辑',paths:'<path d="M17 3a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/><path d="m15 5 4 4"/>'},
    {name:'trash',label:'删除',paths:'<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>'},
    {name:'link',label:'链接',paths:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>'},
    {name:'upload',label:'上传',paths:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/>'},
    {name:'download',label:'下载',paths:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/>'},
    {name:'image',label:'图片',paths:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16a3 3 0 0 1 6 0"/>'},
    {name:'save',label:'保存',paths:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>'},
    {name:'copy',label:'复制',paths:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'},
    {name:'refresh',label:'刷新',paths:'<path d="M21 12a9 9 0 1 1-6.219-8.56"/><path d="M21 3v6h-6"/>'},
    {name:'share',label:'分享',paths:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>'},
    {name:'more',label:'更多',paths:'<circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="12" r="1.5" fill="currentColor"/>'},
    {name:'x',label:'关闭',paths:'<path d="M18 6 6 18M6 6l12 12"/>'},
    {name:'home',label:'首页',paths:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'},
    {name:'grid',label:'应用',paths:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'},
    {name:'user',label:'用户',paths:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>'},
    {name:'message',label:'消息',paths:'<path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z"/>'},
    {name:'bell',label:'通知',paths:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'},
    {name:'history',label:'历史',paths:'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 3"/>'},
    {name:'tag',label:'标签',paths:'<path d="M3 11V5a2 2 0 0 1 2-2h6l9 9-8 8-9-9z"/><circle cx="7.5" cy="7.5" r="1.5"/>'},
    {name:'lock',label:'锁定',paths:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'},
    {name:'eye',label:'查看',paths:'<path d="M2 12s3.5 7 10 7 10-7 10-7-3.5-7-10-7-10 7-10 7z"/><circle cx="12" cy="12" r="3"/>'},
    {name:'check',label:'完成',paths:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>'},
    {name:'chevron-right',label:'右箭头',paths:'<path d="m9 18 6-6-6-6"/>'},
    {name:'chevron-down',label:'下拉',paths:'<path d="m6 9 6 6 6-6"/>'},
    {name:'filter',label:'筛选',paths:'<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>'},
    {name:'calendar',label:'日历',paths:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'}
  ];
  function renderIcons(){
    var html='<div class="ds-comp">'
      +'<div class="ds-comp-body">'
      +'<div class="ds-icon-grid">';
    dsIcons.forEach(function(ic){
      html+='<div class="ds-icon-cell" title="'+ic.name+' · '+ic.label+'">'
        +'<svg class="ic" viewBox="0 0 24 24">'+ic.paths+'</svg>'
        +'<span>'+ic.name+'</span>'
        +'</div>';
    });
    html+='</div></div>'
      +'</div>';
    return html;
  }

  /* 全局代理：Select 组件交互（Design System 预览） */
  var dsSelectKeyHandler=null;
  function bindDsSelect(){
    var chip=$('#dsSelectChip');
    var menu=$('#dsSelectMenu');
    var search=$('#dsSelectSearch');
    var list=$('#dsSelectList');
    if(!chip||!menu) return;
    var focusIdx=-1,selectedApp='';
    function closeMenu(){menu.style.display='none';chip.classList.remove('open');focusIdx=-1;}
    function openMenu(){menu.style.display='flex';chip.classList.add('open');
      if(search){search.value='';search.focus();renderDsSelectItems();}
      focusIdx=0;var items=getItems();items.forEach(function(it,i){it.classList.toggle('focused',i===0);});
    }
    function toggleMenu(e){e.stopPropagation();
      if(menu.style.display==='flex') closeMenu();else openMenu();
    }
    function getItems(){return list?list.querySelectorAll('.app-item'):[];}
    function renderDsSelectItems(){
      if(!list) return;
      var q=search?search.value.trim().toLowerCase():'';
      list.innerHTML='';
      var filtered=q?fullAppData.filter(function(d){return d.app.toLowerCase().indexOf(q)!==-1||d.cloud.toLowerCase().indexOf(q)!==-1;}):fullAppData;
      if(!filtered.length){
        var empty=document.createElement('div');
        empty.className='app-item-empty';
        empty.textContent='无匹配应用';
        list.appendChild(empty);
        return;
      }
      filtered.forEach(function(d){
        var el=document.createElement('div');
        el.className='app-item'+(d.app===selectedApp?' checked':'');
        el.setAttribute('data-app',d.app);
        el.innerHTML='<div class="app-item-info"><div class="app-item-name">'+d.app+'</div><div class="app-item-cloud">'+d.cloud+'</div></div>';
        el.tabIndex=-1;
        el.addEventListener('click',function(){
          var label=chip.querySelector('.chip-label');if(label)label.textContent=d.app;
          selectedApp=d.app;
          chip.classList.remove('muted');chip.classList.add('selected');
          closeMenu();if(chip)chip.focus();
        });
        list.appendChild(el);
      });
    }
    chip.onclick=toggleMenu;
    chip.onkeydown=function(e){
      if(e.key==='Enter'||e.key===' '){e.preventDefault();openMenu();}
      if(e.key==='Escape'&&menu.style.display==='flex'){closeMenu();chip.focus();}
    };
    function onKeyDown(e){
      if(menu.style.display!=='flex') return;
      if(e.key==='Escape'){closeMenu();chip.focus();e.preventDefault();return;}
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();
        var items=getItems();
        if(!items.length) return;
        if(e.key==='ArrowDown'){focusIdx=(focusIdx+1)%items.length;}
        else{focusIdx=(focusIdx-1+items.length)%items.length;}
        items.forEach(function(it,i){it.classList.toggle('focused',i===focusIdx);});
        if(items[focusIdx]) items[focusIdx].scrollIntoView({block:'nearest'});
        return;
      }
      if(e.key==='Enter'&&focusIdx>=0){
        var items=getItems();
        if(items[focusIdx]) items[focusIdx].click();
      }
    }
    if(dsSelectKeyHandler) document.removeEventListener('keydown',dsSelectKeyHandler);
    dsSelectKeyHandler=onKeyDown;
    document.addEventListener('keydown',dsSelectKeyHandler);
    document.onclick=function(e){
      var dd=$('#dsSelectDemo');
      if(dd&&!dd.contains(e.target)&&menu.style.display==='flex') closeMenu();
    };
    if(search){
      search.addEventListener('input',function(){renderDsSelectItems();focusIdx=0;var items=getItems();items.forEach(function(it,i){it.classList.toggle('focused',i===0);});});
      search.addEventListener('keydown',function(e){e.stopPropagation();});
    }
    renderDsSelectItems();
  }

  /* 渲染 Select 组件 — 关联应用下拉面板 */
  function renderSelect(){
    var html='<div class="ds-comp">'
      +'<div class="ds-comp-body" style="padding:24px 20px;min-height:auto">'
      +'<div style="position:relative;width:280px">'
      /* chip (点击展开) */
      +'<div class="dropdown" id="dsSelectDemo">'
      +'<div class="chip muted" id="dsSelectChip" style="cursor:pointer">'
      +'<span class="app-dot"></span>'
      +'<span class="chip-label">关联应用</span>'
      +'<svg class="caret" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 7.5 5 5 5-5"/></svg>'
      +'</div>'
      /* menu (默认收起) */
      +'<div class="menu app-menu" id="dsSelectMenu" style="display:none;position:absolute;top:calc(100% + 10px);left:0;width:100%;">'
      +'<div class="app-search-wrap"><div class="app-search">'
      +'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>'
      +'<input type="text" placeholder="搜索" autocomplete="off" id="dsSelectSearch">'
      +'</div></div>'
      +'<div class="app-list" id="dsSelectList" style="max-height:240px">';
    fullAppData.forEach(function(d){
      html+='<div class="app-item"><div class="app-item-info"><div class="app-item-name">'+d.app+'</div><div class="app-item-cloud">'+d.cloud+'</div></div></div>';
    });
    html+='</div>'
      +'<div class="app-foot"><div class="app-foot-item" style="pointer-events:none">'
      +'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>'
      +'新建</div></div>'
      +'</div>'
      +'</div>'
      +'</div>'
      +'</div></div>';
    return html;
  }

  /* ---------- 组件预览统一渲染 ---------- */
  function renderComp(comp,cn){
    var h='<div class="ds-comp"><div class="ds-comp-body">';
    var row='display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px';
    var lbl='font-size:14px;color:var(--text-soft);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;display:block';
    var box='border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px';
    switch(comp){
      case 'Button':
        h+='<div style="'+row+'">'
          +'<button style="background:#495dff;color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:14px;font-weight:500;cursor:pointer">主按钮</button>'
          +'<button style="background:#f5f5f6;color:var(--text);border:none;border-radius:8px;padding:8px 20px;font-size:14px;font-weight:500;cursor:pointer">默认按钮</button>'
          +'<button style="background:none;border:none;color:#495dff;font-size:14px;cursor:pointer;padding:8px 4px;font-weight:500">文字按钮</button>'
          +'<button style="background:#fff;border:1px solid var(--border);border-radius:8px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M12 5v14M5 12h14"/></svg></button>'
          +'<button style="background:#495dff;color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:14px;font-weight:500;opacity:.5;cursor:not-allowed">禁用</button>'
          +'</div>';
        break;
      case 'Typography':
        h+='<div style="'+box+'">'
          +'<div style="font-size:32px;font-weight:700;letter-spacing:-.3px;color:#0f0f0f;margin-bottom:8px">Display 标题</div>'
          +'<div style="font-size:23px;font-weight:600;margin-bottom:8px">H1 一级标题</div>'
          +'<div style="font-size:19px;font-weight:600;margin-bottom:8px">H2 二级标题</div>'
          +'<div style="font-size:16px;font-weight:600;margin-bottom:8px">H3 三级标题</div>'
          +'<div style="font-size:14px;color:var(--text);margin-bottom:8px">正文 Regular — 这是正文内容，用于段落、描述等文本展示。</div>'
          +'<div style="font-size:14px;color:var(--text-muted);margin-bottom:8px">辅助文字 — 用于标签、描述、占位符等辅助信息。</div>'
          +'<code style="font-family:Monaco,Menlo,monospace;font-size:14px;background:#f0f0f0;padding:2px 6px;border-radius:4px">code snippet</code>'
          +'</div>';
        break;
      case 'Divider':
        h+='<div style="margin-bottom:16px"><span style="'+lbl+'">水平分割线</span><hr style="border:none;border-top:1px solid var(--border);margin:0"></div>'
          +'<div style="margin-bottom:16px"><span style="'+lbl+'">带文字分割线</span><div style="display:flex;align-items:center;gap:12px"><span style="flex:1;height:1px;background:var(--border)"></span><span style="font-size:14px;color:var(--text-muted)">或</span><span style="flex:1;height:1px;background:var(--border)"></span></div></div>';
        break;
      case 'Flex':
        h+='<div style="'+box+'"><span style="'+lbl+'">水平排列</span><div style="display:flex;gap:8px"><div style="flex:1;height:40px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">A</div><div style="flex:1;height:40px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">B</div><div style="flex:1;height:40px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">C</div></div></div>'
          +'<div style="'+box+'"><span style="'+lbl+'">垂直排列</span><div style="display:flex;flex-direction:column;gap:8px"><div style="height:32px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;padding:0 12px;font-size:14px;color:#495dff">Item 1</div><div style="height:32px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;padding:0 12px;font-size:14px;color:#495dff">Item 2</div></div></div>';
        break;
      case 'Grid':
        h+='<div style="'+box+'"><span style="'+lbl+'">24 栅格</span><div style="display:grid;grid-template-columns:repeat(24,1fr);gap:4px">';
        for(var i=0;i<24;i++) h+='<div style="height:24px;background:#eef3ff;border-radius:3px"></div>';
        h+='</div></div><div style="'+box+'"><span style="'+lbl+'">3 列等分</span><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px"><div style="height:48px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">1/3</div><div style="height:48px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">1/3</div><div style="height:48px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">1/3</div></div></div>';
        break;
      case 'Layout':
        h+='<div style="'+box+'"><div style="display:flex;min-height:200px;border:1px solid var(--border);border-radius:8px;overflow:hidden">'
          +'<div style="width:60px;background:#fbfbfb;border-right:1px solid var(--border);display:flex;align-items:center;justify-content:center"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#b8b8b8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>'
          +'<div style="flex:1;display:flex;flex-direction:column">'
          +'<div style="height:40px;border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 12px;font-size:14px;color:var(--text-muted)">Header</div>'
          +'<div style="flex:1;padding:12px;font-size:14px;color:var(--text-muted)">Content</div>'
          +'</div></div></div>';
        break;
      case 'Space':
        h+='<div style="'+box+'">';
        var sizes=[{n:'小',v:'4px'},{n:'中',v:'8px'},{n:'大',v:'16px'}];
        sizes.forEach(function(s){h+='<span style="'+lbl+'">'+s.n+'间距 ('+s.v+')</span><div style="display:flex;gap:'+s.v+';margin-bottom:12px"><div style="width:40px;height:40px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">A</div><div style="width:40px;height:40px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">B</div><div style="width:40px;height:40px;background:#eef3ff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#495dff">C</div></div>'});
        h+='</div>';
        break;
      case 'Dropdown':
        h+='<div style="'+box+'"><span style="'+lbl+'">下拉菜单</span><div style="position:relative;display:inline-block">'
          +'<button style="background:#fff;border:1px solid var(--border);border-radius:8px;padding:8px 16px;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:6px">下拉菜单 <svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="m6 9 6 6 6-6"/></svg></button>'
          +'<div style="position:absolute;top:calc(100% + 10px);left:0;min-width:120px;background:#fff;border:1px solid var(--border);border-radius:14px;box-shadow:var(--menu-shadow);padding:6px;z-index:10">'
          +'<div style="padding:8px 10px;font-size:14px;cursor:pointer;border-radius:9px">菜单项 1</div>'
          +'<div style="padding:8px 10px;font-size:14px;cursor:pointer;border-radius:9px;background:var(--hover)">菜单项 2</div>'
          +'<div style="padding:8px 10px;font-size:14px;cursor:pointer;border-radius:9px">菜单项 3</div>'
          +'</div></div></div>';
        break;
      case 'Menu':
        h+='<div style="'+box+'"><span style="'+lbl+'">导航菜单</span><div style="width:140px;border-right:1px solid var(--border);padding:4px">'
          +'<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:14px;cursor:pointer;border-radius:6px;background:#eef3ff;color:#495dff;font-weight:500"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>首页</div>'
          +'<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:14px;cursor:pointer;border-radius:6px;color:var(--text)"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>应用</div>'
          +'<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:14px;cursor:pointer;border-radius:6px;color:var(--text)"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/></svg>通知</div>'
          +'</div></div>';
        break;
      case 'Tabs':
        h+='<div style="'+box+'"><span style="'+lbl+'">标签页</span><div style="display:flex;gap:4px;border-bottom:1px solid var(--border);margin-bottom:12px">'
          +'<div style="padding:8px 16px;font-size:14px;cursor:pointer;border-bottom:2px solid #495dff;color:#495dff;font-weight:500">标签一</div>'
          +'<div style="padding:8px 16px;font-size:14px;cursor:pointer;color:var(--text-muted)">标签二</div>'
          +'<div style="padding:8px 16px;font-size:14px;cursor:pointer;color:var(--text-muted)">标签三</div>'
          +'</div><div style="font-size:14px;color:var(--text-muted);padding:8px 0">标签页内容区域</div></div>';
        break;
      case 'Checkbox':
        h+='<div style="'+box+'"><span style="'+lbl+'">多选框</span><div style="display:flex;flex-direction:column;gap:10px">'
          +'<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><span style="width:16px;height:16px;border-radius:4px;border:1px solid #d4d4d8;display:flex;align-items:center;justify-content:center"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#495dff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><path d="m9 11 3 3L22 4"/></svg></span>选项 A（选中）</label>'
          +'<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><span style="width:16px;height:16px;border-radius:4px;border:1px solid #d4d4d8"></span>选项 B</label>'
          +'<label style="display:flex;align-items:center;gap:8px;font-size:14px;opacity:.4;cursor:not-allowed"><span style="width:16px;height:16px;border-radius:4px;border:1px solid #d4d4d8"></span>选项 C（禁用）</label>'
          +'</div></div>';
        break;
      case 'Form':
        h+='<div style="'+box+';max-width:360px"><span style="'+lbl+'">表单</span><div style="display:flex;flex-direction:column;gap:12px">'
          +'<div><label style="font-size:14px;color:var(--text);display:block;margin-bottom:4px">名称</label><input type="text" placeholder="请输入名称" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;outline:none;box-sizing:border-box"></div>'
          +'<div><label style="font-size:14px;color:var(--text);display:block;margin-bottom:4px">类型</label><div style="display:flex;gap:8px"><label style="display:flex;align-items:center;gap:4px;font-size:14px;cursor:pointer"><span style="width:14px;height:14px;border-radius:50%;border:1px solid #495dff;display:flex;align-items:center;justify-content:center"><span style="width:8px;height:8px;border-radius:50%;background:#495dff"></span></span>类型 A</label><label style="display:flex;align-items:center;gap:4px;font-size:14px;cursor:pointer"><span style="width:14px;height:14px;border-radius:50%;border:1px solid #d4d4d8"></span>类型 B</label></div></div>'
          +'<div style="display:flex;gap:8px;margin-top:4px"><button style="background:#495dff;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:14px;cursor:pointer">提交</button><button style="background:#fff;color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px 16px;font-size:14px;cursor:pointer">取消</button></div>'
          +'</div></div>';
        break;
      case 'Input':
        h+='<div style="'+box+';max-width:360px"><span style="'+lbl+'">输入框</span><div style="display:flex;flex-direction:column;gap:12px">'
          +'<input type="text" placeholder="基础输入框" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;outline:none;box-sizing:border-box">'
          +'<div style="position:relative"><input type="text" placeholder="搜索" style="width:100%;padding:8px 12px 8px 36px;border:1px solid var(--border);border-radius:8px;font-size:14px;outline:none;box-sizing:border-box"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#b8b8b8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;position:absolute;left:10px;top:50%;transform:translateY(-50%)"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></div>'
          +'<textarea placeholder="多行文本" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;resize:vertical;min-height:60px"></textarea>'
          +'</div></div>';
        break;
      case 'Radio':
        h+='<div style="'+box+'"><span style="'+lbl+'">单选框</span><div style="display:flex;flex-direction:column;gap:10px">'
          +'<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><span style="width:16px;height:16px;border-radius:50%;border:1px solid #495dff;display:flex;align-items:center;justify-content:center"><span style="width:8px;height:8px;border-radius:50%;background:#495dff"></span></span>选项 A（选中）</label>'
          +'<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><span style="width:16px;height:16px;border-radius:50%;border:1px solid #d4d4d8"></span>选项 B</label>'
          +'<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><span style="width:16px;height:16px;border-radius:50%;border:1px solid #d4d4d8"></span>选项 C</label>'
          +'</div></div>';
        break;
      case 'Switch':
        h+='<div style="'+box+'"><span style="'+lbl+'">开关</span><div style="display:flex;gap:24px;align-items:center">'
          +'<div style="display:flex;align-items:center;gap:8px"><div data-ds-act="switch" data-on="1" style="width:36px;height:20px;background:#495dff;border-radius:10px;padding:2px;display:flex;justify-content:flex-end;cursor:pointer;transition:all .2s"><span style="width:16px;height:16px;background:#fff;border-radius:50%;transition:all .2s"></span></div><span style="font-size:14px">开启</span></div>'
          +'<div style="display:flex;align-items:center;gap:8px"><div data-ds-act="switch" data-on="0" style="width:36px;height:20px;background:#d4d4d8;border-radius:10px;padding:2px;display:flex;justify-content:flex-start;cursor:pointer;transition:all .2s"><span style="width:16px;height:16px;background:#fff;border-radius:50%;transition:all .2s"></span></div><span style="font-size:14px;color:var(--text-muted)">关闭</span></div>'
          +'</div></div>';
        break;
      case 'Upload':
        h+='<div style="'+box+'"><span style="'+lbl+'">上传</span><div style="display:flex;gap:12px;align-items:center">'
          +'<button style="background:#fff;color:var(--text);border:1px dashed var(--border);border-radius:8px;padding:16px 24px;font-size:14px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--text-muted)"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></svg>点击上传</button>'
          +'<div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:#f0f0f0;border-radius:6px;font-size:14px"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#495dff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>文件已上传.txt<div style="cursor:pointer;color:var(--text-muted)">×</div></div>'
          +'</div></div>';
        break;
      case 'Avatar':
        h+='<div style="'+box+'"><span style="'+lbl+'">头像</span><div style="display:flex;gap:16px;align-items:center">'
          +'<div style="width:40px;height:40px;border-radius:50%;background:#495dff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px">L</div>'
          +'<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#495dff,#7b8cff);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px">A</div>'
          +'<div style="width:48px;height:48px;border-radius:50%;background:#eef3ff;display:flex;align-items:center;justify-content:center;color:#495dff"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg></div>'
          +'<div style="width:24px;height:24px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px">S</div>'
          +'</div></div>';
        break;
      case 'Badge':
        h+='<div style="'+box+'"><span style="'+lbl+'">徽标数</span><div style="display:flex;gap:24px;align-items:center">'
          +'<div style="position:relative"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span style="position:absolute;top:-4px;right:-4px;background:#e33;color:#fff;font-size:14px;min-width:16px;height:16px;border-radius:8px;padding:0 4px;display:flex;align-items:center;justify-content:center;font-weight:600">3</span></div>'
          +'<div style="position:relative"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/></svg><span style="position:absolute;top:0;right:0;width:8px;height:8px;background:#08cc50;border-radius:50%;border:1px solid #fff"></span></div>'
          +'</div></div>';
        break;
      case 'Card':
        h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">'
          +'<div style="border:1px solid var(--border);border-radius:12px;padding:16px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="width:36px;height:36px;border-radius:8px;background:#eef3ff;display:flex;align-items:center;justify-content:center"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#495dff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg></div><div><div style="font-size:14px;font-weight:600">标题</div><div style="font-size:14px;color:var(--text-muted)">描述文字</div></div></div><div style="font-size:14px;color:var(--text-muted)">卡片内容区域，可放置文本、图片等。</div></div>'
          +'<div style="border:1px solid var(--border);border-radius:12px;padding:16px"><div style="font-size:14px;font-weight:600;margin-bottom:8px">无图标卡片</div><div style="font-size:14px;color:var(--text-muted)">精简卡片样式，仅标题和正文。</div></div>'
          +'</div>';
        break;
      case 'Empty':
        h+='<div style="'+box+';display:flex;align-items:center;justify-content:center;min-height:120px"><div style="display:flex;flex-direction:column;align-items:center;gap:8px"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#d4d4d8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:40px;height:40px"><path d="M3 3v18h18"/><path d="M7 16l4-4 3 3 5-6"/></svg><span style="font-size:14px;color:var(--text-muted)">暂无数据</span></div></div>';
        break;
      case 'Image':
        h+='<div style="'+box+'"><span style="'+lbl+'">图片</span><div style="display:flex;gap:12px;align-items:center">'
          +'<div style="width:80px;height:80px;border-radius:8px;background:linear-gradient(135deg,#eef3ff,#f3eefe);display:flex;align-items:center;justify-content:center"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#495dff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16a3 3 0 0 1 6 0"/></svg></div>'
          +'<div style="width:80px;height:80px;border-radius:8px;background:#f0f0f0;display:flex;align-items:center;justify-content:center"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#b8b8b8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:24px;height:24px"><path d="M3 3v18h18"/><path d="M7 16l4-4 3 3 5-6"/></svg></div>'
          +'</div></div>';
        break;
      case 'List':
        h+='<div style="'+box+'"><span style="'+lbl+'">列表</span><div style="display:flex;flex-direction:column">'
          +'<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)"><div style="width:8px;height:8px;border-radius:50%;background:#08cc50;flex:none"></div><div style="flex:1"><div style="font-size:14px">列表项标题一</div><div style="font-size:14px;color:var(--text-muted)">描述文字</div></div></div>'
          +'<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)"><div style="width:8px;height:8px;border-radius:50%;background:#ff8d42;flex:none"></div><div style="flex:1"><div style="font-size:14px">列表项标题二</div><div style="font-size:14px;color:var(--text-muted)">描述文字</div></div></div>'
          +'<div style="display:flex;align-items:center;gap:10px;padding:10px 0"><div style="width:8px;height:8px;border-radius:50%;background:#4d89ff;flex:none"></div><div style="flex:1"><div style="font-size:14px">列表项标题三</div><div style="font-size:14px;color:var(--text-muted)">描述文字</div></div></div>'
          +'</div></div>';
        break;
      case 'Segmented':
        h+='<div style="'+box+'"><span style="'+lbl+'">分段控制器</span><div style="display:inline-flex;background:#f0f0f0;border-radius:8px;padding:2px">'
          +'<div style="padding:6px 16px;font-size:14px;cursor:pointer;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.06);color:var(--text);font-weight:500">选项 A</div>'
          +'<div style="padding:6px 16px;font-size:14px;cursor:pointer;border-radius:6px;color:var(--text-muted)">选项 B</div>'
          +'<div style="padding:6px 16px;font-size:14px;cursor:pointer;border-radius:6px;color:var(--text-muted)">选项 C</div>'
          +'</div></div>';
        break;
      case 'Tag':
        h+='<div style="'+box+'"><span style="'+lbl+'">标签</span><div style="display:flex;gap:8px;flex-wrap:wrap">'
          +'<span style="padding:2px 10px;border-radius:4px;background:#eef3ff;color:#495dff;font-size:14px">蓝色</span>'
          +'<span style="padding:2px 10px;border-radius:4px;background:#e8faef;color:#08a040;font-size:14px">绿色</span>'
          +'<span style="padding:2px 10px;border-radius:4px;background:#fff1e8;color:#c06010;font-size:14px">橙色</span>'
          +'<span style="padding:2px 10px;border-radius:4px;background:#fee;color:#e04a3a;font-size:14px">红色</span>'
          +'<span style="padding:2px 10px;border-radius:4px;background:#f0f0f0;color:var(--text-muted);font-size:14px">默认</span>'
          +'<span style="padding:2px 10px;border-radius:4px;background:#eef3ff;color:#495dff;font-size:14px;display:inline-flex;align-items:center;gap:4px">可关闭<div style="cursor:pointer">×</div></span>'
          +'</div></div>';
        break;
      case 'Timeline':
        h+='<div style="'+box+'"><span style="'+lbl+'">时间轴</span><div style="display:flex;flex-direction:column">'
          +'<div style="display:flex;gap:12px;padding-bottom:20px"><div style="display:flex;flex-direction:column;align-items:center"><div style="width:10px;height:10px;border-radius:50%;background:#495dff;flex:none"></div><div style="width:2px;flex:1;background:var(--border);margin-top:2px"></div></div><div><div style="font-size:14px;font-weight:500">创建项目</div><div style="font-size:14px;color:var(--text-muted)">2026-07-30</div></div></div>'
          +'<div style="display:flex;gap:12px;padding-bottom:20px"><div style="display:flex;flex-direction:column;align-items:center"><div style="width:10px;height:10px;border-radius:50%;background:#08cc50;flex:none"></div><div style="width:2px;flex:1;background:var(--border);margin-top:2px"></div></div><div><div style="font-size:14px;font-weight:500">开发完成</div><div style="font-size:14px;color:var(--text-muted)">2026-07-28</div></div></div>'
          +'<div style="display:flex;gap:12px"><div style="display:flex;flex-direction:column;align-items:center"><div style="width:10px;height:10px;border-radius:50%;background:#d4d4d8;flex:none"></div></div><div><div style="font-size:14px;color:var(--text-muted)">等待上线</div><div style="font-size:14px;color:var(--text-soft)">待定</div></div></div>'
          +'</div></div>';
        break;
      case 'Tooltip':
        h+='<div style="'+box+'"><span style="'+lbl+'">文字提示 — 悬浮 300ms 后显示，深色圆角浮层</span><div style="display:flex;gap:16px;align-items:center">'
          +'<button data-tooltip="提示文字" style="background:#fff;border:1px solid var(--border);border-radius:6px;padding:6px 12px;font-size:14px;cursor:pointer">悬浮我</button>'
          +'<button data-tooltip="帮助中心" style="background:none;border:none;border-radius:8px;padding:6px;color:var(--text-muted);display:flex;align-items:center;justify-content:center;cursor:pointer"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"/><line x1="12" y1="17" x2="12" y2="17"/></svg></button>'
          +'<button data-tooltip="消息通知" style="background:none;border:none;border-radius:8px;padding:6px;color:var(--text-muted);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg><span style="position:absolute;top:2px;right:2px;width:8px;height:8px;background:#e04a3a;border-radius:50%"></span></button>'
          +'</div></div>'
          +'<div style="'+box+'"><span style="'+lbl+'">规范参数</span><table style="width:100%;border-collapse:collapse;font-size:14px"><tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0;color:var(--text-muted)">背景色</td><td style="padding:8px 0">#2d2d2d</td></tr><tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0;color:var(--text-muted)">文字颜色</td><td style="padding:8px 0">#fff</td></tr><tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0;color:var(--text-muted)">字号</td><td style="padding:8px 0">12px / line-height 1.4</td></tr><tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0;color:var(--text-muted)">内边距</td><td style="padding:8px 0">4px 8px</td></tr><tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0;color:var(--text-muted)">圆角</td><td style="padding:8px 0">6px</td></tr><tr style="border-bottom:1px solid var(--border)"><td style="padding:8px 0;color:var(--text-muted)">阴影</td><td style="padding:8px 0">0 2px 8px rgba(0,0,0,.15)</td></tr><tr><td style="padding:8px 0;color:var(--text-muted)">触发方式</td><td style="padding:8px 0">data-tooltip 属性，hover 延迟 300ms</td></tr></table></div>';
        break;
      case 'Alert':
        h+='<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">'
          +'<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:8px;background:#e8faef;border:1px solid #b8e6c8;font-size:14px;color:#08a040"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex:none"><path d="m9 11 3 3L22 4"/></svg>成功提示：操作已完成</div>'
          +'<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:8px;background:#fff1e8;border:1px solid #ffd6a8;font-size:14px;color:#c06010"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex:none"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>警告提示：请注意风险</div>'
          +'<div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:8px;background:#fee;border:1px solid #fca5a5;font-size:14px;color:#e04a3a"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex:none"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>错误提示：操作失败</div>'
          +'</div>';
        break;
      case 'Drawer':
        h+='<div style="'+box+'"><span style="'+lbl+'">抽屉</span><div style="position:relative;height:220px;overflow:hidden;border:1px solid var(--border);border-radius:8px;background:#f9f9f9">'
          +'<div style="position:absolute;top:0;right:0;bottom:0;width:240px;background:#fff;box-shadow:-4px 0 24px rgba(0,0,0,.08);padding:16px;border-left:1px solid var(--border)">'
          +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><span style="font-size:15px;font-weight:600">标题</span><span style="cursor:pointer;color:var(--text-muted);font-size:20px">×</span></div>'
          +'<div style="font-size:14px;color:var(--text-muted)">抽屉内容区域，从屏幕边缘滑出。</div>'
          +'</div></div></div>';
        break;
      case 'Message':
        h+='<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">'
          +'<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.08);font-size:14px;max-width:360px"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#495dff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>这是一条普通消息提示</div>'
          +'<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:#fff;border:1px solid #b8e6c8;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.08);font-size:14px;color:#08a040;max-width:360px"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="m9 11 3 3L22 4"/></svg>操作成功</div>'
          +'<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:#fff;border:1px solid #fca5a5;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.08);font-size:14px;color:#e04a3a;max-width:360px"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>操作失败，请重试</div>'
          +'</div>';
        break;
      case 'Modal':
        h+='<div style="'+box+'"><span style="'+lbl+'">对话框</span><div style="position:relative;height:240px;overflow:hidden;border:1px solid var(--border);border-radius:8px;background:#f0f0f0">'
          +'<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:300px;background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.15);padding:20px">'
          +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><span style="font-size:15px;font-weight:600">标题</span><span style="cursor:pointer;color:var(--text-muted);font-size:20px">×</span></div>'
          +'<div style="font-size:14px;color:var(--text-muted);margin-bottom:16px">对话框内容区域，用于重要的交互确认。</div>'
          +'<div style="display:flex;justify-content:flex-end;gap:8px"><button style="background:#fff;border:1px solid var(--border);border-radius:8px;padding:6px 16px;font-size:14px;cursor:pointer">取消</button><button style="background:#495dff;color:#fff;border:none;border-radius:8px;padding:6px 16px;font-size:14px;cursor:pointer">确定</button></div>'
          +'</div></div></div>';
        break;
      case 'Notification':
        h+='<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">'
          +'<div style="display:flex;gap:10px;padding:12px 16px;background:#fff;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.08);max-width:360px">'
          +'<div style="width:32px;height:32px;border-radius:8px;background:#eef3ff;display:flex;align-items:center;justify-content:center;flex:none"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#495dff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/></svg></div>'
          +'<div style="flex:1"><div style="font-size:14px;font-weight:600;margin-bottom:2px">通知标题</div><div style="font-size:14px;color:var(--text-muted)">这是一条通知提醒的描述内容。</div><div style="font-size:14px;color:var(--text-soft);margin-top:4px">2026-07-30</div></div>'
          +'</div></div>';
        break;
      case 'Progress':
        h+='<div style="'+box+'"><span style="'+lbl+'">进度条</span><div style="display:flex;flex-direction:column;gap:16px">'
          +'<div><div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:14px"><span>线性进度</span><span style="color:var(--text-muted)">60%</span></div><div style="height:6px;background:#f0f0f0;border-radius:3px;overflow:hidden"><div style="width:60%;height:100%;background:#495dff;border-radius:3px"></div></div></div>'
          +'<div><div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:14px"><span>分段进度</span><span style="color:var(--text-muted)">3/5</span></div><div style="display:flex;gap:4px">'+Array(5).fill(0).map(function(_,i){return '<div style="flex:1;height:6px;border-radius:3px;background:'+(i<3?'#495dff':'#f0f0f0')+'"></div>'}).join('')+'</div></div>'
          +'<div style="display:flex;align-items:center;gap:12px"><span style="font-size:14px">圆形进度</span><div style="position:relative;width:40px;height:40px"><svg viewBox="0 0 40 40" style="width:40px;height:40px;transform:rotate(-90deg)"><circle cx="20" cy="20" r="16" fill="none" stroke="#f0f0f0" stroke-width="4"/><circle cx="20" cy="20" r="16" fill="none" stroke="#495dff" stroke-width="4" stroke-dasharray="100" stroke-dashoffset="25" stroke-linecap="round"/></svg><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:14px;font-weight:600">75%</span></div></div>'
          +'</div></div>';
        break;
      case 'Skeleton':
        h+='<div style="'+box+'"><span style="'+lbl+'">骨架屏</span><div style="display:flex;flex-direction:column;gap:8px">'
          +'<div style="height:20px;width:40%;background:#f0f0f0;border-radius:4px"></div>'
          +'<div style="height:14px;width:100%;background:#f0f0f0;border-radius:4px"></div>'
          +'<div style="height:14px;width:80%;background:#f0f0f0;border-radius:4px"></div>'
          +'<div style="display:flex;gap:12px;margin-top:8px"><div style="width:60px;height:60px;background:#f0f0f0;border-radius:8px;flex:none"></div><div style="flex:1;display:flex;flex-direction:column;gap:6px"><div style="height:14px;width:50%;background:#f0f0f0;border-radius:4px"></div><div style="height:14px;width:70%;background:#f0f0f0;border-radius:4px"></div><div style="height:14px;width:60%;background:#f0f0f0;border-radius:4px"></div></div></div>'
          +'</div></div>';
        break;
      case 'Spin':
        h+='<div style="'+box+';display:flex;align-items:center;justify-content:center;min-height:120px"><div style="display:flex;flex-direction:column;align-items:center;gap:8px">'
          +'<svg viewBox="0 0 24 24" style="width:32px;height:32px"><circle cx="12" cy="12" r="9" fill="none" stroke="#f0f0f0" stroke-width="2.5"/><path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#495dff" stroke-width="2.5" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></path></svg>'
          +'<span style="font-size:14px;color:var(--text-muted)">加载中...</span></div></div>';
        break;
      case 'ConfigProvider':
        h+='<div style="'+box+'"><div style="font-size:14px;color:var(--text);margin-bottom:12px">ConfigProvider 为组件提供全局统一的配置能力。</div>'
          +'<div style="display:flex;flex-direction:column;gap:10px">'
          +'<div style="display:flex;align-items:center;gap:8px;font-size:14px"><span style="padding:2px 8px;background:#f0f0f0;border-radius:4px;font-family:Monaco,Menlo,monospace;font-size:14px">theme</span><span style="color:var(--text-muted)">主题定制 — 修改组件 Token 与样式</span></div>'
          +'<div style="display:flex;align-items:center;gap:8px;font-size:14px"><span style="padding:2px 8px;background:#f0f0f0;border-radius:4px;font-family:Monaco,Menlo,monospace;font-size:14px">locale</span><span style="color:var(--text-muted)">国际化 — 多语言切换</span></div>'
          +'<div style="display:flex;align-items:center;gap:8px;font-size:14px"><span style="padding:2px 8px;background:#f0f0f0;border-radius:4px;font-family:Monaco,Menlo,monospace;font-size:14px">componentDisabled</span><span style="color:var(--text-muted)">组件禁用 — 全局禁用指定组件</span></div>'
          +'<div style="display:flex;align-items:center;gap:8px;font-size:14px"><span style="padding:2px 8px;background:#f0f0f0;border-radius:4px;font-family:Monaco,Menlo,monospace;font-size:14px">size</span><span style="color:var(--text-muted)">组件尺寸 — small / middle / large</span></div>'
          +'</div></div>';
        break;
      default:
        h+='<div style="min-height:120px;display:flex;align-items:center;justify-content:center;color:var(--text-soft);font-size:14px">组件预览待填充</div>';
    }
    h+='</div></div>';
    return h;
  }

  /* 组件交互绑定 */
  function bindDsInteractions(comp){
    var body=dsDetailBody.querySelector('.ds-comp-body');
    if(!body) return;
    var chk='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="#495dff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px"><path d="m9 11 3 3L22 4"/></svg>';
    if(comp==='Switch'){
      body.querySelectorAll('[data-ds-act="switch"]').forEach(function(sw){
        sw.addEventListener('click',function(){
          var isOn=sw.getAttribute('data-on')==='1';
          if(isOn){sw.setAttribute('data-on','0');sw.style.background='#d4d4d8';sw.style.justifyContent='flex-start';var l=sw.nextElementSibling;if(l){l.textContent='关闭';l.style.color='var(--text-muted)';}}
          else{sw.setAttribute('data-on','1');sw.style.background='#495dff';sw.style.justifyContent='flex-end';var l=sw.nextElementSibling;if(l){l.textContent='开启';l.style.color='';}}
        });
      });
    }
    if(comp==='Checkbox'){
      body.querySelectorAll('label').forEach(function(lbl){
        if(lbl.style.opacity==='.4')return;
        lbl.addEventListener('click',function(e){e.preventDefault();var box=lbl.querySelector('span');if(!box)return;if(box.querySelector('svg')){box.innerHTML='';box.style.borderColor='#d4d4d8';}else{box.innerHTML=chk;box.style.borderColor='#495dff';}});
      });
    }
    if(comp==='Radio'){
      var radios=body.querySelectorAll('label');
      radios.forEach(function(r){
        r.addEventListener('click',function(e){e.preventDefault();radios.forEach(function(o){var d=o.querySelector('span>span');var s=o.querySelector('span');if(d)d.style.display='none';if(s)s.style.borderColor='#d4d4d8';});var d=r.querySelector('span>span');var s=r.querySelector('span');if(d)d.style.display='block';if(s)s.style.borderColor='#495dff';});
      });
    }
    if(comp==='Tabs'){
      var tc=body.querySelector('div[style*="border-bottom"]');
      if(tc)for(var i=0;i<tc.children.length;i++)tc.children[i].addEventListener('click',function(){for(var j=0;j<tc.children.length;j++){tc.children[j].style.borderBottom='none';tc.children[j].style.color='var(--text-muted)';tc.children[j].style.fontWeight='400';}this.style.borderBottom='2px solid #495dff';this.style.color='#495dff';this.style.fontWeight='500';});
    }
    if(comp==='Segmented'){
      var sc=body.querySelector('div[style*="inline-flex"]');
      if(sc)for(var i=0;i<sc.children.length;i++)sc.children[i].addEventListener('click',function(){for(var j=0;j<sc.children.length;j++){sc.children[j].style.background='transparent';sc.children[j].style.color='var(--text-muted)';sc.children[j].style.fontWeight='400';sc.children[j].style.boxShadow='none';}this.style.background='#fff';this.style.color='var(--text)';this.style.fontWeight='500';this.style.boxShadow='0 1px 2px rgba(0,0,0,.06)';});
    }
    if(comp==='Dropdown'){
      var ddBtn=body.querySelector('button');var ddMenu=body.querySelector('div[style*="position:absolute"]');
      if(ddBtn&&ddMenu){ddMenu.style.display='none';ddBtn.addEventListener('click',function(e){e.stopPropagation();ddMenu.style.display=ddMenu.style.display==='none'?'block':'none';});}
    }
    if(comp==='Menu'){
      var mi=body.querySelectorAll('div[style*="padding:8px 12px"]');
      mi.forEach(function(item){item.addEventListener('click',function(){mi.forEach(function(o){o.style.background='transparent';o.style.color='var(--text)';o.style.fontWeight='400';});item.style.background='#eef3ff';item.style.color='#495dff';item.style.fontWeight='500';});});
    }
    if(comp==='Tag'){
      var cb=body.querySelector('div[style*="cursor:pointer"]');
      if(cb)cb.addEventListener('click',function(){var t=cb.parentElement;if(t)t.style.display='none';});
    }
    if(comp==='Upload'){
      var ub=body.querySelector('button');
      if(ub)ub.addEventListener('click',function(){var fi=document.createElement('input');fi.type='file';fi.addEventListener('change',function(){if(fi.files.length>0)toast('已选择文件：'+fi.files[0].name);});fi.click();});
    }
    if(comp==='Tooltip'){
      var tb=body.querySelector('button');var tp=body.querySelector('div[style*="position:absolute"]');
      if(tb&&tp){tp.style.display='none';tb.addEventListener('mouseenter',function(){tp.style.display='block';});tb.addEventListener('mouseleave',function(){tp.style.display='none';});}
    }
    if(comp==='Button'){
      body.querySelectorAll('button:not([disabled])').forEach(function(btn){
        if(btn.style.opacity==='.5')return;
        btn.addEventListener('click',function(){var o=btn.textContent;btn.textContent='加载中...';btn.style.opacity='.6';btn.style.pointerEvents='none';setTimeout(function(){btn.textContent=o;btn.style.opacity='';btn.style.pointerEvents='';},800);});
      });
    }
    if(comp==='Form'){
      var submitBtn=body.querySelector('button');
      if(submitBtn)submitBtn.addEventListener('click',function(e){e.preventDefault();var o=submitBtn.textContent;submitBtn.textContent='提交中...';submitBtn.style.opacity='.6';submitBtn.style.pointerEvents='none';setTimeout(function(){submitBtn.textContent=o;submitBtn.style.opacity='';submitBtn.style.pointerEvents='';toast('提交成功');},800);});
    }
  }

  /* 调色盘按钮 → 切换到设计系统视图 */
  if(dsPaletteBtn){
    dsPaletteBtn.addEventListener('click',function(){
      closeUserMenu();
      showView('design');
      setUrlState('?view=design');
      if(navItems) navItems.forEach(function(n){n.classList.remove('active')});
      renderOverview();
    });
  }

  /* 品牌标题点击 → 返回会话首页 */
  var dsBrand=$('.ds-nav-brand');
  if(dsBrand){
    dsBrand.addEventListener('click',function(){
      showView('newtask');
      setNavActive('新会话');
      if(input){ input.setAttribute('data-placeholder','布置任务'); input.innerHTML=''; input.focus(); }
      if(appDd) appDd.classList.add('hidden');
      if(modeItems) modeItems.forEach(function(m){m.classList.remove('checked')});
    });
  }

  /* 分类标题折叠/展开 + localStorage 缓存 */
  $$('.ds-nav-label',dsNavEl).forEach(function(label,idx){
    var section=label.parentElement;
    var key='ds-nav-col-'+idx;
    if(localStorage.getItem(key)==='1') section.classList.add('collapsed');
    label.addEventListener('click',function(){
      section.classList.toggle('collapsed');
      localStorage.setItem(key,section.classList.contains('collapsed')?'1':'0');
    });
  });

  /* 暂不涉及折叠交互 */
  $$('.ds-nav-disabled-toggle',dsNavEl).forEach(function(t){
    t.addEventListener('click',function(){
      var items=t.nextElementSibling;
      t.classList.toggle('collapsed');
      if(items) items.classList.toggle('collapsed');
    });
  });

  /* 左侧导航项交互 */
  if(dsNavEl){
    $$('.ds-nav-link',dsNavEl).forEach(function(link){
      link.addEventListener('click',function(){
        $$('.ds-nav-link',dsNavEl).forEach(function(l){l.classList.remove('active')});
        link.classList.add('active');
        var target=link.getAttribute('data-target');
        var comp=link.getAttribute('data-comp');
        if(target==='overview'){
          renderOverview();
          setUrlState('?view=design');
        }else if(comp){
          setUrlState('?view=design&token='+encodeURIComponent(comp));
          var cn=link.querySelector('em')?link.querySelector('em').textContent:'';
          var en=link.firstChild&&link.firstChild.nodeType===3?link.firstChild.textContent.trim():comp;
          if(dsHeroTitle) dsHeroTitle.textContent=en+' '+cn;
          if(dsHeroDesc) dsHeroDesc.textContent=dsCompDesc[comp]||'';
          if(dsCompDetail) dsCompDetail.style.display='';
          if(dsOverviewGrid) dsOverviewGrid.innerHTML='';
          if(dsDetailBody){
            if(comp==='GlobalStyles') dsDetailBody.innerHTML=renderGlobalStyles();
            else if(comp==='Icon') dsDetailBody.innerHTML=renderIcons();
            else if(comp==='Select'){dsDetailBody.innerHTML=renderSelect();bindDsSelect();}
            else {dsDetailBody.innerHTML=renderComp(comp,cn);bindDsInteractions(comp);}
          }
        }
      });
    });
  }

  /* ESC 从设计系统返回新会话 */
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape' && !viewDesign.classList.contains('hidden')){
      showView('newtask');
      setNavActive('新会话');
    }
  });

  /* URL 参数 ?view=xxx 自动恢复视图；预览器刷新会丢掉 query，用 localStorage 兜底 */
  var dsSearch=location.search;
  if(!dsSearch){
    var savedSearch=localStorage.getItem('lingeeUrlState');
    if(savedSearch){ dsSearch=savedSearch; history.replaceState(null,'',savedSearch); }
  }
  var dsViewParam=new URLSearchParams(dsSearch).get('view');
  /* 专家视图已并入协作开发，兼容旧的 ?view=experts */
  if(dsViewParam==='experts') dsViewParam='collab';
  var dsTokenParam=new URLSearchParams(dsSearch).get('token');
  if(dsViewParam==='design'){
    showView('design');
    if(navItems) navItems.forEach(function(n){n.classList.remove('active')});
    if(dsTokenParam){
      var tokenLink=$$('.ds-nav-link',dsNavEl).filter(function(l){return l.getAttribute('data-comp')===dsTokenParam;})[0];
      if(tokenLink) tokenLink.click();
      else renderOverview();
    }else{
      renderOverview();
    }
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
  var EXPERT_AV = {
    lead:'<rect width="128" height="128" rx="26" fill="#1e40af"/><circle cx="64" cy="44" r="19" fill="#dbeafe"/><path d="M27 104c4-23 18-34 37-34s33 11 37 34" fill="#93c5fd"/>',
    pm:'<rect width="128" height="128" rx="26" fill="#c2410c"/><rect x="32" y="26" width="64" height="78" rx="9" fill="#ffedd5"/><path d="M45 48h38M45 65h38M45 82h24" stroke="#c2410c" stroke-width="7" stroke-linecap="round"/>',
    arch:'<rect width="128" height="128" rx="26" fill="#6d28d9"/><path d="M26 94h76M36 94V56l28-21 28 21v38M52 94V72h24v22" fill="none" stroke="#ede9fe" stroke-width="8" stroke-linejoin="round"/>',
    eng:'<rect width="128" height="128" rx="26" fill="#047857"/><path d="M50 40L26 64l24 24M78 40l24 24-24 24M70 30L58 98" fill="none" stroke="#d1fae5" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>',
    qa:'<rect width="128" height="128" rx="26" fill="#be123c"/><path d="M64 22l36 14v26c0 24-14 37-36 45-22-8-36-21-36-45V36z" fill="#ffe4e6"/><path d="M46 63l13 13 26-28" fill="none" stroke="#be123c" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>',
    cr:'<rect width="128" height="128" rx="26" fill="#0e7490"/><circle cx="57" cy="55" r="25" fill="none" stroke="#cffafe" stroke-width="9"/><path d="M76 75l24 24" stroke="#cffafe" stroke-width="10" stroke-linecap="round"/>',
    sec:'<rect width="128" height="128" rx="26" fill="#3f3f46"/><path d="M64 22l35 13v29c0 23-13 36-35 44-22-8-35-21-35-44V35z" fill="none" stroke="#e4e4e7" stroke-width="9" stroke-linejoin="round"/><rect x="51" y="58" width="26" height="23" rx="4" fill="#e4e4e7"/><path d="M57 58v-7a7 7 0 0114 0v7" fill="none" stroke="#e4e4e7" stroke-width="7"/>',
    ana:'<rect width="128" height="128" rx="26" fill="#475569"/><path d="M30 96V64M52 96V40M74 96V74M96 96V50" stroke="#e2e8f0" stroke-width="11" stroke-linecap="round"/>',
    fe:'<rect width="128" height="128" rx="26" fill="#0369a1"/><rect x="24" y="30" width="80" height="62" rx="8" fill="#e0f2fe"/><path d="M24 48h80" stroke="#0369a1" stroke-width="7"/><circle cx="38" cy="39" r="4" fill="#0369a1"/><path d="M48 68h32" stroke="#0369a1" stroke-width="7" stroke-linecap="round"/>',
    ux:'<rect width="128" height="128" rx="26" fill="#be185d"/><circle cx="48" cy="48" r="17" fill="#fce7f3"/><circle cx="80" cy="80" r="17" fill="#f9a8d4"/><path d="M48 65v15h15" stroke="#fce7f3" stroke-width="7" fill="none"/>',
    form:'<rect width="128" height="128" rx="26" fill="#0f766e"/><rect x="28" y="24" width="72" height="80" rx="9" fill="#ccfbf1"/><path d="M42 46h30M42 64h44M42 82h20" stroke="#0f766e" stroke-width="7" stroke-linecap="round"/>',
    flow:'<rect width="128" height="128" rx="26" fill="#7c3aed"/><circle cx="34" cy="34" r="13" fill="#ede9fe"/><circle cx="94" cy="64" r="13" fill="#ede9fe"/><circle cx="34" cy="94" r="13" fill="#ede9fe"/><path d="M47 40l35 18M47 88l35-18" stroke="#ede9fe" stroke-width="7"/>',
    rpt:'<rect width="128" height="128" rx="26" fill="#a16207"/><path d="M34 94V54M60 94V32M86 94V68" stroke="#fef3c7" stroke-width="12" stroke-linecap="round"/><path d="M22 104h84" stroke="#fef3c7" stroke-width="7" stroke-linecap="round"/>',
    plug:'<rect width="128" height="128" rx="26" fill="#4338ca"/><path d="M44 30v22M84 30v22" stroke="#e0e7ff" stroke-width="9" stroke-linecap="round"/><rect x="32" y="52" width="64" height="34" rx="10" fill="#e0e7ff"/><path d="M64 86v18" stroke="#e0e7ff" stroke-width="9" stroke-linecap="round"/>',
    api:'<rect width="128" height="128" rx="26" fill="#0891b2"/><circle cx="38" cy="64" r="14" fill="#cffafe"/><circle cx="90" cy="38" r="14" fill="#cffafe"/><circle cx="90" cy="90" r="14" fill="#cffafe"/><path d="M50 58l28-14M50 70l28 14" stroke="#cffafe" stroke-width="7"/>'
  };
  function xav(k){ return 'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">'+EXPERT_AV[k]+'</svg>'); }
  function xesc(v){ return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}); }

  var EXPERTS=[
    {id:'software-team-lead',k:'lead',name:'软件团队负责人',role:'交付负责人',by:'Lingee 内置',
     desc:'协调范围、分工、集成、风险与交付闭环，是专家团里唯一能开 kickoff 与做最终集成确认的角色。',
     tags:['交付管理','团队协调'],modes:['分析','设计','集成','评审','验证','恢复'],
     comp:['delivery.orchestration · principal','delivery.integration · advanced'],
     cmds:[['帮我把这个目标拆成范围、非目标和验收门禁','闭合范围，明确谁负责、做到什么算完'],
           ['这次交付复盘一下，还有哪些残余风险','汇总各角色证据，给出关闭或升级建议']],
     steps:['闭合范围与验收条件','分派有边界的角色任务','编排依赖顺序与集成门禁','汇总证据与残余风险','给出关闭或升级建议'],
     cons:['不得用协调判断替代专业证据','不得授予资格或权限','未解决的重大范围冲突必须升级']},
    {id:'software-product-manager',k:'pm',name:'软件产品经理',role:'产品经理',by:'Lingee 内置',
     desc:'把用户目标翻译成有优先级、可观察的需求与验收条件。',
     tags:['需求分析','验收设计'],modes:['分析','设计','评审'],
     comp:['product.requirements · principal','product.acceptance-design · advanced'],
     cmds:[['把这个需求拆成一份带验收条件的清单','把目标整理成有范围、可验收的需求'],
           ['帮我给这些需求补齐验收标准','补上可观察、可验证的验收条件'],
           ['这次哪些事不做？帮我列一下非目标','明确边界，防止范围蔓延']],
     steps:['识别用户与期望结果','梳理现状与目标流程','排定需求优先级与非目标','编写可观察的验收条件','消解或升级重大歧义'],
     cons:['不得虚构客户批准','不得把代码结构写成业务需求','不授予发布权限'],out:'docs/requirements.md'},
    {id:'software-architect',k:'arch',name:'软件架构师',role:'软件架构师',by:'Lingee 内置',
     desc:'设计可演进的系统边界、合同、数据流与失败处理，产出架构文档与可执行的实现计划。',
     tags:['软件架构','可靠性'],modes:['分析','设计','集成','评审','恢复'],
     comp:['architecture.system-design · principal','architecture.reliability · advanced'],
     cmds:[['帮我设计这个系统的边界、合同和失败处理','从需求产出可演进的架构方案与迁移路径'],
           ['这几个方案怎么选？帮我做技术选型','按质量属性评估备选方案并记录取舍'],
           ['把架构拆成可以直接开工的实现计划','产出带可执行验证命令的编码任务图']],
     steps:['建模边界与数据归属','按质量属性评估备选方案','定义合同、失败行为与迁移','记录决策与被否决方案','指定架构验证场景'],
     cons:['采用满足实测需求的最小架构','每条实现验证必须是可执行命令，拒绝人工目视检查','验证命令需在 macOS 与 Linux 上可移植'],
     out:'docs/architecture.md · docs/implementation-plan.json'},
    {id:'software-engineer',k:'eng',name:'软件工程师',role:'软件工程师',by:'Lingee 内置',
     desc:'实现可维护的软件变更并完成针对性验证，只改授权范围内的代码。',
     tags:['软件实现','系统集成'],modes:['分析','设计','实现','集成','验证','恢复'],
     comp:['engineering.implementation · advanced','engineering.integration · advanced'],
     skills:['cosmic-app-builder','general-app-builder','site-builder'],
     cmds:[['按这份验收条件把功能实现出来','完成最小完整变更并跑通验证'],
           ['这个 bug 帮我复现并修掉','定位根因、修复并补回归测试'],
           ['做一个单页小工具，一次写完','小应用一次性写完全部代码 + build 验证']],
     steps:['复现或确立当前行为','阅读受影响的合同与调用点','实现最小完整的源码变更','同步更新测试与生成物','运行聚焦与包级验证'],
     cons:['只修改已授权范围','不得绕过失败的检查','不得声称拥有部署或 Runner 权限']},
    {id:'software-qa-engineer',k:'qa',name:'软件测试工程师',role:'质量工程师',by:'Lingee 内置',
     desc:'独立验证验收行为、回归影响与交付风险，给出基于证据的质量结论。',
     tags:['质量保障','独立验证'],modes:['分析','设计','评审','验证'],
     comp:['quality.verification · principal','quality.regression-analysis · advanced'],
     cmds:[['这次改动要测哪些场景？帮我出验证计划','按风险模型设计验收与回归场景'],
           ['帮我端到端跑一遍，看看能不能过','实际跑 build、请求与用例并留存证据'],
           ['这个版本能发吗？给个质量结论','给出 pass / pass-with-risk / fail 与理由']],
     steps:['梳理变更影响与质量风险','设计验收与回归场景','执行授权范围内最强的检查','复现并分级缺陷','给出基于证据的质量结论'],
     cons:['与实现方声明保持独立','不得执行破坏性或未批准的压测','不授予发布权限']},
    {id:'code-reviewer',k:'cr',name:'代码评审专家',role:'实现代码评审',by:'Lingee 内置',ro:true,
     desc:'独立评审实现代码的正确性、并发安全与合同落实情况，只读不改。',
     tags:['只读评审','正确性'],modes:['评审','验证'],
     comp:['implementation-correctness · principal','concurrent-commit-model · principal'],
     cmds:[['帮我评审这段代码有没有正确性问题','把合同义务追溯到代码路径，报告可复现的缺陷']],
     steps:['把合同义务追溯到具体代码路径与可观察结果','检查规范化、声明、失败清理与并发测试','以可复现的判定标准报告实现缺陷'],
     cons:['不得修改实现或其测试','不得把注释或名义类型当作行为证明']},
    {id:'security-reviewer',k:'sec',name:'安全评审专家',role:'应用安全评审',by:'Lingee 内置',ro:true,
     desc:'基于信任边界建立威胁模型，演练滥用、竞态与绕过场景并给出风险判定。',
     tags:['只读评审','威胁建模'],modes:['评审','验证'],
     comp:['application-security · principal','filesystem-safety · advanced'],
     cmds:[['这个功能有安全风险吗？帮我做威胁建模','演练滥用与绕过场景，判断风险是否可接受']],
     steps:['基于信任边界建立威胁模型','演练滥用、竞态、部分失败与绕过场景','对安全发现分级并判断风险模型是否可接受'],
     cons:['不得修改被评审产物或直接修复','不得接受无证据的原子性与竞态安全保证']},
    {id:'read-only-analyst',k:'ana',name:'只读分析专家',role:'软件分析',by:'Lingee 内置',ro:true,
     desc:'在不改动工作区的前提下做有边界的源码分析与结论交叉验证。',
     tags:['只读分析'],modes:['分析','评审','验证'],
     comp:['software.analysis · advanced'],
     cmds:[['帮我读一下这块代码是怎么跑的','有边界地读源码，给出结论与证据，不改文件']],
     steps:['检视有边界的源码与合同','用直接证据交叉验证发现','在不改动工作区的前提下给出结论'],
     cons:['不得修改文件','不得执行有副作用的命令']},
    {id:'frontend-engineer',k:'fe',name:'前端工程专家',role:'前端工程师',by:'金蝶官方',
     desc:'金蝶前端规范下的组件实现、响应式布局与交互调试。',
     tags:['React','响应式','组件库'],modes:['设计','实现','验证'],
     comp:['engineering.frontend · advanced'],skills:['cosmic-kwc-builder','frontend-design'],
     cmds:[['按这张设计稿把页面实现出来','实现响应式页面与交互'],
           ['帮我抽一个可复用的组件','产出符合金蝶前端规范的组件'],
           ['页面和设计稿对不上，帮我调一下','把实现调到与设计稿一致']],
     steps:['确认设计稿与交互规范','实现组件与布局','处理多端与暗色适配','补组件测试'],
     cons:['遵循金蝶前端规范','不得引入未评估的第三方依赖']},
    {id:'ux-designer',k:'ux',name:'界面设计专家',role:'交互 / 视觉设计',by:'金蝶官方',
     desc:'信息架构、交互流程与视觉规范，产出可直接交付前端的设计说明。',
     tags:['交互设计','视觉规范'],modes:['分析','设计','评审'],
     comp:['design.interaction · advanced'],skills:['prototype-builder','frontend-design'],
     cmds:[['这个功能该怎么设计？先对齐一下目标','产出设计简报，对齐业务目标与设计策略'],
           ['帮我梳理这个模块的信息架构','理清导航、层级与页面骨架'],
           ['帮我走查一下这个页面','对已实现页面做规范与可用性检查']],
     steps:['澄清目标用户与场景','梳理信息架构与主流程','产出交互与视觉规范','走查实现一致性'],
     cons:['设计说明必须可被前端直接实现','不得规定与设计系统冲突的样式']},
    {id:'cosmic-form',k:'form',name:'苍穹表单专家',role:'苍穹表单',by:'金蝶官方',
     desc:'KDDP 表单引擎的字段、校验、联动与权限配置。',
     tags:['表单设计','字段校验'],modes:['分析','设计','实现'],
     comp:['cosmic.form-design · advanced'],skills:['cosmic-requirements-spec'],
     cmds:[['帮我建一张这个业务的苍穹单据','设计表单结构与字段'],
           ['这几个字段要联动，帮我配一下','配置校验规则与字段联动逻辑'],
           ['这张单据的权限怎么配？','设置单据与字段级权限']],
     steps:['梳理单据业务规则','设计表单结构与字段','配置校验与联动','映射数据模型'],
     cons:['遵循苍穹元数据规范','不得绕过标准扩展点直接改内核']},
    {id:'cosmic-workflow',k:'flow',name:'苍穹工作流专家',role:'苍穹工作流',by:'金蝶官方',
     desc:'审批链配置与流程调试，处理加签、会签、条件流转等复杂场景。',
     tags:['审批链','流程调试'],modes:['分析','设计','实现','验证'],
     comp:['cosmic.workflow · advanced'],
     cmds:[['帮我设计一个请假申请的苍穹审批流程','梳理审批场景并配置工作流'],
           ['我的审批流节点卡住了，帮我排查','定位节点为什么不流转']],
     steps:['梳理审批场景与角色','配置流程节点与条件','调试流转与异常分支','验证端到端审批'],
     cons:['流程变更需保留可回滚配置']},
    {id:'cosmic-report',k:'rpt',name:'苍穹报表专家',role:'苍穹报表',by:'金蝶官方',
     desc:'报表建模、取数逻辑与图表配置，兼顾查询性能与交互式分析。',
     tags:['报表建模','取数逻辑'],modes:['分析','设计','实现'],
     comp:['cosmic.report · advanced'],
     cmds:[['帮我做一张这个口径的报表','设计报表数据模型与取数逻辑'],
           ['报表查得太慢了，帮我优化','优化取数与查询性能']],
     steps:['明确分析口径','设计数据模型与取数','配置图表与交互','优化查询性能'],
     cons:['取数口径需与业务确认后固化']},
    {id:'cosmic-plugin',k:'plug',name:'苍穹二开插件专家',role:'苍穹二开',by:'金蝶官方',
     desc:'基于扩展点开发二开插件，处理注册、生命周期调试与升级兼容。',
     tags:['插件开发','扩展点'],modes:['设计','实现','验证','恢复'],
     comp:['cosmic.plugin · advanced'],skills:['cosmic-reverse-engineering'],
     cmds:[['帮我基于扩展点写一个二开插件','定位扩展点并实现插件逻辑'],
           ['插件注册了但不生效，帮我看看','排查注册与生命周期问题']],
     steps:['定位合适的扩展点','实现插件逻辑','注册并调试生命周期','验证升级兼容'],
     cons:['不得修改标准产品内核','插件必须可独立卸载']},
    {id:'cosmic-api',k:'api',name:'苍穹集成接口专家',role:'苍穹集成',by:'金蝶官方',
     desc:'开放接口对接、鉴权配置与数据同步，含异常重试与幂等设计。',
     tags:['接口对接','鉴权'],modes:['设计','实现','集成','验证'],
     comp:['cosmic.integration · advanced'],
     cmds:[['帮我对接这个苍穹开放接口','确认契约与鉴权方式并实现对接'],
           ['接口鉴权怎么配？','配置鉴权与安全策略'],
           ['两边数据要同步，帮我设计方案','设计幂等同步任务与异常重试']],
     steps:['确认接口契约与鉴权方式','实现对接与错误处理','设计幂等与重试','联调验证'],
     cons:['凭据不得硬编码','同步必须幂等可重放']}
  ];
  var BUILTIN_EXPERTS=EXPERTS;
  var MY_EXPERTS=[];                 /* 我自己创建的专家，落 localStorage */
  var EX={};
  function rebuildExperts(){
    EXPERTS=BUILTIN_EXPERTS.concat(MY_EXPERTS);
    EX={}; EXPERTS.forEach(function(e){EX[e.id]=e});
  }
  rebuildExperts();

  /* 可选头像：复用内置的一套图形，创建专家时挑一个 */
  var AV_KEYS=['lead','pm','arch','eng','qa','cr','sec','ana','fe','ux','form','flow','rpt','plug','api'];
  var WORK_MODES=['分析','设计','实现','集成','评审','验证','恢复'];

  var PRESET_TEAMS=[
    {id:'software-company',preset:true,name:'软件开发团队',by:'Lingee 内置',
     desc:'跨职能软件产品交付团队，覆盖需求、架构、实现、质量与集成的完整闭环。也是新建任务时的默认选择。',
     leadId:'software-team-lead',
     members:['software-team-lead','software-product-manager','software-architect','software-engineer','software-qa-engineer'],
     cmds:[['帮我把这个想法做成一个能上线的功能','从需求到验收走完整闭环'],
           ['这个模块要重做，帮我走一遍完整流程','需求、架构、实现、测试、集成逐环节推进'],
           ['需求还没理清，先帮我拆一版方案再动手','先出需求与实现计划，评审通过再编码']]},
    {id:'fast-app',preset:true,name:'应用速成小队',by:'Lingee 内置',
     desc:'工程师一次性写完全部代码，QA 端到端验证。适合单页应用、小游戏、原型页这类一次交付的活。',
     leadId:'software-engineer',
     members:['software-engineer','software-qa-engineer'],
     cmds:[['做一个单页小工具，今天就要用','一次性写完代码并跑通 build'],
           ['帮我快速搭个原型页看看效果','省掉评审环节，直接实现 + 自检'],
           ['写个小游戏练手','小体量一次交付']]},
    {id:'cosmic-team',preset:true,name:'苍穹交付团队',by:'金蝶官方',
     desc:'面向苍穹配置化交付：需求规格 → 表单与流程配置 → 报表 → 二开插件 → 接口集成。',
     leadId:'software-team-lead',
     members:['software-team-lead','software-product-manager','cosmic-form','cosmic-workflow','cosmic-report','cosmic-api'],
     cmds:[['帮我在苍穹上做一套请假申请，从单据到审批','表单、流程、报表、接口一条龙配下来'],
           ['这个业务要在苍穹落地，帮我出方案','先出需求规格，再分头配置'],
           ['苍穹这块单据和流程都要改，帮我排一下','按依赖顺序编排配置任务']]},
    {id:'web-team',preset:true,name:'网页交付小队',by:'金蝶官方',
     desc:'设计与前端配对交付：信息架构与视觉规范先行，前端按规范实现并做设计走查。',
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
        steps:Array.isArray(e.steps)?e.steps:[],
        cons:Array.isArray(e.cons)?e.cons:[]};
    }).filter(function(e){ return e.modes.length; });
    rebuildExperts();

    var custom=Array.isArray(d.teams)?d.teams:[];
    var valid=custom.filter(function(t){
      return t&&typeof t.id==='string'&&!t.preset&&typeof t.name==='string'
        &&Array.isArray(t.members)&&t.members.every(function(m){return !!EX[m]});
    }).map(function(t){
      return {id:t.id,preset:false,name:t.name,by:t.by||'我创建的',desc:t.desc||'',
        leadId:EX[t.leadId]?t.leadId:(t.members[0]||null),members:t.members.slice(),
        cmds:(Array.isArray(t.cmds)?t.cmds:[]).filter(function(c){return Array.isArray(c)&&c[0]})};
    });
    TEAMS=PRESET_TEAMS.slice().concat(valid);
  }
  function saveTeams(){
    try{
      localStorage.setItem(TEAM_STORE_KEY, JSON.stringify({
        v:1,
        teams:TEAMS.filter(function(t){return !t.preset}),
        experts:MY_EXPERTS.map(function(e){
          return {id:e.id,k:e.k,name:e.name,role:e.role,desc:e.desc,tags:e.tags,
                  modes:e.modes,comp:e.comp,cmds:e.cmds,steps:e.steps,cons:e.cons};
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
    if(multi && lead) f.push({k:'analyze',title:'协调范围与门禁',who:lead});
    var pm=any('software-product-manager');
    if(pm) f.push({k:'analyze',title:'分析需求与验收',who:pm});
    var des=any('software-architect','ux-designer');
    if(des) f.push({k:'design',title:'设计方案与实现计划',who:des});
    var rev=any('code-reviewer','read-only-analyst');
    if(rev) f.push({k:'review',title:'编码准入评审',who:rev});
    f.push({k:'implement',title:'实现编码任务',
      who:any('software-engineer','frontend-engineer','cosmic-form','cosmic-workflow','cosmic-report','cosmic-plugin','cosmic-api')||byMode('实现')});
    var sec=any('security-reviewer');
    if(sec) f.push({k:'review',title:'安全评审',who:sec});
    var qa=any('software-qa-engineer')||byMode('验证',lead);
    if(qa) f.push({k:'test',title:'质量验证',who:qa});
    var itg=lead||any('software-architect')||byMode('集成');
    if(multi && itg) f.push({k:'integrate',title:'集成与交付确认',who:itg});
    return f;
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

  /* ---------- 专家库视图 ---------- */
  var expertTab='team', expertKw='';
  var expertGrid=$('#expertGrid');
  function facesHtml(ids,n){
    return '<span class="x-faces">'+ids.slice(0,n||4).map(function(i){
      return '<img src="'+xav(EX[i].k)+'" alt="">'; }).join('')+'</span>';
  }
  function renderExpertGrid(){
    if(!expertGrid) return;
    var kw=expertKw.trim(), html='';
    if(expertTab==='team'){
      var rows=TEAMS.filter(function(t){
        if(!kw) return true;
        return (t.name+t.desc+t.members.map(function(m){return EX[m].name}).join()).indexOf(kw)>=0;
      });
      html=rows.map(function(t){
        return '<div class="app-card x-card" data-team="'+t.id+'">'
          +'<button type="button" class="x-call" data-call-team="'+t.id+'" title="召唤这个专家团">召唤</button>'
          +'<div class="card-top">'+facesHtml(t.members,4)
          +'<div class="card-titles"><div class="card-title-row"><span class="card-title">'+xesc(t.name)+'</span>'
          +(t.preset?'<span class="x-badge">内置</span>':'')+'</div>'
          +'<div class="x-sub">'+xesc(t.by)+' · '+t.members.length+' 位专家</div></div></div>'
          +'<div class="card-desc">'+xesc(t.desc)+'</div>'
          +'<div class="card-tags">'
          +t.members.slice(0,3).map(function(m){return '<span class="ptag">'+EX[m].role+'</span>'}).join('')+'</div></div>';
      }).join('');
    }else{
      var rows2=EXPERTS.filter(function(e){
        if(!kw) return true;
        return (e.name+e.role+e.desc+e.tags.join()).indexOf(kw)>=0;
      });
      html=rows2.map(function(e){
        return '<div class="app-card x-card" data-expert="'+e.id+'">'
          +'<button type="button" class="x-call" data-call-expert="'+e.id+'" title="召唤这位专家">召唤</button>'
          +'<div class="card-top"><img class="x-av" src="'+xav(e.k)+'" alt="">'
          +'<div class="card-titles"><div class="card-title-row"><span class="card-title">'+xesc(e.name)+'</span>'
          +(e.ro?'<span class="x-badge x-badge-ro">只读</span>':'')
          +(e.mine?'<span class="x-badge x-badge-mine">我创建的</span>':'')+'</div>'
          +'<div class="x-sub">'+xesc(e.role)+' · '+xesc(e.by)+'</div></div></div>'
          +'<div class="card-desc">'+xesc(e.desc)+'</div>'
          +'<div class="card-tags">'+e.tags.slice(0,3).map(function(t){return '<span class="ptag">'+xesc(t)+'</span>'}).join('')+'</div></div>';
      }).join('');
    }
    if(!kw) html += expertTab==='team'
      ? '<button type="button" class="app-card x-new-card" data-new-team><span class="x-new-ic">＋</span><span>新建专家团</span>'
        +'<span class="x-new-sub">从专家库里挑几个人，定好交付强度</span></button>'
      : '<button type="button" class="app-card x-new-card" data-new-expert><span class="x-new-ic">＋</span><span>创建专家</span>'
        +'<span class="x-new-sub">手填表单，或一句话交给 expert-manager</span></button>';
    expertGrid.innerHTML = html || '<div class="x-empty">没有匹配的结果</div>';
    var tc=$('#teamTabCount'), ec=$('#expertTabCount');
    if(tc) tc.textContent=TEAMS.length;
    if(ec) ec.textContent=EXPERTS.length;
    var lb=$('#newExpertEntryLabel');
    if(lb) lb.textContent = expertTab==='team' ? '新建专家团' : '创建专家';
  }
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

  /* ---------- 专家详情弹窗 ---------- */
  var expertModal=$('#expertModal');
  function openExpertModal(id){
    var e=EX[id]; if(!e) return;
    $('#expertModalHead').innerHTML='<div class="x-detail-head"><img class="x-av-lg" src="'+xav(e.k)+'" alt="">'
      +'<div><div class="modal-title">'+xesc(e.name)+(e.ro?' <span class="x-badge x-badge-ro">只读</span>':'')+'</div>'
      +'<div class="x-sub">'+xesc(e.role)+' · '+xesc(e.by)+'</div></div></div>'
      +'<button class="modal-close" type="button" data-x-close aria-label="关闭">×</button>';
    function list(title,arr){ return (arr&&arr.length)?'<div class="x-sec"><div class="x-sec-t">'+title+'</div><ul class="x-ul">'
      +arr.map(function(v){return '<li>'+xesc(v)+'</li>'}).join('')+'</ul></div>':''; }
    $('#expertModalBody').innerHTML='<div class="x-sec x-desc">'+xesc(e.desc)+'</div>'
      +(e.cmds.length?'<div class="x-sec"><div class="x-sec-t">常见触发词</div>'
      +e.cmds.map(function(c){return '<button type="button" class="x-cmd" data-cmd="'+xesc(c[0])+'" data-cmd-of="'+e.id+'">'
        +'<span class="x-cmd-b"><span class="x-cmd-q">“'+xesc(c[0])+'”</span>'
        +(c[1]?'<span class="x-cmd-d">'+xesc(c[1])+'</span>':'')+'</span>'
        +'<svg class="x-cmd-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 0 1 11 4h2a8 8 0 0 1 8 8z"/></svg>'
        +'</button>'}).join('')+'</div>':'')
      +(e.skills?'<div class="x-sec"><div class="x-sec-t">挂载技能</div><div class="x-chips">'+e.skills.map(function(k){return '<span class="ptag">'+xesc(k)+'</span>'}).join('')+'</div></div>':'')
      +'<div class="x-sec"><div class="x-sec-t">能力项</div><div class="x-chips">'+e.comp.map(function(c){return '<span class="ptag">'+xesc(c)+'</span>'}).join('')+'</div></div>'
      +'<div class="x-sec"><div class="x-sec-t">可承担的工作</div><div class="x-chips">'+e.modes.map(function(m){return '<span class="ptag">'+xesc(m)+'</span>'}).join('')+'</div></div>'
      +(e.out?'<div class="x-sec"><div class="x-sec-t">专属产物</div><div class="x-chips"><span class="ptag">'+xesc(e.out)+'</span></div></div>':'')
      +list('工作方式',e.steps)+list('行为约束',e.cons);
    $('#expertModalFoot').innerHTML=
      (e.mine?'<button type="button" class="btn-link team-delete-btn" data-x-del="'+e.id+'">删除该专家</button>':'')
      +'<div class="team-footer-spacer"></div>'
      +(e.mine?'<button type="button" class="modal-btn cancel" data-x-edit="'+e.id+'">编辑</button>':'')
      +'<button type="button" class="modal-btn confirm" data-x-call="'+e.id+'">召唤专家</button>';
    $('#expertModalFoot').className='modal-footer team-modal-footer';
    expertModal.classList.add('show');
  }
  if(expertModal) expertModal.addEventListener('click',function(e){
    if(e.target===expertModal||e.target.closest('[data-x-close]')){ expertModal.classList.remove('show'); return; }
    var ed=e.target.closest('[data-x-edit]');
    if(ed){ expertModal.classList.remove('show'); openExpertEditor(ed.getAttribute('data-x-edit')); return; }
    var dl=e.target.closest('[data-x-del]');
    if(dl){ deleteMyExpert(dl.getAttribute('data-x-del')); return; }
    var cl=e.target.closest('[data-x-call]');
    if(cl){
      expertModal.classList.remove('show');
      summon('expert',cl.getAttribute('data-x-call'));
      return;
    }
    var c=e.target.closest('[data-cmd]');
    if(c){
      var eid=c.getAttribute('data-cmd-of');
      expertModal.classList.remove('show');
      summon('expert',eid,c.getAttribute('data-cmd'));
    }
  });

  /* ---------- 没选专家时的自动匹配 ---------- */
  /* 专家团不是必选的：不选就由系统按开发模式 + 任务描述挑一个，并在会话里说明挑了谁 */
  var MODE_MATCH={
    '苍穹应用':{kind:'team',id:'cosmic-team'},
    '原型探索':{kind:'expert',id:'ux-designer'},
    '通用应用':{kind:'team',id:'fast-app'},
    '业务组件':{kind:'expert',id:'software-engineer'},
    '技能开发':{kind:'expert',id:'software-engineer'},
    '智能体开发':{kind:'expert',id:'software-engineer'}
  };
  /* 关键词 → 专家。命中多个领域时升级成专家团 */
  var KW_MATCH=[
    {id:'cosmic-workflow', kw:['工作流','审批','流转','加签','会签','流程节点']},
    {id:'cosmic-form',     kw:['表单','单据','字段','校验','联动']},
    {id:'cosmic-report',   kw:['报表','取数','图表','口径']},
    {id:'cosmic-plugin',   kw:['插件','扩展点','二开']},
    {id:'cosmic-api',      kw:['接口','对接','鉴权','同步','集成']},
    {id:'frontend-engineer',kw:['页面','前端','样式','组件','响应式','布局']},
    {id:'ux-designer',     kw:['设计','交互','原型','信息架构','视觉']},
    {id:'software-qa-engineer',kw:['测试','验证','回归','用例']},
    {id:'security-reviewer',kw:['安全','漏洞','越权','威胁']},
    {id:'code-reviewer',   kw:['评审','review','代码质量']},
    {id:'software-architect',kw:['架构','选型','边界','技术方案']},
    {id:'software-product-manager',kw:['需求','验收','范围','非目标']}
  ];
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
    if(expertEditModal) expertEditModal.classList.remove('show');
    if(expertModal) expertModal.classList.remove('show');
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
    if(expertModal) expertModal.classList.remove('show');
    saveTeams(); renderExpertGrid(); renderExpertChips();
    toast('已删除「'+e.name+'」','success');
  }

  var expertEditModal=$('#expertEditModal'), xeDraft=null, xeEditingId=null;
  function setXeTab(which){
    $$('#xeTabs .modal-tab').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-xtab')===which); });
    $$('#expertEditModal .team-pane').forEach(function(el){ el.classList.toggle('hidden', el.getAttribute('data-xpane')!==which); });
    var body=$('#expertEditModal .modal-body'); if(body) body.scrollTop=0;
  }
  if($('#xeTabs')) $('#xeTabs').addEventListener('click',function(e){
    var b=e.target.closest('.modal-tab'); if(b) setXeTab(b.getAttribute('data-xtab'));
  });
  function blankExpert(){
    return {k:'eng',name:'',role:'',desc:'',tags:[],modes:['分析','设计','实现'],
            comp:[],cmds:[['','']],steps:[],cons:[]};
  }
  function openExpertEditor(id){
    if(!expertEditModal) return;
    var e=id?EX[id]:null;
    xeEditingId=(e&&e.mine)?id:null;
    xeDraft = xeEditingId
      ? {k:e.k,name:e.name,role:e.role,desc:e.desc,tags:e.tags.slice(),modes:e.modes.slice(),
         comp:e.comp.slice(),cmds:e.cmds.length?e.cmds.map(function(c){return c.slice()}):[['','']],
         steps:e.steps.slice(),cons:e.cons.slice()}
      : blankExpert();
    $('#expertEditTitle').textContent = xeEditingId ? '编辑专家' : '创建专家';
    $('#xeName').value=xeDraft.name; $('#xeRole').value=xeDraft.role; $('#xeDesc').value=xeDraft.desc;
    $('#xeTags').value=xeDraft.tags.join('、'); $('#xeComp').value=xeDraft.comp.join('、');
    $('#xeSteps').value=xeDraft.steps.join('\n'); $('#xeCons').value=xeDraft.cons.join('\n');
    $('#xeDeleteBtn').classList.toggle('hidden', !xeEditingId);
    setXeTab('base');
    renderExpertEditor();
    expertEditModal.classList.add('show');
    setTimeout(function(){ $('#xeName').focus(); },40);
  }
  function renderExpertEditor(){
    var d=xeDraft; if(!d) return;
    $('#xeAvatars').innerHTML=AV_KEYS.map(function(k){
      return '<button type="button" class="x-av-opt'+(d.k===k?' on':'')+'" data-xe-av="'+k+'">'
        +'<img src="'+xav(k)+'" alt=""></button>';
    }).join('');
    $('#xeModes').innerHTML=WORK_MODES.map(function(m){
      return '<button type="button" class="x-mode-opt'+(d.modes.indexOf(m)>=0?' on':'')+'" data-xe-mode="'+m+'">'+m+'</button>';
    }).join('');
    $('#xeCmds').innerHTML=d.cmds.map(function(c,i){
      return '<div class="x-cmd-row"><input type="text" class="x-cmd-k" data-xe-cmd="'+i+'" data-f="0" value="'+xesc(c[0])+'" placeholder="用户会怎么说，例如：帮我设计一个请假审批流程" autocomplete="off">'
        +'<button type="button" class="x-ic x-ic-dg" data-xe-rmcmd="'+i+'" title="删除">✕</button></div>';
    }).join('');
  }
  function splitList(v){
    return String(v||'').split(/[、,，\n]/).map(function(x){return x.trim()}).filter(Boolean);
  }
  function splitLines(v){
    return String(v||'').split('\n').map(function(x){return x.trim()}).filter(Boolean);
  }
  if(expertEditModal){
    $('#expertEditClose').addEventListener('click',function(){ expertEditModal.classList.remove('show') });
    $('#xeCancelBtn').addEventListener('click',function(){ expertEditModal.classList.remove('show') });
    $('#xeAddCmd').addEventListener('click',function(){ xeDraft.cmds.push(['','']); renderExpertEditor(); });
    $('#xeDeleteBtn').addEventListener('click',function(){ if(xeEditingId){ expertEditModal.classList.remove('show'); deleteMyExpert(xeEditingId); } });
    $('#xeChatBtn').addEventListener('click',startExpertByChat);
    expertEditModal.addEventListener('click',function(ev){
      if(ev.target===expertEditModal){ expertEditModal.classList.remove('show'); return; }
      var a=ev.target.closest('[data-xe-av]');
      if(a){ xeDraft.k=a.getAttribute('data-xe-av'); renderExpertEditor(); return; }
      var m=ev.target.closest('[data-xe-mode]');
      if(m){
        var v=m.getAttribute('data-xe-mode'), i=xeDraft.modes.indexOf(v);
        if(i<0) xeDraft.modes.push(v); else xeDraft.modes.splice(i,1);
        renderExpertEditor(); return;
      }
      var r=ev.target.closest('[data-xe-rmcmd]');
      if(r){
        xeDraft.cmds.splice(+r.getAttribute('data-xe-rmcmd'),1);
        if(!xeDraft.cmds.length) xeDraft.cmds.push(['','']);
        renderExpertEditor(); return;
      }
    });
    expertEditModal.addEventListener('input',function(ev){
      var c=ev.target.closest('[data-xe-cmd]');
      if(c){ xeDraft.cmds[+c.getAttribute('data-xe-cmd')][+c.getAttribute('data-f')]=c.value; }
    });
    $('#expertEditForm').addEventListener('submit',function(ev){
      ev.preventDefault();
      var d=xeDraft;
      d.name=$('#xeName').value.trim(); d.role=$('#xeRole').value.trim(); d.desc=$('#xeDesc').value.trim();
      d.tags=splitList($('#xeTags').value); d.comp=splitList($('#xeComp').value);
      d.steps=splitLines($('#xeSteps').value); d.cons=splitLines($('#xeCons').value);
      if(!d.name){ setXeTab('base'); toast('请填写专家名称','warning'); $('#xeName').focus(); return; }
      if(!d.role){ setXeTab('base'); toast('请填写职称，它会显示在名字后面','warning'); $('#xeRole').focus(); return; }
      if(!d.modes.length){ setXeTab('base'); toast('至少勾选一项「可承担的工作」，否则他在专家团里领不到任务','warning'); return; }
      var cmds=d.cmds.map(function(c){ return [String(c[0]||'').trim(),String(c[1]||'').trim()]; })
                     .filter(function(c){ return c[0]; });
      var rec={id:xeEditingId||('my-'+Date.now()),mine:true,k:d.k,name:d.name,role:d.role,by:'我创建的',
               desc:d.desc,tags:d.tags,modes:d.modes.slice(),comp:d.comp,cmds:cmds,steps:d.steps,cons:d.cons};
      if(xeEditingId){
        for(var i=0;i<MY_EXPERTS.length;i++) if(MY_EXPERTS[i].id===xeEditingId){ MY_EXPERTS[i]=rec; break; }
        toast('已保存','success');
      }else{
        MY_EXPERTS.push(rec);
        toast('专家「'+rec.name+'」已创建','success');
      }
      rebuildExperts();
      expertEditModal.classList.remove('show');
      saveTeams(); renderExpertGrid(); renderExpertChips();
    });
  }

  /* ---------- 专家团配置弹窗 ---------- */
  var teamModal=$('#teamModal'), teamDraft=null, teamEditingId=null;
  function setTeamTab(which){
    $$('#teamTabs .modal-tab').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-ttab')===which); });
    $$('#teamModal .team-pane').forEach(function(el){ el.classList.toggle('hidden', el.getAttribute('data-tpane')!==which); });
    var body=$('#teamModal .modal-body'); if(body) body.scrollTop=0;
  }
  if($('#teamTabs')) $('#teamTabs').addEventListener('click',function(e){
    var b=e.target.closest('.modal-tab'); if(b) setTeamTab(b.getAttribute('data-ttab'));
  });
  function teamCmdList(d){
    return (d.cmds||[]).map(function(c){ return [String(c[0]||'').trim(),String(c[1]||'').trim()]; })
                       .filter(function(c){ return c[0]; });
  }
  function openTeamModal(id){
    var t=id?teamById(id):null;
    teamEditingId=id||null;
    teamDraft=t?{name:t.name,desc:t.desc,leadId:t.leadId,members:t.members.slice(),preset:!!t.preset,
                 cmds:(t.cmds&&t.cmds.length)?t.cmds.map(function(c){return c.slice()}):[['','']]}
              :{name:'',desc:'',leadId:'software-team-lead',members:['software-team-lead','software-engineer'],preset:false,
                 cmds:[['','']]};
    $('#teamModalTitle').textContent = t?t.name:'新建专家团';
    $('#teamReadonlyTip').classList.toggle('hidden', !teamDraft.preset);
    $('#teamName').value=teamDraft.name; $('#teamDesc').value=teamDraft.desc;
    $('#teamName').readOnly=teamDraft.preset; $('#teamDesc').readOnly=teamDraft.preset;
    $('#teamName').classList.toggle('x-ro',teamDraft.preset);
    $('#teamDesc').classList.toggle('x-ro',teamDraft.preset);
    $('#teamSaveBtn').textContent = teamDraft.preset?'另存为我的专家团':'保存';
    /* 内置团最常用的动作是召唤，主按钮给它；自建团主按钮还是保存 */
    $('#teamSaveBtn').className = 'modal-btn '+(teamDraft.preset?'cancel':'confirm');
    $('#teamCallBtn').className = 'modal-btn '+(teamDraft.preset?'confirm':'cancel');
    $('#teamCallBtn').classList.toggle('hidden', !teamEditingId);
    $('#teamDeleteBtn').classList.toggle('hidden', teamDraft.preset || !teamEditingId);
    setTeamTab('base');
    renderTeamModal();
    teamModal.classList.add('show');
    if(!teamDraft.preset) setTimeout(function(){ $('#teamName').focus(); },40);
  }
  function renderTeamModal(){
    var d=teamDraft; if(!d) return;
    $('#teamCount').textContent=d.members.length;
    $('#teamMembers').innerHTML = d.members.length ? d.members.map(function(id){
      var e=EX[id];
      return '<div class="x-member"><img src="'+xav(e.k)+'" alt="" data-view-expert="'+id+'">'
        +'<div class="x-member-b" data-view-expert="'+id+'"><div class="x-member-n">'+xesc(e.name)
        +(d.leadId===id?'<span class="x-badge x-badge-lead">组长</span>':'')
        +(e.ro?'<span class="x-badge x-badge-ro">只读</span>':'')+'</div>'
        +'<div class="x-member-r">'+xesc(e.role)+' · 可承担 '+e.modes.join(' / ')+'</div></div>'
        +'<div class="x-member-a">'
        +(d.leadId===id?'':'<button type="button" class="x-ic" data-set-lead="'+id+'" title="设为组长">☆</button>')
        +'<button type="button" class="x-ic x-ic-dg" data-rm-member="'+id+'" title="移出">✕</button></div></div>';
    }).join('') : '<div class="x-empty-sm">还没有成员</div>';

    $('#teamCmds').innerHTML = d.preset
      ? (d.cmds.filter(function(c){return c[0]}).map(function(c){
          return '<button type="button" class="x-cmd x-cmd-1" data-team-cmd="'+xesc(c[0])+'" title="'+xesc(c[1]||'')+'">'
            +'<span class="x-cmd-b"><span class="x-cmd-q">“'+xesc(c[0])+'”</span></span>'
            +'<svg class="x-cmd-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 0 1 11 4h2a8 8 0 0 1 8 8z"/></svg>'
            +'</button>';
        }).join('') || '<div class="x-empty-sm">这个团还没有触发词</div>')
      : d.cmds.map(function(c,i){
          return '<div class="x-cmd-row"><input type="text" class="x-cmd-k" data-tm-cmd="'+i+'" data-f="0" value="'+xesc(c[0])+'" placeholder="用户会怎么说，例如：帮我把这个想法做成能上线的功能" autocomplete="off">'
            +'<button type="button" class="x-ic x-ic-dg" data-tm-rmcmd="'+i+'" title="删除">✕</button></div>';
        }).join('');
    $('#teamAddCmd').classList.toggle('hidden', !!d.preset);
    $('#teamCmdHint').textContent = d.preset
      ? '点任意一条就会带着这个团开一个新会话。'
      : '用户平时会怎么找这个团做事。点「召唤专家团」会带上第一条。';

    var flow=teamFlow(d);
    $('#teamFlow').innerHTML = flow.map(function(s,i){
      return (i?'<span class="x-ar">→</span>':'')
        +'<div class="x-node'+(s.who?'':' miss')+'">'
        +(s.who?'<img src="'+xav(EX[s.who].k)+'" alt="">':'')
        +'<div><b>'+s.title+'<span class="x-kind">'+s.k+'</span></b>'
        +'<i>'+(s.who?EX[s.who].name:'⚠ 无人可领')+'</i></div></div>';
    }).join('');

    $('#teamModeNote').innerHTML='<span>ⓘ</span><span>'+(d.members.length>1
      ? d.members.length+' 位成员 → 以 <code>mode: team</code> 运行，任务在成员间按依赖顺序流转。'
      : '单一成员 → 以 <code>mode: personal</code> 运行，串行执行，保留 attempt 隔离与重试。')+'</span>';

    var warns=teamLint(d);
    $('#teamWarnings').innerHTML = warns.map(function(w){
      return '<div class="x-warn"><span>⚠</span><span>'+xesc(w)+'</span></div>'; }).join('');
    var missing=flow.filter(function(x){return !x.who}).length;
    $('#teamFlowSummary').textContent = flow.length+' 步'+(missing?'，'+missing+' 步无人可领':'');
    $('#teamFlowSummary').classList.toggle('is-warn', !!missing);
    $('#teamTabDotBase').classList.toggle('hidden', !warns.length);
    $('#teamTabDotMore').classList.toggle('hidden', !missing);

    $$('#teamMembers .x-member-a').forEach(function(a){ a.classList.toggle('hidden', !!d.preset); });
    $('#teamAddBtn').classList.toggle('hidden', !!d.preset);
  }
  if(teamModal){
    teamModal.addEventListener('click',function(e){
      if(e.target===teamModal){ teamModal.classList.remove('show'); return; }
      var n;
      if(n=e.target.closest('[data-team-cmd]')){
        if(!teamEditingId){ toast('先保存这个专家团，再召唤','warning'); return; }
        teamModal.classList.remove('show');
        summon('team',teamEditingId,n.getAttribute('data-team-cmd')); return;
      }
      if(n=e.target.closest('[data-tm-rmcmd]')){
        teamDraft.cmds.splice(+n.getAttribute('data-tm-rmcmd'),1);
        if(!teamDraft.cmds.length) teamDraft.cmds.push(['','']);
        renderTeamModal(); return;
      }
      if(n=e.target.closest('[data-view-expert]')){ openExpertModal(n.getAttribute('data-view-expert')); return; }
      if(n=e.target.closest('[data-set-lead]')){ teamDraft.leadId=n.getAttribute('data-set-lead'); renderTeamModal(); return; }
      if(n=e.target.closest('[data-rm-member]')){
        var id=n.getAttribute('data-rm-member');
        teamDraft.members=teamDraft.members.filter(function(m){return m!==id});
        if(teamDraft.leadId===id) teamDraft.leadId=teamDraft.members[0]||null;
        renderTeamModal(); return;
      }
    });
    $('#teamModalClose').addEventListener('click',function(){ teamModal.classList.remove('show') });
    $('#teamCancelBtn').addEventListener('click',function(){ teamModal.classList.remove('show') });
    $('#teamName').addEventListener('input',function(){ if(teamDraft.preset){ this.value=teamDraft.name; return; } teamDraft.name=this.value });
    $('#teamDesc').addEventListener('input',function(){ if(teamDraft.preset){ this.value=teamDraft.desc; return; } teamDraft.desc=this.value });
    $('#teamAddBtn').addEventListener('click',function(){ openMemberModal() });
    $('#teamAddCmd').addEventListener('click',function(){ teamDraft.cmds.push(['','']); renderTeamModal(); });
    $('#teamCallBtn').addEventListener('click',function(){
      if(!teamEditingId){ toast('先保存这个专家团，再召唤','warning'); return; }
      teamModal.classList.remove('show');
      summon('team',teamEditingId);
    });
    teamModal.addEventListener('input',function(ev){
      var c=ev.target.closest('[data-tm-cmd]');
      if(c) teamDraft.cmds[+c.getAttribute('data-tm-cmd')][+c.getAttribute('data-f')]=c.value;
    });
    $('#teamDeleteBtn').addEventListener('click',function(){
      var t=teamById(teamEditingId); if(!t||t.preset) return;
      if(!window.confirm('删除专家团「'+t.name+'」？此操作不可撤销。')) return;
      TEAMS=TEAMS.filter(function(x){ return x.id!==t.id; });
      if(activePick.kind==='team'&&activePick.id===t.id) clearPick();
      teamModal.classList.remove('show');
      saveTeams(); renderExpertGrid(); renderExpertChips();
      toast('已删除「'+t.name+'」','success');
    });
    $('#teamConfigForm').addEventListener('submit',function(ev){
      ev.preventDefault();
      var d=teamDraft;
      var name=(d.name||'').trim();
      if(!name){ setTeamTab('base'); toast('请填写专家团名称','warning'); $('#teamName').focus(); return; }
      if(!d.members.length){ setTeamTab('base'); toast('至少需要一位成员','warning'); return; }
      if(d.preset || !teamEditingId){
        var nid='team-'+Date.now();
        TEAMS.push({id:nid,preset:false,name:d.preset?name+' 副本':name,by:'我创建的',
          desc:d.desc,leadId:d.leadId,members:d.members.slice(),cmds:teamCmdList(d)});
        toast(d.preset?'已另存为你的专家团':'专家团已创建','success');
      }else{
        var t=teamById(teamEditingId);
        t.name=name; t.desc=d.desc; t.leadId=d.leadId; t.members=d.members.slice(); t.cmds=teamCmdList(d);
        toast('已保存','success');
      }
      teamModal.classList.remove('show');
      saveTeams(); renderExpertGrid(); renderExpertChips();
    });
  }

  /* ---------- 添加成员弹窗 ---------- */
  var memberModal=$('#memberModal'), memberKw='';
  function openMemberModal(){ memberKw=''; $('#memberSearchInput').value=''; renderMemberList(); memberModal.classList.add('show');
    setTimeout(function(){ $('#memberSearchInput').focus() },40); }
  function renderMemberList(){
    var kw=memberKw.trim();
    var rows=EXPERTS.filter(function(e){ return !kw || (e.name+e.role+e.desc+e.tags.join()).indexOf(kw)>=0; });
    $('#memberList').innerHTML = rows.length ? rows.map(function(e){
      var on=teamDraft.members.indexOf(e.id)>=0;
      return '<button type="button" class="x-mrow'+(on?' on':'')+'" data-toggle-member="'+e.id+'">'
        +'<img src="'+xav(e.k)+'" alt="">'
        +'<span class="x-mrow-b"><span class="x-mrow-n">'+xesc(e.name)
        +(on?'<span class="x-badge x-badge-lead">已加入</span>':'')
        +(e.ro?'<span class="x-badge x-badge-ro">只读</span>':'')+'</span>'
        +'<span class="x-mrow-d">'+xesc(e.desc)+'</span>'
        +'<span class="x-mrow-m">'+e.modes.join(' / ')+'</span></span></button>';
    }).join('') : '<div class="x-empty-sm">没有匹配的专家</div>';
  }
  if(memberModal){
    $('#memberSearchInput').addEventListener('input',function(){ memberKw=this.value; renderMemberList(); });
    $('#memberModalClose').addEventListener('click',function(){ memberModal.classList.remove('show') });
    $('#memberDoneBtn').addEventListener('click',function(){ memberModal.classList.remove('show') });
    memberModal.addEventListener('click',function(e){
      if(e.target===memberModal){ memberModal.classList.remove('show'); return; }
      var n=e.target.closest('[data-toggle-member]'); if(!n) return;
      var id=n.getAttribute('data-toggle-member'), i=teamDraft.members.indexOf(id);
      if(i<0){ teamDraft.members.push(id); if(!teamDraft.leadId) teamDraft.leadId=id; }
      else { teamDraft.members.splice(i,1); if(teamDraft.leadId===id) teamDraft.leadId=teamDraft.members[0]||null; }
      renderMemberList(); renderTeamModal();
    });
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
  var MODE_BUILDERS={
    '技能开发':{id:'skill-builder',    ic:'<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>'},
    '智能体开发':{id:'agent-builder',  ic:'<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V3"/><circle cx="12" cy="3" r="1.5" fill="currentColor"/><rect x="8" y="13" width="3" height="2" rx="1"/><rect x="13" y="13" width="3" height="2" rx="1"/>'},
    '原型探索':{id:'prototype-builder',   ic:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>'},
    '通用应用':{id:'general-app-builder', ic:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'},
    '苍穹应用':{id:'cosmic-app-builder', ic:'<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>'},
    '业务组件':{id:'mcp-apps-builder', ic:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>'}
  };
  function renderModeTag(){
    var el=$('.mode-item.checked'), mode=el?el.getAttribute('data-val'):null;
    var b=mode?MODE_BUILDERS[mode]:forcedBuilder;
    ['nt','chat'].forEach(function(pfx){
      var tags=$('#'+pfx+'Tags'); if(!tags) return;
      tags.innerHTML = b
        ? '<span class="ctag"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+b.ic+'</svg>'
          +'<span class="ctag-label">'+b.id+'</span>'
          +'<button type="button" class="ctag-x" data-clear-mode aria-label="移除">'
          +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
          +'</button></span>'
        : '';
      tags.classList.toggle('hidden', !b);
    });
  }
  document.addEventListener('click',function(ev){
    if(ev.target.closest('[data-clear-mode]')){
      ev.stopPropagation();
      $$('.mode-item').forEach(function(m){ m.classList.remove('checked') });
      forcedBuilder=null;
      renderModeTag(); return;
    }
    if(ev.target.closest('.mode-item')){ forcedBuilder=null; setTimeout(renderModeTag,0); }
  });

  function renderExpertChips(){
    var has=pickValid();
    ['nt','chat'].forEach(function(pfx){
      var label=$('#'+pfx+'ExpertLabel'), faces=$('#'+pfx+'ExpertFaces');
      if(label) label.textContent = has ? pickName() : '选择专家';
      if(faces){
        faces.innerHTML = has
          ? (activePick.kind==='team'
              ? teamById(activePick.id).members.slice(0,3).map(function(i){
                  return '<img src="'+xav(EX[i].k)+'" alt="">'; }).join('')
              : '<img src="'+xav(EX[activePick.id].k)+'" alt="">')
          : '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.2"/><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4"/><path d="M15.4 5.2a3.2 3.2 0 0 1 0 5.6"/></svg>';
      }
      var dd=$('#'+pfx+'ExpertDropdown');
      if(dd){ var c=dd.querySelector('[data-chip]'); if(c) c.classList.toggle('muted', !has); }
    });
  }
  function renderExpertPicker(pfx,kw){
    var list=$('#'+pfx+'ExpertList'); if(!list) return;
    kw=(kw||'').trim();
    var teams=TEAMS.filter(function(t){ return !kw || (t.name+t.desc).indexOf(kw)>=0; });
    var experts=EXPERTS.filter(function(e){ return !kw || (e.name+e.role+e.desc+e.tags.join()).indexOf(kw)>=0; });
    var html='';
    if(teams.length){
      html+='<div class="pick-group">专家团</div>'+teams.map(function(t){
        var on=activePick.kind==='team'&&activePick.id===t.id;
        return '<div class="app-item x-opt'+(on?' checked':'')+'" data-pick-team="'+t.id+'">'
          +facesHtml(t.members,3)
          +'<span class="x-opt-n">'+xesc(t.name)+'</span>'
          +(on?'<svg class="ic ic-sm menu-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>':'')+'</div>';
      }).join('');
    }
    if(experts.length){
      html+='<div class="pick-group">专家</div>'+experts.map(function(e){
        var on=activePick.kind==='expert'&&activePick.id===e.id;
        return '<div class="app-item x-opt'+(on?' checked':'')+'" data-pick-expert="'+e.id+'">'
          +'<img class="x-opt-av" src="'+xav(e.k)+'" alt="">'
          +'<span class="x-opt-n">'+xesc(e.name)+'</span>'
          +(on?'<svg class="ic ic-sm menu-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>':'')+'</div>';
      }).join('');
    }
    list.innerHTML = html || '<div class="x-empty-sm">没有匹配的专家或专家团</div>';
  }
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
  $$('#view-home .home-card').forEach(function(c){
    c.addEventListener('click',function(){ if(c.getAttribute('data-view')==='newtask') resetPickForNewSession(); });
  });
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
  /* 项目维度：任务 / 评审 / 协作人员按项目分；专家与专家团为全局资产，项目内只绑定默认专家团 */
  var CV_PROJECTS=[
    {id:'expense',name:'费用报销应用',dot:'blue',defaultTeam:'software-company'},
    {id:'purchase',name:'采购管理系统',dot:'orange',defaultTeam:'cosmic-team'},
    {id:'supply',name:'供应链协同平台',dot:'green',defaultTeam:null}
  ];
  var cvProject='';                    /* 空串 = 全部项目（个人视角的聚合视图） */
  var cvConfigOverride={};             /* {项目id:{配置卡 key:是否项目覆盖}} */
  function cvProjectById(id){
    for(var i=0;i<CV_PROJECTS.length;i++){ if(CV_PROJECTS[i].id===id) return CV_PROJECTS[i]; }
    return null;
  }
  function cvProjectName(id){ var p=cvProjectById(id); return p?p.name:'未归属项目'; }
  function cvInProject(row){
    if(!cvProject) return true;
    if(row.projects) return row.projects==='*'||row.projects.indexOf(cvProject)>=0;
    return row.project===cvProject;
  }
  function cvProjectTag(row){
    if(cvProject) return '';           /* 项目态下不必重复显示项目名 */
    return '<span class="cv-proj-tag">'+cvProjectName(row.project)+'</span>';
  }

  var CV_TASKS = [
    {type:'需求',size:'大',source:'Jira',sourceId:'PROJ-42',exec:'专家团',status:'待评审',collab:'Agent间协作',title:'审批流插件代码审查',desc:'审查费用报销审批流的插件实现，包括多级审批流转逻辑和异常处理',assignee:'王工',progress:0,project:'expense'},
    {type:'Bug',size:'小',source:'TAPD',sourceId:'BUG-7831',exec:'自动执行',status:'进行中',collab:'人Agent协作',title:'报销金额精度丢失修复',desc:'当报销金额含小数时，后端 BigDecimal 序列化后精度丢失',assignee:'AI开发Agent',progress:62,project:'expense'},
    {type:'需求',size:'小',source:'对话自建',sourceId:'CNV-001',exec:'自动执行',status:'已完成',collab:'无需协作',title:'费用类型新增团建费选项',desc:'在费用类型下拉中增加团建费选项，归属部门活动费用类别',assignee:'AI开发Agent',progress:100,project:'expense'},
    {type:'任务',size:'大',source:'Jira',sourceId:'PROJ-56',exec:'专家团',status:'未开始',collab:'人人协作',title:'权限体系重构',desc:'基于 RBAC 模型重构权限体系，支持角色分级、数据权限和功能权限分离',assignee:'待分配',progress:0,project:'expense'},
    {type:'改进',size:'小',source:'API',sourceId:'API-12',exec:'自动执行',status:'已完成',collab:'无需协作',title:'批量导出 Excel 格式支持',desc:'当前仅支持 CSV 导出，需要增加 Excel 格式导出功能',assignee:'AI开发Agent',progress:100,project:'expense'},
    {type:'Bug',size:'小',source:'Jira',sourceId:'BUG-7845',exec:'自动执行',status:'未开始',collab:'人Agent协作',title:'附件上传偶发 502 错误',desc:'附件上传在弱网环境下偶发 502 错误，需要增加重试机制',assignee:'待分配',progress:0,project:'expense'},
    {type:'需求',size:'大',source:'Jira',sourceId:'PROJ-61',exec:'专家团',status:'未开始',collab:'人人协作',title:'多级审批流性能优化',desc:'当前审批流在多级审批场景下存在性能瓶颈，需要优化审批流转逻辑',assignee:'待分配',progress:0,project:'expense'},
    {type:'任务',size:'大',source:'TAPD',sourceId:'TASK-203',exec:'专家团',status:'待评审',collab:'Agent间协作',title:'审批流多级流转设计',desc:'设计多级审批流转逻辑，支持串行、并行、会签等多种审批模式',assignee:'王工',progress:0,project:'expense'},
    {type:'改进',size:'小',source:'对话自建',sourceId:'CNV-003',exec:'自动执行',status:'进行中',collab:'人Agent协作',title:'打印模板优化',desc:'优化报销单打印模板，支持自定义页眉页脚和水印',assignee:'AI开发Agent',progress:35,project:'expense'},
    {type:'Bug',size:'小',source:'TAPD',sourceId:'BUG-7852',exec:'自动执行',status:'已完成',collab:'无需协作',title:'列表搜索响应慢修复',desc:'当报销单数据量超过 5000 条时，列表页搜索响应时间超过 10 秒',assignee:'AI开发Agent',progress:100,project:'expense'},
    {type:'需求',size:'大',source:'Jira',sourceId:'PROJ-68',exec:'专家团',status:'未开始',collab:'人人协作',title:'多币种报销支持',desc:'支持多币种报销，包括汇率转换、币种选择和金额展示逻辑',assignee:'待分配',progress:0,project:'expense'},
    {type:'任务',size:'小',source:'对话自建',sourceId:'CNV-005',exec:'自动执行',status:'已完成',collab:'人Agent协作',title:'数据字典维护',desc:'维护费用类型、审批层级、权限角色等数据字典',assignee:'AI开发Agent',progress:100,project:'expense'},
    {type:'Bug',size:'大',source:'Jira',sourceId:'BUG-7901',exec:'专家团',status:'已失败',collab:'Agent间协作',title:'审批流死锁问题修复',desc:'并发审批场景下出现死锁，需要重构审批流的锁机制',assignee:'AI开发Agent',progress:0,project:'expense'},
    {type:'改进',size:'小',source:'API',sourceId:'API-18',exec:'自动执行',status:'未开始',collab:'无需协作',title:'移动端审批页面适配',desc:'当前审批页面在移动端显示异常，需要做响应式适配',assignee:'待分配',progress:0,project:'expense'},
    {type:'需求',size:'大',source:'Jira',sourceId:'PROJ-75',exec:'专家团',status:'进行中',collab:'人人协作',title:'预算控制模块开发',desc:'新增预算控制模块，支持按部门/项目/月份设置预算上限，超标自动拦截',assignee:'李工',progress:45,project:'expense'},
    {type:'任务',size:'小',source:'TAPD',sourceId:'TASK-215',exec:'自动执行',status:'未开始',collab:'人Agent协作',title:'审批日志查询接口',desc:'开发审批日志查询接口，支持按时间、人员、状态筛选',assignee:'待分配',progress:0,project:'expense'},
    {type:'Bug',size:'小',source:'对话自建',sourceId:'CNV-008',exec:'自动执行',status:'已完成',collab:'无需协作',title:'日期格式显示不一致',desc:'不同页面日期格式不一致，有的显示 yyyy-MM-dd 有的显示 yyyy/MM/dd',assignee:'AI开发Agent',progress:100,project:'expense'},
    {type:'需求',size:'大',source:'飞书',sourceId:'FS-33',exec:'专家团',status:'未开始',collab:'Agent间协作',title:'移动端审批流开发',desc:'开发移动端审批流程，支持微信/钉钉/飞书消息通知和审批操作',assignee:'待分配',progress:0,project:'expense'},
    {type:'需求',size:'大',source:'Jira',sourceId:'PUR-18',exec:'专家团',status:'进行中',collab:'人人协作',title:'采购订单批量导入',desc:'支持 Excel 批量导入采购订单，含供应商匹配、价格校验与错误行回执',assignee:'李工',progress:38,project:'purchase'},
    {type:'Bug',size:'小',source:'TAPD',sourceId:'BUG-8102',exec:'自动执行',status:'待评审',collab:'人Agent协作',title:'采购入库单反审核报错',desc:'反审核已关联付款单的入库单时抛空指针，需补充关联校验与提示',assignee:'AI开发Agent',progress:0,project:'purchase'},
    {type:'任务',size:'小',source:'对话自建',sourceId:'CNV-011',exec:'自动执行',status:'已完成',collab:'无需协作',title:'采购订单列表新增供应商筛选',desc:'列表页筛选区增加供应商下拉，支持按编码与名称模糊匹配',assignee:'AI开发Agent',progress:100,project:'purchase'},
    {type:'改进',size:'大',source:'Jira',sourceId:'PUR-25',exec:'专家团',status:'未开始',collab:'人人协作',title:'采购价格审批链重构',desc:'按金额分级审批，超阈值自动加签采购总监，并保留完整审批留痕',assignee:'待分配',progress:0,project:'purchase'},
    {type:'需求',size:'大',source:'飞书',sourceId:'FS-52',exec:'专家团',status:'进行中',collab:'Agent间协作',title:'供应商协同门户对接',desc:'打通供应商门户的订单确认与交期回复，含消息推送与状态回写',assignee:'冯远',progress:52,project:'supply'},
    {type:'任务',size:'小',source:'API',sourceId:'API-31',exec:'自动执行',status:'未开始',collab:'人Agent协作',title:'交期变更消息推送',desc:'交期变更时向采购员推送企业微信消息，推送失败进入重试队列',assignee:'待分配',progress:0,project:'supply'},
    {type:'Bug',size:'小',source:'Jira',sourceId:'BUG-8155',exec:'自动执行',status:'已失败',collab:'Agent间协作',title:'供应商评级定时任务超时',desc:'评级任务在供应商超 2 万条时超时中断，需要改为分片执行',assignee:'AI开发Agent',progress:0,project:'supply'},
    {type:'需求',size:'小',source:'对话自建',sourceId:'CNV-014',exec:'自动执行',status:'已完成',collab:'无需协作',title:'供应商档案资质到期提醒',desc:'资质到期前 30 天在档案列表标红，并向对接采购员推送提醒',assignee:'AI开发Agent',progress:100,project:'supply'}
  ];

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

  var CV_REVIEWS = [
    {type:'任务',size:'大',source:'Jira',exec:'专家团',priority:'紧急',reviewType:'代码评审',title:'审批流插件代码审查',desc:'审查费用报销审批流的插件实现，包括多级审批流转逻辑和异常处理',reviewer:'王工',reviewerRole:'架构人员',deadline:'今日 18:00',deadlineColor:'var(--danger)',borderColor:'var(--danger)',from:'张工',fromTime:'今日 10:30',artifacts:['源代码','单元测试','技术方案'],project:'expense'},
    {type:'需求',size:'大',source:'Jira',exec:'专家团',priority:'高',reviewType:'方案评审',title:'多级审批流性能优化方案',desc:'当前审批流在多级审批场景下存在性能瓶颈，需要优化审批流转逻辑',reviewer:'王工',reviewerRole:'架构人员',deadline:'明日 12:00',deadlineColor:'var(--warning)',borderColor:'var(--warning)',from:'张工',fromTime:'昨日 16:20',artifacts:['技术方案','需求规格'],project:'expense'},
    {type:'任务',size:'大',source:'Jira',exec:'专家团',priority:'中',reviewType:'方案评审',title:'权限体系重构方案评审',desc:'基于 RBAC 模型重构权限体系，支持角色分级、数据权限和功能权限分离',reviewer:'张工',reviewerRole:'开发人员',deadline:'3 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'赵琳',fromTime:'2 天前',artifacts:['技术方案','需求规格','源代码'],project:'expense'},
    {type:'改进',size:'小',source:'对话自建',exec:'自动执行',priority:'中',reviewType:'代码评审',title:'打印模板优化方案评审',desc:'优化报销单打印模板，支持自定义页眉页脚和水印',reviewer:'陈晨',reviewerRole:'测试人员',deadline:'2 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'AI开发Agent',fromTime:'3 小时前',artifacts:['源代码','技术方案'],project:'expense'},
    {type:'Bug',size:'小',source:'TAPD',exec:'自动执行',priority:'紧急',reviewType:'代码评审',title:'附件上传 502 修复方案评审',desc:'附件上传在弱网环境下偶发 502 错误的重试机制实现',reviewer:'张工',reviewerRole:'开发人员',deadline:'今日 20:00',deadlineColor:'var(--danger)',borderColor:'var(--danger)',from:'AI开发Agent',fromTime:'1 小时前',artifacts:['源代码','单元测试'],project:'expense'},
    {type:'需求',size:'小',source:'对话自建',exec:'自动执行',priority:'低',reviewType:'需求评审',title:'费用类型新增选项评审',desc:'在费用类型下拉中增加团建费选项的实现',reviewer:'吴芳',reviewerRole:'需求人员',deadline:'5 天后',deadlineColor:'var(--success)',borderColor:'var(--dot-blue)',from:'AI开发Agent',fromTime:'昨日 14:00',artifacts:['需求规格','源代码'],project:'expense'},
    {type:'需求',size:'大',source:'Jira',exec:'专家团',priority:'高',reviewType:'需求评审',title:'多币种报销需求规格评审',desc:'支持多币种报销，含汇率转换、原币金额与本位币金额双重记录',reviewer:'赵琳',reviewerRole:'需求人员',deadline:'明日 18:00',deadlineColor:'var(--warning)',borderColor:'var(--warning)',from:'王工',fromTime:'今日 09:00',artifacts:['需求规格'],project:'expense'},
    {type:'任务',size:'大',source:'Jira',exec:'专家团',priority:'中',reviewType:'测试评审',title:'费用明细列表页测试用例评审',desc:'审查费用明细列表页的测试用例覆盖度，包括边界值、异常场景、性能场景',reviewer:'陈晨',reviewerRole:'测试人员',deadline:'3 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'李工',fromTime:'昨日 11:00',artifacts:['测试用例','测试报告','源代码'],project:'expense'},
    {type:'任务',size:'中',source:'TAPD',exec:'专家团',priority:'中',reviewType:'部署评审',title:'审批流插件部署方案评审',desc:'审批流插件灰度发布方案，含回滚策略和监控告警配置',reviewer:'周杰',reviewerRole:'运维人员',deadline:'4 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'王工',fromTime:'2 天前 15:00',artifacts:['部署方案','运维手册'],project:'expense'},
    {type:'需求',size:'大',source:'Jira',exec:'专家团',priority:'高',reviewType:'方案评审',title:'采购价格审批链重构方案',desc:'按金额分级审批与超阈值自动加签的流程设计，含审批留痕方案',reviewer:'冯远',reviewerRole:'架构人员',deadline:'明日 10:00',deadlineColor:'var(--warning)',borderColor:'var(--warning)',from:'李工',fromTime:'今日 09:20',artifacts:['技术方案','需求规格'],project:'purchase'},
    {type:'Bug',size:'小',source:'TAPD',exec:'自动执行',priority:'中',reviewType:'代码评审',title:'采购入库单反审核校验补充',desc:'反审核关联付款单的校验实现与回归用例',reviewer:'张工',reviewerRole:'开发人员',deadline:'3 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'AI开发Agent',fromTime:'今日 11:40',artifacts:['源代码','单元测试'],project:'purchase'},
    {type:'需求',size:'大',source:'飞书',exec:'专家团',priority:'紧急',reviewType:'需求评审',title:'供应商协同门户对接需求规格',desc:'订单确认与交期回复的字段口径、异常处理与状态回写规则',reviewer:'张工',reviewerRole:'开发人员',deadline:'今日 20:00',deadlineColor:'var(--danger)',borderColor:'var(--danger)',from:'冯远',fromTime:'今日 08:50',artifacts:['需求规格','技术方案'],project:'supply'}
  ];

  var CV_MEMBERS = [
    {name:'张工',email:'zhang***@kingdee.com',roles:[{tag:'member-tag--dev',text:'开发'},{tag:'member-tag--arch',text:'架构'}],status:'available',source:'直接成员',isMe:true,projects:['expense','purchase','supply']},
    {name:'李工',email:'li***@kingdee.com',roles:[{tag:'member-tag--dev',text:'开发'}],status:'available',source:'直接成员',projects:['expense','purchase']},
    {name:'王工',email:'wang***@kingdee.com',roles:[{tag:'member-tag--dev',text:'开发'},{tag:'member-tag--arch',text:'架构'}],status:'busy',source:'直接成员',projects:['expense','supply']},
    {name:'赵琳',email:'zha***@kingdee.com',roles:[{tag:'member-tag--pm',text:'需求'},{tag:'member-tag--pm',text:'产品'}],status:'available',source:'继承自 灵基AIOS',projects:'*'},
    {name:'陈晨',email:'chen***@kingdee.com',roles:[{tag:'member-tag--qa',text:'测试'}],status:'available',source:'直接成员',projects:['expense']},
    {name:'刘洋',email:'liu***@kingdee.com',roles:[{tag:'member-tag--qa',text:'测试'}],status:'busy',source:'直接成员',projects:['purchase']},
    {name:'周杰',email:'zhou***@kingdee.com',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'直接成员',projects:['expense','purchase']},
    {name:'孙明',email:'sun***@kingdee.com',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'继承自 灵基AIOS',projects:'*'},
    {name:'吴芳',email:'wu***@kingdee.com',roles:[{tag:'member-tag--pm',text:'需求'}],status:'available',source:'直接成员',projects:['expense']},
    {name:'郑凯',email:'zheng***@kingdee.com',roles:[{tag:'member-tag--dev',text:'开发'}],status:'busy',source:'直接成员',projects:['expense']},
    {name:'钱涛',email:'qian***@kingdee.com',roles:[{tag:'member-tag--dev',text:'开发'}],status:'available',source:'直接成员',projects:['purchase']},
    {name:'宋宇',email:'song***@kingdee.com',roles:[{tag:'member-tag--pm',text:'产品'}],status:'available',source:'继承自 灵基AIOS',projects:'*'},
    {name:'冯远',email:'feng***@kingdee.com',roles:[{tag:'member-tag--arch',text:'架构'}],status:'available',source:'直接成员',projects:['supply']},
    {name:'许诺',email:'xu***@kingdee.com',roles:[{tag:'member-tag--dev',text:'开发'},{tag:'member-tag--arch',text:'架构'}],status:'busy',source:'直接成员',projects:['purchase','supply']},
    {name:'蒋雯',email:'jiang***@kingdee.com',roles:[{tag:'member-tag--pm',text:'需求'},{tag:'member-tag--pm',text:'产品'}],status:'available',source:'继承自 灵基AIOS',projects:'*'},
    {name:'何欣',email:'he***@kingdee.com',roles:[{tag:'member-tag--pm',text:'需求'}],status:'available',source:'直接成员',projects:['supply']},
    {name:'韩梅',email:'han***@kingdee.com',roles:[{tag:'member-tag--qa',text:'测试'}],status:'available',source:'直接成员',projects:['purchase']},
    {name:'罗静',email:'luo***@kingdee.com',roles:[{tag:'member-tag--qa',text:'测试'}],status:'busy',source:'直接成员',projects:['supply']},
    {name:'杨帆',email:'yang***@kingdee.com',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'直接成员',projects:['purchase']},
    {name:'唐辉',email:'tang***@kingdee.com',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'继承自 灵基AIOS',projects:'*'},
    {name:'梁平',email:'liang***@kingdee.com',roles:[{tag:'member-tag--pm',text:'产品'},{tag:'member-tag--owner',text:'所有者'}],status:'available',source:'直接成员',projects:['expense','purchase','supply']}
  ];

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
  function cvRenderTasks(){
    var grid=document.getElementById('cv-task-grid');if(!grid)return;
    grid.innerHTML=CV_TASKS.map(function(t,i){return cvInProject(t)?cvBuildTaskCard(t,i):'';}).join('');
    if(!grid.innerHTML) grid.innerHTML='<div class="x-empty">该项目下还没有任务</div>';
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
  function cvRenderReviews(){
    var grid=document.getElementById('cv-review-grid');if(!grid)return;
    grid.innerHTML=CV_REVIEWS.map(function(r,i){return cvInProject(r)?cvBuildReviewCard(r,i):'';}).join('');
    if(!grid.innerHTML) grid.innerHTML='<div class="x-empty">该项目下没有待评审的内容</div>';
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
    el.innerHTML=CV_MEMBERS.map(function(m,i){
      if(!cvInProject(m)) return '';
      var tagHtml=m.roles.map(function(r){return '<span class="member-tag '+r.tag+'">'+r.text+'</span>';}).join('');
      var statusCls=m.status==='available'?'member-status--available':'member-status--busy';
      var statusText=m.status==='available'?'可用':'繁忙';
      var avatarCls=m.isMe?'member-avatar member-avatar--me':'member-avatar';
      var nameCls=m.isMe?'member-name member-name--me':'member-name';
      return '<div class="member-row" data-role="'+m.roles.map(function(r){return r.text;}).join(' ')+'">'
        +'<div class="'+avatarCls+'">'+m.name[0]+'</div>'
        +'<div class="member-info"><div class="'+nameCls+'">'+m.name+(m.isMe?' （你）':'')+'</div><div class="member-email">'+m.email+'</div><div class="member-tags">'+tagHtml+'</div></div>'
        +'<span class="member-status '+statusCls+'">'+statusText+'</span>'
        +'<span class="member-source">'+m.source+'</span>'
        +(m.isMe?'':'<button class="member-del" onclick="cvDeleteMember('+i+')" title="移除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>')
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

  /* ============ SYNC MODAL ============ */
  function cvOpenSyncModal(){document.getElementById('cv-sync-overlay').style.display='flex';}
  function cvCloseSyncModal(){document.getElementById('cv-sync-overlay').style.display='none';}
  function cvSelectCollabMode(el){
    var parent=el.parentNode;parent.querySelectorAll('.sync-collab-option').forEach(function(o){o.classList.remove('sync-collab-option--selected');});
    el.classList.add('sync-collab-option--selected');
  }
  function cvToggleSyncDropdown(el,ev){
    if(ev)ev.stopPropagation();
    var existing=el.parentNode.querySelector('.sync-dropdown');
    if(existing){existing.remove();return;}
    var valId=el.querySelector('.sync-modal__select-placeholder').id;
    var opts={'cv-sync-type-val':['需求','Bug','任务','改进'],'cv-sync-priority-val':['高','中','低'],'cv-sync-source-val':['对话自建','Jira','TAPD','API','飞书'],'cv-sync-size-val':['小任务','大任务']}[valId]||[];
    var current=el.querySelector('.sync-modal__select-placeholder').textContent;
    var dd=document.createElement('div');dd.className='sync-dropdown sync-dropdown--open';
    opts.forEach(function(o){var item=document.createElement('div');item.className='sync-dropdown-item'+(o===current?' sync-dropdown-item--active':'');item.textContent=o;item.onclick=function(){el.querySelector('.sync-modal__select-placeholder').textContent=o;dd.remove();};dd.appendChild(item);});
    el.parentNode.appendChild(dd);
  }
  document.addEventListener('click',function(){document.querySelectorAll('.sync-dropdown').forEach(function(d){d.remove();});});
  function cvCollectSyncTaskData(status){
    var title=document.getElementById('cv-sync-title');if(!title||!title.value.trim()){cvToast('请输入任务标题','warning');return null;}
    var desc=document.getElementById('cv-sync-desc');
    var type=document.getElementById('cv-sync-type-val');
    var priority=document.getElementById('cv-sync-priority-val');
    var source=document.getElementById('cv-sync-source-val');
    var size=document.getElementById('cv-sync-size-val');
    var sel=document.querySelector('#cv-sync-collab-options .sync-collab-option--selected .sync-collab-name');
    var mode=sel?sel.textContent:'Agent间协作';
    return{title:title.value.trim(),desc:desc?desc.value.trim():'',type:type?type.textContent:'需求',priority:priority?priority.textContent:'中',source:source?source.textContent:'对话自建',size:size?size.textContent:'小任务',status:status||'未开始',collab:mode,assignee:status==='进行中'?'AI开发Agent':'待分配',progress:0};
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
  function cvSaveSyncTask(){
    var task=cvCollectSyncTaskData('未开始');if(!task)return;
    var row=cvAddTask(task);cvSaveTaskToStorage(row);cvCloseSyncModal();
    cvToast('任务已保存到「'+cvProjectName(row.project)+'」任务列表','success');
  }
  function cvStartSyncTask(){
    var task=cvCollectSyncTaskData('未开始');if(!task)return;
    var row=cvAddTask(task);cvSaveTaskToStorage(row);cvCloseSyncModal();
    cvToast('任务已创建到「'+cvProjectName(row.project)+'」，可点击「执行」启动','success');
  }

  /* ============ TASK MODALS ============ */
  function cvOpenTaskModal(id){
    var el=document.getElementById(id);if(el)el.style.display='flex';
    if(id==='cv-transfer-overlay'){cvRenderPersonList('cv-transfer-person-list');}
    if(id==='cv-twist-overlay'){cvRenderWorkflow();cvRenderTwistArtifacts();}
    if(id==='cv-review-overlay'){cvRenderReviewPersonList();cvRenderReviewArtifacts();}
  }
  function cvCloseTaskModal(id){var el=document.getElementById(id);if(el)el.style.display='none';}
  function cvRenderPersonList(listId){
    var el=document.getElementById(listId);if(!el)return;
    el.innerHTML=CV_MEMBERS.map(function(m,i){
      return '<button class="person-item" onclick="cvSelectPersonItem(this)"><div class="person-avatar-sm">'+m.name[0]+'</div><div><div class="person-name-sm">'+m.name+'</div><div class="person-role-sm">'+m.roles.map(function(r){return r.text;}).join(' · ')+'</div></div></button>';
    }).join('');
  }
  function cvRenderReviewPersonList(){
    var el=document.getElementById('cv-review-person-list');if(!el)return;
    var card=window.cvCard;var node='开发实现';
    if(card){var na=card.querySelector('.card-node');if(na)node=na.textContent.replace(/^[\s\u200b]+/,'').trim();}
    var role=CV_WORKFLOW_ROLES[node]||'开发人员';
    el.innerHTML=CV_MEMBERS.filter(function(m){return m.roles.some(function(r){return r.text.indexOf(role)>=0||role.indexOf(r.text)>=0;});}).map(function(m){
      return '<button class="person-item" onclick="cvSelectPersonItem(this)"><div class="person-avatar-sm">'+m.name[0]+'</div><div><div class="person-name-sm">'+m.name+'</div><div class="person-role-sm">'+m.roles.map(function(r){return r.text;}).join(' · ')+'</div></div></button>';
    }).join('');
    if(!el.innerHTML){el.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-soft);font-size:12.5px">当前节点无匹配人员</div>';}
  }
  function cvSelectPersonItem(el){
    var parent=el.parentNode;parent.querySelectorAll('.person-item').forEach(function(p){p.classList.remove('person-item--selected');});
    el.classList.add('person-item--selected');
  }
  function cvRenderWorkflow(){
    var el=document.getElementById('cv-twist-workflow');if(!el)return;
    var card=window.cvCard;var currentNode='开发实现';
    if(card){var na=card.querySelector('.card-node');if(na)currentNode=na.textContent.replace(/^[\s\u200b]+/,'').trim();}
    var currentIdx=CV_WORKFLOW.indexOf(currentNode);if(currentIdx<0)currentIdx=0;
    el.innerHTML=CV_WORKFLOW.map(function(step,i){
      var cls=i<currentIdx?'workflow-step--done':(i===currentIdx?'workflow-step--current':'');
      var num=i<currentIdx?'✓':(i+1);
      var status=i<currentIdx?'已完成':(i===currentIdx?'当前节点':CV_WORKFLOW_ROLES[step]);
      return '<div class="workflow-step '+cls+'"><div class="workflow-step-num">'+num+'</div><div class="workflow-step-name">'+step+'</div><div class="workflow-step-status">'+status+'</div></div>';
    }).join('');
    var nextIdx=Math.min(currentIdx+1,CV_WORKFLOW.length-1);
    el.innerHTML+='<div style="padding:8px 12px;font-size:12px;color:#7858f9;font-weight:600">下一步：'+CV_WORKFLOW[nextIdx]+' → '+CV_WORKFLOW_ROLES[CV_WORKFLOW[nextIdx]]+'</div>';
  }
  function cvRenderTwistArtifacts(){
    var el=document.getElementById('cv-twist-artifacts');if(!el)return;
    var arts=[['code','</>','源代码','ExpensePlugin.java'],['test','T','单元测试','ExpenseTest.java'],['spec','S','需求规格','PRD.md'],['doc','D','技术方案','TechSpec.md']];
    el.innerHTML=arts.map(function(a){return '<div class="artifact-row"><div class="artifact-icon artifact-icon--'+a[0]+'">'+a[1]+'</div><span>'+a[2]+'</span><span style="margin-left:auto;font-size:11px;color:var(--text-soft)">'+a[3]+'</span></div>';}).join('');
  }
  function cvRenderReviewArtifacts(){
    var el=document.getElementById('cv-review-artifacts');if(!el)return;
    var arts=[['code','</>','源代码','ExpensePlugin.java'],['test','T','单元测试','ExpenseTest.java'],['spec','S','需求规格','PRD.md'],['doc','D','技术方案','TechSpec.md']];
    el.innerHTML=arts.map(function(a){return '<div class="artifact-row"><div class="artifact-icon artifact-icon--'+a[0]+'">'+a[1]+'</div><span>'+a[2]+'</span><span style="margin-left:auto;font-size:11px;color:var(--text-soft)">'+a[3]+'</span></div>';}).join('');
  }

  /* ============ CONFIRM ACTIONS ============ */
  function cvConfirmExec(){
    var sel=document.querySelector('#cv-exec-collab-options .sync-collab-option--selected .sync-collab-name');
    var mode=sel?sel.textContent:'Agent间协作';
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
  function cvConfirmTransfer(){
    var sel=document.querySelector('#cv-transfer-person-list .person-item--selected .person-name-sm');
    cvCloseTaskModal('cv-transfer-overlay');
    cvToast('任务已转交给：'+(sel?sel.textContent:'李工'),'success');
  }
  function cvConfirmTwist(){cvCloseTaskModal('cv-twist-overlay');cvToast('任务已扭转到下一节点：代码审查，产物已自动传递给审查人员','info');}
  function cvConfirmReview(){
    var sel=document.querySelector('#cv-review-person-list .person-item--selected .person-name-sm');
    cvCloseTaskModal('cv-review-overlay');
    if(window.cvCard){
      window.cvCard.setAttribute('data-status','待评审');
      var sb=window.cvCard.querySelector('.badge-status');if(sb){sb.className='badge-status badge-status--review';sb.innerHTML='<span class="badge-status-dot"></span>待评审';}
      var node=window.cvCard.querySelector('.card-node');if(node){node.innerHTML='<span class="card-node-dot" style="background:var(--warning)"></span>代码审查';node.style.background='var(--warning-bg)';node.style.color='var(--warning)';}
    }
    cvToast('评审已发起！评审人：'+(sel?sel.textContent:'王工')+'，任务状态已变更为「待评审」','success');
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
    var el=document.getElementById('cv-addmember-overlay');if(el)el.style.display='flex';
    cvSearchThirdPartyMembers('');
  }
  function cvCloseAddMemberModal(){
    var el=document.getElementById('cv-addmember-overlay');if(el)el.style.display='none';
  }
  function cvSearchThirdPartyMembers(q){
    var list=document.getElementById('cv-tp-list');if(!list)return;
    q=(q||'').toLowerCase();
    var existing=CV_MEMBERS.map(function(m){return m.name;});
    var filtered=CV_THIRD_PARTY_MEMBERS.filter(function(m){
      return(m.name.toLowerCase().indexOf(q)>=0||m.email.toLowerCase().indexOf(q)>=0)&&existing.indexOf(m.name)<0;
    });
    if(filtered.length===0){list.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-soft);font-size:13px">未找到可添加的人员</div>';return;}
    list.innerHTML=filtered.map(function(m){
      return '<div class="tp-item" onclick="this.classList.toggle(\'tp-item--selected\')">'
        +'<div class="tp-avatar">'+m.name[0]+'</div>'
        +'<div class="tp-info"><div class="tp-name">'+m.name+'</div><div class="tp-email">'+m.email+'</div></div>'
        +'<div class="tp-meta"><span class="tp-role">'+m.role+'</span><span class="tp-dept">'+m.dept+'</span></div>'
        +'<div class="tp-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>'
        +'</div>';
    }).join('');
  }
  function cvConfirmAddMembers(){
    var selected=document.querySelectorAll('#cv-tp-list .tp-item--selected');
    if(selected.length===0){cvToast('请选择要添加的人员','warning');return;}
    var tagMap={'开发':'member-tag--dev','架构':'member-tag--arch','测试':'member-tag--qa','运维':'member-tag--ops','需求':'member-tag--pm','产品':'member-tag--pm'};
    selected.forEach(function(el){
      var name=el.querySelector('.tp-name').textContent;
      var email=el.querySelector('.tp-email').textContent;
      var role=el.querySelector('.tp-role').textContent;
      CV_MEMBERS.push({name:name,email:email,roles:[{tag:tagMap[role]||'member-tag--dev',text:role}],status:'available',source:'直接添加',
        projects:cvProject?[cvProject]:CV_PROJECTS.map(function(p){return p.id})});
    });
    cvRenderMembers();cvRenderMemberStats();cvCloseAddMemberModal();
    cvToast('已添加 '+selected.length+' 名协作人员','success');
  }
  function cvDeleteMember(idx){
    if(CV_MEMBERS[idx]&&CV_MEMBERS[idx].isMe){cvToast('不能移除自己','warning');return;}
    if(!CV_MEMBERS[idx])return;
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
  }
  function cvSwitchView(name){
    cvLastTab=(name==='chat'||name==='review-detail')?cvLastTab:name;
    cvShowPanel(name);
    if(name==='teams') renderExpertGrid();
    if(name==='experts') cvRenderExperts();
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
      {title:'Lingee 内置',desc:'交付全流程的通用角色，随产品一起维护',list:rows.filter(function(e){return e.by==='Lingee 内置'})},
      {title:'金蝶官方',desc:'苍穹与前端领域专家，按金蝶规范工作',list:rows.filter(function(e){return e.by==='金蝶官方'})},
      {title:'我创建的',desc:'你自己建的专家，可随时改配置或删除',list:rows.filter(function(e){return e.mine})}
    ];
  }
  function cvTeamCountOf(id){
    return TEAMS.filter(function(t){ return t.members.indexOf(id)>=0 }).length;
  }
  function cvBuildExpertCard(e){
    var tags=(e.tags||[]).map(function(t){return '<span class="expert-skill">'+xesc(t)+'</span>'}).join('');
    var cmds=(e.cmds||[]).length, modes=(e.modes||[]).length;
    return '<div class="expert-card" data-cv-expert="'+e.id+'">'
      +'<button type="button" class="expert-chat-btn" data-cv-call="'+e.id+'" title="召唤这位专家">'
      +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></button>'
      +'<div class="expert-head"><img class="expert-av" src="'+xav(e.k)+'" alt="">'
      +'<div><div class="expert-name">'+xesc(e.name)
      +(e.ro?'<span class="expert-flag">只读</span>':'')+'</div>'
      +'<div class="expert-role">'+xesc(e.role)+'</div></div></div>'
      +'<div class="expert-intro">'+xesc(e.desc)+'</div>'
      +'<div class="expert-skills">'+tags+'</div>'
      +'<div class="expert-stats">'
      +'<div><div class="expert-stat-val">'+cvTeamCountOf(e.id)+'</div><div class="expert-stat-label">所在专家团</div></div>'
      +'<div><div class="expert-stat-val">'+modes+'</div><div class="expert-stat-label">工作模式</div></div>'
      +'<div><div class="expert-stat-val">'+cmds+'</div><div class="expert-stat-label">触发词</div></div>'
      +'</div></div>';
  }
  function cvRenderExperts(){
    var box=$('#cvExpertSections'); if(!box) return;
    var html=cvExpertGroups().map(function(g){
      if(!g.list.length && g.title!=='我创建的') return '';
      var cards=g.list.map(cvBuildExpertCard).join('');
      if(g.title==='我创建的'){
        cards+='<button type="button" class="expert-card expert-new" data-cv-new-expert>'
          +'<span class="expert-new-ic">＋</span><span class="expert-new-t">创建专家</span>'
          +'<span class="expert-new-s">手填表单，或一句话交给 expert-manager</span></button>';
      }
      return '<div class="expert-section-title">'+g.title
        +'<span class="expert-section-desc">'+g.desc+'</span></div>'
        +'<div class="expert-grid">'+cards+'</div>';
    }).join('');
    box.innerHTML=html||'<div class="x-empty">没有匹配的专家</div>';
  }


  /* ---------- 项目切换 ---------- */
  function cvRenderProjMenu(){
    var menu=$('#cvProjMenu'); if(!menu) return;
    var rows=[{id:'',name:'全部项目',desc:'跨项目聚合，看分配给我的任务与评审'}].concat(
      CV_PROJECTS.map(function(p){
        var tasks=CV_TASKS.filter(function(t){return t.project===p.id}).length;
        return {id:p.id,name:p.name,dot:p.dot,desc:tasks+' 个任务'};
      }));
    menu.innerHTML=rows.map(function(r){
      return '<div class="cv-proj-item'+(r.id===cvProject?' checked':'')+'" data-cv-proj="'+r.id+'">'
        +(r.dot?'<span class="dot '+r.dot+'"></span>':'<span class="cv-proj-all"></span>')
        +'<span class="cv-proj-n">'+xesc(r.name)+'<em>'+xesc(r.desc)+'</em></span>'
        +'<svg class="ic ic-sm cv-proj-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>';
    }).join('');
  }
  function cvSetProject(id){
    cvProject=id||'';
    var label=$('#cvProjLabel');
    if(label) label.textContent=cvProject?cvProjectName(cvProject):'全部项目';
    var sw=$('#cvProjSwitch'); if(sw) sw.classList.toggle('cv-proj--on',!!cvProject);
    cvRenderProjMenu();
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
    setUrlState('?view=collab&tab='+cvLastTab+(cvProject?'&proj='+cvProject:''));
  }
  var cvProjBtn=$('#cvProjBtn');
  if(cvProjBtn) cvProjBtn.addEventListener('click',function(e){
    e.stopPropagation();
    var sw=$('#cvProjSwitch'); if(sw) sw.classList.toggle('open');
  });
  var cvProjMenu=$('#cvProjMenu');
  if(cvProjMenu) cvProjMenu.addEventListener('click',function(e){
    var it=e.target.closest('[data-cv-proj]'); if(!it) return;
    $('#cvProjSwitch').classList.remove('open');
    cvSetProject(it.getAttribute('data-cv-proj'));
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
    cvRenderProjMenu(); cvRenderTeamBind(); cvApplyConfigScope(); cvUpdateCounts();
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
  window.cvSelectCollabMode=cvSelectCollabMode;
  window.cvToggleSyncDropdown=cvToggleSyncDropdown;
  window.cvSaveSyncTask=cvSaveSyncTask;
  window.cvStartSyncTask=cvStartSyncTask;
  window.cvOpenTaskModal=cvOpenTaskModal;
  window.cvCloseTaskModal=cvCloseTaskModal;
  window.cvSelectPersonItem=cvSelectPersonItem;
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
  window.cvSearchThirdPartyMembers=cvSearchThirdPartyMembers;
  window.cvConfirmAddMembers=cvConfirmAddMembers;
  window.cvDeleteMember=cvDeleteMember;


})();
