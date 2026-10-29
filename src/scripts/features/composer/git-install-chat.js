import { $ } from '../../core/dom.js';
import { showView } from '../../core/view.js';
import { renderExpertChips } from '../expert/chips.js';
import { hideAssetEditorPanel } from '../expert/editor-panel.js';
import { clearPick } from '../expert/store.js';
import { appendAssistantMessage, appendUserMessage, escapeHtml, messagesList, scrollChatBottom, setComposerTaskReference } from './messages.js';
import { activeSessionId, chatSessions, createChatSession, isMyChatSession, rememberActiveChatSession, renderChatSessions, saveChatSessions, set_activeSessionId, set_activeSessionTaskId } from './sessions.js';
import { renderChatTaskSide } from './task-conversation.js';
import { hideTaskQuestionPanel } from './task-create-chat.js';
import { closeChatDocViewer } from './doc-viewer.js';
import { chatInput, refreshChatSend } from './send.js';

/* 「安装 Git」对话：本机没有 Git 时由设置页、准备执行环境跳转过来（lingee:git-install-chat），
   自动发送预置提示词，智能体检查系统、征得确认后安装并验证；进度通过 lingee:git-install-progress 回报给
   collab/local-dev/git-install.js，由它判定完成并刷新本地环境状态。原型为演示脚本，不执行真实命令。 */
var VERSION = 1;
var timers = new Map();
var isWin = /Windows/i.test(navigator.userAgent);
var osName = isWin ? 'Windows' : 'macOS';
var osVersion = isWin ? '11' : '15';

function promptText() {
  return '我在 Lingee 客户端使用协作开发，需要本机安装 Git。请帮我完成安装：\n\n'
    + '1. 先运行 git --version 确认是否已安装；已安装且能正常输出版本号时，直接告诉我结果，不要重复安装。\n'
    + '2. 当前系统：' + osName + ' ' + osVersion + '。按系统选择官方安装方式：\n'
    + '   - macOS：优先运行 xcode-select --install 安装命令行工具；已安装 Homebrew 时也可用 brew install git。\n'
    + '   - Windows：优先使用 winget install --id Git.Git -e --source winget；没有 winget 时，引导我从 https://git-scm.com/download/win 下载安装，安装选项保持默认。\n'
    + '3. 需要管理员权限、系统弹窗确认或下载较大文件时，先告诉我要做什么，等我确认后再继续。\n'
    + '4. 安装完成后再次运行 git --version 验证，并确认命令行能直接找到 git（Windows 需要时提醒我重启 Lingee 客户端）。\n'
    + '5. 只安装 Git，不要修改我的 Git 全局配置、凭据或已有仓库，也不要安装其他软件。\n'
    + '6. 最后用一句话告诉我结果：成功时给出版本号；失败时说明原因和我可以手动处理的步骤。';
}
function progress(status, extra) { document.dispatchEvent(new CustomEvent('lingee:git-install-progress', { detail:Object.assign({ status:status }, extra || {}) })); }
function findActive() { return chatSessions.find(function (row) { return row.id === activeSessionId && row.gitInstall?.version === VERSION; }) || null; }
function say(gi, html) { gi.blocks.push({ type:'text', html:html }); }
function tools(gi, summary, rows) { gi.blocks.push({ type:'tools', summary:summary, rows:rows }); }
function code(text) { return '<code>' + escapeHtml(text) + '</code>'; }

/* ---------- 演示脚本 ---------- */
function later(session, delay, fn) {
  clearTimeout(timers.get(session.id));
  timers.set(session.id, setTimeout(function () {
    timers.delete(session.id);
    var live = chatSessions.find(function (row) { return row.id === session.id; });
    if (!live?.gitInstall) return;
    fn(live);
    saveChatSessions();
    if (activeSessionId === live.id) render(live);
  }, delay));
}
function advance(session) {
  var gi = session.gitInstall;
  if (timers.has(session.id)) return;
  if (gi.phase === 'scan') later(session, 1200, scan);
  else if (gi.phase === 'install') later(session, 2600, finish);
}
function scan(session) {
  var gi = session.gitInstall;
  tools(gi, '运行了 2 条命令 · 检查 Git 与系统', [['git --version', isWin ? "'git' 不是内部或外部命令" : 'command not found: git'], [isWin ? 'ver' : 'sw_vers -productVersion', osName + ' ' + osVersion]]);
  say(gi, '本机还没有 Git。' + (isWin ? '我会用 ' + code('winget install --id Git.Git -e --source winget') + ' 安装，过程中 Windows 可能弹出管理员权限确认。'
    : '我会运行 ' + code('xcode-select --install') + ' 安装命令行工具（含 Git，约 1 GB），系统会弹出安装窗口，可能需要输入管理员密码。') + '要现在开始吗？');
  gi.phase = 'confirm';
  progress('waiting');
}
function start(session) {
  var gi = session.gitInstall;
  gi.blocks.push({ type:'user', text:'开始安装' });
  tools(gi, '运行了 1 条命令 · 安装 Git', [[isWin ? 'winget install --id Git.Git -e --source winget' : 'xcode-select --install', '已打开系统安装窗口，正在下载并安装…']]);
  say(gi, '安装已开始，请在系统窗口里完成确认。装好后我会再验证一次。');
  gi.phase = 'install';
  progress('running');
}
function finish(session) {
  var gi = session.gitInstall, version = isWin ? 'git version 2.47.1.windows.1' : 'git version 2.39.5 (Apple Git-154)';
  tools(gi, '运行了 2 条命令 · 验证安装', [['git --version', version], [isWin ? 'where git' : 'which git', isWin ? 'C:\\Program Files\\Git\\cmd\\git.exe' : '/usr/bin/git']]);
  say(gi, 'Git 安装完成：' + code(version) + '，命令行可以直接找到 git。没有改动你的 Git 配置和凭据。' + (isWin ? '如果 Lingee 仍提示未安装，请重启客户端。' : ''));
  gi.phase = 'done';
  progress('done', { version:version.replace(/^git version /, '') });
}
function cancel(session) {
  var gi = session.gitInstall;
  gi.blocks.push({ type:'user', text:'暂不安装' });
  say(gi, '好的，先不安装。需要时在设置页或准备执行环境里点「安装 Git」，也可以从 ' + code('https://git-scm.com') + ' 手动下载，装好后点「检测」。');
  gi.phase = 'cancelled';
  progress('aborted');
}

