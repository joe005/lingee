import { $ } from '../../../core/dom.js';
import { toast } from '../../../core/toast.js';
import { ldJobOf } from './init-jobs.js';
import { ldEsc, ldHide, ldMine, ldProjectStatus, ldShow, ldVisible, ldTaskReposCheck, ldStatusTone, ldDetectHost, ldIsDetectingHost, ldRepoPermission } from './core.js';
import { buildTaskIsMultiRepo } from '../repository-config.js';
import { tkCurrentUserId, tkGetTasks, tkProjectById } from '../../tasks-v2/data.js';
import { ldOpenSpaceDirDialog } from './space-dir-dialog.js';
import { ldOpenAuth } from './auth-dialog.js';
import { ldGitInstallHtml } from './git-install.js';
import { ldBackgroundSpaceInit, ldCancelSpaceInit, ldNewSpaceForm, ldRunSpaceInit, ldSpaceFormChange, ldSpaceFormClick, ldSpaceFormHtml, ldSpaceFormTarget } from './space-form.js';
import { LD_ICONS } from './ui.js';

/* 本地开发 · 准备执行环境弹窗（#ldPrepOverlay）。
   本人手动开始任务、执行前检查发现空间未在本机初始化时打开；与初始化弹窗同一套表单，
   完成后继续执行当前任务。Git 不可用时在顶部给「安装 Git」（跳转对话安装）。 */
var form = null;
var onReady = null;
var taskTitle = '';
var returnFocus = null;
var multiTaskId = '';

export function ldOpenPrepDialog(projectId, task, readyCallback) {
  if (ldJobOf(projectId)) { toast('该空间正在后台初始化，完成后再开始执行', 'warning'); return; }
  returnFocus = document.activeElement;
  form = ldNewSpaceForm(projectId);
  onReady = readyCallback || null;
  taskTitle = task?.title || '';
  multiTaskId = task && buildTaskIsMultiRepo(task, tkProjectById(task.project)) ? task.id : '';
  $('#ldPrepSub').textContent = taskTitle;
  $('#ldPrepSub').title = taskTitle;
  render();
  ldShow('#ldPrepOverlay');
}
/* 多仓任务：本机目录一行（空间级，可初始化或修改），下面逐个列出本次选中的仓库及检查结果 */
function multiTask() { return multiTaskId ? tkGetTasks().find(function (row) { return row.id === multiTaskId; }) : null; }
function renderMulti(task) {
  var check = ldTaskReposCheck(task, tkCurrentUserId());
  var dir = check.dir;
  var rows = check.rows.map(function (row) {
    /* 仓库行只显示 Git 权限（账号、访问与推送），本机目录在上面一行按空间初始化 */
    var perm = ldRepoPermission(row.target, tkCurrentUserId()), st = perm.st, host = st.info?.host || '', detecting = !!host && ldIsDetectingHost(host);
    var key = perm.key;
    var label = detecting ? '检测中…' : perm.label;
    var action = perm.ready || st.invalid || st.ssh || detecting ? ''
      : ['login', 'expired'].includes(key) ? '<button type="button" class="ld-repo-check-action" data-ld-prep-auth="' + ldEsc(host) + '">登录</button>'
      : '<button type="button" class="ld-repo-check-action" data-ld-prep-detect="' + ldEsc(host) + '">检测</button>';
    return '<li class="ld-repo-check"><span class="ld-repo-check-name"><strong title="' + ldEsc(row.repo.repo) + '">' + ldEsc(row.repo.name) + '</strong>'
      + (row.repo.isDefault ? '<span class="ld-repo-check-tag">默认</span>' : '') + '</span>'
      + '<span class="ld-repo-check-state ' + (perm.ready ? 'is-ok' : key === 'unchecked' ? 'is-pending' : ldStatusTone(key)) + '" title="' + ldEsc(perm.reason || label) + '"><i aria-hidden="true"></i>' + ldEsc(label) + '</span>' + action + '</li>';
  }).join('');
  $('#ldPrepBody').innerHTML = (ldMine().gitMissing ? ldGitInstallHtml('prep', form.projectId) : '')
    + '<div class="ld-form-field"><span class="ld-form-label">本机目录</span><div class="ld-repo-checks"><div class="ld-repo-check"><span class="ld-repo-check-name"><strong title="' + ldEsc(dir?.path || '') + '">' + ldEsc(dir?.path || '未初始化') + '</strong></span>'
    + '<button type="button" class="ld-repo-check-action" data-ld-prep-spacedir>' + (dir ? '修改' : '初始化') + '</button></div></div></div>'
    + '<div class="ld-form-field"><span class="ld-form-label">代码仓库</span><ul class="ld-repo-checks">' + rows + '</ul></div>';
  var done = $('#ldPrepDone');
  done.disabled = !check.ready;
  done.textContent = '开始执行';
  [['#ldPrepCancel', false], ['#ldPrepDone', false], ['#ldPrepStop', true], ['#ldPrepBg', true]].forEach(function (row) { $(row[0]).hidden = row[1]; });
}
function render() {
  if (!form) return;
  var task = multiTask();
  if (task) { renderMulti(task); return; }
  var status = ldProjectStatus(form.projectId);
  var info = status.info;
  if (!info) return;
  var body = $('#ldPrepBody'), done = $('#ldPrepDone');
  body.setAttribute('aria-busy', String(!!form.pulling));
  var intro = '<div class="ld-info-banner">' + LD_ICONS.info + '<span>首次在本机使用此仓库执行任务，需要准备以下环境。完成后将继续当前任务。</span></div>';
  if (status.invalid) {
    body.innerHTML = intro + '<div class="ld-warn"><span><strong>代码仓库需要管理员完善：</strong>' + ldEsc(status.reason) + '</span></div>';
    done.disabled = true;
    done.textContent = '等待仓库配置';
    return;
  }
  var gitOk = !ldMine().gitMissing;
  var running = !!form.pulling;
  body.innerHTML = (running ? '' : intro + (gitOk ? '' : ldGitInstallHtml('prep', form.projectId))) + ldSpaceFormHtml(form);
  done.disabled = !gitOk || !status.authOk || !ldSpaceFormTarget(form);
  done.textContent = status.ready ? '开始执行' : '完成并执行';
  [['#ldPrepCancel', running], ['#ldPrepDone', running], ['#ldPrepStop', !running], ['#ldPrepBg', !running]].forEach(function (row) { $(row[0]).hidden = row[1]; });
}
function close() {
  ldCancelSpaceInit(form);
  form = null;
  onReady = null;
  multiTaskId = '';
  ldHide('#ldPrepOverlay');
  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
}
function submit() {
  var current = form, callback = onReady;
  var task = multiTask();
  if (task) {
    if (!ldTaskReposCheck(task, tkCurrentUserId()).ready) { render(); return; }
    close(); if (callback) callback(); return;
  }
  if (ldProjectStatus(current.projectId).ready) { close(); if (callback) callback(); return; }
  /* 后台初始化完成后同样继续执行任务 */
  ldRunSpaceInit(current, { render:function () { if (form === current) render(); }, done:function () { if (form === current) close(); if (callback) callback(); } });
}
function detach() {
  ldBackgroundSpaceInit(form);
  form = null;
  onReady = null;
  ldHide('#ldPrepOverlay');
  returnFocus = null;
}
function dismiss() { if (form?.pulling && form.pulling < 100) detach(); else close(); }

