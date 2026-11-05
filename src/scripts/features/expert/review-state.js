export const REVIEW_KEY='lingee.platform.reviews.v1';

export function readAssetReviews(){
  try{
    const rows=JSON.parse(localStorage.getItem(REVIEW_KEY)||'[]');
    return Array.isArray(rows)?rows:[];
  }catch(_){return [];}
}

export function latestPersonalReview(kind,item){
  return readAssetReviews().findLast(row=>row?.kind===kind&&row.sourceId===item.id
    &&(!item.ownerId||!row.ownerId||row.ownerId===item.ownerId));
}

// Capture the submitted configuration before converting personal member IDs to enterprise IDs.
export function reviewSourceSnapshot(kind,item){
  const common={name:item.name,desc:item.desc||'',cmds:item.cmds||[]};
  if(kind==='expert')return {
    ...common,k:item.k||'eng',tags:item.tags||[],skills:item.skills||[],
    modes:item.modes||[],tier:item.tier||'auto',comp:item.comp||[]
  };
  const members=item.members||[];
  const stages=Object.entries(item.stageMembers||{})
    .filter(([,ids])=>ids.length).sort(([a],[b])=>a.localeCompare(b));
  return {...common,members,leadId:item.leadId||members[0]||null,domains:item.domains||[],stages};
}

export function reviewedAsset(review){
  return review.bundle?.find(entry=>entry.kind===review.kind)?.data;
}

function legacySourceSnapshot(review){
  const data=reviewedAsset(review);
  if(!data)return null;
  if(review.kind==='expert')return reviewSourceSnapshot('expert',data);
  const prefix='tenant-'+review.tenantId+'-';
  const personalMemberId=id=>id?.startsWith(prefix)&&review.bundle.some(entry=>entry.kind==='expert'&&entry.data.id===id)
    ?id.slice(prefix.length):id;
  return reviewSourceSnapshot('team',{
    ...data,members:(data.members||[]).map(personalMemberId),leadId:personalMemberId(data.leadId)
  });
}

export function hasPersonalReviewChanges(kind,item,review){
  const submitted=review.sourceSnapshot||legacySourceSnapshot(review);
  return !!submitted&&JSON.stringify(reviewSourceSnapshot(kind,item))!==JSON.stringify(submitted);
}
