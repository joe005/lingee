import { ldIsDevProject } from '../../collab/local-dev.js';
import { tkProjectsForCurrentUser } from '../data.js';
import { getFilteredTasks } from './filters.js';
import { render } from './layout.js';
import { updateFilterButton } from './menus.js';
import { state } from './state.js';
import { escapeHtml } from './utils.js';
/* 任务页 · 空间切换：工具栏左侧「全部空间 ▾」，列表和看板共用。
   与「筛选」里的「空间」是同一份条件（state.filters 里 field 为 project 的项），这里选一个空间即替换为单选；
   在筛选里多选时按钮显示「N 个空间」。页签计数、协作开发徽标按同一口径随之变化，视图状态随 render 一起保存。 */

var CARET = '<svg class="tk-space-caret" width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg>';

function selectedSpaces() { return state.filters.filter(function (f) { return f.field === 'project'; }).map(function (f) { return f.value; }); }

/* 可选空间：开发空间，以及当前条件下有任务的空间；按任务数从多到少，选中的排前面 */
function spaceOptions() {
  var tasks = getFilteredTasks('project');
  var picked = selectedSpaces();
  return tkProjectsForCurrentUser().map(function (project) {
    return { id:project.id, name:project.name, count:tasks.filter(function (task) { return task.project === project.id; }).length, dev:ldIsDevProject(project) };
  }).filter(function (row) { return row.dev || row.count || picked.includes(row.id); })
    .sort(function (a, b) { return (picked.includes(b.id) - picked.includes(a.id)) || (b.count - a.count) || a.name.localeCompare(b.name, 'zh'); });
}

export function updateSpaceButton() {
  var label = document.getElementById('tkSpaceLabel'), btn = document.getElementById('tkSpaceBtn');
  if (!label || !btn) return;
  var picked = selectedSpaces();
  var name = picked.length === 1 ? (tkProjectsForCurrentUser().find(function (p) { return p.id === picked[0]; })?.name || '空间') : '';
  label.textContent = !picked.length ? '全部空间' : picked.length === 1 ? name : picked.length + ' 个空间';
  btn.title = label.textContent;
  btn.classList.toggle('has-filters', picked.length > 0);
}

function renderOptions() {
  var q = document.getElementById('tkSpaceSearch').value.trim().toLocaleLowerCase();
  var picked = selectedSpaces();
  var rows = spaceOptions().filter(function (row) { return !q || row.name.toLocaleLowerCase().includes(q); });
  var all = '<button type="button" role="option" aria-selected="' + !picked.length + '" data-tk-space=""><span>全部空间</span><small>' + getFilteredTasks('project').length + '</small><b>' + (picked.length ? '' : '✓') + '</b></button>';
  document.getElementById('tkSpaceOptions').innerHTML = (q ? '' : all) + (rows.length ? rows.map(function (row) {
    var on = picked.length === 1 && picked[0] === row.id;
    return '<button type="button" role="option" aria-selected="' + on + '" data-tk-space="' + escapeHtml(row.id) + '"><span title="' + escapeHtml(row.name) + '">' + escapeHtml(row.name) + '</span><small>' + row.count + '</small><b>' + (on ? '✓' : '') + '</b></button>';
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
  state.filters = state.filters.filter(function (f) { return f.field !== 'project'; });
  if (id) state.filters.push({ field:'project', op:'eq', value:id });
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
    var option = e.target.closest('[data-tk-space]');
    if (option) pickSpace(option.getAttribute('data-tk-space'));
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
