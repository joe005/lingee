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
  {"id":"cosmic-product-manager","k":"cosmic-product-manager","name":"苍穹产品智能体","role":"苍穹产品智能体","by":"Lingee 内置","desc":"梳理业务需求、应用范围和验收要求","tags":["需求分析","验收设计"],"modes":["分析","设计","评审"],"comp":["product.requirements · principal","product.acceptance-design · advanced"],"skills":["builtin-skill:cosmic-product-manager:skills/requirements-closure/","builtin-skill:cosmic-product-manager:skills/cosmic-requirements-spec/"],"cmds":[["将这个目标整理为有范围的验收条件","将这个目标整理为有范围的验收条件"]],"source":"builtin"},
  {"id":"cosmic-app-development-expert","k":"cosmic-app-development-expert","name":"苍穹应用开发智能体","role":"苍穹应用开发智能体","by":"Lingee 内置","desc":"开发苍穹表单、业务规则和应用功能","tags":["应用开发","原生应用构建"],"modes":["分析","设计","实现","集成","评审","验证","恢复"],"comp":["metadata.modeling · principal","metadata.modification · principal","metadata.ui · advanced","metadata.api · advanced","metadata.verification · advanced","plugin.implementation · advanced","api.zero-code · advanced"],"cmds":[["开发或修改这个苍穹应用","开发或修改这个苍穹应用"]],"source":"builtin","skills":["builtin-skill:cosmic-app-development-expert:skills/app-build/","builtin-skill:cosmic-app-development-expert:skills/cosmic-app-plugin-delegation/"]},
  {"id":"cosmic-qa-engineer","k":"cosmic-qa-engineer","name":"苍穹质量智能体","role":"苍穹质量智能体","by":"Lingee 内置","desc":"测试业务流程、数据保存和交付质量","tags":["质量保障","独立验证"],"modes":["分析","设计","评审","验证"],"comp":["quality.verification · principal","quality.regression-analysis · advanced"],"skills":["builtin-skill:cosmic-qa-engineer:skills/quality-verification/","builtin-skill:cosmic-qa-engineer:skills/cosmic-e2e-test/"],"cmds":[["制定并执行风险驱动的验证计划","制定并执行风险驱动的验证计划"]],"source":"builtin"},
  {"id":"general-app-team-lead","k":"general-app-team-lead","name":"通用应用开发团队智能体","role":"通用应用开发团队智能体","by":"Lingee 内置","desc":"根据已批准的应用需求和设计生成少量可派发的纵向闭环实现任务","tags":["任务规划","纵向切片"],"modes":["分析","设计","规划","集成","评审","恢复"],"comp":["delivery.task-orchestration · principal","delivery.orchestration · principal","delivery.integration · advanced","architecture.boundaries-and-layering · advanced"],"skills":["builtin-skill:general-app-team-lead:skills/general-app-task-orchestration/","builtin-skill:general-app-team-lead:skills/delivery-coordination/"],"cmds":[["根据已批准的需求和设计生成可派发的纵向闭环实现任务","根据已批准的需求和设计生成可派发的纵向闭环实现任务"],["检查实现任务的需求覆盖和验证方式","检查实现任务的需求覆盖和验证方式"]],"source":"builtin","listed":false},
  {"id":"general-app-product-expert","k":"general-app-product-expert","name":"通用应用需求设计智能体","role":"通用应用需求设计智能体","by":"Lingee 内置","desc":"将用户明确目标和已有产品背景转化为可执行的产品需求","tags":["需求设计","产品基线","需求验收"],"modes":["分析","设计","评审","恢复"],"comp":["product.baseline · principal","product.baseline-review · advanced"],"skills":["builtin-skill:general-app-product-expert:skills/product-baseline-closure/","builtin-skill:general-app-product-expert:skills/product-baseline-review/"],"cmds":[["把用户提供的产品背景和明确目标整理成产品需求","把用户提供的产品背景和明确目标整理成产品需求"],["为这个需求定义角色、旅程、规则和验收场景","为这个需求定义角色、旅程、规则和验收场景"]],"source":"builtin"},
  {"id":"general-app-architecture-expert","k":"general-app-architecture-expert","name":"通用应用系统设计智能体","role":"通用应用系统设计智能体","by":"Lingee 内置","desc":"读取产品需求和技术证据，将其转化为完整的技术系统设计，并对设计进行独立评审","tags":["系统设计","整体技术方案","分层架构","模块边界","公共模块复用","设计评审"],"modes":["分析","设计","集成","评审","恢复"],"comp":["domain.modeling · principal","domain.business-rules · principal","domain.authorization-semantics · advanced","domain.calculation-semantics · advanced","architecture.boundaries-and-layering · principal","architecture.contracts-and-integration · principal","architecture.data-and-migration · advanced","architecture.reliability-and-operability · advanced"],"skills":["builtin-skill:general-app-architecture-expert:skills/system-design/","builtin-skill:general-app-architecture-expert:skills/system-design-review/"],"cmds":[["把这些需求和来源事实转化为一份包含边界、契约、数据、权限和必要技术决策的系统设计","把这些需求和来源事实转化为一份包含边界、契约、数据、权限和必要技术决策的系统设计"],["评审这份系统设计中的边界、数据、权限、外部连接和兼容性风险","评审这份系统设计中的边界、数据、权限、外部连接和兼容性风险"]],"source":"builtin"},
  {"id":"general-app-development-expert","k":"general-app-development-expert","name":"通用应用开发智能体","role":"通用应用开发智能体","by":"Lingee 内置","desc":"实现并集成通用应用变更，提供开发侧验证证据；独立 QA 验收由 QA 负责","tags":["软件实现","开发侧验证"],"modes":["实现","集成","开发侧验证"],"comp":["engineering.implementation · principal","engineering.integration · advanced"],"skills":["builtin-skill:general-app-development-expert:skills/general-app-implementation/"],"cmds":[["追踪这项通用应用变更，实现最小完整修复并补充定向单元测试","追踪这项通用应用变更，实现最小完整修复并补充定向单元测试"]],"source":"builtin"},
  {"id":"general-app-qa-expert","k":"general-app-qa-expert","name":"测试与代码审查智能体","role":"测试与代码审查智能体","by":"Lingee 内置","desc":"检查需求与设计完整度，审阅开发提供的单元测试证据，并通过端到端接口、安全和浏览器测试独立验收应用","tags":["质量保障","独立验证"],"modes":["分析","设计","评审","验证","测试编写","浏览器测试"],"comp":["quality.verification · principal","quality.test-construction · advanced","quality.security-verification · advanced","contract-design · advanced","concurrent-commit-model · advanced"],"skills":["builtin-skill:general-app-qa-expert:skills/quality-verification/","builtin-skill:general-app-qa-expert:skills/security-verification/","builtin-skill:general-app-qa-expert:skills/contract-driven-code-review/"],"cmds":[["检查需求和设计完整度，审阅开发提供的单元测试证据，并执行适用的端到端接口、安全和浏览器验收","检查需求和设计完整度，审阅开发提供的单元测试证据，并执行适用的端到端接口、安全和浏览器验收"],["对照需求和设计文档检查这份验证报告","对照需求和设计文档检查这份验证报告"]],"source":"builtin","listed":false},
  {"id":"cosmic-api-engineer","k":"cosmic-api-engineer","name":"苍穹API开发智能体","role":"苍穹API开发智能体","by":"Lingee 内置","desc":"负责苍穹零代码 API、Custom API 与 API 扩展插件的设计和交付","tags":["API","OpenAPI"],"modes":["分析","设计","实现","集成","评审","验证","恢复"],"comp":["api.zero-code · principal","api.custom · advanced","api.extension · advanced","api.verification · advanced"],"skills":["builtin-skill:cosmic-api-engineer:app-build-api.md"],"cmds":[["设计并交付苍穹 API","设计并交付苍穹 API"]],"source":"builtin"},
  {"id":"cosmic-architect","k":"cosmic-architect","name":"苍穹架构师","role":"苍穹架构师","by":"Lingee 内置","desc":"在已验证的平台边界内设计苍穹元数据模型与运行时扩展","tags":["软件架构","可靠性"],"modes":["分析","设计","集成","评审","恢复"],"comp":["architecture.system-design · principal","architecture.reliability · advanced"],"skills":["builtin-skill:cosmic-architect:skills/architecture-design/"],"cmds":[["评审架构并闭合主要风险","评审架构并闭合主要风险"]],"source":"builtin","listed":false},
  {"id":"cosmic-metadata-expert","k":"cosmic-metadata-expert","name":"苍穹元数据智能体","role":"苍穹元数据智能体","by":"Lingee 内置","desc":"通过原生 app-build 完成苍穹元数据建模、字段、属性、规则、操作和界面配置","tags":["元数据","表单配置"],"modes":["分析","设计","实现","集成","评审","验证","恢复"],"comp":["metadata.modeling · principal","metadata.modification · principal","metadata.ui · advanced","metadata.api · advanced","metadata.verification · advanced"],"skills":["builtin-skill:cosmic-metadata-expert:skills/cosmic-metadata-delivery/","builtin-skill:cosmic-metadata-expert:builtin:app-build"],"cmds":[["创建苍穹表单和实体","创建苍穹表单和实体"],["修改字段、规则、操作和布局","修改字段、规则、操作和布局"]],"source":"builtin","listed":false},
  {"id":"cosmic-team-lead","k":"cosmic-team-lead","name":"苍穹团队负责人","role":"苍穹团队负责人","by":"Lingee 内置","desc":"负责苍穹整单目标，衔接需求、开发与验收能力，按需协调独立工作","tags":["交付管理","开发任务编排"],"modes":["分析","设计","规划","集成","评审","恢复"],"comp":["delivery.orchestration · principal","delivery.task-orchestration · principal","metadata.modeling · awareness","api.zero-code · awareness"],"skills":["builtin-skill:cosmic-team-lead:skills/cosmic-development-task-orchestration/","builtin-skill:cosmic-team-lead:skills/cosmic-delivery-coordination/"],"cmds":[["按智能体分工编排苍穹实施任务","按智能体分工编排苍穹实施任务"]],"source":"builtin","listed":false},
  {"id":"cosmic-ui-designer","k":"cosmic-ui-designer","name":"苍穹 UI 设计师","role":"苍穹 UI 设计师","by":"Lingee 内置","desc":"基于需求为苍穹应用表单和页面创建视觉原型","tags":["原型设计","界面设计"],"modes":["分析","设计","评审"],"comp":["ui.prototype · advanced"],"skills":["builtin-skill:cosmic-ui-designer:skills/ui-prototype/"],"cmds":[["为这个苍穹表单创建视觉原型","为这个苍穹表单创建视觉原型"]],"source":"builtin","listed":false},
  {"id":"kwc-frontend-engineer","k":"kwc-frontend-engineer","name":"苍穹KWC前端智能体","role":"苍穹KWC前端智能体","by":"Lingee 内置","desc":"开发苍穹应用 KWC 自定义页面、组件、页面元数据和 KingScript 脚本控制器","tags":["KWC","前端"],"modes":["分析","设计","实现","集成","验证","恢复"],"comp":["kwc.project-init · advanced","kwc.component-dev · advanced","kwc.page-dev · advanced","kwc.controller-dev · advanced","kwc.deploy · advanced"],"skills":["builtin-skill:kwc-frontend-engineer:kd-frontend-development.md"],"cmds":[["为这个苍穹应用开发一个 KWC 自定义页面","为这个苍穹应用开发一个 KWC 自定义页面"]],"source":"builtin","listed":false},
  {"id":"code-reviewer","k":"code-reviewer","name":"代码审查智能体","role":"代码审查智能体","by":"Lingee 内置","desc":"独立审查实现正确性、回归风险和交付契约","tags":[],"modes":["评审","验证"],"comp":["implementation-correctness · principal","filesystem-safety · advanced","concurrent-commit-model · principal","contract-design · advanced"],"skills":["builtin-skill:code-reviewer:skills/contract-driven-code-review/"],"cmds":[],"source":"builtin","listed":false},
  {"id":"read-only-analyst","k":"read-only-analyst","name":"read-only-analyst","role":"read-only-analyst","by":"Lingee 内置","desc":"Read-only software analyst","tags":[],"modes":["分析","评审","验证"],"comp":["software.analysis · advanced"],"skills":["builtin-skill:read-only-analyst:skills/repository-analysis/"],"cmds":[],"source":"builtin","listed":false},
  {"id":"security-reviewer","k":"security-reviewer","name":"security-reviewer","role":"security-reviewer","by":"Lingee 内置","desc":"Independent application security reviewer","tags":[],"modes":["评审","验证"],"comp":["application-security · principal","filesystem-safety · advanced","concurrent-commit-model · advanced"],"skills":["builtin-skill:security-reviewer:skills/adversarial-security-review/"],"cmds":[],"source":"builtin","listed":false},
  {"id":"software-architect","k":"software-architect","name":"软件架构师","role":"软件架构师","by":"Lingee 内置","desc":"设计可演进的系统边界、合同、数据流与失败处理","tags":["软件架构","可靠性"],"modes":["分析","设计","集成","评审","恢复"],"comp":["architecture.system-design · principal","architecture.reliability · advanced"],"skills":["builtin-skill:software-architect:skills/architecture-design/"],"cmds":[["评审架构并闭合主要风险","评审架构并闭合主要风险"]],"source":"builtin","listed":false},
  {"id":"software-engineer","k":"software-engineer","name":"软件工程师","role":"软件工程师","by":"Lingee 内置","desc":"实现可维护的软件变更并完成针对性验证","tags":["软件实现","系统集成"],"modes":["分析","设计","实现","集成","验证","恢复"],"comp":["engineering.implementation · advanced","engineering.integration · advanced"],"skills":["builtin-skill:software-engineer:skills/software-implementation/"],"cmds":[["实现这项有边界的变更并端到端验证","实现这项有边界的变更并端到端验证"]],"source":"builtin","listed":false},
  {"id":"software-product-manager","k":"software-product-manager","name":"软件产品经理","role":"软件产品经理","by":"Lingee 内置","desc":"将用户目标转化为有优先级且可观察的软件需求","tags":["需求分析","验收设计"],"modes":["分析","设计","评审"],"comp":["product.requirements · principal","product.acceptance-design · advanced"],"skills":["builtin-skill:software-product-manager:skills/requirements-closure/"],"cmds":[["将这个目标整理为有范围的验收条件","将这个目标整理为有范围的验收条件"]],"source":"builtin","listed":false},
  {"id":"software-qa-engineer","k":"software-qa-engineer","name":"软件测试工程师","role":"软件测试工程师","by":"Lingee 内置","desc":"独立验证验收行为、回归影响与交付风险","tags":["质量保障","独立验证"],"modes":["分析","设计","评审","验证"],"comp":["quality.verification · principal","quality.regression-analysis · advanced"],"skills":["builtin-skill:software-qa-engineer:skills/quality-verification/"],"cmds":[["制定并执行风险驱动的验证计划","制定并执行风险驱动的验证计划"]],"source":"builtin","listed":false},
  {"id":"software-team-lead","k":"software-team-lead","name":"软件团队负责人","role":"软件团队负责人","by":"Lingee 内置","desc":"协调范围、分工、集成、风险与交付闭环","tags":["交付管理","团队协调"],"modes":["分析","设计","规划","集成","评审","验证","恢复"],"comp":["delivery.task-orchestration · principal","delivery.orchestration · principal","delivery.integration · advanced"],"skills":["builtin-skill:software-team-lead:skills/delivery-coordination/","builtin-skill:software-team-lead:skills/development-task-orchestration/"],"cmds":[["协调这项工作从范围确认到验证闭环","协调这项工作从范围确认到验证闭环"]],"source":"builtin","listed":false},
  {"id":"cosmic-plugin-developer","k":"cosmic-plugin-developer","name":"苍穹插件开发智能体","role":"苍穹插件开发智能体","by":"Lingee 内置","desc":"复用 app-build 的原生 Java 插件流程，完成业务插件开发、编译、注册和验证","tags":["Java 插件","业务扩展"],"modes":["分析","设计","实现","集成","评审","验证","恢复"],"comp":["engineering.implementation · advanced","engineering.integration · advanced","plugin.implementation · advanced","plugin.codegen · advanced"],"cmds":[["开发苍穹 Java 业务插件","开发苍穹 Java 业务插件"],["修复插件并验证业务行为","修复插件并验证业务行为"]],"source":"builtin","skills":["builtin-skill:cosmic-plugin-developer:skills/cosmic-plugin-development/"],"listed":false},
  {"id":"general-app-deployment-expert","k":"general-app-deployment-expert","name":"通用应用部署智能体","role":"通用应用部署智能体","by":"Lingee 内置","desc":"把已有应用部署到你选择的云平台，每次改动云资源前先征得你的确认。目前支持：腾讯云开发 CloudBase","tags":["部署","云平台"],"modes":[],"comp":["deployment.cloudbase · advanced"],"cmds":[["把这个应用部署到腾讯云开发 CloudBase","把这个应用部署到腾讯云开发 CloudBase"],["排查上次部署失败的原因","排查上次部署失败的原因"]],"source":"builtin","skills":["builtin-skill:general-app-deployment-expert:skills/cloud-deployment/","builtin-skill:general-app-deployment-expert:skills/cloudbase-deployment/","builtin-skill:general-app-deployment-expert:market:cloudbase"]},
];
export const BUILTIN_SKILL_META={
  "builtin-skill:cosmic-api-engineer:app-build-api.md": {
    "name": "苍穹 API 开发",
    "desc": "按零代码、Custom API 或 API 插件需求选择对应的 app-build 入口。",
    "tone": "blue"
  },
  "builtin-skill:cosmic-architect:skills/architecture-design/": {
    "name": "苍穹架构设计",
    "desc": "本阶段只负责把已确认的需求和 UI 原型转换为苍穹架构设计。",
    "tone": "blue"
  },
  "builtin-skill:cosmic-metadata-expert:skills/cosmic-metadata-delivery/": {
    "name": "苍穹元数据交付",
    "desc": "依据已验证的 app-build 契约完成苍穹元数据建模和修改。",
    "tone": "blue"
  },
  "builtin-skill:cosmic-metadata-expert:builtin:app-build": {
    "name": "苍穹应用构建",
    "desc": "创建或修改苍穹表单、字段、规则、操作、布局、菜单或 Java 行为，并验证元数据交付结果。",
    "tone": "blue"
  },
  "builtin-skill:cosmic-product-manager:skills/requirements-closure/": {
    "name": "苍穹需求分析",
    "desc": "核对已有需求，按需澄清业务缺口，沿用原文和验收条件。",
    "tone": "blue"
  },
  "builtin-skill:cosmic-qa-engineer:skills/quality-verification/": {
    "name": "质量验证",
    "desc": "将验收条件映射到测试场景和证据。",
    "tone": "blue"
  },
  "builtin-skill:cosmic-team-lead:skills/cosmic-development-task-orchestration/": {
    "name": "苍穹开发任务编排",
    "desc": "按苍穹应用开发特征和智能体分工，将需求分解为 `development-task-plan.json` 的任务 DAG。",
    "tone": "blue"
  },
  "builtin-skill:cosmic-team-lead:skills/cosmic-delivery-coordination/": {
    "name": "苍穹实施协调",
    "desc": "本阶段只协调已经批准并冻结的 `development-task-plan.json`。",
    "tone": "blue"
  },
  "builtin-skill:cosmic-ui-designer:skills/ui-prototype/": {
    "name": "苍穹 UI 原型设计",
    "desc": "本阶段通过 `kingdee-design` 平台技能创建视觉原型。",
    "tone": "blue"
  },
  "builtin-skill:kwc-frontend-engineer:kd-frontend-development.md": {
    "name": "KWC 前端开发",
    "desc": "按已确认范围开发 KWC 项目、页面、组件和 Controller，保留原生接口与部署契约。",
    "tone": "blue"
  },
  "builtin-skill:general-app-architecture-expert:skills/system-design/": {
    "name": "系统设计",
    "desc": "将产品需求和技术证据转化为按需裁剪的架构基线、技术契约和工作区初始化配置。",
    "tone": "blue"
  },
  "builtin-skill:general-app-architecture-expert:skills/system-design-review/": {
    "name": "系统设计评审",
    "desc": "独立评审架构基线和技术契约，检查边界、数据、迁移和可靠性风险。",
    "tone": "blue"
  },
  "builtin-skill:general-app-development-expert:skills/general-app-implementation/": {
    "name": "通用应用实现",
    "desc": "当任务需要新建、迭代、修复、重构或集成通用 Web、前端、后端、API、数据库或业务应用时使用。",
    "tone": "blue"
  },
  "builtin-skill:general-app-product-expert:skills/product-baseline-closure/": {
    "name": "产品基线闭合",
    "desc": "本 Skill 是 Product Agent 的核心闭合能力。",
    "tone": "blue"
  },
  "builtin-skill:general-app-product-expert:skills/product-baseline-review/": {
    "name": "产品基线评审",
    "desc": "独立检查已经生成的产品基线是否足以支持领域确认、架构设计、开发和验收。",
    "tone": "blue"
  },
  "builtin-skill:general-app-qa-expert:skills/quality-verification/": {
    "name": "通用应用质量验证",
    "desc": "对照需求和设计文档检查完整度，并执行单元、端到端接口、安全和浏览器测试。",
    "tone": "blue"
  },
  "builtin-skill:general-app-qa-expert:skills/security-verification/": {
    "name": "安全验证",
    "desc": "验证认证、授权、租户隔离、输入处理和敏感信息保护。",
    "tone": "blue"
  },
  "builtin-skill:general-app-qa-expert:skills/contract-driven-code-review/": {
    "name": "契约驱动代码审查",
    "desc": "对照契约、实现与已有测试证据审查，逐项记录审查过的验收条件及其代码位置和依据。",
    "tone": "blue"
  },
  "builtin-skill:general-app-team-lead:skills/general-app-task-orchestration/": {
    "name": "通用应用任务编排",
    "desc": "根据已批准的应用需求和设计生成一个完整实现任务。",
    "tone": "blue"
  },
  "builtin-skill:general-app-team-lead:skills/delivery-coordination/": {
    "name": "通用应用交付协调",
    "desc": "协调各阶段推进并汇总交付回执，受阻时给出明确的阻塞原因。",
    "tone": "blue"
  },
  "builtin-skill:code-reviewer:skills/contract-driven-code-review/": {
    "name": "契约驱动代码审查",
    "desc": "结合实现与测试检查缺陷，将问题对应到被违反的约束，并报告实际行为、影响和可验证的修复条件。",
    "tone": "blue"
  },
  "builtin-skill:read-only-analyst:skills/repository-analysis/": {
    "name": "代码仓库分析",
    "desc": "阅读相关契约与实现，追踪受影响的调用路径，并给出有边界、有证据的分析结论。",
    "tone": "blue"
  },
  "builtin-skill:security-reviewer:skills/adversarial-security-review/": {
    "name": "对抗式安全审查",
    "desc": "建立有边界的威胁模型，检查绕过与竞态场景，报告风险等级、利用步骤、受影响的保障及所需缓解措施。",
    "tone": "blue"
  },
  "builtin-skill:software-architect:skills/architecture-design/": {
    "name": "架构设计",
    "desc": "先提取质量属性和硬约束，再比较最少两个可行方案。",
    "tone": "blue"
  },
  "builtin-skill:software-engineer:skills/software-implementation/": {
    "name": "软件实现",
    "desc": "读取相关源码和测试，建立当前行为证据。",
    "tone": "blue"
  },
  "builtin-skill:software-product-manager:skills/requirements-closure/": {
    "name": "需求闭合",
    "desc": "识别用户、触发条件、目标结果和失败影响；绘制当前与目标流程差异。",
    "tone": "blue"
  },
  "builtin-skill:software-qa-engineer:skills/quality-verification/": {
    "name": "质量验证",
    "desc": "将验收条件映射到测试场景和证据。",
    "tone": "blue"
  },
  "builtin-skill:software-team-lead:skills/delivery-coordination/": {
    "name": "交付协调",
    "desc": "建立范围清单和依赖图，给每项产出指定唯一责任人。",
    "tone": "blue"
  },
  "builtin-skill:software-team-lead:skills/development-task-orchestration/": {
    "name": "开发任务编排 / Development Task Orchestration",
    "desc": "Software Team Lead 负责把已批准的 requirements 与 design 拆分为可独立交付、可独立验收的任务语义。",
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
    "name": "腾讯云开发部署规则",
    "desc": "部署到 CloudBase 的补充规则与已知问题",
    "tone": "blue"
  },
  "builtin-skill:cosmic-product-manager:skills/cosmic-requirements-spec/": {
    "name": "苍穹需求分析",
    "desc": "将苍穹应用目标转化为理解元数据边界且可验证的需求规格。",
    "tone": "blue"
  },
  "builtin-skill:cosmic-qa-engineer:skills/cosmic-e2e-test/": {
    "name": "苍穹端到端测试",
    "desc": "优先通过浏览器验收苍穹表单、业务流程及持久化，覆盖负向用例与交付风险。",
    "tone": "blue"
  },
  "builtin-skill:general-app-deployment-expert:market:cloudbase": {
    "name": "腾讯云开发 CloudBase",
    "desc": "腾讯云开发官方技能，从“更多技能”安装",
    "tone": "blue"
  }
};
/* 与 Lingee Build 一致不单独展示的内置智能体（团队负责人、未启用的 shared 智能体）；按 id 判断，旧存档里的快照也不会把它们带回列表 */
export const UNLISTED_EXPERT_IDS=new Set(BUILTIN_CATALOG.filter(e=>e.listed===false).map(e=>e.id));
export function builtinAvatar(id){return avatars[id]||null;}
