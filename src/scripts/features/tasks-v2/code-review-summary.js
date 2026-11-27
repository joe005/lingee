import { escapeHtml } from './ui-utils.js';
import { taskCodeDeliveryContext } from './code-delivery-context.js';

function field(label, value) {
  return '<div><dt>' + label + '</dt><dd>' + escapeHtml(value) + '</dd></div>';
}

export function codeReviewSummary(task, stageId) {
  const info = taskCodeDeliveryContext(task);
  if (!info) return '';
  const development = stageId === info.dev.id;
  const record = info.last;
  if (!development && (stageId !== info.test.id || !record)) return '';
  const delivered = development && !info.isDevelopment && record;
  const commit = delivered ? record.sourceCommit : info.sourceCommit;
  const selfTest = (development && !delivered ? task.developmentSelfTest : record?.selfTest);
  const evidence = selfTest && selfTest.commit === (development ? commit : record?.sourceCommit);
  let content, extra = '';
  if (development) {
    content = field('任务分支', delivered ? record.branch : info.branch)
      + field('交付提交', commit || '未记录') + field('合入目标', delivered ? record.target : info.target || '未配置')
      + field('开发自测', evidence ? selfTest.result : '未提供');
    if (evidence) extra += '<details><summary>查看用例结果</summary><p>' + escapeHtml(selfTest.details) + '</p></details>';
    if (info.isDevelopment && info.pending) extra += '<p class="tk-cd-state">评审已通过 · 待仓库合并</p>';
    if (delivered) extra += '<p class="tk-cd-state">已合入 ' + escapeHtml(record.target + ' · ' + record.mergeCommit) + '</p>';
  } else {
    content = field('测试环境', '团队共享测试环境') + field('待验版本', record.target + ' · ' + record.mergeCommit)
      + field('开发自测', evidence ? selfTest.result : '未提供');
    if (task.branchMergeDemoKey) {
      extra += '<button type="button" class="tk-cd-link" data-cd-environment="' + task.id + '">打开环境</button>';
    } else if (/^https?:\/\//i.test(task.testEnvironmentUrl || '')) {
      extra += '<a class="tk-cd-link" target="_blank" rel="noopener noreferrer" href="' + escapeHtml(task.testEnvironmentUrl) + '">打开环境</a>';
    }
    if (task.status !== 'done' && info.isTesting) extra += '<p class="tk-cd-state">请确认环境已包含待验版本后再验收。</p>';
  }
  return '<section class="tk-cd-summary" aria-label="' + (development ? '开发交付' : '共享环境验收') + '"><dl>' + content + '</dl>' + extra + '</section>';
}
