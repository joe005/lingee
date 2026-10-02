import { initExpertMarket } from './expert-market.js';
import { renderExpertGrid } from '../expert/library.js';
import { handleLayerAction, layerOf } from '../expert/layers.js';
import { set_cvExpertLayer } from './experts.js';
import { initTaskBoard } from './task-board.js';
import { initNewTask } from './new-task.js';
import { initTaskChat } from './task-chat.js';
import { $ } from '../../core/dom.js';
import { cvLoadSavedTasks, cvOpenConversation, cvSendChatMessage } from './chat.js';
import { cvEnsureCurrentUserProjectDemoData, cvEnsureProjectRoleDemoData, cvEnsureSeedPersons, cvEnsureSeedProjects, cvEnsureTeamPersons, cvEnsureTeamProjectMembers, cvEnsureSeedWorkspaces, cvEnsureWorkspaceDemoProjects, cvInjectCardActions, cvProject, cvProjectInWorkspace, cvPruneDeletedWorkspaceData, cvRenderReviewStats, cvRenderReviews, cvRenderTaskStats, cvRenderTasks, cvRestorePersons, cvRestoreWorkspaces, setConversationOpener, set_cvProject } from './data.js';
import { cvMigrateProjectSquads, cvRestoreSquads } from './squads.js';
import { cvClosePersonEdit, cvOpenPersonNew, cvRenderPermTable, cvSavePersonEdit, initCollabPersons } from './persons.js';
import { cvCloseFeatureEdit, cvCloseManualSplit, cvCloseProjectSplit, cvConfirmManualSplit, cvConfirmProjectSplit, cvOpenManualSplit, cvRenderProjectDetail, cvRenderProjectList, cvResetProjectListState, cvSaveFeatureEdit, initCollabProjectView } from './project-view.js';
import { cvCloseArtFiles, cvOpenArtFiles } from './art-files.js';
import { cvRenderExperts, set_cvExpertKw } from './experts.js';
import { cvRenderProjMenu, cvRenderWsMenu, cvRestoreProjects, cvSetProject, cvUpdateCounts } from './projects.js';
import { cvRemoveLingeePrototypeTasks, cvRemoveZhangAutoProjectMember } from './data.js';
import { cvOpenReviewDetail, cvReviewPass, cvReviewReject, cvSubmitReview, cvSwitchArtifact } from './reviews.js';
import { cvApplyReviewFilters, cvClickReviewStat, cvClickStat, cvCloseSyncModal, cvCloseTaskModal, cvConfirmExec, cvConfirmReview, cvConfirmTransfer, cvConfirmTwist, cvOpenSyncModal, cvOpenTaskModal, cvSaveSyncTask, cvSelectCollabMode, cvSelectPersonItem, cvStartSyncTask, cvToggleSyncDropdown } from './tasks.js';
import { cvApplyFilters, cvInited, cvPendingProj, cvPendingTab, cvSwitchFilter, cvSwitchView, set_cvInited, set_cvPendingProj, set_cvPendingTab } from './view.js';
import { summon } from '../expert/automatch.js';
import { EX } from '../expert/data.js';
import { openExpertEditor } from '../expert/editor.js';
import { startAssetCreationChat } from '../composer.js';
import { openExpertModal } from '../expert/library.js';
/* 协作开发：初始化与对外暴露
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 初始化 ---------- */
function cvInit(){
  if(cvInited) return;
  set_cvInited(true);
  cvLoadSavedTasks();
  cvRestoreProjects();
  cvRestoreSquads();
  cvRestorePersons();
  cvEnsureSeedPersons();
  cvEnsureTeamPersons();
  cvEnsureProjectRoleDemoData();
  cvEnsureCurrentUserProjectDemoData();
  cvEnsureSeedProjects();
  cvEnsureTeamProjectMembers();
  cvRemoveZhangAutoProjectMember();
  cvEnsureSeedWorkspaces();
  cvPruneDeletedWorkspaceData();
  cvMigrateProjectSquads();
  cvRenderTaskStats(); cvRenderTasks();
  cvRenderReviewStats(); cvRenderReviews();
  cvRenderProjectList();
  cvInjectCardActions();
  cvRenderWsMenu(); cvRenderProjMenu(); cvUpdateCounts();
}

var cvExpertSearch=$('#cvExpertSearch');
var cvExpertSections=$('#cvExpertSections');

export function initCollab() {
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


  /* URL 直接进入协作开发时，等模块加载完再渲染 */
  if(cvPendingTab){
    cvInit();
    if(cvPendingProj) cvSetProject(cvPendingProj);
    cvSwitchView(cvPendingTab);
    set_cvPendingTab(null); set_cvPendingProj(null);
  }

  /* 内联事件用到的函数挂到 window */
  window.cvSwitchView=cvSwitchView;
  window.cvSwitchFilter=cvSwitchFilter;
  window.cvApplyFilters=cvApplyFilters;
  window.cvApplyReviewFilters=cvApplyReviewFilters;
  window.cvClickStat=cvClickStat;
  window.cvClickReviewStat=cvClickReviewStat;
  window.cvOpenSyncModal=cvOpenSyncModal;
  window.cvCloseSyncModal=cvCloseSyncModal;
  window.cvSelectCollabMode=cvSelectCollabMode;
  window.cvToggleSyncDropdown=cvToggleSyncDropdown;
  window.cvSaveSyncTask=cvSaveSyncTask;
  window.cvStartSyncTask=cvStartSyncTask;
  window.cvOpenTaskModal=cvOpenTaskModal;
  window.cvCloseTaskModal=cvCloseTaskModal;
  window.cvSelectPersonItem=cvSelectPersonItem;
  window.cvConfirmExec=cvConfirmExec;
  window.cvConfirmTransfer=cvConfirmTransfer;
  window.cvConfirmTwist=cvConfirmTwist;
  window.cvConfirmReview=cvConfirmReview;
  window.cvReviewPass=cvReviewPass;
  window.cvReviewReject=cvReviewReject;
  window.cvOpenReviewDetail=cvOpenReviewDetail;
  window.cvSwitchArtifact=cvSwitchArtifact;
  window.cvSubmitReview=cvSubmitReview;
  window.cvSendChatMessage=cvSendChatMessage;
  window.cvOpenConversation=cvOpenConversation;
  window.cvOpenPersonNew=cvOpenPersonNew;
  window.cvClosePersonEdit=cvClosePersonEdit;
  window.cvSavePersonEdit=cvSavePersonEdit;
  window.cvRenderProjectList=cvRenderProjectList;
  window.cvResetProjectListState=cvResetProjectListState;
  window.cvRenderPermTable=cvRenderPermTable;
  window.cvRenderProjectDetail=cvRenderProjectDetail;
  window.cvOpenArtFiles=cvOpenArtFiles;
  window.cvCloseArtFiles=cvCloseArtFiles;
  window.cvCloseProjectSplit=cvCloseProjectSplit;
  window.cvConfirmProjectSplit=cvConfirmProjectSplit;
  window.cvOpenManualSplit=cvOpenManualSplit;
  window.cvCloseManualSplit=cvCloseManualSplit;
  window.cvConfirmManualSplit=cvConfirmManualSplit;
  window.cvCloseFeatureEdit=cvCloseFeatureEdit;
  window.cvSaveFeatureEdit=cvSaveFeatureEdit;
}

export { cvInit };
