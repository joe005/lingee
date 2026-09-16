import { $, $$ } from '../core/dom.js';
import { input, modeItems, setNavActive, showView } from '../core/view.js';
import { closeNewAppModal, closeSourceAppMenu, ctxMenu, hideCtxMenu, newAppModal, sourceAppMenu } from './apps.js';
import { appDd, attachModal, closeAttach } from './attach-app.js';
import { closeHistory, historyBtn, historyPanel } from './chat.js';
import { closeAll } from './dropdown.js';
import { filterSidebar, sbCollapseIcon, sbSearch, sbSearchIcon, sbSearchInput } from './sidebar.js';
/* 全局键盘快捷键
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 全局键盘快捷键 (W3C keydown) ---------- */
var shortcutOverlay=$('#shortcutOverlay');
var shortcutClose=$('#shortcutClose');
function closeShortcut(){ shortcutOverlay.classList.remove('show'); }

export function initShortcuts() {
  if(shortcutClose) shortcutClose.addEventListener('click',closeShortcut);
  if(shortcutOverlay) shortcutOverlay.addEventListener('click',function(e){
    if(e.target===shortcutOverlay) closeShortcut();
  });

  document.addEventListener('keydown',function(e){
    var mod=e.metaKey||e.ctrlKey;
    var key=e.key.toLowerCase();
    var inEditable=(e.target.isContentEditable||e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA');

    /* ⌘/Ctrl+/ — 显示快捷键帮助 */
    if(mod && key==='/'){
      e.preventDefault();
      shortcutOverlay.classList.add('show');
      return;
    }
    /* ⌘/Ctrl+K — 搜索 */
    if(mod && key==='k'){
      e.preventDefault();
      if(sbSearchIcon) sbSearchIcon.click();
      return;
    }
    /* ⌘/Ctrl+B — 折叠侧边栏 */
    if(mod && key==='b'){
      e.preventDefault();
      if(sbCollapseIcon) sbCollapseIcon.click();
      return;
    }
    /* ⌘/Ctrl+N — 新会话 */
    if(mod && key==='n' && !e.shiftKey){
      e.preventDefault();
      showView('newtask');
      setNavActive('新会话');
      if(input){ input.setAttribute('data-placeholder','布置任务'); input.innerHTML=''; input.focus(); }
      if(appDd) appDd.classList.add('hidden');
      if(modeItems) modeItems.forEach(function(m){m.classList.remove('checked')});
      return;
    }
    /* ⌘/Ctrl+Shift+H — 历史记录 */
    if(mod && e.shiftKey && key==='h'){
      e.preventDefault();
      if(historyBtn) historyBtn.click();
      return;
    }
    /* Alt+1~4 — 模式切换 */
    if(e.altKey && !mod && !e.shiftKey){
      var modes=['技能开发','智能体开发','通用应用','苍穹应用'];
      var idx={'1':0,'2':1,'3':2,'4':3}[key];
      if(idx!==undefined){
        e.preventDefault();
        if(modeItems && modeItems[idx]) modeItems[idx].click();
        return;
      }
    }
    /* Esc — 关闭面板/下拉/搜索/右键/帮助 */
    if(key==='escape' && !mod && !e.shiftKey && !e.altKey){
      if(shortcutOverlay && shortcutOverlay.classList.contains('show')){ closeShortcut(); return; }
      if(newAppModal && newAppModal.classList.contains('show')){ closeNewAppModal(); closeSourceAppMenu(); return; }
      if(sourceAppMenu && sourceAppMenu.style.display==='flex'){ closeSourceAppMenu(); return; }
      if(historyPanel && historyPanel.classList.contains('show')){ closeHistory(); return; }
      if(attachModal && attachModal.classList.contains('show')){ closeAttach(); return; }
      if(ctxMenu && ctxMenu.classList.contains('show')){ hideCtxMenu(); return; }
      if(sbSearch && sbSearch.classList.contains('show')){
        sbSearchInput.value=''; filterSidebar(''); sbSearch.classList.remove('show');
        return;
      }
      closeAll(null);
    }
  });

  /* Enter 键在可聚焦元素上触发 click (W3C accessibility) */
  $$('.nav-item, .sub-item, .mode-item, .seg-item, .sb-head-icons .ic, .lbl-icons .ic').forEach(function(el){
    el.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); el.click(); }
    });
  });
}
