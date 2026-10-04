import { submitAssetForReview } from './asset-review.js';
import { layerOf } from './layers.js';
import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { renderExpertChips } from './chips.js';
import { AV_KEYS, EX, MODEL_TIERS, MY_EXPERTS, WORK_MODES, rebuildExperts, set_MY_EXPERTS, skillCatalog, skillInfo, xav, xesc } from './data.js';
import { renderKnPane, resetKnPane } from './knowledge.js';
import { expertModal, renderExpertGrid } from './library.js';
import { TEAMS, activePick, clearPick, saveTeams } from './store.js';
import { startAssetEditChat } from '../composer.js';
import { summon } from './automatch.js';
import { hideAssetEditorPanel, showAssetEditorPanel } from './editor-panel.js';
/* 编辑已有的我的专家
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 编辑我的专家 ---------- */
var forcedBuilder=null;

function deleteMyExpert(id){
  var e=EX[id]; if(!e||!e.mine||layerOf('expert',e)!=='personal') return;
  var used=TEAMS.filter(function(t){ return t.members.indexOf(id)>=0; });
  var msg='删除专家「'+e.name+'」？此操作不可撤销。';
  if(used.length) msg+='\n他还在 '+used.length+' 个智能体团队里，删除后会一并移出。';
  if(!window.confirm(msg)) return;
  set_MY_EXPERTS(MY_EXPERTS.filter(function(x){ return x.id!==id; }));
  rebuildExperts();
  TEAMS.forEach(function(t){
    if(t.preset) return;
    t.members=t.members.filter(function(m){ return m!==id; });
    if(t.leadId===id) t.leadId=t.members[0]||null;
  });
  if(activePick.kind==='expert'&&activePick.id===id) clearPick();
  if(expertModal) expertModal.classList.remove('show');
  saveTeams(); renderExpertGrid(); renderExpertChips();
  toast('已删除「'+e.name+'」','success');
}

