import { submitAssetForReview } from './asset-review.js';
import { layerOf, layerVisible } from './layers.js';
import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { summon } from './automatch.js';
import { renderExpertChips } from './chips.js';
import { EX, EXPERTS, STAGE_EXPERT_MAX, TEAM_STAGE_SCENARIOS, stageExperts, teamFeatureStages, xav, xesc } from './data.js';
import { openExpertEditor } from './editor.js';
import { openExpertModal, renderExpertGrid } from './library.js';
import { TEAMS, activePick, clearPick, saveTeams, set_TEAMS, teamById } from './store.js';
import { startAssetEditChat } from '../composer.js';
import { hideAssetEditorPanel, showAssetEditorPanel } from './editor-panel.js';
/* 专家团配置弹窗与添加成员
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 专家团配置弹窗 ---------- */
var teamModal=$('#teamModal'), teamDraft=null, teamEditingId=null, teamModalTab='info', teamEditMode=false;
/* 面板头部的保存状态：改过任何字段就切换成「未保存」，保存或还原后回到「已保存」 */
function setTeamPanelBadge(dirty){
  var badge=$('#teamModalBadge'); if(!badge) return;
  badge.textContent=dirty?'未保存':'已保存';
  badge.classList.toggle('is-dirty',!!dirty);
}
function markTeamDirty(){
  if(!teamDraft||teamDraft.preset||!teamEditMode) return;
  setTeamPanelBadge(true);
}
function setTeamModalTab(which){
  teamModalTab=which||'info';
  $$('#teamModal [data-team-tab]').forEach(function(el){
    var on=el.getAttribute('data-team-tab')===teamModalTab;
    el.classList.toggle('active',on); el.setAttribute('aria-selected',String(on)); el.tabIndex=on?0:-1;
  });
  $$('#teamModal [data-team-pane]').forEach(function(el){
    el.classList.toggle('hidden',el.getAttribute('data-team-pane')!==teamModalTab);
  });
}
function teamCmdList(d){
  return (d.cmds||[]).map(function(c){ return [String(c[0]||'').trim(),String(c[1]||'').trim()]; })
                     .filter(function(c){ return c[0]; });
}
function openTeamModal(id){
  var selected=id?teamById(id):null;
  if(selected)populateTeamModal(id,false);
}
function populateTeamModal(id,editing){
  var t=id?teamById(id):null;
  if(!t) return;
  teamEditMode=!!editing;
  teamEditingId=id;
  teamDraft={name:t.name,desc:t.desc,leadId:t.leadId,members:t.members.slice(),stages:t.stages,preset:layerOf('team',t)!=='personal',
               domains:(t.domains||[]).slice(),
               stageMembers:t.stageMembers&&typeof t.stageMembers==='object'?Object.fromEntries(Object.entries(t.stageMembers).map(function(entry){return [entry[0],Array.isArray(entry[1])?entry[1].slice():[]]})): {},
               cmds:(t.cmds&&t.cmds.length)?t.cmds.map(function(c){return c.slice()}):[['','']]};
  /* 信息栏里名称就是标题（状态和 id 在它旁边），居中弹窗仍带「专家团详情 · 」前缀 */
  $('#teamModalTitle').textContent = (!teamDraft.preset&&!teamEditMode)?'专家团详情 · '+t.name:t.name;
  /* 内置团：标题已经是名字，不重复摆一份只读表单；自建团编辑时显示可编辑的名称 + 说明 */
  $('#teamEditFields').classList.toggle('hidden', teamDraft.preset||!teamEditMode);
  $('#teamName').value=teamDraft.name; $('#teamDesc').value=teamDraft.desc;
  setTeamPanelBadge(false);
  $('#teamResetBtn').hidden=!(teamEditMode&&!teamDraft.preset);
  /* 内置团最常用的动作是发起对话，主按钮给它；自建团主按钮还是保存 */
  $('#teamSaveBtn').className = 'modal-btn '+(teamDraft.preset?'cancel':'confirm')+' team-panel-btn-save';
  if(!teamDraft.preset)$('#teamSaveBtn').className='modal-btn cancel team-panel-btn-save';
  $('#teamSaveBtn').classList.toggle('hidden', teamDraft.preset||!teamEditMode);
  $('#teamSubmitReviewBtn').classList.toggle('hidden', teamDraft.preset||!teamEditMode);
  $('#teamCallBtn').className = 'modal-btn '+(teamDraft.preset?'confirm':'cancel')+' team-panel-btn-test';
  $('#teamCallBtn').classList.toggle('hidden', !teamEditingId);
  /* 个人开发的详情在底部给「删除／取消／编辑／提交审核」，和专家详情一致；保存和测试只在对话侧栏的编辑区 */
  $('#teamViewFoot').classList.toggle('hidden', teamDraft.preset||teamEditMode||!teamEditingId);
  renderTeamModal();
  setTeamModalTab('info');
  var body=$('#teamModal .modal-body'); if(body) body.scrollTop=0;
  if(teamDraft.preset||!teamEditMode)teamModal.classList.add('show');
  else showAssetEditorPanel(teamModal);
}
function renderTeamModal(){
  var d=teamDraft; if(!d) return;
  $('#teamCount').textContent=d.members.length;
  $('#teamMembers').innerHTML = d.members.length ? d.members.map(function(id){
    var e=EX[id];
    return '<div class="x-member"><img src="'+xav(e.k)+'" alt="" data-view-expert="'+id+'">'
      +'<div class="x-member-b" data-view-expert="'+id+'"><div class="x-member-n">'+xesc(e.name)
      +(teamEditMode&&d.leadId===id?'<span class="x-badge x-badge-lead">组长</span>':'')
      +(e.ro?'<span class="x-badge x-badge-ro">只读</span>':'')
      +'</div></div>'
      +'<div class="x-member-a'+(teamEditMode?'':' hidden')+'">'
      +(d.leadId===id?'':'<button type="button" class="x-ic" data-set-lead="'+id+'" title="设为组长">☆</button>')
      +'<button type="button" class="x-ic x-ic-dg" data-rm-member="'+id+'" title="移出">✕</button></div></div>';
  }).join('') : '<div class="x-empty-sm">还没有成员</div>';

  $('#teamCmds').innerHTML = d.preset
    ? (d.cmds.filter(function(c){return c[0]}).map(function(c){
        return '<button type="button" class="x-cmd x-cmd-1" data-team-cmd="'+xesc(c[0])+'" title="'+xesc(c[1]||'')+'">'
          +'<span class="x-cmd-b"><span class="x-cmd-q">“'+xesc(c[0])+'”</span></span>'
          +'<svg class="x-cmd-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6.5A8 8 0 0 1 11 4h2a8 8 0 0 1 8 8z"/></svg>'
          +'</button>';
      }).join('') || '<div class="x-empty-sm">这个团还没有触发词</div>')
    : d.cmds.map(function(c,i){
        return '<div class="x-cmd-row"><input type="text" class="x-cmd-k" data-tm-cmd="'+i+'" data-f="0" value="'+xesc(c[0])+'" placeholder="用户会怎么说，例如：帮我把这个想法做成能上线的功能" autocomplete="off"'+(teamEditMode?'':' readonly')+'>'
          +'<button type="button" class="x-ic x-ic-dg'+(teamEditMode?'':' hidden')+'" data-tm-rmcmd="'+i+'" title="删除">✕</button></div>';
      }).join('');
  $('#teamAddCmd').classList.toggle('hidden', !!d.preset||!teamEditMode);

  renderTeamStages();

  $$('#teamMembers .x-member-a').forEach(function(a){ a.classList.toggle('hidden', !!d.preset||!teamEditMode); });
  $('#teamAddBtn').classList.toggle('hidden', !!d.preset||!teamEditMode);
}
/* 可选阶段（如智能体开发）：成员里有匹配的专家才出现，否则不显示、也不算能力缺口 */
function scenarioStages(item){
  /* 功能开发取团队自己的交付范围（内置团队固定，自建团队用默认 4 阶段）；缺陷修复固定为开发实现、测试验证 */
  return item.id==='feature'?teamFeatureStages(teamDraft):item.stages;
}
function visibleStages(item){
  return scenarioStages(item).filter(function(stage){
    return !stage.optional||stageExperts(stage.id,teamDraft.members,teamDraft.stageMembers[stage.id]).length>0;
  });
}
function renderTeamStages(){
  if(!teamDraft)return;
  function boundMembers(stage){
    /* 每个阶段 1~2 位：有人工绑定用绑定的，否则按能力项匹配 */
    return stageExperts(stage.id,teamDraft.members,teamDraft.stageMembers[stage.id]);
  }
  function stageHtml(stage,index){
    var bound=boundMembers(stage);
    var covered=bound.length>0;
    var binding=bound.length?bound.map(function(id){
      var expert=EX[id];
      return '<span class="team-stage-member" title="'+xesc(expert.name)+'"><img src="'+xav(expert.k)+'" alt=""><span>'+xesc(expert.name)+'</span></span>';
    }).join(''):'<span class="team-stage-member-empty">未绑定专家</span>';
    var picker=!teamDraft.preset&&teamEditMode?'<details class="team-stage-member-picker"><summary>绑定专家 <em>'+bound.length+'</em></summary><div class="team-stage-member-options" role="group" aria-label="'+xesc(stage.name)+'绑定专家">'+teamDraft.members.map(function(id){
      var expert=EX[id],selected=bound.includes(id);
      return '<button type="button" class="team-stage-member-option'+(selected?' is-selected':'')+'" data-stage-member="'+xesc(stage.id)+'" data-stage-expert="'+xesc(id)+'" aria-pressed="'+selected+'"><img src="'+xav(expert.k)+'" alt=""><span>'+xesc(expert.name)+'</span></button>';
    }).join('')+'</div></details>':'';
    /* 横向时间线：圆点 + 横线串起各阶段，阶段名和说明下面直接展示绑定的专家 */
    return '<div class="team-stage" role="listitem" aria-label="第'+(index+1)+'阶段：'+xesc(stage.name)+'"><span class="team-stage-dot" aria-hidden="true"></span>'
      +'<div class="team-stage-content"><strong>'+xesc(stage.name)+(covered?'':'<span class="team-stage-gap" title="当前成员没有匹配该阶段的能力项">能力待补齐</span>')+'</strong><p>'+xesc(stage.desc)+'</p>'
      +'<div class="team-stage-members">'+binding+picker+'</div></div></div>';
  }
  /* 每条开发流程（功能开发、缺陷修复）上下平铺，默认全部展开，不用切换 */
  $('#teamStages').innerHTML=TEAM_STAGE_SCENARIOS.map(function(item){
    var stages=visibleStages(item);
    return '<section class="team-stage-section" aria-label="'+xesc(item.name)+'"><div class="team-stage-section-head"><strong>'+xesc(item.name)+'</strong><small>'+stages.length+' 个阶段</small></div>'
      +(stages.length?'<div class="team-stage-timeline" role="list">'+stages.map(stageHtml).join('')+'</div>':'<div class="team-stage-empty">当前路径暂无阶段</div>')+'</section>';
  }).join('');
}

