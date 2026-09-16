/* 从 main.js 提取的静态数据 */

export const EXPERT_AV = {
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
export const GATE_ICON = '<svg class="x-gate-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/></svg>';
export const AV_KEYS = ['lead','pm','arch','eng','qa','cr','sec','ana','fe','ux','form','flow','rpt','plug','api'];
export const WORK_MODES = ['分析','设计','实现','集成','评审','验证','恢复'];
export const COMP_NAMES = {
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
export const COMP_LEVELS = {principal:'资深',advanced:'精通',practitioner:'熟练',awareness:'了解'};
export const COMP_RANK = {principal:4,advanced:3,practitioner:2,awareness:1};
export const ASK = {
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
export const ASK_FALLBACK = {q:'这一项从哪来？', o:['我直接说','用上一步的产出','先跳过，你按默认处理']};
export const MODE_MATCH = {
    '苍穹应用':{kind:'team',id:'cosmic-team'},
    '原型探索':{kind:'expert',id:'ux-designer'},
    '通用应用':{kind:'team',id:'fast-app'},
    '业务组件':{kind:'expert',id:'software-engineer'},
    '技能开发':{kind:'expert',id:'software-engineer'},
    '智能体开发':{kind:'expert',id:'software-engineer'}
  };
export const KW_MATCH = [
    {id:'cosmic-workflow', kw:['工作流','审批','流转','加签','会签','流程节点']},
    {id:'cosmic-form',     kw:['表单','单据','字段','校验','联动']},
    {id:'cosmic-report',   kw:['报表','取数','图表','口径']},
    {id:'cosmic-plugin',   kw:['插件','扩展点','二开']},
    {id:'cosmic-api',      kw:['接口','对接','鉴权','同步','集成']},
    {id:'frontend-engineer',kw:['页面','前端','样式','组件','响应式','布局']},
    {id:'ux-designer',     kw:['设计','交互','原型','信息架构','视觉']},
    {id:'software-qa-engineer',kw:['测试','验证','回归','用例']},
    {id:'security-reviewer',kw:['安全','漏洞','越权','威胁']},
    {id:'code-reviewer',   kw:['评审','review','代码质量']},
    {id:'software-architect',kw:['架构','选型','边界','技术方案']},
    {id:'software-product-manager',kw:['需求','验收','范围','非目标']}
  ];
