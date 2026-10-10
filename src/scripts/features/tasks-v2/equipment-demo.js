/* 设备巡检维修系统建设：汇报 6.1 / 6.2 的演示场景。
   6.1 张工审核「故障报修与维修记录」（T1001503），三个交付阶段各由苍穹应用开发专家团的一位智能体执行；6.2 设备主管周建国用对话做「设备故障诊断助手」（T1001506），
   该任务只由「智能体开发」一个智能体执行（expertId）。阶段 id 用标准交付阶段，便于产物按阶段挂载。 */

function stage(id, name, description, assigneeId, status) {
  return { id:id, workType:name, title:name, description:description, assigneeId:assigneeId, status:status };
}

export const TK_EQUIPMENT_TASKS = [
  { id:1500, code:'T1001500', title:'设备巡检需求梳理与验收标准', status:'done', priority:'high', assignee:'p04', createdBy:'p01', project:'equipment', labels:['需求'], issueType:'需求', createDate:'2026-09-14', dueDate:'2026-09-18',
    desc:'梳理设备巡检、故障报修、维修记录三个环节的需求；明确首期覆盖注塑、空压、数控三类 126 台设备；每条需求附可观察的验收条件。',
    executionStageId:'delivery',
    statusHistory:[
      { from:'backlog', to:'in_progress', time:'2026-09-14 09:30:00', authorId:'p01' },
      { from:'in_progress', to:'in_review', time:'2026-09-17 16:00:00', authorId:'p04' },
      { from:'in_review', to:'done', time:'2026-09-18 10:20:00', authorId:'p01' },
    ],
    executionPlan:[
      stage('requirements', '需求分析', '访谈设备部，梳理巡检与维修现状', 'p04', 'done'),
      stage('design', '方案设计', '划定首期设备范围与非目标', 'p04', 'done'),
      stage('planning', '实现规划', '拆分需求清单与优先级', 'p01', 'done'),
      stage('implementation', '编码实现', '编写需求文档与验收条件', 'p04', 'done'),
      stage('verification', '测试验证', '逐条核对验收条件可观察', 'p05', 'done'),
      stage('delivery', '部署交付', '需求评审并归档', 'p01', 'done'),
    ] },
  { id:1501, code:'T1001501', title:'巡检维修系统技术方案', status:'done', priority:'high', assignee:'p03', createdBy:'p01', project:'equipment', labels:['需求'], issueType:'需求', createDate:'2026-09-18', dueDate:'2026-09-24',
    desc:'设计设备、巡检计划、巡检记录、报修单、维修记录五个核心对象；设备二维码作为统一入口；维修记录开放查询接口，供后续智能体技能调用。',
    executionStageId:'delivery',
    statusHistory:[
      { from:'backlog', to:'in_progress', time:'2026-09-18 14:00:00', authorId:'p03' },
      { from:'in_progress', to:'in_review', time:'2026-09-23 17:20:00', authorId:'p03' },
      { from:'in_review', to:'done', time:'2026-09-24 10:00:00', authorId:'p01' },
    ],
    executionPlan:[
      stage('requirements', '需求分析', '确认移动端、离线与扫码要求', 'p03', 'done'),
      stage('design', '方案设计', '设计五个核心对象与二维码入口', 'p03', 'done'),
      stage('planning', '实现规划', '规划接口与开发顺序', 'p01', 'done'),
      stage('implementation', '编码实现', '输出方案文档与接口契约', 'p03', 'done'),
      stage('verification', '测试验证', '评审方案风险与预案', 'p05', 'done'),
      stage('delivery', '部署交付', '方案评审通过并归档', 'p01', 'done'),
    ] },
  { id:1502, code:'T1001502', title:'设备台账与扫码巡检', status:'done', priority:'high', assignee:'p02', createdBy:'p01', project:'equipment', labels:['需求'], issueType:'需求', createDate:'2026-09-24', dueDate:'2026-10-02',
    desc:'建立设备台账并为每台设备生成二维码；维修工扫码打开巡检表，按设备类型加载巡检项，异常项拍照留证并可一键转报修。',
    executionStageId:'delivery',
    statusHistory:[
      { from:'backlog', to:'in_progress', time:'2026-09-24 10:00:00', authorId:'p01' },
      { from:'in_progress', to:'in_review', time:'2026-10-01 15:40:00', authorId:'p02' },
      { from:'in_review', to:'done', time:'2026-10-02 09:50:00', authorId:'p01' },
    ],
    executionPlan:[
      stage('requirements', '需求分析', '确认台账字段与巡检项模板', 'p04', 'done'),
      stage('design', '方案设计', '设计二维码规则与巡检表结构', 'p03', 'done'),
      stage('planning', '实现规划', '拆分台账、二维码、巡检三个切片', 'p01', 'done'),
      stage('implementation', '编码实现', '实现台账、扫码巡检与异常转报修', 'p02', 'done'),
      stage('verification', '测试验证', '验证 126 台设备二维码与巡检流程', 'p05', 'done'),
      stage('delivery', '部署交付', '发布到测试环境', 'p07', 'done'),
    ] },
  { id:1503, code:'T1001503', title:'故障报修与维修记录', status:'in_review', priority:'high', assignee:'p01', createdBy:'p01', project:'equipment', labels:['需求'], issueType:'需求', createDate:'2026-09-28', dueDate:'2026-10-09',
    desc:'维修工扫码报修，填写故障现象并拍照；系统按设备类型派给对应维修组；维修完成后记录故障原因、更换零件和耗时，形成每台设备的维修履历。',
    executionStageId:'verification',
    statusHistory:[
      { from:'backlog', to:'in_progress', time:'2026-09-28 10:00:00', authorId:'p01' },
      { from:'in_progress', to:'in_review', time:'2026-10-04 16:30:00', authorId:'p02' },
    ],
    executionPlan:[
      stage('requirements', '需求分析', '需求智能体：确认报修字段、派工规则与维修履历', 'p01', 'done'),
      stage('design', '方案设计', '方案智能体：设计报修单、维修记录与派工规则', 'p01', 'done'),
      stage('implementation', '开发实现', '开发智能体：基于苍穹元数据实现扫码报修、自动派工与维修记录', 'p01', 'done'),
      stage('verification', '测试验证', '测试智能体：验证报修到维修闭环与设备履历，张工审核结果', 'p01', 'review'),
      stage('delivery', '部署发布', '部署智能体：发布到生产环境', 'p01', 'pending'),
    ] },
  { id:1504, code:'T1001504', title:'移动端离线巡检与拍照上传', status:'in_progress', priority:'medium', assignee:'p02', createdBy:'p01', project:'equipment', labels:['需求'], issueType:'需求', createDate:'2026-10-02', dueDate:'2026-10-14',
    desc:'车间信号弱时可离线完成巡检，恢复网络后自动上传；照片压缩到 500KB 以内，上传失败自动重试。',
    executionStageId:'implementation',
    statusHistory:[
      { from:'backlog', to:'in_progress', time:'2026-10-02 10:30:00', authorId:'p01' },
    ],
    executionPlan:[
      stage('requirements', '需求分析', '确认离线时长与照片要求', 'p04', 'done'),
      stage('design', '方案设计', '设计本地缓存与同步冲突规则', 'p03', 'done'),
      stage('planning', '实现规划', '规划缓存、同步、重试步骤', 'p01', 'done'),
      stage('implementation', '编码实现', '实现离线缓存与断点上传', 'p02', 'running'),
      stage('verification', '测试验证', '弱网与断网场景验证', 'p05', 'pending'),
      stage('delivery', '部署交付', '随系统上线发布', 'p07', 'pending'),
    ] },
  { id:1505, code:'T1001505', title:'系统上线部署与设备数据导入', status:'backlog', priority:'high', assignee:'p07', createdBy:'p01', project:'equipment', labels:['需求'], issueType:'需求', createDate:'2026-10-03', dueDate:'2026-10-16',
    desc:'导入 126 台设备台账和近一年纸质维修记录；完成生产环境部署、备份与监控；打印并张贴设备二维码。',
    executionStageId:'requirements',
    executionPlan:[
      stage('requirements', '需求分析', '确认导入范围与上线计划', 'p07', 'pending'),
      stage('design', '方案设计', '设计导入映射与回滚方案', 'p03', 'pending'),
      stage('planning', '实现规划', '排定导入、部署与张贴顺序', 'p07', 'pending'),
      stage('implementation', '编码实现', '执行导入与部署', 'p07', 'pending'),
      stage('verification', '测试验证', '抽查导入数据与扫码入口', 'p05', 'pending'),
      stage('delivery', '部署交付', '正式上线', 'p01', 'pending'),
    ] },
  { id:1506, code:'T1001506', title:'设备故障诊断助手', status:'in_review', priority:'high', assignee:'p42', createdBy:'p42', project:'equipment', labels:['智能体'], issueType:'需求', createDate:'2026-10-03', dueDate:'2026-10-23',
    expertId:'agent-development-expert',
    desc:'设备巡检维修系统上线了，帮我做一个设备故障诊断助手。维修工程师报上设备编号和故障现象，先从系统里查这台设备的档案和最近的维修记录，再按我的经验给排查步骤。比如注塑机温度忽高忽低，先查热电偶接线，再查加热圈，最后查温控表；最近换过的零件要优先怀疑；碰到高压电的活先断电挂牌。',
    executionStageId:'verification',
    deliversAgent:'设备故障诊断助手',
    stageNotes:{ delivery:['提交上架审核：这是生产环境操作，管理员审核通过后正式生效','记录技能调用的 MCP 服务（设备巡检维修系统，只读）和知识清单','审核通过后，全公司可在「工作」中选用'] },
    statusHistory:[
      { from:'backlog', to:'in_progress', time:'2026-10-03 09:30:00', authorId:'p42' },
      { from:'in_progress', to:'in_review', time:'2026-10-04 15:20:00', authorId:'p42' },
    ],
    executionPlan:[
      stage('requirements', '需求分析', '把周师傅的话整理成排障经验清单', 'p42', 'done'),
      stage('design', '方案设计', '确定角色设定、技能和知识范围', 'p42', 'done'),
      stage('implementation', '编码实现', '生成角色设定，挂载调用设备巡检维修系统 MCP 服务的技能', 'p42', 'done'),
      stage('verification', '测试验证', '在测试环境用真实故障测试，确认回答符合经验', 'p42', 'review'),
      { ...stage('delivery', '部署交付', '在智能体开发中提交上架审核，管理员审核后发布', 'p42', 'pending'), title:'提交上架' },
    ] },
];

