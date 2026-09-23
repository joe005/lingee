import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { CV_ARTIFACTS, CV_MEMBERS, CV_PROJECTS, CV_TASKS, cvPeopleInProject, cvPersistProjects, cvProjectById, cvProjectInWorkspace } from './data.js';
import { xesc } from '../expert/data.js';
import { tbSave } from './tb-core.js';
import { renderTaskBoard, tbOpenTask, tbShowBoard } from './task-board.js';
import { cvSetProject, cvUpdateCounts } from './projects.js';
import { cvSwitchView } from './view.js';
import { TEAMS } from '../expert/store.js';
import { getRole } from '../login.js';
/* 项目列表、详情与模块规划；项目直接维护成员。 */

var cvProjCur='';           /* 项目详情正在看的项目 id，空 = 项目列表 */
var cvProjTab='plan';  /* 项目详情页签：plan / members / artifacts */
var cvProjectListView='list';
var cvModuleView='table', cvModuleFilter='all', cvModuleQuery='';
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
  var members=cvPeopleInProject(p);
  var available=CV_MEMBERS.filter(function(person){return !(p.members||[]).includes(person.id);});
  var epics=cvProjectEpics(p);
  var tasks=CV_TASKS.filter(function(t){return t.project===cvProjCur&&t.kind!=='epic';});
  var projectProgress=tasks.length?Math.round(tasks.reduce(function(sum,t){return sum+(t.status==='已完成'?100:(t.progress||0));},0)/tasks.length):0;
  var doneCnt=tasks.filter(function(t){return t.status==='已完成';}).length;
  var unlinked=tasks.filter(function(t){ return !t.parentTaskId; });
  var arts=CV_ARTIFACTS.filter(function(a){return a.project===cvProjCur;});
  var artHtml=arts.length?'<div class="art-list">'
    +'<div class="art-list-head"><span class="art-c art-c-name">文件</span><span class="art-c art-c-type">类型</span><span class="art-c art-c-date">生成日期</span><span class="art-c art-c-ops">操作</span></div>'
    +arts.map(function(a){
      var fileNameHtml=(a.files&&a.files.length)
        ? '<span class="art-dir">📁</span><span class="art-name">'+xesc(a.name)+'</span><span class="art-file-cnt">'+a.files.length+' 个文件</span>'
        : '<span class="art-name">'+xesc(a.file||a.name)+'</span>';
      return '<div class="art-list-row">'
        +'<span class="art-c art-c-name"><span class="art-type '+a.typeCls+'">'+a.typeLabel+'</span>'+fileNameHtml+'</span>'
        +'<span class="art-c art-c-type">'+a.typeLabel+'</span>'
        +'<span class="art-c art-c-date">'+a.date+'</span>'
        +'<span class="art-c art-c-ops">'
        +'<button type="button" class="act-btn" data-cv-art="预览" data-cv-art-name="'+xesc(a.name)+'">预览</button>'
        +'<button type="button" class="act-btn" data-cv-art="下载" data-cv-art-name="'+xesc(a.name)+'">下载</button>'
        +'<button type="button" class="act-btn" data-cv-art="分享" data-cv-art-name="'+xesc(a.name)+'">分享</button>'
        +'</span>'
        +'</div>';
    }).join('')
    +'</div>':'<div class="sq-empty">该项目还没有产物</div>';
  var repoHtml=p.repo
    ? '<a class="pj-repo" href="'+xesc(p.repo)+'" target="_blank" rel="noopener noreferrer">查看仓库</a>'
    : '<span class="pj-repo pj-repo--none">未关联</span>';
  var curTeam=TEAMS.find(function(t){return t.id===p.defaultTeam;});
  el.innerHTML='<div class="pj-crumb">'
    +'<button type="button" class="pj-back" data-pj-back>项目</button>'
    +'<span class="pj-crumb-sep">›</span>'
    +'<span class="pj-dot pj-dot--sm" style="background:'+(CV_PROJ_DOT_COLORS[p.dot]||'#b8b8b8')+'"></span>'
    +'<span class="pj-crumb-name">'+xesc(p.name)+'</span>'
    +'</div>'
    +'<div class="sq-layout sq-layout--detail">'
    +'<section class="sq-main">'
    +'<div class="sq-tabs">'
    +'<button type="button" class="sq-tab'+(cvProjTab==='plan'?' on':'')+'" data-pjtab="plan">模块</button>'
    +'<button type="button" class="sq-tab'+(cvProjTab==='members'?' on':'')+'" data-pjtab="members">成员</button>'
    +'<button type="button" class="sq-tab'+(cvProjTab==='artifacts'?' on':'')+'" data-pjtab="artifacts">产物</button>'
    +'</div>'
    +'<div class="sq-tabpane'+(cvProjTab==='plan'?'':' hidden')+'" data-pjpane="plan">'
    +'<div class="pj-plan-sec"><div class="pj-module-toolbar"><div class="pj-module-heading"><strong>模块</strong><span>'+epics.length+'</span></div>'
    +'<div class="pj-module-controls"><label class="pj-module-search"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input type="search" name="project-module-filter-query" data-pj-module-search value="'+xesc(cvModuleQuery)+'" autocomplete="off" data-1p-ignore data-lpignore="true" readonly placeholder="搜索模块名称或描述" aria-label="搜索模块"></label>'
    +'<select class="pj-module-filter" data-pj-module-filter aria-label="按进度筛选模块"><option value="all"'+(cvModuleFilter==='all'?' selected':'')+'>全部进度</option><option value="todo"'+(cvModuleFilter==='todo'?' selected':'')+'>未开始</option><option value="doing"'+(cvModuleFilter==='doing'?' selected':'')+'>进行中</option><option value="done"'+(cvModuleFilter==='done'?' selected':'')+'>已完成</option></select>'
    +'<div class="pj-module-views" aria-label="模块显示形式"><button type="button" data-pj-module-view="table" class="'+(cvModuleView==='table'?'on':'')+'" aria-pressed="'+(cvModuleView==='table')+'">表格</button><button type="button" data-pj-module-view="list" class="'+(cvModuleView==='list'?'on':'')+'" aria-pressed="'+(cvModuleView==='list')+'">列表</button></div>'
    +'<button type="button" class="sync-btn" data-pj-split-manual>＋ 创建模块</button></div></div>'
    +'<div id="pj-module-results" aria-live="polite"></div>'
    +'</div>'
    +'</div>'
    +'<div class="sq-tabpane'+(cvProjTab==='members'?'':' hidden')+'" data-pjpane="members">'
    +'<div class="pj-members-head"><div><strong>项目成员</strong><span>'+members.length+' 人</span></div>'+(available.length?'<button type="button" class="sync-btn" data-pj-member-picker aria-expanded="false">＋ 添加成员</button>':'')+'</div>'
    +(available.length?'<div class="pj-members-picker hidden" data-pj-member-picker-panel><input type="search" data-pj-member-search placeholder="搜索姓名、邮箱" aria-label="搜索可添加人员" autocomplete="off"><div class="pj-members-candidates">'+available.map(function(person){return '<label data-pj-member-name="'+xesc((person.name+' '+(person.email||'')).toLocaleLowerCase())+'"><input type="checkbox" data-pj-member-select="'+xesc(person.id)+'"><span class="pj-member-avatar" aria-hidden="true">'+xesc(person.name[0]||'?')+'</span><span class="pj-member-candidate-name">'+xesc(person.name)+'</span><small>'+xesc(person.dept||person.email||'')+'</small></label>';}).join('')+'</div><div class="pj-members-picker-footer"><span data-pj-member-selected-count>已选 0 人</span><button type="button" data-pj-member-confirm disabled>添加 0 人</button></div></div>':'')
    +(members.length?'<div class="pj-members-list">'+members.map(function(person){return '<div class="pj-members-row"><span class="pj-member-avatar">'+xesc(person.name[0]||'?')+'</span><span class="pj-members-info"><b>'+xesc(person.name)+'</b><small>'+xesc(person.email||person.dept||'')+'</small></span><button type="button" data-pj-member-remove="'+xesc(person.id)+'" aria-label="从项目移除'+xesc(person.name)+'">移除</button></div>';}).join('')+'</div>':'<div class="pj-members-empty">还没有项目成员，点击「添加成员」从工作区选择。</div>')
    +'</div>'
    +'<div class="sq-tabpane'+(cvProjTab==='artifacts'?'':' hidden')+'" data-pjpane="artifacts">'
    +artHtml
    +'</div>'
    +'</section>'
    +'<aside class="sq-side sq-side--right">'
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
    +'</aside>'
    +'</div>';
  cvRenderModuleResults(epics);
}
function cvSwitchProjectTab(tab){
  cvProjTab=['plan','members','artifacts'].includes(tab)?tab:'plan';
  cvRenderProjectDetail();
}

