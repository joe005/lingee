import { xav, xesc, phraseHtml } from './data.js';
import { assetSourceBadge, layerOf } from './layers.js';
import { assetPublicationStatus } from '../collab/expert-market.js';
import { hasPersonalReviewChanges, latestPersonalReview, reviewedAsset } from './review-state.js';
import dialogIcon from '../../../assets/figma/expert-assets/dialog.svg';

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
/* 个人开发资产的详情底栏：右侧「取消 / 提交审核」，不再展示提交状态说明卡；
   待审核时按钮显示「已提交审核」并禁用，已驳回可重新提交，审核通过后只留「取消」 */
export function detailReviewHtml(kind,item){
  if(layerOf(kind,item)!=='personal')return '';
  const status=reviewStatus(latestPersonalReview(kind,item)),pending=status==='pending',approved=status==='approved';
  const close=kind==='expert'?'data-x-close':'data-team-detail-close';
  const submit=approved?'':'<button type="button" class="asset-detail-foot-btn primary" '+(kind==='expert'?'data-x-submit':'data-team-detail-submit')+'="'+xesc(item.id)+'"'+(pending?' disabled':'')+'>'+(pending?'已提交审核':status==='rejected'?'重新提交审核':'提交审核')+'</button>';
  return '<div class="asset-detail-foot"><button type="button" class="asset-detail-foot-btn" '+close+'>取消</button>'+submit+'</div>';
}
export function detailCommandsHtml(kind,item){
  const commands=(item.cmds||[]).filter(c=>c[0]);
  return '<section class="asset-detail-commands"><div class="x-sec-t">常见触发词</div>'
    +(commands.length?commands.map(c=>'<button type="button" class="x-cmd" '+(kind==='expert'?'data-cmd="'+xesc(c[0])+'" data-cmd-of="'+xesc(item.id)+'"':'data-team-cmd="'+xesc(c[0])+'"')+'><span class="x-cmd-b"><span class="x-cmd-q">“'+phraseHtml(c[0])+'”</span></span><img class="asset-command-icon" src="'+dialogIcon+'" width="16" height="16" alt=""></button>').join(''):'<p class="asset-detail-empty">暂无触发词</p>')+'</section>';
}
