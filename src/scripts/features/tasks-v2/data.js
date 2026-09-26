/* 任务管理 v2 —— 模拟数据与状态
   纯前端原型，所有数据本地维护。 */
import { CV_MEMBERS, CV_PROJECTS, CV_TASKS, cvCurrentUserName, cvPeopleInProject } from '../collab/data.js';
import { createDemoReviewReport } from './review-reports.js';
import { createDemoBlockedRun } from './blocked-runs.js';
import { createDemoCompletedRun } from './completed-runs.js';

/* ---------- 常量定义 ---------- */
export const TK_STATUSES = [
  { id: 'planned',     name: '待规划', color: 'gray',   icon: 'dotted' },
  { id: 'backlog',     name: '待办',   color: 'gray',   icon: 'circle' },
  { id: 'in_progress', name: '进行中', color: 'orange', icon: 'half' },
  { id: 'in_review',  name: '审核中', color: 'green',  icon: 'three_quarters' },
  { id: 'blocked',   name: '已阻塞', color: 'red',    icon: 'slash' },
  { id: 'done',       name: '已完成', color: 'blue',   icon: 'check' },
  { id: 'cancelled',  name: '已取消', color: 'gray',   icon: 'cross' },
];

export const TK_PRIORITIES = [
  { id: 'urgent', name: '紧急', color: 'red'    },
  { id: 'high',   name: '高',   color: 'orange' },
  { id: 'medium', name: '中',   color: 'blue'   },
  { id: 'low',    name: '低',   color: 'gray'   },
];

/* 演示任务只使用项目中已有的七位人员；姓名和身份始终来自项目人员主数据。 */
const TK_DEMO_PERSON_IDS = ['p22', 'p01', 'p02', 'p03', 'p04', 'p05', 'p07'];
const TK_PERSON_COLORS = ['#495dff', '#08a040', '#e04a3a', '#7858f9', '#c06010', '#0891b2', '#d76794'];
export const TK_PEOPLE = [];
export function tkSyncPeople() {
  var assignedIds = typeof _tasks === 'undefined' ? [] : _tasks.flatMap(function (task) { return [task.assignee, task.createdBy]; }).filter(Boolean);
  var personIds = Array.from(new Set(TK_DEMO_PERSON_IDS.concat(assignedIds)));
  TK_PEOPLE.splice(0, TK_PEOPLE.length, ...personIds.map(function (id, index) {
    var person = CV_MEMBERS.find(function (row) { return row.id === id; });
    return person && person.status !== 'disabled' ? { id:person.id, name:person.name, avatar:person.name.slice(0, 1), color:TK_PERSON_COLORS[index % TK_PERSON_COLORS.length] } : null;
  }).filter(Boolean));
  TK_FILTER_FIELDS.find(function (field) { return field.id === 'assignee'; }).options = TK_PEOPLE.map(function (person) { return { value:person.id, label:person.name }; });
  TK_FILTER_FIELDS.find(function (field) { return field.id === 'project'; }).options = tkProjectsForCurrentUser().map(function (project) { return { value:project.id, label:project.name }; });
  if (typeof _tasks !== 'undefined') _tasks.forEach(function (task) {
    var people = tkPeopleInProject(task.project);
    if (!people.some(function (person) { return person.id === task.assignee; })) task.assignee = people[0]?.id || '';
    if (!CV_MEMBERS.some(function (person) { return person.id === task.createdBy; })) task.createdBy = tkCurrentUserId() || people[0]?.id || '';
  });
}
export function tkPeopleInProject(projectId) {
  var project = CV_PROJECTS.find(function (row) { return row.id === projectId; });
  if (!project) return [];
  var members = cvPeopleInProject(project);
  var owner = CV_MEMBERS.find(function (person) { return person.name === project.owner; });
  if (owner && !members.some(function (person) { return person.id === owner.id; })) members.push(owner);
  return members.filter(function (person) { return person.status !== 'disabled'; }).map(function (person, index) {
    return { id:person.id, name:person.name, avatar:person.name.slice(0, 1), color:TK_PERSON_COLORS[TK_DEMO_PERSON_IDS.indexOf(person.id)] || TK_PERSON_COLORS[index % TK_PERSON_COLORS.length] };
  });
}
export function tkCurrentUserId() {
  var person = CV_MEMBERS.find(function (row) { return row.name === cvCurrentUserName(); });
  return person ? person.id : '';
}
export function tkProjectsForCurrentUser() {
  var userId = tkCurrentUserId();
  return userId ? CV_PROJECTS.filter(function (project) { return (project.members || []).includes(userId); }) : [];
}

export const TK_AGENTS = [
  { id: 'a1', name: '代码审查专家', avatar: 'C', color: '#495dff' },
  { id: 'a2', name: '需求分析专家', avatar: 'R', color: '#08a040' },
  { id: 'a3', name: '测试验证专家', avatar: 'T', color: '#ff8d42' },
];

export const TK_PROJECTS = CV_PROJECTS;

export const TK_LABELS = ['需求', '缺陷'];

