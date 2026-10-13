import { toast } from '../../core/toast.js';
import { CV_ARTIFACTS } from './data.js';
import { xesc } from '../expert/data.js';
/* 工作台：代码类产物文件列表弹窗。 */

/* ---------- 产物预览：代码类产物弹文件列表 ---------- */
function cvOpenArtFiles(name){
  var a=CV_ARTIFACTS.filter(function(x){return x.name===name;})[0];
  if(!a) return;
  if(!(a.files&&a.files.length)){ toast('原型演示：预览「'+name+'」'); return; }
  var title=document.getElementById('cv-artfiles-title'); if(title) title.textContent=a.name;
  var el=document.getElementById('cv-artfiles-list'); if(!el) return;
  el.innerHTML=a.files.map(function(f){
    return '<div class="art-file-row"><span class="art-file-ic">📄</span><span class="art-file-name">'+xesc(f)+'</span></div>';
  }).join('');
  var ov=document.getElementById('cv-artfiles-overlay'); if(ov) ov.style.display='flex';
}
function cvCloseArtFiles(){ var ov=document.getElementById('cv-artfiles-overlay'); if(ov) ov.style.display='none'; }

export { cvCloseArtFiles, cvOpenArtFiles };

/* 内联事件（onclick="cvOpenArtFiles(…)" 等）用到的函数挂到 window。
   由 collab/index.js 的 initCollab() 在末尾调用，注册时机与拆分前一致；本文件新增内联函数时加在这里。 */
export function exposeCollabArtFileGlobals() {
  window.cvOpenArtFiles=cvOpenArtFiles;
  window.cvCloseArtFiles=cvCloseArtFiles;
}
