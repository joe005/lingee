import { capabilityCatalog, capabilityOptions } from './capability-config.js';
import { UNLISTED_EXPERT_IDS } from '../expert/builtin-catalog.js';
import { setWorkspaceCapabilityRenderer, assetTagsHtml } from './expert-market.js';
import { visibleSpaceItems } from './space-switch.js';
import { isLocalAssetInstalled } from '../expert/local-install-state.js';
import { assetSourceBadge } from '../expert/layers.js';
import { EX, xav, xesc } from '../expert/data.js';
import { TEAMS } from '../expert/store.js';
import '../../../styles/parts/collab/space-assets.css';
/* 协作开发 · 开发智能体 / 开发智能体团队页签：按空间隔离的使用视图。
   列表就是当前空间「设置 › 智能体」里添加的清单（与新建任务可选范围一致），成员在这里查看、安装到本机；
   添加、移除只在设置里由空间创建者和管理员维护。页签不做空间隔离、也不提供空间筛选（2026-11-18），
   列出金蝶官方的公共条目和我能看到的各空间添加的条目（去重）。个人开发、我的 / 更多仍在侧栏「技能·智能体·连接器」
   （同一面板挂在 asset-hub-mode 下时走原有渲染，这里不接管）。 */

const LABEL = { expert: '开发智能体', team: '开发智能体团队' };
const SEARCH = { expert: '#cvExpertSearch', team: '#expertSearchInput' };
const filters = { expert: 'all', team: 'all' };
const PLUS = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>';

function kindOf(host) { return host.closest('#cv-experts') ? 'expert' : host.closest('#cv-teams') ? 'team' : ''; }

function filterBar(panel, kind) {
  let bar = panel.querySelector('[data-space-asset-filter]');
  if (bar) return bar;
  bar = document.createElement('div');
  bar.className = 'asset-primary-tabs cv-space-asset-filter';
  bar.dataset.spaceAssetFilter = kind;
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', LABEL[kind] + '安装状态');
  const head = panel.querySelector('.expert-assets-toolbar');
  head?.insertBefore(bar, head.querySelector('.cv-head-right'));
  bar.addEventListener('click', event => {
    const button = event.target.closest('[data-space-asset-state]');
    if (!button) return;
    filters[kind] = button.dataset.spaceAssetState;
    document.dispatchEvent(new Event('lingee:cloud-assets-changed'));
  });
  return bar;
}

const rerender = () => document.dispatchEvent(new Event('lingee:cloud-assets-changed'));
const listOf = (kind, sp, wsId) => capabilityOptions(sp, wsId || '').filter(row => row.kind === kind && !row.personal);
/* 金蝶官方的公共智能体 / 团队：取自云端上架目录里不属于任何租户的条目，所有空间都可见，不需要在设置里添加；
   安装状态按本机安装记录，未安装的走个人安装入口（data-market-install） */
function officialRows(kind) {
  const sp = visibleSpaceItems()[0]?.[0];
  if (!sp) return [];
  return capabilityCatalog(sp).filter(row => row.kind === kind && !row.data.tenantId
    && (kind === 'team' || row.data.listed !== false && !UNLISTED_EXPERT_IDS.has(row.data.id)))
    .map(row => ({ ...row, official: true }));
}
const isInstalled = row => row.official ? !!row.installed : isLocalAssetInstalled(row);

