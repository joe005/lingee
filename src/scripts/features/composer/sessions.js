import { assetOwnerKey } from '../expert/layers.js';
import { activePick } from '../expert/store.js';
import { tkCurrentStageHandlerId, tkCurrentUserId, tkGetProjectName, tkGetTasks, tkProjectsForCurrentUser } from '../tasks-v2/data.js';
import { escapeHtml, messagesList } from './messages.js';
import { openChatSession } from './session-open.js';
import { renderChatTaskSide } from './task-conversation.js';
/* 对话：会话存储、侧栏最近会话列表、演示会话预置（拆自 composer.js）。
   本文件有模块求值期执行的代码（读取已存会话、补演示会话），由 composer.js 统一引入。 */

var conversationTaskId = null;
var activeSessionTaskId = null;
var activeResponseRun = 0;
var activeSessionId = null;
var restoringChatSession = false;
var CHAT_SESSIONS_KEY = 'lingee-chat-sessions-v1';
var ACTIVE_CHAT_SESSION_KEY = 'lingee-chat-active-session-v1';
var chatSessions = [];
var collapsedChatProjects = new Set();
/* 项目会话超过 5 条时默认收起，点第 5 条下的「展开显示」查看全部（参考 Codex） */
var CHAT_PROJECT_SESSION_LIMIT = 5;
var expandedChatProjects = new Set();
try {
  var savedSessions = JSON.parse(localStorage.getItem(CHAT_SESSIONS_KEY) || '[]');
  if (Array.isArray(savedSessions)) chatSessions = savedSessions.filter(function (session) {
    return session && /^[a-z0-9]+$/i.test(session.id) && typeof session.title === 'string' && Array.isArray(session.exchanges);
  }).slice(0, 200).map(function (session) {
    session.exchanges = session.exchanges.filter(function (exchange) { return exchange && typeof exchange.prompt === 'string'; });
    /* 曾短暂改称「专家 / 专家团」时存下的会话标题，统一回到「智能体 / 智能体团队」 */
    session.title = session.title.replace(/智能体团队/g, '智能体团队').replace(/^(创建|编辑)智能体/, '$1智能体');
    return session;
  });
} catch (e) {}
/* 苍穹项目会话样本：稳定 ID 让已有本地会话与用户回复在刷新后保留。
   response 仅为任务数据缺失时的兜底，正常展示由 demoExchangeText 按统一文案格式生成。 */
