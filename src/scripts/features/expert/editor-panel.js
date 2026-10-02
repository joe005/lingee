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
  host.hidden=true;
  document.getElementById('view-chat')?.classList.remove('asset-edit-open');
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
