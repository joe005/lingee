import { xesc } from '../expert/data.js';

/* Task 是项目层业务对象；WorkItem / WorkItemRun 只存在于运行期。
   项目层通过这个适配器消费状态、receipt、artifact、evidence 与标准事件，
   不直接编辑 WorkItem 内部的 stage graph。 */

function runtimePlan(t) {
  if (t.stagePlan?.length) return t.stagePlan.map(sp => [sp.name, ['任务描述', '验收标准'], [sp.name + '产物.md'], sp.id]);
  if (t.type === 'Bug') return [
    ['问题复现与根因分析', ['问题描述'], ['根因分析报告.md']],
    ['修复实现', ['根因分析报告.md'], ['修复补丁.diff']],
    ['并发与回归测试', ['修复补丁.diff', '验收标准'], ['回归测试报告.md']],
    ['发布验证', ['修复补丁.diff', '回归测试报告.md'], ['发布验证记录.md']]
  ];
  return [
    ['范围与验收澄清', ['任务描述'], ['requirements.md', 'acceptance-criteria.md']],
    ['方案与实现', ['requirements.md'], ['solution-design.md', 'implementation.zip']],
    ['测试与交付验证', ['implementation.zip', 'acceptance-criteria.md'], ['verification-report.md', 'delivery-receipt.json']]
  ];
}

