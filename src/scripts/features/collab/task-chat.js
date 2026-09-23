import { CV_TASKS, CV_PROJECTS, cvPeopleInProject } from './data.js';
import { xesc } from '../expert/data.js';
import { tbLabel, tbOwner, tbGetSelected, tbSetSelected, tbTaskId, tbMatchExperts, tbSave, tbTeamName } from './tb-core.js';
import { tbOpenTask, renderTaskBoard } from './task-board.js';
import { advanceTaskRuntime, failTaskRuntime, retryTaskRuntime, startTaskRuntime } from './runtime.js';
/* 任务对话：多会话（列表/详情）、会话窗口跳转、转交任务、附件上传
   从 task-board.js 拆出，副作用集中在 initTaskChat()。 */


function sel() { return tbGetSelected(); }
let windowConversation = null;
function chatMsg(m) {
  const isAgent = m.role === 'agent';
  return '<div class="tb-chat-msg tb-chat-msg--' + (isAgent ? 'agent' : 'user') + '"><div class="tb-chat-av' + (isAgent ? ' tb-chat-av--agent' : '') + '">' + (isAgent ? '✦' : '我') + '</div><div class="tb-chat-bubble">' + xesc(m.text) + '</div></div>';
}
/* 一个任务可以有多个会话：列表（会话总结）↔ 会话详情 */
function taskConversations(t) {
  if (!t) return [];
  if (!t.conversations || !t.conversations.length) {
    const first = { id: 'c1', title: '主会话', createdAt: Date.now(), messages: [] };
    if (t.messages && t.messages.length) first.messages = t.messages;
    else if (t.activity && t.activity.length) t.activity.forEach(a => first.messages.push({ role: 'user', text: (a.author ? a.author + '：' : '') + a.text }));
    else first.messages.push({ role: 'agent', text: '任务已指派给我（' + tbOwner(t) + '）。\n已匹配到专家团【' + tbTeamName(t) + '】，根据任务意图，参与执行的专家：' + tbMatchExperts(t).join('、') + '。\n需要我先从哪一步开始？' });
    t.conversations = [first];
  }
  return t.conversations;
}
function taskActiveConv(t) {
  if (!t) return null;
  const convs = taskConversations(t);
  return convs.find(c => c.id === t.activeConv) || null;
}
function taskMessages(t) {
  const c = taskActiveConv(t);
  return c ? c.messages : [];
}
function tbConvSummary(c) {
  const last = c.messages[c.messages.length - 1];
  return last ? last.text.replace(/\s+/g, ' ').slice(0, 60) : '暂无消息';
}
function tbConvListHtml(t) {
  const convs = taskConversations(t);
  if (!convs.length) return '<div class="tb-chat-empty">还没有会话，点右上「发起会话」开一个。</div>';
  return '<div class="tb-conv-list">' + convs.map(c =>
    '<button type="button" class="tb-conv-item" data-conv="' + xesc(c.id) + '"><span class="tb-conv-item-title">' + xesc(c.title) + '</span><span class="tb-conv-item-sum">' + xesc(tbConvSummary(c)) + '</span><span class="tb-conv-item-meta">' + c.messages.length + ' 条消息</span></button>'
  ).join('') + '</div>';
}
function tbConvDetailHtml(t) {
  const c = taskActiveConv(t);
  return '<div class="tb-conv-bar"><button type="button" class="tb-conv-back" data-conv-back>← 会话列表</button><span class="tb-conv-cur">' + xesc(c.title) + '</span></div>'
    + '<div class="tb-chat" id="tb-chat">' + c.messages.map(chatMsg).join('') + '</div>'
    + '<div class="composer tb-chat-composer"><div class="composer-input" id="tb-chat-input" contenteditable="true" data-placeholder="输入你的问题或指令"></div><div class="composer-bar"><div class="dropdown"><button class="round-btn" type="button" aria-label="add"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></button></div><div class="spacer"></div><button class="round-btn" type="button" aria-label="mic"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button><button class="send-btn" type="button" id="tb-chat-send" aria-label="发送"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></div></div>';
}
function tbRenderConvArea() {
  const box = document.getElementById('tb-conv-area');
  const t = sel();
  if (!box || !t) return;
  box.innerHTML = taskActiveConv(t) ? tbConvDetailHtml(t) : tbConvListHtml(t);
}
/* 会话记录仅任务处理人可见 */
function tbCurrentUserName() {
  const role = document.body.getAttribute('data-role');
  const map = { owner: '吴宏超', dev: '张工', pm: '赵琳', qa: '陈晨', ops: '周杰' };
  return map[role] || '吴宏超';
}
function tbCanSeeConv(t) {
  if (!t) return false;
  const role = document.body.getAttribute('data-role');
  if (role === 'owner') return true;
  const me = tbCurrentUserName();
  if (t.assignee === me || tbOwner(t) === me) return true;
  /* 阶段处理人（含已完成的阶段）保留只读可见，不因流转到下一人就看不到 */
  if ((t.stagePlan || []).some(sp => sp.assignee === me)) return true;
  return (t.reviews || []).some(r => r.reviewer === me || (r.decisions || []).some(d => d.by === me));
}
/* 从会话窗口返回：回到任务的会话列表 */
function tbBackConvList() {
  if (window.cvSwitchView) window.cvSwitchView('tasks');
  const t = sel();
  if (t) { t.activeConv = null; tbSave(); tbOpenTask(CV_TASKS.indexOf(t)); document.querySelector('[data-detail-tab="conversations"]')?.click(); }
}
/* 打开会话窗口（新页签会话）：左侧挂会话 + 对话视图加载 */
function tbOpenConvWin(id) {
  const t = sel();
  if (!t || !tbCanSeeConv(t)) return;
  const conv = taskConversations(t).find(c => c.id === id);
  if (!conv) return;
  t.activeConv = id;
  windowConversation = { task: t, conv };
  tbSave();
  const name = (t.title || '任务') + ' · ' + conv.title;
  const group = document.querySelector('.sb-scroll .project-group');
  if (group && !Array.from(group.querySelectorAll('[data-task-conversation]')).some(item => item.dataset.taskConversation === tbTaskId(t) + ':' + id)) {
    const item = document.createElement('div');
    item.className = 'sub-item';
    item.dataset.taskConversation = tbTaskId(t) + ':' + id;
    item.innerHTML = '<span class="dot blue"></span><span class="txt">' + xesc(name) + '</span>';
    item.addEventListener('click', () => { tbSetSelected(t); tbOpenConvWin(id); });
    const head = group.querySelector('.group-head');
    if (head && head.nextSibling) group.insertBefore(item, head.nextSibling); else group.appendChild(item);
  }
  const titleEl = document.getElementById('cv-chat-task-title'); if (titleEl) titleEl.textContent = name;
  const badge = document.getElementById('cv-chat-status-badge');
  if (badge) { badge.className = 'chat-status-badge'; badge.textContent = tbLabel(t.status) + ' · 本地演示'; }
  const input = document.getElementById('cv-chat-input'); if (input) input.value = '';
  const body = document.getElementById('cv-chat-body');
  if (body) {
    body.innerHTML = '';
    conv.messages.forEach(m => {
      const isAgent = m.role === 'agent';
      const el = document.createElement('div');
      el.className = 'chat-msg chat-msg--' + (isAgent ? 'agent' : 'user');
      el.innerHTML = '<div class="chat-msg-avatar">' + (isAgent ? 'AI' : '我') + '</div><div><div class="chat-msg-bubble">' + xesc(m.text) + '</div></div>';
      body.appendChild(el);
    });
  }
  if (window.cvSwitchView) window.cvSwitchView('chat');
}
function tbOpenConv(id) { tbOpenConvWin(id); }
function tbBackConv() { const t = sel(); if (!t) return; t.activeConv = null; tbSave(); tbRenderConvArea(); }
/* 新会话：直接进入新页签会话，不在任务详情页内联操作 */
function tbNewConv() {
  const t = sel();
  if (!t || !tbCanSeeConv(t)) return;
  /* 发起会话启动 Runtime；Task 只消费运行期回流，不保存内部阶段。 */
  if (!t.runtime && !['审核中', '已完成'].includes(t.status)) {
    t.activity ||= [];
    t.activity.push({ author: tbCurrentUserName(), text: '发起会话，已生成执行计划' });
    startTaskRuntime(t);
  }
  const convs = taskConversations(t);
  convs.push({ id: 'c' + Date.now(), title: '会话 ' + (convs.length + 1), createdAt: Date.now(), messages: [{ role: 'agent', text: '新会话已开始，请告诉我要做什么。' }] });
  tbSave();
  renderTaskBoard();
  tbOpenConvWin(convs[convs.length - 1].id);
}
function tbRenderChat() {
  const box = document.getElementById('tb-chat');
  const t = sel();
  if (!box || !t) return;
  box.innerHTML = taskMessages(t).map(chatMsg).join('');
  const main = box.closest('.tb-detail-main');
  if (main) main.scrollTop = main.scrollHeight;
}
function tbAgentReply(text, t) {
  if (/重试|恢复/.test(text)) { retryTaskRuntime(t); return '已从失败的 WorkItem 恢复执行。'; }
  if (/失败|中断|报错/.test(text)) { failTaskRuntime(t, text); return '已记录本次 WorkItemRun 失败，任务进入“需处理”。'; }
  if (/下一步|完成当前|继续执行/.test(text)) {
    advanceTaskRuntime(t);
    return t.runtime.status === 'completed' ? '全部 WorkItem 已完成，状态和交付产物已回流到任务，等待发起交付评审。' : '当前 WorkItem 已完成，Runtime 已按依赖关系启动下一项。';
  }
  if (/执行|开始|跑|启动/.test(text)) { startTaskRuntime(t); return 'Runtime 已启动，并按依赖关系执行第一个 WorkItem。'; }
  if (/进展|状态|怎么样了|如何/.test(text)) return '当前状态：' + tbLabel(t.status) + '，进度 ' + (t.progress || 0) + '%。';
  if (/转交|分配|谁来/.test(text)) return '收到，请在右侧属性栏选择负责人，或告诉我转交给谁。';
  if (/评审|审核/.test(text)) return '已记录评审请求。当前尚未接入审批流程，请先核对任务的验收标准与交付产物。';
  return '已记录：' + text + '\n（本地演示回复，未调用专家执行。）';
}
/* 复用会话窗口时，消息仍归属于明确的任务与会话。 */
function tbSendWindowMessage() {
  const title = document.getElementById('cv-chat-task-title');
  if (!windowConversation || title?.textContent !== windowConversation.task.title + ' · ' + windowConversation.conv.title) return false;
  const { task, conv } = windowConversation;
  if (!tbCanSeeConv(task)) return true;
  const input = document.getElementById('cv-chat-input');
  const text = input?.value.trim();
  if (!text) return true;
  conv.messages.push({ role: 'user', text }, { role: 'agent', text: tbAgentReply(text, task) });
  tbSave(); tbSetSelected(task); tbOpenConvWin(conv.id);
  input.focus();
  return true;
}
function tbChatSend() {
  const t = sel();
  if (!t) return;
  const input = document.getElementById('tb-chat-input');
  if (!input) return;
  const text = (input.textContent || '').trim();
  if (!text) return;
  const msgs = taskMessages(t);
  msgs.push({ role: 'user', text });
  input.innerHTML = '';
  tbRenderChat();
  setTimeout(() => { msgs.push({ role: 'agent', text: tbAgentReply(text, t) }); tbRenderChat(); tbSave(); }, 700);
}
/* 任务详情：上传附件 */
function tbAddFile() {
  const t = sel();
  if (!t) return;
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.multiple = true;
  inp.onchange = () => {
    t.files = t.files || [];
    Array.from(inp.files || []).forEach(f => t.files.push(f.name));
    tbSave();
    tbRenderFiles();
  };
  inp.click();
}
function tbRenderFiles() {
  const box = document.querySelector('#cv-tasks .tb-files');
  const t = sel();
  if (!box || !t) return;
  box.innerHTML = (t.files || []).map(f => '<span class="tb-file">' + xesc(f) + '</span>').join('');
  const sec = box.closest('.tb-detail-section');
  const cnt = sec && sec.querySelector('h3 small');
  if (cnt) cnt.textContent = (t.files || []).length;
}
/* 转交任务：从项目成员中选人。 */
function tbOpenTransfer(opts) {
  const t = sel();
  if (!t) return;
  opts = opts || {};
  const title = opts.title || '转交任务';
  const action = opts.action || 'transfer';
  const reopen = opts.reopen !== false;
  const proj = CV_PROJECTS.find(p => p.id === t.project);
  const people = (proj ? cvPeopleInProject(proj) : [])
    .map(m => ({ kind: 'person', name: m.name, role: (m.roles || []).map(r => r.text).join(' · ') }));
  const old = document.getElementById('tb-transfer-overlay'); if (old) old.remove();
  const item = (p, i) => '<button type="button" class="person-item" data-tf-pick="' + i + '"><span class="person-avatar-sm">' + xesc(p.name[0]) + '</span><span class="tf-item-body"><span class="person-name-sm">' + xesc(p.name) + '</span><span class="person-role-sm">' + xesc(p.role) + '</span></span></button>';
  const all = people;
  const el = document.createElement('div');
  el.className = 'sync-overlay'; el.id = 'tb-transfer-overlay';
  el.innerHTML = '<div class="task-modal tf-modal"><div class="task-modal__header"><h3 class="task-modal__title">' + title + '</h3><button type="button" class="task-modal__close" data-tf-close>×</button></div><div class="task-modal__body"><div class="tf-search-wrap"><svg class="ic ic-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input type="search" id="tf-search" placeholder="搜索人员或专家" autocomplete="off"></div><div class="tf-list" id="tf-list">'
    + '<div class="tf-group" data-kind="person"><div class="tf-group-t">项目成员<span>' + people.length + '</span></div>' + people.map((p, i) => item(p, i)).join('') + '</div>'
    + '</div></div><div class="task-modal__footer"><button type="button" class="sync-modal__btn sync-modal__btn--ghost" data-tf-close>取消</button><button type="button" class="sync-modal__btn sync-modal__btn--primary" data-tf-confirm>确认转交</button></div></div>';
  (document.getElementById("cvModals") || document.body).appendChild(el);
  const search = el.querySelector('#tf-search');
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    el.querySelectorAll('.tf-group').forEach(g => {
      let n = 0;
      g.querySelectorAll('.person-item').forEach(it => {
        const txt = (it.querySelector('.person-name-sm').textContent + it.querySelector('.person-role-sm').textContent).toLowerCase();
        const hit = !q || txt.includes(q);
        it.style.display = hit ? '' : 'none';
        if (hit) n++;
      });
      g.style.display = n ? '' : 'none';
    });
  });
  el.addEventListener('click', e => {
    if (e.target === el || e.target.closest('[data-tf-close]')) { el.remove(); return; }
    const pick = e.target.closest('[data-tf-pick]');
    if (pick) { el.querySelectorAll('.person-item').forEach(b => b.classList.remove('person-item--selected')); pick.classList.add('person-item--selected'); return; }
    if (e.target.closest('[data-tf-confirm]')) {
      const s = el.querySelector('.person-item--selected');
      if (!s) { window.alert('请选择' + (action === 'assign' ? '负责人' : '转交人员')); return; }
      tbApplyTransfer(s.querySelector('.person-name-sm').textContent, action, reopen);
      el.remove();
    }
  });
  setTimeout(() => search.focus(), 0);
}
function tbApplyTransfer(name, action, reopen) {
  const t = sel();
  if (!t) return;
  t.assignee = name;
  const conv = taskActiveConv(t);
  if (conv) conv.messages.push({ role: 'agent', text: '任务负责人已变更为 ' + name + '。' });
  const s = document.querySelector('#cv-tasks .tb-detail-aside [name="assignee"]');
  if (s) {
    if (![...s.options].some(o => o.value === name)) s.add(new Option(name, name));
    s.value = name;
  }
  t.activity ||= [];
  t.activity.push({ author: tbCurrentUserName(), text: (action === 'assign' ? '分配负责人为 ' : '负责人变更为 ') + name, time: new Date().toLocaleString('zh-CN', { hour12: false }) });
  tbSave();
  if (reopen) tbOpenTask(CV_TASKS.indexOf(t));
  else renderTaskBoard();
}

export function initTaskChat() {
  Object.assign(window, { tbOpenConv, tbBackConv, tbNewConv, tbOpenTransfer, tbChatSend, tbSendWindowMessage, tbAddFile, tbBackConvList, tbConvListHtml, tbCanSeeConv });
  const ws = document.getElementById('tb-workspace');
  ws.addEventListener('keydown', e => {
    if (e.target.id === 'tb-chat-input' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); tbChatSend(); }
  });
  ws.addEventListener('dragover', e => { const dz = e.target.closest('[data-tb-dropzone]'); if (dz) { e.preventDefault(); dz.classList.add('tb-dropzone--over'); } });
  ws.addEventListener('dragleave', e => { const dz = e.target.closest('[data-tb-dropzone]'); if (dz) dz.classList.remove('tb-dropzone--over'); });
  ws.addEventListener('drop', e => {
    const dz = e.target.closest('[data-tb-dropzone]'); if (!dz) return;
    e.preventDefault(); dz.classList.remove('tb-dropzone--over');
    const t = sel(); if (!t) return;
    t.files = t.files || [];
    Array.from(e.dataTransfer.files || []).forEach(f => t.files.push(f.name));
    tbSave(); tbRenderFiles();
  });
}
