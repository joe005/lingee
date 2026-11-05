import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as capabilities from '../src/scripts/features/collab/capability-config.js';
import * as repositories from '../src/scripts/features/collab/repository-config.js';
import * as tree from '../src/scripts/core/workspace-tree.js';
import * as git from '../src/scripts/core/git-url.js';
const storage = new Map();
globalThis.localStorage = {getItem:key=>storage.get(key) ?? null,setItem:(key,value)=>storage.set(key,value)};
globalThis.document = new EventTarget();
const p={id:'space',name:'费用报销',space:'manage',containsRd:true,repo:'https://Git.Example.com/Team/Expense.git/',baseBranch:'main',workspaces:[
  {id:'backend',name:'后端',parentId:''}, {id:'api',name:'API',parentId:''},
  {id:'legacy',name:'旧分支覆盖',parentId:'',baseBranch:'release/old'},
  {id:'archived',name:'归档',status:'archived',repo:'https://git.example.com/old/repo'},
]};
const q={id:'other',name:'支付业务',space:'manage',containsRd:true,repo:'https://git.example.com/Team/Expense',workspaces:[]};
const general={id:'meeting',name:'管理例会',space:'manage',repo:'https://git.example.com/Meeting/repo'};
let projects=[p,q,general],tasks=[],currentUser='tester';
const original=structuredClone(p);
const A={name:'expense-service',repo:p.repo,baseBranch:'main'}, B={name:'expense-web',repo:'https://git.example.com/Team/Web',baseBranch:'develop'};
const a=repositories.buildRepoIdentity(A.repo),b=repositories.buildRepoIdentity(B.repo);
assert.equal(a,'git.example.com/Team/Expense');
assert.notEqual(a,repositories.buildRepoIdentity('https://git.example.com/team/expense'));
assert.equal(repositories.buildRepoResolve(p,'api').repo,'','new workspace must not inherit');
assert.equal(repositories.buildRepoSave(p,'',{repositories:[A,B],defaultRepo:a}),true);
assert.deepEqual(p,original,'Build config must not mutate Manage data');
assert.equal(repositories.buildRepoList(p,'api').repositories.length,0);
assert.equal(repositories.buildRepoList(p,'api').source.id,'api');
assert.equal(repositories.buildRepoResolve(p,'legacy').baseBranch,'release/old','legacy branch override preserved');
assert.equal(repositories.buildRepoResolve(p,'legacy').repo,A.repo);
assert.equal(repositories.buildRepoSave(p,'backend',{repositories:[B],defaultRepo:b}),true);
assert.equal(repositories.buildRepoList(p,'api').repositories.length,0,'sibling changes do not populate another workspace');
assert.equal(repositories.buildRepoSave(p,'backend',{mode:'inherit'}),false);
assert.equal(repositories.buildRepoSave(p,'backend',{repositories:[]}),true);
assert.equal(repositories.buildRepoSave(p,'api',{repositories:[A,B],defaultRepo:b}),true);
assert.equal(repositories.buildRepoResolve(p,'api').key,b,'primary repository drives task fallback');
const source=readFileSync(new URL('../src/scripts/features/collab/local-dev/core.js',import.meta.url),'utf8');
const names=[...source.matchAll(/export (?:function|var) (\w+)/g)].map(m=>m[1]);
const dependencies={...repositories,...tree,...git,tkCurrentUserId:()=>currentUser,tkGetTasks:()=>tasks,tkGetPerson:()=>({name:'测试',account:'tester'}),tkProjectById:id=>projects.find(p=>p.id===id),tkProjectsForCurrentUser:()=>projects,tkScopeProjects:()=>projects,tkVisibleWorkspaces:p=>tree.wsFlatTree(p)};
const core=new Function(...Object.keys(dependencies),source.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')+'\nreturn {'+names.join(',')+'};')(...Object.values(dependencies));
assert.equal(core.ldMyDevProjects().length,2,'all repositories listed, even non-default ones');
assert.equal(core.ldMyDevProjects().find(r=>r.key===a).usages.length,4,'deduplicate repositories across active scopes');
let mine=core.ldMine();mine.auths['git.example.com']={username:'tester',source:'token',scopes:['read_repository','write_repository']};core.ldSaveMine(mine);
const envB=core.ldEnvironmentId(B),path=core.ldDefaultPath({...B,_repoResolved:true});
assert.equal(core.ldBindDir(envB,path,'auto'),true);
assert.equal(Object.keys(core.ldMine().repoBindings).length,1);
const executable={id:'task',code:'T1',project:p.id,workspaceId:'api',repositoryKey:b,status:'backlog',assignee:'tester',executionPlan:[{id:'dev',title:'编码实现',assigneeId:'tester',status:'pending'},{id:'test',title:'测试验证',assigneeId:'tester',status:'pending'}]};
tasks.push(executable);
assert.equal(repositories.buildTaskRepoConfig(executable,p).repo,B.repo,'task selects a non-default repository');
assert.ok(repositories.buildTaskRepoSelectionError({...executable,repositoryKey:''},p));
assert.ok(repositories.buildTaskRepoSelectionError({...executable,repositoryKey:'removed'},p));
const executionSource=readFileSync(new URL('../src/scripts/features/tasks-v2/task-execution.js',import.meta.url),'utf8');
const executionNames=[...executionSource.matchAll(/export function (\w+)/g)].map(m=>m[1]);
capabilities.setCapabilityCatalog(() => [{key:'team:repo-test',kind:'team',version:'1.0.0',data:{id:'repo-test',name:'仓库回归团队',members:[]}}]);
assert.equal(capabilities.capabilitySave(p,'',{mode:'independent',keys:['team:repo-test'],defaultKey:'team:repo-test'}),'');
assert.equal(capabilities.capabilityChange(p,'api','install','team:repo-test'),'');
executable.teamId='repo-test';
const executionDeps={...repositories,...capabilities,...core,tkCurrentUserId:()=>currentUser,tkCurrentStageHandlerId:task=>task.assignee,tkCanViewTask:()=>true,tkProjectById:dependencies.tkProjectById,tkUpdateTask:(id,patch)=>Object.assign(tasks.find(task=>task.id===id),patch)};
const execution=new Function(...Object.keys(executionDeps),executionSource.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')+'\nreturn {'+executionNames.join(',')+'};')(...Object.values(executionDeps));
assert.equal(execution.startTaskStage(executable).ok,true);
assert.equal(executable.repoSnapshot.repoKey,b);
assert.equal(executable.repoSnapshot.baseBranch,'develop');
assert.equal(core.ldTaskDirectory(executable).workingDirectory,core.ldTaskDirectory(executable).taskDirectory);
assert.ok(core.ldCheckDir(envB,path+'-new'),'active task prevents rebinding');
assert.ok(repositories.buildTaskMoveError(executable,p,q,'',b));
assert.ok(repositories.buildTaskMoveError(executable,p,p,'api',a),'started task cannot switch repository');
assert.equal(repositories.buildTaskMoveError({...executable,repoSnapshot:null,status:'backlog',statusHistory:[]},p,q,'',a),'');
const ownSource=readFileSync(new URL('../src/scripts/features/collab/basic-settings-data.js',import.meta.url),'utf8');
const ownNames=[...ownSource.matchAll(/export function (\w+)/g)].map(m=>m[1]);
const ownDeps={...repositories,...core,gitRepoProblem:git.gitRepoProblem,tkGetTasks:()=>tasks,tkUpdateTask:executionDeps.tkUpdateTask,isSpaceManager:()=>true,canManageWs:()=>true};
const basic=new Function(...Object.keys(ownDeps),ownSource.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')+'\nreturn {'+ownNames.join(',')+'};')(...Object.values(ownDeps));
assert.ok(basic.basicSaveRepo(p,null,{repositories:[A,{...A,repo:'https://git.example.com/Team/Expense'}]}),'duplicate normalized repositories rejected');
assert.equal(basic.basicSaveRepo(p,null,{repositories:[A,{...B,baseBranch:'release/2'}],defaultRepo:a}),'');
assert.equal(executable.repoSnapshot.baseBranch,'develop','configuration changes cannot alter running task snapshot');
assert.equal(basic.basicSaveRepo(p,null,{repositories:[A],defaultRepo:a}),'');
assert.equal(repositories.buildRepoSave(p,'api',{repositories:[A],defaultRepo:a}),true);
assert.ok(repositories.buildTaskRepoSelectionError({...executable,repoSnapshot:null,status:'backlog'},p),'removed repository cannot fall back to default');
assert.equal(core.ldProjectStatus(core.ldTaskEnvironmentId(executable)).ready,true,'running task retains repository binding');
assert.equal(core.ldSettingsProjects().find(r=>r.repo===B.repo).unused,false);
executable.status='done';
assert.equal(core.ldSettingsProjects().find(r=>r.repo===B.repo).unused,true);
assert.equal(core.ldForgetRepoBinding(b),'');
assert.equal(core.ldMine().repoBindings[b],undefined);
currentUser='another';assert.equal(core.ldBindingFor(envB),null);
const setItem=localStorage.setItem;localStorage.setItem=()=>{throw new Error('quota')};
assert.equal(repositories.buildRepoSave(p,'',{repositories:[B]}),false);
localStorage.setItem=setItem;assert.equal(repositories.buildRepoList(p,'').repositories.length,1);
console.log('多仓库、工作区独立配置、主仓库、兼容迁移、任务选择与实际启动、快照保护、移动限制、目录复用和保存失败回归通过');

// Render the actual settings states without launching a browser.
const viewSource=readFileSync(new URL('../src/scripts/features/collab/basic-settings.js',import.meta.url),'utf8');
let selectedScope={project:p.id,ws:''};
let canEdit=true, directoryReady=false, openedDirectory;
const handlers={};
const host={innerHTML:'',dataset:{},classList:{toggle(){}},querySelectorAll:()=>[],
  addEventListener(type,handler){ if (type === 'click') handlers.click=handler; }};
const viewDeps={...repositories,...tree,...core,ldBindingFor:()=>null,mgrCurrentPersonId:()=>currentUser,
  basicCanViewManagement:()=>canEdit,basicEditable:()=>canEdit,getSpaceScope:()=>selectedScope,wsProjectById:dependencies.tkProjectById,
  wsScopePath:(p,ws)=>p.name+' / '+(ws?.name || p.name),
  ldProjectStatus:()=>directoryReady ? {ready:true,key:'ready'} : {ready:false,authOk:false,key:'login',label:'未登录'},
  ldOpenSpaceDialog:(...args)=>{openedDirectory=args;},
  $:()=>null,initSelectDropdowns:selects=>assert.equal(selects.includes(null),false)};
const view=new Function(...Object.keys(viewDeps),viewSource.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')+'\nreturn {initBasicSettings,renderBasicSettings,setEditing:index=>{repoEditing=index;},setDraft:value=>{repoDraft=value;}};')(...Object.values(viewDeps));
view.initBasicSettings(host);
view.renderBasicSettings(host,'repo');
assert.ok(host.innerHTML.includes('expense-service'));
assert.ok(host.innerHTML.includes('data-cv-repo-add'));
assert.ok(host.innerHTML.includes('cv-repo-info')&&host.innerHTML.includes('仓库地址')&&host.innerHTML.includes('基准分支')&&host.innerHTML.includes('本机执行目录')&&host.innerHTML.includes('默认目录'),'repository cards show address, branch and working directory facts');
assert.ok(host.innerHTML.includes('基准分支')&&host.innerHTML.includes('cv-repo-icon'),'repository cards show the branch and a repository icon');
assert.ok(host.innerHTML.includes('data-cv-repo-local-dir'),'directory configuration opens from the repository card');
assert.ok(!host.innerHTML.includes('data-cv-repo-field="repo"'),'repository cards start in summary mode');
assert.ok(host.innerHTML.includes('data-cv-repo-edit'));
assert.ok(!host.innerHTML.includes('type="submit"'),'summary view has no outer Save button');
view.setEditing(0);view.renderBasicSettings(host,'repo');
assert.ok(host.innerHTML.includes('role="dialog"'),'edit opens a dialog');
assert.equal((host.innerHTML.match(/cv-repo-editor-actions/g)||[]).length,1,'only the editor has save actions');
assert.equal((host.innerHTML.match(/type="submit"/g)||[]).length,1,'the repository editor only saves shared settings');
assert.ok(!host.innerHTML.includes('data-cv-dir-mode'),'shared editing has no personal directory controls');
assert.ok(host.innerHTML.includes('data-cv-repo-field="repo"'),'repository fields belong to the editor');
view.setEditing(-1);view.renderBasicSettings(host,'repo');
assert.ok(host.innerHTML.includes('主仓库'));
assert.ok(!host.innerHTML.includes('cv-repo-info-banner'));
assert.ok(!host.innerHTML.includes('管理令牌'));
assert.ok(!host.innerHTML.includes('关联应用'));
selectedScope={project:p.id,ws:'api'};
canEdit=false;
view.renderBasicSettings(host,'repo');
assert.doesNotMatch(host.innerHTML, /data-cv-repo-(add|edit|remove|default)/, 'members cannot edit shared repositories');
assert.ok(host.innerHTML.includes('<h2>仓库</h2>') && host.innerHTML.includes('cv-repo-info')
  && host.innerHTML.includes('仓库地址') && host.innerHTML.includes('基准分支') && host.innerHTML.includes('cv-repo-provider'),
  'members see the same repository card details as managers');
view.renderBasicSettings(host,'members');
assert.ok(host.innerHTML.includes('<h2>仓库</h2>') && !host.innerHTML.includes('成员列表'),'members cannot open workspace membership settings directly');
view.renderBasicSettings(host,'agents');
assert.ok(host.innerHTML.includes('<h2>仓库</h2>'),'members cannot open workspace agent settings directly');
assert.match(host.innerHTML,/data-cv-repo-local-dir="[^"]+">初始化<\/button>/,'members can open initialization before signing in to Git');
const currentRepo = repositories.buildRepoList(p,'api').repositories[0];
const target = core.ldEnvironmentId({...currentRepo,spaceId:p.id,workspaceId:'api'});
const legacyPath = '~/repos/custom';
localStorage.setItem('lingee-repo-dir-pref-v1',JSON.stringify({[currentUser+'|'+target]:{mode:'existing',path:legacyPath}}));
const localButton = {dataset:{cvRepoLocalDir:currentRepo.key}};
await handlers.click({target:{closest:selector=>selector === '[data-cv-repo-local-dir]' ? localButton : null}});
assert.deepEqual(openedDirectory,[target,null,'existing',legacyPath],'member action opens the shared directory dialog and restores a previous directory choice');
directoryReady=true;
view.renderBasicSettings(host,'repo');
assert.match(host.innerHTML,/data-cv-repo-local-dir="[^"]+">修改本机目录<\/button>/,'members can reconfigure a ready local directory');
canEdit=true;
view.renderBasicSettings(host,'repo');
assert.ok(!host.innerHTML.includes('继承'));
assert.ok(host.innerHTML.includes('data-cv-repo-add'),'each workspace can add its own repositories');
repositories.buildRepoSave(p,'api',{repositories:[]});view.setDraft(null);view.renderBasicSettings(host,'repo');
assert.ok(!host.innerHTML.includes('暂无仓库'));
assert.ok(!host.innerHTML.includes('0 个仓库'));
assert.ok(host.innerHTML.includes('data-cv-repo-add'),'empty workspace starts with the add card');
assert.ok(!host.innerHTML.includes('data-cv-repo-inherit'));
assert.ok(!host.innerHTML.includes('代码子目录'));
console.log('仓库设置列表、无继承入口、独立空列表与共享下拉空值防护检查通过');

// Same repository, different long-lived directories; choices remain personal and task bindings stay fixed.
currentUser='tester';
repositories.buildRepoSave(p,'api',{repositories:[A],defaultRepo:a});
const scopeConfig={...A,spaceId:p.id,workspaceId:'api'};
const scopeTarget=core.ldEnvironmentId(scopeConfig);
const sharedTarget=core.ldEnvironmentId(A),sharedPath=core.ldDefaultPath({...A,_repoResolved:true});
assert.equal(core.ldBindDir(sharedTarget,sharedPath,'auto'),true);
assert.equal(core.ldBindingKey(scopeTarget),a,'workspaces reuse the default directory initially');
const independentKey='scope:'+core.ldScopeBindingKey({...scopeConfig,repoKey:a});
const independentTarget=core.ldEnvironmentId({...scopeConfig,bindingKey:independentKey});
const independentPath=core.ldDefaultPath(core.ldTargetProject(independentTarget));
assert.notEqual(independentPath,sharedPath);
assert.equal(core.ldBindDir(independentTarget,independentPath,'auto'),true);
assert.equal(core.ldBindingKey(scopeTarget),independentKey);
assert.equal(core.ldProjectStatus(scopeTarget).binding.path,independentPath);
assert.equal(core.ldProjectStatus(q.id).binding.path,sharedPath,'other workspace keeps shared directory');
assert.equal(Object.values(core.ldMine().repoBindings).filter(binding=>binding.repoKey===a).length,2);
const independentTask={teamId:'repo-test',id:'independent-task',code:'T3',project:p.id,workspaceId:'api',repositoryKey:a,status:'backlog',assignee:'tester',executionPlan:[{id:'dev',title:'编码',assigneeId:'tester',status:'pending'}]};
tasks.push(independentTask);
assert.equal(execution.startTaskStage(independentTask).ok,true);
assert.equal(core.ldTaskDirectory(independentTask).bindingKey,independentKey);
assert.equal(core.ldTaskDirectory(independentTask).repositoryDirectory,independentPath);
assert.equal(core.ldCheckDir(sharedTarget,sharedPath+'-new'),'','independent task must not lock unrelated shared copy');
assert.ok(core.ldCheckDir(independentTarget,independentPath+'-new'));
assert.ok(core.ldAssignScopeDirectory(scopeTarget,a),'active scope cannot switch directories');
assert.ok(core.ldCheckDir(core.ldEnvironmentId({...scopeConfig,bindingKey:'another-copy'}),sharedPath+'-third'),'initializing another copy must not bypass scope lock');
assert.ok(core.ldForgetRepoBinding(independentKey));
let personal=core.ldMine();personal.scopeBindings[core.ldScopeBindingKey({...scopeConfig,repoKey:a})]=a;core.ldSaveMine(personal);
assert.equal(core.ldBindingKey(core.ldTaskEnvironmentId(independentTask)),independentKey,'existing task uses pinned directory even if preference changes');
assert.equal(core.ldBindingKey(scopeTarget),a,'new tasks use current scope preference');
assert.ok(core.ldSettingsProjects().find(row=>row.bindingKey===independentKey));
independentTask.status='done';
assert.equal(core.ldAssignScopeDirectory(scopeTarget,independentKey),'');
assert.equal(core.ldActiveEnvironments().some(row=>row.bindingKey===independentKey),true);
assert.equal(core.ldAssignScopeDirectory(scopeTarget,a),'');
assert.equal(core.ldSettingsProjects().find(row=>row.bindingKey===independentKey).unused,true);
assert.equal(core.ldForgetRepoBinding(independentKey),'');
assert.ok(core.ldMine().repoBindings[a],'cleanup removes only selected binding, not shared copy');
currentUser='another-user';assert.equal(core.ldBindingKey(scopeTarget),a);
assert.equal(core.ldBindingFor(scopeTarget),null,'other users do not inherit private directory choices');
console.log('独立目录、默认复用、范围选择、任务目录冻结、按目录加锁与个人隔离回归通过');

// A different folder is selected from the picker and only becomes active after reinitialization.
currentUser='tester';
const spaceFormSource=readFileSync(new URL('../src/scripts/features/collab/local-dev/space-form.js',import.meta.url),'utf8');
let tick, finish;
const formDeps={...core,LD_ICONS:{},ldReadonlyRepoHtml:()=>'',ldInitProgressHtml:()=>'',toast:()=>{},
  ldJobOf:()=>null,ldJobSet:()=>{},ldJobRemove:()=>{},
  setInterval:callback=>{tick=callback;return 1;},clearInterval:()=>{},setTimeout:callback=>{finish=callback;}};
const spaceForm=new Function(...Object.keys(formDeps),spaceFormSource.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')
  +'\nreturn {ldNewSpaceForm,ldSpaceFormHtml,ldSpaceFormClick,ldSpaceFormTarget,ldRunSpaceInit};')(...Object.values(formDeps));
const form=spaceForm.ldNewSpaceForm(scopeTarget);
const originalPath=core.ldBindingFor(scopeTarget).path;
form.mode='existing';
const directoryHtml=spaceForm.ldSpaceFormHtml(form);
assert.match(directoryHtml, /data-ld-form-folder="0"/);
assert.doesNotMatch(directoryHtml, /type="text"/);
const folderButton={dataset:{ldFormFolder:'0'}};
assert.equal(spaceForm.ldSpaceFormClick(form,{closest:selector=>selector === '[data-ld-form-folder]' ? folderButton : null}),true);
const chosenPath=spaceForm.ldSpaceFormTarget(form);
assert.notEqual(chosenPath,originalPath);
assert.ok(core.ldInsideWorkspace(chosenPath));
let completed=false;
assert.equal(spaceForm.ldRunSpaceInit(form,{render:()=>{},done:()=>{completed=true;}}),true);
assert.equal(core.ldBindingFor(scopeTarget).path,originalPath,'selecting or starting initialization must not replace the previous binding');
for (let step=0;step<12;step++) tick();
finish();
assert.equal(completed,true);
assert.equal(core.ldBindingFor(scopeTarget).path,chosenPath);
assert.ok(core.ldBindingFor(scopeTarget).initializedAt);
console.log('自定义目录选择与重新初始化回归通过');

// Legacy custom bindings could point at the same path as the default directory.
assert.equal(core.ldBindDir(scopeTarget,originalPath,'existing'),true);
const dialogSource=readFileSync(new URL('../src/scripts/features/collab/local-dev/space-dialog.js',import.meta.url),'utf8');
const dialogElements=new Map();
const dialogHandlers={};
const dialogDeps={...core,...spaceForm,ldJobOf:()=>null,ldShow:()=>{},
  $:selector=>{
    if (!dialogElements.has(selector)) dialogElements.set(selector,{setAttribute(){},addEventListener(type,handler){dialogHandlers[type]=handler;}});
    return dialogElements.get(selector);
  },
  ldSpaceFormChange:(form,input)=>{form.mode=input.value;return true;}};
const dialog=new Function(...Object.keys(dialogDeps),dialogSource.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')
  +'\nreturn {initSpaceDialog,ldOpenSpaceDialog};')(...Object.values(dialogDeps));
dialog.initSpaceDialog();
dialog.ldOpenSpaceDialog(scopeTarget);
assert.equal(dialogElements.get('#ldSpaceDone').disabled,true,'unchanged custom binding cannot reinitialize');
assert.match(dialogElements.get('#ldSpaceBody').innerHTML,/当前已使用所选目录/);
dialogHandlers.change({target:{value:'auto'}});
assert.equal(dialogElements.get('#ldSpaceDone').disabled,false,'switching a legacy custom binding to default works even at the same path');
