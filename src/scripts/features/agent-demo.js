import { $, $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { setNavActive, showView } from '../core/view.js';
import { syncTogglePreviewBtn } from './chat.js';
import { messagesList, scrollChatBottom, setChatSendInterceptor, setNewtaskSendInterceptor } from './composer.js';
import { closeAgentConfig, openAgentConfig, refreshAgentConfigStatus } from './agent-config.js';
import { agentCardByName } from './agent-submit.js';
import { setChannel } from './sidebar.js';
import surveyAgentHtml from '../../artifacts/survey-agent.html?raw';
/* 智能体开发演示：问卷调研系统上线后，用 agent-builder 对话创建「员工满意度分析助手」，
   右侧编辑面板保存 / 测试 / 提交，测试走 Console 沙箱会话，审核通过后在 Work 中使用。
   设备故障诊断助手（6.2）：周建国在开发板块新会话里选「智能体开发」说出排障经验，Build 按 agent-builder 的真实过程创建，
   需求里同时要的两个技能由 skill-builder 随助手一起生成并自动绑定，
   卡片打开右侧智能体配置面板（agent-config.js）；卡片上「本地测试」另开测试会话，面板「提交」上架审核。
   销售履约智能体（6.2 v6）：商务主管林悦用同一流程搭建，四个技能经 MCP 读写金蝶 ERP，测试时附上客户采购单，先查信用再出订单草稿和网页预览。
   全部为本地演示：不写入会话历史，刷新后回到未创建状态。 */

var AGENT = '员工满意度分析助手';
var BUILD_PROMPT = '创建【员工满意度分析助手】：基于问卷调研系统的答卷数据，回答回收率和满意度问题，定位低分题目，每周一推送部门分析报告';
var EQ_AGENT = '设备故障诊断助手';
var SALES_AGENT = '销售履约智能体';
var demo = { mode: '', scene: 'survey', created: false, status: 'saved', builderNodes: null, building: false, testAgent: AGENT, built: {}, nodes: {}, panelOpened: {} };
var internalNav = false;

function esc(v) { return String(v ?? '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
var ROBOT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4.5"/><circle cx="12" cy="3.5" r="1"/><path d="M9 14h.01M15 14h.01"/></svg>';
var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>';
var ACTIONS = '<span class="ad-actions" aria-hidden="true">'
  + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>'
  + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>'
  + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></span>';
var CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';

/* ---------- 会话外壳：标题、徽标、输入框附件 ---------- */
function setTitle(text, badge) {
  var title = $('#chatTitle');
  if (title) title.textContent = text;
  $('#adHeaderExtra')?.remove();
  if (!badge || !title) return;
  var extra = document.createElement('span');
  extra.id = 'adHeaderExtra';
  extra.className = 'ad-header-extra';
  extra.innerHTML = badge;
  title.insertAdjacentElement('afterend', extra);
}
function chatInput() { return $('#chatInput'); }
function setComposer(opts) {
  var input = chatInput();
  if (!input) return;
  input.innerHTML = opts.builder ? '<span class="builder-skill-mention ad-skill-chip" data-skill-mention="agent-builder" contenteditable="false">' + ROBOT + '<span>agent-builder</span></span>&nbsp;' : '';
  input.setAttribute('data-placeholder', opts.placeholder || '输入消息…');
  var label = $('#chatExpertLabel');
  if (label) label.textContent = opts.expert || '选择智能体';
  $('#adAgentChip')?.remove();
  if (opts.agentChip) {
    var chip = document.createElement('span');
    chip.id = 'adAgentChip';
    chip.className = 'ad-agent-chip';
    chip.innerHTML = ROBOT + '<span>' + esc(opts.agentName || AGENT) + '</span>' + (opts.agentChipCaret ? '<svg class="ad-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' : '');
    $('#chatExpertDropdown')?.insertAdjacentElement('beforebegin', chip);
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
function clearMessages() {
  $('#chatEmpty')?.remove();
  messagesList.replaceChildren();
}
function userBubble(text, chip, file) {
  var msg = document.createElement('div');
  msg.className = 'message user';
  msg.innerHTML = '<div class="message-content">' + (file ? fileChipHtml(file) : '') + (chip ? '<span class="ad-skill-chip ad-skill-chip--inline">' + ROBOT + '<span>' + esc(chip) + '</span></span>' : '') + '<p>' + esc(text) + '</p></div>';
  messagesList.appendChild(msg);
  scrollChatBottom();
}
function assistantBlock() {
  var msg = document.createElement('div');
  msg.className = 'message assistant';
  msg.innerHTML = '<div class="message-content"><div class="assistant-response ad-response"></div></div>';
  messagesList.appendChild(msg);
  return msg.querySelector('.ad-response');
}

/* ---------- 右侧：智能体编辑面板 ---------- */
function editorFrame() { return document.getElementById('chatPreviewFrame'); }
function openEditor(reload) {
  var view = document.getElementById('view-chat');
  var side = document.getElementById('chatPreviewSide');
  var frame = editorFrame();
  if (side) { side.classList.remove('is-browser'); side.classList.add('is-editor'); }
  if (frame && (reload || frame.dataset.adEditor !== '1')) {
    frame.src = URL.createObjectURL(new Blob([surveyAgentHtml], { type: 'text/html' }));
    frame.dataset.adEditor = '1';
    frame.addEventListener('load', function onLoad() {
      frame.removeEventListener('load', onLoad);
      if (demo.status !== 'saved') frame.contentWindow?.postMessage({ type: 'lingee-survey-agent-state', state: demo.status }, '*');
    });
  }
  view?.classList.add('preview-open');
  syncTogglePreviewBtn();
}
function closeSidePanel() {
  closeAgentConfig();
  document.getElementById('view-chat')?.classList.remove('preview-open');
  document.getElementById('chatPreviewSide')?.classList.remove('is-editor');
  syncTogglePreviewBtn();
}

/* ---------- 智能体开发列表卡片 ---------- */
function syncAgentCard() {
  var card = $('#view-agents .app-card[data-agent="survey-satisfaction"]');
  if (!card) return;
  card.toggleAttribute('data-agent-pending', !demo.created);
  var text = demo.status === 'published' ? '已发布' : demo.status === 'review' ? '已提交' : '已保存';
  card.setAttribute('data-status', text);
  var st = $('.card-status', card);
  if (st) st.textContent = text;
}

/* ---------- ① 对话创建 ---------- */
function enterChat(mode) {
  demo.mode = mode;
  internalNav = true;
  showView('chat');
  internalNav = false;
  setChatSendInterceptor(onSend);
}
function openBuilder() {
  demo.scene = 'survey';
  enterChat('builder');
  setChannel('dev');
  setNavActive('智能体开发');
  setComposer({ builder: true, expert: '智能体开发', placeholder: '布置开发任务，输入 / 调用技能或命令' });
  if (demo.created && demo.builderNodes) {
    setTitle('创建' + AGENT);
    messagesList.replaceChildren.apply(messagesList, demo.builderNodes);
    demo.builderNodes = null;
    openEditor(false);
    scrollChatBottom();
    return;
  }
  setTitle('新建智能体');
  clearMessages();
  var intro = assistantBlock();
  intro.innerHTML = '<p class="ad-muted">告诉我智能体要做什么、用哪些数据。我会生成角色设定、挂载技能并绑定知识，右侧可以继续编辑、测试和提交。</p>';
  closeSidePanel();
  chatInput()?.focus();
}
var BUILD_STEPS = ['读取问卷调研系统答卷库结构', '生成角色设定与职责', '挂载技能：问卷数据读取、满意度指标口径、分析报告生成', '绑定知识：问卷调研系统 · 答卷库', '严格校验配置'];
function runBuild(text) {
  demo.building = true;
  setTitle('创建' + AGENT);
  userBubble(text.replace(/^agent-builder\s*/, ''), 'agent-builder');
  var box = assistantBlock();
  box.innerHTML = '<button type="button" class="ad-steps-head" aria-expanded="true"><span class="ad-spinner" aria-hidden="true"></span><span class="ad-steps-label">正在处理</span></button><ol class="ad-steps"></ol>';
  var list = box.querySelector('.ad-steps');
  BUILD_STEPS.forEach(function (step, i) {
    setTimeout(function () {
      var li = document.createElement('li');
      li.innerHTML = CHECK + '<span>' + esc(step) + '</span>';
      list.appendChild(li);
      scrollChatBottom();
    }, 600 * (i + 1));
  });
  setTimeout(function () { finishBuild(box); }, 600 * (BUILD_STEPS.length + 1) + 200);
}
function finishBuild(box) {
  var head = box.querySelector('.ad-steps-head');
  head.innerHTML = '<span>处理完成</span>' + CHEVRON + '<span class="ad-muted">18秒</span>';
  head.setAttribute('aria-expanded', 'false');
  box.querySelector('.ad-steps').hidden = true;
  head.addEventListener('click', function () {
    var list = box.querySelector('.ad-steps');
    list.hidden = !list.hidden;
    head.setAttribute('aria-expanded', String(!list.hidden));
  });
  var body = document.createElement('div');
  body.className = 'markdown-content ad-summary';
  body.innerHTML = '<p>严格校验通过。已创建【' + AGENT + '】，主要配置如下：</p><ul>'
    + '<li><strong>描述</strong>：基于问卷调研系统答卷数据，回答回收率和满意度问题，定位低分题目</li>'
    + '<li><strong>职责</strong>：部门回收率与满意度分析、低分题目定位、开放题高频词汇总、每周一推送部门分析报告</li>'
    + '<li><strong>技能</strong>：问卷数据读取、满意度指标口径、分析报告生成</li>'
    + '<li><strong>知识</strong>：问卷调研系统 · 答卷库（1,286 份答卷）、满意度指标口径说明</li>'
    + '<li><strong>原则</strong>：不返回个人答卷，样本少于 5 份不展示；部门负责人只看本部门汇总</li></ul>'
    + '<div class="ad-agent-card" role="button" tabindex="0" data-ad-open-editor><span class="ad-agent-icon">' + ROBOT + '</span><span class="ad-agent-copy"><strong>' + AGENT + '</strong><small>查看并编辑智能体配置</small></span>'
    + '<button type="button" class="ad-test-btn" data-ad-test>本地测试</button>' + CHEVRON + '</div>'
    + '<div class="ad-meta">' + ACTIONS + 'Build · 智能体开发 · 18s</div>';
  box.appendChild(body);
  demo.created = true;
  demo.building = false;
  syncAgentCard();
  openEditor(true);
  scrollChatBottom();
}

/* ---------- ①' 设备故障诊断助手：新会话里说经验，Build 创建助手的同时生成两个技能 ---------- */
/* 过程对齐 Lingee Build 实际会话：加载 agent-builder → 调用 skill-builder 并行生成并校验技能 → 写入角色、初始化并自动绑定技能 →
   关联企业知识目录 → 严格校验 → 「处理完成」交付摘要 + 智能体卡片；点卡片打开右侧配置面板 */
var TOOL_IC = {
  skill: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  explore: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  write: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  shell: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>',
  ask: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>',
};
/* 刚生成的智能体：更新日志记当前时间，知识页先显示关联的企业知识目录 */
var FRESH_PANEL = { fresh: true, folder: 'enterprise' };
var EQ_SKILLS = [
  { label: '查询设备档案', id: 'equipment-profile-query', tool: 'query_equipment_profile', desc: '按设备编号读取型号、位置和当前状态，让助手先确认是哪台设备' },
  { label: '查询维修记录', id: 'repair-record-query', tool: 'query_repair_records', desc: '读取近 12 个月的维修原因、更换零件和维修人，找出最近换过的零件' },
];
/* 周师傅在需求里同时要了两个技能：agent-builder 创建助手的同时调用 skill-builder 生成技能（并行写入三件套 → 校验），
   再初始化智能体并自动绑定新技能。界面显示名对齐 Build：ai-partner-creator → agent-builder，kingdee-skill-creator → skill-builder */
var EQ_STEPS = [
  ['text', '我先加载 <code>agent-builder</code> 技能。你要求在创建助手的同时做两个技能，我先用 <code>skill-builder</code> 生成技能，再创建助手并自动绑定。'],
  ['tool', 'skill', '已调用', 'agent-builder'],
  ['tool', 'skill', '已调用', 'skill-builder'],
  ['text', '两个技能都读设备巡检维修系统的数据：「查询设备档案」调用 <code>query_equipment_profile</code>，「查询维修记录」调用 <code>query_repair_records</code>，只读不改。两个技能的文件并行写入。'],
  ['tool', 'write', '写入', 'skills/equipment-profile-query · SKILL.md、manifest.yaml、CHANGELOG.md'],
  ['tool', 'write', '写入', 'skills/repair-record-query · SKILL.md、manifest.yaml、CHANGELOG.md'],
  ['tool', 'shell', 'Shell', '校验技能 equipment-profile-query · passed'],
  ['tool', 'shell', 'Shell', '校验技能 repair-record-query · passed'],
  ['text', '两个技能已创建并通过校验。回到 <code>agent-builder</code>：把周师傅的经验写成角色设定（身份、职责、工作原则），标识符 <code>equipment-diagnosis-assistant</code>，显示名「设备故障诊断助手」。'],
  ['tool', 'write', '写入', 'tmp/agent-config.json'],
  ['tool', 'shell', 'Shell', '初始化设备故障诊断助手智能体 · 绑定 2 个技能'],
  ['text', '初始化成功，两个技能已自动绑定。评估企业知识目录：<code>设备管理知识库</code> 下的设备排障手册、注塑机维修规程直接对应设备故障诊断，关联该目录。'],
  ['tool', 'shell', 'Shell', '添加企业知识目录绑定'],
  ['tool', 'shell', 'Shell', '运行严格校验 · [OK]'],
];
function equipmentSummary() {
  return '<p>设备故障诊断助手已创建完成并通过严格校验。以下是交付摘要：</p>'
    + '<p><strong>智能体配置</strong></p><ul>'
    + '<li>标识符：<code>equipment-diagnosis-assistant</code>，显示名：设备故障诊断助手</li>'
    + '<li>领域：<code>general</code>（通用），可见性：<code>public</code></li>'
    + '<li>配置文件：<code>设备巡检维修/ai-partners/equipment-diagnosis-assistant/assistant.json</code></li></ul>'
    + '<p><strong>角色定位</strong></p>'
    + '<p>面向设备部维修工程师的排障助手，按设备主管周建国二十年的维修经验排查注塑机、空压机、数控机床故障。角色文本按“身份-职责-原则”三段式编写，把老师傅的判断方法写成工作原则：最近换过的零件优先怀疑，温度异常先查热电偶再查加热圈，碰到高压电先断电挂牌，先查记录再下判断。</p>'
    + '<p><strong>技能创建与绑定</strong></p><ul>'
    + EQ_SKILLS.map(function (sk) { return '<li>新建项目技能「' + esc(sk.label) + '」（<code>' + sk.id + '</code>，调用 <code>' + sk.tool + '</code>）并已自动绑定：' + esc(sk.desc) + '</li>'; }).join('') + '</ul>'
    + '<p><strong>知识库关联</strong></p><ul>'
    + '<li>关联企业知识目录 <code>设备管理知识库</code>（<code>kind: catalog</code>，<code>scope: enterprise</code>）：目录下的设备排障手册、注塑机维修规程、设备点检标准直接覆盖排障场景。</li></ul>';
}
/* 销售履约智能体：林悦要了四个技能，都经 MCP 连接金蝶 ERP；写操作（建订单、下推单据）一律先存草稿 */
var SALES_SKILLS = [
  { label: '接单制单', id: 'sales-order-intake', desc: '解析客户采购单，查客户信用，在金蝶 ERP 创建销售订单（暂存）' },
  { label: '履约执行', id: 'sales-fulfillment-run', desc: '下推发货通知、运单和销售出库，按运价表比价选运输商' },
  { label: '收款催收', id: 'receivable-collection', desc: '多币种汇总应收与逾期，按催收规则合并定级，生成催收函' },
  { label: '销售月报', id: 'sales-monthly-report', desc: '统计签单、按期出库、回款与月末应收，生成月度复盘' },
];
var SALES_STEPS = [
  ['text', '我先加载 <code>agent-builder</code> 技能。你要求同时做四个技能，我先用 <code>skill-builder</code> 生成技能，再创建智能体并自动绑定。'],
  ['tool', 'skill', '已调用', 'agent-builder'],
  ['tool', 'skill', '已调用', 'skill-builder'],
  ['text', '四个技能都通过 MCP 连接金蝶 ERP。先读取要用到的业务对象：查信用、建订单、下推发货和出库、查应收与收款。'],
  ['tool', 'explore', '读取', '金蝶 ERP 元数据 · 客户信用、销售订单、发货通知单、运单、销售出库单、应收单、收款单'],
  ['text', '读和写都走 ERP 原有的权限；建订单、下推单据这类写操作一律先存草稿，问过人再提交。四个技能的文件并行写入。'],
  ['tool', 'write', '写入', 'skills/sales-order-intake · SKILL.md、manifest.yaml、CHANGELOG.md'],
  ['tool', 'write', '写入', 'skills/sales-fulfillment-run · SKILL.md、manifest.yaml、CHANGELOG.md'],
  ['tool', 'write', '写入', 'skills/receivable-collection · SKILL.md、manifest.yaml、CHANGELOG.md'],
  ['tool', 'write', '写入', 'skills/sales-monthly-report · SKILL.md、manifest.yaml、CHANGELOG.md'],
  ['tool', 'shell', 'Shell', '校验 4 个技能 · passed'],
  ['text', '回到 <code>agent-builder</code>：把林悦的规矩写成角色设定（身份、职责、工作原则），标识符 <code>sales-fulfillment-agent</code>，显示名「销售履约智能体」。'],
  ['tool', 'write', '写入', 'tmp/agent-config.json'],
  ['tool', 'shell', 'Shell', '初始化销售履约智能体 · 绑定 4 个技能 · 连接金蝶 ERP'],
  ['text', '关联企业知识目录 <code>销售履约知识库</code>：客户信用管理办法、销售订单履约规范、应收账款催收制度。运价表、催收函模板和网页报告模板请在知识页上传。'],
  ['tool', 'shell', 'Shell', '添加企业知识目录绑定'],
  ['tool', 'shell', 'Shell', '运行严格校验 · [OK]'],
];
function salesSummary() {
  return '<p>销售履约智能体已创建完成并通过严格校验。以下是交付摘要：</p>'
    + '<p><strong>智能体配置</strong></p><ul>'
    + '<li>标识符：<code>sales-fulfillment-agent</code>，显示名：销售履约智能体</li>'
    + '<li>领域：<code>sales</code>（销售），可见性：<code>public</code></li></ul>'
    + '<p><strong>角色定位</strong></p>'
    + '<p>面向销售人员的商务专员，按商务主管林悦的履约规矩，把订单从接单跟到回款。工作原则：先查信用再接单；改动 ERP 先存草稿、问过人再提交；缺基础资料就转人工；运输商在赶得上要货日期的前提下选最便宜的；逾期 30 天以上才催收；结果做成网页报告。</p>'
    + '<p><strong>技能创建与绑定</strong></p><ul>'
    + SALES_SKILLS.map(function (sk) { return '<li>新建项目技能「' + esc(sk.label) + '」（<code>' + sk.id + '</code>）并已自动绑定：' + esc(sk.desc) + '</li>'; }).join('') + '</ul>'
    + '<p><strong>金蝶 ERP 连接</strong></p><ul>'
    + '<li>经 MCP 连接金蝶 ERP：读取客户信用、应收与收款；写入销售订单、发货通知、运单和销售出库（先存草稿），权限继承 ERP。</li></ul>'
    + '<p><strong>知识库关联</strong></p><ul>'
    + '<li>关联企业知识目录 <code>销售履约知识库</code>：客户信用管理办法、销售订单履约规范、应收账款催收制度。</li>'
    + '<li>待补充：承运商运价表、催收函模板、网页报告模板，请在知识页上传。</li></ul>';
}
var SCENES = {
  equipment: { agent: EQ_AGENT, steps: EQ_STEPS, summary: equipmentSummary, elapsed: ['1分42秒', '1m 42s'], audience: '设备部维修人员' },
  sales: { agent: SALES_AGENT, steps: SALES_STEPS, summary: salesSummary, elapsed: ['1分56秒', '1m 56s'], audience: '销售团队' },
};
function sceneOf(name) { return Object.keys(SCENES).find(function (k) { return SCENES[k].agent === name; }) || ''; }
function builderComposer() {
  setComposer({ builder: false, expert: '智能体', placeholder: '布置开发任务，输入 / 调用技能或命令' });
}
function openSceneBuilder(key) {
  var sc = SCENES[key];
  demo.scene = key;
  enterChat('builder');
  setChannel('dev');
  builderComposer();
  setTitle('创建' + sc.agent);
  if (demo.nodes[key]) {
    messagesList.replaceChildren.apply(messagesList, demo.nodes[key]);
    demo.nodes[key] = null;
    openScenePanel(key);
    scrollChatBottom();
  }
}
/* 首次打开按刚生成的状态填充；之后（如测试回来）保留已上传的知识和更新日志 */
function openScenePanel(key) {
  openAgentConfig(SCENES[key].agent, demo.panelOpened[key] ? { keep: true } : FRESH_PANEL);
  demo.panelOpened[key] = true;
}
function procStepHtml(step) {
  if (step[0] === 'text') return '<p class="ad-proc-text">' + step[1] + '</p>';
  return '<div class="ad-tool"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + TOOL_IC[step[1]] + '</svg>'
    + '<strong>' + esc(step[2]) + '</strong><span>' + esc(step[3]) + '</span></div>';
}
/* 逐条追加过程；每条之间留出「运行中」的间隔 */
function playSteps(body, steps, gap, done) {
  steps.forEach(function (step, i) {
    setTimeout(function () {
      body.insertAdjacentHTML('beforeend', procStepHtml(step));
      scrollChatBottom();
    }, gap * (i + 1));
  });
  setTimeout(done, gap * (steps.length + 1));
}
function startSceneBuild(key, text) {
  var sc = SCENES[key];
  /* 首页选中的「智能体开发」模式标签已随消息发出，清掉，避免带进会话输入框 */
  document.querySelector('#ntTags [data-clear-mode]')?.click();
  demo.scene = key;
  demo.built[key] = false;
  demo.nodes[key] = null;
  demo.panelOpened[key] = false;
  enterChat('builder');
  setChannel('dev');
  builderComposer();
  setTitle('创建' + sc.agent);
  clearMessages();
  closeSidePanel();
  demo.building = true;
  userBubble(text.replace(/^@?agent-builder\s*/, ''), 'agent-builder');
  var box = assistantBlock();
  box.innerHTML = '<div class="ad-proc"><div class="ad-proc-head"><span class="ad-spinner" aria-hidden="true"></span><span>运行中...</span></div><div class="ad-proc-body"></div></div>';
  var body = box.querySelector('.ad-proc-body');
  scrollChatBottom();
  playSteps(body, sc.steps, key === 'sales' ? 800 : 900, function () { finishSceneBuild(key, box); });
}
function finishSceneBuild(key, box) {
  var sc = SCENES[key];
  var proc = box.querySelector('.ad-proc');
  var head = proc.querySelector('.ad-proc-head');
  var body = proc.querySelector('.ad-proc-body');
  head.outerHTML = '<button type="button" class="ad-steps-head" aria-expanded="false"><span>处理完成</span>' + CHEVRON + '<span class="ad-muted">' + sc.elapsed[0] + '</span></button>';
  head = proc.querySelector('.ad-steps-head');
  body.hidden = true;
  head.addEventListener('click', function () {
    body.hidden = !body.hidden;
    head.setAttribute('aria-expanded', String(!body.hidden));
  });
  var sum = document.createElement('div');
  sum.className = 'markdown-content ad-summary';
  sum.innerHTML = sc.summary()
    + '<div class="ad-agent-card" role="button" tabindex="0" data-ad-open-editor><span class="ad-agent-icon">' + ROBOT + '</span><span class="ad-agent-copy"><strong>' + sc.agent + '</strong><small>查看并编辑智能体配置</small></span>'
    + '<button type="button" class="ad-test-btn" data-ad-test>本地测试</button>' + CHEVRON + '</div>'
    + '<div class="ad-meta">' + ACTIONS + 'Build · 智能体 · ' + sc.elapsed[1] + '</div>';
  box.appendChild(sum);
  demo.built[key] = true;
  demo.building = false;
  scrollChatBottom();
}

/* ---------- 销售履约智能体测试：附上客户采购单 → 查信用 → 订单草稿 + 网页预览 ---------- */
var SALES_PO = 'PO-20260930-001-CN.pdf';
var FILE_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
function fileChipHtml(name) {
  return '<span class="ad-file-chip"><span class="ad-file-ic">' + FILE_IC + '</span><span><strong>' + esc(name) + '</strong><small>PDF · 328.9 KB</small></span></span>';
}
function attachSamplePo() {
  var input = chatInput();
  if (!input || $('#adAttach')) return;
  var wrap = document.createElement('div');
  wrap.id = 'adAttach';
  wrap.className = 'ad-attach';
  wrap.innerHTML = fileChipHtml(SALES_PO);
  input.insertAdjacentElement('beforebegin', wrap);
  $('[data-ad-attach]', messagesList)?.closest('p')?.remove();
  input.focus();
}
function takeAttachment() {
  var el = $('#adAttach');
  if (!el) return '';
  el.remove();
  return SALES_PO;
}
var SALES_LOOKUPS = [
  ['解析客户采购单', 'PO-20260930-001 · 荷兰医疗公司 · 5 行物料'],
  ['查询客户信用', '额度利用率 27.1% · 逾期 0 天 · 无风险信号'],
  ['创建销售订单（暂存）', 'XSDD-261007-000001 · €22,000.00'],
  ['生成网页预览', 'sales_order_XSDD-261007-000001.html'],
];
function answerSales(box) {
  var lines = '';
  SALES_LOOKUPS.forEach(function (row, i) {
    setTimeout(function () {
      lines += '<div class="ad-step-line">' + CHECK + '<span>' + esc(row[0]) + '</span><span class="ad-muted">' + esc(row[1]) + '</span></div>';
      box.innerHTML = lines + (i < SALES_LOOKUPS.length - 1 ? '<div class="ad-thinking"><span class="ad-spinner" aria-hidden="true"></span>正在' + esc(SALES_LOOKUPS[i + 1][0]) + '…</div>' : '');
      scrollChatBottom();
    }, 800 * (i + 1));
  });
  setTimeout(function () { box.innerHTML = lines + salesAnswer(); scrollChatBottom(); }, 800 * SALES_LOOKUPS.length + 600);
}
function salesAnswer() {
  return '<div class="markdown-content"><p><strong>一、客户风险检查</strong></p>'
    + '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>评估维度</th><th>结果</th><th>评级</th></tr></thead><tbody>'
    + '<tr><td>额度利用率</td><td>27.1%</td><td>优秀（&lt;50%）</td></tr>'
    + '<tr><td>逾期天数</td><td>0 天</td><td>优秀</td></tr>'
    + '<tr><td>是否超限</td><td>否</td><td>正常</td></tr></tbody></table></div>'
    + '<p>检查结论：客户信用状况健康，可用额度充足，可以接单。</p>'
    + '<p><strong>二、销售订单（暂存）</strong></p>'
    + '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody>'
    + '<tr><td>单据编号</td><td>XSDD-261007-000001</td></tr>'
    + '<tr><td>状态</td><td>暂存（Draft）</td></tr>'
    + '<tr><td>销售客户</td><td>荷兰医疗公司（-0003）</td></tr>'
    + '<tr><td>结算币别</td><td>欧元（EUR），税率 0%（出口免税）</td></tr>'
    + '<tr><td>订单总额</td><td>€22,000.00 · 5 行物料</td></tr></tbody></table></div>'
    + '<p><strong>三、网页预览</strong></p>'
    + '<div class="artifact-card" role="button" tabindex="0" data-ad-order><div class="artifact-preview">' + FILE_IC + '</div><div class="artifact-info"><div class="artifact-title">sales_order_XSDD-261007-000001.html</div></div>'
    + '<div class="artifact-action"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg></div></div>'
    + '<p><strong>下一步</strong>：订单当前为暂存状态，是否提交审核？审核通过后继续下推发货通知、安排运输。</p>'
    + '<p class="ad-muted">依据：客户信用管理办法 · 销售订单履约规范；测试会话未写入生产 ERP</p></div>';
}
var ORDER_LINES = [['MAT-MSK-001', '一次性医用口罩', '5,000', '个', '€0.30', '€1,500.00'], ['MAT-GLV-002', '医用无菌手套', '2,000', '双', '€1.50', '€3,000.00'], ['MAT-COT-003', '医用棉签', '2,000', '包', '€4.00', '€8,000.00'], ['MAT-INF-004', '一次性输液器', '1,000', '套', '€1.50', '€1,500.00'], ['MAT-WIP-005', '医用酒精棉片', '8,000', '包', '€1.00', '€8,000.00']];
function orderPreviewHtml() {
  var css = 'body{margin:0;font:14px/1.6 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#1f2329;background:#f5f6f8}main{max-width:760px;margin:24px auto;padding:28px 32px;background:#fff;border-radius:12px;border:1px solid #e5e6eb}'
    + 'h1{font-size:20px;margin:0 0 4px}.sub{color:#646a73;font-size:13px;margin-bottom:20px}.tag{display:inline-block;margin-left:8px;padding:1px 8px;border-radius:6px;background:#fff4e5;color:#b25e00;font-size:12px;vertical-align:middle}'
    + '.kv{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}.kv div{background:#f7f8fa;border-radius:8px;padding:10px 12px}.kv small{display:block;color:#646a73;font-size:12px}.kv b{font-size:15px}'
    + 'table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f7f8fa;text-align:left;color:#646a73;font-weight:600}th,td{padding:8px 10px;border-bottom:1px solid #eef0f3}td:nth-child(n+3){font-variant-numeric:tabular-nums}.total{text-align:right;font-weight:600;margin-top:12px}.note{color:#646a73;font-size:12px;margin-top:16px}';
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>销售订单预览</title><style>' + css + '</style></head><body><main>'
    + '<h1>销售订单预览<span class="tag">暂存 · 待提交审核</span></h1><div class="sub">XSDD-261007-000001 · 由销售履约智能体根据客户采购单 PO-20260930-001 生成</div>'
    + '<div class="kv"><div><small>销售客户</small><b>荷兰医疗公司</b></div><div><small>结算币别</small><b>欧元 EUR</b></div><div><small>业务日期</small><b>2026-10-07</b></div>'
    + '<div><small>订单总额</small><b>€22,000.00</b></div><div><small>贸易术语</small><b>FOB · 月结 30 天</b></div><div><small>信用检查</small><b>通过 · 利用率 27.1%</b></div></div>'
    + '<table><thead><tr><th>物料编码</th><th>物料名称</th><th>数量</th><th>单位</th><th>单价</th><th>金额</th></tr></thead><tbody>'
    + ORDER_LINES.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('')
    + '</tbody></table><div class="total">合计 €22,000.00（税率 0%，出口免税）</div><div class="note">网页报告模板：销售订单预览 · 测试会话生成，未写入生产 ERP</div></main></body></html>';
}
function openOrderPreview() {
  var view = document.getElementById('view-chat');
  var side = document.getElementById('chatPreviewSide');
  var frame = editorFrame();
  if (!frame) return;
  closeAgentConfig();
  /* 产物预览只看网页本身，不显示表单设计器的页签和地址栏 */
  if (side) { side.classList.remove('is-browser'); side.classList.add('is-editor'); }
  frame.src = URL.createObjectURL(new Blob([orderPreviewHtml()], { type: 'text/html' }));
  delete frame.dataset.adEditor;
  view?.classList.add('preview-open');
  syncTogglePreviewBtn();
}

/* ---------- ② 测试：Console 沙箱 ---------- */
/* 本地测试在开发板块本机运行；云端测试在 Console 沙箱里运行，标题带「Console沙箱」。
   问卷助手的云端测试跳到工作板块；从协作开发任务产物里测试的智能体（如设备故障诊断助手）留在开发板块 */
function openTest(kind, name) {
  demo.testAgent = name || AGENT;
  var other = demo.testAgent !== AGENT;
  if (demo.mode === 'builder') {
    if (SCENES[demo.scene]) demo.nodes[demo.scene] = Array.from(messagesList.childNodes);
    else demo.builderNodes = Array.from(messagesList.childNodes);
  }
  if (other) setChannel('dev');
  else if (kind === 'cloud') {
    setChannel('work');
    $$('#workNav .work-nav-item').forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-work-nav') === 'new'); });
  }
  enterChat('test');
  setTitle('测试 · ' + demo.testAgent, (kind === 'cloud' ? '<span class="ad-sandbox">Console沙箱</span>' : '') + '<button type="button" class="ad-back-btn" data-ad-back>返回主会话</button>');
  clearMessages();
  closeSidePanel();
  setComposer({ agentChip: true, agentName: demo.testAgent, placeholder: '请输入指令测试当前智能体的运行效果' });
  var hint = document.createElement('div');
  hint.className = 'ad-test-hint';
  hint.innerHTML = '<p>测试不触碰生产数据，测试会话关键信息会同步到智能体开发会话</p><p class="ad-muted">向智能体发送消息开始测试</p>'
    + (demo.testAgent === SALES_AGENT ? '<p><button type="button" class="ad-test-btn" data-ad-attach>附上示例采购单 ' + SALES_PO + '</button></p>' : '');
  messagesList.appendChild(hint);
  chatInput()?.focus();
}
var DEPTS = [['研发中心', 320, 301], ['产品部', 180, 164], ['市场部', 210, 185], ['财务部', 120, 103], ['客户服务', 260, 205], ['生产制造', 410, 238]];
function deptTable() {
  return '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>部门</th><th>应答人数</th><th>已回收</th><th>回收率</th></tr></thead><tbody>'
    + DEPTS.map(function (d) {
      var rate = Math.round(d[2] / d[1] * 100);
      return '<tr' + (rate < 70 ? ' class="is-low"' : '') + '><td>' + d[0] + '</td><td>' + d[1] + '</td><td>' + d[2] + '</td><td><span class="ad-rate"><i style="width:' + rate + '%"></i></span>' + rate + '%</td></tr>';
    }).join('') + '</tbody></table></div>';
}
/* 设备故障诊断助手：技能只读查询设备巡检维修系统（底层为 MCP 服务），再按周师傅的经验给排查步骤；画面不出现 MCP */
var EQ_LOOKUPS = [
  ['查询设备档案', '3 号注塑机 ZS-03 · 二车间 · 运行中'],
  ['查询维修记录', '近 12 个月 4 条，9 月 12 日更换过热电偶'],
  ['对照周师傅的经验', '最近换过的零件优先怀疑'],
];
function equipmentLookupLine(i) {
  return '<div class="ad-step-line">' + CHECK + '<span>' + esc(EQ_LOOKUPS[i][0]) + '</span><span class="ad-muted">' + esc(EQ_LOOKUPS[i][1]) + '</span></div>';
}
function answerEquipment(box) {
  var lines = '';
  EQ_LOOKUPS.forEach(function (row, i) {
    setTimeout(function () {
      lines += equipmentLookupLine(i);
      box.innerHTML = lines + (i < EQ_LOOKUPS.length - 1 ? '<div class="ad-thinking"><span class="ad-spinner" aria-hidden="true"></span>正在' + esc(EQ_LOOKUPS[i + 1][0]) + '…</div>' : '');
      scrollChatBottom();
    }, 900 * (i + 1));
  });
  setTimeout(function () { box.innerHTML = lines + equipmentAnswer(); scrollChatBottom(); }, 900 * EQ_LOOKUPS.length + 700);
}
function equipmentAnswer() {
  return '<div class="markdown-content"><p>查了 3 号注塑机（ZS-03）的维修记录：<strong>9 月 12 日刚换过热电偶</strong>，当时也是温度波动，原因是接线松动。最近换过的零件优先怀疑，建议按这个顺序排查：</p><ol>'
    + '<li><strong>热电偶接线</strong>：先看 9 月换的热电偶接线端子有没有松动、氧化</li>'
    + '<li><strong>加热圈</strong>：测各区加热圈电阻，第 2 区 7 月换过，重点看其他区；<strong>动手前先断电挂牌</strong></li>'
    + '<li><strong>温控表</strong>：前两项都正常，再核对温控表的 PID 参数</li></ol>'
    + '<p class="ad-muted">依据：维修记录 WX-2026-0912、WX-2026-0716 · 注塑机常见故障排查手册</p></div>';
}
function answerTest(text) {
  $('.ad-test-hint', messagesList)?.querySelector('.ad-muted')?.remove();
  userBubble(text, '', takeAttachment());
  var box = assistantBlock();
  box.innerHTML = '<div class="ad-thinking"><span class="ad-spinner" aria-hidden="true"></span>' + (demo.testAgent === SALES_AGENT ? '正在解析客户采购单…' : demo.testAgent === EQ_AGENT ? '正在查询设备档案…' : '正在调用技能…') + '</div>';
  if (demo.testAgent === SALES_AGENT) { answerSales(box); return; }
  if (demo.testAgent !== AGENT) { answerEquipment(box); return; }
  setTimeout(function () {
    box.innerHTML = '<div class="ad-step-line">' + CHECK + '<span>任务完成</span><span class="ad-muted">调用 1 个技能 · 问卷数据读取</span></div>'
      + '<div class="markdown-content"><p>2026 员工满意度调研共回收 <strong>1,286</strong> 份，整体回收率 <strong>85.7%</strong>。各部门情况如下：</p>' + deptTable()
      + '<p><strong>生产制造</strong>回收率 58%，明显低于其他部门，建议优先跟进。</p></div>';
    scrollChatBottom();
  }, 1600);
}
/* 返回主会话：问卷助手回到 agent-builder 开发会话；任务产物里测试的智能体回到协作开发 */
function backToBuilder() {
  if (demo.testAgent === AGENT) { openBuilder(); return; }
  var key = sceneOf(demo.testAgent);
  if (key && demo.nodes[key]) { openSceneBuilder(key); return; }
  endDemo();
  $$('.sb-scroll .nav-item').find(function (n) { return n.textContent.indexOf('协作开发') >= 0; })?.click();
}

/* ---------- ③ Work 中使用 ---------- */
function openWorkChat() {
  if (demo.mode === 'builder') demo.builderNodes = Array.from(messagesList.childNodes);
  setChannel('work');
  enterChat('work');
  $$('#workNav .work-nav-item').forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-work-nav') === 'new'); });
  setTitle('员工满意度分析');
  clearMessages();
  closeSidePanel();
  setComposer({ agentChip: true, agentChipCaret: true, placeholder: '问我问题或者布置任务，输入@唤起技能或选择智能体' });
  chatInput()?.focus();
}
function answerWork(text) {
  userBubble(text);
  var box = assistantBlock();
  box.innerHTML = '<div class="ad-thinking"><span class="ad-spinner" aria-hidden="true"></span>深度思考中…</div>';
  setTimeout(function () {
    box.innerHTML = '<div class="ad-step-line ad-muted-line"><span>深度思考</span>' + CHEVRON + '<span class="ad-muted">6s</span></div>'
      + '<div class="ad-step-line">' + CHECK + '<span>任务完成</span><span class="ad-muted">调用 1 个技能</span>' + CHEVRON + '</div>'
      + '<div class="markdown-content"><p>我来读取生产制造部门的答卷数据和回收情况。</p></div>'
      + '<div class="ad-step-line">' + CHECK + '<span>任务完成</span><span class="ad-muted">调用 1 个工具</span>' + CHEVRON + '</div>'
      + '<div class="markdown-content"><p>生产制造部门本次应答 410 人，回收 238 份，回收率 <strong>58%</strong>，是六个部门中最低的。主要原因：</p><ul>'
      + '<li><strong>触达不足</strong>：一线员工占比高，企业微信覆盖率仅 62%，多数人没收到问卷链接</li>'
      + '<li><strong>时间冲突</strong>：发放时间与三班倒交接重叠，夜班员工应答率仅 41%</li></ul>'
      + '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>得分最低的题目</th><th>平均分</th><th>较全公司</th></tr></thead><tbody>'
      + '<tr><td>我清楚自己的晋升通道</td><td>2.9</td><td class="is-down">-0.8</td></tr>'
      + '<tr><td>我有足够的培训机会</td><td>3.1</td><td class="is-down">-0.6</td></tr>'
      + '<tr><td>排班安排合理</td><td>3.2</td><td class="is-down">-0.5</td></tr></tbody></table></div>'
      + '<p><strong>建议优先做</strong>：车间张贴二维码并由班组长代发，回收期第 3 天自动催办；部门分析报告已生成，下周一 09:00 推送给部门负责人。</p></div>'
      + '<div class="ad-meta">10-05 11:05' + ACTIONS + '共消耗 ⚡ 3.20</div>';
    scrollChatBottom();
  }, 1900);
}

/* ---------- 发送与结束 ---------- */
function onSend(text) {
  if (demo.mode === 'builder') {
    if (demo.building) return true;
    if (SCENES[demo.scene]) {
      userBubble(text, 'agent-builder');
      assistantBlock().innerHTML = '<p>已记录修改要求，右侧配置已更新，请确认后保存。</p>';
      scrollChatBottom();
      return true;
    }
    if (!demo.created) { runBuild(text); return true; }
    userBubble(text, 'agent-builder');
    assistantBlock().innerHTML = '<p>已记录修改要求，右侧配置已更新，请确认后保存。</p>';
    scrollChatBottom();
    return true;
  }
  if (demo.mode === 'test') { answerTest(text); return true; }
  if (demo.mode === 'work') { answerWork(text); return true; }
  return false;
}
function endDemo() {
  if (!demo.mode) return;
  if (demo.mode === 'builder' && SCENES[demo.scene]) { if (demo.built[demo.scene]) demo.nodes[demo.scene] = Array.from(messagesList.childNodes); }
  else if (demo.mode === 'builder' && demo.created) demo.builderNodes = Array.from(messagesList.childNodes);
  demo.mode = '';
  setChatSendInterceptor(null);
  $('#adHeaderExtra')?.remove();
  $('#adAgentChip')?.remove();
  $('#adAttach')?.remove();
  var input = chatInput();
  if (input) { input.innerHTML = ''; input.setAttribute('data-placeholder', '输入消息…'); }
  var label = $('#chatExpertLabel');
  if (label) label.textContent = '选择智能体';
  document.getElementById('chatPreviewSide')?.classList.remove('is-editor');
  var frame = editorFrame();
  if (frame) delete frame.dataset.adEditor;
}

export function initAgentDemo() {
  syncAgentCard();
  /* 开发板块新会话：选「智能体开发」后说设备排障经验，进入设备故障诊断助手的创建 */
  setNewtaskSendInterceptor(function (text, mode) {
    if (mode !== '智能体开发') return false;
    var key = /销售履约|接单|催收|回款/.test(text) ? 'sales' : /设备|故障|排障|维修/.test(text) ? 'equipment' : '';
    if (!key) return false;
    startSceneBuild(key, text);
    return true;
  });
  /* 原型：企业审核在管理平台完成，这里模拟审核通过并发布给使用人员 */
  document.addEventListener('lingee:agent-submitted', function (e) {
    var key = sceneOf(e.detail?.name);
    if (!key || demo.scene !== key) return;
    setTimeout(function () {
      var card = agentCardByName(SCENES[key].agent);
      if (card) { card.setAttribute('data-status', '已发布'); var st = card.querySelector('.card-status'); if (st) st.textContent = '已发布'; }
      refreshAgentConfigStatus();
      toast('企业审核通过，「' + SCENES[key].agent + '」已发布给' + SCENES[key].audience, 'success');
    }, 1800);
  });
  $('#view-agents .btn-new')?.addEventListener('click', function () { demo.created ? openBuilder() : (demo.builderNodes = null, openBuilder()); });
  $('#view-agents .app-card[data-agent="survey-satisfaction"]')?.addEventListener('click', openBuilder);
  /* 智能体配置面板（任务产物 / 智能体开发会话）里点「测试」：另开测试会话 */
  document.addEventListener('lingee:agent-test', function (e) { openTest(e.detail.kind, e.detail.name); });
  /* 任务里的「智能体开发」阶段开始执行：直接进入智能体开发界面 */
  document.addEventListener('lingee:agent-dev-open', function () {
    if (!demo.created) demo.builderNodes = null;
    openBuilder();
  });
  messagesList.addEventListener('click', function (e) {
    if (!demo.mode) return;
    var sc = demo.mode === 'builder' && SCENES[demo.scene];
    if (e.target.closest('[data-ad-attach]')) { attachSamplePo(); return; }
    if (e.target.closest('[data-ad-order]')) { openOrderPreview(); return; }
    if (e.target.closest('[data-ad-test]')) { e.stopPropagation(); openTest('local', sc ? sc.agent : AGENT); return; }
    if (e.target.closest('[data-ad-open-editor]')) { if (sc) openScenePanel(demo.scene); else openEditor(false); }
  });
  messagesList.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-ad-order]') && demo.mode) { e.preventDefault(); openOrderPreview(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-ad-open-editor]') && demo.mode) { e.preventDefault(); if (SCENES[demo.scene]) openScenePanel(demo.scene); else openEditor(false); }
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-ad-back]')) { backToBuilder(); return; }
    if (!demo.mode || internalNav) return;
    /* 离开演示会话（切菜单、切板块、打开其他会话）时归还输入框和预览区 */
    if (e.target.closest('.nav-item, .seg-item, .chat-session-entry, #workNav [data-work-nav], .app-card:not([data-agent])')) endDemo();
  }, true);
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'lingee-survey-agent' || !demo.mode) return;
    if (d.action === 'test-local' || d.action === 'test-cloud') openTest(d.action === 'test-cloud' ? 'cloud' : 'local');
    else if (d.action === 'submitted') { demo.status = 'review'; syncAgentCard(); }
    /* 原型：管理员审核在租户管理完成，这里模拟审核通过 */
    else if (d.action === 'approved') { demo.status = 'published'; syncAgentCard(); toast('「' + AGENT + '」审核通过，已发布到 Work', 'success'); }
    else if (d.action === 'work') openWorkChat();
  });
}
