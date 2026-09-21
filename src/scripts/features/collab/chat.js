import { input } from '../../core/view.js';
import { CV_MEMBERS, CV_TASKS, CV_THIRD_PARTY_MEMBERS, cvPersistPersons } from './data.js';
import { cvPersistSquads, cvRenderSquadDetail, cvRenderSquadList, cvSquadAddPerson } from './squads.js';
import { cvNormalizeTask } from './tasks.js';
import { cvShowPanel, cvToast } from './view.js';
/* 协作开发：会话
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ============ CHAT ============ */
function cvSwitchToChat(){
  cvShowPanel('chat');
}
function cvAddChatMessage(type,text){
  var body=document.getElementById('cv-chat-body');if(!body)return;
  var msg=document.createElement('div');msg.className='chat-msg chat-msg--'+type;
  var avatar=type==='agent'?'AI':'我';
  var time=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
  msg.innerHTML='<div class="chat-msg-avatar">'+avatar+'</div><div><div class="chat-msg-bubble">'+text+'</div><div class="chat-msg-time">'+time+'</div></div>';
  body.appendChild(msg);body.scrollTop=body.scrollHeight;
}
function cvAddChatTyping(){
  var body=document.getElementById('cv-chat-body');if(!body)return;
  if(document.getElementById('cv-chat-typing-indicator'))return;
  var t=document.createElement('div');t.className='chat-msg chat-msg--agent';t.id='cv-chat-typing-indicator';
  t.innerHTML='<div class="chat-msg-avatar">AI</div><div class="chat-typing"><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span></div>';
  body.appendChild(t);body.scrollTop=body.scrollHeight;
}
function cvRemoveChatTyping(){var t=document.getElementById('cv-chat-typing-indicator');if(t&&t.parentNode)t.parentNode.removeChild(t);}
function cvSimulateExecution(taskTitle,card){
  var titleEl=document.getElementById('cv-chat-task-title');if(titleEl)titleEl.textContent=taskTitle;
  var badge=document.getElementById('cv-chat-status-badge');if(badge){badge.className='chat-status-badge chat-status-badge--running';badge.innerHTML='<span style="width:6px;height:6px;border-radius:50%;background:var(--dot-blue);animation:cvPulse 1.5s infinite"></span>执行中';}
  var body=document.getElementById('cv-chat-body');if(body)body.innerHTML='';
  var steps=[
    {delay:500,msg:'正在分析任务需求...'},
    {delay:2000,msg:'已生成需求规格说明书，包含 3 个功能点和 5 个验收标准。'},
    {delay:3000,msg:'正在设计技术方案，确定使用苍穹元数据 + KWC 页面开发模式...'},
    {delay:3000,msg:'技术方案已就绪。开始生成业务对象和字段定义...'},
    {delay:3000,msg:'已生成 5 个业务对象、12 个字段、2 个表单页面。正在生成后端插件代码...'},
    {delay:3000,msg:'插件代码已生成完成。正在执行单元测试...'},
    {delay:2500,msg:'单元测试全部通过（8/8）。正在生成测试报告...'},
    {delay:2000,msg:'执行完成！所有产物已生成。',done:true}
  ];
  var i=0;
  function next(){
    if(i>=steps.length)return;var step=steps[i];
    setTimeout(function(){
      cvRemoveChatTyping();cvAddChatMessage('agent',step.msg);
      if(step.done){
        var b=document.getElementById('cv-chat-status-badge');if(b){b.className='chat-status-badge chat-status-badge--done';b.innerHTML='<span style="width:6px;height:6px;border-radius:50%;background:var(--success)"></span>已完成';}
        if(card){
          card.setAttribute('data-status','已完成');
          var sb=card.querySelector('.badge-status');if(sb){sb.className='badge-status badge-status--done';sb.innerHTML='<span class="badge-status-dot"></span>已完成';}
          var node=card.querySelector('.card-node');if(node)node.innerHTML='<span class="card-node-dot" style="background:var(--brand)"></span>部署发布';
          var ca=card.querySelector('.card-actions');if(ca)ca.style.display='';ca.innerHTML='<span class="card-node"><span class="card-node-dot" style="background:var(--brand)"></span>部署发布</span><div style="display:flex;gap:4px;margin-left:auto"><button class="card-view-btn" onclick="event.stopPropagation();cvOpenConversation(this.closest(\'.card\'))" title="查看对话"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>查看对话</button></div>';
          card.classList.add('card--clickable');card.onclick=function(e){if(!e.target.closest('.card-view-btn'))cvOpenConversation(card);};
        }
        var conv=document.querySelector('.sub-item.cv-running');if(conv){conv.classList.remove('cv-running');var dot=conv.querySelector('.dot');if(dot)dot.className='dot green';}
        if(body){
          var artDiv=document.createElement('div');artDiv.className='chat-artifacts';
          artDiv.innerHTML='<div class="chat-artifacts-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>产物列表</div>';
          var arts=[['spec','S','需求规格说明书','PRD.md','已归档'],['doc','D','技术方案文档','TechSpec.md','已归档'],['code','</>','业务对象定义','ExpenseBO.java','已归档'],['code','</>','插件源代码','ExpensePlugin.java','已归档'],['test','T','单元测试','ExpenseTest.java','8/8通过'],['code','</>','表单页面','ExpenseForm.kwc','已归档']];
          var iconMap={'spec':'artifact-icon--spec','doc':'artifact-icon--doc','code':'artifact-icon--code','test':'artifact-icon--test'};
          arts.forEach(function(a){artDiv.innerHTML+='<div class="artifact-item"><div class="artifact-icon '+(iconMap[a[0]]||'artifact-icon--doc')+'">'+a[1]+'</div><span>'+a[2]+'</span><span class="artifact-meta">'+a[4]+'</span></div>';});
          body.appendChild(artDiv);body.scrollTop=body.scrollHeight;
        }
        cvToast('任务执行完成！','success');
      }else{cvAddChatTyping();i++;next();}
    },step.delay);
  }
  cvAddChatTyping();i=1;next();
}
function cvSendChatMessage(){
  var input=document.getElementById('cv-chat-input');if(!input||!input.value.trim())return;
  cvAddChatMessage('user',input.value.trim());input.value='';cvAddChatTyping();
  setTimeout(function(){cvRemoveChatTyping();cvAddChatMessage('agent','收到，正在处理您的请求...');},1500);
}

