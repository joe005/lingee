import billTemplate from '../artifacts/purchase-order.html?raw';
import tokensCss from '../styles/tokens.css?raw';

import { initLogin } from './features/login.js';
import { initScrollbar, initUserMenu, initSidebarIcons, initSegmentedTabs } from './features/sidebar.js';
import { initToast } from './core/toast.js';
import { initChangelog } from './features/changelog.js';
import { initHoverDropdowns, initFormDropdowns } from './features/dropdown.js';
import { initAttachApp, initAttachModal } from './features/attach-app.js';
import { initViewSwitch, initSidebarNav, initHomeCards } from './core/view.js';
import { initPreview, initHistoryPanel } from './features/chat.js';
import { initEnvConfig, initEnvAuth, initEnvDisconnect } from './features/env.js';
import { initApps, initNewAppModal, initAppsNewDropdown } from './features/apps.js';
import { initComposer, initPlusMenu } from './features/composer.js';
import { initTestParam } from './boot/test-param.js';
import { initTooltip } from './features/tooltip.js';
import { initShortcuts } from './features/shortcuts.js';
import { initDesignSystem } from './features/design/index.js';
import { initDesignComponents } from './features/design/components.js';
import { initRoute } from './boot/route.js';
import { initExpertData } from './features/expert/data.js';
import { initExpertLibrary } from './features/expert/library.js';
import { initAutoMatch } from './features/expert/automatch.js';
import { initExpertEditor } from './features/expert/editor.js';
import { initTeamModal } from './features/expert/team-modal.js';
import { initExpertChips } from './features/expert/chips.js';
import { initCollabView, initCollabTabs } from './features/collab/view.js';
import { initCollabTasks } from './features/collab/tasks.js';
import { initCollabProjects } from './features/collab/projects.js';
import { initCollabConfig } from './features/collab/config.js';
import { initCollab } from './features/collab/index.js';
import { _authedUser } from './features/login.js';

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
initEnvConfig();                  /*  971  features/env.js */
initEnvAuth();                    /* 1161  features/env.js */
initEnvDisconnect();              /* 1614  features/env.js */
initSidebarIcons();               /* 2061  features/sidebar.js */
initSidebarNav();                 /* 2180  core/view.js */
initApps();                       /* 2208  features/apps.js */
initSegmentedTabs();              /* 2289  features/sidebar.js */
initComposer();                   /* 2312  features/composer.js */
initHistoryPanel();               /* 2859  features/chat.js */
initNewAppModal();                /* 2885  features/apps.js */
initAttachModal();                /* 2996  features/attach-app.js */
initPlusMenu();                   /* 3015  features/composer.js */
initHomeCards();                  /* 3138  core/view.js */
initAppsNewDropdown();            /* 3177  features/apps.js */
initTestParam();                  /* 3269  boot/test-param.js */
initTooltip();                    /* 3277  features/tooltip.js */
initShortcuts();                  /* 3308  features/shortcuts.js */
initDesignSystem();               /* 3389  features/design/index.js */
initDesignComponents();           /* 3796  features/design/components.js */
initRoute();                      /* 4181  boot/route.js */
initExpertData();                 /* 4234  features/expert/data.js */
initExpertLibrary();              /* 4627  features/expert/library.js */
initAutoMatch();                  /* 4759  features/expert/automatch.js */
initExpertEditor();               /* 4885  features/expert/editor.js */
initTeamModal();                  /* 5034  features/expert/team-modal.js */
initExpertChips();                /* 5261  features/expert/chips.js */
initCollabView();                 /* 5714  features/collab/view.js */
initCollabTasks();                /* 5767  features/collab/tasks.js */
initCollabTabs();                 /* 6189  features/collab/view.js */
initCollabProjects();             /* 6287  features/collab/projects.js */
initCollabConfig();               /* 6370  features/collab/config.js */
initCollab();                     /* 6445  features/collab/index.js */

/* 未登录时清理 URL，确保页面仅显示登录页 */
if (!_authedUser) history.replaceState(null, '', '/');
