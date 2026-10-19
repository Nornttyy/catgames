const MODES=['table','fish','jump','race','brawl'];
const COLORS=['gray','orange','cream','black'];
const SCORE_KEYS=['best','fishBest','jumpBest','raceBest','brawlBest'];
const TAUGHT_KEYS=['taught','fishTaught','jumpTaught','raceTaught','brawlTaught'];
const MARKER='catgames-canvas-return-v1';
const parse=raw=>{try{const v=JSON.parse(raw||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}};
const score=n=>Number.isFinite(Number(n))?Math.max(0,Math.floor(Number(n))):0;
const bestRank=(a,b)=>a&&b?Math.min(a,b):a||b;

export function mergeUnitySave(old,unity){
  const out={...old,matchSettings:{...old.matchSettings},matchRecords:{...old.matchRecords}};
  if(COLORS.includes(unity.color))out.color=unity.color;
  if(Number.isInteger(unity.mode)&&MODES[unity.mode])out.mode=MODES[unity.mode];
  if(typeof unity.muted==='boolean')out.muted=unity.muted;
  SCORE_KEYS.forEach((key,i)=>{const a=score(old[key]),b=score(unity.best?.[i]);out[key]=i<3?Math.max(a,b):bestRank(a,b);});
  TAUGHT_KEYS.forEach((key,i)=>out[key]=!!old[key]||!!unity.taught?.[i]);
  let index=0;
  for(const mode of ['race','brawl']){
    const maps=mode==='race'?['garden','harbor']:['kitchen','living'];
    const settings={...old.matchSettings?.[mode]};
    if(maps.includes(unity[mode+'Map']))settings.map=unity[mode+'Map'];
    if(['casual','normal','hard'].includes(unity[mode+'Difficulty']))settings.difficulty=unity[mode+'Difficulty'];
    out.matchSettings[mode]=settings;
    for(const map of maps)for(const difficulty of ['casual','normal','hard']){
      const key=`${mode}:${map}:${difficulty}`;
      const rank=bestRank(score(old.matchRecords?.[key]),score(unity.matchRecords?.[index++]));
      if(rank)out.matchRecords[key]=rank;
    }
  }
  return out;
}

export function loadSave(storage){
  let old={};
  try{
    storage??=globalThis.localStorage;
    const raw=storage.getItem('cat-games-v1');old=parse(raw);
    if(storage.getItem(MARKER))return old;
    const unity=parse(storage.getItem('catgames-unity-mirror'));
    if(!Array.isArray(unity.best))return old;
    const merged=mergeUnitySave(old,unity);
    // Keep both originals recoverable. Import only once, so later web choices
    // cannot be overwritten by an older Unity mirror on the next visit.
    if(raw&&!storage.getItem('cat-games-before-canvas-return'))storage.setItem('cat-games-before-canvas-return',raw);
    storage.setItem('cat-games-v1',JSON.stringify(merged));
    storage.setItem(MARKER,'1');return merged;
  }catch{return old;}
}
