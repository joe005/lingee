import { assetModesHtml, assetTagsHtml, isMoreAssets, syncAssetBrowser, cloudCardsHtml } from './expert-market.js';
import { layerOf, layerVisible, layerActions, layerToolbar, assetSourceBadge } from '../expert/layers.js';
import { $ } from '../../core/dom.js';
import { EXPERTS, skillInfo, xav, xesc } from '../expert/data.js';
/* 协作开发：专家管理分组卡片
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 专家管理：分组卡片 ---------- */
var cvExpertKw='';
var cvExpertLayer='all';
export function set_cvExpertLayer(v){cvExpertLayer=v;}
function cvExpertGroups(){
  var kw=cvExpertKw.trim();
  var rows=EXPERTS.filter(function(e){
    if(!layerVisible('expert',e))return false;
    if(!kw) return true;
    return (e.name+e.role+e.desc+(e.tags||[]).join()+(e.skills||[]).map(function(id){return skillInfo(id).name}).join()).indexOf(kw)>=0;
  });
  return [
    ...['builtin','shared','personal'].filter(key=>cvExpertLayer==='all'||key===cvExpertLayer).map(key=>({title:({builtin:'官方',shared:'租户',personal:'个人'})[key],list:rows.filter(e=>layerOf('expert',e)===key)}))
  ];
}
function cvBuildExpertCard(e){
  /* 与智能体团队卡片统一用 app-card x-card 结构，更清爽 */
  var tags=(e.tags||[]).length?e.tags:(e.skills||[]).map(function(id){return skillInfo(id).name});
  return '<div class="app-card x-card" data-cv-expert="'+e.id+'">'
    +'<button type="button" class="x-call" data-cv-call="'+e.id+'" title="对话这位智能体">对话</button>'
    +'<div class="card-top"><img class="x-av" src="'+xav(e.k)+'" alt="">'
    +'<div class="card-titles"><div class="card-title-row"><span class="card-title">'+xesc(e.name)+'</span>'
    +assetSourceBadge('expert',e)+'</div>'
    +'<div class="x-sub asset-card-summary"><span>'+(e.skills||[]).length+' 个技能</span><span class="asset-card-upgrade-anchor"></span></div></div></div>'
    +'<div class="card-desc" title="'+xesc(e.desc)+'">'+xesc(e.desc)+'</div>'
    +assetTagsHtml(tags)+assetModesHtml(e.modes)
    +layerActions('expert',e)+'</div>';
}
function cvRenderExperts(){
  var box=$('#cvExpertSections'); if(!box) return;
  /* 浏览器自动填充会往搜索框里塞账号，渲染时以 JS 里的关键词为准回写，别让框里显示的和实际筛选的不一致 */
  var si=$('#cvExpertSearch');
  if(si && si.value!==cvExpertKw) si.value=cvExpertKw;
  syncAssetBrowser('expert',EXPERTS);
  layerToolbar('expert',EXPERTS,cvExpertLayer);
  if(isMoreAssets('expert')){box.innerHTML='<div class="apps-grid asset-cloud-grid">'+cloudCardsHtml('expert',cvExpertKw)+'</div>';return;}
  var groups=cvExpertGroups();
  /* 搜索把结果筛空时要说清楚。 */
  if(cvExpertKw.trim() && !groups.some(function(g){return g.list.length})){
    box.innerHTML='<div class="x-empty">没有匹配「'+xesc(cvExpertKw.trim())+'」的智能体</div>';
    return;
  }
  var cards=groups.flatMap(function(g){return g.list;}).map(cvBuildExpertCard).join('');
  box.innerHTML=cards?'<div class="apps-grid">'+cards+'</div>':'<div class="x-empty">没有匹配的智能体</div>';
}

/* cvExpertKw 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set_cvExpertKw(v){ cvExpertKw=v; return v; }

export { cvExpertKw, cvRenderExperts };
