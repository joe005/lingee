import { CV_MEMBERS, cvCurrentUserName, cvPersonById } from '../collab/data.js';
import { EX, EXPERTS } from '../expert/data.js';
import { TEAMS, teamById } from '../expert/store.js';
import { TK_TICKET_CODE_STATS } from '../tasks-v2/ticket-demo.js';
import { tkAddTask, tkCanDeleteTask, tkCurrentStageHandlerId, tkDeleteTask, tkGetTasks, tkPruneOrphanTasks, tkSetTasks, tkSetExternalProjects } from '../tasks-v2/data.js';
/* 管理板块数据：管理项目、项目任务、议题、项目知识库。
   与协作开发的项目 / 任务数据分开存放，避免管理项目出现在开发板块的项目列表里；
   人员、专家与专家团直接复用协作开发和专家模块的基础数据。 */

var PROJECTS_KEY = 'lingee-manager-projects-v1';
var TASKS_KEY = 'lingee-manager-tasks-v1';
var ISSUES_KEY = 'lingee-manager-project-issues-v1';
var PERM_KEY = 'lingee-manager-session-perm-v1';
var DELETED_KEY = 'lingee-manager-deleted-projects-v1';

/* ---------- 管理项目（演示数据） ----------
   mgrRisk / mgrDecide / mgrOk 是卡片上的风险、待决策与「运行正常」标记，
   mgrProgress 是卡片与概览共用的进度百分比。 */
