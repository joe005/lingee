import { tkCurrentUserId, tkGetPerson, tkGetPriorityName, tkIsProjectOwner, tkUpdateTask } from './data.js';
/* 任务修改规则与修改记录（US-2026-104059）。
   字段按「锁定时机」控制，不针对单个状态另写规则：
   - 识别（标题）：不锁定，任何状态都能改
   - 内容（描述、优先级、附件）：任务结束（已完成、已取消）后锁定；进行中原有附件不能删
   - 执行（智能体团队、处理人、评审人、人工评审）：任务启动后锁定
   - 归属（任务类型、空间、工作区、仓库）：任务启动后锁定
   可编辑的人：任务创建人、所属空间或工作区管理员。每次保存有改动时在 task.editRecords 追加一条。 */

const OPEN_STATUSES = ['planned', 'backlog'];
const PHASE_ORDER = { unstarted: 0, running: 1, ended: 2 };
/* 各类字段在哪个阶段开始锁定；null 表示不锁定 */
const LOCK_AT = { title: null, content: 'ended', execution: 'running', ownership: 'running' };

export function tkTaskEditPhase(task) {
  if (!task) return 'ended';
  if (['done', 'cancelled'].includes(task.status)) return 'ended';
  const started = !OPEN_STATUSES.includes(task.status)
    || !OPEN_STATUSES.includes(task.initialStatus || task.status)
    || (task.statusHistory || []).some(change => !OPEN_STATUSES.includes(change.from) || !OPEN_STATUSES.includes(change.to));
  return started ? 'running' : 'unstarted';
}

/* 某类字段对已有任务是否还能改 */
export function tkTaskFieldEditable(task, group) {
  const lockAt = LOCK_AT[group];
  return lockAt === null || PHASE_ORDER[tkTaskEditPhase(task)] < PHASE_ORDER[lockAt];
}

export function tkCanEditTask(task) {
  const me = tkCurrentUserId();
  if (!task || !me) return false;
  return task.createdBy === me
    || tkIsProjectOwner(task.project, '')
    || (!!task.workspaceId && tkIsProjectOwner(task.project, task.workspaceId));
}

export function tkTaskEditBlockedReason(task) {
  return task ? '仅任务创建人和空间管理员可以修改任务' : '未找到任务';
}

const typeLabel = type => type === '缺陷' ? '缺陷修复' : '功能开发';
const repoLabel = task => (task.repositoryKeys?.length ? task.repositoryKeys : task.repositoryKey ? [task.repositoryKey] : []).map(key => String(key).split('/').pop()).join('、');
const stageName = stage => stage.workType || stage.title || '阶段';
const personLabel = id => (id ? tkGetPerson(id).name : '') || '未分配';

/* 对比保存前后的任务，返回 [{field,label,from,to}]；描述与附件单独标记，展示时特殊处理 */
export function tkTaskEditChanges(before, after) {
  const changes = [];
  const push = (field, label, from, to) => { if (String(from ?? '') !== String(to ?? '')) changes.push({ field, label, from: from ?? '', to: to ?? '' }); };
  push('title', '标题', before.title, after.title);
  push('desc', '任务描述', before.desc, after.desc);
  push('priority', '优先级', tkGetPriorityName(before.priority), tkGetPriorityName(after.priority));
  push('project', '所属空间', before.projectName, after.projectName);
  push('workspace', '所属工作区', before.workspaceName, after.workspaceName);
  push('repository', '代码仓库', repoLabel(before), repoLabel(after));
  push('issueType', '任务类型', typeLabel(before.issueType), typeLabel(after.issueType));
  const beforeIds = new Set((before.attachments || []).map(item => item.id));
  const afterIds = new Set((after.attachments || []).map(item => item.id));
  const added = (after.attachments || []).filter(item => !beforeIds.has(item.id)).map(item => item.name);
  const removed = (before.attachments || []).filter(item => !afterIds.has(item.id)).map(item => item.name);
  if (added.length || removed.length) changes.push({ field: 'attachments', label: '附件', added, removed });
  if ((before.teamId || before.expertId || '') !== (after.teamId || after.expertId || '')) {
    push('team', '智能体团队', before.teamName, after.teamName);
  }
  const beforePlan = before.executionPlan || [];
  const afterPlan = after.executionPlan;
  if (afterPlan && (before.teamId || before.expertId || '') === (after.teamId || after.expertId || '')) {
    afterPlan.forEach(stage => {
      const old = beforePlan.find(row => row.id === stage.id);
      if (!old) return;
      push('stage-owner:' + stage.id, '「' + stageName(stage) + '」处理人', personLabel(old.assigneeId), personLabel(stage.assigneeId));
      push('stage-review:' + stage.id, '「' + stageName(stage) + '」人工评审',
        old.requiresConfirmation === false ? '关闭' : '开启', stage.requiresConfirmation === false ? '关闭' : '开启');
    });
  }
  return changes;
}

function nowText() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

/* 写入修改记录；source 为 'ui' 或 'chat'（会话修改时带 sessionTitle） */
export function tkAppendTaskEditRecord(task, changes, source = 'ui', sessionTitle = '') {
  if (!task || !changes.length) return;
  const record = { id: crypto.randomUUID(), authorId: tkCurrentUserId(), createdAt: nowText(), source, sessionTitle, changes };
  tkUpdateTask(task.id, { editRecords: (task.editRecords || []).concat(record) });
}
