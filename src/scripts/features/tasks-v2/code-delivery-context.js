import { tkProjectById } from './data.js';

/* 现有任务的代码交付上下文：读取已存在的项目与阶段人员，不另设负责人配置。 */
export function taskCodeDeliveryContext(task) {
  if (!task) return null;
  const project = tkProjectById(task.project);
  if (!project?.repo) return null;
  const plan = task.executionPlan || [];
  const dev = plan.find(stage => /编码|开发|实现/.test(stage.title || stage.workType || '') && !/需求|规划|设计/.test(stage.title || stage.workType || ''));
  const devIndex = plan.indexOf(dev);
  const test = devIndex >= 0 ? plan.slice(devIndex + 1).find(stage => /测试|验证/.test(stage.title || stage.workType || '')) : null;
  if (!dev || !test) return null;
  const records = task.codeDeliveries || [];
  const last = records.at(-1);
  return { project, dev, test, target:project.baseBranch || '',
    branch:task.gitBranch || 'feature/' + String(task.code || task.id).toLowerCase(),
    isDevelopment:task.executionStageId === dev.id, isTesting:task.executionStageId === test.id,
    records, last, reports:task.testDeliveryReports || [] };
}

export function taskCodeDeliveryApprovalError(task) {
  const context = taskCodeDeliveryContext(task);
  if (!context) return '';
  if (context.isDevelopment && (!context.last || context.last.developmentRound !== (task.stageReturns || []).length)) return '开发审核通过后需完成本轮分支合并，成功后才流转下一阶段。';
  if (context.isTesting && context.last && !taskCodeTestArtifacts(task).length) return '当前阶段缺少关联本轮提测的测试报告，请先生成本轮阶段产物再审核。';
  return '';
}

export function taskCodeTestArtifacts(task) {
  const context = taskCodeDeliveryContext(task);
  if (!context?.last) return [];
  return (task.executionArtifacts || []).filter(artifact => artifact.stageId === context.test.id && artifact.deliveryId === context.last.id && /测试报告/.test([artifact.type,artifact.fileName,artifact.docTitle].join(' ')));
}
