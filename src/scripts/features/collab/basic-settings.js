import { renderZentaoSettings } from './zentao-settings.js';
import { renderRecruitmentSettings } from './recruitment-settings.js';
import { ldEnvironmentId, ldProjectStatus, ldRepoPermission, ldMine, ldSaveMine, ldBindingHasRunningTasks, ldSpaceDir, ldSpaceDirChangeError, ldDetectRepo, ldIsDetectingRepo } from './local-dev/core.js';
import { ldOpenSpaceDirDialog } from './local-dev/space-dir-dialog.js';
import { ldOpenAuth } from './local-dev/auth-dialog.js';
import { buildRepoOwn, buildRepoList, buildRepoIdentity, buildTaskRepoKeys } from './repository-config.js';
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
import { personName, spaceMemberIds, wsAdminIds, wsDelete, wsDeleteBlockReason, wsLeave, wsLeaveBlockReason, wsMemberIds, wsOwnerId, wsProjectById, wsScopePath, wsTasksOf } from '../manager/workspaces.js';
import { isWsHost } from './data.js';
import { basicAddMember, basicCanViewManagement, basicRepoConfig, basicEditable, basicRemoveMember, basicSaveGeneral, basicSaveRepo, basicSetMemberRole } from './basic-settings-data.js';
import { initMemberAddDialog, openMemberAddDialog } from './member-add-dialog.js';
/* 当前空间 / 工作区的基本设置，顶部切换器决定范围；只渲染当前分类。 */
var currentTab = 'general';
var memberPage = 1;
var memberPageSize = 10;
var memberScope = '';
var memberFilter = '';
/* memberFilter：成员列表搜索词，按姓名、邮箱、手机号、工号或部门筛选当前成员 */
function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
/* '' 为默认工作区（空间根） */
function scope() { var s = getSettingsScope(), p = wsProjectById(s.project); return { p:p, ws:p ? wsById(p, s.ws) : null }; }
export function canViewWorkspaceSettings() { var s = scope(); return basicCanViewManagement(s.p, s.ws); }
/* 当前空间有仓库、但本机目录还没初始化：设置左栏「仓库」和空间图标上显示红点 */
export function settingsRepoPending() { var s = scope(); return !!s.p && buildRepoList(s.p, s.ws?.id || '').repositories.length > 0 && !ldSpaceDir(s.p.id, s.ws?.id || ''); }
var REQUIRED = ' <b class="cv-required" aria-hidden="true">*</b>';
function field(id, label, value, disabled, rows, max, hint = '') {
  var hintId = id + 'Hint';
  /* 只读（非负责人、管理员）直接展示文字，不显示禁用输入框 */
  if (disabled) return '<div class="cv-basic-field is-readonly"><span>' + label.replace(REQUIRED, '') + '</span><p class="cv-general-value">' + (String(value || '').trim() ? esc(value) : '<span class="cv-general-empty">未填写</span>') + '</p></div>';
  var attributes = ' id="' + id + '" maxlength="' + max + '"' + (hint ? ' aria-describedby="' + hintId + '"' : '');
  return '<div class="cv-basic-field"><div><label for="' + id + '">' + label + '</label>'
    + (hint ? '<p class="cv-general-hint" id="' + hintId + '">' + esc(hint) + '</p>' : '') + '</div>' + (rows
      ? '<div class="cv-general-textarea"><textarea' + attributes + ' rows="' + rows + '" data-cv-count>' + esc(value) + '</textarea><span class="cv-general-count" aria-hidden="true">' + String(value || '').length + '/' + max + '</span></div>'
      : '<input' + attributes + ' value="' + esc(value) + '">') + '</div>';
}
var SAVE_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/></svg>';
function head(title, subtitle, save) {
  return '<div class="cv-basic-heading"><div><h2>' + title + '</h2>' + (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') + '</div>'
    + (save ? '<div class="cv-general-actions"><button type="submit" class="ld-set-btn ld-set-btn--primary cv-settings-action" data-cv-general-save disabled>' + SAVE_ICON + '保存</button></div>' : '') + '</div>';
}
/* 基本信息（UE 2026-11-25）：所有成员可见；负责人、管理员可编辑名称和描述，其他人只读。改动后「保存」才可用 */
function general(p, ws) {
  var item = ws || p, editable = basicEditable(p, ws);
  return '<div class="cv-general-settings"><form data-cv-basic-form="general">' +
    head('基本信息', '名称和描述保存后同步到 Manage 空间。', editable) +
    '<div class="cv-general-fields">' + field('cvBasicName', '名称' + REQUIRED, item.name, !editable, 0, ws ? 30 : 60) +
    field('cvBasicDesc', '描述' + REQUIRED, item.desc || '', !editable, 3, 200) +
    (ws || !editable && !String(p.instruction || '').trim() ? '' : field('cvBasicInstruction', '上下文', p.instruction || '', !editable, 3, 10000, '为空间内的智能体提供背景信息。')) +
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
  /* 「＋ 新增仓库」在页头右上角（UE 2026-11-25，替代网格末尾的新增卡片）；没有管理权限时不显示 */
  const add = editable ? '<button type="button" class="ld-set-btn ld-set-btn--primary cv-settings-action cv-repo-add-btn" data-cv-repo-add>' + PLUS_ICON + '新增仓库</button>' : '';
  const empty = !count && editable ? '<div class="cv-wsadmin-empty">当前空间还没有仓库，点击右上角「新增仓库」添加。</div>' : '';
  return '<form data-cv-basic-form="repo"><div class="cv-basic-heading"><div><h2>仓库</h2></div>' + add + '</div>'
    + (count ? spaceDirectoryStatus(p, ws) : '') + (count ? '<div class="cv-repo-cards">' + cards + '</div>' : '') + footer + empty
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
  const detecting = ldIsDetectingRepo(repoTarget(p, ws, item));
  const tone = perm.key === 'unchecked' ? 'is-pending' : perm.ready ? 'is-ready' : 'is-warn';
  const stateText = detecting ? '检测中…' : perm.label;
  const reason = perm.reason || stateText;
  const disabled = st.invalid || st.ssh || detecting;
  return '<div class="cv-repo-local ' + tone + '"><span class="cv-repo-local-label">' + REPO_ICONS.key + 'Git 权限</span>'
    + '<span class="cv-repo-local-state" title="' + esc(reason) + '"><i aria-hidden="true"></i>' + esc(stateText) + '</span>'
    + '<button type="button" class="cv-repo-init-btn" data-cv-repo-check="' + esc(item.key) + '"'
    + (disabled ? ' disabled title="' + esc(st.reason || '') + '"' : '') + '>检测</button></div>';
}
/* 未通过时的原因红字：放在地址、基准分支下方，状态条上方（与 Build 实现一致）；超长省略，悬停看全文 */
function repoReasonLine(p, ws, item) {
  const perm = repoPermission(p, ws, item);
  if (perm.ready || perm.key === 'unchecked' || !perm.reason || ldIsDetectingRepo(repoTarget(p, ws, item))) return '';
  return '<p class="cv-repo-reason" title="' + esc(perm.reason) + '">' + esc(perm.reason) + '</p>';
}
/* 在途任务：已开工、还没完成或取消的任务（待规划、待开始不算）。key 为空时统计整个空间 */
const REPO_IDLE_STATUSES = ['backlog', 'todo', 'pending', 'planned', 'ready', 'done', 'cancelled'];
function repoInFlightTasks(p, wsId, key = '') {
  return wsTasksOf(p, wsId).filter(t => !REPO_IDLE_STATUSES.includes(t.status) && (!key || buildTaskRepoKeys(t, p).includes(key)));
}
/* 主仓库改地址等同于换仓库：有在途任务时不允许保存；只改基准分支不影响在途任务 */
function repoPrimaryRepointError(p, ws) {
  if (repoEditing < 0 || !repoDraft) return '';
  const saved = buildRepoList(p, ws?.id || '');
  const before = saved.repositories[repoEditing], after = repoDraft.repositories[repoEditing];
  if (!before || !after || before.key !== saved.defaultRepo) return '';
  if (buildRepoIdentity(before.repo) === buildRepoIdentity(after.repo)) return '';
  const busy = repoInFlightTasks(p, ws?.id || '').length;
  return busy ? '当前空间有 ' + busy + ' 个执行中或待推进的任务，请等任务完成或取消后再修改主仓库地址' : '';
}
function repoCard(p, ws, item, index, editable, list, defaultKey, editor = false) {
  /* 卡片操作收进右上角「···」菜单，与 Git 账号卡片一致 */
  const actions = editable && !editor ? '<div class="cv-repo-more"><button type="button" class="cv-repo-more-btn" data-cv-repo-more aria-haspopup="menu" aria-expanded="false" aria-label="'+esc(item.name || '仓库')+' 的更多操作">' + MORE_ICON + '</button>'
    + '<div class="cv-repo-menu" role="menu" hidden><button type="button" role="menuitem" data-cv-repo-edit="'+index+'">编辑</button>'
    + (defaultKey !== item.key && list.length > 1 ? '<button type="button" role="menuitem" data-cv-repo-default="'+index+'">设为主仓库</button>' : '')
    + (defaultKey !== item.key && list.length > 1 ? '<button type="button" role="menuitem" class="is-danger" data-cv-repo-remove="'+index+'">删除</button>' : '')
    + '</div></div>' : '';
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
      + repoReasonLine(p, ws, item) + repoDirectoryStatus(p, ws, item) + '</article>';
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
/* 头像底色按姓名散列，同一个人在列表和添加弹窗里颜色一致 */
var AVATAR_TONES = ['blue', 'orange', 'green', 'purple', 'teal', 'rose'];
export function memberAvatar(name, cls) { var h = 0; for (var ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return '<span class="' + (cls || 'cv-basic-avatar') + ' is-' + AVATAR_TONES[h % AVATAR_TONES.length] + '" aria-hidden="true">' + esc(String(name || '?').slice(0, 1)) + '</span>'; }
/* 添加成员弹窗的候选：按姓名、邮箱、手机号、工号或部门匹配 */
export function memberCandidates(keyword) {
  var s = scope(); if (!s.p) return [];
  var q = String(keyword || '').trim().toLocaleLowerCase();
  return memberPool(s.p, s.ws).filter(function (m) { return !q || [m.name, m.email, m.phone, m.employeeId, m.dept, m.id].some(function (v) { return String(v || '').toLocaleLowerCase().includes(q); }); });
}
/* 逐个写入勾选的人（角色为成员），任一失败即停并返回原因，已成功的保留 */
export function memberAddPicked(ids) {
  var s = scope(); if (!s.p || !basicEditable(s.p, s.ws)) return { added:0, error:'当前空间或权限已变化，请重新操作' };
  for (var i = 0; i < ids.length; i++) {
    var err = basicAddMember(s.p, s.ws, ids[i], 'member');
    if (err) return { added:i, error:(i ? '已添加 ' + i + ' 位，' : '') + personName(ids[i]) + '：' + err };
  }
  memberFilter = '';
  memberPage = Math.max(1, Math.ceil((s.ws ? wsMemberIds(s.p, s.ws) : spaceMemberIds(s.p)).length / memberPageSize));
  return { added:ids.length, error:'' };
}
function memberPager(total, pages) {
  return '<nav class="cv-member-pagination" aria-label="成员分页"><span>共 ' + total + ' 位成员</span><label>每页 <span class="shared-select-host cv-member-size-host"><select id="cvMemberPageSize" aria-label="每页成员数">' + [10, 20, 50].map(function (size) { return '<option value="' + size + '"' + (size === memberPageSize ? ' selected' : '') + '>' + size + '</option>'; }).join('') + '</select></span> 条</label><div><button type="button" class="ld-space-btn" data-cv-member-page="' + (memberPage - 1) + '"' + (memberPage <= 1 ? ' disabled' : '') + '>上一页</button><span class="cv-member-page-status" tabindex="-1" aria-live="polite">' + memberPage + ' / ' + pages + '</span><button type="button" class="ld-space-btn" data-cv-member-page="' + (memberPage + 1) + '"' + (memberPage >= pages ? ' disabled' : '') + '>下一页</button></div></nav>';
}
var EDIT_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>';
var ROLE_CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4 10-11"/></svg>';
var TRASH_ICON = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 5.5h13M8 5.5V4h4v1.5M5.5 5.5l.7 10a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9l.7-10M8.5 9v4.5M11.5 9v4.5"/></svg>';
/* 行尾「编辑」（与客户端一致）：菜单里切换空间管理员 / 成员（当前角色打勾）；「移出空间」是旁边单独的删除按钮 */
function memberEditMenu(id, name, role) {
  var item = function (value, label) { var on = (role === '管理员') === (value === 'admin'); return '<button type="button" role="menuitemradio" aria-checked="' + on + '" data-cv-basic-role="' + value + '" data-cv-basic-role-id="' + esc(id) + '"' + (on ? ' disabled' : '') + '>' + label + (on ? ROLE_CHECK : '') + '</button>'; };
  return '<details class="cv-member-more"><summary class="cv-member-remove" aria-label="编辑' + esc(name) + '" title="编辑">' + EDIT_ICON + '</summary><div class="cv-member-menu" role="menu">'
    + item('admin', '空间管理员') + item('member', '成员') + '</div></details>'
    + '<button type="button" class="cv-member-remove" data-cv-basic-remove="' + esc(id) + '" aria-label="移出' + esc(name) + '" title="移出空间">' + TRASH_ICON + '</button>';
}
/* 成员（UE 2026-11-25）：页头搜索 +「添加成员」；每人一张卡片，头像、姓名、邮箱、部门与角色标签，负责人以外的行尾是删除。
   人数超过一页时才显示分页 */
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
  var filterBox = '<label class="cv-member-search cv-member-filter"><input type="search" id="cvMemberFilter" placeholder="搜索成员" aria-label="搜索当前成员" autocomplete="off" value="' + esc(memberFilter) + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></svg></label>';
  return '<div class="cv-basic-heading"><div><h2>成员</h2></div><div class="cv-member-tools">' + filterBox + (editable ? '<button type="button" class="ld-set-btn ld-set-btn--primary cv-settings-action" data-cv-member-open aria-haspopup="dialog">' + PLUS_ICON + '添加成员</button>' : '') + '</div></div>' +
    '<div class="cv-member-list-scroll" role="region" aria-label="成员列表" tabindex="0"><ul class="cv-basic-members cv-member-cards">' + pageIds.map(function (id) {
      var m = CV_MEMBERS.find(function (person) { return person.id === id; }) || { name:personName(id) };
      var role = id === owner ? '负责人' : (ws ? wsAdminIds(ws) : p.adminIds || []).includes(id) ? '管理员' : '成员';
      /* 行内容（2026-11-25）：姓名后是工号（没有工号时显示邮箱），下一行部门、角色标签；行尾编辑与删除 */
      var code = m.employeeId || m.email || '';
      return '<li>' + memberAvatar(m.name) + '<div class="cv-basic-member-name"><div class="cv-member-identity"><strong>' + esc(m.name) + '</strong>' + (code ? '<span title="' + esc(code) + '">' + esc(code) + '</span>' : '') + '</div>'
        + '<div class="cv-member-tags">' + (m.dept ? '<span>' + esc(m.dept) + '</span>' : '') + '<span>' + role + '</span></div></div>'
        + (editable && id !== owner ? memberEditMenu(id, m.name, role) : '') + '</li>';
    }).join('') + '</ul>' + (!ids.length ? '<p class="cv-basic-note">' + (fq ? '没有匹配「' + esc(memberFilter.trim()) + '」的成员' : '暂无成员') + '</p>' : '') + '</div>' + (ids.length > 10 ? memberPager(ids.length, pages) : '');
}
export function renderBasicSettings(host, tab) {
  var s = scope();
  if (!basicCanViewManagement(s.p, s.ws) && tab !== 'repo' && tab !== 'general') tab = 'general';
  currentTab = tab;
  delete host.dataset.recruitmentPage;
  if (tab === 'agents') { host.classList.remove('is-member-list'); renderRecruitmentSettings(host); return; }
  host.classList.toggle('is-member-list', tab === 'members');
  var nextScope = s.p ? s.p.id + ':' + (s.ws ? s.ws.id : '') : '';
  if (nextScope !== memberScope) { memberScope = nextScope; memberPage = 1; memberFilter = ''; }
  if (!s.p) { host.innerHTML = '<div class="cv-wsadmin-empty">暂无可用空间，可在上方切换器新建空间后再设置。</div>'; return; }
  if (tab === 'zentao') { renderZentaoSettings(host, s.p, s.ws); return; }
  var path = wsScopePath(s.p, s.ws);
  host.innerHTML = '<p class="cv-basic-scope" title="' + esc(path) + '">' + esc(path) + '</p>' + (tab === 'repo' ? repo(s.p, s.ws) : tab === 'members' ? members(s.p, s.ws) : general(s.p, s.ws));
  if (tab === 'general') {
    var spaceSelect = host.querySelector('#cvBasicSpace');
    if (spaceSelect instanceof HTMLSelectElement) { initSelectDropdowns([spaceSelect]); spaceSelect.nextElementSibling?.classList.add('shared-select-trigger'); }
  }
  if (tab === 'members') {
    host.querySelectorAll('#cvMemberPageSize').forEach(function (select) { if (select instanceof HTMLSelectElement) initSelectDropdowns([select]); select.nextElementSibling?.classList.add('shared-select-trigger'); });
  }
  if (tab === 'repo') {
    host.querySelectorAll('[data-cv-repo-field="baseBranch"]').forEach(function (select) { if (select instanceof HTMLSelectElement) initSelectDropdowns([select]); select.nextElementSibling?.classList.add('shared-select-trigger'); });
  }
}
export function initBasicSettings(host) {
  initMemberAddDialog();
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
  host.addEventListener('input', function (e) {
    if (e.target.id === 'cvMemberFilter') {
      /* 中文输入法组字期间不重绘，组字结束（compositionend）再筛选 */
      if (!e.isComposing) applyMemberFilter(e.target.value);
      return;
    }
  });
  /* 筛选当前成员：重绘后把焦点和光标放回搜索框 */
  function applyMemberFilter(value) {
    memberFilter = value; memberPage = 1;
    renderBasicSettings(host, currentTab);
    var box = $('#cvMemberFilter');
    if (box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
  }
  host.addEventListener('compositionend', function (e) { if (e.target.id === 'cvMemberFilter') applyMemberFilter(e.target.value); });
  /* 基本信息：有改动才可「保存」，描述实时显示字数 */
  host.addEventListener('input', function (e) {
    var form = e.target.closest('[data-cv-basic-form="general"]');
    if (!form) return;
    if (e.target.matches('[data-cv-count]')) { var count = e.target.parentElement.querySelector('.cv-general-count'); if (count) count.textContent = e.target.value.length + '/' + e.target.maxLength; }
    form.querySelectorAll('[data-cv-general-save]').forEach(function (button) { button.disabled = false; });
  });
  host.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-cv-basic-form]');
    if (!form) return;
    e.preventDefault();
    var s = scope(); if (!s.p || !basicEditable(s.p, s.ws)) return;
    var kind = form.dataset.cvBasicForm;
    var spaceSelect = $('#cvBasicSpace');
    var error = kind === 'general' ? basicSaveGeneral(s.p, s.ws, Object.assign({ name:$('#cvBasicName').value, desc:$('#cvBasicDesc').value, instruction:$('#cvBasicInstruction')?.value || '' }, spaceSelect && !spaceSelect.disabled ? { spaceId: spaceSelect.value } : {}))
      : kind === 'repo' ? (repoEditing >= 0 && !String(repoDraft?.repositories?.[repoEditing]?.desc || '').trim() ? '请填写仓库描述' : repoPrimaryRepointError(s.p, s.ws) || basicSaveRepo(s.p, s.ws, repoDraft)) : '';
    if (error) { var note = form.querySelector('.cv-basic-error'); note.textContent = error; note.hidden = false; return; }
    if (kind === 'repo') repoDraft = null;
    renderBasicSettings(host, currentTab);
    toast('设置已保存', 'success');
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
      if (['login', 'expired'].includes(st.key)) { ldOpenAuth(st.info.host, () => ldDetectRepo(target)); return; }
      ldDetectRepo(target, () => {
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
        const busy = repoInFlightTasks(context.p, context.ws?.id || '').length;
        if (busy) { toast('当前空间有 ' + busy + ' 个执行中或待推进的任务，请等任务完成或取消后再切换主仓库','warning'); return; }
        const error = basicSaveRepo(context.p,context.ws,{repositories:saved.repositories,defaultRepo:key});
        if (error) { toast(error,'warning'); return; }
        repoDraft = null; renderBasicSettings(host,'repo'); toast('已设为主仓库','success'); return;
      }
      if (action.hasAttribute('data-cv-repo-remove')) {
        const target = repoDraft.repositories[Number(action.dataset.cvRepoRemove)];
        const using = target ? repoInFlightTasks(context.p, context.ws?.id || '', target.key).length : 0;
        if (using) { toast('有 ' + using + ' 个执行中或待推进的任务在使用该仓库，请等任务完成或取消后再删除','warning'); return; }
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
    if (open) { openMemberAddDialog(open, function () { renderBasicSettings(host, 'members'); }); return; }

    var del = e.target.closest('[data-cv-ws-delete]');
    if (del) {
      var ds = scope(); if (!ds.p || !ds.ws || del.disabled) return;
      var blocked = wsDeleteBlockReason(ds.p, ds.ws.id);
      if (blocked) { toast(blocked, 'warning'); renderBasicSettings(host, currentTab); return; }
      if (!await requestDeleteConfirmation('删除「' + ds.ws.name + '」后无法恢复，该空间的设置、成员和已添加的智能体配置将一并移除。', { title:'删除空间', confirmLabel:'删除', tone:'warning' })) return;
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
      var rs = scope(); if (!rs.p || roleBtn.disabled) return;
      var roleError = basicSetMemberRole(rs.p, rs.ws, roleBtn.dataset.cvBasicRoleId, roleBtn.dataset.cvBasicRole);
      if (roleError) { toast(roleError, 'warning'); return; }
      renderBasicSettings(host, currentTab);
      toast('已将「' + personName(roleBtn.dataset.cvBasicRoleId) + '」设为' + (roleBtn.dataset.cvBasicRole === 'admin' ? '空间管理员' : '成员'), 'success');
      return;
    }
    /* 点到编辑菜单外面时收起已展开的菜单 */
    host.querySelectorAll('.cv-member-more[open]').forEach(function (menu) { if (!menu.contains(e.target)) menu.open = false; });
    var button = e.target.closest('[data-cv-basic-remove]'); if (!button) return;
    var s = scope(), id = button.dataset.cvBasicRemove; if (!s.p) return;
    if (!await requestDeleteConfirmation('确定把「' + personName(id) + '」移出「' + (s.ws || s.p).name + '」吗？移除后 TA 看不到这个空间的任务，已分配给 TA 的任务需要重新指派。', { title:'删除成员', confirmLabel:'删除', tone:'warning' })) return;
    var error = basicRemoveMember(s.p, s.ws, id);
    if (error) { toast(error, 'warning'); return; }
    renderBasicSettings(host, currentTab); toast('已删除成员', 'success');
  });
}
