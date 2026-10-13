import { initMyWork } from './my-work.js';
import { initReviewCenter, renderReviewCenter } from './review-center.js';
import { initWorkItemDetail, renderWorkItemDetail } from './work-item-detail.js';
import { initIssueNavigation } from '../tasks-v2/navigation.js';
/* 协作开发 · 工作台骨架（我的工作 / 工作详情 / 审核面板）的初始化入口。
   原先在 tasks-v2/index.js 的 initTasksV2() 末尾初始化，现由 main.js 紧接着 initTasksV2() 调用，执行顺序不变；
   跨页跳转处理器各自登记：任务详情由任务页登记，工作详情与审核面板在这里登记。 */

export function initCollabWorkbench() {
  initMyWork();
  initWorkItemDetail();
  initReviewCenter();
  initIssueNavigation({ workItem: renderWorkItemDetail, review: renderReviewCenter });
}
