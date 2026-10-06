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
var selectedFile = '';
var parseTimers = [];

var FILE_ICON = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
var EMPTY_ICON = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 13h5l1.5 2h5L16 13h5"/></svg>';
/* 角色设定正文：写在脚本里，避免 HTML 片段引入时的缩进混进 textarea */
var ROLE_TEXT = [
  '# 设备故障诊断助手',
  '',
  '你是工厂里的设备维修老师傅，帮设备部的维修工程师排查注塑机、空压机、数控机床的故障。经验来自设备主管周建国二十多年的维修实践。',
  '',
  '# 工作职责',
  '',
  '- 维修工程师报上设备编号和故障现象后，先通过设备巡检维修系统（MCP）查询设备档案，确认型号、位置和当前状态',
  '- 再查询这台设备近 12 个月的维修记录',
  '- 结合维修记录、内置知识中的排障手册和老师傅的经验，给出按先后顺序排列的排查步骤',
  '',
  '# 工作原则',
  '',
  '- 先查记录再下判断，回答里说明依据的是哪条维修记录',
  '- 最近换过的零件优先怀疑',
  '- 注塑机温度忽高忽低：先查热电偶接线，再查加热圈，最后查温控表',
  '- 空压机压力不足：先查进气滤芯，再查泄压阀，最后查管路泄漏',
  '- 涉及高压电的步骤，先提醒断电挂牌',
  '- 只读数据，不修改任何记录；超出经验范围时建议联系设备主管'
].join('\n');
/* 演示手册的解析结果；其它上传文件只显示通用说明 */
var KNOWN_DOCS = {
  '注塑机常见故障排查手册': { parts: 12, head: ['故障现象', '排查顺序', '注意事项'], rows: [
    ['温度忽高忽低（报警 E21）', '热电偶接线 → 加热圈 → 温控表', '测加热圈前断电挂牌'],
    ['升温慢', '加热圈 → 固态继电器 → 电源电压', '断电后测电阻'],
    ['射胶不稳', '止逆环 → 射胶油压 → 料筒温度', '—'],
  ] },
  '空压机保养规程': { parts: 8, head: ['故障现象', '排查顺序', '保养周期'], rows: [
    ['排气压力不足', '进气滤芯 → 泄压阀 → 管路泄漏', '进气滤芯每 3 个月更换'],
    ['排气温度高', '油位 → 油冷却器 → 温控阀', '润滑油每 2000 小时更换'],
  ] },
};

