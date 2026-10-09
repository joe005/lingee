/* 工单管理系统（Manage 项目 ticket-mgmt）：CIO 演示场景的研发任务。
   项目由项目管理员赵琳立项，通用应用开发智能体团队按 4 个阶段交付，22 个任务中 18 个已完成（82%）、
   2 个待审核、1 个待开始、1 个已阻塞（派单算法卡在调度集群扩容审批，等 CIO 决策）。
   任务 id 1600–1621，编号 T1001600–T1001621；阶段 id 沿用通用应用开发的 s1–s4。 */

const PROJECT = 'ticket-mgmt';
const STAGES = [['s1', '需求分析', 'p24', 'general-app-product-expert'], ['s2', '系统设计', 'p25', 'general-app-architecture-expert'], ['s3', '开发实现', 'p26', 'general-app-development-expert'], ['s4', '测试验证', 'p27', 'general-app-qa-expert']];
const TEAM_NAME = '通用应用开发智能体团队';
const REVIEWER = 'p04';

/* [id, 标题, 描述, 状态, 里程碑序号, 创建日, 截止日, 审核通过日, 耗时] */
const ROWS = [
  [1600, '工单提交与表单设计', '客户和一线人员可提交工单：标题、描述、分类、优先级、附件；提交后生成编号并通知处理组。', 'done', 0, '2026-09-21', '2026-09-25', '2026-09-24', '3分12秒'],
  [1601, '工单分类与优先级规则', '维护一级 / 二级分类和四档优先级，规则变更立即生效并留痕。', 'done', 0, '2026-09-21', '2026-09-25', '2026-09-24', '2分41秒'],
  [1602, '工单状态流转引擎', '定义受理、处理中、待确认、已关闭四个状态及合法流转，非法流转直接拦截。', 'done', 0, '2026-09-22', '2026-09-25', '2026-09-25', '4分05秒'],
  [1603, '角色与权限矩阵', '一线、二线、主管、管理员四类角色，按分类和处理组控制可见与可操作范围。', 'done', 0, '2026-09-22', '2026-09-25', '2026-09-25', '2分58秒'],
  [1604, '处理组与排班管理', '按处理组维护成员与排班，支持节假日顺延与临时替班。', 'done', 0, '2026-09-23', '2026-09-26', '2026-09-26', '2分20秒'],
  [1605, '工单列表与高级筛选', '按状态、分类、处理人、时间范围筛选并保存常用视图，支持批量操作。', 'done', 1, '2026-09-24', '2026-09-30', '2026-09-29', '3分33秒'],
  [1606, '工单详情与处理记录', '展示工单全程处理记录、内部备注与附件，每次变更写入操作日志。', 'done', 1, '2026-09-24', '2026-09-30', '2026-09-29', '3分47秒'],
  [1607, '站内消息与邮件通知', '工单创建、流转、超时自动通知相关人，按角色配置通知渠道。', 'done', 1, '2026-09-25', '2026-09-30', '2026-09-30', '2分09秒'],
  [1608, '客户满意度评价', '工单关闭后推送评价，低分自动生成回访任务。', 'done', 1, '2026-09-25', '2026-09-30', '2026-09-30', '2分52秒'],
  [1609, '知识库关联与推荐', '工单详情按关键词推荐相似历史工单和知识条目，处理人一键引用。', 'done', 1, '2026-09-28', '2026-10-02', '2026-10-01', '3分18秒'],
  [1610, '工单自动派单算法', '按分类、处理组负载和技能标签自动派单；规则引擎依赖调度集群，扩容后才能压测并上线。', 'blocked', 1, '2026-10-01', '2026-10-09', '', ''],
  [1611, 'SLA 时效配置', '四档优先级分别配置响应和解决时限，工作时间日历可调。', 'done', 1, '2026-09-28', '2026-10-02', '2026-10-01', '2分36秒'],
  [1612, 'SLA 倒计时与超时预警', '工单卡片实时倒计时，临近超时提醒处理人，超时自动升级给主管。', 'done', 1, '2026-10-02', '2026-10-09', '2026-10-08', '3分02秒'],
  [1613, '工单统计报表', '按分类、处理组、处理人统计量、时效达成率和满意度，支持导出。', 'done', 2, '2026-09-29', '2026-10-05', '2026-10-04', '3分40秒'],
  [1614, '管理驾驶舱看板', '主管视角的实时看板：积压、超时、满意度趋势。', 'in_review', 2, '2026-10-02', '2026-10-09', '', '3分05秒'],
  [1615, '历史工单数据迁移', '从旧系统导入近两年 8.6 万条历史工单，字段映射并校验。', 'done', 2, '2026-09-30', '2026-10-06', '2026-10-06', '4分22秒'],
  [1616, '权限审计与操作日志', '关键操作全程留痕，支持按人员、对象、时间检索，满足审计要求。', 'done', 2, '2026-10-01', '2026-10-07', '2026-10-06', '2分58秒'],
  [1617, '企业微信集成', '工单消息推送到企业微信，支持在微信内受理和回复。', 'done', 2, '2026-10-01', '2026-10-07', '2026-10-07', '3分26秒'],
  [1618, '批量导入导出', '工单批量导出 Excel（上限 5 万条）和模板化批量导入。', 'done', 2, '2026-10-02', '2026-10-07', '2026-10-07', '2分44秒'],
  [1619, '移动端工单处理', '手机端受理、回复、转派和拍照上传。', 'in_review', 2, '2026-10-03', '2026-10-09', '', '3分51秒'],
  [1620, '性能压测与安全扫描', '并发 500 压测、接口鉴权与越权扫描，输出报告。', 'done', 2, '2026-10-06', '2026-10-08', '2026-10-08', '4分10秒'],
  [1621, '上线部署与数据割接', '生产环境部署、备份监控与割接演练，正式上线。', 'backlog', 2, '2026-10-08', '2026-10-16', '', ''],
];

