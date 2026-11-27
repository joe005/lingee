/* 演示链接只操作独立模拟任务，仓库和部署结果都保存在原型里。 */
import { tkAddTask, tkCurrentUserId, tkGetPerson, tkGetTasks, tkSyncPeople, tkUpdateTask } from './data.js';
import { externalProjects, tkSetExternalProjects } from './data/external-projects.js';

const query = new URLSearchParams(location.search);
const mode = query.get('mergeDemo');
const requested = ['development', 'testing'].includes(mode);
const scenario = ['protected', 'conflict', 'unresolved'].includes(query.get('mergeScenario')) ? query.get('mergeScenario') : 'normal';

function prepareDemoReview(task) {
  if (!task.branchMergeDemoKey) return;
  const stageId = task.executionStageId;
  if (stageId !== 'verification' && stageId !== 'implementation') return;
  const reviewing = task.status === 'in_review';
  if (!reviewing && task.status !== 'backlog') return;
  const testing = stageId === 'verification';
  const delivery = task.codeDeliveries?.at(-1);
  if (testing && !delivery) return;
  const round = (task.stageReturns || []).length;
  const id = testing ? 'demo-test-' + delivery.id : 'demo-dev-' + task.id + '-' + round;
  const exists = task.executionArtifacts?.some(row => row.id === id);
  if (reviewing && exists) return;
  const commit = round ? 'a1b2c3-' + (round + 1) : 'a1b2c3';
  const selfTest = {commit,result:'通过',details:'按状态筛选、清除筛选、无匹配结果，3 项通过。'};
  const artifact = {id,stageId,author:tkGetPerson(task.assignee).name,status:'待评审',
    ...(testing ? {deliveryId:delivery.id,mergeCommit:delivery.mergeCommit,type:'测试报告',docTitle:'共享环境验收用例',fileName:task.code+'-环境验收-R'+delivery.round+'.md',
      summary:'核对部署版本，验证筛选、清除筛选和无匹配结果。',sections:[{heading:'待验版本',blocks:[{p:delivery.target+' · '+delivery.mergeCommit}]},{heading:'验收用例',blocks:[{p:'在共享环境按状态筛选、清除条件、检查空列表，并核对权限可见范围。'}]}]}
      : {type:'开发产物',docTitle:'任务筛选开发说明',fileName:task.code+'-开发说明.md',summary:selfTest.details,sections:[{heading:'自测结果',blocks:[{p:selfTest.details}]}]})};
  tkUpdateTask(task.id, {status:'in_review',
    executionPlan:task.executionPlan.map(stage => stage.id === stageId ? {...stage,status:'review'} : stage),
    executionArtifacts:exists ? task.executionArtifacts : [...(task.executionArtifacts || []),artifact],
    ...(!testing ? {developmentCommit:commit,developmentSelfTest:selfTest,pendingMerge:null} : {})});
}

export function initBranchMergeDemo(onDemoReady) {
  const registered = new Set();
  function load() {
    const me = tkCurrentUserId();
    if (!me) return;
    const projectId = 'branch-merge-demo-' + me;
    if (!requested && !tkGetTasks().some(task => task.project === projectId && task.branchMergeDemoKey)) return;
    const repo = 'https://example.invalid/merge-demo.git';
    if (!registered.has(projectId)) {
      const previous = externalProjects;
      const project = {id:projectId,name:'任务分支合并体验（模拟）',repo,baseBranch:'develop',members:[me],owner:tkGetPerson(me).name,containsRd:true};
      tkSetExternalProjects(() => previous().concat(project));
      registered.add(projectId);
    }
    if (!requested) return;
    const testing = mode === 'testing';
    const key = [projectId,mode,testing ? 'environment' : scenario].join('-');
    let task = tkGetTasks().find(row => row.branchMergeDemoKey === key);
    if (!task) {
      task = tkAddTask({title:testing ? '任务筛选 · 共享环境验收' : '任务筛选 · 开发交付',
        desc:'按状态筛选任务，并验证筛选结果的权限范围。',branchMergeDemoKey:key,branchMergeScenario:scenario,
        project:projectId,assignee:me,createdBy:me,issueType:'需求',priority:'high',labels:['演示'],status:'in_review',planStatus:'confirmed',
        repoSnapshot:{repo,repoKey:'example.invalid/merge-demo',baseBranch:'develop'},executionStageId:testing?'verification':'implementation',
        executionPlan:[{id:'requirements',title:'需求分析',workType:'需求分析',assigneeId:me,status:'done',requiresConfirmation:true},
          {id:'implementation',title:'开发实现',workType:'开发实现',assigneeId:me,status:testing?'done':'review',requiresConfirmation:true},
          {id:'verification',title:'测试验证',workType:'测试验证',assigneeId:me,status:testing?'review':'pending',requiresConfirmation:true}]});
      const branch = 'kteam/' + projectId + '/' + task.code;
      tkUpdateTask(task.id,{gitBranch:branch,...(testing ? {codeDeliveries:[{id:key+'-R1',round:1,target:'develop',branch,repo,
        sourceCommit:'a1b2c3',mergeCommit:'d4e5f6',selfTest:{commit:'a1b2c3',result:'通过',details:'筛选、清除及空结果用例通过。'},developmentRound:0,simulated:true}]} : {})});
    }
    prepareDemoReview(task);
    tkSyncPeople();
    setTimeout(() => onDemoReady(task),0);
  }
  document.addEventListener('lingee:task-updated', event => {
    const {task,patch} = event.detail;
    if (task.branchMergeDemoKey && patch.status === 'backlog') prepareDemoReview(task);
  });
  load();
  document.addEventListener('lingee:auth-changed',load);
}
