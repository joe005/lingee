import { CV_MEMBERS } from './people.js';
/* Build 独立工作区（2026-11-05 会议：工作区扁平、可独立创建，按映射承接管理层级）。
   不属于任何空间的工作区统一挂在这个内部容器上，复用空间下工作区的任务、仓库、成员与智能体配置；
   容器本身不是空间：不进入空间列表，容器根（默认工作区）不可选，成员是全部启用的 Build 用户。
   工作区可关联一个 Manage 开发空间（ws.spaceId），只决定切换器分组与开发空间管理者能否查看，不移动数据。
   原型保存在浏览器本地，正式实现由 Build 后端维护。 */
var STORE_KEY = 'lingee-build-workspaces-v1';
var WS_HOST_ID = 'build-ws-host';
var host = null;

function load() {
  try { var list = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); return Array.isArray(list) ? list : []; }
  catch (_) { return []; }
}
function wsHost() {
  if (!host) {
    host = {
      id: WS_HOST_ID, name: '独立工作区', space: 'build', wsHost: true, template: 'collab', status: 'active',
      owner: '', adminIds: [], workspaces: load(),
      get members() { return CV_MEMBERS.filter(function (m) { return m.status !== 'disabled'; }).map(function (m) { return m.id; }); },
    };
  }
  return host;
}
function isWsHost(project) { return !!project && project.id === WS_HOST_ID; }
function wsHostSave() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(wsHost().workspaces || [])); return true; }
  catch (_) { return false; }
}

export { WS_HOST_ID, isWsHost, wsHost, wsHostSave };
