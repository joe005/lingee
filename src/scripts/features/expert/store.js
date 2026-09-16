import { AV_KEYS, EX, MY_EXPERTS, PRESET_TEAMS, WORK_MODES, rebuildExperts, set_MY_EXPERTS } from './data.js';
/* 专家 / 专家团：持久化、编排推导、人工审核节点
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
      comp:Array.isArray(e.comp)?e.comp:[],
      cmds:(Array.isArray(e.cmds)?e.cmds:[]).filter(function(c){return Array.isArray(c)&&c[0]}),

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
      gates:Array.isArray(t.gates)?t.gates.filter(function(g){return typeof g==='string'}):[],
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
                gates:teamGates(t),leadId:t.leadId,members:t.members,cmds:t.cmds};
      }),
      experts:MY_EXPERTS.map(function(e){
        return {id:e.id,k:e.k,name:e.name,role:e.role,desc:e.desc,tags:e.tags,
                modes:e.modes,comp:e.comp,cmds:e.cmds};
      })
    }));
  }catch(e){ /* 隐私模式 / 配额满：原型退化为内存态，不打扰用户 */ }
}
function teamById(id){ for(var i=0;i<TEAMS.length;i++) if(TEAMS[i].id===id) return TEAMS[i]; return null; }

/* ---------- 编排推导：成员 → 任务 DAG ----------
   不再有交付强度这个旋钮：团里有谁，流程里就有哪一步。
   实现环节始终保留——没人能领时显式标红，这是要暴露的问题，不是可以省掉的步骤。 */
function teamFlow(t){
  function any(){ for(var i=0;i<arguments.length;i++) if(t.members.indexOf(arguments[i])>=0) return arguments[i]; return null; }
  function byMode(m,skip){ for(var i=0;i<t.members.length;i++){ if(t.members[i]===skip) continue; var e=EX[t.members[i]]; if(e&&e.modes.indexOf(m)>=0) return t.members[i]; } return null; }
  var f=[], multi=t.members.length>1;
  var lead=any('software-team-lead');
  if(multi && lead) f.push({id:'kickoff',k:'analyze',title:'协调范围与门禁',who:lead});
  var pm=any('software-product-manager');
  if(pm) f.push({id:'requirement',k:'analyze',title:'分析需求与验收',who:pm});
  var des=any('software-architect','ux-designer');
  if(des) f.push({id:'design',k:'design',title:'设计方案与实现计划',who:des});
  var rev=any('code-reviewer','read-only-analyst');
  if(rev) f.push({id:'precode-review',k:'review',title:'编码准入评审',who:rev});
  f.push({id:'implement',k:'implement',title:'实现编码任务',
    who:any('software-engineer','frontend-engineer','cosmic-form','cosmic-workflow','cosmic-report','cosmic-plugin','cosmic-api')||byMode('实现')});
  var sec=any('security-reviewer');
  if(sec) f.push({id:'security-review',k:'review',title:'安全评审',who:sec});
  var qa=any('software-qa-engineer')||byMode('验证',lead);
  if(qa) f.push({id:'verify',k:'test',title:'质量验证',who:qa});
  var itg=lead||any('software-architect')||byMode('集成');
  if(multi && itg) f.push({id:'integrate',k:'integrate',title:'集成与交付确认',who:itg});
  return f;
}
/* ---------- 人工审核确认节点 ----------
   挂在某个流程步骤之后：这一步产出后编排暂停，等人点过才继续。
   只存步骤 id，成员变动导致步骤消失时自动失效，不需要迁移数据。 */
function teamGates(t){ return Array.isArray(t&&t.gates)?t.gates:[]; }
function hasGate(t,stepId){ return teamGates(t).indexOf(stepId)>=0; }
/* 只统计当前流程里真实存在的步骤上挂的确认点 */
function activeGates(t,flow){
  var f=flow||teamFlow(t);
  return f.filter(function(s){ return hasGate(t,s.id); });
}
function toggleGate(t,stepId){
  if(!t) return;
  if(!Array.isArray(t.gates)) t.gates=[];
  var i=t.gates.indexOf(stepId);
  if(i>=0) t.gates.splice(i,1); else t.gates.push(stepId);
}

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

export { TEAMS, activeGates, activePick, clearPick, hasGate, loadTeams, pickName, pickValid, saveTeams, teamById, teamDomains, teamFlow, teamGates, teamLint, toggleGate };
