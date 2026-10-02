import { EXPERTS, EX, MY_EXPERTS, WORK_MODES, rebuildExperts } from './data.js';
import { assetOwnerKey, layerVisible } from './layers.js';
import { TEAMS, saveTeams } from './store.js';

/* 对话创建原型：直接解析意图，仅在缺少必要信息时追问。 */
export function newAssetDraft(kind){
  return {kind,name:'',desc:'',modes:[],members:[],messages:[],questions:[],status:'prompt',scope:''};
}

export function assetStarterPrompt(kind){
  return kind==='team'
    ? '帮我创建一个[专家团名称]专家团，负责[要解决的问题]，成员包括[现有数字员工名称]。'
    : '帮我创建一个[专家名称]数字员工，负责[主要职责]，擅长[主要工作]。我的经验是：[行业背景与相关经验]';
}

export function availableAssetMembers(){
  return EXPERTS.filter(expert=>layerVisible('expert',expert));
}

const stripPlaceholders=text=>text.replace(/\[[^\]]+\]|［[^］]+］|X{2,}|…{2,}/gi,'').trim();
const genericRequest=text=>/^(?:请)?(?:帮我)?(?:创建|开发|新增|做)(?:一个|一位|一支)?(?:专家|数字员工|专家团)[。！!]?$/u.test(text.replace(/\s+/g,''));
function inferredModes(text){
  const modes=WORK_MODES.filter(mode=>text.includes(mode));
  if(/开发|编码|编程|代码|实现/.test(text))modes.push('实现');
  if(/测试|校验|检查|质量|验收/.test(text))modes.push('验证');
  if(/需求|分析|梳理|调研|诊断/.test(text))modes.push('分析');
  if(/架构|方案|设计/.test(text))modes.push('设计');
  if(/集成|接口|对接/.test(text))modes.push('集成');
  if(/评审|审查|审核/.test(text))modes.push('评审');
  if(/恢复|故障处置|应急/.test(text))modes.push('恢复');
  return [...new Set(modes)];
}
function inferredName(text,kind){
  const explicit=text.match(/(?:名称|名字)\s*(?:是|为|[:：])\s*[「“]?([^，。；;\n」”]{2,36})|(?:命名为|叫做|叫)\s*[「“]?([^，。；;\n」”]{2,36})/);
  if(explicit)return (explicit[1]||explicit[2]).trim();
  const noun=kind==='team'?'专家团':'(?:数字员工|专家)';
  const intent=text.match(new RegExp('(?:创建|新增|做|开发)(?:一个|一位|一支)?\\s*([^，。；;\\n]{2,30})('+noun+')'));
  if(intent&&!/^(?:一个|一位|一支|专业|全能|通用)$/.test(intent[1].trim()))return intent[1].trim()+intent[2];
  return '';
}
export function assetClarifyingQuestion(draft){
  const kind=draft.kind==='team'?'专家团':'数字员工';
  if(!draft.name)return {key:'name',text:`这个${kind}叫什么？请给出具体名称。`};
  if(!draft.desc)return {key:'purpose',text:`「${draft.name}」主要负责什么？请说一个实际任务或使用场景。`};
  if(draft.kind==='expert'&&!draft.modes.length)return {key:'modes',text:'它主要承担哪类工作？可以选择一项，也可以直接描述。',options:WORK_MODES};
  if(draft.kind==='team'&&!draft.members.length){
    const examples=availableAssetMembers().slice(0,5).map(expert=>expert.name).join('、');
    return {key:'members',text:`希望哪些现有数字员工加入「${draft.name}」？请直接说出名称。${examples?'例如：'+examples+'。':''}`};
  }
  return null;
}
export function applyAssetMessage(draft,message){
  const text=String(message||'').trim();
  if(!text)return false;
  const previous=draft.question?.key;
  draft.messages.push(text);
  draft.questions||=[];
  const understood=stripPlaceholders(text);
  if(understood){
    const name=inferredName(understood,draft.kind);
    if(name)draft.name=name;
    else if(previous==='name'&&understood.length<=36&&!/[，。；;\n]/.test(understood))draft.name=understood;
    const detail=understood===text?understood:(understood.match(/(?:负责|擅长|处理|解决)[^，。；;]{2,}/)?.[0]||'');
    if(detail&&!genericRequest(detail)&&(!['name','modes','members'].includes(previous)||/负责|擅长|处理|解决/.test(detail)))draft.desc=draft.desc?draft.desc+'\n'+detail:detail;
    if(draft.kind==='expert')draft.modes=[...new Set(draft.modes.concat(inferredModes(understood)))];
    else draft.members=[...new Set(draft.members.concat(availableAssetMembers().filter(expert=>understood.includes(expert.name)).map(expert=>expert.id)))];
  }
  draft.question=assetClarifyingQuestion(draft);
  draft.questions.push(draft.question);
  draft.status=draft.question?'question':'ready';
  return true;
}

export function commitAssetDraft(draft,scope){
  const name=String(draft.name||'').trim(),desc=String(draft.desc||'').trim();
  if(!draft.messages.length)return {ok:false,message:'请先在对话中描述创建需求'};
  if(!name)return {ok:false,message:'请填写名称后再提交'};
  if(!desc)return {ok:false,message:'请填写职责或用途'};
  if(scope!=='personal')return {ok:false,message:'请先保存为个人，再到编辑页提交审核'};
  if(draft.kind==='expert'&&!draft.modes.length)return {ok:false,message:'请至少选择一项可承担的工作'};
  if(draft.kind==='team'&&(!draft.members.length||draft.members.some(id=>!EX[id]||!layerVisible('expert',EX[id]))))return {ok:false,message:'请至少选择一位当前可用的专家'};
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
