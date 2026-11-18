import { getLoginPersonId, getLoginAccount } from '../login.js';
/* 安装记录属于当前用户与当前浏览器设备，工作区添加清单不会写入这里。 */
const PREFIX='lingee.asset-local-install.v1:';
const LEGACY='lingee.platform.installed.v1';
function owner(userId) { return userId ? 'person:'+userId : getLoginPersonId() ? 'person:'+getLoginPersonId() : 'account:'+(getLoginAccount() || 'guest'); }
export function localAssetStorageKey(userId) { return PREFIX+encodeURIComponent(owner(userId)); }
function readState(userId) {
  try {
    const value=JSON.parse(localStorage.getItem(localAssetStorageKey(userId)) || 'null');
    if(value && value.installed && value.packages)return value;
    // 旧版共用记录只迁移给首次接管它的已登录用户，不能复制给后来登录的人。
    const me=owner(userId),claim=localStorage.getItem(LEGACY+'.owner');
    if(userId || me==='account:guest' || claim && claim!==me)return {installed:{},packages:{}};
    const installed=JSON.parse(localStorage.getItem(LEGACY) || '{}');
    if(!installed || typeof installed!=='object' || Array.isArray(installed))return {installed:{},packages:{}};
    const state={installed,packages:Object.fromEntries(Object.entries(installed).map(([key,version])=>[key,[version]]))};
    localStorage.setItem(LEGACY+'.owner',me);
    localStorage.setItem(localAssetStorageKey(),JSON.stringify(state));
    return state;
  } catch (_) { return {installed:{},packages:{}}; }
}
export function readLocalAssetInstalls(userId) { return {...readState(userId).installed}; }
export function writeLocalAssetInstalls(installed,extraPackages=[]) {
  const previous=readState(),packages={};
  for(const [key,version] of Object.entries(installed))packages[key]=[...new Set([...(previous.packages[key] || []),version])];
  for(const row of extraPackages)if(installed[row.key])packages[row.key]=[...new Set([...(packages[row.key] || []),row.version])];
  try { localStorage.setItem(localAssetStorageKey(),JSON.stringify({installed,packages})); return true; } catch (_) { return false; }
}
export function requiredLocalPackages(entry) {
  if(!entry)return [];
  return [...new Map([{key:entry.key,version:entry.version},...(entry.experts || []).map(member=>({key:'expert:'+member.id,version:member.version}))].map(row=>[row.key,row])).values()];
}
export function isLocalAssetInstalled(entry,userId) {
  if(!entry)return false;
  const state=readState(userId);
  return requiredLocalPackages(entry).every(row=>state.packages[row.key]?.includes(row.version));
}
/* 「去安装」按钮：data-asset-locate 由 collab/space-assets.js 统一处理，这里只拼 HTML，不引入协作模块以免改变模块求值顺序 */
function assetLocateButton(key) {
  return '<button type="button" class="asset-locate-link" data-asset-locate="'+String(key).replace(/[&<>"']/g,ch=>'&#'+ch.charCodeAt(0)+';')+'">去安装</button>';
}
/* 返回给 toast 的提示带「去安装」按钮（HTML），点击后定位到协作开发「更多」里的对应卡片（collab/space-assets.js） */
export function localAssetInstallError(entry,userId) {
  if(isLocalAssetInstalled(entry,userId))return '';
  const team=String(entry?.key || '').startsWith('team:');
  return '当前处理人尚未在本机安装该'+(team?'智能体团队':'智能体')+'及空间所需版本，安装后再执行。'+assetLocateButton(entry?.key || '');
}
