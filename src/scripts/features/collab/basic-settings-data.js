import { gitRepoProblem } from '../../core/git-url.js';
import { tkGetTasks, tkUpdateTask } from '../tasks-v2/data.js';
import { ldAuthFor, ldNetCheck, ldRepoInfo } from './local-dev/core.js';
import { buildRepoList, buildRepoIdentity, buildRepoResolve, buildRepoSave, buildTaskRepoSnapshot } from './repository-config.js';
import { CV_MEMBERS, CV_PROJECTS, cvPersistProjects } from './data.js';
import { mgrProjects, mgrSaveProjects, mgrMemberOpenTasks, mgrProjectTasks } from '../manager/data.js';
import { isSpaceManager, canManageWs, personName, wsAddMembers, wsRemoveMember, wsSetAdmin, wsUpdateInfo } from '../manager/workspaces.js';
/* 基本设置的数据操作：两类空间分别写回原存储，工作区继续使用现有校验。 */
export function basicCanViewManagement(p, ws) { return !!p && (ws ? canManageWs(p, ws) : isSpaceManager(p)); }
export function basicEditable(p, ws) { return ws?.status !== 'archived' && basicCanViewManagement(p, ws); }
function save(p, patch) {
  var before = {};
  Object.keys(patch).concat('updatedAt').forEach(function (key) { before[key] = { exists: Object.hasOwn(p, key), value: p[key] }; });
  Object.assign(p, patch, { updatedAt: Date.now() });
  if (!(CV_PROJECTS.includes(p) ? cvPersistProjects() : mgrSaveProjects())) {
    Object.keys(before).forEach(function (key) { if (before[key].exists) p[key] = before[key].value; else delete p[key]; });
    return '保存失败，请重试';
  }
  document.dispatchEvent(new CustomEvent('lingee:mgr-projects-changed', { detail: { settings: p.id } }));
  document.dispatchEvent(new Event('lingee:tasks-changed'));
  return '';
}
export function basicSaveGeneral(p, ws, fields) {
  if (!basicEditable(p, ws)) return '没有权限修改当前设置';
  if (!String(fields.name || '').trim()) return ws ? '请填写工作区名称' : '请填写名称';
  if (!String(fields.desc || '').trim()) return '请填写描述';
  if (ws) { var res = wsUpdateInfo(p, ws.id, fields); return res.ok ? '' : res.error; }
  var name = fields.name.trim();
  if (!name) return '请填写空间名称';
  if (name.length > 60) return '空间名称不能超过 60 个字';
  if (CV_PROJECTS.concat(mgrProjects()).some(function (other) { return other.id !== p.id && other.name.trim() === name; })) return '已有同名空间';
  return save(p, { name: name, desc: fields.desc.trim(), instruction: fields.instruction.trim() });
}
/* 仓库配置仅取当前工作区，不回退上级。 */
export function basicRepoConfig(p, ws) { return buildRepoResolve(p, ws?.id || ''); }
export function basicRepoRowError(item) {
  const repo = String(item.repo || '').trim(), branch = String(item.baseBranch || '').trim();
  if (!repo) return '请填写仓库地址';
  try { const url = new URL(repo); if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return '请填写不含凭据、查询参数的 HTTPS 仓库地址'; }
  catch (_) { return '请填写有效的 HTTPS 仓库地址'; }
  const error = gitRepoProblem(repo); if (error) return error;
  if (!branch || branch === '@' || branch.startsWith('-') || branch.split('/').some(part => part.startsWith('.') || part.endsWith('.lock')) || /[\s~^:?*\[\\]|\.\.|@\{|\/\/|^[/.]|[/.]$/.test(branch)) return '请填写有效的基准分支名称';
  const info = ldRepoInfo({repo:repo,_repoResolved:true}), auth = ldAuthFor(info.host);
  if (!auth || auth.expired) return '请先在「基础 › Git 账号」登录 ' + info.host + '，再保存仓库配置';
  return ldNetCheck(info, auth)?.reason || '';
}
export function basicSaveRepo(p, ws, config) {
  if (ws && !(p.workspaces || []).some(item => item.id === ws.id)) return '工作区已不存在';
  if (!basicEditable(p, ws)) return '没有权限修改仓库';
  if (config.mode === 'inherit') return '工作区仓库独立配置，不支持继承';
  const list = config.repositories || [];
  const seen = new Set();
  for (const item of list) {
    const error = basicRepoRowError(item); if (error) return error;
    /* 代码仓库（地址与基准分支）和名称必填；名称默认取自地址末段，手动清空后需重新填写 */
    if (!String(item.name || '').trim()) return '请填写仓库名称';
    const key = buildRepoIdentity(item.repo);
    if (seen.has(key)) return '同一列表不能重复添加同一仓库';
    seen.add(key);
  }
  if (config.defaultRepo && config.mode !== 'inherit' && !seen.has(config.defaultRepo)) return '主仓库已不在列表中，请重新选择';
  // Freeze old execution context before replacing a list, including affected descendants.
  tkGetTasks().filter(task => task.project === p.id && !task.repoSnapshot &&
    (task.gitBranch || task.codeDeliveries?.length || ['in_progress','in_review','done'].includes(task.status) || (task.statusHistory || []).some(row => row.to === 'in_progress')))
    .forEach(task => { const snapshot = buildTaskRepoSnapshot(task, p); if (snapshot) tkUpdateTask(task.id, {repoSnapshot:snapshot}); });
  return buildRepoSave(p, ws?.id || '', config) ? '' : '保存失败，请重试';
}
export function basicAddMember(p, ws, id, role) {
  if (!basicEditable(p, ws)) return '没有权限管理成员';
  if (!CV_MEMBERS.some(function (m) { return m.id === id && m.status !== 'disabled'; })) return '请选择有效成员';
  if (role && role !== 'member' && role !== 'admin') return '请选择有效角色';
  if ((ws ? ws.memberIds || [] : p.members || []).includes(id)) return '该人员已是成员';
  if (ws) { var res = wsAddMembers(p, ws.id, [id], role); return res.ok ? '' : res.error; }
  var patch = { members: Array.from(new Set((p.members || []).concat(id))) };
  if (role === 'admin') patch.adminIds = Array.from(new Set((p.adminIds || []).concat(id)));
  return save(p, patch);
}
/* 修改成员角色：工作区走工作区校验；空间（同名工作区）改空间管理员，负责人不可改 */
export function basicSetMemberRole(p, ws, id, role) {
  if (!basicEditable(p, ws)) return '没有权限管理成员';
  if (role !== 'admin' && role !== 'member') return '请选择有效角色';
  if (ws) { var res = wsSetAdmin(p, ws.id, id, role === 'admin'); return res.ok ? '' : res.error; }
  if (personName(id) === p.owner) return '负责人的角色不能修改';
  if (!(p.members || []).includes(id)) return '该人员不是成员';
  var admins = (p.adminIds || []).filter(function (m) { return m !== id; });
  if (role === 'admin') admins.push(id);
  return save(p, { adminIds: admins });
}
export function basicRemoveMember(p, ws, id) {
  if (!basicEditable(p, ws)) return '没有权限管理成员';
  if (ws) { var res = wsRemoveMember(p, ws.id, id); return res.ok ? '' : res.error; }
  if (personName(id) === p.owner) return '负责人不能直接移除';
  if (mgrMemberOpenTasks(p, id).length || mgrProjectTasks(p.id).some(function (t) { return !['done', 'cancelled'].includes(t.status) && (t.executionPlan || []).some(function (stage) { return stage.status !== 'done' && stage.reviewerId === id; }); }) || (p.workspaces || []).some(function (w) { return w.ownerId === id; })) return '该成员仍有未完成任务或负责的工作区，请先转交';
  return save(p, { members: (p.members || []).filter(function (m) { return m !== id; }), adminIds: (p.adminIds || []).filter(function (m) { return m !== id; }), workspaces: (p.workspaces || []).map(function (w) { return Object.assign({}, w, { memberIds: (w.memberIds || []).filter(function (m) { return m !== id; }) }); }) });
}
