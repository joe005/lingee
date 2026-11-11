import { platformExpertSkills } from './platform-skill-details.js';
import { platformTeamFields, platformTeamMembers } from './platform-team-details.js';
import { toast } from '../../core/toast.js';
import { $ } from '../../core/dom.js';
import { EX, xesc, xav } from './data.js';
import { CV_WORKSPACES, cvCanAccessWorkspace, cvWorkspace, cvWorkspaceName, cvCurrentUserName } from '../collab/data.js';
import { getPlatformIdentity } from '../login.js';
import { assetOwnerKey } from './layers.js';
import { publishScopeHtml, readPublishScope, PUBLISH_SCOPES } from './platform-admin.js';
import { REVIEW_KEY, readAssetReviews as reviews, reviewSourceSnapshot, reviewedAsset, hasPersonalReviewChanges } from './review-state.js';
import { assetReviewDialog, assetReviewClose, canViewPlatformReview, canApprovePlatformReview, nextReviewVersion, currentPublishedVersion, reviewVersionHistory, exportReviewSnapshot, publishedExpertRef, publishReviewedBundle } from './platform-admin.js';
export { REVIEW_KEY };
const clone=value=>JSON.parse(JSON.stringify(value));
function store(rows){try{localStorage.setItem(REVIEW_KEY,JSON.stringify(rows));return true;}catch(_){return false;}}
function definition(kind,item,tenant){
  const data=clone(item);data.id='tenant-'+tenant+'-'+item.id;data.source='tenant';data.tenantId=tenant;data.ownerId='';data.by=cvCurrentUserName();
  delete data.kn;delete data.knOff;delete data.knDocOff;delete data.knUp;
  if(kind==='expert')data.mine=false;else data.preset=true;
  return data;
}
const noteField=`<label class="platform-import-note-label"><span class="asset-review-label">提交说明 <em>*</em></span><textarea id="assetReviewNote" rows="3" maxlength="100" placeholder="说明用途和本次修改"></textarea><small class="asset-review-count" id="assetReviewNoteCount">0/100</small></label><div class="platform-dialog-error" id="assetReviewError"></div>`;
function readNote(){
  const note=$('#assetReviewNote').value.trim();
  if(!note){$('#assetReviewError').textContent='请填写提交说明';return '';}
  if(note.length>100){$('#assetReviewError').textContent='提交说明不能超过 100 字';return '';}
  return note;
}
const bindNoteCount=()=>$('#assetReviewNote').addEventListener('input',event=>{$('#assetReviewNoteCount').textContent=event.target.value.length+'/100';});
const reviewTime=()=>new Date().toLocaleString('zh-CN',{hour12:false});
/* 智能体团队只引用已上架、且与当前草稿一致的成员版本；成员各自审核发布，不随团队打包。
   ready 时返回可引用的企业版本 id，其余返回需要处理的状态 */
