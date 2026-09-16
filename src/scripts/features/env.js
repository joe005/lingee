import { $, $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
/* ERP 环境配置：新增 / 连接方式 / 授权流程 / 断开连接（共享 envMode、envEditItem 等状态，不宜再拆）
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 设置页：环境配置 ---------- */
/* 环境项操作菜单 */
function closeEnvMenus(except){
  $$('.env-more-wrap.open').forEach(function(w){ if(w!==except) w.classList.remove('open'); });
}
function bindEnvMore(btn){
  var wrap=btn.closest('.env-more-wrap');
  var item=btn.closest('.env-item');
  var isCloud=item.dataset.envSource==='cloud'||!!item.querySelector('.env-tag.cloud');
  var primaryMode=isCloud?'view':'edit';
  var primaryLabel=isCloud?'查看':'编辑';
  var main=item.querySelector('.env-main');
  if(main&&!main.hasAttribute('data-edit-bound')){
    main.setAttribute('data-edit-bound','true');
    main.setAttribute('role','button');
    main.setAttribute('tabindex','0');
    main.setAttribute('aria-label',primaryLabel+'环境 '+item.querySelector('.env-name').textContent);
    main.addEventListener('click',function(){ openEnvModal(primaryMode,item); });
    main.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openEnvModal(primaryMode,item); }
    });
  }
  var editMenu=$('.env-mi[data-act="edit"]',wrap);
  if(editMenu&&isCloud){ editMenu.setAttribute('data-act','view'); editMenu.textContent='查看'; }
  btn.addEventListener('click',function(e){
    e.stopPropagation();
    var open=!wrap.classList.contains('open');
    closeEnvMenus(wrap);
    wrap.classList.toggle('open',open);
    btn.setAttribute('aria-expanded',open?'true':'false');
  });
  $$('.env-mi',wrap).forEach(function(mi){
    mi.addEventListener('click',function(e){
      e.stopPropagation();
      wrap.classList.remove('open');
      var name=item.querySelector('.env-name').textContent;
      var act=mi.getAttribute('data-act');
      if(act==='test'){
        runEnvTest(item);
      }else if(act==='copy'){
        var url=item.querySelector('.env-url').textContent;
        if(navigator.clipboard) navigator.clipboard.writeText(url);
        toast('已复制地址：'+url);
      }else if(act==='default'){
        $$('.env-tag.def').forEach(function(t){t.remove()});
        var head=item.querySelector('.env-head');
        var tag=document.createElement('span');
        tag.className='env-tag def'; tag.textContent='默认';
        head.insertBefore(tag, head.querySelector('.env-tag'));
        toast('已设为默认：'+name);
      }else if(act==='delete'){
        item.remove();
        toast('已删除：'+name);
      }else if(act==='edit'){
        openEnvModal('edit',item);
      }else if(act==='view'){
        openEnvModal('view',item);
      }
    });
  });
}
/* 连通性测试：原型内以模拟延迟与结果呈现 */
function runEnvTest(item){
  var name=item.querySelector('.env-name').textContent;
  var head=item.querySelector('.env-head');
  var old=head.querySelector('.env-status');
  if(old) old.remove();
  var badge=document.createElement('span');
  badge.className='env-status testing';
  badge.innerHTML='<span class="env-spinner"></span>连通中';
  head.appendChild(badge);
  setTimeout(function(){
    badge.className='env-status ok';
    badge.textContent='连通正常 '+(60+Math.floor(Math.random()*180))+'ms';
    toast(name+'：连通正常');
  },700+Math.random()*600);
}
/* 列表不展示认证状态标签：是否启用普通 AccessToken 在表单内已有明确表达，
   列表再挂一枚红标只是噪音。这里只负责清掉演示数据里遗留的标签。 */
function syncAuthTag(item){
  var tag=item.querySelector('.env-tag.legacy-auth');
  if(tag) tag.remove();
}
/* 列表只保留 默认 / 本地-云端 两类标签：产品类型在表单里已有「环境类型」字段，
   列表再挂一枚彩色标签只是噪音 */
function syncProductTag(item,product){
  var tag=item.querySelector('.env-tag.product');
  if(tag) tag.remove();
}
var demoGatewayByName={
  'scm-dev':'acgw-scm-dev',
  'hr-sit':'acgw-hr-sit',
  'legacy-v79':'acgw-legacy-v79'
};
function hydrateEnvItem(item,index){
  var sourceTag=item.querySelector('.env-tag.local,.env-tag.cloud');
  /* 列表行不展示具体版本，适用版本在页面标题区统一说明 */
  var versionTag=item.querySelector('.env-ver');
  if(versionTag) versionTag.remove();
  var name=item.querySelector('.env-name').textContent.trim().toLowerCase();
  /* 演示数据模拟历史记录只有网关标识、没有产品类型的情况 */
  if(!item.hasAttribute('data-env-gateway')&&demoGatewayByName[name]) item.dataset.envGateway=demoGatewayByName[name];
  var existingProductTag=item.querySelector('.env-tag.product');
  var product=item.dataset.envProduct
    ||(existingProductTag&&existingProductTag.classList.contains('XK')?'XK':'')
    ||((item.dataset.envGateway||'').trim()?'XK':'XH');
  item.dataset.envProduct=product;
  item.dataset.envSource=item.dataset.envSource||(sourceTag&&sourceTag.classList.contains('cloud')?'cloud':'local');
  item.dataset.envDataCenter=item.dataset.envDataCenter||(index%2?'1288162917259':'1561691182942805271');
  item.dataset.envClientId=item.dataset.envClientId||('lingee-build-'+name);
  /* 演示数据：legacy 开头的环境模拟尚未启用普通 AccessToken 认证的历史配置 */
  var normalAuth=item.hasAttribute('data-normal-access-token')
    ?item.dataset.normalAccessToken==='true'
    :name.indexOf('legacy')===-1;
  item.dataset.normalAccessToken=normalAuth?'true':'false';
  if(!normalAuth) item.dataset.proxyUser=item.dataset.proxyUser||'erp-openapi-agent';
  /* 演示数据：外网地址的环境已迁到授权连接，fi-uat 模拟授权失效；
     内网地址（hr-sit / legacy-v79）对应老版本苍穹，保持应用凭证 */
  if(!item.dataset.envConn){
    var cloudIssued=item.dataset.envSource==='cloud';
    item.dataset.envConn=(!cloudIssued&&(name==='scm-dev'||name==='fi-uat'))?'auth':'cred';
  }
  if(item.dataset.envConn==='auth'&&!item.dataset.grantedBy){
    item.dataset.grantedBy='吴**超';
    item.dataset.grantedAt=name==='fi-uat'?'08-27':'09-01';
    item.dataset.lastUsed=name==='fi-uat'?'08-28 16:40':'今天 14:32';
    if(name==='fi-uat') item.dataset.grantState='expired';
  }
  syncProductTag(item,product);
  syncAuthTag(item);
  syncConnTag(item);
}

/* 列表行：连接方式标签 + 授权归属副行。凭证模式不显示授权人，
   因为那种模式下令牌绑的是配置里写死的代理用户，跟实际使用者无关 */
