import { xav, xesc, phraseHtml } from './data.js';
import { assetSourceBadge, layerOf } from './layers.js';
import dialogIcon from '../../../assets/figma/expert-assets/dialog.svg';

export function personalReviewStatus(kind,id){
  try{
    const rows=JSON.parse(localStorage.getItem('lingee.platform.reviews.v1')||'[]');
    return rows.filter(row=>row.kind===kind&&row.sourceId===id).at(-1)?.status||'';
  }catch(_){return '';}
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
  const status=personalReviewStatus(kind,item.id),pending=status==='pending',approved=status==='approved';
  const close=kind==='expert'?'data-x-close':'data-team-detail-close';
  const submit=approved?'':'<button type="button" class="asset-detail-foot-btn primary" '+(kind==='expert'?'data-x-submit':'data-team-detail-submit')+'="'+xesc(item.id)+'"'+(pending?' disabled':'')+'>'+(pending?'已提交审核':status==='rejected'?'重新提交审核':'提交审核')+'</button>';
  return '<div class="asset-detail-foot"><button type="button" class="asset-detail-foot-btn" '+close+'>取消</button>'+submit+'</div>';
}
export function detailCommandsHtml(kind,item){
  const commands=(item.cmds||[]).filter(c=>c[0]);
  return '<section class="asset-detail-commands"><div class="x-sec-t">常见触发词</div>'
    +(commands.length?commands.map(c=>'<button type="button" class="x-cmd" '+(kind==='expert'?'data-cmd="'+xesc(c[0])+'" data-cmd-of="'+xesc(item.id)+'"':'data-team-cmd="'+xesc(c[0])+'"')+'><span class="x-cmd-b"><span class="x-cmd-q">“'+phraseHtml(c[0])+'”</span></span><img class="asset-command-icon" src="'+dialogIcon+'" width="16" height="16" alt=""></button>').join(''):'<p class="asset-detail-empty">暂无触发词</p>')+'</section>';
}
