
/* 协作数据：项目与工作区种子、当前项目 / 工作区（拆自 collab/data.js）。本文件有模块求值期执行的种子拼装。 */

/* ============================================================
   协作开发（任务管理 / 待评审 / 协作人员 / 专家 / 智能体团队 / 设置）
   任务、评审、协作人员数据与交互移植自协作开发原型稿
   ============================================================ */
/* 项目维度：任务 / 评审 / 协作人员按项目分；专家与智能体团队为全局资产，项目不绑定智能体团队，由任务自己选择
   协作人员为「引用」关系：项目通过 members 引用人员基础资料（CV_MEMBERS）的 id，不再由成员反向挂项目
   项目归属工作区（workspace），工作区为顶层组织单元 */
/* 演示任务的预置智能体团队（按所属演示项目，含管理板块的演示项目）；项目本身不绑定团队，新建任务时才选择 */
var CV_SEED_PROJECT_TEAM={expense:'cosmic-app-dev',purchase:'cosmic-app-dev',supply:'general-app-dev',production:'cosmic-app-dev',service:'general-app-dev','hr-analytics':'general-app-dev',warehouse:'cosmic-app-dev',survey:'general-app-dev','lingee-prototype':'cosmic-app-dev','cosmic-app-dev':'cosmic-app-dev','demo-contract':'general-app-dev','demo-inventory':'cosmic-app-dev','demo-quality':'general-app-dev','ticket-mgmt':'general-app-dev','crm-portal':'general-app-dev','purchase-collab':'general-app-dev',equipment:'cosmic-app-dev'};
/* 缺少智能体团队的演示任务按其演示项目补上预置团队；用户新建的项目与任务不受影响 */
function cvStampTaskTeam(t){ if(!t.teamId&&CV_SEED_PROJECT_TEAM[t.project])t.teamId=CV_SEED_PROJECT_TEAM[t.project]; return t.teamId||''; }
var CV_PROJECTS=[
  {id:'expense',name:'费用报销应用',desc:'报销、审批与支付集成全流程开发',goal:'实现费用报销全流程线上化，覆盖申请、审批、支付集成与预算控制',dot:'blue',status:'in_progress',priority:'高',owner:'吴宏超',repo:'https://github.com/kingdee/expense-app',start:'2026-08-01',end:'2026-11-30',milestones:[{name:'需求确认',date:'2026-08-15'},{name:'方案评审通过',date:'2026-09-10'},{name:'开发完成',date:'2026-10-31'},{name:'上线发布',date:'2026-11-30'}],members:['p22','p01','p02','p03','p04','p05','p07','p08','p09','p10','p12','p15','p20','p21'],workspace:'ws-app'},
  {id:'purchase',name:'采购管理系统',desc:'采购订单、入库与供应商协同重构',goal:'重构采购从下单到入库的协同流程，提升供应商协同效率与数据准确率',dot:'orange',status:'in_progress',priority:'中',owner:'李工',repo:'https://github.com/kingdee/purchase-ms',start:'2026-09-01',end:'2027-01-31',milestones:[{name:'需求定稿',date:'2026-09-20'},{name:'核心流程开发',date:'2026-11-30'},{name:'集成测试',date:'2026-12-31'},{name:'上线',date:'2027-01-31'}],members:['p22','p01','p02','p06','p07','p11','p12','p14','p15','p17','p19','p20','p21'],workspace:'ws-app'},
  {id:'supply',name:'供应链协同平台',desc:'供应商评级、订单协同与交付预测',goal:'搭建供应商协同与评级平台，支持订单协同、资质管理与交付预测',dot:'green',status:'planned',priority:'低',owner:'赵琳',repo:'',start:'2026-10-15',end:'2027-03-31',milestones:[{name:'方案设计',date:'2026-11-15'},{name:'门户对接',date:'2027-01-31'},{name:'评级模型上线',date:'2027-03-31'}],members:['p22','p01','p03','p04','p13','p14','p15','p16','p18','p20','p21'],workspace:'ws-build'},
  {id:'production',name:'生产制造执行系统',desc:'生产排程、工单管理与产能分析',goal:'实现生产全流程数字化，覆盖工单派发、工序跟踪、产能分析与质量追溯',dot:'blue',status:'in_progress',priority:'高',owner:'吴宏超',repo:'https://github.com/kingdee/mes-app',start:'2026-08-15',end:'2026-12-31',milestones:[{name:'需求调研',date:'2026-08-30'},{name:'核心功能开发',date:'2026-10-31'},{name:'联调测试',date:'2026-11-30'},{name:'上线交付',date:'2026-12-31'}],members:['p22','p01','p02','p03','p04','p05','p07'],workspace:'ws-app'},
  {id:'service',name:'客户服务工单平台',desc:'工单流转、SLA监控与客户满意度分析',goal:'搭建客户服务工单全生命周期管理平台，支持多渠道接入、智能派单与SLA自动监控',dot:'orange',status:'in_progress',priority:'中',owner:'吴宏超',repo:'',start:'2026-09-01',end:'2027-01-15',milestones:[{name:'需求确认',date:'2026-09-25'},{name:'工单引擎开发',date:'2026-11-15'},{name:'渠道对接',date:'2026-12-15'},{name:'上线',date:'2027-01-15'}],members:['p22','p01','p04','p05','p07'],workspace:'ws-app'},
  {id:'hr-analytics',name:'人力数据分析平台',desc:'组织画像、人效指标与离职预测',goal:'构建人力数据自助分析平台，支持组织画像可视化、人效指标看板与离职风险预警',dot:'green',status:'planned',priority:'中',owner:'赵琳',repo:'',start:'2026-10-01',end:'2027-02-28',milestones:[{name:'指标体系设计',date:'2026-10-20'},{name:'数据管道搭建',date:'2026-12-15'},{name:'看板上线',date:'2027-02-28'}],members:['p22','p03','p04','p05'],workspace:'ws-build'},
  {id:'warehouse',name:'智能仓储管理平台',desc:'库位优化、出入库协同与库存预警',goal:'搭建智能仓储管理平台，支持库位动态优化、扫码出入库协同与库存实时预警',dot:'blue',status:'in_progress',priority:'高',owner:'李工',repo:'',start:'2026-08-20',end:'2026-12-20',milestones:[{name:'仓储模型设计',date:'2026-09-15'},{name:'出入库开发',date:'2026-10-31'},{name:'预警上线',date:'2026-11-30'},{name:'验收交付',date:'2026-12-20'}],members:['p22','p01','p02','p03','p07'],workspace:'ws-app'},
  {id:'survey',name:'问卷调研系统建设',desc:'问卷设计、多渠道发放、回收监控与自动分析一体化',goal:'6 周内上线问卷调研系统：问卷设计、多渠道发放、回收监控和自动分析全部线上完成，调研周期从 4 周缩短到 1 周',dot:'green',status:'in_progress',priority:'高',owner:'吴宏超',repo:'https://github.com/kingdee/survey-app',start:'2026-09-07',end:'2026-10-30',updatedAt:1791072000000,milestones:[{name:'需求确认',date:'2026-09-14'},{name:'方案评审通过',date:'2026-09-25'},{name:'开发完成',date:'2026-10-16'},{name:'上线发布',date:'2026-10-30'}],members:['p22','p01','p02','p03','p04','p05','p07'],workspace:'ws-app'},
  {id:'lingee-prototype',name:'Lingee Build',desc:'高保真交互原型与协作开发平台建设',goal:'构建 Lingee 高保真原型，支持协作开发、任务管理与智能体协作全流程',dot:'green',status:'in_progress',priority:'高',owner:'吴晓锋',repo:'https://github.com/kingdee/lingee-prototype',start:'2026-07-01',end:'2026-12-31',milestones:[{name:'需求与设计定稿',date:'2026-08-01'},{name:'核心功能开发',date:'2026-10-15'},{name:'联调测试',date:'2026-11-30'},{name:'上线交付',date:'2026-12-31'}],members:['p01','p02','p03','p04','p05','p06','p07','p08','p09','p10','p11','p12','p13','p14','p15','p16','p17','p18','p19','p20','p21','p22','p23','p29','p31','p32','p33','p35','p36','p37','p38','p39','p40','p41'],workspace:'ws-build'},
{id:'cosmic-app-dev',name:'苍穹应用开发',desc:'基于苍穹设计器元模型的应用开发平台，覆盖属性、操作与规则元模型驱动开发',goal:'建设苍穹应用开发平台，基于设计器属性元模型与操作元模型实现元数据驱动的表单开发、操作配置与规则编排',dot:'blue',status:'in_progress',priority:'高',owner:'吴晓锋',repo:'https://github.com/kingdee/cosmic-app-dev',start:'2026-08-01',end:'2026-12-31',milestones:[{name:'元模型抽取完成',date:'2026-09-15'},{name:'属性操作集成',date:'2026-10-31'},{name:'规则引擎上线',date:'2026-11-30'},{name:'平台验收发布',date:'2026-12-31'}],members:['p23','p29','p30','p31','p22','p32','p33','p35','p36','p37','p38','p39','p40'],workspace:'ws-app'}
];

