import { tkGetPerson, tkGetPriorityObj, tkGetProjectName, tkGetStatusObj } from './data.js';

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
  var progressDots = Array.from({ length:progress.total }, function (_, index) {
    var progressState = index < progress.index || t.status === 'done' && index < progress.total - 1 ? ' is-done' : index === progress.index ? ' is-current' : '';
    return '<span class="tk-list-progress-dot' + progressState + '"></span>';
  }).join('');
  var cardStatusName = { backlog:'待交给AI执行', in_review:'待验收' }[t.status] || st.name;
  var listAction = t.status === 'backlog'
    ? '<button type="button" class="tk-list-action-btn" data-list-task-action="start" data-list-task-id="' + t.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.6 4.4L6 9l4.4 1.6L12 15l1.6-4.4L18 9l-4.4-1.6L12 3Z"/><path d="m5 15-.8 2.2L2 18l2.2.8L5 21l.8-2.2L8 18l-2.2-.8L5 15Z"/></svg><span>交给AI执行</span></button>'
    : t.status === 'in_review'
      ? '<button type="button" class="tk-list-action-btn" data-list-task-action="preview" data-list-task-id="' + t.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg><span>查看验收产物</span></button>'
      : t.status === 'blocked'
        ? '<button type="button" class="tk-list-action-btn" data-list-task-action="retry" data-list-task-id="' + t.id + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8.1 8.1 0 1 0-2.4 5.7"/><path d="M20 4v7h-7"/></svg><span>重新执行</span></button>'
        : '';
  return '<tr class="tk-row tk-list-card-row' + sel + (context.drawerTaskId === t.id ? ' detail-active' : '') + (depth ? ' tk-row--child' : '') + (hasChildren ? ' tk-row--parent' : '') + '" data-task-id="' + t.id + '" data-depth="' + depth + '" tabindex="0">'
    + '<td class="tk-list-card-cell" colspan="11"><div class="tk-list-card">'
    + '<div class="tk-list-card-main"><div class="tk-list-card-meta"><span class="tk-list-status" data-status="' + context.escapeHtml(t.status) + '">' + context.escapeHtml(cardStatusName) + '</span><span>' + context.escapeHtml(t.code) + '</span><i>·</i><span>' + context.escapeHtml(tkGetProjectName(t.project)) + '</span></div>'
    + '<div class="tk-list-card-title"><strong>' + context.escapeHtml(t.title) + '</strong>' + toggle + childBadge + '</div>'
    + '<p class="tk-list-card-desc" title="' + context.escapeHtml(String(t.desc || '').replace(/\s+/g, ' ')) + '">' + context.escapeHtml(t.desc || '暂无任务描述') + '</p>'
    + '<div class="tk-list-card-foot">'
    + '<span class="tk-list-card-label tk-list-card-type" data-type="' + context.escapeHtml(t.issueType || '') + '" title="任务类型：' + context.escapeHtml(t.issueType || '未设置') + '" aria-label="任务类型：' + context.escapeHtml(t.issueType || '未设置') + '">' + context.escapeHtml(t.issueType || '未设置') + '</span>'
    + '<span class="tk-list-card-label tk-list-priority" data-priority="' + context.escapeHtml(t.priority) + '" title="优先级：' + context.escapeHtml(pri.name) + '" aria-label="优先级：' + context.escapeHtml(pri.name) + '">优先级：' + context.escapeHtml(pri.name) + '</span>'
    + '</div></div>'
    + '<div class="tk-list-stage"><strong>' + context.escapeHtml(progress.name) + '</strong><div class="tk-list-progress-row"><div class="tk-list-progress">' + progressDots + '</div><span class="tk-list-progress-count">' + (progress.index + 1) + '/' + progress.total + '</span></div></div>'
    + '<div class="tk-list-card-actions">' + listAction + '</div>'
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
