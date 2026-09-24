import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { CV_MEMBERS, CV_PROJECTS, CV_TASKS, cvPeopleInProject, cvPersistProjects, cvProjectById, cvProjectInWorkspace } from './data.js';
import { xesc } from '../expert/data.js';
import { tbSave } from './tb-core.js';
import { renderTaskBoard, tbOpenTask, tbShowBoard } from './task-board.js';
import { cvSetProject, cvUpdateCounts } from './projects.js';
import { cvSwitchView } from './view.js';
import { TEAMS } from '../expert/store.js';
import { getRole } from '../login.js';
/* 项目列表与详情；详情嵌入按项目筛选的任务管理面板，并直接维护项目成员。 */

var cvProjCur='';           /* 项目详情正在看的项目 id，空 = 项目列表 */
var cvProjectListView='list';
var cvModuleView='table', cvModuleFilter='all', cvSummaryCollapsed=false;
var cvProjectTaskBoardPlaceholder=null, cvProjectTaskBoardPriorProject='', cvProjectTaskBoardEmbedded=false;
var cvMembersPageOpen=false;
var CV_PROJECT_INVITES_KEY='lingee_project_invites_v1';
var PJ_STATUS={planned:{c:'#6b7280',bg:'#f3f4f6',t:'规划中'},in_progress:{c:'#ff8d42',bg:'#fff4ed',t:'进行中'},paused:{c:'#6b7280',bg:'#f3f4f6',t:'已暂停'},completed:{c:'#4d89ff',bg:'#eef3ff',t:'已完成'},cancelled:{c:'#e04a3a',bg:'#fdeae8',t:'已取消'}};
var CV_PROJ_DOT_COLORS={blue:'#4d89ff',orange:'#ff8d42',green:'#08cc50'};
/* 兼容旧版 p.features：首次读取时迁移为 ProjectTask(kind=epic)，
   之后 Epic / Task / Subtask 统一存放在 CV_TASKS，并用 parentTaskId 建树。 */
