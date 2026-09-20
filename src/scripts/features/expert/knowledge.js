import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { parseComp, xesc } from './data.js';
/* 专家知识：企业知识目录的挂载 + 单独上传的文件
   与智能体开发里的「知识」页签同构：专家挂目录（绑定元数据），文档本身留在平台上。
   知识与能力项挂钩：目录声明自己服务哪些能力项，专家勾了对应能力项，目录就自动挂上——
   不用两头分别维护。自动挂的目录仍可在这里临时停用（检索时跳过），但解除不了，
   要去掉就去「专家」页签取消对应能力项；另外也支持手动追加不对应任何能力项的目录。
   副作用集中在下方 init* 函数里，由 main.js 调用。 */


/* ---------- 企业知识库（平台侧已入库的目录） ----------
   专家身上只存绑定关系，不存文档内容；文档更新了，专家下次检索就会用到新的。 */
var KN_DIRS=[
  {id:'kn-fe-spec',name:'金蝶前端开发规范',by:'前端架构组',comps:['engineering.frontend','design.interaction'],docs:[
    {n:'金蝶前端组件库使用规范 v3.2',t:'PDF',sz:'1.8 MB',by:'赵媛媛',up:'2026/8/18',pg:12},
    {n:'响应式栅格与断点约定',t:'DOCX',sz:'420 KB',by:'赵媛媛',up:'2026/7/30',pg:6},
    {n:'KWC 组件命名与目录结构',t:'MD',sz:'18 KB',by:'林波',up:'2026/8/2',pg:3}]},
  {id:'kn-form-guide',name:'苍穹表单建模指南',by:'苍穹平台组',comps:['cosmic.form-design'],docs:[
    {n:'单据字段类型与校验规则清单',t:'PDF',sz:'2.4 MB',by:'李文彬',up:'2026/8/11',pg:18},
    {n:'字段联动与可见性配置示例',t:'DOCX',sz:'660 KB',by:'李文彬',up:'2026/6/24',pg:9}]},
  {id:'kn-flow-manual',name:'苍穹工作流配置手册',by:'苍穹平台组',comps:['cosmic.workflow'],docs:[
    {n:'审批链建模与加签会签场景',t:'PDF',sz:'3.1 MB',by:'周敏',up:'2026/8/16',pg:24},
    {n:'流程不流转的常见原因排查表',t:'DOCX',sz:'380 KB',by:'周敏',up:'2026/8/5',pg:5},
    {n:'条件流转表达式速查',t:'MD',sz:'12 KB',by:'郑凯',up:'2026/5/19',pg:2}]},
  {id:'kn-report-base',name:'报表取数与性能基线',by:'苍穹平台组',comps:['cosmic.report'],docs:[
    {n:'报表数据模型设计规范',t:'PDF',sz:'1.5 MB',by:'孙丽',up:'2026/7/8',pg:14},
    {n:'慢查询优化案例集',t:'DOCX',sz:'890 KB',by:'孙丽',up:'2026/8/13',pg:11}]},
  {id:'kn-plugin-spec',name:'苍穹二开插件开发规范',by:'苍穹平台组',comps:['cosmic.plugin'],docs:[
    {n:'扩展点清单与生命周期说明',t:'PDF',sz:'2.0 MB',by:'郑凯',up:'2026/8/9',pg:16},
    {n:'插件注册不生效的排查路径',t:'MD',sz:'22 KB',by:'郑凯',up:'2026/7/21',pg:3}]},
  {id:'kn-api-contract',name:'苍穹开放接口契约',by:'集成中心',comps:['cosmic.integration','engineering.integration'],docs:[
    {n:'开放平台鉴权方式对比',t:'PDF',sz:'1.1 MB',by:'何俊',up:'2026/8/1',pg:8},
    {n:'幂等与重试设计约定',t:'DOCX',sz:'340 KB',by:'何俊',up:'2026/6/30',pg:6}]},
  {id:'kn-req-template',name:'需求与验收模板库',by:'产品部',comps:['product.requirements','product.acceptance-design'],docs:[
    {n:'需求规格说明书模板',t:'DOCX',sz:'520 KB',by:'吴宏超',up:'2026/8/20',pg:10},
    {n:'验收条件编写指引',t:'PDF',sz:'760 KB',by:'吴宏超',up:'2026/7/15',pg:7}]},
  {id:'kn-quality-gate',name:'交付质量门禁',by:'质量部',comps:['quality.verification','quality.regression-analysis','delivery.orchestration','delivery.integration'],docs:[
    {n:'发布准入检查清单',t:'PDF',sz:'980 KB',by:'陈亮',up:'2026/8/17',pg:9},
    {n:'回归范围评估方法',t:'DOCX',sz:'450 KB',by:'陈亮',up:'2026/7/2',pg:8}]},
  {id:'kn-sec-checklist',name:'安全评审清单',by:'安全组',comps:['application-security','filesystem-safety'],docs:[
    {n:'应用安全威胁建模清单',t:'PDF',sz:'1.3 MB',by:'马涛',up:'2026/8/14',pg:13},
    {n:'越权与绕过场景库',t:'DOCX',sz:'610 KB',by:'马涛',up:'2026/6/11',pg:10}]},
  {id:'kn-code-spec',name:'编码规范与评审基线',by:'工程效能组',comps:['engineering.implementation','implementation-correctness','concurrent-commit-model'],docs:[
    {n:'代码提交与分支约定',t:'PDF',sz:'700 KB',by:'陈亮',up:'2026/8/12',pg:9},
    {n:'实现正确性评审要点',t:'DOCX',sz:'510 KB',by:'黄成',up:'2026/7/24',pg:12}]},
  {id:'kn-arch-adr',name:'架构决策记录（ADR）',by:'架构组',comps:['architecture.system-design','architecture.reliability','software.analysis'],docs:[
    {n:'历史架构决策汇编 2024-2026',t:'PDF',sz:'4.2 MB',by:'黄成',up:'2026/8/19',pg:32},
    {n:'技术选型评估维度',t:'MD',sz:'26 KB',by:'黄成',up:'2026/7/27',pg:4}]}
];
var KN_MAP={};
KN_DIRS.forEach(function(d){ KN_MAP[d.id]=d; });

