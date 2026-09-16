import { cvOpenConversation } from './chat.js';
/* 协作开发：项目 / 任务 / 评审 / 人员数据与卡片渲染
   拆分自 src/scripts/main.js，逻辑逐行保留；副作用集中在下方 init* 函数里，
   由 main.js 按拆分前的原始顺序调用。 */


/* ============================================================
   协作开发（任务管理 / 待评审 / 协作人员 / 专家 / 专家团 / 设置）
   任务、评审、协作人员数据与交互移植自协作开发原型稿
   ============================================================ */
/* 项目维度：任务 / 评审 / 协作人员按项目分；专家与专家团为全局资产，项目内只绑定默认专家团 */
var CV_PROJECTS=[
  {id:'expense',name:'费用报销应用',dot:'blue',defaultTeam:'software-company'},
  {id:'purchase',name:'采购管理系统',dot:'orange',defaultTeam:'cosmic-team'},
  {id:'supply',name:'供应链协同平台',dot:'green',defaultTeam:null}
];
var cvProject='';                    /* 空串 = 全部项目（个人视角的聚合视图） */
var cvConfigOverride={};             /* {项目id:{配置卡 key:是否项目覆盖}} */
function cvProjectById(id){
  for(var i=0;i<CV_PROJECTS.length;i++){ if(CV_PROJECTS[i].id===id) return CV_PROJECTS[i]; }
  return null;
}
function cvProjectName(id){ var p=cvProjectById(id); return p?p.name:'未归属项目'; }
function cvInProject(row){
  if(!cvProject) return true;
  if(row.projects) return row.projects==='*'||row.projects.indexOf(cvProject)>=0;
  return row.project===cvProject;
}
function cvProjectTag(row){
  if(cvProject) return '';           /* 项目态下不必重复显示项目名 */
  return '<span class="cv-proj-tag">'+cvProjectName(row.project)+'</span>';
}

var CV_TASKS = [
  {type:'需求',size:'大',source:'Jira',sourceId:'PROJ-42',exec:'专家团',status:'待评审',collab:'Agent间协作',title:'审批流插件代码审查',desc:'审查费用报销审批流的插件实现，包括多级审批流转逻辑和异常处理',assignee:'王工',progress:0,project:'expense'},
  {type:'Bug',size:'小',source:'TAPD',sourceId:'BUG-7831',exec:'自动执行',status:'进行中',collab:'人Agent协作',title:'报销金额精度丢失修复',desc:'当报销金额含小数时，后端 BigDecimal 序列化后精度丢失',assignee:'AI开发Agent',progress:62,project:'expense'},
  {type:'需求',size:'小',source:'对话自建',sourceId:'CNV-001',exec:'自动执行',status:'已完成',collab:'无需协作',title:'费用类型新增团建费选项',desc:'在费用类型下拉中增加团建费选项，归属部门活动费用类别',assignee:'AI开发Agent',progress:100,project:'expense'},
  {type:'任务',size:'大',source:'Jira',sourceId:'PROJ-56',exec:'专家团',status:'未开始',collab:'人人协作',title:'权限体系重构',desc:'基于 RBAC 模型重构权限体系，支持角色分级、数据权限和功能权限分离',assignee:'待分配',progress:0,project:'expense'},
  {type:'改进',size:'小',source:'API',sourceId:'API-12',exec:'自动执行',status:'已完成',collab:'无需协作',title:'批量导出 Excel 格式支持',desc:'当前仅支持 CSV 导出，需要增加 Excel 格式导出功能',assignee:'AI开发Agent',progress:100,project:'expense'},
  {type:'Bug',size:'小',source:'Jira',sourceId:'BUG-7845',exec:'自动执行',status:'未开始',collab:'人Agent协作',title:'附件上传偶发 502 错误',desc:'附件上传在弱网环境下偶发 502 错误，需要增加重试机制',assignee:'待分配',progress:0,project:'expense'},
  {type:'需求',size:'大',source:'Jira',sourceId:'PROJ-61',exec:'专家团',status:'未开始',collab:'人人协作',title:'多级审批流性能优化',desc:'当前审批流在多级审批场景下存在性能瓶颈，需要优化审批流转逻辑',assignee:'待分配',progress:0,project:'expense'},
  {type:'任务',size:'大',source:'TAPD',sourceId:'TASK-203',exec:'专家团',status:'待评审',collab:'Agent间协作',title:'审批流多级流转设计',desc:'设计多级审批流转逻辑，支持串行、并行、会签等多种审批模式',assignee:'王工',progress:0,project:'expense'},
  {type:'改进',size:'小',source:'对话自建',sourceId:'CNV-003',exec:'自动执行',status:'进行中',collab:'人Agent协作',title:'打印模板优化',desc:'优化报销单打印模板，支持自定义页眉页脚和水印',assignee:'AI开发Agent',progress:35,project:'expense'},
  {type:'Bug',size:'小',source:'TAPD',sourceId:'BUG-7852',exec:'自动执行',status:'已完成',collab:'无需协作',title:'列表搜索响应慢修复',desc:'当报销单数据量超过 5000 条时，列表页搜索响应时间超过 10 秒',assignee:'AI开发Agent',progress:100,project:'expense'},
  {type:'需求',size:'大',source:'Jira',sourceId:'PROJ-68',exec:'专家团',status:'未开始',collab:'人人协作',title:'多币种报销支持',desc:'支持多币种报销，包括汇率转换、币种选择和金额展示逻辑',assignee:'待分配',progress:0,project:'expense'},
  {type:'任务',size:'小',source:'对话自建',sourceId:'CNV-005',exec:'自动执行',status:'已完成',collab:'人Agent协作',title:'数据字典维护',desc:'维护费用类型、审批层级、权限角色等数据字典',assignee:'AI开发Agent',progress:100,project:'expense'},
  {type:'Bug',size:'大',source:'Jira',sourceId:'BUG-7901',exec:'专家团',status:'已失败',collab:'Agent间协作',title:'审批流死锁问题修复',desc:'并发审批场景下出现死锁，需要重构审批流的锁机制',assignee:'AI开发Agent',progress:0,project:'expense'},
  {type:'改进',size:'小',source:'API',sourceId:'API-18',exec:'自动执行',status:'未开始',collab:'无需协作',title:'移动端审批页面适配',desc:'当前审批页面在移动端显示异常，需要做响应式适配',assignee:'待分配',progress:0,project:'expense'},
  {type:'需求',size:'大',source:'Jira',sourceId:'PROJ-75',exec:'专家团',status:'进行中',collab:'人人协作',title:'预算控制模块开发',desc:'新增预算控制模块，支持按部门/项目/月份设置预算上限，超标自动拦截',assignee:'李工',progress:45,project:'expense'},
  {type:'任务',size:'小',source:'TAPD',sourceId:'TASK-215',exec:'自动执行',status:'未开始',collab:'人Agent协作',title:'审批日志查询接口',desc:'开发审批日志查询接口，支持按时间、人员、状态筛选',assignee:'待分配',progress:0,project:'expense'},
  {type:'Bug',size:'小',source:'对话自建',sourceId:'CNV-008',exec:'自动执行',status:'已完成',collab:'无需协作',title:'日期格式显示不一致',desc:'不同页面日期格式不一致，有的显示 yyyy-MM-dd 有的显示 yyyy/MM/dd',assignee:'AI开发Agent',progress:100,project:'expense'},
  {type:'需求',size:'大',source:'飞书',sourceId:'FS-33',exec:'专家团',status:'未开始',collab:'Agent间协作',title:'移动端审批流开发',desc:'开发移动端审批流程，支持微信/钉钉/飞书消息通知和审批操作',assignee:'待分配',progress:0,project:'expense'},
  {type:'需求',size:'大',source:'Jira',sourceId:'PUR-18',exec:'专家团',status:'进行中',collab:'人人协作',title:'采购订单批量导入',desc:'支持 Excel 批量导入采购订单，含供应商匹配、价格校验与错误行回执',assignee:'李工',progress:38,project:'purchase'},
  {type:'Bug',size:'小',source:'TAPD',sourceId:'BUG-8102',exec:'自动执行',status:'待评审',collab:'人Agent协作',title:'采购入库单反审核报错',desc:'反审核已关联付款单的入库单时抛空指针，需补充关联校验与提示',assignee:'AI开发Agent',progress:0,project:'purchase'},
  {type:'任务',size:'小',source:'对话自建',sourceId:'CNV-011',exec:'自动执行',status:'已完成',collab:'无需协作',title:'采购订单列表新增供应商筛选',desc:'列表页筛选区增加供应商下拉，支持按编码与名称模糊匹配',assignee:'AI开发Agent',progress:100,project:'purchase'},
  {type:'改进',size:'大',source:'Jira',sourceId:'PUR-25',exec:'专家团',status:'未开始',collab:'人人协作',title:'采购价格审批链重构',desc:'按金额分级审批，超阈值自动加签采购总监，并保留完整审批留痕',assignee:'待分配',progress:0,project:'purchase'},
  {type:'需求',size:'大',source:'飞书',sourceId:'FS-52',exec:'专家团',status:'进行中',collab:'Agent间协作',title:'供应商协同门户对接',desc:'打通供应商门户的订单确认与交期回复，含消息推送与状态回写',assignee:'冯远',progress:52,project:'supply'},
  {type:'任务',size:'小',source:'API',sourceId:'API-31',exec:'自动执行',status:'未开始',collab:'人Agent协作',title:'交期变更消息推送',desc:'交期变更时向采购员推送企业微信消息，推送失败进入重试队列',assignee:'待分配',progress:0,project:'supply'},
  {type:'Bug',size:'小',source:'Jira',sourceId:'BUG-8155',exec:'自动执行',status:'已失败',collab:'Agent间协作',title:'供应商评级定时任务超时',desc:'评级任务在供应商超 2 万条时超时中断，需要改为分片执行',assignee:'AI开发Agent',progress:0,project:'supply'},
  {type:'需求',size:'小',source:'对话自建',sourceId:'CNV-014',exec:'自动执行',status:'已完成',collab:'无需协作',title:'供应商档案资质到期提醒',desc:'资质到期前 30 天在档案列表标红，并向对接采购员推送提醒',assignee:'AI开发Agent',progress:100,project:'supply'}
];

