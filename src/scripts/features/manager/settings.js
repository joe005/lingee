import { $ } from '../../core/dom.js';
import { DELETE_ICON } from '../../core/delete-icon.js';
import { toast } from '../../core/toast.js';
import { mgrCanManageProject, mgrProjectById, mgrProjectKnowledge, mgrProjectPages, mgrSetProjectPages, mgrSetProjectText } from './data.js';
import { mgrEsc } from './utils.js';
/* 管理 · 空间设置页（对齐产品）：目标、空间首页板块显示设置、空间指令三张卡片，各自「编辑」后就地修改、保存或取消；
   研发任务行尾提供研发协作设置入口（仓库与分支的编辑弹窗在 projects.js）。
   首页板块编辑态：预置模板一键覆盖、拖动（或 Alt + ↑↓）调序、开关显示、添加 MCP / 知识板块。
   页面本身是 #mgr-panel-projects 里与空间列表、空间详情并列的一屏，返回回到空间详情。 */

var projectId = null;
var editing = '';          /* 'goal' | 'instruction' | 'blocks' | '' */
var goalOpen = false;
var blocksDraft = null;    /* 首页板块编辑中的草稿 */
var addMenu = '';          /* 添加板块菜单：'' | 'root' | 'mcp' | 'kb' */
var dragId = null;
var CLAMP_CHARS = 90;

var BLOCK_PRESETS = [
  { id: 'exec', name: '管理例会', pages: ['plan', 'feed'], extra: [{ kind: 'kb', name: '会议纪要', source: '会议纪要' }] },
  { id: 'budget', name: '预算目标', pages: ['plan', 'feed'] },
  { id: 'talent', name: '人才布局', pages: ['plan', 'feed'] },
  { id: 'devtest', name: '协作开发', pages: ['rd', 'feed'] },
];
var MCP_APPS = ['金蝶云苍穹 MCP', '设备巡检维修 MCP', '企业微信 MCP'];

