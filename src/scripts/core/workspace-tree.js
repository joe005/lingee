/* 工作区（空间之下的工作范围）：只放纯函数，不依赖任何业务模块，Manage 与 Build 共用。
   工作区随空间保存在 project.workspaces 数组里，只有一级、互相平铺，不再有上下级。
   下面保留原有函数名，便于各页面沿用；路径即自身，没有下级。 */

export var WS_MAX_DEPTH = 1;
/* 空间只是容器：空间根下的任务和配置就是「默认工作区」（workspaceId 为空），与其他工作区平级 */
export var WS_DEFAULT_NAME = '默认工作区';
export var WS_DEFAULT_FILTER = '__default';
export var WS_NAME_MAX = 30;

export function wsList(project) {
  return project && Array.isArray(project.workspaces) ? project.workspaces : [];
}
export function wsById(project, id) {
  if (!id) return null;
  return wsList(project).find(function (w) { return w.id === id; }) || null;
}
/* 空间下的全部工作区（parentId 为空表示空间根），按 order 再按创建先后排列；工作区没有下级 */
export function wsChildren(project, parentId) {
  if (parentId) return [];
  return wsList(project).slice()
    .sort(function (a, b) { return (a.order || 0) - (b.order || 0) || (a.createdAt || 0) - (b.createdAt || 0); });
}
export function wsPath(project, id) {
  var ws = wsById(project, id);
  return ws ? [ws] : [];
}
export function wsPathNames(project, id) {
  return wsPath(project, id).map(function (w) { return w.name; });
}
export function wsDepth(project, id) { return wsPath(project, id).length; }
export function wsHeight() { return 1; }
export function wsSubtreeIds(project, id) { return [id]; }
export function wsAncestorIds() { return []; }
/* 供下拉和管理列表使用；归档的工作区默认不出现 */
export function wsFlatTree(project, opts) {
  var withArchived = !!(opts && opts.archived);
  return wsChildren(project, '').filter(function (w) { return withArchived || w.status !== 'archived'; })
    .map(function (w) { return { ws: w, depth: 1, hasChildren: false }; });
}
/* 工作区成员（含负责人与工作区管理员）；空间负责人、空间管理员另行判断 */
export function wsHasPerson(ws, personId) {
  if (!ws || !personId) return false;
  return ws.ownerId === personId || (ws.memberIds || []).indexOf(personId) >= 0 || (ws.adminIds || []).indexOf(personId) >= 0;
}
/* 任务归属：task.workspaceId 等于 id（id 为空表示不限） */
export function wsTaskInScope(project, task, id) {
  if (!id) return true;
  if (id === WS_DEFAULT_FILTER) return !!task && !task.workspaceId;
  return !!task && task.workspaceId === id;
}
/* 范围名称：'' 为默认工作区 */
export function wsScopeName(project, id) {
  var ws = id ? wsById(project, id) : null;
  return ws ? ws.name : WS_DEFAULT_NAME;
}
/* 「空间 › 工作区」标签；空间还没有其他工作区时只显示空间 */
export function wsTaskLabel(project, task) {
  if (!project) return '';
  var ws = task && task.workspaceId ? wsById(project, task.workspaceId) : null;
  if (ws) return project.name + ' › ' + ws.name;
  return wsList(project).length ? project.name + ' › ' + WS_DEFAULT_NAME : project.name;
}
