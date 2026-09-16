import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { setUrlState } from '../../core/view.js';
import { cvApplyConfigScope } from './config.js';
import { CV_PROJECTS, CV_REVIEWS, CV_TASKS, cvInProject, cvInjectCardActions, cvProject, cvProjectById, cvProjectName, cvRenderMemberStats, cvRenderMembers, cvRenderReviewStats, cvRenderReviews, cvRenderTaskStats, cvRenderTasks, set_cvProject } from './data.js';
import { cvApplyReviewFilters } from './tasks.js';
import { cvApplyFilters, cvLastTab } from './view.js';
import { xesc } from '../expert/data.js';
import { TEAMS } from '../expert/store.js';
/* 协作开发：项目切换与专家团默认绑定
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


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
  set_cvProject(id||'');
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
  setUrlState('/collab?tab='+cvLastTab+(cvProject?'&proj='+cvProject:''));
}
var cvProjBtn=$('#cvProjBtn');
var cvProjMenu=$('#cvProjMenu');

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
var cvBindMenu=$('#cvBindMenu');

export function initCollabProjects() {
  if(cvProjBtn) cvProjBtn.addEventListener('click',function(e){
    e.stopPropagation();
    var sw=$('#cvProjSwitch'); if(sw) sw.classList.toggle('open');
  });
  if(cvProjMenu) cvProjMenu.addEventListener('click',function(e){
    var it=e.target.closest('[data-cv-proj]'); if(!it) return;
    $('#cvProjSwitch').classList.remove('open');
    cvSetProject(it.getAttribute('data-cv-proj'));
  });
  if(cvBindBtn) cvBindBtn.addEventListener('click',function(e){
    e.stopPropagation();
    $('#cvBindSwitch').classList.toggle('open');
  });
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
}

export { cvRenderProjMenu, cvRenderTeamBind, cvSetProject, cvSyncUrl, cvUpdateCounts };
