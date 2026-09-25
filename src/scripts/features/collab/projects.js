import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { setUrlState } from '../../core/view.js';
import { CV_MEMBERS, CV_PROJECTS, CV_WORKSPACES, cvAddPersonToWorkspace, cvCanAccessWorkspace, cvCreateWorkspace, cvCurrentUserName, cvGenProjectCode, cvInProject, cvInjectCardActions, cvPeopleInWorkspace, cvPersistPersons, cvPersistProjects, cvProject, cvProjectById, cvProjectInWorkspace, cvRenderReviewStats, cvRenderReviews, cvRenderTaskStats, cvRenderTasks, cvRestoreProjects, cvWorkspace, cvWorkspaceById, cvWorkspaceName, cvWorkspaceRole, set_cvProject, set_cvWorkspace } from './data.js';
import { cvApplyReviewFilters } from './tasks.js';
import { cvApplyFilters, cvLastTab, cvSwitchView } from './view.js';
import { xesc } from '../expert/data.js';
import { TEAMS } from '../expert/store.js';
import { getRole } from '../login.js';
import { CV_PROJECT_ICON_COLORS, cvProjectFolderIcon, cvProjectIconColor, cvProjectIconOptions } from './project-icons.js';
import { recordConfigAudit, recordProjectConfigAudit } from './audit-log.js';
/* 协作开发：工作区切换、工作台项目筛选与专家团默认绑定
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 工作区切换（顶层组织单元，项目归属工作区） ---------- */
function cvRenderWsMenu(){
  var menu=$('#cvWsOptions'); if(!menu) return;
  var available=CV_WORKSPACES.filter(function(w){return cvCanAccessWorkspace(w.id,cvCurrentUserName());});
  var query=($('#cvWsSearch')?.value||'').trim().toLocaleLowerCase();
  var rows=available.filter(function(w){return !query||w.name.toLocaleLowerCase().includes(query);}).map(function(w){
      var cnt=CV_PROJECTS.filter(function(p){return p.workspace===w.id;}).length;
      return {id:w.id,name:w.name,desc:cnt+' 个项目'+(w.desc?' · '+w.desc:'')};
    });
  var count=$('#cvWsCount');if(count)count.textContent=String(available.length);
  menu.innerHTML=rows.length?rows.map(function(r){
    return '<button type="button" class="cv-ws-menu-item'+(r.id===cvWorkspace?' checked':'')+'" data-cv-ws="'+xesc(r.id)+'">'
      +'<span class="cv-ws-menu-name">'+xesc(r.name)+'</span>'
      +'<small>'+xesc(r.desc)+'</small></button>';
  }).join(''):'<div class="cv-ws-menu-empty">没有匹配的工作区</div>';
}
function cvRenderWorkspaceEntry(){
  var active=!!cvWorkspace&&cvCanAccessWorkspace(cvWorkspace,cvCurrentUserName());
  $('#view-collab')?.classList.toggle('cv-no-workspace',!active);
  $('#cvWorkspaceOnboarding')?.classList.toggle('hidden',active);
  var label=$('#cvWsLabel');if(label)label.textContent=active?cvWorkspaceName(cvWorkspace):'选择工作区';
  cvSyncWorkspacePermissions();
}
function cvSetWorkspace(id){
  var target=cvWorkspaceById(id);
  if(!target)return;
  if(!cvCanAccessWorkspace(id,cvCurrentUserName()))return;
  cvClearWorkbenchTaskFilter();
  if(window.cvResetProjectListState)window.cvResetProjectListState();
  set_cvWorkspace(id);
  cvRenderWorkspaceEntry();
  var sw=$('#cvWsSwitch'); if(sw) sw.classList.add('cv-proj--on');
  var search=$('#cvWsSearch');if(search)search.value='';
  cvRenderWsMenu();
  /* 切工作区后，若当前项目不属于该工作区，重置回「全部项目」 */
  if(cvProject && !cvProjectInWorkspace(cvProject)){
    set_cvProject('');
  }
  cvRenderProjMenu();
  cvSyncWorkspacePermissions();
  if($('#cv-config.active')&&!cvIsWorkspaceAdmin())cvSwitchView('tasks');
  if(window.cvRenderProjectList) window.cvRenderProjectList();
  if(window.cvRenderPermTable)window.cvRenderPermTable();
  cvRenderTaskStats(); cvRenderTasks(); cvInjectCardActions();
  cvRenderReviewStats(); cvRenderReviews();
  cvApplyFilters(); cvApplyReviewFilters();
  document.dispatchEvent(new CustomEvent('cv-workspace-change',{detail:{workspaceId:cvWorkspace}}));
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
  /* 页签不再显示任务数量；保留该接口供旧版任务操作调用。 */
}
function cvSyncUrl(){
  setUrlState('/collab?tab='+cvLastTab+(cvLastTab==='tasks'&&cvProject?'&proj='+cvProject:''));
}
var cvWsBtn=$('#cvWsBtn');
var cvWsMenu=$('#cvWsMenu');

