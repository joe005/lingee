import { CV_ACTIVE_WORKSPACE_KEY, CV_DELETED_WORKSPACE_KEY, CV_PROJECTS, CV_ROLE_DEMO_PROJECTS, CV_SEED_PROJECT_SNAPSHOT, CV_WORKSPACES, CV_WORKSPACE_STORE_KEY, cvConfigOverride, cvDeletedWorkspaceIds, cvProject, cvRestoreWorkspaces, cvWorkspace, cvWorkspaceById, set_cvProject, set_cvWorkspace } from './workspace-projects.js';
import { CV_TASKS } from './legacy-demo.js';
import { CV_MEMBERS, CV_TEAM_SEED_PERSONS, cvGenProjectCode, cvPersistPersons } from './people.js';
/* 协作数据：项目持久化、删除、演示数据补齐与清理（拆自 collab/data.js） */

/* 项目增改落 localStorage，刷新页面不丢（持久化与数据同源，放这里避免模块循环依赖） */
var CV_PROJ_STORE_KEY='lingee-collab-projects-v2';
var CV_DELETED_PROJECTS_KEY='lingee-collab-deleted-projects-v1';
function cvDeletedProjectIds(){
  try{var ids=JSON.parse(localStorage.getItem(CV_DELETED_PROJECTS_KEY)||'[]');return Array.isArray(ids)?ids.filter(function(id){return typeof id==='string';}):[];}catch(e){return [];}
}
function cvDeleteProjectRecord(id){
  var index=CV_PROJECTS.findIndex(function(project){return project.id===id;});
  if(index<0)return false;
  var previousProjects=localStorage.getItem(CV_PROJ_STORE_KEY);
  var previousDeleted=localStorage.getItem(CV_DELETED_PROJECTS_KEY);
  var nextProjects=CV_PROJECTS.filter(function(project){return project.id!==id;});
  var nextDeleted=Array.from(new Set(cvDeletedProjectIds().concat(id)));
  try{
    localStorage.setItem(CV_DELETED_PROJECTS_KEY,JSON.stringify(nextDeleted));
    localStorage.setItem(CV_PROJ_STORE_KEY,JSON.stringify(nextProjects));
  }catch(e){
    try{if(previousDeleted===null)localStorage.removeItem(CV_DELETED_PROJECTS_KEY);else localStorage.setItem(CV_DELETED_PROJECTS_KEY,previousDeleted);}catch(_){}
    try{if(previousProjects===null)localStorage.removeItem(CV_PROJ_STORE_KEY);else localStorage.setItem(CV_PROJ_STORE_KEY,previousProjects);}catch(_){}
    return false;
  }
  CV_PROJECTS.splice(index,1);
  return true;
}
function cvPersistProjects(){
  try{ localStorage.setItem(CV_PROJ_STORE_KEY,JSON.stringify(CV_PROJECTS)); return true; }catch(e){return false;}
}
function cvRestoreProjects(){
  cvRestoreWorkspaces();
  try{
    var raw=localStorage.getItem(CV_PROJ_STORE_KEY);
    var arr=raw?JSON.parse(raw):CV_PROJECTS.slice();
    if(Array.isArray(arr)){var deleted=new Set(cvDeletedProjectIds());CV_PROJECTS.length=0;arr.forEach(function(p){if(deleted.has(p.id))return;if(!p.code)p.code=cvGenProjectCode(p);CV_PROJECTS.push(p);}); }
  }catch(e){}
}
/* 旧缓存覆盖源码预置数组时，只增补一次新样例，不覆盖已编辑项目，也不反复复活已删除样例。 */
function cvEnsureWorkspaceDemoProjects(){
  var key='lingee-collab-workspace-demos-v2';
  try{if(localStorage.getItem(key))return;}catch(e){}
  var changed=false;
  CV_WORKSPACE_DEMO_PROJECTS.forEach(function(sample){
    if(cvDeletedProjectIds().includes(sample.id))return;
    if(!cvWorkspaceById(sample.workspace))return;
    if(CV_PROJECTS.some(function(project){return project.id===sample.id;}))return;
    CV_PROJECTS.push({...sample,members:sample.members.slice()});
    changed=true;
  });
  if(changed&&!cvPersistProjects())return;
  try{localStorage.setItem(key,'1');}catch(e){}
}
/* 本地原型没有服务端事务：先计算并写入所有快照，失败时回滚；内存最后才更新。 */
function cvDeleteWorkspaceData(id){
  var workspace=cvWorkspaceById(id);
  if(!workspace||id!==cvWorkspace)return {ok:false};
  var projectIds=CV_PROJECTS.filter(function(project){return project.workspace===id;}).map(function(project){return project.id;});
  var removed=new Set(projectIds);
  var nextWorkspaces=CV_WORKSPACES.filter(function(row){return row.id!==id;});
  var nextProjects=CV_PROJECTS.filter(function(row){return row.workspace!==id;});
  var nextTasks=CV_TASKS.filter(function(row){return !removed.has(row.project);});
  var keys=[CV_DELETED_WORKSPACE_KEY,CV_WORKSPACE_STORE_KEY,CV_PROJ_STORE_KEY,CV_ACTIVE_WORKSPACE_KEY,'lingee_task_board_v1','build_tasks','lingee-collab-integrations-v1','lingee-collab-config-audit-v1'];
  var previous={};
  try{
    keys.forEach(function(key){previous[key]=localStorage.getItem(key);});
    var readRows=function(key){var value=JSON.parse(previous[key]||'[]');if(!Array.isArray(value))throw new Error('Invalid '+key);return value;};
    var changes={};
    changes[CV_DELETED_WORKSPACE_KEY]=JSON.stringify(Array.from(new Set(cvDeletedWorkspaceIds().concat(id))));
    changes[CV_WORKSPACE_STORE_KEY]=JSON.stringify(nextWorkspaces);
    changes[CV_PROJ_STORE_KEY]=JSON.stringify(nextProjects);
    changes[CV_ACTIVE_WORKSPACE_KEY]='';
    changes['lingee_task_board_v1']=JSON.stringify(readRows('lingee_task_board_v1').filter(function(row){return !removed.has(row.project);}));
    changes['build_tasks']=JSON.stringify(readRows('build_tasks').filter(function(row){return !removed.has(row.project);}));
    changes['lingee-collab-integrations-v1']=JSON.stringify(readRows('lingee-collab-integrations-v1').filter(function(row){return (row.workspace||'ws-build')!==id;}));
    changes['lingee-collab-config-audit-v1']=JSON.stringify(readRows('lingee-collab-config-audit-v1').filter(function(row){return (row.workspace||'ws-build')!==id;}));
    var written=[];
    try{keys.forEach(function(key){localStorage.setItem(key,changes[key]);written.push(key);});}
    catch(error){written.reverse().forEach(function(key){try{if(previous[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,previous[key]);}catch(e){}});throw error;}
  }catch(e){return {ok:false};}
  CV_WORKSPACES.splice(0,CV_WORKSPACES.length,...nextWorkspaces);
  CV_PROJECTS.splice(0,CV_PROJECTS.length,...nextProjects);
  CV_TASKS.splice(0,CV_TASKS.length,...nextTasks);
  projectIds.forEach(function(projectId){delete cvConfigOverride[projectId];});
  set_cvProject('');set_cvWorkspace('');
  return {ok:true,projectIds:projectIds};
}
/* 预置数据由源码加载；已删除的工作区不应在下次打开时重新生成任务。 */
function cvPruneDeletedWorkspaceData(){
  var deleted=new Set(cvDeletedWorkspaceIds());
  var seedIds=new Set(CV_SEED_PROJECT_SNAPSHOT.map(function(p){return p.id;}));
  for(var i=CV_PROJECTS.length-1;i>=0;i--){
    if(deleted.has(CV_PROJECTS[i].workspace)&&!seedIds.has(CV_PROJECTS[i].id))CV_PROJECTS.splice(i,1);
  }
  var valid=new Set(CV_PROJECTS.map(function(project){return project.id;}));
  for(var j=CV_TASKS.length-1;j>=0;j--)if(!valid.has(CV_TASKS[j].project))CV_TASKS.splice(j,1);
}
function cvEnsureProjectRoleDemoData(){
  var key='lingee-collab-project-role-demos-v1';
  try{if(localStorage.getItem(key))return;}catch(e){}
  var person=CV_MEMBERS.find(function(row){return row.name==='吴宏超';});
  if(!person){
    var personId='p22';
    if(CV_MEMBERS.some(function(row){return row.id===personId;}))personId='p-demo-wuhc';
    person={id:personId,name:'吴宏超',email:'',dept:'产品部',workspaceRole:'system_admin',roles:[],status:'available',source:'演示人员'};
    CV_MEMBERS.push(person);cvPersistPersons();
  }
  var changed=false;
  CV_ROLE_DEMO_PROJECTS.forEach(function(sample){
    if(cvDeletedProjectIds().includes(sample.id))return;
    if(!cvWorkspaceById(sample.workspace))return;
    var existing=CV_PROJECTS.find(function(project){return project.id===sample.id;});
    if(existing){
      if(person.id!=='p22'&&Array.isArray(existing.members)&&existing.members.includes('p22')){
        existing.members=existing.members.map(function(id){return id==='p22'?person.id:id;});
        changed=true;
      }
      return;
    }
    CV_PROJECTS.push({...sample,members:sample.members.map(function(id){return id==='p22'?person.id:id;})});
    changed=true;
  });
  if(changed)cvPersistProjects();
  try{localStorage.setItem(key,'1');}catch(e){}
}
/* 对已保存的演示项目执行一次成员补齐；之后由项目成员管理正常维护。 */
function cvEnsureCurrentUserProjectDemoData(){
  var key='lingee-collab-current-user-projects-v1';
  try{if(localStorage.getItem(key))return;}catch(e){}
  var person=CV_MEMBERS.find(function(row){return row.id==='p22'&&row.name==='吴宏超';});
  if(!person)return;
  var changed=false;
  CV_PROJECTS.forEach(function(project){
    if(!Array.isArray(project.members))project.members=[];
    if(!project.members.includes(person.id)){project.members.push(person.id);changed=true;}
  });
  var ownedCount=CV_PROJECTS.filter(function(project){return project.owner===person.name;}).length;
  ['expense','demo-contract'].forEach(function(id){
    if(ownedCount>=2)return;
    var project=CV_PROJECTS.find(function(row){return row.id===id;});
    if(project&&project.owner!==person.name){project.owner=person.name;ownedCount++;changed=true;}
  });
  if(changed)cvPersistProjects();
  try{localStorage.setItem(key,'1');}catch(e){}
}

/* 一次性补齐：把团队人员加入 Lingee Build 项目成员，姓名账号登录后可见该项目；之后由项目成员管理正常维护 */
function cvEnsureTeamProjectMembers(){
  var key='lingee-collab-team-project-members-v1';
  try{if(localStorage.getItem(key))return;}catch(e){}
  var changed=false;
  var project=CV_PROJECTS.find(function(row){return row.id==='lingee-prototype';});
  if(project){
    if(!Array.isArray(project.members))project.members=[];
    CV_TEAM_SEED_PERSONS.filter(function(seed){return seed.id!=='p30';}).forEach(function(seed){
      if(!project.members.includes(seed.id)){project.members.push(seed.id);changed=true;}
    });
    if(changed)cvPersistProjects();
  }
  try{localStorage.setItem(key,'1');}catch(e){}
}
/* 旧演示种子曾自动给张利军授予 Lingee Build 成员资格；撤销该默认授权一次。 */
function cvRemoveZhangAutoProjectMember(){
  var key='lingee-collab-zhang-project-access-v1';
  try{if(localStorage.getItem(key))return;}catch(e){}
  var project=CV_PROJECTS.find(function(row){return row.id==='lingee-prototype';});
  if(project&&Array.isArray(project.members)&&project.members.includes('p30')){
    project.members=project.members.filter(function(id){return id!=='p30';});
    if(!cvPersistProjects())return;
  }
  try{localStorage.setItem(key,'1');}catch(e){}
}

/* 一次性清理：Lingee Build 项目任务数据已整体去除，同步清掉本地保存的任务与看板快照。 */
function cvRemoveLingeePrototypeTasks(){
  var key='lingee-collab-remove-lingee-tasks-v1';
  try{if(localStorage.getItem(key))return;}catch(e){}
  ['lingee_task_board_v1','build_tasks'].forEach(function(storeKey){
    try{
      var rows=JSON.parse(localStorage.getItem(storeKey)||'null');
      if(!Array.isArray(rows))return;
      var next=rows.filter(function(row){return row&&row.project!=='lingee-prototype';});
      if(next.length!==rows.length)localStorage.setItem(storeKey,JSON.stringify(next));
    }catch(e){ /* 快照损坏时跳过该键 */ }
  });
  try{localStorage.setItem(key,'1');}catch(e){}
}

export { cvDeleteProjectRecord, cvDeleteWorkspaceData, cvDeletedProjectIds, cvEnsureCurrentUserProjectDemoData, cvEnsureProjectRoleDemoData, cvEnsureTeamProjectMembers, cvEnsureWorkspaceDemoProjects, cvPersistProjects, cvPruneDeletedWorkspaceData, cvRemoveLingeePrototypeTasks, cvRemoveZhangAutoProjectMember, cvRestoreProjects };
