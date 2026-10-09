import { CV_MEMBERS, cvCurrentUserName, cvPersonById } from '../collab/data.js';
import { EX, EXPERTS } from '../expert/data.js';
import { TEAMS, teamById } from '../expert/store.js';
import { tkAddTask, tkCanDeleteTask, tkCurrentStageHandlerId, tkDeleteTask, tkGetTasks, tkPruneOrphanTasks, tkSetTasks, tkSetExternalProjects } from '../tasks-v2/data.js';
/* 管理板块数据：管理项目、项目任务、议题、项目知识库。
   与协作开发的项目 / 任务数据分开存放，避免管理项目出现在开发板块的项目列表里；
   人员、智能体与智能体团队直接复用协作开发和专家模块的基础数据。 */

var PROJECTS_KEY = 'lingee-manager-projects-v1';
var TASKS_KEY = 'lingee-manager-tasks-v1';
var ISSUES_KEY = 'lingee-manager-project-issues-v1';
var PERM_KEY = 'lingee-manager-session-perm-v1';
var DELETED_KEY = 'lingee-manager-deleted-projects-v1';

/* ---------- 管理项目（演示数据） ----------
   mgrRisk / mgrDecide / mgrOk 是卡片上的风险、待决策与「运行正常」标记，
   mgrProgress 是卡片与概览共用的进度百分比。 */