var ICONS = {
  goal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>',
  instruction: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m8 10 3 2-3 2"/><path d="M13 15h3"/></svg>',
  repo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10"/><path d="M18 10c0 4-6 3-12 7"/></svg>',
  edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  blocks: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-6h6v6"/></svg>',
  grip: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>',
  plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  next: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  trash: DELETE_ICON,
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
  var head = cardHead('goal', '目标', canEdit && editing !== 'goal' ? editBtn('goal', '空间目标') : '');
  if (editing === 'goal') return head + '<label class="mgr-set-label" for="mgrSetInput">空间目标</label>' + editor('goal', text, '为什么建立这个空间，需要达成什么经营结果', '空间目标');
  var long = text.length > CLAMP_CHARS || text.split('\n').length > 3;
  return head + '<div class="mgr-set-label">空间目标</div>' +
    (text
      ? '<div class="mgr-set-text mgr-set-text--box"><div class="mgr-set-clamp' + (long && !goalOpen ? ' is-clamped' : '') + '">' + mgrEsc(text) + '</div>' +
        (long ? '<button type="button" class="mgr-set-more" data-mgr-set-more aria-expanded="' + goalOpen + '">' + (goalOpen ? '收起' : '展开') + ICONS.chevron + '</button>' : '') + '</div>'
      : '<div class="mgr-set-empty">暂未填写空间目标</div>');
}
function instructionCard(p, canEdit) {
  var text = p.instruction || '';
  var head = cardHead('instruction', '空间指令', canEdit && editing !== 'instruction' ? editBtn('instruction', '空间指令') : '');
  if (editing === 'instruction') return head + editor('instruction', text, '空间内所有对话共同遵循的全局指令', '空间指令');
  return head + (text ? '<div class="mgr-set-text">' + mgrEsc(text) + '</div>' : '<div class="mgr-set-empty mgr-set-empty--center">还未配置空间指令，点右上角「编辑」补一条。</div>');
}
/* ---------- 空间首页板块显示设置 ---------- */
function blockTag(x) {
  var label = !x.custom ? '模板' : x.kind === 'mcp' ? 'MCP' : x.kind === 'kb' ? '知识' : '自定义';
  return '<span class="mgr-pg-tag' + (x.custom ? ' mgr-pg-tag--custom' : '') + '">' + label + '</span>';
}
function addMenuHtml(p) {
  if (!addMenu) return '';
  if (addMenu === 'root') {
    return '<div class="mgr-blk-menu" role="menu">' +
      '<button type="button" class="mgr-blk-menu-item" role="menuitem" data-mgr-blk-menu="mcp"><span><b>MCP</b><small>挂载一个 MCP App</small></span>' + ICONS.next + '</button>' +
      '<button type="button" class="mgr-blk-menu-item" role="menuitem" data-mgr-blk-menu="kb"><span><b>项目知识库</b><small>展示一份知识文件</small></span>' + ICONS.next + '</button></div>';
  }
  var options = addMenu === 'mcp' ? MCP_APPS : mgrProjectKnowledge(p.id).map(function (k) { return k.title; });
  return '<div class="mgr-blk-menu" role="menu"><div class="mgr-blk-menu-title">' + (addMenu === 'mcp' ? '选择 MCP App' : '选择知识文件') + '</div>' +
    (options.length
      ? options.map(function (o) { return '<button type="button" class="mgr-blk-menu-item" role="menuitem" data-mgr-blk-add="' + mgrEsc(o) + '"><span>' + mgrEsc(o) + '</span></button>'; }).join('')
      : '<p class="mgr-blk-menu-empty">空间知识库里还没有文件</p>') + '</div>';
}
function blockSettingsButton(block, canEdit) {
  if (block.id !== 'rd' || !canEdit) return '';
  return '<button type="button" class="mgr-blk-settings" data-mgr-repo-edit aria-label="研发协作设置" data-tooltip="研发协作设置"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8.00019 0.666667C8.16438 0.666671 8.32767 0.672143 8.48912 0.682943C9.41568 0.745107 10.0816 1.43855 10.3101 2.22201C10.5097 2.90834 11.2148 3.31615 11.9084 3.14583L12.0555 3.11458C12.7993 2.98441 13.6339 3.22994 14.1076 3.94076C14.3271 4.27017 14.5209 4.61868 14.6857 4.98307C15.0033 5.68521 14.809 6.44431 14.3635 6.96289L14.271 7.0638C13.7589 7.58298 13.7589 8.41702 14.271 8.9362L14.3635 9.03646C14.8092 9.55463 15.0031 10.3136 14.6857 11.0156C14.5208 11.3802 14.3272 11.729 14.1076 12.0586C13.6025 12.8165 12.6874 13.0453 11.909 12.8542C11.2153 12.6836 10.5097 13.0909 10.3101 13.7773C10.0816 14.5604 9.41577 15.2544 8.48977 15.3171C8.3281 15.328 8.16473 15.3333 8.00019 15.3333C7.83529 15.3333 7.67135 15.328 7.50931 15.3171C6.64115 15.2583 6.0021 14.6449 5.73783 13.9232L5.6903 13.7773C5.49071 13.0909 4.78503 12.6837 4.09135 12.8542C3.31269 13.0453 2.39738 12.8163 1.89213 12.0579C1.67309 11.7291 1.4792 11.3813 1.31466 11.0176C0.975692 10.2682 1.21954 9.4537 1.73002 8.9362L1.81987 8.83529C2.23964 8.31405 2.20974 7.55046 1.73002 7.0638C1.21967 6.54588 0.976279 5.73129 1.31531 4.98177C1.47978 4.61825 1.67321 4.27015 1.89213 3.94141C2.39752 3.18293 3.31336 2.95409 4.092 3.14583C4.78556 3.31606 5.49074 2.90898 5.6903 2.22266C5.91823 1.43891 6.58381 0.744956 7.51061 0.682943C7.67234 0.672128 7.83574 0.666667 8.00019 0.666667ZM8.00019 2C7.86568 2 7.73207 2.00483 7.5998 2.01367C7.34013 2.03104 7.07437 2.23697 6.97025 2.59505C6.57123 3.96712 5.16169 4.78116 3.77364 4.4401C3.43039 4.35563 3.13675 4.47799 3.0015 4.68099C2.82236 4.95004 2.66449 5.23431 2.53015 5.53125C2.45644 5.69418 2.48681 5.93217 2.67924 6.1276C3.67093 7.13344 3.70211 8.73069 2.77234 9.77344L2.67924 9.8724C2.48681 10.0675 2.45596 10.3055 2.5295 10.4681C2.66391 10.7652 2.8222 11.0498 3.0015 11.319C3.13693 11.5221 3.43027 11.6442 3.77364 11.5599C5.16169 11.2188 6.57123 12.0329 6.97025 13.4049L7.01647 13.5319C7.14049 13.8112 7.37207 13.9709 7.59915 13.9863C7.73159 13.9953 7.86559 14 8.00019 14C8.13443 14 8.26782 13.9953 8.39993 13.9863C8.65982 13.9687 8.92573 13.7623 9.03014 13.4043C9.42942 12.0326 10.8389 11.2188 12.2267 11.5599C12.5697 11.6441 12.863 11.5219 12.9982 11.319C13.178 11.0492 13.3362 10.7639 13.4709 10.4661C13.5349 10.3243 13.5196 10.1252 13.3862 9.94727L13.3218 9.8724C12.2976 8.83404 12.2976 7.16596 13.3218 6.1276L13.3862 6.05273C13.5197 5.87443 13.5351 5.6747 13.4709 5.53255C13.3363 5.23492 13.1779 4.94998 12.9982 4.68034C12.8631 4.47758 12.5702 4.3557 12.2274 4.4401C10.8395 4.7812 9.42942 3.96744 9.03014 2.5957L8.98391 2.4681C8.85958 2.1884 8.62737 2.02898 8.39993 2.01367C8.26788 2.00484 8.13446 2 8.00019 2ZM8.00019 5.33333C9.47286 5.33343 10.6669 6.5273 10.6669 8C10.6669 9.4727 9.47286 10.6666 8.00019 10.6667C6.52743 10.6667 5.33353 9.47276 5.33353 8C5.33353 6.52724 6.52743 5.33333 8.00019 5.33333ZM8.00019 6.66667C7.26381 6.66667 6.66686 7.26362 6.66686 8C6.66686 8.73638 7.26381 9.33333 8.00019 9.33333C8.73649 9.33323 9.33352 8.73632 9.33352 8C9.33352 7.26368 8.73649 6.66677 8.00019 6.66667Z"/></svg></button>';
}
function blocksCard(p, canEdit) {
  if (editing !== 'blocks') {
    var shown = mgrProjectPages(p).filter(function (x) { return x.enabled; });
    return cardHead('blocks', '空间首页板块显示设置', canEdit ? editBtn('blocks', '空间首页板块显示设置') : '') +
      '<ol class="mgr-blk-list">' + shown.map(function (x, i) {
        return '<li class="mgr-blk-row"><span class="mgr-blk-num">' + (i + 1) + '</span><span class="mgr-pg-name">' + mgrEsc(x.name) + '</span>' + blockTag(x) + blockSettingsButton(x, canEdit) + '</li>';
      }).join('') + '</ol>';
  }
  var enabledCount = blocksDraft.filter(function (x) { return x.enabled; }).length;
  var rows = blocksDraft.map(function (x, i) {
    var lastOne = x.enabled && enabledCount === 1;
    return '<li class="mgr-blk-row is-editing" draggable="true" data-mgr-blk="' + mgrEsc(x.id) + '">' +
      '<button type="button" class="mgr-blk-grip" data-mgr-blk-grip="' + mgrEsc(x.id) + '" aria-label="调整「' + mgrEsc(x.name) + '」顺序，Alt + 方向键移动">' + ICONS.grip + '</button>' +
      '<span class="mgr-blk-num">' + (i + 1) + '</span><span class="mgr-pg-name">' + mgrEsc(x.name) + '</span>' + blockTag(x) + blockSettingsButton(x, canEdit) +
      (x.custom ? '<button type="button" class="mgr-pg-btn" data-mgr-blk-del="' + mgrEsc(x.id) + '" aria-label="删除板块' + mgrEsc(x.name) + '">' + ICONS.trash + '</button>' : '') +
      '<input type="checkbox" class="mgr-tn-switch mgr-blk-switch" data-mgr-blk-toggle="' + mgrEsc(x.id) + '" aria-label="在空间首页显示' + mgrEsc(x.name) + '"' + (x.enabled ? ' checked' : '') +
      (lastOne ? ' disabled title="至少保留一个板块"' : '') + '></li>';
  }).join('');
  return cardHead('blocks', '空间首页板块显示设置', '<div class="mgr-set-actions mgr-set-actions--head"><button type="button" class="mgr-btn mgr-btn--ghost" data-mgr-set-cancel>取消</button>' +
      '<button type="button" class="mgr-btn mgr-btn--primary" data-mgr-blk-save>保存</button></div>') +
    '<div class="mgr-blk-presets"><span class="mgr-blk-presets-label">预置模板</span><span class="mgr-blk-presets-hint">点选模板会用它的板块组合覆盖当前设置</span>' +
    '<div class="mgr-blk-preset-chips">' + BLOCK_PRESETS.map(function (t) {
      return '<button type="button" class="mgr-pe-tpl" data-mgr-blk-preset="' + t.id + '">' + mgrEsc(t.name) + '</button>';
    }).join('') + '</div></div>' +
    '<ol class="mgr-blk-list" aria-label="空间首页板块">' + rows + '</ol>' +
    '<div class="mgr-blk-add"><button type="button" class="mgr-btn mgr-btn--outline" data-mgr-blk-add-open aria-haspopup="menu" aria-expanded="' + !!addMenu + '">' + ICONS.plus + '添加板块</button>' + addMenuHtml(p) + '</div>';
}
function applyPreset(p, presetId) {
  var preset = BLOCK_PRESETS.find(function (t) { return t.id === presetId; });
  if (!preset) return;
  var builtins = mgrProjectPages(p).filter(function (x) { return !x.custom; });
  var wanted = preset.pages.filter(function (id) { return builtins.some(function (b) { return b.id === id; }); });
  if (!wanted.length) wanted = [builtins[0].id];
  var ordered = wanted.map(function (id) { return Object.assign({}, builtins.find(function (b) { return b.id === id; }), { enabled: true }); })
    .concat(builtins.filter(function (b) { return wanted.indexOf(b.id) < 0; }).map(function (b) { return Object.assign({}, b, { enabled: false }); }));
  (preset.extra || []).forEach(function (x, i) {
    ordered.push({ id: 'c' + Date.now().toString(36) + i, name: x.name, enabled: true, custom: true, kind: x.kind, source: x.source });
  });
  blocksDraft = ordered;
  toast('已套用「' + preset.name + '」，保存后生效');
}
function moveBlock(id, delta) {
  var i = blocksDraft.findIndex(function (x) { return x.id === id; });
  var j = i + delta;
  if (i < 0 || j < 0 || j >= blocksDraft.length) return false;
  var tmp = blocksDraft[i]; blocksDraft[i] = blocksDraft[j]; blocksDraft[j] = tmp;
  return true;
}
function saveBlocks() {
  var p = project();
  if (!p) return;
  if (!mgrCanManageProject(p)) { toast('空间权限已变化，无法修改空间设置', 'warning'); editing = ''; render(); return; }
  if (!blocksDraft.some(function (x) { return x.enabled; })) { toast('至少保留一个板块', 'warning'); return; }
  if (!mgrSetProjectPages(p, blocksDraft)) { toast('保存失败，请重试', 'error'); return; }
  editing = '';
  blocksDraft = null;
  addMenu = '';
  toast('空间首页板块已保存', 'success');
  render();
}
function render() {
  var p = project();
  if (!p) return;
  var canEdit = mgrCanManageProject(p);
  $('#mgrSetBody').innerHTML = '<section class="mgr-set-card">' + goalCard(p, canEdit) + '</section>' +
    '<section class="mgr-set-card">' + blocksCard(p, canEdit) + '</section>' +
    '<section class="mgr-set-card">' + instructionCard(p, canEdit) + '</section>' +
    (canEdit ? '' : '<p class="mgr-set-note">只有空间负责人、空间管理员或系统管理员可以修改空间设置。</p>');
  var input = $('#mgrSetInput');
  if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
}

