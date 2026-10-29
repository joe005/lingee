/* 本地开发 · 后台初始化任务（只存数据）。
   初始化弹窗里点「后台初始化」后弹窗关闭，初始化继续在后台跑；这里记录进行中的任务，
   导航上的进度气泡（jobs-bubble.js）按它展示，变化时广播 lingee:local-dev-jobs。
   同一空间同一时间只有一个任务。 */
var jobs = new Map();
function emit() { document.dispatchEvent(new CustomEvent('lingee:local-dev-jobs')); }
export function ldJobs() { return Array.from(jobs.values()); }
export function ldBackgroundJobs() { return ldJobs().filter(function (job) { return job.background; }); }
export function ldJobOf(projectId) { return jobs.get(projectId) || null; }
export function ldJobSet(projectId, patch) {
  var job = jobs.get(projectId) || { projectId:projectId, background:false, pulling:0 };
  Object.assign(job, patch);
  jobs.set(projectId, job);
  emit();
}
export function ldJobRemove(projectId) { if (jobs.delete(projectId)) emit(); }