var SEED_PROJECTS = [
  /* CIO 演示项目：由项目管理员赵琳立项，通用应用开发专家团 4 周交付；进度由任务完成数计算 */
  {
    id: 'ticket-mgmt', name: '工单管理系统',
    desc: '4 周上线客户服务工单管理系统：工单提交、自动派单、SLA 时效、统计报表与企业微信集成，替代原有手工台账。',
    goal: '4 周内（10 月 16 日前）上线工单管理系统，覆盖提交、派单、SLA、统计与企业微信集成；历史工单全部迁移，全程留痕可审计',
    mgrRisk: 1, mgrDecide: 1, status: 'in_progress', priority: '高', owner: '赵琳',
    dot: 'blue', start: '2026-09-21', end: '2026-10-16',
    containsRd: true, defaultTeam: 'general-app-dev', teamIds: ['general-app-dev'],
    repo: 'https://gitlab.kingdee.com/helpdesk', baseBranch: 'main', adminIds: ['p04'],
    projectExperts: ['general-app-development-expert', 'software-qa-engineer'],
    expertPerms: { 'general-app-development-expert': { chat: true, read: true, write: true }, 'software-qa-engineer': { chat: true, read: true, write: false } },
    milestones: [
      { name: '需求与方案确认', date: '2026-09-25' },
      { name: '核心功能联调完成', date: '2026-10-09' },
      { name: '系统上线', date: '2026-10-16' },
    ],
    members: ['p04', 'p24', 'p25', 'p26', 'p27', 'p01', 'p22'],
  },
  {
    id: 'crm-portal', name: '客户门户改造',
    desc: '把客户自助查询、服务申请和订单跟踪整合到统一门户，减少人工转接。',
    mgrOk: true, mgrProgress: 61, status: 'in_progress', priority: '中', owner: '梁平',
    dot: 'green', start: '2026-09-07', end: '2026-10-30',
    containsRd: true, defaultTeam: 'general-app-dev', teamIds: ['general-app-dev'],
    repo: 'https://gitlab.kingdee.com/customer-portal', baseBranch: 'main', adminIds: ['p21'],
    milestones: [{ name: '门户一期上线', date: '2026-10-30' }],
    members: ['p21', 'p24', 'p26', 'p27', 'p22'],
  },
  {
    id: 'purchase-collab', name: '采购协同应用',
    desc: '供应商在线报价、对账和发票协同，采购员在一个应用里完成询比价。',
    mgrOk: true, mgrProgress: 38, status: 'in_progress', priority: '中', owner: '吴芳',
    dot: 'green', start: '2026-09-28', end: '2026-11-13',
    containsRd: true, defaultTeam: 'general-app-dev', teamIds: ['general-app-dev'],
    repo: 'https://gitlab.kingdee.com/purchase-collab', baseBranch: 'main', adminIds: ['p09'],
    milestones: [{ name: '报价与对账上线', date: '2026-11-13' }],
    members: ['p09', 'p24', 'p26', 'p27', 'p22'],
  },
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
    project: 'crm-portal',
    rows: [
      { title: '统一登录与客户身份打通', milestone: 0, status: 'done', assignee: 'p26', dueDate: '2026-09-25' },
      { title: '订单跟踪页', milestone: 0, status: 'in_progress', assignee: 'p26', dueDate: '2026-10-15' },
      { title: '服务申请表单与流转', milestone: 0, status: 'backlog', assignee: 'p24', dueDate: '2026-10-22' },
    ],
  },
  {
    project: 'purchase-collab',
    rows: [
      { title: '供应商报价单设计', milestone: 0, status: 'done', assignee: 'p24', dueDate: '2026-10-08' },
      { title: '对账与发票核对', milestone: 0, status: 'backlog', assignee: 'p26', dueDate: '2026-11-06' },
    ],
  },
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
var KNOWLEDGE = [
  { id: 'kb-ticket-1', projectId: 'ticket-mgmt', title: '工单管理系统需求规格说明书', type: '需求文档', summary: '覆盖工单提交、分类、派单、SLA、统计与企业微信集成的验收条件，共 42 条，均可观察。', archivedAt: '2026-09-24 17:20', archivedBy: '赵琳', agent: '通用应用开发', sourceTaskId: 'tk1600', vectorIndexed: true },
  { id: 'kb-ticket-2', projectId: 'ticket-mgmt', title: '工单管理系统架构设计', type: '设计文档', summary: '分层架构、数据模型与规则引擎方案；派单算法依赖调度集群。', archivedAt: '2026-09-25 16:05', archivedBy: '赵琳', agent: '通用应用开发', sourceTaskId: 'tk1602', vectorIndexed: true },
  { id: 'kb-ticket-3', projectId: 'ticket-mgmt', title: '工单管理系统（网站预览）', type: '网站预览', summary: '可运行的工单管理系统：提交、列表、详情、SLA 倒计时与统计报表。', archivedAt: '2026-10-07 18:30', archivedBy: '赵琳', agent: '通用应用开发', sourceTaskId: 'tk1605', vectorIndexed: false },
  { id: 'kb-ticket-4', projectId: 'ticket-mgmt', title: '性能压测与安全扫描报告', type: '测试报告', summary: '并发 500 压测通过，接口鉴权与越权扫描无高危问题。', archivedAt: '2026-10-08 15:40', archivedBy: '陈晨', agent: '通用应用开发', sourceTaskId: 'tk1620', vectorIndexed: true },
];