export function openSettings(id) {
  if (!mgrProjectById(id)) { toast('未找到该空间'); return false; }
  projectId = id;
  editing = '';
  goalOpen = false;
  blocksDraft = null;
  addMenu = '';
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
  blocksDraft = null;
  addMenu = '';
  var page = $('#mgrProjSettings');
  if (page) page.classList.add('hidden');
}
function back() {
  var id = projectId;
  hideSettings();
  if (mgrProjectById(id)) $('#mgrProjDetail').classList.remove('hidden');
  /* 详情隐藏期间改过的内容（首页板块、目标等）在显示后补一次刷新 */
  if (mgrProjectById(id)) document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { back: id } }));
  var btn = $('#mgrProjDetail [data-mgr-settings]');
  if (btn) btn.focus();
}
function save(kind) {
  var p = project();
  if (!p) return;
  if (!mgrCanManageProject(p)) { toast('空间权限已变化，无法修改空间设置', 'warning'); editing = ''; render(); return; }
  var value = $('#mgrSetInput').value.trim();
  if (kind === 'goal' && !value) { toast('空间目标不能为空', 'error'); $('#mgrSetInput').focus(); return; }
  var patch = kind === 'goal' ? { goal: value } : { instruction: value };
  editing = '';
  if (!mgrSetProjectText(p, patch)) { toast('保存失败，请重试', 'error'); editing = kind; render(); return; }
  toast(kind === 'goal' ? '空间目标已保存' : '空间指令已保存', 'success');
}

