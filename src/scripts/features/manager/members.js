import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { CV_MEMBERS, cvPersonById } from '../collab/data.js';
import { openInvite } from './invite.js';
import {
  MEMBER_ROLES, mgrCanManageProject, mgrExpert, mgrExpertList, mgrMemberOpenTasks, mgrMemberRole, mgrProjectById,
  mgrProjectPeople, mgrProjectTasks, mgrSetMemberLevel, mgrSetProjectExperts, mgrSetProjectMembers,
} from './data.js';
import { mgrEsc } from './utils.js';
/* 管理 · 成员与权限：左侧成员（按负责人 / 管理员 / 成员 / 参与人分页签，分页，邀请入口在「邀请成员」弹窗），
   右侧项目智能体（添加、移除、设置功能权限）。人员数据与开发板块共用（CV_MEMBERS）；所有改动即时生效。 */

var PAGE_SIZE = 6;
var TABS = [['all', '全部'], ['owner', '负责人'], ['admin', '管理员'], ['member', '成员'], ['participant', '参与人']];
var LEVEL_LABEL = { owner: '项目负责人', admin: '项目管理员', member: '成员', participant: '参与人' };
var AGENT_PERMS = [['chat', '对话调用', '在项目对话里调用该智能体'], ['read', '读取项目知识库', '读取项目知识库与任务产物'], ['write', '写入任务产物', '把执行结果写回任务与知识库']];
var PENCIL = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
var CHEVRON = '<svg class="mgr-mp-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

var projectId = null;
var tab = 'all';
var page = 1;
var memberQuery = '';
var agentQuery = '';
var agentOpen = null;      /* 展开功能权限的智能体 ID */
var menuFor = null;        /* 打开角色菜单的成员 ID */
var popQuery = '';
var pendingRemoval = null;

function project() { return projectId ? mgrProjectById(projectId) : null; }
function isOwner(p, person) { return !!person && person.name === p.owner; }
function levelOf(p, person) {
  if (isOwner(p, person)) return 'owner';
  return (p.adminIds || []).includes(person.id) ? 'admin' : 'member';
}
/* 项目成员（负责人置顶，未写入成员列表时补上）、管理员其次；参与人是任务里出现但不在成员列表里的人 */
function roster(p) {
  var members = mgrProjectPeople(p);
  var owner = CV_MEMBERS.find(function (m) { return m.name === p.owner && m.status !== 'disabled'; });
  if (owner && !members.some(function (m) { return m.id === owner.id; })) members = [owner].concat(members);
  var order = { owner: 0, admin: 1, member: 2 };
  var rows = members.map(function (person, i) { return { person: person, level: levelOf(p, person), i: i }; });
  rows.sort(function (a, b) { return order[a.level] - order[b.level] || a.i - b.i; });
  var ids = new Set(rows.map(function (r) { return r.person.id; }));
  var participants = [];
  mgrProjectTasks(p.id).forEach(function (t) {
    [t.assignee].concat(t.collaborators || [], (t.executionPlan || []).map(function (s) { return s.assigneeId; })).forEach(function (id) {
      var person = cvPersonById(id);
      if (person && !ids.has(person.id)) { ids.add(person.id); participants.push({ person: person, level: 'participant', i: 0 }); }
    });
  });
  return { members: rows, participants: participants };
}
function avatarClass(person) { return 'mgr-mp-avatar--' + ((person.name.charCodeAt(0) || 0) % 4); }

