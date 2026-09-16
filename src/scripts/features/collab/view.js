import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { setNavActive, showView } from '../../core/view.js';
import { cvRenderExperts } from './experts.js';
import { cvSyncUrl } from './projects.js';
import { cvApplyReviewFilters } from './tasks.js';
import { xesc } from '../expert/data.js';
import { renderExpertGrid } from '../expert/library.js';
/* 协作开发：视图与页签切换
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


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
/* ---------- 面板切换 ---------- */
var cvInited=false, cvLastTab='tasks';
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

export function initCollabView() {

}

export function initCollabTabs() {
  window.cvCard=null; window.cvReviewIdx=0;

}

/* cvInited 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set_cvInited(v){ cvInited=v; return v; }
/* cvPendingProj 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set_cvPendingProj(v){ cvPendingProj=v; return v; }
/* cvPendingTab 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set_cvPendingTab(v){ cvPendingTab=v; return v; }

export { cvAddSidebarConversation, cvApplyFilters, cvGetFilterVal, cvInited, cvLastTab, cvPendingProj, cvPendingTab, cvShowPanel, cvSwitchFilter, cvSwitchView, cvToast };
