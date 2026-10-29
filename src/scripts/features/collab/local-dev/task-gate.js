import { toast } from '../../../core/toast.js';
import { tkCurrentStageHandlerId, tkCurrentUserId, tkGetPerson, tkProjectById, tkUpdateTask } from '../../tasks-v2/data.js';
import { ldEsc, ldNow, ldPreflight, ldProjectStatus, ldRepoInfo } from './core.js';
import { ldOpenPrepDialog } from './prep-dialog.js';

/* 本地开发 · 任务启动前的执行前检查。
   按当前阶段处理人的设备状态判断（任务在处理人的电脑上执行），只读本机信息（见 core.js ldPreflight），不联网。
   已初始化：直接执行；未初始化时，处理人本人手动开始 → 打开「准备执行环境」，配好后接着执行；
   自动启动（阶段自动流转、保存并启动）或由别人触发 → 无人值守，转为已阻塞并写明原因，处理人在「待我处理」里点「去配置」。 */
function ldStartStage(task) {
  var plan = Array.isArray(task.executionPlan) ? task.executionPlan : [];
  return plan.find(function (row) { return row.id === task.executionStageId; })
    || plan.find(function (row) { return row.status !== 'done'; }) || null;
}
export function ldBlockTaskForEnv(task, reason) {
  var stage = ldStartStage(task);
  tkUpdateTask(task.id, {
    status:'blocked',
    executionStageId:stage ? stage.id : task.executionStageId,
    executionPlan:Array.isArray(task.executionPlan) ? task.executionPlan.map(function (row) { return stage && row.id === stage.id ? Object.assign({}, row, {status:'blocked'}) : row; }) : task.executionPlan,
    blockedRun:{ kind:'local-env', resumeStatus:task.status, agentName:'Lingee 客户端', failedAt:ldNow(), duration:'0秒',
      reason:'本地开发环境未就绪：' + reason + '。',
      next:'配置本地环境后自动继续执行。',
      steps:[['执行前环境自检', reason + '，未开始执行。']] },
    comments:(task.comments || []).concat({ kind:'comment', authorId:tkCurrentUserId(), createdAt:ldNow(), status:'blocked', assignee:task.assignee,
      text:'自动启动前检测到本地开发环境未就绪（' + reason + '），已转为已阻塞。' }),
  });
}
export function ldIsEnvBlocked(task) { return task?.status === 'blocked' && task.blockedRun?.kind === 'local-env'; }
/* 环境阻塞的任务恢复到阻塞前状态，再交给调用方重新开始执行 */
export function ldRestoreEnvBlocked(task) {
  if (!ldIsEnvBlocked(task)) return;
  var stage = ldStartStage(task);
  tkUpdateTask(task.id, {
    status:task.blockedRun.resumeStatus || 'backlog', blockedRun:null,
    executionPlan:Array.isArray(task.executionPlan) ? task.executionPlan.map(function (row) { return stage && row.id === stage.id ? Object.assign({}, row, {status:'pending'}) : row; }) : task.executionPlan,
  });
}
/* 返回 true 表示可以直接执行；false 时已按场景处理（打开准备执行环境或转阻塞） */
export function ldGateTaskStart(task, options) {
  if (!task || !['planned','backlog'].includes(task.status)) return true;
  var me = tkCurrentUserId();
  var handlerId = tkCurrentStageHandlerId(task) || me;
  var check = ldPreflight(task.project, handlerId), status = check.status;
  if (check.initialized) {
    if (status.auth?.expiring && handlerId === me) toast(ldEsc(status.info.host) + ' 的访问令牌将于 ' + ldEsc(status.auth.expiresAt) + ' 到期，到期后任务会鉴权失败，请到「设置」重新登录', 'warning');
    return true;
  }
  if (options?.automatic || handlerId !== me) {
    var reason = handlerId === me ? status.reason : (tkGetPerson(handlerId)?.name || '处理人') + ' 的电脑上' + status.reason;
    ldBlockTaskForEnv(task, reason);
    toast('「' + ldEsc(task.title) + '」未启动：本地环境未就绪', 'warning');
    return false;
  }
  ldOpenPrepDialog(task.project, { id:task.id, title:task.title }, options?.onReady);
  return false;
}

/* 原「本地环境配置」对话入口：由对话技能完成，一次只配置一个空间；onReady 在就绪后由对话里的「继续执行任务」调用 */
export function ldOpenSetup(projectId, options) {
  if (!ldRepoInfo(tkProjectById(projectId))) { toast('该空间未配置代码仓库，无需准备本地环境', 'warning'); return; }
  var invalid = ldProjectStatus(projectId);
  if (invalid.invalid) { toast(ldEsc(invalid.reason), 'warning'); return; }
  document.dispatchEvent(new CustomEvent('lingee:local-env-chat', { detail:{ projectIds:[projectId], onReady:options?.onReady || null } }));
}
