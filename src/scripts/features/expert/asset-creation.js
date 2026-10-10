import { EXPERTS, EX, MY_EXPERTS, WORK_MODES, rebuildExperts } from './data.js';
import { assetOwnerKey, layerVisible } from './layers.js';
import { TEAMS, saveTeams } from './store.js';

/* 对话创建原型：直接解析意图，仅在缺少必要信息时追问。 */
export function newAssetDraft(kind){
  return {kind,name:'',desc:'',modes:[],members:[],messages:[],questions:[],status:'prompt',scope:''};
}

export function assetStarterPrompt(kind){
  return kind==='team'
    ? '帮我创建一个[智能体团队名称]智能体团队，负责[要解决的问题]，成员包括[现有智能体名称]。'
    : '帮我创建一个[智能体名称]智能体，负责[主要职责]，擅长[主要工作]。我的经验是：[行业背景与相关经验]';
}

export function availableAssetMembers(){
  return EXPERTS.filter(expert=>layerVisible('expert',expert));
}

/* 用创建者已经描述的职责给出候选成员，避免再让用户凭名字猜专家。 */
function matchedAssetMembers(text){
  const source=String(text||'').toLocaleLowerCase();
  const modeHints=[
    ['测试',['验证','测试','校验','质量','验收','回归']],
    ['实现',['开发','编码','编程','实现','搭建','构建']],
    ['分析',['分析','需求','梳理','调研','诊断','排查']],
    ['设计',['设计','方案','架构','规划']],
    ['集成',['集成','接口','对接','同步']],
    ['评审',['评审','审查','审核','检查']],
    ['恢复',['恢复','故障','应急','修复']]
  ];
  const hintedModes=modeHints.filter(function(entry){return entry[1].some(function(word){return source.includes(word);});}).map(function(entry){return entry[0];});
  return availableAssetMembers().map(function(expert,index){
    const corpus=[expert.name,expert.role,expert.desc].concat(expert.tags||[]).join('').toLocaleLowerCase();
    let score=0;
    hintedModes.forEach(function(mode){if((expert.modes||[]).includes(mode))score+=5;});
    (expert.tags||[]).forEach(function(tag){if(source.includes(String(tag).toLocaleLowerCase()))score+=3;});
    if(source.includes(String(expert.name).toLocaleLowerCase()))score+=12;
    if(source.includes(String(expert.role||'').toLocaleLowerCase()))score+=8;
    if(corpus&&source.includes(corpus))score+=2;
    return {expert,score,index};
  }).filter(function(row){return row.score>0;}).sort(function(a,b){return b.score-a.score||a.index-b.index;}).slice(0,3).map(function(row){return row.expert;});
}

const stripPlaceholders=text=>text.replace(/\[[^\]]+\]|［[^］]+］|X{2,}|…{2,}/gi,'').trim();
const genericRequest=text=>/^(?:请)?(?:帮我)?(?:创建|开发|新增|做)(?:一个|一位|一支)?(?:智能体|智能体|智能体团队|数字员工|智能体团队)[。！!]?$/u.test(text.replace(/\s+/g,''));
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
  const noun=kind==='team'?'(?:智能体团队|智能体团队)':'(?:智能体|数字员工|智能体)';
  const intent=text.match(new RegExp('(?:创建|新增|做|开发)(?:一个|一位|一支)?\\s*([^，。；;\\n]{2,30})('+noun+')'));
  if(intent&&!/^(?:一个|一位|一支|专业|全能|通用)$/.test(intent[1].trim()))return intent[1].trim()+intent[2];
  return '';
}
export function assetClarifyingQuestion(draft){
  const kind=draft.kind==='team'?'智能体团队':'智能体';
  if(!draft.name)return {key:'name',text:`这个${kind}叫什么？请给出具体名称。`};
  if(!draft.desc)return {key:'purpose',text:`「${draft.name}」主要负责什么？请说一个实际任务或使用场景。`};
  if(draft.kind==='expert'&&!draft.modes.length)return {key:'modes',text:'它主要承担哪类工作？可以选择一项，也可以直接描述。',options:WORK_MODES};
  if(draft.kind==='team'&&!draft.members.length){
    const matches=matchedAssetMembers(draft.desc);
    const examples=(matches.length?matches:availableAssetMembers().slice(0,5)).map(expert=>expert.name).join('、');
    return {key:'members',text:matches.length
      ? `根据你描述的职责，建议选择合适的智能体加入「${draft.name}」，可多选。`
      : `希望哪些现有智能体加入「${draft.name}」？请直接说出名称。${examples?'例如：'+examples+'。':''}`,
      options:matches.map(expert=>expert.name)};
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
  if(draft.kind==='team'&&(!draft.members.length||draft.members.some(id=>!EX[id]||!layerVisible('expert',EX[id]))))return {ok:false,message:'请至少选择一位当前可用的智能体'};
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
