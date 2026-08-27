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
    {id:'10',date:'2026-08-27',iconBg:'#eef3ff',iconColor:'#495dff',team:'苍穹应用开发 · 预览区新增列表页签',body:'预览面板页签新增「列表」选项，支持列表视图展示，包含搜索、排序、勾选高亮等能力。'},
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
        html+='<button class="changelog-noti-toggle" data-action="unread" title="标记未读"><svg class="ic ic-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg></button>';
      }else{
        // 未读 → 显示 Eye（睁眼）→ 标记已读
        html+='<button class="changelog-noti-toggle" data-action="read" title="标记已读"><svg class="ic ic-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>';
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
  var viewHome=$('#view-home'), viewNew=$('#view-newtask'), viewChat=$('#view-chat'), viewApps=$('#view-apps'), viewSkills=$('#view-skills'), viewAgents=$('#view-agents'), viewDesign=$('#view-design'), viewSettings=$('#view-settings');
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
        }else{
          toast('编辑：'+name);
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
    var ver=item.querySelector('.env-ver');
    var tooLow=ver&&ver.classList.contains('bad');
    setTimeout(function(){
      if(tooLow){
        badge.className='env-status fail';
        badge.textContent='版本过低';
        toast(name+'：版本低于 V8.0.10，无法连通','error');
      }else{
        badge.className='env-status ok';
        badge.textContent='连通正常 '+(60+Math.floor(Math.random()*180))+'ms';
        toast(name+'：连通正常');
      }
    },700+Math.random()*600);
  }
  $$('.env-more').forEach(bindEnvMore);
  document.addEventListener('click',function(){ closeEnvMenus(null); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeEnvMenus(null); });

  var envModal=$('#envModal');
  function openEnvModal(){
    if(!envModal)return;
    ['envName','envUrl','envUser','envPwd'].forEach(function(id){ var el=$('#'+id); if(el) el.value=''; });
    var d=$('#envDefault'); if(d) d.checked=false;
    var r=$('input[name="envType"][value="本地"]'); if(r) r.checked=true;
    var dd=$('#envTenantDd');
    if(dd){
      dd.classList.remove('open');
      $$('.menu-item',dd).forEach(function(i){i.classList.remove('checked')});
      $('.chip-label',dd).textContent='请选择账套';
      $('[data-chip]',dd).classList.add('muted');
    }
    envModal.classList.add('show');
    setTimeout(function(){ var n=$('#envName'); if(n) n.focus(); },60);
  }
  function closeEnvModal(){ if(envModal) envModal.classList.remove('show'); }
  var envAdd=$('#envAdd');
  if(envAdd) envAdd.addEventListener('click',openEnvModal);
  ['#envModalClose','#envModalCancel'].forEach(function(sel){
    var b=$(sel); if(b) b.addEventListener('click',closeEnvModal);
  });
  if(envModal) envModal.addEventListener('click',function(e){ if(e.target===envModal) closeEnvModal(); });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&envModal&&envModal.classList.contains('show')) closeEnvModal();
  });
  var envModalConfirm=$('#envModalConfirm');
  if(envModalConfirm){
    envModalConfirm.addEventListener('click',function(){
      var name=($('#envName').value||'').trim();
      var url=($('#envUrl').value||'').trim();
      if(!name){ toast('请填写环境名称','error'); $('#envName').focus(); return; }
      if(!url){ toast('请填写环境地址','error'); $('#envUrl').focus(); return; }
      var type=$('input[name="envType"]:checked').value;
      var isDef=$('#envDefault').checked;
      var list=$('.env-list');
      if(isDef) $$('.env-tag.def',list).forEach(function(t){t.remove()});
      var item=document.createElement('div');
      item.className='env-item';
      item.innerHTML='<div class="env-main"><div class="env-head"><span class="env-name"></span>'
        +'<span class="env-ver">v8.2.3</span>'
        +(isDef?'<span class="env-tag def">默认</span>':'')
        +'<span class="env-tag '+(type==='云端'?'cloud':'local')+'">'+type+'</span></div>'
        +'<div class="env-url"></div></div>'
        +'<div class="env-more-wrap"><button class="env-more" data-tooltip="更多" aria-label="更多" aria-haspopup="true">'
        +'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>'
        +'<div class="env-menu"><div class="env-mi" data-act="edit">编辑</div><div class="env-mi" data-act="test">测试连接</div><div class="env-mi" data-act="copy">复制地址</div><div class="env-mi" data-act="default">设为默认</div><div class="env-mi-sep"></div><div class="env-mi danger" data-act="delete">删除</div></div></div>';
      item.querySelector('.env-name').textContent=name;
      item.querySelector('.env-url').textContent=url;
      bindEnvMore(item.querySelector('.env-more'));
      list.appendChild(item);
      closeEnvModal();
      toast('已新增环境：'+name);
    });
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
  var dsPaletteBtn=$('#dsPaletteBtn');
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
    {name:'数据展示',en:'Data Display',count:20,color:'#3a7bff',bg:'#eef3ff',icon:'<path d="M3 3v18h18"/><path d="M7 16l4-4 3 3 5-6"/>'},
    {name:'反馈',en:'Feedback',count:11,color:'#e04a3a',bg:'#fee',icon:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'},
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
        h+='<div style="'+box+'"><span style="'+lbl+'">文字提示</span><div style="display:flex;gap:16px;align-items:center">'
          +'<div style="position:relative;display:inline-block">'
          +'<button style="background:#fff;border:1px solid var(--border);border-radius:6px;padding:6px 12px;font-size:14px;cursor:pointer">悬浮我</button>'
          +'<div style="position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#2d2d2d;color:#fff;padding:4px 8px;border-radius:6px;font-size:14px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.15)">提示文字</div>'
          +'</div></div></div>';
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
  }else{
    /* 默认显示新会话 */
    showView('newtask');
    setNavActive('新会话');
  }

})();
