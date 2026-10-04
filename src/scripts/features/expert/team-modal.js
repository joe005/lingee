import { submitAssetForReview } from './asset-review.js';
import { layerOf, layerVisible } from './layers.js';
import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { summon } from './automatch.js';
import { renderExpertChips } from './chips.js';
import { EX, EXPERTS, STAGE_MODES, TEAM_STAGE_SCENARIOS, xav, xesc } from './data.js';
import { openExpertEditor } from './editor.js';
import { openExpertModal, renderExpertGrid } from './library.js';
import { TEAMS, activePick, clearPick, saveTeams, set_TEAMS, teamById } from './store.js';
import { startAssetEditChat } from '../composer.js';
import { hideAssetEditorPanel, showAssetEditorPanel } from './editor-panel.js';
/* 智能体团队配置弹窗与添加成员
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 智能体团队配置弹窗 ---------- */
var teamModal=$('#teamModal'), teamDraft=null, teamEditingId=null, teamModalTab='info', teamStageScenarioId='feature', teamStageSelectedId='', teamEditMode=false;
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
  teamStageScenarioId='feature';
  teamStageSelectedId='';
  teamDraft={name:t.name,desc:t.desc,leadId:t.leadId,members:t.members.slice(),preset:layerOf('team',t)!=='personal',
               domains:(t.domains||[]).slice(),
               stageMembers:t.stageMembers&&typeof t.stageMembers==='object'?Object.fromEntries(Object.entries(t.stageMembers).map(function(entry){return [entry[0],Array.isArray(entry[1])?entry[1].slice():[]]})): {},
               cmds:(t.cmds&&t.cmds.length)?t.cmds.map(function(c){return c.slice()}):[['','']]};
  /* 信息栏里名称就是标题（状态和 id 在它旁边），居中弹窗仍带「智能体团队详情 · 」前缀 */
  $('#teamModalTitle').textContent = (!teamDraft.preset&&!teamEditMode)?'智能体团队详情 · '+t.name:t.name;
  /* 内置团：标题已经是名字，正文只留一句话说明，不重复摆一份只读表单；
     自建团：正常的可编辑名称 + 说明 */
  $('#teamEditFields').classList.toggle('hidden', teamDraft.preset||!teamEditMode);
  $('#teamViewDesc').classList.toggle('hidden', !teamDraft.preset&&teamEditMode);
  $('#teamViewDesc').textContent=teamDraft.desc;
  $('#teamName').value=teamDraft.name; $('#teamDesc').value=teamDraft.desc;
  setTeamPanelBadge(false);
  $('#teamModalSub').textContent=t.id||'';
  $('#teamResetBtn').hidden=!(teamEditMode&&!teamDraft.preset);
  /* 内置团最常用的动作是发起对话，主按钮给它；自建团主按钮还是保存 */
  $('#teamSaveBtn').className = 'modal-btn '+(teamDraft.preset?'cancel':'confirm')+' team-panel-btn-save';
  if(!teamDraft.preset)$('#teamSaveBtn').className='modal-btn cancel team-panel-btn-save';
  $('#teamSaveBtn').classList.toggle('hidden', teamDraft.preset||!teamEditMode);
  $('#teamSubmitReviewBtn').classList.toggle('hidden', teamDraft.preset||!teamEditMode);
  $('#teamCallBtn').className = 'modal-btn '+(teamDraft.preset?'confirm':'cancel')+' team-panel-btn-test';
  $('#teamCallBtn').classList.toggle('hidden', !teamEditingId);
  /* 个人开发的详情在底部给「删除／取消／编辑／提交审核」，和智能体详情一致；保存和测试只在对话侧栏的编辑区 */
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
      +(d.leadId===id?'<span class="x-badge x-badge-lead">组长</span>':'')
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
  $('#teamCmdHint').textContent = d.preset
    ? '点任意一条就会带着这个团开一个新会话。'
    : '用户平时会怎么找这个团做事。点「发起对话」会带上第一条。';

  renderTeamStages();

  $$('#teamMembers .x-member-a').forEach(function(a){ a.classList.toggle('hidden', !!d.preset||!teamEditMode); });
  $('#teamAddBtn').classList.toggle('hidden', !!d.preset||!teamEditMode);
}
function renderTeamStages(){
  if(!teamDraft)return;
  var scenario=TEAM_STAGE_SCENARIOS.find(function(item){return item.id===teamStageScenarioId})||TEAM_STAGE_SCENARIOS[0];
  $('#teamStageScenarios').innerHTML=TEAM_STAGE_SCENARIOS.map(function(item){
    var on=item.id===scenario.id;
    return '<button type="button" class="team-stage-scenario'+(on?' active':'')+'" data-team-scenario="'+xesc(item.id)+'" aria-pressed="'+on+'"><strong>'+xesc(item.name)+'</strong><small>'+item.stages.length+' 个阶段</small></button>';
  }).join('');
  $('#teamStageScenarioTitle').textContent=scenario.name;
  $('#teamStageScenarioHint').textContent=scenario.hint+'，例如：'+scenario.example;
  $('#teamStageScenarioCount').textContent=scenario.stages.length+' 个阶段';
  var modes=new Set(teamDraft.members.flatMap(function(id){return EX[id]?.modes||[]}));
  function boundMembers(stage){
    var explicit=teamDraft.stageMembers[stage.id];
    if(Array.isArray(explicit)&&explicit.length)return explicit.filter(function(id){return teamDraft.members.includes(id)&&EX[id]});
    return teamDraft.members.filter(function(id){return (STAGE_MODES[stage.id]||[]).some(function(mode){return (EX[id]?.modes||[]).includes(mode);});}).slice(0,3);
  }
  if(!scenario.stages.length){$('#teamStages').innerHTML='<div class="team-stage-empty">当前路径暂无阶段</div>';return;}
  $('#teamStages').innerHTML=scenario.stages.map(function(stage,index){
    var covered=(STAGE_MODES[stage.id]||[]).some(function(mode){return modes.has(mode)});
    var bound=boundMembers(stage);
    var binding=bound.length?bound.map(function(id){
      var expert=EX[id];
      return '<span class="team-stage-member" title="'+xesc(expert.name)+'"><img src="'+xav(expert.k)+'" alt=""><span>'+xesc(expert.name)+'</span></span>';
    }).join(''):'<span class="team-stage-member-empty">未绑定智能体</span>';
    var picker=!teamDraft.preset&&teamEditMode?'<details class="team-stage-member-picker"><summary>绑定专家 <em>'+bound.length+'</em></summary><div class="team-stage-member-options" role="group" aria-label="'+xesc(stage.name)+'绑定智能体">'+teamDraft.members.map(function(id){
      var expert=EX[id],selected=bound.includes(id);
      return '<button type="button" class="team-stage-member-option'+(selected?' is-selected':'')+'" data-stage-member="'+xesc(stage.id)+'" data-stage-expert="'+xesc(id)+'" aria-pressed="'+selected+'"><img src="'+xav(expert.k)+'" alt=""><span>'+xesc(expert.name)+'</span></button>';
    }).join('')+'</div></details>':'';
    return '<div class="team-stage" role="listitem"><span class="team-stage-index">'+(index+1)+'</span>'
      +'<div class="team-stage-content"><strong>'+xesc(stage.name)+(covered?'':'<span class="team-stage-gap" title="当前成员暂无对应工作模式">能力待补齐</span>')+'</strong><p>'+xesc(stage.desc)+'</p></div>'
      +'<div class="team-stage-members">'+binding+picker+'</div></div>';
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
      +'<span class="x-mrow-m">'+e.modes.join(' / ')+'</span></span></button>';
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
      if(n=e.target.closest('[data-team-scenario]')){ teamStageScenarioId=n.getAttribute('data-team-scenario');renderTeamStages();return; }
      if(n=e.target.closest('[data-stage-member]')){
        var stageId=n.getAttribute('data-stage-member'),expertId=n.getAttribute('data-stage-expert');
        var current=Array.isArray(teamDraft.stageMembers[stageId])&&teamDraft.stageMembers[stageId].length?teamDraft.stageMembers[stageId].filter(function(id){return teamDraft.members.includes(id)}):teamDraft.members.filter(function(id){return (STAGE_MODES[stageId]||[]).some(function(mode){return (EX[id]?.modes||[]).includes(mode);});}).slice(0,3);
        if(current.includes(expertId)){if(current.length===1){toast('每个阶段至少绑定一位智能体','warning');return;}current=current.filter(function(id){return id!==expertId;});}
        else current.push(expertId);
        teamDraft.stageMembers[stageId]=current;markTeamDirty();renderTeamStages();return;
      }
      if(n=e.target.closest('[data-team-cmd]')){
        if(!teamEditingId){ toast('先保存这个智能体团队，再对话','warning'); return; }
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
      if(!teamEditingId){ toast('先保存这个智能体团队，再对话','warning'); return; }
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
      if(!window.confirm('删除智能体团队「'+t.name+'」？此操作不可撤销。')) return;
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
      if(!name){ setTeamModalTab('info'); toast('请填写智能体团队名称','warning'); $('#teamName').focus(); return; }
      if(!d.members.length){ setTeamModalTab('info'); toast('至少需要一位成员','warning'); return; }
      var t=teamById(teamEditingId);
      if(!t||layerOf('team',t)!=='personal') return;
      var previous=JSON.parse(JSON.stringify(t));
      t.name=name; t.desc=d.desc; t.leadId=d.leadId; t.members=d.members.slice(); t.cmds=teamCmdList(d);
      t.stageMembers=Object.fromEntries(TEAM_STAGE_SCENARIOS.flatMap(function(item){return item.stages;}).map(function(stage){
        var explicit=Array.isArray(d.stageMembers[stage.id])?d.stageMembers[stage.id].filter(function(id){return d.members.includes(id)&&EX[id]}):[];
        var fallback=d.members.filter(function(id){return (STAGE_MODES[stage.id]||[]).some(function(mode){return (EX[id]?.modes||[]).includes(mode);});}).slice(0,3);
        return [stage.id,(explicit.length?explicit:fallback).slice()];
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
