/* 开发实现阶段的「网站预览」：按任务 / 项目的业务主题生成一个可操作的演示网站（单页 HTML，在沙箱 iframe 中运行）。
   主题由项目名、任务标题与描述里的关键词判断，没有命中时用任务产物里的演示列表数据。 */

var THEMES = [
  { id: 'tickets', match: /工单|客服|售后|SLA/, slug: 'tickets', app: '工单管理系统', unit: '工单', nav: ['工单列表', '我的待办', 'SLA 监控', '知识库'],
    stats: [['今日新增', '36'], ['待受理', '12'], ['处理中', '27'], ['SLA 达成率', '96.4%']],
    statuses: ['待受理', '处理中', '待回复', '已解决', '已关闭'],
    columns: ['工单编号', '标题', '提交人', '优先级', '处理人', '状态', '更新时间'],
    status: 5,
    rows: [
      ['TK-20481', '订单支付成功但未生成发货单', '陈晓燕', '紧急', '李工', '处理中', '10-05 09:42'],
      ['TK-20480', '导出报表缺少最后一页数据', '周明', '高', '王工', '待回复', '10-05 09:15'],
      ['TK-20479', '企业微信通知延迟超过 10 分钟', '刘洋', '高', '赵琳', '待受理', '10-05 08:58'],
      ['TK-20478', '新员工账号无法登录移动端', '孙悦', '中', '陈晨', '处理中', '10-04 17:30'],
      ['TK-20477', '发票抬头修改申请', '吴芳', '低', '周杰', '已解决', '10-04 16:12'],
      ['TK-20476', '合同模板字段映射错误', '郑凯', '中', '王工', '已解决', '10-04 14:05'],
      ['TK-20475', '客户回访任务未自动生成', '钱涛', '中', '李工', '已关闭', '10-03 18:20'],
    ],
    create: { prefix: 'TK-', defaults: ['', '', '陈晓燕', '中', '李工', '待受理'], labels: ['标题', '优先级'], priority: 3 } },
  { id: 'purchase', match: /采购|供应商|订单/, slug: 'procurement', app: '采购管理系统', unit: '采购订单', nav: ['采购订单', '供应商', '入库收货', '统计分析'],
    stats: [['本月订单', '128'], ['待审核', '17'], ['本月金额', '¥ 1,284,650'], ['准时到货率', '94.2%']],
    statuses: ['草稿', '待审核', '已审核', '已入库'],
    columns: ['订单编号', '供应商', '采购员', '订单日期', '含税金额', '状态'],
    status: 5,
    rows: [
      ['PO-2026-0048', '深圳恒达科技有限公司', '张伟', '10-04', '¥ 145,205.00', '已审核'],
      ['PO-2026-0047', '上海博远电子有限公司', '李敏', '10-03', '¥ 89,350.00', '待审核'],
      ['PO-2026-0046', '广州华信科技有限公司', '张伟', '10-02', '¥ 216,800.00', '已入库'],
      ['PO-2026-0045', '北京天元科技有限公司', '王强', '10-01', '¥ 56,320.00', '草稿'],
      ['PO-2026-0044', '杭州云帆物资有限公司', '李敏', '09-30', '¥ 73,900.00', '已审核'],
    ],
    create: { prefix: 'PO-2026-', defaults: ['', '', '张伟', '', '¥ 0.00', '草稿'], labels: ['供应商', '含税金额'], money: 4 } },
  { id: 'expense', match: /报销|费用|预算|差旅/, slug: 'expense', app: '费用报销系统', unit: '报销单', nav: ['我的报销', '待我审批', '预算占用', '报表'],
    stats: [['本月报销', '326'], ['待审批', '41'], ['本月金额', '¥ 862,430'], ['超标拦截', '9']],
    statuses: ['草稿', '待审批', '已通过', '已驳回', '已付款'],
    columns: ['报销单号', '事由', '申请人', '部门', '金额', '状态', '提交日期'],
    status: 5,
    rows: [
      ['BX-20931', '北京客户拜访差旅', '赵琳', '销售部', '¥ 3,860.00', '待审批', '10-04'],
      ['BX-20930', '9 月办公用品采购', '陈晨', '行政部', '¥ 1,240.50', '已通过', '10-03'],
      ['BX-20929', '深圳项目交付出差', '李工', '研发部', '¥ 5,420.00', '已驳回', '10-03'],
      ['BX-20928', '团队建设活动费用', '周杰', '运营部', '¥ 6,800.00', '已付款', '10-02'],
      ['BX-20927', '软件订阅续费', '王工', '研发部', '¥ 2,980.00', '待审批', '10-02'],
    ],
    create: { prefix: 'BX-', defaults: ['', '', '陈晓燕', '研发部', '¥ 0.00', '草稿', ''], labels: ['事由', '金额'], money: 4 } },
  { id: 'inventory', match: /库存|入库|出库|盘点|物料|仓/, slug: 'inventory', app: '库存管理系统', unit: '库存单据', nav: ['库存总览', '入库管理', '出库管理', '盘点'],
    stats: [['物料种类', '1,248'], ['低库存预警', '23'], ['今日入库', '86'], ['今日出库', '71']],
    statuses: ['待入库', '已入库', '待出库', '已出库'],
    columns: ['单据编号', '物料名称', '数量', '仓库', '经办人', '状态', '日期'],
    status: 5,
    rows: [
      ['RK-3302', '铜芯电缆 3×2.5', '1,200 米', '华南一仓', '孙明', '已入库', '10-04'],
      ['CK-4417', '变频器 7.5kW', '6 台', '华东二仓', '吴芳', '待出库', '10-04'],
      ['RK-3301', '控制柜 IP65', '12 台', '华南一仓', '郑凯', '待入库', '10-03'],
      ['CK-4416', '传感器模组 A2', '240 件', '华北仓', '钱涛', '已出库', '10-03'],
      ['RK-3300', '包装纸箱 600×400', '3,000 个', '华东二仓', '孙明', '已入库', '10-02'],
    ],
    create: { prefix: 'RK-', defaults: ['', '', '', '华南一仓', '孙明', '待入库', ''], labels: ['物料名称', '数量'], qty: 2 } },
];

