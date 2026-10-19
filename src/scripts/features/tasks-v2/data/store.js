import { migrateDeliveryPlan } from '../delivery-plan-migration.js';
import { isBugTask } from '../../expert/delivery-stages.js';
import { TK_EQUIPMENT_TASKS } from '../equipment-demo.js';
import { TK_TICKET_TASKS } from '../ticket-demo.js';
import { CV_PROJECTS, cvStampTaskTeam } from '../../collab/data.js';
import { createDemoReviewReport } from '../review-reports.js';
import { createDemoBlockedRun } from '../blocked-runs.js';
import { createDemoCompletedRun } from '../completed-runs.js';
import { TK_DEMO_PERSON_IDS, TK_VIEWS } from './constants.js';
import { tkCurrentUserId, tkPeopleInProject } from './people.js';
import { tkProjectsForCurrentUser } from './permissions.js';
import { applyDemoAutoReviewDefaults, TK_COSMIC_REVIEW_TRIM_CODES, TK_COSMIC_TRIM_CODES, TK_COSMIC_WUXF_TASKS, TK_SURVEY_TASKS, TK_TASKS, tkToGeneralAppPlan } from './seed-tasks.js';
/* 任务数据：任务与视图存储、缓存迁移、增删改（拆自 tasks-v2/data.js）。本文件有模块求值期执行的迁移代码。 */

