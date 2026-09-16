import billTemplate from '../artifacts/purchase-order.html?raw';
import tokensCss from '../styles/tokens.css?raw';
import { EXPERT_AV, GATE_ICON, AV_KEYS, WORK_MODES, COMP_NAMES, COMP_LEVELS, COMP_RANK, ASK, ASK_FALLBACK, MODE_MATCH, KW_MATCH } from '../data/expert-data';
import { EXPERTS } from '../data/experts';
import { PRESET_TEAMS } from '../data/teams';
import { ENV_DATA_CENTERS, ERP_API_SCOPES } from '../data/environments';
import { CV_PROJECTS, CV_TASKS, CV_REVIEWS, CV_MEMBERS } from '../data/collab';
import { changelogData, changelogIcons } from '../data/changelog';
import { mockReplies, MODE_BUILDERS } from '../data/chat-data';
import { fullAppData } from '../data/apps-data';
import * as expertStore from '../stores/expert-store';
import * as envStore from '../stores/env-store';
import * as chatStore from '../stores/chat-store';
import * as modalStore from '../stores/modal-store';
import { xav, xesc, parseComp, splitList, splitLines, blankExpert } from '../lib/utils';
import { teamFlow, teamCoverage, teamLint, teamGates, hasGate, toggleGate, activeGates, teamById, teamDomains, teamCmdList } from '../lib/team-logic';
import { toast as toastFn } from '../lib/toast';

