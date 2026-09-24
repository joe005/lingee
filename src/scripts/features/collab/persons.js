import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { CV_MEMBERS, CV_PROJECTS, CV_TASKS, cvIsMe, cvPersistPersons, cvPersistProjects, cvPersonById } from './data.js';
import { cvRenderProjectDetail, cvRenderProjectList } from './project-view.js';
import { xesc } from '../expert/data.js';
/* 设置：人员资料与人员管理。 */

var cvPersonEditId='';      /* 人员编辑弹窗：正在编辑的人员 id，空 = 新增 */
var cvImportPreview=[];
var PS_COLORS=['#7c5cfc','#4d89ff','#08a040','#ff8d42','#e04a3a','#c06010','#08cc50','#5b8def'];
function cvPsNum(pid){ return parseInt(String(pid).replace(/\D/g,''))||0; }
function cvPsColor(pid){ return PS_COLORS[cvPsNum(pid)%PS_COLORS.length]; }
function cvPersonAvHtml(p,cls){
  var color=cvIsMe(p)?'#08a040':cvPsColor(p.id);
  return '<span class="'+cls+'" style="background:'+color+'">'+xesc(p.name[0]||'?')+'</span>';
}

/* ---------- 人员基础资料：新增 / 编辑 ---------- */
function cvSetPField(k,val){ var e=$('#cv-ps-'+k); if(e) e.value=val||''; }
function cvOpenPersonNew(){
  cvPersonEditId='';
  cvSetPField('name','');cvSetPField('email','');cvSetPField('phone','');cvSetPField('dept','');
  var ov=$('#cv-personedit-overlay'); if(ov) ov.style.display='flex';
  var tt=$('#cv-pedit-title'); if(tt) tt.textContent='新增人员';
}
function cvOpenPersonEdit(pid){
  var p=cvPersonById(pid); if(!p) return;
  cvPersonEditId=pid;
  cvSetPField('name',p.name);cvSetPField('email',p.email);cvSetPField('phone',p.phone);cvSetPField('dept',p.dept||'');
  var ov=$('#cv-personedit-overlay'); if(ov) ov.style.display='flex';
  var tt=$('#cv-pedit-title'); if(tt) tt.textContent='编辑人员';
}
function cvClosePersonEdit(){ var ov=$('#cv-personedit-overlay'); if(ov) ov.style.display='none'; }
function cvSavePersonEdit(){
  var g=function(k){ var e=$('#cv-ps-'+k); return e?e.value.trim():''; };
  var name=g('name');
  if(!name){ toast('请填写姓名','error'); return; }
  var isNew=!cvPersonEditId;
  if(isNew){
    var pid='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    CV_MEMBERS.push({id:pid,name:name,email:g('email'),phone:g('phone'),dept:g('dept'),workspaceRole:'member',roles:[],status:'available',source:'直接添加'});
  }else{
    var p=cvPersonById(cvPersonEditId); if(!p) return;
    p.name=name;p.email=g('email');p.phone=g('phone');p.dept=g('dept');
  }
  cvPersistPersons();
  cvClosePersonEdit();
  cvRenderProjectDetail(); cvRenderPermTable();
  toast(isNew?'已新增人员：'+name:'已保存人员：'+name);
}

function cvDeletePerson(pid){
  var p=cvPersonById(pid); if(!p) return;
  if(cvIsMe(p)){ toast('不能删除自己','warning'); return; }
  if(p.workspaceRole==='system_admin'&&CV_MEMBERS.filter(function(row){return row.workspaceRole==='system_admin';}).length<=1){toast('需保留至少一名系统管理员','warning');return;}
  if(CV_PROJECTS.some(function(project){return project.owner===p.name;})){toast('该人员仍是项目负责人，请先移交项目','warning');return;}
  if(CV_TASKS.some(function(task){return task.kind!=='epic'&&!['已完成','已取消'].includes(task.status)&&(task.assignee===p.name||(task.stagePlan||[]).some(function(stage){return stage.assignee===p.name;}));})){toast('该人员有待处理任务，请先完成或转交','warning');return;}
  if(CV_PROJECTS.some(function(project){return (project.members||[]).length===1&&project.members[0]===pid;})){
    toast('该人员是某项目的唯一成员，请先为项目添加其他成员','warning');return;
  }
  if(!window.confirm('确定从工作区移除「'+p.name+'」吗？'))return;
  CV_PROJECTS.forEach(function(pr){ pr.members=(pr.members||[]).filter(function(id){return id!==pid;}); });
  CV_MEMBERS.splice(CV_MEMBERS.indexOf(p),1);
  cvPersistPersons(); cvPersistProjects();
  cvRenderProjectDetail(); cvRenderProjectList(); cvRenderPermTable();
  toast('已删除人员：'+p.name,'info');
}

