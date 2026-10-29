/* 本地开发环境：开发在 Lingee 桌面客户端本地执行。
   - Git 账号按平台（主机）登录一次，所有空间按仓库主机自动匹配；一期只用访问令牌，不检测或配置 SSH；
   - 空间初始化到本机目录一次：默认是工作区目录下的「空间名」文件夹，可改为工作区目录内的其他文件夹；
   - 协作开发「设置」页签分「我的空间」「Git 账号」两个面板；本人手动开始任务且空间未在本机初始化时打开「准备执行环境」；
   - 本机没有 Git 时跳转「安装 Git」对话，由智能体完成安装。
   代码按界面拆在 ./local-dev/ 下，互不直接调用渲染函数：
     core.js 数据与判断 · ui.js 共用片段 · space-form.js 空间表单与初始化
     settings-page.js 设置外壳 · spaces-page.js 我的空间 · git-accounts-page.js Git 账号
     space-dialog.js 初始化 / 空间设置 · prep-dialog.js 准备执行环境 · auth-dialog.js 登录账号 · repo-new-dialog.js 新建空间
     git-install.js 对话安装 Git · nav-status.js 顶部提醒 · task-gate.js 执行前检查 · actions.js 共用按钮动作
   本文件只做转发，保持其他模块的导入路径不变。 */
export { LD_QUIET_ENV, LD_WORKSPACE_ROOT, ldAdoptLocalCred, ldAuthEmail, ldAuthUser, ldBindDir, ldCheckDir, ldCloneUrl, ldDefaultPath, ldFindLocalCred, ldGitUsername, ldInsideWorkspace, ldIsDevProject, ldLocalConfigPath, ldMarkInitialized, ldOauthSupported, ldPendingProjects, ldProjectStatus, ldPushIssueText, ldRepoInfo, ldSourceLabel, ldTokenPage } from './local-dev/core.js';
export { ldOpenAuth } from './local-dev/auth-dialog.js';
export { ldCanCreateProject, ldOpenRepoNew } from './local-dev/repo-new-dialog.js';
export { ldOpenProjectSettings } from './local-dev/actions.js';
export { ldBlockTaskForEnv, ldGateTaskStart, ldIsEnvBlocked, ldOpenSetup, ldRestoreEnvBlocked } from './local-dev/task-gate.js';
export { ldOpenSpaceDialog as ldOpenDirModal } from './local-dev/space-dialog.js';
export { ldStartGitInstall } from './local-dev/git-install.js';
export { initLocalDev } from './local-dev/index.js';
