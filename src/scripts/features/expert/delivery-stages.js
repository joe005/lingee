/* 内置团队交付范围；WorkItem 在阶段内动态拆分。 */
export const GENERAL_APP_STAGES = [
  {id:'requirements',name:'需求分析',desc:'明确目标、范围与验收条件'},
  {id:'design',name:'系统设计',desc:'设计系统边界、接口与数据流'},
  {id:'implementation',name:'开发实现',desc:'实现功能并完成针对性验证'},
  {id:'verification',name:'测试验证',desc:'独立验证验收行为与回归影响'},
];
export const COSMIC_APP_STAGES = [
  {id:'requirements',name:'需求分析',desc:''},
  {id:'implementation',name:'开发实现',desc:''},
  {id:'verification',name:'测试验证',desc:''},
];
/* 缺陷修复路径：只有开发实现、测试验证 2 个阶段，内置团队与自建团队相同。 */
export const BUG_STAGES = [
  {id:'implementation',name:'开发实现',desc:'定位根因，修改代码并完成针对性自测'},
  {id:'verification',name:'测试验证',desc:'验证问题解决且相关功能未受影响'},
];
/* 任务类型为缺陷（旧任务没有类型时按「缺陷」标签）。 */
export function isBugTask(task) {
  return task?.issueType === '缺陷' || (!task?.issueType && Array.isArray(task?.labels) && task.labels.includes('缺陷'));
}
/* 内置团队按任务类型取交付阶段；自建团队返回 null，沿用各自配置的路径。 */
export function deliveryStagesFor(teamId, task) {
  const base = builtinDeliveryStages(teamId);
  return base && isBugTask(task) ? BUG_STAGES : base;
}
export function builtinDeliveryStages(teamId) {
  return teamId === 'general-app-dev' ? GENERAL_APP_STAGES : teamId === 'cosmic-app-dev' ? COSMIC_APP_STAGES : null;
}
