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
/* 页签空态「去设置添加」跳过来时，按来源页签打开对应分类 */
export function setRecruitKind(value) { if (value === 'expert' || value === 'team') kind = value; }
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
/* 列表行的字标：按名称里的职能关键词取一个字（如「质量」→「质」），取不到时用名称首字；颜色按名称散列 */
const GLYPH_RULES = [['API','接'],['审查','审'],['质量','质'],['测试','测'],['需求','需'],['产品','产'],['协调','协'],['交付','交'],['部署','部'],['界面','界'],['设计','设'],['通用应用开发','码'],['开发','开'],['团队','团']];
const GLYPH_COLORS = ['blue','green','orange','purple','teal','rose'];
function glyphOf(name) {
  const rule = GLYPH_RULES.find(([kw]) => name.includes(kw));
  return rule ? rule[1] : (name.trim()[0] || '智');
}
function glyphColor(name) { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return GLYPH_COLORS[h % GLYPH_COLORS.length]; }
function recruitRow(row,editable,scope) {
  const name = row.data.name || '';
  const remove = editable ? '<button type="button" class="cv-recruit-remove" data-recruit-remove="'+xesc(row.key)+'" data-recruit-scope="'+xesc(scope)+'" aria-label="移除'+xesc(name)+'" title="移除">'+ICON_TRASH+'</button>' : '';
  return '<li class="cv-recruit-row" data-workspace-asset="'+xesc(row.key)+'"><span class="cv-recruit-glyph is-'+glyphColor(name)+'" aria-hidden="true">'+xesc(glyphOf(name))+'</span>'
    +'<span class="cv-recruit-copy"><strong title="'+xesc(name)+'">'+xesc(name)+'</strong><span title="'+xesc(row.data.desc || '')+'">'+xesc(row.data.desc || '暂无描述')+'</span></span>'+remove+'</li>';
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
  const add = editable ? '<button type="button" class="ld-set-btn ld-set-btn--primary cv-settings-action cv-recruit-add" data-recruit-open><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M10 4v12M4 10h12"/></svg>添加</button>' : '';
  host.innerHTML='<p class="cv-basic-scope">'+xesc(ws ? ws.name : p.name)+'</p><div class="cv-basic-heading cv-recruit-head">'+tabs+add+'</div>'
    +(rows.length ? '<ul class="cv-recruit-rows">'+rows.map(row=>recruitRow(row,editable,scopeId(p,ws))).join('')+'</ul>'
      : '<div class="cv-recruit-empty">暂无已添加的'+KIND_LABEL[kind]+(editable?'，点击右上角「添加」选择。':'，请联系空间创建者或管理员添加。')+'</div>');
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
  document.addEventListener('lingee:settings-space-changed',()=>{if(dialog)closeDialog();refresh();});
}