/* 专家团由项目详情维护；任务和运行期只消费项目绑定结果。 */

/* ---------- 项目设置：标题 / 描述 / 优先级 / 负责人 / 代码仓库 / 里程碑 ---------- */
var cvProjEditId='';
var cvSelectedProjectIcon='blue';
/* 项目增改落 localStorage（持久化函数已移入 data.js，这里只留新建项目的色板） */
var CV_PROJ_NEW_DOTS=CV_PROJECT_ICON_COLORS.map(function(color){return color.id;});
function cvSetProjectIcon(value){
  cvSelectedProjectIcon=cvProjectIconColor(value);
  var options=$('#cv-pe-icon-options');
  if(options)options.innerHTML=cvProjectIconOptions(cvSelectedProjectIcon,'data-pe-icon-color');
}
function cvMayEditProject(project){
  if(!project||!cvProjectInWorkspace(project.id))return false;
  var name=cvCurrentUserName();
  return project.owner===name||cvIsWorkspaceAdmin();
}
function cvIsWorkspaceAdmin(){
  var name=cvCurrentUserName();
  var workspace=cvWorkspaceById(cvWorkspace);
  if(name&&workspace?.creatorName===name)return true;
  var person=cvPeopleInWorkspace().find(function(row){return row.name===name;});
  return person?cvWorkspaceRole(person)==='system_admin':!!workspace?.builtin&&getRole()==='owner';
}
function cvSyncWorkspacePermissions(){
  var admin=cvIsWorkspaceAdmin();
  $$('[data-perm="owner"], [data-perm="project-create"]').forEach(function(el){el.style.display=admin?'':'none';});
}
function cvRenderProjectSettings(){
  var el=$('#cv-proj-settings');if(!el)return;
  el.innerHTML='<div class="cfg-table">'
    +'<div class="cfg-table-head cv-proj-head"><span>项目</span><span>优先级</span><span>负责人</span><span>代码仓库</span><span>里程碑</span><span>操作</span></div>'
    +CV_PROJECTS.filter(function(p){return p.workspace===cvWorkspace;}).map(function(p){
      return '<div class="cfg-table-row cv-proj-row">'
        +'<span class="cfg-t-name">'+cvProjectFolderIcon(p.dot)+'<span>'+xesc(p.name)+(p.desc?'<em class="cv-proj-desc">'+xesc(p.desc)+'</em>':'')+'</span></span>'
        +'<span>'+xesc(p.priority||'未设置')+'</span>'
        +'<span>'+xesc(p.owner||'未设置')+'</span>'
        +'<span class="cv-proj-repo" title="'+xesc(p.repo||'')+'">'+(p.repo?xesc(p.repo):'未关联')+'</span>'
        +'<span>'+xesc((p.start||'—')+' ~ '+(p.end||'—'))+'</span>'
        +'<span>'+(cvMayEditProject(p)?'<button type="button" class="act-btn" data-cv-proj-edit="'+p.id+'">设置</button>':'只读')+'</span>'
        +'</div>';
    }).join('')
    +'</div>';
}
function cvOpenProjEdit(id){
  var p=cvProjectById(id);if(!p)return;
  if(!cvMayEditProject(p)){toast('只有管理员或项目负责人可以编辑项目','warning');return;}
  cvProjEditId=id;
  cvSetProjectIcon(p.dot);
  var set=function(k,val){var e=$('#cv-pe-'+k);if(e)e.value=val||'';};
  set('name',p.name);set('desc',p.desc);set('status',p.status||'planned');set('priority',p.priority||'中');set('repo',p.repo);set('start',p.start);set('end',p.end);
  var sel=$('#cv-pe-owner');
  if(sel) sel.innerHTML=cvPeopleInWorkspace().map(function(m){return '<option'+(m.name===(p.owner||'')?' selected':'')+'>'+xesc(m.name)+'</option>';}).join('');
  var tsel=$('#cv-pe-team');
  if(tsel) tsel.innerHTML='<option value="">请选择专家团</option>'+TEAMS.map(function(t){return '<option value="'+xesc(t.id)+'"'+(t.id===p.defaultTeam?' selected':'')+'>'+xesc(t.name)+'</option>';}).join('');
  var more=$('#cv-pe-more');if(more)more.open=false;
  var ov=$('#cv-projedit-overlay');if(ov)ov.style.display='flex';
  var toolbar=$('#cv-project-toolbar');if(toolbar)toolbar.classList.add('hidden');
  var tt=$('#cv-pe-title');if(tt)tt.textContent='编辑项目';
  var ws=$('#cv-pe-workspace');if(ws)ws.textContent=cvWorkspaceName(p.workspace);
  var btn=$('#cv-pe-submit');if(btn)btn.textContent='保存修改';
}
function cvOpenProjNew(){
  if(!cvIsWorkspaceAdmin()){toast('只有管理员可以新建项目','warning');return;}
  cvProjEditId='';
  cvSetProjectIcon(CV_PROJ_NEW_DOTS[CV_PROJECTS.length%CV_PROJ_NEW_DOTS.length]);
  var currentName=cvCurrentUserName();
  var currentPerson=cvPeopleInWorkspace().find(function(m){return m.name===currentName;});
  if(currentName&&!currentPerson){
    currentPerson=CV_MEMBERS.find(function(m){return m.name===currentName;});
    if(!currentPerson){
      currentPerson={id:'p-login-'+Date.now(),name:currentName,email:'',dept:'',workspaceRole:'system_admin',workspaceIds:[cvWorkspace],roles:[],status:'available',source:'登录账号'};
      CV_MEMBERS.push(currentPerson);
      if(!cvPersistPersons()){CV_MEMBERS.pop();toast('无法保存当前登录人员','error');return;}
    }
    if(!cvAddPersonToWorkspace(currentPerson,'system_admin')){toast('无法保存工作区人员关联','error');return;}
  }
  var set=function(k,val){var e=$('#cv-pe-'+k);if(e)e.value=val||'';};
  set('name','');set('desc','');set('status','planned');set('priority','中');set('repo','');set('start','');set('end','');
  var sel=$('#cv-pe-owner');
  if(sel) sel.innerHTML='<option value="" disabled selected>负责人</option>'+cvPeopleInWorkspace().filter(function(m){return m.status!=='disabled';}).map(function(m){return '<option>'+xesc(m.name)+'</option>';}).join('');
  var tsel=$('#cv-pe-team');
  if(tsel) tsel.innerHTML='<option value="">请选择专家团</option>'+TEAMS.map(function(t){return '<option value="'+xesc(t.id)+'">'+xesc(t.name)+'</option>';}).join('');
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
function cvSaveProjEdit(){
  var g=function(k){var e=$('#cv-pe-'+k);return e?e.value.trim():'';};
  var name=g('name');
  if(!name){ toast('请填写项目标题','error'); return; }
  var isNew=!cvProjEditId;
  if(isNew&&!cvIsWorkspaceAdmin()){toast('只有管理员可以新建项目','warning');return;}
  var owner=cvPeopleInWorkspace().find(function(person){return person.name===g('owner')&&person.status!=='disabled';});
  if(!owner){toast('请选择工作区人员作为项目负责人','warning');$('#cv-pe-owner')?.focus();return;}
  var teamId=g('team');
  if(!TEAMS.some(function(t){return t.id===teamId;})){ toast('请选择专家团','error'); $('#cv-pe-team').focus(); return; }
  var repo=g('repo');
  if(!repo){toast('请填写 Git 仓库地址','error');$('#cv-pe-repo').focus();return;}
  if(!$('#cv-pe-repo').checkValidity()){toast('请填写有效的 Git 仓库 URL','error');$('#cv-pe-repo').focus();return;}
  var p=isNew?null:cvProjectById(cvProjEditId);
  if(!isNew&&!cvMayEditProject(p)){toast('只有管理员或项目负责人可以编辑项目','warning');return;}
  if(p&&g('owner')!==p.owner&&!window.confirm('确定将「'+p.name+'」的负责人由「'+(p.owner||'未设置')+'」变更为「'+g('owner')+'」吗？'))return;
  var fields=['name','desc','status','priority','owner','repo','dot','start','end','defaultTeam'];
  var before=p?Object.fromEntries(fields.map(function(field){return [field,p[field]||''];})):null;
  if(p){
    p.name=name;p.desc=g('desc');p.status=g('status');p.priority=g('priority');p.owner=g('owner');p.repo=g('repo');p.dot=cvSelectedProjectIcon;p.start=g('start');p.end=g('end');p.defaultTeam=teamId;
  }else{
    var currentPerson=cvPeopleInWorkspace().find(function(person){return person.name===cvCurrentUserName();});
    if(!currentPerson){toast('未找到当前用户，无法创建项目','error');return;}
    p={id:'proj-'+Date.now(),name:name,desc:g('desc'),status:g('status'),dot:cvSelectedProjectIcon,defaultTeam:teamId,members:Array.from(new Set([currentPerson.id,owner.id])),priority:g('priority'),owner:owner.name,repo:g('repo'),code:cvGenProjectCode({repo:g('repo'),id:'proj-'+Date.now()}),start:g('start'),end:g('end'),workspace:cvWorkspace};
    CV_PROJECTS.push(p);
  }
  cvPersistProjects();
  if(isNew)recordConfigAudit('project','创建项目「'+p.name+'」');
  else recordProjectConfigAudit(p,fields.filter(function(field){return before[field]!==String(p[field]||'');}),before.name);
  cvCloseProjEdit();
  cvRenderProjectSettings();cvRenderProjMenu();
  if(window.cvRenderProjectList) window.cvRenderProjectList();
  if(window.cvRenderProjectDetail) window.cvRenderProjectDetail();
  toast(isNew?'已创建项目：'+name:'已保存项目设置：'+name);
}

export function initCollabProjects() {
  var wsCreateToggle=$('#cvWsCreateToggle'),wsCreateForm=$('#cvWsCreateForm'),wsOnboardingForm=$('#cvWsOnboardingForm');
  function closeWsCreate(){
    if(wsCreateForm)wsCreateForm.classList.add('hidden');
    if(wsCreateToggle)wsCreateToggle.setAttribute('aria-expanded','false');
  }
  if(wsCreateToggle)wsCreateToggle.addEventListener('click',function(event){
    event.stopPropagation();
    var opening=wsCreateForm?.classList.contains('hidden');
    wsCreateForm?.classList.toggle('hidden',!opening);
    wsCreateToggle.setAttribute('aria-expanded',String(opening));
    if(opening){$('#cvWsSwitch')?.classList.remove('open');$('#cvWsCreateName')?.focus();}
  });
  wsCreateForm?.addEventListener('click',function(event){event.stopPropagation();if(event.target.closest('[data-ws-create-cancel]'))closeWsCreate();});
  function createWorkspaceFromForm(event){
    event.preventDefault();
    var form=event.currentTarget;
    var nameInput=form.elements.namedItem('workspaceName'),descInput=form.elements.namedItem('workspaceDesc');
    var name=nameInput.value.trim(),desc=descInput.value.trim();
    if(!name){toast('请填写工作区名称','warning');nameInput.focus();return;}
    if(CV_WORKSPACES.some(function(w){return w.name===name;})){toast('工作区名称已存在','warning');return;}
    var currentName=cvCurrentUserName();
    if(!currentName){toast('请先登录再创建工作区','warning');return;}
    var creator=CV_MEMBERS.find(function(person){return person.name===currentName;});
    var creatorAdded=false;
    if(!creator){
      creator={id:'p-login-'+Date.now(),name:currentName,email:'',dept:'',workspaceRole:'member',workspaceIds:[],roles:[],status:'available',source:'登录账号'};
      CV_MEMBERS.push(creator);
      if(!cvPersistPersons()){CV_MEMBERS.pop();toast('无法保存工作区创建者','error');return;}
      creatorAdded=true;
    }
    var workspace=cvCreateWorkspace(name,desc,creator);
    if(!workspace){
      if(creatorAdded){CV_MEMBERS.pop();cvPersistPersons();}
      toast('浏览器无法保存工作区，请检查存储空间','error');return;
    }
    form.reset();closeWsCreate();
    cvSetWorkspace(workspace.id);
    recordConfigAudit('workspace','创建工作区「'+name+'」');
    cvSwitchView('members');
    toast('已创建并切换到工作区：'+name,'success');
  }
  wsCreateForm?.addEventListener('submit',createWorkspaceFromForm);
  wsOnboardingForm?.addEventListener('submit',createWorkspaceFromForm);
  document.addEventListener('click',function(event){if(wsCreateForm&&!wsCreateForm.classList.contains('hidden')&&!event.target.closest('#cvWsCreateForm, #cvWsCreateToggle'))closeWsCreate();});
  document.addEventListener('keydown',function(event){if(event.key==='Escape')closeWsCreate();});
  var iconOptions=$('#cv-pe-icon-options');
  if(iconOptions)iconOptions.addEventListener('click',function(event){
    var option=event.target.closest('[data-pe-icon-color]');
    if(option){
      cvSetProjectIcon(option.getAttribute('data-pe-icon-color'));
      iconOptions.querySelector('[data-pe-icon-color="'+cvSelectedProjectIcon+'"]')?.focus();
    }
  });
  if(cvWsBtn) cvWsBtn.addEventListener('click',function(e){
    e.stopPropagation();
    var sw=$('#cvWsSwitch'); if(sw) sw.classList.toggle('open');
    cvWsBtn.setAttribute('aria-expanded',String(!!sw?.classList.contains('open')));
    if(sw?.classList.contains('open'))$('#cvWsSearch')?.focus();
  });
  $('#cvWsSearch')?.addEventListener('input',cvRenderWsMenu);
  if(cvWsMenu) cvWsMenu.addEventListener('click',function(e){
    e.stopPropagation();
    var it=e.target.closest('[data-cv-ws]'); if(!it) return;
    $('#cvWsSwitch').classList.remove('open');
    cvWsBtn?.setAttribute('aria-expanded','false');
    cvSetWorkspace(it.getAttribute('data-cv-ws'));
  });
  var projectFilter=$('#tb-project');
  if(projectFilter) projectFilter.addEventListener('change',function(){ cvSetProject(this.value); });
  document.addEventListener('click',function(){
    $$('#view-collab .cv-proj.open').forEach(function(el){el.classList.remove('open')});
    cvWsBtn?.setAttribute('aria-expanded','false');
  });
  window.cvOpenProjEdit=cvOpenProjEdit;
  window.cvOpenProjNew=cvOpenProjNew;
  window.cvCloseProjEdit=cvCloseProjEdit;
  window.cvSaveProjEdit=cvSaveProjEdit;
}

export { cvIsWorkspaceAdmin, cvRenderProjMenu, cvRenderProjectSettings, cvRenderWorkspaceEntry, cvRenderWsMenu, cvRestoreProjects, cvSetProject, cvSetWorkspace, cvSyncUrl, cvSyncWorkspacePermissions, cvUpdateCounts };
