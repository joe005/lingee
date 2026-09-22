import { $, $$ } from '../core/dom.js';
/* 下拉菜单（hover 展开 / 表单内下拉）
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


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

export function initHoverDropdowns() {
  $$('.dropdown').forEach(function(dd){
    var chip=$('[data-chip]',dd);
    if(!chip) return;
    /* 用 id 判断而非变量引用：appDd / chatAppDd 在本行之后才赋值，
       用变量会因 var 提升恒为 undefined，导致专用下拉被重复绑定 */
    if(dd.id==='appDropdown' || dd.id==='chatAppDropdown') return;
    if(dd.classList.contains('field-dd')) return; // 表单内下拉改为点击展开
    if(dd.classList.contains('project-dd')) return; // 项目操作同为点击展开，与会话操作一致
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
  $$('.dropdown').forEach(function(dd){
    new MutationObserver(function(){
      if(dd.classList.contains('open')){
        requestAnimationFrame(function(){ adjustMenuHeight(dd); });
      }
    }).observe(dd,{attributes:true,attributeFilter:['class']});
  });
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
}

export function initFormDropdowns() {
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
}

export { closeAll };
