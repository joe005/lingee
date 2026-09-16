/* 专家 / 专家团：内置数据、能力项字典、开工输入
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */

/* ============================================================
   专家 / 专家团
   数据取自 lingee-build/packages/opencode/builtin-experts/
   技能名取自 packages/opencode/builtin-skills/
   ============================================================ */
var EXPERT_AV = {
  lead:'<rect width="128" height="128" rx="26" fill="#1e40af"/><circle cx="64" cy="44" r="19" fill="#dbeafe"/><path d="M27 104c4-23 18-34 37-34s33 11 37 34" fill="#93c5fd"/>',
  pm:'<rect width="128" height="128" rx="26" fill="#c2410c"/><rect x="32" y="26" width="64" height="78" rx="9" fill="#ffedd5"/><path d="M45 48h38M45 65h38M45 82h24" stroke="#c2410c" stroke-width="7" stroke-linecap="round"/>',
  arch:'<rect width="128" height="128" rx="26" fill="#6d28d9"/><path d="M26 94h76M36 94V56l28-21 28 21v38M52 94V72h24v22" fill="none" stroke="#ede9fe" stroke-width="8" stroke-linejoin="round"/>',
  eng:'<rect width="128" height="128" rx="26" fill="#047857"/><path d="M50 40L26 64l24 24M78 40l24 24-24 24M70 30L58 98" fill="none" stroke="#d1fae5" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>',
  qa:'<rect width="128" height="128" rx="26" fill="#be123c"/><path d="M64 22l36 14v26c0 24-14 37-36 45-22-8-36-21-36-45V36z" fill="#ffe4e6"/><path d="M46 63l13 13 26-28" fill="none" stroke="#be123c" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>',
  cr:'<rect width="128" height="128" rx="26" fill="#0e7490"/><circle cx="57" cy="55" r="25" fill="none" stroke="#cffafe" stroke-width="9"/><path d="M76 75l24 24" stroke="#cffafe" stroke-width="10" stroke-linecap="round"/>',
  sec:'<rect width="128" height="128" rx="26" fill="#3f3f46"/><path d="M64 22l35 13v29c0 23-13 36-35 44-22-8-35-21-35-44V35z" fill="none" stroke="#e4e4e7" stroke-width="9" stroke-linejoin="round"/><rect x="51" y="58" width="26" height="23" rx="4" fill="#e4e4e7"/><path d="M57 58v-7a7 7 0 0114 0v7" fill="none" stroke="#e4e4e7" stroke-width="7"/>',
  ana:'<rect width="128" height="128" rx="26" fill="#475569"/><path d="M30 96V64M52 96V40M74 96V74M96 96V50" stroke="#e2e8f0" stroke-width="11" stroke-linecap="round"/>',
  fe:'<rect width="128" height="128" rx="26" fill="#0369a1"/><rect x="24" y="30" width="80" height="62" rx="8" fill="#e0f2fe"/><path d="M24 48h80" stroke="#0369a1" stroke-width="7"/><circle cx="38" cy="39" r="4" fill="#0369a1"/><path d="M48 68h32" stroke="#0369a1" stroke-width="7" stroke-linecap="round"/>',
  ux:'<rect width="128" height="128" rx="26" fill="#be185d"/><circle cx="48" cy="48" r="17" fill="#fce7f3"/><circle cx="80" cy="80" r="17" fill="#f9a8d4"/><path d="M48 65v15h15" stroke="#fce7f3" stroke-width="7" fill="none"/>',
  form:'<rect width="128" height="128" rx="26" fill="#0f766e"/><rect x="28" y="24" width="72" height="80" rx="9" fill="#ccfbf1"/><path d="M42 46h30M42 64h44M42 82h20" stroke="#0f766e" stroke-width="7" stroke-linecap="round"/>',
  flow:'<rect width="128" height="128" rx="26" fill="#7c3aed"/><circle cx="34" cy="34" r="13" fill="#ede9fe"/><circle cx="94" cy="64" r="13" fill="#ede9fe"/><circle cx="34" cy="94" r="13" fill="#ede9fe"/><path d="M47 40l35 18M47 88l35-18" stroke="#ede9fe" stroke-width="7"/>',
  rpt:'<rect width="128" height="128" rx="26" fill="#a16207"/><path d="M34 94V54M60 94V32M86 94V68" stroke="#fef3c7" stroke-width="12" stroke-linecap="round"/><path d="M22 104h84" stroke="#fef3c7" stroke-width="7" stroke-linecap="round"/>',
  plug:'<rect width="128" height="128" rx="26" fill="#4338ca"/><path d="M44 30v22M84 30v22" stroke="#e0e7ff" stroke-width="9" stroke-linecap="round"/><rect x="32" y="52" width="64" height="34" rx="10" fill="#e0e7ff"/><path d="M64 86v18" stroke="#e0e7ff" stroke-width="9" stroke-linecap="round"/>',
  api:'<rect width="128" height="128" rx="26" fill="#0891b2"/><circle cx="38" cy="64" r="14" fill="#cffafe"/><circle cx="90" cy="38" r="14" fill="#cffafe"/><circle cx="90" cy="90" r="14" fill="#cffafe"/><path d="M50 58l28-14M50 70l28 14" stroke="#cffafe" stroke-width="7"/>'
};
function xav(k){ return 'data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">'+EXPERT_AV[k]+'</svg>'); }
var GATE_ICON='<svg class="x-gate-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/></svg>';
function xesc(v){ return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}); }

