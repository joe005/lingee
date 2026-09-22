import { AV_KEYS, EX, MODEL_TIERS, MY_EXPERTS, PRESET_TEAMS, WORK_MODES, rebuildExperts, set_MY_EXPERTS } from './data.js';
import { knDir } from './knowledge.js';
/* 专家 / 专家团：持久化、能力自检
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 持久化：只存自建专家团与当前选择 ----------
   内置团不入库，这样以后改内置定义能直接生效，不会被旧缓存盖住 */
var TEAM_STORE_KEY='lingee.experts.v1';
var TEAMS=PRESET_TEAMS.slice();
/* 选中对象：团或单个专家，同一语义位、只能选其一
   —— 对应 lingee-build 的 mode: team / personal */
var activePick={kind:null,id:''};   /* 默认不指定，由系统自动匹配 */
function pickName(){
  if(activePick.kind==='team') return (teamById(activePick.id)||{}).name||'';
  if(activePick.kind==='expert') return (EX[activePick.id]||{}).name||'';
  return '';
}
function pickValid(){
  if(activePick.kind==='team') return !!teamById(activePick.id);
  if(activePick.kind==='expert') return !!EX[activePick.id];
  return false;
}
function clearPick(){ activePick={kind:null,id:'',auto:false}; }

function loadTeams(){
  var raw=null;
  try{ raw=localStorage.getItem(TEAM_STORE_KEY); }catch(e){ return; }
  if(!raw) return;
  var d;
  try{ d=JSON.parse(raw); }catch(e){ return; }
  if(!d||typeof d!=='object') return;
  var mine=Array.isArray(d.experts)?d.experts:[];
  set_MY_EXPERTS(mine.filter(function(e){
    return e&&typeof e.id==='string'&&e.id.indexOf('my-')===0&&typeof e.name==='string'&&e.name
      &&Array.isArray(e.modes)&&e.modes.length;
  }).map(function(e){
    return {id:e.id,mine:true,k:AV_KEYS.indexOf(e.k)>=0?e.k:'eng',
      name:e.name,role:e.role||'自定义专家',by:'我创建的',desc:e.desc||'',
      tags:Array.isArray(e.tags)?e.tags:[],
      modes:e.modes.filter(function(m){return WORK_MODES.indexOf(m)>=0}),
      tier:MODEL_TIERS.some(function(t){return t.id===e.tier})?e.tier:'auto',
      comp:Array.isArray(e.comp)?e.comp:[],
      cmds:(Array.isArray(e.cmds)?e.cmds:[]).filter(function(c){return Array.isArray(c)&&c[0]}),
      /* 知识：只认平台上还存在的目录，绑定失效就自然掉了 */
      kn:(Array.isArray(e.kn)?e.kn:[]).filter(function(x){ return !!knDir(x) }),
      knOff:(Array.isArray(e.knOff)?e.knOff:[]).filter(function(x){ return !!knDir(x) }),
      knUp:(Array.isArray(e.knUp)?e.knUp:[]).filter(function(f){ return f&&typeof f.n==='string' })
        .map(function(f){ return {n:f.n,t:f.t||'FILE',sz:f.sz||'',up:f.up||'',by:f.by||'我'} })
    };
  }).filter(function(e){ return e.modes.length; }));
  rebuildExperts();

  var custom=Array.isArray(d.teams)?d.teams:[];
  var valid=custom.filter(function(t){
    return t&&typeof t.id==='string'&&!t.preset&&typeof t.name==='string'
      &&Array.isArray(t.members)&&t.members.every(function(m){return !!EX[m]});
  }).map(function(t){
    return {id:t.id,preset:false,name:t.name,by:t.by||'我创建的',desc:t.desc||'',
      domains:Array.isArray(t.domains)?t.domains:[],
      leadId:EX[t.leadId]?t.leadId:(t.members[0]||null),members:t.members.slice(),
      cmds:(Array.isArray(t.cmds)?t.cmds:[]).filter(function(c){return Array.isArray(c)&&c[0]})};
  });
  TEAMS=PRESET_TEAMS.slice().concat(valid);
}
function saveTeams(){
  try{
    localStorage.setItem(TEAM_STORE_KEY, JSON.stringify({
      v:1,
      teams:TEAMS.filter(function(t){return !t.preset}).map(function(t){
        return {id:t.id,name:t.name,by:t.by,desc:t.desc,domains:t.domains||[],
                leadId:t.leadId,members:t.members,cmds:t.cmds};
      }),
      experts:MY_EXPERTS.map(function(e){
        return {id:e.id,k:e.k,name:e.name,role:e.role,desc:e.desc,tags:e.tags,
                modes:e.modes,comp:e.comp,cmds:e.cmds,tier:e.tier||'auto',
                kn:e.kn||[],knOff:e.knOff||[],knUp:e.knUp||[]};
      })
    }));
  }catch(e){ /* 隐私模式 / 配额满：原型退化为内存态，不打扰用户 */ }
}
function teamById(id){ for(var i=0;i<TEAMS.length;i++) if(TEAMS[i].id===id) return TEAMS[i]; return null; }

/* ---------- 团队能力自检 ----------
   专家团不是一条写死的流程，谁做哪一步由编排在运行时按当前任务动态决定；
   团队定义只负责声明「这个团合起来能干什么」，这里检查这份能力声明是否有明显缺口。 */
function teamLint(t){
  var w=[];
  var canImpl=false;
  t.members.forEach(function(id){ if(EX[id]&&EX[id].modes.indexOf('实现')>=0) canImpl=true; });
  if(!canImpl) w.push('没有成员具备「实现」工作模式，实现任务无人可领取。');
  var canVerify=false;
  t.members.forEach(function(id){ if(EX[id]&&EX[id].modes.indexOf('验证')>=0) canVerify=true; });
  if(!canVerify) w.push('没有成员具备「验证」工作模式，产出不会被检查，建议加入「软件测试工程师」。');
  return w;
}

/* 专家团的领域标签：优先用团自己声明的，没有就从成员标签聚合 */
function teamDomains(t){
  if(t&&t.domains&&t.domains.length) return t.domains;
  var seen={},out=[];
  (t&&t.members||[]).forEach(function(id){
    var e=EX[id]; if(!e) return;
    (e.tags||[]).forEach(function(g){ if(!seen[g]){seen[g]=1;out.push(g);} });
  });
  return out;
}

/* TEAMS 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set_TEAMS(v){ TEAMS=v; return v; }
/* activePick 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set_activePick(v){ activePick=v; return v; }

export { TEAMS, activePick, clearPick, loadTeams, pickName, pickValid, saveTeams, teamById, teamDomains, teamLint };
