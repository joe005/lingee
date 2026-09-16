/* 轻量 toast，替代 main.js 的 toast 函数 */
let toastEl = null;
let toastTimer = null;

export function toast(msg, type) {
  if (typeof document === 'undefined') return;
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:8px;font-size:14px;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,.15);transition:opacity .2s;pointer-events:none;';
    document.body.appendChild(toastEl);
  }
  const colors = { success: '#08cc50', error: '#e04a3a', warning: '#ff8d42', info: '#495dff' };
  toastEl.textContent = msg;
  toastEl.style.background = colors[type] || '#2d2d2d';
  toastEl.style.color = '#fff';
  toastEl.style.opacity = '1';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.style.opacity = '0'; }, 2500);
}
