import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
/* 对话：回复尾操作栏（复制回复、重新生成、分叉到新会话、分享）与本轮元信息（智能体 · 模型 · 耗时、共消耗），
   对齐真实版会话的回复尾；分叉与分享在原型中只给出结果提示 */

var ICONS = {
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  regenerate: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M8 16H3v5"/>',
  fork: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6 8v1a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8M12 12v4"/>',
  share: '<path d="M7 17 17 7M8 7h9v9"/>',
  credits: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'
};

function icon(name) {
  return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
}

function formatDuration(ms) {
  var seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return seconds + 's';
  return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
}

function currentModelLabel() {
  var label = $('#chatComposerWrap [data-dd="model"] .chip-label');
  return label ? label.textContent.trim() : '快速';
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
  return Promise.reject(new Error('clipboard unavailable'));
}

/* opts: text 回复正文，durationMs 本轮耗时，agentName 执行方名称，onRegenerate 重新生成回调（任务会话不提供） */
function appendTurnFooter(responseEl, opts) {
  var footer = document.createElement('div');
  footer.className = 'chat-turn-footer';
  var credits = (Math.max(1, opts.text.length) / 24).toFixed(2);
  var actions = [
    { key: 'copy', label: '复制回复' },
    opts.onRegenerate ? { key: 'regenerate', label: '重新生成' } : null,
    { key: 'fork', label: '分叉到新会话' },
    { key: 'share', label: '分享' }
  ].filter(Boolean);
  footer.innerHTML = '<div class="chat-turn-actions">'
    + actions.map(function (a) {
      return '<button type="button" class="chat-turn-action" data-turn-action="' + a.key + '" data-tooltip="' + a.label + '" aria-label="' + a.label + '">' + icon(a.key) + '</button>';
    }).join('')
    + '</div>'
    + '<span class="chat-turn-meta">' + (opts.agentName || 'Build') + ' · ' + currentModelLabel() + ' · ' + formatDuration(opts.durationMs) + '</span>'
    + '<span class="chat-turn-credits" data-tooltip="本轮对话消耗的点数">' + icon('credits') + '共消耗 ' + credits + '</span>';
  footer.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-turn-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-turn-action');
    if (action === 'copy') {
      copyText(opts.text).then(function () { toast('已复制回复', 'success'); }, function () { toast('复制失败，请手动选择文本复制', 'error'); });
    } else if (action === 'regenerate') {
      opts.onRegenerate();
    } else if (action === 'fork') {
      toast('原型演示：将从这条回复分叉出新会话');
    } else if (action === 'share') {
      toast('原型演示：分享链接需接入真实会话后生成');
    }
  });
  responseEl.appendChild(footer);
  return footer;
}

export { appendTurnFooter };
