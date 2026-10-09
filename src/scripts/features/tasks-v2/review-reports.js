/* 待审核任务的本地演示报告。成员名称始终取智能体团队主数据，报告内容不代表真实执行。 */
import { taskExecutorTeam } from '../expert/task-team.js';
import { EXPERTS } from '../expert/data.js';
import { tkProjectById } from './data.js';

const REVIEW_REPORT_CONTENT = {
  2: { summary:'供应商评级模型已形成可评审方案，五项指标、权重和评级边界均已明确。', evidence:['交付《评级指标与权重说明》及 A/B/C/D 分档样例。','完成缺失数据、周期切换和权重调整的验算。'], review:'请确认五项指标权重及低样本供应商的评级规则。' },
  9: { summary:'采购订单打印模板已完成 A4 与热敏纸两种版式的交付。', evidence:['提交字段显隐、签章位置和跨页表头的预览样例。','核对批量打印、长明细分页及金额精度场景。'], review:'请确认签章位置与热敏纸打印字段范围。' },
  13: { summary:'采购价格比对看板已完成趋势图与供应商对比视图的方案设计。', evidence:['交付 12 个月趋势、均价线和异常波动标记样例。','检查物料、供应商与采购员三类筛选条件的联动。'], review:'请确认 ±15% 异常阈值与无历史价格时的展示方式。' },
  18: { summary:'供应商评分明细报表已完成评分钻取与趋势展示的交付样例。', evidence:['交付维度明细、加权总分及近 6 期趋势样例。','核对评分明细与订单、质检记录的关联口径。'], review:'请确认导出列和评分异常的解释文案。' },
  22: { summary:'供应商资质文件管理已形成上传、识别和到期提醒的执行结果。', evidence:['交付证照字段映射、版本记录和到期状态样例。','覆盖 OCR 识别失败、文件过期和重复上传场景。'], review:'请确认到期前 60 天提醒及过期冻结规则。' },
  26: { summary:'供应商评级接口联调已完成查询、钻取与趋势接口的验证。', evidence:['记录分页参数与日期边界两项已修复问题。','总分小数精度差异已列入待确认项。'], review:'请确认总分保留位数后再通过联调评审。' },
  30: { summary:'供应商绩效月报已完成取数、排版和订阅推送的交付。', evidence:['交付准时率排行、质量异常 TOP10 与价格波动样例。','核对每月 3 日生成、订阅范围及归档记录。'], review:'请确认邮件收件范围与月报数据截点。' },
  34: { summary:'工序流转状态机已形成主流程与异常分支的评审材料。', evidence:['交付状态图、并行工序与返工分支说明。','核对操作人、时间和设备编号的流转留痕。'], review:'请确认让步接收与报废分支的审批权限。' },
  38: { summary:'工单自动派单算法已完成规则样例与冲突处理结果。', evidence:['交付技能匹配、负载权重与紧急工单插队样例。','验证手动覆盖、30 分钟未响应转派和通知失败。'], review:'请确认紧急工单与人工指定发生冲突时的优先级。' },
  43: { summary:'人效指标体系已形成指标字典与三级下钻的评审样例。', evidence:['交付人均产值、人工成本与流失率等指标口径。','核对部门、团队、个人维度及同比环比展示。'], review:'请确认指标脱敏范围和跨部门查看权限。' },
  49: { summary:'扫码出入库 PDA 流程已形成入库、出库与离线补传结果。', evidence:['交付订单匹配、库位推荐和标签打印流程样例。','覆盖错码、超收、断网与重复同步场景。'], review:'请确认离线冲突处理及出库二次确认规则。' },
  58: { summary:'专家管理与智能体团队功能已完成列表、详情和项目绑定的交付。', evidence:['交付专家配置、技能多选、智能体团队成员与项目继承的交互样例。','核对创建、编辑、只读和跨项目切换的权限路径。'], review:'请确认项目绑定后，已有任务是否同步继承新的智能体团队。', agentResults:{
    'software-team-lead':'将专家库、专家详情和项目绑定拆成 3 个交付包，完成依赖与交付清单核对。',
    'software-product-manager':'补齐创建、编辑、只读 3 类使用场景和对应验收条件。',
    'cosmic-form':'整理专家配置表单字段、必填校验和技能多选规则。',
    'cosmic-workflow':'梳理项目绑定 → 任务继承 → 运行时派发的状态路径。',
    'cosmic-report':'整理智能体团队成员覆盖率与任务执行结果的展示字段。',
    'cosmic-plugin':'核对二开扩展点的启停与兼容边界，标记本轮无需新增插件。',
    'cosmic-api':'核对专家配置和项目绑定的读写契约、空值及错误反馈。',
    'software-qa-engineer':'整理 12 条验收场景，保留 2 条需人工确认的权限用例。',
  } },
  70: { summary:'任务执行模拟与对话流转已完成多智能体分工和结果回传。', evidence:['交付任务启动、专家分派、消息回传和审核中停机的流程样例。','核对重复提交、失败重试与人工接管的状态记录。'], review:'请确认待审核期间是否暂停自动续跑，以及退回后从哪个节点重试。', agentResults:{
    'software-team-lead':'编排 8 位专家的工作项顺序，汇总执行记录并提交人工审核。',
    'software-product-manager':'定义启动、等待、完成、退回四类用户可见反馈及验收条件。',
    'cosmic-form':'核对任务输入字段与对话补充信息的映射和必填提示。',
    'cosmic-workflow':'完成派发 → 执行 → 回传 → 待审核的状态路径。',
    'cosmic-report':'整理每个工作项的耗时、产物与结果摘要展示字段。',
    'cosmic-plugin':'检查插件型工作项的调用入口与失败回退边界。',
    'cosmic-api':'核对消息回传的幂等键、重试与重复事件处理。',
    'software-qa-engineer':'走查正常完成、失败重试、人工接管和审核退回四类场景。',
  } },
  1302: { summary:'问卷设计器已完成 12 种题型、逻辑跳转和多端预览，上一轮驳回的移动端矩阵题错位已修复。', evidence:['交付单选、多选、矩阵、量表、排序等 12 种题型的配置与预览样例。','复测 3 层逻辑跳转、必答校验和移动端矩阵题横向滚动，全部通过。'], review:'请确认题目上限 200 道及逻辑跳转最多 3 层的限制。', agentResults:{
    'general-app-team-lead':'把题型、逻辑跳转、预览拆成 3 个切片，汇总各切片的验证证据。',
    'general-app-product-expert':'核对 12 种题型的配置项与验收条件，补齐必答和跳转规则。',
    'general-app-architecture-expert':'确认问卷结构以 JSON Schema 存储，题型扩展不改表结构。',
    'general-app-development-expert':'实现题型组件、跳转引擎与预览，修复移动端矩阵题错位。',
    'general-app-qa-expert':'回归 48 条用例，覆盖桌面端、移动端和跳转死循环检测。',
  } },
  1503: { summary:'故障报修与维修记录已完成：扫码报修、按设备类型自动派工、维修记录归入设备履历，并通过 MCP 服务开放设备档案和维修记录查询。', evidence:['交付报修单、维修记录两个实体及其标准表单、列表元数据，派工插件和只读查询接口。','42 条用例全部通过，覆盖扫码带出设备、30 秒内派工到组、维修必填原因与零件、弱网不丢单。'], review:'请确认派工规则按注塑、空压、数控三个维修组划分。', agentResults:{
    'general-app-team-lead':'把报修、派工、维修记录拆成 3 个切片，汇总各切片的验证证据。',
    'general-app-product-expert':'核对报修字段与维修履历的验收条件，补齐必填规则。',
    'general-app-architecture-expert':'确认维修记录按设备归档，并通过 MCP 服务为智能体只读开放设备档案和维修记录。',
    'general-app-development-expert':'实现扫码报修、自动派工、维修记录与设备履历页面。',
    'general-app-qa-expert':'回归 42 条用例，覆盖派工时效、必填校验和弱网提交。',
  } },
  1506: { summary:'设备故障诊断助手已按周师傅的经验配置完成，挂载「查询设备档案」「查询维修记录」两个技能，通过 MCP 连接设备巡检维修系统，3 个真实故障测试全部符合经验。', evidence:['由对话生成基础信息、角色设定、技能配置和知识四项配置，没有编写代码。','测试 3 号注塑机 E21、1 号空压机压力不足、5 号数控机床主轴异响，回答均先引用维修记录再给排查顺序。'], review:'请周师傅确认排查顺序，通过后提交上架审核。', agentResults:{
    'agent-development-expert':'把口述经验整理成排查规则，生成智能体配置，挂载技能、连接 MCP、上传手册并完成测试。',
  } },
};

