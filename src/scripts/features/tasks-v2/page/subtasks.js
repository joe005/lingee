import { toast } from '../../../core/toast.js';
import { createDeliveryActivity } from '../../collab/delivery-activity.js';
import { EX, EXPERTS, xav } from '../../expert/data.js';
import { taskExecutorTeam } from '../../expert/task-team.js';
import { TK_PRIORITIES, TK_STATUSES, tkCanViewTask, tkGetPerson, tkGetStatusName, tkGetStatusObj, tkGetTaskArtifacts, tkGetTasks, tkPeopleInProject, tkProjectById, tkProjectsForCurrentUser } from '../data.js';
import { taskListKind } from '../list-kind.js';
import { getDemoPreRun, getDemoStageRun } from '../run-feedback.js';
import { taskExecutionStages } from '../task-execution.js';
import { tkGetMySessions, tkTaskSessionTitle } from '../task-sessions.js';
import { closeDocPreview, closeTaskLabelPicker, propPicker, renderDocPreviewPanel, renderTaskArtifact, renderTaskLabelTrigger, syncDrawerClickaway } from './detail-panel.js';
import { closeMentionPanel } from './mention.js';
import { pageState } from './page-state.js';
import { els, renderTaskStartAction, state, subtaskSectionExpanded } from './state.js';
import { escapeHtml, statusSvg } from './utils.js';
/* 任务页 · 详情面板的子任务区与活动记录（拆分自 tasks-v2/index.js，逻辑未改） */
/* ---------- 子任务区域渲染（参考 Multica ProgressRing + ChevronDown） ---------- */
function renderSubtasksSection(t) {
  var children = tkGetTasks().filter(function (c) { return c.parentId === t.id && tkCanViewTask(c); });
  if (!children.length) {
    return '<div class="tk-subtasks tk-subtasks-empty"><button type="button" class="tk-subtask-empty-add" data-drawer-subtask="' + t.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>添加子任务</span></button></div>';
  }
  var expanded = subtaskSectionExpanded.has(t.id) ? subtaskSectionExpanded.get(t.id) : true;
  var doneCount = children.filter(function (c) { return c.status === 'done'; }).length;
  var prog = children.length ? Math.round(doneCount / children.length * 100) : 0;
  var ringR = 7, ringC = 2 * Math.PI * ringR;
  var ringOffset = ringC * (1 - prog / 100);
  return '<div class="tk-subtasks' + (expanded ? '' : ' is-collapsed') + '">'
    + '<div class="tk-subtask-head">'
    + '<button type="button" class="tk-subtask-toggle" data-subtask-toggle="' + t.id + '" aria-expanded="' + expanded + '" aria-controls="tkSubtaskList"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg><span>子任务</span></button>'
    + '<svg class="tk-subtask-progress-ring" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="' + ringR + '" fill="none" stroke="var(--fill-2)" stroke-width="2"/><circle cx="8" cy="8" r="' + ringR + '" fill="none" stroke="var(--brand)" stroke-width="2" stroke-dasharray="' + ringC.toFixed(1) + '" stroke-dashoffset="' + ringOffset.toFixed(1) + '" stroke-linecap="round" transform="rotate(-90 8 8)"/></svg><span class="tk-subtask-badge">' + doneCount + '/' + children.length + '</span>'
    + '<button type="button" class="tk-subtask-add-btn" data-drawer-subtask="' + t.id + '" data-tooltip="添加子任务" aria-label="添加子任务"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>'
    + '</div>'
    + '<div class="tk-subtask-list" id="tkSubtaskList"' + (expanded ? '' : ' hidden') + '>'
    + children.map(function (c) {
        var st = tkGetStatusObj(c.status);
        return '<button type="button" class="tk-subtask-row" data-subtask-open="' + c.id + '"><span class="tk-subtask-status" data-tooltip="' + escapeHtml(st.name || '待处理') + '" role="img" aria-label="' + escapeHtml(st.name || '待处理') + '">' + statusSvg(c.status) + '</span><span class="tk-subtask-title">' + escapeHtml(c.title) + '</span><span class="tk-subtask-meta">' + escapeHtml(tkGetPerson(c.assignee).name) + '</span></button>';
      }).join('')
    + '</div></div>';
}

function renderDemoReviewReport(t, artifacts) {
  var report = t.reviewReport;
  if (!report) return '';
  return '<section class="tk-agent-report" aria-label="智能体执行结果报告">'
    + '<div class="tk-agent-report-head"><span class="tk-agent-report-mark" aria-hidden="true">✦</span><div class="tk-agent-report-heading"><strong>' + escapeHtml(report.teamName) + '</strong><span>智能体团队执行结果报告</span></div><span class="tk-agent-report-state">' + (t.status === 'in_review' ? '待人工审核' : '已提交') + '</span></div>'
    + '<div class="tk-agent-report-meta">' + escapeHtml(report.runId) + ' · ' + escapeHtml(report.completedAt) + '</div>'
    + '<p class="tk-agent-report-summary">' + escapeHtml(report.summary) + '</p>'
    + '<div class="tk-agent-report-label">交付与验证</div><ul class="tk-agent-report-evidence">' + report.evidence.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul>'
    + '<div class="tk-agent-report-review"><strong>请人工审核</strong><span>' + escapeHtml(report.review) + '</span></div>'
    + '<details class="tk-agent-report-members"><summary>查看 ' + report.members.length + ' 个智能体的执行记录</summary><div class="tk-agent-report-member-list">'
    + report.members.map(function (member) { return '<div class="tk-agent-report-member"><span class="tk-agent-report-avatar">' + escapeHtml(member.name.slice(0, 1)) + '</span><div><div class="tk-agent-report-member-name">' + escapeHtml(member.name) + (member.lead ? '<em>组长</em>' : '') + '</div><p>' + escapeHtml(member.result) + '</p></div></div>'; }).join('')
    + '</div></details></section>';
}

