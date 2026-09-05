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
    {id:'10',date:'2026-08-27',iconBg:'#eef3ff',iconColor:'#495dff',team:'苍穹应用开发 · 预览区新增列表页签',body:'预览面板页签新增「列表」选项，支持列表视图展示。'},
    {id:'9',date:'2026-08-27',iconBg:'#e8faef',iconColor:'#08a040',team:'苍穹应用开发 · 历史版本',body:'新增历史记录面板，支持查看版本时间线与版本描述，可回退到历史版本。'},
    {id:'8',date:'2026-07-30',iconBg:'#fff1e8',iconColor:'#ff8d42',team:'新增 Design System 模块',body:'涵盖基础、布局、导航、数据录入、数据展示、反馈 6 大类共 67 个组件，提供组件预览、设计令牌展示、图标库等能力，作为 Lingee 统一的设计规范与组件文档平台。'},
    {id:'7',date:'2026-07-28',iconBg:'#eef3ff',iconColor:'#495dff',team:'应用开发关联应用交互优化',body:'1、会话框：项目选择与应用选择分开展示\n2、下拉面板去除创建应用流程，调整为关联选择全量应用\n3、苍穹应用：选择关联苍穹应用，发起会话时应用开发列表自动创建展示苍穹应用卡片\n4、通用应用：无需关联应用，自动生成产物应用卡片\n5、未选择开发模式，意图识别苍穹应用开发时，会话过程收集苍穹应用编码\n6、选择应用时，下次新会话按项目记忆用户选项\n\n[视觉稿](https://www.figma.com/design/F8s5P9Y8f1Bq2GkXKCkC7L/%E5%BC%80%E5%8F%91?node-id=0-1&t=DHlFenPtUNP6C7Z5-1)'},
  ];
  // 每个数据条目对应的 avatar SVG 图标（与 Build_demo 的 lucide 图标一致）
  var changelogIcons={
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
    {app:'采购订单管理',cloud:'供应链云'},
    {app:'报价单管理',cloud:'供应链云'},
    {app:'资产领用',cloud:'财务云'},
    {app:'请假管理',cloud:'人力云'},
    {app:'库存领用',cloud:'供应链云'},
    {app:'费用报销单',cloud:'财务云'},
    {app:'销售合同',cloud:'合同云'},
    {app:'员工入职',cloud:'人力云'},
    {app:'出差申请',cloud:'费用云'},
    {app:'付款申请单',cloud:'财务云'},
    {app:'采购入库单',cloud:'供应链云'},
    {app:'销售订单',cloud:'供应链云'},
    {app:'项目立项',cloud:'项目云'},
    {app:'固定资产',cloud:'财务云'},
    {app:'库存盘点',cloud:'供应链云'},
    {app:'应收单',cloud:'财务云'},
    {app:'应付单',cloud:'财务云'},
    {app:'考勤汇总',cloud:'人力云'},
    {app:'预算编制',cloud:'预算云'},
    {app:'银行对账单',cloud:'财务云'}
  ];
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
      el.innerHTML='<div class="app-item-info"><div class="app-item-name">'+d.app+'</div><div class="app-item-cloud">'+d.cloud+'</div></div>';
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
      el.innerHTML='<div class="app-item-info"><div class="app-item-name">'+d.app+'</div><div class="app-item-cloud">'+d.cloud+'</div></div>';
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
  var viewHome=$('#view-home'), viewNew=$('#view-newtask'), viewChat=$('#view-chat'), viewApps=$('#view-apps'), viewSkills=$('#view-skills'), viewAgents=$('#view-agents'), viewExperts=$('#view-experts'), viewDesign=$('#view-design'), viewSettings=$('#view-settings');
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
    viewExperts.classList.toggle('hidden', which!=='experts');
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
  if(userMenuLogout) userMenuLogout.addEventListener('click',function(){ closeUserMenu(); toast('已退出登录'); });

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
      }else if(name==='专家'){
        showView('experts');
        renderExpertGrid();
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
      view.classList.add('resizing');
      _startX=e.clientX;
      _startW=ps.offsetWidth;
      _maxW=view.offsetWidth-360-chatResizer.offsetWidth;
      if(_maxW<200)_maxW=200;
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
        document.getElementById('view-chat').classList.remove('resizing');
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
    showView('chat');
    $('#chatTitle').textContent='采购订单管理应用开发';
    var empty=$('#chatEmpty');
    if(empty) empty.remove();
    appendUserMessage(t);
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
      el.innerHTML='<div class="app-item-info"><div class="app-item-name">'+d.app+'</div><div class="app-item-cloud">'+d.cloud+'</div></div>';
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
    else if(dsViewParam==='experts'){ setNavActive('专家'); renderExpertGrid(); }
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
     cmds:[['/理清范围','把一句话目标拆成范围、非目标、责任人与验收门禁'],['/交付复盘','汇总各角色证据与残余风险，给出关闭或升级建议']],
     steps:['闭合范围与验收条件','分派有边界的角色任务','编排依赖顺序与集成门禁','汇总证据与残余风险','给出关闭或升级建议'],
     cons:['不得用协调判断替代专业证据','不得授予资格或权限','未解决的重大范围冲突必须升级']},
    {id:'software-product-manager',k:'pm',name:'软件产品经理',role:'产品经理',by:'Lingee 内置',
     desc:'把用户目标翻译成有优先级、可观察的需求与验收条件。',
     tags:['需求分析','验收设计'],modes:['分析','设计','评审'],
     comp:['product.requirements · principal','product.acceptance-design · advanced'],
     cmds:[['/需求拆解','把目标整理成有范围的验收条件清单'],['/验收标准','为已有需求补齐可观察的验收条件'],['/非目标','明确本次不做什么，防止范围蔓延']],
     steps:['识别用户与期望结果','梳理现状与目标流程','排定需求优先级与非目标','编写可观察的验收条件','消解或升级重大歧义'],
     cons:['不得虚构客户批准','不得把代码结构写成业务需求','不授予发布权限'],out:'docs/requirements.md'},
    {id:'software-architect',k:'arch',name:'软件架构师',role:'软件架构师',by:'Lingee 内置',
     desc:'设计可演进的系统边界、合同、数据流与失败处理，产出架构文档与可执行的实现计划。',
     tags:['软件架构','可靠性'],modes:['分析','设计','集成','评审','恢复'],
     comp:['architecture.system-design · principal','architecture.reliability · advanced'],
     cmds:[['/架构设计','从需求产出边界、合同、失败处理与迁移方案'],['/技术选型','按质量属性评估备选方案并记录取舍'],['/实现计划','拆出带可执行验证命令的编码任务图']],
     steps:['建模边界与数据归属','按质量属性评估备选方案','定义合同、失败行为与迁移','记录决策与被否决方案','指定架构验证场景'],
     cons:['采用满足实测需求的最小架构','每条实现验证必须是可执行命令，拒绝人工目视检查','验证命令需在 macOS 与 Linux 上可移植'],
     out:'docs/architecture.md · docs/implementation-plan.json'},
    {id:'software-engineer',k:'eng',name:'软件工程师',role:'软件工程师',by:'Lingee 内置',
     desc:'实现可维护的软件变更并完成针对性验证，只改授权范围内的代码。',
     tags:['软件实现','系统集成'],modes:['分析','设计','实现','集成','验证','恢复'],
     comp:['engineering.implementation · advanced','engineering.integration · advanced'],
     skills:['app-build','standalone-build','site-builder'],
     cmds:[['/实现','按验收条件完成最小完整变更并跑通验证'],['/修缺陷','复现、定位、修复并补回归测试'],['/一次性交付','小型单页应用一次写完全部代码 + build 验证']],
     steps:['复现或确立当前行为','阅读受影响的合同与调用点','实现最小完整的源码变更','同步更新测试与生成物','运行聚焦与包级验证'],
     cons:['只修改已授权范围','不得绕过失败的检查','不得声称拥有部署或 Runner 权限']},
    {id:'software-qa-engineer',k:'qa',name:'软件测试工程师',role:'质量工程师',by:'Lingee 内置',
     desc:'独立验证验收行为、回归影响与交付风险，给出基于证据的质量结论。',
     tags:['质量保障','独立验证'],modes:['分析','设计','评审','验证'],
     comp:['quality.verification · principal','quality.regression-analysis · advanced'],
     cmds:[['/验证计划','按风险模型设计验收与回归场景'],['/端到端验证','实际跑 build、请求与用例并留存证据'],['/质量结论','给出 pass / pass-with-risk / fail 与理由']],
     steps:['梳理变更影响与质量风险','设计验收与回归场景','执行授权范围内最强的检查','复现并分级缺陷','给出基于证据的质量结论'],
     cons:['与实现方声明保持独立','不得执行破坏性或未批准的压测','不授予发布权限']},
    {id:'code-reviewer',k:'cr',name:'代码评审专家',role:'实现代码评审',by:'Lingee 内置',ro:true,
     desc:'独立评审实现代码的正确性、并发安全与合同落实情况，只读不改。',
     tags:['只读评审','正确性'],modes:['评审','验证'],
     comp:['implementation-correctness · principal','concurrent-commit-model · principal'],
     cmds:[['/代码评审','把合同义务追溯到代码路径，报告可复现的缺陷']],
     steps:['把合同义务追溯到具体代码路径与可观察结果','检查规范化、声明、失败清理与并发测试','以可复现的判定标准报告实现缺陷'],
     cons:['不得修改实现或其测试','不得把注释或名义类型当作行为证明']},
    {id:'security-reviewer',k:'sec',name:'安全评审专家',role:'应用安全评审',by:'Lingee 内置',ro:true,
     desc:'基于信任边界建立威胁模型，演练滥用、竞态与绕过场景并给出风险判定。',
     tags:['只读评审','威胁建模'],modes:['评审','验证'],
     comp:['application-security · principal','filesystem-safety · advanced'],
     cmds:[['/安全评审','建威胁模型、演练滥用场景、给出风险是否可接受']],
     steps:['基于信任边界建立威胁模型','演练滥用、竞态、部分失败与绕过场景','对安全发现分级并判断风险模型是否可接受'],
     cons:['不得修改被评审产物或直接修复','不得接受无证据的原子性与竞态安全保证']},
    {id:'read-only-analyst',k:'ana',name:'只读分析专家',role:'软件分析',by:'Lingee 内置',ro:true,
     desc:'在不改动工作区的前提下做有边界的源码分析与结论交叉验证。',
     tags:['只读分析'],modes:['分析','评审','验证'],
     comp:['software.analysis · advanced'],
     cmds:[['/读代码','有边界地读源码并给出结论与证据']],
     steps:['检视有边界的源码与合同','用直接证据交叉验证发现','在不改动工作区的前提下给出结论'],
     cons:['不得修改文件','不得执行有副作用的命令']},
    {id:'frontend-engineer',k:'fe',name:'前端工程专家',role:'前端工程师',by:'金蝶官方',
     desc:'金蝶前端规范下的组件实现、响应式布局与交互调试。',
     tags:['React','响应式','组件库'],modes:['设计','实现','验证'],
     comp:['engineering.frontend · advanced'],skills:['kd-frontend-development','frontend-design'],
     cmds:[['/建页面','按设计稿实现响应式页面'],['/组件','产出符合规范的可复用组件'],['/样式对齐','把实现调到与设计稿一致']],
     steps:['确认设计稿与交互规范','实现组件与布局','处理多端与暗色适配','补组件测试'],
     cons:['遵循金蝶前端规范','不得引入未评估的第三方依赖']},
    {id:'ux-designer',k:'ux',name:'界面设计专家',role:'交互 / 视觉设计',by:'金蝶官方',
     desc:'信息架构、交互流程与视觉规范，产出可直接交付前端的设计说明。',
     tags:['交互设计','视觉规范'],modes:['分析','设计','评审'],
     comp:['design.interaction · advanced'],skills:['kingdee-design','frontend-design'],
     cmds:[['/设计简报','对齐业务目标、用户需求与设计策略'],['/信息架构','梳理导航、层级与页面骨架'],['/设计走查','对已实现页面做规范与可用性检查']],
     steps:['澄清目标用户与场景','梳理信息架构与主流程','产出交互与视觉规范','走查实现一致性'],
     cons:['设计说明必须可被前端直接实现','不得规定与设计系统冲突的样式']},
    {id:'cosmic-form',k:'form',name:'苍穹表单专家',role:'苍穹表单',by:'金蝶官方',
     desc:'KDDP 表单引擎的字段、校验、联动与权限配置。',
     tags:['表单设计','字段校验'],modes:['分析','设计','实现'],
     comp:['cosmic.form-design · advanced'],skills:['cosmic-requirements-spec'],
     cmds:[['/建单据','根据业务需求设计苍穹表单结构'],['/字段联动','配置校验规则与字段联动逻辑'],['/权限配置','设置单据与字段级权限']],
     steps:['梳理单据业务规则','设计表单结构与字段','配置校验与联动','映射数据模型'],
     cons:['遵循苍穹元数据规范','不得绕过标准扩展点直接改内核']},
    {id:'cosmic-workflow',k:'flow',name:'苍穹工作流专家',role:'苍穹工作流',by:'金蝶官方',
     desc:'审批链配置与流程调试，处理加签、会签、条件流转等复杂场景。',
     tags:['审批链','流程调试'],modes:['分析','设计','实现','验证'],
     comp:['cosmic.workflow · advanced'],
     cmds:[['/配流程','梳理审批流程并配置工作流'],['/调流转','排查节点为什么不流转']],
     steps:['梳理审批场景与角色','配置流程节点与条件','调试流转与异常分支','验证端到端审批'],
     cons:['流程变更需保留可回滚配置']},
    {id:'cosmic-report',k:'rpt',name:'苍穹报表专家',role:'苍穹报表',by:'金蝶官方',
     desc:'报表建模、取数逻辑与图表配置，兼顾查询性能与交互式分析。',
     tags:['报表建模','取数逻辑'],modes:['分析','设计','实现'],
     comp:['cosmic.report · advanced'],
     cmds:[['/建报表','设计报表数据模型与取数逻辑'],['/调性能','优化报表取数与查询性能']],
     steps:['明确分析口径','设计数据模型与取数','配置图表与交互','优化查询性能'],
     cons:['取数口径需与业务确认后固化']},
    {id:'cosmic-plugin',k:'plug',name:'苍穹二开插件专家',role:'苍穹二开',by:'金蝶官方',
     desc:'基于扩展点开发二开插件，处理注册、生命周期调试与升级兼容。',
     tags:['插件开发','扩展点'],modes:['设计','实现','验证','恢复'],
     comp:['cosmic.plugin · advanced'],skills:['cosmic-reverse-engineering'],
     cmds:[['/写插件','基于扩展点开发插件'],['/查不生效','排查插件注册后不生效的原因']],
     steps:['定位合适的扩展点','实现插件逻辑','注册并调试生命周期','验证升级兼容'],
     cons:['不得修改标准产品内核','插件必须可独立卸载']},
    {id:'cosmic-api',k:'api',name:'苍穹集成接口专家',role:'苍穹集成',by:'金蝶官方',
     desc:'开放接口对接、鉴权配置与数据同步，含异常重试与幂等设计。',
     tags:['接口对接','鉴权'],modes:['设计','实现','集成','验证'],
     comp:['cosmic.integration · advanced'],
     cmds:[['/对接接口','对接苍穹开放接口与第三方系统'],['/配鉴权','配置接口鉴权与安全策略'],['/数据同步','设计同步任务与异常重试']],
     steps:['确认接口契约与鉴权方式','实现对接与错误处理','设计幂等与重试','联调验证'],
     cons:['凭据不得硬编码','同步必须幂等可重放']}
  ];
  var EX={}; EXPERTS.forEach(function(e){EX[e.id]=e});

  var TEAM_LEVELS=[
    {id:'lightweight',name:'快速',desc:'直接实现 + 自检，省掉评审与独立 QA。小页面、小工具用这个。'},
    {id:'standard',name:'标准',desc:'需求 → 设计 → 编码准入评审 → 实现 → 测试 → 集成。默认。'},
    {id:'product',name:'产品级',desc:'标准流程 + 强制安全评审，评审与 QA 不可省略。'}
  ];
  var VALID_LEVELS=TEAM_LEVELS.map(function(l){return l.id});
  function levelName(id){ for(var i=0;i<TEAM_LEVELS.length;i++) if(TEAM_LEVELS[i].id===id) return TEAM_LEVELS[i].name; return id; }

  var PRESET_TEAMS=[
    {id:'software-company',preset:true,name:'软件开发团队',by:'Lingee 内置',
     desc:'跨职能软件产品交付团队，覆盖需求、架构、实现、质量与集成的完整闭环。也是新建任务时的默认选择。',
     level:'standard',leadId:'software-team-lead',
     members:['software-team-lead','software-product-manager','software-architect','software-engineer','software-qa-engineer']},
    {id:'fast-app',preset:true,name:'应用速成小队',by:'Lingee 内置',
     desc:'工程师一次性写完全部代码，QA 端到端验证。适合单页应用、小游戏、原型页这类一次交付的活。',
     level:'lightweight',leadId:'software-engineer',
     members:['software-engineer','software-qa-engineer']},
    {id:'cosmic-team',preset:true,name:'苍穹交付团队',by:'金蝶官方',
     desc:'面向苍穹配置化交付：需求规格 → 表单与流程配置 → 报表 → 二开插件 → 接口集成。',
     level:'standard',leadId:'software-team-lead',
     members:['software-team-lead','software-product-manager','cosmic-form','cosmic-workflow','cosmic-report','cosmic-api']},
    {id:'web-team',preset:true,name:'网页交付小队',by:'金蝶官方',
     desc:'设计与前端配对交付：信息架构与视觉规范先行，前端按规范实现并做设计走查。',
     level:'standard',leadId:'ux-designer',
     members:['ux-designer','frontend-engineer','software-qa-engineer']}
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
  function clearPick(){ activePick={kind:null,id:''}; }

  function loadTeams(){
    var raw=null;
    try{ raw=localStorage.getItem(TEAM_STORE_KEY); }catch(e){ return; }
    if(!raw) return;
    var d;
    try{ d=JSON.parse(raw); }catch(e){ return; }
    if(!d||typeof d!=='object') return;
    var custom=Array.isArray(d.teams)?d.teams:[];
    var valid=custom.filter(function(t){
      return t&&typeof t.id==='string'&&!t.preset&&typeof t.name==='string'
        &&Array.isArray(t.members)&&t.members.every(function(m){return !!EX[m]});
    }).map(function(t){
      return {id:t.id,preset:false,name:t.name,by:t.by||'我创建的',desc:t.desc||'',
        level:VALID_LEVELS.indexOf(t.level)>=0?t.level:'standard',
        leadId:EX[t.leadId]?t.leadId:(t.members[0]||null),members:t.members.slice()};
    });
    TEAMS=PRESET_TEAMS.slice().concat(valid);
    if(d.activePick&&d.activePick.kind&&d.activePick.id){
      var k=d.activePick.kind, id=d.activePick.id;
      if((k==='team'&&teamById(id))||(k==='expert'&&EX[id])) activePick={kind:k,id:id};
    }
  }
  function saveTeams(){
    try{
      localStorage.setItem(TEAM_STORE_KEY, JSON.stringify({
        v:1,
        teams:TEAMS.filter(function(t){return !t.preset}),
        activePick:activePick
      }));
    }catch(e){ /* 隐私模式 / 配额满：原型退化为内存态，不打扰用户 */ }
  }
  function teamById(id){ for(var i=0;i<TEAMS.length;i++) if(TEAMS[i].id===id) return TEAMS[i]; return null; }

  /* ---------- 编排推导：成员 + 交付强度 → 任务 DAG ---------- */
  function teamFlow(t){
    function any(){ for(var i=0;i<arguments.length;i++) if(t.members.indexOf(arguments[i])>=0) return arguments[i]; return null; }
    function byMode(m){ for(var i=0;i<t.members.length;i++){ var e=EX[t.members[i]]; if(e&&e.modes.indexOf(m)>=0) return t.members[i]; } return null; }
    var f=[];
    if(t.level==='lightweight'){
      f.push({k:'implement',title:'一次性实现',who:any('software-engineer','frontend-engineer','cosmic-form','cosmic-plugin')||byMode('实现')});
      if(byMode('验证')) f.push({k:'test',title:'自检验证',who:any('software-qa-engineer')||byMode('验证')});
      return f;
    }
    if(t.members.length>1) f.push({k:'analyze',title:'协调范围与门禁',who:any('software-team-lead')});
    f.push({k:'analyze',title:'分析需求与验收',who:any('software-product-manager','software-team-lead')});
    f.push({k:'design',title:'设计方案与实现计划',who:any('software-architect','ux-designer')});
    f.push({k:'review',title:'编码准入评审',who:any('software-team-lead','code-reviewer','read-only-analyst')});
    f.push({k:'implement',title:'实现编码任务',who:any('software-engineer','frontend-engineer','cosmic-form','cosmic-plugin','cosmic-workflow','cosmic-api')||byMode('实现')});
    if(t.level==='product') f.push({k:'review',title:'安全评审',who:any('security-reviewer','code-reviewer')});
    f.push({k:'test',title:'独立质量验证',who:any('software-qa-engineer')});
    f.push({k:'integrate',title:'集成与交付确认',who:any('software-team-lead','software-architect')});
    return f;
  }
  function teamLint(t){
    var w=[],has=function(id){return t.members.indexOf(id)>=0};
    if(t.members.length>1 && !has('software-team-lead') && t.level!=='lightweight')
      w.push('多人协作需要一位「软件团队负责人」开 kickoff 并做最终集成确认。');
    if(t.level!=='lightweight' && !has('software-product-manager'))
      w.push('标准 / 产品级要求恰好一个需求分析任务，建议加入「软件产品经理」。');
    if(t.level!=='lightweight' && !has('software-architect') && !has('ux-designer'))
      w.push('标准以上交付的 design 环节无人承担，需加入「软件架构师」或「界面设计专家」。');
    var canImpl=false;
    t.members.forEach(function(id){ if(EX[id]&&EX[id].modes.indexOf('实现')>=0) canImpl=true; });
    if(!canImpl) w.push('没有成员具备「实现」工作模式，实现任务无人可领取。');
    if(t.level!=='lightweight' && !has('software-qa-engineer'))
      w.push('评审与 QA 是标准以上交付的强制门禁，缺少「软件测试工程师」会让验证环节落空。');
    if(t.level==='product' && !has('security-reviewer'))
      w.push('产品级建议加入「安全评审专家」，否则安全门禁由代码评审代管。');
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
          +'<div class="card-top">'+facesHtml(t.members,4)
          +'<div class="card-titles"><div class="card-title-row"><span class="card-title">'+xesc(t.name)+'</span>'
          +(t.preset?'<span class="x-badge">内置</span>':'')+'</div>'
          +'<div class="x-sub">'+xesc(t.by)+' · '+t.members.length+' 位专家</div></div></div>'
          +'<div class="card-desc">'+xesc(t.desc)+'</div>'
          +'<div class="card-tags"><span class="ptag">'+levelName(t.level)+'交付</span>'
          +t.members.slice(0,2).map(function(m){return '<span class="ptag">'+EX[m].role+'</span>'}).join('')+'</div></div>';
      }).join('');
    }else{
      var rows2=EXPERTS.filter(function(e){
        if(!kw) return true;
        return (e.name+e.role+e.desc+e.tags.join()).indexOf(kw)>=0;
      });
      html=rows2.map(function(e){
        return '<div class="app-card x-card" data-expert="'+e.id+'">'
          +'<div class="card-top"><img class="x-av" src="'+xav(e.k)+'" alt="">'
          +'<div class="card-titles"><div class="card-title-row"><span class="card-title">'+xesc(e.name)+'</span>'
          +(e.ro?'<span class="x-badge x-badge-ro">只读</span>':'')+'</div>'
          +'<div class="x-sub">'+xesc(e.role)+' · '+xesc(e.by)+'</div></div></div>'
          +'<div class="card-desc">'+xesc(e.desc)+'</div>'
          +'<div class="card-tags">'+e.tags.slice(0,3).map(function(t){return '<span class="ptag">'+xesc(t)+'</span>'}).join('')+'</div></div>';
      }).join('');
    }
    expertGrid.innerHTML = html || '<div class="x-empty">没有匹配的结果</div>';
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
      +'<div class="x-sec"><div class="x-sec-t">快捷命令 '+e.cmds.length+'</div>'
      +e.cmds.map(function(c){return '<button type="button" class="x-cmd" data-cmd="'+xesc(c[0])+'"><code>'+xesc(c[0])+'</code><span>'+xesc(c[1])+'</span></button>'}).join('')+'</div>'
      +(e.skills?'<div class="x-sec"><div class="x-sec-t">挂载技能</div><div class="x-chips">'+e.skills.map(function(k){return '<span class="ptag">'+xesc(k)+'</span>'}).join('')+'</div></div>':'')
      +'<div class="x-sec"><div class="x-sec-t">能力项</div><div class="x-chips">'+e.comp.map(function(c){return '<span class="ptag">'+xesc(c)+'</span>'}).join('')+'</div></div>'
      +'<div class="x-sec"><div class="x-sec-t">可承担的工作</div><div class="x-chips">'+e.modes.map(function(m){return '<span class="ptag">'+xesc(m)+'</span>'}).join('')+'</div></div>'
      +(e.out?'<div class="x-sec"><div class="x-sec-t">专属产物</div><div class="x-chips"><span class="ptag">'+xesc(e.out)+'</span></div></div>':'')
      +list('工作方式',e.steps)+list('行为约束',e.cons);
    $('#expertModalFoot').innerHTML='<button type="button" class="modal-btn confirm" data-x-close>关闭</button>';
    expertModal.classList.add('show');
  }
  if(expertModal) expertModal.addEventListener('click',function(e){
    if(e.target===expertModal||e.target.closest('[data-x-close]')){ expertModal.classList.remove('show'); return; }
    var c=e.target.closest('[data-cmd]');
    if(c){
      expertModal.classList.remove('show');
      showView('newtask'); setNavActive('新会话');
      input.textContent=c.getAttribute('data-cmd')+' '; input.focus();
      try{
        var r=document.createRange(); r.selectNodeContents(input); r.collapse(false);
        var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      }catch(err){}
    }
  });

  /* ---------- 专家团配置弹窗 ---------- */
  var teamModal=$('#teamModal'), teamDraft=null, teamEditingId=null;
  function openTeamModal(id){
    var t=id?teamById(id):null;
    teamEditingId=id||null;
    teamDraft=t?{name:t.name,desc:t.desc,level:t.level,leadId:t.leadId,members:t.members.slice(),preset:!!t.preset}
              :{name:'',desc:'',level:'standard',leadId:'software-team-lead',members:['software-team-lead','software-engineer'],preset:false};
    $('#teamModalTitle').textContent = t?t.name:'新建专家团';
    $('#teamReadonlyTip').classList.toggle('hidden', !teamDraft.preset);
    $('#teamName').value=teamDraft.name; $('#teamDesc').value=teamDraft.desc;
    $('#teamName').readOnly=teamDraft.preset; $('#teamDesc').readOnly=teamDraft.preset;
    $('#teamSaveBtn').textContent = teamDraft.preset?'另存为我的专家团':'保存';
    $('#teamDeleteBtn').classList.toggle('hidden', teamDraft.preset || !teamEditingId);
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

    $('#teamLevels').innerHTML = TEAM_LEVELS.map(function(l){
      return '<button type="button" class="x-level'+(d.level===l.id?' on':'')+'" data-level="'+l.id+'">'
        +'<b>'+l.name+'</b><span>'+l.desc+'</span></button>';
    }).join('');

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

    $('#teamWarnings').innerHTML = teamLint(d).map(function(w){
      return '<div class="x-warn"><span>⚠</span><span>'+xesc(w)+'</span></div>'; }).join('');

    $$('#teamMembers .x-member-a').forEach(function(a){ a.classList.toggle('hidden', !!d.preset); });
    $('#teamAddBtn').classList.toggle('hidden', !!d.preset);
    $$('#teamLevels .x-level').forEach(function(b){ b.disabled=!!d.preset; });
  }
  if(teamModal){
    teamModal.addEventListener('click',function(e){
      if(e.target===teamModal){ teamModal.classList.remove('show'); return; }
      var n;
      if(n=e.target.closest('[data-view-expert]')){ openExpertModal(n.getAttribute('data-view-expert')); return; }
      if(n=e.target.closest('[data-set-lead]')){ teamDraft.leadId=n.getAttribute('data-set-lead'); renderTeamModal(); return; }
      if(n=e.target.closest('[data-rm-member]')){
        var id=n.getAttribute('data-rm-member');
        teamDraft.members=teamDraft.members.filter(function(m){return m!==id});
        if(teamDraft.leadId===id) teamDraft.leadId=teamDraft.members[0]||null;
        renderTeamModal(); return;
      }
      if(n=e.target.closest('[data-level]')){ teamDraft.level=n.getAttribute('data-level'); renderTeamModal(); return; }
    });
    $('#teamModalClose').addEventListener('click',function(){ teamModal.classList.remove('show') });
    $('#teamCancelBtn').addEventListener('click',function(){ teamModal.classList.remove('show') });
    $('#teamName').addEventListener('input',function(){ teamDraft.name=this.value });
    $('#teamDesc').addEventListener('input',function(){ teamDraft.desc=this.value });
    $('#teamAddBtn').addEventListener('click',function(){ openMemberModal() });
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
      if(!name){ toast('请填写专家团名称','warning'); $('#teamName').focus(); return; }
      if(!d.members.length){ toast('至少需要一位成员','warning'); return; }
      if(d.preset || !teamEditingId){
        var nid='team-'+Date.now();
        TEAMS.push({id:nid,preset:false,name:d.preset?name+' 副本':name,by:'我创建的',
          desc:d.desc,level:d.level,leadId:d.leadId,members:d.members.slice()});
        toast(d.preset?'已另存为你的专家团':'专家团已创建','success');
      }else{
        var t=teamById(teamEditingId);
        t.name=name; t.desc=d.desc; t.level=d.level; t.leadId=d.leadId; t.members=d.members.slice();
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
  var newTeamBtn=$('#newTeamBtn');
  if(newTeamBtn) newTeamBtn.addEventListener('click',function(){ openTeamModal(null) });

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
    '原型探索':{id:'kingdee-design',   ic:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>'},
    '通用应用':{id:'general-app-builder', ic:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'},
    '苍穹应用':{id:'app-builder-partner', ic:'<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>'},
    '业务组件':{id:'mcp-apps-builder', ic:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>'}
  };
  function renderModeTag(){
    var el=$('.mode-item.checked'), mode=el?el.getAttribute('data-val'):null;
    var b=mode?MODE_BUILDERS[mode]:null;
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
      renderModeTag(); return;
    }
    if(ev.target.closest('.mode-item')) setTimeout(renderModeTag,0);
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
        else activePick={kind:'team',id:tid};
        saveTeams(); renderExpertChips(); dd.classList.remove('open'); return;
      }
      if(n=ev.target.closest('[data-pick-expert]')){
        var eid=n.getAttribute('data-pick-expert');
        if(activePick.kind==='expert'&&activePick.id===eid) clearPick();
        else activePick={kind:'expert',id:eid};
        saveTeams(); renderExpertChips(); dd.classList.remove('open'); return;
      }
      if(ev.target.closest('[data-goto-experts]')){
        dd.classList.remove('open');
        showView('experts'); setNavActive('专家'); renderExpertGrid();
      }
    });

  });

  loadTeams();
  renderExpertChips();
  renderModeTag();
  renderExpertGrid();


})();