/* 任务详情中的 AI 产物，内容随任务标题与项目变化。 */
export function tkGetTaskArtifacts(task) {
  var title = task.title;
  var project = tkGetProjectName(task.project);
  var baseDate = task.createDate || '2026-09-20';
  function dateTimeAfter(days, hhmm) {
    var d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10) + ' ' + hhmm;
  }
  var projectPeople = tkPeopleInProject(task.project);
  var productPerson = (projectPeople[0] || tkGetPerson(task.createdBy)).name;
  var devPerson = (projectPeople[1] || tkGetPerson(task.assignee)).name;
  var archPerson = (projectPeople[2] || tkGetPerson(task.assignee)).name;
  var testPerson = (projectPeople[3] || tkGetPerson(task.assignee)).name;
  return [
    { id:'requirements', stageId:'requirements', type:'需求文档', summary:'业务目标、使用场景与验收标准', date: dateTimeAfter(0, '09:40'), author: productPerson, sections:[
      { heading:'业务目标', text:'围绕"' + title + '"，需要解决的核心问题是当前业务流程中人工操作环节多、数据流转效率低、关键节点缺少自动化校验。目标用户为' + project + '项目的业务负责人和一线操作人员。交付范围包含主流程功能实现、配套数据校验规则、异常场景的提示与恢复机制，以及面向管理层的统计概览。不包含跨系统的权限迁移和历史数据清洗，这些将由独立任务承接。' },
      { heading:'使用场景', text:'在"' + project + '"项目中，用户通过主导航进入功能入口后，按以下路径完成主要操作：选择业务对象 → 填写或确认关键信息 → 提交校验 → 查看处理结果 → 根据结果执行后续操作（确认/退回/转交）。异常场景包括：网络中断后的断点续传、必填字段缺失时的即时提示、并发操作导致的数据冲突检测与锁定提示、以及权限不足时的友好拦截页面。每个场景都应提供明确的操作指引，避免用户陷入无反馈的等待状态。' },
      { heading:'功能范围', text:'本期交付范围划分为三个优先级：P0 核心流程（主数据录入、校验、状态流转、结果展示）必须全量交付；P1 辅助功能（批量操作、筛选导出、快捷操作菜单）在核心流程验证通过后迭代交付；P2 增强体验（个性化配置、操作记忆、快捷键支持）列入后续版本规划，本期不承诺交付时间。所有功能项均需在需求评审中确认归属和验收标准后方可进入开发。' },
      { heading:'验收标准', text:'验收维度分为四层：流程层——从入口到结果反馈的主流程可完整走通，中间不出现卡死或跳转异常；数据层——关键字段的校验规则全部生效，包括格式校验、范围校验、唯一性校验和关联完整性校验；交互层——每个操作步骤都有明确的 loading 态、成功态、失败态和空数据态，异常输入有内联提示且可恢复；性能层——页面首屏加载不超过 2 秒，列表查询 500 条数据响应不超过 1 秒，批量操作 100 条完成不超过 5 秒。' },
    ] },
    { id:'architecture', stageId:'design', type:'架构设计', summary:'模块边界、数据流与依赖关系', date: dateTimeAfter(0, '10:25'), author: archPerson, sections:[
      { heading:'模块边界', text:'"' + title + '"在架构上划分为三层协作：展示层负责界面渲染、交互响应和状态管理，使用组件化开发模式，每个业务区块封装为独立组件，内部状态不外泄；任务处理层负责业务逻辑编排、参数校验和状态机流转，对外暴露标准化的服务接口，不直接操作 DOM；项目数据层负责与后端 API 交互、本地缓存管理和数据格式转换，统一封装请求/响应拦截器，处理 loading、错误和重试策略。三层之间通过明确的事件接口通信，禁止跨层直接调用。' },
      { heading:'数据流', text:'完整数据流路径为：用户操作触发组件事件 → 展示层派发 action → 任务处理层接收并执行参数校验 → 校验通过后调用项目数据层的 API → 数据层处理后返回结果 → 处理层更新业务状态 → 展示层响应式更新界面。异常分支：参数校验失败时直接返回错误信息给展示层，不进入数据层；API 调用失败时由数据层统一捕获并按策略重试或上报；并发冲突时由处理层持有乐观锁，冲突后提示用户刷新并重试。' },
      { heading:'依赖关系', text:'本功能依赖"' + project + '"项目中已有的数据定义模块（提供基础数据模型和字段元数据）、权限服务（提供角色与数据权限校验）和通知服务（提供操作后的消息推送）。新增依赖项需在联调前完成接口约定评审。跨模块字段映射（如状态枚举值对齐、编码规范统一）需在开发启动前与关联模块负责人确认，避免联调阶段出现字段语义不一致导致返工。' },
      { heading:'风险与对策', text:'已识别风险三点：一是后端 API 排期不确定，可能导致前端 mock 与真实接口差异较大，对策是提前锁定接口契约文档并以契约驱动开发；二是批量操作在大数据量下可能卡顿，对策是在数据层引入分页游标和流式处理；三是多端权限模型不一致可能导致数据可见范围异常，对策是在联调阶段补充权限边界测试用例，覆盖跨角色访问场景。' },
    ] },
    { id:'plan', stageId:'planning', type:'实施计划', summary:'工作项拆分、依赖顺序与验收安排', date: dateTimeAfter(0, '11:10'), author: productPerson, sections:[
      { heading:'工作项拆分', text:'将"' + title + '"拆分为五个工作项集合：需求确认（含评审会议纪要和验收标准文档）、方案设计（含架构设计文档和接口契约）、核心实现（含主流程开发、异常分支处理和状态机配置）、独立验证（含单元测试、集成测试和回归测试）、交付发布（含部署文档、用户手册和上线检查清单）。每个工作项集合进一步拆分为 2-4 个可独立估时的子任务，子任务的粒度控制在 0.5-2 人日之间。' },
      { heading:'依赖顺序', text:'执行顺序遵循"先契约后实现"原则：第一步完成字段定义和接口约定评审，锁定输入输出规范；第二步基于契约实现主流程，同时前端用 mock 数据并行开发；第三步实现异常分支和边界场景处理；第四步完成独立验证，包括自动化测试覆盖和手工回归测试；第五步整理交付文档并执行发布检查。步骤间允许 30% 的并行度，但每步的出口标准必须满足才能进入下一步。' },
      { heading:'验收安排', text:'每个工作项关联明确的验收人和验收标准。需求确认由产品负责人验收，标准是评审纪要签字确认；方案设计由架构负责人验收，标准是设计文档通过评审；核心实现由技术负责人验收，标准是代码通过 review 且主流程冒烟测试通过；独立验证由测试负责人验收，标准是测试用例全量执行且无 P0/P1 缺陷；交付发布由项目负责人验收，标准是部署文档可复现且用户手册可理解。' },
      { heading:'里程碑', text:'关键里程碑节点：T+2 完成需求评审和接口契约锁定；T+5 完成主流程开发并接入真实接口；T+7 完成异常分支处理和边界场景覆盖；T+9 完成全量测试并修复缺陷；T+10 完成交付文档整理和发布检查。每个里程碑设置一天缓冲期，用于处理不确定性。里程碑偏差超过一天需在当日站会上同步并调整后续计划。' },
    ] },
    { id:'technical', stageId:'implementation', type:'技术文档', summary:'实现方案、接口约定与异常处理', date: dateTimeAfter(0, '13:45'), author: devPerson, sections:[
      { heading:'实现方案', text:'按界面层、业务逻辑层和数据访问层拆分"' + title + '"的实现步骤。界面层采用组件化开发，每个业务区块封装为独立组件，通过 props 传递数据、通过 emit 触发事件，组件内部状态用组合式函数管理；业务逻辑层封装为 service 模块，对外暴露标准化的异步方法，内部负责参数校验、状态编排和数据转换；数据访问层统一封装 HTTP 客户端，支持请求/响应拦截、自动重试（指数退避，最多 3 次）和缓存策略。三层通过依赖注入解耦，便于单元测试 mock。' },
      { heading:'接口约定', text:'接口遵循 RESTful 规范，主要接口包括：查询列表（GET，支持分页、排序、筛选参数）、获取详情（GET，路径参数为业务 ID）、创建（POST，请求体为业务对象）、更新（PUT，全量更新）、部分更新（PATCH，增量更新）、删除（DELETE，软删除标记）。所有接口统一返回 { code, message, data } 结构，code=0 表示成功，非 0 表示业务错误。列表接口返回 { items, total, page, pageSize }。待确认项：批量操作的接口形式（单接口批量 vs 循环调用单接口），需与后端在联调前确认。' },
      { heading:'异常处理', text:'异常处理覆盖四类场景：网络异常（请求超时、连接失败）——自动重试 3 次后提示"网络不稳定，请稍后重试"，保留用户已填数据不丢失；业务异常（校验失败、权限不足、状态冲突）——展示后端返回的 message，关键字段错误时高亮对应输入框并聚焦；系统异常（500 错误、网关超时）——展示统一兜底页面，提供"返回首页"和"联系管理员"操作；前端异常（渲染错误、状态不一致）——通过错误边界捕获，展示降级 UI 并上报错误日志。所有异常都记录到前端日志，包含请求 ID 便于后端联查。' },
      { heading:'性能策略', text:'性能优化策略：列表页使用虚拟滚动渲染大数据量（超过 200 行启用），减少 DOM 节点数；查询接口支持增量加载和分页游标，避免全量拉取；高频操作（如筛选、排序）加防抖（300ms），减少无效请求；静态资源按路由懒加载，首屏只加载核心 chunk；图片资源使用 WebP 格式并按视口懒加载。监控指标：首屏 LCP < 2s，交互响应 FID < 100ms，列表滚动 FPS > 50。' },
    ] },
    { id:'prototype', stageId:'implementation', type:'原型图', summary:'页面布局、关键状态与交互说明', date: dateTimeAfter(0, '14:10'), author: productPerson, sections:[
      { heading:'页面结构', text:'页面整体采用上下分区布局：顶部为操作栏（包含标题、面包屑、主操作按钮和更多菜单），高度固定 56px；中部为内容主体区，根据业务场景自适应高度，内部包含筛选区（可折叠）和数据列表区（虚拟滚动）；底部为分页栏和批量操作条（选中时浮现）。内容主体区左右分栏：左侧为主数据列表（占 65% 宽度），右侧为详情抽屉（占 35% 宽度，可收起）。移动端响应式：操作栏折叠为汉堡菜单，详情抽屉改为底部弹出。' },
      { heading:'交互流程', text:'从任务列表进入"' + title + '"后，用户完成以下操作路径：查看列表 → 使用筛选区缩小范围 → 点击列表行打开右侧详情抽屉 → 在抽屉中编辑关键字段 → 点击保存触发校验 → 校验通过后展示成功 toast 并刷新列表 → 校验失败时高亮错误字段并显示内联提示。快捷操作：列表行右键弹出操作菜单（查看详情、复制、删除、转交）；键盘支持 Tab 切换焦点、Enter 确认操作、Esc 关闭抽屉。所有操作提供 undo 入口（5 秒内可撤销）。' },
      { heading:'界面状态', text:'完整覆盖五种界面状态：默认态（有数据时的正常展示）、加载态（骨架屏占位，首次加载和翻页时展示）、空数据态（插画 + 引导文案 + "新建"按钮，区分"无数据"和"筛选无结果"两种文案）、错误态（错误图标 + 描述 + 重试按钮，区分网络错误和业务错误）、成功态（操作成功后的 toast 反馈，3 秒自动消失，可手动关闭）。每个状态的视觉表达保持一致性，使用统一的设计 token。' },
      { heading:'响应式适配', text:'断点设计：桌面端（≥1200px）完整展示左右分栏和操作栏；中屏（768-1199px）详情抽屉改为全宽覆盖弹出，筛选区默认折叠；移动端（<768px）操作栏折叠为底部 Tab 栏，列表改为卡片式布局，筛选改为顶部下拉面板。触控优化：移动端所有可点击区域最小 44x44px，列表行支持左滑显示快捷操作。横竖屏切换时保持当前滚动位置和选中状态。' },
    ] },
    { id:'test', stageId:'verification', type:'测试报告', summary:'测试范围、模拟结果与待审核项', date: dateTimeAfter(0, '15:05'), author: testPerson, sections:[
      { heading:'测试范围', text:'覆盖"' + title + '"的三层测试：功能层——主流程正向验证（从入口到结果反馈的完整路径）、逆向验证（异常输入、非法操作、权限边界）、边界值验证（最大输入长度、最大列表条数、并发操作冲突）；数据层——字段校验规则全量验证（格式、范围、唯一性、关联完整性）、数据持久化和缓存一致性验证；交互层——五种界面状态（默认、加载、空数据、错误、成功）的视觉验证、键盘可访问性验证、响应式断点适配验证。总计设计测试用例 86 条，其中自动化覆盖 72 条。' },
      { heading:'测试用例', text:'按场景分类的测试用例摘要：正常流程（15 条）——覆盖标准操作路径和预期结果；参数校验（20 条）——覆盖必填校验、格式校验、范围校验、唯一性校验的全部分支；异常恢复（18 条）——覆盖网络中断后断点续传、并发冲突后的刷新重试、权限变更后的拦截提示；边界场景（12 条）——覆盖大数据量列表渲染、极端输入值、长时间无操作后的会话过期；权限矩阵（21 条）——覆盖不同角色组合下的数据可见性和操作权限。' },
      { heading:'模拟结果', text:'自动化测试执行结果：72 条用例中通过 68 条，失败 2 条（均为分页边界值处理与预期不符，已记录缺陷并分配修复），跳过 2 条（依赖待确认的批量操作接口）。手工测试执行结果：14 条用例中通过 12 条，2 条 UI 适配问题已记录为低优先级缺陷。性能测试结果：首屏加载 1.8s（目标 2s 内达标），列表查询 500 条响应 0.7s（目标 1s 内达标），批量操作 100 条完成 3.2s（目标 5s 内达标）。' },
      { heading:'待审核项', text:'需人工审核确认的三个事项：一是批量操作的接口形式尚未最终确定（单接口批量 vs 循环调用），影响 2 条测试用例的最终验证策略，需后端在联调前确认；二是跨角色数据权限的边界测试中，"部门主管查看其他部门汇总数据"场景的预期结果需产品负责人确认是否符合业务规则；三是移动端卡片式列表在极端数据量（1000+ 条）下的渲染性能是否需要设置分页上限，需与设计团队确认交互方案。' },
    ] },
    { id:'delivery', stageId:'delivery', type:'交付说明', summary:'交付范围、验证结论与后续观察项', date: dateTimeAfter(0, '16:20'), author: devPerson, sections:[
      { heading:'交付范围', text:'"' + title + '"本期交付内容包含：功能代码（前端组件 + 后端服务，已通过代码 review 和自动化测试）、技术文档（架构设计文档、接口契约文档、部署手册和运维手册）、用户文档（操作手册、常见问题 FAQ 和培训视频）、测试产物（测试用例库、测试报告和缺陷追踪记录）。所有交付物已按验收范围整理归档，版本号 v1.0.0，对应代码 tag 已打标。交付清单共 12 项，已逐一核对完整性。' },
      { heading:'验证结论', text:'验证覆盖四个维度并记录结论：主流程验证——从入口到结果反馈的完整路径全部通过，包含正常路径和 3 条异常恢复路径；权限边界验证——5 种角色组合下的数据可见性和操作权限全部符合预期，包含 2 个跨部门访问场景；异常恢复验证——网络中断重试、并发冲突刷新、会话过期拦截三个场景均验证通过并保留操作日志；性能验证——首屏加载、列表查询、批量操作三项指标均在目标范围内，并在 50/100/200 并发下完成压力测试。' },
      { heading:'后续观察', text:'上线后持续观察的三项指标：一是使用反馈——上线首周关注用户操作路径的热力图和关键节点的转化率，识别操作卡点和流失节点；二是异常监控——关注错误日志中本功能相关的异常类型和频率，重点监控接口超时率和前端渲染异常率，阈值告警设为超时率 > 2% 和渲染异常率 > 0.5%；三是数据质量——关注新增数据的字段完整性和关联一致性，通过每日数据校验任务自动检查并报告异常记录。按需补充回归测试用例覆盖线上发现的新场景。' },
      { heading:'已知限制', text:'本期交付存在以下已知限制：批量操作当前仅支持单次 100 条上限，超过需分批执行，后续版本计划提升至 500 条并引入异步队列；移动端暂不支持离线模式，网络中断时操作会丢失，后续版本计划引入离线缓存和同步机制；数据导出当前仅支持 Excel 格式，后续版本计划支持 CSV 和 PDF；列表的自定义列配置本期仅支持拖拽排序，列的显示/隐藏和宽度调整列入下期规划。以上限制已同步至用户文档的"已知限制"章节。' },
    ] },
  ];
}

