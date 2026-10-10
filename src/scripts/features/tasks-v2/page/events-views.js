import { $$ } from '../../../core/dom.js';
import { toast } from '../../../core/toast.js';
import { showTaskConfirm } from '../confirm.js';
import { TK_STATUSES, tkCanDeleteTask, tkDeleteTask, tkDeleteView, tkGetPerson, tkGetTasks, tkGetViews, tkPeopleInProject, tkRenameView, tkUpdateTask } from '../data.js';
import { getFilteredTasks } from './filters.js';
import { closeDisplayChoiceMenu, closeFieldSettings, render } from './layout.js';
import { closeFilterPanel, closeManageViews, closeSaveView, confirmSaveView, hidePopover, openFilterPanel, openManageViews, openSaveView, renderFilterMenu, showPopover, toggleFilterValue, updateFilterButton } from './menus.js';
import { pageState } from './page-state.js';
import { renderViewBar } from './render.js';
import { DEFAULT_LIST_FIELD_ORDER, els, state } from './state.js';
import { closeDrawer } from './subtasks.js';
import { escapeHtml } from './utils.js';
/* 任务页 · 事件绑定 · 筛选面板、排序、全选、视图标签与视图管理、批量操作（拆分自 tasks-v2/index.js，逻辑未改） */
export function closeViewMenu() {
  els.tkViewMenu.classList.add('hidden');
  els.tkViewAdd.setAttribute('aria-expanded', 'false');
}
export function bindViewEvents() {
  /* 筛选面板 */
  els.tkFilterBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (els.tkFilterPanel.classList.contains('hidden')) openFilterPanel();
    else closeFilterPanel();
  });
  els.tkFilterPanel.addEventListener('click', function (e) { e.stopPropagation(); });
  els.tkFilterPanelBody.addEventListener('mouseover', function (e) {
    var btn = e.target.closest('[data-filter-section]');
    if (btn && btn.getAttribute('data-filter-section') !== pageState.activeFilterSection) {
      pageState.activeFilterSection = btn.getAttribute('data-filter-section');
      renderFilterMenu();
    }
  });
  els.tkFilterPanelBody.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-filter-section]');
    if (btn) { pageState.activeFilterSection = btn.getAttribute('data-filter-section'); renderFilterMenu(); return; }
    if (e.target.closest('#tkFilterReset')) {
      state.filters = []; updateFilterButton(); render(); renderFilterMenu();
    }
  });
  els.tkFilterSubmenu.addEventListener('click', function (e) {
    var option = e.target.closest('[data-filter-value]');
    if (option) { toggleFilterValue(pageState.activeFilterSection, option.getAttribute('data-filter-value')); }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#tkFilterPanel') && !e.target.closest('#tkFilterBtn')) closeFilterPanel();
  });
  els.tkFilterChips.addEventListener('click', function (e) {
    var chipBtn = e.target.closest('[data-chip-idx]');
    if (chipBtn) {
      var idx = parseInt(chipBtn.getAttribute('data-chip-idx'), 10);
      state.filters.splice(idx, 1);
      updateFilterButton();
      render();
      return;
    }
    if (e.target.id === 'tkChipClearAll' || e.target.closest('#tkChipClearAll')) {
      state.filters = [];
      updateFilterButton();
      render();
    }
  });

  /* 列表表头排序 */
  els.tkListHead.addEventListener('click', function (e) {
    var th = e.target.closest('th[data-sort]');
    if (th) {
      var sortKey = th.getAttribute('data-sort');
      if (state.sortBy === sortKey) state.sortDir = state.sortDir === 'asc' ? 'desc' : state.sortDir === 'desc' ? 'none' : 'asc';
      else { state.sortBy = sortKey; state.sortDir = 'asc'; }
      render();
    }
  });

  /* 全选 */
  els.tkCheckAll.addEventListener('change', function () {
    var tasks = getFilteredTasks();
    if (this.checked) tasks.forEach(function (t) { state.selectedIds.add(t.id); });
    else tasks.forEach(function (t) { state.selectedIds.delete(t.id); });
    render();
  });

  /* 视图标签栏 */
  els.tkViewAdd.addEventListener('click', function (e) {
    e.stopPropagation();
    var opening = els.tkViewMenu.classList.contains('hidden');
    els.tkViewMenu.classList.toggle('hidden', !opening);
    els.tkViewAdd.setAttribute('aria-expanded', String(opening));
    closeFilterPanel();
    closeDisplayChoiceMenu();
    closeFieldSettings();
    els.tkDisplayPopover.classList.add('hidden');
    els.tkDisplayBtn.classList.remove('active');
    els.tkDisplayBtn.setAttribute('aria-expanded', 'false');
  });
  els.tkViewMenu.addEventListener('click', function (e) { e.stopPropagation(); });
  els.tkViewMenuNew.addEventListener('click', function () { closeViewMenu(); openSaveView(); });
  els.tkViewManage.addEventListener('click', function () { closeViewMenu(); openManageViews(); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.tk-view-action')) closeViewMenu(); });
  els.tkViewTabs.addEventListener('click', function (e) {
    var statusTab = e.target.closest('[data-list-status]');
    if (statusTab) {
      state.listStatusTab = statusTab.getAttribute('data-list-status');
      state.selectedIds.clear();
      closeDrawer();
      render();
      return;
    }
    var delBtn = e.target.closest('[data-del-view]');
    if (delBtn) {
      e.stopPropagation();
      var viewId = delBtn.getAttribute('data-del-view');
      var view = tkGetViews().find(function (item) { return item.id === viewId; });
      showTaskConfirm('确定删除视图「' + (view?.name || '') + '」吗？', function () {
        tkDeleteView(viewId);
        if (state.activeViewId === viewId) { state.activeViewId = 'all'; state.scope = 'all'; }
        render();
        toast('删除成功', 'success');
      });
      return;
    }
    var tab = e.target.closest('.list-page-tab');
    if (tab) {
      var viewId = tab.getAttribute('data-view-id');
      state.activeViewId = viewId;
      var view = tkGetViews().find(function (v) { return v.id === viewId; });
      if (view && view.scope) {
        state.scope = view.scope;
      }
      if (view && !view.builtin) {
        state.filters = (view.filters || []).map(function (f) { return Object.assign({}, f); });
        state.groupBy = view.groupBy || 'status';
        state.viewMode = ['slide','full','split'].includes(view.viewMode) ? view.viewMode : 'slide';
        state.sortBy = view.sortBy || 'updatedAt';
        state.sortDir = view.sortDir || 'desc';
        state.layout = view.layout || 'board';
        state.showSubtasks = view.showSubtasks !== false;
        state.cardProperties = Object.assign({}, state.cardProperties, view.cardProperties || {});
        if (Array.isArray(view.listFieldOrder)) state.listFieldOrder = Array.from(new Set(view.listFieldOrder.filter(function(id) { return DEFAULT_LIST_FIELD_ORDER.includes(id); }))).concat(DEFAULT_LIST_FIELD_ORDER.filter(function(id) { return !view.listFieldOrder.includes(id); }));
        if (view.listFieldVisibility) state.listFieldVisibility = Object.assign({ labels:false }, view.listFieldVisibility);
        $$('[data-layout]', els.tkLayoutToggle).forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-layout') === state.layout); });
      }
      updateFilterButton();
      render();
    }
  });
  els.tkViewTabs.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.list-page-tab')) { e.preventDefault(); e.target.click(); }
  });

  /* 保存视图弹窗 */
  els.tkSaveViewClose.addEventListener('click', closeSaveView);
  els.tkSaveViewCancel.addEventListener('click', closeSaveView);
  els.tkSaveViewConfirm.addEventListener('click', confirmSaveView);
  els.tkSaveViewOverlay.addEventListener('click', function (e) { if (e.target === this) closeSaveView(); });

  /* 管理视图弹窗 */
  els.tkManageViewsClose.addEventListener('click', closeManageViews);
  els.tkManageViewsCancel.addEventListener('click', closeManageViews);
  els.tkManageViewsOverlay.addEventListener('click', function (e) { if (e.target === this) closeManageViews(); });
  els.tkManageList.addEventListener('click', function (e) {
    var delBtn = e.target.closest('[data-del-view]');
    if (delBtn) {
      var viewId = delBtn.getAttribute('data-del-view');
      var view = tkGetViews().find(function (item) { return item.id === viewId; });
      showTaskConfirm('确定删除视图「' + (view?.name || '') + '」吗？', function () {
        tkDeleteView(viewId);
        if (state.activeViewId === viewId) { state.activeViewId = 'all'; state.scope = 'all'; }
        openManageViews();
        render();
        toast('删除成功', 'success');
      });
      return;
    }
    var renameBtn = e.target.closest('[data-rename-view]');
    if (renameBtn) {
      var viewId = renameBtn.getAttribute('data-rename-view');
      var view = tkGetViews().find(function (v) { return v.id === viewId; });
      if (view) {
        var newName = prompt('输入新名称', view.name);
        if (newName && newName.trim()) { tkRenameView(viewId, newName.trim()); openManageViews(); renderViewBar(); toast('重命名成功', 'success'); }
      }
    }
  });

  /* 批量操作 */
  els.tkBulkClear.addEventListener('click', function () { state.selectedIds.clear(); render(); });
  $$('[data-bulk]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var action = this.getAttribute('data-bulk');
      if (action === 'status') { showPopover(els.tkBulkStatusMenu, this); return; }
      if (action === 'assignee') {
        var selectedTasks = tkGetTasks().filter(function (task) { return state.selectedIds.has(task.id); });
        var candidates = selectedTasks.length ? tkPeopleInProject(selectedTasks[0].project).filter(function (person) {
          return selectedTasks.every(function (task) { return tkPeopleInProject(task.project).some(function (member) { return member.id === person.id; }); });
        }) : [];
        els.tkBulkAssigneeMenu.innerHTML = candidates.map(function (person) { return '<div class="tk-popover-item" data-assignee="' + person.id + '">' + escapeHtml(person.name) + '</div>'; }).join('') || '<div class="tk-popover-item">所选任务没有共同的项目成员</div>';
        showPopover(els.tkBulkAssigneeMenu, this);
        return;
      }
      if (action === 'delete') {
        var delCount = state.selectedIds.size;
        if (!delCount) return;
        var ids = Array.from(state.selectedIds).filter(function (id) { return tkCanDeleteTask(tkGetTasks().find(function (task) { return task.id === id; })); });
        var blocked = delCount - ids.length;
        if (!ids.length) { hidePopover(); toast('所选任务均已开始或已经历阶段，不能删除', 'warning'); return; }
        showTaskConfirm('确定删除选中的 ' + ids.length + ' 个任务吗？' + (blocked ? '另有 ' + blocked + ' 个已开始或已经历阶段的任务不会被删除。' : ''), function () {
          ids.forEach(function (id) { tkDeleteTask(id); });
          state.selectedIds.clear();
          hidePopover();
          render();
          toast('成功删除 ' + ids.length + ' 个任务' + (blocked ? '，' + blocked + ' 个不可删除已保留' : ''), 'success');
        });
      }
    });
  });
  els.tkBulkStatusMenu.addEventListener('click', function (e) {
    var item = e.target.closest('[data-status]');
    if (item) {
      var status = item.getAttribute('data-status');
      var statusName = (TK_STATUSES.find(function (s) { return s.id === status; }) || {}).name || status;
      var updateCount = state.selectedIds.size;
      els.tkBulkStatusMenu.innerHTML = TK_STATUSES.map(function (s) {
        return '<div class="tk-popover-item" data-status="' + s.id + '">' + escapeHtml(s.name) + '</div>';
      }).join('');
      state.selectedIds.forEach(function (id) { tkUpdateTask(id, { status: status }); });
      hidePopover();
      render();
      toast('成功更新 ' + updateCount + ' 个任务状态为「' + statusName + '」', 'success');
    }
  });
  els.tkBulkAssigneeMenu.addEventListener('click', function (e) {
    var item = e.target.closest('[data-assignee]');
    if (item) {
      var assignee = item.getAttribute('data-assignee');
      var assigneeName = tkGetPerson(assignee).name;
      var assignCount = state.selectedIds.size;
      state.selectedIds.forEach(function (id) { var task = tkGetTasks().find(function (row) { return row.id === id; }); if (task && tkPeopleInProject(task.project).some(function (person) { return person.id === assignee; })) tkUpdateTask(id, { assignee: assignee }); });
      hidePopover();
      render();
      toast('成功指派 ' + assignCount + ' 个任务给「' + assigneeName + '」', 'success');
    }
  });

}
