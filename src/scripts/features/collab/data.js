/* 协作开发：项目 / 任务 / 评审 / 人员数据与卡片渲染
   2026-10-13 按职责拆到 ./data/ 目录（逻辑未改），本文件只做转发，调用方的 import 不用改：
   - data/workspace-projects.js：项目与工作区种子、当前项目 / 工作区、按 id 查询
   - data/people.js：人员基础资料（全站主数据）、工作区成员与角色、当前登录人
   - data/project-store.js：项目持久化、删除、演示数据补齐与清理
   - data/legacy-demo.js：旧版协作开发演示的任务 / 评审数据
   - data/cards.js：任务 / 评审卡片渲染与注入接口
   - data/seed-details.js：任务产物、活动、评审等演示细节与种子项目补齐
   新增对外函数：在对应文件导出后，再在本文件加一行转发。 */

/* 先按拆分前的顺序引入原依赖，保持全站模块求值顺序不变 */
import '../expert/data.js';

export { CV_PROJECTS, CV_WORKSPACES, cvConfigOverride, cvInProject, cvPersistWorkspaces, cvProject, cvProjectById, cvProjectInWorkspace, cvProjectName, cvRestoreWorkspaces, cvStampTaskTeam, cvWorkspace, cvWorkspaceById, cvWorkspaceName, set_cvProject, set_cvWorkspace } from './data/workspace-projects.js';
export { CV_REVIEWS, CV_REVIEW_ARTIFACTS, CV_REVIEW_COMMENTS, CV_TASKS } from './data/legacy-demo.js';
export { CV_MEMBERS, cvAddPersonToWorkspace, cvCanAccessWorkspace, cvCreateWorkspace, cvCurrentUserName, cvEnsureSeedPersons, cvEnsureTeamPersons, cvGenProjectCode, cvIsMe, cvPeopleInProject, cvPeopleInWorkspace, cvPersistPersons, cvPersonById, cvPersonName, cvProjectPersons, cvRestorePersons, cvWorkspaceRole } from './data/people.js';
export { cvDeleteProjectRecord, cvDeleteWorkspaceData, cvEnsureCurrentUserProjectDemoData, cvEnsureProjectRoleDemoData, cvEnsureTeamProjectMembers, cvEnsureWorkspaceDemoProjects, cvPersistProjects, cvPruneDeletedWorkspaceData, cvRemoveLingeePrototypeTasks, cvRemoveZhangAutoProjectMember, cvRestoreProjects } from './data/project-store.js';
export { CV_THIRD_PARTY_MEMBERS, CV_WORKFLOW, CV_WORKFLOW_ROLES, cvInjectCardActions, cvRenderReviewStats, cvRenderReviews, cvRenderTaskStats, cvRenderTasks, setConversationOpener, setTaskRenderers } from './data/cards.js';
export { CV_ARTIFACTS, cvEnsureCosmicAppDevData, cvEnsureLingeePrototypeData, cvEnsureSeedProjects, cvEnsureSeedWorkspaces, cvSeedTaskDetails } from './data/seed-details.js';
