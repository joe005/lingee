import { $ } from '../../../core/dom.js';
import { toast } from '../../../core/toast.js';
import { tkProjectById } from '../../tasks-v2/data.js';
import { ldJobOf } from './init-jobs.js';
import { ldEsc, ldHide, ldMine, ldProjectStatus, ldShow, ldVisible } from './core.js';
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

export function ldOpenPrepDialog(projectId, task, readyCallback) {
  if (ldJobOf(projectId)) { toast('该空间正在后台初始化，完成后再开始执行', 'warning'); return; }
  returnFocus = document.activeElement;
  form = ldNewSpaceForm(projectId);
  onReady = readyCallback || null;
  taskTitle = task?.title || '';
  $('#ldPrepSub').textContent = taskTitle;
  $('#ldPrepSub').title = taskTitle;
  render();
  ldShow('#ldPrepOverlay');
}
function render() {
  if (!form) return;
  var status = ldProjectStatus(form.projectId);
  var info = status.info;
  if (!info) return;
  var body = $('#ldPrepBody'), done = $('#ldPrepDone');
  body.setAttribute('aria-busy', String(!!form.pulling));
  var intro = '<div class="ld-info-banner">' + LD_ICONS.info + '<span>首次在本机执行此空间的任务，需要准备以下环境。完成后将继续当前任务。</span></div>';
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
  ldHide('#ldPrepOverlay');
  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
}
function submit() {
  var current = form, callback = onReady;
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
    if (ldSpaceFormClick(form, t)) render();
  });
  overlay.addEventListener('change', function (e) { if (form && ldSpaceFormChange(form, e.target)) render(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !ldVisible('#ldPrepOverlay') || ldVisible('#ldAuthOverlay')) return;
    e.stopPropagation();
    if (form?.menu) { form.menu = false; render(); return; }
    dismiss();
  }, true);
  /* 去对话安装 Git 时关闭弹窗，任务保持未开始；装好后重新开始任务即可 */
  document.addEventListener('lingee:git-install-chat', function () { if (ldVisible('#ldPrepOverlay')) close(); });
  /* Git 安装完成、登录成功后自动刷新步骤，保留已选目录 */
  document.addEventListener('lingee:local-dev-changed', function () { if (ldVisible('#ldPrepOverlay')) render(); });
}
