import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { mgrCanManageProject, mgrProjectById, mgrProjectPages, mgrSetProjectPages, mgrSetProjectText } from './data.js';
import { mgrEsc } from './utils.js';
/* 管理 · 项目设置页：项目目标、项目指令就地编辑，功能页面（详情页签的开关、顺序、自定义页面）即改即存，开发项目另有代码仓库卡片（仓库与分支的编辑弹窗在 projects.js）。
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
  pages: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18"/><path d="M9 9v12"/></svg>',
  up: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>',
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
function pagesCard(p, canEdit) {
  var pages = mgrProjectPages(p);
  var enabledCount = pages.filter(function (x) { return x.enabled; }).length;
  var dis = canEdit ? '' : ' disabled';
  var rows = pages.map(function (x, i) {
    var lastOne = x.enabled && enabledCount === 1;
    return '<li class="mgr-pg-row"><span class="mgr-pg-name">' + mgrEsc(x.name) + (x.custom ? '<span class="mgr-pg-tag">自定义</span>' : '') + '</span>' +
      '<button type="button" class="mgr-pg-btn" data-mgr-pg-move="up" data-mgr-pg="' + mgrEsc(x.id) + '" aria-label="上移' + mgrEsc(x.name) + '"' + (!canEdit || i === 0 ? ' disabled' : '') + '>' + ICONS.up + '</button>' +
      '<button type="button" class="mgr-pg-btn mgr-pg-btn--down" data-mgr-pg-move="down" data-mgr-pg="' + mgrEsc(x.id) + '" aria-label="下移' + mgrEsc(x.name) + '"' + (!canEdit || i === pages.length - 1 ? ' disabled' : '') + '>' + ICONS.up + '</button>' +
      (x.custom
        ? '<button type="button" class="mgr-pg-btn" data-mgr-pg-del="' + mgrEsc(x.id) + '" aria-label="删除' + mgrEsc(x.name) + '"' + dis + '>' + ICONS.trash + '</button>'
        : '<span class="mgr-pg-gap" aria-hidden="true"></span>') +
      '<input type="checkbox" class="mgr-pg-check" data-mgr-pg-toggle="' + mgrEsc(x.id) + '" aria-label="显示' + mgrEsc(x.name) + '页签"' + (x.enabled ? ' checked' : '') +
      (!canEdit || lastOne ? ' disabled' : '') + (lastOne ? ' title="至少保留一个页面"' : '') + '></li>';
  }).join('');
  return cardHead('pages', '功能页面') + '<ul class="mgr-pg-list" aria-label="功能页面">' + rows + '</ul>' +
    '<div class="mgr-pg-add"><input type="text" class="mgr-pg-input" id="mgrPgName" maxlength="12" placeholder="输入自定义页面名称" aria-label="自定义页面名称"' + dis + '>' +
    '<button type="button" class="mgr-btn mgr-btn--ghost mgr-pg-add-btn" data-mgr-pg-add' + dis + '>添加自定义页面</button></div>' +
    '<p class="mgr-set-note mgr-pg-hint">关闭后项目详情页不再显示对应页签，至少保留一个页面；可调整页签顺序，也可添加自定义页面。</p>';
}
function render() {
  var p = project();
  if (!p) return;
  var canEdit = mgrCanManageProject(p);
  $('#mgrSetProjectName').textContent = p.name;
  $('#mgrSetBody').innerHTML = '<section class="mgr-set-card">' + goalCard(p, canEdit) + '</section>' +
    '<section class="mgr-set-card">' + instructionCard(p, canEdit) + '</section>' +
    '<section class="mgr-set-card">' + pagesCard(p, canEdit) + '</section>' +
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
  /* 详情隐藏期间改过的内容（功能页面、目标等）在显示后补一次刷新 */
  if (mgrProjectById(id)) document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { back: id } }));
  var btn = $('#mgrProjDetail [data-mgr-settings]');
  if (btn) btn.focus();
}
/* 功能页面：即改即存，保存失败回滚并提示 */
function savePages(pages, okMsg) {
  var p = project();
  if (!p) return;
  if (!mgrCanManageProject(p)) { toast('项目权限已变化，无法修改项目设置', 'warning'); render(); return; }
  if (!pages.some(function (x) { return x.enabled; })) { toast('至少保留一个页面', 'warning'); render(); return; }
  if (!mgrSetProjectPages(p, pages)) { toast('保存失败，请重试', 'error'); render(); return; }
  if (okMsg) toast(okMsg, 'success');
}
function pageAction(t) {
  var p = project();
  if (!p) return false;
  var pages = mgrProjectPages(p);
  var idxOf = function (id) { return pages.findIndex(function (x) { return x.id === id; }); };
  var move = t.closest('[data-mgr-pg-move]');
  if (move) {
    var i = idxOf(move.getAttribute('data-mgr-pg')), j = i + (move.getAttribute('data-mgr-pg-move') === 'up' ? -1 : 1);
    if (i < 0 || j < 0 || j >= pages.length) return true;
    var tmp = pages[i]; pages[i] = pages[j]; pages[j] = tmp;
    savePages(pages);
    var again = $('#mgrSetBody [data-mgr-pg="' + move.getAttribute('data-mgr-pg') + '"][data-mgr-pg-move="' + move.getAttribute('data-mgr-pg-move') + '"]');
    if (again && !again.disabled) again.focus();
    return true;
  }
  var del = t.closest('[data-mgr-pg-del]');
  if (del) {
    var k = idxOf(del.getAttribute('data-mgr-pg-del'));
    if (k < 0) return true;
    var name = pages[k].name;
    pages.splice(k, 1);
    savePages(pages, '已删除自定义页面：' + name);
    return true;
  }
  if (t.closest('[data-mgr-pg-add]')) { addPage(p, pages); return true; }
  return false;
}
function addPage(p, pages) {
  var input = $('#mgrPgName');
  var name = input.value.trim();
  if (!name) { toast('请输入自定义页面名称', 'warning'); input.focus(); return; }
  if (pages.some(function (x) { return x.name === name; })) { toast('已有同名页面', 'warning'); input.focus(); return; }
  pages.push({ id: 'c' + Date.now().toString(36), name: name, enabled: true, custom: true });
  savePages(pages, '已添加自定义页面：' + name);
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
    if (t.closest('[data-mgr-set-more]')) { goalOpen = !goalOpen; render(); return; }
    pageAction(t);
  });
  page.addEventListener('change', function (e) {
    var cb = e.target.closest('[data-mgr-pg-toggle]');
    var p = project();
    if (!cb || !p) return;
    var id = cb.getAttribute('data-mgr-pg-toggle');
    savePages(mgrProjectPages(p).map(function (x) { return x.id === id ? Object.assign({}, x, { enabled: cb.checked }) : x; }));
  });
  page.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.id === 'mgrPgName') {
      e.preventDefault();
      var p = project();
      if (p) addPage(p, mgrProjectPages(p));
      return;
    }
    if (e.key === 'Escape' && editing) { e.preventDefault(); editing = ''; render(); }
  });
  /* 仓库保存、重命名等改动后刷新设置页 */
  document.addEventListener('lingee:mgr-projects-changed', function () {
    if (!page.classList.contains('hidden') && project()) render();
  });
}
