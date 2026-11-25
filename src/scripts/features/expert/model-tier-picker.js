import { $$ } from '../../core/dom.js';
/* 开发对话输入框的模型选择器：新会话页与会话页同步，记住上次选的模型。
   原为智能体模型级别联动（US-2026-082499）的演示，2026-11-24 起按客户端改为具体模型列表，联动下线。 */

var STORE_KEY = 'lingee.devComposerModel';
var DEFAULT_LABEL = 'Qwen3.8-Max';

function readRemembered() {
  try { return localStorage.getItem(STORE_KEY) || DEFAULT_LABEL; } catch (e) { return DEFAULT_LABEL; }
}
function writeRemembered(val) {
  try { localStorage.setItem(STORE_KEY, val); } catch (e) { /* 无痕窗口等场景读写失败时只在本次会话内生效 */ }
}

/* 从智能体下拉往上找同一输入框里的模型下拉 */
function modelDdFor(pfx) {
  var node = document.getElementById(pfx + 'ExpertDropdown');
  while (node && node !== document.body) {
    var dd = node.querySelector && node.querySelector('.dropdown[data-dd="model"]');
    if (dd) return dd;
    node = node.parentElement;
  }
  return null;
}
function applyValue(dd, val) {
  var items = $$('.menu-item', dd);
  var hit = items.find(function (i) { return i.getAttribute('data-val') === val; })
    || items.find(function (i) { return i.getAttribute('data-val') === DEFAULT_LABEL; });
  if (!hit) return;
  items.forEach(function (i) { i.classList.toggle('checked', i === hit); });
  var label = dd.querySelector('.chip-label');
  if (label) label.textContent = hit.getAttribute('data-val');
}

/* 由 renderExpertChips 在每次执行对象变化后调用；档位联动已下线，保留空实现供 chips.js 调用 */
function syncComposerModelTier() {}

export function initComposerModelTier() {
  var remembered = readRemembered();
  ['nt', 'chat'].forEach(function (pfx) {
    var dd = modelDdFor(pfx);
    if (!dd) return;
    if (!dd.dataset.tierFor) applyValue(dd, remembered);
    $$('.menu-item', dd).forEach(function (item) {
      item.addEventListener('click', function () {
        if (dd.dataset.tierFor) return; /* 跟随智能体时的改选只对本次有效，不记为默认 */
        var val = item.getAttribute('data-val');
        writeRemembered(val);
        ['nt', 'chat'].forEach(function (other) {
          var odd = modelDdFor(other);
          if (odd && odd !== dd && !odd.dataset.tierFor) applyValue(odd, val);
        });
      });
    });
  });
}

export { syncComposerModelTier };
