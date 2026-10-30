import { xesc } from './data.js';
/* 技能、智能体的发布去向：开发板块（需审核，通过后在开发板块使用）或工作板块（沿用原有「企业分发 / 个人自用」两条路径），二者互斥。
   智能体团队只在开发板块使用，没有发布去向可选，卡片上只有运行入口。
   工作去向由提交审核记录推出（待审核 / 已通过），开发去向存在本地；技能没有审核记录，由技能页自己维护状态。 */
const KEY='lingee.asset-routes.v1';
/* 与 asset-review.js 的 REVIEW_KEY 一致；这里不 import，避免改变模块求值顺序 */
const REVIEW_KEY='lingee.platform.reviews.v1';
function read(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback;}catch(_){return fallback;}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}}
/* ''（未发布）、'dev-pending'（开发·审核中）、'dev'（开发·已通过）、'work-personal'（工作·个人自用，即时安装）、
   'work-pending'（工作·企业分发审核中）、'work'（工作·企业分发已通过）。开发与企业分发都走提交审核，
   本地记录的 'dev' 只标明这次提交面向开发板块 */
export function routeOf(kind,id){
  const stored=read(KEY,{})[kind+':'+id]||'';
  const rows=read(REVIEW_KEY,[]).filter(row=>row.kind===kind&&row.sourceId===id);
  if(rows.some(row=>row.status==='approved'))return stored==='dev'?'dev':'work';
  if(rows.some(row=>row.status==='pending'))return stored==='dev'?'dev-pending':'work-pending';
  return stored==='work-personal'?stored:'';
}
/* value 为 'dev'（本次提交面向开发板块）或 'work-personal'；传空清除 */
export function setRoute(kind,id,value){
  const data=read(KEY,{});
  if(value)data[kind+':'+id]=value;else delete data[kind+':'+id];
  return write(KEY,data);
}
/* 撤回待审核的提交，使其可改发布到开发 */
export function withdrawPendingReview(kind,id){
  const rows=read(REVIEW_KEY,[]);
  setRoute(kind,id,'');
  return write(REVIEW_KEY,rows.filter(row=>!(row.kind===kind&&row.sourceId===id&&row.status==='pending')));
}
const TAG_TEXT={dev:'开发','dev-pending':'开发 · 审核中','work-personal':'工作 · 个人自用','work-pending':'工作 · 企业分发审核中',work:'工作 · 企业分发'};
const TITLES={run:'在开发板块新建会话并带上它',withdraw:'撤回发布，之后可重新选择发布去向',publish:'选择发布到开发板块或工作板块（二选一）'};
/* 已发布的简单标签，放在卡片标题下的标签行里 */
export function routeTagHtml(route){
  return route?'<span class="asset-route-tag asset-route-tag--'+route+'" title="已发布到'+TAG_TEXT[route]+'">'+TAG_TEXT[route]+'</span>':'';
}
/* 卡片底部只放运行入口：已添加的官方、企业内容，以及已发布到开发的个人内容；
   发布、撤回收进个人开发卡片的「⋯」菜单（见 moreMenuItems）。runAttribute 沿用各页已有的「对话」属性，点击即在开发板块运行 */
export function routeControlsHtml(route,{kind,id,personal,runAttribute}){
  const run=runAttribute?'<button type="button" class="asset-card-route" '+runAttribute+'="'+xesc(id)+'" title="'+TITLES.run+'">在开发中运行</button>':'';
  /* 个人开发的技能、智能体发布到开发板块后才可运行；智能体团队只在开发板块，随时可运行 */
  if(personal&&kind!=='team'&&route!=='dev')return '';
  return run;
}
/* 个人开发卡片的「⋯」菜单项，与「技能开发」页的卡片菜单一致：编辑、本地测试、云端测试、检查、提交、删除。
   「提交」弹窗选择发布去向（开发板块，或工作板块的企业分发 / 个人自用）；已提交或已发布的置灰。智能体团队只在开发板块使用，没有提交项 */