/* ---------- 视图配置 ---------- */
export const TK_VIEWS = [
  { id: 'all',        name: '全部',    scope: 'all',       builtin: true },
  { id: 'members',    name: '我负责',  scope: 'my_assigned', builtin: true },
  { id: 'agents',     name: '进行中',  scope: 'in_progress', builtin: true },
];

/* ---------- 筛选字段定义 ---------- */
export const TK_FILTER_FIELDS = [
  { id: 'status',    name: '状态',   type: 'select', options: TK_STATUSES.map(s => ({ value: s.id, label: s.name })) },
  { id: 'priority',  name: '优先级', type: 'select', options: TK_PRIORITIES.map(p => ({ value: p.id, label: p.name })) },
  { id: 'assignee',  name: '处理人', type: 'select', options: TK_PEOPLE.map(p => ({ value: p.id, label: p.name })) },
  { id: 'project',   name: '项目',   type: 'select', options: TK_PROJECTS.map(p => ({ value: p.id, label: p.name })) },
  { id: 'label',     name: '标签',   type: 'select', options: TK_LABELS.map(l => ({ value: l, label: l })) },
  { id: 'dueDate',   name: '截止日期', type: 'date' },
  { id: 'keyword',   name: '关键词',   type: 'text' },
];

export const TK_OPERATORS = {
  select: [
    { value: 'eq', label: '等于' },
    { value: 'neq', label: '不等于' },
  ],
  date: [
    { value: 'before', label: '早于' },
    { value: 'after', label: '晚于' },
    { value: 'today', label: '今天' },
    { value: 'overdue', label: '已逾期' },
  ],
  text: [
    { value: 'contains', label: '包含' },
    { value: 'not_contains', label: '不包含' },
  ],
};

