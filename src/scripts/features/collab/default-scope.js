import { tkCurrentUserId, tkProjectsForCurrentUser } from '../tasks-v2/data.js';
import { wsFlatTree } from '../../core/workspace-tree.js';
import { ldIsDevProject } from './local-dev.js';
/* 默认进入范围仅按当前用户在本机保存，不修改空间或工作区数据。 */
function key() { var id = tkCurrentUserId(); return id ? 'lingee-collab-default-scope-v1:' + id : ''; }
export function readDefaultScope() {
  try {
    var value = key() ? JSON.parse(localStorage.getItem(key()) || 'null') : null;
    return value && typeof value.project === 'string' && value.project && typeof value.ws === 'string' ? { project: value.project, ws: value.ws } : null;
  } catch (_) { return null; }
}
export function validDefaultScope(value) {
  if (!value) return false;
  var project = tkProjectsForCurrentUser().filter(ldIsDevProject).find(function (p) { return p.id === value.project; });
  return !!project && (!value.ws || wsFlatTree(project).some(function (row) { return row.ws.id === value.ws; }));
}
export function saveDefaultScope(value) {
  var storageKey = key();
  if (!storageKey || (value && !validDefaultScope(value))) return false;
  try { if (value) localStorage.setItem(storageKey, JSON.stringify(value)); else localStorage.removeItem(storageKey); return true; }
  catch (_) { return false; }
}