/* 项目范围演示：吴宏超负责费用报销应用和智能合同工作台，参与其余项目。 */
var CV_ROLE_DEMO_PROJECTS=[
  {id:'demo-contract',name:'智能合同工作台',desc:'合同起草、审批和归档流程优化',goal:'缩短合同处理周期，统一审批与归档记录',dot:'blue',status:'in_progress',priority:'中',owner:'吴宏超',repo:'',start:'2026-09-01',end:'2026-12-31',members:['p22','p04','p05'],workspace:'ws-app'},
  {id:'demo-inventory',name:'库存协同门户',desc:'仓储、采购和业务团队共享库存动态',goal:'统一库存查询和补货协作',dot:'orange',status:'planned',priority:'中',owner:'李工',repo:'',start:'2026-09-15',end:'2027-01-31',members:['p02','p22','p07'],workspace:'ws-app'},
  {id:'demo-quality',name:'质量巡检平台',desc:'巡检计划、问题跟踪和整改闭环',goal:'让质量问题从发现到处理可追踪',dot:'green',status:'in_progress',priority:'高',owner:'赵琳',repo:'',start:'2026-08-20',end:'2026-12-15',members:['p04','p22','p05'],workspace:'ws-app'}
];
CV_PROJECTS.push(...CV_ROLE_DEMO_PROJECTS.map(function(project){return {...project,members:project.members.slice()};}));
/* 种子项目快照：cvRestoreProjects 用 localStorage 覆盖 CV_PROJECTS 后，据此补回缺失的种子项目 */
var CV_SEED_PROJECT_SNAPSHOT=CV_PROJECTS.map(function(p){return Object.assign({},p,{members:(p.members||[]).slice(),milestones:(p.milestones||[]).map(function(m){return Object.assign({},m);})});});

