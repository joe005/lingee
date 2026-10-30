import '../../styles/pages/connectors.css';
import { $ } from '../core/dom.js';
import { toast } from '../core/toast.js';
/* 连接器页：上方是各类系统的连接器卡片（对话「＋ → 连接器」里的同一批），下方是接入它们的 MCP 服务器列表。
   连接器通过 MCP 接入；卡片与服务器均为原型演示数据，状态只在本页内存里演示，不与对话输入框联动。 */
const CONNECTORS=[
  {id:'tencent',name:'腾讯云',type:'云平台',mark:'腾',desc:'连接腾讯云账号，让智能体部署应用并管理云服务器等资源。'},
  {id:'aliyun',name:'阿里云',type:'云平台',mark:'阿',desc:'连接阿里云账号，让智能体部署应用并管理云上资源。'},
  {id:'huawei',name:'华为云',type:'云平台',mark:'华',desc:'连接华为云账号，让智能体部署应用并管理云服务器等资源。'},
  {id:'xinghan',name:'金蝶AI 星瀚',type:'金蝶产品',mark:'瀚',desc:'连接金蝶AI 星瀚环境，让智能体读取和处理业务数据。'},
  {id:'xingkong',name:'金蝶AI 星空',type:'金蝶产品',mark:'空',desc:'连接金蝶AI 星空环境，让智能体读取和处理业务数据。'}
];
const SERVERS=['kingdee-k3cloud','odoo','vb_test_mcp','xkmcp_test_im'];
const CARD_LABEL={on:'已连接',busy:'连接中',off:'未连接'};
const MCP_LABEL={off:'未启用',busy:'连接中…',on:'已连接'};
const cardState={},mcpState={};
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
export function init(){
  const grid=$('#connGrid'),empty=$('#connEmpty'),search=$('#connSearch'),list=$('#connList'),refresh=$('#connRefresh');
  function paintCards(){
    const kw=search.value.trim().toLowerCase();
    const rows=CONNECTORS.filter(c=>!kw||c.name.toLowerCase().includes(kw)||c.type.includes(kw));
    grid.innerHTML=rows.map(c=>{
      const st=cardState[c.id]||'off';
      return `<article class="conn-card" data-conn="${c.id}" data-state="${st}">
        <div class="conn-card-top"><span class="conn-icon" aria-hidden="true">${esc(c.mark)}</span><div class="conn-titles"><div class="conn-name">${esc(c.name)}</div><div class="conn-type">${esc(c.type)} · 通过 MCP 接入</div></div></div>
        <p class="conn-desc">${esc(c.desc)}</p>
        <div class="conn-foot"><span class="conn-status">${CARD_LABEL[st]}</span><button type="button" class="conn-btn" data-conn-toggle${st==='busy'?' disabled':''}>${st==='on'?'断开连接':st==='busy'?'连接中…':'连接'}</button></div>
      </article>`;
    }).join('');
    empty.hidden=rows.length>0;
  }
  function paintMcp(){
    list.innerHTML=SERVERS.map(name=>{
      const st=mcpState[name]||'off';
      return `<div class="mcp-row" data-mcp="${esc(name)}" data-state="${st}">
        <div class="mcp-main"><span class="mcp-name" title="${esc(name)}">${esc(name)}</span><span class="mcp-status">${MCP_LABEL[st]}</span></div>
        <button type="button" class="mcp-icon-btn" data-mcp-config aria-label="查看 ${esc(name)} 配置" title="查看配置"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg></button>
        <button type="button" class="mcp-icon-btn" data-mcp-edit aria-label="编辑 ${esc(name)}" title="编辑"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></button>
        <button type="button" class="mcp-switch" role="switch" aria-checked="${st!=='off'}" aria-label="启用 ${esc(name)}" data-mcp-toggle${st==='busy'?' disabled':''}></button>
      </div>`;
    }).join('');
  }
  grid.addEventListener('click',event=>{
    const button=event.target.closest('[data-conn-toggle]');
    if(!button)return;
    const id=button.closest('[data-conn]').dataset.conn,c=CONNECTORS.find(x=>x.id===id);
    if(cardState[id]==='on'){cardState[id]='off';paintCards();toast('已断开连接器 '+c.name);return;}
    cardState[id]='busy';paintCards();
    setTimeout(()=>{cardState[id]='on';paintCards();toast('连接器 '+c.name+' 已连接','success');},1200);
  });
  search.addEventListener('input',paintCards);
  list.addEventListener('click',event=>{
    const row=event.target.closest('[data-mcp]');if(!row)return;
    const name=row.dataset.mcp;
    if(event.target.closest('[data-mcp-config]'))toast('查看 '+name+' 配置：原型演示');
    else if(event.target.closest('[data-mcp-edit]'))toast('编辑 '+name+'：原型演示');
    else if(event.target.closest('[data-mcp-toggle]')){
      if(mcpState[name]==='on'){mcpState[name]='off';paintMcp();toast('已停用 '+name);return;}
      mcpState[name]='busy';paintMcp();
      setTimeout(()=>{mcpState[name]='on';paintMcp();toast('MCP 服务器 '+name+' 已连接','success');},1200);
    }
  });
  refresh.addEventListener('click',()=>{
    if(refresh.classList.contains('is-busy'))return;
    refresh.classList.add('is-busy');
    setTimeout(()=>{refresh.classList.remove('is-busy');toast('已刷新 MCP 服务器','success');},800);
  });
  $('#connAdd').addEventListener('click',()=>toast('添加 MCP：原型演示'));
  paintCards();paintMcp();
}
