import { renderZentaoSettings } from './zentao-settings.js';
import { renderRecruitmentSettings } from './recruitment-settings.js';
import { ldEnvironmentId, ldProjectStatus, ldRepoPermission, ldMine, ldSaveMine, ldBindingHasRunningTasks, ldSpaceDir, ldSpaceDirChangeError, ldDetectHost, ldIsDetectingHost } from './local-dev/core.js';
import { ldOpenSpaceDirDialog } from './local-dev/space-dir-dialog.js';
import { ldOpenAuth } from './local-dev/auth-dialog.js';
import { buildRepoOwn, buildRepoList, buildRepoIdentity } from './repository-config.js';
import { initSelectDropdowns } from '../../core/select-dropdown.js';
import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { requestDeleteConfirmation } from '../../core/delete-confirm.js';
import { wsById } from '../../core/workspace-tree.js';
import { CV_MEMBERS } from './data.js';
import githubIcon from '../../../assets/git-platform/github.svg';
import giteeIcon from '../../../assets/git-platform/gitee.svg';
import gitlabIcon from '../../../assets/git-platform/gitlab.svg';
import genericIcon from '../../../assets/git-platform/generic.svg';
import { getSettingsScope, setSettingsScope } from './space-switch.js';
import { mgrCurrentPersonId } from '../manager/data.js';
import { personName, spaceMemberIds, wsAdminIds, wsDelete, wsDeleteBlockReason, wsLeave, wsLeaveBlockReason, wsMemberIds, wsOwnerId, wsProjectById, wsScopePath } from '../manager/workspaces.js';
import { isWsHost } from './data.js';
import { basicAddMember, basicCanViewManagement, basicRepoConfig, basicEditable, basicRemoveMember, basicSaveGeneral, basicSaveRepo, basicSetMemberRole } from './basic-settings-data.js';
/* 当前空间 / 工作区的基本设置，顶部切换器决定范围；只渲染当前分类。 */
var currentTab = 'general';
var memberPage = 1;
var memberPageSize = 10;
var memberScope = '';
var memberFilter = '';
var memberPicked = [];   /* 添加成员：搜索结果中已勾选、待添加的人员（可多选，换搜索词保留） */   /* 成员列表搜索词：按姓名、邮箱、手机号、工号或部门筛选当前成员 */
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
/* '' 为默认工作区（空间根） */
function scope() { var s = getSettingsScope(), p = wsProjectById(s.project); return { p:p, ws:p ? wsById(p, s.ws) : null }; }
export function canViewWorkspaceSettings() { var s = scope(); return basicCanViewManagement(s.p, s.ws); }
var REQUIRED = ' <b class="cv-required" aria-hidden="true">*</b>';
function field(id, label, value, disabled, rows, max, hint = '') {
  var hintId = id + 'Hint';
  var attributes = ' id="' + id + '" maxlength="' + max + '"' + (disabled ? ' disabled' : '') + (hint ? ' aria-describedby="' + hintId + '"' : '');
  return '<div class="cv-basic-field"><div><label for="' + id + '">' + label + '</label>'
    + (hint ? '<p class="cv-general-hint" id="' + hintId + '">' + esc(hint) + '</p>' : '') + '</div>' + (rows
      ? '<textarea' + attributes + ' rows="' + rows + '">' + esc(value) + '</textarea>'
      : '<input' + attributes + ' value="' + esc(value) + '">') + '</div>';
}
function head(title, subtitle, save) {
  return '<div class="cv-basic-heading"><div><h2>' + title + '</h2>' + (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') + '</div>'
    + (save ? '<button type="submit" class="ld-set-btn ld-set-btn--primary cv-settings-action">保存</button>' : '') + '</div>';
}
function general(p, ws) {
  var item = ws || p, editable = basicEditable(p, ws);
  return '<div class="cv-general-settings"><form data-cv-basic-form="general">' +
    head('通用', editable ? '名称和描述保存后同步到 Manage 空间。' : '当前设置只读，请联系负责人或管理员修改。', editable) +
    '<div class="cv-general-fields">' + field('cvBasicName', '名称' + REQUIRED, item.name, !editable, 0, ws ? 30 : 60) +
    field('cvBasicDesc', '描述' + REQUIRED, item.desc || '', !editable, 2, 200) +
    (ws ? '' : field('cvBasicInstruction', '上下文', p.instruction || '', !editable, 3, 10000, '为空间内的智能体提供背景信息。')) +
    '</div><p class="cv-basic-error" role="alert" hidden></p>' +
    '</form>' + (ws ? leaveSection(p, ws) : '') + '</div>';
}
/* 高级选项：负责人只显示删除，普通成员只显示离开；不满足条件时按钮禁用并说明原因 */
function dangerRow(title, text, reason, attr, label) {
  return '<div class="cv-basic-danger"><div><strong>' + title + '</strong><p>' + text + '</p>' + (reason ? '<p class="cv-basic-danger-reason">' + esc(reason) + '</p>' : '') + '</div>' +
    '<button type="button" class="cv-basic-danger-btn" ' + attr + (reason ? ' disabled' : '') + '>' + label + '</button></div>';
}
function leaveSection(p, ws) {
  var me = mgrCurrentPersonId(), rows = '';
  if (!me) return '';
  if (wsOwnerId(p, ws) === me) rows = dangerRow('删除空间', '删除后无法恢复。空间内没有任务时才能删除。', wsDeleteBlockReason(p, ws.id), 'data-cv-ws-delete', '删除空间');
  else if ((ws.memberIds || []).indexOf(me) >= 0) rows = dangerRow('离开空间', '将自己从该空间移除，离开后不能再在此空间创建和处理任务。', wsLeaveBlockReason(p, ws, me), 'data-cv-ws-leave', '离开空间');
  return rows ? '<section class="cv-basic-advanced" aria-labelledby="cvBasicAdvancedTitle"><h3 id="cvBasicAdvancedTitle">高级选项</h3>' + rows + '</section>' : '';
}
const PLUS_ICON = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>';
const MORE_ICON = '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><circle cx="5" cy="10" r="1.4"/><circle cx="10" cy="10" r="1.4"/><circle cx="15" cy="10" r="1.4"/></svg>';
function closeRepoMenus(root, except) {
  root.querySelectorAll('.cv-repo-more').forEach(function (box) {
    if (box === except) return;
    box.querySelector('.cv-repo-menu').hidden = true;
    box.querySelector('[data-cv-repo-more]').setAttribute('aria-expanded', 'false');
    box.closest('.cv-repo-card')?.classList.remove('is-menu-open');
  });
}
var repoDraft = null;
var repoEditing = -1;
var repoEditBackup = null;
function repo(p, ws) {
  pruneSettingsBindings();
  const id = JSON.stringify([p.id, ws?.id || '']);
  const effective = buildRepoList(p,ws?.id || '');
  const editable = basicEditable(p, ws);
  if (editable && (!repoDraft || repoDraft.id !== id)) {
    const own = buildRepoOwn(p, ws?.id || '');
    repoDraft = {id, mode:own.mode, repositories:structuredClone(effective.repositories), defaultRepo:effective.defaultRepo};
    repoEditing = -1;
    repoEditBackup = null;
  }
  const count = effective.repositories.length;
  const cards = effective.repositories.map((item, index) => repoCard(p, ws, item, index, editable, effective.repositories, effective.defaultRepo)).join('');
  const footer = !count && !editable ? '<div class="cv-wsadmin-empty">当前空间尚未配置仓库，请联系负责人或管理员添加。</div>' : '';
  /* 新增仓库为网格末尾的新增卡片（2026-11-24 起，替代页头「＋ 新增仓库」按钮）；没有管理权限时不显示 */
  const add = editable ? '<button type="button" class="cv-repo-add-card" data-cv-repo-add>' + PLUS_ICON + '<span>新增仓库</span></button>' : '';
  return '<form data-cv-basic-form="repo"><div class="cv-basic-heading"><div><h2>仓库</h2></div></div>'
    + (count ? spaceDirectoryStatus(p, ws) : '') + (count || add ? '<div class="cv-repo-cards">' + cards + add + '</div>' : '') + footer
    + '<p class="cv-basic-error" role="alert" hidden></p></form>'
    + (editable ? repoEditor(p, ws, editable, repoDraft.repositories, repoDraft.defaultRepo) : '');
}
function repoEditor(p,ws,editable,list,defaultKey) {
  const item = list[repoEditing];
  if (!editable || !item) return '';
  return '<div class="cv-repo-dialog-overlay"><section class="cv-repo-dialog" role="dialog" aria-modal="true" aria-labelledby="cvRepoDialogTitle"><header><div><h3 id="cvRepoDialogTitle">'+(item.key.startsWith('draft:') ? '新增仓库' : '编辑仓库')+'</h3><p class="cv-repo-dialog-subtitle">'+esc(ws?.name || p.name)+'</p></div><button type="button" class="cv-repo-icon-btn" data-cv-repo-cancel aria-label="关闭">×</button></header><form data-cv-basic-form="repo">'+repoCard(p,ws,item,repoEditing,editable,list,defaultKey,true)+'<p class="cv-basic-error" role="alert" hidden></p></form></section></div>';
}
/* 一次性清理：修复前在仓库弹窗点「保存」会直接写入目录绑定，导致没初始化就显示「已就绪」。
   清掉这类绑定：没有初始化完成记录、不是演示预置仓库、也没有运行中任务使用；真正初始化过的绑定都有 initializedAt */
function pruneSettingsBindings() {
  const mine = ldMine();
  if (!mine || mine.settingsBindingsPruned) return;
  const demoRepos = new Set(Object.values(mine.demoReadyRepos || {}));
  Object.keys(mine.repoBindings || {}).forEach(key => {
    const binding = mine.repoBindings[key];
    if (binding.initializedAt || demoRepos.has(binding.repo) || ldBindingHasRunningTasks(key)) return;
    delete mine.repoBindings[key];
    Object.keys(mine.scopeBindings || {}).forEach(scope => { if (mine.scopeBindings[scope] === key) delete mine.scopeBindings[scope]; });
  });
  mine.settingsBindingsPruned = true;
  ldSaveMine(mine);
}
function repoNameOf(repo) { return String(repo || '').replace(/\/+$/, '').split('/').pop().replace(/\.git$/, ''); }
/* 仓库卡片：各仓库独立展示并就地编辑；本机目录在卡片内按仓库绑定，个人目录与共享仓库配置分开保存 */
var REPO_ICONS = {
  repo:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 9-9 9-9-9zM7.5 7.5l9 9M16.5 7.5l-9 9"/></svg>',
  link:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  branch:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5" r="2.5"/><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M6 7.5v9M18 10.5c0 4-6 3-11.2 6.5"/></svg>',
  check:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4 10-11"/></svg>',
  key:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/></svg>',
  folder:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
};
/* 一个空间一个本机目录：目录在仓库列表上方统一初始化或修改；仓库卡片显示 Git 权限并提供「检测」（含选择 Git 账号）。 */
function spaceDirectoryStatus(p, ws) {
  const dir = ldSpaceDir(p.id, ws?.id || '');
  const busy = dir ? ldSpaceDirChangeError(p.id, ws?.id || '') : '';
  return '<div class="cv-repo-local cv-repo-spacedir ' + (dir ? 'is-ready' : 'is-pending') + '"><span class="cv-repo-local-label">' + REPO_ICONS.folder + '本机目录</span>'
    + '<span class="cv-repo-local-state"><i aria-hidden="true"></i>' + (dir ? '已就绪' : '未初始化') + '</span>'
    + '<span class="cv-repo-local-path" title="' + esc(dir?.path || '') + '">' + esc(dir?.path || '') + '</span>'
    + '<button type="button" class="cv-repo-init-btn" data-cv-space-dir' + (busy ? ' disabled title="' + esc(busy) + '"' : '') + '>' + (dir ? '修改' : '初始化') + '</button></div>';
}
function repoTarget(p, ws, item) { return ldEnvironmentId({repo:item.repo,baseBranch:item.baseBranch,name:item.name,spaceId:p.id,workspaceId:ws?.id || ''}); }
/* Git 权限只看账号、访问与推送权限，和本机目录无关（本机目录在上方按空间初始化），没有「未初始化」 */
function repoPermission(p, ws, item) { return ldRepoPermission(repoTarget(p, ws, item)); }
function repoDirectoryStatus(p, ws, item) {
  const perm = repoPermission(p, ws, item), st = perm.st;
  const host = st.info?.host || '';
  const detecting = !!host && ldIsDetectingHost(host);
  const tone = perm.key === 'unchecked' ? 'is-pending' : perm.ready ? 'is-ready' : 'is-warn';
  const stateText = detecting ? '检测中…' : perm.label;
  const reason = perm.reason || stateText;
  const disabled = st.invalid || st.ssh || detecting;
  return '<div class="cv-repo-local ' + tone + '"><span class="cv-repo-local-label">' + REPO_ICONS.key + 'Git 权限</span>'
    + '<span class="cv-repo-local-state" title="' + esc(reason) + '"><i aria-hidden="true"></i>' + esc(stateText) + '</span>'
    + '<button type="button" class="cv-repo-init-btn" data-cv-repo-check="' + esc(item.key) + '"'
    + (disabled ? ' disabled title="' + esc(st.reason || '') + '"' : '') + '>检测</button></div>';
}
function repoCard(p, ws, item, index, editable, list, defaultKey, editor = false) {
  /* 卡片操作收进右上角「···」菜单，与 Git 账号卡片一致 */
  const actions = editable && !editor ? '<div class="cv-repo-more"><button type="button" class="cv-repo-more-btn" data-cv-repo-more aria-haspopup="menu" aria-expanded="false" aria-label="'+esc(item.name || '仓库')+' 的更多操作">' + MORE_ICON + '</button>'
    + '<div class="cv-repo-menu" role="menu" hidden><button type="button" role="menuitem" data-cv-repo-edit="'+index+'">编辑</button>'
    + (defaultKey !== item.key && list.length > 1 ? '<button type="button" role="menuitem" data-cv-repo-default="'+index+'">设为主仓库</button>' : '')
    + '<button type="button" role="menuitem" class="is-danger" data-cv-repo-remove="'+index+'">删除</button></div></div>' : '';
  const headRow = '<div class="cv-repo-card-head"><div class="cv-repo-title"><strong title="'+esc(item.name)+'">'+esc(item.name || '仓库')+'</strong>'
    + (defaultKey === item.key || list.length === 1 ? '<span class="cv-repo-default">主仓库</span>' : '')+'</div>'+actions+'</div>';
  if (!editor) {
    const primary = defaultKey === item.key || list.length === 1;
    const title = '<div class="cv-repo-title">' + repoPlatformIcon(item.repo) + '<div class="cv-repo-title-copy"><div class="cv-repo-title-line"><strong title="'+esc(item.name)+'">'+esc(item.name || '仓库')+'</strong>'
      + (primary ? '<span class="cv-repo-default">主仓库</span>' : '') + '</div>'
      + repoProvider(item.repo) + '</div></div>';
    const apps = (item.apps || []).map(app => '<span class="cv-repo-chip">' + esc(app) + '</span>').join('');
    return '<article class="cv-repo-card cv-repo-card--rich' + (primary ? ' is-primary' : '') + '"><div class="cv-repo-card-head">' + title + actions + '</div>'
      + '<p class="cv-repo-desc" title="'+esc(item.desc || '')+'">' + esc(item.desc || '暂无描述') + '</p>'
      + '<dl class="cv-repo-info">'
      + '<div><dt>仓库地址</dt><dd title="'+esc(item.repo)+'">' + esc(item.repo || '未填写') + '</dd></div>'
      + '<div><dt>基准分支</dt><dd>' + esc(item.baseBranch || 'main') + '</dd></div>'
      + '</dl>' + (apps ? '<div class="cv-repo-apps"><span class="cv-repo-fact-label">关联应用</span>' + apps + '</div>' : '')
      + repoDirectoryStatus(p, ws, item) + '</article>';
  }
  const disabled = !editable ? ' disabled' : '';
  const branch = item.baseBranch || 'main', custom = !['main','master','develop'].includes(branch);
  const body = '<div class="cv-repo-card-body cv-repo-address-branch">'
    + '<label class="cv-repo-url-label" for="cvRepoUrl">代码仓库 <b class="cv-required" aria-hidden="true">*</b></label><div class="cv-basic-field"><input id="cvRepoUrl" inputmode="url" aria-label="Git 地址" aria-required="true" data-cv-repo-field="repo" data-cv-repo-index="' + index + '" value="' + esc(item.repo) + '" maxlength="2000" placeholder="https://git.example.com/group/repo"' + disabled + '></div>'
    + '<div class="cv-basic-field shared-select-host"><select data-cv-repo-field="baseBranch" data-cv-repo-index="' + index + '" aria-label="基准分支"' + disabled + '>' + ['main','master','develop','__custom'].map(value => '<option value="' + value + '"' + ((custom ? '__custom' : branch) === value ? ' selected' : '') + '>' + (value === '__custom' ? '其他' : value) + '</option>').join('') + '</select>'
    + '<input data-cv-repo-field="branchCustom" data-cv-repo-index="' + index + '" value="' + esc(custom ? branch : '') + '" maxlength="200" placeholder="输入自定义分支名称" aria-label="自定义基准分支"' + (!custom || disabled ? ' hidden' : '') + '></div>'
    + '</div>'
    + '<div class="cv-repo-meta"><div class="cv-basic-field"><label for="cvRepoName">名称 <b class="cv-required" aria-hidden="true">*</b></label><input id="cvRepoName" data-cv-repo-field="name" data-cv-repo-index="' + index + '" value="' + esc(item.name) + '" maxlength="60" placeholder="默认取自仓库地址" aria-label="仓库名称" aria-required="true"' + disabled + '></div>'
    + '<div class="cv-basic-field"><label for="cvRepoDesc">描述 <b class="cv-required" aria-hidden="true">*</b></label><textarea id="cvRepoDesc" rows="3" data-cv-repo-field="desc" data-cv-repo-index="' + index + '" maxlength="200" placeholder="说明仓库用途，例如：前端主工程、公共组件库" aria-label="仓库描述" aria-required="true"' + disabled + '>' + esc(item.desc || '') + '</textarea></div></div>';
  return '<article class="cv-repo-card">' + headRow + body + '<div class="cv-repo-editor-actions"><button type="button" class="ld-space-btn" data-cv-repo-cancel>取消</button><button type="submit" class="ld-set-btn ld-set-btn--primary">保存</button></div></article>';
}
/* 仓库卡片图标与客户端一致，按仓库主机显示平台图标：github.com、gitee.com、git.kingdee.com 用品牌图标，
   其他主机（自建 GitLab 等）和取不到主机时用通用图标 */
const PLATFORM_ICONS = { 'github.com': ['github', githubIcon], 'gitee.com': ['gitee', giteeIcon], 'git.kingdee.com': ['gitlab', gitlabIcon] };
function repoPlatformIcon(repo) {
  let host = '';
  try { host = new URL(repo).host.toLowerCase(); } catch (_) { host = ''; }
  const [platform, src] = PLATFORM_ICONS[host] || ['generic', genericIcon];
  return '<img class="cv-repo-platform-icon" data-platform="' + platform + '" src="' + src + '" width="40" height="40" alt="" aria-hidden="true">';
}
function repoProvider(repo) {
  let host = '', repoPath = '';
  try { const url = new URL(repo); host = url.host.toLowerCase(); repoPath = url.pathname.replace(/^\/+|\/+$/g, ''); } catch (_) { host = ''; }
  const provider = /github/.test(host) ? 'GitHub' : /gitlab/.test(host) ? 'GitLab' : /gitee/.test(host) ? 'Gitee' : host || 'Git';
  return '<span class="cv-repo-provider">' + esc(provider) + (repoPath ? ' · ' + esc(repoPath.split('/')[0]) : '') + '</span>';
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
  return matches.length ? matches.map(function (m) { var on = memberPicked.includes(m.id); return '<label class="cv-member-option" role="option" aria-selected="' + on + '"><input type="checkbox" data-cv-member-pick value="' + esc(m.id) + '"' + (on ? ' checked' : '') + '><span class="cv-basic-avatar">' + esc(m.name.slice(0, 1)) + '</span><span><strong>' + esc(m.name) + '</strong><small>' + esc(m.email || m.dept || '') + '</small></span></label>'; }).join('') : '<p class="cv-basic-note">没有匹配的可添加成员</p>';
}
function addLabel() { return memberPicked.length ? '添加（' + memberPicked.length + '）' : '添加'; }
function memberPager(total, pages) {
  return '<nav class="cv-member-pagination" aria-label="成员分页"><span>共 ' + total + ' 位成员</span><label>每页 <span class="shared-select-host cv-member-size-host"><select id="cvMemberPageSize" aria-label="每页成员数">' + [10, 20, 50].map(function (size) { return '<option value="' + size + '"' + (size === memberPageSize ? ' selected' : '') + '>' + size + '</option>'; }).join('') + '</select></span> 条</label><div><button type="button" class="ld-space-btn" data-cv-member-page="' + (memberPage - 1) + '"' + (memberPage <= 1 ? ' disabled' : '') + '>上一页</button><span class="cv-member-page-status" tabindex="-1" aria-live="polite">' + memberPage + ' / ' + pages + '</span><button type="button" class="ld-space-btn" data-cv-member-page="' + (memberPage + 1) + '"' + (memberPage >= pages ? ' disabled' : '') + '>下一页</button></div></nav>';
}
function members(p, ws) {
  var editable = basicEditable(p, ws), all = ws ? wsMemberIds(p, ws) : spaceMemberIds(p);
  var fq = memberFilter.trim().toLocaleLowerCase();
  var ids = !fq ? all : all.filter(function (id) {
    var m = CV_MEMBERS.find(function (person) { return person.id === id; }) || { name: personName(id) };
    return [m.name, m.email, m.phone, m.employeeId, m.dept, m.id].some(function (v) { return String(v || '').toLocaleLowerCase().includes(fq); });
  });
  var pages = Math.max(1, Math.ceil(ids.length / memberPageSize));
  memberPage = Math.min(Math.max(1, memberPage), pages);
  var pageIds = ids.slice((memberPage - 1) * memberPageSize, memberPage * memberPageSize);
  var owner = ws ? wsOwnerId(p, ws) : (CV_MEMBERS.find(function (m) { return m.name === p.owner; }) || {}).id;
  var filterBox = '<label class="cv-member-search cv-member-filter"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><input type="search" id="cvMemberFilter" placeholder="搜索成员" aria-label="搜索当前成员" autocomplete="off" value="' + esc(memberFilter) + '"></label>';
  return '<div class="cv-basic-heading"><div><h2>成员</h2></div><div class="cv-member-tools">' + filterBox + (editable ? '<button type="button" class="ld-set-btn ld-set-btn--primary cv-settings-action" data-cv-member-open aria-expanded="false" aria-controls="cvBasicMemberForm">' + PLUS_ICON + '添加</button>' : '') + '</div></div>' +
    (editable ? '<form id="cvBasicMemberForm" class="cv-basic-add" data-cv-basic-form="add" hidden><div class="cv-member-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg><input type="search" id="cvBasicMemberSearch" placeholder="搜索姓名、邮箱、手机号或工号" aria-label="搜索要添加的成员" aria-controls="cvBasicMemberResults" aria-expanded="false" autocomplete="off"><div class="cv-member-results" id="cvBasicMemberResults" role="listbox" aria-label="可添加成员" hidden></div></div><span class="shared-select-host cv-member-role-host"><select id="cvBasicMemberRole" aria-label="成员角色"><option value="member">成员</option>' + '<option value="admin">管理员</option>' + '</select></span><button type="submit" class="ld-set-btn ld-set-btn--primary" id="cvBasicMemberAdd"' + (memberPicked.length ? '' : ' disabled') + '>' + addLabel() + '</button><p class="cv-basic-error" role="alert" hidden></p></form>' : '<p class="cv-basic-note">当前成员设置只读，请联系负责人或管理员修改。</p>') +
    '<div class="cv-basic-card cv-member-list-scroll" role="region" aria-label="成员列表" tabindex="0"><ul class="cv-basic-members">' + pageIds.map(function (id) {
      var m = CV_MEMBERS.find(function (person) { return person.id === id; }) || { name:personName(id) };
      var role = id === owner ? '负责人' : (ws ? wsAdminIds(ws) : p.adminIds || []).includes(id) ? '管理员' : '成员';
      return '<li><span class="cv-basic-avatar">' + esc(m.name.slice(0, 1)) + '</span><div class="cv-basic-member-name"><div class="cv-member-identity"><strong>' + esc(m.name) + '</strong><span>' + esc(m.email || '') + '</span></div><div class="cv-member-tags">' + (m.dept ? '<span>' + esc(m.dept) + '</span>' : '') + '<span>' + role + '</span></div></div>' + (editable && id !== owner ? '<details class="cv-member-more"><summary aria-label="' + esc(m.name) + '的更多操作">···</summary><div class="cv-member-menu" role="menu">' + (role === '管理员' ? '<button type="button" role="menuitem" data-cv-basic-role="member" data-cv-basic-role-id="' + esc(id) + '">设为成员</button>' : '<button type="button" role="menuitem" data-cv-basic-role="admin" data-cv-basic-role-id="' + esc(id) + '">设为管理员</button>') + '<button type="button" role="menuitem" class="is-danger" data-cv-basic-remove="' + esc(id) + '">移出成员</button></div></details>' : '') + '</li>';
    }).join('') + '</ul>' + (!ids.length ? '<p class="cv-basic-note">' + (fq ? '没有匹配「' + esc(memberFilter.trim()) + '」的成员' : '暂无成员') + '</p>' : '') + '</div>' + memberPager(ids.length, pages);
}
export function renderBasicSettings(host, tab) {
  var s = scope();
  if (!basicCanViewManagement(s.p, s.ws)) tab = 'repo';
  currentTab = tab;
  delete host.dataset.recruitmentPage;
  if (tab === 'agents') { host.classList.remove('is-member-list'); renderRecruitmentSettings(host); return; }
  host.classList.toggle('is-member-list', tab === 'members');
  var nextScope = s.p ? s.p.id + ':' + (s.ws ? s.ws.id : '') : '';
  if (nextScope !== memberScope) { memberScope = nextScope; memberPage = 1; memberFilter = ''; memberPicked = []; }
  if (!s.p) { host.innerHTML = '<div class="cv-wsadmin-empty">暂无可用空间，可在上方切换器新建空间后再设置。</div>'; return; }
  if (tab === 'zentao') { renderZentaoSettings(host, s.p, s.ws); return; }
  var path = wsScopePath(s.p, s.ws);
  host.innerHTML = '<p class="cv-basic-scope" title="' + esc(path) + '">' + esc(path) + '</p>' + (tab === 'repo' ? repo(s.p, s.ws) : tab === 'members' ? members(s.p, s.ws) : general(s.p, s.ws));
  if (tab === 'general') {
    var spaceSelect = host.querySelector('#cvBasicSpace');
    if (spaceSelect instanceof HTMLSelectElement) { initSelectDropdowns([spaceSelect]); spaceSelect.nextElementSibling?.classList.add('shared-select-trigger'); }
  }
  if (tab === 'members') {
    host.querySelectorAll('#cvBasicMemberRole, #cvMemberPageSize').forEach(function (select) { if (select instanceof HTMLSelectElement) initSelectDropdowns([select]); select.nextElementSibling?.classList.add('shared-select-trigger'); });
  }
  if (tab === 'repo') {
    host.querySelectorAll('[data-cv-repo-field="baseBranch"]').forEach(function (select) { if (select instanceof HTMLSelectElement) initSelectDropdowns([select]); select.nextElementSibling?.classList.add('shared-select-trigger'); });
  }
}
export function initBasicSettings(host) {
  document.addEventListener('lingee:auth-changed', function () {
    repoDraft = null;
    repoEditing = -1;
    repoEditBackup = null;
    memberScope = '';
  });
  /* 仓库卡片「···」菜单：点外部或按 Esc 关闭 */
  document.addEventListener('click', function (event) { if (!host.contains(event.target)) closeRepoMenus(host); });
  host.addEventListener('keydown', function (event) {
    const openMenu = event.key === 'Escape' && event.target.closest('.cv-repo-more');
    if (openMenu && !openMenu.querySelector('.cv-repo-menu').hidden) { event.preventDefault(); event.stopPropagation(); closeRepoMenus(host); openMenu.querySelector('[data-cv-repo-more]').focus(); return; }
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
  /* 仓库卡片字段就地更新草稿：输入静默写入，地址确认后重算 key/名称并重渲染 */
  document.addEventListener('lingee:local-dev-changed', function () {
    if (currentTab === 'repo' && host.isConnected && !host.hidden) renderBasicSettings(host, 'repo');
  });
  host.addEventListener('input', function (e) {
    var input = e.target.closest('[data-cv-repo-field]');
    if (!input || !repoDraft) return;
    var item = repoDraft.repositories[Number(input.dataset.cvRepoIndex)];
    if (!item) return;
    var field = input.dataset.cvRepoField;
    if (field === 'name') { item.name = input.value.trim(); item.nameAuto = false; return; }
    if (field === 'desc') { item.desc = input.value.trim(); return; }
    if (field === 'repo') {
      if (item.nameAuto === undefined) item.nameAuto = !item.name || item.name === repoNameOf(item.repo);
      item.repo = input.value.trim();
    }
    if (field === 'branchCustom') item.baseBranch = input.value.trim();
  });
  host.addEventListener('change', function (e) {
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
      if (item.nameAuto !== false) {
        item.name = repoNameOf(item.repo) || item.name || '';
        const nameInput = input.closest('.cv-repo-card')?.querySelector('[data-cv-repo-field="name"]');
        if (nameInput) nameInput.value = item.name;
      }
      return;
    }
    if (field === 'baseBranch') {
      var customInput = input.closest('.cv-basic-field').querySelector('[data-cv-repo-field="branchCustom"]');
      item.baseBranch = input.value === '__custom' ? '' : input.value;
      if (customInput) { customInput.hidden = input.value !== '__custom'; if (!customInput.hidden) { customInput.value = ''; customInput.focus(); } }
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
    if (e.target.id === 'cvMemberFilter') {
      /* 中文输入法组字期间不重绘，组字结束（compositionend）再筛选 */
      if (!e.isComposing) applyMemberFilter(e.target.value);
      return;
    }
    if (e.target.id !== 'cvBasicMemberSearch') return;
    searchMembers();
  });
  /* 筛选当前成员：重绘后把焦点和光标放回搜索框 */
  function applyMemberFilter(value) {
    memberFilter = value; memberPage = 1;
    renderBasicSettings(host, currentTab);
    var box = $('#cvMemberFilter');
    if (box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
  }
  host.addEventListener('compositionend', function (e) { if (e.target.id === 'cvMemberFilter') applyMemberFilter(e.target.value); });
  host.addEventListener('focusin', function (e) { if (e.target.id === 'cvBasicMemberSearch') searchMembers(); });
  /* 点候选行时不让搜索框失焦：macOS 上点复选框不会获得焦点，失焦判断会把浮层收起，导致勾一下就消失 */
  host.addEventListener('mousedown', function (e) {
    if (e.target.closest('#cvBasicMemberResults')) e.preventDefault();
  });
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
    if (e.key === 'Enter' && e.target.id === 'cvBasicMemberSearch') { e.preventDefault(); if (memberPicked.length) $('#cvBasicMemberForm').requestSubmit(); }
  });
  /* 添加成员：按所选角色逐个写入勾选的人，任一失败即停并提示，已成功的保留 */
  var addedCount = 0;
  function addPickedMembers(s) {
    if (!memberPicked.length) return '请先在搜索结果中勾选人员';
    var role = $('#cvBasicMemberRole').value;
    addedCount = 0;
    for (var i = 0; i < memberPicked.length; i++) {
      var err = basicAddMember(s.p, s.ws, memberPicked[i], role);
      if (err) { memberPicked = memberPicked.slice(i); return addedCount ? '已添加 ' + addedCount + ' 位，' + personName(memberPicked[0]) + '：' + err : err; }
      addedCount += 1;
    }
    memberPicked = [];
    return '';
  }
  host.addEventListener('change', function (e) {
    if (!e.target.matches('[data-cv-member-pick]')) return;
    var id = e.target.value, at = memberPicked.indexOf(id);
    if (e.target.checked && at < 0) memberPicked.push(id);
    if (!e.target.checked && at >= 0) memberPicked.splice(at, 1);
    e.target.closest('[role="option"]')?.setAttribute('aria-selected', String(e.target.checked));
    var btn = $('#cvBasicMemberAdd'); if (btn) { btn.disabled = !memberPicked.length; btn.textContent = addLabel(); }
  });
  host.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-cv-basic-form]');
    if (!form) return;
    e.preventDefault();
    var s = scope(); if (!s.p || !basicEditable(s.p, s.ws)) return;
    var kind = form.dataset.cvBasicForm;
    var spaceSelect = $('#cvBasicSpace');
    var error = kind === 'general' ? basicSaveGeneral(s.p, s.ws, Object.assign({ name:$('#cvBasicName').value, desc:$('#cvBasicDesc').value, instruction:$('#cvBasicInstruction')?.value || '' }, spaceSelect && !spaceSelect.disabled ? { spaceId: spaceSelect.value } : {}))
      : kind === 'repo' ? (repoEditing >= 0 && !String(repoDraft?.repositories?.[repoEditing]?.desc || '').trim() ? '请填写仓库描述' : basicSaveRepo(s.p, s.ws, repoDraft)) : addPickedMembers(s);
    if (error) { var note = form.querySelector('.cv-basic-error'); note.textContent = error; note.hidden = false; return; }
    if (kind === 'add') memberFilter = '';
    if (kind === 'add') memberPage = Math.max(1, Math.ceil((s.ws ? wsMemberIds(s.p, s.ws) : spaceMemberIds(s.p)).length / memberPageSize));
    if (kind === 'repo') repoDraft = null;
    renderBasicSettings(host, currentTab);
    toast(kind === 'add' ? '已添加 ' + addedCount + ' 位成员' : '设置已保存', 'success');
  });
  host.addEventListener('click', async function (e) {
    const more = e.target.closest('[data-cv-repo-more]');
    if (more) {
      const box = more.closest('.cv-repo-more'), menu = box.querySelector('.cv-repo-menu'), open = menu.hidden;
      closeRepoMenus(host, box);
      menu.hidden = !open; more.setAttribute('aria-expanded', String(open));
      box.closest('.cv-repo-card')?.classList.toggle('is-menu-open', open);
      if (open) menu.querySelector('button')?.focus();
      return;
    }
    if (!e.target.closest('.cv-repo-menu')) closeRepoMenus(host);

    const spaceDirectory = e.target.closest('[data-cv-space-dir]');
    if (spaceDirectory && !spaceDirectory.disabled) {
      const { p, ws } = scope();
      if (p) ldOpenSpaceDirDialog(p.id, ws?.id || '');
      return;
    }
    const repoCheck = e.target.closest('[data-cv-repo-check]');
    if (repoCheck && !repoCheck.disabled) {
      const { p, ws } = scope();
      if (!p) return;
      const item = buildRepoList(p, ws?.id || '').repositories.find(row => row.key === repoCheck.dataset.cvRepoCheck);
      if (!item) return;
      const target = repoTarget(p, ws, item), st = ldProjectStatus(target);
      if (!st.info) return;
      /* 没有可用账号时先登录或更换账号（检测里包含选择 Git 账号），登录成功后自动检测 */
      if (['login', 'expired'].includes(st.key)) { ldOpenAuth(st.info.host, () => ldDetectHost(st.info.host)); return; }
      ldDetectHost(st.info.host, () => {
        const after = repoPermission(p, ws, item);
        toast('「' + item.name + '」' + (after.ready ? '检测通过' : after.label + (after.reason ? '：' + after.reason : '')), after.ready ? 'success' : 'warning');
      });
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
        if (!await requestDeleteConfirmation('删除当前空间的仓库关联？远端仓库、本机目录和已启动任务保持不变。', {title:'删除仓库',confirmLabel:'删除'})) return;
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
    var del = e.target.closest('[data-cv-ws-delete]');
    if (del) {
      var ds = scope(); if (!ds.p || !ds.ws || del.disabled) return;
      var blocked = wsDeleteBlockReason(ds.p, ds.ws.id);
      if (blocked) { toast(blocked, 'warning'); renderBasicSettings(host, currentTab); return; }
      if (!await requestDeleteConfirmation('删除「' + ds.ws.name + '」后无法恢复，该空间的设置、成员和已添加的智能体配置将一并移除。', { title:'删除空间', confirmLabel:'删除' })) return;
      var removed = wsDelete(ds.p, ds.ws.id);
      if (!removed.ok) { toast(removed.error, 'warning'); renderBasicSettings(host, currentTab); return; }
      toast('已删除空间「' + ds.ws.name + '」', 'success');
      setSettingsScope('', ''); return;
    }
    var leave = e.target.closest('[data-cv-ws-leave]');
    if (leave) {
      var ls = scope(), me = mgrCurrentPersonId(); if (!ls.p || !ls.ws || leave.disabled) return;
      if (!await requestDeleteConfirmation('离开「' + ls.ws.name + '」后，你将不能再在该空间创建和处理任务；需要时可请负责人重新添加。', { title:'离开空间', confirmLabel:'离开' })) return;
      var left = wsLeave(ls.p, ls.ws.id, me);
      if (!left.ok) { toast(left.error, 'warning'); renderBasicSettings(host, currentTab); return; }
      toast('已离开空间「' + ls.ws.name + '」', 'success');
      setSettingsScope('', ''); return;
    }
    var roleBtn = e.target.closest('[data-cv-basic-role]');
    if (roleBtn) {
      var rs = scope(); if (!rs.p) return;
      var roleError = basicSetMemberRole(rs.p, rs.ws, roleBtn.dataset.cvBasicRoleId, roleBtn.dataset.cvBasicRole);
      if (roleError) { toast(roleError, 'warning'); return; }
      renderBasicSettings(host, currentTab);
      toast('已将「' + personName(roleBtn.dataset.cvBasicRoleId) + '」设为' + (roleBtn.dataset.cvBasicRole === 'admin' ? '管理员' : '成员'), 'success');
      return;
    }
    var button = e.target.closest('[data-cv-basic-remove]'); if (!button) return;
    var s = scope(), id = button.dataset.cvBasicRemove; if (!s.p) return;
    if (!await requestDeleteConfirmation('将「' + personName(id) + '」移出「' + (s.ws || s.p).name + '」？未完成任务需先转交。', { title:'移出成员', confirmLabel:'移出' })) return;
    var error = basicRemoveMember(s.p, s.ws, id);
    if (error) { toast(error, 'warning'); return; }
    renderBasicSettings(host, currentTab); toast('已移出成员', 'success');
  });
}
