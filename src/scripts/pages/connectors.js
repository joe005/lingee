import '../../styles/pages/connectors.css';
import { $ } from '../core/dom.js';
import { toast } from '../core/toast.js';
/* 连接器页：列出对话「＋ → 连接器」里的同一批连接器，连接状态只在本页演示，不与对话输入框联动 */
const CONNECTORS=[
  {id:'tencent',name:'腾讯云',type:'云平台',mark:'腾',desc:'连接腾讯云账号，让智能体部署应用并管理云服务器等资源。'},
  {id:'aliyun',name:'阿里云',type:'云平台',mark:'阿',desc:'连接阿里云账号，让智能体部署应用并管理云上资源。'},
  {id:'huawei',name:'华为云',type:'云平台',mark:'华',desc:'连接华为云账号，让智能体部署应用并管理云服务器等资源。'},
  {id:'xinghan',name:'金蝶AI 星瀚',type:'金蝶产品',mark:'瀚',desc:'连接金蝶AI 星瀚环境，让智能体读取和处理业务数据。'},
  {id:'xingkong',name:'金蝶AI 星空',type:'金蝶产品',mark:'空',desc:'连接金蝶AI 星空环境，让智能体读取和处理业务数据。'}
];
const state={};
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
export function init(){
  const grid=$('#connGrid'),empty=$('#connEmpty'),search=$('#connSearch');
  const label={on:'已连接',busy:'连接中',off:'未连接'};
  function render(){
    const kw=search.value.trim().toLowerCase();
    const rows=CONNECTORS.filter(c=>!kw||c.name.toLowerCase().includes(kw)||c.type.includes(kw));
    grid.innerHTML=rows.map(c=>{
      const st=state[c.id]||'off';
      return `<article class="conn-card" data-conn="${c.id}" data-state="${st}">
        <div class="conn-card-top"><span class="conn-icon" aria-hidden="true">${esc(c.mark)}</span><div class="conn-titles"><div class="conn-name">${esc(c.name)}</div><div class="conn-type">${esc(c.type)}</div></div></div>
        <p class="conn-desc">${esc(c.desc)}</p>
        <div class="conn-foot"><span class="conn-status">${label[st]}</span><button type="button" class="conn-btn" data-conn-toggle${st==='busy'?' disabled':''}>${st==='on'?'断开连接':st==='busy'?'连接中…':'连接'}</button></div>
      </article>`;
    }).join('');
    empty.hidden=rows.length>0;
  }
  grid.addEventListener('click',event=>{
    const button=event.target.closest('[data-conn-toggle]');
    if(!button)return;
    const id=button.closest('[data-conn]').dataset.conn,c=CONNECTORS.find(x=>x.id===id);
    if(state[id]==='on'){state[id]='off';render();toast('已断开连接器 '+c.name);return;}
    state[id]='busy';render();
    setTimeout(()=>{state[id]='on';render();toast('连接器 '+c.name+' 已连接','success');},1200);
  });
  search.addEventListener('input',render);
  render();
}
