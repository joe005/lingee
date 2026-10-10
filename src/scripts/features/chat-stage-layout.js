/* 执行阶段布局对比：默认 A，右键直接切换，仅影响会话概览。 */
export function initChatStageLayout() {
  const panel = document.getElementById('chatCurrentStage');
  if (!panel) return;
  panel.addEventListener('contextmenu', event => {
    event.preventDefault();
    event.stopPropagation();
    const horizontal = panel.classList.toggle('is-horizontal');
    const details = document.getElementById('chatCurrentStageDetails');
    const toggle = document.getElementById('chatCurrentStageToggle');
    details.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    if (horizontal) requestAnimationFrame(() => {
      if (!panel.classList.contains('is-horizontal')) return;
      const current = panel.querySelector('.is-current');
      if (current) details.scrollLeft += current.getBoundingClientRect().left - details.getBoundingClientRect().left - (details.clientWidth - current.offsetWidth) / 2;
    });
    else details.scrollLeft = 0;
    (horizontal ? panel : toggle).focus();
  });
}