/* ---------- 添加成员弹窗 ---------- */
var memberModal=$('#memberModal'), memberKw='';
function openMemberModal(){ memberKw=''; $('#memberSearchInput').value=''; renderMemberList(); memberModal.classList.add('show');
  setTimeout(function(){ $('#memberSearchInput').focus() },40); }
function renderMemberList(){
  $('#memberSelectedCount').textContent='已选 '+teamDraft.members.length+' 人';
  var kw=memberKw.trim().toLocaleLowerCase();
  var rows=EXPERTS.filter(function(e){ return layerVisible('expert',e)&&(!kw || (e.name+e.role+e.desc+e.tags.join()).toLocaleLowerCase().includes(kw)); });
  $('#memberList').innerHTML = rows.length ? rows.map(function(e){
    var on=teamDraft.members.indexOf(e.id)>=0;
    return '<button type="button" class="x-mrow'+(on?' on':'')+'" data-toggle-member="'+e.id+'">'
      +'<img src="'+xav(e.k)+'" alt="">'
      +'<span class="x-mrow-b"><span class="x-mrow-n">'+xesc(e.name)
      +(on?'<span class="x-badge x-badge-lead">已加入</span>':'')
      +(e.ro?'<span class="x-badge x-badge-ro">只读</span>':'')+'</span>'
      +'<span class="x-mrow-d">'+xesc(e.desc)+'</span>'
      +'</span></button>';
  }).join('') : '<div class="x-empty-sm">没有匹配的专家</div>';
}
export function initTeamModal() {
  document.addEventListener('lingee:asset-edit-session',function(ev){
    if(ev.detail.kind==='team')populateTeamModal(ev.detail.id,true);
  });
  if(teamModal){
    teamModal.addEventListener('click',function(e){
      if(e.target===teamModal){ if(teamDraft&&!teamDraft.preset&&teamEditMode)hideAssetEditorPanel();else teamModal.classList.remove('show'); return; }
      var n;
      if(n=e.target.closest('[data-team-tab]')){ setTeamModalTab(n.getAttribute('data-team-tab')); return; }
      if(n=e.target.closest('[data-stage-member]')){
        var stageId=n.getAttribute('data-stage-member'),expertId=n.getAttribute('data-stage-expert');
        var current=stageExperts(stageId,teamDraft.members,teamDraft.stageMembers[stageId]);
        if(current.includes(expertId)){if(current.length===1){toast('每个阶段至少绑定一位专家','warning');return;}current=current.filter(function(id){return id!==expertId;});}
        else{if(current.length>=STAGE_EXPERT_MAX){toast('每个阶段最多绑定 '+STAGE_EXPERT_MAX+' 位专家，请先取消一位','warning');return;}current.push(expertId);}
        teamDraft.stageMembers[stageId]=current;markTeamDirty();renderTeamStages();return;
      }
      if(n=e.target.closest('[data-team-cmd]')){
        if(!teamEditingId){ toast('先保存这个专家团，再对话','warning'); return; }
        teamModal.classList.remove('show');
        summon('team',teamEditingId,n.getAttribute('data-team-cmd')); return;
      }
      if(n=e.target.closest('[data-tm-rmcmd]')){
        teamDraft.cmds.splice(+n.getAttribute('data-tm-rmcmd'),1);
        if(!teamDraft.cmds.length) teamDraft.cmds.push(['','']);
        markTeamDirty(); renderTeamModal(); return;
      }
      if(n=e.target.closest('[data-view-expert]')){
        var vid=n.getAttribute('data-view-expert'), vex=EX[vid];
        if(vex&&vex.mine)teamModal.classList.remove('show');
        if(vex&&vex.mine) openExpertEditor(vid); else openExpertModal(vid);
        return;
      }
      if(n=e.target.closest('[data-set-lead]')){ teamDraft.leadId=n.getAttribute('data-set-lead'); markTeamDirty(); renderTeamModal(); return; }
      if(n=e.target.closest('[data-rm-member]')){
        var id=n.getAttribute('data-rm-member');
        teamDraft.members=teamDraft.members.filter(function(m){return m!==id});
        if(teamDraft.leadId===id) teamDraft.leadId=teamDraft.members[0]||null;
        markTeamDirty(); renderTeamModal(); return;
      }
    });
    $('#teamResetBtn').addEventListener('click',function(){
      if(!teamEditingId||!teamEditMode)return;
      populateTeamModal(teamEditingId,true);
      toast('已还原为上次保存的内容','success');
    });
    $('#teamModalClose').addEventListener('click',function(){if(teamDraft&&!teamDraft.preset&&teamEditMode)hideAssetEditorPanel();else teamModal.classList.remove('show');});
    $('#teamCancelBtn').addEventListener('click',function(){if(teamDraft&&!teamDraft.preset&&teamEditMode)hideAssetEditorPanel();else teamModal.classList.remove('show');});
    $('#teamName').addEventListener('input',function(){ if(teamDraft.preset){ this.value=teamDraft.name; return; } teamDraft.name=this.value; markTeamDirty(); });
    $('#teamDesc').addEventListener('input',function(){ if(teamDraft.preset){ this.value=teamDraft.desc; return; } teamDraft.desc=this.value; markTeamDirty(); });
    $('#teamAddBtn').addEventListener('click',function(){ openMemberModal() });
    $('#teamAddCmd').addEventListener('click',function(){ teamDraft.cmds.push(['','']); markTeamDirty(); renderTeamModal(); });
    $('#teamCallBtn').addEventListener('click',function(){
      if(!teamEditingId){ toast('先保存这个专家团，再对话','warning'); return; }
      if(teamDraft&&!teamDraft.preset&&teamEditMode)hideAssetEditorPanel();else teamModal.classList.remove('show');
      summon('team',teamEditingId);
    });
    $('#teamEditBtn').addEventListener('click',function(){
      if(!teamEditingId)return;
      teamModal.classList.remove('show');
      startAssetEditChat('team',teamEditingId,teamDraft?.name||'');
    });
    $('#teamViewSubmitBtn').addEventListener('click',function(){
      var t=teamById(teamEditingId); if(!t||layerOf('team',t)!=='personal')return;
      submitAssetForReview('team',t);
    });
    teamModal.addEventListener('input',function(ev){
      var c=ev.target.closest('[data-tm-cmd]');
      if(c){ teamDraft.cmds[+c.getAttribute('data-tm-cmd')][+c.getAttribute('data-f')]=c.value; markTeamDirty(); }
    });
    $('#teamDeleteBtn').addEventListener('click',function(){
      var t=teamById(teamEditingId); if(!t||layerOf('team',t)!=='personal') return;
      if(!window.confirm('删除专家团「'+t.name+'」？此操作不可撤销。')) return;
      set_TEAMS(TEAMS.filter(function(x){ return x.id!==t.id; }));
      if(activePick.kind==='team'&&activePick.id===t.id) clearPick();
      hideAssetEditorPanel(); teamModal.classList.remove('show');
      saveTeams(); renderExpertGrid(); renderExpertChips();
      toast('已删除「'+t.name+'」','success');
    });
    $('#teamConfigForm').addEventListener('submit',function(ev){
      ev.preventDefault();
      var d=teamDraft;
      var name=(d.name||'').trim();
      if(!name){ setTeamModalTab('info'); toast('请填写专家团名称','warning'); $('#teamName').focus(); return; }
      if(!d.members.length){ setTeamModalTab('info'); toast('至少需要一位成员','warning'); return; }
      var t=teamById(teamEditingId);
      if(!t||layerOf('team',t)!=='personal') return;
      var previous=JSON.parse(JSON.stringify(t));
      t.name=name; t.desc=d.desc; t.leadId=d.leadId; t.members=d.members.slice(); t.cmds=teamCmdList(d);
      t.stageMembers=Object.fromEntries(TEAM_STAGE_SCENARIOS.flatMap(function(item){return scenarioStages(item);}).map(function(stage){
        return [stage.id,stageExperts(stage.id,d.members,d.stageMembers[stage.id])];
      }));
      t.domains=(d.domains||[]).slice();
      if(!saveTeams()){Object.assign(t,previous);toast('保存失败，编辑内容已保留，请重试','warning');return;}
      toast('已保存','success');
      hideAssetEditorPanel();
      document.dispatchEvent(new CustomEvent('lingee:asset-editor-saved',{detail:{kind:'team',id:t.id,name:t.name}}));
      renderExpertGrid(); renderExpertChips();
      if(ev.submitter?.id==='teamSubmitReviewBtn')submitAssetForReview('team',t);
    });
  }
  if(memberModal){
    $('#memberSearchInput').addEventListener('input',function(){ memberKw=this.value; renderMemberList(); });
    $('#memberModalClose').addEventListener('click',function(){ memberModal.classList.remove('show') });
    $('#memberDoneBtn').addEventListener('click',function(){ memberModal.classList.remove('show') });
    memberModal.addEventListener('click',function(e){
      if(e.target===memberModal){ memberModal.classList.remove('show'); return; }
      var n=e.target.closest('[data-toggle-member]'); if(!n) return;
      var id=n.getAttribute('data-toggle-member'), i=teamDraft.members.indexOf(id);
      if(i<0){ teamDraft.members.push(id); if(!teamDraft.leadId) teamDraft.leadId=id; }
      else { teamDraft.members.splice(i,1); if(teamDraft.leadId===id) teamDraft.leadId=teamDraft.members[0]||null; }
      markTeamDirty(); renderMemberList(); renderTeamModal();
    });
  }
}

export { openTeamModal };