/* ---------- 项目规划：智能拆解 ----------
   两级用同一套弹窗：project 模式把项目拆成父任务（不可执行）；
   epic 模式把某个父任务拆成子任务（可执行，下推进任务看板）。 */
var cvSplitItems=[];
var cvSplitMode='project';   /* 'project' | 'epic' */
var cvSplitEpicId='';
function cvSplitCandidates(p){
  var base=p.desc||p.name;
  return [
    {title:'核心业务模块',desc:'围绕「'+base+'」的核心业务场景、单据与主流程'},
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
  if(head.agent) head.agent.textContent='产品经理 · 父任务规划';
  if(head.confirm) head.confirm.textContent='确认生成父任务';
  var body=document.getElementById('cv-split-body'); if(!body) return;
  body.innerHTML='<div class="split-msg split-msg--user">基于项目目标「'+xesc(p.goal||p.name)+'」规划父任务</div>'
    +'<div class="split-msg split-msg--agent" id="cv-split-agent-msg"><div class="split-thinking"><i></i><i></i><i></i></div><span class="split-thinking-t">正在思考…</span></div>';
  var ov=document.getElementById('cv-splittask-overlay'); if(ov) ov.style.display='flex';
  setTimeout(cvRenderSplitResult, 900);
}
function cvOpenEpicSplit(fid){
  var f=cvCurFeature(fid); if(!f) return;
  cvSplitMode='epic'; cvSplitEpicId=fid;
  cvSplitItems=cvEpicSplitCandidates(f);
  var head=cvSplitHeadEls();
  if(head.agent) head.agent.textContent='产品经理 · 子任务拆解';
  if(head.confirm) head.confirm.textContent='确认生成子任务';
  var body=document.getElementById('cv-split-body'); if(!body) return;
  body.innerHTML='<div class="split-msg split-msg--user">基于父任务「'+xesc(f.title)+'」拆解可执行的子任务</div>'
    +'<div class="split-msg split-msg--agent" id="cv-split-agent-msg"><div class="split-thinking"><i></i><i></i><i></i></div><span class="split-thinking-t">正在思考…</span></div>';
  var ov=document.getElementById('cv-splittask-overlay'); if(ov) ov.style.display='flex';
  setTimeout(cvRenderSplitResult, 900);
}
function cvRenderSplitResult(){
  var msg=document.getElementById('cv-split-agent-msg'); if(!msg) return;
  var noun=cvSplitMode==='epic'?'子任务':'父任务';
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
  var noun=cvSplitMode==='epic'?'子任务':'父任务';
  if(!checked.length){ toast('请至少确认一个'+noun,'warning'); return; }
  var n=0;
  if(cvSplitMode==='epic'){
    var f=cvCurFeature(cvSplitEpicId);
    if(!f){ cvCloseProjectSplit(); return; }
    checked.forEach(function(cb){
      var t=cvSplitItems[+cb.getAttribute('data-split-idx')]; if(!t) return;
      var boardId=crypto.randomUUID();
      CV_TASKS.unshift({boardId:boardId,kind:'task',parentTaskId:f.boardId,type:'需求',size:'小',source:'智能拆解',sourceId:'TASK-'+Date.now().toString().slice(-6)+'-'+(n+1),exec:'专家团',status:'待办',collab:'人Agent协作',mode:'多人协作',priority:p.priority||'中',title:t.title,desc:t.desc,acceptance:t.acceptance||'',assignee:'待分配',progress:0,project:p.id,files:[],artifacts:[],activity:[{author:'系统',text:'由父任务「'+f.title+'」智能拆解生成子任务'}],tags:[]});
      n++;
    });
  }else{
    checked.forEach(function(cb){
      var t=cvSplitItems[+cb.getAttribute('data-split-idx')]; if(!t) return;
      var id='epic-'+Date.now().toString(36)+'-'+n;
      CV_TASKS.push({boardId:id,kind:'epic',parentTaskId:null,type:'特性',source:'智能规划',sourceId:'FEAT-'+Date.now().toString().slice(-6)+'-'+(n+1),status:'待规划',title:t.title,desc:t.desc,files:[],assignee:p.owner||'待分配',priority:p.priority||'中',project:p.id,progress:0,artifacts:[],activity:[{author:'系统',text:'由项目目标智能规划生成父任务'}]});
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
  return '<div class="pj-module-children">'+(children.length?children.map(cvTaskRowHtml).join(''):'<div class="pj-module-children-empty">该模块暂无任务</div>')+'</div>';
}
function cvModuleMetrics(f){
  var children=CV_TASKS.filter(function(t){return t.parentTaskId===f.boardId&&t.kind!=='epic';});
  var done=children.filter(function(t){return t.status==='已完成';}).length;
  var active=children.some(function(t){return ['进行中','审核中','已阻塞'].includes(t.status);});
  return {total:children.length,done:done,progress:children.length?Math.round(done/children.length*100):0,state:children.length&&done===children.length?'done':done||active?'doing':'todo'};
}
function cvRenderModuleResults(epics){
  var el=document.getElementById('pj-module-results'); if(!el) return;
  var query=cvModuleQuery.trim().toLocaleLowerCase();
  var list=epics.filter(function(f){
    return (cvModuleFilter==='all'||cvModuleMetrics(f).state===cvModuleFilter)
      &&(!query||(f.title+' '+(f.desc||'')+' '+(f.sourceId||'')).toLocaleLowerCase().includes(query));
  });
  if(!list.length){el.innerHTML='<div class="pj-module-empty">'+(epics.length?'没有匹配的模块，请调整搜索或筛选条件。':'还没有模块，点击「创建模块」开始。')+'</div>';return;}
  if(cvModuleView==='list'){el.innerHTML=cvFeaturesHtml(list);return;}
  el.innerHTML='<div class="pj-module-table" role="table" aria-label="模块列表"><div class="pj-module-tr pj-module-th" role="row"><span role="columnheader">模块</span><span role="columnheader">任务</span><span role="columnheader">进度</span><span role="columnheader">操作</span></div>'
    +list.map(function(f){var m=cvModuleMetrics(f);var id=xesc(f.boardId);return '<div class="pj-module-tr" role="row"><div class="pj-module-name" role="cell"><button type="button" class="pj-module-open" data-ft-tasks-toggle="'+id+'" aria-expanded="'+!cvModuleTasksCollapsed(f.boardId)+'" aria-label="查看'+xesc(f.title)+'的任务列表"><b>'+xesc(f.title)+'</b><small>'+xesc(f.desc||'暂无描述')+'</small></button></div><span role="cell"><button type="button" class="pj-module-count" data-ft-tasks-toggle="'+id+'" aria-expanded="'+!cvModuleTasksCollapsed(f.boardId)+'">'+m.total+' 个任务 · '+m.done+' 已完成 '+(cvModuleTasksCollapsed(f.boardId)?'▸':'▾')+'</button></span><span class="pj-module-progress" role="cell"><i><em style="width:'+m.progress+'%"></em></i>'+m.progress+'%</span><span class="pj-module-actions" role="cell"><button type="button" data-ft-split="'+id+'" title="智能拆解">✧</button><button type="button" data-ft-push="'+id+'" title="新增任务">＋</button><button type="button" data-ft-edit="'+id+'" title="编辑模块">✎</button><button type="button" data-ft-del="'+id+'" title="删除模块">×</button></span></div>'+cvModuleTasksHtml(f);}).join('')+'</div>';
}
function cvFeaturesHtml(epics){
  if(!epics||!epics.length) return '';
  return '<div class="ft-list">'+epics.map(function(f){
    var children=CV_TASKS.filter(function(t){return t.parentTaskId===f.boardId;});
    var doneCnt=children.filter(function(t){return t.status==='已完成';}).length;
    var prog=children.length?Math.round(doneCnt/children.length*100):0;
    return '<div class="ft-item ft-item--row">'
      +'<div class="ft-item-main"><button type="button" class="ft-item-open" data-ft-tasks-toggle="'+xesc(f.boardId)+'" aria-expanded="'+!cvModuleTasksCollapsed(f.boardId)+'" aria-label="查看'+xesc(f.title)+'的任务列表"><b>'+xesc(f.title)+'</b>'
      +(f.desc?'<small>'+xesc(f.desc)+'</small>':'')+'</button>'
      +'<button type="button" class="ft-item-meta ft-item-task-toggle" data-ft-tasks-toggle="'+xesc(f.boardId)+'" aria-expanded="'+!cvModuleTasksCollapsed(f.boardId)+'">'+children.length+' 任务 · '+doneCnt+' 已完成 · '+prog+'% '+(cvModuleTasksCollapsed(f.boardId)?'▸':'▾')+'</button></div>'
      +'<div class="ft-item-acts">'
      +'<button type="button" class="ft-act ft-act--split" data-ft-split="'+f.boardId+'" title="智能拆解"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg></button>'
      +'<button type="button" class="ft-act ft-act--push" data-ft-push="'+f.boardId+'" title="手动新增子任务"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>'
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
  if(!title){ toast('请填写模块标题','warning'); return; }
  CV_TASKS.push({boardId:'epic-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,5),kind:'epic',parentTaskId:null,type:'特性',source:'人工规划',sourceId:'FEAT-'+Date.now().toString().slice(-6),status:'待规划',title:title,desc:(document.getElementById('cv-ms-desc').value||'').trim(),files:[],assignee:p.owner||'待分配',priority:p.priority||'中',project:p.id,progress:0,artifacts:[],activity:[{author:'当前用户',text:'手动创建模块'}]});
  tbSave();
  cvCloseManualSplit();
  cvModuleQuery='';cvModuleFilter='all';
  cvRenderProjectDetail();
  toast('已创建模块：'+title,'success');
}

/* ---------- 父任务编辑 / 删除 / 下推子任务 ---------- */
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
  if(!title){ toast('请填写模块标题','warning'); return; }
  f.title=title;
  f.desc=(document.getElementById('cv-fe-desc').value||'').trim();
  tbSave();
  cvCloseFeatureEdit();
  cvRenderProjectDetail();
  toast('已保存模块：'+title,'success');
}
function cvDeleteFeature(fid){
  var p=cvProjectById(cvProjCur); if(!p) return;
  var f=cvCurFeature(fid); if(!f) return;
  var children=CV_TASKS.filter(function(t){return t.parentTaskId===fid;});
  if(!window.confirm('删除模块「'+f.title+'」？其 '+children.length+' 个任务会保留为未分组任务。')) return;
  children.forEach(function(t){t.parentTaskId=null;});
  CV_TASKS.splice(CV_TASKS.indexOf(f),1);
  tbSave();
  cvRenderProjectDetail();
  toast('已删除模块：'+f.title,'info');
}
/* 手动新增子任务：复用任务管理那边的「新建任务」弹窗（项目/专家团/执行模式/阶段一致），
   只是锁定项目为父任务所在项目，并把新任务挂到该父任务下；复杂的拆解交给「智能拆解」（cvOpenEpicSplit）。 */
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
  cvProjTab='plan';
  cvModuleQuery='';cvModuleFilter='all';cvModuleView='table';
  var list=$('#cv-proj-list'),detail=$('#cv-proj-detail');
  var head=$('#cv-project-head'),toolbar=$('#cv-project-toolbar');
  if(head) head.classList.add('hidden');
  if(toolbar) toolbar.classList.add('hidden');
  if(list) list.classList.add('hidden');
  if(detail){ detail.classList.remove('hidden'); cvRenderProjectDetail(); }
}
function cvHideProjectDetail(){
  cvProjCur='';
  var list=$('#cv-proj-list'),detail=$('#cv-proj-detail');
  var head=$('#cv-project-head'),toolbar=$('#cv-project-toolbar');
  if(detail) detail.classList.add('hidden');
  if(head) head.classList.remove('hidden');
  if(toolbar && $('#cv-projedit-overlay')?.style.display!=='flex') toolbar.classList.remove('hidden');
  if(list){ list.classList.remove('hidden'); cvRenderProjectList(); }
}

function cvRemoveProjectMember(personId){
  var project=cvProjectById(cvProjCur);
  if(!project||!CV_MEMBERS.some(function(person){return person.id===personId;}))return;
  var ids=Array.isArray(project.members)?project.members:[];
  if(ids.length<=1){toast('项目至少需要 1 名成员','warning');return;}
  project.members=ids.filter(function(id){return id!==personId;});
  cvPersistProjects();
  cvRenderProjectDetail();
  cvRenderProjectList();
}
function cvAddProjectMembers(){
  var project=cvProjectById(cvProjCur);
  var selected=$$('#cv-proj-detail [data-pj-member-select]:checked').map(function(input){return input.getAttribute('data-pj-member-select');});
  if(!project||!selected.length)return;
  project.members=[...new Set((project.members||[]).concat(selected))];
  cvPersistProjects();
  cvRenderProjectDetail();
  cvRenderProjectList();
}
function cvUpdateProjectMemberSelection(){
  var count=$$('#cv-proj-detail [data-pj-member-select]:checked').length;
  var label=$('#cv-proj-detail [data-pj-member-selected-count]');if(label)label.textContent='已选 '+count+' 人';
  var button=$('#cv-proj-detail [data-pj-member-confirm]');if(button){button.textContent='添加 '+count+' 人';button.disabled=!count;}
}
function cvCloseProjectMemberPicker(){
  var panel=$('#cv-proj-detail [data-pj-member-picker-panel]');
  var button=$('#cv-proj-detail [data-pj-member-picker]');
  if(panel)panel.classList.add('hidden');
  if(button)button.setAttribute('aria-expanded','false');
}
function cvToggleProjectMemberPicker(button){
  var panel=$('#cv-proj-detail [data-pj-member-picker-panel]');if(!panel)return;
  if(!panel.classList.contains('hidden')){cvCloseProjectMemberPicker();return;}
  panel.classList.remove('hidden');
  var rect=button.getBoundingClientRect();
  var width=panel.getBoundingClientRect().width;
  var height=panel.getBoundingClientRect().height;
  panel.style.left=Math.max(12,Math.min(rect.right-width,window.innerWidth-width-12))+'px';
  panel.style.top=(rect.bottom+8+height<=window.innerHeight-12?rect.bottom+8:Math.max(12,rect.top-height-8))+'px';
  button.setAttribute('aria-expanded','true');
  var search=panel.querySelector('[data-pj-member-search]');if(search)search.focus();
}

export function initCollabProjectView(){
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
    var tab=e.target.closest('[data-pjtab]');
    if(tab){ cvSwitchProjectTab(tab.getAttribute('data-pjtab')); return; }
    var pickerButton=e.target.closest('[data-pj-member-picker]');
    if(pickerButton){cvToggleProjectMemberPicker(pickerButton);return;}
    if(e.target.closest('[data-pj-member-confirm]')){cvAddProjectMembers();return;}
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
  document.addEventListener('click',function(e){
    if(!e.target.closest('[data-pj-member-picker],[data-pj-member-picker-panel]'))cvCloseProjectMemberPicker();
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')cvCloseProjectMemberPicker();});
  document.addEventListener('scroll',function(e){
    if(e.target.closest&&e.target.closest('#cv-proj-detail')&&!e.target.closest('[data-pj-member-picker-panel]'))cvCloseProjectMemberPicker();
  },true);
  if(pdetail) pdetail.addEventListener('input',function(e){
    if(e.target.matches('[data-pj-member-search]')){
      var query=e.target.value.trim().toLocaleLowerCase();
      pdetail.querySelectorAll('[data-pj-member-name]').forEach(function(row){row.classList.toggle('hidden',!row.getAttribute('data-pj-member-name').includes(query));});
      return;
    }
    if(!e.target.matches('[data-pj-module-search]')) return;
    cvModuleQuery=e.target.value;
    var p=cvProjectById(cvProjCur);if(p)cvRenderModuleResults(cvProjectEpics(p));
  });
  if(pdetail) pdetail.addEventListener('change',function(e){
    if(e.target.matches('[data-pj-member-select]')){cvUpdateProjectMemberSelection();return;}
    if(e.target.matches('[data-pj-module-filter]')){
      cvModuleFilter=e.target.value;
      var activeProject=cvProjectById(cvProjCur);if(activeProject)cvRenderModuleResults(cvProjectEpics(activeProject));
      return;
    }
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
