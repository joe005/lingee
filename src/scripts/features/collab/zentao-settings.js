import '../../../styles/parts/collab/zentao-settings.css';
import { toast } from '../../core/toast.js';
import { requestDeleteConfirmation } from '../../core/delete-confirm.js';
import { basicEditable } from './basic-settings-data.js';

/* 当前空间的禅道任务来源，仅保存连接元数据；密钥不持久化，不发起网络请求。 */
const KEY = 'lingee-space-zentao-integrations-v1';
const contexts = new WeakMap();
const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function read() {
  const rows = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (!Array.isArray(rows)) throw new Error('invalid storage');
  return rows;
}
function write(rows) {
  try { localStorage.setItem(KEY, JSON.stringify(rows)); return true; }
  catch { toast('配置保存失败，请检查浏览器存储后重试', 'error'); return false; }
}
function input(name, title, value, type = 'text') {
  return '<label for="cvZentao-' + name + '">' + title + ' <b class="cv-required" aria-hidden="true">*</b><input id="cvZentao-' + name + '" name="' + name + '" type="' + type + '" value="' + esc(value) + '" maxlength="500" required' + (type === 'password' ? ' autocomplete="new-password"' : '') + '></label>';
}
export function renderZentaoSettings(host, project, workspace) {
  const key = JSON.stringify([project.id, workspace?.id || '']);
  const context = { project, workspace, key };
  contexts.set(host, context);
  const editable = basicEditable(project, workspace);
  let rows;
  try { rows = read().filter(row => row.scope === key); }
  catch { host.innerHTML = '<p class="cv-basic-error" role="alert">禅道配置读取失败，请检查浏览器存储后重新进入。</p>'; return; }
  host.innerHTML = '<section class="cv-zentao-settings"><p class="cv-basic-scope">' + esc(workspace?.name || project.name) + '</p>'
    + '<div class="cv-basic-heading"><div><h2>禅道</h2><p>配置禅道任务来源，关联需求、Bug 与执行任务。</p></div>'
    + (editable ? '<button type="button" class="ld-set-btn ld-set-btn--primary" data-zt-add>添加配置</button>' : '') + '</div>'
    + '<p class="cv-zentao-note">原型仅保存系统地址、项目标识和应用 ID；应用密钥不留存，真实鉴权与任务同步需服务端接入。</p>'
    + '<div data-zt-editor hidden></div><div class="cv-zentao-list">' + (rows.length ? rows.map(row =>
      '<article class="cv-zentao-row"><span class="cv-zentao-logo" aria-hidden="true">禅</span><div class="cv-zentao-info"><strong>禅道 · ' + esc(row.externalProject) + '</strong><span>' + esc(row.url) + '</span><small>应用 ID：' + esc(row.appId) + '</small></div><span class="cv-zentao-status">待接入</span>'
      + (editable ? '<div class="cv-zentao-actions"><button type="button" class="ld-set-btn" data-zt-edit="' + esc(row.id) + '">编辑</button><button type="button" class="ld-set-btn" data-zt-remove="' + esc(row.id) + '">移除</button></div>' : '') + '</article>'
    ).join('') : '<div class="cv-zentao-empty">暂无禅道配置' + (editable ? '，点击「添加配置」开始。' : '，请联系空间管理员配置。') + '</div>') + '</div></section>';
  const page = host.querySelector('.cv-zentao-settings');
  function permitted() {
    return contexts.get(host) === context && host.contains(page) && basicEditable(project, workspace);
  }
  function edit(id) {
    if (!permitted()) return;
    const row = id ? rows.find(item => item.id === id) : null;
    if (id && !row) return;
    const editor = page.querySelector('[data-zt-editor]');
    editor.hidden = false;
    editor.innerHTML = '<form class="cv-zentao-form"><h3>' + (row ? '编辑' : '添加') + '禅道配置</h3>'
      + input('url', '系统地址', row?.url, 'url') + input('externalProject', '外部项目标识', row?.externalProject)
      + input('appId', '第三方应用 ID', row?.appId) + input('secret', '第三方应用密钥', '', 'password')
      + '<p class="cv-zentao-form-note">每次保存需重新输入密钥。正式接入后可同步外部编号、标题、描述、类型、状态与负责人，按系统和外部编号去重。</p>'
      + '<p class="cv-basic-error" role="alert" hidden></p><div class="cv-zentao-form-actions"><button type="button" class="ld-set-btn" data-zt-cancel>取消</button><button type="submit" class="ld-set-btn ld-set-btn--primary">保存配置</button></div></form>';
    const form = editor.querySelector('form');
    const secret = form.elements.secret;
    editor.querySelector('[data-zt-cancel]').addEventListener('click', () => {
      secret.value = ''; editor.innerHTML = ''; editor.hidden = true;
      page.querySelector('[data-zt-add]')?.focus();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!permitted()) { toast('没有权限修改当前空间的集成配置', 'warning'); return; }
      const error = form.querySelector('[role="alert"]');
      function fail(message) { error.textContent = message; error.hidden = false; }
      let parsed;
      try { parsed = new URL(form.elements.url.value.trim()); } catch { fail('请填写有效的系统地址'); return; }
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
        fail('系统地址仅填写站点 URL，不包含账号、令牌、查询参数或锚点'); return;
      }
      const url = parsed.origin + parsed.pathname.replace(/\/$/, '');
      const externalProject = form.elements.externalProject.value.trim(), appId = form.elements.appId.value.trim();
      if (!externalProject || !appId || !secret.value.trim()) { fail('请完整填写外部项目标识、应用 ID 和密钥'); return; }
      let all;
      try { all = read(); } catch { fail('配置读取失败，请重新进入后重试'); return; }
      if (all.some(item => item.scope === key && item.url === url && item.externalProject === externalProject && item.id !== id)) {
        fail('该任务来源已配置，请编辑现有配置'); return;
      }
      if (id && !all.some(item => item.scope === key && item.id === id)) { fail('配置已被移除，请重新进入后重试'); return; }
      const entry = { id: id || crypto.randomUUID(), scope: key, url, externalProject, appId };
      const next = id ? all.map(item => item.scope === key && item.id === id ? entry : item) : all.concat(entry);
      if (!write(next)) return;
      secret.value = '';
      renderZentaoSettings(host, project, workspace);
      toast('禅道配置已保存，密钥未留存；真实接入需服务端支持', 'success');
    });
    form.elements.url.focus();
  }
  page.querySelector('[data-zt-add]')?.addEventListener('click', () => edit(''));
  page.querySelectorAll('[data-zt-edit]').forEach(button => button.addEventListener('click', () => edit(button.dataset.ztEdit)));
  page.querySelectorAll('[data-zt-remove]').forEach(button => button.addEventListener('click', async () => {
    if (!permitted()) return;
    const id = button.dataset.ztRemove;
    if (!await requestDeleteConfirmation('移除当前空间的禅道任务来源配置？不会删除禅道中的项目或任务。', { title: '移除禅道配置', confirmLabel: '移除' })) return;
    if (!permitted()) return;
    let all;
    try { all = read(); } catch { toast('配置读取失败，请重试', 'error'); return; }
    if (!write(all.filter(row => row.scope !== key || row.id !== id))) return;
    renderZentaoSettings(host, project, workspace);
    toast('已移除禅道配置', 'success');
  }));
}
