/* 协作人员：团队维度
   团队是跨项目的协作单元，与项目不挂钩；列表一行一个团队，点进去看成员与指引，
   布局参考「团队 / 成员 / 指引」两段式详情。团队成员通过 pid 引用人员基础资料。 */
import { cvIsMe, cvPersonById } from './data.js';
import { xesc } from '../expert/data.js';

var CV_SQUADS=[
   {id:'sq-crm',name:'CRM系统开发团队',desc:'负责 CRM 系统需求开发与交付',creator:'吴宏超',created:'23 小时前',updated:'23 小时前',archived:false,
    members:[
      {kind:'person',pid:'p01',role:'leader',sub:'leader'},
      {kind:'person',pid:'p04',role:'member',sub:'添加角色...'},
      {kind:'person',pid:'p05',role:'member',sub:'添加角色...'}
    ]},
   {id:'sq-zx',name:'振兴开发团队',desc:'负责需求开发',creator:'吴宏超',created:'2 天前',updated:'1 天前',archived:false,
    members:[
      {kind:'person',pid:'p03',role:'leader',sub:'leader'},
      {kind:'person',pid:'p02',role:'member',sub:'添加角色...'},
      {kind:'person',pid:'p07',role:'member',sub:'添加角色...'}
    ]}
];
var CV_SQUAD_COLORS=['#7c5cfc','#ff8d42','#08a040','#4d89ff','#e04a3a','#c06010'];
var cvSquadCur='';   /* 详情正在看的团队 id，空表示列表视图 */
var cvSquadTab='members';

function cvSquadById(id){
  for(var i=0;i<CV_SQUADS.length;i++){ if(CV_SQUADS[i].id===id) return CV_SQUADS[i]; }
  return null;
}
/* 团队与成员改动落 localStorage，刷新页面后关联的成员不丢 */
var CV_SQUAD_STORE_KEY='lingee-collab-squads-v1';
function cvPersistSquads(){
  try{ localStorage.setItem(CV_SQUAD_STORE_KEY,JSON.stringify({squads:CV_SQUADS})); }catch(e){}
}
function cvRestoreSquads(){
  try{
    var raw=localStorage.getItem(CV_SQUAD_STORE_KEY); if(!raw) return;
    var st=JSON.parse(raw);
    if(Array.isArray(st.squads)){ CV_SQUADS.length=0; st.squads.forEach(function(s){CV_SQUADS.push(s);}); }
  }catch(e){}
}
/* 人员被删除后，从所有团队里移除该 pid；团队失去队长时把第一个成员提为队长 */
function cvSquadDetachMember(pid){
  CV_SQUADS.forEach(function(sq){
    var next=[];
    sq.members.forEach(function(m){
      if(m.pid===pid) return;
      next.push(m);
    });
    sq.members=next;
    if(sq.members.length && !sq.members.some(function(m){return m.role==='leader';})){
      sq.members[0].role='leader'; sq.members[0].sub='leader';
    }
  });
}
function cvSquadPidNum(pid){ return parseInt(String(pid).replace(/\D/g,''))||0; }
function cvSquadNameOf(it){
  var p=cvPersonById(it.pid);
  return p?p.name:'已移除';
}
function cvSquadAvHtml(it,cls){
  var name=cvSquadNameOf(it);
  var p=cvPersonById(it.pid);
  var color=p&&cvIsMe(p)?'#08a040':CV_SQUAD_COLORS[cvSquadPidNum(it.pid)%CV_SQUAD_COLORS.length];
  return '<span class="'+cls+'" style="background:'+color+'">'+xesc(name[0]||'?')+'</span>';
}
function cvSquadLeader(sq){
  for(var i=0;i<sq.members.length;i++){ if(sq.members[i].role==='leader') return sq.members[i]; }
  return null;
}
function cvSquadStackHtml(sq){
  var html=sq.members.slice(0,4).map(function(it){return cvSquadAvHtml(it,'sq-av-sm');}).join('');
  if(sq.members.length>4) html+='<span class="sq-av-more">+'+(sq.members.length-4)+'</span>';
  return html;
}
function cvPersonAvHtml(name,cls){
  return '<span class="'+cls+'" style="background:#7c5cfc">'+xesc((name||'?')[0])+'</span>';
}