/* 演示任务的定制产物；未定制的阶段沿用通用产物。 */
export function equipmentArtifactDocs(task, people) {
  if (task.id === 1503) return repairArtifacts(task, people);
  if (task.id === 1506) return diagnosisAgentArtifacts(task);
  return null;
}

function repairArtifacts(task, P) {
  return [
    {
      id:'implementation', stageId:'implementation', type:'开发成果', docTitle:'故障报修与维修记录 · 元数据清单',
      summary:'实体、表单、列表与插件元数据，扫码报修、自动派工与设备维修履历', docNo:'DEV-' + task.code, version:'v1.0.0-rc1', status:'待验收', reviewer:P.owner,
      date:'2026-10-04 14:30', author:P.dev,
      sections:[
        { heading:'1. 元数据清单', blocks:[
          { table:{ head:['类型', '编码', '名称', '说明'], rows:[
            ['实体', 'eqp_repair_order', '报修单', '设备、故障现象、照片、优先级、派工组'],
            ['实体', 'eqp_repair_record', '维修记录', '故障原因、更换零件、耗时、维修人，关联设备履历'],
            ['表单', 'eqp_repair_bill', '扫码报修', '扫码带出设备信息，必填校验与照片上传'],
            ['列表', 'eqp_repair_list', '维修记录列表', '按设备、类型、日期筛选，汇总成设备履历'],
            ['插件', 'RepairDispatchPlugin', '自动派工', '按设备类型派给注塑、空压、数控维修组'],
            ['接口', 'queryRepairRecords', '查询维修记录', '只读，供智能体技能调用，权限沿用 ERP'],
          ] } },
          { note:'由苍穹元数据智能体按元数据契约生成与校验；字段类型、必填与权限都在元数据里约束。' },
        ] },
        { heading:'2. 标准表单与列表', blocks:[
          { table:{ head:['元数据', '生成结果'], rows:[
            ['报修单实体 + 扫码报修表单', '标准单据表单：基本信息、维修信息、更换零件、附件'],
            ['维修记录实体 + 维修记录列表', '标准列表：按设备、类型、日期筛选，汇总成设备履历'],
          ] } },
          { note:'表单和列表由元数据直接生成，字段、类型与必填规则在实体里定义；同时开放「查询维修记录」只读接口，供智能体技能调用。' },
        ] },
        { heading:'3. 已实现能力', blocks:[
          { table:{ head:['能力', '交互结果'], rows:[
            ['扫码报修', '扫设备二维码自动带出设备信息，填写现象并拍照'],
            ['自动派工', '按设备类型派给注塑、空压、数控三个维修组'],
            ['维修记录', '记录故障原因、更换零件与耗时，归入设备履历'],
            ['履历查询', '按设备查看全部巡检、报修与维修记录'],
          ] } },
        ] },
      ],
    },
    {
      id:'test', stageId:'verification', type:'测试报告', docTitle:'《故障报修与维修记录》系统测试报告',
      summary:'报修到维修闭环、派工规则与设备履历', docNo:'TST-' + task.code, version:'v1.0', status:'已通过', reviewer:P.owner,
      date:'2026-10-04 16:20', author:P.test,
      sections:[
        { heading:'1. 执行结果', blocks:[
          { table:{ head:['总数', '通过', '待修复', '通过率'], rows:[['42', '42', '0', '100%']] } },
          { table:{ head:['用例', '验证点', '结果'], rows:[
            ['TC-001', '扫码报修自动带出设备编号、型号与位置', '通过'],
            ['TC-008', '注塑机故障派给注塑维修组，30 秒内收到待办', '通过'],
            ['TC-015', '维修完成必须填写原因与更换零件', '通过'],
            ['TC-022', '设备履历按时间倒序展示巡检、报修与维修', '通过'],
            ['TC-031', '「查询维修记录」接口按设备编号返回近 12 个月记录', '通过'],
            ['TC-040', '车间弱网下报修提交不丢单', '通过'],
          ] } },
        ] },
        { heading:'2. 结论', blocks:[
          { p:'42 条用例全部通过，报修、派工、维修记录与设备履历形成闭环，可进入部署交付。' },
        ] },
      ],
    },
    {
      id:'delivery', stageId:'delivery', type:'交付报告', docTitle:'《故障报修与维修记录》交付验收报告',
      summary:'发布内容、上线核对与验收结论', docNo:'DLV-' + task.code, version:'v1.0.0', status:'已交付', reviewer:P.owner,
      date:'2026-10-05 10:30', author:P.dev,
      sections:[
        { heading:'1. 交付清单', blocks:[
          { table:{ head:['交付物', '说明'], rows:[
            ['设备巡检维修系统 v1.0.0', '已发布到生产环境：apps.lingee.com/equipment'],
            ['查询维修记录接口', '只读接口，供智能体技能调用'],
            ['测试报告', '42 条用例全部通过'],
            ['操作手册', '面向维修工与设备主管'],
          ] } },
        ] },
        { heading:'2. 上线核对', blocks:[
          { ul:[
            '126 台设备二维码可扫码打开报修',
            '注塑、空压、数控三个维修组均收到派工待办',
            '近一年纸质维修记录已导入设备履历',
          ] },
        ] },
        { heading:'3. 验收结论', blocks:[
          { p:'功能验收通过，系统已上线运行。' },
        ] },
      ],
    },
  ];
}