function card(row) {
  const team = row.kind === 'team', data = row.data || {};
  const installed = isInstalled(row);
  const faces = (row.experts || []).length ? row.experts.map(e => e.data.k) : (data.members || []).map(id => EX[id]?.k);
  const face = team ? '<span class="x-faces">' + faces.slice(0, 4).map(k => '<img src="' + xav(k) + '" alt="">').join('') + '</span>' : '<img class="x-av" src="' + xav(data.k) + '" alt="">';
  /* 本机已有定义的资产可点开详情，与原卡片同一入口 */
  const open = team ? (TEAMS.some(t => t.id === data.id) ? ' data-team="' + xesc(data.id) + '"' : '') : (EX[data.id] ? ' data-cv-expert="' + xesc(data.id) + '"' : '');
  /* 空间添加的条目按所属空间的固定版本安装 */
  const install = installed ? '' : row.official
    ? '<button type="button" class="expert-install-plus" data-market-install="' + xesc(row.key) + '" aria-label="安装' + xesc(data.name) + '" title="安装到本机">' + PLUS + '</button>'
    : !row.space ? '' : '<button type="button" class="expert-install-plus" data-workspace-install="' + xesc(row.key) + '" data-space="' + xesc(row.space.p.id) + '" data-workspace="' + xesc(row.space.wsId) + '" aria-label="安装' + xesc(data.name) + '" title="安装到本机">' + PLUS + '</button>';
  const state = installed ? '<span class="cv-space-asset-state is-installed">已安装</span>' : '<span class="cv-space-asset-state">未安装</span>';
  const summary = team ? (data.members || []).length + ' 个开发智能体' : (data.skills || []).length + ' 个技能';
  return '<article class="app-card x-card cv-space-asset-card' + (installed ? '' : ' expert-market-uninstalled') + '"' + open + '>' + install
    + '<div class="card-top">' + face + '<div class="card-titles"><div class="card-title-row"><span class="card-title">' + xesc(data.name) + '</span></div>'
    + '<div class="x-sub asset-card-summary">' + assetSourceBadge(row.kind, data) + (row.version ? '<span class="platform-client-badge">V' + xesc(row.version) + '</span>' : '') + state + '<span>' + summary + '</span></div></div></div>'
    + '<div class="card-desc">' + xesc(data.desc || '暂无描述') + '</div>' + assetTagsHtml(data.tags || data.domains || []) + '</article>';
}

function emptyHtml(kind, filtered) {
  return '<div class="x-empty">' + (filtered ? '没有符合条件的' : '暂无可用的') + LABEL[kind] + '</div>';
}

function renderSpaceAssets(host) {
  const view = host.closest('#view-collab'), panel = host.closest('.cv-panel'), kind = kindOf(host);
  if (!view || !panel || !kind) return false;
  if (view.classList.contains('asset-hub-mode')) { delete panel.dataset.spaceAssets; return false; }
  panel.dataset.spaceAssets = 'true';
  const bar = filterBar(panel, kind);
  /* 不做隔离：金蝶官方的公共条目 + 我能看到的各空间添加的条目，同一条目只显示一次 */
  const seen = new Set(), all = [];
  const push = row => { if (!seen.has(row.key)) { seen.add(row.key); all.push(row); } };
  officialRows(kind).forEach(push);
  visibleSpaceItems().forEach(([sp, wsId]) => listOf(kind, sp, wsId).forEach(row => push({ ...row, space: { p: sp, wsId } })));
  const installedCount = all.filter(isInstalled).length;
  bar.innerHTML = [['all', '全部', all.length], ['installed', '已安装', installedCount], ['missing', '未安装', all.length - installedCount]]
    .map(([key, text, n]) => '<button type="button" class="list-page-tab' + (filters[kind] === key ? ' active' : '') + '" data-space-asset-state="' + key + '" aria-pressed="' + (filters[kind] === key) + '">' + text + ' ' + n + '</button>').join('');
  const kw = (document.querySelector(SEARCH[kind])?.value || '').trim().toLocaleLowerCase();
  const shown = all.filter(row => (filters[kind] === 'all' || (filters[kind] === 'installed') === isInstalled(row))
    && (!kw || [row.data.name, row.data.desc, ...(row.data.tags || row.data.domains || [])].join(' ').toLocaleLowerCase().includes(kw)));
  const body = shown.length ? shown.map(card).join('') : emptyHtml(kind, all.length > 0);
  /* 团队页签的 #expertGrid 在非云端模式下是 display:block，卡片要再包一层网格，与智能体页签同样三列 */
  host.innerHTML = '<div class="apps-grid">' + body + '</div>';
  return true;
}

export function initSpaceAssets() {
  setWorkspaceCapabilityRenderer(renderSpaceAssets);
  /* 安装完成、设置里增删后的重绘由 capability-settings 广播的 lingee:cloud-assets-changed 触发 */
  document.addEventListener('lingee:mgr-projects-changed', rerender);
}