function syncConnTag(item){
  var head=item.querySelector('.env-head');
  var main=item.querySelector('.env-main');
  if(!head||!main) return;
  item.querySelectorAll('.env-tag.conn').forEach(function(t){ t.remove(); });
  var oldSub=main.querySelector('.env-sub'); if(oldSub) oldSub.remove();
  var oldBtn=item.querySelector('.env-inline-btn'); if(oldBtn) oldBtn.remove();
  var isAuth=item.dataset.envConn==='auth';
  var state=item.dataset.grantState||'';
  var pending=state==='expired'||state==='revoked'||state==='none';
  var tag=document.createElement('span');
  /* 一行只挂一枚连接方式标签：同一环境同时只启用一种 */
  tag.className='env-tag conn '+(isAuth?(pending?'reauth':'auth'):'cred');
  tag.textContent=isAuth?(pending?(state==='expired'?'授权已失效':'未授权'):'OAuth 授权'):'第三方应用';
  head.appendChild(tag);
  item.classList.toggle('needs-reauth',isAuth&&pending);
  if(isAuth){
    var sub=document.createElement('div');
    sub.className='env-sub'+(pending?' warn':'');
    sub.textContent=state==='none'
      ? '配置已保存，还没有完成授权'
      : (state==='revoked'
          ? '已断开连接，重新授权后可以继续使用'
          : (state==='expired'
              ? '授权已失效，可能是被撤销或长期未使用'
              : '授权人 '+(item.dataset.grantedBy||'')+' · '+(item.dataset.grantedAt||'')+' 授权 · '+(item.dataset.lastUsed||'')+' 使用'));
    main.appendChild(sub);
  }
  if(isAuth&&pending){
    var btn=document.createElement('button');
    btn.className='env-inline-btn';
    btn.type='button';
    btn.textContent=state==='none'?'去授权':'重新授权';
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      startAuthorize(item,item.querySelector('.env-name').textContent.trim());
    });
    item.insertBefore(btn,item.querySelector('.env-more-wrap'));
  }
}

var envModal=$('#envModal');
var envConfigForm=$('#envConfigForm');
var envProductSelect=$('#envProduct');
var envMode='create';
var envEditItem=null;
var envProduct='';
var envOriginalProduct='';
var envMaskedValue='********';
var envNormalAuthEnabled=false;
/* ---------- 连接方式：授权连接 / 应用凭证 ---------- */
/* 演示用探测：内网地址、非标端口、legacy 命名视作老版本苍穹，落回应用凭证。
   真实实现是探测 {url}/.well-known/oauth-authorization-server，
   404 / 非 JSON / 超时一律判定不支持，静默回落，不报错。 */
function probeAuthSupport(url){
  var u=(url||'').toLowerCase();
  if(!u) return false;
  if(/legacy|192\.168\.|172\.\d+\.|10\.\d+\.|:8080|:8081/.test(u)) return false;
  return true;
}
var envConnMode='cred';
var envConnSupported=false;
var envConnBlocked='';        /* 非空表示 OAuth 授权不可选，内容是原因 */
var envProbeTimer=null;

/* OAuth 授权要在本机浏览器里逐人确认，老版本苍穹没有这套端点。
   云端下发的配置由企业管理中心统一维护，本机连选都不用选，走的是只读展示那条路。 */
function connBlockedReason(){
  return envConnSupported ? '' : '该环境的苍穹版本不支持 OAuth 授权，请在「OpenAPI 第三方应用」中创建应用后填写凭证。';
}

function setConnNote(text,warn,spin){
  var note=$('#envConnNote'); if(!note) return;
  note.className='env-conn-note'+(warn?' warn':'');
  note.innerHTML='';
  if(spin){
    var dot=document.createElement('span');
    dot.className='env-probe-dot';
    note.appendChild(dot);
  }
  if(text){
    var span=document.createElement('span');
    span.textContent=text;
    note.appendChild(span);
  }
}

/* 说明这一行只讲一件事，优先级从高到低：不可选原因 > 已建环境不能改 > 当前选择的前提 */
function syncConnNote(){
  var isAuth=envConnMode==='auth';
  if(envMode!=='create'){
    setConnNote(envEditItem&&envEditItem.dataset.envSource==='cloud'
      ? '该环境由企业管理中心下发，授权类型随下发配置，本机不能改。'
      : '授权类型在新增环境时选定，之后不能修改。要换一种请新增环境。',false,false);
    return;
  }
  if(envConnBlocked){ setConnNote(envConnBlocked,false,false); return; }
  /* OAuth 下方已有三条说明，这里再补一句是重复 */
  setConnNote(isAuth?'':'需要先在 ERP 的「OpenAPI 第三方应用」里创建应用，拿到 ID 和密钥。',false,false);
}

function applyConnMode(mode){
  envConnMode=mode==='auth'?'auth':'cred';
  var isAuth=envConnMode==='auth';
  var creating=envMode==='create';
  /* 已建环境不给切换入口：单选组换成一行只读文字。
     第三方应用连这行都不摆——下面整段「连接凭证」已经把话说完了 */
  var seg=$('#envConnSeg'), cur=$('#envConnCurrent'), sec=$('#envConnSection');
  if(sec&&!creating) sec.classList.toggle('hidden',!isAuth);
  if(seg) seg.classList.toggle('hidden',!creating);
  if(cur) cur.classList.toggle('hidden',creating);
  if(!creating&&cur){
    $('#envConnCurrentName').textContent='OAuth 授权';
    $('#envConnCurrentHint').textContent='在浏览器登录 ERP 并确认授权';
  }
  var tabAuth=$('#envTabAuth'), tabCred=$('#envTabCred');
  if(tabAuth){
    tabAuth.setAttribute('aria-checked',isAuth?'true':'false');
    tabAuth.disabled=!!envConnBlocked;
    tabAuth.querySelector('.env-conn-opt-hint').textContent=
      envConnBlocked?'该环境不支持':'在浏览器登录 ERP 并确认授权';
  }
  if(tabCred) tabCred.setAttribute('aria-checked',isAuth?'false':'true');
  var authPanel=$('#envAuthPanel');
  if(authPanel) authPanel.classList.toggle('hidden',!isAuth);
  var cred=$('#envCredentialSection');
  if(cred) cred.classList.toggle('hidden',isAuth);
  /* 普通 Access Token 区块只对「尚未迁移的历史环境」出现，迁移不可回退，
     已启用的环境再摆一个开关是误导。新增态与 OAuth 一律不显示。 */
  var legacy=$('#envLegacyAuthSection');
  if(legacy) legacy.classList.toggle('hidden',
    isAuth||creating||!envEditItem||envEditItem.dataset.normalAccessToken!=='false');
  /* 环境类型全链路只用来决定要不要填网关标识，OAuth 没有那个字段，
     后端也不读它（kd-auth 里 x-acgw-identity 有值就注入，跟类型解耦），所以这里不问 */
  var pf=$('#envProductField'); if(pf) pf.classList.toggle('hidden',isAuth);
  var pd=$('#envProduct');
  if(pd){ pd.required=!isAuth; if(isAuth) setEnvFieldError(pd,''); }
  /* 数据中心在 ERP 的授权页面里选，授权成功后回填。让用户先在这里选一遍，
     再去授权页面选第二遍，两处不一致时谁说了算又是一笔糊涂账 */
  var dcf=$('#envDataCenterField'); if(dcf) dcf.classList.toggle('hidden',isAuth);
  var dc=$('#envDataCenter');
  if(dc){ dc.required=!isAuth; if(isAuth) setEnvFieldError(dc,''); }
  /* OAuth 不填凭证，凭证相关的校验一并放开 */
  ['#envClientId','#envClientSecret','#envGateway','#envProxyUser'].forEach(function(sel){
    var el=$(sel); if(el){ el.required=!isAuth; if(isAuth) setEnvFieldError(el,''); }
  });
  syncAuthGrant();
  syncConnNote();
  syncEnvFooter();
}

