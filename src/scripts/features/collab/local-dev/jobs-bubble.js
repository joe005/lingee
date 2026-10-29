import { $ } from '../../../core/dom.js';
import { ldEsc } from './core.js';
import { ldBackgroundJobs } from './init-jobs.js';

/* 本地开发 · 后台初始化进度气泡（#ldJobStatus / #ldJobBubble）。
   有后台初始化任务时顶部出现「N 个空间初始化中」，悬停（或键盘聚焦）显示气泡：一个任务只出一条进度，
   多个任务最多展示 5 条，超出 5 条出滚动条。任务完成后自动消失。 */
var LD_BUBBLE_ROWS = 5;
function itemHtml(job) {
  return '<li><div class="ld-job-row"><strong title="' + ldEsc(job.name) + '">' + ldEsc(job.name) + '</strong><span>' + job.pulling + '%</span></div>'
    + '<div class="ld-progress" role="progressbar" aria-label="' + ldEsc(job.name) + ' 初始化进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + job.pulling + '"><span style="width:' + job.pulling + '%"></span></div>'
    + '<small>正在从 origin/' + ldEsc(job.branch || 'main') + ' 获取最新代码</small></li>';
}
function renderBubble() {
  var list = ldBackgroundJobs(), btn = $('#ldJobStatus'), bubble = $('#ldJobBubble');
  if (!btn) return;
  btn.hidden = !list.length;
  if (!list.length) { bubble.hidden = true; return; }
  btn.querySelector('.ld-job-text').textContent = list.length > 1 ? list.length + ' 个空间初始化中' : '空间初始化中';
  bubble.innerHTML = '<div class="ld-job-head">后台初始化</div><ul class="ld-job-list" style="max-height:' + (LD_BUBBLE_ROWS * 62) + 'px">' + list.map(itemHtml).join('') + '</ul>';
}
function place() {
  var btn = $('#ldJobStatus'), bubble = $('#ldJobBubble'), rect = btn.getBoundingClientRect();
  bubble.style.top = (rect.bottom + 8) + 'px';
  bubble.style.left = Math.max(16, Math.min(rect.left, window.innerWidth - bubble.offsetWidth - 16)) + 'px';
}
function show(open) {
  var btn = $('#ldJobStatus'), bubble = $('#ldJobBubble');
  if (!btn || !bubble) return;
  if (open && !btn.hidden) { renderBubble(); bubble.hidden = false; place(); } else bubble.hidden = true;
  btn.setAttribute('aria-expanded', String(!bubble.hidden));
}
export function initJobsBubble() {
  var btn = $('#ldJobStatus');
  if (!btn) return;
  btn.addEventListener('mouseenter', function () { show(true); });
  btn.addEventListener('focus', function () { show(true); });
  btn.addEventListener('mouseleave', function () { show(false); });
  btn.addEventListener('blur', function () { show(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#ldJobBubble').hidden) show(false); }, true);
  document.addEventListener('lingee:local-dev-jobs', function () {
    var open = !$('#ldJobBubble').hidden;
    renderBubble();
    if (open && !btn.hidden) place();
  });
}
