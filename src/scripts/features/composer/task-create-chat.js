import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { showView } from '../../core/view.js';
import { renderExpertChips } from '../expert/chips.js';
import { xav } from '../expert/data.js';
import { hideAssetEditorPanel } from '../expert/editor-panel.js';
import { set_activePick, teamById } from '../expert/store.js';
import { CV_MEMBERS, CV_PROJECTS } from '../collab/data.js';
import { tbTeamStages } from '../collab/tb-core.js';
import { tkAddTask, tkCanStartTask, tkCurrentUserId, tkGetTasks, tkPeopleInProject, tkProjectsForCurrentUser } from '../tasks-v2/data.js';
import { defaultStageAssigneeId } from '../tasks-v2/stage-owner.js';
import { appendAssistantMessage, appendUserMessage, escapeHtml, messagesList, scrollChatBottom, setComposerTaskReference } from './messages.js';
import { activeSessionId, activeSessionTaskId, collapsedChatProjects, createChatSession, renderChatSessions, saveChatSessions, set_activeSessionTaskId } from './sessions.js';
import { renderChatTaskSide, syncTaskCreateProjectPicker } from './task-conversation.js';
import { closeChatDocViewer } from './doc-viewer.js';
import { renderMarkdown } from './stream.js';
import { chatInput, refreshChatSend } from './send.js';
/* 任务对话：对话式创建任务（拆自 composer.js） */

