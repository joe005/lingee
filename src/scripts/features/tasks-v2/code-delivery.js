import '../../../styles/parts/tasks/code-delivery.css';
import { toast } from '../../core/toast.js';
import { tkCanViewTask, tkCurrentStageHandlerId, tkCurrentUserId, tkGetPerson, tkGetTasks, tkUpdateTask } from './data.js';
import { taskCodeDeliveryContext } from './code-delivery-context.js';
import { reviewTaskStage } from './task-execution.js';
import { escapeHtml } from './ui-utils.js';

function button(label, action, primary = false) {
  return '<button type="button" class="' + (primary ? 'tk-btn-primary' : 'tk-btn-ghost') + '" data-cd-action="' + action + '">' + label + '</button>';
}
function grid(fields) {
  return '<div class="tk-cd-grid">' + fields.map(([label,value]) => '<div><span>' + label + '</span><code>' + escapeHtml(value) + '</code></div>').join('') + '</div>';
}
const conflictFiles = [
  ['src/filters/status.ts', 'return byStatus(items, status);', 'return visibleTo(user, items);', 'return byStatus(visibleTo(user, items), status);'],
  ['tests/status.test.ts', 'expect(filtered).toMatchStatus(status);', 'expect(filtered).toBeVisibleTo(user);', 'expect(filtered).toMatchStatus(status);\nexpect(filtered).toBeVisibleTo(user);'],
];

