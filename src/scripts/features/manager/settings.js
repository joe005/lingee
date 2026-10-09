import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { mgrCanManageProject, mgrProjectById, mgrSetProjectText } from './data.js';
import { mgrEsc } from './utils.js';
/* 管理 · 项目设置页：项目目标、项目指令就地编辑，开发项目另有代码仓库卡片（仓库与分支的编辑弹窗在 projects.js）。
   页面本身是 #mgr-panel-projects 里与项目列表、项目详情并列的一屏，返回回到项目详情。 */

var projectId = null;
var editing = '';          /* 'goal' | 'instruction' | '' */
var goalOpen = false;
var CLAMP_CHARS = 90;

var ICONS = {
  goal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>',
  instruction: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m8 10 3 2-3 2"/><path d="M13 15h3"/></svg>',
  repo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10"/><path d="M18 10c0 4-6 3-12 7"/></svg>',
  edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  chevron: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
};

function project() { return projectId ? mgrProjectById(projectId) : null; }
function editBtn(kind, label) {
  return '<button type="button" class="mgr-set-edit" data-mgr-set-edit="' + kind + '" aria-label="编辑' + label + '">' + ICONS.edit + '编辑</button>';
}
function cardHead(kind, title, action) {
  return '<div class="mgr-set-card-head"><h2>' + ICONS[kind] + title + '</h2>' + (action || '') + '</div>';
}
function editor(kind, value, placeholder, label) {
  return '<textarea class="mgr-set-textarea" id="mgrSetInput" rows="6" maxlength="2000" aria-label="' + label + '" placeholder="' + placeholder + '">' + mgrEsc(value) + '</textarea>' +
    '<div class="mgr-set-actions"><button type="button" class="mgr-btn mgr-btn--ghost" data-mgr-set-cancel>取消</button>' +
    '<button type="button" class="mgr-btn mgr-btn--primary" data-mgr-set-save="' + kind + '">保存</button></div>';
}
function goalCard(p, canEdit) {
  var text = p.goal || p.desc || '';
  var head = cardHead('goal', '目标', canEdit && editing !== 'goal' ? editBtn('goal', '项目目标') : '');
  if (editing === 'goal') return head + '<label class="mgr-set-label" for="mgrSetInput">项目目标</label>' + editor('goal', text, '为什么建立这个项目，需要达成什么经营结果', '项目目标');
  var long = text.length > CLAMP_CHARS || text.split('\n').length > 3;
  return head + '<div class="mgr-set-label">项目目标</div>' +
    (text
      ? '<div class="mgr-set-text mgr-set-text--box"><div class="mgr-set-clamp' + (long && !goalOpen ? ' is-clamped' : '') + '">' + mgrEsc(text) + '</div>' +
        (long ? '<button type="button" class="mgr-set-more" data-mgr-set-more aria-expanded="' + goalOpen + '">' + (goalOpen ? '收起' : '展开') + ICONS.chevron + '</button>' : '') + '</div>'
      : '<div class="mgr-set-empty">暂未填写项目目标</div>');
}
function instructionCard(p, canEdit) {
  var text = p.instruction || '';
  var head = cardHead('instruction', '项目指令', canEdit && editing !== 'instruction' ? editBtn('instruction', '项目指令') : '');
  if (editing === 'instruction') return head + editor('instruction', text, '项目内所有对话共同遵循的全局指令', '项目指令');
  return head + (text ? '<div class="mgr-set-text">' + mgrEsc(text) + '</div>' : '<div class="mgr-set-empty">暂未设置项目指令</div>');
}
function repoCard(p, canEdit) {
  return cardHead('repo', '代码仓库', canEdit ? '<button type="button" class="mgr-set-edit" data-mgr-repo-edit aria-label="编辑代码仓库">' + ICONS.edit + '编辑</button>' : '') +
    '<dl class="mgr-set-kv"><dt>Git 地址</dt><dd>' + (p.repo ? mgrEsc(p.repo) : '<span class="mgr-set-empty">未设置</span>') + '</dd>' +
    '<dt>基准分支</dt><dd>' + (p.repo && p.baseBranch ? mgrEsc(p.baseBranch) : '<span class="mgr-set-empty">未设置</span>') + '</dd></dl>';
}
function render() {
  var p = project();
  if (!p) return;
  var canEdit = mgrCanManageProject(p);
  $('#mgrSetProjectName').textContent = p.name;
  $('#mgrSetBody').innerHTML = '<section class="mgr-set-card">' + goalCard(p, canEdit) + '</section>' +
    '<section class="mgr-set-card">' + instructionCard(p, canEdit) + '</section>' +
    (p.containsRd || p.repo ? '<section class="mgr-set-card">' + repoCard(p, canEdit) + '</section>' : '') +
    (canEdit ? '' : '<p class="mgr-set-note">只有项目负责人、项目管理员或系统管理员可以修改项目设置。</p>');
  var input = $('#mgrSetInput');
  if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
}

export function openSettings(id) {
  if (!mgrProjectById(id)) { toast('未找到该项目'); return false; }
  projectId = id;
  editing = '';
  goalOpen = false;
  $('#mgrProjDetail').classList.add('hidden');
  $('#mgrProjSettings').classList.remove('hidden');
  render();
  var scroll = $('#mgrProjSettings .mgr-scroll');
  if (scroll) scroll.scrollTop = 0;
  return true;
}
export function hideSettings() {
  projectId = null;
  editing = '';
  var page = $('#mgrProjSettings');
  if (page) page.classList.add('hidden');
}
function back() {
  var id = projectId;
  hideSettings();
  if (mgrProjectById(id)) $('#mgrProjDetail').classList.remove('hidden');
  var btn = $('#mgrProjDetail [data-mgr-settings]');
  if (btn) btn.focus();
}
function save(kind) {
  var p = project();
  if (!p) return;
  if (!mgrCanManageProject(p)) { toast('项目权限已变化，无法修改项目设置', 'warning'); editing = ''; render(); return; }
  var value = $('#mgrSetInput').value.trim();
  if (kind === 'goal' && !value) { toast('项目目标不能为空', 'error'); $('#mgrSetInput').focus(); return; }
  var patch = kind === 'goal' ? { goal: value } : { instruction: value };
  editing = '';
  if (!mgrSetProjectText(p, patch)) { toast('保存失败，请重试', 'error'); editing = kind; render(); return; }
  toast(kind === 'goal' ? '项目目标已保存' : '项目指令已保存', 'success');
}

export function initManagerSettings() {
  var page = $('#mgrProjSettings');
  page.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-mgr-set-back]')) { back(); return; }
    var edit = t.closest('[data-mgr-set-edit]');
    if (edit) { editing = edit.getAttribute('data-mgr-set-edit'); render(); return; }
    if (t.closest('[data-mgr-set-cancel]')) { editing = ''; render(); return; }
    var sv = t.closest('[data-mgr-set-save]');
    if (sv) { save(sv.getAttribute('data-mgr-set-save')); return; }
    if (t.closest('[data-mgr-set-more]')) { goalOpen = !goalOpen; render(); }
  });
  page.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && editing) { e.preventDefault(); editing = ''; render(); }
  });
  /* 仓库保存、重命名等改动后刷新设置页 */
  document.addEventListener('lingee:mgr-projects-changed', function () {
    if (!page.classList.contains('hidden') && project()) render();
  });
}
