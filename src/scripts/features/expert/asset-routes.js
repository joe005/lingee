import { xesc } from './data.js';
/* 技能、智能体的发布去向：开发板块（直接运行，无需审核）或工作板块（沿用原有「企业分发 / 个人自用」两条路径），二者互斥。
   智能体团队只在开发板块使用，没有发布去向可选，卡片上只有运行入口。
   工作去向由提交审核记录推出（待审核 / 已通过），开发去向存在本地；技能没有审核记录，由技能页自己维护状态。 */
const KEY='lingee.asset-routes.v1';
/* 与 asset-review.js 的 REVIEW_KEY 一致；这里不 import，避免改变模块求值顺序 */
const REVIEW_KEY='lingee.platform.reviews.v1';
function read(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback;}catch(_){return fallback;}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}}
/* ''（未发布）、'dev'（开发）、'work-personal'（工作·个人自用，即时安装）、'work-pending'（工作·企业分发审核中）、'work'（工作·企业分发已发布） */
export function routeOf(kind,id){
  const rows=read(REVIEW_KEY,[]).filter(row=>row.kind===kind&&row.sourceId===id);
  if(rows.some(row=>row.status==='approved'))return 'work';
  if(rows.some(row=>row.status==='pending'))return 'work-pending';
  return read(KEY,{})[kind+':'+id]||'';
}
/* value 为 'dev' 或 'work-personal'；传空清除 */
export function setRoute(kind,id,value){
  const data=read(KEY,{});
  if(value)data[kind+':'+id]=value;else delete data[kind+':'+id];
  return write(KEY,data);
}
/* 撤回待审核的提交，使其可改发布到开发 */
export function withdrawPendingReview(kind,id){
  const rows=read(REVIEW_KEY,[]);
  return write(REVIEW_KEY,rows.filter(row=>!(row.kind===kind&&row.sourceId===id&&row.status==='pending')));
}
const TAG_TEXT={dev:'开发','work-personal':'工作 · 个人自用','work-pending':'工作 · 企业分发审核中',work:'工作 · 企业分发'};
const TITLES={run:'在开发板块新建会话并带上它',withdraw:'撤回发布，之后可重新选择发布去向',publish:'选择发布到开发板块或工作板块（二选一）'};
/* 已发布的简单标签，放在卡片标题下的标签行里 */
export function routeTagHtml(route){
  return route?'<span class="asset-route-tag asset-route-tag--'+route+'" title="已发布到'+TAG_TEXT[route]+'">'+TAG_TEXT[route]+'</span>':'';
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
/* 发布时的去向选择弹窗：开发板块，或工作板块的「企业分发 / 个人自用」（沿用原有提交路径），三选一，开发与工作互斥。
   返回 'dev' / 'work-enterprise' / 'work-personal'，取消返回 null */
const ROUTE_HINTS={
  dev:'发布到开发板块后仅在开发板块使用，不会出现在 Work。',
  'work-enterprise':'企业分发将对团队成员或市场开放，需管理员审核后生效。',
  'work-personal':'个人自用无需审核，安全检测通过后即时安装到 Work。'
};
let activeDialog=null;
export function chooseRoute(name){
  if(activeDialog)return Promise.resolve(null);
  return new Promise(resolve=>{
    const previous=document.activeElement;
    const overlay=document.createElement('div');
    overlay.className='app-delete-confirm asset-route-dialog';
    const option=(value,title,desc)=>'<label class="asset-route-option"><input type="radio" name="assetRoute" value="'+value+'"><span><strong>'+title+'</strong><small>'+desc+'</small></span></label>';
    overlay.innerHTML='<div class="app-delete-confirm-card" role="dialog" aria-modal="true" aria-labelledby="assetRouteTitle">'
      +'<h3 id="assetRouteTitle">发布「'+xesc(name)+'」· 选择路径</h3>'
      +'<div class="asset-route-options" role="radiogroup" aria-label="发布去向">'
      +'<div class="asset-route-group">开发板块</div>'
      +option('dev','发布到开发','在开发板块直接运行，无需审核')
      +'<div class="asset-route-group">工作板块</div>'
      +option('work-enterprise','企业分发','适合团队协作与知识沉淀，可共享给他人或发布至企业市场，需管理员审核')
      +option('work-personal','个人自用','适合本人独立使用，安全检测通过后即时安装到 Work，无需审核')
      +'</div><p class="asset-route-hint" hidden></p>'
      +'<p class="asset-route-exclusive">开发板块与工作板块互斥，同一时间只能发布到一处。</p>'
      +'<div class="app-delete-confirm-actions"><button type="button" data-route-cancel>取消</button><button type="button" class="asset-route-confirm" data-route-confirm disabled>发布</button></div></div>';
    const confirm=overlay.querySelector('[data-route-confirm]'),hint=overlay.querySelector('.asset-route-hint');
    const close=value=>{
      if(activeDialog!==overlay)return;
      activeDialog=null;overlay.remove();document.removeEventListener('keydown',onKey,true);
      if(previous?.isConnected)previous.focus();
      resolve(value);
    };
    const onKey=event=>{if(event.key==='Escape'){event.preventDefault();close(null);}};
    overlay.addEventListener('change',event=>{
      confirm.disabled=false;
      hint.textContent=ROUTE_HINTS[event.target.value]||'';hint.hidden=false;
    });
    overlay.addEventListener('click',event=>{
      if(event.target===overlay||event.target.closest('[data-route-cancel]'))close(null);
      else if(event.target.closest('[data-route-confirm]'))close(overlay.querySelector('input:checked')?.value||null);
    });
    document.addEventListener('keydown',onKey,true);
    activeDialog=overlay;document.body.appendChild(overlay);
    overlay.querySelector('input').focus();
  });
}