function cvSetWorkspaceRole(pid,role){
  var person=cvPersonById(pid);
  if(!person||!['member','project_manager','system_admin'].includes(role))return;
  if(person.workspaceRole==='system_admin'&&role!=='system_admin'&&CV_MEMBERS.filter(function(row){return row.workspaceRole==='system_admin';}).length<=1){toast('需保留至少一名系统管理员','warning');cvRenderPermTable();return;}
  person.workspaceRole=role;
  cvPersistPersons();cvRenderPermTable();
  toast('已设置 '+person.name+' 的工作区角色');
}

function cvParseCsv(content){
  var rows=[],row=[],cell='',quoted=false;
  content=String(content||'').replace(/^\uFEFF/,'');
  for(var i=0;i<content.length;i++){
    var ch=content[i];
    if(quoted){if(ch==='"'&&content[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}
    else if(ch==='"')quoted=true;
    else if(ch===','){row.push(cell);cell='';}
    else if(ch==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}
    else cell+=ch;
  }
  if(quoted)throw new Error('CSV 引号未闭合');
  if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}
  return rows.filter(function(items){return items.some(function(value){return value.trim();});});
}
function cvPrepareImport(content){
  var rows=cvParseCsv(content);if(rows.length<2)throw new Error('文件没有人员记录');
  var headers=rows.shift().map(function(value){return value.trim().toLowerCase();});
  var column=function(names){return headers.findIndex(function(value){return names.includes(value);});};
  var indexes={name:column(['姓名','name']),email:column(['邮箱','email']),phone:column(['手机号','手机','phone']),dept:column(['部门','department']),externalId:column(['外部人员id','人员id','externalid'])};
  if(indexes.name<0||(indexes.email<0&&indexes.phone<0))throw new Error('表头需包含姓名，以及邮箱或手机号');
  var seen=new Set();
  return rows.map(function(cells,line){
    var read=function(key){return indexes[key]<0?'':String(cells[indexes[key]]||'').trim();};
    var record={name:read('name'),email:read('email').toLowerCase(),phone:read('phone'),dept:read('dept'),externalId:read('externalId')};
    var key=record.externalId?'id:'+record.externalId:record.email?'email:'+record.email:'phone:'+record.phone;
    if(!record.name||(!record.email&&!record.phone))return {record,status:'跳过',reason:'缺少姓名或联系方式',line:line+2};
    if(seen.has(key))return {record,status:'冲突',reason:'文件内重复',line:line+2};
    seen.add(key);
    var match=CV_MEMBERS.find(function(person){return record.externalId&&person.externalId===record.externalId;})
      ||CV_MEMBERS.find(function(person){return record.email&&person.email?.toLowerCase()===record.email;})
      ||CV_MEMBERS.find(function(person){return record.phone&&person.phone===record.phone;});
    if(!match&&CV_MEMBERS.some(function(person){return person.name===record.name;}))return {record,status:'冲突',reason:'同名人员需人工核对',line:line+2};
    return {record,match,status:match?'更新':'新增',line:line+2};
  });
}
function cvRenderImportPreview(){
  var panel=$('#cv-perm-import-preview');if(!panel)return;
  if(!cvImportPreview.length){panel.classList.add('hidden');panel.innerHTML='';return;}
  var count=function(status){return cvImportPreview.filter(function(row){return row.status===status;}).length;};
  panel.classList.remove('hidden');
  panel.innerHTML='<strong>导入预览</strong><p>新增 '+count('新增')+' · 更新 '+count('更新')+' · 冲突 '+count('冲突')+' · 跳过 '+count('跳过')+'</p>'
    +'<ul>'+cvImportPreview.slice(0,10).map(function(row){return '<li>第 '+row.line+' 行 · '+xesc(row.record.name||'未填写姓名')+' · '+row.status+(row.reason?'（'+xesc(row.reason)+'）':'')+'</li>';}).join('')+'</ul>'
    +'<div class="cv-perm-import-actions"><button type="button" data-perm-import-confirm'+(count('新增')+count('更新')?'':' disabled')+'>确认导入</button><button type="button" data-perm-import-cancel>取消</button></div>';
}
function cvConfirmImport(){
  var added=0,updated=0;
  cvImportPreview.forEach(function(row){
    if(row.status==='新增'){
      CV_MEMBERS.push({id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),...row.record,workspaceRole:'member',roles:[],status:'available',source:'文件导入'});added++;
    }else if(row.status==='更新'&&row.match){
      Object.assign(row.match,{name:row.record.name,email:row.record.email||row.match.email,phone:row.record.phone||row.match.phone,dept:row.record.dept||row.match.dept,externalId:row.record.externalId||row.match.externalId});updated++;
    }
  });
  cvPersistPersons();cvImportPreview=[];cvRenderImportPreview();cvRenderPermTable();cvRenderProjectList();cvRenderProjectDetail();
  toast('已导入：新增 '+added+' 人，更新 '+updated+' 人');
}

