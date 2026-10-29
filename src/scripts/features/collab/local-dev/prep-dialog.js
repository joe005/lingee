import { $ } from '../../../core/dom.js';
import { tkProjectById } from '../../tasks-v2/data.js';
import { ldEsc, ldHide, ldMine, ldProjectStatus, ldShow, ldVisible } from './core.js';
import { ldGitInstallHtml } from './git-install.js';
import { ldCancelSpaceInit, ldNewSpaceForm, ldRunSpaceInit, ldSpaceFormChange, ldSpaceFormClick, ldSpaceFormHtml, ldSpaceFormTarget } from './space-form.js';
import { LD_ICONS } from './ui.js';

/* 本地开发 · 准备执行环境弹窗（#ldPrepOverlay）。
   本人手动开始任务、执行前检查发现空间未在本机初始化时打开；与初始化弹窗同一套表单，
   完成后继续执行当前任务。Git 不可用时在顶部给「安装 Git」（跳转对话安装）。 */
var form = null;
var onReady = null;
var taskTitle = '';
var returnFocus = null;

export function ldOpenPrepDialog(projectId, task, readyCallback) {
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
  body.innerHTML = intro + (gitOk ? '' : ldGitInstallHtml('prep', form.projectId)) + ldSpaceFormHtml(form);
  done.disabled = !gitOk || !status.authOk || !!form.pulling || !ldSpaceFormTarget(form);
  done.textContent = form.pulling ? '正在初始化…' : status.ready ? '开始执行' : '完成并执行';
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
  var callback = onReady;
  if (ldProjectStatus(form.projectId).ready) { close(); if (callback) callback(); return; }
  ldRunSpaceInit(form, { render:render, done:function () { close(); if (callback) callback(); } });
}

export function initPrepDialog() {
  var overlay = $('#ldPrepOverlay');
  if (!overlay) return;
  overlay.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element) || !form) return;
    if (t === overlay || t.closest('[data-ld-prep-close]')) { close(); return; }
    if (t.closest('#ldPrepDone')) { submit(); return; }
    if (ldSpaceFormClick(form, t)) render();
  });
  overlay.addEventListener('change', function (e) { if (form && ldSpaceFormChange(form, e.target)) render(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !ldVisible('#ldPrepOverlay') || ldVisible('#ldAuthOverlay')) return;
    e.stopPropagation();
    if (form?.menu) { form.menu = false; render(); return; }
    close();
  }, true);
  /* 去对话安装 Git 时关闭弹窗，任务保持未开始；装好后重新开始任务即可 */
  document.addEventListener('lingee:git-install-chat', function () { if (ldVisible('#ldPrepOverlay')) close(); });
  /* Git 安装完成、登录成功后自动刷新步骤，保留已选目录 */
  document.addEventListener('lingee:local-dev-changed', function () { if (ldVisible('#ldPrepOverlay')) render(); });
}