/* 已连接的环境把授权归属摆出来，用户才知道现在这条连接算在谁头上 */
function syncAuthGrant(){
  var grant=$('#envAuthGrant'), points=$('#envAuthPoints');
  if(!grant||!points) return;
  /* 从来没授权成功过的环境没有归属可展示，摆一张全是「—」的卡片没有意义 */
  var saved=envEditItem&&envEditItem.dataset.envConn==='auth'&&envConnMode==='auth'
    &&!!envEditItem.dataset.grantedBy;
  grant.classList.toggle('hidden',!saved);
  points.classList.toggle('hidden',!!saved);
  if(!saved){
    var hidden=$('#envAuthScopeList');
    if(hidden) hidden.classList.add('hidden');
    return;
  }
  $('#envAuthGrantBy').textContent=envEditItem.dataset.grantedBy||'—';
  $('#envAuthGrantDc').textContent=dataCenterLabel(envEditItem.dataset.envDataCenter);
  var st=envEditItem.dataset.grantState;
  $('#envAuthGrantAt').textContent=(envEditItem.dataset.grantedAt||'—')
    +(st==='expired'?'（已失效）':(st==='revoked'?'（已断开）':''));

  var toggle=$('#envAuthScopeToggle');
  if(toggle){
    toggle.textContent=ERP_API_SCOPES.length+' 项 API 权限';
    toggle.setAttribute('aria-expanded','false');
  }
  var list=$('#envAuthScopeList');
  if(list){ list.classList.add('hidden'); renderScopeList(list,ERP_API_SCOPES); }
}

/* 底部按钮随模式与场景切换：授权模式没有「测试连接」，
   连接动作本身就是一次真实验证 */
function syncEnvFooter(){
  var isAuth=envConnMode==='auth';
  var viewing=envMode==='view';
  var creating=envMode==='create';
  var savedAuth=!!(envEditItem&&envEditItem.dataset.envConn==='auth');
  var t=$('#envTest'), c=$('#envModalConfirm'), d=$('#envDisconnect'), r=$('#envReauth');
  var gs=(envEditItem&&envEditItem.dataset.grantState)||'';
  var pending=gs==='expired'||gs==='revoked'||gs==='none';
  var connected=isAuth&&savedAuth&&!creating&&!viewing;
  if(t) t.classList.toggle('hidden',isAuth||viewing);
  if(d) d.classList.toggle('hidden',!(connected&&!pending));
  /* 授权还有效时不摆「重新授权」：那是失效后的补救动作，平时出现只会让人以为出了问题 */
  if(r){
    r.classList.toggle('hidden',!(connected&&pending));
    r.textContent=gs==='none'?'去授权':'重新授权';
  }
  if(c){
    c.textContent=(isAuth&&!savedAuth&&!viewing)?'连接 ERP':'保存';
    c.classList.remove('hidden');
  }
}

/* 数据中心候选必须基于当前地址取，所以它不是一份写死的下拉：
   地址没填之前下拉是空的、禁用的，拉取入口跟着地址走 */
var ENV_DATA_CENTERS=[
  {id:'1561691182942805271',name:'多维联合集团有限公司'},
  {id:'1288162917259',name:'蓝海集团测试数据中心'}
];
var envDcLoading=false;
function dataCenterName(id){
  for(var i=0;i<ENV_DATA_CENTERS.length;i++){
    if(ENV_DATA_CENTERS[i].id===id) return ENV_DATA_CENTERS[i].name;
  }
  return '—';
}
/* 回填的数据中心要连账套号一起显示：光看名字对不上 ERP 里的哪一套 */
function dataCenterLabel(id){
  var name=dataCenterName(id);
  return name==='—'?'—':name+'（'+id+'）';
}
function renderDataCenters(loaded,keep){
  var sel=$('#envDataCenter'); if(!sel) return;
  var want=keep!==undefined?keep:sel.value;
  sel.innerHTML='';
  var ph=document.createElement('option');
  ph.value=''; ph.textContent=envDcLoading?'拉取中...':'请选择数据中心';
  sel.appendChild(ph);
  if(loaded) ENV_DATA_CENTERS.forEach(function(d){
    var o=document.createElement('option');
    o.value=d.id; o.textContent=d.name+'（'+d.id+'）';
    sel.appendChild(o);
  });
  sel.value=loaded?(want||''):'';
  sel.disabled=envMode!=='create'||!loaded;
}
function syncDcRefresh(){
  var btn=$('#envDcRefresh'); if(!btn) return;
  /* 已建环境的地址不能改，数据中心也就没有重新拉的余地 */
  btn.classList.toggle('hidden',envMode!=='create');
  var url=$('#envUrl');
  btn.disabled=envDcLoading||!((url&&url.value||'').trim());
  btn.textContent=envDcLoading?'拉取中...':'重新拉取数据中心';
}
function loadDataCenters(){
  if(envDcLoading) return;
  envDcLoading=true;
  renderDataCenters(false,'');
  syncDcRefresh();
  setTimeout(function(){
    envDcLoading=false;
    renderDataCenters(true,'');
    setEnvFieldError($('#envDataCenter'),'');
    syncDcRefresh();
  },700);
}

function resetConnSection(){
  if(envProbeTimer){ clearTimeout(envProbeTimer); envProbeTimer=null; }
  envConnSupported=false;
  envConnBlocked='';
  var sec=$('#envConnSection'); if(sec) sec.classList.add('hidden');
  var seg=$('#envConnSeg'); if(seg) seg.classList.remove('probing');
  setConnNote('',false,false);
}

/* 地址填完就静默探测。老版本苍穹永远没有这个端点，
   把它说成「检测失败」会让用户以为自己填错了地址 */
function runProbe(url){
  if(envMode!=='create') return;
  if(envProbeTimer) clearTimeout(envProbeTimer);
  var sec=$('#envConnSection'), seg=$('#envConnSeg');
  if(!sec) return;
  sec.classList.remove('hidden');
  if(seg) seg.classList.add('probing');
  setConnNote('正在检测该环境是否支持 OAuth 授权',false,true);
  envProbeTimer=setTimeout(function(){
    envProbeTimer=null;
    envConnSupported=probeAuthSupport(url);
    envConnBlocked=connBlockedReason();
    if(seg) seg.classList.remove('probing');
    /* 探测结果只用来决定 OAuth 能不能选。不支持就退回第三方应用，
       原因由说明行讲；卡片本身已经灰掉，再标一次黄只是重复报警 */
    applyConnMode(envConnBlocked?'cred':envConnMode);
  },900);
}

