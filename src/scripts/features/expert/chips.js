import { $, $$ } from '../../core/dom.js';
import { activeSessionId, chatSessions } from '../composer/sessions.js';
import { sessionHasConversation } from '../composer/session-policy.js';
import { layerVisible, layerOf } from './layers.js';
import { applyMode, brandEl, navItems, setNavActive, showView } from '../../core/view.js';
import '../collab/index.js';   /* 不再调用其函数（改发 lingee:collab-nav 事件），保留以维持模块求值顺序 */
import '../collab/view.js';
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

/* 新会话输入区与已发起的会话分开判断，不能因旧会话仍活跃而锁住新会话。 */
function composerPickLocked(pfx){
  var dd=$('#'+pfx+'ExpertDropdown');
  return !!dd && (dd.classList.contains('task-team-locked') || (pfx==='chat' && sessionHasConversation(chatSessions.find(function(row){return row.id===activeSessionId;}))));
}
function composerTeamName(team){
  return /^(苍穹|通用)应用开发(智能体)?$/.test(team.name) ? team.name+'团队' : team.name;
}
function renderExpertChips(){
  ['nt','chat','tkForm'].forEach(function(pfx){
    var label=$('#'+pfx+'ExpertLabel'), faces=$('#'+pfx+'ExpertFaces');
    var dd=$('#'+pfx+'ExpertDropdown'); if(!dd) return;
    var session=pfx==='chat' ? chatSessions.find(function(row){return row.id===activeSessionId;}) : null;
    var started=sessionHasConversation(session), locked=composerPickLocked(pfx);
    var pick=started ? (session.executionPick || (session.teamId ? {kind:'team',id:session.teamId} : {kind:null,id:''})) : activePick;
    var team=pick.kind==='team'?teamById(pick.id):null;
    var expert=pick.kind==='expert'?EX[pick.id]:null;
    var has=!!(team||expert), name=team?composerTeamName(team):(expert?.name||'');
    var reason=started?'已开始会话，不能更换或清除智能体及团队；如需更换，请新建会话。':'此会话的执行对象已锁定';
    dd.classList.toggle('conversation-pick-locked',started);
    if(pfx==='chat' && dd.classList.contains('task-team-locked')){
      var lockedId=dd.dataset.lockedTeamId||'', soloId=lockedId.indexOf('expert:')===0 ? lockedId.slice(7) : '';
      var lockedTeam=soloId ? (EX[soloId] ? {name:EX[soloId].name,members:[soloId]} : null) : teamById(lockedId);
      if(label) label.textContent=lockedTeam ? (soloId?lockedTeam.name:composerTeamName(lockedTeam)) : '未配置智能体团队';
      if(faces) faces.innerHTML=lockedTeam ? lockedTeam.members.slice(0,3).map(function(i){ return EX[i] ? '<img src="'+xav(EX[i].k)+'" alt="">' : ''; }).join('') : '';
      has=!!lockedTeam;
    }else{
      if(label) label.textContent=has?name:(started?'默认执行':(pfx==='tkForm'?'选择智能体团队':'选择智能体'));
      if(faces) faces.innerHTML=team ? team.members.slice(0,3).filter(function(id){return !!EX[id];}).map(function(id){return '<img src="'+xav(EX[id].k)+'" alt="">';}).join('')
        : (expert?'<img src="'+xav(expert.k)+'" alt="">':'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.2"/><path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4"/><path d="M15.4 5.2a3.2 3.2 0 0 1 0 5.6"/></svg>');
    }
    var chipClear=dd.querySelector('[data-clear-expert-chip]'); if(chipClear) chipClear.hidden=!has||locked;
    var chip=dd.querySelector('[data-chip]');
    if(chip){
      chip.classList.toggle('muted',!has&&!started);
      if(pfx!=='tkForm'){
        chip.disabled=locked;
        chip.setAttribute('aria-disabled',locked?'true':'false');
        chip.setAttribute('aria-haspopup',locked?'false':'true');
      }
      chip.title=locked?reason:(has?'当前执行对象：'+name+'，点击更换':'选择智能体');
    }
    if(pfx==='chat'){
      dd.title=locked?reason:'';
      var entry=document.querySelector('[data-open-chat-expert]');
      if(entry){
        entry.setAttribute('aria-disabled',locked?'true':'false');
        entry.setAttribute('aria-haspopup',locked?'false':'true');
        entry.setAttribute('aria-label',locked?'智能体团队，'+reason:'选择智能体或智能体团队');
        entry.title=locked?reason:'';
        var parent=entry.closest('.asset-picker-parent'); if(parent) parent.title=locked?reason:'';
      }
    }
    if(locked){restoreComposerSubmenu(dd);dd.classList.remove('open');}
  });
}
function renderExpertPicker(pfx,kw){
  var list=$('#'+pfx+'ExpertList'); if(!list) return;
  if(pfx==='tkForm' && tkFormHooks && tkFormHooks.render){ tkFormHooks.render(list,kw); return; }
  kw=(kw||'').trim();
  var teams=TEAMS.filter(function(t){ return layerVisible('team',t)&&(!kw || (composerTeamName(t)+t.desc).indexOf(kw)>=0); });
  var experts=EXPERTS.filter(function(e){ return layerVisible('expert',e)&&(!kw || (e.name+e.role+e.desc+e.tags.join()).indexOf(kw)>=0); });
  var html='';
  if(teams.length){
    html+='<div class="pick-group">智能体团队</div>'+teams.map(function(t){
      var on=activePick.kind==='team'&&activePick.id===t.id;
      return '<button type="button" class="app-item x-opt'+(on?' checked':'')+'" aria-pressed="'+on+'" data-pick-team="'+t.id+'">'
        +facesHtml(t.members,3)
        +'<span class="x-opt-n">'+xesc(composerTeamName(t))+'</span>'
        +(layerOf('team',t)==='personal'?'<span class="asset-picker-local">本地</span>':'')
        +(on?'<svg class="ic ic-sm menu-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>':'')+'</button>';
    }).join('');
  }
  if(experts.length){
    html+='<div class="pick-group">智能体</div>'+experts.map(function(e){
      var on=activePick.kind==='expert'&&activePick.id===e.id;
      return '<button type="button" class="app-item x-opt'+(on?' checked':'')+'" aria-pressed="'+on+'" data-pick-expert="'+e.id+'">'
        +'<img class="x-opt-av" src="'+xav(e.k)+'" alt="">'
        +'<span class="x-opt-n">'+xesc(e.name)+'</span>'
        +(on?'<svg class="ic ic-sm menu-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>':'')+'</button>';
    }).join('');
  }
  list.innerHTML = html || '<div class="x-empty-sm">没有匹配的智能体或智能体团队</div>';
}
/* tkForm（任务管理新建任务弹窗）专属：二级展开 + 产物确认人由 tasks-v2 注入，
   nt / chat 不受影响。 */
