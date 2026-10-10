import { bindBoardEvents } from './events-board.js';
import { bindCreateEvents } from './events-create.js';
import { bindDetailEvents } from './events-detail.js';
import { bindToolbarEvents } from './events-toolbar.js';
import { bindViewEvents } from './events-views.js';
import { render, tkSetProjectListMode } from './layout.js';
import { pageState } from './page-state.js';
import { els, state } from './state.js';
/* 任务页 · 事件绑定入口（拆分自 tasks-v2/index.js，逻辑未改） */
/* ---------- 事件绑定 ---------- */
/* 原 bindEvents 按区域拆成 events-*.js，这里按原顺序依次注册 */
export function bindEvents() {
  bindToolbarEvents();
  bindCreateEvents();
  bindDetailEvents();
  bindViewEvents();
  bindBoardEvents();
}

export function openCollabTaskList() {
  if (pageState.projectListMode) tkSetProjectListMode(false);
  Object.assign(state, {
    activeViewId:'all', scope:'all', filters:[], search:'', listStatusTab:'needs',
  });
  state.selectedIds.clear();
  if (els.tkSearch) els.tkSearch.value = '';
  if (els.tkBody) render();
}
