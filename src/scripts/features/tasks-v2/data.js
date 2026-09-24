/* 任务管理 v2 —— 模拟数据与状态
   纯前端原型，所有数据本地维护。 */

/* ---------- 常量定义 ---------- */
export const TK_STATUSES = [
  { id: 'planned',     name: '待规划', color: 'gray'   },
  { id: 'backlog',     name: '待办',   color: 'gray'   },
  { id: 'in_progress', name: '进行中', color: 'orange' },
  { id: 'in_review',  name: '审核中', color: 'green'  },
  { id: 'blocked',   name: '已阻塞', color: 'red'    },
  { id: 'done',       name: '已完成', color: 'blue'   },
  { id: 'cancelled',  name: '已取消', color: 'gray'   },
];

export const TK_PRIORITIES = [
  { id: 'urgent', name: '紧急', color: 'red'    },
  { id: 'high',   name: '高',   color: 'orange' },
  { id: 'medium', name: '中',   color: 'blue'   },
  { id: 'low',    name: '低',   color: 'gray'   },
];

export const TK_PEOPLE = [
  { id: 'u1', name: 'Joe',    avatar: 'J', color: '#495dff' },
  { id: 'u2', name: 'Alice',  avatar: 'A', color: '#e04a3a' },
  { id: 'u3', name: 'Bob',    avatar: 'B', color: '#08a040' },
  { id: 'u4', name: 'Carol',  avatar: 'C', color: '#c06010' },
  { id: 'u5', name: 'David',  avatar: 'D', color: '#7858f9' },
  { id: 'u6', name: 'Eve',    avatar: 'E', color: '#0891b2' },
];

export const TK_AGENTS = [
  { id: 'a1', name: '代码审查专家', avatar: 'C', color: '#495dff' },
  { id: 'a2', name: '需求分析专家', avatar: 'R', color: '#08a040' },
  { id: 'a3', name: '测试验证专家', avatar: 'T', color: '#ff8d42' },
];

export const TK_PROJECTS = [
  { id: 'p1', name: '采购订单管理' },
  { id: 'p2', name: '供应商评级系统' },
  { id: 'p3', name: '入库流程优化' },
  { id: 'p4', name: '财务报表重构' },
];

export const TK_LABELS = ['前端', '后端', '数据库', 'UI设计', '接口', '测试', '文档', '安全'];

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
  var productPerson = tkGetPerson('u2').name;
  var devPerson = tkGetPerson('u1').name;
  var archPerson = tkGetPerson('u5').name;
  var testPerson = tkGetPerson('u4').name;
  return [
    { id:'requirements', type:'需求文档', summary:'业务目标、使用场景与验收标准', date: dateTimeAfter(0, '14:30'), author: productPerson, sections:[
      { heading:'目标', text:'围绕"' + title + '"明确要解决的问题、目标用户和交付范围。' },
      { heading:'使用场景', text:'梳理在"' + project + '"项目中的入口、主要操作路径与异常场景。' },
      { heading:'验收标准', text:'功能流程可完整走通；关键字段和状态有明确反馈；异常输入有提示与恢复方式。' },
    ] },
    { id:'technical', type:'技术文档', summary:'实现方案、接口约定与异常处理', date: dateTimeAfter(1, '10:15'), author: devPerson, sections:[
      { heading:'实现方案', text:'按界面、业务逻辑和数据访问拆分"' + title + '"的实现步骤。' },
      { heading:'接口约定', text:'列出输入参数、返回字段、状态码及空数据处理方式，并标注待确认项。' },
      { heading:'异常处理', text:'覆盖加载失败、重复提交、权限不足和网络中断等常见情况。' },
    ] },
    { id:'architecture', type:'架构设计', summary:'模块边界、数据流与依赖关系', date: dateTimeAfter(2, '16:00'), author: archPerson, sections:[
      { heading:'模块边界', text:'"' + title + '"由展示层、任务处理层和项目数据层协作完成。' },
      { heading:'数据流', text:'用户操作 → 参数校验 → 业务处理 → 结果更新 → 界面反馈。' },
      { heading:'依赖与风险', text:'依赖"' + project + '"的数据定义；跨模块字段与状态流转需在联调前确认。' },
    ] },
    { id:'prototype', type:'原型图', summary:'页面布局、关键状态与交互说明', date: dateTimeAfter(3, '11:20'), author: productPerson, sections:[
      { heading:'页面结构', text:'包含任务入口、主要内容区、操作区和结果反馈区。' },
      { heading:'交互流程', text:'从任务列表进入"' + title + '"，完成查看、编辑与结果确认。' },
      { heading:'界面状态', text:'覆盖默认、加载、空数据、错误和操作成功等状态。' },
    ] },
    { id:'test', type:'测试报告', summary:'测试范围、测试用例与待验证项', date: dateTimeAfter(4, '17:45'), author: testPerson, sections:[
      { heading:'测试范围', text:'覆盖"' + title + '"的主流程、边界输入与异常恢复。' },
      { heading:'测试用例', text:'正常提交、必填缺失、重复操作、无权限访问和接口失败。' },
      { heading:'待验证项', text:'功能实现与接口联调后，核对各用例结果及异常恢复流程。' },
    ] },
  ];
}

