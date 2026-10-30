import '../../styles/pages/asset-hub.css';
import { $, $$ } from '../core/dom.js';
import { setNavActive, showView } from '../core/view.js';
/* 侧栏「技能·智能体·连接器」菜单：挂技能 / 智能体 / 连接器三个页签。
   页签只是导航条，内容仍是原有页面（技能页、协作开发里的智能体与智能体团队、连接器页），
   智能体页签下用右侧的「智能体 / 智能体团队」开关在两个列表间切换；
   原菜单与页面保持不变；导航条按当前页签挂到对应页面顶部，离开菜单时移除。 */
const MENUS={center:{label:'技能·智能体·连接器',tab:'skills'}};
const TABS=[['skills','技能'],['experts','智能体'],['connectors','连接器']];
const KINDS=[['experts','智能体'],['teams','智能体团队']];
/* 技能与连接器是独立页面，智能体挂在协作开发容器里 */
const VIEWS={skills:'skill-center',connectors:'connectors'};
let state=null,nav=null;

function buildNav(){
  nav=document.createElement('div');
  nav.className='asset-hub-nav';
  nav.setAttribute('role','tablist');
  nav.setAttribute('aria-label','技能·智能体·连接器');
  nav.innerHTML=TABS.map(([tab,text])=>`<button type="button" role="tab" data-hub-tab="${tab}">${text}</button>`).join('')
    +`<div class="asset-hub-kind" role="group" aria-label="智能体类型" hidden>${KINDS.map(([tab,text])=>`<button type="button" data-hub-kind="${tab}">${text}</button>`).join('')}</div>`;
  nav.addEventListener('click',event=>{
    const button=event.target.closest('[data-hub-tab],[data-hub-kind]');
    if(button&&state)openHub(state.menu,button.dataset.hubTab||button.dataset.hubKind);
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
  /* 智能体与智能体团队共用「智能体」页签 */
  const group=tab==='teams'?'experts':tab;
  nav.querySelectorAll('[data-hub-tab]').forEach(button=>{
    const on=button.dataset.hubTab===group;
    button.classList.toggle('active',on);
    button.setAttribute('aria-selected',String(on));
  });
  const kind=nav.querySelector('.asset-hub-kind');
  kind.hidden=group!=='experts';
  kind.querySelectorAll('[data-hub-kind]').forEach(button=>{
    const on=button.dataset.hubKind===tab;
    button.classList.toggle('active',on);
    button.setAttribute('aria-pressed',String(on));
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