const MEMBER_STATUS={unsubmitted:'未提交',rejected:'已驳回',modified:'有更新未提交',offline:'已下架',pending:'审核中',invalid:'缺少工作模式'};
const MEMBER_SUBMITTABLE=new Set(['unsubmitted','rejected','modified','offline']);
function personalMemberState(member,tenant){
  const review=reviews().findLast(row=>row.kind==='expert'&&row.sourceId===member.id&&row.tenantId===tenant);
  if(review?.status==='pending')return {status:'pending'};
  if(!member.modes?.length)return {status:'invalid'};
  if(!review)return {status:'unsubmitted'};
  if(review.status!=='approved')return {status:'rejected'};
  if(hasPersonalReviewChanges('expert',member,review))return {status:'modified'};
  const ref=publishedExpertRef(reviewedAsset(review)?.id);
  return ref?{status:'ready',ref:ref.id}:{status:'offline'};
}
function memberRow(entry){
  const enabled=MEMBER_SUBMITTABLE.has(entry.status),name=xesc(entry.member.name);
  return `<label class="asset-member-check${enabled?'':' is-disabled'}"><input type="checkbox" value="${xesc(entry.member.id)}"${enabled?' checked':' disabled'}><img src="${xav(entry.member.k||'eng')}" width="20" height="20" alt=""><span title="${name}">${name}</span><small data-member-status="${entry.status}">${MEMBER_STATUS[entry.status]}</small></label>`;
}
/* 成员未就绪时不提交团队：列出成员与状态，可勾选的成员一次提交，各自生成独立审核单 */
function submitMembersDialog(team,blocked,tenant){
  const tenantName=cvWorkspaceName(tenant);
  const selectable=blocked.filter(entry=>MEMBER_SUBMITTABLE.has(entry.status));
  const list='<div class="asset-member-list">'+blocked.map(memberRow).join('')+'</div>';
  const intro=`<p>「${xesc(team.name)}」只能引用已上架、且与当前草稿一致的成员版本。以下 ${blocked.length} 位成员需先审核通过，再提交智能体团队。</p>`;
  const waiting=blocked.length>selectable.length?'<p class="platform-dialog-note">审核中的成员请等待审核结果；缺少工作模式的成员请先编辑补充。</p>':'';
  if(!selectable.length)return assetReviewDialog('成员尚未就绪',intro+list+waiting,null,'知道了',{style:'submit'});
  assetReviewDialog('先提交成员审核',intro+list+waiting+noteField,()=>{
    if(!reviewTenants().some(workspace=>workspace.id===tenant)){$('#assetReviewError').textContent='当前账号已无提交权限，请重新登录后重试';return;}
    const ids=[...document.querySelectorAll('#platformDialogBody .asset-member-check [type=checkbox]:checked')].map(box=>box.value);
    if(!ids.length){$('#assetReviewError').textContent='请至少选择一位成员';return;}
    const note=readNote();if(!note)return;
    const rows=reviews(),at=reviewTime(),stampId=Date.now();
    const submitted=ids.map(id=>EX[id]).filter(member=>member&&!rows.some(row=>row.kind==='expert'&&row.sourceId===member.id&&row.tenantId===tenant&&row.status==='pending'));
    submitted.forEach((member,index)=>rows.push({id:`review-${stampId}-${index}`,kind:'expert',sourceId:member.id,name:member.name,tenantId:tenant,tenantName,author:cvCurrentUserName(),ownerId:assetOwnerKey(),status:'pending',note,bundle:[{kind:'expert',data:definition('expert',member,tenant)}],sourceSnapshot:clone(reviewSourceSnapshot('expert',member)),at}));
    if(!store(rows)){$('#assetReviewError').textContent='保存失败，请重试';return;}
    assetReviewClose();
    document.dispatchEvent(new Event('lingee:cloud-assets-changed'));
    toast(`<span class="asset-submit-toast"><strong>已提交 ${submitted.length} 位成员审核</strong><span>成员审核通过后，再提交「${xesc(team.name)}」。</span></span>`,'success');
  },'提交所选成员',{style:'submit'});
  bindNoteCount();
}
function reviewTenants(){
  const tenant=getPlatformIdentity()?.tenantId;
  return CV_WORKSPACES.filter(workspace=>tenant?workspace.id===tenant:cvCanAccessWorkspace(workspace.id,cvCurrentUserName()));
}
export function submitAssetForReview(kind,item){
  if(item.ownerId&&item.ownerId!==assetOwnerKey())return;
  const choices=reviewTenants(),accountTenant=getPlatformIdentity()?.tenantId;
  if(!choices.length)return assetReviewDialog('无法提交','<p>当前账号没有可提交的企业，请联系管理员配置企业归属。</p>',null,'关闭');
  /* 个人内容本地直接运行，提交审核只会提交给所在企业，不需要再选；
     账号绑定了企业就用该企业，否则用当前所在企业（无权限时退回第一个可用企业） */
  submitToTenant(kind,item,accountTenant||(choices.some(workspace=>workspace.id===cvWorkspace)?cvWorkspace:choices[0].id));
}
function submitToTenant(kind,item,tenant){
  if(item.ownerId&&item.ownerId!==assetOwnerKey())return;
  const tenantName=cvWorkspaceName(tenant);
  const existing=reviews().find(row=>row.kind===kind&&row.sourceId===item.id&&row.tenantId===tenant&&row.status==='pending');
  if(existing)return assetReviewDialog('已提交审核','<p>已有待审核版本，请等待管理平台审核。</p>',null,'关闭');
  const bundle=[],data=definition(kind,item,tenant);
  const sourceSnapshot=clone(reviewSourceSnapshot(kind,item));
  if(kind==='expert'){
    if(!data.modes?.length)return assetReviewDialog('无法提交','<p>智能体至少需要一种工作模式。</p>',null,'关闭');
  }else{
    data.members=[];
    const blocked=[];
    for(const id of item.members){
      const member=EX[id];if(!member)return assetReviewDialog('无法提交',`<p>成员 ${xesc(id)} 不存在。</p>`,null,'关闭');
      if(member.source==='tenant'&&member.tenantId!==tenant)return assetReviewDialog('无法提交','<p>智能体团队包含其他企业的智能体，请调整成员后重试。</p>',null,'关闭');
      if(member.mine&&member.ownerId&&member.ownerId!==assetOwnerKey())return assetReviewDialog('无法提交','<p>智能体团队包含其他用户的个人智能体，请调整成员后重试。</p>',null,'关闭');
      if(member.mine){
        const state=personalMemberState(member,tenant);
        if(state.ref)data.members.push(state.ref);else blocked.push({member,status:state.status});
        continue;
      }
      const ref=publishedExpertRef(id);
      if(ref)data.members.push(ref.id);
      else{const expert=definition('expert',member,tenant);bundle.push({kind:'expert',data:expert});data.members.push(expert.id);}
    }
    if(blocked.length)return submitMembersDialog(item,blocked,tenant);
    data.leadId=data.members[item.members.indexOf(item.leadId)]||data.members[0];
    delete data.memberRefs;
  }
  bundle.push({kind,data});
  assetReviewDialog('提交审核',`<p>将「${xesc(item.name)}」提交到租户 ${xesc(tenantName)}，审核通过后可在“更多”中安装。</p>${bundle.length>1?`<p>将同时提交 ${bundle.length-1} 位成员智能体，审核通过后随智能体团队自动安装。</p>`:''}${noteField}<p class="platform-dialog-note">原型演示：审核和发布使用当前浏览器持久化数据。</p>`,()=>{
    if(!reviewTenants().some(workspace=>workspace.id===tenant)||item.ownerId&&item.ownerId!==assetOwnerKey()){$('#assetReviewError').textContent='当前账号已无提交权限，请重新登录后重试';return;}
    const note=readNote();if(!note)return;
    const rows=reviews();if(rows.some(row=>row.kind===kind&&row.sourceId===item.id&&row.tenantId===tenant&&row.status==='pending')){$('#assetReviewError').textContent='该内容已有待审核版本';return;}
    rows.push({id:'review-'+Date.now(),kind,sourceId:item.id,name:item.name,tenantId:tenant,tenantName,author:cvCurrentUserName(),ownerId:assetOwnerKey(),status:'pending',note,bundle,sourceSnapshot,at:reviewTime()});
    if(!store(rows)){$('#assetReviewError').textContent='保存失败，请重试';return;}
    assetReviewClose();
    document.dispatchEvent(new Event('lingee:cloud-assets-changed'));   /* 卡片上的发布去向随之刷新 */
    $('#expertModal')?.classList.remove('show');$('#teamModal')?.classList.remove('show');
    toast('<span class="asset-submit-toast"><strong>提交成功！</strong><span>「'+xesc(item.name)+'」已提交到 '+xesc(tenantName)+'，待企业管理员审核。审核通过前，内容不会出现在“更多”中，个人开发版本仍可继续使用。</span></span>','success');
  },'提交',{style:'submit'});
  bindNoteCount();
}
function matchingReviews({kind='',statuses=[],tenantId='',keyword=''}={}){
  /* 已驳回只在没有更新的提交时展示；重新提交后，旧驳回只留在历史版本里 */
  const all=reviews();
  return all.filter((row,index)=>row.status!=='rejected'||!all.slice(index+1).some(later=>later.kind===row.kind&&later.sourceId===row.sourceId&&later.tenantId===row.tenantId))
    .filter(row=>(!kind||row.kind===kind)&&(!statuses.length||statuses.includes(row.status))&&(!tenantId||row.tenantId===tenantId)&&(!keyword||`${row.name} ${row.author} ${row.tenantName}`.toLowerCase().includes(keyword)));
}
/* 被驳回的审核单没有生成发布版本，把它们作为一条事件并入对应资产的历史版本 */
const stamp=()=>new Date().toLocaleString('zh-CN',{hour12:false});
const timeOf=value=>{const t=Date.parse(String(value||'').replace(/-/g,'/'));return Number.isNaN(t)?0:t;};
export function rejectedReviewEntries(kind,assetId){
  return reviews().filter(row=>row.status==='rejected'&&row.bundle.some(item=>item.kind===kind&&item.data.id===assetId))
    .map(row=>({rejected:true,version:row.version||'',reason:row.reason||'',reviewer:row.reviewer||'',submitter:row.author||'',submitNote:row.note||'',at:row.rejectedAt||row.at||''}));
}
/* published：已发布版本（带原始下标，导出按下标取）；返回按时间从新到旧的历史行 */
export function mergeVersionHistory(published,rejected,renderPublished){
  const rows=published.map((entry,index)=>({time:timeOf(entry.at),html:renderPublished(entry,index)}))
    .concat(rejected.map(entry=>({time:timeOf(entry.at),html:`<div class="platform-history platform-history--rejected"><strong>${entry.version?'V'+xesc(entry.version):'审核'}</strong><span><b class="platform-history-tag">已驳回</b>${xesc(entry.reason||'未填写原因')}${entry.submitter?`<em>提交人：${xesc(entry.submitter)}${entry.submitNote?' · '+xesc(entry.submitNote):''}</em>`:''}</span><small>${xesc(entry.at)}${entry.reviewer?' · '+xesc(entry.reviewer):''}</small><span></span></div>`})));
  return rows.sort((a,b)=>b.time-a.time).map(row=>row.html).join('');
}
export function countAssetReviews(options){return matchingReviews(options).length;}
export function renderAssetReviewCards(keyword,{kind='',statuses=[],tenantId=''}={}){
  return matchingReviews({kind,statuses,tenantId,keyword}).reverse().map(row=>{
    const data=row.bundle.find(item=>item.kind===row.kind)?.data||{},team=row.kind==='team';
    const face=team?`<span class="platform-faces">${(data.members||[]).slice(0,4).map(id=>`<img src="${xav((row.bundle.find(item=>item.data.id===id)?.data||EX[id])?.k||'lead')}" alt="">`).join('')}</span>`:`<img class="x-av" src="${xav(data.k||'eng')}" alt="">`;
    return `<button type="button" class="app-card x-card platform-card" data-asset-review="${xesc(row.id)}"><div class="card-top">${face}<div class="card-titles"><div class="card-title-row"><span class="card-title">${xesc(row.name)}</span></div><div class="x-sub">${team?(data.members||[]).length+' 个智能体':(data.skills||[]).length+' 个技能'}</div></div><span class="platform-card-version">V${nextReviewVersion(row.kind,data.id)}</span></div><div class="card-desc">${xesc(data.desc||'暂无简介')}</div><div class="card-tags">${(team?data.domains||[]:data.tags||[]).slice(0,3).map(tag=>`<span class="ptag">${xesc(tag)}</span>`).join('')}</div><div class="platform-card-meta"><span class="platform-card-status ${row.status}">${{pending:'待审核',approved:'审核通过',rejected:'已驳回'}[row.status]}</span><time>${xesc(row.at)}</time></div></button>`;
  }).join('');
}
export function openAssetReview(id,onChange){
  const row=reviews().find(item=>item.id===id);if(!canViewPlatformReview(row))return;
  const canApprove=canApprovePlatformReview(row);
  const contents=row.bundle.map(item=>{
    const d=item.data,team=item.kind==='team';
    const resolveMember=id=>{const member=row.bundle.find(entry=>entry.kind==='expert'&&entry.data.id===id);return member?{data:member.data,version:member.version||nextReviewVersion('expert',id)}:reviewVersionHistory('expert',id).at(-1)||(EX[id]?{data:EX[id]}:null);};
    return `<section class="platform-review-definition"><div class="platform-detail-headline">${team?'':`<img class="x-av" src="${xav(d.k||'eng')}" alt="">`}<strong>${xesc(d.name)}</strong><span>V${nextReviewVersion(item.kind,d.id)}</span></div><dl class="platform-info-list"><dt>状态</dt><dd>${{pending:'待审核',approved:'审核通过',rejected:'已驳回'}[row.status]}</dd><dt>当前上架</dt><dd>${currentPublishedVersion(item.kind,d.id)?'V'+currentPublishedVersion(item.kind,d.id):'暂无'}</dd><dt>最新版本</dt><dd>V${nextReviewVersion(item.kind,d.id)}</dd><dt>编码</dt><dd>${xesc(d.id)}</dd><dt>简介</dt><dd>${xesc(d.desc||'暂无简介')}</dd><dt>更新说明</dt><dd>${xesc(row.note)}</dd><dt>更新时间</dt><dd>${xesc(row.at)}</dd>${team?platformTeamFields(d,resolveMember):`<dt>技能数</dt><dd>${(d.skills||[]).length}</dd>`}</dl>${team?platformTeamMembers(d,resolveMember):platformExpertSkills(d)}<button type="button" class="platform-link" data-review-history="${xesc(d.id)}">查看历史版本</button> <button type="button" class="platform-link" data-review-export="${xesc(d.id)}">导出 ZIP</button></section>`;
  }).join('');
  assetReviewDialog((row.kind==='team'?'智能体团队':'智能体')+'详情',`${contents}${row.reason?`<p>驳回原因：${xesc(row.reason)}</p>`:''}${row.status==='pending'&&canApprove?publishScopeHtml(row.scope||'tenant'):row.scope?`<p class="platform-dialog-note">上架范围：${PUBLISH_SCOPES[row.scope]||'全企业'}</p>`:''}${row.status==='pending'&&canApprove?'<label class="platform-import-note-label" id="assetRejectFields" hidden>驳回原因<textarea id="assetRejectReason" rows="2" maxlength="500" placeholder="请填写驳回原因"></textarea></label><div class="platform-dialog-error" id="assetReviewError"></div>':''}`,row.status==='pending'&&canApprove?()=>{
    if(!canApprovePlatformReview(row))return;
    const rows=reviews(),request=rows.find(item=>item.id===id);if(!request||request.status!=='pending')return;
    if(!$('#assetRejectFields').hidden){
      const reason=$('#assetRejectReason').value.trim();
      if(!reason){$('#assetReviewError').textContent='请填写驳回原因';$('#assetRejectReason').focus();return;}
      request.status='rejected';request.reason=reason;request.reviewer=cvCurrentUserName();request.rejectedAt=stamp();
      const target=reviewedAsset(request);if(target)request.version=nextReviewVersion(request.kind,target.id);
      if(!store(rows)){$('#assetReviewError').textContent='保存失败，请重试';return;}
      assetReviewClose();onChange();return;
    }
    request.status='approved';request.reviewer=cvCurrentUserName();request.scope=readPublishScope();
    const target=reviewedAsset(request);if(target)request.version=nextReviewVersion(request.kind,target.id);
    const error=publishReviewedBundle(request.bundle,request.note,{name:REVIEW_KEY,value:rows},request.scope);
    if(error){$('#assetReviewError').textContent=error;return;}assetReviewClose();onChange();
  }:null,row.status==='pending'&&canApprove?'审核通过':'关闭');
  $('#platformDialogBody').querySelectorAll('[data-review-export]').forEach(button=>button.addEventListener('click',()=>{
    if(!canViewPlatformReview(row))return;
    const item=row.bundle.find(entry=>entry.data.id===button.dataset.reviewExport);if(!item)return;
    exportReviewSnapshot(item.kind,item.data,nextReviewVersion(item.kind,item.data.id),row.note);
  }));
  $('#platformDialogBody').querySelectorAll('[data-review-history]').forEach(button=>button.addEventListener('click',()=>{
    if(!canViewPlatformReview(row))return;
    const item=row.bundle.find(entry=>entry.data.id===button.dataset.reviewHistory);if(!item)return;
    const history=reviewVersionHistory(item.kind,item.data.id).reverse(),rejected=rejectedReviewEntries(item.kind,item.data.id);
    assetReviewDialog(item.data.name+' · 历史版本',history.length||rejected.length?mergeVersionHistory(history,rejected,(entry,index)=>`<div class="platform-history"><strong>V${entry.version}</strong><span>${xesc(entry.note)}</span><small>${xesc(entry.at)}</small><button type="button" class="platform-link" data-review-history-export="${index}">导出</button></div>`):'<p>暂无历史版本，首次审核通过后生成发布记录。</p>',()=>openAssetReview(id,onChange),'返回详情');
    $('#platformDialogBody').querySelectorAll('[data-review-history-export]').forEach(exportButton=>exportButton.addEventListener('click',()=>{
      if(!canViewPlatformReview(row))return;
      const entry=history[Number(exportButton.dataset.reviewHistoryExport)];if(entry)exportReviewSnapshot(item.kind,entry.data,entry.version,entry.note);
    }));
  }));
  if(row.status==='pending'&&canApprove){
    const button=document.createElement('button');button.type='button';button.className='platform-btn';button.id='assetRejectButton';button.textContent='驳回';
    $('#platformDialogConfirm').before(button);
    button.addEventListener('click',()=>{
      if(!canApprovePlatformReview(row))return;
      const fields=$('#assetRejectFields');fields.hidden=!fields.hidden;
      button.textContent=fields.hidden?'驳回':'取消驳回';
      $('#platformDialogConfirm').textContent=fields.hidden?'审核通过':'确认驳回';
      $('#assetReviewError').textContent='';
      if(!fields.hidden)$('#assetRejectReason').focus();
    });
  }
}
