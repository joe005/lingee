import { tkGetTasks } from '../tasks-v2/data.js';
import { openIssueCount, requirementPoints } from '../tasks-v2/artifact-docs.js';
import { submitTaskStage, taskExecutionStages } from '../tasks-v2/task-execution.js';
import { appendTaskArtifact, createArtifactCard, createFinalResult, escapeHtml, scrollChatBottom, stageSemantic } from './messages.js';
import { activeResponseRun, activeSessionId, chatSessions, renderChatSessions, saveChatSessions } from './sessions.js';
import { switchPreviewTab } from './preview.js';
import { appendTurnFooter } from './turn-footer.js';
/* 对话：Markdown 渲染、流式输出、模拟 AI 回复（拆自 composer.js） */

var mockReplies=[
  '已完成采购订单管理应用的开发，以下是实现方案：\n\n## 功能模块\n\n**1. 采购订单创建**\n- 支持选择供应商、采购员、币别、付款条件\n- 明细行可添加物料编码、名称、规格、数量、单价\n- 自动计算含税金额、折扣金额、总金额\n\n**2. 审批流程**\n- 草稿 → 提交 → 部门主管审核 → 财务复核 → 总经理审批（金额>10万触发）\n- 审批意见可追溯，支持驳回退回至草稿\n\n**3. 变更与关闭**\n- 已审核订单支持变更，记录变更前后差异\n- 支持手工关闭和自动关闭（到货完成后自动关闭）\n\n## 技术要点\n- 基于苍穹平台 DynamicObject 实现单据模型，主表 + 明细表关联\n- 使用 QFilter 构建多维度查询（供应商、日期范围、单据状态）\n- 审批流集成 ProcessPlugin，支持节点回退和会签\n\n如需调整字段或流程配置，随时告诉我。',
  '采购订单管理应用开发完成，核心交付内容如下：\n\n**已完成模块：**\n1. 采购订单单据模型（含 32 个字段，覆盖供应商、采购组织、明细行等）\n2. 列表页与详情页（支持批量审核、按状态筛选、模糊搜索）\n3. 审批流程（三级审核：部门主管 → 财务 → 总经理）\n4. 报表导出（PDF / Excel，支持自定义模板）\n\n**关键实现：**\n- 明细行金额自动计算：含税金额 = 数量 × 含税单价，折扣金额自动倒算\n- 供应商联动带出付款条件、币别、默认税率\n- 采购订单与入库单上下游联动，支持部分到货和分批入库\n\n**性能指标：**\n- 列表查询响应 < 200ms（万级数据量）\n- 审批提交 < 500ms\n\n可以直接发布到测试环境验证，或需要我调整某些细节？',
  '基于采购订单管理需求，已完成应用搭建，以下是关键设计：\n\n## 数据模型\n- **采购订单主表**：单据编号、供应商、采购组织、币别、付款条件、交货日期、采购员\n- **采购订单明细**：物料编码、物料名称、规格型号、采购数量、单位、含税单价、金额、税率\n\n## 页面布局\n- 列表页：按单据状态（草稿 → 已提交 → 已审核 → 已关闭）分类筛选\n- 详情页：头信息 + 明细行 + 审批记录三段式布局\n- 支持从采购申请单下推生成采购订单，自动带出明细行\n\n## 业务规则\n1. 同一供应商同月采购金额超 50 万，自动触发总经理审批\n2. 含税金额 = 数量 × 含税单价，折扣金额 = 不含税金额 × 折扣率\n3. 到货数量不可超过采购数量，超量时拦截并提示\n4. 已关闭订单不允许生成入库单\n\n需要我针对哪个模块进一步展开说明？'
];

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
function streamText(targetEl,text,onDone,pace){
  var idx=0;
  var chunkSize=pace&&pace.chunkSize?Math.max(1,pace.chunkSize):0;
  var interval=(pace&&pace.interval)||60;
  var cursor=document.createElement('span');
  cursor.className='cursor-blink';
  cursor.textContent='▌';
  targetEl.appendChild(cursor);
  targetEl.style.whiteSpace='pre-wrap';
  targetEl.style.wordBreak='break-word';
  var timer=null,done=false;
  function finish(){
    if(done) return;
    done=true;
    clearTimeout(timer);
    cursor.remove();
    targetEl.innerHTML=renderMarkdown(text);
    targetEl.style.whiteSpace='';
    targetEl.style.wordBreak='';
    if(onDone) onDone();
  }
  function typeNext(){
    if(done) return;
    if(!targetEl.isConnected){done=true;return;}
    if(idx<text.length){
      var chunk=chunkSize
        ? text.slice(idx,idx+chunkSize)
        : text.slice(idx,idx+Math.max(2,Math.ceil(text.length/16)));
      cursor.insertAdjacentText('beforebegin',chunk);
      idx+=chunk.length;
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
  var completed=false;
  var cancelStream=null;
  var watchdog=null;
  var startedAt=Date.now();
  /* 回复尾：已完成的历史回复没有真实耗时，按正文长度估算 */
  function appendFooter(text){
    var identity=responseEl.parentElement && responseEl.parentElement.querySelector('.chat-agent-identity strong');
    appendTurnFooter(responseEl,{
      text:text,
      durationMs:instant ? Math.max(3000,text.length*40) : Date.now()-startedAt,
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
    timeline.replaceChildren();
    var result=createFinalResult(!task);
    timeline.appendChild(result);
    var artifact=task ? null : createArtifactCard();
    var finalText=task ? taskResultText : mockReplies[Math.floor(Math.random()*mockReplies.length)];
    result.querySelector('.markdown-content').innerHTML=renderMarkdown(finalText);
    if(task)appendTaskArtifact(result,task,true);else { result.appendChild(artifact); artifact._openPreview(); }
    appendFooter(finalText);
    scrollChatBottom();
    finishRun();
  }

  if(instant){
    showCompletedResult();
    return;
  }

  watchdog=setTimeout(showCompletedResult,8000);

  function beginStream(){
    if (run !== activeResponseRun || !responseEl.isConnected) return;
    if (completed) return;
    var result=createFinalResult(!task);
    timeline.appendChild(result);
    var mc=result.querySelector('.markdown-content');
    var text=task ? taskResultText : mockReplies[Math.floor(Math.random()*mockReplies.length)];
    cancelStream=streamText(mc,text,function(){
      if (completed || run !== activeResponseRun || !responseEl.isConnected) return;
      if (task) appendTaskArtifact(result,task,true);
      else { var completedArtifact=createArtifactCard(); result.appendChild(completedArtifact); completedArtifact._openPreview(); }
      appendFooter(text);
      scrollChatBottom();
      finishRun();
    }, task ? TASK_STREAM_PACE : null);
  }
  if (task) setTimeout(beginStream, 500);
  else beginStream();
}

export { appendTaskReadingSummary, renderMarkdown, simulateAIResponse };
