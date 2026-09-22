import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { CV_MEMBERS, CV_PROJECTS, CV_ARTIFACTS, CV_TASKS, cvPersistPersons, cvPersistProjects, cvPersonById, cvProjectById, cvProjectInWorkspace } from './data.js';
import { cvPersistSquads, cvSquadDetachMember } from './squads.js';
import { xesc } from '../expert/data.js';
import { tbSave } from './tb-core.js';
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
  var color=p.isMe?'#08a040':cvPsColor(p.id);
  return '<span class="'+cls+'" style="background:'+color+'">'+xesc(p.name[0]||'?')+'</span>';
}

/* ---------- 项目列表 ---------- */
function cvRenderProjectList(){
  var el=$('#cv-proj-list'); if(!el) return;
  var list=CV_PROJECTS.filter(function(p){return cvProjectInWorkspace(p.id);});
  var cnt=$('#cv-proj-count'); if(cnt) cnt.textContent=list.length;
  if(!list.length){ el.innerHTML='<div class="x-empty">当前工作区还没有项目，点右上「新建项目」</div>'; return; }
  el.innerHTML=list.map(function(p){
    var members=(p.members||[]).map(cvPersonById).filter(Boolean);
    var stack=members.slice(0,4).map(function(m){return cvPersonAvHtml(m,'ps-av-sm');}).join('');
    if(members.length>4) stack+='<span class="ps-av-sm ps-av-more">+'+(members.length-4)+'</span>';
    return '<div class="pj-card" data-pj-open="'+p.id+'">'
      +'<div class="pj-head"><span class="pj-dot" style="background:'+(CV_PROJ_DOT_COLORS[p.dot]||'#b8b8b8')+'"></span><span class="pj-name">'+xesc(p.name)+'</span><span class="pj-pri">'+xesc(p.priority||'中')+'</span></div>'
      +(p.desc?'<div class="pj-desc">'+xesc(p.desc)+'</div>':'')
      +'<div class="pj-meta"><span class="pj-owner">负责人 <b>'+xesc(p.owner||'未设置')+'</b></span><span class="pj-mcount">'+members.length+' 位协作人员</span></div>'
      +'<div class="pj-foot"><div class="pj-stack">'+stack+'</div><button type="button" class="pj-set" data-pj-set="'+p.id+'" data-perm="owner">设置</button></div>'
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
      +'<div class="sq-member-line"><span class="sq-member-name">'+xesc(m.name)+(m.isMe?'<span class="ps-me">我</span>':'')+'</span><span class="sq-member-kind">'+roles+'</span></div>'
      +'<div class="sq-member-sub">'+xesc(m.email||'')+(m.dept?' · '+xesc(m.dept):'')+'</div>'
      +'</div>'
      +'<button type="button" class="pj-remove" data-pj-remove="'+m.id+'">移除</button>'
      +'</div>';
  }).join(''):'<div class="sq-empty">该项目还没有协作人员，点「添加协作人员」选人</div>';
  var tasks=CV_TASKS.filter(function(t){return t.project===cvProjCur;});
  var statusMap={'未开始':'pending','待评审':'review','进行中':'running','已完成':'done','已失败':'fail'};
  var taskHtml=tasks.length?tasks.map(function(t){
    var sc=statusMap[t.status]||'pending';
    return '<div class="pj-task">'
      +'<span class="badge-status badge-status--'+sc+'"><span class="badge-status-dot"></span>'+t.status+'</span>'
      +'<span class="pj-task-title">'+xesc(t.title)+'</span>'
      +'<span class="pj-task-meta">'+xesc(t.assignee)+' · '+xesc(t.type)+' · '+xesc(t.sourceId)+'</span>'
      +'</div>';
  }).join(''):'<div class="sq-empty">该项目还没有任务</div>';
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
  el.innerHTML='<div class="pj-crumb">'
    +'<button type="button" class="pj-back" data-pj-back>项目管理</button>'
    +'<span class="pj-crumb-sep">›</span>'
    +'<span class="pj-dot pj-dot--sm" style="background:'+(CV_PROJ_DOT_COLORS[p.dot]||'#b8b8b8')+'"></span>'
    +'<span class="pj-crumb-name">'+xesc(p.name)+'</span>'
    +'<button type="button" class="pj-set pj-set--crumb" data-pj-set="'+p.id+'" data-perm="owner">设置</button>'
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
    +'<div class="sq-kv"><span>协作人员</span><b>'+members.length+'</b></div>'
    +'<div class="sq-kv"><span>任务</span><b>'+tasks.length+'</b></div>'
    +'</div></aside>'
    +'<section class="sq-main">'
    +'<div class="sq-tabs">'
    +'<button type="button" class="sq-tab'+(cvProjTab==='plan'?' on':'')+'" data-pjtab="plan">任务规划</button>'
    +'<button type="button" class="sq-tab'+(cvProjTab==='members'?' on':'')+'" data-pjtab="members">成员</button>'
    +'<button type="button" class="sq-tab'+(cvProjTab==='tasks'?' on':'')+'" data-pjtab="tasks">关联任务</button>'
    +'<button type="button" class="sq-tab'+(cvProjTab==='artifacts'?' on':'')+'" data-pjtab="artifacts">产物</button>'
    +'</div>'
    +'<div class="sq-tabpane'+(cvProjTab==='plan'?'':' hidden')+'" data-pjpane="plan">'
    +((p.milestones&&p.milestones.length)?'<div class="pj-plan-sec"><div class="pj-plan-k">里程碑</div><div class="pj-ms-list">'+p.milestones.map(function(m){return '<div class="pj-ms-item"><span class="pj-ms-dot"></span><span class="pj-ms-name">'+xesc(m.name)+'</span><span class="pj-ms-date">'+xesc(m.date)+'</span></div>';}).join('')+'</div></div>':'')
    +'<div class="pj-plan-sec"><div class="pj-plan-head"><div class="pj-plan-k">任务拆分</div>'
    +'<button type="button" class="sync-btn" data-pj-split><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>智能拆解</button></div>'
    +'<div class="pj-plan-hint">基于项目目标与描述，把工作拆成可执行的 Work Item，并关联验收标准与依赖关系，拆解结果进入「关联任务」。</div></div>'
    +'</div>'
    +'<div class="sq-tabpane'+(cvProjTab==='members'?'':' hidden')+'" data-pjpane="members">'
    +'<div class="sq-main-head"><div><div class="sq-main-t">成员</div><div class="sq-main-s">该项目有 '+members.length+' 名协作人员</div></div>'
    +'<div class="sq-main-acts"><button type="button" class="sync-btn" data-pj-add><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>添加协作人员</button></div></div>'
    +'<div class="pj-member-list">'+memberHtml+'</div>'
    +'</div>'
    +'<div class="sq-tabpane'+(cvProjTab==='tasks'?'':' hidden')+'" data-pjpane="tasks">'
    +'<div class="sq-main-head"><div><div class="sq-main-t">关联任务</div><div class="sq-main-s">该项目有 '+tasks.length+' 个任务</div></div></div>'
    +'<div class="pj-task-list">'+taskHtml+'</div>'
    +'</div>'
    +'<div class="sq-tabpane'+(cvProjTab==='artifacts'?'':' hidden')+'" data-pjpane="artifacts">'
    +artHtml
    +'</div>'
    +'</section></div>';
}
function cvSwitchProjectTab(tab){
  cvProjTab=tab==='members'?'members':(tab==='tasks'?'tasks':(tab==='artifacts'?'artifacts':'plan'));
  cvRenderProjectDetail();
}

