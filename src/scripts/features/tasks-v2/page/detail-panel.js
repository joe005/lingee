import { toast } from '../../../core/toast.js';
import { mountAgentConfig, unmountAgentConfig } from '../../agent-config.js';
import { agentCardByName, openAgentSubmit } from '../../agent-submit.js';
import { isWebsiteArtifact, renderArtifactBlocks, renderWebsitePreview } from '../../collab/run-artifacts.js';
import { TK_LABELS, tkGetProjectName, tkGetTaskArtifacts, tkGetTasks, tkUpdateTask } from '../data.js';
import { approveAndSubmitAgent, isAgentSubmitStep, reviewTaskStage, taskExecutionStages } from '../task-execution.js';
import { artifactFileName, artifactFormat, artifactFormatLabel, artifactIcon } from './artifacts.js';
import { render } from './layout.js';
import { pageState } from './page-state.js';
import { DRAWER_WIDTH_STORAGE_KEY, els, state } from './state.js';
import { openDrawer } from './subtasks.js';
import { confirmTaskStageApproval, escapeHtml, openTaskConversationWithTask } from './utils.js';
/* 任务页 · 任务详情面板（拆分自 tasks-v2/index.js，逻辑未改） */
/* ---------- 任务详情面板 ---------- */
export var propPickerOptions = {};
var propFieldKeys = { '状态':'status', '处理人':'assignee', '项目':'project', '优先级':'priority', '截止日期':'dueDate' }; /* 原文件末尾曾重复声明并覆盖了这里（少了「模块」），拆分时保留实际生效的值 */
var taskLabelColors = Object.create(null);
pageState.labelPickerMenu = null;
var labelPickerTaskId = null;
pageState.labelPickerMode = 'pick';
var LABEL_PALETTE = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#6366f1','#a855f7','#ec4899','#64748b'];
export function persistTaskLabelCatalog() {
  try { localStorage.setItem('lingee_task_label_catalog', JSON.stringify({ labels:TK_LABELS, colors:taskLabelColors })); }
  catch (e) { /* 本地存储不可用时仍可在当前页面编辑 */ }
}
export function restoreTaskLabelCatalog() {
  try {
    var saved = JSON.parse(localStorage.getItem('lingee_task_label_catalog') || 'null');
    if (!saved || !Array.isArray(saved.labels)) return;
    if (saved.colors && typeof saved.colors === 'object') Object.keys(saved.colors).forEach(function(name) {
      if (/^#[0-9a-f]{6}$/i.test(saved.colors[name])) taskLabelColors[name] = saved.colors[name];
    });
  } catch (e) { /* 忽略损坏的本地缓存 */ }
}
export function taskLabelColor(name) {
  if (taskLabelColors[name]) return taskLabelColors[name];
  var hash = 0;
  for (var i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return LABEL_PALETTE[hash % LABEL_PALETTE.length];
}
function taskLabelTextColor(color) {
  var r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
  return (r * .299 + g * .587 + b * .114) / 255 > .55 ? '#111827' : '#f9fafb';
}
export function taskLabelCatalog() {
  return Array.from(new Set(TK_LABELS.concat(tkGetTasks().flatMap(function(t) { return t.labels || []; }))));
}
export function renderTaskLabelTrigger(task) {
  var labels = task.labels || [];
  return '<div class="tk-label-picker" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false" aria-label="编辑标签">' +
    (labels.length ? labels.map(function(name) {
      var color = taskLabelColor(name);
      return '<span class="tk-drawer-label" style="background:' + color + ';color:' + taskLabelTextColor(color) + '"><span>' + escapeHtml(name) + '</span><button type="button" class="tk-drawer-label-remove" data-label-remove="' + escapeHtml(name) + '" aria-label="移除标签 ' + escapeHtml(name) + '">×</button></span>';
    }).join('') : '<span class="tk-label-placeholder"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3h9l9 9-9 9-9-9z"/><circle cx="8" cy="8" r="1"/></svg>添加标签</span>') +
    '</div>';
}
export function closeTaskLabelPicker() {
  if (pageState.labelPickerMenu) pageState.labelPickerMenu.remove();
  pageState.labelPickerMenu = null;
  labelPickerTaskId = null;
  pageState.labelPickerMode = 'pick';
  var trigger = els.tkDrawerBody && els.tkDrawerBody.querySelector('.tk-label-picker');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}
export function updateTaskLabels(task, labels) {
  tkUpdateTask(task.id, { labels: labels });
  var row = els.tkDrawerBody.querySelector('.tk-label-picker');
  if (row) row.outerHTML = renderTaskLabelTrigger(task);
  if (pageState.labelPickerMenu) els.tkDrawerBody.querySelector('.tk-label-picker').setAttribute('aria-expanded', 'true');
  render();
}
export function renderTaskLabelChoices(query) {
  if (!pageState.labelPickerMenu || pageState.labelPickerMode !== 'pick') return;
  var task = tkGetTasks().find(function(t) { return t.id === labelPickerTaskId; });
  if (!task) return;
  var normalized = query.trim().toLocaleLowerCase();
  var labels = taskLabelCatalog().filter(function(name) { return name.toLocaleLowerCase().includes(normalized); });
  var list = pageState.labelPickerMenu.querySelector('.tk-label-picker-options');
  list.innerHTML = labels.map(function(name) {
    var selected = (task.labels || []).includes(name);
    return '<button type="button" class="tk-label-option' + (selected ? ' selected' : '') + '" data-label-option="' + escapeHtml(name) + '" role="option" aria-selected="' + selected + '"><span class="tk-label-color" style="background:' + taskLabelColor(name) + '"></span><span class="tk-label-option-name">' + escapeHtml(name) + '</span><span class="tk-label-check">' + (selected ? '✓' : '') + '</span></button>';
  }).join('');
  var exact = taskLabelCatalog().some(function(name) { return name.toLocaleLowerCase() === normalized; });
  if (normalized && !exact) list.innerHTML += '<button type="button" class="tk-label-option tk-label-create" data-label-create="' + escapeHtml(query.trim()) + '"><span class="tk-label-create-plus">＋</span><span class="tk-label-option-name">创建“' + escapeHtml(query.trim()) + '”</span><span class="tk-label-color" style="background:' + taskLabelColor(query.trim()) + '"></span></button>';
  if (!list.innerHTML) list.innerHTML = '<div class="tk-label-picker-empty">没有匹配的标签</div>';
}
function renderTaskLabelPickerBody() {
  pageState.labelPickerMode = 'pick';
  pageState.labelPickerMenu.innerHTML = '<div class="tk-label-search-wrap"><input type="search" class="tk-label-search" placeholder="搜索标签…" aria-label="搜索标签" autocomplete="off"></div><div class="tk-label-picker-options" role="listbox" aria-multiselectable="true"></div><div class="tk-label-popover-footer"><button type="button" data-label-manage>⚙ 管理标签</button></div>';
  renderTaskLabelChoices('');
  pageState.labelPickerMenu.querySelector('input').focus({ preventScroll:true });
}
function renderTaskLabelManager() {
  pageState.labelPickerMode = 'manage';
  pageState.labelPickerMenu.innerHTML = '<div class="tk-label-manager-head"><button type="button" data-label-back aria-label="返回标签选择">‹</button><strong>管理标签</strong></div>' +
    '<div class="tk-label-manager-list">' + taskLabelCatalog().map(function(name) {
      return '<div class="tk-label-manager-row"><input type="color" data-label-color="' + escapeHtml(name) + '" value="' + taskLabelColor(name) + '" aria-label="标签颜色 ' + escapeHtml(name) + '"><input type="text" data-label-rename="' + escapeHtml(name) + '" value="' + escapeHtml(name) + '" aria-label="标签名称"><button type="button" data-label-delete="' + escapeHtml(name) + '" aria-label="删除标签 ' + escapeHtml(name) + '">×</button></div>';
    }).join('') + '</div><div class="tk-label-manager-add"><input type="text" class="tk-label-manager-new" placeholder="新标签名称" aria-label="新标签名称"><button type="button" data-label-add>添加</button></div>';
}
function refreshTaskLabelDisplay() {
  var task = tkGetTasks().find(function(t) { return t.id === state.drawerTaskId; });
  var row = els.tkDrawerBody.querySelector('.tk-label-picker');
  if (task && row) {
    row.outerHTML = renderTaskLabelTrigger(task);
    els.tkDrawerBody.querySelector('.tk-label-picker').setAttribute('aria-expanded', 'true');
  }
  render();
}
export function openTaskLabelPicker(trigger) {
  closeTaskLabelPicker();
  labelPickerTaskId = state.drawerTaskId;
  pageState.labelPickerMenu = document.createElement('div');
  pageState.labelPickerMenu.className = 'tk-label-popover';
  renderTaskLabelPickerBody();
  pageState.labelPickerMenu.addEventListener('input', function(e) {
    if (e.target.classList.contains('tk-label-search')) renderTaskLabelChoices(e.target.value);
  });
  pageState.labelPickerMenu.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeTaskLabelPicker(); return; }
    if (e.isComposing) return;
    if (e.key === 'Enter' && e.target.classList.contains('tk-label-manager-new')) {
      e.preventDefault();
      pageState.labelPickerMenu.querySelector('[data-label-add]').click();
      return;
    }
    if (e.key === 'Enter' && e.target.classList.contains('tk-label-search')) {
      var first = pageState.labelPickerMenu.querySelector('.tk-label-option');
      if (first) { e.preventDefault(); first.click(); }
    }
    if (e.key === 'ArrowDown' && e.target.classList.contains('tk-label-search')) {
      var option = pageState.labelPickerMenu.querySelector('.tk-label-option');
      if (option) { e.preventDefault(); option.focus(); }
    }
    var focusedOption = e.target.closest('.tk-label-option');
    if (focusedOption) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var options = Array.from(pageState.labelPickerMenu.querySelectorAll('.tk-label-option'));
        var index = options.indexOf(focusedOption) + (e.key === 'ArrowDown' ? 1 : -1);
        if (options[index]) options[index].focus();
        else pageState.labelPickerMenu.querySelector('.tk-label-search').focus();
      }
    }
  });
  pageState.labelPickerMenu.addEventListener('click', function(e) {
    if (e.target.closest('[data-label-manage]')) { renderTaskLabelManager(); return; }
    if (e.target.closest('[data-label-back]')) { renderTaskLabelPickerBody(); return; }
    var add = e.target.closest('[data-label-add]');
    if (add) {
      var newName = pageState.labelPickerMenu.querySelector('.tk-label-manager-new').value.trim();
      if (newName && !taskLabelCatalog().some(function(name) { return name.toLocaleLowerCase() === newName.toLocaleLowerCase(); })) {
        TK_LABELS.push(newName);
        persistTaskLabelCatalog();
        renderTaskLabelManager();
      }
      return;
    }
    var removeCatalog = e.target.closest('[data-label-delete]');
    if (removeCatalog) {
      var oldName = removeCatalog.getAttribute('data-label-delete');
      var index = TK_LABELS.indexOf(oldName);
      if (index >= 0) TK_LABELS.splice(index, 1);
      tkGetTasks().forEach(function(task) {
        if ((task.labels || []).includes(oldName)) tkUpdateTask(task.id, { labels: task.labels.filter(function(name) { return name !== oldName; }) });
      });
      delete taskLabelColors[oldName];
      persistTaskLabelCatalog();
      refreshTaskLabelDisplay();
      if (pageState.labelPickerMenu) renderTaskLabelManager();
      return;
    }
    var option = e.target.closest('[data-label-option]');
    var create = e.target.closest('[data-label-create]');
    if (!option && !create) return;
    var task = tkGetTasks().find(function(t) { return t.id === labelPickerTaskId; });
    if (!task) return;
    var name = option ? option.getAttribute('data-label-option') : create.getAttribute('data-label-create');
    var selected = task.labels || [];
    if (create && !TK_LABELS.includes(name)) { TK_LABELS.push(name); persistTaskLabelCatalog(); }
    updateTaskLabels(task, selected.includes(name) ? selected.filter(function(label) { return label !== name; }) : selected.concat(name));
    var search = pageState.labelPickerMenu && pageState.labelPickerMenu.querySelector('.tk-label-search');
    if (search) {
      if (create) search.value = '';
      renderTaskLabelChoices(search.value);
      search.focus({ preventScroll:true });
    }
  });
  pageState.labelPickerMenu.addEventListener('change', function(e) {
    var colorName = e.target.getAttribute('data-label-color');
    if (colorName) {
      taskLabelColors[colorName] = e.target.value;
      persistTaskLabelCatalog();
      refreshTaskLabelDisplay();
      return;
    }
    var oldName = e.target.getAttribute('data-label-rename');
    if (!oldName) return;
    var nextName = e.target.value.trim();
    if (!nextName || nextName === oldName || taskLabelCatalog().some(function(name) { return name.toLocaleLowerCase() === nextName.toLocaleLowerCase(); })) {
      e.target.value = oldName;
      return;
    }
    var index = TK_LABELS.indexOf(oldName);
    if (index >= 0) TK_LABELS[index] = nextName;
    else TK_LABELS.push(nextName);
    tkGetTasks().forEach(function(task) {
      if ((task.labels || []).includes(oldName)) tkUpdateTask(task.id, { labels: task.labels.map(function(name) { return name === oldName ? nextName : name; }) });
    });
    taskLabelColors[nextName] = taskLabelColors[oldName] || taskLabelColor(oldName);
    delete taskLabelColors[oldName];
    persistTaskLabelCatalog();
    refreshTaskLabelDisplay();
    if (pageState.labelPickerMenu) renderTaskLabelManager();
  });
  document.body.appendChild(pageState.labelPickerMenu);
  renderTaskLabelChoices('');
  var rect = trigger.getBoundingClientRect();
  pageState.labelPickerMenu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - pageState.labelPickerMenu.offsetWidth - 8)) + 'px';
  pageState.labelPickerMenu.style.top = Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - pageState.labelPickerMenu.offsetHeight - 8)) + 'px';
  trigger.setAttribute('aria-expanded', 'true');
  pageState.labelPickerMenu.querySelector('input').focus({ preventScroll:true });
}
export function propPicker(name, currentVal, options, isDate) {
  var display = isDate ? (currentVal || '—') : (options.find(function (o) { return o.value === currentVal; }) || {}).label || '—';
  if (isDate) {
    return '<div class="tk-prop-row"><span>' + name + '</span><input type="date" class="tk-prop-edit" data-prop="' + propFieldKeys[name] + '" value="' + escapeHtml(currentVal || '') + '"></div>';
  }
  propPickerOptions[name] = { options: options, currentVal: currentVal, key: propFieldKeys[name] };
  return '<div class="tk-prop-row"><span>' + name + '</span><div class="tk-prop-display" data-prop-name="' + escapeHtml(name) + '">' + (name === '处理人' ? '<input class="tk-prop-assignee-input" type="text" value="' + escapeHtml(display === '—' ? '' : display) + '" placeholder="处理人" aria-label="处理人" role="combobox" aria-expanded="false" autocomplete="off">' : escapeHtml(display)) + '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div></div>';
}
export function renderTaskArtifact(artifact) {
  return '<div class="tk-artifact" data-artifact-preview="' + escapeHtml(artifact.id) + '">' +
        '<div class="tk-artifact-summary">' +
          '<span class="tk-artifact-icon"><img src="' + artifactIcon(artifact) + '" width="16" height="16" alt=""></span>' +
          '<span class="tk-artifact-title">' + escapeHtml(artifact.docTitle || artifact.type) + '</span>' +
          '<span class="tk-artifact-type">' + escapeHtml(artifact.type) + '</span>' +
          '<svg class="tk-artifact-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' +
        '</div>' +
      '</div>';
}
function renderDocPreviewTabsBar() {
  if (pageState.docPreviewTabs.length < 2) return '';
  return '<div class="tk-doc-preview-tabs" role="tablist" aria-label="已打开的产物页签">' + pageState.docPreviewTabs.map(function (tab) {
    var active = tab.id === pageState.docPreviewActiveId;
    return '<button type="button" class="tk-doc-preview-tab' + (active ? ' is-active' : '') + '" role="tab" aria-selected="' + active + '" data-doc-tab="' + escapeHtml(tab.id) + '" title="' + escapeHtml(tab.docTitle || tab.type) + '">'
      + '<span class="tk-doc-preview-tab-icon"><img src="' + artifactIcon(tab) + '" alt=""></span>'
      + '<span class="tk-doc-preview-tab-name">' + escapeHtml(tab.docTitle || tab.type) + '</span>'
      + '<span class="tk-doc-preview-tab-close" data-doc-tab-close="' + escapeHtml(tab.id) + '" role="button" aria-label="关闭「' + escapeHtml(tab.type) + '」页签" title="关闭页签"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>'
      + '</button>';
  }).join('') + '</div>';
}
function renderDocPreviewContent(artifact) {
  return '<div class="tk-doc-preview-resize" id="tkDocPreviewResize" role="separator" aria-orientation="vertical" aria-label="调整文档预览宽度" tabindex="0"></div>' +
    renderDocPreviewTabsBar() +
    '<div class="tk-doc-preview-head">' +
      '<div class="tk-doc-preview-title">' +
        '<span class="tk-doc-preview-icon"><img src="' + artifactIcon(artifact) + '" alt=""></span>' +
        '<div><strong>' + escapeHtml(artifact.docTitle || artifact.type) + '</strong><span>' + escapeHtml(artifact.summary) + '</span></div>' +
      '</div>' +
      '<button type="button" class="tk-doc-preview-close" id="tkDocPreviewClose" aria-label="关闭文档预览" data-tooltip="关闭">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="tk-doc-preview-body' + (isWebsiteArtifact(artifact) ? ' is-website' : '') + '">' + (isWebsiteArtifact(artifact) ? renderWebsitePreview(artifact) : renderArtifactDocument(artifact)) + '</div>';
}
function renderArtifactDocument(artifact) {
  var meta = [
    ['文档编号', artifact.docNo], ['版本', artifact.version], ['状态', artifact.status],
    ['作者', artifact.author], ['评审人', artifact.reviewer], ['更新时间', artifact.date],
  ].filter(function (item) { return item[1]; });
  return '<article class="tk-doc-article">' +
        '<h3 class="tk-doc-article-title">' + escapeHtml(artifact.docTitle || artifact.type) + '</h3>' +
        '<dl class="tk-doc-preview-meta">' + meta.map(function (item) {
          return '<div><dt>' + escapeHtml(item[0]) + '</dt><dd>' + escapeHtml(item[1]) + '</dd></div>';
        }).join('') + '</dl>' +
        (artifact.sections || []).map(function (section) {
          return '<section class="tk-doc-preview-section">' +
            '<h4>' + escapeHtml(section.heading) + '</h4>' +
            renderArtifactBlocks(section) +
          '</section>';
        }).join('') +
        (typeof artifact.content === 'string' ? '<pre class="tk-doc-code"><code>' + escapeHtml(artifact.content) + '</code></pre>' : '') +
      '</article>';
}

