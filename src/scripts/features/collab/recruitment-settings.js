import { capabilityContext } from './capability-settings.js';
import { capabilityCatalog, capabilityList, capabilitySave, capabilityChange } from './capability-config.js';
import { UNLISTED_EXPERT_IDS } from '../expert/builtin-catalog.js';
import { routeOf } from '../expert/asset-routes.js';
import { assetTagsHtml } from './expert-market.js';
import { xav, xesc } from '../expert/data.js';
import { toast } from '../../core/toast.js';
import { requestDeleteConfirmation } from '../../core/delete-confirm.js';
import '../../../styles/parts/collab/recruitment-settings.css';

let kind = 'expert', host = null, dialog = null, returnFocus = null;
const byId = id => document.getElementById(id);
const ICON_TRASH = '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 5.5h13M8 5.5V4h4v1.5M5.5 5.5l.7 10a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9l.7-10M8.5 9v4.5M11.5 9v4.5"/></svg>';
/* 已添加卡片按企业目录补「空间可用」标记，说明这项内容只经工作区分配、不在个人「更多」中 */
function recruitCard(row,editable,scope,p) {
  const workspaceOnly = !!p && capabilityCatalog(p).some(item => item.key === row.key && item.scope === 'workspace');
  const team = row.kind === 'team', shared = !!row.data.tenantId;
  const face = team ? '<span class="x-faces">'+(row.experts || []).slice(0,4).map(e => '<img src="'+xav(e.data.k)+'" alt="">').join('')+'</span>' : '<img class="x-av" src="'+xav(row.data.k)+'" alt="">';
  const source = '<span class="x-badge asset-source-badge asset-source-'+(shared ? 'shared' : 'builtin')+'">'+(shared ? '企业自建' : '金蝶官方')+'</span>';
  const summary = team ? (row.data.members || []).length+' 个开发智能体' : (row.data.skills || []).length+' 个技能';
  const remove = editable ? '<button type="button" class="cv-recruit-remove" data-recruit-remove="'+xesc(row.key)+'" data-recruit-scope="'+xesc(scope)+'" aria-label="移除'+xesc(row.data.name)+'" title="移除">'+ICON_TRASH+'</button>' : '';
  return '<article class="app-card x-card" data-workspace-asset="'+xesc(row.key)+'">'+remove+'<div class="card-top">'+face+'<div class="card-titles"><div class="card-title-row"><span class="card-title">'+xesc(row.data.name)+'</span></div><div class="x-sub asset-card-summary">'+source+'<span class="platform-client-badge">V'+xesc(row.version)+'</span>'+(workspaceOnly ? '<span class="platform-client-badge">空间可用</span>' : '')+'<span>'+summary+'</span></div></div></div><div class="card-desc">'+xesc(row.data.desc || '')+'</div>'+assetTagsHtml(row.data.tags || row.data.domains || [])+'</article>';
}
function scopeId(p,ws) { return JSON.stringify([p.id,ws?.id || '']); }
function sameScope(expected) { const context = capabilityContext(); return context.p && scopeId(context.p,context.ws) === expected ? context : null; }
/* 工作区只能添加企业自建、且不是面向工作板块发布的资产；金蝶官方与工作板块去向的不在此列。 */
const WORK_ROUTES = ['work','work-pending','work-personal'];
function recruitable(row) { return !!row.data.tenantId && !WORK_ROUTES.includes(routeOf(row.kind,row.data.id)); }
/* 空间内工作区可添加的资产目录（新建工作区向导与添加弹窗共用） */
export function recruitCatalog(p,assetKind,keyword='') {
  const kw = keyword.trim().toLocaleLowerCase();
  return capabilityCatalog(p).filter(row => row.kind === assetKind && recruitable(row) && (assetKind === 'team' || row.data.listed !== false && !UNLISTED_EXPERT_IDS.has(row.data.id))
    && (!kw || [row.data.name,row.data.desc,...(row.data.tags || row.data.domains || [])].join(' ').toLocaleLowerCase().includes(kw)));
}
export function recruitmentOptions(p,ws,assetKind,keyword='') {
  const installed = new Set(capabilityList(p,ws?.id).entries.map(row => row.key));
  return recruitCatalog(p,assetKind,keyword).map(row => ({...row,recruited:installed.has(row.key)}));
}
export function recruitAssets(expected,keys) {
  const context = sameScope(expected);
  if (!context?.editable) return '当前空间或权限已变化，请重新操作';
  const list = capabilityList(context.p,context.ws?.id);
  const all = [...new Set(list.entries.map(row => row.key).concat(keys))];
  if (!keys.length) return '请先选择要添加的开发智能体或团队';
  const allowed = new Set(capabilityCatalog(context.p).filter(recruitable).map(row => row.key));
  if (keys.some(key => !allowed.has(key) && !list.entries.some(row => row.key === key))) return '所选资产不属于空间可添加的范围，请刷新后重新选择';
  return capabilitySave(context.p,context.ws?.id || '',{keys:all,defaultKey:list.defaultKey || all[0],preserveVersions:true});
}
export function renderRecruitmentSettings(target) {
  host = target; host.dataset.recruitmentPage = 'true';
  const {p,ws,editable} = capabilityContext();
  if (!p) { host.innerHTML='<div class="cv-wsadmin-empty">请先选择空间。</div>'; return; }
  const rows = capabilityList(p,ws?.id).entries.filter(row => row.kind === kind && recruitable(row));
  host.innerHTML='<p class="cv-basic-scope">'+xesc(ws ? ws.name : p.name)+'</p><div class="cv-basic-heading"><div><h2>开发智能体管理</h2><p>添加后，本工作区成员即可使用。</p></div>'+(editable ? '<button type="button" class="ld-set-btn ld-set-btn--primary" data-recruit-open>添加</button>' : '')+'</div>'
    +'<div class="cv-recruit-tabs" role="group" aria-label="资产类型">'+[['expert','开发智能体'],['team','开发智能体团队']].map(([key,label])=>'<button type="button" data-recruit-tab="'+key+'" aria-pressed="'+(key===kind)+'"'+(key===kind?' class="is-on"':'')+'>'+label+'</button>').join('')+'</div>'
    +'<div class="apps-grid cv-recruit-list">'+(rows.length ? rows.map(row=>recruitCard(row,editable,scopeId(p,ws),p)).join('') : '<div class="cv-recruit-empty">暂无已添加的'+(kind==='team'?'开发智能体团队':'开发智能体')+(editable?'，点击“添加”选择。':'，请联系工作区管理员添加。')+'</div>')+'</div>';
}
function closeDialog() {
  dialog = null; byId('cvRecruitOverlay').hidden = true;
  if (returnFocus?.isConnected) returnFocus.focus();
  else if (host?.dataset.recruitmentPage === 'true') host.querySelector('[data-recruit-open]')?.focus();
  returnFocus = null;
}
function renderOptions() {
  if (!dialog) return;
  const context = sameScope(dialog.scope);
  if (!context?.editable) { closeDialog(); return; }
  const rows = recruitmentOptions(context.p,context.ws,dialog.kind,byId('cvRecruitSearch').value).filter(row => !row.recruited);
  byId('cvRecruitOptions').innerHTML=rows.length ? rows.map(row=>'<label class="cv-recruit-option"><input type="checkbox" data-recruit-key="'+xesc(row.key)+'"'+(dialog.selected.has(row.key)?' checked':'')+'><span><strong>'+xesc(row.data.name)+'</strong><small>V'+xesc(row.version)+' · '+(row.data.tenantId?'企业自建':'金蝶官方')+(row.scope==='workspace'?' · 空间可用':'')+'</small><span>'+xesc(row.data.desc || '')+'</span></span></label>').join('') : '<div class="cv-recruit-empty">'+(byId('cvRecruitSearch').value.trim() ? '没有匹配的可添加资产' : '暂无可添加的企业自建资产')+'</div>';
  byId('cvRecruitConfirm').textContent='添加'+(dialog.selected.size?'（'+dialog.selected.size+'）':'');
  byId('cvRecruitConfirm').disabled=!dialog.selected.size;
}
export function initRecruitmentSettings() {
  document.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.closest('.cv-recruit-list') || image.dataset.avatarFallback) return;
    image.dataset.avatarFallback = 'true';
    image.src = xav();
  }, true);
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-recruit-tab],[data-recruit-open],[data-recruit-remove],[data-recruit-close]');
    if (!button) return;
    if (button.hasAttribute('data-recruit-close')) { closeDialog(); return; }
    if (button.hasAttribute('data-recruit-tab')) { kind=button.dataset.recruitTab; renderRecruitmentSettings(host); return; }
    const context=capabilityContext(); if(!context.editable)return;
    if (button.hasAttribute('data-recruit-open')) {
      returnFocus=button;dialog={scope:scopeId(context.p,context.ws),kind,selected:new Set()};
      byId('cvRecruitHeading').textContent='添加'+(kind==='team'?'开发智能体团队':'开发智能体');
      byId('cvRecruitScope').textContent='添加到：'+(context.ws?.name || context.p.name);
      byId('cvRecruitSearch').value='';byId('cvRecruitError').hidden=true;
      byId('cvRecruitOverlay').hidden=false;renderOptions();byId('cvRecruitSearch').focus();return;
    }
    const expected=button.dataset.recruitScope,key=button.dataset.recruitRemove;
    if(!sameScope(expected)?.editable)return;
    if(!await requestDeleteConfirmation('移除后，本空间成员将无法通过此空间使用；个人添加、其他空间及已启动任务不受影响。',{title:'移除',confirmLabel:'移除'}))return;
    const latest=sameScope(expected);if(!latest?.editable){toast('当前空间或权限已变化，请重新操作','warning');return;}
    const error=capabilityChange(latest.p,latest.ws?.id || '','uninstall',key);
    toast(error || '已移除',error?'warning':'success');
  });
  byId('cvRecruitSearch').addEventListener('input',renderOptions);
  byId('cvRecruitOptions').addEventListener('change',event=>{
    const key=event.target.dataset.recruitKey;if(!dialog || !key)return;
    if(event.target.checked)dialog.selected.add(key);else dialog.selected.delete(key);
    byId('cvRecruitError').hidden=true;
    byId('cvRecruitConfirm').textContent='添加'+(dialog.selected.size?'（'+dialog.selected.size+'）':'');
    byId('cvRecruitConfirm').disabled=!dialog.selected.size;
  });
  byId('cvRecruitConfirm').addEventListener('click',()=>{
    if(!dialog)return;
    const error=recruitAssets(dialog.scope,[...dialog.selected]);
    if(error){byId('cvRecruitError').textContent=error;byId('cvRecruitError').hidden=false;return;}
    closeDialog();toast('已添加，本空间成员可使用','success');
  });
  byId('cvRecruitOverlay').addEventListener('click',event=>{if(event.target===byId('cvRecruitOverlay'))closeDialog();});
  byId('cvRecruitOverlay').addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.stopPropagation();event.preventDefault();closeDialog();return;}
    if(event.key!=='Tab')return;
    const controls=Array.from(byId('cvRecruitOverlay').querySelectorAll('button:not(:disabled),input:not(:disabled)')).filter(el=>el.getClientRects().length);
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&event.target===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&event.target===last){event.preventDefault();first?.focus();}
  });
  function refresh(){if(host?.dataset.recruitmentPage==='true')renderRecruitmentSettings(host);if(dialog)renderOptions();}
  document.addEventListener('lingee:capabilities-changed',refresh);
  document.addEventListener('lingee:cloud-assets-changed',refresh);
  document.addEventListener('lingee:mgr-projects-changed',refresh);
  document.addEventListener('lingee:tk-space-changed',()=>{if(dialog)closeDialog();refresh();});
}