const STATE_BY_STATUS = {
  done: ['done', 'done', 'done', 'done'],
  in_review: ['done', 'done', 'done', 'review'],
  in_progress: ['done', 'done', 'running', 'pending'],
  blocked: ['done', 'done', 'blocked', 'pending'],
  backlog: ['pending', 'pending', 'pending', 'pending'],
};
const CURRENT_STAGE = { done: 's4', in_review: 's4', in_progress: 's3', blocked: 's3', backlog: 's1' };

function plan(status, assignee) {
  const states = STATE_BY_STATUS[status];
  return STAGES.map(function (st, i) {
    return { id: st[0], workType: st[1], title: st[1], description: '', expertId: st[3], assigneeId: i === 3 || status === 'done' ? REVIEWER : st[2], status: states[i] };
  });
}

function buildTask(row) {
  const [id, title, desc, status, milestone, createDate, dueDate, doneDate, duration] = row;
  const history = [];
  if (status !== 'backlog') history.push({ from: 'backlog', to: 'in_progress', time: createDate + ' 09:30:00', authorId: 'p04' });
  if (status === 'done' || status === 'in_review') history.push({ from: 'in_progress', to: 'in_review', time: (doneDate || '2026-10-08') + ' 11:20:00', authorId: 'p27' });
  if (status === 'done') history.push({ from: 'in_review', to: 'done', time: doneDate + ' 16:00:00', authorId: REVIEWER });
  if (status === 'blocked') history.push({ from: 'in_progress', to: 'blocked', time: '2026-10-08 14:12:00', authorId: '' });
  const task = {
    id, code: 'T' + (1000000 + id), title, desc, status, priority: id === 1610 ? 'high' : 'medium',
    assignee: status === 'done' ? REVIEWER : (status === 'in_review' ? REVIEWER : status === 'backlog' ? 'p24' : 'p26'),
    createdBy: 'p04', project: PROJECT, labels: ['需求'], issueType: '需求', milestone,
    createDate, dueDate, createdAt: createDate + ' 09:30', updatedAt: (doneDate || '2026-10-08') + ' 16:00',
    executionStageId: CURRENT_STAGE[status], statusHistory: history, executionPlan: plan(status),
  };
  /* 代码与审核统计（演示数据）：合入代码行数与其中 AI 生成的行数、提交次数与其中智能体发起的次数、阶段审核被退回次数 */
  if (status === 'done' || status === 'in_review') {
    const lines = 600 + (id % 7) * 180;
    const commits = 6 + (id % 4) * 2;
    task.codeStats = { lines, aiLines: Math.round(lines * (0.72 + (id % 5) * 0.03)), commits, aiCommits: commits - (id % 3 === 0 ? 2 : 1), rejects: [1602, 1606, 1613].includes(id) ? 1 : 0 };
  }
  if (status === 'done') {
    task.completedRun = {
      agentName: '通用应用开发', teamName: TEAM_NAME, completedAt: doneDate + ' 11:20', duration,
      result: title + '已按验收标准交付，需求、方案、代码和测试结论均已归档。',
      steps: [['需求分析与方案', '梳理验收条件并输出设计方案。'], ['开发实现', '在独立分支完成开发并通过自检。'], ['测试验证', '自动化测试全部通过，审核人确认后合并。']],
    };
  }
  if (status === 'in_review') {
    task.reviewReport = {
      teamName: TEAM_NAME, runId: 'RUN-' + task.code, completedAt: '2026-10-08 17:40',
      summary: title + '已完成开发与自测，等待审核人确认。',
      evidence: ['自动化测试 100% 通过。', '界面走查与验收条件逐条核对完成。'],
      review: '请审核人确认验收条件后通过。',
      members: [{ id: 'general-app-development-expert', name: '通用应用开发', lead: true, result: '完成实现并提交结果。' }],
    };
  }
  if (status === 'blocked') {
    task.blockedRun = {
      agentName: '通用应用开发', teamName: TEAM_NAME, failedAt: '2026-10-08 14:12', duration: '2分18秒',
      reason: '规则引擎依赖的调度集群尚未完成扩容审批，无法压测，派单算法无法上线。',
      next: '等待 CIO 批准调度集群扩容；批准后任务自动恢复执行并重新压测。',
      steps: [['实现派单规则', '已按分类、负载和技能标签完成规则编排。'], ['接入调度集群', '已完成适配，等待扩容后联调。'], ['压测准备', '集群容量不足，压测任务被拒绝，停止执行。']],
    };
  }
  return task;
}

export const TK_TICKET_TASKS = ROWS.map(buildTask);
/* 已缓存任务的浏览器没有 codeStats，按编号回查演示统计 */
export const TK_TICKET_CODE_STATS = Object.fromEntries(TK_TICKET_TASKS.filter(function (t) { return t.codeStats; }).map(function (t) { return [t.code, t.codeStats]; }));