var CV_REVIEW_ARTIFACTS={
0:{tabs:['源代码','技术方案'],content:{
'源代码':'<h1>审批流插件 - 源代码</h1><p>文件: ApprovalFlowPlugin.java</p><pre>public class ApprovalFlowPlugin extends AbstractPlugin {\n  @Override\n  public void execute(ExecutionContext ctx) {\n    ApprovalContext ac = ctx.getApprovalContext();\n    List&lt;ApprovalNode&gt; nodes = ac.getApprovalNodes();\n    for (ApprovalNode node : nodes) {\n      if (node.isTimeout(30, TimeUnit.MINUTES)) {\n        handleTimeout(node, ac);\n        continue;\n      }\n      if (node.getStatus() == NodeStatus.PENDING) {\n        notifyApprover(node);\n      }\n    }\n    // 多级审批流转\n    if (ac.allNodesProcessed()) {\n      ctx.complete();\n    }\n  }\n  private void handleTimeout(ApprovalNode node, ApprovalContext ac) {\n    // 超时自动升级\n    ac.escalateToSuperior(node);\n  }\n}</pre><p>文件: ApprovalFlowService.java</p><pre>public class ApprovalFlowService {\n  public ApprovalResult submit(ExpenseReport report) {\n    ApprovalFlow flow = buildFlow(report);\n    flow.start();\n    return flow.getResult();\n  }\n}</pre>',
'技术方案':'<h1>审批流插件技术方案</h1><h2>1. 概述</h2><p>基于苍穹插件机制实现费用报销多级审批流转，支持串行/并行审批、超时自动升级、异常回退。</p><h2>2. 核心设计</h2><h3>2.1 审批节点模型</h3><table><tr><th>字段</th><th>类型</th><th>说明</th></tr><tr><td>nodeId</td><td>String</td><td>节点唯一标识</td></tr><tr><td>approver</td><td>String</td><td>审批人ID</td></tr><tr><td>status</td><td>Enum</td><td>PENDING/APPROVED/REJECTED</td></tr><tr><td>timeout</td><td>int</td><td>超时时间(分钟)</td></tr></table><h3>2.2 流转规则</h3><ul><li>串行模式：按节点顺序依次审批</li><li>并行模式：同级节点同时审批，全部通过后进入下一级</li><li>超时处理：超过 timeout 分钟自动升级到上级</li></ul><h2>3. 异常处理</h2><ul><li>审批人离职：自动转交代理人</li><li>审批人拒绝：流程回退到发起人</li><li>系统异常：记录日志并发送告警</li></ul>'}},
1:{tabs:['技术方案','需求规格'],content:{
'技术方案':'<h1>多级审批流性能优化方案</h1><h2>1. 性能问题分析</h2><p>当前审批流在 5000+ 并发场景下平均响应时间 > 3s，瓶颈在数据库查询和节点状态同步。</p><h2>2. 优化方案</h2><h3>2.1 缓存优化</h3><ul><li>审批节点状态缓存到 Redis，TTL 5 分钟</li><li>批量查询替代循环单条查询</li></ul><h3>2.2 异步化</h3><ul><li>通知发送改为异步消息队列</li><li>超时检查改为定时任务批量扫描</li></ul><h3>2.3 数据库优化</h3><table><tr><th>优化项</th><th>预计提升</th></tr><tr><td>索引优化</td><td>40%</td></tr><tr><td>分页查询</td><td>30%</td></tr><tr><td>读写分离</td><td>20%</td></tr></table>',
'需求规格':'<h1>需求规格说明书 - PRD</h1><h2>1. 背景与目标</h2><p>随着报销业务量增长，现有审批流在高峰期出现严重性能瓶颈，需要优化以支持千人并发审批。</p><h2>2. 功能需求</h2><h3>2.1 性能指标</h3><ul><li>支持 1000+ 并发审批</li><li>平均响应时间 < 500ms</li><li>99.9% 请求在 1s 内完成</li></ul><h3>2.2 兼容性</h3><ul><li>向下兼容现有审批流配置</li><li>支持灰度发布</li></ul>'}},
2:{tabs:['技术方案','需求规格','源代码'],content:{
'技术方案':'<h1>权限体系重构技术方案 - Spec</h1><h2>1. 设计目标</h2><p>基于 RBAC 模型重构权限体系，实现数据权限与功能权限分离，支持角色继承和细粒度授权。</p><h2>2. 权限模型</h2><h3>2.1 角色层级</h3><table><tr><th>层级</th><th>角色</th><th>权限范围</th></tr><tr><td>L1</td><td>系统管理员</td><td>全部</td></tr><tr><td>L2</td><td>部门管理员</td><td>本部门</td></tr><tr><td>L3</td><td>普通用户</td><td>个人数据</td></tr></table><h3>2.2 权限类型</h3><ul><li>功能权限：菜单、按钮、API 接口</li><li>数据权限：行级、列级过滤</li><li>字段权限：字段可见/可编辑</li></ul>',
'需求规格':'<h1>权限体系重构需求规格</h1><h2>1. 业务背景</h2><p>当前权限体系不支持角色继承，数据权限与功能权限耦合，维护成本高。</p><h2>2. 功能需求</h2><ul><li>支持角色继承，子角色自动继承父角色权限</li><li>数据权限支持行级过滤（按部门/项目）</li><li>支持字段级权限控制</li><li>权限变更实时生效，无需重新登录</li></ul>',
'源代码':'<h1>权限服务 - 源代码</h1><pre>public class PermissionService {\n  public boolean hasPermission(String userId, String resource, String action) {\n    List&lt;Role&gt; roles = roleService.getUserRoles(userId);\n    return roles.stream().anyMatch(r ->\n      r.hasPermission(resource, action) ||\n      (r.getParent() != null && r.getParent().hasPermission(resource, action))\n    );\n  }\n  public DataFilter getDataFilter(String userId, String resource) {\n    List&lt;Role&gt; roles = roleService.getUserRoles(userId);\n    return DataFilterComposer.compose(roles, resource);\n  }\n}</pre>'}},
3:{tabs:['源代码','技术方案'],content:{
'源代码':'<h1>打印模板优化 - 源代码</h1><pre>public class PrintTemplateRenderer {\n  public byte[] render(ExpenseReport report, TemplateConfig config) {\n    Workbook wb = new XSSFWorkbook();\n    Sheet header = wb.createSheet("报销单");\n    // 页眉\n    if (config.hasHeader()) {\n      renderHeader(header, config.getHeader());\n    }\n    // 水印\n    if (config.hasWatermark()) {\n      addWatermark(wb, config.getWatermark());\n    }\n    // 数据行\n    renderRows(header, report.getItems());\n    return wb.getBytes();\n  }\n}</pre>',
'技术方案':'<h1>打印模板优化方案</h1><h2>1. 需求</h2><p>支持自定义页眉页脚、水印、多页打印、Excel 格式输出。</p><h2>2. 技术选型</h2><ul><li>基于 Apache POI 5.x 生成 Excel</li><li>水印通过 Sheet 背景图实现</li><li>页眉页脚通过 HeaderFooter API</li></ul>'}},
4:{tabs:['源代码','单元测试'],content:{
'源代码':'<h1>附件上传 502 修复 - 源代码</h1><pre>public class AttachmentUploadHandler {\n  @Override\n  public UploadResult handle(UploadRequest req) {\n    int maxRetry = 3;\n    for (int i = 0; i &lt; maxRetry; i++) {\n      try {\n        return uploadToStorage(req.getFile());\n      } catch (StorageException e) {\n        if (i == maxRetry - 1) throw e;\n        Thread.sleep(1000 * (i + 1)); // 指数退避\n      }\n    }\n    throw new StorageException("Upload failed after retries");\n  }\n}</pre>',
'单元测试':'<h1>附件上传 - 单元测试报告</h1><h2>测试用例</h2><table><tr><th>用例</th><th>输入</th><th>预期</th><th>结果</th></tr><tr><td>正常上传</td><td>1MB 文件</td><td>成功</td><td>✅ 通过</td></tr><tr><td>弱网重试</td><td>模拟 502</td><td>重试 3 次后成功</td><td>✅ 通过</td></tr><tr><td>超时</td><td>10s 超时</td><td>返回超时错误</td><td>✅ 通过</td></tr><tr><td>空文件</td><td>0 字节</td><td>拒绝上传</td><td>✅ 通过</td></tr></table><p>覆盖率: 95% | 通过: 4/4</p>'}},
5:{tabs:['需求规格','源代码'],content:{
'需求规格':'<h1>需求规格 - 团建费选项</h1><h2>1. 需求描述</h2><p>在费用类型下拉中增加"团建费"选项，归属"部门活动费用"类别。</p><h2>2. 验收标准</h2><ul><li>费用类型下拉列表中可见"团建费"</li><li>选择后归属类别显示为"部门活动费用"</li><li>报销统计报表中可按团建费维度统计</li></ul>'}},
6:{tabs:['需求规格'],content:{
'需求规格':'<h1>多币种报销需求规格 - PRD</h1><h2>1. 业务背景</h2><p>随着国际化业务扩展，员工出差涉及多币种报销，需支持原币金额与本位币金额双重记录。</p><h2>2. 功能需求</h2><h3>2.1 币种管理</h3><ul><li>支持人民币(CNY)、美元(USD)、欧元(EUR)、日元(JPY)、港币(HKD)</li><li>币种汇率每日自动更新，支持手动调整</li></ul><h3>2.2 报销录入</h3><ul><li>选择币种后自动带出当日汇率</li><li>原币金额 + 汇率 = 本位币金额（自动计算，可手动修正）</li><li>同一报销单支持多币种明细行</li></ul><h2>3. 验收标准</h2><table><tr><th>场景</th><th>预期</th></tr><tr><td>单币种报销</td><td>正常提交审批</td></tr><tr><td>多币种混合报销</td><td>按行汇总本位币金额</td></tr><tr><td>汇率手动修正</td><td>记录修正人和修正时间</td></tr></table>'}},
7:{tabs:['测试用例','测试报告','源代码'],content:{
'测试用例':'<h1>费用明细列表页 - 测试用例</h1><h2>测试场景</h2><table><tr><th>用例</th><th>输入</th><th>预期</th><th>优先级</th></tr><tr><td>正常分页查询</td><td>page=1,size=20</td><td>返回 20 条数据</td><td>P0</td></tr><tr><td>大数据量查询</td><td>10000 条数据</td><td>响应 &lt; 500ms</td><td>P0</td></tr><tr><td>模糊搜索</td><td>keyword="差旅"</td><td>返回含"差旅"的记录</td><td>P1</td></tr><tr><td>时间范围筛选</td><td>startDate ~ endDate</td><td>返回范围内数据</td><td>P1</td></tr><tr><td>空结果处理</td><td>查无数据</td><td>显示"暂无数据"</td><td>P2</td></tr><tr><td>权限过滤</td><td>普通用户</td><td>仅返回本人数据</td><td>P0</td></tr></table>',
'测试报告':'<h1>费用明细列表页 - 测试报告</h1><h2>执行结果</h2><table><tr><th>用例</th><th>结果</th><th>备注</th></tr><tr><td>正常分页查询</td><td>✅ 通过</td><td>-</td></tr><tr><td>大数据量查询</td><td>✅ 通过</td><td>平均 280ms</td></tr><tr><td>模糊搜索</td><td>✅ 通过</td><td>-</td></tr><tr><td>时间范围筛选</td><td>✅ 通过</td><td>-</td></tr><tr><td>空结果处理</td><td>✅ 通过</td><td>-</td></tr><tr><td>权限过滤</td><td>❌ 失败</td><td>部门管理员可见下级数据，实际返回空</td></tr></table><p>通过: 5/6 | 覆盖率: 87%</p>',
'源代码':'<h1>费用明细列表页 - 源代码</h1><pre>public class ExpenseDetailListService {\n  public PageResult&lt;ExpenseDetail&gt; query(ExpenseQuery query) {\n    // 权限过滤\n    if (!query.getUser().isAdmin()) {\n      query.setUserId(query.getUser().getId());\n    }\n    // 分页查询\n    return expenseDetailDao.selectByPage(query, query.getPage(), query.getSize());\n  }\n}</pre>'}},
8:{tabs:['部署方案','运维手册'],content:{
'部署方案':'<h1>审批流插件部署方案</h1><h2>1. 部署策略</h2><h3>1.1 灰度发布</h3><ul><li>第一阶段：10% 流量灰度，观察 2 小时</li><li>第二阶段：50% 流量，观察 4 小时</li><li>第三阶段：100% 全量发布</li></ul><h3>1.2 回滚方案</h3><ul><li>自动回滚：错误率 &gt; 5% 时自动触发</li><li>手动回滚：一键切换到旧版本</li><li>数据回滚：审批流状态数据不回滚，仅回滚插件代码</li></ul><h2>2. 监控告警</h2><table><tr><th>指标</th><th>阈值</th><th>告警方式</th></tr><tr><td>审批流错误率</td><td>&gt; 1%</td><td>钉钉 + 邮件</td></tr><tr><td>审批响应时间</td><td>&gt; 2s</td><td>钉钉</td></tr><tr><td>审批队列积压</td><td>&gt; 100 条</td><td>钉钉 + 短信</td></tr></table>',
'运维手册':'<h1>审批流插件 - 运维手册</h1><h2>1. 常用命令</h2><pre># 查看插件状态\nkubectl get pods -l app=approval-flow-plugin\n\n# 查看插件日志\nkubectl logs -f deployment/approval-flow-plugin\n\n# 回滚到上一版本\nkubectl rollout undo deployment/approval-flow-plugin</pre><h2>2. 常见问题</h2><h3>2.1 审批流卡住</h3><ul><li>检查 Redis 连接是否正常</li><li>检查审批节点状态是否为 PENDING</li><li>查看审批超时配置是否生效</li></ul><h3>2.2 性能下降</h3><ul><li>检查数据库索引是否生效</li><li>检查缓存命中率</li><li>查看是否有慢查询</li></ul>'}}
};
var CV_REVIEW_COMMENTS={
0:[{author:'李工',avatar:'李',type:'comment',text:'代码结构清晰，但建议将审批超时逻辑抽离为独立的 TimeoutHandler 类，提高可测试性。',time:'今日 14:20'},{author:'陈晨',avatar:'陈',type:'comment',text:'单元测试覆盖了多级审批场景，但缺少异常分支测试（审批人离职、系统异常等）。',time:'今日 15:30'}],
1:[{author:'王工',avatar:'王',type:'comment',text:'缓存方案合理，但需要考虑 Redis 宕机时的降级策略。建议增加本地缓存兜底。',time:'昨日 16:00'},{author:'张工',avatar:'张',type:'pass',text:'方案整体可行，性能指标满足要求。同意推进。',time:'今日 09:15'}],
2:[{author:'王工',avatar:'王',type:'comment',text:'RBAC 模型设计合理，角色继承逻辑需要补充循环依赖检测。',time:'2 天前 10:00'},{author:'陈晨',avatar:'陈',type:'comment',text:'数据权限行级过滤方案需要验证大数据量下的性能。',time:'昨日 14:30'},{author:'李工',avatar:'李',type:'reject',text:'PermissionService.hasPermission 方法在角色链较深时性能有问题，建议增加缓存。',time:'今日 11:00'}],
3:[{author:'陈晨',avatar:'陈',type:'comment',text:'水印实现方案可行，但多页打印时页眉需要每页重复渲染。',time:'3 小时前'}],
4:[{author:'刘洋',avatar:'刘',type:'comment',text:'指数退避策略合理，但建议增加熔断机制，避免连续重试拖垮系统。',time:'1 小时前'}],
5:[{author:'吴芳',avatar:'吴',type:'pass',text:'需求简单明确，实现完整，同意合入。',time:'昨日 14:30'}],
6:[{author:'王工',avatar:'王',type:'comment',text:'多币种需求描述清晰，但汇率自动更新的时间需要明确（每日凌晨还是实时？）',time:'今日 10:00'}],
7:[{author:'李工',avatar:'李',type:'reject',text:'权限过滤用例失败，部门管理员可见下级数据的逻辑有 Bug，需要修复后重新提交。',time:'今日 14:00'},{author:'陈晨',avatar:'陈',type:'comment',text:'测试用例覆盖了主要场景，建议增加并发查询的用例。',time:'今日 15:30'}],
8:[{author:'王工',avatar:'王',type:'comment',text:'灰度发布策略合理，建议第一阶段缩短到 1 小时。',time:'昨日 16:00'}]
};

