import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { summon } from './automatch.js';
import { renderExpertChips } from './chips.js';
import { EX, EXPERTS, GATE_ICON, compChip, teamCoverage, xav, xesc } from './data.js';
import { openExpertEditor } from './editor.js';
import { expertTab, openExpertModal, renderExpertGrid } from './library.js';
import { TEAMS, activeGates, activePick, clearPick, hasGate, saveTeams, set_TEAMS, teamById, teamFlow, teamGates, teamLint, toggleGate } from './store.js';
/* 专家团配置弹窗与添加成员
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 专家团配置弹窗 ---------- */
var teamModal=$('#teamModal'), teamDraft=null, teamEditingId=null;
function setTeamTab(which){
  $$('#teamTabs .modal-tab').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-ttab')===which); });
  $$('#teamModal .team-pane').forEach(function(el){ el.classList.toggle('hidden', el.getAttribute('data-tpane')!==which); });
  var body=$('#teamModal .modal-body'); if(body) body.scrollTop=0;
}
function teamCmdList(d){
  return (d.cmds||[]).map(function(c){ return [String(c[0]||'').trim(),String(c[1]||'').trim()]; })
                     .filter(function(c){ return c[0]; });
}
function openTeamModal(id){
  var t=id?teamById(id):null;
  teamEditingId=id||null;
  teamDraft=t?{name:t.name,desc:t.desc,leadId:t.leadId,members:t.members.slice(),preset:!!t.preset,
               domains:(t.domains||[]).slice(),gates:teamGates(t).slice(),
               cmds:(t.cmds&&t.cmds.length)?t.cmds.map(function(c){return c.slice()}):[['','']]}
            :{name:'',desc:'',leadId:'software-team-lead',members:['software-team-lead','software-engineer'],preset:false,
               domains:[],gates:['implement'],
               cmds:[['','']]};
  $('#teamModalTitle').textContent = t?t.name:'新建专家团';
  $('#teamReadonlyTip').classList.toggle('hidden', !teamDraft.preset);
  $('#teamName').value=teamDraft.name; $('#teamDesc').value=teamDraft.desc;
  $('#teamName').readOnly=teamDraft.preset; $('#teamDesc').readOnly=teamDraft.preset;
  $('#teamName').classList.toggle('x-ro',teamDraft.preset);
  $('#teamDesc').classList.toggle('x-ro',teamDraft.preset);
  $('#teamSaveBtn').textContent = teamDraft.preset?'另存为我的专家团':'保存';
  /* 内置团最常用的动作是召唤，主按钮给它；自建团主按钮还是保存 */
  $('#teamSaveBtn').className = 'modal-btn '+(teamDraft.preset?'cancel':'confirm');
  $('#teamCallBtn').className = 'modal-btn '+(teamDraft.preset?'confirm':'cancel');
  $('#teamCallBtn').classList.toggle('hidden', !teamEditingId);
  $('#teamDeleteBtn').classList.toggle('hidden', teamDraft.preset || !teamEditingId);
  setTeamTab('base');
  renderTeamModal();
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
      +(e.ro?'<span class="x-badge x-badge-ro">只读</span>':'')+'</div>'
      +'<div class="x-member-r">'+xesc(e.role)+' · 可承担 '+e.modes.join(' / ')+'</div></div>'
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
    : '用户平时会怎么找这个团做事。点「召唤专家团」会带上第一条。';

  var flow=teamFlow(d);
  var gates=activeGates(d,flow);
  $('#teamFlow').innerHTML = flow.map(function(s,i){
    var h=(i?'<span class="x-ar">→</span>':'')
      +'<div class="x-node'+(s.who?'':' miss')+'">'
      +(s.who?'<img src="'+xav(EX[s.who].k)+'" alt="">':'')
      +'<div><b>'+s.title+'<span class="x-kind">'+s.k+'</span></b>'
      +'<i>'+(s.who?EX[s.who].name:'⚠ 无人可领')+'</i></div></div>';
    if(hasGate(d,s.id)){
      h+='<span class="x-ar">→</span>'
        +'<div class="x-gate" title="'+xesc(s.title)+'完成后暂停，等人确认才继续">'
        +GATE_ICON+'<div><b>人工确认<span class="x-kind">gate</span></b>'
        +'<i>'+xesc(s.title)+'后</i></div>'
        +(d.preset?'':'<button type="button" class="x-ic x-ic-dg" data-gate-off="'+s.id+'" title="移除这个确认节点">✕</button>')
        +'</div>';
    }else if(!d.preset){
      h+='<button type="button" class="x-gate-add" data-gate-on="'+s.id+'" title="在「'+xesc(s.title)+'」之后插入人工确认">＋</button>';
    }
    return h;
  }).join('');
  $('#teamGateHint').textContent = d.preset
    ? (gates.length?'这个团在 '+gates.length+' 个步骤后需要人工确认，内置团不可改。':'这个团全程自动流转，没有人工确认节点。')
    : '点步骤之间的 ＋ 可插入人工审核确认节点，到这里编排会暂停等人点过才继续。';

  var cov=teamCoverage(d);
  $('#teamCoverageChips').innerHTML = cov.length
    ? cov.map(function(c){ return compChip(c); }).join('')
    : '<div class="x-empty-sm">还没有成员，能力覆盖为空</div>';

  $('#teamModeNote').innerHTML='<span>ⓘ</span><span>'+(d.members.length>1
    ? d.members.length+' 位成员 → 以 <code>mode: team</code> 运行，任务在成员间按依赖顺序流转。'
    : '单一成员 → 以 <code>mode: personal</code> 运行，串行执行，保留 attempt 隔离与重试。')
    +(gates.length?' 其中 '+gates.length+' 个步骤后会停下来等人确认，确认前不进入下一步。':'')+'</span>';

  var warns=teamLint(d);
  $('#teamWarnings').innerHTML = warns.map(function(w){
    return '<div class="x-warn"><span>⚠</span><span>'+xesc(w)+'</span></div>'; }).join('');
  var missing=flow.filter(function(x){return !x.who}).length;
  $('#teamFlowSummary').textContent = flow.length+' 步'
    +(gates.length?'，'+gates.length+' 个人工确认':'')
    +(missing?'，'+missing+' 步无人可领':'');
  $('#teamFlowSummary').classList.toggle('is-warn', !!missing);
  $('#teamTabDotBase').classList.toggle('hidden', !warns.length);
  $('#teamTabDotMore').classList.toggle('hidden', !missing);

  $$('#teamMembers .x-member-a').forEach(function(a){ a.classList.toggle('hidden', !!d.preset); });
  $('#teamAddBtn').classList.toggle('hidden', !!d.preset);
}

