import { $, $$ } from '../../core/dom.js';
import { showView } from '../../core/view.js';
import { getRole, LOGIN_KEY } from '../login.js';
import { EXPERTS, PRESET_TEAMS, setBuiltinExperts, xav, xesc } from './data.js';
import { setBuiltinTeams } from './store.js';
import { cvRenderExperts } from '../collab/experts.js';
import { renderExpertGrid } from './library.js';

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
let meta={},versions={},installed={},tab='expert',dialogConfirm=null;
function seed(){
  meta=read(META_KEY,{});versions=read(VERSION_KEY,{});installed=read(INSTALL_KEY,{});
  let changed=false;
  for(const kind of ['expert','team'])for(const item of originals[kind]){
    const id=key(kind,item.id);
    if(meta[id])continue;
    const snapshot=clone(item);
    if(kind==='team')snapshot.memberRefs=item.members.map(memberId=>({id:memberId,version:1}));
    meta[id]={kind,id:item.id,status:'online',activeVersion:1,pendingVersion:0,modified:now(),editor:'平台初始数据'};
    versions[id]=[{version:1,data:snapshot,note:'初始标品定义',at:now(),author:'Lingee'}];
    installed[id]=1;changed=true;
  }
  for(const [id,item] of Object.entries(meta)){
    if(item.activeVersion===undefined){item.activeVersion=item.status==='online'||item.status==='offline'?latest(id)?.version||0:0;item.pendingVersion=0;changed=true;}
  }
  if(changed){write(META_KEY,meta);write(VERSION_KEY,versions);write(INSTALL_KEY,installed);}
}
function persist(){
  const entries=[[META_KEY,meta],[VERSION_KEY,versions]],before=[];
  try{for(const [name,value] of entries){before.push([name,localStorage.getItem(name)]);localStorage.setItem(name,JSON.stringify(value));}return true;}
  catch(_){for(const [name,value] of before)try{if(value===null)localStorage.removeItem(name);else localStorage.setItem(name,value);}catch(__){}return false;}
}
function latest(id){const rows=versions[id]||[];return rows[rows.length-1]||null;}
function version(id,n){return (versions[id]||[]).find(row=>row.version===Number(n))||null;}
function active(id){return version(id,meta[id]?.activeVersion);}
function visibleStatus(item){return item.pendingVersion?'pending':item.status;}
function label(id){return latest(id)?.data?.name||meta[id]?.id||'未命名';}
function isAdmin(){try{return !!sessionStorage.getItem(LOGIN_KEY)&&getRole()==='owner';}catch(_){return false;}}
function refreshAccess(){const ok=isAdmin();$('#platformDenied').classList.toggle('hidden',ok);$('#platformBody').classList.toggle('hidden',!ok);renderCards();}
function dialog(title,body,onConfirm,confirmText='确认'){$('#platformDialogTitle').textContent=title;$('#platformDialogBody').innerHTML=body;$('#platformDialogConfirm').textContent=confirmText;dialogConfirm=onConfirm;$('#platformDialog').classList.remove('hidden');}
function closeDialog(){$('#platformDialog').classList.add('hidden');dialogConfirm=null;}
function renderCards(){
  const kw=$('#platformSearch').value.trim().toLowerCase(),filter=$('#platformFilter').value;
  $('#platformImport').textContent=tab==='expert'?'导入专家 ZIP':'导入专家团 ZIP';
  $$('.platform-tabs button').forEach(button=>button.classList.toggle('on',button.dataset.platformTab===tab));
  const rows=Object.entries(meta).filter(([id,m])=>m.kind===tab&&latest(id)&&(filter==='all'||visibleStatus(m)===filter)&&(!kw||`${label(id)} ${m.id}`.toLowerCase().includes(kw))).sort((a,b)=>String(b[1].modified).localeCompare(String(a[1].modified)));
  $('#platformList').innerHTML=rows.length?rows.map(([id,m])=>{
    const row=latest(id),d=row.data,team=m.kind==='team';
    const face=team?`<span class="platform-faces">${(d.members||[]).slice(0,4).map(memberId=>{const expert=latest(key('expert',memberId))?.data;return expert?`<img src="${xav(expert.k)}" alt="">`:'';}).join('')}</span>`:`<img class="x-av" src="${xav(d.k)}" alt="">`;
    const tags=(team?d.domains:d.tags)||[],updated=String(row.at||'').replace(/:\d{2}$/,'');
    const status=visibleStatus(m);
    return `<button type="button" class="app-card x-card platform-card" data-platform-card="${xesc(id)}"><div class="card-top">${face}<div class="card-titles"><div class="card-title-row"><span class="card-title">${xesc(d.name)}</span></div><div class="x-sub">官方 · ${team?'专家团 · '+(d.members||[]).length+' 位专家':xesc(d.role||'专家')}</div></div><span class="platform-card-version">v${row.version}${m.pendingVersion?' 待上架':''}</span></div><div class="card-desc">${xesc(d.desc||'暂无简介')}</div><div class="card-tags">${tags.slice(0,3).map(value=>`<span class="ptag">${xesc(value)}</span>`).join('')}</div><div class="platform-card-meta"><span class="platform-card-status ${status}">${status==='pending'?'待上架':status==='offline'?'已下架':'已上架'}</span><time title="${xesc(row.at)}">更新于 ${xesc(updated)}</time></div></button>`;
  }).join(''):'<div class="platform-empty">暂无符合条件的官方资产。点击右上角导入 ZIP。</div>';
}
function showCard(id){
  const m=meta[id],row=latest(id);if(!m||!row)return;
  const d=row.data,team=m.kind==='team',refs=d.memberRefs||[];
  const status=visibleStatus(m);
  dialog(`${team?'专家团':'专家'}详情`,`<div class="platform-detail-headline"><strong>${xesc(d.name)}</strong><span>v${row.version}</span></div><dl class="platform-info-list"><dt>来源</dt><dd>官方</dd><dt>状态</dt><dd>${status==='pending'?'待上架':status==='offline'?'已下架':'已上架'}</dd><dt>当前上架</dt><dd>${m.activeVersion?'v'+m.activeVersion:'暂无'}</dd><dt>编码</dt><dd>${xesc(d.id)}</dd><dt>简介</dt><dd>${xesc(d.desc||'暂无')}</dd><dt>更新说明</dt><dd>${xesc(row.note)}</dd><dt>导入包</dt><dd>${xesc(row.packageName||'初始标品定义')}</dd><dt>更新时间</dt><dd>${xesc(row.at)}</dd>${team?`<dt>成员版本</dt><dd>${refs.length?refs.map(ref=>`${xesc(label(key('expert',ref.id)))} v${ref.version}`).join('、'):'未提供成员清单'}</dd>`:''}</dl><p class="platform-dialog-note">导出的原型 ZIP 包含版本元信息；实际包存储和运行校验待服务端接入。</p><button type="button" class="platform-link" data-platform-history="${xesc(id)}">查看历史版本</button> <button type="button" class="platform-link" data-platform-export="${xesc(id)}" data-platform-version="${row.version}">导出 ZIP</button> ${m.pendingVersion?`<button type="button" class="platform-btn primary" data-platform-publish="${xesc(id)}">上架 v${m.pendingVersion}</button>`:m.activeVersion?`<button type="button" class="platform-link" data-platform-toggle="${xesc(id)}">${m.status==='offline'?'重新上架':'下架'}</button>`:''}`,null,'关闭');
}
function showHistory(id){
  const rows=(versions[id]||[]).slice().reverse();
  dialog(`${label(id)} · 历史版本`,rows.map(row=>`<div class="platform-history"><strong>v${row.version}</strong><span>${xesc(row.note)}</span><small>${xesc(row.at)}</small><button type="button" class="platform-link" data-platform-export="${xesc(id)}" data-platform-version="${row.version}">导出</button></div>`).join('')+'<p class="platform-dialog-note">版本只读；再次导入同一编码的 ZIP 会生成新版本。</p>',null,'关闭');
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
  const row=version(id,number),item=meta[id];if(!row||!item)return;
  const manifest={schemaVersion:1,type:item.kind,...clone(row.data),version:row.version,updateNote:row.note};
  const url=URL.createObjectURL(zipManifest(manifest)),a=document.createElement('a');
  a.href=url;a.download=`${item.id}-v${row.version}.zip`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function publishPending(id){
  const m=meta[id],row=version(id,m?.pendingVersion);if(!m||!row)return;
  if(m.kind==='team')for(const ref of row.data.memberRefs||[]){const expertId=key('expert',ref.id);if(meta[expertId]?.status!=='online'||!active(expertId)||!version(expertId,ref.version))return dialog('无法上架',`<p>成员 ${xesc(ref.id)} 的引用版本尚未上架。</p>`,null,'知道了');}
  dialog(`上架 v${row.version}`,`<p>将「${xesc(row.data.name)}」v${row.version} 上架。客户端下次检查更新时可获取这个版本。</p><p class="platform-dialog-note">更新说明：${xesc(row.note)}</p>`,()=>{
    const old=clone(m);m.activeVersion=row.version;m.pendingVersion=0;m.status='online';m.modified=now();
    if(!persist()){meta[id]=old;return dialog('上架失败','<p>浏览器存储不可用，请重试。</p>',null,'关闭');}
    closeDialog();renderCards();
  },'确认上架');
}
function toggleStatus(id){
  const m=meta[id];if(!m)return;
  if(m.kind==='expert'&&m.status==='online'){
    const teams=Object.entries(meta).filter(([teamId,t])=>t.kind==='team'&&t.status==='online'&&active(teamId)?.data?.memberRefs?.some(ref=>ref.id===m.id));
    if(teams.length)return dialog('无法下架',`<p>仍被以下已上架专家团引用：${teams.map(([teamId])=>xesc(label(teamId))).join('、')}</p>`,null,'知道了');
  }
  const next=m.status==='offline'?'online':'offline';
  dialog(next==='offline'?'下架官方资产':'重新上架',`<p>确定${next==='offline'?'下架':'重新上架'}「${xesc(label(id))}」？已安装的本地版本不会被删除。</p>`,()=>{
    const old=clone(m);m.status=next;m.modified=now();if(!persist()){meta[id]=old;return dialog('操作失败','<p>浏览器存储不可用，请重试。</p>',null,'关闭');}
    closeDialog();renderCards();
  },'确认');
}
function cleanName(fileName){return fileName.replace(/\.zip$/i,'').replace(/[-_]v?\d+(?:\.\d+)*$/i,'').replace(/[-_]+/g,' ').trim()||'未命名专家';}
function stableId(raw){const base=String(raw).toLowerCase().replace(/\.zip$/,'').replace(/[-_]v?\d+(?:\.\d+)*$/,'');const ascii=base.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(ascii.length>=3)return ascii.slice(0,64);let hash=2166136261;for(const char of base){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return 'import-'+(hash>>>0).toString(36);}
function textValue(value){return typeof value==='string'?value:typeof value==='object'&&value?value.zh||value.en||'':'';}
function normalizePackage(kind,id,manifest,file){
  const previous=latest(key(kind,id))?.data||{};
  const name=textValue(manifest.name||manifest.displayName)||previous.name||cleanName(file.name);
  const desc=textValue(manifest.description||manifest.desc)||previous.desc||`从 ${file.name} 导入的${kind==='team'?'专家团':'专家'}包（原型展示）`;
  if(kind==='team'){
    const refs=(Array.isArray(manifest.memberRefs)?manifest.memberRefs:previous.memberRefs||[]).filter(ref=>ref&&typeof ref.id==='string').map(ref=>({id:ref.id,version:Number(ref.version)||1}));
    return {...clone(previous),id,name,desc,by:'Lingee 内置',preset:true,domains:Array.isArray(manifest.domains)?manifest.domains:previous.domains||[],members:refs.map(ref=>ref.id),memberRefs:refs,leadId:manifest.leadId||previous.leadId||refs[0]?.id||'',cmds:previous.cmds||[]};
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
  if(!isAdmin())return;
  dialog('正在读取 ZIP','<p>正在检查文件结构和包内元信息…</p>',null,'关闭');
  let parsed;try{parsed=await inspectZip(file);}catch(error){return dialog('无法导入',`<p class="platform-dialog-error">${xesc(error.message)}</p>`,null,'关闭');}
  const manifest=parsed.manifest||{},rawId=typeof manifest.id==='string'?manifest.id:typeof manifest.expertId==='string'?manifest.expertId:typeof manifest.teamId==='string'?manifest.teamId:file.name;
  const declaredType=String(manifest.type||manifest.kind||'').toLowerCase();
  if(['expert','team','expert-team'].includes(declaredType)&&((declaredType==='expert'?'expert':'team')!==tab))return dialog('类型不匹配',`<p class="platform-dialog-error">ZIP 清单声明的是${declaredType==='expert'?'专家':'专家团'}，请切换到对应页签后重新导入。</p>`,null,'关闭');
  const id=stableId(rawId),itemKey=key(tab,id),data=normalizePackage(tab,id,manifest,file),next=(latest(itemKey)?.version||0)+1;
  const hasMeta=!!(manifest.name||manifest.displayName||manifest.description||manifest.desc);
  dialog(latest(itemKey)?`升级版本：v${next-1} → v${next}`:`导入新${tab==='team'?'专家团':'专家'}：v1`,`<div class="platform-import-summary"><div><strong>${xesc(data.name)}</strong> · ${latest(itemKey)?`当前 v${meta[itemKey]?.activeVersion||'未上架'}，导入后待上架 v${next}`:'导入后待上架 v1'}</div><div>文件：${xesc(file.name)}</div><div>ZIP 条目：${parsed.count} 个</div><div>编码：${xesc(id)}</div></div><label class="platform-import-note-label">更新说明 <span>*</span><textarea id="platformImportNote" rows="3" maxlength="500" placeholder="说明本次新增或升级的内容"></textarea></label><div class="platform-dialog-error" id="platformImportError"></div>${hasMeta?'':'<p class="platform-import-warning">包内没有可识别的展示元信息，卡片名称暂按文件名生成。</p>'}<p class="platform-dialog-note">确认导入后生成待上架版本；点击卡片里的“上架”后，客户端才能获取更新。</p>`,()=>{
    const note=$('#platformImportNote').value.trim();if(!note){$('#platformImportError').textContent='请填写更新说明';return;}
    const oldMeta=meta[itemKey]?clone(meta[itemKey]):null,oldVersions=versions[itemKey]?clone(versions[itemKey]):null;
    meta[itemKey]={kind:tab,id,status:oldMeta?.status||'pending',activeVersion:oldMeta?.activeVersion||0,pendingVersion:next,modified:now(),editor:'平台管理员'};
    (versions[itemKey]||(versions[itemKey]=[])).push({version:next,data,note,at:now(),author:'平台管理员',packageName:file.name,packageBytes:file.size});
    if(!persist()){
      if(oldMeta)meta[itemKey]=oldMeta;else delete meta[itemKey];
      if(oldVersions)versions[itemKey]=oldVersions;else delete versions[itemKey];
      return dialog('导入失败','<p>浏览器存储不可用，请重试。</p>',null,'关闭');
    }
    closeDialog();renderCards();
  },'确认导入');
}
function installable(){return Object.entries(meta).filter(([id,m])=>m.status==='online'&&active(id)&&Number(installed[id]||0)<active(id).version).map(([id,m])=>({id,kind:m.kind,old:Number(installed[id]||0),row:active(id)}));}
function installedSnapshot(kind,id){const itemKey=key(kind,id);return version(itemKey,installed[itemKey])?.data||null;}
export function installedTeamMemberVersion(teamId,expertId){return (installedSnapshot('team',teamId)?.memberRefs||[]).find(ref=>ref.id===expertId)?.version||null;}
function applyInstalled(){
  const experts=originals.expert.map(e=>clone(installedSnapshot('expert',e.id)||e));
  for(const [id,m] of Object.entries(meta))if(m.kind==='expert'&&!originals.expert.some(e=>e.id===m.id)&&installed[id]){const data=installedSnapshot('expert',m.id);if(data)experts.push(clone(data));}
  setBuiltinExperts(experts);
  const teams=originals.team.map(t=>clone(installedSnapshot('team',t.id)||t));
  for(const [id,m] of Object.entries(meta))if(m.kind==='team'&&!originals.team.some(t=>t.id===m.id)&&installed[id]){const data=installedSnapshot('team',m.id);if(data)teams.push(clone(data));}
  setBuiltinTeams(teams);cvRenderExperts();renderExpertGrid();decorateClient();
}
function decorateClient(){
  for(const el of document.querySelectorAll('[data-cv-expert], #expertGrid [data-expert], #expertGrid [data-team]')){
    const kind=el.hasAttribute('data-team')?'team':'expert',id=el.getAttribute('data-team')||el.getAttribute('data-cv-expert')||el.getAttribute('data-expert');
    const itemKey=key(kind,id),item=meta[itemKey];if(!item||!installed[itemKey])continue;
    el.querySelector('.platform-client-badge')?.remove();
    const badge=document.createElement('span');badge.className='platform-client-badge';
    badge.textContent=`官方 · v${installed[itemKey]}${item.status==='offline'?' · 已下架':active(itemKey)?.version>installed[itemKey]?' · 可更新':''}`;
    el.querySelector('.card-top')?.appendChild(badge);
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
  else html=rows.length?rows.map(({kind,old,row})=>`<div class="platform-update-row"><strong>${xesc(row.data.name)}</strong><span>${kind==='expert'?'专家':'专家团'}</span><span>${old?'v'+old:'未安装'} → v${row.version}</span><small>${xesc(row.note)}</small></div>`).join(''):'<div class="platform-empty">当前已是最新版本</div>';
  if(offline.length)html+=`<div class="platform-offline">官方已下架：${offline.map(([id])=>xesc(label(id))).join('、')}。本地已安装版本仍可使用。</div>`;
  $('#platformUpdateBody').innerHTML=html;
  $('#platformUpdateAll').classList.toggle('hidden',!rows.length||['loading','checking','success'].includes(stage));
  $('#platformUpdateAll').textContent=stage==='error'?'重试更新':`更新全部（${rows.length}）`;
}
function validateInstall(rows){
  for(const item of rows){
    if(!item.row?.data?.id||!item.row.data.name)return '发布内容不完整';
    if(item.kind!=='team')continue;
    for(const ref of item.row.data.memberRefs||[]){const id=key('expert',ref.id),incoming=rows.find(row=>row.id===id)?.row.version;if(!version(id,ref.version)||(!installed[id]&&!incoming))return `${item.row.data.name} 缺少成员版本 ${ref.id} v${ref.version}`;}
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
  $('#platformNav')?.addEventListener('click',refreshAccess);
  $('#platformBack')?.addEventListener('click',()=>showView('collab'));
  $('[data-platform-back]')?.addEventListener('click',()=>showView('collab'));
  $$('.platform-tabs button').forEach(button=>button.addEventListener('click',()=>{tab=button.dataset.platformTab;renderCards();}));
  $('#platformSearch').addEventListener('input',renderCards);$('#platformFilter').addEventListener('change',renderCards);
  $('#platformImport').addEventListener('click',()=>$('#platformZipFile').click());
  $('#platformZipFile').addEventListener('change',event=>{const file=event.target.files?.[0];event.target.value='';if(file)importZip(file);});
  $('#platformList').addEventListener('click',event=>{const card=event.target.closest('[data-platform-card]');if(card)showCard(card.dataset.platformCard);});
  $('#platformDialogCancel').addEventListener('click',closeDialog);
  $('#platformDialogConfirm').addEventListener('click',()=>{if(dialogConfirm)dialogConfirm();else closeDialog();});
  $('#platformDialogBody').addEventListener('click',event=>{const history=event.target.closest('[data-platform-history]'),toggle=event.target.closest('[data-platform-toggle]'),publish=event.target.closest('[data-platform-publish]'),download=event.target.closest('[data-platform-export]');if(history)showHistory(history.dataset.platformHistory);if(toggle)toggleStatus(toggle.dataset.platformToggle);if(publish)publishPending(publish.dataset.platformPublish);if(download)exportVersion(download.dataset.platformExport,download.dataset.platformVersion);});
  $$('[data-platform-update]').forEach(button=>button.addEventListener('click',()=>{showUpdate('checking');setTimeout(()=>showUpdate(),250);}));
  $('#platformUpdateClose').addEventListener('click',()=>$('#platformUpdateOverlay').classList.add('hidden'));
  $('#platformUpdateLater').addEventListener('click',()=>$('#platformUpdateOverlay').classList.add('hidden'));
  $('#platformUpdateAll').addEventListener('click',doInstall);
  new MutationObserver(decorateClient).observe($('#cvExpertSections'),{childList:true});
  new MutationObserver(decorateClient).observe($('#expertGrid'),{childList:true});
  document.addEventListener('lingee:auth-changed',refreshAccess);refreshAccess();
}