/* 工作区：顶层的组织单元，项目归属工作区 */
var CV_WORKSPACES=[
  {id:'ws-build',name:'灵基Build'},
  {id:'ws-app',name:'Build应用开发组'},
  {id:'ws-quality',name:'Build质量与安全组'},
  {id:'ws-skill',name:'Build智能体/Skills开发组'}
];
/* 内置工作区快照：用户可能曾删除内置工作区，据此恢复 */
var CV_SEED_WORKSPACE_SNAPSHOT=CV_WORKSPACES.map(function(w){return Object.assign({},w);});
var CV_WORKSPACE_STORE_KEY='lingee-collab-workspaces-v1';
var CV_ACTIVE_WORKSPACE_KEY='lingee-collab-active-workspace-v1';
var CV_DELETED_WORKSPACE_KEY='lingee-collab-deleted-workspaces-v1';
function cvDeletedWorkspaceIds(){
  try{var ids=JSON.parse(localStorage.getItem(CV_DELETED_WORKSPACE_KEY)||'[]');return Array.isArray(ids)?ids.filter(function(id){return typeof id==='string';}):[];}catch(e){return [];}
}
function cvPersistWorkspaces(){
  try{localStorage.setItem(CV_WORKSPACE_STORE_KEY,JSON.stringify(CV_WORKSPACES));return true;}
  catch(e){return false;}
}
function cvRestoreWorkspaces(){
  try{
    var deleted=new Set(cvDeletedWorkspaceIds());
    for(var i=CV_WORKSPACES.length-1;i>=0;i--)if(deleted.has(CV_WORKSPACES[i].id))CV_WORKSPACES.splice(i,1);
    var rows=JSON.parse(localStorage.getItem(CV_WORKSPACE_STORE_KEY)||'null');
    if(Array.isArray(rows)){
      rows.forEach(function(row){
        if(!row||!row.id||deleted.has(row.id)||typeof row.name!=='string')return;
        var existing=CV_WORKSPACES.find(function(w){return w.id===row.id;});
        if(existing)Object.assign(existing,{name:row.name,desc:row.desc||'',creatorId:row.creatorId||'',creatorName:row.creatorName||'',peopleIds:row.peopleIds,roles:row.roles||{},demoInitialized:!!row.demoInitialized});
        else CV_WORKSPACES.push({id:row.id,name:row.name,desc:row.desc||'',creatorId:row.creatorId||'',creatorName:row.creatorName||'',peopleIds:Array.isArray(row.peopleIds)?row.peopleIds:[],roles:row.roles||{},demoInitialized:!!row.demoInitialized});
      });
    }
    /* 工作区入口已隐藏：不再恢复上次选中的工作区，cvWorkspace 保持空串 = 全部工作区 */
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
/* 始终展示全部项目，不按工作区筛选 */
function cvProjectInWorkspace(projId){
  var p=cvProjectById(projId);
  return !!p;
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

/* cvProject 由其它模块写回；import 绑定只读，所以走这个 setter */
function set_cvProject(v){ cvProject=v; return v; }
/* cvWorkspace 由其它模块写回；import 绑定只读，所以走这个 setter */
function set_cvWorkspace(v){ cvWorkspace=v; return v; }

export { CV_ACTIVE_WORKSPACE_KEY, CV_DELETED_WORKSPACE_KEY, CV_PROJECTS, CV_ROLE_DEMO_PROJECTS, CV_SEED_PROJECT_SNAPSHOT, CV_SEED_WORKSPACE_SNAPSHOT, CV_WORKSPACES, CV_WORKSPACE_STORE_KEY, cvConfigOverride, cvDeletedWorkspaceIds, cvInProject, cvPersistWorkspaces, cvProject, cvProjectById, cvProjectInWorkspace, cvProjectName, cvProjectTag, cvRestoreWorkspaces, cvStampTaskTeam, cvWorkspace, cvWorkspaceById, cvWorkspaceName, set_cvProject, set_cvWorkspace };
