import { initTaskBoard } from './task-board.js';
import { initNewTask } from './new-task.js';
import { initTaskChat } from './task-chat.js';
import { $ } from '../../core/dom.js';
import { cvCloseAddMemberModal, cvConfirmAddMembers, cvLoadSavedTasks, cvOpenAddMemberModal, cvOpenConversation, cvSearchThirdPartyMembers, cvSendChatMessage } from './chat.js';
import { cvInjectCardActions, cvRenderReviewStats, cvRenderReviews, cvRenderTaskStats, cvRenderTasks, cvRestorePersons } from './data.js';
import { cvArchiveSquad, cvCloseNewSquadModal, cvConfirmNewSquad, cvHideSquadDetail, cvMigrateProjectSquads, cvOpenNewSquadModal, cvRenderSquadList, cvRestoreSquads, cvSetSquadLeader, cvShowSquadDetail, cvSwitchSquadTab } from './squads.js';
import { cvCloseArtFiles, cvCloseFeatureEdit, cvCloseManualSplit, cvClosePersonEdit, cvCloseProjectSplit, cvConfirmManualSplit, cvConfirmProjectSplit, cvOpenArtFiles, cvOpenManualSplit, cvOpenPersonEdit, cvOpenPersonNew, cvRenderPermTable, cvRenderProjectDetail, cvRenderProjectList, cvSaveFeatureEdit, cvSavePersonEdit, initCollabPersons } from './persons.js';
import { cvRenderExperts, set_cvExpertKw } from './experts.js';
import { cvRenderProjMenu, cvRenderWsMenu, cvRestoreProjects, cvSetProject, cvUpdateCounts } from './projects.js';
import { cvOpenReviewDetail, cvReviewPass, cvReviewReject, cvSubmitReview, cvSwitchArtifact } from './reviews.js';
import { cvApplyReviewFilters, cvClickReviewStat, cvClickStat, cvCloseSyncModal, cvCloseTaskModal, cvConfirmExec, cvConfirmReview, cvConfirmTransfer, cvConfirmTwist, cvOpenSyncModal, cvOpenTaskModal, cvSaveSyncTask, cvSelectCollabMode, cvSelectPersonItem, cvStartSyncTask, cvToggleSyncDropdown } from './tasks.js';
import { cvApplyFilters, cvInited, cvPendingProj, cvPendingTab, cvSwitchFilter, cvSwitchView, set_cvInited, set_cvPendingProj, set_cvPendingTab } from './view.js';
import { summon } from '../expert/automatch.js';
import { EX } from '../expert/data.js';
import { openExpertEditor } from '../expert/editor.js';
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
  cvMigrateProjectSquads();
  cvRenderTaskStats(); cvRenderTasks();
  cvRenderReviewStats(); cvRenderReviews();
  cvRenderSquadList();
  cvRenderProjectList();
  cvInjectCardActions();
  cvRenderWsMenu(); cvRenderProjMenu(); cvUpdateCounts();
}
var cvExpertSearch=$('#cvExpertSearch');
var cvNewExpertBtn=$('#cvNewExpertBtn');
var cvExpertSections=$('#cvExpertSections');

export function initCollab() {
  initTaskBoard();
  initTaskChat();
  initNewTask();
  initCollabPersons();
  var cvConfigPanel=$('#cv-config');
  if(cvConfigPanel) cvConfigPanel.addEventListener('click',function(e){
    var row=e.target.closest('[data-cv-squad]');
    if(row){ cvShowSquadDetail(row.getAttribute('data-cv-squad')); return; }
    if(e.target.closest('[data-cv-sqback]')){ cvHideSquadDetail(); return; }
    if(e.target.closest('[data-cv-sq-archive]')){ cvArchiveSquad(); return; }
    var tab=e.target.closest('[data-cv-sq-tab]');
    if(tab){ cvSwitchSquadTab(tab.getAttribute('data-cv-sq-tab')); return; }
    if(e.target.closest('[data-cv-sq-addmember]')){ cvOpenAddMemberModal(); return; }
    var setL=e.target.closest('[data-cv-sq-setleader]');
    if(setL){ cvSetSquadLeader(+setL.getAttribute('data-cv-sq-setleader')); return; }
  });
  if(cvExpertSearch) cvExpertSearch.addEventListener('input',function(){ set_cvExpertKw(this.value); cvRenderExperts(); });
  if(cvNewExpertBtn) cvNewExpertBtn.addEventListener('click',function(){ openExpertEditor(null) });
  if(cvExpertSections) cvExpertSections.addEventListener('click',function(e){
    var call=e.target.closest('[data-cv-call]');
    if(call){ summon('expert',call.getAttribute('data-cv-call')); return; }
    if(e.target.closest('[data-cv-new-expert]')){ openExpertEditor(null); return; }
    var card=e.target.closest('[data-cv-expert]');
    if(card){
      var eid=card.getAttribute('data-cv-expert'), ex=EX[eid];
      /* 自己建的专家没有「只读详情」这一说，点开就是编辑；预置专家不能改，点开还是详情 */
      if(ex&&ex.mine) openExpertEditor(eid); else openExpertModal(eid);
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
  window.cvOpenAddMemberModal=cvOpenAddMemberModal;
  window.cvCloseAddMemberModal=cvCloseAddMemberModal;
  window.cvSearchThirdPartyMembers=cvSearchThirdPartyMembers;
  window.cvConfirmAddMembers=cvConfirmAddMembers;
  window.cvOpenPersonNew=cvOpenPersonNew;
  window.cvOpenPersonEdit=cvOpenPersonEdit;
  window.cvClosePersonEdit=cvClosePersonEdit;
  window.cvSavePersonEdit=cvSavePersonEdit;
  window.cvRenderProjectList=cvRenderProjectList;
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
  window.cvOpenNewSquadModal=cvOpenNewSquadModal;
  window.cvCloseNewSquadModal=cvCloseNewSquadModal;
  window.cvConfirmNewSquad=cvConfirmNewSquad;
}

export { cvInit };