/* ---------- 模拟任务数据 ---------- */
export const TK_TASKS = [
  { id: 1,  code: 'T1000001', title: '采购订单列表页开发', desc: '完成采购订单列表页的前端开发，包含多条件筛选（供应商、日期范围、订单状态）、分页加载、批量导出 Excel。列表需支持列排序、列宽拖拽调整、固定表头。筛选区域可折叠保存，表格行右键支持快捷操作菜单（查看详情、复制订单、打印）。接口对接后端分页查询 API，需处理 loading 态和空数据态。', status: 'in_progress', priority: 'high',   assignee: 'p01', project: 'purchase', labels: ['需求'],     dueDate: '2026-09-25', createDate: '2026-09-20' },
  { id: 2,  code: 'T1000002', title: '供应商评级模型设计', desc: '设计供应商多维度评级算法，覆盖交货准时率（30%）、质量合格率（25%）、价格竞争力（20%）、服务响应速度（15%）、合作年限（10%）五个维度。支持权重动态配置与评级周期自定义（月度/季度/年度）。评级结果分 A/B/C/D 四档，自动生成评级报告并推送至采购负责人。需输出算法设计文档、数据库表结构设计、评级计算存储过程。', status: 'in_review',  priority: 'urgent', assignee: 'p03', project: 'supply', labels: ['缺陷'],     dueDate: '2026-09-24', createDate: '2026-09-18' },
  { id: 3,  code: 'T1000003', title: '入库单审批流程配置', desc: '配置入库单的多级审批流程：仓管员提交→库管主管初审（金额<1万）→采购经理复审（1万-10万）→财务总监终审（>10万）。支持金额阈值自动路由、审批人代理设置（请假/出差）、审批超时自动催办（24小时未处理）。审批节点支持自定义表单字段（审批意见、附件、签字）。需与工作流引擎对接，审批记录可追溯。', status: 'backlog',     priority: 'medium', assignee: 'p07', project: 'purchase', labels: ['需求'],              dueDate: '2026-09-28', createDate: '2026-09-22' },
  { id: 4,  code: 'T1000004', title: '财务报表数据源对接', desc: '对接 ERP 总账数据源，实现资产负债表、利润表、现金流量表的实时数据同步。需处理多账套合并取数、币种折算、期初期末结转等场景。接口采用定时增量拉取+手动全量刷新双模式，数据落库前做完整性校验（借贷平衡、科目编码规范）。阻塞原因：ERP 测试环境账套数据不完整，需协调运维补数。', status: 'blocked',     priority: 'high',   assignee: 'p22', project: 'expense', labels: ['缺陷'],        dueDate: '2026-09-26', createDate: '2026-09-19' },
  { id: 5,  code: 'T1000005', title: '采购订单详情页交互', desc: '完成采购订单详情页全部交互逻辑：订单基本信息展示、明细行增删改、金额自动计算（含税/不含税切换）、状态流转时间轴、附件预览（PDF/图片在线预览）、操作日志。支持订单复制创建、变更对比（标红变更字段）、打印预览。底部评论区域支持 @ 提及人员并推送通知。', status: 'in_progress', priority: 'medium', assignee: 'p01', project: 'purchase', labels: ['需求'],              dueDate: '2026-09-27', createDate: '2026-09-21', parentId: 1 },
  { id: 6,  code: 'T1000006', title: '供应商黑白名单管理', desc: '开发供应商黑白名单管理功能：支持单条录入与 Excel 批量导入（含模板下载、数据校验、导入预览）。黑名单供应商自动拦截采购下单并弹窗提示原因；白名单供应商享受绿色通道（免审批、优先付款）。名单变更需审批，变更记录可追溯。已通过测试验收并上线运行。', status: 'done',        priority: 'low',    assignee: 'p03', project: 'supply', labels: ['缺陷'],        dueDate: '2026-09-15', createDate: '2026-09-10' },
  { id: 7,  code: 'T1000007', title: '入库质检标准配置', desc: '按品类配置入库质检标准和抽检比例：原材料类全检（外观+尺寸+批次），标准件类按 AQL 2.5 抽检，辅料类免检。质检项目包含外观、尺寸、重量、性能指标，不合格项支持退货/让步接收/返工处理。质检结果自动关联入库单状态，不合格自动冻结入库流程并通知采购。', status: 'backlog',     priority: 'medium', assignee: 'p07', project: 'purchase', labels: ['需求'],            dueDate: '2026-09-30', createDate: '2026-09-22' },
  { id: 8,  code: 'T1000008', title: '报表导出性能优化', desc: '优化大数据量报表导出性能，当前 10 万行导出耗时 28 秒，目标降至 3 秒内。优化方案：1. 查询层加索引+分页游标读取；2. 内存层用流式写入替代全量缓存；3. 输出层异步生成文件+进度条反馈；4. 引入 Redis 缓存高频报表模板。已完成查询优化和流式写入，正在对接前端进度条组件。', status: 'in_progress', priority: 'high',   assignee: 'p22', project: 'expense', labels: ['缺陷'],     dueDate: '2026-09-29', createDate: '2026-09-20' },
  { id: 9,  code: 'T1000009', title: '采购订单打印模板', desc: '设计并开发采购订单打印模板，支持自定义字段配置（公司信息、签章位置、明细列显示/隐藏）。模板支持 A4/热敏两种纸张规格，打印时自动分页并带页眉页脚（页码、打印时间、制单人）。支持批量打印（按日期范围筛选）。已完成模板设计稿评审，正在开发模板渲染引擎。', status: 'in_review',  priority: 'low',    assignee: 'p07', project: 'purchase', labels: ['需求'],     dueDate: '2026-09-25', createDate: '2026-09-19', parentId: 1 },
  { id: 10, code: 'T1000010', title: '供应商准入审核流程', desc: '配置供应商准入资质审核全流程：基础信息录入→营业执照OCR校验→资质文件上传（营业执照、税务登记、开户许可、质量体系认证）→风控核查（司法风险、信用黑名单）→采购初审→风控复审→管理层审批。资质文件支持 OCR 自动识别关键字段并填充，风控数据对接第三方征信接口。审核通过自动创建供应商档案。', status: 'backlog',     priority: 'urgent', assignee: 'p03', project: 'supply', labels: ['缺陷'],       dueDate: '2026-09-24', createDate: '2026-09-23' },
  { id: 11, code: 'T1000011', title: '入库异常预警机制', desc: '开发入库异常自动预警系统，监控维度：库存超上限/低于安全库存、保质期临期（剩余<30天黄色/15天橙色/7天红色）、批次号重复、规格与采购订单不符。预警通过站内消息+邮件双通道推送至仓管员和采购员。看板页面实时滚动展示异常清单，支持标记已处理/忽略。', status: 'in_progress', priority: 'high',   assignee: 'p07', project: 'purchase', labels: ['需求'],        dueDate: '2026-09-28', createDate: '2026-09-21' },
  { id: 12, code: 'T1000012', title: '财务月报自动生成', desc: '配置月度财务报表自动生成定时任务：每月 1 日凌晨 2:00 自动拉取上月凭证数据，生成资产负债表、利润表、费用明细表、应收应付账龄分析表。报表导出 PDF 并推送至财务群邮件组，同时在系统中创建月报归档记录。支持手动触发补生成和自定义报表期间。', status: 'done',        priority: 'medium', assignee: 'p05', project: 'expense', labels: ['缺陷'],       dueDate: '2026-09-14', createDate: '2026-09-08' },
  { id: 13, code: 'T1000013', title: '采购价格比对看板', desc: '开发采购价格历史比对看板，展示同一物料近 12 个月采购价格趋势曲线，标注最高/最低/均价。支持多供应商横向比价（柱状图+表格双视图）。价格异常波动（偏离均价±15%）自动标红并推送预警。看板支持按物料分类、供应商、采购员筛选。已完成前端组件开发，正在对接数据接口。', status: 'in_review',  priority: 'medium', assignee: 'p01', project: 'purchase', labels: ['需求'],     dueDate: '2026-09-26', createDate: '2026-09-20' },
  { id: 14, code: 'T1000014', title: '供应商合同到期提醒', desc: '配置供应商合同到期自动提醒机制：到期前 90/60/30/15/7 天分五级递进提醒，提醒方式从站内消息逐步升级至邮件+短信。提醒对象为合同签约人和对应采购员。支持合同续签在线发起（带原合同信息预填），续签审批通过后自动延长合同到期日并重置提醒周期。', status: 'backlog',     priority: 'low',    assignee: 'p03', project: 'supply', labels: ['缺陷'],              dueDate: '2026-10-05', createDate: '2026-09-22' },
  { id: 15, code: 'T1000015', title: '入库单批量打印', desc: '开发入库单批量打印功能：支持按日期范围、仓库、单据状态筛选入库单，勾选后一键批量打印。打印队列支持排序（按日期/单号/仓库），打印进度实时显示（已打印/总计）。支持打印份数设置和补打标记（避免重复打印浪费纸张）。已完成后端接口和筛选交互，正在开发打印队列渲染逻辑。', status: 'in_progress', priority: 'low',    assignee: 'p07', project: 'purchase', labels: ['需求'],              dueDate: '2026-09-30', createDate: '2026-09-21' },
  { id: 16, code: 'T1000016', title: '报表权限分级管控', desc: '配置报表查看权限分级管控体系：按角色（高管/部门主管/业务员）和部门维度控制报表可见范围。高管查看全公司汇总报表，部门主管仅看本部门明细，业务员仅看本人数据。支持行列级权限（隐藏敏感列如成本价、利润率）。权限变更需审批并记录日志。阻塞原因：权限矩阵需与集团统一身份认证中心联调，对方接口排期到下周。', status: 'blocked',     priority: 'urgent', assignee: 'p04', project: 'expense', labels: ['缺陷'],       dueDate: '2026-09-23', createDate: '2026-09-18' },
  { id: 17, code: 'T1000017', title: '采购退货流程开发', desc: '开发采购退货全流程：发起退货申请（选退货原因、填写退货数量、上传照片凭证）→退货审批（采购主管+质量主管双签）→生成退货出库单→库存回退（扣减入库数量、恢复可用库存）→财务退款处理（冲销应付账款）。退货原因分类：质量问题、规格不符、多发货、过期退货。支持退货明细行级部分退货。', status: 'backlog',     priority: 'high',   assignee: 'p01', project: 'purchase', labels: ['需求'],       dueDate: '2026-10-02', createDate: '2026-09-23' },
  { id: 18, code: 'T1000018', title: '供应商评分明细报表', desc: '开发供应商评分明细报表，展示每个供应商各维度评分明细及加权总分。支持多维度钻取：点击交货准时率可下钻到每笔订单的交货记录，点击质量合格率可下钻到每批次质检报告。报表支持导出 Excel 并附评分趋势图（近 6 期评分变化折线）。已完成后端查询逻辑，正在开发前端钻取交互。', status: 'in_review',  priority: 'medium', assignee: 'p03', project: 'supply', labels: ['缺陷'],     dueDate: '2026-09-27', createDate: '2026-09-20', parentId: 2 },
  { id: 19, code: 'T1000019', title: '入库扫码功能开发', desc: '开发 PDA 扫码入库功能：扫描采购订单条码自动带出待入库明细，扫描物料条码匹配明细行并填入实收数量。支持连续扫描模式（不跳转页面逐条扫描）。异常处理：扫码与订单不符时弹窗提示并阻止入库、实收大于应收时拦截。扫码完成后一键提交入库单并打印入库标签。已完成 PDA 端页面框架，正在对接扫码 SDK。', status: 'in_progress', priority: 'high',   assignee: 'p07', project: 'purchase', labels: ['需求'],        dueDate: '2026-09-29', createDate: '2026-09-22', parentId: 3 },
  { id: 20, code: 'T1000020', title: '财务凭证自动生成', desc: '配置采购入库自动生成财务凭证规则：入库单审核通过后自动生成借记"原材料"、贷记"应付账款"凭证；退货入库生成红字冲销凭证。凭证模板支持科目映射配置（按物料类别映射不同存货科目）、摘要模板自定义、辅助核算项自动填充。月结时批量校验凭证借贷平衡，异常凭证自动标记并通知会计处理。', status: 'done',        priority: 'medium', assignee: 'p22', project: 'expense', labels: ['缺陷'],     dueDate: '2026-09-12', createDate: '2026-09-06' },
  { id: 21, code: 'T1000021', title: '采购订单批量审批', desc: '开发采购订单批量审批功能：列表页支持勾选多张订单后点击"批量审批"，弹窗显示选中订单汇总信息（总金额、供应商数、明细行数）供确认。支持快捷键操作（Ctrl+A 全选、Enter 确认、Esc 取消）。批量审批限制：不同供应商订单不能混合审批、超过单笔审批限额的订单自动排除。审批结果汇总展示成功/失败条数。', status: 'backlog',     priority: 'medium', assignee: 'p02', project: 'purchase', labels: ['需求'],              dueDate: '2026-10-03', createDate: '2026-09-23' },
  { id: 22, code: 'T1000022', title: '供应商资质文件管理', desc: '开发供应商资质文件管理模块：支持营业执照、税务登记证、组织机构代码证、开户许可证、质量体系认证等文件的上传（PDF/图片，单文件<10MB）。OCR 自动识别证照关键字段（编号、有效期、经营范围）并入库。到期前 60 天自动提醒更新，过期文件标红冻结。支持文件版本管理，历史版本可追溯。', status: 'in_review',  priority: 'low',    assignee: 'p03', project: 'supply', labels: ['缺陷'],       dueDate: '2026-09-28', createDate: '2026-09-19' },
  { id: 23, code: 'T1000023', title: '入库库存预警看板', desc: '开发入库库存预警实时看板，适配仓库大屏展示（1920x1080 横屏）。看板分四个区域：今日入库概览（总单数/总数量/异常数）、库存水位监控（红黄绿三色预警图）、实时入库流水（滚动展示最新 20 条）、异常待处理清单。数据每 30 秒自动刷新，支持手动暂停刷新。已完成大屏 UI 框架，正在对接 WebSocket 实时推送。', status: 'in_progress', priority: 'urgent', assignee: 'p07', project: 'purchase', labels: ['需求'],     dueDate: '2026-09-24', createDate: '2026-09-21' },
  { id: 24, code: 'T1000024', title: '报表数据校验规则', desc: '配置报表数据完整性校验规则库：借贷平衡校验（差额=0）、科目编码规范校验（长度/层级/编码段）、必填项校验（摘要/日期/金额非空）、逻辑校验（资产=负债+权益）。校验不通过时自动生成异常清单并标记异常类型和行号，支持一键定位到原始凭证。校验规则支持自定义扩展，规则变更需审批。', status: 'backlog',     priority: 'medium', assignee: 'p05', project: 'expense', labels: ['缺陷'],       dueDate: '2026-10-01', createDate: '2026-09-22' },
  { id: 25, code: 'T1000025', title: '采购合同电子签署', desc: '对接第三方电子签署平台（e签宝），完成采购合同在线签署全流程：上传合同 PDF→设置签署方（乙方信息自动填充）→拖拽设置签署位置→发起签署→对方短信通知→签署完成回调。签署完成的合同自动归档并带数字签名水印。支持签署状态实时查询和签署日志导出。阻塞原因：e签宝测试环境密钥申请流程卡在法务审批。', status: 'blocked',     priority: 'high',   assignee: 'p01', project: 'purchase', labels: ['需求'],       dueDate: '2026-09-25', createDate: '2026-09-17' },
  { id: 26, code: 'T1000026', title: '供应商评级接口联调', desc: '供应商评级计算接口与前端联调测试：后端提供评级查询（按供应商/期间/维度）、评级明细钻取、评级趋势图数据三个接口。联调发现问题：钻取接口分页参数传递异常（已修复）、趋势图日期范围边界值返回空（已修复）、评级总分小数精度不一致（待修复）。需补充接口文档并更新 Mock 数据。', status: 'in_review',  priority: 'high',   assignee: 'p03', project: 'supply', labels: ['缺陷'],       dueDate: '2026-09-26', createDate: '2026-09-20', parentId: 2 },
  { id: 27, code: 'T1000027', title: '入库上架指引开发', desc: '开发入库上架指引页面：扫描物料条码后系统自动推荐上架库位，推荐算法基于就近原则（优先同品属相邻库位）+分散存储策略（同批次拆分到不同货架降低风险）。指引页面显示推荐库位平面图（高亮目标货架）、搬运路径规划。支持人工修改库位，修改时校验该库位容量和承重限制。', status: 'in_progress', priority: 'low',    assignee: 'p07', project: 'purchase', labels: ['需求'],     dueDate: '2026-10-04', createDate: '2026-09-22', parentId: 3 },
  { id: 28, code: 'T1000028', title: '财务对账自动化', desc: '开发采购与财务自动对账功能：按采购订单维度自动匹配采购入库记录与财务付款记录，匹配规则：订单号+金额完全一致自动匹配、金额差异<100元标记为"小额差异"待人工确认、差异>100元标记为"异常"。对账结果生成差异明细表，支持导出 Excel 和批量处理（确认/退回/挂账）。已上线运行，月均处理对账记录 3000+条。', status: 'done',        priority: 'medium', assignee: 'p22', project: 'expense', labels: ['缺陷'],     dueDate: '2026-09-10', createDate: '2026-09-04' },
  { id: 29, code: 'T1000029', title: '采购询价比价功能', desc: '开发采购询价比价模块：发起询价时自动拉取同物料历史采购价作为基准价参考，支持同时向多家供应商发起询价（邮件/站内消息）。供应商报价回收后自动生成比价矩阵表（含报价、交期、最小起订量、付款条件），按综合成本最低推荐中标供应商。支持询价单转采购订单一键创建。', status: 'backlog',     priority: 'medium', assignee: 'p02', project: 'purchase', labels: ['需求'],     dueDate: '2026-10-06', createDate: '2026-09-23' },
  { id: 30, code: 'T1000030', title: '供应商绩效月报', desc: '配置供应商绩效月报自动生成和推送：每月 3 日自动生成上月供应商绩效报告，内容包括交货准时率排行、质量异常 TOP10、价格波动分析、合作金额统计。报告以 PDF 附件形式邮件推送至采购总监和各品类采购经理，同时在系统中归档可在线查阅。支持订阅特定供应商的绩效月报。', status: 'in_review',  priority: 'low',    assignee: 'p03', project: 'supply', labels: ['缺陷'],        dueDate: '2026-09-29', createDate: '2026-09-19' },
  { id: 31, code: 'T1000031', title: '入库盘点任务管理', desc: '开发入库盘点任务全流程管理：创建盘点计划（选择仓库/品类/盘点日期）→系统生成盘点清单（自动带出账面库存）→分配盘点人→PDA 扫码盘点录入实盘数量→系统自动计算盘盈盘亏→生成盘点差异报告→差异审批处理（盘亏需追究责任）→调整库存账面。支持盲盘（不显示账面数量）和明盘两种模式。', status: 'in_progress', priority: 'medium', assignee: 'p07', project: 'purchase', labels: ['需求'],       dueDate: '2026-09-30', createDate: '2026-09-21' },
  { id: 32, code: 'T1000032', title: '报表订阅推送配置', desc: '配置报表定时订阅推送功能：用户可订阅任意报表并设置推送规则（每日/每周/每月、推送时间、收件人、格式 PDF/Excel）。推送渠道支持邮件附件、站内消息链接、企业微信卡片三种。订阅管理页面展示所有订阅列表，支持暂停/恢复/删除。已实现订阅创建和邮件推送通道，企业微信通道待对接。', status: 'backlog',     priority: 'low',    assignee: 'p04', project: 'expense', labels: ['缺陷'],       dueDate: '2026-10-08', createDate: '2026-09-22' },
  { id: 33, code: 'T1000033', title: '生产工单排程引擎开发', desc: '开发生产工单排程引擎，基于工序工时、设备产能和交期约束自动生成最优排产计划。支持手动拖拽调整排程甘特图，调整后自动重算后续工序时间。排程冲突（设备占用、人员重叠）时高亮提示并给出替代方案。已完成排程算法核心逻辑，正在开发甘特图交互组件。', status: 'in_progress', priority: 'high',   assignee: 'p01', project: 'production', labels: ['需求'],     dueDate: '2026-09-28', createDate: '2026-09-21' },
  { id: 34, code: 'T1000034', title: '工序流转状态机设计', desc: '设计工序流转状态机：待开工→开工→首检→工序加工→完工检验→流转下一工序。支持并行工序和可选工序分支。状态变更自动记录操作人、时间和设备编号。异常状态（返工、报废、让步接收）走独立流转分支，需质量主管审批后才能继续。已完成状态机UML设计文档，待架构评审。', status: 'in_review',  priority: 'medium', assignee: 'p03', project: 'production', labels: ['缺陷'],        dueDate: '2026-09-26', createDate: '2026-09-19' },
  { id: 35, code: 'T1000035', title: '产能利用率看板开发', desc: '开发车间产能利用率实时看板：按产线/设备/班组维度展示当日产能、实际产出、利用率（绿>85%正常/黄70-85%关注/红<70%预警）。看板支持班次切换查看历史对比，自动生成产能趋势曲线（近30天）。低于阈值时推送告警给车间主任。已完成后端聚合查询，正在对接前端图表。', status: 'backlog',     priority: 'medium', assignee: 'p04', project: 'production', labels: ['需求'],     dueDate: '2026-10-02', createDate: '2026-09-22' },
  { id: 36, code: 'T1000036', title: '生产报工扫码功能', desc: '开发车间PDA扫码报工功能：扫描工单条码自动带出工序列表，选择当前工序后扫描设备码确认开工。完工时扫描物料批次号关联产出批次，输入完工数量和不合格数量。支持离线报工缓存，联网后自动同步。已完成PDA端页面开发，正在对接扫码SDK和离线缓存方案。', status: 'in_progress', priority: 'high',   assignee: 'p07', project: 'production', labels: ['缺陷'],        dueDate: '2026-09-30', createDate: '2026-09-21' },
  { id: 37, code: 'T1000037', title: '质量追溯数据链路', desc: '搭建产品质量全链路追溯：从原材料批次（供应商/入库/检验）→生产工序（设备/人员/参数）→完工检验→成品入库→发货记录，全链路数据关联并可正反向追溯。输入成品序列号即可查看完整生产履历。追溯数据支持导出PDF质量证明书。已上线试运行，覆盖3条核心产线。', status: 'done',        priority: 'low',    assignee: 'p22', project: 'production', labels: ['需求'],     dueDate: '2026-09-15', createDate: '2026-09-08' },
  { id: 38, code: 'T1000038', title: '工单自动派单算法', desc: '开发工单自动派单算法：按技能标签匹配工程师（Java/前端/运维），叠加当前负载权重（处理中工单数）和SLA优先级（紧急工单插队）。支持手动指派覆盖自动分配结果，手动指派记录操作日志。派单后自动推送企微通知，30分钟未响应自动转派。算法方案已评审，正在编码实现。', status: 'in_review',  priority: 'urgent', assignee: 'p03', project: 'service', labels: ['缺陷'],        dueDate: '2026-09-25', createDate: '2026-09-20' },
  { id: 39, code: 'T1000039', title: '多渠道工单接入层', desc: '开发多渠道工单接入层：统一接入企业微信、邮件、电话录音转写、官网表单四个渠道的工单。各渠道消息格式归一化为标准工单结构（标题/描述/紧急程度/联系人/来源渠道）。邮件渠道支持附件提取并关联到工单。已完成企微和邮件渠道对接，电话和官网渠道待开发。', status: 'in_progress', priority: 'high',   assignee: 'p01', project: 'service', labels: ['需求'],        dueDate: '2026-09-29', createDate: '2026-09-21' },
  { id: 40, code: 'T1000040', title: 'SLA倒计时监控', desc: '开发工单SLA倒计时监控：按工单优先级配置响应时效（紧急30分/高2时/中4时/低8时）和解决时效（紧急4时/高8时/中24时/低48时）。超时前15分钟黄色预警，超时后红色告警并自动升级优先级。看板展示所有倒计时工单，按剩余时间排序。阻塞原因：SLA规则引擎依赖的定时调度服务集群扩容审批中。', status: 'blocked',     priority: 'high',   assignee: 'p22', project: 'service', labels: ['缺陷'],     dueDate: '2026-09-26', createDate: '2026-09-18' },
  { id: 41, code: 'T1000041', title: '客户满意度评价页', desc: '开发工单关闭后的客户满意度评价页面：1-5星评分+标签快选（响应快/专业/耐心/已解决）+可选文字评价。评价链接随工单关闭通知短信/邮件发送。低于3星的工单自动标记并推送至客服主管，触发回访流程。已完成评价页UI和提交接口，正在对接通知推送。', status: 'backlog',     priority: 'low',    assignee: 'p04', project: 'service', labels: ['需求'],     dueDate: '2026-10-05', createDate: '2026-09-23' },
  { id: 42, code: 'T1000042', title: '工单批量导出功能', desc: '开发工单批量导出功能：支持按时间范围、渠道、状态、处理人筛选后一键导出 Excel。导出字段可配置（默认含工单号/标题/状态/优先级/处理人/创建时间/关闭时间/满意度），导出数据量上限 5 万条。已上线使用，日均导出 30+ 次。', status: 'done',        priority: 'medium', assignee: 'p05', project: 'service', labels: ['缺陷'],        dueDate: '2026-09-12', createDate: '2026-09-06' },
  { id: 43, code: 'T1000043', title: '人效指标体系搭建', desc: '搭建人力效能指标体系：人均产值（总产值/在职人数）、人均利润、单位人工成本产出、加班占比、核心岗位流失率。指标按部门/团队/个人三级下钻，支持同比环比对比。指标定义文档已通过HR部门评审，正在开发指标计算逻辑和落库方案。', status: 'in_review',  priority: 'high',   assignee: 'p04', project: 'hr-analytics', labels: ['需求'],     dueDate: '2026-09-27', createDate: '2026-09-20' },
  { id: 44, code: 'T1000044', title: '组织画像可视化看板', desc: '开发组织画像可视化看板：部门人数分布树状图、学历分布饼图、年龄结构柱状图、司龄分布、职级分布。支持按部门筛选和层级下钻。看板顶部展示组织健康度综合评分（结构合理性+人才密度+流动率）。已完成前端框架和数据接口对接，正在开发下钻交互。', status: 'in_progress', priority: 'medium', assignee: 'p01', project: 'hr-analytics', labels: ['缺陷'],     dueDate: '2026-09-30', createDate: '2026-09-22' },
  { id: 45, code: 'T1000045', title: '离职风险预测模型', desc: '开发员工离职风险预测模型：特征工程包含司龄、调薪间隔、加班时长趋势、请假天数变化、绩效评分变化、直属主管离职率等12个维度。采用梯度提升树算法，输出离职概率分档（高>70%/中30-70%/低<30%）。高险人员自动推送给HRBP，附风险因子贡献度。模型方案设计中。', status: 'backlog',     priority: 'urgent', assignee: 'p03', project: 'hr-analytics', labels: ['需求'],     dueDate: '2026-09-25', createDate: '2026-09-23' },
  { id: 46, code: 'T1000046', title: '人力数据ETL管道', desc: '搭建人力数据ETL管道：从HR系统（花名册/考勤/薪酬/绩效）定时抽取数据，经清洗转换后落入分析数仓。增量抽取频率每日凌晨2点，全量补数据支持手动触发。字段映射规则可配置，异常数据（空值/越界/编码不匹配）进入待确认队列。阻塞原因：HR系统开放API排期到下月。', status: 'blocked',     priority: 'high',   assignee: 'p22', project: 'hr-analytics', labels: ['缺陷'],       dueDate: '2026-09-28', createDate: '2026-09-18' },
  { id: 47, code: 'T1000047', title: '考勤数据自动汇总', desc: '配置考勤数据自动汇总定时任务：每日凌晨从考勤机系统拉取打卡记录，按排班规则自动计算迟到/早退/缺卡/加班时长，生成日考勤汇总。异常打卡（缺班/连续迟到3天）自动推送部门主管。月度汇总次月3日生成，支持导出 Excel 考勤月报。已上线运行。', status: 'done',        priority: 'low',    assignee: 'p05', project: 'hr-analytics', labels: ['需求'],       dueDate: '2026-09-10', createDate: '2026-09-04' },
  { id: 48, code: 'T1000048', title: '库位动态优化算法', desc: '开发库位动态优化算法：基于ABC分类（高频出入库A类就近/低频C类远端）+批次亲和性（同物料集中存放）+承重均衡三大策略，自动推荐货物上架库位。每周生成库位调整建议清单，支持一键执行调整（系统自动打印搬移标签）。算法模型已通过模拟验证，正在对接WMS库位数据。', status: 'in_progress', priority: 'high',   assignee: 'p03', project: 'warehouse', labels: ['缺陷'],     dueDate: '2026-09-28', createDate: '2026-09-21' },
  { id: 49, code: 'T1000049', title: '扫码出入库PDA开发', desc: '开发仓储PDA扫码出入库功能：入库时扫描采购订单→扫描物料条码→输入实收数量→系统校验订单明细匹配→确认入库并打印库位标签。出库时扫描领料单→推荐拣货库位→扫码确认拣货→更新库存。支持连续扫码模式和离线缓存。已完成PDA端框架和入库流程，出库扫码待开发。', status: 'in_review',  priority: 'urgent', assignee: 'p07', project: 'warehouse', labels: ['需求'],        dueDate: '2026-09-25', createDate: '2026-09-19' },
  { id: 50, code: 'T1000050', title: '库存实时预警引擎', desc: '开发库存实时预警引擎：监控安全库存阈值（低于安全线黄色/为零红色）、库龄超期（>180天橙色/>365天红色）、呆滞料识别（无动销>90天标记）。预警事件推送至仓储主管和对应采购员，同时在看板滚动展示。引擎已部署，正在调试阈值参数和推送频率。', status: 'in_progress', priority: 'high',   assignee: 'p01', project: 'warehouse', labels: ['缺陷'],        dueDate: '2026-09-29', createDate: '2026-09-20' },
  { id: 51, code: 'T1000051', title: '库龄分析与呆滞料识别', desc: '开发库龄分析与呆滞料识别报表：按物料维度展示入库日期、库龄天数、库龄分布直方图。呆滞料识别规则：90天无动销预警、180天冻结采购建议、365天启动清仓处理。报表支持按仓库/品类/供应商筛选，自动计算呆滞金额占比。已完成后端分析逻辑。', status: 'backlog',     priority: 'medium', assignee: 'p02', project: 'warehouse', labels: ['需求'],     dueDate: '2026-10-03', createDate: '2026-09-22' },
  { id: 52, code: 'T1000052', title: '仓储大屏可视化', desc: '开发仓储运营大屏（1920x1080横屏）：四区布局——今日出入库概览（单数/数量/异常）、库存水位热力图（按库区色温展示利用率）、实时出入库流水滚动、预警待处理清单。数据每15秒自动刷新，支持暂停。已上线部署在仓库入口大屏，日均运行稳定。', status: 'done',        priority: 'low',    assignee: 'p04', project: 'warehouse', labels: ['缺陷'],     dueDate: '2026-09-14', createDate: '2026-09-07' },
  { id: 73, code: 'T1000073', title: '采购合同电子签章需求梳理', desc: '梳理采购合同电子签章的适用单据、签署顺序、证书校验和归档范围；待法务确认签章主体与验收边界后，再安排专家团评估和实施。', status: 'planned', priority: 'medium', assignee: 'p02', project: 'purchase', labels: ['需求'], dueDate: '2026-10-12', createDate: '2026-09-24' },
  { id: 74, code: 'T1000074', title: '旧版工单短信模板迁移', desc: '原计划将旧版工单短信模板迁移到新通知中心；因模板已被统一消息服务替代，项目负责人取消该项工作并保留任务记录供追溯。', status: 'cancelled', priority: 'low', assignee: 'p04', project: 'service', labels: ['缺陷'], dueDate: '2026-09-30', createDate: '2026-09-20' },
];

