import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { cvCurrentUserName } from '../collab/data.js';
import { mgrCanManageProject, mgrDecideIssue, mgrProjectById, mgrProjectIssues, mgrProjectKnowledge, mgrTaskById } from './data.js';
import { mgrEsc, mgrTag } from './utils.js';
/* 管理 · 空间右栏的子页面（对齐产品）：议题、空间概览、知识库、定时任务与添加定时任务。
   子页面与空间详情、空间设置并列，左上箭头返回空间详情（添加定时任务返回定时任务列表）。 */

var SCHEDULES_KEY = 'lingee-manager-schedules-v1';
var RUNS_KEY = 'lingee-manager-schedule-runs-v1';
var TITLES = { issues: '议题', overview: '空间概览', knowledge: '知识库', schedule: '定时任务', 'schedule-new': '添加定时任务' };
var PLAN_KINDS = [['once', '单次'], ['interval', '固定间隔'], ['hourly', '每小时'], ['daily', '每天'], ['weekly', '每周'], ['monthly', '每月']];
var WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
var KB_FOLDERS = ['会议纪要', '需求文档', '设计方案', '测试报告'];

var subKind = '';
var projectId = null;
var issueTab = 'pending';
var kbTab = 'space';
var kbFolder = '';
var kbQuery = '';
var jobTab = 'jobs';
var jobQuery = '';
var draft = null;          /* 添加定时任务的表单草稿 */

function project() { return projectId ? mgrProjectById(projectId) : null; }
function readJson(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
function writeJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; } }

/* ---------- 定时任务数据：每个空间默认一条「空间最新进展总结」，暂停状态 ---------- */
function allSchedules() { return readJson(SCHEDULES_KEY) || {}; }
function spaceSchedules(p) {
  var all = allSchedules();
  if (Array.isArray(all[p.id])) return all[p.id];
  return [{ id: 'job-' + p.id + '-weekly', name: '空间最新进展总结 · ' + p.name, creator: p.owner || '', plan: '每周一 08:00', enabled: false, prompt: '汇总本周空间内任务进展、风险与待决策议题', folder: '默认文件夹' }];
}
function saveSchedules(p, jobs) {
  var all = allSchedules();
  all[p.id] = jobs;
  if (!writeJson(SCHEDULES_KEY, all)) return false;
  document.dispatchEvent(new Event('lingee:mgr-schedules-changed'));
  return true;
}
function spaceRuns(p) { return (readJson(RUNS_KEY) || {})[p.id] || []; }
function addRun(p, job) {
  var all = readJson(RUNS_KEY) || {};
  var now = new Date();
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var at = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
  all[p.id] = [{ job: job.name, at: at, by: cvCurrentUserName() || '', result: '成功' }].concat(all[p.id] || []).slice(0, 50);
  return writeJson(RUNS_KEY, all);
}

