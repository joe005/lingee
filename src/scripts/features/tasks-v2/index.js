import { initMyWork } from '../collab/my-work.js';
import { initReviewCenter, renderReviewCenter } from '../collab/review-center.js';
import { initWorkItemDetail, renderWorkItemDetail } from '../collab/work-item-detail.js';
import { initTaskConfirm } from './confirm.js';
import { tkEnsureWorkspaceDemoTasks, tkPruneOrphanTasks, tkSyncPeople } from './data.js';
import { initExecutionPlan } from './execution-plan.js';
import { initTkFormExpertPicker } from './expert-picker.js';
import { openIssueDetail } from './issue-detail.js';
import { initIssueNavigation } from './navigation.js';
import { initNewIssueUI } from './new-issue-ui.js';
import { taskViewState } from './ui-state.js';
import { initColumnResize } from './page/col-widths.js';
import { applyDrawerWidth, initListReviewPreviewEvents, restoreTaskLabelCatalog } from './page/detail-panel.js';
import { bindEvents, openCollabTaskList } from './page/events.js';
import { listStatusPool } from './page/filters.js';
import { fillSelects } from './page/form-modal.js';
import { initImportEvents } from './page/import-excel.js';
import { render, updateCollabReviewBadge } from './page/layout.js';
import { pageState } from './page/page-state.js';
import { DRAWER_WIDTH_STORAGE_KEY, TASK_DETAIL_VERSION_STORAGE_KEY, TASK_START_LEGACY_KEY, cacheEls, els, renderTaskStartAction, restoreViewState, state } from './page/state.js';
import { openDrawer } from './page/subtasks.js';
/* 任务页入口：只负责初始化。页面代码按区域拆在 ./page/ 下（2026-10-10 从本文件拆出，逻辑未改）：
   - page/artifacts.js：任务产物的文件类型图标、文件名与格式标签
   - page/state.js：任务页状态、常量与元素缓存
   - page/utils.js：工具函数：视图状态读写、开始按钮、人员与日期等
   - page/filters.js：筛选与排序、父子树、分组
   - page/render.js：渲染：视图标签栏、看板、列表、筛选 Chip
   - page/layout.js：空状态、布局切换、批量栏、全选、项目内列表模式、显示设置选项
   - page/form-modal.js：新建 / 编辑任务弹窗与表单填充
   - page/import-excel.js：Excel 模板下载与导入
   - page/mention.js：评论 @ 提及
   - page/detail-panel.js：任务详情面板
   - page/subtasks.js：详情面板的子任务区与活动记录
   - page/menus.js：筛选菜单、视图管理、弹出菜单、拖拽
   - page/col-widths.js：列表列宽拖拽
   - page/events-toolbar.js：事件绑定 · 搜索、布局切换、显示设置
   - page/events-create.js：事件绑定 · 新建任务（列头 + 弹窗）
   - page/events-detail.js：事件绑定 · 详情面板、评论 @ 提及、属性区
   - page/events-views.js：事件绑定 · 筛选面板、排序、全选、视图标签与视图管理、批量操作
   - page/events-board.js：事件绑定 · 子任务、看板 / 列表点击与拖拽、列折叠、浮层关闭
   - page/events.js：事件绑定入口
   对外接口保持从本文件导出，调用方不用改。 */
export { tkOpenProjectTaskCreate, tkSetProjectListMode } from './page/layout.js';
export { openTaskDetail, openTaskDetailFromSession } from './page/subtasks.js';
export { startTaskExecutionFromSession } from './page/utils.js';
/* ---------- 初始化 ---------- */
var taskDataRenderQueued = false;
function syncTaskDataView() {
  if (taskDataRenderQueued) return;
  taskDataRenderQueued = true;
  queueMicrotask(function () {
    taskDataRenderQueued = false;
    render();
  });
}

export function initTasksV2() {
  initTaskConfirm();
  restoreTaskLabelCatalog();
  tkPruneOrphanTasks();
  tkSyncPeople();
  cacheEls();
  initListReviewPreviewEvents();
  /* 任务详情抽屉移至 body 顶层，使其在任意视图上都能叠加显示（原在 #view-tasks 内，父级 hidden 时 fixed 也不可见） */
  if (els.tkDrawer && els.tkDrawer.parentNode !== document.body) document.body.appendChild(els.tkDrawer);
  if (els.tkDrawerClickaway && els.tkDrawerClickaway.parentNode !== document.body) document.body.appendChild(els.tkDrawerClickaway);
  try { pageState.taskStartLegacy = localStorage.getItem(TASK_START_LEGACY_KEY) === '1'; } catch (e) { pageState.taskStartLegacy = false; }
  try { pageState.taskDetailVersion = localStorage.getItem(TASK_DETAIL_VERSION_STORAGE_KEY) === 'v1' ? 'v1' : 'latest'; } catch (e) { pageState.taskDetailVersion = 'latest'; }
  renderTaskStartAction();
  restoreViewState();
  initColumnResize();
  try {
    var storedWidth = Number(localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY));
    if (Number.isFinite(storedWidth) && storedWidth >= 480) pageState.drawerPreferredWidth = storedWidth;
  } catch (e) { /* 本地存储不可用时使用默认宽度 */ }
  applyDrawerWidth();
  fillSelects();
  initTkFormExpertPicker();
  initImportEvents();
  bindEvents();
  document.addEventListener('lingee:collab-menu-open', openCollabTaskList);
  render();
  document.addEventListener('lingee:auth-changed', render);
  updateCollabReviewBadge();
  /* 任务增删改和状态流转后统一重绘看板与徽标，避免看板保留旧数量。 */
  document.addEventListener('lingee:tasks-changed', syncTaskDataView);
  document.addEventListener('lingee:task-updated', syncTaskDataView);
  document.addEventListener('lingee:auth-changed', updateCollabReviewBadge);
  document.addEventListener('lingee:task-stage-completed',function (event) {
    render();
    if (state.drawerTaskId === event.detail.taskId) openDrawer(event.detail.taskId);
  });
  document.addEventListener('cv-workspace-change',()=>{
    tkPruneOrphanTasks();
    tkEnsureWorkspaceDemoTasks();
    Object.assign(taskViewState,{activeViewId:'all',scope:'all',filters:[],search:''});
    fillSelects();render();
  });
  // 隐藏骨架在旧初始化结束后接线，不改变现有事件顺序和首屏。
  initExecutionPlan();
  initNewIssueUI(render, function (taskId) { if (state.drawerTaskId === taskId) openDrawer(taskId); });
  initMyWork();
  initWorkItemDetail();
  initReviewCenter();
  initIssueNavigation({ issue: openIssueDetail, workItem: renderWorkItemDetail, review: renderReviewCenter });
}
/* propFieldKeys 见 page/detail-panel.js */
