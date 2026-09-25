/* T00 挂载骨架：执行计划。数据与业务交互由后续任务实现，默认不展示。 */
let mount = null;

export function initExecutionPlan() {
  mount = document.getElementById('cv-plan-overlay');
}

export function renderExecutionPlan(issueId) {
  return { ok: false, error: { code: mount ? 'NOT_IMPLEMENTED' : 'MOUNT_MISSING', message: '执行计划尚未接入' } };
}
