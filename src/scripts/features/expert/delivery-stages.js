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
export function builtinDeliveryStages(teamId) {
  return teamId === 'general-app-dev' ? GENERAL_APP_STAGES : teamId === 'cosmic-app-dev' ? COSMIC_APP_STAGES : null;
}