/* 议题：风险与待决策事项。kind=risk 的议题关联任务（taskKey），CIO 可在议题里批准 / 驳回 */
var SEED_ISSUES = [
  { id: 'pi-ticket-1', projectId: 'ticket-mgmt', title: '调度集群扩容待审批，自动派单算法无法压测上线', status: '待处理', from: '专家 通用应用开发 · 风险上报', time: '10/8 14:12', kind: 'risk', taskKey: 'tk1610', impact: '影响里程碑「系统上线」（10 月 16 日），需 CIO 审批集群扩容' },
  { id: 'pi-ticket-2', projectId: 'ticket-mgmt', title: '历史工单迁移的字段映射口径确认', status: '已批准', from: '项目管理员 赵琳', time: '10/5 10:20', kind: 'decision', decision: { by: '吴宏超', at: '2026-10-05 15:30', text: '同意按「新分类」映射，保留旧编号作追溯字段' } },
];

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
  return !!me && (project.owner === me.name || me.workspaceRole === 'system_admin' || (project.adminIds || []).includes(me.id));
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
  var prev = { members: project.members, memberRoles: project.memberRoles, adminIds: project.adminIds, updatedAt: project.updatedAt };
  project.members = members.slice();
  project.memberRoles = Object.assign({}, roles);
  if (project.adminIds) project.adminIds = project.adminIds.filter(function (id) { return project.members.includes(id); });
  project.updatedAt = Date.now();
  if (mgrSaveProjects()) {
    document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { members: project.id } }));
    return true;
  }
  Object.assign(project, prev);
  return false;
}
/* 设置 / 取消项目管理员（负责人不在此列），保存失败时回滚 */
function mgrSetMemberLevel(project, personId, asAdmin) {
  var prev = { adminIds: project.adminIds, updatedAt: project.updatedAt };
  var admins = (project.adminIds || []).filter(function (id) { return id !== personId; });
  if (asAdmin) admins.push(personId);
  project.adminIds = admins;
  project.updatedAt = Date.now();
  if (!mgrSaveProjects()) { Object.assign(project, prev); return false; }
  document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { members: project.id } }));
  return true;
}
/* 项目专家及其功能权限（perms：{ 专家ID: { chat, read, write } }），保存失败时回滚 */
function mgrSetProjectExperts(project, ids, perms) {
  var prev = { projectExperts: project.projectExperts, expertPerms: project.expertPerms, updatedAt: project.updatedAt };
  project.projectExperts = ids.slice();
  project.expertPerms = Object.assign({}, perms);
  project.updatedAt = Date.now();
  if (!mgrSaveProjects()) { Object.assign(project, prev); return false; }
  document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { experts: project.id } }));
  return true;
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
/* ---------- 邀请成员 ----------
   一次加入多名成员并指定项目内角色：项目管理员可维护项目（成员、设置、删除任务），成员只参与协作。
   岗位角色（产品 / 开发 / 测试）不在这里设置，沿用按岗位标签推断的默认值，再到「项目成员」里调整。 */
function mgrAddProjectMembers(project, personIds, asAdmin) {
  var prev = { members: project.members, memberRoles: project.memberRoles, adminIds: project.adminIds, updatedAt: project.updatedAt };
  var members = (project.members || []).slice();
  var roles = Object.assign({}, project.memberRoles);
  var admins = (project.adminIds || []).slice();
  personIds.forEach(function (id) {
    var person = cvPersonById(id);
    if (!person || members.includes(person.id)) return;
    members.push(person.id);
    var role = mgrMemberRole(project, person);
    if (role) roles[person.id] = role;
    if (asAdmin && !admins.includes(person.id)) admins.push(person.id);
  });
  project.members = members;
  project.memberRoles = roles;
  project.adminIds = admins;
  project.updatedAt = Date.now();
  if (mgrSaveProjects()) {
    document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { members: project.id } }));
    return true;
  }
  Object.assign(project, prev);
  return false;
}
/* 项目目标与项目指令；目标同步到项目卡片描述，保存失败时回滚 */
function mgrSetProjectText(project, patch) {
  var prev = { goal: project.goal, desc: project.desc, instruction: project.instruction, updatedAt: project.updatedAt };
  if (patch.goal !== undefined) { project.goal = patch.goal; project.desc = patch.goal || project.name; }
  if (patch.instruction !== undefined) project.instruction = patch.instruction;
  project.updatedAt = Date.now();
  if (!mgrSaveProjects()) { Object.assign(project, prev); return false; }
  document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { text: project.id } }));
  return true;
}

/* 项目详情的功能页面：内置「计划与任务 / 研发任务 / 动态」加自定义页面，可开关、调序。
   未配置时开发类项目显示研发任务和动态，其他项目显示计划与任务和动态；研发任务只对开发类项目可用。 */
