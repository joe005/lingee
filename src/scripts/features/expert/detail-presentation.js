import { xav, xesc, phraseHtml } from './data.js';
import { assetSourceBadge, layerOf } from './layers.js';
import { assetPublicationStatus } from '../collab/expert-market.js';
import { hasPersonalReviewChanges, latestPersonalReview, reviewedAsset } from './review-state.js';
import dialogIcon from '../../../assets/figma/expert-assets/dialog.svg';
import uploadIcon from '../../../assets/icons/chat/ui-submit-upload.svg';

const REVIEW_STATUS_LABELS={pending:'待审核',approved:'审核通过',rejected:'已驳回',unsubmitted:'未提交'};
const CARD_STATUS_LABELS={...REVIEW_STATUS_LABELS,modified:'本地有更新',online:'已上架',offline:'已下架'};

function reviewStatus(review){
  return Object.hasOwn(REVIEW_STATUS_LABELS,review?.status)?review.status:'unsubmitted';
}
export function personalReviewBadge(kind,item){
  if(layerOf(kind,item)!=='personal')return '';
  const review=latestPersonalReview(kind,item);
  let status=reviewStatus(review);
  if(review&&hasPersonalReviewChanges(kind,item,review)){
    status='modified';
  }else if(status==='approved'){
    const asset=reviewedAsset(review);
    if(asset)status=assetPublicationStatus(kind,asset.id,review.version)||status;
  }
  return '<span class="asset-review-badge" data-review-status="'+status+'">'+CARD_STATUS_LABELS[status]+'</span>';
}
export function detailIdentityHtml(kind,item,face){
  const personal=layerOf(kind,item)==='personal';
  const attrs=kind==='expert'?['data-x-edit','data-x-call']:['data-team-detail-edit','data-team-detail-call'];
  return '<div class="asset-detail-identity">'+(face||'<img class="x-av-lg" src="'+xav(item.k)+'" alt="">')
    +'<strong>'+xesc(item.name)+'</strong>'+assetSourceBadge(kind,item)+'<div class="asset-detail-actions">'
    +(personal?'<button type="button" class="asset-detail-button" '+attrs[0]+'="'+xesc(item.id)+'">编辑</button>':'')
    +'<button type="button" class="asset-detail-button primary" '+attrs[1]+'="'+xesc(item.id)+'">发起对话</button></div></div>';
}
export function detailReviewHtml(kind,item){
  if(layerOf(kind,item)!=='personal')return '';
  const review=latestPersonalReview(kind,item),status=reviewStatus(review),pending=status==='pending';
  const title=REVIEW_STATUS_LABELS[status];
  const asset=status==='approved'?reviewedAsset(review):null;
  const publication=asset?assetPublicationStatus(kind,asset.id,review.version):'';
  const text=pending?'企业管理员正在审核，个人开发版本仍可继续使用。'
    :publication==='online'?'企业版本已上架，可在“更多”中安装。'
    :publication==='offline'?'对应企业版本已下架，个人开发版本仍可继续使用。'
    :status==='approved'?'此提交已通过审核。'
    :'如需供同事使用，可提交审核，企业管理员审核通过后出现在「更多'+(kind==='team'?'智能体团队':'智能体')+'」中。';
  return '<div class="asset-detail-review"><img src="'+uploadIcon+'" width="20" height="20" alt=""><div><strong>'+title+'</strong><p>'+text+'</p></div>'
    +'<button type="button" class="asset-detail-button" '+(kind==='expert'?'data-x-submit':'data-team-detail-submit')+'="'+xesc(item.id)+'"'+(pending?' disabled':'')+'>'+(pending?'已提交':'提交审核')+'</button></div>';
}
export function detailCommandsHtml(kind,item){
  const commands=(item.cmds||[]).filter(c=>c[0]);
  return '<section class="asset-detail-commands"><div class="x-sec-t">常见触发词</div>'
    +(commands.length?commands.map(c=>'<button type="button" class="x-cmd" '+(kind==='expert'?'data-cmd="'+xesc(c[0])+'" data-cmd-of="'+xesc(item.id)+'"':'data-team-cmd="'+xesc(c[0])+'"')+'><span class="x-cmd-b"><span class="x-cmd-q">“'+phraseHtml(c[0])+'”</span></span><img class="asset-command-icon" src="'+dialogIcon+'" width="16" height="16" alt=""></button>').join(''):'<p class="asset-detail-empty">暂无触发词</p>')+'</section>';
}
