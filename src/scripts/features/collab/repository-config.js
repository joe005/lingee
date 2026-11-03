import { wsPath } from '../../core/workspace-tree.js';
/* Build 范围仓库列表；兼容旧单仓库缓存，不回写 Manage。 */
export const BUILD_REPO_KEY = 'lingee-build-repositories-v1';
function read() { try { const data = JSON.parse(localStorage.getItem(BUILD_REPO_KEY) || '{}'); return data && typeof data === 'object' && !Array.isArray(data) ? data : {}; } catch (_) { return {}; } }
function scopeKey(p, wsId) { return JSON.stringify([p.id, wsId || '']); }
export function buildRepoIdentity(repo) {
  try { const url = new URL(repo); return url.host.toLowerCase() + url.pathname.replace(/\/+$/, '').replace(/\.git$/, ''); }
  catch (_) { return String(repo || '').trim().replace(/\/+$/, '').replace(/\.git$/, ''); }
}
function row(value) {
  const repo = String(value.repo || '').trim();
  return { key:buildRepoIdentity(repo), name:String(value.name || '').trim() || repo.replace(/\/+$/, '').split('/').pop().replace(/\.git$/, ''), repo, baseBranch:String(value.baseBranch || 'main').trim() || 'main',
    desc:String(value.desc || '').trim(), apps:Array.isArray(value.apps) ? value.apps.map(String).filter(Boolean) : [] };
}
function legacyFields(p, wsId, all) {
  const saved = all[scopeKey(p, wsId)];
  return saved || (wsId ? (p.workspaces || []).find(w => w.id === wsId) : p) || {};
}
/* 旧版显式继承与局部覆盖只用于迁移；新工作区初始为空，不再读取上级配置。 */
function legacyOwn(p, wsId, all) {
  const saved = all[scopeKey(p,wsId)];
  if (saved?.mode === 'inherit') return {mode:'inherit'};
  if (Array.isArray(saved?.repositories)) return {mode:'independent',repositories:saved.repositories.map(row),defaultRepo:saved.defaultRepo || ''};
  const own = legacyFields(p,wsId,all);
  if (wsId && !own.repo && !own.baseBranch) return {mode:'independent',repositories:[],defaultRepo:''};
  const chain = (wsId ? wsPath(p,wsId).reverse().map(w => w.id) : []).concat('');
  let repo = '', baseBranch = '';
  for (const id of chain) { const fields = legacyFields(p,id,all); repo ||= fields.repo || ''; baseBranch ||= fields.baseBranch || ''; }
  const repositories = repo ? [row({repo,baseBranch})] : [];
  return {mode:'independent',repositories,defaultRepo:repositories[0]?.key || ''};
}
function independentRecords(p, all) {
  const values = [];
  for (const id of [''].concat((p.workspaces || []).map(w => w.id))) {
    let own = legacyOwn(p,id,all);
    if (own.mode === 'inherit') {
      const chain = (id ? wsPath(p,id).reverse().map(w => w.id) : []).concat('');
      own = {repositories:[],defaultRepo:''};
      for (const source of chain) {
        const saved = all[scopeKey(p,source)];
        const raw = legacyFields(p,source,all);
        if (saved?.mode === 'inherit' || source && !Array.isArray(saved?.repositories) && !raw.repo && !raw.baseBranch) continue;
        own = legacyOwn(p,source,all); break;
      }
    }
    const repositories = own.repositories || [];
    values.push([scopeKey(p,id),{mode:'independent',repositories,defaultRepo:repositories.some(r => r.key === own.defaultRepo) ? own.defaultRepo : repositories[0]?.key || ''}]);
  }
  for (const [key,value] of values) all[key] = value;
  return all;
}
export function buildRepoOwn(p, wsId = '') {
  return independentRecords(p,read())[scopeKey(p,wsId)] || {mode:'independent',repositories:[],defaultRepo:''};
}
export function buildRepoList(p, wsId = '') {
  return {...buildRepoOwn(p,wsId),source:{id:wsId,name:(p.workspaces || []).find(w => w.id === wsId)?.name || p.name},inherited:false};
}
export function buildRepoResolve(p, wsId = '', key = '') {
  const list = buildRepoList(p, wsId);
  const selected = key ? list.repositories.find(r => r.key === key) : list.repositories.find(r => r.key === list.defaultRepo) || (list.repositories.length === 1 ? list.repositories[0] : null);
  return selected ? {...selected} : {repo:'',baseBranch:'main'};
}
export function buildRepoSave(p, wsId, fields) {
  if (fields.mode === 'inherit') return false;
  const all = independentRecords(p,read());
  const repositories = (fields.repositories || (fields.repo ? [fields] : [])).map(row);
  const value = {mode:'independent',repositories,defaultRepo:repositories.some(r => r.key === fields.defaultRepo) ? fields.defaultRepo : repositories[0]?.key || ''};
  all[scopeKey(p, wsId)] = value;
  try { localStorage.setItem(BUILD_REPO_KEY, JSON.stringify(all)); } catch (_) { return false; }
  document.dispatchEvent(new CustomEvent('lingee:build-repositories-changed', {detail:{project:p.id,workspace:wsId || ''}}));
  document.dispatchEvent(new Event('lingee:local-dev-changed'));
  return true;
}
export function buildTaskRepoConfig(task, project) {
  if (!task.repoSnapshot && Object.hasOwn(task, 'repositoryKey') && !task.repositoryKey) return {repo:'',baseBranch:'main'};
  return task.repoSnapshot || (project ? buildRepoResolve(project, task.workspaceId || '', task.repositoryKey || '') : {repo:'',baseBranch:'main'});
}
export function buildTaskNeedsRepo(task, project) {
  return !!task.repoSnapshot || !!task.repositoryKey || !!(project && buildRepoList(project, task.workspaceId || '').repositories.length)
    || (task.executionPlan || []).some(stage => /编码|开发实现|代码实现|功能开发|软件开发/.test(stage.title || stage.workType || ''));
}
export function buildTaskRepoSnapshot(task, project) {
  if (task.repoSnapshot) return task.repoSnapshot;
  const config = buildTaskRepoConfig(task, project);
  if (!config.repo) return null;
  return {repo:'https://' + buildRepoIdentity(config.repo),repoKey:buildRepoIdentity(config.repo),baseBranch:config.baseBranch,
    spaceId:task.project,workspaceId:task.workspaceId || '',capturedAt:new Date().toISOString()};
}
export function buildTaskMoveError(task, source, target, workspaceId, selectedKey) {
  const before = buildTaskRepoConfig(task, source), list = buildRepoList(target, workspaceId || '');
  const key = buildRepoIdentity(before.repo);
  const started = !!task.repoSnapshot || !!task.gitBranch || !!task.codeDeliveries?.length
    || (task.statusHistory || []).some(row => row.to === 'in_progress') || !['planned','backlog'].includes(task.status);
  if (target.id === task.project && (workspaceId || '') === (task.workspaceId || '') && selectedKey === key) return '';
  return started && (!list.repositories.some(r => r.key === key) || (selectedKey !== undefined && selectedKey !== key))
    ? '任务已经启动或存在代码分支，不能移动到不同仓库的工作区或更换仓库' : '';
}

export function buildTaskRepoSelectionError(task, project) {
  if (task.repoSnapshot) return '';
  if (!project || !buildRepoList(project, task.workspaceId || '').repositories.length) return '当前范围尚未配置仓库，请到「设置 › 工作区设置 › 仓库」添加';
  return !buildTaskRepoConfig(task, project).repo ? '请编辑任务并选择代码仓库；原仓库可能已被移除' : '';
}
