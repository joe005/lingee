import '../../styles/pages/asset-hub.css';
import { $, $$ } from '../core/dom.js';
import { setNavActive, showView } from '../core/view.js';
import { EX } from '../features/expert/data.js';
import { TEAMS } from '../features/expert/store.js';
import { submitAssetForReview } from '../features/expert/asset-review.js';
import { chooseRoute, demoActionToast, routeOf, setRoute, withdrawPendingReview } from '../features/expert/asset-routes.js';
import { toast } from '../core/toast.js';
/* 侧栏「技能·智能体·连接器」菜单：挂技能 / 智能体 / 智能体团队 / 连接器四个页签。
   页签只是导航条，内容仍是原有页面（技能页、协作开发里的智能体与智能体团队、连接器页），
   原菜单与页面保持不变；导航条按当前页签挂到对应页面顶部，离开菜单时移除。 */
const MENUS={center:{label:'技能·智能体·连接器',tab:'skills'}};
const TABS=[['skills','技能'],['experts','智能体'],['teams','智能体团队'],['connectors','连接器']];
/* 技能与连接器是独立页面，智能体挂在协作开发容器里 */
const VIEWS={skills:'skill-center',connectors:'connectors'};
let state=null,nav=null;

function buildNav(){
  nav=document.createElement('div');
  nav.className='asset-hub-nav';
  nav.setAttribute('role','tablist');
  nav.setAttribute('aria-label','技能·智能体·连接器');
  nav.innerHTML=TABS.map(([tab,text])=>`<button type="button" role="tab" data-hub-tab="${tab}">${text}</button>`).join('');
  nav.addEventListener('click',event=>{
    const button=event.target.closest('[data-hub-tab]');
    if(button&&state)openHub(state.menu,button.dataset.hubTab);
  });
}
function unmount(){
  if(nav)nav.remove();
  $$('.asset-hub-mode').forEach(host=>host.classList.remove('asset-hub-mode'));
}
function mount(tab){
  if(!nav)buildNav();
  unmount();
  const host=$('#view-'+(VIEWS[tab]||'collab'));
  if(!host)return;
  host.classList.add('asset-hub-mode');
  host.insertBefore(nav,VIEWS[tab]?host.firstChild:$('#cvTabNav'));
  nav.querySelectorAll('[data-hub-tab]').forEach(button=>{
    const on=button.dataset.hubTab===tab;
    button.classList.toggle('active',on);
    button.setAttribute('aria-selected',String(on));
  });
}
function openHub(menu,tab){
  state={menu,tab};
  if(VIEWS[tab]){
    showView(VIEWS[tab]);
  }else{
    showView('collab');
    /* 协作开发自己监听该事件：初始化并切到对应页签 */
    document.dispatchEvent(new CustomEvent('lingee:collab-nav',{detail:{tab}}));
  }
  setNavActive(MENUS[menu].label);
  mount(tab);
}
export function init(){
  /* 个人开发卡片的「⋯」菜单：编辑、本地测试、云端测试、检查、发布 / 撤回发布。
     「发布」弹窗选择路径（开发板块，或工作板块的企业分发 / 个人自用；开发与工作互斥），开发与企业分发走原有的提交审核流程。
     捕获阶段拦截，避免同时打开卡片详情 */
  document.addEventListener('click',async event=>{
    const button=event.target.closest('#view-collab [data-asset-menu-act]');
    if(!button)return;
    event.stopPropagation();
    const {assetMenuAct:act,assetMenuKind:kind,assetMenuId:id}=button.dataset;
    const item=kind==='team'?TEAMS.find(team=>team.id===id):EX[id];
    if(!item)return;
    const route=routeOf(kind,id);
    if(act==='edit'){
      /* 先打开详情，再进入编辑 */
      document.querySelector(kind==='team'?'[data-team="'+id+'"]':'[data-cv-expert="'+id+'"]')?.click();
      setTimeout(()=>document.querySelector(kind==='team'?'#teamModal [data-team-detail-edit]':'#expertModal [data-x-edit]')?.click(),80);
      return;
    }
    if(act==='publish'){
      if(route)return;
      const choice=await chooseRoute(item.name);
      if(choice==='dev'||choice==='work-enterprise'){
        setRoute(kind,id,choice==='dev'?'dev':'');   /* 记下这次提交面向哪个板块 */
        submitAssetForReview(kind,item);return;
      }
      if(choice==='work-personal'){setRoute(kind,id,'work-personal');toast('已发布到工作板块（个人自用），安全检测通过后安装到 Work','success');}
      else return;
    }else if(act==='withdraw'){
      if(route==='work-personal')setRoute(kind,id,'');
      else if(route==='dev-pending'||route==='work-pending'){withdrawPendingReview(kind,id);toast('已撤回提交');}
      else return;
    }else{
      toast(demoActionToast(act,item.name),act==='check'?'success':undefined);return;
    }
    document.dispatchEvent(new Event('lingee:cloud-assets-changed'));
  },true);
  const items=$$('.sb-scroll [data-hub-menu]');
  items.forEach(item=>{
    const open=()=>openHub(item.dataset.hubMenu,MENUS[item.dataset.hubMenu].tab);
    item.addEventListener('click',open);
    item.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}
    });
  });
  /* 刷新后停在技能或连接器页时，补回页签导航 */
  Object.keys(VIEWS).forEach(tab=>{if(!$('#view-'+VIEWS[tab]).classList.contains('hidden'))openHub('center',tab);});
  /* 侧栏切到其他菜单（其他入口调用 setNavActive）时，该菜单不再高亮：撤掉导航条，原页面恢复原样 */
  new MutationObserver(()=>{
    if(state&&!items.some(item=>item.classList.contains('active'))){state=null;unmount();}
  }).observe($('.sb-scroll'),{subtree:true,attributes:true,attributeFilter:['class']});
}