var tkFormHooks=null;
function setTkFormHooks(h){ tkFormHooks=h; }

/* 弹窗内智能体团队下拉：浮层 portal 到 body，脱离 .tk-modal--mc 的 transform 与 overflow，
   fixed 按触发器视口坐标定位，实现「在 chip 下方原位弹出」且不被弹窗裁剪 */
function floatMenu(dd){
  var menu=dd.querySelector('.menu'); if(!menu) return;
  var chip=dd.querySelector('[data-chip]'); if(!chip) return;
  var rect=chip.getBoundingClientRect();
  document.body.appendChild(menu);
  menu.classList.add('dd-float-menu');
  menu.style.position='fixed';
  menu.style.display='flex';
  menu.style.zIndex='260';
  menu.style.maxHeight='';
  var list=menu.querySelector('.app-list'); if(list) list.style.maxHeight='';
  var w=menu.offsetWidth||280;
  menu.style.left=Math.max(8, Math.min(rect.left, window.innerWidth-w-8))+'px';
  menu.style.right='';
  var maxH=Math.min(window.innerHeight-16, 400);
  if(menu.offsetHeight>maxH){
    menu.style.maxHeight=maxH+'px';
    if(list) list.style.maxHeight=(maxH-56)+'px';
  }
  var h=menu.offsetHeight;
  if(rect.bottom+h+12<=window.innerHeight){
    menu.style.top=(rect.bottom+6)+'px'; menu.style.bottom='';
  }else{
    menu.style.top=Math.max(8, rect.top-h-6)+'px'; menu.style.bottom='';
  }
  dd._floated=menu;
}
function refloatMenu(dd){
  var menu=dd._floated; if(!menu) return;
  var chip=dd.querySelector('[data-chip]'); if(!chip) return;
  var rect=chip.getBoundingClientRect();
  var w=menu.offsetWidth||280;
  menu.style.left=Math.max(8, Math.min(rect.left, window.innerWidth-w-8))+'px';
  var h=menu.offsetHeight;
  if(rect.bottom+h+12<=window.innerHeight){
    menu.style.top=(rect.bottom+6)+'px'; menu.style.bottom='';
  }else{
    menu.style.top=Math.max(8, rect.top-h-6)+'px'; menu.style.bottom='';
  }
}
function unfloatMenu(dd){
  var menu=dd._floated; if(!menu) return;
  var chip=dd.querySelector('[data-chip]');
  if(chip) chip.parentNode.insertBefore(menu, chip.nextSibling);
  menu.classList.remove('dd-float-menu');
  menu.style.position=''; menu.style.display=''; menu.style.zIndex='';
  menu.style.top=''; menu.style.bottom=''; menu.style.left=''; menu.style.right=''; menu.style.maxHeight='';
  var list=menu.querySelector('.app-list'); if(list) list.style.maxHeight='';
  dd._floated=null;
}
/* tkForm 二级展开后面板变高：重算 maxHeight 与位置，避免溢出视口 */
function refloatTkFormMenu(){
  var dd=$('#tkFormExpertDropdown'); if(!dd||!dd._floated) return;
  var menu=dd._floated, list=menu.querySelector('.app-list');
  menu.style.maxHeight=''; if(list) list.style.maxHeight='';
  var maxH=Math.min(window.innerHeight-16, 400);
  if(menu.offsetHeight>maxH){ menu.style.maxHeight=maxH+'px'; if(list) list.style.maxHeight=(maxH-56)+'px'; }
  refloatMenu(dd);
}
/* 首次选择共用同一个列表，以二级菜单展开；已选标签仍直接展开列表。 */
function restoreComposerSubmenu(dd){
  var state=dd._composerSubmenu; if(!state) return;
  dd.appendChild(state.menu);
  state.menu.setAttribute('style',state.style);
  state.trigger.setAttribute('aria-expanded','false');
  state.host.classList.remove('open');
  dd._composerSubmenu=null;
}
function positionComposerSubmenu(dd){
  var state=dd._composerSubmenu; if(!state) return;
  var menu=state.menu, rect=state.trigger.getBoundingClientRect();
  var maxH=Math.min(400,window.innerHeight-16);
  menu.style.maxHeight=maxH+'px';
  var width=menu.offsetWidth||220;
  var left=rect.right;
  if(left+width>window.innerWidth-8) left=rect.left-width;
  menu.style.left=Math.max(8,Math.min(left,window.innerWidth-width-8))+'px';
  menu.style.top=Math.max(8,Math.min(rect.top,window.innerHeight-menu.offsetHeight-8))+'px';
  var list=menu.querySelector('.app-list');
  if(list){
    list.style.maxHeight='';
    var reserved=menu.scrollHeight-list.offsetHeight;
    list.style.maxHeight=Math.max(32,maxH-reserved)+'px';
  }
}
export function openExpertPicker(pfx,trigger,focusSearch=true){
  var dd=$('#'+pfx+'ExpertDropdown'); if(!dd) return;
  if(composerPickLocked(pfx)) return;
  restoreComposerSubmenu(dd);
  var si=$('#'+pfx+'ExpertSearchInput');
  if(si&&pfx!=='tkForm'){ si.value=''; var clear=dd.querySelector('.asset-picker-clear'); if(clear) clear.hidden=true; }
  var parent=trigger?.closest('.add-dropdown');
  closeAll(parent||null);
  renderExpertPicker(pfx, si?si.value:'');
  if(parent){
    var menu=dd.querySelector('.expert-menu'), host=trigger.nextElementSibling;
    dd._composerSubmenu={menu:menu,host:host,trigger:trigger,style:menu.getAttribute('style')||''};
    parent.classList.add('open');
    dd.classList.remove('open');
    host.appendChild(menu); host.classList.add('open');
    trigger.setAttribute('aria-expanded','true');
    menu.style.position='fixed'; menu.style.display='flex'; menu.style.right='auto'; menu.style.bottom='auto';
    positionComposerSubmenu(dd);
  }else{
    dd.classList.add('open');
    if(dd.classList.contains('dd-float')) requestAnimationFrame(function(){ floatMenu(dd); });
  }
  if(si&&focusSearch) setTimeout(function(){ si.focus() },40);
}