function renderDemoBlockedRun(t, artifacts) {
  var run = t.blockedRun;
  if (!run) return '';
  return '<section class="tk-blocked-run" aria-label="智能体失败运行记录">'
    + '<div class="tk-blocked-run-top"><span class="tk-blocked-run-avatar" aria-hidden="true">' + escapeHtml(run.agentName.slice(0, 1)) + '</span>'
    + '<div class="tk-blocked-run-main"><div class="tk-blocked-run-identity"><strong>' + escapeHtml(run.agentName) + '</strong><span>' + escapeHtml(run.teamName) + '</span></div>'
    + '<div class="tk-blocked-run-summary"><span class="tk-blocked-run-failed" role="status"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 4.5v4M8 11.2h.01"/></svg>运行失败</span>'
    + '<span class="tk-blocked-run-duration">' + escapeHtml(run.duration) + '</span><span class="tk-blocked-run-date">' + escapeHtml(run.failedAt) + '</span></div>'
    + '<p class="tk-blocked-run-reason">' + escapeHtml(run.reason) + '</p>'
    + '<details class="tk-blocked-run-activity"><summary>查看动态 · ' + run.steps.length + ' 个步骤<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></summary>'
    + '<ol class="tk-blocked-run-steps">' + run.steps.map(function (step, index) { return '<li class="' + (index === run.steps.length - 1 ? 'is-failed' : '') + '"><span class="tk-blocked-run-step-icon" aria-hidden="true">' + (index === run.steps.length - 1 ? '!' : '✓') + '</span><div><strong>' + escapeHtml(step[0]) + '</strong><p>' + escapeHtml(step[1]) + '</p></div></li>'; }).join('') + '</ol></details>'
    + '<div class="tk-blocked-run-next"><strong>下一步</strong><span>' + escapeHtml(run.next) + '</span></div>'
    + (t.status === 'blocked' ? '<button type="button" class="tk-blocked-run-retry" data-action="blocked-retry"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M13 7a5 5 0 1 1-1.5-3.5M13 2v4H9"/></svg>重试任务</button>' : '')
    + '</div></div></section>';
}

function renderDemoCompletedRun(t, artifacts) {
  var run = t.completedRun;
  if (!run) return '';
  return '<section class="tk-blocked-run tk-completed-run" aria-label="智能体成功运行记录">'
    + '<div class="tk-blocked-run-top"><span class="tk-blocked-run-avatar" aria-hidden="true">' + escapeHtml(run.agentName.slice(0, 1)) + '</span>'
    + '<div class="tk-blocked-run-main"><div class="tk-blocked-run-identity"><strong>' + escapeHtml(run.agentName) + '</strong><span>' + escapeHtml(run.teamName) + '</span></div>'
    + '<div class="tk-blocked-run-summary"><span class="tk-blocked-run-failed" role="status"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="m5 8 2 2 4-4"/></svg>运行完成</span>'
    + '<span class="tk-blocked-run-duration">' + escapeHtml(run.duration) + '</span><span class="tk-blocked-run-date">' + escapeHtml(run.completedAt) + '</span></div>'
    + '<p class="tk-blocked-run-reason">' + escapeHtml(run.result) + '</p>'
    + '<details class="tk-blocked-run-activity"><summary>查看动态 · ' + run.steps.length + ' 个步骤<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></summary>'
    + '<ol class="tk-blocked-run-steps">' + run.steps.map(function (step) { return '<li><span class="tk-blocked-run-step-icon" aria-hidden="true">✓</span><div><strong>' + escapeHtml(step[0]) + '</strong><p>' + escapeHtml(step[1]) + '</p></div></li>'; }).join('') + '</ol></details>'
    + '</div></div></section>';
}

function renderTaskRunIndicator(status) {
  if (status === 'running' || status === 'dispatched') return '<svg class="tk-feed-run-spinner" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 1.5a6.5 6.5 0 1 1-6.5 6.5"/></svg>';
  if (status === 'queued') return '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 4.5v4l2.5 1.5"/></svg>';
  if (status === 'waiting_local_directory') return '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M6 5v6m4-6v6"/></svg>';
  return statusSvg(status === 'failed' ? 'blocked' : status === 'cancelled' ? 'cancelled' : 'done');
}

function renderTaskRunFeedback(run, hideActiveIndicator) {
  var active = ['queued','dispatched','waiting_local_directory','running'].includes(run.status);
  var summary = active ? run.summary : '查看执行过程 · ' + run.steps.length + ' 个步骤';
  return '<details class="tk-feed-run tk-feed-run--' + run.status + '"><summary aria-label="' + escapeHtml(run.label + '，' + summary) + '">'
    + (active && hideActiveIndicator ? '' : '<span class="tk-feed-run-indicator" aria-hidden="true">' + renderTaskRunIndicator(run.status) + '</span>')
    + (active ? '<span class="sr-only">' + escapeHtml(run.label) + '</span>' : '<span class="tk-feed-run-status">' + escapeHtml(run.label) + '</span>')
    + '<span class="tk-feed-run-summary"' + (active ? ' role="status"' : '') + ' title="' + escapeHtml(summary) + '">' + escapeHtml(summary) + '</span>'
    + (run.steps.length ? '<span class="tk-feed-run-duration">' + escapeHtml(run.duration) + '</span>' : '')
    + '<svg class="tk-feed-run-chevron" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></summary>'
    + '<div class="tk-feed-run-steps">' + (run.steps.length ? run.steps.map(function (step) {
      var kindLabel = ({thinking:'思考',tool:'执行',result:'结果',error:'错误'})[step.kind] || '步骤';
      return '<details class="tk-feed-run-step is-' + step.state + '"><summary><span class="tk-feed-step-icon" aria-hidden="true">' + (step.state === 'failed' ? '!' : step.state === 'running' ? '◌' : '✓') + '</span>'
        + '<span class="tk-feed-step-summary" title="' + escapeHtml(step.summary) + '">' + escapeHtml(step.summary) + '</span><small>' + kindLabel + '</small>'
        + '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></summary>'
        + '<p>' + escapeHtml(step.detail) + '</p></details>';
    }).join('') : '<p class="tk-feed-run-empty">暂无执行记录。</p>') + '</div></details>';
}

