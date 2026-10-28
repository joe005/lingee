import { tkGetTaskArtifacts } from '../tasks-v2/data.js';
import { escapeHtml } from '../tasks-v2/ui-utils.js';

/* T06 产物展示入口。T00 保留当前演示产物，真实关联由 T01/T06 替换。 */
export function renderIssueArtifacts(task) {
  var artifacts = tkGetTaskArtifacts(task);
  return '<section class="tk-drawer-artifacts"><div class="tk-artifacts-heading"><span>产物</span><span>' + artifacts.length + ' 项</span></div>' +
    '<div class="tk-artifacts-list">' + artifacts.map(function (artifact) {
      return '<details class="tk-artifact">' +
        '<summary class="tk-artifact-summary">' +
          '<span class="tk-artifact-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg></span>' +
          '<span class="tk-artifact-title">' + escapeHtml(artifact.docTitle || (task.title + ' · ' + artifact.type)) + '</span>' +
          '<span class="tk-artifact-type">' + escapeHtml(artifact.type) + '</span>' +
          '<svg class="tk-artifact-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' +
        '</summary>' +
        '<div class="tk-artifact-preview">' +
          '<p class="tk-artifact-subtitle">' + escapeHtml(artifact.summary) + '</p><div class="tk-artifact-meta">' + escapeHtml(artifact.author) + ' · ' + escapeHtml(artifact.date) + '</div>' +
          renderArtifactPreview(artifact) +
        '</div></details>';
    }).join('') + '</div></section>';
}

/* 网站产物（format 为 html）：有地址的显示浏览器外框和地址栏，页面在沙箱 iframe 里运行，可直接操作 */
export function isWebsiteArtifact(artifact) {
  return !!artifact && artifact.format === 'html' && typeof artifact.content === 'string';
}
/* 启动失败演示只在本次页面内恢复；刷新后可再次演示，不改任务状态或其他预览。 */
var recoveredPreviews = new Set();
var restartingPreviews = new Set();
var startupFailureArtifacts = new Map();
function renderPreviewStartupFailure(artifact) {
  var taskId = String(artifact.sourceTaskId);
  startupFailureArtifacts.set(taskId, artifact);
  var restarting = restartingPreviews.has(taskId);
  return '<div class="tk-site-preview tk-site-startup-failure" data-site-preview-task="' + escapeHtml(taskId) + '">'
    + '<div class="tk-site-failure-art" aria-hidden="true"><div class="tk-site-failure-dots"><i></i><i></i><i></i></div><span>!</span></div>'
    + '<p role="status">' + (restarting ? '正在重启服务…' : '应用启动失败') + '</p>'
    + '<div class="tk-site-failure-actions"><button type="button" data-site-restart' + (restarting ? ' disabled' : '') + '><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 6.1A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.9"/></svg>重启服务</button>'
    + '<button type="button" class="tk-site-repair" data-site-repair' + (restarting ? ' disabled' : '') + '><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2v-7A8 8 0 1 1 20 11.5Z"/></svg>告诉灵基修复</button></div></div>';
}
export function initWebsitePreviewEvents(beforeRepair) {
  function refreshPreview(taskId) {
    var artifact = startupFailureArtifacts.get(taskId);
    document.querySelectorAll('[data-site-preview-task]').forEach(function (node) {
      if (node.dataset.sitePreviewTask === taskId) node.outerHTML = renderWebsitePreview(artifact);
    });
  }
  document.addEventListener('lingee:preview-service-restored', function (event) {
    var taskId = String(event.detail?.taskId);
    recoveredPreviews.add(taskId);
    if (startupFailureArtifacts.has(taskId)) refreshPreview(taskId);
  });
  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-site-restart], [data-site-repair]');
    var preview = button?.closest('[data-site-preview-task]');
    if (!preview || button.disabled) return;
    var taskId = preview.dataset.sitePreviewTask;
    if (button.hasAttribute('data-site-restart')) {
      restartingPreviews.add(taskId);
      refreshPreview(taskId);
      setTimeout(function () {
        restartingPreviews.delete(taskId);
        recoveredPreviews.add(taskId);
        refreshPreview(taskId);
      }, 600);
    } else {
      if (beforeRepair) beforeRepair();
      document.dispatchEvent(new CustomEvent('lingee:preview-repair', { detail:{ taskId:Number(taskId) } }));
    }
  });
}
export function renderWebsitePreview(artifact) {
  if (artifact.previewStartupFailure && !recoveredPreviews.has(String(artifact.sourceTaskId))) return renderPreviewStartupFailure(artifact);
  var title = artifact.docTitle || '网站预览';
  var frame = '<iframe class="tk-site-frame" sandbox="allow-scripts" title="' + escapeHtml(title) + '" srcdoc="' + escapeHtml(artifact.content) + '"></iframe>';
  if (!artifact.url) return '<div class="tk-site-preview">' + frame + '</div>';
  return '<div class="tk-site-preview"><div class="tk-site-bar"><span class="tk-site-dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
    '<span class="tk-site-url" title="' + escapeHtml(artifact.url) + '">' + escapeHtml(artifact.url) + '</span>' +
    '<span class="tk-site-badge">已部署</span></div>' + frame + '</div>';
}