/* ---------- 列表视图 ---------- */
function cvRenderSquadList(){
  var el=document.getElementById('cv-squad-list');if(!el)return;
  var cnt=document.getElementById('cv-squad-count');if(cnt)cnt.textContent=CV_SQUADS.length;
  el.innerHTML='<div class="sq-head">'
    +'<div class="sq-c sq-c-name">团队</div>'
    +'<div class="sq-c sq-c-lead">队长</div>'
    +'<div class="sq-c sq-c-stack">成员</div>'
    +'<div class="sq-c sq-c-creator">创建者</div>'
    +'</div>'
    +CV_SQUADS.map(function(sq){
      var lead=cvSquadLeader(sq);
      return '<div class="sq-row" data-cv-squad="'+sq.id+'" title="查看团队">'
        +'<div class="sq-c sq-c-name"><span class="sq-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>'
        +'<div><div class="sq-n">'+xesc(sq.name)+(sq.archived?'<span class="sq-arch-tag">已归档</span>':'')+'</div>'+(sq.desc?'<div class="sq-d">'+xesc(sq.desc)+'</div>':'')+'</div></div>'
        +'<div class="sq-c sq-c-lead">'+(lead?cvSquadAvHtml(lead,'sq-av-sm')+'<span class="sq-c-t">'+xesc(cvSquadNameOf(lead))+'</span>':'<span class="sq-c-t sq-c-t--empty">未设置</span>')+'</div>'
        +'<div class="sq-c sq-c-stack">'+cvSquadStackHtml(sq)+'</div>'
        +'<div class="sq-c sq-c-creator">'+cvPersonAvHtml(sq.creator,'sq-av-sm')+'<span class="sq-c-t">'+xesc(sq.creator)+'</span></div>'
        +'</div>';
    }).join('');
}

/* ---------- 详情视图 ---------- */
function cvSquadMemberCard(it,i){
  var lead=it.role==='leader';
  return '<div class="sq-member">'
    +cvSquadAvHtml(it,'sq-member-av')
    +'<div class="sq-member-body">'
    +'<div class="sq-member-line"><span class="sq-member-name">'+xesc(cvSquadNameOf(it))+'</span>'
    +(lead?'<span class="sq-role sq-role--lead"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8l5 4 5-8 5 8 5-4v10H2z"/></svg>队长</span>'
          :'<span class="sq-role sq-role--member">成员</span><button type="button" class="sq-setleader" data-cv-sq-setleader="'+i+'">设为队长</button>')
    +'</div>'
    +'<div class="sq-member-sub">'+xesc(it.sub||'')+'</div>'
    +'</div></div>';
}
function cvRenderSquadDetail(){
  var el=document.getElementById('cv-squad-detail');if(!el)return;
  var sq=cvSquadById(cvSquadCur);
  if(!sq){el.innerHTML='';return;}
  var lead=cvSquadLeader(sq);
  el.innerHTML='<div class="sq-crumb">'
    +'<button type="button" class="sq-crumb-back" data-cv-sqback>团队</button>'
    +'<span class="sq-crumb-sep">›</span>'
    +'<span class="sq-ic sq-ic--sm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>'
    +'<span class="sq-crumb-name">'+xesc(sq.name)+'</span>'
    +'<button type="button" class="sq-archive" data-cv-sq-archive><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>归档</button>'
    +'</div>'
    +'<div class="sq-layout">'
    +'<aside class="sq-side">'
    +'<div class="sq-side-av"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>'
    +'<div class="sq-side-name">'+xesc(sq.name)+'</div>'
    +'<div class="sq-side-desc">'+(sq.desc?xesc(sq.desc):'添加描述')+'</div>'
    +'<div class="sq-kv-wrap"><div class="sq-kv-t">详情</div>'
    +'<div class="sq-kv"><span>队长</span><b>'+(lead?xesc(cvSquadNameOf(lead)):'未设置')+'</b></div>'
    +'<div class="sq-kv"><span>成员</span><b>'+sq.members.length+'</b></div>'
    +'<div class="sq-kv"><span>创建者</span><b>'+xesc(sq.creator)+'</b></div>'
    +'<div class="sq-kv"><span>创建时间</span><b>'+xesc(sq.created)+'</b></div>'
    +'<div class="sq-kv"><span>更新时间</span><b>'+xesc(sq.updated)+'</b></div>'
    +'</div></aside>'
    +'<section class="sq-main">'
    +'<div class="sq-tabs">'
    +'<button type="button" class="sq-tab'+(cvSquadTab==='members'?' on':'')+'" data-cv-sq-tab="members"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>成员</button>'
    +'<button type="button" class="sq-tab'+(cvSquadTab==='guide'?' on':'')+'" data-cv-sq-tab="guide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>指引</button>'
    +'</div>'
    +'<div class="sq-tabpane'+(cvSquadTab==='members'?'':' hidden')+'" data-sqpane="members">'
    +'<div class="sq-main-head"><div><div class="sq-main-t">成员</div><div class="sq-main-s">该团队有 '+sq.members.length+' 名成员</div></div>'
    +'<div class="sq-main-acts">'
    +'<button type="button" class="sync-btn" data-cv-sq-addmember><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>添加成员</button>'
    +'</div></div>'
    +'<div class="sq-member-list">'+(sq.members.length?sq.members.map(function(it,i){return cvSquadMemberCard(it,i);}).join(''):'<div class="sq-empty">还没有成员，点右上「添加成员」拉人进来</div>')+'</div>'
    +'</div>'
    +'<div class="sq-tabpane'+(cvSquadTab==='guide'?'':' hidden')+'" data-sqpane="guide">'
    +'<div class="sq-guide">团队指引还没有编写。可以在这里写协作约定、交付口径与评审标准，成员会按指引执行。</div>'
    +'</div>'
    +'</section></div>';
}
function cvShowSquadDetail(id){
  cvSquadCur=id; cvSquadTab='members';
  var list=document.getElementById('cv-squad-list'),detail=document.getElementById('cv-squad-detail');
  if(list)list.classList.add('hidden');
  if(detail){detail.classList.remove('hidden');cvRenderSquadDetail();}
}
function cvHideSquadDetail(){
  cvSquadCur='';
  var list=document.getElementById('cv-squad-list'),detail=document.getElementById('cv-squad-detail');
  if(detail)detail.classList.add('hidden');
  if(list)list.classList.remove('hidden');
  cvRenderSquadList();
}
function cvSwitchSquadTab(tab){
  cvSquadTab=tab==='guide'?'guide':'members';
  cvRenderSquadDetail();
}
function cvArchiveSquad(){
  var sq=cvSquadById(cvSquadCur);if(!sq)return;
  sq.archived=true; sq.updated='刚刚';
  cvHideSquadDetail();
  cvPersistSquads();
}
/* 设某成员为队长：一个团队只有一个队长，原队长降为成员 */
function cvSetSquadLeader(i){
  var sq=cvSquadById(cvSquadCur);if(!sq)return;
  var it=sq.members[i];if(!it)return;
  sq.members.forEach(function(m){ m.role='member'; if(m.sub==='leader') m.sub='添加角色...'; });
  it.role='leader'; it.sub='leader';
  sq.updated='刚刚';
  cvRenderSquadDetail(); cvRenderSquadList();
  cvPersistSquads();
  if(window.cvToast) window.cvToast(cvSquadNameOf(it)+' 已设为队长','success');
}
/* 添加成员弹窗确认后调用：把人挂进当前团队 */
function cvSquadAddPerson(pid){
  var sq=cvSquadById(cvSquadCur);if(!sq)return;
  sq.members.push({kind:'person',pid:pid,role:'member',sub:'添加角色...'});
  sq.updated='刚刚';
  cvRenderSquadDetail(); cvRenderSquadList();
  cvPersistSquads();
}