/* ---------- 成员 ---------- */
function renderMembers() {
  var p = project();
  if (!p) return;
  var canEdit = mgrCanManageProject(p);
  var r = roster(p);
  var counts = {
    all: r.members.length, owner: r.members.filter(function (x) { return x.level === 'owner'; }).length,
    admin: r.members.filter(function (x) { return x.level === 'admin'; }).length,
    member: r.members.filter(function (x) { return x.level === 'member'; }).length, participant: r.participants.length,
  };
  $('#mgrMpMemberCount').textContent = r.members.length + '个';
  $('#mgrMpTabs').innerHTML = TABS.map(function (t) {
    var on = tab === t[0];
    return '<button type="button" class="mgr-mp-tab' + (on ? ' active' : '') + '" role="tab" aria-selected="' + on + '" data-mgr-mp-tab="' + t[0] + '">' + t[1] +
      (counts[t[0]] || t[0] === 'all' ? ' <small>' + counts[t[0]] + '</small>' : '') + '</button>';
  }).join('');
  var pool = tab === 'participant' ? r.participants : r.members.filter(function (x) { return tab === 'all' || x.level === tab; });
  var q = memberQuery.trim().toLocaleLowerCase();
  if (q) pool = pool.filter(function (x) { return x.person.name.toLocaleLowerCase().includes(q); });
  var pages = Math.max(1, Math.ceil(pool.length / PAGE_SIZE));
  page = Math.min(page, pages);
  var rows = pool.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  $('#mgrMpList').innerHTML = rows.length
    ? rows.map(function (x) {
      var edit = canEdit && (x.level === 'admin' || x.level === 'member')
        ? '<button type="button" class="mgr-mp-edit" data-mgr-mp-edit="' + mgrEsc(x.person.id) + '" aria-haspopup="menu" aria-expanded="' + (menuFor === x.person.id) + '" aria-label="设置' + mgrEsc(x.person.name) + '的角色">' + PENCIL + '</button>'
        : '<span class="mgr-mp-edit-gap"></span>';
      return '<div class="mgr-mp-row"><span class="mgr-mp-avatar ' + avatarClass(x.person) + '" aria-hidden="true">' + mgrEsc(x.person.name[0] || '?') + '</span>' +
        '<span class="mgr-mp-name">' + mgrEsc(x.person.name) + '</span>' +
        '<span class="mgr-mp-badge mgr-mp-badge--' + x.level + '">' + LEVEL_LABEL[x.level] + '</span>' + edit + '</div>';
    }).join('')
    : '<div class="mgr-mp-empty">' + (q ? '没有匹配的成员' : tab === 'participant' ? '暂无参与人' : '暂无成员') + '</div>';
  $('#mgrMpPager').innerHTML = pages > 1
    ? '<button type="button" class="mgr-mp-page" data-mgr-mp-page="-1" aria-label="上一页"' + (page <= 1 ? ' disabled' : '') + '>‹</button><span>' + page + '/' + pages + '</span>' +
      '<button type="button" class="mgr-mp-page" data-mgr-mp-page="1" aria-label="下一页"' + (page >= pages ? ' disabled' : '') + '>›</button>'
    : '';
  $('#mgrMpInvite').hidden = !canEdit;
}

/* 角色菜单：项目角色、岗位、移除。位置按触发按钮定位，空间不足时向上展开 */
function closeMenu() {
  var menu = $('#mgrMpMenu');
  if (menu) menu.remove();
  menuFor = null;
}
function openMenu(personId, btn) {
  var p = project();
  var person = cvPersonById(personId);
  if (!p || !person || !mgrCanManageProject(p)) return;
  closeMenu();
  menuFor = personId;
  var level = levelOf(p, person);
  var job = mgrMemberRole(p, person);
  var item = function (attr, label, on) {
    return '<button type="button" role="menuitemradio" aria-checked="' + on + '" class="mgr-mp-menu-item' + (on ? ' is-on' : '') + '" ' + attr + '><span>' + label + '</span>' + (on ? '<b aria-hidden="true">✓</b>' : '') + '</button>';
  };
  var menu = document.createElement('div');
  menu.id = 'mgrMpMenu';
  menu.className = 'mgr-mp-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = '<div class="mgr-mp-menu-title">项目角色</div>' +
    item('data-mgr-mp-level="admin"', '项目管理员', level === 'admin') + item('data-mgr-mp-level="member"', '成员', level === 'member') +
    '<div class="mgr-mp-menu-title">岗位</div>' +
    MEMBER_ROLES.map(function (r) { return item('data-mgr-mp-job="' + r[0] + '"', r[1], job === r[0]); }).join('') +
    '<div class="mgr-mp-menu-sep"></div><button type="button" role="menuitem" class="mgr-mp-menu-item is-danger" data-mgr-mp-remove="' + mgrEsc(personId) + '"><span>移除成员</span></button>';
  $('#mgrMembersOverlay .mgr-mp-modal').appendChild(menu);
  var box = btn.getBoundingClientRect();
  var host = $('#mgrMembersOverlay .mgr-mp-modal').getBoundingClientRect();
  var h = menu.getBoundingClientRect().height;
  var up = window.innerHeight - box.bottom < h + 12 && box.top > h + 12;
  menu.style.left = Math.max(8, box.right - host.left - menu.getBoundingClientRect().width) + 'px';
  menu.style.top = (up ? box.top - host.top - h - 4 : box.bottom - host.top + 4) + 'px';
  btn.setAttribute('aria-expanded', 'true');
  var first = menu.querySelector('.mgr-mp-menu-item');
  if (first) first.focus();
}
function setLevel(personId, asAdmin) {
  var p = project();
  if (!p || !mgrCanManageProject(p)) return;
  var person = cvPersonById(personId);
  if (!mgrSetMemberLevel(p, personId, asAdmin)) { toast('保存失败，请重试', 'error'); return; }
  toast('已将「' + (person ? person.name : '') + '」设为' + (asAdmin ? '项目管理员' : '成员'), 'success');
}
function setJob(personId, role) {
  var p = project();
  if (!p || !mgrCanManageProject(p)) return;
  var roles = Object.assign({}, p.memberRoles);
  roles[personId] = role;
  if (!mgrSetProjectMembers(p, (p.members || []).slice(), roles)) { toast('保存失败，请重试', 'error'); return; }
  toast('岗位已更新', 'success');
}