function knDir(id){ return KN_MAP[id]||null; }

/* ---------- 知识分层：预置知识 / 自己的知识 ----------
   预置知识——只有 Lingee 内置专家才有，是平台按专家的能力项预先配好的，
     不能查看也不能改；要动就去改专家自己的能力项，那是另一件事。
   自己的知识——关联的企业知识目录 + 自己上传的文件，预置专家、自己创建的专家都能加。
   内置专家是静态共享数据，改不了；用户在内置专家身上加的知识落在这个按专家 id
   存的覆盖层里，不污染专家本身的定义。 */
var KN_OVERLAY_KEY='lingee.knowledge-overlay.v1';
var KN_OVERLAY_SEED_KEY='lingee.knowledge-overlay.seeded.v1';
var knOverlay=loadKnOverlay();
seedKnOverlayDemo();
function loadKnOverlay(){
  try{
    var raw=localStorage.getItem(KN_OVERLAY_KEY);
    var d=raw?JSON.parse(raw):null;
    return (d&&typeof d==='object')?d:{};
  }catch(err){ return {}; }
}
function saveKnOverlay(){
  try{ localStorage.setItem(KN_OVERLAY_KEY, JSON.stringify(knOverlay)); }catch(err){ /* 隐私模式/配额满，原型退化为内存态 */ }
}
/* 首次进入时给几个内置专家灌一点「自己的知识」demo 数据，免得每个专家的这一节都是空的；
   只在覆盖层完全没数据、也没种过时灌一次，不会覆盖用户自己后续加的内容 */
function seedKnOverlayDemo(){
  var seeded=false;
  try{ seeded=!!localStorage.getItem(KN_OVERLAY_SEED_KEY); }catch(err){}
  if(seeded||Object.keys(knOverlay).length) return;
  var demo={
    'software-architect':{kn:['kn-quality-gate'],knUp:[
      {n:'团队架构评审纪要_2026Q3.docx',t:'DOCX',sz:'560 KB',up:'2026/9/12',by:'我'}]},
    'frontend-engineer':{kn:['kn-req-template'],knUp:[]},
    'cosmic-form':{kn:[],knUp:[
      {n:'客户定制字段清单.xlsx',t:'XLSX',sz:'128 KB',up:'2026/9/8',by:'我'}]},
    'software-qa-engineer':{kn:['kn-sec-checklist'],knUp:[]}
  };
  Object.keys(demo).forEach(function(id){
    knOverlay[id]={kn:demo[id].kn.slice(),knUp:demo[id].knUp.slice(),knDocOff:[]};
  });
  saveKnOverlay();
  try{ localStorage.setItem(KN_OVERLAY_SEED_KEY,'1'); }catch(err){}
}
function knOverlayRec(id){ return knOverlay[id]||{kn:[],knUp:[],knDocOff:[]}; }
function knOverlayMut(id){
  if(!knOverlay[id]) knOverlay[id]={kn:[],knUp:[],knDocOff:[]};
  return knOverlay[id];
}
/* 是不是「预置专家」——只有这种专家才有预置知识这一层，规则上不可查看也不可改；
   预置专家「自己的知识」跟自建专家一样，既能关联企业知识目录，也能直接上传文件，
   只是落在覆盖层里，不污染预置定义。自己创建的专家没有平台预置一说，
   关联的知识和上传的文件都直接存在专家记录上 */
function isPresetExpert(e){ return !(e&&e.mine); }
/* 手动关联的目录：预置专家走覆盖层，自建专家直接存在专家记录上 */
function knLinkedIds(e){ return isPresetExpert(e) ? (knOverlayRec(e.id).kn||[]) : ((e&&e.kn)||[]); }
function knOffIds(e){ return isPresetExpert(e) ? [] : ((e&&e.knOff)||[]); }
/* 关联目录里被单独排除的文档（key 是「目录id#下标」）：目录整体还关联着，
   但这几篇不参与检索——比默认的「整目录关联」多一级颗粒度 */
function knDocOffIds(e){ return isPresetExpert(e) ? (knOverlayRec(e.id).knDocOff||[]) : ((e&&e.knDocOff)||[]); }
/* 自己上传的文件：预置专家走覆盖层（不污染预置定义），自建专家直接存在专家记录上 */
function knUploads(e){ return isPresetExpert(e) ? (knOverlayRec(e.id).knUp||[]) : ((e&&e.knUp)||[]); }
/* 一个目录里刨去被单独排除的文档，还剩多少篇真正参与检索 */
function knDirVisibleCount(dir,offDocs){
  if(!offDocs||!offDocs.length) return dir.docs.length;
  var n=0;
  dir.docs.forEach(function(doc,i){ if(offDocs.indexOf(knDocKey(dir.id,i))<0) n++; });
  return n;
}

/* 一个专家有多个能力项（技能标签），每个标签各管各的知识——不是挂到专家身上的一个大池子。
   目录声明自己服务哪些能力项，按专家的能力项列表分组，标签之间互不影响。
   预置专家的这一层是「预置知识」，规则上不可查看，这里直接不产出任何分组。 */
