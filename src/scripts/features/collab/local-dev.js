/* 本机环境：仓库配置由 Build 逐字段继承；本机绑定按规范化仓库 + 当前用户 + 当前浏览器设备隔离。
   同仓库共用克隆，任务保存配置快照并使用隔离任务目录；core.js 存数据，其他模块按界面负责渲染与操作。
   本文件保持对外转发入口。 */
export { LD_QUIET_ENV, LD_WORKSPACE_ROOT, ldTaskEnvironmentId, ldAdoptLocalCred, ldAuthEmail, ldAuthUser, ldBindDir, ldCheckDir, ldCloneUrl, ldDefaultPath, ldFindLocalCred, ldGitUsername, ldInsideWorkspace, ldIsDevProject, ldLocalConfigPath, ldMarkInitialized, ldOauthSupported, ldPendingProjects, ldProjectStatus, ldPushIssueText, ldRepoInfo, ldSourceLabel, ldTokenPage } from './local-dev/core.js';
export { ldOpenAuth } from './local-dev/auth-dialog.js';
export { ldCanCreateProject, ldOpenRepoNew } from './local-dev/repo-new-dialog.js';
export { ldOpenProjectSettings } from './local-dev/actions.js';
export { ldBlockTaskForEnv, ldGateTaskStart, ldIsEnvBlocked, ldOpenSetup, ldRestoreEnvBlocked } from './local-dev/task-gate.js';
export { ldOpenSpaceDialog as ldOpenDirModal } from './local-dev/space-dialog.js';
export { ldStartGitInstall } from './local-dev/git-install.js';
export { initLocalDev } from './local-dev/index.js';
export { ldSetNavScope } from './local-dev/nav-status.js';