/* 将吴晓峰项目已有的演示任务接入当前任务管理列表。 */
const LINGEE_TASK_STATUSES = {
  '未开始': 'backlog', '待办': 'backlog', '进行中': 'in_progress',
  '待评审': 'in_review', '审核中': 'in_review', '已完成': 'done', '已失败': 'blocked', '已阻塞': 'blocked',
};
const LINGEE_TASK_PRIORITIES = { '高': 'high', '中': 'medium', '低': 'low' };
function tkConvertCvTasks(projectId, startId) {
  var modules = new Map(CV_TASKS.filter(function (task) {
    return task.project === projectId && task.kind === 'epic';
  }).map(function (task) { return [task.boardId, { name: task.title, priority: task.priority }]; }));
  var owner = CV_PROJECTS.find(function (p) { return p.id === projectId; });
  var ownerId = owner ? (CV_MEMBERS.find(function (m) { return m.name === owner.owner; }) || {}).id || '' : '';
  return CV_TASKS.filter(function (task) {
    return task.project === projectId && task.kind !== 'epic';
  }).map(function (task, index) {
    var id = startId + index;
    var assignee = CV_MEMBERS.find(function (person) { return person.name === task.assignee; });
    var module = modules.get(task.parentTaskId);
    var dueDate = new Date(Date.UTC(2026, 9, 5 + index));
    return {
      id: id, code: 'T' + String(1000000 + id), title: task.title, desc: task.desc || '',
      status: LINGEE_TASK_STATUSES[task.status] || 'backlog',
      priority: LINGEE_TASK_PRIORITIES[task.priority || module?.priority] || 'medium',
      assignee: assignee?.id || ownerId || 'p23', createdBy: ownerId || 'p23', project: projectId,
      labels: task.type === 'Bug' ? ['缺陷'] : ['需求'],
      createDate: '2026-09-' + String(10 + index % 10).padStart(2, '0'),
      dueDate: dueDate.toISOString().slice(0, 10),
    };
  });
}
TK_TASKS.push(...tkConvertCvTasks('lingee-prototype', 53).slice(0, 20));
TK_TASKS.push(...tkConvertCvTasks('cosmic-app-dev', 75));

