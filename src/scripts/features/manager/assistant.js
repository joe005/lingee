import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { mgrExpertList, mgrProjectIssues, mgrProjects, mgrProjectTasks } from './data.js';
import { mgrEsc, mgrTag } from './utils.js';
/* 管理 · 小灵与 AI 组织（对齐产品）。
   小灵：管理助理对话（演示回复），右侧可展开议题中心 / 审批中心 / 态势三张卡片；
   AI 组织：智能体与 AI 任务概况、AI 部门运营概览卡片。数据为演示，AI 任务按管理空间里进行中的研发任务统计。 */

var INTRO = [
  { role: 'user', text: '你好，小灵，请先介绍下你自己' },
  {
    role: 'ai',
    html: '<p>你好！我是小灵，你的专属助理，由灵基（金蝶 AI 团队打造的企业级智能体平台）驱动。</p><p>我能帮你做的事：</p><ul>' +
      '<li>每日概览：今天要看什么、有什么等你决策，一张卡片说清楚</li>' +
      '<li>空间与任务：查看你的空间、目标、指标、文档和任务进展</li>' +
      '<li>议题跟进：查看空间里的议题和处理记录，帮你解释、对比、起草</li>' +
      '<li>定时关注：帮你盯着关心的信息，按你定的节奏提醒</li>' +
      '<li>日常协助：安排会议日程、整理文件、做分析报告等</li></ul>' +
      '<p>简单的问答我在这里直接回答；需要深挖的多步骤工作，我会安排后台去做，做完把结果带回来告诉你。</p><p>有什么想先试试的吗？</p>',
  },
];
var thread = INTRO.slice();
var sideOpen = false;
var assistantEnabled = false;

var DEPARTMENTS = [
  { name: 'AI 财务部', owner: '吴宏超', desc: '费用审核、银企对账、回款催收与资金监控的日常自动化运营', agents: 10 },
  { name: 'AI 采购部', owner: '赵琳', desc: '询价、比价、合同初审与交付跟催，支撑重点物料降本与保供', agents: 5 },
  { name: 'AI 销售部', owner: '王工', desc: '线索挖掘、商机跟进与报价支持，报价响应时效不超过 24 小时', agents: 3 },
  { name: 'AI 制造运营部', owner: '周建国', desc: '排产建议、设备停机预警与工单跟踪，异常 30 分钟内升级', agents: 2 },
  { name: 'AI 研发部', owner: '张工', desc: '需求分析、苍穹元数据开发与测试验证，按空间承接研发任务', agents: 7, rd: true },
  { name: 'AI 审批部', owner: '周杰', desc: '单据预审、规则校验与审批建议，复杂单据转人工复核', agents: 5 },
];

/* ---------- 小灵 ---------- */
function messageHtml(m) {
  if (m.role === 'user') return '<div class="mgr-xl-msg mgr-xl-msg--user"><p>' + mgrEsc(m.text) + '</p></div>';
  return '<div class="mgr-xl-msg mgr-xl-msg--ai">' + (m.html || '<p>' + mgrEsc(m.text) + '</p>') + '</div>';
}
function pendingIssueCount() {
  return mgrProjects().reduce(function (n, p) { return n + mgrProjectIssues(p.id).filter(function (i) { return i.status === '待处理'; }).length; }, 0);
}
function sideHtml() {
  var chevron = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
  var issues = pendingIssueCount();
  return '<div class="mgr-rail-card"><button type="button" class="mgr-rail-head" data-mgr-xl-card="议题中心"><span class="mgr-rail-title">议题中心' +
    (issues ? '<span class="mgr-rail-count">' + issues + ' 待处理</span>' : '') + '</span>' + chevron + '</button></div>' +
    '<div class="mgr-rail-card"><button type="button" class="mgr-rail-head" data-mgr-xl-card="审批中心"><span class="mgr-rail-title">审批中心</span>' + chevron + '</button>' +
    '<p class="mgr-rail-goal">当前暂无待审批单据</p><div class="mgr-xl-pref"><span>设置您的审批偏好</span>' +
    '<button type="button" class="mgr-btn mgr-btn--ghost" data-mgr-xl-card="AI 授权">AI 授权</button></div></div>' +
    '<div class="mgr-rail-card"><button type="button" class="mgr-rail-head" data-mgr-xl-card="态势"><span class="mgr-rail-title">态势</span>' + chevron + '</button></div>';
}
function renderAssistant() {
  $('#mgrXlWelcome').hidden = assistantEnabled;
  $('#mgrXlConversation').hidden = !assistantEnabled;
  $('#mgrXlThread').innerHTML = thread.map(messageHtml).join('');
  var side = $('#mgrXlSide');
  side.hidden = !sideOpen;
  if (sideOpen) side.innerHTML = sideHtml();
  var btn = $('#mgrXlPanelToggle');
  btn.setAttribute('aria-expanded', String(sideOpen));
  btn.setAttribute('aria-label', sideOpen ? '收起右侧面板' : '展开右侧面板');
  btn.setAttribute('data-tooltip', sideOpen ? '收起右侧面板' : '展开右侧面板');
  var scroll = $('#mgr-panel-xiaoling .mgr-scroll');
  if (scroll) scroll.scrollTop = scroll.scrollHeight;
}
function send() {
  var input = $('#mgrXlInput');
  var text = input.value.trim();
  if (!text) { toast('先输入想问的问题'); input.focus(); return; }
  input.value = '';
  thread.push({ role: 'user', text: text });
  thread.push({ role: 'ai', text: '收到（演示）。我会结合你的空间、议题和定时关注来回答；需要多步骤处理的，我会安排后台执行，完成后把结果带回这里。' });
  renderAssistant();
}