/* ---------- 添加成员弹窗 ---------- */
var memberModal=$('#memberModal'), memberKw='';
function openMemberModal(){ memberKw=''; $('#memberSearchInput').value=''; renderMemberList(); memberModal.classList.add('show');
  setTimeout(function(){ $('#memberSearchInput').focus() },40); }
function renderMemberList(){
  var kw=memberKw.trim();
  var rows=EXPERTS.filter(function(e){ return !kw || (e.name+e.role+e.desc+e.tags.join()).indexOf(kw)>=0; });
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
var newExpertEntryBtn=$('#newExpertEntryBtn');

export function initTeamModal() {
  if($('#teamTabs')) $('#teamTabs').addEventListener('click',function(e){
    var b=e.target.closest('.modal-tab'); if(b) setTeamTab(b.getAttribute('data-ttab'));
  });
  if(teamModal){
    teamModal.addEventListener('click',function(e){
      if(e.target===teamModal){ teamModal.classList.remove('show'); return; }
      var n;
      if(n=e.target.closest('[data-team-cmd]')){
        if(!teamEditingId){ toast('先保存这个专家团，再召唤','warning'); return; }
        teamModal.classList.remove('show');
        summon('team',teamEditingId,n.getAttribute('data-team-cmd')); return;
      }
      if(n=e.target.closest('[data-tm-rmcmd]')){
        teamDraft.cmds.splice(+n.getAttribute('data-tm-rmcmd'),1);
        if(!teamDraft.cmds.length) teamDraft.cmds.push(['','']);
        renderTeamModal(); return;
      }
      if(n=e.target.closest('[data-view-expert]')){ openExpertModal(n.getAttribute('data-view-expert')); return; }
      if(n=e.target.closest('[data-gate-on]')){ toggleGate(teamDraft,n.getAttribute('data-gate-on')); renderTeamModal(); return; }
      if(n=e.target.closest('[data-gate-off]')){ toggleGate(teamDraft,n.getAttribute('data-gate-off')); renderTeamModal(); return; }
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
      if(!teamEditingId){ toast('先保存这个专家团，再召唤','warning'); return; }
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
      if(!name){ setTeamTab('base'); toast('请填写专家团名称','warning'); $('#teamName').focus(); return; }
      if(!d.members.length){ setTeamTab('base'); toast('至少需要一位成员','warning'); return; }
      if(d.preset || !teamEditingId){
        var nid='team-'+Date.now();
        TEAMS.push({id:nid,preset:false,name:d.preset?name+' 副本':name,by:'我创建的',
          desc:d.desc,domains:(d.domains||[]).slice(),gates:teamGates(d).slice(),
          leadId:d.leadId,members:d.members.slice(),cmds:teamCmdList(d)});
        toast(d.preset?'已另存为你的专家团':'专家团已创建','success');
      }else{
        var t=teamById(teamEditingId);
        t.name=name; t.desc=d.desc; t.leadId=d.leadId; t.members=d.members.slice(); t.cmds=teamCmdList(d);
        t.domains=(d.domains||[]).slice(); t.gates=teamGates(d).slice();
        toast('已保存','success');
      }
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
  if(newExpertEntryBtn) newExpertEntryBtn.addEventListener('click',function(){
    if(expertTab==='team') openTeamModal(null); else openExpertEditor(null);
  });
}

export { openTeamModal };
