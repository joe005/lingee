import { tkGetPerson, tkGetPriorityObj, tkGetProjectName, tkGetStatusObj } from './data.js';
import { taskListKind } from './list-kind.js';

/* 任务列表的共用行模板与列设置。任务页和项目详情挂载同一个列表实例，
   排序、折叠、选择、快捷新建及详情事件均由任务页的控制器处理。 */
export function renderTaskListTreeNodes(tasks, childrenMap, depth, context) {
  return tasks.map(function (task) {
    var children = childrenMap.get(task.id) || [];
    var hasChildren = children.length > 0;
    var isCollapsed = context.collapsedParents.has(task.id);
    var html = renderTaskListRow(task, { depth:depth, hasChildren:hasChildren, isCollapsed:isCollapsed, childCount:children.length }, context);
    if (hasChildren && !isCollapsed) html += renderTaskListTreeNodes(children, childrenMap, depth + 1, context);
    return html;
  }).join('');
}

function renderTaskListRow(t, opts, context) {
  var depth = opts.depth || 0;
  var hasChildren = !!opts.hasChildren;
  var isCollapsed = !!opts.isCollapsed;
  var childCount = opts.childCount || 0;
  var pri = tkGetPriorityObj(t.priority);
  var st = tkGetStatusObj(t.status);
  var person = tkGetPerson(t.assignee);
  var sel = context.selectedIds.has(t.id) ? ' selected' : '';
  var toggle = hasChildren ? '<button class="tk-row-toggle' + (isCollapsed ? ' is-collapsed' : '') + '" data-tk-toggle="' + t.id + '" aria-expanded="' + !isCollapsed + '" aria-label="' + (isCollapsed ? '展开子任务' : '折叠子任务') + '"><svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 7.5 5 5 5-5"/></svg></button>' : '';
  var spacer = !hasChildren ? '<span class="tk-row-spacer"></span>' : '';
  var childBadge = hasChildren ? '<span class="tk-row-child-count"' + (isCollapsed ? '' : ' style="visibility:hidden"') + '>' + childCount + '</span>' : '';
  if (!context.cardLayout) {
    var tableIndentStyle = depth > 0 ? ' style="padding-left:calc(10px + ' + depth + 'em)"' : '';
    return '<tr class="tk-row' + sel + (context.drawerTaskId === t.id ? ' detail-active' : '') + (depth ? ' tk-row--child' : '') + (hasChildren ? ' tk-row--parent' : '') + '" data-task-id="' + t.id + '" data-depth="' + depth + '">'
      + '<td class="tk-col-check"><input type="checkbox" class="tk-row-check" data-task-id="' + t.id + '"' + (context.selectedIds.has(t.id) ? ' checked' : '') + '></td>'
      + '<td class="tk-col-code"><span class="tk-row-code">' + context.escapeHtml(t.code) + '</span></td>'
      + '<td class="tk-col-title"' + tableIndentStyle + '><div class="tk-row-title-wrap">' + toggle + spacer + '<span class="tk-row-title-text">' + context.escapeHtml(t.title) + '</span>' + childBadge + '</div></td>'
      + '<td class="tk-col-status"><span class="tk-row-status">' + context.statusSvg(t.status) + context.escapeHtml(st.name) + '</span></td>'
      + '<td class="tk-col-type">' + (t.issueType ? '<span class="tk-row-type" data-type="' + context.escapeHtml(t.issueType) + '">' + context.escapeHtml(t.issueType) + '</span>' : '—') + '</td>'
      + '<td class="tk-col-priority"><span class="tk-row-priority">' + context.escapeHtml(pri.name) + '</span></td>'
      + '<td class="tk-col-assignee"><div class="tk-row-assignee">' + context.avatarSm(t.assignee) + '<span>' + context.escapeHtml(person.name) + '</span></div></td>'
      + '<td class="tk-col-project">' + context.escapeHtml(tkGetProjectName(t.project)) + '</td>'
      + '<td class="tk-col-created">' + context.fmtDate(t.createDate) + '</td>'
      + '<td class="tk-col-desc">' + (t.desc ? '<span class="tk-row-desc" title="' + context.escapeHtml(String(t.desc).replace(/\s+/g, ' ')) + '">' + context.escapeHtml(t.desc) + '</span>' : '—') + '</td>'
      + '<td class="tk-col-actions"><button class="tk-card-more" data-card-more="' + t.id + '" data-tooltip="更多操作" aria-label="更多操作"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button></td></tr>';
  }
  var progress = context.listStageProgress(t);
  var info = taskListKind(t);
  var e = context.escapeHtml;
  var steps = (progress.stages || []).map(function (stage, index) {
    var row = Array.isArray(t.executionPlan) ? t.executionPlan.find(function (item) { return item.id === stage.id; }) : null;
    var done = t.status === 'done' || row?.status === 'done' || index < progress.index;
    var stepState = done ? ' is-complete' : index === progress.index ? ' is-current' : ' is-pending';
    return '<span class="tk-list-stage-step' + stepState + '" title="' + e(stage.name) + '"><span>' + e(stage.name) + '</span><i aria-hidden="true"></i></span>';
  }).join('');
  var stageHtml = steps
    ? '<div class="tk-list-stage-progress" role="progressbar" aria-label="当前任务阶段：' + e(progress.name) + '" aria-valuemin="1" aria-valuemax="' + progress.total + '" aria-valuenow="' + (progress.index + 1) + '">'
      + '<div class="tk-list-stage-summary' + (t.status === 'done' ? ' is-done' : '') + '"><span>' + e(progress.name) + '</span><b>' + (progress.index + 1) + '/' + progress.total + '</b></div>'
      + '<div class="tk-list-stage-track">' + steps + '</div></div>'
    : '<span class="tk-list-stage-empty">—</span>';
  var descText = String(t.desc || '').replace(/\s+/g, ' ');
  var hintTitle = info.hint + (descText ? '：' + descText : '');
  var actionButton = '<button type="button" class="tk-list-action-btn' + (info.primary ? ' is-primary' : '') + '" data-list-task-action="' + info.action + '" data-list-task-id="' + t.id + '" aria-label="' + e(info.label + '：' + t.title) + '">' + e(info.label) + '</button>';
  var typeTag = t.issueType
    ? '<span class="tk-list-card-label tk-list-card-type" data-type="' + e(t.issueType) + '" title="任务类型：' + e(t.issueType) + '">' + e(t.issueType) + '</span>' : '';
  var priorityTag = pri.name
    ? '<span class="tk-list-card-label tk-list-priority" data-priority="' + e(t.priority) + '" title="优先级：' + e(pri.name) + '">' + e(pri.name) + '</span>' : '';
  return '<tr class="tk-row tk-list-card-row' + sel + (context.drawerTaskId === t.id ? ' detail-active' : '') + (depth ? ' tk-row--child' : '') + (hasChildren ? ' tk-row--parent' : '') + '" data-task-id="' + t.id + '" data-depth="' + depth + '" tabindex="0">'
    + '<td class="tk-list-card-cell" colspan="11"><div class="tk-list-card tk-list-card--' + info.kind + '">'
    + '<div class="tk-list-card-main"><div class="tk-list-card-meta"><span class="tk-list-status" data-kind="' + info.kind + '">' + e(info.badge) + '</span><span class="tk-list-card-code">' + e(t.code) + '</span>'
    + (t.project ? '<span class="tk-list-card-project">' + e(tkGetProjectName(t.project)) + '</span>' : '') + '</div>'
    + '<div class="tk-list-card-title"><button type="button" class="tk-list-card-title-btn" title="' + e(t.title) + '">' + e(t.title) + '</button>' + toggle + childBadge + '</div>'
    + '<p class="tk-list-card-desc" title="' + e(hintTitle) + '"><span class="tk-list-card-hint-lead">' + e(info.hint) + '</span>' + (descText ? '<span class="tk-list-card-hint-desc">' + e(descText) + '</span>' : '') + '</p>'
    + (typeTag || priorityTag ? '<div class="tk-list-card-foot">' + typeTag + priorityTag + '</div>' : '')
    + '</div>'
    + '<div class="tk-list-stage">' + stageHtml + '</div>'
    + '<div class="tk-list-card-actions">' + actionButton + '</div>'
    + '</div></td></tr>';
}

