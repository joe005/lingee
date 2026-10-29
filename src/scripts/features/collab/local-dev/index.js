import { $ } from '../../../core/dom.js';
import { initLocalDevActions } from './actions.js';
import { ldRefresh } from './core.js';
import { initAuthDialog } from './auth-dialog.js';
import { initGitAccountsPage } from './git-accounts-page.js';
import { initGitInstall } from './git-install.js';
import { initJobsBubble } from './jobs-bubble.js';
import { initNavStatus } from './nav-status.js';
import { initPrepDialog } from './prep-dialog.js';
import { initRepoNewDialog } from './repo-new-dialog.js';
import { initSettingsPage } from './settings-page.js';
import { initSpaceDialog } from './space-dialog.js';
import { initSpacesPage } from './spaces-page.js';

/* 本地开发 · 初始化入口：各界面模块各自绑定事件，彼此只通过导出的打开函数和 lingee:local-dev-changed 事件协作。
   页面面板先于设置外壳初始化，保证外壳广播 lingee:ld-settings-shown 时面板已在监听。 */
export function initLocalDev() {
  if (!$('#ldSpaceOverlay')) return;
  initAuthDialog();
  initSpaceDialog();
  initPrepDialog();
  initRepoNewDialog();
  initGitInstall();
  initNavStatus();
  initJobsBubble();
  initSpacesPage();
  initGitAccountsPage();
  initSettingsPage();
  initLocalDevActions();
  /* 空间变化（Manage 新建空间、改成员、改仓库等）后各界面按最新数据重算 */
  document.addEventListener('lingee:mgr-projects-changed', ldRefresh);
}
