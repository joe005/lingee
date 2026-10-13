import { CV_PROJECTS, CV_WORKSPACES, cvPersistWorkspaces, cvProject, cvProjectById, cvWorkspace, cvWorkspaceById } from './workspace-projects.js';
import { cvPersistProjects } from './project-store.js';
/* 协作数据：人员基础资料（全站主数据，独立维护）、工作区成员、当前登录人（拆自 collab/data.js） */

/* 人员基础资料（全局主数据，独立维护）：项目/团队通过 id（pid）引用，不在人员身上挂项目 */
var CV_MEMBERS = [
  {id:'p01',name:'张工',email:'zhang***@kingdee.com',dept:'研发部',workspaceRole:'system_admin',roles:[{tag:'member-tag--dev',text:'开发'},{tag:'member-tag--arch',text:'架构'}],status:'available',source:'直接成员',isMe:true},
  {id:'p02',name:'李工',email:'li***@kingdee.com',dept:'研发部',roles:[{tag:'member-tag--dev',text:'开发'}],status:'available',source:'直接成员'},
  {id:'p03',name:'王工',email:'wang***@kingdee.com',dept:'研发部',roles:[{tag:'member-tag--dev',text:'开发'},{tag:'member-tag--arch',text:'架构'}],status:'busy',source:'直接成员'},
  {id:'p04',name:'赵琳',email:'zha***@kingdee.com',dept:'产品部',workspaceRole:'project_manager',roles:[{tag:'member-tag--pm',text:'需求'},{tag:'member-tag--pm',text:'产品'}],status:'available',source:'继承自 灵基AIOS'},
  {id:'p05',name:'陈晨',email:'chen***@kingdee.com',dept:'测试部',roles:[{tag:'member-tag--qa',text:'测试'}],status:'available',source:'直接成员'},
  {id:'p06',name:'刘洋',email:'liu***@kingdee.com',dept:'测试部',roles:[{tag:'member-tag--qa',text:'测试'}],status:'busy',source:'直接成员'},
  {id:'p07',name:'周杰',email:'zhou***@kingdee.com',dept:'运维部',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'直接成员'},
  {id:'p08',name:'孙明',email:'sun***@kingdee.com',dept:'运维部',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'继承自 灵基AIOS'},
  {id:'p09',name:'吴芳',email:'wu***@kingdee.com',dept:'产品部',roles:[{tag:'member-tag--pm',text:'需求'}],status:'available',source:'直接成员'},
  {id:'p10',name:'郑凯',email:'zheng***@kingdee.com',dept:'研发部',roles:[{tag:'member-tag--dev',text:'开发'}],status:'busy',source:'直接成员'},
  {id:'p11',name:'钱涛',email:'qian***@kingdee.com',dept:'研发部',roles:[{tag:'member-tag--dev',text:'开发'}],status:'available',source:'直接成员'},
  {id:'p12',name:'宋宇',email:'song***@kingdee.com',dept:'产品部',roles:[{tag:'member-tag--pm',text:'产品'}],status:'available',source:'继承自 灵基AIOS'},
  {id:'p13',name:'冯远',email:'feng***@kingdee.com',dept:'架构部',roles:[{tag:'member-tag--arch',text:'架构'}],status:'available',source:'直接成员'},
  {id:'p14',name:'许诺',email:'xu***@kingdee.com',dept:'研发部',roles:[{tag:'member-tag--dev',text:'开发'},{tag:'member-tag--arch',text:'架构'}],status:'busy',source:'直接成员'},
  {id:'p15',name:'蒋雯',email:'jiang***@kingdee.com',dept:'产品部',roles:[{tag:'member-tag--pm',text:'需求'},{tag:'member-tag--pm',text:'产品'}],status:'available',source:'继承自 灵基AIOS'},
  {id:'p16',name:'何欣',email:'he***@kingdee.com',dept:'产品部',roles:[{tag:'member-tag--pm',text:'需求'}],status:'available',source:'直接成员'},
  {id:'p17',name:'韩梅',email:'han***@kingdee.com',dept:'测试部',roles:[{tag:'member-tag--qa',text:'测试'}],status:'available',source:'直接成员'},
  {id:'p18',name:'罗静',email:'luo***@kingdee.com',dept:'测试部',roles:[{tag:'member-tag--qa',text:'测试'}],status:'busy',source:'直接成员'},
  {id:'p19',name:'杨帆',email:'yang***@kingdee.com',dept:'运维部',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'直接成员'},
  {id:'p20',name:'唐辉',email:'tang***@kingdee.com',dept:'运维部',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'继承自 灵基AIOS'},
  {id:'p21',name:'梁平',email:'liang***@kingdee.com',dept:'产品部',roles:[{tag:'member-tag--pm',text:'产品'},{tag:'member-tag--owner',text:'所有者'}],status:'available',source:'直接成员'},
  {id:'p22',name:'吴宏超',email:'',dept:'产品部',workspaceRole:'system_admin',roles:[],status:'available',source:'演示人员'},
  {id:'p23',name:'吴晓锋',email:'6686612@qq.com',dept:'产品部',workspaceRole:'system_admin',roles:[{tag:'member-tag--pm',text:'产品'},{tag:'member-tag--owner',text:'所有者'}],status:'available',source:'直接成员'},
  {id:'p24',name:'需求',email:'',dept:'产品部',roles:[{tag:'member-tag--pm',text:'需求'}],status:'available',source:'直接成员'},
  {id:'p25',name:'架构',email:'',dept:'架构部',roles:[{tag:'member-tag--arch',text:'架构'}],status:'available',source:'直接成员'},
  {id:'p26',name:'开发',email:'',dept:'研发部',roles:[{tag:'member-tag--dev',text:'开发'}],status:'available',source:'直接成员'},
  {id:'p27',name:'测试',email:'',dept:'测试部',roles:[{tag:'member-tag--qa',text:'测试'}],status:'available',source:'直接成员'},
  {id:'p28',name:'部署',email:'',dept:'运维部',roles:[{tag:'member-tag--ops',text:'部署'}],status:'available',source:'直接成员'},
  /* 团队人员（登录账号=姓名，密码统一 lingee520） */
  {id:'p29',name:'部伟',email:'',dept:'',roles:[],status:'available',source:'直接成员'},
  {id:'p30',name:'张利军',email:'',dept:'',roles:[],status:'available',source:'直接成员'},
  {id:'p31',name:'王育权',email:'',dept:'',roles:[],status:'available',source:'直接成员'},
  {id:'p32',name:'付鹏城',email:'',dept:'',roles:[],status:'available',source:'直接成员'},
  {id:'p33',name:'陈惠琼',email:'',dept:'',roles:[],status:'available',source:'直接成员'},
  {id:'p35',name:'钟伟纯',email:'',dept:'',roles:[],status:'available',source:'直接成员'},
  {id:'p36',name:'刘鉴洲',email:'',dept:'',roles:[],status:'available',source:'直接成员'},
  {id:'p37',name:'陈瑾',email:'',dept:'',roles:[],status:'available',source:'直接成员'},
  {id:'p38',name:'陈来珍',email:'',dept:'',roles:[],status:'available',source:'直接成员'},
  {id:'p39',name:'暴福音',email:'',dept:'',roles:[],status:'available',source:'直接成员'},
  {id:'p40',name:'荆龙刚',email:'',dept:'',roles:[],status:'available',source:'直接成员'},
  {id:'p41',name:'梁平贤',email:'',dept:'',roles:[],status:'available',source:'直接成员'},
  {id:'p42',name:'周建国',email:'',dept:'设备部',roles:[{tag:'member-tag--pm',text:'设备主管'}],status:'available',source:'演示人员'},
  {id:'p43',name:'陈志远',email:'',dept:'设备部',roles:[{tag:'member-tag--dev',text:'维修工程师'}],status:'available',source:'演示人员'},
  {id:'p44',name:'林悦',email:'',dept:'销售部',roles:[{tag:'member-tag--pm',text:'商务主管'}],status:'available',source:'演示人员'}
];
var CV_SEED_PERSONS=[
  {id:'p24',name:'需求',email:'',dept:'产品部',roles:[{tag:'member-tag--pm',text:'需求'}],status:'available',source:'直接成员'},
  {id:'p25',name:'架构',email:'',dept:'架构部',roles:[{tag:'member-tag--arch',text:'架构'}],status:'available',source:'直接成员'},
  {id:'p26',name:'开发',email:'',dept:'研发部',roles:[{tag:'member-tag--dev',text:'开发'}],status:'available',source:'直接成员'},
  {id:'p27',name:'测试',email:'',dept:'测试部',roles:[{tag:'member-tag--qa',text:'测试'}],status:'available',source:'直接成员'},
  {id:'p28',name:'部署',email:'',dept:'运维部',roles:[{tag:'member-tag--ops',text:'部署'}],status:'available',source:'直接成员'}
];
function cvEnsureSeedPersons(){
  var changed=false;
  CV_SEED_PERSONS.forEach(function(seed){
    if(!CV_MEMBERS.some(function(person){return person.id===seed.id;})){
      CV_MEMBERS.push(Object.assign({},seed));
      changed=true;
    }
  });
  if(changed)cvPersistPersons();
}
/* 人员种子：localStorage 恢复目录后，补回当前演示账号与缺失的团队成员（人员记录不由 UI 删除，幂等安全） */
var CV_TEAM_SEED_IDS=['p23','p29','p30','p31','p32','p33','p35','p36','p37','p38','p39','p40','p41','p42','p43'];
var CV_TEAM_SEED_PERSONS=CV_TEAM_SEED_IDS.map(function(id){return CV_MEMBERS.find(function(person){return person.id===id;});}).filter(Boolean);
function cvEnsureTeamPersons(){
  var changed=false;
  CV_TEAM_SEED_PERSONS.forEach(function(seed){
    var existing=CV_MEMBERS.find(function(person){return person.id===seed.id;});
    if(!existing){
      CV_MEMBERS.push(Object.assign({},seed));
      changed=true;
    }else if(existing.name!==seed.name){
      existing.name=seed.name;
      changed=true;
    }
  });
  /* 名字统一与并入：p23「吴晓峰」改为「吴晓锋」；p34（早期误建的重复记录）并入 p23 */
  var p23=CV_MEMBERS.find(function(person){return person.id==='p23';});
  if(p23&&p23.name==='吴晓峰'){p23.name='吴晓锋';changed=true;}
  var stale=CV_MEMBERS.findIndex(function(person){return person.id==='p34';});
  if(stale>-1){CV_MEMBERS.splice(stale,1);changed=true;}
  CV_PROJECTS.forEach(function(project){
    if(project.owner==='吴晓峰'){project.owner='吴晓锋';changed=true;}
    if(Array.isArray(project.members)&&project.members.includes('p34')){
      project.members=project.members.filter(function(id){return id!=='p34';});
      changed=true;
    }
  });
  if(changed){cvPersistPersons();cvPersistProjects();}
}
function cvWorkspaceMembers(workspace){
  if(!workspace)return [];
  if(Array.isArray(workspace.peopleIds))return workspace.peopleIds;
  return Array.from(new Set(CV_PROJECTS.filter(function(project){return project.workspace===workspace.id;})
    .flatMap(function(project){return project.members||[];})));
}
function cvPeopleInWorkspace(){
  if(!cvWorkspace) return CV_MEMBERS.slice();
  var workspace=cvWorkspaceById(cvWorkspace);
  var ids=cvWorkspaceMembers(workspace);
  return CV_MEMBERS.filter(function(person){return ids.includes(person.id);});
}
function cvWorkspaceRole(person){
  var workspace=cvWorkspaceById(cvWorkspace);
  return workspace?.roles?.[person?.id]||person?.workspaceRole||'member';
}
function cvCanAccessWorkspace(id,name){
  var workspace=cvWorkspaceById(id);
  if(!workspace||!name)return false;
  if(workspace.creatorName===name)return true;
  var person=CV_MEMBERS.find(function(row){return row.name===name;});
  return !!person&&cvWorkspaceMembers(workspace).includes(person.id);
}
function cvAddPersonToWorkspace(person,role){
  var workspace=cvWorkspaceById(cvWorkspace);
  if(!workspace||!person?.id)return false;
  var previous=workspace.peopleIds;
  var previousRoles=workspace.roles;
  var ids=cvWorkspaceMembers(workspace);
  workspace.peopleIds=Array.from(new Set(ids.concat(person.id)));
  workspace.roles={...(workspace.roles||{})};
  if(role)workspace.roles[person.id]=role;
  if(cvPersistWorkspaces())return true;
  workspace.peopleIds=previous;
  workspace.roles=previousRoles;
  return false;
}
function cvCreateWorkspace(name,desc,creator){
  if(!name||!creator?.id)return null;
  var workspace={id:'ws-'+Date.now(),name:name,desc:desc||'',creatorName:creator.name,peopleIds:[creator.id],roles:{[creator.id]:'system_admin'}};
  CV_WORKSPACES.push(workspace);
  if(cvPersistWorkspaces())return workspace;
  CV_WORKSPACES.pop();
  return null;
}
function cvGenProjectCode(project){
  var match=String(project?.repo||'').match(/\/([^/]+?)(?:\.git)?\/?$/);
  return (match?match[1]:String(project?.id||'PROJECT')).replace(/[^a-zA-Z0-9-]/g,'-').toUpperCase();
}

