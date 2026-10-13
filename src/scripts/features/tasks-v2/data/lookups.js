import { CV_MEMBERS } from '../../collab/data.js';
import { TK_PEOPLE, TK_PRIORITIES, TK_STATUSES } from './constants.js';
import { tkProjectById } from './people.js';
/* 任务数据：名称与对象查询（拆自 tasks-v2/data.js） */

/* ---------- 工具函数：根据 id 查名称 ---------- */
function tkGetStatusName(id) {
  var s = TK_STATUSES.find(function (x) { return x.id === id; });
  return s ? s.name : id;
}
function tkGetPriorityName(id) {
  var p = TK_PRIORITIES.find(function (x) { return x.id === id; });
  return p ? p.name : id;
}
function tkGetPerson(id) {
  var p = TK_PEOPLE.find(function (x) { return x.id === id; });
  if (p) return p;
  var member = CV_MEMBERS.find(function (x) { return x.id === id; });
  return member ? { id:member.id, name:member.name, avatar:member.name.slice(0, 1), color:'#495dff' } : { id: id, name: '未分配', avatar: '?', color: '#b8b8b8' };
}
function tkGetProjectName(id) {
  var p = tkProjectById(id);
  return p ? p.name : id;
}
function tkGetStatusObj(id) {
  return TK_STATUSES.find(function (x) { return x.id === id; }) || {};
}
function tkGetPriorityObj(id) {
  return TK_PRIORITIES.find(function (x) { return x.id === id; }) || {};
}

export { tkGetPerson, tkGetPriorityName, tkGetPriorityObj, tkGetProjectName, tkGetStatusName, tkGetStatusObj };
