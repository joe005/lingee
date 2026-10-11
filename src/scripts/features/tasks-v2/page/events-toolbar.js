import { $$ } from '../../../core/dom.js';
import { closeDisplayChoiceMenu, closeFieldSettings, openDisplayChoiceMenu, positionPopover, render, renderDisplayControls, renderFieldSettings } from './layout.js';
import { closeFilterPanel } from './menus.js';
import { pageState } from './page-state.js';
import { els, state } from './state.js';
/* 任务页 · 事件绑定 · 搜索、布局切换、显示设置（拆分自 tasks-v2/index.js，逻辑未改） */
export function bindToolbarEvents() {
  /* 搜索 */
  var enableTaskSearch = function () { els.tkSearch.removeAttribute('readonly'); };
  els.tkSearch.addEventListener('pointerdown', enableTaskSearch, { once:true });
  els.tkSearch.addEventListener('keydown', enableTaskSearch, { once:true });
  els.tkSearch.addEventListener('input', function () { state.search = this.value; render(); });

  /* 布局切换 */
  document.addEventListener('click', function (event) {
    var button = event.target.closest('#view-tasks [data-layout]');
    if (!button) return;
    event.stopPropagation();
    var layout = button.getAttribute('data-layout');
    if (!['board', 'list'].includes(layout)) return;
    state.layout = layout;
    if (state.viewMode === 'split' && layout === 'board') state.viewMode = 'slide';
    closeDisplayChoiceMenu();
    els.tkDisplayPopover.classList.add('hidden');
    els.tkDisplayBtn.setAttribute('aria-expanded', 'false');
    render();
  }, true);


  /* 显示设置 Popover */
  els.tkDisplayBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (els.tkDisplayPopover.classList.contains('hidden')) {
      els.tkToolbarNewMenu.classList.add('hidden');
      els.tkToolbarNewArrow.setAttribute('aria-expanded', 'false');
      closeFilterPanel();
      closeDisplayChoiceMenu();
      closeFieldSettings();
      els.tkDisplayPopover.classList.remove('hidden');
      els.tkDisplayBtn.classList.add('active');
      els.tkDisplayBtn.setAttribute('aria-expanded', 'true');
      renderDisplayControls();
      positionPopover(els.tkDisplayPopover, els.tkDisplayBtn, true);
    } else {
      closeDisplayChoiceMenu();
      closeFieldSettings();
      els.tkDisplayPopover.classList.add('hidden');
      els.tkDisplayBtn.classList.remove('active');
      els.tkDisplayBtn.setAttribute('aria-expanded', 'false');
    }
  });
  els.tkFieldsBtn.addEventListener('click', function () {
    closeDisplayChoiceMenu();
    var opening = els.tkFieldsPopover.classList.contains('hidden');
    if (!opening) { closeFieldSettings(); return; }
    els.tkFieldsPopover.classList.remove('hidden');
    els.tkFieldsPopover.classList.toggle('flip', els.tkDisplayPopover.getBoundingClientRect().left < 320);
    els.tkFieldsPopover.style.maxHeight = Math.max(240, window.innerHeight - els.tkDisplayPopover.getBoundingClientRect().top - 12) + 'px';
    els.tkFieldsBtn.setAttribute('aria-expanded', 'true');
    els.tkFieldsSearch.value = '';
    renderFieldSettings();
    els.tkFieldsSearch.focus({ preventScroll:true });
  });
  els.tkFieldsClose.addEventListener('click', closeFieldSettings);
  var enableFieldsSearch = function() { els.tkFieldsSearch.removeAttribute('readonly'); };
  els.tkFieldsSearch.addEventListener('pointerdown', enableFieldsSearch, { once:true });
  els.tkFieldsSearch.addEventListener('keydown', enableFieldsSearch, { once:true });
  els.tkFieldsSearch.addEventListener('input', renderFieldSettings);
  els.tkFieldsList.addEventListener('change', function(e) {
    var id = e.target.getAttribute('data-field-visible');
    if (!id || id === 'title') return;
    state.listFieldVisibility[id] = e.target.checked;
    render();
  });
  var draggedFieldId = null;
  els.tkFieldsList.addEventListener('dragstart', function(e) {
    var item = e.target.closest('.tk-fields-item');
    if (!item) return;
    draggedFieldId = item.getAttribute('data-field-id');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedFieldId);
    item.classList.add('dragging');
  });
  els.tkFieldsList.addEventListener('dragover', function(e) {
    var item = e.target.closest('.tk-fields-item');
    if (!draggedFieldId || !item || item.getAttribute('data-field-id') === draggedFieldId) return;
    e.preventDefault();
    els.tkFieldsList.querySelectorAll('.drop-before,.drop-after').forEach(function(row) { row.classList.remove('drop-before','drop-after'); });
    item.classList.add(e.clientY < item.getBoundingClientRect().top + item.offsetHeight / 2 ? 'drop-before' : 'drop-after');
  });
  els.tkFieldsList.addEventListener('drop', function(e) {
    var item = e.target.closest('.tk-fields-item');
    if (!draggedFieldId || !item) return;
    e.preventDefault();
    var targetId = item.getAttribute('data-field-id');
    if (targetId !== draggedFieldId) {
      var after = item.classList.contains('drop-after');
      state.listFieldOrder = state.listFieldOrder.filter(function(id) { return id !== draggedFieldId; });
      state.listFieldOrder.splice(state.listFieldOrder.indexOf(targetId) + (after ? 1 : 0), 0, draggedFieldId);
      renderFieldSettings();
      render();
    }
    draggedFieldId = null;
  });
  els.tkFieldsList.addEventListener('dragend', function() {
    draggedFieldId = null;
    els.tkFieldsList.querySelectorAll('.dragging,.drop-before,.drop-after').forEach(function(row) { row.classList.remove('dragging','drop-before','drop-after'); });
  });
  els.tkFieldsList.addEventListener('keydown', function(e) {
    var grip = e.target.closest('.tk-fields-grip');
    if (!grip || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    var item = grip.closest('.tk-fields-item');
    var id = item.getAttribute('data-field-id');
    var next = e.key === 'ArrowUp' ? item.previousElementSibling : item.nextElementSibling;
    if (!next || !next.classList.contains('tk-fields-item')) return;
    var targetId = next.getAttribute('data-field-id');
    state.listFieldOrder = state.listFieldOrder.filter(function(key) { return key !== id; });
    state.listFieldOrder.splice(state.listFieldOrder.indexOf(targetId) + (e.key === 'ArrowDown' ? 1 : 0), 0, id);
    renderFieldSettings();
    render();
    var moved = els.tkFieldsList.querySelector('[data-field-id="' + id + '"] .tk-fields-grip');
    if (moved) moved.focus();
  });
  els.tkGroupSelect.addEventListener('click', function () { openDisplayChoiceMenu(this, 'group'); });
  els.tkGroupSelect.addEventListener('keydown', function(e) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openDisplayChoiceMenu(this, 'group', e.key === 'ArrowDown' ? 'first' : 'last'); } });
  els.tkViewModeSelect.addEventListener('change', function () {
    state.viewMode = this.value;
    if (state.viewMode === 'split') state.layout = 'list';
    render();
  });
  els.tkSortSelect.addEventListener('click', function () { openDisplayChoiceMenu(this, 'sort'); });
  els.tkSortSelect.addEventListener('keydown', function(e) { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openDisplayChoiceMenu(this, 'sort', e.key === 'ArrowDown' ? 'first' : 'last'); } });
  els.tkSortDirection.addEventListener('click', function () {
    closeDisplayChoiceMenu();
    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    renderDisplayControls();
    render();
  });
  els.tkShowSubtasks.addEventListener('change', function () {
    state.showSubtasks = this.checked;
    render();
  });
  els.tkCardProperties.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-card-property]');
    if (!btn) return;
    var key = btn.getAttribute('data-card-property');
    state.cardProperties[key] = !state.cardProperties[key];
    renderDisplayControls();
    render();
  });
  els.tkDisplayPopover.addEventListener('click', function (e) {
    if (!e.target.closest('#tkGroupSelect,#tkSortSelect')) closeDisplayChoiceMenu();
    e.stopPropagation();
  });
  document.addEventListener('click', function () {
    closeDisplayChoiceMenu();
    if (!els.tkDisplayPopover.classList.contains('hidden')) {
      closeFieldSettings();
      els.tkDisplayPopover.classList.add('hidden');
      els.tkDisplayBtn.classList.remove('active');
      els.tkDisplayBtn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('focusin', function(e) {
    if (pageState.displayChoiceMenu && !pageState.displayChoiceMenu.contains(e.target) && e.target !== pageState.displayChoiceTrigger) closeDisplayChoiceMenu();
  });

}
