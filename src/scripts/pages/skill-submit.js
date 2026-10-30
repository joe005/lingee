import '../../styles/pages/skill-submit.css';
import { $, $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { requestDeleteConfirmation } from '../core/delete-confirm.js';
/* 技能开发页：卡片「⋯」菜单（编辑、本地测试、云端测试、检查、提交、删除）与提交技能的路径选择。
   对照 Lingee Build：两条路径都指向工作板块——「企业分发」需管理员审核后生效，「个人自用」安全检测通过后即时安装到 Work。
   状态只在页面里演示（改卡片上的状态文字与 data-status），刷新恢复初始。开发板块的发布路径见「技能·智能体·连接器」菜单。 */
const HINTS={
  enterprise:'企业分发将对团队成员或市场开放，需管理员审核后生效。',
  personal:'个人自用仅本人可用，安全检测通过后即时安装到 Work，无需审核。'
};
export function init(){
  const view=$('#view-skills'),menu=$('#skillCardMenu'),overlay=$('#skillSubmitOverlay');
  if(!view||!menu||!overlay)return;
  let menuCard=null,trigger=null,submitCard=null;
  const nameOf=card=>($('.card-title',card)?.textContent||'').trim();
  const rowsOf=card=>$$('.card-meta-row',card);
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
    /* 与智能体开发一致：只有待提交、已驳回的技能可提交 */
    menu.querySelector('[data-skill-action="submit"]').hidden=!['待提交','已驳回'].includes(card.dataset.status||'');
    menu.hidden=false;
    const rect=button.getBoundingClientRect();
    menu.style.top=Math.min(rect.bottom+4,window.innerHeight-menu.offsetHeight-8)+'px';
    menu.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-menu.offsetWidth-8))+'px';
    button.setAttribute('aria-expanded','true');
    menu.querySelector('.agent-card-menu-item:not([hidden])')?.focus();
  }
  function openSubmit(card){
    submitCard=card;
    overlay.querySelector('input[value="enterprise"]').checked=true;
    $('#skillSubmitHint').textContent=HINTS.enterprise;
    overlay.hidden=false;
    $('#skillSubmitOk').focus();
  }
  function closeSubmit(){
    if(overlay.hidden)return;
    overlay.hidden=true;
    const card=submitCard;submitCard=null;
    card?.querySelector('.card-more')?.focus();
  }
  function confirmSubmit(){
    const card=submitCard,path=overlay.querySelector('input:checked')?.value;
    closeSubmit();
    if(!card)return;
    const name=nameOf(card),rows=rowsOf(card);
    if(path==='personal'){
      toast('「'+name+'」正在进行安全检测…');
      setTimeout(()=>{
        if(!card.isConnected)return;
        const installed=rows[0]?.lastElementChild;
        if(installed)installed.textContent='已安装';
        toast('安全检测通过，「'+name+'」已安装到 Work','success');
      },1200);
      return;
    }
    card.dataset.status='审核中';
    const status=rows[1]?.querySelector('.card-status-text');
    if(status)status.textContent='审核中';
    $('.tab.active',view)?.click();   /* 按当前页签重新筛选 */
    toast('已提交企业分发，请等待管理员审核','success');
  }
  async function run(action){
    const card=menuCard;
    closeMenu(false);
    if(!card)return;
    const name=nameOf(card);
    if(action==='submit')openSubmit(card);
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
    const item=event.target.closest('[data-skill-action]');
    if(!item)return;
    event.stopPropagation();run(item.dataset.skillAction);
  });
  overlay.addEventListener('click',event=>{
    if(event.target===overlay||event.target.closest('[data-skill-submit-close]'))closeSubmit();
  });
  overlay.addEventListener('change',event=>{$('#skillSubmitHint').textContent=HINTS[event.target.value]||'';});
  $('#skillSubmitOk').addEventListener('click',confirmSubmit);
  document.addEventListener('click',event=>{if(!event.target.closest('#skillCardMenu'))closeMenu(false);});
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(!overlay.hidden)closeSubmit();else closeMenu(true);
  });
  window.addEventListener('resize',()=>closeMenu(false));
  view.addEventListener('scroll',()=>closeMenu(false));
}