function compGroupsOf(e){
  if(isPresetExpert(e)) return [];
  var seen={}, groups=[];
  ((e&&e.comp)||[]).forEach(function(v){
    var c=parseComp(v);
    if(!c.id||seen[c.id]) return;
    seen[c.id]=1;
    groups.push({id:c.id,name:c.name,level:c.level,
      dirs:KN_DIRS.filter(function(d){ return (d.comps||[]).indexOf(c.id)>=0; })});
  });
  return groups;
}
/* 手动关联、但不挂在任何能力项标签下的目录——比如这位专家没声明对应能力项，只是临时想让他查一下 */
function knManualExtra(e){
  var covered={};
  compGroupsOf(e).forEach(function(g){ g.dirs.forEach(function(d){ covered[d.id]=1; }); });
  return knLinkedIds(e).map(knDir).filter(Boolean).filter(function(d){ return !covered[d.id]; });
}
/* 专家能查到的全部目录（按标签分组的 + 手动关联的），去重；用于总数统计、搜索兜底 */
function knDirsOf(e){
  var seen={}, all=[];
  compGroupsOf(e).forEach(function(g){ g.dirs.forEach(function(d){ if(!seen[d.id]){ seen[d.id]=1; all.push(d); } }); });
  knManualExtra(e).forEach(function(d){ if(!seen[d.id]){ seen[d.id]=1; all.push(d); } });
  return all;
}
/* 挂载目录 + 单独上传，检索时一共能用到多少篇（停用的目录、单独排除的文档都不算） */
function knCountOf(e){
  var off=knOffIds(e), offDocs=knDocOffIds(e), n=0;
  knDirsOf(e).forEach(function(d){ if(off.indexOf(d.id)<0) n+=knDirVisibleCount(d,offDocs); });
  return n+knUploads(e).length;
}

/* ---------- 文档预览 ----------
   原型里没有真实文件，预览区渲染的是版式占位；真机上这里内嵌 PDF / Office 在线预览。 */
function knDocKey(dirId,i){ return dirId+'#'+i; }
function knDocOf(key){
  var p=String(key||'').split('#'), dir=knDir(p[0]);
  if(!dir) return null;
  var doc=dir.docs[+p[1]];
  return doc?{key:key,from:dir.name,dirId:dir.id,n:doc.n,t:doc.t,sz:doc.sz,by:doc.by,up:doc.up,pg:doc.pg}:null;
}
function knPvHead(d,backText){
  return '<button type="button" class="xk-pv-back" data-xk-back>‹ '+xesc(backText||'返回知识列表')+'</button>'
    +'<div class="xk-pv-head"><span class="xk-pv-ic xk-t-'+xesc(d.t)+'">'+xesc(d.t)+'</span>'
    +'<div class="xk-pv-hb"><div class="xk-pv-t">'+xesc(d.n)+'</div>'
    +'<div class="xk-pv-m"><span class="xk-doc-from">'+xesc(d.from)+'</span>'
    +xesc(d.t)+(d.sz?' · '+xesc(d.sz):'')+(d.by?' · '+xesc(d.by):'')
    +' · 最近更新 '+xesc(d.up)+'</div></div></div>';
}
/* 缩略图轨 + 正文页：页数取文档元数据，没有就按一页算 */
function knPvBody(d){
  var pg=Math.max(1,d.pg||1), rail='';
  for(var i=1;i<=Math.min(pg,8);i++){
    rail+='<div class="xk-pv-th'+(i===1?' on':'')+'"><div class="xk-pv-thp"></div><span>'+i+'</span></div>';
  }
  if(pg>8) rail+='<div class="xk-pv-more">共 '+pg+' 页</div>';
  var lines='';
  for(var j=0;j<11;j++) lines+='<div class="xk-pv-line" style="width:'+(96-((j*17)%42))+'%"></div>';
  return '<div class="xk-pv-body"><div class="xk-pv-rail">'+rail+'</div>'
    +'<div class="xk-pv-page"><div class="xk-pv-ph">'+xesc(d.from)+'</div>'
    +'<div class="xk-pv-pt">'+xesc(d.n)+'</div>'
    +'<div class="xk-pv-pm">'+xesc(d.by||'')+' · '+xesc(d.up)+' · 第 1 / '+pg+' 页</div>'
    +lines
    +'<div class="xk-pv-note">原型占位：正式环境这里内嵌 PDF / Office 在线预览，内容取平台上的当前版本。</div>'
    +'</div></div>';
}
function knPreviewHtml(d,backText){
  return '<div class="xk-pv">'+knPvHead(d,backText)+knPvBody(d)+'</div>';
}

/* ---------- 编辑器里的「知识」页签 ----------
   跟智能体开发的知识页签同一形态：左边一列目录（勾选框 + 名字 + 计数），右边文档卡片；
   顶部「＋ 添加」「⬆ 上传」两个按钮。跟能力项的关联体现在每一行目录后面的小标签上——
   按能力项自动带出的目录标着服务哪项能力，没法在这解除，要去掉得去「专家」页签取消对应能力项；
   手动追加的目录没有标签，可以随时解除。 */
var xkDraft=null;      /* 指向 editor.js 的 xeDraft，渲染时传进来 */
var xkPick='';         /* 右侧文档列表当前看的是哪个目录：'' 全部 / 目录 id / '__up' 上传知识 */
var xkKw='';
var xkPv=null;         /* 正在预览的文档，null = 显示列表 */

function knFileType(name){
  var m=/\.([a-z0-9]{1,6})$/i.exec(String(name||''));
  return m?m[1].toUpperCase():'FILE';
}
function knToday(){
  var d=new Date();
  return d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate();
}
function knHit(text){
  return !xkKw || String(text||'').toLowerCase().indexOf(xkKw.toLowerCase())>=0;
}
/* 目录 id → 挂靠的能力项名字（可能不止一个），只有走能力项自动带出的目录才有 */
function knSkillTagsOf(d){
  var map={};
  compGroupsOf(d).forEach(function(g){
    g.dirs.forEach(function(dir){ (map[dir.id]=map[dir.id]||[]).push(g.name); });
  });
  return map;
}
/* 专家关联的全部目录，按「能力项自动带出的」在前、「手动追加的」在后排 */
function knFlatDirs(d){
  var skillOf=knSkillTagsOf(d), seen={}, autoList=[];
  compGroupsOf(d).forEach(function(g){
    g.dirs.forEach(function(dir){ if(!seen[dir.id]){ seen[dir.id]=1; autoList.push(dir); } });
  });
  return {autoDirs:autoList, extra:knManualExtra(d), skillOf:skillOf};
}
function knPickDirs(d){
  if(xkPick==='__up') return [];
  if(xkPick){ var one=knDir(xkPick); return one?[one]:[]; }
  return knDirsOf(d);
}
/* 右侧要显示的文档：来源目录 + 上传件铺平成一个列表 */
function knRows(){
  var d=xkDraft; if(!d) return [];
  var offDocs=d.knDocOff||[], rows=[];
  knPickDirs(d).forEach(function(dir){
    dir.docs.forEach(function(doc,i){
      var key=knDocKey(dir.id,i);
      rows.push({key:key,from:dir.name,dirId:dir.id,off:offDocs.indexOf(key)>=0,
                 n:doc.n,t:doc.t,sz:doc.sz,by:doc.by,up:doc.up,pg:doc.pg});
    });
  });
  if(!xkPick||xkPick==='__up'){
    (d.knUp||[]).forEach(function(f,i){
      rows.push({from:'上传知识',dirId:'__up',idx:i,n:f.n,t:f.t,sz:f.sz,up:f.up,by:f.by||'我',pg:1});
    });
  }
  return rows.filter(function(r){ return knHit(r.n)||knHit(r.from)||knHit(r.by); });
}
/* r.key 存在（来自企业知识目录）时带一个勾选框，勾掉表示把这一篇单独排除在检索之外，
   目录本身还是关联着；上传知识用 dirId==='__up' 标识，只有移除没有排除 */
