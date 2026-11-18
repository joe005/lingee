import { isLocalAssetInstalled } from '../expert/local-install-state.js';
import { setWorkspaceCapabilityRenderer, setWorkspaceAssetControls, setWorkspaceMoreInstall, setWorkspaceAssetVisibility, assetTagsHtml } from './expert-market.js';
import '../../../styles/parts/collab/capability-settings.css';
import { getSettingsScope, visibleSpaceItems } from './space-switch.js';
import { tkScopeProjects, tkGetTasks, tkCurrentStageHandlerId, tkCurrentUserId, tkCanViewTask, tkProjectById } from '../tasks-v2/data.js';
import { wsById } from '../../core/workspace-tree.js';
import { basicEditable } from './basic-settings-data.js';
import { capabilityList, capabilityMigrate, capabilityOptions, capabilityTaskEntry } from './capability-config.js';
import { assetSourceBadge, layerOf, layerVisible } from '../expert/layers.js';
import { xav, xesc } from '../expert/data.js';

export function capabilityContext(scope = getSettingsScope()) {
  /* 范围含 Build 独立工作区容器，否则独立工作区的智能体设置和「更多」里的工作区资产都取不到；
     默认取设置页的空间，开发智能体 / 团队页签传入自己筛选的空间 */
  const p = tkScopeProjects().find(p => p.id === scope.project);
  const ws = p && scope.ws ? wsById(p,scope.ws) : null;
  return {p,ws,editable:!!p && (!scope.ws || !!ws) && basicEditable(p,ws)};
}
/* 来源只标「空间」，不重复空间名称。 */
function originHtml() { return '<span class="cv-workspace-origin">空间</span>'; }
/* 金蝶官方预置出厂的资产随产品自带，不属于工作区分配，不显示「工作区」标记 */
function originFor(kind,data) { return layerOf(kind,data || {}) === 'builtin' ? '' : originHtml(); }
/* 与「更多」里其他未安装卡片统一为右上角「+」图标按钮，按空间固定版本安装到当前用户本机 */
function installButton(row,p,wsId) {
  const name = xesc(row.data?.name || '');
  return '<button type="button" class="expert-install-plus" data-workspace-install="'+xesc(row.key)+'" data-space="'+xesc(p.id)+'" data-workspace="'+xesc(wsId || '')+'" aria-label="安装'+name+'" title="安装到本机"><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg></button>';
}
const TASK_NEED = '<span class="asset-task-need" title="你负责的待开始任务要用它，安装后才能执行">任务需要</span>';
/* 开发智能体 / 团队页签不做空间隔离（2026-11-18）：汇总我能看到的各空间在设置里添加且可用的条目。
   同一条目在不同空间固定的版本可能不同，这里按空间逐条保留，判断安装时每个空间的版本分别看。 */
function spaceRows(kind) {
  const rows = [];
  visibleSpaceItems().forEach(([p,wsId]) => capabilityOptions(p,wsId || '').forEach(row => {
    if (!row.personal && (!kind || row.kind === kind)) rows.push({row,p,wsId:wsId || ''});
  }));
  return rows;
}
/* 我负责的待开始任务要用、本机还没装对应版本的智能体 / 团队：在「更多」里标「任务需要」并排在前面，按任务所属空间的版本安装 */
export function taskNeededAssets() {
  const me = tkCurrentUserId(), need = new Map();
  if (!me) return need;
  tkGetTasks().forEach(task => {
    if (!['planned','backlog'].includes(task.status) || tkCurrentStageHandlerId(task) !== me || !tkCanViewTask(task)) return;
    if (!task.teamId && !task.expertId) return;
    const p = tkProjectById(task.project), row = p && capabilityTaskEntry(task,p);
    if (!row || row.personal || isLocalAssetInstalled(row) || need.has(row.key)) return;
    need.set(row.key,{row,p,wsId:task.workspaceId || ''});
  });
  return need;
}
/* 某条目还缺哪个空间的版本：任务需要的优先，其次是第一个未装的空间版本；都装了返回 null */
function pendingFor(key) {
  return taskNeededAssets().get(key) || spaceRows(key.split(':')[0]).find(r => r.row.key === key && !isLocalAssetInstalled(r.row)) || null;
}
/* 「我添加的」只呈现已在本机安装的资产及其空间来源；添加、移除归属设置页面，本机安装在「更多」。 */
export function workspaceCapabilityControls(kind,item) {
  const key = kind+':'+item.id;
  return spaceRows(kind).some(r => r.row.key === key && isLocalAssetInstalled(r.row)) ? originFor(kind,item) : '';
}
/* 空间已添加、本机尚未安装空间版本的资产：在「更多」里带空间标记，按空间固定版本安装。 */
export function workspaceInstallOffer(kind,item) {
  const pending = pendingFor(kind+':'+item.id);
  if (!pending) return null;
  const need = taskNeededAssets().has(pending.row.key);
  return {tag:originFor(kind,item)+(need ? TASK_NEED : ''),button:installButton(pending.row,pending.p,pending.wsId),version:pending.row.version,need};
}
/* 空间已添加的资产，不依赖个人云端目录：设置里添加的内容在「更多」里同样可见，同一条目只出一张卡。
   还缺某个空间版本的算未安装（带安装按钮），各空间版本都装了的算已安装 */
export function workspaceInstallCandidates(kind) {
  const seen = new Map();
  spaceRows(kind).forEach(r => { if (!seen.has(r.row.key)) seen.set(r.row.key,r); });
  return [...seen.values()].map(({row}) => {
    const pending = pendingFor(row.key), use = pending?.row || row;
    return {key:row.key,kind:row.kind,data:use.data,version:use.version,installed:pending ? '' : 'local',tag:originFor(row.kind,row.data)};
  });
}
export function workspaceCapabilityVisible() { return true; }
export function workspaceCatalogRows() { return null; }
export function renderWorkspaceCapabilities() { return false; }
export function workspaceCapabilityExtras(kind,items,keyword,layer='all') {
  const known = new Set(items.filter(item => layerVisible(kind,item)).map(item => kind+':'+item.id));
  const kw = keyword.trim().toLocaleLowerCase();
  const seen = new Set(), rows = [];
  spaceRows(kind).forEach(({row}) => {
    if (seen.has(row.key) || known.has(row.key) || !isLocalAssetInstalled(row)) return;
    if (layer !== 'all' && layer !== (row.data.tenantId ? 'shared' : 'builtin')) return;
    if (kw && ![row.data.name,row.data.desc,...(row.data.tags || row.data.domains || [])].join(' ').toLocaleLowerCase().includes(kw)) return;
    seen.add(row.key); rows.push(row);
  });
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
    /* 按按钮所属空间安装：「全部空间」分组里的卡片不一定属于顶部当前空间 */
    const p=tkScopeProjects().find(x=>x.id===button.dataset.space);
    const wsId=button.dataset.workspace || '';
    if(!p || wsId && !wsById(p,wsId))return;
    const row=capabilityList(p,wsId).entries.find(row=>row.key===button.dataset.workspaceInstall);
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
  document.addEventListener('lingee:settings-space-changed',refresh);
  document.addEventListener('lingee:capabilities-changed',refresh);
  refresh();
}
