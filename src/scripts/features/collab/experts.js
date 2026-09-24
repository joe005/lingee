import { $ } from '../../core/dom.js';
import { EXPERTS, skillInfo, xav, xesc } from '../expert/data.js';
/* 协作开发：专家管理分组卡片
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 专家管理：分组卡片 ---------- */
var cvExpertKw='';
function cvExpertGroups(){
  var kw=cvExpertKw.trim();
  var rows=EXPERTS.filter(function(e){
    if(!kw) return true;
    return (e.name+e.role+e.desc+(e.tags||[]).join()+(e.skills||[]).map(function(id){return skillInfo(id).name}).join()).indexOf(kw)>=0;
  });
  return [
    {title:'Lingee 内置',desc:'随产品一起维护，覆盖交付全流程与苍穹、前端等领域',list:rows.filter(function(e){return e.by==='Lingee 内置'})},
    {title:'我创建的',desc:'已有的自建专家，可修改配置',list:rows.filter(function(e){return e.mine})}
  ];
}
function cvBuildExpertCard(e){
  /* 与专家团卡片统一用 app-card x-card 结构，更清爽 */
  var skills=(e.skills||[]).map(function(id){return skillInfo(id)});
  var tags=skills.slice(0,3).map(function(s){return '<span class="ptag">'+xesc(s.name)+'</span>'}).join('')
    +(skills.length>3?'<span class="ptag">+'+(skills.length-3)+'</span>':'');
  return '<div class="app-card x-card" data-cv-expert="'+e.id+'">'
    +'<button type="button" class="x-call" data-cv-call="'+e.id+'" title="对话这位专家">对话</button>'
    +'<div class="card-top"><img class="x-av" src="'+xav(e.k)+'" alt="">'
    +'<div class="card-titles"><div class="card-title-row"><span class="card-title">'+xesc(e.name)+'</span>'
    +(e.ro?'<span class="x-badge x-badge-ro">只读</span>':'')+'</div>'
    +'<div class="x-sub">'+xesc([e.role,e.by].filter(Boolean).join(' · '))+'</div></div></div>'
    +'<div class="card-desc" title="'+xesc(e.desc)+'">'+xesc(e.desc)+'</div>'
    +(tags?'<div class="card-tags">'+tags+'</div>':'')
    +'</div>';
}
function cvRenderExperts(){
  var box=$('#cvExpertSections'); if(!box) return;
  /* 浏览器自动填充会往搜索框里塞账号，渲染时以 JS 里的关键词为准回写，别让框里显示的和实际筛选的不一致 */
  var si=$('#cvExpertSearch');
  if(si && si.value!==cvExpertKw) si.value=cvExpertKw;
  var groups=cvExpertGroups();
  /* 搜索把结果筛空时要说清楚。 */
  if(cvExpertKw.trim() && !groups.some(function(g){return g.list.length})){
    box.innerHTML='<div class="x-empty">没有匹配「'+xesc(cvExpertKw.trim())+'」的专家</div>';
    return;
  }
  var html=groups.map(function(g){
    if(!g.list.length) return '';
    var cards=g.list.map(cvBuildExpertCard).join('');
    return '<div class="expert-section-title">'+g.title
      +'<span class="expert-section-desc">'+g.desc+'</span></div>'
      +'<div class="apps-grid">'+cards+'</div>';
  }).join('');
  box.innerHTML=html||'<div class="x-empty">没有匹配的专家</div>';
}

/* cvExpertKw 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set_cvExpertKw(v){ cvExpertKw=v; return v; }

export { cvExpertKw, cvRenderExperts };
