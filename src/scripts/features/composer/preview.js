import { $, $$ } from '../../core/dom.js';
/* 对话：产物预览页签、MCP 列表、预览视口（拆自 composer.js） */

/* 预览面板关闭按钮 */
var chatPreviewCloseBtn=$('#chatPreviewClose');
/* 预览面板页签切换 */
function switchPreviewTab(target){
  $$('.preview-tab').forEach(function(t){t.classList.toggle('active',t.getAttribute('data-tab')===target)});
  var bodies={preview:$('#previewBodyPreview'),list:$('#previewBodyList'),entity:$('#previewBodyEntity'),plugin:$('#previewBodyPlugin'),api:$('#previewBodyApi'),mcp:$('#previewBodyMcp')};
  Object.keys(bodies).forEach(function(k){
    if(bodies[k]){bodies[k].classList.toggle('hidden',k!==target)}
  });
  var nav=$('#previewNav');
  if(nav){nav.classList.toggle('hidden',target!=='preview')}
  try{localStorage.setItem('chatPreviewTab',target)}catch(e){}
}
/* MCP 工具列表渲染 */
var mcpData=[
  {id:1,act:'新增',tool:'create_purchase_order',toolUniqueID:'post_v2_scm_po_save',desc:'新增采购订单，校验必填字段与金额上限',status:'published',actionType:'保存操作',domain:'采购管理',module:'purchase_order',sensitive:false,serviceSource:'系统内置',customParams:false,errorLog:'—',precond:'[{"condition":"用户具有采购订单新增权限"},{"condition":"供应商基础资料有效"},{"condition":"物料编码有效"}]',postcond:'[{"effect":"保存后数据状态为暂存","field":"billstatus","to_value":"A"}]',recovery:'{"open.100001":{"hint":"必填字段缺失","cause":"请求参数校验失败","suggestion":"请检查必填字段后重试","auto_recoverable":true}}',targetAPI:'POST /kapi/v2/scm/pm/purchaseorder'},
  {id:2,act:'提交',tool:'submit_purchase_order',toolUniqueID:'post_v2_scm_po_submit',desc:'提交采购订单审批，触发三级审批流程',status:'published',actionType:'提交操作',domain:'采购管理',module:'purchase_order',sensitive:false,serviceSource:'系统内置',customParams:false,errorLog:'—',precond:'[{"condition":"订单状态为暂存"},{"condition":"金额>10万需总经理审批"}]',postcond:'[{"effect":"订单状态变为审批中","field":"billstatus","to_value":"B"},{"effect":"通知相关审批人"}]',recovery:'{"flow.1001":{"hint":"审批流程异常","cause":"审批节点配置异常","suggestion":"联系管理员检查审批流配置","auto_recoverable":false}}',targetAPI:'POST /kapi/v2/scm/pm/purchaseorder/{id}/submit'},
  {id:3,act:'审核',tool:'audit_purchase_order',toolUniqueID:'post_v2_scm_po_audit',desc:'审核采购订单，写入审核人与审核时间',status:'published',actionType:'审核操作',domain:'采购管理',module:'purchase_order',sensitive:true,serviceSource:'系统内置',customParams:false,errorLog:'—',precond:'[{"condition":"订单状态为审批中"},{"condition":"当前用户具有审核权限"}]',postcond:'[{"effect":"订单状态变为已审核","field":"billstatus","to_value":"C"},{"effect":"记录审核人与审核时间"}]',recovery:'{"audit.1001":{"hint":"审核失败","cause":"订单金额超出您的审批额度","suggestion":"请联系上级审批人处理","auto_recoverable":false}}',targetAPI:'POST /kapi/v2/scm/pm/purchaseorder/{id}/audit'},
  {id:4,act:'反审核',tool:'unaudit_purchase_order',toolUniqueID:'post_v2_scm_po_unaudit',desc:'反审核已审核的采购订单',status:'published',actionType:'反审核操作',domain:'采购管理',module:'purchase_order',sensitive:true,serviceSource:'系统内置',customParams:false,errorLog:'—',precond:'[{"condition":"订单状态为已审核"},{"condition":"下游未生成入库单"}]',postcond:'[{"effect":"订单状态变为暂存","field":"billstatus","to_value":"A"}]',recovery:'{"audit.1002":{"hint":"反审核拒绝","cause":"下游已生成入库单","suggestion":"请先删除入库单后重试","auto_recoverable":false}}',targetAPI:'POST /kapi/v2/scm/pm/purchaseorder/{id}/unaudit'},
  {id:5,act:'下推',tool:'push_purchase_order',toolUniqueID:'post_v2_scm_po_push',desc:'按未入库数量下推生成入库单',status:'draft',actionType:'下推操作',domain:'采购管理',module:'purchase_order',sensitive:false,serviceSource:'自定义',customParams:true,errorLog:'2026-09-11 下推超时',precond:'[{"condition":"订单状态为已审核"},{"condition":"存在未入库数量"}]',postcond:'[{"effect":"生成入库单草稿"},{"effect":"更新已下推数量"}]',recovery:'{"push.1001":{"hint":"下推失败","cause":"无可下推的未入库数量","suggestion":"请检查采购数量","auto_recoverable":true}}',targetAPI:'POST /kapi/v2/scm/pm/purchaseorder/{id}/push'},
  {id:6,act:'删除',tool:'delete_purchase_order',toolUniqueID:'delete_v2_scm_po',desc:'删除草稿态的采购订单',status:'published',actionType:'删除操作',domain:'采购管理',module:'purchase_order',sensitive:true,serviceSource:'系统内置',customParams:false,errorLog:'—',precond:'[{"condition":"订单状态为暂存"}]',postcond:'[{"effect":"订单被物理删除不可恢复"}]',recovery:'{"delete.1001":{"hint":"删除失败","cause":"订单不是草稿态","suggestion":"请先反审核后删除","auto_recoverable":false}}',targetAPI:'DELETE /kapi/v2/scm/pm/purchaseorder/{id}'},
  {id:7,act:'修改',tool:'update_purchase_order',toolUniqueID:'put_v2_scm_po_update',desc:'修改草稿态的采购订单',status:'published',actionType:'保存操作',domain:'采购管理',module:'purchase_order',sensitive:false,serviceSource:'系统内置',customParams:false,errorLog:'—',precond:'[{"condition":"订单状态为暂存"}]',postcond:'[{"effect":"更新订单数据"},{"effect":"记录修改日志"}]',recovery:'{"update.1001":{"hint":"修改失败","cause":"订单不是草稿态","suggestion":"请先反审核后修改","auto_recoverable":false}}',targetAPI:'PUT /kapi/v2/scm/pm/purchaseorder/{id}'},
  {id:8,act:'查询列表',tool:'query_purchase_order_list',toolUniqueID:'get_v2_scm_po_list',desc:'分页查询采购订单列表，支持按状态/供应商/日期过滤',status:'published',actionType:'查询操作',domain:'采购管理',module:'purchase_order',sensitive:false,serviceSource:'系统内置',customParams:false,errorLog:'—',precond:'[{"condition":"用户具有查询权限"}]',postcond:'[{"effect":"返回采购订单分页列表"}]',recovery:'',targetAPI:'GET /kapi/v2/scm/pm/purchaseorder'},
  {id:9,act:'查询详情',tool:'query_purchase_order_detail',toolUniqueID:'get_v2_scm_po_detail',desc:'查询采购订单详情，返回单头+明细行完整数据',status:'published',actionType:'查询操作',domain:'采购管理',module:'purchase_order',sensitive:false,serviceSource:'系统内置',customParams:false,errorLog:'—',precond:'[{"condition":"用户具有查询权限"}]',postcond:'[{"effect":"返回订单完整数据"}]',recovery:'',targetAPI:'GET /kapi/v2/scm/pm/purchaseorder/{id}'}
];
function renderMcpList(){
  var el=$('#mcpList'); if(!el)return;
  el.innerHTML='<table class="plugin-table mcp-table">'
    +'<colgroup><col style="width:33%"><col style="width:36%"><col style="width:12%"><col style="width:11%"><col style="width:8%"></colgroup>'
    +'<thead><tr><th>工具名称</th><th>说明</th><th>操作类型</th><th>注册状态</th><th></th></tr></thead><tbody>'
    +mcpData.map(function(d){
      var statusText='<span style="color:var(--text)">'+(d.status==='published'?'已发布':'失败')+'</span>';
      var detail='<div style="padding:4px 0;font-size:12px;line-height:1.8;display:grid;grid-template-columns:auto 1fr;gap:4px 16px">'
        +'<span style="color:var(--text-muted)">工具唯一标识</span><span class="code">'+d.toolUniqueID+'</span>'
        +'<span style="color:var(--text-muted)">目标API</span><span class="code">'+d.targetAPI+'</span>'
        +'<span style="color:var(--text-muted)">所属领域</span><span>'+d.domain+'</span>'
        +'<span style="color:var(--text-muted)">所属模块</span><span>'+d.module+'</span>'
        +'<span style="color:var(--text-muted)">是否敏感操作</span><span>'+(d.sensitive?'<span style="color:#e04a3a">敏感</span>':'否')+'</span>'
        +'<span style="color:var(--text-muted)">服务来源</span><span>'+d.serviceSource+'</span>'
        +'<span style="color:var(--text-muted)">自定义参数扩展</span><span>'+(d.customParams?'已配置':'—')+'</span>'
        +'<span style="color:var(--text-muted)">异常日志</span><span>'+d.errorLog+'</span>'
        +(d.precond?'<span style="color:var(--text-muted);align-self:start">前置条件</span><pre style="margin:0;white-space:pre-wrap;font-size:11px;background:var(--fill-1);padding:6px 8px;border-radius:4px">'+d.precond+'</pre>':'')
        +(d.postcond?'<span style="color:var(--text-muted);align-self:start">后置效果</span><pre style="margin:0;white-space:pre-wrap;font-size:11px;background:var(--fill-1);padding:6px 8px;border-radius:4px">'+d.postcond+'</pre>':'')
        +(d.recovery?'<span style="color:var(--text-muted);align-self:start">错误恢复</span><pre style="margin:0;white-space:pre-wrap;font-size:11px;background:var(--fill-1);padding:6px 8px;border-radius:4px">'+d.recovery+'</pre>':'')
        +'</div>';
      return '<tr style="cursor:pointer" onclick="var r=this.nextElementSibling;if(r&&r.classList.contains(\'mcp-detail-row\')){r.classList.toggle(\'hidden\');this.querySelector(\'.mcp-arrow\').classList.toggle(\'open\')}">'
        +'<td class="mcp-tool">'+d.tool+'</td>'
        +'<td class="mcp-desc">'+d.desc+'</td>'
        +'<td style="color:var(--text)">'+d.actionType+'</td>'
        +'<td>'+statusText+'</td>'
        +'<td style="text-align:center;padding:0 12px">'
        +'<svg class="ic mcp-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;color:var(--text-muted);transition:transform .15s"><polyline points="9 18 15 12 9 6"/></svg>'
        +'</td>'
        +'</tr>'
        +'<tr class="mcp-detail-row hidden"><td colspan="5">'+detail+'</td></tr>';
    }).join('')
    +'</tbody></table>';
}
var listBodyEl=$('#listBody');
var listCheckAll=$('#listCheckAll');
/* 列表点击表头排序 */
var sortState={col:-1,dir:''};
var sortTypeMap={0:'text',1:'text',2:'text',3:'text',4:'date',5:'num',6:'text'};
/* 预览尺寸切换：桌面 / 移动 */
var previewVp=$('#previewViewport');
/* 顶部网址可编辑 */
var previewUrlInput=$('#previewUrlText');
/* 预览面板刷新按钮 */
var previewRefreshBtn=$('#previewRefresh');
/* 分栏拖拽 + localStorage 缓存 */
var chatResizer=$('#chatResizer');

export { chatPreviewCloseBtn, chatResizer, listBodyEl, listCheckAll, previewRefreshBtn, previewUrlInput, previewVp, renderMcpList, sortState, sortTypeMap, switchPreviewTab };
