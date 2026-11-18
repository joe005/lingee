import { $ } from '../../core/dom.js';
import { EX, xav, xesc } from '../expert/data.js';
import { assetSourceBadge, layerOf, layerVisible } from '../expert/layers.js';
import { UNLISTED_EXPERT_IDS } from '../expert/builtin-catalog.js';
const modes={expert:'mine',team:'mine'};
let cloudCatalogProvider=()=>[];
let cloudUpgradeBadgeProvider=()=>'';
let publicationStatusProvider=()=>'';
export function setCloudAssetProviders(providers){
  cloudCatalogProvider=providers?.catalog||cloudCatalogProvider;
  cloudUpgradeBadgeProvider=providers?.upgradeBadge||cloudUpgradeBadgeProvider;
  publicationStatusProvider=providers?.publicationStatus||publicationStatusProvider;
}
export function assetUpgradeHtml(kind,id){return cloudUpgradeBadgeProvider(kind+':'+id);}
export function assetPublicationStatus(kind,id,version){return publicationStatusProvider(kind+':'+id,version);}
export function setAssetBrowseMode(kind,mode){modes[kind]=mode;justInstalled.clear();}
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
/* 「更多」里本次点过安装的条目：装好后留在原位（不再显示 +），切换「我的 / 更多」或重新进入后才移走，避免点完卡片立刻消失 */
const justInstalled=new Set();
export function cloudCardsHtml(kind,keyword){
  const kw=keyword.trim().toLowerCase();
  const scopedCatalog=workspaceCatalog?.();
  const catalog=scopedCatalog||cloudCatalogProvider(),experts=new Map(catalog.filter(item=>item.kind==='expert').map(item=>[item.data.id,item.data]));
  /* 「更多」只列可用但本机还没装的内容，未安装的卡片右上角显示 + 安装入口；已安装的在「我的」里看 */
  const matches=item=>!kw||`${item.data.name} ${item.data.desc} ${(item.data.tags||item.data.domains||[]).join(' ')}`.toLowerCase().includes(kw);
  const listed=new Set(catalog.map(item=>item.key));
  /* 空间已添加的资产（含本机已安装的），不在个人目录里的（如仅租户可见）用空间保存的快照补进来 */
  const workspaceRows=workspaceMoreCandidates(kind),workspaceInstalled=new Map(workspaceRows.filter(item=>item.installed).map(item=>[item.key,item]));
  /* 金蝶官方内容默认预置安装；只有本机没装（如被卸载）的才进入「更多」，不对外列出的官方智能体不出现 */
  const preset=item=>layerOf(kind,item.data)==='builtin';
  const hiddenPreset=item=>preset(item)&&(!!item.installed||item.data.listed===false||kind==='expert'&&UNLISTED_EXPERT_IDS.has(item.data.id));
  /* 「空间可用」的内容不进入个人「更多」，只有我能看到的空间已添加的才出现（带空间标记） */
  const workspaceOnly=item=>item.scope==='workspace'&&!workspaceRows.some(row=>row.key===item.key);
  const rows=catalog.filter(item=>item.kind===kind&&!hiddenPreset(item)&&!workspaceOnly(item)&&matches(item)).concat(workspaceRows.filter(item=>!listed.has(item.key)&&matches(item)))
    .map(item=>{
      const workspaceInstall=workspaceMoreInstall(kind,item.data),installedRow=workspaceInstalled.get(item.key);
      return {item,workspaceInstall,installedRow,installed:!workspaceInstall&&(!!item.installed||!!installedRow)};
    })
    .filter(row=>!row.installed||justInstalled.has(row.item.key))
    /* 我负责的任务要用的排在前面 */
    .sort((a,b)=>(b.workspaceInstall?.need?1:0)-(a.workspaceInstall?.need?1:0));
  return rows.map(({item,workspaceInstall,installedRow,installed})=>{
    const {data,version}=item;
    const installButton=workspaceInstall?.button||(installed?'':`<button type="button" class="expert-install-plus" data-market-install="${xesc(item.key)}" aria-label="安装${xesc(data.name)}" title="安装${xesc(data.name)}"><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg></button>`);
    const members=data.members||[],showMemberCount=members.length>4;
    const face=kind==='team'?`<span class="x-faces">${members.slice(0,showMemberCount?3:4).map(id=>`<img src="${xav((experts.get(id)||EX[id])?.k||'lead')}" alt="">`).join('')}${showMemberCount?`<span class="asset-faces-count">+${members.length-3}</span>`:''}</span>`:`<img class="x-av" src="${xav(data.k||'lead')}" alt="">`;
    const tags=assetTagsHtml(kind==='team'?data.domains:data.tags);
    const responsibilities=assetModesHtml(kind==='team'?teamWorkModes(data,id=>experts.get(id)||EX[id]):data.modes);
    const summary=kind==='team'?`${(data.members||[]).length} 个智能体`:`${(data.skills||[]).length} 个技能`;
    return `<div class="app-card x-card expert-market-uninstalled${installed?' is-installed':''}" data-asset-key="${xesc(item.key)}">${installButton}<div class="card-top">${face}<div class="card-titles"><div class="card-title-row"><span class="card-title">${xesc(data.name)}</span></div><div class="x-sub asset-card-summary">${assetSourceBadge(kind,data)}<span class="platform-client-badge">V${workspaceInstall?.version||installedRow?.version||version}</span>${workspaceInstall?.tag||installedRow?.tag||''}<span>${summary}</span><span class="asset-card-upgrade-anchor"></span></div></div></div><div class="card-desc">${xesc(data.desc||'暂无描述')}</div>${tags}${responsibilities}</div>`;

  }).join('')||'<div class="x-empty">'+(kw?'没有匹配的云端内容':'可用的内容都已安装，可在「我的」中查看')+'</div>';
}
export function initExpertMarket(renderers){
  for(const kind of ['expert','team']){
    document.querySelector('[data-asset-primary="'+kind+'"]')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-asset-mode]');if(!button)return;modes[kind]=button.dataset.assetMode;justInstalled.clear();renderers[kind]();
    });

  }
  /* 记下在「更多」里点过安装的条目（个人安装与空间版本安装两种按钮），装好后本次仍留在列表里 */
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-market-install],[data-workspace-install]');
    if(button)justInstalled.add(button.dataset.marketInstall||button.dataset.workspaceInstall);
  },true);
  document.addEventListener('lingee:cloud-assets-changed',()=>{renderers.expert();renderers.team();});
  document.addEventListener('lingee:asset-editor-saved',event=>renderers[event.detail.kind]?.());
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