var SEED_PROJECTS = [
  {
    id: 'mgmt-budget', name: '2027 预算目标制定与编制',
    desc: '9 月底前确定 2027 年度经营目标（增长与利润）并快速达成共识；12 月 15 日前完成预算编制、审议与下达。',
    mgrRisk: 2, mgrDecide: 2, mgrProgress: 34, status: 'in_progress', priority: '高', owner: '何一',
    dot: 'blue', start: '2026-09-01', end: '2026-12-15',
    milestones: [
      { name: '确定 2027 年度经营目标', date: '2026-09-30' },
      { name: '预算编制、审议与下达', date: '2026-12-15' },
    ],
    members: ['p22', 'p01', 'p03', 'p04', 'p07'],
  },
  {
    id: 'mgmt-routine', name: '例行会议',
    desc: '围绕 CEO 月度会议，把上期决议执行、本月固定主题、CEO助理筛选后的专项议题和其他 Project 推送的候选项组织起来（跟踪决议闭环）。',
    mgrRisk: 1, mgrDecide: 2, mgrProgress: 72, status: 'in_progress', priority: '高', owner: '李峰',
    dot: 'orange', start: '2026-01-01', end: '2026-12-31',
    milestones: [{ name: '9 月例会决议闭环', date: '2026-09-30' }],
    members: ['p22', 'p07', 'p08'],
  },
  {
    id: 'mgmt-adhoc', name: '非例行会议',
    desc: '把月度经营会之外需要快速判断的事项组织起来：统一先落入待处理池，由负责人在 24 小时内判断——跟进（下达任务或组建专项）或合并到例行会议。',
    mgrRisk: 2, mgrDecide: 3, mgrProgress: 68, status: 'in_progress', priority: '中', owner: '陈静',
    dot: 'green', start: '2026-01-01', end: '2026-12-31',
    milestones: [{ name: '待处理池当日清零机制运行', date: '2026-10-15' }],
    members: ['p22', 'p04', 'p08'],
  },
  {
    id: 'mgmt-procurement', name: '重点物料采购降本与保供',
    desc: '在不影响供应安全的前提下，将重点物料采购成本降低 5%。',
    mgrRisk: 1, mgrDecide: 2, mgrProgress: 64, status: 'in_progress', priority: '高', owner: '周叙',
    dot: 'blue', start: '2026-06-01', end: '2026-12-31',
    milestones: [{ name: '长协与分批建仓方案落地', date: '2026-11-30' }],
    members: ['p22', 'p02', 'p07'],
  },
  {
    id: 'mgmt-ar', name: '应收账款改善',
    desc: '将 DSO 从 68 天降至 55 天，逾期 90 天以上余额压降 40%。',
    mgrRisk: 1, mgrDecide: 1, mgrProgress: 38, status: 'in_progress', priority: '中', owner: '何一',
    dot: 'orange', start: '2026-07-01', end: '2026-12-31',
    milestones: [{ name: '逾期 90 天以上余额压降 40%', date: '2026-12-31' }],
    members: ['p22', 'p04', 'p09'],
  },
  {
    id: 'mgmt-ai-procurement', name: 'AI 采购部',
    desc: '以 4 个 AI 岗位承担询价、比价、合同初审与交付跟催，人均事务性工作下降 40%。',
    mgrOk: true, mgrProgress: 52, status: 'in_progress', priority: '中', owner: '周叙',
    dot: 'green', start: '2026-05-01', end: '2026-12-31',
    milestones: [{ name: '4 个 AI 岗位上线运行', date: '2026-10-31' }],
    members: ['p22', 'p02', 'p07'],
  },
  {
    id: 'mgmt-line-down', name: '华东产线停机处置',
    desc: '7 日内恢复华东产线满产，客户交付延迟控制在 3 天以内。',
    mgrRisk: 2, mgrDecide: 1, mgrProgress: 30, status: 'in_progress', priority: '高', owner: '陈锐',
    dot: 'blue', start: '2026-09-20', end: '2026-10-20',
    milestones: [{ name: '产线恢复满产验收', date: '2026-09-30' }],
    members: ['p22', 'p06', 'p07'],
  },
  {
    id: 'mgmt-going-global', name: '2027 出海战略落地',
    desc: '2027 财年前完成首个东南亚国家的产品本地化、渠道搭建与合规准入。',
    mgrOk: true, mgrProgress: 22, status: 'in_progress', priority: '中', owner: '王俊',
    dot: 'green', start: '2026-10-01', end: '2027-03-31',
    milestones: [{ name: '首国合规准入完成', date: '2026-12-31' }],
    members: ['p22', 'p08', 'p19'],
  },
  {
    id: 'mgmt-capacity', name: '华东产能扩建决策',
    desc: '在 9 月底前就华东产能扩建作出可执行决策，并留下完整决策依据。',
    mgrRisk: 0, mgrDecide: 1, mgrProgress: 70, status: 'in_progress', priority: '高', owner: '陈锐',
    dot: 'orange', start: '2026-08-01', end: '2026-09-30',
    milestones: [{ name: '产能扩建决策上会', date: '2026-09-28' }],
    members: ['p22', 'p06', 'p04'],
  },
  /* 汇报 6.1 / 6.2 的贯穿项目：在 Manage 立项，研发任务 T1001500–T1001506 在协作开发里处理 */
  {
    id: 'equipment', name: '设备巡检维修系统建设',
    desc: '在金蝶 ERP 上建设备台账、扫码巡检、故障报修与维修记录，并沉淀老师傅的排障经验。',
    goal: '8 周内上线设备巡检维修系统：巡检、报修、维修全程线上留痕；设备主管把排障经验做成故障诊断助手，新人也能按老师傅的思路排查',
    mgrOk: true, mgrProgress: 56, status: 'in_progress', priority: '高', owner: '张工',
    dot: 'blue', start: '2026-09-14', end: '2026-11-06',
    containsRd: true, defaultTeam: 'cosmic-app-dev', teamIds: ['cosmic-app-dev'],
    repo: 'https://github.com/kingdee/equipment-ops', baseBranch: 'main',
    milestones: [
      { name: '系统上线', date: '2026-10-16' },
      { name: '诊断助手发布', date: '2026-10-23' },
    ],
    members: ['p01', 'p02', 'p03', 'p04', 'p05', 'p07', 'p42', 'p22'],
  },
];

