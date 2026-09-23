import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { CV_MEMBERS, CV_PROJECTS, cvIsMe, cvPersistPersons, cvPersistProjects, cvPersonById } from './data.js';
import { cvPersistSquads, cvSquadDetachMember } from './squads.js';
import { cvRenderProjectDetail, cvRenderProjectList } from './project-view.js';
import { xesc } from '../expert/data.js';
/* 设置：人员资料与人员管理。 */

var cvPersonEditId='';      /* 人员编辑弹窗：正在编辑的人员 id，空 = 新增 */
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
  cvSetPField('name','');cvSetPField('email','');cvSetPField('dept','');
  var ov=$('#cv-personedit-overlay'); if(ov) ov.style.display='flex';
  var tt=$('#cv-pedit-title'); if(tt) tt.textContent='新增人员';
}
function cvOpenPersonEdit(pid){
  var p=cvPersonById(pid); if(!p) return;
  cvPersonEditId=pid;
  cvSetPField('name',p.name);cvSetPField('email',p.email);cvSetPField('dept',p.dept||'');
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
    CV_MEMBERS.push({id:pid,name:name,email:g('email'),dept:g('dept'),roles:[],status:'available',source:'直接添加'});
  }else{
    var p=cvPersonById(cvPersonEditId); if(!p) return;
    p.name=name;p.email=g('email');p.dept=g('dept');
  }
  cvPersistPersons();
  cvClosePersonEdit();
  cvRenderProjectDetail(); cvRenderPermTable();
  toast(isNew?'已新增人员：'+name:'已保存人员：'+name);
}

function cvDeletePerson(pid){
  var p=cvPersonById(pid); if(!p) return;
  if(cvIsMe(p)){ toast('不能删除自己','warning'); return; }
  CV_PROJECTS.forEach(function(pr){ pr.members=(pr.members||[]).filter(function(id){return id!==pid;}); });
  cvSquadDetachMember(pid);
  CV_MEMBERS.splice(CV_MEMBERS.indexOf(p),1);
  cvPersistPersons(); cvPersistProjects(); cvPersistSquads();
  cvRenderProjectDetail(); cvRenderProjectList(); cvRenderPermTable();
  toast('已删除人员：'+p.name,'info');
}

/* ---------- 人员管理：支持新增 / 修改 / 删除 ---------- */
function cvRenderPermTable(){
  var el=$('#cv-perm-table'); if(!el) return;
  var cnt=$('#cv-perm-count'); if(cnt) cnt.textContent=CV_MEMBERS.length;
  el.innerHTML='<div class="cfg-table">'
    +'<div class="cfg-table-head cv-perm-head"><span>成员</span><span>操作</span></div>'
    +CV_MEMBERS.map(function(p){
      return '<div class="cfg-table-row cv-perm-row">'
        +'<span class="cfg-t-name">'+cvPersonAvHtml(p,'ps-av')+'<span class="cv-proj-desc-wrap"><b>'+xesc(p.name)+(cvIsMe(p)?'<span class="ps-me">我</span>':'')+'</b><em class="cv-proj-desc">'+xesc(p.email||'')+'</em></span></span>'
        +'<span class="cv-perm-acts"><button type="button" class="act-btn" data-ps-edit="'+p.id+'">修改</button>'
        +(cvIsMe(p)?'':'<button type="button" class="act-btn act-btn--danger" data-ps-del="'+p.id+'">删除</button>')+'</span>'
        +'</div>';
    }).join('')
    +'</div>';
}

export function initCollabPersons(){
  var permTable=$('#cv-perm-table');
  if(permTable) permTable.addEventListener('click',function(e){
    var ed=e.target.closest('[data-ps-edit]');
    if(ed){ cvOpenPersonEdit(ed.getAttribute('data-ps-edit')); return; }
    var del=e.target.closest('[data-ps-del]');
    if(del){ cvDeletePerson(del.getAttribute('data-ps-del')); return; }
  });
}

export { cvClosePersonEdit, cvDeletePerson, cvOpenPersonEdit, cvOpenPersonNew, cvRenderPermTable, cvSavePersonEdit };