function cvProjectEpics(p){
  var changed=false;
  (p.features||[]).forEach(function(f){
    var epicId=f.projectTaskId||('epic-'+f.id);
    var epic=CV_TASKS.find(function(t){return t.boardId===epicId;});
    if(!epic){
      epic={boardId:epicId,kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-'+String(epicId).slice(-6).toUpperCase(),status:'待规划',title:f.title,desc:f.desc||'',acceptance:f.acceptance||'',files:(f.files||[]).slice(),assignee:p.owner||'待分配',priority:p.priority||'中',project:p.id,progress:0,artifacts:[],activity:[]};
      CV_TASKS.push(epic); changed=true;
    }
    f.projectTaskId=epicId;
    (f.taskIds||[]).forEach(function(tid){ var child=CV_TASKS.find(function(t){return t.boardId===tid;}); if(child&&!child.parentTaskId){child.parentTaskId=epicId; child.kind=child.kind||'task'; changed=true;} });
  });
  if((p.features||[]).length){ delete p.features; changed=true; }
  if(changed){ tbSave(); cvPersistProjects(); }
  return CV_TASKS.filter(function(t){return t.project===p.id&&t.kind==='epic';});
}

/* ---------- 项目列表 ---------- */
function cvRenderProjectList(){
  var el=$('#cv-proj-list'); if(!el) return;
  cvRenderProjectFilters();
  var list=CV_PROJECTS.filter(function(p){return cvProjectInWorkspace(p.id);});
  var cnt=$('#cv-proj-count'); if(cnt) cnt.textContent=list.length;
  var query=(($('#cvProjectSearch')||{}).value||'').trim().toLocaleLowerCase();
  var status=(($('#cvProjectStatusFilter')||{}).value||'');
  var memberId=(($('#cvProjectMemberFilter')||{}).value||'');
  var owner=(($('#cvProjectOwnerFilter')||{}).value||'');
  var visible=list.filter(function(p){return (!query||[p.name,p.desc||''].join(' ').toLocaleLowerCase().includes(query))
    &&(!status||(p.status||'planned')===status)
    &&(!memberId||(p.members||[]).includes(memberId))
    &&(!owner||(p.owner||'')===owner);});
  var switcher=$('#cv-project-view-switch');
  if(switcher) switcher.innerHTML='<button type="button" data-pj-view="cards" class="'+(cvProjectListView==='cards'?'on':'')+'" aria-pressed="'+(cvProjectListView==='cards'?'true':'false')+'">卡片</button><button type="button" data-pj-view="list" class="'+(cvProjectListView==='list'?'on':'')+'" aria-pressed="'+(cvProjectListView==='list'?'true':'false')+'">列表</button>';
  if(!visible.length){ el.innerHTML='<div class="x-empty">'+(list.length?'没有匹配的项目':'当前工作区还没有项目，点右上「新建项目」')+'</div>'; return; }
  var canEdit=getRole()==='owner';
  if(cvProjectListView==='list'){
    el.innerHTML='<div class="pj-projects-list"><div class="pj-list-head"><span>项目</span><span>状态</span><span>优先级</span><span>项目成员</span><span>负责人</span><span>开始时间</span><span>结束时间</span><span>任务进度</span></div>'
      +visible.map(function(p){
        var members=cvPeopleInProject(p);
        var tasks=CV_TASKS.filter(function(t){return t.project===p.id&&t.kind!=='epic';});
        var done=tasks.filter(function(t){return t.status==='已完成';}).length;
        var progress=tasks.length?Math.round(done/tasks.length*100):0;
        var sc=PJ_STATUS[p.status||'planned']||PJ_STATUS.planned;
        var owners=[...new Set(CV_MEMBERS.map(function(m){return m.name;}).concat(p.owner||'').filter(Boolean))];
        return '<div class="pj-list-row" data-pj-row="'+xesc(p.id)+'">'
          +'<button type="button" class="pj-list-name" data-pj-open="'+xesc(p.id)+'" aria-label="查看项目：'+xesc(p.name)+'"><i class="cfg-dot" style="background:'+(CV_PROJ_DOT_COLORS[p.dot]||'#b8b8b8')+'"></i><span><b class="card-title">'+xesc(p.name)+'</b><small>'+xesc(p.desc||'暂无描述')+'</small></span></button>'
          +(canEdit?'<select class="pj-list-edit pj-list-edit--status" data-pj-quick="status" aria-label="'+xesc(p.name)+'的状态" style="color:'+sc.c+';background:'+sc.bg+'">'+Object.keys(PJ_STATUS).map(function(k){return '<option value="'+k+'"'+(k===(p.status||'planned')?' selected':'')+'>'+PJ_STATUS[k].t+'</option>';}).join('')+'</select>':'<span class="pj-status" style="color:'+sc.c+';background:'+sc.bg+'">'+sc.t+'</span>')
          +(canEdit?'<select class="pj-list-edit" data-pj-quick="priority" aria-label="'+xesc(p.name)+'的优先级">'+['高','中','低'].map(function(v){return '<option'+(v===(p.priority||'中')?' selected':'')+'>'+v+'</option>';}).join('')+'</select>':'<span>'+xesc(p.priority||'中')+'</span>')
          +'<span class="pj-list-members" title="'+xesc(members.length?members.map(function(m){return m.name;}).join('、'):'暂无成员')+'"><span class="pj-list-member-avatars">'+members.slice(0,3).map(function(m){return '<span class="pj-list-member-avatar" aria-hidden="true">'+xesc(m.name[0]||'?')+'</span>';}).join('')+'</span><span class="pj-list-member-count">'+members.length+' 人</span></span>'
          +(canEdit?'<select class="pj-list-edit" data-person-select data-pj-quick="owner" aria-label="'+xesc(p.name)+'的负责人"><option value="">未设置</option>'+owners.map(function(name){return '<option'+(name===p.owner?' selected':'')+'>'+xesc(name)+'</option>';}).join('')+'</select>':'<span>'+xesc(p.owner||'未设置')+'</span>')
          +(canEdit?'<input class="pj-list-edit pj-list-edit--date" type="date" data-pj-quick="start" aria-label="'+xesc(p.name)+'的开始时间" value="'+xesc(p.start||'')+'">':'<span>'+xesc(p.start||'—')+'</span>')
          +(canEdit?'<input class="pj-list-edit pj-list-edit--date" type="date" data-pj-quick="end" aria-label="'+xesc(p.name)+'的结束时间" value="'+xesc(p.end||'')+'">':'<span>'+xesc(p.end||'—')+'</span>')
          +'<span class="pj-list-progress" aria-label="任务进度 '+done+' / '+tasks.length+'"><span class="pj-list-progress-track"><i style="width:'+progress+'%"></i></span><small>'+done+' / '+tasks.length+'</small></span></div>';
      }).join('')+'</div>';
    return;
  }
  el.innerHTML='<div class="pj-projects-cards">'+visible.map(function(p){
    var color=CV_PROJ_DOT_COLORS[p.dot]||'#b8b8b8';
    var members=cvPeopleInProject(p);
    var tasks=CV_TASKS.filter(function(t){return t.project===p.id&&t.kind!=='epic';});
    var done=tasks.filter(function(t){return t.status==='已完成';}).length;
    var progress=tasks.length?Math.round(done/tasks.length*100):0;
    var sc=PJ_STATUS[p.status||'planned']||PJ_STATUS.planned;
    var owners=[...new Set(CV_MEMBERS.map(function(m){return m.name;}).concat(p.owner||'').filter(Boolean))];
    return '<div class="pj-card" data-pj-row="'+xesc(p.id)+'">'
      +'<div class="pj-card-main"><div class="pj-card-head"><div class="pj-card-identity"><span class="pj-card-mark" style="background:'+color+'"></span><button type="button" class="pj-card-title-button" data-pj-open="'+xesc(p.id)+'" aria-label="查看项目：'+xesc(p.name)+'" title="'+xesc(p.name)+'">'+xesc(p.name)+'</button></div>'
      +'<div class="pj-card-actions">'+(canEdit?'<select class="pj-list-edit pj-list-edit--status pj-card-status" data-pj-quick="status" aria-label="'+xesc(p.name)+'的状态" style="color:'+sc.c+';background:'+sc.bg+'">'+Object.keys(PJ_STATUS).map(function(k){return '<option value="'+k+'"'+(k===(p.status||'planned')?' selected':'')+'>'+PJ_STATUS[k].t+'</option>';}).join('')+'</select>':'<span class="pj-status" style="color:'+sc.c+';background:'+sc.bg+'">'+sc.t+'</span>')+'</div></div>'
      +'<div class="pj-card-fields">'
      +'<label class="pj-card-field"><span>优先级</span>'+(canEdit?'<select class="pj-list-edit" data-pj-quick="priority" aria-label="'+xesc(p.name)+'的优先级">'+['高','中','低'].map(function(v){return '<option'+(v===(p.priority||'中')?' selected':'')+'>'+v+'</option>';}).join('')+'</select>':'<b>'+xesc(p.priority||'中')+'</b>')+'</label>'
      +'<label class="pj-card-field"><span>负责人</span>'+(canEdit?'<select class="pj-list-edit" data-person-select data-pj-quick="owner" aria-label="'+xesc(p.name)+'的负责人"><option value="">未设置</option>'+owners.map(function(name){return '<option'+(name===p.owner?' selected':'')+'>'+xesc(name)+'</option>';}).join('')+'</select>':'<b>'+xesc(p.owner||'未设置')+'</b>')+'</label>'
      +'</div></div>'
      +'<div class="pj-card-bottom"><span class="pj-card-members" title="'+xesc(members.length?members.map(function(m){return m.name;}).join('、'):'暂无成员')+'"><span class="pj-list-member-avatars">'+members.slice(0,3).map(function(m){return '<span class="pj-list-member-avatar" aria-hidden="true">'+xesc(m.name[0]||'?')+'</span>';}).join('')+'</span><span class="pj-list-member-count">'+members.length+' 人</span></span><span class="pj-card-progress">'+(tasks.length?'<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" class="pj-card-ring-base"/><circle cx="8" cy="8" r="6" class="pj-card-ring-value" stroke-dasharray="'+(progress*0.377)+' 37.7"/></svg><span>'+done+' / '+tasks.length+'</span>':'暂无任务')+'</span></div>'
      +'</div>';
  }).join('')+'</div>';
}

function cvRenderProjectFilters(){
  var memberSel=$('#cvProjectMemberFilter');
  if(memberSel){
    var memberValue=memberSel.value;
    memberSel.innerHTML='<option value="">全部成员</option>'+CV_MEMBERS.map(function(m){return '<option value="'+xesc(m.id)+'">'+xesc(m.name)+'</option>';}).join('');
    memberSel.value=memberValue;
  }
  var ownerSel=$('#cvProjectOwnerFilter');
  if(ownerSel){
    var ownerValue=ownerSel.value;
    var owners=[]; CV_PROJECTS.forEach(function(p){if(p.owner&&owners.indexOf(p.owner)<0) owners.push(p.owner);});
    ownerSel.innerHTML='<option value="">全部负责人</option>'+owners.sort().map(function(name){return '<option value="'+xesc(name)+'">'+xesc(name)+'</option>';}).join('');
    ownerSel.value=ownerValue;
  }
}

/* ---------- 项目详情：左基本信息 + 右成员/项目指引/关联任务 ---------- */
function cvRenderProjectDetail(){
  var el=$('#cv-proj-detail'); if(!el) return;
  var p=cvProjectById(cvProjCur);
  if(!p){ el.innerHTML=''; return; }
  var membersScroll=el.querySelector('.pj-members-page')?.scrollTop||0;
  var embeddedTaskBoard=cvProjectTaskBoardEmbedded?$('#cv-tasks'):null;
  var members=cvPeopleInProject(p);
  var memberSections=cvRenderProjectInvite(cvProjCur);
  var tasks=CV_TASKS.filter(function(t){return t.project===cvProjCur&&t.kind!=='epic';});
  var projectProgress=tasks.length?Math.round(tasks.reduce(function(sum,t){return sum+(t.status==='已完成'?100:(t.progress||0));},0)/tasks.length):0;
  var doneCnt=tasks.filter(function(t){return t.status==='已完成';}).length;
  el.innerHTML='<div class="pj-crumb">'
    +'<button type="button" class="pj-back" data-pj-back>项目</button>'
    +'<span class="pj-crumb-sep">›</span>'
    +'<span class="pj-dot pj-dot--sm" style="background:'+(CV_PROJ_DOT_COLORS[p.dot]||'#b8b8b8')+'"></span>'
    +'<span class="pj-crumb-name">'+xesc(p.name)+'</span>'
    +'<div class="pj-crumb-actions"><button type="button" class="pj-members-open" data-pj-members-open aria-controls="pj-members-page"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>成员管理 <span>'+members.length+'</span></button>'
    +'<button type="button" class="pj-summary-toggle" data-pj-summary-toggle aria-controls="pj-project-summary" aria-expanded="'+!cvSummaryCollapsed+'" aria-label="'+(cvSummaryCollapsed?'展开':'收起')+'右侧项目摘要面板" title="'+(cvSummaryCollapsed?'展开':'收起')+'右侧项目摘要面板"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M14 4v16M7 8h3M7 12h3M7 16h3"/></svg></button></div>'
    +'</div>'
    +'<div class="sq-layout sq-layout--detail'+(cvSummaryCollapsed?' is-summary-collapsed':'')+'">'
    +'<section class="sq-main"></section>'
    +'<aside id="pj-project-summary" class="sq-side sq-side--right">'
    +'<div class="pj-side-pane pj-side-pane--properties">'
    +'<label class="pj-detail-name-label">项目名称 <span class="pe-required-mark" aria-hidden="true">*</span><input class="sq-edit-name" data-pj-field="name" value="'+xesc(p.name)+'" placeholder="项目名称" required></label>'
    +'<div class="pj-prop-section">'
    +'<div class="pj-prop-header">属性</div>'
    +'<div class="pj-prop-body">'
    +'<div class="pj-prop-row"><span class="pj-prop-label">状态</span><div class="pj-prop-value"><select class="sq-edit-select" data-pj-field="status">'+Object.keys(PJ_STATUS).map(function(k){return '<option value="'+k+'"'+(k===(p.status||'planned')?' selected':'')+'>'+PJ_STATUS[k].t+'</option>';}).join('')+'</select></div></div>'
    +'<div class="pj-prop-row"><span class="pj-prop-label">优先级</span><div class="pj-prop-value"><select class="sq-edit-select" data-pj-field="priority">'+['高','中','低'].map(function(v){return '<option'+(v===(p.priority||'中')?' selected':'')+'>'+v+'</option>';}).join('')+'</select></div></div>'
    +'<div class="pj-prop-row"><span class="pj-prop-label">负责人</span><div class="pj-prop-value"><select class="sq-edit-select" data-person-select data-pj-field="owner" aria-label="项目负责人">'+CV_MEMBERS.map(function(m){return '<option'+(m.name===(p.owner||'')?' selected':'')+'>'+xesc(m.name)+'</option>';}).join('')+'</select></div></div>'
    +'<div class="pj-prop-row"><span class="pj-prop-label">开始时间</span><div class="pj-prop-value"><input type="date" class="sq-edit-date-field" data-pj-field="start" value="'+xesc(p.start||'')+'"></div></div>'
    +'<div class="pj-prop-row"><span class="pj-prop-label">结束时间</span><div class="pj-prop-value"><input type="date" class="sq-edit-date-field" data-pj-field="end" value="'+xesc(p.end||'')+'"></div></div>'
    +'<div class="pj-prop-row"><span class="pj-prop-label">代码仓库</span><div class="pj-prop-value"><input class="sq-edit-input" data-pj-field="repo" value="'+xesc(p.repo||'')+'" placeholder="仓库 URL"></div></div>'
    +'<div class="pj-prop-row"><span class="pj-prop-label">专家团 <span class="pe-required-mark" aria-hidden="true">*</span></span><div class="pj-prop-value"><select class="sq-edit-select" data-pj-field="defaultTeam" aria-label="专家团（必填）" required><option value="">请选择专家团</option>'+TEAMS.map(function(t){return '<option value="'+xesc(t.id)+'"'+(t.id===p.defaultTeam?' selected':'')+'>'+xesc(t.name)+'</option>';}).join('')+'</select></div></div>'
    +'</div></div>'
    +'<div class="pj-prop-section">'
    +'<div class="pj-prop-header">进度</div>'
    +'<div class="pj-prop-body">'
    +'<div class="pj-prop-row"><span class="pj-prop-label">项目成员</span><b class="pj-prop-num">'+members.length+'</b></div>'
    +'<div class="pj-prop-row"><span class="pj-prop-label">任务</span><b class="pj-prop-num">'+tasks.length+'</b></div>'
    +(tasks.length?'<div class="pj-prop-row"><span class="pj-prop-label">进度</span><div class="pj-prop-value"><div class="pj-progress-bar"><div style="width:'+projectProgress+'%"></div></div><span class="pj-progress-text">'+doneCnt+' / '+tasks.length+'</span></div></div>':'')
    +'</div></div>'
    +'<div class="pj-prop-section">'
    +'<div class="pj-prop-header">描述</div>'
    +'<div class="pj-prop-body">'
    +'<label class="pj-side-field-label" for="pj-side-desc">项目描述</label><textarea id="pj-side-desc" class="sq-edit-desc" data-pj-field="desc" rows="2" placeholder="添加描述">'+xesc(p.desc||'')+'</textarea>'
    +'<label class="pj-side-field-label" for="pj-side-goal">项目目标</label><textarea id="pj-side-goal" class="sq-edit-goal" data-pj-field="goal" rows="2" placeholder="项目目标">'+xesc(p.goal||'')+'</textarea>'
    +'</div></div>'
    +'</div>'
    +'</aside>'
    +'</div>'
    +'<section id="pj-members-page" class="pj-members-page'+(cvMembersPageOpen?'':' hidden')+'" aria-labelledby="pj-members-page-title">'
    +'<div class="pj-members-page-inner">'
    +'<nav class="pj-members-breadcrumb" aria-label="成员管理位置"><button type="button" data-pj-members-close>项目</button><span>›</span><button type="button" data-pj-members-close>'+xesc(p.name)+'</button><span>›</span><span>成员</span></nav>'
    +'<h1 id="pj-members-page-title">成员</h1>'
    +'<section class="pj-members-section"><h2>成员（'+members.length+'）</h2>'+memberSections.form+cvRenderProjectMemberRows(p,members)+'</section>'
    +memberSections.pending+memberSections.share
    +'</div></section>';
  if(embeddedTaskBoard){
    var main=el.querySelector('.sq-main');
    if(main){ main.appendChild(embeddedTaskBoard); embeddedTaskBoard.classList.add('active','pj-embedded-task-board'); renderTaskBoard(); }
  }
  if(cvMembersPageOpen){var memberPage=el.querySelector('.pj-members-page');if(memberPage)memberPage.scrollTop=membersScroll;}
}
function cvMountProjectTaskBoard(){
  var board=$('#cv-tasks'), detail=$('#cv-proj-detail'), main=detail&&detail.querySelector('.sq-main');
  if(!board||!main)return;
  if(!cvProjectTaskBoardEmbedded){
    cvProjectTaskBoardPriorProject=$('#tb-project')?.value||'';
    cvProjectTaskBoardPlaceholder=document.createComment('project-task-board-home');
    board.parentNode.insertBefore(cvProjectTaskBoardPlaceholder,board);
    cvProjectTaskBoardEmbedded=true;
  }
  main.appendChild(board);
  board.classList.add('active','pj-embedded-task-board');
  cvSetProject(cvProjCur);
  renderTaskBoard();
}
function cvRestoreProjectTaskBoard(){
  if(!cvProjectTaskBoardEmbedded)return;
  var board=$('#cv-tasks');
  if(board){
    board.classList.remove('active','pj-embedded-task-board');
    if(cvProjectTaskBoardPlaceholder&&cvProjectTaskBoardPlaceholder.parentNode)cvProjectTaskBoardPlaceholder.parentNode.insertBefore(board,cvProjectTaskBoardPlaceholder);
  }
  if(cvProjectTaskBoardPlaceholder&&cvProjectTaskBoardPlaceholder.parentNode)cvProjectTaskBoardPlaceholder.remove();
  cvProjectTaskBoardPlaceholder=null;
  cvProjectTaskBoardEmbedded=false;
  cvSetProject(cvProjectTaskBoardPriorProject);
  cvProjectTaskBoardPriorProject='';
}

/* ---------- 项目规划：智能拆解 ----------
   project 模式规划项目任务；epic 模式把单个任务拆成可执行子任务。 */
var cvSplitItems=[];
var cvSplitMode='project';   /* 'project' | 'epic' */
var cvSplitEpicId='';
function cvSplitCandidates(p){
  var base=p.desc||p.name;
  return [
    {title:'核心业务',desc:'围绕「'+base+'」的核心业务场景、单据与主流程'},
    {title:'审批与流程',desc:'审批链、条件流转与异常节点处理'},
    {title:'查询与报表',desc:'列表查询、条件筛选与统计报表'},
    {title:'系统集成',desc:'与外部系统的接口对接与数据同步'},
    {title:'权限与安全',desc:'角色分级、数据权限与操作审计'}
  ];
}
function cvEpicSplitCandidates(f){
  var base=f.title;
  return [
    {title:base+' · 需求确认与设计',desc:'明确「'+base+'」的具体交互、数据结构与依赖，输出可执行的实现方案',acceptance:'关键页面与接口设计通过评审'},
    {title:base+' · 功能实现',desc:f.desc||('实现「'+base+'」的核心功能'),acceptance:'功能按方案跑通，主流程无阻断缺陷'},
    {title:base+' · 联调与验收',desc:'完成「'+base+'」与关联模块的联调，并对照验收标准自测',acceptance:'验收标准逐条通过，具备交付条件'}
  ];
}
function cvSplitHeadEls(){
  return {agent:document.getElementById('cv-split-agent'),confirm:document.getElementById('cv-split-confirm-btn')};
}
function cvOpenProjectSplit(){
  var p=cvProjectById(cvProjCur); if(!p) return;
  cvSplitMode='project'; cvSplitEpicId='';
  cvSplitItems=cvSplitCandidates(p);
  var head=cvSplitHeadEls();
  if(head.agent) head.agent.textContent='产品经理 · 任务规划';
  if(head.confirm) head.confirm.textContent='确认生成任务';
  var body=document.getElementById('cv-split-body'); if(!body) return;
  body.innerHTML='<div class="split-msg split-msg--user">基于项目目标「'+xesc(p.goal||p.name)+'」规划任务</div>'
    +'<div class="split-msg split-msg--agent" id="cv-split-agent-msg"><div class="split-thinking"><i></i><i></i><i></i></div><span class="split-thinking-t">正在思考…</span></div>';
  var ov=document.getElementById('cv-splittask-overlay'); if(ov) ov.style.display='flex';
  setTimeout(cvRenderSplitResult, 900);
}
function cvOpenEpicSplit(fid){
  var f=cvCurFeature(fid); if(!f) return;
  cvSplitMode='epic'; cvSplitEpicId=fid;
  cvSplitItems=cvEpicSplitCandidates(f);
  var head=cvSplitHeadEls();
  if(head.agent) head.agent.textContent='产品经理 · 任务拆解';
  if(head.confirm) head.confirm.textContent='确认生成任务';
  var body=document.getElementById('cv-split-body'); if(!body) return;
  body.innerHTML='<div class="split-msg split-msg--user">基于任务「'+xesc(f.title)+'」拆解可执行任务</div>'
    +'<div class="split-msg split-msg--agent" id="cv-split-agent-msg"><div class="split-thinking"><i></i><i></i><i></i></div><span class="split-thinking-t">正在思考…</span></div>';
  var ov=document.getElementById('cv-splittask-overlay'); if(ov) ov.style.display='flex';
  setTimeout(cvRenderSplitResult, 900);
}
function cvRenderSplitResult(){
  var msg=document.getElementById('cv-split-agent-msg'); if(!msg) return;
  var noun=cvSplitMode==='epic'?'子任务':'任务';
  msg.innerHTML='<div class="split-agent-t">已拆解出 '+cvSplitItems.length+' 个'+noun+'，请逐项确认（不需要的取消勾选）：</div>'
    +'<div class="split-list">'+cvSplitItems.map(function(t,i){
      return '<label class="split-item"><input type="checkbox" checked data-split-idx="'+i+'">'
        +'<span class="split-item-body"><span class="split-item-title">'+xesc(t.title)+'</span><span class="split-item-desc">'+xesc(t.desc)+'</span></span></label>';
    }).join('')+'</div>';
  cvUpdateSplitCount();
}
function cvUpdateSplitCount(){
  var n=document.querySelectorAll('#cv-split-body input[data-split-idx]:checked').length;
  var c=document.getElementById('cv-split-count'); if(c) c.textContent=n;
}
function cvCloseProjectSplit(){ var ov=document.getElementById('cv-splittask-overlay'); if(ov) ov.style.display='none'; }
function cvConfirmProjectSplit(){
  var p=cvProjectById(cvProjCur); if(!p) return;
  var checked=document.querySelectorAll('#cv-split-body input[data-split-idx]:checked');
  var noun=cvSplitMode==='epic'?'子任务':'任务';
  if(!checked.length){ toast('请至少确认一个'+noun,'warning'); return; }
  var n=0;
  if(cvSplitMode==='epic'){
    var f=cvCurFeature(cvSplitEpicId);
    if(!f){ cvCloseProjectSplit(); return; }
    checked.forEach(function(cb){
      var t=cvSplitItems[+cb.getAttribute('data-split-idx')]; if(!t) return;
      var boardId=crypto.randomUUID();
      CV_TASKS.unshift({boardId:boardId,kind:'task',parentTaskId:f.boardId,type:'需求',size:'小',source:'智能拆解',sourceId:'TASK-'+Date.now().toString().slice(-6)+'-'+(n+1),exec:'专家团',status:'待办',collab:'人Agent协作',mode:'多人协作',priority:p.priority||'中',title:t.title,desc:t.desc,acceptance:t.acceptance||'',assignee:'待分配',progress:0,project:p.id,files:[],artifacts:[],activity:[{author:'系统',text:'由任务「'+f.title+'」智能拆解生成子任务'}],tags:[]});
      n++;
    });
  }else{
    checked.forEach(function(cb){
      var t=cvSplitItems[+cb.getAttribute('data-split-idx')]; if(!t) return;
      var id='epic-'+Date.now().toString(36)+'-'+n;
      CV_TASKS.push({boardId:id,kind:'epic',parentTaskId:null,type:'特性',source:'智能规划',sourceId:'FEAT-'+Date.now().toString().slice(-6)+'-'+(n+1),status:'待规划',title:t.title,desc:t.desc,files:[],assignee:p.owner||'待分配',priority:p.priority||'中',project:p.id,progress:0,artifacts:[],activity:[{author:'系统',text:'由项目目标智能规划生成任务'}]});
      n++;
    });
  }
  tbSave();
  cvCloseProjectSplit();
  cvRenderProjectDetail();
  if(cvSplitMode==='epic'){ renderTaskBoard(); cvUpdateCounts(); }
  toast('已生成 '+n+' 个'+noun,'success');
}

/* ---------- ProjectTask 树展示 + 操作 ---------- */
function cvTaskRowHtml(t){
  var sc={'待规划':'pending','待办':'pending','进行中':'running','审核中':'review','已完成':'done','已阻塞':'fail','已取消':'fail'}[t.status]||'pending';
  return '<button type="button" class="pj-task" data-pj-task="'+xesc(t.boardId)+'" title="查看任务详情">'
    +'<span class="badge-status badge-status--'+sc+'"><span class="badge-status-dot"></span>'+t.status+'</span>'
    +'<span class="pj-task-title">'+xesc(t.title)+'</span>'
    +'<span class="pj-task-meta">'+xesc(t.assignee)+' · '+xesc(t.type)+' · '+xesc(t.sourceId)+'</span>'
    +'</button>';
}
var cvCollapsedEpics={};
function cvModuleTasksCollapsed(id){
  return cvCollapsedEpics[id]===undefined?true:cvCollapsedEpics[id];
}
function cvModuleTasksHtml(f){
  var children=CV_TASKS.filter(function(t){return t.parentTaskId===f.boardId&&t.kind!=='epic';});
  if(cvModuleTasksCollapsed(f.boardId)) return '';
  return '<div class="pj-module-children">'+(children.length?children.map(cvTaskRowHtml).join(''):'<div class="pj-module-children-empty">该任务下暂无子任务</div>')+'</div>';
}
function cvModuleMetrics(f){
  var children=CV_TASKS.filter(function(t){return t.parentTaskId===f.boardId&&t.kind!=='epic';});
  var done=children.filter(function(t){return t.status==='已完成';}).length;
  var active=children.some(function(t){return ['进行中','审核中','已阻塞'].includes(t.status);});
  return {total:children.length,done:done,progress:children.length?Math.round(done/children.length*100):0,state:children.length&&done===children.length?'done':done||active?'doing':'todo'};
}
function cvRenderModuleResults(epics){
  var el=document.getElementById('pj-module-results'); if(!el) return;
  var list=epics.filter(function(f){
    return cvModuleFilter==='all'||cvModuleMetrics(f).state===cvModuleFilter;
  });
  var ungrouped=CV_TASKS.filter(function(t){return t.project===cvProjCur&&t.kind!=='epic'&&!t.parentTaskId;});
  var ungroupedHtml=cvModuleFilter==='all'&&ungrouped.length
    ?'<section class="pj-ungrouped"><div class="pj-ungrouped-head"><strong>未关联任务</strong><span>'+ungrouped.length+' 个任务</span></div><div class="pj-ungrouped-list">'+ungrouped.map(cvTaskRowHtml).join('')+'</div></section>'
    :'';
  if(!list.length){el.innerHTML='<div class="pj-module-empty">'+(epics.length?'没有符合进度筛选的任务。':'还没有任务，可按需创建。')+'</div>'+ungroupedHtml;return;}
  if(cvModuleView==='list'){el.innerHTML=cvFeaturesHtml(list)+ungroupedHtml;return;}
  el.innerHTML='<div class="pj-module-table" role="table" aria-label="任务列表"><div class="pj-module-tr pj-module-th" role="row"><span role="columnheader">任务</span><span role="columnheader">子任务</span><span role="columnheader">进度</span><span role="columnheader">操作</span></div>'
    +list.map(function(f){var m=cvModuleMetrics(f);var id=xesc(f.boardId);return '<div class="pj-module-tr" role="row"><div class="pj-module-name" role="cell"><button type="button" class="pj-module-open" data-ft-tasks-toggle="'+id+'" aria-expanded="'+!cvModuleTasksCollapsed(f.boardId)+'" aria-label="查看'+xesc(f.title)+'下的子任务"><b>'+xesc(f.title)+'</b><small>'+xesc(f.desc||'暂无描述')+'</small></button></div><span role="cell"><button type="button" class="pj-module-count" data-ft-tasks-toggle="'+id+'" aria-expanded="'+!cvModuleTasksCollapsed(f.boardId)+'">'+m.total+' 个子任务 · '+m.done+' 已完成 '+(cvModuleTasksCollapsed(f.boardId)?'▸':'▾')+'</button></span><span class="pj-module-progress" role="cell"><i><em style="width:'+m.progress+'%"></em></i>'+m.progress+'%</span><span class="pj-module-actions" role="cell"><button type="button" data-ft-split="'+id+'" title="智能拆解">✧</button><button type="button" data-ft-push="'+id+'" title="新增任务">＋</button><button type="button" data-ft-edit="'+id+'" title="编辑任务">✎</button><button type="button" data-ft-del="'+id+'" title="删除任务">×</button></span></div>'+cvModuleTasksHtml(f);}).join('')+'</div>'+ungroupedHtml;
}
function cvFeaturesHtml(epics){
  if(!epics||!epics.length) return '';
  return '<div class="ft-list">'+epics.map(function(f){
    var children=CV_TASKS.filter(function(t){return t.parentTaskId===f.boardId;});
    var doneCnt=children.filter(function(t){return t.status==='已完成';}).length;
    var prog=children.length?Math.round(doneCnt/children.length*100):0;
    return '<div class="ft-item ft-item--row">'
      +'<div class="ft-item-main"><button type="button" class="ft-item-open" data-ft-tasks-toggle="'+xesc(f.boardId)+'" aria-expanded="'+!cvModuleTasksCollapsed(f.boardId)+'" aria-label="查看'+xesc(f.title)+'下的子任务"><b>'+xesc(f.title)+'</b>'
      +(f.desc?'<small>'+xesc(f.desc)+'</small>':'')+'</button>'
      +'<button type="button" class="ft-item-meta ft-item-task-toggle" data-ft-tasks-toggle="'+xesc(f.boardId)+'" aria-expanded="'+!cvModuleTasksCollapsed(f.boardId)+'">'+children.length+' 个子任务 · '+doneCnt+' 已完成 · '+prog+'% '+(cvModuleTasksCollapsed(f.boardId)?'▸':'▾')+'</button></div>'
      +'<div class="ft-item-acts">'
      +'<button type="button" class="ft-act ft-act--split" data-ft-split="'+f.boardId+'" title="智能拆解"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg></button>'
      +'<button type="button" class="ft-act ft-act--push" data-ft-push="'+f.boardId+'" title="新增任务"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>'
      +'<button type="button" class="ft-act" data-ft-edit="'+f.boardId+'" title="编辑"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>'
      +'<button type="button" class="ft-act ft-act--del" data-ft-del="'+f.boardId+'" title="删除"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>'
      +'</div>'+cvModuleTasksHtml(f)
      +'</div>';
  }).join('')+'</div>';
}
function cvCurFeature(fid){
  return CV_TASKS.find(function(t){return t.boardId===fid&&t.project===cvProjCur&&t.kind==='epic';})||null;
}

/* ---------- 人工规划：每次创建一个 Epic ---------- */
function cvOpenManualSplit(){
  var p=cvProjectById(cvProjCur); if(!p) return;
  document.getElementById('cv-ms-title').value='';
  document.getElementById('cv-ms-desc').value='';
  var ov=document.getElementById('cv-manualsplit-overlay'); if(ov) ov.style.display='flex';
}
function cvCloseManualSplit(){ var ov=document.getElementById('cv-manualsplit-overlay'); if(ov) ov.style.display='none'; }
function cvConfirmManualSplit(){
  var p=cvProjectById(cvProjCur); if(!p) return;
  var title=(document.getElementById('cv-ms-title').value||'').trim();
  if(!title){ toast('请填写任务名称','warning'); return; }
  CV_TASKS.push({boardId:'epic-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,5),kind:'epic',parentTaskId:null,type:'特性',source:'人工规划',sourceId:'FEAT-'+Date.now().toString().slice(-6),status:'待规划',title:title,desc:(document.getElementById('cv-ms-desc').value||'').trim(),files:[],assignee:p.owner||'待分配',priority:p.priority||'中',project:p.id,progress:0,artifacts:[],activity:[{author:'当前用户',text:'手动创建任务'}]});
  tbSave();
  cvCloseManualSplit();
  cvModuleFilter='all';
  cvRenderProjectDetail();
  toast('已创建任务：'+title,'success');
}

/* ---------- 任务编辑 / 删除 / 创建任务 ---------- */
var cvFeatureEditId='';
function cvOpenFeatureEdit(fid){
  var f=cvCurFeature(fid); if(!f) return;
  cvFeatureEditId=fid;
  document.getElementById('cv-fe-title').value=f.title||'';
  document.getElementById('cv-fe-desc').value=f.desc||'';
  var ov=document.getElementById('cv-featureedit-overlay'); if(ov) ov.style.display='flex';
}
function cvCloseFeatureEdit(){ var ov=document.getElementById('cv-featureedit-overlay'); if(ov) ov.style.display='none'; }
function cvSaveFeatureEdit(){
  var f=cvCurFeature(cvFeatureEditId); if(!f) return;
  var title=(document.getElementById('cv-fe-title').value||'').trim();
  if(!title){ toast('请填写任务名称','warning'); return; }
  f.title=title;
  f.desc=(document.getElementById('cv-fe-desc').value||'').trim();
  tbSave();
  cvCloseFeatureEdit();
  cvRenderProjectDetail();
  toast('已保存任务：'+title,'success');
}
function cvDeleteFeature(fid){
  var p=cvProjectById(cvProjCur); if(!p) return;
  var f=cvCurFeature(fid); if(!f) return;
  var children=CV_TASKS.filter(function(t){return t.parentTaskId===fid;});
  if(!window.confirm('删除任务「'+f.title+'」？其 '+children.length+' 个子任务会保留为独立任务。')) return;
  children.forEach(function(t){t.parentTaskId=null;});
  CV_TASKS.splice(CV_TASKS.indexOf(f),1);
  tbSave();
  cvRenderProjectDetail();
  toast('已删除任务：'+f.title,'info');
}
/* 从任务创建任务：复用任务管理的「新建任务」弹窗；复杂拆解交给 cvOpenEpicSplit。 */
function cvPushFeatureToTask(fid){
  var p=cvProjectById(cvProjCur); if(!p) return;
  var f=cvCurFeature(fid); if(!f) return;
  window.cvOpenNewTask && window.cvOpenNewTask('待办',{parentTaskId:f.boardId,projectId:p.id,parentTitle:f.title});
}
/* 关联查看：从项目管理跳到任务详情 */
function cvOpenTaskById(taskId){
  var task=CV_TASKS.find(function(t){ return t.boardId===taskId&&t.kind!=='epic'; });
  if(!task||!tbShowBoard()) return;
  cvSetProject(task.project);
  cvSwitchView('tasks');
  tbOpenTask(CV_TASKS.indexOf(task));
}
function cvOpenProjectDetail(id){
  cvProjCur=id;
  cvMembersPageOpen=false;
  cvModuleFilter='all';cvModuleView='table';
  var list=$('#cv-proj-list'),detail=$('#cv-proj-detail');
  var head=$('#cv-project-head'),toolbar=$('#cv-project-toolbar');
  if(head) head.classList.add('hidden');
  if(toolbar) toolbar.classList.add('hidden');
  if(list) list.classList.add('hidden');
  if(detail){ detail.classList.remove('hidden'); cvRenderProjectDetail(); cvMountProjectTaskBoard(); }
}
function cvHideProjectDetail(){
  cvRestoreProjectTaskBoard();
  cvProjCur='';
  cvMembersPageOpen=false;
  var list=$('#cv-proj-list'),detail=$('#cv-proj-detail');
  var head=$('#cv-project-head'),toolbar=$('#cv-project-toolbar');
  if(detail) detail.classList.add('hidden');
  if(head) head.classList.remove('hidden');
  if(toolbar && $('#cv-projedit-overlay')?.style.display!=='flex') toolbar.classList.remove('hidden');
  if(list){ list.classList.remove('hidden'); cvRenderProjectList(); }
}

function cvReadProjectInvites(){
  try{var rows=JSON.parse(localStorage.getItem(CV_PROJECT_INVITES_KEY)||'[]');return Array.isArray(rows)?rows:[];}catch(e){return [];}
}
function cvWriteProjectInvites(records){
  try{localStorage.setItem(CV_PROJECT_INVITES_KEY,JSON.stringify(records));return true;}
  catch(e){toast('无法保存邀请记录，请检查浏览器存储空间','error');return false;}
}
function cvProjectInviteUrl(invite){
  var url=new URL(window.location.href);
  url.searchParams.set('projectInvite',invite.token);
  return url.toString();
}
function cvProjectInviteRole(role){return ({owner:'所有者',admin:'管理员',member:'成员'})[role]||'成员';}
function cvProjectInviteDate(timestamp){return new Date(timestamp).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});}
function cvProjectInviteContact(value){
  var input=String(value||'').trim();
  if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input))return {type:'email',value:input.toLowerCase()};
  var phone=input.replace(/[\s-]/g,'').replace(/^\+?86(?=1[3-9]\d{9}$)/,'');
  return /^1[3-9]\d{9}$/.test(phone)?{type:'phone',value:phone}:null;
}
function cvRenderProjectInvite(projectId){
  var invites=cvReadProjectInvites().filter(function(row){return row.projectId===projectId&&row.expiresAt>Date.now();}).sort(function(a,b){return b.createdAt-a.createdAt;});
  var links=invites.filter(function(row){return row.type==='link'||!row.type;}).slice(0,1);
  var contacts=invites.filter(function(row){return row.type==='email'||row.type==='phone';});
  return {
    form:'<div class="pj-invite-form"><div class="pj-invite-title"><span aria-hidden="true">＋</span><strong>邀请成员</strong></div><div class="pj-invite-fields"><input type="text" data-pj-invite-contact placeholder="手机号或邮箱" aria-label="受邀成员手机号或邮箱" autocomplete="off"><span class="pj-role-pill">成员</span><button type="button" data-pj-invite-contact-send disabled>邀请</button></div></div>',
    pending:contacts.length?'<section class="pj-members-section pj-pending-section"><h2>待处理邀请（'+contacts.length+'）</h2><div class="pj-pending-list">'+contacts.map(function(invite){var contact=invite.phone||invite.email||'';return '<div class="pj-email-invite"><span class="pj-email-icon" aria-hidden="true">'+(invite.type==='phone'?'☎':'✉')+'</span><span class="pj-email-invite-info"><strong>'+xesc(contact)+'</strong><small>◷ 待处理 · 到期 '+xesc(cvProjectInviteDate(invite.expiresAt))+'</small></span><button type="button" data-pj-share-revoke="'+xesc(invite.token)+'" aria-label="撤销对 '+xesc(contact)+' 的邀请">×</button><span class="pj-role-pill">'+xesc(cvProjectInviteRole(invite.role))+'</span></div>';}).join('')+'</div></section>':'',
    share:'<section class="pj-members-section pj-share-section"><h2>分享链接</h2><div class="pj-share-create"><div class="pj-share-create-title"><span aria-hidden="true">↗</span><strong>创建分享链接</strong></div><div class="pj-share-create-fields"><span>角色：<b class="pj-role-pill">成员</b></span><span>有效期：<b class="pj-share-expiry">7 天</b></span><button type="button" data-pj-share-create>'+(links.length?'更新':'生成')+'</button></div></div>'
      +(links.length?'<div class="pj-share-list">'+links.map(function(invite){return '<article class="pj-share-link"><span class="pj-share-link-icon" aria-hidden="true">↗</span><div class="pj-share-link-main"><strong>已用 '+(Number(invite.usedCount)||0)+' / ∞ 次 · 过期：'+xesc(cvProjectInviteDate(invite.expiresAt))+'</strong><input type="text" readonly value="'+xesc(cvProjectInviteUrl(invite))+'" aria-label="分享链接"></div><div class="pj-share-link-actions"><button type="button" data-pj-share-copy="'+xesc(invite.token)+'" aria-label="复制分享链接">复制</button><button type="button" class="pj-share-revoke" data-pj-share-revoke="'+xesc(invite.token)+'" aria-label="撤销分享链接">撤销</button></div><span class="pj-role-pill">'+xesc(cvProjectInviteRole(invite.role))+'</span></article>';}).join('')+'</div>':'<div class="pj-share-empty">还没有分享链接</div>')+'</section>'
  };
}
function cvRenderProjectMemberRows(project,members){
  return members.length?'<div class="pj-members-list">'+members.map(function(person){
    var isOwner=person.name===project.owner;
    var role=isOwner?'owner':((project.memberRoles&&project.memberRoles[person.id])||'member');
    var actions=isOwner||getRole()!=='owner'?'':'<details class="pj-member-actions"><summary aria-label="管理'+xesc(person.name)+'">···</summary><div class="pj-member-actions-menu"><span>更改角色</span><button type="button" data-pj-member-role-choice="'+xesc(person.id)+'" data-pj-role="member">成员'+(role==='member'?' ✓':'')+'</button><button type="button" data-pj-member-role-choice="'+xesc(person.id)+'" data-pj-role="admin">管理员'+(role==='admin'?' ✓':'')+'</button><button type="button" class="pj-member-remove" data-pj-member-remove="'+xesc(person.id)+'">从项目移除</button></div></details>';
    return '<div class="pj-members-row"><span class="pj-member-avatar">'+xesc(person.name[0]||'?')+'</span><span class="pj-members-info"><b>'+xesc(person.name)+'</b><small>'+xesc(person.email||person.dept||'')+'</small></span>'+actions+'<span class="pj-role-pill">'+xesc(cvProjectInviteRole(role))+'</span></div>';
  }).join('')+'</div>':'<div class="pj-members-empty">还没有项目成员，可生成邀请链接邀请加入。</div>';
}
function cvCreateContactInvite(){
  var project=cvProjectById(cvProjCur);if(!project)return;
  var contact=cvProjectInviteContact(($('#cv-proj-detail [data-pj-invite-contact]')||{}).value);
  if(!contact){toast('请输入有效的手机号或邮箱地址','warning');return;}
  var now=Date.now(),records=cvReadProjectInvites();
  if(records.some(function(row){return row.projectId===project.id&&row.type===contact.type&&row[contact.type]===contact.value&&row.expiresAt>now;})){toast('该手机号或邮箱已有待接受的邀请','warning');return;}
  var random=window.crypto&&window.crypto.randomUUID?window.crypto.randomUUID():Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
  records=records.filter(function(row){return row.expiresAt>now;});
  var invite={type:contact.type,token:project.id+'.'+contact.type+'.'+random,projectId:project.id,role:'member',createdAt:now,expiresAt:now+7*24*60*60*1000};
  invite[contact.type]=contact.value;
  records.push(invite);
  if(!cvWriteProjectInvites(records))return;
  cvRenderProjectDetail();
  toast('邀请记录已创建；当前原型不会实际发送短信或邮件');
}
function cvCreateProjectInvite(){
  var project=cvProjectById(cvProjCur);if(!project)return;
  var now=Date.now(),records=cvReadProjectInvites();
  var active=records.filter(function(row){return row.projectId===project.id&&(row.type==='link'||!row.type)&&row.expiresAt>now;}).sort(function(a,b){return b.createdAt-a.createdAt;})[0];
  records=records.filter(function(row){return row.expiresAt>now&&(row.projectId!==project.id||row.type==='email'||row.type==='phone');});
  if(active){
    active.type='link';active.role='member';active.updatedAt=now;active.expiresAt=now+7*24*60*60*1000;
    records.push(active);
  }else{
    var random=window.crypto&&window.crypto.randomUUID?window.crypto.randomUUID():Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
    records.push({type:'link',token:project.id+'.link.'+random,projectId:project.id,role:'member',createdAt:now,expiresAt:now+7*24*60*60*1000,usedCount:0});
  }
  if(!cvWriteProjectInvites(records))return;
  cvRenderProjectDetail();
}
function cvCopyProjectInvite(token,button){
  var invite=cvReadProjectInvites().find(function(row){return row.token===token&&row.expiresAt>Date.now();});
  if(!invite){toast('该邀请链接已过期','warning');return;}
  var value=cvProjectInviteUrl(invite);
  var input=button&&button.closest('.pj-share-link')&&button.closest('.pj-share-link').querySelector('input');
  var copyFallback=function(){input.focus();input.select();var copied=false;try{copied=document.execCommand('copy');}catch(e){}toast(copied?'邀请链接已复制':'请手动复制邀请链接',copied?undefined:'warning');};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(value).then(function(){toast('邀请链接已复制');}).catch(copyFallback);}
  else if(input){input.value=value;copyFallback();}
}
function cvRevokeProjectInvite(token){
  if(!window.confirm('确定撤销这条邀请吗？'))return;
  var records=cvReadProjectInvites().filter(function(row){return row.token!==token;});
  if(cvWriteProjectInvites(records))cvRenderProjectDetail();
}
function cvSetProjectMemberRole(personId,role){
  var project=cvProjectById(cvProjCur);
  var person=CV_MEMBERS.find(function(row){return row.id===personId;});
  if(!project||!person||getRole()!=='owner'||!['member','admin'].includes(role)||(project.members||[]).indexOf(personId)<0||person.name===project.owner){toast('只有项目管理员可以设置成员角色','warning');return;}
  project.memberRoles=project.memberRoles||{};
  if(role==='member')delete project.memberRoles[personId];
  else project.memberRoles[personId]=role;
  cvPersistProjects();
  cvRenderProjectDetail();
}
function cvRemoveProjectMember(personId){
  var project=cvProjectById(cvProjCur);
  var person=CV_MEMBERS.find(function(row){return row.id===personId;});
  if(!project||!person)return;
  var pending=CV_TASKS.filter(function(task){
    if(task.project!==project.id||task.kind==='epic'||['已完成','已取消'].includes(task.status))return false;
    return task.assignee===person.name||(task.stagePlan||[]).some(function(stage){return stage.assignee===person.name;});
  });
  if(pending.length){toast(person.name+' 还有 '+pending.length+' 个未完成任务，请先完成或转交后再移除','warning');return;}
  var ids=Array.isArray(project.members)?project.members:[];
  if(ids.length<=1){toast('项目至少需要 1 名成员','warning');return;}
  if(!window.confirm('确定将「'+person.name+'」从项目中移除吗？'))return;
  project.members=ids.filter(function(id){return id!==personId;});
  if(project.memberRoles)delete project.memberRoles[personId];
  cvPersistProjects();
  cvRenderProjectDetail();
  cvRenderProjectList();
}

