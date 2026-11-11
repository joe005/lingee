import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = path => readFileSync(new URL('../src/scripts/features/' + path, import.meta.url), 'utf8');
const people = [{id:'member',name:'普通成员'}, {id:'owner',name:'空间负责人'}, {id:'admin',name:'空间管理员'}, {id:'local',name:'工作区管理员'}, {id:'local-owner',name:'工作区负责人'}, {id:'legacy',name:'旧系统角色',workspaceRole:'system_admin'}];
let me = 'member';
const project = {id:'p',name:'空间',owner:'空间负责人',adminIds:['admin'],members:people.map(p=>p.id),workspaces:[]};
const ws = {id:'one',name:'工作区一',ownerId:'local-owner',adminIds:['local'],memberIds:['member','local','local-owner']};
const other = {...ws,id:'two',ownerId:'member',adminIds:[]};
project.workspaces = [ws,other];
const managerSource=source('manager/data.js');
const managerFunction=managerSource.slice(managerSource.indexOf('function mgrCanManageProject('),managerSource.indexOf('/* ---------- 项目成员'));
const mgrCanManageProject=new Function('CV_MEMBERS','cvCurrentUserName',managerFunction+'\nreturn mgrCanManageProject;')(people,()=>people.find(p=>p.id===me)?.name);
const strip = text => text.replace(/^import [\s\S]*?;\n/gm,'').replace(/^export \{[\s\S]*?\};?\n?/gm,'').replace(/^export /gm,'');
const deps={CV_MEMBERS:people,CV_PROJECTS:[],mgrCanManageProject,mgrCurrentPersonId:()=>me};
const wsFunctions=new Function(...Object.keys(deps),strip(source('manager/workspaces.js'))+'\nreturn {canManageWs,canOwnWs,isSpaceManager};')(...Object.values(deps));
const basic=new Function('canManageWs','isSpaceManager',strip(source('collab/basic-settings-data.js'))+'\nreturn {basicCanViewManagement,basicEditable,basicSaveGeneral};')(wsFunctions.canManageWs,wsFunctions.isSpaceManager);
for (const id of ['member','legacy']) {
  me=id;
  assert.equal(mgrCanManageProject(project),false);
  assert.equal(basic.basicCanViewManagement(project,ws),false);
  assert.equal(basic.basicEditable(project,ws),false);
  assert.equal(basic.basicSaveGeneral(project,ws,{name:'越权修改',desc:'test'}),'没有权限修改当前设置');
}
for (const id of ['owner','admin']) {
  me=id;
  assert.equal(basic.basicEditable(project,null),true);
  assert.equal(basic.basicEditable(project,ws),false,'parent managers cannot configure an unrelated workspace');
}
for (const id of ['local','local-owner']) {
  me=id;
  assert.equal(basic.basicCanViewManagement(project,ws),true);
  assert.equal(basic.basicEditable(project,ws),true);
  assert.equal(basic.basicEditable(project,other),false);
  assert.equal(basic.basicEditable(project,{...ws,status:'archived'}),false);
}
const peopleSource=source('collab/data/people.js');
const roleFunction=peopleSource.slice(peopleSource.indexOf('function cvWorkspaceRole('),peopleSource.indexOf('function cvCanAccessWorkspace('));
const role=new Function('cvWorkspace','cvWorkspaceById',roleFunction+'\nreturn cvWorkspaceRole;')('scope',()=>({roles:{local:'system_admin'}}));
assert.equal(role(people.find(p=>p.id==='legacy')),'member','global cache is ignored');
assert.equal(role(people.find(p=>p.id==='local')),'admin','explicit old scope administrator remains a scope administrator');
console.log('空间管理权限回归通过：普通成员与旧系统角色不可管理、当前负责人/管理员可管理、跨工作区不继承、归档只读、保存入口拒绝越权。');