/* ---------- 议题 ---------- */
var ISSUE_TABS = [['pending', '待处理'], ['doing', '处理中'], ['done', '已处理']];
function issueGroup(i) {
  if (i.status === '待处理' || !i.status) return 'pending';
  if (i.status === '处理中') return 'doing';
  return 'done';
}
function issuesHtml(p) {
  var list = mgrProjectIssues(p.id);
  var counts = { pending: 0, doing: 0, done: 0 };
  list.forEach(function (i) { counts[issueGroup(i)] += 1; });
  var tabs = '<div class="mgr-sub-tabs" role="tablist" aria-label="议题状态">' + ISSUE_TABS.map(function (t) {
    var on = issueTab === t[0];
    return '<button type="button" class="mgr-sub-tab' + (on ? ' active' : '') + '" role="tab" aria-selected="' + on + '" data-mgr-issue-tab="' + t[0] + '">' + t[1] + ' ' + counts[t[0]] + '</button>';
  }).join('') + '</div>';
  var shown = list.filter(function (i) { return issueGroup(i) === issueTab; });
  var canDecide = mgrCanManageProject(p);
  var body = shown.length
    ? '<div class="mgr-sub-card mgr-sub-issues">' + shown.map(function (i) {
      var cls = { 待处理: 'warning', 处理中: 'running', 已批准: 'done', 已驳回: 'neutral' }[i.status] || 'neutral';
      var task = i.taskKey ? mgrTaskById(i.taskKey) : null;
      var pending = issueGroup(i) === 'pending';
      return '<div class="mgr-issue-item"><div class="mgr-issue-main"><strong>' + mgrEsc(i.title) + '</strong><span class="mgr-issue-meta">' +
        mgrEsc(i.from || '') + (i.from ? ' · ' : '') + mgrEsc(i.time || '') + '</span>' +
        (i.impact && pending ? '<span class="mgr-issue-impact">' + mgrEsc(i.impact) + '</span>' : '') +
        (i.decision ? '<span class="mgr-issue-decision">' + mgrEsc(i.decision.by) + ' 决策：' + mgrEsc(i.decision.text) + '</span>' : '') +
        (task ? '<button type="button" class="mgr-link-btn mgr-issue-task" data-mgr-issue-task="' + mgrEsc(i.taskKey) + '">查看任务 ' + mgrEsc(task.code || '') + ' · ' + mgrEsc(task.title) + '</button>' : '') + '</div>' +
        '<div class="mgr-issue-side">' + mgrTag(i.status || '待处理', cls) +
        (pending && canDecide ? '<span class="mgr-issue-actions"><button type="button" class="mgr-btn mgr-btn--ghost" data-mgr-issue-decide="' + mgrEsc(i.id) + '" data-approve="0">驳回</button>' +
          '<button type="button" class="mgr-btn mgr-btn--primary" data-mgr-issue-decide="' + mgrEsc(i.id) + '" data-approve="1">批准</button></span>' : '') + '</div></div>';
    }).join('') + '</div>'
    : '<div class="mgr-sub-empty">' + EMPTY_ICON + '暂无' + ISSUE_TABS.find(function (t) { return t[0] === issueTab; })[1] + '的议题</div>';
  return tabs + body;
}
var EMPTY_ICON = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>';

/* ---------- 空间概览 ---------- */
function overviewHtml(p) {
  var ms = p.milestones || [];
  var now = new Date();
  var doneCount = ms.filter(function (m) { return new Date(m.date + 'T23:59:59') < now; }).length;
  return '<section class="mgr-sub-card"><h2 class="mgr-sub-card-title">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/></svg>空间目标</h2>' +
    '<p class="mgr-sub-text">' + mgrEsc(p.goal || p.desc || '暂未填写空间目标') + '</p></section>' +
    (p.repo ? '<section class="mgr-sub-card"><h2 class="mgr-sub-card-title">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10"/><path d="M18 10c0 4-6 3-12 7"/></svg>代码仓库</h2>' +
      '<dl class="mgr-sub-kv"><dt>Git 地址</dt><dd>' + mgrEsc(p.repo) + '</dd><dt>基准分支</dt><dd>' + mgrEsc(p.baseBranch || 'main') + '</dd></dl></section>' : '') +
    '<section class="mgr-sub-card"><h2 class="mgr-sub-card-title">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/></svg>里程碑' +
    '<span class="mgr-sub-card-meta">已完成 ' + doneCount + '/' + ms.length + '</span></h2>' +
    (ms.length
      ? '<ol class="mgr-sub-milestones">' + ms.map(function (m) {
        var done = new Date(m.date + 'T23:59:59') < now;
        return '<li class="' + (done ? 'is-done' : '') + '"><span class="mgr-sub-ms-dot" aria-hidden="true"></span><span class="mgr-sub-ms-name">' + mgrEsc(m.name) + '</span>' +
          '<span class="mgr-sub-ms-date">' + mgrEsc(m.date) + '</span>' + mgrTag(done ? '已完成' : '未开始', done ? 'done' : 'neutral') + '</li>';
      }).join('') + '</ol>'
      : '<p class="mgr-sub-text mgr-sub-text--muted">暂无里程碑。</p>') + '</section>';
}