var envConnSeg=$('#envConnSeg');

/* ---------- 授权流程 ---------- */
var envAuthorizeModal=$('#envAuthorizeModal');
var envAuthorizeTimer=null;
var envAuthorizeTarget=null;   /* 已有环境行，重新授权时用 */
var envAuthorizeName='';
var envAuthorizeDc='';         /* 授权页面选定并回传的数据中心 */
/* 授权申请的 API 清单。来自苍穹的「API 授权清单」，是全局稳定的接口标识，
   授权页面按这份逐条列出让用户确认，回调后原样回填到配置里 */
var ERP_API_SCOPES=[
  {name:'查询采购订单',    path:'/kapi/v2/scm/pm/PurOrder'},
  {name:'保存采购订单',    path:'/kapi/v2/scm/pm/PurOrder/save'},
  {name:'提交审核采购订单', path:'/kapi/v2/scm/pm/PurOrder/submitAndAudit'},
  {name:'查询采购入库单',  path:'/kapi/v2/scm/im/PurInBill'},
  {name:'查询物料',       path:'/kapi/v2/bd/Material'},
  {name:'查询供应商',      path:'/kapi/v2/bd/Supplier'}
];
function renderScopeList(el,items){
  if(!el) return;
  el.innerHTML='';
  items.forEach(function(it){
    var li=document.createElement('li');
    var nm=document.createElement('span');
    nm.className='env-scope-name'; nm.textContent=it.name;
    var pt=document.createElement('span');
    pt.className='env-scope-path'; pt.textContent=it.path; pt.title=it.path;
    li.appendChild(nm); li.appendChild(pt);
    el.appendChild(li);
  });
}

function setAuthorizeState(state){
  ['waiting','failed'].forEach(function(s){
    var el=$('#envAuthorize'+s.charAt(0).toUpperCase()+s.slice(1));
    if(el) el.classList.toggle('hidden',s!==state);
  });
  var alt=$('#envAuthorizeAlt');
  if(alt) alt.textContent=state==='failed'?'重新授权':'没有跳转？重新打开';
}

function startAuthorize(item,name){
  envAuthorizeTarget=item||null;
  envAuthorizeName=name||'新环境';
  if(!envAuthorizeModal) return;
  setAuthorizeState('waiting');
  envAuthorizeModal.classList.add('show');
  if(envAuthorizeTimer) clearTimeout(envAuthorizeTimer);
  /* 演示：0.9 秒后「浏览器打开了授权页」。真实实现是拉起系统浏览器，
     随后等 kingdee-lingee:// 协议回调，5 分钟超时 */
  envAuthorizeTimer=setTimeout(function(){
    envAuthorizeTimer=null;
    openConsent();
  },900);
}

/* ── 浏览器里的两屏：先登录苍穹，再确认授权。
      这两屏都不是客户端界面，用户是离开客户端之后看到它们的 ── */
var erpConsentModal=$('#erpConsentModal');
/* 回调域跟着客户端所在通道走：stable→app.lingee.com，beta→devtest.kingdee.com。
   灵基是公有云，这个域在任何通道下都在客户网络之外，所以授权码必然经过灵基基础设施
   ——整条路成立的前提是苍穹侧强制校验 PKCE，令牌换不走。演示按正式版取值 */
var LINGEE_CALLBACK='https://app.lingee.com/auth/oauth2/callback?client_type=kingdee-lingee';
function erpOrigin(){
  return (($('#envUrl').value||'').trim()||'https://erp.example.com').replace(/\/+$/,'');
}
/* 系统浏览器里的 ERP 登录态。同一台 ERP 已经登录过（自己登的，或者同事那套
   单点登录带进来的），authorize 端点直接渲染同意页，不再要求登录一次。
   这是走系统浏览器换来的：内嵌 webview 有独立 cookie，拿不到这份登录态。 */
var erpBrowserSession=null;   /* {host, user} */
function sameHost(url){
  try{ return !!erpBrowserSession && new URL(url).host===erpBrowserSession.host; }
  catch(e){ return false; }
}
function setConsentStep(step,reused){
  var login=$('#consentLogin'), grant=$('#consentGrant'), addr=$('#consentUrl');
  var onGrant=step==='grant';
  var sso=$('#consentSso');
  if(sso) sso.classList.toggle('hidden',!(onGrant&&reused));
  if(login) login.classList.toggle('hidden',onGrant);
  if(grant) grant.classList.toggle('hidden',!onGrant);
  /* 地址栏跟着走：登录页带 redirect，授权页才是 authorize 端点。
     redirect_uri 用客户端当前通道的 baseURL 回调页（客户端已登录灵基，这个域是已知的），
     它再回跳 kingdee-lingee:// 把授权码交给本机。客户 ERP 白名单里只需登记这一个 URL。 */
  if(addr) addr.textContent=onGrant
    ? erpOrigin()+'/oauth2/authorize?client_id=lingee-build&response_type=code'
      +'&code_challenge=…&code_challenge_method=S256'
      +'&redirect_uri='+encodeURIComponent(LINGEE_CALLBACK)+'&state=…'
    : erpOrigin()+'/login?redirect=%2Foauth2%2Fauthorize%3Fclient_id%3Dlingee-build';
  if(onGrant){
    var id=($('#consentDc')&&$('#consentDc').value)||ENV_DATA_CENTERS[0].id;
    $('#consentDcName').textContent=dataCenterName(id);
    $('#consentScopeCount').textContent=String(ERP_API_SCOPES.length);
    renderScopeList($('#consentScopeList'),ERP_API_SCOPES);
  }
}
function openConsent(){
  if(!erpConsentModal) return;
  var sel=$('#consentDc');
  if(sel){
    sel.innerHTML='';
    ENV_DATA_CENTERS.forEach(function(d){
      var o=document.createElement('option');
      o.value=d.id; o.textContent=d.name+'（'+d.id+'）';
      sel.appendChild(o);
    });
    /* 重新授权沿用原账套，新增默认落在第一个 */
    sel.value=(envAuthorizeTarget&&envAuthorizeTarget.dataset.envDataCenter)||ENV_DATA_CENTERS[0].id;
  }
  setConsentTab('qr');
  var u=$('#consentUser'); if(u) u.value='';
  var pw=$('#consentPwd'); if(pw) pw.value='';
  /* 已有登录态就跳过登录页，只留下授权确认这一步 */
  var reused=sameHost(erpOrigin());
  setConsentStep(reused?'grant':'login',reused);
  erpConsentModal.classList.add('show');
}
function closeConsent(){ if(erpConsentModal) erpConsentModal.classList.remove('show'); }
function setConsentTab(which){
  var qr=which==='qr';
  var tq=$('#consentTabQr'), tp=$('#consentTabPwd');
  if(tq){ tq.classList.toggle('active',qr); tq.setAttribute('aria-selected',qr?'true':'false'); }
  if(tp){ tp.classList.toggle('active',!qr); tp.setAttribute('aria-selected',qr?'false':'true'); }
  var pq=$('#consentQrPane'), pp=$('#consentPwdPane');
  if(pq) pq.classList.toggle('hidden',!qr);
  if(pp) pp.classList.toggle('hidden',qr);
}
var consentTabQr=$('#consentTabQr');
var consentTabPwd=$('#consentTabPwd');
function consentLoggedIn(){
  try{ erpBrowserSession={host:new URL(erpOrigin()).host,user:'吴**超'}; }catch(e){ erpBrowserSession=null; }
  setConsentStep('grant',false);
}
var consentQr=$('#consentQr');
var consentLoginBtn=$('#consentLoginBtn');
var consentSwitch=$('#consentSwitch');

