import { readDefaultScope } from '../../collab/default-scope.js';
import { ldIsDevProject } from '../../collab/local-dev.js';
import { WS_DEFAULT_FILTER, WS_DEFAULT_NAME, wsScopeName } from '../../../core/workspace-tree.js';
import { tkProjectsForCurrentUser, tkVisibleWorkspaces } from '../data.js';
import { filterListStatus, getFilteredTasks } from './filters.js';
import { render } from './layout.js';
import { updateFilterButton } from './menus.js';
import { state } from './state.js';
import { escapeHtml } from './utils.js';
/* 任务页 · 空间切换：工具栏左侧空间切换，列表和看板共用。
   与「筛选」里的「空间」是同一份条件（state.filters 里 field 为 project 的项），这里选一个空间即替换为单选；
   在筛选里多选时按钮显示「N 个空间」。下拉数量与当前列表页签一致，看板统计全部可见状态。 */

var CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4 10-11"/></svg>';

var CARET = '<svg class="tk-space-caret" width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg>';

function selectedWorkspace() { var f = state.filters.find(function (x) { return x.field === 'workspaceId'; }); return f ? f.value : ''; }
function selectedSpaces() { return state.filters.filter(function (f) { return f.field === 'project'; }).map(function (f) { return f.value; }); }

/* 仅放开空间条件，保留权限、关键词及其他过滤；列表还需应用当前状态页签。 */
function spaceCountTasks(){
  var tasks=getFilteredTasks('project');
  return state.layout==='list'?filterListStatus(tasks):tasks.filter(function(task){return task.status!=='cancelled';});
}

/* 可选空间：仅开发空间；按任务数从多到少，选中的排前面 */
function spaceOptions() {
  var tasks = spaceCountTasks();
  var picked = selectedSpaces();
  return tkProjectsForCurrentUser().map(function (project) {
    return { id:project.id, name:project.name, count:tasks.filter(function (task) { return task.project === project.id; }).length, dev:ldIsDevProject(project) };
  }).filter(function (row) { return row.dev; })
    .sort(function (a, b) { return (picked.includes(b.id) - picked.includes(a.id)) || (b.count - a.count) || a.name.localeCompare(b.name, 'zh'); });
}

/* 协作开发顶部的空间 / 工作区切换读写同一份筛选条件：project（单选）+ workspaceId。
   范围值：'' 为默认工作区（筛选值 __default，即没有归属工作区的任务）或工作区 ID；看不到的工作区一律退回默认工作区。 */
function wsFilterValue(project, wsId) {
  if (wsId && project && tkVisibleWorkspaces(project).some(function (row) { return row.ws.id === wsId; })) return wsId;
  return WS_DEFAULT_FILTER;
}
function setWsFilter(project, wsId) {
  state.filters = state.filters.filter(function (f) { return f.field !== 'workspaceId'; });
  var value = wsFilterValue(project, wsId);
  if (value) state.filters.push({ field:'workspaceId', op:'eq', value:value });
}
function ensureSpaceScope() {
  var available = tkProjectsForCurrentUser().filter(ldIsDevProject);
  var picked = selectedSpaces();
  var current = picked.length === 1 ? available.find(function (p) { return p.id === picked[0]; }) : null;
  if (current) {
    var ws = selectedWorkspace();
    var wanted = ws === WS_DEFAULT_FILTER ? '' : ws;
    if (wsFilterValue(current, wanted) !== ws) setWsFilter(current, wanted);
    return;
  }
  var preferred = readDefaultScope();
  var project = available.find(function (p) { return p.id === preferred?.project; }) || available[0];
  state.filters = state.filters.filter(function (f) { return f.field !== 'project' && f.field !== 'workspaceId'; });
  if (!project) return;
  state.filters.push({field:'project',op:'eq',value:project.id});
  setWsFilter(project, preferred?.project === project.id ? preferred.ws : '');
}
export function getSpaceScope() {
  ensureSpaceScope();
  var picked = selectedSpaces(), ws = selectedWorkspace();
  var project = picked.length === 1 ? picked[0] : '';
  return { project: project, ws: !project || ws === WS_DEFAULT_FILTER ? '' : ws };
}
/* wsId：'' 默认工作区或工作区 ID */
export function setSpaceScope(projectId, wsId) {
  state.filters = state.filters.filter(function (f) { return f.field !== 'project' && f.field !== 'workspaceId'; });
  if (projectId) {
    state.filters.push({ field:'project', op:'eq', value:projectId });
    setWsFilter(tkProjectsForCurrentUser().find(function (p) { return p.id === projectId; }), wsId || '');
  }
  closePopup();
  updateFilterButton();
  render();
}

export function updateSpaceButton() {
  ensureSpaceScope();
  var label = document.getElementById('tkSpaceLabel'), btn = document.getElementById('tkSpaceBtn');
  if (!label || !btn) return;
  var picked = selectedSpaces();
  var pickedProject = picked.length === 1 ? tkProjectsForCurrentUser().find(function (p) { return p.id === picked[0]; }) : null;
  var scopeWs = getSpaceScope().ws;
  var name = pickedProject ? (pickedProject.name || '空间') + (tkVisibleWorkspaces(pickedProject).length || scopeWs ? ' › ' + wsScopeName(pickedProject, scopeWs) : '') : '';
  label.textContent = !picked.length ? '暂无可用空间' : picked.length === 1 ? name : picked.length + ' 个空间';
  btn.title = label.textContent;
  btn.classList.toggle('has-filters', picked.length > 0);
  var popup=document.getElementById('tkSpacePopup');
  if(popup&&!popup.hidden)renderOptions();
  document.dispatchEvent(new Event('lingee:tk-space-changed'));
}

