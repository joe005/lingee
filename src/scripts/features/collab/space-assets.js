import { setNavActive, showView } from '../../core/view.js';
import { setAssetBrowseMode } from './expert-market.js';
import '../../../styles/parts/collab/space-assets.css';
/* 协作开发 · 开发智能体 / 开发智能体团队页签：从任务「去安装」定位到「更多」里的对应卡片。
   页签本身沿用「我的 / 更多」（我的 = 个人开发 + 我添加的；更多 = 可用但本机未装的），不做空间隔离：
   「更多」汇总金蝶官方未装的、全企业上架的和我能看到的各空间添加的条目，数据在 capability-settings.js。
   2026-11-18 曾改为「全部 / 已安装 / 未安装」视图，同日评估后改回，见 docs/04-experts-and-teams.md。 */

const TAB = { expert: 'experts', team: 'teams' };
const SEARCH = { expert: '#cvExpertSearch', team: '#expertSearchInput' };
const PANEL = { expert: '#cv-experts', team: '#cv-teams' };

/* 任务因本机未装团队无法开始时，提示里的「去安装」按钮（data-asset-locate="team:id"，HTML 在 expert/local-install-state.js）由这里处理 */
function locate(key) {
  const kind = String(key).split(':')[0];
  if (!TAB[kind]) return;
  showView('collab'); setNavActive('协作开发');
  document.dispatchEvent(new CustomEvent('lingee:collab-nav', { detail: { tab: TAB[kind] } }));
  setAssetBrowseMode(kind, 'more');
  /* 清掉搜索词，免得要找的卡片被筛掉；搜索框的 input 事件会触发重绘 */
  const search = document.querySelector(SEARCH[kind]);
  if (search && search.value) { search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true })); }
  document.dispatchEvent(new Event('lingee:cloud-assets-changed'));
  requestAnimationFrame(() => {
    const card = [...document.querySelectorAll(PANEL[kind] + ' [data-asset-key]')].find(el => el.dataset.assetKey === key);
    if (!card) return;
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    card.classList.add('is-located');
    setTimeout(() => card.classList.remove('is-located'), 2400);
    card.querySelector('.expert-install-plus')?.focus({ preventScroll: true });
  });
}

export function initSpaceAssets() {
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-asset-locate]');
    if (!button) return;
    event.preventDefault();
    button.closest('.toast')?.classList.remove('show');
    locate(button.dataset.assetLocate);
  });
}