/* ---------- 人员基础资料：引用与查询 ---------- */
function cvPersonById(id){
  if(!id)return null;
  for(var i=0;i<CV_MEMBERS.length;i++){ if(CV_MEMBERS[i].id===id||CV_MEMBERS[i].userId===id||(CV_MEMBERS[i].linkedUserIds||[]).includes(id)) return CV_MEMBERS[i]; }
  return null;
}
function cvPersonName(id){ var p=cvPersonById(id); return p?p.name:'已移除'; }
/* 当前登录用户姓名（演示数据按登录账号挂钩，不再写死某个人） */
function cvCurrentUserName(){
  try{ var n=(document.getElementById('userName')||{}).textContent||''; return n.trim(); }catch(e){ return ''; }
}
function cvIsMe(p){ return !!(p && p.name && p.name===cvCurrentUserName()); }
/* 当前项目（或「全部项目」）引用的协作人员，人员管理跟着项目走 */
function cvProjectPersons(){
  if(!cvProject) return CV_MEMBERS.slice();
  var proj=cvProjectById(cvProject);
  var ids=proj?(proj.members||[]):[];
  return CV_MEMBERS.filter(function(m){ return ids.indexOf(m.id)>=0; });
}
function cvPeopleInProject(project){
  var ids=project&&Array.isArray(project.members)?project.members:[];
  return CV_MEMBERS.filter(function(person){return ids.includes(person.id);});
}
var CV_PERSON_STORE_KEY='lingee-collab-persons-v1';
function cvPersistPersons(){
  try{ localStorage.setItem(CV_PERSON_STORE_KEY,JSON.stringify(CV_MEMBERS)); return true; }catch(e){return false;}
}
function cvRestorePersons(){
  try{
    var raw=localStorage.getItem(CV_PERSON_STORE_KEY); if(!raw) return;
    var arr=JSON.parse(raw);
    if(Array.isArray(arr)&&arr.length){ CV_MEMBERS.length=0; arr.forEach(function(m){if(!m.workspaceRole&&m.id==='p01')m.workspaceRole='system_admin';if(!m.workspaceRole&&m.id==='p04')m.workspaceRole='project_manager';CV_MEMBERS.push(m);}); }
    cvMergeDuplicateCurrentUser();
  }catch(e){}
}
/* 旧版演示数据曾按不同登录标识重复加入同一账号，统一回 p22 并保留外部 ID 映射。 */
function cvMergeDuplicateCurrentUser(){
  var matches=CV_MEMBERS.filter(function(person){return person.name==='吴宏超';});
  if(!matches.length)return;
  var primary=matches.find(function(person){return person.id==='p22';})||matches[0];
  if(matches.length===1&&primary.id==='p22')return;
  var oldIds=matches.map(function(person){return person.id;});
  var aliases=new Set();
  matches.forEach(function(person){
    [person.id,person.userId].concat(person.linkedUserIds||[]).filter(Boolean).forEach(function(id){aliases.add(id);});
    if(!primary.phone&&person.phone)primary.phone=person.phone;
    if(!primary.email&&person.email)primary.email=person.email;
  });
  var linked=matches.find(function(person){return person.email==='wuhc2023@gmail.com'&&person.userId;})||matches.find(function(person){return person.userId;});
  if(!primary.userId&&linked)primary.userId=linked.userId;
  primary.id='p22';
  primary.workspaceRole='system_admin';
  primary.linkedUserIds=Array.from(aliases).filter(function(id){return id!=='p22'&&id!==primary.userId;});
  CV_MEMBERS.splice(0,CV_MEMBERS.length,...CV_MEMBERS.filter(function(person){return person===primary||person.name!=='吴宏超';}));
  var projectsChanged=false;
  CV_PROJECTS.forEach(function(project){
    var ids=project.members||[];
    var next=Array.from(new Set(ids.map(function(id){return oldIds.includes(id)?'p22':id;})));
    if(next.length!==ids.length||next.some(function(id,index){return id!==ids[index];})){project.members=next;projectsChanged=true;}
  });
  cvPersistPersons();
  if(projectsChanged)cvPersistProjects();
}

export { CV_MEMBERS, CV_TEAM_SEED_PERSONS, cvAddPersonToWorkspace, cvCanAccessWorkspace, cvCreateWorkspace, cvCurrentUserName, cvEnsureSeedPersons, cvEnsureTeamPersons, cvGenProjectCode, cvIsMe, cvPeopleInProject, cvPeopleInWorkspace, cvPersistPersons, cvPersonById, cvPersonName, cvProjectPersons, cvRestorePersons, cvWorkspaceRole };