/* ---------- 智能拆解：调用智能体，对话输出拆解结果，逐项确认后生成 ---------- */
var cvSplitItems=[];
function cvSplitCandidates(p){
  var base=p.desc||p.name;
  return [
    {title:p.name+'：需求梳理与规格定义',desc:'梳理'+base+'的业务流程、单据字段与验收标准'},
    {title:p.name+'：技术方案设计',desc:'确定'+base+'的技术选型、数据模型与集成方案'},
    {title:p.name+'：核心功能开发',desc:'按方案实现'+base+'的核心功能与后端插件'},
    {title:p.name+'：测试用例与回归',desc:'覆盖'+base+'的主流程、边界与异常场景'},
    {title:p.name+'：部署与监控接入',desc:base+'的灰度发布、回滚与监控告警配置'}
  ];
}
function cvOpenProjectSplit(){
  var p=cvProjectById(cvProjCur); if(!p) return;
  cvSplitItems=cvSplitCandidates(p);
  var body=document.getElementById('cv-split-body'); if(!body) return;
  body.innerHTML='<div class="split-msg split-msg--user">请使用用户故事拆分，基于项目目标「'+xesc(p.goal||p.name)+'」帮我拆分任务</div>'
    +'<div class="split-msg split-msg--agent" id="cv-split-agent-msg"><div class="split-thinking"><i></i><i></i><i></i></div><span class="split-thinking-t">正在思考…</span></div>';
  var ov=document.getElementById('cv-splittask-overlay'); if(ov) ov.style.display='flex';
  setTimeout(cvRenderSplitResult, 900);
}
function cvRenderSplitResult(){
  var msg=document.getElementById('cv-split-agent-msg'); if(!msg) return;
  msg.innerHTML='<div class="split-agent-t">已根据项目目标拆出 '+cvSplitItems.length+' 个可执行任务，请逐项确认（不需要的取消勾选）：</div>'
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
  if(!checked.length){ toast('请至少确认一个任务','warning'); return; }
  var n=0;
  checked.forEach(function(cb){
    var t=cvSplitItems[+cb.getAttribute('data-split-idx')]; if(!t) return;
    CV_TASKS.unshift({boardId:crypto.randomUUID(),type:'任务',size:'小',source:'智能拆解',sourceId:'TASK-'+Date.now().toString().slice(-6)+'-'+n,exec:'专家团',status:'未开始',collab:'人Agent协作',mode:'多人协作',priority:p.priority||'中',title:t.title,desc:t.desc,assignee:'待分配',progress:0,project:p.id,teamId:p.defaultTeam||'',acceptance:t.desc,files:[],artifacts:[],activity:[{author:'智能拆解',text:'由项目目标生成任务'}]});
    n++;
  });
  tbSave();
  cvCloseProjectSplit();
  cvRenderProjectDetail();
  toast('已确认生成 '+n+' 个任务','success');
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
  if(p.isMe){ toast('不能删除自己','warning'); return; }
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
        +'<span class="cfg-t-name">'+cvPersonAvHtml(p,'ps-av')+'<span class="cv-proj-desc-wrap"><b>'+xesc(p.name)+(p.isMe?'<span class="ps-me">我</span>':'')+'</b><em class="cv-proj-desc">'+xesc(p.email||'')+'</em></span></span>'
        +'<span class="ps-roles">'+roles+'</span>'
        +'<span class="cv-perm-acts"><button type="button" class="act-btn" data-ps-edit="'+p.id+'">修改</button>'
        +(p.isMe?'':'<button type="button" class="act-btn act-btn--danger" data-ps-del="'+p.id+'">删除</button>')+'</span>'
        +'</div>';
    }).join('')
    +'</div>';
}