/* 回调落地：授权成功就把配置写全，拒绝就把配置写成「未授权」。
   两种都写：环境名、地址、授权类型是用户已经填好的，因为对方点了拒绝
   就把它们丢掉，等于逼人再填一遍 */
function finishAuthorize(granted){
  envAuthorizeDc=($('#consentDc')&&$('#consentDc').value)||ENV_DATA_CENTERS[0].id;
  closeConsent();
  if(envAuthorizeTarget){
    var t=envAuthorizeTarget;
    t.dataset.envConn='auth';
    if(granted){
      t.dataset.grantState='';
      t.dataset.grantedBy='吴**超';
      t.dataset.grantedAt='今天';
      t.dataset.lastUsed='刚刚';
      t.dataset.envDataCenter=envAuthorizeDc;
    }else{
      t.dataset.grantState=t.dataset.grantedBy?'revoked':'none';
    }
    syncConnTag(t);
  }else{
    addAuthEnvRow(envAuthorizeName,envAuthorizeDc,granted);
  }
  closeAuthorize();
  closeEnvModal();
  toast(granted?('已连接：'+envAuthorizeName):('已保存：'+envAuthorizeName+'（未授权）'));
}
var consentAllow=$('#consentAllow');
var consentDeny=$('#consentDeny');
function closeAuthorize(){
  if(envAuthorizeTimer){ clearTimeout(envAuthorizeTimer); envAuthorizeTimer=null; }
  closeConsent();
  if(envAuthorizeModal) envAuthorizeModal.classList.remove('show');
}

var envAuthorizeAlt=$('#envAuthorizeAlt');
/* ---------- 断开连接 ---------- */
var envDisconnectModal=$('#envDisconnectModal');
var envDisconnectTarget=null;
function openDisconnect(item,name){
  envDisconnectTarget=item||null;
  var n=$('#envDisconnectName'); if(n) n.textContent=name||'该环境';
  if(envDisconnectModal) envDisconnectModal.classList.add('show');
}
function closeDisconnect(){ if(envDisconnectModal) envDisconnectModal.classList.remove('show'); }
var envDisconnectConfirm=$('#envDisconnectConfirm');
/* 认证态以「是否普通 AccessToken 认证」表达：启用后隐藏代理用户，且不可回退 */
function setNormalAuthEnabled(enabled){
  envNormalAuthEnabled=!!enabled;
  /* 「代理用户控制」提示只在走普通 AccessToken 时才该出现：仍用代理用户认证的
     环境反而需要它开着，这时候弹这句话是自相矛盾的。 */
  var createNotice=$('#envCreateNotice');
  if(createNotice) createNotice.classList.toggle('hidden',!envNormalAuthEnabled);
  var authSwitch=$('#envAuthSwitch');
  var authState=$('#envAuthState');
  var authDesc=$('#envAuthDesc');
  var proxyUserField=$('#envProxyUserField');
  var proxyUser=$('#envProxyUser');
  if(authSwitch){
    authSwitch.classList.toggle('on',envNormalAuthEnabled);
    authSwitch.setAttribute('aria-checked',envNormalAuthEnabled?'true':'false');
  }
  if(authState){
    authState.textContent=envNormalAuthEnabled?'已启用':'未启用';
    authState.classList.toggle('enabled',envNormalAuthEnabled);
  }
  if(authDesc) authDesc.textContent=envNormalAuthEnabled
    ?'保存后切换为普通 AccessToken 认证，且不能切回原有认证方式。请先在 ERP 第三方应用中关闭「代理用户控制」。'
    :'该环境仍使用历史认证方式，需要填写代理用户。启用普通 AccessToken 认证后不可恢复。';
  /* 未启用普通 AccessToken 时才需要代理用户 */
  if(proxyUserField) proxyUserField.classList.toggle('hidden',envNormalAuthEnabled);
  if(proxyUser) proxyUser.required=!envNormalAuthEnabled;
}
/* 不可逆二次确认：只拦「未启用 → 启用」方向；保存前关回去无需确认 */
var envAuthConfirmModal=$('#envAuthConfirmModal');
function closeAuthConfirm(){ if(envAuthConfirmModal) envAuthConfirmModal.classList.remove('show'); }
var envAuthSwitch=$('#envAuthSwitch');
var envAuthConfirmOk=$('#envAuthConfirmOk');
function setEnvProduct(product){
  envProduct=product;
  if(envProductSelect&&envProductSelect.value!==product) envProductSelect.value=product;
  var gatewayField=$('#envGatewayField');
  var gateway=$('#envGateway');
  var needsGateway=product==='XK';
  if(gatewayField) gatewayField.classList.toggle('hidden',!needsGateway);
  if(gateway){
    gateway.required=needsGateway;
    if(!needsGateway) gateway.value='';
  }
}
/* ── 校验：一次性报出全部错误 ──
   早期版本用 form.reportValidity()，浏览器每次只弹第一个不合规字段，
   用户填一个再报一个，一个空表单要来回点好几轮。这里改成自己标。 */