/* 新建任务技能的本地原型：沿用会话与追问卡片，回答完成后才写入任务。 */
function setTaskCreateChipLabel() {
  var label = document.getElementById('chatExpertLabel');
  if (label) label.textContent = '任务创建智能体';
}
function taskCreateStages(draft) {
  var project = CV_PROJECTS.find(function (row) { return row.id === draft.projectId; });
  var team = teamById(draft.teamId || '');
  var people = tkPeopleInProject(draft.projectId);
  var allStages = team ? tbTeamStages(team, { type: draft.issueType, title: draft.title || draft.prompt }) : [];
  var stages = draft.selectedStages
    ? allStages.filter(function (s) { return draft.selectedStages.includes(s.id); })
    : allStages;
  return stages.map(function (stage) {
    return {
      workType:stage.name, title:stage.name, description:stage.desc || '',
      assigneeId:draft.reviewers?.[stage.name] || defaultStageAssigneeId(project, people, CV_MEMBERS, stage.name)
        || (people.some(function (person) { return person.id === tkCurrentUserId(); }) ? tkCurrentUserId() : people[0]?.id) || '',
      requiresConfirmation:!(Array.isArray(draft.autoReviewStages) ? draft.autoReviewStages.includes(stage.name) : draft.autoReview),
      status:'pending',
    };
  });
}
function inferDefaultStageIds(prompt, issueType, allStages) {
  return allStages.map(function (s) { return s.id; });
}
function hideTaskQuestionPanel() {
  var panel = document.getElementById('chatTaskCreatePanel');
  if (panel) panel.hidden = true;
}
function prepareTaskCreateDraft(draft, latestMessage) {
  var project = CV_PROJECTS.find(function (row) { return row.id === draft.projectId; });
  var priorityMatch = String(latestMessage || draft.prompt || '').match(/(?:优先级(?:为|是|设为|改为|改成)?[：:\s]*)(紧急|高|中|低)/);
  draft.priority = priorityMatch ? ({'紧急':'urgent','高':'high','中':'medium','低':'low'}[priorityMatch[1]]) : draft.priority || 'medium';
  var explicitType = String(latestMessage || '').match(/(?:改为|改成|类型是|类型为)(需求|缺陷)/);
  draft.issueType = explicitType?.[1] || draft.issueType || (/缺陷|Bug|报错|故障|修复/i.test(draft.prompt) ? '缺陷' : '需求');
  var draftTeam = teamById(draft.teamId || '');
  var allStages = draftTeam ? tbTeamStages(draftTeam, { type: draft.issueType, title: draft.title || draft.prompt }) : [];
  if (explicitType || !draft.selectedStages?.length) draft.selectedStages = inferDefaultStageIds(draft.prompt, draft.issueType, allStages);
  var instruction = String(latestMessage || draft.prompt);
  if (latestMessage) allStages.forEach(function (stage) {
    if (new RegExp('(?:不要|去掉|删除|移除)[^。！？；;\\n]*' + stage.name).test(instruction)) {
      draft.selectedStages = draft.selectedStages.filter(function (id) { return id !== stage.id; });
    } else if (new RegExp('(?:增加|添加|加上|加入)[^。！？；;\\n]*' + stage.name).test(instruction) && !draft.selectedStages.includes(stage.id)) {
      draft.selectedStages.push(stage.id);
    }
  });
  if (!draft.selectedStages.length) draft.selectedStages = inferDefaultStageIds(draft.prompt, draft.issueType, allStages);
  draft.reviewers ||= {};
  var people = tkPeopleInProject(draft.projectId);
  allStages.filter(function (stage) { return draft.selectedStages.includes(stage.id); }).forEach(function (stage) {
    var sentence = String(latestMessage || draft.prompt).split(/[。！？；;\n]/).find(function (part) { return part.includes(stage.name); }) || '';
    var namedPerson = people.find(function (person) { return sentence.includes(person.name); });
    if (namedPerson) draft.reviewers[stage.name] = namedPerson.id;
    else if (!draft.reviewers[stage.name]) draft.reviewers[stage.name] = defaultStageAssigneeId(project, people, CV_MEMBERS, stage.name)
      || (people.some(function (person) { return person.id === tkCurrentUserId(); }) ? tkCurrentUserId() : people[0]?.id) || '';
  });
  if (!Array.isArray(draft.autoReviewStages)) draft.autoReviewStages = draft.autoReview ? allStages.map(function (stage) { return stage.name; }) : [];
  if (/全部人工评审|不要(?:自动审核|AI\s*验收)|无需(?:自动审核|AI\s*验收)/.test(instruction)) draft.autoReviewStages = [];
  else if (/自动审核|AI\s*验收/.test(instruction)) {
    var reviewClauses = instruction.split(/[。！？；;，,\n]/).filter(function (part) { return /自动审核|AI\s*验收/.test(part); }).join(' ');
    var namedStages = allStages.filter(function (stage) { return reviewClauses.includes(stage.name); });
    draft.autoReviewStages = namedStages.length ? namedStages.map(function (stage) { return stage.name; }) : allStages.map(function (stage) { return stage.name; });
  }
}
function taskCreateRecommendation(draft) {
  var project = CV_PROJECTS.find(function (row) { return row.id === draft.projectId; });
  var people = tkPeopleInProject(draft.projectId);
  var stages = taskCreateStages(draft);
  return '## 推荐任务\n'
    + '- **标题**：' + draft.title + '\n'
    + '- **项目**：' + (project?.name || '当前项目') + '\n'
    + '- **类型**：' + draft.issueType + '\n'
    + '- **优先级**：' + ({urgent:'紧急',high:'高',medium:'中',low:'低'}[draft.priority || 'medium']) + '\n'
    + '- **任务说明**：' + draft.description.replace(/\s+/g, ' ').slice(0, 300) + '\n\n'
    + '## 推荐执行计划\n'
    + stages.map(function (stage, index) {
      var person = people.find(function (row) { return row.id === stage.assigneeId; });
      return (index + 1) + '. **' + stage.workType + '**：' + (person?.name || '待分配')
        + '执行，' + (stage.requiresConfirmation ? '不开 AI 验收' : '开启 AI 验收');
    }).join('\n');
}
function appendTaskCreateAgent(html) {
  var response = appendAssistantMessage(null);
  response.innerHTML = '<div class="chat-agent-identity"><img class="task-create-avatar" src="' + xav('pm') + '" alt=""><strong>任务创建智能体</strong><span class="chat-agent-state">任务创建 Skill · 原型</span></div>' + html;
}
function taskCreateIntentText(draft) {
  var project = CV_PROJECTS.find(function (row) { return row.id === draft.projectId; });
  return '正在理解你要完成的工作…\n'
    + '识别目标：' + draft.title + '\n'
    + '任务归属：' + (project?.name || '当前项目') + '；初步判断为' + draft.issueType + '类任务。\n'
    + '正在整理任务说明、执行阶段与项目成员分工。';
}
function streamTaskCreateIntent(session, target) {
  var text = taskCreateIntentText(session.taskCreate);
  var cursor = document.createElement('span');
  cursor.className = 'cursor-blink';
  cursor.textContent = '▌';
  var index = 0;
  function next() {
    if (!target.isConnected || activeSessionId !== session.id || session.taskCreate.status !== 'intent') return;
    index = Math.min(text.length, index + 4);
    target.textContent = text.slice(0, index);
    target.appendChild(cursor);
    scrollChatBottom();
    if (index < text.length) { setTimeout(next, 45); return; }
    cursor.remove();
    session.taskCreate.status = 'confirm';
    saveChatSessions();
    renderTaskCreateChat(session);
  }
  next();
}
function renderTaskCreateChat(session) {
  var draft = session.taskCreate;
  if (draft.status === 'intent' && (!draft.issueType || !draft.selectedStages?.length)) {
    prepareTaskCreateDraft(draft);
    saveChatSessions();
  } else if (['owner', 'type', 'stages', 'reviewer', 'autoReview'].includes(draft.status)) {
    prepareTaskCreateDraft(draft);
    draft.status = 'confirm';
    saveChatSessions();
  }
  messagesList.innerHTML = '';
  hideTaskQuestionPanel();
  if (draft.prompt) appendUserMessage(draft.prompt);
  if (!draft.prompt) appendTaskCreateAgent('<p>请描述要创建的任务。请在下方输入框中选择所属项目。</p>');
  else {
    appendTaskCreateAgent('<div class="task-create-intent"><strong>' + (draft.status === 'intent' ? '正在理解任务意图' : '已理解任务意图') + '</strong><p class="task-create-intent-text"></p></div>');
    var intentTarget = messagesList.querySelector('.task-create-intent-text');
    if (draft.status === 'intent') streamTaskCreateIntent(session, intentTarget);
    else intentTarget.textContent = taskCreateIntentText(draft);
    (draft.revisions || []).forEach(function (message) { appendUserMessage(message); });
    if (draft.status === 'confirm') {
      appendTaskCreateAgent('<div class="task-create-preview task-create-recommendation"><strong>根据意图生成的任务建议</strong>'
        + '<div class="markdown-content">' + renderMarkdown(taskCreateRecommendation(draft)) + '</div>'
        + '<div class="task-create-preview-actions"><span>可继续补充要求，建议会随之更新。</span><button type="button" data-task-create-confirm>确认创建任务</button></div></div>');
    } else if (draft.status === 'done') {
      var task = tkGetTasks().find(function (row) { return row.id === Number(session.taskId); });
      appendTaskCreateAgent('<div class="task-create-preview task-create-result"><strong>任务已生成</strong><p>' + escapeHtml(task?.code || '') + ' · ' + escapeHtml(session.title) + '</p><div class="task-create-result-actions"><button type="button" data-task-create-open>查看详情</button>' + (tkCanStartTask(task) ? '<button type="button" data-task-create-run>立即执行</button>' : '') + '</div></div>');
      session.exchanges.forEach(function (exchange) {
        appendUserMessage(exchange.prompt);
        appendTaskCreateAgent('<p>' + escapeHtml(exchange.response || '') + '</p>');
      });
    }
  }
  chatInput.contentEditable = draft.status === 'intent' ? 'false' : 'true';
  chatInput.setAttribute('data-placeholder', draft.status === 'done' ? '继续询问这项任务…' : draft.status === 'intent' ? '正在整理任务建议…' : draft.status === 'prompt' ? '一句话描述任务…' : '补充要求，或点击确认创建…');
  setTaskCreateChipLabel();
  syncTaskCreateProjectPicker();
  scrollChatBottom();
}
function answerTaskCreateMessage(session, message) {
  var draft = session.taskCreate;
  if (draft.status === 'prompt') {
    if (!draft.projectId) { toast('请先选择项目', 'warning'); return false; }
    draft.prompt = message;
    draft.title = (message.split(/[。！？\n]/)[0].replace(/^(?:请帮我|帮我|我想|我要|我希望)\s*/, '').trim() || message).slice(0, 120);
    session.title = draft.title;
    draft.description = message;
    prepareTaskCreateDraft(draft);
    draft.status = 'intent';
  } else if (draft.status === 'confirm') {
    draft.revisions ||= [];
    draft.revisions.push(message);
    draft.description = [draft.prompt].concat(draft.revisions).join('\n');
    var renamed = message.match(/(?:标题|名称)(?:改为|改成|是|为)[:：]?\s*([^。！？\n]+)/);
    if (renamed) { draft.title = renamed[1].trim().slice(0, 120); session.title = draft.title; }
    prepareTaskCreateDraft(draft, message);
  } else if (draft.status === 'done') {
    var createdTask = tkGetTasks().find(function (row) { return row.id === Number(session.taskId); });
    var reply = /负责人|执行人|谁来/.test(message)
      ? '当前执行计划：' + (createdTask?.executionPlan || []).map(function (stage) {
          return stage.workType + '由' + (tkPeopleInProject(createdTask.project).find(function (person) { return person.id === stage.assigneeId; })?.name || '待分配') + '负责';
        }).join('，') + '。'
      : /执行|开始/.test(message)
        ? tkCanStartTask(createdTask) ? '可以点击上方任务卡片的「立即执行」开始当前阶段。' : '当前阶段需要由对应执行人启动，你可以点击「查看详情」查看分工。'
        : '这项任务已生成。你可以继续在这里询问分工和执行方式；如需修改任务内容，请点击卡片上的「查看详情」。';
    session.exchanges.push({prompt:message, response:reply, done:true});
  } else return false;
  saveChatSessions();
  renderChatSessions();
  renderTaskCreateChat(session);
  return true;
}
function confirmTaskCreate(session) {
  var draft = session.taskCreate;
  if (draft.status !== 'confirm' || !tkProjectsForCurrentUser().some(function (row) { return row.id === draft.projectId; })) { toast('请先确认所属项目', 'warning'); return; }
  var stages = taskCreateStages(draft);
  if (!teamById(draft.teamId || '')) { toast('请先选择智能体团队', 'warning'); $('#chatTaskTeamSelect').focus(); return; }
  if (!stages.length) { toast('所选智能体团队没有可用执行阶段', 'warning'); return; }
  var owner = stages[0].assigneeId || '';
  var task = tkAddTask({ title:draft.title, desc:draft.description, issueType:draft.issueType, status:'backlog', priority:draft.priority || 'medium', dueDate:'',
    assignee:owner, createdBy:tkCurrentUserId(), project:draft.projectId, teamId:draft.teamId || '',
    labels:[], executionPlan:stages.map(function (stage) { return {...stage, id:crypto.randomUUID()}; }), planStatus:stages.every(function (stage) { return !!stage.assigneeId; }) ? 'confirmed' : 'draft' });
  session.taskId = task.id;
  session.title = task.title;
  draft.status = 'done';
  set_activeSessionTaskId(task.id);
  saveChatSessions();
  renderChatSessions();
  renderChatTaskSide();
  setComposerTaskReference(task.id);
  renderTaskCreateChat(session);
  document.dispatchEvent(new Event('lingee:tasks-changed'));
}
function startTaskCreationChat(projectId, initialPrompt) {
  var projects = tkProjectsForCurrentUser();
  if (!projects.length) { toast('请先加入项目再创建任务', 'warning'); return; }
  if (projectId&&!projects.some(function (row) { return row.id === projectId; })) { toast('所属项目不可用', 'warning'); return; }
  hideAssetEditorPanel();
  set_activePick({kind:'expert', id:'software-product-manager', auto:false});
  renderExpertChips();
  setTaskCreateChipLabel();
  set_activeSessionTaskId(null);
  setComposerTaskReference(null);
  var selectedProjectId = projectId || '';
  var session = createChatSession('创建任务', null);
  session.taskCreate = {projectId:selectedProjectId, teamId:'', prompt:'', title:'', description:'', issueType:'', selectedStages:null, autoReviewStages:[], reviewers:{}, revisions:[], status:'prompt'};
  session.projectId = selectedProjectId;
  session.teamId = '';
  if (selectedProjectId) collapsedChatProjects.delete(selectedProjectId);
  saveChatSessions();
  renderChatSessions();
  showView('chat');
  closeChatDocViewer();
  $('#chatTitle').textContent = '创建任务';
  chatInput.textContent = '';
  refreshChatSend();
  renderChatTaskSide();
  if (String(initialPrompt || '').trim()) answerTaskCreateMessage(session, String(initialPrompt).trim());
  else renderTaskCreateChat(session);
  chatInput.focus();
  queueMicrotask(function () {
    var activeEntry = document.querySelector('#chatProjectFolders .chat-session-entry.active, #chatSessionList .chat-session-entry.active');
    if (activeEntry) activeEntry.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

export { answerTaskCreateMessage, confirmTaskCreate, hideTaskQuestionPanel, prepareTaskCreateDraft, renderTaskCreateChat, setTaskCreateChipLabel, startTaskCreationChat };
