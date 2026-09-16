/* 会话消息运行时状态。替代 main.js 中的 var CHAT_MESSAGES + bridge.chat。 */
import { mockReplies } from '../data/chat-data';

let messages = [];
let chatTitle = '';

export function getMessages() { return messages; }
export function getTitle() { return chatTitle; }
export function setTitle(t) { chatTitle = t; notify(); }
export function clear() { messages = []; notify(); }

export function addUserMessage(text) {
  messages.push({ id: Date.now() + Math.random(), type: 'user', text: text });
  notify();
}

export function simulateResponse() {
  var msgId = Date.now() + Math.random();
  var msg = { id: msgId, type: 'assistant', steps: [], result: null, streaming: true };
  messages.push(msg);
  var steps = [{ title: '需求分析' }, { title: '开发页面' }, { title: '测试验收' }];
  var currentStepIdx = 0;

  function addNextStep() {
    if (currentStepIdx >= steps.length) {
      msg.streaming = false;
      msg.result = {
        markdown: (mockReplies && mockReplies.length ? mockReplies[Math.floor(Math.random() * mockReplies.length)] : '已完成'),
        artifact: true,
      };
      notify();
      return;
    }
    msg.steps.push({ title: steps[currentStepIdx].title, status: 'running' });
    notify();
    setTimeout(function () {
      msg.steps[currentStepIdx].status = 'done';
      currentStepIdx++;
      notify();
      setTimeout(addNextStep, 300);
    }, 800 + Math.random() * 600);
  }
  addNextStep();
}

let version = 0;
let listeners = [];
export function subscribe(fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
export function getVersion() { return version; }
function notify() { version++; listeners.slice().forEach(function (fn) { try { fn(); } catch { /* ignore */ } }); }
