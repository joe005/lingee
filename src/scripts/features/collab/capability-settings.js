import { setWorkspaceCapabilityRenderer, setWorkspaceAssetControls, setWorkspaceAssetVisibility, setAssetBrowseMode, assetTagsHtml } from './expert-market.js';
import '../../../styles/parts/collab/capability-settings.css';
import moreIcon from '../../../assets/figma/expert-assets/more.svg';
import { getSpaceScope } from '../tasks-v2/page/space-filter.js';
import { tkProjectsForCurrentUser } from '../tasks-v2/data.js';
import { wsById } from '../../core/workspace-tree.js';
import { basicEditable } from './basic-settings-data.js';
import { capabilityCatalog, capabilityList, capabilityChange, capabilityMigrate } from './capability-config.js';
import { UNLISTED_EXPERT_IDS } from '../expert/builtin-catalog.js';
import { xav, xesc } from '../expert/data.js';
import { toast } from '../../core/toast.js';
import { requestDeleteConfirmation } from '../../core/delete-confirm.js';

export function capabilityContext() {
  const scope = getSpaceScope(), p = tkProjectsForCurrentUser().find(p => p.id === scope.project);
  const ws = p && scope.ws ? wsById(p,scope.ws) : null;
  return {p, ws, editable:!!p && (!scope.ws || !!ws) && basicEditable(p,ws)};
}
function inPersonalHub() { return document.getElementById('view-collab')?.classList.contains('asset-hub-mode'); }
function actionAttributes(action,key,p,ws) {
  return ' data-capability-action="'+action+'" data-capability-key="'+xesc(key)+'" data-space="'+xesc(p.id)+'" data-workspace="'+xesc(ws?.id || '')+'"';
}
export function workspaceCapabilityControls(kind,item) {
  const {p,ws,editable} = capabilityContext();
  if (!p || !editable || inPersonalHub()) return '';
  const key = kind+':'+item.id, list = capabilityList(p,ws?.id);
  if (list.entries.some(row => row.key === key)) return '';
  if (!capabilityCatalog(p).some(row => row.key === key)) return '';
  return '<button type="button" class="expert-install-plus"'+actionAttributes('install',key,p,ws)+' aria-label="添加'+xesc(item.name)+'到当前工作区" title="添加到当前工作区"><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg></button>';
}
export function workspaceInstalledControls(row) {
  const {p,ws,editable} = capabilityContext();
  if (!p || !editable || inPersonalHub()) return '';
  const menuId='workspace-asset-menu-'+row.kind+'-'+encodeURIComponent(row.data.id);
  return '<div class="asset-card-actions"><button type="button" class="asset-card-menu-toggle" data-asset-card-menu-toggle aria-haspopup="menu" aria-expanded="false" aria-controls="'+xesc(menuId)+'" aria-label="'+xesc(row.data.name)+'的更多操作" title="更多操作"><img src="'+moreIcon+'" width="16" height="16" alt=""></button><div class="asset-card-menu" id="'+xesc(menuId)+'" role="menu" hidden><button type="button" role="menuitem" class="asset-card-uninstall"'+actionAttributes('uninstall',row.key,p,ws)+'>卸载</button></div></div>';
}
function cardsHtml(rows, editable) {
  return '<div class="apps-grid">'+rows.map(row => {
    const face = row.kind === 'team' ? '<span class="x-faces">'+(row.experts || []).slice(0,4).map(e => '<img src="'+xav(e.data.k)+'" alt="">').join('')+'</span>' : '<img class="x-av" src="'+xav(row.data.k)+'" alt="">';
    const shared = !!row.data.tenantId;
    const source = '<span class="x-badge asset-source-badge asset-source-'+(shared ? 'shared' : 'builtin')+'">'+(shared ? '企业自建' : '金蝶官方')+'</span>';
    const summary = row.kind === 'team' ? (row.data.members || []).length+' 个智能体' : (row.data.skills || []).length+' 个技能';
    return '<article class="app-card x-card" data-workspace-asset="'+xesc(row.key)+'">'+(editable ? workspaceInstalledControls(row) : '')+'<div class="card-top">'+face+'<div class="card-titles"><div class="card-title-row"><span class="card-title">'+xesc(row.data.name)+'</span></div><div class="x-sub asset-card-summary">'+source+'<span class="platform-client-badge">V'+xesc(row.version)+'</span><span>'+summary+'</span></div></div></div><div class="card-desc">'+xesc(row.data.desc || '')+'</div>'+assetTagsHtml(row.data.tags || row.data.domains || [])+'</article>';
  }).join('')+'</div>';
}
export function workspaceCapabilityExtras(kind,items,keyword,layer='all') {
  const {p,ws,editable} = capabilityContext();
  if (!p || !editable || inPersonalHub()) return '';
  const kw = keyword.trim().toLocaleLowerCase();
  const rows = capabilityList(p,ws?.id).entries.filter(row => row.kind === kind && (layer === 'all' || layer === (row.data.tenantId ? 'shared' : 'builtin')) && (!kw || (row.data.name+' '+row.data.desc).toLocaleLowerCase().includes(kw)));
  return rows.length ? '<section class="asset-list-section"><h2 class="expert-section-title">我添加的</h2>'+cardsHtml(rows,true)+'</section>' : '';
}
export function workspaceCapabilityVisible(kind,item) {
  if (inPersonalHub()) return true;
  // 全局个人安装不代表已经安装到当前工作区；个人草稿保留原开发入口。
  return kind === 'team' ? !item.preset && item.source !== 'tenant' : !!item.mine;
}
export function workspaceCatalogRows() {
  const {p,ws,editable} = capabilityContext();
  if (!p || !editable || inPersonalHub()) return null;
  const installed = new Set(capabilityList(p,ws?.id).entries.map(row => row.key));
  return capabilityCatalog(p).filter(row => row.kind === 'team' || row.data.listed !== false && !UNLISTED_EXPERT_IDS.has(row.data.id))
    .map(row => ({...row,installed:installed.has(row.key) ? row.version : ''}));
}
export function renderWorkspaceCapabilities(host) {
  if (inPersonalHub()) return false;
  const {p,ws,editable} = capabilityContext();
  if (!p) { host.innerHTML='<div class="x-empty">请先创建或加入一个空间，再添加智能体或团队。</div>'; return true; }
  if (editable) return false;
  const kind = host.id === 'expertGrid' ? 'team' : 'expert';
  const rows = capabilityList(p,ws?.id).entries.filter(row => row.kind === kind);
  host.classList.remove('asset-cloud-grid');
  host.innerHTML = cardsHtml(rows,false)+(!rows.length ? '<div class="x-empty">当前工作区目录暂无'+(kind === 'team' ? '智能体团队' : '智能体')+'，可自建或联系管理员添加。</div>' : '');
  return true;
}
export function initCapabilitySettings() {
  setWorkspaceCapabilityRenderer(renderWorkspaceCapabilities);
  setWorkspaceAssetControls(workspaceCapabilityControls,workspaceCapabilityExtras,workspaceCatalogRows);
  setWorkspaceAssetVisibility(workspaceCapabilityVisible);
  function refresh() { document.dispatchEvent(new Event('lingee:cloud-assets-changed')); }
  async function change(action,key,expected) {
    const {p,ws,editable} = capabilityContext();
    if (!editable || inPersonalHub() || p.id !== expected.space || (ws?.id || '') !== expected.workspace) return;
    const list = capabilityList(p,ws?.id);
    if (action === 'uninstall' && !await requestDeleteConfirmation('从当前工作区卸载？其他工作区、个人安装和已启动任务的版本记录均保留。',{title:'卸载',confirmLabel:'卸载'})) return;
    const latest = capabilityContext();
    if (!latest.editable || latest.p.id !== p.id || (latest.ws?.id || '') !== (ws?.id || '')) { toast('当前范围或权限已变化，请重新操作','warning'); refresh(); return; }
    const error = capabilityChange(p,ws?.id || '',action,key);
    if (error) { toast(error,'warning'); return; }
    if (action === 'install') { setAssetBrowseMode(key.startsWith('team:') ? 'team' : 'expert','mine'); refresh(); }
    toast(action === 'install' ? '已添加到当前工作区' : action === 'uninstall' ? '已从当前工作区卸载' : '已更新','success');
  }
  document.addEventListener('click',event => {
    const button = event.target.closest('[data-capability-action]'); if (!button) return;
    event.preventDefault(); event.stopPropagation();
    button.disabled=true;
    change(button.dataset.capabilityAction,button.dataset.capabilityKey,{space:button.dataset.space,workspace:button.dataset.workspace}).finally(() => { if (button.isConnected) button.disabled=false; });
  },true);
  function syncNavigation() {
    const view = document.getElementById('view-collab');
    if (view?.classList.contains('asset-hub-mode')) return;
    const {p,editable} = capabilityContext();
    if (p) capabilityMigrate(p);
    view?.querySelectorAll('#cvTabNav [data-cvview="experts"],#cvTabNav [data-cvview="teams"]').forEach(button => { button.hidden = false; });
    const readonly = !!p && !editable;
    if (view && view.classList.contains('cv-capabilities-readonly') !== readonly) view.classList.toggle('cv-capabilities-readonly',readonly);
  }
  document.addEventListener('lingee:tk-space-changed', () => { syncNavigation(); refresh(); });
  document.addEventListener('lingee:capabilities-changed', () => { syncNavigation(); refresh(); });
  document.addEventListener('lingee:mgr-projects-changed',syncNavigation);
  const view = document.getElementById('view-collab');
  if (view) new MutationObserver(syncNavigation).observe(view,{attributes:true,attributeFilter:['class'],subtree:true});
  syncNavigation(); refresh();
}
