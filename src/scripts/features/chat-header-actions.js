import { $, $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { closeAll } from './dropdown.js';
/* 会话顶栏：打开方式、审查、文件树、Wiki（对齐真实版顶栏）。
   原型不读取本地工作区，入口只给出结果提示；由 chat.js 的 initHistoryPanel 调用。 */

var OPEN_APP_KEY = 'chatOpenInApp';
var PANEL_TIPS = {
  审查: '审查面板展示本会话的 Git 变更，原型暂未接入',
  文件树: '文件树面板展示当前工作区文件，原型暂未接入',
  Wiki: 'Wiki 面板展示项目知识文档，原型暂未接入'
};

function currentOpenApp() {
  try { return localStorage.getItem(OPEN_APP_KEY) || 'Finder'; } catch (e) { return 'Finder'; }
}

function applyOpenApp(app) {
  var main = $('#chatOpenInMain');
  var item = $('#chatOpenInDropdown .menu-item[data-open-app="' + app + '"]');
  if (!main || !item) return;
  $$('#chatOpenInDropdown .menu-item').forEach(function (row) {
    var on = row === item;
    row.classList.toggle('checked', on);
    row.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  var icon = item.querySelector('.left .ic');
  if (icon) $('#chatOpenInIcon').innerHTML = icon.outerHTML.replace(' ic-sm', '');
  main.setAttribute('aria-label', '在 ' + app + ' 中打开');
  main.setAttribute('data-tooltip', '在 ' + app + ' 中打开');
}

export function initChatHeaderActions() {
  var main = $('#chatOpenInMain');
  if (main) {
    applyOpenApp(currentOpenApp());
    main.addEventListener('click', function () {
      toast('已在 ' + currentOpenApp() + ' 中打开当前工作区', 'success');
    });
    $$('#chatOpenInDropdown .menu-item').forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        var app = item.getAttribute('data-open-app');
        try { localStorage.setItem(OPEN_APP_KEY, app); } catch (err) {}
        applyOpenApp(app);
        closeAll(null);
        toast('已在 ' + app + ' 中打开当前工作区', 'success');
      });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
      });
    });
    /* 菜单展开后用上下键在选项间移动焦点，Esc 收起并把焦点还给触发按钮 */
    var dd = $('#chatOpenInDropdown');
    dd.addEventListener('keydown', function (e) {
      if (!dd.classList.contains('open')) return;
      var items = $$('.menu-item', dd);
      var idx = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var next = idx < 0 ? 0 : (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next].focus();
      } else if (e.key === 'Escape') {
        dd.classList.remove('open');
        $('[data-chip]', dd).focus();
      }
    });
  }
  $$('.chat-panel-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      toast(PANEL_TIPS[btn.getAttribute('data-chat-panel')] || '原型暂未接入该面板');
    });
  });
}
