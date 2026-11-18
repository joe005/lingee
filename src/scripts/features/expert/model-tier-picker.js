import { $$ } from '../../core/dom.js';
import { normalizeTier, tierInfo } from './data.js';
/* 开发对话输入框的模型选择器与智能体模型级别联动（US-2026-082499）
   - 没选智能体：沿用上次选的档位或模型，第一次用默认档位「专家」，与 Lingee Build 现状一致
   - 选了设置过模型级别的智能体：默认选中它的级别，使用者仍可改选（本期不做「允许切换模型」配置）
   - 智能体未设置模型级别（默认）：按没选智能体处理，沿用上一次会话的选择
   - 取消智能体：回到上次自己选的档位
   智能体团队按谁的级别还在待确认，选团队时按「没选智能体」处理。 */

var STORE_KEY = 'lingee.devComposerModel';
var DEFAULT_LABEL = tierInfo('expert').label; /* 从未选过时的初始档位 */

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
    || items.find(function (i) { return i.getAttribute('data-model-tier') === 'expert'; });
  if (!hit) return;
  items.forEach(function (i) { i.classList.toggle('checked', i === hit); });
  var label = dd.querySelector('.chip-label');
  if (label) label.textContent = hit.getAttribute('data-val');
}

/* 由 renderExpertChips 在每次执行对象变化后调用 */
function syncComposerModelTier(pfx, expert) {
  var dd = modelDdFor(pfx);
  if (!dd) return;
  if (expert && !normalizeTier(expert.tier)) expert = null;
  if (expert) {
    /* 只在换了智能体时套用其级别，不覆盖使用者之后的改选 */
    if (dd.dataset.tierFor !== expert.id) applyValue(dd, tierInfo(normalizeTier(expert.tier)).label);
    dd.dataset.tierFor = expert.id;
    return;
  }
  if (dd.dataset.tierFor) {
    delete dd.dataset.tierFor;
    applyValue(dd, readRemembered());
  }
}

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
