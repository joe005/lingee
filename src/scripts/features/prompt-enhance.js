import { $ } from '../core/dom.js';

/* 提示词增强：idle → loading → applied（撤回）
   assets/icons/README.md 为这个三态流程指定了
   SmartIdentifierIcon / SpinnerIcon / LeftRollbackIcon 三个图标。
   applied 态记住增强前的原文，点撤回还原。 */

var ENHANCE_DELAY=900;

function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* 原型的"增强"是固定的结构化解法，不依赖输入内容 */
function enhancedText(raw){
  return [
    '请作为资深产品与技术专家，完成以下任务：',
    '',
    '【任务目标】',
    raw,
    '',
    '【输出要求】',
    '1. 先给出整体方案与关键决策点',
    '2. 分模块列出具体实现步骤',
    '3. 标注依赖项、风险与验证方式',
    '',
    '【约束条件】',
    '- 结论需可执行，给出明确的下一步',
    '- 不确定的信息请显式标注，不要臆测'
  ].join('\n');
}

/* contenteditable 不认 \n，换行要落到 <br>；
   改完文本派发 input 事件，交给各输入框已有的监听刷新发送按钮 */
function setText(input,text){
  input.innerHTML=escapeHtml(text).replace(/\n/g,'<br>');
  input.dispatchEvent(new Event('input',{bubbles:true}));
}

function bindEnhance(btn,input,idleAria){
  if(!btn||!input) return;
  var original=null;
  var busy=false;

  /* 空内容置灰；但 applied 态即使清空也要留着——撤回还得能还原原文 */
  function syncEmpty(){
    var canGrey=!btn.classList.contains('is-applied')&&!btn.classList.contains('is-loading');
    btn.classList.toggle('is-empty',canGrey&&input.textContent.trim()==='');
  }

  btn.addEventListener('click',function(){
    if(busy) return;

    /* applied 态点击 = 撤回增强 */
    if(btn.classList.contains('is-applied')){
      if(original!==null) setText(input,original);
      original=null;
      btn.classList.remove('is-applied');
      btn.setAttribute('data-tooltip','提示词增强');
      btn.setAttribute('aria-label',idleAria);
      syncEmpty();
      input.focus();
      return;
    }

    var raw=input.textContent.trim();
    if(!raw){ input.focus(); return; }

    busy=true;
    btn.classList.add('is-loading');
    syncEmpty();
    setTimeout(function(){
      busy=false;
      btn.classList.remove('is-loading');
      original=raw;
      setText(input,enhancedText(raw));
      btn.classList.add('is-applied');
      btn.setAttribute('data-tooltip','撤回增强');
      btn.setAttribute('aria-label',idleAria==='enhance'?'rollback-enhance':'chat-rollback');
      syncEmpty();
      input.focus();
    },ENHANCE_DELAY);
  });

  input.addEventListener('input',syncEmpty);
  syncEmpty();
}

export function initPromptEnhance(){
  bindEnhance($('#enhanceBtn'),$('#composerInput'),'enhance');
  bindEnhance($('#chatEnhanceBtn'),$('#chatInput'),'chat-enhance');
}
