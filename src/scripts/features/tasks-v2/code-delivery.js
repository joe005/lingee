import '../../../styles/parts/tasks/code-delivery.css';
import { toast } from '../../core/toast.js';
import { tkCanViewTask, tkCurrentStageHandlerId, tkCurrentUserId, tkGetPerson, tkGetTasks, tkUpdateTask } from './data.js';
import { taskCodeDeliveryContext } from './code-delivery-context.js';
import { reviewTaskStage } from './task-execution.js';

function cdEscape(value) { return String(value ?? '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]); }
function cdButton(label,action,primary,disabled) { return '<button type="button" class="' + (primary ? 'tk-btn-primary' : 'tk-btn-ghost') + '" data-cd-action="' + action + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button>'; }
// 仅演示链接可指定异常情形，不增加产品配置或独立提交入口。
const initialScenario = new URLSearchParams(location.search).get('mergeScenario');

export function initTaskCodeDelivery() {
  const dialog = document.getElementById('tkCodeDeliveryDialog');
  if (!dialog) return;
  document.body.appendChild(dialog);
  const body = dialog.querySelector('#tkCodeDeliveryBody');
  const foot = dialog.querySelector('#tkCodeDeliveryFoot');
  let taskId = null, snapshot = null, opener = null, busy = false, resolved = false;
  let scenario = 'normal';
  function activeTask() { return tkGetTasks().find(task => task.id === taskId); }
  function allowed(task) { return task && tkCanViewTask(task) && tkCurrentStageHandlerId(task) === tkCurrentUserId() && task.status === 'in_review'; }
  function signature(task,info) { return [task.executionStageId,task.status,task.updatedAt,info.project.repo,info.target,info.dev.assigneeId,info.test.assigneeId,(task.stageReturns || []).length,info.records.length].join('|'); }
  function close() { if(busy)return; dialog.close(); if(opener?.isConnected)opener.focus({preventScroll:true}); }
  function show(title,content,actions) {
    dialog.querySelector('#tkCodeDeliveryTitle').textContent=title;
    dialog.querySelector('#tkCodeDeliveryMeta').textContent=(activeTask()?.code || '')+' · 原型模拟，不执行真实 Git 或流水线';
    body.innerHTML=content; foot.innerHTML=actions;
    dialog.querySelector('.tk-cd-close').disabled=busy;
    if(!dialog.open){opener=document.activeElement;dialog.showModal();}
  }
  function mergeAfterApproval() {
    const task=activeTask(),info=taskCodeDeliveryContext(task);
    if(!allowed(task)||!info?.isDevelopment){close();toast('任务状态或审核权限已变化','warning');return;}
    snapshot=signature(task,info);
    const blocked=!info.target || !info.test.assigneeId || scenario==='protected';
    if(blocked){
      const reason=!info.target ? '空间尚未配置目标分支，请在已有空间设置中完善。' : !info.test.assigneeId ? '请先在已有执行计划中指定测试处理人。' : '目标分支受保护，请按团队约定在代码平台处理合并权限或审批。';
      show('暂未通过审核','<div class="tk-cd-callout warning">'+reason+'任务保留在开发待审核阶段。</div>',cdButton('返回审核','close'));
      return;
    }
    if(scenario==='conflict'&&!resolved){
      show('合并存在冲突','<div class="tk-cd-callout warning">开发审核尚未完成。请开发负责人解决冲突并自测，再重试合并。</div>'
        +'<div class="tk-cd-grid"><div><span>任务分支</span><code>'+cdEscape(info.branch)+'</code></div><div><span>空间目标分支</span><code>'+cdEscape(info.target)+'</code></div></div>'
        +'<p class="tk-cd-note">模拟冲突文件：src/pages/orders/list.tsx</p>'
        +'<label class="tk-cd-check"><input type="checkbox" id="tkCdResolved">已检查冲突解决结果并完成受影响功能自测</label><p id="tkCdError" class="tk-cd-error" role="alert"></p>',cdButton('返回审核','close')+cdButton('重新检查并合并','retry',true));
      return;
    }
    const next=task.executionPlan[task.executionPlan.findIndex(stage=>stage.id===info.dev.id)+1];
    if(next && !next.assigneeId && !task.flowAssignee){
      show('暂未通过审核','<div class="tk-cd-callout warning">请先在现有执行计划中指定下一阶段处理人，任务仍保留在开发待审核阶段。</div>',cdButton('返回审核','close'));return;
    }
    busy=true;
    show('正在完成开发审核','<p class="tk-cd-note">正在模拟检查并合并到空间配置的目标分支，成功后自动流转。</p>',cdButton('正在合并…','none',true,true));
    setTimeout(()=>{
      const latest=activeTask(),context=taskCodeDeliveryContext(latest);
      if(!allowed(latest)||!context||signature(latest,context)!==snapshot){busy=false;close();toast('任务或空间配置已变化，请重新审核','warning');return;}
      const round=context.records.length+1;
      const record={id:latest.code+'-R'+round,round,target:context.target,branch:context.branch,repo:context.project.repo,
        developer:tkGetPerson(context.dev.assigneeId).name,tester:tkGetPerson(context.test.assigneeId).name,
        mergeCommit:'demo-'+latest.code.toLowerCase()+'-r'+round,timestamp:new Date().toLocaleString('zh-CN',{timeZone:'Asia/Kuala_Lumpur'}),developmentRound:(latest.stageReturns||[]).length,simulated:true};
      tkUpdateTask(latest.id,{codeDeliveries:context.records.concat(record)});
      const result=reviewTaskStage(activeTask(),true);
      busy=false;close();
      document.dispatchEvent(new CustomEvent('lingee:task-stage-completed',{detail:{taskId}}));
      toast(result.ok ? '开发审核通过，模拟合并成功，已流转下一阶段' : '合并记录已保留，审核流转未完成：'+(result.message||'请检查执行计划'),result.ok?'success':'warning');
    },500);
  }
  document.addEventListener('lingee:code-delivery-approve',event=>{
    if(busy||dialog.open)return;
    taskId=Number(event.detail.taskId);resolved=false;
    scenario=activeTask()?.branchMergeDemoKey && ['conflict','protected'].includes(initialScenario) ? initialScenario : 'normal';
    mergeAfterApproval();
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('click',event=>{
    const button=event.target.closest('[data-cd-action]');if(!button||button.disabled)return;
    if(button.dataset.cdAction==='close')close();
    if(button.dataset.cdAction==='retry'){
      if(!body.querySelector('#tkCdResolved')?.checked){body.querySelector('#tkCdError').textContent='请先确认冲突解决结果和自测。';return;}
      resolved=true;mergeAfterApproval();
    }
  });
}
