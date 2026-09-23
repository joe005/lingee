import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { setUrlState } from '../../core/view.js';
import { CV_MEMBERS, CV_PROJECTS, CV_TASKS, CV_WORKSPACES, cvInProject, cvInjectCardActions, cvPersistProjects, cvProject, cvProjectById, cvProjectInWorkspace, cvRenderReviewStats, cvRenderReviews, cvRenderTaskStats, cvRenderTasks, cvRestoreProjects, cvWorkspace, cvWorkspaceName, set_cvProject, set_cvWorkspace } from './data.js';
import { cvApplyReviewFilters } from './tasks.js';
import { cvApplyFilters, cvLastTab } from './view.js';
import { xesc } from '../expert/data.js';
import { TEAMS } from '../expert/store.js';
/* 协作开发：工作区切换、工作台项目筛选与专家团默认绑定
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 工作区切换（顶层组织单元，项目归属工作区） ---------- */
function cvRenderWsMenu(){
  var menu=$('#cvWsMenu'); if(!menu) return;
  var rows=[{id:'',name:'全部工作区',desc:'跨工作区查看所有项目'}].concat(
    CV_WORKSPACES.map(function(w){
      var cnt=CV_PROJECTS.filter(function(p){return p.workspace===w.id;}).length;
      return {id:w.id,name:w.name,desc:cnt+' 个项目'};
    }));
  menu.innerHTML=rows.map(function(r){
    return '<div class="cv-proj-item'+(r.id===cvWorkspace?' checked':'')+'" data-cv-ws="'+r.id+'">'
      +'<span class="cv-proj-all"></span>'
      +'<span class="cv-proj-n">'+xesc(r.name)+'<em>'+xesc(r.desc)+'</em></span>'
      +'<svg class="ic ic-sm cv-proj-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>';
  }).join('');
}
function cvSetWorkspace(id){
  cvClearWorkbenchTaskFilter();
  set_cvWorkspace(id||'');
  var label=$('#cvWsLabel');
  if(label) label.textContent=cvWorkspace?cvWorkspaceName(cvWorkspace):'全部工作区';
  var sw=$('#cvWsSwitch'); if(sw) sw.classList.toggle('cv-proj--on',!!cvWorkspace);
  cvRenderWsMenu();
  /* 切工作区后，若当前项目不属于该工作区，重置回「全部项目」 */
  if(cvProject && !cvProjectInWorkspace(cvProject)){
    set_cvProject('');
  }
  cvRenderProjMenu();
  if(window.cvRenderProjectList) window.cvRenderProjectList();
  cvRenderTaskStats(); cvRenderTasks(); cvInjectCardActions();
  cvRenderReviewStats(); cvRenderReviews();
  cvApplyFilters(); cvApplyReviewFilters();
  cvUpdateCounts();
  cvSyncUrl();
}

/* ---------- 工作台项目筛选 ---------- */
function cvRenderProjMenu(){
  var select=$('#tb-project'); if(!select) return;
  select.innerHTML='<option value="">全部项目</option>'+CV_PROJECTS.filter(function(p){return cvProjectInWorkspace(p.id);}).map(function(p){
    return '<option value="'+xesc(p.id)+'">'+xesc(p.name)+'</option>';
  }).join('');
  select.value=cvProject;
}
function cvSetProject(id){
  set_cvProject(id&&cvProjectById(id)&&cvProjectInWorkspace(id)?id:'');
  var select=$('#tb-project'); if(select) select.value=cvProject;
  cvRenderTaskStats(); cvRenderTasks(); cvInjectCardActions();
  cvRenderReviewStats(); cvRenderReviews();
  cvApplyFilters(); cvApplyReviewFilters();
  cvUpdateCounts();
  cvSyncUrl();
}
function cvClearWorkbenchTaskFilter(){
  var search=$('#tb-search');
  if(search){ search.value=''; delete search.dataset.focusTaskId; }
}
function cvUpdateCounts(){
  var tc=$('#cvTaskCount'); if(tc) tc.textContent=CV_TASKS.filter(function(t){return t.kind!=='epic'}).filter(cvInProject).length;
  /* 待评审已合并到任务管理，不再单独计数 */
}
function cvSyncUrl(){
  setUrlState('/collab?tab='+cvLastTab+(cvLastTab==='tasks'&&cvProject?'&proj='+cvProject:''));
}
var cvWsBtn=$('#cvWsBtn');
var cvWsMenu=$('#cvWsMenu');

/* 专家团由项目详情维护；任务和运行期只消费项目绑定结果。 */

