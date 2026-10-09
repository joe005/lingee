import { $, $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { applyMode, navItems, setNavActive, showView } from '../core/view.js';
import { appDd, appDisplayName, chatAppDd, fullAppData, selectApp, selectChatApp } from './attach-app.js';
import { syncTogglePreviewBtn } from './chat.js';
import { closeAgentConfig, openAgentConfig } from './agent-config.js';
import { appendAssistantMessage, appendUserMessage, messagesList, resetChatForStandalone, simulateAIResponse } from './composer.js';
import { renderModeTag } from './expert/chips.js';
import { teamById } from './expert/store.js';
import surveyAppHtml from '../../artifacts/survey-app.html?raw';
import equipmentBillHtml from '../../artifacts/equipment-repair-bill.html?raw';
import tokensCss from '../../styles/tokens.css?raw';
import helpdeskAppHtml from '../../artifacts/helpdesk-app.html?raw';
/* 应用开发：卡片、搜索、新建下拉、新建应用弹窗、右键菜单
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ---------- 新建应用弹窗 ---------- */
var newAppModal=$('#newAppModal');
var newAppClose=$('#newAppClose');
var newAppCancel=$('#newAppCancel');
var newAppConfirm=$('#newAppConfirm');
var newAppName=$('#newAppName');
var sourceAppGroup=$('#sourceAppGroup');
var sourceAppSearch=$('#sourceAppSearch');
var sourceAppList=$('#sourceAppList');
var sourceAppChip=$('#sourceAppChip');
var sourceAppLabel=$('#sourceAppLabel');
var sourceAppMenu=$('#sourceAppMenu');
var newAppSource='home';
function openSourceAppMenu(){
  var rect=sourceAppChip.getBoundingClientRect();
  var spaceBelow=window.innerHeight-rect.bottom-20;
  var maxH=Math.min(Math.max(spaceBelow,120),300);
  sourceAppMenu.style.cssText='position:fixed;display:flex;flex-direction:column;'
    +'top:'+(rect.bottom+4)+'px;left:'+rect.left+'px;width:'+rect.width+'px;'
    +'max-height:'+maxH+'px;overflow:hidden;z-index:400;'
    +'background:#fff;border:1px solid var(--border);border-radius:10px;'
    +'box-shadow:0 8px 24px rgba(0,0,0,.12);padding:0;min-width:'+rect.width+'px';
  sourceAppSearch.value='';
  renderSourceAppList(fullAppData);
  requestAnimationFrame(function(){sourceAppSearch.focus()});
}
function closeSourceAppMenu(){ sourceAppMenu.style.display='none'; }
function renderSourceAppList(list){
  sourceAppList.innerHTML='';
  list.forEach(function(d){
    var el=document.createElement('div');
    el.className='app-item';
    el.setAttribute('data-app',d.app);
    el.innerHTML='<div class="app-item-info"><div class="app-item-name">'+appDisplayName(d,list)+'</div><div class="app-item-cloud">'+d.cloud+'</div></div>';
    el.addEventListener('click',function(){
      $$('.app-item',sourceAppList).forEach(function(i){i.classList.remove('checked')});
      el.classList.add('checked');
      sourceAppLabel.textContent=d.app;
      sourceAppChip.classList.remove('muted');
      newAppName.value=d.app;
      closeSourceAppMenu();
      newAppName.focus();
    });
    sourceAppList.appendChild(el);
  });
}
function openNewAppModal(source){
  newAppSource=source||'home';
  newAppModal.classList.add('show');
  newAppName.value='';
  var sel=$('input[name="createType"]:checked');
  if(sel) sel.checked=false;
  var firstType=$('input[name="createType"][value="new"]');
  if(firstType) firstType.checked=true;
  sourceAppGroup.style.display='none';
  closeSourceAppMenu();
  sourceAppLabel.innerHTML='&nbsp;';
  sourceAppChip.classList.add('muted');
  sourceAppSearch.value='';
  renderSourceAppList(fullAppData);
  requestAnimationFrame(function(){newAppName.focus()});
}
function closeNewAppModal(){ newAppModal.classList.remove('show'); }
/* ---------- 应用开发 新建下拉 ---------- */
var appsNewBtn=$('.apps-new-btn');
var appsNewDd=$('#appsNewDropdown');

/* ---------- 右键菜单 ---------- */
var ctxMenu=$('#ctxMenu');
var ctxTarget=null;
/* 菜单打开期间给所属行加标记，让行内的“会话操作”按钮常驻（否则鼠标移到菜单上按钮就淡出了） */
function markCtxTarget(el){
  $$('.ctx-open').forEach(function(n){n.classList.remove('ctx-open');});
  var row=el&&el.closest?el.closest('.sub-item'):null;
  if(row) row.classList.add('ctx-open');
}
function showCtxMenu(e,el){
  e.preventDefault();
  ctxTarget=el;
  markCtxTarget(el);
  ctxMenu.style.left=Math.min(e.clientX,document.documentElement.clientWidth-220)+'px';
  ctxMenu.style.top=Math.min(e.clientY,document.documentElement.clientHeight-260)+'px';
  ctxMenu.classList.add('show');
}
function hideCtxMenu(){
  ctxMenu.classList.remove('show');
  $$('.ctx-open').forEach(function(n){n.classList.remove('ctx-open');});
  ctxTarget=null;
}

/* ---------- 问卷调研应用：演示开发会话与本地预览 ---------- */
var SURVEY_APP_NAME='问卷调研系统';
var SURVEY_APP_URL='https://apps.lingee.com/survey';
var SURVEY_DEV_STEPS=[
  ['需求设计','17 条需求、验收条件和非目标，评审一次通过'],
  ['系统设计','问卷、题目、答卷、发放批次 4 张主表；分析任务异步计算'],
  ['开发实现','12 种题型、逻辑跳转、多渠道发放、自动分析报告'],
  ['测试与审查','48 条用例全部通过，移动端矩阵题错位已修复'],
  ['部署上线','已发布到生产环境，首个调研回收 1,286 份']
];
function surveyAppEsc(v){ return String(v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function renderSurveyDevConversation(){
  messagesList.replaceChildren();
  appendUserMessage('做一个问卷调研系统：支持问卷设计、企业微信和二维码发放、回收进度监控，回收后自动出分析报告。');
  var response=appendAssistantMessage(teamById('general-app-dev'));
  response.innerHTML='<div class="work-steps"><div class="work-step done final-step bare"><div class="markdown-content">'
    +'<p>问卷调研系统已开发完成并部署上线，右侧是正在运行的应用。</p><ol>'
    +SURVEY_DEV_STEPS.map(function(step){return '<li><strong>'+surveyAppEsc(step[0])+'</strong>：'+surveyAppEsc(step[1])+'</li>';}).join('')
    +'</ol><p>访问地址：<code>'+surveyAppEsc(SURVEY_APP_URL)+'</code></p></div></div></div>';
}
/* ---------- 设备巡检维修：6.1 系统预览与 6.2 诊断助手使用 ---------- */
var EQUIPMENT_APP_NAME='设备巡检维修系统';
var EQUIPMENT_APP_URL='https://apps.lingee.com/equipment';
var EQUIPMENT_AGENT_NAME='设备故障诊断助手';
/* 表单页签用标准苍穹单据（维修记录），与其它苍穹应用一致，令牌同 bill-template.js 注入 */
var equipmentAppHtml=equipmentBillHtml.replace('/* 令牌由 tokens.css 注入 */',tokensCss.replace(/\/\*[\s\S]*?\*\//g,'').trim());
function renderEquipmentAppConversation(){
  messagesList.replaceChildren();
  appendUserMessage('打开设备巡检维修系统，看一下上线后的运行情况。');
  var response=appendAssistantMessage(teamById('cosmic-app-dev'));
  response.innerHTML='<div class="work-steps"><div class="work-step done final-step bare"><div class="markdown-content">'
    +'<p>设备巡检维修系统由项目「设备巡检维修系统建设」交付，建在金蝶 ERP 的元数据上，表单、列表、实体、插件页签都按元数据生成。</p><ol>'
    +'<li><strong>设备台账与扫码巡检</strong>：126 台设备已生成二维码</li>'
    +'<li><strong>故障报修与维修记录</strong>：42 条用例全部通过，维修记录归入设备履历</li>'
    +'<li><strong>MCP 服务</strong>：设备档案和维修记录通过 MCP 服务 <code>equipment-ops</code> 只读开放，供智能体技能调用</li>'
    +'</ol><p>访问地址：<code>'+surveyAppEsc(EQUIPMENT_APP_URL)+'</code></p></div></div></div>';
}
/* 设备巡检维修系统的元数据页签：列表 / 实体 / 插件换成本系统的元数据；打开其他应用时还原默认示例 */
var EQ_DOC='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M8 13h8M8 17h5"/></svg>';
var EQ_ON='<span class="plugin-check"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>';
var EQ_OFF='<span class="plugin-check off"></span>';
var EQ_ENTITIES=[['维修记录',8],['报修单',10],['设备档案',9],['维修组',4]];
var EQ_FIELDS=[['维修单号','billno','单据编号',1],['设备','equipment','基础资料',1],['故障现象','symptom','多行文本',1],['故障原因','cause','文本',1],['更换零件','parts','基础资料',0],['维修耗时','hours','小数',0],['维修人','repairer','人员',1],['完成时间','finishtime','日期时间',1]];
var EQ_PLUGINS=[['表单插件','kd.eqp.repair.RepairBillFormPlugin','扫码带出设备档案，校验必填与照片',1],['操作插件','kd.eqp.repair.RepairDispatchPlugin','提交报修时按设备类型派给维修组',1],['操作插件','kd.eqp.repair.RepairRecordAuditPlugin','维修完成后写入设备履历',1],['列表插件','kd.eqp.repair.RepairListPlugin','按设备、类型、日期过滤维修记录',1],['接口插件','kd.eqp.repair.QueryRepairRecordsApi','只读查询维修记录，供智能体技能调用',1]];
var EQ_ROWS=[['WX-2026-0912','3 号注塑机','温度波动 ±12℃','热电偶接线松动','热电偶 K 型','王师傅','2026-09-12'],['WX-2026-0920','1 号空压机','排气压力不足','进气滤芯堵塞','进气滤芯','李师傅','2026-09-20'],['WX-2026-0926','5 号数控机床','主轴异响','润滑不足','—','王师傅','2026-09-26'],['WX-2026-1002','2 号注塑机','射胶不稳','止逆环磨损','止逆环','赵师傅','2026-10-02'],['WX-2026-1004','4 号冲床','滑块异响','导轨润滑不足','—','赵师傅','2026-10-04']];
var eqMetaSaved=null;
function setEquipmentMeta(on){
  var entity=$('#previewBodyEntity'), plugin=$('#previewBodyPlugin'), list=$('#previewBodyList');
  if(!entity||!plugin||!list) return;
  var title=$('.list-title',list), headRow=$('.list-table thead tr',list), tbody=$('#listBody');
  var search=$('#listSearchInput',list), pager=$('.pager-info',list);
  /* 表头只换复选框之后的列，保留全选框及其监听 */
  function headCols(){ return headRow ? [].slice.call(headRow.children,1) : []; }
  if(on&&!eqMetaSaved){
    eqMetaSaved={entity:entity.innerHTML,plugin:plugin.innerHTML,title:title&&title.textContent,cols:headCols().map(function(th){return th.outerHTML;}).join(''),tbody:tbody&&tbody.innerHTML,search:search&&search.placeholder,pager:pager&&pager.textContent};
    if(search) search.placeholder='搜索维修单号、设备…';
    if(pager) pager.textContent='第 1-'+EQ_ROWS.length+' 条，共 '+EQ_ROWS.length+' 条';
    entity.innerHTML='<div class="entity-layout"><div class="entity-left">'
      +EQ_ENTITIES.map(function(e,i){return '<div class="entity-left-item'+(i?'':' active')+'">'+EQ_DOC+'<span class="entity-left-name">'+e[0]+'</span><span class="entity-left-count">'+e[1]+'字段</span></div>';}).join('')
      +'</div><div class="entity-right"><table class="entity-table"><thead><tr><th>字段名称</th><th>字段标识</th><th>字段类型</th><th>是否必录</th></tr></thead><tbody>'
      +EQ_FIELDS.map(function(f){return '<tr><td>'+f[0]+'</td><td class="code">'+f[1]+'</td><td>'+f[2]+'</td><td>'+(f[3]?EQ_ON:EQ_OFF)+'</td></tr>';}).join('')
      +'</tbody></table></div></div>';
    plugin.innerHTML='<table class="plugin-table"><thead><tr><th>插件类型</th><th>类名</th><th>描述</th><th>是否启用</th></tr></thead><tbody>'
      +EQ_PLUGINS.map(function(p){return '<tr><td class="type">'+p[0]+'</td><td class="code">'+p[1]+'</td><td>'+p[2]+'</td><td>'+(p[3]?EQ_ON:EQ_OFF)+'</td></tr>';}).join('')
      +'</tbody></table>';
    if(title) title.textContent='维修记录';
    if(headRow){ headCols().forEach(function(th){th.remove();}); headRow.insertAdjacentHTML('beforeend','<th>维修单号</th><th>设备</th><th>故障现象</th><th>故障原因</th><th>更换零件</th><th>维修人</th><th>完成时间</th>'); }
    if(tbody) tbody.innerHTML=EQ_ROWS.map(function(r){return '<tr data-id="'+r[0]+'"><td class="list-cb"><input type="checkbox"></td><td class="c-code">'+r[0]+'</td><td>'+r.slice(1).join('</td><td>')+'</td></tr>';}).join('');
  }else if(!on&&eqMetaSaved){
    entity.innerHTML=eqMetaSaved.entity; plugin.innerHTML=eqMetaSaved.plugin;
    if(title) title.textContent=eqMetaSaved.title;
    if(headRow){ headCols().forEach(function(th){th.remove();}); headRow.insertAdjacentHTML('beforeend',eqMetaSaved.cols); }
    if(tbody) tbody.innerHTML=eqMetaSaved.tbody;
    if(search) search.placeholder=eqMetaSaved.search;
    if(pager) pager.textContent=eqMetaSaved.pager;
    eqMetaSaved=null;
  }
}
/* 6.2 智能体开发会话：左侧是 agent-builder 的交付摘要，右侧打开智能体配置面板，在面板里提交 */
var AGENT_ICON='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4.5M9 14h.01M15 14h.01"/></svg>';
function renderEquipmentAgentConversation(){
  messagesList.replaceChildren();
  appendUserMessage('@agent-builder 帮我做一个设备故障诊断助手。维修工程师报上设备编号和故障现象，先查这台设备的档案和最近的维修记录，再按我的经验给排查步骤。');
  var response=appendAssistantMessage(null);
  response.innerHTML='<div class="work-steps"><div class="work-step done final-step bare"><div class="markdown-content">'
    +'<p>设备故障诊断助手已创建完成，严格校验通过。以下是交付摘要：</p>'
    +'<p><strong>智能体配置</strong></p><ul>'
    +'<li>标识符：<code>equipment-diagnosis-assistant</code>，显示名：设备故障诊断助手</li>'
    +'<li>领域：通用，可见性：全公司</li></ul>'
    +'<p><strong>角色定位</strong></p>'
    +'<p>工厂里的设备维修老师傅，按周建国的排障经验帮设备部的维修工程师排查注塑机、空压机、数控机床故障；先查记录再下判断，最近换过的零件优先怀疑，涉及高压电先提醒断电挂牌。</p>'
    +'<p><strong>技能</strong></p><ul>'
    +'<li>两个技能都调用设备巡检维修系统 MCP 服务（<code>equipment-ops</code>）的只读工具</li>'
    +'<li>「查询设备档案」：按设备编号读取型号、位置和当前状态</li>'
    +'<li>「查询维修记录」：读取近 12 个月的维修原因、更换零件和维修人，只读不改</li></ul>'
    +'<p><strong>知识</strong></p><ul><li>已关联「设备管理知识库」；排障手册可在右侧知识页上传</li></ul>'
    +'</div></div></div>';
  var card=document.createElement('div');
  card.className='artifact-card';
  card.innerHTML='<div class="artifact-preview">'+AGENT_ICON+'</div>'
    +'<div class="artifact-info"><div class="artifact-title">'+surveyAppEsc(EQUIPMENT_AGENT_NAME)+'</div><div class="artifact-desc">查看并编辑智能体配置</div></div>'
    +'<button type="button" class="agent-config-card-test"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>本地测试</button>'
    +'<div class="artifact-action"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>';
  card.addEventListener('click',function(e){
    if(e.target.closest('.agent-config-card-test')){ toast('已进入本地测试：'+EQUIPMENT_AGENT_NAME); return; }
    openAgentConfig(EQUIPMENT_AGENT_NAME);
  });
  response.querySelector('.final-step').appendChild(card);
}
/* ---------- 工单管理系统：客户服务工单平台交付的运行预览 ---------- */
var HELPDESK_APP_NAME='工单管理系统';
var HELPDESK_APP_URL='https://apps.lingee.com/helpdesk';
function renderHelpdeskAppConversation(){
  messagesList.replaceChildren();
  appendUserMessage('打开工单管理系统，看一下上线后的运行情况。');
  var response=appendAssistantMessage(teamById('general-app-dev'));
  response.innerHTML='<div class="work-steps"><div class="work-step done final-step bare"><div class="markdown-content">'
    +'<p>工单管理系统由协作开发项目「客户服务工单平台」交付，右侧是正在运行的系统。</p><ol>'
    +'<li><strong>提交工单</strong>：按分类和优先级提交，附件支持截图和日志</li>'
    +'<li><strong>SLA 与派单</strong>：按优先级自动给出响应和解决时限，工单自动派给处理人</li>'
    +'<li><strong>我的工单与常见问题</strong>：跟踪处理进度、评价已解决工单，常见问题先自助排查</li>'
    +'</ol><p>访问地址：<code>'+surveyAppEsc(HELPDESK_APP_URL)+'</code></p></div></div></div>';
}
function openSurveyAppPreview(frame,urlInput){
  if(frame) frame.src=URL.createObjectURL(new Blob([surveyAppHtml],{type:'text/html'}));
  if(urlInput) urlInput.value=SURVEY_APP_URL;
}

/* 通用应用用内置浏览器预览系统链接；苍穹应用保留表单/列表/实体等页签 */
function setPreviewBrowserMode(on){
  var side=document.getElementById('chatPreviewSide');
  if(side) side.classList.toggle('is-browser',on);
  var previewTab=$('.preview-tab[data-tab="preview"]');
  if(on&&previewTab&&!previewTab.classList.contains('active')) previewTab.click();
}

export function initApps() {
  /* ---------- 我的应用 (apps view) ---------- */
  $('.btn-new:not(.apps-new-btn)') && $('.btn-new:not(.apps-new-btn)').addEventListener('click',function(){});
  $$('#view-apps .apps-refresh,#view-agents .apps-refresh,#view-skills .apps-refresh').forEach(function(b){
    b.addEventListener('click',function(){ toast('已刷新'); });
  });
  $$('#view-skills .btn-tool').forEach(function(b){
    b.addEventListener('click',function(){ toast(b.getAttribute('data-toast')||''); });
  });
  $$('.app-card').forEach(function(c){
    c.addEventListener('click',function(e){
      if(e.target.closest('.card-more')){ e.stopPropagation(); toast('更多操作'); return; }
      if(c.hasAttribute('data-agent')) return; /* 演示智能体由 agent-demo.js 打开 */
      var name=$('.card-title',c).textContent.trim();
      resetChatForStandalone();
      closeAgentConfig();
      showView('chat');
      setNavActive('新会话');
      var titleEl=$('#chatTitle');
      if(titleEl) titleEl.textContent=name;
      var emptyEl=$('#chatEmpty');
      if(emptyEl) emptyEl.remove();
      /* 打开预览面板加载表单 */
      var view=document.getElementById('view-chat');
      var frame=document.getElementById('chatPreviewFrame');
      var urlInput=document.getElementById('previewUrlText');
      var url='https://feature.kingdee.com:1026/feature_vb';
      setPreviewBrowserMode(name===SURVEY_APP_NAME);
      setEquipmentMeta(name===EQUIPMENT_APP_NAME);
      if(name===SURVEY_APP_NAME){ renderSurveyDevConversation(); openSurveyAppPreview(frame,urlInput); }
      else if(name===EQUIPMENT_APP_NAME){
        renderEquipmentAppConversation();
        if(frame) frame.src=URL.createObjectURL(new Blob([equipmentAppHtml],{type:'text/html'}));
        if(urlInput) urlInput.value=EQUIPMENT_APP_URL;
      }
      else if(name===HELPDESK_APP_NAME){
        renderHelpdeskAppConversation();
        if(frame) frame.src=URL.createObjectURL(new Blob([helpdeskAppHtml],{type:'text/html'}));
        if(urlInput) urlInput.value=HELPDESK_APP_URL;
      }
      else if(name===EQUIPMENT_AGENT_NAME){
        renderEquipmentAgentConversation();
        openAgentConfig(name);
        return;
      }
      else{
        if(frame) frame.src=url;
        if(urlInput) urlInput.value=url;
      }
      if(view) view.classList.add('preview-open');
      if(typeof syncTogglePreviewBtn==='function') syncTogglePreviewBtn();
      try{localStorage.setItem('chatPreviewOpen','1')}catch(err){}
      var savedW=localStorage.getItem('chatPreviewWidth');
      var ps=document.getElementById('chatPreviewSide');
      if(savedW&&ps){ps.style.width=savedW;}
    });
  });

  /* ---------- 应用/智能体/技能：页签筛选与搜索 ---------- */
  ['#view-apps','#view-agents','#view-skills'].forEach(function(root){
    var appsSearchInput=$(root+' .apps-search input');
    var appsGrid=$(root+' .apps-grid');
    if(!appsSearchInput||!appsGrid) return;
    var status='';
    $$(root+' .tab').forEach(function(t){
      t.addEventListener('click',function(){
        $$(root+' .tab').forEach(function(i){i.classList.remove('active')});
        t.classList.add('active');
        status=t.getAttribute('data-status')||'';
        doSearch();
      });
    });
    var emptyMsg=document.createElement('div');
    emptyMsg.className='apps-empty';
    emptyMsg.innerHTML='<div class="apps-empty-icon"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></div><div class="apps-empty-title">未找到匹配的内容</div>';
    emptyMsg.style.display='none';
    appsGrid.appendChild(emptyMsg);
    var searchWrap=appsSearchInput.parentElement;
    var clearBtn=document.createElement('button');
    clearBtn.className='apps-search-clear';
    clearBtn.setAttribute('aria-label','清除');
    clearBtn.innerHTML='<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    searchWrap.appendChild(clearBtn);
    clearBtn.addEventListener('click',function(){
      appsSearchInput.value='';
      appsSearchInput.focus();
      searchWrap.classList.remove('has-text');
      doSearch();
    });
    var composing=false;
    function doSearch(){
      var q=appsSearchInput.value.trim().toLowerCase();
      searchWrap.classList.toggle('has-text',!!q);
      var cards=$$('.app-card',appsGrid);
      var visible=0;
      cards.forEach(function(c){
        var title=($('.card-title',c)||{}).textContent||'';
        var desc=($('.card-desc',c)||{}).textContent||'';
        var tags=$$('.ptag',c).map(function(t){return t.textContent.trim();}).join(' ');
        var text=(title+' '+desc+' '+tags).toLowerCase();
        var match=(!q||text.indexOf(q)>-1)&&(!status||c.getAttribute('data-status')===status);
        c.style.display=match?'':'none';
        if(match) visible++;
      });
      emptyMsg.style.display=visible?'none':'block';
    }
    appsSearchInput.addEventListener('compositionstart',function(){composing=true});
    appsSearchInput.addEventListener('compositionend',function(){composing=false;doSearch()});
    appsSearchInput.addEventListener('input',function(){
      if(composing) return;
      doSearch();
    });
  });
}

export function initNewAppModal() {
  if(sourceAppChip) sourceAppChip.addEventListener('click',function(){
    if(sourceAppMenu.style.display==='flex'){ closeSourceAppMenu(); }
    else{ openSourceAppMenu(); }
  });
  if(sourceAppMenu) sourceAppMenu.addEventListener('click',function(e){ e.stopPropagation(); });
  document.addEventListener('click',function(e){
    if(sourceAppMenu && sourceAppMenu.style.display==='flex' && !e.target.closest('#sourceAppDropdown')){
      closeSourceAppMenu();
    }
  });
  if(sourceAppSearch) sourceAppSearch.addEventListener('input',function(){
    var q=this.value.trim().toLowerCase();
    if(!q){ renderSourceAppList(fullAppData); return; }
    renderSourceAppList(fullAppData.filter(function(d){return d.app.toLowerCase().indexOf(q)>-1}));
  });
  if(newAppClose) newAppClose.addEventListener('click',closeNewAppModal);
  if(newAppCancel) newAppCancel.addEventListener('click',closeNewAppModal);
  if(newAppModal) newAppModal.addEventListener('click',function(e){
    if(e.target===newAppModal) closeNewAppModal();
  });
  // 创建类型切换
  $$('input[name="createType"]').forEach(function(r){
    r.addEventListener('change',function(){
      var val=r.value;
      sourceAppGroup.style.display=(val==='extend'||val==='inherit')?'':'none';
    });
  });
  // 确认提交
  if(newAppConfirm) newAppConfirm.addEventListener('click',function(){
    var name=newAppName.value.trim();
    var type=$('input[name="createType"]:checked');
    var typeVal=type?type.value:'new';
    if(!name){ toast('请输入应用名称'); newAppName.focus(); return; }
    if(typeVal==='extend'||typeVal==='inherit'){
      var selected=sourceAppList.querySelector('.app-item.checked');
      if(!selected){ toast('请选择已有应用'); return; }
    }
    if(newAppSource==='home'){
      selectApp(name);
      appDd.classList.remove('open');
    }else{
      selectChatApp(name);
      chatAppDd.classList.remove('open');
    }
    toast('已新建并关联应用：'+name);
    closeNewAppModal();
  });
}

export function initAppsNewDropdown() {
  if(appsNewBtn&&appsNewDd){
    appsNewBtn.addEventListener('click',function(e){
      e.stopPropagation();
      var isOpen=appsNewDd.classList.toggle('open');
      if(isOpen){
        appsNewDd.style.top='';
        appsNewDd.style.right='';
        appsNewDd.style.left='';
        appsNewDd.style.minWidth='';
      }
    });
    $$('.apps-new-item',appsNewDd).forEach(function(item){
      item.addEventListener('click',function(){
        var mode=item.getAttribute('data-mode');
        appsNewDd.classList.remove('open');
        showView('newtask');
        setNavActive(mode);
        applyMode(mode,true);
        renderModeTag();
      });
    });
    document.addEventListener('click',function(){appsNewDd.classList.remove('open')});
  }
  // 给 sub-item 和 flat-item 绑定右键
  $$('.sub-item, .flat-item').forEach(function(item){
    item.addEventListener('contextmenu',function(e){showCtxMenu(e,item);});
  });
  // 点击 Workspace 的"···"按钮打开菜单
  $$('.group-head .more').forEach(function(more){
    more.style.cursor='pointer';
    more.addEventListener('click',function(e){
      e.stopPropagation();
      var group=more.closest('.group-head');
      ctxTarget=group;
      var rect=more.getBoundingClientRect();
      ctxMenu.style.left=Math.min(rect.right+4,document.documentElement.clientWidth-220)+'px';
      ctxMenu.style.top=Math.min(rect.bottom+4,document.documentElement.clientHeight-200)+'px';
      ctxMenu.classList.add('show');
    });
  });
  // 点击 sub-item 右侧三点按钮打开菜单
  $$('.sub-more').forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.stopPropagation();
      e.preventDefault();
      var item=btn.closest('.sub-item');
      ctxTarget=item;
      markCtxTarget(item);
      var rect=btn.getBoundingClientRect();
      ctxMenu.style.left=Math.min(rect.right+4,document.documentElement.clientWidth-220)+'px';
      ctxMenu.style.top=Math.min(rect.bottom+4,document.documentElement.clientHeight-200)+'px';
      ctxMenu.classList.add('show');
    });
  });
  // 点击 sub-item 进入会话详情（带 data-session 的演示会话由各自模块渲染）
  $$('.sub-item:not([data-session])').forEach(function(item){
    item.addEventListener('click',function(){
      var title=item.querySelector('.txt').textContent.trim();
      showView('chat');
      $('#chatTitle').textContent=title;
      messagesList.innerHTML='';
      appendUserMessage('帮我开发'+title+'功能');
      var responseEl=appendAssistantMessage();
      simulateAIResponse(responseEl,true);
      selectChatApp('采购订单管理');
      chatAppDd.classList.add('disabled');
      navItems.forEach(function(n){n.classList.remove('active')});
    });
  });
  // 点击菜单项
  $$('.ctx-item',ctxMenu).forEach(function(item){
    item.addEventListener('click',function(){
      var action=item.getAttribute('data-ctx');
      var name=ctxTarget?ctxTarget.textContent.trim():'';
      hideCtxMenu();
      if(action==='delete') toast('已删除：'+name);
      else if(action==='rename') toast('重命名：'+name);
      else if(action==='pin') toast('已置顶：'+name);
      else if(action==='move') toast('移动到项目：'+name);
      else if(action==='archive') toast('已归档：'+name);
    });
  });
  // 点击其他地方关闭菜单
  document.addEventListener('click',function(e){
    if(!e.target.closest('.ctxmenu')) hideCtxMenu();
  });
  // ESC 关闭菜单
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape') hideCtxMenu();
  });
}

export { closeNewAppModal, closeSourceAppMenu, ctxMenu, hideCtxMenu, newAppModal, openNewAppModal, sourceAppMenu };
