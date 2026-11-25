import { escapeHtml, scrollChatBottom } from './messages.js';
/* 对话：一轮回复的「处理过程」区，对齐客户端会话（kcode-ui session-turn / message-part）：
   执行中标题为「正在思考...」，逐步出现「叙述一句 + 工具汇总行」；结束后标题为「处理完成 · 耗时」并收起，可点开查看。
   工具汇总行写成「搜索了 1 次 · 运行了 2 条命令 · 调用了 1 次工具」，点开列出每次调用（Shell / 调用了 `工具` / 思考完成 · …）。
   原型为演示脚本，不执行真实命令。 */

var ICONS = {
  check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  shell: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m8 10 2.5 2L8 14"/><path d="M13 14h3"/>',
  tool: '<path d="M4 7h10a3 3 0 0 1 0 6H8"/><path d="m11 10-3 3 3 3"/><path d="M20 17H10"/>',
  think: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m14 6 4 4"/>',
  skill: '<path d="m9 8-4 4 4 4"/><path d="m15 8 4 4-4 4"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>'
};
function icon(name) {
  return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
}

/* 汇总口径与客户端一致：按类别计数，思考不计入 */
var SUMMARY = [
  ['skill', function (n) { return '调用了 ' + n + ' 个技能'; }],
  ['search', function (n) { return '搜索了 ' + n + ' 次'; }],
  ['edit', function (n) { return '编辑了 ' + n + ' 个文件'; }],
  ['shell', function (n) { return '运行了 ' + n + ' 条命令'; }],
  ['tool', function (n) { return '调用了 ' + n + ' 次工具'; }]
];
function summaryText(tools) {
  return SUMMARY.map(function (row) {
    var count = tools.filter(function (tool) { return tool.kind === row[0]; }).length;
    return count ? row[1](count) : '';
  }).filter(Boolean).join(' · ');
}
function toolRowHtml(tool) {
  var text = escapeHtml(tool.text || '');
  var body = {
    shell: '<b>Shell</b>' + text,
    tool: '调用了 <code>' + escapeHtml(tool.name || '') + '</code>' + text,
    think: '思考完成<i aria-hidden="true">·</i>' + text,
    search: '<b>搜索</b>' + text,
    edit: '<b>编辑</b>' + text,
    skill: '<b>技能</b>' + text
  }[tool.kind] || text;
  return '<li class="turn-process-tool">' + icon(tool.kind === 'skill' ? 'skill' : tool.kind) + '<span>' + body + '</span></li>';
}
/* 客户端标题里的耗时写法：18秒、36分 33秒 */
function formatProcessDuration(ms) {
  var seconds = Math.max(1, Math.round(ms / 1000));
  return seconds < 60 ? seconds + '秒' : Math.floor(seconds / 60) + '分 ' + (seconds % 60) + '秒';
}

function stepHtml(step) {
  var tools = step.tools || [];
  return (step.say ? '<p class="turn-process-say">' + escapeHtml(step.say) + '</p>' : '')
    + (tools.length ? '<div class="turn-process-group">'
      + '<button type="button" class="turn-process-summary" aria-expanded="false">' + icon('check') + '<span>' + summaryText(tools) + '</span></button>'
      + '<ul class="turn-process-tools" hidden>' + tools.filter(function (tool) { return tool.kind !== 'skill'; }).map(toolRowHtml).join('') + '</ul></div>' : '');
}

/* steps: [{say, tools:[{kind:'shell'|'tool'|'think'|'search'|'edit'|'skill', name, text}]}]
   opts.instant：历史回复直接显示收起后的结果；opts.durationMs：历史回复的耗时；opts.before：插在该元素之前；opts.onDone：过程走完后回调 */
