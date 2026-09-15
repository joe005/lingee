/* 智能体开发页卡片数据，同 apps.js 的做法。 */
const AGENT_ICON_PATHS = ['M12 8V4M9 14h.01M15 14h.01'];
const AGENT_ICON_RECTS = [{ x: 4, y: 8, width: 16, height: 12, rx: 2 }];

export const AGENTS_DATA = [
  {
    id: 'agent-customer-service',
    title: '客服助手',
    desc: '自动响应用户咨询，识别意图并转接人工，支持多轮对话',
    tags: ['客服', '对话'],
    icon: { color: '#3a7bff', bg: '#eef3ff', paths: AGENT_ICON_PATHS, rects: AGENT_ICON_RECTS },
  },
  {
    id: 'agent-data-analyst',
    title: '数据分析师',
    desc: '连接数据源，自然语言查询生成报表和可视化图表',
    tags: ['数据', '分析'],
    icon: { color: '#8b5cf6', bg: '#f3eefe', paths: AGENT_ICON_PATHS, rects: AGENT_ICON_RECTS },
  },
  {
    id: 'agent-task-scheduler',
    title: '任务调度员',
    desc: '根据预设规则自动分配任务、跟踪进度、发送提醒',
    tags: ['管理', '自动化'],
    icon: { color: '#08cc50', bg: '#e8faef', paths: AGENT_ICON_PATHS, rects: AGENT_ICON_RECTS },
  },
];
