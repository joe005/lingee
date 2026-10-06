import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { setUrlState, showView } from '../../core/view.js';
import { EXPERTS, MODEL_TIERS } from '../expert/data.js';
import { setChannel } from '../sidebar.js';
import { WORK_CHAT_AGENTS, openWorkChat } from './chat.js';
/* 工作板块：侧栏菜单（新任务 / 定时任务 / 智能体 / 技能 / 发现）、历史对话列表，
   以及「新任务」首屏（问候、场景页签、输入框、分组、快捷入口）。
   本次演示只开放新任务首屏，其余菜单保留入口并提示不在演示范围；发送后任务写入历史对话。 */

var MODES = [
  { id: 'office', name: '日常办公', placeholder: '根据你的办公需求，选择生成PPT、图像生成、网页报告等立刻开启使用',
    chips: ['图像生成', '网页报告', '金钥财报', '问道阳明', 'PPT生成'] },
  { id: 'analysis', name: '业务分析', placeholder: '描述要分析的业务问题，例如：这周有哪些经营异常，原因是什么',
    chips: ['经营异常分析', '费用超支归因', '库存周转分析', '应收账款分析'] },
  { id: 'execute', name: '业务执行', placeholder: '告诉我要办的事，例如：查询待办任务、提交费用报销单',
    chips: ['查询待办任务', '提交费用报销', '查询已办任务', '创建采购申请'] },
];
var GROUPS = ['默认'];
var HISTORY = [
  '科技风灵基一动轻松工作图', 'PPT制作需求对话', 'PPT制作对话', '查询费用报销单', 'Build与苍穹平台交付汇报',
  'AI平台应用规划', '国外出差报销流程', '国外出差打车费无法开票处理', '查询待办任务', '解答问题',
  '查询固定资产列表', '查询已办任务', '查询名下资产', '查询本期科目余额表', '查询待办任务', '查询年假天数',
];
var DEMO_MENUS = { schedule: '定时任务', agents: '智能体', skills: '技能', discover: '发现' };

var modeId = 'office';
var picks = { agent: '', model: 'auto', group: '' };
var histTab = 'history';
var histQuery = '';
var histItems = HISTORY.slice();

function currentMode() { return MODES.find(function (m) { return m.id === modeId; }) || MODES[0]; }
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