function envFieldOf(el){ return el?el.closest('.env-field'):null; }
function setEnvFieldError(el,msg){
  var f=envFieldOf(el); if(!f) return;
  var err=f.querySelector('.env-err');
  if(!err){ err=document.createElement('small'); err.className='env-err'; f.appendChild(err); }
  err.textContent=msg||'';
  f.classList.toggle('invalid',!!msg);
}
function clearEnvErrors(){
  $$('#envConfigForm .env-field').forEach(function(f){
    f.classList.remove('invalid');
    var e=f.querySelector('.env-err'); if(e) e.textContent='';
  });
}
/* 地址归一化：补协议头、去 query/hash、去尾斜杠 */
function normalizeEnvUrl(raw){
  var t=String(raw||'').trim().replace(/\/+$/,'');
  if(!t) return '';
  var out;
  if(/^https?:\/\//i.test(t)) out=t;
  else{ var m=t.match(/^(https?):\/*(.*)$/i); out=m?(m[1].toLowerCase()+'://'+m[2]):('http://'+t); }
  try{ var u=new URL(out); return (u.origin+u.pathname).replace(/\/+$/,''); }catch(e){ return out; }
}
function isVisibleField(el){
  var f=envFieldOf(el);
  if(!f||f.classList.contains('hidden')) return false;
  var sec=f.closest('.env-form-section');
  return !(sec&&sec.classList.contains('hidden'));
}
function validateEnvForm(){
  clearEnvErrors();
  var ok=true;
  var nameInput=$('#envName'), urlInput=$('#envUrl');
  var name=(nameInput.value||'').trim();
  if(!name){ setEnvFieldError(nameInput,'请输入环境名'); ok=false; }
  else if(envMode==='create'){
    var dup=$$('#view-settings .env-item .env-name').some(function(n){
      return n.textContent.trim()===name;
    });
    if(dup){ setEnvFieldError(nameInput,'环境名已存在'); ok=false; }
  }
  var url=(urlInput.value||'').trim();
  if(!url){ setEnvFieldError(urlInput,'请输入环境地址'); ok=false; }
  else{
    var n=normalizeEnvUrl(url);
    if(n!==urlInput.value) urlInput.value=n;
    try{
      if(/\/[^/]+\.(?:html?|jsp|php|aspx?|do)$/i.test(new URL(n).pathname)){
        setEnvFieldError(urlInput,'地址不应包含页面文件名，请填写 ERP 服务根地址'); ok=false;
      }
    }catch(e){ /* 归一化后仍非法：交给接口调用时报错 */ }
  }
  if(!envProductSelect.value){ setEnvFieldError(envProductSelect,'请选择环境类型'); ok=false; }
  var dc=$('#envDataCenter');
  if(!dc.value){ setEnvFieldError(dc,'请选择数据中心'); ok=false; }
  var clientId=$('#envClientId');
  if(!(clientId.value||'').trim()){ setEnvFieldError(clientId,'请输入第三方应用 ID'); ok=false; }
  var secret=$('#envClientSecret');
  if(!(secret.value||'').trim()){ setEnvFieldError(secret,'请输入第三方应用密钥'); ok=false; }
  var gateway=$('#envGateway');
  if(isVisibleField(gateway)&&!(gateway.value||'').trim()){
    setEnvFieldError(gateway,'请输入网关标识'); ok=false;
  }
  var proxy=$('#envProxyUser');
  if(isVisibleField(proxy)&&!(proxy.value||'').trim()){
    setEnvFieldError(proxy,'请输入代理用户'); ok=false;
  }
  return ok;
}
function openEnvModal(mode,item){
  if(!envModal)return;
  envMode=mode==='view'?'view':(mode==='edit'?'edit':'create');
  envEditItem=envMode==='create'?null:item;
  envOriginalProduct=envEditItem?(envEditItem.dataset.envProduct||''):'';
  if(envConfigForm) envConfigForm.reset();
  clearEnvErrors();
  var editing=envMode==='edit'&&envEditItem;
  var viewing=envMode==='view'&&envEditItem;
  var existing=editing||viewing;
  var nameInput=$('#envName');
  var urlInput=$('#envUrl');
  var dataCenterSelect=$('#envDataCenter');
  var clientSecret=$('#envClientSecret');
  var clientId=$('#envClientId');
  var gateway=$('#envGateway');
  var proxyUser=$('#envProxyUser');
  var authSwitch=$('#envAuthSwitch');
  var defaultCheckbox=$('#envDefault');
  var confirmButton=$('#envModalConfirm');
  var cancelButton=$('#envModalCancel');
  $('#envModalTitle').textContent=viewing?'查看 ERP 环境':(editing?'编辑 ERP 环境':'新增 ERP 环境');
  $('#envSecretRequired').classList.remove('hidden');
  $('#envGatewayRequired').classList.remove('hidden');
  nameInput.readOnly=!!existing;
  urlInput.readOnly=!!existing;
  envProductSelect.disabled=!!existing;
  dataCenterSelect.disabled=!!existing;
  clientId.readOnly=!!viewing;
  clientSecret.readOnly=!!viewing;
  gateway.readOnly=!!viewing;
  proxyUser.readOnly=!!viewing;
  authSwitch.disabled=!!viewing;
  defaultCheckbox.disabled=false;
  confirmButton.classList.remove('hidden');
  confirmButton.textContent='保存';
  cancelButton.textContent=viewing?'关闭':'取消';
  clientSecret.required=true;
  if(existing){
    nameInput.value=envEditItem.querySelector('.env-name').textContent.trim();
    urlInput.value=envEditItem.querySelector('.env-url').textContent.trim();
    renderDataCenters(true,envEditItem.dataset.envDataCenter||'1561691182942805271');
    $('#envClientId').value=envEditItem.dataset.envClientId||'';
    $('#envDefault').checked=!!envEditItem.querySelector('.env-tag.def');
    setEnvProduct(envOriginalProduct||'XH');
    clientSecret.value=envMaskedValue;
    $('#envGateway').value=envOriginalProduct==='XK'?envMaskedValue:'';
    /* 已启用普通 AccessToken 的环境不再展示认证区块（迁移不可回退） */
    var normalAuth=envEditItem.dataset.normalAccessToken!=='false';
    $('#envLegacyAuthSection').classList.toggle('hidden',normalAuth);
    $('#envProxyUser').value=normalAuth?'':(envEditItem.dataset.proxyUser||'');
    setNormalAuthEnabled(normalAuth);
  }else{
    $('#envClientId').value='';
    renderDataCenters(false,'');
    $('#envLegacyAuthSection').classList.add('hidden');
    $('#envProxyUser').value='';
    setNormalAuthEnabled(true);
    setEnvProduct('');
  }
  /* 连接方式：编辑/查看态按已存模式渲染，新增态等地址填完再探测 */
  resetConnSection();
  if(existing){
    envConnSupported=envEditItem.dataset.envConn==='auth'||probeAuthSupport(urlInput.value);
    envConnBlocked='';
    $('#envConnSection').classList.remove('hidden');
    applyConnMode(envEditItem.dataset.envConn==='auth'?'auth':'cred');
  }else{
    $('#envConnSection').classList.remove('hidden');
    applyConnMode('auth');
  }
  syncDcRefresh();
  envModal.classList.add('show');
  /* 只在新增时聚焦环境名：编辑/查看态它是只读的，聚焦只会画出一圈没有意义的焦点环 */
  setTimeout(function(){ if(nameInput && !existing) nameInput.focus(); },60);
}
function closeEnvModal(){ if(envModal) envModal.classList.remove('show'); resetConnSection(); }
/* 地址变了就丢弃已选数据中心：旧数据中心不属于新地址 */
var envUrlInput=$('#envUrl');
var envAuthScopeToggle=$('#envAuthScopeToggle');

var envDcRefreshBtn=$('#envDcRefresh');

var envDisconnectBtn=$('#envDisconnect');
var envReauthBtn=$('#envReauth');
var envAdd=$('#envAdd');
var envTest=$('#envTest');

/* 授权成功后建行。地址和数据中心由授权结果决定，不再从表单取 */
function addAuthEnvRow(name,dataCenterId,granted){
  var list=$('#view-settings .env-list');
  if(!list) return;
  var isDef=$('#envDefault')&&$('#envDefault').checked;
  if(isDef) $$('.env-tag.def',list).forEach(function(t){t.remove()});
  var url=($('#envUrl').value||'').trim()||'https://example.com/ierp';
  var item=document.createElement('div');
  item.className='env-item';
  item.dataset.envSource='local';
  item.dataset.envConn='auth';
  /* 环境类型和数据中心都由 ERP 在授权时确定，本机不猜 */
  item.dataset.envProduct='';
  item.dataset.envDataCenter=dataCenterId||ENV_DATA_CENTERS[0].id;
  item.dataset.normalAccessToken='true';
  if(granted){
    item.dataset.grantedBy='吴**超';
    item.dataset.grantedAt='今天';
    item.dataset.lastUsed='刚刚';
  }else{
    item.dataset.grantState='none';
  }
  item.innerHTML='<div class="env-main"><div class="env-head"><span class="env-name"></span>'
    +(isDef?'<span class="env-tag def">默认</span>':'')
    +'<span class="env-tag local">本地</span></div>'
    +'<div class="env-url"></div></div>'
    +'<div class="env-more-wrap"><button class="env-more" data-tooltip="更多" aria-label="更多" aria-haspopup="true">'
    +'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>'
    +'<div class="env-menu"><div class="env-mi" data-act="edit">编辑</div><div class="env-mi" data-act="copy">复制地址</div><div class="env-mi" data-act="default">设为默认</div><div class="env-mi-sep"></div><div class="env-mi danger" data-act="delete">删除</div></div></div>';
  item.querySelector('.env-name').textContent=name;
  item.querySelector('.env-url').textContent=url;
  syncConnTag(item);
  bindEnvMore(item.querySelector('.env-more'));
  list.appendChild(item);
}

export function initEnvConfig() {
  $$('#view-settings .env-item').forEach(hydrateEnvItem);
  $$('.env-more').forEach(bindEnvMore);
  document.addEventListener('click',function(){ closeEnvMenus(null); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeEnvMenus(null); });
}

export function initEnvAuth() {
  if(envConnSeg){
    envConnSeg.addEventListener('click',function(e){
      var opt=e.target.closest('.env-conn-opt');
      if(!opt||opt.disabled) return;
      applyConnMode(opt.getAttribute('data-mode'));
    });
    /* 单选组按方向键换选项，跟系统里的单选按钮一致 */
    envConnSeg.addEventListener('keydown',function(e){
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.key)===-1) return;
      var opts=$$('.env-conn-opt',envConnSeg).filter(function(o){ return !o.disabled; });
      if(opts.length<2) return;
      e.preventDefault();
      var i=opts.indexOf(document.activeElement);
      var next=opts[(i+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)+opts.length)%opts.length];
      next.focus();
      applyConnMode(next.getAttribute('data-mode'));
    });
  }
  if(consentTabQr) consentTabQr.addEventListener('click',function(){ setConsentTab('qr'); });
  if(consentTabPwd) consentTabPwd.addEventListener('click',function(){ setConsentTab('pwd'); });
  if(consentQr) consentQr.addEventListener('click',consentLoggedIn);
  if(consentLoginBtn) consentLoginBtn.addEventListener('click',consentLoggedIn);
  if(consentSwitch) consentSwitch.addEventListener('click',function(){
    /* 换人授权就得重新登录：登录态属于浏览器，不属于这条环境配置 */
    erpBrowserSession=null;
    setConsentTab('qr');
    setConsentStep('login',false);
  });
  if(consentAllow) consentAllow.addEventListener('click',function(){ finishAuthorize(true); });
  if(consentDeny) consentDeny.addEventListener('click',function(){ finishAuthorize(false); });
  if(envAuthorizeAlt) envAuthorizeAlt.addEventListener('click',function(){
    /* 演示：等待态点一次进入唤起失败，失败态点一次重新等待 */
    if($('#envAuthorizeFailed')&&!$('#envAuthorizeFailed').classList.contains('hidden')){
      startAuthorize(envAuthorizeTarget,envAuthorizeName);
    }else{
      if(envAuthorizeTimer){ clearTimeout(envAuthorizeTimer); envAuthorizeTimer=null; }
      setAuthorizeState('failed');
    }
  });
  ['#envAuthorizeClose','#envAuthorizeCancel'].forEach(function(sel){
    var b=$(sel); if(b) b.addEventListener('click',closeAuthorize);
  });
}

