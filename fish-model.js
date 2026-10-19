import {FISH_PROP_ART,fishProp} from './fish-props.js?v=room-6';
// A short risk/banking round: grab one to three fish, then bring them home.
export const FISH_HOME={x:114,y:608};
export const FISH_GOAL=12;
export const FISH_TIME=65;
export const FISH_CAPACITY=3;
export const FISH_CHANCES=3;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Elevated plates sit on real fixed-size bowl stacks; no arbitrary heights.
const STANDS=[[null,null,null],[null,'bowls',null],[null,null,'bowls-low'],[null,'bowls',null],[null,'bowls-low','bowls'],[null,null,null]];
export function fishLayout(round){
  const layouts=[
    [{kind:'mug',x:312},{kind:'bowls',x:450}],
    [{kind:'bowls-tall',x:310},{kind:'mug',x:450,moving:true}],
    [{kind:'mug',x:310},{kind:'thermos-tall',x:448}],
    [{kind:'bowls',x:309},{kind:'bowls-tall',x:450}],
    [{kind:'thermos-tall',x:310},{kind:'mug',x:450,moving:true}],
    [{kind:'mug',x:308,moving:true},{kind:'bowls-tall',x:451}],
  ];
  return layouts[round%layouts.length].map((o,i)=>fishProp(o.kind,o.x,{id:i,moving:o.moving}));
}
function nextFish(s){s.fish=s.snacks.find(f=>f.state==='tray')||s.snacks[0];}
function setBoard(s,tutorial=false){
  const variant=s.order[s.board%s.order.length];s.variant=variant;s.boardAge=0;
  s.obstacles=tutorial?[fishProp('mug',322)]:fishLayout(variant);
  const count=tutorial?1:Math.min(3,FISH_GOAL-s.caught);
  s.snacks=Array.from({length:count},(_,i)=>{
    const stand=tutorial?null:STANDS[variant][i],y=stand?620-FISH_PROP_ART[stand].h-25:590,baseX=tutorial?488:[244,381,526][i];
    return {id:`${s.board}-${i}`,slot:i,x:baseX,y,baseX,stand,state:'tray',golden:!tutorial&&i===2,
      value:!tutorial&&i===2?180:100,drift:!tutorial&&y===590?(s.board?9:5):0,phase:i*1.7,grabAge:0};
  });
  for(const f of s.snacks)if(f.stand)s.obstacles.push(fishProp(f.stand,f.x,{id:`stand-${f.id}`,stand:true}));
  nextFish(s);
}
export function createFishGame({tutorial=false,random=Math.random}={}){
  const order=[0,1,2,3,4,5];
  // Keep the first table readable; shuffle authored, solvable followups.
  for(let i=5;i>1;i--){const j=1+Math.floor(clamp(random(),0,.99999)*i);[order[i],order[j]]=[order[j],order[i]];}
  const s={mode:'fish',status:'play',paused:false,time:FISH_TIME,elapsed:0,score:0,caught:0,
    tutorial:tutorial?'reach':null,random,events:[],cooldown:0,hitCooldown:0,board:0,order,
    mistakes:0,bestHaul:0,trips:0,startle:0,
    paw:{...FISH_HOME,target:{...FISH_HOME},dragging:false,returning:false,carrying:false,bag:[],path:[{...FISH_HOME}]},
    owner:{phase:'away',timer:6.3,duration:6.3,noise:0,suspicion:0,seen:false}};
  setBoard(s,tutorial);return s;
}
export function fishHidden(s){return !s.paw.carrying&&distance(s.paw,FISH_HOME)<22;}
export function haulValue(s){const bag=s.paw.bag;return Math.round(bag.reduce((n,f)=>n+f.value,0)*[0,1,1.5,2][bag.length]);}
export function beginReach(s,x,y){
  if(s.status!=='play'||s.paused||s.cooldown>0||s.paw.returning||distance(s.paw,{x,y})>75)return false;
  s.paw.dragging=true;return true;
}
export function aimPaw(s,x,y){
  if(!s.paw.dragging||s.paused||s.status!=='play')return;
  s.paw.target={x:clamp(x,85,550),y:clamp(y,375,620)};
}
export function retractPaw(s){
  if(s.status!=='play'||s.paused)return;
  s.paw.dragging=false;s.paw.returning=true;s.paw.target={...FISH_HOME};
}
function ownerPhase(s,phase,duration){Object.assign(s.owner,{phase,timer:duration,duration,seen:false});}
function bump(s,o){
  if(s.hitCooldown>0)return;
  s.hitCooldown=.55;o.wobble=.55;s.owner.noise=clamp(s.owner.noise+.32,0,1);
  if(s.owner.phase==='away')s.owner.timer=Math.min(s.owner.timer,1.1);
  s.events.push({type:'clink',x:o.x,y:o.y-o.h});
}
export function fishObstacleAt(s,p){
  return s.obstacles.find(o=>p.x>o.x-o.w*.42-12&&p.x<o.x+o.w*.42+12&&p.y>o.y-o.h-4&&p.y<o.y+15);
}
function collectNearby(s){
  const p=s.paw;if(p.bag.length>=FISH_CAPACITY||p.returning||!p.dragging)return;
  const f=s.snacks.find(f=>f.state==='tray'&&distance(p,f)<29);
  if(!f)return;
  f.state='held';f.grabAge=0;p.bag.push(f);p.carrying=true;nextFish(s);
  s.events.push({type:'grab',count:p.bag.length,golden:f.golden,x:p.x,y:p.y});
  if(s.tutorial)s.tutorial='return';
}
function movePaw(s,target,budget,returning=false){
  const p=s.paw,dist=distance(p,target);
  if(dist<.01){if(!returning)collectNearby(s);return true;}
  const length=Math.min(dist,budget),dx=(target.x-p.x)/dist,dy=(target.y-p.y)/dist;
  for(let d=0;d<length;){
    const step=Math.min(3,length-d),next={x:p.x+dx*step,y:p.y+dy*step},obstacle=fishObstacleAt(s,next);
    // Return follows the safe recorded route; sliding dishes must not trap it.
    if(obstacle&&!returning){bump(s,obstacle);return false;}
    p.x=next.x;p.y=next.y;d+=step;
    if(!returning&&distance(p,p.path.at(-1))>=6){
      // Dragging back over an existing section retracts that section instead
      // of leaving a dangling second arm on the way to the next fish.
      for(let i=p.path.length-3;i>=0;i--)if(distance(p,p.path[i])<8){p.path.length=i+1;break;}
      p.path.push({x:p.x,y:p.y});
    }
    if(!returning)collectNearby(s);
  }
  return length>=dist-.01;
}
function resetPaw(s){Object.assign(s.paw,FISH_HOME,{returning:false,dragging:false,carrying:false,bag:[],target:{...FISH_HOME},path:[{...FISH_HOME}]});}
function finish(s,result){s.status='over';s.result=result;s.paw.dragging=false;s.paw.returning=false;s.events.push({type:'end',result});}
function deliver(s){
  const count=s.paw.bag.length,score=haulValue(s);
  for(const f of s.paw.bag)f.state='banked';resetPaw(s);
  if(!count)return;
  s.caught+=count;s.score+=score;s.bestHaul=Math.max(s.bestHaul,count);s.trips++;s.cooldown=.4;
  s.events.push({type:'fish',x:FISH_HOME.x,y:FISH_HOME.y,score,count});
  if(s.caught>=FISH_GOAL){finish(s,'cleared');return;}
  if(s.snacks.every(f=>f.state==='banked')){
    if(s.tutorial){s.tutorial=null;s.events.push({type:'learned'});}else s.board++;
    setBoard(s);ownerPhase(s,'away',Math.max(4.9,6.3-s.board*.28));s.owner.suspicion=0;
    s.events.push({type:'table',board:s.board});
  }
}
function spotted(s){
  const lost=s.paw.bag.length;
  for(const f of s.paw.bag)f.state='tray';nextFish(s);resetPaw(s);
  s.mistakes++;s.time=Math.max(0,s.time-4);s.startle=.65;s.cooldown=.65;s.owner.suspicion=0;
  ownerPhase(s,'away',4.8);s.events.push({type:'spotted',lost,x:FISH_HOME.x,y:530});
  if(s.mistakes>=FISH_CHANCES)finish(s,'caught');
}
export function updateFish(s,dt){
  if(s.paused||s.status!=='play')return;
  dt=clamp(dt,0,.05);s.elapsed+=dt;s.boardAge+=dt;s.cooldown=Math.max(0,s.cooldown-dt);s.hitCooldown=Math.max(0,s.hitCooldown-dt);s.startle=Math.max(0,s.startle-dt);
  for(const o of s.obstacles){o.wobble=Math.max(0,o.wobble-dt);if(o.moving)o.x=o.baseX+Math.sin(s.boardAge*1.7)*9;}
  for(const f of s.snacks){f.grabAge+=dt;if(f.state==='tray')f.x=f.baseX+Math.sin(s.boardAge*1.3+f.phase)*f.drift;}
  const p=s.paw;
  if(p.returning){
    let budget=650*dt;
    while(p.path.length&&budget>0){const target=p.path.at(-1),d=distance(p,target);const arrived=movePaw(s,target,budget,true);budget-=d;if(arrived)p.path.pop();else break;}
    if(!p.path.length)deliver(s);
  }else if(p.dragging){
    movePaw(s,p.target,650*dt);
    if(p.carrying&&distance(p,FISH_HOME)<23)deliver(s);
  }
  if(s.status!=='play'||s.tutorial)return;
  s.time=Math.max(0,s.time-dt);const o=s.owner;
  o.timer-=dt;o.noise=Math.max(0,o.noise-dt*.07);
  if(o.timer<=0){
    if(o.phase==='away'){ownerPhase(s,'warning',1.8);s.events.push({type:'warning'});}
    else if(o.phase==='warning')ownerPhase(s,'look',1.6+s.board*.12);
    else ownerPhase(s,'away',Math.max(4.6,6.1-s.board*.25+s.random()*.6-o.noise*.7));
  }
  o.seen=o.phase==='look'&&!fishHidden(s);
  o.suspicion=clamp(o.suspicion+dt*(o.seen?125:-80),0,100);
  if(o.suspicion>=100)spotted(s);
  if(s.time<=0&&s.status==='play')finish(s,'time');
}
export function fishHudCopy(s){
  const o=s.owner;
  return {tip:s.status==='play'&&s.tutorial?(s.tutorial==='reach'?'拖猫爪':'松手收爪'):'',
    alertVisible:s.status==='play'&&(o.phase!=='away'||o.suspicion>0),
    alert:o.seen?'暴露':o.phase==='warning'?'收爪':'警觉'};
}
