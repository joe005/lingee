import { capabilityContext } from './capability-settings.js';
import { capabilityCatalog, capabilityList, capabilitySave, capabilityChange } from './capability-config.js';
import { UNLISTED_EXPERT_IDS } from '../expert/builtin-catalog.js';
import { routeOf } from '../expert/asset-routes.js';
import { assetTagsHtml } from './expert-market.js';
import { EX, xav, xesc } from '../expert/data.js';
import { toast } from '../../core/toast.js';
import { requestDeleteConfirmation } from '../../core/delete-confirm.js';
import '../../../styles/parts/collab/recruitment-settings.css';

let kind = 'expert', host = null, dialog = null, returnFocus = null;
const byId = id => document.getElementById(id);
const ICON_TRASH = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 5.5h13M8 5.5V4h4v1.5M5.5 5.5l.7 10a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9l.7-10M8.5 9v4.5M11.5 9v4.5"/></svg>';
/* 页签空态「去设置添加」跳过来时，按来源页签打开对应分类 */
export function setRecruitKind(value) { if (value === 'expert' || value === 'team') kind = value; }
function scopeId(p,ws) { return JSON.stringify([p.id,ws?.id || '']); }
function sameScope(expected) { const context = capabilityContext(); return context.p && scopeId(context.p,context.ws) === expected ? context : null; }
/* 工作区只能添加企业自建、且不是面向工作板块发布的资产；平台初始数据改为空间可见后也可添加（默认全员可见、对所有空间共享，不用添加）。 */
const WORK_ROUTES = ['work','work-pending','work-personal'];
function recruitable(row) { return (!!row.data.tenantId || row.scope === 'workspace') && !WORK_ROUTES.includes(routeOf(row.kind,row.data.id)); }
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
/* 头像：智能体用自己的头像；团队叠放前三位成员，超过时显示「+N」 */
function memberNames(row) { return (row.data.members || []).map(id => EX[id]?.name).filter(Boolean); }
function faceHtml(row) {
  if (row.kind !== 'team') return '<img class="cv-recruit-avatar" src="'+xav(row.data.k || 'lead')+'" alt="">';
  const ids = row.data.members || [], more = ids.length > 3;
  return '<span class="cv-recruit-faces">'+ids.slice(0,more?2:3).map(id => '<img src="'+xav(EX[id]?.k || 'lead')+'" alt="">').join('')+(more?'<span>+'+(ids.length-2)+'</span>':'')+'</span>';
}
function tagsHtml(row) { const tags = [...new Set((row.data.tags || row.data.domains || []).filter(Boolean))].slice(0,4); return tags.length ? '<span class="cv-recruit-tags">'+tags.map(tag => '<span>'+xesc(tag)+'</span>').join('')+'</span>' : ''; }
/* 设置 ›「智能体/智能体团队」行（UE 2026-11-25）：每项一张卡片，头像、名称、描述（团队为成员名单）、标签，行尾删除；点卡片看详情 */
function recruitRow(row,editable,scope) {
  const name = row.data.name || '';
  const desc = row.kind === 'team' ? (memberNames(row).length ? '成员：'+memberNames(row).join('、') : row.data.desc || '暂无描述') : row.data.desc || '暂无描述';
  const builtin = row.official ? '<span class="cv-recruit-badge">内置</span>' : '';
  const remove = editable && !row.official ? '<button type="button" class="cv-recruit-remove" data-recruit-remove="'+xesc(row.key)+'" data-recruit-scope="'+xesc(scope)+'" aria-label="删除'+xesc(name)+'" title="删除">'+ICON_TRASH+'</button>' : '';
  return '<li class="cv-recruit-row" data-workspace-asset="'+xesc(row.key)+'"><button type="button" class="cv-recruit-open" data-recruit-detail="'+xesc(row.data.id || '')+'" data-recruit-kind="'+row.kind+'">'+faceHtml(row)
    +'<span class="cv-recruit-copy"><span class="cv-recruit-name"><strong title="'+xesc(name)+'">'+xesc(name)+'</strong>'+builtin+'</span><span class="cv-recruit-desc" title="'+xesc(desc)+'">'+xesc(desc)+'</span>'+tagsHtml(row)+'</span></button>'+remove+'</li>';
}
const KIND_LABEL = { expert: '智能体', team: '智能体团队' };
/* 设置 ›「智能体/智能体团队」（2026-11-18 按设计图调整）：顶部为带数量的类型药丸 + 右侧「添加智能体 / 添加智能体团队」，
   下方为单个描边列表，每行字标、名称、描述和移除。只有空间创建者和管理员能添加、移除，其他人只读。 */
