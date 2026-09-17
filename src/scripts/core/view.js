import { $, $$ } from './dom.js';
import { appDd } from '../features/attach-app.js';
import { cvInit } from '../features/collab/index.js';
import { cvLastTab, cvSwitchView } from '../features/collab/view.js';
import { closeAll } from '../features/dropdown.js';
import { withBase } from './base-path.js';
/* 视图切换、侧边栏导航、首页卡片、Logo 回首页
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- mode ↔ sidebar sync ---------- */
var modeItems=$$('.mode-item');
var input=$('#composerInput');
var navItems=$$('.sb-scroll .nav-item');
var navByName={};

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

/* ---------- view switching ---------- */
var viewHome=$('#view-home'), viewNew=$('#view-newtask'), viewChat=$('#view-chat'), viewApps=$('#view-apps'), viewSkills=$('#view-skills'), viewAgents=$('#view-agents'), viewCollab=$('#view-collab'), viewDesign=$('#view-design'), viewSettings=$('#view-settings');
function setUrlState(path){
  /* path 是应用内路径（/collab、/design?token=…）；写进地址栏要带上部署前缀，
     存进 localStorage 的仍是应用内路径，换部署路径后旧记录依然可用 */
  try{history.replaceState(null,'',withBase(path));localStorage.setItem('lingeeUrlState',path)}catch(e){}
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
  if(which!=='design') setUrlState('/'+which);
}
function applyModeSilent(mode){
  modeItems.forEach(function(m){ m.classList.toggle('checked', m.getAttribute('data-val')===mode); });
  input.focus();
}

/* ---------- Logo 点击回首页 ---------- */
var brandEl=$('.brand');

export function initViewSwitch() {
  // 清空输入时恢复空提示占位符
  input.addEventListener('input',function(){
    var text=this.textContent||'';
    if(text.trim()===''){ this.innerHTML=''; }
  });
  navItems.forEach(function(n){ navByName[n.textContent.trim()]=n; });
  modeItems.forEach(function(item){
    item.addEventListener('click',function(){
      applyMode(item.getAttribute('data-val'),true);
    });
  });
}

export function initSidebarNav() {
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
}

export function initHomeCards() {
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
}

export { applyMode, brandEl, input, modeItems, navItems, setNavActive, setUrlState, showView, viewChat, viewDesign };
