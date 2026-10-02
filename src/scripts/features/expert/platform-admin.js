import { REVIEW_KEY, countAssetReviews, renderAssetReviewCards, openAssetReview } from './asset-review.js';
import { cvWorkspace, cvWorkspaceName, cvCanAccessWorkspace, cvCurrentUserName } from '../collab/data.js';
import { $, $$ } from '../../core/dom.js';
import { showView } from '../../core/view.js';
import { getPlatformIdentity, LOGIN_KEY } from '../login.js';
import { EXPERTS, PRESET_TEAMS, setBuiltinExperts, xav, xesc } from './data.js';
import { setBuiltinTeams } from './store.js';
import { cvRenderExperts } from '../collab/experts.js';
import { renderExpertGrid } from './library.js';
import { bumpVersion, compareVersions, normalizeVersion } from './versioning.js';

/* 同一浏览器内模拟平台发布和客户端安装；ZIP 本体不会写入 localStorage。 */
const META_KEY='lingee.platform.meta.v1';
const VERSION_KEY='lingee.platform.versions.v1';
const INSTALL_KEY='lingee.platform.installed.v1';
const clone=value=>JSON.parse(JSON.stringify(value));
const key=(kind,id)=>kind+':'+id;
const now=()=>new Date().toLocaleString('zh-CN',{hour12:false});
function read(name,fallback){try{const value=JSON.parse(localStorage.getItem(name));return value&&typeof value==='object'?value:clone(fallback);}catch(_){return clone(fallback);}}
function write(name,value){try{localStorage.setItem(name,JSON.stringify(value));return true;}catch(_){return false;}}
const originals={expert:EXPERTS.filter(e=>!e.mine).map(clone),team:PRESET_TEAMS.map(clone)};
const retiredSeedKeys=new Set(['expert:frontend-engineer','expert:ux-designer','expert:cosmic-form','expert:cosmic-workflow','expert:cosmic-report','expert:cosmic-plugin','expert:cosmic-api','team:kingdee-saas-implementation','team:kingdee-secondary-dev']);
const retiredDemoTeams=new Set(['team:cloud-delivery-team','team:tenant-ws-build-build-delivery-team']);
function retiredSeed(item){
  if(!item)return false;
  const id=key(item.kind,item.id);
  return (item.editor==='平台初始数据'&&retiredSeedKeys.has(id))
    ||(retiredDemoTeams.has(id)&&['平台初始数据','租户示例数据'].includes(item.editor));
}
let meta={},versions={},installed={},tab='expert',statusTab='all',dialogConfirm=null;
function seed(){
  meta=read(META_KEY,{});versions=read(VERSION_KEY,{});installed=read(INSTALL_KEY,{});
  let changed=false;
  /* Legacy v1/v2 were sequence numbers. Preserve their order as 1.0.0/1.1.0. */
  for(const [id,item] of Object.entries(meta)){
    for(const field of ['activeVersion','pendingVersion']){
      const next=normalizeVersion(item[field]);
      if(item[field]!==next){item[field]=next;changed=true;}
    }
    if(installed[id]){const next=normalizeVersion(installed[id]);if(installed[id]!==next){installed[id]=next;changed=true;}}
  }
  for(const history of Object.values(versions))for(const row of history){
    const next=normalizeVersion(row.version);
    if(row.version!==next){row.version=next;changed=true;}
    if(row.data?.memberRefs){
      if(!Array.isArray(row.data.members))row.data.members=row.data.memberRefs.map(ref=>ref.id);
      delete row.data.memberRefs;changed=true;
    }
  }
  for(const kind of ['expert','team'])for(const item of originals[kind]){
    const id=key(kind,item.id);
    const snapshot=clone(item);
    if(meta[id]){
      if(meta[id].editor==='平台初始数据'&&versions[id]?.length===1&&versions[id][0].author==='Lingee'&&JSON.stringify(versions[id][0].data)!==JSON.stringify(snapshot)){
        versions[id][0].data=snapshot;changed=true;
      }
      continue;
    }
    meta[id]={kind,id:item.id,status:'online',activeVersion:'1.0.0',pendingVersion:'',modified:now(),editor:'平台初始数据'};
    versions[id]=[{version:'1.0.0',data:snapshot,note:'初始标品定义',at:now(),author:'Lingee'}];
    installed[id]='1.0.0';changed=true;
  }
  /* 广场样例只发布到模拟云端，客户端需主动安装。 */
  for(const [kind,id,name,base] of [
    ['expert','cloud-delivery-advisor','交付顾问',originals.expert[0]]
  ]){
    const itemKey=key(kind,id);if(!base)continue;
    if(meta[itemKey]){
      const row=versions[itemKey]?.[0];
      if(kind==='expert'&&meta[itemKey].editor==='平台初始数据'&&row&&!row.data.skills?.length&&base.skills?.length){row.data.skills=clone(base.skills);changed=true;}
      continue;
    }
    const data={...clone(base),id,name,desc:'云端发布的交付协作能力包，安装后可在官方列表中使用。'};
    meta[itemKey]={kind,id,status:'online',activeVersion:'1.0.0',pendingVersion:'',modified:now(),editor:'平台初始数据'};
    versions[itemKey]=[{version:'1.0.0',data,note:'新增交付协作能力与推荐提问。',at:now(),author:'Lingee'}];changed=true;
  }
  /* 租户管理演示数据只在缺失时补齐，不覆盖已有导入或审核结果。 */
  const tenantId='ws-build',tenantName=cvWorkspaceName(tenantId);
  const tenantExperts=[
    ['build-requirements','业务需求专家','software-product-manager','梳理租户业务流程、需求边界和验收标准。'],
    ['build-delivery','交付实施专家','software-team-lead','协调租户项目的实施计划、成员分工与交付验收。']
  ];
  for(const [slug,name,baseId,desc] of tenantExperts){
    const base=originals.expert.find(item=>item.id===baseId);if(!base)continue;
    const id=`tenant-${tenantId}-${slug}`,itemKey=key('expert',id);
    if(meta[itemKey]){
      const row=versions[itemKey]?.[0];
      if(meta[itemKey].editor==='租户示例数据'&&row&&!row.data.skills?.length&&base.skills?.length){row.data.skills=clone(base.skills);changed=true;}
      continue;
    }
    const data={...clone(base),id,name,desc,source:'tenant',tenantId,by:tenantName};
    meta[itemKey]={kind:'expert',id,source:'tenant',tenantId,status:'online',activeVersion:'1.0.0',pendingVersion:'',modified:now(),editor:'租户示例数据'};
    versions[itemKey]=[{version:'1.0.0',data,note:'租户示例专家',at:now(),author:tenantName}];changed=true;
  }
  /* 已安装的 1.0.0 保持不变；尚未改动的原厂种子发布 1.1.0 演示版本。 */
  for(const [kind,id,note,extraTag] of [
    ['expert','cosmic-product-manager','演示更新：补充需求边界与验收条件梳理。','验收条件'],
    ['expert','general-app-development-expert','演示更新：增强问题定位与回归验证。','问题定位'],
    ['team','cosmic-app-dev','演示更新：需求专家升级，并优化交付分工。','交付分工'],
    ['team','general-app-dev','演示更新：开发专家升级，并强化质量收口。','质量收口']
  ]){
    const itemKey=key(kind,id),item=meta[itemKey],history=versions[itemKey];
    if(item?.editor!=='平台初始数据'||item.status!=='online'||item.activeVersion!=='1.0.0'||item.pendingVersion||history?.length!==1||history[0].version!=='1.0.0')continue;
    const data=clone(history[0].data);
    data.desc=`${data.desc.replace(/[。.]$/,'')}；${note.replace(/^演示更新：/,'').replace(/。$/,'')}。`;
    const field=kind==='team'?'domains':'tags';
    data[field]=[...new Set([...(data[field]||[]),extraTag])];
    history.push({version:'1.1.0',data,note,at:now(),author:'Lingee 演示'});
    item.activeVersion='1.1.0';item.modified=now();changed=true;
  }
  for(const expert of originals.expert){
    const itemKey=key('expert',expert.id),history=versions[itemKey];
    if(meta[itemKey]?.editor!=='平台初始数据'||!history?.every(row=>['Lingee','Lingee 演示'].includes(row.author)))continue;
    for(const row of history)if(!row.data.skills?.length&&expert.skills?.length){row.data.skills=clone(expert.skills);changed=true;}
  }
  for(const [id,item] of Object.entries(meta)){
    if(!item.activeVersion&&(item.status==='online'||item.status==='offline')){item.activeVersion=latest(id)?.version||'';changed=true;}
  }
  if(changed){write(META_KEY,meta);write(VERSION_KEY,versions);write(INSTALL_KEY,installed);}
}
function persist(extra=[]){
  const entries=[[META_KEY,meta],[VERSION_KEY,versions],...extra.map(entry=>[entry.name,entry.value])],before=[];
  try{for(const [name,value] of entries){before.push([name,localStorage.getItem(name)]);localStorage.setItem(name,JSON.stringify(value));}return true;}
  catch(_){for(const [name,value] of before)try{if(value===null)localStorage.removeItem(name);else localStorage.setItem(name,value);}catch(__){}return false;}
}
function latest(id){const rows=versions[id]||[];return rows[rows.length-1]||null;}
function version(id,n){return (versions[id]||[]).find(row=>row.version===normalizeVersion(n))||null;}
function active(id){return version(id,meta[id]?.activeVersion);}
function visibleStatus(item){return item.pendingVersion?'draft':item.status;}
function label(id){return latest(id)?.data?.name||meta[id]?.id||'未命名';}
function identity(){try{return sessionStorage.getItem(LOGIN_KEY)?getPlatformIdentity():null;}catch(_){return null;}}
export function isFactoryAdmin(){return identity()?.role==='factory'&&platformMode()==='factory';}
function platformMode(){return $('#view-platform').dataset.platformMode||identity()?.role||'factory';}
function previewTenantId(){const user=identity();return user?.role==='tenant'?user.tenantId:'ws-build';}
function inScope(item){return !!item&&!retiredSeed(item)&&(platformMode()==='factory'?!item.tenantId:item.tenantId===previewTenantId());}
export function canViewPlatformReview(row){return !!sessionStorage.getItem(LOGIN_KEY)&&!!row&&(platformMode()==='factory'||row.tenantId===previewTenantId());}
function canEdit(){return identity()?.role===platformMode();}
function canManage(item){return canEdit()&&inScope(item);}
function currentTenant(){return identity()?.tenantId||cvWorkspace||'';}
function availableToClient(item){return !retiredSeed(item)&&(!item.tenantId||item.tenantId===currentTenant()||!cvWorkspace&&cvCanAccessWorkspace(item.tenantId,cvCurrentUserName()));}
function refreshAccess(){
  const user=identity(),mode=platformMode(),signedIn=!!sessionStorage.getItem(LOGIN_KEY),editable=canEdit();
  $('#platformDenied').classList.toggle('hidden',signedIn);$('#platformBody').classList.toggle('hidden',!signedIn);
  $('#platformIntro').textContent=mode==='factory'?'查看金蝶原厂数字员工与专家团。':'查看租户数字员工与专家团。';
  $('#platformDeniedTitle').textContent=mode==='factory'?'当前账号没有原厂管理权限':'当前账号没有租户管理权限';
  $('#platformDeniedHint').textContent=mode==='factory'?'请使用金蝶原厂管理员账号。':'请使用租户管理员账号。';
  if(!signedIn){$('#platformList').innerHTML='';return;}
  $('#platformReadOnly').classList.toggle('hidden',editable);
  $('#platformImport').classList.toggle('hidden',!editable);
  renderCards();
}
export function assetReviewDialog(title,body,onConfirm,confirmText='确认'){$('#platformDialogTitle').textContent=title;$('#platformDialogBody').innerHTML=body;$('#platformDialogConfirm').textContent=confirmText;dialogConfirm=onConfirm;$('#platformDialog').classList.remove('hidden');}
export function assetReviewClose(){$('#platformDialog').classList.add('hidden');dialogConfirm=null;}
function renderCards(){
  decorateClient();
  document.dispatchEvent(new CustomEvent('lingee:cloud-assets-changed'));
  const kw=$('#platformSearch').value.trim().toLowerCase();
  const tenantId=platformMode()==='tenant'?previewTenantId():'';
  const assets=Object.entries(meta).filter(([id,item])=>inScope(item)&&!!latest(id));
  const reviewCount=(kind,statuses)=>countAssetReviews({kind,statuses,tenantId});
  for(const kind of ['expert','team']){
    const count=assets.filter(([,item])=>item.kind===kind).length+reviewCount(kind,['pending','rejected']);
    $(`[data-platform-type-count="${kind}"]`).textContent=`(${count})`;
  }
  const selected=assets.filter(([,item])=>item.kind===tab);
  const counts={
    all:selected.length+reviewCount(tab,['pending','rejected']),
    draft:selected.filter(([,item])=>visibleStatus(item)==='draft').length,
    review:reviewCount(tab,['pending']),
    online:selected.filter(([,item])=>visibleStatus(item)==='online').length,
    rejected:reviewCount(tab,['rejected']),
    offline:selected.filter(([,item])=>visibleStatus(item)==='offline').length
  };
  for(const [status,count] of Object.entries(counts))$(`[data-platform-count="${status}"]`).textContent=count;
  $('#platformImport').classList.toggle('hidden',!canEdit());
  $('#platformImport').textContent=tab==='expert'?'导入数字员工 ZIP':'导入专家团 ZIP';
  $$('.platform-tabs button').forEach(button=>{const on=button.dataset.platformTab===tab;button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on));});
  $$('.platform-status-tabs button').forEach(button=>{const on=button.dataset.platformStatus===statusTab;button.classList.toggle('on',on);button.setAttribute('aria-pressed',String(on));});
  const rows=Object.entries(meta).filter(([id,m])=>inScope(m)&&m.kind===tab&&latest(id)&&!['review','rejected'].includes(statusTab)&&(statusTab==='all'||visibleStatus(m)===statusTab)&&(!kw||`${label(id)} ${m.id}`.toLowerCase().includes(kw))).sort((a,b)=>String(b[1].modified).localeCompare(String(a[1].modified)));
  const cards=rows.map(([id,m])=>{
    const row=latest(id),d=row.data,team=m.kind==='team';
    const face=team?`<span class="platform-faces">${(d.members||[]).slice(0,4).map(memberId=>{const expert=latest(key('expert',memberId))?.data;return expert?`<img src="${xav(expert.k)}" alt="">`:'';}).join('')}</span>`:`<img class="x-av" src="${xav(d.k)}" alt="">`;
    const source=xesc(m.tenantId?cvWorkspaceName(m.tenantId):'原厂'),tags=(team?d.domains:d.tags)||[],updated=String(row.at||'').replace(/:\d{2}$/,'');
    const status=visibleStatus(m);
    return `<button type="button" class="app-card x-card platform-card" data-platform-card="${xesc(id)}"><div class="card-top">${face}<div class="card-titles"><div class="card-title-row"><span class="card-title">${xesc(d.name)}</span></div><div class="x-sub">${source} · ${team?'专家团 · '+(d.members||[]).length+' 位专家':xesc(d.role||'专家')}</div></div><span class="platform-card-version">v${row.version}${m.pendingVersion?' 草稿':''}</span></div><div class="card-desc">${xesc(d.desc||'暂无简介')}</div><div class="card-tags">${tags.slice(0,3).map(value=>`<span class="ptag">${xesc(value)}</span>`).join('')}</div><div class="platform-card-meta"><span class="platform-card-status ${status}">${status==='draft'?'草稿':status==='offline'?'已下架':'已上架'}</span><time title="${xesc(row.at)}">更新于 ${xesc(updated)}</time></div></button>`;
  }).join('');
  const reviewStatuses=statusTab==='all'?['pending','rejected']:statusTab==='review'?['pending']:statusTab==='rejected'?['rejected']:[];
  const reviewCards=reviewStatuses.length?renderAssetReviewCards(kw,{kind:tab,statuses:reviewStatuses,tenantId}):'';
  $('#platformList').innerHTML=cards+reviewCards||`<div class="platform-empty">暂无符合条件的${tab==='team'?'专家团':'数字员工'}。</div>`;
}
function showCard(id){
  const m=meta[id],row=latest(id);if(!inScope(m)||!row)return;
  const d=row.data,team=m.kind==='team',members=d.members||[];
  const status=visibleStatus(m);
  const manageActions=canManage(m)?(m.pendingVersion?`<button type="button" class="platform-btn primary" data-platform-publish="${xesc(id)}">上架 v${m.pendingVersion}</button>`:m.activeVersion?`<button type="button" class="platform-link" data-platform-toggle="${xesc(id)}">${m.status==='offline'?'重新上架':'下架'}</button>`:''):'';
  assetReviewDialog(`${team?'专家团':'数字员工'}详情`,`<div class="platform-detail-headline"><strong>${xesc(d.name)}</strong><span>v${row.version}</span></div><dl class="platform-info-list"><dt>来源</dt><dd>${xesc(m.tenantId?cvWorkspaceName(m.tenantId):'原厂')}</dd><dt>状态</dt><dd>${status==='draft'?'草稿':status==='offline'?'已下架':'已上架'}</dd><dt>当前上架</dt><dd>${m.activeVersion?'v'+m.activeVersion:'暂无'}</dd><dt>编码</dt><dd>${xesc(d.id)}</dd><dt>简介</dt><dd>${xesc(d.desc||'暂无')}</dd><dt>更新说明</dt><dd>${xesc(row.note)}</dd><dt>导入包</dt><dd>${xesc(row.packageName||'初始标品定义')}</dd><dt>更新时间</dt><dd>${xesc(row.at)}</dd>${team?`<dt>引用成员</dt><dd>${members.length?members.map(memberId=>xesc(label(key('expert',memberId)))).join('、'):'未提供成员清单'}</dd>`:''}</dl><p class="platform-dialog-note">版本格式为主版本.次版本.修订号；专家团只引用成员编码，成员版本独立更新。</p><button type="button" class="platform-link" data-platform-history="${xesc(id)}">查看历史版本</button> <button type="button" class="platform-link" data-platform-export="${xesc(id)}" data-platform-version="${row.version}">导出 ZIP</button> ${manageActions}`,null,'关闭');
}
function showHistory(id){
  if(!inScope(meta[id]))return;
  const rows=(versions[id]||[]).slice().reverse();
  assetReviewDialog(`${label(id)} · 历史版本`,rows.map(row=>`<div class="platform-history"><strong>v${row.version}</strong><span>${xesc(row.note)}</span><small>${xesc(row.at)}</small><button type="button" class="platform-link" data-platform-export="${xesc(id)}" data-platform-version="${row.version}">导出</button></div>`).join('')+'<p class="platform-dialog-note">版本只读；再次导入同一编码的 ZIP 按主版本、次版本或修订号递增。</p>',null,'关闭');
}
function crc32(bytes){
  let crc=-1;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^-1)>>>0;
}
function zipManifest(manifest){
  const name=new TextEncoder().encode('manifest.json'),data=new TextEncoder().encode(JSON.stringify(manifest,null,2));
  const localSize=30+name.length+data.length,centralSize=46+name.length,bytes=new Uint8Array(localSize+centralSize+22),view=new DataView(bytes.buffer),crc=crc32(data);
  view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x0800,true);view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);
  bytes.set(name,30);bytes.set(data,30+name.length);
  const c=localSize;view.setUint32(c,0x02014b50,true);view.setUint16(c+4,20,true);view.setUint16(c+6,20,true);view.setUint16(c+8,0x0800,true);view.setUint32(c+16,crc,true);view.setUint32(c+20,data.length,true);view.setUint32(c+24,data.length,true);view.setUint16(c+28,name.length,true);bytes.set(name,c+46);
  const e=c+centralSize;view.setUint32(e,0x06054b50,true);view.setUint16(e+8,1,true);view.setUint16(e+10,1,true);view.setUint32(e+12,centralSize,true);view.setUint32(e+16,localSize,true);
  return new Blob([bytes],{type:'application/zip'});
}
function exportVersion(id,number){
  const row=version(id,number),item=meta[id];if(!row||!inScope(item))return;
  const data=clone(row.data);delete data.memberRefs;
  const manifest={schemaVersion:1,type:item.kind,...data,version:row.version,updateNote:row.note};
  const url=URL.createObjectURL(zipManifest(manifest)),a=document.createElement('a');
  a.href=url;a.download=`${item.id}-v${row.version}.zip`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function publishPending(id){
  const m=meta[id],row=version(id,m?.pendingVersion);if(!canManage(m)||!row)return;
  if(m.kind==='team')for(const memberId of row.data.members||[]){const expertId=key('expert',memberId);if(meta[expertId]?.status!=='online'||!active(expertId))return assetReviewDialog('无法上架',`<p>引用的成员 ${xesc(memberId)} 尚未上架。</p>`,null,'知道了');}
  assetReviewDialog(`上架 v${row.version}`,`<p>将「${xesc(row.data.name)}」v${row.version} 上架。客户端卡片会自动提示可升级到这个版本。</p><p class="platform-dialog-note">更新说明：${xesc(row.note)}</p>`,()=>{
    if(!canManage(m))return;
    const old=clone(m);m.activeVersion=row.version;m.pendingVersion='';m.status='online';m.modified=now();
    if(!persist()){meta[id]=old;return assetReviewDialog('上架失败','<p>浏览器存储不可用，请重试。</p>',null,'关闭');}
    assetReviewClose();renderCards();
  },'确认上架');
}
function toggleStatus(id){
  const m=meta[id];if(!canManage(m))return;
  if(m.kind==='expert'&&m.status==='online'){
    const teams=Object.entries(meta).filter(([teamId,t])=>t.kind==='team'&&t.status==='online'&&active(teamId)?.data?.members?.includes(m.id));
    if(teams.length)return assetReviewDialog('无法下架',`<p>仍被以下已上架专家团引用：${teams.map(([teamId])=>xesc(label(teamId))).join('、')}</p>`,null,'知道了');
  }
  const next=m.status==='offline'?'online':'offline';
  assetReviewDialog(next==='offline'?'下架资产':'重新上架',`<p>确定${next==='offline'?'下架':'重新上架'}「${xesc(label(id))}」？已安装的本地版本不会被删除。</p>`,()=>{
    if(!canManage(m))return;
    const old=clone(m);m.status=next;m.modified=now();if(!persist()){meta[id]=old;return assetReviewDialog('操作失败','<p>浏览器存储不可用，请重试。</p>',null,'关闭');}
    assetReviewClose();renderCards();
  },'确认');
}
function cleanName(fileName){return fileName.replace(/\.zip$/i,'').replace(/[-_]v?\d+(?:\.\d+)*$/i,'').replace(/[-_]+/g,' ').trim()||'未命名数字员工';}
function stableId(raw){const base=String(raw).toLowerCase().replace(/\.zip$/,'').replace(/[-_]v?\d+(?:\.\d+)*$/,'');const ascii=base.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(ascii.length>=3)return ascii.slice(0,64);let hash=2166136261;for(const char of base){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return 'import-'+(hash>>>0).toString(36);}
function textValue(value){return typeof value==='string'?value:typeof value==='object'&&value?value.zh||value.en||'':'';}
function normalizePackage(kind,id,manifest,file,tenantId=''){
  const previous=latest(key(kind,id))?.data||{};
  const name=textValue(manifest.name||manifest.displayName)||previous.name||cleanName(file.name);
  const desc=textValue(manifest.description||manifest.desc)||previous.desc||`从 ${file.name} 导入的${kind==='team'?'专家团':'数字员工'}包（原型展示）`;
  if(kind==='team'){
    const supplied=Array.isArray(manifest.members)?manifest.members:Array.isArray(manifest.memberRefs)?manifest.memberRefs.map(ref=>ref?.id):previous.members||[];
    const members=supplied.filter(memberId=>typeof memberId==='string'&&memberId).map(memberId=>{
      const tenantExpert=tenantId&&key('expert',`tenant-${tenantId}-${memberId}`);
      return tenantExpert&&meta[tenantExpert]?`tenant-${tenantId}-${memberId}`:memberId;
    });
    const lead=manifest.leadId||previous.leadId||members[0]||'';
    const data={...clone(previous),id,name,desc,by:'Lingee 内置',preset:true,domains:Array.isArray(manifest.domains)?manifest.domains:previous.domains||[],members,leadId:members.find(memberId=>memberId===lead||memberId===`tenant-${tenantId}-${lead}`)||members[0]||'',cmds:previous.cmds||[]};
    delete data.memberRefs;
    return data;
  }
  return {...clone(previous),id,name,desc,role:textValue(manifest.role)||previous.role||'专家',by:'Lingee 内置',k:previous.k||'eng',tags:Array.isArray(manifest.tags)?manifest.tags:previous.tags||[],modes:Array.isArray(manifest.modes)?manifest.modes:previous.modes||[],skills:Array.isArray(manifest.skills)?manifest.skills:previous.skills||[],comp:previous.comp||[],cmds:previous.cmds||[],tier:previous.tier||'auto',ro:!!previous.ro,rolePrompt:textValue(manifest.rolePrompt||manifest.systemPrompt)||previous.rolePrompt||''};
}
/* 只读取 ZIP 中一个小型 JSON 清单；没有统一清单时仍可按文件名演示导入。 */
async function inspectZip(file){
  if(!/\.zip$/i.test(file.name))throw new Error('请选择 .zip 文件');
  if(file.size>20*1024*1024)throw new Error('原型仅支持 20 MB 以内的 ZIP');
  const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);
  let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(view.getUint32(i,true)===0x06054b50){end=i;break;}}
  if(end<0)throw new Error('ZIP 结构无效，未找到目录信息');
  const count=view.getUint16(end+10,true),offset=view.getUint32(end+16,true),size=view.getUint32(end+12,true);
  if(!count||count>1000||offset+size>bytes.length)throw new Error('ZIP 目录信息无效');
  let position=offset,candidate=null;const decoder=new TextDecoder();
  for(let i=0;i<count;i++){
    if(position+46>bytes.length||view.getUint32(position,true)!==0x02014b50)throw new Error('ZIP 目录损坏');
    const nameLen=view.getUint16(position+28,true),extra=view.getUint16(position+30,true),comment=view.getUint16(position+32,true);
    const name=decoder.decode(bytes.slice(position+46,position+46+nameLen));
    if(!candidate&&/(^|\/)(expert|expert-team|manifest)\.json$/i.test(name)&&view.getUint32(position+24,true)<=128*1024){
      candidate={method:view.getUint16(position+10,true),packed:view.getUint32(position+20,true),local:view.getUint32(position+42,true)};
    }
    position+=46+nameLen+extra+comment;
  }
  let manifest={};
  if(candidate&&candidate.packed<=256*1024&&candidate.local+30<=bytes.length&&view.getUint32(candidate.local,true)===0x04034b50){
    const start=candidate.local+30+view.getUint16(candidate.local+26,true)+view.getUint16(candidate.local+28,true);
    if(start+candidate.packed<=bytes.length){
      let content=bytes.slice(start,start+candidate.packed);
      try{
        if(candidate.method===8)content=new Uint8Array(await new Response(new Blob([content]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
        if(candidate.method===0||candidate.method===8)manifest=JSON.parse(decoder.decode(content));
      }catch(_){manifest={};}
    }
  }
  return {count,manifest:manifest&&typeof manifest==='object'?manifest:{}};
}
async function importZip(file){
  const user=identity();if(!user||!canEdit())return;
  assetReviewDialog('正在读取 ZIP','<p>正在检查文件结构和包内元信息…</p>',null,'关闭');
  let parsed;try{parsed=await inspectZip(file);}catch(error){return assetReviewDialog('无法导入',`<p class="platform-dialog-error">${xesc(error.message)}</p>`,null,'关闭');}
  const manifest=parsed.manifest||{},rawId=typeof manifest.id==='string'?manifest.id:typeof manifest.expertId==='string'?manifest.expertId:typeof manifest.teamId==='string'?manifest.teamId:file.name;
  const declaredType=String(manifest.type||manifest.kind||'').toLowerCase();
  if(['expert','team','expert-team'].includes(declaredType)&&((declaredType==='expert'?'expert':'team')!==tab))return assetReviewDialog('类型不匹配',`<p class="platform-dialog-error">ZIP 清单声明的是${declaredType==='expert'?'数字员工':'专家团'}，请切换到对应页签后重新导入。</p>`,null,'关闭');
  const packageId=stableId(rawId),id=user.role==='tenant'?(packageId.startsWith(`tenant-${user.tenantId}-`)?packageId:`tenant-${user.tenantId}-${packageId}`):packageId,itemKey=key(tab,id);
  if(meta[itemKey]&&!canManage(meta[itemKey]))return assetReviewDialog('无法导入','<p class="platform-dialog-error">该编码已由另一归属方使用，请更换包编码。</p>',null,'关闭');
  const data=normalizePackage(tab,id,manifest,file,user.tenantId),previousVersion=latest(itemKey)?.version||'';
  const declaredVersion=manifest.version;
  if(declaredVersion!==undefined&&(typeof declaredVersion!=='string'||normalizeVersion(declaredVersion)!==declaredVersion))return assetReviewDialog('版本格式错误','<p class="platform-dialog-error">ZIP 中的 version 必须是三个非负整数，例如 1.2.3。</p>',null,'关闭');
  if(declaredVersion&&compareVersions(declaredVersion,previousVersion)<=0)return assetReviewDialog('版本未递增',`<p class="platform-dialog-error">包内版本 v${xesc(declaredVersion)} 必须高于当前 v${xesc(previousVersion)}。</p>`,null,'关闭');
  const next=declaredVersion||bumpVersion(previousVersion);
  if(user.role==='tenant'){data.source='tenant';data.tenantId=user.tenantId;data.by=cvWorkspaceName(user.tenantId);}
  const hasMeta=!!(manifest.name||manifest.displayName||manifest.description||manifest.desc);
  assetReviewDialog(previousVersion?`升级版本：v${previousVersion} → v${next}`:`导入新${tab==='team'?'专家团':'数字员工'}：v${next}`,`<div class="platform-import-summary"><div><strong>${xesc(data.name)}</strong> · ${previousVersion?`当前 v${xesc(meta[itemKey]?.activeVersion||'未上架')}，导入后形成草稿 <strong id="platformNextVersion">v${next}</strong>`:`导入后形成草稿 v${next}`}</div><div>文件：${xesc(file.name)}</div><div>ZIP 条目：${parsed.count} 个</div><div>编码：${xesc(id)}</div></div>${previousVersion&&!declaredVersion?'<label class="platform-version-level">升级级别<select id="platformVersionLevel"><option value="patch">修订号 · 兼容修复</option><option value="minor">次版本 · 兼容功能</option><option value="major">主版本 · 不兼容变更</option></select></label>':''}<p class="platform-dialog-note">版本格式：主版本.次版本.修订号；调整较高位时，右侧数字归零。</p><label class="platform-import-note-label">更新说明 <span>*</span><textarea id="platformImportNote" rows="3" maxlength="500" placeholder="说明本次新增或升级的内容"></textarea></label><div class="platform-dialog-error" id="platformImportError"></div>${hasMeta?'':'<p class="platform-import-warning">包内没有可识别的展示元信息，卡片名称暂按文件名生成。</p>'}<p class="platform-dialog-note">确认导入后生成草稿；上架后，客户端才能获取更新。</p>`,()=>{
    if(!identity()||identity().role!==user.role||identity().tenantId!==user.tenantId||meta[itemKey]&&!canManage(meta[itemKey]))return;
    const note=$('#platformImportNote').value.trim();if(!note){$('#platformImportError').textContent='请填写更新说明';return;}
    const chosen=declaredVersion||bumpVersion(latest(itemKey)?.version||'', $('#platformVersionLevel')?.value||'patch');
    if(compareVersions(chosen,latest(itemKey)?.version||'')<=0){$('#platformImportError').textContent='版本号必须高于现有版本';return;}
    const oldMeta=meta[itemKey]?clone(meta[itemKey]):null,oldVersions=versions[itemKey]?clone(versions[itemKey]):null;
    meta[itemKey]={kind:tab,id,source:user.role==='tenant'?'tenant':'factory',tenantId:user.tenantId,status:oldMeta?.status||'pending',activeVersion:oldMeta?.activeVersion||'',pendingVersion:chosen,modified:now(),editor:user.role==='tenant'?'租户管理员':'原厂管理员'};
    (versions[itemKey]||(versions[itemKey]=[])).push({version:chosen,data,note,at:now(),author:'平台管理员',packageName:file.name,packageBytes:file.size});
    if(!persist()){
      if(oldMeta)meta[itemKey]=oldMeta;else delete meta[itemKey];
      if(oldVersions)versions[itemKey]=oldVersions;else delete versions[itemKey];
      return assetReviewDialog('导入失败','<p>浏览器存储不可用，请重试。</p>',null,'关闭');
    }
    assetReviewClose();renderCards();
  },'确认导入');
  $('#platformVersionLevel')?.addEventListener('change',event=>{
    const selected=bumpVersion(previousVersion,event.target.value);
    $('#platformNextVersion').textContent='v'+selected;
    $('#platformDialogTitle').textContent=`升级版本：v${previousVersion} → v${selected}`;
  });
}
function installable(){return Object.entries(meta).filter(([id,m])=>availableToClient(m)&&m.status==='online'&&active(id)&&compareVersions(installed[id],active(id).version)<0).map(([id,m])=>({id,kind:m.kind,old:installed[id]||'',row:active(id)}));}
function installedSnapshot(kind,id){const itemKey=key(kind,id);return version(itemKey,installed[itemKey])?.data||null;}
function applyInstalled(){
  const experts=originals.expert.map(e=>clone(installedSnapshot('expert',e.id)||e));
  for(const [id,m] of Object.entries(meta))if(m.kind==='expert'&&!retiredSeed(m)&&!originals.expert.some(e=>e.id===m.id)&&installed[id]){const data=installedSnapshot('expert',m.id);if(data)experts.push(clone(data));}
  setBuiltinExperts(experts);
  const teams=originals.team.map(t=>clone(installedSnapshot('team',t.id)||t));
  for(const [id,m] of Object.entries(meta))if(m.kind==='team'&&!retiredSeed(m)&&!originals.team.some(t=>t.id===m.id)&&installed[id]){const data=installedSnapshot('team',m.id);if(data)teams.push(clone(data));}
  setBuiltinTeams(teams);cvRenderExperts();renderExpertGrid();decorateClient();
  document.dispatchEvent(new CustomEvent('lingee:cloud-assets-changed'));
}
export function cloudUpgradeBadge(itemKey){
  const item=meta[itemKey],current=installed[itemKey]||'';
  if(!current||item?.status!=='online'||compareVersions(active(itemKey)?.version,current)<=0)return '';
  return `<button type="button" class="expert-upgrade-badge" data-cloud-update="${xesc(itemKey)}" aria-label="将${xesc(active(itemKey).data.name)}升级至 v${active(itemKey).version}" title="本地 v${current}，云端 v${active(itemKey).version}"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M10 14V6m-3 3 3-3 3 3"/></svg>升级至 v${active(itemKey).version}</button>`;
}
function decorateClient(){
  for(const el of document.querySelectorAll('[data-cv-expert], #expertGrid [data-expert], #expertGrid [data-team]')){
    const kind=el.hasAttribute('data-team')?'team':'expert',id=el.getAttribute('data-team')||el.getAttribute('data-cv-expert')||el.getAttribute('data-expert');
    const itemKey=key(kind,id),item=meta[itemKey];if(!item||!installed[itemKey])continue;
    el.querySelector('.platform-client-badge')?.remove();
    el.querySelector('.expert-upgrade-badge')?.remove();
    const badge=document.createElement('span');badge.className='platform-client-badge';
    badge.textContent=`v${installed[itemKey]}${item.status==='offline'?' · 已下架':''}`;
    el.querySelector('.card-title-row')?.appendChild(badge);
    const upgrade=cloudUpgradeBadge(itemKey);
    if(upgrade)(el.querySelector('.asset-card-upgrade-anchor')||el.querySelector('.card-title-row'))?.insertAdjacentHTML('beforeend',upgrade);
  }
}

function showUpdate(stage='list',error=''){
  if(stage==='checking')$('#platformUpdateOverlay').classList.remove('hidden');
  const rows=installable(),offline=Object.entries(meta).filter(([id,m])=>m.status==='offline'&&installed[id]);
  let html='';
  if(stage==='checking')html='<div class="platform-empty">正在检查更新…</div>';
  else if(stage==='loading')html='<div class="platform-empty">正在校验并安装更新…</div>';
  else if(stage==='success')html='<div class="platform-empty">更新成功，客户端已展示安装的官方版本。</div>';
  else if(stage==='error')html=`<div class="platform-dialog-error">${xesc(error)}。旧版本仍可使用，请重试。</div>`;
  else html=rows.length?rows.map(({kind,old,row})=>`<div class="platform-update-row"><strong>${xesc(row.data.name)}</strong><span>${kind==='expert'?'数字员工':'专家团'}</span><span>${old?'v'+old:'未安装'} → v${row.version}</span><small>${xesc(row.note)}</small></div>`).join(''):'<div class="platform-empty">当前已是最新版本</div>';
  if(offline.length)html+=`<div class="platform-offline">官方已下架：${offline.map(([id])=>xesc(label(id))).join('、')}。本地已安装版本仍可使用。</div>`;
  $('#platformUpdateBody').innerHTML=html;
  $('#platformUpdateAll').classList.toggle('hidden',!rows.length||['loading','checking','success'].includes(stage));
  $('#platformUpdateAll').textContent=stage==='error'?'重试更新':`更新全部（${rows.length}）`;
}
function validateInstall(rows){
  for(const item of rows){
    if(!item.row?.data?.id||!item.row.data.name)return '发布内容不完整';
    if(item.kind!=='team')continue;
    for(const memberId of item.row.data.members||[]){const id=key('expert',memberId),incoming=rows.some(row=>row.id===id);if(meta[id]?.status!=='online'||!active(id)||(!installed[id]&&!incoming))return `${item.row.data.name} 缺少可安装的成员 ${memberId}`;}
  }
  return '';
}
function doInstall(){
  const rows=installable();if(!rows.length)return showUpdate();showUpdate('loading');
  setTimeout(()=>{
    if($('#platformFailOnce').checked){$('#platformFailOnce').checked=false;return showUpdate('error','模拟下载失败');}
    const error=validateInstall(rows);if(error)return showUpdate('error',error);
    const next={...installed};for(const item of rows)next[item.id]=item.row.version;
    if(!write(INSTALL_KEY,next))return showUpdate('error','本地存储不可用');
    installed=next;applyInstalled();showUpdate('success');
  },500);
}
export function initPlatformAdmin(){
  seed();applyInstalled();
  $$('[data-platform-nav]').forEach(button=>button.addEventListener('click',()=>{assetReviewClose();refreshAccess();}));
  $('#platformBack')?.addEventListener('click',()=>showView('collab'));
  $('[data-platform-back]')?.addEventListener('click',()=>showView('collab'));
  $$('.platform-tabs button').forEach(button=>button.addEventListener('click',()=>{tab=button.dataset.platformTab;renderCards();}));
  $$('.platform-status-tabs button').forEach(button=>button.addEventListener('click',()=>{statusTab=button.dataset.platformStatus;renderCards();}));
  $('#platformSearch').addEventListener('input',renderCards);
  $('#platformImport').addEventListener('click',()=>$('#platformZipFile').click());
  $('#platformZipFile').addEventListener('change',event=>{const file=event.target.files?.[0];event.target.value='';if(file)importZip(file);});
  $('#platformList').addEventListener('click',event=>{const review=event.target.closest('[data-asset-review]');if(review){openAssetReview(review.dataset.assetReview,renderCards);return;}const card=event.target.closest('[data-platform-card]');if(card)showCard(card.dataset.platformCard);});
  $('#platformDialogCancel').addEventListener('click',assetReviewClose);
  $('#platformDialogConfirm').addEventListener('click',()=>{if(dialogConfirm)dialogConfirm();else assetReviewClose();});
  $('#platformDialogBody').addEventListener('click',event=>{const history=event.target.closest('[data-platform-history]'),toggle=event.target.closest('[data-platform-toggle]'),publish=event.target.closest('[data-platform-publish]'),download=event.target.closest('[data-platform-export]');if(history)showHistory(history.dataset.platformHistory);if(toggle)toggleStatus(toggle.dataset.platformToggle);if(publish)publishPending(publish.dataset.platformPublish);if(download)exportVersion(download.dataset.platformExport,download.dataset.platformVersion);});
  document.addEventListener('click',event=>{
    const button=event.target.closest('#view-collab [data-cloud-update],#view-collab [data-market-install]');if(!button)return;
    event.stopPropagation();installCloudAsset(button.dataset.cloudUpdate||button.dataset.marketInstall);
  },true);
  window.addEventListener('storage',event=>{
    if(![META_KEY,VERSION_KEY,INSTALL_KEY,REVIEW_KEY].includes(event.key))return;
    if(event.key!==REVIEW_KEY){meta=read(META_KEY,{});versions=read(VERSION_KEY,{});installed=read(INSTALL_KEY,{});applyInstalled();}
    if(!$('#view-platform').classList.contains('hidden'))renderCards();
  });
  $('#platformUpdateClose').addEventListener('click',()=>$('#platformUpdateOverlay').classList.add('hidden'));
  $('#platformUpdateLater').addEventListener('click',()=>$('#platformUpdateOverlay').classList.add('hidden'));
  $('#platformUpdateAll').addEventListener('click',doInstall);
  new MutationObserver(decorateClient).observe($('#cvExpertSections'),{childList:true});
  new MutationObserver(decorateClient).observe($('#expertGrid'),{childList:true});
  document.addEventListener('lingee:auth-changed',refreshAccess);refreshAccess();
}

/* 广场通过此接口读取平台已上架版本，安装与个人定义的存储独立。 */
export function cloudCatalog(){
  return Object.entries(meta).filter(([id,item])=>item.status==='online'&&active(id)&&availableToClient(item)).map(([id,item])=>({key:id,kind:item.kind,data:clone(active(id).data),version:active(id).version,note:active(id).note,installed:installed[id]||''}));
}
function cloudInstallRows(id,reinstall=false){
  const rows=new Map();
  function collect(itemKey){
    const item=meta[itemKey],row=active(itemKey);
    if(!item||item.status!=='online'||!row||!availableToClient(item))throw new Error('内容或依赖版本尚未上架');
    if(compareVersions(installed[itemKey],row.version)>=0&&!(reinstall&&itemKey===id))return;
    if(rows.has(itemKey))return;
    rows.set(itemKey,{id:itemKey,kind:item.kind,old:installed[itemKey]||'',row});
    if(item.kind==='team')for(const memberId of row.data.members||[])collect(key('expert',memberId));
  }
  collect(id);return [...rows.values()];
}
export function installCloudAsset(id){
  let rows;try{rows=cloudInstallRows(id,true);}catch(error){return assetReviewDialog('无法安装',`<p class="platform-dialog-error">${xesc(error.message)}</p>`,null,'关闭');}
  if(!rows.length)return assetReviewDialog('已安装', '<p>当前已是最新版本。</p>',null,'关闭');
  const row=active(id),old=installed[id]||'';
  const reinstall=compareVersions(old,row.version)>=0;
  const kind=meta[id].kind==='team'?'专家团':'数字员工';
  const dependencyCount=rows.length-1;
  const body=`<div class="platform-install-target"><span class="platform-install-type">${kind}</span><strong>${xesc(row.data.name)}</strong></div>
    <div class="platform-install-versions"><div><span>当前版本</span><strong>${old?'v'+old:'未安装'}</strong></div><span class="platform-install-arrow" aria-hidden="true">→</span><div><span>目标版本</span><strong>v${row.version}</strong></div></div>
    <div class="platform-install-section"><strong>${reinstall?'版本内容':old?'本次更新':'版本内容'}</strong><p>${xesc(row.note||'暂无更新说明')}</p></div>
    ${dependencyCount?`<div class="platform-install-dependency">将同步更新 ${dependencyCount} 位依赖的数字员工，确认后一起生效。</div>`:''}
    <details class="platform-install-demo"><summary>演示选项</summary><label><input type="checkbox" id="marketFailOnce"> 模拟本次安装失败</label></details>`;
  assetReviewDialog(reinstall?`重新安装${kind}`:old?`升级${kind}`:`安装${kind}`,body,()=>{
    const simulateFailure=$('#marketFailOnce')?.checked;
    assetReviewDialog('正在安装','<p>正在校验版本及成员依赖…</p>',null,'关闭');
    setTimeout(()=>{
      let current;try{current=cloudInstallRows(id,true);}catch(error){return assetReviewDialog('安装失败',`<p>${xesc(error.message)}，旧版本保持不变。</p>`,()=>installCloudAsset(id),'重试');}
      const error=simulateFailure?'模拟下载失败':validateInstall(current);
      if(error)return assetReviewDialog('安装失败',`<p class="platform-dialog-error">${xesc(error)}，旧版本和个人配置保持不变。</p>`,()=>installCloudAsset(id),'重试');
      const next={...installed};for(const item of current)next[item.id]=item.row.version;
      if(!write(INSTALL_KEY,next))return assetReviewDialog('安装失败','<p>本地存储不可用，旧版本保持不变。</p>',()=>installCloudAsset(id),'重试');
      installed=next;applyInstalled();assetReviewDialog('安装完成','<p>内容已安装，可在“我的”中的官方或租户标签查看；专家团缺失的成员数字员工已一并安装。</p>',null,'关闭');
    },350);
  },reinstall?'确认重新安装':old?'确认升级':'确认安装');
}

export function publishedExpertRef(id){
  const itemKey=key('expert',id),item=meta[itemKey];
  return item?.status==='online'&&active(itemKey)&&availableToClient(item)?{id}:null;
}
export function publishReviewedBundle(bundle,note,reviewEntry){
  if(!isFactoryAdmin())return '当前账号没有审核权限';
  const oldMeta=clone(meta),oldVersions=clone(versions),numbers={};
  for(const item of bundle){const id=key(item.kind,item.data.id);numbers[id]=bumpVersion(latest(id)?.version);}
  for(const item of bundle){
    const data=clone(item.data),id=key(item.kind,data.id),number=numbers[id];
    if(item.kind==='team')for(const memberId of data.members||[]){const expertId=key('expert',memberId);if(!numbers[expertId]&&!(meta[expertId]?.status==='online'&&active(expertId))){meta=oldMeta;versions=oldVersions;return '引用的成员尚未发布，无法发布专家团';}}
    delete data.memberRefs;
    meta[id]={kind:item.kind,id:data.id,source:'tenant',tenantId:data.tenantId,status:'online',activeVersion:number,pendingVersion:'',modified:now(),editor:'平台管理员'};
    (versions[id]||(versions[id]=[])).push({version:number,data,note,at:now(),author:data.by});
  }
  if(!persist([reviewEntry])){meta=oldMeta;versions=oldVersions;return '保存失败，发布内容保持原样，请重试';}
  renderCards();return '';
}
