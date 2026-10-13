/* 输入框、发送、＋按钮下拉菜单、会话与任务对话
   2026-10-13 按功能拆到 ./composer/ 目录（逻辑未改），本文件只做转发，调用方的 import 不用改：
   - composer/messages.js：发送按钮、消息列表、消息气泡与产物卡片、任务会话文案格式
   - composer/sessions.js：会话存储、侧栏最近会话、演示会话预置
   - composer/session-open.js：打开历史会话
   - composer/stream.js：Markdown 渲染、流式输出、模拟 AI 回复
   - composer/send.js：新会话与对话页的发送
   - composer/preview.js：产物预览页签、MCP 列表、预览视口
   - composer/doc-viewer.js：对话页右侧的任务抽屉与文档查看器
   - composer/plus-menu.js：＋按钮下拉
   - composer/asset-chat.js：对话创建 / 编辑智能体与智能体团队
   - composer/task-*.js：任务相关的对话（创建任务、任务状态对话、阶段确认、异常回看、# 引用任务）
   - composer/init.js：initComposer / initPlusMenu 事件接线
   新增对外函数：在对应文件导出后，再在本文件加一行转发。 */

/* 先按拆分前的顺序引入原依赖，保持全站模块求值顺序不变 */
import './collab/local-dev.js';
import '../core/bill-template.js';
import '../core/dom.js';
import '../core/toast.js';
import '../core/view.js';
import './attach-app.js';
import './chat.js';
import './dropdown.js';
import './expert/automatch.js';
import './expert/chips.js';
import './expert/data.js';
import './expert/asset-creation.js';
import './expert/layers.js';
import './expert/editor-panel.js';
import './expert/library.js';
import './collab/experts.js';
import './expert/store.js';
import './expert/task-team.js';
import './sidebar.js';
import './collab/data.js';
import './collab/tb-core.js';
import './tasks-v2/data.js';
import './tasks-v2/stage-owner.js';
import './tasks-v2/artifact-docs.js';
import './collab/run-artifacts.js';
import './tasks-v2/task-execution.js';
import './tasks-v2/confirm.js';
import './tasks-v2/task-sessions.js';

export { appendAssistantMessage, appendUserMessage, createArtifactCard, messagesList, refreshSend, scrollChatBottom, setComposerTaskReference } from './composer/messages.js';
export { openTaskExceptionHistory, openTaskSessionHistory } from './composer/task-history.js';
export { restoreChatSession, taskConversationNeedsReply, taskConversationQuestion } from './composer/sessions.js';
export { startTaskCreationChat } from './composer/task-create-chat.js';
export { startAssetCreationChat, startAssetEditChat } from './composer/asset-chat.js';
import './composer/session-open.js';
export { continueBlockedTaskConversation, openTaskQuestionConversation, openTaskStatusConversation } from './composer/task-conversation.js';
export { resetChatForStandalone } from './composer/task-stage-confirm.js';
import './composer/doc-viewer.js';
export { chatResizer } from './composer/preview.js';
export { simulateAIResponse } from './composer/stream.js';
export { doSend, sendComposerText, setChatSendInterceptor, setNewtaskSendInterceptor, startTaskConversationSimulation } from './composer/send.js';
import './composer/plus-menu.js';
import './composer/task-mention.js';
export { initComposer, initPlusMenu } from './composer/init.js';
