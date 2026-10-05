/* 管理板块日期选择：中文日历浮层，显示与保存统一为 YYYY-MM-DD。
   原生 <input type="date"> 的显示格式跟随浏览器语言（如 mm/dd/yyyy、英文月历），
   这里改用按钮 + 自绘日历，保证任何环境下都是中文和同一种格式。
   用法：按钮加 data-mgr-date，文字放在 [data-mgr-date-text]，值存在 data-value。 */

var WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
var pop = null;
var anchor = null;
var viewYear = 0;
var viewMonth = 0;

function pad(n) { return String(n).padStart(2, '0'); }
function fmt(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
function parse(v) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null;
}
function todayParts() { var t = new Date(); return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() }; }

function mgrDateGet(btn) { return btn.getAttribute('data-value') || ''; }
function mgrDateSet(btn, value) {
  var v = parse(value) ? value : '';
  btn.setAttribute('data-value', v);
  var text = btn.querySelector('[data-mgr-date-text]');
  if (text) text.textContent = v || btn.getAttribute('data-placeholder') || '选择日期';
  btn.classList.toggle('has-value', !!v);
}

function render() {
  var sel = parse(mgrDateGet(anchor));
  var today = todayParts();
  /* 周一为一周起点；补齐 6 行共 42 格，避免月份切换时浮层高度跳动 */
  var first = new Date(viewYear, viewMonth, 1);
  var offset = (first.getDay() + 6) % 7;
  var cells = '';
  for (var i = 0; i < 42; i++) {
    var d = new Date(viewYear, viewMonth, 1 - offset + i);
    var y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    var cls = 'mgr-datepop-day';
    if (m !== viewMonth) cls += ' is-out';
    if (y === today.y && m === today.m && day === today.d) cls += ' is-today';
    if (sel && y === sel.y && m === sel.m && day === sel.d) cls += ' is-selected';
    cells += '<button type="button" class="' + cls + '" data-mgr-day="' + fmt(y, m, day) + '" aria-label="' + y + '年' + (m + 1) + '月' + day + '日">' + day + '</button>';
  }
  var nav = function (act, label, path) {
    return '<button type="button" class="mgr-datepop-nav" data-mgr-dp="' + act + '" aria-label="' + label + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg></button>';
  };
  pop.innerHTML = '<div class="mgr-datepop-head">' +
    nav('prev-year', '上一年', '<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>') +
    nav('prev-month', '上一月', '<path d="m15 18-6-6 6-6"/>') +
    '<span class="mgr-datepop-title" aria-live="polite">' + viewYear + '年' + (viewMonth + 1) + '月</span>' +
    nav('next-month', '下一月', '<path d="m9 18 6-6-6-6"/>') +
    nav('next-year', '下一年', '<path d="m13 17 5-5-5-5"/><path d="m6 17 5-5-5-5"/>') +
    '</div><div class="mgr-datepop-week">' + WEEKDAYS.map(function (w) { return '<span>' + w + '</span>'; }).join('') +
    '</div><div class="mgr-datepop-grid">' + cells + '</div>' +
    '<div class="mgr-datepop-foot"><button type="button" data-mgr-dp="clear">清除</button><button type="button" data-mgr-dp="today">今天</button></div>';
}
function place() {
  var r = anchor.getBoundingClientRect();
  var w = pop.offsetWidth, h = pop.offsetHeight;
  var left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
  var below = window.innerHeight - r.bottom - 8;
  var top = below >= h || r.top < h ? r.bottom + 6 : r.top - h - 6;
  pop.style.left = left + 'px';
  pop.style.top = Math.max(8, top) + 'px';
}
function close(restoreFocus) {
  if (!pop) return;
  var back = anchor;
  pop.remove();
  pop = null;
  anchor = null;
  if (back) back.setAttribute('aria-expanded', 'false');
  if (restoreFocus && back && back.isConnected) back.focus();
}
function choose(value) {
  var btn = anchor;
  mgrDateSet(btn, value);
  close(true);
  btn.dispatchEvent(new Event('change', { bubbles: true }));
}
function open(btn) {
  if (pop && anchor === btn) { close(true); return; }
  close(false);
  anchor = btn;
  var base = parse(mgrDateGet(btn)) || todayParts();
  viewYear = base.y;
  viewMonth = base.m;
  pop = document.createElement('div');
  pop.className = 'mgr-datepop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', '选择日期');
  document.body.appendChild(pop);
  render();
  place();
  btn.setAttribute('aria-expanded', 'true');
  var target = pop.querySelector('.is-selected') || pop.querySelector('.is-today') || pop.querySelector('[data-mgr-day]');
  if (target) target.focus();
}
function shift(months) {
  var d = new Date(viewYear, viewMonth + months, 1);
  viewYear = d.getFullYear();
  viewMonth = d.getMonth();
  render();
}

export function initManagerDatePicker() {
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-mgr-date]');
    if (btn) { e.preventDefault(); open(btn); return; }
    if (!pop) return;
    var day = e.target.closest('[data-mgr-day]');
    if (day && pop.contains(day)) { choose(day.getAttribute('data-mgr-day')); return; }
    var act = e.target.closest('[data-mgr-dp]');
    if (act && pop.contains(act)) {
      var a = act.getAttribute('data-mgr-dp');
      if (a === 'prev-month') shift(-1);
      else if (a === 'next-month') shift(1);
      else if (a === 'prev-year') shift(-12);
      else if (a === 'next-year') shift(12);
      else if (a === 'today') { var t = todayParts(); choose(fmt(t.y, t.m, t.d)); }
      else if (a === 'clear') choose('');
      return;
    }
    if (!pop.contains(e.target)) close(false);
  });
  /* 捕获阶段：弹窗里的 Esc 只关日历，不连带关闭外层对话框 */
  document.addEventListener('keydown', function (e) {
    if (!pop) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
  }, true);
  window.addEventListener('resize', function () { if (pop) place(); });
}

export { mgrDateGet, mgrDateSet };