function diagnosisAgentArtifacts(task) {
  var author = '智能体开发';
  var owner = '周建国';
  return [
    {
      id:'requirements', stageId:'requirements', type:'需求文档', docTitle:'《设备故障诊断助手》排障经验清单',
      summary:'把周师傅的口述整理成可执行的排查规则', docNo:'PRD-' + task.code, version:'v1.0', status:'已确认', reviewer:owner,
      date:'2026-10-03 10:10', author:author,
      sections:[
        { heading:'1. 助手要做的事', blocks:[
          { ol:[
            '维修工程师报上设备编号和故障现象',
            '先查这台设备的档案和近 12 个月维修记录',
            '按周师傅的经验给出排查顺序，最近换过的零件优先怀疑',
            '涉及高压电的步骤先提醒断电挂牌',
          ] },
        ] },
        { heading:'2. 排查经验', blocks:[
          { table:{ head:['设备', '故障现象', '排查顺序'], rows:[
            ['注塑机', '温度忽高忽低', '热电偶接线 → 加热圈 → 温控表'],
            ['空压机', '排气压力不足', '进气滤芯 → 泄压阀 → 管路泄漏'],
            ['数控机床', '主轴异响', '润滑 → 轴承 → 皮带张紧'],
          ] } },
        ] },
      ],
    },
    {
      id:'technical', stageId:'design', type:'技术文档', docTitle:'《设备故障诊断助手》配置方案',
      summary:'角色设定、技能与知识范围', docNo:'TEC-' + task.code, version:'v1.0', status:'已确认', reviewer:owner,
      date:'2026-10-03 14:20', author:author,
      sections:[
        { heading:'1. 配置项', blocks:[
          { table:{ head:['配置', '内容'], rows:[
            ['角色设定', '设备维修老师傅：先查记录再下判断，步骤说人话，安全第一'],
            ['技能', '查询设备档案、查询维修记录（来自设备巡检维修系统）'],
            ['知识', '设备管理知识库；《注塑机常见故障排查手册》'],
            ['可见范围', '全公司可见，维修工程师在「工作」中直接提问'],
          ] } },
          { note:'维修记录通过 MCP 服务只读开放，智能体技能直接调用，不修改任何记录。' },
        ] },
      ],
    },
    {
      id:'implementation', stageId:'implementation', type:'开发成果', docTitle:'设备故障诊断助手 · 智能体配置', agentConfig:'设备故障诊断助手',
      summary:'智能体配置：角色设定、技能（调用设备巡检维修系统 MCP 服务）、知识', docNo:'DEV-' + task.code, version:'v1.0.0-rc1', status:'待验收', reviewer:owner,
      date:'2026-10-04 11:00', author:author,
      sections:[
        { heading:'1. 生成结果', blocks:[
          { table:{ head:['页签', '结果'], rows:[
            ['基础信息', '名称「设备故障诊断助手」；领域「通用」；全公司可见'],
            ['角色设定', '已按排障经验清单写好角色定位、工作职责和工作原则'],
            ['技能配置', '已挂载「查询设备档案」「查询维修记录」，技能调用设备巡检维修系统 MCP 服务的只读工具'],
            ['知识', '已关联「设备管理知识库」；排障手册在知识页上传'],
          ] } },
          { note:'整个配置由 Build 按周师傅的任务描述生成，周师傅没有编写代码。' },
        ] },
      ],
    },
    {
      id:'test', stageId:'verification', type:'测试报告', docTitle:'《设备故障诊断助手》测试报告',
      summary:'用 3 个真实故障测试，核对回答是否符合周师傅的经验', docNo:'TST-' + task.code, version:'v1.0', status:'已通过', reviewer:owner,
      date:'2026-10-04 15:10', author:author,
      sections:[
        { heading:'1. 测试用例', blocks:[
          { table:{ head:['维修工程师提问', '助手回答要点', '是否符合经验'], rows:[
            ['3 号注塑机报 E21，温度忽高忽低怎么办？', '查到 9 月 12 日更换过热电偶，先查热电偶接线，再查加热圈，最后查温控表', '符合'],
            ['1 号空压机压力上不去', '上次换滤芯已 3 个月，先查进气滤芯，再查泄压阀和管路', '符合'],
            ['5 号数控机床主轴有异响', '9 月 26 日因润滑不足维修过，先查润滑，再查轴承', '符合'],
          ] } },
        ] },
        { heading:'2. 结论', blocks:[
          { p:'在 Lingee 测试环境运行，不触碰生产数据。3 个问题都先引用了这台设备的维修记录，排查顺序与周师傅的经验一致，涉及加热圈的步骤提醒了断电挂牌。' },
        ] },
      ],
    },
    {
      id:'delivery', stageId:'delivery', type:'交付报告', docTitle:'《设备故障诊断助手》发布记录',
      summary:'提交上架审核与发布范围', docNo:'DLV-' + task.code, version:'V1.0.0', status:'待发布', reviewer:owner,
      date:'2026-10-05 10:00', author:author,
      sections:[
        { heading:'1. 发布信息', blocks:[
          { table:{ head:['项目', '内容'], rows:[
            ['版本', 'V1.0.0'],
            ['可见范围', '全公司可见'],
            ['上架流程', '提交后由管理员审核，通过后出现在智能体列表'],
          ] } },
        ] },
      ],
    },
  ];
}
