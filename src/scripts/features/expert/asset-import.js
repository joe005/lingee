import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { isPersonalAssets } from '../collab/expert-market.js';
import { savePersonalAsset } from './asset-creation.js';
import { renderExpertChips } from './chips.js';
import { EXPERTS, MY_EXPERTS } from './data.js';
import { assetOwnerKey, layerOf, layerVisible } from './layers.js';
import { TEAMS } from './store.js';

export function initAssetImport() {
  const dialog=$('#assetImportDialog');
  const form=$('#assetImportForm');
  const fileInput=$('#assetImportFile');
  const folderInput=$('#assetImportFolder');
  const chooseZip=$('#assetImportChooseZip');
  const chooseFolder=$('#assetImportChooseFolder');
  const source=$('#assetImportSource');
  const dropZone=$('#assetImportDrop');
  const sourceChoices=$('#assetImportSources');
  const selection=$('#assetImportSelection');
  const sourceType=$('#assetImportType');
  const remove=$('#assetImportRemove');
  const error=$('#assetImportError');
  const confirm=$('#assetImportConfirm');
  let trigger,kind,ownerId,selected;

  const close=()=>dialog.close();
  $('#assetImportCancel').addEventListener('click',close);
  $('#assetImportClose').addEventListener('click',close);
  dialog.addEventListener('close',()=>{
    dropZone.classList.remove('is-dragging');
    showSelection(null);
    trigger.focus({preventScroll:true});
  });

  for(const button of document.querySelectorAll('#view-collab [data-asset-import]')){
    button.addEventListener('click',()=>{
      kind=button.dataset.assetImport;
      if(!isPersonalAssets(kind))return;
      trigger=button;
      ownerId=assetOwnerKey();
      form.reset();
      showSelection(null);
      $('#assetImportTitle').textContent=kind==='team'?'导入开发智能体团队':'导入开发智能体';
      dialog.showModal();
      chooseFolder.focus();
    });
  }

  function showSelection(item,message=''){
    selected=item;
    selection.hidden=!item;
    sourceChoices.hidden=!!item;
    dropZone.classList.toggle('has-selection',!!item);
    source.textContent=item?.label||'';
    sourceType.textContent=item?.type||'';
    error.textContent=message;
    confirm.disabled=!item?.name;
  }

  function selectZip(file){
    const isZip=/\.zip$/i.test(file.name);
    const name=isZip?file.name.replace(/\.zip$/i,'').trim().slice(0,80):'';
    const message=!isZip?'请选择 .zip 文件':!name?'请使用带名称的 ZIP 文件':'';
    showSelection({label:file.name,type:isZip?'ZIP 文件':'文件',name,file},message);
    (name?confirm:remove).focus();
  }

  remove.addEventListener('click',()=>{showSelection(null);chooseFolder.focus();});
  chooseZip.addEventListener('click',()=>fileInput.click());
  chooseFolder.addEventListener('click',()=>folderInput.click());
  fileInput.addEventListener('change',()=>{
    const file=fileInput.files[0];
    if(!file)return;
    fileInput.value='';
    selectZip(file);
  });
  folderInput.addEventListener('change',()=>{
    const file=folderInput.files[0];
    if(!file)return;
    const [folder,entry]=file.webkitRelativePath?.split('/')||[];
    folderInput.value='';
    if(!folder||!entry){
      showSelection({label:folder||file.name,type:'文件夹'},'无法读取文件夹，请重新选择');
      remove.focus();
      return;
    }
    showSelection({label:folder,type:'文件夹',name:folder.trim().slice(0,80)});
    confirm.focus();
  });
  dropZone.addEventListener('dragover',event=>{
    if(!Array.from(event.dataTransfer.types).includes('Files'))return;
    event.preventDefault();
    event.dataTransfer.dropEffect='copy';
    dropZone.classList.add('is-dragging');
  });
  dropZone.addEventListener('dragleave',event=>{
    if(!dropZone.contains(event.relatedTarget))dropZone.classList.remove('is-dragging');
  });
  dropZone.addEventListener('drop',event=>{
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
    const files=event.dataTransfer.files;
    if(files.length!==1){
      showSelection(null,'请拖入一个 ZIP 文件');
      chooseZip.focus();
      return;
    }
    selectZip(files[0]);
  });

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(confirm.disabled)return;
    const item=selected;
    error.textContent='';
    if(item.file){
      confirm.disabled=true;
      const valid=await isZipArchive(item.file);
      if(selected!==item||!dialog.open)return;
      confirm.disabled=!valid;
      if(!valid){
        error.textContent='无法读取 ZIP 文件，请检查文件格式或重新选择';
        remove.focus();
        return;
      }
    }
    if(ownerId!==assetOwnerKey()||!isPersonalAssets(kind)){
      error.textContent='当前账号或页面已切换，请重新打开导入';
      return;
    }
    const current=kind==='team'?TEAMS:MY_EXPERTS;
    if(current.some(asset=>asset.ownerId===ownerId&&asset.name===item.name)){
      error.textContent='个人开发中已有同名资产，请另选文件或文件夹';
      return;
    }
    // 原型按来源名称生成草稿，团队使用当前可见的示例成员。
    const members=kind==='team'
      ? EXPERTS.filter(asset=>layerOf('expert',asset)==='builtin'&&layerVisible('expert',asset))
        .slice(0,2).map(asset=>asset.id)
      : [];
    const result=savePersonalAsset({kind,name:item.name,desc:'',modes:['需求'],members});
    if(!result.ok){
      error.textContent=result.message;
      return;
    }
    const panel=trigger.closest('.cv-panel');
    const search=panel.querySelector('.asset-search input');
    search.value='';
    search.dispatchEvent(new Event('input',{bubbles:true}));
    panel.querySelector('[data-layer="all"]').click();
    renderExpertChips();
    dialog.close();
    toast('已导入到个人开发','success');
  });
}

async function isZipArchive(file){
  try{
    // 只检查 ZIP 目录结束记录，不解包或读取资产配置。
    const tail=new DataView(await file.slice(-65557).arrayBuffer());
    for(let offset=tail.byteLength-22;offset>=0;offset--){
      if(tail.getUint32(offset,true)!==0x06054b50)continue;
      const endsAt=offset+22+tail.getUint16(offset+20,true);
      if(endsAt===tail.byteLength)return tail.getUint16(offset+10,true)>0;
    }
  }catch(_){
    return false;
  }
  return false;
}
