/* 可搜索单人选择：保留原生 select 的 value/change 接口。 */
let activeSelect = null;
let picker = null;

function closePicker() {
  if (picker) picker.remove();
  picker = null;
  activeSelect = null;
}

function openPicker(select) {
  closePicker();
  if (select.disabled) return;
  activeSelect = select;
  picker = document.createElement('div');
  picker.className = 'cv-person-picker';
  picker.setAttribute('role', 'dialog');
  picker.setAttribute('aria-label', select.getAttribute('aria-label') || '选择人员');
  picker.innerHTML = '<input type="search" placeholder="搜索人员" aria-label="搜索人员" autocomplete="off"><div class="cv-person-picker-options" role="listbox"></div>';
  document.body.appendChild(picker);
  const rect = select.getBoundingClientRect();
  const width = Math.max(220, rect.width);
  picker.style.width = width + 'px';
  picker.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) + 'px';
  picker.style.top = (rect.bottom + 6 + 290 > window.innerHeight && rect.top > 290 ? rect.top - 296 : rect.bottom + 6) + 'px';
  const input = picker.querySelector('input');
  const list = picker.querySelector('.cv-person-picker-options');
  const render = () => {
    const query = input.value.trim().toLocaleLowerCase();
    const matches = [...select.options].filter(option => !option.disabled && option.textContent.toLocaleLowerCase().includes(query));
    list.replaceChildren();
    matches.forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cv-person-picker-option';
      button.textContent = option.textContent;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(option.value === select.value));
      button.addEventListener('click', () => {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        closePicker();
        select.focus();
      });
      list.appendChild(button);
    });
    if (!matches.length) list.textContent = '没有匹配的人员';
  };
  input.addEventListener('input', render);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closePicker(); select.focus(); }
    if (event.key === 'Enter') { event.preventDefault(); list.querySelector('button')?.click(); }
  });
  render();
  input.focus();
}

export function initPersonPicker() {
  document.addEventListener('pointerdown', event => {
    const select = event.target.closest('select[data-person-select]');
    if (select) { event.preventDefault(); openPicker(select); return; }
    if (picker && !picker.contains(event.target)) closePicker();
  }, true);
  document.addEventListener('keydown', event => {
    const select = event.target.closest('select[data-person-select]');
    if (select && (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')) {
      event.preventDefault(); openPicker(select);
    } else if (picker && event.key === 'Escape') closePicker();
  });
  window.addEventListener('scroll', event => { if (picker && !picker.contains(event.target)) closePicker(); }, true);
  window.addEventListener('resize', closePicker);
}
