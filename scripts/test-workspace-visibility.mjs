import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as tree from '../src/scripts/core/workspace-tree.js';

/* 工作区任务可见性：工作区任务只对工作区成员与空间管理者可见，空间根任务不受影响 */
const source = readFileSync(new URL('../src/scripts/features/tasks-v2/data/permissions.js', import.meta.url), 'utf8');
const names = [...source.matchAll(/export \{([^}]*)\}/g)].flatMap(m => m[1].split(',').map(s => s.trim()).filter(Boolean));
let currentUser = 'member';
const people = [
  { id: 'owner', name: '空间负责人' }, { id: 'admin', name: '空间管理员' }, { id: 'member', name: '工作区成员' },
  { id: 'outsider', name: '其他空间成员' }, { id: 'wsadmin', name: '工作区管理员' }, { id: 'sys', name: '系统管理员', workspaceRole: 'system_admin' },
];
const project = {
  id: 'space', name: '产品研发', owner: '空间负责人', adminIds: ['admin'], members: people.map(p => p.id),
  workspaces: [{ id: 'ws-a', name: '应用开发组', ownerId: 'owner', memberIds: ['owner', 'member'], adminIds: ['wsadmin'] }, { id: 'ws-b', name: '质量组', ownerId: 'owner', memberIds: ['owner'] }],
};
/* Build 独立工作区容器：ws-m 关联到 space，ws-f 未关联 */
const host = {
  id: 'build-ws-host', name: '独立工作区', owner: '', adminIds: [], wsHost: true, members: people.map(p => p.id),
  workspaces: [{ id: 'ws-m', name: '关联组', ownerId: 'member', memberIds: ['member'], spaceId: 'space' }, { id: 'ws-f', name: '独立组', ownerId: 'member', memberIds: ['member'], spaceId: '' }],
};
const deps = {
  ...tree,
  CV_MEMBERS: people,
  cvWorkspaceRole: p => p?.workspaceRole || 'member',
  tkAllProjects: () => [project, host],
  isWsHost: p => !!p && p.id === host.id,
  wsHost: () => host,
  tkCurrentUserId: () => currentUser,
  tkCurrentStageHandlerId: t => t.assignee,
};
const mod = new Function(...Object.keys(deps), source.replace(/^import .*;\n/gm, '').replace(/^export \{[^}]*\};?\n?/gm, '') + '\nreturn {' + names.join(',') + '};')(...Object.values(deps));

const everyone = ['owner', 'admin', 'member', 'outsider', 'wsadmin'];
const task = (workspaceId) => ({ id: 't-' + workspaceId, project: 'space', workspaceId, createdBy: 'x', assignee: 'x',
  executionPlan: [], comments: everyone.map(id => ({ authorId: id })) });
const view = (user, t) => { currentUser = user; return mod.tkCanViewTask(t); };

assert.equal(view('outsider', task('')), true, 'space-root tasks stay visible to participants');
assert.equal(view('member', task('ws-a')), true, 'workspace members see workspace tasks');
assert.equal(view('wsadmin', task('ws-a')), true, 'workspace admins see workspace tasks');
assert.equal(view('outsider', task('ws-a')), false, 'non-members cannot see workspace tasks even when they participated');
assert.equal(view('member', task('ws-b')), false, 'members of one workspace cannot see another');
assert.equal(view('owner', task('ws-b')), true, 'space owner sees every workspace');
assert.equal(view('admin', task('ws-b')), true, 'space admin sees every workspace');
assert.equal(view('sys', task('ws-b')), true, 'system admin sees every workspace');

currentUser = 'member';
assert.deepEqual(mod.tkVisibleWorkspaces(project).map(r => r.ws.id), ['ws-a'], 'switcher lists only member workspaces');
currentUser = 'outsider';
assert.deepEqual(mod.tkVisibleWorkspaces(project).map(r => r.ws.id), [], 'non-members see no workspace');
currentUser = 'admin';
assert.deepEqual(mod.tkVisibleWorkspaces(project).map(r => r.ws.id), ['ws-a', 'ws-b'], 'space admin sees all workspaces');
// 老数据：空间根在 Build 里就是与空间同名的工作区
const rootTask = { project: 'space', workspaceId: '' }, wsTask = { project: 'space', workspaceId: 'ws-a' };
assert.equal(tree.wsTaskInScope(project, rootTask, tree.WS_DEFAULT_FILTER), true, 'default workspace holds space-root tasks');
assert.equal(tree.wsTaskInScope(project, wsTask, tree.WS_DEFAULT_FILTER), false, 'default workspace excludes other workspaces');
assert.equal(tree.wsScopeName(project, ''), '产品研发', 'the space root is a workspace named after the space');
assert.equal(tree.wsScopeName(project, 'ws-a'), '应用开发组');
assert.equal(tree.wsTaskLabel(project, rootTask), '产品研发', 'space-root tasks show only the space name');
assert.equal(tree.wsTaskLabel({ name: '老空间', workspaces: [] }, rootTask), '老空间', 'spaces without workspaces keep the plain label');
// 独立工作区：成员可见；关联空间的管理者可见关联的那个；未关联的只有成员和系统管理员可见
const hostTask = (workspaceId) => ({ ...task(workspaceId), project: 'build-ws-host' });
assert.equal(view('member', hostTask('ws-f')), true, 'standalone workspace members see its tasks');
assert.equal(view('outsider', hostTask('ws-f')), false, 'non-members cannot see standalone workspace tasks');
assert.equal(view('admin', hostTask('ws-m')), true, 'mapped space admin sees the mapped standalone workspace');
assert.equal(view('admin', hostTask('ws-f')), false, 'space admin cannot see an unmapped standalone workspace');
assert.equal(view('sys', hostTask('ws-f')), true, 'system admin sees standalone workspaces');
currentUser = 'member';
assert.equal(mod.tkProjectsForCurrentUser().some(p => p.id === host.id), false, 'the container is never listed as a space');
assert.equal(mod.tkScopeProjects().some(p => p.id === host.id), true, 'scope list includes the container when a workspace is visible');
currentUser = 'outsider';
assert.equal(mod.tkScopeProjects().some(p => p.id === host.id), false, 'scope list hides the container without visible workspaces');
console.log('工作区可见性回归通过：默认工作区任务不受影响、工作区任务仅成员与空间管理者可见、切换器只列可见工作区与默认工作区范围、独立工作区按成员与关联空间管理者可见。');
