import { $ } from './dom.js';
/* toast 轻提示
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- toast ---------- */
var toastEl=$('#toast'),toastT;
function toast(msg,type){
  var icon='';
  if(type==='error'){
    icon='<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16v.5"/></svg>';
  }else if(type==='success'){
    icon='<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>';
  }else{
    icon='<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
  }
  toastEl.innerHTML=icon+'<span class="toast-text">'+msg+'</span>';
  toastEl.className='toast'+(type?' '+type:'');
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT=setTimeout(function(){toastEl.classList.remove('show')},type==='error'?3000:2000);
}

export function initToast() {
  /* 搜索框默认 readonly，用户点进去才可写。Chrome 不对只读输入框做自动填充，
     这是唯一能真正拦住的办法——type="search" 和 autocomplete="off" 它都不认。 */
  (function unlockSearchOnFocus(){
    function unlock(el){
      if(el && el.tagName==='INPUT' && el.readOnly && el.getAttribute('type')==='search'){
        el.removeAttribute('readonly');
      }
    }
    ['focusin','pointerdown'].forEach(function(ev){
      document.addEventListener(ev,function(e){ unlock(e.target); },true);
    });
  })();
}

export { toast };