/* ---------- 项目设置：标题 / 描述 / 优先级 / 负责人 / 代码仓库 / 里程碑 ---------- */
var cvProjEditId='';
/* 项目增改落 localStorage（持久化函数已移入 data.js，这里只留新建项目的色板） */
var CV_PROJ_NEW_DOTS=['blue','orange','green'];
var CV_PROJ_DOT_COLORS={blue:'#4d89ff',orange:'#ff8d42',green:'#08cc50'};
function cvRenderProjectSettings(){
  var el=$('#cv-proj-settings');if(!el)return;
  el.innerHTML='<div class="cfg-table">'
    +'<div class="cfg-table-head cv-proj-head"><span>项目</span><span>优先级</span><span>负责人</span><span>代码仓库</span><span>里程碑</span><span>操作</span></div>'
    +CV_PROJECTS.map(function(p){
      return '<div class="cfg-table-row cv-proj-row">'
        +'<span class="cfg-t-name"><i class="cfg-dot" style="background:'+(CV_PROJ_DOT_COLORS[p.dot]||'#b8b8b8')+'"></i><span>'+xesc(p.name)+(p.desc?'<em class="cv-proj-desc">'+xesc(p.desc)+'</em>':'')+'</span></span>'
        +'<span>'+xesc(p.priority||'未设置')+'</span>'
        +'<span>'+xesc(p.owner||'未设置')+'</span>'
        +'<span class="cv-proj-repo" title="'+xesc(p.repo||'')+'">'+(p.repo?xesc(p.repo):'未关联')+'</span>'
        +'<span>'+xesc((p.start||'—')+' ~ '+(p.end||'—'))+'</span>'
        +'<span><button type="button" class="act-btn" data-cv-proj-edit="'+p.id+'">设置</button></span>'
        +'</div>';
    }).join('')
    +'</div>';
}
function cvOpenProjEdit(id){
  var p=cvProjectById(id);if(!p)return;
  cvProjEditId=id;
  var set=function(k,val){var e=$('#cv-pe-'+k);if(e)e.value=val||'';};
  set('name',p.name);set('desc',p.desc);set('status',p.status||'planned');set('priority',p.priority||'中');set('repo',p.repo);set('start',p.start);set('end',p.end);
  var sel=$('#cv-pe-owner');
  if(sel) sel.innerHTML=CV_MEMBERS.map(function(m){return '<option'+(m.name===(p.owner||'')?' selected':'')+'>'+xesc(m.name)+'</option>';}).join('');
  var tsel=$('#cv-pe-team');
  if(tsel) tsel.innerHTML='<option value="">请选择专家团</option>'+TEAMS.map(function(t){return '<option value="'+xesc(t.id)+'"'+(t.id===p.defaultTeam?' selected':'')+'>'+xesc(t.name)+'</option>';}).join('');
  cvFillProjectMembers(p.members||[]);
  var memberPicker=$('#cv-pe-members');if(memberPicker)memberPicker.open=false;
  var more=$('#cv-pe-more');if(more)more.open=false;
  var ov=$('#cv-projedit-overlay');if(ov)ov.style.display='flex';
  var toolbar=$('#cv-project-toolbar');if(toolbar)toolbar.classList.add('hidden');
  var tt=$('#cv-pe-title');if(tt)tt.textContent='编辑项目';
  var ws=$('#cv-pe-workspace');if(ws)ws.textContent=cvWorkspaceName(p.workspace);
  var btn=$('#cv-pe-submit');if(btn)btn.textContent='保存修改';
}
function cvOpenProjNew(){
  cvProjEditId='';
  var set=function(k,val){var e=$('#cv-pe-'+k);if(e)e.value=val||'';};
  set('name','');set('desc','');set('status','planned');set('priority','中');set('repo','');set('start','');set('end','');
  var sel=$('#cv-pe-owner');
  if(sel) sel.innerHTML=CV_MEMBERS.map(function(m,i){return '<option'+(i===0?' selected':'')+'>'+xesc(m.name)+'</option>';}).join('');
  var tsel=$('#cv-pe-team');
  if(tsel) tsel.innerHTML='<option value="">请选择专家团</option>'+TEAMS.map(function(t){return '<option value="'+xesc(t.id)+'">'+xesc(t.name)+'</option>';}).join('');
  cvFillProjectMembers([]);
  var memberPicker=$('#cv-pe-members');if(memberPicker)memberPicker.open=false;
  var more=$('#cv-pe-more');if(more)more.open=false;
  var ov=$('#cv-projedit-overlay');if(ov)ov.style.display='flex';
  var toolbar=$('#cv-project-toolbar');if(toolbar)toolbar.classList.add('hidden');
  var tt=$('#cv-pe-title');if(tt)tt.textContent='新建项目';
  var ws=$('#cv-pe-workspace');if(ws)ws.textContent=cvWorkspaceName(cvWorkspace||'ws-build');
  var btn=$('#cv-pe-submit');if(btn)btn.textContent='创建项目';
}
function cvCloseProjEdit(){
  var ov=$('#cv-projedit-overlay');if(ov)ov.style.display='none';
  var detail=$('#cv-proj-detail'),toolbar=$('#cv-project-toolbar');
  if(toolbar && detail?.classList.contains('hidden'))toolbar.classList.remove('hidden');
}
function cvFillProjectMembers(selected){
  var list=$('#cv-pe-members-list'); if(!list)return;
  list.innerHTML=CV_MEMBERS.map(function(m){return '<label><input type="checkbox" value="'+xesc(m.id)+'"'+(selected.includes(m.id)?' checked':'')+'>'+xesc(m.name)+'</label>';}).join('');
  var count=$('#cv-pe-members-count');if(count)count.textContent=selected.length?'项目成员 · '+selected.length:'项目成员 · 可选';
}
function cvSaveProjEdit(){
  var g=function(k){var e=$('#cv-pe-'+k);return e?e.value.trim():'';};
  var name=g('name');
  if(!name){ toast('请填写项目标题','error'); return; }
  var teamId=g('team');
  if(!TEAMS.some(function(t){return t.id===teamId;})){ toast('请选择专家团','error'); $('#cv-pe-team').focus(); return; }
  var members=$$('#cv-pe-members-list input:checked').map(function(input){return input.value;});
  var isNew=!cvProjEditId;
  var p=isNew?null:cvProjectById(cvProjEditId);
  if(p){
    p.name=name;p.desc=g('desc');p.status=g('status');p.priority=g('priority');p.owner=g('owner');p.repo=g('repo');p.start=g('start');p.end=g('end');p.defaultTeam=teamId;p.members=members;
  }else{
    p={id:'proj-'+Date.now(),name:name,desc:g('desc'),status:g('status'),dot:CV_PROJ_NEW_DOTS[CV_PROJECTS.length%CV_PROJ_NEW_DOTS.length],defaultTeam:teamId,members:members,priority:g('priority'),owner:g('owner'),repo:g('repo'),start:g('start'),end:g('end'),workspace:cvWorkspace||'ws-build'};
    CV_PROJECTS.push(p);
  }
  cvPersistProjects();
  cvCloseProjEdit();
  cvRenderProjectSettings();cvRenderProjMenu();
  if(window.cvRenderProjectList) window.cvRenderProjectList();
  if(window.cvRenderProjectDetail) window.cvRenderProjectDetail();
  toast(isNew?'已创建项目：'+name:'已保存项目设置：'+name);
}

