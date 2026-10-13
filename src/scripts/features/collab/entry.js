import { initCollabView, initCollabTabs } from './view.js';
import { initCollabTasks } from './tasks.js';
import { initCollabProjects } from './projects.js';
import { initPersonPicker } from './person-picker.js';
import { initCollabConfig } from './config.js';
import { initCollab } from './index.js';
/* 协作开发：本区域的初始化入口。
   顺序 == 原 main.js 里这几行的顺序；本区域新增模块在这里接线，不用改 main.js。 */

export function initCollabArea() {
  initCollabView();               /* 5714 */
  initCollabTasks();              /* 5767 */
  initCollabTabs();               /* 6189 */
  initCollabProjects();           /* 6287 */
  initPersonPicker();
  initCollabConfig();             /* 6370 */
  initCollab();                   /* 6445 */
}
