import { detailIdentityHtml, detailReviewHtml, detailCommandsHtml } from './detail-presentation.js';
import { assetUpgradeHtml, assetModesHtml, assetTagsHtml, isMoreAssets, syncAssetBrowser, cloudCardsHtml, teamWorkModes } from '../collab/expert-market.js';
import { layerOf, layerVisible, layerActions, layerToolbar, handleLayerAction, assetSourceBadge } from './layers.js';
import { UNLISTED_EXPERT_IDS } from './builtin-catalog.js';
import { $, $$ } from '../../core/dom.js';
import { summon } from './automatch.js';
import { EX, EXPERTS, phraseHtml, skillInfo, xav, xesc } from './data.js';
import { submitAssetForReview } from './asset-review.js';
import { deleteMyExpert, openExpertEditor } from './editor.js';
import { knSecHtml, resetKnDetail, saveKnDetail } from './knowledge.js';
import { TEAMS, teamDomains } from './store.js';
import { openTeamModal } from './team-modal.js';
import { assetCardActionsHtml } from './card-actions.js';
/* 专家库视图与专家详情弹窗
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 专家库视图 ---------- */
var expertTab='team', expertKw='',teamLayer='all';
export function set_teamLayer(value){teamLayer=value;}
var expertGrid=$('#expertGrid');
function facesHtml(ids,n,compact=false){
  var limit=n||4,showCount=compact&&ids.length>limit;
  return '<span class="x-faces">'+ids.slice(0,showCount?limit-1:limit).map(function(i){
    return '<img src="'+xav(EX[i]?.k)+'" alt="">'; }).join('')
    +(showCount?'<span class="asset-faces-count">+'+(ids.length-limit+1)+'</span>':'')+'</span>';
}
function renderExpertGrid(){
  if(!expertGrid) return;
  var si=$('#expertSearchInput');
  if(si && si.value!==expertKw) si.value=expertKw;
  var kw=expertKw.trim(), html='';
  if(expertTab==='team'){
    syncAssetBrowser('team',TEAMS);
    layerToolbar('team',TEAMS,teamLayer);
    expertGrid.classList.toggle('asset-cloud-grid',isMoreAssets('team'));
    if(isMoreAssets('team')){expertGrid.innerHTML=cloudCardsHtml('team',expertKw);return;}
    var rows=TEAMS.filter(function(t){
      if(!layerVisible('team',t)||(teamLayer!=='all'&&layerOf('team',t)!==teamLayer))return false;
      if(!kw) return true;
      return (t.name+t.desc+teamDomains(t).join()+t.members.map(function(m){return EX[m].name}).join()).indexOf(kw)>=0;
    });
    function teamCard(t){
      return '<div class="app-card x-card" data-team="'+t.id+'">'
        +assetCardActionsHtml('team',t,layerOf('team',t)==='personal','data-call-team')
        +'<div class="card-top">'+facesHtml(t.members,4,true)
        +'<div class="card-titles"><div class="card-title-row"><span class="card-title">'+xesc(t.name)+'</span>'
        +'</div>'
        +'<div class="x-sub asset-card-summary">'+assetSourceBadge('team',t)+'<span>'+t.members.length+' 个智能体</span><span class="asset-card-upgrade-anchor">'+assetUpgradeHtml('team',t.id)+'</span></div></div></div>'
        +'<div class="card-desc">'+xesc(t.desc)+'</div>'
        +assetTagsHtml(teamDomains(t))+assetModesHtml(teamWorkModes(t))+layerActions('team',t)+'</div>';
    }
    html=[{title:'个人开发',rows:rows.filter(t=>layerOf('team',t)==='personal')},{title:'我添加的',rows:rows.filter(t=>layerOf('team',t)!=='personal')}].filter(section=>section.rows.length).map(section=>'<section class="asset-list-section"><h2 class="expert-section-title">'+section.title+'</h2><div class="apps-grid">'+section.rows.map(teamCard).join('')+'</div></section>').join('');
  }else{
    var rows2=EXPERTS.filter(function(e){
      if(!layerVisible('expert',e))return false;
      if(!kw) return true;
      return (e.name+e.role+e.desc+e.tags.join()+(e.skills||[]).map(function(id){return skillInfo(id).name}).join()).indexOf(kw)>=0;
    });
    html=rows2.map(function(e){
      return '<div class="app-card x-card" data-expert="'+e.id+'">'
        +'<button type="button" class="x-call" data-call-expert="'+e.id+'" title="对话这位智能体">对话</button>'
        +'<div class="card-top"><img class="x-av" src="'+xav(e.k)+'" alt="">'
        +'<div class="card-titles"><div class="card-title-row"><span class="card-title">'+xesc(e.name)+'</span>'
        +assetSourceBadge('expert',e)+'</div>'
        +'<div class="x-sub">'+xesc([e.role,e.by].filter(Boolean).join(' · '))+'</div></div></div>'
        +'<div class="card-desc">'+xesc(e.desc)+'</div>'
        +'<div class="card-tags">'+e.tags.slice(0,3).map(function(t){return '<span class="ptag">'+xesc(t)+'</span>'}).join('')+'</div>'
        +'</div>';
    }).join('');
  }
  expertGrid.innerHTML = html || '<div class="x-empty">没有匹配的结果</div>';
  var tc=$('#teamTabCount'), ec=$('#expertTabCount');
  if(tc) tc.textContent=TEAMS.length;
  if(ec) ec.textContent=EXPERTS.filter(function(e){return e.listed!==false&&!UNLISTED_EXPERT_IDS.has(e.id)}).length;
}
var expertSearchInput=$('#expertSearchInput');

