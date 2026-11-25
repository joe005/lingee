/* 企业自建智能体与团队的可见范围，两级：
   全员可见＝提交后由租户管理员审核，通过后企业内全员可在「更多」中安装，各空间也可添加；
   空间可见＝提交后自动审核通过，默认不出现在「更多」里；不指定空间，企业内任一空间的管理员在「设置 › 智能体」中添加后，该空间成员才能看到并使用。
   租户管理员可在企业资产中修改已上架内容的可见范围。数据形如 {scope:'tenant'|'workspace'}。 */
import { xesc } from './data.js';

export const VISIBILITY_LABELS = { tenant: '全员可见', workspace: '空间可见' };

export function normalizeVisibility(value) {
  return { scope: value?.scope === 'workspace' ? 'workspace' : 'tenant' };
}
export function visibilityLabel(value) { return VISIBILITY_LABELS[normalizeVisibility(value).scope]; }
export function sameVisibility(a, b) { return normalizeVisibility(a).scope === normalizeVisibility(b).scope; }
/* 全员可见的团队只能引用全员可见的成员；空间可见的团队两种成员都可引用 */
export function visibilityCovers(member, team) {
  return normalizeVisibility(team).scope === 'workspace' || normalizeVisibility(member).scope === 'tenant';
}

export function visibilityFieldHtml(value, legend = '可见范围') {
  const v = normalizeVisibility(value);
  const radio = scope => `<label class="asset-visibility-radio"><input type="radio" name="assetVisibility" value="${scope}"${v.scope === scope ? ' checked' : ''}><span>${VISIBILITY_LABELS[scope]}</span></label>`;
  return `<fieldset class="asset-visibility"><legend>${xesc(legend)}</legend><div class="asset-visibility-radios">${radio('tenant')}${radio('workspace')}</div><div class="platform-dialog-error" data-visibility-error></div></fieldset>`;
}
export function readVisibilityField(root) {
  return normalizeVisibility({ scope: root?.querySelector('input[name=assetVisibility]:checked')?.value });
}
export function visibilityError(root, message) {
  const node = root?.querySelector('[data-visibility-error]');
  if (node) node.textContent = message;
}
