/* Lingee Build builtin-experts 的智能体名称、说明、标签、工作模式与头像快照。 */
import avatar0 from '../../../assets/expert-avatars/cosmic-api-engineer.png';
import avatar1 from '../../../assets/expert-avatars/cosmic-architect.png';
import avatar3 from '../../../assets/expert-avatars/cosmic-metadata-expert.png';
import avatar4 from '../../../assets/expert-avatars/cosmic-product-manager.png';
import avatar5 from '../../../assets/expert-avatars/cosmic-qa-engineer.png';
import avatar7 from '../../../assets/expert-avatars/cosmic-team-lead.png';
import avatar8 from '../../../assets/expert-avatars/cosmic-ui-designer.png';
import avatar9 from '../../../assets/expert-avatars/kwc-frontend-engineer.png';
import avatar10 from '../../../assets/expert-avatars/general-app-architecture-expert.png';
import avatar11 from '../../../assets/expert-avatars/general-app-development-expert.png';
import avatar12 from '../../../assets/expert-avatars/general-app-product-expert.png';
import avatar13 from '../../../assets/expert-avatars/general-app-qa-expert.png';
import avatar14 from '../../../assets/expert-avatars/general-app-team-lead.png';
import avatar15 from '../../../assets/expert-avatars/code-reviewer.png';
import avatar16 from '../../../assets/expert-avatars/read-only-analyst.png';
import avatar17 from '../../../assets/expert-avatars/security-reviewer.png';
import avatar18 from '../../../assets/expert-avatars/software-architect.png';
import avatar19 from '../../../assets/expert-avatars/software-engineer.png';
import avatar20 from '../../../assets/expert-avatars/software-product-manager.png';
import avatar21 from '../../../assets/expert-avatars/software-qa-engineer.png';
import avatar22 from '../../../assets/expert-avatars/software-team-lead.png';
import avatar23 from '../../../assets/expert-avatars/cosmic-app-development-expert.png';
import avatar24 from '../../../assets/expert-avatars/cosmic-plugin-developer.png';
import avatar25 from '../../../assets/expert-avatars/general-app-deployment-expert.png';
const avatars={
  "general-app-deployment-expert":avatar25,
  "cosmic-api-engineer":avatar0,
  "cosmic-architect":avatar1,
  "cosmic-metadata-expert":avatar3,
  "cosmic-product-manager":avatar4,
  "cosmic-qa-engineer":avatar5,
  "cosmic-team-lead":avatar7,
  "cosmic-ui-designer":avatar8,
  "kwc-frontend-engineer":avatar9,
  "general-app-architecture-expert":avatar10,
  "general-app-development-expert":avatar11,
  "general-app-product-expert":avatar12,
  "general-app-qa-expert":avatar13,
  "general-app-team-lead":avatar14,
  "code-reviewer":avatar15,
  "read-only-analyst":avatar16,
  "security-reviewer":avatar17,
  "software-architect":avatar18,
  "software-engineer":avatar19,
  "software-product-manager":avatar20,
  "software-qa-engineer":avatar21,
  "software-team-lead":avatar22,
  "cosmic-app-development-expert":avatar23,
  "cosmic-plugin-developer":avatar24,
};
export const BUILTIN_CATALOG=[
  {"id":"general-app-team-lead","k":"general-app-team-lead","name":"通用应用团队负责人","role":"通用应用团队负责人","by":"Lingee 内置","desc":"根据已批准的应用需求和设计生成少量可派发的纵向闭环实现任务","tags":["任务规划","纵向切片"],"modes":["分析","设计","规划","集成","评审","恢复"],"comp":["delivery.task-orchestration · principal","delivery.orchestration · principal","delivery.integration · advanced","architecture.boundaries-and-layering · advanced"],"skills":["builtin-skill:general-app-team-lead:skills/general-app-task-orchestration/","builtin-skill:general-app-team-lead:skills/delivery-coordination/"],"cmds":[["根据已批准的需求和设计生成可派发的纵向闭环实现任务","根据已批准的需求和设计生成可派发的纵向闭环实现任务"],["检查实现任务的需求覆盖和验证方式","检查实现任务的需求覆盖和验证方式"]],"source":"builtin","listed":false},
  {"id":"general-app-product-expert","k":"general-app-product-expert","name":"通用应用需求设计智能体","role":"通用应用需求设计智能体","by":"Lingee 内置","desc":"将用户明确目标和已有产品背景转化为可执行的产品需求","tags":["需求设计","产品基线","需求验收"],"modes":["analysis","design","review","recovery"],"comp":["product.baseline · principal","product.baseline-review · advanced"],"skills":["builtin-skill:general-app-product-expert:skills/product-baseline-closure/","builtin-skill:general-app-product-expert:skills/product-baseline-review/"],"cmds":[["把用户提供的产品背景和明确目标整理成产品需求","把用户提供的产品背景和明确目标整理成产品需求"],["为这个需求定义角色、旅程、规则和验收场景","为这个需求定义角色、旅程、规则和验收场景"]],"source":"builtin"},
  {"id":"general-app-architecture-expert","k":"general-app-architecture-expert","name":"通用应用系统设计智能体","role":"通用应用系统设计智能体","by":"Lingee 内置","desc":"读取产品需求和技术证据，将其转化为完整的技术系统设计，并对设计进行独立评审","tags":["系统设计","整体技术方案","分层架构","模块边界","公共模块复用","设计评审"],"modes":["analysis","design","integration","review","recovery"],"comp":["domain.modeling · principal","domain.business-rules · principal","domain.authorization-semantics · advanced","domain.calculation-semantics · advanced","architecture.boundaries-and-layering · principal","architecture.contracts-and-integration · principal","architecture.data-and-migration · advanced","architecture.reliability-and-operability · advanced"],"skills":["builtin-skill:general-app-architecture-expert:skills/system-design/","builtin-skill:general-app-architecture-expert:skills/system-design-review/"],"cmds":[["把这些需求和来源事实转化为一份包含边界、契约、数据、权限和必要技术决策的系统设计","把这些需求和来源事实转化为一份包含边界、契约、数据、权限和必要技术决策的系统设计"],["评审这份系统设计中的边界、数据、权限、外部连接和兼容性风险","评审这份系统设计中的边界、数据、权限、外部连接和兼容性风险"]],"source":"builtin"},
  {"id":"general-app-development-expert","k":"general-app-development-expert","name":"通用应用开发智能体","role":"通用应用开发智能体","by":"Lingee 内置","desc":"实现并集成通用应用变更，提供开发侧验证证据；独立 QA 验收由 QA 负责","tags":["软件实现","开发侧验证"],"modes":["实现","集成","开发侧验证"],"comp":["engineering.implementation · principal","engineering.integration · advanced"],"skills":["builtin-skill:general-app-development-expert:skills/general-app-implementation/"],"cmds":[["追踪这项通用应用变更，实现最小完整修复并补充定向单元测试","追踪这项通用应用变更，实现最小完整修复并补充定向单元测试"]],"source":"builtin"},
  {"id":"general-app-qa-expert","k":"general-app-qa-expert","name":"测试与代码审查智能体","role":"测试与代码审查智能体","by":"Lingee 内置","desc":"检查需求与设计完整度，审阅开发提供的单元测试证据，并通过端到端接口、安全和浏览器测试独立验收应用","tags":["质量保障","独立验证"],"modes":["分析","设计","评审","验证","测试编写","浏览器测试"],"comp":["quality.verification · principal","quality.test-construction · advanced","quality.security-verification · advanced","contract-design · advanced","concurrent-commit-model · advanced"],"skills":["builtin-skill:general-app-qa-expert:skills/quality-verification/","builtin-skill:general-app-qa-expert:skills/security-verification/","builtin-skill:general-app-qa-expert:skills/contract-driven-code-review/"],"cmds":[["检查需求和设计完整度，审阅开发提供的单元测试证据，并执行适用的端到端接口、安全和浏览器验收","检查需求和设计完整度，审阅开发提供的单元测试证据，并执行适用的端到端接口、安全和浏览器验收"],["对照需求和设计文档检查这份验证报告","对照需求和设计文档检查这份验证报告"]],"source":"builtin"},
  {"id":"cosmic-api-engineer","k":"cosmic-api-engineer","name":"苍穹API开发智能体","role":"苍穹API开发智能体","by":"Lingee 内置","desc":"负责苍穹零代码 API、Custom API 与 API 扩展插件的设计和交付","tags":["API","OpenAPI"],"modes":["分析","设计","实现","集成","评审","验证","恢复"],"comp":["api.zero-code · principal","api.custom · advanced","api.extension · advanced","api.verification · advanced"],"skills":["builtin-skill:cosmic-api-engineer:app-build-api.md"],"cmds":[["设计并交付苍穹 API","设计并交付苍穹 API"]],"source":"builtin"},
  {"id":"cosmic-architect","k":"cosmic-architect","name":"苍穹架构师","role":"苍穹架构师","by":"Lingee 内置","desc":"在已验证的平台边界内设计苍穹元数据模型与运行时扩展","tags":["软件架构","可靠性"],"modes":["analysis","design","integration","review","recovery"],"comp":["architecture.system-design · principal","architecture.reliability · advanced"],"skills":["builtin-skill:cosmic-architect:skills/architecture-design/"],"cmds":[["评审架构并闭合主要风险","评审架构并闭合主要风险"]],"source":"builtin"},
  {"id":"cosmic-metadata-expert","k":"cosmic-metadata-expert","name":"苍穹元数据智能体","role":"苍穹元数据智能体","by":"Lingee 内置","desc":"通过原生 app-build 完成苍穹元数据建模、字段、属性、规则、操作和界面配置","tags":["元数据","表单配置"],"modes":["分析","设计","实现","集成","评审","验证","恢复"],"comp":["metadata.modeling · principal","metadata.modification · principal","metadata.ui · advanced","metadata.api · advanced","metadata.verification · advanced"],"skills":["builtin-skill:cosmic-metadata-expert:skills/cosmic-metadata-delivery/","builtin-skill:cosmic-metadata-expert:builtin:app-build"],"cmds":[["创建苍穹表单和实体","创建苍穹表单和实体"],["修改字段、规则、操作和布局","修改字段、规则、操作和布局"]],"source":"builtin"},
  {"id":"cosmic-product-manager","k":"cosmic-product-manager","name":"苍穹产品智能体","role":"苍穹产品智能体","by":"Lingee 内置","desc":"将苍穹应用目标转化为理解元数据边界且可验证的需求","tags":["需求分析","验收设计"],"modes":["分析","设计","评审"],"comp":["product.requirements · principal","product.acceptance-design · advanced"],"skills":["builtin-skill:cosmic-product-manager:skills/requirements-closure/","builtin-skill:cosmic-product-manager:skills/cosmic-requirements-spec/"],"cmds":[["将这个目标整理为有范围的验收条件","将这个目标整理为有范围的验收条件"]],"source":"builtin"},
  {"id":"cosmic-qa-engineer","k":"cosmic-qa-engineer","name":"苍穹质量智能体","role":"苍穹质量智能体","by":"Lingee 内置","desc":"独立验证苍穹元数据、运行时行为、回归影响与交付风险","tags":["质量保障","独立验证"],"modes":["分析","设计","评审","验证"],"comp":["quality.verification · principal","quality.regression-analysis · advanced"],"skills":["builtin-skill:cosmic-qa-engineer:skills/quality-verification/","builtin-skill:cosmic-qa-engineer:skills/cosmic-e2e-test/"],"cmds":[["制定并执行风险驱动的验证计划","制定并执行风险驱动的验证计划"]],"source":"builtin"},
  {"id":"cosmic-team-lead","k":"cosmic-team-lead","name":"苍穹团队负责人","role":"苍穹团队负责人","by":"Lingee 内置","desc":"负责苍穹整单目标，衔接需求、开发与验收能力，按需协调独立工作","tags":["交付管理","开发任务编排"],"modes":["分析","设计","规划","集成","评审","恢复"],"comp":["delivery.orchestration · principal","delivery.task-orchestration · principal","metadata.modeling · awareness","api.zero-code · awareness"],"skills":["builtin-skill:cosmic-team-lead:skills/cosmic-development-task-orchestration/","builtin-skill:cosmic-team-lead:skills/cosmic-delivery-coordination/"],"cmds":[["按智能体分工编排苍穹实施任务","按智能体分工编排苍穹实施任务"]],"source":"builtin","listed":false},
  {"id":"cosmic-ui-designer","k":"cosmic-ui-designer","name":"苍穹 UI 设计师","role":"苍穹 UI 设计师","by":"Lingee 内置","desc":"基于需求为苍穹应用表单和页面创建视觉原型","tags":["原型设计","界面设计"],"modes":["分析","设计","评审"],"comp":["ui.prototype · advanced"],"skills":["builtin-skill:cosmic-ui-designer:skills/ui-prototype/"],"cmds":[["为这个苍穹表单创建视觉原型","为这个苍穹表单创建视觉原型"]],"source":"builtin"},
  {"id":"kwc-frontend-engineer","k":"kwc-frontend-engineer","name":"苍穹KWC前端智能体","role":"苍穹KWC前端智能体","by":"Lingee 内置","desc":"开发苍穹应用 KWC 自定义页面、组件、页面元数据和 KingScript 脚本控制器","tags":["KWC","前端"],"modes":["分析","设计","实现","集成","验证","恢复"],"comp":["kwc.project-init · advanced","kwc.component-dev · advanced","kwc.page-dev · advanced","kwc.controller-dev · advanced","kwc.deploy · advanced"],"skills":["builtin-skill:kwc-frontend-engineer:kd-frontend-development.md"],"cmds":[["为这个苍穹应用开发一个 KWC 自定义页面","为这个苍穹应用开发一个 KWC 自定义页面"]],"source":"builtin"},
  {"id":"code-reviewer","k":"code-reviewer","name":"代码审查智能体","role":"代码审查智能体","by":"Lingee 内置","desc":"独立审查实现正确性、回归风险和交付契约","tags":[],"modes":["评审","验证"],"comp":["implementation-correctness · principal","filesystem-safety · advanced","concurrent-commit-model · principal","contract-design · advanced"],"skills":["builtin-skill:code-reviewer:skills/contract-driven-code-review/"],"cmds":[],"source":"builtin","listed":false},
  {"id":"read-only-analyst","k":"read-only-analyst","name":"只读分析","role":"只读分析","by":"Lingee 内置","desc":"Read-only software analyst","tags":[],"modes":["分析","评审","验证"],"comp":["software.analysis · advanced"],"skills":["builtin-skill:read-only-analyst:skills/repository-analysis/"],"cmds":[],"source":"builtin","listed":false},
  {"id":"security-reviewer","k":"security-reviewer","name":"安全评审","role":"安全评审","by":"Lingee 内置","desc":"Independent application security reviewer","tags":[],"modes":["评审","验证"],"comp":["application-security · principal","filesystem-safety · advanced","concurrent-commit-model · advanced"],"skills":["builtin-skill:security-reviewer:skills/adversarial-security-review/"],"cmds":[],"source":"builtin","listed":false},
  {"id":"software-architect","k":"software-architect","name":"软件架构师","role":"软件架构师","by":"Lingee 内置","desc":"设计可演进的系统边界、合同、数据流与失败处理","tags":["软件架构","可靠性"],"modes":["分析","设计","集成","评审","恢复"],"comp":["architecture.system-design · principal","architecture.reliability · advanced"],"skills":["builtin-skill:software-architect:skills/architecture-design/"],"cmds":[["评审架构并闭合主要风险","评审架构并闭合主要风险"]],"source":"builtin","listed":false},
  {"id":"software-engineer","k":"software-engineer","name":"软件工程师","role":"软件工程师","by":"Lingee 内置","desc":"实现可维护的软件变更并完成针对性验证","tags":["软件实现","系统集成"],"modes":["分析","设计","实现","集成","验证","恢复"],"comp":["engineering.implementation · advanced","engineering.integration · advanced"],"skills":["builtin-skill:software-engineer:skills/software-implementation/"],"cmds":[["实现这项有边界的变更并端到端验证","实现这项有边界的变更并端到端验证"]],"source":"builtin","listed":false},
  {"id":"software-product-manager","k":"software-product-manager","name":"软件产品经理","role":"软件产品经理","by":"Lingee 内置","desc":"将用户目标转化为有优先级且可观察的软件需求","tags":["需求分析","验收设计"],"modes":["分析","设计","评审"],"comp":["product.requirements · principal","product.acceptance-design · advanced"],"skills":["builtin-skill:software-product-manager:skills/requirements-closure/"],"cmds":[["将这个目标整理为有范围的验收条件","将这个目标整理为有范围的验收条件"]],"source":"builtin","listed":false},
  {"id":"software-qa-engineer","k":"software-qa-engineer","name":"软件测试工程师","role":"软件测试工程师","by":"Lingee 内置","desc":"独立验证验收行为、回归影响与交付风险","tags":["质量保障","独立验证"],"modes":["分析","设计","评审","验证"],"comp":["quality.verification · principal","quality.regression-analysis · advanced"],"skills":["builtin-skill:software-qa-engineer:skills/quality-verification/"],"cmds":[["制定并执行风险驱动的验证计划","制定并执行风险驱动的验证计划"]],"source":"builtin","listed":false},
  {"id":"software-team-lead","k":"software-team-lead","name":"软件团队负责人","role":"软件团队负责人","by":"Lingee 内置","desc":"协调范围、分工、集成、风险与交付闭环","tags":["交付管理","团队协调"],"modes":["分析","设计","规划","集成","评审","验证","恢复"],"comp":["delivery.task-orchestration · principal","delivery.orchestration · principal","delivery.integration · advanced"],"skills":["builtin-skill:software-team-lead:skills/delivery-coordination/","builtin-skill:software-team-lead:skills/development-task-orchestration/"],"cmds":[["协调这项工作从范围确认到验证闭环","协调这项工作从范围确认到验证闭环"]],"source":"builtin","listed":false},
  {"id":"cosmic-app-development-expert","k":"cosmic-app-development-expert","name":"苍穹应用开发智能体","role":"苍穹应用开发智能体","by":"Lingee 内置","desc":"通过原生 app-build 技能完成苍穹应用整单开发交付","tags":["应用开发","原生应用构建"],"modes":["分析","设计","实现","集成","评审","验证","恢复"],"comp":["metadata.modeling · principal","metadata.modification · principal","metadata.ui · advanced","metadata.api · advanced","metadata.verification · advanced","plugin.implementation · advanced","api.zero-code · advanced"],"cmds":[["开发或修改这个苍穹应用","开发或修改这个苍穹应用"]],"source":"builtin","skills":["builtin-skill:cosmic-app-development-expert:skills/app-build/","builtin-skill:cosmic-app-development-expert:skills/cosmic-app-plugin-delegation/"]},
  {"id":"cosmic-plugin-developer","k":"cosmic-plugin-developer","name":"苍穹插件开发智能体","role":"苍穹插件开发智能体","by":"Lingee 内置","desc":"复用 app-build 的原生 Java 插件流程，完成业务插件开发、编译、注册和验证","tags":["Java 插件","业务扩展"],"modes":["分析","设计","实现","集成","评审","验证","恢复"],"comp":["engineering.implementation · advanced","engineering.integration · advanced","plugin.implementation · advanced","plugin.codegen · advanced"],"cmds":[["开发苍穹 Java 业务插件","开发苍穹 Java 业务插件"],["修复插件并验证业务行为","修复插件并验证业务行为"]],"source":"builtin","skills":["builtin-skill:cosmic-plugin-developer:skills/cosmic-plugin-development/"]},
  {"id":"general-app-deployment-expert","k":"general-app-deployment-expert","name":"通用应用部署智能体","role":"通用应用部署智能体","by":"Lingee 内置","desc":"把已有应用部署到你选择的云平台，每次改动云资源前先征得你的确认。目前支持：腾讯云开发 CloudBase","tags":["部署","云平台"],"modes":[],"comp":["deployment.cloudbase · advanced"],"cmds":[["把这个应用部署到腾讯云开发 CloudBase","把这个应用部署到腾讯云开发 CloudBase"],["排查上次部署失败的原因","排查上次部署失败的原因"]],"source":"builtin","skills":["builtin-skill:general-app-deployment-expert:skills/cloud-deployment/","builtin-skill:general-app-deployment-expert:skills/cloudbase-deployment/"]},
];
export const BUILTIN_SKILL_META={
  "builtin-skill:cosmic-api-engineer:app-build-api.md": {
    "name": "app build api",
    "desc": "Lingee Build 智能体定义中配置的技能。",
    "tone": "blue"
  },
  "builtin-skill:cosmic-architect:skills/architecture-design/": {
    "name": "苍穹架构设计",
    "desc": "Produce the Cosmic architecture design consumed by development task orchestration.",
    "tone": "blue"
  },
  "builtin-skill:cosmic-metadata-expert:skills/cosmic-metadata-delivery/": {
    "name": "cosmic metadata delivery",
    "desc": "Deliver Cosmic metadata modeling and modification through verified app-build contracts.",
    "tone": "blue"
  },
  "builtin-skill:cosmic-metadata-expert:builtin:app-build": {
    "name": "苍穹应用构建",
    "desc": "Lingee Build 内置能力。",
    "tone": "blue"
  },
  "builtin-skill:cosmic-product-manager:skills/requirements-closure/": {
    "name": "苍穹需求分析",
    "desc": "Load cosmic-requirements-spec for full Cosmic requirement analysis methodology and produce requirements.md as the stage artifact.",
    "tone": "blue"
  },
  "builtin-skill:cosmic-qa-engineer:skills/quality-verification/": {
    "name": "质量验证",
    "desc": "Independently verify software acceptance, regressions, failure behavior, and residual risk.",
    "tone": "blue"
  },
  "builtin-skill:cosmic-team-lead:skills/cosmic-development-task-orchestration/": {
    "name": "苍穹开发任务编排",
    "desc": "Plan Cosmic application implementation with expert-team task decomposition by Cosmic concern type.",
    "tone": "blue"
  },
  "builtin-skill:cosmic-team-lead:skills/cosmic-delivery-coordination/": {
    "name": "苍穹实施协调",
    "desc": "Dispatch and reconcile an approved Cosmic development task plan without replacing its task DAG.",
    "tone": "blue"
  },
  "builtin-skill:cosmic-ui-designer:skills/ui-prototype/": {
    "name": "苍穹 UI 原型设计",
    "desc": "Load kingdee-design for visual prototype creation based on Cosmic requirements.",
    "tone": "blue"
  },
  "builtin-skill:kwc-frontend-engineer:kd-frontend-development.md": {
    "name": "kd frontend development",
    "desc": "Lingee Build 智能体定义中配置的技能。",
    "tone": "blue"
  },
  "builtin-skill:general-app-architecture-expert:skills/system-design/": {
    "name": "通用应用系统设计",
    "desc": "Turn a product requirements baseline into the smallest understandable and implementable system design.",
    "tone": "blue"
  },
  "builtin-skill:general-app-architecture-expert:skills/system-design-review/": {
    "name": "通用应用系统设计评审",
    "desc": "Independently review one combined business-and-technical system design without modifying the source artifact.",
    "tone": "blue"
  },
  "builtin-skill:general-app-development-expert:skills/general-app-implementation/": {
    "name": "通用应用实现",
    "desc": "Implement and verify scoped general-application changes across the complete affected call chain.",
    "tone": "blue"
  },
  "builtin-skill:general-app-product-expert:skills/product-baseline-closure/": {
    "name": "需求设计闭合",
    "desc": "Convert explicit user goals and provided product context into one executable product requirements document with functional and acceptance coverage.",
    "tone": "blue"
  },
  "builtin-skill:general-app-product-expert:skills/product-baseline-review/": {
    "name": "需求设计评审",
    "desc": "Independently review a requirement design for journey coverage, functional behavior, and executable acceptance.",
    "tone": "blue"
  },
  "builtin-skill:general-app-qa-expert:skills/quality-verification/": {
    "name": "通用应用质量验证",
    "desc": "Independently plan and execute risk-based verification for a general application, reproduce failures, and issue traceable quality evidence.",
    "tone": "blue"
  },
  "builtin-skill:general-app-qa-expert:skills/security-verification/": {
    "name": "安全验证",
    "desc": "Plan and execute authorized security verification for general applications, covering authentication, authorization, tenant isolation, input handling, secret management, and dependency exposure.",
    "tone": "blue"
  },
  "builtin-skill:general-app-qa-expert:skills/contract-driven-code-review/": {
    "name": "Contract-driven code review",
    "desc": "Review the contract, implementation, and existing test evidence, recording each reviewed acceptance criterion with its code location and basis.",
    "tone": "blue"
  },
  "builtin-skill:general-app-team-lead:skills/general-app-task-orchestration/": {
    "name": "通用应用任务编排 / General Application Task Orchestration",
    "desc": "Split an approved general application architecture-baseline.md into bounded, independently verifiable vertical-slice implementation tasks.",
    "tone": "blue"
  },
  "builtin-skill:general-app-team-lead:skills/delivery-coordination/": {
    "name": "通用应用交付协调",
    "desc": "Coordinate general application slices, evidence-based integration gates, and delivery closure.",
    "tone": "blue"
  },
  "builtin-skill:code-reviewer:skills/contract-driven-code-review/": {
    "name": "Contract-driven code review",
    "desc": "Lingee Build 智能体定义中配置的技能。",
    "tone": "blue"
  },
  "builtin-skill:read-only-analyst:skills/repository-analysis/": {
    "name": "Repository analysis",
    "desc": "Lingee Build 智能体定义中配置的技能。",
    "tone": "blue"
  },
  "builtin-skill:security-reviewer:skills/adversarial-security-review/": {
    "name": "Adversarial security review",
    "desc": "Lingee Build 智能体定义中配置的技能。",
    "tone": "blue"
  },
  "builtin-skill:software-architect:skills/architecture-design/": {
    "name": "架构设计",
    "desc": "Design and review software boundaries, contracts, data flows, migration, and resilience.",
    "tone": "blue"
  },
  "builtin-skill:software-engineer:skills/software-implementation/": {
    "name": "软件实现",
    "desc": "Implement scoped software changes using repository conventions and behavior-focused verification.",
    "tone": "blue"
  },
  "builtin-skill:software-product-manager:skills/requirements-closure/": {
    "name": "需求闭合",
    "desc": "Convert software product goals into scoped workflows and observable acceptance criteria.",
    "tone": "blue"
  },
  "builtin-skill:software-qa-engineer:skills/quality-verification/": {
    "name": "质量验证",
    "desc": "Independently verify software acceptance, regressions, failure behavior, and residual risk.",
    "tone": "blue"
  },
  "builtin-skill:software-team-lead:skills/delivery-coordination/": {
    "name": "交付协调",
    "desc": "Coordinate bounded software delivery assignments and evidence-based integration gates.",
    "tone": "blue"
  },
  "builtin-skill:software-team-lead:skills/development-task-orchestration/": {
    "name": "开发任务编排 / Development Task Orchestration",
    "desc": "Author a bounded implementation task DAG for general software delivery.",
    "tone": "blue"
  },
  "builtin-skill:cosmic-app-development-expert:skills/app-build/": {
    "name": "苍穹应用构建",
    "desc": "通过原生 app-build 完成苍穹应用整单开发交付。",
    "tone": "blue"
  },
  "builtin-skill:cosmic-app-development-expert:skills/cosmic-app-plugin-delegation/": {
    "name": "苍穹应用插件委派",
    "desc": "将 Java 插件开发委派给受限子任务，保留原生注册和交付所有权。",
    "tone": "blue"
  },
  "builtin-skill:cosmic-plugin-developer:skills/cosmic-plugin-development/": {
    "name": "苍穹插件开发",
    "desc": "复用 app-build 原生流程开发、编译、注册和验证 Java 业务插件。",
    "tone": "blue"
  },
  "builtin-skill:general-app-deployment-expert:skills/cloud-deployment/": {
    "name": "云部署通用流程",
    "desc": "所有已支持云平台共用的部署流程与安全规则",
    "tone": "blue"
  },
  "builtin-skill:general-app-deployment-expert:skills/cloudbase-deployment/": {
    "name": "腾讯云开发 CloudBase 部署",
    "desc": "CloudBase 的工具、参考资料与已知问题",
    "tone": "blue"
  },
  "builtin-skill:cosmic-product-manager:skills/cosmic-requirements-spec/": {
    "name": "苍穹需求分析",
    "desc": "将苍穹应用目标转化为理解元数据边界且可验证的需求规格。",
    "tone": "blue"
  },
  "builtin-skill:cosmic-qa-engineer:skills/cosmic-e2e-test/": {
    "name": "苍穹端到端测试",
    "desc": "对苍穹应用元数据和运行时行为执行端到端验证，覆盖回归影响与交付风险。",
    "tone": "blue"
  }
};
export function builtinAvatar(id){return avatars[id]||null;}
