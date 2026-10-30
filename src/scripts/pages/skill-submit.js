import '../../styles/pages/skill-submit.css';
import { $, $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { requestDeleteConfirmation } from '../core/delete-confirm.js';
import { chooseRoute } from '../features/expert/asset-routes.js';
/* 技能开发页：卡片「⋯」菜单（编辑、本地测试、云端测试、检查、提交、删除）。
   「提交」先做一次分发路由，与「技能·智能体·连接器」菜单共用同一个弹窗：面向开发板块（需审核），或面向工作板块的
   「企业分发」（需管理员审核）/「个人自用」（安全检测通过后即时安装到 Work）；开发与工作互斥，提交后「提交」置灰。
   状态只在页面里演示（改卡片上的状态文字与 data-status），刷新恢复初始。 */
export function init(){
  const view=$('#view-skills'),menu=$('#skillCardMenu');
  if(!view||!menu)return;
  let menuCard=null,trigger=null;
  const nameOf=card=>($('.card-title',card)?.textContent||'').trim();
  const rowsOf=card=>$$('.card-meta-row',card);
  /* 已提交审核、已发布或已个人自用安装的技能不能再次提交（开发与工作互斥） */
  function submitBlocked(card){
    const rows=rowsOf(card),personalInstalled=rows[0]?.querySelector('b')?.textContent==='个人'&&rows[0]?.lastElementChild?.textContent==='已安装';
    return ['审核中','已发布'].includes(card.dataset.status||'')||personalInstalled;
  }
  function closeMenu(restoreFocus){
    if(menu.hidden)return;
    menu.hidden=true;
    trigger?.setAttribute('aria-expanded','false');
    if(restoreFocus)trigger?.focus();
    menuCard=null;trigger=null;
  }
  function openMenu(card,button){
    closeMenu(false);
    menuCard=card;trigger=button;
    const submit=menu.querySelector('[data-skill-action="submit"]'),blocked=submitBlocked(card);
    submit.disabled=blocked;
    submit.title=blocked?'已提交或已发布，如需调整请联系管理员':'';
    menu.hidden=false;
    const rect=button.getBoundingClientRect();
    menu.style.top=Math.min(rect.bottom+4,window.innerHeight-menu.offsetHeight-8)+'px';
    menu.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-menu.offsetWidth-8))+'px';
    button.setAttribute('aria-expanded','true');
    menu.querySelector('.agent-card-menu-item:not(:disabled)')?.focus();
  }
  async function submit(card){
    const name=nameOf(card),rows=rowsOf(card);
    const choice=await chooseRoute(name);
    if(!choice||!card.isConnected)return;
    if(choice==='work-personal'){
      toast('「'+name+'」正在进行安全检测…');
      setTimeout(()=>{
        if(!card.isConnected)return;
        const installed=rows[0]?.lastElementChild;
        if(installed)installed.textContent='已安装';
        toast('安全检测通过，「'+name+'」已安装到 Work','success');
      },1200);
      return;
    }
    /* 开发板块与企业分发都进入审核中；第二行的标签标明面向哪个板块 */
    card.dataset.status='审核中';
    const label=rows[1]?.querySelector('b');
    if(label)label.textContent=choice==='dev'?'开发板块':'企业分发';
    const status=rows[1]?.querySelector('.card-status-text');
    if(status)status.textContent='审核中';
    $('.tab.active',view)?.click();   /* 按当前页签重新筛选 */
    toast(choice==='dev'?'已提交开发板块审核，通过后可在开发板块运行':'已提交企业分发，请等待管理员审核','success');
  }
  async function run(action){
    const card=menuCard;
    closeMenu(false);
    if(!card)return;
    const name=nameOf(card);
    if(action==='submit')submit(card);
    else if(action==='edit')toast('打开技能开发会话：'+name);
    else if(action==='local-test')toast('已进入本地测试：'+name);
    else if(action==='cloud-test')toast('已推送到云端测试环境：'+name);
    else if(action==='check')toast('检查完成：「'+name+'」未发现问题','success');
    else if(action==='delete'&&await requestDeleteConfirmation('确定删除技能「'+name+'」吗？删除后不可恢复。')){
      card.remove();toast('已删除技能「'+name+'」');
    }
  }
  $$('.card-more',view).forEach(more=>{
    more.setAttribute('role','button');more.tabIndex=0;
    more.setAttribute('aria-haspopup','menu');more.setAttribute('aria-expanded','false');
    more.setAttribute('aria-label','更多操作：'+nameOf(more.closest('.app-card')));
  });
  /* 捕获阶段接管：原有的「更多操作」提示不再弹出 */
  const toggle=more=>{
    const card=more.closest('.app-card');
    if(menuCard===card)closeMenu(false);else openMenu(card,more);
  };
  document.addEventListener('click',event=>{
    const more=event.target.closest('#view-skills .card-more');
    if(!more)return;
    event.stopPropagation();toggle(more);
  },true);
  view.addEventListener('keydown',event=>{
    const more=event.target.closest('.card-more');
    if(more&&(event.key==='Enter'||event.key===' ')){event.preventDefault();toggle(more);}
  });
  menu.addEventListener('click',event=>{
    const item=event.target.closest('[data-skill-action]:not(:disabled)');
    if(!item)return;
    event.stopPropagation();run(item.dataset.skillAction);
  });
  document.addEventListener('click',event=>{if(!event.target.closest('#skillCardMenu'))closeMenu(false);});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')closeMenu(true);
  });
  window.addEventListener('resize',()=>closeMenu(false));
  view.addEventListener('scroll',()=>closeMenu(false));
}