function renderTaskAgentFeedEntry(task, entry, artifacts) {
  var expert = EXPERTS.find(function (item) { return item.id === entry.expertId; });
  var stageArtifacts = artifacts.filter(function (artifact) { return artifact.stageId === entry.stageId; });
  var showRunFeedback = entry.state === 'running' || entry.state === 'blocked';
  return '<article class="tk-feed-card tk-feed-card--agent is-' + entry.state + '" aria-label="智能体执行：' + escapeHtml(entry.stage) + '">'
    + '<header class="tk-feed-card-head tk-feed-card-head--agent"><img class="tk-feed-avatar tk-feed-avatar--agent" src="' + escapeHtml(xav(expert?.k)) + '" alt="">'
    + '<strong>' + escapeHtml(entry.author) + '</strong><span class="tk-feed-run-stage">· ' + escapeHtml(entry.stage) + '</span><time>' + escapeHtml(entry.time) + '</time></header>'
    + '<div class="tk-feed-card-content">'
    + (showRunFeedback ? renderTaskRunFeedback(getDemoStageRun(task, entry), true) : '')
    + (entry.state === 'running' ? '' : '<p class="' + (entry.state === 'blocked' ? 'tk-feed-run-error' : '') + '">' + escapeHtml(entry.state === 'blocked' ? task.blockedRun?.reason || entry.text : entry.text) + '</p>')
    + (stageArtifacts.length ? '<div class="tk-delivery-artifacts"><div class="tk-artifacts-list">'
      + stageArtifacts.map(renderTaskArtifact).join('') + '</div></div>' : '')
    + '</div></article>';
}

