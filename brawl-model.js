import {emitWorldFX} from './brawl-fx.js?v=room-6';
import {DIFFICULTIES,difficultyKey,mapFor} from './match-options.js?v=room-6';
import {setBrawlViewport,updateBrawlCamera} from './brawl-camera.js?v=room-6';
export const BRAWL={width:1800,edge:75,duration:85,hp:100,speed:235,jump:1060,gravity:1850,damage:20,dashSpeed:650,windup:.12,active:.23,recovery:.18,cooldown:1.25};
// Collision tops use the same world coordinates as the kitchen artwork/shelf sprites.
export const COUNTERS=[
  {id:'counter',left:345,right:1765,y:-274},
  {id:'shelf-left',left:370,right:640,y:-454,shelf:true},
  {id:'shelf-window',left:690,right:990,y:-460,shelf:true},
  {id:'shelf-stove',left:1260,right:1510,y:-455,shelf:true},
  {id:'fridge',left:72,right:336,y:-578},
  {id:'cabinet-left',left:354,right:586,y:-662},
  {id:'window-top',left:615,right:1042,y:-642},
  {id:'cabinet-mid',left:1072,right:1298,y:-662},
  {id:'hood',left:1307,right:1458,y:-616},
  {id:'cabinet-right',left:1538,right:1765,y:-662},
];
export const SURFACES=[{id:'floor',left:0,right:BRAWL.width,y:0},...COUNTERS];
export const LIVING_COUNTERS=[
  {id:'l-bookcase-left',left:71,right:345,y:-448},{id:'l-sofa-back',left:426,right:887,y:-289},
  {id:'l-sofa-seat',left:431,right:882,y:-166},{id:'l-tv',left:964,right:1481,y:-209},
  {id:'l-bookcase-right',left:1517,right:1755,y:-507},{id:'l-shelf-left',left:374,right:640,y:-430},
  {id:'l-shelf-mid',left:977,right:1196,y:-479},{id:'l-shelf-right',left:1218,right:1481,y:-427},
];
export const surfacesFor=map=>map==='living'?[SURFACES[0],...LIVING_COUNTERS]:SURFACES;
const LANDING_MARGIN=26;
export function canReachSurface(from,to){
  const rise=from.y-to.y,disc=BRAWL.jump**2-2*BRAWL.gravity*rise;
  if(disc<0||from===to)return false;
  const range=BRAWL.speed*(BRAWL.jump+Math.sqrt(disc))/BRAWL.gravity-35;
  const gap=Math.max(0,to.left+LANDING_MARGIN-(from.right-LANDING_MARGIN),from.left+LANDING_MARGIN-(to.right-LANDING_MARGIN));
  return gap<=range;
}
// A small platform graph gives bots real stepping-stone routes, never teleports.
const routeCache=new Map();
export function platformRoute(fromId,toId,surfaces=SURFACES){
  if(fromId===toId)return [];
  const key=`${fromId}:${toId}`;if(routeCache.has(key))return routeCache.get(key);
  const queue=[[fromId]],seen=new Set([fromId]);
  while(queue.length){const path=queue.shift(),from=surfaces.find(p=>p.id===path.at(-1));if(!from)continue;
    for(const to of surfaces){if(seen.has(to.id)||!canReachSurface(from,to))continue;
      const next=[...path,to.id];if(to.id===toId){const result=next.slice(1);routeCache.set(key,result);return result;}seen.add(to.id);queue.push(next);
    }
  }return [];
}
function supportAt(x,y,surfaces=SURFACES){return surfaces.filter(p=>x>p.left&&x<p.right&&p.y>=y-2).sort((a,b)=>a.y-b.y)[0]||surfaces[0];}
export const PICKUP_NAMES={food:'罐头',shield:'泡泡盾',pepper:'辣椒',speed:'加速',magnet:'磁铁',feather:'轻羽',glove:'拳套',ice:'冰棒'};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createBrawl({color='gray',tutorial=false,random=Math.random,difficulty='normal',map='kitchen',ratio=1}={}){
  difficulty=difficultyKey(difficulty);map=mapFor('brawl',map).id;const config=DIFFICULTIES[difficulty],surfaces=surfacesFor(map);
  const colors=['gray','orange','cream','black'];
  const cats=Array.from({length:6},(_,id)=>({id,bot:id!==0,color:id?colors[(id-1)%4]:color,x:[800,250,510,1110,1390,1660][id],y:0,vx:0,vy:0,facing:id%2?-1:1,hp:100,grounded:true,surface:0,drop:0,anim:0,
    attack:0,cooldown:0,hit:new Set(),invincible:2.5,stun:0,hitPause:0,flash:0,shield:0,power:0,speed:0,glove:0,ice:0,chilled:0,feather:0,deadTime:0,kills:0,damage:0,think:.6+id*.16,dir:0,target:null,jumpBuffer:0,coyote:.1,land:0,trail:[]}));
  const spawn=map==='living'?['l-sofa-back','l-bookcase-left','l-sofa-seat','l-shelf-mid','l-tv','l-bookcase-right']:['counter','fridge','counter','cabinet-mid','shelf-stove','floor'];
  cats.forEach((c,i)=>{const p=surfaces.find(p=>p.id===spawn[i]);c.x=clamp(c.x,p.left+35,p.right-35);c.y=p.y;c.surface=p.y;c.surfaceId=p.id;c.dropFrom=null;c.airGoal=null;});
  const s={status:'play',paused:false,phase:'countdown',countdown:2.5,time:0,age:0,remaining:BRAWL.duration,cats,random,events:[],fx:[],camera:500,cameraY:0,rank:6,tutorial,
    difficulty,map,config,surfaces,counters:map==='living'?LIVING_COUNTERS:COUNTERS,
    items:map==='living'?[{id:0,kind:'shield',x:540,y:-321,taken:false},{id:1,kind:'glove',x:1080,y:-511,taken:false},{id:2,kind:'ice',x:1300,y:-241,taken:false}]:[{id:0,kind:'shield',x:380,y:-32,taken:false},{id:1,kind:'glove',x:860,y:-492,taken:false},{id:2,kind:'ice',x:1150,y:-694,taken:false}],nextItem:4,itemSerial:3,deathWait:0};
  setBrawlViewport(s,ratio,true);return s;
}
export function brawlAction(s,action,id=0){
  if(s.status!=='play'||s.paused||s.phase!=='fight')return false;
  const c=s.cats[id];if(!c||c.hp<=0||c.stun>0)return false;
  if(action==='jump'){
    if(!c.grounded&&c.coyote<=0){c.jumpBuffer=.12;return false;}
    c.vy=-BRAWL.jump*(c.feather>0?1.13:1);c.grounded=false;c.coyote=0;c.y-=.01;if(id===0){s.events.push({type:'jump'});emitWorldFX(s,'jump',c.x,c.y);}return true;
  }
  if(action==='drop'){
    if(!c.grounded||c.surface===0)return false;c.drop=.3;c.dropFrom=c.surface;c.grounded=false;c.coyote=0;c.y+=5;c.vy=40;return true;
  }
  if(action==='attack'&&c.cooldown<=0&&c.attack<=0){
    c.attack=BRAWL.windup+BRAWL.active+BRAWL.recovery;c.cooldown=c.glove>0?.78:BRAWL.cooldown;c.hit.clear();
    if(id===0)s.events.push({type:'brawl-charge'});return true;
  }
  return false;
}
export function attackPhase(c){
  if(c.attack>BRAWL.active+BRAWL.recovery)return 'windup';
  if(c.attack>BRAWL.recovery)return 'dash';
  return c.attack>0?'recover':'idle';
}
export function brawlOrder(s){return [...s.cats].sort((a,b)=>(b.hp>0)-(a.hp>0)||b.kills-a.kills||b.damage-a.damage||b.hp-a.hp||a.id-b.id);}
export function damageCat(s,from,to){
  if(to.hp<=0||to.invincible>0||from.hit.has(to.id))return false;
  from.hit.add(to.id);const blocked=to.shield>0,base=from.power>0?32:BRAWL.damage,amount=blocked?0:base;
  if(blocked)to.shield=0;
  if(!blocked&&from.ice>0)to.chilled=2.2;
  from.damage+=Math.min(to.hp,amount);to.hp=Math.max(0,to.hp-amount);to.flash=.16;to.invincible=.85;to.stun=.15;to.hitPause=.035;from.hitPause=.035;
  to.vx=from.facing*(blocked?200:430);to.vy=-180;to.grounded=false;to.attack=0;
  emitWorldFX(s,blocked?'shield':'impact',(from.x+to.x)/2,(from.y+to.y)/2-58,{dir:from.facing,power:from.power>0});
  if(from.id===0||to.id===0)s.events.push({type:blocked?'shield-break':'brawl-hit',hurt:to.id===0,x:to.x,y:to.y-43});
  if(to.hp===0){from.kills++;s.events.push({type:'brawl-ko',id:to.id,by:from.id});}
  return true;
}
export function takeBrawlItem(s,c,item){
  if(item.taken||c.hp<=0)return false;
  item.taken=true;
  if(item.kind==='food')c.hp=Math.min(BRAWL.hp,c.hp+32);
  if(item.kind==='shield')c.shield=12;
  if(item.kind==='pepper')c.power=9;
  if(item.kind==='speed')c.speed=7;
  if(item.kind==='glove')c.glove=9;
  if(item.kind==='ice')c.ice=9;
  if(item.kind==='feather')c.feather=8;
  emitWorldFX(s,item.kind==='shield'?'bubble':item.kind,c.x,c.y-60,{owner:c.id});
  if(c.id===0)s.events.push({type:'pickup',kind:item.kind});
  return true;
}
export function brawlTactic(s,c,t){
  if(!t||c.attack>0)return 'chase';
  const dx=t.x-c.x,distance=Math.abs(dx),near=Math.abs(t.y-c.y)<72;
  if(!near)return 'chase';
  const style=s.config.brawlTactics,phase=attackPhase(t);
  const incoming=['windup','dash'].includes(phase)&&t.facing*dx<0&&distance<190;
  if(style!=='chase'&&incoming&&c.grounded)return 'dodge';
  if(style==='counter'){
    if(t.shield>0&&c.shield<=0&&distance<145)return 'retreat';
    if(c.cooldown<=0&&(phase==='recover'||t.cooldown>.25)&&distance<175)return 'attack';
    if(c.cooldown>0&&distance<140)return 'retreat';
    if(phase==='dash')return 'retreat';
  }
  if(style!=='chase'&&['windup','dash'].includes(phase))return 'chase';
  return distance<135&&c.cooldown<=0?'attack':'chase';
}
function botThink(s,c,dt){
  c.think-=dt;
  const observe=c.think<=0;
  if(observe){
    c.think=.22+s.random()*.08;
    const cost=t=>Math.abs(t.x-c.x)+Math.abs(t.y-c.y)*.8;
    const others=s.cats.filter(o=>o!==c&&o.hp>0),target=others.sort((a,b)=>{
      const opening=o=>s.config.brawlTactics==='counter'&&attackPhase(o)==='recover'?70:0;
      return cost(a)-opening(a)-cost(b)+opening(b);
    })[0];
    const item=s.items.filter(i=>!i.taken&&(i.kind!=='food'||c.hp<75)).sort((a,b)=>cost(a)-cost(b))[0];
    c.target=item&&cost(item)<340&&(s.config.brawlTactics!=='chase'||!target||cost(target)>180)?{type:'item',id:item.id}:target?{type:'cat',id:target.id}:null;
  }
  const t=c.target?.type==='item'?s.items.find(i=>i.id===c.target.id&&!i.taken):s.cats.find(o=>o.id===c.target?.id&&o.hp>0);if(!t){c.dir=0;return;}
  const ty=c.target.type==='item'?t.y+32:t.y,dx=t.x-c.x;
  c.dir=Math.abs(dx)>48?Math.sign(dx):0;
  if(c.grounded){
    c.airGoal=null;
    const from=supportAt(c.x,c.y,s.surfaces),destination=supportAt(t.x,ty,s.surfaces);
    const next=s.surfaces.find(p=>p.id===platformRoute(from.id,destination.id,s.surfaces)[0]);
    if(next){
      const landing=clamp(t.x,next.left+LANDING_MARGIN,next.right-LANDING_MARGIN),takeoff=clamp(landing,from.left+LANDING_MARGIN,from.right-LANDING_MARGIN);
      c.dir=Math.abs(takeoff-c.x)>18?Math.sign(takeoff-c.x):0;
      if(Math.abs(takeoff-c.x)<=20){
        c.airGoal={x:landing,y:next.y};c.dir=Math.abs(landing-c.x)>12?Math.sign(landing-c.x):0;
        if(next.y>from.y&&c.x>next.left+LANDING_MARGIN&&c.x<next.right-LANDING_MARGIN)brawlAction(s,'drop',c.id);
        else brawlAction(s,'jump',c.id);
      }
    }
  }else if(c.airGoal)c.dir=Math.abs(c.airGoal.x-c.x)>12?Math.sign(c.airGoal.x-c.x):0;
  if(c.dir&&c.attack<=0)c.facing=c.dir;
  if(c.target.type==='cat'&&observe){
    c.facing=Math.sign(dx)||c.facing;
    const tactic=brawlTactic(s,c,t);
    if(tactic==='dodge')brawlAction(s,'jump',c.id);
    if(tactic==='retreat')c.retreatUntil=s.age+.3;
    if(tactic==='attack')brawlAction(s,'attack',c.id);
  }
  if(c.retreatUntil>s.age&&c.attack<=0)c.dir=-Math.sign(dx);
}
function step(s,dt,input){
  s.age+=dt;for(const f of s.fx)f.age+=dt;s.fx=s.fx.filter(f=>f.age<f.life);
  if(s.phase==='countdown'){const old=Math.ceil(s.countdown);s.countdown=Math.max(0,s.countdown-dt);if(Math.ceil(s.countdown)!==old)s.events.push({type:s.countdown===0?'race-go':'race-tick'});if(!s.countdown)s.phase='fight';return;}
  s.time+=dt;s.remaining=Math.max(0,BRAWL.duration-s.time);
  for(const c of s.cats){
    if(c.hp<=0){c.deadTime+=dt;continue;}
    for(const k of ['cooldown','invincible','stun','flash','shield','power','speed','glove','ice','chilled','feather','drop','jumpBuffer','land'])c[k]=Math.max(0,c[k]-dt);
    if(c.hitPause>0){c.hitPause=Math.max(0,c.hitPause-dt);continue;}
    if(c.bot)botThink(s,c,dt);else c.dir=clamp(input,-1,1);
    c.attack=Math.max(0,c.attack-dt);const phase=attackPhase(c);
    const movement=(c.speed>0?1.3:1)*(c.chilled>0?.55:1);
    if(phase==='dash')c.vx=c.facing*BRAWL.dashSpeed*movement;
    else if(c.stun<=0){const target=c.dir*BRAWL.speed*movement*(phase==='windup'?.12:phase==='recover'?.4:1);c.vx+=(target-c.vx)*(1-Math.exp(-19*dt));if(c.dir&&phase==='idle')c.facing=c.dir;}
    c.x=clamp(c.x+c.vx*dt,BRAWL.edge,BRAWL.width-BRAWL.edge);c.anim+=dt*Math.max(.3,Math.abs(c.vx)/BRAWL.speed);
    const oldY=c.y;c.vy+=BRAWL.gravity*dt;c.y+=c.vy*dt;c.grounded=false;
    const surfaces=s.surfaces.filter(p=>!(c.drop>0&&p.y===c.dropFrom));
    for(const p of surfaces.sort((a,b)=>a.y-b.y))if(c.vy>=0&&oldY<=p.y+.1&&c.y>=p.y&&c.x>p.left&&c.x<p.right){
      c.y=p.y;c.vy=0;c.grounded=true;c.surface=p.y;c.surfaceId=p.id;if(oldY<p.y-1){c.land=.14;if(c.id===0){s.events.push({type:'land'});emitWorldFX(s,'land',c.x,c.y);}}break;
    }
    c.coyote=c.grounded?.1:Math.max(0,c.coyote-dt);if(c.grounded&&c.jumpBuffer>0)brawlAction(s,'jump',c.id);
    c.trail=c.trail.filter(p=>(p.age+=dt)<.14);if(phase==='dash'&&(!c.trail.length||c.trail.at(-1).age>.035))c.trail.push({x:c.x,y:c.y,age:0});
    for(const item of s.items)if(!item.taken&&Math.abs(item.x-c.x)<43&&Math.abs(item.y-(c.y-35))<55)takeBrawlItem(s,c,item);
  }
  for(const a of s.cats)if(a.hp>0&&attackPhase(a)==='dash')for(const b of s.cats)if(a!==b&&b.hp>0&&Math.abs(a.x-b.x)<65&&Math.abs(a.y-b.y)<66&&(b.x-a.x)*a.facing>-25)damageCat(s,a,b);
  // Bodies separate softly; simply touching another cat causes no damage.
  for(let i=0;i<s.cats.length;i++)for(let j=i+1;j<s.cats.length;j++){
    const a=s.cats[i],b=s.cats[j];if(a.hp<=0||b.hp<=0||Math.abs(a.y-b.y)>55||attackPhase(a)==='dash'||attackPhase(b)==='dash')continue;
    const dx=b.x-a.x;if(Math.abs(dx)<45){const push=(45-Math.abs(dx))*.5*(Math.sign(dx)||1);a.x=clamp(a.x-push,BRAWL.edge,BRAWL.width-BRAWL.edge);b.x=clamp(b.x+push,BRAWL.edge,BRAWL.width-BRAWL.edge);}
  }
  s.nextItem-=dt;if(s.nextItem<=0){s.nextItem=4;s.items=s.items.filter(i=>!i.taken);if(s.items.length<7){const p=s.surfaces[Math.floor(s.random()*s.surfaces.length)],x=p.left+45+s.random()*(p.right-p.left-90),kinds=['food','shield','pepper','speed','glove','ice','feather'];s.items.push({id:s.itemSerial,kind:kinds[s.itemSerial++%kinds.length],x,y:p.y-32,taken:false});}}
  updateBrawlCamera(s,dt);
  const alive=s.cats.filter(c=>c.hp>0).length;s.rank=brawlOrder(s).findIndex(c=>c.id===0)+1;
  if(s.cats[0].hp<=0)s.deathWait+=dt;
  if(s.deathWait>.65||alive<=1||s.remaining===0){s.status='ended';s.phase='finish';s.events.push({type:'end',result:s.cats[0].hp>0&&s.rank===1?'cleared':'finished'});}
}
export function updateBrawl(s,dt,input=0){
  if(s.status!=='play'||s.paused||!Number.isFinite(dt)||dt<=0)return;
  let remaining=Math.min(.1,dt);while(remaining>1e-9&&s.status==='play'){const sub=Math.min(1/120,remaining);step(s,sub,input);remaining-=sub;}
}