/* ============ OPEN CONVERSATION ============ */
function cvOpenConversation(card){
  if(!card)return;
  var titleEl=card.querySelector('.card-title');var taskTitle=titleEl?titleEl.textContent:'任务对话';
  var status=card.getAttribute('data-status')||'未开始';
  window.cvCard=card;
  var titleInput=document.getElementById('cv-chat-task-title');if(titleInput)titleInput.textContent=taskTitle;
  var badge=document.getElementById('cv-chat-status-badge');
  if(badge){
    var sm={'未开始':['pending','var(--text-secondary)','未开始'],'待评审':['review','var(--warning)','待评审'],'进行中':['running','var(--dot-blue)','执行中'],'已完成':['done','var(--success)','已完成'],'已失败':['fail','var(--danger)','已失败']};
    var s=sm[status]||['pending','var(--text-secondary)','未开始'];
    badge.className='chat-status-badge chat-status-badge--'+s[0];
    badge.innerHTML='<span style="width:6px;height:6px;border-radius:50%;background:'+s[1]+(status==='进行中'?';animation:cvPulse 1.5s infinite':'')+'"></span>'+s[2];
  }
  var body=document.getElementById('cv-chat-body');if(body)body.innerHTML='';
  var dialogues={
    '进行中':[['agent','正在分析任务需求...'],['agent','已生成需求规格说明书，包含 3 个功能点和 5 个验收标准。'],['agent','正在设计技术方案，确定使用苍穹元数据 + KWC 页面开发模式...'],['agent','技术方案已就绪。开始生成业务对象和字段定义...'],['user','字段命名规范要符合公司标准，请参考 ERP 字段命名规范。'],['agent','已调整字段命名规范。已生成 5 个业务对象、12 个字段。正在生成后端插件代码...']],
    '待评审':[['agent','已完成任务开发，以下是生成的产物，请评审。'],['user','代码质量如何？有没有安全问题？'],['agent','代码已通过 SAST 扫描，无安全漏洞。单元测试覆盖率 92%。'],['agent','等待评审人确认...']],
    '已完成':[['agent','正在分析任务需求...'],['agent','已生成需求规格说明书。'],['agent','技术方案已就绪，开始生成代码...'],['agent','插件代码已生成完成。单元测试全部通过（8/8）。'],['user','测试报告发一下。'],['agent','已生成测试报告，所有验收标准均通过。'],['agent','执行完成！所有产物已生成并归档。']],
    '已失败':[['agent','正在分析任务需求...'],['agent','已生成需求规格说明书。'],['agent','开始生成代码...'],['agent','执行过程中出现错误：插件编译失败，缺少依赖 com.kingdee.cosmic.*'],['user','检查一下依赖配置。'],['agent','已排查，苍穹 SDK 版本不兼容。需要升级到 7.0+ 版本。'],['agent','任务执行失败，请检查环境配置后重试。']]
  };
  var msgs=dialogues[status]||[];msgs.forEach(function(m){cvAddChatMessage(m[0],m[1]);});
  var artifacts={
    '进行中':[['spec','S','需求规格说明书','PRD.md','已生成'],['doc','D','技术方案文档','TechSpec.md','已生成'],['code','</>','业务对象定义','ExpenseBO.java','已生成'],['code','</>','表单页面','ExpenseForm.kwc','生成中...']],
    '待评审':[['code','</>','插件源代码','ExpensePlugin.java','待评审'],['test','T','单元测试','ExpenseTest.java','8/8通过'],['spec','S','需求规格','PRD.md','已生成'],['doc','D','技术方案','TechSpec.md','已生成']],
    '已完成':[['spec','S','需求规格说明书','PRD.md','已归档'],['doc','D','技术方案文档','TechSpec.md','已归档'],['code','</>','业务对象定义','ExpenseBO.java','已归档'],['code','</>','插件源代码','ExpensePlugin.java','已归档'],['test','T','单元测试','ExpenseTest.java','8/8通过'],['code','</>','表单页面','ExpenseForm.kwc','已归档']],
    '已失败':[['spec','S','需求规格说明书','PRD.md','已生成'],['doc','D','技术方案文档','TechSpec.md','已生成'],['code','</>','插件源代码','ExpensePlugin.java','编译失败']]
  };
  var arts=artifacts[status]||[];
  if(arts.length>0&&body){
    var artDiv=document.createElement('div');artDiv.className='chat-artifacts';
    artDiv.innerHTML='<div class="chat-artifacts-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>产物列表</div>';
    var iconMap={'spec':'artifact-icon--spec','doc':'artifact-icon--doc','code':'artifact-icon--code','test':'artifact-icon--test'};
    arts.forEach(function(a){artDiv.innerHTML+='<div class="artifact-item"><div class="artifact-icon '+(iconMap[a[0]]||'artifact-icon--doc')+'">'+a[1]+'</div><span>'+a[2]+'</span><span class="artifact-meta">'+a[4]+'</span></div>';});
    body.appendChild(artDiv);body.scrollTop=body.scrollHeight;
  }
  cvSwitchToChat();
}