/* ---------- 知识库 ---------- */
function kbFolderOf(k) { return KB_FOLDERS.indexOf(k.type) >= 0 ? k.type : k.type === '会议' ? '会议纪要' : '需求文档'; }
function kbIcon(kind) {
  var paths = {
    folder: '<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 8h18"/>',
    'new-folder': '<path d="M12 20H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v4M3 8h18M18 15v6m-3-3h6"/>',
    upload: '<path d="M12 16V3m-4 4 4-4 4 4M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>',
    quote: '<path d="M10 5H6a3 3 0 0 0-3 3v3h6v7H3v-7M21 5h-4a3 3 0 0 0-3 3v3h6v7h-6v-7"/>'
  };
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[kind] + '</svg>';
}
function knowledgeHtml(p) {
  var docs = mgrProjectKnowledge(p.id);
  var tabs = '<div class="mgr-sub-tabs" role="tablist" aria-label="知识范围">' +
    [['space', '空间知识', docs.length], ['personal', '我的空间资料', 0]].map(function (t) {
      var on = kbTab === t[0];
      return '<button type="button" class="mgr-sub-tab' + (on ? ' active' : '') + '" role="tab" aria-selected="' + on + '" data-mgr-kb-tab="' + t[0] + '">' + t[1] + ' ' + t[2] + '</button>';
    }).join('') + '</div>';
  var note = '<p class="mgr-sub-note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>' +
    '会议纪要已作为空间默认文件夹。空间知识默认不可见，须由空间管理员按文件夹或文件授权后才能查看；也可引用企业知识，引用内容仍遵循空间授权。</p>';
  var pool = kbTab === 'space' ? docs : [];
  var q = kbQuery.trim().toLocaleLowerCase();
  var rows = pool.filter(function (k) {
    if (kbFolder && kbFolderOf(k) !== kbFolder) return false;
    return !q || [k.title, k.type, k.summary].some(function (v) { return v && String(v).toLocaleLowerCase().includes(q); });
  });
  var table = '<div class="mgr-sub-table-wrap"><table class="mgr-sub-table"><thead><tr><th>#</th><th>文件ID</th><th>名称</th><th>所属文件夹</th><th>类型</th><th>标签</th><th>是否向量化</th><th>可见范围</th><th>操作</th></tr></thead><tbody>' +
      rows.map(function (k, i) {
        return '<tr><td>' + (i + 1) + '</td><td class="mgr-sub-mono">' + mgrEsc(k.id.toUpperCase()) + '</td><td class="mgr-sub-name" title="' + mgrEsc(k.summary || k.title) + '">' + mgrEsc(k.title) + '</td>' +
          '<td>' + mgrEsc(kbFolderOf(k)) + '</td><td>' + mgrEsc(k.type || '文档') + '</td><td>' + (k.agent ? mgrTag(k.agent, 'neutral') : '—') + '</td>' +
          '<td>' + (k.vectorIndexed ? mgrTag('已向量化', 'done') : mgrTag('未向量化', 'neutral')) + '</td><td>空间成员</td>' +
          '<td><button type="button" class="mgr-link-btn" data-mgr-kb-view="' + mgrEsc(k.id) + '">查看</button></td></tr>';
      }).join('') + (rows.length ? '' : '<tr><td colspan="9"><div class="mgr-sub-empty">' + EMPTY_ICON + (pool.length ? '没有符合条件的文档' : '这里还没有文档。用右上角的「本地上传」或「引用企业知识」添加。') + '</div></td></tr>') + '</tbody></table></div>';
  return '<div class="mgr-knowledge-page">' + tabs + note + '<section class="mgr-sub-card mgr-sub-card--flush"><div class="mgr-sub-card-head"><h2 class="mgr-sub-card-title">' + (kbTab === 'space' ? '空间知识库' : '我的空间资料') + '</h2>' +
    '<div class="mgr-sub-tools"><button type="button" class="mgr-btn mgr-btn--ghost" data-mgr-kb-act="新建文件夹">' + kbIcon('new-folder') + '新建文件夹</button>' +
    '<button type="button" class="mgr-btn mgr-btn--ghost" data-mgr-kb-act="本地上传">' + kbIcon('upload') + '本地上传</button>' +
    '<button type="button" class="mgr-btn mgr-btn--ghost" data-mgr-kb-act="引用企业知识">' + kbIcon('quote') + '引用企业知识</button></div></div>' +
    '<div class="mgr-sub-filter"><div class="mgr-kb-folder">' + kbIcon('folder') + '<select id="mgrKbFolder" aria-label="按文件夹筛选"><option value="">全部文档</option>' + KB_FOLDERS.map(function (f) {
      return '<option value="' + mgrEsc(f) + '"' + (kbFolder === f ? ' selected' : '') + '>' + mgrEsc(f) + '</option>';
    }).join('') + '</select></div>' +
    '<label class="mgr-pd-search" for="mgrKbSearch"><input type="search" id="mgrKbSearch" value="' + mgrEsc(kbQuery) + '" placeholder="按名称 / 标签 / 目录检索" autocomplete="off">' +
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg></label></div>' +
    table + '</section></div>';
}

