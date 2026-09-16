import billTemplate from '../artifacts/purchase-order.html?raw';
import tokensCss from '../styles/tokens.css?raw';
import { EXPERT_AV, AV_KEYS, WORK_MODES } from '../data/expert-data';
import { EXPERTS } from '../data/experts';
import { ENV_DATA_CENTERS, ERP_API_SCOPES } from '../data/environments';
import { CV_PROJECTS, CV_TASKS, CV_REVIEWS, CV_MEMBERS } from '../data/collab';
import { changelogData, changelogIcons } from '../data/changelog';
import { fullAppData } from '../data/apps-data';
import * as expertStore from '../stores/expert-store';
import * as envStore from '../stores/env-store';
import * as chatStore from '../stores/chat-store';
import * as modalStore from '../stores/modal-store';
import { xav, blankExpert } from '../lib/utils';
import { teamFlow, teamCoverage, teamLint, teamGates, hasGate, toggleGate, activeGates, teamById, teamCmdList } from '../lib/team-logic';
import { toast as toastFn } from '../lib/toast';

/* 产物预览与应用共用同一份设计令牌 */
const billTemplateWithTokens = billTemplate.replace(
  '/* 令牌由 tokens.css 注入 */',
  tokensCss.replace(/\/\*[\s\S]*?\*\//g, '').trim()
);

/* main.js — 从 ~6500 行精简到 ~200 行。
   所有数据在 src/data/，业务逻辑在 src/lib/，运行时状态在 src/stores/。
   这里只保留：视图切换、侧边栏高亮、URL 解析、全局快捷键、bridge 设置。 */
(function(){
  var $=function(s,el){return (el||document).querySelector(s)};
  var $$=function(s,el){return Array.prototype.slice.call((el||document).querySelectorAll(s))};

  /* bridge 状态变量 */
  var _expertViewingId=null, _expertEditId=null, _teamEditingId=null;
  var teamDraft=null, envMode='create', envEditIndex=-1, envNormalAuthEnabled=false;
  var envDisconnectIndex=-1, envDisconnectName='', envAuthorizeIndex=-1, envAuthorizeName='';
  var envAuthorizeDc='', erpBrowserSession=null;
  var _envListVersion=0;
  var ENV_ITEMS=envStore.getList().map(function(e){delete e.index;return e;});

  /* 视图切换 — 所有视图都是 React 视图 */
  var viewReact=$('#react-view-root');
  var navItems=$$('.sb-scroll .nav-item');
  function setNavActive(name){
    navItems.forEach(function(n){ n.classList.toggle('active', n.textContent.trim()===name); });
  }
  function setUrlState(path,notifyReactRouter){
    try{history.replaceState(null,'',path);localStorage.setItem('lingeeUrlState',path)}catch(e){}
    if(notifyReactRouter){ try{ window.dispatchEvent(new PopStateEvent('popstate')); }catch(e){} }
  }
  function showView(which){
    if(viewReact) viewReact.classList.remove('hidden');
    var sb=$('.sidebar'); if(sb) sb.classList.toggle('hidden', which==='design');
    setUrlState('/'+which,true);
  }

  /* 全局快捷键 */
  var _shortcutBridge=modalStore;
  function openShortcut(){ modalStore.openModal('shortcut','shortcut'); }
  function closeShortcut(){ modalStore.closeModal('shortcut'); }
  document.addEventListener('keydown',function(e){
    var mod=e.metaKey||e.ctrlKey, key=(e.key||'').toLowerCase();
    if(mod && key==='/'){ e.preventDefault(); openShortcut(); return; }
    if(mod && key==='n' && !e.shiftKey){ e.preventDefault(); showView('newtask'); setNavActive('新会话'); return; }
    if(key==='escape' && !mod && !e.shiftKey && !e.altKey){
      var ns=['shortcut','newapp','expert','expertEdit','team','member','env','envAuthorize','consent','envDisconnect','envAuthConfirm'];
      for(var i=0;i<ns.length;i++){ if(modalStore.getOpenModal(ns[i])){ modalStore.closeModal(ns[i]); return; } }
    }
  });

  /* URL 解析 — React Router 处理路由，这里只做侧边栏高亮 */
  var _pathParts=location.pathname.replace(/^\/+|\/+$/g,'').split('/');
  var _viewParam=_pathParts[0]||'';
  if(!_viewParam){ var _old=new URLSearchParams(location.search).get('view'); if(_old) _viewParam=_old; }
  if(_viewParam==='experts') _viewParam='collab';
  if(_viewParam){
    showView(_viewParam);
    if(_viewParam==='newtask'||_viewParam==='chat') setNavActive('新会话');
    else if(_viewParam==='apps') setNavActive('应用开发');
    else if(_viewParam==='skills') setNavActive('技能开发');
    else if(_viewParam==='agents') setNavActive('智能体开发');
    else if(_viewParam==='collab') setNavActive('协作开发');
  }else{
    showView('newtask'); setNavActive('新会话');
  }

  /* CV modal 状态（协作开发 7 个弹窗） */
  var _cvModalState={name:null}, _cvModalListeners=[];
  function _cvModalNotify(){ _cvModalListeners.slice().forEach(function(fn){ try{fn(_cvModalState);}catch(e){} }); }
  function _cvModalOpen(name){ _cvModalState={name:name}; _cvModalNotify(); }
  function _cvModalClose(name){ if(!name||_cvModalState.name===name){ _cvModalState={name:null}; _cvModalNotify(); } }
  function _cvModalSubscribe(fn){ _cvModalListeners.push(fn); return function(){ var i=_cvModalListeners.indexOf(fn); if(i>=0)_cvModalListeners.splice(i,1); }; }

  /* ---------- React 集成桥 ---------- */
  window.__lingeeBridge={
    toast:toastFn, showView:showView, setNavActive:setNavActive,
    openAppCardChat:function(){}, startNewTaskWithMode:function(){},
    collab:{
      subscribe:_cvModalSubscribe, getOpenModal:function(){return _cvModalState.name;},
      closeSync:function(){_cvModalClose('sync');}, saveSyncTask:function(){}, startSyncTask:function(){},
      closeTaskModal:function(name){_cvModalClose(name);}, getMembers:function(){return [];},
      getReviewCandidates:function(){return [];}, getWorkflowState:function(){return{steps:[],nextLabel:''};},
      getDefaultArtifacts:function(){return [];}, confirmExec:function(){}, confirmTransfer:function(){},
      confirmTwist:function(){_cvModalClose('cv-twist-overlay');toastFn('任务已扭转','info');},
      confirmReview:function(){}, closeAddMember:function(){_cvModalClose('addmember');},
      findThirdPartyMembers:function(){return [];}, confirmAddMembers:function(){},
      closeNewProject:function(){_cvModalClose('newproject');},
      getProjectStatusOptions:function(){return[{id:'active',label:'进行中'},{id:'done',label:'已完成'}];},
      getProjectOwnerOptions:function(){return [];}, confirmNewProject:function(){},
      getTasks:function(){return CV_TASKS;}, getReviews:function(){return CV_REVIEWS;},
      getMembers:function(){return CV_MEMBERS;}, getProjects:function(){return CV_PROJECTS;},
      getExperts:function(){return expertStore.getExperts().map(expertStore.sanitizeExpert);},
      getTeams:function(){return expertStore.getTeams();},
      openTaskModal:function(){_cvModalOpen('sync');},
      openTeamModal:function(id){modalStore.openModal('team','team-config');_teamEditingId=id||null;},
      openExpertEditor:function(id){modalStore.openModal('expertEdit','expert-edit');_expertEditId=id||null;},
      openExpertModal:function(id){_expertViewingId=id;modalStore.openModal('expert','expert-detail');},
      summon:function(){}
    },
    shortcut:{subscribe:function(fn){return modalStore.subscribe('shortcut',fn);},getOpenModal:function(){return modalStore.getOpenModal('shortcut');},close:closeShortcut},
    newApp:{subscribe:function(fn){return modalStore.subscribe('newApp',fn);},getOpenModal:function(){return modalStore.getOpenModal('newApp');},close:function(){modalStore.closeModal('newApp');},getAppOptions:function(){return fullAppData.map(function(d){return{value:d.app,label:d.app+'（'+d.cloud+'）'};});},confirm:function(){}},
    expert:{
      subscribe:function(fn){return modalStore.subscribe('expert',fn);},getOpenModal:function(){return modalStore.getOpenModal('expert');},
      close:function(){modalStore.closeModal('expert');_expertViewingId=null;},getExpertId:function(){return _expertViewingId;},
      getExpert:function(id){return expertStore.sanitizeExpert(expertStore.getEx()[id]);},getAvatar:xav,
      callExpert:function(id,cmd){modalStore.closeModal('expert');},editExpert:function(id){modalStore.closeModal('expert');_expertEditId=id;modalStore.openModal('expertEdit','expert-edit');},
      deleteExpert:expertStore.deleteExpert,viewExpert:function(id){_expertViewingId=id;modalStore.openModal('expert','expert-detail');}
    },
    expertEdit:{
      subscribe:function(fn){return modalStore.subscribe('expertEdit',fn);},getOpenModal:function(){return modalStore.getOpenModal('expertEdit');},
      close:function(){modalStore.closeModal('expertEdit');},getEditingId:function(){return _expertEditId;},
      getInitialData:function(){var e=_expertEditId?expertStore.getEx()[_expertEditId]:null;var ed=(e&&e.mine)?_expertEditId:null;var d=ed?{k:e.k,name:e.name,role:e.role,desc:e.desc,visibility:e.visibility==='private'?'private':'workspace',tags:e.tags.slice(),modes:e.modes.slice(),comp:e.comp.slice(),cmds:e.cmds.length?e.cmds.map(function(c){return c.slice()}):[['','']]}:blankExpert();return{draft:d,editingId:ed,title:ed?'编辑专家':'创建专家'};},
      getAvatars:function(){return AV_KEYS;},getWorkModes:function(){return WORK_MODES;},getAvatar:xav,
      save:function(d){if(!d.name){toastFn('请填写专家名称','warning');return;}if(!d.role){toastFn('请填写职称','warning');return;}if(!d.modes||!d.modes.length){toastFn('至少勾选一项','warning');return;}var cmds=(d.cmds||[]).map(function(c){return[String(c[0]||'').trim(),String(c[1]||'').trim()];}).filter(function(c){return c[0];});var rec={id:_expertEditId||('my-'+Date.now()),mine:true,k:d.k,name:d.name,role:d.role,by:'我创建的',desc:d.desc,visibility:d.visibility,tags:d.tags,modes:d.modes.slice(),comp:d.comp,cmds:cmds};if(_expertEditId)expertStore.updateExpert(_expertEditId,rec);else expertStore.addExpert(rec);modalStore.closeModal('expertEdit');},
      delete:expertStore.deleteExpert,startByChat:function(){}
    },
    team:{
      subscribe:function(fn){return modalStore.subscribe('team',fn);},getOpenModal:function(){return modalStore.getOpenModal('team');},getVersion:function(){return modalStore.getVersion('team');},
      close:function(){modalStore.closeModal('team');},getEditingId:function(){return _teamEditingId;},
      getInitialData:function(){if(!teamDraft)return null;return{name:teamDraft.name,desc:teamDraft.desc,visibility:teamDraft.visibility,preset:teamDraft.preset};},
      getDraft:function(){if(!teamDraft)return null;return{name:teamDraft.name,desc:teamDraft.desc,visibility:teamDraft.visibility,leadId:teamDraft.leadId,members:teamDraft.members.slice(),preset:teamDraft.preset,domains:(teamDraft.domains||[]).slice(),gates:teamGates(teamDraft).slice(),cmds:(teamDraft.cmds||[]).map(function(c){return c.slice()})};},
      getFlow:teamFlow,getCoverage:teamCoverage,getWarnings:teamLint,getActiveGates:activeGates,hasGate:hasGate,toggleGate:toggleGate,
      save:function(d){var name=(d.name||'').trim();if(!name){toastFn('请填写专家团名称','warning');return;}if(!d.members||!d.members.length){toastFn('至少需要一位成员','warning');return;}teamDraft.name=name;teamDraft.desc=d.desc||'';teamDraft.visibility=d.visibility||'workspace';teamDraft.leadId=d.leadId;teamDraft.members=d.members.slice();if(d.preset||!_teamEditingId){var nid='team-'+Date.now();expertStore.saveTeam({id:nid,preset:false,name:d.preset?name+' 副本':name,by:'我创建的',desc:d.desc,visibility:d.visibility,domains:(d.domains||[]).slice(),gates:teamGates(d).slice(),leadId:d.leadId,members:d.members.slice(),cmds:teamCmdList(d)});}else{var t=teamById(_teamEditingId);if(t){t.name=name;t.desc=d.desc;t.visibility=d.visibility;t.leadId=d.leadId;t.members=d.members.slice();t.cmds=teamCmdList(d);t.domains=(d.domains||[]).slice();t.gates=teamGates(d).slice();expertStore.saveTeam(t);}}modalStore.closeModal('team');},
      delete:function(id){expertStore.deleteTeam(id);modalStore.closeModal('team');},callTeam:function(id){modalStore.closeModal('team');},callTeamWithCmd:function(id,cmd){modalStore.closeModal('team');},
      getExpert:function(id){return expertStore.sanitizeExpert(expertStore.getEx()[id]);},getAvatar:xav,
      openMemberPicker:function(){modalStore.openModal('member','member-picker');},
      setLead:function(id){if(teamDraft){teamDraft.leadId=id;modalStore.touch('team');}},
      removeMember:function(id){if(!teamDraft)return;teamDraft.members=teamDraft.members.filter(function(m){return m!==id;});if(teamDraft.leadId===id)teamDraft.leadId=teamDraft.members[0]||null;modalStore.touch('team');},
      addCmd:function(){if(teamDraft){teamDraft.cmds.push(['','']);modalStore.touch('team');}},
      removeCmd:function(i){if(!teamDraft)return;teamDraft.cmds.splice(i,1);if(!teamDraft.cmds.length)teamDraft.cmds.push(['','']);modalStore.touch('team');},
      updateCmd:function(i,f,val){if(teamDraft&&teamDraft.cmds[i])teamDraft.cmds[i][f]=val;}
    },
    member:{
      subscribe:function(fn){return modalStore.subscribe('member',fn);},getOpenModal:function(){return modalStore.getOpenModal('member');},close:function(){modalStore.closeModal('member');},
      getMembers:function(kw){if(!teamDraft)return[];kw=(kw||'').trim().toLowerCase();var wsOnly=teamDraft.visibility!=='private';return expertStore.getExperts().filter(function(e){if(wsOnly&&e.visibility==='private'&&teamDraft.members.indexOf(e.id)<0)return false;return!kw||(e.name+e.role+e.desc+e.tags.join()).toLowerCase().indexOf(kw)>=0;}).map(function(e){return{id:e.id,k:e.k,name:e.name,desc:e.desc,ro:e.ro,modes:e.modes.slice(),isMember:teamDraft.members.indexOf(e.id)>=0};});},
      toggleMember:function(id){if(!teamDraft)return;var i=teamDraft.members.indexOf(id);if(i<0){teamDraft.members.push(id);if(!teamDraft.leadId)teamDraft.leadId=id;}else{teamDraft.members.splice(i,1);if(teamDraft.leadId===id)teamDraft.leadId=teamDraft.members[0]||null;}modalStore.touch('team');},
      getAvatar:xav
    },
    env:{
      subscribe:function(fn){return modalStore.subscribe('env',fn);},getOpenModal:function(){return modalStore.getOpenModal('env');},getVersion:function(){return modalStore.getVersion('env');},touch:function(){modalStore.touch('env');},close:function(){modalStore.closeModal('env');},
      getMode:function(){return envMode;},getInitialData:function(){return{mode:'create',fields:{name:'',url:'',product:'',dataCenter:'',clientId:'',clientSecret:'',gateway:'',proxyUser:'',isDefault:false},connMode:'auth',normalAuthEnabled:true,preset:false,connState:'none'};},
      getDataCenters:function(){return ENV_DATA_CENTERS;},save:function(d){ENV_ITEMS.push(Object.assign({source:'local',normalAccessToken:true,proxyUser:'',envConn:'cred',isDefault:false},d));_envListVersion++;},
      testConnection:function(){toastFn('连接测试通过');},toggleNormalAuth:function(){envNormalAuthEnabled=!envNormalAuthEnabled;modalStore.touch('env');},
      disconnect:function(){modalStore.openModal('envDisconnect','env-disconnect');},reauth:function(){modalStore.openModal('envAuthorize','env-authorize');},
      getList:function(){return ENV_ITEMS.map(function(e,i){return Object.assign({index:i},e);});},getListVersion:function(){return _envListVersion;},
      deleteItem:function(i){if(i>=0&&i<ENV_ITEMS.length){ENV_ITEMS.splice(i,1);_envListVersion++;}},setDefault:function(i){ENV_ITEMS.forEach(function(e,j){e.isDefault=(j===i);});_envListVersion++;},
      testItem:function(i){var e=ENV_ITEMS[i];if(!e)return;e._testing=true;_envListVersion++;setTimeout(function(){e._testing=false;e._testResult='连通正常 '+(60+Math.floor(Math.random()*180))+'ms';_envListVersion++;if(window.__lingeeBridge&&window.__lingeeBridge.env)window.__lingeeBridge.env.touch();},700);},
      copyUrl:function(i){return ENV_ITEMS[i]?ENV_ITEMS[i].url:'';},openModal:function(mode,index){envMode=mode||'create';envEditIndex=index>=0?index:-1;modalStore.openModal('env','env-config');}
    },
    envAuthorize:{subscribe:function(fn){return modalStore.subscribe('envAuthorize',fn);},getOpenModal:function(){return modalStore.getOpenModal('envAuthorize');},close:function(){modalStore.closeModal('envAuthorize');},retry:function(){modalStore.openModal('envAuthorize','env-authorize');}},
    consent:{subscribe:function(fn){return modalStore.subscribe('consent',fn);},getOpenModal:function(){return modalStore.getOpenModal('consent');},close:function(){modalStore.closeModal('consent');},getStep:function(){return 'login';},getDataCenters:function(){return ENV_DATA_CENTERS;},getScopeList:function(){return ERP_API_SCOPES;},login:function(){modalStore.closeModal('consent');modalStore.openModal('consent','consent');},allow:function(){modalStore.closeModal('consent');modalStore.closeModal('envAuthorize');modalStore.closeModal('env');toastFn('已连接');},deny:function(){modalStore.closeModal('consent');modalStore.closeModal('envAuthorize');modalStore.closeModal('env');toastFn('已保存（未授权）');},switchAccount:function(){modalStore.closeModal('consent');modalStore.openModal('consent','consent');}},
    envDisconnect:{subscribe:function(fn){return modalStore.subscribe('envDisconnect',fn);},getOpenModal:function(){return modalStore.getOpenModal('envDisconnect');},close:function(){modalStore.closeModal('envDisconnect');},getEnvName:function(){return envDisconnectName;},confirm:function(){modalStore.closeModal('envDisconnect');modalStore.closeModal('env');}},
    envAuthConfirm:{subscribe:function(fn){return modalStore.subscribe('envAuthConfirm',fn);},getOpenModal:function(){return modalStore.getOpenModal('envAuthConfirm');},close:function(){modalStore.closeModal('envAuthConfirm');},confirm:function(){modalStore.closeModal('envAuthConfirm');envNormalAuthEnabled=true;modalStore.touch('env');}},
    composer:{send:function(text){if(!text||!text.trim())return;showView('chat');chatStore.addUserMessage(text.trim());chatStore.simulateResponse();},getMode:function(){return'';},setMode:function(){},getExpert:function(){return expertStore.getActivePick();},clearExpert:function(){expertStore.clearPick();},openFilePicker:function(){toastFn('文件选择器');},getModes:function(){return['苍穹应用','通用应用','业务组件','技能开发','智能体开发','原型探索'];}},
    chat:{subscribe:function(fn){return chatStore.subscribe(fn);},getMessages:function(){return chatStore.getMessages();},getVersion:function(){return chatStore.getVersion();},touch:function(){},clear:function(){chatStore.clear();},getTitle:function(){return chatStore.getTitle();},setTitle:function(t){chatStore.setTitle(t);}}
  };
})();