/* ---------- 项目任务（演示数据，按里程碑挂靠） ---------- */
var SEED_TASKS = [
  {
    project: 'mgmt-budget',
    rows: [
      { title: '一上目标差异分析：为什么超了 1.2 个点', milestone: 0, status: 'done', assignee: 'p04', dueDate: '2026-09-18' },
      { title: '分档压降方案测算与口径对齐', milestone: 0, status: 'in_progress', assignee: 'p03', dueDate: '2026-09-26' },
      { title: '人力 +5.2% 的构成拆解与编制建议', milestone: 1, status: 'in_review', assignee: 'p01', dueDate: '2026-11-28' },
      { title: '预算编制、审议与下达材料包', milestone: 1, status: 'backlog', assignee: 'p22', dueDate: '2026-12-12' },
    ],
  },
  {
    project: 'mgmt-procurement',
    rows: [
      { title: '铜材涨价对 Q3 降本目标的影响测算', milestone: 0, status: 'in_progress', assignee: 'p02', dueDate: '2026-10-20' },
      { title: '长协锁价还是分批建仓：比价与建议', milestone: 0, status: 'in_review', assignee: 'p07', dueDate: '2026-10-25' },
      { title: '第三家供应商引入评估', milestone: 0, status: 'backlog', assignee: 'p22', dueDate: '2026-11-10' },
    ],
  },
];

var TASK_STATUSES = [
  { id: 'planned', name: '待规划' },
  { id: 'backlog', name: '待开始' },
  { id: 'in_progress', name: '执行中' },
  { id: 'in_review', name: '待审核' },
  { id: 'blocked', name: '已阻塞' },
  { id: 'done', name: '已完成' },
  { id: 'cancelled', name: '已取消' },
];

/* 项目知识库：任务产物上报归档后的条目；管理演示项目暂无归档 */
var KNOWLEDGE = [];