function knDocCard(r){
  var toggle=r.locked
    ? '<span class="xk-doc-lock" title="官方维护，不可修改">🔒</span>'
    : r.key
    ? '<span class="xk-ck'+(r.off?'':' ck')+'" data-xk-doc-toggle="'+r.key+'" role="checkbox" aria-checked="'+(!r.off)+'" title="'+(r.off?'已排除，检索时跳过':'检索时包含这篇')+'"></span>'
    : '';
  return '<div class="xk-doc'+(r.key?' xk-doc-pv':'')+'"'+(r.key?' data-xk-pv="'+r.key+'"':'')+'>'
    +'<div class="xk-doc-top">'+toggle+'<span class="xk-doc-from">'+xesc(r.from)+'</span>'
    +'<span class="xk-doc-t">'+xesc(r.t)+(r.sz?' · '+xesc(r.sz):'')+'</span>'
    +(r.dirId==='__up'?'<button type="button" class="x-ic x-ic-dg xk-doc-x" data-xk-rmup="'+r.idx+'" title="移除">✕</button>':'')
    +'</div>'
    +'<div class="xk-doc-n">'+xesc(r.n)+'</div>'
    +'<div class="xk-doc-m">最近更新 '+xesc(r.up)+' · '+xesc(r.by||'')+'</div></div>';
}
/* 单个目录行：勾选框 + 名字 + [能力项标签] + 篇数（刨去单独排除的） + (手动追加的才有解除按钮) */
function knDirRow(dir,off,pick,skillNames,offDocs){
  var on=off.indexOf(dir.id)<0;
  return '<div class="xk-dir'+(pick===dir.id?' on':'')+'" data-xk-dir="'+dir.id+'">'
    +'<div class="xk-dir-row1">'
    +'<span class="xk-ck'+(on?' ck':'')+'" data-xk-toggle="'+dir.id+'" role="checkbox" aria-checked="'+on+'" title="'+(on?'检索时使用这个目录':'已停用，检索时跳过')+'"></span>'
    +'<span class="xk-dir-ic">📁</span>'
    +'<span class="xk-dir-n">'+xesc(dir.name)+'</span>'
    +'<span class="xk-dir-c">'+knDirVisibleCount(dir,offDocs)+'</span>'
    +(skillNames?'':'<button type="button" class="x-ic x-ic-dg xk-dir-x" data-xk-unlink="'+dir.id+'" title="解除关联">✕</button>')
    +'</div>'
    +(skillNames?'<div class="xk-dir-tag" title="随「'+xesc(skillNames.join('、'))+'」能力项自动带出">'+xesc(skillNames[0])+(skillNames.length>1?' +'+(skillNames.length-1):'')+'</div>':'')
    +'</div>';
}
function renderKnPane(draft){
  if(draft) xkDraft=draft;
  var d=xkDraft; if(!d||!$('#xkSide')) return;
  var off=d.knOff||[], offDocs=d.knDocOff||[], flat=knFlatDirs(d), all=flat.autoDirs.concat(flat.extra);

  var side='<div class="xk-grp">关联企业知识</div>';
  side+=all.length ? all.map(function(dir){
    return knDirRow(dir,off,xkPick,flat.skillOf[dir.id],offDocs);
  }).join('') : '<div class="xk-none">还没关联企业知识目录，勾几项能力项会自动带出，也可以手动添加</div>';

  side+='<div class="xk-grp">上传知识</div>';
  side+=(d.knUp&&d.knUp.length)
    ? d.knUp.map(function(f,i){
        return '<div class="xk-dir'+(xkPick==='__up'?' on':'')+'" data-xk-dir="__up"><div class="xk-dir-row1">'
          +'<span class="xk-ck ck" aria-hidden="true"></span><span class="xk-dir-ic">📄</span>'
          +'<span class="xk-dir-n">'+xesc(f.n)+'</span>'
          +'<button type="button" class="x-ic x-ic-dg xk-dir-x" data-xk-rmup="'+i+'" title="移除">✕</button></div></div>';
      }).join('')
    : '<div class="xk-none">暂无</div>';
  $('#xkSide').innerHTML=side;

  if(xkPv){ $('#xkDocs').innerHTML=knPreviewHtml(xkPv); return; }
  var rows=knRows();
  $('#xkDocs').innerHTML = rows.length
    ? rows.map(knDocCard).join('')
    : '<div class="xk-empty">'+(xkKw?'没有匹配「'+xesc(xkKw)+'」的知识':'左边关联一个企业知识目录，或直接上传文件')+'</div>';
}
/* 每次打开编辑器都从全部、无关键词开始，避免上一位专家的筛选串到下一位 */
function resetKnPane(draft){ xkDraft=draft; xkPick=''; xkKw=''; xkPv=null;
  var s=$('#xkSearch'); if(s) s.value=''; }