/* ---------- 人员管理：支持新增 / 修改 / 删除 ---------- */
function cvRenderPermTable(){
  var el=$('#cv-perm-table'); if(!el) return;
  var cnt=$('#cv-perm-count'); if(cnt) cnt.textContent=CV_MEMBERS.length;
  el.innerHTML='<div class="cfg-table">'
    +'<div class="cfg-table-head cv-perm-head"><span>人员</span><span>部门</span><span>来源</span><span>工作区角色</span><span>操作</span></div>'
    +CV_MEMBERS.map(function(p){
      return '<div class="cfg-table-row cv-perm-row">'
        +'<span class="cfg-t-name">'+cvPersonAvHtml(p,'ps-av')+'<span class="cv-proj-desc-wrap"><b>'+xesc(p.name)+(cvIsMe(p)?'<span class="ps-me">我</span>':'')+'</b><em class="cv-proj-desc">'+xesc(p.email||p.phone||'')+'</em></span></span>'
        +'<span class="cv-perm-meta">'+xesc(p.dept||'未设置')+'</span><span class="cv-perm-meta">'+xesc(p.source||'直接添加')+'</span>'
        +'<span><select class="cv-perm-role" data-ps-workspace-role="'+xesc(p.id)+'" aria-label="'+xesc(p.name)+'的工作区角色">'+[['member','成员'],['project_manager','项目经理'],['system_admin','系统管理员']].map(function(option){return '<option value="'+option[0]+'"'+((p.workspaceRole||'member')===option[0]?' selected':'')+'>'+option[1]+'</option>';}).join('')+'</select></span>'
        +'<span class="cv-perm-acts"><button type="button" class="act-btn" data-ps-edit="'+p.id+'">修改</button>'
        +(cvIsMe(p)?'':'<button type="button" class="act-btn act-btn--danger" data-ps-del="'+p.id+'">删除</button>')+'</span>'
        +'</div>';
    }).join('')
    +'</div>';
}

export function initCollabPersons(){
  var importTrigger=$('#cv-perm-import-trigger'),importFile=$('#cv-perm-import-file'),preview=$('#cv-perm-import-preview');
  if(importTrigger&&importFile)importTrigger.addEventListener('click',function(){importFile.click();});
  if(importFile)importFile.addEventListener('change',async function(){
    var file=importFile.files&&importFile.files[0];if(!file)return;
    try{cvImportPreview=cvPrepareImport(await file.text());cvRenderImportPreview();}
    catch(error){cvImportPreview=[];cvRenderImportPreview();toast(error.message||'无法读取 CSV 文件','error');}
    importFile.value='';
  });
  if(preview)preview.addEventListener('click',function(e){
    if(e.target.closest('[data-perm-import-confirm]'))cvConfirmImport();
    if(e.target.closest('[data-perm-import-cancel]')){cvImportPreview=[];cvRenderImportPreview();}
  });
  var permTable=$('#cv-perm-table');
  if(permTable) permTable.addEventListener('click',function(e){
    var ed=e.target.closest('[data-ps-edit]');
    if(ed){ cvOpenPersonEdit(ed.getAttribute('data-ps-edit')); return; }
    var del=e.target.closest('[data-ps-del]');
    if(del){ cvDeletePerson(del.getAttribute('data-ps-del')); return; }
  });
  if(permTable)permTable.addEventListener('change',function(e){var role=e.target.closest('[data-ps-workspace-role]');if(role)cvSetWorkspaceRole(role.getAttribute('data-ps-workspace-role'),role.value);});
}

export { cvClosePersonEdit, cvDeletePerson, cvOpenPersonEdit, cvOpenPersonNew, cvRenderPermTable, cvSavePersonEdit };
