/* 历史交付团队只用于把旧项目数据迁移到项目成员，不再提供团队管理入口。 */
import { CV_PROJECTS, cvPersistProjects, cvPersonById } from './data.js';
var CV_SQUADS=[
   {id:'sq-crm',name:'CRM系统开发团队',desc:'负责 CRM 系统需求开发与交付',creator:'吴宏超',created:'23 小时前',updated:'23 小时前',archived:false,
    members:[
      {kind:'person',pid:'p01',role:'leader',sub:'leader'},
      {kind:'person',pid:'p04',role:'member',sub:'添加角色...'},
      {kind:'person',pid:'p05',role:'member',sub:'添加角色...'}
    ]},
   {id:'sq-zx',name:'振兴开发团队',desc:'负责需求开发',creator:'吴宏超',created:'2 天前',updated:'1 天前',archived:false,
    members:[
      {kind:'person',pid:'p03',role:'leader',sub:'leader'},
      {kind:'person',pid:'p02',role:'member',sub:'添加角色...'},
      {kind:'person',pid:'p07',role:'member',sub:'添加角色...'}
    ]}
];

const CV_SQUAD_STORE_KEY='lingee-collab-squads-v1';
function cvRestoreSquads(){
  try{
    var raw=localStorage.getItem(CV_SQUAD_STORE_KEY);if(!raw)return;
    var saved=JSON.parse(raw);
    if(Array.isArray(saved.squads)){
      CV_SQUADS.length=0;
      saved.squads.forEach(function(s){CV_SQUADS.push(s);});
    }
  }catch(e){}
}
function cvMigrateProjectSquads(){
  var changed=false;
  CV_PROJECTS.forEach(function(project){
    var squad=CV_SQUADS.find(function(item){return item.id===project.squadId;});
    var existing=Array.isArray(project.members)?project.members:[];
    var legacy=squad&&Array.isArray(squad.members)?squad.members.map(function(m){return m.pid;}):[];
    var combined=existing.concat(legacy);
    var members=combined.filter(function(id,index){return !!cvPersonById(id)&&combined.indexOf(id)===index;});
    if(!Array.isArray(project.members)||members.length!==existing.length||members.some(function(id,index){return id!==existing[index];})){
      project.members=members;changed=true;
    }
    if(project.squadId){delete project.squadId;changed=true;}
  });
  if(changed)cvPersistProjects();
}
export { cvMigrateProjectSquads, cvRestoreSquads };
