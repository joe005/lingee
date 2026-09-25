/* T00 挂载骨架：我的工作。数据与业务交互由后续任务实现，默认不展示。 */
let mount = null;

export function initMyWork() {
  mount = document.getElementById('cv-my-work');
}

export function renderMyWork(context) {
  return { ok: false, error: { code: mount ? 'NOT_IMPLEMENTED' : 'MOUNT_MISSING', message: '我的工作尚未接入' } };
}
