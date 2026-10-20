// Local, cosmetic-only progression. Coins have no cash value.
export const CATS=[
  {id:'black',label:'黑猫',price:0,fur:'#48474d'},
  {id:'gray',label:'灰白',price:180,fur:'#b3ada5'},
  {id:'orange',label:'橘白',price:360,fur:'#ffb653'},
  {id:'cream',label:'奶白',price:600,fur:'#fff2cf'},
];
export const GIFT_COINS=40,DAILY_GIFTS=3,AD_SECONDS=5;
const integer=(v,max=9999999)=>Number.isFinite(Number(v))?Math.min(max,Math.max(0,Math.floor(Number(v)))):0;
export const dayKey=(date=new Date())=>`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
export function loadEconomy(raw){
  // Previous versions had free previews, not owned cats. Preserve scores separately.
  if(raw?.version!==1)return {version:1,coins:0,owned:['black'],giftDay:'',giftCount:0,lastRound:null};
  const round=raw.lastRound;
  return {version:1,coins:integer(raw.coins),owned:[...new Set(['black',...(Array.isArray(raw.owned)?raw.owned:[]).filter(id=>CATS.some(c=>c.id===id))])],
    giftDay:typeof raw.giftDay==='string'?raw.giftDay:'',giftCount:integer(raw.giftCount,DAILY_GIFTS),
    lastRound:round&&typeof round.id==='string'?{id:round.id,coins:integer(round.coins,65),doubled:round.doubled===true}:null};
}
export const ownsCat=(wallet,id)=>wallet.owned.includes(id);
export const equippedCat=(wallet,id)=>ownsCat(wallet,id)?id:'black';
export function buyCat(wallet,id){
  const cat=CATS.find(c=>c.id===id);
  if(!cat||ownsCat(wallet,id)||wallet.coins<cat.price)return false;
  wallet.coins-=cat.price;wallet.owned.push(id);return true;
}
export function coinsForRound(mode,s,result){
  if(!s||!['over','ended'].includes(s.status))return 0;
  const n=v=>integer(v,10000),clear=result==='cleared'?12:0;
  if(mode==='table')return Math.min(60,n(s.falls)*3+(n(s.falls)?clear:0));
  if(mode==='fish')return Math.min(60,n(s.caught)*2+(n(s.caught)?clear:0));
  if(mode==='jump')return Math.min(60,n(s.cleared)*3);
  if(mode==='race'){
    const r=s.racers?.[0];
    if(!r||!Number.isFinite(r.finishTime)||r.finishTime<=0)return 0;
    return Math.min(65,({1:55,2:40,3:30}[s.rank]||0)+Math.min(10,n(r.bestClean)));
  }
  if(mode==='brawl')return Math.min(65,Math.floor(n(s.time)/6)+n(s.cats?.[0]?.kills)*4+(s.rank===1?20:0));
  return 0;
}
export function settleRound(wallet,id,mode,state,result){
  if(!id||wallet.lastRound?.id===id)return 0;
  const coins=coinsForRound(mode,state,result);
  wallet.coins=integer(wallet.coins+coins);wallet.lastRound={id,coins,doubled:false};return coins;
}
export function doubleRound(wallet,id){
  const round=wallet.lastRound;
  if(!round||round.id!==id||round.doubled||round.coins<=0)return 0;
  round.doubled=true;wallet.coins=integer(wallet.coins+round.coins);return round.coins;
}
export const giftsLeft=(wallet,day=dayKey())=>wallet.giftDay===day?Math.max(0,DAILY_GIFTS-wallet.giftCount):DAILY_GIFTS;
export function claimGift(wallet,day=dayKey()){
  if(!giftsLeft(wallet,day))return 0;
  if(wallet.giftDay!==day){wallet.giftDay=day;wallet.giftCount=0;}
  wallet.giftCount++;wallet.coins=integer(wallet.coins+GIFT_COINS);return GIFT_COINS;
}
export class RewardSession{
  elapsed=0;closed=false;claimed=false;
  advance(seconds,visible=true){if(!this.closed&&visible&&Number.isFinite(seconds))this.elapsed=Math.min(AD_SECONDS,this.elapsed+Math.max(0,Math.min(.25,seconds)));}
  get ready(){return !this.closed&&this.elapsed>=AD_SECONDS;}
  claim(callback){if(!this.ready||this.claimed)return false;this.claimed=true;callback();this.closed=true;return true;}
  cancel(){this.closed=true;}
}
