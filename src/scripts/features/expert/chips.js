import { $, $$ } from '../../core/dom.js';
import { brandEl, navItems, setNavActive, showView } from '../../core/view.js';
import { cvInit } from '../collab/index.js';
import { cvSwitchView } from '../collab/view.js';
import { closeAll } from '../dropdown.js';
import { EX, EXPERTS, xav, xesc } from './data.js';
import { forcedBuilder, set_forcedBuilder } from './editor.js';
import { facesHtml, renderExpertGrid } from './library.js';
import { TEAMS, activePick, clearPick, loadTeams, pickName, pickValid, saveTeams, set_activePick, teamById } from './store.js';
/* 输入框上的已选专家标签
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- composer：选中对象渲染为顶部标签 + 下拉选择 ---------- */
function pickIconSvg(){
  return activePick.kind==='team'
    ? '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.2"/><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4"/><path d="M15.4 5.2a3.2 3.2 0 0 1 0 5.6"/></svg>'
    : '<img class="ctag-av" src="'+xav(EX[activePick.id].k)+'" alt="">';
}

/* 模式 → builder 名。来源见 lingee-build packages/kcode-web/src/components/prompt-input.tsx
   starterRecommendationCards；技能/智能体两项用 1.x 线的新名（用户确认） */
var MODE_BUILDERS={
  '技能开发':{id:'skill-builder',    ic:'<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>'},
  '智能体开发':{id:'agent-builder',  ic:'<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V3"/><circle cx="12" cy="3" r="1.5" fill="currentColor"/><rect x="8" y="13" width="3" height="2" rx="1"/><rect x="13" y="13" width="3" height="2" rx="1"/>'},
  '原型探索':{id:'prototype-builder',   ic:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>'},
  '通用应用':{id:'general-app-builder', ic:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'},
  '苍穹应用':{id:'cosmic-app-builder', ic:'<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>'},
  '业务组件':{id:'mcp-apps-builder', ic:'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>'}
};
function renderModeTag(){
  var el=$('.mode-item.checked'), mode=el?el.getAttribute('data-val'):null;
  var b=mode?MODE_BUILDERS[mode]:forcedBuilder;
  ['nt','chat'].forEach(function(pfx){
    var tags=$('#'+pfx+'Tags'); if(!tags) return;
    tags.innerHTML = b
      ? '<span class="ctag"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+b.ic+'</svg>'
        +'<span class="ctag-label">'+b.id+'</span>'
        +'<button type="button" class="ctag-x" data-clear-mode aria-label="移除">'
        +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
        +'</button></span>'
      : '';
    tags.classList.toggle('hidden', !b);
  });
}

function renderExpertChips(){
  var has=pickValid();
  ['nt','chat'].forEach(function(pfx){
    var label=$('#'+pfx+'ExpertLabel'), faces=$('#'+pfx+'ExpertFaces');
    if(label) label.textContent = has ? pickName() : '选择专家';
    if(faces){
      faces.innerHTML = has
        ? (activePick.kind==='team'
            ? teamById(activePick.id).members.slice(0,3).map(function(i){
                return '<img src="'+xav(EX[i].k)+'" alt="">'; }).join('')
            : '<img src="'+xav(EX[activePick.id].k)+'" alt="">')
        : '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.2"/><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4"/><path d="M15.4 5.2a3.2 3.2 0 0 1 0 5.6"/></svg>';
    }
    var dd=$('#'+pfx+'ExpertDropdown');
    if(dd){ var c=dd.querySelector('[data-chip]'); if(c) c.classList.toggle('muted', !has); }
  });
}
function renderExpertPicker(pfx,kw){
  var list=$('#'+pfx+'ExpertList'); if(!list) return;
  kw=(kw||'').trim();
  var teams=TEAMS.filter(function(t){ return !kw || (t.name+t.desc).indexOf(kw)>=0; });
  var experts=EXPERTS.filter(function(e){ return !kw || (e.name+e.role+e.desc+e.tags.join()).indexOf(kw)>=0; });
  var html='';
  if(teams.length){
    html+='<div class="pick-group">专家团</div>'+teams.map(function(t){
      var on=activePick.kind==='team'&&activePick.id===t.id;
      return '<div class="app-item x-opt'+(on?' checked':'')+'" data-pick-team="'+t.id+'">'
        +facesHtml(t.members,3)
        +'<span class="x-opt-n">'+xesc(t.name)+'</span>'
        +(on?'<svg class="ic ic-sm menu-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>':'')+'</div>';
    }).join('');
  }
  if(experts.length){
    html+='<div class="pick-group">专家</div>'+experts.map(function(e){
      var on=activePick.kind==='expert'&&activePick.id===e.id;
      return '<div class="app-item x-opt'+(on?' checked':'')+'" data-pick-expert="'+e.id+'">'
        +'<img class="x-opt-av" src="'+xav(e.k)+'" alt="">'
        +'<span class="x-opt-n">'+xesc(e.name)+'</span>'
        +(on?'<svg class="ic ic-sm menu-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>':'')+'</div>';
    }).join('');
  }
  list.innerHTML = html || '<div class="x-empty-sm">没有匹配的专家或专家团</div>';
}
function openExpertPicker(pfx){
  var dd=$('#'+pfx+'ExpertDropdown'); if(!dd) return;
  var si=$('#'+pfx+'ExpertSearchInput');
  closeAll(null);
  renderExpertPicker(pfx, si?si.value:'');
  dd.classList.add('open');
  if(si) setTimeout(function(){ si.focus() },40);
}

/* 新会话不继承上一次的专家/专家团选择 */
function resetPickForNewSession(){
  if(forcedBuilder){ set_forcedBuilder(null); renderModeTag(); }
  if(!activePick.kind) return;
  clearPick(); renderExpertChips();
}

export function initExpertChips() {
  document.addEventListener('click',function(ev){
    if(ev.target.closest('[data-clear-mode]')){
      ev.stopPropagation();
      $$('.mode-item').forEach(function(m){ m.classList.remove('checked') });
      set_forcedBuilder(null);
      renderModeTag(); return;
    }
    if(ev.target.closest('.mode-item')){ set_forcedBuilder(null); setTimeout(renderModeTag,0); }
  });
  ['nt','chat'].forEach(function(pfx){
    var dd=$('#'+pfx+'ExpertDropdown'); if(!dd) return;
    var chipEl=dd.querySelector('[data-chip]'), si=$('#'+pfx+'ExpertSearchInput');
    chipEl.addEventListener('click',function(ev){
      ev.stopPropagation();
      if(dd.classList.contains('open')) dd.classList.remove('open');
      else openExpertPicker(pfx);
    });
    if(si) si.addEventListener('input',function(){ renderExpertPicker(pfx,this.value) });
    dd.addEventListener('click',function(ev){
      var n;
      if(n=ev.target.closest('[data-pick-team]')){
        var tid=n.getAttribute('data-pick-team');
        if(activePick.kind==='team'&&activePick.id===tid) clearPick();   /* 再点一次取消 */
        else set_activePick({kind:'team',id:tid,auto:false});
        saveTeams(); renderExpertChips(); dd.classList.remove('open'); return;
      }
      if(n=ev.target.closest('[data-pick-expert]')){
        var eid=n.getAttribute('data-pick-expert');
        if(activePick.kind==='expert'&&activePick.id===eid) clearPick();
        else set_activePick({kind:'expert',id:eid,auto:false});
        saveTeams(); renderExpertChips(); dd.classList.remove('open'); return;
      }
      if(ev.target.closest('[data-goto-experts]')){
        dd.classList.remove('open');
        showView('collab'); setNavActive('协作开发'); cvInit(); cvSwitchView('teams');
      }
    });

  });
  navItems.forEach(function(n){
    n.addEventListener('click',function(){ if(n.textContent.trim()==='新会话') resetPickForNewSession(); });
  });
  if(brandEl) brandEl.addEventListener('click',resetPickForNewSession);
  $$('#view-home .home-card').forEach(function(c){
    c.addEventListener('click',function(){ if(c.getAttribute('data-view')==='newtask') resetPickForNewSession(); });
  });
  document.addEventListener('keydown',function(e){
    if((e.metaKey||e.ctrlKey) && !e.shiftKey && (e.key||'').toLowerCase()==='n') resetPickForNewSession();
  });

  loadTeams();
  renderExpertChips();
  renderModeTag();
  renderExpertGrid();
}

export { renderExpertChips, renderModeTag };
