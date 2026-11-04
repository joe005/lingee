import { xesc, xav } from './data.js';

/* 企业资产与审核详情共用团队字段和成员展示，成员数据由所属版本解析。 */
export function platformTeamFields(team, resolve) {
  const lead = team.leadId ? resolve(team.leadId)?.data : null;
  return '<dt>成员数</dt><dd>' + (team.members || []).length + '</dd><dt>团队负责人</dt><dd>' + xesc(lead?.name || team.leadId || '未设置') + '</dd><dt>领域</dt><dd>' + ((team.domains || []).map(tag => '<span class="ptag">' + xesc(tag) + '</span>').join(' ') || '暂无') + '</dd>';
}

export function platformTeamMembers(team, resolve) {
  const members = team.members || [];
  return '<section class="platform-team-members"><h3>成员</h3>' + (members.length ? members.map(id => {
    const entry = resolve(id), data = entry?.data;
    return '<article class="platform-team-member"><img src="' + xav(data?.k) + '" alt=""><div><div class="platform-team-member-title"><strong>' + xesc(data?.name || id) + '</strong>' + (id === team.leadId ? '<span class="ptag">组长</span>' : '') + (entry?.version ? '<span class="ptag">V' + xesc(entry.version) + '</span>' : '') + '</div><p class="platform-team-member-code">' + xesc(id) + '</p><p>' + xesc(data?.desc || '暂无简介') + '</p></div></article>';
  }).join('') : '<p>暂无成员</p>') + '</section>';
}