function renderTaskTeamAvatarGroup(team) {
  var members = (team?.members || []).map(function (id) { return EX[id]; }).filter(Boolean);
  if (!members.length) return '<span class="tk-exec-card-mark tk-agent-report-mark" aria-hidden="true">团</span>';
  return '<span class="tk-exec-team-avatars" role="img" aria-label="' + escapeHtml(team.name + '，' + members.map(function (member) { return member.name; }).join('、')) + '">'
    + members.slice(0, 4).map(function (member) { return '<img src="' + xav(member.k) + '" alt="" title="' + escapeHtml(member.name) + '">'; }).join('')
    + (members.length > 4 ? '<span class="tk-exec-team-avatars-more" aria-hidden="true">+' + (members.length - 4) + '</span>' : '') + '</span>';
}
function renderTaskDeliveryOverview(task, activity, artifacts, stageHistoryHtml, stageCount, reportHtml) {
  var stages = activity.filter(function (entry) { return entry.expertId; });
  if (!stages.length && !activity.length) return reportHtml || '';
  var plannedStages = taskExecutionStages(task);
  var mySessions = pageState.taskDetailVersion === 'latest' ? tkGetMySessions(task) : [];
  var latest = stages.at(-1);
  var byId = new Map(stages.map(function (entry) { return [entry.stageId, entry]; }));
  var currentState = latest?.state || (task.status === 'cancelled' ? 'cancelled' : 'pending');
  var activeRun = currentState === 'running' ? getDemoStageRun(task, latest) : null;
  var currentIndex = task.status === 'done' || task.status === 'cancelled' ? -1 : Math.max(0,plannedStages.findIndex(function (stage) { return stage.id === task.executionStageId; }));
  var project = tkProjectById(task.project);
  var team = taskExecutorTeam(task, project);
  var currentDetail = latest ? latest.stage + ' · ' + latest.author : '尚未分派执行智能体';
  var latestLayout = pageState.taskDetailVersion === 'latest';
  var kindInfo = taskListKind(task);
  var feedback = activeRun ? renderTaskRunFeedback(activeRun)
    : latest ? '<div class="tk-exec-feedback-line is-' + currentState + '"><span class="tk-exec-feedback-icon" aria-hidden="true">' + renderTaskRunIndicator(currentState === 'blocked' ? 'failed' : 'completed') + '</span>'
      + '<p>' + escapeHtml(currentState === 'blocked' ? task.blockedRun?.reason || latest.text : currentState === 'review' ? task.reviewReport?.review || latest.text : task.completedRun?.result || latest.text) + '</p>'
      + '<time>' + escapeHtml(latest.time) + '</time></div>'
    : renderTaskPreRunFeedback(task);
  var nextAction = currentState === 'blocked' && task.blockedRun ? '<div class="tk-exec-next"><strong>下一步</strong><span>' + escapeHtml(task.blockedRun.next) + '</span>'
    + '<button type="button" class="tk-blocked-run-retry" data-action="blocked-retry">重试任务</button></div>' : '';
  var historyButton = stageCount > (latestLayout ? 1 : 0) ? '<div class="tk-exec-card-more"><button type="button" class="tk-feed-stage-history-toggle" data-stage-history-toggle aria-expanded="false" aria-controls="' + (latestLayout ? 'tkOlderStageHistory' : 'tkStageHistory') + '">' + (latestLayout ? '展开明细' : '查看过程明细') + '</button></div>' : '';
  return '<section class="tk-feed-stage-overview tk-exec-card is-' + currentState + '" aria-label="执行概览">'
    + '<div class="tk-exec-card-head tk-agent-report-head">' + (pageState.taskDetailVersion === 'latest' ? renderTaskTeamAvatarGroup(team) : '<span class="tk-exec-card-mark tk-agent-report-mark" aria-hidden="true">✦</span>') + '<div class="tk-exec-card-identity tk-agent-report-heading"><strong>' + escapeHtml(team?.name || '任务智能体团队') + '</strong>'
     + (pageState.taskDetailVersion === 'v1' ? '<span>当前阶段 · ' + escapeHtml(currentDetail) + '</span>' : '') + '</div></div>'
     + '<div class="tk-feed-stage-overview-head"><strong>执行计划</strong></div>'
    + (latestLayout ? '<div class="tk-feed-stage-table-wrap"><table class="tk-feed-stage-table"><caption class="sr-only">执行计划</caption><colgroup><col class="tk-stage-col-mark"><col class="tk-stage-col-name"><col class="tk-stage-col-expert"><col class="tk-stage-col-assignee"><col class="tk-stage-col-state"><col class="tk-stage-col-actions"></colgroup><thead class="sr-only"><tr><th>标记</th><th>阶段</th><th>执行智能体</th><th>处理人</th><th>状态</th><th>操作</th></tr></thead><tbody>' : '<ol class="tk-feed-stage-list">') + plannedStages.map(function (stage, index) {
      var entry = byId.get(stage.id);
      var state = entry?.state || 'pending';
      var label = state === 'done' ? '已完成' : state === 'running' ? '执行中' : state === 'review' ? '待审核' : state === 'blocked' ? '已阻塞' : index === currentIndex && task.status === 'backlog' && task.executionStageId ? '待开始' : '未开始';
      var assignee = tkGetPerson(stage.assigneeId || task.assignee).name;
      var isCurrent = index === currentIndex;
      var expert = entry && EXPERTS.find(function (item) { return item.id === entry.expertId; });
      var stageArtifacts = latestLayout && entry && ['done', 'review'].includes(state)
        ? artifacts.filter(function (artifact) { return artifact.stageId === stage.id; }) : [];
      var detailId = 'tkStageDetail' + index;
      var sessionListId = 'tkStageSessions' + index;
      var showExpert = latestLayout && !!entry;
      var hasDetail = latestLayout && stageArtifacts.length > 0;
      /* 待审核阶段默认展开产物，审核人无需再点「查看产物」。 */
      var inReviewStage = task.status === 'in_review' && state === 'review';
      var stageSessions = latestLayout && state !== 'done' && state !== 'pending' ? mySessions.filter(function (session) {
        return session.stageId === stage.id || (!session.stageId && isCurrent);
      }) : [];
      if (!latestLayout) return '<li class="tk-feed-stage is-' + state + (isCurrent ? ' is-current' : '') + '" aria-label="' + escapeHtml(stage.name + '，处理人' + assignee + '，' + label) + '"' + (isCurrent ? ' aria-current="step"' : '') + '><span class="tk-feed-stage-mark" aria-hidden="true"></span><span class="tk-feed-stage-name">' + escapeHtml(stage.name) + '</span><span class="tk-feed-stage-assignee" title="处理人：' + escapeHtml(assignee) + '">处理人 <b>' + escapeHtml(assignee) + '</b></span><span class="tk-feed-stage-state">' + label + '</span>' + (isCurrent ? '<span class="tk-feed-stage-current-tag">当前</span>' : '') + '</li>';
      var stageAction = isCurrent && kindInfo.primary ? {
        start:{attr:'data-stage-start', label:'交给AI执行'}, review:{attr:'data-stage-review', label:'前往确认'},
        reply:{attr:'data-stage-answer', label:'回答提问'}, retry:{attr:'data-stage-retry', label:'重试'},
      }[kindInfo.action] : null;
      var stageActionHtml = stageAction
        ? '<button type="button" class="tk-feed-stage-review-btn" ' + stageAction.attr + '="' + task.id + '" aria-label="' + stageAction.label + '：' + escapeHtml(stage.name) + '">' + stageAction.label + '</button>' : '';
      /* 已阻塞节点不单设「查看会话」，会话和执行异常在节点下方的会话列表里展开查看 */
      var actions = (stageActionHtml ? '<span class="tk-feed-stage-review-actions">' + stageActionHtml + '</span>' : '')
        + (hasDetail && !inReviewStage ? '<button type="button" class="tk-feed-stage-expand" data-stage-detail-toggle aria-expanded="false" aria-controls="' + detailId + '" aria-label="展开' + escapeHtml(stage.name) + '的产物"><span>查看产物</span><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></button>' : '');
      var sessionsHtml = state !== 'done' && stageSessions.length ? '<div class="tk-feed-stage-sessions" aria-label="' + escapeHtml(stage.name) + '的会话">'
          + '<button type="button" class="tk-feed-stage-sessions-toggle" data-stage-sessions-toggle aria-expanded="' + isCurrent + '" aria-controls="' + sessionListId + '">会话 ' + stageSessions.length + '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></button>'
          + '<div class="tk-feed-stage-sessions-list" id="' + sessionListId + '"' + (isCurrent ? '' : ' hidden') + '>' + stageSessions.map(function (session) {
            return '<div class="tk-feed-stage-session"><span class="tk-feed-stage-session-title" title="' + escapeHtml(tkTaskSessionTitle(session)) + '">' + escapeHtml(tkTaskSessionTitle(session)) + '</span><button type="button" data-stage-session-open="' + session.id + '">查看</button></div>';
          }).join('') + '</div></div>' : '';
      var detailHtml = hasDetail ? '<div class="tk-feed-stage-detail" id="' + detailId + '"' + (inReviewStage ? '' : ' hidden') + '><div class="tk-delivery-artifacts"><div class="tk-artifacts-list">' + stageArtifacts.map(renderTaskArtifact).join('') + '</div></div></div>' : '';
      return '<tr class="tk-feed-stage-row is-' + state + (isCurrent ? ' is-current' : '') + (sessionsHtml ? ' has-extra' : '') + '"' + (isCurrent ? ' aria-current="step"' : '') + '>'
        + '<td class="tk-stage-cell-mark"><span class="tk-feed-stage-mark" aria-hidden="true"></span></td>'
        + '<th scope="row" class="tk-feed-stage-main" colspan="4"><div class="tk-feed-stage-line"><span class="tk-feed-stage-name">' + escapeHtml(stage.name) + '</span>'
        + (isCurrent && state === 'running' && task.status === 'in_progress'
          ? '<button type="button" class="tk-feed-stage-state tk-feed-stage-state-action" data-stage-submit="' + escapeHtml(stage.id) + '" aria-label="' + escapeHtml(stage.name) + '执行完成，转为待审核" title="点击模拟 Agent 完成">' + label + '</button>'
          : '<span class="tk-feed-stage-state">' + label + '</span>') + '</div>'
        + (showExpert ? '<div class="tk-feed-stage-meta"><span class="tk-feed-stage-expert-content" title="执行智能体：' + escapeHtml(entry.author) + '"><img src="' + escapeHtml(xav(expert?.k)) + '" alt=""><span>' + escapeHtml(entry.author) + '</span></span></div>' : '') + '</th>'
        + '<td class="tk-stage-cell-actions">' + actions + '</td></tr>'
        + (sessionsHtml || detailHtml ? '<tr class="tk-feed-stage-extra is-' + state + (isCurrent ? ' is-current' : '') + '"' + (sessionsHtml || inReviewStage ? '' : ' hidden') + '><td colspan="6">' + sessionsHtml + detailHtml + '</td></tr>' : '');
    }).join('') + (latestLayout ? '</tbody></table></div>' : '</ol>')
    + (latestLayout ? '' : '<div class="tk-exec-card-feedback">' + feedback + nextAction + '</div>')
    + (latestLayout ? '' : historyButton + stageHistoryHtml) + '</section>';
}

