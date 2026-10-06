import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { CV_MEMBERS, cvPersonById } from '../collab/data.js';
import { cvEnsureProjectPerson, cvSearchLingeePeople } from '../collab/people-search.js';
import {
  MEMBER_ROLES, mgrCanManageProject, mgrMemberOpenTasks, mgrMemberRole, mgrMemberRoleLabel, mgrProjectById,
  mgrProjectPeople, mgrSetProjectMembers,
} from './data.js';
import { mgrEsc } from './utils.js';
/* 管理 · 项目成员弹窗：搜索灵基人员多选加入、设置项目角色、移除成员。
   搜索与新增人员复用协作开发的人员数据（people-search / CV_MEMBERS），
   在管理板块加入的人员同样出现在开发板块的人员里。交互对齐协作开发的项目成员弹窗。 */

var projectId = null;
var draftMembers = [];          /* 弹窗内的成员 ID 列表（保存时一次写入） */
var draftRoles = {};
var newIds = new Set();          /* 本次新加入、尚未保存的成员 */
var picked = new Set();
var searchRows = new Map();
var picker = null;
var searchTimer = null;
var searchSeq = 0;
var pendingRemoval = null;

function project() { return projectId ? mgrProjectById(projectId) : null; }
function isOwner(p, person) { return !!person && person.name === p.owner; }

