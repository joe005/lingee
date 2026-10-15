import { initCollabLoading, loadCollabEntry, yieldCollabPaint } from './loading.js';
import { initExpertMarket } from './expert-market.js';
import { renderExpertGrid } from '../expert/library.js';
import { handleLayerAction } from '../expert/layers.js';
import { set_cvExpertLayer } from './experts.js';
import { initTaskBoard } from './task-board.js';
import { initNewTask } from './new-task.js';
import { initTaskChat } from './task-chat.js';
import { $ } from '../../core/dom.js';
import { cvLoadSavedTasks, cvOpenConversation, exposeCollabChatGlobals } from './chat.js';
import { cvEnsureCurrentUserProjectDemoData, cvEnsureProjectRoleDemoData, cvEnsureSeedPersons, cvEnsureSeedProjects, cvEnsureTeamPersons, cvEnsureTeamProjectMembers, cvEnsureSeedWorkspaces, cvInjectCardActions, cvPruneDeletedWorkspaceData, cvRenderReviewStats, cvRenderReviews, cvRenderTaskStats, cvRenderTasks, cvRestorePersons, setConversationOpener } from './data.js';
import { cvMigrateProjectSquads, cvRestoreSquads } from './squads.js';
import { initCollabPersons, exposeCollabPersonGlobals } from './persons.js';
import { cvRenderProjectList, initCollabProjectView, exposeCollabProjectGlobals } from './project-view.js';
import { exposeCollabArtFileGlobals } from './art-files.js';
import { cvRenderExperts, set_cvExpertKw } from './experts.js';
import { cvRenderProjMenu, cvRenderWsMenu, cvRestoreProjects, cvSetProject, cvUpdateCounts } from './projects.js';
import { cvRemoveLingeePrototypeTasks, cvRemoveZhangAutoProjectMember } from './data.js';
import { exposeCollabReviewGlobals } from './reviews.js';
import { exposeCollabTaskGlobals } from './tasks.js';
import { cvInited, cvPendingProj, cvPendingTab, cvSwitchView, set_cvInited, set_cvPendingProj, set_cvPendingTab, exposeCollabViewGlobals } from './view.js';
import { summon } from '../expert/automatch.js';
import { initLocalDev } from './local-dev.js';
import { EX } from '../expert/data.js';
import '../expert/editor.js';   /* 不再取用其导出，保留以维持模块求值顺序 */
import { startAssetCreationChat } from '../composer.js';
import { openExpertModal } from '../expert/library.js';
/* 协作开发：初始化与对外暴露
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 初始化 ---------- */
var cvInitPromise = null;
function cvInit(signal){
  if(cvInited) return Promise.resolve();
  if(cvInitPromise) return cvInitPromise;
  cvInitPromise = (async function(){
    cvLoadSavedTasks();
    await yieldCollabPaint(signal);
    cvRestoreProjects();
    await yieldCollabPaint(signal);
    cvRestoreSquads();
    await yieldCollabPaint(signal);
    cvRestorePersons();
    await yieldCollabPaint(signal);
    cvEnsureSeedPersons();
    await yieldCollabPaint(signal);
    cvEnsureTeamPersons();
    await yieldCollabPaint(signal);
    cvEnsureProjectRoleDemoData();
    await yieldCollabPaint(signal);
    cvEnsureCurrentUserProjectDemoData();
    await yieldCollabPaint(signal);
    cvEnsureSeedProjects();
    await yieldCollabPaint(signal);
    cvEnsureTeamProjectMembers();
    await yieldCollabPaint(signal);
    cvRemoveZhangAutoProjectMember();
    await yieldCollabPaint(signal);
    cvEnsureSeedWorkspaces();
    await yieldCollabPaint(signal);
    cvPruneDeletedWorkspaceData();
    await yieldCollabPaint(signal);
    cvMigrateProjectSquads();
    await yieldCollabPaint(signal);
    cvRenderTaskStats(); cvRenderTasks();
    await yieldCollabPaint(signal);
    cvRenderReviewStats(); cvRenderReviews();
    await yieldCollabPaint(signal);
    cvRenderProjectList();
    await yieldCollabPaint(signal);
    cvInjectCardActions();
    await yieldCollabPaint(signal);
    cvRenderWsMenu(); cvRenderProjMenu(); cvUpdateCounts();
    await yieldCollabPaint(signal);
    document.dispatchEvent(new Event('lingee:tasks-changed'));
    await yieldCollabPaint(signal);
    set_cvInited(true);
  })().finally(function(){ cvInitPromise = null; });
  return cvInitPromise;
}
function cvOpenEntry(tab, project){
  loadCollabEntry(tab, cvInit, function(target){
    if(project) cvSetProject(project);
    cvSwitchView(target);
  });
}

var cvExpertSearch=$('#cvExpertSearch');
var cvExpertSections=$('#cvExpertSections');

export function initCollab() {
  initCollabLoading();
  initLocalDev();
  setConversationOpener(cvOpenConversation);
  initExpertMarket({expert:cvRenderExperts,team:renderExpertGrid});
  cvRemoveLingeePrototypeTasks();
  initTaskBoard();
  initTaskChat();
  initNewTask();
  initCollabProjectView();
  initCollabPersons();
  document.querySelectorAll('#cv-experts [data-asset-create],#cv-teams [data-asset-create]').forEach(function(button){
    button.addEventListener('click',function(){startAssetCreationChat(button.dataset.assetCreate);});
  });
  document.querySelector('[data-layer-tabs="expert"]')?.addEventListener('click',function(e){var btn=e.target.closest('[data-layer]');if(btn){set_cvExpertLayer(btn.dataset.layer);cvRenderExperts();}});
  document.addEventListener('cv-workspace-change',cvRenderExperts);
  if(cvExpertSearch) cvExpertSearch.addEventListener('input',function(){ set_cvExpertKw(this.value); cvRenderExperts(); });
  if(cvExpertSections) cvExpertSections.addEventListener('click',function(e){
    if(handleLayerAction(e)){cvRenderExperts();renderExpertGrid();return;}
    var call=e.target.closest('[data-cv-call]');
    if(call){ summon('expert',call.getAttribute('data-cv-call')); return; }
    var card=e.target.closest('[data-cv-expert]');
    if(card){
      var eid=card.getAttribute('data-cv-expert'), ex=EX[eid];
      /* 自己建的专家没有「只读详情」这一说，点开就是编辑；预置专家不能改，点开还是详情 */
      openExpertModal(eid);
    }
  });


  /* 其他页面打开协作开发（侧栏菜单、智能体团队入口等）：对方只显示视图并发事件，
     初始化与切页签在这里；detail.tab 缺省为任务页签 */
  document.addEventListener('lingee:collab-nav',function(e){ cvOpenEntry((e.detail&&e.detail.tab)||'tasks'); });

  /* URL 直接进入协作开发时，等模块加载完再渲染 */
  if(cvPendingTab){
    cvOpenEntry(cvPendingTab, cvPendingProj);
    set_cvPendingTab(null); set_cvPendingProj(null);
  }

  /* 内联事件用到的函数挂到 window：各模块自己维护清单，这里只按原时机统一调用 */
  exposeCollabViewGlobals();
  exposeCollabTaskGlobals();
  exposeCollabReviewGlobals();
  exposeCollabChatGlobals();
  exposeCollabPersonGlobals();
  exposeCollabProjectGlobals();
  exposeCollabArtFileGlobals();
}

export { cvInit };
