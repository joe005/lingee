import { wsPath } from '../../core/workspace-tree.js';
/* 工作区安装清单独立于个人安装；只接收上架目录，保存版本与成员快照。 */
export const CAPABILITY_KEY = 'lingee-workspace-capabilities-v1';
let catalogProvider = () => [];
export function setCapabilityCatalog(provider) { catalogProvider = provider; }
/* 个人自建资产由 expert 区域注册：避免本模块顶层依赖头像等静态资源，Node 直跑的命令行测试才可加载 */
let personalProvider = () => ({experts: [], teams: [], lookup: () => null});
export function setPersonalAssets(provider) { personalProvider = provider; }
let localInstallChecker = () => '';
export function setCapabilityLocalChecker(checker) { localInstallChecker = checker; }
export function capabilityLocalInstallError(entry,userId) { return localInstallChecker(entry,userId); }
const clone = value => structuredClone(value);
const keyOf = (p, ws) => JSON.stringify([p.id, ws || '']);
function read() { try { const value = JSON.parse(localStorage.getItem(CAPABILITY_KEY) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch (_) { return {}; } }
export function capabilityCatalog(p) { if (!p) return []; return catalogProvider(p).filter(row => ['expert','team'].includes(row.kind)); }
/* 兼容旧版显式继承记录：按原有效清单固化一次；新工作区始终独立、初始为空。 */
function materializeLegacy(p, all) {
  let changed = false;
  const pending = [];
  for (const ws of p?.workspaces || []) {
    if (all[keyOf(p,ws.id)]?.mode !== 'inherit') continue;
    const chain = wsPath(p,ws.id).slice().reverse().map(w => w.id).concat('');
    let value = {entries:[],defaultKey:''};
    for (const id of chain) {
      const saved = all[keyOf(p,id)];
      if (saved?.mode !== 'inherit' && Array.isArray(saved?.entries)) { value = saved; break; }
    }
    pending.push([keyOf(p,ws.id),{mode:'independent',entries:clone(value.entries),defaultKey:value.defaultKey || ''}]);
  }
  for (const [key,value] of pending) { all[key] = value; changed = true; }
  return changed;
}
export function capabilityMigrate(p) {
  if (!p) return '';
  const all = read();
  if (!materializeLegacy(p,all)) return '';
  try { localStorage.setItem(CAPABILITY_KEY,JSON.stringify(all)); return ''; } catch (_) { return '原工作区安装记录迁移失败，请重试'; }
}
export function capabilityOwn(p, ws = '') {
  const all = read(); materializeLegacy(p,all);
  return all[keyOf(p,ws)] || {mode:'independent',entries:[],defaultKey:''};
}
export function capabilityList(p, ws = '') {
  if (!p || ws && !(p.workspaces || []).some(w => w.id === ws)) return {entries:[],defaultKey:'',source:null};
  return {...clone(capabilityOwn(p,ws)),source:{id:ws,name:(p.workspaces || []).find(w => w.id === ws)?.name || p.name}};
}
export function capabilitySave(p, ws, config) {
  if (!p || ws && !(p.workspaces || []).some(w => w.id === ws && w.status !== 'archived')) return '当前工作区不可配置';
  const all = read();
  if (config.mode === 'inherit') return '工作区分别安装资产，不再支持继承配置';
  materializeLegacy(p,all);
  {
    const catalog = capabilityCatalog(p), entries = [];
    const existing = config.preserveVersions ? capabilityList(p,ws).entries : [];
    for (const key of [...new Set(config.keys || [])]) {
      const pinned = existing.find(r => r.key === key);
      if (pinned) { entries.push(clone(pinned)); continue; }
      const row = catalog.find(r => r.key === key);
      if (!row) return '资产已下架或无权使用，请刷新后重新配置';
      const experts = row.kind === 'team' ? (row.data.members || []).map(id => catalog.find(r => r.kind === 'expert' && r.data.id === id)) : [row];
      if (experts.some(r => !r)) return '团队存在未上架或无权使用的成员，不能安装';
      entries.push({...clone(row), experts:experts.map(r => ({id:r.data.id,version:r.version,data:clone(r.data)}))});
    }
    if (entries.length && !entries.some(r => r.key === config.defaultKey)) return '请从已安装的智能体或团队中指定默认执行方';
    all[keyOf(p,ws)] = {mode:'independent',entries,defaultKey:entries.length ? config.defaultKey : ''};
  }
  try { localStorage.setItem(CAPABILITY_KEY, JSON.stringify(all)); } catch (_) { return '保存失败，原配置已保留，请重试'; }
  document.dispatchEvent(new Event('lingee:capabilities-changed'));
  return '';
}
export function capabilityDefault(p, ws = '') {
  const list = capabilityList(p,ws);
  return list.entries.find(r => r.key === list.defaultKey && capabilityAvailable(r,p)) || null;
}
/* 任务仅从所属工作区已安装且仍可加载的团队中预选，不使用个人资产或其他范围。 */
export function capabilityTeamDefault(p, ws = '') {
  const list = capabilityList(p,ws);
  const teams = list.entries.filter(row => row.kind === 'team' && capabilityAvailable(row,p));
  return teams.find(row => row.key === list.defaultKey) || teams[0] || null;
}
export function capabilityExecutor(row) {
  if (!row) return null;
  const expertDefinitions = Object.fromEntries((row.experts || []).map(e => [e.id,clone(e.data)]));
  return row.kind === 'team' ? {...clone(row.data),expertDefinitions} : {...clone(row.data),id:'expert:'+row.data.id,members:[row.data.id],leadId:row.data.id,solo:true,expertDefinitions};
}
/* 新建任务可选执行方：工作区目录条目（默认执行方置顶兜底）＋ 个人自建资产；个人自建免上架即可执行本人任务。 */
export function capabilityOptions(p, ws = '') {
  const list = capabilityList(p, ws);
  const options = list.entries.filter(row => capabilityAvailable(row, p)).map(row => ({...row, isDefault: row.key === list.defaultKey}));
  options.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  const known = new Set(options.map(row => row.key));
  const personal = personalProvider();
  for (const expert of personal.experts) {
    const key = 'expert:' + expert.id;
    if (known.has(key)) continue;
    options.push({kind: 'expert', key, version: '个人', data: clone(expert), experts: [{id: expert.id, version: '个人', data: clone(expert)}], personal: true});
  }
  for (const team of personal.teams) {
    const key = 'team:' + team.id;
    if (known.has(key)) continue;
    const members = (team.members || []).filter(id => personal.lookup(id));
    if (!members.length) continue;
    options.push({kind: 'team', key, version: '个人', data: clone(team), experts: members.map(id => ({id, version: '个人', data: clone(personal.lookup(id))})), personal: true});
  }
  return options;
}
function capabilityAvailable(entry, p) {
  const catalog = capabilityCatalog(p);
  return catalog.some(r => r.key === entry.key) && (entry.experts || []).every(e => catalog.some(r => r.kind === 'expert' && r.data.id === e.id));
}
export function capabilityTaskEntry(task, p) {
  const key = task.expertId ? 'expert:'+task.expertId : 'team:'+task.teamId;
  const row = capabilityList(p,task.workspaceId || '').entries.find(r => r.key === key && capabilityAvailable(r,p));
  return row || capabilityOptions(p,task.workspaceId || '').find(o => o.key === key) || null;
}
export function capabilityTaskError(task, p) {
  if (task.executorSnapshot && task.executorSnapshot.project === task.project && task.executorSnapshot.workspaceId === (task.workspaceId || '') && task.executorSnapshot.key === (task.expertId ? 'expert:'+task.expertId : 'team:'+task.teamId)) return '';
  if (!p || task.workspaceId && !(p.workspaces || []).some(w => w.id === task.workspaceId && w.status !== 'archived')) return '任务所属工作区不可用';
  return capabilityTaskEntry(task,p) ? '' : '任务使用的智能体或团队已不可用，请检查工作区安装记录并重新编辑保存任务';
}
export function capabilityTaskSnapshot(task, p) {
  if (task.executorSnapshot && !capabilityTaskError(task,p)) return task.executorSnapshot;
  const entry = capabilityTaskEntry(task,p);
  return entry ? {...clone(entry),project:task.project,workspaceId:task.workspaceId || '',capturedAt:new Date().toISOString()} : null;
}

/* 两个页签共用当前工作区的安装记录和唯一默认执行方，不影响其他工作区或个人安装。 */
export function capabilityChange(p, ws, action, key = '') {
  const list = capabilityList(p,ws);
  const keys = list.entries.map(r => r.key);
  let defaultKey = list.defaultKey;
  if (action === 'install') { if (!keys.includes(key)) keys.push(key); defaultKey ||= key; }
  else if (action === 'uninstall') {
    const index = keys.indexOf(key); if (index >= 0) keys.splice(index,1);
    if (defaultKey === key) defaultKey = keys[0] || '';
  } else if (action === 'default') {
    if (!keys.includes(key)) return '请先安装该智能体或团队';
    defaultKey = key;
  } else return '不支持的操作';
  return capabilitySave(p,ws,{mode:'independent',keys,defaultKey,preserveVersions:true});
}
