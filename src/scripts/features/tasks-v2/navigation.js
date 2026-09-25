/* 跨页公共入口：仅分发给已注册的页面处理器，不修改页面内部 DOM。 */
let issueNavigation = null;

export function initIssueNavigation(handlers) {
  issueNavigation = handlers;
}

function dispatchIssueNavigation(name, id, options) {
  if (!issueNavigation) return { ok: false, error: { code: 'NOT_INITIALIZED', message: '任务页面尚未初始化' } };
  if (id === undefined || id === null || id === '') return { ok: false, error: { code: 'INVALID_ID', message: '缺少对象 ID' } };
  return issueNavigation[name](id, options);
}

export function openIssue(issueId, options = {}) {
  return dispatchIssueNavigation('issue', issueId, options);
}

export function openWorkItem(workItemId) {
  return dispatchIssueNavigation('workItem', workItemId);
}

export function openReview(reviewId) {
  return dispatchIssueNavigation('review', reviewId);
}
