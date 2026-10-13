import { $, $$ } from '../core/dom.js';
import { applyMode, setNavActive, showView } from '../core/view.js';
import { openAppDropdown } from './attach-app.js';
/* 更新日志页面
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- Changelog / 更新日志 ---------- */
/* 每条记录一个文件：changelog-entries/<id 三位补零>.js，新增记录只加文件不改本文件，
   多人同时推送不会在同一处冲突。展示顺序按 id 倒序。 */
var changelogData=Object.values(import.meta.glob('./changelog-entries/*.js',{eager:true,import:'default'}))
  .sort(function(a,b){ return Number(b.id)-Number(a.id); });
var changelogReadIds=(function(){
  try{ return JSON.parse(localStorage.getItem('changelog_read_ids')||'[]'); }catch(e){return [];}
})();
function saveReadIds(){ localStorage.setItem('changelog_read_ids',JSON.stringify(changelogReadIds)); }
function getUnreadCount(){ return changelogData.filter(function(l){return changelogReadIds.indexOf(l.id)===-1;}).length; }
function formatRelativeDate(dateStr){
  return dateStr;
}
var menuBadge=$('#changelogMenuBadge'),changelogBody=$('#changelogBody');
var currentType='all',currentModule='all',currentAuthor='all';
var typeColors={'功能':['var(--brand-fill)','var(--brand)'],'优化':['#fff1e8','#e8792d'],'修复':['#fef0f0','#e33']};
function updateBadge(){
  var c=getUnreadCount();
  if(!menuBadge) return;
  if(c>0){ menuBadge.style.display=''; }
  else{ menuBadge.style.display='none'; }
}
function getFilteredData(){
  return changelogData.filter(function(l){
    if(currentType!=='all'&&l.type!==currentType) return false;
    if(currentModule!=='all'&&l.module!==currentModule) return false;
    if(currentAuthor!=='all'&&l.author!==currentAuthor) return false;
    return true;
  });
}
function renderChangelog(){
  var list=getFilteredData();
  if(list.length===0){
    changelogBody.innerHTML='<div class="changelog-empty">暂无通知</div>';
    return;
  }
  var html='<table class="changelog-table">';
  html+='<thead><tr><th class="c-type">类型</th><th class="c-module">模块</th><th class="c-content">更新内容</th><th class="c-author">更新人</th><th class="c-date">时间</th></tr></thead><tbody>';
  list.forEach(function(log){
    var tc=typeColors[log.type]||['#eee','#333'];
    html+='<tr class="changelog-row" data-id="'+log.id+'">';
    html+='<td class="c-type"><span class="changelog-type-tag" style="background:'+tc[0]+';color:'+tc[1]+'">'+log.type+'</span></td>';
    html+='<td class="c-module">'+log.module+'</td>';
    html+='<td class="c-content">';
    log.body.split('\n').forEach(function(line,li){
      if(line==='') html+='<br>';
      else html+='<span>'+line.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,function(m,text,url){
        return '<a href="'+url+'" target="_blank" class="changelog-link">'+text+'</a>';
      })+'</span> ';
    });
    html+='</td>';
    html+='<td class="c-author">'+log.author+'</td>';
    html+='<td class="c-date">'+formatRelativeDate(log.date)+'</td>';
    html+='</tr>';
  });
  html+='</tbody></table>';
  changelogBody.innerHTML=html;
  var demoLink=changelogBody.querySelector('a[href="#demo"]');
  if(demoLink){
    demoLink.addEventListener('click',function(e){
      e.preventDefault();
      showView('newtask');
      setNavActive('新会话');
      applyMode('苍穹应用',true);
      setTimeout(function(){ openAppDropdown(); },250);
    });
  }
}
function initFilters(){
  var typeFilter=$('#changelogTypeFilter');
  var moduleFilter=$('#changelogModuleFilter');
  var authorFilter=$('#changelogAuthorFilter');
  if(typeFilter){
    var types=['功能','优化','修复'];
    var allBtn0=document.createElement('button');
    allBtn0.className='changelog-filter-chip active';allBtn0.textContent='全部';allBtn0.dataset.value='all';
    typeFilter.appendChild(allBtn0);
    types.forEach(function(t){
      var btn=document.createElement('button');
      btn.className='changelog-filter-chip';btn.textContent=t;btn.dataset.value=t;
      typeFilter.appendChild(btn);
    });
    typeFilter.addEventListener('click',function(e){
      var chip=e.target.closest('.changelog-filter-chip');if(!chip) return;
      typeFilter.querySelectorAll('.changelog-filter-chip').forEach(function(c){c.classList.remove('active');});
      chip.classList.add('active');currentType=chip.dataset.value;renderChangelog();
    });
  }
  if(moduleFilter){
    var modules=[];
    changelogData.forEach(function(l){ if(modules.indexOf(l.module)===-1) modules.push(l.module); });
    var allBtn=document.createElement('button');
    allBtn.className='changelog-filter-chip active';allBtn.textContent='全部';allBtn.dataset.value='all';
    moduleFilter.appendChild(allBtn);
    modules.forEach(function(m){
      var btn=document.createElement('button');
      btn.className='changelog-filter-chip';btn.textContent=m;btn.dataset.value=m;
      moduleFilter.appendChild(btn);
    });
    moduleFilter.addEventListener('click',function(e){
      var chip=e.target.closest('.changelog-filter-chip');if(!chip) return;
      moduleFilter.querySelectorAll('.changelog-filter-chip').forEach(function(c){c.classList.remove('active');});
      chip.classList.add('active');currentModule=chip.dataset.value;renderChangelog();
    });
  }
  if(authorFilter){
    var authors=[];
    changelogData.forEach(function(l){ if(authors.indexOf(l.author)===-1) authors.push(l.author); });
    var allBtn2=document.createElement('button');
    allBtn2.className='changelog-filter-chip active';allBtn2.textContent='全部';allBtn2.dataset.value='all';
    authorFilter.appendChild(allBtn2);
    authors.forEach(function(a){
      var btn=document.createElement('button');
      btn.className='changelog-filter-chip';btn.textContent=a;btn.dataset.value=a;
      authorFilter.appendChild(btn);
    });
    authorFilter.addEventListener('click',function(e){
      var chip=e.target.closest('.changelog-filter-chip');if(!chip) return;
      authorFilter.querySelectorAll('.changelog-filter-chip').forEach(function(c){c.classList.remove('active');});
      chip.classList.add('active');currentAuthor=chip.dataset.value;renderChangelog();
    });
  }
}
export function openChangelog(){
  showView('changelog');
  $$('.nav-item').forEach(function(n){n.classList.remove('active')});
  renderChangelog();
  changelogData.forEach(function(l){ if(changelogReadIds.indexOf(l.id)===-1) changelogReadIds.push(l.id); });
  saveReadIds(); updateBadge();
}
export function initChangelog() {
  initFilters();
  updateBadge();
}
