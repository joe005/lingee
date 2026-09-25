import { initIssueNavigation } from './navigation.js';
import { initExecutionPlan } from './execution-plan.js';
import { initMyWork } from '../collab/my-work.js';
import { initWorkItemDetail, renderWorkItemDetail } from '../collab/work-item-detail.js';
import { initReviewCenter, renderReviewCenter } from '../collab/review-center.js';
import { openIssueDetail } from './issue-detail.js';
/* T00 结构拆分：index。保留原交互；事件在 init* 中按原顺序注册。 */
import { restoreTaskLabelCatalog, initTaskDetailPreferences, initTaskDetailWidth, initTaskDetailEvents, initTaskDetailSubtaskEvents, initTaskDetailGlobalEvents } from './issue-detail.js';
import { tkSyncPeople } from './data.js';
import { cacheEls } from './ui-state.js';
import { restoreViewState, initColumnResize, initTaskListDisplayEvents, initTaskListFilterEvents, initTaskListRowEvents, render, tkSetProjectListMode } from './list.js';
import { fillSelects, initTaskCreateEvents } from './create.js';

function initTasksV2() {
  restoreTaskLabelCatalog();
  tkSyncPeople();
  cacheEls();
  initTaskDetailPreferences();
  restoreViewState();
  initColumnResize();
  initTaskDetailWidth();
  fillSelects();
  initTaskListDisplayEvents();
  initTaskCreateEvents();
  initTaskDetailEvents();
  initTaskListFilterEvents();
  initTaskDetailSubtaskEvents();
  initTaskListRowEvents();
  initTaskDetailGlobalEvents();
  render();
  // 隐藏骨架在旧初始化结束后接线，不改变现有事件顺序和首屏。
  initExecutionPlan();
  initMyWork();
  initWorkItemDetail();
  initReviewCenter();
  initIssueNavigation({ issue: openIssueDetail, workItem: renderWorkItemDetail, review: renderReviewCenter });
}

export { initTasksV2, tkSetProjectListMode };