/* ---------- 可变状态（原型用内存数组，支持增删改） ---------- */
/* 示例运行停在不同交付阶段；待审核表示该阶段运行已结束，等待人工确认。 */
const DEMO_EXECUTION_STAGES = ['requirements','design','planning','implementation','verification','delivery'];
const DEMO_TASK_STAGE = {
  1:'implementation',5:'implementation',8:'verification',11:'requirements',15:'implementation',19:'implementation',
  23:'verification',27:'design',31:'planning',33:'implementation',36:'verification',39:'implementation',
  44:'verification',48:'design',50:'delivery',
  2:'design',9:'implementation',13:'design',18:'verification',22:'implementation',26:'verification',
  30:'delivery',34:'design',38:'verification',43:'design',49:'verification',58:'delivery',70:'delivery',
  4:'verification',16:'implementation',25:'implementation',40:'planning',46:'requirements',63:'verification',
};
function taskMinuteNow() {
  var now = new Date();
  function pad(value) { return String(value).padStart(2, '0'); }
  return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' '
    + pad(now.getHours()) + ':' + pad(now.getMinutes());
}
/* 项目不绑定智能体团队，交付团队只取任务自己的；演示任务缺团队时补预置值 */
function taskDeliveryTeam(task) {
  return cvStampTaskTeam(task) || undefined;
}
function ensureTaskIssueType(task) {
  if (task.issueType) return false;
  task.issueType = isBugTask(task) ? '缺陷' : '需求';
  return true;
}
function tkSeedTask(t) {
  ensureTaskIssueType(t);
  migrateDeliveryPlan(t, taskDeliveryTeam(t));
  var people = tkPeopleInProject(t.project).filter(function (person) { return TK_DEMO_PERSON_IDS.includes(person.id); });
  var seeded = Object.assign({
    initialStatus:t.status,
    executionStageId:['in_progress','in_review','blocked'].includes(t.status)
      ? DEMO_TASK_STAGE[t.id] || DEMO_EXECUTION_STAGES[t.id % DEMO_EXECUTION_STAGES.length]
      : null,
    createdBy: t.project === 'expense' && t.id % 4 === 0 ? 'p22' : (people[(t.id + 1) % people.length]?.id || ''),
    createdAt: t.createDate + ' 09:30',
    updatedAt: t.createDate + ' 10:15',
    reviewReport: createDemoReviewReport(t),
    blockedRun: createDemoBlockedRun(t),
    completedRun: createDemoCompletedRun(t),
  }, t);
  migrateDeliveryPlan(seeded, taskDeliveryTeam(seeded));
  return seeded;
}
var _tasks = TK_TASKS.map(tkSeedTask);
const TASKS_STORAGE_KEY = 'lingee_tasks_v2';
try {
  var savedTasks = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || 'null');
  if (Array.isArray(savedTasks) && savedTasks.every(function (task) { return task && Number.isInteger(task.id) && typeof task.project === 'string'; })) _tasks = savedTasks;
} catch (e) { /* 存储数据损坏时使用演示任务 */ }
/* Lingee Build 项目任务数据已整体去除：把已保存到本地的该项目任务一次性清掉（幂等）。 */
try {
  if (!localStorage.getItem('lingee_tasks_remove_lingee_v1')) {
    _tasks = _tasks.filter(function (task) { return task.project !== 'lingee-prototype'; });
    persistTasks();
    localStorage.setItem('lingee_tasks_remove_lingee_v1', '1');
  }
} catch (e) { /* 本地存储不可用时保留内存数据 */ }
/* p34（早期误建的重复记录）名下任务归并到 p23（吴晓锋）；旧任务按标签推导任务类型（与新建弹窗同口径）。幂等。 */
_tasks.forEach(function (task) {
  if (task.assignee === 'p34') task.assignee = 'p23';
  if (!task.issueType) task.issueType = (task.labels || []).includes('缺陷') ? '缺陷' : (task.labels || []).includes('需求') ? '需求' : '';
});
try {
  if (!localStorage.getItem('lingee_tasks_merge_p34_v1')) {
    persistTasks();
    localStorage.setItem('lingee_tasks_merge_p34_v1', '1');
  }
} catch (e) { /* 本地存储不可用时跳过持久化 */ }
/* 吴晓锋苍穹任务重置：清掉旧的演示数据，按 designer-metamodel 工程重新补种（幂等）。 */
try {
  if (!localStorage.getItem('lingee_tasks_cosmic_wuxf_v1')) {
    _tasks = _tasks.filter(function (task) {
      return !(task.project === 'cosmic-app-dev' && (task.assignee === 'p23' || (task.id >= 1200 && task.id < 1207)));
    });
    var wuxfExistingIds = new Set(_tasks.map(function (task) { return task.id; }));
    _tasks.push(...TK_COSMIC_WUXF_TASKS.filter(function (task) { return !wuxfExistingIds.has(task.id); }));
    persistTasks();
    localStorage.setItem('lingee_tasks_cosmic_wuxf_v1', '1');
  }
} catch (e) { /* 本地存储不可用时跳过 */ }
  /* 「待评审/待开始/已阻塞」预置任务补充：每次加载按编号幂等补种，缺则补回（含被删与漏补场景，刷新自愈），不改写已有任务。 */
