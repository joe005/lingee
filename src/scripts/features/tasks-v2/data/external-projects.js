import { CV_PROJECTS, wsHost } from '../../collab/data.js';
/* 任务数据：其他板块（管理）登记的项目。
   叶子模块：不依赖同目录其他模块，保证 store.js 求值期迁移缓存时这里已初始化（拆自 tasks-v2/data.js）。 */

/* 其他板块（管理）的项目：不进入协作开发的项目列表，但其下任务与开发板块共用任务数据，
   开发板块按项目查找名称、成员与可见范围时一并识别。由提供方在任务模块初始化前注册。 */
var externalProjects = function () { return []; };
function tkSetExternalProjects(provider) {
  if (typeof provider === 'function') externalProjects = provider;
}
/* 末尾是 Build 独立工作区的内部容器：按 id 查得到，但不当作空间列出（见 permissions.js） */
function tkAllProjects() {
  /* Manage 为协作开发空间补的同 id 记录不重复列出，Build 侧以协作开发的那条为准 */
  var ids = new Set(CV_PROJECTS.map(function (p) { return p.id; }));
  /* Build 新建空间在 Manage 的同步记录（buildSpaceId）也不重复列出，Build 侧以内部容器里的那条为准 */
  return CV_PROJECTS.concat((externalProjects() || []).filter(function (p) { return !ids.has(p.id) && !p.buildSpaceId; }), [wsHost()]);
}

export { externalProjects, tkAllProjects, tkSetExternalProjects };