/* ---------- 专家详情弹窗 ---------- */
var expertModal=$('#expertModal');
var xdTab='overview';    /* 详情弹窗顶部页签：概览 / 知识——跟智能体详情页的顶部页签是一个思路 */
function openExpertModal(id){
  var e=EX[id]; if(!e) return;
  resetKnDetail();
  expertModal.classList.remove('expert-show-knowledge','expert-knowledge-dirty');
  xdTab='overview';
  $('#expertModalHead').innerHTML='<div class="modal-title" id="expertModalTitle">智能体详情</div>'
    +'<button class="modal-close" type="button" data-x-close aria-label="关闭">×</button>';

  var tags=e.tags||[];
  var overview=detailIdentityHtml('expert',e)
    +'<div class="x-sec x-desc">'+xesc(e.desc)+'</div>'+detailReviewHtml('expert',e)
    +(tags.length?'<section class="x-sec"><div class="x-sec-t">标签</div><div class="x-chips">'+tags.map(tag=>'<span class="ptag">'+xesc(tag)+'</span>').join('')+'</div></section>':'')
    +detailCommandsHtml('expert',e);

  var skills=e.skills||[];
  var skillsHtml='<div class="x-skill-head"><strong>关联技能</strong></div>'
    +(skills.length?'<div class="x-skill-list">'+skills.map(function(id){
      var s=skillInfo(id);
      return '<div class="x-skill-row"><span class="x-skill-icon tone-'+xesc(s.tone)+'" aria-hidden="true">'+xesc(s.name.charAt(0))+'</span>'
        +'<span class="x-skill-copy"><strong>'+xesc(s.name)+'</strong><span>'+xesc(s.desc)+'</span></span></div>';
    }).join('')+'</div>':'<div class="x-skill-empty">这位智能体暂未挂载技能</div>');
  var knHtml=knSecHtml(e);
  /* 概览一项项堆下去本来就长，知识按能力项还能再分好几组——分成顶部页签，一次只看一块，
     跟智能体详情页顶部「概览／知识／…」的页签是同一个思路，不再全部堆在一屏里 */
  $('#expertModalBody').innerHTML='<div class="modal-tabs" id="xdTabs" role="tablist" aria-label="智能体详情">'
    +'<button type="button" class="modal-tab active" id="xdTab-overview" role="tab" aria-selected="true" aria-controls="xdPane-overview" data-xdtab="overview">概览</button>'
    +'<button type="button" class="modal-tab" id="xdTab-skills" role="tab" aria-selected="false" aria-controls="xdPane-skills" tabindex="-1" data-xdtab="skills">技能</button>'
    +(knHtml?'<button type="button" class="modal-tab" id="xdTab-kn" role="tab" aria-selected="false" aria-controls="xdPane-kn" tabindex="-1" data-xdtab="kn">知识</button>':'')+'</div>'
    +'<div class="x-detail-pane" id="xdPane-overview" role="tabpanel" aria-labelledby="xdTab-overview" data-xdpane="overview">'+overview+'</div>'
    +'<div class="x-detail-pane hidden" id="xdPane-skills" role="tabpanel" aria-labelledby="xdTab-skills" data-xdpane="skills">'+skillsHtml+'</div>'
    +(knHtml?'<div class="x-detail-pane hidden" id="xdPane-kn" role="tabpanel" aria-labelledby="xdTab-kn" data-xdpane="kn">'+knHtml+'</div>':'');
  $('#expertModalFoot').innerHTML=knHtml?'<button type="button" class="modal-btn cancel hidden" id="xkDtlCancelBtn">取消</button><button type="button" class="modal-btn confirm hidden" id="xkDtlSaveBtn" data-x-save-kn="'+e.id+'">保存</button>':'';
  $('#expertModalFoot').className='modal-footer team-modal-footer';
  expertModal.classList.add('show');
}

