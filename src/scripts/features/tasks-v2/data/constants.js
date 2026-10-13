import { CV_PROJECTS } from '../../collab/data.js';
/* 任务数据：常量（拆自 tasks-v2/data.js） */

/* ---------- 常量定义 ---------- */
const TK_STATUSES = [
  { id: 'planned',     name: '待规划', color: 'gray',   icon: 'dotted' },
  { id: 'backlog',     name: '待开始', color: 'gray',   icon: 'circle' },
  { id: 'in_progress', name: '执行中', color: 'orange', icon: 'half' },
  { id: 'in_review',  name: '待评审', color: 'green',  icon: 'three_quarters' },
  { id: 'blocked',   name: '已阻塞', color: 'red',    icon: 'slash' },
  { id: 'done',       name: '已完成', color: 'blue',   icon: 'check' },
  { id: 'cancelled',  name: '已取消', color: 'gray',   icon: 'cross' },
];

const TK_PRIORITIES = [
  { id: 'urgent', name: '紧急', color: 'red'    },
  { id: 'high',   name: '高',   color: 'orange' },
  { id: 'medium', name: '中',   color: 'blue'   },
  { id: 'low',    name: '低',   color: 'gray'   },
];

/* 演示任务只使用项目中已有的七位人员；姓名和身份始终来自项目人员主数据。 */
const TK_DEMO_PERSON_IDS = ['p22', 'p01', 'p02', 'p03', 'p04', 'p05', 'p07', 'p42'];
const TK_PERSON_COLORS = ['#495dff', '#08a040', '#e04a3a', '#7858f9', '#c06010', '#0891b2', '#d76794'];
const TK_PEOPLE = [];

const TK_AGENTS = [
  { id: 'a1', name: '代码审查', avatar: 'C', color: '#495dff' },
  { id: 'a2', name: '需求分析智能体', avatar: 'R', color: '#08a040' },
  { id: 'a3', name: '测试验证智能体', avatar: 'T', color: '#ff8d42' },
];

const TK_PROJECTS = CV_PROJECTS;

const TK_LABELS = ['需求', '缺陷'];

/* ---------- 视图配置 ---------- */
const TK_VIEWS = [
  { id: 'all',        name: '全部',    scope: 'all',       builtin: true },
  { id: 'members',    name: '我负责',  scope: 'my_assigned', builtin: true },
  { id: 'agents',     name: '执行中',  scope: 'in_progress', builtin: true },
];

/* ---------- 筛选字段定义 ---------- */
const TK_FILTER_FIELDS = [
  { id: 'status',    name: '状态',   type: 'select', options: TK_STATUSES.filter(s => s.id !== 'cancelled').map(s => ({ value: s.id, label: s.name })) },
  { id: 'issueType', name: '任务类型', type: 'select', options: [{ value: '需求', label: '需求' }, { value: '缺陷', label: '缺陷' }] },
  { id: 'priority',  name: '优先级', type: 'select', options: TK_PRIORITIES.map(p => ({ value: p.id, label: p.name })) },
  { id: 'assignee',  name: '处理人', type: 'select', options: TK_PEOPLE.map(p => ({ value: p.id, label: p.name })) },
  { id: 'project',   name: '项目',   type: 'select', options: TK_PROJECTS.map(p => ({ value: p.id, label: p.name })) },
  { id: 'keyword',   name: '关键词',   type: 'text' },
];

const TK_OPERATORS = {
  select: [
    { value: 'eq', label: '等于' },
    { value: 'neq', label: '不等于' },
  ],
  date: [
    { value: 'before', label: '早于' },
    { value: 'after', label: '晚于' },
    { value: 'today', label: '今天' },
    { value: 'overdue', label: '已逾期' },
  ],
  text: [
    { value: 'contains', label: '包含' },
    { value: 'not_contains', label: '不包含' },
  ],
};

export { TK_AGENTS, TK_DEMO_PERSON_IDS, TK_FILTER_FIELDS, TK_LABELS, TK_OPERATORS, TK_PEOPLE, TK_PERSON_COLORS, TK_PRIORITIES, TK_PROJECTS, TK_STATUSES, TK_VIEWS };
