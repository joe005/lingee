import { $ } from '../../../core/dom.js';
import { toast } from '../../../core/toast.js';
import { tkProjectById } from '../../tasks-v2/data.js';
import { ldEsc, ldHide, ldMine, ldProjectStatus, ldRepoInfo, ldShow, ldVisible } from './core.js';
import { ldCancelSpaceInit, ldNewSpaceForm, ldRunSpaceInit, ldSpaceFormChange, ldSpaceFormClick, ldSpaceFormHtml, ldSpaceFormTarget } from './space-form.js';

/* 本地开发 · 初始化空间 / 空间设置弹窗（#ldSpaceOverlay）。
   未初始化时标题「初始化空间」、主按钮「初始化」；已初始化时标题「空间设置」、主按钮「保存」，目录改了才能保存。 */
var form = null;
var settings = false;
var onReady = null;
var returnFocus = null;

export function ldOpenSpaceDialog(projectId, readyCallback) {
  var project = tkProjectById(projectId);
  if (!ldRepoInfo(project)) { toast('该空间未配置代码仓库', 'warning'); return; }
  returnFocus = document.activeElement;
  form = ldNewSpaceForm(projectId);
  settings = !!ldMine().bindings[projectId];
  onReady = readyCallback || null;
  $('#ldSpaceTitle').textContent = settings ? '空间设置' : '初始化空间';
  $('#ldSpaceSub').textContent = project.name;
  $('#ldSpaceSub').title = project.name;
  render();
  ldShow('#ldSpaceOverlay');
}
function render() {
  if (!form) return;
  var status = ldProjectStatus(form.projectId);
  if (!status.info) return;
  var body = $('#ldSpaceBody');
  body.setAttribute('aria-busy', String(!!form.pulling));
  body.innerHTML = (settings && !status.ready && !form.pulling ? '<div class="ld-warn"><span>' + ldEsc(status.reason) + '</span></div>' : '') + ldSpaceFormHtml(form);
  var done = $('#ldSpaceDone'), target = ldSpaceFormTarget(form);
  done.disabled = !status.authOk || !!form.pulling || !target || (settings && target === status.binding?.path);
  done.textContent = form.pulling ? '正在初始化…' : settings ? '保存' : '初始化';
}
function close() {
  ldCancelSpaceInit(form);
  form = null;
  onReady = null;
  ldHide('#ldSpaceOverlay');
  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
}
function submit() {
  var callback = onReady;
  ldRunSpaceInit(form, { render:render, done:function () { close(); if (callback) callback(); } });
}

export function initSpaceDialog() {
  var overlay = $('#ldSpaceOverlay');
  if (!overlay) return;
  overlay.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element) || !form) return;
    if (t === overlay || t.closest('[data-ld-space-close]')) { close(); return; }
    if (t.closest('#ldSpaceDone')) { submit(); return; }
    if (ldSpaceFormClick(form, t)) render();
  });
  overlay.addEventListener('change', function (e) { if (form && ldSpaceFormChange(form, e.target)) render(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !ldVisible('#ldSpaceOverlay') || ldVisible('#ldAuthOverlay')) return;
    e.stopPropagation();
    if (form?.menu) { form.menu = false; render(); return; }
    close();
  }, true);
  /* 登录、检测等改变状态后按最新数据重绘 */
  document.addEventListener('lingee:local-dev-changed', function () { if (ldVisible('#ldSpaceOverlay')) render(); });
}