function now() { return new Date().toLocaleString('zh-CN', { hour12: false }); }
function runId() { return 'run-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }

export function ensureTaskRuntime(t) {
  if (!t) return null;
  if (t.runtime && Array.isArray(t.runtime.workItems)) return t.runtime;
  const plan = runtimePlan(t);
  t.runtime = {
    id: 'runtime-' + (t.boardId || t.sourceId || Date.now()),
    status: 'ready',
    createdAt: now(),
    workItems: plan.map((row, index) => ({
      id: 'wi-' + (index + 1),
      title: row[0],
      stageId: row[3],
      status: 'pending',
      dependsOn: index ? ['wi-' + index] : [],
      inputs: row[1],
      outputs: row[2],
      runs: [],
      receipts: [],
      evidence: []
    })),
    events: [{ type: 'runtime.planned', at: now(), message: '已根据任务目标生成运行计划' }]
  };
  return t.runtime;
}

function startWorkItem(runtime, wi) {
  wi.status = 'running';
  wi.runs.push({ id: runId(), attempt: wi.runs.length + 1, status: 'running', startedAt: now() });
  runtime.status = 'running';
  runtime.events.push({ type: 'workitem.started', workItemId: wi.id, at: now(), message: wi.title + '开始执行' });
}

export function startTaskRuntime(t) {
  const runtime = ensureTaskRuntime(t);
  if (runtime.status === 'ready') startWorkItem(runtime, runtime.workItems[0]);
  t.status = '进行中';
  syncTaskFromRuntime(t);
  return runtime;
}

export function advanceTaskRuntime(t) {
  const runtime = startTaskRuntime(t);
  const current = runtime.workItems.find(wi => wi.status === 'running');
  if (!current) return runtime;
  const run = current.runs[current.runs.length - 1];
  run.status = 'completed'; run.finishedAt = now();
  current.status = 'completed';
  current.receipts.push({ id: 'receipt-' + current.id + '-' + current.runs.length, runId: run.id, status: 'accepted', at: now() });
  current.evidence.push({ type: 'runtime-log', label: current.title + '执行记录', runId: run.id });
  runtime.events.push({ type: 'workitem.completed', workItemId: current.id, at: now(), message: current.title + '已完成' });
  const next = runtime.workItems.find(wi => wi.status === 'pending' && wi.dependsOn.every(id => runtime.workItems.find(x => x.id === id)?.status === 'completed'));
  if (next) startWorkItem(runtime, next);
  else {
    runtime.status = 'completed'; runtime.completedAt = now();
    runtime.events.push({ type: 'runtime.completed', at: now(), message: '所有 WorkItem 已完成，等待任务验收' });
  }
  syncTaskFromRuntime(t);
  return runtime;
}

export function failTaskRuntime(t, reason) {
  const runtime = startTaskRuntime(t);
  const current = runtime.workItems.find(wi => wi.status === 'running');
  if (!current) return runtime;
  const run = current.runs[current.runs.length - 1];
  run.status = 'failed'; run.finishedAt = now(); run.error = reason || '运行失败';
  current.status = 'failed';
  runtime.status = 'failed';
  runtime.events.push({ type: 'workitem.failed', workItemId: current.id, at: now(), message: run.error });
  syncTaskFromRuntime(t);
  return runtime;
}

export function retryTaskRuntime(t) {
  const runtime = ensureTaskRuntime(t);
  const failed = runtime.workItems.find(wi => wi.status === 'failed');
  if (!failed) return startTaskRuntime(t);
  startWorkItem(runtime, failed);
  runtime.events.push({ type: 'workitem.resumed', workItemId: failed.id, at: now(), message: failed.title + '从失败点重试' });
  syncTaskFromRuntime(t);
  return runtime;
}

export function syncTaskFromRuntime(t) {
  const runtime = t && t.runtime;
  if (!runtime || !runtime.workItems.length) return;
  const completed = runtime.workItems.filter(wi => wi.status === 'completed').length;
  const running = runtime.workItems.filter(wi => wi.status === 'running').length;
  if (completed > 0 || running === 0) t.progress = Math.round(completed / runtime.workItems.length * 100);
  const current = runtime.workItems.find(w => ['running', 'failed'].includes(w.status)) || runtime.workItems.at(-1);
  if (current) t.stage = current.stageId || current.id;
  if (t.status === '已完成' && (t.reviews || []).some(r => r.status === 'approved')) return;
  if (runtime.status === 'failed') t.status = '已阻塞';
  else if (runtime.status === 'completed') t.status = '审核中';
  else if (runtime.status === 'running') t.status = '进行中';
  const retained = (t.artifacts || []).filter(a => !a.workItemId);
  t.artifacts = retained.concat(runtime.workItems.flatMap(wi => wi.status === 'completed' ? wi.outputs.map((name, index) => ({
    id: wi.id + '-artifact-' + index,
    name,
    version: 'Run ' + wi.runs.length,
    stageId: wi.stageId,
    content: '# ' + name + '\n\n本地演示产物\n\n任务：' + t.title + '\n流程节点：' + wi.title + '\n任务目标：' + (t.desc || '未填写') + '\n验收标准：' + (t.acceptance || '未填写') + '\n\n此内容用于原型预览，尚未连接实际执行服务。',
    workItemId: wi.id,
    runId: wi.runs[wi.runs.length - 1]?.id,
    receiptId: wi.receipts[wi.receipts.length - 1]?.id,
    evidence: wi.evidence.slice()
  })) : []));
}

export function runtimeArtifacts(t) {
  if (!t || !t.runtime) return [];
  syncTaskFromRuntime(t);
  return (t.artifacts || []).filter(a => a && a.workItemId);
}

export function runtimeSummaryHtml(t) {
  const runtime = t && t.runtime;
  if (!runtime) return '<div class="tb-runtime-empty"><strong>尚未启动运行</strong><span>发起任务会话后，Runtime 会根据任务目标生成 WorkItem，并回流状态、产物与证据。</span></div>';
  const statusLabel = { ready: '已规划', running: '运行中', failed: '需要介入', completed: '执行完成' }[runtime.status] || runtime.status;
  return '<div class="tb-runtime-head"><div><strong>Runtime ' + xesc(runtime.id) + '</strong><span>' + xesc(statusLabel) + ' · ' + (t.progress || 0) + '%</span></div><small>运行期只读</small></div>'
    + '<div class="tb-runtime-list">' + runtime.workItems.map((wi, index) => {
      const run = wi.runs[wi.runs.length - 1];
      const state = { pending: '等待', running: '执行中', failed: '失败', completed: '完成' }[wi.status] || wi.status;
      return '<article class="tb-runtime-item" data-state="' + xesc(wi.status) + '"><i>' + (index + 1) + '</i><div><header><strong>' + xesc(wi.title) + '</strong><span>' + xesc(state) + '</span></header>'
        + '<p>输入：' + xesc(wi.inputs.join('、')) + '</p><p>输出：' + xesc(wi.outputs.join('、')) + '</p>'
        + (run ? '<small>Run · 第 ' + run.attempt + ' 次 · ' + xesc(run.status) + '</small>' : '<small>等待依赖完成</small>')
        + '</div></article>';
    }).join('') + '</div>'
    + (runtime.status === 'failed' ? '<button type="button" class="tb-runtime-retry" data-runtime-retry>从失败点重试</button>' : '')
    + '<div class="tb-runtime-events"><h4>标准事件</h4>' + runtime.events.slice().reverse().map(e => '<p><span>' + xesc(e.type) + '</span>' + xesc(e.message) + '<small>' + xesc(e.at) + '</small></p>').join('') + '</div>';
}
