import { CV_MEMBERS, cvPersistPersons } from './data.js';

/* 待接入：宿主提供 search(query) → [{id,name,phone,email}]，服务端按当前租户和权限过滤。 */
var CV_LINGEE_DEMO_USERS=[
  {id:'lingee-demo-101',name:'王晓妹',phone:'13800001001',email:'wang.xiaomei@example.com'},
  {id:'lingee-demo-102',name:'王晓萌',phone:'13800001002',email:'wang.xiaomeng@example.com'},
  {id:'lingee-demo-103',name:'李明',phone:'13800001003',email:'li.ming@example.com'},
  {id:'lingee-demo-104',name:'陈雨',phone:'13800001004',email:'chen.yu@example.com'},
  {id:'lingee-demo-105',name:'赵宁',phone:'13800001005',email:'zhao.ning@example.com'}
];

function cvPeopleSearchIsDemo(){return typeof window.cvSearchLingeePeople!=='function';}
async function cvSearchLingeePeople(query){
  if(!cvPeopleSearchIsDemo()){
    var rows=await window.cvSearchLingeePeople(query);
    return Array.isArray(rows)?rows.filter(function(person){return person&&person.id!=null&&person.name;}).map(function(person){return {id:String(person.id),name:String(person.name),phone:person.phone||'',email:person.email||''};}):[];
  }
  var keyword=query.toLocaleLowerCase();
  return CV_LINGEE_DEMO_USERS.filter(function(person){return [person.name,person.phone,person.email].some(function(value){return value.toLocaleLowerCase().includes(keyword);});});
}
function cvLinkedLingeePerson(id,name){
  return CV_MEMBERS.find(function(row){return row.id===id||row.userId===id||(row.linkedUserIds||[]).includes(id)||(name==='吴宏超'&&row.name===name);})||null;
}
function cvLinkLingeePerson(person){
  if(!person||!person.id||!person.name)return null;
  var linked=cvLinkedLingeePerson(person.id,person.name);if(linked)return linked;
  linked={id:person.id,userId:person.id,name:person.name,phone:person.phone||'',email:person.email||'',workspaceRole:'member',roles:[],status:'available',source:cvPeopleSearchIsDemo()?'灵基用户（演示）':'灵基用户'};
  CV_MEMBERS.push(linked);cvPersistPersons();
  return linked;
}

export { cvLinkLingeePerson, cvLinkedLingeePerson, cvPeopleSearchIsDemo, cvSearchLingeePeople };
