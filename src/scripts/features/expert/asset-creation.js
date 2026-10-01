import { EXPERTS, EX, MY_EXPERTS, WORK_MODES, rebuildExperts } from './data.js';
import { assetOwnerKey, layerVisible } from './layers.js';
import { TEAMS, saveTeams } from './store.js';

/* 对话创建原型：会话生成可编辑草稿，用户确认用途后才写入专家库。 */
export function newAssetDraft(kind){
  return {kind,name:'',desc:'',modes:['分析'],members:[],messages:[],status:'prompt',scope:''};
}

export function availableAssetMembers(){
  return EXPERTS.filter(expert=>layerVisible('expert',expert));
}

export function applyAssetMessage(draft,message){
  const text=String(message||'').trim();
  if(!text)return false;
  draft.messages.push(text);
  const label=draft.kind==='team'?'专家团':'数字员工';
  const named=text.match(/(?:名称|名字)\s*(?:是|为|[:：])\s*[「“]?([^，。；;\n」”]{2,36})|(?:命名为|叫做|叫)\s*[「“]?([^，。；;\n」”]{2,36})/);
  const intent=text.match(new RegExp('(?:创建|新增|做)(?:一个|一位|一支)?\s*([^，。；;\\n]{2,30})'+label));
  if(named)draft.name=(named[1]||named[2]).trim();
  else if(!draft.name&&intent)draft.name=intent[1].trim();
  draft.desc=draft.desc?draft.desc+'\n'+text:text;
  if(draft.kind==='expert'){
    const matched=WORK_MODES.filter(mode=>text.includes(mode));
    if(matched.length)draft.modes=Array.from(new Set(draft.modes.concat(matched)));
  }else{
    const ids=availableAssetMembers().filter(expert=>text.includes(expert.name)).map(expert=>expert.id);
    draft.members=Array.from(new Set(draft.members.concat(ids)));
  }
  draft.status='draft';
  return true;
}

export function commitAssetDraft(draft,scope){
  const name=String(draft.name||'').trim(),desc=String(draft.desc||'').trim();
  if(!draft.messages.length)return {ok:false,message:'请先在对话中描述创建需求'};
  if(!name)return {ok:false,message:'请填写名称后再提交'};
  if(!desc)return {ok:false,message:'请填写职责或用途'};
  if(scope!=='personal')return {ok:false,message:'请先保存为个人，再到编辑页提交审核'};
  if(draft.kind==='expert'&&!draft.modes.length)return {ok:false,message:'请至少选择一项可承担的工作'};
  if(draft.kind==='team'&&(!draft.members.length||draft.members.some(id=>!EX[id]||!layerVisible('expert',EX[id]))))return {ok:false,message:'请至少选择一位当前可用的数字员工'};
  const id='my-'+draft.kind+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const ownerId=assetOwnerKey();
  const item=draft.kind==='expert'
    ? {id,mine:true,ownerId,k:'eng',name,role:'',by:'我创建的',desc,tags:[],skills:[],modes:draft.modes.slice(),tier:'auto',comp:[],cmds:[],kn:[],knOff:[],knUp:[]}
    : {id,preset:false,ownerId,name,by:'我创建的',desc,domains:[],leadId:draft.members[0],members:draft.members.slice(),cmds:[]};

  if(draft.kind==='expert'){MY_EXPERTS.push(item);rebuildExperts();}
  else TEAMS.push(item);
  if(!saveTeams()){
    if(draft.kind==='expert'){MY_EXPERTS.pop();rebuildExperts();}
    else TEAMS.pop();
    return {ok:false,message:'保存失败，草稿仍在当前会话中，请重试'};
  }

  draft.status='done';draft.scope=scope;draft.createdId=id;
  return {ok:true,item};
}
