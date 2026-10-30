import moreIcon from '../../../assets/figma/expert-assets/more.svg';
import dialogIcon from '../../../assets/figma/expert-assets/dialog.svg';
import { xesc } from './data.js';
let menuSequence=0;

/* 列表卡片的菜单只负责呈现；查看沿用所属页面的点击委托，卸载交给安装模块。 */
export function assetCardActionsHtml(kind, item, personal, callAttribute) {
  const menuId='asset-card-menu-'+kind+'-'+encodeURIComponent(item.id)+'-'+(++menuSequence);
  return '<div class="asset-card-actions">'
    +'<button type="button" class="asset-card-menu-toggle" data-asset-card-menu-toggle aria-haspopup="menu" aria-expanded="false" aria-controls="'+xesc(menuId)+'" aria-label="'+xesc(item.name)+'的更多操作" title="更多操作"><img src="'+moreIcon+'" width="16" height="16" alt=""></button>'
    +'<button type="button" class="x-call" '+callAttribute+'="'+xesc(item.id)+'" aria-label="对话'+xesc(item.name)+'" title="对话"><img src="'+dialogIcon+'" width="16" height="16" alt=""></button>'
    +'<div class="asset-card-menu" id="'+xesc(menuId)+'" role="menu" hidden>'
    +'<button type="button" role="menuitem" data-asset-card-view><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg><span>查看</span></button>'
    +(personal?'<button type="button" role="menuitem" class="asset-card-uninstall" data-asset-card-delete="'+xesc(item.id)+'" data-asset-card-kind="'+kind+'">删除</button>':'<button type="button" role="menuitem" class="asset-card-uninstall" data-cloud-uninstall="'+xesc(kind+':'+item.id)+'">卸载</button>')
    +'</div></div>';
}

/* 「技能·智能体·连接器」菜单里卡片的两条运行路线：在开发板块运行，或（个人开发）发布到 Work；
   在协作开发自己的页签里由样式隐藏，见 styles/pages/asset-hub.css */
export function assetRoutesHtml(kind, item, personal, callAttribute) {
  const noun=kind==='team'?'智能体团队':'智能体';
  return '<div class="asset-card-routes">'
    +'<button type="button" class="asset-card-route" '+callAttribute+'="'+xesc(item.id)+'" title="在开发板块新建会话并带上该'+noun+'">在开发中运行</button>'
    +(personal?'<button type="button" class="asset-card-route asset-card-route--work" data-asset-route-publish="'+kind+':'+xesc(item.id)+'" title="提交审核，通过后在 Work 中使用">发布到 Work</button>':'')
    +'</div>';
}

function closeMenus(except, returnFocus=false) {
  document.querySelectorAll('#view-collab .asset-card-menu-toggle[aria-expanded="true"]').forEach(button=>{
    if(button===except)return;
    button.setAttribute('aria-expanded','false');
    document.getElementById(button.getAttribute('aria-controls'))?.setAttribute('hidden','');
    if(returnFocus)button.focus();
  });
}

export function initAssetCardActions() {
  document.addEventListener('click',event=>{
    const deletion=event.target.closest('#view-collab [data-asset-card-delete]');
    if(deletion){event.stopPropagation();closeMenus(null);document.dispatchEvent(new CustomEvent('lingee:asset-card-delete',{detail:{kind:deletion.dataset.assetCardKind,id:deletion.dataset.assetCardDelete}}));return;}
    const toggle=event.target.closest('#view-collab [data-asset-card-menu-toggle]');
    if(toggle){
      event.stopPropagation();
      const open=toggle.getAttribute('aria-expanded')!=='true';
      closeMenus(toggle);
      toggle.setAttribute('aria-expanded',String(open));
      const menu=document.getElementById(toggle.getAttribute('aria-controls'));
      if(menu){menu.hidden=!open;if(open)menu.querySelector('button')?.focus();}
      return;
    }
    closeMenus(null);
  },true);
  document.addEventListener('keydown',event=>{
    const menu=event.target.closest('#view-collab .asset-card-menu');
    if(event.key==='Escape'){closeMenus(null,true);return;}
    if(!menu)return;
    if(event.key==='Tab'){closeMenus(null,true);return;}
    const items=[...menu.querySelectorAll('button')];
    const current=items.indexOf(document.activeElement);
    let next;
    if(event.key==='ArrowDown')next=(current+1)%items.length;
    if(event.key==='ArrowUp')next=(current+items.length-1)%items.length;
    if(event.key==='Home')next=0;
    if(event.key==='End')next=items.length-1;
    if(next!==undefined){event.preventDefault();items[next]?.focus();}
  });
  document.addEventListener('focusin',event=>{
    if(!event.target.closest('#view-collab .asset-card-actions'))closeMenus(null);
  });
}
