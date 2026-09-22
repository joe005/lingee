import { $, $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { showView } from '../core/view.js';
import { chatResizer } from './composer.js';
import { LOGIN_KEY, REMEMBER_KEY, loginError, loginForm, showLogin } from './login.js';
/* 侧边栏：滚动条、用户菜单、图标功能、分段页签、分组折叠
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


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
/* ---------- 用户菜单：头像 / 姓名 ---------- */
var userWrap=$('.user-wrap'), userBtn=$('#userBtn');
function closeUserMenu(){
  if(!userWrap)return;
  userWrap.classList.remove('open');
  if(userBtn) userBtn.setAttribute('aria-expanded','false');
}
var userMenuSettings=$('#userMenuSettings');
var userMenuLogout=$('#userMenuLogout');
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
/* 展开侧边栏浮动按钮 */
var expandBtn=$('#expandSidebarBtn');

export function initScrollbar() {
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
}

export function initUserMenu() {
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
  var userMenuAnalytics=$('#userMenuAnalytics');
  if(userMenuAnalytics){
    userMenuAnalytics.addEventListener('click',function(){
      closeUserMenu();
      showView('analytics');
      $$('.nav-item').forEach(function(n){n.classList.remove('active')});
    });
  }
  if(userMenuSettings){
    userMenuSettings.addEventListener('click',function(){
      closeUserMenu();
      showView('settings');
      $$('.nav-item').forEach(function(n){n.classList.remove('active')});
    });
  }
  if(userMenuLogout) userMenuLogout.addEventListener('click',function(){
    closeUserMenu();
    try{ sessionStorage.removeItem(LOGIN_KEY); }catch(e){}
    try{ sessionStorage.removeItem('lingee_demo_role'); }catch(e){}
    if(document.body) document.body.removeAttribute('data-role');
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
}

export function initSidebarIcons() {
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
}

export function initSegmentedTabs() {
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
}

/* _prevWishW 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set__prevWishW(v){ _prevWishW=v; return v; }

export { _prevWishW, closeUserMenu, filterSidebar, sbCollapseIcon, sbSearch, sbSearchIcon, sbSearchInput };
