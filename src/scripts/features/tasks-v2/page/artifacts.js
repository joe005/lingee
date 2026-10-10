import _iconDoc from '../../../../assets/file-type-icons/doc.png';
import _iconDocument from '../../../../assets/file-type-icons/document.png';
import _iconExcel from '../../../../assets/file-type-icons/excel.png';
import _iconHtml from '../../../../assets/file-type-icons/html.png';
import _iconMarkdown from '../../../../assets/file-type-icons/markdown.png';
import _iconPdf from '../../../../assets/file-type-icons/pdf.png';
/* 任务页 · 任务产物的文件类型图标、文件名与格式标签（拆分自 tasks-v2/index.js，逻辑未改） */
var _artifactIcons = { requirements:_iconMarkdown, technical:_iconDoc, implementation:_iconHtml, test:_iconExcel, delivery:_iconPdf };
export function artifactFormat(artifact) {
  if (artifact.format) return String(artifact.format).toLowerCase();
  var name = artifact.fileName || artifact.name || artifact.docTitle || '';
  var ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (['md','markdown'].includes(ext)) return 'md';
  if (['html','htm'].includes(ext)) return 'html';
  if (['js','ts','jsx','tsx','py','java','json','css','sh','sql'].includes(ext)) return 'code';
  return artifact.sections?.length ? 'md' : typeof artifact.content === 'string' ? 'code' : 'md';
}
export function artifactIcon(artifact) {
  if (artifact.format || artifact.fileName || artifact.name) {
    var format = artifactFormat(artifact);
    if (format === 'md') return _iconMarkdown;
    if (format === 'html') return _iconHtml;
    if (format === 'code') return _iconDocument;
  }
  return _artifactIcons[artifact.id] || ({ '需求文档':_iconMarkdown, '技术文档':_iconDoc, '开发成果':_iconHtml, '测试报告':_iconExcel, '交付报告':_iconPdf })[artifact.type] || _iconDocument;
}
export function artifactFileName(artifact, fallbackStem, index) {
  if (artifact.fileName || artifact.name) return artifact.fileName || artifact.name;
  var title = artifact.docTitle || artifact.type || '';
  if (/\.[a-z0-9]{1,8}$/i.test(title)) return title;
  var format = artifactFormat(artifact);
  var extension = format === 'html' ? 'html' : format === 'code' ? 'txt' : 'md';
  return (fallbackStem || 'artifact') + (index ? '-' + index : '') + '.' + extension;
}
export function artifactFormatLabel(artifact) {
  var name = artifact.fileName || artifact.name || '';
  var extension = name.includes('.') ? name.split('.').pop() : '';
  return (extension || artifactFormat(artifact)).toUpperCase();
}
