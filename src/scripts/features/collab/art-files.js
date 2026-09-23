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
