import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { input, setNavActive, showView } from '../../core/view.js';
import { renderExpertChips, renderModeTag } from './chips.js';
import { AV_KEYS, EX, MY_EXPERTS, WORK_MODES, rebuildExperts, set_MY_EXPERTS, xav, xesc } from './data.js';
import { expertModal, renderExpertGrid } from './library.js';
import { TEAMS, activePick, clearPick, saveTeams } from './store.js';
/* 创建 / 编辑我的专家
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 创建 / 编辑我的专家 ---------- */
/* 两条路：手填这张表单，或者一句话交给 expert-manager 在对话里建（同 WorkBuddy） */
var EXPERT_MANAGER={id:'expert-manager',
  ic:'<path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.2"/><path d="M18 6v6M15 9h6"/>'};
var ONE_LINE_PROMPT='帮我创建一个 XXX 专家，擅长 XXXXX。我的经验是：[请补充你的行业背景、相关经验]';
var forcedBuilder=null;

function startExpertByChat(){
  if(expertEditModal) expertEditModal.classList.remove('show');
  if(expertModal) expertModal.classList.remove('show');
  forcedBuilder=EXPERT_MANAGER;
  $$('.mode-item').forEach(function(m){ m.classList.remove('checked') });
  showView('newtask'); setNavActive('新会话');
  renderModeTag();
  if(input){
    input.setAttribute('data-placeholder','布置任务');
    input.textContent=ONE_LINE_PROMPT;
    input.focus();
    try{
      var r=document.createRange(); r.selectNodeContents(input); r.collapse(false);
      var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    }catch(err){}
  }
  toast('已切到 expert-manager，把这句话补完就行','info');
}

