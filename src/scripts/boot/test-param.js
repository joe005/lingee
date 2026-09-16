import { input } from '../core/view.js';
import { doSend, refreshSend } from '../features/composer.js';
/* ?test= 自动填入并发送（演示用）
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- URL 参数自动测试 ---------- */
var testParam=new URLSearchParams(location.search).get('test');

export function initTestParam() {
  if(testParam){
    input.textContent=testParam;
    refreshSend();
    setTimeout(doSend,300);
  }
}