var GENERIC = { id: 'generic', slug: 'app', app: '业务管理系统', unit: '业务单据', nav: ['业务列表', '待我处理', '统计分析', '系统设置'],
  stats: [['本月单据', '128'], ['待处理', '17'], ['处理中', '34'], ['完成率', '92%']],
  statuses: ['待确认', '处理中', '已完成'],
  columns: ['业务编号', '事项名称', '负责人', '更新时间', '状态'],
  status: 4,
  rows: [], create: { prefix: 'BIZ-', defaults: ['', '', '陈晓燕', '', '待确认'], labels: ['事项名称', '负责人'] } };

/* 判断主题：项目名和任务标题优先，其次任务描述 */
export function sitePreviewTheme(projectName, task) {
  var primary = String(projectName || '') + ' ' + String((task && task.title) || '');
  var secondary = String((task && task.desc) || '');
  return THEMES.find(function (t) { return t.match.test(primary); })
    || THEMES.find(function (t) { return t.match.test(secondary); })
    || GENERIC;
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, '');
}

/* 通用主题没有现成数据时，用任务产物里的演示列表补行（head / rows 来自「功能页面」块） */
function genericData(theme, app, task) {
  if (!app || !app.rows || !app.rows.length) return theme;
  var columns = app.head.slice();
  var rows = app.rows.map(function (row) { return row.slice(); });
  var statusIndex = columns.length - 1;
  var statuses = Array.from(new Set(rows.map(function (row) { return row[statusIndex]; })));
  return Object.assign({}, theme, {
    columns: columns, rows: rows, status: statusIndex, statuses: statuses.length ? statuses : theme.statuses,
    stats: (app.stats || theme.stats).concat([['完成率', '92%']]).slice(0, 4),
    create: Object.assign({}, theme.create, { defaults: columns.map(function (_, i) { return i === statusIndex ? statuses[0] || '待确认' : ''; }), labels: [columns[1] || '事项名称', columns[2] || '负责人'], personIndex: 2 }),
  });
}

