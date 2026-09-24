import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { summon } from './automatch.js';
import { renderExpertChips } from './chips.js';
import { EX, EXPERTS, STAGES, xav, xesc } from './data.js';
import { openExpertEditor } from './editor.js';
import { openExpertModal, renderExpertGrid } from './library.js';
import { TEAMS, activePick, clearPick, saveTeams, set_TEAMS, teamById, teamLint } from './store.js';
/* 专家团配置弹窗与添加成员
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 专家团配置弹窗 ---------- */
var teamModal=$('#teamModal'), teamDraft=null, teamEditingId=null, teamModalTab='info';
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
  var t=id?teamById(id):null;
  if(!t) return;
  teamEditingId=id;
  teamDraft={name:t.name,desc:t.desc,leadId:t.leadId,members:t.members.slice(),preset:!!t.preset,
               domains:(t.domains||[]).slice(),
               cmds:(t.cmds&&t.cmds.length)?t.cmds.map(function(c){return c.slice()}):[['','']]};
  $('#teamModalTitle').textContent = t.name;
  /* 内置团：标题已经是名字，正文只留一句话说明，不重复摆一份只读表单；
     自建团：正常的可编辑名称 + 说明 */
  $('#teamEditFields').classList.toggle('hidden', teamDraft.preset);
  $('#teamViewDesc').classList.toggle('hidden', !teamDraft.preset);
  $('#teamViewDesc').textContent=teamDraft.desc;
  $('#teamName').value=teamDraft.name; $('#teamDesc').value=teamDraft.desc;
  $('#teamSaveBtn').textContent = '保存';
  /* 内置团最常用的动作是发起对话，主按钮给它；自建团主按钮还是保存 */
  $('#teamSaveBtn').className = 'modal-btn '+(teamDraft.preset?'cancel':'confirm');
  $('#teamSaveBtn').classList.toggle('hidden', teamDraft.preset);
  $('#teamCallBtn').className = 'modal-btn '+(teamDraft.preset?'confirm':'cancel');
  $('#teamCallBtn').classList.toggle('hidden', !teamEditingId);
  $('#teamDeleteBtn').classList.toggle('hidden', teamDraft.preset || !teamEditingId);
  renderTeamModal();
  setTeamModalTab('info');
  var body=$('#teamModal .modal-body'); if(body) body.scrollTop=0;
  teamModal.classList.add('show');
  if(!teamDraft.preset) setTimeout(function(){ $('#teamName').focus(); },40);
}
function renderTeamModal(){
  var d=teamDraft; if(!d) return;
  $('#teamCount').textContent=d.members.length;
  $('#teamMembers').innerHTML = d.members.length ? d.members.map(function(id){
    var e=EX[id];
    return '<div class="x-member"><img src="'+xav(e.k)+'" alt="" data-view-expert="'+id+'">'
      +'<div class="x-member-b" data-view-expert="'+id+'"><div class="x-member-n">'+xesc(e.name)
      +(d.leadId===id?'<span class="x-badge x-badge-lead">组长</span>':'')
      +(e.ro?'<span class="x-badge x-badge-ro">只读</span>':'')+'</div></div>'
      +'<div class="x-member-a">'
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
        return '<div class="x-cmd-row"><input type="text" class="x-cmd-k" data-tm-cmd="'+i+'" data-f="0" value="'+xesc(c[0])+'" placeholder="用户会怎么说，例如：帮我把这个想法做成能上线的功能" autocomplete="off">'
          +'<button type="button" class="x-ic x-ic-dg" data-tm-rmcmd="'+i+'" title="删除">✕</button></div>';
      }).join('');
  $('#teamAddCmd').classList.toggle('hidden', !!d.preset);
  $('#teamCmdHint').textContent = d.preset
    ? '点任意一条就会带着这个团开一个新会话。'
    : '用户平时会怎么找这个团做事。点「发起对话」会带上第一条。';

  var warns=teamLint(d);
  $('#teamWarnings').innerHTML = warns.map(function(w){
    return '<div class="x-warn"><span>⚠</span><span>'+xesc(w)+'</span></div>'; }).join('');

  var stagesEl=$('#teamStages');
  if(stagesEl) stagesEl.innerHTML = STAGES.map(function(s,i){
    return '<div class="team-stage" role="listitem">'
      +'<span class="team-stage-item"><span class="team-stage-idx">'+(i+1)+'</span>'
      +'<span class="team-stage-t"><span class="team-stage-n">'+xesc(s.name)+'</span>'
      +'<span class="team-stage-d">'+xesc(s.desc)+'</span></span></span>'
      +(i<STAGES.length-1?'<span class="team-stage-arrow" aria-hidden="true">›</span>':'')
      +'</div>';
  }).join('');

  $$('#teamMembers .x-member-a').forEach(function(a){ a.classList.toggle('hidden', !!d.preset); });
  $('#teamAddBtn').classList.toggle('hidden', !!d.preset);
}

