import { STAGES } from '../../expert/data.js';
import { CV_DELETED_WORKSPACE_KEY, CV_PROJECTS, CV_SEED_PROJECT_SNAPSHOT, CV_SEED_WORKSPACE_SNAPSHOT, CV_WORKSPACES, cvDeletedWorkspaceIds, cvStampTaskTeam, cvWorkspaceById } from './workspace-projects.js';
import { CV_TASKS } from './legacy-demo.js';
import { CV_MEMBERS, cvPersonById } from './people.js';
import { cvDeletedProjectIds, cvPersistProjects } from './project-store.js';
/* 协作数据：任务产物、活动、评审演示细节与种子项目补齐（拆自 collab/data.js） */

/* ---------- 产物中心：交付物按项目沉淀（左项目右清单，跟着项目走）
   单文件产物用 file（带后缀名）；代码类产物是目录，用 files 列多个文件 ---------- */
var CV_ARTIFACTS=[
  {name:'采购订单列表页',file:'采购订单列表页.html',typeCls:'art-type--doc',typeLabel:'网页',src:'采购订单批量导入',date:'2026-09-21 14:20',project:'purchase'},
  {name:'审批流插件源代码',typeCls:'art-type--code',typeLabel:'代码',src:'审批流插件代码审查',date:'2026-09-21 10:05',project:'expense',files:['ApprovalFlowPlugin.java','ApprovalFlowService.java','ApprovalContext.java','ExpenseReport.java','ApprovalFlowPluginTest.java','plugin.xml','README.md']},
  {name:'多币种报销需求规格',file:'多币种报销需求规格.md',typeCls:'art-type--doc',typeLabel:'文档',src:'多币种报销需求规格评审',date:'2026-09-20 16:30',project:'expense'},
  {name:'费用明细测试用例集',file:'费用明细测试用例集.xlsx',typeCls:'art-type--test',typeLabel:'用例',src:'费用明细列表页测试用例评审',date:'2026-09-19 11:00',project:'expense'},
  {name:'审批流插件部署方案',file:'审批流插件部署方案.md',typeCls:'art-type--plan',typeLabel:'方案',src:'审批流插件部署方案评审',date:'2026-09-19 09:40',project:'expense'},
  {name:'采购订单开放接口定义',file:'采购订单开放接口定义.yaml',typeCls:'art-type--api',typeLabel:'接口',src:'供应商协同门户对接',date:'2026-09-18 15:12',project:'supply'},
  {name:'属性元模型抽取报告',file:'property-metamodel.json',typeCls:'art-type--code',typeLabel:'代码',src:'属性元模型抽取脚本开发',date:'2026-09-10 14:20',project:'cosmic-app-dev',files:['property-metamodel.json','property-by-model-type.json','element-property-map.json','extraction-report.json']},
  {name:'复杂属性形状与写入路由',file:'complex-property-shapes.json',typeCls:'art-type--code',typeLabel:'代码',src:'复杂属性形状解析与写入路由映射',date:'2026-09-15 10:05',project:'cosmic-app-dev',files:['complex-property-shapes.json','complex-property-routes.json','alias-converters.json']},
  {name:'编辑器值形状校验规则',file:'editor-value-shapes.json',typeCls:'art-type--code',typeLabel:'代码',src:'编辑器值形状校验规则实现',date:'2026-09-16 11:30',project:'cosmic-app-dev'},
  {name:'操作元模型注册表',file:'operation-metamodel.json',typeCls:'art-type--code',typeLabel:'代码',src:'操作类型注册表扫描与集成',date:'2026-09-12 16:00',project:'cosmic-app-dev',files:['operation-metamodel.json','operation-shapes.json']},
  {name:'扩展属性锁定规则',file:'extension-locked-properties.json',typeCls:'art-type--doc',typeLabel:'文档',src:'扩展表单属性锁定规则集成',date:'2026-09-14 09:30',project:'cosmic-app-dev'},
  {name:'app-build 契约交叉比对',file:'appbuild-crosscheck.json',typeCls:'art-type--doc',typeLabel:'文档',src:'与 app-build 属性契约交叉比对',date:'2026-09-18 14:00',project:'cosmic-app-dev'},
  {name:'规则动作类型清单',file:'rule-action-types.json',typeCls:'art-type--doc',typeLabel:'文档',src:'规则动作类型清单集成',date:'2026-09-13 15:00',project:'cosmic-app-dev'}
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
    cvStampTaskTeam(t);
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

/* 自愈：确保 Lingee Build项目在 localStorage 恢复后仍然存在 */
var CV_PROJ_SEED_LINGEE={id:'lingee-prototype',name:'Lingee Build',desc:'高保真交互原型与协作开发平台建设',goal:'构建 Lingee 高保真原型，支持协作开发、任务管理与智能体协作全流程',dot:'green',status:'in_progress',priority:'高',owner:'吴晓锋',repo:'https://github.com/kingdee/lingee-prototype',start:'2026-07-01',end:'2026-12-31',milestones:[{name:'需求与设计定稿',date:'2026-08-01'},{name:'核心功能开发',date:'2026-10-15'},{name:'联调测试',date:'2026-11-30'},{name:'上线交付',date:'2026-12-31'}],members:['p01','p02','p03','p04','p05','p06','p07','p08','p09','p10','p11','p12','p13','p14','p15','p16','p17','p18','p19','p20','p21','p22','p23','p29','p31','p32','p33','p35','p36','p37','p38','p39','p40','p41'],workspace:'ws-build'};
function cvEnsureLingeePrototypeData(){
  if(cvDeletedProjectIds().includes('lingee-prototype'))return;
  var changed=false;
  var existing=CV_PROJECTS.find(function(p){return p.id==='lingee-prototype';});
  if(!existing){
    CV_PROJECTS.push(Object.assign({},CV_PROJ_SEED_LINGEE,{members:CV_PROJ_SEED_LINGEE.members.slice()}));
    changed=true;
  }
  if(changed)cvPersistProjects();
}

/* 自愈：确保苍穹应用开发项目在 localStorage 恢复后仍然存在 */
var CV_PROJ_SEED_COSMIC={id:'cosmic-app-dev',name:'苍穹应用开发',desc:'基于苍穹设计器元模型的应用开发平台，覆盖属性、操作与规则元模型驱动开发',goal:'建设苍穹应用开发平台，基于设计器属性元模型与操作元模型实现元数据驱动的表单开发、操作配置与规则编排',dot:'blue',status:'in_progress',priority:'高',owner:'吴晓锋',repo:'https://github.com/kingdee/cosmic-app-dev',start:'2026-08-01',end:'2026-12-31',milestones:[{name:'元模型抽取完成',date:'2026-09-15'},{name:'属性操作集成',date:'2026-10-31'},{name:'规则引擎上线',date:'2026-11-30'},{name:'平台验收发布',date:'2026-12-31'}],members:['p23','p29','p30','p31','p22','p32','p33','p35','p36','p37','p38','p39','p40'],workspace:'ws-app'};
function cvEnsureCosmicAppDevData(){
  if(cvDeletedProjectIds().includes('cosmic-app-dev'))return;
  var changed=false;
  var existing=CV_PROJECTS.find(function(p){return p.id==='cosmic-app-dev';});
  if(!existing){
    CV_PROJECTS.push(Object.assign({},CV_PROJ_SEED_COSMIC,{members:CV_PROJ_SEED_COSMIC.members.slice()}));
    changed=true;
  }else if(existing.members.join(',')!==CV_PROJ_SEED_COSMIC.members.join(',')){
    /* 成员名单随种子数据演化：localStorage 恢复出旧名单时同步为最新成员 */
    existing.members=CV_PROJ_SEED_COSMIC.members.slice();
    changed=true;
  }
  if(changed)cvPersistProjects();
}

/* 通用自愈：localStorage 恢复后，补回未被明确删除的种子项目。 */
function cvEnsureSeedProjects(){
  var changed=false;
  var deleted=new Set(cvDeletedProjectIds());
  CV_SEED_PROJECT_SNAPSHOT.forEach(function(seed){
    if(deleted.has(seed.id))return;
    if(!CV_PROJECTS.find(function(p){return p.id===seed.id;})){
      CV_PROJECTS.push(Object.assign({},seed,{members:seed.members.slice(),milestones:seed.milestones.map(function(m){return Object.assign({},m);})}));
      changed=true;
    }
  });
  if(changed)cvPersistProjects();
}

/* 恢复内置工作区：从删除列表中移除内置工作区 ID，并补回缺失的内置工作区 */
function cvEnsureSeedWorkspaces(){
  var seedIds=CV_SEED_WORKSPACE_SNAPSHOT.map(function(w){return w.id;});
  var current=cvDeletedWorkspaceIds();
  var cleaned=current.filter(function(id){return !seedIds.includes(id);});
  if(cleaned.length!==current.length){
    try{localStorage.setItem(CV_DELETED_WORKSPACE_KEY,JSON.stringify(cleaned));}catch(e){}
  }
  CV_SEED_WORKSPACE_SNAPSHOT.forEach(function(seed){
    if(!cvWorkspaceById(seed.id))CV_WORKSPACES.push(Object.assign({},seed));
  });
}

export { CV_ARTIFACTS, cvEnsureCosmicAppDevData, cvEnsureLingeePrototypeData, cvEnsureSeedProjects, cvEnsureSeedWorkspaces, cvSeedTaskDetails };