function cancelEdit() { editing = ''; blocksDraft = null; addMenu = ''; render(); }
function blockAction(t) {
  var p = project();
  if (!p || editing !== 'blocks') return false;
  if (t.closest('[data-mgr-blk-save]')) { saveBlocks(); return true; }
  var preset = t.closest('[data-mgr-blk-preset]');
  if (preset) { applyPreset(p, preset.getAttribute('data-mgr-blk-preset')); addMenu = ''; render(); return true; }
  if (t.closest('[data-mgr-blk-add-open]')) { addMenu = addMenu ? '' : 'root'; render(); return true; }
  var sub = t.closest('[data-mgr-blk-menu]');
  if (sub) { addMenu = sub.getAttribute('data-mgr-blk-menu'); render(); return true; }
  var add = t.closest('[data-mgr-blk-add]');
  if (add) {
    var source = add.getAttribute('data-mgr-blk-add');
    var kind = addMenu === 'mcp' ? 'mcp' : 'kb';
    if (blocksDraft.some(function (x) { return x.custom && x.kind === kind && x.source === source; })) { toast('已添加过这个板块', 'warning'); return true; }
    blocksDraft.push({ id: 'c' + Date.now().toString(36), name: source, enabled: true, custom: true, kind: kind, source: source });
    addMenu = '';
    render();
    return true;
  }
  var del = t.closest('[data-mgr-blk-del]');
  if (del) {
    var id = del.getAttribute('data-mgr-blk-del');
    blocksDraft = blocksDraft.filter(function (x) { return x.id !== id; });
    if (!blocksDraft.some(function (x) { return x.enabled; })) blocksDraft[0].enabled = true;
    render();
    return true;
  }
  if (addMenu && !t.closest('.mgr-blk-add')) { addMenu = ''; render(); }
  return false;
}

