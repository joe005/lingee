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
          '<span class="tk-artifact-title">' + escapeHtml(task.title + ' · ' + artifact.type) + '</span>' +
          '<span class="tk-artifact-type">' + escapeHtml(artifact.type) + '</span>' +
          '<svg class="tk-artifact-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' +
        '</summary>' +
        '<div class="tk-artifact-preview">' +
          '<p class="tk-artifact-subtitle">' + escapeHtml(artifact.summary) + '</p><div class="tk-artifact-meta">' + escapeHtml(artifact.author) + ' · ' + escapeHtml(artifact.date) + '</div>' +
          artifact.sections.map(function (section) {
            return '<div class="tk-artifact-section"><strong>' + escapeHtml(section.heading) + '</strong><p>' + escapeHtml(section.text) + '</p></div>';
          }).join('') +
        '</div></details>';
    }).join('') + '</div></section>';
}

// 供工作详情和审核面板共用；只渲染传入快照，不读写别页 DOM。
export function renderArtifactPreview(artifact) {
  if (!artifact) return '';
  if (typeof artifact.content === 'string') return '<pre>' + escapeHtml(artifact.content) + '</pre>';
  return (artifact.sections || []).map(function (section) {
    return '<div class="tk-artifact-section"><strong>' + escapeHtml(section.heading) + '</strong><p>' + escapeHtml(section.text) + '</p></div>';
  }).join('');
}