var PROJECTS = [];
var TASKS = [];
var ISSUES = [];
var taskSeq = 1;

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}
function today() {
  var d = new Date();
  var pad = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function nowStamp() { return today() + ' ' + new Date().toTimeString().slice(0, 5); }

/* ---------- 项目 ---------- */
function mgrProjects() { return PROJECTS; }
function mgrProjectById(id) {
  return PROJECTS.find(function (p) { return p.id === id; }) || null;
}
/* 只持久化用户新建或改动过的项目；演示项目每次从种子恢复后再叠加改动 */
function mgrSaveProjects() {
  return writeJson(PROJECTS_KEY, PROJECTS.filter(function (p) { return p.custom || p.updatedAt; }));
}
function mgrAddProject(project) {
  project.custom = true;
  PROJECTS.push(project);
  if (!mgrSaveProjects()) { PROJECTS.pop(); return false; }
  return true;
}
/* 管理权限（维护成员、删除项目）：项目负责人或系统管理员 */
function mgrCanManageProject(project) {
  if (!project) return false;
  var name = cvCurrentUserName();
  var me = CV_MEMBERS.find(function (m) { return m.name === name && m.status !== 'disabled'; });
  return !!me && (project.owner === me.name || me.workspaceRole === 'system_admin');
}

/* ---------- 项目成员 ----------
   成员保存人员 ID，人员本身在协作开发的人员数据（CV_MEMBERS）里，两个板块共用；
   项目角色与协作开发一致：产品 / 开发 / 测试。 */
var MEMBER_ROLES = [['product', '产品'], ['development', '开发'], ['testing', '测试']];
function mgrMemberRoleLabel(role) {
  var hit = MEMBER_ROLES.find(function (r) { return r[0] === role; });
  return hit ? hit[1] : '待设置';
}
/* 未单独设置时按人员的岗位标签和部门推断，与协作开发的默认规则一致 */
function mgrMemberRole(project, person) {
  var assigned = project.memberRoles && project.memberRoles[person.id];
  if (MEMBER_ROLES.some(function (r) { return r[0] === assigned; })) return assigned;
  var tags = (person.roles || []).map(function (r) { return r.text; });
  if (tags.includes('产品') || tags.includes('需求') || person.dept === '产品部') return 'product';
  if (tags.includes('测试') || person.dept === '测试部') return 'testing';
  if (tags.includes('开发') || tags.includes('架构') || person.dept === '研发部' || person.dept === '架构部') return 'development';
  return '';
}
function mgrProjectPeople(project) {
  return (project.members || []).map(cvPersonById).filter(Boolean);
}
/* 成员名下未完成的本项目任务（执行人、阶段负责人或协作人） */
function mgrMemberOpenTasks(project, personId) {
  return mgrProjectTasks(project.id).filter(function (t) {
    if (t.status === 'done' || t.status === 'cancelled') return false;
    return t.assignee === personId || (t.collaborators || []).includes(personId) ||
      (t.executionPlan || []).some(function (s) { return s.assigneeId === personId; });
  });
}
/* 一次写入成员与角色，保存失败时回滚 */
function mgrSetProjectMembers(project, members, roles) {
  var prev = { members: project.members, memberRoles: project.memberRoles, updatedAt: project.updatedAt };
  project.members = members.slice();
  project.memberRoles = Object.assign({}, roles);
  project.updatedAt = Date.now();
  if (mgrSaveProjects()) {
    document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { members: project.id } }));
    return true;
  }
  project.members = prev.members;
  project.memberRoles = prev.memberRoles;
  project.updatedAt = prev.updatedAt;
  return false;
}
/* 重命名项目：名称必填、不超过 60 字、不能与其他管理项目重名；返回错误文案，成功返回空串 */
function mgrRenameError(project, name) {
  var v = String(name || '').trim();
  if (!v) return '请填写项目名称';
  if (v.length > 60) return '项目名称不能超过 60 个字';
  var dup = PROJECTS.some(function (p) { return p.id !== project.id && p.name.trim() === v; });
  return dup ? '已有同名项目，请换一个名称' : '';
}
function mgrRenameProject(project, name) {
  var prev = { name: project.name, updatedAt: project.updatedAt };
  project.name = String(name).trim();
  project.updatedAt = Date.now();
  if (!mgrSaveProjects()) { project.name = prev.name; project.updatedAt = prev.updatedAt; return false; }
  document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { renamed: project.id } }));
  return true;
}
/* 代码仓库与基准分支，保存失败时回滚 */
function mgrSetProjectRepo(project, repo, baseBranch) {
  var prev = { repo: project.repo, baseBranch: project.baseBranch, updatedAt: project.updatedAt };
  project.repo = repo;
  project.baseBranch = repo ? baseBranch : '';
  project.updatedAt = Date.now();
  if (!mgrSaveProjects()) { Object.assign(project, prev); return false; }
  document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { repo: project.id } }));
  document.dispatchEvent(new Event('lingee:tasks-changed'));
  return true;
}
/* ---------- 邀请链接 ----------
   每个项目一个邀请码（7 天有效），可重新生成；链接指向本项目详情，受邀同事登录后可申请加入。 */
var INVITE_DAYS = 7;
function mgrProjectInvite(project, regenerate) {
  var now = Date.now();
  var expired = !project.inviteToken || !project.inviteAt || now - project.inviteAt > INVITE_DAYS * 86400000;
  if (regenerate || expired) {
    project.inviteToken = Math.random().toString(36).slice(2, 8) + now.toString(36).slice(-4);
    project.inviteAt = now;
    project.updatedAt = now;
    if (!mgrSaveProjects()) return null;
  }
  var expires = new Date(project.inviteAt + INVITE_DAYS * 86400000);
  var pad = function (n) { return String(n).padStart(2, '0'); };
  return {
    token: project.inviteToken,
    expires: expires.getFullYear() + '-' + pad(expires.getMonth() + 1) + '-' + pad(expires.getDate()),
    days: INVITE_DAYS,
  };
}

/* 删除项目及其议题、任务（管理任务与开发板块任务）；演示项目记入已删除清单，避免下次从种子恢复。
   不校验项目下是否还有任务，任务随项目一并清理。 */
