import { $, $$ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { CV_PROJECTS } from './data.js';
import { cvHideSquadDetail } from './squads.js';
import { xesc } from '../expert/data.js';

/* 设置：人员、团队与第三方任务来源映射。单文件原型仅保存连接元数据，不处理凭据。 */
const INTEGRATION_KEY='lingee-collab-integrations-v1';
const PROVIDERS={devops:'DevOps',zentao:'禅道'};
let mappings=[];

function restoreMappings(){
  try{
    const rows=JSON.parse(localStorage.getItem(INTEGRATION_KEY)||'[]');
    if(Array.isArray(rows)) mappings=rows.filter(row=>PROVIDERS[row.type] && row.url && row.externalProject && row.targetProject);
  }catch(e){ mappings=[]; }
}
function saveMappings(){
  try{localStorage.setItem(INTEGRATION_KEY,JSON.stringify(mappings));}
  catch(e){toast('浏览器无法保存集成映射','error');}
}
function renderMappings(){
  const list=$('#cv-integration-list');if(!list)return;
  list.innerHTML=mappings.length?mappings.map(row=>{
    const target=CV_PROJECTS.find(project=>project.id===row.targetProject);
    return '<div class="cv-integration-row"><span class="cv-integration-mark">'+(row.type==='devops'?'D':'禅')+'</span><span class="cv-integration-row-main"><b>'+PROVIDERS[row.type]+' · '+xesc(row.externalProject)+'</b><small>'+xesc(row.url)+' → '+xesc(target?target.name:'项目已移除')+'</small></span><span class="cv-integration-status">待接入</span><button type="button" data-cv-integration-edit="'+xesc(row.id)+'">编辑映射</button><button type="button" data-cv-integration-remove="'+xesc(row.id)+'">移除</button></div>';
  }).join(''):'<div class="cv-integration-empty">还没有任务来源映射。选择上方系统开始配置。</div>';
}
function openMapping(type,id){
  const row=id?mappings.find(item=>item.id===id):null;
  if(!PROVIDERS[type])return;
  const form=$('#cv-integration-form');if(!form)return;
  $('#cv-integration-form-title').textContent=(row?'编辑':'配置')+PROVIDERS[type]+'任务来源';
  $('#cv-integration-id').value=row?.id||'';
  $('#cv-integration-type').value=type;
  $('#cv-integration-url').value=row?.url||'';
  $('#cv-integration-project').value=row?.externalProject||'';
  $('#cv-integration-target').innerHTML='<option value="">请选择灵基项目</option>'+CV_PROJECTS.map(project=>'<option value="'+xesc(project.id)+'"'+(row?.targetProject===project.id?' selected':'')+'>'+xesc(project.name)+'</option>').join('');
  form.classList.remove('hidden');
  $('#cv-integration-url').focus();
}
function submitMapping(event){
  event.preventDefault();
  const type=$('#cv-integration-type').value;
  const externalProject=$('#cv-integration-project').value.trim();
  const targetProject=$('#cv-integration-target').value;
  let parsed;
  try{parsed=new URL($('#cv-integration-url').value.trim());}catch(e){toast('请输入有效的系统地址','warning');return;}
  if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||parsed.search||parsed.hash){toast('系统地址只填写站点 URL，不要包含账号、令牌或参数','warning');return;}
  if(!externalProject||!CV_PROJECTS.some(project=>project.id===targetProject)){toast('请填写外部项目标识并选择灵基项目','warning');return;}
  const url=parsed.origin+parsed.pathname.replace(/\/$/,'');
  const id=$('#cv-integration-id').value;
  const duplicate=mappings.find(row=>row.type===type&&row.url===url&&row.externalProject===externalProject&&row.id!==id);
  if(duplicate){toast('这个任务来源已配置，请编辑现有映射','warning');return;}
  const row={id:id||('mapping-'+Date.now()),type,url,externalProject,targetProject};
  const index=mappings.findIndex(item=>item.id===id);
  if(index>=0)mappings[index]=row;else mappings.push(row);
  saveMappings();renderMappings();
  $('#cv-integration-form').classList.add('hidden');
  toast('映射已保存；真实任务同步需服务端接入');
}

export function initCollabConfig(){
  restoreMappings();renderMappings();
  const nav=$('#cv-config .config-nav');
  if(nav)nav.addEventListener('click',event=>{
    const item=event.target.closest('[data-config-nav]');if(!item)return;
    $$('#cv-config .config-nav-item').forEach(button=>button.classList.toggle('on',button===item));
    const which=item.getAttribute('data-config-nav');
    $$('#cv-config .config-pane').forEach(pane=>pane.classList.toggle('hidden',pane.getAttribute('data-config-pane')!==which));
    if(which==='perm'&&window.cvRenderPermTable)window.cvRenderPermTable();
    if(which==='teams')cvHideSquadDetail();
    if(which==='integration')renderMappings();
  });
  const panel=$('#cv-config');
  if(panel)panel.addEventListener('click',event=>{
    const provider=event.target.closest('[data-cv-integration-provider]');
    if(provider){openMapping(provider.getAttribute('data-cv-integration-provider'));return;}
    const edit=event.target.closest('[data-cv-integration-edit]');
    if(edit){const row=mappings.find(item=>item.id===edit.getAttribute('data-cv-integration-edit'));if(row)openMapping(row.type,row.id);return;}
    const remove=event.target.closest('[data-cv-integration-remove]');
    if(remove){mappings=mappings.filter(item=>item.id!==remove.getAttribute('data-cv-integration-remove'));saveMappings();renderMappings();toast('已移除任务来源映射');return;}
    if(event.target.closest('#cv-integration-cancel'))$('#cv-integration-form').classList.add('hidden');
  });
  const form=$('#cv-integration-form');if(form)form.addEventListener('submit',submitMapping);
}