function renderTaskPreRunFeedback(task) {
  var pending = getDemoPreRun(task);
  if (!pending) return '';
  return '<div class="tk-feed-pre-run" role="status"><span class="tk-feed-run-indicator" aria-hidden="true">' + renderTaskRunIndicator(task.status === 'cancelled' ? 'cancelled' : 'queued') + '</span>'
    + '<div><strong>' + escapeHtml(pending.label) + '</strong><p>' + escapeHtml(pending.summary) + '</p></div></div>';
}

function renderTaskHumanFeedEntry(event) {
  var entry = event.entry;
  var author = event.type === 'delivery' ? entry.author : tkGetPerson(entry.authorId).name;
  var content = event.type === 'delivery' ? entry.text : entry.text || '';
  return '<article class="tk-feed-card tk-feed-card--human" aria-label="' + escapeHtml(author) + '的评论">'
    + '<header class="tk-feed-card-head"><span class="tk-feed-avatar tk-feed-avatar--human" aria-hidden="true">' + escapeHtml(author.slice(0, 1)) + '</span>'
    + '<strong>' + escapeHtml(author) + '</strong><time>' + escapeHtml(event.time) + '</time></header>'
    + '<div class="tk-feed-card-content">'
    + '<p>' + escapeHtml(content) + '</p></div></article>';
}

function feedLeadIcon(event) {
  var entry = event.entry;
  if (event.type === 'status') return statusSvg(entry.to);
  if (event.type === 'delivery') {
    var sid = entry.stageId || '';
    if (sid === 'status-flow' || /状态/.test(entry.stage)) return statusSvg('in_progress');
    if (sid === 'kickoff' || /创建/.test(entry.stage)) return statusSvg('planned');
    if (sid === 'assignee') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="color:var(--text-soft);flex:none"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
    return '<span class="tk-feed-activity-avatar" aria-hidden="true">' + escapeHtml((entry.author || '?').slice(0, 1)) + '</span>';
  }
  return statusSvg(entry.status || 'in_progress');
}

function taskStatusActivityEvents(task, activity) {
  var lastExpert = activity.filter(function (entry) { return entry.expertId; }).at(-1);
  var initialStatus = task.initialStatus || task.status;
  var creator = tkGetPerson(task.createdBy).name;
  var assignee = tkGetPerson(task.assignee).name;
  var transitions = [];
  function add(from, to, time, author) {
    transitions.push({ type:'status', time:time, entry:{ from:from, to:to, author:author } });
  }
  /* 预置任务自带状态历史时以历史为准，不再补同一目标状态的推断记录。 */
  var recorded = new Set((task.statusHistory || []).map(function (change) { return change.to; }));
  if (lastExpert && ['in_review','done'].includes(initialStatus) && !recorded.has('in_review')) {
    add('in_progress', 'in_review', task.reviewReport?.completedAt || task.createDate + ' 16:40', lastExpert.author);
  }
  if (initialStatus === 'done' && !recorded.has('done')) add('in_review', 'done', task.createDate + ' 17:00', assignee);
  if (initialStatus === 'blocked' && lastExpert && !recorded.has('blocked')) add('in_progress', 'blocked', lastExpert.time, lastExpert.author);
  if (initialStatus === 'cancelled') add('backlog', 'cancelled', task.createDate + ' 09:16', creator);
  (task.statusHistory || []).forEach(function (change) {
    add(change.from, change.to, change.time, tkGetPerson(change.authorId).name);
  });
  return transitions;
}

function taskActivityMessage(event) {
  var entry = event.entry;
  if (event.type === 'status') return '状态从 ' + tkGetStatusName(entry.from) + ' 改为 ' + tkGetStatusName(entry.to);
  if (event.type === 'delivery') {
    if (entry.stageId === 'kickoff') return '创建了这个任务';
    if (entry.stageId === 'status-flow') return '状态从 ' + tkGetStatusName('backlog') + ' 改为 ' + tkGetStatusName('in_progress');
    if (entry.stageId === 'assignee') {
      var assigneeName = entry.text.match(/「([^」]+)」/)?.[1];
      return assigneeName ? '分配给 ' + assigneeName : '更改了负责人';
    }
    return entry.stage + ' · ' + entry.text;
  }
  if (entry.kind === 'flow' || (!entry.kind && entry.assignee)) {
    var flowMessage = '流转给 ' + tkGetPerson(entry.assignee).name;
    if (entry.fromStatus && entry.status && entry.fromStatus !== entry.status) {
      flowMessage = '状态从 ' + tkGetStatusName(entry.fromStatus) + ' 改为 ' + tkGetStatusName(entry.status) + '，' + flowMessage;
    }
    return flowMessage + (entry.text ? '：' + entry.text : '');
  }
  if (entry.kind === 'status' && entry.fromStatus) return '状态从 ' + tkGetStatusName(entry.fromStatus) + ' 改为 ' + tkGetStatusName(entry.status);
  return entry.text || '更新了任务';
}

export var _expandedActivityIds = new Set();
export var _collapsedActivityIds = new Set();
export var _showOlderActivityIds = new Set();
var ACTIVITY_VISIBLE_LIMIT = 8;