var EXPERTS=[
  {id:'software-team-lead',k:'lead',name:'软件团队负责人',role:'交付负责人',by:'Lingee 内置',
   desc:'协调范围、分工、集成、风险与交付闭环，是专家团里唯一能开 kickoff 与做最终集成确认的角色。',
   tags:['交付管理','团队协调'],modes:['分析','设计','集成','评审','验证','恢复'],
   comp:['delivery.orchestration · principal','delivery.integration · advanced'],
   cmds:[['帮我把[交付目标]拆成范围、非目标和验收门禁','闭合范围，明确谁负责、做到什么算完'],
         ['这次交付复盘一下，还有哪些残余风险','汇总各角色证据，给出关闭或升级建议']]},
  {id:'software-product-manager',k:'pm',name:'软件产品经理',role:'产品经理',by:'Lingee 内置',
   desc:'把用户目标翻译成有优先级、可观察的需求与验收条件。',
   tags:['需求分析','验收设计'],modes:['分析','设计','评审'],
   comp:['product.requirements · principal','product.acceptance-design · advanced'],
   cmds:[['把[用户目标]拆成一份带验收条件的清单','把目标整理成有范围、可验收的需求'],
         ['帮我给这些需求补齐验收标准','补上可观察、可验证的验收条件'],
         ['这次哪些事不做？帮我列一下非目标','明确边界，防止范围蔓延']]},
  {id:'software-architect',k:'arch',name:'软件架构师',role:'软件架构师',by:'Lingee 内置',
   desc:'设计可演进的系统边界、合同、数据流与失败处理，产出架构文档与可执行的实现计划。',
   tags:['软件架构','可靠性'],modes:['分析','设计','集成','评审','恢复'],
   comp:['architecture.system-design · principal','architecture.reliability · advanced'],
   cmds:[['按[需求]设计系统的边界、合同和失败处理','从需求产出可演进的架构方案与迁移路径'],
         ['这几个方案怎么选？帮我做技术选型','按质量属性评估备选方案并记录取舍'],
         ['把架构拆成可以直接开工的实现计划','产出带可执行验证命令的编码任务图']]},
  {id:'software-engineer',k:'eng',name:'软件工程师',role:'软件工程师',by:'Lingee 内置',
   desc:'实现可维护的软件变更并完成针对性验证，只改授权范围内的代码。',
   tags:['软件实现','系统集成'],modes:['分析','设计','实现','集成','验证','恢复'],
   comp:['engineering.implementation · advanced','engineering.integration · advanced'],
   skills:['cosmic-app-builder','general-app-builder','site-builder'],
   cmds:[['按[验收条件]把功能实现出来','完成最小完整变更并跑通验证'],
         ['这个 bug 帮我复现并修掉','定位根因、修复并补回归测试'],
         ['做一个单页小工具，一次写完','小应用一次性写完全部代码 + build 验证']]},
  {id:'software-qa-engineer',k:'qa',name:'软件测试工程师',role:'质量工程师',by:'Lingee 内置',
   desc:'独立验证验收行为、回归影响与交付风险，给出基于证据的质量结论。',
   tags:['质量保障','独立验证'],modes:['分析','设计','评审','验证'],
   comp:['quality.verification · principal','quality.regression-analysis · advanced'],
   cmds:[['针对[变更说明]出一份验证计划','按风险模型设计验收与回归场景'],
         ['帮我端到端跑一遍，看看能不能过','实际跑 build、请求与用例并留存证据'],
         ['这个版本能发吗？给个质量结论','给出 pass / pass-with-risk / fail 与理由']]},
  {id:'code-reviewer',k:'cr',name:'代码评审专家',role:'实现代码评审',by:'Lingee 内置',ro:true,
   desc:'独立评审实现代码的正确性、并发安全与合同落实情况，只读不改。',
   tags:['只读评审','正确性'],modes:['评审','验证'],
   comp:['implementation-correctness · principal','concurrent-commit-model · principal'],
   cmds:[['帮我评审这段代码有没有正确性问题','把合同义务追溯到代码路径，报告可复现的缺陷']]},
  {id:'security-reviewer',k:'sec',name:'安全评审专家',role:'应用安全评审',by:'Lingee 内置',ro:true,
   desc:'基于信任边界建立威胁模型，演练滥用、竞态与绕过场景并给出风险判定。',
   tags:['只读评审','威胁建模'],modes:['评审','验证'],
   comp:['application-security · principal','filesystem-safety · advanced'],
   cmds:[['这个功能有安全风险吗？帮我做威胁建模','演练滥用与绕过场景，判断风险是否可接受']]},
  {id:'read-only-analyst',k:'ana',name:'只读分析专家',role:'软件分析',by:'Lingee 内置',ro:true,
   desc:'在不改动工作区的前提下做有边界的源码分析与结论交叉验证。',
   tags:['只读分析'],modes:['分析','评审','验证'],
   comp:['software.analysis · advanced'],
   cmds:[['帮我读一下这块代码是怎么跑的','有边界地读源码，给出结论与证据，不改文件']]},
  {id:'frontend-engineer',k:'fe',name:'前端工程专家',role:'前端工程师',by:'Lingee 内置',
   desc:'金蝶前端规范下的组件实现、响应式布局与交互调试。',
   tags:['React','响应式','组件库'],modes:['设计','实现','验证'],
   comp:['engineering.frontend · advanced'],skills:['cosmic-kwc-builder','frontend-design'],
   cmds:[['按[设计稿与规范]把页面实现出来','实现响应式页面与交互'],
         ['帮我抽一个可复用的组件','产出符合金蝶前端规范的组件'],
         ['页面和设计稿对不上，帮我调一下','把实现调到与设计稿一致']]},
  {id:'ux-designer',k:'ux',name:'界面设计专家',role:'交互 / 视觉设计',by:'Lingee 内置',
   desc:'信息架构、交互流程与视觉规范，产出可直接交付前端的设计说明。',
   tags:['交互设计','视觉规范'],modes:['分析','设计','评审'],
   comp:['design.interaction · advanced'],skills:['prototype-builder','frontend-design'],
   cmds:[['围绕[用户目标]先对齐设计目标','产出设计简报，对齐业务目标与设计策略'],
         ['帮我梳理这个模块的信息架构','理清导航、层级与页面骨架'],
         ['帮我走查一下这个页面','对已实现页面做规范与可用性检查']]},
  {id:'cosmic-form',k:'form',name:'苍穹表单专家',role:'苍穹表单',by:'Lingee 内置',
   desc:'KDDP 表单引擎的字段、校验、联动与权限配置。',
   tags:['表单设计','字段校验'],modes:['分析','设计','实现'],
   comp:['cosmic.form-design · advanced'],skills:['cosmic-requirements-spec'],
   cmds:[['按[已确认需求]建一张苍穹单据','设计表单结构与字段'],
         ['这几个字段要联动，帮我配一下','配置校验规则与字段联动逻辑'],
         ['这张单据的权限怎么配？','设置单据与字段级权限']]},
  {id:'cosmic-workflow',k:'flow',name:'苍穹工作流专家',role:'苍穹工作流',by:'Lingee 内置',
   desc:'审批链配置与流程调试，处理加签、会签、条件流转等复杂场景。',
   tags:['审批链','流程调试'],modes:['分析','设计','实现','验证'],
   comp:['cosmic.workflow · advanced'],
   cmds:[['按[已确认需求]设计一条苍穹审批流程','梳理审批场景并配置工作流'],
         ['我的审批流节点卡住了，帮我排查','定位节点为什么不流转']]},
  {id:'cosmic-report',k:'rpt',name:'苍穹报表专家',role:'苍穹报表',by:'Lingee 内置',
   desc:'报表建模、取数逻辑与图表配置，兼顾查询性能与交互式分析。',
   tags:['报表建模','取数逻辑'],modes:['分析','设计','实现'],
   comp:['cosmic.report · advanced'],
   cmds:[['按[已确认需求]做一张报表','设计报表数据模型与取数逻辑'],
         ['报表查得太慢了，帮我优化','优化取数与查询性能']]},
  {id:'cosmic-plugin',k:'plug',name:'苍穹二开插件专家',role:'苍穹二开',by:'Lingee 内置',
   desc:'基于扩展点开发二开插件，处理注册、生命周期调试与升级兼容。',
   tags:['插件开发','扩展点'],modes:['设计','实现','验证','恢复'],
   comp:['cosmic.plugin · advanced'],skills:['cosmic-reverse-engineering'],
   cmds:[['在[应用编码]里基于扩展点写一个二开插件','定位扩展点并实现插件逻辑'],
         ['插件注册了但不生效，帮我看看','排查注册与生命周期问题']]},
  {id:'cosmic-api',k:'api',name:'苍穹集成接口专家',role:'苍穹集成',by:'Lingee 内置',
   desc:'开放接口对接、鉴权配置与数据同步，含异常重试与幂等设计。',
   tags:['接口对接','鉴权'],modes:['设计','实现','集成','验证'],
   comp:['cosmic.integration · advanced'],
   cmds:[['按[接口契约]对接苍穹开放接口','确认契约与鉴权方式并实现对接'],
         ['接口鉴权怎么配？','配置鉴权与安全策略'],
         ['两边数据要同步，帮我设计方案','设计幂等同步任务与异常重试']]}
];
var BUILTIN_EXPERTS=EXPERTS;
var MY_EXPERTS=[];                 /* 我自己创建的专家，落 localStorage */
var EX={};
function rebuildExperts(){
  EXPERTS=BUILTIN_EXPERTS.concat(MY_EXPERTS);
  EX={}; EXPERTS.forEach(function(e){EX[e.id]=e});
}