var expertEditModal=$('#expertEditModal'), xeDraft=null, xeEditingId=null, xeSkillKw='';
/* 面板头部的保存状态：改过任何字段就切换成「未保存」，保存或还原后回到「已保存」 */
function setXeBadge(dirty){
  var badge=$('#expertEditBadge'); if(!badge) return;
  badge.textContent=dirty?'未保存':'已保存';
  badge.classList.toggle('is-dirty',!!dirty);
}
function setXeTab(which){
  $$('#xeTabs .modal-tab').forEach(function(b){ var on=b.getAttribute('data-xtab')===which; b.classList.toggle('active', on); b.setAttribute('aria-selected',String(on)); });
  $$('#expertEditModal .team-pane').forEach(function(el){ el.classList.toggle('hidden', el.getAttribute('data-xpane')!==which); });
  var body=$('#expertEditModal .modal-body'); if(body) body.scrollTop=0;
}
function openExpertEditor(id){
  var e=EX[id];
  if(!e||!e.mine||layerOf('expert',e)!=='personal')return;
  startAssetEditChat('expert',id,e.name);
}
function populateExpertEditor(id){
  if(!expertEditModal) return;
  var e=id?EX[id]:null;
  if(!e||!e.mine||layerOf('expert',e)!=='personal') return;
  xeEditingId=id;
  xeDraft = {k:e.k,name:e.name,desc:e.desc,tags:e.tags.slice(),skills:(e.skills||[]).slice(),modes:e.modes.slice(),mine:true,
       tier:e.tier||'auto',
       comp:e.comp.slice(),cmds:e.cmds.length?e.cmds.map(function(c){return c.slice()}):[['','']],
       kn:(e.kn||[]).slice(),knOff:(e.knOff||[]).slice(),knDocOff:(e.knDocOff||[]).slice(),
       knUp:(e.knUp||[]).map(function(f){return {n:f.n,t:f.t,up:f.up,by:f.by}})};
  $('#expertEditTitle').textContent = '编辑智能体';
  $('#expertEditSub').textContent = id;
  setXeBadge(false);
  xeSkillKw=''; $('#xeSkillSearch').value='';
  $('#xeName').value=xeDraft.name; $('#xeDesc').value=xeDraft.desc;
  $('#xeTags').value=xeDraft.tags.join('、'); $('#xeComp').value=xeDraft.comp.join('、');
  setXeTab('base');
  resetKnPane(xeDraft);
  renderExpertEditor();
  showAssetEditorPanel(expertEditModal);
}
function renderExpertEditor(){
  var d=xeDraft; if(!d) return;
  $('#xeAvatars').innerHTML=AV_KEYS.map(function(k){
    return '<button type="button" class="x-av-opt'+(d.k===k?' on':'')+'" data-xe-av="'+k+'">'
      +'<img src="'+xav(k)+'" alt=""></button>';
  }).join('');
  $('#xeModes').innerHTML=WORK_MODES.map(function(m){
    return '<button type="button" class="x-mode-opt'+(d.modes.indexOf(m)>=0?' on':'')+'" data-xe-mode="'+m+'">'+m+'</button>';
  }).join('');
  $('#xeTiers').innerHTML=MODEL_TIERS.map(function(t){
    return '<button type="button" class="x-mode-opt x-tier-opt'+(d.tier===t.id?' on':'')+'" data-xe-tier="'+t.id+'" title="'+xesc(t.desc)+'">'+t.label+'</button>';
  }).join('');

  renderSkillEditor(d);

  $('#xeCmds').innerHTML=d.cmds.map(function(c,i){
    return '<div class="x-cmd-row"><input type="text" class="x-cmd-k" data-xe-cmd="'+i+'" data-f="0" value="'+xesc(c[0])+'" placeholder="用户会怎么说，需要用户提供的内容写成 [方括号]，例如：按[验收条件]把功能实现出来" autocomplete="off">'
      +'<button type="button" class="x-ic x-ic-dg" data-xe-rmcmd="'+i+'" title="删除">✕</button></div>';
  }).join('');

  renderKnPane(d);
}
var xeSkillSelection=new Set(),xeSkillReturnFocus=null;
function skillRow(skill,action){
  return '<div class="xe-managed-skill x-skill-row"><span class="x-skill-icon tone-'+xesc(skill.tone)+'" aria-hidden="true">'+xesc(skill.name.slice(0,1))+'</span><span class="x-skill-copy"><strong>'+xesc(skill.name)+'</strong><span title="'+xesc(skill.desc)+'">'+xesc(skill.desc)+'</span></span>'+action+'</div>';
}
function renderSkillEditor(d){
  var list=$('#xeSkillList'),count=$('#xeSkillCount');if(!list||!d)return;
  var kw=xeSkillKw.trim().toLocaleLowerCase();
  var rows=(d.skills||[]).map(function(id){return {id,...skillInfo(id)};}).filter(function(skill){return !kw||(skill.name+skill.desc+skill.id).toLocaleLowerCase().includes(kw);});
  count.textContent='已关联 '+(d.skills||[]).length+' 项';
  list.innerHTML=rows.map(function(skill){return skillRow(skill,'<button type="button" class="xe-skill-remove" data-xe-skill-remove="'+xesc(skill.id)+'" aria-label="移除 '+xesc(skill.name)+'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button>');}).join('')||'<div class="x-skill-empty">'+(kw?'没有匹配的技能':'尚未添加技能')+'</div>';
}
function renderSkillPicker(){
  var kw=$('#xeSkillPickerSearch').value.trim().toLocaleLowerCase();
  var rows=skillCatalog().filter(function(skill){return !kw||(skill.name+skill.desc+skill.id).toLocaleLowerCase().includes(kw);});
  $('#xeSkillPickerList').innerHTML=rows.map(function(skill){return '<label class="xe-skill-choice">'+skillRow(skill,'<input type="checkbox" data-xe-skill-choice="'+xesc(skill.id)+'" '+(xeSkillSelection.has(skill.id)?'checked':'')+' aria-label="选择 '+xesc(skill.name)+'">')+'</label>';}).join('')||'<div class="x-skill-empty">没有匹配的技能</div>';
  $('#xeSkillPickerCount').textContent='已选 '+xeSkillSelection.size+' 项';
}
function closeSkillPicker(){
  $('#xeSkillPicker').classList.remove('show');xeSkillReturnFocus?.focus();
}
function splitList(v){
  return String(v||'').split(/[、,，\n]/).map(function(x){return x.trim()}).filter(Boolean);
}
function splitLines(v){
  return String(v||'').split('\n').map(function(x){return x.trim()}).filter(Boolean);
}

