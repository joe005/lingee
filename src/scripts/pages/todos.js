import '../../styles/pages/todos.css';
import { $ } from '../core/dom.js';
import { showView, setNavActive } from '../core/view.js';
import { toast } from '../core/toast.js';
import { mgrMyInvites, mgrPersonName, mgrRespondInvite } from '../features/manager/data.js';
/* 工作待办独立于开发任务；目前只接入空间邀请（邀请制：接受后才加入空间），其他业务审批数据尚未接入。 */
const STATUS_LABEL={accepted:'已接受',declined:'已拒绝'};
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
export function init(){
  const page=$('#view-todos');
  const list=$('#todoList'),empty=page.querySelector('.todo-page-empty'),business=$('#todoBusinessFilter');
  let status='pending';
  document.addEventListener('click',event=>{
    if(!event.target.closest('#sbTodoButton'))return;
    event.preventDefault();event.stopPropagation();
    showView('todos');setNavActive('');render();
    page.querySelector('h1').focus({preventScroll:true});
  },true);
  const tabs=[...page.querySelectorAll('[data-todo-status]')];
  const dateButton=page.querySelector('#todoDateButton'),datePanel=page.querySelector('#todoDatePanel');
  const start=page.querySelector('#todoStartDate'),end=page.querySelector('#todoEndDate');
  function closeDates(){datePanel.hidden=true;dateButton.setAttribute('aria-expanded','false');}
  /* 侧栏「待办」角标：待处理的邀请数 */
  function syncBadge(count){
    const button=$('#sbTodoButton');
    if(!button)return;
    let badge=button.querySelector('.todo-count-badge');
    if(!count){badge?.remove();button.setAttribute('aria-label','待办');return;}
    if(!badge){badge=document.createElement('span');badge.className='todo-count-badge';badge.setAttribute('aria-hidden','true');button.appendChild(badge);}
    badge.textContent=count>99?'99+':String(count);
    button.setAttribute('aria-label',`待办，${count} 项待处理`);
  }
  function inRange(row){
    const day=String(row.invite.invitedAt||'').slice(0,10);
    return(!start.value||day>=start.value)&&(!end.value||day<=end.value);
  }
  function itemHtml(row){
    const inv=row.invite,pending=inv.status==='pending';
    const role=inv.asAdmin?'空间管理员':'成员';
    const actions=pending
      ?`<button type="button" class="todo-item-btn" data-todo-decline>拒绝</button><button type="button" class="todo-item-btn todo-item-btn--primary" data-todo-accept>接受邀请</button>`
      :`<span class="todo-item-status todo-item-status--${inv.status}">${STATUS_LABEL[inv.status]||''}</span>${inv.status==='accepted'?'<button type="button" class="todo-item-btn" data-todo-open>进入空间</button>':''}`;
    return `<article class="todo-item" data-project="${esc(row.projectId)}" data-invite="${esc(inv.id)}">
      <div class="todo-item-main">
        <div class="todo-item-meta"><span class="todo-item-tag">空间邀请</span><time>${esc(inv.invitedAt)}</time></div>
        <p class="todo-item-title">${esc(mgrPersonName(inv.invitedBy))} 邀请你加入空间「${esc(row.projectName)}」</p>
        <p class="todo-item-desc">${pending?`接受后以${role}身份加入，可参与空间协作并被指派研发任务。`:`${esc(inv.handledAt||'')} ${inv.status==='accepted'?`已以${role}身份加入空间`:'已拒绝该邀请'}`}</p>
      </div>
      <div class="todo-item-actions">${actions}</div>
    </article>`;
  }
  function render(){
    const rows=mgrMyInvites();
    const pendingCount=rows.filter(row=>row.invite.status==='pending').length;
    tabs[0].querySelector('span').textContent=pendingCount;
    tabs[1].querySelector('span').textContent=rows.length-pendingCount;
    syncBadge(pendingCount);
    const shown=(!business.value||business.value==='space')
      ?rows.filter(row=>(status==='pending')===(row.invite.status==='pending')&&inRange(row)):[];
    list.innerHTML=shown.map(itemHtml).join('');
    list.hidden=!shown.length;empty.hidden=!!shown.length;
    page.querySelector('#todoEmptyText').textContent=status==='done'?'暂无已处理事项':'暂无待处理事项';
  }
  function openSpace(projectId){document.dispatchEvent(new CustomEvent('lingee:mgr-open',{detail:{proj:projectId}}));}
  list.addEventListener('click',event=>{
    const item=event.target.closest('.todo-item');
    if(!item)return;
    const projectId=item.dataset.project,inviteId=item.dataset.invite;
    const row=mgrMyInvites().find(r=>r.invite.id===inviteId);
    if(event.target.closest('[data-todo-open]')){openSpace(projectId);return;}
    const accept=!!event.target.closest('[data-todo-accept]');
    if(!accept&&!event.target.closest('[data-todo-decline]'))return;
    if(!row||!mgrRespondInvite(projectId,inviteId,accept)){toast('邀请已失效或保存失败，请刷新后重试','error');render();return;}
    render();
    if(accept){toast(`已加入空间「${esc(row.projectName)}」`,'success');openSpace(projectId);}
    else toast('已拒绝邀请');
  });
  tabs.forEach(button=>button.addEventListener('click',()=>{
    tabs.forEach(tab=>{const on=tab===button;tab.classList.toggle('active',on);tab.setAttribute('aria-selected',String(on));});
    status=button.dataset.todoStatus;render();
  }));
  business.addEventListener('change',render);
  dateButton.addEventListener('click',()=>{datePanel.hidden=!datePanel.hidden;dateButton.setAttribute('aria-expanded',String(!datePanel.hidden));if(!datePanel.hidden)start.focus();});
  function syncDates(){
    end.min=start.value;start.max=end.value;
    page.querySelector('#todoDateLabel').textContent=start.value||end.value?`${start.value||'开始日期'} ～ ${end.value||'结束日期'}`:'开始日期 ～ 结束日期';
    render();
  }
  [start,end].forEach(dateField=>dateField.addEventListener('change',syncDates));
  page.querySelector('#todoDateClear').addEventListener('click',()=>{start.value='';end.value='';syncDates();closeDates();dateButton.focus();});
  document.addEventListener('click',event=>{if(!event.target.closest('#view-todos .todo-page-date-wrap'))closeDates();});
  page.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!datePanel.hidden){closeDates();dateButton.focus();}
    const index=tabs.indexOf(event.target);
    if(index>=0&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
      event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+1)%tabs.length;tabs[next].click();tabs[next].focus();
    }
  });
  document.addEventListener('lingee:mgr-projects-changed',render);
  document.addEventListener('lingee:auth-changed',render);
  render();
}
