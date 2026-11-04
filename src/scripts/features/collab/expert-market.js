import { $ } from '../../core/dom.js';
import { EX, xav, xesc } from '../expert/data.js';
import { assetSourceBadge, layerVisible } from '../expert/layers.js';
const modes={expert:'mine',team:'mine'};
let cloudCatalogProvider=()=>[];
let cloudUpgradeBadgeProvider=()=>'';
export function setCloudAssetProviders(providers){
  cloudCatalogProvider=providers?.catalog||cloudCatalogProvider;
  cloudUpgradeBadgeProvider=providers?.upgradeBadge||cloudUpgradeBadgeProvider;
}
export function assetUpgradeHtml(kind,id){return cloudUpgradeBadgeProvider(kind+':'+id);}
export function setAssetBrowseMode(kind,mode){modes[kind]=mode;}
export function isMoreAssets(kind){return modes[kind]==='more';}
export function isPersonalAssets(kind){return modes[kind]==='mine';}
export function syncAssetBrowser(kind,items){
  const panel=document.querySelector('[data-asset-primary="'+kind+'"]')?.closest('.cv-panel');
  if(panel&&panel.dataset.assetBrowseMode!==modes[kind])panel.dataset.assetBrowseMode=modes[kind];
  document.querySelectorAll('[data-asset-primary="'+kind+'"] [data-asset-mode]').forEach(btn=>{const on=btn.dataset.assetMode===modes[kind];btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));});
  const total=$('[data-asset-primary="'+kind+'"] [data-asset-total]');if(total)total.textContent='('+items.filter(item=>layerVisible(kind,item)).length+')';
  document.querySelector('[data-layer-tabs="'+kind+'"]')?.classList.toggle('hidden',isMoreAssets(kind));
  document.querySelector('[data-layer-tabs="'+kind+'"]')?.closest('.asset-secondary-row')?.classList.toggle('hidden',isMoreAssets(kind));
}
export function assetTagsHtml(values){
  const tags=[...new Set((values||[]).filter(Boolean))];
  return tags.length?`<div class="card-tags">${tags.slice(0,4).map(tag=>`<span class="ptag">${xesc(tag)}</span>`).join('')}${tags.length>4?`<span class="ptag">+${tags.length-4}</span>`:''}</div>`:'';
}
/* 卡片上不再展示「可承担的工作」；保留函数供各页面调用，统一返回空 */
export function assetModesHtml(){
  return '';
}
export function teamWorkModes(team,lookup=id=>EX[id]){
  return [...new Set((team.members||[]).flatMap(id=>lookup(id)?.modes||[]))];
}
export function cloudCardsHtml(kind,keyword){
  const kw=keyword.trim().toLowerCase();
  const scopedCatalog=workspaceCatalog?.();
  const catalog=scopedCatalog||cloudCatalogProvider(),experts=new Map(catalog.filter(item=>item.kind==='expert').map(item=>[item.data.id,item.data]));
  /* 「更多」只列未安装的云端内容：卡片右上角的 + 即添加入口，安装成功后回到「我的」列表。 */
  const matches=item=>!kw||`${item.data.name} ${item.data.desc} ${(item.data.tags||item.data.domains||[]).join(' ')}`.toLowerCase().includes(kw);
  const listed=new Set(catalog.map(item=>item.key));
  /* 工作区已添加但不在个人目录里的资产（如仅租户可见），用工作区保存的快照补进来 */
  const rows=catalog.filter(item=>item.kind===kind&&(!item.installed||workspaceMoreInstall(kind,item.data))&&matches(item)).concat(workspaceMoreCandidates(kind).filter(item=>!listed.has(item.key)&&matches(item)));
  return rows.map(item=>{
    const {data,version}=item;
    const workspaceInstall=workspaceMoreInstall(kind,data);
    const installButton=workspaceInstall?.button||`<button type="button" class="expert-install-plus" data-market-install="${xesc(item.key)}" aria-label="安装${xesc(data.name)}" title="安装${xesc(data.name)}"><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg></button>`;
    const members=data.members||[],showMemberCount=members.length>4;
    const face=kind==='team'?`<span class="x-faces">${members.slice(0,showMemberCount?3:4).map(id=>`<img src="${xav((experts.get(id)||EX[id])?.k||'lead')}" alt="">`).join('')}${showMemberCount?`<span class="asset-faces-count">+${members.length-3}</span>`:''}</span>`:`<img class="x-av" src="${xav(data.k||'lead')}" alt="">`;
    const tags=assetTagsHtml(kind==='team'?data.domains:data.tags);
    const responsibilities=assetModesHtml(kind==='team'?teamWorkModes(data,id=>experts.get(id)||EX[id]):data.modes);
    const summary=kind==='team'?`${(data.members||[]).length} 个智能体`:`${(data.skills||[]).length} 个技能`;
    return `<div class="app-card x-card expert-market-uninstalled">${installButton}<div class="card-top">${face}<div class="card-titles"><div class="card-title-row"><span class="card-title">${xesc(data.name)}</span></div><div class="x-sub asset-card-summary">${assetSourceBadge(kind,data)}<span class="platform-client-badge">V${workspaceInstall?.version||version}</span>${workspaceInstall?.tag||''}<span>${summary}</span><span class="asset-card-upgrade-anchor"></span></div></div></div><div class="card-desc">${xesc(data.desc||'暂无描述')}</div>${tags}${responsibilities}</div>`;

  }).join('')||'<div class="x-empty">没有匹配的云端内容</div>';
}
export function initExpertMarket(renderers){
  for(const kind of ['expert','team']){
    document.querySelector('[data-asset-primary="'+kind+'"]')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-asset-mode]');if(!button)return;modes[kind]=button.dataset.assetMode;renderers[kind]();
    });

  }
  document.addEventListener('lingee:cloud-assets-changed',()=>{renderers.expert();renderers.team();});
}

let workspaceRenderer = () => false;
export function setWorkspaceCapabilityRenderer(renderer) { workspaceRenderer = renderer; }
export function renderWorkspaceCapabilities(host) { return workspaceRenderer(host); }

let workspaceControls = () => '';
let workspaceExtras = () => '';
let workspaceCatalog = null;
export function setWorkspaceAssetControls(controls, extras, catalog) { workspaceControls = controls; workspaceExtras = extras; workspaceCatalog = catalog || null; }
export function workspaceAssetControls(kind, item) { return workspaceControls(kind,item); }
export function workspaceExtraCards(kind, items, keyword = '', layer = 'all') { return workspaceExtras(kind,items,keyword,layer); }

let workspaceMoreInstall = () => null;
let workspaceMoreCandidates = () => [];
export function setWorkspaceMoreInstall(provider,candidates) { workspaceMoreInstall = provider; workspaceMoreCandidates = candidates || workspaceMoreCandidates; }

let workspaceVisibility = () => true;
export function setWorkspaceAssetVisibility(provider) { workspaceVisibility = provider; }
export function workspaceAssetVisible(kind,item) { return workspaceVisibility(kind,item); }