/* ---------- AI 组织 ---------- */
function renderOrg() {
  var running = 0;
  mgrProjects().forEach(function (p) {
    running += mgrProjectTasks(p.id).filter(function (t) { return t.status === 'in_progress' || t.status === 'in_review'; }).length;
  });
  var stat = function (label, value, note) {
    return '<div class="mgr-org-stat"><span class="mgr-org-stat-label">' + label + '</span><strong>' + value + '</strong><small>' + note + '</small></div>';
  };
  $('#mgrOrgStats').innerHTML = stat('智能体', mgrExpertList().length, '较上月 —') + stat('AI 任务', running, '进行中与待审核的研发任务');
  $('#mgrOrgGrid').innerHTML = DEPARTMENTS.map(function (d) {
    var tasks = d.rd ? running : 0;
    return '<article class="mgr-mcard mgr-org-card"><div class="mgr-org-card-head"><span class="mgr-org-avatar" aria-hidden="true">' + mgrEsc(d.name.replace(/^AI\s*/, '')[0]) + '</span>' +
      '<div class="mgr-org-card-title"><h3 class="mgr-mcard-title">' + mgrEsc(d.name) + '</h3><span>' + mgrEsc(d.owner) + ' · 部门负责人</span></div>' + mgrTag('运行正常', 'done') + '</div>' +
      '<p class="mgr-mcard-desc">' + mgrEsc(d.desc) + '</p>' +
      '<div class="mgr-org-card-stats"><div><strong>' + d.agents + '</strong><span>智能体</span></div><div><strong>' + tasks + '</strong><span>本月任务</span></div></div></article>';
  }).join('');
}

export function initManagerAssistant() {
  var xl = $('#mgr-panel-xiaoling');
  if (xl) {
    xl.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('#mgrXlEnable')) { assistantEnabled = true; renderAssistant(); $('#mgrXlInput').focus(); return; }
      if (t.closest('#mgrXlPanelToggle')) { sideOpen = !sideOpen; renderAssistant(); return; }
      if (t.closest('#mgrXlSend')) { send(); return; }
      if (t.closest('[data-mgr-xl-attach]')) { toast('添加附件（演示）'); return; }
      var card = t.closest('[data-mgr-xl-card]');
      if (card) toast('「' + card.getAttribute('data-mgr-xl-card') + '」不在本次演示范围');
    });
    xl.addEventListener('keydown', function (e) {
      if (e.target.id === 'mgrXlInput' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
    });
  }
  var org = $('#mgr-panel-org');
  if (org) {
    org.addEventListener('click', function (e) {
      if (e.target.closest('[data-mgr-org-create]')) toast('创建 AI 部门（演示）');
    });
  }
}

export { renderAssistant, renderOrg };
