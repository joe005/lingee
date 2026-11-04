import { skillInfo, xesc } from './data.js';

/* 平台详情沿用本地智能体详情的技能名称、说明与卡片结构。 */
export function platformExpertSkills(expert) {
  const skills = expert.skills || [];
  return '<section class="platform-expert-skills"><div class="x-skill-head"><strong>关联技能</strong></div>'
    + (skills.length ? '<div class="x-skill-list">' + skills.map(id => {
      const skill = skillInfo(id);
      return '<div class="x-skill-row"><span class="x-skill-icon tone-' + xesc(skill.tone) + '" aria-hidden="true">' + xesc(skill.name.charAt(0)) + '</span><span class="x-skill-copy"><strong>' + xesc(skill.name) + '</strong><span>' + xesc(skill.desc) + '</span></span></div>';
    }).join('') + '</div>' : '<div class="x-skill-empty">这位智能体暂未挂载技能</div>') + '</section>';
}