export function taskListVisibleColumnCount(order, visibility) {
  return order.filter(function(id) { return id === 'title' || visibility[id] !== false; }).length + 2;
}

function taskListFieldKey(cell) {
  var match = cell.className.match(/(?:^|\s)tk-col-(code|title|module|status|type|priority|assignee|project|created|desc)(?:\s|$)/);
  return match && match[1];
}

export function applyTaskListFieldSettings(head, body, order, visibility) {
  var rows = [head].concat(Array.from(body.querySelectorAll('tr.tk-row')));
  rows.forEach(function(row) {
    var cells = Array.from(row.children);
    var byKey = Object.create(null);
    cells.forEach(function(cell) { var key = taskListFieldKey(cell); if (key) byKey[key] = cell; });
    order.forEach(function(id) {
      var cell = byKey[id];
      if (!cell) return;
      cell.hidden = id !== 'title' && visibility[id] === false;
      row.appendChild(cell);
    });
    var actions = cells.find(function(cell) { return cell.classList.contains('tk-col-actions'); });
    if (actions) row.appendChild(actions);
  });
  body.querySelectorAll('.tk-row-create td[colspan]').forEach(function(cell) { cell.colSpan = taskListVisibleColumnCount(order, visibility); });
  /* 数据行多于表头一列(操作列)，表头不包含该列以消除空列视觉干扰 */
}
