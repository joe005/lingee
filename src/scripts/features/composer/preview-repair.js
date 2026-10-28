import { tkCanViewTask, tkGetProjectName, tkGetTaskArtifacts, tkGetTasks } from '../tasks-v2/data.js';
import { activeSessionId, createChatSession, saveChatSessions } from './sessions.js';
import { openChatSession } from './session-open.js';
import { appendAssistantMessage, appendUserMessage, createChatResultArtifactCard, createFinalResult, messagesList, scrollChatBottom } from './messages.js';
import { renderMarkdown } from './stream.js';
import { openChatDocViewer } from './doc-viewer.js';

var repairTimers = new Map();
var openedRepairPreviews = new Set();
var REPAIR_STEPS = [
  ['读取启动日志', '已读取 server-devserver 日志：启动期间出现 EADDRINUSE，预览端口被残留进程占用，服务未能监听成功。'],
  ['定位占用进程', '确认占用端口的是上一次启动遗留的 devserver 进程，项目编译已通过，无需修改业务代码。'],
  ['清理并重启', '已结束残留进程并重新启动 devserver，启动日志显示服务已成功监听预览端口。'],
  ['验证应用预览', '已检查服务状态与预览地址：进程运行正常，页面返回 HTTP 200，应用内容加载成功。'],
];
function restorePreview(session) {
  document.dispatchEvent(new CustomEvent('lingee:preview-service-restored', { detail:{ taskId:session.previewRepair.sourceTaskId } }));
}
export function renderPreviewRepairConversation(session) {
  var repair = session.previewRepair;
  session.teamId = '';
  if (repair.version !== 2) {
    Object.assign(repair, { version:2, step:0, status:'running' });
    if (session.exchanges[0]) { delete session.exchanges[0].response; session.exchanges[0].done = false; }
    saveChatSessions();
  }
  messagesList.innerHTML = '';
  var previewToOpen = null;
  session.exchanges.forEach(function (exchange, index) {
    appendUserMessage(exchange.prompt);
    var response = appendAssistantMessage(null);
    var result = createFinalResult(false);
    var text = index === 0
      ? '### 应用启动故障排查（模拟）\n\n' + REPAIR_STEPS.slice(0, repair.step).map(function (step, i) { return (i + 1) + '. **' + step[0] + '**：' + step[1]; }).join('\n\n')
        + (repair.status === 'resolved' ? '\n\n### 已解决\n\n预览端口占用已清理，服务重启成功，应用预览已恢复。' : '\n\n正在' + REPAIR_STEPS[repair.step][0] + '…')
      : exchange.response;
    result.querySelector('.markdown-content').innerHTML = renderMarkdown(text || '应用预览已恢复，可以打开预览查看运行成果。');
    response.appendChild(result);
    if (repair.status === 'resolved' && index === 0) {
      var task = tkGetTasks().find(function (row) { return row.id === repair.sourceTaskId; });
      if (task && tkCanViewTask(task)) {
        var artifact = tkGetTaskArtifacts(task).find(function (row) { return row.id === 'implementation-preview'; });
        if (artifact) {
          artifact = Object.assign({}, artifact, { previewStartupFailure:false });
          result.appendChild(createChatResultArtifactCard(task, artifact));
          previewToOpen = { task:task, artifact:artifact };
        }
      }
    }
  });
  scrollChatBottom();
  if (repair.status === 'resolved') {
    restorePreview(session);
    if (previewToOpen && !openedRepairPreviews.has(session.id)) {
      openedRepairPreviews.add(session.id);
      openChatDocViewer(previewToOpen.task, previewToOpen.artifact, true);
    }
    return;
  }
  if (repairTimers.has(session.id)) return;
  repairTimers.set(session.id, setTimeout(function () {
    repairTimers.delete(session.id);
    repair.step = Math.min(REPAIR_STEPS.length, repair.step + 1);
    if (repair.step === REPAIR_STEPS.length) {
      repair.status = 'resolved';
      session.exchanges[0].done = true;
      restorePreview(session);
    }
    saveChatSessions();
    if (activeSessionId === session.id) renderPreviewRepairConversation(session);
    else if (repair.status !== 'resolved') advanceRepairInBackground(session);
  }, 1000));
}
function advanceRepairInBackground(session) {
  repairTimers.set(session.id, setTimeout(function () {
    repairTimers.delete(session.id);
    session.previewRepair.step = Math.min(REPAIR_STEPS.length, session.previewRepair.step + 1);
    if (session.previewRepair.step === REPAIR_STEPS.length) {
      session.previewRepair.status = 'resolved'; session.exchanges[0].done = true; restorePreview(session);
    }
    saveChatSessions();
    if (activeSessionId === session.id) renderPreviewRepairConversation(session);
    else if (session.previewRepair.status !== 'resolved') advanceRepairInBackground(session);
  }, 1000));
}

/* 预览故障通过事件进入独立修复会话，不继续或改变原任务的执行阶段。 */
export function initPreviewRepairChat() {
  document.addEventListener('lingee:preview-repair', function (event) {
    var task = tkGetTasks().find(function (row) { return row.id === Number(event.detail?.taskId); });
    if (!task || !tkCanViewTask(task)) return;
    var projectName = tkGetProjectName(task.project);
    var session = createChatSession('修复应用启动失败 · ' + task.title, null);
    session.projectId = task.project;
    session.teamId = '';
    session.executionPick = {kind:null,id:'',auto:false};
    session.previewRepair = { sourceTaskId:task.id, error:'应用启动失败', version:2, step:0, status:'running' };
    session.exchanges.push({
      prompt:'应用预览启动失败。请读取当前项目的 server-devserver 日志，定位失败原因：\n- 若存在编译或启动错误，请修复相关代码或配置，并重新启动服务。\n- 若启动日志正常，但服务异常退出或无法访问，请重启 devserver 进程。\n\n重启后检查服务状态与预览地址，确认应用页面可以正常打开；若仍失败，请说明原因及需要补充的信息。\n\n项目：' + projectName + '\n来源任务：' + task.code + '「' + task.title + '」',
      done:false,
    });
    saveChatSessions();
    openChatSession(session.id);
  });
}