/* 选中某个有工作区的空间后，在它下面列出工作区；选工作区即同时限定空间和工作区 */
function workspaceRows(projectId) {
  var project = tkProjectsForCurrentUser().find(function (p) { return p.id === projectId; });
  var rows = project ? tkVisibleWorkspaces(project) : [];
  if (!rows.length) return '';
  var picked = getSpaceScope().ws;
  /* 默认工作区与其他工作区平级 */
  rows = [{ ws: { id: '', name: WS_DEFAULT_NAME }, depth: 1 }].concat(rows);
  return rows.map(function (r) {
    var on = r.ws.id === picked;
    return '<button type="button" role="option" class="tk-space-ws" style="--ws-depth:' + r.depth + '" aria-selected="' + on + '" data-tk-ws="' + escapeHtml(r.ws.id) + '"><span class="tk-space-option-label" title="' + escapeHtml(r.ws.name) + '"><span class="tk-space-option-name">' + escapeHtml(r.ws.name) + '</span></span><b>' + (on ? CHECK : '') + '</b></button>';
  }).join('');
}

function renderOptions() {
  var q = document.getElementById('tkSpaceSearch').value.trim().toLocaleLowerCase();
  var picked = selectedSpaces();
  var rows = spaceOptions().filter(function (row) { return !q || row.name.toLocaleLowerCase().includes(q); });
  document.getElementById('tkSpaceOptions').innerHTML = (rows.length ? rows.map(function (row) {
    var on = picked.length === 1 && picked[0] === row.id;
    return '<button type="button" role="option" aria-selected="' + on + '" data-tk-space="' + escapeHtml(row.id) + '"><span class="tk-space-option-label" title="' + escapeHtml(row.name) + '"><span class="tk-space-option-name">' + escapeHtml(row.name) + '</span><small>（' + row.count + '）</small></span><b>' + (on && !workspaceRows(row.id) ? CHECK : '') + '</b></button>' + (on ? workspaceRows(row.id) : '');
  }).join('') : '<p>没有匹配的空间</p>');
}

function closePopup() {
  var popup = document.getElementById('tkSpacePopup'), btn = document.getElementById('tkSpaceBtn');
  if (popup) popup.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
function openPopup() {
  var popup = document.getElementById('tkSpacePopup'), btn = document.getElementById('tkSpaceBtn');
  document.getElementById('tkSpaceSearch').value = '';
  renderOptions();
  popup.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  var rect = btn.getBoundingClientRect();
  popup.style.top = (rect.bottom + 4) + 'px';
  popup.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - popup.offsetWidth - 8)) + 'px';
  document.getElementById('tkSpaceSearch').focus();
}
function pickSpace(id) {
  state.filters = state.filters.filter(function (f) { return f.field !== 'project' && f.field !== 'workspaceId'; });
  if (id) state.filters.push({ field:'project', op:'eq', value:id });
  var project = id ? tkProjectsForCurrentUser().find(function (p) { return p.id === id; }) : null;
  if (project) setWsFilter(project, '');
  var cascade = !!project && tkVisibleWorkspaces(project).length > 0;
  if (cascade) renderOptions(); else closePopup();
  updateFilterButton();
  render();
}
function pickWorkspace(id) {
  var picked = selectedSpaces();
  setWsFilter(picked.length === 1 ? tkProjectsForCurrentUser().find(function (p) { return p.id === picked[0]; }) : null, id);
  closePopup();
  updateFilterButton();
  render();
}

export function initSpaceFilter() {
  var btn = document.getElementById('tkSpaceBtn');
  if (!btn) return;
  if (!btn.querySelector('.tk-space-caret')) btn.insertAdjacentHTML('beforeend', CARET);
  updateSpaceButton();
  btn.addEventListener('click', function () {
    if (document.getElementById('tkSpacePopup').hidden) openPopup(); else closePopup();
  });
  document.getElementById('tkSpaceSearch').addEventListener('input', renderOptions);
  document.getElementById('tkSpaceOptions').addEventListener('click', function (e) {
    var wsOption = e.target.closest('[data-tk-ws]');
    if (wsOption) { pickWorkspace(wsOption.getAttribute('data-tk-ws')); return; }
    var option = e.target.closest('[data-tk-space]');
    if (option) {
      var sid = option.getAttribute('data-tk-space');
      /* 再点已选空间：保留空间、清掉工作区 */
      if (sid && selectedSpaces().length === 1 && selectedSpaces()[0] === sid && selectedWorkspace() !== WS_DEFAULT_FILTER) { pickWorkspace(''); return; }
      pickSpace(sid);
    }
  });
  document.addEventListener('click', function (e) {
    var popup = document.getElementById('tkSpacePopup');
    if (popup && !popup.hidden && !e.target.closest('#tkSpacePopup, #tkSpaceBtn')) closePopup();
  });
  document.addEventListener('keydown', function (e) {
    var popup = document.getElementById('tkSpacePopup');
    if (e.key === 'Escape' && popup && !popup.hidden) { e.stopPropagation(); closePopup(); btn.focus(); }
  }, true);
  window.addEventListener('resize', closePopup);
}