/* ---------- 视图配置 ---------- */
export const TK_VIEWS = [
  { id: 'all',        name: '全部',    scope: 'all',       builtin: true },
  { id: 'members',    name: '我负责',  scope: 'my_assigned', builtin: true },
  { id: 'agents',     name: '我创建',  scope: 'my_created',  builtin: true },
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
  { id: 1,  code: 'T1000001', title: '采购订单列表页开发', desc: '完成采购订单列表页的前端开发，包含多条件筛选（供应商、日期范围、订单状态）、分页加载、批量导出 Excel。列表需支持列排序、列宽拖拽调整、固定表头。筛选区域可折叠保存，表格行右键支持快捷操作菜单（查看详情、复制订单、打印）。接口对接后端分页查询 API，需处理 loading 态和空数据态。', status: 'in_progress', priority: 'high',   assignee: 'u1', project: 'p1', labels: ['前端','UI设计'],     dueDate: '2026-09-25', createDate: '2026-09-20' },
  { id: 2,  code: 'T1000002', title: '供应商评级模型设计', desc: '设计供应商多维度评级算法，覆盖交货准时率（30%）、质量合格率（25%）、价格竞争力（20%）、服务响应速度（15%）、合作年限（10%）五个维度。支持权重动态配置与评级周期自定义（月度/季度/年度）。评级结果分 A/B/C/D 四档，自动生成评级报告并推送至采购负责人。需输出算法设计文档、数据库表结构设计、评级计算存储过程。', status: 'in_review',  priority: 'urgent', assignee: 'u2', project: 'p2', labels: ['后端','数据库'],     dueDate: '2026-09-24', createDate: '2026-09-18' },
  { id: 3,  code: 'T1000003', title: '入库单审批流程配置', desc: '配置入库单的多级审批流程：仓管员提交→库管主管初审（金额<1万）→采购经理复审（1万-10万）→财务总监终审（>10万）。支持金额阈值自动路由、审批人代理设置（请假/出差）、审批超时自动催办（24小时未处理）。审批节点支持自定义表单字段（审批意见、附件、签字）。需与工作流引擎对接，审批记录可追溯。', status: 'backlog',     priority: 'medium', assignee: 'u3', project: 'p3', labels: ['后端'],              dueDate: '2026-09-28', createDate: '2026-09-22' },
  { id: 4,  code: 'T1000004', title: '财务报表数据源对接', desc: '对接 ERP 总账数据源，实现资产负债表、利润表、现金流量表的实时数据同步。需处理多账套合并取数、币种折算、期初期末结转等场景。接口采用定时增量拉取+手动全量刷新双模式，数据落库前做完整性校验（借贷平衡、科目编码规范）。阻塞原因：ERP 测试环境账套数据不完整，需协调运维补数。', status: 'blocked',     priority: 'high',   assignee: 'u4', project: 'p4', labels: ['后端','接口'],        dueDate: '2026-09-26', createDate: '2026-09-19' },
  { id: 5,  code: 'T1000005', title: '采购订单详情页交互', desc: '完成采购订单详情页全部交互逻辑：订单基本信息展示、明细行增删改、金额自动计算（含税/不含税切换）、状态流转时间轴、附件预览（PDF/图片在线预览）、操作日志。支持订单复制创建、变更对比（标红变更字段）、打印预览。底部评论区域支持 @ 提及人员并推送通知。', status: 'in_progress', priority: 'medium', assignee: 'u1', project: 'p1', labels: ['前端'],              dueDate: '2026-09-27', createDate: '2026-09-21', parentId: 1 },
  { id: 6,  code: 'T1000006', title: '供应商黑白名单管理', desc: '开发供应商黑白名单管理功能：支持单条录入与 Excel 批量导入（含模板下载、数据校验、导入预览）。黑名单供应商自动拦截采购下单并弹窗提示原因；白名单供应商享受绿色通道（免审批、优先付款）。名单变更需审批，变更记录可追溯。已通过测试验收并上线运行。', status: 'done',        priority: 'low',    assignee: 'u5', project: 'p2', labels: ['后端','测试'],        dueDate: '2026-09-15', createDate: '2026-09-10' },
  { id: 7,  code: 'T1000007', title: '入库质检标准配置', desc: '按品类配置入库质检标准和抽检比例：原材料类全检（外观+尺寸+批次），标准件类按 AQL 2.5 抽检，辅料类免检。质检项目包含外观、尺寸、重量、性能指标，不合格项支持退货/让步接收/返工处理。质检结果自动关联入库单状态，不合格自动冻结入库流程并通知采购。', status: 'backlog',     priority: 'medium', assignee: 'u3', project: 'p3', labels: ['数据库'],            dueDate: '2026-09-30', createDate: '2026-09-22' },
  { id: 8,  code: 'T1000008', title: '报表导出性能优化', desc: '优化大数据量报表导出性能，当前 10 万行导出耗时 28 秒，目标降至 3 秒内。优化方案：1. 查询层加索引+分页游标读取；2. 内存层用流式写入替代全量缓存；3. 输出层异步生成文件+进度条反馈；4. 引入 Redis 缓存高频报表模板。已完成查询优化和流式写入，正在对接前端进度条组件。', status: 'in_progress', priority: 'high',   assignee: 'u4', project: 'p4', labels: ['后端','数据库'],     dueDate: '2026-09-29', createDate: '2026-09-20' },
  { id: 9,  code: 'T1000009', title: '采购订单打印模板', desc: '设计并开发采购订单打印模板，支持自定义字段配置（公司信息、签章位置、明细列显示/隐藏）。模板支持 A4/热敏两种纸张规格，打印时自动分页并带页眉页脚（页码、打印时间、制单人）。支持批量打印（按日期范围筛选）。已完成模板设计稿评审，正在开发模板渲染引擎。', status: 'in_review',  priority: 'low',    assignee: 'u6', project: 'p1', labels: ['前端','UI设计'],     dueDate: '2026-09-25', createDate: '2026-09-19', parentId: 1 },
  { id: 10, code: 'T1000010', title: '供应商准入审核流程', desc: '配置供应商准入资质审核全流程：基础信息录入→营业执照OCR校验→资质文件上传（营业执照、税务登记、开户许可、质量体系认证）→风控核查（司法风险、信用黑名单）→采购初审→风控复审→管理层审批。资质文件支持 OCR 自动识别关键字段并填充，风控数据对接第三方征信接口。审核通过自动创建供应商档案。', status: 'backlog',     priority: 'urgent', assignee: 'u2', project: 'p2', labels: ['后端','安全'],       dueDate: '2026-09-24', createDate: '2026-09-23' },
  { id: 11, code: 'T1000011', title: '入库异常预警机制', desc: '开发入库异常自动预警系统，监控维度：库存超上限/低于安全库存、保质期临期（剩余<30天黄色/15天橙色/7天红色）、批次号重复、规格与采购订单不符。预警通过站内消息+邮件双通道推送至仓管员和采购员。看板页面实时滚动展示异常清单，支持标记已处理/忽略。', status: 'in_progress', priority: 'high',   assignee: 'u3', project: 'p3', labels: ['后端','接口'],        dueDate: '2026-09-28', createDate: '2026-09-21' },
  { id: 12, code: 'T1000012', title: '财务月报自动生成', desc: '配置月度财务报表自动生成定时任务：每月 1 日凌晨 2:00 自动拉取上月凭证数据，生成资产负债表、利润表、费用明细表、应收应付账龄分析表。报表导出 PDF 并推送至财务群邮件组，同时在系统中创建月报归档记录。支持手动触发补生成和自定义报表期间。', status: 'done',        priority: 'medium', assignee: 'u4', project: 'p4', labels: ['后端','文档'],       dueDate: '2026-09-14', createDate: '2026-09-08' },
  { id: 13, code: 'T1000013', title: '采购价格比对看板', desc: '开发采购价格历史比对看板，展示同一物料近 12 个月采购价格趋势曲线，标注最高/最低/均价。支持多供应商横向比价（柱状图+表格双视图）。价格异常波动（偏离均价±15%）自动标红并推送预警。看板支持按物料分类、供应商、采购员筛选。已完成前端组件开发，正在对接数据接口。', status: 'in_review',  priority: 'medium', assignee: 'u1', project: 'p1', labels: ['前端','UI设计'],     dueDate: '2026-09-26', createDate: '2026-09-20' },
  { id: 14, code: 'T1000014', title: '供应商合同到期提醒', desc: '配置供应商合同到期自动提醒机制：到期前 90/60/30/15/7 天分五级递进提醒，提醒方式从站内消息逐步升级至邮件+短信。提醒对象为合同签约人和对应采购员。支持合同续签在线发起（带原合同信息预填），续签审批通过后自动延长合同到期日并重置提醒周期。', status: 'backlog',     priority: 'low',    assignee: 'u5', project: 'p2', labels: ['后端'],              dueDate: '2026-10-05', createDate: '2026-09-22' },
  { id: 15, code: 'T1000015', title: '入库单批量打印', desc: '开发入库单批量打印功能：支持按日期范围、仓库、单据状态筛选入库单，勾选后一键批量打印。打印队列支持排序（按日期/单号/仓库），打印进度实时显示（已打印/总计）。支持打印份数设置和补打标记（避免重复打印浪费纸张）。已完成后端接口和筛选交互，正在开发打印队列渲染逻辑。', status: 'in_progress', priority: 'low',    assignee: 'u6', project: 'p3', labels: ['前端'],              dueDate: '2026-09-30', createDate: '2026-09-21' },
  { id: 16, code: 'T1000016', title: '报表权限分级管控', desc: '配置报表查看权限分级管控体系：按角色（高管/部门主管/业务员）和部门维度控制报表可见范围。高管查看全公司汇总报表，部门主管仅看本部门明细，业务员仅看本人数据。支持行列级权限（隐藏敏感列如成本价、利润率）。权限变更需审批并记录日志。阻塞原因：权限矩阵需与集团统一身份认证中心联调，对方接口排期到下周。', status: 'blocked',     priority: 'urgent', assignee: 'u4', project: 'p4', labels: ['安全','后端'],       dueDate: '2026-09-23', createDate: '2026-09-18' },
  { id: 17, code: 'T1000017', title: '采购退货流程开发', desc: '开发采购退货全流程：发起退货申请（选退货原因、填写退货数量、上传照片凭证）→退货审批（采购主管+质量主管双签）→生成退货出库单→库存回退（扣减入库数量、恢复可用库存）→财务退款处理（冲销应付账款）。退货原因分类：质量问题、规格不符、多发货、过期退货。支持退货明细行级部分退货。', status: 'backlog',     priority: 'high',   assignee: 'u1', project: 'p1', labels: ['前端','后端'],       dueDate: '2026-10-02', createDate: '2026-09-23' },
  { id: 18, code: 'T1000018', title: '供应商评分明细报表', desc: '开发供应商评分明细报表，展示每个供应商各维度评分明细及加权总分。支持多维度钻取：点击交货准时率可下钻到每笔订单的交货记录，点击质量合格率可下钻到每批次质检报告。报表支持导出 Excel 并附评分趋势图（近 6 期评分变化折线）。已完成后端查询逻辑，正在开发前端钻取交互。', status: 'in_review',  priority: 'medium', assignee: 'u2', project: 'p2', labels: ['后端','UI设计'],     dueDate: '2026-09-27', createDate: '2026-09-20', parentId: 2 },
  { id: 19, code: 'T1000019', title: '入库扫码功能开发', desc: '开发 PDA 扫码入库功能：扫描采购订单条码自动带出待入库明细，扫描物料条码匹配明细行并填入实收数量。支持连续扫描模式（不跳转页面逐条扫描）。异常处理：扫码与订单不符时弹窗提示并阻止入库、实收大于应收时拦截。扫码完成后一键提交入库单并打印入库标签。已完成 PDA 端页面框架，正在对接扫码 SDK。', status: 'in_progress', priority: 'high',   assignee: 'u3', project: 'p3', labels: ['前端','接口'],        dueDate: '2026-09-29', createDate: '2026-09-22', parentId: 3 },
  { id: 20, code: 'T1000020', title: '财务凭证自动生成', desc: '配置采购入库自动生成财务凭证规则：入库单审核通过后自动生成借记"原材料"、贷记"应付账款"凭证；退货入库生成红字冲销凭证。凭证模板支持科目映射配置（按物料类别映射不同存货科目）、摘要模板自定义、辅助核算项自动填充。月结时批量校验凭证借贷平衡，异常凭证自动标记并通知会计处理。', status: 'done',        priority: 'medium', assignee: 'u4', project: 'p4', labels: ['后端','数据库'],     dueDate: '2026-09-12', createDate: '2026-09-06' },
  { id: 21, code: 'T1000021', title: '采购订单批量审批', desc: '开发采购订单批量审批功能：列表页支持勾选多张订单后点击"批量审批"，弹窗显示选中订单汇总信息（总金额、供应商数、明细行数）供确认。支持快捷键操作（Ctrl+A 全选、Enter 确认、Esc 取消）。批量审批限制：不同供应商订单不能混合审批、超过单笔审批限额的订单自动排除。审批结果汇总展示成功/失败条数。', status: 'backlog',     priority: 'medium', assignee: 'u5', project: 'p1', labels: ['前端'],              dueDate: '2026-10-03', createDate: '2026-09-23' },
  { id: 22, code: 'T1000022', title: '供应商资质文件管理', desc: '开发供应商资质文件管理模块：支持营业执照、税务登记证、组织机构代码证、开户许可证、质量体系认证等文件的上传（PDF/图片，单文件<10MB）。OCR 自动识别证照关键字段（编号、有效期、经营范围）并入库。到期前 60 天自动提醒更新，过期文件标红冻结。支持文件版本管理，历史版本可追溯。', status: 'in_review',  priority: 'low',    assignee: 'u2', project: 'p2', labels: ['后端','安全'],       dueDate: '2026-09-28', createDate: '2026-09-19' },
  { id: 23, code: 'T1000023', title: '入库库存预警看板', desc: '开发入库库存预警实时看板，适配仓库大屏展示（1920x1080 横屏）。看板分四个区域：今日入库概览（总单数/总数量/异常数）、库存水位监控（红黄绿三色预警图）、实时入库流水（滚动展示最新 20 条）、异常待处理清单。数据每 30 秒自动刷新，支持手动暂停刷新。已完成大屏 UI 框架，正在对接 WebSocket 实时推送。', status: 'in_progress', priority: 'urgent', assignee: 'u6', project: 'p3', labels: ['前端','UI设计'],     dueDate: '2026-09-24', createDate: '2026-09-21' },
  { id: 24, code: 'T1000024', title: '报表数据校验规则', desc: '配置报表数据完整性校验规则库：借贷平衡校验（差额=0）、科目编码规范校验（长度/层级/编码段）、必填项校验（摘要/日期/金额非空）、逻辑校验（资产=负债+权益）。校验不通过时自动生成异常清单并标记异常类型和行号，支持一键定位到原始凭证。校验规则支持自定义扩展，规则变更需审批。', status: 'backlog',     priority: 'medium', assignee: 'u4', project: 'p4', labels: ['后端','测试'],       dueDate: '2026-10-01', createDate: '2026-09-22' },
  { id: 25, code: 'T1000025', title: '采购合同电子签署', desc: '对接第三方电子签署平台（e签宝），完成采购合同在线签署全流程：上传合同 PDF→设置签署方（乙方信息自动填充）→拖拽设置签署位置→发起签署→对方短信通知→签署完成回调。签署完成的合同自动归档并带数字签名水印。支持签署状态实时查询和签署日志导出。阻塞原因：e签宝测试环境密钥申请流程卡在法务审批。', status: 'blocked',     priority: 'high',   assignee: 'u1', project: 'p1', labels: ['接口','安全'],       dueDate: '2026-09-25', createDate: '2026-09-17' },
  { id: 26, code: 'T1000026', title: '供应商评级接口联调', desc: '供应商评级计算接口与前端联调测试：后端提供评级查询（按供应商/期间/维度）、评级明细钻取、评级趋势图数据三个接口。联调发现问题：钻取接口分页参数传递异常（已修复）、趋势图日期范围边界值返回空（已修复）、评级总分小数精度不一致（待修复）。需补充接口文档并更新 Mock 数据。', status: 'in_review',  priority: 'high',   assignee: 'u2', project: 'p2', labels: ['接口','测试'],       dueDate: '2026-09-26', createDate: '2026-09-20', parentId: 2 },
  { id: 27, code: 'T1000027', title: '入库上架指引开发', desc: '开发入库上架指引页面：扫描物料条码后系统自动推荐上架库位，推荐算法基于就近原则（优先同品属相邻库位）+分散存储策略（同批次拆分到不同货架降低风险）。指引页面显示推荐库位平面图（高亮目标货架）、搬运路径规划。支持人工修改库位，修改时校验该库位容量和承重限制。', status: 'in_progress', priority: 'low',    assignee: 'u3', project: 'p3', labels: ['前端','数据库'],     dueDate: '2026-10-04', createDate: '2026-09-22', parentId: 3 },
  { id: 28, code: 'T1000028', title: '财务对账自动化', desc: '开发采购与财务自动对账功能：按采购订单维度自动匹配采购入库记录与财务付款记录，匹配规则：订单号+金额完全一致自动匹配、金额差异<100元标记为"小额差异"待人工确认、差异>100元标记为"异常"。对账结果生成差异明细表，支持导出 Excel 和批量处理（确认/退回/挂账）。已上线运行，月均处理对账记录 3000+条。', status: 'done',        priority: 'medium', assignee: 'u4', project: 'p4', labels: ['后端','数据库'],     dueDate: '2026-09-10', createDate: '2026-09-04' },
  { id: 29, code: 'T1000029', title: '采购询价比价功能', desc: '开发采购询价比价模块：发起询价时自动拉取同物料历史采购价作为基准价参考，支持同时向多家供应商发起询价（邮件/站内消息）。供应商报价回收后自动生成比价矩阵表（含报价、交期、最小起订量、付款条件），按综合成本最低推荐中标供应商。支持询价单转采购订单一键创建。', status: 'backlog',     priority: 'medium', assignee: 'u5', project: 'p1', labels: ['前端','UI设计'],     dueDate: '2026-10-06', createDate: '2026-09-23' },
  { id: 30, code: 'T1000030', title: '供应商绩效月报', desc: '配置供应商绩效月报自动生成和推送：每月 3 日自动生成上月供应商绩效报告，内容包括交货准时率排行、质量异常 TOP10、价格波动分析、合作金额统计。报告以 PDF 附件形式邮件推送至采购总监和各品类采购经理，同时在系统中归档可在线查阅。支持订阅特定供应商的绩效月报。', status: 'in_review',  priority: 'low',    assignee: 'u2', project: 'p2', labels: ['后端','文档'],        dueDate: '2026-09-29', createDate: '2026-09-19' },
  { id: 31, code: 'T1000031', title: '入库盘点任务管理', desc: '开发入库盘点任务全流程管理：创建盘点计划（选择仓库/品类/盘点日期）→系统生成盘点清单（自动带出账面库存）→分配盘点人→PDA 扫码盘点录入实盘数量→系统自动计算盘盈盘亏→生成盘点差异报告→差异审批处理（盘亏需追究责任）→调整库存账面。支持盲盘（不显示账面数量）和明盘两种模式。', status: 'in_progress', priority: 'medium', assignee: 'u6', project: 'p3', labels: ['前端','后端'],       dueDate: '2026-09-30', createDate: '2026-09-21' },
  { id: 32, code: 'T1000032', title: '报表订阅推送配置', desc: '配置报表定时订阅推送功能：用户可订阅任意报表并设置推送规则（每日/每周/每月、推送时间、收件人、格式 PDF/Excel）。推送渠道支持邮件附件、站内消息链接、企业微信卡片三种。订阅管理页面展示所有订阅列表，支持暂停/恢复/删除。已实现订阅创建和邮件推送通道，企业微信通道待对接。', status: 'backlog',     priority: 'low',    assignee: 'u4', project: 'p4', labels: ['后端','接口'],       dueDate: '2026-10-08', createDate: '2026-09-22' },
];

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
  return p ? p : { id: id, name: '未分配', avatar: '?', color: '#b8b8b8' };
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
var taskModules = {
  1:'采购订单', 2:'供应商评级', 3:'入库审批', 4:'报表数据',
  5:'采购订单', 6:'供应商准入', 7:'入库质检', 8:'报表导出',
  9:'采购订单', 10:'供应商准入', 11:'库存预警', 12:'报表生成',
  13:'采购比价', 14:'供应商合同', 15:'入库单据', 16:'报表权限',
  17:'采购退货', 18:'供应商评级', 19:'入库扫码', 20:'财务凭证',
  21:'采购订单', 22:'供应商准入', 23:'库存预警', 24:'报表数据',
  25:'采购合同', 26:'供应商评级', 27:'入库上架', 28:'财务对账',
  29:'采购比价', 30:'供应商评级', 31:'库存盘点', 32:'报表订阅',
};
function taskMinuteNow() {
  var now = new Date();
  function pad(value) { return String(value).padStart(2, '0'); }
  return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' '
    + pad(now.getHours()) + ':' + pad(now.getMinutes());
}
var _tasks = TK_TASKS.map(function (t) {
  return Object.assign({
    createdBy: TK_PEOPLE[(t.id + 1) % TK_PEOPLE.length].id,
    module: taskModules[t.id],
    createdAt: t.createDate + ' 09:30',
    updatedAt: t.createDate + ' 10:15',
  }, t);
});
var _views = TK_VIEWS.map(function (v) { return Object.assign({}, v); });
try {
  var storedViews = JSON.parse(localStorage.getItem('lingee_tasks_custom_views') || '[]');
  if (Array.isArray(storedViews)) _views = _views.concat(storedViews.filter(function (v) { return v && typeof v.id === 'string' && typeof v.name === 'string' && !v.builtin; }));
} catch (e) { /* 本地存储不可用时仍可在当前页面管理视图 */ }
var _nextId = 33;
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
export function tkAddTask(task) {
  var now = taskMinuteNow();
  task.id = _nextId++;
  task.code = 'T' + String(1000000 + task.id);
  task.createDate = now.slice(0, 10);
  task.createdAt = now;
  task.updatedAt = now;
  if (!task.createdBy) task.createdBy = TK_CURRENT_USER;
  _tasks.unshift(task);
  return task;
}
export function tkUpdateTask(id, patch) {
  var t = _tasks.find(function (x) { return x.id === id; });
  if (t) Object.assign(t, patch, { updatedAt: taskMinuteNow() });
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

/* 当前用户（模拟） */
export var TK_CURRENT_USER = 'u1';
