import { $ } from '../core/dom.js';
/* 登录鉴权
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 登录鉴权 ---------- */
var loginOverlay=$('#loginOverlay');
var loginForm=$('#loginForm');
var loginBtn=$('#loginBtn');
var loginError=$('#loginError');
var LOGIN_KEY='lingee_auth_session';
var REMEMBER_KEY='lingee_remember_user';

var USER_NAMES={
  'wei_bu@kingdee.com':{name:'Wei',avatar:'W'},
  'wuhc2023@gmail.com':{name:'Chao',avatar:'C'},
  '6686612@qq.com':{name:'Joe',avatar:'J'},
  '17299999999':{name:'Dev',avatar:'D'},
  'liangpingxian@gmail.com':{name:'Xian',avatar:'L'}
};
var USER_CREDENTIALS={
  'wei_bu@kingdee.com':'lingee520',
  'wuhc2023@gmail.com':'lingee520',
  '6686612@qq.com':'lingee520',
  '17299999999':'KDadm!@#2022',
  'liangpingxian@gmail.com':'lingee520'
};

/* 演示角色：不同角色登录后看到不同视图（权限差异演示） */
var DEMO_ROLES=[
  {id:'owner',label:'所有者',name:'吴宏超',avatar:'吴',desc:'全部权限 · 人员与权限/项目设置'},
  {id:'dev',  label:'开发',  name:'张工',  avatar:'张', desc:'任务执行 · 代码评审 · 创建专家'},
  {id:'pm',   label:'需求',  name:'赵琳',  avatar:'赵', desc:'需求创建 · 需求评审'},
  {id:'qa',   label:'测试',  name:'陈晨',  avatar:'陈', desc:'测试评审 · 用例产物'},
  {id:'ops',  label:'运维',  name:'周杰',  avatar:'周', desc:'部署发布 · 运维产物'}
];
var ROLE_KEY='lingee_demo_role';
function getRole(){ try{ return sessionStorage.getItem(ROLE_KEY)||'owner'; }catch(e){ return 'owner'; } }
function setRole(r){ try{ sessionStorage.setItem(ROLE_KEY,r); }catch(e){} }
/* 按角色在 body 上打标记，具体可见性交给 CSS（data-perm 属性） */
function applyRole(){ if(document.body) document.body.setAttribute('data-role',getRole()); }
function applyRoleUser(r){
  var av=$('#userAvatar'),nm=$('#userName'),tag=$('#userRoleTag');
  if(av) av.textContent=r.avatar;
  if(nm) nm.textContent=r.name;
  if(!tag){
    var nb=nm&&nm.parentNode;
    if(nb){ tag=document.createElement('span'); tag.id='userRoleTag'; tag.className='user-role-tag'; nb.insertBefore(tag,nm.nextSibling); }
  }
  if(tag) tag.textContent=r.label;
}

function getAuthedUser(){
  try{ return sessionStorage.getItem(LOGIN_KEY)||null; }catch(e){ return null; }
}
function setAuthed(user){
  try{ sessionStorage.setItem(LOGIN_KEY,user); }catch(e){}
}
function applyUserInfo(user){
  var info=USER_NAMES[user]||{name:'Joe',avatar:'J'};
  var av=$('#userAvatar'),nm=$('#userName');
  if(av) av.textContent=info.avatar;
  if(nm) nm.textContent=info.name;
  var tag=$('#userRoleTag'); if(tag) tag.textContent='所有者';
}
/* 登录框登录后仍留在 DOM 里，Chrome 会把整页当登录页，
   往搜索框之类的文本框推荐保存的账号。禁用掉就不再是自动填充来源。 */
var _loginFormHome=null, _loginFormNode=null;
function setLoginFieldsEnabled(on){
  var form=$('#loginForm');
  if(on){
    /* 密码框在初始 HTML 里是 type="text"，到这里才变回 password。
       Chrome 在解析阶段就靠 type="password" 判定「这是登录页」，
       一旦判定，本页任何文本框聚焦时都会被推荐保存的账号。 */
    var pw=$('#loginPass');
    if(pw && pw.hasAttribute('data-pw')) pw.setAttribute('type','password');
  }
  if(!on){
    /* 登录成功后把整个表单摘出 DOM。只 disabled 不够：Chrome 仍会把本页当登录页，
       往任意文本框推荐保存的账号（会被当成搜索关键词，把列表筛空）。 */
    if(form){ _loginFormHome=form.parentNode; _loginFormNode=form; form.remove(); }
  }else if(_loginFormNode && _loginFormHome && !_loginFormNode.isConnected){
    _loginFormHome.appendChild(_loginFormNode);
  }
}
function showLogin(){
  if(loginOverlay) loginOverlay.classList.remove('hidden');
  setLoginFieldsEnabled(true);
}
function hideLogin(){
  if(loginOverlay) loginOverlay.classList.add('hidden');
  setLoginFieldsEnabled(false);
}

/* 未登录则显示登录页，已登录则恢复用户信息 */
var _authedUser=getAuthedUser();

export function initLogin() {
  /* 恢复记住的账号和密码 */
  try{
    var saved=localStorage.getItem(REMEMBER_KEY);
    if(saved){
      saved=JSON.parse(saved);
      var inp=$('#loginUser'); if(inp) inp.value=saved.u||'';
      var pp=$('#loginPass'); if(pp) pp.value=saved.p||'';
      var cb=$('#loginRemember'); if(cb) cb.checked=true;
    }
  }catch(e){}

  if(loginForm){
    loginForm.addEventListener('submit',function(e){
      e.preventDefault();
      var user=$('#loginUser').value.trim();
      var pass=$('#loginPass').value.trim();
      if(!user||!pass){
        loginError.textContent='请输入账号和密码';
        return;
      }
      if(USER_CREDENTIALS[user] && USER_CREDENTIALS[user]===pass){
        loginError.textContent='';
        loginBtn.classList.add('loading');
        loginBtn.disabled=true;
        loginBtn.textContent='登录中';
        var remember=$('#loginRemember');
        try{
          if(remember&&remember.checked) localStorage.setItem(REMEMBER_KEY,JSON.stringify({u:user,p:pass}));
          else localStorage.removeItem(REMEMBER_KEY);
        }catch(e){}
        setTimeout(function(){
          setAuthed(user);
          setRole('owner');
          applyUserInfo(user);
          applyRole();
          hideLogin();
          loginBtn.classList.remove('loading');
          loginBtn.disabled=false;
          loginBtn.textContent='登录';
        },800);
      }else{
        loginError.textContent='账号或密码错误，请重试';
        $('#loginPass').value='';
        $('#loginPass').focus();
      }
    });
    loginBtn.addEventListener('click',function(){});

  /* 登录页全局回车快捷键 */
  document.addEventListener('keydown',function(e){
    if(e.key==='Enter'&&loginOverlay&&!loginOverlay.classList.contains('hidden')&&loginBtn&&!loginBtn.disabled)
      loginForm.dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
  });
  }
  if(!_authedUser){
    showLogin();
    try{localStorage.removeItem('lingeeUrlState')}catch(e){}
  }else{
    applyRole();
    var _r=DEMO_ROLES.filter(function(x){return x.id===getRole();})[0];
    if(_r && String(_authedUser).indexOf('demo:')===0) applyRoleUser(_r); else applyUserInfo(_authedUser);
    hideLogin();
  }
}

export { DEMO_ROLES, LOGIN_KEY, REMEMBER_KEY, _authedUser, applyRole, getRole, loginError, loginForm, showLogin };