/* ---------- 详情弹窗里的「知识」一节 ----------
   自建专家点击直接进编辑器（用上面的 renderKnPane），不再走详情弹窗；
   这一节此后只服务预置专家，跟编辑器共用同一套外壳（工具条 + 说明 + 左右两栏），
   「自己的知识」跟编辑器一样既能关联企业知识目录也能上传文件，只是多一行锁住的预置知识。
   改动先落在草稿里，点「保存」才写回覆盖层——跟编辑器表单要点保存才生效是一个心智模型。 */
var xkDetailEx=null;   /* 详情弹窗当前是哪位专家，重绘这一节时要用 */
var xkDetailDraft=null;/* {kn:[],knUp:[]} 当前专家未保存的草稿 */
var xkDetailPv=null;   /* 详情里正在预览的文档 */
var xkDetailKw='';     /* 详情里的知识搜索关键字 */
var xkDetailPick='';   /* 右侧当前只看哪一组：'' 全部 / 目录id（含预置） / '__myup' 自己上传的文件 */
function resetKnDetail(){ xkDetailEx=null; xkDetailDraft=null; xkDetailPv=null; xkDetailKw=''; xkDetailPick=''; }
function xkDetailDraftFor(e){
  if(!xkDetailDraft){
    var rec=knOverlayRec(e.id);
    xkDetailDraft={kn:(rec.kn||[]).slice(), knDocOff:(rec.knDocOff||[]).slice(),
      knUp:(rec.knUp||[]).map(function(f){return {n:f.n,t:f.t,sz:f.sz,up:f.up,by:f.by}})};
  }
  return xkDetailDraft;
}
/* 预置知识按专家原本的能力项去数企业知识库里挂了哪些目录——跟专家页签里
   「按能力项自动带出」是同一套映射，只是这里不允许解除、不允许改，只能看名字 */
function presetKnDirsOf(e){
  var seen={}, dirs=[];
  ((e&&e.comp)||[]).forEach(function(v){
    var id=parseComp(v).id; if(!id) return;
    KN_DIRS.forEach(function(d){
      if(!seen[d.id] && (d.comps||[]).indexOf(id)>=0){ seen[d.id]=1; dirs.push(d); }
    });
  });
  return dirs;
}
/* 预置专家：跟编辑器同一套外壳（工具条 + 说明 + 左右两栏）。预置知识可以看目录名和文件名，
   但不能解除、不能改；「知识扩展」是这位专家自己加的，能关联企业知识目录，也能上传文件——
   两块都以「目录」的形式摆在左边，点一个目录就只看这个目录里有什么 */
function knSecHtmlPreset(e){
  var draft=xkDetailDraftFor(e);
  if(xkDetailPv){
    var innerPv=knPreviewHtml(xkDetailPv,'返回知识列表');
    return '<div class="x-sec" id="xkSec"><div class="x-sec-t">知识</div>'+innerPv+'</div>';
  }
  var presetDirs=presetKnDirsOf(e);
  var dirs=(draft.kn||[]).map(knDir).filter(Boolean), ups=draft.knUp||[], offDocs=draft.knDocOff||[];
  if(xkDetailPick && xkDetailPick!=='__myup'
    && presetDirs.every(function(d){return d.id!==xkDetailPick;})
    && dirs.every(function(d){return d.id!==xkDetailPick;})) xkDetailPick='';
  var bar='<div class="xk-bar"><button type="button" class="xk-btn" id="xkDtlAddBtn">＋ 添加</button>'
    +'<button type="button" class="xk-btn" id="xkDtlUpBtn">⬆ 上传</button>'
    +'<div class="xk-bar-sp"></div>'
    +'<input type="search" class="xk-search" id="xkDtlSearch" placeholder="搜索知识目录、文件名或创建者" autocomplete="off" value="'+xesc(xkDetailKw)+'"></div>';
  var hint='<div class="xk-hint">预置知识由官方按能力项配置，可以看有哪些目录和文件，但不能修改；知识扩展支持关联企业知识目录，或上传属于你自己的文件。</div>';
  var side='<div class="xk-grp">预置知识</div>'
    +(presetDirs.length ? presetDirs.map(function(dir){
        return '<div class="xk-dir'+(xkDetailPick===dir.id?' on':'')+'" data-xk-dtl-pick="'+dir.id+'"><div class="xk-dir-row1">'
          +'<span class="xk-dir-ic">🔒</span><span class="xk-dir-n">'+xesc(dir.name)+'</span>'
          +'<span class="xk-dir-c">'+dir.docs.length+'</span></div></div>';
      }).join('') : '<div class="xk-none">这位专家没有预置知识</div>')
    +'<div class="xk-grp">知识扩展</div>'
    +(dirs.map(function(dir){
        return '<div class="xk-dir'+(xkDetailPick===dir.id?' on':'')+'" data-xk-dtl-pick="'+dir.id+'"><div class="xk-dir-row1">'
          +'<span class="xk-dir-ic">📁</span><span class="xk-dir-n">'+xesc(dir.name)+'</span>'
          +'<span class="xk-dir-c">'+knDirVisibleCount(dir,offDocs)+'</span>'
          +'<button type="button" class="x-ic x-ic-dg xk-dir-x" data-xk-dtl-unlink="'+dir.id+'" title="解除关联">✕</button></div></div>';
      }).join('')
      +(ups.length ? '<div class="xk-dir'+(xkDetailPick==='__myup'?' on':'')+'" data-xk-dtl-pick="__myup"><div class="xk-dir-row1">'
        +'<span class="xk-dir-ic">📁</span><span class="xk-dir-n">我上传的文件</span>'
        +'<span class="xk-dir-c">'+ups.length+'</span></div></div>' : '')
      || '<div class="xk-none">暂无，点上面「＋ 添加」关联目录，或「⬆ 上传」加几个文件</div>');
  var rows=[], showAll=!xkDetailPick;
  if(showAll||presetDirs.some(function(d){return d.id===xkDetailPick;})){
    presetDirs.filter(function(d){return showAll||d.id===xkDetailPick;}).forEach(function(dir){
      dir.docs.forEach(function(doc){ rows.push({from:dir.name,dirId:dir.id,locked:true,n:doc.n,t:doc.t,sz:doc.sz,by:doc.by,up:doc.up}); });
    });
  }
  if(showAll||dirs.some(function(d){return d.id===xkDetailPick;})){
    dirs.filter(function(d){return showAll||d.id===xkDetailPick;}).forEach(function(dir){
      dir.docs.forEach(function(doc,i){
        var key=knDocKey(dir.id,i);
        rows.push({key:key,from:dir.name,dirId:dir.id,off:offDocs.indexOf(key)>=0,n:doc.n,t:doc.t,sz:doc.sz,by:doc.by,up:doc.up,pg:doc.pg});
      });
    });
  }
  if(showAll||xkDetailPick==='__myup'){
    ups.forEach(function(f,i){ rows.push({from:'我上传的文件',dirId:'__up',idx:i,n:f.n,t:f.t,sz:f.sz,up:f.up,by:f.by||'我'}); });
  }
  var kw=xkDetailKw.trim().toLowerCase();
  if(kw) rows=rows.filter(function(r){
    return [r.n,r.from,r.by].some(function(v){ return String(v||'').toLowerCase().indexOf(kw)>=0; });
  });
  var docs=rows.length ? rows.map(knDocCard).join('')
    : '<div class="xk-empty">'+(xkDetailKw?'没有匹配「'+xesc(xkDetailKw)+'」的知识':'左边点一个目录，看看里面有什么')+'</div>';
  var inner=bar+hint+'<div class="xk-cols"><div class="xk-side">'+side+'</div><div class="xk-docs">'+docs+'</div></div>';
  return '<div class="x-sec" id="xkSec"><div class="x-sec-t">知识</div>'+inner+'</div>';
}
function knSecHtml(e){
  /* 详情弹窗只有预置专家会打开（自建专家点击直接进编辑器），非预置专家不应该走到这里 */
  if(!isPresetExpert(e)) return '';
  xkDetailEx=e;
  return knSecHtmlPreset(e);
}
/* 详情里只重绘知识这一节，别整块重建，免得弹窗滚动位置跳掉 */
function reRenderKnSec(e){
  var sec=$('#xkSec'); if(!sec) return;
  /* 搜索框也在这段 HTML 里，整节重建会把它连带光标一起冲掉——记下来重建后再还原 */
  var active=document.activeElement, wasSearch=active&&active.id==='xkDtlSearch';
  var caret=wasSearch?active.selectionStart:null;
  var html=knSecHtml(e);
  var box=document.createElement('div'); box.innerHTML=html;
  sec.replaceWith(box.firstChild);
  if(wasSearch){
    var ni=$('#xkDtlSearch');
    if(ni){ ni.focus(); try{ ni.setSelectionRange(caret,caret); }catch(err){} }
  }
}

