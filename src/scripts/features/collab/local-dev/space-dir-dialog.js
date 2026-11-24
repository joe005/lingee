import { $ } from '../../../core/dom.js';
import { toast } from '../../../core/toast.js';
import { tkProjectById } from '../../tasks-v2/data.js';
import { wsById } from '../../../core/workspace-tree.js';
import { LD_WORKSPACE_ROOT, ldBindSpaceDir, ldCheckSpaceDir, ldDefaultSpaceDir, ldEsc, ldHide, ldShow, ldSpaceDir, ldVisible } from './core.js';

/* 本地开发 · 空间本机目录弹窗（#ldSpaceDirOverlay）。
   一个空间一个本机目录，默认 <本机根目录>/<空间名>，可自定义；各仓库的缓存和任务工作树都放在这个目录下，
   仓库卡片上只做「检测」，不再逐个仓库选目录。空间还有进行中的任务时不能更改。 */
var form = null;
var returnFocus = null;

function spaceName(spaceId, wsId) {
  var project = tkProjectById(spaceId);
  var ws = project && wsId ? wsById(project, wsId) : null;
  return ws?.name || project?.name || '空间';
}
export function ldOpenSpaceDirDialog(spaceId, wsId, onDone) {
  var current = ldSpaceDir(spaceId, wsId);
  var name = spaceName(spaceId, wsId), defaultPath = ldDefaultSpaceDir(name);
  var custom = current && current.path !== defaultPath;
  returnFocus = document.activeElement;
  form = { spaceId:spaceId, wsId:wsId || '', name:name, defaultPath:defaultPath, current:current,
    mode:custom ? 'custom' : 'default', customPath:custom ? current.path : LD_WORKSPACE_ROOT + '/', error:'', onDone:onDone || null };
  $('#ldSpaceDirTitle').textContent = current ? '修改本机目录' : '初始化本机目录';
  $('#ldSpaceDirDone').textContent = current ? '保存' : '初始化';
  render();
  ldShow('#ldSpaceDirOverlay');
  $('#ldSpaceDirOverlay').querySelector('input:checked')?.focus();
}
function selectedPath() { return form.mode === 'custom' ? form.customPath.trim() : form.defaultPath; }
function card(value, title, desc) {
  return '<label class="ld-dir-card"><input type="radio" name="ldSpaceDirMode" data-ld-spacedir-mode value="' + value + '"' + (form.mode === value ? ' checked' : '') + '>'
    + '<span class="ld-dir-card-radio" aria-hidden="true"></span><span class="ld-dir-card-body"><strong>' + title + '</strong>'
    + (desc ? '<span class="ld-dir-card-desc" title="' + ldEsc(desc) + '">' + ldEsc(desc) + '</span>' : '') + '</span></label>';
}
function render() {
  if (!form) return;
  $('#ldSpaceDirBody').innerHTML = '<div class="ld-form-field"><div class="ld-dir-cards" role="radiogroup" aria-label="本机目录">'
    + card('default', '默认目录', form.defaultPath) + card('custom', '自定义目录', '') + '</div>'
    + (form.mode === 'custom' ? '<input type="text" class="ld-input ld-spacedir-input" id="ldSpaceDirPath" aria-label="自定义目录路径" value="' + ldEsc(form.customPath) + '" spellcheck="false" autocomplete="off">' : '')
    + '</div>' + (form.error ? '<p class="ld-form-error" role="alert">' + ldEsc(form.error) + '</p>' : '');
  var unchanged = form.current && form.current.path === selectedPath() && !form.current.legacy;
  $('#ldSpaceDirDone').disabled = !selectedPath() || selectedPath() === LD_WORKSPACE_ROOT + '/' || unchanged;
}
function close() {
  form = null;
  ldHide('#ldSpaceDirOverlay');
  if (returnFocus?.isConnected) returnFocus.focus();
  returnFocus = null;
}
function submit() {
  var path = selectedPath(), error = ldCheckSpaceDir(form.spaceId, form.wsId, path) || ldBindSpaceDir(form.spaceId, form.wsId, path, form.mode === 'custom' ? 'existing' : 'auto');
  if (error) { form.error = error; render(); return; }
  var done = form.onDone, changed = !!form.current;
  close();
  toast(changed ? '本机目录已更改' : '本机目录已初始化', 'success');
  if (done) done();
}

export function initSpaceDirDialog() {
  var overlay = $('#ldSpaceDirOverlay');
  if (!overlay) return;
  overlay.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element) || !form) return;
    if (t === overlay || t.closest('[data-ld-spacedir-close]')) { close(); return; }
    if (t.closest('#ldSpaceDirDone')) submit();
  });
  overlay.addEventListener('change', function (e) {
    if (!form || !e.target.matches('[data-ld-spacedir-mode]')) return;
    form.mode = e.target.value; form.error = '';
    render();
    if (form.mode === 'custom') $('#ldSpaceDirPath')?.focus();
  });
  overlay.addEventListener('input', function (e) {
    if (!form || e.target.id !== 'ldSpaceDirPath') return;
    form.customPath = e.target.value; form.error = '';
    var unchanged = form.current && form.current.path === selectedPath() && !form.current.legacy;
    $('#ldSpaceDirDone').disabled = !selectedPath() || selectedPath() === LD_WORKSPACE_ROOT + '/' || unchanged;
    overlay.querySelector('.ld-form-error')?.remove();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !ldVisible('#ldSpaceDirOverlay')) return;
    e.stopPropagation();
    close();
  }, true);
}
