import { isLocalAssetInstalled } from '../expert/local-install-state.js';
import { setWorkspaceCapabilityRenderer, setWorkspaceAssetControls, setWorkspaceMoreInstall, setWorkspaceAssetVisibility, assetTagsHtml } from './expert-market.js';
import '../../../styles/parts/collab/capability-settings.css';
import { getSpaceScope } from '../tasks-v2/page/space-filter.js';
import { tkScopeProjects } from '../tasks-v2/data.js';
import { wsById } from '../../core/workspace-tree.js';
import { basicEditable } from './basic-settings-data.js';
import { capabilityList, capabilityMigrate } from './capability-config.js';
import { assetSourceBadge, layerOf, layerVisible } from '../expert/layers.js';
import { xav, xesc } from '../expert/data.js';

export function capabilityContext() {
  /* 范围含 Build 独立工作区容器，否则独立工作区的智能体设置和「更多」里的工作区资产都取不到 */
  const scope = getSpaceScope(), p = tkScopeProjects().find(p => p.id === scope.project);
  const ws = p && scope.ws ? wsById(p,scope.ws) : null;
  return {p,ws,editable:!!p && (!scope.ws || !!ws) && basicEditable(p,ws)};
}
/* 已聚焦到具体范围，来源只标「工作区」，不重复范围名称。 */
function originHtml() { return '<span class="cv-workspace-origin">空间</span>'; }
/* 金蝶官方预置出厂的资产随产品自带，不属于工作区分配，不显示「工作区」标记 */
function originFor(kind,data) { return layerOf(kind,data || {}) === 'builtin' ? '' : originHtml(); }
/* 与「更多」里其他未安装卡片统一为右上角「+」图标按钮，按工作区固定版本安装到当前用户本机 */
function installButton(row,p,ws) {
  const name = xesc(row.data?.name || '');
  return '<button type="button" class="expert-install-plus" data-workspace-install="'+xesc(row.key)+'" data-space="'+xesc(p.id)+'" data-workspace="'+xesc(ws?.id || '')+'" aria-label="安装'+name+'" title="安装到本机"><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg></button>';
}
/* 「我添加的」只呈现已在本机安装的资产及其工作区来源；添加、移除归属设置页面，本机安装在「更多」。 */
export function workspaceCapabilityControls(kind,item) {
  const {p,ws} = capabilityContext();
  const row = p && capabilityList(p,ws?.id).entries.find(row => row.key === kind+':'+item.id);
  return row && isLocalAssetInstalled(row) ? originFor(kind,item) : '';
}
/* 工作区已添加、本机尚未安装工作区版本的资产：在「更多」里带工作区标记，按工作区固定版本安装。 */
export function workspaceInstallOffer(kind,item) {
  const {p,ws} = capabilityContext();
  const row = p && capabilityList(p,ws?.id).entries.find(row => row.key === kind+':'+item.id);
  return row && !isLocalAssetInstalled(row) ? {tag:originFor(kind,item),button:installButton(row,p,ws),version:row.version} : null;
}
/* 工作区已添加的资产，不依赖个人云端目录：设置里可添加的内容在「更多」里同样可见；
   本机未安装的可安装，已安装的保留在列表里（installed 标记，不显示安装按钮），都带工作区标记 */
export function workspaceInstallCandidates(kind) {
  const {p,ws} = capabilityContext();
  if (!p) return [];
  return capabilityList(p,ws?.id).entries.filter(row => row.kind === kind).map(row => ({key:row.key,kind:row.kind,data:row.data,version:row.version,installed:isLocalAssetInstalled(row) ? 'local' : '',tag:originFor(row.kind,row.data)}));
}
export function workspaceCapabilityVisible() { return true; }
export function workspaceCatalogRows() { return null; }
export function renderWorkspaceCapabilities() { return false; }
export function workspaceCapabilityExtras(kind,items,keyword,layer='all') {
  const {p,ws} = capabilityContext();
  if (!p) return '';
  const known = new Set(items.filter(item => layerVisible(kind,item)).map(item => kind+':'+item.id));
  const kw = keyword.trim().toLocaleLowerCase();
  const rows = capabilityList(p,ws?.id).entries.filter(row => row.kind === kind && !known.has(row.key) && isLocalAssetInstalled(row)
    && (layer === 'all' || layer === (row.data.tenantId ? 'shared' : 'builtin'))
    && (!kw || [row.data.name,row.data.desc,...(row.data.tags || row.data.domains || [])].join(' ').toLocaleLowerCase().includes(kw)));
  if (!rows.length) return '';
  return rows.map(row => {
    const face = row.kind === 'team' ? '<span class="x-faces">'+(row.experts || []).slice(0,4).map(e => '<img src="'+xav(e.data.k)+'" alt="">').join('')+'</span>' : '<img class="x-av" src="'+xav(row.data.k)+'" alt="">';
    return '<article class="app-card x-card" data-workspace-asset="'+xesc(row.key)+'"><div class="card-top">'+face+'<div class="card-titles"><div class="card-title-row"><span class="card-title">'+xesc(row.data.name)+'</span></div><div class="x-sub asset-card-summary">'+assetSourceBadge(row.kind,row.data)+'<span class="platform-client-badge">V'+xesc(row.version)+'</span><span>'+(row.kind === 'team' ? (row.data.members || []).length+' 个智能体' : (row.data.skills || []).length+' 个技能')+'</span>'+originFor(row.kind,row.data)+'</div></div></div><div class="card-desc">'+xesc(row.data.desc || '')+'</div>'+assetTagsHtml(row.data.tags || row.data.domains || [])+'</article>';
  }).join('');
}
export function initCapabilitySettings() {
  document.addEventListener('click',event => {
    const button=event.target.closest('[data-workspace-install]');if(!button)return;
    event.preventDefault();event.stopPropagation();
    const {p,ws}=capabilityContext();
    if(!p || p.id!==button.dataset.space || (ws?.id || '')!==button.dataset.workspace)return;
    const row=capabilityList(p,ws?.id).entries.find(row=>row.key===button.dataset.workspaceInstall);
    if(row)document.dispatchEvent(new CustomEvent('lingee:install-workspace-asset',{detail:{entry:row}}));
  },true);
  setWorkspaceCapabilityRenderer(renderWorkspaceCapabilities);
  setWorkspaceAssetControls(workspaceCapabilityControls,workspaceCapabilityExtras,workspaceCatalogRows);
  setWorkspaceAssetVisibility(workspaceCapabilityVisible);
  setWorkspaceMoreInstall(workspaceInstallOffer,workspaceInstallCandidates);
  function refresh() {
    const {p} = capabilityContext();
    if (p) capabilityMigrate(p);
    document.dispatchEvent(new Event('lingee:cloud-assets-changed'));
  }
  document.addEventListener('lingee:tk-space-changed',refresh);
  document.addEventListener('lingee:capabilities-changed',refresh);
  refresh();
}