/* 产物预览与应用共用同一份设计令牌 */
const billTemplateWithTokens = billTemplate.replace(
  '/* 令牌由 tokens.css 注入 */',
  tokensCss.replace(/\/\*[\s\S]*?\*\//g, '').trim()
);


(function(){
  var $=function(s,el){return (el||document).querySelector(s)};
  var $$=function(s,el){return Array.prototype.slice.call((el||document).querySelectorAll(s))};

  /* 以下函数已迁到 React/stores，保留 no-op 桩避免 bridge 引用报错 */
  function saveTeams(){}
  function rebuildExperts(){}
  function deleteMyExpert(id){ expertStore.deleteExpert(id); }
  function summon(kind,id,phrase){ /* moved to React */ }
  function startExpertByChat(){ /* moved to React */ }
  function startNewTaskWithMode(mode){ /* moved to React */ }
  function openAppCardChat(name){ /* moved to React */ }
  function resetPickForNewSession(){ /* moved to React */ }
  function applyModeSilent(mode){ /* moved to React */ }

  /* bridge 仍需的状态变量 */
  var _expertViewingId=null;
  var _expertEditId=null;
  var _teamEditingId=null;
  var teamDraft=null;
  var xeDraft=null, xeEditingId=null;

  /* ---------- 弹窗状态桥工厂（Phase 2b antd 化，见 docs/react-migration-plan.md） ----------
     和 _cvModalState（协作开发 7 个弹窗，Phase 2）用的是同一套模式：这里只广播
     "当前该开哪个弹窗"，具体判断/落库/联动 UI 仍然 100% 留在本文件对应的业务
     函数里，React 侧（*Modals.jsx）只负责收集表单值后调用 window.__lingeeBridge
     里对应命名空间的函数。每个"弹窗场景"（会话页关联应用、专家/专家团、ERP
     环境、快捷键面板）各自一份实例，互不干扰。 */
  function _makeModalBridge(){
    var state={name:null,version:0};
    var listeners=[];
    function notify(){ listeners.slice().forEach(function(fn){ try{fn(state);}catch(e){} }); }
    function open(name){ state={name:name,version:0}; notify(); }
    function close(name){ if(!name||state.name===name){ state={name:null,version:0}; notify(); } }
    function isOpen(name){ return state.name===name; }
    function subscribe(fn){ listeners.push(fn); return function(){ var i=listeners.indexOf(fn); if(i>=0)listeners.splice(i,1); }; }
    function touch(){ state.version++; notify(); }
    return {open:open, close:close, isOpen:isOpen, subscribe:subscribe, getOpenModal:function(){ return state.name; }, getVersion:function(){ return state.version; }, touch:touch};
  }

  /* ---------- toast ---------- */
  var toastEl=$('#toast'),toastT;
  function toast(msg,type){
    var icon='';
    if(type==='error'){
      icon='<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16v.5"/></svg>';
    }else if(type==='success'){
      icon='<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>';
    }else{
      icon='<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
    }
    toastEl.innerHTML=icon+'<span class="toast-text">'+msg+'</span>';
    toastEl.className='toast'+(type?' '+type:'');
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT=setTimeout(function(){toastEl.classList.remove('show')},type==='error'?3000:2000);
  }

  /* 搜索框默认 readonly，用户点进去才可写。Chrome 不对只读输入框做自动填充，
     这是唯一能真正拦住的办法——type="search" 和 autocomplete="off" 它都不认。 */
  (function unlockSearchOnFocus(){
    function unlock(el){
      if(el && el.tagName==='INPUT' && el.readOnly && el.getAttribute('type')==='search'){
        el.removeAttribute('readonly');
      }
    }
    ['focusin','pointerdown'].forEach(function(ev){
      document.addEventListener(ev,function(e){ unlock(e.target); },true);
    });
  })();
  /* ---------- mode ↔ sidebar sync ---------- */
  var navItems=$$('.sb-scroll .nav-item');
  var navByName={};
  navItems.forEach(function(n){ navByName[n.textContent.trim()]=n; });

  function setNavActive(name){
    navItems.forEach(function(n){ n.classList.toggle('active', n.textContent.trim()===name); });
  }
  function applyMode(mode){ /* moved to React */ }
  /* mode items click 已迁到 React NewTaskView */

  /* ---------- view switching ---------- */
  var viewReact=$('#react-view-root');
  var REACT_VIEWS=['apps','skills','agents','design','home','newtask','chat','collab','settings'];
  function setUrlState(path,notifyReactRouter){
    try{history.replaceState(null,'',path);localStorage.setItem('lingeeUrlState',path)}catch(e){}
    if(notifyReactRouter){ try{ window.dispatchEvent(new PopStateEvent('popstate')); }catch(e){} }
  }
  function showView(which){
    if(viewReact) viewReact.classList.remove('hidden');
    $('.sidebar').classList.toggle('hidden', which==='design');
    closeAll(null);
    setUrlState('/'+which,true);
  }



  /* 预览面板已迁到 React ChatView */

  /* ---------- custom tooltip (300ms delay) ---------- */
  var tipEl=document.createElement('div');
  tipEl.className='native-tip';
  document.body.appendChild(tipEl);
  var tipTimer;
  function positionTip(el,text){
    tipEl.textContent=text;
    tipEl.classList.add('show');
    var r=el.getBoundingClientRect();
    var tw=tipEl.offsetWidth, th=tipEl.offsetHeight;
    var x=r.left+r.width/2-tw/2;
    var y=r.top-th-4;
    if(y<4) y=r.bottom+4;
    if(x<4) x=4;
    if(x+tw>window.innerWidth-4) x=window.innerWidth-4-tw;
    tipEl.style.left=x+'px';
    tipEl.style.top=y+'px';
  }
  document.addEventListener('mouseover',function(e){
    var el=e.target.closest('[data-tooltip]');
    if(!el) return;
    clearTimeout(tipTimer);
    tipTimer=setTimeout(function(){ positionTip(el,el.getAttribute('data-tooltip')); },300);
  });
  document.addEventListener('mouseout',function(e){
    var el=e.target.closest('[data-tooltip]');
    if(!el) return;
    clearTimeout(tipTimer);
    tipEl.classList.remove('show');
  });

  /* ---------- 全局键盘快捷键 (W3C keydown) ----------
     快捷键面板本身已迁到 antd Modal（src/components/shortcut/ShortcutModal.jsx），
     这里只广播开关状态，面板内容是纯静态展示，不需要经业务函数。 */
  var _shortcutBridge=_makeModalBridge();
  function openShortcut(){ _shortcutBridge.open('shortcut'); }
  function closeShortcut(){ _shortcutBridge.close('shortcut'); }

  document.addEventListener('keydown',function(e){
    var mod=e.metaKey||e.ctrlKey;
    var key=e.key.toLowerCase();
    var inEditable=(e.target.isContentEditable||e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA');

    /* ⌘/Ctrl+/ — 显示快捷键帮助 */
    if(mod && key==='/'){
      e.preventDefault();
      openShortcut();
      return;
    }
    /* ⌘/Ctrl+K — 搜索 */
    if(mod && key==='k'){
      e.preventDefault();
      if(sbSearchIcon) sbSearchIcon.click();
      return;
    }
    /* ⌘/Ctrl+B — 折叠侧边栏 */
    if(mod && key==='b'){
      e.preventDefault();
      if(sbCollapseIcon) sbCollapseIcon.click();
      return;
    }
    /* ⌘/Ctrl+N — 新会话 */
    if(mod && key==='n' && !e.shiftKey){
      e.preventDefault();
      showView('newtask');
      setNavActive('新会话');
      if(input){ input.setAttribute('data-placeholder','布置任务'); input.innerHTML=''; input.focus(); }
      if(appDd) appDd.classList.add('hidden');
      if(modeItems) modeItems.forEach(function(m){m.classList.remove('checked')});
      return;
    }
    /* ⌘/Ctrl+Shift+H — 历史记录 */
    if(mod && e.shiftKey && key==='h'){
      e.preventDefault();
      if(historyBtn) historyBtn.click();
      return;
    }
    /* Alt+1~4 — 模式切换 */
    if(e.altKey && !mod && !e.shiftKey){
      var modes=['技能开发','智能体开发','通用应用','苍穹应用'];
      var idx={'1':0,'2':1,'3':2,'4':3}[key];
      if(idx!==undefined){
        e.preventDefault();
        if(modeItems && modeItems[idx]) modeItems[idx].click();
        return;
      }
    }
    /* Esc — 关闭面板/下拉/搜索/右键/帮助 */
    if(key==='escape' && !mod && !e.shiftKey && !e.altKey){
      if(_shortcutBridge.isOpen('shortcut')){ closeShortcut(); return; }
      if(_newAppBridge.isOpen('newapp')){ closeNewAppModal(); return; }
      if(_expertBridge.isOpen('expert-detail')){ closeExpertModal(); return; }
      if(_expertEditBridge.isOpen('expert-edit')){ closeExpertEditor(); return; }
      if(_teamBridge.isOpen('team-config')){ closeTeamModal(); return; }
      if(_memberBridge.isOpen('member-picker')){ closeMemberModal(); return; }
      if(_envAuthConfirmBridge.isOpen('env-auth-confirm')){ _closeAuthConfirm(); return; }
      if(_consentBridge.isOpen('consent')){ _consentBridge.close('consent'); return; }
      if(_envAuthorizeBridge.isOpen('env-authorize')){ closeAuthorize(); return; }
      if(_envDisconnectBridge.isOpen('env-disconnect')){ closeDisconnect(); return; }
      if(_envBridge.isOpen('env-config')){ closeEnvModal(); return; }
      if(historyPanel && historyPanel.classList.contains('show')){ closeHistory(); return; }
      if(ctxMenu && ctxMenu.classList.contains('show')){ hideCtxMenu(); return; }
      if(sbSearch && sbSearch.classList.contains('show')){
        sbSearchInput.value=''; filterSidebar(''); sbSearch.classList.remove('show');
        return;
      }
      closeAll(null);
    }
  });

  /* Enter 键在可聚焦元素上触发 click (W3C accessibility) */
  $$('.nav-item, .sub-item, .mode-item, .seg-item, .sb-head-icons .ic, .lbl-icons .ic').forEach(function(el){
    el.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); el.click(); }
    });
  });

  /* ---------- Design System 交互 ---------- */

  /* 路径优先解析视图，兼容旧 ?view= 链接，无则从 localStorage 恢复 */
  var _savedPath=localStorage.getItem('lingeeUrlState')||'';
  var _pathParts=location.pathname.replace(/^\/+|\/+$/g,'').split('/');
  var dsViewParam=_pathParts[0]||'';
  if(!dsViewParam){
    var _oldView=new URLSearchParams(location.search).get('view');
    if(_oldView) dsViewParam=_oldView;
    else if(_savedPath){ var _m=_savedPath.match(/\/([^\/?]+)/); if(_m) dsViewParam=_m[1]; }
  }
  /* 专家视图已并入协作开发，兼容旧链接 */
  if(dsViewParam==='experts') dsViewParam='collab';
  var dsSearch='?'+(dsViewParam?'view='+dsViewParam:'');
  var dsTokenParam=new URLSearchParams(location.search).get('token')||new URLSearchParams(dsSearch).get('token');
  /* design 已迁到 React 路由，BrowserRouter 自动处理 /design */
  if(dsViewParam==='design'){
    showView('design');
    if(navItems) navItems.forEach(function(n){n.classList.remove('active')});
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
      cvPendingTab=new URLSearchParams(dsSearch).get('tab')||'tasks';
      cvPendingProj=new URLSearchParams(dsSearch).get('proj')||'';
    }
  }else{
    /* 默认显示新会话 */
    showView('newtask');
    setNavActive('新会话');
  }


  /* ============================================================
     专家 / 专家团
     数据取自 lingee-build/packages/opencode/builtin-experts/
     技能名取自 packages/opencode/builtin-skills/
     ============================================================ */
  var BUILTIN_EXPERTS=EXPERTS;
  var MY_EXPERTS=[];                 /* 我自己创建的专家，落 localStorage */
  var EX={};
  rebuildExperts();
  /* ---------- 能力项字典 ----------
     定义文件里能力项是机器标识（architecture.system-design · principal），
     直接摆到界面上没人看得懂。这里翻成中文名 + 等级，字典没覆盖的回退显示原串。 */
  /* ---------- 开工前需要的输入 ----------
     不再单独维护字段：需要什么输入，直接写进触发词的 [占位符] 里。
     发出去时占位符没被替换，就在会话里追问，而不是让专家拿着空输入硬跑。 */
  function askFor(name){ return ASK[name]||ASK_FALLBACK; }
  var PRESET_TEAMS=[
    {id:'software-company',preset:true,name:'软件开发团队',by:'Lingee 内置',
     desc:'跨职能软件产品交付团队，覆盖需求、架构、实现、质量与集成的完整闭环。也是新建任务时的默认选择。',
     domains:['通用软件','后端','前端','数据库'],
     gates:['design','verify'],
     leadId:'software-team-lead',
     members:['software-team-lead','software-product-manager','software-architect','software-engineer','software-qa-engineer'],
     cmds:[['帮我把这个想法做成一个能上线的功能','从需求到验收走完整闭环'],
           ['这个模块要重做，帮我走一遍完整流程','需求、架构、实现、测试、集成逐环节推进'],
           ['需求还没理清，先帮我拆一版方案再动手','先出需求与实现计划，评审通过再编码']]},
    {id:'fast-app',preset:true,name:'应用速成小队',by:'Lingee 内置',
     desc:'工程师一次性写完全部代码，QA 端到端验证。适合单页应用、小游戏、原型页这类一次交付的活。',
     domains:['单页应用','原型','小工具'],
     gates:[],
     leadId:'software-engineer',
     members:['software-engineer','software-qa-engineer'],
     cmds:[['做一个单页小工具，今天就要用','一次性写完代码并跑通 build'],
           ['帮我快速搭个原型页看看效果','省掉评审环节，直接实现 + 自检'],
           ['写个小游戏练手','小体量一次交付']]},
    {id:'cosmic-team',preset:true,name:'苍穹交付团队',by:'Lingee 内置',
     desc:'面向苍穹配置化交付：需求规格 → 表单与流程配置 → 报表 → 二开插件 → 接口集成。',
     domains:['苍穹','表单','工作流','报表','集成'],
     gates:['requirement'],
     leadId:'software-team-lead',
     members:['software-team-lead','software-product-manager','cosmic-form','cosmic-workflow','cosmic-report','cosmic-api'],
     cmds:[['帮我在苍穹上做一套请假申请，从单据到审批','表单、流程、报表、接口一条龙配下来'],
           ['这个业务要在苍穹落地，帮我出方案','先出需求规格，再分头配置'],
           ['苍穹这块单据和流程都要改，帮我排一下','按依赖顺序编排配置任务']]},
    {id:'web-team',preset:true,name:'网页交付小队',by:'Lingee 内置',
     desc:'设计与前端配对交付：信息架构与视觉规范先行，前端按规范实现并做设计走查。',
     domains:['Web','前端','视觉设计'],
     gates:['design'],
     leadId:'ux-designer',
     members:['ux-designer','frontend-engineer','software-qa-engineer'],
     cmds:[['帮我做一个官网首页，设计和前端都要','先出设计规范，再按规范实现'],
           ['这几个页面要重新设计并实现','信息架构先行，前端跟进，最后走查'],
           ['按这份设计稿把页面实现出来并走查一遍','实现 + 设计一致性检查']]}
  ];

  /* ---------- 持久化：只存自建专家团与当前选择 ----------
     内置团不入库，这样以后改内置定义能直接生效，不会被旧缓存盖住 */
  var TEAM_STORE_KEY='lingee.experts.v1';
  var TEAMS=PRESET_TEAMS.slice();
  /* 选中对象：团或单个专家，同一语义位、只能选其一
     —— 对应 lingee-build 的 mode: team / personal */
  var activePick={kind:null,id:''};   /* 默认不指定，由系统自动匹配 */
  function loadTeams(){} /* stub */
  /* ---------- 编排推导：成员 → 任务 DAG ----------
     不再有交付强度这个旋钮：团里有谁，流程里就有哪一步。
     实现环节始终保留——没人能领时显式标红，这是要暴露的问题，不是可以省掉的步骤。 */
  /* ---------- 人工审核确认节点 ----------
     挂在某个流程步骤之后：这一步产出后编排暂停，等人点过才继续。
     只存步骤 id，成员变动导致步骤消失时自动失效，不需要迁移数据。 */
  /* ---------- 专家库视图 ---------- */
  var expertTab='team', expertKw='';
  var expertGrid=$('#expertGrid');
  /* cvRenderExperts 已迁到 React CollabView，保留 no-op 避免调用处报错 */
  function cvRenderExperts(){}
  function renderExpertGrid(){} /* moved to React */
  /* expert grid/search/tabs 事件已迁到 React CollabView */
  /* 发出去的话里还留着没填的 [占位符] —— 专家先问清楚再开工。
     一次把缺的都问完，别挤牙膏式来回问。 */
  if(messagesList) messagesList.addEventListener('click',function(ev){
    var b=ev.target.closest('[data-ask-pick]');
    if(!b) return;
    var q=b.closest('.ask-q');
    q.querySelectorAll('.ask-opt').forEach(function(x){ x.classList.remove('on') });
    b.classList.add('on');
    q.classList.add('answered');
    var card=b.closest('.ask-card');
    var all=card.querySelectorAll('.ask-q').length;
    var done=card.querySelectorAll('.ask-q.answered').length;
    var foot=card.querySelector('.ask-foot');
    if(done>=all){
      foot.textContent='已确认，继续执行';
      foot.classList.add('ask-foot-done');
    }else{
      foot.textContent='还剩 '+(all-done)+' 项待确认';
    }
  });
  /* ---------- 创建 / 编辑我的专家 ---------- */
  /* 两条路：手填这张表单，或者一句话交给 expert-manager 在对话里建（同 WorkBuddy） */
  var EXPERT_MANAGER={id:'expert-manager',
    ic:'<path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3.2"/><path d="M18 6v6M15 9h6"/>'};
  var ONE_LINE_PROMPT='帮我创建一个 XXX 专家，擅长 XXXXX。我的经验是：[请补充你的行业背景、相关经验]';
  var forcedBuilder=null;
  /* ---------- 创建/编辑专家弹窗（Phase 2c antd 化） ----------
     React 侧（ExpertModals.jsx）自己管理表单状态，打开时从 bridge.getInitialData()
     读初始数据，保存时调 bridge.save(draft)。xeDraft/xeEditingId 仍在本文件维护
     供 bridge 方法读写，但 DOM 操作和事件监听全部删除。 */
  /* ---------- 专家团配置弹窗 ---------- */
  /* ---------- 专家团配置弹窗（Phase 2c antd 化） ----------
     React 侧（ExpertModals.jsx）通过 bridge 读写 teamDraft，每次修改后
     调 _teamBridge.touch() 触发 React 重渲染。计算函数（teamFlow/
     teamCoverage/teamLint）保持不变，React 直接调 bridge.getFlow 等。 */
  var newExpertEntryBtn=$('#newExpertEntryBtn');
  if(newExpertEntryBtn) newExpertEntryBtn.addEventListener('click',function(){
    if(expertTab==='team') openTeamModal(null); else openExpertEditor(null);
  });

  /* ---------- composer：选中对象渲染为顶部标签 + 下拉选择 ---------- */
  function pickIconSvg(){} /* stub */

  /* 模式 → builder 名。来源见 lingee-build packages/kcode-web/src/components/prompt-input.tsx
     starterRecommendationCards；技能/智能体两项用 1.x 线的新名（用户确认） */
  function renderModeTag(){} /* moved to React */
  /* expert picker + mode click + resetPick 已迁到 React */

  loadTeams();
  renderExpertChips();
  renderModeTag();
  renderExpertGrid();



  /* ============================================================
     协作开发（任务管理 / 待评审 / 协作人员 / 专家 / 专家团 / 设置）
     任务、评审、协作人员数据与交互移植自协作开发原型稿
     ============================================================ */
  /* CV data moved to src/data/collab.js */

  function cvWorkspaceProjects(){} /* stub */
  function cvInProject(){} /* stub */
  /* level/owner：协作身份分级（所有者/管理员/成员），见 cvCurrentLevel 等函数。
     梁平已经带着「所有者」角色标签，所有者身份归他；isMe 的张工给管理员，方便登录后
     直接体验"调整他人身份/移除成员"这套权限交互，不用切账号。 */
  /* 协作身份分级：所有者 > 管理员 > 成员。只有所有者能调整管理员身份，
     管理员能管普通成员但动不了另一个管理员，谁都改不了自己。 */
  function cvCurrentMember(){ return CV_MEMBERS.filter(function(m){return m.isMe;})[0]||null; }
  function cvCurrentLevel(){} /* stub */
  function cvCanManageMembers(){ var lv=cvCurrentLevel();return lv==='owner'||lv==='admin'; }
  function cvCanRemoveMember(){} /* stub */
  function cvCanToggleLevel(){} /* stub */
  function cvSetMemberLevel(){} /* stub */

  function cvBuildTaskCard(){} /* stub */
  function cvBuildReviewCard(){} /* stub */
  function cvInjectCardActions(){} /* stub: moved to React */

  /* ============ VIEW SWITCHING ============ */
  function cvSwitchFilter(){} /* stub */
  function cvApplyFilters(){} /* stub: moved to React */
  /* ============ STATS CLICK ============ */
  function cvClickStat(){} /* stub */
  function cvClickReviewStat(){} /* stub */
  function cvApplyReviewFilters(){} /* stub: moved to React */

  /* ============ 弹窗状态桥（Phase 2 antd 化，见 docs/react-migration-plan.md） ============
     同步任务/执行/转交/扭转/评审/添加人员/新建项目这 7 个弹窗的 DOM 已经从
     index.html 删除，改由 src/components/collab/CollabModals.jsx 用 antd
     Modal/Form 渲染。这里只广播"哪个弹窗要开"，弹窗打开后要做的判断、落库、
     联动其它 UI（卡片状态、toast、任务列表）仍然 100% 留在这个文件里，React
     侧只负责收集表单值后调用 window.__lingeeBridge.collab 里对应的函数，不
     重新发明这些判断。 */
  var _cvModalState={name:null};
  var _cvModalListeners=[];
  function _cvModalNotify(){ _cvModalListeners.slice().forEach(function(fn){ try{fn(_cvModalState);}catch(e){} }); }
  function _cvModalOpen(name){ _cvModalState={name:name}; _cvModalNotify(); }
  function _cvModalClose(name){ if(!name||_cvModalState.name===name){ _cvModalState={name:null}; _cvModalNotify(); } }
  function _cvModalSubscribe(fn){ _cvModalListeners.push(fn); return function(){ var i=_cvModalListeners.indexOf(fn); if(i>=0)_cvModalListeners.splice(i,1); }; }
  /* ============ SYNC MODAL ============ */
  function cvOpenSyncModal(){ _cvModalOpen('sync'); }
  function cvCloseSyncModal(){ _cvModalClose('sync'); }
  function cvBuildSyncTaskData(){} /* stub */
  /* 弹窗里的任务落库：归一化字段并挂到当前项目（聚合视图下默认第一个项目） */
  function cvNormalizeTask(){} /* stub */
  function cvAddTask(){} /* stub */
  function cvSaveSyncTask(){} /* stub */
  function cvStartSyncTask(){} /* stub */

  /* ============ TASK MODALS ============ */
  function cvOpenTaskModal(id){ _cvModalOpen(CV_TASK_MODAL_IDS[id]||id); }
  function cvCloseTaskModal(id){ _cvModalClose(CV_TASK_MODAL_IDS[id]||id); }
  /* 数据 getter：只返回数据，具体怎么排布是 CollabModals.jsx 的事 */
  function cvGetMembersForModal(){} /* stub */
  function cvCurrentWorkflowNode(){} /* stub */
  function cvGetReviewCandidates(){} /* stub */
  function cvGetWorkflowState(){} /* stub */
  function cvGetDefaultArtifacts(){} /* stub */

  /* ============ CONFIRM ACTIONS ============ */
  function cvConfirmExec(){} /* stub */
  function cvConfirmTransfer(){} /* stub */
  function cvConfirmTwist(){cvCloseTaskModal('cv-twist-overlay');cvToast('任务已扭转到下一节点：代码审查，产物已自动传递给审查人员','info');}
  function cvConfirmReview(){} /* stub */

  /* ============ REVIEW ACTIONS ============ */
  function cvReviewPass(){} /* stub */
  function cvReviewReject(i){cvToast('评审驳回！任务已退回给开发人员','error');}
  function cvOpenReviewDetail(){} /* stub: moved to React */
  function cvSwitchArtifact(){} /* stub */
  function cvRenderReviewComments(){} /* stub */
  function cvSubmitReview(){} /* stub */

  /* ============ CHAT ============ */
  function cvSwitchToChat(){} /* stub */
  function cvAddChatMessage(){} /* stub */
  function cvAddChatTyping(){} /* stub */
  function cvSimulateExecution(){} /* stub */

  /* ---------- 面板切换 ---------- */
  function cvToast(msg,type){ toast(msg, type==='error'?'error':undefined); }
  function cvSwitchView(){} /* stub: moved to React */
  /* 执行中的任务在侧边栏项目下挂一条会话 */
  function cvAddSidebarConversation(){} /* stub */

  /* ---------- 专家管理：分组卡片 ---------- */
  function cvExpertGroups(){} /* stub */
  function cvTeamCountOf(){} /* stub */
  function cvBuildExpertCard(){} /* stub */

  /* ---------- 项目（与任务管理平级的独立页签，归属当前工作区） ---------- */
  function cvProjectTaskStats(){} /* stub */
  function cvProjectProgressHtml(){} /* stub */
  function cvProjectOwners(){} /* stub */
  /* 卡片上「状态」「负责人」就地改：点开小弹层直接选，不用进详情 */
  function cvToggleProjectField(){} /* stub */
  function cvPopulateProjectFilters(){} /* stub */
  function cvFilteredProjects(){} /* stub */
  function cvSetProject(){} /* stub: moved to React */
  function cvUpdateCounts(){} /* stub: moved to React */
  function cvSyncUrl(){} /* stub */
  /* ---------- 新建项目弹窗 ---------- */
  function cvOpenNewProjectModal(){ _cvModalOpen('newproject'); }
  function cvCloseNewProjectModal(){ _cvModalClose('newproject'); }
  function cvConfirmNewProject(){} /* stub */

  /* ---------- 工作区 ---------- */
  function cvWorkspaceName(){} /* stub */
  function cvRenderWsMenu(){} /* stub: moved to React */
  function cvSetWorkspace(){} /* stub */
  /* CV 事件监听已迁到 React CollabView */

  /* ---------- 初始化 ---------- */
  function cvInit(){} /* moved to React CollabView */
  /* expert search/new expert btn 事件已迁到 React CollabView */


  /* URL 直接进入协作开发 — React 路由处理 */
  if(cvPendingTab){
    cvInit();
    if(cvPendingProj) cvSetProject(cvPendingProj);
    cvSwitchView(cvPendingTab);
    cvPendingTab=null; cvPendingProj=null;
  }

  /* 内联事件用到的函数挂到 window */
  /* 未登录时清理 URL，确保页面仅显示登录页 */
  if(!_authedUser) history.replaceState(null,'','/');

  /* ---------- React 集成桥 ----------
     应用开发/技能开发/智能体开发三个卡片网格页已迁到 src/views/*View.jsx（见
     docs/react-migration-plan.md Phase 1）。它们复用这里现成的「打开会话预览」
     「从卡片网格发起新建」「toast」逻辑，而不是各写一份，避免两边行为跑偏。
     showView 仍是唯一的视图切换入口，React 侧不直接操作 .view 的 hidden class。 */
  window.__lingeeBridge={
    toast:toastFn,
    showView:showView,
    setNavActive:setNavActive,
    openAppCardChat:function(){},
    startNewTaskWithMode:function(){},
    /* 协作开发弹窗 — CV modal 函数仍在 main.js */
    collab:{
      subscribe:_cvModalSubscribe,
      getOpenModal:function(){ return _cvModalState.name; },
      closeSync:cvCloseSyncModal,
      saveSyncTask:cvSaveSyncTask,
      startSyncTask:cvStartSyncTask,
      closeTaskModal:function(name){ _cvModalClose(name); },
      getMembers:cvGetMembersForModal,
      getReviewCandidates:cvGetReviewCandidates,
      getWorkflowState:cvGetWorkflowState,
      getDefaultArtifacts:cvGetDefaultArtifacts,
      confirmExec:cvConfirmExec,
      confirmTransfer:cvConfirmTransfer,
      confirmTwist:cvConfirmTwist,
      confirmReview:cvConfirmReview,
      closeAddMember:cvCloseAddMemberModal,
      findThirdPartyMembers:cvFindThirdPartyMembers,
      confirmAddMembers:cvConfirmAddMembers,
      closeNewProject:cvCloseNewProjectModal,
      getProjectStatusOptions:function(){ return CV_PROJECT_STATUS.map(function(s){return{id:s.id,label:s.label};}); },
      getProjectOwnerOptions:cvProjectOwners,
      confirmNewProject:cvConfirmNewProject,
      getTasks:function(){ return CV_TASKS; },
      getReviews:function(){ return CV_REVIEWS; },
      getMembers:function(){ return CV_MEMBERS; },
      getProjects:function(){ return CV_PROJECTS; },
      getExperts:function(){ return expertStore.getExperts().map(expertStore.sanitizeExpert); },
      getTeams:function(){ return expertStore.getTeams(); },
      openTaskModal:function(){ _cvModalOpen('sync'); },
      openTeamModal:function(id){ modalStore.openModal('team','team-config'); _teamEditingId=id||null; },
      openExpertEditor:function(id){ modalStore.openModal('expertEdit','expert-edit'); _expertEditId=id||null; },
      openExpertModal:function(id){ _expertViewingId=id; modalStore.openModal('expert','expert-detail'); },
      summon:function(){}
    },
    /* 快捷键 + 新建应用 — 仍用 IIFE bridge */
    shortcut:{
      subscribe:_shortcutBridge.subscribe,
      getOpenModal:_shortcutBridge.getOpenModal,
      close:closeShortcut
    },
    newApp:{
      subscribe:_newAppBridge.subscribe,
      getOpenModal:_newAppBridge.getOpenModal,
      close:closeNewAppModal,
      getAppOptions:getFullAppOptions,
      confirm:confirmNewApp
    },
    /* 专家/专家团/成员 — 转发到 expert-store + modal-store */
    expert:{
      subscribe:function(fn){ return modalStore.subscribe('expert',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('expert'); },
      close:function(){ modalStore.closeModal('expert'); _expertViewingId=null; },
      getExpertId:function(){ return _expertViewingId; },
      getExpert:function(id){ return expertStore.sanitizeExpert(expertStore.getEx()[id]); },
      getAvatar:xav,
      callExpert:function(id,cmd){ modalStore.closeModal('expert'); },
      editExpert:function(id){ modalStore.closeModal('expert'); _expertEditId=id; modalStore.openModal('expertEdit','expert-edit'); },
      deleteExpert:expertStore.deleteExpert,
      viewExpert:function(id){ _expertViewingId=id; modalStore.openModal('expert','expert-detail'); }
    },
    expertEdit:{
      subscribe:function(fn){ return modalStore.subscribe('expertEdit',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('expertEdit'); },
      close:function(){ modalStore.closeModal('expertEdit'); },
      getEditingId:function(){ return _expertEditId; },
      getInitialData:function(){
        var e=_expertEditId?expertStore.getEx()[_expertEditId]:null;
        var editing=(e&&e.mine)?_expertEditId:null;
        var d=editing?{k:e.k,name:e.name,role:e.role,desc:e.desc,visibility:e.visibility==='private'?'private':'workspace',tags:e.tags.slice(),modes:e.modes.slice(),comp:e.comp.slice(),cmds:e.cmds.length?e.cmds.map(function(c){return c.slice()}):[['','']]}:blankExpert();
        return {draft:d,editingId:editing,title:editing?'编辑专家':'创建专家'};
      },
      getAvatars:function(){ return AV_KEYS; },
      getWorkModes:function(){ return WORK_MODES; },
      getAvatar:xav,
      save:function(d){
        if(!d.name){ toastFn('请填写专家名称','warning'); return; }
        if(!d.role){ toastFn('请填写职称','warning'); return; }
        if(!d.modes||!d.modes.length){ toastFn('至少勾选一项可承担的工作','warning'); return; }
        var cmds=(d.cmds||[]).map(function(c){return[String(c[0]||'').trim(),String(c[1]||'').trim()];}).filter(function(c){return c[0];});
        var rec={id:_expertEditId||('my-'+Date.now()),mine:true,k:d.k,name:d.name,role:d.role,by:'我创建的',desc:d.desc,visibility:d.visibility,tags:d.tags,modes:d.modes.slice(),comp:d.comp,cmds:cmds};
        if(_expertEditId) expertStore.updateExpert(_expertEditId,rec); else expertStore.addExpert(rec);
        modalStore.closeModal('expertEdit');
      },
      delete:expertStore.deleteExpert,
      startByChat:function(){}
    },
    team:{
      subscribe:function(fn){ return modalStore.subscribe('team',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('team'); },
      getVersion:function(){ return modalStore.getVersion('team'); },
      close:function(){ modalStore.closeModal('team'); },
      getEditingId:function(){ return _teamEditingId; },
      getInitialData:function(){
        if(!teamDraft) return null;
        return {name:teamDraft.name,desc:teamDraft.desc,visibility:teamDraft.visibility,preset:teamDraft.preset};
      },
      getDraft:function(){
        if(!teamDraft) return null;
        return {name:teamDraft.name,desc:teamDraft.desc,visibility:teamDraft.visibility,leadId:teamDraft.leadId,members:teamDraft.members.slice(),preset:teamDraft.preset,domains:(teamDraft.domains||[]).slice(),gates:teamGates(teamDraft).slice(),cmds:(teamDraft.cmds||[]).map(function(c){return c.slice()})};
      },
      getFlow:teamFlow,
      getCoverage:teamCoverage,
      getWarnings:teamLint,
      getActiveGates:activeGates,
      hasGate:hasGate,
      toggleGate:toggleGate,
      save:function(d){
        var name=(d.name||'').trim();
        if(!name){ toastFn('请填写专家团名称','warning'); return; }
        if(!d.members||!d.members.length){ toastFn('至少需要一位成员','warning'); return; }
        teamDraft.name=name; teamDraft.desc=d.desc||''; teamDraft.visibility=d.visibility||'workspace';
        teamDraft.leadId=d.leadId; teamDraft.members=d.members.slice();
        if(d.preset||!_teamEditingId){
          var nid='team-'+Date.now();
          expertStore.saveTeam({id:nid,preset:false,name:d.preset?name+' 副本':name,by:'我创建的',desc:d.desc,visibility:d.visibility,domains:(d.domains||[]).slice(),gates:teamGates(d).slice(),leadId:d.leadId,members:d.members.slice(),cmds:teamCmdList(d)});
        }else{
          var t=teamById(_teamEditingId);
          if(t){ t.name=name; t.desc=d.desc; t.visibility=d.visibility; t.leadId=d.leadId; t.members=d.members.slice(); t.cmds=teamCmdList(d); t.domains=(d.domains||[]).slice(); t.gates=teamGates(d).slice(); expertStore.saveTeam(t); }
        }
        modalStore.closeModal('team');
      },
      delete:function(id){ expertStore.deleteTeam(id); modalStore.closeModal('team'); },
      callTeam:function(id){ modalStore.closeModal('team'); },
      callTeamWithCmd:function(id,cmd){ modalStore.closeModal('team'); },
      getExpert:function(id){ return expertStore.sanitizeExpert(expertStore.getEx()[id]); },
      getAvatar:xav,
      openMemberPicker:function(){ modalStore.openModal('member','member-picker'); },
      setLead:function(id){ if(teamDraft){ teamDraft.leadId=id; modalStore.touch('team'); } },
      removeMember:function(id){ if(!teamDraft) return; teamDraft.members=teamDraft.members.filter(function(m){return m!==id;}); if(teamDraft.leadId===id) teamDraft.leadId=teamDraft.members[0]||null; modalStore.touch('team'); },
      addCmd:function(){ if(teamDraft){ teamDraft.cmds.push(['','']); modalStore.touch('team'); } },
      removeCmd:function(i){ if(!teamDraft) return; teamDraft.cmds.splice(i,1); if(!teamDraft.cmds.length) teamDraft.cmds.push(['','']); modalStore.touch('team'); },
      updateCmd:function(i,f,val){ if(teamDraft&&teamDraft.cmds[i]) teamDraft.cmds[i][f]=val; }
    },
    member:{
      subscribe:function(fn){ return modalStore.subscribe('member',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('member'); },
      close:function(){ modalStore.closeModal('member'); },
      getMembers:function(kw){
        if(!teamDraft) return [];
        kw=(kw||'').trim().toLowerCase();
        var wsOnly=teamDraft.visibility!=='private';
        return expertStore.getExperts().filter(function(e){
          if(wsOnly&&e.visibility==='private'&&teamDraft.members.indexOf(e.id)<0) return false;
          return !kw||(e.name+e.role+e.desc+e.tags.join()).toLowerCase().indexOf(kw)>=0;
        }).map(function(e){ return {id:e.id,k:e.k,name:e.name,desc:e.desc,ro:e.ro,modes:e.modes.slice(),isMember:teamDraft.members.indexOf(e.id)>=0}; });
      },
      toggleMember:function(id){
        if(!teamDraft) return;
        var i=teamDraft.members.indexOf(id);
        if(i<0){ teamDraft.members.push(id); if(!teamDraft.leadId) teamDraft.leadId=id; }
        else { teamDraft.members.splice(i,1); if(teamDraft.leadId===id) teamDraft.leadId=teamDraft.members[0]||null; }
        modalStore.touch('team');
      },
      getAvatar:xav
    },
    /* ERP 环境 — 转发到 env-store + modal-store */
    env:{
      subscribe:function(fn){ return modalStore.subscribe('env',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('env'); },
      getVersion:function(){ return modalStore.getVersion('env'); },
      touch:function(){ modalStore.touch('env'); },
      close:function(){ modalStore.closeModal('env'); },
      getMode:function(){ return envMode; },
      getInitialData:_getEnvInitialData,
      getDataCenters:function(){ return ENV_DATA_CENTERS; },
      save:_saveEnvFromReact,
      testConnection:function(){ toastFn('连接测试通过'); },
      toggleNormalAuth:function(){ envNormalAuthEnabled=!envNormalAuthEnabled; modalStore.touch('env'); },
      disconnect:function(){ _envDisconnectIndex=envEditIndex; modalStore.openModal('envDisconnect','env-disconnect'); },
      reauth:function(){ startAuthorize(envEditIndex, envEditIndex>=0&&ENV_ITEMS[envEditIndex]?ENV_ITEMS[envEditIndex].name:''); },
      getList:_envGetList,
      getListVersion:function(){ return _envListVersion; },
      deleteItem:_envDeleteItem,
      setDefault:_envSetDefault,
      testItem:_envTestConnection,
      copyUrl:_envCopyUrl,
      openModal:openEnvModal
    },
    envAuthorize:{
      subscribe:function(fn){ return modalStore.subscribe('envAuthorize',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('envAuthorize'); },
      close:closeAuthorize,
      retry:_retryAuthorize
    },
    consent:{
      subscribe:function(fn){ return modalStore.subscribe('consent',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('consent'); },
      close:function(){ modalStore.closeModal('consent'); },
      getStep:_getConsentStep,
      getDataCenters:function(){ return ENV_DATA_CENTERS; },
      getScopeList:function(){ return ERP_API_SCOPES; },
      login:_consentLogin,
      allow:_consentAllow,
      deny:_consentDeny,
      switchAccount:_consentSwitchAccount
    },
    envDisconnect:{
      subscribe:function(fn){ return modalStore.subscribe('envDisconnect',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('envDisconnect'); },
      close:closeDisconnect,
      getEnvName:function(){ return envDisconnectName; },
      confirm:_confirmDisconnect
    },
    envAuthConfirm:{
      subscribe:function(fn){ return modalStore.subscribe('envAuthConfirm',fn); },
      getOpenModal:function(){ return modalStore.getOpenModal('envAuthConfirm'); },
      close:_closeAuthConfirm,
      confirm:_confirmAuthConfirm
    },
    /* composer + chat — 转发到 chat-store + expert-store */
    composer:{
      send:function(text){
        if(!text||!text.trim()) return;
        var t=text.trim();
        showView('chat');
        chatStore.addUserMessage(t);
        chatStore.simulateResponse();
      },
      getMode:function(){ return ''; },
      setMode:function(mode){ applyMode(mode,true); },
      getExpert:function(){ return expertStore.getActivePick(); },
      clearExpert:function(){ expertStore.clearPick(); },
      openFilePicker:openFilePicker,
      getModes:function(){ return ['苍穹应用','通用应用','业务组件','技能开发','智能体开发','原型探索']; }
    },
    chat:{
      subscribe:function(fn){ return chatStore.subscribe(fn); },
      getMessages:function(){ return chatStore.getMessages(); },
      getVersion:function(){ return chatStore.getVersion(); },
      touch:chatStore.notify||function(){},
      clear:function(){ chatStore.clear(); },
      getTitle:function(){ return chatStore.getTitle(); },
      setTitle:function(t){ chatStore.setTitle(t); }
    }
  }

})();
