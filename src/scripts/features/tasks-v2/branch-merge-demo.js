/* 仅显式演示链接启用；独立模拟空间，不修改已有空间的 Git 配置。 */
import { tkAddTask, tkCurrentUserId, tkGetPerson, tkGetTasks, tkSyncPeople, tkUpdateTask } from './data.js';
import { externalProjects, tkSetExternalProjects } from './data/external-projects.js';

// 启动路由会规范化查询串，须在视图初始化前读取体验意图。
const initialDemoMode = new URLSearchParams(location.search).get('mergeDemo');

export function initBranchMergeDemo(onDemoReady) {
  const mode = initialDemoMode;
  const requested = ['development','testing'].includes(mode);
  const registered = new Set();
  function load() {
    const me = tkCurrentUserId();
    if (!me) return;
    const projectId = 'branch-merge-demo-' + me;
    if (!requested && !tkGetTasks().some(task => task.project === projectId && task.branchMergeDemoKey)) return;
    if (!registered.has(projectId)) {
      const previous = externalProjects;
      const project = {id:projectId,name:'任务分支合并体验（模拟）',repo:'https://example.invalid/merge-demo.git',baseBranch:'develop',members:[me],owner:tkGetPerson(me).name,containsRd:true};
      tkSetExternalProjects(() => previous().concat(project));
      registered.add(projectId);
    }
    const tasks = ['development','testing'].map(kind => {
      const key = projectId + '-' + kind;
      const existing = tkGetTasks().find(task => task.branchMergeDemoKey === key);
      if (existing) {
        const title = kind === 'testing' ? '分支合并体验：测试产物审核' : '分支合并体验：开发产物审核';
        if (existing.title === '分支合并体验：提交测试报告' || existing.title === '分支合并体验：开发提交测试') tkUpdateTask(existing.id,{title,desc:'纯模拟体验，当前账号兼任开发和测试。请查看阶段产物并通过原有审核入口确认；开发审核自动模拟合并，测试报告复用阶段产物并自动关联本轮提测。'});
        return existing;
      }
      const testing = kind === 'testing';
      const task = tkAddTask({title:testing ? '分支合并体验：测试产物审核' : '分支合并体验：开发产物审核',
        desc:'纯模拟体验，仓库与合并均为虚构。为方便单人体验，需求、开发和测试阶段均由当前账号兼任；实际任务沿用研发模式的各阶段负责人。请查看阶段产物并通过原有审核入口确认；开发审核自动模拟合并，测试审核自动关联本轮测试报告。',
        branchMergeDemoKey:key,project:projectId,assignee:me,createdBy:me,issueType:'需求',priority:'high',labels:['演示'],status:'in_review',planStatus:'confirmed',executionStageId:testing?'verification':'implementation',
        executionPlan:[{id:'requirements',title:'需求分析',workType:'需求分析',assigneeId:me,status:'done',requiresConfirmation:true},
          {id:'implementation',title:'开发实现',workType:'开发实现',assigneeId:me,status:testing?'done':'review',requiresConfirmation:true},
          {id:'verification',title:'测试验证',workType:'测试验证',assigneeId:me,status:testing?'review':'pending',requiresConfirmation:true}],
        executionArtifacts:[{id:key+'-requirements',stageId:'requirements',fileName:'体验任务-需求说明.md',docTitle:'体验任务需求说明',type:'需求文档',status:'已通过',author:tkGetPerson(me).name,
          summary:'支持按状态筛选任务，并保留筛选结果。',sections:[{heading:'验收标准',blocks:[{p:'选择状态后仅展示匹配的任务，清除条件后恢复全部结果。测试报告需记录验证范围与结论。'}]}]}],
        ...(testing ? {codeDeliveries:[{id:key+'-R1',round:1,target:'develop',branch:'feature/demo-filter',repo:'https://example.invalid/merge-demo.git',developer:tkGetPerson(me).name,tester:tkGetPerson(me).name,mergeCommit:'demo-filter-r1',developmentRound:0,simulated:true,timestamp:'原型预置模拟记录'}]} : {})});
      return task;
    });
    tasks.forEach(task => {
      const last = task.codeDeliveries?.at(-1);
      if (task.status !== 'in_review' || task.executionStageId !== 'verification' || !last || (task.executionArtifacts || []).some(artifact => artifact.deliveryId === last.id && artifact.stageId === 'verification')) return;
      const artifact = {id:'demo-test-'+last.id,stageId:'verification',deliveryId:last.id,mergeCommit:last.mergeCommit,type:'测试报告',fileName:task.code+'-测试报告-R'+last.round+'.md',docTitle:'任务筛选功能测试报告（模拟）',status:'待评审',author:tkGetPerson(me).name,summary:'模拟验证：状态筛选、清除条件和空结果展示符合验收标准。',sections:[{heading:'验证范围与结论',blocks:[{p:'原型模拟报告：已验证状态筛选、清除条件及无匹配结果提示，结果通过。实际测试应在团队流水线部署后的环境验证。'}]},{heading:'测试关联',blocks:[{p:'第 '+last.round+' 轮提测，关联记录自动带入。'}]}]};
      tkUpdateTask(task.id,{executionArtifacts:(task.executionArtifacts || []).concat(artifact)});
    });
    tkSyncPeople();
    // 沿用现有详情与操作入口，不增加产品页面或配置控件。
    if (requested) setTimeout(() => onDemoReady(tasks[mode === 'testing' ? 1 : 0],mode === 'testing'?'report':'deliver'),0);
  }
  load();
  document.addEventListener('lingee:auth-changed',load);
}