/* ---------- 移除（二次确认，立即生效） ---------- */
function removalError(p, personId) {
  var person = cvPersonById(personId);
  if (!mgrCanManageProject(p)) return '只有项目负责人、项目管理员或系统管理员可以移除成员';
  if (isOwner(p, person)) return '请先更换项目负责人，再移除该成员';
  var open = mgrMemberOpenTasks(p, personId);
  if (open.length) return (person ? person.name : '该成员') + ' 还有 ' + open.length + ' 个未完成任务，请先完成或转交后再移除';
  if ((p.members || []).length <= 1) return '项目至少需要 1 名成员';
  return '';
}
function requestRemove(personId, trigger) {
  var p = project();
  if (!p) return;
  var err = removalError(p, personId);
  if (err) { toast(err, 'warning'); return; }
  var person = cvPersonById(personId);
  pendingRemoval = { personId: personId, trigger: trigger };
  $('#mgrMemberRemoveMessage').textContent = '确定将「' + (person ? person.name : '') + '」从「' + p.name + '」中移除吗？';
  var overlay = $('#mgrMemberRemoveOverlay');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  overlay.querySelector('[data-mgr-remove-cancel]').focus();
}
function closeRemove(restoreFocus) {
  var overlay = $('#mgrMemberRemoveOverlay');
  var trigger = pendingRemoval && pendingRemoval.trigger;
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  pendingRemoval = null;
  if (restoreFocus !== false && trigger && trigger.isConnected) trigger.focus();
}
function confirmRemove() {
  var p = project();
  if (!pendingRemoval || !p) { closeRemove(false); return; }
  var personId = pendingRemoval.personId;
  var err = removalError(p, personId);
  if (err) { closeRemove(false); toast(err, 'warning'); return; }
  var roles = Object.assign({}, p.memberRoles);
  delete roles[personId];
  if (!mgrSetProjectMembers(p, (p.members || []).filter(function (id) { return id !== personId; }), roles)) { closeRemove(); toast('移除失败，请重试', 'error'); return; }
  closeRemove(false);
  $('#mgrMembersOverlay [data-mgr-members-close]').focus();
  toast('已移除项目成员', 'success');
}

