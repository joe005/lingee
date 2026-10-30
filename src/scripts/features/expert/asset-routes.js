import { xesc } from './data.js';
/* 技能、智能体的发布去向：发布到开发（开发板块可运行）或发布到工作（Work，需审核），二者互斥。
   智能体团队只在开发板块使用，没有发布去向可选，卡片上只有运行入口。
   工作去向由提交审核记录推出（待审核 / 已通过），开发去向存在本地；技能没有审核记录，由技能页自己维护状态。 */
const KEY='lingee.asset-routes.v1';
/* 与 asset-review.js 的 REVIEW_KEY 一致；这里不 import，避免改变模块求值顺序 */
const REVIEW_KEY='lingee.platform.reviews.v1';
function read(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback;}catch(_){return fallback;}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}}
/* ''（未发布）、'dev'、'work-pending'（审核中）、'work'（已发布到工作） */
export function routeOf(kind,id){
  const rows=read(REVIEW_KEY,[]).filter(row=>row.kind===kind&&row.sourceId===id);
  if(rows.some(row=>row.status==='approved'))return 'work';
  if(rows.some(row=>row.status==='pending'))return 'work-pending';
  return read(KEY,{})[kind+':'+id]||'';
}
export function setDevRoute(kind,id,on){
  const data=read(KEY,{});
  if(on)data[kind+':'+id]='dev';else delete data[kind+':'+id];
  return write(KEY,data);
}
/* 撤回待审核的提交，使其可改发布到开发 */
export function withdrawPendingReview(kind,id){
  const rows=read(REVIEW_KEY,[]);
  return write(REVIEW_KEY,rows.filter(row=>!(row.kind===kind&&row.sourceId===id&&row.status==='pending')));
}
const STATE_TEXT={dev:'已发布到开发','work-pending':'已提交到工作 · 审核中',work:'已发布到工作'};
const TITLES={
  dev:'发布到开发：在开发板块直接运行，无需审核。与发布到工作互斥',
  work:'发布到工作：提交审核，通过后在 Work 中使用。与发布到开发互斥',
  run:'在开发板块新建会话并带上它',
  withdraw:'撤回发布，之后可重新选择发布去向'
};
/* 个人开发：未发布时给「发布到开发 / 发布到工作」二选一，已选后显示状态与撤回；
   已添加的官方、企业内容只有运行入口。runAttribute 沿用各页已有的「对话」属性，点击即在开发板块运行 */
export function routeControlsHtml(route,{kind,id,personal,runAttribute}){
  const data=' data-route-kind="'+kind+'" data-route-id="'+xesc(id)+'"';
  const run=runAttribute?'<button type="button" class="asset-card-route" '+runAttribute+'="'+xesc(id)+'" title="'+TITLES.run+'">在开发中运行</button>':'';
  if(!personal||kind==='team')return run;
  if(!route)return '<button type="button" class="asset-card-route" data-route-act="dev"'+data+' title="'+TITLES.dev+'">发布到开发</button>'
    +'<button type="button" class="asset-card-route asset-card-route--work" data-route-act="work"'+data+' title="'+TITLES.work+'">发布到工作</button>';
  return '<span class="asset-card-route-state">'+STATE_TEXT[route]+'</span>'
    +(route==='dev'?run:'')
    +(route==='work'?'':'<button type="button" class="asset-card-route" data-route-act="withdraw"'+data+' title="'+TITLES.withdraw+'">撤回</button>');
}
