import '../../styles/pages/skill-center.css';
import { $, $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { requestDeleteConfirmation } from '../core/delete-confirm.js';
import { setNavActive, showView } from '../core/view.js';
import { chooseRoute, demoActionToast, moreMenuItems, routeControlsHtml, routeTagHtml, showMoreMenu } from '../features/expert/asset-routes.js';
/* 能力中心 · 技能：与智能体页同一维度。「我的技能」分「个人开发」和「我添加的」两组，
   「更多技能」是还没安装的金蝶官方、企业自建技能，点 + 安装后进入「我添加的」。
   个人开发的技能点「发布」后在弹窗里选择路径：开发板块，或工作板块的企业分发（需审核）/ 个人自用（即时安装），开发与工作互斥（工作板块两条路径与原「技能开发」页的提交路径一致）；已添加的技能可在开发中运行。
   技能数据为原型演示数据，状态只保存在本页内存里。 */
const SOURCE_LABEL={official:'金蝶官方',tenant:'企业自建',personal:'个人开发'};
const SOURCES=['official','tenant','personal'];
const SKILLS=[
  {id:'p1',tags:'环境准备,本地部署',name:'本地环境配置',mark:'环',source:'personal',route:'work',desc:'为协作开发项目准备本地环境：复用已有账号或在登录窗口授权，默认保存代码，需要时选择已有目录。'},
  {id:'p2',tags:'设备运维,档案查询',name:'查询设备档案',mark:'档',source:'personal',route:'work',desc:'按设备编号或名称读取设备巡检维修系统中的型号、位置、责任人和当前状态。'},
  {id:'p3',tags:'设备运维,维修记录',name:'查询维修记录',mark:'修',source:'personal',route:'work',desc:'按设备读取近 12 个月的报修、维修原因、更换零件和维修人，只读不改。'},
  {id:'p4',tags:'问卷调研,模板',name:'问卷设计',mark:'问',source:'personal',route:'work',desc:'按调研目标生成问卷：推荐题型、设置逻辑跳转与必答校验，可套用满意度、培训评估等模板。'},
  {id:'p5',tags:'问卷调研,数据分析',name:'问卷结果分析',mark:'析',source:'personal',route:'work',desc:'汇总答卷数据，输出回收率、满意度分布、部门交叉分析和开放题关键词，生成改进建议。'},
  {id:'p6',tags:'销售,订单查询',name:'销售订单查询',mark:'销',source:'personal',route:'',desc:'查询销售订单列表及详情，支持按单据编号、客户、日期、状态等多条件筛选和结果汇总。'},
  {id:'p7',tags:'天气,查询',name:'天气预报',mark:'天',source:'personal',route:'',desc:'查询指定城市的当前天气和未来天气预报，用户询问天气、温度、降雨等信息时使用。'},
  {id:'o1',v:'V1.1.0',tags:'需求分析,验收设计',name:'苍穹需求分析',mark:'需',source:'official',installed:true,desc:'将苍穹应用目标转化为理解元数据边界且可验证的需求规格。'},
  {id:'o2',tags:'质量保障,端到端测试',name:'苍穹端到端测试',mark:'测',source:'official',installed:true,desc:'优先通过浏览器验收苍穹表单、业务流程及持久化，覆盖负向用例与交付风险。'},
  {id:'t1',tags:'设备运维,只读查询',name:'设备巡检维修查询',mark:'巡',source:'tenant',installed:true,desc:'统一查询设备档案、巡检计划和维修记录，供设备运维智能体调用。'},
  {id:'o3',tags:'云开发,CloudBase',name:'腾讯云开发 CloudBase',mark:'云',source:'official',installed:false,desc:'腾讯云开发官方技能，用于创建云函数、云数据库和静态托管。'},
  {id:'o4',tags:'元数据,表单设计',name:'苍穹元数据设计',mark:'元',source:'official',installed:false,desc:'基于需求设计苍穹表单、单据和基础资料的元数据结构与字段约束。'},
  {id:'o5',tags:'部署,云平台',name:'通用应用部署',mark:'部',source:'official',installed:false,desc:'将通用应用打包并部署到云服务器或 Kubernetes 集群，输出部署清单与回滚方案。'},
  {id:'o6',tags:'代码审查,安全',name:'代码审查',mark:'审',source:'official',installed:false,desc:'独立审查实现正确性、可维护性与安全风险，给出可执行的修改建议。'},
  {id:'t2',tags:'问卷调研,分析报告',name:'问卷调研分析',mark:'调',source:'tenant',installed:false,desc:'接入企业问卷系统答卷库，按部门、题目取数并生成部门分析报告。'},
  {id:'t3',tags:'合同,履约',name:'合同履约查询',mark:'约',source:'tenant',installed:false,desc:'查询客户合同金额、履约状态和回款进度，只读不改。'},
  {id:'t4',tags:'销售,订单',name:'销售订单管理',mark:'单',source:'tenant',installed:false,desc:'销售订单创建、提交与状态查询，按企业审批规则校验必填项。'}
];
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
export function init(){
  const list=$('#scList'),filters=$('#scFilters'),search=$('#scSearch');
  let mode='mine',source='all';
  const match=s=>{const kw=search.value.trim().toLowerCase();return !kw||(s.name+s.desc).toLowerCase().includes(kw);};
  /* 发布去向与运行入口：个人开发的技能二选一（发布到开发 / 发布到工作，互斥），已添加的技能可在开发中运行；未添加的先安装 */
  function routes(s){
    if(s.source!=='personal'&&!s.installed)return '';
    const html=routeControlsHtml(s.route||'',{kind:'skill',id:s.id,personal:s.source==='personal',runAttribute:'data-sc-run'});
    return html?`<div class="asset-card-routes">${html}</div>`:'';
  }
  function card(s){
    const badge=`<span class="sc-badge ${s.source}">${SOURCE_LABEL[s.source]}</span><span class="sc-chip">${s.v||'V1.0.0'}</span>${s.source==='personal'?routeTagHtml(s.route||''):''}`;
    let action='';
    if(s.source==='personal')action=`<button type="button" class="sc-more" data-sc-more aria-haspopup="menu" aria-expanded="false" aria-label="${esc(s.name)}的更多操作" title="更多操作"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>`;
    else action=s.installed
      ?`<button type="button" class="sc-uninstall" data-sc-uninstall>卸载</button>`
      :`<button type="button" class="sc-install" data-sc-install aria-label="安装${esc(s.name)}" title="安装${esc(s.name)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>`;
    return `<article class="sc-card" data-sc="${s.id}">${action}
      <div class="sc-card-top"><span class="sc-icon" aria-hidden="true">${esc(s.mark)}</span><div class="sc-titles"><div class="sc-name" title="${esc(s.name)}">${esc(s.name)}</div><div class="sc-sub">${badge}</div></div></div>
      <p class="sc-desc" title="${esc(s.desc)}">${esc(s.desc)}</p>
      <div class="sc-tags">${s.tags.split(',').map(t=>`<span class="sc-tag">${esc(t)}</span>`).join('')}</div>${routes(s)}</article>`;
  }
  const section=(title,rows)=>rows.length?`<section class="sc-section"><h2 class="sc-section-title">${title}</h2><div class="sc-grid">${rows.map(card).join('')}</div></section>`:'';
  function paint(){
    $$('[data-sc-mode]').forEach(b=>{const on=b.dataset.scMode===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    /* 与「我的智能体」一致：来源筛选只在「我的」里出现 */
    filters.hidden=mode!=='mine';
    let html;
    if(mode==='mine'){
      const mineAll=SKILLS.filter(s=>(s.source==='personal'||s.installed)&&match(s));
      $$('[data-sc-count]').forEach(el=>{el.textContent=el.dataset.scCount==='all'?mineAll.length:mineAll.filter(s=>s.source===el.dataset.scCount).length;});
      $$('[data-sc-source]').forEach(b=>{const on=b.dataset.scSource===source;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
      const rows=mineAll.filter(s=>source==='all'||s.source===source);
      html=section('个人开发',rows.filter(s=>s.source==='personal'))+section('我添加的',rows.filter(s=>s.source!=='personal'));
    }else{
      const rows=SKILLS.filter(s=>s.source!=='personal'&&!s.installed&&match(s));
      html=rows.length?`<div class="sc-grid">${rows.map(card).join('')}</div>`:'';
    }
    list.innerHTML=html||`<p class="sc-empty">${search.value.trim()?'没有匹配的技能':mode==='more'?'没有可添加的技能':'还没有技能，去「更多技能」添加或点「新建」开发'}</p>`;
  }
  $('#scModes').addEventListener('click',e=>{const b=e.target.closest('[data-sc-mode]');if(b){mode=b.dataset.scMode;paint();}});
  filters.addEventListener('click',e=>{const b=e.target.closest('[data-sc-source]');if(b){source=b.dataset.scSource;paint();}});
  search.addEventListener('input',paint);
  $('#scCreate').addEventListener('click',()=>toast('新建技能：原型演示，将进入对话创建'));
  list.addEventListener('click',async e=>{
    const root=e.target.closest('[data-sc]');if(!root)return;
    const s=SKILLS.find(x=>x.id===root.dataset.sc);
    if(e.target.closest('[data-sc-run]')){
      showView('newtask');setNavActive('新会话');
      const input=$('#composerInput');
      if(input){input.textContent='使用「'+s.name+'」技能：';input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}
      toast('已在开发板块带上「'+s.name+'」技能发起对话','success');
    }else if(e.target.closest('[data-sc-more]')){
      /* 个人开发技能的「⋯」菜单：编辑、本地测试、云端测试、检查、发布 / 撤回发布、删除，与「技能开发」页一致 */
      const act=await showMoreMenu(e.target.closest('[data-sc-more]'),moreMenuItems('skill',s.route||''));
      if(!act)return;
      if(act==='publish'){
        const choice=await chooseRoute(s.name);
        if(choice==='dev'){s.route='dev-pending';toast('「'+s.name+'」已提交开发板块审核，通过后可在开发板块运行','success');}
        else if(choice==='work-personal'){s.route='work-personal';toast('已发布到工作板块（个人自用），安全检测通过后安装到 Work','success');}
        else if(choice==='work-enterprise'){s.route='work-pending';toast('「'+s.name+'」已提交企业分发审核，通过后在 Work 中使用','success');}
        else return;
      }else if(act==='withdraw'){s.route='';toast('已撤回发布');}
      else if(act==='delete'){
        if(!await requestDeleteConfirmation('确定删除技能「'+s.name+'」吗？删除后不可恢复。'))return;
        SKILLS.splice(SKILLS.indexOf(s),1);toast('已删除技能「'+s.name+'」');
      }else{toast(demoActionToast(act,s.name),act==='check'?'success':undefined);return;}
      paint();
    }else if(e.target.closest('[data-sc-install]')){s.installed=true;paint();toast('已添加技能「'+s.name+'」','success');}
    else if(e.target.closest('[data-sc-uninstall]')){
      if(await requestDeleteConfirmation('确定卸载技能「'+s.name+'」吗？卸载后可在「更多技能」中重新安装。',{title:'确认卸载',confirmLabel:'确认卸载'})){s.installed=false;paint();toast('已卸载技能「'+s.name+'」');}
    }
  });
  paint();
}
