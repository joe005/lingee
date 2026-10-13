import { viewChat } from '../../core/view.js';
import { syncTogglePreviewBtn } from '../chat.js';
import { tkGetTasks } from '../tasks-v2/data.js';
import { renderArtifactPreview } from '../collab/run-artifacts.js';
import { chatMessages, escapeHtml, scrollChatBottom } from './messages.js';
import { restoringChatSession } from './sessions.js';
/* 对话：对话页右侧任务抽屉与文档查看器（拆自 composer.js） */

var chatDocViewerCloseTimer = null;
var chatViewerTabs = [];
var chatViewerActiveKey = null;
var chatTaskMountVersion = 0;
function unmountChatTaskDrawer() {
  var drawer = document.querySelector('#chatDocViewerBody > #tkDrawer');
  if (!drawer) return;
  drawer.querySelector('#tkDrawerClose')?.click();
  drawer.classList.remove('chat-task-embedded');
  drawer.classList.add('chat-task-drawer-parked');
  document.body.appendChild(drawer);
  document.body.classList.remove('chat-task-preview-mounted');
}
function mountChatTaskDrawer(taskId, version) {
  import('../tasks-v2/index.js').then(function (module) {
    var selected = chatViewerTabs.find(function (tab) { return tab.key === chatViewerActiveKey; });
    if (version !== chatTaskMountVersion || selected?.kind !== 'task' || selected.taskId !== taskId) return;
    module.openTaskDetailFromSession(taskId);
    var drawer = document.getElementById('tkDrawer');
    var body = document.getElementById('chatDocViewerBody');
    if (!drawer || !body || drawer.getAttribute('data-task-id') !== String(taskId)) return;
    drawer.classList.remove('chat-task-drawer-parked');
    drawer.classList.add('chat-task-embedded');
    body.replaceChildren(drawer);
    document.body.classList.add('chat-task-preview-mounted');
    document.getElementById('tkDrawerClickaway')?.classList.add('hidden');
  });
}
function renderChatViewerTab() {
  chatTaskMountVersion++;
  unmountChatTaskDrawer();
  var tabs = document.getElementById('chatDocViewerTabs');
  var body = document.getElementById('chatDocViewerBody');
  if (!tabs || !body) return;
  tabs.innerHTML = chatViewerTabs.map(function (tab, index) {
    var active = tab.key === chatViewerActiveKey;
    var icon = tab.kind === 'task' ? '<path d="M8 6h11M8 12h11M8 18h7M3 6h.01M3 12h.01M3 18h.01"/>' : '<path d="M6 3h9l5 5v13H6zM15 3v6h5M9 14h8M9 18h6"/>';
    return '<div class="chat-doc-viewer-tab' + (active ? ' is-active' : '') + '" role="presentation"><button type="button" role="tab" aria-selected="' + active + '" class="chat-doc-viewer-tab-main" data-chat-preview-tab="' + index + '" title="' + escapeHtml(tab.title) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + icon + '</svg><span>' + escapeHtml(tab.title) + '</span></button><button type="button" class="chat-doc-viewer-tab-remove" data-chat-preview-close="' + index + '" aria-label="关闭' + escapeHtml(tab.title) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>';
  }).join('');
  var selected = chatViewerTabs.find(function (tab) { return tab.key === chatViewerActiveKey; });
  if (!selected) { body.innerHTML = ''; return; }
  var task = tkGetTasks().find(function (row) { return row.id === selected.taskId; });
  body.innerHTML = selected.kind === 'task' ? (task ? '' : '<p>任务已不存在</p>')
    : '<article class="chat-artifact-markdown"><h1>' + escapeHtml(String(selected.artifact.docTitle || selected.artifact.type || '产物预览')) + '</h1>' + renderArtifactPreview(selected.artifact, 'h2') + '</article>';
  if (selected.kind === 'task' && task) mountChatTaskDrawer(task.id, chatTaskMountVersion);
  body.scrollTop = 0;
}
function showChatViewer(keepConversationAtBottom) {
  var viewer = document.getElementById('chatDocViewer');
  if (!viewer) return;
  clearTimeout(chatDocViewerCloseTimer);
  renderChatViewerTab();
  viewer.hidden = false;
  viewChat.classList.add('doc-open');
  syncTogglePreviewBtn();
  if (keepConversationAtBottom) {
    scrollChatBottom();
    var scrollObserver = new ResizeObserver(scrollChatBottom);
    scrollObserver.observe(chatMessages);
    setTimeout(function () { scrollObserver.disconnect(); scrollChatBottom(); }, 350);
  }
  if (viewer.classList.contains('show')) { setChatDocViewerWidth(viewer); return; }
  viewer.style.width = '';
  if (restoringChatSession) {
    viewer.classList.add('restoring');
    setChatDocViewerWidth(viewer);
    viewer.classList.add('show');
    return;
  }
  requestAnimationFrame(function () { setChatDocViewerWidth(viewer); viewer.classList.add('show'); });
}
function openChatDocViewer(task, artifact, keepConversationAtBottom) {
  var key = 'artifact:' + task.id + ':' + (artifact.id || artifact.type || 'result') + ':' + (artifact.stageId || '');
  var tab = { key: key, kind: 'artifact', taskId: task.id, artifact: artifact, title: String(artifact.type || '产物预览') };
  var existing = chatViewerTabs.findIndex(function (row) { return row.key === key; });
  if (existing < 0) chatViewerTabs.push(tab); else chatViewerTabs[existing] = tab;
  chatViewerActiveKey = key;
  showChatViewer(keepConversationAtBottom);
}
function openChatTaskViewer(task) {
  var key = 'task:' + task.id;
  if (!chatViewerTabs.some(function (row) { return row.key === key; })) chatViewerTabs.push({ key: key, kind: 'task', taskId: task.id, title: task.title || '任务详情' });
  chatViewerActiveKey = key;
  showChatViewer(false);
}
function closeChatDocViewer() {
  chatTaskMountVersion++;
  unmountChatTaskDrawer();
  var viewer = document.getElementById('chatDocViewer');
  if (!viewer || viewer.hidden) return;
  clearTimeout(chatDocViewerCloseTimer);
  viewer.classList.remove('show');
  syncTogglePreviewBtn();
  chatDocViewerCloseTimer = setTimeout(function () {
    viewer.hidden = true;
    viewer.style.width = '';
    viewChat.classList.remove('doc-open');
  }, 250);
}
/* 默认保留约 500px 会话区，其余空间给产物预览；拖拽时会话区保底 360px。 */
function chatDocViewerWidthBounds() {
  var view = document.getElementById('view-chat');
  return { min: 320, max: Math.max(320, view.clientWidth - 360) };
}
function setChatDocViewerWidth(viewer) {
  var bounds = chatDocViewerWidthBounds();
  viewer.style.width = Math.min(bounds.max, Math.max(bounds.min, document.getElementById('view-chat').clientWidth - 500)) + 'px';
}
function initChatDocViewerResize(handle, viewer) {
  handle.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    e.preventDefault();
    var pointerId = e.pointerId;
    var startX = e.clientX;
    var startWidth = viewer.getBoundingClientRect().width;
    handle.setPointerCapture(pointerId);
    viewer.classList.add('resizing');
    function move(ev) {
      if (ev.pointerId !== pointerId) return;
      var bounds = chatDocViewerWidthBounds();
      viewer.style.width = Math.round(Math.min(bounds.max, Math.max(bounds.min, startWidth + startX - ev.clientX))) + 'px';
    }
    function end(ev) {
      if (ev.pointerId !== pointerId) return;
      handle.releasePointerCapture(pointerId);
      viewer.classList.remove('resizing');
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
    }
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  });
  handle.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    var bounds = chatDocViewerWidthBounds();
    var current = viewer.getBoundingClientRect().width;
    viewer.style.width = Math.round(Math.min(bounds.max, Math.max(bounds.min, current + (e.key === 'ArrowLeft' ? 24 : -24)))) + 'px';
  });
}

/* 以下变量由同目录其他模块写入；import 绑定只读，所以走 setter */
function set_chatViewerTabs(v){ chatViewerTabs=v; return v; }
function set_chatViewerActiveKey(v){ chatViewerActiveKey=v; return v; }

export { chatViewerActiveKey, chatViewerTabs, closeChatDocViewer, initChatDocViewerResize, openChatDocViewer, openChatTaskViewer, renderChatViewerTab, setChatDocViewerWidth, set_chatViewerActiveKey, set_chatViewerTabs };
