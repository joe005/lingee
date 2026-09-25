/* T00 挂载骨架：工作详情。数据与业务交互由后续任务实现，默认不展示。 */
let mount = null;

export function initWorkItemDetail() {
  mount = document.getElementById('cv-work-item-detail');
}

export function renderWorkItemDetail(workItemId) {
  return { ok: false, error: { code: mount ? 'NOT_IMPLEMENTED' : 'MOUNT_MISSING', message: '工作详情尚未接入' } };
}