/* ---------- 渲染 ---------- */
function blockHtml(block) {
  if (block.type === 'text') return '<div class="ld-msg-text">' + block.html + '</div>';
  return '<div class="ld-tool is-open"><span class="ld-tool-sum">' + escapeHtml(block.summary) + '</span><div class="ld-tool-detail">'
    + block.rows.map(function (row) { return '<div class="ld-tool-row"><code>' + escapeHtml(row[0]) + '</code><span>' + escapeHtml(row[1]) + '</span></div>'; }).join('') + '</div></div>';
}
function liveHtml(gi) {
  if (gi.phase === 'confirm') return '<div class="ld-msg-actions"><button type="button" class="ld-btn ld-btn--primary" data-gi-start>开始安装</button><button type="button" class="ld-btn" data-gi-cancel>暂不安装</button></div>';
  if (gi.phase === 'done' || gi.phase === 'cancelled') return '';
  return '<div class="ld-thinking is-shimmer">' + (gi.phase === 'install' ? '正在安装 Git…' : '正在思考…') + '</div>';
}
function render(session) {
  var gi = session.gitInstall, current = null;
  messagesList.innerHTML = '';
  hideTaskQuestionPanel();
  gi.blocks.forEach(function (block) {
    if (block.type === 'user') { appendUserMessage(block.text); messagesList.lastElementChild?.classList.add('gi-user'); current = null; return; }
    if (!current) current = appendAssistantMessage(null);
    current.insertAdjacentHTML('beforeend', blockHtml(block));
  });
  if (!current) current = appendAssistantMessage(null);
  current.insertAdjacentHTML('beforeend', liveHtml(gi));
  chatInput.contentEditable = 'true';
  chatInput.setAttribute('data-placeholder', gi.phase === 'confirm' ? '回复「开始」或「暂不」…' : '询问 Git 安装情况…');
  scrollChatBottom();
}
function show(session) {
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
  render(session);
  renderChatSessions();
  advance(session);
}
function startGitInstallChat(detail) {
  /* 安装还没结束时回到原对话，不重复新建 */
  var session = chatSessions.find(function (row) { return row.gitInstall?.version === VERSION && !['done', 'cancelled'].includes(row.gitInstall.phase) && isMyChatSession(row); });
  if (session) { set_activeSessionId(session.id); rememberActiveChatSession(session.id); }
  else if (detail?.action === 'open') return;
  else {
    session = createChatSession('安装 Git', null);
    session.projectId = detail?.projectId || '';
    session.gitInstall = { version:VERSION, phase:'scan', blocks:[{ type:'user', text:promptText() }, { type:'text', html:'好的，我先确认本机是否已有 Git，再按系统选择官方安装方式。' }] };
  }
  saveChatSessions();
  show(session);
}

/* 侧栏打开历史会话（session-open.js 调用） */
export function openGitInstallSession(session) {
  clearPick();
  renderExpertChips();
  render(session);
  renderChatSessions();
  advance(session);
}
/* 输入框发送（send.js 调用）：返回 true 表示已处理 */
export function handleGitInstallSend(text) {
  var session = findActive();
  if (!session) return false;
  var gi = session.gitInstall;
  if (gi.phase === 'confirm' && /^(开始|好|确认|是|安装)/.test(text)) start(session);
  else if (gi.phase === 'confirm' && /暂不|不用|取消|算了|否/.test(text)) cancel(session);
  else {
    gi.blocks.push({ type:'user', text:text });
    say(gi, gi.phase === 'done' ? 'Git 已安装完成，可以回到协作开发继续执行任务。' : gi.phase === 'confirm' ? '请回复「开始安装」或「暂不安装」。' : '正在处理，完成后告诉你结果。');
  }
  saveChatSessions();
  render(session);
  advance(session);
  return true;
}
export function initGitInstallChat() {
  document.addEventListener('lingee:git-install-chat', function (e) { startGitInstallChat(e.detail || {}); });
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element) || !t.closest('#view-chat')) return;
    var session = findActive();
    if (!session || session.gitInstall.phase !== 'confirm') return;
    if (t.closest('[data-gi-start]')) { start(session); saveChatSessions(); render(session); advance(session); return; }
    if (t.closest('[data-gi-cancel]')) { cancel(session); saveChatSessions(); render(session); }
  });
}