function mgrDeleteProject(id) {
  var index = PROJECTS.findIndex(function (p) { return p.id === id; });
  if (index < 0) return false;
  var removed = PROJECTS[index];
  var deleted = readJson(DELETED_KEY);
  deleted = Array.isArray(deleted) ? deleted : [];
  PROJECTS.splice(index, 1);
  var ok = mgrSaveProjects() && (removed.custom || writeJson(DELETED_KEY, deleted.concat(id)));
  if (!ok) { PROJECTS.splice(index, 0, removed); mgrSaveProjects(); return false; }
  TASKS = TASKS.filter(function (t) { return t.project !== id; });
  mgrSaveTasks();
  tkPruneOrphanTasks([id]);
  document.dispatchEvent(new Event('lingee:tasks-changed'));
  ISSUES = ISSUES.filter(function (i) { return i.projectId !== id; });
  writeJson(ISSUES_KEY, ISSUES.filter(function (i) { return i.custom; }));
  document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { deleted: id } }));
  return true;
}

/* ---------- 任务 ----------
   通用任务存在管理板块自己的任务数据里；研发任务（开发任务）写入开发板块的任务数据，
   按执行计划的阶段执行人分配，开发板块「任务」页签里由对应人员处理。
   两份数据的编号可能重复，界面上用「任务键」区分：管理任务为数字，开发任务加 tk 前缀。 */
function mgrTasks() { return TASKS; }
function mgrIsDevTask(task) { return !!task && TASKS.indexOf(task) < 0; }
function mgrTaskKey(task) { return mgrIsDevTask(task) ? 'tk' + task.id : String(task.id); }
function mgrProjectTasks(projectId) {
  return TASKS.filter(function (t) { return t.project === projectId; })
    .concat(tkGetTasks().filter(function (t) { return t.project === projectId; }));
}
function mgrTaskById(key) {
  var k = String(key == null ? '' : key);
  if (k.indexOf('tk') === 0) {
    var id = Number(k.slice(2));
    return tkGetTasks().find(function (t) { return t.id === id; }) || null;
  }
  return TASKS.find(function (t) { return String(t.id) === k; }) || null;
}
/* 任务里记录的父任务 / 前序任务编号，按任务所在的数据解析 */
function mgrRelatedTask(task, id) {
  if (id == null || id === '') return null;
  return mgrTaskById(mgrIsDevTask(task) ? 'tk' + id : id);
}
function mgrCreateDevTask(fields) {
  var task = tkAddTask(Object.assign({ priority: 'medium', desc: '', labels: [], collaborators: [] }, fields));
  document.dispatchEvent(new Event('lingee:tasks-changed'));
  return task;
}
/* 未开始的任务可删除：通用任务为待规划 / 待开始且没有状态流转；研发任务沿用开发板块的删除规则。
   删除后清掉其他任务对它的父任务、前序引用。 */
function mgrCanDeleteTask(task) {
  if (!task) return false;
  if (mgrIsDevTask(task)) return tkCanDeleteTask(task);
  return ['planned', 'backlog'].indexOf(task.status) >= 0 && !(task.statusHistory || []).length;
}
function mgrDeleteTask(task) {
  if (!mgrCanDeleteTask(task)) return false;
  var id = task.id;
  function unlink(list) {
    list.forEach(function (t) {
      if (t.parentId != null && String(t.parentId) === String(id)) t.parentId = '';
      if (t.preTaskId != null && String(t.preTaskId) === String(id)) t.preTaskId = '';
    });
  }
  if (mgrIsDevTask(task)) {
    if (!tkDeleteTask(id)) return false;
    var devTasks = tkGetTasks();
    unlink(devTasks);
    tkSetTasks(devTasks);
  } else {
    var before = TASKS;
    TASKS = TASKS.filter(function (t) { return t !== task; });
    unlink(TASKS);
    if (!mgrSaveTasks()) { TASKS = before; return false; }
  }
  document.dispatchEvent(new Event('lingee:tasks-changed'));
  return true;
}
function mgrSaveTasks() { return writeJson(TASKS_KEY, { seq: taskSeq, tasks: TASKS }); }
function mgrCreateTask(fields) {
  var stamp = nowStamp();
  var task = Object.assign({
    priority: 'medium', desc: '', labels: [], collaborators: [],
  }, fields, {
    id: taskSeq++,
    createDate: stamp.slice(0, 10),
    createdAt: stamp,
    updatedAt: stamp,
    statusHistory: [],
  });
  task.code = 'T' + String(1000000 + task.id);
  if (!task.createdBy) task.createdBy = mgrCurrentPersonId();
  TASKS.unshift(task);
  mgrSaveTasks();
  return task;
}