export function initExpertEditor() {
  document.addEventListener('lingee:asset-edit-session',function(ev){
    if(ev.detail.kind==='expert')populateExpertEditor(ev.detail.id);
  });
  if($('#xeTabs')) $('#xeTabs').addEventListener('click',function(e){
    var b=e.target.closest('.modal-tab'); if(b) setXeTab(b.getAttribute('data-xtab'));
  });
  if(expertEditModal){
    $('#xeAddSkill').addEventListener('click',function(){
      xeSkillReturnFocus=document.activeElement;xeSkillSelection=new Set(xeDraft.skills||[]);$('#xeSkillPickerSearch').value='';renderSkillPicker();$('#xeSkillPicker').classList.add('show');$('#xeSkillPickerSearch').focus();
    });
    ['xeSkillPickerClose','xeSkillPickerCancel'].forEach(function(id){$('#'+id).addEventListener('click',closeSkillPicker);});
    $('#xeSkillPicker').addEventListener('click',function(ev){if(ev.target===$('#xeSkillPicker'))closeSkillPicker();});
    $('#xeSkillPicker').addEventListener('keydown',function(ev){if(ev.key==='Escape'){ev.stopPropagation();closeSkillPicker();}});
    $('#xeSkillPickerSearch').addEventListener('input',renderSkillPicker);
    $('#xeSkillPickerList').addEventListener('change',function(ev){var id=ev.target.dataset.xeSkillChoice;if(!id)return;if(ev.target.checked)xeSkillSelection.add(id);else xeSkillSelection.delete(id);$('#xeSkillPickerCount').textContent='已选 '+xeSkillSelection.size+' 项';});
    $('#xeSkillPickerConfirm').addEventListener('click',function(){xeDraft.skills=Array.from(xeSkillSelection);renderSkillEditor(xeDraft);closeSkillPicker();});
    $('#expertEditClose').addEventListener('click',hideAssetEditorPanel);
    $('#xeCancelBtn').addEventListener('click',hideAssetEditorPanel);
    $('#xeAddCmd').addEventListener('click',function(){ xeDraft.cmds.push(['','']); renderExpertEditor(); });
    $('#xeResetBtn').addEventListener('click',function(){
      if(!xeEditingId)return;
      populateExpertEditor(xeEditingId);
      toast('已还原为上次保存的内容','success');
    });
    $('#xeCallBtn').addEventListener('click',function(){
      if(!xeEditingId){ toast('先保存这个智能体，再对话','warning'); return; }
      hideAssetEditorPanel();
      summon('expert',xeEditingId);
    });
    ['input','change','click'].forEach(function(type){
      expertEditModal.addEventListener(type,function(ev){
        if(type==='click'&&!ev.target.closest('[data-xe-av],[data-xe-mode],[data-xe-tier],[data-xe-skill-remove],[data-xe-rmcmd],#xeAddCmd'))return;
        if(type!=='click'&&!ev.target.closest('input,textarea,select'))return;
        if(ev.target.id==='xeSkillSearch')return;
        setXeBadge(true);
      });
    });
    expertEditModal.addEventListener('click',function(ev){
      if(ev.target===expertEditModal){ hideAssetEditorPanel(); return; }
      var a=ev.target.closest('[data-xe-av]');
      if(a){ xeDraft.k=a.getAttribute('data-xe-av'); renderExpertEditor(); return; }
      var m=ev.target.closest('[data-xe-mode]');
      if(m){
        var v=m.getAttribute('data-xe-mode'), i=xeDraft.modes.indexOf(v);
        if(i<0) xeDraft.modes.push(v); else xeDraft.modes.splice(i,1);
        renderExpertEditor(); return;
      }
      var t=ev.target.closest('[data-xe-tier]');
      if(t){ xeDraft.tier=t.getAttribute('data-xe-tier'); renderExpertEditor(); return; }
      var s=ev.target.closest('[data-xe-skill-remove]');
      if(s){xeDraft.skills=xeDraft.skills.filter(function(id){return id!==s.dataset.xeSkillRemove;});renderSkillEditor(xeDraft);$('#xeAddSkill').focus();return;}
      var r=ev.target.closest('[data-xe-rmcmd]');
      if(r){
        xeDraft.cmds.splice(+r.getAttribute('data-xe-rmcmd'),1);
        if(!xeDraft.cmds.length) xeDraft.cmds.push(['','']);
        renderExpertEditor(); return;
      }
    });
    expertEditModal.addEventListener('input',function(ev){
      if(ev.target===$('#xeSkillSearch')){ xeSkillKw=ev.target.value; renderSkillEditor(xeDraft); return; }
      var c=ev.target.closest('[data-xe-cmd]');
      if(c){ xeDraft.cmds[+c.getAttribute('data-xe-cmd')][+c.getAttribute('data-f')]=c.value; return; }
      /* 能力项要实时同步进草稿：知识页签按能力项自动带目录，边填边看才对得上 */
      if(ev.target===$('#xeComp')){ xeDraft.comp=splitList(ev.target.value); renderKnPane(); }
    });
    $('#expertEditForm').addEventListener('submit',function(ev){
      ev.preventDefault();
      var d=xeDraft;
      d.name=$('#xeName').value.trim(); d.desc=$('#xeDesc').value.trim();
      d.tags=splitList($('#xeTags').value); d.comp=splitList($('#xeComp').value);
      if(!d.name){ setXeTab('base'); toast('请填写专家名称','warning'); $('#xeName').focus(); return; }
      if(!d.modes.length){ setXeTab('base'); toast('至少勾选一项「可承担的工作」，否则他在智能体团队里领不到任务','warning'); return; }
      var cmds=d.cmds.map(function(c){ return [String(c[0]||'').trim(),String(c[1]||'').trim()]; })
                     .filter(function(c){ return c[0]; });
      var index=MY_EXPERTS.findIndex(function(item){return item.id===xeEditingId;});
      if(index<0) return;
      var rec={id:xeEditingId,mine:true,ownerId:MY_EXPERTS[index].ownerId||'',k:d.k,name:d.name,role:'',by:'我创建的',
               desc:d.desc,tags:d.tags,skills:(d.skills||[]).slice(),modes:d.modes.slice(),tier:d.tier||'auto',comp:d.comp,cmds:cmds,
               kn:(d.kn||[]).slice(),knOff:(d.knOff||[]).slice(),knDocOff:(d.knDocOff||[]).slice(),knUp:(d.knUp||[]).slice()
              };
      var previous=MY_EXPERTS[index];MY_EXPERTS[index]=rec;
      if(!saveTeams()){MY_EXPERTS[index]=previous;toast('保存失败，编辑内容已保留，请重试','warning');return;}
      toast('已保存','success');
      setXeBadge(false);
      rebuildExperts();
      hideAssetEditorPanel();
      document.dispatchEvent(new CustomEvent('lingee:asset-editor-saved',{detail:{kind:'expert',id:rec.id,name:rec.name}}));
      renderExpertGrid(); renderExpertChips();
      if(ev.submitter?.id==='xeSubmitReviewBtn')submitAssetForReview('expert',rec);
    });
  }
}

/* forcedBuilder 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set_forcedBuilder(v){ forcedBuilder=v; return v; }

export { deleteMyExpert, forcedBuilder, openExpertEditor };