/* 可选头像：复用内置的一套图形，创建专家时挑一个 */
var AV_KEYS=['lead','pm','arch','eng','qa','cr','sec','ana','fe','ux','form','flow','rpt','plug','api'];
var WORK_MODES=['分析','设计','实现','集成','评审','验证','恢复'];

/* ---------- 能力项字典 ----------
   定义文件里能力项是机器标识（architecture.system-design · principal），
   直接摆到界面上没人看得懂。这里翻成中文名 + 等级，字典没覆盖的回退显示原串。 */
var COMP_NAMES={
  'delivery.orchestration':'交付编排','delivery.integration':'集成收口',
  'product.requirements':'需求定义','product.acceptance-design':'验收设计',
  'architecture.system-design':'系统设计','architecture.reliability':'可靠性设计',
  'engineering.implementation':'编码实现','engineering.integration':'工程集成',
  'engineering.frontend':'前端工程',
  'quality.verification':'质量验证','quality.regression-analysis':'回归分析',
  'implementation-correctness':'实现正确性','concurrent-commit-model':'并发与提交模型',
  'application-security':'应用安全','filesystem-safety':'文件系统安全',
  'software.analysis':'源码分析','design.interaction':'交互设计',
  'cosmic.form-design':'苍穹表单设计','cosmic.workflow':'苍穹工作流',
  'cosmic.report':'苍穹报表','cosmic.plugin':'苍穹二开插件','cosmic.integration':'苍穹集成'
};
var COMP_LEVELS={principal:'资深',advanced:'精通',practitioner:'熟练',awareness:'了解'};