/* ---------- 侧栏：历史对话 ---------- */
function renderHistory() {
  var box = $('#workHistList');
  if (histTab === 'schedule') {
    box.innerHTML = '<div class="work-hist-empty">还没有定时任务</div>';
    return;
  }
  var q = histQuery.trim().toLocaleLowerCase();
  var list = q ? histItems.filter(function (t) { return t.toLocaleLowerCase().includes(q); }) : histItems;
  box.innerHTML = list.length
    ? '<div class="work-hist-group">默认</div>' + list.map(function (t) {
      return '<button type="button" class="work-hist-item" title="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('')
    : '<div class="work-hist-empty">没有匹配的对话</div>';
}
function setHistTab(tab) {
  histTab = tab === 'schedule' ? 'schedule' : 'history';
  $$('#workNav [data-work-hist]').forEach(function (b) {
    var on = b.getAttribute('data-work-hist') === histTab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  renderHistory();
}
function setNavActive(key) {
  $$('#workNav .work-nav-item').forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-work-nav') === key); });
}

/* ---------- 主区：场景页签、快捷入口、下拉 ---------- */
function renderModes() {
  $('#workModes').innerHTML = MODES.map(function (m) {
    var on = m.id === modeId;
    return '<button type="button" class="work-mode' + (on ? ' active' : '') + '" role="tab" aria-selected="' + on + '" data-work-mode="' + m.id + '">' + esc(m.name) + '</button>';
  }).join('');
  $('#workInput').placeholder = currentMode().placeholder;
  $('#workChips').innerHTML = currentMode().chips.map(function (c) {
    return '<button type="button" class="work-chip" data-work-chip="' + esc(c) + '">' + esc(c) + '</button>';
  }).join('');
}
function ddOptions(kind) {
  if (kind === 'agent') {
    /* 已发布的智能体（wc: 前缀）选中后发送会进入智能体对话页 */
    return [{ id: '', name: '自动匹配智能体', desc: '按任务内容选择合适的智能体' }].concat(
      WORK_CHAT_AGENTS.map(function (name) { return { id: 'wc:' + name, name: name, desc: '已发布智能体' }; }),
      EXPERTS.slice(0, 12).map(function (e) { return { id: e.id, name: e.name, desc: e.role || '智能体' }; }));
  }
  if (kind === 'model') return MODEL_TIERS.map(function (t) { return { id: t.id, name: t.label, desc: t.desc }; });
  return [{ id: '', name: '不分组', desc: '' }].concat(GROUPS.map(function (g) { return { id: g, name: g, desc: '' }; }));
}
function ddLabel(kind) {
  var opts = ddOptions(kind);
  var hit = opts.find(function (o) { return o.id === picks[kind]; });
  if (kind === 'agent') return hit && hit.id ? hit.name : '选择智能体';
  if (kind === 'group') return hit && hit.id ? hit.name : '选择分组';
  return hit ? hit.name : '自动';
}
function closeMenus(except) {
  $$('#view-work .work-dd').forEach(function (dd) {
    if (dd === except) return;
    dd.querySelector('.work-dd-menu').hidden = true;
    dd.querySelector('.work-dd-btn').setAttribute('aria-expanded', 'false');
  });
}
function toggleMenu(btn) {
  var dd = btn.closest('.work-dd');
  var menu = dd.querySelector('.work-dd-menu');
  var kind = btn.getAttribute('data-work-dd');
  var show = menu.hidden;
  closeMenus(dd);
  if (show) {
    menu.innerHTML = ddOptions(kind).map(function (o) {
      return '<button type="button" class="work-dd-opt" role="option" data-work-pick="' + esc(o.id) + '" aria-selected="' + (o.id === picks[kind]) + '">' +
        esc(o.name) + (o.desc ? '<small>' + esc(o.desc) + '</small>' : '') + '</button>';
    }).join('');
  }
  menu.hidden = !show;
  btn.setAttribute('aria-expanded', String(show));
}
function pick(btn) {
  var dd = btn.closest('.work-dd');
  var kind = dd.querySelector('.work-dd-btn').getAttribute('data-work-dd');
  picks[kind] = btn.getAttribute('data-work-pick');
  dd.querySelector('[data-work-dd-label]').textContent = ddLabel(kind);
  closeMenus();
  dd.querySelector('.work-dd-btn').focus();
}

function syncSend() {
  $('#workSend').disabled = !$('#workInput').value.trim();
}
function send() {
  var input = $('#workInput');
  var text = input.value.trim();
  if (!text) return;
  if (picks.agent.indexOf('wc:') === 0) {
    input.value = '';
    syncSend();
    openWorkChat(picks.agent.slice(3), text);
    return;
  }
  histItems.unshift(text.length > 24 ? text.slice(0, 24) + '…' : text);
  input.value = '';
  syncSend();
  setHistTab('history');
  toast('任务已发起（演示）：对话已加入历史对话', 'success');
}

/* ---------- 打开 ---------- */
function openWork() {
  setChannel('work');
  showView('work');
  setNavActive('new');
  setUrlState('/work');
}

export function initWork() {
  if (!$('#view-work')) return;
  renderModes();
  renderHistory();

  var nav = $('#workNav');
  nav.addEventListener('click', function (e) {
    var t = e.target;
    var item = t.closest('[data-work-nav]');
    if (item) {
      var key = item.getAttribute('data-work-nav');
      if (key === 'new') { openWork(); $('#workInput').focus(); }
      else toast('「' + DEMO_MENUS[key] + '」不在本次演示范围');
      /* 通用侧栏导航会按文字高亮被点的菜单，这里统一回到实际打开的菜单 */
      setNavActive('new');
      return;
    }
    var tab = t.closest('[data-work-hist]');
    if (tab) { setHistTab(tab.getAttribute('data-work-hist')); return; }
    var search = t.closest('[data-work-search]');
    if (search) {
      var row = $('#workNav .work-hist-searchrow');
      row.hidden = !row.hidden;
      search.setAttribute('aria-expanded', String(!row.hidden));
      if (row.hidden) { histQuery = ''; $('#workHistSearch').value = ''; renderHistory(); } else $('#workHistSearch').focus();
      return;
    }
    if (t.closest('.work-hist-item')) toast('历史对话详情不在本次演示范围');
  });
  nav.addEventListener('input', function (e) {
    if (e.target.id === 'workHistSearch') { histQuery = e.target.value; renderHistory(); }
  });
  nav.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var item = e.target.closest('[data-work-nav]');
    if (item) { e.preventDefault(); item.click(); }
  });

  var view = $('#view-work');
  view.addEventListener('click', function (e) {
    var t = e.target;
    var mode = t.closest('[data-work-mode]');
    if (mode) { modeId = mode.getAttribute('data-work-mode'); renderModes(); return; }
    var chip = t.closest('[data-work-chip]');
    if (chip) {
      var input = $('#workInput');
      input.value = chip.getAttribute('data-work-chip') + '：';
      syncSend();
      input.focus();
      return;
    }
    var pickBtn = t.closest('[data-work-pick]');
    if (pickBtn) { pick(pickBtn); return; }
    var dd = t.closest('[data-work-dd]');
    if (dd) { toggleMenu(dd); return; }
    var tool = t.closest('[data-work-tool]');
    if (tool) { toast('「' + tool.getAttribute('data-work-tool') + '」入口（演示占位）'); return; }
    if (t.closest('#workSend')) { send(); return; }
    if (!t.closest('.work-dd')) closeMenus();
  });
  view.addEventListener('input', function (e) { if (e.target.id === 'workInput') syncSend(); });
  view.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMenus(); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.target.id === 'workInput') { e.preventDefault(); send(); }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('#view-work .work-dd')) closeMenus(); });

  document.addEventListener('lingee:work-open', openWork);
  /* 启动路由已显示工作视图时，补上页签与菜单状态 */
  if (!view.classList.contains('hidden')) { setChannel('work'); setNavActive('new'); }
}

export { openWork };