var BUILTIN_PAGES = [['plan', '计划与任务'], ['rd', '研发任务'], ['feed', '动态']];
function mgrProjectPages(project) {
  var rd = !!project.containsRd;
  var avail = BUILTIN_PAGES.filter(function (b) { return b[0] !== 'rd' || rd; });
  var out = [];
  (Array.isArray(project.pages) ? project.pages : []).forEach(function (s) {
    if (s.custom) { out.push({ id: s.id, name: s.name, enabled: s.enabled !== false, custom: true }); return; }
    var b = avail.find(function (x) { return x[0] === s.id; });
    if (b && !out.some(function (o) { return o.id === b[0]; })) out.push({ id: b[0], name: b[1], enabled: s.enabled !== false });
  });
  avail.forEach(function (b) {
    if (!out.some(function (o) { return o.id === b[0]; })) out.push({ id: b[0], name: b[1], enabled: b[0] === 'plan' ? !rd : true });
  });
  if (!out.some(function (o) { return o.enabled; })) out[out.length - 1].enabled = true;
  return out;
}
/* 保存失败时回滚；至少保留一个页面由调用方保证 */
function mgrSetProjectPages(project, pages) {
  var prev = { pages: project.pages, updatedAt: project.updatedAt };
  project.pages = pages.map(function (x) {
    return x.custom ? { id: x.id, name: x.name, custom: true, enabled: x.enabled } : { id: x.id, enabled: x.enabled };
  });
  project.updatedAt = Date.now();
  if (!mgrSaveProjects()) { Object.assign(project, prev); return false; }
  document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { pages: project.id } }));
  return true;
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
  saveIssues();
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
  saveIssues();
  document.dispatchEvent(new Event('lingee:mgr-issues-changed'));
  return issue;
}
/* 只持久化用户新增或处理过的议题，演示议题每次从种子恢复 */
function saveIssues() {
  return writeJson(ISSUES_KEY, ISSUES.filter(function (i) { return i.custom || i.touched; }));
}
/* CIO 在议题里批准 / 驳回：写入决策记录；批准关联的风险议题时，被阻塞的任务恢复执行，卡片上的风险与待决策标记同步减少 */
function mgrDecideIssue(issueId, approve) {
  var issue = ISSUES.find(function (i) { return i.id === issueId; });
  if (!issue || issue.status !== '待处理') return null;
  var project = mgrProjectById(issue.projectId);
  var stamp = nowStamp() + ':00';
  var me = mgrCurrentPersonId();
  issue.status = approve ? '已批准' : '已驳回';
  issue.decision = { by: mgrPersonName(me), at: stamp, text: approve ? '同意' + (issue.kind === 'risk' ? '，任务恢复执行' : '') : '驳回，需重新评估' };
  issue.touched = true;
  var task = issue.taskKey ? mgrTaskById(issue.taskKey) : null;
  if (approve && task && task.status === 'blocked') {
    task.status = 'in_progress';
    task.statusHistory = (task.statusHistory || []).concat({ from: 'blocked', to: 'in_progress', time: stamp, authorId: me });
    task.executionPlan = (task.executionPlan || []).map(function (st) { return st.status === 'blocked' ? Object.assign({}, st, { status: 'running' }) : st; });
    task.blockedRun = null;
    task.updatedAt = nowStamp();
    if (mgrIsDevTask(task)) tkSetTasks(tkGetTasks()); else mgrSaveTasks();
  }
  if (project) {
    if (project.mgrDecide) project.mgrDecide -= 1;
    if (approve && issue.kind === 'risk' && project.mgrRisk) project.mgrRisk -= 1;
    if (!project.mgrRisk && !project.mgrDecide) project.mgrOk = true;
    project.updatedAt = Date.now();
    mgrSaveProjects();
  }
  saveIssues();
  document.dispatchEvent(new Event('lingee:mgr-issues-changed'));
  document.dispatchEvent(new Event('lingee:mgr-tasks-changed'));
  document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { decided: issue.projectId } }));
  return issue;
}

