import { $, $$ } from '../core/dom.js';
import { navItems, setNavActive, showView } from '../core/view.js';
import { chatAppDd, selectChatApp } from '../features/attach-app.js';
import { set_cvPendingProj, set_cvPendingTab } from '../features/collab/view.js';
import { appendAssistantMessage, appendUserMessage, messagesList, simulateAIResponse } from '../features/composer.js';
import { dsNavEl, renderOverview } from '../features/design/index.js';
/* 启动路由：从路径 / 旧链接 / localStorage 还原视图
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* 路径优先解析视图，兼容旧 ?view= 链接，无则从 localStorage 恢复 */
var _savedPath=localStorage.getItem('lingeeUrlState')||'';
var _pathParts=location.pathname.replace(/^\/+|\/+$/g,'').split('/');
var dsViewParam=_pathParts[0]||'';
var dsSearch;
var dsTokenParam;

export function initRoute() {
  if(!dsViewParam){
    var _oldView=new URLSearchParams(location.search).get('view');
    if(_oldView) dsViewParam=_oldView;
    else if(_savedPath){ var _m=_savedPath.match(/\/([^\/?]+)/); if(_m) dsViewParam=_m[1]; }
  }
  /* 专家视图已并入协作开发，兼容旧链接 */
  if(dsViewParam==='experts') dsViewParam='collab';
  dsSearch='?'+(dsViewParam?'view='+dsViewParam:'');
  dsTokenParam=new URLSearchParams(location.search).get('token')||new URLSearchParams(dsSearch).get('token');
  if(dsViewParam==='design'){
    showView('design');
    if(navItems) navItems.forEach(function(n){n.classList.remove('active')});
    if(dsTokenParam){
      var tokenLink=$$('.ds-nav-link',dsNavEl).filter(function(l){return l.getAttribute('data-comp')===dsTokenParam;})[0];
      if(tokenLink) tokenLink.click();
      else renderOverview();
    }else{
      renderOverview();
    }
  }else if(dsViewParam==='chat'){
    showView('chat');
    setNavActive('新会话');
    /* 恢复会话内容 */
    var title='采购订单管理应用开发';
    $('#chatTitle').textContent=title;
    if(messagesList) messagesList.innerHTML='';
    appendUserMessage('帮我开发'+title+'功能');
    var responseEl=appendAssistantMessage();
    simulateAIResponse(responseEl,true);
    selectChatApp('采购订单管理');
    if(chatAppDd) chatAppDd.classList.add('disabled');
  }else if(dsViewParam && dsViewParam!=='newtask'){
    showView(dsViewParam);
    if(dsViewParam==='skills') setNavActive('技能开发');
    else if(dsViewParam==='agents') setNavActive('智能体开发');
    else if(dsViewParam==='apps') setNavActive('应用开发');
    else if(dsViewParam==='collab'){
      setNavActive('协作开发');
      /* 协作开发模块在文件末尾才初始化，这里只记下要打开的页签 */
      set_cvPendingTab(new URLSearchParams(dsSearch).get('tab')||'tasks');
      set_cvPendingProj(new URLSearchParams(dsSearch).get('proj')||'');
    }
  }else{
    /* 默认显示新会话 */
    showView('newtask');
    setNavActive('新会话');
  }
}