const SVG='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const ICONS={
  edit:SVG+'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  'local-test':SVG+'<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2.2h12.4a1.5 1.5 0 0 0 1.3-2.2L14 9V3"/><path d="M7.5 15h9"/></svg>',
  'cloud-test':SVG+'<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4 4 0 0 1 0 8z"/></svg>',
  check:SVG+'<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>',
  publish:SVG+'<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
  delete:SVG+'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'
};
export function moreMenuItems(kind,route){
  const items=[
    {act:'edit',label:'编辑'},
    {act:'local-test',label:'本地测试'},
    {act:'cloud-test',label:'云端测试'},
    {act:'check',label:'检查'}
  ];
  if(kind!=='team')items.push({act:'publish',label:'提交',disabled:!!route,title:route?'已提交或已发布，如需调整请联系企业管理员':''});
  items.push({act:'delete',label:'删除',danger:true});
  return items.map(item=>({...item,icon:ICONS[item.act]}));
}
/* 浏览器里的演示动作：编辑、测试、检查只给提示，文案与「技能开发」页一致 */
export function demoActionToast(act,name){
  return {
    edit:'打开开发会话：'+name,
    'local-test':'已进入本地测试：'+name,
    'cloud-test':'已推送到云端测试环境：'+name,
    check:'检查完成：「'+name+'」未发现问题'
  }[act]||'';
}
/* 技能卡片用的弹出菜单（智能体、团队卡片沿用各自已有的卡片菜单）；选中返回 act，关闭返回 null */
let activeMenu=null;
export function showMoreMenu(anchor,items){
  activeMenu?.close(null);
  return new Promise(resolve=>{
    const menu=document.createElement('div');
    menu.className='agent-card-menu';
    menu.setAttribute('role','menu');
    menu.innerHTML=items.map(item=>'<button type="button" class="agent-card-menu-item'+(item.danger?' is-danger':'')+'" role="menuitem" data-more-act="'+item.act+'"'+(item.disabled?' disabled':'')+(item.title?' title="'+xesc(item.title)+'"':'')+'>'+(item.icon||'')+xesc(item.label)+'</button>').join('');
    document.body.appendChild(menu);
    const rect=anchor.getBoundingClientRect();
    menu.style.top=Math.min(rect.bottom+4,window.innerHeight-menu.offsetHeight-8)+'px';
    menu.style.left=Math.max(8,Math.min(rect.right-menu.offsetWidth,window.innerWidth-menu.offsetWidth-8))+'px';
    anchor.setAttribute('aria-expanded','true');
    const close=value=>{
      if(activeMenu?.menu!==menu)return;
      activeMenu=null;menu.remove();anchor.setAttribute('aria-expanded','false');
      document.removeEventListener('click',onOutside,true);document.removeEventListener('keydown',onKey,true);
      resolve(value);
    };
    const onOutside=event=>{if(!menu.contains(event.target))close(null);};
    const onKey=event=>{if(event.key==='Escape'){event.preventDefault();close(null);anchor.focus();}};
    menu.addEventListener('click',event=>{
      const item=event.target.closest('[data-more-act]:not(:disabled)');
      if(item){event.stopPropagation();close(item.dataset.moreAct);}
    });
    activeMenu={menu,close};
    document.addEventListener('click',onOutside,true);document.addEventListener('keydown',onKey,true);
    menu.querySelector('button:not(:disabled)')?.focus();
  });
}
/* 提交时的分发路由弹窗，「技能开发」页与「技能·智能体·连接器」菜单共用：
   先决定面向开发板块还是工作板块；工作板块再选「企业分发 / 个人自用」（沿用原有提交路径）。三选一，开发与工作互斥。
   返回 'dev' / 'work-enterprise' / 'work-personal'，取消返回 null */
const ROUTE_HINTS={
  dev:'面向开发板块：需管理员审核，通过后仅在开发板块使用，不会出现在 Work。',
  'work-enterprise':'企业分发将对团队成员或市场开放，需管理员审核后生效。',
  'work-personal':'个人自用仅本人可用，安全检测通过后即时安装到 Work，无需审核。'
};
const ICON_DEV=SVG+'<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>';
const ICON_ENTERPRISE=SVG+'<path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 10h5a1 1 0 0 1 1 1v10M3 21h18M8 8h2M8 12h2M8 16h2"/></svg>';
const ICON_PERSONAL=SVG+'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
let activeDialog=null;
export function chooseRoute(name){
  if(activeDialog)return Promise.resolve(null);
  return new Promise(resolve=>{
    const previous=document.activeElement;
    const overlay=document.createElement('div');
    overlay.className='asset-route-dialog';
    const option=(value,icon,tone,title,desc)=>'<label class="asset-route-option"><input type="radio" name="assetRoute" value="'+value+'">'
      +'<span class="asset-route-option-title"><span class="asset-route-icon is-'+tone+'" aria-hidden="true">'+icon+'</span>'+title+'</span><small>'+desc+'</small></label>';
    overlay.innerHTML='<div class="asset-route-card" role="dialog" aria-modal="true" aria-labelledby="assetRouteTitle">'
      +'<div class="asset-route-head"><h3 id="assetRouteTitle">提交「'+xesc(name)+'」· 选择路径</h3>'
      +'<button type="button" class="asset-route-close" data-route-cancel aria-label="关闭">'+SVG+'<path d="M18 6 6 18M6 6l12 12"/></svg></button></div>'
      +'<div class="asset-route-options" role="radiogroup" aria-label="分发路由">'
      +'<div class="asset-route-group">面向开发板块</div>'
      +option('dev',ICON_DEV,'dev','开发板块','适合在开发板块使用，需管理员审核，通过后可直接运行')
      +'<div class="asset-route-group">面向工作板块</div>'
      +option('work-enterprise',ICON_ENTERPRISE,'enterprise','企业分发','适合团队协作与知识沉淀，技能可共享给他人或发布至企业市场')
      +option('work-personal',ICON_PERSONAL,'personal','个人自用','适合本人独立使用，安全检测通过后即时安装到 Work，无需审核')
      +'</div><p class="asset-route-hint" hidden></p>'
      +'<p class="asset-route-exclusive">开发板块与工作板块互斥，同一时间只能提交到一处。</p>'
      +'<div class="asset-route-foot"><button type="button" class="asset-route-cancel" data-route-cancel>取消</button><button type="button" class="asset-route-confirm" data-route-confirm disabled>提交</button></div></div>';
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