function rowHtml(p, person, index, editable) {
  var role = draftRoles[person.id] || '';
  var roleHtml = isOwner(p, person)
    ? '<span class="mgr-pm-detail-member-role">项目负责人</span>'
    : editable
      ? '<select class="mgr-pm-member-role-select" data-mgr-member-role="' + mgrEsc(person.id) + '" aria-label="' + mgrEsc(person.name) + '的项目角色">' +
        '<option value=""' + (!role ? ' selected' : '') + '>待设置</option>' +
        MEMBER_ROLES.map(function (r) { return '<option value="' + r[0] + '"' + (role === r[0] ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') +
        '</select>'
      : '<span class="mgr-pm-detail-member-role">' + mgrEsc(mgrMemberRoleLabel(role)) + '</span>';
  var remove = editable && !isOwner(p, person)
    ? '<button type="button" class="mgr-pm-member-remove-btn" data-mgr-member-remove="' + mgrEsc(person.id) + '" aria-label="移除成员 ' + mgrEsc(person.name) + '">移除</button>'
    : '<span></span>';
  return '<div class="mgr-pm-members-row"><span class="mgr-pm-members-info"><span class="mgr-pm-member-avatar mgr-pm-member-avatar--' + (index % 4) + '">' +
    mgrEsc(person.name[0] || '?') + '</span><b>' + mgrEsc(person.name) + '</b>' + (newIds.has(person.id) ? '<small>待保存</small>' : '') + '</span>' +
    '<span class="mgr-pm-members-dept">' + mgrEsc(person.dept || '未填写部门') + '</span>' + roleHtml + remove + '</div>';
}
function render() {
  var p = project();
  if (!p) return;
  var editable = mgrCanManageProject(p);
  var people = draftMembers.map(cvPersonById).filter(Boolean);
  $('#mgrMembersProjectName').textContent = p.name;
  $('#mgrMembersCount').textContent = '共 ' + people.length + ' 人';
  $('#mgrMemberSearchRow').classList.toggle('hidden', !editable);
  $('[data-mgr-members-confirm]').hidden = !editable;
  $('#mgrMembersList').innerHTML = people.length
    ? '<div class="mgr-pm-members-list">' + people.map(function (person, i) { return rowHtml(p, person, i, editable); }).join('') + '</div>'
    : '<div class="mgr-pm-members-empty">还没有项目成员，请搜索人员添加。</div>';
}

/* ---------- 人员搜索浮层 ---------- */
function syncAddButton() {
  var btn = $('#mgrMemberAdd');
  btn.disabled = !picked.size;
  btn.textContent = picked.size ? '添加 ' + picked.size + ' 人' : '添加';
  if (picker) picker.querySelector('[data-mgr-pm-picker-count]').textContent = '已选 ' + picked.size + ' 人';
}
function closePicker() {
  clearTimeout(searchTimer);
  searchSeq++;
  if (picker) { picker.remove(); picker = null; }
  picked.clear();
  searchRows.clear();
  var input = $('#mgrMemberSearch');
  input.value = '';
  input.setAttribute('aria-expanded', 'false');
  syncAddButton();
}
function openPicker() {
  var p = project();
  if (!p || !mgrCanManageProject(p) || picker) return;
  picker = document.createElement('div');
  picker.id = 'mgrMemberPicker';
  picker.className = 'mgr-pm-members-picker';
  picker.innerHTML = '<div class="mgr-pm-picker-source-note">搜索灵基人员并多选，与开发板块共用人员数据</div>' +
    '<div class="mgr-pm-members-candidates" role="group" aria-label="人员搜索结果"></div>' +
    '<div class="mgr-pm-members-picker-footer"><span data-mgr-pm-picker-count>已选 0 人</span></div>';
  $('#mgrMembersOverlay').appendChild(picker);
  var field = $('#mgrMembersOverlay .mgr-pm-member-search-field').getBoundingClientRect();
  var width = Math.min(field.width, window.innerWidth - 24);
  picker.style.width = width + 'px';
  picker.style.left = Math.max(12, Math.min(field.left, window.innerWidth - width - 12)) + 'px';
  var below = window.innerHeight - field.bottom - 12, above = field.top - 12;
  var up = below < 240 && above > below;
  picker.style.maxHeight = Math.max(120, Math.min(300, up ? above : below)) + 'px';
  picker.style.top = (up ? Math.max(12, field.top - picker.getBoundingClientRect().height - 6) : field.bottom + 6) + 'px';
  $('#mgrMemberSearch').setAttribute('aria-expanded', 'true');
  picker.addEventListener('change', function (e) {
    if (e.target.type !== 'checkbox') return;
    if (e.target.checked) picked.add(e.target.value); else picked.delete(e.target.value);
    syncAddButton();
  });
  search($('#mgrMemberSearch').value.trim());
}
function search(query) {
  if (!picker) return;
  var box = picker.querySelector('.mgr-pm-members-candidates');
  clearTimeout(searchTimer);
  var seq = ++searchSeq;
  if (!query) { box.innerHTML = '<div class="mgr-pm-picker-no-results">输入姓名、手机号或邮箱开始搜索</div>'; return; }
  box.innerHTML = '<div class="mgr-pm-picker-no-results">搜索中…</div>';
  searchTimer = setTimeout(async function () {
    try {
      var rows = await cvSearchLingeePeople(query);
      if (seq !== searchSeq || !picker) return;
      rows.forEach(function (r) { searchRows.set(r.id, r); });
      box.innerHTML = rows.length ? rows.map(function (r) {
        var local = CV_MEMBERS.find(function (m) { return m.id === r.id || m.userId === r.id; });
        var joined = !!local && draftMembers.includes(local.id);
        var disabled = joined || (local && local.status === 'disabled');
        return '<label><input type="checkbox" value="' + mgrEsc(r.id) + '"' + (picked.has(r.id) ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' +
          '<span class="mgr-pm-member-candidate-name">' + mgrEsc(r.name) + '</span><small>' + mgrEsc(r.dept || '未填写部门') + ' · ' +
          mgrEsc(r.phone || r.email || '无联系方式') + (joined ? ' · 已加入' : '') + '</small></label>';
      }).join('') : '<div class="mgr-pm-picker-no-results">没有匹配的人员</div>';
    } catch (err) {
      if (seq === searchSeq && picker) box.innerHTML = '<div class="mgr-pm-picker-no-results">搜索失败，请稍后重试</div>';
    }
  }, 250);
}
/* 选中的人员写入共享人员数据（不存在时新建），再加到弹窗草稿里 */
function addPicked() {
  var p = project();
  if (!p || !mgrCanManageProject(p)) { toast('只有项目负责人或系统管理员可以添加成员', 'warning'); return; }
  var people = Array.from(picked).map(function (id) { return cvEnsureProjectPerson(searchRows.get(id)); })
    .filter(function (person) { return person && person.status !== 'disabled' && !draftMembers.includes(person.id); });
  if (!people.length) { toast('所选人员无法添加', 'warning'); return; }
  people.forEach(function (person) {
    draftMembers.push(person.id);
    newIds.add(person.id);
    draftRoles[person.id] = mgrMemberRole(p, person);
  });
  closePicker();
  render();
  var first = $('#mgrMembersList [data-mgr-member-role="' + people[0].id + '"]');
  if (first) { first.focus(); first.scrollIntoView({ block: 'nearest' }); }
}

/* ---------- 打开 / 保存 ---------- */
function openMembers(id) {
  var p = mgrProjectById(id);
  if (!p) return;
  projectId = id;
  draftMembers = (p.members || []).slice();
  draftRoles = {};
  mgrProjectPeople(p).forEach(function (person) { draftRoles[person.id] = mgrMemberRole(p, person); });
  newIds.clear();
  render();
  var overlay = $('#mgrMembersOverlay');
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  (mgrCanManageProject(p) ? $('#mgrMemberSearch') : overlay.querySelector('[data-mgr-members-close]')).focus();
}
function closeMembers() {
  closePicker();
  var overlay = $('#mgrMembersOverlay');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  projectId = null;
  var back = $('#mgrProjDetail [data-mgr-members]');
  if (back) back.focus();
}
function saveMembers() {
  var p = project();
  if (!p) return;
  if (!mgrCanManageProject(p)) { toast('只有项目负责人或系统管理员可以维护成员', 'warning'); return; }
  var missing = draftMembers.map(cvPersonById).find(function (person) {
    return person && !isOwner(p, person) && !draftRoles[person.id];
  });
  if (missing) {
    toast('请为「' + missing.name + '」选择项目角色', 'warning');
    var field = $('#mgrMembersList [data-mgr-member-role="' + missing.id + '"]');
    if (field) field.focus();
    return;
  }
  var roles = {};
  draftMembers.forEach(function (id) { if (draftRoles[id]) roles[id] = draftRoles[id]; });
  var added = newIds.size;
  if (!mgrSetProjectMembers(p, draftMembers, roles)) { toast('保存失败，请重试', 'error'); return; }
  closeMembers();
  toast(added ? '已添加 ' + added + ' 名项目成员' : '项目成员已保存', 'success');
}

/* ---------- 移除 ---------- */
function removalError(p, personId) {
  var person = cvPersonById(personId);
  if (!mgrCanManageProject(p)) return '只有项目负责人或系统管理员可以移除成员';
  if (isOwner(p, person)) return '请先更换项目负责人，再移除该成员';
  var open = mgrMemberOpenTasks(p, personId);
  if (open.length) return (person ? person.name : '该成员') + ' 还有 ' + open.length + ' 个未完成任务，请先完成或转交后再移除';
  if (draftMembers.length <= 1) return '项目至少需要 1 名成员';
  return '';
}
function requestRemove(personId, trigger) {
  var p = project();
  if (!p) return;
  /* 本次刚加入、尚未保存的成员直接撤回，不需要确认 */
  if (newIds.has(personId)) {
    newIds.delete(personId);
    draftMembers = draftMembers.filter(function (id) { return id !== personId; });
    delete draftRoles[personId];
    render();
    return;
  }
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
/* 移除即时生效（与协作开发一致），其余草稿改动仍等「保存」 */
function confirmRemove() {
  var p = project();
  if (!pendingRemoval || !p) { closeRemove(false); return; }
  var personId = pendingRemoval.personId;
  var err = removalError(p, personId);
  if (err) { closeRemove(false); toast(err, 'warning'); return; }
  var savedRoles = Object.assign({}, p.memberRoles);
  delete savedRoles[personId];
  var savedMembers = (p.members || []).filter(function (id) { return id !== personId; });
  if (!mgrSetProjectMembers(p, savedMembers, savedRoles)) { closeRemove(); toast('移除失败，请重试', 'error'); return; }
  draftMembers = draftMembers.filter(function (id) { return id !== personId; });
  delete draftRoles[personId];
  closeRemove(false);
  render();
  $('#mgrMembersOverlay [data-mgr-members-close]').focus();
  toast('已移除项目成员', 'success');
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
    if (t.closest('[data-mgr-members-confirm]')) { saveMembers(); return; }
    if (t.closest('#mgrMemberAdd')) { addPicked(); return; }
    var rm = t.closest('[data-mgr-member-remove]');
    if (rm) { requestRemove(rm.getAttribute('data-mgr-member-remove'), rm); return; }
    if (t.closest('#mgrMemberSearch')) { openPicker(); return; }
    if (picker && !t.closest('#mgrMemberPicker') && !t.closest('.mgr-pm-member-search-row')) closePicker();
  });
  overlay.addEventListener('focusin', function (e) { if (e.target.id === 'mgrMemberSearch') openPicker(); });
  overlay.addEventListener('input', function (e) {
    if (e.target.id !== 'mgrMemberSearch') return;
    if (!picker) openPicker(); else search(e.target.value.trim());
  });
  overlay.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-mgr-member-role]');
    if (sel) draftRoles[sel.getAttribute('data-mgr-member-role')] = sel.value;
  });
  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (picker) closePicker(); else closeMembers();
    }
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