function cvOpenAddMemberModal(){
  var el=document.getElementById('cv-addmember-overlay');if(el)el.style.display='flex';
  cvSearchThirdPartyMembers('');
}
function cvCloseAddMemberModal(){
  var el=document.getElementById('cv-addmember-overlay');if(el)el.style.display='none';
}
function cvSearchThirdPartyMembers(q){
  var list=document.getElementById('cv-tp-list');if(!list)return;
  q=(q||'').toLowerCase();
  var existing=CV_MEMBERS.map(function(m){return m.name;});
  var filtered=CV_THIRD_PARTY_MEMBERS.filter(function(m){
    return(m.name.toLowerCase().indexOf(q)>=0||m.email.toLowerCase().indexOf(q)>=0)&&existing.indexOf(m.name)<0;
  });
  if(filtered.length===0){list.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-soft);font-size:13px">未找到可添加的人员</div>';return;}
  list.innerHTML=filtered.map(function(m){
    return '<div class="tp-item" onclick="this.classList.toggle(\'tp-item--selected\')">'
      +'<div class="tp-avatar">'+m.name[0]+'</div>'
      +'<div class="tp-info"><div class="tp-name">'+m.name+'</div><div class="tp-email">'+m.email+'</div></div>'
      +'<div class="tp-meta"><span class="tp-role">'+m.role+'</span><span class="tp-dept">'+m.dept+'</span></div>'
      +'<div class="tp-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>'
      +'</div>';
  }).join('');
}
function cvConfirmAddMembers(){
  var selected=document.querySelectorAll('#cv-tp-list .tp-item--selected');
  if(selected.length===0){cvToast('请选择要添加的人员','warning');return;}
  var tagMap={'开发':'member-tag--dev','架构':'member-tag--arch','测试':'member-tag--qa','运维':'member-tag--ops','需求':'member-tag--pm','产品':'member-tag--pm'};
  var n=0;
  selected.forEach(function(el){
    var name=el.querySelector('.tp-name').textContent;
    var email=el.querySelector('.tp-email').textContent;
    var role=el.querySelector('.tp-role').textContent;
    var deptEl=el.querySelector('.tp-dept');
    var pid='p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    CV_MEMBERS.push({id:pid,name:name,email:email,dept:deptEl?deptEl.textContent:'',roles:[{tag:tagMap[role]||'member-tag--dev',text:role}],status:'available',source:'直接添加'});
    cvPersistPersons();
    cvSquadAddPerson(pid);
    n++;
  });
  cvPersistSquads();
  cvCloseAddMemberModal();
  cvToast('已添加 '+n+' 名协作人员到团队','success');
}
function cvLoadSavedTasks(){
  try{
    var tasks=JSON.parse(localStorage.getItem('build_tasks')||'[]');
    tasks.forEach(function(task){var row=cvNormalizeTask(task);if(!CV_TASKS.some(function(t){return t.source===row.source&&t.sourceId===row.sourceId&&t.project===row.project;}))CV_TASKS.unshift(row);});
  }catch(e){}
}

export { cvCloseAddMemberModal, cvConfirmAddMembers, cvLoadSavedTasks, cvOpenAddMemberModal, cvOpenConversation, cvSearchThirdPartyMembers, cvSendChatMessage, cvSimulateExecution, cvSwitchToChat };