/* ---------- 开工前需要的输入 ----------
   不再单独维护字段：需要什么输入，直接写进触发词的 [占位符] 里。
   发出去时占位符没被替换，就在会话里追问，而不是让专家拿着空输入硬跑。 */
var ASK={
  '验收条件':{q:'这次做到什么程度算完成？',
    o:['用软件产品经理刚出的验收条件','我直接说，你记下来','先不定，按最小可用实现']},
  '架构决策':{q:'按哪份架构方案做？',
    o:['用软件架构师刚出的方案','我把方案贴给你','还没有方案，你先出一版']},
  '用户目标':{q:'这次要解决谁的什么问题？',
    o:['我描述一下','用项目里已有的需求文档']},
  '交付目标':{q:'这次交付要达成什么？',
    o:['我说一下目标和时间','沿用上一轮没做完的范围']},
  '需求':{q:'需求从哪来？',
    o:['用软件产品经理的需求清单','我直接说','先读代码反推现状']},
  '已确认需求':{q:'这次按哪份已确认的需求做？',
    o:['用苍穹产品经理确认过的需求规格','我直接说','还没确认，先帮我理一版']},
  '变更说明':{q:'这次改了什么？',
    o:['用软件工程师提交的变更说明','读本次提交自己判断','我列一下改动点']},
  '设计稿与规范':{q:'按哪份设计稿实现？',
    o:['用界面设计专家出的设计说明','我贴 Figma 链接','没有设计稿，你按设计系统发挥']},
  '接口契约':{q:'对接哪个接口？',
    o:['我贴接口文档','用苍穹开放平台上已注册的接口','先帮我查一下有哪些可用']},
  '应用编码':{q:'在哪个苍穹应用里开发？',
    o:['用当前会话关联的应用','我填应用编码']}
};
var ASK_FALLBACK={q:'这一项从哪来？', o:['我直接说','用上一步的产出','先跳过，你按默认处理']};
function askFor(name){ return ASK[name]||ASK_FALLBACK; }
/* 文本里没被替换掉的 [占位符] */
function pendingInputs(text){
  var out=[], re=/\[([^\[\]\n]{1,20})\]/g, m;
  while((m=re.exec(String(text||'')))){ if(out.indexOf(m[1])<0) out.push(m[1]); }
  return out;
}
/* 触发词里的占位符高亮显示 */
function phraseHtml(t){
  return xesc(t).replace(/\[([^\[\]]{1,20})\]/g,'<em class="x-ph">[$1]</em>');
}
var COMP_RANK={principal:4,advanced:3,practitioner:2,awareness:1};
/* 'architecture.system-design · principal' → 结构化 */
function parseComp(v){
  var p=String(v==null?'':v).split('\u00b7');
  var id=(p[0]||'').trim(), lv=(p[1]||'').trim();
  return {id:id,name:COMP_NAMES[id]||id,lv:lv,level:COMP_LEVELS[lv]||lv,rank:COMP_RANK[lv]||0};
}
function compChip(v){
  var c=(v&&typeof v==='object')?v:parseComp(v);
  return '<span class="ptag ptag-comp" title="'+xesc(c.id)+'">'+xesc(c.name)
    +(c.level?'<i class="ptag-lv lv-'+xesc(c.lv)+'">'+xesc(c.level)+'</i>':'')+'</span>';
}
/* 一个团覆盖到的能力项：同一能力取成员里的最高等级 */
function teamCoverage(t){
  var best={};
  (t.members||[]).forEach(function(id){
    var e=EX[id]; if(!e) return;
    (e.comp||[]).forEach(function(v){
      var c=parseComp(v);
      if(!best[c.id]||c.rank>best[c.id].rank) best[c.id]=c;
    });
  });
  return Object.keys(best).map(function(k){return best[k]})
    .sort(function(a,b){return b.rank-a.rank||a.name.localeCompare(b.name)});
}

