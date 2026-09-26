/* 列表版本独立于详情版本；已保存版本保留视图方案栏。 */
import { toast } from '../../core/toast.js';

var STORAGE_KEY = 'lingee_tasks_list_version';

function closeMenu() {
  document.getElementById('tkListVersionMenu')?.remove();
}

export function initTaskListVersion(onChange) {
  var page = document.getElementById('view-tasks');
  if (!page) return;
  try { page.dataset.listVersion = localStorage.getItem(STORAGE_KEY) === 'v1' ? 'v1' : 'latest'; }
  catch (error) { page.dataset.listVersion = 'latest'; }

  page.addEventListener('contextmenu', function (event) {
    if (event.defaultPrevented || event.target.closest('#tkDrawer, input, textarea, [contenteditable="true"], [role="dialog"], .tk-modal-overlay')) return;
    event.preventDefault();
    closeMenu();
    document.getElementById('tkDetailVersionMenu')?.remove();
    var menu = document.createElement('div');
    menu.id = 'tkListVersionMenu';
    menu.className = 'tk-detail-version-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', '任务列表版本');
    menu.innerHTML = [['latest', '最新版'], ['v1', 'v1 2026-09-26']].map(function (item) {
        var active = page.dataset.listVersion === item[0];
        return '<button type="button" role="menuitemradio" aria-checked="' + active + '" data-list-version="' + item[0] + '">' + item[1] + '<span>' + (active ? '✓' : '') + '</span></button>';
      }).join('');
    document.body.appendChild(menu);
    menu.style.left = Math.max(8, Math.min(event.clientX, window.innerWidth - menu.offsetWidth - 8)) + 'px';
    menu.style.top = Math.max(8, Math.min(event.clientY, window.innerHeight - menu.offsetHeight - 8)) + 'px';
    menu.querySelector('[aria-checked="true"]')?.focus();
  });

  document.addEventListener('click', function (event) {
    var choice = event.target.closest('#tkListVersionMenu [data-list-version]');
    if (choice) {
      var version = choice.dataset.listVersion;
      if (version !== page.dataset.listVersion) {
        page.dataset.listVersion = version;
        try { localStorage.setItem(STORAGE_KEY, version); } catch (error) { /* 当前会话仍可切换。 */ }
        onChange?.();
        toast(version === 'latest' ? '已切换到最新版任务列表' : '已切换到保存的任务列表版本', 'success');
      }
    }
    if (choice || !event.target.closest('#tkListVersionMenu')) closeMenu();
  });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeMenu(); });
  document.addEventListener('contextmenu', function (event) { if (!page.contains(event.target)) closeMenu(); });
}
