/* Platform asset versions use SemVer core numbers: major.minor.patch. */
const SEMVER=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function normalizeVersion(value){
  if(typeof value==='number'&&Number.isSafeInteger(value)&&value>0)return `1.${value-1}.0`;
  if(typeof value==='string'&&/^[1-9]\d*$/.test(value))return normalizeVersion(Number(value));
  if(typeof value==='string'&&SEMVER.test(value))return value;
  return '';
}

export function compareVersions(left,right){
  const a=normalizeVersion(left),b=normalizeVersion(right);
  if(!a||!b)return a?1:b?-1:0;
  const x=a.split('.').map(Number),y=b.split('.').map(Number);
  for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;
  return 0;
}

export function bumpVersion(current,level='patch'){
  const normalized=normalizeVersion(current);
  if(!normalized)return '1.0.0';
  const [major,minor,patch]=normalized.split('.').map(Number);
  if(level==='major')return `${major+1}.0.0`;
  if(level==='minor')return `${major}.${minor+1}.0`;
  return `${major}.${minor}.${patch+1}`;
}