const ROLE_RESULTS = {
  'software-team-lead':'汇总工作项、依赖与交付证据，形成提交人工审核的结论。',
  'software-product-manager':'核对业务目标、范围与可观察的验收条件。',
  'software-architect':'检查模块边界、数据流与异常恢复路径。',
  'software-engineer':'整理实现路径、边界处理和交付记录。',
  'frontend-engineer':'核对页面状态、交互反馈与响应式展示。',
  'ux-designer':'走查信息层级、交互路径和空态提示。',
  'cosmic-form':'检查表单字段、校验、联动和权限配置。',
  'cosmic-workflow':'检查流程节点、条件分支与异常流转。',
  'cosmic-report':'核对报表取数口径、图表和导出字段。',
  'cosmic-plugin':'核对二开扩展点、生命周期和兼容边界。',
  'cosmic-api':'核对接口契约、鉴权、重试和幂等处理。',
  'software-qa-engineer':'按验收条件整理边界与回归场景，给出待审核项。',
};

export function createDemoReviewReport(task) {
  var content = REVIEW_REPORT_CONTENT[task.id];
  if (!content || task.status !== 'in_review') return null;
  var project = tkProjectById(task.project);
  var team = taskExecutorTeam(task, project);
  if (!team) return null;
  return {
    teamName:team.name,
    runId:'RUN-' + task.code,
    completedAt:task.createDate + ' 16:40',
    summary:content.summary,
    evidence:content.evidence,
    review:content.review,
    members:team.members.map(function (id) {
      var expert = EXPERTS.find(function (row) { return row.id === id; });
      return { id:id, name:expert?.name || id, lead:id === team.leadId,
        result:content.agentResults?.[id] || ROLE_RESULTS[id] || '完成分配的工作项并提交结果。' };
    }),
  };
}