export function initCollabProjectView(){
  window.cvRestoreProjectTaskBoard=cvRestoreProjectTaskBoard;
  cvRenderProjectFilters();
  var projectSearch=$('#cvProjectSearch');
  if(projectSearch){ projectSearch.value=''; projectSearch.addEventListener('input',cvRenderProjectList); }
  ['#cvProjectStatusFilter','#cvProjectMemberFilter','#cvProjectOwnerFilter'].forEach(function(sel){
    var field=$(sel); if(field) field.addEventListener('change',cvRenderProjectList);
  });
  var viewSwitch=$('#cv-project-view-switch');
  if(viewSwitch) viewSwitch.addEventListener('click',function(e){
    var view=e.target.closest('[data-pj-view]');
    if(view){ cvProjectListView=view.getAttribute('data-pj-view'); cvRenderProjectList(); }
  });
  var plist=$('#cv-proj-list');
  if(plist) plist.addEventListener('click',function(e){
    if(e.target.closest('[data-pj-quick]')) return;
    var open=e.target.closest('[data-pj-open]');
    if(open){ cvOpenProjectDetail(open.getAttribute('data-pj-open')); return; }
  });
  if(plist) plist.addEventListener('change',function(e){
    var field=e.target.getAttribute('data-pj-quick');
    if(!['status','priority','owner','start','end'].includes(field)||getRole()!=='owner') return;
    var row=e.target.closest('[data-pj-row]');
    var p=row&&cvProjectById(row.getAttribute('data-pj-row'));
    if(!p) return;
    var value=e.target.value;
    var valid=field==='status'?!!PJ_STATUS[value]
      :field==='priority'?['高','中','低'].includes(value)
      :field==='owner'?!value||CV_MEMBERS.some(function(m){return m.name===value;})||value===p.owner
      :!value||/^\d{4}-\d{2}-\d{2}$/.test(value);
    if(valid && field==='start' && value && p.end && value>p.end) valid=false;
    if(valid && field==='end' && value && p.start && value<p.start) valid=false;
    if(!valid){ e.target.value=p[field]||''; toast('请选择有效的项目属性或日期范围','error'); return; }
    p[field]=value;
    cvPersistProjects();
    cvRenderProjectList();
  });
  var pdetail=$('#cv-proj-detail');
  if(pdetail) pdetail.addEventListener('click',function(e){
    if(e.target.closest('[data-pj-back]')){ cvHideProjectDetail(); return; }
    if(e.target.closest('[data-pj-members-open]')){cvMembersPageOpen=true;cvRenderProjectDetail();pdetail.querySelector('button[data-pj-members-close]')?.focus();return;}
    if(e.target.closest('[data-pj-members-close]')){cvMembersPageOpen=false;cvRenderProjectDetail();pdetail.querySelector('[data-pj-members-open]')?.focus();return;}
    var summaryToggle=e.target.closest('[data-pj-summary-toggle]');
    if(summaryToggle){
      cvSummaryCollapsed=!cvSummaryCollapsed;
      var layout=pdetail.querySelector('.sq-layout--detail');
      if(layout)layout.classList.toggle('is-summary-collapsed',cvSummaryCollapsed);
      summaryToggle.setAttribute('aria-expanded',String(!cvSummaryCollapsed));
      summaryToggle.setAttribute('aria-label',(cvSummaryCollapsed?'展开':'收起')+'右侧项目摘要面板');
      summaryToggle.title=(cvSummaryCollapsed?'展开':'收起')+'右侧项目摘要面板';
      return;
    }
    if(e.target.closest('[data-pj-invite-contact-send]')){cvCreateContactInvite();return;}
    if(e.target.closest('[data-pj-share-create]')){cvCreateProjectInvite();return;}
    var shareCopy=e.target.closest('[data-pj-share-copy]');
    if(shareCopy){cvCopyProjectInvite(shareCopy.getAttribute('data-pj-share-copy'),shareCopy);return;}
    var inviteRevoke=e.target.closest('[data-pj-share-revoke]');
    if(inviteRevoke){cvRevokeProjectInvite(inviteRevoke.getAttribute('data-pj-share-revoke'));return;}
    var roleChoice=e.target.closest('[data-pj-member-role-choice]');
    if(roleChoice){cvSetProjectMemberRole(roleChoice.getAttribute('data-pj-member-role-choice'),roleChoice.getAttribute('data-pj-role'));return;}
    var memberRemove=e.target.closest('[data-pj-member-remove]');
    if(memberRemove){cvRemoveProjectMember(memberRemove.getAttribute('data-pj-member-remove'));return;}
    var moduleView=e.target.closest('[data-pj-module-view]');
    if(moduleView){cvModuleView=moduleView.getAttribute('data-pj-module-view');cvRenderProjectDetail();return;}
    if(e.target.closest('[data-pj-split]')){ cvOpenProjectSplit(); return; }
    if(e.target.closest('[data-pj-split-manual]')){ cvOpenManualSplit(); return; }
    var esplit=e.target.closest('[data-ft-split]');
    if(esplit){ cvOpenEpicSplit(esplit.getAttribute('data-ft-split')); return; }
    var ftoggle=e.target.closest('[data-ft-tasks-toggle]');
    if(ftoggle){ var fid=ftoggle.getAttribute('data-ft-tasks-toggle'); cvCollapsedEpics[fid]=!cvModuleTasksCollapsed(fid); var activeProject=cvProjectById(cvProjCur); if(activeProject) cvRenderModuleResults(cvProjectEpics(activeProject)); return; }
    var push=e.target.closest('[data-ft-push]');
    if(push){ cvPushFeatureToTask(push.getAttribute('data-ft-push')); return; }
    var fedit=e.target.closest('[data-ft-edit]');
    if(fedit){ cvOpenFeatureEdit(fedit.getAttribute('data-ft-edit')); return; }
    var fdel=e.target.closest('[data-ft-del]');
    if(fdel){ cvDeleteFeature(fdel.getAttribute('data-ft-del')); return; }
    var tv=e.target.closest('[data-pj-task]');
    if(tv){ cvOpenTaskById(tv.getAttribute('data-pj-task')); return; }
    var set=e.target.closest('[data-pj-set]');
    if(set){ window.cvOpenProjEdit && window.cvOpenProjEdit(set.getAttribute('data-pj-set')); return; }
  });
  if(pdetail) pdetail.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&cvMembersPageOpen){cvMembersPageOpen=false;cvRenderProjectDetail();pdetail.querySelector('[data-pj-members-open]')?.focus();}
    if(e.key==='Enter'&&e.target.matches('[data-pj-invite-contact]')){e.preventDefault();cvCreateContactInvite();}
  });
  if(pdetail) pdetail.addEventListener('input',function(e){
    if(!e.target.matches('[data-pj-invite-contact]'))return;
    var button=pdetail.querySelector('[data-pj-invite-contact-send]');
    if(button)button.disabled=!cvProjectInviteContact(e.target.value);
  });
  if(pdetail) pdetail.addEventListener('change',function(e){
    var field=e.target.getAttribute('data-pj-field');
    if(!field) return;
    var p=cvProjectById(cvProjCur); if(!p) return;
    if(field==='name' && !e.target.value.trim()){
      e.target.value=p.name;
      toast('请填写项目名称','error');
      return;
    }
    if(field==='defaultTeam' && !TEAMS.some(function(t){return t.id===e.target.value;})){
      e.target.value=p.defaultTeam||'';
      toast('请选择专家团','error');
      return;
    }
    p[field]=field==='name'?e.target.value.trim():e.target.value;
    cvPersistProjects();
    if(field==='name'){ var crumb=document.querySelector('.pj-crumb-name'); if(crumb) crumb.textContent=e.target.value; }
  });
  var splitBody=$('#cv-split-body');
  if(splitBody) splitBody.addEventListener('change',function(e){
    if(e.target.closest('[data-split-idx]')) cvUpdateSplitCount();
  });
}

export { cvCloseFeatureEdit, cvCloseManualSplit, cvCloseProjectSplit, cvConfirmManualSplit, cvConfirmProjectSplit, cvHideProjectDetail, cvOpenManualSplit, cvOpenProjectDetail, cvOpenProjectSplit, cvRenderProjectDetail, cvRenderProjectList, cvSaveFeatureEdit };