/* 仅通过标签右侧叉号清除，不打开列表，不更改草稿内容。 */
function clearComposerPick(pfx){
  var dd=$('#'+pfx+'ExpertDropdown');
  if(!dd||composerPickLocked(pfx)) return;
  clearPick(); restoreComposerSubmenu(dd); closeAll(null); renderExpertChips();
  document.dispatchEvent(new CustomEvent('lingee:execution-pick-change',{detail:{scope:pfx,pick:{...activePick}}}));
  $(pfx==='nt'?'#composerInput':'#chatInput')?.focus();
}

/* 新会话不继承上一次的专家/智能体团队选择 */
function resetPickForNewSession(){
  set_forcedBuilder(null);
  clearPick(); renderExpertChips(); renderModeTag();
  closeAll(null);
}

export function initExpertChips() {
  [['[data-open-home-expert]','nt'],['[data-open-chat-expert]','chat']].forEach(function(entry){
    var trigger=document.querySelector(entry[0]); if(!trigger) return;
    var dd=$('#'+entry[1]+'ExpertDropdown'), parent=trigger.closest('.add-dropdown');
    trigger.addEventListener('click',function(event){
      event.preventDefault();event.stopPropagation();
      if(composerPickLocked(entry[1])) return;
      if(dd._composerSubmenu) $('#'+entry[1]+'ExpertSearchInput')?.focus();
      else openExpertPicker(entry[1],trigger);
    });
    trigger.addEventListener('mouseenter',function(){
      if(parent.classList.contains('open')&&!dd._composerSubmenu) openExpertPicker(entry[1],trigger,false);
    });
    trigger.addEventListener('keydown',function(event){
      if(event.key==='ArrowRight'){ event.preventDefault();openExpertPicker(entry[1],trigger); }
    });
    trigger.parentNode.addEventListener('mouseleave',function(){
      if(dd._composerSubmenu&&!dd._composerSubmenu.menu.contains(document.activeElement)) restoreComposerSubmenu(dd);
    });
    parent.querySelector('.add-menu').addEventListener('mouseover',function(event){
      var item=event.target.closest('.menu-item');
      if(item&&item.parentNode===parent.querySelector('.add-menu')&&!item.contains(trigger)) restoreComposerSubmenu(dd);
    });
    new MutationObserver(function(){
      if(!parent.classList.contains('open')) restoreComposerSubmenu(dd);
    }).observe(parent,{attributes:true,attributeFilter:['class']});
    window.addEventListener('resize',function(){ positionComposerSubmenu(dd); });
    document.addEventListener('scroll',function(){ positionComposerSubmenu(dd); },true);
  });
  document.addEventListener('click',function(ev){
    if(ev.target.closest('[data-clear-mode]')){
      ev.stopPropagation();
      if(ev.target.closest('#view-chat')&&composerPickLocked('chat')) return;
      applyMode('',false);
      set_forcedBuilder(null);
      renderModeTag(); return;
    }
    if(ev.target.closest('.mode-item')){
      clearPick(); set_forcedBuilder(null);
      renderExpertChips(); renderModeTag();
    }
  });
  ['nt','chat','tkForm'].forEach(function(pfx){
    var dd=$('#'+pfx+'ExpertDropdown'); if(!dd) return;
    var chipEl=dd.querySelector('[data-chip]'), si=$('#'+pfx+'ExpertSearchInput'), menuEl=dd.querySelector('.menu');
    if(si&&pfx!=='tkForm'){
      si.placeholder='搜索智能体 / 智能体团队';
      const clear=document.createElement('button');clear.type='button';clear.className='asset-picker-clear';clear.textContent='×';clear.setAttribute('aria-label','清空搜索');clear.hidden=!si.value;
      si.parentNode.appendChild(clear);
      clear.addEventListener('click',function(ev){ev.stopPropagation();si.value='';clear.hidden=true;renderExpertPicker(pfx,'');si.focus();});
      si.addEventListener('input',function(){clear.hidden=!si.value;});
    }
    if(dd.classList.contains('dd-float')){
      var host=dd.closest('.tk-mc-body');
      function onRepos(){ if(dd._floated) refloatMenu(dd); }
      new MutationObserver(function(){
        if(dd.classList.contains('open')) requestAnimationFrame(function(){ floatMenu(dd); });
        else unfloatMenu(dd);
      }).observe(dd,{attributes:true,attributeFilter:['class']});
      if(host) host.addEventListener('scroll',onRepos);
      window.addEventListener('resize',onRepos);
    }
    if(pfx!=='tkForm'){
      new MutationObserver(function(){ chipEl.setAttribute('aria-expanded',dd.classList.contains('open')?'true':'false'); }).observe(dd,{attributes:true,attributeFilter:['class']});
      function pickerKeydown(ev){
        if(ev.key==='Escape'||(ev.key==='ArrowLeft'&&dd._composerSubmenu&&ev.target.tagName!=='INPUT')){
          ev.preventDefault();ev.stopPropagation();
          var trigger=dd._composerSubmenu?.trigger;
          restoreComposerSubmenu(dd);dd.classList.remove('open');(trigger||chipEl).focus();return;
        }
        if((ev.key==='ArrowDown'||ev.key==='ArrowUp')&&(dd.classList.contains('open')||dd._composerSubmenu)){
          ev.stopPropagation();
          ev.preventDefault();
          var items=Array.from((dd._composerSubmenu?.menu||dd).querySelectorAll('[data-pick-team],[data-pick-expert]'));
          var index=items.indexOf(document.activeElement), step=ev.key==='ArrowDown'?1:-1;
          if(items.length) items[(index+step+items.length)%items.length].focus();
        }
      }
      dd.addEventListener('keydown',pickerKeydown);
      menuEl.addEventListener('keydown',pickerKeydown);
    }
    dd.querySelector('[data-clear-expert-chip]')?.addEventListener('click',function(ev){
      ev.preventDefault();ev.stopPropagation();clearComposerPick(pfx);
    });
    chipEl.addEventListener('click',function(ev){
      ev.stopPropagation();
      if(composerPickLocked(pfx)) return;
      if(dd.classList.contains('open')) dd.classList.remove('open');
      else openExpertPicker(pfx);
    });
    if(si) si.addEventListener('input',function(){ renderExpertPicker(pfx,this.value) });
    (menuEl||dd).addEventListener('click',function(ev){
      if(pfx==='tkForm' && tkFormHooks && tkFormHooks.onMenuClick && tkFormHooks.onMenuClick(ev)) return;
      if(composerPickLocked(pfx)) return;
      var n;
      if(n=ev.target.closest('[data-pick-team]')){
        var tid=n.getAttribute('data-pick-team');
        if(pfx==='tkForm'&&activePick.kind==='team'&&activePick.id===tid) clearPick();
        else set_activePick({kind:'team',id:tid,auto:false});
        if(pfx!=='tkForm'){
          applyMode('',false); set_forcedBuilder(null); renderModeTag();
          document.dispatchEvent(new CustomEvent('lingee:execution-pick-change',{detail:{scope:pfx,pick:{...activePick}}}));
        }
        saveTeams(); renderExpertChips(); dd.classList.remove('open'); closeAll(null);
        if(pfx!=='tkForm') chipEl.focus();
        return;
      }
      if(n=ev.target.closest('[data-pick-expert]')){
        var eid=n.getAttribute('data-pick-expert');
        if(pfx==='tkForm'&&activePick.kind==='expert'&&activePick.id===eid) clearPick();
        else set_activePick({kind:'expert',id:eid,auto:false});
        if(pfx!=='tkForm'){
          applyMode('',false); set_forcedBuilder(null); renderModeTag();
          document.dispatchEvent(new CustomEvent('lingee:execution-pick-change',{detail:{scope:pfx,pick:{...activePick}}}));
        }
        saveTeams(); renderExpertChips(); dd.classList.remove('open'); closeAll(null);
        if(pfx!=='tkForm') chipEl.focus();
        return;
      }
      if(ev.target.closest('[data-goto-experts]')){
        dd.classList.remove('open');
        showView('collab'); setNavActive('协作开发'); document.dispatchEvent(new CustomEvent('lingee:collab-nav',{detail:{tab:'teams'}}));
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

export { renderExpertChips, renderModeTag, refloatTkFormMenu, setTkFormHooks };
