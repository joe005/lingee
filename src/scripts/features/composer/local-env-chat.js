import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { setNavActive, showView } from '../../core/view.js';
import { renderExpertChips } from '../expert/chips.js';
import { hideAssetEditorPanel } from '../expert/editor-panel.js';
import { clearPick } from '../expert/store.js';
import { tkProjectById } from '../tasks-v2/data.js';
import { LD_QUIET_ENV, ldAdoptLocalCred, ldAuthUser, ldFindLocalCred, ldLocalConfigPath, ldMarkInitialized, ldOpenAuth, ldOpenDirModal, ldProjectStatus, ldRepoInfo, ldSourceLabel } from '../collab/local-dev.js';
import { appendAssistantMessage, appendUserMessage, escapeHtml, messagesList, scrollChatBottom, setComposerTaskReference } from './messages.js';
import { activeSessionId, chatSessions, createChatSession, isMyChatSession, rememberActiveChatSession, renderChatSessions, saveChatSessions, set_activeSessionId, set_activeSessionTaskId } from './sessions.js';
import { renderChatTaskSide } from './task-conversation.js';
import { hideTaskQuestionPanel } from './task-create-chat.js';
import { closeChatDocViewer } from './doc-viewer.js';
import { chatInput, refreshChatSend } from './send.js';
/* 一期本地配置：仅检测 HTTPS 凭据，确认已有账号；没有账号时使用与设置页相同的登录弹窗。
   目录使用共享「初始化项目」弹窗，默认沿用当前 HTTPS 目录或推荐目录；更改位置使用目录选择器。
   凭据不进入对话；配置失败时可在当前流程修复，完成后继续任务。 */
var ENV_VERSION = 6;
var busySessions = new Set();
var readyCallbacks = new Map();   /* 会话 id → 就绪后「继续执行任务」的回调，只在本次页面有效 */
var askSelection = -1;

/* ---------- 工具 ---------- */
function findSession(id) { return chatSessions.find(function (row) { return row.id === id && row.localEnv?.version === ENV_VERSION; }); }
function activeEnvSession() { return chatSessions.find(function (row) { return row.id === activeSessionId && row.localEnv?.version === ENV_VERSION; }) || null; }
function projectName(id) { return tkProjectById(id)?.name || id; }
function infoOf(id) { return ldRepoInfo(tkProjectById(id)); }
function envId(env) { return env.projectIds[0]; }
function say(env, html) { env.blocks.push({ type:'text', html:html }); }
function tools(env, summary, rows) { env.blocks.push({ type:'tools', summary:summary, rows:rows, open:false }); }
function userSays(env, text) { env.blocks.push({ type:'user', text:text }); }
function code(text) { return '<code>' + escapeHtml(text) + '</code>'; }
/* 常见令牌格式：误发在对话里时不保存这条消息 */
function looksLikeToken(text) {
  return /\b(?:ghp_|gho_|github_pat_|glpat-)[\w-]{8,}/.test(text) || /^[\w-]{24,}$/.test(text.trim());
}

