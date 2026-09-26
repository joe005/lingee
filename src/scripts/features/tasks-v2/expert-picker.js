/* 任务管理「新建任务」弹窗：专家团下拉面板 hover 右侧二级面板 + 产物确认人。
   专家团作为一级选项，鼠标悬停时右侧弹出二级面板，展示该专家团覆盖的交付
   阶段节点，每个节点可下拉选一位项目成员作为产物确认人。参考列表筛选下拉的
   hover submenu 交互。复用 chips.js 下拉框架，通过 setTkFormHooks 注入专属
   渲染与点击处理，不改动 nt / chat 的原有行为。 */
import { TEAMS, activePick, saveTeams, set_activePick, teamById } from '../expert/store.js';
import { xesc } from '../expert/data.js';
import { facesHtml } from '../expert/library.js';
import { renderExpertChips, refloatTkFormMenu, setTkFormHooks } from '../expert/chips.js';
import { tkPeopleInProject } from './data.js';
import { tbTeamStages } from '../collab/tb-core.js';

/* 当前悬停的专家团 id（控制二级面板显示） */
var tkFormHoverTeam = null;
/* 每个专家团每个阶段的产物确认人：{ teamId: { stageId: personId | '' } }，默认空，由用户指定 */
var tkFormPlan = {};
var lastKw = '';

function projectPeople() {
  var sel = document.getElementById('tkFormProject');
  var pid = sel ? sel.value : '';
  return pid ? tkPeopleInProject(pid) : [];
}
function planOfTeam(tid) { return tkFormPlan[tid] || (tkFormPlan[tid] = {}); }

function confirmerOf(tid, stageId) { return planOfTeam(tid)[stageId] || ''; }

function rerender() {
  closeConfirmerMenu();
  var list = document.getElementById('tkFormExpertList');
  if (list) render(list, lastKw);
  refloatTkFormMenu();
}

/* 一级：专家团列表 */
function render(list, kw) {
  lastKw = (kw || '').trim();
  var teams = TEAMS.filter(function (t) {
    return !lastKw || (t.name + t.desc).indexOf(lastKw) >= 0;
  });
  var html = '<div class="pick-group">专家团</div>';
  if (!teams.length) {
    html += '<div class="xp-empty">没有匹配的专家团</div>';
  } else {
    teams.forEach(function (t) {
      var on = activePick.kind === 'team' && activePick.id === t.id;
      var hover = tkFormHoverTeam === t.id;
      html += '<div class="xp-team-row' + (on ? ' checked' : '') + (hover ? ' xp-hover' : '') + '"'
        + ' data-xp-team="' + xesc(t.id) + '" role="button" tabindex="0">'
        + facesHtml(t.members, 3)
        + '<span class="x-opt-b"><span class="x-opt-n">' + xesc(t.name) + '</span></span>'
        + '<svg class="xp-row-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 4 8 8-8 8"/></svg>'
        + '</div>';
    });
  }
  list.innerHTML = html;
  renderSubmenu();
}

/* 二级：交付阶段节点 + 确认人 */
function renderSubmenu() {
  var sub = document.getElementById('tkFormExpertSubmenu');
  if (!sub) return;
  if (!tkFormHoverTeam) { sub.classList.add('hidden'); sub.innerHTML = ''; return; }
  var team = teamById(tkFormHoverTeam);
  if (!team) { sub.classList.add('hidden'); sub.innerHTML = ''; return; }
  sub.classList.remove('hidden');
  var stages = tbTeamStages(team);
  var people = projectPeople();
  var html = '';
  if (!stages.length) {
    html += '<div class="xp-empty">该专家团暂无覆盖阶段</div>';
  } else if (!people.length) {
    html += '<div class="xp-empty">' + (document.getElementById('tkFormProject') && document.getElementById('tkFormProject').value ? '当前项目暂无成员，无法指定确认人' : '请先选择项目') + '</div>';
  } else {
    stages.forEach(function (s) {
      var conf = confirmerOf(team.id, s.id);
      var person = conf ? people.find(function (p) { return p.id === conf; }) : null;
      html += '<div class="xp-stage-row">'
        + '<span class="xp-stage-id"><span class="xp-stage-name">' + xesc(s.name) + '</span></span>'
        + '<div class="xp-confirmer tk-flow-field-value tk-flow-field-lg' + (person ? '' : ' is-placeholder') + '"'
        + ' role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="false"'
        + ' data-xp-team="' + xesc(team.id) + '" data-xp-stage="' + xesc(s.id) + '" aria-label="' + xesc(s.name) + ' 产物确认人">'
        + '<span class="xp-confirmer-text">' + xesc(person ? person.name : '确认人') + '</span>'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
        + '</div></div>';
    });
  }
  sub.innerHTML = html;
  /* flip：面板右侧空间不够时，二级往左展开 */
  var menu = document.querySelector('#tkFormExpertDropdown .menu');
  if (menu) {
    var rect = menu.getBoundingClientRect();
    sub.classList.toggle('flip', rect.right + 250 > window.innerWidth);
  }
}