export function buildSitePreviewHtml(options) {
  var theme = sitePreviewTheme(options.projectName, options.task);
  var data = theme.id === 'generic' ? genericData(theme, options.app, options.task) : theme;
  var payload = {
    appName: (options.projectName || data.app) , module: data.app, unit: data.unit, title: (options.pageTitle || data.unit + '管理'),
    nav: data.nav, stats: data.stats, statuses: data.statuses, columns: data.columns, rows: data.rows,
    statusIndex: data.status, create: data.create,
  };
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + String(payload.appName).replace(/[<>&]/g, '') + '</title>' +
    '<style>' + SITE_CSS + '</style></head><body><div class="app" id="app"></div><script>var DATA=' + safeJson(payload) + ';' + SITE_JS + '<\/script></body></html>';
}

var SITE_CSS = ':root{--brand:#495dff;--brand-soft:#eef0ff;--text:#1d2129;--muted:#6b7280;--line:#e8eaf0;--bg:#f6f7fb;--card:#fff;--ok:#08a040;--ok-soft:#e8faef;--warn:#c06010;--warn-soft:#fff1e8;--bad:#d7261e;--bad-soft:#ffecea}' +
  '*{box-sizing:border-box}html,body{height:100%}body{margin:0;font:13px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;color:var(--text);background:var(--bg)}' +
  '.app{display:flex;height:100vh;min-height:360px}.nav{width:176px;flex:none;background:#fff;border-right:1px solid var(--line);padding:16px 10px;display:flex;flex-direction:column;gap:2px;overflow:auto}' +
  '.logo{display:flex;align-items:center;gap:8px;font-weight:700;font-size:14px;padding:0 8px 14px}.logo i{width:24px;height:24px;border-radius:7px;background:var(--brand);color:#fff;display:grid;place-items:center;font-style:normal;font-size:13px;flex:none}.logo span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '.nav button{display:block;width:100%;text-align:left;border:0;background:none;padding:8px 10px;border-radius:8px;font:inherit;color:var(--text);cursor:pointer}.nav button:hover{background:var(--bg)}.nav button.on{background:var(--brand-soft);color:var(--brand);font-weight:600}' +
  '.main{flex:1;min-width:0;display:flex;flex-direction:column;padding:18px 22px 20px;gap:14px;overflow:auto}' +
  '.head{display:flex;align-items:center;gap:12px}.head h1{font-size:18px;margin:0;flex:1}.btn{border:1px solid var(--line);background:#fff;border-radius:8px;padding:6px 14px;font:inherit;cursor:pointer}.btn.pri{background:var(--brand);border-color:var(--brand);color:#fff}.btn:hover{filter:brightness(.97)}' +
  '.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 16px}.stat small{color:var(--muted)}.stat b{display:block;font-size:22px;margin-top:2px;font-variant-numeric:tabular-nums}' +
  '.panel{flex:1;min-height:0;background:var(--card);border:1px solid var(--line);border-radius:12px;display:flex;flex-direction:column;overflow:hidden}' +
  '.tools{display:flex;gap:10px;align-items:center;padding:12px 14px;border-bottom:1px solid var(--line);flex-wrap:wrap}.tools input{flex:1;min-width:140px;border:1px solid var(--line);border-radius:8px;padding:6px 10px;font:inherit;outline:none}.tools input:focus{border-color:var(--brand)}' +
  '.tabs{display:flex;gap:4px;flex-wrap:wrap}.tabs button{border:0;background:none;border-radius:999px;padding:4px 12px;font:inherit;color:var(--muted);cursor:pointer}.tabs button.on{background:var(--brand-soft);color:var(--brand);font-weight:600}' +
  '.scroll{flex:1;min-height:0;overflow:auto}table{width:100%;border-collapse:collapse}th{position:sticky;top:0;background:#fafbfd;text-align:left;font-weight:600;color:var(--muted);padding:9px 14px;border-bottom:1px solid var(--line);white-space:nowrap}td{padding:10px 14px;border-bottom:1px solid var(--line);white-space:nowrap;max-width:260px;overflow:hidden;text-overflow:ellipsis}tr.row{cursor:pointer}tr.row:hover td{background:#fafbff}' +
  '.pill{display:inline-block;padding:1px 9px;border-radius:999px;font-size:12px;background:var(--bg);color:var(--muted)}.pill.ok{background:var(--ok-soft);color:var(--ok)}.pill.warn{background:var(--warn-soft);color:var(--warn)}.pill.bad{background:var(--bad-soft);color:var(--bad)}.pill.info{background:var(--brand-soft);color:var(--brand)}' +
  '.empty{padding:40px;text-align:center;color:var(--muted)}.foot{padding:8px 14px;color:var(--muted);font-size:12px;border-top:1px solid var(--line)}' +
  '.mask{position:fixed;inset:0;background:rgba(0,0,0,.28);display:flex;justify-content:flex-end}.side{width:min(380px,100%);background:#fff;height:100%;padding:18px 20px;overflow:auto;box-shadow:-8px 0 24px rgba(0,0,0,.08)}.side h2{margin:0 0 12px;font-size:16px}.kv{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--line)}.kv span{width:84px;color:var(--muted);flex:none}.kv div{min-width:0;overflow-wrap:anywhere}' +
  '.dlg{position:fixed;inset:0;background:rgba(0,0,0,.28);display:grid;place-items:center}.dlg form{background:#fff;border-radius:14px;padding:20px;width:min(380px,92%);display:flex;flex-direction:column;gap:12px}.dlg h2{margin:0;font-size:16px}.dlg label{display:flex;flex-direction:column;gap:4px;color:var(--muted)}.dlg input{border:1px solid var(--line);border-radius:8px;padding:7px 10px;font:inherit;color:var(--text);outline:none}.dlg input:focus{border-color:var(--brand)}.dlg .ft{display:flex;justify-content:flex-end;gap:8px;margin-top:4px}' +
  '.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1d2129;color:#fff;padding:8px 16px;border-radius:8px;font-size:12px}' +
  '@media(max-width:620px){.nav{display:none}.main{padding:12px}}';

