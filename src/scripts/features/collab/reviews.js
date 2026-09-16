import { input } from '../../core/view.js';
import { CV_REVIEWS, CV_REVIEW_ARTIFACTS, CV_REVIEW_COMMENTS } from './data.js';
import { cvToast } from './view.js';
/* 协作开发：评审动作与详情
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ============ REVIEW ACTIONS ============ */
function cvReviewPass(i){
  cvToast('评审通过！任务已流转到测试验证节点','success');
  var grid=document.getElementById('cv-review-grid');if(grid){var card=grid.children[i];if(card){card.style.transition='opacity .3s';card.style.opacity='0.3';}}
}
function cvReviewReject(i){cvToast('评审驳回！任务已退回给开发人员','error');}
function cvOpenReviewDetail(i){
  var r=CV_REVIEWS[i];if(!r)return;
  window.cvReviewIdx=i;
  var titleEl=document.getElementById('cv-rv-title');if(titleEl)titleEl.textContent=r.title;
  var arts=CV_REVIEW_ARTIFACTS[i]||{tabs:['产物'],content:{'产物':'<p>暂无产物内容</p>'}};
  var tabsEl=document.getElementById('cv-rv-art-tabs');
  if(tabsEl){tabsEl.innerHTML=arts.tabs.map(function(t,idx){return '<button class="rv-art-tab'+(idx===0?' rv-art-tab--active':'')+'" onclick="cvSwitchArtifact('+i+',\''+t+'\')">'+t+'</button>';}).join('');}
  cvSwitchArtifact(i,arts.tabs[0]);
  var headerEl=document.getElementById('cv-rv-panel-header');
  if(headerEl){headerEl.innerHTML='<div class="rv-panel-title">评审信息</div><div class="rv-panel-info"><div class="rv-panel-info-item">评审人: <b>'+r.reviewer+'</b> ('+r.reviewerRole+')</div><div class="rv-panel-info-item">截止: <b style="color:'+r.deadlineColor+'">'+r.deadline+'</b></div><div class="rv-panel-info-item">发起人: <b>'+r.from+'</b> ('+r.fromTime+')</div><div class="rv-panel-info-item">优先级: <b>'+r.priority+'</b></div></div>';}
  cvRenderReviewComments(i);
  document.querySelectorAll('#view-collab .cv-panel').forEach(function(v){v.classList.remove('active');});
  var view=document.getElementById('cv-review-detail');if(view)view.classList.add('active');
}
function cvSwitchArtifact(idx,tab){
  var arts=CV_REVIEW_ARTIFACTS[idx];if(!arts)return;
  var tabsEl=document.getElementById('cv-rv-art-tabs');
  if(tabsEl){tabsEl.querySelectorAll('.rv-art-tab').forEach(function(t){t.classList.toggle('rv-art-tab--active',t.textContent===tab);});}
  var bodyEl=document.getElementById('cv-rv-art-body');
  if(bodyEl){bodyEl.innerHTML='<div class="rv-doc">'+(arts.content[tab]||'<p>暂无内容</p>')+'</div>';}
}
function cvRenderReviewComments(idx){
  var el=document.getElementById('cv-rv-comments');if(!el)return;
  var comments=CV_REVIEW_COMMENTS[idx]||[];
  var bm={'pass':['rv-comment-badge--pass','通过'],'reject':['rv-comment-badge--reject','驳回'],'comment':['rv-comment-badge--comment','评论']};
  el.innerHTML=comments.map(function(c){var b=bm[c.type]||['rv-comment-badge--comment','评论'];return '<div class="rv-comment"><div class="rv-comment-avatar '+(c.isAgent?'rv-comment-avatar--agent':'')+'">'+(c.avatar||c.author[0])+'</div><div class="rv-comment-body"><div class="rv-comment-header"><span class="rv-comment-author">'+c.author+'</span><span class="rv-comment-badge '+b[0]+'">'+b[1]+'</span><span class="rv-comment-time">'+c.time+'</span></div><div class="rv-comment-text">'+c.text+'</div></div></div>';}).join('');
}
function cvSubmitReview(type){
  var input=document.getElementById('cv-rv-input');var text=input?input.value.trim():'';
  if(!text&&type==='comment'){cvToast('请输入评审意见','warning');return;}
  var idx=window.cvReviewIdx;var r=CV_REVIEWS[idx];if(!r)return;
  var el=document.getElementById('cv-rv-comments');
  if(el&&text){var bm={'pass':['rv-comment-badge--pass','通过'],'reject':['rv-comment-badge--reject','驳回'],'comment':['rv-comment-badge--comment','评论']};var b=bm[type]||['rv-comment-badge--comment','评论'];var d=document.createElement('div');d.className='rv-comment';d.innerHTML='<div class="rv-comment-avatar">我</div><div class="rv-comment-body"><div class="rv-comment-header"><span class="rv-comment-author">张工（你）</span><span class="rv-comment-badge '+b[0]+'">'+b[1]+'</span><span class="rv-comment-time">刚刚</span></div><div class="rv-comment-text">'+text+'</div></div>';el.appendChild(d);el.scrollTop=el.scrollHeight;}
  if(input)input.value='';
  if(type==='pass'){cvToast('评审通过！任务已流转到测试验证节点','success');var g=document.getElementById('cv-review-grid');if(g&&g.children[idx]){g.children[idx].style.transition='opacity .3s';g.children[idx].style.opacity='0.4';}}
  else if(type==='reject'){cvToast('评审驳回！任务已退回给开发人员','error');}
  else{cvToast('评审意见已提交','info');}
}

export { cvOpenReviewDetail, cvReviewPass, cvReviewReject, cvSubmitReview, cvSwitchArtifact };