/* hover 一级行切换二级（参考列表筛选：只切不藏，二级保持显示直到切换或关闭面板） */
function onListOver(ev) {
  var row = ev.target.closest('[data-xp-team]');
  var tid = row ? row.getAttribute('data-xp-team') : null;
  if (tid !== tkFormHoverTeam) {
    tkFormHoverTeam = tid;
    rerender();
  }
}

/* click：点专家团行选用该团（再点取消），不关闭面板 */
function onMenuClick(ev) {
  if (ev.target.closest('.xp-confirmer-menu')) return true;
  var trigger = ev.target.closest('.xp-confirmer');
  if (trigger) { toggleConfirmerMenu(trigger); return true; }
  if (ev.target.closest('#tkFormExpertSubmenu')) return false;
  var row = ev.target.closest('[data-xp-team]');
  if (!row) return false;
  var tid = row.getAttribute('data-xp-team');
  if (activePick.kind === 'team' && activePick.id === tid) {
    set_activePick({ kind: null, id: '', auto: false });
  } else {
    set_activePick({ kind: 'team', id: tid, auto: false });
    tkFormHoverTeam = tid;
  }
  saveTeams();
  renderExpertChips();
  rerender();
  return true;
}

/* 确认人自定义下拉：复用任务详情「处理人」的浮层菜单样式 */
function closeConfirmerMenu() {
  var m = document.querySelector('.xp-confirmer-menu');
  if (m) m.remove();
  var open = document.querySelector('.xp-confirmer[aria-expanded="true"]');
  if (open) open.setAttribute('aria-expanded', 'false');
}

function toggleConfirmerMenu(trigger) {
  if (trigger.getAttribute('aria-expanded') === 'true') { closeConfirmerMenu(); return; }
  openConfirmerMenu(trigger);
}

function openConfirmerMenu(trigger) {
  closeConfirmerMenu();
  var tid = trigger.getAttribute('data-xp-team');
  var sid = trigger.getAttribute('data-xp-stage');
  var conf = confirmerOf(tid, sid);
  var menu = document.createElement('div');
  menu.className = 'xp-confirmer-menu';
  var opts = [{ id: '', name: '确认人' }].concat(projectPeople());
  opts.forEach(function (o) {
    var item = document.createElement('div');
    item.className = 'xp-confirmer-menu-item' + (o.id === conf ? ' checked' : '');
    item.textContent = o.name;
    item.addEventListener('click', function (ev) { ev.stopPropagation(); pickConfirmer(tid, sid, o.id); });
    menu.appendChild(item);
  });
  var host = trigger.closest('.menu') || document.body;
  host.appendChild(menu);
  var r = trigger.getBoundingClientRect();
  menu.style.top = (r.bottom + 4) + 'px';
  menu.style.left = r.left + 'px';
  menu.style.minWidth = r.width + 'px';
  trigger.setAttribute('aria-expanded', 'true');
}

function pickConfirmer(tid, sid, personId) {
  planOfTeam(tid)[sid] = personId;
  closeConfirmerMenu();
  rerender();
}

/* 供 saveTask 读取 */
function getTkFormExpertSelection() {
  var teamId = activePick.kind === 'team' ? activePick.id : '';
  var team = teamId ? teamById(teamId) : null;
  var plan = [];
  if (team) {
    tbTeamStages(team).forEach(function (s) {
      plan.push({ stageId: s.id, stageName: s.name, confirmerId: confirmerOf(team.id, s.id) });
    });
  }
  return { teamId: teamId, plan: plan };
}

function resetTkFormExpertPicker() {
  tkFormHoverTeam = (activePick.kind === 'team') ? activePick.id : null;
  tkFormPlan = {};
}

function initTkFormExpertPicker() {
  setTkFormHooks({ render: render, onMenuClick: onMenuClick });
  var menu = document.querySelector('#tkFormExpertDropdown .menu');
  if (menu) menu.classList.add('xp-form-menu');
  var list = document.getElementById('tkFormExpertList');
  if (list) list.addEventListener('mouseover', onListOver);
  document.addEventListener('click', function (ev) {
    if (ev.target.closest('.xp-confirmer') || ev.target.closest('.xp-confirmer-menu')) return;
    closeConfirmerMenu();
  });
}

export { getTkFormExpertSelection, initTkFormExpertPicker, resetTkFormExpertPicker };
