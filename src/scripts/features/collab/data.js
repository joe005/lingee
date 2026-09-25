import { renderTaskBoard, renderTaskSummary } from './task-board.js';
import { cvOpenConversation } from './chat.js';
import { STAGES } from '../expert/data.js';
/* 协作开发：项目 / 任务 / 评审 / 人员数据与卡片渲染
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ============================================================
   协作开发（任务管理 / 待评审 / 协作人员 / 专家 / 专家团 / 设置）
   任务、评审、协作人员数据与交互移植自协作开发原型稿
   ============================================================ */
/* 项目维度：任务 / 评审 / 协作人员按项目分；专家与专家团为全局资产，项目内只绑定默认专家团
   协作人员为「引用」关系：项目通过 members 引用人员基础资料（CV_MEMBERS）的 id，不再由成员反向挂项目
   项目归属工作区（workspace），工作区为顶层组织单元 */
var CV_PROJECTS=[
  {id:'expense',name:'费用报销应用',desc:'报销、审批与支付集成全流程开发',goal:'实现费用报销全流程线上化，覆盖申请、审批、支付集成与预算控制',dot:'blue',defaultTeam:'kingdee-saas-implementation',status:'in_progress',priority:'高',owner:'吴宏超',repo:'https://github.com/kingdee/expense-app',start:'2026-08-01',end:'2026-11-30',milestones:[{name:'需求确认',date:'2026-08-15'},{name:'方案评审通过',date:'2026-09-10'},{name:'开发完成',date:'2026-10-31'},{name:'上线发布',date:'2026-11-30'}],members:['p22','p01','p02','p03','p04','p05','p07','p08','p09','p10','p12','p15','p20','p21'],workspace:'ws-app'},
  {id:'purchase',name:'采购管理系统',desc:'采购订单、入库与供应商协同重构',goal:'重构采购从下单到入库的协同流程，提升供应商协同效率与数据准确率',dot:'orange',defaultTeam:'cosmic-app-dev',status:'in_progress',priority:'中',owner:'李工',repo:'https://github.com/kingdee/purchase-ms',start:'2026-09-01',end:'2027-01-31',milestones:[{name:'需求定稿',date:'2026-09-20'},{name:'核心流程开发',date:'2026-11-30'},{name:'集成测试',date:'2026-12-31'},{name:'上线',date:'2027-01-31'}],members:['p22','p01','p02','p06','p07','p11','p12','p14','p15','p17','p19','p20','p21'],workspace:'ws-app'},
  {id:'supply',name:'供应链协同平台',desc:'供应商评级、订单协同与交付预测',goal:'搭建供应商协同与评级平台，支持订单协同、资质管理与交付预测',dot:'green',defaultTeam:'general-app-dev',status:'planned',priority:'低',owner:'赵琳',repo:'',start:'2026-10-15',end:'2027-03-31',milestones:[{name:'方案设计',date:'2026-11-15'},{name:'门户对接',date:'2027-01-31'},{name:'评级模型上线',date:'2027-03-31'}],members:['p22','p01','p03','p04','p13','p14','p15','p16','p18','p20','p21'],workspace:'ws-build'},
  {id:'production',name:'生产制造执行系统',desc:'生产排程、工单管理与产能分析',goal:'实现生产全流程数字化，覆盖工单派发、工序跟踪、产能分析与质量追溯',dot:'blue',defaultTeam:'cosmic-app-dev',status:'in_progress',priority:'高',owner:'吴宏超',repo:'https://github.com/kingdee/mes-app',start:'2026-08-15',end:'2026-12-31',milestones:[{name:'需求调研',date:'2026-08-30'},{name:'核心功能开发',date:'2026-10-31'},{name:'联调测试',date:'2026-11-30'},{name:'上线交付',date:'2026-12-31'}],members:['p22','p01','p02','p03','p04','p05','p07'],workspace:'ws-app'},
  {id:'service',name:'客户服务工单平台',desc:'工单流转、SLA监控与客户满意度分析',goal:'搭建客户服务工单全生命周期管理平台，支持多渠道接入、智能派单与SLA自动监控',dot:'orange',defaultTeam:'general-app-dev',status:'in_progress',priority:'中',owner:'吴宏超',repo:'',start:'2026-09-01',end:'2027-01-15',milestones:[{name:'需求确认',date:'2026-09-25'},{name:'工单引擎开发',date:'2026-11-15'},{name:'渠道对接',date:'2026-12-15'},{name:'上线',date:'2027-01-15'}],members:['p22','p01','p04','p05','p07'],workspace:'ws-app'},
  {id:'hr-analytics',name:'人力数据分析平台',desc:'组织画像、人效指标与离职预测',goal:'构建人力数据自助分析平台，支持组织画像可视化、人效指标看板与离职风险预警',dot:'green',defaultTeam:'general-app-dev',status:'planned',priority:'中',owner:'赵琳',repo:'',start:'2026-10-01',end:'2027-02-28',milestones:[{name:'指标体系设计',date:'2026-10-20'},{name:'数据管道搭建',date:'2026-12-15'},{name:'看板上线',date:'2027-02-28'}],members:['p22','p03','p04','p05'],workspace:'ws-build'},
  {id:'warehouse',name:'智能仓储管理平台',desc:'库位优化、出入库协同与库存预警',goal:'搭建智能仓储管理平台，支持库位动态优化、扫码出入库协同与库存实时预警',dot:'blue',defaultTeam:'cosmic-app-dev',status:'in_progress',priority:'高',owner:'李工',repo:'',start:'2026-08-20',end:'2026-12-20',milestones:[{name:'仓储模型设计',date:'2026-09-15'},{name:'出入库开发',date:'2026-10-31'},{name:'预警上线',date:'2026-11-30'},{name:'验收交付',date:'2026-12-20'}],members:['p22','p01','p02','p03','p07'],workspace:'ws-app'},
  {id:'lingee-prototype',name:'Lingee 原型开发平台',desc:'高保真交互原型与协作开发平台建设',goal:'构建 Lingee 高保真原型，支持协作开发、任务管理与专家协作全流程',dot:'green',defaultTeam:'cosmic-app-dev',status:'in_progress',priority:'高',owner:'吴晓峰',repo:'https://github.com/kingdee/lingee-prototype',start:'2026-07-01',end:'2026-12-31',milestones:[{name:'需求与设计定稿',date:'2026-08-01'},{name:'核心功能开发',date:'2026-10-15'},{name:'联调测试',date:'2026-11-30'},{name:'上线交付',date:'2026-12-31'}],members:['p01','p02','p03','p04','p05','p06','p07','p08','p09','p10','p11','p12','p13','p14','p15','p16','p17','p18','p19','p20','p21','p22','p23'],workspace:'ws-build'}
];

/* 项目范围演示：吴宏超负责费用报销应用和智能合同工作台，参与其余项目。 */
var CV_ROLE_DEMO_PROJECTS=[
  {id:'demo-contract',name:'智能合同工作台',desc:'合同起草、审批和归档流程优化',goal:'缩短合同处理周期，统一审批与归档记录',dot:'blue',defaultTeam:'general-app-dev',status:'in_progress',priority:'中',owner:'吴宏超',repo:'',start:'2026-09-01',end:'2026-12-31',members:['p22','p04','p05'],workspace:'ws-app'},
  {id:'demo-inventory',name:'库存协同门户',desc:'仓储、采购和业务团队共享库存动态',goal:'统一库存查询和补货协作',dot:'orange',defaultTeam:'cosmic-app-dev',status:'planned',priority:'中',owner:'李工',repo:'',start:'2026-09-15',end:'2027-01-31',members:['p02','p22','p07'],workspace:'ws-app'},
  {id:'demo-quality',name:'质量巡检平台',desc:'巡检计划、问题跟踪和整改闭环',goal:'让质量问题从发现到处理可追踪',dot:'green',defaultTeam:'general-app-dev',status:'in_progress',priority:'高',owner:'赵琳',repo:'',start:'2026-08-20',end:'2026-12-15',members:['p04','p22','p05'],workspace:'ws-app'}
];
CV_PROJECTS.push(...CV_ROLE_DEMO_PROJECTS.map(function(project){return {...project,members:project.members.slice()};}));

/* 工作区：顶层的组织单元，项目归属工作区 */
var CV_WORKSPACES=[
  {id:'ws-build',name:'灵基Build'},
  {id:'ws-app',name:'Build应用开发组'},
  {id:'ws-quality',name:'Build质量与安全组'},
  {id:'ws-skill',name:'Build智能体/Skills开发组'}
];
var CV_WORKSPACE_STORE_KEY='lingee-collab-workspaces-v1';
function cvPersistWorkspaces(){
  try{localStorage.setItem(CV_WORKSPACE_STORE_KEY,JSON.stringify(CV_WORKSPACES));return true;}
  catch(e){return false;}
}
function cvRestoreWorkspaces(){
  try{
    var rows=JSON.parse(localStorage.getItem(CV_WORKSPACE_STORE_KEY)||'null');
    if(Array.isArray(rows)&&rows.length) CV_WORKSPACES.splice(0,CV_WORKSPACES.length,...rows.filter(function(row){return row&&row.id&&row.name;}));
  }catch(e){}
}
var cvProject='';                    /* 空串 = 全部项目（个人视角的聚合视图） */
var cvWorkspace='';                  /* 空串 = 全部工作区；工作区为项目上层组织单元 */
var cvConfigOverride={};             /* {项目id:{配置卡 key:是否项目覆盖}} */
function cvProjectById(id){
  for(var i=0;i<CV_PROJECTS.length;i++){ if(CV_PROJECTS[i].id===id) return CV_PROJECTS[i]; }
  return null;
}
function cvProjectName(id){ var p=cvProjectById(id); return p?p.name:'未归属项目'; }
function cvWorkspaceById(id){
  for(var i=0;i<CV_WORKSPACES.length;i++){ if(CV_WORKSPACES[i].id===id) return CV_WORKSPACES[i]; }
  return null;
}
function cvWorkspaceName(id){ var w=cvWorkspaceById(id); return w?w.name:'未归属工作区'; }
/* 项目是否属于当前工作区（cvWorkspace 为空 = 全部） */
function cvProjectInWorkspace(projId){
  if(!cvWorkspace) return true;
  var p=cvProjectById(projId);
  return !!p && p.workspace===cvWorkspace;
}
function cvInProject(row){
  /* 工作区过滤：任务/评审所属项目须属于当前工作区 */
  if(row.project && !cvProjectInWorkspace(row.project)) return false;
  if(!cvProject) return true;
  if(row.projects) return row.projects==='*'||row.projects.indexOf(cvProject)>=0;
  return row.project===cvProject;
}
function cvProjectTag(row){
  if(cvProject) return '';           /* 项目态下不必重复显示项目名 */
  return '<span class="cv-proj-tag">'+cvProjectName(row.project)+'</span>';
}