/* ---------- 「添加企业知识」弹窗 ----------
   点「＋ 添加」弹出的独立模态框：左边勾选目录（跟能力项已经带出的不重复出现），
   右边看点中那个目录里有哪些文档，点「确定」才写回草稿。 */
var knPickModal=$('#knPickModal');
var knPickSel=[];      /* 弹窗里已勾选的目录 id，确定时整批写回 xkDraft.kn */
var knPickActive='';   /* 右侧正在看哪个目录的文档 */
var knPickKw='';
var knPickCovered=[];   /* 已经按能力项自动带出的目录 id，不用在弹窗里再选一遍 */
var knPickDocOff=[];    /* 目录整体关联着，但被单独排除的文档 key（目录id#下标） */
var knPickOnConfirm=null;
function knPickList(){
  var kw=knPickKw.trim().toLowerCase();
  return KN_DIRS.filter(function(d){
    if(knPickCovered.indexOf(d.id)>=0) return false;
    if(!kw) return true;
    return (d.name+d.by).toLowerCase().indexOf(kw)>=0;
  });
}
/* opts: {current:[已勾选的目录id], covered:[按能力项带出、不用再选的目录id],
   docOff:[已排除的文档key], onConfirm:function(ids,docOff){}} */
function openKnPickModal(opts){
  if(!knPickModal) return;
  opts=opts||{};
  knPickSel=(opts.current||[]).slice();
  knPickCovered=opts.covered||[];
  knPickDocOff=(opts.docOff||[]).slice();
  knPickOnConfirm=opts.onConfirm||null;
  knPickActive=''; knPickKw='';
  var s=$('#knPickSearch'); if(s) s.value='';
  renderKnPick();
  knPickModal.classList.add('show');
}
function renderKnPick(){
  var rows=knPickList();
  if(knPickActive && rows.every(function(d){return d.id!==knPickActive;})) knPickActive='';
  $('#knPickSide').innerHTML = rows.length ? rows.map(function(d){
    var on=knPickSel.indexOf(d.id)>=0;
    return '<div class="kn-pick-row'+(knPickActive===d.id?' active':'')+'" data-kp-dir="'+d.id+'">'
      +'<span class="kn-pick-ck'+(on?' ck':'')+'" data-kp-toggle="'+d.id+'" role="checkbox" aria-checked="'+on+'"></span>'
      +'<span class="xk-dir-ic">📁</span><span class="kn-pick-n">'+xesc(d.name)+'</span>'
      +'<span class="kn-pick-c">'+knDirVisibleCount(d,knPickDocOff)+'</span></div>';
  }).join('') : '<div class="xk-none">'+(knPickKw?'没有匹配「'+xesc(knPickKw)+'」的目录':'租户知识库里的目录都已经关联了')+'</div>';
  var activeDir=knDir(knPickActive);
  $('#knPickDocs').innerHTML = activeDir
    ? (activeDir.docs.length ? activeDir.docs.map(function(doc,i){
        var key=knDocKey(activeDir.id,i), off=knPickDocOff.indexOf(key)>=0;
        return '<div class="xk-doc"><div class="xk-doc-top">'
          +'<span class="xk-ck'+(off?'':' ck')+'" data-kp-doc-toggle="'+key+'" role="checkbox" aria-checked="'+(!off)+'" title="'+(off?'已排除，检索时跳过':'检索时包含这篇')+'"></span>'
          +'<span class="xk-doc-from">'+xesc(activeDir.name)+'</span>'
          +'<span class="xk-doc-t">'+xesc(doc.t)+(doc.sz?' · '+xesc(doc.sz):'')+'</span></div>'
          +'<div class="xk-doc-n">'+xesc(doc.n)+'</div>'
          +'<div class="xk-doc-m">最近更新 '+xesc(doc.up)+' · '+xesc(doc.by||'')+'</div></div>';
      }).join('') : '<div class="xk-empty">这个目录暂时没有文档</div>')
    : '<div class="xk-empty">左边点一个知识目录，看看里面有什么</div>';
  $('#knPickCount').innerHTML='已选 <b>'+knPickSel.length+'</b> 个知识目录';
}

