import { cvInProject, cvProjectTag } from './workspace-projects.js';
import { CV_REVIEWS, CV_TASKS } from './legacy-demo.js';
/* 协作数据：任务 / 评审卡片渲染与注入接口（拆自 collab/data.js） */

var CV_WORKFLOW = ['需求分析','方案设计','开发实现','代码审查','测试验证','部署发布'];
var CV_WORKFLOW_ROLES = {'需求分析':'需求人员','方案设计':'架构人员','开发实现':'开发人员','代码审查':'开发人员','测试验证':'测试人员','部署发布':'运维人员'};
/* 数据层只发布刷新信号，由任务看板在初始化时接入具体渲染器，避免反向依赖。 */
var taskRenderers={summary:function(){},board:function(){}};
function setTaskRenderers(renderers){
  taskRenderers={...taskRenderers,...(renderers||{})};
}
var openConversation=function(){};
function setConversationOpener(handler){
  openConversation=typeof handler==='function'?handler:openConversation;
}
var CV_THIRD_PARTY_MEMBERS=[
  {name:'钱涛',email:'qian***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
  {name:'宋宇',email:'song***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
  {name:'冯远',email:'feng***@kingdee.com',role:'架构',tag:'member-tag--arch',dept:'架构部'},
  {name:'许诺',email:'xu***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
  {name:'韩梅',email:'han***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
  {name:'罗静',email:'luo***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
  {name:'杨帆',email:'yang***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'},
  {name:'唐辉',email:'tang***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'},
  {name:'蒋雯',email:'jiang***@kingdee.com',role:'需求',tag:'member-tag--pm',dept:'产品部'},
  {name:'何欣',email:'he***@kingdee.com',role:'需求',tag:'member-tag--pm',dept:'产品部'},
  {name:'梁平',email:'liang***@kingdee.com',role:'产品',tag:'member-tag--pm',dept:'产品部'},
  {name:'范晨',email:'fan***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
  {name:'董睿',email:'dong***@kingdee.com',role:'架构',tag:'member-tag--arch',dept:'架构部'},
  {name:'贾旭',email:'jia***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
  {name:'武威',email:'wu***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'}
];

function cvRenderTaskStats(){
  taskRenderers.summary();
}
function cvRenderTasks(){
  taskRenderers.board();
}

function cvBuildTaskCard(t,i){
  var typeCls={'需求':'badge-type','Bug':'badge-bug','任务':'badge-task','改进':'badge-improve'}[t.type]||'badge-type';
  var sizeCls=t.size==='大'?'badge-size-l':'badge-size-s';
  var srcCls={'Jira':'source-tag--jira','TAPD':'source-tag--tapd','对话自建':'source-tag--build','API':'source-tag--api','飞书':'source-tag--feishu'}[t.source]||'source-tag--build';
  var execCls=(t.exec==='智能体团队'||t.exec==='智能体团队')?'badge-expert':'badge-auto';
  var statusMap={'未开始':'pending','待评审':'review','进行中':'running','已完成':'done','已失败':'fail'};
  var sc=statusMap[t.status]||'pending';
  var nodeMap={'未开始':'需求分析','待评审':'代码审查','进行中':'开发实现','已完成':'部署发布','已失败':'开发实现'};
  var node=nodeMap[t.status]||'需求分析';
  return '<div class="card" data-type="'+t.type+'" data-status="'+t.status+'" data-collab="'+t.collab+'" data-size="'+t.size+'" data-idx="'+i+'">'
    +'<div class="card-top"><div class="card-row">'
    +'<span class="badge '+typeCls+'">'+t.type+'</span>'
    +'<span class="badge '+sizeCls+'">'+t.size+'</span>'
    +'<span class="source-tag '+srcCls+'">'+t.source+'</span>'
    +'<span class="badge-status badge-status--'+sc+'"><span class="badge-status-dot"></span>'+t.status+'</span>'
    +cvProjectTag(t)
    +'</div><span class="badge '+execCls+'">'+t.exec+'</span></div>'
    +'<div class="card-title">'+t.title+'</div>'
    +'<div class="card-desc">'+t.desc+'</div>'
    +'<div class="card-footer"><div class="assignee"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'+t.assignee+'</div><span style="font-size:var(--font-size-12, 12px);color:var(--text-soft)">'+t.source+' '+t.sourceId+'</span></div>'
    +'</div>';
}
function cvRenderReviewStats(){
  var el=document.getElementById('cv-review-stats');if(!el)return;
  var rows=CV_REVIEWS.filter(cvInProject);
  var urgent=rows.filter(function(r){return r.priority==='紧急';}).length;
  var mine=rows.filter(function(r){return r.from==='张工';}).length;
  var assigned=rows.filter(function(r){return r.reviewer==='张工';}).length;
  var stats=[
    {num:rows.length,label:'待评审',color:'var(--warning)',filter:'全部待评审'},
    {num:urgent,label:'即将到期',color:'var(--danger)',filter:'紧急'},
    {num:mine,label:'我发起的',color:'var(--dot-blue)',filter:'我发起的'},
    {num:assigned,label:'分配给我',color:'var(--success)',filter:'分配给我的'}
  ];
  el.innerHTML=stats.map(function(s){
    return '<div class="stat" onclick="cvClickReviewStat(this,\''+s.filter+'\')"><div class="stat-num" style="color:'+s.color+'">'+s.num+'</div><div class="stat-label">'+s.label+'</div></div>';
  }).join('');
}
function cvRenderReviews(){
  var grid=document.getElementById('cv-review-grid');if(!grid)return;
  grid.innerHTML=CV_REVIEWS.map(function(r,i){return cvInProject(r)?cvBuildReviewCard(r,i):'';}).join('');
  if(!grid.innerHTML) grid.innerHTML='<div class="x-empty">该项目下没有待评审的内容</div>';
}
function cvBuildReviewCard(r,i){
  var typeCls={'需求':'badge-type','Bug':'badge-bug','任务':'badge-task','改进':'badge-improve'}[r.type]||'badge-type';
  var sizeCls=r.size==='大'?'badge-size-l':'badge-size-s';
  var srcCls={'Jira':'source-tag--jira','TAPD':'source-tag--tapd','对话自建':'source-tag--build','API':'source-tag--api','飞书':'source-tag--feishu'}[r.source]||'source-tag--build';
  var artHtml=r.artifacts.map(function(a){return '<span class="review-artifact">'+a+'</span>';}).join(' · ');
  return '<div class="card" data-idx="'+i+'" onclick="cvOpenReviewDetail('+i+')">'
    +'<div class="card-top"><div class="card-row">'
    +'<span class="badge '+typeCls+'">'+r.type+'</span>'
    +'<span class="badge '+sizeCls+'">'+r.size+'</span>'
    +'<span class="source-tag '+srcCls+'">'+r.source+'</span>'
    +'<span class="badge-status badge-status--review"><span class="badge-status-dot"></span>待评审</span>'
    +cvProjectTag(r)
    +'</div><span class="badge badge-expert">'+r.exec+'</span></div>'
    +'<div class="card-title">'+r.title+'</div>'
    +'<div class="card-desc">'+r.desc+'</div>'
    +'<div class="review-info">'
    +'<div class="review-info-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>评审人: <b>'+r.reviewer+'</b> <span>('+r.reviewerRole+')</span></div>'
    +'<div class="review-info-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="'+r.deadlineColor+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>截止: <b style="color:'+r.deadlineColor+'">'+r.deadline+'</b></div>'
    +'<div class="review-info-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>产物: '+artHtml+'</div>'
    +'</div>'
    +'<div class="card-actions"><span class="card-node"><span class="card-node-dot"></span>'+r.reviewType+'</span><div style="display:flex;gap:4px;margin-left:auto">'
    +'<button class="act-btn act-btn--exec" onclick="event.stopPropagation();cvReviewPass('+i+')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>通过</button>'
    +'<button class="act-btn act-btn--reject" onclick="event.stopPropagation();cvReviewReject('+i+')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>驳回</button>'
    +'<button class="card-view-btn" onclick="event.stopPropagation();cvOpenReviewDetail('+i+')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>查看对话</button>'
    +'</div></div></div>';
}
function cvInjectCardActions(){
  if(document.getElementById('tb-layout')) return;
  document.querySelectorAll('#cv-task-grid .card').forEach(function(card){
    if(card.querySelector('.card-actions'))return;
    var idx=parseInt(card.getAttribute('data-idx'));
    var t=CV_TASKS[idx];if(!t)return;
    var status=t.status;
    var nodeMap={'未开始':'需求分析','待评审':'代码审查','进行中':'开发实现','已完成':'部署发布','已失败':'开发实现'};
    var node=nodeMap[status]||'需求分析';
    var execBtn='<button class="act-btn act-btn--exec" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-exec-overlay\')" title="执行任务"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>执行</button>';
    var transferBtn='<button class="act-btn act-btn--transfer" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-transfer-overlay\')" title="转交任务"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>转交</button>';
    var twistBtn='<button class="act-btn act-btn--twist" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-twist-overlay\')" title="流转任务"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.7"/><polyline points="21 3 21 9 15 9"/></svg>流转</button>';
    var reviewBtn='<button class="act-btn act-btn--review" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-review-overlay\')" title="发起评审"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>评审</button>';
    var viewBtn='<button class="card-view-btn" onclick="event.stopPropagation();cvOpenConversation(this.closest(\'.card\'))" title="查看对话"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>查看对话</button>';
    var btns='';
    if(status==='未开始'){btns=execBtn+transferBtn+twistBtn+reviewBtn;}
    else if(status==='待评审'){btns=reviewBtn+viewBtn;}
    else{btns=viewBtn;card.classList.add('card--clickable');card.onclick=function(e){if(!e.target.closest('.act-btn')&&!e.target.closest('.card-view-btn'))openConversation(card);};}
    var ad=document.createElement('div');ad.className='card-actions';
    ad.innerHTML='<span class="card-node"><span class="card-node-dot"></span>'+node+'</span><div style="display:flex;gap:4px;margin-left:auto">'+btns+'</div>';
    card.appendChild(ad);
    if(status==='进行中'){}
  });
}

export { CV_THIRD_PARTY_MEMBERS, CV_WORKFLOW, CV_WORKFLOW_ROLES, cvInjectCardActions, cvRenderReviewStats, cvRenderReviews, cvRenderTaskStats, cvRenderTasks, setConversationOpener, setTaskRenderers };
