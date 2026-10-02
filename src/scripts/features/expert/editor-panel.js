import { EX, xesc } from './data.js';

/* Reuse the existing editor forms inside the conversation's information rail. */
var originalParents=new WeakMap();
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
  document.getElementById('view-chat')?.classList.remove('asset-edit-open');
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
  host.innerHTML='<section class="modal-card env-config-modal team-config-modal" data-asset-create-preview aria-label="创建草稿">'
    +'<div class="modal-header"><div class="modal-title">'+(team?'专家团':'数字员工')+'草稿</div><span class="team-hint-inline">随对话更新</span></div>'
    +'<div class="modal-body env-config-body"><section class="env-form-section"><div class="env-form-grid">'
    +field('名称',draft.name,'等待对话补充名称',false)
    +field('简介',draft.desc,'等待对话补充职责或用途',true)
    +field(team?'成员':'可承担的工作',team?(draft.members||[]).map(function(id){return EX[id]?.name||id;}).join('、'):(draft.modes||[]).join('、'),team?'等待选择成员':'等待补充工作模式',false)
    +'</div></section></div><div class="modal-footer"><span class="team-hint-inline">'+xesc(draft.error||'在左侧继续对话，信息完整后自动创建。')+'</span></div></section>';
  host.hidden=false;
  document.getElementById('view-chat').classList.add('asset-edit-open');
}

export function showAssetEditorPanel(modal){
  var host=document.getElementById('chatAssetEditor');
  if(!host||!modal)return;
  hideAssetEditorPanel();
  if(!originalParents.has(modal))originalParents.set(modal,{parent:modal.parentNode,next:modal.nextSibling});
  host.appendChild(modal);
  var form=modal.querySelector('form');
  if(form){form.setAttribute('role','region');form.removeAttribute('aria-modal');}
  host.hidden=false;
  document.getElementById('view-chat').classList.add('asset-edit-open');
  modal.classList.add('show');
}
