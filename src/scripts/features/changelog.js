import { $, $$ } from '../core/dom.js';
import { applyMode, setNavActive, showView } from '../core/view.js';
import { openAppDropdown } from './attach-app.js';
/* 更新日志页面
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- Changelog / 更新日志 ---------- */
var changelogData=[
  {id:'41',date:'2026-09-24',iconBg:'var(--brand-fill)',iconColor:'var(--brand)',type:'优化',module:'任务',author:'吴晓锋',team:'任务列表与详情交互优化',body:'任务列表展开箭头独占一列，父级与单级任务标题左对齐，表头标题与父级标题对齐；子任务缩进调整为两个字符宽度；展开/收起改为 mac 文件夹风格高度动效；全局 ESC 键关闭所有表单弹窗。'},
  {id:'40',date:'2026-09-24',iconBg:'var(--brand-fill)',iconColor:'var(--brand)',type:'优化',module:'协作开发',author:'吴宏超',team:'项目任务、详情与成员管理优化',body:'项目定义项统一称为任务，新建时可选上级任务，独立任务也会显示在项目详情；项目详情移除搜索，右侧项目摘要可收起以展开内容区。项目详情左侧嵌入按当前项目筛选的任务管理面板，第一期仅展示可执行任务；右侧仅保留项目属性，成员管理从详情右上角进入独立页面，按邀请、成员、待处理邀请、分享链接分区展示。成员邀请支持手机号或邮箱，默认角色为成员，由管理员在成员列表设置；7天有效分享链接支持更新、复制和撤销；移除前检查未完成任务并二次确认。设置页保留人员与权限和系统集成入口。'},
  {id:'39',date:'2026-09-23',iconBg:'var(--brand-fill)',iconColor:'var(--brand)',type:'优化',module:'协作开发',author:'吴宏超',team:'新建任务体验优化',body:'新建任务采用宽幅写作区，单人执行与多人协作分别配置负责人和执行阶段。'},
  {id:'38',date:'2026-09-23 21:15',iconBg:'var(--brand-fill)',iconColor:'var(--brand)',type:'功能',module:'任务',author:'吴晓锋',team:'子任务创建与父子嵌套展示',body:'任务支持创建子任务并自动继承父任务信息；看板和列表按父子关系分组展示，可折叠展开；任务详情可查看子任务完成进度。'},
  {id:'37',date:'2026-09-23 20:30',iconBg:'var(--brand-fill)',iconColor:'var(--brand)',type:'功能',module:'任务',author:'吴晓锋',team:'任务管理页面全新重构',body:'任务管理页面全新重构，看板和列表按项目-模块-任务的父子关系分组展示，支持筛选排序与拖拽流转；任务详情可添加子任务，列表可拖拽列宽和排序；项目可直接维护成员并查看任务进度。'},
  {id:'36',date:'2026-09-23 20:00',iconBg:'var(--brand-fill)',iconColor:'var(--brand)',type:'功能',module:'更新日志',author:'吴晓锋',team:'更新日志改为独立页面',body:'更新日志从顶部铃铛改为用户菜单中的独立页面，用表格展示并支持按类型、模块和更新人筛选；顶部铃铛保留改为系统通知入口。'},
  {id:'29',date:'2026-09-22 16:45',iconBg:'var(--brand-fill)',iconColor:'var(--brand)',type:'功能',module:'协作开发',author:'吴宏超',team:'项目管理重构',body:'项目详情改为左侧标签页+右侧属性栏布局，属性栏参考 multica 采用可折叠分区与 PropRow 行布局；新增概览页签展示项目背景，任务规划改名为模块；项目新增状态标识（planned/in_progress/paused/completed/cancelled）；新建项目弹窗重构为上下布局，成员选择改为独立弹出层支持搜索多选；右侧属性栏支持内联编辑。'},
  {id:'27',date:'2026-09-22 16:45',iconBg:'var(--brand-fill)',iconColor:'var(--brand)',type:'优化',module:'协作开发',author:'吴宏超',team:'任务详情、评审与运行期协作链路优化',body:'任务详情重设计为左侧任务内容、右侧紧凑属性栏，任务按环节推进：本人评审 AI 生成的产物，通过后提交 Git 并流转到下一个环节（最后环节通过即完成）；项目任务规划按特性组织，智能拆解与人工拆解生成特性，特性下推生成任务并挂到对应特性下；任务负责人只能指定人，不能选专家团；专家团在新建项目时选择，绑定结果自动继承到任务；专家团配置合并为基本信息、能力与流程、触发词三个页签；项目卡片与专家/专家团卡片风格统一，任务均明确负责人，卡片支持快速转交，详情按默认折叠的流程节点展示对应产物，交付产物统一汇总并支持预览；工作区设置改为左导航 + 右表单。'},
  {id:'26',date:'2026-09-21 14:20',iconBg:'#eaf1ff',iconColor:'#3d63dd',type:'功能',module:'协作开发',author:'吴宏超',team:'协作开发重构：工作区与项目管理',body:'协作开发重构：工作区固定顶部、项目切换器在任务/项目管理右侧，专家团升为一级页签；项目管理按「项目目标+里程碑→任务拆分→关联任务」三层组织，智能拆解调用智能体在对话框输出、逐项确认后生成；新建任务支持手动/通过智能体两种方式；任务详情复用新会话对话框，任务对话改为会话列表（每行一条会话总结）并可进入会话、支持发起会话与转交任务；人员独立基础资料；产物带后缀名、代码类按目录弹文件列表；新增多角色登录演示。'},
  {id:'25',date:'2026-09-21 14:20',iconBg:'var(--brand-fill)',iconColor:'var(--brand)',type:'优化',module:'协作开发',author:'吴宏超',team:'协作开发体验升级',body:'任务管理升级为状态看板与列表，任务详情采用左侧任务主页、右侧属性栏的页内工作台；专家新增技能页签与技能用途说明，内置专家团聚焦苍穹应用开发、通用应用开发、金蝶 SaaS 实施和金蝶二次开发，同时修复交互弹窗居中规则。'},
  {id:'24',date:'2026-09-21 14:20',iconBg:'#e6f7f0',iconColor:'#0d9d6c',type:'功能',module:'协作开发',author:'吴宏超',team:'协作人员改为团队模型',body:'协作人员管理重构为团队模型：团队列表与详情两层（概况卡＋成员/指引页签），支持新建团队、归档、添加成员、设某成员为队长（一队一队长），去掉智能体概念；任务管理改为统计卡在上、搜索与下拉筛选在下的布局，状态筛选改下拉并与统计卡点选联动；专家详情知识页签左栏分预置/关联企业/上传三组；全局「小队」更名「团队」、「扭转」更名「流转」。'},
  {id:'23',date:'2026-09-21 14:20',iconBg:'#eef3ff',iconColor:'#3d63dd',type:'优化',module:'协作开发',author:'吴宏超',team:'专家知识左树右表布局',body:'专家详情弹窗知识页签改为左树右表独立容器+独立滚动条，补全 .x-detail-pane 断裂的 flex 链条；去掉文档卡片复选框和目录点击筛选；预置知识支持子级目录展示；添加企业知识弹窗右侧不再支持文档级排除，默认全部加进来；去掉知识页签的灰色提示文字。'},
  {id:'22',date:'2026-09-21 14:20',iconBg:'#eef3ff',iconColor:'#3d63dd',type:'修复',module:'协作开发',author:'吴宏超',team:'知识搜索修复',body:'修复专家知识搜索框无法输入中文：三处搜索框（添加企业知识弹窗、详情弹窗知识页签、编辑器知识页签）在输入法组合输入时直接重渲染 DOM 打断输入，现按 compositionstart/compositionend 模式跳过组合过程中的重渲染；添加企业知识弹窗点确定时如未勾选任何目录给出提示，避免用户以为按钮没反应。'},
  {id:'21',date:'2026-09-20 10:15',iconBg:'#eaf1ff',iconColor:'#3d63dd',type:'优化',module:'协作开发',author:'吴宏超',team:'知识界面统一为目录模型',body:'自己创建的专家点击卡片直接进编辑表单，不再先弹只读详情。知识界面统一为「目录」模型：预置知识、知识扩展（原「自己的知识」）、自己上传的文件都以目录形式摆在左边，点目录筛选右边文档；预置知识支持看到目录名和文件名，但不能查看正文、不能修改；关联的企业知识目录支持对单篇文档单独勾选排除；预置专家的知识改动先落草稿，页脚新增「取消／保存」；「添加企业知识」弹窗定死高度，不再随搜索结果忽大忽小；修复专家卡片鼠标悬停出现的蓝色描边。'},
  {id:'20',date:'2026-09-20 10:15',iconBg:'#e6f7f0',iconColor:'#0d9d6c',type:'功能',module:'协作开发',author:'吴宏超',team:'专家知识分预置与自己上传',body:'专家知识分两层：预置知识是 Lingee 内置专家按能力项配置好的，官方维护，不可查看也不可修改，详情弹窗只报一个锁住的篇数；自己的知识谁都能在专家详情里直接上传文件，不用先编辑。自己创建的专家不受影响，仍是关联企业知识 + 上传两块。创建/编辑专家弹窗定死高度，三个页签来回切不再跳动；专家团成员卡片去掉重复的职位行；全局把「召唤」相关文案改成「对话」。'},
  {id:'19',date:'2026-09-20 10:15',iconBg:'#f0e6ff',iconColor:'#7c3aed',type:'优化',module:'协作开发',author:'吴宏超',team:'专家团弹窗改成单页',body:'专家团配置弹窗取消页签，团队、成员、能力覆盖、触发词合并到同一屏；查看内置专家团时不再重复摆只读表单——标题已经是名字，正文只留一句话说明，只读提示和「名称」输入框都去掉，自建团的编辑表单不受影响；专家详情弹窗定死高度，「概览／知识」页签切换不再跳动。'},
  {id:'18',date:'2026-09-20 10:15',iconBg:'#fef3ea',iconColor:'#e8792d',type:'优化',module:'协作开发',author:'吴宏超',team:'专家团去掉固定运行流程',body:'专家团不再展示写死的「运行流程」和人工确认节点——专家团是动态组队，谁做哪一步由编排在运行时决定，配置弹窗现在只定义团队（名称、成员、能力覆盖）和触发词；专家详情弹窗加宽到跟专家团弹窗一样（720px），「概览／知识」页签切换时高度基本不跳动；「一句话交给 expert-manager」的入口只在第一个页签显示；知识「＋ 添加」改为独立模态框，左边勾选目录、右边看目录内容，确定才生效。'},
  {id:'17',date:'2026-09-20 10:15',iconBg:'#e8f4ff',iconColor:'#1a73e8',type:'功能',module:'协作开发',author:'吴宏超',team:'专家新增知识页签',body:'专家新增独立的「知识」页签，形态跟智能体开发的知识页签同构：左边一列关联目录（勾选框+名字+篇数），右边文档卡片，支持添加、上传；知识与能力项挂钩，目录声明服务哪些能力项，专家勾了对应能力项即自动带出目录并标注服务哪项能力，也支持手动追加不对应能力项的目录；文档支持预览；专家详情弹窗顶部新增「概览／知识」页签，概览与知识分开看，不再堆一起越拉越长；专家管理卡片新增「知识」统计。'},
  {id:'16',date:'2026-09-18 11:00',iconBg:'#f0e6ff',iconColor:'#7c3aed',type:'功能',module:'系统通知',author:'吴晓锋',team:'新增用户行为分析页面',body:'新增用户行为分析页面，包含 KPI 指标概览、开发模式分布、增长趋势、功能使用排行、技能调用排名及错误分析六大统计模块。'},
  {id:'15',date:'2026-09-14 09:30',iconBg:'#fff1e8',iconColor:'#ff8d42',type:'优化',module:'应用开发',author:'吴晓锋',team:'应用开发列表 新建体验优化',body:'去除新建应用弹窗，新建应用流程调整为下拉选择应用开发类型，跳转到新会话。'},
  {id:'14',date:'2026-09-14 09:30',iconBg:'#e8faef',iconColor:'#08a040',type:'功能',module:'协作开发',author:'吴宏超',team:'专家团支持人工审核确认节点',body:'专家团运行流程可在任意步骤后插入人工审核确认节点，到该节点编排暂停、确认后才继续；专家能力项由机器标识改为中文名加等级展示，专家卡片增加「可承担的工作」，专家团补充领域标签与能力覆盖；专家定义去掉「工作方式」「完成标准」，改为把需要用户提供的内容写进触发词占位符，发送时没填就在会话里追问；专家来源合并为「Lingee 内置」与「我创建的」两档，取消无数据支撑的「金蝶官方」；专家详情收敛为简介、触发词、挂载技能、能力项、可承担的工作五项；修复搜索框被浏览器自动填充账号导致列表被筛空。'},
  {id:'13',date:'2026-09-11 14:00',iconBg:'#fce4ec',iconColor:'#e53935',type:'功能',module:'新会话',author:'吴晓锋',team:'会话加号下拉菜单',body:'会话输入框加号按钮改为下拉菜单，提供添加文件（含本地文件、引用文件夹、知识库）、模式（含 Spec、目标）、连接器（含腾讯云等八项服务）三级菜单结构。'},
  {id:'12',date:'2026-09-09 10:45',iconBg:'#e0f7fa',iconColor:'#00838f',type:'功能',module:'协作开发',author:'吴晓锋',team:'新增协作开发模块',body:'左侧「专家」菜单改为「协作开发」，下设任务管理、待评审、协作人员管理、专家管理、专家团管理与设置六个页签；新增项目维度，任务、评审、协作人员按项目划分，专家与专家团为全局资产、项目内只绑定默认专家团。'},
  {id:'11',date:'2026-09-08 16:20',iconBg:'#eef3ff',iconColor:'#495dff',type:'功能',module:'系统通知',author:'吴晓锋',team:'原型新增登录页',body:'新增登录页，需账号密码登录后才能查看原型。'},
  {id:'10',date:'2026-08-27 09:15',iconBg:'#eef3ff',iconColor:'#495dff',type:'功能',module:'应用开发',author:'吴晓锋',team:'苍穹应用开发 · 预览区新增列表页签',body:'预览面板页签新增「列表」选项，支持列表视图展示。'},
  {id:'9',date:'2026-08-27 09:15',iconBg:'#e8faef',iconColor:'#08a040',type:'功能',module:'应用开发',author:'吴晓锋',team:'苍穹应用开发 · 历史版本',body:'新增历史版本面板，支持查看版本时间线与版本描述，可回退到历史版本。'},
  {id:'8',date:'2026-07-30 13:40',iconBg:'#fff1e8',iconColor:'#ff8d42',type:'功能',module:'系统通知',author:'吴晓锋',team:'新增 Design System 模块',body:'涵盖基础、布局、导航、数据录入、数据展示、反馈 6 大类共 67 个组件，提供组件预览、设计令牌展示、图标库等能力，作为 Lingee 统一的设计规范与组件文档平台。'},
  {id:'7',date:'2026-07-28 10:30',iconBg:'#eef3ff',iconColor:'#495dff',type:'优化',module:'应用开发',author:'吴晓锋',team:'应用开发关联应用交互优化',body:'1、会话框：项目选择与应用选择分开展示\n2、下拉面板去除创建应用流程，调整为关联选择全量应用\n3、苍穹应用：选择关联苍穹应用，发起会话时应用开发列表自动创建展示苍穹应用卡片\n4、通用应用：无需关联应用，自动生成产物应用卡片\n5、未选择开发模式，意图识别苍穹应用开发时，会话过程收集苍穹应用编码\n6、选择应用时，下次新会话按项目记忆用户选项\n\n[视觉稿](https://www.figma.com/design/F8s5P9Y8f1Bq2GkXKCkC7L/%E5%BC%80%E5%8F%91?node-id=0-1&t=DHlFenPtUNP6C7Z5-1)'},
];
// 每个数据条目对应的 avatar SVG 图标（与 Build_demo 的 lucide 图标一致）
var changelogIcons={
  '41':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M3 6h18M3 12h12M3 18h6"/></svg>',
  '40':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="8" cy="7" r="1" fill="currentColor"/><circle cx="8" cy="12" r="1" fill="currentColor"/><circle cx="8" cy="17" r="1" fill="currentColor"/></svg>',
  '39':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3m4 0h3"/></svg>',
  '38':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>',
  '37':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="8" rx="1"/></svg>',
  '36':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></svg>',
  '35':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>',
  '34':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>',
  '33':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M3 6h12M3 12h7M3 18h4"/><path d="M17 8V4m0 0l-3 3m0 0l3-3m0 0l3 3"/><path d="M17 16v4m0 0l-3-3m3 3l3-3"/></svg>',
  '32':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  '31':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></svg>',
  '29':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  '28':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
  '27':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  '26':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  '25':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></svg>',
  '24':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  '23':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  '22':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>',
  '16':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M4 6h10M18 6h2"/><circle cx="16" cy="6" r="2"/><path d="M4 12h4M12 12h8"/><circle cx="10" cy="12" r="2"/><path d="M4 18h10M18 18h2"/><circle cx="16" cy="18" r="2"/></svg>',
  '15':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M12 5v14M5 12h14"/></svg>',
  '14':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/></svg>',
  '13':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M12 5v14M5 12h14"/></svg>',
  '12':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>',
  '11':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>',
  '9':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.36 2.64L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg>',
  '10':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
  '8':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125 0-.945.748-1.688 1.688-1.688h1.999c3.586 0 6.539-2.918 6.539-6.5C22 6.48 17.5 2 12 2z"/></svg>',
  '7':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
  '6':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M12 3a9 9 0 0 0 0 18M3 12h18"/></svg>',
  '5':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
};
var changelogReadIds=(function(){
  try{ return JSON.parse(localStorage.getItem('changelog_read_ids')||'[]'); }catch(e){return [];}
})();
function saveReadIds(){ localStorage.setItem('changelog_read_ids',JSON.stringify(changelogReadIds)); }
function getUnreadCount(){ return changelogData.filter(function(l){return changelogReadIds.indexOf(l.id)===-1;}).length; }
function formatRelativeDate(dateStr){
  return dateStr;
}
var menuBadge=$('#changelogMenuBadge'),changelogBody=$('#changelogBody');
var currentType='all',currentModule='all',currentAuthor='all';
var typeColors={'功能':['var(--brand-fill)','var(--brand)'],'优化':['#fff1e8','#e8792d'],'修复':['#fef0f0','#e33']};
function updateBadge(){
  var c=getUnreadCount();
  if(!menuBadge) return;
  if(c>0){ menuBadge.style.display=''; }
  else{ menuBadge.style.display='none'; }
}
function getFilteredData(){
  return changelogData.filter(function(l){
    if(currentType!=='all'&&l.type!==currentType) return false;
    if(currentModule!=='all'&&l.module!==currentModule) return false;
    if(currentAuthor!=='all'&&l.author!==currentAuthor) return false;
    return true;
  });
}
function renderChangelog(){
  var list=getFilteredData();
  if(list.length===0){
    changelogBody.innerHTML='<div class="changelog-empty">暂无通知</div>';
    return;
  }
  var html='<table class="changelog-table">';
  html+='<thead><tr><th class="c-type">类型</th><th class="c-module">模块</th><th class="c-content">更新内容</th><th class="c-author">更新人</th><th class="c-date">时间</th></tr></thead><tbody>';
  list.forEach(function(log){
    var tc=typeColors[log.type]||['#eee','#333'];
    html+='<tr class="changelog-row" data-id="'+log.id+'">';
    html+='<td class="c-type"><span class="changelog-type-tag" style="background:'+tc[0]+';color:'+tc[1]+'">'+log.type+'</span></td>';
    html+='<td class="c-module">'+log.module+'</td>';
    html+='<td class="c-content"><div class="c-title">'+log.team+'</div><div class="c-desc">';
    log.body.split('\n').forEach(function(line,li){
      if(line==='') html+='<br>';
      else html+='<span>'+line.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,function(m,text,url){
        return '<a href="'+url+'" target="_blank" class="changelog-link">'+text+'</a>';
      })+'</span> ';
    });
    html+='</div></td>';
    html+='<td class="c-author">'+log.author+'</td>';
    html+='<td class="c-date">'+formatRelativeDate(log.date)+'</td>';
    html+='</tr>';
  });
  html+='</tbody></table>';
  changelogBody.innerHTML=html;
  var demoLink=changelogBody.querySelector('a[href="#demo"]');
  if(demoLink){
    demoLink.addEventListener('click',function(e){
      e.preventDefault();
      showView('newtask');
      setNavActive('新会话');
      applyMode('苍穹应用',true);
      setTimeout(function(){ openAppDropdown(); },250);
    });
  }
}
function initFilters(){
  var typeFilter=$('#changelogTypeFilter');
  var moduleFilter=$('#changelogModuleFilter');
  var authorFilter=$('#changelogAuthorFilter');
  if(typeFilter){
    var types=['功能','优化','修复'];
    var allBtn0=document.createElement('button');
    allBtn0.className='changelog-filter-chip active';allBtn0.textContent='全部';allBtn0.dataset.value='all';
    typeFilter.appendChild(allBtn0);
    types.forEach(function(t){
      var btn=document.createElement('button');
      btn.className='changelog-filter-chip';btn.textContent=t;btn.dataset.value=t;
      typeFilter.appendChild(btn);
    });
    typeFilter.addEventListener('click',function(e){
      var chip=e.target.closest('.changelog-filter-chip');if(!chip) return;
      typeFilter.querySelectorAll('.changelog-filter-chip').forEach(function(c){c.classList.remove('active');});
      chip.classList.add('active');currentType=chip.dataset.value;renderChangelog();
    });
  }
  if(moduleFilter){
    var modules=[];
    changelogData.forEach(function(l){ if(modules.indexOf(l.module)===-1) modules.push(l.module); });
    var allBtn=document.createElement('button');
    allBtn.className='changelog-filter-chip active';allBtn.textContent='全部';allBtn.dataset.value='all';
    moduleFilter.appendChild(allBtn);
    modules.forEach(function(m){
      var btn=document.createElement('button');
      btn.className='changelog-filter-chip';btn.textContent=m;btn.dataset.value=m;
      moduleFilter.appendChild(btn);
    });
    moduleFilter.addEventListener('click',function(e){
      var chip=e.target.closest('.changelog-filter-chip');if(!chip) return;
      moduleFilter.querySelectorAll('.changelog-filter-chip').forEach(function(c){c.classList.remove('active');});
      chip.classList.add('active');currentModule=chip.dataset.value;renderChangelog();
    });
  }
  if(authorFilter){
    var authors=[];
    changelogData.forEach(function(l){ if(authors.indexOf(l.author)===-1) authors.push(l.author); });
    var allBtn2=document.createElement('button');
    allBtn2.className='changelog-filter-chip active';allBtn2.textContent='全部';allBtn2.dataset.value='all';
    authorFilter.appendChild(allBtn2);
    authors.forEach(function(a){
      var btn=document.createElement('button');
      btn.className='changelog-filter-chip';btn.textContent=a;btn.dataset.value=a;
      authorFilter.appendChild(btn);
    });
    authorFilter.addEventListener('click',function(e){
      var chip=e.target.closest('.changelog-filter-chip');if(!chip) return;
      authorFilter.querySelectorAll('.changelog-filter-chip').forEach(function(c){c.classList.remove('active');});
      chip.classList.add('active');currentAuthor=chip.dataset.value;renderChangelog();
    });
  }
}
export function openChangelog(){
  showView('changelog');
  $$('.nav-item').forEach(function(n){n.classList.remove('active')});
  renderChangelog();
  changelogData.forEach(function(l){ if(changelogReadIds.indexOf(l.id)===-1) changelogReadIds.push(l.id); });
  saveReadIds(); updateBadge();
}
export function initChangelog() {
  initFilters();
  updateBadge();
}
