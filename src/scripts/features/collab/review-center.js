/* T00 挂载骨架：审核面板。数据与业务交互由后续任务实现，默认不展示。 */
let mount = null;

export function initReviewCenter() {
  mount = document.getElementById('cv-review-center');
}

export function renderReviewCenter(reviewId) {
  return { ok: false, error: { code: mount ? 'NOT_IMPLEMENTED' : 'MOUNT_MISSING', message: '审核面板尚未接入' } };
}