export function initExpertKnowledge() {
  var box=$('#expertEditModal');
  var side=$('#xkSide'), docs=$('#xkDocs');

  if($('#xkAddBtn')) $('#xkAddBtn').addEventListener('click',function(){
    var covered=[]; compGroupsOf(xkDraft).forEach(function(g){ g.dirs.forEach(function(d){ covered.push(d.id); }); });
    openKnPickModal({current:xkDraft.kn||[],covered:covered,docOff:xkDraft.knDocOff||[],onConfirm:function(ids,docOff){
      xkDraft.kn=ids;
      xkDraft.knDocOff=docOff||[];
      /* 目录被取消勾选就不再关联，之前挂在它身上的停用标记也一并清掉 */
      var still=knDirsOf(xkDraft).map(function(d){return d.id});
      xkDraft.knOff=(xkDraft.knOff||[]).filter(function(id){ return still.indexOf(id)>=0; });
      renderKnPane();
    }});
  });
  if(knPickModal){
    var kpSide=$('#knPickSide');
    $('#knPickClose').addEventListener('click',function(){ knPickModal.classList.remove('show') });
    $('#knPickCancel').addEventListener('click',function(){ knPickModal.classList.remove('show') });
    knPickModal.addEventListener('click',function(ev){ if(ev.target===knPickModal) knPickModal.classList.remove('show'); });
    $('#knPickSearch').addEventListener('input',function(){ knPickKw=this.value; renderKnPick(); });
    if(kpSide) kpSide.addEventListener('click',function(ev){
      var t=ev.target.closest('[data-kp-toggle]');
      if(t){
        var id=t.getAttribute('data-kp-toggle'), i=knPickSel.indexOf(id);
        if(i<0) knPickSel.push(id); else knPickSel.splice(i,1);
        renderKnPick(); return;
      }
      var r=ev.target.closest('[data-kp-dir]');
      if(r){ knPickActive=r.getAttribute('data-kp-dir'); renderKnPick(); }
    });
    var kpDocs=$('#knPickDocs');
    if(kpDocs) kpDocs.addEventListener('click',function(ev){
      var dt=ev.target.closest('[data-kp-doc-toggle]');
      if(!dt) return;
      var key=dt.getAttribute('data-kp-doc-toggle'), i=knPickDocOff.indexOf(key);
      if(i<0) knPickDocOff.push(key); else knPickDocOff.splice(i,1);
      renderKnPick();
    });
    $('#knPickOk').addEventListener('click',function(){
      var cb=knPickOnConfirm, ids=knPickSel.slice();
      /* 排除标记只对还勾着的目录有意义，目录被取消勾选就把它的排除记录一并丢掉 */
      var docOff=knPickDocOff.filter(function(k){ return ids.indexOf(k.split('#')[0])>=0; });
      knPickModal.classList.remove('show');
      if(cb) cb(ids,docOff);
    });
  }
  if($('#xkUpBtn')) $('#xkUpBtn').addEventListener('click',function(){
    var f=$('#xkFile'); if(f) f.click();
  });
  if($('#xkFile')) $('#xkFile').addEventListener('change',function(){
    if(!xkDraft) return;
    var list=Array.prototype.slice.call(this.files||[]);
    if(!list.length) return;
    xkDraft.knUp=(xkDraft.knUp||[]).concat(list.map(function(file){
      return {n:file.name,t:knFileType(file.name),sz:Math.max(1,Math.round(file.size/1024))+' KB',up:knToday(),by:'我'};
    }));
    this.value='';
    xkPv=null; renderKnPane();
    toast('已加入 '+list.length+' 个文件，保存后生效','success');
  });
  if($('#xkSearch')) $('#xkSearch').addEventListener('input',function(){
    xkKw=this.value; xkPv=null; renderKnPane();
  });

  if(side) side.addEventListener('click',function(ev){
    var t=ev.target.closest('[data-xk-toggle]');
    if(t){
      var id=t.getAttribute('data-xk-toggle');
      xkDraft.knOff=xkDraft.knOff||[];
      var i=xkDraft.knOff.indexOf(id);
      if(i<0) xkDraft.knOff.push(id); else xkDraft.knOff.splice(i,1);
      renderKnPane(); return;
    }
    var u=ev.target.closest('[data-xk-unlink]');
    if(u){
      var uid=u.getAttribute('data-xk-unlink');
      xkDraft.kn=(xkDraft.kn||[]).filter(function(x){ return x!==uid; });
      xkDraft.knOff=(xkDraft.knOff||[]).filter(function(x){ return x!==uid; });
      xkDraft.knDocOff=(xkDraft.knDocOff||[]).filter(function(k){ return k.split('#')[0]!==uid; });
      if(xkPick===uid) xkPick='';
      if(xkPv&&xkPv.dirId===uid) xkPv=null;
      renderKnPane(); return;
    }
    var r=ev.target.closest('[data-xk-rmup]');
    if(r){
      xkDraft.knUp.splice(+r.getAttribute('data-xk-rmup'),1);
      renderKnPane(); return;
    }
    var p=ev.target.closest('[data-xk-dir]');
    if(p){
      var pid=p.getAttribute('data-xk-dir');
      xkPick=(xkPick===pid)?'':pid;      /* 再点一次回到全部 */
      xkPv=null;
      renderKnPane(); return;
    }
  });
  if(docs) docs.addEventListener('click',function(ev){
    var dt=ev.target.closest('[data-xk-doc-toggle]');
    if(dt){
      var key=dt.getAttribute('data-xk-doc-toggle');
      xkDraft.knDocOff=xkDraft.knDocOff||[];
      var di=xkDraft.knDocOff.indexOf(key);
      if(di<0) xkDraft.knDocOff.push(key); else xkDraft.knDocOff.splice(di,1);
      renderKnPane(); return;
    }
    if(ev.target.closest('[data-xk-back]')){ xkPv=null; renderKnPane(); return; }
    var v=ev.target.closest('[data-xk-pv]');
    if(v){ xkPv=knDocOf(v.getAttribute('data-xk-pv')); renderKnPane(); return; }
  });

  /* 预置专家在详情弹窗里手工上传知识用的文件框：详情正文是每次动态重建的，
     这个 input 不放进那段 HTML 里，单独建一个常驻的，靠 id 复用。
     上传/关联/解除都先落草稿，点「保存」才写回覆盖层并持久化 */
  var xkDtlFile=document.createElement('input');
  xkDtlFile.type='file'; xkDtlFile.multiple=true; xkDtlFile.hidden=true; xkDtlFile.id='xkDtlFile';
  document.body.appendChild(xkDtlFile);
  xkDtlFile.addEventListener('change',function(){
    var e=xkDetailEx; if(!e) return;
    var list=Array.prototype.slice.call(this.files||[]);
    if(!list.length) return;
    var draft=xkDetailDraftFor(e);
    draft.knUp=(draft.knUp||[]).concat(list.map(function(file){
      return {n:file.name,t:knFileType(file.name),sz:Math.max(1,Math.round(file.size/1024))+' KB',up:knToday(),by:'我'};
    }));
    this.value='';
    reRenderKnSec(e);
    toast('已加入 '+list.length+' 个文件，记得点「保存」','info');
  });

  /* 详情弹窗：只有预置专家会打开，添加/上传/移除自己的知识，点「保存」才生效 */
  var body=$('#expertModalBody');
  if(body) body.addEventListener('click',function(ev){
    if(!ev.target.closest('#xkSec')) return;
    var e=xkDetailEx; if(!e) return;
    var dt=ev.target.closest('[data-xk-doc-toggle]');
    if(dt){
      var dtKey=dt.getAttribute('data-xk-doc-toggle'), draftT=xkDetailDraftFor(e);
      draftT.knDocOff=draftT.knDocOff||[];
      var dti=draftT.knDocOff.indexOf(dtKey);
      if(dti<0) draftT.knDocOff.push(dtKey); else draftT.knDocOff.splice(dti,1);
      reRenderKnSec(e); return;
    }
    if(ev.target.closest('[data-xk-back]')){ xkDetailPv=null; reRenderKnSec(e); return; }
    var pv=ev.target.closest('[data-xk-pv]');
    if(pv){ xkDetailPv=knDocOf(pv.getAttribute('data-xk-pv')); reRenderKnSec(e); return; }
    if(ev.target.closest('#xkDtlUpBtn')){ xkDtlFile.click(); return; }
    if(ev.target.closest('#xkDtlAddBtn')){
      var draft0=xkDetailDraftFor(e);
      openKnPickModal({current:draft0.kn||[],covered:[],docOff:draft0.knDocOff||[],onConfirm:function(ids,docOff){
        draft0.kn=ids;
        draft0.knDocOff=docOff||[];
        reRenderKnSec(e);
      }});
      return;
    }
    var un=ev.target.closest('[data-xk-dtl-unlink]');
    if(un){
      var uid=un.getAttribute('data-xk-dtl-unlink'), dr=xkDetailDraftFor(e);
      dr.kn=(dr.kn||[]).filter(function(x){ return x!==uid; });
      dr.knDocOff=(dr.knDocOff||[]).filter(function(k){ return k.split('#')[0]!==uid; });
      if(xkDetailPick===uid) xkDetailPick='';
      reRenderKnSec(e);
      return;
    }
    var rm=ev.target.closest('[data-xk-drmup],[data-xk-rmup]');
    if(rm){
      var idx=rm.getAttribute('data-xk-drmup')||rm.getAttribute('data-xk-rmup');
      xkDetailDraftFor(e).knUp.splice(+idx,1);
      reRenderKnSec(e);
      return;
    }
    var pk=ev.target.closest('[data-xk-dtl-pick]');
    if(pk){
      var pid=pk.getAttribute('data-xk-dtl-pick');
      xkDetailPick=(xkDetailPick===pid)?'':pid;
      reRenderKnSec(e);
      return;
    }
  });
  if(body) body.addEventListener('input',function(ev){
    if(ev.target.id!=='xkDtlSearch') return;
    xkDetailKw=ev.target.value;
    reRenderKnSec(xkDetailEx);
  });
  return box;
}
/* 详情弹窗底部「保存」按钮：footer 跟正文分开重建，点击由 library.js 转发过来 */
function saveKnDetail(e){
  if(!e) return;
  var rec=knOverlayMut(e.id), d=xkDetailDraftFor(e);
  rec.kn=(d.kn||[]).slice();
  rec.knDocOff=(d.knDocOff||[]).slice();
  rec.knUp=(d.knUp||[]).map(function(f){return {n:f.n,t:f.t,sz:f.sz,up:f.up,by:f.by}});
  saveKnOverlay();
  toast('知识已保存','success');
}

export { KN_DIRS, knCountOf, knDir, knDirsOf, knSecHtml, renderKnPane, resetKnDetail, resetKnPane, saveKnDetail };