try {
  var wuxfReviewCodes = new Set(['T1001207', 'T1001208', 'T1001209', 'T1001210', 'T1001211', 'T1001212', 'T1001213']);
  var wuxfExistingCodes = new Set(_tasks.map(function (task) { return task.code; }));
  var wuxfReviewAdds = TK_COSMIC_WUXF_TASKS.filter(function (task) { return wuxfReviewCodes.has(task.code) && !wuxfExistingCodes.has(task.code); });
  if (wuxfReviewAdds.length) {
    _tasks.push(...wuxfReviewAdds);
    persistTasks();
  }
} catch (e) { /* 本地存储不可用时保留内存数据 */ }
/* 精简吴晓锋历史预制样本；用户新建任务 ID 不在此名单。 */
try {
  const removedCodes = new Set(['T1001201','T1001203','T1001204','T1001205','T1001208']);
  const before = _tasks.length;
  _tasks = _tasks.filter(task => !(task.project === 'cosmic-app-dev' && removedCodes.has(task.code) && [1201,1203,1204,1205,1208].includes(task.id)));
  if (_tasks.length !== before) persistTasks();
} catch (e) { /* 本地存储不可用时保留内存数据 */ }
/* 「执行中」预置任务精简：从已保存的本地数据一次性移除三条与吴晓锋种子重叠的团队任务（幂等）。 */
try {
  if (!localStorage.getItem('lingee_tasks_trim_cosmic_overlap_v1')) {
    var trimCodes = TK_COSMIC_TRIM_CODES;
    var trimBefore = _tasks.length;
    _tasks = _tasks.filter(function (task) { return !trimCodes.has(task.code); });
    if (_tasks.length !== trimBefore) persistTasks();
    localStorage.setItem('lingee_tasks_trim_cosmic_overlap_v1', '1');
  }
} catch (e) { /* 本地存储不可用时保留内存数据 */ }
/* 已缓存的旧审核样本同步移出任务看板；不影响用户已流转到其他状态的任务。 */
try {
  var reviewTrimBefore = _tasks.length;
  _tasks = _tasks.filter(function (task) {
    return !(task.project === 'cosmic-app-dev' && task.status === 'in_review' && TK_COSMIC_REVIEW_TRIM_CODES.has(task.code));
  });
  if (_tasks.length !== reviewTrimBefore) persistTasks();
} catch (e) { /* 本地存储不可用时保留内存数据 */ }
/* 问卷调研演示任务：已缓存任务的浏览器按编号补种一次，不覆盖已流转的任务。 */
try {
  if (!localStorage.getItem('lingee_tasks_survey_v1')) {
    var surveyCodes = new Set(_tasks.map(function (task) { return task.code; }));
    var surveyAdds = TK_SURVEY_TASKS.filter(function (task) { return !surveyCodes.has(task.code); }).map(tkSeedTask);
    if (surveyAdds.length) { _tasks.push(...surveyAdds); persistTasks(); }
    localStorage.setItem('lingee_tasks_survey_v1', '1');
  }
} catch (e) { /* 本地存储不可用时保留内存数据 */ }
/* 设备巡检维修演示任务：同样按编号补种一次。 */
try {
  if (!localStorage.getItem('lingee_tasks_equipment_v1')) {
    var equipmentCodes = new Set(_tasks.map(function (task) { return task.code; }));
    var equipmentAdds = TK_EQUIPMENT_TASKS.filter(function (task) { return !equipmentCodes.has(task.code); }).map(tkSeedTask);
    if (equipmentAdds.length) { _tasks.push(...equipmentAdds); persistTasks(); }
    localStorage.setItem('lingee_tasks_equipment_v1', '1');
  }
} catch (e) { /* 本地存储不可用时保留内存数据 */ }
/* 工单管理系统（CIO 演示）任务：同样按编号补种一次。 */
try {
  if (!localStorage.getItem('lingee_tasks_ticket_v1')) {
    var ticketCodes = new Set(_tasks.map(function (task) { return task.code; }));
    var ticketAdds = TK_TICKET_TASKS.filter(function (task) { return !ticketCodes.has(task.code); }).map(tkSeedTask);
    if (ticketAdds.length) { _tasks.push(...ticketAdds); persistTasks(); }
    localStorage.setItem('lingee_tasks_ticket_v1', '1');
  }
} catch (e) { /* 本地存储不可用时保留内存数据 */ }
/* 问卷调研项目已缓存的任务：一次性把旧 6 阶段转成过渡 5 阶段（之后统一迁移为 4 阶段） */
try {
  if (!localStorage.getItem('lingee_tasks_general_app_5stage_v1')) {
    var planChanged = false;
    _tasks.forEach(function (task) {
      if (task.project === 'survey' && Array.isArray(task.executionPlan) && task.executionPlan.length === 6) {
        var before = task.executionPlan;
        tkToGeneralAppPlan(task);
        if (task.executionPlan !== before) planChanged = true;
      }
    });
    if (planChanged) persistTasks();
    localStorage.setItem('lingee_tasks_general_app_5stage_v1', '1');
  }
} catch (e) { /* 本地存储不可用时保留内存数据 */ }
/* 新交付范围同步已有缓存；迁移阶段引用，不覆盖状态历史与用户内容。 */
try {
  if (!localStorage.getItem('lingee_delivery_stages_20261009_v2')) {
    var sessions = JSON.parse(localStorage.getItem('lingee-chat-sessions-v1') || '[]');
    _tasks.forEach(function (task) {
      var map = migrateDeliveryPlan(task, taskDeliveryTeam(task));
      sessions.filter(function (session) { return Number(session.taskId) === task.id; }).forEach(function (session) {
        if (map[session.stageId]) session.stageId = map[session.stageId];
        (session.stageEndMarkers || []).forEach(function (marker) { if (map[marker.stageId]) marker.stageId = map[marker.stageId]; });
        if (session.stageEndMarkers && task.executionPlan?.length && Object.keys(map).length) {
          session.stageEndMarkers = session.stageEndMarkers.filter(function (marker) {
            return task.executionPlan.some(function (stage) { return stage.id === marker.stageId && ['done','review'].includes(stage.status); });
          });
        }
      });
    });
    persistTasks();
    localStorage.setItem('lingee-chat-sessions-v1', JSON.stringify(sessions));
    localStorage.setItem('lingee_delivery_stages_20261009_v2', '1');
  }
} catch (e) { /* 存储不可用时不影响当前页面 */ }
/* 缺陷类任务的交付范围改为开发实现、测试验证 2 个阶段：把已缓存的缺陷任务一次性迁移，阶段引用同步到会话。 */
try {
  if (!localStorage.getItem('lingee_delivery_stages_bug_20261010')) {
    var bugSessions = JSON.parse(localStorage.getItem('lingee-chat-sessions-v1') || '[]');
    var bugChanged = false;
    _tasks.filter(function (task) { return isBugTask(task); }).forEach(function (task) {
      var map = migrateDeliveryPlan(task, taskDeliveryTeam(task));
      if (!Object.keys(map).length) return;
      bugChanged = true;
      bugSessions.filter(function (session) { return Number(session.taskId) === task.id; }).forEach(function (session) {
        if (map[session.stageId]) session.stageId = map[session.stageId];
        (session.stageEndMarkers || []).forEach(function (marker) { if (map[marker.stageId]) marker.stageId = map[marker.stageId]; });
      });
    });
    if (bugChanged) {
      persistTasks();
      localStorage.setItem('lingee-chat-sessions-v1', JSON.stringify(bugSessions));
    }
    localStorage.setItem('lingee_delivery_stages_bug_20261010', '1');
  }
} catch (e) { /* 存储不可用时不影响当前页面 */ }
/* 已缓存的预制任务同步自动评审样例；只更新未开始阶段的评审配置。 */
var demoAutoReviewChanged = false;
_tasks.forEach(function(task){ if (applyDemoAutoReviewDefaults(task)) demoAutoReviewChanged = true; });
try { if (demoAutoReviewChanged) persistTasks(); } catch(e) { /* 存储不可用时仍使用本次内存配置 */ }
// 在所有补种与缓存迁移结束后补全类型，避免后加入的模拟任务漏处理。
var taskIssueTypesChanged = false;
_tasks.forEach(function (task) {
  if (ensureTaskIssueType(task)) taskIssueTypesChanged = true;
});
try {
  if (taskIssueTypesChanged) persistTasks();
} catch (e) { /* 存储不可用时仍保留内存中的类型 */ }
function persistTasks() {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(_tasks));
  if (typeof document !== 'undefined') document.dispatchEvent(new Event('lingee:tasks-changed'));
}
var _views = TK_VIEWS.map(function (v) { return Object.assign({}, v); });
try {
  var storedViews = JSON.parse(localStorage.getItem('lingee_tasks_custom_views') || '[]');
  if (Array.isArray(storedViews)) _views = _views.concat(storedViews.filter(function (v) { return v && typeof v.id === 'string' && typeof v.name === 'string' && !v.builtin; }));
} catch (e) { /* 本地存储不可用时仍可在当前页面管理视图 */ }
var _nextId = Math.max(0, ...TK_TASKS.map(function (task) { return task.id; }), ..._tasks.map(function (task) { return task.id; })) + 1;
var _nextViewId = Math.max(4, ..._views.map(function (v) {
  var number = Number(v.id.slice(1));
  return v.id.charAt(0) === 'v' && Number.isInteger(number) ? number + 1 : 0;
}));
function persistViews() {
  try { localStorage.setItem('lingee_tasks_custom_views', JSON.stringify(_views.filter(function (v) { return !v.builtin; }))); }
  catch (e) { /* 本地存储不可用时保留内存中的视图 */ }
}

