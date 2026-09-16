/* 自定义 tooltip
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */

/* ---------- custom tooltip (300ms delay) ---------- */
var tipEl=document.createElement('div');
var tipTimer;
function positionTip(el,text){
  tipEl.textContent=text;
  tipEl.classList.add('show');
  var r=el.getBoundingClientRect();
  var tw=tipEl.offsetWidth, th=tipEl.offsetHeight;
  var x=r.left+r.width/2-tw/2;
  var y=r.top-th-4;
  if(y<4) y=r.bottom+4;
  if(x<4) x=4;
  if(x+tw>window.innerWidth-4) x=window.innerWidth-4-tw;
  tipEl.style.left=x+'px';
  tipEl.style.top=y+'px';
}

export function initTooltip() {
  tipEl.className='native-tip';
  document.body.appendChild(tipEl);
  document.addEventListener('mouseover',function(e){
    var el=e.target.closest('[data-tooltip]');
    if(!el) return;
    clearTimeout(tipTimer);
    tipTimer=setTimeout(function(){ positionTip(el,el.getAttribute('data-tooltip')); },300);
  });
  document.addEventListener('mouseout',function(e){
    var el=e.target.closest('[data-tooltip]');
    if(!el) return;
    clearTimeout(tipTimer);
    tipEl.classList.remove('show');
  });
}
