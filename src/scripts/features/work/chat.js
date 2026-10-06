import { $, $$ } from '../../core/dom.js';
import { setUrlState, showView } from '../../core/view.js';
/* 工作 · 智能体对话：在工作首页（work/index.js）选中已发布的智能体发送后进入，页内也可切换智能体继续提问。
   回答为本地模拟；设备故障诊断助手按 6.2 演示场景给出先查维修记录、再按经验排查的回答。 */

var DIAG_AGENT = '设备故障诊断助手';
var agent = '';
var busy = false;
var timer = null;

var ICON_THINK = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3z"/><path d="M9.5 20.5h5"/></svg>';
var ICON_LOAD = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"/></svg>';
var ICON_DONE = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>';

function esc(v) { return String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function inputText() { return ($('#wcInput').textContent || '').trim(); }
function syncSend() { $('#wcSend').disabled = busy || !inputText(); }

function closeMenu(focusChip) {
  var menu = $('#wcAgentMenu');
  if (menu.hidden) return;
  menu.hidden = true;
  $('#wcAgentChip').setAttribute('aria-expanded', 'false');
  if (focusChip) $('#wcAgentChip').focus();
}
function openMenu() {
  var menu = $('#wcAgentMenu');
  menu.hidden = false;
  $('#wcAgentChip').setAttribute('aria-expanded', 'true');
  (menu.querySelector('[aria-selected="true"]') || menu.querySelector('.wc-agent-option')).focus();
}
function selectAgent(name) {
  agent = name;
  $('#wcAgentName').textContent = name || '选择智能体';
  $('#wcAgentChip').classList.toggle('is-set', !!name);
  $$('.wc-agent-option').forEach(function (opt) { opt.setAttribute('aria-selected', opt.getAttribute('data-agent') === name ? 'true' : 'false'); });
}

function resetConversation() {
  clearTimeout(timer);
  busy = false;
  var list = $('#wcMessagesList');
  list.replaceChildren();
  var empty = document.createElement('div');
  empty.className = 'wc-empty';
  empty.innerHTML = '<div class="wc-empty-title">有什么可以帮你？</div><div class="wc-empty-desc">选择智能体后直接提问，智能体会调用它的技能来回答。</div>';
  list.appendChild(empty);
  $('#wcTitle').textContent = '新任务';
  $('#wcInput').textContent = '';
  syncSend();
}

function answerFor(name, q) {
  if (name === DIAG_AGENT && /注塑|温度|E21/.test(q)) {
    return {
      mcp: '设备巡检维修系统',
      skills: ['查询设备档案', '查询维修记录'],
      refs: ['维修记录 · 3 号注塑机 · 2026-09-12 更换热电偶', '内置知识 · 注塑机常见故障排查手册.md'],
      html: '<p>查了 3 号注塑机（ZS-03）的维修记录：<strong>9 月 12 日刚换过热电偶</strong>，当时也是温度波动，原因是接线松动。最近换过的零件优先怀疑，建议按这个顺序排查：</p><ol>'
        + '<li><strong>热电偶接线</strong>：先看 9 月换的热电偶接线端子有没有松动、氧化</li>'
        + '<li><strong>加热圈</strong>：测各区加热圈电阻，第 2 区 7 月换过，重点看其他区；<strong>动手前先断电挂牌</strong></li>'
        + '<li><strong>温控表</strong>：前两项都正常，再核对温控表的 PID 参数</li>'
        + '</ol><p>修好后记得在系统里补维修记录，下次排查会更快。</p>'
    };
  }
  if (name === DIAG_AGENT) return { mcp: '设备巡检维修系统', skills: ['查询设备档案'], html: '<p>请告诉我设备编号和故障现象，例如「3 号注塑机温度忽高忽低」，我先查这台设备的档案和维修记录，再给你排查步骤。</p>' };
  if (name) return { skills: [], html: '<p>已收到。「' + esc(name) + '」的回答在演示原型中为本地模拟，请选择「设备故障诊断助手」查看完整示例。</p>' };
  return { skills: [], html: '<p>已收到。选择一个智能体后提问，可以获得更专业的回答。</p>' };
}

function nowLabel() {
  var d = new Date();
  var p = function (n) { return String(n).padStart(2, '0'); };
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function send() {
  var q = inputText();
  if (!q || busy) return;
  busy = true;
  var list = $('#wcMessagesList');
  if ($('.wc-empty', list)) list.replaceChildren();
  $('#wcTitle').textContent = q.length > 24 ? q.slice(0, 24) + '…' : q;
  var user = document.createElement('div');
  user.className = 'message user';
  user.innerHTML = '<div class="message-content"><p>' + esc(q) + '</p></div>';
  list.appendChild(user);
  $('#wcInput').textContent = '';
  syncSend();
  var msg = document.createElement('div');
  msg.className = 'message assistant';
  msg.innerHTML = '<div class="message-content"><div class="wc-trace" role="status"><div class="wc-trace-row is-running">' + ICON_LOAD + '<span>深度思考中…</span></div></div><div class="markdown-content"></div></div>';
  list.appendChild(msg);
  var scroller = $('#wcMessages');
  scroller.scrollTop = scroller.scrollHeight;
  var reply = answerFor(agent, q);
  timer = setTimeout(function () {
    var skills = reply.skills.length;
    $('.wc-trace', msg).innerHTML = '<div class="wc-trace-row">' + ICON_THINK + '<span>深度思考 · 3s</span></div>'
      + '<div class="wc-trace-row">' + ICON_DONE + '<strong>任务完成</strong><span>' + (skills ? '调用 ' + skills + ' 个技能' + (reply.mcp ? '，经 MCP 读取「' + esc(reply.mcp) + '」' : '') : '直接回答') + '</span></div>'
      + (skills ? '<div class="wc-trace-skills">' + reply.skills.map(function (s) { return '<span class="wc-trace-skill">' + esc(s) + '</span>'; }).join('') + '</div>' : '');
    $('.markdown-content', msg).innerHTML = reply.html
      + (reply.refs ? '<div class="wc-refs"><span>参考</span>' + reply.refs.map(function (r) { return '<span class="wc-ref">' + esc(r) + '</span>'; }).join('') + '</div>' : '');
    var meta = document.createElement('div');
    meta.className = 'wc-answer-meta';
    meta.textContent = nowLabel() + (agent ? ' · ' + agent : '');
    $('.message-content', msg).appendChild(meta);
    scroller.scrollTop = scroller.scrollHeight;
    busy = false;
    syncSend();
  }, 1600);
}

/* 已发布、可在工作中提问的智能体（与对话页的智能体菜单一致） */
export var WORK_CHAT_AGENTS = ['设备故障诊断助手', '问卷调研助手', '费报智能体'];

/* 从工作首页进入：带上选中的智能体和问题，直接发送 */
export function openWorkChat(name, question) {
  showView('work-chat');
  setUrlState('/work');
  resetConversation();
  selectAgent(name || '');
  if (question) { $('#wcInput').textContent = question; syncSend(); send(); }
  else $('#wcInput').focus();
}

export function initWorkChat() {
  if (!$('#view-work-chat')) return;
  var input = $('#wcInput');
  input.addEventListener('input', function () { if (!inputText()) input.innerHTML = ''; syncSend(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
  });
  $('#wcSend').addEventListener('click', send);
  $('#wcAgentChip').addEventListener('click', function (e) {
    e.stopPropagation();
    if ($('#wcAgentMenu').hidden) openMenu(); else closeMenu(false);
  });
  $('#wcAgentMenu').addEventListener('click', function (e) {
    var opt = e.target.closest('.wc-agent-option');
    if (!opt) return;
    e.stopPropagation();
    selectAgent(opt.getAttribute('data-agent'));
    closeMenu(false);
    input.focus();
  });
  $('#wcAgentMenu').addEventListener('keydown', function (e) {
    var opts = $$('.wc-agent-option');
    var i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      opts[(i + (e.key === 'ArrowDown' ? 1 : opts.length - 1)) % opts.length].focus();
    } else if (e.key === 'Escape') { e.stopPropagation(); closeMenu(true); }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('#wcAgentDd')) closeMenu(false); });
}