/* ---------- 自动步骤 ---------- */
function renderIfActive(session) { if (activeSessionId === session.id) renderLocalEnvChat(session); }
function later(session, delay, fn) {
  busySessions.add(session.id);
  renderIfActive(session);
  setTimeout(function () {
    busySessions.delete(session.id);
    var live = findSession(session.id);
    if (!live) return;
    fn(live);
    saveChatSessions();
    renderIfActive(live);
    advance(live);
  }, delay);
}
function advance(session) {
  var phase = session.localEnv.phase;
  if (busySessions.has(session.id)) return;
  if (phase === 'scan') later(session, 1100, scan);
  else if (phase === 'init') later(session, 800, initProject);
}
/* ---------- 第 1 步：检查 Git 与账号 ---------- */
function scan(session) {
  var env = session.localEnv, status = ldProjectStatus(envId(env)), info = status.info, host = info.host;
  var cred = !status.authOk && ldFindLocalCred(host);
  var rows = [['git --version', 'git version 2.47.1（Lingee 内置）'],
    [LD_QUIET_ENV + 'git credential fill · host=' + host, status.authOk ? '找到账号 ' + ldAuthUser(status.auth) : cred ? '找到本机 HTTPS 凭据' : '未找到可用账号']];
  if (cred) { ldAdoptLocalCred(host); rows.push(['git ls-remote ' + info.httpsRepo, '可访问']); }
  tools(env, '运行了 ' + rows.length + ' 条命令 · 检查 Git 与 HTTPS 账号', rows);
  var current = ldProjectStatus(envId(env));
  if (current.authOk) {
    say(env, '内置 Git 可用。检测到 ' + code(host) + ' 上的账号 ' + escapeHtml(ldAuthUser(current.auth)) + '。');
    askAccount(session, ldAuthUser(current.auth), ldSourceLabel(current.auth));
    return;
  }
  say(env, '请在登录窗口完成 ' + code(host) + ' 的授权，登录后会自动继续。');
  openLogin(session);
}
function askAccount(session, user, source) {
  var env = session.localEnv, host = infoOf(envId(env)).host;
  env.phase = 'ask';
  env.question = { kind:'account', host:host, user:user, title:'使用 ' + code(host) + ' 上的账号 ' + escapeHtml(user) + ' 吗？',
    options:[{ id:'use', label:'使用 ' + user, desc:'来源：' + source + '。这个平台上的项目共用这个账号', rec:true },
             { id:'switch', label:'切换账号', desc:'在登录窗口使用浏览器授权或访问令牌' }],
    skipLabel:'跳过这个项目' };
  if (env.autoRec) answer(session, 0);
}
/* 设置页和对话统一使用登录弹窗，令牌只在弹窗输入。 */
function openLogin(session) {
  var env = session.localEnv, info = infoOf(envId(env));
  env.phase = 'wait-modal';
  env.question = null;
  ldOpenAuth(info.host, function () {
    var live = findSession(session.id);
    if (!live || live.localEnv.phase !== 'wait-modal') return;
    say(live.localEnv, '已登录 ' + code(info.host) + '，继续初始化项目。');
    askDir(live);
    saveChatSessions();
    renderIfActive(live);
  });
}
/* 默认带出当前 HTTPS 目录或推荐目录；共用选择器、下载、权限校验与失败重试。 */
function askDir(session) {
  session.localEnv.phase = 'wait-dir';
  ldOpenDirModal(envId(session.localEnv), function () {
    var live = findSession(session.id);
    if (!live || live.localEnv.phase !== 'wait-dir') return;
    live.localEnv.phase = 'init';
    saveChatSessions();
    renderIfActive(live);
    advance(live);
  });
}
function answer(session, index, skip) {
  var env = session.localEnv, q = env.question;
  if (!q) return;
  var option = skip ? null : q.options[index];
  if (!skip && !option) return;
  env.question = null;
  userSays(env, skip ? q.skipLabel : option.label);
  if (skip) { env.skipped = true; env.phase = 'init'; return; }
  if (option.id === 'switch') { openLogin(session); return; }
  say(env, '好的，使用 ' + escapeHtml(q.user) + '。');
  askDir(session);
}

/* ---------- 第 4 步：写入本机配置并总结 ---------- */
function initProject(session) {
  var env = session.localEnv, id = envId(env), status = ldProjectStatus(id);
  if (status.ready && !env.skipped) {
    ldMarkInitialized(id);
    tools(env, '编辑了 1 个文件', [[ldLocalConfigPath(id), '项目目录绑定（与任务执行共用）']]);
    say(env, '「' + escapeHtml(projectName(id)) + '」的本地环境已就绪，代码在 ' + code(status.binding.path) + '。本机配置写在仓库之外，仓库文件不受影响。');
  } else {
    say(env, '「' + escapeHtml(projectName(id)) + '」这次没有配置好' + (status.reason ? '（' + escapeHtml(status.reason) + '）' : '') + '，点「继续配置」即可重试。');
  }
  env.phase = 'done';
}

