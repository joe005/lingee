import '../../styles/pages/todos.css';
import { showView, setNavActive } from '../core/view.js';
/* 工作待办独立于开发任务；当前原型尚未接入业务审批数据。 */
export function init(){
  const page=document.getElementById('view-todos');
  document.addEventListener('click',event=>{
    if(!event.target.closest('#sbTodoButton'))return;
    event.preventDefault();event.stopPropagation();
    showView('todos');setNavActive('');
    page.querySelector('h1').focus({preventScroll:true});
  },true);
  const tabs=[...page.querySelectorAll('[data-todo-status]')];
  const dateButton=page.querySelector('#todoDateButton'),datePanel=page.querySelector('#todoDatePanel');
  const start=page.querySelector('#todoStartDate'),end=page.querySelector('#todoEndDate');
  function closeDates(){datePanel.hidden=true;dateButton.setAttribute('aria-expanded','false');}
  tabs.forEach(button=>button.addEventListener('click',()=>{
    tabs.forEach(tab=>{const on=tab===button;tab.classList.toggle('active',on);tab.setAttribute('aria-selected',String(on));});
    page.querySelector('#todoEmptyText').textContent=button.dataset.todoStatus==='done'?'暂无已处理事项':'暂无待处理事项';
  }));
  dateButton.addEventListener('click',()=>{datePanel.hidden=!datePanel.hidden;dateButton.setAttribute('aria-expanded',String(!datePanel.hidden));if(!datePanel.hidden)start.focus();});
  function syncDates(){
    end.min=start.value;start.max=end.value;
    page.querySelector('#todoDateLabel').textContent=start.value||end.value?`${start.value||'开始日期'} ～ ${end.value||'结束日期'}`:'开始日期 ～ 结束日期';
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
}
