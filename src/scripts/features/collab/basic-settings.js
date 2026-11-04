import { renderRecruitmentSettings } from './recruitment-settings.js';
import { ldBindingFor, ldEnvironmentId, ldDefaultPath, ldCheckDir, ldBindDir, ldPickDir } from './local-dev/core.js';
import { buildRepoOwn, buildRepoList, buildRepoIdentity } from './repository-config.js';
import { initSelectDropdowns } from '../../core/select-dropdown.js';
import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { requestDeleteConfirmation } from '../../core/delete-confirm.js';
import { wsById, wsPathNames } from '../../core/workspace-tree.js';
import { CV_MEMBERS } from './data.js';
import { getSpaceScope } from '../tasks-v2/page/space-filter.js';
import { personName, spaceMemberIds, wsMemberIds, wsOwnerId, wsProjectById } from '../manager/workspaces.js';
import { basicAddMember, basicRepoConfig, basicEditable, basicRemoveMember, basicSaveGeneral, basicSaveRepo } from './basic-settings-data.js';
/* 当前空间 / 工作区的基本设置，顶部切换器决定范围；只渲染当前分类。 */
var currentTab = 'general';
var memberPage = 1;
var memberPageSize = 10;
var memberScope = '';
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
function scope() { var s = getSpaceScope(), p = wsProjectById(s.project); return { p:p, ws:p ? wsById(p, s.ws) : null }; }
function field(id, label, value, disabled, multiline, max) {
  return '<div class="cv-basic-field"><label for="' + id + '">' + label + '</label>' + (multiline
    ? '<textarea id="' + id + '" rows="3" maxlength="' + max + '"' + (disabled ? ' disabled' : '') + '>' + esc(value) + '</textarea>'
    : '<input id="' + id + '" value="' + esc(value) + '" maxlength="' + max + '"' + (disabled ? ' disabled' : '') + '>') + '</div>';
}
function head(title, subtitle, save) {
  return '<div class="cv-basic-heading"><div><h2>' + title + '</h2>' + (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') + '</div>' + (save ? '<button type="submit" class="ld-set-btn ld-set-btn--primary">保存</button>' : '') + '</div>';
}
function general(p, ws) {
  var item = ws || p, editable = basicEditable(p, ws);
  return '<form data-cv-basic-form="general">' + head('通用', editable ? '维护当前' + (ws ? '工作区' : '空间') + '的基本信息。' : '当前设置只读，请联系负责人或管理员修改。', editable) +
    '<div class="cv-basic-card">' + field('cvBasicName', '名称', item.name, !editable, false, ws ? 30 : 60) +
    field('cvBasicDesc', '描述', item.desc || '', !editable, true, 200) +
    (ws ? '' : field('cvBasicInstruction', '上下文', p.instruction || '', !editable, true, 10000)) + '</div>' +
    (!ws ? '<p class="cv-basic-note">上下文作为空间指令，为智能体提供背景信息。</p>' : '') + '<p class="cv-basic-error" role="alert" hidden></p></form>';
}
var repoDraft = null;
var repoEditing = -1;
var repoEditBackup = null;
function repo(p, ws) {
  const id = JSON.stringify([p.id, ws?.id || '']);
  const own = buildRepoOwn(p, ws?.id || '');
  const effective = buildRepoList(p,ws?.id || '');
  if (!repoDraft || repoDraft.id !== id) { repoDraft = {id, mode:own.mode, repositories:structuredClone(effective.repositories), defaultRepo:effective.defaultRepo}; repoEditing = -1; repoEditBackup = null; }
  const editable = basicEditable(p, ws), inherited = false;
  const list = repoDraft.repositories;
  const defaultKey = repoDraft.defaultRepo;
  const count = list.filter(item => !item.key.startsWith('draft:')).length;
  const toolbar = count ? '<div class="cv-repo-toolbar"><span class="cv-basic-note">' + count + ' 个仓库</span></div>' : '';
  const cards = list.map((item,index) => item.key.startsWith('draft:') ? '' : repoCard(p, ws, item, index, editable, inherited, list, defaultKey)).join('');
  const footer = editable ? '' : '<p class="cv-basic-note">当前设置只读，请联系负责人或管理员修改。</p>';
  return '<form data-cv-basic-form="repo">' + head('仓库','',false)
    + toolbar + '<div class="cv-repo-cards">' + cards + (editable ? '<button type="button" class="cv-repo-add-card" data-cv-repo-add>＋ 新增仓库</button>' : '') + '</div>' + footer
    + '<p class="cv-basic-error" role="alert" hidden></p></form>' + repoEditor(p,ws,editable,list,defaultKey);
}
function repoEditor(p,ws,editable,list,defaultKey) {
  const item = list[repoEditing];
  if (!editable || !item) return '';
  return '<div class="cv-repo-dialog-overlay"><section class="cv-repo-dialog" role="dialog" aria-modal="true" aria-labelledby="cvRepoDialogTitle"><header><div><h3 id="cvRepoDialogTitle">'+(item.key.startsWith('draft:') ? '新增仓库' : '编辑仓库')+'</h3><p class="cv-repo-dialog-subtitle">'+esc(ws?.name || p.name)+'</p></div><button type="button" class="cv-repo-icon-btn" data-cv-repo-cancel aria-label="关闭">×</button></header><form data-cv-basic-form="repo">'+repoCard(p,ws,item,repoEditing,editable,false,list,defaultKey,true)+'<p class="cv-basic-error" role="alert" hidden></p></form></section></div>';
}
/* 只展示当前工作区各仓库的个人本机目录，复用初始化与目录校验流程。 */
function repoDirectory(p, ws, item) {
  const config = {repo:item.repo,baseBranch:item.baseBranch,name:item.name,spaceId:p.id,workspaceId:ws?.id || ''};
  const binding = ldBindingFor(ldEnvironmentId(config));
  const draft = item.localDirectory ||= {mode:binding?.mode === 'existing' ? 'existing' : 'auto',path:binding?.mode === 'existing' ? binding.path : ''};
  const defaultPath = ldDefaultPath({...config,_repoResolved:true});
  const option = (value,title,description,extra='') => '<label class="ld-dir-card cv-repo-dir-option"><input type="radio" name="cvRepoDirectoryMode" data-cv-dir-mode="'+value+'" value="'+value+'"'+(draft.mode === value ? ' checked' : '')+'><span class="ld-dir-card-radio" aria-hidden="true"></span><span class="ld-dir-card-body"><strong>'+title+'</strong><span class="ld-dir-card-desc" title="'+esc(description)+'">'+esc(description)+'</span>'+extra+'</span></label>';
  const customInput = draft.mode === 'existing' ? '<div class="cv-repo-custom-directory"><input data-cv-dir-path aria-label="自定义工作目录" value="'+esc(draft.path)+'" placeholder="请选择或输入本机工作目录"><button type="button" class="ld-space-btn" data-cv-dir-pick>选择文件夹</button></div>' : '';
  return '<div class="cv-repo-local-directory"><span class="cv-repo-directory-label">本机目录</span><div class="ld-dir-cards cv-repo-directory-modes" role="radiogroup" aria-label="本机目录方式">'
    + option('auto','默认目录',defaultPath || '填写仓库地址后自动生成默认目录')
    + option('existing','自定义目录',draft.path || '选择本机根目录内的文件夹',customInput)+'</div></div>';

}
function repoLocalTarget(p,ws,item) {
  const config = {repo:item.repo,baseBranch:item.baseBranch,name:item.name,spaceId:p.id,workspaceId:ws?.id || ''};
  return {target:ldEnvironmentId(config),path:item.localDirectory?.mode === 'existing' ? item.localDirectory.path.trim() : ldDefaultPath({...config,_repoResolved:true}),mode:item.localDirectory?.mode || 'auto'};
}
/* 仓库卡片：各仓库独立展示并就地编辑；本机目录在卡片内按仓库绑定，个人目录与共享仓库配置分开保存 */
function repoCard(p, ws, item, index, editable, inherited, list, defaultKey, editor = false) {
  const actions = editable && !editor ? '<div class="cv-repo-card-actions">'
    + '<button type="button" data-cv-repo-edit="'+index+'">编辑</button>'
    + (defaultKey !== item.key && list.length > 1 ? '<button type="button" data-cv-repo-default="'+index+'">设为主仓库</button>' : '')
    + '<button type="button" class="is-danger" data-cv-repo-remove="'+index+'">删除</button></div>' : '';
  const headRow = '<div class="cv-repo-card-head"><div class="cv-repo-title"><strong title="'+esc(item.name)+'">'+esc(item.name || '仓库')+'</strong>'
    + (defaultKey === item.key || list.length === 1 ? '<span class="cv-repo-default">主仓库</span>' : '')+'</div>'+actions+'</div>';
  if (!editor) {
    const config = {repo:item.repo,baseBranch:item.baseBranch,name:item.name,spaceId:p.id,workspaceId:ws?.id || ''};
    const binding = ldBindingFor(ldEnvironmentId(config));
    const path = binding?.mode === 'existing' ? binding.path : '默认目录';
    return '<article class="cv-repo-card">'+headRow+'<div class="cv-repo-summary"><div class="cv-repo-address-summary"><p title="'+esc(item.repo)+'">'+esc(item.repo || '未填写地址')+'</p><span class="cv-repo-branch-summary" title="分支：'+esc(item.baseBranch || 'main')+'">'+esc(item.baseBranch || 'main')+'</span></div><p class="cv-repo-directory-summary" title="'+esc(path)+'">目录 · '+esc(path)+'</p></div></article>';
  }
  const disabled = !editable || inherited ? ' disabled' : '';
  const branch = item.baseBranch || 'main', custom = !['main','master','develop'].includes(branch);
  const body = '<div class="cv-repo-card-body cv-repo-address-branch">'
    + '<label class="cv-repo-url-label" for="cvRepoUrl">代码仓库</label><div class="cv-basic-field"><input id="cvRepoUrl" inputmode="url" aria-label="Git 地址" data-cv-repo-field="repo" data-cv-repo-index="' + index + '" value="' + esc(item.repo) + '" maxlength="2000" placeholder="https://git.example.com/group/repo"' + disabled + '></div>'
    + '<div class="cv-basic-field shared-select-host"><select data-cv-repo-field="baseBranch" data-cv-repo-index="' + index + '" aria-label="基准分支"' + disabled + '>' + ['main','master','develop','__custom'].map(value => '<option value="' + value + '"' + ((custom ? '__custom' : branch) === value ? ' selected' : '') + '>' + (value === '__custom' ? '其他' : value) + '</option>').join('') + '</select>'
    + '<input data-cv-repo-field="branchCustom" data-cv-repo-index="' + index + '" value="' + esc(custom ? branch : '') + '" maxlength="200" placeholder="输入自定义分支名称" aria-label="自定义基准分支"' + (!custom || disabled ? ' hidden' : '') + '></div>'
    + '</div>';
  return '<article class="cv-repo-card">' + headRow + body + repoDirectory(p,ws,item) + '<div class="cv-repo-editor-actions"><button type="button" class="ld-space-btn" data-cv-repo-cancel>取消</button><button type="submit" class="ld-set-btn ld-set-btn--primary">保存</button></div></article>';
}
function memberPool(p, ws) {
  var ids = ws ? wsMemberIds(p, ws) : spaceMemberIds(p);
  return CV_MEMBERS.filter(function (m) { return m.status !== 'disabled' && !ids.includes(m.id) && (!ws || spaceMemberIds(p).includes(m.id)); });
}
function candidateHtml(p, ws, query) {
  var q = query.trim().toLocaleLowerCase();
  var matches = memberPool(p, ws).filter(function (m) {
    return [m.name, m.email, m.phone, m.employeeId, m.id].some(function (v) { return String(v || '').toLocaleLowerCase().includes(q); });
  });
  return matches.length ? matches.map(function (m) { return '<button type="button" role="option" aria-selected="false" data-cv-member-pick="' + esc(m.id) + '"><span class="cv-basic-avatar">' + esc(m.name.slice(0, 1)) + '</span><span><strong>' + esc(m.name) + '</strong><small>' + esc(m.email || m.dept || '') + '</small></span></button>'; }).join('') : '<p class="cv-basic-note">没有匹配的可添加成员</p>';
}
function memberPager(total, pages) {
  return '<nav class="cv-member-pagination" aria-label="成员分页"><span>共 ' + total + ' 位成员</span><label>每页 <select id="cvMemberPageSize" aria-label="每页成员数">' + [10, 20, 50].map(function (size) { return '<option value="' + size + '"' + (size === memberPageSize ? ' selected' : '') + '>' + size + '</option>'; }).join('') + '</select> 条</label><div><button type="button" class="ld-space-btn" data-cv-member-page="' + (memberPage - 1) + '"' + (memberPage <= 1 ? ' disabled' : '') + '>上一页</button><span class="cv-member-page-status" tabindex="-1" aria-live="polite">' + memberPage + ' / ' + pages + '</span><button type="button" class="ld-space-btn" data-cv-member-page="' + (memberPage + 1) + '"' + (memberPage >= pages ? ' disabled' : '') + '>下一页</button></div></nav>';
}
function members(p, ws) {
  var editable = basicEditable(p, ws), ids = ws ? wsMemberIds(p, ws) : spaceMemberIds(p);
  var pages = Math.max(1, Math.ceil(ids.length / memberPageSize));
  memberPage = Math.min(Math.max(1, memberPage), pages);
  var pageIds = ids.slice((memberPage - 1) * memberPageSize, memberPage * memberPageSize);
  var owner = ws ? wsOwnerId(p, ws) : (CV_MEMBERS.find(function (m) { return m.name === p.owner; }) || {}).id;
  return '<div class="cv-basic-heading"><div><h2>成员</h2></div>' + (editable ? '<button type="button" class="ld-set-btn ld-set-btn--primary" data-cv-member-open aria-expanded="false" aria-controls="cvBasicMemberForm">添加成员</button>' : '') + '</div>' +
    (editable ? '<form id="cvBasicMemberForm" class="cv-basic-add" data-cv-basic-form="add" hidden><div class="cv-member-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><input type="search" id="cvBasicMemberSearch" placeholder="搜索姓名、邮箱、手机号或工号" aria-label="搜索要添加的成员" aria-controls="cvBasicMemberResults" aria-expanded="false" autocomplete="off"><input type="hidden" id="cvBasicMember"><div class="cv-member-results" id="cvBasicMemberResults" role="listbox" aria-label="可添加成员" hidden></div></div><select id="cvBasicMemberRole" aria-label="成员角色"><option value="member">成员</option>' + (!ws ? '<option value="admin">管理员</option>' : '') + '</select><button type="submit" class="ld-set-btn ld-set-btn--primary" id="cvBasicMemberAdd" disabled>添加</button><p class="cv-basic-error" role="alert" hidden></p></form>' : '<p class="cv-basic-note">当前成员设置只读，请联系负责人或管理员修改。</p>') +
    '<div class="cv-basic-card cv-member-list-scroll" role="region" aria-label="成员列表" tabindex="0"><ul class="cv-basic-members">' + pageIds.map(function (id) {
      var m = CV_MEMBERS.find(function (person) { return person.id === id; }) || { name:personName(id) };
      var role = id === owner ? '负责人' : !ws && (p.adminIds || []).includes(id) ? '管理员' : '成员';
      return '<li><span class="cv-basic-avatar">' + esc(m.name.slice(0, 1)) + '</span><div class="cv-basic-member-name"><div class="cv-member-identity"><strong>' + esc(m.name) + '</strong><span>' + esc(m.email || '') + '</span></div><div class="cv-member-tags">' + (m.dept ? '<span>' + esc(m.dept) + '</span>' : '') + '<span>' + role + '</span></div></div>' + (editable && id !== owner ? '<details class="cv-member-more"><summary aria-label="' + esc(m.name) + '的更多操作">···</summary><button type="button" class="mgr-ws-text-btn" data-cv-basic-remove="' + esc(id) + '">移出成员</button></details>' : '') + '</li>';
    }).join('') + '</ul>' + (!ids.length ? '<p class="cv-basic-note">暂无成员</p>' : '') + '</div>' + memberPager(ids.length, pages);
}
export function renderBasicSettings(host, tab) {
  currentTab = tab;
  delete host.dataset.recruitmentPage;
  if (tab === 'agents') { host.classList.remove('is-member-list'); renderRecruitmentSettings(host); return; }
  host.classList.toggle('is-member-list', tab === 'members');
  var s = scope();
  var nextScope = s.p ? s.p.id + ':' + (s.ws ? s.ws.id : '') : '';
  if (nextScope !== memberScope) { memberScope = nextScope; memberPage = 1; }
  if (!s.p) { host.innerHTML = '<div class="cv-wsadmin-empty">请先在页面顶部选择一个空间，再查看设置。</div>'; return; }
  var path = s.p.name + (s.ws ? ' / ' + wsPathNames(s.p, s.ws.id).join(' / ') : '');
  host.innerHTML = '<p class="cv-basic-scope" title="' + esc(path) + '">' + esc(path) + '</p>' + (tab === 'repo' ? repo(s.p, s.ws) : tab === 'members' ? members(s.p, s.ws) : general(s.p, s.ws));
  if (tab === 'repo') {
    host.querySelectorAll('[data-cv-repo-field="baseBranch"]').forEach(function (select) { if (select instanceof HTMLSelectElement) initSelectDropdowns([select]); select.nextElementSibling?.classList.add('shared-select-trigger'); });
  }
}
export function initBasicSettings(host) {
  host.addEventListener('keydown', function (event) {
    const dialog = event.target.closest('.cv-repo-dialog');
    if (!dialog) return;
    if (document.querySelector('.ld-overlay[aria-hidden="false"]')) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dialog.querySelector('[data-cv-repo-cancel]').click(); return; }
    if (event.key !== 'Tab') return;
    const controls = Array.from(dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(el => el.getClientRects().length);
    const first = controls[0], last = controls[controls.length-1];
    if (event.shiftKey && event.target === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && event.target === last) { event.preventDefault(); first?.focus(); }
  });
  function syncDirectory(input,item) {
    const context = scope(), local = input.closest('.cv-repo-card')?.querySelector('.cv-repo-local-directory');
    if (context.p && local) local.outerHTML = repoDirectory(context.p,context.ws,item);
  }

  /* 仓库卡片字段就地更新草稿：输入静默写入，地址确认后重算 key/名称并重渲染 */
  document.addEventListener('lingee:local-dev-changed', function () { if (currentTab === 'repo' && host.isConnected) renderBasicSettings(host, 'repo'); });
  host.addEventListener('input', function (e) {
    if (e.target.matches('[data-cv-dir-path]') && repoDraft?.repositories[repoEditing]?.localDirectory) { repoDraft.repositories[repoEditing].localDirectory.path = e.target.value; return; }
    var input = e.target.closest('[data-cv-repo-field]');
    if (!input || !repoDraft) return;
    var item = repoDraft.repositories[Number(input.dataset.cvRepoIndex)];
    if (!item) return;
    var field = input.dataset.cvRepoField;
    if (field === 'repo') item.repo = input.value.trim();
    if (field === 'branchCustom') item.baseBranch = input.value.trim();
    syncDirectory(input,item);
  });
  host.addEventListener('change', function (e) {
    if (e.target.matches('[data-cv-dir-mode]')) {
      const context = scope(), item = repoDraft?.repositories[repoEditing];
      if (!item || !context.p || !basicEditable(context.p,context.ws)) return;
      const mode = e.target.dataset.cvDirMode;
      item.localDirectory.mode = mode;
      e.target.closest('.cv-repo-local-directory').outerHTML = repoDirectory(context.p,context.ws,item);
      host.querySelector('[data-cv-dir-mode="'+mode+'"]').focus();
      return;
    }
    var input = e.target.closest('[data-cv-repo-field]');
    if (!input || !repoDraft) return;
    var item = repoDraft.repositories[Number(input.dataset.cvRepoIndex)];
    if (!item) return;
    var field = input.dataset.cvRepoField;
    if (field === 'repo') {
      item.repo = input.value.trim();
      const previousKey = item.key;
      item.key = buildRepoIdentity(item.repo) || 'draft:' + input.dataset.cvRepoIndex;
      if (repoDraft.defaultRepo === previousKey) repoDraft.defaultRepo = item.key;
      item.name = item.repo.replace(/\/+$/, '').split('/').pop().replace(/\.git$/, '') || item.name || '';
      syncDirectory(input,item); return;
    }
    if (field === 'baseBranch') {
      var customInput = input.closest('.cv-basic-field').querySelector('[data-cv-repo-field="branchCustom"]');
      item.baseBranch = input.value === '__custom' ? '' : input.value;
      if (customInput) { customInput.hidden = input.value !== '__custom'; if (!customInput.hidden) { customInput.value = ''; customInput.focus(); } }
      syncDirectory(input,item);
      return;
    }
  });
  host.addEventListener('change', function (e) {
    if (e.target.id === 'cvMemberPageSize') {
      var size = Number(e.target.value); if (![10, 20, 50].includes(size)) return;
      memberPageSize = size; memberPage = 1; renderBasicSettings(host, 'members');
      $('#cvMemberPageSize').focus({ preventScroll: true }); return;
    }
  });
  function searchMembers() {
    var input = $('#cvBasicMemberSearch'), results = $('#cvBasicMemberResults'), s = scope();
    if (!input || !s.p) return;
    results.innerHTML = candidateHtml(s.p, s.ws, input.value);
    results.hidden = false; input.setAttribute('aria-expanded', 'true');
  }
  host.addEventListener('input', function (e) {
    if (e.target.id !== 'cvBasicMemberSearch') return;
    $('#cvBasicMember').value = ''; $('#cvBasicMemberAdd').disabled = true;
    searchMembers();
  });
  host.addEventListener('focusin', function (e) { if (e.target.id === 'cvBasicMemberSearch' && !$('#cvBasicMember').value) searchMembers(); });
  host.addEventListener('focusout', function (e) {
    if (e.target.closest('.cv-member-search') && !e.target.closest('.cv-member-search').contains(e.relatedTarget)) {
      $('#cvBasicMemberResults').hidden = true; $('#cvBasicMemberSearch').setAttribute('aria-expanded', 'false');
    }
  });
  host.addEventListener('keydown', function (e) {
    if (!e.target.closest('.cv-member-search')) return;
    var results = $('#cvBasicMemberResults'), options = Array.from(results.querySelectorAll('[data-cv-member-pick]'));
    if (e.key === 'Escape') { e.preventDefault(); $('#cvBasicMemberSearch').focus(); results.hidden = true; $('#cvBasicMemberSearch').setAttribute('aria-expanded', 'false'); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (results.hidden) searchMembers();
      options = Array.from(results.querySelectorAll('[data-cv-member-pick]'));
      var at = options.indexOf(document.activeElement);
      if (options.length) options[(at + (e.key === 'ArrowDown' ? 1 : options.length - 1) + options.length) % options.length].focus();
    }
    if (e.key === 'Enter' && e.target.id === 'cvBasicMemberSearch') e.preventDefault();
  });
  host.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-cv-basic-form]');
    if (!form) return;
    e.preventDefault();
    var s = scope(); if (!s.p) return;
    var kind = form.dataset.cvBasicForm;
    const edited = kind === 'repo' ? repoDraft?.repositories[repoEditing] : null;
    const directory = edited?.localDirectory ? repoLocalTarget(s.p,s.ws,edited) : null;
    if (directory) {
      const directoryError = !directory.path ? '请选择自定义工作目录' : ldCheckDir(directory.target,directory.path);
      if (directoryError) { const note = form.querySelector('.cv-basic-error'); note.textContent = directoryError; note.hidden = false; return; }
    }
    var error = kind === 'general' ? basicSaveGeneral(s.p, s.ws, { name:$('#cvBasicName').value, desc:$('#cvBasicDesc').value, instruction:$('#cvBasicInstruction')?.value || '' })
      : kind === 'repo' ? basicSaveRepo(s.p, s.ws, repoDraft) : basicAddMember(s.p, s.ws, $('#cvBasicMember').value, $('#cvBasicMemberRole').value);
    if (error) { var note = form.querySelector('.cv-basic-error'); note.textContent = error; note.hidden = false; return; }
    if (directory) {
      const binding = ldBindingFor(directory.target);
      if ((!binding || binding.path !== directory.path || binding.mode !== directory.mode) && !ldBindDir(directory.target,directory.path,directory.mode)) {
        const note = host.querySelector('.cv-repo-dialog .cv-basic-error');
        if (note) { note.textContent = '仓库已保存，本机目录保存失败，请重试'; note.hidden = false; }
        return;
      }
    }
    if (kind === 'add') memberPage = Math.max(1, Math.ceil((s.ws ? wsMemberIds(s.p, s.ws) : spaceMemberIds(s.p)).length / memberPageSize));
    if (kind === 'repo') repoDraft = null;
    renderBasicSettings(host, currentTab);
    toast(kind === 'add' ? '已添加成员' : '设置已保存', 'success');
  });
  host.addEventListener('click', async function (e) {

    const directoryAction = e.target.closest('[data-cv-dir-pick]');
    if (directoryAction) {
      const context = scope(), item = repoDraft?.repositories[repoEditing];
      if (!item || !context.p || !basicEditable(context.p,context.ws)) return;
      item.localDirectory.path = ldPickDir({repo:item.repo,baseBranch:item.baseBranch,spaceId:context.p.id,workspaceId:context.ws?.id || '',_repoResolved:true});
      const local = directoryAction.closest('.cv-repo-local-directory');
      local.outerHTML = repoDirectory(context.p,context.ws,item);
      host.querySelector('[data-cv-dir-path]')?.focus();
      return;
    }
    const action = e.target.closest('[data-cv-repo-edit],[data-cv-repo-cancel],[data-cv-repo-tokens],[data-cv-repo-add],[data-cv-repo-remove],[data-cv-repo-default]');
    if (action) {
      const context = scope(); if (!context.p || !repoDraft) return;
      if (action.hasAttribute('data-cv-repo-tokens')) { document.dispatchEvent(new CustomEvent('lingee:settings-category', { detail: { tab: 'git' } })); return; }
      if (!basicEditable(context.p, context.ws)) return;
      if (action.hasAttribute('data-cv-repo-cancel')) { if (repoEditBackup) repoDraft = repoEditBackup; repoEditBackup = null; repoEditing = -1; }
      if (action.hasAttribute('data-cv-repo-edit')) { repoEditBackup = structuredClone(repoDraft); repoEditing = Number(action.dataset.cvRepoEdit); }
      if (action.hasAttribute('data-cv-repo-add')) {
        repoEditBackup = structuredClone(repoDraft);
        const item = {key:'draft:' + Date.now(), name:'', repo:'', baseBranch:'main', desc:'', apps:[]};
        repoDraft.repositories.push(item); repoEditing = repoDraft.repositories.length - 1; repoDraft.defaultRepo ||= item.key;
      }
      if (action.hasAttribute('data-cv-repo-default')) {
        const key = repoDraft.repositories[Number(action.dataset.cvRepoDefault)]?.key;
        const saved = buildRepoList(context.p,context.ws?.id || '');
        if (!saved.repositories.some(row => row.key === key)) { toast('请先保存新增仓库，再设为主仓库','warning'); return; }
        const error = basicSaveRepo(context.p,context.ws,{repositories:saved.repositories,defaultRepo:key});
        if (error) { toast(error,'warning'); return; }
        repoDraft = null; renderBasicSettings(host,'repo'); toast('已设为主仓库','success'); return;
      }
      if (action.hasAttribute('data-cv-repo-remove')) {
        if (!await requestDeleteConfirmation('删除当前工作区的仓库关联？远端仓库、本机目录和已启动任务保持不变。', {title:'删除仓库',confirmLabel:'删除'})) return;
        const index = Number(action.dataset.cvRepoRemove);
        const item = repoDraft.repositories[index];
        const saved = buildRepoList(context.p,context.ws?.id || '');
        const repositories = saved.repositories.filter(row => row.key !== item.key);
        const defaultRepo = repositories.some(row => row.key === saved.defaultRepo) ? saved.defaultRepo : repositories[0]?.key || '';
        const error = basicSaveRepo(context.p,context.ws,{repositories,defaultRepo});
        if (error) { toast(error,'warning'); return; }
        repoEditing = -1; repoEditBackup = null; repoDraft = null;
        renderBasicSettings(host,'repo'); toast('已删除仓库关联','success'); return;
      }
      renderBasicSettings(host, 'repo');
      if (action.hasAttribute('data-cv-repo-edit') || action.hasAttribute('data-cv-repo-add')) host.querySelector('.cv-repo-dialog input')?.focus();
      return;
    }
    var pageButton = e.target.closest('[data-cv-member-page]');
    if (pageButton) {
      if (pageButton.disabled) return;
      memberPage = Number(pageButton.dataset.cvMemberPage); renderBasicSettings(host, 'members');
      host.querySelector('.cv-member-page-status')?.focus({ preventScroll: true });
      host.querySelector('.cv-basic-heading')?.scrollIntoView({ block: 'nearest' }); return;
    }
    var open = e.target.closest('[data-cv-member-open]');
    if (open) {
      var form = $('#cvBasicMemberForm'); form.hidden = !form.hidden;
      open.setAttribute('aria-expanded', String(!form.hidden));
      if (!form.hidden) $('#cvBasicMemberSearch').focus();
      return;
    }
    var pick = e.target.closest('[data-cv-member-pick]');
    if (pick) {
      var selected = CV_MEMBERS.find(function (m) { return m.id === pick.dataset.cvMemberPick; });
      if (!selected) return;
      $('#cvBasicMember').value = selected.id;
      $('#cvBasicMemberSearch').value = selected.name;
      $('#cvBasicMemberResults').hidden = true;
      $('#cvBasicMemberSearch').setAttribute('aria-expanded', 'false');
      $('#cvBasicMemberAdd').disabled = false;
      $('#cvBasicMemberRole').focus(); return;
    }
    var button = e.target.closest('[data-cv-basic-remove]'); if (!button) return;
    var s = scope(), id = button.dataset.cvBasicRemove; if (!s.p) return;
    if (!await requestDeleteConfirmation('将「' + personName(id) + '」移出「' + (s.ws || s.p).name + '」？未完成任务需先转交。', { title:'移出成员', confirmLabel:'移出' })) return;
    var error = basicRemoveMember(s.p, s.ws, id);
    if (error) { toast(error, 'warning'); return; }
    renderBasicSettings(host, currentTab); toast('已移出成员', 'success');
  });
}