/* ---------- 工具函数：根据 id 查名称 ---------- */
export function tkGetStatusName(id) {
  var s = TK_STATUSES.find(function (x) { return x.id === id; });
  return s ? s.name : id;
}
export function tkGetPriorityName(id) {
  var p = TK_PRIORITIES.find(function (x) { return x.id === id; });
  return p ? p.name : id;
}
export function tkGetPerson(id) {
  var p = TK_PEOPLE.find(function (x) { return x.id === id; });
  if (p) return p;
  var member = CV_MEMBERS.find(function (x) { return x.id === id; });
  return member ? { id:member.id, name:member.name, avatar:member.name.slice(0, 1), color:'#495dff' } : { id: id, name: '未分配', avatar: '?', color: '#b8b8b8' };
}
export function tkGetProjectName(id) {
  var p = TK_PROJECTS.find(function (x) { return x.id === id; });
  return p ? p.name : id;
}
export function tkGetStatusObj(id) {
  return TK_STATUSES.find(function (x) { return x.id === id; }) || {};
}
export function tkGetPriorityObj(id) {
  return TK_PRIORITIES.find(function (x) { return x.id === id; }) || {};
}

/* ---------- 可变状态（原型用内存数组，支持增删改） ---------- */
/* 示例运行停在不同交付阶段；审核中表示该阶段运行已结束，等待人工确认。 */
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
var _tasks = TK_TASKS.map(function (t) {
  var people = tkPeopleInProject(t.project).filter(function (person) { return TK_DEMO_PERSON_IDS.includes(person.id); });
  return Object.assign({
    initialStatus:t.status,
    executionStageId:['in_progress','in_review','blocked'].includes(t.status)
      ? DEMO_TASK_STAGE[t.id] || DEMO_EXECUTION_STAGES[t.id % DEMO_EXECUTION_STAGES.length]
      : null,
    createdBy: t.project === 'expense' && t.id % 4 === 0 ? 'p22' : (people[(t.id + 1) % people.length]?.id || tkCurrentUserId()),
    createdAt: t.createDate + ' 09:30',
    updatedAt: t.createDate + ' 10:15',
    reviewReport: createDemoReviewReport(t),
    blockedRun: createDemoBlockedRun(t),
    completedRun: createDemoCompletedRun(t),
  }, t);
});
var _views = TK_VIEWS.map(function (v) { return Object.assign({}, v); });
try {
  var storedViews = JSON.parse(localStorage.getItem('lingee_tasks_custom_views') || '[]');
  if (Array.isArray(storedViews)) _views = _views.concat(storedViews.filter(function (v) { return v && typeof v.id === 'string' && typeof v.name === 'string' && !v.builtin; }));
} catch (e) { /* 本地存储不可用时仍可在当前页面管理视图 */ }
var _nextId = Math.max(...TK_TASKS.map(function (task) { return task.id; })) + 1;
var _nextViewId = Math.max(4, ..._views.map(function (v) {
  var number = Number(v.id.slice(1));
  return v.id.charAt(0) === 'v' && Number.isInteger(number) ? number + 1 : 0;
}));
function persistViews() {
  try { localStorage.setItem('lingee_tasks_custom_views', JSON.stringify(_views.filter(function (v) { return !v.builtin; }))); }
  catch (e) { /* 本地存储不可用时保留内存中的视图 */ }
}

