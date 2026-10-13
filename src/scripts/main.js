import { initChatStageLayout } from './features/chat-stage-layout.js';
import { initPageSelectDropdowns } from './core/select-dropdown.js';
import billTemplate from '../artifacts/purchase-order.html?raw';
import tokensCss from '../styles/tokens.css?raw';

import { initLogin } from './features/login.js';
import { initScrollbar, initUserMenu, initSidebarIcons, initSegmentedTabs, initProjectActions } from './features/sidebar.js';
import { initToast } from './core/toast.js';
import { initChangelog } from './features/changelog.js';
import { initHoverDropdowns, initFormDropdowns } from './features/dropdown.js';
import { initAttachApp, initAttachModal } from './features/attach-app.js';
import { initViewSwitch, initSidebarNav, initHomeCards } from './core/view.js';
import { initPreview, initHistoryPanel } from './features/chat.js';
import { initEnvArea } from './features/env.js';
import { initApps, initNewAppModal, initAppsNewDropdown } from './features/apps.js';
import { initAgentSubmit } from './features/agent-submit.js';
import { initAgentConfig } from './features/agent-config.js';
import { initWorkChat } from './features/work/chat.js';
import { initComposer, initPlusMenu } from './features/composer.js';
import { initPromptEnhance } from './features/prompt-enhance.js';
import { initTestParam } from './boot/test-param.js';
import { initTooltip } from './features/tooltip.js';
import { initShortcuts } from './features/shortcuts.js';
import { initDesignArea } from './features/design/entry.js';
import { initRoute } from './boot/route.js';
import { initExpertArea } from './features/expert/entry.js';
import { initCollabArea } from './features/collab/entry.js';
import { initTasksV2 } from './features/tasks-v2/index.js';
import { initCollabWorkbench } from './features/collab/workbench.js';
import { initInbox } from './features/inbox/index.js';
import { _authedUser } from './features/login.js';
import { withBase } from './core/base-path.js';
import { initAnalytics } from './features/analytics.js';
import { initPlatformAdmin } from './features/expert/platform-admin.js';
import { initManager } from './features/manager/index.js';
import { initManagerData } from './features/manager/data.js';
import { initWork } from './features/work/index.js';
import { initAgentDemo } from './features/agent-demo.js';
import { initPages } from './pages/index.js';

/* 产物预览与应用共用同一份设计令牌 */
const billTemplateWithTokens = billTemplate.replace(
  '/* 令牌由 tokens.css 注入 */',
  tokensCss.replace(/\/\*[\s\S]*?\*\//g, '').trim()
);

/* 各模块只声明，不自己接线。
   下面的调用顺序 == 拆分前 main.js 里这些代码出现的先后顺序，
   注释里的行号是拆分前的位置，调整顺序前请先确认没有依赖。 */
initLogin();                      /*   15  features/login.js */
initScrollbar();                  /*  142  features/sidebar.js */
initToast();                      /*  177  core/toast.js */
initChangelog();                  /*  208  features/changelog.js */
initHoverDropdowns();             /*  380  features/dropdown.js */
initAttachApp();                  /*  509  features/attach-app.js */
initViewSwitch();                 /*  776  core/view.js */
initPreview();                    /*  827  features/chat.js */
initUserMenu();                   /*  905  features/sidebar.js */
initFormDropdowns();              /*  955  features/dropdown.js */
initEnvArea();                    /*  971–1614  features/env.js：配置 / 授权 / 断开 */
initSidebarIcons();               /* 2061  features/sidebar.js */
initSidebarNav();                 /* 2180  core/view.js */
initApps();                       /* 2208  features/apps.js */
initAgentSubmit();                /* 智能体开发：卡片菜单与提交上架审核 */
initAgentConfig();                /* 智能体开发：会话右侧的智能体配置面板 */
initWorkChat();                   /* 工作 · 智能体对话：选择已发布的智能体提问 */
initSegmentedTabs();              /* 2289  features/sidebar.js */
initProjectActions();             /* 项目操作下拉（打开文件夹/重命名/删除） */
initComposer();                   /* 2312  features/composer.js */
initPromptEnhance();              /* 提示词增强：idle/loading/applied 三态 */
initHistoryPanel();               /* 2859  features/chat.js */
initNewAppModal();                /* 2885  features/apps.js */
initAttachModal();                /* 2996  features/attach-app.js */
initPlusMenu();                   /* 3015  features/composer.js */
initHomeCards();                  /* 3138  core/view.js */
initAppsNewDropdown();            /* 3177  features/apps.js */
initTestParam();                  /* 3269  boot/test-param.js */
initTooltip();                    /* 3277  features/tooltip.js */
initShortcuts();                  /* 3308  features/shortcuts.js */
initDesignArea();                 /* 3389–3796  features/design/entry.js */
initRoute();                      /* 4181  boot/route.js */
initExpertArea();                 /* 4234–5261  features/expert/entry.js：智能体与智能体团队 */
initCollabArea();                 /* 5714–6445  features/collab/entry.js：协作开发 */
initManagerData();                /* 管理项目先注册给任务模块：管理板块新建的开发任务在开发板块可见 */
initTasksV2();                    /* 任务管理 v2 */
initCollabWorkbench();            /* 协作开发工作台骨架：原在 initTasksV2() 末尾，顺序不变 */
initInbox();                      /* 系统通知收件箱 */
initAnalytics();                  /* 用户行为分析看板 */
initPlatformAdmin();              /* 平台智能体管理原型与本地更新 */
initManager();                    /* 管理板块：项目列表与项目详情 */
initWork();                       /* 工作板块：新任务首屏与历史对话 */
initChatStageLayout();
initPageSelectDropdowns();         /* 现行页面普通单选字段统一组件 */
initAgentDemo();                  /* 智能体开发演示：对话创建、沙箱测试、提交与 Work 使用 */
initPages();                      /* 新页面：src/scripts/pages/*.js 自动接线，不用改本文件 */

/* 全局 ESC 关闭弹窗：找到最上层的可见 overlay，触发其关闭按钮点击 */
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target.isContentEditable) return;
  var sel = '.modal-overlay:not(.hidden), .tk-modal-overlay:not(.hidden), .sync-overlay[style*="display:flex"], .sync-overlay[style*="display: flex"]';
  var visible = [];
  document.querySelectorAll(sel).forEach(function (el) {
    if (getComputedStyle(el).display !== 'none') visible.push(el);
  });
  if (!visible.length) return;
  var modal = visible[visible.length - 1];
  var closeBtn = modal.querySelector('.modal-close, .sync-modal__close, .task-modal__close, [data-modal-close]');
  if (closeBtn) { closeBtn.click(); e.preventDefault(); return; }
  var cancelBtn = modal.querySelector('.modal-btn.cancel, .modal-btn--cancel, .sync-modal__btn--ghost');
  if (cancelBtn) { cancelBtn.click(); e.preventDefault(); return; }
  modal.classList.add('hidden');
  modal.style.display = 'none';
  e.preventDefault();
});

/* 未登录时清理 URL，确保页面仅显示登录页 */
if (!_authedUser) history.replaceState(null, '', withBase('/'));
