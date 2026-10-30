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
const TAG_TEXT={dev:'开发','work-pending':'工作 · 审核中',work:'工作'};
const TITLES={run:'在开发板块新建会话并带上它',withdraw:'撤回发布，之后可重新选择发布去向',publish:'选择发布到开发或发布到工作（二选一）'};
/* 已发布的简单标签，放在卡片标题下的标签行里 */
export function routeTagHtml(route){
  return route?'<span class="asset-route-tag asset-route-tag--'+route+'" title="已发布到'+TAG_TEXT[route].replace(' · 审核中','（审核中）')+'">'+TAG_TEXT[route]+'</span>':'';
}
/* 个人开发：未发布时只有一个「发布」按钮，点击后弹窗二选一；已发布后标签在标题下，这里只留运行和撤回。
   已添加的官方、企业内容只有运行入口。runAttribute 沿用各页已有的「对话」属性，点击即在开发板块运行 */
export function routeControlsHtml(route,{kind,id,personal,runAttribute}){
  const data=' data-route-kind="'+kind+'" data-route-id="'+xesc(id)+'"';
  const run=runAttribute?'<button type="button" class="asset-card-route" '+runAttribute+'="'+xesc(id)+'" title="'+TITLES.run+'">在开发中运行</button>':'';
  if(!personal||kind==='team')return run;
  if(!route)return '<button type="button" class="asset-card-route asset-card-route--work" data-route-act="publish"'+data+' title="'+TITLES.publish+'">发布</button>';
  return (route==='dev'?run:'')+(route==='work'?'':'<button type="button" class="asset-card-route" data-route-act="withdraw"'+data+' title="'+TITLES.withdraw+'">撤回</button>');
}
/* 发布时的去向选择弹窗：开发、工作二选一（互斥）；返回 'dev' / 'work'，取消返回 null */
let activeDialog=null;
export function chooseRoute(name){
  if(activeDialog)return Promise.resolve(null);
  return new Promise(resolve=>{
    const previous=document.activeElement;
    const overlay=document.createElement('div');
    overlay.className='app-delete-confirm asset-route-dialog';
    overlay.innerHTML='<div class="app-delete-confirm-card" role="dialog" aria-modal="true" aria-labelledby="assetRouteTitle">'
      +'<h3 id="assetRouteTitle">发布「'+xesc(name)+'」</h3>'
      +'<p>选择发布去向，开发与工作二选一，同一时间只能发布到一处。</p>'
      +'<div class="asset-route-options" role="radiogroup" aria-label="发布去向">'
      +'<label class="asset-route-option"><input type="radio" name="assetRoute" value="dev"><span><strong>开发</strong><small>在开发板块直接运行，无需审核</small></span></label>'
      +'<label class="asset-route-option"><input type="radio" name="assetRoute" value="work"><span><strong>工作</strong><small>提交审核，通过后在 Work 中使用</small></span></label>'
      +'</div>'
      +'<div class="app-delete-confirm-actions"><button type="button" data-route-cancel>取消</button><button type="button" class="asset-route-confirm" data-route-confirm disabled>发布</button></div></div>';
    const confirm=overlay.querySelector('[data-route-confirm]');
    const close=value=>{
      if(activeDialog!==overlay)return;
      activeDialog=null;overlay.remove();document.removeEventListener('keydown',onKey,true);
      if(previous?.isConnected)previous.focus();
      resolve(value);
    };
    const onKey=event=>{if(event.key==='Escape'){event.preventDefault();close(null);}};
    overlay.addEventListener('change',()=>{confirm.disabled=false;});
    overlay.addEventListener('click',event=>{
      if(event.target===overlay||event.target.closest('[data-route-cancel]'))close(null);
      else if(event.target.closest('[data-route-confirm]'))close(overlay.querySelector('input:checked')?.value||null);
    });
    document.addEventListener('keydown',onKey,true);
    activeDialog=overlay;document.body.appendChild(overlay);
    overlay.querySelector('input').focus();
  });
}