/* ---------- 智能体 ---------- */
function permsOf(p, id) { return Object.assign({ chat: true, read: true, write: false }, (p.expertPerms || {})[id]); }
function renderAgents() {
  var p = project();
  if (!p) return;
  var canEdit = mgrCanManageProject(p);
  var ids = (p.projectExperts || []).filter(mgrExpert);
  $('#mgrMpAgentCount').textContent = ids.length + '个';
  $('#mgrMpAgentAdd').hidden = !canEdit;
  var q = agentQuery.trim().toLocaleLowerCase();
  var shown = q ? ids.filter(function (id) { return mgrExpert(id).name.toLocaleLowerCase().includes(q); }) : ids;
  $('#mgrMpAgents').innerHTML = shown.length
    ? shown.map(function (id) {
      var e = mgrExpert(id);
      var open = agentOpen === id;
      var perms = permsOf(p, id);
      return '<div class="mgr-mp-agent' + (open ? ' is-open' : '') + '"><button type="button" class="mgr-mp-agent-head" data-mgr-mp-agent="' + mgrEsc(id) + '" aria-expanded="' + open + '">' +
        '<span class="mgr-mp-avatar mgr-mp-avatar--agent" aria-hidden="true">' + mgrEsc((e.name || '?')[0]) + '</span>' +
        '<span class="mgr-mp-name">' + mgrEsc(e.name) + '</span><small class="mgr-mp-agent-role">' + mgrEsc(e.role || '智能体') + '</small>' + CHEVRON + '</button>' +
        (open
          ? '<div class="mgr-mp-perms"><div class="mgr-mp-menu-title">功能权限</div>' + AGENT_PERMS.map(function (pm) {
            return '<label class="mgr-mp-perm"><input type="checkbox" data-mgr-mp-perm="' + pm[0] + '" data-mgr-mp-perm-agent="' + mgrEsc(id) + '"' + (perms[pm[0]] ? ' checked' : '') + (canEdit ? '' : ' disabled') + '>' +
              '<span><b>' + pm[1] + '</b><small>' + pm[2] + '</small></span></label>';
          }).join('') + (canEdit ? '<button type="button" class="mgr-mp-agent-remove" data-mgr-mp-agent-remove="' + mgrEsc(id) + '">移除智能体</button>' : '') + '</div>'
          : '') + '</div>';
    }).join('')
    : '<div class="mgr-mp-agents-empty"><b>' + (q ? '没有匹配的智能体' : '暂无已装配智能体') + '</b>' +
      (q ? '' : '<small>' + (canEdit ? '点右上「添加」把智能体装到项目里' : '项目管理员可以把智能体装到项目里') + '</small>') + '</div>';
}
function closePop() {
  var pop = $('#mgrMpAgentPop');
  pop.hidden = true;
  pop.innerHTML = '';
  $('#mgrMpAgentAdd').setAttribute('aria-expanded', 'false');
}
function renderPopOptions() {
  var p = project();
  if (!p) return;
  var picked = p.projectExperts || [];
  var q = popQuery.trim().toLocaleLowerCase();
  var list = mgrExpertList().filter(function (e) { return !picked.includes(e.id) && (!q || e.name.toLocaleLowerCase().includes(q)); }).slice(0, 40);
  $('#mgrMpAgentPop .mgr-mp-pop-options').innerHTML = list.length
    ? list.map(function (e) {
      return '<button type="button" class="mgr-mp-pop-option" role="option" data-mgr-mp-agent-pick="' + mgrEsc(e.id) + '">' + mgrEsc(e.name) + '<small>' + mgrEsc(e.role || '智能体') + '</small></button>';
    }).join('')
    : '<div class="mgr-mp-empty">没有可添加的智能体</div>';
}
function togglePop() {
  var p = project();
  var pop = $('#mgrMpAgentPop');
  if (!p || !mgrCanManageProject(p)) return;
  if (!pop.hidden) { closePop(); return; }
  popQuery = '';
  pop.innerHTML = '<input type="search" id="mgrMpPopSearch" placeholder="搜索智能体" aria-label="搜索可添加的智能体" autocomplete="off"><div class="mgr-mp-pop-options"></div>';
  pop.hidden = false;
  $('#mgrMpAgentAdd').setAttribute('aria-expanded', 'true');
  renderPopOptions();
  $('#mgrMpPopSearch').focus();
}
function saveAgents(p, ids, perms, msg) {
  if (!mgrSetProjectExperts(p, ids, perms)) { toast('保存失败，请重试', 'error'); return false; }
  if (msg) toast(msg, 'success');
  return true;
}

/* ---------- 打开 / 关闭 ---------- */
function render() { renderMembers(); renderAgents(); }
function openMembers(id) {
  var p = mgrProjectById(id);
  if (!p) return;
  projectId = id;
  tab = 'all';
  page = 1;
  memberQuery = '';
  agentQuery = '';
  agentOpen = null;
  $('#mgrMpMemberSearch').value = '';
  $('#mgrMpAgentSearch').value = '';
  closeMenu();
  closePop();
  render();
  var overlay = $('#mgrMembersOverlay');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  overlay.querySelector('[data-mgr-members-close]').focus();
}
function closeMembers() {
  closeMenu();
  closePop();
  var overlay = $('#mgrMembersOverlay');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  projectId = null;
  var back = $('#mgrProjDetail [data-mgr-members]');
  if (back) back.focus();
}

function trapTwoButtons(overlay, e, cancelSel, okSel) {
  if (e.key !== 'Tab') return;
  var cancel = overlay.querySelector(cancelSel), ok = overlay.querySelector(okSel);
  if (e.shiftKey && document.activeElement === cancel) { e.preventDefault(); ok.focus(); }
  else if (!e.shiftKey && document.activeElement === ok) { e.preventDefault(); cancel.focus(); }
}