var SITE_JS = '(function(){' +
  'var D=DATA,rows=D.rows.map(function(r){return r.slice()}),tab="全部",q="",navIdx=0,seq=rows.length+1;' +
  'function esc(v){return String(v==null?"":v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}' +
  'function cls(s){if(/完成|通过|已解决|已审核|已入库|已出库|已付款|已发布/.test(s))return "ok";if(/驳回|超时|紧急|已关闭|异常/.test(s))return "bad";if(/待|草稿/.test(s))return "warn";if(/处理中|审批|进行/.test(s))return "info";return ""}' +
  'function matches(r){if(tab!=="全部"&&r[D.statusIndex]!==tab)return false;return !q||r.join(" ").toLowerCase().indexOf(q.toLowerCase())>=0}' +
  'function toast(t){var e=document.createElement("div");e.className="toast";e.textContent=t;document.body.appendChild(e);setTimeout(function(){e.remove()},1600)}' +
  'function cell(r,i){var v=r[i];if(i===D.statusIndex||(D.columns[i]==="优先级"))return "<span class=\\"pill "+cls(v)+"\\">"+esc(v)+"</span>";return esc(v)}' +
  'function render(){' +
  'var shown=rows.filter(matches);var counts={};D.statuses.forEach(function(s){counts[s]=0});rows.forEach(function(r){counts[r[D.statusIndex]]=(counts[r[D.statusIndex]]||0)+1});' +
  'var tabs=["全部"].concat(D.statuses);' +
  'document.getElementById("app").innerHTML=' +
  '"<aside class=\\"nav\\"><div class=\\"logo\\"><i>"+esc(D.appName.slice(0,1))+"</i><span title=\\""+esc(D.appName)+"\\">"+esc(D.appName)+"</span></div>"+D.nav.map(function(n,i){return "<button class=\\""+(i===navIdx?"on":"")+"\\" data-nav=\\""+i+"\\">"+esc(n)+"</button>"}).join("")+"</aside>"+' +
  '"<main class=\\"main\\"><div class=\\"head\\"><h1>"+esc(D.nav[navIdx]===D.nav[0]?D.title:D.nav[navIdx])+"</h1><button class=\\"btn\\" data-act=\\"export\\">导出</button><button class=\\"btn pri\\" data-act=\\"new\\">＋ 新建"+esc(D.unit)+"</button></div>"+' +
  '"<div class=\\"stats\\">"+D.stats.map(function(s,i){return "<div class=\\"stat\\"><small>"+esc(s[0])+"</small><b>"+esc(i===0&&navIdx===0?s[1]:s[1])+"</b></div>"}).join("")+"</div>"+' +
  '"<section class=\\"panel\\"><div class=\\"tools\\"><input id=\\"kw\\" placeholder=\\"搜索编号、名称、人员\\" value=\\""+esc(q)+"\\"><div class=\\"tabs\\">"+tabs.map(function(t){return "<button class=\\""+(t===tab?"on":"")+"\\" data-tab=\\""+esc(t)+"\\">"+esc(t)+(t==="全部"?" "+rows.length:" "+(counts[t]||0))+"</button>"}).join("")+"</div></div>"+' +
  '"<div class=\\"scroll\\">"+(shown.length?"<table><thead><tr>"+D.columns.map(function(c){return "<th>"+esc(c)+"</th>"}).join("")+"</tr></thead><tbody>"+shown.map(function(r){var i=rows.indexOf(r);return "<tr class=\\"row\\" data-row=\\""+i+"\\">"+r.map(function(_,k){return "<td>"+cell(r,k)+"</td>"}).join("")+"</tr>"}).join("")+"</tbody></table>":"<div class=\\"empty\\">没有符合条件的记录</div>")+"</div>"+' +
  '"<div class=\\"foot\\">共 "+shown.length+" 条 · 演示数据，操作仅在当前页面生效</div></section></main>";' +
  'var kw=document.getElementById("kw");kw.addEventListener("input",function(){q=kw.value;var p=kw.selectionStart;render();var n=document.getElementById("kw");n.focus();n.setSelectionRange(p,p)})}' +
  'function detail(i){var r=rows[i];var m=document.createElement("div");m.className="mask";m.innerHTML="<div class=\\"side\\"><h2>"+esc(r[0])+"</h2>"+D.columns.map(function(c,k){return "<div class=\\"kv\\"><span>"+esc(c)+"</span><div>"+cell(r,k)+"</div></div>"}).join("")+"<div style=\\"margin-top:16px;text-align:right\\"><button class=\\"btn\\" data-close>关闭</button></div></div>";m.addEventListener("click",function(e){if(e.target===m||e.target.hasAttribute("data-close"))m.remove()});document.body.appendChild(m)}' +
  'function create(){var C=D.create,m=document.createElement("div");m.className="dlg";m.innerHTML="<form><h2>新建"+esc(D.unit)+"</h2>"+C.labels.map(function(l,i){return "<label>"+esc(l)+"<input name=\\"f"+i+"\\" required></label>"}).join("")+"<div class=\\"ft\\"><button type=\\"button\\" class=\\"btn\\" data-close>取消</button><button class=\\"btn pri\\">提交</button></div></form>";' +
  'm.addEventListener("click",function(e){if(e.target===m||e.target.hasAttribute("data-close"))m.remove()});' +
  'm.querySelector("form").addEventListener("submit",function(e){e.preventDefault();var f=e.target,row=C.defaults.slice(),code=C.prefix+String(2000+(seq++));row[0]=code;' +
  'var idx={};' +
  'D.columns.forEach(function(c,k){idx[c]=k});' +
  'C.labels.forEach(function(l,i){var k=idx[l];var v=f.elements["f"+i].value.trim();if(k!=null)row[k]=v});' +
  'var d=new Date(),stamp=(d.getMonth()+1<10?"0":"")+(d.getMonth()+1)+"-"+(d.getDate()<10?"0":"")+d.getDate();' +
  'D.columns.forEach(function(c,k){if(/日期|时间/.test(c)&&!row[k])row[k]=stamp+(/时间/.test(c)?" "+("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2):"")});' +
  'D.columns.forEach(function(c,k){if(row[k]===""||row[k]==null)row[k]="—"});' +
  'rows.unshift(row);m.remove();tab="全部";q="";render();toast("已新建 "+code)});' +
  'document.body.appendChild(m);m.querySelector("input").focus()}' +
  'document.addEventListener("click",function(e){var t=e.target;var n=t.closest("[data-nav]");if(n){navIdx=Number(n.getAttribute("data-nav"));render();if(navIdx>0)toast("「"+D.nav[navIdx]+"」为演示入口，数据与列表一致");return}' +
  'var tb=t.closest("[data-tab]");if(tb){tab=tb.getAttribute("data-tab");render();return}' +
  'var a=t.closest("[data-act]");if(a){if(a.getAttribute("data-act")==="new")create();else toast("已导出当前列表（演示）");return}' +
  'var r=t.closest("[data-row]");if(r)detail(Number(r.getAttribute("data-row")))});' +
  'render()})();';
