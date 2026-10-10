/* 已完成任务的本地演示运行记录；内容不代表真实执行。 */
import { taskExecutorTeam } from '../expert/task-team.js';
import { EXPERTS } from '../expert/data.js';
import { tkProjectById } from './data.js';

const COMPLETED_RUNS = {
  6: { agent:'cosmic-workflow', duration:'4分12秒', result:'黑白名单录入、批量导入及下单拦截规则已交付并通过验收。', steps:[['配置名单维护流程','完成单条录入、Excel 导入预览与审批留痕。'],['验证采购规则','黑名单下单拦截与白名单绿色通道均通过场景检查。'],['提交验收结果','记录导入校验与名单变更用例，交付上线样例。']] },
  12: { agent:'cosmic-report', duration:'3分46秒', result:'月报定时生成、PDF 导出与归档推送流程已完成。', steps:[['配置月度取数','按报表期间汇总凭证与应收应付账龄数据。'],['生成财务月报','输出资产负债表、利润表和费用明细样例。'],['核对归档与推送','验证手动补生成、PDF 归档和邮件组推送记录。']] },
  20: { agent:'cosmic-workflow', duration:'4分03秒', result:'入库与退货凭证规则已配置，借贷平衡校验通过。', steps:[['建立科目映射','按物料类别映射原材料与应付账款科目。'],['验证凭证生成','覆盖正常入库与退货红字冲销两条路径。'],['执行月结校验','借贷平衡及异常凭证提醒场景通过检查。']] },
  28: { agent:'cosmic-api', duration:'3分28秒', result:'采购与财务对账流程已交付，差异明细与批量处理可用。', steps:[['连接采购与付款记录','按订单号和金额形成对账候选集。'],['验证差异规则','完全匹配、小额差异和异常三档结果正确。'],['核对导出与处理','差异明细 Excel 与确认、退回、挂账操作通过验收。']] },
  37: { agent:'cosmic-api', duration:'4分31秒', result:'质量追溯链路已完成，支持成品序列号正反向查询。', steps:[['关联全链路批次','串联原料入库、生产工序、检验和发货记录。'],['验证追溯查询','按成品序列号回查生产履历与原料来源。'],['交付证明样例','核对 PDF 质量证明书及三条核心产线试运行数据。']] },
  42: { agent:'cosmic-report', duration:'2分55秒', result:'工单批量导出已上线，筛选、字段配置与上限校验通过。', steps:[['配置导出字段','覆盖工单号、状态、处理人、时间与满意度。'],['验证筛选及容量','按时间、渠道和状态筛选，校验 5 万条上限。'],['核对交付记录','Excel 文件生成与导出操作记录通过验收。']] },
  47: { agent:'cosmic-workflow', duration:'3分17秒', result:'日考勤自动汇总与月报导出流程已完成并上线。', steps:[['配置凌晨抽取','按排班规则汇总打卡、迟到、早退和加班。'],['验证异常提醒','缺班及连续迟到场景可推送部门主管。'],['生成考勤报表','核对日汇总与次月 3 日月报导出样例。']] },
  52: { agent:'frontend-engineer', duration:'3分54秒', result:'仓储运营大屏已部署，实时流水和库存预警展示通过验收。', steps:[['完成四区大屏布局','展示今日出入库、库存水位、实时流水和待处理预警。'],['校验数据刷新','15 秒自动刷新与手动暂停交互正常。'],['核对现场展示','1920×1080 大屏与仓库入口展示样例通过检查。']] },
  55: { agent:'software-qa-engineer', duration:'2分08秒', result:'侧边栏用户名在不同窗口宽度下均可正确显示。', steps:[['复现截断问题','覆盖窄屏、折叠侧边栏和长用户名。'],['验证样式修复','文本溢出与头像布局不再错位。'],['执行回归','常见分辨率下导航与用户名显示通过检查。']] },
  60: { agent:'cosmic-api', duration:'3分06秒', result:'项目数据持久化与恢复机制已交付。', steps:[['检查本地存储结构','确认项目字段与版本兼容规则。'],['检查保存及恢复','刷新页面后项目设置和列表状态正确恢复。'],['验证异常场景','空数据与损坏缓存均有回退处理。']] },
  65: { agent:'frontend-engineer', duration:'1分59秒', result:'任务来源标签样式已统一，列表和详情显示一致。', steps:[['盘点来源标签','覆盖 Jira、TAPD、飞书、API 和对话自建。'],['应用统一视觉','统一颜色、间距与截断规则。'],['核对页面展示','任务列表和详情面板均通过视觉检查。']] },
  68: { agent:'software-qa-engineer', duration:'2分41秒', result:'项目列表翻页不再重复展示数据，分页回归通过。', steps:[['构造跨页项目样本','覆盖首页、末页和筛选后分页。'],['验证去重逻辑','翻页后项目 ID 无重复，顺序保持稳定。'],['完成回归','切换筛选和返回上一页的场景通过。']] },
  72: { agent:'software-engineer', duration:'2分23秒', result:'模块自检脚本已交付，能够检查模块导入导出关系。', steps:[['扫描源码模块','收集入口和特性模块的导入导出声明。'],['运行自检命令','npm run check 成功输出检查结果。'],['验证错误反馈','缺失导出与只读绑定赋值均能定位报错。']] },
  1300: { agent:'general-app-product-expert', duration:'3分18秒', result:'问卷调研需求与验收标准已确认，覆盖设计、发放、回收、分析四个环节。', steps:[['访谈记录整理','从 5 场业务访谈中提炼 23 条需求，合并重复项后保留 17 条。'],['划定范围与非目标','首期不做付费问卷和外部样本采购。'],['补齐验收标准','每条需求附可观察的验收条件，评审一次通过。']] },
  1301: { agent:'general-app-architecture-expert', duration:'4分05秒', result:'技术方案评审通过：问卷结构用 JSON Schema，答卷按问卷分区存储，分析异步计算。', steps:[['梳理模块边界','拆为问卷设计、发放、回收、分析、权限五个模块。'],['设计数据模型','问卷、题目、答卷、发放批次四张主表及索引。'],['评审风险','识别企业微信权限与大样本分析耗时两项风险并给出预案。']] },
  1500: { agent:'general-app-product-expert', duration:'2分56秒', result:'设备巡检需求与验收标准已确认，覆盖巡检、报修、维修记录三个环节。', steps:[['整理设备部访谈','从 3 场访谈中提炼 15 条需求。'],['划定首期范围','覆盖注塑、空压、数控三类 126 台设备。'],['补齐验收标准','每条需求附可观察的验收条件，评审一次通过。']] },
  1501: { agent:'general-app-architecture-expert', duration:'3分40秒', result:'技术方案评审通过：五个核心对象，设备二维码作为统一入口，维修记录开放查询接口。', steps:[['梳理核心对象','设备、巡检计划、巡检记录、报修单、维修记录。'],['设计扫码入口','每台设备一码，扫码按角色打开巡检或报修。'],['预留智能体接口','维修记录提供只读查询接口，供技能调用。']] },
  1502: { agent:'general-app-development-expert', duration:'4分18秒', result:'设备台账与扫码巡检已交付，126 台设备二维码生成完毕。', steps:[['建立设备台账','导入 126 台设备的型号、位置和责任人。'],['实现扫码巡检','按设备类型加载巡检项，异常项拍照留证。'],['验证转报修','巡检异常一键转报修，测试环境验证通过。']] },
  1308: { agent:'general-app-team-lead', duration:'2分52秒', result:'2026 员工满意度调研问卷已发布，共 32 题，回收 1,286 份，自动生成分析报告。', steps:[['套用问卷模板','基于「员工满意度」模板调整 6 道题。'],['发放与回收','企业微信推送 1,500 人，7 天回收率 85.7%。'],['生成分析报告','输出满意度分布、部门对比和 5 条改进建议。']] },
};

export function createDemoCompletedRun(task) {
  if (task.status !== 'done') return null;
  var content = COMPLETED_RUNS[task.id];
  if (!content) return null;
  var project = tkProjectById(task.project);
  var team = taskExecutorTeam(task, project);
  var expertId = team?.members.includes(content.agent) ? content.agent : team?.leadId;
  var expert = EXPERTS.find(function (row) { return row.id === expertId; });
  return {
    agentName:expert?.name || team?.name || '任务智能体',
    teamName:team?.name || '智能体团队',
    completedAt:task.createDate + ' 16:40',
    duration:content.duration,
    result:content.result,
    steps:content.steps,
  };
}
