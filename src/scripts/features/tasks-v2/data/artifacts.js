import { equipmentArtifactDocs } from '../equipment-demo.js';
import { cvStampTaskTeam } from '../../collab/data.js';
import { buildTaskArtifactDocs } from '../artifact-docs.js';
import surveyAppHtml from '../../../../artifacts/survey-app.html?raw';
import helpdeskAppHtml from '../../../../artifacts/helpdesk-app.html?raw';
import { buildSitePreviewHtml, sitePreviewTheme } from '../site-preview.js';
import { tkPeopleInProject, tkProjectById } from './people.js';
import { tkGetPerson, tkGetProjectName } from './lookups.js';
import { taskDeliveryTeam } from './store.js';
/* 任务数据：任务详情中的阶段产物（拆自 tasks-v2/data.js） */

/* 任务详情中的 AI 产物，内容随任务标题、描述与项目成员变化。 */
/* 阶段产物按标准阶段（requirements / design / implementation …）生成；任务执行计划的节点 ID 可能是 s1…s6
   或自定义，这里按阶段名把产物归到对应的计划节点，详情里才能在该阶段下查看产物。 */
var ARTIFACT_PHASE_BY_NAME = { '需求确认':'requirements', '系统设计':'design', '苍穹应用开发':'implementation', '质量验收':'verification', '需求分析':'requirements', '方案设计':'design', '架构设计':'design', '编码实现':'implementation', '开发实现':'implementation', '测试验证':'verification', '部署交付':'delivery' };
function tkArtifactStageId(task, phaseId) {
  var plan = task.executionPlan;
  if (!Array.isArray(plan) || !plan.length || plan.some(function (stage) { return stage.id === phaseId; })) return phaseId;
  var hit = plan.find(function (stage) { return ARTIFACT_PHASE_BY_NAME[stage.title || stage.workType] === phaseId || ARTIFACT_PHASE_BY_NAME[stage.workType] === phaseId; });
  if (hit) return hit.id;
  var team = taskDeliveryTeam(task);
  if (team === 'cosmic-app-dev' && ['design','planning','agent'].includes(phaseId)) return 'implementation';
  if (['cosmic-app-dev','general-app-dev'].includes(team) && phaseId === 'delivery') return 'verification';
  if (team === 'general-app-dev' && ['planning','agent'].includes(phaseId)) return 'implementation';
  return phaseId;
}
/* 应用开发（通用应用开发智能体团队）的「开发实现」产物是部署后的网站，可直接预览和操作。
   问卷类项目用问卷调研演示应用，工单类项目用工单管理系统演示应用；其他项目按业务主题（工单、采购、报销、库存…）生成演示网站，
   没有命中主题时用任务产物里的演示列表数据。 */
function tkWebsiteArtifact(task, doc) {
  if (doc.id !== 'implementation') return null;
  var project = tkProjectById(task.project);
  var teamId = cvStampTaskTeam(task);
  if (teamId !== 'general-app-dev' && teamId !== 'kingdee-secondary-dev') return null;
  var name = (project && project.name) || '应用';
  var base = {
    id: 'implementation', stageId: doc.stageId, type: '网站预览', format: 'html', fileName: String(task.code || 'task').toLowerCase() + '-site.html',
    docTitle: name + ' · 网站预览', summary: '开发完成后部署的可访问网站，可直接操作页面',
  };
  if (/问卷|调研|调查/.test(name + ' ' + (task.title || ''))) {
    return Object.assign(base, { url: 'https://apps.lingee.com/survey', content: surveyAppHtml });
  }
  /* 工单类项目用工单管理系统演示应用（与应用开发里的「工单管理系统」同一份页面） */
  if (/工单|服务台|客服|SLA/.test(name + ' ' + (task.title || ''))) {
    return Object.assign(base, { url: 'https://apps.lingee.com/helpdesk', content: helpdeskAppHtml });
  }
  var appBlock = null;
  (doc.sections || []).forEach(function (section) {
    (section.blocks || []).forEach(function (block) { if (block.app && !appBlock) appBlock = block.app; });
  });
  var theme = sitePreviewTheme(name, task);
  return Object.assign(base, {
    url: 'https://apps.lingee.com/' + theme.slug,
    content: buildSitePreviewHtml({ projectName: name, task: task, pageTitle: task.title, app: appBlock }),
  });
}
function tkGetTaskArtifacts(task) {
  var projectPeople = tkPeopleInProject(task.project);
  function nameAt(i, fallbackId) { return (projectPeople[i] || tkGetPerson(fallbackId)).name; }
  var people = {
    product: nameAt(0, task.createdBy),
    dev: nameAt(1, task.assignee),
    arch: nameAt(2, task.assignee),
    test: nameAt(3, task.assignee),
    owner: tkGetPerson(task.createdBy || task.assignee).name,
  };
  var docs = buildTaskArtifactDocs({ task: task, projectName: tkGetProjectName(task.project), people: people })
    .map(function (doc) { return tkWebsiteArtifact(task, doc) || doc; });
  /* 演示任务的定制产物按 id 覆盖通用产物 */
  var custom = equipmentArtifactDocs(task, people);
  if (custom) docs = docs.filter(function (doc) { return !custom.some(function (row) { return row.id === doc.id; }); }).concat(custom);
  return docs.map(function (doc) { return Object.assign({}, doc, { stageId: tkArtifactStageId(task, doc.stageId) }); })
    .concat(task.executionArtifacts || []);
}

export { tkGetTaskArtifacts };
