/* 新会话页视觉单独维护，业务交互继续由 composer 与 expert 模块负责。 */
import '../../styles/pages/newtask.css';
import templates from '../features/newtask-templates.js';
import { setNavActive, showView } from '../core/view.js';

/* 场景模板（与客户端一致）：模式按钮下方三张模板卡，右上「换一换」随机换一批；
   选中某个模式时只出该模式的模板，没选模式时从全部模板里取；点卡片切到对应模式并把提示词填进输入框。 */
var COUNT = 3;
var MODE_ICON = {
  '技能开发': '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 8a4 4 0 1 0 4 4"/><path d="M21 3 12 12"/>',
  '智能体开发': '<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4"/><path d="M9 13h.01M15 13h.01"/>',
  '原型探索': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M9 9v11"/>',
  '通用应用': '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5"/><path d="M12 12v9"/>',
  '苍穹应用': '<path d="m9 8-4 4 4 4"/><path d="m15 8 4 4-4 4"/><path d="m13 6-2 12"/>',
  '业务组件': '<path d="M6 4h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h9"/><circle cx="6" cy="4" r="1.5"/><circle cx="18" cy="16" r="1.5"/>'
};
var picked = [];

function esc(text) { return String(text).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function currentMode() {
  var checked = document.querySelector('#view-newtask .mode-item.checked');
  return checked ? checked.getAttribute('data-val') : '';
}
function pool() {
  var mode = currentMode();
  return mode ? templates.filter(function (row) { return row.mode === mode; }) : templates;
}
function shuffle(list) {
  var copy = list.slice();
  for (var i = copy.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = copy[i]; copy[i] = copy[j]; copy[j] = t; }
  return copy;
}
function render(refresh) {
  var grid = document.getElementById('ntTemplateGrid');
  if (!grid) return;
  var rows = pool();
  if (refresh || !picked.length || picked.some(function (row) { return rows.indexOf(row) < 0; })) {
    var others = rows.filter(function (row) { return picked.indexOf(row) < 0; });
    picked = shuffle(others.length >= COUNT ? others : rows).slice(0, COUNT);
  }
  grid.innerHTML = picked.map(function (row) {
    var index = templates.indexOf(row);
    return '<button type="button" class="nt-template-card" data-template="' + index + '" title="' + esc(row.prompt) + '">'
      + '<span class="nt-template-type"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (MODE_ICON[row.mode] || '') + '</svg>' + esc(row.mode) + '</span>'
      + '<span class="nt-template-title">' + esc(row.title) + '</span></button>';
  }).join('');
}
function applyTemplate(row) {
  var pill = document.querySelector('#view-newtask .mode-item[data-val="' + row.mode + '"]');
  if (pill && !pill.classList.contains('checked')) pill.click();
  var input = document.getElementById('composerInput');
  if (!input) return;
  input.textContent = row.prompt;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
  var range = document.createRange();
  range.selectNodeContents(input);
  range.collapse(false);
  var selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

export function init() {
  var box = document.getElementById('ntTemplates');
  if (!box) return;
  render(true);
  /* 其他页面要带模式打开新会话时发 lingee:newtask-open（detail.mode），由本页切视图和模式 */
  document.addEventListener('lingee:newtask-open', function (event) {
    var mode = event.detail && event.detail.mode;
    showView('newtask');
    setNavActive('新会话');
    var pill = mode && document.querySelector('#view-newtask .mode-item[data-val="' + mode + '"]');
    if (pill && !pill.classList.contains('checked')) pill.click();
  });
  box.addEventListener('click', function (event) {
    if (event.target.closest('[data-template-refresh]')) { render(true); return; }
    var card = event.target.closest('[data-template]');
    if (card) applyTemplate(templates[Number(card.dataset.template)]);
  });
  /* 模式按钮选中状态变化（点选、取消技能标签）后按新模式重排 */
  var bar = document.querySelector('#view-newtask .mode-bar');
  if (bar) new MutationObserver(function () { render(false); }).observe(bar, { subtree: true, attributes: true, attributeFilter: ['class'] });
}