function esc(v) { return String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function pad(n) { return String(n).padStart(2, '0'); }
function nowStamp() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
function baseName(name) { return name.replace(/\.[^.]+$/, ''); }
function sizeLabel(bytes) { return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB'; }

function setTab(name) {
  $$('.agent-config-tab', panel).forEach(function (tab) {
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
  var submitted = currentStatus() === '已提交';
  var state = $('#agentConfigLogState', panel);
  state.textContent = submitted ? '已提交审核' : '未发布修改';
  state.classList.toggle('is-submitted', submitted);
  $('#agentConfigLogCount', panel).textContent = logs.length + ' 条编辑';
  $('#agentConfigLogList', panel).innerHTML = logs.slice().reverse().map(function (row) {
    return '<li><time>' + esc(row.time) + '</time>' + esc(row.text) + '</li>';
  }).join('');
}
function addLog(text) { logs.push({ time: nowStamp(), text: text }); renderLog(); }

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

function renderFiles() {
  var q = ($('#agentKnowledgeSearch', panel).value || '').trim().toLowerCase();
  var list = $('#agentKnowledgeList', panel);
  var shown = files.filter(function (f) { return !q || (f.name + ' ' + f.by).toLowerCase().indexOf(q) >= 0; });
  $$('.agent-config-kb-folder', panel).forEach(function (el) {
    el.hidden = !!q && el.getAttribute('data-kb-name').toLowerCase().indexOf(q) < 0;
  });
  list.innerHTML = shown.length ? shown.map(function (f) {
    return '<button type="button" class="agent-config-kb-file' + (f.parsing ? ' is-parsing' : '') + '" role="option" aria-selected="' + (f.name === selectedFile) + '" data-file="' + esc(f.name) + '">'
      + FILE_ICON + '<span>' + esc(f.name) + '</span><em>' + (f.parsing ? '解析中…' : f.size) + '</em></button>';
  }).join('') : '<div class="agent-config-kb-empty">' + (q ? '无匹配文件' : '暂无，点击「上传」添加附件') + '</div>';
  renderPreview();
}

function renderPreview() {
  var box = $('#agentKnowledgePreview', panel);
  var f = files.find(function (row) { return row.name === selectedFile; });
  if (!f) { box.innerHTML = '<div class="agent-config-kb-none">' + EMPTY_ICON + '<span>暂无内容</span></div>'; return; }
  var doc = KNOWN_DOCS[baseName(f.name)];
  var head = '<h4 class="agent-config-kb-title">' + esc(f.name) + '</h4>'
    + '<div class="agent-config-kb-sub">' + esc(f.by) + ' 上传 · ' + esc(f.date) + ' · ' + esc(f.size) + '</div>';
  if (f.parsing) { box.innerHTML = head + '<div class="agent-config-kb-sub">正在解析附件，完成后成为智能体内置知识…</div>'; return; }
  box.innerHTML = head
    + '<div class="agent-config-kb-note">已解析为 ' + (doc ? doc.parts : 6) + ' 段，作为智能体内置知识，回答时可引用</div>'
    + (doc ? '<table class="agent-config-kb-table"><thead><tr>' + doc.head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>'
      + doc.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>' : '');
}

function addFiles(list) {
  Array.prototype.forEach.call(list, function (file) {
    var existing = files.find(function (f) { return f.name === file.name; });
    var row = existing || { name: file.name };
    row.size = sizeLabel(file.size || 0); row.by = '周建国'; row.date = nowStamp().slice(0, 10); row.parsing = true;
    if (!existing) files.push(row);
    selectedFile = row.name;
    parseTimers.push(setTimeout(function () {
      row.parsing = false;
      renderFiles();
      addLog('上传知识：' + row.name);
      toast('「' + row.name + '」已解析，成为智能体内置知识', 'success');
    }, 1200));
  });
  renderFiles();
}

function resetState() {
  parseTimers.forEach(clearTimeout); parseTimers = [];
  logs = [{ time: '2026-10-04 11:00', text: '创建智能体' }];
  files = [{ name: '空压机保养规程.md', size: '8 KB', by: '周建国', date: '2026-10-04', parsing: false }];
  selectedFile = '';
  $('#agentKnowledgeSearch', panel).value = '';
}

function closeTestMenu(focus) {
  var menu = $('#agentConfigTestMenu', panel);
  if (menu.hidden) return;
  menu.hidden = true;
  $('#agentConfigTest', panel).setAttribute('aria-expanded', 'false');
  if (focus) $('#agentConfigTest', panel).focus();
}

function prepare(name) {
  agentName = name;
  $('#agentConfigName', panel).textContent = name;
  $('#agentConfigRoleText', panel).value = ROLE_TEXT;
  resetState();
  setTab('basic');
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

export function openAgentConfig(name) {
  if (!panel) return;
  unmountAgentConfig();
  prepare(name);
  var view = $('#view-chat');
  view.classList.add('preview-open', 'agent-config-open');
  syncTogglePreviewBtn();
}

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
  $('#agentConfigSave', panel).addEventListener('click', function () { addLog('保存配置'); toast('已保存', 'success'); });
  $('#agentConfigTest', panel).addEventListener('click', function (e) {
    e.stopPropagation();
    var menu = $('#agentConfigTestMenu', panel);
    if (!menu.hidden) { closeTestMenu(false); return; }
    menu.hidden = false;
    $('#agentConfigTest', panel).setAttribute('aria-expanded', 'true');
    menu.querySelector('.agent-config-menu-item').focus();
  });
  $('#agentConfigTestMenu', panel).addEventListener('click', function (e) {
    var item = e.target.closest('[data-test]');
    if (!item) return;
    closeTestMenu(true);
    toast(item.getAttribute('data-test') === 'cloud' ? '已推送到云端测试环境：' + agentName : '已进入本地测试：' + agentName);
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
  $('#agentKnowledgeList', panel).addEventListener('click', function (e) {
    var item = e.target.closest('[data-file]');
    if (!item) return;
    selectedFile = item.getAttribute('data-file');
    renderFiles();
  });
  /* 关闭预览、离开会话或新建会话时收起配置面板，避免带到其它会话的预览里 */
  $('#chatPreviewClose')?.addEventListener('click', closeAgentConfig);
  document.addEventListener('lingee:chat-leave', closeAgentConfig);
  document.addEventListener('lingee:new-conversation', closeAgentConfig);
}
