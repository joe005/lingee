import { $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { openFilePicker } from '../attach-app.js';
import { closeAll } from '../dropdown.js';
/* 对话：＋按钮下拉菜单（拆自 composer.js） */

/* ---------- ＋按钮下拉菜单 ---------- */
function bindAddDropdown(btn){
  if(!btn) return;
  var dd=btn.closest('.dropdown');
  if(!dd) return;
  btn.addEventListener('click',function(e){
    e.stopPropagation();
    e.preventDefault();
    var isOpen=dd.classList.contains('open');
    closeAll(null);
    if(!isOpen) dd.classList.add('open');
  });
  $$('.menu-item',dd).forEach(function(item){
    item.addEventListener('click',function(){
      if(item.classList.contains('add-item--submenu')) return;
      var action=item.getAttribute('data-action');
      dd.classList.remove('open');
      if(action==='attach'){ openFilePicker(); }
      else if(action==='folder'){ toast('引用文件夹'); }
      else if(action==='knowledge'){ toast('知识库'); }
      else if(action==='connector'){ toast('连接器'); }
      else if(action==='spec'){ toast('Spec'); }
      else if(action==='goal'){ toast('目标'); }
    });
  });
  /* 连接器子菜单交互 */
  var connColors={腾讯云:'#00a4ff',阿里云:'#ff6a00',华为云:'#ff0000'};
  var connLetters={腾讯云:'☁',阿里云:'☁',华为云:'☁'};
  function addConnBadge(dd,name){
    var badges=dd.closest('.composer-bar').querySelector('.connector-badges');
    if(!badges||badges.querySelector('[data-conn="'+name+'"]')) return;
    var b=document.createElement('span');b.className='conn-badge';
    b.setAttribute('data-conn',name);b.title=name;
    b.style.background=connColors[name]||'#888';
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" style="width:12px;height:12px;display:block"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" fill="#fff" stroke="#fff" stroke-width=".5"/></svg>';
    badges.appendChild(b);
  }
  function removeConnBadge(dd,name){
    var badges=dd.closest('.composer-bar').querySelector('.connector-badges');
    if(!badges) return;
    var b=badges.querySelector('[data-conn="'+name+'"]');if(b)b.remove();
  }
  $$('.connector-btn',dd).forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      var name=btn.closest('.connector-item').querySelector('.connector-name').textContent;
      btn.textContent='正在连接';
      btn.style.background='var(--hover)';
      btn.style.color='var(--text-muted)';
      btn.style.borderColor='var(--border)';
      btn.style.pointerEvents='none';
      setTimeout(function(){
        window.open('https://tcb.cloud.tencent.com/login?cliAuth=1&_redirect_uri=https%3A%2F%2Ftcb.cloud.tencent.com%2Fdev%23%2Fcli-auth%3Fport%3D9012%26hash%3Dcbcbb3ce8c291a411c00cf7099fdc5ea%26mac%3D80%253Ad1%253Ace%253A0d%253Ae6%253A37%26os%3DM2607-0081.local%252FmacOS%252016.6%26from%3Dcli&authCallbackUrl=http%3A%2F%2F127.0.0.1%3A9012&port=9012&hash=cbcbb3ce8c291a411c00cf7099fdc5ea&mac=80%3Ad1%3Ace%3A0d%3Ae6%3A37&os=M2607-0081.local%2FmacOS%2016.6&from=cli','_blank');
        toast('请完成网站授权','info');
        setTimeout(function(){
          var tg=document.createElement('div');
          tg.className='connector-toggle on';
          btn.replaceWith(tg);
          bindToggle(tg);
          addConnBadge(dd,name);
          toast('连接器 '+name+' 已连接','success');
        },3000);
      },1000);
    });
  });
  function bindToggle(t){
    t.addEventListener('click',function(e){
      e.stopPropagation();
      var name=t.closest('.connector-item').querySelector('.connector-name').textContent;
      if(t.classList.contains('on')){
        t.classList.remove('on');
        removeConnBadge(dd,name);
      }else{
        t.classList.add('connecting');
        toast('连接器 '+name+' 连接中','info');
        setTimeout(function(){
          t.classList.remove('connecting');
          t.classList.add('on');
          addConnBadge(dd,name);
          toast('连接器 '+name+' 已连接','success');
        },1500);
      }
    });
  }
  $$('.connector-toggle',dd).forEach(bindToggle);
  var cm=dd.querySelector('.connector-manage');
  if(cm) cm.addEventListener('click',function(){dd.classList.remove('open');toast('管理连接器');});
  var connectorItem=dd.querySelector('[data-action="connector"]');
  if(connectorItem) connectorItem.addEventListener('mouseenter',function(){
    var input=connectorItem.querySelector('.connector-search input');
    if(input) setTimeout(function(){input.focus();},50);
  });
  /* 连接器搜索过滤 */
  var searchInput=dd.querySelector('.connector-search input');
  if(searchInput && !searchInput._filterBound){
    searchInput._filterBound=true;
    searchInput.addEventListener('input',function(){
      var q=this.value.trim().toLowerCase();
      var items=dd.querySelectorAll('.connector-item');
      items.forEach(function(item){
        var name=item.querySelector('.connector-name').textContent.toLowerCase();
        item.style.display=(!q||name.indexOf(q)>-1)?'':'none';
      });
    });
  }
}

export { bindAddDropdown };