/* ---------- 渲染：消息 ---------- */
var CHECK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>';
var CHEVRON_ICON = '<svg class="ld-tool-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
function blockHtml(block, index) {
  if (block.type === 'text') return '<div class="ld-msg-text">' + block.html + '</div>';
  return '<div class="ld-tool' + (block.open ? ' is-open' : '') + '"><button type="button" class="ld-tool-sum" data-ld-tool="' + index + '" aria-expanded="' + !!block.open + '">' + CHECK_ICON + '<span>' + escapeHtml(block.summary) + '</span>' + CHEVRON_ICON + '</button>'
    + (block.open ? '<div class="ld-tool-detail">' + block.rows.map(function (row) { return '<div class="ld-tool-row"><code>' + escapeHtml(row[0]) + '</code><span>' + escapeHtml(row[1]) + '</span></div>'; }).join('') + '</div>' : '')
    + '</div>';
}
function liveHtml(session) {
  var env = session.localEnv;
  if (env.phase === 'done') {
    var resume = readyCallbacks.has(session.id) && !env.resumed && ldProjectStatus(envId(env)).ready;
    return '<div class="ld-msg-actions">' + (resume ? '<button type="button" class="ld-btn ld-btn--primary" data-ld-chat-resume>继续执行任务</button>' : '')
      + (!ldProjectStatus(envId(env)).ready ? '<button type="button" class="ld-btn ld-btn--primary" data-ld-chat-retry>继续配置</button>' : '')
      + '<button type="button" class="ld-btn" data-ld-chat-view>查看本地环境</button></div>';
  }
  if (env.phase === 'ask') return '';
  if (env.phase === 'wait-modal' || env.phase === 'wait-dir') {
    return '<div class="ld-thinking"><span>' + (env.phase === 'wait-modal' ? '请在登录窗口完成授权' : '请在初始化项目窗口确认代码位置') + '</span></div>'
      + '<div class="ld-msg-actions"><button type="button" class="ld-btn" data-ld-chat-reopen>重新打开窗口</button></div>'
      + '<p class="ld-msg-hint">也可以回复「稍后」先跳过。</p>';
  }
  return '<div class="ld-thinking is-shimmer">正在思考…</div>';
}
function renderLocalEnvChat(session) {
  var env = session.localEnv;
  messagesList.innerHTML = '';
  hideTaskQuestionPanel();
  var current = null;
  env.blocks.forEach(function (block, index) {
    if (block.type === 'user') { appendUserMessage(block.text); current = null; return; }
    if (!current) current = appendAssistantMessage(null);
    current.insertAdjacentHTML('beforeend', blockHtml(block, index));
  });
  if (!current) current = appendAssistantMessage(null);
  current.insertAdjacentHTML('beforeend', liveHtml(session));
  chatInput.contentEditable = 'true';
  chatInput.setAttribute('data-placeholder', env.phase === 'wait-modal' || env.phase === 'wait-dir' ? '回复「稍后」跳过…'
    : env.phase === 'done' ? '询问本地环境状态…' : '正在初始化项目…');
  renderAsk(session);
  scrollChatBottom();
}

/* ---------- 渲染：提问面板（在输入框位置，与客户端 AskUserQuestion 一致） ---------- */
var SPARK_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><path d="m12 8 1.5 2.5L16 12l-2.5 1.5L12 16l-1.5-2.5L8 12l2.5-1.5z"/></svg>';
function removeAsk() {
  document.getElementById('ldAskPanel')?.remove();
  document.querySelector('#view-chat .chat-container')?.classList.remove('ld-asking');
}
function renderAsk(session) {
  var q = session.localEnv.question;
  if (!q || session.localEnv.phase !== 'ask') { removeAsk(); askSelection = -1; return; }
  var container = document.querySelector('#view-chat .chat-container');
  if (!container) return;
  var panel = document.getElementById('ldAskPanel');
  if (!panel) {
    panel = document.createElement('section');
    panel.id = 'ldAskPanel';
    panel.className = 'ld-ask';
    panel.setAttribute('aria-label', '需要你的决定');
    container.insertBefore(panel, document.getElementById('chatComposerWrap'));
  }
  if (panel.dataset.key !== q.title) { askSelection = -1; panel.dataset.key = q.title; }
  container.classList.add('ld-asking');
  panel.innerHTML = '<div class="ld-ask-head"><strong id="ldAskTitle">' + q.title + '</strong></div>'
    + '<div class="ld-ask-options" role="radiogroup" aria-labelledby="ldAskTitle">' + q.options.map(function (option, index) {
      return '<button type="button" class="ld-ask-option' + (askSelection === index ? ' is-on' : '') + '" role="radio" aria-checked="' + (askSelection === index) + '" data-ld-ask="' + index + '">'
        + '<span class="ld-ask-no">' + (index + 1) + '</span><span class="ld-ask-body"><span class="ld-ask-label">' + escapeHtml(option.label) + (option.rec ? '<em>推荐</em>' : '') + '</span>'
        + '<span class="ld-ask-desc">' + escapeHtml(option.desc) + '</span></span></button>';
    }).join('') + '</div>'
    + '<div class="ld-ask-foot"><button type="button" class="ld-ask-rec" data-ld-ask-rec>' + SPARK_ICON + '全选推荐</button>'
    + '<button type="button" class="ld-ask-skip" data-ld-ask-skip>跳过</button>'
    + '<button type="button" class="ld-ask-ok" data-ld-ask-ok' + (askSelection < 0 ? ' disabled' : '') + '>确定</button></div>';
}
function submitAsk(session, index, skip) {
  askSelection = -1;
  answer(session, index, skip);
  saveChatSessions();
  renderLocalEnvChat(session);
  advance(session);
}

