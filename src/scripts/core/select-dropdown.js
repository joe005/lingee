function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char])); }
export const niuSelectCaret = '<svg class="niu-select-caret" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg>';
const niuSelectCleanups = new Map();
export function initSelectDropdowns(selects, onOpen = () => {}) {
  niuSelectCleanups.forEach((cleanup, source) => { if (!source.isConnected) { cleanup(); niuSelectCleanups.delete(source); } });
  selects.forEach(select => {
    if (niuSelectCleanups.has(select)) return;
    const controller = new AbortController();
    const overlay = select.closest('.sync-overlay, #niuCreateOverlay, #niuPlanOverlay') || select.closest('[role=dialog]') || document.body;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'niu-person-trigger niu-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', select.getAttribute('aria-label') || select.labels?.[0]?.textContent || '选择选项');
    trigger.disabled = select.disabled;
    const menu = document.createElement('div');
    menu.className = 'niu-person-popup niu-select-popup';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    select.classList.add('niu-custom-select-source');
    select.after(trigger);
    overlay.appendChild(menu);
    const sync = () => {
      trigger.hidden = select.hidden || select.classList.contains('hidden');
      trigger.innerHTML = '<span>' + escapeHtml(select.selectedOptions[0]?.textContent || '') + '</span>' + niuSelectCaret;
      trigger.classList.toggle('is-placeholder', !select.value);
      trigger.disabled = select.disabled;
    };
    const close = () => { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); };
    trigger.addEventListener('click', event => {
      event.preventDefault();
      if (!menu.hidden) { close(); return; }
      onOpen();
      document.querySelectorAll('.niu-select-popup').forEach(el => { el.hidden = true; });
      document.querySelectorAll('.niu-select-trigger').forEach(el => el.setAttribute('aria-expanded', 'false'));
      menu.replaceChildren();
      Array.from(select.options).filter(option => !option.hidden && option.textContent.trim() && !(option.disabled && !option.value)).forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.disabled = option.disabled;
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(option.selected));
        button.innerHTML = '<span>' + escapeHtml(option.textContent) + '</span>' + (option.selected ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>' : '');
        button.addEventListener('click', () => { select.value = option.value; select.dispatchEvent(new Event('change', {bubbles:true})); close(); if (document.activeElement === button) trigger.focus(); });
        menu.appendChild(button);
      });
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      const rect = trigger.getBoundingClientRect();
      menu.style.width = rect.width + 'px';
      menu.style.left = rect.left + 'px';
      menu.style.top = Math.max(8, rect.bottom + menu.offsetHeight + 8 <= window.innerHeight ? rect.bottom + 4 : rect.top - menu.offsetHeight - 4) + 'px';
      menu.querySelector('[aria-selected="true"]:not(:disabled)')?.focus();
      if (!menu.contains(document.activeElement)) menu.querySelector('button:not(:disabled)')?.focus();
    });
    menu.addEventListener('keydown', event => {
      const buttons = Array.from(menu.querySelectorAll('button:not(:disabled)'));
      const index = buttons.indexOf(document.activeElement);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); trigger.focus(); }
      if (event.key === 'Tab') close();
    });
    document.addEventListener('click', event => { if (!trigger.contains(event.target) && !menu.contains(event.target)) close(); }, {signal:controller.signal});
    const sourceObserver = new MutationObserver(sync);
    sourceObserver.observe(select, {attributes:true, childList:true, subtree:true});
    select.addEventListener('change', sync, {signal:controller.signal});
    ['value', 'selectedIndex'].forEach(key => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, key);
      Object.defineProperty(select, key, {configurable:true, get() { return descriptor.get.call(this); }, set(value) { descriptor.set.call(this, value); sync(); }});
    });
    select.focus = options => trigger.focus(options);
    select.form?.addEventListener('reset', () => { queueMicrotask(sync); }, {signal:controller.signal});
    overlay.addEventListener('scroll', event => { if (!menu.contains(event.target)) close(); }, {capture:true, signal:controller.signal});
    window.addEventListener('resize', close, {signal:controller.signal});
    const overlayObserver = new MutationObserver(() => { if (!overlay.hidden && overlay.style.display !== 'none') sync(); else close(); });
    overlayObserver.observe(overlay, {attributes:true, attributeFilter:['hidden', 'style', 'aria-hidden']});
    niuSelectCleanups.set(select, () => { controller.abort(); sourceObserver.disconnect(); overlayObserver.disconnect(); menu.remove(); });
    sync();
  });
}

/* 只接入现行页面列出的单选字段，不扫描归档容器或已有搜索/多选面板。 */
export function initPageSelectDropdowns() {
  const selectors = [
    '#mgrPeTeam', '#mgrRepoBase', '#mgrTnParent', '#mgrTnDir', '#mgrTnExec', '#mgrTnPre', '#mgrTnKpi',
    '#view-manager select', '#mgrPdAssignee', '#mgrPdSort', '#mgrFdAction',
    '#niuSmartProject', '#tkViewModeSelect', '#tkFormPriority', '#tkFormProject',
    '#tkSaveViewVisibility', '#tkSaveViewScope', '#tkSaveViewLayout', '#tkImportProject',
    '#cv-nt-priority', '#cv-nt-project', '#cv-nt-team', '#cv-nt-group', '[data-nt-expert-assignee]',
    '#cv-pe-team', '#cv-pe-status', '#cv-pe-priority', '[data-pe-member-role]',
    '[data-pj-field]', '[data-pj-artifact-type]', '[data-pj-member-role]', '[data-ps-workspace-role]',
    '#cv-audit-category', '#agentConfigPanel select',
    '#chatTaskProjectSelect', '#inboxStatusFilter', '#inboxPriorityFilter', '#inboxActorFilter',
    '#envProduct', '#envDataCenter', '#consentDc'
  ].join(',');
  const scan = () => {
    initSelectDropdowns([]);
    document.querySelectorAll(selectors).forEach(select => {
      if (!(select instanceof HTMLSelectElement) || select.multiple || select.closest('#cv-tasks')) return;
      if (niuSelectCleanups.has(select)) return;
      initSelectDropdowns([select]);
      select.style.display = 'none';
      select.nextElementSibling.classList.add('shared-select-trigger');
      select.parentElement.classList.add('shared-select-host');
    });
  };
  scan();
  new MutationObserver(records => {
    if (records.some(record => Array.from(record.addedNodes).concat(Array.from(record.removedNodes)).some(node => node.nodeType === 1 && (node.matches('select') || node.querySelector('select'))))) scan();
  }).observe(document.body, {childList:true, subtree:true});
}