export function initManagerSettings() {
  var page = $('#mgrProjSettings');
  page.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-mgr-set-back]')) { back(); return; }
    var edit = t.closest('[data-mgr-set-edit]');
    if (edit) {
      editing = edit.getAttribute('data-mgr-set-edit');
      var p = project();
      blocksDraft = editing === 'blocks' && p ? mgrProjectPages(p).map(function (x) { return Object.assign({}, x); }) : null;
      addMenu = '';
      render();
      return;
    }
    if (t.closest('[data-mgr-set-cancel]')) { cancelEdit(); return; }
    var sv = t.closest('[data-mgr-set-save]');
    if (sv) { save(sv.getAttribute('data-mgr-set-save')); return; }
    if (t.closest('[data-mgr-set-more]')) { goalOpen = !goalOpen; render(); return; }
    blockAction(t);
  });
  page.addEventListener('change', function (e) {
    var cb = e.target.closest('[data-mgr-blk-toggle]');
    if (!cb || !blocksDraft) return;
    var id = cb.getAttribute('data-mgr-blk-toggle');
    blocksDraft = blocksDraft.map(function (x) { return x.id === id ? Object.assign({}, x, { enabled: cb.checked }) : x; });
    render();
    var again = $('#mgrSetBody [data-mgr-blk-toggle="' + id + '"]');
    if (again) again.focus();
  });
  /* 拖动调序：在行上拖放；键盘用 Alt + ↑ / ↓ 移动当前行 */
  page.addEventListener('dragstart', function (e) {
    var row = e.target.closest && e.target.closest('[data-mgr-blk]');
    if (!row || !blocksDraft) return;
    dragId = row.getAttribute('data-mgr-blk');
    row.classList.add('is-dragging');
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); }
  });
  page.addEventListener('dragover', function (e) {
    if (!dragId || !e.target.closest || !e.target.closest('[data-mgr-blk]')) return;
    e.preventDefault();
  });
  page.addEventListener('drop', function (e) {
    var row = e.target.closest && e.target.closest('[data-mgr-blk]');
    if (!dragId || !row) return;
    e.preventDefault();
    var from = blocksDraft.findIndex(function (x) { return x.id === dragId; });
    var to = blocksDraft.findIndex(function (x) { return x.id === row.getAttribute('data-mgr-blk'); });
    if (from >= 0 && to >= 0 && from !== to) blocksDraft.splice(to, 0, blocksDraft.splice(from, 1)[0]);
    dragId = null;
    render();
  });
  page.addEventListener('dragend', function () { if (dragId) { dragId = null; render(); } });
  page.addEventListener('keydown', function (e) {
    var grip = e.target.closest && e.target.closest('[data-mgr-blk-grip]');
    if (grip && e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      var id = grip.getAttribute('data-mgr-blk-grip');
      if (moveBlock(id, e.key === 'ArrowUp' ? -1 : 1)) {
        render();
        var again = $('#mgrSetBody [data-mgr-blk-grip="' + id + '"]');
        if (again) again.focus();
      }
      return;
    }
    if (e.key === 'Escape' && addMenu) { e.preventDefault(); addMenu = ''; render(); return; }
    if (e.key === 'Escape' && editing) { e.preventDefault(); cancelEdit(); }
  });
  /* 仓库保存、重命名等改动后刷新设置页（首页板块编辑中不打断草稿） */
  document.addEventListener('lingee:mgr-projects-changed', function () {
    if (!page.classList.contains('hidden') && project() && editing !== 'blocks') render();
  });
}