/* ---------- 打开会话 ---------- */
function freshEnv(id) {
  return { version:ENV_VERSION, projectIds:[id], phase:'scan',
    blocks:[{ type:'user', text:'帮我配置「' + projectName(id) + '」的本地开发环境' },
      { type:'text', html:'好的，我用「本地环境配置」技能来准备。先检查内置 Git 和仓库所在平台的账号。' }],
    plan:null, pull:0, question:null, waitHost:'', skipped:false, autoRec:false, resumed:false };
}
/* 旧版本保存的会话：改为只配置其中第一个未就绪的项目，重新开始 */
function ensureEnv(session) {
  var env = session.localEnv;
  if (env && env.version === ENV_VERSION && Array.isArray(env.blocks)) return;
  var ids = env?.projectIds || [];
  var id = ids.find(function (row) { var status = ldProjectStatus(row); return status.needed && !status.ready; }) || ids[0];
  session.localEnv = freshEnv(id);
  session.title = '配置本地环境 · ' + projectName(id);
  saveChatSessions();
}
function showLocalEnvSession(session) {
  hideAssetEditorPanel();
  clearPick();
  renderExpertChips();
  set_activeSessionTaskId(null);
  setComposerTaskReference(null);
  showView('chat');
  closeChatDocViewer();
  $('#chatTitle').textContent = session.title;
  chatInput.textContent = '';
  refreshChatSend();
  renderChatTaskSide();
  renderLocalEnvChat(session);
  renderChatSessions();
  advance(session);
}
function startLocalEnvChat(detail) {
  var id = (detail?.projectIds || []).find(function (row) { var status = ldProjectStatus(row); return status.needed && !status.ready; });
  if (!id) { toast('本地环境已就绪', 'success'); if (detail?.onReady) detail.onReady(); return; }
  /* 这个项目还没配完时回到原会话，不重复新建 */
  var session = chatSessions.find(function (row) { return row.localEnv?.version === ENV_VERSION && row.localEnv.phase !== 'done' && envId(row.localEnv) === id && isMyChatSession(row); });
  if (session) {
    set_activeSessionId(session.id);
    rememberActiveChatSession(session.id);
  } else {
    session = createChatSession('配置本地环境 · ' + projectName(id), null);
    session.localEnv = freshEnv(id);
  }
  if (detail.onReady) { readyCallbacks.set(session.id, detail.onReady); session.localEnv.resumed = false; }
  saveChatSessions();
  showLocalEnvSession(session);
}
/* 从侧栏打开历史会话（composer/session-open.js 调用），公共部分已由调用方处理 */
function openLocalEnvSession(session) {
  ensureEnv(session);
  clearPick();
  renderExpertChips();
  renderLocalEnvChat(session);
  renderChatSessions();
  advance(session);
}