export function initPrepDialog() {
  var overlay = $('#ldPrepOverlay');
  if (!overlay) return;
  overlay.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element) || !form) return;
    if (t.closest('#ldPrepStop')) { ldCancelSpaceInit(form); render(); return; }
    if (t.closest('#ldPrepBg')) { detach(); return; }
    if (t === overlay || t.closest('[data-ld-prep-close]')) { dismiss(); return; }
    if (t.closest('#ldPrepDone')) { submit(); return; }
    var task = multiTask();
    if (task) {
      if (t.closest('[data-ld-prep-spacedir]')) { ldOpenSpaceDirDialog(task.project, task.workspaceId || '', render); return; }
      var auth = t.closest('[data-ld-prep-auth]');
      if (auth) { var authHost = auth.getAttribute('data-ld-prep-auth'); ldOpenAuth(authHost, function () { ldDetectHost(authHost); }); return; }
      var detect = t.closest('[data-ld-prep-detect]');
      if (detect) { ldDetectHost(detect.getAttribute('data-ld-prep-detect')); return; }
      return;
    }
    if (ldSpaceFormClick(form, t)) {
      render();
      if (t.closest('[data-ld-form-folder]')) overlay.querySelector('.ld-dir-picker summary')?.focus();
    }
  });
  overlay.addEventListener('change', function (e) { if (form && ldSpaceFormChange(form, e.target)) render(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !ldVisible('#ldPrepOverlay') || ldVisible('#ldAuthOverlay') || ldVisible('#ldSpaceDirOverlay')) return;
    e.stopPropagation();
    if (form?.menu) { form.menu = false; render(); return; }
    dismiss();
  }, true);
  /* 去对话安装 Git 时关闭弹窗，任务保持未开始；装好后重新开始任务即可 */
  document.addEventListener('lingee:git-install-chat', function () { if (ldVisible('#ldPrepOverlay')) close(); });
  /* Git 安装完成、登录成功后自动刷新步骤，保留已选目录 */
  document.addEventListener('lingee:local-dev-changed', function () { if (ldVisible('#ldPrepOverlay')) render(); });
}
