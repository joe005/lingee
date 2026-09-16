import { $ } from '../../core/dom.js';
import { fullAppData } from '../attach-app.js';
/* Design System：图标库
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


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

export { bindDsSelect, renderIcons, renderSelect };
