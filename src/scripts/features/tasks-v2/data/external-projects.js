import { CV_PROJECTS } from '../../collab/data.js';
/* 任务数据：其他板块（管理）登记的项目。
   叶子模块：不依赖同目录其他模块，保证 store.js 求值期迁移缓存时这里已初始化（拆自 tasks-v2/data.js）。 */

/* 其他板块（管理）的项目：不进入协作开发的项目列表，但其下任务与开发板块共用任务数据，
   开发板块按项目查找名称、成员与可见范围时一并识别。由提供方在任务模块初始化前注册。 */
var externalProjects = function () { return []; };
function tkSetExternalProjects(provider) {
  if (typeof provider === 'function') externalProjects = provider;
}
function tkAllProjects() { return CV_PROJECTS.concat(externalProjects() || []); }

export { externalProjects, tkAllProjects, tkSetExternalProjects };