export function initCollabPersons(){
  var plist=$('#cv-proj-list');
  if(plist) plist.addEventListener('click',function(e){
    var open=e.target.closest('[data-pj-open]');
    if(open){ cvOpenProjectDetail(open.getAttribute('data-pj-open')); return; }
    var set=e.target.closest('[data-pj-set]');
    if(set){ window.cvOpenProjEdit && window.cvOpenProjEdit(set.getAttribute('data-pj-set')); return; }
  });
  var pdetail=$('#cv-proj-detail');
  if(pdetail) pdetail.addEventListener('click',function(e){
    if(e.target.closest('[data-pj-back]')){ cvHideProjectDetail(); return; }
    var tab=e.target.closest('[data-pjtab]');
    if(tab){ cvSwitchProjectTab(tab.getAttribute('data-pjtab')); return; }
    if(e.target.closest('[data-pj-split]')){ cvOpenProjectSplit(); return; }
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

export { cvCloseAddToProject, cvCloseArtFiles, cvClosePersonEdit, cvCloseProjectSplit, cvConfirmAddToProject, cvConfirmProjectSplit, cvDeletePerson, cvHideProjectDetail, cvOpenAddToProject, cvOpenArtFiles, cvOpenPersonEdit, cvOpenPersonNew, cvOpenProjectDetail, cvOpenProjectSplit, cvRemoveFromProject, cvRenderPermTable, cvRenderProjectDetail, cvRenderProjectList, cvSavePersonEdit, cvSearchProjectPersons };
