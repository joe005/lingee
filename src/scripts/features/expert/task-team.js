/* 任务的执行方：默认取任务或项目绑定的专家团；
   任务指定单个专家（expertId）时，按只含该专家的团队处理，名称与头像都用这个专家。 */
import { EXPERTS, PRESET_TEAMS } from './data.js';
import { TEAMS } from './store.js';

export function taskExecutorTeam(task, project) {
  if (task?.expertId) {
    var expert = EXPERTS.find(function (row) { return row.id === task.expertId; });
    return { id:'expert:' + task.expertId, name:expert?.name || task.expertId, members:[task.expertId], leadId:task.expertId, solo:true };
  }
  var teamId = task?.teamId || project?.defaultTeam;
  return TEAMS.find(function (row) { return row.id === teamId; })
    || PRESET_TEAMS.find(function (row) { return row.id === teamId; })
    || null;
}