export function renderRecruitmentSettings(target) {
  host = target; host.dataset.recruitmentPage = 'true';
  const {p,ws,editable} = capabilityContext();
  if (!p) { host.innerHTML='<div class="cv-wsadmin-empty">请先选择空间。</div>'; return; }
  const all = capabilityList(p,ws?.id).entries.filter(recruitable);
  const rows = all.filter(row => row.kind === kind);
  const count = key => all.filter(row => row.kind === key).length;
  const tabs = '<div class="cv-recruit-tabs" role="group" aria-label="类型">'+['expert','team'].map(key=>'<button type="button" data-recruit-tab="'+key+'" aria-pressed="'+(key===kind)+'"'+(key===kind?' class="is-on"':'')+'>'+KIND_LABEL[key]+' '+count(key)+'</button>').join('')+'</div>';
  const add = editable ? '<button type="button" class="ld-set-btn ld-set-btn--primary cv-settings-action cv-recruit-add" data-recruit-open><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>添加'+KIND_LABEL[kind]+'</button>' : '';
  host.innerHTML='<p class="cv-basic-scope">'+xesc(ws ? ws.name : p.name)+'</p><div class="cv-basic-heading cv-recruit-head">'+tabs+add+'</div>'
    +(rows.length ? '<ul class="cv-recruit-rows">'+rows.map(row=>recruitRow(row,editable,scopeId(p,ws))).join('')+'</ul>'
      : '<div class="cv-recruit-empty">暂无已添加的'+KIND_LABEL[kind]+(editable?'，点击右上角「添加'+KIND_LABEL[kind]+'」选择。':'，请联系空间创建者或管理员添加。')+'</div>');
}
function syncRecruitFooter() {
  byId('cvRecruitCount').textContent='已选 '+dialog.selected.size+' 个';
  byId('cvRecruitConfirm').disabled=!dialog.selected.size;
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
  byId('cvRecruitOptions').innerHTML=rows.length ? rows.map(row=>{
    const desc = row.kind === 'team' && memberNames(row).length ? '成员：'+memberNames(row).join('、') : row.data.desc || '';
    return '<label class="cv-recruit-option"><input type="checkbox" data-recruit-key="'+xesc(row.key)+'"'+(dialog.selected.has(row.key)?' checked':'')+'>'+faceHtml(row)+'<span><strong>'+xesc(row.data.name)+'</strong><small class="cv-recruit-option-desc" title="'+xesc(desc)+'">'+xesc(desc)+'</small>'+tagsHtml(row)+'</span></label>';
  }).join('') : '<div class="cv-recruit-empty">'+(byId('cvRecruitSearch').value.trim() ? '没有匹配的可添加'+KIND_LABEL[dialog.kind] : '暂无可添加的'+KIND_LABEL[dialog.kind])+'</div>';
  syncRecruitFooter();
}
export function initRecruitmentSettings() {
  document.addEventListener('error', event => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.closest('.cv-recruit-list') || image.dataset.avatarFallback) return;
    image.dataset.avatarFallback = 'true';
    image.src = xav();
  }, true);
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-recruit-tab],[data-recruit-open],[data-recruit-remove],[data-recruit-close],[data-recruit-detail]');
    if (!button) return;
    if (button.hasAttribute('data-recruit-detail')) { document.dispatchEvent(new CustomEvent('lingee:open-asset-detail',{detail:{kind:button.dataset.recruitKind,id:button.dataset.recruitDetail}})); return; }
    if (button.hasAttribute('data-recruit-close')) { closeDialog(); return; }
    if (button.hasAttribute('data-recruit-tab')) { kind=button.dataset.recruitTab; renderRecruitmentSettings(host); return; }
    const context=capabilityContext(); if(!context.editable)return;
    if (button.hasAttribute('data-recruit-open')) {
      returnFocus=button;dialog={scope:scopeId(context.p,context.ws),kind,selected:new Set()};
      byId('cvRecruitHeading').textContent='添加'+KIND_LABEL[kind];
      byId('cvRecruitSearch').placeholder='搜索'+KIND_LABEL[kind];
      byId('cvRecruitSearch').value='';byId('cvRecruitError').hidden=true;
      byId('cvRecruitOverlay').hidden=false;renderOptions();byId('cvRecruitSearch').focus();return;
    }
    const expected=button.dataset.recruitScope,key=button.dataset.recruitRemove;
    if(!sameScope(expected)?.editable)return;
    const target=capabilityList(context.p,context.ws?.id).entries.find(row=>row.key===key);
    const label=KIND_LABEL[target?.kind==='team'?'team':'expert'];
    if(!await requestDeleteConfirmation('确定把「'+(target?.data.name || '')+'」从「'+(context.ws?.name || context.p.name)+'」移除吗？移除后这个空间里不能再用它，已经在跑的任务不受影响。之后可以重新添加。',{title:'删除'+label,confirmLabel:'删除',tone:'warning'}))return;
    const latest=sameScope(expected);if(!latest?.editable){toast('当前空间或权限已变化，请重新操作','warning');return;}
    const error=capabilityChange(latest.p,latest.ws?.id || '','uninstall',key);
    toast(error || '已删除',error?'warning':'success');
  });
  byId('cvRecruitSearch').addEventListener('input',renderOptions);
  byId('cvRecruitOptions').addEventListener('change',event=>{
    const key=event.target.dataset.recruitKey;if(!dialog || !key)return;
    if(event.target.checked)dialog.selected.add(key);else dialog.selected.delete(key);
    byId('cvRecruitError').hidden=true;
    syncRecruitFooter();
  });
  byId('cvRecruitConfirm').addEventListener('click',()=>{
    if(!dialog)return;
    const error=recruitAssets(dialog.scope,[...dialog.selected]);
    if(error){byId('cvRecruitError').textContent=error;byId('cvRecruitError').hidden=false;return;}
    closeDialog();toast('已添加','success');
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
  document.addEventListener('lingee:settings-space-changed',()=>{if(dialog)closeDialog();refresh();});
}
