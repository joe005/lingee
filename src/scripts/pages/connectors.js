import '../../styles/pages/connectors.css';
import { $ } from '../core/dom.js';
import { toast } from '../core/toast.js';
/* 连接器页：MCP 服务器列表。服务器为原型演示数据，启停与连接状态只在本页内存里演示。 */
const SERVERS=['kingdee-k3cloud','odoo','vb_test_mcp','xkmcp_test_im'];
const STATE_TEXT={off:'未启用',busy:'连接中…',on:'已连接'};
const state={};
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
export function init(){
  const list=$('#connList'),refresh=$('#connRefresh');
  function paint(){
    list.innerHTML=SERVERS.map(name=>{
      const st=state[name]||'off';
      return `<div class="conn-row" data-conn="${esc(name)}" data-state="${st}">
        <div class="conn-main"><span class="conn-name" title="${esc(name)}">${esc(name)}</span><span class="conn-status">${STATE_TEXT[st]}</span></div>
        <button type="button" class="conn-icon-btn" data-conn-config aria-label="查看 ${esc(name)} 配置" title="查看配置"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg></button>
        <button type="button" class="conn-icon-btn" data-conn-edit aria-label="编辑 ${esc(name)}" title="编辑"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></button>
        <button type="button" class="conn-switch" role="switch" aria-checked="${st!=='off'}" aria-label="启用 ${esc(name)}" data-conn-toggle${st==='busy'?' disabled':''}></button>
      </div>`;
    }).join('');
  }
  list.addEventListener('click',event=>{
    const row=event.target.closest('[data-conn]');if(!row)return;
    const name=row.dataset.conn;
    if(event.target.closest('[data-conn-config]'))toast('查看 '+name+' 配置：原型演示');
    else if(event.target.closest('[data-conn-edit]'))toast('编辑 '+name+'：原型演示');
    else if(event.target.closest('[data-conn-toggle]')){
      if(state[name]==='on'){state[name]='off';paint();toast('已停用 '+name);return;}
      state[name]='busy';paint();
      setTimeout(()=>{state[name]='on';paint();toast('MCP 服务器 '+name+' 已连接','success');},1200);
    }
  });
  refresh.addEventListener('click',()=>{
    if(refresh.classList.contains('is-busy'))return;
    refresh.classList.add('is-busy');
    setTimeout(()=>{refresh.classList.remove('is-busy');toast('已刷新 MCP 服务器','success');},800);
  });
  $('#connAdd').addEventListener('click',()=>toast('添加 MCP：原型演示'));
  paint();
}
