import { $, $$ } from '../../core/dom.js';
import { summon } from './automatch.js';
import { EX, EXPERTS, compChip, phraseHtml, xav, xesc } from './data.js';
import { deleteMyExpert, openExpertEditor } from './editor.js';
import { TEAMS, activeGates, teamDomains } from './store.js';
import { openTeamModal } from './team-modal.js';
/* 专家库视图与专家详情弹窗
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 专家库视图 ---------- */
var expertTab='team', expertKw='';
var expertGrid=$('#expertGrid');
function facesHtml(ids,n){
  return '<span class="x-faces">'+ids.slice(0,n||4).map(function(i){
    return '<img src="'+xav(EX[i].k)+'" alt="">'; }).join('')+'</span>';
}
function renderExpertGrid(){
  if(!expertGrid) return;
  var si=$('#expertSearchInput');
  if(si && si.value!==expertKw) si.value=expertKw;
  var kw=expertKw.trim(), html='';
  if(expertTab==='team'){
    var rows=TEAMS.filter(function(t){
      if(!kw) return true;
      return (t.name+t.desc+teamDomains(t).join()+t.members.map(function(m){return EX[m].name}).join()).indexOf(kw)>=0;
    });
    html=rows.map(function(t){
      var gn=activeGates(t).length;
      return '<div class="app-card x-card" data-team="'+t.id+'">'
        +'<button type="button" class="x-call" data-call-team="'+t.id+'" title="召唤这个专家团">召唤</button>'
        +'<div class="card-top">'+facesHtml(t.members,4)
        +'<div class="card-titles"><div class="card-title-row"><span class="card-title">'+xesc(t.name)+'</span>'
        +(t.preset?'<span class="x-badge">内置</span>':'')+'</div>'
        +'<div class="x-sub">'+xesc(t.by)+' · '+t.members.length+' 位专家'
        +(gn?' · <span class="x-sub-gate">'+gn+' 个人工确认</span>':'')+'</div></div></div>'
        +'<div class="card-desc">'+xesc(t.desc)+'</div>'
        +'<div class="card-tags">'
        +teamDomains(t).slice(0,4).map(function(g){return '<span class="ptag">'+xesc(g)+'</span>'}).join('')+'</div></div>';
    }).join('');
  }else{
    var rows2=EXPERTS.filter(function(e){
      if(!kw) return true;
      return (e.name+e.role+e.desc+e.tags.join()).indexOf(kw)>=0;
    });
    html=rows2.map(function(e){
      return '<div class="app-card x-card" data-expert="'+e.id+'">'
        +'<button type="button" class="x-call" data-call-expert="'+e.id+'" title="召唤这位专家">召唤</button>'
        +'<div class="card-top"><img class="x-av" src="'+xav(e.k)+'" alt="">'
        +'<div class="card-titles"><div class="card-title-row"><span class="card-title">'+xesc(e.name)+'</span>'
        +(e.ro?'<span class="x-badge x-badge-ro">只读</span>':'')
        +(e.mine?'<span class="x-badge x-badge-mine">我创建的</span>':'')+'</div>'
        +'<div class="x-sub">'+xesc(e.role)+' · '+xesc(e.by)+'</div></div></div>'
        +'<div class="card-desc">'+xesc(e.desc)+'</div>'
        +'<div class="card-tags">'+e.tags.slice(0,3).map(function(t){return '<span class="ptag">'+xesc(t)+'</span>'}).join('')+'</div>'
        +'<div class="x-modes" title="可承担 '+xesc(e.modes.join(' / '))+'"><span class="x-modes-k">可承担</span>'
        +e.modes.slice(0,3).map(function(m){return '<span class="x-mode">'+xesc(m)+'</span>'}).join('')
        +(e.modes.length>3?'<span class="x-mode x-mode-more">+'+(e.modes.length-3)+'</span>':'')+'</div></div>';
    }).join('');
  }
  if(!kw) html += expertTab==='team'
    ? '<button type="button" class="app-card x-new-card" data-new-team><span class="x-new-ic">＋</span><span>新建专家团</span>'
      +'<span class="x-new-sub">从专家库里挑几个人，定好交付强度</span></button>'
    : '<button type="button" class="app-card x-new-card" data-new-expert><span class="x-new-ic">＋</span><span>创建专家</span>'
      +'<span class="x-new-sub">手填表单，或一句话交给 expert-manager</span></button>';
  expertGrid.innerHTML = html || '<div class="x-empty">没有匹配的结果</div>';
  var tc=$('#teamTabCount'), ec=$('#expertTabCount');
  if(tc) tc.textContent=TEAMS.length;
  if(ec) ec.textContent=EXPERTS.length;
  var lb=$('#newExpertEntryLabel');
  if(lb) lb.textContent = expertTab==='team' ? '新建专家团' : '创建专家';
}
var expertSearchInput=$('#expertSearchInput');