/* ---------- 新建团队 ---------- */
function cvOpenNewSquadModal(){
  var el=document.getElementById('cv-newsquad-overlay');if(el)el.style.display='flex';
  var n=document.getElementById('cv-ns-name');if(n)n.value='';
  var d=document.getElementById('cv-ns-desc');if(d)d.value='';
}
function cvCloseNewSquadModal(){
  var el=document.getElementById('cv-newsquad-overlay');if(el)el.style.display='none';
}
function cvConfirmNewSquad(){
  var n=(document.getElementById('cv-ns-name')||{}).value||'';
  n=n.trim();
  if(!n){ if(window.cvToast) window.cvToast('请先填写团队名称','warning'); return; }
  var d=((document.getElementById('cv-ns-desc')||{}).value||'').trim();
  CV_SQUADS.push({id:'sq-'+Date.now(),name:n,desc:d,creator:'吴宏超',created:'刚刚',updated:'刚刚',archived:false,members:[]});
  cvCloseNewSquadModal();
  cvRenderSquadList();
  cvPersistSquads();
  if(window.cvToast) window.cvToast('已创建团队：'+n,'success');
}

export { CV_SQUADS, cvArchiveSquad, cvCloseNewSquadModal, cvConfirmNewSquad, cvHideSquadDetail, cvOpenNewSquadModal, cvPersistSquads, cvRenderSquadDetail, cvRenderSquadList, cvRestoreSquads, cvSetSquadLeader, cvShowSquadDetail, cvSquadAddPerson, cvSquadDetachMember, cvSwitchSquadTab };
