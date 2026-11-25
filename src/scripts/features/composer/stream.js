import { tkGetTasks } from '../tasks-v2/data.js';
import { openIssueCount, requirementPoints } from '../tasks-v2/artifact-docs.js';
import { submitTaskStage, taskExecutionStages } from '../tasks-v2/task-execution.js';
import { appendTaskArtifact, createArtifactCard, createFinalResult, escapeHtml, scrollChatBottom, stageSemantic } from './messages.js';
import { activeResponseRun, activeSessionId, chatSessions, renderChatSessions, saveChatSessions } from './sessions.js';
import { switchPreviewTab } from './preview.js';
import { appendTurnFooter } from './turn-footer.js';
import { appendTurnProcess } from './turn-process.js';
/* 对话：Markdown 渲染、流式输出、模拟 AI 回复（拆自 composer.js） */

/* 苍穹应用开发会话的演示脚本，按客户端真实会话的节奏编排：先过程（叙述 + 工具汇总），再给收尾汇总和产物卡片 */
var COSMIC_PROCESS=[
  {tools:[{kind:'skill',text:'cosmic-app-builder'}]},
  {say:'我先确认宿主应用和已有单据，读取采购订单相关的建模约定。',tools:[
    {kind:'search',text:'采购订单 单据模型'},
    {kind:'shell',text:'探测并绑定 Python 命令'},
    {kind:'tool',name:'memory_search',text:' 采购订单 字段 基线确认'}]},
  {say:'上下文绑定完成（应用 kdtest_scm_po_ext，归属已验证）。接下来查询编译器契约并加载命中的专题参考。',tools:[
    {kind:'search',text:'compiler contract BILL_FORM'},
    {kind:'think',text:'需求只给出主表和明细字段，审批流沿用平台默认的单据审核即可。'},
    {kind:'search',text:'分录字段类型目录'},
    {kind:'shell',text:'初始化苍穹应用上下文绑定'}]},
  {say:'需求已明确：新建「采购订单」单据，主表 + 明细分录。先确认价格、数量、金额字段的类型。',tools:[
    {kind:'shell',text:'查询字段类型目录（PriceField / QtyField / AmountField）'},
    {kind:'shell',text:'解析基础资料目标：供应商、物料、币别'}]},
  {say:'字段类型已确认。现在编写 authoring 输入文件。',tools:[
    {kind:'edit',text:'authoring/kdtest_scm_purorder.yaml'}]},
  {say:'执行编译器生成批次工件。',tools:[
    {kind:'shell',text:'编译单据模型并生成批次'}]},
  {say:'编译成功（实体 kdtest_scm_purorder，24 个业务字段）。执行 runBatch 创建到线上并验证。',tools:[
    {kind:'shell',text:'runBatch 创建单据与布局'},
    {kind:'think',text:'布局写入完成，还需要回读确认必填和分区。'},
    {kind:'shell',text:'回读线上表单状态'}]},
  {say:'布局写入验证通过。补上金额联动插件，并跑一遍质量门禁。',tools:[
    {kind:'edit',text:'app/kdtest_scm_po_ext/src/main/java/kdtest/scm/formplugin/PurOrderBillPlugin.java'},
    {kind:'shell',text:'DCS 全模块扫描'},
    {kind:'tool',name:'register_plugin',text:' PurOrderBillPlugin → kdtest_scm_purorder'}]}
];
var COSMIC_REPLY='开发收尾完成。汇总如下：\n\n## 本轮完成\n\n**1. 采购订单单据（主表 + 明细分录）**\n- `kdtest_scm_purorder`（BILL_FORM），24 个业务字段：供应商、采购组织、采购员、币别、付款条件、交货日期等\n- 明细分录 `kdtest_po_entry`：物料编码、规格型号、数量、单价、税率、含税金额\n\n**2. Java 插件 ×1（`app/kdtest_scm_po_ext/src/main/java/kdtest/scm/formplugin/`）**\n- `PurOrderBillPlugin`：数量或单价变化时重算含税金额、税额与表头总金额；供应商变化时带出付款条件和币别\n\n**3. 质量门禁**\n- DCS 全模块扫描：`findingCount=0`\n- 插件注册：1/1 成功并回读验证（`verifiedHere=true`）\n\n## 需你知悉的决策与边界\n- 审批流沿用平台默认的单据审核，未单独配置多级审批\n- 汇率默认取「基础汇率」，币别为人民币时固定为 `1.0000`\n- 与入库单的上下游联查不在本轮范围\n\n如需运行态验收（新增单据、金额计算、审核流转），告诉我即可继续。';
/* 历史回复的耗时：与过程区标题、回复尾一致 */
/* 正文逐字输出：每 30ms 出 3 个字 */
var COSMIC_STREAM_PACE={chunkSize:3,interval:30};
var COSMIC_HISTORY_MS=14*60000+22000;

