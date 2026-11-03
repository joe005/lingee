/* 工作区树（空间之下的工作范围）：只放纯函数，不依赖任何业务模块，Manage 与 Build 共用。
   工作区随空间保存在 project.workspaces 数组里，按 parentId 存树（空 = 挂在空间根）；层级上限放在这里一处。 */

export var WS_MAX_DEPTH = 3;
export var WS_NAME_MAX = 30;

export function wsList(project) {
  return project && Array.isArray(project.workspaces) ? project.workspaces : [];
}
export function wsById(project, id) {
  if (!id) return null;
  return wsList(project).find(function (w) { return w.id === id; }) || null;
}
/* 同级按 order 再按创建先后排列 */
export function wsChildren(project, parentId) {
  return wsList(project).filter(function (w) { return (w.parentId || '') === (parentId || ''); })
    .sort(function (a, b) { return (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0); });
}
/* 从一级到自身的工作区链；链断了（父级不存在）时停在断点 */
export function wsPath(project, id) {
  var path = [];
  var seen = {};
  var cur = wsById(project, id);
  while (cur && !seen[cur.id]) {
    seen[cur.id] = true;
    path.unshift(cur);
    cur = wsById(project, cur.parentId);
  }
  return path;
}
export function wsPathNames(project, id) {
  return wsPath(project, id).map(function (w) { return w.name; });
}
export function wsDepth(project, id) { return wsPath(project, id).length; }
/* 以该工作区为根的子树高度（自身为 1） */
export function wsHeight(project, id) {
  var kids = wsChildren(project, id);
  return 1 + kids.reduce(function (m, k) { return Math.max(m, wsHeight(project, k.id)); }, 0);
}
/* 自身及全部下级的 ID */
export function wsSubtreeIds(project, id) {
  var ids = [id];
  wsChildren(project, id).forEach(function (k) { ids = ids.concat(wsSubtreeIds(project, k.id)); });
  return ids;
}
export function wsAncestorIds(project, id) {
  return wsPath(project, id).slice(0, -1).map(function (w) { return w.id; });
}
/* 深度优先展开，供下拉树和管理列表使用；归档的工作区默认不出现 */
export function wsFlatTree(project, opts) {
  var withArchived = !!(opts && opts.archived);
  var rows = [];
  (function walk(parentId, depth) {
    wsChildren(project, parentId).forEach(function (w) {
      if (!withArchived && w.status === 'archived') return;
      rows.push({ ws: w, depth: depth, hasChildren: wsChildren(project, w.id).some(function (k) { return withArchived || k.status !== 'archived'; }) });
      walk(w.id, depth + 1);
    });
  })('', 1);
  return rows;
}
/* 任务归属：task.workspaceId 落在 id 的子树内（id 为空表示不限） */
export function wsTaskInScope(project, task, id) {
  if (!id) return true;
  var tid = task && task.workspaceId;
  return !!tid && wsSubtreeIds(project, id).indexOf(tid) >= 0;
}
/* 「空间 › 工作区」标签：路径过长只显示末级；没有归属的任务只显示空间 */
export function wsTaskLabel(project, task) {
  if (!project) return '';
  var names = task && task.workspaceId ? wsPathNames(project, task.workspaceId) : [];
  if (!names.length) return project.name;
  return project.name + ' › ' + (names.length > 2 ? names[names.length - 1] : names.join(' › '));
}