export function initCollabProjects() {
  if(cvWsBtn) cvWsBtn.addEventListener('click',function(e){
    e.stopPropagation();
    var sw=$('#cvWsSwitch'); if(sw) sw.classList.toggle('open');
  });
  if(cvWsMenu) cvWsMenu.addEventListener('click',function(e){
    var it=e.target.closest('[data-cv-ws]'); if(!it) return;
    $('#cvWsSwitch').classList.remove('open');
    cvSetWorkspace(it.getAttribute('data-cv-ws'));
  });
  var projectFilter=$('#tb-project');
  if(projectFilter) projectFilter.addEventListener('change',function(){ cvSetProject(this.value); });
  document.addEventListener('click',function(){
    $$('#view-collab .cv-proj.open').forEach(function(el){el.classList.remove('open')});
  });
  window.cvOpenProjEdit=cvOpenProjEdit;
  window.cvOpenProjNew=cvOpenProjNew;
  window.cvCloseProjEdit=cvCloseProjEdit;
  window.cvSaveProjEdit=cvSaveProjEdit;
  var memberList=$('#cv-pe-members-list');if(memberList)memberList.addEventListener('change',function(){var count=$('#cv-pe-members-count');if(count)count.textContent='项目成员 · '+$$('#cv-pe-members-list input:checked').length;});
}

export { cvRenderProjMenu, cvRenderProjectSettings, cvRenderWsMenu, cvRestoreProjects, cvSetProject, cvSetWorkspace, cvSyncUrl, cvUpdateCounts };
