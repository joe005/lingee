import { EX, xesc } from './data.js';

/* Reuse the existing editor forms inside the conversation's information rail. */
var originalParents=new WeakMap();
/* 信息栏顶部的工具栏：折叠按钮固定在面板左上角，折叠后仍留在这里 */
function ensureAssetEditorBar(host){
  if(!host)return null;
  var bar=host.querySelector('[data-asset-editor-bar]');
  if(!bar){
    bar=document.createElement('div');
    bar.className='asset-editor-bar';
    bar.setAttribute('data-asset-editor-bar','');
    bar.innerHTML='<button type="button" class="asset-editor-toggle" data-asset-editor-toggle aria-expanded="true" aria-label="收起编辑面板" title="收起编辑面板">'
      +'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M10 4v16"/></svg></button>';
  }
  if(bar!==host.firstElementChild)host.insertBefore(bar,host.firstElementChild);
  return bar;
}
function setAssetEditorCollapsed(collapsed){
  var view=document.getElementById('view-chat'), host=document.getElementById('chatAssetEditor');
  if(!view||!host)return;
  view.classList.toggle('asset-editor-collapsed',collapsed);
  var button=host.querySelector('[data-asset-editor-toggle]');
  if(button){
    button.setAttribute('aria-expanded',String(!collapsed));
    button.setAttribute('aria-label',collapsed?'展开编辑面板':'收起编辑面板');
    button.setAttribute('title',collapsed?'展开编辑面板':'收起编辑面板');
    button.querySelector('svg')?.setAttribute('style',collapsed?'transform:rotate(180deg)':'');
  }
}
export function hideAssetEditorPanel(){
  var host=document.getElementById('chatAssetEditor');
  if(!host)return;
  host.querySelectorAll('.modal-overlay').forEach(function(modal){
    modal.classList.remove('show');
    var origin=originalParents.get(modal);
    if(origin){
      var form=modal.querySelector('form');
      if(form){form.setAttribute('role','dialog');form.setAttribute('aria-modal','true');}
      origin.parent.insertBefore(modal,origin.next);
    }
  });
  host.querySelector('[data-asset-create-preview]')?.remove();
  host.hidden=true;
  document.getElementById('view-chat')?.classList.remove('asset-edit-open','asset-editor-collapsed');
  /* 收起状态不跨面板保留：下次打开时按钮回到「收起编辑面板」 */
  setAssetEditorCollapsed(false);
}

export function renderAssetCreationPanel(draft){
  var host=document.getElementById('chatAssetEditor');
  if(!host||!draft)return;
  hideAssetEditorPanel();
  if(draft.status==='done'&&draft.createdId){
    document.dispatchEvent(new CustomEvent('lingee:asset-edit-session',{detail:{kind:draft.kind,id:draft.createdId,name:draft.name}}));
    return;
  }
  var team=draft.kind==='team';
  var field=function(label,value,placeholder,multiline){
    return '<label class="env-field env-field-wide"><span>'+label+'</span>'+(multiline
      ?'<textarea rows="4" readonly placeholder="'+placeholder+'">'+xesc(value||'')+'</textarea>'
      :'<input readonly value="'+xesc(value||'')+'" placeholder="'+placeholder+'">')+'</label>';
  };
  var reason='信息完整后自动创建';
  var btn=function(cls,icon,label){return '<button type="button" class="modal-btn '+cls+'" disabled title="'+reason+'">'+icon+'<span class="btn-label">'+label+'</span></button>';};
  host.innerHTML='<section class="modal-card env-config-modal team-config-modal" data-asset-create-preview aria-label="创建草稿">'
    +'<div class="modal-header"><div class="env-config-heading"><div class="team-panel-title-row"><div class="modal-title">'+(team?'智能体团队':'智能体')+'草稿</div><span class="team-panel-badge is-dirty">未创建</span></div>'
    +'<div class="team-panel-sub">'+xesc(draft.error||'在左侧继续对话，信息完整后自动创建。')+'</div></div>'
    +'<div class="modal-header-actions">'+btn('cancel team-panel-btn-save','<svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>','保存')+btn('cancel team-panel-btn-test','<svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6M10 3v6.2L5.2 18a2 2 0 0 0 1.7 3h10.2a2 2 0 0 0 1.7-3L14 9.2V3"/><path d="M7.5 15h9"/></svg>','测试')+btn('confirm team-panel-btn-submit','<svg class="btn-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v4h16v-4"/></svg>','提交审核')+'</div></div>'
    +'<div class="team-panel-tabs-row"><div class="modal-tabs" role="tablist" aria-label="创建草稿"><button type="button" class="modal-tab active" role="tab" aria-selected="true">基本信息</button></div></div>'
    +'<div class="modal-body env-config-body"><div class="team-pane"><section class="env-form-section"><div class="env-form-grid">'
    +field('名称',draft.name,'等待对话补充名称',false)
    +field('简介',draft.desc,'等待对话补充职责或用途',true)
    +field(team?'成员':'可承担的工作',team?(draft.members||[]).map(function(id){return EX[id]?.name||id;}).join('、'):(draft.modes||[]).join('、'),team?'等待选择成员':'等待补充工作模式',false)
    +'</div></section></div></div></section>';
  ensureAssetEditorBar(host);
  host.hidden=false;
  document.getElementById('view-chat').classList.add('asset-edit-open');
}

export function showAssetEditorPanel(modal){
  var host=document.getElementById('chatAssetEditor');
  if(!host||!modal)return;
  hideAssetEditorPanel();
  if(!originalParents.has(modal))originalParents.set(modal,{parent:modal.parentNode,next:modal.nextSibling});
  host.appendChild(modal);
  ensureAssetEditorBar(host);
  var form=modal.querySelector('form');
  if(form){form.setAttribute('role','region');form.removeAttribute('aria-modal');}
  host.hidden=false;
  document.getElementById('view-chat').classList.add('asset-edit-open');
  modal.classList.add('show');
  if(!host.dataset.assetEditorToggleBound){
    host.addEventListener('click',function(event){
      if(event.target.closest('[data-asset-editor-toggle]')){
        setAssetEditorCollapsed(!document.getElementById('view-chat')?.classList.contains('asset-editor-collapsed'));
      }
    });
    host.dataset.assetEditorToggleBound='true';
  }
}
