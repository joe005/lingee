import { CV_TASKS, CV_PROJECTS } from './data.js';
import { TEAMS } from '../expert/store.js';
import { EX } from '../expert/data.js';
/* 任务看板共享核心：列定义、当前任务、状态持久化与派生工具
   task-board / new-task / task-chat 三个模块共用，避免彼此循环依赖。 */


export const tbColumns = [
  ['未开始', '待开始', 'pending', '○'], ['进行中', '进行中', 'running', '◐'],
  ['待评审', '待确认', 'review', '◎'], ['已完成', '已完成', 'done', '✓'],
  ['已失败', '需处理', 'failed', '!'],
];
const storageKey = 'lingee_task_board_v1';
const legacyTeamIds = {
  'software-company': 'general-app-dev', 'fast-app': 'kingdee-saas-implementation',
  'cosmic-team': 'cosmic-app-dev', 'web-team': 'kingdee-secondary-dev',
};
let selected = null;

/* selected 由其它模块写回；import 绑定只读，所以走 setter */
export function tbGetSelected() { return selected; }
export function tbSetSelected(v) { selected = v; return v; }

export function tbCurrentTeamId(id) { return legacyTeamIds[id] || id; }
export function tbTaskId(t) { return t.boardId || t.source + ':' + t.sourceId + ':' + t.project; }
export function tbMode(t) { return t.mode || (t.collab === '无需协作' ? '单人执行' : '多人协作'); }
export function tbOwner(t) { return t.assignee === 'AI开发Agent' ? '开发专家' : t.assignee; }
export function tbTeamName(t) {
  const id = tbCurrentTeamId(t.teamId === undefined ? CV_PROJECTS.find(p => p.id === t.project)?.defaultTeam : t.teamId);
  return TEAMS.find(team => team.id === id)?.name || '未指定专家团';
}
/* 任务指派后：先匹配专家团，再根据任务意图匹配专家 */
export function tbMatchedTeam(t) {
  const id = tbCurrentTeamId(t.teamId === undefined ? CV_PROJECTS.find(p => p.id === t.project)?.defaultTeam : t.teamId);
  return TEAMS.find(team => team.id === id) || null;
}
export function tbMatchExperts(t) {
  const team = tbMatchedTeam(t);
  if (team && team.members && team.members.length) {
    const names = team.members.slice(0, 3).map(m => (EX[m] && EX[m].name) || m);
    if (names.length) return names;
  }
  /* 没有绑专家团时，按任务类型/关键词退化为角色建议 */
  if (/Bug|修复|错误|异常|失败/.test(t.type + t.title)) return ['架构专家', '开发专家', '测试专家'];
  if (/需求|方案|设计/.test(t.type + t.title)) return ['需求专家', '架构专家'];
  return ['开发专家'];
}
export function tbPriority(t) { return t.priority || (t.type === 'Bug' ? '高' : '中'); }
export function tbLabel(status) { return tbColumns.find(c => c[0] === status)?.[1] || status; }
export function tbSave() {
  try { localStorage.setItem(storageKey, JSON.stringify(CV_TASKS)); return true; }
  catch { window.alert('本地空间不足，修改仅保留在本次打开的页面中。'); return false; }
}
export { storageKey };
