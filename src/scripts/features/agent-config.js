import { $, $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { syncTogglePreviewBtn } from './chat.js';
import { agentCardByName, agentCardStatus, openAgentSubmit } from './agent-submit.js';
/* 智能体开发：会话右侧的智能体配置面板
   对齐 Lingee Build 智能体开发会话：左侧是 agent-builder 的交付摘要，右侧是配置（基础信息 / 角色设定 / 技能配置 / 知识），
   保存、测试、提交都在面板顶部；提交复用智能体卡片的「提交上架审核」确认。
   知识页可上传附件，解析后成为智能体内置知识；上传、保存都会写入更新日志。数据均为本地模拟。 */

var panel = null;
var home = null;
var agentName = '';
var logs = [];
var files = [];
var selectedFolder = '';
var parseTimers = [];

var EMPTY_ICON = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 13h5l1.5 2h5L16 13h5"/></svg>';
/* 各智能体的配置内容（角色设定正文写在脚本里，避免 HTML 片段引入时的缩进混进 textarea）；
   设备故障诊断助手是 HTML 里的默认内容，销售履约智能体打开时整体替换 */
var PROFILES = {
  '设备故障诊断助手': {
    id: 'equipment-diagnosis-assistant', domain: '通用', owner: '周建国', kb: '设备管理知识库',
    desc: '维修工程师报上设备编号和故障现象，先通过设备巡检维修系统查设备档案和维修记录，再按老师傅的经验给出排查步骤。',
    role: [
      '# 设备故障诊断助手',
      '',
      '你是工厂里的设备维修老师傅，服务于设备部的维修工程师，按设备主管周建国多年的排障经验，帮他们排查注塑机、空压机、数控机床的故障。',
      '',
      '# 工作职责',
      '',
      '- 维修工程师报上设备编号和故障现象后，调用「查询设备档案」确认型号、位置和当前状态',
      '- 调用「查询维修记录」读取这台设备近 12 个月的维修记录，找出最近换过的零件',
      '- 结合维修记录和排障经验，给出按先后顺序排列的排查步骤，并注明依据的维修记录',
      '',
      '# 工作原则',
      '',
      '- 先查记录再下判断：结论要能对应到具体的维修记录',
      '- 最近换过的零件优先怀疑',
      '- 注塑机温度忽高忽低：先查热电偶接线，再查加热圈，最后查温控表',
      '- 空压机压力不足：先查进气滤芯，再查泄压阀，最后查管路泄漏',
      '- 碰到高压电先断电挂牌：涉及加热圈、温控表等带电部件的步骤，先提醒断电挂牌',
      '- 只读数据，不修改任何记录；超出经验范围时建议联系设备主管'
    ].join('\n'),
    skills: null,
    docs: [
      { name: '设备排障手册', type: 'PDF', size: '3.1 MB', date: '2026/9/25' },
      { name: '注塑机维修规程', type: 'PDF', size: '2.4 MB', date: '2026/9/18' },
      { name: '设备点检标准', type: 'DOCX', size: '860 KB', date: '2026/9/2' },
    ],
    logs: ['创建智能体', '新增技能「查询设备档案、查询维修记录」', '知识范围调整：新增关联 设备管理知识库'],
  },
  '销售履约智能体': {
    id: 'sales-fulfillment-agent', domain: '销售', owner: '林悦', kb: '销售履约知识库',
    desc: '管住销售订单从接单到回款的全过程：查客户信用、建销售订单、下推发货与出库、比价选运输商、分析应收并生成催收函和销售月报，数据来自金蝶 ERP。',
    role: [
      '# 销售履约智能体',
      '',
      '你是销售部的商务专员，按商务主管林悦多年的履约规矩，帮销售人员把订单从接单一路跟到回款。',
      '',
      '# 工作职责',
      '',
      '- 收到客户采购单后，调用「接单制单」解析采购单、查询客户信用，在金蝶 ERP 创建销售订单',
      '- 订单审核后，调用「履约执行」依次下推发货通知、运单和销售出库，并比价选择运输商',
      '- 调用「收款催收」汇总应收与逾期，按催收规则生成催收函',
      '- 月底调用「销售月报」统计签单、履约和回款，生成月度复盘',
      '',
      '# 工作原则',
      '',
      '- 先查信用再接单：额度利用率超过 50% 或存在逾期时先提醒，不直接建单',
      '- 改动 ERP 的操作先存草稿，问过销售人员再提交审核',
      '- 履约按发货通知、运单、出库的顺序下推；ERP 缺基础资料时停下来交给人补，不硬做',
      '- 运输商在赶得上要货日期的前提下选运费最低的，并出比价报告',
      '- 催收只管逾期 30 天以上的应收；同一客户合并一封，按最高等级定级；L1 温和提醒，给 7 个工作日回复',
      '- 每一步的结果做成网页报告，套用公司模板；金额按本位币，出库不等于签收'
    ].join('\n'),
    skills: [
      ['接', '接单制单', '解析客户采购单，查询客户信用额度和逾期，在金蝶 ERP 创建销售订单（暂存，确认后提交审核）。'],
      ['履', '履约执行', '下推发货通知、运单和销售出库，按运价表比价选择运输商，生成比价报告和履约报告。'],
      ['催', '收款催收', '多币种汇总应收、已收和逾期，按催收规则合并定级，套用模板生成催收函。'],
      ['报', '销售月报', '统计当月签单、按期出库、回款与月末应收，套用模板生成月度经营复盘。'],
    ],
    docs: [
      { name: '客户信用管理办法', type: 'PDF', size: '1.2 MB', date: '2026/9/20' },
      { name: '销售订单履约规范', type: 'DOCX', size: '640 KB', date: '2026/9/16' },
      { name: '应收账款催收制度', type: 'PDF', size: '980 KB', date: '2026/9/8' },
    ],
    logs: ['创建智能体', '新增技能「接单制单、履约执行、收款催收、销售月报」', '连接金蝶 ERP：客户信用、销售订单、发货通知、运单、销售出库、应收、收款', '知识范围调整：新增关联 销售履约知识库'],
  },
};
var DEFAULT_SKILLS_HTML = '';
function profile() { return PROFILES[agentName] || PROFILES['设备故障诊断助手']; }
var TRASH_ICON = '<svg class="ic" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 4h12M13 4l-1.1 8.9a1.6 1.6 0 0 1-1.6 1.4H5.7a1.6 1.6 0 0 1-1.6-1.4L3 4M5.5 4l.3-1.2A1.6 1.6 0 0 1 7.4 1.6h1.2a1.6 1.6 0 0 1 1.6 1.2L10.5 4M9.3 7.3V11M6.7 7.3V11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function esc(v) { return String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function pad(n) { return String(n).padStart(2, '0'); }
function nowStamp() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function baseName(name) { return name.replace(/\.[^.]+$/, ''); }
function sizeLabel(bytes) { return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB'; }

function setTab(name) {
  $$('.agent-config-tab[data-tab]', panel).forEach(function (tab) {
    var on = tab.getAttribute('data-tab') === name;
    tab.classList.toggle('active', on);
    tab.setAttribute('aria-selected', on ? 'true' : 'false');
    tab.tabIndex = on ? 0 : -1;
  });
  $$('.agent-config-pane', panel).forEach(function (pane) {
    pane.hidden = pane.getAttribute('data-pane') !== name;
  });
}

function currentStatus() { return agentCardStatus(agentCardByName(agentName)) || '已保存'; }

function renderLog() {
  var status = currentStatus();
  var submitted = status === '已提交' || status === '已发布';
  var state = $('#agentConfigLogState', panel);
  state.textContent = status === '已发布' ? '已发布' : submitted ? '已提交审核' : '未发布修改';
  state.classList.toggle('is-submitted', submitted);
  $('#agentConfigLogCount', panel).textContent = logs.length + ' 条编辑';
  $('#agentConfigLogList', panel).innerHTML = logs.slice().reverse().map(function (row) {
    return '<li><time>' + esc(row.time) + '</time><span class="agent-config-log-by">· ' + esc(row.by) + '</span>' + esc(row.text) + '</li>';
  }).join('');
}
function currentUser() { return ($('#userName') && $('#userName').textContent.trim()) || profile().owner; }
function addLog(text) { logs.push({ time: nowStamp(), by: currentUser(), text: text }); renderLog(); }

function syncStatus() {
  var status = currentStatus();
  var label = $('#agentConfigStatus', panel);
  label.textContent = status;
  label.classList.toggle('is-submitted', status === '已提交');
  var submit = $('#agentConfigSubmit', panel);
  var canSubmit = status === '已保存' || status === '已驳回';
  submit.disabled = !canSubmit;
  submit.querySelector('span').textContent = canSubmit ? '提交' : status;
  submit.title = canSubmit ? '' : '当前状态为' + status + '，无需再次提交';
  renderLog();
}

/* 知识：左侧目录（关联企业知识 / 上传知识的临时目录），右侧为所选目录的文件卡片 */
function folderDocs(folder) { return folder === 'enterprise' ? profile().docs : files; }
function renderFiles() {
  var q = ($('#agentKnowledgeSearch', panel).value || '').trim().toLowerCase();
  $('#agentKbTempCount', panel).textContent = String(files.length);
  $$('.agent-config-kb-folder', panel).forEach(function (el) {
    el.setAttribute('aria-selected', String(el.getAttribute('data-kb-folder') === selectedFolder));
  });
  var label = selectedFolder === 'enterprise' ? profile().kb : '临时目录';
  var shown = folderDocs(selectedFolder).filter(function (f) { return !q || (f.name + ' ' + label + ' ' + (f.by || '')).toLowerCase().indexOf(q) >= 0; });
  $('#agentKnowledgeList', panel).innerHTML = shown.length ? shown.map(function (f) {
    return '<div class="agent-config-kb-card' + (f.parsing ? ' is-parsing' : '') + '">'
      + '<div class="agent-config-kb-card-head"><span class="agent-config-kb-tag">' + esc(label) + '</span><span class="agent-config-kb-type">' + esc(f.type) + '</span>'
      + '<button type="button" class="agent-config-kb-del" data-kb-del="' + esc(f.name) + '" aria-label="删除 ' + esc(f.name) + '" data-tooltip="删除">' + TRASH_ICON + '</button></div>'
      + '<div class="agent-config-kb-card-name">' + esc(f.name) + '</div>'
      + '<div class="agent-config-kb-card-sub">' + (f.parsing ? '上传中…' : esc(f.size) + ' · 上传于 ' + esc(f.date)) + '</div></div>';
  }).join('') : '<div class="agent-config-kb-none">' + EMPTY_ICON + '<span>' + (q ? '没有匹配的结果' : '该目录下暂无知识') + '</span></div>';
}

function addFiles(list) {
  var added = 0;
  selectedFolder = 'temp';
  Array.prototype.forEach.call(list, function (file) {
    var name = baseName(file.name);
    var existing = files.find(function (f) { return f.name === name; });
    var row = existing || { name: name };
    var d = new Date();
    row.type = (file.name.split('.').pop() || '').toUpperCase(); row.size = sizeLabel(file.size || 0); row.by = currentUser();
    row.date = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate(); row.parsing = true;
    if (!existing) files.push(row);
    added++;
    parseTimers.push(setTimeout(function () {
      row.parsing = false;
      renderFiles();
      addLog('知识范围调整：新增关联 ' + row.name);
    }, 900));
  });
  renderFiles();
  parseTimers.push(setTimeout(function () { toast(added + '个文档上传并保存成功', 'success'); }, 900));
}

/* 智能体由 Build 按任务描述生成时的编辑记录；临时目录为空，附件由搭建人在知识页上传 */
function resetState(fresh) {
  parseTimers.forEach(clearTimeout); parseTimers = [];
  var p = profile(), t = fresh ? nowStamp() : '2026-10-04 11:00';
  logs = p.logs.map(function (text) { return { time: t, by: p.owner, text: text }; });
  files = [];
  selectedFolder = 'temp';
  $('#agentKnowledgeSearch', panel).value = '';
}
/* 基础信息、技能卡、关联知识目录按当前智能体填充 */
function fillProfile() {
  var p = profile();
  $('.agent-config-id', panel).textContent = p.id;
  var name = $('#agentConfigBasic input.agent-config-input', panel); if (name) name.value = agentName;
  var desc = $('#agentConfigBasic textarea.agent-config-input', panel); if (desc) desc.value = p.desc;
  var domain = $('#agentConfigBasic select.agent-config-input', panel); if (domain) domain.value = p.domain;
  var list = $('.agent-config-skill-list', panel);
  if (!DEFAULT_SKILLS_HTML) DEFAULT_SKILLS_HTML = list.innerHTML;
  list.innerHTML = p.skills ? p.skills.map(function (sk) {
    return '<div class="agent-config-skill"><span class="agent-config-letter" aria-hidden="true">' + esc(sk[0]) + '</span>'
      + '<div class="agent-config-item-main"><div class="agent-config-item-title">' + esc(sk[1]) + '<span class="agent-config-meta">本地技能<i></i>已发布</span></div><div class="agent-config-item-desc">' + esc(sk[2]) + '</div></div></div>';
  }).join('') : DEFAULT_SKILLS_HTML;
  var folder = $('.agent-config-kb-folder[data-kb-folder="enterprise"]', panel);
  folder.setAttribute('data-kb-name', p.kb);
  folder.querySelector('span:not(.agent-config-kb-check)').textContent = p.kb;
  $('#agentKbEnterpriseCount', panel).textContent = String(p.docs.length);
}

/* 测试下拉（头部） */
var MENUS = [['#agentConfigTest', '#agentConfigTestMenu']];
function closeTestMenu(focus) {
  MENUS.forEach(function (pair) {
    var menu = $(pair[1], panel);
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    $(pair[0], panel).setAttribute('aria-expanded', 'false');
    if (focus) $(pair[0], panel).focus();
  });
}
function toggleTestMenu(btnSel, menuSel) {
  var menu = $(menuSel, panel);
  var open = menu.hidden;
  closeTestMenu(false);
  if (!open) return;
  menu.hidden = false;
  $(btnSel, panel).setAttribute('aria-expanded', 'true');
  menu.querySelector('.agent-config-menu-item').focus();
}

function prepare(name, opts) {
  /* opts.keep：同一智能体再次打开时保留上传的知识和更新日志，只回到基础信息页 */
  if (opts && opts.keep && agentName === name && logs.length) { setTab('basic'); renderFiles(); syncStatus(); panel.hidden = false; return; }
  agentName = name;
  $('#agentConfigName', panel).textContent = name;
  $('#agentConfigRoleText', panel).value = profile().role;
  fillProfile();
  resetState(opts && opts.fresh);
  if (opts && opts.folder) selectedFolder = opts.folder;
  setTab((opts && opts.tab) || 'basic');
  renderFiles();
  syncStatus();
  panel.hidden = false;
}

/* 面板只有一份 DOM：智能体开发会话里放在 #chatPreviewSide；协作开发任务的产物预览借用时临时挂到预览区，关闭时还回来 */
export function unmountAgentConfig() {
  if (!panel || !home || panel.parentNode === home) return;
  closeTestMenu(false);
  panel.hidden = true;
  panel.classList.remove('is-embedded');
  delete panel.dataset.mode;
  home.appendChild(panel);
}

/* 任务产物里查看智能体配置：提交由任务的「提交上架」阶段完成，面板不显示提交按钮 */
export function mountAgentConfig(host, name) {
  if (!panel || !host) return;
  unmountAgentConfig();
  panel.classList.add('is-embedded');
  panel.dataset.mode = 'task';
  host.replaceChildren(panel);
  /* 同一智能体重新挂载（如任务详情重绘）时保留上传的知识、测试结果和当前页签 */
  if (agentName === name && logs.length) { panel.hidden = false; syncStatus(); return; }
  prepare(name);
}

/* opts.tab / opts.folder：打开时停在的页签和知识目录（新会话里刚生成的智能体先看知识库）；opts.keep：保留当前状态 */
export function openAgentConfig(name, opts) {
  if (!panel) return;
  unmountAgentConfig();
  prepare(name, opts);
  var view = $('#view-chat');
  view.classList.add('preview-open', 'agent-config-open');
  syncTogglePreviewBtn();
}

/* 状态在面板外变化时（如审核通过）刷新状态标签和提交按钮 */
export function refreshAgentConfigStatus() { if (panel && !panel.hidden) syncStatus(); }

export function closeAgentConfig() {
  if (!panel || panel.hidden || panel.parentNode !== home) return;
  closeTestMenu(false);
  panel.hidden = true;
  $('#view-chat').classList.remove('agent-config-open');
}

export function initAgentConfig() {
  panel = $('#agentConfigPanel');
  if (!panel) return;
  home = panel.parentNode;
  $$('.agent-config-tab', panel).forEach(function (tab) {
    tab.addEventListener('click', function () { setTab(tab.getAttribute('data-tab')); });
    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var tabs = $$('.agent-config-tab', panel);
      var next = tabs[(tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      setTab(next.getAttribute('data-tab'));
      next.focus();
    });
  });
  $$('.agent-config-switch', panel).forEach(function (sw) {
    sw.addEventListener('click', function () {
      sw.setAttribute('aria-checked', sw.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
    });
  });
  $$('.agent-config-tool[data-toast]', panel).forEach(function (btn) {
    btn.addEventListener('click', function () { toast(btn.getAttribute('data-toast')); });
  });
  $('#agentConfigRefresh', panel).addEventListener('click', function () { toast('已刷新'); });
  $('#agentConfigSave', panel).addEventListener('click', function () { toast('保存成功', 'success'); });
  $('#agentConfigTest', panel).addEventListener('click', function (e) { e.stopPropagation(); toggleTestMenu('#agentConfigTest', '#agentConfigTestMenu'); });
  /* 测试另开独立的测试会话（标题「测试 · 智能体名」，云端测试带 Console沙箱 标记），由 agent-demo.js 打开 */
  $('#agentConfigTestMenu', panel).addEventListener('click', function (e) {
    var item = e.target.closest('[data-test]');
    if (!item) return;
    closeTestMenu(false);
    /* 从协作开发任务的产物预览里测试：先收起产物预览和任务详情，测试会话才不被遮住 */
    if (panel.dataset.mode === 'task') { $('#tkDocPreviewClose')?.click(); $('#tkDrawerClose')?.click(); }
    document.dispatchEvent(new CustomEvent('lingee:agent-test', { detail: { name: agentName, kind: item.getAttribute('data-test') } }));
  });
  $('#agentConfigTestMenu', panel).addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); closeTestMenu(true); } });
  document.addEventListener('click', function (e) { if (!e.target.closest('.agent-config-dd')) closeTestMenu(false); });
  $('#agentConfigSubmit', panel).addEventListener('click', function () {
    var card = agentCardByName(agentName);
    if (!card) { toast('未找到智能体：' + agentName); return; }
    /* 弹出「提交上架审核」确认；交付它的任务随之完成测试验证与提交上架 */
    openAgentSubmit(card, { returnFocus: $('#agentConfigSubmit', panel), onDone: function () { addLog('提交上架审核'); syncStatus(); } });
  });
  /* 知识：上传附件 → 解析 → 成为内置知识 */
  var fileInput = $('#agentKnowledgeFile', panel);
  $('#agentKnowledgeUpload', panel).addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () {
    if (fileInput.files.length) addFiles(fileInput.files);
    fileInput.value = '';
  });
  $('#agentKnowledgeSearch', panel).addEventListener('input', renderFiles);
  $$('.agent-config-kb-folder', panel).forEach(function (el) {
    el.addEventListener('click', function () { selectedFolder = el.getAttribute('data-kb-folder'); renderFiles(); });
  });
  $('#agentKnowledgeList', panel).addEventListener('click', function (e) {
    var del = e.target.closest('[data-kb-del]');
    if (!del) return;
    if (selectedFolder === 'enterprise') { toast('企业知识请在关联目录中管理'); return; }
    var name = del.getAttribute('data-kb-del');
    files = files.filter(function (f) { return f.name !== name; });
    renderFiles();
    toast('已删除「' + name + '」');
  });
  /* 关闭预览、离开会话或新建会话时收起配置面板，避免带到其它会话的预览里 */
  $('#chatPreviewClose')?.addEventListener('click', closeAgentConfig);
  document.addEventListener('lingee:chat-leave', closeAgentConfig);
  document.addEventListener('lingee:new-conversation', closeAgentConfig);
}