function renderTaskSystemFeedGroup(events, isLatest) {
  var id = 'act-' + events[0].time.replace(/[^0-9]/g, '') + '-' + events.length;
  var userExpanded = _expandedActivityIds.has(id);
  var userCollapsed = _collapsedActivityIds.has(id);
  var expanded = userExpanded ? true : userCollapsed ? false : true;
  var count = events.length;
  if (!expanded) {
    return '<div class="tk-feed-activity-block" data-activity-id="' + id + '">'
      + '<button type="button" class="tk-feed-activity-toggle" data-activity-toggle="' + id + '"><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m6 3 5 5-5 5"/></svg>'
      + '<span>' + count + ' 条操作记录</span></button></div>';
  }
  var hiddenOlder = isLatest && !_showOlderActivityIds.has(id) && count > ACTIVITY_VISIBLE_LIMIT
    ? count - ACTIVITY_VISIBLE_LIMIT : 0;
  var visible = hiddenOlder > 0 ? events.slice(-ACTIVITY_VISIBLE_LIMIT) : events;
  var showHeader = hiddenOlder === 0;
  return '<div class="tk-feed-activity-block" data-activity-id="' + id + '">'
    + (showHeader ? '<button type="button" class="tk-feed-activity-toggle" data-activity-toggle="' + id + '"><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m3 6 5 5 5-5"/></svg><span>' + count + ' 条操作记录</span></button>' : '')
    + (hiddenOlder > 0 ? '<button type="button" class="tk-feed-activity-toggle tk-feed-activity-more" data-activity-older="' + id + '"><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m6 3 5 5-5 5"/></svg><span>显示更多旧动态（' + hiddenOlder + ' 条）</span></button>' : '')
    + '<div class="tk-feed-activity-rows">'
    + visible.map(function (event) {
      var entry = event.entry;
      var author = event.type === 'delivery' || event.type === 'status' ? entry.author : tkGetPerson(entry.authorId).name;
      var message = taskActivityMessage(event);
      return '<div class="tk-feed-activity-row"><span class="tk-feed-activity-lead">' + feedLeadIcon(event) + '</span>'
        + '<strong>' + escapeHtml(author) + '</strong><span class="tk-feed-activity-message" title="' + escapeHtml(message) + '">' + escapeHtml(message) + '</span>'
        + '<time>' + escapeHtml(event.time) + '</time></div>';
    }).join('') + '</div></div>';
}

function renderAgentStageComment(task, entry) {
  var expert = EXPERTS.find(function (item) { return item.id === entry.expertId; });
  var showRunFeedback = !!entry.run;
  return '<article class="tk-feed-card tk-feed-card--agent is-' + entry.state + '" aria-label="智能体执行：' + escapeHtml(entry.stage) + '">'
    + '<header class="tk-feed-card-head tk-feed-card-head--agent"><img class="tk-feed-avatar tk-feed-avatar--agent" src="' + escapeHtml(xav(expert?.k)) + '" alt="">'
    + '<strong>' + escapeHtml(entry.author) + '</strong><span class="tk-feed-run-stage">· ' + escapeHtml(entry.stage) + '</span><time>' + escapeHtml(entry.createdAt) + '</time></header>'
    + '<div class="tk-feed-card-content">'
    + (showRunFeedback ? renderTaskRunFeedback(entry.run) : '')
    + '<p>' + escapeHtml(entry.text) + '</p>'
    + (entry.artifacts && entry.artifacts.length ? '<div class="tk-delivery-artifacts"><div class="tk-artifacts-list">'
      + entry.artifacts.map(renderTaskArtifact).join('') + '</div></div>' : '')
    + '</div></article>';
}
function renderTaskComments(t) {
  var comments = t.comments || [];
  var project = tkProjectById(t.project);
  var activity = createDeliveryActivity(t, project, {
    creator:tkGetPerson(t.createdBy).name,
    blockedReason:t.blockedRun?.reason,
    assigneeName:tkGetPerson(t.assignee).name,
  });
  var latestLayout = pageState.taskDetailVersion === 'latest';
  var deliveredStages = new Map(activity.filter(function (entry) {
    return entry.expertId && (entry.state === 'done' || (latestLayout && entry.state === 'review'));
  }).map(function (entry) { return [entry.stageId, entry]; }));
  var artifacts = tkGetTaskArtifacts(t).filter(function (artifact) { return deliveredStages.has(artifact.stageId); }).map(function (artifact) {
    return latestLayout ? Object.assign({}, artifact, {author:deliveredStages.get(artifact.stageId).author}) : artifact;
  });
  var reportHtml = renderDemoReviewReport(t, artifacts) + renderDemoBlockedRun(t, artifacts) + renderDemoCompletedRun(t, artifacts);
  var events = activity.map(function (entry, index) {
    return { type:'delivery', time:entry.time, index:index, entry:entry };
  }).concat(taskStatusActivityEvents(t, activity).map(function (event, index) {
    return Object.assign({index:activity.length + index}, event);
  }), comments.map(function (entry, index) {
    return { type:'comment', time:entry.createdAt || '', index:activity.length + 10 + index, entry:entry };
  })).sort(function (left, right) {
    return left.time.localeCompare(right.time) || left.index - right.index;
  });
  if (!events.length) return reportHtml || '<div class="tk-drawer-comments-empty">暂无动态</div>';
  var sections = [];
  events.forEach(function (event) {
    var isAgent = event.type === 'delivery' && event.entry.expertId;
    var isAgentComment = event.type === 'comment' && event.entry.kind === 'agent-stage';
    var isComment = event.type === 'comment' && event.entry.kind === 'comment';
    if (!isAgent && !isAgentComment && !isComment) {
      var previous = sections[sections.length - 1];
      if (previous?.kind === 'system') previous.events.push(event);
      else sections.push({ kind:'system', events:[event] });
    } else if (isAgentComment) {
      sections.push({ kind:'agent-stage', event:event });
    } else sections.push({ kind:isAgent ? 'agent' : 'comment', event:event });
  });
  var stageSections = sections.filter(function (section) { return section.kind === 'agent'; });
  var stageHistoryHtml = stageSections.length && !latestLayout
    ? '<div id="tkStageHistory" class="tk-feed-stage-history" hidden><div class="tk-feed-stage-history-content">'
      + stageSections.map(function (section) { return renderTaskAgentFeedEntry(t, section.event.entry, artifacts); }).join('') + '</div></div>' : '';
  var systemEvents = sections.filter(function (section) { return section.kind === 'system'; }).flatMap(function (section) { return section.events; });
  var commentsHtml = sections.filter(function (section) { return section.kind === 'comment'; }).map(function (section) { return renderTaskHumanFeedEntry(section.event); }).join('');
  var agentStageHtml = sections.filter(function (section) { return section.kind === 'agent-stage'; }).map(function (section) { return renderAgentStageComment(t, section.event.entry); }).join('');
  return '<div class="tk-feed" aria-label="任务动态">' + renderTaskDeliveryOverview(t, activity, artifacts, stageHistoryHtml, stageSections.length, reportHtml)
    + agentStageHtml + commentsHtml + (systemEvents.length ? renderTaskSystemFeedGroup(systemEvents, false) : '') + '</div>';
}

