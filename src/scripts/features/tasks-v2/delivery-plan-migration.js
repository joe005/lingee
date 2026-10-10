import { deliveryStagesFor } from '../expert/delivery-stages.js';

function phase(stage) {
  const name = stage.title || stage.workType || stage.name || stage.id || '';
  if (/需求|问题定位|目标澄清/.test(name)) return 'requirements';
  if (/测试|验证|验收|评审/.test(name)) return 'verification';
  if (/部署|交付|发布/.test(name)) return 'verification';
  if (/设计|方案/.test(name)) return 'design';
  return 'implementation';
}
/* 合并旧节点时保留运行状态和产物，不重置已流转任务。 */
export function migrateDeliveryPlan(task, teamId) {
  const stages = deliveryStagesFor(teamId, task);
  if (!stages) return {};
  /* 目标阶段里没有的旧阶段并入相邻阶段：前期与实现类并入开发实现，验证与交付类并入测试验证（苍穹没有系统设计，缺陷修复只有开发实现、测试验证） */
  const ids = stages.map(stage => stage.id);
  const targetPhase = id => ids.includes(id) ? id : ['requirements','design','planning','agent','implementation'].includes(id) ? (ids.includes('implementation') ? 'implementation' : ids[0]) : (ids.includes('verification') ? 'verification' : ids[ids.length - 1]);
  const map = {requirements:targetPhase('requirements'),design:targetPhase('design'),planning:targetPhase('planning'),implementation:targetPhase('implementation'),agent:targetPhase('agent'),verification:targetPhase('verification'),delivery:targetPhase('delivery')};
  const old = task.executionPlan;
  if (Array.isArray(old) && old.length) {
    old.forEach(stage => { map[stage.id] = targetPhase(phase(stage)); });
    const current = map[task.executionStageId];
    task.executionPlan = stages.map(def => {
      const group = old.filter(stage => map[stage.id] === def.id);
      const active = group.find(stage => stage.id === task.executionStageId);
      const source = active || group.find(stage => ['blocked','review','running'].includes(stage.status)) || group[0] || {};
      let status = group.length && group.every(stage => stage.status === 'done') ? 'done' : (source.status === 'done' ? 'pending' : source.status || 'pending');
      const currentIndex = stages.findIndex(stage => stage.id === current);
      if (task.status === 'done' || (currentIndex >= 0 && stages.indexOf(def) < currentIndex)) status = 'done';
      return {...source,id:def.id,title:def.name,workType:def.name,name:def.name,description:def.desc || group.map(stage => stage.description).filter(Boolean).join('；'),status};
    });
  }
  function remap(value) {
    if (!value || typeof value !== 'object') return;
    Object.entries(value).forEach(([key, item]) => {
      if (['stageId','executionStageId'].includes(key) && map[item]) value[key] = map[item];
      else if (key !== 'executionPlan') remap(item);
    });
  }
  remap(task);
  return map;
}