var CV_REVIEWS = [
  {type:'任务',size:'大',source:'Jira',exec:'专家团',priority:'紧急',reviewType:'代码评审',title:'审批流插件代码审查',desc:'审查费用报销审批流的插件实现，包括多级审批流转逻辑和异常处理',reviewer:'王工',reviewerRole:'架构人员',deadline:'今日 18:00',deadlineColor:'var(--danger)',borderColor:'var(--danger)',from:'张工',fromTime:'今日 10:30',artifacts:['源代码','单元测试','技术方案'],project:'expense'},
  {type:'需求',size:'大',source:'Jira',exec:'专家团',priority:'高',reviewType:'方案评审',title:'多级审批流性能优化方案',desc:'当前审批流在多级审批场景下存在性能瓶颈，需要优化审批流转逻辑',reviewer:'王工',reviewerRole:'架构人员',deadline:'明日 12:00',deadlineColor:'var(--warning)',borderColor:'var(--warning)',from:'张工',fromTime:'昨日 16:20',artifacts:['技术方案','需求规格'],project:'expense'},
  {type:'任务',size:'大',source:'Jira',exec:'专家团',priority:'中',reviewType:'方案评审',title:'权限体系重构方案评审',desc:'基于 RBAC 模型重构权限体系，支持角色分级、数据权限和功能权限分离',reviewer:'张工',reviewerRole:'开发人员',deadline:'3 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'赵琳',fromTime:'2 天前',artifacts:['技术方案','需求规格','源代码'],project:'expense'},
  {type:'改进',size:'小',source:'对话自建',exec:'自动执行',priority:'中',reviewType:'代码评审',title:'打印模板优化方案评审',desc:'优化报销单打印模板，支持自定义页眉页脚和水印',reviewer:'陈晨',reviewerRole:'测试人员',deadline:'2 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'AI开发Agent',fromTime:'3 小时前',artifacts:['源代码','技术方案'],project:'expense'},
  {type:'Bug',size:'小',source:'TAPD',exec:'自动执行',priority:'紧急',reviewType:'代码评审',title:'附件上传 502 修复方案评审',desc:'附件上传在弱网环境下偶发 502 错误的重试机制实现',reviewer:'张工',reviewerRole:'开发人员',deadline:'今日 20:00',deadlineColor:'var(--danger)',borderColor:'var(--danger)',from:'AI开发Agent',fromTime:'1 小时前',artifacts:['源代码','单元测试'],project:'expense'},
  {type:'需求',size:'小',source:'对话自建',exec:'自动执行',priority:'低',reviewType:'需求评审',title:'费用类型新增选项评审',desc:'在费用类型下拉中增加团建费选项的实现',reviewer:'吴芳',reviewerRole:'需求人员',deadline:'5 天后',deadlineColor:'var(--success)',borderColor:'var(--dot-blue)',from:'AI开发Agent',fromTime:'昨日 14:00',artifacts:['需求规格','源代码'],project:'expense'},
  {type:'需求',size:'大',source:'Jira',exec:'专家团',priority:'高',reviewType:'需求评审',title:'多币种报销需求规格评审',desc:'支持多币种报销，含汇率转换、原币金额与本位币金额双重记录',reviewer:'赵琳',reviewerRole:'需求人员',deadline:'明日 18:00',deadlineColor:'var(--warning)',borderColor:'var(--warning)',from:'王工',fromTime:'今日 09:00',artifacts:['需求规格'],project:'expense'},
  {type:'任务',size:'大',source:'Jira',exec:'专家团',priority:'中',reviewType:'测试评审',title:'费用明细列表页测试用例评审',desc:'审查费用明细列表页的测试用例覆盖度，包括边界值、异常场景、性能场景',reviewer:'陈晨',reviewerRole:'测试人员',deadline:'3 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'李工',fromTime:'昨日 11:00',artifacts:['测试用例','测试报告','源代码'],project:'expense'},
  {type:'任务',size:'中',source:'TAPD',exec:'专家团',priority:'中',reviewType:'部署评审',title:'审批流插件部署方案评审',desc:'审批流插件灰度发布方案，含回滚策略和监控告警配置',reviewer:'周杰',reviewerRole:'运维人员',deadline:'4 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'王工',fromTime:'2 天前 15:00',artifacts:['部署方案','运维手册'],project:'expense'},
  {type:'需求',size:'大',source:'Jira',exec:'专家团',priority:'高',reviewType:'方案评审',title:'采购价格审批链重构方案',desc:'按金额分级审批与超阈值自动加签的流程设计，含审批留痕方案',reviewer:'冯远',reviewerRole:'架构人员',deadline:'明日 10:00',deadlineColor:'var(--warning)',borderColor:'var(--warning)',from:'李工',fromTime:'今日 09:20',artifacts:['技术方案','需求规格'],project:'purchase'},
  {type:'Bug',size:'小',source:'TAPD',exec:'自动执行',priority:'中',reviewType:'代码评审',title:'采购入库单反审核校验补充',desc:'反审核关联付款单的校验实现与回归用例',reviewer:'张工',reviewerRole:'开发人员',deadline:'3 天后',deadlineColor:'var(--dot-blue)',borderColor:'var(--dot-blue)',from:'AI开发Agent',fromTime:'今日 11:40',artifacts:['源代码','单元测试'],project:'purchase'},
  {type:'需求',size:'大',source:'飞书',exec:'专家团',priority:'紧急',reviewType:'需求评审',title:'供应商协同门户对接需求规格',desc:'订单确认与交期回复的字段口径、异常处理与状态回写规则',reviewer:'张工',reviewerRole:'开发人员',deadline:'今日 20:00',deadlineColor:'var(--danger)',borderColor:'var(--danger)',from:'冯远',fromTime:'今日 08:50',artifacts:['需求规格','技术方案'],project:'supply'}
];

var CV_MEMBERS = [
  {name:'张工',email:'zhang***@kingdee.com',roles:[{tag:'member-tag--dev',text:'开发'},{tag:'member-tag--arch',text:'架构'}],status:'available',source:'直接成员',isMe:true,projects:['expense','purchase','supply']},
  {name:'李工',email:'li***@kingdee.com',roles:[{tag:'member-tag--dev',text:'开发'}],status:'available',source:'直接成员',projects:['expense','purchase']},
  {name:'王工',email:'wang***@kingdee.com',roles:[{tag:'member-tag--dev',text:'开发'},{tag:'member-tag--arch',text:'架构'}],status:'busy',source:'直接成员',projects:['expense','supply']},
  {name:'赵琳',email:'zha***@kingdee.com',roles:[{tag:'member-tag--pm',text:'需求'},{tag:'member-tag--pm',text:'产品'}],status:'available',source:'继承自 灵基AIOS',projects:'*'},
  {name:'陈晨',email:'chen***@kingdee.com',roles:[{tag:'member-tag--qa',text:'测试'}],status:'available',source:'直接成员',projects:['expense']},
  {name:'刘洋',email:'liu***@kingdee.com',roles:[{tag:'member-tag--qa',text:'测试'}],status:'busy',source:'直接成员',projects:['purchase']},
  {name:'周杰',email:'zhou***@kingdee.com',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'直接成员',projects:['expense','purchase']},
  {name:'孙明',email:'sun***@kingdee.com',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'继承自 灵基AIOS',projects:'*'},
  {name:'吴芳',email:'wu***@kingdee.com',roles:[{tag:'member-tag--pm',text:'需求'}],status:'available',source:'直接成员',projects:['expense']},
  {name:'郑凯',email:'zheng***@kingdee.com',roles:[{tag:'member-tag--dev',text:'开发'}],status:'busy',source:'直接成员',projects:['expense']},
  {name:'钱涛',email:'qian***@kingdee.com',roles:[{tag:'member-tag--dev',text:'开发'}],status:'available',source:'直接成员',projects:['purchase']},
  {name:'宋宇',email:'song***@kingdee.com',roles:[{tag:'member-tag--pm',text:'产品'}],status:'available',source:'继承自 灵基AIOS',projects:'*'},
  {name:'冯远',email:'feng***@kingdee.com',roles:[{tag:'member-tag--arch',text:'架构'}],status:'available',source:'直接成员',projects:['supply']},
  {name:'许诺',email:'xu***@kingdee.com',roles:[{tag:'member-tag--dev',text:'开发'},{tag:'member-tag--arch',text:'架构'}],status:'busy',source:'直接成员',projects:['purchase','supply']},
  {name:'蒋雯',email:'jiang***@kingdee.com',roles:[{tag:'member-tag--pm',text:'需求'},{tag:'member-tag--pm',text:'产品'}],status:'available',source:'继承自 灵基AIOS',projects:'*'},
  {name:'何欣',email:'he***@kingdee.com',roles:[{tag:'member-tag--pm',text:'需求'}],status:'available',source:'直接成员',projects:['supply']},
  {name:'韩梅',email:'han***@kingdee.com',roles:[{tag:'member-tag--qa',text:'测试'}],status:'available',source:'直接成员',projects:['purchase']},
  {name:'罗静',email:'luo***@kingdee.com',roles:[{tag:'member-tag--qa',text:'测试'}],status:'busy',source:'直接成员',projects:['supply']},
  {name:'杨帆',email:'yang***@kingdee.com',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'直接成员',projects:['purchase']},
  {name:'唐辉',email:'tang***@kingdee.com',roles:[{tag:'member-tag--ops',text:'运维'}],status:'available',source:'继承自 灵基AIOS',projects:'*'},
  {name:'梁平',email:'liang***@kingdee.com',roles:[{tag:'member-tag--pm',text:'产品'},{tag:'member-tag--owner',text:'所有者'}],status:'available',source:'直接成员',projects:['expense','purchase','supply']}
];

var CV_WORKFLOW = ['需求分析','方案设计','开发实现','代码审查','测试验证','部署发布'];
var CV_WORKFLOW_ROLES = {'需求分析':'需求人员','方案设计':'架构人员','开发实现':'开发人员','代码审查':'开发人员','测试验证':'测试人员','部署发布':'运维人员'};
var CV_THIRD_PARTY_MEMBERS=[
  {name:'钱涛',email:'qian***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
  {name:'宋宇',email:'song***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
  {name:'冯远',email:'feng***@kingdee.com',role:'架构',tag:'member-tag--arch',dept:'架构部'},
  {name:'许诺',email:'xu***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
  {name:'韩梅',email:'han***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
  {name:'罗静',email:'luo***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
  {name:'杨帆',email:'yang***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'},
  {name:'唐辉',email:'tang***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'},
  {name:'蒋雯',email:'jiang***@kingdee.com',role:'需求',tag:'member-tag--pm',dept:'产品部'},
  {name:'何欣',email:'he***@kingdee.com',role:'需求',tag:'member-tag--pm',dept:'产品部'},
  {name:'梁平',email:'liang***@kingdee.com',role:'产品',tag:'member-tag--pm',dept:'产品部'},
  {name:'范晨',email:'fan***@kingdee.com',role:'开发',tag:'member-tag--dev',dept:'研发部'},
  {name:'董睿',email:'dong***@kingdee.com',role:'架构',tag:'member-tag--arch',dept:'架构部'},
  {name:'贾旭',email:'jia***@kingdee.com',role:'测试',tag:'member-tag--qa',dept:'测试部'},
  {name:'武威',email:'wu***@kingdee.com',role:'运维',tag:'member-tag--ops',dept:'运维部'}
];

function cvRenderTaskStats(){
  var counts={未开始:0,待评审:0,进行中:0,已完成:0,已失败:0};
  var rows=CV_TASKS.filter(cvInProject);
  rows.forEach(function(t){counts[t.status]=(counts[t.status]||0)+1;});
  var el=document.getElementById('cv-task-stats');if(!el)return;
  var stats=[
    {num:rows.length,label:'全部任务',color:'var(--text)',status:'全部状态'},
    {num:counts['未开始']||0,label:'未开始',color:'var(--text-secondary)',status:'未开始'},
    {num:counts['待评审']||0,label:'待评审',color:'var(--warning)',status:'待评审'},
    {num:counts['进行中']||0,label:'进行中',color:'var(--dot-blue)',status:'进行中'},
    {num:counts['已完成']||0,label:'已完成',color:'var(--success)',status:'已完成'},
    {num:counts['已失败']||0,label:'已失败',color:'var(--danger)',status:'已失败'}
  ];
  el.innerHTML=stats.map(function(s){
    return '<div class="stat" onclick="cvClickStat(this,\''+s.status+'\')"><div class="stat-num" style="color:'+s.color+'">'+s.num+'</div><div class="stat-label">'+s.label+'</div></div>';
  }).join('');
}
function cvRenderTasks(){
  var grid=document.getElementById('cv-task-grid');if(!grid)return;
  grid.innerHTML=CV_TASKS.map(function(t,i){return cvInProject(t)?cvBuildTaskCard(t,i):'';}).join('');
  if(!grid.innerHTML) grid.innerHTML='<div class="x-empty">该项目下还没有任务</div>';
}
function cvBuildTaskCard(t,i){
  var typeCls={'需求':'badge-type','Bug':'badge-bug','任务':'badge-task','改进':'badge-improve'}[t.type]||'badge-type';
  var sizeCls=t.size==='大'?'badge-size-l':'badge-size-s';
  var srcCls={'Jira':'source-tag--jira','TAPD':'source-tag--tapd','对话自建':'source-tag--build','API':'source-tag--api','飞书':'source-tag--feishu'}[t.source]||'source-tag--build';
  var execCls=t.exec==='专家团'?'badge-expert':'badge-auto';
  var statusMap={'未开始':'pending','待评审':'review','进行中':'running','已完成':'done','已失败':'fail'};
  var sc=statusMap[t.status]||'pending';
  var nodeMap={'未开始':'需求分析','待评审':'代码审查','进行中':'开发实现','已完成':'部署发布','已失败':'开发实现'};
  var node=nodeMap[t.status]||'需求分析';
  return '<div class="card" data-type="'+t.type+'" data-status="'+t.status+'" data-collab="'+t.collab+'" data-size="'+t.size+'" data-idx="'+i+'">'
    +'<div class="card-top"><div class="card-row">'
    +'<span class="badge '+typeCls+'">'+t.type+'</span>'
    +'<span class="badge '+sizeCls+'">'+t.size+'</span>'
    +'<span class="source-tag '+srcCls+'">'+t.source+'</span>'
    +'<span class="badge-status badge-status--'+sc+'"><span class="badge-status-dot"></span>'+t.status+'</span>'
    +cvProjectTag(t)
    +'</div><span class="badge '+execCls+'">'+t.exec+'</span></div>'
    +'<div class="card-title">'+t.title+'</div>'
    +'<div class="card-desc">'+t.desc+'</div>'
    +'<div class="card-footer"><div class="assignee"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'+t.assignee+'</div><span style="font-size:11px;color:var(--text-soft)">'+t.source+' '+t.sourceId+'</span></div>'
    +'</div>';
}
function cvRenderReviewStats(){
  var el=document.getElementById('cv-review-stats');if(!el)return;
  var rows=CV_REVIEWS.filter(cvInProject);
  var urgent=rows.filter(function(r){return r.priority==='紧急';}).length;
  var mine=rows.filter(function(r){return r.from==='张工';}).length;
  var assigned=rows.filter(function(r){return r.reviewer==='张工';}).length;
  var stats=[
    {num:rows.length,label:'待评审',color:'var(--warning)',filter:'全部待评审'},
    {num:urgent,label:'即将到期',color:'var(--danger)',filter:'紧急'},
    {num:mine,label:'我发起的',color:'var(--dot-blue)',filter:'我发起的'},
    {num:assigned,label:'分配给我',color:'var(--success)',filter:'分配给我的'}
  ];
  el.innerHTML=stats.map(function(s){
    return '<div class="stat" onclick="cvClickReviewStat(this,\''+s.filter+'\')"><div class="stat-num" style="color:'+s.color+'">'+s.num+'</div><div class="stat-label">'+s.label+'</div></div>';
  }).join('');
}
function cvRenderReviews(){
  var grid=document.getElementById('cv-review-grid');if(!grid)return;
  grid.innerHTML=CV_REVIEWS.map(function(r,i){return cvInProject(r)?cvBuildReviewCard(r,i):'';}).join('');
  if(!grid.innerHTML) grid.innerHTML='<div class="x-empty">该项目下没有待评审的内容</div>';
}
function cvBuildReviewCard(r,i){
  var typeCls={'需求':'badge-type','Bug':'badge-bug','任务':'badge-task','改进':'badge-improve'}[r.type]||'badge-type';
  var sizeCls=r.size==='大'?'badge-size-l':'badge-size-s';
  var srcCls={'Jira':'source-tag--jira','TAPD':'source-tag--tapd','对话自建':'source-tag--build','API':'source-tag--api','飞书':'source-tag--feishu'}[r.source]||'source-tag--build';
  var artHtml=r.artifacts.map(function(a){return '<span class="review-artifact">'+a+'</span>';}).join(' · ');
  return '<div class="card" data-idx="'+i+'" onclick="cvOpenReviewDetail('+i+')">'
    +'<div class="card-top"><div class="card-row">'
    +'<span class="badge '+typeCls+'">'+r.type+'</span>'
    +'<span class="badge '+sizeCls+'">'+r.size+'</span>'
    +'<span class="source-tag '+srcCls+'">'+r.source+'</span>'
    +'<span class="badge-status badge-status--review"><span class="badge-status-dot"></span>待评审</span>'
    +cvProjectTag(r)
    +'</div><span class="badge badge-expert">'+r.exec+'</span></div>'
    +'<div class="card-title">'+r.title+'</div>'
    +'<div class="card-desc">'+r.desc+'</div>'
    +'<div class="review-info">'
    +'<div class="review-info-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>评审人: <b>'+r.reviewer+'</b> <span>('+r.reviewerRole+')</span></div>'
    +'<div class="review-info-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="'+r.deadlineColor+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>截止: <b style="color:'+r.deadlineColor+'">'+r.deadline+'</b></div>'
    +'<div class="review-info-item"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>产物: '+artHtml+'</div>'
    +'</div>'
    +'<div class="card-actions"><span class="card-node"><span class="card-node-dot"></span>'+r.reviewType+'</span><div style="display:flex;gap:4px;margin-left:auto">'
    +'<button class="act-btn act-btn--exec" onclick="event.stopPropagation();cvReviewPass('+i+')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>通过</button>'
    +'<button class="act-btn act-btn--reject" onclick="event.stopPropagation();cvReviewReject('+i+')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>驳回</button>'
    +'<button class="card-view-btn" onclick="event.stopPropagation();cvOpenReviewDetail('+i+')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>查看对话</button>'
    +'</div></div></div>';
}
function cvRenderMembers(){
  var el=document.getElementById('cv-member-list');if(!el)return;
  el.innerHTML=CV_MEMBERS.map(function(m,i){
    if(!cvInProject(m)) return '';
    var tagHtml=m.roles.map(function(r){return '<span class="member-tag '+r.tag+'">'+r.text+'</span>';}).join('');
    var statusCls=m.status==='available'?'member-status--available':'member-status--busy';
    var statusText=m.status==='available'?'可用':'繁忙';
    var avatarCls=m.isMe?'member-avatar member-avatar--me':'member-avatar';
    var nameCls=m.isMe?'member-name member-name--me':'member-name';
    return '<div class="member-row" data-role="'+m.roles.map(function(r){return r.text;}).join(' ')+'">'
      +'<div class="'+avatarCls+'">'+m.name[0]+'</div>'
      +'<div class="member-info"><div class="'+nameCls+'">'+m.name+(m.isMe?' （你）':'')+'</div><div class="member-email">'+m.email+'</div><div class="member-tags">'+tagHtml+'</div></div>'
      +'<span class="member-status '+statusCls+'">'+statusText+'</span>'
      +'<span class="member-source">'+m.source+'</span>'
      +(m.isMe?'':'<button class="member-del" onclick="cvDeleteMember('+i+')" title="移除"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>')
      +'</div>';
  }).join('');
}
function cvRenderMemberStats(){
  var el=document.getElementById('cv-member-stats');if(!el)return;
  var counts={需求:0,架构:0,开发:0,测试:0,运维:0,产品:0};
  var rows=CV_MEMBERS.filter(cvInProject);
  rows.forEach(function(m){m.roles.forEach(function(r){var k=r.text;if(counts[k]!==undefined)counts[k]++;});});
  var stats=[
    {num:rows.length,label:'全部成员',color:'var(--text)'},
    {num:counts['需求'],label:'需求人员',color:'var(--dot-blue)'},
    {num:counts['架构'],label:'架构人员',color:'var(--brand)'},
    {num:counts['开发'],label:'开发人员',color:'var(--success)'},
    {num:counts['测试'],label:'测试人员',color:'var(--warning)'},
    {num:counts['运维'],label:'运维人员',color:'var(--danger)'},
    {num:counts['产品'],label:'产品人员',color:'#7858f9'}
  ];
  el.innerHTML=stats.map(function(s){return '<div class="stat"><div class="stat-num" style="color:'+s.color+'">'+s.num+'</div><div class="stat-label">'+s.label+'</div></div>';}).join('');
}
function cvInjectCardActions(){
  document.querySelectorAll('#cv-task-grid .card').forEach(function(card){
    if(card.querySelector('.card-actions'))return;
    var idx=parseInt(card.getAttribute('data-idx'));
    var t=CV_TASKS[idx];if(!t)return;
    var status=t.status;
    var nodeMap={'未开始':'需求分析','待评审':'代码审查','进行中':'开发实现','已完成':'部署发布','已失败':'开发实现'};
    var node=nodeMap[status]||'需求分析';
    var execBtn='<button class="act-btn act-btn--exec" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-exec-overlay\')" title="执行任务"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>执行</button>';
    var transferBtn='<button class="act-btn act-btn--transfer" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-transfer-overlay\')" title="转交任务"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>转交</button>';
    var twistBtn='<button class="act-btn act-btn--twist" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-twist-overlay\')" title="扭转任务"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.7"/><polyline points="21 3 21 9 15 9"/></svg>扭转</button>';
    var reviewBtn='<button class="act-btn act-btn--review" onclick="event.stopPropagation();window.cvCard=this.closest(\'.card\');cvOpenTaskModal(\'cv-review-overlay\')" title="发起评审"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>评审</button>';
    var viewBtn='<button class="card-view-btn" onclick="event.stopPropagation();cvOpenConversation(this.closest(\'.card\'))" title="查看对话"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>查看对话</button>';
    var btns='';
    if(status==='未开始'){btns=execBtn+transferBtn+twistBtn+reviewBtn;}
    else if(status==='待评审'){btns=reviewBtn+viewBtn;}
    else{btns=viewBtn;card.classList.add('card--clickable');card.onclick=function(e){if(!e.target.closest('.act-btn')&&!e.target.closest('.card-view-btn'))cvOpenConversation(card);};}
    var ad=document.createElement('div');ad.className='card-actions';
    ad.innerHTML='<span class="card-node"><span class="card-node-dot"></span>'+node+'</span><div style="display:flex;gap:4px;margin-left:auto">'+btns+'</div>';
    card.appendChild(ad);
    if(status==='进行中'){}
  });
}

/* cvProject 由其它模块写回；import 绑定只读，所以走这个 setter */
export function set_cvProject(v){ cvProject=v; return v; }

export { CV_MEMBERS, CV_PROJECTS, CV_REVIEWS, CV_REVIEW_ARTIFACTS, CV_REVIEW_COMMENTS, CV_TASKS, CV_THIRD_PARTY_MEMBERS, CV_WORKFLOW, CV_WORKFLOW_ROLES, cvConfigOverride, cvInProject, cvInjectCardActions, cvProject, cvProjectById, cvProjectName, cvRenderMemberStats, cvRenderMembers, cvRenderReviewStats, cvRenderReviews, cvRenderTaskStats, cvRenderTasks };