/* 流转操作记录：kind 为 'flow'；历史数据没有 kind，用 assignee 字段识别。 */
function isFlowRecord(entry) {
  return entry && (entry.kind === 'flow' || (!entry.kind && entry.assignee));
}
function flowRecordAction(entry) {
  var action = '将任务流转给「' + tkGetPerson(entry.assignee).name + '」';
  if (entry.fromStatus && entry.status && entry.fromStatus !== entry.status) {
    action = '状态从「' + tkGetStatusName(entry.fromStatus) + '」变更为「' + tkGetStatusName(entry.status) + '」，并流转给「' + tkGetPerson(entry.assignee).name + '」';
  }
  return entry.text ? action + '：' + entry.text : action;
}
function renderTaskChangelog(t) {
  var entries = [{
    time: t.createdAt || (t.createDate + ' 09:30'),
    user: tkGetPerson(t.createdBy).name,
    action: '创建了任务',
  }];
  (t.statusHistory || []).forEach(function (change) {
    entries.push({
      time: change.time,
      user: tkGetPerson(change.authorId).name,
      action: '状态从「' + tkGetStatusName(change.from) + '」变更为「' + tkGetStatusName(change.to) + '」',
    });
  });
  (t.comments || []).forEach(function (entry) {
    if (!isFlowRecord(entry)) return;
    entries.push({ time: entry.createdAt, user: tkGetPerson(entry.authorId).name, action: flowRecordAction(entry) });
  });
  entries.sort(function (left, right) { return String(left.time).localeCompare(String(right.time)); });
  return entries.map(function (entry) {
    return '<div class="tk-drawer-changelog-item"><span class="tk-drawer-changelog-time">' + escapeHtml(entry.time) + '</span><span class="tk-drawer-changelog-user">' + escapeHtml(entry.user) + '</span>' + escapeHtml(entry.action) + '</div>';
  }).join('');
}

export function taskCommentTimestamp() {
  var now = new Date();
  function pad(value) { return String(value).padStart(2, '0'); }
  return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' '
    + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
}

export function openTaskDetail(taskId) { openDrawer(Number(taskId)); }
export function openTaskDetailFromSession(taskId) { openDrawer(Number(taskId)); }