/* ---------- AI 贡献（项目概览） ----------
   只用过程中可度量的数据：研发任务合入代码里 AI 生成的行数占比、代码提交里专家发起的占比、
   阶段产物一次审核通过的占比。统计来自任务的代码与审核记录（原型为演示数据），没有记录时不显示。 */
function mgrAiContribution(project) {
  if (!project || !project.containsRd) return null;
  var lines = 0, aiLines = 0, commits = 0, aiCommits = 0, stages = 0, rejects = 0;
  mgrProjectTasks(project.id).forEach(function (t) {
    var st = t.codeStats || TK_TICKET_CODE_STATS[t.code];
    if (!mgrIsDevTask(t) || !st) return;
    lines += st.lines; aiLines += st.aiLines; commits += st.commits; aiCommits += st.aiCommits; rejects += st.rejects || 0;
    stages += (t.executionPlan || []).filter(function (s) { return s.status === 'done'; }).length;
  });
  if (!lines || !commits || !stages) return null;
  return {
    codeRate: Math.round((aiLines / lines) * 100), lines: lines, aiLines: aiLines,
    commitRate: Math.round((aiCommits / commits) * 100), commits: commits, aiCommits: aiCommits,
    passRate: Math.round(((stages - rejects) / stages) * 100), stages: stages,
  };
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

/* ---------- 人员 / 专家 / 专家团 ---------- */
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

  ISSUES = SEED_ISSUES.map(function (i) { return Object.assign({}, i); });
  var savedIssues = readJson(ISSUES_KEY);
  if (Array.isArray(savedIssues)) {
    savedIssues.forEach(function (i) {
      var at = ISSUES.findIndex(function (x) { return x.id === i.id; });
      if (at >= 0) ISSUES[at] = i; else ISSUES.push(i);
    });
  }
  /* 新增的演示项目：已缓存任务的浏览器补种一次通用任务 */
  try {
    if (!localStorage.getItem('lingee-manager-seed-portal-v1')) {
      var have = new Set(TASKS.map(function (t) { return t.project; }));
      SEED_TASKS.filter(function (g) { return (g.project === 'crm-portal' || g.project === 'purchase-collab') && !have.has(g.project); }).forEach(function (group) {
        group.rows.slice().reverse().forEach(function (row) {
          mgrCreateTask(Object.assign({ issueType: '通用任务', priority: 'medium', project: group.project, createdBy: row.assignee }, row));
        });
      });
      localStorage.setItem('lingee-manager-seed-portal-v1', '1');
    }
  } catch (e) { /* 本地存储不可用时忽略 */ }
  tkSetExternalProjects(function () { return PROJECTS; });
}

export {
  TASK_STATUSES, mgrAddIssue, mgrAiContribution, mgrDecideIssue, mgrAddProject, mgrCanManageProject, mgrCanDeleteTask, mgrCreateTask, mgrDeleteProject, mgrDeleteTask, mgrCurrentPersonId, mgrExpert, mgrExpertList,
  MEMBER_ROLES, mgrHasSessionPerm, mgrMemberOpenTasks, mgrMemberRole, mgrMemberRoleLabel, mgrPersonName, mgrProjectPeople,
  mgrAddProjectMembers, mgrSetMemberLevel, mgrSetProjectExperts, mgrRenameError, mgrRenameProject, mgrSetProjectMembers, mgrSetProjectPages, mgrSetProjectRepo, mgrSetProjectText, mgrProjectById, mgrProjectIssues, mgrProjectKnowledge, mgrProjectMembers, mgrProjectPages,
  mgrCreateDevTask, mgrIsDevTask, mgrProjectProgress, mgrProjectTasks, mgrProjects, mgrRelatedTask, mgrSaveProjects, mgrSaveTasks, mgrSetSessionPerm,
  mgrTaskById, mgrTaskKey, mgrTasks,
  mgrTeam, mgrTeams,
};
