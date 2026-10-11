import { renderExpertChips } from '../../expert/chips.js';
import { TEAMS, set_activePick } from '../../expert/store.js';
import { TK_LABELS, tkCurrentUserId, tkProjectById } from '../data.js';
import { persistTaskLabelCatalog, taskLabelCatalog } from './detail-panel.js';
import { closeModalAssigneeMenu, closeModalLabelPicker, closeTaskModal, openModalAssigneeMenu, openModalLabelPicker, openTaskModal, refreshFormAssignees, renderModalAssigneeTrigger, renderModalLabelOptions, renderModalLabelPicker, tkMcAgentSendMsg, tkMcSetMode, tkRenderMoreMenu } from './form-modal.js';
import { openImportModal, saveTask } from './import-excel.js';
import { closeDisplayChoiceMenu, closeFieldSettings } from './layout.js';
import { closeFilterPanel } from './menus.js';
import { pageState } from './page-state.js';
import { els } from './state.js';
import { chooseFirstAssignee, filterAssigneeOptions } from './utils.js';
/* 任务页 · 事件绑定 · 新建任务（列头 + 弹窗）（拆分自 tasks-v2/index.js，逻辑未改） */
export function bindCreateEvents() {
  /* 新建任务（列头 + 模态弹窗） */
  els.tkToolbarNew.addEventListener('click', function () { openTaskModal(null); });
  els.tkToolbarNewArrow.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = !els.tkToolbarNewMenu.classList.contains('hidden');
    if (!open) {
      closeFilterPanel();
      closeDisplayChoiceMenu();
      closeFieldSettings();
      els.tkDisplayPopover.classList.add('hidden');
      els.tkDisplayBtn.classList.remove('active');
      els.tkDisplayBtn.setAttribute('aria-expanded', 'false');
    }
    els.tkToolbarNewMenu.classList.toggle('hidden', open);
    els.tkToolbarNewArrow.setAttribute('aria-expanded', String(!open));
  });
  els.tkImportExcel.addEventListener('click', function () {
    els.tkToolbarNewMenu.classList.add('hidden');
    els.tkToolbarNewArrow.setAttribute('aria-expanded', 'false');
    openImportModal();
  });
  document.addEventListener('click', function (e) {
    if (els.tkToolbarNewMenu && !els.tkToolbarNewMenu.classList.contains('hidden') && !els.tkToolbarNewGroup.contains(e.target)) {
      els.tkToolbarNewMenu.classList.add('hidden');
      els.tkToolbarNewArrow.setAttribute('aria-expanded', 'false');
    }
  });
  els.tkModalClose.addEventListener('click', closeTaskModal);
  els.tkModalSave.addEventListener('click', function () {
    if (!els.tkMcAgentPanel.classList.contains('hidden')) tkMcAgentSendMsg();
    else saveTask();
  });
  els.tkFormProject.addEventListener('change', function () {
    refreshFormAssignees(tkCurrentUserId());
  });
  var moreDD = document.getElementById('tkMcMoreFields');
  if (moreDD) {
    var moreMenu = document.getElementById('tkMcMoreMenu');
    var moreChip = moreDD.querySelector('[data-chip]');
    function closeMoreMenu(){ moreDD.classList.remove('open'); if (moreMenu) moreMenu.style.display='none'; }
    moreChip?.addEventListener('click', function(e){
      e.stopPropagation();
      if (moreDD.classList.contains('open')) { closeMoreMenu(); return; }
      moreDD.classList.add('open');
      if (!moreMenu) return;
      var rect = moreChip.getBoundingClientRect();
      document.body.appendChild(moreMenu);
      moreMenu.style.position='fixed';
      moreMenu.style.zIndex='260';
      moreMenu.style.display='block';
      var w = moreMenu.offsetWidth || 148;
      moreMenu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8)) + 'px';
      moreMenu.style.top = (rect.bottom + 4) + 'px';
    });
    moreMenu?.addEventListener('click', function(e){
      var item = e.target.closest('[data-field]'); if (!item) return;
      var f = document.getElementById(item.getAttribute('data-field'));
      if (f) { if (f.id === 'tkFormAssignee') document.getElementById('tkMcAssigneeTrigger').hidden = false; else f.hidden = false; tkRenderMoreMenu(); }
      closeMoreMenu();
    });
    document.addEventListener('click', function(e){ if (moreDD.classList.contains('open') && !moreDD.contains(e.target) && !(moreMenu && moreMenu.contains(e.target))) closeMoreMenu(); });
  }
  var assigneeTrigger = document.getElementById('tkMcAssigneeTrigger');
  assigneeTrigger.addEventListener('click', openModalAssigneeMenu);
  document.addEventListener('click', function (e) {
    var option = e.target.closest('.tk-mc-assignee-menu [data-modal-assignee]');
    if (option) {
      els.tkFormAssignee.value = option.getAttribute('data-modal-assignee');
      renderModalAssigneeTrigger();
      closeModalAssigneeMenu();
      assigneeTrigger.focus();
    } else if (pageState.modalAssigneeMenu && !e.target.closest('.tk-mc-assignee-menu, #tkMcAssigneeTrigger')) closeModalAssigneeMenu();
  });
  document.addEventListener('input', function (e) {
    if (pageState.modalAssigneeMenu && e.target.matches('.tk-mc-assignee-search')) filterAssigneeOptions(pageState.modalAssigneeMenu, '[data-modal-assignee]', e.target.value);
  });
  document.addEventListener('keydown', function (e) {
    if (!pageState.modalAssigneeMenu) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModalAssigneeMenu(); assigneeTrigger.focus(); }
    else if (e.target.matches('.tk-mc-assignee-search')) chooseFirstAssignee(pageState.modalAssigneeMenu, '[data-modal-assignee]', e);
  });
  window.addEventListener('scroll', function (e) {
    if (pageState.modalAssigneeMenu && !pageState.modalAssigneeMenu.contains(e.target)) closeModalAssigneeMenu();
  }, true);
  window.addEventListener('resize', closeModalAssigneeMenu);
  var modalLabelTrigger = document.getElementById('tkMcLabelPicker');
  modalLabelTrigger.addEventListener('click', function (e) {
    var remove = e.target.closest('[data-modal-label-remove]');
    if (remove) {
      e.stopPropagation();
      pageState.modalLabelSelection = pageState.modalLabelSelection.filter(function (name) { return name !== remove.getAttribute('data-modal-label-remove'); });
      renderModalLabelPicker();
      renderModalLabelOptions(pageState.modalLabelPopover?.querySelector('.tk-label-search')?.value || '');
      return;
    }
    openModalLabelPicker();
  });
  modalLabelTrigger.addEventListener('keydown', function (e) {
    if (e.target === modalLabelTrigger && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openModalLabelPicker(); }
  });
  document.addEventListener('input', function (e) {
    if (pageState.modalLabelPopover && e.target === pageState.modalLabelPopover.querySelector('.tk-label-search')) renderModalLabelOptions(e.target.value);
  });
  document.addEventListener('click', function (e) {
    if (!pageState.modalLabelPopover) return;
    var option = e.target.closest('.tk-mc-label-popover [data-modal-label-option], .tk-mc-label-popover [data-modal-label-create]');
    if (option) {
      var name = option.getAttribute('data-modal-label-option') || option.getAttribute('data-modal-label-create');
      if (option.hasAttribute('data-modal-label-create') && !taskLabelCatalog().includes(name)) { TK_LABELS.push(name); persistTaskLabelCatalog(); }
      pageState.modalLabelSelection = pageState.modalLabelSelection.includes(name) ? pageState.modalLabelSelection.filter(function (item) { return item !== name; }) : pageState.modalLabelSelection.concat(name);
      renderModalLabelPicker();
      renderModalLabelOptions(pageState.modalLabelPopover.querySelector('.tk-label-search').value);
    } else if (!e.target.closest('.tk-mc-label-popover, #tkMcLabelPicker')) closeModalLabelPicker();
  });
  document.addEventListener('keydown', function (e) {
    if (!pageState.modalLabelPopover) return;
    if (e.key === 'Escape') { e.stopPropagation(); closeModalLabelPicker(); modalLabelTrigger.focus(); }
    if (e.key === 'Enter' && e.target === pageState.modalLabelPopover.querySelector('.tk-label-search')) {
      e.preventDefault();
      pageState.modalLabelPopover.querySelector('.tk-label-option')?.click();
    }
  });
  els.tkModalOverlay.addEventListener('click', function (e) { if (e.target === this) closeTaskModal(); });
  els.tkModalOverlay.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!els.tkMcAgentPanel.classList.contains('hidden')) tkMcAgentSendMsg();
      else saveTask();
    }
    if (e.key === 'Escape') closeTaskModal();
  });
  if (els.tkMcExpand) els.tkMcExpand.addEventListener('click', function () { els.tkModalOverlay.classList.toggle('tk-mc-fullscreen'); });
  if (els.tkMcAgent) els.tkMcAgent.addEventListener('click', function () { tkMcSetMode(els.tkMcAgentPanel.classList.contains('hidden') ? 'agent' : 'manual'); });

}