function renderMarkdownContent(content, fileName) {
  var lines = String(content || '').split('\n');
  var html = '', listOpen = false, codeOpen = false, codeLines = [];
  function closeList() { if (listOpen) { html += '</ul>'; listOpen = false; } }
  lines.forEach(function (line) {
    if (/^```/.test(line)) {
      closeList();
      if (codeOpen) { html += '<pre class="tk-doc-code"><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre>'; codeLines = []; }
      codeOpen = !codeOpen;
      return;
    }
    if (codeOpen) { codeLines.push(line); return; }
    var heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) { closeList(); html += '<h' + (heading[1].length + 1) + '>' + escapeHtml(heading[2]) + '</h' + (heading[1].length + 1) + '>'; return; }
    var bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) { if (!listOpen) { html += '<ul class="tk-doc-list">'; listOpen = true; } html += '<li>' + escapeHtml(bullet[1]) + '</li>'; return; }
    closeList();
    if (line.trim()) html += '<p>' + escapeHtml(line) + '</p>';
  });
  closeList();
  if (codeOpen) html += '<pre class="tk-doc-code"><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre>';
  return '<article class="tk-doc-article tk-list-review-markdown"><h3 class="tk-doc-article-title">' + escapeHtml(fileName) + '</h3>' + html + '</article>';
}
function renderReviewArtifactPreview(artifact) {
  var format = artifactFormat(artifact);
  var fileName = artifact.fileName || artifact.name || artifact.docTitle || artifact.type;
  if (format === 'html' && typeof artifact.content === 'string') {
    return '<article class="tk-list-review-file-preview"><div class="tk-list-review-file-head"><strong>' + escapeHtml(fileName) + '</strong><span>HTML 预览</span></div><div class="tk-list-review-html-frame"><iframe sandbox' + (artifact.url ? '="allow-scripts"' : '') + ' title="' + escapeHtml(fileName) + '" srcdoc="' + escapeHtml(artifact.content) + '"></iframe></div></article>';
  }
  if (format === 'code') {
    return '<article class="tk-list-review-file-preview"><div class="tk-list-review-file-head"><strong>' + escapeHtml(fileName) + '</strong><span>' + escapeHtml(artifact.language || '代码') + '</span></div><pre class="tk-list-review-code"><code>' + escapeHtml(artifact.content || '') + '</code></pre></article>';
  }
  if (!(artifact.sections || []).length && typeof artifact.content === 'string') return renderMarkdownContent(artifact.content, fileName);
  return renderArtifactDocument(artifact);
}
function reviewArtifactSamples(task, artifacts) {
  var stem = String(task.code || ('task-' + task.id)).toLowerCase();
  var normalized = artifacts.map(function (artifact, index) {
    var format = artifactFormat(artifact);
    return Object.assign({}, artifact, { format:format, fileName:artifactFileName(artifact, stem + '-review', index + 1) });
  });
  /* 交付智能体的任务只看真实产物（测试报告），不补示例文件 */
  if (task.deliversAgent && normalized.length) return normalized;
  var formats = new Set(normalized.map(artifactFormat));
  if (!formats.has('md')) normalized.unshift({
    id:'review-md-' + task.id, stageId:task.executionStageId, format:'md', fileName:stem + '-验收说明.md', type:'Markdown 文档',
    content:'# ' + task.title + '\n\n## 验收摘要\n\n' + (task.desc || '本阶段产物已提交，等待验收。') + '\n\n## 验收清单\n\n- 核对功能范围与任务描述一致\n- 核对异常处理和边界场景\n- 核对交付文件可独立使用',
  });
  if (!formats.has('code')) normalized.push({
    id:'review-code-' + task.id, stageId:task.executionStageId, format:'code', language:'JavaScript', fileName:stem + '-validator.js', type:'代码文件',
    content:'const delivery = {\n  task: ' + JSON.stringify(task.title) + ',\n  status: "ready-for-review"\n};\n\nexport function validate(result) {\n  if (!result) throw new Error("缺少执行结果");\n  return { ...delivery, valid: true, result };\n}\n',
  });
  if (!formats.has('html')) normalized.push({
    id:'review-html-' + task.id, stageId:task.executionStageId, format:'html', fileName:stem + '-preview.html', type:'HTML 文件',
    content:'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>body{margin:0;padding:32px;font:14px/1.7 system-ui;color:#2d2d2d;background:#f7f8fb}.card{max-width:640px;margin:auto;padding:28px;background:#fff;border:1px solid #e8eaf0;border-radius:12px;box-shadow:0 8px 24px rgba(30,40,70,.08)}h1{margin:0 0 8px;font-size:22px}.tag{display:inline-block;padding:3px 9px;border-radius:5px;background:#eef3ff;color:#495dff;font-size:12px}.row{margin-top:20px;padding:14px;background:#fafafa;border-radius:8px}</style></head><body><main class="card"><span class="tag">验收预览</span><h1>' + escapeHtml(task.title) + '</h1><p>' + escapeHtml(task.desc || '本阶段产物已生成。') + '</p><div class="row"><strong>交付状态</strong><br>产物已生成，等待验收确认。</div></main></body></html>',
  });
  return normalized;
}
function listReviewArtifacts(task) {
  var stageId = task.executionStageId;
  var generated = (task.executionArtifacts || []).filter(function (artifact) { return artifact.stageId === stageId; });
  var artifacts = generated.length ? generated : tkGetTaskArtifacts(task).filter(function (artifact) { return artifact.stageId === stageId; });
  return reviewArtifactSamples(task, artifacts);
}
function closeListReviewPreview(restoreFocus) {
  if (!els.tkListReviewOverlay || els.tkListReviewOverlay.hidden) return;
  els.tkListReviewOverlay.hidden = true;
  pageState.listReviewPreviewTaskId = null;
  pageState.listReviewPreviewArtifactId = null;
  if (restoreFocus !== false && pageState.listReviewPreviewFocus?.isConnected) pageState.listReviewPreviewFocus.focus();
  pageState.listReviewPreviewFocus = null;
}
function renderListReviewPreview() {
  var task = tkGetTasks().find(function (row) { return row.id === pageState.listReviewPreviewTaskId; });
  if (!task || task.status !== 'in_review') { closeListReviewPreview(false); return; }
  var artifacts = listReviewArtifacts(task);
  var active = artifacts.find(function (artifact) { return artifact.id === pageState.listReviewPreviewArtifactId; }) || artifacts[0];
  pageState.listReviewPreviewArtifactId = active?.id || null;
  var stage = taskExecutionStages(task).find(function (row) { return row.id === task.executionStageId; });
  els.tkListReviewTitle.textContent = task.title;
  els.tkListReviewMeta.textContent = [task.code, tkGetProjectName(task.project), stage?.name, artifacts.length + ' 个产物'].filter(Boolean).join(' · ');
  els.tkListReviewCount.textContent = artifacts.length;
  els.tkListReviewTabs.innerHTML = artifacts.map(function (artifact) {
    var selected = artifact.id === pageState.listReviewPreviewArtifactId;
    return '<button type="button" class="tk-list-review-tab' + (selected ? ' is-active' : '') + '" role="tab" aria-selected="' + selected + '" data-list-review-artifact="' + escapeHtml(artifact.id) + '"><img src="' + artifactIcon(artifact) + '" alt=""><span>' + escapeHtml(artifact.fileName || artifact.docTitle || artifact.type) + '</span><small>' + escapeHtml(artifactFormatLabel(artifact)) + '</small></button>';
  }).join('');
  els.tkListReviewBody.innerHTML = active ? renderReviewArtifactPreview(active) : '<div class="tk-list-review-empty">当前阶段暂无可预览产物</div>';
  var agentSubmit = isAgentSubmitStep(task);
  els.tkListReviewApprove.textContent = agentSubmit ? '通过并提交上架' : '通过验收';
  els.tkListReviewHint.textContent = agentSubmit
    ? '测试通过后直接提交「' + task.deliversAgent + '」上架审核，管理员审核通过后正式生效。'
    : '请核对产物内容。需要调整时可返回任务会话继续修改。';
  els.tkListReviewBody.scrollTop = 0;
}
export function openListReviewPreview(taskId, trigger) {
  var task = tkGetTasks().find(function (row) { return row.id === Number(taskId); });
  if (!task || task.status !== 'in_review') { toast('任务状态已变化，请刷新后重试', 'warning'); return; }
  pageState.listReviewPreviewTaskId = task.id;
  pageState.listReviewPreviewArtifactId = null;
  pageState.listReviewPreviewFocus = trigger || document.activeElement;
  renderListReviewPreview();
  els.tkListReviewOverlay.hidden = false;
  els.tkListReviewClose.focus({ preventScroll:true });
}
export function initListReviewPreviewEvents() {
  /* 智能体在配置面板或验收页提交后，交付它的任务一并完成测试验证与提交上架 */
  document.addEventListener('lingee:agent-submitted', function (e) {
    var name = e.detail?.name;
    var changed = false;
    var refreshId = null;
    tkGetTasks().filter(function (task) { return task.deliversAgent === name && isAgentSubmitStep(task); }).forEach(function (task) {
      if (approveAndSubmitAgent(task).ok) { changed = true; if (state.drawerTaskId === task.id && els.tkDrawer.classList.contains('show')) refreshId = task.id; }
    });
    if (!changed) return;
    render();
    /* 详情抽屉开着时刷新状态与执行计划；openDrawer 会重绘产物预览并重新挂上配置面板（保留编辑状态） */
    if (refreshId != null) openDrawer(refreshId);
  });
  if (els.tkListReviewOverlay.parentNode !== document.body) document.body.appendChild(els.tkListReviewOverlay);
  els.tkListReviewClose.addEventListener('click', function () { closeListReviewPreview(true); });
  els.tkListReviewOverlay.addEventListener('click', function (event) {
    if (event.target === els.tkListReviewOverlay) { closeListReviewPreview(true); return; }
    var tab = event.target.closest('[data-list-review-artifact]');
    if (tab) { pageState.listReviewPreviewArtifactId = tab.getAttribute('data-list-review-artifact'); renderListReviewPreview(); }
  });
  els.tkListReviewRevise.addEventListener('click', function () {
    var task = tkGetTasks().find(function (row) { return row.id === pageState.listReviewPreviewTaskId; });
    var reviewed = reviewTaskStage(task, false);
    if (!reviewed.ok) { toast('任务状态已变化，请刷新后重试', 'warning'); closeListReviewPreview(false); return; }
    closeListReviewPreview(false);
    render();
    toast('已退回修改，正在打开任务会话', 'success');
    openTaskConversationWithTask(task.id, 'revise');
  });
  els.tkListReviewApprove.addEventListener('click', function () {
    var task = tkGetTasks().find(function (row) { return row.id === pageState.listReviewPreviewTaskId; });
    if (isAgentSubmitStep(task)) {
      /* 测试通过 + 提交上架合为一步：复用智能体开发的「提交上架审核」确认 */
      var card = agentCardByName(task.deliversAgent);
      if (!card) { toast('未找到智能体：' + task.deliversAgent, 'warning'); return; }
      openAgentSubmit(card, { returnFocus: els.tkListReviewApprove, onDone: function () { closeListReviewPreview(false); } });
      return;
    }
    confirmTaskStageApproval(task, false, function () { closeListReviewPreview(false); });
  });
  document.addEventListener('keydown', function (event) {
    if (els.tkListReviewOverlay.hidden || event.defaultPrevented) return;
    if (document.getElementById('agentSubmitOverlay')?.hidden === false) return;
    if (event.key === 'Escape') { event.preventDefault(); closeListReviewPreview(true); return; }
    if (event.key !== 'Tab') return;
    var focusable = Array.from(els.tkListReviewOverlay.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function (node) { return !node.hidden && node.offsetParent !== null; });
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
}
/* 文档预览挂在详情面板上（与头部同级），从右侧占位弹出，高度与任务窗口一致。 */
function docPreviewPanel() {
  var panel = els.tkDrawerBody.querySelector(':scope > #tkDocPreview');
  if (!panel) {
    panel = document.createElement('aside');
    panel.className = 'tk-doc-preview';
    panel.id = 'tkDocPreview';
    panel.setAttribute('aria-label', '产物文档预览');
    els.tkDrawerBody.appendChild(panel);
  }
  return panel;
}
export function openDocPreview(artifact) {
  if (!pageState.docPreviewTabs.some(function (tab) { return tab.id === artifact.id; })) pageState.docPreviewTabs.push(artifact);
  pageState.docPreviewActiveId = artifact.id;
  renderDocPreviewPanel();
}
function switchDocPreviewTab(id) {
  if (pageState.docPreviewActiveId === id) return;
  if (!pageState.docPreviewTabs.some(function (tab) { return tab.id === id; })) return;
  pageState.docPreviewActiveId = id;
  renderDocPreviewPanel();
}
function closeDocPreviewTab(id) {
  var index = pageState.docPreviewTabs.findIndex(function (tab) { return tab.id === id; });
  if (index < 0) return;
  pageState.docPreviewTabs.splice(index, 1);
  if (!pageState.docPreviewTabs.length) { closeDocPreview(); return; }
  if (pageState.docPreviewActiveId === id) {
    var next = pageState.docPreviewTabs[Math.min(index, pageState.docPreviewTabs.length - 1)];
    pageState.docPreviewActiveId = next.id;
  }
  renderDocPreviewPanel();
}
export function renderDocPreviewPanel() {
  var artifact = pageState.docPreviewTabs.find(function (tab) { return tab.id === pageState.docPreviewActiveId; });
  if (!artifact) { closeDocPreview(); return; }
  var panel = docPreviewPanel();
  clearTimeout(pageState.docPreviewCloseTimer);
  unmountAgentConfig();
  panel.innerHTML = renderDocPreviewContent(artifact);
  /* 智能体类开发成果直接打开智能体配置面板（与智能体开发会话同一份） */
  if (artifact.agentConfig) {
    var agentHost = panel.querySelector('.tk-doc-preview-body');
    agentHost.classList.add('has-agent-config');
    mountAgentConfig(agentHost, artifact.agentConfig);
  }
  panel.dataset.artifactId = artifact.id;
  panel.querySelector('.tk-doc-preview-body').scrollTop = 0;
  panel.classList.add('show');
  expandDrawerForDocPreview(panel);
  els.tkDrawerBody.querySelectorAll('[data-artifact-preview]').forEach(function (row) {
    row.classList.toggle('is-previewing', row.getAttribute('data-artifact-preview') === artifact.id);
  });
  var closeBtn = panel.querySelector('#tkDocPreviewClose');
  if (closeBtn) closeBtn.addEventListener('click', closeDocPreview);
  var resize = panel.querySelector('#tkDocPreviewResize');
  if (resize) initDocPreviewResize(resize, panel);
  panel.querySelectorAll('[data-doc-tab]').forEach(function (tab) {
    tab.addEventListener('click', function (e) {
      if (e.target.closest('[data-doc-tab-close]')) return;
      switchDocPreviewTab(tab.getAttribute('data-doc-tab'));
    });
  });
  panel.querySelectorAll('[data-doc-tab-close]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeDocPreviewTab(btn.getAttribute('data-doc-tab-close'));
    });
  });
}
function expandDrawerForDocPreview(panel) {
  var drawerWidth = els.tkDrawer.getBoundingClientRect().width;
  var viewportWidth = window.innerWidth;
  var docWidth = panel.style.width ? parseFloat(panel.style.width) : Math.min(880, viewportWidth * 0.8);
  var sidebar = els.tkDrawerBody.querySelector(':scope > .tk-drawer-sidebar:not(.hidden)');
  var sidebarWidth = sidebar ? sidebar.offsetWidth : 0;
  var mainWidth = drawerWidth - sidebarWidth - docWidth;
  var minMain = 600;
  if (mainWidth < minMain) {
    var needed = minMain + sidebarWidth + docWidth;
    if (needed > viewportWidth) {
      docWidth = Math.max(320, viewportWidth - minMain - sidebarWidth);
      panel.style.width = docWidth + 'px';
      needed = minMain + sidebarWidth + docWidth;
    }
    /* 只记录首次拓宽前的宽度；切换页签会重进此函数，不能让拓宽后的宽度覆盖原值。 */
    if (pageState.docPreviewSavedDrawerWidth == null) pageState.docPreviewSavedDrawerWidth = drawerWidth;
    els.tkDrawer.style.setProperty('--tk-drawer-width', Math.min(needed, viewportWidth) + 'px');
  }
}
export function closeDocPreview() {
  unmountAgentConfig();
  pageState.docPreviewTabs = [];
  pageState.docPreviewActiveId = null;
  var panel = els.tkDrawerBody.querySelector(':scope > #tkDocPreview');
  if (!panel) return;
  panel.classList.remove('show');
  delete panel.dataset.artifactId;
  els.tkDrawerBody.querySelectorAll('.is-previewing').forEach(function (row) { row.classList.remove('is-previewing'); });
  panel.style.width = '';
  if (pageState.docPreviewSavedDrawerWidth != null) {
    els.tkDrawer.style.setProperty('--tk-drawer-width', pageState.docPreviewSavedDrawerWidth + 'px');
    pageState.docPreviewSavedDrawerWidth = null;
  }
  clearTimeout(pageState.docPreviewCloseTimer);
  pageState.docPreviewCloseTimer = setTimeout(function () {
    if (panel && !panel.classList.contains('show')) panel.innerHTML = '';
  }, 250);
}
function docPreviewWidthBounds() {
  var bodyWidth = els.tkDrawerBody.getBoundingClientRect().width;
  return { min:320, max:Math.max(320, bodyWidth - 600) };
}
function setDocPreviewWidth(panel, width) {
  var bounds = docPreviewWidthBounds();
  var next = Math.round(Math.min(bounds.max, Math.max(bounds.min, width)));
  panel.style.width = next + 'px';
}
function initDocPreviewResize(handle, panel) {
  handle.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    e.preventDefault();
    var pointerId = e.pointerId;
    var startX = e.clientX;
    var startWidth = panel.getBoundingClientRect().width;
    handle.setPointerCapture(pointerId);
    panel.classList.add('resizing');
    document.body.classList.add('tk-drawer-resizing');
    function move(ev) {
      if (ev.pointerId !== pointerId) return;
      setDocPreviewWidth(panel, startWidth + startX - ev.clientX);
    }
    function end(ev) {
      if (ev.pointerId !== pointerId) return;
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      panel.classList.remove('resizing');
      document.body.classList.remove('tk-drawer-resizing');
    }
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  });
  handle.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    var current = panel.getBoundingClientRect().width;
    setDocPreviewWidth(panel, current + (e.key === 'ArrowLeft' ? 24 : -24));
  });
}
function drawerWidthBounds() {
  return { min:580, max:window.innerWidth - 100 };
}
export function setDrawerWidth(width, remember) {
  var bounds = drawerWidthBounds();
  var next = Math.round(Math.min(bounds.max, Math.max(bounds.min, width)));
  els.tkDrawer.style.setProperty('--tk-drawer-width', next + 'px');
  els.tkDrawerResize.setAttribute('aria-valuemin', String(bounds.min));
  els.tkDrawerResize.setAttribute('aria-valuemax', String(bounds.max));
  els.tkDrawerResize.setAttribute('aria-valuenow', String(next));
  if (remember) {
    pageState.drawerPreferredWidth = next;
    try { localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(next)); }
    catch (e) { /* 本地存储不可用时保留当前页面的偏好 */ }
  }
  return next;
}
export function applyDrawerWidth() {
  if (window.innerWidth <= 760) return;
  setDrawerWidth(pageState.drawerPreferredWidth || Math.min(900, window.innerWidth * .75), false);
}
export function syncDrawerClickaway() {
  els.tkDrawerClickaway.classList.toggle('hidden', state.viewMode !== 'slide' || !els.tkDrawer.classList.contains('show'));
}