/* simple markdown → HTML renderer */
function renderMarkdown(text){
  var html=escapeHtml(text);
  html=html.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  html=html.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  html=html.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  html=html.replace(/`([^`]+)`/g,'<code>$1</code>');
  var lines=html.split('\n');
  var out=[];
  var inUl=false,inOl=false;
  for(var i=0;i<lines.length;i++){
    var line=lines[i];
    if(/^\- (.+)$/.test(line)){
      if(!inUl){out.push('<ul>');inUl=true;}
      out.push('<li>'+line.replace(/^\- /,'')+'</li>');
    } else if(/^\d+\. (.+)$/.test(line)){
      if(!inOl){out.push('<ol>');inOl=true;}
      out.push('<li>'+line.replace(/^\d+\. /,'')+'</li>');
    } else {
      if(inUl){out.push('</ul>');inUl=false;}
      if(inOl){out.push('</ol>');inOl=false;}
      if(line.trim()===''){out.push('');}
      else if(/^<(h[23]|ul|ol|li)/.test(line)){out.push(line);}
      else out.push('<p>'+line+'</p>');
    }
  }
  if(inUl)out.push('</ul>');
  if(inOl)out.push('</ol>');
  return out.join('\n');
}

/* 任务会话结果较长，流式节奏需比普通会话慢，避免整段内容一闪而过 */
var TASK_STREAM_PACE={chunkSize:8,interval:80};
/* 流式输出时边出字边排版：未闭合的粗体、行内代码临时补齐，避免露出 Markdown 原始符号 */
function renderPartialMarkdown(text){
  var bold=(text.match(/\*\*/g)||[]).length;
  if(bold%2) text+='**';
  else if(/\*$/.test(text)) text=text.slice(0,-1);
  var ticks=(text.match(/`/g)||[]).length;
  if(ticks%2) text+='`';
  text=text.replace(/(^|\n)(#{1,3}|-|\d+\.)$/,'$1');
  return renderMarkdown(text);
}
function streamText(targetEl,text,onDone,pace){
  var idx=0;
  var chunkSize=pace&&pace.chunkSize?Math.max(1,pace.chunkSize):0;
  var interval=(pace&&pace.interval)||60;
  var cursor=document.createElement('span');
  cursor.className='cursor-blink';
  cursor.textContent='▌';
  var timer=null,done=false;
  function paint(){
    targetEl.innerHTML=renderPartialMarkdown(text.slice(0,idx));
    var last=targetEl.lastElementChild;
    while(last&&last.lastElementChild&&/^(UL|OL|LI)$/.test(last.tagName)) last=last.lastElementChild;
    (last||targetEl).appendChild(cursor);
  }
  function finish(){
    if(done) return;
    done=true;
    clearTimeout(timer);
    cursor.remove();
    targetEl.innerHTML=renderMarkdown(text);
    if(onDone) onDone();
  }
  function typeNext(){
    if(done) return;
    if(!targetEl.isConnected){done=true;return;}
    if(idx<text.length){
      var step=chunkSize||Math.max(2,Math.ceil(text.length/16));
      idx=Math.min(text.length,idx+step);
      paint();
      scrollChatBottom();
      timer=setTimeout(typeNext,interval);
    }else{
      finish();
    }
  }
  typeNext();
  return function(){done=true;clearTimeout(timer);};
}

/* 预览区开关状态：以 localStorage 为唯一来源，默认收起 */
function syncPreviewOpen(artifact){
  var apply=function(){
    var v=document.getElementById('view-chat');
    if(!v)return;
    if(localStorage.getItem('chatPreviewOpen')==='1'){
      if(!v.classList.contains('preview-open')&&artifact&&artifact._openPreview) artifact._openPreview();
      /* 恢复预览页签选择 */
      var savedTab='preview';
      try{savedTab=localStorage.getItem('chatPreviewTab')||'preview'}catch(e){}
      switchPreviewTab(savedTab);
    }else{
      v.classList.remove('preview-open');
      var ps=document.getElementById('chatPreviewSide');
      if(ps){ps.style.width='';ps.style.maxWidth='';}
    }
  };
  apply();
  /* 初始化中若有其它逻辑改动了面板，再以存储值校正一次 */
  requestAnimationFrame(apply);
}
/* 任务会话结果汇报：按任务数据生成正文，需求点数、待确认问题数等口径与产物文档一致 */
function buildTaskResultText(task){
  var stages=taskExecutionStages(task);
  var stage=stages.find(function(s){return s.id===task.executionStageId;})||stages[0]||{};
  var points=requirementPoints(task);
  var core=String(task.desc||'').split(/[。；;\n]/)[0].trim()||('完成「'+task.title+'」主流程');
  var details={
    requirements:['明确业务目标、使用角色与验收边界','拆分 '+points.length+' 条功能需求，并标记优先级与验收条件','登记 '+openIssueCount(task)+' 个待确认问题，供项目负责人核对'],
    design:['确定页面、业务服务、数据访问和外部集成的职责边界','梳理关键字段、状态流转与接口依赖','记录并发修改和外部接口联调风险'],
    planning:['把交付范围拆为可验收的工作项','安排依赖、负责人和阶段里程碑','预留联调、回归与发布检查时间'],
    implementation:['按已确认方案实现页面交互与业务接口','补齐输入校验、状态反馈和异常处理','记录关键接口与组件的实现说明'],
    verification:['验证主流程、边界条件与权限场景','复测异常输入和失败恢复路径','汇总缺陷、回归结果与验收结论'],
    delivery:['核对交付文件、部署配置和接口清单','整理上线验证步骤与回滚说明','汇总已知限制和后续维护事项'],
  }[stageSemantic(stage.name) || stage.id] || ['核对当前阶段的目标与交付边界','按任务描述完成执行和自检','整理可审核的阶段产物'];
  /* 任务可按阶段覆盖要点（如交付智能体的「提交上架」） */
  if (task.stageNotes?.[stage.id]) details=task.stageNotes[stage.id];
  return '我已读取任务「'+task.title+'」的说明。'+(core ? '本次重点是：'+core+'。' : '')+'接下来按「'+(stage.name||'当前阶段')+'」的目标整理交付内容。\n\n'
    +'**'+(stage.name||'当前阶段')+'要点说明：**\n'
    +details.map(function (item) { return '- '+item; }).join('\n')
    +'\n\n「'+(stage.name||'当前阶段')+'」已完成，请确认产物：';
}

function appendTaskReadingSummary(responseEl, task) {
  var thinking = document.createElement('details');
  thinking.className = 'chat-task-thinking';
  thinking.open = true;
  thinking.innerHTML = '<summary><span class="chat-task-thinking-mark" aria-hidden="true">✧</span><span>思考了 1 秒</span><span class="chat-task-thinking-toggle">收起</span></summary>'
    + '<div class="chat-task-thinking-content"><strong>✧ 读取附件</strong><p>已读取「' + escapeHtml(task.title) + '」的任务描述与当前阶段资料，正在核对交付范围、依赖和验收要求。</p></div>';
  thinking.addEventListener('toggle', function () { thinking.querySelector('.chat-task-thinking-toggle').textContent = thinking.open ? '收起' : '展开'; });
  responseEl.appendChild(thinking);
}

function simulateAIResponse(responseEl,instant,task,prompt,onDone){
  var run = activeResponseRun;
  /* 所有会话直接流式输出结果，不展示打钩进度。 */
  var taskResultText=task ? buildTaskResultText(task) : '';
  var timeline=document.createElement('div');
  timeline.className='work-steps';
  if(task)appendTaskReadingSummary(responseEl,task);
  responseEl.appendChild(timeline);
  /* 非任务会话先走处理过程，过程结束后再输出正文 */
  var process=null;
  var completed=false;
  var cancelStream=null;
  var watchdog=null;
  var startedAt=Date.now();
  /* 回复尾：已完成的历史回复没有真实耗时，按正文长度估算 */
  function appendFooter(text){
    var identity=responseEl.parentElement && responseEl.parentElement.querySelector('.chat-agent-identity strong');
    appendTurnFooter(responseEl,{
      text:text,
      durationMs:instant ? (task ? Math.max(3000,text.length*40) : COSMIC_HISTORY_MS) : Date.now()-startedAt,
      agentName:identity ? identity.textContent : '',
      onRegenerate:task ? null : function(){
        responseEl.replaceChildren();
        simulateAIResponse(responseEl,false,null,prompt);
      }
    });
  }
  function finishRun(){
    if(completed)return;
    completed=true;
    clearTimeout(watchdog);
    if(onDone)onDone();
    var currentTask = !instant && task && tkGetTasks().find(function (row) { return row.id === task.id; });
    var submitted = currentTask?.status === 'in_progress' ? submitTaskStage(currentTask) : null;
    if(submitted?.ok) document.dispatchEvent(new CustomEvent('lingee:task-stage-submitted', {detail:{taskId:task.id}}));
    var runningSession = chatSessions.find(function (session) { return session.id === activeSessionId; });
    if (submitted?.ok && runningSession?.demoState === 'running') {
      runningSession.demoState = submitted.autoReviewed ? (submitted.done ? 'confirmed' : 'ended') : 'review';
      runningSession.demoArtifact = true;
      if (runningSession.exchanges.at(-1)) runningSession.exchanges.at(-1).response = taskResultText;
      saveChatSessions();
      renderChatSessions();
    }
  }
  function showCompletedResult(){
    if(completed || run !== activeResponseRun || !responseEl.isConnected)return;
    if(cancelStream)cancelStream();
    if(process)process.finish();
    timeline.replaceChildren();
    var result=createFinalResult(false);
    timeline.appendChild(result);
    var artifact=task ? null : createCosmicArtifactCard();
    var finalText=task ? taskResultText : COSMIC_REPLY;
    result.querySelector('.markdown-content').innerHTML=renderMarkdown(finalText);
    if(task)appendTaskArtifact(result,task,true);else { result.appendChild(artifact); artifact._openPreview(); }
    appendFooter(finalText);
    scrollChatBottom();
    finishRun();
  }

  if(instant){
    if(!task)process=appendTurnProcess(responseEl,COSMIC_PROCESS,{instant:true,durationMs:COSMIC_HISTORY_MS,before:timeline});
    showCompletedResult();
    return;
  }
  watchdog=setTimeout(showCompletedResult,task ? 8000 : 90000);

  function beginStream(){
    if (run !== activeResponseRun || !responseEl.isConnected) return;
    if (completed) return;
    var result=createFinalResult(false);
    timeline.appendChild(result);
    var mc=result.querySelector('.markdown-content');
    var text=task ? taskResultText : COSMIC_REPLY;
    cancelStream=streamText(mc,text,function(){
      if (completed || run !== activeResponseRun || !responseEl.isConnected) return;
      if (task) appendTaskArtifact(result,task,true);
      else { var completedArtifact=createCosmicArtifactCard(); result.appendChild(completedArtifact); completedArtifact._openPreview(); }
      appendFooter(text);
      scrollChatBottom();
      finishRun();
    }, task ? TASK_STREAM_PACE : COSMIC_STREAM_PACE);
  }
  if (task) setTimeout(beginStream, 500);
  else process=appendTurnProcess(responseEl,COSMIC_PROCESS,{before:timeline,onDone:beginStream});
}
/* 苍穹应用产物卡片：与客户端一致，标题 + 「查看实体、插件、页面等配置结果」，点击打开右侧预览 */
function createCosmicArtifactCard(){
  return createArtifactCard({title:'采购订单',desc:'查看实体、插件、页面等配置结果',variant:'app'});
}

export { appendTaskReadingSummary, renderMarkdown, simulateAIResponse };