/* ---------- 专家详情弹窗 ---------- */
var expertModal=$('#expertModal');
function openExpertModal(id){
  var e=EX[id]; if(!e) return;
  $('#expertModalHead').innerHTML='<div class="x-detail-head"><img class="x-av-lg" src="'+xav(e.k)+'" alt="">'
    +'<div><div class="modal-title">'+xesc(e.name)+(e.ro?' <span class="x-badge x-badge-ro">只读</span>':'')+'</div>'
    +'<div class="x-sub">'+xesc(e.role)+' · '+xesc(e.by)+'</div></div></div>'
    +'<button class="modal-close" type="button" data-x-close aria-label="关闭">×</button>';
  function list(title,arr){ return (arr&&arr.length)?'<div class="x-sec"><div class="x-sec-t">'+title+'</div><ul class="x-ul">'
    +arr.map(function(v){return '<li>'+xesc(v)+'</li>'}).join('')+'</ul></div>':''; }
  $('#expertModalBody').innerHTML='<div class="x-sec x-desc">'+xesc(e.desc)+'</div>'
    +(e.cmds.length?'<div class="x-sec"><div class="x-sec-t">常见触发词</div>'
    +e.cmds.map(function(c){return '<button type="button" class="x-cmd" data-cmd="'+xesc(c[0])+'" data-cmd-of="'+e.id+'">'
      +'<span class="x-cmd-b"><span class="x-cmd-q">“'+phraseHtml(c[0])+'”</span>'
      +(c[1]?'<span class="x-cmd-d">'+xesc(c[1])+'</span>':'')+'</span>'
      +'<svg class="x-cmd-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 0 1 11 4h2a8 8 0 0 1 8 8z"/></svg>'
      +'</button>'}).join('')+'</div>':'')
    +(e.skills?'<div class="x-sec"><div class="x-sec-t">挂载技能</div><div class="x-chips">'+e.skills.map(function(k){return '<span class="ptag">'+xesc(k)+'</span>'}).join('')+'</div></div>':'')
    +'<div class="x-sec"><div class="x-sec-t">能力项</div><div class="x-chips">'+e.comp.map(compChip).join('')+'</div></div>'
    +'<div class="x-sec"><div class="x-sec-t">可承担的工作</div><div class="x-chips">'+e.modes.map(function(m){return '<span class="ptag">'+xesc(m)+'</span>'}).join('')+'</div></div>'
;
  $('#expertModalFoot').innerHTML=
    (e.mine?'<button type="button" class="btn-link team-delete-btn" data-x-del="'+e.id+'">删除该专家</button>':'')
    +'<div class="team-footer-spacer"></div>'
    +(e.mine?'<button type="button" class="modal-btn cancel" data-x-edit="'+e.id+'">编辑</button>':'')
    +'<button type="button" class="modal-btn confirm" data-x-call="'+e.id+'">召唤专家</button>';
  $('#expertModalFoot').className='modal-footer team-modal-footer';
  expertModal.classList.add('show');
}

export function initExpertLibrary() {
  $$('#expertTabs .tab').forEach(function(t){
    t.addEventListener('click',function(){
      $$('#expertTabs .tab').forEach(function(i){i.classList.remove('active')});
      t.classList.add('active');
      expertTab=t.getAttribute('data-etab');
      renderExpertGrid();
    });
  });
  if(expertSearchInput) expertSearchInput.addEventListener('input',function(){ expertKw=this.value; renderExpertGrid(); });
  if(expertGrid) expertGrid.addEventListener('click',function(e){
    var ct=e.target.closest('[data-call-team]');
    if(ct){ summon('team',ct.getAttribute('data-call-team')); return; }
    var ce=e.target.closest('[data-call-expert]');
    if(ce){ summon('expert',ce.getAttribute('data-call-expert')); return; }
    if(e.target.closest('[data-new-team]')){ openTeamModal(null); return; }
    if(e.target.closest('[data-new-expert]')){ openExpertEditor(null); return; }
    var tc=e.target.closest('[data-team]'); if(tc){ openTeamModal(tc.getAttribute('data-team')); return; }
    var ec=e.target.closest('[data-expert]'); if(ec){ openExpertModal(ec.getAttribute('data-expert')); return; }
  });
  if(expertModal) expertModal.addEventListener('click',function(e){
    if(e.target===expertModal||e.target.closest('[data-x-close]')){ expertModal.classList.remove('show'); return; }
    var ed=e.target.closest('[data-x-edit]');
    if(ed){ expertModal.classList.remove('show'); openExpertEditor(ed.getAttribute('data-x-edit')); return; }
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
