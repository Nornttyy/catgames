import {BRAWL,brawlOrder} from './brawl-model.js?v=controls-7';
import {FISH_HOME} from './fish-model.js?v=controls-7';
import {touchesSpike} from './jump-collision.js?v=controls-7';

export function canRevive(mode,s){
  if(!s||s.reviveUsed||!['over','ended'].includes(s.status))return false;
  if(mode==='brawl')return s.cats[0].hp<=0&&s.remaining>0&&s.cats.some(c=>c.hp>0);
  if(mode==='jump')return s.reason==='spike';
  if(mode==='fish'||mode==='table')return s.result==='caught'&&s.time>0;
  return false;
}
export const reviveHint=mode=>({
  brawl:'满血返回 · 3 秒保护',
  jump:'回到上次落脚处',
  fish:'补回机会 · 保留鱼干',
  table:'保留进度 · 重新躲好',
}[mode]||'');

// Resume the same round and route, not a fresh game with its score copied over.
export function reviveGame(mode,s){
  if(!canRevive(mode,s))return false;
  if(mode==='brawl'){
    const c=s.cats[0],alive=s.cats.filter(other=>other.hp>0);
    const spots=s.surfaces.flatMap(p=>[.25,.5,.75].map(t=>({x:p.left+(p.right-p.left)*t,y:p.y,p})))
      .filter(p=>p.x>=BRAWL.edge&&p.x<=BRAWL.width-BRAWL.edge);
    const distance=p=>Math.min(...alive.map(other=>Math.hypot(p.x-other.x,p.y-other.y)));
    const spot=spots.sort((a,b)=>distance(b)-distance(a))[0];
    Object.assign(c,{x:spot.x,y:spot.y,vx:0,vy:0,hp:BRAWL.hp,grounded:true,surface:spot.y,surfaceId:spot.p.id,
      drop:0,dropFrom:null,anim:0,attack:0,cooldown:0,invincible:3,shield:3,stun:0,hitPause:0,flash:0,
      chilled:0,power:0,speed:0,glove:0,ice:0,feather:0,deadTime:0,dir:0,target:null,
      jumpBuffer:0,coyote:.1,land:0,trail:[],airGoal:null});
    c.hit.clear();s.deathWait=0;s.phase='fight';s.rank=brawlOrder(s).findIndex(cat=>cat.id===0)+1;
  }else if(mode==='jump'){
    // Check all grounded poses; a blink or crouch must not collide immediately after revival.
    const cat={x:s.safeX??140,y:0,vx:0,vy:0};
    while(cat.x>75&&s.hazards.some(h=>[0,2,12,13,14,15].some(f=>touchesSpike(cat,h,f,s.color))))cat.x-=2;
    Object.assign(s.cat,cat);s.safeX=cat.x;s.camera=Math.max(0,cat.x-140);
    s.phase='ready';s.charge=0;s.deathTime=0;s.landTime=0;s.reason=null;
  }else{
    Object.assign(s.owner,{phase:'away',timer:4.8,duration:4.8,noise:0,suspicion:0,seen:false,rechecking:false,recheckQueued:false});
    if(mode==='fish'){
      for(const f of s.snacks)if(f.state==='held')f.state='tray';
      Object.assign(s.paw,FISH_HOME,{target:{...FISH_HOME},path:[{...FISH_HOME}],bag:[],carrying:false,returning:false,dragging:false});
      s.fish=s.snacks.find(f=>f.state==='tray')||s.snacks[0];
      s.mistakes=0;s.startle=0;s.cooldown=0;s.hitCooldown=0;
    }else Object.assign(s.cat,{action:'idle',anim:0,target:null,pending:null,hidden:false});
  }
  s.reviveUsed=true;s.reviveWait=2;s.status='play';s.paused=false;s.result=null;
  s.events.length=0;if(s.fx)s.fx.length=0;
  return true;
}
