import { openTaskStatusConversation } from '../../composer.js';
import { tkGetTasks, tkPeopleInProject, tkProjectsForCurrentUser } from '../data.js';
import { openNewIssueCopy } from '../new-issue-ui.js';
import { taskViewState } from '../ui-state.js';
import { closeTaskLabelPicker, openListReviewPreview } from './detail-panel.js';
import { closeViewMenu } from './events-views.js';
import { openTaskModal, refreshFormAssignees } from './form-modal.js';
import { closeDisplayChoiceMenu, closeFieldSettings, render, saveInlineTask } from './layout.js';
import { closeFilterPanel, handleDragEnd, handleDragLeave, handleDragOver, handleDragStart, handleDrop, hidePopover, updateFilterButton } from './menus.js';
import { pageState } from './page-state.js';
import { animateListSubtasks, visibleListColumnCount } from './render.js';
import { els, persistViewState, state, subtaskSectionExpanded } from './state.js';
import { _collapsedActivityIds, _expandedActivityIds, _showOlderActivityIds, closeDrawer, openDrawer, openDrawerArtifacts } from './subtasks.js';
import { chooseFirstAssignee, handleTaskCardPrimaryAction, confirmDeleteTask, confirmTaskStageApproval, filterAssigneeOptions, openBoardTaskSession, retryBlockedTask, showCardMenu, startTaskExecution } from './utils.js';
/* 任务页 · 事件绑定 · 子任务、看板 / 列表点击与拖拽、列折叠、浮层关闭（拆分自 tasks-v2/index.js，逻辑未改） */
export function bindBoardEvents() {
  /* 详情面板内：添加子任务 / 打开子任务 */
  els.tkDrawerBody.addEventListener('click', function (e) {
    var sessionsToggle = e.target.closest('[data-stage-sessions-toggle]');
    if (sessionsToggle) {
      var sessionsList = els.tkDrawerBody.querySelector('#' + sessionsToggle.getAttribute('aria-controls'));
      if (!sessionsList) return;
      sessionsList.hidden = !sessionsList.hidden;
      sessionsToggle.setAttribute('aria-expanded', String(!sessionsList.hidden));
      return;
    }
    var stageDetailToggle = e.target.closest('[data-stage-detail-toggle]');
    if (stageDetailToggle) {
      var stageDetail = els.tkDrawerBody.querySelector('#' + stageDetailToggle.getAttribute('aria-controls'));
      if (!stageDetail) return;
      stageDetail.hidden = !stageDetail.hidden;
      var stageDetailRow = stageDetail.closest('.tk-feed-stage-extra');
      if (stageDetailRow && !stageDetailRow.querySelector('.tk-feed-stage-sessions')) stageDetailRow.hidden = stageDetail.hidden;
      stageDetailToggle.setAttribute('aria-expanded', String(!stageDetail.hidden));
      stageDetailToggle.setAttribute('aria-label', (stageDetail.hidden ? '展开' : '收起') + '产物');
      return;
    }
    var stageHistoryToggle = e.target.closest('[data-stage-history-toggle]');
    if (stageHistoryToggle) {
      var stageHistory = els.tkDrawerBody.querySelector('#' + stageHistoryToggle.getAttribute('aria-controls'));
      if (!stageHistory) return;
      stageHistory.hidden = !stageHistory.hidden;
      stageHistoryToggle.setAttribute('aria-expanded', String(!stageHistory.hidden));
      stageHistoryToggle.textContent = pageState.taskDetailVersion === 'v1'
        ? (stageHistory.hidden ? '查看过程明细' : '收起过程明细')
        : (stageHistory.hidden ? '展开明细' : '收起明细');
      return;
    }
    var actToggle = e.target.closest('[data-activity-toggle]');
    if (actToggle) {
      var aid = actToggle.getAttribute('data-activity-toggle');
      if (_expandedActivityIds.has(aid)) { _expandedActivityIds.delete(aid); _collapsedActivityIds.add(aid); }
      else if (_collapsedActivityIds.has(aid)) { _collapsedActivityIds.delete(aid); _expandedActivityIds.add(aid); }
      else { _expandedActivityIds.add(aid); }
      openDrawer(state.drawerTaskId);
      return;
    }
    var actOlder = e.target.closest('[data-activity-older]');
    if (actOlder) {
      _showOlderActivityIds.add(actOlder.getAttribute('data-activity-older'));
      openDrawer(state.drawerTaskId);
      return;
    }
    var subToggle = e.target.closest('[data-subtask-toggle]');
    if (subToggle) {
      var subSection = subToggle.closest('.tk-subtasks');
      var subList = subSection.querySelector('.tk-subtask-list');
      var expanded = subToggle.getAttribute('aria-expanded') !== 'true';
      subtaskSectionExpanded.set(parseInt(subToggle.getAttribute('data-subtask-toggle'), 10), expanded);
      subToggle.setAttribute('aria-expanded', String(expanded));
      subSection.classList.toggle('is-collapsed', !expanded);
      subList.hidden = !expanded;
      return;
    }
    var addSubBtn = e.target.closest('[data-drawer-subtask]');
    if (addSubBtn) {
      var pid = parseInt(addSubBtn.getAttribute('data-drawer-subtask'), 10);
      openTaskModal(null, pid);
      return;
    }
    var openSub = e.target.closest('[data-subtask-open]');
    if (openSub) {
      var sid = parseInt(openSub.getAttribute('data-subtask-open'), 10);
      openDrawer(sid);
      return;
    }
  });

  /* 重置筛选 */
  els.tkResetFilter.addEventListener('click', function () {
    state.filters = []; state.search = ''; els.tkSearch.value = ''; updateFilterButton(); render();
  });

  /* 看板点击（列底新建 / 打开详情 / 多选 / 折叠子任务） */
  els.tkBoardScroll.addEventListener('click', function (e) {
    var toggleBtn = e.target.closest('[data-tk-toggle]');
    if (toggleBtn) {
      var tid = parseInt(toggleBtn.getAttribute('data-tk-toggle'), 10);
      var wasCollapsed = pageState.collapsedParents.has(tid);
      if (wasCollapsed) {
        pageState.collapsedParents.delete(tid);
        render();
        els.tkBoardScroll.classList.add('tk-just-expanded');
        setTimeout(function () { els.tkBoardScroll.classList.remove('tk-just-expanded'); }, 320);
      } else {
        var parentCard = toggleBtn.closest('.tk-card');
        if (parentCard) {
          var next = parentCard.nextElementSibling;
          while (next && next.classList.contains('tk-card--child')) {
            next.classList.add('tk-leaving');
            next = next.nextElementSibling;
          }
        }
        pageState.collapsedParents.add(tid);
        setTimeout(function () { render(); }, 260);
      }
      return;
    }
    var addBtn = e.target.closest('[data-add-group]');
    if (addBtn) {
      var groupKey = addBtn.getAttribute('data-add-group');
      openTaskModal(null);
      if (state.groupBy === 'status') els.tkFormStatus.value = groupKey;
      else if (state.groupBy === 'priority') els.tkFormPriority.value = groupKey;
      else if (state.groupBy === 'assignee' && groupKey !== 'unassigned') { var memberProject = tkProjectsForCurrentUser().find(function (project) { return tkPeopleInProject(project.id).some(function (person) { return person.id === groupKey; }); }); if (memberProject) { els.tkFormProject.value = memberProject.id; refreshFormAssignees(groupKey); } }
      else if (state.groupBy === 'project' && groupKey !== 'none') { els.tkFormProject.value = groupKey; refreshFormAssignees(); }
      return;
    }
    var boardListAction = e.target.closest('[data-list-task-action]');
    if (boardListAction) {
      var boardTaskId = Number(boardListAction.getAttribute('data-list-task-id'));
      var boardActionName = boardListAction.getAttribute('data-list-task-action');
      handleTaskCardPrimaryAction(boardTaskId, boardActionName, boardListAction);
      return;
    }
    var playBtnB = e.target.closest('[data-card-play]');
    if (playBtnB) { startTaskExecution(parseInt(playBtnB.getAttribute('data-card-play'), 10)); return; }
    var reviewBtn = e.target.closest('[data-card-review]');
    if (reviewBtn) {
      openDrawerArtifacts(Number(reviewBtn.getAttribute('data-card-review')));
      return;
    }
    var sessionBtn = e.target.closest('[data-card-session]');
    var retryBtn = e.target.closest('[data-card-retry]');
    if (retryBtn) { retryBlockedTask(tkGetTasks().find(function (task) { return task.id === Number(retryBtn.getAttribute('data-card-retry')); })); return; }
    if (sessionBtn) { openBoardTaskSession(tkGetTasks().find(function (task) { return task.id === Number(sessionBtn.getAttribute('data-card-session')); })); return; }
    var moreBtnB = e.target.closest('[data-card-more]');
    if (moreBtnB) { showCardMenu(moreBtnB.getAttribute('data-card-more'), moreBtnB); return; }
    var cardAct = e.target.closest('[data-card-action]');
    if (cardAct) {
      var aid = cardAct.getAttribute('data-card-task');
      var act = cardAct.getAttribute('data-card-action');
      if (act === 'chat') { startTaskExecution(parseInt(aid, 10)); }
      else if (act === 'delete') { confirmDeleteTask(aid); }
      else if (act === 'copy') { openNewIssueCopy(aid); }
      else if (act === 'subtask') { openTaskModal(null, parseInt(aid, 10)); document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();}); return; }
      document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();});
      return;
    }
    document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();});
    var card = e.target.closest('.tk-card');
    if (card) {
      var id = parseInt(card.getAttribute('data-task-id'), 10);
      if (e.ctrlKey || e.metaKey) {
        if (state.selectedIds.has(id)) state.selectedIds.delete(id);
        else state.selectedIds.add(id);
        render();
      } else {
        var task = tkGetTasks().find(function (row) { return row.id === id; });
        if (task && ['in_progress','in_review','blocked'].includes(task.status)) openBoardTaskSession(task);
        else openDrawer(id);
      }
    }
  });

  /* 看板拖拽 */
  els.tkBoardScroll.addEventListener('dragstart', handleDragStart);
  els.tkBoardScroll.addEventListener('dragend', handleDragEnd);
  els.tkBoardScroll.addEventListener('dragover', handleDragOver);
  els.tkBoardScroll.addEventListener('dragleave', handleDragLeave);
  els.tkBoardScroll.addEventListener('drop', handleDrop);

  /* 列表点击（折叠子任务 / 打开详情 / 多选） */
  els.tkListBody.addEventListener('click', function (e) {
    var listActionBtn = e.target.closest('[data-list-task-action]');
    if (listActionBtn) {
      var listAction = listActionBtn.getAttribute('data-list-task-action');
      var listTaskId = parseInt(listActionBtn.getAttribute('data-list-task-id'), 10);
      var listTask = tkGetTasks().find(function (row) { return row.id === listTaskId; });
      handleTaskCardPrimaryAction(listTaskId, listAction, listActionBtn);
      return;
    }
    var toggleBtn = e.target.closest('[data-tk-toggle]');
    if (toggleBtn) {
      animateListSubtasks(toggleBtn);
      return;
    }
    var inlineCreateRow = e.target.closest('#tkRowCreate');
    if (inlineCreateRow && inlineCreateRow.querySelector('#tkInlineCreateBtn')) {
      if (state.viewMode === 'split' || !pageState.projectListMode) { openTaskModal(null); return; }
      inlineCreateRow.classList.add('is-editing');
      inlineCreateRow.innerHTML = '<td colspan="' + visibleListColumnCount() + '"><div class="tk-inline-create-form"><input type="text" class="tk-inline-input" id="tkInlineTitle" placeholder="输入任务标题"><div class="tk-inline-dropdown" data-value="" id="tkInlineAssigneeWrap"><div class="tk-inline-select is-placeholder" id="tkInlineAssigneeBtn"><input type="text" id="tkInlineAssigneeInput" placeholder="处理人" aria-label="处理人" role="combobox" aria-expanded="false" autocomplete="off"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></div><div class="tk-inline-dropdown-menu" id="tkInlineAssigneeMenu" hidden>' + tkPeopleInProject(pageState.projectListProjectId || tkProjectsForCurrentUser()[0]?.id).map(function(p){return '<div class="tk-inline-dropdown-item" data-assignee="'+p.id+'">'+p.name+'</div>';}).join('') + '</div></div><button class="tk-inline-save" id="tkInlineSave">确定</button><button class="tk-inline-cancel" id="tkInlineCancel">取消</button></div></td>';
      setTimeout(function(){ var i=els.tkListBody.querySelector('#tkInlineTitle'); if(i) i.focus(); },0);
      return;
    }
    var inlineSave = e.target.closest('#tkInlineSave');
    if (inlineSave) {
      saveInlineTask();
      return;
    }
    var inlineAssigneeBtn = e.target.closest('#tkInlineAssigneeBtn');
    if (inlineAssigneeBtn) {
      var amenu = els.tkListBody.querySelector('#tkInlineAssigneeMenu');
      if (amenu) {
        if (e.target.id !== 'tkInlineAssigneeInput') amenu.hidden = !amenu.hidden;
        else amenu.hidden = false;
        var quickInput = inlineAssigneeBtn.querySelector('input');
        quickInput.setAttribute('aria-expanded', String(!amenu.hidden));
        if (!amenu.hidden) {
          filterAssigneeOptions(amenu, '.tk-inline-dropdown-item', '');
          quickInput.focus({ preventScroll: true });
        }
      }
      return;
    }
    var inlineAssigneeItem = e.target.closest('[data-assignee]');
    if (inlineAssigneeItem) {
      var awrap = els.tkListBody.querySelector('#tkInlineAssigneeWrap');
      var abtn = els.tkListBody.querySelector('#tkInlineAssigneeBtn');
      var amnu = els.tkListBody.querySelector('#tkInlineAssigneeMenu');
      if (awrap) awrap.setAttribute('data-value', inlineAssigneeItem.getAttribute('data-assignee'));
      if (abtn) {
        abtn.querySelector('input').value = inlineAssigneeItem.textContent;
        abtn.classList.remove('is-placeholder');
        abtn.querySelector('input').setAttribute('aria-expanded', 'false');
      }
      if (amnu) amnu.hidden = true;
      if (abtn) abtn.querySelector('input').focus();
      return;
    }
    var inlineCancel = e.target.closest('#tkInlineCancel');
    if (inlineCancel) { render(); return; }
    if (inlineCreateRow) return;
    if (e.target.classList.contains('tk-row-check')) {
      var id = parseInt(e.target.getAttribute('data-task-id'), 10);
      if (e.target.checked) state.selectedIds.add(id);
      else state.selectedIds.delete(id);
      render();
      return;
    }
    var playBtn2 = e.target.closest('[data-card-play]');
    if (playBtn2) { startTaskExecution(parseInt(playBtn2.getAttribute('data-card-play'), 10)); return; }
    var moreBtn2 = e.target.closest('[data-card-more]');
    if (moreBtn2) { showCardMenu(moreBtn2.getAttribute('data-card-more'), moreBtn2); return; }
    var cardAct2 = e.target.closest('[data-card-action]');
    if (cardAct2) {
      var aid2 = cardAct2.getAttribute('data-card-task');
      var act2 = cardAct2.getAttribute('data-card-action');
      if (act2 === 'chat') { startTaskExecution(parseInt(aid2, 10)); }
      else if (act2 === 'delete') { confirmDeleteTask(aid2); }
      else if (act2 === 'copy') { openNewIssueCopy(aid2); }
      else if (act2 === 'subtask') { openTaskModal(null, parseInt(aid2, 10)); document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();}); return; }
      document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();});
      return;
    }
    document.querySelectorAll('.tk-card-menu').forEach(function(m){m.remove();});
    var row = e.target.closest('tr');
    if (row) {
      var id = parseInt(row.getAttribute('data-task-id'), 10);
      if (e.ctrlKey || e.metaKey) {
        if (state.selectedIds.has(id)) state.selectedIds.delete(id);
        else state.selectedIds.add(id);
        render();
      } else {
        openDrawer(id);
      }
    }
  });
  els.tkListBody.addEventListener('input', function (e) {
    if (e.target.id !== 'tkInlineAssigneeInput') return;
    var menu = els.tkListBody.querySelector('#tkInlineAssigneeMenu');
    var wrap = els.tkListBody.querySelector('#tkInlineAssigneeWrap');
    wrap.setAttribute('data-value', '');
    menu.hidden = false;
    e.target.setAttribute('aria-expanded', 'true');
    filterAssigneeOptions(menu, '.tk-inline-dropdown-item', e.target.value);
  });
  els.tkListBody.addEventListener('keydown', function (e) {
    var row = e.target.closest('tr[data-task-id]');
    if (row && !e.target.closest('button,input,select,textarea,a') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openDrawer(parseInt(row.getAttribute('data-task-id'), 10));
      return;
    }
    if (e.target.id === 'tkInlineTitle' && e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      saveInlineTask();
    }
    if (e.target.id === 'tkInlineAssigneeInput') chooseFirstAssignee(els.tkListBody.querySelector('#tkInlineAssigneeMenu'), '.tk-inline-dropdown-item', e);
  });

  /* 看板列折叠（记忆折叠状态） */
  els.tkBoardScroll.addEventListener('click', function (e) {
    var toggleBtn = e.target.closest('[data-toggle-col]');
    if (toggleBtn) {
      var col = toggleBtn.closest('.tk-board-col');
      var body = col.querySelector('.tk-board-col-body');
      var groupKey = col.getAttribute('data-group-key');
      body.classList.toggle('collapsed');
      col.classList.toggle('is-collapsed');
      var isCollapsed = body.classList.contains('collapsed');
      if (isCollapsed) taskViewState.collapsedBoardGroups.add(groupKey);
      else taskViewState.collapsedBoardGroups.delete(groupKey);
      var toggleLabel = isCollapsed ? '展开分组' : '折叠分组';
      toggleBtn.setAttribute('data-tooltip', toggleLabel);
      toggleBtn.setAttribute('aria-label', toggleLabel);
      var svg = toggleBtn.querySelector('svg');
      if (isCollapsed) svg.innerHTML = '<polyline points="18 15 12 9 6 15"/>';
      else svg.innerHTML = '<polyline points="6 9 12 15 18 9"/>';
      persistViewState();
    }
  });

  /* 捕获阶段收起卡片菜单，避免页面容器阻止冒泡后空白点击失效。 */
  document.addEventListener('click', function (e) {
    if (e.target.closest('.tk-card-menu,[data-card-more],#tkDrawerMore')) return;
    document.querySelectorAll('.tk-card-menu').forEach(function (menu) { menu.remove(); });
    els.tkDrawerMore?.setAttribute('aria-expanded', 'false');
  }, true);

  /* 点击外部关闭弹出菜单 */
  document.addEventListener('click', function (e) {
    hidePopover();
    if (pageState.labelPickerMenu && !e.target.closest('.tk-label-popover') && !e.target.closest('.tk-label-picker')) closeTaskLabelPicker();
    var ffm = document.querySelector('.tk-flow-field-menu.show');
    if (ffm && !e.target.closest('.tk-flow-field-menu') && !e.target.closest('[data-flow-prop]')) {
      ffm.remove();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var hadOpen = false;
    if (pageState.displayChoiceMenu) { closeDisplayChoiceMenu(true); e.preventDefault(); return; }
    if (!els.tkFilterPanel.classList.contains('hidden')) { closeFilterPanel(); hadOpen = true; }
    if (els.tkViewMenu && !els.tkViewMenu.classList.contains('hidden')) { closeViewMenu(); hadOpen = true; }
    if (!els.tkFieldsPopover.classList.contains('hidden')) { closeFieldSettings(); e.preventDefault(); return; }
    if (!els.tkDisplayPopover.classList.contains('hidden')) {
      els.tkDisplayPopover.classList.add('hidden');
      els.tkDisplayBtn.classList.remove('active');
      els.tkDisplayBtn.setAttribute('aria-expanded', 'false');
      hadOpen = true;
    }
    var ffm = document.querySelector('.tk-flow-field-menu.show');
    if (ffm) { ffm.remove(); hadOpen = true; }
    if (!hadOpen && state.drawerTaskId && els.tkDrawer && els.tkDrawer.classList.contains('show')) {
      closeDrawer();
      e.preventDefault();
    }
  });
  /* 滚动与缩放时关闭悬浮菜单，避免定位错位 */
  window.addEventListener('scroll', function (e) {
    if (pageState.displayChoiceMenu && !pageState.displayChoiceMenu.contains(e.target)) closeDisplayChoiceMenu();
    var ffm = document.querySelector('.tk-flow-field-menu.show');
    if (ffm && !ffm.contains(e.target)) ffm.remove();
  }, true);
  window.addEventListener('resize', function () {
    if (pageState.displayChoiceMenu) closeDisplayChoiceMenu();
    var ffm = document.querySelector('.tk-flow-field-menu.show');
    if (ffm) ffm.remove();
  });
}