function appendTurnProcess(responseEl, steps, opts) {
  opts = opts || {};
  var startedAt = Date.now();
  var box = document.createElement('section');
  box.className = 'turn-process';
  box.innerHTML = '<button type="button" class="turn-process-head" aria-expanded="true"><span class="turn-process-title">正在思考...</span>'
    + '<span class="turn-process-chevron">' + icon('chevron') + '</span><span class="turn-process-duration"></span></button>'
    + '<div class="turn-process-body"></div>';
  responseEl.insertBefore(box, opts.before || null);
  var head = box.querySelector('.turn-process-head');
  var body = box.querySelector('.turn-process-body');
  var done = false;
  var timer = null;

  head.addEventListener('click', function () {
    if (!done) return;
    var open = head.getAttribute('aria-expanded') !== 'true';
    head.setAttribute('aria-expanded', String(open));
    body.hidden = !open;
  });
  box.addEventListener('click', function (event) {
    var summary = event.target.closest('.turn-process-summary');
    if (!summary) return;
    var list = summary.parentElement.querySelector('.turn-process-tools');
    if (!list || !list.children.length) return;
    var open = summary.getAttribute('aria-expanded') !== 'true';
    summary.setAttribute('aria-expanded', String(open));
    list.hidden = !open;
  });

  function finish(durationMs) {
    if (done) return;
    done = true;
    clearTimeout(timer);
    box.classList.add('is-done');
    box.querySelector('.turn-process-title').textContent = '处理完成';
    box.querySelector('.turn-process-duration').textContent = formatProcessDuration(durationMs);
    head.setAttribute('aria-expanded', 'false');
    body.hidden = true;
    if (opts.onDone) opts.onDone();
  }

  if (opts.instant) {
    body.innerHTML = steps.map(stepHtml).join('');
    finish(opts.durationMs || 60000);
    return { finish: finish };
  }
  /* 流式：叙述逐字打出；工具逐条执行，执行中列表展开、汇总计数随之增加，一段走完后收成汇总行 */
  var index = 0;
  function alive() {
    if (done) return false;
    if (!box.isConnected) { done = true; return false; }
    return true;
  }
  function typeSay(el, text, then) {
    var pos = 0;
    (function tick() {
      if (!alive()) return;
      pos = Math.min(text.length, pos + 2);
      el.textContent = text.slice(0, pos);
      scrollChatBottom();
      if (pos < text.length) timer = setTimeout(tick, 35);
      else timer = setTimeout(then, 250);
    })();
  }
  function runTools(holder, tools, then) {
    if (!tools.length) { then(); return; }
    var group = document.createElement('div');
    group.className = 'turn-process-group is-running';
    group.innerHTML = '<button type="button" class="turn-process-summary" aria-expanded="true">' + icon('check') + '<span></span></button><ul class="turn-process-tools"></ul>';
    holder.appendChild(group);
    var label = group.querySelector('.turn-process-summary span');
    var list = group.querySelector('.turn-process-tools');
    var shown = [];
    var i = 0;
    (function nextTool() {
      if (!alive()) return;
      if (i >= tools.length) {
        group.classList.remove('is-running');
        var summary = group.querySelector('.turn-process-summary');
        summary.setAttribute('aria-expanded', 'false');
        list.hidden = true;
        if (!list.children.length) list.remove();
        timer = setTimeout(then, 200);
        return;
      }
      var tool = tools[i++];
      shown.push(tool);
      label.textContent = summaryText(shown);
      if (tool.kind !== 'skill') {
        list.insertAdjacentHTML('beforeend', toolRowHtml(tool));
        list.lastElementChild.classList.add('is-running');
        var row = list.lastElementChild;
        timer = setTimeout(function () { row.classList.remove('is-running'); nextTool(); }, tool.kind === 'think' ? 900 : 700);
      } else {
        timer = setTimeout(nextTool, 500);
      }
      scrollChatBottom();
    })();
  }
  function next() {
    if (!alive()) return;
    if (index >= steps.length) { finish(Date.now() - startedAt); return; }
    var step = steps[index++];
    var holder = document.createElement('div');
    holder.className = 'turn-process-step';
    body.appendChild(holder);
    var tools = step.tools || [];
    if (step.say) {
      var say = document.createElement('p');
      say.className = 'turn-process-say';
      holder.appendChild(say);
      typeSay(say, step.say, function () { runTools(holder, tools, next); });
    } else {
      runTools(holder, tools, next);
    }
  }
  next();
  return { finish: function () { finish(Date.now() - startedAt); } };
}

export { appendTurnProcess, formatProcessDuration };
