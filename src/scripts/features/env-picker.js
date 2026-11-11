import '../../styles/parts/env-picker.css';
import { $, $$ } from '../core/dom.js';
import { showView } from '../core/view.js';
import { closeAll } from './dropdown.js';
import { getEnvOptions } from './env.js';

/* 新会话和会话读取设置页的同一份 ERP 环境，授权及启用操作由 env.js 处理。 */
const authorization = {
  expired: ['授权已失效', '重新授权'],
  revoked: ['已断开连接', '重新授权'],
  none: ['未授权', '去授权'],
};
const checkIcon = '<svg class="env-pick-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

function emit(action, id) {
  document.dispatchEvent(new CustomEvent('lingee:env-' + action, { detail: { id } }));
}

export function initEnvPicker() {
  const roots = $$('[data-env-picker]');
  const modal = $('#envEnableConfirmModal');
  let options = [];
  let pendingSwitch = null;
  let pickerTrigger = null;

  function refresh() {
    options = getEnvOptions();
    const enabled = options.find(env => env.enabled);
    roots.forEach(root => {
      const chip = $('[data-chip]', root);
      const label = enabled?.name || (options.length ? '未启用环境' : '配置环境');
      const reason = enabled?.pending ? authorization[enabled.pending][0] : '';
      root.classList.toggle('is-empty', !options.length);
      root.classList.toggle('is-warn', !enabled || !!reason);
      $('.chip-label', chip).textContent = label;
      $('.env-pick-warn', chip).textContent = reason;
      chip.setAttribute('aria-label', 'ERP 环境：' + label + (reason ? '，' + reason : ''));
      if (options.length) chip.setAttribute('aria-haspopup', 'listbox');
      else {
        chip.removeAttribute('aria-haspopup');
        root.classList.remove('open');
      }

      const list = $('.env-pick-list', root);
      const focusedId = list.contains(document.activeElement) ? document.activeElement.dataset.envId : '';
      list.replaceChildren(...options.map(env => {
        const item = document.createElement('div');
        item.className = 'app-item env-pick-item' + (env.enabled ? ' checked' : '');
        item.role = 'option';
        item.tabIndex = -1;
        item.dataset.envId = env.id;
        item.setAttribute('aria-selected', String(env.enabled));
        item.title = env.url;
        item.innerHTML = '<div class="app-item-info"><span class="env-pick-name-text"></span><span class="env-pick-meta"></span>' + checkIcon + '</div>';
        $('.env-pick-name-text', item).textContent = env.name;
        $('.env-pick-meta', item).textContent = env.pending ? authorization[env.pending][1] : '';
        return item;
      }));
      if (focusedId) {
        const option = $('.env-pick-item[data-env-id="' + focusedId + '"]', list);
        (option || chip).focus();
      }
    });
  }

  function closeConfirm() {
    modal.classList.remove('show');
    pendingSwitch = null;
    pickerTrigger?.focus();
  }

  function choose(id) {
    const target = options.find(env => env.id === id);
    if (!target) return;
    if (target.pending) {
      emit('reauth', id);
      return;
    }
    if (target.enabled) return;
    const enabled = options.find(env => env.enabled);
    if (!enabled) {
      emit('enable', id);
      return;
    }
    pendingSwitch = { from: enabled.id, to: id };
    $('#envEnableConfirmFrom').textContent = enabled.name;
    $('#envEnableConfirmTo').textContent = target.name;
    modal.classList.add('show');
    $('#envEnableConfirmCancel').focus();
  }

  roots.forEach(root => {
    const chip = $('[data-chip]', root);
    const list = $('.env-pick-list', root);
    function focusOption(step) {
      const items = $$('.env-pick-item', list);
      const current = items.indexOf(document.activeElement);
      const next = current < 0 ? (step > 0 ? 0 : items.length - 1) : (current + step + items.length) % items.length;
      items[next]?.focus();
    }
    function selectOption(item) {
      closeAll(null);
      chip.focus();
      pickerTrigger = chip;
      choose(item.dataset.envId);
    }

    chip.addEventListener('click', () => {
      const open = root.classList.contains('open');
      closeAll(null);
      if (!options.length) emit('create');
      else if (!open) root.classList.add('open');
    });
    new MutationObserver(() => {
      chip.setAttribute('aria-expanded', String(root.classList.contains('open')));
    }).observe(root, { attributes: true, attributeFilter: ['class'] });
    list.addEventListener('click', event => {
      const item = event.target.closest('.env-pick-item');
      if (item) selectOption(item);
    });
    root.addEventListener('keydown', event => {
      const open = root.classList.contains('open');
      if (event.key === 'Escape' && open) {
        event.stopPropagation();
        closeAll(null);
        chip.focus();
      } else if (options.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        if (!open) chip.click();
        focusOption(event.key === 'ArrowDown' ? 1 : -1);
      } else if (open && event.key === 'Enter' && event.target.matches('.env-pick-item')) {
        event.preventDefault();
        selectOption(event.target);
      }
    });
    $('.env-pick-manage', root).addEventListener('click', () => {
      showView('settings');
      $$('.nav-item').forEach(item => item.classList.remove('active'));
    });
  });

  document.addEventListener('lingee:envs-changed', refresh);
  document.addEventListener('lingee:env-authorized', event => {
    refresh();
    choose(event.detail.id);
  });
  $('#envEnableConfirmClose').addEventListener('click', closeConfirm);
  $('#envEnableConfirmCancel').addEventListener('click', closeConfirm);
  $('#envEnableConfirmOk').addEventListener('click', () => {
    const request = pendingSwitch;
    closeConfirm();
    if (request && options.find(env => env.enabled)?.id === request.from) emit('enable', request.to);
  });
  modal.addEventListener('click', event => { if (event.target === modal) closeConfirm(); });
  modal.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeConfirm();
    } else if (event.key === 'Tab') {
      const controls = $$('button', modal);
      const edge = event.shiftKey ? controls[0] : controls.at(-1);
      if (document.activeElement !== edge) return;
      event.preventDefault();
      (event.shiftKey ? controls.at(-1) : controls[0]).focus();
    }
  });
  refresh();
}