/* 任务详情标题旁的模拟运行信息；名称来自项目绑定的智能体团队。 */
const RUN_STAGE_HINTS = [
  { pattern:/测试|验证|质检|缺陷|Bug/i, stage:'质量验证', agents:['software-qa-engineer'] },
  { pattern:/流程|流转|审批|派单/, stage:'流程实现', agents:['cosmic-workflow','software-engineer'] },
  { pattern:/报表|看板|指标|统计|分析/, stage:'报表与数据', agents:['cosmic-report','software-engineer'] },
  { pattern:/接口|集成|同步|数据链路/, stage:'接口集成', agents:['cosmic-api','software-engineer'] },
  { pattern:/插件|扩展|构建|性能/, stage:'工程实现', agents:['cosmic-plugin','software-engineer'] },
  { pattern:/表单|字段|页面|界面|交互|列表|工作台|原型/, stage:'界面实现', agents:['cosmic-form','frontend-engineer','ux-designer'] },
];

export function getDemoRunHeader(task) {
  var project = tkProjectById(task.project);
  var team = taskExecutorTeam(task, project);
  if (!team) return null;
  var status = task.status;
  if (status === 'planned' || status === 'backlog') return { stage:'等待启动', agentName:'尚未分派', tone:'idle' };
  if (status === 'cancelled') return { stage:'已取消', agentName:'无处理智能体', tone:'idle' };
  var hint = RUN_STAGE_HINTS.find(function (row) { return row.pattern.test(task.title); });
  var preferred = status === 'in_review' || status === 'done' || status === 'blocked'
    ? [team.leadId] : (hint?.agents || [team.leadId]);
  var agentId = preferred.find(function (id) { return team.members.includes(id); }) || team.leadId;
  var agent = EXPERTS.find(function (row) { return row.id === agentId; });
  var stage = status === 'in_review' ? '交付审核' : status === 'blocked' ? '异常处理'
    : status === 'done' ? '交付完成' : (hint?.stage || '任务执行');
  return { stage:stage, agentName:agent?.name || team.name, tone:status === 'blocked' ? 'blocked' : status === 'in_progress' ? 'running' : 'settled' };
}
