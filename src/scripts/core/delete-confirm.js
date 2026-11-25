/* 全局删除确认：复用同一视觉与键盘行为，调用方保留自己的权限检查和删除逻辑。 */
let activeConfirmation = null;

/* tone: 'warning' 为设置页 UE 样式（2026-11-25）：标题前橙色感叹号、正文与标题对齐、「取消」为文字按钮；默认样式不变 */
export function requestDeleteConfirmation(message, { title = '确认删除', confirmLabel = '确认删除', tone = '' } = {}) {
  if (activeConfirmation) return Promise.resolve(false);
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'app-delete-confirm';
    overlay.innerHTML = '<div class="app-delete-confirm-card' + (tone === 'warning' ? ' is-warning' : '') + '" role="alertdialog" aria-modal="true" aria-labelledby="appDeleteConfirmTitle" aria-describedby="appDeleteConfirmMessage">'
      + (tone === 'warning' ? '<span class="app-delete-confirm-icon" aria-hidden="true">!</span>' : '')
      + '<h3 id="appDeleteConfirmTitle">确认删除</h3>'
      + '<p id="appDeleteConfirmMessage"></p>'
      + '<div class="app-delete-confirm-actions"><button type="button" data-delete-cancel>取消</button><button type="button" data-delete-confirm>确认删除</button></div>'
      + '</div>';
    overlay.querySelector('#appDeleteConfirmTitle').textContent = title;
    overlay.querySelector('#appDeleteConfirmMessage').textContent = message;
    const cancelButton = overlay.querySelector('[data-delete-cancel]');
    const confirmButton = overlay.querySelector('[data-delete-confirm]');
    confirmButton.textContent = confirmLabel;
    const close = (confirmed) => {
      if (activeConfirmation !== overlay) return;
      activeConfirmation = null;
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown, true);
      if (previousFocus?.isConnected) previousFocus.focus();
      resolve(confirmed);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(false); }
      if (event.key === 'Tab') {
        const next = document.activeElement === cancelButton && event.shiftKey ? confirmButton
          : document.activeElement === confirmButton && !event.shiftKey ? cancelButton : null;
        if (next) { event.preventDefault(); next.focus(); }
      }
    };
    cancelButton.addEventListener('click', () => close(false));
    confirmButton.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(false); });
    activeConfirmation = overlay;
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKeyDown, true);
    cancelButton.focus();
  });
}