/* ---------- 项目进度 ----------
   演示项目有预设百分比；其余项目按任务完成数计算（不含已取消），没有任务时按已过期的里程碑，都没有则 0。 */
function mgrProjectProgress(project) {
  if (typeof project.mgrProgress === 'number') return { percent: project.mgrProgress, detail: '' };
  var tasks = mgrProjectTasks(project.id).filter(function (t) { return t.status !== 'cancelled'; });
  if (tasks.length) {
    var done = tasks.filter(function (t) { return t.status === 'done'; }).length;
    return { percent: Math.round((done / tasks.length) * 100), detail: '任务 ' + done + '/' + tasks.length };
  }
  var ms = project.milestones || [];
  if (ms.length) {
    var now = new Date();
    var passed = ms.filter(function (m) { return new Date(m.date + 'T23:59:59') < now; }).length;
    return { percent: Math.round((passed / ms.length) * 100), detail: '里程碑 ' + passed + '/' + ms.length };
  }
  return { percent: 0, detail: '暂无任务' };
}

/* ---------- 议题 ---------- */
function mgrProjectIssues(projectId) {
  return ISSUES.filter(function (i) { return i.projectId === projectId; });
}
function mgrAddIssue(projectId, title, from) {
  if (!projectId || !title) return null;
  var issue = { id: 'pi-' + Date.now(), projectId: projectId, title: title, status: '待处理', from: from || '', time: '刚刚浮出', custom: true };
  ISSUES.push(issue);
  writeJson(ISSUES_KEY, ISSUES.filter(function (i) { return i.custom; }));
  document.dispatchEvent(new Event('lingee:mgr-issues-changed'));
  return issue;
}

/* ---------- 知识库 ---------- */
function mgrProjectKnowledge(projectId) {
  return KNOWLEDGE.filter(function (k) { return k.projectId === projectId; });
}

/* ---------- 会话查看权限（演示开关） ---------- */
function mgrHasSessionPerm() {
  try { return localStorage.getItem(PERM_KEY) !== '0'; } catch (e) { return true; }
}
function mgrSetSessionPerm(on) {
  try { localStorage.setItem(PERM_KEY, on ? '1' : '0'); } catch (e) {}
  document.dispatchEvent(new Event('lingee:mgr-perm-changed'));
}

/* ---------- 人员 / 智能体 / 智能体团队 ---------- */
function mgrPersonName(id) {
  var p = cvPersonById(id);
  return p ? p.name : (id ? '已移除' : '—');
}
function mgrCurrentPersonId() {
  var name = cvCurrentUserName();
  var p = CV_MEMBERS.find(function (m) { return m.name === name; });
  return p ? p.id : '';
}
/* 项目成员中可被指派的人 */
function mgrProjectMembers(project) {
  return (project.members || []).map(function (id) {
    var p = cvPersonById(id);
    return p && p.status !== 'disabled' ? { id: id, name: p.name } : null;
  }).filter(Boolean);
}
function mgrExpert(id) { return EX[id] || null; }
function mgrExpertList() { return EXPERTS; }
function mgrTeams() { return TEAMS; }
function mgrTeam(id) { return id ? teamById(id) : null; }

/* 修正早期版本在管理板块建的研发任务：创建即被置为执行中（没有经过开发板块的开始流程），
   以及任务处理人与当前阶段执行人不一致。改为待开始、分配给第一个未完成阶段的执行人。 */
