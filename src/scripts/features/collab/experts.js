import { $ } from '../../core/dom.js';
import { EXPERTS, xav, xesc } from '../expert/data.js';
import { TEAMS } from '../expert/store.js';
/* 协作开发：专家管理分组卡片
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 专家管理：分组卡片 ---------- */
var cvExpertKw='';
function cvExpertGroups(){
  var kw=cvExpertKw.trim();
  var rows=EXPERTS.filter(function(e){
    if(!kw) return true;
    return (e.name+e.role+e.desc+(e.tags||[]).join()).indexOf(kw)>=0;
  });
  return [
    {title:'Lingee 内置',desc:'随产品一起维护，覆盖交付全流程与苍穹、前端等领域',list:rows.filter(function(e){return e.by==='Lingee 内置'})},
    {title:'我创建的',desc:'你自己建的专家，可随时改配置或删除',list:rows.filter(function(e){return e.mine})}
  ];
}
function cvTeamCountOf(id){
  return TEAMS.filter(function(t){ return t.members.indexOf(id)>=0 }).length;
}
function cvBuildExpertCard(e){
  var tags=(e.tags||[]).map(function(t){return '<span class="expert-skill">'+xesc(t)+'</span>'}).join('');
  var cmds=(e.cmds||[]).length, comps=(e.comp||[]).length;
  /* 「能承担哪些工作」比「有几种工作模式」更能决定选不选他，直接摆出来 */
  var mAll=e.modes||[], mShow=mAll.slice(0,3), mRest=mAll.length-mShow.length;
  var modeRow=mAll.length
    ? '<div class="expert-modes" title="可承担 '+xesc(mAll.join(' / '))+'"><span class="expert-modes-k">可承担</span>'
      +mShow.map(function(m){return '<span class="expert-mode">'+xesc(m)+'</span>'}).join('')
      +(mRest>0?'<span class="expert-mode expert-mode-more">+'+mRest+'</span>':'')+'</div>'
    : '';
  return '<div class="expert-card" data-cv-expert="'+e.id+'">'
    +'<button type="button" class="expert-chat-btn" data-cv-call="'+e.id+'" title="召唤这位专家">召唤</button>'
    +'<div class="expert-head"><img class="expert-av" src="'+xav(e.k)+'" alt="">'
    +'<div><div class="expert-name">'+xesc(e.name)
    +(e.ro?'<span class="expert-flag">只读</span>':'')+'</div>'
    +'<div class="expert-role">'+xesc(e.role)+'</div></div></div>'
    +'<div class="expert-intro">'+xesc(e.desc)+'</div>'
    +'<div class="expert-skills">'+tags+'</div>'
    +modeRow
    +'<div class="expert-stats">'
    +'<div><div class="expert-stat-val">'+cvTeamCountOf(e.id)+'</div><div class="expert-stat-label">所在专家团</div></div>'
    +'<div><div class="expert-stat-val">'+comps+'</div><div class="expert-stat-label">能力项</div></div>'
    +'<div><div class="expert-stat-val">'+cmds+'</div><div class="expert-stat-label">触发词</div></div>'
    +'</div></div>';
}
function cvRenderExperts(){
  var box=$('#cvExpertSections'); if(!box) return;
  /* 浏览器自动填充会往搜索框里塞账号，渲染时以 JS 里的关键词为准回写，别让框里显示的和实际筛选的不一致 */
  var si=$('#cvExpertSearch');
  if(si && si.value!==cvExpertKw) si.value=cvExpertKw;
  var groups=cvExpertGroups();
  /* 搜索把结果筛空时要说清楚，否则只剩一张「创建专家」卡，看着像数据没了 */
  if(cvExpertKw.trim() && !groups.some(function(g){return g.list.length})){
    box.innerHTML='<div class="x-empty">没有匹配「'+xesc(cvExpertKw.trim())+'」的专家</div>';
    return;
  }
  var html=groups.map(function(g){
    if(!g.list.length && g.title!=='我创建的') return '';
    var cards=g.list.map(cvBuildExpertCard).join('');
    if(g.title==='我创建的'){
      cards+='<button type="button" class="expert-card expert-new" data-cv-new-expert>'
        +'<span class="expert-new-ic">＋</span><span class="expert-new-t">创建专家</span>'
        +'<span class="expert-new-s">手填表单，或一句话交给 expert-manager</span></button>';
    }
    return '<div class="expert-section-title">'+g.title
      +'<span class="expert-section-desc">'+g.desc+'</span></div>'
      +'<div class="expert-grid">'+cards+'</div>';
  }).join('');
  box.innerHTML=html||'<div class="x-empty">没有匹配的专家</div>';
}

/* cvExpertKw 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set_cvExpertKw(v){ cvExpertKw=v; return v; }

export { cvExpertKw, cvRenderExperts };