export function initExpertLibrary() {
  document.addEventListener('lingee:asset-card-delete',event=>{if(event.detail?.kind==='expert')deleteMyExpert(event.detail.id);});
  expertModal?.addEventListener('keydown',function(event){
    const tab=event.target.closest('#xdTabs [role="tab"]');if(!tab)return;
    const tabs=Array.from(document.querySelectorAll('#xdTabs [role="tab"]'));
    let index=tabs.indexOf(tab);
    if(event.key==='ArrowRight')index=(index+1)%tabs.length;
    else if(event.key==='ArrowLeft')index=(index+tabs.length-1)%tabs.length;
    else if(event.key==='Home')index=0;
    else if(event.key==='End')index=tabs.length-1;
    else return;
    event.preventDefault();tabs[index].click();tabs[index].focus();
  });
  $$('#expertTabs .tab').forEach(function(t){
    t.addEventListener('click',function(){
      $$('#expertTabs .tab').forEach(function(i){i.classList.remove('active')});
      t.classList.add('active');
      expertTab=t.getAttribute('data-etab');
      renderExpertGrid();
    });
  });
  document.querySelector('[data-layer-tabs="team"]')?.addEventListener('click',function(e){var btn=e.target.closest('[data-layer]');if(btn){teamLayer=btn.dataset.layer;renderExpertGrid();}});
  document.addEventListener('cv-workspace-change',renderExpertGrid);
  if(expertSearchInput) expertSearchInput.addEventListener('input',function(){ expertKw=this.value; renderExpertGrid(); });
  if(expertGrid) expertGrid.addEventListener('click',function(e){
    if(handleLayerAction(e)){renderExpertGrid();return;}
    var ct=e.target.closest('[data-call-team]');
    if(ct){ summon('team',ct.getAttribute('data-call-team')); return; }
    var ce=e.target.closest('[data-call-expert]');
    if(ce){ summon('expert',ce.getAttribute('data-call-expert')); return; }
    var tc=e.target.closest('[data-team]'); if(tc){ openTeamModal(tc.getAttribute('data-team')); return; }
    var ec=e.target.closest('[data-expert]'); if(ec){ openExpertModal(ec.getAttribute('data-expert')); return; }
  });
  if(expertModal) expertModal.addEventListener('click',function(e){
    if(e.target===expertModal||e.target.closest('[data-x-close]')){ expertModal.classList.remove('show'); return; }
    var xt=e.target.closest('[data-xdtab]');
    if(xt){
      var key=xt.getAttribute('data-xdtab');
      xdTab=key;
      $$('#xdTabs .modal-tab').forEach(function(b){var selected=b.getAttribute('data-xdtab')===key;b.classList.toggle('active',selected);b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
      $$('#expertModalBody .x-detail-pane').forEach(function(p){ p.classList.toggle('hidden', p.getAttribute('data-xdpane')!==key); });
      var sv=$('#xkDtlSaveBtn'), cc=$('#xkDtlCancelBtn');
      if(sv) sv.classList.toggle('hidden', key!=='kn');
      if(cc) cc.classList.toggle('hidden', key!=='kn');
      expertModal.classList.toggle('expert-show-knowledge',key==='kn');
      return;
    }
    var sk=e.target.closest('[data-x-save-kn]');
    if(sk){ saveKnDetail(EX[sk.getAttribute('data-x-save-kn')]); return; }
    if(e.target.closest('#xkDtlCancelBtn')){ resetKnDetail(); expertModal.classList.remove('show'); return; }
    var ed=e.target.closest('[data-x-edit]');
    if(ed){ expertModal.classList.remove('show'); openExpertEditor(ed.getAttribute('data-x-edit')); return; }
    var sb=e.target.closest('[data-x-submit]');
    if(sb){ if(EX[sb.getAttribute('data-x-submit')]) submitAssetForReview('expert',EX[sb.getAttribute('data-x-submit')]); return; }
    var dl=e.target.closest('[data-x-del]');
    if(dl){ deleteMyExpert(dl.getAttribute('data-x-del')); return; }
    var cl=e.target.closest('[data-x-call]');
    if(cl){
      expertModal.classList.remove('show');
      summon('expert',cl.getAttribute('data-x-call'));
      return;
    }
    var c=e.target.closest('[data-cmd]');
    if(c){
      var eid=c.getAttribute('data-cmd-of');
      expertModal.classList.remove('show');
      summon('expert',eid,c.getAttribute('data-cmd'));
    }
  });
}

export { expertModal, expertTab, facesHtml, openExpertModal, renderExpertGrid };