/* ---------- 添加成员弹窗 ---------- */
var memberModal=$('#memberModal'), memberKw='';
function openMemberModal(){ memberKw=''; $('#memberSearchInput').value=''; renderMemberList(); memberModal.classList.add('show');
  setTimeout(function(){ $('#memberSearchInput').focus() },40); }
function renderMemberList(){
  $('#memberSelectedCount').textContent='已选 '+teamDraft.members.length+' 人';
  var kw=memberKw.trim().toLocaleLowerCase();
  var rows=EXPERTS.filter(function(e){ return !kw || (e.name+e.role+e.desc+e.tags.join()).toLocaleLowerCase().includes(kw); });
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
  if(teamModal){
    teamModal.addEventListener('click',function(e){
      if(e.target===teamModal){ teamModal.classList.remove('show'); return; }
      var n;
      if(n=e.target.closest('[data-team-tab]')){ setTeamModalTab(n.getAttribute('data-team-tab')); return; }
      if(n=e.target.closest('[data-team-cmd]')){
        if(!teamEditingId){ toast('先保存这个专家团，再对话','warning'); return; }
        teamModal.classList.remove('show');
        summon('team',teamEditingId,n.getAttribute('data-team-cmd')); return;
      }
      if(n=e.target.closest('[data-tm-rmcmd]')){
        teamDraft.cmds.splice(+n.getAttribute('data-tm-rmcmd'),1);
        if(!teamDraft.cmds.length) teamDraft.cmds.push(['','']);
        renderTeamModal(); return;
      }
      if(n=e.target.closest('[data-view-expert]')){
        var vid=n.getAttribute('data-view-expert'), vex=EX[vid];
        if(vex&&vex.mine) openExpertEditor(vid); else openExpertModal(vid);
        return;
      }
      if(n=e.target.closest('[data-set-lead]')){ teamDraft.leadId=n.getAttribute('data-set-lead'); renderTeamModal(); return; }
      if(n=e.target.closest('[data-rm-member]')){
        var id=n.getAttribute('data-rm-member');
        teamDraft.members=teamDraft.members.filter(function(m){return m!==id});
        if(teamDraft.leadId===id) teamDraft.leadId=teamDraft.members[0]||null;
        renderTeamModal(); return;
      }
    });
    $('#teamModalClose').addEventListener('click',function(){ teamModal.classList.remove('show') });
    $('#teamCancelBtn').addEventListener('click',function(){ teamModal.classList.remove('show') });
    $('#teamName').addEventListener('input',function(){ if(teamDraft.preset){ this.value=teamDraft.name; return; } teamDraft.name=this.value });
    $('#teamDesc').addEventListener('input',function(){ if(teamDraft.preset){ this.value=teamDraft.desc; return; } teamDraft.desc=this.value });
    $('#teamAddBtn').addEventListener('click',function(){ openMemberModal() });
    $('#teamAddCmd').addEventListener('click',function(){ teamDraft.cmds.push(['','']); renderTeamModal(); });
    $('#teamCallBtn').addEventListener('click',function(){
      if(!teamEditingId){ toast('先保存这个专家团，再对话','warning'); return; }
      teamModal.classList.remove('show');
      summon('team',teamEditingId);
    });
    teamModal.addEventListener('input',function(ev){
      var c=ev.target.closest('[data-tm-cmd]');
      if(c) teamDraft.cmds[+c.getAttribute('data-tm-cmd')][+c.getAttribute('data-f')]=c.value;
    });
    $('#teamDeleteBtn').addEventListener('click',function(){
      var t=teamById(teamEditingId); if(!t||t.preset) return;
      if(!window.confirm('删除专家团「'+t.name+'」？此操作不可撤销。')) return;
      set_TEAMS(TEAMS.filter(function(x){ return x.id!==t.id; }));
      if(activePick.kind==='team'&&activePick.id===t.id) clearPick();
      teamModal.classList.remove('show');
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
      if(!t||t.preset) return;
      t.name=name; t.desc=d.desc; t.leadId=d.leadId; t.members=d.members.slice(); t.cmds=teamCmdList(d);
      t.domains=(d.domains||[]).slice();
      toast('已保存','success');
      teamModal.classList.remove('show');
      saveTeams(); renderExpertGrid(); renderExpertChips();
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
      renderMemberList(); renderTeamModal();
    });
  }
}

export { openTeamModal };
