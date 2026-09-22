import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { CV_MEMBERS, CV_PROJECTS, CV_ARTIFACTS, CV_TASKS, cvIsMe, cvPersistPersons, cvPersistProjects, cvPersonById, cvProjectById, cvProjectInWorkspace } from './data.js';
import { cvPersistSquads, cvSquadDetachMember } from './squads.js';
import { xesc } from '../expert/data.js';
import { tbSave } from './tb-core.js';
import { renderTaskBoard, tbOpenTask } from './task-board.js';
import { cvSetProject, cvUpdateCounts } from './projects.js';
import { cvSwitchView } from './view.js';
import { TEAMS } from '../expert/store.js';
/* 项目管理：项目列表 + 项目详情（选协作人员）
   人员基础资料独立维护（CV_MEMBERS），项目通过 members 引用人员 id；本模块渲染项目卡片列表，
   点进项目后维护该项目的协作人员（从基础资料里选人加入 / 移除）。 */


var cvPersonEditId='';      /* 人员编辑弹窗：正在编辑的人员 id，空 = 新增 */
var cvProjCur='';           /* 项目详情正在看的项目 id，空 = 项目列表 */
var cvProjTab='plan';    /* 项目详情右栏页签：plan / members / tasks / artifacts */
var CV_PROJ_DOT_COLORS={blue:'#4d89ff',orange:'#ff8d42',green:'#08cc50'};
var PS_COLORS=['#7c5cfc','#4d89ff','#08a040','#ff8d42','#e04a3a','#c06010','#08cc50','#5b8def'];
function cvPsNum(pid){ return parseInt(String(pid).replace(/\D/g,''))||0; }
function cvPsColor(pid){ return PS_COLORS[cvPsNum(pid)%PS_COLORS.length]; }
function cvPersonAvHtml(p,cls){
  var color=cvIsMe(p)?'#08a040':cvPsColor(p.id);
  return '<span class="'+cls+'" style="background:'+color+'">'+xesc(p.name[0]||'?')+'</span>';
}

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
  var list=CV_PROJECTS.filter(function(p){return cvProjectInWorkspace(p.id);});
  var cnt=$('#cv-proj-count'); if(cnt) cnt.textContent=list.length;
  if(!list.length){ el.innerHTML='<div class="x-empty">当前工作区还没有项目，点右上「新建项目」</div>'; return; }
  el.innerHTML=list.map(function(p){
    var members=(p.members||[]).map(cvPersonById).filter(Boolean);
    var color=CV_PROJ_DOT_COLORS[p.dot]||'#b8b8b8';
    var team=TEAMS.find(function(t){return t.id===p.defaultTeam;});
    var taskCount=CV_TASKS.filter(function(t){return t.project===p.id;}).length;
    var tags='<span class="ptag">'+xesc(p.priority||'中')+'优先级</span>';
    if(team) tags+='<span class="ptag">专家团 · '+xesc(team.name)+'</span>';
    if(taskCount) tags+='<span class="ptag">'+taskCount+' 个任务</span>';
    return '<div class="pj-card x-card" data-pj-open="'+p.id+'">'
      +'<button type="button" class="x-call" data-pj-set="'+p.id+'" data-perm="owner" title="编辑项目">编辑</button>'
      +'<div class="card-top"><span class="pj-av" style="background:'+color+'1a;color:'+color+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></span>'
      +'<div class="card-titles"><div class="card-title-row"><span class="card-title">'+xesc(p.name)+'</span></div>'
      +'<div class="x-sub">负责人 '+xesc(p.owner||'未设置')+' · '+members.length+' 位协作人员</div></div></div>'
      +'<div class="card-desc">'+xesc(p.desc||'添加项目描述')+'</div>'
      +'<div class="card-tags">'+tags+'</div>'
      +'</div>';
  }).join('');
}

