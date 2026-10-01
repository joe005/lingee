import { $ } from '../../core/dom.js';
import { cloudCatalog, cloudUpgradeBadge } from '../expert/platform-admin.js';
import { xav, xesc } from '../expert/data.js';
import { layerVisible } from '../expert/layers.js';
const modes={expert:'mine',team:'mine'};
export function setAssetBrowseMode(kind,mode){modes[kind]=mode;}
export function isMoreAssets(kind){return modes[kind]==='more';}
export function syncAssetBrowser(kind,items){
  document.querySelectorAll('[data-asset-primary="'+kind+'"] [data-asset-mode]').forEach(btn=>{const on=btn.dataset.assetMode===modes[kind];btn.classList.toggle('active',on);btn.setAttribute('aria-pressed',String(on));});
  const total=$('[data-asset-primary="'+kind+'"] [data-asset-total]');if(total)total.textContent='('+items.filter(item=>layerVisible(kind,item)).length+')';
  document.querySelector('[data-layer-tabs="'+kind+'"]')?.classList.toggle('hidden',isMoreAssets(kind));
  document.querySelector('[data-cloud-demo="'+kind+'"]')?.classList.toggle('hidden',!isMoreAssets(kind));
}
export function cloudCardsHtml(kind,keyword){
  const kw=keyword.trim().toLowerCase();
  const rows=cloudCatalog().filter(item=>item.kind===kind&&(!kw||`${item.data.name} ${item.data.desc} ${(item.data.tags||item.data.domains||[]).join(' ')}`.toLowerCase().includes(kw)));
  return rows.map(item=>{
    const {data,version,installed,note}=item,source=data.source==='tenant'?'租户发布':'Lingee 官方',update=installed&&version>installed;
    const installButton=!installed?`<button type="button" class="expert-install-plus" data-market-install="${xesc(item.key)}" aria-label="安装${xesc(data.name)}" title="安装${xesc(data.name)}"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg></button>`:'';
    return `<div class="app-card x-card ${!installed?'expert-market-uninstalled':''}">${installButton}<div class="card-top"><img class="x-av" src="${xav(data.k||'lead')}" alt=""><div class="card-titles"><div class="card-title-row"><span class="card-title">${xesc(data.name)}</span><span class="platform-client-badge">v${installed||version}</span></div><div class="x-sub">${installed?'已安装 · '+source:source}${update?cloudUpgradeBadge(item.key):''}</div></div></div><div class="card-desc">${xesc(data.desc||'暂无描述')}</div>${installed?`<div class="expert-market-note">更新说明：${xesc(note)}</div>`:''}</div>`;

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