function normalizeDevTasks() {
  var ids = PROJECTS.map(function (p) { return p.id; });
  var changed = false;
  tkGetTasks().forEach(function (t) {
    if (ids.indexOf(t.project) < 0 || !Array.isArray(t.executionPlan) || !t.executionPlan.length) return;
    if (t.status === 'in_progress' && !t.executionStageId) {
      t.status = 'backlog';
      t.executionPlan = t.executionPlan.map(function (st) { return st.status === 'running' ? Object.assign({}, st, { status: 'pending' }) : st; });
      changed = true;
    }
    var handler = tkCurrentStageHandlerId(t);
    if (handler && t.assignee !== handler) { t.assignee = handler; changed = true; }
  });
  if (changed) tkSetTasks(tkGetTasks());
}

/* 在开发板块任务模块初始化前调用：先注册管理项目，开发板块才能识别管理项目下的任务与成员 */
export function initManagerData() {
  PROJECTS = SEED_PROJECTS.map(function (p) {
    return Object.assign({ space: 'manage', teamIds: [], projectExperts: [] }, p, { members: p.members.slice() });
  });
  var deleted = readJson(DELETED_KEY);
  if (Array.isArray(deleted)) PROJECTS = PROJECTS.filter(function (p) { return !deleted.includes(p.id); });
  var saved = readJson(PROJECTS_KEY);
  if (Array.isArray(saved)) {
    saved.forEach(function (p) {
      if (!p || !p.id) return;
      var i = PROJECTS.findIndex(function (x) { return x.id === p.id; });
      if (i >= 0) PROJECTS[i] = p; else PROJECTS.push(p);
    });
  }

  var savedTasks = readJson(TASKS_KEY);
  if (savedTasks && Array.isArray(savedTasks.tasks)) {
    TASKS = savedTasks.tasks;
    taskSeq = savedTasks.seq || TASKS.reduce(function (m, t) { return Math.max(m, t.id + 1); }, 1);
  } else {
    SEED_TASKS.forEach(function (group) {
      group.rows.forEach(function (row) {
        mgrCreateTask(Object.assign({ issueType: '通用任务', priority: 'medium', project: group.project, createdBy: row.assignee }, row));
      });
    });
  }

  /* 旧版本把研发任务存在管理任务里，迁到开发板块任务数据 */
  var legacyDev = TASKS.filter(function (t) { return t.taskKind === 'rd' || t.issueType === '研发任务'; });
  if (legacyDev.length) {
    legacyDev.forEach(function (t) {
      var copy = Object.assign({}, t);
      ['id', 'code', 'createDate', 'createdAt', 'updatedAt', 'statusHistory', 'parentId', 'preTaskId'].forEach(function (f) { delete copy[f]; });
      if (!copy.assignee && copy.executionPlan && copy.executionPlan[0]) copy.assignee = copy.executionPlan[0].assigneeId || '';
      tkAddTask(copy);
    });
    TASKS = TASKS.filter(function (t) { return legacyDev.indexOf(t) < 0; });
    mgrSaveTasks();
  }

  normalizeDevTasks();

  var savedIssues = readJson(ISSUES_KEY);
  ISSUES = Array.isArray(savedIssues) ? savedIssues : [];
  tkSetExternalProjects(function () { return PROJECTS; });
}

export {
  TASK_STATUSES, mgrAddIssue, mgrAddProject, mgrCanManageProject, mgrCanDeleteTask, mgrCreateTask, mgrDeleteProject, mgrDeleteTask, mgrCurrentPersonId, mgrExpert, mgrExpertList,
  MEMBER_ROLES, mgrHasSessionPerm, mgrMemberOpenTasks, mgrMemberRole, mgrMemberRoleLabel, mgrPersonName, mgrProjectPeople,
  mgrProjectInvite, mgrRenameError, mgrRenameProject, mgrSetProjectMembers, mgrSetProjectRepo, mgrProjectById, mgrProjectIssues, mgrProjectKnowledge, mgrProjectMembers,
  mgrCreateDevTask, mgrIsDevTask, mgrProjectProgress, mgrProjectTasks, mgrProjects, mgrRelatedTask, mgrSaveProjects, mgrSaveTasks, mgrSetSessionPerm,
  mgrTaskById, mgrTaskKey, mgrTasks,
  mgrTeam, mgrTeams,
};