export function initTaskCodeDelivery() {
  const dialog = document.getElementById('tkCodeDeliveryDialog');
  if (!dialog) return;
  document.body.appendChild(dialog);
  const body = dialog.querySelector('#tkCodeDeliveryBody');
  const foot = dialog.querySelector('#tkCodeDeliveryFoot');
  let taskId, reviewKey, opener, timer;
  const activeTask = () => tkGetTasks().find(task => task.id === taskId);
  function show(title, content, actions) {
    dialog.querySelector('#tkCodeDeliveryTitle').textContent = title;
    dialog.querySelector('#tkCodeDeliveryMeta').textContent = activeTask().code + ' · 模拟体验';
    body.innerHTML = content;
    foot.innerHTML = actions;
    if (!dialog.open) { opener = document.activeElement; dialog.showModal(); }
  }
  function close() {
    clearTimeout(timer);
    dialog.close();
    if (opener?.isConnected) opener.focus({preventScroll:true});
  }
  function currentReview() {
    const task = activeTask();
    const info = taskCodeDeliveryContext(task);
    if (!info?.isDevelopment || info.reviewKey !== reviewKey || task.status !== 'in_review'
      || !tkCanViewTask(task) || tkCurrentStageHandlerId(task) !== tkCurrentUserId()) {
      close(); toast('任务版本或处理人已变化，请重新查看开发产物', 'warning'); return null;
    }
    return info;
  }
  function finish(resolved = false) {
    const info = currentReview();
    if (!info) return;
    const task = activeTask();
    if (info.last?.reviewKey !== reviewKey) {
      const round = info.records.length + 1;
      const record = {id:task.code + '-R' + round, round, reviewKey, target:info.target, branch:info.branch, repo:info.project.repo,
        sourceCommit:info.sourceCommit, mergeCommit:'demo-merge-' + task.code + '-' + round,
        selfTest:task.developmentSelfTest, conflictReviewed:resolved, simulated:true, developmentRound:info.round,
        developer:tkGetPerson(info.dev.assigneeId).name, tester:tkGetPerson(info.test.assigneeId).name, timestamp:new Date().toISOString()};
      tkUpdateTask(task.id,{pendingMerge:null, codeDeliveries:[...info.records,record]});
    }
    const result = reviewTaskStage(activeTask(),true);
    close();
    if (result.ok) document.dispatchEvent(new CustomEvent('lingee:task-stage-completed',{detail:{taskId}}));
    toast(result.ok ? '已合入 ' + info.target + '，开发阶段已通过' : '合并结果已保留。' + (result.message || '请重试阶段流转'), result.ok ? 'success' : 'warning');
  }
  function waitForRepo(info, message = '') {
    show('评审已通过，待仓库合并', grid([['任务分支',info.branch],['目标分支',info.target],['已评审提交',info.sourceCommit]])
      + '<p class="tk-cd-note" role="status">' + (message || '请由有权限的成员在代码平台合入此提交，再检查结果。') + '</p>',
      button('打开代码仓库','repository') + button('检查合并结果','verify',true));
  }
  function start() {
    const info = currentReview();
    if (!info) return;
    const task = activeTask();
    const next = task.executionPlan[task.executionPlan.findIndex(row => row.id === info.dev.id) + 1];
    if (!info.target || !info.test.assigneeId || (next && !next.assigneeId && !task.flowAssignee)) {
      show('暂时无法合并','<p>请先配置目标分支和后续阶段处理人。</p>',button('返回评审','close')); return;
    }
    if (info.last?.reviewKey === reviewKey) { finish(); return; }
    if (info.pending?.platformMerged) { finish(); return; }
    if (info.pending || task.branchMergeScenario === 'protected') {
      if (!info.pending) tkUpdateTask(taskId,{pendingMerge:{key:reviewKey,platformMerged:false}});
      waitForRepo(info); return;
    }
    const conflict = ['conflict','unresolved'].includes(task.branchMergeScenario);
    show(conflict ? 'AI 正在处理冲突' : '正在合并到 ' + info.target,
      grid([['交付提交',info.sourceCommit],['目标分支',info.target]]),'');
    timer = setTimeout(() => {
      if (!currentReview()) return;
      if (!conflict || (task.stageReturns || []).length) { finish(); return; }
      if (task.branchMergeScenario === 'unresolved') {
        show('冲突需要手工处理','<p>以下文件仍有冲突。请在任务分支修复并提交，再次发起评审。</p><code>src/filters/status.ts</code>',
          button('返回开发评审','close') + button('模拟手工修复并提交','manual-fix',true)); return;
      }
      const diff = conflictFiles.map(([file, work, target, result], i) => '<details class="tk-cd-diff"' + (i === 0 ? ' open' : '') + '><summary>' + file + '</summary>'
        + [['任务分支',work],['目标分支',target],['AI 处理结果',result]].map(([label,code]) => '<p class="tk-cd-note">' + label + '</p><pre><code>' + escapeHtml(code) + '</code></pre>').join('') + '</details>').join('');
      show('核对冲突处理结果',diff + '<label class="tk-cd-check"><input id="tkCdResolved" type="checkbox">已核对差异并验证受影响用例</label><p class="tk-cd-error" role="alert"></p>',
        button('放弃本次处理','discard') + button('确认并合并','resolve',true));
    },450);
  }
  function showEnvironment() {
    const task = activeTask(), record = task?.codeDeliveries?.at(-1);
    if (!record || !task.branchMergeDemoKey || !tkCanViewTask(task)) return;
    const deployed = task.demoDeployedDelivery === record.id;
    show('共享测试环境',grid([['待验版本',record.target + ' · ' + record.mergeCommit],['当前环境版本',deployed ? record.mergeCommit : '上一部署版本']])
      + '<p class="tk-cd-note">' + (deployed ? '环境已包含本轮提交，可返回任务核对测试结果。' : '待验版本尚未部署。') + '</p>',
      button('返回任务','close') + (deployed ? '' : button('模拟部署本轮版本','deploy',true)));
  }
  document.addEventListener('lingee:code-delivery-approve', event => {
    if (dialog.open) return;
    taskId = Number(event.detail.taskId);
    reviewKey = taskCodeDeliveryContext(activeTask())?.reviewKey;
    start();
  });
  document.addEventListener('lingee:open-test-environment', event => {
    if (!dialog.open) { taskId = event.detail.taskId; showEnvironment(); }
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-cd-environment]');
    if (!link || dialog.open) return;
    taskId = Number(link.dataset.cdEnvironment);
    showEnvironment();
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => {
    const action = event.target.closest('[data-cd-action]')?.dataset.cdAction;
    if (!action) return;
    if (action === 'close' || action === 'discard') { close(); return; }
    if (action === 'deploy') {
      const task = activeTask();
      if (task?.branchMergeDemoKey && tkCanViewTask(task)) tkUpdateTask(taskId,{demoDeployedDelivery:task.codeDeliveries.at(-1).id});
      showEnvironment(); return;
    }
    const info = currentReview();
    if (!info) return;
    if (action === 'resolve') {
      if (!body.querySelector('#tkCdResolved')?.checked) { body.querySelector('[role="alert"]').textContent = '请先核对差异并验证受影响用例。'; return; }
      finish(true); return;
    }
    if (action === 'manual-fix' && activeTask().branchMergeScenario === 'unresolved') {
      tkUpdateTask(taskId,{developmentCommit:info.sourceCommit + '-fix',developmentSelfTest:null,pendingMerge:null,branchMergeScenario:'normal'});
      close(); toast('手工修复已提交，请重新评审并核对自测结果', 'success'); return;
    }
    if (!info.pending) return;
    if (action === 'repository') {
      show('代码仓库（模拟）',grid([['源分支',info.branch],['目标分支',info.target],['提交',info.sourceCommit]]),
        button('返回任务','back') + (info.pending.platformMerged ? '' : button('模拟维护者合入','platform-merge',true)));
    } else if (action === 'platform-merge') {
      tkUpdateTask(taskId,{pendingMerge:{...info.pending,platformMerged:true}});
      waitForRepo(info,'代码平台已合入。请检查合并结果。');
    } else if (action === 'back') waitForRepo(info);
    else if (action === 'verify') {
      if (info.pending.platformMerged) finish();
      else waitForRepo(info,'目标分支尚未包含此提交，请先在代码仓库完成合并。');
    }
  });
}
