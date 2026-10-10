import { EXPERTS, xav } from '../../expert/data.js';
import { taskExecutorTeam } from '../../expert/task-team.js';
import { TK_AGENTS, TK_PEOPLE, tkGetTasks, tkPeopleInProject, tkProjectById } from '../data.js';
import { pageState } from './page-state.js';
import { state } from './state.js';
import { escapeHtml } from './utils.js';
/* 任务页 · 评论 @ 提及（拆分自 tasks-v2/index.js，逻辑未改） */
/* ---------- 评论 @ mention ---------- */
pageState.mentionPanel = null;
pageState.mentionItems = [];
pageState.mentionIndex = 0;
var mentionTextarea = null;

function mentionMatches(item, query) {
  var q = query.trim().toLocaleLowerCase();
  return !q || item.name.toLocaleLowerCase().includes(q) || (item.role || '').toLocaleLowerCase().includes(q);
}

function mentionGroup(label, items, type) {
  if (!items.length) return '';
  return '<div class="tk-mention-group" role="group" aria-label="' + label + '">'
    + '<div class="tk-mention-group-label">' + label + '</div>'
    + items.map(function (item) {
      var avatar = item.k
        ? '<img class="tk-mention-avatar" src="' + xav(item.k) + '" alt="">'
        : '<span class="tk-mention-avatar" style="background:' + escapeHtml(item.color || 'var(--brand)') + '">' + escapeHtml(item.avatar || item.name.slice(0, 1)) + '</span>';
      return '<button type="button" role="option" aria-selected="false" class="tk-mention-item" data-mention-name="' + escapeHtml(item.name) + '" data-mention-type="' + type + '" data-mention-id="' + escapeHtml(item.id) + '">'
        + avatar + '<span class="tk-mention-name">' + escapeHtml(item.name) + '</span>'
        + (type === 'person' ? '' : '<span class="tk-mention-type">' + (type === 'team' ? '专家团成员' : '智能体') + '</span>') + '</button>';
    }).join('') + '</div>';
}

export function setMentionIndex(index) {
  if (!pageState.mentionItems.length) return;
  pageState.mentionIndex = (index + pageState.mentionItems.length) % pageState.mentionItems.length;
  pageState.mentionItems.forEach(function (item, i) {
    item.classList.toggle('active', i === pageState.mentionIndex);
    item.setAttribute('aria-selected', String(i === pageState.mentionIndex));
  });
  pageState.mentionItems[pageState.mentionIndex].scrollIntoView({ block:'nearest' });
}

export function createMentionPanel(textarea, query) {
  mentionTextarea = textarea;
  var mentionTask = tkGetTasks().find(function (task) { return task.id === state.drawerTaskId; });
  var project = tkProjectById(mentionTask?.project);
  var team = mentionTask ? taskExecutorTeam(mentionTask, project) : null;
  var teamIds = new Set(team?.members || []);
  var people = (mentionTask ? tkPeopleInProject(mentionTask.project) : TK_PEOPLE).filter(function (row) { return mentionMatches(row, query); });
  var members = (team?.members || []).map(function (id) { return EXPERTS.find(function (row) { return row.id === id; }); })
    .filter(Boolean).filter(function (row) { return mentionMatches(row, query); });
  var agents = EXPERTS.filter(function (row) { return !teamIds.has(row.id) && mentionMatches(row, query); })
    .concat(TK_AGENTS.filter(function (row) { return mentionMatches(row, query); }));
  var html = mentionGroup(team ? team.name + ' · 成员' : '专家团成员', members, 'team')
    + mentionGroup('人员', people, 'person') + mentionGroup('智能体', agents, 'agent');
  if (!html) html = '<div class="tk-mention-empty">无匹配结果</div>';
  if (!pageState.mentionPanel) {
    pageState.mentionPanel = document.createElement('div');
    pageState.mentionPanel.className = 'tk-mention-panel';
    pageState.mentionPanel.id = 'tkMentionPanel';
    pageState.mentionPanel.setAttribute('role', 'listbox');
    pageState.mentionPanel.setAttribute('aria-label', '@ 提及对象');
    pageState.mentionPanel.addEventListener('click', function (e) {
      var item = e.target.closest('.tk-mention-item');
      if (item && mentionTextarea) insertMention(mentionTextarea, item.getAttribute('data-mention-name'));
    });
    document.body.appendChild(pageState.mentionPanel);
  }
  pageState.mentionPanel.innerHTML = html;
  pageState.mentionPanel.classList.add('show');
  var rect = textarea.getBoundingClientRect();
  var panelHeight = Math.min(pageState.mentionPanel.scrollHeight, 300);
  var top = rect.bottom + 6;
  if (top + panelHeight > window.innerHeight - 8) top = rect.top - panelHeight - 6;
  pageState.mentionPanel.style.top = Math.max(8, top) + 'px';
  pageState.mentionPanel.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 304)) + 'px';
  pageState.mentionItems = Array.from(pageState.mentionPanel.querySelectorAll('.tk-mention-item'));
  pageState.mentionIndex = 0;
  setMentionIndex(0);
}

export function closeMentionPanel() {
  if (pageState.mentionPanel) pageState.mentionPanel.classList.remove('show');
  mentionTextarea = null;
}

export function insertMention(ta, name) {
  var pos = ta.selectionStart;
  var text = ta.value;
  var atPos = text.lastIndexOf('@', pos);
  if (atPos < 0) { closeMentionPanel(); return; }
  var before = text.substring(0, atPos);
  var after = text.substring(pos);
  ta.value = before + '@' + name + ' ' + after;
  var newPos = atPos + name.length + 2;
  ta.focus();
  ta.setSelectionRange(newPos, newPos);
  closeMentionPanel();
  ta.dispatchEvent(new Event('input', { bubbles:true }));
}