export function openDrawer(taskId) {
  closeTaskLabelPicker();
  var t = tkGetTasks().find(function (x) { return x.id === taskId; });
  if (!t) return;
  if (!tkCanViewTask(t)) { toast('未参与该任务，无法查看', 'warning'); return; }
  pageState.lastOpenedTaskId = taskId;
  if (pageState.flowAssigneeDraft.taskId !== taskId) {
    var savedAssignee = tkPeopleInProject(t.project).some(function (person) { return person.id === t.flowAssignee; }) ? t.flowAssignee : '';
    pageState.flowAssigneeDraft = { taskId: taskId, assigneeId: savedAssignee };
  }
  if (state.drawerTaskId !== taskId) closeDocPreview();
  state.drawerTaskId = taskId;
  els.tkDrawer.setAttribute('data-task-id', String(taskId));
  var person = tkGetPerson(t.assignee);
  var creator = tkGetPerson(t.createdBy);
  var statusOpts = TK_STATUSES.map(function (s) { return { value: s.id, label: s.name }; });
  var priOpts = TK_PRIORITIES.map(function (p) { return { value: p.id, label: p.name }; });
  var peopleOpts = tkPeopleInProject(t.project).map(function (p) { return { value: p.id, label: p.name }; });
  var projOpts = tkProjectsForCurrentUser().map(function (p) { return { value: p.id, label: p.name }; });
  els.tkDrawerTitle.textContent = t.title;
  els.tkDrawerCode.textContent = '#' + t.code;
  els.tkDrawer.classList.toggle('tk-drawer--latest', pageState.taskDetailVersion === 'latest');
  els.tkDrawer.setAttribute('data-detail-version', pageState.taskDetailVersion);
  els.tkDrawerTitle.title = '双击编辑标题';
  renderTaskStartAction();
  var _savedDetailsOpen = Array.from(els.tkDrawerBody.querySelectorAll('details')).map(function (d) { return d.open; });
  els.tkDrawerBody.innerHTML =
    '<div class="tk-drawer-main"><div class="tk-drawer-main-inner">' +
      '<div class="tk-drawer-tabs">' +
        '<button type="button" class="tk-drawer-tab active" data-tab="info">基础信息</button>' +
        '<button type="button" class="tk-drawer-tab" data-tab="changelog">变更日志</button>' +
      '</div>' +
      '<div class="tk-drawer-tab-content active" data-tab-content="info">' +
        '<div class="tk-drawer-desc" contenteditable="true" data-field="desc">' + escapeHtml(t.desc || '点击添加描述…') + '</div>' +
        '<div class="tk-drawer-attachments">' +
          '<div class="tk-attach-dropzone" id="tkAttachDropzone" role="button" tabindex="0" data-tooltip="添加附件（支持粘贴、拖拽）" aria-label="添加附件（支持粘贴、拖拽）">' +
            '<input type="file" id="tkAttachInput" multiple style="display:none">' +
            '<svg class="tk-attach-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>' +
          '</div>' +
          '<div class="tk-attach-list" id="tkAttachList"></div>' +
        '</div>' +
        '<div class="tk-drawer-comments"><div class="tk-drawer-comments-head"><div class="tk-drawer-comments-title">动态</div></div>' +
          renderTaskComments(t) +
        '</div>' +
      '</div>' +
      '<div class="tk-drawer-tab-content" data-tab-content="changelog" hidden>' +
        '<div class="tk-drawer-changelog-list">' + renderTaskChangelog(t) + '</div>' +
      '</div>' +
    '</div></div>' +
    '<div class="tk-drawer-sidebar" id="tkDrawerSidebar">' +
      '<div class="tk-drawer-prop-list" id="tkDrawerPropList">' +
        propPicker('状态', t.status, statusOpts) +
        propPicker('处理人', t.assignee, peopleOpts) +
        propPicker('项目', t.project, projOpts) +
        propPicker('优先级', t.priority, priOpts) +
        propPicker('截止日期', t.dueDate, null, true) +
        '<div class="tk-prop-row"><span>标签</span>' + renderTaskLabelTrigger(t) + '</div>' +
      '</div>' +
      '<div class="tk-prop-row"><span>创建者</span><span class="tk-prop-val">' + escapeHtml(creator.name) + '</span></div>' +
      '<div class="tk-prop-row"><span>创建时间</span><span class="tk-prop-val">' + escapeHtml(t.createdAt || t.createDate) + '</span></div>' +
      '<div class="tk-prop-row"><span>更新时间</span><span class="tk-prop-val">' + escapeHtml(t.updatedAt || t.createdAt || t.createDate) + '</span></div>' +
    '</div>';
  if (pageState.taskDetailVersion === 'latest') {
    var mainInner = els.tkDrawerBody.querySelector('.tk-drawer-main-inner');
    var sidebar = els.tkDrawerBody.querySelector('#tkDrawerSidebar');
    els.tkDrawerBody.querySelector('.tk-drawer-tabs')?.remove();
    els.tkDrawerBody.querySelector('[data-tab-content="changelog"]')?.remove();
    sidebar.querySelectorAll('.tk-prop-row').forEach(function (row) {
      if (['处理人', '创建者', '创建时间', '截止日期', '更新时间'].includes(row.querySelector('span')?.textContent?.trim())) row.remove();
    });
    els.tkDrawerBody.querySelectorAll('[data-action="blocked-retry"]').forEach(function (button) { button.remove(); });
    mainInner.prepend(sidebar);
  }
  var _newDetails = els.tkDrawerBody.querySelectorAll('details');
  _savedDetailsOpen.forEach(function (open, i) { if (open && _newDetails[i]) _newDetails[i].open = true; });
  /* 抽屉重渲染会清掉预览面板 DOM；页签状态仍留在内存，重挂面板即可恢复已打开的产物。 */
  if (pageState.docPreviewTabs.length) renderDocPreviewPanel();
  /* 附件上传初始化 */
  (function(){
    var dz = els.tkDrawerBody.querySelector('#tkAttachDropzone');
    var fi = els.tkDrawerBody.querySelector('#tkAttachInput');
    var al = els.tkDrawerBody.querySelector('#tkAttachList');
    if (!dz || !fi || !al) return;
    function renderFiles(files) {
      Array.prototype.forEach.call(files, function(f) {
        var item = document.createElement('div');
        item.className = 'tk-attach-item';
        var sz = f.size < 1024 ? f.size + 'B' : f.size < 1048576 ? (f.size/1024).toFixed(1)+'KB' : (f.size/1048576).toFixed(1)+'MB';
        item.innerHTML = '<span class="tk-attach-item-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span><span class="tk-attach-item-name">' + escapeHtml(f.name) + '</span>' + (sz ? '<span class="tk-attach-item-size">' + sz + '</span>' : '') + '<button class="tk-attach-item-btn" data-tooltip="预览" aria-label="预览"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></button><button class="tk-attach-item-btn" data-tooltip="下载" aria-label="下载"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button><button class="tk-attach-item-btn tk-attach-item-remove" data-attach-remove data-tooltip="删除" aria-label="删除"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
        al.appendChild(item);
      });
    }
    fi.onchange = function() { renderFiles(fi.files); fi.value=''; };
    dz.onkeydown = function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); }
    };
    dz.ondragover = function(e) { e.preventDefault(); dz.classList.add('dragover'); };
    dz.ondragleave = function() { dz.classList.remove('dragover'); };
    dz.ondrop = function(e) { e.preventDefault(); dz.classList.remove('dragover'); renderFiles(e.dataTransfer.files); };
    els.tkDrawer.onpaste = function(e) {
      if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
      var files = Array.from((e.clipboardData && e.clipboardData.items) || []).map(function(item) {
        return item.kind === 'file' ? item.getAsFile() : null;
      }).filter(Boolean);
      if (files.length) { e.preventDefault(); renderFiles(files); }
    };
  })();
  clearTimeout(pageState.drawerCloseTimer);
  cancelAnimationFrame(pageState.drawerOpenFrame);
  els.tkDrawer.classList.remove('hidden');
  if (state.viewMode === 'split') {
    els.tkDrawer.classList.add('show');
    syncDrawerClickaway();
    els.tkSplitEmpty.classList.add('hidden');
    els.tkListBody.querySelectorAll('tr[data-task-id]').forEach(function (row) {
      row.classList.toggle('detail-active', row.getAttribute('data-task-id') === String(taskId));
    });
    return;
  }
  pageState.drawerOpenFrame = requestAnimationFrame(function () {
    els.tkDrawer.classList.add('show');
    syncDrawerClickaway();
  });
}

/* 「查看产物」：打开详情并展开各阶段已产出的文档，直接定位到执行计划。 */
export function openDrawerArtifacts(taskId) {
  openDrawer(taskId);
  els.tkDrawerBody.querySelectorAll('[data-stage-detail-toggle][aria-expanded="false"]').forEach(function (button) { button.click(); });
  els.tkDrawerBody.querySelector('.tk-feed-stage-table')?.scrollIntoView({ block:'start' });
}
export function closeDrawer() {
  closeDocPreview();
  closeTaskLabelPicker();
  closeMentionPanel();
  document.querySelectorAll('.tk-drawer-more-menu').forEach(function (m) { m.remove(); });
  els.tkDrawerMore.setAttribute('aria-expanded', 'false');
  pageState.flowAssigneeDraft = { taskId: null, assigneeId: '' };
  pageState.flowAssigneeDraft = { taskId: null, assigneeId: '' };
  pageState.lastOpenedTaskId = null;
  cancelAnimationFrame(pageState.drawerOpenFrame);
  els.tkDrawer.classList.remove('show');
  syncDrawerClickaway();
  clearTimeout(pageState.drawerCloseTimer);
  if (state.viewMode === 'split') {
    els.tkDrawer.classList.add('hidden');
    els.tkSplitEmpty.classList.remove('hidden');
    els.tkListBody.querySelectorAll('tr.detail-active').forEach(function (row) { row.classList.remove('detail-active'); });
    state.drawerTaskId = null;
    return;
  }
  pageState.drawerCloseTimer = setTimeout(function () {
    els.tkDrawer.classList.add('hidden');
  }, 250);
  state.drawerTaskId = null;
}