var PRESET_TEAMS=[
  {id:'software-company',preset:true,name:'软件开发团队',by:'Lingee 内置',
   desc:'跨职能软件产品交付团队，覆盖需求、架构、实现、质量与集成的完整闭环。也是新建任务时的默认选择。',
   domains:['通用软件','后端','前端','数据库'],
   gates:['design','verify'],
   leadId:'software-team-lead',
   members:['software-team-lead','software-product-manager','software-architect','software-engineer','software-qa-engineer'],
   cmds:[['帮我把这个想法做成一个能上线的功能','从需求到验收走完整闭环'],
         ['这个模块要重做，帮我走一遍完整流程','需求、架构、实现、测试、集成逐环节推进'],
         ['需求还没理清，先帮我拆一版方案再动手','先出需求与实现计划，评审通过再编码']]},
  {id:'fast-app',preset:true,name:'应用速成小队',by:'Lingee 内置',
   desc:'工程师一次性写完全部代码，QA 端到端验证。适合单页应用、小游戏、原型页这类一次交付的活。',
   domains:['单页应用','原型','小工具'],
   gates:[],
   leadId:'software-engineer',
   members:['software-engineer','software-qa-engineer'],
   cmds:[['做一个单页小工具，今天就要用','一次性写完代码并跑通 build'],
         ['帮我快速搭个原型页看看效果','省掉评审环节，直接实现 + 自检'],
         ['写个小游戏练手','小体量一次交付']]},
  {id:'cosmic-team',preset:true,name:'苍穹交付团队',by:'Lingee 内置',
   desc:'面向苍穹配置化交付：需求规格 → 表单与流程配置 → 报表 → 二开插件 → 接口集成。',
   domains:['苍穹','表单','工作流','报表','集成'],
   gates:['requirement'],
   leadId:'software-team-lead',
   members:['software-team-lead','software-product-manager','cosmic-form','cosmic-workflow','cosmic-report','cosmic-api'],
   cmds:[['帮我在苍穹上做一套请假申请，从单据到审批','表单、流程、报表、接口一条龙配下来'],
         ['这个业务要在苍穹落地，帮我出方案','先出需求规格，再分头配置'],
         ['苍穹这块单据和流程都要改，帮我排一下','按依赖顺序编排配置任务']]},
  {id:'web-team',preset:true,name:'网页交付小队',by:'Lingee 内置',
   desc:'设计与前端配对交付：信息架构与视觉规范先行，前端按规范实现并做设计走查。',
   domains:['Web','前端','视觉设计'],
   gates:['design'],
   leadId:'ux-designer',
   members:['ux-designer','frontend-engineer','software-qa-engineer'],
   cmds:[['帮我做一个官网首页，设计和前端都要','先出设计规范，再按规范实现'],
         ['这几个页面要重新设计并实现','信息架构先行，前端跟进，最后走查'],
         ['按这份设计稿把页面实现出来并走查一遍','实现 + 设计一致性检查']]}
];

export function initExpertData() {
  rebuildExperts();
}

/* MY_EXPERTS 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set_MY_EXPERTS(v){ MY_EXPERTS=v; return v; }

export { AV_KEYS, EX, EXPERTS, GATE_ICON, MY_EXPERTS, PRESET_TEAMS, WORK_MODES, askFor, compChip, pendingInputs, phraseHtml, rebuildExperts, teamCoverage, xav, xesc };