export function tkGetTasks() { return _tasks; }
export function tkSetTasks(arr) { _tasks = arr; }
export function tkPruneOrphanTasks() {
  var projects=new Set(CV_PROJECTS.map(function(project){return project.id;}));
  _tasks=_tasks.filter(function(task){return projects.has(task.project);});
}
export function tkEnsureWorkspaceDemoTasks() {
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
export function tkAddTask(task) {
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
  return task;
}
export function tkUpdateTask(id, patch) {
  var t = _tasks.find(function (x) { return x.id === id; });
  if (t) {
    var before = { status:t.status, priority:t.priority, assignee:t.assignee, dueDate:t.dueDate, comments:(t.comments || []).length };
    if (patch.status && patch.status !== t.status) {
      t.statusHistory = (t.statusHistory || []).concat({
        from:t.status, to:patch.status, authorId:tkCurrentUserId(), time:taskMinuteNow(),
      });
    }
    Object.assign(t, patch, { updatedAt: taskMinuteNow() });
    if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('lingee:task-updated', { detail:{ task:t, before:before, patch:patch } }));
  }
  return t;
}
export function tkDeleteTask(id) {
  _tasks = _tasks.filter(function (x) { return x.id !== id; });
}
export function tkGetViews() { return _views; }
export function tkAddView(name, config) {
  var v = Object.assign({ id: 'v' + _nextViewId++, name: name, scope: 'all', builtin: false }, config || {});
  _views.push(v);
  persistViews();
  return v;
}
export function tkDeleteView(id) {
  _views = _views.filter(function (v) { return v.id !== id; });
  persistViews();
}
export function tkRenameView(id, name) {
  var v = _views.find(function (x) { return x.id === id; });
  if (v) { v.name = name; persistViews(); }
}
