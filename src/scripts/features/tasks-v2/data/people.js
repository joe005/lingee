import { CV_MEMBERS, CV_PROJECTS, cvPeopleInProject } from '../../collab/data.js';
import { getLoginPersonId } from '../../login.js';
import { TK_DEMO_PERSON_IDS, TK_FILTER_FIELDS, TK_PEOPLE, TK_PERSON_COLORS } from './constants.js';
import { externalProjects } from './external-projects.js';
import { tkProjectsForCurrentUser } from './permissions.js';
import { _tasks } from './store.js';
/* 任务数据：任务人员同步、项目与人员查询、当前用户与阶段处理人（拆自 tasks-v2/data.js） */

function tkSyncPeople() {
  var assignedIds = typeof _tasks === 'undefined' ? [] : _tasks.flatMap(function (task) {
    return [task.assignee, task.createdBy].concat((task.executionPlan || []).map(function (stage) { return stage.assigneeId; }));
  }).filter(Boolean);
  var personIds = Array.from(new Set(TK_DEMO_PERSON_IDS.concat(assignedIds)));
  TK_PEOPLE.splice(0, TK_PEOPLE.length, ...personIds.map(function (id, index) {
    var person = CV_MEMBERS.find(function (row) { return row.id === id; });
    return person && person.status !== 'disabled' ? { id:person.id, name:person.name, avatar:person.name.slice(0, 1), color:TK_PERSON_COLORS[index % TK_PERSON_COLORS.length] } : null;
  }).filter(Boolean));
  TK_FILTER_FIELDS.find(function (field) { return field.id === 'assignee'; }).options = [{ value:'all', label:'全部' }].concat(TK_PEOPLE.map(function (person) { return { value:person.id, label:person.name }; }));
  TK_FILTER_FIELDS.find(function (field) { return field.id === 'project'; }).options = tkProjectsForCurrentUser().map(function (project) { return { value:project.id, label:project.name }; });
  if (typeof _tasks !== 'undefined') _tasks.forEach(function (task) {
    var people = tkPeopleInProject(task.project);
    if (!people.some(function (person) { return person.id === task.assignee; })) task.assignee = people[0]?.id || '';
    if (task.createdBy && !CV_MEMBERS.some(function (person) { return person.id === task.createdBy; })) task.createdBy = '';
  });
}
function tkProjectById(id) {
  if (!id) return undefined;
  return CV_PROJECTS.find(function (row) { return row.id === id; })
    || (externalProjects() || []).find(function (row) { return row.id === id; });
}
function tkPeopleInProject(projectId) {
  var project = tkProjectById(projectId);
  if (!project) return [];
  var members = cvPeopleInProject(project);
  var owner = CV_MEMBERS.find(function (person) { return person.name === project.owner; });
  if (owner && !members.some(function (person) { return person.id === owner.id; })) members.push(owner);
  return members.filter(function (person) { return person.status !== 'disabled'; }).map(function (person, index) {
    return { id:person.id, name:person.name, avatar:person.name.slice(0, 1), color:TK_PERSON_COLORS[TK_DEMO_PERSON_IDS.indexOf(person.id)] || TK_PERSON_COLORS[index % TK_PERSON_COLORS.length] };
  });
}
function tkCurrentUserId() {
  var personId = getLoginPersonId();
  return CV_MEMBERS.some(function (person) { return person.id === personId && person.status !== 'disabled'; }) ? personId : '';
}
function tkCurrentStageHandlerId(task) {
  if (!task) return '';
  if (!Array.isArray(task.executionPlan) || !task.executionPlan.length) return task.assignee || '';
  var stage = task.executionPlan.find(function (row) { return row.id === task.executionStageId; })
    || task.executionPlan.find(function (row) { return row.status !== 'done'; })
    || task.executionPlan[0];
  return stage?.assigneeId || '';
}

export { tkCurrentStageHandlerId, tkCurrentUserId, tkPeopleInProject, tkProjectById, tkSyncPeople };
