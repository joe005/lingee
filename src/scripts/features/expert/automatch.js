import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { input, setNavActive, showView } from '../../core/view.js';
import { messagesList, refreshSend, scrollChatBottom } from '../composer.js';
import { renderExpertChips } from './chips.js';
import { EX, askFor, xav, xesc } from './data.js';
import { activePick, pickName, pickValid, set_activePick, teamById } from './store.js';
/* 没选专家时的自动匹配
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 没选专家时的自动匹配 ---------- */
/* 专家团不是必选的：不选就由系统按开发模式 + 任务描述挑一个，并在会话里说明挑了谁 */
var MODE_MATCH={
  '苍穹应用':{kind:'team',id:'cosmic-team'},
  '原型探索':{kind:'expert',id:'ux-designer'},
  '通用应用':{kind:'team',id:'fast-app'},
  '业务组件':{kind:'expert',id:'software-engineer'},
  '技能开发':{kind:'expert',id:'software-engineer'},
  '智能体开发':{kind:'expert',id:'software-engineer'}
};
/* 关键词 → 专家。命中多个领域时升级成专家团 */
var KW_MATCH=[
  {id:'cosmic-workflow', kw:['工作流','审批','流转','加签','会签','流程节点']},
  {id:'cosmic-form',     kw:['表单','单据','字段','校验','联动']},
  {id:'cosmic-report',   kw:['报表','取数','图表','口径']},
  {id:'cosmic-plugin',   kw:['插件','扩展点','二开']},
  {id:'cosmic-api',      kw:['接口','对接','鉴权','同步','集成']},
  {id:'frontend-engineer',kw:['页面','前端','样式','组件','响应式','布局']},
  {id:'ux-designer',     kw:['设计','交互','原型','信息架构','视觉']},
  {id:'software-qa-engineer',kw:['测试','验证','回归','用例']},
  {id:'security-reviewer',kw:['安全','漏洞','越权','威胁']},
  {id:'code-reviewer',   kw:['评审','review','代码质量']},
  {id:'software-architect',kw:['架构','选型','边界','技术方案']},
  {id:'software-product-manager',kw:['需求','验收','范围','非目标']}
];
function autoMatch(text){
  var t=String(text||'');
  var hits=KW_MATCH.filter(function(r){
    return r.kw.some(function(k){ return t.toLowerCase().indexOf(k.toLowerCase())>=0; });
  }).filter(function(r){ return !!EX[r.id]; });

  /* 跨了两个以上领域，一个人扛不住，上专家团 */
  if(hits.length>=2){
    var cosmic=hits.filter(function(r){ return r.id.indexOf('cosmic-')===0; }).length;
    var pick=cosmic>=2?'cosmic-team':'software-company';
    if(teamById(pick)) return {kind:'team',id:pick,auto:true};
  }
  if(hits.length===1) return {kind:'expert',id:hits[0].id,auto:true};

  var modeEl=$('.mode-item.checked'), m=modeEl?MODE_MATCH[modeEl.getAttribute('data-val')]:null;
  if(m && ((m.kind==='team'&&teamById(m.id))||(m.kind==='expert'&&EX[m.id])))
    return {kind:m.kind,id:m.id,auto:true};

  return teamById('software-company')?{kind:'team',id:'software-company',auto:true}:null;
}
/* 召唤 = 选中这个专家/专家团 + 把第一条触发词带进输入框 */
function summon(kind,id,phrase){
  var o = kind==='team' ? teamById(id) : EX[id];
  if(!o) return;
  set_activePick({kind:kind,id:id,auto:false});
  renderExpertChips();
  showView('newtask'); setNavActive('新会话');
  var text = phrase || ((o.cmds&&o.cmds.length)?o.cmds[0][0]:'');
  if(input){
    input.setAttribute('data-placeholder','布置任务');
    input.textContent=text;
    input.focus();
    try{
      var r=document.createRange(); r.selectNodeContents(input); r.collapse(false);
      var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    }catch(err){}
  }
  if(typeof refreshSend==='function') refreshSend();
  toast('已召唤「'+o.name+'」','success');
}

/* 发出去的话里还留着没填的 [占位符] —— 专家先问清楚再开工。
   一次把缺的都问完，别挤牙膏式来回问。 */
function appendAskCard(names){
  if(!messagesList||!names.length) return false;
  var who = activePick.kind==='expert' ? EX[activePick.id] : null;
  var av = who ? '<img src="'+xav(who.k)+'" alt="">' : '';
  var box=document.createElement('div');
  box.className='ask-card';
  box.innerHTML='<div class="ask-head">'+av
    +'<span>开始之前，我需要先确认'+(names.length>1?' '+names.length+' 件事':'一件事')+'</span></div>'
    +names.map(function(n,qi){
      var a=askFor(n);
      return '<div class="ask-q" data-ask-q="'+qi+'">'
        +'<div class="ask-q-t"><span class="x-ph">['+xesc(n)+']</span>'+xesc(a.q)+'</div>'
        +'<div class="ask-opts">'
        +a.o.map(function(t,oi){
          return '<button type="button" class="ask-opt" data-ask-pick="'+qi+'" data-ask-oi="'+oi+'">'+xesc(t)+'</button>';
        }).join('')
        +'<button type="button" class="ask-opt ask-opt-other" data-ask-pick="'+qi+'" data-ask-oi="-1">其它…</button>'
        +'</div></div>';
    }).join('')
    +'<div class="ask-foot" id="askFoot">选一个，或直接在下面输入框补充</div>';
  messagesList.appendChild(box);
  scrollChatBottom();
  return true;
}

function appendAutoNote(){
  if(!messagesList||!activePick.auto||!pickValid()) return;
  var isTeam=activePick.kind==='team';
  var av=isTeam
    ? teamById(activePick.id).members.slice(0,3).map(function(i){return '<img src="'+xav(EX[i].k)+'" alt="">'}).join('')
    : '<img src="'+xav(EX[activePick.id].k)+'" alt="">';
  var why=isTeam?'这次要跨多个环节，交给一个专家团':'按你描述的内容匹配到这位专家';
  var note=document.createElement('div');
  note.className='auto-note';
  note.innerHTML='<span class="auto-note-av">'+av+'</span>'
    +'<span class="auto-note-b">你没有指定专家，已自动匹配 <b>'+xesc(pickName())+'</b>'
    +'<i>'+why+'。想换人，点下方输入框左侧的专家按钮。</i></span>';
  messagesList.appendChild(note);
}

export function initAutoMatch() {
  if(messagesList) messagesList.addEventListener('click',function(ev){
    var b=ev.target.closest('[data-ask-pick]');
    if(!b) return;
    var q=b.closest('.ask-q');
    q.querySelectorAll('.ask-opt').forEach(function(x){ x.classList.remove('on') });
    b.classList.add('on');
    q.classList.add('answered');
    var card=b.closest('.ask-card');
    var all=card.querySelectorAll('.ask-q').length;
    var done=card.querySelectorAll('.ask-q.answered').length;
    var foot=card.querySelector('.ask-foot');
    if(done>=all){
      foot.textContent='已确认，继续执行';
      foot.classList.add('ask-foot-done');
    }else{
      foot.textContent='还剩 '+(all-done)+' 项待确认';
    }
  });
}

export { appendAskCard, appendAutoNote, autoMatch, summon };
