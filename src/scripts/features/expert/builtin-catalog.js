/* Lingee Build builtin-experts 的智能体名称、说明、标签、工作模式与头像快照。 */
import avatar0 from '../../../assets/expert-avatars/cosmic-api-engineer.png';
import avatar1 from '../../../assets/expert-avatars/cosmic-architect.png';
import avatar2 from '../../../assets/expert-avatars/cosmic-code-reviewer.png';
import avatar3 from '../../../assets/expert-avatars/cosmic-metadata-expert.png';
import avatar4 from '../../../assets/expert-avatars/cosmic-product-manager.png';
import avatar5 from '../../../assets/expert-avatars/cosmic-qa-engineer.png';
import avatar6 from '../../../assets/expert-avatars/cosmic-software-engineer.png';
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
const avatars={
  "cosmic-api-engineer":avatar0,
  "cosmic-architect":avatar1,
  "cosmic-code-reviewer":avatar2,
  "cosmic-metadata-expert":avatar3,
  "cosmic-product-manager":avatar4,
  "cosmic-qa-engineer":avatar5,
  "cosmic-software-engineer":avatar6,
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
};
export const BUILTIN_CATALOG=[
  {"id":"general-app-team-lead","k":"general-app-team-lead","name":"通用应用团队负责人","role":"通用应用团队负责人","by":"Lingee 内置","desc":"将已批准的应用设计拆分为边界清晰、可独立验证的实现切片","tags":["任务拆分","纵向切片"],"modes":["分析","设计","规划","集成","评审","恢复"],"comp":["delivery.task-orchestration · principal","delivery.orchestration · principal","delivery.integration · advanced","architecture.boundaries-and-layering · advanced"],"skills":["builtin-skill:general-app-team-lead:skills/general-app-task-orchestration/","builtin-skill:general-app-team-lead:skills/delivery-coordination/"],"cmds":[["把已批准的设计拆成可独立验证的应用开发任务","把已批准的设计拆成可独立验证的应用开发任务"],["检查这份任务计划的边界、依赖与验证条件","检查这份任务计划的边界、依赖与验证条件"]],"source":"builtin"},
  {"id":"general-app-product-expert","k":"general-app-product-expert","name":"通用应用需求设计","role":"通用应用需求设计","by":"Lingee 内置","desc":"将用户明确目标和已有产品背景转化为可执行的产品需求","tags":["需求设计","产品基线","需求验收"],"modes":["分析","设计","评审","恢复"],"comp":["product.baseline · principal","product.baseline-review · advanced"],"skills":["builtin-skill:general-app-product-expert:skills/product-baseline-closure/","builtin-skill:general-app-product-expert:skills/product-baseline-review/"],"cmds":[["把用户提供的产品背景和明确目标整理成产品需求","把用户提供的产品背景和明确目标整理成产品需求"],["为这个需求定义角色、旅程、规则和验收场景","为这个需求定义角色、旅程、规则和验收场景"]],"source":"builtin"},
  {"id":"general-app-architecture-expert","k":"general-app-architecture-expert","name":"通用应用系统设计","role":"通用应用系统设计","by":"Lingee 内置","desc":"读取产品需求和技术证据，将其转化为完整的技术系统设计，并对设计进行独立评审","tags":["系统设计","整体技术方案","分层架构","模块边界","公共模块复用","设计评审"],"modes":["分析","设计","集成","评审","恢复"],"comp":["domain.modeling · principal","domain.business-rules · principal","domain.authorization-semantics · advanced","domain.calculation-semantics · advanced","architecture.boundaries-and-layering · principal","architecture.contracts-and-integration · principal","architecture.data-and-migration · advanced","architecture.reliability-and-operability · advanced"],"skills":["builtin-skill:general-app-architecture-expert:skills/system-design/","builtin-skill:general-app-architecture-expert:skills/system-design-review/"],"cmds":[["把这些需求和来源事实转化为一份包含边界、契约、数据、权限和必要技术决策的系统设计","把这些需求和来源事实转化为一份包含边界、契约、数据、权限和必要技术决策的系统设计"],["评审这份系统设计中的边界、数据、权限、外部连接和兼容性风险","评审这份系统设计中的边界、数据、权限、外部连接和兼容性风险"]],"source":"builtin"},
  {"id":"general-app-development-expert","k":"general-app-development-expert","name":"通用应用开发","role":"通用应用开发","by":"Lingee 内置","desc":"追踪根因并实现可维护的通用应用变更，形成可追溯验证","tags":["软件实现","根因分析","纵向切片"],"modes":["分析","设计","实现","集成","验证","恢复"],"comp":["engineering.implementation · principal","engineering.diagnosis · advanced","engineering.integration · advanced","engineering.vertical-slice · advanced"],"skills":["builtin-skill:general-app-development-expert:skills/general-app-implementation/","builtin-skill:general-app-development-expert:skills/general-app-diagnosis/","builtin-skill:general-app-development-expert:skills/general-app-vertical-slice/","builtin-skill:general-app-development-expert:skills/general-app-builder/"],"cmds":[["追踪这项通用应用变更，实现最小完整修复并完成验证","追踪这项通用应用变更，实现最小完整修复并完成验证"],["根据产品、领域和架构基线实现下一条可验证纵向切片","根据产品、领域和架构基线实现下一条可验证纵向切片"]],"source":"builtin"},
  {"id":"general-app-qa-expert","k":"general-app-qa-expert","name":"测试与代码审查","role":"测试与代码审查","by":"Lingee 内置","desc":"面向通用应用制定并独立执行风险驱动的验证与契约驱动的代码审查，复现缺陷并维护质量基线","tags":["质量保障","独立验证","代码审查","性能验证"],"modes":["分析","设计","评审","验证","测试编写","性能测试","代码审查"],"comp":["quality.verification · principal","implementation-correctness · principal","quality.regression-analysis · advanced","quality.test-construction · advanced","quality.defect-reproduction · advanced","quality.performance-capacity · advanced","contract-design · advanced","concurrent-commit-model · advanced"],"skills":["builtin-skill:general-app-qa-expert:skills/quality-verification/","builtin-skill:general-app-qa-expert:skills/test-planning/","builtin-skill:general-app-qa-expert:skills/defect-reproduction/","builtin-skill:general-app-qa-expert:skills/performance-capacity/","builtin-skill:general-app-qa-expert:skills/security-verification/","builtin-skill:general-app-qa-expert:skills/contract-driven-code-review/"],"cmds":[["为这个通用应用制定并执行风险驱动的验证计划","为这个通用应用制定并执行风险驱动的验证计划"],["对照契约审查这次实现，输出可执行的评审问题","对照契约审查这次实现，输出可执行的评审问题"],["复现这个缺陷并输出基于证据的验证报告","复现这个缺陷并输出基于证据的验证报告"],["生成并执行已授权的性能验证矩阵","生成并执行已授权的性能验证矩阵"]],"source":"builtin"},
  {"id":"agent-development-expert","k":"agent-development-expert","name":"智能体开发","role":"智能体开发","by":"Lingee 内置","desc":"在 Lingee 项目中开发智能体、技能和业务组件：配置智能体并绑定技能与知识，创建和校验金蝶业务技能，构建可嵌入对话的交互组件","tags":["智能体开发","技能开发","业务组件开发","MCP 工具","交互组件"],"modes":["分析","设计","实现","集成","验证"],"comp":["engineering.implementation · principal","engineering.integration · advanced","engineering.diagnosis · advanced"],"skills":["builtin-skill:agent-development-expert:ai-partner-creator","builtin-skill:agent-development-expert:kingdee-skill-creator","builtin-skill:agent-development-expert:mcp-apps-builder"],"cmds":[["创建一个应收账款催收智能体，绑定项目里的催收相关技能","创建一个应收账款催收智能体，绑定项目里的催收相关技能"],["创建一个查询供应商付款情况的金蝶业务技能","创建一个查询供应商付款情况的金蝶业务技能"],["做一个展示销售订单执行进度的业务组件卡片","做一个展示销售订单执行进度的业务组件卡片"]],"source":"builtin"},
  {"id":"cosmic-api-engineer","k":"cosmic-api-engineer","name":"苍穹 API 开发","role":"苍穹 API 开发","by":"Lingee 内置","desc":"负责苍穹零代码 API、Custom API 与 API 扩展插件的设计和交付","tags":["API","OpenAPI"],"modes":["分析","设计","实现","集成","评审","验证","恢复"],"comp":["api.zero-code · principal","api.custom · advanced","api.extension · advanced","api.verification · advanced"],"skills":["builtin-skill:cosmic-api-engineer:app-build-api.md"],"cmds":[["设计并交付苍穹 API","设计并交付苍穹 API"]],"source":"builtin"},
  {"id":"cosmic-architect","k":"cosmic-architect","name":"苍穹架构师","role":"苍穹架构师","by":"Lingee 内置","desc":"在已验证的平台边界内设计苍穹元数据模型与运行时扩展","tags":["软件架构","可靠性"],"modes":["分析","设计","集成","评审","恢复"],"comp":["architecture.system-design · principal","architecture.reliability · advanced"],"skills":["builtin-skill:cosmic-architect:skills/architecture-design/"],"cmds":[["评审架构并闭合主要风险","评审架构并闭合主要风险"]],"source":"builtin"},
  {"id":"cosmic-code-reviewer","k":"cosmic-code-reviewer","name":"苍穹代码审查","role":"苍穹代码审查","by":"Lingee 内置","desc":"独立审查苍穹元数据、实现正确性、回归风险和交付契约","tags":["代码审查","交付契约"],"modes":["评审","验证"],"comp":["implementation-correctness · principal","filesystem-safety · advanced","concurrent-commit-model · principal","contract-design · advanced"],"skills":["builtin-skill:cosmic-code-reviewer:skills/contract-driven-code-review/"],"cmds":[],"source":"builtin"},
  {"id":"cosmic-metadata-expert","k":"cosmic-metadata-expert","name":"苍穹元数据","role":"苍穹元数据","by":"Lingee 内置","desc":"依据 app-build 契约完成苍穹应用元数据建模、修改和验证","tags":["元数据","低代码"],"modes":["分析","设计","实现","集成","评审","验证","恢复"],"comp":["metadata.modeling · principal","metadata.modification · principal","metadata.ui · advanced","metadata.api · advanced","metadata.verification · advanced"],"skills":["builtin-skill:cosmic-metadata-expert:skills/cosmic-metadata-delivery/","builtin-skill:cosmic-metadata-expert:builtin:app-build"],"cmds":[["使用已验证元数据建模或修改苍穹表单","使用已验证元数据建模或修改苍穹表单"]],"source":"builtin"},
  {"id":"cosmic-product-manager","k":"cosmic-product-manager","name":"苍穹产品经理","role":"苍穹产品经理","by":"Lingee 内置","desc":"将苍穹应用目标转化为理解元数据边界且可验证的需求","tags":["需求分析","验收设计"],"modes":["分析","设计","评审"],"comp":["product.requirements · principal","product.acceptance-design · advanced"],"skills":["builtin-skill:cosmic-product-manager:skills/requirements-closure/"],"cmds":[["将这个目标整理为有范围的验收条件","将这个目标整理为有范围的验收条件"]],"source":"builtin"},
  {"id":"cosmic-qa-engineer","k":"cosmic-qa-engineer","name":"苍穹质量工程师","role":"苍穹质量工程师","by":"Lingee 内置","desc":"独立验证苍穹元数据、运行时行为、回归影响与交付风险","tags":["质量保障","独立验证"],"modes":["分析","设计","评审","验证"],"comp":["quality.verification · principal","quality.regression-analysis · advanced"],"skills":["builtin-skill:cosmic-qa-engineer:skills/quality-verification/"],"cmds":[["制定并执行风险驱动的验证计划","制定并执行风险驱动的验证计划"]],"source":"builtin"},
  {"id":"cosmic-software-engineer","k":"cosmic-software-engineer","name":"苍穹软件工程师","role":"苍穹软件工程师","by":"Lingee 内置","desc":"在苍穹平台边界内实现经过验证的元数据与运行时变更","tags":["软件实现","系统集成"],"modes":["分析","设计","实现","集成","验证","恢复"],"comp":["engineering.implementation · advanced","engineering.integration · advanced","plugin.implementation · advanced","plugin.codegen · advanced"],"skills":["builtin-skill:cosmic-software-engineer:skills/software-implementation/"],"cmds":[["实现这项有边界的变更并端到端验证","实现这项有边界的变更并端到端验证"]],"source":"builtin"},
  {"id":"cosmic-team-lead","k":"cosmic-team-lead","name":"苍穹团队负责人","role":"苍穹团队负责人","by":"Lingee 内置","desc":"编排苍穹交付从元数据建模到 API 发布的智能体分工","tags":["交付管理","开发任务编排"],"modes":["分析","设计","规划","集成","评审","恢复"],"comp":["delivery.orchestration · principal","delivery.task-orchestration · principal","metadata.modeling · awareness","api.zero-code · awareness"],"skills":["builtin-skill:cosmic-team-lead:skills/cosmic-development-task-orchestration/","builtin-skill:cosmic-team-lead:skills/cosmic-delivery-coordination/"],"cmds":[["按智能体分工编排苍穹实施任务","按智能体分工编排苍穹实施任务"]],"source":"builtin"},
  {"id":"cosmic-ui-designer","k":"cosmic-ui-designer","name":"苍穹 UI 设计师","role":"苍穹 UI 设计师","by":"Lingee 内置","desc":"基于需求为苍穹应用表单和页面创建视觉原型","tags":["原型设计","界面设计"],"modes":["分析","设计","评审"],"comp":["ui.prototype · advanced"],"skills":["builtin-skill:cosmic-ui-designer:skills/ui-prototype/"],"cmds":[["为这个苍穹表单创建视觉原型","为这个苍穹表单创建视觉原型"]],"source":"builtin"},
  {"id":"kwc-frontend-engineer","k":"kwc-frontend-engineer","name":"KWC 前端工程师","role":"KWC 前端工程师","by":"Lingee 内置","desc":"开发苍穹应用 KWC 自定义页面、组件、页面元数据和 KingScript 脚本控制器","tags":["KWC","前端"],"modes":["分析","设计","实现","集成","验证","恢复"],"comp":["kwc.project-init · advanced","kwc.component-dev · advanced","kwc.page-dev · advanced","kwc.controller-dev · advanced","kwc.deploy · advanced"],"skills":["builtin-skill:kwc-frontend-engineer:kd-frontend-development.md"],"cmds":[["为这个苍穹应用开发一个 KWC 自定义页面","为这个苍穹应用开发一个 KWC 自定义页面"]],"source":"builtin"},
  {"id":"code-reviewer","k":"code-reviewer","name":"代码审查","role":"代码审查","by":"Lingee 内置","desc":"独立审查实现正确性、回归风险和交付契约","tags":["代码审查","正确性"],"modes":["评审","验证"],"comp":["implementation-correctness · principal","filesystem-safety · advanced","concurrent-commit-model · principal","contract-design · advanced"],"skills":["builtin-skill:code-reviewer:skills/contract-driven-code-review/"],"cmds":[],"source":"builtin"},
  {"id":"read-only-analyst","k":"read-only-analyst","name":"只读分析","role":"只读分析","by":"Lingee 内置","desc":"在不修改工作区的前提下分析软件与代码。","tags":["源码分析","只读评审"],"modes":["分析","评审","验证"],"comp":["software.analysis · advanced"],"skills":["builtin-skill:read-only-analyst:skills/repository-analysis/"],"cmds":[],"source":"builtin"},
  {"id":"security-reviewer","k":"security-reviewer","name":"安全评审","role":"安全评审","by":"Lingee 内置","desc":"独立评审应用安全风险。","tags":["安全评审","风险识别"],"modes":["评审","验证"],"comp":["application-security · principal","filesystem-safety · advanced","concurrent-commit-model · advanced"],"skills":["builtin-skill:security-reviewer:skills/adversarial-security-review/"],"cmds":[],"source":"builtin"},
  {"id":"software-architect","k":"software-architect","name":"软件架构师","role":"软件架构师","by":"Lingee 内置","desc":"设计可演进的系统边界、合同、数据流与失败处理","tags":["软件架构","可靠性"],"modes":["分析","设计","集成","评审","恢复"],"comp":["architecture.system-design · principal","architecture.reliability · advanced"],"skills":["builtin-skill:software-architect:skills/architecture-design/"],"cmds":[["评审架构并闭合主要风险","评审架构并闭合主要风险"]],"source":"builtin"},
  {"id":"software-engineer","k":"software-engineer","name":"软件工程师","role":"软件工程师","by":"Lingee 内置","desc":"实现可维护的软件变更并完成针对性验证","tags":["软件实现","系统集成"],"modes":["分析","设计","实现","集成","验证","恢复"],"comp":["engineering.implementation · advanced","engineering.integration · advanced"],"skills":["builtin-skill:software-engineer:skills/software-implementation/"],"cmds":[["实现这项有边界的变更并端到端验证","实现这项有边界的变更并端到端验证"]],"source":"builtin"},
  {"id":"software-product-manager","k":"software-product-manager","name":"软件产品经理","role":"软件产品经理","by":"Lingee 内置","desc":"将用户目标转化为有优先级且可观察的软件需求","tags":["需求分析","验收设计"],"modes":["分析","设计","评审"],"comp":["product.requirements · principal","product.acceptance-design · advanced"],"skills":["builtin-skill:software-product-manager:skills/requirements-closure/"],"cmds":[["将这个目标整理为有范围的验收条件","将这个目标整理为有范围的验收条件"]],"source":"builtin"},
  {"id":"software-qa-engineer","k":"software-qa-engineer","name":"软件测试工程师","role":"软件测试工程师","by":"Lingee 内置","desc":"独立验证验收行为、回归影响与交付风险","tags":["质量保障","独立验证"],"modes":["分析","设计","评审","验证"],"comp":["quality.verification · principal","quality.regression-analysis · advanced"],"skills":["builtin-skill:software-qa-engineer:skills/quality-verification/"],"cmds":[["制定并执行风险驱动的验证计划","制定并执行风险驱动的验证计划"]],"source":"builtin"},
  {"id":"software-team-lead","k":"software-team-lead","name":"软件团队负责人","role":"软件团队负责人","by":"Lingee 内置","desc":"协调范围、分工、集成、风险与交付闭环","tags":["交付管理","团队协调"],"modes":["分析","设计","规划","集成","评审","验证","恢复"],"comp":["delivery.task-orchestration · principal","delivery.orchestration · principal","delivery.integration · advanced"],"skills":["builtin-skill:software-team-lead:skills/delivery-coordination/","builtin-skill:software-team-lead:skills/development-task-orchestration/"],"cmds":[["协调这项工作从范围确认到验证闭环","协调这项工作从范围确认到验证闭环"]],"source":"builtin"},
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
  "builtin-skill:cosmic-code-reviewer:skills/contract-driven-code-review/": {
    "name": "Contract-driven code review",
    "desc": "Lingee Build 智能体定义中配置的技能。",
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
  "builtin-skill:cosmic-software-engineer:skills/software-implementation/": {
    "name": "软件实现",
    "desc": "Implement scoped software changes using repository conventions and behavior-focused verification.",
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
  "builtin-skill:agent-development-expert:ai-partner-creator": {
    "name": "智能体开发",
    "desc": "创建、编辑和管理智能体（assistant.json），为智能体配置角色、绑定项目技能与企业知识目录，并在交付前完成配置校验。",
    "tone": "blue"
  },
  "builtin-skill:agent-development-expert:kingdee-skill-creator": {
    "name": "技能开发",
    "desc": "创建、编辑、微调和校验技能，支持金蝶 ERP 业务技能（MCP）与通用技能，并可查询当前可用的 MCP 工具。",
    "tone": "blue"
  },
  "builtin-skill:agent-development-expert:mcp-apps-builder": {
    "name": "业务组件开发",
    "desc": "创建、编辑、导入和打包 MCP Apps 业务组件（看板、报表、表单、确认卡片等对话内交互卡片），并修复组件关联的 MCP 工具。",
    "tone": "blue"
  },
  "builtin-skill:general-app-development-expert:skills/general-app-implementation/": {
    "name": "通用应用实现",
    "desc": "Implement and verify scoped general-application changes across the complete affected call chain.",
    "tone": "blue"
  },
  "builtin-skill:general-app-development-expert:skills/general-app-diagnosis/": {
    "name": "通用应用诊断",
    "desc": "Diagnose general-application defects by reproducing current behavior, tracing the call chain, and proving the root cause before repair.",
    "tone": "blue"
  },
  "builtin-skill:general-app-development-expert:skills/general-app-vertical-slice/": {
    "name": "通用应用纵向切片",
    "desc": "Deliver a real end-to-end vertical slice for a general application and validate its business, technical, and runtime boundaries.",
    "tone": "blue"
  },
  "builtin-skill:general-app-development-expert:skills/general-app-builder/": {
    "name": "通用应用 Builder",
    "desc": "Implement a general-application module from the confirmed requirements and system design, using the global UI baseline and selected implementation recipes.",
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
  "builtin-skill:general-app-qa-expert:skills/test-planning/": {
    "name": "测试计划",
    "desc": "Convert application acceptance, invariants, risk labels, and change impact into an executable verification plan and test matrix.",
    "tone": "blue"
  },
  "builtin-skill:general-app-qa-expert:skills/defect-reproduction/": {
    "name": "缺陷复现",
    "desc": "Reproduce general-application defects with a minimal replayable case, classify the broken contract, and define repair acceptance evidence.",
    "tone": "blue"
  },
  "builtin-skill:general-app-qa-expert:skills/performance-capacity/": {
    "name": "性能与容量验证",
    "desc": "Generate and execute authorized k6-based performance verification for general applications, including load scenarios, resource conditions, and comparison evidence.",
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
  }
};
export function builtinAvatar(id){return avatars[id]||null;}
