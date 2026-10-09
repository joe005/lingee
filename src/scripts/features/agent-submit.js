import { $, $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
/* 智能体开发：卡片「⋯」菜单与提交上架审核
   对齐 Lingee Build 智能体开发页：已保存、已驳回的智能体可提交，确认后转交管理员审核，状态变为已提交。 */

var MORE_ICON = '<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';
var menuCard = null;
var menuTrigger = null;
var submitCard = null;
var submitOpts = null;

function cardName(card) { return ($('.card-title', card)?.textContent || '').trim(); }
function cardStatus(card) { return card.getAttribute('data-status') || ''; }

function closeMenu(restoreFocus) {
  var menu = $('#agentCardMenu');
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  if (menuTrigger) menuTrigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus && menuTrigger) menuTrigger.focus();
  menuCard = null;
  menuTrigger = null;
}

function openMenu(card, trigger) {
  var menu = $('#agentCardMenu');
  if (!menu) return;
  closeMenu(false);
  menuCard = card;
  menuTrigger = trigger;
  var canSubmit = ['已保存', '已驳回'].includes(cardStatus(card));
  menu.querySelector('[data-agent-action="submit"]').hidden = !canSubmit;
  menu.hidden = false;
  var rect = trigger.getBoundingClientRect();
  menu.style.top = Math.min(rect.bottom + 4, window.innerHeight - menu.offsetHeight - 8) + 'px';
  menu.style.left = Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8) + 'px';
  trigger.setAttribute('aria-expanded', 'true');
  menu.querySelector('.agent-card-menu-item:not([hidden])')?.focus();
}

function openSubmitConfirm(card, opts) {
  submitCard = card;
  submitOpts = opts || null;
  var overlay = $('#agentSubmitOverlay');
  var desc = $('#agentSubmitDesc');
  /* 默认文案带「生产环境」强调，保存原始 HTML；自定义文案按纯文本写入 */
  if (desc.dataset.defaultHtml === undefined) desc.dataset.defaultHtml = desc.innerHTML;
  if (submitOpts?.desc) desc.textContent = submitOpts.desc;
  else desc.innerHTML = desc.dataset.defaultHtml;
  overlay.hidden = false;
  $('#agentSubmitOk').focus();
}

function closeSubmitConfirm() {
  var overlay = $('#agentSubmitOverlay');
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  var trigger = submitOpts?.returnFocus || submitCard?.querySelector('.agent-card-more');
  submitCard = null;
  submitOpts = null;
  trigger?.focus();
}

function setCardStatus(card, status) {
  card.setAttribute('data-status', status);
  var label = $('.card-status', card);
  if (label) label.textContent = status;
}

function confirmSubmit() {
  var card = submitCard;
  var onDone = submitOpts?.onDone;
  closeSubmitConfirm();
  if (!card) return;
  setCardStatus(card, '已提交');
  notifySubmitted(card);
  if (onDone) onDone();
  toast('提交成功，请等待管理员审核', 'success');
}

function runAction(action) {
  var card = menuCard;
  closeMenu(false);
  if (!card) return;
  var name = cardName(card);
  if (action === 'submit') { openSubmitConfirm(card); return; }
  if (action === 'edit') toast('打开智能体开发会话：' + name);
  else if (action === 'local-test') toast('已进入本地测试：' + name);
  else if (action === 'cloud-test') toast('已推送到云端测试环境：' + name);
  else if (action === 'delete') toast('删除需在本地工作区确认：' + name);
}

/* 供智能体配置面板复用：按名称找到智能体卡片，打开同一个提交确认 */
export function agentCardByName(name) {
  return $$('#view-agents .app-card').find(function (card) { return cardName(card) === name; }) || null;
}
function notifySubmitted(card) {
  document.dispatchEvent(new CustomEvent('lingee:agent-submitted', { detail: { name: cardName(card) } }));
}
export function agentCardStatus(card) { return card ? cardStatus(card) : ''; }
export function openAgentSubmit(card, opts) { if (card) openSubmitConfirm(card, opts); }

export function initAgentSubmit() {
  $$('#view-agents .app-card').forEach(function (card) {
    var more = document.createElement('button');
    more.type = 'button';
    more.className = 'agent-card-more';
    more.setAttribute('aria-label', '更多操作：' + cardName(card));
    more.setAttribute('aria-haspopup', 'menu');
    more.setAttribute('aria-expanded', 'false');
    more.innerHTML = MORE_ICON;
    more.addEventListener('click', function (e) {
      e.stopPropagation();
      if (menuCard === card) closeMenu(false);
      else openMenu(card, more);
    });
    card.appendChild(more);
  });
  var menu = $('#agentCardMenu');
  if (menu) menu.addEventListener('click', function (e) {
    var item = e.target.closest('[data-agent-action]');
    if (!item) return;
    e.stopPropagation();
    runAction(item.getAttribute('data-agent-action'));
  });
  document.addEventListener('lingee:agent-delivered', function (e) {
    var card = agentCardByName(e.detail?.name);
    if (card && ['已保存', '已驳回'].includes(cardStatus(card))) setCardStatus(card, '已提交');
  });
  $('#agentSubmitCancel')?.addEventListener('click', closeSubmitConfirm);
  $('#agentSubmitOk')?.addEventListener('click', confirmSubmit);
  $('#agentSubmitOverlay')?.addEventListener('click', function (e) {
    if (e.target === e.currentTarget) closeSubmitConfirm();
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#agentCardMenu')) closeMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('#agentSubmitOverlay')?.hidden) closeSubmitConfirm();
    else closeMenu(true);
  });
  window.addEventListener('resize', function () { closeMenu(false); });
}