_tasks.forEach(cvStampTaskTeam);
function tkGetTasks() { return _tasks; }
function tkSetTasks(arr) { arr.forEach(ensureTaskIssueType); _tasks = arr; persistTasks(); }
/* 只在明确删除工作区后，按该工作区的项目 ID 清理任务；刷新时不能据未恢复的项目列表删数据。 */
function tkPruneOrphanTasks(projectIds) {
  if(!Array.isArray(projectIds)||!projectIds.length)return;
  var removed=new Set(projectIds);
  var previousLength=_tasks.length;
  _tasks=_tasks.filter(function(task){return !removed.has(task.project);});
  if(_tasks.length!==previousLength)persistTasks();
}
/* 已完成演示任务只补充一次，用户删除后不自动恢复。 */
function tkEnsureCompletedDemoTask() {
  // 旧完成样本只配置了部署交付；按所属团队补齐整个已完成路径。
  var demoPlanChanged = false;
  _tasks.filter(function (task) { return task.demoCompletedExample && task.executionPlan?.length === 1 && task.executionPlan[0].id === 'demo-completed-delivery'; }).forEach(function (task) {
    var demoProject = CV_PROJECTS.find(function (row) { return row.id === task.project; });
    var teamId = task.teamId || demoProject?.defaultTeam;
    migrateDeliveryPlan(task, teamId);
    if (task.executionPlan.length > 1) {
      task.executionPlan = task.executionPlan.map(function (stage) { return {...stage, assigneeId:stage.assigneeId || task.assignee, status:'done'}; });
      task.executionStageId = task.executionPlan[task.executionPlan.length - 1].id;
      demoPlanChanged = true;
    }
  });
  if (demoPlanChanged) persistTasks();
  var personId = tkCurrentUserId();
  var project = tkProjectsForCurrentUser().find(function (row) { return row.demoSeed; }) || tkProjectsForCurrentUser()[0];
  if (!personId || !project) return;
  var key = 'lingee_completed_demo_v1_' + project.id;
  try { if (localStorage.getItem(key)) return; } catch (e) { return; }
  if (!_tasks.some(function (task) { return task.demoCompletedExample && task.project === project.id; })) {
    var completedDemo = tkAddTask({ title:'客服工单查询与验收', desc:'完成客服工单查询、状态筛选及详情展示，已通过功能验证并交付。', issueType:'需求', status:'done', priority:'medium', project:project.id, assignee:personId, createdBy:personId, teamId:project.defaultTeam || '', demoCompletedExample:true, planStatus:'confirmed', executionStageId:'demo-completed-delivery', executionPlan:[{id:'demo-completed-delivery',workType:'部署交付',title:'部署交付',status:'done',assigneeId:personId,requiresConfirmation:false}], labels:[] });
    migrateDeliveryPlan(completedDemo, completedDemo.teamId);
    completedDemo.executionPlan = completedDemo.executionPlan.map(function (stage) { return {...stage, assigneeId:personId, status:'done'}; });
    completedDemo.executionStageId = completedDemo.executionPlan[completedDemo.executionPlan.length - 1].id;
    persistTasks();
  }
  try { localStorage.setItem(key, '1'); } catch (e) { /* 标记不可写时由任务标识去重 */ }
}
function tkEnsureWorkspaceDemoTasks() {
  var projects=tkProjectsForCurrentUser();
  var project=projects.find(function(row){return row.demoSeed;});
  if(!project||_tasks.some(function(task){return projects.some(function(row){return row.id===task.project;});}))return false;
  var personId=tkCurrentUserId();
  if(!personId)return false;
  [
    {title:'梳理需求与验收标准',desc:'明确范围、参与人和交付标准',status:'backlog',priority:'high',module:'需求梳理'},
    {title:'实现核心流程并完成联调',desc:'完成主要功能并与上下游接口联调',status:'in_progress',priority:'medium',module:'开发实现'},
    {title:'评审代码与测试结果',desc:'检查实现质量并确认关键测试用例',status:'in_review',priority:'medium',module:'质量验证'},
    {title:'整理发布说明',desc:'汇总变更内容和使用说明',status:'done',priority:'low',module:'交付发布'}
  ].forEach(function(spec){tkAddTask({...spec,project:project.id,assignee:personId,createdBy:personId,labels:['演示']});});
  return true;
}
function tkAddTask(task) {
  ensureTaskIssueType(task);
  var now = taskMinuteNow();
  task.id = _nextId++;
  task.code = 'T' + String(1000000 + task.id);
  task.createDate = now.slice(0, 10);
  task.createdAt = now;
  task.updatedAt = now;
  task.initialStatus = task.status;
  task.statusHistory = [];
  if (!task.createdBy) task.createdBy = tkCurrentUserId();
  _tasks.unshift(task);
  persistTasks();
  return task;
}
function tkUpdateTask(id, patch) {
  var t = _tasks.find(function (x) { return x.id === id; });
  if (t) {
    var before = { status:t.status, priority:t.priority, assignee:t.assignee, dueDate:t.dueDate, comments:(t.comments || []).length };
    if (patch.status && patch.status !== t.status) {
      t.statusHistory = (t.statusHistory || []).concat({
        from:t.status, to:patch.status, authorId:tkCurrentUserId(), time:taskMinuteNow(),
      });
    }
    if (patch.assignee && patch.assignee !== t.assignee && t.assignee) {
      t.assigneeHistory = Array.from(new Set((t.assigneeHistory || []).concat(t.assignee)));
    }
    Object.assign(t, patch, { updatedAt: taskMinuteNow() });
    persistTasks();
    if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('lingee:task-updated', { detail:{ task:t, before:before, patch:patch } }));
  }
  return t;
}
/* 所有状态的任务均可删除，执行记录不再作为删除限制。 */
const TK_DELETE_BLOCKED_REASON = '任务不存在或已被删除';
function tkCanDeleteTask(task) {
  return !!task;
}
/* 返回是否真的删除；不满足条件时保持原样 */
function tkDeleteTask(id) {
  var task = _tasks.find(function (x) { return x.id === id; });
  if (!tkCanDeleteTask(task)) return false;
  _tasks = _tasks.filter(function (x) { return x.id !== id; });
  persistTasks();
  return true;
}
function tkGetViews() { return _views; }
function tkAddView(name, config) {
  var v = Object.assign({ id: 'v' + _nextViewId++, name: name, scope: 'all', builtin: false }, config || {});
  _views.push(v);
  persistViews();
  return v;
}
function tkDeleteView(id) {
  _views = _views.filter(function (v) { return v.id !== id; });
  persistViews();
}
function tkRenameView(id, name) {
  var v = _views.find(function (x) { return x.id === id; });
  if (v) { v.name = name; persistViews(); }
}

export { TK_DELETE_BLOCKED_REASON, _tasks, taskDeliveryTeam, tkAddTask, tkAddView, tkCanDeleteTask, tkDeleteTask, tkDeleteView, tkEnsureCompletedDemoTask, tkEnsureWorkspaceDemoTasks, tkGetTasks, tkGetViews, tkPruneOrphanTasks, tkRenameView, tkSetTasks, tkUpdateTask };