/* ---------- 项目详情：左基本信息 + 右成员/项目指引/关联任务 ---------- */
function cvRenderProjectDetail(){
  var el=$('#cv-proj-detail'); if(!el) return;
  var p=cvProjectById(cvProjCur);
  if(!p){ el.innerHTML=''; return; }
  var members=(p.members||[]).map(cvPersonById).filter(Boolean);
  var memberHtml=members.length?members.map(function(m){
    var roles=(m.roles||[]).map(function(r){return xesc(r.text);}).join(' · ');
    return '<div class="sq-member">'
      +cvPersonAvHtml(m,'sq-member-av')
      +'<div class="sq-member-body">'
      +'<div class="sq-member-line"><span class="sq-member-name">'+xesc(m.name)+(cvIsMe(m)?'<span class="ps-me">我</span>':'')+'</span><span class="sq-member-kind">'+roles+'</span></div>'
      +'<div class="sq-member-sub">'+xesc(m.email||'')+(m.dept?' · '+xesc(m.dept):'')+'</div>'
      +'</div>'
      +'<button type="button" class="pj-remove" data-pj-remove="'+m.id+'">移除</button>'
      +'</div>';
  }).join(''):'<div class="sq-empty">该项目还没有协作人员，点「添加协作人员」选人</div>';
  var epics=cvProjectEpics(p);
  var tasks=CV_TASKS.filter(function(t){return t.project===cvProjCur&&t.kind!=='epic';});
  var projectProgress=tasks.length?Math.round(tasks.reduce(function(sum,t){return sum+(t.status==='已完成'?100:(t.progress||0));},0)/tasks.length):0;
  var unlinked=tasks.filter(function(t){ return !t.parentTaskId; });
  var unlinkedHtml=unlinked.length
    ? '<div class="pj-plan-sec"><div class="pj-plan-k">未分组任务</div><div class="pj-plan-hint">未归属任何父任务的子任务，同样可直接执行</div>'
      +'<div class="pj-task-group-list">'+unlinked.map(cvTaskRowHtml).join('')+'</div></div>'
    : '';
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
        +'<button type="button" class="act-btn" data-cv-art="回到对话" data-cv-art-name="'+xesc(a.name)+'">回到对话</button>'
        +'</span>'
        +'</div>';
    }).join('')
    +'</div>':'<div class="sq-empty">该项目还没有产物</div>';
  var repoHtml=p.repo
    ? '<a class="pj-repo" href="'+xesc(p.repo)+'" target="_blank" rel="noopener noreferrer">查看仓库</a>'
    : '<span class="pj-repo pj-repo--none">未关联</span>';
  var curTeam=TEAMS.find(function(t){return t.id===p.defaultTeam;});
  el.innerHTML='<div class="pj-crumb">'
    +'<button type="button" class="pj-back" data-pj-back>项目管理</button>'
    +'<span class="pj-crumb-sep">›</span>'
    +'<span class="pj-dot pj-dot--sm" style="background:'+(CV_PROJ_DOT_COLORS[p.dot]||'#b8b8b8')+'"></span>'
    +'<span class="pj-crumb-name">'+xesc(p.name)+'</span>'
    +'<button type="button" class="pj-set pj-set--crumb" data-pj-set="'+p.id+'" data-perm="owner">编辑</button>'
    +'</div>'
    +'<div class="sq-layout">'
    +'<aside class="sq-side">'
    +'<div class="pj-side-av"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>'
    +'<div class="sq-side-name">'+xesc(p.name)+'</div>'
    +'<div class="sq-side-desc">'+(p.desc?xesc(p.desc):'添加描述')+'</div>'
    +(p.goal?'<div class="pj-side-goal"><div class="pj-side-goal-k">项目目标</div><div class="pj-side-goal-v">'+xesc(p.goal)+'</div></div>':'')
    +'<div class="sq-kv-wrap"><div class="sq-kv-t">详情</div>'
    +'<div class="sq-kv"><span>优先级</span><b>'+xesc(p.priority||'未设置')+'</b></div>'
    +'<div class="sq-kv"><span>负责人</span><b>'+xesc(p.owner||'未设置')+'</b></div>'
    +'<div class="sq-kv"><span>里程碑</span><b>'+(p.start||'—')+' ~ '+(p.end||'—')+'</b></div>'
    +'<div class="sq-kv"><span>代码仓库</span><b>'+repoHtml+'</b></div>'
    +'<div class="sq-kv"><span>专家团</span><b>'+xesc(curTeam?curTeam.name:'未绑定')+'</b></div>'
    +'<div class="sq-kv"><span>协作人员</span><b>'+members.length+'</b></div>'
    +'<div class="sq-kv"><span>任务</span><b>'+tasks.length+'</b></div>'
    +'<div class="sq-kv"><span>项目进度</span><b>'+projectProgress+'%</b></div>'
    +'</div></aside>'
    +'<section class="sq-main">'
    +'<div class="sq-tabs">'
    +'<button type="button" class="sq-tab'+(cvProjTab==='plan'?' on':'')+'" data-pjtab="plan">任务规划</button>'
    +'<button type="button" class="sq-tab'+(cvProjTab==='members'?' on':'')+'" data-pjtab="members">成员</button>'
    +'<button type="button" class="sq-tab'+(cvProjTab==='artifacts'?' on':'')+'" data-pjtab="artifacts">产物</button>'
    +'</div>'
    +'<div class="sq-tabpane'+(cvProjTab==='plan'?'':' hidden')+'" data-pjpane="plan">'
    +((p.milestones&&p.milestones.length)?'<div class="pj-plan-sec"><div class="pj-plan-k">里程碑</div><div class="pj-ms-list">'+p.milestones.map(function(m){return '<div class="pj-ms-item"><span class="pj-ms-dot"></span><span class="pj-ms-name">'+xesc(m.name)+'</span><span class="pj-ms-date">'+xesc(m.date)+'</span></div>';}).join('')+'</div></div>':'')
    +'<div class="pj-plan-sec"><div class="pj-plan-head"><div class="pj-plan-k">任务规划</div>'
    +'<div class="pj-plan-acts">'
    +'<button type="button" class="sync-btn" data-pj-split><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg>智能拆解父任务</button>'
    +'<button type="button" class="sync-btn sync-btn--ghost" data-pj-split-manual>手动新增父任务</button>'
    +'</div></div>'
    +'<div class="pj-plan-hint">项目下先拆出若干<b>父任务</b>，父任务只用于规划目标与验收标准，<b>不能直接执行</b>；每个父任务再下推为一个或多个<b>子任务</b>，子任务才会进入任务看板由人和 Agent 协作执行。</div>'
    +(epics.length?cvFeaturesHtml(epics):'<div class="sq-empty">还没有父任务，点右上「智能拆解父任务」或「手动新增父任务」</div>')
    +'</div>'
    +unlinkedHtml
    +'</div>'
    +'<div class="sq-tabpane'+(cvProjTab==='members'?'':' hidden')+'" data-pjpane="members">'
    +'<div class="sq-main-head"><div><div class="sq-main-t">成员</div><div class="sq-main-s">该项目有 '+members.length+' 名协作人员</div></div>'
    +'<div class="sq-main-acts"><button type="button" class="sync-btn" data-pj-add><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>添加协作人员</button></div></div>'
    +'<div class="pj-member-list">'+memberHtml+'</div>'
    +'</div>'
    +'<div class="sq-tabpane'+(cvProjTab==='artifacts'?'':' hidden')+'" data-pjpane="artifacts">'
    +artHtml
    +'</div>'
    +'</section></div>';
}
function cvSwitchProjectTab(tab){
  cvProjTab=tab==='members'?'members':(tab==='artifacts'?'artifacts':'plan');
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
    {title:'核心业务模块',desc:'围绕「'+base+'」的核心业务场景、单据与主流程',acceptance:'主流程可跑通，关键单据可正常创建与流转'},
    {title:'审批与流程',desc:'审批链、条件流转与异常节点处理',acceptance:'串行/并行审批均可触发，异常节点可回退'},
    {title:'查询与报表',desc:'列表查询、条件筛选与统计报表',acceptance:'大数据量下查询响应正常，报表口径准确'},
    {title:'系统集成',desc:'与外部系统的接口对接与数据同步',acceptance:'接口鉴权、幂等与异常重试均可用'},
    {title:'权限与安全',desc:'角色分级、数据权限与操作审计',acceptance:'权限变更实时生效，越权操作被拦截'}
  ];
}
function cvEpicSplitCandidates(f){
  var base=f.title;
  return [
    {title:base+' · 需求确认与设计',desc:'明确「'+base+'」的具体交互、数据结构与依赖，输出可执行的实现方案',acceptance:f.acceptance||'关键页面与接口设计通过评审'},
    {title:base+' · 功能实现',desc:f.desc||('实现「'+base+'」的核心功能'),acceptance:f.acceptance||'功能按方案跑通，主流程无阻断缺陷'},
    {title:base+' · 联调与验收',desc:'完成「'+base+'」与关联模块的联调，并对照验收标准自测',acceptance:f.acceptance||'验收标准逐条通过，具备交付条件'}
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
      CV_TASKS.push({boardId:id,kind:'epic',parentTaskId:null,type:'特性',source:'智能规划',sourceId:'FEAT-'+Date.now().toString().slice(-6)+'-'+(n+1),status:'待规划',title:t.title,desc:t.desc,acceptance:t.acceptance||'',files:[],assignee:p.owner||'待分配',priority:p.priority||'中',project:p.id,progress:0,artifacts:[],activity:[{author:'系统',text:'由项目目标智能规划生成父任务'}]});
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
  return '<button type="button" class="pj-task" data-pj-task="'+t.boardId+'">'
    +'<span class="badge-status badge-status--'+sc+'"><span class="badge-status-dot"></span>'+t.status+'</span>'
    +'<span class="pj-task-title">'+xesc(t.title)+'</span>'
    +'<span class="pj-task-meta">'+xesc(t.assignee)+' · '+xesc(t.type)+' · '+xesc(t.sourceId)+'</span>'
    +'</button>';
}
var cvCollapsedEpics={};  /* 记录哪些父任务的子任务列表被折叠，key=epic boardId */
function cvFeaturesHtml(epics){
  if(!epics||!epics.length) return '';
  return '<div class="ft-list">'+epics.map(function(f){
    var children=CV_TASKS.filter(function(t){return t.parentTaskId===f.boardId;});
    var collapsed=!!cvCollapsedEpics[f.boardId];
    var taskBtns=children.map(function(t){
      var sc={'待规划':'pending','待办':'pending','进行中':'running','审核中':'review','已完成':'done','已阻塞':'fail','已取消':'fail'}[t.status]||'pending';
      return '<button type="button" class="ft-task" data-pj-task="'+t.boardId+'"><span class="badge-status-dot"></span><span class="ft-task-title">'+xesc(t.title)+'</span><span class="ft-task-status ft-task-status--'+sc+'">'+xesc(t.status)+'</span></button>';
    }).join('');
    return '<div class="ft-item">'
      +'<div class="ft-item-head"><b>'+xesc(f.title)+'</b>'
      +'<span class="ft-parent-badge" title="父任务只用于规划目标与验收标准，不能直接执行；需下推为子任务后才能进入任务看板执行">父任务 · 不可执行</span>'
      +'<div class="ft-item-acts">'
      +'<button type="button" class="ft-act ft-act--split" data-ft-split="'+f.boardId+'"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg>智能拆解</button>'
      +'<button type="button" class="ft-act ft-act--push" data-ft-push="'+f.boardId+'">手动新增子任务</button>'
      +'<button type="button" class="ft-act" data-ft-edit="'+f.boardId+'">编辑</button>'
      +'<button type="button" class="ft-act ft-act--del" data-ft-del="'+f.boardId+'">删除</button>'
      +'</div></div>'
      +(f.desc?'<div class="ft-item-desc">'+xesc(f.desc)+'</div>':'')
      +(f.files&&f.files.length?'<div class="ft-item-files">附件：'+f.files.map(function(x){return xesc(x);}).join('、')+'</div>':'')
      +(f.acceptance?'<div class="ft-item-accept"><span>验收标准</span>'+xesc(f.acceptance)+'</div>':'')
      +'<div class="ft-tasks'+(collapsed?' is-collapsed':'')+'">'
      +'<button type="button" class="ft-tasks-toggle" data-ft-tasks-toggle="'+f.boardId+'"><svg class="ft-tasks-caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg><span class="ft-tasks-k">子任务 · 可执行 '+children.length+'</span></button>'
      +'<div class="ft-tasks-body">'+(taskBtns||'<span class="ft-tasks-empty">还没有子任务，点「智能拆解」或「手动新增子任务」</span>')+'</div>'
      +'</div>'
      +'</div>';
  }).join('')+'</div>';
}
function cvCurFeature(fid){
  return CV_TASKS.find(function(t){return t.boardId===fid&&t.project===cvProjCur&&t.kind==='epic';})||null;
}

/* ---------- 人工规划：每次创建一个 Epic ---------- */
var cvMsFiles=[];
function cvRenderMsFiles(){
  var el=document.getElementById('cv-ms-files'); if(!el) return;
  el.innerHTML=cvMsFiles.map(function(f,i){return '<span class="ms-file">'+xesc(f)+'<button type="button" class="ms-file-x" data-ms-file-x="'+i+'">×</button></span>';}).join('');
}
function cvMsAddFile(){
  var inp=document.createElement('input');
  inp.type='file';
  inp.multiple=true;
  inp.onchange=function(){
    Array.from(inp.files||[]).forEach(function(f){ cvMsFiles.push(f.name); });
    cvRenderMsFiles();
  };
  inp.click();
}
function cvOpenManualSplit(){
  var p=cvProjectById(cvProjCur); if(!p) return;
  cvMsFiles=[];
  document.getElementById('cv-ms-title').value='';
  document.getElementById('cv-ms-desc').value='';
  document.getElementById('cv-ms-accept').value='';
  cvRenderMsFiles();
  var ov=document.getElementById('cv-manualsplit-overlay'); if(ov) ov.style.display='flex';
}
function cvCloseManualSplit(){ var ov=document.getElementById('cv-manualsplit-overlay'); if(ov) ov.style.display='none'; }
function cvConfirmManualSplit(){
  var p=cvProjectById(cvProjCur); if(!p) return;
  var title=(document.getElementById('cv-ms-title').value||'').trim();
  if(!title){ toast('请填写父任务标题','warning'); return; }
  CV_TASKS.push({boardId:'epic-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,5),kind:'epic',parentTaskId:null,type:'特性',source:'人工规划',sourceId:'FEAT-'+Date.now().toString().slice(-6),status:'待规划',title:title,desc:(document.getElementById('cv-ms-desc').value||'').trim(),files:cvMsFiles.slice(),acceptance:(document.getElementById('cv-ms-accept').value||'').trim(),assignee:p.owner||'待分配',priority:p.priority||'中',project:p.id,progress:0,artifacts:[],activity:[{author:'当前用户',text:'手动创建父任务'}]});
  tbSave();
  cvCloseManualSplit();
  cvRenderProjectDetail();
  toast('已生成父任务：'+title,'success');
}

/* ---------- 父任务编辑 / 删除 / 下推子任务 ---------- */
var cvFeatureEditId='';
var cvFeatureFiles=[];
function cvRenderFeatureFiles(){
  var el=document.getElementById('cv-fe-files'); if(!el) return;
  el.innerHTML=cvFeatureFiles.map(function(f,i){return '<span class="ms-file">'+xesc(f)+'<button type="button" class="ms-file-x" data-fe-file-x="'+i+'">×</button></span>';}).join('');
}
function cvOpenFeatureEdit(fid){
  var f=cvCurFeature(fid); if(!f) return;
  cvFeatureEditId=fid;
  cvFeatureFiles=(f.files||[]).slice();
  document.getElementById('cv-fe-title').value=f.title||'';
  document.getElementById('cv-fe-desc').value=f.desc||'';
  document.getElementById('cv-fe-accept').value=f.acceptance||'';
  cvRenderFeatureFiles();
  var ov=document.getElementById('cv-featureedit-overlay'); if(ov) ov.style.display='flex';
}
function cvCloseFeatureEdit(){ var ov=document.getElementById('cv-featureedit-overlay'); if(ov) ov.style.display='none'; }
function cvFeatureEditAddFile(){
  var inp=document.createElement('input');
  inp.type='file'; inp.multiple=true;
  inp.onchange=function(){ Array.from(inp.files||[]).forEach(function(f){ cvFeatureFiles.push(f.name); }); cvRenderFeatureFiles(); };
  inp.click();
}
function cvSaveFeatureEdit(){
  var f=cvCurFeature(cvFeatureEditId); if(!f) return;
  var title=(document.getElementById('cv-fe-title').value||'').trim();
  if(!title){ toast('请填写父任务标题','warning'); return; }
  f.title=title;
  f.desc=(document.getElementById('cv-fe-desc').value||'').trim();
  f.acceptance=(document.getElementById('cv-fe-accept').value||'').trim();
  f.files=cvFeatureFiles.slice();
  tbSave();
  cvCloseFeatureEdit();
  cvRenderProjectDetail();
  toast('已保存父任务：'+title,'success');
}
function cvDeleteFeature(fid){
  var p=cvProjectById(cvProjCur); if(!p) return;
  var f=cvCurFeature(fid); if(!f) return;
  var children=CV_TASKS.filter(function(t){return t.parentTaskId===fid;});
  if(!window.confirm('删除父任务「'+f.title+'」？其 '+children.length+' 个子任务会保留为未分组任务。')) return;
  children.forEach(function(t){t.parentTaskId=null;});
  CV_TASKS.splice(CV_TASKS.indexOf(f),1);
  tbSave();
  cvRenderProjectDetail();
  toast('已删除父任务：'+f.title,'info');
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
  var idx=CV_TASKS.findIndex(function(t){ return t.boardId===taskId; });
  if(idx<0) return;
  cvSetProject(CV_TASKS[idx].project);
  cvSwitchView('tasks');
  tbOpenTask(idx);
}
function cvOpenProjectDetail(id){
  cvProjCur=id;
  cvProjTab='plan';
  var list=$('#cv-proj-list'),detail=$('#cv-proj-detail');
  if(list) list.classList.add('hidden');
  if(detail){ detail.classList.remove('hidden'); cvRenderProjectDetail(); }
}
function cvHideProjectDetail(){
  cvProjCur='';
  var list=$('#cv-proj-list'),detail=$('#cv-proj-detail');
  if(detail) detail.classList.add('hidden');
  if(list){ list.classList.remove('hidden'); cvRenderProjectList(); }
}

/* ---------- 人员基础资料：新增 / 编辑 ---------- */
function cvSetPField(k,val){ var e=$('#cv-ps-'+k); if(e) e.value=val||''; }
function cvOpenPersonNew(){
  cvPersonEditId='';
  cvSetPField('name','');cvSetPField('email','');cvSetPField('dept','');cvSetPField('role','开发');
  var ov=$('#cv-personedit-overlay'); if(ov) ov.style.display='flex';
  var tt=$('#cv-pedit-title'); if(tt) tt.textContent='新增人员';
}
function cvOpenPersonEdit(pid){
  var p=cvPersonById(pid); if(!p) return;
  cvPersonEditId=pid;
  cvSetPField('name',p.name);cvSetPField('email',p.email);cvSetPField('dept',p.dept||'');
  cvSetPField('role',(p.roles[0]||{}).text||'开发');
  var ov=$('#cv-personedit-overlay'); if(ov) ov.style.display='flex';
  var tt=$('#cv-pedit-title'); if(tt) tt.textContent='编辑人员';
}
function cvClosePersonEdit(){ var ov=$('#cv-personedit-overlay'); if(ov) ov.style.display='none'; }
function cvSavePersonEdit(){
  var g=function(k){ var e=$('#cv-ps-'+k); return e?e.value.trim():''; };
  var name=g('name');
  if(!name){ toast('请填写姓名','error'); return; }
  var role=g('role')||'开发';
  var tagMap={'开发':'member-tag--dev','架构':'member-tag--arch','测试':'member-tag--qa','运维':'member-tag--ops','需求':'member-tag--pm','产品':'member-tag--pm','所有者':'member-tag--owner'};
  var isNew=!cvPersonEditId;
  if(isNew){
    var pid='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    CV_MEMBERS.push({id:pid,name:name,email:g('email'),dept:g('dept'),roles:[{tag:tagMap[role]||'member-tag--dev',text:role}],status:'available',source:'直接添加'});
  }else{
    var p=cvPersonById(cvPersonEditId); if(!p) return;
    p.name=name;p.email=g('email');p.dept=g('dept');p.roles=[{tag:tagMap[role]||'member-tag--dev',text:role}];
  }
  cvPersistPersons();
  cvClosePersonEdit();
  cvRenderProjectDetail(); cvRenderPermTable();
  toast(isNew?'已新增人员：'+name:'已保存人员：'+name);
}

/* ---------- 选人：加入当前项目详情 ---------- */
function cvOpenAddToProject(){
  if(!cvProjCur){ toast('请先进入一个项目','warning'); return; }
  var ov=$('#cv-addtoproj-overlay'); if(ov) ov.style.display='flex';
  cvSearchProjectPersons('');
}
function cvCloseAddToProject(){ var ov=$('#cv-addtoproj-overlay'); if(ov) ov.style.display='none'; }
function cvSearchProjectPersons(q){
  var el=$('#cv-atp-list'); if(!el) return;
  q=(q||'').toLowerCase();
  var proj=cvProjectById(cvProjCur);
  var inProj=proj?(proj.members||[]):[];
  var list=CV_MEMBERS.filter(function(m){
    return inProj.indexOf(m.id)<0
      && (m.name.toLowerCase().indexOf(q)>=0 || (m.email||'').toLowerCase().indexOf(q)>=0 || (m.dept||'').toLowerCase().indexOf(q)>=0);
  });
  if(!list.length){ el.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-soft);font-size:13px">没有可添加的人员，请先在「设置 · 人员与权限」维护人员</div>'; return; }
  el.innerHTML=list.map(function(m){
    return '<div class="tp-item" onclick="this.classList.toggle(\'tp-item--selected\')">'
      +'<div class="tp-avatar">'+xesc(m.name[0]||'?')+'</div>'
      +'<div class="tp-info"><div class="tp-name">'+xesc(m.name)+'</div><div class="tp-email">'+xesc(m.email||'')+'</div></div>'
      +'<div class="tp-meta"><span class="tp-role">'+xesc((m.roles[0]||{}).text||'')+'</span><span class="tp-dept">'+xesc(m.dept||'')+'</span></div>'
      +'<div class="tp-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>'
      +'</div>';
  }).join('');
}
function cvConfirmAddToProject(){
  var proj=cvProjectById(cvProjCur); if(!proj) return;
  var selected=document.querySelectorAll('#cv-atp-list .tp-item--selected');
  if(!selected.length){ toast('请选择要添加的人员','warning'); return; }
  var n=0;
  selected.forEach(function(el){
    var name=el.querySelector('.tp-name').textContent;
    var p=CV_MEMBERS.filter(function(m){return m.name===name;})[0];
    if(p && (proj.members||[]).indexOf(p.id)<0){ proj.members=proj.members||[]; proj.members.push(p.id); n++; }
  });
  cvPersistProjects();
  cvCloseAddToProject();
  cvRenderProjectDetail();
  toast('已添加 '+n+' 名协作人员到「'+proj.name+'」','success');
}
function cvRemoveFromProject(pid){
  var proj=cvProjectById(cvProjCur); if(!proj) return;
  var p=cvPersonById(pid); if(!p) return;
  proj.members=(proj.members||[]).filter(function(id){return id!==pid;});
  cvPersistProjects();
  cvRenderProjectDetail();
  toast('已将 '+p.name+' 移出「'+proj.name+'」','info');
}
function cvDeletePerson(pid){
  var p=cvPersonById(pid); if(!p) return;
  if(cvIsMe(p)){ toast('不能删除自己','warning'); return; }
  CV_PROJECTS.forEach(function(pr){ pr.members=(pr.members||[]).filter(function(id){return id!==pid;}); });
  cvSquadDetachMember(pid);
  CV_MEMBERS.splice(CV_MEMBERS.indexOf(p),1);
  cvPersistPersons(); cvPersistProjects(); cvPersistSquads();
  cvRenderProjectDetail(); cvRenderProjectList(); cvRenderPermTable();
  toast('已删除人员：'+p.name,'info');
}

/* ---------- 人员与权限：成员 + 角色，支持新增 / 修改 / 删除 ---------- */
function cvRenderPermTable(){
  var el=$('#cv-perm-table'); if(!el) return;
  var cnt=$('#cv-perm-count'); if(cnt) cnt.textContent=CV_MEMBERS.length;
  el.innerHTML='<div class="cfg-table">'
    +'<div class="cfg-table-head cv-perm-head"><span>成员</span><span>角色</span><span>操作</span></div>'
    +CV_MEMBERS.map(function(p){
      var roles=p.roles.map(function(r){return '<span class="ps-role">'+xesc(r.text)+'</span>';}).join('');
      return '<div class="cfg-table-row cv-perm-row">'
        +'<span class="cfg-t-name">'+cvPersonAvHtml(p,'ps-av')+'<span class="cv-proj-desc-wrap"><b>'+xesc(p.name)+(cvIsMe(p)?'<span class="ps-me">我</span>':'')+'</b><em class="cv-proj-desc">'+xesc(p.email||'')+'</em></span></span>'
        +'<span class="ps-roles">'+roles+'</span>'
        +'<span class="cv-perm-acts"><button type="button" class="act-btn" data-ps-edit="'+p.id+'">修改</button>'
        +(cvIsMe(p)?'':'<button type="button" class="act-btn act-btn--danger" data-ps-del="'+p.id+'">删除</button>')+'</span>'
        +'</div>';
    }).join('')
    +'</div>';
}

export function initCollabPersons(){
  var plist=$('#cv-proj-list');
  if(plist) plist.addEventListener('click',function(e){
    var set=e.target.closest('[data-pj-set]');
    if(set){ window.cvOpenProjEdit && window.cvOpenProjEdit(set.getAttribute('data-pj-set')); return; }
    var open=e.target.closest('[data-pj-open]');
    if(open){ cvOpenProjectDetail(open.getAttribute('data-pj-open')); return; }
  });
  var pdetail=$('#cv-proj-detail');
  if(pdetail) pdetail.addEventListener('click',function(e){
    if(e.target.closest('[data-pj-back]')){ cvHideProjectDetail(); return; }
    var tab=e.target.closest('[data-pjtab]');
    if(tab){ cvSwitchProjectTab(tab.getAttribute('data-pjtab')); return; }
    if(e.target.closest('[data-pj-split]')){ cvOpenProjectSplit(); return; }
    if(e.target.closest('[data-pj-split-manual]')){ cvOpenManualSplit(); return; }
    var esplit=e.target.closest('[data-ft-split]');
    if(esplit){ cvOpenEpicSplit(esplit.getAttribute('data-ft-split')); return; }
    var ftoggle=e.target.closest('[data-ft-tasks-toggle]');
    if(ftoggle){ var fid=ftoggle.getAttribute('data-ft-tasks-toggle'); cvCollapsedEpics[fid]=!cvCollapsedEpics[fid]; cvRenderProjectDetail(); return; }
    var push=e.target.closest('[data-ft-push]');
    if(push){ cvPushFeatureToTask(push.getAttribute('data-ft-push')); return; }
    var fedit=e.target.closest('[data-ft-edit]');
    if(fedit){ cvOpenFeatureEdit(fedit.getAttribute('data-ft-edit')); return; }
    var fdel=e.target.closest('[data-ft-del]');
    if(fdel){ cvDeleteFeature(fdel.getAttribute('data-ft-del')); return; }
    var tv=e.target.closest('[data-pj-task]');
    if(tv){ cvOpenTaskById(tv.getAttribute('data-pj-task')); return; }
    var add=e.target.closest('[data-pj-add]');
    if(add){ cvOpenAddToProject(); return; }
    var rm=e.target.closest('[data-pj-remove]');
    if(rm){ cvRemoveFromProject(rm.getAttribute('data-pj-remove')); return; }
    var set=e.target.closest('[data-pj-set]');
    if(set){ window.cvOpenProjEdit && window.cvOpenProjEdit(set.getAttribute('data-pj-set')); return; }
  });
  var permTable=$('#cv-perm-table');
  if(permTable) permTable.addEventListener('click',function(e){
    var ed=e.target.closest('[data-ps-edit]');
    if(ed){ cvOpenPersonEdit(ed.getAttribute('data-ps-edit')); return; }
    var del=e.target.closest('[data-ps-del]');
    if(del){ cvDeletePerson(del.getAttribute('data-ps-del')); return; }
  });
  var splitBody=$('#cv-split-body');
  if(splitBody) splitBody.addEventListener('change',function(e){
    if(e.target.closest('[data-split-idx]')) cvUpdateSplitCount();
  });
  var msFiles=$('#cv-ms-files');
  if(msFiles) msFiles.addEventListener('click',function(e){
    var x=e.target.closest('[data-ms-file-x]');
    if(x){ cvMsFiles.splice(+x.getAttribute('data-ms-file-x'),1); cvRenderMsFiles(); }
  });
  var feFiles=$('#cv-fe-files');
  if(feFiles) feFiles.addEventListener('click',function(e){
    var x=e.target.closest('[data-fe-file-x]');
    if(x){ cvFeatureFiles.splice(+x.getAttribute('data-fe-file-x'),1); cvRenderFeatureFiles(); }
  });
}

/* ---------- 产物预览：代码类产物弹文件列表 ---------- */
function cvOpenArtFiles(name){
  var a=CV_ARTIFACTS.filter(function(x){return x.name===name;})[0];
  if(!a) return;
  if(!(a.files&&a.files.length)){ toast('原型演示：预览「'+name+'」'); return; }
  var title=document.getElementById('cv-artfiles-title'); if(title) title.textContent=a.name;
  var el=document.getElementById('cv-artfiles-list'); if(!el) return;
  el.innerHTML=a.files.map(function(f){
    return '<div class="art-file-row"><span class="art-file-ic">📄</span><span class="art-file-name">'+xesc(f)+'</span></div>';
  }).join('');
  var ov=document.getElementById('cv-artfiles-overlay'); if(ov) ov.style.display='flex';
}
function cvCloseArtFiles(){ var ov=document.getElementById('cv-artfiles-overlay'); if(ov) ov.style.display='none'; }

export { cvCloseAddToProject, cvCloseArtFiles, cvCloseFeatureEdit, cvCloseManualSplit, cvClosePersonEdit, cvCloseProjectSplit, cvConfirmAddToProject, cvConfirmManualSplit, cvConfirmProjectSplit, cvDeletePerson, cvFeatureEditAddFile, cvHideProjectDetail, cvMsAddFile, cvOpenAddToProject, cvOpenArtFiles, cvOpenManualSplit, cvOpenPersonEdit, cvOpenPersonNew, cvOpenProjectDetail, cvOpenProjectSplit, cvRemoveFromProject, cvRenderPermTable, cvRenderProjectDetail, cvRenderProjectList, cvSaveFeatureEdit, cvSavePersonEdit, cvSearchProjectPersons };