/* ---------- 定时任务 ---------- */
function scheduleHtml(p) {
  var tabs = '<div class="mgr-sub-tabs" role="tablist" aria-label="定时任务">' + [['jobs', '定时任务'], ['runs', '执行记录']].map(function (t) {
    var on = jobTab === t[0];
    return '<button type="button" class="mgr-sub-tab' + (on ? ' active' : '') + '" role="tab" aria-selected="' + on + '" data-mgr-job-tab="' + t[0] + '">' + t[1] + '</button>';
  }).join('') + '</div>';
  var q = jobQuery.trim().toLocaleLowerCase();
  if (jobTab === 'runs') {
    var runs = spaceRuns(p).filter(function (r) { return !q || r.job.toLocaleLowerCase().includes(q); });
    return tabs + '<section class="mgr-sub-card mgr-sub-card--flush">' + (runs.length
      ? '<div class="mgr-sub-table-wrap"><table class="mgr-sub-table"><thead><tr><th>任务名称</th><th>触发人</th><th>执行时间</th><th>结果</th></tr></thead><tbody>' +
        runs.map(function (r) { return '<tr><td class="mgr-sub-name">' + mgrEsc(r.job) + '</td><td>' + mgrEsc(r.by) + '</td><td>' + mgrEsc(r.at) + '</td><td>' + mgrTag(r.result, 'done') + '</td></tr>'; }).join('') + '</tbody></table></div>'
      : '<div class="mgr-sub-empty">' + EMPTY_ICON + '暂无执行记录</div>') + '</section>';
  }
  var canEdit = mgrCanManageProject(p);
  var jobs = spaceSchedules(p).filter(function (j) { return !q || j.name.toLocaleLowerCase().includes(q); });
  return tabs + '<section class="mgr-sub-card mgr-sub-card--flush">' + (jobs.length
    ? '<div class="mgr-sub-table-wrap"><table class="mgr-sub-table"><thead><tr><th>任务名称</th><th>创建人</th><th>执行计划</th><th>启停</th><th>运行状态</th><th>操作</th></tr></thead><tbody>' +
      jobs.map(function (j) {
        return '<tr><td class="mgr-sub-name">' + mgrEsc(j.name) + '</td><td>' + mgrEsc(j.creator || '—') + '</td><td>' + mgrEsc(j.plan) + '</td>' +
          '<td><input type="checkbox" class="mgr-tn-switch" data-mgr-job-toggle="' + mgrEsc(j.id) + '" aria-label="启用' + mgrEsc(j.name) + '"' + (j.enabled ? ' checked' : '') + (canEdit ? '' : ' disabled') + '></td>' +
          '<td>' + mgrTag(j.enabled ? '运行中' : '已暂停', j.enabled ? 'running' : 'neutral') + '</td>' +
          '<td class="mgr-sub-ops"><button type="button" class="mgr-link-btn" data-mgr-job-run="' + mgrEsc(j.id) + '">立即执行</button>' +
          (canEdit ? '<button type="button" class="mgr-link-btn mgr-link-btn--danger" data-mgr-job-del="' + mgrEsc(j.id) + '">删除</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="mgr-sub-pager">共 ' + jobs.length + ' 条</div>'
    : '<div class="mgr-sub-empty">' + EMPTY_ICON + (q ? '没有匹配的定时任务' : '还没有定时任务，点右上角「新任务」添加') + '</div>') + '</section>';
}
function scheduleNewHtml() {
  var d = draft;
  return '<p class="mgr-sub-note"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>' +
    '该定时任务为后台自动运行，全程无需人工操作。若流程存在手动确认、人工交互环节，任务将无法执行并自动终止。</p>' +
    '<section class="mgr-sub-card mgr-sub-form">' +
    '<div class="mgr-tn-field"><label for="mgrJobName">任务名称 <b aria-hidden="true">*</b></label><input type="text" id="mgrJobName" maxlength="60" placeholder="请输入" value="' + mgrEsc(d.name) + '"></div>' +
    '<div class="mgr-tn-field"><label for="mgrJobPrompt">提示词 <b aria-hidden="true">*</b></label><textarea id="mgrJobPrompt" rows="4" placeholder="请输入提示词、描述需要定时执行的工作">' + mgrEsc(d.prompt) + '</textarea>' +
    '<div class="mgr-tn-desc-tools"><button type="button" class="mgr-tn-tool" data-mgr-job-tool="附件">＋ 附件</button><button type="button" class="mgr-tn-tool" data-mgr-job-tool="选择智能体">◎ 选择智能体</button><button type="button" class="mgr-tn-tool" data-mgr-job-tool="模型">✦ 模型 - 专家</button></div></div>' +
    '<div class="mgr-tn-field"><label id="mgrJobPlanLabel">执行计划 <b aria-hidden="true">*</b></label><div class="mgr-sub-chips" role="radiogroup" aria-labelledby="mgrJobPlanLabel">' +
    PLAN_KINDS.map(function (k) {
      var on = d.kind === k[0];
      return '<button type="button" class="mgr-pe-tpl' + (on ? ' active' : '') + '" role="radio" aria-checked="' + on + '" data-mgr-job-kind="' + k[0] + '">' + k[1] + '</button>';
    }).join('') + '</div></div>' +
    '<div class="mgr-tn-grid"><div class="mgr-tn-field"><label for="mgrJobDate">计划日期</label><input type="date" id="mgrJobDate" value="' + mgrEsc(d.date) + '"></div>' +
    '<div class="mgr-tn-field"><label for="mgrJobTime">计划时间</label><input type="time" id="mgrJobTime" value="' + mgrEsc(d.time) + '"></div></div>' +
    '<div class="mgr-tn-field mgr-sub-half"><label for="mgrJobFolder">产物归档目录 <b aria-hidden="true">*</b></label><select id="mgrJobFolder">' +
    ['默认文件夹'].concat(KB_FOLDERS).map(function (f) { return '<option' + (d.folder === f ? ' selected' : '') + '>' + mgrEsc(f) + '</option>'; }).join('') + '</select></div></section>';
}
function planText(d) {
  var time = d.time || '08:00';
  var day = d.date ? new Date(d.date + 'T00:00:00') : new Date();
  if (d.kind === 'once') return '单次 ' + (d.date || '') + ' ' + time;
  if (d.kind === 'interval') return '固定间隔 · 每 2 小时';
  if (d.kind === 'hourly') return '每小时';
  if (d.kind === 'daily') return '每天 ' + time;
  if (d.kind === 'weekly') return '每周' + WEEKDAYS[day.getDay()] + ' ' + time;
  return '每月 ' + day.getDate() + ' 日 ' + time;
}
function readDraft() {
  if (!draft || subKind !== 'schedule-new') return;
  draft.name = $('#mgrJobName').value;
  draft.prompt = $('#mgrJobPrompt').value;
  draft.date = $('#mgrJobDate').value;
  draft.time = $('#mgrJobTime').value;
  draft.folder = $('#mgrJobFolder').value;
}
function createJob() {
  var p = project();
  if (!p) return;
  readDraft();
  if (!draft.name.trim()) { toast('请填写任务名称', 'error'); $('#mgrJobName').focus(); return; }
  if (!draft.prompt.trim()) { toast('请填写提示词', 'error'); $('#mgrJobPrompt').focus(); return; }
  if (draft.kind === 'once' && (!draft.date || !draft.time)) { toast('单次执行需要填写计划日期和时间', 'error'); (draft.date ? $('#mgrJobTime') : $('#mgrJobDate')).focus(); return; }
  var job = { id: 'job-' + Date.now().toString(36), name: draft.name.trim(), creator: cvCurrentUserName() || '', plan: planText(draft), enabled: true, prompt: draft.prompt.trim(), folder: draft.folder };
  if (!saveSchedules(p, spaceSchedules(p).concat(job))) { toast('保存失败，请重试', 'error'); return; }
  toast('已创建定时任务：' + job.name, 'success');
  draft = null;
  subKind = 'schedule';
  jobTab = 'jobs';
  render();
}

/* ---------- 渲染与切换 ---------- */
function actionsHtml() {
  if (subKind === 'issues') return '<button type="button" class="mgr-btn mgr-btn--outline" data-mgr-issue-chat>对话创建</button>';
  if (subKind === 'schedule') {
    return '<select id="mgrJobScope" aria-label="数据范围"><option>空间数据</option></select>' +
      '<label class="mgr-pd-search" for="mgrJobSearch"><input type="search" id="mgrJobSearch" value="' + mgrEsc(jobQuery) + '" placeholder="搜索任务名称" autocomplete="off">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg></label>' +
      '<button type="button" class="mgr-btn mgr-btn--primary" data-mgr-job-new>＋ 新任务</button>';
  }
  if (subKind === 'schedule-new') return '<button type="button" class="mgr-btn mgr-btn--ghost" data-mgr-job-cancel>取消</button><button type="button" class="mgr-btn mgr-btn--primary" data-mgr-job-create>确认创建</button>';
  return '';
}
function render(keepFocusId) {
  var p = project();
  if (!p || !subKind) return;
  $('#mgrSubTitle').textContent = TITLES[subKind];
  $('#mgrSubActions').innerHTML = actionsHtml();
  var body = subKind === 'issues' ? issuesHtml(p) : subKind === 'overview' ? overviewHtml(p) : subKind === 'knowledge' ? knowledgeHtml(p)
    : subKind === 'schedule' ? scheduleHtml(p) : scheduleNewHtml();
  $('#mgrSubBody').innerHTML = body;
  if (keepFocusId) {
    var el = document.getElementById(keepFocusId);
    if (el) { el.focus(); if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length); }
  }
}
function openSubPage(id, kind) {
  if (!mgrProjectById(id) || !TITLES[kind]) return false;
  projectId = id;
  subKind = kind;
  issueTab = 'pending';
  kbTab = 'space';
  kbFolder = '';
  kbQuery = '';
  jobTab = 'jobs';
  jobQuery = '';
  $('#mgrProjDetail').classList.add('hidden');
  $('#mgrSpaceSub').classList.remove('hidden');
  render();
  var scroll = $('#mgrSpaceSub .mgr-scroll');
  if (scroll) scroll.scrollTop = 0;
  var backBtn = $('#mgrSpaceSub [data-mgr-sub-back]');
  if (backBtn) backBtn.focus();
  return true;
}
function hideSubPage() {
  subKind = '';
  projectId = null;
  draft = null;
  var page = $('#mgrSpaceSub');
  if (page) page.classList.add('hidden');
}
function back(then) {
  if (subKind === 'schedule-new') { draft = null; subKind = 'schedule'; render(); return; }
  var id = projectId;
  hideSubPage();
  if (!mgrProjectById(id)) return;
  $('#mgrProjDetail').classList.remove('hidden');
  /* 子页面期间改过的内容（议题决策、定时任务）在显示后补一次刷新 */
  document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { back: id } }));
  if (then) then();
}