/* ---------- 输入框发送（composer/send.js 调用）：返回 true 表示已处理 ---------- */
function handleLocalEnvSend(text) {
  var session = activeEnvSession();
  if (!session) return false;
  var env = session.localEnv;
  if (looksLikeToken(text)) {
    say(env, '看起来你发送了密码或访问令牌。为了安全，这条消息没有保存；请只在登录弹窗里输入，不要发在对话里。');
  } else if (env.phase === 'wait-modal' || env.phase === 'wait-dir') {
    userSays(env, text);
    if (/稍后|跳过|算了|以后/.test(text)) { env.skipped = true; env.phase = 'init'; }
    else say(env, '请在窗口里完成配置；窗口关了的话点「重新打开窗口」，完成后会自动继续。');
  } else {
    userSays(env, text);
    if (env.phase !== 'done') say(env, '正在配置，完成后可以继续问我本地环境的状态。');
    else {
      var status = ldProjectStatus(envId(env));
      say(env, '「' + escapeHtml(projectName(envId(env))) + '」' + (status.ready ? '已就绪，目录 ' + code(status.binding.path) + '，账号 ' + escapeHtml(ldAuthUser(status.auth)) : '未就绪：' + escapeHtml(status.reason))
        + '。退出登录、更改目录请到协作开发的「设置」页签。');
    }
  }
  saveChatSessions();
  renderLocalEnvChat(session);
  advance(session);
  return true;
}

/* ---------- 事件接线（composer/init.js 的 initComposer 调用） ---------- */
function initLocalEnvChat() {
  document.addEventListener('lingee:local-env-chat', function (e) { startLocalEnvChat(e.detail || {}); });
  /* 切到别的会话时消息区会重绘，此时收起提问面板 */
  new MutationObserver(function () { if (!activeEnvSession()) removeAsk(); }).observe(messagesList, { childList:true });
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element) || !t.closest('#view-chat')) return;
    var session = activeEnvSession();
    if (!session) return;
    var env = session.localEnv;
    var tool = t.closest('[data-ld-tool]');
    if (tool) { var block = env.blocks[Number(tool.getAttribute('data-ld-tool'))]; if (block) { block.open = !block.open; saveChatSessions(); renderLocalEnvChat(session); } return; }
    var option = t.closest('[data-ld-ask]');
    if (option) { askSelection = Number(option.getAttribute('data-ld-ask')); renderAsk(session); return; }
    if (t.closest('[data-ld-ask-ok]') && askSelection >= 0) { submitAsk(session, askSelection); return; }
    if (t.closest('[data-ld-ask-skip]')) { submitAsk(session, -1, true); return; }
    if (t.closest('[data-ld-ask-rec]') && env.question) {
      env.autoRec = true;
      submitAsk(session, Math.max(0, env.question.options.findIndex(function (o) { return o.rec; })));
      return;
    }
    if (t.closest('[data-ld-chat-resume]')) {
      var done = readyCallbacks.get(session.id);
      readyCallbacks.delete(session.id);
      env.resumed = true;
      saveChatSessions();
      renderLocalEnvChat(session);
      if (done) done();
      return;
    }
    if (t.closest('[data-ld-chat-reopen]')) {
      if (env.phase === 'wait-modal') openLogin(session);
      if (env.phase === 'wait-dir') askDir(session);
      return;
    }
    if (t.closest('[data-ld-chat-retry]')) { env.skipped = false; env.phase = 'scan'; saveChatSessions(); renderIfActive(session); advance(session); return; }
    if (t.closest('[data-ld-chat-view]')) {
      showView('collab');
      setNavActive('协作开发');
      document.dispatchEvent(new CustomEvent('lingee:collab-nav', { detail:{ tab:'local' } }));
    }
  });
  /* 提问面板的键盘操作：数字键选择，回车确定 */
  document.addEventListener('keydown', function (e) {
    var panel = document.getElementById('ldAskPanel');
    var session = activeEnvSession();
    if (!panel || !session?.localEnv.question || e.target instanceof HTMLInputElement || (e.target instanceof HTMLElement && e.target.isContentEditable)) return;
    var n = Number(e.key);
    if (n >= 1 && n <= session.localEnv.question.options.length) { askSelection = n - 1; renderAsk(session); e.preventDefault(); return; }
    if (e.key === 'Enter' && askSelection >= 0 && !(e.target instanceof HTMLButtonElement)) { submitAsk(session, askSelection); e.preventDefault(); }
  });
}

export { handleLocalEnvSend, initLocalEnvChat, openLocalEnvSession };