export function initManagerMembers() {
  var overlay = $('#mgrMembersOverlay');
  overlay.addEventListener('click', function (e) {
    var t = e.target;
    if (t === overlay || t.closest('[data-mgr-members-close]')) { closeMembers(); return; }
    var p = project();
    var edit = t.closest('[data-mgr-mp-edit]');
    if (edit) {
      var pid = edit.getAttribute('data-mgr-mp-edit');
      if (menuFor === pid) { closeMenu(); renderMembers(); } else { openMenu(pid, edit); }
      return;
    }
    var lv = t.closest('[data-mgr-mp-level]');
    if (lv) { var who = menuFor; closeMenu(); setLevel(who, lv.getAttribute('data-mgr-mp-level') === 'admin'); return; }
    var jb = t.closest('[data-mgr-mp-job]');
    if (jb) { var who2 = menuFor; closeMenu(); setJob(who2, jb.getAttribute('data-mgr-mp-job')); return; }
    var rm = t.closest('[data-mgr-mp-remove]');
    if (rm) {
      var trigger = $('#mgrMpList [data-mgr-mp-edit="' + rm.getAttribute('data-mgr-mp-remove') + '"]');
      closeMenu();
      requestRemove(rm.getAttribute('data-mgr-mp-remove'), trigger);
      return;
    }
    if (menuFor && !t.closest('#mgrMpMenu')) { closeMenu(); renderMembers(); }
    var tb = t.closest('[data-mgr-mp-tab]');
    if (tb) { tab = tb.getAttribute('data-mgr-mp-tab'); page = 1; renderMembers(); return; }
    var pg = t.closest('[data-mgr-mp-page]');
    if (pg) { page += Number(pg.getAttribute('data-mgr-mp-page')); renderMembers(); return; }
    if (t.closest('[data-mgr-mp-invite]')) { openInvite(projectId, t.closest('[data-mgr-mp-invite]')); return; }
    if (t.closest('#mgrMpAgentAdd')) { togglePop(); return; }
    var pick = t.closest('[data-mgr-mp-agent-pick]');
    if (pick && p) {
      var aid = pick.getAttribute('data-mgr-mp-agent-pick');
      if (mgrExpert(aid) && !(p.projectExperts || []).includes(aid)) {
        closePop();
        agentOpen = aid;
        saveAgents(p, (p.projectExperts || []).concat(aid), p.expertPerms, '已添加智能体：' + mgrExpert(aid).name);
      }
      return;
    }
    if (!t.closest('.mgr-mp-add-wrap')) closePop();
    var head = t.closest('[data-mgr-mp-agent]');
    if (head) { var id = head.getAttribute('data-mgr-mp-agent'); agentOpen = agentOpen === id ? null : id; renderAgents(); return; }
    var rmAgent = t.closest('[data-mgr-mp-agent-remove]');
    if (rmAgent && p && mgrCanManageProject(p)) {
      var xid = rmAgent.getAttribute('data-mgr-mp-agent-remove');
      agentOpen = null;
      saveAgents(p, (p.projectExperts || []).filter(function (x) { return x !== xid; }), p.expertPerms, '已移除项目智能体');
    }
  });
  overlay.addEventListener('input', function (e) {
    if (e.target.id === 'mgrMpMemberSearch') { memberQuery = e.target.value; page = 1; closeMenu(); renderMembers(); }
    if (e.target.id === 'mgrMpAgentSearch') { agentQuery = e.target.value; renderAgents(); }
    if (e.target.id === 'mgrMpPopSearch') { popQuery = e.target.value; renderPopOptions(); }
  });
  overlay.addEventListener('change', function (e) {
    var cb = e.target.closest('[data-mgr-mp-perm]');
    var p = project();
    if (!cb || !p || !mgrCanManageProject(p)) return;
    var id = cb.getAttribute('data-mgr-mp-perm-agent');
    var perms = Object.assign({}, p.expertPerms);
    perms[id] = Object.assign(permsOf(p, id), { [cb.getAttribute('data-mgr-mp-perm')]: cb.checked });
    saveAgents(p, p.projectExperts || [], perms, '');
  });
  overlay.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    if (menuFor) { var who = menuFor; closeMenu(); renderMembers(); var b = $('#mgrMpList [data-mgr-mp-edit="' + who + '"]'); if (b) b.focus(); return; }
    if (!$('#mgrMpAgentPop').hidden) { closePop(); $('#mgrMpAgentAdd').focus(); return; }
    closeMembers();
  });
  /* 邀请、移除、智能体增删等改动后刷新（弹窗打开期间） */
  document.addEventListener('lingee:mgr-projects-changed', function () {
    if (projectId && project()) { closeMenu(); render(); } else if (projectId) { closeMembers(); }
  });
  var removeOverlay = $('#mgrMemberRemoveOverlay');
  removeOverlay.addEventListener('click', function (e) {
    if (e.target.closest('[data-mgr-remove-confirm]')) { confirmRemove(); return; }
    if (e.target === removeOverlay || e.target.closest('[data-mgr-remove-cancel]')) closeRemove();
  });
  removeOverlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeRemove(); return; }
    trapTwoButtons(removeOverlay, e, '[data-mgr-remove-cancel]', '[data-mgr-remove-confirm]');
  });
}

export { openMembers };