// 供工作详情和审核面板共用；只渲染传入快照，不读写别页 DOM。
export function renderArtifactPreview(artifact, headingTag = 'strong') {
  if (!artifact) return '';
  if (isWebsiteArtifact(artifact)) return renderWebsitePreview(artifact);
  if (typeof artifact.content === 'string') return '<pre>' + escapeHtml(artifact.content) + '</pre>';
  var tag = headingTag === 'h2' ? 'h2' : 'strong';
  return (artifact.sections || []).map(function (section) {
    return '<div class="tk-artifact-section"><' + tag + '>' + escapeHtml(section.heading) + '</' + tag + '>' + renderArtifactBlocks(section) + '</div>';
  }).join('');
}

/* 产物正文块：p 段落、ul/ol 列表、table 表格、code 代码、note 提示；兼容旧的 text 字段。 */
export function renderArtifactBlocks(section) {
  var blocks = section.blocks || (section.text ? [{ p: section.text }] : []);
  return blocks.map(function (b) {
    if (b.p) return '<p class="tk-doc-p">' + escapeHtml(b.p) + '</p>';
    if (b.ul || b.ol) {
      var tag = b.ul ? 'ul' : 'ol';
      return '<' + tag + ' class="tk-doc-list">' + (b.ul || b.ol).map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</' + tag + '>';
    }
    if (b.table) {
      return '<div class="tk-doc-table-wrap"><table class="tk-doc-table"><thead><tr>' +
        b.table.head.map(function (h) { return '<th>' + escapeHtml(h) + '</th>'; }).join('') +
        '</tr></thead><tbody>' +
        b.table.rows.map(function (row) { return '<tr>' + row.map(function (cell) { return '<td>' + escapeHtml(cell) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div>';
    }
    if (b.app) {
      var app = b.app;
      return '<div class="tk-demo-app" aria-label="' + escapeHtml(app.title) + ' 页面预览">' +
        '<div class="tk-demo-app-head"><div><small>' + escapeHtml(app.subtitle) + '</small><strong>' + escapeHtml(app.title) + '</strong></div><span class="tk-demo-app-primary">＋ 新建</span></div>' +
        '<div class="tk-demo-app-stats">' + app.stats.map(function (item) { return '<div><span>' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(item[1]) + '</strong></div>'; }).join('') + '</div>' +
        '<div class="tk-demo-app-toolbar">' + app.filters.map(function (filter) { return '<span>' + escapeHtml(filter) + '</span>'; }).join('') + '<b>查询</b></div>' +
        '<div class="tk-doc-table-wrap"><table class="tk-doc-table"><thead><tr>' + app.head.map(function (h) { return '<th>' + escapeHtml(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + app.rows.map(function (row) { return '<tr>' + row.map(function (cell) { return '<td>' + escapeHtml(cell) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="tk-demo-app-foot">共 ' + app.rows.length + ' 条演示记录 <span>上一页　1　下一页</span></div></div>';
    }
    if (b.code) return '<pre class="tk-doc-code"><code>' + escapeHtml(b.code) + '</code></pre>';
    if (b.note) return '<div class="tk-doc-note">' + escapeHtml(b.note) + '</div>';
    return '';
  }).join('');
}
