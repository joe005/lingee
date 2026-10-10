import { cvWorkspace, cvCurrentUserName, cvCanAccessWorkspace } from '../collab/data.js';
import { EX, MY_EXPERTS, rebuildExperts, xesc } from './data.js';
import { TEAMS, saveTeams } from './store.js';
import { toast } from '../../core/toast.js';
import { getLoginAccount, getLoginPersonId, getPlatformIdentity } from '../login.js';

/* 原型来源标记独立保存；当前工作区模拟租户，已有个人配置保持原结构。 */
const KEY='lingee.expert-layers.v1';
function records(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch(_){return {};}}
export function assetOwnerKey(){return getLoginPersonId()||('login:'+getLoginAccount());}
export function canShareNewAsset(kind,item){
  if(!cvWorkspace)return {ok:false,message:'请先选择协作空间，再共享到租户'};
  if(kind==='team'&&item.members.some(id=>!EX[id]||layerOf('expert',EX[id])==='personal'||!layerVisible('expert',EX[id])))return {ok:false,message:'请先将团内个人智能体共享到当前租户'};
  return {ok:true};
}
export function setNewAssetScope(kind,item){
  const check=canShareNewAsset(kind,item);
  if(!check.ok)return check;
  const data=records();
  data[kind+':'+item.id]={workspace:cvWorkspace,owner:cvCurrentUserName()};
  try{localStorage.setItem(KEY,JSON.stringify(data));return {ok:true};}
  catch(_){return {ok:false,message:'租户共享保存失败，请重试'};}
}
export function layerOf(kind,item){
  if(item.source==='tenant')return 'shared';
  if(kind==='team'?item.preset:!item.mine)return 'builtin';
  return records()[kind+':'+item.id]?.workspace?'shared':'personal';
}
export function assetSourceBadge(kind,item){
  const layer=layerOf(kind,item);
  return `<span class="x-badge asset-source-badge asset-source-${layer}">${{builtin:'金蝶官方',shared:'企业自建',personal:'个人开发'}[layer]}</span>`;
}
export function layerVisible(kind,item){
  const rec=records()[kind+':'+item.id];
  if(layerOf(kind,item)==='shared'){
    const tenantId=item.tenantId||rec?.workspace;
    if(!tenantId)return false;
    const accountTenant=getPlatformIdentity()?.tenantId;
    if(accountTenant)return tenantId===accountTenant&&(!cvWorkspace||tenantId===cvWorkspace);
    return cvWorkspace?tenantId===cvWorkspace:cvCanAccessWorkspace(tenantId,cvCurrentUserName());
  }
  return !item.ownerId||item.ownerId===assetOwnerKey();
}
export function layerActions(){return '';}
export function layerToolbar(kind,items,selected){
  const tabs=document.querySelector('[data-layer-tabs="'+kind+'"]');if(!tabs)return;
  tabs.querySelectorAll('[data-layer]').forEach(btn=>{
    const key=btn.dataset.layer;btn.classList.toggle('active',key===selected);btn.setAttribute('aria-pressed',String(key===selected));
    btn.querySelector('span').textContent=items.filter(item=>layerVisible(kind,item)&&(key==='all'||layerOf(kind,item)===key)).length;
  });
}
export function handleLayerAction(event){
  const btn=event.target.closest('[data-layer-action]');if(!btn)return false;
  event.stopPropagation();
  const {layerKind:kind,layerId:id,layerAction:action}=btn.dataset;
  const item=kind==='expert'?EX[id]:TEAMS.find(t=>t.id===id);if(!item)return true;
  const data=records(),key=kind+':'+id;
  if(action==='share'){
    if(!cvWorkspace){toast('请先选择协作空间，再共享到租户','warning');return true;}
    if(kind==='team'&&item.members.some(id=>!EX[id]||layerOf('expert',EX[id])==='personal'||!layerVisible('expert',EX[id]))){toast('请先将团内个人智能体共享到当前租户','warning');return true;}
    data[key]={workspace:cvWorkspace,owner:cvCurrentUserName()};
  }else if(action==='withdraw'){
    if(data[key]?.owner!==cvCurrentUserName())return true;
    if(kind==='expert'&&TEAMS.some(t=>layerOf('team',t)==='shared'&&t.members.includes(id))){toast('该智能体被共享智能体团队引用，请先取消智能体团队共享','warning');return true;}
    delete data[key];
  }else{
    const copy=JSON.parse(JSON.stringify(item));copy.id='my-'+kind+'-'+Date.now();copy.name+='（副本）';copy.by='我创建的';copy.ownerId=assetOwnerKey();
    if(kind==='expert'){copy.mine=true;MY_EXPERTS.push(copy);rebuildExperts();}else{copy.preset=false;TEAMS.push(copy);}
    saveTeams();toast('已复制到个人开发，可点击卡片编辑','success');return true;
  }
  try{localStorage.setItem(KEY,JSON.stringify(data));toast(action==='share'?'已共享到当前租户':'已取消共享','success');}catch(_){toast('保存失败，请重试','warning');}
  return true;
}
