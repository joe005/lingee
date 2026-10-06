/* 任务代码分支：项目配置了 Git 仓库和基准分支时，项目下的开发任务按分支开发——
   开始执行时从基准分支拉取任务分支，审核通过（任务完成）后合并回基准分支。
   原型不接真实 Git，分支状态按任务状态推导，开发板块与管理板块共用这一口径。 */
import { tkProjectById } from './data.js';

var DEFAULT_BASE_BRANCHES = ['main', 'master', 'develop'];

/* 基准分支名：字母数字及 . _ / -，不能以 / 开头结尾、不能含 .. 或空格 */
function tkBranchNameError(name) {
  var v = String(name || '').trim();
  if (!v) return '请填写基准分支';
  if (!/^[A-Za-z0-9._/-]+$/.test(v) || /^\/|\/$|\.\.|\/\//.test(v)) return '分支名只能包含字母、数字及 . _ / -，且不能以 / 开头或结尾';
  return '';
}

function tkTaskBranchName(task) {
  return task.gitBranch || 'feature/' + String(task.code || ('t' + task.id)).toLowerCase();
}

/* 返回 null 表示该任务不走分支开发（项目未配置仓库或基准分支） */
function tkTaskBranch(task) {
  if (!task) return null;
  var project = tkProjectById(task.project);
  if (!project || !project.repo || !project.baseBranch) return null;
  var base = project.baseBranch;
  var branch = tkTaskBranchName(task);
  var started = !['planned', 'backlog'].includes(task.status) || !!task.executionStageId
    || (task.statusHistory || []).some(function (h) { return h && h.to === 'in_progress'; });
  var state = task.status === 'done'
    ? { key: 'merged', label: '已合并到 ' + base, hint: '审核通过后已合并回基准分支' }
    : task.status === 'cancelled'
      ? { key: 'closed', label: '已关闭', hint: '任务已取消，分支不合并' }
      : started
        ? { key: 'developing', label: '开发中', hint: '已从 ' + base + ' 拉取，审核通过后合并回 ' + base }
        : { key: 'pending', label: '待拉取', hint: '开始执行时从 ' + base + ' 拉取' };
  return { repo: project.repo, base: base, branch: branch, state: state };
}

export { DEFAULT_BASE_BRANCHES, tkBranchNameError, tkTaskBranch };