var CV_TASKS = [
  {type:'需求',size:'大',source:'Jira',sourceId:'PROJ-42',exec:'专家团',status:'待评审',collab:'Agent间协作',title:'审批流插件代码审查',desc:'审查费用报销审批流的插件实现，包括多级审批流转逻辑和异常处理',assignee:'王工',progress:0,project:'expense',parentTaskId:'epic-expense-approval'},
  {type:'Bug',size:'小',source:'TAPD',sourceId:'BUG-7831',exec:'自动执行',status:'进行中',collab:'人Agent协作',title:'报销金额精度丢失修复',desc:'当报销金额含小数时，后端 BigDecimal 序列化后精度丢失',assignee:'郑凯',progress:62,project:'expense',parentTaskId:'epic-expense-core'},
  {type:'需求',size:'小',source:'对话自建',sourceId:'CNV-001',exec:'自动执行',status:'已完成',collab:'无需协作',title:'费用类型新增团建费选项',desc:'在费用类型下拉中增加团建费选项，归属部门活动费用类别',assignee:'吴芳',progress:100,project:'expense',parentTaskId:'epic-expense-core'},
  {type:'任务',size:'大',source:'Jira',sourceId:'PROJ-56',exec:'专家团',status:'未开始',collab:'人人协作',title:'权限体系重构',desc:'基于 RBAC 模型重构权限体系，支持角色分级、数据权限和功能权限分离',assignee:'宋宇',progress:0,project:'expense',parentTaskId:'epic-expense-perm'},
  {type:'改进',size:'小',source:'API',sourceId:'API-12',exec:'自动执行',status:'已完成',collab:'无需协作',title:'批量导出 Excel 格式支持',desc:'当前仅支持 CSV 导出，需要增加 Excel 格式导出功能',assignee:'蒋雯',progress:100,project:'expense',parentTaskId:'epic-expense-misc'},
  {type:'Bug',size:'小',source:'Jira',sourceId:'BUG-7845',exec:'自动执行',status:'未开始',collab:'人Agent协作',title:'附件上传偶发 502 错误',desc:'附件上传在弱网环境下偶发 502 错误，需要增加重试机制',assignee:'待分配',progress:0,project:'expense',parentTaskId:'epic-expense-misc'},
  {type:'需求',size:'大',source:'Jira',sourceId:'PROJ-61',exec:'专家团',status:'未开始',collab:'人人协作',title:'多级审批流性能优化',desc:'当前审批流在多级审批场景下存在性能瓶颈，需要优化审批流转逻辑',assignee:'待分配',progress:0,project:'expense',parentTaskId:'epic-expense-approval'},
  {type:'任务',size:'大',source:'TAPD',sourceId:'TASK-203',exec:'专家团',status:'待评审',collab:'Agent间协作',title:'审批流多级流转设计',desc:'设计多级审批流转逻辑，支持串行、并行、会签等多种审批模式',assignee:'王工',progress:0,project:'expense',parentTaskId:'epic-expense-approval'},
  {type:'改进',size:'小',source:'对话自建',sourceId:'CNV-003',exec:'自动执行',status:'进行中',collab:'人Agent协作',title:'打印模板优化',desc:'优化报销单打印模板，支持自定义页眉页脚和水印',assignee:'陈晨',progress:35,project:'expense',parentTaskId:'epic-expense-core'},
  {type:'Bug',size:'小',source:'TAPD',sourceId:'BUG-7852',exec:'自动执行',status:'已完成',collab:'无需协作',title:'列表搜索响应慢修复',desc:'当报销单数据量超过 5000 条时，列表页搜索响应时间超过 10 秒',assignee:'唐辉',progress:100,project:'expense',parentTaskId:'epic-expense-core'},
  {type:'需求',size:'大',source:'Jira',sourceId:'PROJ-68',exec:'专家团',status:'未开始',collab:'人人协作',title:'多币种报销支持',desc:'支持多币种报销，包括汇率转换、币种选择和金额展示逻辑',assignee:'待分配',progress:0,project:'expense',parentTaskId:'epic-expense-misc'},
  {type:'任务',size:'小',source:'对话自建',sourceId:'CNV-005',exec:'自动执行',status:'已完成',collab:'人Agent协作',title:'数据字典维护',desc:'维护费用类型、审批层级、权限角色等数据字典',assignee:'梁平',progress:100,project:'expense',parentTaskId:'epic-expense-core'},
  {type:'Bug',size:'大',source:'Jira',sourceId:'BUG-7901',exec:'专家团',status:'已失败',collab:'Agent间协作',title:'审批流死锁问题修复',desc:'并发审批场景下出现死锁，需要重构审批流的锁机制',assignee:'孙明',progress:0,project:'expense',parentTaskId:'epic-expense-approval'},
  {type:'改进',size:'小',source:'API',sourceId:'API-18',exec:'自动执行',status:'未开始',collab:'无需协作',title:'移动端审批页面适配',desc:'当前审批页面在移动端显示异常，需要做响应式适配',assignee:'待分配',progress:0,project:'expense',parentTaskId:'epic-expense-approval'},
  {type:'需求',size:'大',source:'Jira',sourceId:'PROJ-75',exec:'专家团',status:'进行中',collab:'人人协作',title:'预算控制模块开发',desc:'新增预算控制模块，支持按部门/项目/月份设置预算上限，超标自动拦截',assignee:'李工',progress:45,project:'expense',parentTaskId:'epic-expense-perm'},
  {type:'任务',size:'小',source:'TAPD',sourceId:'TASK-215',exec:'自动执行',status:'未开始',collab:'人Agent协作',title:'审批日志查询接口',desc:'开发审批日志查询接口，支持按时间、人员、状态筛选',assignee:'待分配',progress:0,project:'expense',parentTaskId:'epic-expense-approval'},
  {type:'Bug',size:'小',source:'对话自建',sourceId:'CNV-008',exec:'自动执行',status:'已完成',collab:'无需协作',title:'日期格式显示不一致',desc:'不同页面日期格式不一致，有的显示 yyyy-MM-dd 有的显示 yyyy/MM/dd',assignee:'张工',progress:100,project:'expense',parentTaskId:'epic-expense-core'},
  {type:'需求',size:'大',source:'飞书',sourceId:'FS-33',exec:'专家团',status:'未开始',collab:'Agent间协作',title:'移动端审批流开发',desc:'开发移动端审批流程，支持微信/钉钉/飞书消息通知和审批操作',assignee:'周杰',progress:0,project:'expense',parentTaskId:'epic-expense-approval'},
  {type:'需求',size:'大',source:'Jira',sourceId:'PUR-18',exec:'专家团',status:'进行中',collab:'人人协作',title:'采购订单批量导入',desc:'支持 Excel 批量导入采购订单，含供应商匹配、价格校验与错误行回执',assignee:'李工',progress:38,project:'purchase',parentTaskId:'epic-purchase-order'},
  {type:'Bug',size:'小',source:'TAPD',sourceId:'BUG-8102',exec:'自动执行',status:'待评审',collab:'人Agent协作',title:'采购入库单反审核报错',desc:'反审核已关联付款单的入库单时抛空指针，需补充关联校验与提示',assignee:'刘洋',progress:0,project:'purchase',parentTaskId:'epic-purchase-flow'},
  {type:'任务',size:'小',source:'对话自建',sourceId:'CNV-011',exec:'自动执行',status:'已完成',collab:'无需协作',title:'采购订单列表新增供应商筛选',desc:'列表页筛选区增加供应商下拉，支持按编码与名称模糊匹配',assignee:'韩梅',progress:100,project:'purchase',parentTaskId:'epic-purchase-order'},
  {type:'改进',size:'大',source:'Jira',sourceId:'PUR-25',exec:'专家团',status:'未开始',collab:'人人协作',title:'采购价格审批链重构',desc:'按金额分级审批，超阈值自动加签采购总监，并保留完整审批留痕',assignee:'待分配',progress:0,project:'purchase',parentTaskId:'epic-purchase-flow'},
  {type:'需求',size:'大',source:'飞书',sourceId:'FS-52',exec:'专家团',status:'进行中',collab:'Agent间协作',title:'供应商协同门户对接',desc:'打通供应商门户的订单确认与交期回复，含消息推送与状态回写',assignee:'冯远',progress:52,project:'supply',parentTaskId:'epic-supply-collab'},
  {type:'任务',size:'小',source:'API',sourceId:'API-31',exec:'自动执行',status:'未开始',collab:'人Agent协作',title:'交期变更消息推送',desc:'交期变更时向采购员推送企业微信消息，推送失败进入重试队列',assignee:'待分配',progress:0,project:'supply',parentTaskId:'epic-supply-collab'},
  {type:'Bug',size:'小',source:'Jira',sourceId:'BUG-8155',exec:'自动执行',status:'已失败',collab:'Agent间协作',title:'供应商评级定时任务超时',desc:'评级任务在供应商超 2 万条时超时中断，需要改为分片执行',assignee:'罗静',progress:0,project:'supply',parentTaskId:'epic-supply-rating'},
  {type:'需求',size:'小',source:'对话自建',sourceId:'CNV-014',exec:'自动执行',status:'已完成',collab:'无需协作',title:'供应商档案资质到期提醒',desc:'资质到期前 30 天在档案列表标红，并向对接采购员推送提醒',assignee:'何欣',progress:100,project:'supply',parentTaskId:'epic-supply-rating'},
  /* 历史任务的父任务：把种子数据里原本独立的任务按业务主题挂到父任务下 */
  {boardId:'epic-expense-approval',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-EXPAPR',status:'进行中',title:'审批流引擎',desc:'费用报销的多级审批流转、性能与移动端审批能力',acceptance:'支持串行/并行/会签，大并发下响应达标，移动端可正常审批',files:[],assignee:'吴宏超',priority:'高',project:'expense',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-expense-core',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-EXPCORE',status:'进行中',title:'报销单基础功能',desc:'报销单录入、打印、查询与数据字典等基础能力',acceptance:'核心录入与查询链路无阻断缺陷，打印与格式展示一致',files:[],assignee:'吴宏超',priority:'高',project:'expense',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-expense-perm',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-EXPPERM',status:'未开始',title:'权限与预算管控',desc:'基于 RBAC 的权限体系重构与部门/项目预算控制',acceptance:'权限变更实时生效，预算超标可自动拦截',files:[],assignee:'吴宏超',priority:'高',project:'expense',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-expense-misc',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-EXPMISC',status:'未开始',title:'多币种与附件优化',desc:'多币种报销、批量导出与附件上传稳定性优化',acceptance:'多币种报销可正常提交审批，附件上传弱网下可重试成功',files:[],assignee:'吴宏超',priority:'高',project:'expense',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-purchase-order',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-PURORD',status:'进行中',title:'采购订单管理',desc:'采购订单的批量导入与列表筛选能力',acceptance:'批量导入含校验与错误行回执，列表筛选按供应商准确命中',files:[],assignee:'李工',priority:'中',project:'purchase',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-purchase-flow',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-PURFLOW',status:'未开始',title:'采购流程优化',desc:'采购入库反审核与价格审批链的流程重构',acceptance:'反审核关联校验通过，价格审批按金额分级并留痕',files:[],assignee:'李工',priority:'中',project:'purchase',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-supply-collab',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-SUPCOLLAB',status:'进行中',title:'供应商协同对接',desc:'供应商门户对接与交期变更消息推送',acceptance:'订单确认与交期回复状态可正确回写，推送失败可重试',files:[],assignee:'赵琳',priority:'低',project:'supply',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-supply-rating',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-SUPRATE',status:'未开始',title:'供应商评级与档案',desc:'供应商评级定时任务与资质到期提醒',acceptance:'评级任务分片执行不超时，资质到期前可提前提醒',files:[],assignee:'赵琳',priority:'低',project:'supply',progress:0,artifacts:[],activity:[]},
  /* Lingee 原型开发平台：父任务与子任务 */
  {boardId:'epic-lingee-ui',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEEUI',status:'进行中',title:'原型界面与交互',desc:'原型整体页面架构、样式统一与交互细节优化',acceptance:'核心页面布局完整、样式一致、交互流畅',files:[],assignee:'吴晓峰',priority:'高',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-collab',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEECOLLAB',status:'进行中',title:'协作开发模块',desc:'协作开发页面拆分、任务管理、人员与专家管理',acceptance:'页面按归属拆分、任务与人员管理链路完整',files:[],assignee:'吴晓峰',priority:'高',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-data',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEEDATA',status:'进行中',title:'数据与任务管理',desc:'项目数据持久化、筛选联动与产物中心',acceptance:'数据持久化可靠、筛选联动正确、产物按项目沉淀',files:[],assignee:'吴晓峰',priority:'中',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-auth',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEEAUTH',status:'已完成',title:'用户认证与登录',desc:'登录页、账号密码验证与会话保持',acceptance:'登录验证安全可靠，会话不过期',files:[],assignee:'周杰',priority:'高',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-sidebar',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEESIDEBAR',status:'已完成',title:'侧边栏导航系统',desc:'左侧导航菜单、用户信息展示与页面切换',acceptance:'导航层级清晰，页面切换无闪烁',files:[],assignee:'何欣',priority:'中',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-workbench',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEEWORKBENCH',status:'进行中',title:'工作台首页',desc:'工作台任务概览、统计面板与快捷入口',acceptance:'统计数据实时准确，快捷入口直达功能',files:[],assignee:'李工',priority:'高',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-taskboard',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEETASKBOARD',status:'进行中',title:'任务看板与流转',desc:'任务看板拖拽、状态流转与详情展开',acceptance:'拖拽流畅、状态流转有动画、详情可折叠',files:[],assignee:'宋宇',priority:'高',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-review',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEEREVIEW',status:'未开始',title:'待评审模块',desc:'评审列表、筛选与评审详情',acceptance:'评审列表按类型筛选准确，详情展示完整',files:[],assignee:'赵琳',priority:'中',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-persons',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEEPERSONS',status:'进行中',title:'协作人员管理',desc:'人员列表、角色管理与权限分配',acceptance:'人员增删改查完整，角色权限可配置',files:[],assignee:'赵琳',priority:'中',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-experts',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEEEXPERTS',status:'未开始',title:'专家管理',desc:'专家列表、专家详情与项目绑定',acceptance:'专家信息完整，项目绑定关系正确',files:[],assignee:'陈晨',priority:'低',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-squads',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEESQUADS',status:'未开始',title:'专家团管理',desc:'专家团列表、成员配置与默认绑定',acceptance:'专家团可配置成员，项目可绑定默认专家团',files:[],assignee:'陈晨',priority:'低',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-settings',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEESETTINGS',status:'进行中',title:'项目设置与配置',desc:'项目信息编辑、成员管理与工作区配置',acceptance:'设置项完整，保存后即时生效',files:[],assignee:'吴芳',priority:'中',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-changelog',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEECHANGELOG',status:'已完成',title:'更新日志与通知',desc:'更新日志独立页面、系统通知铃铛与筛选',acceptance:'日志按类型筛选准确，铃铛通知实时',files:[],assignee:'吴芳',priority:'中',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-design-system',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEEDS',status:'已完成',title:'设计系统组件库',desc:'基础、布局、导航等6大类67个组件文档',acceptance:'组件预览完整，设计令牌展示准确',files:[],assignee:'冯远',priority:'中',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-app-dev',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEEAPPDEV',status:'进行中',title:'应用开发预览',desc:'苍穹应用开发列表、历史版本与预览面板',acceptance:'应用列表展示完整，版本可回退',files:[],assignee:'张工',priority:'高',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-chat',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEECHAT',status:'进行中',title:'AI 对话与会话管理',desc:'会话输入、消息模拟与任务执行联动',acceptance:'对话流畅，任务执行模拟真实',files:[],assignee:'宋宇',priority:'高',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-artifacts',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEEART',status:'未开始',title:'产物与交付物中心',desc:'产物按项目沉淀、附件展示与产物管理',acceptance:'产物按项目分类，附件可预览下载',files:[],assignee:'王工',priority:'中',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-search',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEESEARCH',status:'待评审',title:'全局搜索与筛选',desc:'任务搜索、人员搜索与多维筛选联动',acceptance:'搜索结果准确，筛选联动无遗漏',files:[],assignee:'蒋雯',priority:'低',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-perf',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEEPERF',status:'进行中',title:'性能优化与加载体验',desc:'模块懒加载、DOM 复用与渲染性能优化',acceptance:'首屏加载 < 2s，交互无卡顿',files:[],assignee:'梁平',priority:'中',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {boardId:'epic-lingee-build',kind:'epic',parentTaskId:null,type:'特性',source:'项目规划',sourceId:'FEAT-LINGEEBUILD',status:'已完成',title:'构建工具与打包流程',desc:'Vite 构建、单文件打包与模块自检工具',acceptance:'构建产物可独立打开，自检覆盖全模块',files:[],assignee:'周杰',priority:'高',project:'lingee-prototype',progress:0,artifacts:[],activity:[]},
  {type:'需求',size:'大',source:'Jira',sourceId:'LINGEE-001',exec:'专家团',status:'进行中',collab:'人人协作',title:'原型整体页面架构设计',desc:'设计原型首页、工作台、协作开发等核心页面布局与导航',assignee:'吴晓峰',progress:45,project:'lingee-prototype',parentTaskId:'epic-lingee-ui'},
  {type:'需求',size:'大',source:'Jira',sourceId:'LINGEE-002',exec:'专家团',status:'未开始',collab:'人人协作',title:'协作开发页面拆分重构',desc:'将协作开发按页面拆分 HTML、CSS 和 JS 独立文件',assignee:'王工',progress:0,project:'lingee-prototype',parentTaskId:'epic-lingee-collab'},
  {type:'Bug',size:'小',source:'TAPD',sourceId:'BUG-9001',exec:'自动执行',status:'已完成',collab:'无需协作',title:'侧边栏用户名显示错乱',desc:'侧边栏在不同分辨率下用户名被截断',assignee:'郑凯',progress:100,project:'lingee-prototype',parentTaskId:'epic-lingee-ui'},
  {type:'任务',size:'大',source:'Jira',sourceId:'LINGEE-003',exec:'专家团',status:'进行中',collab:'Agent间协作',title:'任务看板拖拽流转实现',desc:'实现任务看板的状态拖拽和流转动画效果',assignee:'吴晓峰',progress:62,project:'lingee-prototype',parentTaskId:'epic-lingee-collab'},
  {type:'改进',size:'小',source:'对话自建',sourceId:'CNV-020',exec:'自动执行',status:'进行中',collab:'人Agent协作',title:'任务详情交互优化',desc:'优化任务详情展开折叠与折叠记忆',assignee:'陈晨',progress:35,project:'lingee-prototype',parentTaskId:'epic-lingee-collab'},
  {type:'需求',size:'大',source:'Jira',sourceId:'LINGEE-004',exec:'专家团',status:'待评审',collab:'人人协作',title:'专家管理与专家团功能开发',desc:'开发专家管理、专家团列表与项目绑定',assignee:'赵琳',progress:0,project:'lingee-prototype',parentTaskId:'epic-lingee-collab'},
  {type:'Bug',size:'小',source:'TAPD',sourceId:'BUG-9002',exec:'自动执行',status:'未开始',collab:'人Agent协作',title:'弹窗ESC关闭未生效',desc:'部分表单弹窗按 ESC 键无法关闭',assignee:'郑凯',progress:0,project:'lingee-prototype',parentTaskId:'epic-lingee-ui'},
  {type:'任务',size:'小',source:'API',sourceId:'API-40',exec:'自动执行',status:'已完成',collab:'无需协作',title:'项目数据持久化方案实现',desc:'项目数据 localStorage 持久化与恢复机制',assignee:'梁平',progress:100,project:'lingee-prototype',parentTaskId:'epic-lingee-data'},
  {type:'需求',size:'大',source:'飞书',sourceId:'FS-60',exec:'专家团',status:'进行中',collab:'Agent间协作',title:'更新日志页面重构',desc:'更新日志从顶部铃铛改为用户菜单独立页面',assignee:'吴晓峰',progress:52,project:'lingee-prototype',parentTaskId:'epic-lingee-collab'},
  {type:'改进',size:'大',source:'Jira',sourceId:'LINGEE-005',exec:'专家团',status:'未开始',collab:'人人协作',title:'CSS变量统一与样式拆分',desc:'统一样式为 CSS 变量并按页面拆分 CSS 文件',assignee:'冯远',progress:0,project:'lingee-prototype',parentTaskId:'epic-lingee-ui'},
  {type:'Bug',size:'小',source:'TAPD',sourceId:'BUG-9003',exec:'自动执行',status:'已失败',collab:'Agent间协作',title:'任务列表排序失效',desc:'任务列表按状态排序时偶发乱序',assignee:'钱涛',progress:0,project:'lingee-prototype',parentTaskId:'epic-lingee-data'},
  {type:'需求',size:'大',source:'Jira',sourceId:'LINGEE-006',exec:'专家团',status:'进行中',collab:'人人协作',title:'人员管理与权限体系',desc:'开发协作人员管理与角色权限管理',assignee:'赵琳',progress:45,project:'lingee-prototype',parentTaskId:'epic-lingee-collab'},
  {type:'任务',size:'小',source:'对话自建',sourceId:'CNV-021',exec:'自动执行',status:'已完成',collab:'无需协作',title:'任务来源标签样式统一',desc:'统一任务来源标签的视觉样式',assignee:'何欣',progress:100,project:'lingee-prototype',parentTaskId:'epic-lingee-ui'},
  {type:'改进',size:'小',source:'API',sourceId:'API-41',exec:'自动执行',status:'进行中',collab:'人Agent协作',title:'任务筛选器联动优化',desc:'优化任务统计卡与筛选器联动逻辑',assignee:'蒋雯',progress:38,project:'lingee-prototype',parentTaskId:'epic-lingee-data'},
  {type:'需求',size:'大',source:'Jira',sourceId:'LINGEE-007',exec:'专家团',status:'未开始',collab:'人人协作',title:'产物中心交付物管理',desc:'开发产物按项目沉淀与展示功能',assignee:'王工',progress:0,project:'lingee-prototype',parentTaskId:'epic-lingee-data'},
  {type:'Bug',size:'小',source:'TAPD',sourceId:'BUG-9004',exec:'自动执行',status:'已完成',collab:'无需协作',title:'项目列表分页异常',desc:'项目列表分页时数据重复显示',assignee:'刘洋',progress:100,project:'lingee-prototype',parentTaskId:'epic-lingee-data'},
  {type:'任务',size:'大',source:'Jira',sourceId:'LINGEE-008',exec:'专家团',status:'进行中',collab:'人人协作',title:'工作台任务概览开发',desc:'开发工作台任务统计与概览面板',assignee:'李工',progress:55,project:'lingee-prototype',parentTaskId:'epic-lingee-collab'},
  {type:'需求',size:'大',source:'飞书',sourceId:'FS-61',exec:'专家团',status:'待评审',collab:'Agent间协作',title:'任务执行模拟与对话流转',desc:'实现任务执行模拟和会话对话切换',assignee:'宋宇',progress:0,project:'lingee-prototype',parentTaskId:'epic-lingee-collab'},
  {type:'改进',size:'小',source:'对话自建',sourceId:'CNV-022',exec:'自动执行',status:'未开始',collab:'无需协作',title:'任务卡操作按钮优化',desc:'优化任务卡操作按钮排版与间距',assignee:'许诺',progress:0,project:'lingee-prototype',parentTaskId:'epic-lingee-ui'},
  {type:'任务',size:'小',source:'API',sourceId:'API-42',exec:'自动执行',status:'已完成',collab:'人Agent协作',title:'模块自检工具开发',desc:'开发 npm run check 模块自检脚本',assignee:'周杰',progress:100,project:'lingee-prototype',parentTaskId:'epic-lingee-data'}
];

var CV_REVIEW_ARTIFACTS={
0:{tabs:['源代码','技术方案'],content:{
'源代码':'<h1>审批流插件 - 源代码</h1><p>文件: ApprovalFlowPlugin.java</p><pre>public class ApprovalFlowPlugin extends AbstractPlugin {\n  @Override\n  public void execute(ExecutionContext ctx) {\n    ApprovalContext ac = ctx.getApprovalContext();\n    List&lt;ApprovalNode&gt; nodes = ac.getApprovalNodes();\n    for (ApprovalNode node : nodes) {\n      if (node.isTimeout(30, TimeUnit.MINUTES)) {\n        handleTimeout(node, ac);\n        continue;\n      }\n      if (node.getStatus() == NodeStatus.PENDING) {\n        notifyApprover(node);\n      }\n    }\n    // 多级审批流转\n    if (ac.allNodesProcessed()) {\n      ctx.complete();\n    }\n  }\n  private void handleTimeout(ApprovalNode node, ApprovalContext ac) {\n    // 超时自动升级\n    ac.escalateToSuperior(node);\n  }\n}</pre><p>文件: ApprovalFlowService.java</p><pre>public class ApprovalFlowService {\n  public ApprovalResult submit(ExpenseReport report) {\n    ApprovalFlow flow = buildFlow(report);\n    flow.start();\n    return flow.getResult();\n  }\n}</pre>',
'技术方案':'<h1>审批流插件技术方案</h1><h2>1. 概述</h2><p>基于苍穹插件机制实现费用报销多级审批流转，支持串行/并行审批、超时自动升级、异常回退。</p><h2>2. 核心设计</h2><h3>2.1 审批节点模型</h3><table><tr><th>字段</th><th>类型</th><th>说明</th></tr><tr><td>nodeId</td><td>String</td><td>节点唯一标识</td></tr><tr><td>approver</td><td>String</td><td>审批人ID</td></tr><tr><td>status</td><td>Enum</td><td>PENDING/APPROVED/REJECTED</td></tr><tr><td>timeout</td><td>int</td><td>超时时间(分钟)</td></tr></table><h3>2.2 流转规则</h3><ul><li>串行模式：按节点顺序依次审批</li><li>并行模式：同级节点同时审批，全部通过后进入下一级</li><li>超时处理：超过 timeout 分钟自动升级到上级</li></ul><h2>3. 异常处理</h2><ul><li>审批人离职：自动转交代理人</li><li>审批人拒绝：流程回退到发起人</li><li>系统异常：记录日志并发送告警</li></ul>'}},
1:{tabs:['技术方案','需求规格'],content:{
'技术方案':'<h1>多级审批流性能优化方案</h1><h2>1. 性能问题分析</h2><p>当前审批流在 5000+ 并发场景下平均响应时间 > 3s，瓶颈在数据库查询和节点状态同步。</p><h2>2. 优化方案</h2><h3>2.1 缓存优化</h3><ul><li>审批节点状态缓存到 Redis，TTL 5 分钟</li><li>批量查询替代循环单条查询</li></ul><h3>2.2 异步化</h3><ul><li>通知发送改为异步消息队列</li><li>超时检查改为定时任务批量扫描</li></ul><h3>2.3 数据库优化</h3><table><tr><th>优化项</th><th>预计提升</th></tr><tr><td>索引优化</td><td>40%</td></tr><tr><td>分页查询</td><td>30%</td></tr><tr><td>读写分离</td><td>20%</td></tr></table>',
'需求规格':'<h1>需求规格说明书 - PRD</h1><h2>1. 背景与目标</h2><p>随着报销业务量增长，现有审批流在高峰期出现严重性能瓶颈，需要优化以支持千人并发审批。</p><h2>2. 功能需求</h2><h3>2.1 性能指标</h3><ul><li>支持 1000+ 并发审批</li><li>平均响应时间 < 500ms</li><li>99.9% 请求在 1s 内完成</li></ul><h3>2.2 兼容性</h3><ul><li>向下兼容现有审批流配置</li><li>支持灰度发布</li></ul>'}},
2:{tabs:['技术方案','需求规格','源代码'],content:{
'技术方案':'<h1>权限体系重构技术方案 - Spec</h1><h2>1. 设计目标</h2><p>基于 RBAC 模型重构权限体系，实现数据权限与功能权限分离，支持角色继承和细粒度授权。</p><h2>2. 权限模型</h2><h3>2.1 角色层级</h3><table><tr><th>层级</th><th>角色</th><th>权限范围</th></tr><tr><td>L1</td><td>系统管理员</td><td>全部</td></tr><tr><td>L2</td><td>部门管理员</td><td>本部门</td></tr><tr><td>L3</td><td>普通用户</td><td>个人数据</td></tr></table><h3>2.2 权限类型</h3><ul><li>功能权限：菜单、按钮、API 接口</li><li>数据权限：行级、列级过滤</li><li>字段权限：字段可见/可编辑</li></ul>',
'需求规格':'<h1>权限体系重构需求规格</h1><h2>1. 业务背景</h2><p>当前权限体系不支持角色继承，数据权限与功能权限耦合，维护成本高。</p><h2>2. 功能需求</h2><ul><li>支持角色继承，子角色自动继承父角色权限</li><li>数据权限支持行级过滤（按部门/项目）</li><li>支持字段级权限控制</li><li>权限变更实时生效，无需重新登录</li></ul>',
'源代码':'<h1>权限服务 - 源代码</h1><pre>public class PermissionService {\n  public boolean hasPermission(String userId, String resource, String action) {\n    List&lt;Role&gt; roles = roleService.getUserRoles(userId);\n    return roles.stream().anyMatch(r ->\n      r.hasPermission(resource, action) ||\n      (r.getParent() != null && r.getParent().hasPermission(resource, action))\n    );\n  }\n  public DataFilter getDataFilter(String userId, String resource) {\n    List&lt;Role&gt; roles = roleService.getUserRoles(userId);\n    return DataFilterComposer.compose(roles, resource);\n  }\n}</pre>'}},
3:{tabs:['源代码','技术方案'],content:{
'源代码':'<h1>打印模板优化 - 源代码</h1><pre>public class PrintTemplateRenderer {\n  public byte[] render(ExpenseReport report, TemplateConfig config) {\n    Workbook wb = new XSSFWorkbook();\n    Sheet header = wb.createSheet("报销单");\n    // 页眉\n    if (config.hasHeader()) {\n      renderHeader(header, config.getHeader());\n    }\n    // 水印\n    if (config.hasWatermark()) {\n      addWatermark(wb, config.getWatermark());\n    }\n    // 数据行\n    renderRows(header, report.getItems());\n    return wb.getBytes();\n  }\n}</pre>',
'技术方案':'<h1>打印模板优化方案</h1><h2>1. 需求</h2><p>支持自定义页眉页脚、水印、多页打印、Excel 格式输出。</p><h2>2. 技术选型</h2><ul><li>基于 Apache POI 5.x 生成 Excel</li><li>水印通过 Sheet 背景图实现</li><li>页眉页脚通过 HeaderFooter API</li></ul>'}},
4:{tabs:['源代码','单元测试'],content:{
'源代码':'<h1>附件上传 502 修复 - 源代码</h1><pre>public class AttachmentUploadHandler {\n  @Override\n  public UploadResult handle(UploadRequest req) {\n    int maxRetry = 3;\n    for (int i = 0; i &lt; maxRetry; i++) {\n      try {\n        return uploadToStorage(req.getFile());\n      } catch (StorageException e) {\n        if (i == maxRetry - 1) throw e;\n        Thread.sleep(1000 * (i + 1)); // 指数退避\n      }\n    }\n    throw new StorageException("Upload failed after retries");\n  }\n}</pre>',
'单元测试':'<h1>附件上传 - 单元测试报告</h1><h2>测试用例</h2><table><tr><th>用例</th><th>输入</th><th>预期</th><th>结果</th></tr><tr><td>正常上传</td><td>1MB 文件</td><td>成功</td><td>✅ 通过</td></tr><tr><td>弱网重试</td><td>模拟 502</td><td>重试 3 次后成功</td><td>✅ 通过</td></tr><tr><td>超时</td><td>10s 超时</td><td>返回超时错误</td><td>✅ 通过</td></tr><tr><td>空文件</td><td>0 字节</td><td>拒绝上传</td><td>✅ 通过</td></tr></table><p>覆盖率: 95% | 通过: 4/4</p>'}},
5:{tabs:['需求规格','源代码'],content:{
'需求规格':'<h1>需求规格 - 团建费选项</h1><h2>1. 需求描述</h2><p>在费用类型下拉中增加"团建费"选项，归属"部门活动费用"类别。</p><h2>2. 验收标准</h2><ul><li>费用类型下拉列表中可见"团建费"</li><li>选择后归属类别显示为"部门活动费用"</li><li>报销统计报表中可按团建费维度统计</li></ul>'}},
6:{tabs:['需求规格'],content:{
'需求规格':'<h1>多币种报销需求规格 - PRD</h1><h2>1. 业务背景</h2><p>随着国际化业务扩展，员工出差涉及多币种报销，需支持原币金额与本位币金额双重记录。</p><h2>2. 功能需求</h2><h3>2.1 币种管理</h3><ul><li>支持人民币(CNY)、美元(USD)、欧元(EUR)、日元(JPY)、港币(HKD)</li><li>币种汇率每日自动更新，支持手动调整</li></ul><h3>2.2 报销录入</h3><ul><li>选择币种后自动带出当日汇率</li><li>原币金额 + 汇率 = 本位币金额（自动计算，可手动修正）</li><li>同一报销单支持多币种明细行</li></ul><h2>3. 验收标准</h2><table><tr><th>场景</th><th>预期</th></tr><tr><td>单币种报销</td><td>正常提交审批</td></tr><tr><td>多币种混合报销</td><td>按行汇总本位币金额</td></tr><tr><td>汇率手动修正</td><td>记录修正人和修正时间</td></tr></table>'}},
7:{tabs:['测试用例','测试报告','源代码'],content:{
'测试用例':'<h1>费用明细列表页 - 测试用例</h1><h2>测试场景</h2><table><tr><th>用例</th><th>输入</th><th>预期</th><th>优先级</th></tr><tr><td>正常分页查询</td><td>page=1,size=20</td><td>返回 20 条数据</td><td>P0</td></tr><tr><td>大数据量查询</td><td>10000 条数据</td><td>响应 &lt; 500ms</td><td>P0</td></tr><tr><td>模糊搜索</td><td>keyword="差旅"</td><td>返回含"差旅"的记录</td><td>P1</td></tr><tr><td>时间范围筛选</td><td>startDate ~ endDate</td><td>返回范围内数据</td><td>P1</td></tr><tr><td>空结果处理</td><td>查无数据</td><td>显示"暂无数据"</td><td>P2</td></tr><tr><td>权限过滤</td><td>普通用户</td><td>仅返回本人数据</td><td>P0</td></tr></table>',
'测试报告':'<h1>费用明细列表页 - 测试报告</h1><h2>执行结果</h2><table><tr><th>用例</th><th>结果</th><th>备注</th></tr><tr><td>正常分页查询</td><td>✅ 通过</td><td>-</td></tr><tr><td>大数据量查询</td><td>✅ 通过</td><td>平均 280ms</td></tr><tr><td>模糊搜索</td><td>✅ 通过</td><td>-</td></tr><tr><td>时间范围筛选</td><td>✅ 通过</td><td>-</td></tr><tr><td>空结果处理</td><td>✅ 通过</td><td>-</td></tr><tr><td>权限过滤</td><td>❌ 失败</td><td>部门管理员可见下级数据，实际返回空</td></tr></table><p>通过: 5/6 | 覆盖率: 87%</p>',
'源代码':'<h1>费用明细列表页 - 源代码</h1><pre>public class ExpenseDetailListService {\n  public PageResult&lt;ExpenseDetail&gt; query(ExpenseQuery query) {\n    // 权限过滤\n    if (!query.getUser().isAdmin()) {\n      query.setUserId(query.getUser().getId());\n    }\n    // 分页查询\n    return expenseDetailDao.selectByPage(query, query.getPage(), query.getSize());\n  }\n}</pre>'}},
8:{tabs:['部署方案','运维手册'],content:{
'部署方案':'<h1>审批流插件部署方案</h1><h2>1. 部署策略</h2><h3>1.1 灰度发布</h3><ul><li>第一阶段：10% 流量灰度，观察 2 小时</li><li>第二阶段：50% 流量，观察 4 小时</li><li>第三阶段：100% 全量发布</li></ul><h3>1.2 回滚方案</h3><ul><li>自动回滚：错误率 &gt; 5% 时自动触发</li><li>手动回滚：一键切换到旧版本</li><li>数据回滚：审批流状态数据不回滚，仅回滚插件代码</li></ul><h2>2. 监控告警</h2><table><tr><th>指标</th><th>阈值</th><th>告警方式</th></tr><tr><td>审批流错误率</td><td>&gt; 1%</td><td>钉钉 + 邮件</td></tr><tr><td>审批响应时间</td><td>&gt; 2s</td><td>钉钉</td></tr><tr><td>审批队列积压</td><td>&gt; 100 条</td><td>钉钉 + 短信</td></tr></table>',
'运维手册':'<h1>审批流插件 - 运维手册</h1><h2>1. 常用命令</h2><pre># 查看插件状态\nkubectl get pods -l app=approval-flow-plugin\n\n# 查看插件日志\nkubectl logs -f deployment/approval-flow-plugin\n\n# 回滚到上一版本\nkubectl rollout undo deployment/approval-flow-plugin</pre><h2>2. 常见问题</h2><h3>2.1 审批流卡住</h3><ul><li>检查 Redis 连接是否正常</li><li>检查审批节点状态是否为 PENDING</li><li>查看审批超时配置是否生效</li></ul><h3>2.2 性能下降</h3><ul><li>检查数据库索引是否生效</li><li>检查缓存命中率</li><li>查看是否有慢查询</li></ul>'}}
};
var CV_REVIEW_COMMENTS={
0:[{author:'李工',avatar:'李',type:'comment',text:'代码结构清晰，但建议将审批超时逻辑抽离为独立的 TimeoutHandler 类，提高可测试性。',time:'今日 14:20'},{author:'陈晨',avatar:'陈',type:'comment',text:'单元测试覆盖了多级审批场景，但缺少异常分支测试（审批人离职、系统异常等）。',time:'今日 15:30'}],
1:[{author:'王工',avatar:'王',type:'comment',text:'缓存方案合理，但需要考虑 Redis 宕机时的降级策略。建议增加本地缓存兜底。',time:'昨日 16:00'},{author:'张工',avatar:'张',type:'pass',text:'方案整体可行，性能指标满足要求。同意推进。',time:'今日 09:15'}],
2:[{author:'王工',avatar:'王',type:'comment',text:'RBAC 模型设计合理，角色继承逻辑需要补充循环依赖检测。',time:'2 天前 10:00'},{author:'陈晨',avatar:'陈',type:'comment',text:'数据权限行级过滤方案需要验证大数据量下的性能。',time:'昨日 14:30'},{author:'李工',avatar:'李',type:'reject',text:'PermissionService.hasPermission 方法在角色链较深时性能有问题，建议增加缓存。',time:'今日 11:00'}],
3:[{author:'陈晨',avatar:'陈',type:'comment',text:'水印实现方案可行，但多页打印时页眉需要每页重复渲染。',time:'3 小时前'}],
4:[{author:'刘洋',avatar:'刘',type:'comment',text:'指数退避策略合理，但建议增加熔断机制，避免连续重试拖垮系统。',time:'1 小时前'}],
5:[{author:'吴芳',avatar:'吴',type:'pass',text:'需求简单明确，实现完整，同意合入。',time:'昨日 14:30'}],
6:[{author:'王工',avatar:'王',type:'comment',text:'多币种需求描述清晰，但汇率自动更新的时间需要明确（每日凌晨还是实时？）',time:'今日 10:00'}],
7:[{author:'李工',avatar:'李',type:'reject',text:'权限过滤用例失败，部门管理员可见下级数据的逻辑有 Bug，需要修复后重新提交。',time:'今日 14:00'},{author:'陈晨',avatar:'陈',type:'comment',text:'测试用例覆盖了主要场景，建议增加并发查询的用例。',time:'今日 15:30'}],
8:[{author:'王工',avatar:'王',type:'comment',text:'灰度发布策略合理，建议第一阶段缩短到 1 小时。',time:'昨日 16:00'}]
};

var CV_REVIEWS = [
  {type:'任务',size:'大',source:'Jira',exec:'专家团',priority:'紧急',reviewType:'代码评审',title:'审批流插件代码审查',desc:'审查费用报销审批流的插件实现，包括多级审批流转逻辑和异常处理',reviewer:'王工',reviewerRole:'架构人员',deadline:'今日 18:00',deadlineColor:'var(--danger)',borderColor:'var(--danger)',from:'张工',fromTime:'今日 10:30',artifacts:['源代码','单元测试','技术方案'],project:'expense'},
  {type:'需求',size:'大',source:'Jira',exec:'专家团',priority:'高',reviewType:'方案评审',title:'多级审批流性能优化方案',desc:'当前审批流在多级审批场景下存在性能瓶颈，需要优化审批流转逻辑',reviewer:'王工',reviewerRole:'架构人员',deadline:'明日 12:00',deadlineColor:'var(--warning)',borderColor:'var(--warning)',from:'张工',fromTime:'昨日 16:20',artifacts:['技术方案','需求规格'],project:'expense'},
  {type:'任务',size:'大',source:'Jira',exec:'专家团',priority:'中',reviewType:'方案评审',title:'权限体系重构方案评审',desc:'基于 RBAC 模型重构权限体系，支持角色分级、数据权限和功能权限分离',reviewer:'张工',reviewerRole:'开发人员',deadline:'3 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'赵琳',fromTime:'2 天前',artifacts:['技术方案','需求规格','源代码'],project:'expense'},
  {type:'改进',size:'小',source:'对话自建',exec:'自动执行',priority:'中',reviewType:'代码评审',title:'打印模板优化方案评审',desc:'优化报销单打印模板，支持自定义页眉页脚和水印',reviewer:'陈晨',reviewerRole:'测试人员',deadline:'2 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'陈晨',fromTime:'3 小时前',artifacts:['源代码','技术方案'],project:'expense'},
  {type:'Bug',size:'小',source:'TAPD',exec:'自动执行',priority:'紧急',reviewType:'代码评审',title:'附件上传 502 修复方案评审',desc:'附件上传在弱网环境下偶发 502 错误的重试机制实现',reviewer:'张工',reviewerRole:'开发人员',deadline:'今日 20:00',deadlineColor:'var(--danger)',borderColor:'var(--danger)',from:'孙明',fromTime:'1 小时前',artifacts:['源代码','单元测试'],project:'expense'},
  {type:'需求',size:'小',source:'对话自建',exec:'自动执行',priority:'低',reviewType:'需求评审',title:'费用类型新增选项评审',desc:'在费用类型下拉中增加团建费选项的实现',reviewer:'吴芳',reviewerRole:'需求人员',deadline:'5 天后',deadlineColor:'var(--success)',borderColor:'var(--dot-blue)',from:'吴芳',fromTime:'昨日 14:00',artifacts:['需求规格','源代码'],project:'expense'},
  {type:'需求',size:'大',source:'Jira',exec:'专家团',priority:'高',reviewType:'需求评审',title:'多币种报销需求规格评审',desc:'支持多币种报销，含汇率转换、原币金额与本位币金额双重记录',reviewer:'赵琳',reviewerRole:'需求人员',deadline:'明日 18:00',deadlineColor:'var(--warning)',borderColor:'var(--warning)',from:'王工',fromTime:'今日 09:00',artifacts:['需求规格'],project:'expense'},
  {type:'任务',size:'大',source:'Jira',exec:'专家团',priority:'中',reviewType:'测试评审',title:'费用明细列表页测试用例评审',desc:'审查费用明细列表页的测试用例覆盖度，包括边界值、异常场景、性能场景',reviewer:'陈晨',reviewerRole:'测试人员',deadline:'3 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'李工',fromTime:'昨日 11:00',artifacts:['测试用例','测试报告','源代码'],project:'expense'},
  {type:'任务',size:'中',source:'TAPD',exec:'专家团',priority:'中',reviewType:'部署评审',title:'审批流插件部署方案评审',desc:'审批流插件灰度发布方案，含回滚策略和监控告警配置',reviewer:'周杰',reviewerRole:'运维人员',deadline:'4 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'王工',fromTime:'2 天前 15:00',artifacts:['部署方案','运维手册'],project:'expense'},
  {type:'需求',size:'大',source:'Jira',exec:'专家团',priority:'高',reviewType:'方案评审',title:'采购价格审批链重构方案',desc:'按金额分级审批与超阈值自动加签的流程设计，含审批留痕方案',reviewer:'冯远',reviewerRole:'架构人员',deadline:'明日 10:00',deadlineColor:'var(--warning)',borderColor:'var(--warning)',from:'李工',fromTime:'今日 09:20',artifacts:['技术方案','需求规格'],project:'purchase'},
  {type:'Bug',size:'小',source:'TAPD',exec:'自动执行',priority:'中',reviewType:'代码评审',title:'采购入库单反审核校验补充',desc:'反审核关联付款单的校验实现与回归用例',reviewer:'张工',reviewerRole:'开发人员',deadline:'3 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'刘洋',fromTime:'今日 11:40',artifacts:['源代码','单元测试'],project:'purchase'},
  {type:'需求',size:'大',source:'飞书',exec:'专家团',priority:'紧急',reviewType:'需求评审',title:'供应商协同门户对接需求规格',desc:'订单确认与交期回复的字段口径、异常处理与状态回写规则',reviewer:'张工',reviewerRole:'开发人员',deadline:'今日 20:00',deadlineColor:'var(--danger)',borderColor:'var(--danger)',from:'冯远',fromTime:'今日 08:50',artifacts:['需求规格','技术方案'],project:'supply'}
];

/* 人员基础资料（全局主数据，独立维护）：项目/团队通过 id（pid）引用，不在人员身上挂项目 */
var CV_MEMBERS = [
  {id:'p01',name:'张工',email:'zhang***@kingdee.com',dept:'研发部',workspaceRole:'system_admin',roles:[{tag:'member-tag--dev',text:'开发'},{tag:'member-tag--arch',text:'架构'}],status:'available',source:'直接成员',isMe:true},
  {id:'p02',name:'李工',email:'li***@kingdee.com',dept:'研发部',roles:[{tag:'member-tag--dev',text:'开发'}],status:'available',source:'直接成员'},
  {id:'p03',name:'王工',email:'wang***@kingdee.com',dept:'研发部',roles:[{tag:'member-tag--dev',text:'开发'},{tag:'member-tag--arch',text:'架构'}],status:'busy',source:'直接成员'},
  {id:'p04',name:'赵琳',email:'zha***@kingdee.com',dept:'产品部',workspaceRole:'project_manager',roles:[{tag:'member-tag--pm',text:'需求'},{tag:'member-tag--pm',text:'产品'}],status:'available',source:'继承自 灵基AIOS'},
  {id:'p05',name:'陈晨',email:'chen***@kingdee.com',dept:'测试部',roles:[{tag:'member-tag--qa',text:'测试'}],status:'available',source:'直接成员'},
  {id:'p06',name:'刘洋',email:'liu***@kingdee.com',dept:'测试部',roles:[{tag:'member-tag--qa',text:'测试'}],status:'busy',source:'直接成员'},
  {id:'p07',name:'周杰',email:'zhou***@kingdee.com',dept:'运维部',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'直接成员'},
  {id:'p08',name:'孙明',email:'sun***@kingdee.com',dept:'运维部',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'继承自 灵基AIOS'},
  {id:'p09',name:'吴芳',email:'wu***@kingdee.com',dept:'产品部',roles:[{tag:'member-tag--pm',text:'需求'}],status:'available',source:'直接成员'},
  {id:'p10',name:'郑凯',email:'zheng***@kingdee.com',dept:'研发部',roles:[{tag:'member-tag--dev',text:'开发'}],status:'busy',source:'直接成员'},
  {id:'p11',name:'钱涛',email:'qian***@kingdee.com',dept:'研发部',roles:[{tag:'member-tag--dev',text:'开发'}],status:'available',source:'直接成员'},
  {id:'p12',name:'宋宇',email:'song***@kingdee.com',dept:'产品部',roles:[{tag:'member-tag--pm',text:'产品'}],status:'available',source:'继承自 灵基AIOS'},
  {id:'p13',name:'冯远',email:'feng***@kingdee.com',dept:'架构部',roles:[{tag:'member-tag--arch',text:'架构'}],status:'available',source:'直接成员'},
  {id:'p14',name:'许诺',email:'xu***@kingdee.com',dept:'研发部',roles:[{tag:'member-tag--dev',text:'开发'},{tag:'member-tag--arch',text:'架构'}],status:'busy',source:'直接成员'},
  {id:'p15',name:'蒋雯',email:'jiang***@kingdee.com',dept:'产品部',roles:[{tag:'member-tag--pm',text:'需求'},{tag:'member-tag--pm',text:'产品'}],status:'available',source:'继承自 灵基AIOS'},
  {id:'p16',name:'何欣',email:'he***@kingdee.com',dept:'产品部',roles:[{tag:'member-tag--pm',text:'需求'}],status:'available',source:'直接成员'},
  {id:'p17',name:'韩梅',email:'han***@kingdee.com',dept:'测试部',roles:[{tag:'member-tag--qa',text:'测试'}],status:'available',source:'直接成员'},
  {id:'p18',name:'罗静',email:'luo***@kingdee.com',dept:'测试部',roles:[{tag:'member-tag--qa',text:'测试'}],status:'busy',source:'直接成员'},
  {id:'p19',name:'杨帆',email:'yang***@kingdee.com',dept:'运维部',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'直接成员'},
  {id:'p20',name:'唐辉',email:'tang***@kingdee.com',dept:'运维部',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'继承自 灵基AIOS'},
  {id:'p21',name:'梁平',email:'liang***@kingdee.com',dept:'产品部',roles:[{tag:'member-tag--pm',text:'产品'},{tag:'member-tag--owner',text:'所有者'}],status:'available',source:'直接成员'},
  {id:'p22',name:'吴宏超',email:'',dept:'产品部',workspaceRole:'system_admin',roles:[],status:'available',source:'演示人员'},
  {id:'p23',name:'吴晓峰',email:'6686612@qq.com',dept:'产品部',workspaceRole:'system_admin',roles:[{tag:'member-tag--pm',text:'产品'},{tag:'member-tag--owner',text:'所有者'}],status:'available',source:'直接成员'}
];
function cvWorkspaceMembers(workspace){
  if(!workspace)return [];
  if(Array.isArray(workspace.peopleIds))return workspace.peopleIds;
  return Array.from(new Set(CV_PROJECTS.filter(function(project){return project.workspace===workspace.id;})
    .flatMap(function(project){return project.members||[];})));
}
function cvPeopleInWorkspace(){
  var workspace=cvWorkspaceById(cvWorkspace);
  var ids=cvWorkspaceMembers(workspace);
  return CV_MEMBERS.filter(function(person){return ids.includes(person.id);});
}
function cvWorkspaceRole(person){
  var workspace=cvWorkspaceById(cvWorkspace);
  return workspace?.roles?.[person?.id]||person?.workspaceRole||'member';
}
function cvCanAccessWorkspace(id,name){
  var workspace=cvWorkspaceById(id);
  if(!workspace||!name)return false;
  if(workspace.creatorName===name)return true;
  var person=CV_MEMBERS.find(function(row){return row.name===name;});
  return !!person&&cvWorkspaceMembers(workspace).includes(person.id);
}
function cvAddPersonToWorkspace(person,role){
  var workspace=cvWorkspaceById(cvWorkspace);
  if(!workspace||!person?.id)return false;
  var previous=workspace.peopleIds;
  var previousRoles=workspace.roles;
  var ids=cvWorkspaceMembers(workspace);
  workspace.peopleIds=Array.from(new Set(ids.concat(person.id)));
  workspace.roles={...(workspace.roles||{})};
  if(role)workspace.roles[person.id]=role;
  if(cvPersistWorkspaces())return true;
  workspace.peopleIds=previous;
  workspace.roles=previousRoles;
  return false;
}
function cvCreateWorkspace(name,desc,creator){
  if(!name||!creator?.id)return null;
  var workspace={id:'ws-'+Date.now(),name:name,desc:desc||'',creatorName:creator.name,peopleIds:[creator.id],roles:{[creator.id]:'system_admin'}};
  CV_WORKSPACES.push(workspace);
  if(cvPersistWorkspaces())return workspace;
  CV_WORKSPACES.pop();
  return null;
}
function cvGenProjectCode(project){
  var match=String(project?.repo||'').match(/\/([^/]+?)(?:\.git)?\/?$/);
  return (match?match[1]:String(project?.id||'PROJECT')).replace(/[^a-zA-Z0-9-]/g,'-').toUpperCase();
}

/* ---------- 人员基础资料：引用与查询 ---------- */
function cvPersonById(id){
  if(!id)return null;
  for(var i=0;i<CV_MEMBERS.length;i++){ if(CV_MEMBERS[i].id===id||CV_MEMBERS[i].userId===id||(CV_MEMBERS[i].linkedUserIds||[]).includes(id)) return CV_MEMBERS[i]; }
  return null;
}
function cvPersonName(id){ var p=cvPersonById(id); return p?p.name:'已移除'; }
/* 当前登录用户姓名（演示数据按登录账号挂钩，不再写死某个人） */
function cvCurrentUserName(){
  try{ var n=(document.getElementById('userName')||{}).textContent||''; return n.trim(); }catch(e){ return ''; }
}
function cvIsMe(p){ return !!(p && p.name && p.name===cvCurrentUserName()); }
/* 当前项目（或「全部项目」）引用的协作人员，人员管理跟着项目走 */
function cvProjectPersons(){
  if(!cvProject) return CV_MEMBERS.slice();
  var proj=cvProjectById(cvProject);
  var ids=proj?(proj.members||[]):[];
  return CV_MEMBERS.filter(function(m){ return ids.indexOf(m.id)>=0; });
}
function cvPeopleInProject(project){
  var ids=project&&Array.isArray(project.members)?project.members:[];
  return CV_MEMBERS.filter(function(person){return ids.includes(person.id);});
}
var CV_PERSON_STORE_KEY='lingee-collab-persons-v1';
function cvPersistPersons(){
  try{ localStorage.setItem(CV_PERSON_STORE_KEY,JSON.stringify(CV_MEMBERS)); return true; }catch(e){return false;}
}
function cvRestorePersons(){
  try{
    var raw=localStorage.getItem(CV_PERSON_STORE_KEY); if(!raw) return;
    var arr=JSON.parse(raw);
    if(Array.isArray(arr)&&arr.length){ CV_MEMBERS.length=0; arr.forEach(function(m){if(!m.workspaceRole&&m.id==='p01')m.workspaceRole='system_admin';if(!m.workspaceRole&&m.id==='p04')m.workspaceRole='project_manager';CV_MEMBERS.push(m);}); }
    cvMergeDuplicateCurrentUser();
  }catch(e){}
}
/* 旧版演示数据曾按不同登录标识重复加入同一账号，统一回 p22 并保留外部 ID 映射。 */
function cvMergeDuplicateCurrentUser(){
  var matches=CV_MEMBERS.filter(function(person){return person.name==='吴宏超';});
  if(!matches.length)return;
  var primary=matches.find(function(person){return person.id==='p22';})||matches[0];
  if(matches.length===1&&primary.id==='p22')return;
  var oldIds=matches.map(function(person){return person.id;});
  var aliases=new Set();
  matches.forEach(function(person){
    [person.id,person.userId].concat(person.linkedUserIds||[]).filter(Boolean).forEach(function(id){aliases.add(id);});
    if(!primary.phone&&person.phone)primary.phone=person.phone;
    if(!primary.email&&person.email)primary.email=person.email;
  });
  var linked=matches.find(function(person){return person.email==='wuhc2023@gmail.com'&&person.userId;})||matches.find(function(person){return person.userId;});
  if(!primary.userId&&linked)primary.userId=linked.userId;
  primary.id='p22';
  primary.workspaceRole='system_admin';
  primary.linkedUserIds=Array.from(aliases).filter(function(id){return id!=='p22'&&id!==primary.userId;});
  CV_MEMBERS.splice(0,CV_MEMBERS.length,...CV_MEMBERS.filter(function(person){return person===primary||person.name!=='吴宏超';}));
  var projectsChanged=false;
  CV_PROJECTS.forEach(function(project){
    var ids=project.members||[];
    var next=Array.from(new Set(ids.map(function(id){return oldIds.includes(id)?'p22':id;})));
    if(next.length!==ids.length||next.some(function(id,index){return id!==ids[index];})){project.members=next;projectsChanged=true;}
  });
  cvPersistPersons();
  if(projectsChanged)cvPersistProjects();
}

/* 项目增改落 localStorage，刷新页面不丢（持久化与数据同源，放这里避免模块循环依赖） */
var CV_PROJ_STORE_KEY='lingee-collab-projects-v2';
function cvPersistProjects(){
  try{ localStorage.setItem(CV_PROJ_STORE_KEY,JSON.stringify(CV_PROJECTS)); return true; }catch(e){return false;}
}
function cvRestoreProjects(){
  cvRestoreWorkspaces();
  try{
    var raw=localStorage.getItem(CV_PROJ_STORE_KEY); if(!raw) return;
    var arr=JSON.parse(raw);
    if(Array.isArray(arr)&&arr.length){ CV_PROJECTS.length=0; arr.forEach(function(p){CV_PROJECTS.push(p);}); }
  }catch(e){}
}
function cvEnsureProjectRoleDemoData(){
  var key='lingee-collab-project-role-demos-v1';
  try{if(localStorage.getItem(key))return;}catch(e){}
  var person=CV_MEMBERS.find(function(row){return row.name==='吴宏超';});
  if(!person){
    var personId='p22';
    if(CV_MEMBERS.some(function(row){return row.id===personId;}))personId='p-demo-wuhc';
    person={id:personId,name:'吴宏超',email:'',dept:'产品部',workspaceRole:'system_admin',roles:[],status:'available',source:'演示人员'};
    CV_MEMBERS.push(person);cvPersistPersons();
  }
  var changed=false;
  CV_ROLE_DEMO_PROJECTS.forEach(function(sample){
    var existing=CV_PROJECTS.find(function(project){return project.id===sample.id;});
    if(existing){
      if(person.id!=='p22'&&Array.isArray(existing.members)&&existing.members.includes('p22')){
        existing.members=existing.members.map(function(id){return id==='p22'?person.id:id;});
        changed=true;
      }
      return;
    }
    CV_PROJECTS.push({...sample,members:sample.members.map(function(id){return id==='p22'?person.id:id;})});
    changed=true;
  });
  if(changed)cvPersistProjects();
  try{localStorage.setItem(key,'1');}catch(e){}
}
/* 对已保存的演示项目执行一次成员补齐；之后由项目成员管理正常维护。 */
function cvEnsureCurrentUserProjectDemoData(){
  var key='lingee-collab-current-user-projects-v1';
  try{if(localStorage.getItem(key))return;}catch(e){}
  var person=CV_MEMBERS.find(function(row){return row.id==='p22'&&row.name==='吴宏超';});
  if(!person)return;
  var changed=false;
  CV_PROJECTS.forEach(function(project){
    if(!Array.isArray(project.members))project.members=[];
    if(!project.members.includes(person.id)){project.members.push(person.id);changed=true;}
  });
  var ownedCount=CV_PROJECTS.filter(function(project){return project.owner===person.name;}).length;
  ['expense','demo-contract'].forEach(function(id){
    if(ownedCount>=2)return;
    var project=CV_PROJECTS.find(function(row){return row.id===id;});
    if(project&&project.owner!==person.name){project.owner=person.name;ownedCount++;changed=true;}
  });
  if(changed)cvPersistProjects();
  try{localStorage.setItem(key,'1');}catch(e){}
}

var CV_WORKFLOW = ['需求分析','方案设计','开发实现','代码审查','测试验证','部署发布'];
var CV_WORKFLOW_ROLES = {'需求分析':'需求人员','方案设计':'架构人员','开发实现':'开发人员','代码审查':'开发人员','测试验证':'测试人员','部署发布':'运维人员'};
var CV_THIRD_PARTY_MEMBERS=[
  {name:'钱涛',email:'qian***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
  {name:'宋宇',email:'song***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
  {name:'冯远',email:'feng***@kingdee.com',role:'架构',tag:'member-tag--arch',dept:'架构部'},
  {name:'许诺',email:'xu***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
  {name:'韩梅',email:'han***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
  {name:'罗静',email:'luo***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
  {name:'杨帆',email:'yang***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'},
  {name:'唐辉',email:'tang***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'},
  {name:'蒋雯',email:'jiang***@kingdee.com',role:'需求',tag:'member-tag--pm',dept:'产品部'},
  {name:'何欣',email:'he***@kingdee.com',role:'需求',tag:'member-tag--pm',dept:'产品部'},
  {name:'梁平',email:'liang***@kingdee.com',role:'产品',tag:'member-tag--pm',dept:'产品部'},
  {name:'范晨',email:'fan***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
  {name:'董睿',email:'dong***@kingdee.com',role:'架构',tag:'member-tag--arch',dept:'架构部'},
  {name:'贾旭',email:'jia***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
  {name:'武威',email:'wu***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'}
];

function cvRenderTaskStats(){
  renderTaskSummary();
}
function cvRenderTasks(){
  renderTaskBoard();
}

function cvBuildTaskCard(t,i){
  var typeCls={'需求':'badge-type','Bug':'badge-bug','任务':'badge-task','改进':'badge-improve'}[t.type]||'badge-type';
  var sizeCls=t.size==='大'?'badge-size-l':'badge-size-s';
  var srcCls={'Jira':'source-tag--jira','TAPD':'source-tag--tapd','对话自建':'source-tag--build','API':'source-tag--api','飞书':'source-tag--feishu'}[t.source]||'source-tag--build';
  var execCls=t.exec==='专家团'?'badge-expert':'badge-auto';
  var statusMap={'未开始':'pending','待评审':'review','进行中':'running','已完成':'done','已失败':'fail'};
  var sc=statusMap[t.status]||'pending';
  var nodeMap={'未开始':'需求分析','待评审':'代码审查','进行中':'开发实现','已完成':'部署发布','已失败':'开发实现'};
  var node=nodeMap[t.status]||'需求分析';
  return '<div class="card" data-type="'+t.type+'" data-status="'+t.status+'" data-collab="'+t.collab+'" data-size="'+t.size+'" data-idx="'+i+'">'
    +'<div class="card-top"><div class="card-row">'
    +'<span class="badge '+typeCls+'">'+t.type+'</span>'
    +'<span class="badge '+sizeCls+'">'+t.size+'</span>'
    +'<span class="source-tag '+srcCls+'">'+t.source+'</span>'
    +'<span class="badge-status badge-status--'+sc+'"><span class="badge-status-dot"></span>'+t.status+'</span>'
    +cvProjectTag(t)
    +'</div><span class="badge '+execCls+'">'+t.exec+'</span></div>'
    +'<div class="card-title">'+t.title+'</div>'
    +'<div class="card-desc">'+t.desc+'</div>'
    +'<div class="card-footer"><div class="assignee"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'+t.assignee+'</div><span style="font-size:11px;color:var(--text-soft)">'+t.source+' '+t.sourceId+'</span></div>'
    +'</div>';
}
function cvRenderReviewStats(){
  var el=document.getElementById('cv-review-stats');if(!el)return;
  var rows=CV_REVIEWS.filter(cvInProject);
  var urgent=rows.filter(function(r){return r.priority==='紧急';}).length;
  var mine=rows.filter(function(r){return r.from==='张工';}).length;
  var assigned=rows.filter(function(r){return r.reviewer==='张工';}).length;
  var stats=[
    {num:rows.length,label:'待评审',color:'var(--warning)',filter:'全部待评审'},
    {num:urgent,label:'即将到期',color:'var(--danger)',filter:'紧急'},
    {num:mine,label:'我发起的',color:'var(--dot-blue)',filter:'我发起的'},
    {num:assigned,label:'分配给我',color:'var(--success)',filter:'分配给我的'}
  ];
  el.innerHTML=stats.map(function(s){
    return '<div class="stat" onclick="cvClickReviewStat(this,\''+s.filter+'\')"><div class="stat-num" style="color:'+s.color+'">'+s.num+'</div><div class="stat-label">'+s.label+'</div></div>';
  }).join('');
}
function cvRenderReviews(){
  var grid=document.getElementById('cv-review-grid');if(!grid)return;
  grid.innerHTML=CV_REVIEWS.map(function(r,i){return cvInProject(r)?cvBuildReviewCard(r,i):'';}).join('');
  if(!grid.innerHTML) grid.innerHTML='<div class="x-empty">该项目下没有待评审的内容</div>';
}
function cvBuildReviewCard(r,i){
  var typeCls={'需求':'badge-type','Bug':'badge-bug','任务':'badge-task','改进':'badge-improve'}[r.type]||'badge-type';
  var sizeCls=r.size==='大'?'badge-size-l':'badge-size-s';
  var srcCls={'Jira':'source-tag--jira','TAPD':'source-tag--tapd','对话自建':'source-tag--build','API':'source-tag--api','飞书':'source-tag--feishu'}[r.source]||'source-tag--build';
  var artHtml=r.artifacts.map(function(a){return '<span class="review-artifact">'+a+'</span>';}).join(' · ');
  return '<div class="card" data-idx="'+i+'" onclick="cvOpenReviewDetail('+i+')">'
    +'<div class="card-top"><div class="card-row">'
    +'<span class="badge '+typeCls+'">'+r.type+'</span>'
    +'<span class="badge '+sizeCls+'">'+r.size+'</span>'
    +'<span class="source-tag '+srcCls+'">'+r.source+'</span>'
    +'<span class="badge-status badge-status--review"><span class="badge-status-dot"></span>待评审</span>'
    +cvProjectTag(r)
    +'</div><span class="badge badge-expert">'+r.exec+'</span></div>'
    +'<div class="card-title">'+r.title+'</div>'
    +'<div class="card-desc">'+r.desc+'</div>'
    +'<div class="review-info">'
    +'<div class="review-info-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>评审人: <b>'+r.reviewer+'</b> <span>('+r.reviewerRole+')</span></div>'
    +'<div class="review-info-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="'+r.deadlineColor+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>截止: <b style="color:'+r.deadlineColor+'">'+r.deadline+'</b></div>'
    +'<div class="review-info-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>产物: '+artHtml+'</div>'
    +'</div>'
    +'<div class="card-actions"><span class="card-node"><span class="card-node-dot"></span>'+r.reviewType+'</span><div style="display:flex;gap:4px;margin-left:auto">'
    +'<button class="act-btn act-btn--exec" onclick="event.stopPropagation();cvReviewPass('+i+')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>通过</button>'
    +'<button class="act-btn act-btn--reject" onclick="event.stopPropagation();cvReviewReject('+i+')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>驳回</button>'
    +'<button class="card-view-btn" onclick="event.stopPropagation();cvOpenReviewDetail('+i+')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>查看对话</button>'
    +'</div></div></div>';
}
function cvInjectCardActions(){
  if(document.getElementById('tb-layout')) return;
  document.querySelectorAll('#cv-task-grid .card').forEach(function(card){
    if(card.querySelector('.card-actions'))return;
    var idx=parseInt(card.getAttribute('data-idx'));
    var t=CV_TASKS[idx];if(!t)return;
    var status=t.status;
    var nodeMap={'未开始':'需求分析','待评审':'代码审查','进行中':'开发实现','已完成':'部署发布','已失败':'开发实现'};
    var node=nodeMap[status]||'需求分析';
    var execBtn='<button class="act-btn act-btn--exec" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-exec-overlay\')" title="执行任务"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>执行</button>';
    var transferBtn='<button class="act-btn act-btn--transfer" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-transfer-overlay\')" title="转交任务"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>转交</button>';
    var twistBtn='<button class="act-btn act-btn--twist" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-twist-overlay\')" title="流转任务"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.7"/><polyline points="21 3 21 9 15 9"/></svg>流转</button>';
    var reviewBtn='<button class="act-btn act-btn--review" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-review-overlay\')" title="发起评审"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>评审</button>';
    var viewBtn='<button class="card-view-btn" onclick="event.stopPropagation();cvOpenConversation(this.closest(\'.card\'))" title="查看对话"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>查看对话</button>';
    var btns='';
    if(status==='未开始'){btns=execBtn+transferBtn+twistBtn+reviewBtn;}
    else if(status==='待评审'){btns=reviewBtn+viewBtn;}
    else{btns=viewBtn;card.classList.add('card--clickable');card.onclick=function(e){if(!e.target.closest('.act-btn')&&!e.target.closest('.card-view-btn'))cvOpenConversation(card);};}
    var ad=document.createElement('div');ad.className='card-actions';
    ad.innerHTML='<span class="card-node"><span class="card-node-dot"></span>'+node+'</span><div style="display:flex;gap:4px;margin-left:auto">'+btns+'</div>';
    card.appendChild(ad);
    if(status==='进行中'){}
  });
}

/* cvProject 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set_cvProject(v){ cvProject=v; return v; }
/* cvWorkspace 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set_cvWorkspace(v){ cvWorkspace=v; return v; }

/* ---------- 产物中心：交付物按项目沉淀（左项目右清单，跟着项目走）
   单文件产物用 file（带后缀名）；代码类产物是目录，用 files 列多个文件 ---------- */
var CV_ARTIFACTS=[
  {name:'采购订单列表页',file:'采购订单列表页.html',typeCls:'art-type--doc',typeLabel:'网页',src:'采购订单批量导入',date:'2026-09-21 14:20',project:'purchase'},
  {name:'审批流插件源代码',typeCls:'art-type--code',typeLabel:'代码',src:'审批流插件代码审查',date:'2026-09-21 10:05',project:'expense',files:['ApprovalFlowPlugin.java','ApprovalFlowService.java','ApprovalContext.java','ExpenseReport.java','ApprovalFlowPluginTest.java','plugin.xml','README.md']},
  {name:'多币种报销需求规格',file:'多币种报销需求规格.md',typeCls:'art-type--doc',typeLabel:'文档',src:'多币种报销需求规格评审',date:'2026-09-20 16:30',project:'expense'},
  {name:'费用明细测试用例集',file:'费用明细测试用例集.xlsx',typeCls:'art-type--test',typeLabel:'用例',src:'费用明细列表页测试用例评审',date:'2026-09-19 11:00',project:'expense'},
  {name:'审批流插件部署方案',file:'审批流插件部署方案.md',typeCls:'art-type--plan',typeLabel:'方案',src:'审批流插件部署方案评审',date:'2026-09-19 09:40',project:'expense'},
  {name:'采购订单开放接口定义',file:'采购订单开放接口定义.yaml',typeCls:'art-type--api',typeLabel:'接口',src:'供应商协同门户对接',date:'2026-09-18 15:12',project:'supply'}
];

/* ============================================================
   演示数据：为种子任务补齐「交付产物 / 评审 / 动态」
   种子任务原本没有这三块字段，这里按任务类型与状态补一份可展示的演示数据；
   只补缺失项（undefined / 空数组），不覆盖新建任务里用户操作产生的真实数据。
   ============================================================ */
var CV_ARTIFACT_BY_TYPE={
  '需求':['需求规格说明书.md','验收标准.md','交互原型.html'],
  'Bug':['问题定位报告.md','修复补丁.java','回归测试报告.md'],
  '任务':['技术方案.md','实现代码.java','部署说明.md'],
  '改进':['优化方案.md','改动说明.md','验证报告.md']
};
function cvSeedArtifacts(t){
  var pool=CV_ARTIFACT_BY_TYPE[t.type]||CV_ARTIFACT_BY_TYPE['任务'];
  if(t.status==='待规划'||t.status==='待办'||t.status==='已阻塞'||t.status==='已取消') return [];
  var n=t.status==='已完成'?pool.length:(t.status==='进行中'?1:2);
  return pool.slice(0,n).map(function(name){ return {name:name,stageId:STAGES[0].id,content:'# '+name+'\n\n本地演示产物\n\n任务：'+t.title+'\n任务目标：'+(t.desc||'未填写')+'\n\n此内容用于原型预览，尚未关联实际交付文件。'}; });
}
function cvSeedActivity(t){
  var owner=(t.assignee==='待分配')?'张工':t.assignee;
  var act=[{author:'张工',text:'创建了任务'}];
  if(t.status!=='待规划'&&t.status!=='待办') act.push({author:owner,text:'开始执行任务'});
  if(t.status==='进行中') act.push({author:owner,text:'正在推进实现，当前进度 '+(t.progress||0)+'%'});
  if(t.status==='审核中') act.push({author:owner,text:'提交产出，发起评审'});
  if(t.status==='已完成') act.push({author:'陈晨',text:'评审通过，任务完成'});
  if(t.status==='已阻塞') act.push({author:owner,text:'执行失败，等待人工介入'});
  return act;
}
function cvSeedReviewArtifacts(t){
  return (t.artifacts||[]).map(function(a,i){
    var name=(typeof a==='string')?a:a.name;
    var ver=(typeof a==='string')?'当前版本':(a.version||'当前版本');
    return {id:'ra-'+i,name:name,version:ver};
  });
}
function cvSeedReviewer(t){
  if(t.type==='需求') return '赵琳';
  if(t.type==='Bug') return '张工';
  if(t.type==='改进') return '陈晨';
  return '王工';
}
function cvSeedReviews(t){
  var rt={'需求':'需求评审','Bug':'代码评审','任务':'方案评审','改进':'代码评审'}[t.type]||'代码评审';
  var stageId=STAGES[0].id; /* 种子任务的 t.stage 每次加载都会被重置为第一个环节，评审也挂在同一环节上，保持时间线一致 */
  if(t.status==='审核中'){
    return [{id:'seed-rv-'+t.sourceId+'-1',stageId:stageId,type:rt,round:1,status:'pending',reviewer:cvSeedReviewer(t),requestedBy:'张工',deadline:'2026-09-25',createdAt:'2026-09-22 10:30',artifacts:cvSeedReviewArtifacts(t),subject:{title:t.title,desc:t.desc||'',acceptance:t.acceptance||''},decisions:[]}];
  }
  if(t.status==='进行中'){
    return [{id:'seed-rv-'+t.sourceId+'-1',stageId:stageId,type:'方案评审',round:1,status:'approved',reviewer:'王工',requestedBy:'张工',deadline:'2026-09-19',createdAt:'2026-09-18 15:00',artifacts:cvSeedReviewArtifacts(t),subject:{title:t.title,desc:t.desc||'',acceptance:t.acceptance||''},decisions:[{by:'王工',action:'approve',comment:'方案可行，进入实现。',at:'2026-09-19 10:00'}]}];
  }
  if(t.status==='已完成'){
    return [{id:'seed-rv-'+t.sourceId+'-1',stageId:stageId,type:'代码评审',round:1,status:'approved',reviewer:cvSeedReviewer(t),requestedBy:'张工',deadline:'2026-09-20',createdAt:'2026-09-20 14:00',artifacts:cvSeedReviewArtifacts(t),subject:{title:t.title,desc:t.desc||'',acceptance:t.acceptance||''},decisions:[{by:cvSeedReviewer(t),action:'approve',comment:'实现完整，符合验收标准。',at:'2026-09-20 16:20'}]},{id:'seed-rv-'+t.sourceId+'-2',stageId:stageId,type:'交付评审',round:1,status:'approved',reviewer:'陈晨',requestedBy:'张工',deadline:'2026-09-22',createdAt:'2026-09-22 09:00',artifacts:cvSeedReviewArtifacts(t),subject:{title:t.title,desc:t.desc||'',acceptance:t.acceptance||''},decisions:[{by:'陈晨',action:'approve',comment:'交付产物齐全，通过。',at:'2026-09-22 11:00'}]}];
  }
  return [];
}
/* 自愈迁移：状态枚举改版（未开始/待评审/已失败 -> 待办/审核中/已阻塞），
   把种子数据和 localStorage 里的旧状态值统一换成新枚举，随每次加载自动修正。 */
var CV_STATUS_MIGRATION={'未开始':'待办','待评审':'审核中','已失败':'已阻塞'};
function cvMigrateTaskStatus(t){
  var next=CV_STATUS_MIGRATION[t.status];
  if(next) t.status=next;
}
/* 自愈迁移：把历史遗留在 localStorage 里的「AI开发Agent」占位负责人换成实际的人，
   不管缓存是哪个版本写入的，每次加载都会自动修正，不需要用户手动清缓存。 */
function cvMigrateAgentAssignee(t){
  if(t.assignee && !['AI开发Agent','待分配'].includes(t.assignee)) return;
  var proj=CV_PROJECTS.find(function(p){return p.id===t.project;});
  var members=((proj&&proj.members)||[]).map(cvPersonById).filter(Boolean);
  var pool=members.length?members:CV_MEMBERS;
  var seed=String(t.sourceId||t.boardId||t.title||'').split('').reduce(function(a,c){return a+c.charCodeAt(0);},0);
  t.assignee=(t.stagePlan||[]).find(function(sp){return sp.id===t.stage&&sp.assignee&&sp.assignee!=='待分配';})?.assignee||pool[seed%pool.length].name;
}
function cvSeedTaskDetails(){
  CV_TASKS.forEach(function(t){
    t.kind=t.kind||'task';
    t.boardId=t.boardId||('task-'+String(t.project||'none')+'-'+String(t.sourceId||Date.now()).replace(/[^a-zA-Z0-9_-]/g,'-'));
    delete t.teamId;
    cvMigrateTaskStatus(t);
    cvMigrateAgentAssignee(t);
    (t.stagePlan||[]).forEach(function(sp){ if(!sp.assignee||sp.assignee==='待分配') sp.assignee=t.assignee; });
    if(t.artifacts===undefined) t.artifacts=cvSeedArtifacts(t);
    if(t.activity===undefined||!t.activity.length) t.activity=cvSeedActivity(t);
    if(t.reviews===undefined) t.reviews=cvSeedReviews(t);
    /* 老版演示产物只有文件名，保留名称并补明确标记的预览内容。 */
    t.artifacts=(t.artifacts||[]).map(function(a){
      if(typeof a!=='string'||!Object.values(CV_ARTIFACT_BY_TYPE).some(function(names){return names.includes(a);})) return a;
      return {name:a,stageId:(t.reviews||[]).find(function(r){return (r.artifacts||[]).some(function(x){return x.name===a;});})?.stageId||t.stagePlan?.[0]?.id||STAGES[0].id,content:'# '+a+'\n\n本地演示产物\n\n任务：'+t.title+'\n任务目标：'+(t.desc||'未填写')+'\n\n此内容用于原型预览，尚未关联实际交付文件。'};
    });
  });
}

/* 自愈：确保 Lingee 原型开发平台项目在 localStorage 恢复后仍然存在 */
var CV_PROJ_SEED_LINGEE={id:'lingee-prototype',name:'Lingee 原型开发平台',desc:'高保真交互原型与协作开发平台建设',goal:'构建 Lingee 高保真原型，支持协作开发、任务管理与专家协作全流程',dot:'green',defaultTeam:'cosmic-app-dev',status:'in_progress',priority:'高',owner:'吴晓峰',repo:'https://github.com/kingdee/lingee-prototype',start:'2026-07-01',end:'2026-12-31',milestones:[{name:'需求与设计定稿',date:'2026-08-01'},{name:'核心功能开发',date:'2026-10-15'},{name:'联调测试',date:'2026-11-30'},{name:'上线交付',date:'2026-12-31'}],members:['p01','p02','p03','p04','p05','p06','p07','p08','p09','p10','p11','p12','p13','p14','p15','p16','p17','p18','p19','p20','p21','p22','p23'],workspace:'ws-build'};
function cvEnsureLingeePrototypeData(){
  var changed=false;
  var existing=CV_PROJECTS.find(function(p){return p.id==='lingee-prototype';});
  if(!existing){
    CV_PROJECTS.push(Object.assign({},CV_PROJ_SEED_LINGEE,{members:CV_PROJ_SEED_LINGEE.members.slice()}));
    changed=true;
  }
  if(changed)cvPersistProjects();
}

export { CV_MEMBERS, CV_PROJECTS, CV_ARTIFACTS, CV_REVIEWS, CV_REVIEW_ARTIFACTS, CV_REVIEW_COMMENTS, CV_TASKS, CV_THIRD_PARTY_MEMBERS, CV_WORKFLOW, CV_WORKFLOW_ROLES, CV_WORKSPACES, cvAddPersonToWorkspace, cvCanAccessWorkspace, cvConfigOverride, cvCreateWorkspace, cvCurrentUserName, cvEnsureCurrentUserProjectDemoData, cvEnsureLingeePrototypeData, cvEnsureProjectRoleDemoData, cvGenProjectCode, cvInProject, cvInjectCardActions, cvIsMe, cvPeopleInProject, cvPeopleInWorkspace, cvPersistPersons, cvPersistProjects, cvPersistWorkspaces, cvPersonById, cvPersonName, cvProject, cvProjectById, cvProjectInWorkspace, cvProjectName, cvProjectPersons, cvRenderReviewStats, cvRenderReviews, cvRenderTaskStats, cvRenderTasks, cvRestorePersons, cvRestoreProjects, cvRestoreWorkspaces, cvSeedTaskDetails, cvWorkspace, cvWorkspaceById, cvWorkspaceName, cvWorkspaceRole };
