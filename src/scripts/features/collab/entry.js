import { initRecruitmentSettings } from './recruitment-settings.js';
import { initCollabView, initCollabTabs } from './view.js';
import { initCollabTasks } from './tasks.js';
import { initCollabProjects } from './projects.js';
import { initPersonPicker } from './person-picker.js';
import { initCollabConfig } from './config.js';
import { initCollabSpaceSwitch } from './space-switch.js';
import { initCollabWorkspaceSettings } from './workspace-settings.js';
import { initCollab } from './index.js';
import { initCapabilitySettings } from './capability-settings.js';
/* 协作开发：本区域的初始化入口。
   顺序 == 原 main.js 里这几行的顺序；本区域新增模块在这里接线，不用改 main.js。 */

export function initCollabArea() {
  initCollabView();               /* 5714 */
  initCollabTasks();              /* 5767 */
  initCollabTabs();               /* 6189 */
  initCollabProjects();           /* 6287 */
  initPersonPicker();
  initCollabConfig();             /* 6370 */
  initCollabWorkspaceSettings();  /* 设置 › 工作区：空间之下的工作区管理 */
  initCollabSpaceSwitch();        /* 顶部空间 / 工作区切换，与任务筛选同一份条件 */
  initCapabilitySettings();
  initRecruitmentSettings();
  initCollab();                   /* 6445 */
}
