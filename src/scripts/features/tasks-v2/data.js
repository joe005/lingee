/* 任务管理 v2 —— 模拟数据与状态
   纯前端原型，所有数据本地维护。
   2026-10-13 按职责拆到 ./data/ 目录（逻辑未改），本文件只做转发，调用方的 import 不用改：
   - data/constants.js：状态、优先级、人员色板、视图、筛选字段与运算符等常量
   - data/external-projects.js：其他板块（管理）登记的项目——叶子模块，供求值期迁移使用
   - data/people.js：任务人员同步、项目与人员查询、当前用户与阶段处理人
   - data/permissions.js：「我的任务」归属、开始 / 查看权限、项目负责人
   - data/artifacts.js：任务详情里的阶段产物
   - data/seed-tasks.js：演示任务种子（含苍穹、问卷等演示场景）
   - data/lookups.js：状态 / 优先级 / 人员 / 项目名称查询
   - data/store.js：任务与视图的存储、缓存迁移、增删改
   注意：seed-tasks.js 与 store.js 有模块求值期执行的代码（拼装种子、迁移缓存），顺序由本文件的引入顺序保证。
   新增对外函数：在对应文件导出后，再在本文件加一行转发。 */

/* 先按拆分前的顺序引入原依赖，保持全站模块求值顺序不变 */
import './delivery-plan-migration.js';
import '../expert/delivery-stages.js';
import './equipment-demo.js';
import './ticket-demo.js';
import '../collab/data.js';
import '../login.js';
import './review-reports.js';
import './blocked-runs.js';
import './completed-runs.js';
import './artifact-docs.js';
import '../../../artifacts/survey-app.html?raw';
import '../../../artifacts/helpdesk-app.html?raw';
import './site-preview.js';

export { TK_AGENTS, TK_FILTER_FIELDS, TK_LABELS, TK_OPERATORS, TK_PEOPLE, TK_PRIORITIES, TK_PROJECTS, TK_STATUSES, TK_VIEWS } from './data/constants.js';
export { tkSetExternalProjects } from './data/external-projects.js';
export { tkCurrentStageHandlerId, tkCurrentUserId, tkPeopleInProject, tkProjectById, tkSyncPeople } from './data/people.js';
export { tkCanStartTask, tkCanViewTask, tkInMyTaskList, tkIsHandledByMe, tkIsMyCurrentStage, tkIsMyStageDone, tkIsProjectOwner, tkParticipatesCurrentUser, tkProjectsForCurrentUser, tkWasTaskHandler } from './data/permissions.js';
export { tkGetTaskArtifacts } from './data/artifacts.js';
export { TK_TASKS } from './data/seed-tasks.js';
export { tkGetPerson, tkGetPriorityName, tkGetPriorityObj, tkGetProjectName, tkGetStatusName, tkGetStatusObj } from './data/lookups.js';
export { TK_DELETE_BLOCKED_REASON, tkAddTask, tkAddView, tkCanDeleteTask, tkDeleteTask, tkDeleteView, tkEnsureCompletedDemoTask, tkEnsureWorkspaceDemoTasks, tkGetTasks, tkGetViews, tkPruneOrphanTasks, tkRenameView, tkSetTasks, tkUpdateTask } from './data/store.js';
