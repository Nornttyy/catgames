// x is distance along the course; lane is continuous lateral position (0..2).
export const RACE={finish:10000,speed:260,gravity:1300,jump:700,slide:1.05,boost:1.65,boostSpeed:70,countdown:3,laneWidth:128,laneTime:.2,bodyHalfWidth:29,bodyHalfDepth:18};
const colors=['gray','orange','cream','black'];
export function makeCourse(random=Math.random){
  const obstacles=[];let x=780;
  for(let i=0;x<RACE.finish-500;i++){
    const lanes=[null,null,null],safe=Math.floor(random()*3);
    if(i<2)lanes[1]=i===0?'hurdle':'gate';
    else for(let lane=0;lane<3;lane++)if(lane!==safe)lanes[lane]=random()<.55?'hurdle':'gate';
    obstacles.push({id:i,x,lanes});x+=i<3?570:440+random()*130;
  }
  return obstacles;
}
export function createRace({color='gray',tutorial=true,random=Math.random}={}){
  const racers=Array.from({length:6},(_,id)=>({id,bot:id!==0,color:id?colors[(id-1)%4]:color,
    x:id?[20,300,440,190,-40][id-1]:120,y:0,vy:0,lane:id?(id-1)%3:1,laneTarget:id?(id-1)%3:1,laneFrom:id?(id-1)%3:1,laneAge:1,laneDuration:RACE.laneTime,
    speed:id?[245,257,252,254,248][id-1]:RACE.speed,skill:id?[.87,.92,.82,.87,.94][id-1]:1,
    slide:0,slideCooldown:0,stumble:0,invincible:0,boost:0,anim:id*.13,clean:0,bestClean:0,misses:0,passed:0,
    hit:new Set(),next:0,plan:null,finishTime:null,jumpBuffer:0,shield:0,itemBoost:0}));
  const obstacles=makeCourse(random),items=obstacles.filter((_,i)=>i%3===1).map((o,i)=>({id:i,x:o.x+225,lane:i%3,kind:i%2?'speed':'shield',taken:false}));
  return {status:'play',paused:false,phase:'countdown',countdown:RACE.countdown,time:0,age:0,camera:120,
    racers,obstacles,items,random,events:[],fx:[],rank:1,tutorial,learnedJump:false,learnedSlide:false,learnedLane:false,flash:0,result:null};
}
export function takeRaceItem(s,r,item){
  if(item.taken||r.finishTime!==null)return false;
  item.taken=true;if(item.kind==='shield')r.shield=10;else r.itemBoost=2.6;
  if(r.id===0)s.events.push({type:'pickup',kind:item.kind});
  s.fx.push({kind:'boost',x:r.x,lane:r.lane,age:0,life:.45});return true;
}
export function raceFrame(r,phase='run'){
  if(r.slide>0)return 5;
  if(r.y<0)return 4;
  if(phase==='countdown'||r.finishTime!==null||r.stumble>.35)return 1;
  return Math.floor(r.anim*11)%4;
}
function jump(r){
  if(r.finishTime!==null||r.stumble>.38)return false;
  if(r.y<-.5){r.jumpBuffer=.13;return false;}
  r.slide=0;r.y=-.01;r.vy=-RACE.jump;r.jumpBuffer=0;return true;
}
function slide(r){
  if(r.finishTime!==null||r.stumble>.38||r.y<-.5||r.slide>0||r.slideCooldown>0)return false;
  r.slide=RACE.slide;r.slideCooldown=RACE.slide+.14;return true;
}
function changeLane(r,target){
  target=Math.max(0,Math.min(2,target));
  if(r.finishTime!==null||target===r.laneTarget)return false;
  r.laneFrom=r.lane;r.laneTarget=target;r.laneAge=0;
  r.laneDuration=RACE.laneTime*Math.max(.7,Math.abs(target-r.lane));return true;
}
export function raceAction(s,action){
  if(s.status!=='play'||s.paused||s.phase!=='run'||!['jump','slide','left','right'].includes(action))return false;
  const r=s.racers[0],isLane=action==='left'||action==='right';
  const accepted=isLane?changeLane(r,r.laneTarget+(action==='left'?-1:1)):action==='jump'?jump(r):slide(r);
  if(accepted){
    s.events.push({type:isLane?'race-lane':action==='jump'?'jump':'race-slide'});
    if(isLane)s.learnedLane=true;else if(action==='jump')s.learnedJump=true;else s.learnedSlide=true;
    if(s.tutorial&&s.learnedLane&&s.learnedJump&&s.learnedSlide){s.tutorial=false;s.events.push({type:'learned'});}
  }
  return accepted;
}
export function raceOrder(s){
  return [...s.racers].sort((a,b)=>{
    if(a.finishTime!==null||b.finishTime!==null)return (a.finishTime??Infinity)-(b.finishTime??Infinity)||a.id-b.id;
    return b.x-a.x||a.id-b.id;
  });
}
export function nextRaceObstacle(s,r=s.racers[0]){return s.obstacles[r.next]||null;}
// Ground-plane overlap plus height clearance; changing lanes never grants invulnerability.
export function raceContact(r,o){
  if(Math.abs(r.x-o.x)>RACE.bodyHalfDepth+16)return false;
  for(let lane=0;lane<3;lane++){
    const kind=o.lanes[lane];if(!kind||Math.abs(r.lane-lane)*RACE.laneWidth>=RACE.bodyHalfWidth+47)continue;
    if(kind==='hurdle'&&-r.y<44)return true;
    if(kind==='gate'&&(-r.y+(r.slide>0?28:88))>56)return true;
  }
  return false;
}
function planBot(s,r){
  const o=nextRaceObstacle(s,r);if(!o)return;
  if(r.plan?.id!==o.id){
    const kind=o.lanes[r.laneTarget],mistake=s.random()>r.skill,change=s.random()<.62;
    r.plan={id:o.id,done:false,kind,mistake,change,lead:change?.9:.48,target:o.lanes.findIndex(k=>!k)};
  }
  const p=r.plan,speed=r.speed+((r.boost>0||r.itemBoost>0)?RACE.boostSpeed:0);
  if(!p.done&&o.x-r.x<=speed*p.lead){
    p.done=true;if(!p.kind||p.mistake)return;
    if(p.change)changeLane(r,p.target);else if(p.kind==='gate')slide(r);else jump(r);
  }
}
function collide(s,r,o){
  if(r.shield>0){r.shield=0;r.hit.add(o.id);r.invincible=.8;if(r.id===0)s.events.push({type:'shield-break'});s.fx.push({kind:'boost',x:r.x,lane:r.lane,age:0,life:.45});return;}
  r.hit.add(o.id);r.misses++;r.clean=0;r.boost=0;r.slide=0;r.stumble=.9;r.invincible=1.15;
  if(r.id===0){s.events.push({type:'bonk'});s.flash=.2;}
  s.fx.push({kind:'bonk',x:r.x,lane:r.lane,age:0,life:.55});
}
function step(s,dt){
  s.age+=dt;s.flash=Math.max(0,s.flash-dt);
  for(const p of s.fx)p.age+=dt;s.fx=s.fx.filter(p=>p.age<p.life);
  if(s.phase==='countdown'){
    const old=Math.ceil(s.countdown);s.countdown=Math.max(0,s.countdown-dt);
    if(Math.ceil(s.countdown)!==old)s.events.push({type:s.countdown===0?'race-go':'race-tick'});
    if(s.countdown===0)s.phase='run';return;
  }
  s.time+=dt;
  for(const r of s.racers){
    if(r.finishTime!==null)continue;
    for(const key of ['slide','slideCooldown','stumble','invincible','boost','jumpBuffer','shield','itemBoost'])r[key]=Math.max(0,r[key]-dt);
    if(r.bot)planBot(s,r);
    r.laneAge=Math.min(r.laneDuration,r.laneAge+dt);
    const t=r.laneAge/r.laneDuration;r.lane=r.laneFrom+(r.laneTarget-r.laneFrom)*t*t*(3-2*t);
    const speed=(r.speed+((r.boost>0||r.itemBoost>0)?RACE.boostSpeed:0))*(r.stumble>0?.27:1),previous=r.x;
    r.x+=speed*dt;r.anim+=dt*speed/RACE.speed;
    if(r.y<0||r.vy<0){r.y+=r.vy*dt+.5*RACE.gravity*dt*dt;r.vy+=RACE.gravity*dt;
      if(r.y>=0){r.y=0;r.vy=0;if(r.jumpBuffer>0)jump(r);}}
    for(const item of s.items||[])if(!item.taken&&Math.abs(r.x-item.x)<35&&Math.abs(r.lane-item.lane)<.38&&-r.y<125)takeRaceItem(s,r,item);
    const o=nextRaceObstacle(s,r);
    if(o){
      if(!r.hit.has(o.id)&&r.invincible===0&&raceContact(r,o))collide(s,r,o);
      if(r.x>o.x+60){
        r.next++;r.passed++;
        if(!r.hit.has(o.id)){
          r.clean++;r.bestClean=Math.max(r.bestClean,r.clean);
          if(r.id===0)s.events.push({type:'race-clear'});
          if(r.clean%3===0){r.boost=RACE.boost;s.fx.push({kind:'boost',x:r.x,lane:r.lane,age:0,life:.75});if(r.id===0)s.events.push({type:'race-boost'});}
        }
      }
    }
    if(r.x>=RACE.finish){r.finishTime=s.time-dt+(RACE.finish-previous)/speed;r.x=RACE.finish;}
  }
  s.rank=raceOrder(s).findIndex(r=>r.id===0)+1;s.camera=s.racers[0].x;
  if(s.racers[0].finishTime!==null){
    s.status='ended';s.phase='finish';s.result=s.rank;s.events.push({type:'end',result:s.rank===1?'cleared':'finished',rank:s.rank});
  }
}
export function updateRace(s,dt){
  if(s.status!=='play'||s.paused||!Number.isFinite(dt)||dt<=0)return;
  let remaining=Math.min(dt,.1);
  while(remaining>1e-9&&s.status==='play'){
    const fastest=Math.max(360,...s.racers.map(r=>Math.abs(r.vy)+RACE.gravity/120));
    const sub=Math.min(1/120,1.5/fastest,remaining);step(s,sub);remaining-=sub;
  }
}