export function initEnvDisconnect() {
  ['#envDisconnectClose','#envDisconnectCancel'].forEach(function(sel){
    var b=$(sel); if(b) b.addEventListener('click',closeDisconnect);
  });
  if(envDisconnectConfirm) envDisconnectConfirm.addEventListener('click',function(){
    /* 两步都要做：调撤销端点让服务端作废授权记录，再删本地令牌。
       只删本地是「本地遗忘」，令牌在 ERP 侧仍然有效到自然过期 */
    /* 断开不改授权类型：环境仍然是 OAuth，只是回到「未授权」，重新授权就能用 */
    if(envDisconnectTarget){
      envDisconnectTarget.dataset.grantState='revoked';
      syncConnTag(envDisconnectTarget);
    }
    closeDisconnect();
    closeEnvModal();
  });
  if(envAuthSwitch) envAuthSwitch.addEventListener('click',function(){
    if(envAuthSwitch.disabled) return;
    if(envNormalAuthEnabled){ setNormalAuthEnabled(false); return; }
    if(envAuthConfirmModal) envAuthConfirmModal.classList.add('show');
  });
  ['#envAuthConfirmClose','#envAuthConfirmCancel'].forEach(function(sel){
    var b=$(sel); if(b) b.addEventListener('click',closeAuthConfirm);
  });
  if(envAuthConfirmOk) envAuthConfirmOk.addEventListener('click',function(){
    closeAuthConfirm();
    setNormalAuthEnabled(true);
  });
  if(envAuthConfirmModal) envAuthConfirmModal.addEventListener('click',function(e){
    if(e.target===envAuthConfirmModal) closeAuthConfirm();
  });
  if(envProductSelect) envProductSelect.addEventListener('change',function(){
    setEnvProduct(this.value);
    if(envMode==='edit'&&this.value==='XK'&&envOriginalProduct==='XK') $('#envGateway').value=envMaskedValue;
  });
  if(envUrlInput){
    envUrlInput.addEventListener('input',function(){
      var dc=$('#envDataCenter');
      if(dc&&dc.value){ dc.value=''; setEnvFieldError(dc,''); }
      setEnvFieldError(envUrlInput,'');
      syncDcRefresh();
    });
    envUrlInput.addEventListener('blur',function(){
      /* 地址清空只是回到「还没探测」，授权类型该摆着还是摆着 */
      if(!(envUrlInput.value||'').trim()){
        if(envProbeTimer){ clearTimeout(envProbeTimer); envProbeTimer=null; }
        envConnSupported=false; envConnBlocked='';
        var seg0=$('#envConnSeg'); if(seg0) seg0.classList.remove('probing');
        applyConnMode(envConnMode);
        return;
      }
      envUrlInput.value=normalizeEnvUrl(envUrlInput.value);
      runProbe(envUrlInput.value);
      /* 地址填完静默拉一次；失败不打扰，用户还可以点「重新拉取」 */
      var dc=$('#envDataCenter');
      if(envMode==='create'&&dc&&dc.options.length<2) loadDataCenters();
    });
  }
  if(envAuthScopeToggle) envAuthScopeToggle.addEventListener('click',function(){
    var list=$('#envAuthScopeList'); if(!list) return;
    var open=list.classList.contains('hidden');
    list.classList.toggle('hidden',!open);
    envAuthScopeToggle.setAttribute('aria-expanded',open?'true':'false');
  });
  if(envDcRefreshBtn) envDcRefreshBtn.addEventListener('click',function(){
    var url=$('#envUrl');
    if(!((url&&url.value||'').trim())){ setEnvFieldError(url,'请输入环境地址'); return; }
    loadDataCenters();
  });
  if(envDisconnectBtn) envDisconnectBtn.addEventListener('click',function(){
    openDisconnect(envEditItem,$('#envName').value||'');
  });
  if(envReauthBtn) envReauthBtn.addEventListener('click',function(){
    startAuthorize(envEditItem,$('#envName').value||'');
  });
  if(envAdd) envAdd.addEventListener('click',function(){ openEnvModal('create'); });
  ['#envModalClose','#envModalCancel'].forEach(function(sel){
    var b=$(sel); if(b) b.addEventListener('click',closeEnvModal);
  });
  if(envModal) envModal.addEventListener('click',function(e){ if(e.target===envModal) closeEnvModal(); });
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape') return;
    /* 二次确认浮在配置弹窗之上，Escape 先关它 */
    if(envAuthConfirmModal&&envAuthConfirmModal.classList.contains('show')){ closeAuthConfirm(); return; }
    if(envModal&&envModal.classList.contains('show')) closeEnvModal();
  });
  if(envTest){
    envTest.addEventListener('click',function(){
      if(!envConfigForm||!validateEnvForm()) return;
      envTest.disabled=true;
      envTest.textContent='测试中…';
      setTimeout(function(){
        envTest.disabled=false;
        envTest.textContent='测试连接';
        toast('连接测试通过');
      },700);
    });
  }
  if(envConfigForm){
    envConfigForm.addEventListener('submit',function(e){
      e.preventDefault();
      if(envMode==='view'&&envEditItem){
        var viewList=$('#view-settings .env-list');
        var viewIsDefault=$('#envDefault').checked;
        if(viewIsDefault){
          $$('.env-tag.def',viewList).forEach(function(t){t.remove()});
          var viewHead=envEditItem.querySelector('.env-head');
          var viewTag=document.createElement('span');
          viewTag.className='env-tag def'; viewTag.textContent='默认';
          viewHead.insertBefore(viewTag,viewHead.querySelector('.env-tag'));
        }else{
          var viewOldDefault=envEditItem.querySelector('.env-tag.def');
          if(viewOldDefault) viewOldDefault.remove();
        }
        closeEnvModal();
        toast('已更新默认环境设置');
        return;
      }
      /* 选了 OAuth 的新增：不落盘，先去浏览器换令牌，回调成功后才写配置 */
      if(envConnMode==='auth'&&envMode==='create'){
        var authName=($('#envName').value||'').trim();
        var authUrl=($('#envUrl').value||'').trim();
        var okName=true;
        if(!authName){ setEnvFieldError($('#envName'),'请输入环境名'); okName=false; }
        if(!authUrl){ setEnvFieldError($('#envUrl'),'请输入环境地址'); okName=false; }
        if(!okName) return;
        startAuthorize(null,authName);
        return;
      }
      if(!validateEnvForm()) return;
      var name=($('#envName').value||'').trim();
      var url=($('#envUrl').value||'').trim();
      var type=envProduct==='XK'?'AI 套件':'AI 星瀚';
      var isDef=$('#envDefault').checked;
      var list=$('#view-settings .env-list');
      if(envMode==='edit'&&envEditItem){
        envEditItem.querySelector('.env-name').textContent=name;
        envEditItem.querySelector('.env-url').textContent=url;
        envEditItem.dataset.envProduct=envProduct;
        envEditItem.dataset.envDataCenter=$('#envDataCenter').value;
        envEditItem.dataset.envClientId=($('#envClientId').value||'').trim();
        var secret=($('#envClientSecret').value||'').trim();
        var gateway=($('#envGateway').value||'').trim();
        if(secret&&secret!==envMaskedValue) envEditItem.dataset.envClientSecret=secret;
        if(gateway&&gateway!==envMaskedValue) envEditItem.dataset.envGateway=gateway;
        else if(envProduct!=='XK') delete envEditItem.dataset.envGateway;
        syncProductTag(envEditItem,envProduct);
        var wasNormalAuth=envEditItem.dataset.normalAccessToken!=='false';
        envEditItem.dataset.normalAccessToken=envNormalAuthEnabled?'true':'false';
        if(envNormalAuthEnabled){
          delete envEditItem.dataset.proxyUser;
        }else{
          envEditItem.dataset.proxyUser=($('#envProxyUser').value||'').trim();
        }
        syncAuthTag(envEditItem);
        syncConnTag(envEditItem);
        if(isDef){
          $$('.env-tag.def',list).forEach(function(t){t.remove()});
          var editHead=envEditItem.querySelector('.env-head');
          var editTag=document.createElement('span');
          editTag.className='env-tag def'; editTag.textContent='默认';
          editHead.insertBefore(editTag,editHead.querySelector('.env-tag'));
        }else{
          var oldDefault=envEditItem.querySelector('.env-tag.def');
          if(oldDefault) oldDefault.remove();
        }
        closeEnvModal();
        toast(!wasNormalAuth&&envNormalAuthEnabled
          ?'已更新环境并切换为普通 AccessToken 认证：'+name
          :'已更新环境：'+name);
        return;
      }
      if(isDef) $$('.env-tag.def',list).forEach(function(t){t.remove()});
      var item=document.createElement('div');
      item.className='env-item';
      item.dataset.envProduct=envProduct;
      item.dataset.envSource='local';
      item.dataset.envDataCenter=$('#envDataCenter').value;
      item.dataset.envClientId=($('#envClientId').value||'').trim();
      item.dataset.envClientSecret=($('#envClientSecret').value||'').trim();
      item.dataset.normalAccessToken='true';
      if(envProduct==='XK') item.dataset.envGateway=($('#envGateway').value||'').trim();
      item.innerHTML='<div class="env-main"><div class="env-head"><span class="env-name"></span>'
        +(isDef?'<span class="env-tag def">默认</span>':'')
        +'<span class="env-tag '+item.dataset.envSource+'">'+(item.dataset.envSource==='cloud'?'云端':'本地')+'</span></div>'
        +'<div class="env-url"></div></div>'
        +'<div class="env-more-wrap"><button class="env-more" data-tooltip="更多" aria-label="更多" aria-haspopup="true">'
        +'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>'
        +'<div class="env-menu"><div class="env-mi" data-act="edit">编辑</div><div class="env-mi" data-act="test">测试连接</div><div class="env-mi" data-act="copy">复制地址</div><div class="env-mi" data-act="default">设为默认</div><div class="env-mi-sep"></div><div class="env-mi danger" data-act="delete">删除</div></div></div>';
      item.querySelector('.env-name').textContent=name;
      item.querySelector('.env-url').textContent=url;
      item.dataset.envConn='cred';
      syncConnTag(item);
      bindEnvMore(item.querySelector('.env-more'));
      list.appendChild(item);
      closeEnvModal();
      toast('已新增环境：'+name);
    });
  }
}
