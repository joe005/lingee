/* 全局删除确认：复用同一视觉与键盘行为，调用方保留自己的权限检查和删除逻辑。 */
let activeConfirmation = null;

export function requestDeleteConfirmation(message, { title = '确认删除', confirmLabel = '确认删除' } = {}) {
  if (activeConfirmation) return Promise.resolve(false);
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'app-delete-confirm';
    overlay.innerHTML = '<div class="app-delete-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="appDeleteConfirmTitle" aria-describedby="appDeleteConfirmMessage">'
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