function deleteMyExpert(id){
  var e=EX[id]; if(!e||!e.mine) return;
  var used=TEAMS.filter(function(t){ return t.members.indexOf(id)>=0; });
  var msg='删除专家「'+e.name+'」？此操作不可撤销。';
  if(used.length) msg+='\n他还在 '+used.length+' 个专家团里，删除后会一并移出。';
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

var expertEditModal=$('#expertEditModal'), xeDraft=null, xeEditingId=null;
function setXeTab(which){
  $$('#xeTabs .modal-tab').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-xtab')===which); });
  $$('#expertEditModal .team-pane').forEach(function(el){ el.classList.toggle('hidden', el.getAttribute('data-xpane')!==which); });
  var body=$('#expertEditModal .modal-body'); if(body) body.scrollTop=0;
}
function blankExpert(){
  return {k:'eng',name:'',role:'',desc:'',tags:[],modes:['分析','设计','实现'],
          comp:[],cmds:[['','']]};
}
function openExpertEditor(id){
  if(!expertEditModal) return;
  var e=id?EX[id]:null;
  xeEditingId=(e&&e.mine)?id:null;
  xeDraft = xeEditingId
    ? {k:e.k,name:e.name,role:e.role,desc:e.desc,tags:e.tags.slice(),modes:e.modes.slice(),
       comp:e.comp.slice(),cmds:e.cmds.length?e.cmds.map(function(c){return c.slice()}):[['','']]}
    : blankExpert();
  $('#expertEditTitle').textContent = xeEditingId ? '编辑专家' : '创建专家';
  $('#xeName').value=xeDraft.name; $('#xeRole').value=xeDraft.role; $('#xeDesc').value=xeDraft.desc;
  $('#xeTags').value=xeDraft.tags.join('、'); $('#xeComp').value=xeDraft.comp.join('、');
  $('#xeDeleteBtn').classList.toggle('hidden', !xeEditingId);
  setXeTab('base');
  renderExpertEditor();
  expertEditModal.classList.add('show');
  setTimeout(function(){ $('#xeName').focus(); },40);
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

  $('#xeCmds').innerHTML=d.cmds.map(function(c,i){
    return '<div class="x-cmd-row"><input type="text" class="x-cmd-k" data-xe-cmd="'+i+'" data-f="0" value="'+xesc(c[0])+'" placeholder="用户会怎么说，需要用户提供的内容写成 [方括号]，例如：按[验收条件]把功能实现出来" autocomplete="off">'
      +'<button type="button" class="x-ic x-ic-dg" data-xe-rmcmd="'+i+'" title="删除">✕</button></div>';
  }).join('');
}
function splitList(v){
  return String(v||'').split(/[、,，\n]/).map(function(x){return x.trim()}).filter(Boolean);
}
function splitLines(v){
  return String(v||'').split('\n').map(function(x){return x.trim()}).filter(Boolean);
}

export function initExpertEditor() {
  if($('#xeTabs')) $('#xeTabs').addEventListener('click',function(e){
    var b=e.target.closest('.modal-tab'); if(b) setXeTab(b.getAttribute('data-xtab'));
  });
  if(expertEditModal){
    $('#expertEditClose').addEventListener('click',function(){ expertEditModal.classList.remove('show') });
    $('#xeCancelBtn').addEventListener('click',function(){ expertEditModal.classList.remove('show') });
    $('#xeAddCmd').addEventListener('click',function(){ xeDraft.cmds.push(['','']); renderExpertEditor(); });
    $('#xeDeleteBtn').addEventListener('click',function(){ if(xeEditingId){ expertEditModal.classList.remove('show'); deleteMyExpert(xeEditingId); } });
    $('#xeChatBtn').addEventListener('click',startExpertByChat);
    expertEditModal.addEventListener('click',function(ev){
      if(ev.target===expertEditModal){ expertEditModal.classList.remove('show'); return; }
      var a=ev.target.closest('[data-xe-av]');
      if(a){ xeDraft.k=a.getAttribute('data-xe-av'); renderExpertEditor(); return; }
      var m=ev.target.closest('[data-xe-mode]');
      if(m){
        var v=m.getAttribute('data-xe-mode'), i=xeDraft.modes.indexOf(v);
        if(i<0) xeDraft.modes.push(v); else xeDraft.modes.splice(i,1);
        renderExpertEditor(); return;
      }
      var r=ev.target.closest('[data-xe-rmcmd]');
      if(r){
        xeDraft.cmds.splice(+r.getAttribute('data-xe-rmcmd'),1);
        if(!xeDraft.cmds.length) xeDraft.cmds.push(['','']);
        renderExpertEditor(); return;
      }
    });
    expertEditModal.addEventListener('input',function(ev){
      var c=ev.target.closest('[data-xe-cmd]');
      if(c){ xeDraft.cmds[+c.getAttribute('data-xe-cmd')][+c.getAttribute('data-f')]=c.value; }
    });
    $('#expertEditForm').addEventListener('submit',function(ev){
      ev.preventDefault();
      var d=xeDraft;
      d.name=$('#xeName').value.trim(); d.role=$('#xeRole').value.trim(); d.desc=$('#xeDesc').value.trim();
      d.tags=splitList($('#xeTags').value); d.comp=splitList($('#xeComp').value);
      if(!d.name){ setXeTab('base'); toast('请填写专家名称','warning'); $('#xeName').focus(); return; }
      if(!d.role){ setXeTab('base'); toast('请填写职称，它会显示在名字后面','warning'); $('#xeRole').focus(); return; }
      if(!d.modes.length){ setXeTab('base'); toast('至少勾选一项「可承担的工作」，否则他在专家团里领不到任务','warning'); return; }
      var cmds=d.cmds.map(function(c){ return [String(c[0]||'').trim(),String(c[1]||'').trim()]; })
                     .filter(function(c){ return c[0]; });
      var rec={id:xeEditingId||('my-'+Date.now()),mine:true,k:d.k,name:d.name,role:d.role,by:'我创建的',
               desc:d.desc,tags:d.tags,modes:d.modes.slice(),comp:d.comp,cmds:cmds,
              };
      if(xeEditingId){
        for(var i=0;i<MY_EXPERTS.length;i++) if(MY_EXPERTS[i].id===xeEditingId){ MY_EXPERTS[i]=rec; break; }
        toast('已保存','success');
      }else{
        MY_EXPERTS.push(rec);
        toast('专家「'+rec.name+'」已创建','success');
      }
      rebuildExperts();
      expertEditModal.classList.remove('show');
      saveTeams(); renderExpertGrid(); renderExpertChips();
    });
  }
}

/* forcedBuilder 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set_forcedBuilder(v){ forcedBuilder=v; return v; }

export { deleteMyExpert, forcedBuilder, openExpertEditor };
