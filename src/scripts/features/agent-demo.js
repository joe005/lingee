import { $, $$ } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { setNavActive, showView } from '../core/view.js';
import { syncTogglePreviewBtn } from './chat.js';
import { messagesList, scrollChatBottom, setChatSendInterceptor } from './composer.js';
import { setChannel } from './sidebar.js';
import surveyAgentHtml from '../../artifacts/survey-agent.html?raw';
/* 智能体开发演示：问卷调研系统上线后，用 agent-builder 对话创建「员工满意度分析助手」，
   右侧编辑面板保存 / 测试 / 提交，测试走 Console 沙箱会话，审核通过后在 Work 中使用。
   全部为本地演示：不写入会话历史，刷新后回到未创建状态。 */

var AGENT = '员工满意度分析助手';
var BUILD_PROMPT = '创建【员工满意度分析助手】：基于问卷调研系统的答卷数据，回答回收率和满意度问题，定位低分题目，每周一推送部门分析报告';
var demo = { mode: '', created: false, status: 'saved', builderNodes: null, building: false };
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
  if (label) label.textContent = opts.expert || '选择专家';
  $('#adAgentChip')?.remove();
  if (opts.agentChip) {
    var chip = document.createElement('span');
    chip.id = 'adAgentChip';
    chip.className = 'ad-agent-chip';
    chip.innerHTML = ROBOT + '<span>' + esc(AGENT) + '</span>' + (opts.agentChipCaret ? '<svg class="ad-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' : '');
    $('#chatExpertDropdown')?.insertAdjacentElement('beforebegin', chip);
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
function clearMessages() {
  $('#chatEmpty')?.remove();
  messagesList.replaceChildren();
}
function userBubble(text, chip) {
  var msg = document.createElement('div');
  msg.className = 'message user';
  msg.innerHTML = '<div class="message-content">' + (chip ? '<span class="ad-skill-chip ad-skill-chip--inline">' + ROBOT + '<span>' + esc(chip) + '</span></span>' : '') + '<p>' + esc(text) + '</p></div>';
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
  enterChat('builder');
  setChannel('dev');
  setNavActive('智能体开发');
  setComposer({ builder: true, expert: '智能体开发专家', placeholder: '布置开发任务，输入 / 调用技能或命令' });
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
    + '<div class="ad-meta">' + ACTIONS + 'Build · 智能体开发专家 · 18s</div>';
  box.appendChild(body);
  demo.created = true;
  demo.building = false;
  syncAgentCard();
  openEditor(true);
  scrollChatBottom();
}

/* ---------- ② 测试：Console 沙箱 ---------- */
/* 本地测试在本机运行；云端测试推送到 Console 沙箱，标题带「Console沙箱」 */
function openTest(kind) {
  if (demo.mode === 'builder') demo.builderNodes = Array.from(messagesList.childNodes);
  enterChat('test');
  setTitle('测试 · ' + AGENT, (kind === 'cloud' ? '<span class="ad-sandbox">Console沙箱</span>' : '') + '<button type="button" class="ad-back-btn" data-ad-back>返回主会话</button>');
  clearMessages();
  closeSidePanel();
  setComposer({ agentChip: true, placeholder: '请输入指令测试当前智能体的运行效果' });
  var hint = document.createElement('div');
  hint.className = 'ad-test-hint';
  hint.innerHTML = '<p>测试不触碰生产数据，测试会话关键信息会同步到智能体开发会话</p><p class="ad-muted">向智能体发送消息开始测试</p>';
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
function answerTest(text) {
  $('.ad-test-hint', messagesList)?.querySelector('.ad-muted')?.remove();
  userBubble(text);
  var box = assistantBlock();
  box.innerHTML = '<div class="ad-thinking"><span class="ad-spinner" aria-hidden="true"></span>正在调用技能…</div>';
  setTimeout(function () {
    box.innerHTML = '<div class="ad-step-line">' + CHECK + '<span>任务完成</span><span class="ad-muted">调用 1 个技能 · 问卷数据读取</span></div>'
      + '<div class="markdown-content"><p>2026 员工满意度调研共回收 <strong>1,286</strong> 份，整体回收率 <strong>85.7%</strong>。各部门情况如下：</p>' + deptTable()
      + '<p><strong>生产制造</strong>回收率 58%，明显低于其他部门，建议优先跟进。</p></div>';
    scrollChatBottom();
  }, 1600);
}
function backToBuilder() {
  openBuilder();
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
  if (demo.mode === 'builder' && demo.created) demo.builderNodes = Array.from(messagesList.childNodes);
  demo.mode = '';
  setChatSendInterceptor(null);
  $('#adHeaderExtra')?.remove();
  $('#adAgentChip')?.remove();
  var input = chatInput();
  if (input) { input.innerHTML = ''; input.setAttribute('data-placeholder', '输入消息…'); }
  var label = $('#chatExpertLabel');
  if (label) label.textContent = '选择专家';
  document.getElementById('chatPreviewSide')?.classList.remove('is-editor');
  var frame = editorFrame();
  if (frame) delete frame.dataset.adEditor;
}

export function initAgentDemo() {
  syncAgentCard();
  $('#view-agents .btn-new')?.addEventListener('click', function () { demo.created ? openBuilder() : (demo.builderNodes = null, openBuilder()); });
  $('#view-agents .app-card[data-agent="survey-satisfaction"]')?.addEventListener('click', openBuilder);
  messagesList.addEventListener('click', function (e) {
    if (!demo.mode) return;
    if (e.target.closest('[data-ad-test]')) { e.stopPropagation(); openTest('local'); return; }
    if (e.target.closest('[data-ad-open-editor]')) openEditor(false);
  });
  messagesList.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-ad-open-editor]') && demo.mode) { e.preventDefault(); openEditor(false); }
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
