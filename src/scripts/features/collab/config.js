import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { cvConfigOverride, cvProject, cvProjectName } from './data.js';
/* 协作开发：设置（全局默认 / 项目覆盖）
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 设置：全局默认 / 项目覆盖 ---------- */
var cvConfigValues={};               /* {'global'|项目id:{开关 key:是否开启}} */
function cvConfigScopeKey(card){
  /* 全局设置项永远读写全局；项目可覆盖项在「项目覆盖」时读写本项目 */
  if(card.getAttribute('data-cv-level')==='global') return 'global';
  return (cvProject && cvConfigOverridden(card.getAttribute('data-cv-config'))) ? cvProject : 'global';
}
function cvCaptureConfigDefaults(){
  if(cvConfigValues.global) return;
  var g={};
  $$('#cv-config [data-cv-toggle]').forEach(function(t){ g[t.getAttribute('data-cv-toggle')]=t.classList.contains('on'); });
  cvConfigValues.global=g;
}
function cvApplyConfigValues(){
  $$('#cv-config .config-card').forEach(function(card){
    var scope=cvConfigScopeKey(card), store=cvConfigValues[scope]||{};
    $$('[data-cv-toggle]',card).forEach(function(t){
      var k=t.getAttribute('data-cv-toggle');
      var v=(k in store)?store[k]:cvConfigValues.global[k];
      t.classList.toggle('on',!!v);
    });
  });
}
function cvConfigOverridden(key){
  return !!(cvProject && cvConfigOverride[cvProject] && cvConfigOverride[cvProject][key]);
}
function cvApplyConfigScope(){
  $$('#cv-config .config-card').forEach(function(card){
    var key=card.getAttribute('data-cv-config');
    var level=card.getAttribute('data-cv-level');
    var chip=card.querySelector('[data-cv-scope-chip]');
    var locked;
    if(!cvProject){
      locked=false;
      if(chip){ chip.textContent=level==='global'?'全局设置':'全局默认'; chip.className='cv-scope-chip'; }
    }else if(level==='global'){
      locked=true;
      if(chip){ chip.textContent='全局设置 · 项目不可改'; chip.className='cv-scope-chip'; }
    }else{
      locked=!cvConfigOverridden(key);
      if(chip){
        chip.textContent=locked?'跟随全局':'项目覆盖';
        chip.className='cv-scope-chip cv-scope-chip--btn'+(locked?'':' cv-scope-chip--on');
        chip.setAttribute('role','button');
      }
    }
    card.classList.toggle('cv-card-locked',locked);
  });
  cvApplyConfigValues();
}
var cvConfigPanel=$('#cv-config');

export function initCollabConfig() {
  if(cvConfigPanel) cvConfigPanel.addEventListener('click',function(e){
    var tg=e.target.closest('[data-cv-toggle]');
    if(tg){
      var tcard=tg.closest('.config-card');
      if(tcard.classList.contains('cv-card-locked')) return;
      var scope=cvConfigScopeKey(tcard);
      if(!cvConfigValues[scope]) cvConfigValues[scope]={};
      cvConfigValues[scope][tg.getAttribute('data-cv-toggle')]=!tg.classList.contains('on');
      cvApplyConfigValues();
      return;
    }
    var chip=e.target.closest('.cv-scope-chip--btn'); if(!chip||!cvProject) return;
    var card=chip.closest('.config-card'), key=card.getAttribute('data-cv-config');
    if(!cvConfigOverride[cvProject]) cvConfigOverride[cvProject]={};
    var on=!cvConfigOverridden(key);
    cvConfigOverride[cvProject][key]=on;
    if(on && !cvConfigValues[cvProject]){
      cvConfigValues[cvProject]={};      /* 首次覆盖时继承一份全局值再改 */
      Object.keys(cvConfigValues.global).forEach(function(k){ cvConfigValues[cvProject][k]=cvConfigValues.global[k]; });
    }
    cvApplyConfigScope();
    toast(on?('「'+cvProjectName(cvProject)+'」已改为项目覆盖，可单独调整'):'已恢复跟随全局设置');
  });
  var cfgNav=$('#cv-config .config-nav');
  if(cfgNav) cfgNav.addEventListener('click',function(e){
    var item=e.target.closest('[data-config-nav]'); if(!item) return;
    $$('#cv-config .config-nav-item').forEach(function(n){ n.classList.toggle('on', n===item); });
    var which=item.getAttribute('data-config-nav');
    $$('#cv-config .config-pane').forEach(function(p){ p.classList.toggle('hidden', p.getAttribute('data-config-pane')!==which); });
    if(which==='perm' && window.cvRenderPermTable) window.cvRenderPermTable();
  });
}

export { cvApplyConfigScope, cvCaptureConfigDefaults };