var COSMIC_DEMO_SESSIONS = [
  {id:'cosmicdemo9',title:'设计器元模型抽取结果校验规则梳理',taskId:1212,demoState:'running',exchanges:[{prompt:'梳理抽取结果校验规则。',done:false,response:'正在整理字段完整性、继承链与取值域校验规则。'}]},
  {id:'cosmicdemo10',title:'操作注册表双运行时差异口径确认',taskId:1213,demoState:'question',exchanges:[],demoQuestion:{text:'双运行时注册表存在不同映射，需求清单应采用哪种口径？',options:['以当前苍穹运行时为准，另列差异','保留两套映射并标注适用版本'],answer:''}},
  {id:'cosmicdemo1',title:'操作元模型四张注册表抽取方案设计',taskId:1201,demoState:'running',exchanges:[{prompt:'开始执行操作元模型四张注册表抽取方案设计。',done:false,response:'当前阶段正在执行，完成后提交产物。'}]},
  {id:'cosmicdemo2',title:'编辑器提交形状与 EntryId 冲突裁决实现',taskId:1202,demoState:'running',demoArtifact:true,exchanges:[{prompt:'开始执行编辑器提交形状与 EntryId 冲突裁决实现。',done:false,response:'当前阶段正在执行，完成后提交产物。'}]},
  {id:'cosmicdemo3',title:'规则动作类型序列化槽位验证',taskId:1203,demoState:'ended',demoArtifact:true,exchanges:[{prompt:'开始执行规则动作类型序列化槽位验证。',done:true,response:'当前阶段已完成，请确认产物。'}]},
  {id:'cosmicdemo4',title:'属性继承链取值域合并验证',taskId:1207,demoState:'review',demoArtifact:true,exchanges:[{prompt:'开始执行属性继承链取值域合并验证。',done:true,response:'当前阶段已完成，请确认产物。'}]},
  {id:'cosmicdemo5',title:'采购订单规则配置清单交付',taskId:1205,demoState:'question',exchanges:[],demoQuestion:{text:'归档 evidence 时，系统导出的动作参数映射与项目手工维护版本有差异。交付清单应以哪份为准？',options:['以当前系统导出的注册表为准，记录手工版本差异','保留项目手工维护版本，标注与注册表的差异'],answer:''}},
  {id:'cosmicdemo6',title:'扩展表单属性锁定规则解析修复',taskId:1204,demoState:'blocked',exchanges:[{prompt:'开始执行扩展表单属性锁定规则解析修复。',done:true,response:'当前阶段执行中断，请查看失败原因。'}]},
  {id:'cosmicdemo7',title:'属性元模型与 app-build 契约交叉比对集成',taskId:1206,demoState:'confirmed',demoArtifact:true,exchanges:[{prompt:'开始执行属性元模型与 app-build 契约交叉比对集成。',done:true,response:'当前阶段已确认，任务交付完成。'}]},
  {id:'cosmicdemo8',title:'操作业务规则类型目录构建',taskId:84,demoState:'question',exchanges:[],demoQuestion:{
    prompt:'执行「需求分析」：整理 174 个操作业务规则类型及 RunClass、SettingFormId 映射。',
    intro:'正在核对操作业务规则类型目录的映射来源。',
    steps:[
      ['已扫描规则类型注册表','识别出 174 个操作业务规则类型及其挂载关系。'],
      ['正在核对参数映射','RunClass 与 SettingFormId 已完成初步关联，发现双运行时差异。'],
      ['等待映射口径确认','部分规则类型在两套运行时中的 RunClass 不一致，需确认目录采用的口径。'],
    ],
    closing:'确定映射口径后，我会继续生成目录并提交产物。',
    text:'部分操作业务规则类型在两套运行时中的 RunClass 不一致。目录应以哪套映射为准？',
    options:['以当前苍穹运行时的映射为准，另列差异项','同时保留两套运行时映射，并标注适用版本'],
    acknowledgement:'收到，我会按你选择的映射口径继续构建目录。',answer:'',
  }},
];
/* 每位项目成员各有独立的演示会话，回复和阶段确认不会串到其他账号。 */
function seedCosmicDemoSessions() {
  var ownerId = tkCurrentUserId();
  if (!ownerId || !tkProjectsForCurrentUser().some(function (project) { return project.id === 'cosmic-app-dev'; })) return;
  var changed = false;
  COSMIC_DEMO_SESSIONS.forEach(function (sample) {
    var id = sample.id + ownerId;
    var existing = chatSessions.find(function (session) { return session.id === id; });
    if (existing) return;
    var copy = JSON.parse(JSON.stringify(sample));
    copy.id = id;
    copy.ownerId = ownerId;
    copy.projectId = 'cosmic-app-dev';
    copy.teamId = 'cosmic-app-dev';
    copy.stageId = tkGetTasks().find(function (task) { return task.id === copy.taskId; })?.executionStageId || '';
    chatSessions.push(copy);
    changed = true;
  });
  if (changed) saveChatSessions();
}
/* 旧版固定 ID 转为原持有人的独立副本，保留其回复记录。 */
var legacyCosmicDemoChanged = false;
chatSessions.forEach(function (session) {
  if (!/^cosmicdemo\d+$/.test(session.id)) return;
  var ownerId = session.ownerId || tkCurrentStageHandlerId(tkGetTasks().find(function (task) { return task.id === session.taskId; }));
  if (ownerId) { session.id += ownerId; session.ownerId = ownerId; legacyCosmicDemoChanged = true; }
});
if (legacyCosmicDemoChanged) saveChatSessions();
seedCosmicDemoSessions();
function saveChatSessions() {
  try { localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(chatSessions.slice(0, 200))); } catch (e) {}
}
function isMyChatSession(session) {
  if(session.assetCreate||session.assetEdit)return !!session.ownerId&&session.ownerId===assetOwnerKey();
  if (/^cosmicdemo\d+/.test(session.id)) return !!session.ownerId && session.ownerId === tkCurrentUserId();
  return !session.ownerId || session.ownerId === tkCurrentUserId();
}
function activeChatSessionKey() { return ACTIVE_CHAT_SESSION_KEY + ':' + (tkCurrentUserId() || 'guest'); }
function rememberActiveChatSession(sessionId) {
  var session = chatSessions.find(function (row) { return row.id === sessionId; });
  if (session && !session.viewed) { session.viewed = true; saveChatSessions(); }
  try {
    if (sessionId) localStorage.setItem(activeChatSessionKey(), sessionId);
    else localStorage.removeItem(activeChatSessionKey());
  } catch (e) { /* 本地存储不可用时仅保留当前页面状态 */ }
}
function restoreChatSession() {
  var sessionId = '';
  try { sessionId = localStorage.getItem(activeChatSessionKey()) || ''; } catch (e) {}
  var session = chatSessions.find(function (row) { return row.id === sessionId; });
  if (!session || !isMyChatSession(session)) {
    if (sessionId) rememberActiveChatSession(null);
    return false;
  }
  restoringChatSession = true;
  try { openChatSession(session.id); }
  finally {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        restoringChatSession = false;
        document.getElementById('chatDocViewer')?.classList.remove('restoring');
      });
    });
  }
  return true;
}
function taskConversationNeedsReply(task, includeOthers = false) {
  return task?.status === 'in_progress' && chatSessions.some(function (session) {
    return Number(session.taskId) === task.id && (includeOthers || isMyChatSession(session)) && !!session.demoQuestion && !session.demoQuestion.answer;
  });
}
/* 任务列表「待回答」卡片提示用：返回当前等待用户回答的 AI 提问文本，没有则为空串。 */
function taskConversationQuestion(task) {
  if (task?.status !== 'in_progress') return '';
  var session = chatSessions.find(function (row) {
    return Number(row.taskId) === task.id && isMyChatSession(row) && !!row.demoQuestion && !row.demoQuestion.answer;
  });
  return session ? String(session.demoQuestion.text || '') : '';
}
function renderChatSessions() {
  seedCosmicDemoSessions();
  var folders = document.getElementById('chatProjectFolders');
  if (!folders) return;
  var query = String(document.getElementById('sbSearchInput')?.value || '').trim().toLowerCase();
  function projectId(session) {
    var task = tkGetTasks().find(function (row) { return row.id === Number(session.taskId); });
    return session.projectId || task?.project || '';
  }
  /* 含管理板块建的项目（研发任务写入开发板块，项目在管理板块） */
  function projectName(id) { return tkGetProjectName(id); }
  function sessionHtml(session) {
    var running = session.demoState === 'running' || session.exchanges.some(function (exchange) { return !exchange.done && !exchange.waiting; });
    var waiting = session.demoState === 'question' && !session.demoQuestion?.answer || session.exchanges.some(function (exchange) { return !!exchange.waiting; });
    var state = session.demoState === 'blocked' ? 'red' : running ? 'blue' : waiting || session.demoState === 'review' ? 'orange' : 'green';
    return '<button type="button" class="chat-session-entry' + (session.id === activeSessionId ? ' active' : '') + '" data-chat-session="' + session.id + '">' + (session.viewed ? '' : '<span class="dot ' + state + '"></span>') + '<span class="txt">' + escapeHtml(String(session.title)) + '</span></button>';
  }
  var mySessions = chatSessions.filter(isMyChatSession);
  var groups = new Map();
  mySessions.forEach(function (session) {
    var id = projectId(session);
    if (!id || (query && !session.title.toLowerCase().includes(query) && !projectName(id).toLowerCase().includes(query))) return;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(session);
  });
  folders.innerHTML = Array.from(groups, function (entry) {
    var id = entry[0], name = projectName(id), collapsed = collapsedChatProjects.has(id);
    var sessions = entry[1];
    var attrId = escapeHtml(String(id)).replace(/"/g, '&quot;');
    /* 搜索中或当前会话落在收起段时全部展开，保证结果与正在使用的会话可见 */
    var activeIndex = sessions.findIndex(function (session) { return session.id === activeSessionId; });
    var expandAll = !!query || expandedChatProjects.has(id) || activeIndex >= CHAT_PROJECT_SESSION_LIMIT;
    var overflow = sessions.length - CHAT_PROJECT_SESSION_LIMIT;
    var folderIcon = collapsed
      ? '<svg class="chat-project-icon" viewBox="0 0 16 16" fill="none"><path d="M6.26036 2C7.03874 2.00002 7.77849 2.34003 8.2851 2.93099L9.08783 3.86784C9.34114 4.1633 9.71102 4.33333 10.1002 4.33333H12.5136C12.5637 4.33334 12.6125 4.33912 12.6594 4.34961C14.0645 4.50628 15.1265 5.75221 15.0195 7.19727L14.649 12.1973C14.5457 13.5896 13.3857 14.6666 11.9895 14.6667H3.70437C2.30813 14.6667 1.14815 13.5897 1.04487 12.1973L0.674423 7.19727C0.600705 6.20208 1.08157 5.30192 1.84695 4.78646V4.66667C1.84695 3.19391 3.04086 2 4.51361 2H6.26036ZM3.33393 5.66667C2.5588 5.66667 1.94734 6.32532 2.0045 7.09831L2.37429 12.0983C2.42587 12.7946 3.0062 13.3333 3.70437 13.3333H11.9895C12.6876 13.3333 13.268 12.7945 13.3196 12.0983L13.6894 7.09831C13.7465 6.32536 13.135 5.66673 12.36 5.66667H3.33393ZM4.51361 3.33333C3.89154 3.33333 3.3705 3.75975 3.22325 4.33594C3.25991 4.33445 3.29688 4.33333 3.33393 4.33333H7.73041L7.27273 3.79883C7.01943 3.50337 6.64953 3.33335 6.26036 3.33333H4.51361Z" fill="currentColor"/></svg>'
      : '<svg class="chat-project-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 7V4.5A1.5 1.5 0 0 1 3 3h3l1.5 1.5H12A1.5 1.5 0 0 1 13.5 6v1"/><path d="M2.7 7h10.8a1 1 0 0 1 .97 1.24l-1.15 4.6a1 1 0 0 1-.97.76H2.5a1 1 0 0 1-.97-.76L.76 9.76A2.2 2.2 0 0 1 2.7 7Z"/></svg>';
    var chevronIcon = '<path d="M11.8619 5.5287C12.1223 5.26835 12.5443 5.26835 12.8046 5.5287C13.0649 5.78905 13.065 6.21109 12.8046 6.47141L9.03706 10.239C8.46432 10.8117 7.53562 10.8117 6.96284 10.239L3.19526 6.47141C2.93491 6.21106 2.93491 5.78905 3.19526 5.5287C3.45561 5.26835 3.87762 5.26835 4.13797 5.5287L7.90555 9.29628C7.95763 9.34825 8.04232 9.34831 8.09435 9.29628L11.8619 5.5287Z" fill="currentColor"/>';
    /* 展开后不再显示按钮；只有收起态且超过 5 条时出现「展开显示」 */
    var sessionsHtml = expandAll
      ? sessions.map(sessionHtml).join('')
      : sessions.slice(0, CHAT_PROJECT_SESSION_LIMIT).map(sessionHtml).join('')
        + (overflow > 0
          ? '<button type="button" class="chat-project-more" data-chat-project-toggle="' + attrId + '"><span class="txt">展开显示</span></button>'
          : '');
    return '<div class="chat-project-folder' + (collapsed ? ' collapsed' : '') + '" data-chat-project="' + attrId + '">'
      + '<button type="button" class="chat-project-title" aria-expanded="' + !collapsed + '">' + folderIcon + '<span class="txt">' + escapeHtml(name) + '</span><span class="chat-project-chevron"><svg viewBox="0 0 16 16" fill="none">' + chevronIcon + '</svg></span></button>'
      + '<div class="chat-project-sessions">' + sessionsHtml + '</div></div>';
  }).join('');
}
function createChatSession(title, taskId) {
  var task = tkGetTasks().find(function (row) { return row.id === taskId; });
  var projectId = task?.project || '';
  var teamId = task?.teamId || (activePick.kind === 'team' ? activePick.id : '');
  var session = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), title: title, taskId: taskId, stageId: task?.executionStageId || '', projectId: projectId, teamId: teamId, ownerId: tkCurrentUserId(), executionPick: {...activePick}, exchanges: [] };
  if (projectId) collapsedChatProjects.delete(projectId);
  chatSessions.unshift(session);
  var regularCount = 0;
  chatSessions = chatSessions.filter(function (row) { return row.demoState || ++regularCount <= 30; });
  activeSessionId = session.id;
  rememberActiveChatSession(session.id);
  saveChatSessions();
  renderChatSessions();
  return session;
}
function addSessionExchange(prompt) {
  var session = chatSessions.find(function (row) { return row.id === activeSessionId; });
  if (!session) return null;
  session.exchanges.forEach(function (exchange) { exchange.done = true; });
  session.exchanges.push({ prompt: prompt, done: false });
  session.executionLocked = true;
  saveChatSessions();
  renderChatSessions();
  return session.exchanges.length - 1;
}
function finishSessionExchange(sessionId, index) {
  var session = chatSessions.find(function (row) { return row.id === sessionId; });
  if (!session || !session.exchanges[index]) return;
  session.exchanges[index].done = true;
  saveChatSessions();
  renderChatSessions();
  if (sessionId === activeSessionId) renderChatTaskSide();
}
function appendChatStageEndMarker(marker) {
  var line = document.createElement('div');
  line.className = 'chat-stage-end';
  line.dataset.stageId = marker.stageId;
  line.setAttribute('role', 'status');
  var icon = document.createElement('span');
  icon.className = 'chat-stage-end-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="currentColor"/><path d="M10.951 4.249C11.283 4.581 11.283 5.119 10.951 5.451L5.951 10.451C5.619 10.783 5.081 10.783 4.749 10.451L2.749 8.451C2.417 8.119 2.417 7.581 2.749 7.249C3.081 6.917 3.619 6.917 3.951 7.249L5.35 8.648L9.749 4.249C10.081 3.917 10.619 3.917 10.951 4.249Z" fill="white"/></svg>';
  var label = document.createElement('span');
  label.textContent = '「' + marker.stageName + '」已完成';
  line.appendChild(icon);
  line.appendChild(label);
  var responses = messagesList.querySelectorAll('.message.assistant .assistant-response');
  (responses[responses.length - 1] || messagesList).appendChild(line);
}
function renderChatStageEndMarkers(session, exchangeIndex, afterQuestion) {
  (session.stageEndMarkers || []).forEach(function (marker) {
    if (marker.afterExchangeIndex === exchangeIndex && !!marker.afterQuestion === !!afterQuestion) appendChatStageEndMarker(marker);
  });
}

/* 以下变量由同目录其他模块写入；import 绑定只读，所以走 setter */
function set_activeSessionTaskId(v){ activeSessionTaskId=v; return v; }
function set_activeResponseRun(v){ activeResponseRun=v; return v; }
function set_activeSessionId(v){ activeSessionId=v; return v; }
function set_conversationTaskId(v){ conversationTaskId=v; return v; }

export { activeResponseRun, activeSessionId, activeSessionTaskId, addSessionExchange, appendChatStageEndMarker, chatSessions, collapsedChatProjects, conversationTaskId, createChatSession, expandedChatProjects, finishSessionExchange, isMyChatSession, rememberActiveChatSession, renderChatSessions, renderChatStageEndMarkers, restoreChatSession, restoringChatSession, saveChatSessions, seedCosmicDemoSessions, set_activeResponseRun, set_activeSessionId, set_activeSessionTaskId, set_conversationTaskId, taskConversationNeedsReply, taskConversationQuestion };