export function initManagerSpacePages() {
  var page = $('#mgrSpaceSub');
  if (!page) return;
  page.addEventListener('click', function (e) {
    var t = e.target;
    var p = project();
    if (t.closest('[data-mgr-sub-back]')) { back(); return; }
    if (!p) return;
    var it = t.closest('[data-mgr-issue-tab]');
    if (it) { issueTab = it.getAttribute('data-mgr-issue-tab'); render(); return; }
    if (t.closest('[data-mgr-issue-chat]')) { toast('对话创建议题（演示）：在空间底部对话里描述议题，灵基整理后提交'); return; }
    var issueTask = t.closest('[data-mgr-issue-task]');
    if (issueTask) {
      var key = issueTask.getAttribute('data-mgr-issue-task');
      back(function () { document.dispatchEvent(new CustomEvent('lingee:mgr-open-task', { detail: { key: key } })); });
      return;
    }
    var decide = t.closest('[data-mgr-issue-decide]');
    if (decide) {
      var approve = decide.getAttribute('data-approve') === '1';
      if (!mgrCanManageProject(p)) { toast('仅空间负责人、空间管理员或系统管理员可决策', 'warning'); return; }
      if (mgrDecideIssue(decide.getAttribute('data-mgr-issue-decide'), approve)) toast(approve ? '已批准，相关任务恢复执行' : '已驳回，决策已留痕', approve ? 'success' : 'info');
      return;
    }
    var kt = t.closest('[data-mgr-kb-tab]');
    if (kt) { kbTab = kt.getAttribute('data-mgr-kb-tab'); render(); return; }
    var ka = t.closest('[data-mgr-kb-act]');
    if (ka) { toast(ka.getAttribute('data-mgr-kb-act') + '（演示）'); return; }
    var kv = t.closest('[data-mgr-kb-view]');
    if (kv) {
      var doc = mgrProjectKnowledge(p.id).find(function (k) { return k.id === kv.getAttribute('data-mgr-kb-view'); });
      if (doc) toast(doc.title + '：' + (doc.summary || '暂无摘要'));
      return;
    }
    var jt = t.closest('[data-mgr-job-tab]');
    if (jt) { jobTab = jt.getAttribute('data-mgr-job-tab'); render(); return; }
    if (t.closest('[data-mgr-job-new]')) {
      if (!mgrCanManageProject(p)) { toast('只有空间负责人、空间管理员或系统管理员可以添加定时任务', 'warning'); return; }
      draft = { name: '', prompt: '', kind: 'once', date: '', time: '', folder: '默认文件夹' };
      subKind = 'schedule-new';
      render('mgrJobName');
      return;
    }
    var run = t.closest('[data-mgr-job-run]');
    if (run) {
      var job = spaceSchedules(p).find(function (j) { return j.id === run.getAttribute('data-mgr-job-run'); });
      if (job && addRun(p, job)) toast('已触发执行：' + job.name + '，结果见「执行记录」', 'success');
      return;
    }
    var del = t.closest('[data-mgr-job-del]');
    if (del) {
      var delId = del.getAttribute('data-mgr-job-del');
      if (saveSchedules(p, spaceSchedules(p).filter(function (j) { return j.id !== delId; }))) { toast('已删除定时任务', 'success'); render(); }
      return;
    }
    var kind = t.closest('[data-mgr-job-kind]');
    if (kind) { readDraft(); draft.kind = kind.getAttribute('data-mgr-job-kind'); render(); return; }
    var tool = t.closest('[data-mgr-job-tool]');
    if (tool) { toast(tool.getAttribute('data-mgr-job-tool') + '（演示）'); return; }
    if (t.closest('[data-mgr-job-cancel]')) { back(); return; }
    if (t.closest('[data-mgr-job-create]')) createJob();
  });
  page.addEventListener('change', function (e) {
    var p = project();
    if (!p) return;
    if (e.target.id === 'mgrKbFolder') { kbFolder = e.target.value; render(); return; }
    var tg = e.target.closest('[data-mgr-job-toggle]');
    if (tg) {
      var id = tg.getAttribute('data-mgr-job-toggle');
      var jobs = spaceSchedules(p).map(function (j) { return j.id === id ? Object.assign({}, j, { enabled: tg.checked }) : j; });
      if (!saveSchedules(p, jobs)) { toast('保存失败，请重试', 'error'); }
      render();
    }
  });
  page.addEventListener('input', function (e) {
    if (e.target.id === 'mgrKbSearch') { kbQuery = e.target.value; render('mgrKbSearch'); }
    if (e.target.id === 'mgrJobSearch') { jobQuery = e.target.value; render('mgrJobSearch'); }
  });
  page.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && subKind && !e.target.closest('select')) { e.preventDefault(); back(); }
  });
  document.addEventListener('lingee:mgr-issues-changed', function () { if (subKind === 'issues') render(); });
  document.addEventListener('lingee:mgr-projects-changed', function () {
    if (subKind && !project()) hideSubPage();
  });
}

export { hideSubPage, openSubPage, spaceSchedules };
