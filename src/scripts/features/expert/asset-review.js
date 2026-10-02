import { $ } from '../../core/dom.js';
import { EX, xesc } from './data.js';
import { cvWorkspace, cvWorkspaceName, cvCurrentUserName } from '../collab/data.js';
import { assetOwnerKey } from './layers.js';
import { assetReviewDialog, assetReviewClose, canViewPlatformReview, isFactoryAdmin, publishedExpertRef, publishReviewedBundle } from './platform-admin.js';
export const REVIEW_KEY='lingee.platform.reviews.v1';
const clone=value=>JSON.parse(JSON.stringify(value));
function reviews(){try{const rows=JSON.parse(localStorage.getItem(REVIEW_KEY)||'[]');return Array.isArray(rows)?rows:[];}catch(_){return [];}}
function store(rows){try{localStorage.setItem(REVIEW_KEY,JSON.stringify(rows));return true;}catch(_){return false;}}
function tenantId(sourceId){return 'tenant-'+cvWorkspace+'-'+sourceId;}
function definition(kind,item){
  const data=clone(item);data.id=tenantId(item.id);data.source='tenant';data.tenantId=cvWorkspace;data.ownerId='';data.by=cvCurrentUserName();
  delete data.kn;delete data.knOff;delete data.knDocOff;delete data.knUp;
  if(kind==='expert')data.mine=false;else data.preset=true;
  return data;
}
export function submitAssetForReview(kind,item){
  if(!cvWorkspace)return assetReviewDialog('无法提交','<p>请先选择协作空间，确定提交所属租户。</p>',null,'关闭');
  if(item.ownerId&&item.ownerId!==assetOwnerKey())return;
  const tenant=cvWorkspace,tenantName=cvWorkspaceName(tenant);
  const existing=reviews().find(row=>row.kind===kind&&row.sourceId===item.id&&row.tenantId===tenant&&row.status==='pending');
  if(existing)return assetReviewDialog('已提交审核','<p>已有待审核版本，请等待管理平台审核。</p>',null,'关闭');
  const bundle=[],data=definition(kind,item);
  if(kind==='expert'){
    if(!data.modes?.length)return assetReviewDialog('无法提交','<p>数字员工至少需要一种工作模式。</p>',null,'关闭');
  }else{
    data.members=[];
    for(const id of item.members){
      const member=EX[id];if(!member)return assetReviewDialog('无法提交',`<p>成员 ${xesc(id)} 不存在。</p>`,null,'关闭');
      const ref=!member.mine?publishedExpertRef(id):null;
      if(ref)data.members.push(ref.id);
      else{const expert=definition('expert',member);bundle.push({kind:'expert',data:expert});data.members.push(expert.id);}
    }
    data.leadId=data.members[item.members.indexOf(item.leadId)]||data.members[0];
    delete data.memberRefs;
  }
  bundle.push({kind,data});
  assetReviewDialog('提交审核',`<p>将「${xesc(item.name)}」提交到租户 ${xesc(tenantName)}，审核通过后可在“更多”中安装。</p>${bundle.length>1?`<p>将同时提交 ${bundle.length-1} 位个人成员数字员工，审核通过后随专家团自动安装。</p>`:''}<label class="platform-import-note-label">提交说明 <span>*</span><textarea id="assetReviewNote" rows="3" maxlength="500" placeholder="说明用途和本次修改"></textarea></label><div class="platform-dialog-error" id="assetReviewError"></div><p class="platform-dialog-note">原型演示：审核和发布使用当前浏览器持久化数据。</p>`,()=>{
    const note=$('#assetReviewNote').value.trim();if(!note){$('#assetReviewError').textContent='请填写提交说明';return;}
    const rows=reviews();if(rows.some(row=>row.kind===kind&&row.sourceId===item.id&&row.tenantId===tenant&&row.status==='pending')){$('#assetReviewError').textContent='该内容已有待审核版本';return;}
    rows.push({id:'review-'+Date.now(),kind,sourceId:item.id,name:item.name,tenantId:tenant,tenantName,author:cvCurrentUserName(),ownerId:assetOwnerKey(),status:'pending',note,bundle,at:new Date().toLocaleString('zh-CN',{hour12:false})});
    if(!store(rows)){$('#assetReviewError').textContent='保存失败，请重试';return;}
    assetReviewDialog('提交成功','<p>等待管理平台审核。审核通过前，内容不会出现在“更多”中。</p>',null,'关闭');
  },'确认提交');
}
function matchingReviews({kind='',statuses=[],tenantId='',keyword=''}={}){
  return reviews().filter(row=>(!kind||row.kind===kind)&&(!statuses.length||statuses.includes(row.status))&&(!tenantId||row.tenantId===tenantId)&&(!keyword||`${row.name} ${row.author} ${row.tenantName}`.toLowerCase().includes(keyword)));
}
export function countAssetReviews(options){return matchingReviews(options).length;}
export function renderAssetReviewCards(keyword,{kind='',statuses=[],tenantId=''}={}){
  return matchingReviews({kind,statuses,tenantId,keyword}).reverse().map(row=>`<button type="button" class="app-card x-card platform-card" data-asset-review="${xesc(row.id)}"><div class="card-title">${xesc(row.name)}</div><div class="x-sub">${row.kind==='team'?'专家团':'数字员工'} · ${xesc(row.tenantName)} · ${xesc(row.author)}</div><div class="card-desc">${xesc(row.note)}</div><div class="platform-card-meta"><span class="platform-card-status ${row.status}">${{pending:'待审核',approved:'审核通过',rejected:'已驳回'}[row.status]}</span><time>${xesc(row.at)}</time></div></button>`).join('');
}
export function openAssetReview(id,onChange){
  const row=reviews().find(item=>item.id===id);if(!canViewPlatformReview(row))return;
  const canApprove=isFactoryAdmin();
  const contents=row.bundle.map(item=>`<div class="platform-history"><strong>${item.kind==='team'?'专家团':'数字员工'}</strong><span>${xesc(item.data.name)}<br>${xesc(item.data.desc||'')}</span><small>${xesc((item.data.modes||item.data.domains||[]).join('、'))}</small></div>`).join('');
  assetReviewDialog('审核：'+row.name,`<p>租户：${xesc(row.tenantName)} · 提交人：${xesc(row.author)}</p><p>提交说明：${xesc(row.note)}</p>${contents}${row.reason?`<p>驳回原因：${xesc(row.reason)}</p>`:''}${row.status==='pending'&&canApprove?'<label class="platform-import-note-label">驳回原因<textarea id="assetRejectReason" rows="2" maxlength="500"></textarea></label><button type="button" class="platform-link" id="assetRejectButton">驳回</button><div class="platform-dialog-error" id="assetReviewError"></div>':''}`,row.status==='pending'&&canApprove?()=>{
    if(!isFactoryAdmin())return;
    const rows=reviews(),request=rows.find(item=>item.id===id);if(!request||request.status!=='pending')return;
    request.status='approved';request.reviewer=cvCurrentUserName();
    const error=publishReviewedBundle(request.bundle,request.note,{name:REVIEW_KEY,value:rows});
    if(error){$('#assetReviewError').textContent=error;return;}assetReviewClose();onChange();
  }:null,row.status==='pending'&&canApprove?'审核通过并发布':'关闭');
  $('#assetRejectButton')?.addEventListener('click',()=>{
    if(!isFactoryAdmin())return;
    const reason=$('#assetRejectReason').value.trim();if(!reason){$('#assetReviewError').textContent='请填写驳回原因';return;}
    const rows=reviews(),request=rows.find(item=>item.id===id);if(!request||request.status!=='pending')return;
    request.status='rejected';request.reason=reason;request.reviewer=cvCurrentUserName();
    if(!store(rows)){$('#assetReviewError').textContent='保存失败，请重试';return;}assetReviewClose();onChange();
  });
}
