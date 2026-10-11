import { toast } from '../../../core/toast.js';
import { openTaskStatusConversation } from '../../composer.js';
import { TK_STATUSES, tkCurrentUserId, tkGetTaskArtifacts, tkGetTasks, tkPeopleInProject, tkUpdateTask } from '../data.js';
import { openNewIssueCopy, openNewIssueEdit } from '../new-issue-ui.js';
import { submitTaskStage, taskStageHandoffPatch } from '../task-execution.js';
import { tkGetMySessions } from '../task-sessions.js';
import { applyDrawerWidth, closeTaskLabelPicker, openDocPreview, openListReviewPreview, openTaskLabelPicker, propPickerOptions, renderTaskLabelChoices, setDrawerWidth, updateTaskLabels } from './detail-panel.js';
import { openTaskModal } from './form-modal.js';
import { render } from './layout.js';
import { closeMentionPanel, createMentionPanel, insertMention, setMentionIndex } from './mention.js';
import { pageState } from './page-state.js';
import { TASK_START_LEGACY_KEY, els, renderTaskStartAction, state } from './state.js';
import { closeDrawer, openDrawer, taskCommentTimestamp } from './subtasks.js';
import { chooseFirstAssignee, confirmDeleteTask, escapeHtml, filterAssigneeOptions, handleTaskHeaderAction, openMyTaskSession, openTaskConversationWithTask, retryBlockedTask, showCardMenu, startTaskExecution, viewBlockedTaskSession } from './utils.js';
/* 任务页 · 事件绑定 · 详情面板、评论 @ 提及、属性区（拆分自 tasks-v2/index.js，逻辑未改） */
export function bindDetailEvents() {
  /* 详情面板 */
  els.tkDrawerFoot.addEventListener('click', function (e) {
    if (e.target.closest('[data-detail-footer-delete]')) confirmDeleteTask(state.drawerTaskId);
    if (e.target.closest('[data-detail-footer-edit]')) { var id = state.drawerTaskId; closeDrawer(); openNewIssueEdit(id); }
  });
  els.tkDrawerClose.addEventListener('click', closeDrawer);
  els.tkDrawerClickaway.addEventListener('click', closeDrawer);
  els.tkDrawerMore.addEventListener('click', function (e) {
    e.stopPropagation();
    var openMenu = document.querySelector('.tk-drawer-more-menu');
    if (openMenu) {
      openMenu.remove();
      this.setAttribute('aria-expanded', 'false');
    } else if (state.drawerTaskId) {
      showCardMenu(state.drawerTaskId, this, true);
      this.setAttribute('aria-expanded', 'true');
    }
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('.tk-drawer-more-menu') || e.target.closest('#tkDrawerMore')) return;
    document.querySelectorAll('.tk-drawer-more-menu').forEach(function (m) { m.remove(); });
    els.tkDrawerMore.setAttribute('aria-expanded', 'false');
  });
  els.tkDrawerResize.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || window.innerWidth <= 760 || state.viewMode !== 'slide') return;
    e.preventDefault();
    var handle = this;
    var pointerId = e.pointerId;
    var startX = e.clientX;
    var startWidth = els.tkDrawer.getBoundingClientRect().width;
    handle.setPointerCapture(pointerId);
    els.tkDrawer.classList.add('resizing');
    document.body.classList.add('tk-drawer-resizing');
    function move(ev) {
      if (ev.pointerId !== pointerId) return;
      setDrawerWidth(startWidth + startX - ev.clientX, false);
    }
    function end(ev) {
      if (ev.pointerId !== pointerId) return;
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      els.tkDrawer.classList.remove('resizing');
      document.body.classList.remove('tk-drawer-resizing');
      setDrawerWidth(els.tkDrawer.getBoundingClientRect().width, true);
    }
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  });
  els.tkDrawerResize.addEventListener('keydown', function (e) {
    if (window.innerWidth <= 760 || state.viewMode !== 'slide' || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    setDrawerWidth(els.tkDrawer.getBoundingClientRect().width + (e.key === 'ArrowLeft' ? 24 : -24), true);
  });
  window.addEventListener('resize', applyDrawerWidth);
  if (els.tkDrawerChat) {
    els.tkDrawerChat.addEventListener('click', function () {
      if (!state.drawerTaskId) return;
      if (pageState.taskDetailVersion === 'v1') openTaskConversationWithTask(state.drawerTaskId, 'start', true);
      else handleTaskHeaderAction();
    });
    var lastRightClickToggle = 0;
    function toggleTaskStartAction() {
      pageState.taskStartLegacy = !pageState.taskStartLegacy;
      try { localStorage.setItem(TASK_START_LEGACY_KEY, pageState.taskStartLegacy ? '1' : '0'); } catch (err) { /* 本地存储不可用时仅在当前页面生效 */ }
      renderTaskStartAction();
      lastRightClickToggle = Date.now();
    }
    els.tkDrawerChat.addEventListener('pointerdown', function (e) {
      if (e.button !== 2 || pageState.taskDetailVersion === 'latest') return;
      e.preventDefault();
      toggleTaskStartAction();
    });
    els.tkDrawerChat.addEventListener('contextmenu', function (e) {
      if (pageState.taskDetailVersion === 'latest') return;
      e.preventDefault();
      if (Date.now() - lastRightClickToggle > 500) toggleTaskStartAction();
    });
  }
  els.tkDrawer.addEventListener('contextmenu', function (e) {
    if ((pageState.taskDetailVersion === 'v1') && e.target.closest('#tkDrawerChat')) return;
    if (e.target.closest('input, textarea, [contenteditable="true"]:not(#tkDrawerTitle), .tk-prop-menu')) return;
    if (!state.drawerTaskId) return;
    e.preventDefault();
  });
  /* 评论 @ mention */
  document.addEventListener('pointerdown', function (e) {
    if (pageState.mentionPanel?.classList.contains('show') && !e.target.closest('.tk-mention-panel, .tk-drawer-comment-input, .tk-comment-composer')) closeMentionPanel();
  });
  els.tkDrawerBody.addEventListener('input', function (e) {
    if (!e.target.matches('textarea')) return;
    var ta = e.target;
    var pos = ta.selectionStart;
    var text = ta.value.substring(0, pos);
    var atPos = text.lastIndexOf('@');
    if (atPos < 0) { closeMentionPanel(); return; }
    if (atPos > 0 && text[atPos - 1] !== ' ' && text[atPos - 1] !== '\n') { closeMentionPanel(); return; }
    var query = text.substring(atPos + 1);
    if (/\s/.test(query)) { closeMentionPanel(); return; }
    createMentionPanel(ta, query);
  });
  els.tkDrawerBody.addEventListener('keydown', function (e) {
    if (e.isComposing || e.keyCode === 229) return;
    if (!pageState.mentionPanel || !pageState.mentionPanel.classList.contains('show')) return;
    if (!e.target.matches('textarea')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex(pageState.mentionIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex(pageState.mentionIndex - 1);
    } else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      if (!pageState.mentionItems.length) return;
      e.preventDefault();
      insertMention(e.target, pageState.mentionItems[pageState.mentionIndex].getAttribute('data-mention-name'));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeMentionPanel();
    }
  });

  /* 属性区折叠 */
  els.tkDrawerBody.addEventListener('click', function (e) {
    var sessionTask = tkGetTasks().find(function (row) { return row.id === state.drawerTaskId; });
    var submitStageButton = e.target.closest('[data-stage-submit]');
    if (submitStageButton && sessionTask) {
      if (pageState.taskDetailVersion === 'latest' && sessionTask.status === 'in_progress'
        && sessionTask.executionStageId === submitStageButton.getAttribute('data-stage-submit')) {
        var submitted = submitTaskStage(sessionTask);
        if (submitted.ok) {
          render();
          openDrawer(sessionTask.id);
          toast(submitted.stage.name + (submitted.autoReviewed ? '已自动审核并流转' : '已完成，等待审核'), 'success');
        }
      }
      return;
    }
    var stageActionButton = e.target.closest('[data-stage-start],[data-stage-review],[data-stage-answer],[data-stage-retry]');
    if (stageActionButton && sessionTask) {
      /* 阶段行的按钮与详情底部主操作同源：轮到我时才渲染，点击后走同一条处理链路 */
      if (stageActionButton.hasAttribute('data-stage-start')) startTaskExecution(sessionTask.id);
      else if (stageActionButton.hasAttribute('data-stage-review')) openListReviewPreview(sessionTask.id, stageActionButton);
      else if (stageActionButton.hasAttribute('data-stage-answer')) { closeDrawer(); openTaskStatusConversation(sessionTask); }
      else retryBlockedTask(sessionTask);
      return;
    }
    var stageSession = e.target.closest('[data-stage-session-open]');
    if (stageSession && sessionTask) {
      var sessionId = Number(stageSession.getAttribute('data-stage-session-open'));
      var ownSession = tkGetMySessions(sessionTask).find(function (session) { return session.id === sessionId; });
      if (ownSession) openMyTaskSession(sessionTask, ownSession);
      return;
    }
    if (e.target.closest('[data-stage-view-session]')) {
      var blockedTask = tkGetTasks().find(function (row) { return row.id === state.drawerTaskId; });
      if (blockedTask?.status === 'blocked') viewBlockedTaskSession(blockedTask);
      return;
    }
    var artifactTrigger = e.target.closest('[data-artifact-preview]');
    if (artifactTrigger) {
      var artifactId = artifactTrigger.getAttribute('data-artifact-preview');
      var artTask = tkGetTasks().find(function (row) { return row.id === state.drawerTaskId; });
      if (artTask) {
        var artList = tkGetTaskArtifacts(artTask);
        var artItem = artList.find(function (a) { return a.id === artifactId; });
        if (artItem) openDocPreview(artItem);
      }
      return;
    }
    if (e.target.closest('[data-action="blocked-retry"]')) {
      var retryTask = tkGetTasks().find(function (row) { return row.id === state.drawerTaskId; });
      if (retryTask?.blockedRun) retryBlockedTask(retryTask);
      return;
    }
    var labelRemove = e.target.closest('[data-label-remove]');
    if (labelRemove && state.drawerTaskId) {
      var taskForRemove = tkGetTasks().find(function(t) { return t.id === state.drawerTaskId; });
      if (taskForRemove) updateTaskLabels(taskForRemove, (taskForRemove.labels || []).filter(function(name) { return name !== labelRemove.getAttribute('data-label-remove'); }));
      if (pageState.labelPickerMenu && pageState.labelPickerMode === 'pick') renderTaskLabelChoices(pageState.labelPickerMenu.querySelector('.tk-label-search').value);
      return;
    }
    var labelTrigger = e.target.closest('.tk-label-picker');
    if (labelTrigger) {
      if (pageState.labelPickerMenu) closeTaskLabelPicker();
      else openTaskLabelPicker(labelTrigger);
      return;
    }
    var toggle = e.target.closest('#tkDrawerPropToggle');
    if (toggle) {
      toggle.classList.toggle('collapsed');
      var list = els.tkDrawerBody.querySelector('#tkDrawerPropList');
      if (list) list.classList.toggle('collapsed');
      return;
    }
    /* 属性 Popover Picker（菜单添加到 body，避免侧边栏 overflow 裁切） */
    var display = e.target.closest('.tk-prop-display');
    if (display) {
      var propName = display.getAttribute('data-prop-name');
      var data = propPickerOptions[propName];
      var existing = document.querySelector('.tk-prop-menu.show');
      if (existing) {
        if (propName === '处理人' && e.target.closest('input')) return;
        existing.remove();
        if (propName === '处理人') return;
        return;
      }
      if (!data) return;
      var menu = document.createElement('div');
      menu.className = 'tk-prop-menu show';
      menu.setAttribute('data-prop', propName);
      menu.innerHTML = data.options.map(function (o) {
        return '<div class="tk-prop-menu-item' + (o.value === data.currentVal ? ' active' : '') + '" data-value="' + escapeHtml(o.value) + '">' + escapeHtml(o.label) + '</div>';
      }).join('');
      if (propName === '处理人') filterAssigneeOptions(menu, '.tk-prop-menu-item', '');
      menu.addEventListener('click', function (ev) {
        var item = ev.target.closest('.tk-prop-menu-item');
        if (item) {
          var prop = (propPickerOptions[menu.getAttribute('data-prop')] || {}).key;
          var val = item.getAttribute('data-value');
          if (state.drawerTaskId && prop && val) {
            var patch = {}; patch[prop] = val;
            if (prop === 'project') {
              var task = tkGetTasks().find(function (row) { return row.id === state.drawerTaskId; });
              if (task && !tkPeopleInProject(val).some(function (person) { return person.id === task.assignee; })) patch.assignee = tkPeopleInProject(val)[0]?.id || '';
            }
            tkUpdateTask(state.drawerTaskId, patch);
            render();
            openDrawer(state.drawerTaskId);
          }
          menu.remove();
        }
      });
      document.body.appendChild(menu);
      var rect = display.getBoundingClientRect();
      menu.style.top = (rect.bottom + 4) + 'px';
      menu.style.left = rect.left + 'px';
      if (propName === '处理人') {
        var propInput = display.querySelector('input');
        propInput.setAttribute('aria-expanded', 'true');
        if (e.target !== propInput) propInput.focus({ preventScroll: true });
      }
      return;
    }
    /* 开始执行按钮 */
    var playBtn = e.target.closest('[data-card-play]');
    if (playBtn) { startTaskExecution(parseInt(playBtn.getAttribute('data-card-play'), 10)); return; }
    /* 三点菜单按钮 */
    var moreBtn = e.target.closest('[data-card-more]');
    if (moreBtn) { showCardMenu(moreBtn.getAttribute('data-card-more'), moreBtn); return; }
    /* 下拉菜单项 */
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
    /* 状态胶囊按钮 */
    var flowPill = e.target.closest('[data-flow-status]');
    if (flowPill) {
      if (state.drawerTaskId) {
        tkUpdateTask(state.drawerTaskId, { status: flowPill.getAttribute('data-flow-status') });
        render();
        openDrawer(state.drawerTaskId);
      }
      return;
    }
    /* 处理人快捷选择：面板悬浮定位，不挤开内容 */
    var flowField = e.target.closest('[data-flow-prop]');
    if (flowField) {
      var existingFieldMenu = document.querySelector('.tk-flow-field-menu.show');
      if (existingFieldMenu) {
        if (e.target.closest('input')) return;
        existingFieldMenu.remove();
        return;
      }
      var fprop = flowField.getAttribute('data-flow-prop');
      var flowTask = tkGetTasks().find(function (task) { return task.id === state.drawerTaskId; });
      var fopts = fprop === 'status' ? TK_STATUSES : tkPeopleInProject(flowTask?.project);
      var fieldMenu = document.createElement('div');
      fieldMenu.className = 'tk-flow-field-menu show';
      fopts.forEach(function (o) {
        var fieldItem = document.createElement('div');
        fieldItem.className = 'tk-flow-field-menu-item';
        if (fprop === 'assignee' && o.avatar) {
          fieldItem.innerHTML = '<span class="tk-avatar-sm" style="background:' + o.color + '">' + escapeHtml(o.avatar) + '</span><span>' + escapeHtml(o.name) + '</span>';
        } else {
          fieldItem.textContent = o.name;
        }
        fieldItem.addEventListener('click', function () {
          if (state.drawerTaskId) {
            if (fprop === 'assignee') {
              pageState.flowAssigneeDraft = { taskId: state.drawerTaskId, assigneeId: o.id };
              tkUpdateTask(state.drawerTaskId, { flowAssignee: o.id });
              flowField.querySelector('.tk-flow-field-text').value = o.name;
              flowField.classList.remove('is-placeholder');
            } else {
              tkUpdateTask(state.drawerTaskId, (function (p) { var obj = {}; obj[p] = o.id; return obj; })(fprop));
              render();
              openDrawer(state.drawerTaskId);
            }
          }
          fieldMenu.remove();
          var fieldInput = flowField.querySelector('input');
          if (fieldInput) fieldInput.setAttribute('aria-expanded', 'false');
        });
        fieldMenu.appendChild(fieldItem);
      });
      if (fprop === 'assignee') filterAssigneeOptions(fieldMenu, '.tk-flow-field-menu-item', '');
      document.body.appendChild(fieldMenu);
      var fRect = flowField.getBoundingClientRect();
      fieldMenu.style.top = (fRect.bottom + 4) + 'px';
      fieldMenu.style.left = fRect.left + 'px';
      if (fprop === 'assignee') {
        var flowInput = flowField.querySelector('input');
        flowInput.setAttribute('aria-expanded', 'true');
        if (e.target !== flowInput) flowInput.focus({ preventScroll: true });
      }
      return;
    }
    /* 附件上传 */
    var dropzone = e.target.closest('#tkAttachDropzone');
    if (dropzone) {
      els.tkDrawerBody.querySelector('#tkAttachInput').click();
      return;
    }
    var attachRemove = e.target.closest('[data-attach-remove]');
    if (attachRemove) {
      attachRemove.closest('.tk-attach-item').remove();
      return;
    }
    /* 页签切换 */
    var drawerTab = e.target.closest('[data-tab]');
    if (drawerTab) {
      var tabName = drawerTab.getAttribute('data-tab');
      var tabContainer = drawerTab.parentElement;
      var contentContainer = tabContainer.parentElement;
      tabContainer.querySelectorAll('.tk-drawer-tab').forEach(function(t){t.classList.remove('active');});
      drawerTab.classList.add('active');
      contentContainer.querySelectorAll('.tk-drawer-tab-content').forEach(function(c){
        c.classList.toggle('active', c.getAttribute('data-tab-content') === tabName);
        c.hidden = c.getAttribute('data-tab-content') !== tabName;
      });
      return;
    }
    /* 流转按钮 */
    var flowBtn = e.target.closest('[data-action="flow"]');
    if (flowBtn) {
      if (state.drawerTaskId) {
        var flowTask = tkGetTasks().find(function (x) { return x.id === state.drawerTaskId; });
        if (flowTask) {
          if (!pageState.flowAssigneeDraft.assigneeId) {
            toast('请选择处理人', 'error');
            els.tkDrawerBody.querySelector('.tk-flow-field-text').focus();
            return;
          }
          var commentInput = els.tkDrawerBody.querySelector('.tk-drawer-comment-input textarea');
          var commentText = commentInput ? commentInput.value.trim() : '';
          var handoffPatch = taskStageHandoffPatch(flowTask, pageState.flowAssigneeDraft.assigneeId);
          var newComment = {
            kind: 'flow',
            authorId: tkCurrentUserId(),
            createdAt: taskCommentTimestamp(),
            fromStatus: flowTask.status,
            fromAssignee: flowTask.assignee,
            status: handoffPatch.status || flowTask.status,
            assignee: pageState.flowAssigneeDraft.assigneeId,
            text: commentText,
          };
          tkUpdateTask(state.drawerTaskId, {
            ...handoffPatch,
            comments: (flowTask.comments || []).concat(newComment),
          });
          if (commentInput) commentInput.value = '';
          closeMentionPanel();
          pageState.flowAssigneeDraft = { taskId: state.drawerTaskId, assigneeId: '' };
          render();
          openDrawer(state.drawerTaskId);
          toast('流转成功', 'success');
        }
      }
      return;
    }
    /* 点击其他区域关闭属性菜单和处理人下拉 */
    var openMenu = document.querySelector('.tk-prop-menu.show');
    if (openMenu && !e.target.closest('.tk-prop-menu') && !e.target.closest('.tk-prop-display')) {
      openMenu.remove();
    }
    var ffm = document.querySelector('.tk-flow-field-menu.show');
    if (ffm && !e.target.closest('.tk-flow-field-menu') && !e.target.closest('[data-flow-prop]')) {
      ffm.remove();
    }
  });
  els.tkDrawerBody.addEventListener('input', function (e) {
    if (e.target.matches('.tk-prop-assignee-input')) {
      var propMenu = document.querySelector('.tk-prop-menu.show');
      if (!propMenu) { e.target.closest('.tk-prop-display').click(); propMenu = document.querySelector('.tk-prop-menu.show'); }
      filterAssigneeOptions(propMenu, '.tk-prop-menu-item', e.target.value);
    } else if (e.target.matches('.tk-flow-field-text')) {
      pageState.flowAssigneeDraft = { taskId: state.drawerTaskId, assigneeId: '' };
      var flowMenu = document.querySelector('.tk-flow-field-menu.show');
      if (!flowMenu) { e.target.closest('[data-flow-prop]').click(); flowMenu = document.querySelector('.tk-flow-field-menu.show'); }
      filterAssigneeOptions(flowMenu, '.tk-flow-field-menu-item', e.target.value);
    }
  });
  els.tkDrawerBody.addEventListener('keydown', function (e) {
    if (e.target.matches('.tk-label-picker') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      if (pageState.labelPickerMenu) closeTaskLabelPicker(); else openTaskLabelPicker(e.target);
    }
    if (e.target.matches('.tk-prop-assignee-input')) chooseFirstAssignee(document.querySelector('.tk-prop-menu.show'), '.tk-prop-menu-item', e);
    if (e.target.matches('.tk-flow-field-text')) chooseFirstAssignee(document.querySelector('.tk-flow-field-menu.show'), '.tk-flow-field-menu-item', e);
  });
  els.tkDrawerBody.addEventListener('change', function (e) {
    if (!state.drawerTaskId) return;
    var sel = e.target.closest('[data-prop]');
    if (!sel) return;
    var prop = sel.getAttribute('data-prop');
    var patch = {}; patch[prop] = sel.value;
    tkUpdateTask(state.drawerTaskId, patch);
    render();
    openDrawer(state.drawerTaskId);
  });
  els.tkDrawer.addEventListener('blur', function (e) {
    if (!state.drawerTaskId) return;
    var el = e.target.closest('[data-field]');
    if (!el) return;
    var field = el.getAttribute('data-field');
    var val = el.textContent.trim();
    var t = tkGetTasks().find(function (x) { return x.id === state.drawerTaskId; });
    if (t && t[field] !== val) {
      var patch = {}; patch[field] = val;
      tkUpdateTask(state.drawerTaskId, patch);
      render();
      openDrawer(state.drawerTaskId);
    }
  }, true);

}
