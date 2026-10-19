import {jumpFrame} from './jump-art.js?v=controls-7';
import {touchesSpike,catLeft,SPIKE_ART_HEIGHT} from './jump-collision.js?v=controls-7';
export {touchesSpike} from './jump-collision.js?v=controls-7';
// One continuous lawn. There is no walking, steering, automatic jumping or pitfall.
export const JUMP={gravity:1100,launchY:560,minSpeed:80,maxSpeed:440,chargeTime:1.1,spikeWidth:72,spikeHeight:SPIKE_ART_HEIGHT};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function jumpSpeed(charge){return JUMP.minSpeed+(JUMP.maxSpeed-JUMP.minSpeed)*clamp(charge/JUMP.chargeTime,0,1);}
export function flightTime(){return 2*JUMP.launchY/JUMP.gravity;}
export function createJumpGame({tutorial=true,random=Math.random,color='gray'}={}){
  const s={status:'play',paused:false,phase:'ready',age:0,charge:0,score:0,jumps:0,cleared:0,streak:0,bestStreak:0,tutorial,color,
    cat:{x:140,y:0,vx:0,vy:0},camera:0,nextId:1,random,hazards:[],events:[],fx:[],landTime:0,deathTime:0,reason:null};
  while(s.hazards.length<6)addHazard(s);return s;
}
export function addHazard(s){
  const prev=s.hazards.at(-1),id=s.nextId++,difficulty=Math.min(1,(id-1)/35);
  const count=id<4?1:s.random()<difficulty*.48?2:1,w=JUMP.spikeWidth*count;
  const gap=id<3?210:140+s.random()*(100-difficulty*32);
  const h={id,x:prev?prev.x+prev.w/2+gap+w/2:340,y:0,w,h:JUMP.spikeHeight,count,cleared:false};
  s.hazards.push(h);return h;
}
export function beginJump(s){
  if(s.status!=='play'||s.paused||s.phase!=='ready')return false;
  if(checkSpikes(s))return false;
  s.charge=0;s.phase='charge';if(checkSpikes(s))return false;
  s.events.push({type:'charge'});return true;
}
export function cancelJump(s){if(s.phase==='charge'){s.phase='ready';s.charge=0;}}
export function releaseJump(s){
  if(s.status!=='play'||s.paused||s.phase!=='charge')return false;
  if(checkSpikes(s))return false;
  s.cat.vx=jumpSpeed(s.charge);s.cat.vy=-JUMP.launchY;s.phase='air';s.landTime=0;
  if(checkSpikes(s))return false;
  s.events.push({type:'jump'});
  if(s.tutorial){s.tutorial=false;s.events.push({type:'learned'});}return true;
}
function checkSpikes(s){
  if(s.phase==='dead'||s.status!=='play')return false;
  const frame=jumpFrame(s);
  if(s.hazards.some(h=>touchesSpike(s.cat,h,frame,s.color))){fail(s);return true;}
  return false;
}
function fail(s){
  if(s.phase==='dead'||s.status!=='play')return;
  s.hitFrame=jumpFrame(s);s.phase='dead';s.reason='spike';s.charge=0;s.deathTime=0;s.cat.vx=-65;s.cat.vy=-240;
  s.events.push({type:'bonk'});s.fx.push({type:'oops',x:s.cat.x,y:s.cat.y-80,age:0,life:.65});
}
function land(s){
  s.cat.y=0;s.cat.vy=0;s.cat.vx=0;s.phase='ready';s.charge=0;s.landTime=.19;s.jumps++;
  if(checkSpikes(s))return;
  const left=catLeft(s.cat,jumpFrame(s),s.color);
  const passed=s.hazards.filter(h=>!h.cleared&&left>h.x+h.w/2);
  for(const h of passed)h.cleared=true;
  const count=passed.length;s.streak=count?s.streak+count:0;s.bestStreak=Math.max(s.bestStreak,s.streak);s.cleared+=count;
  const points=count+(count>1?1:0);s.score+=points;s.events.push({type:count>1?'perfect':'land',count});
  if(count)s.fx.push({type:count>1?'perfect':'land',x:s.cat.x,y:0,age:0,life:.8,points,count});
  s.hazards=s.hazards.filter(h=>h.x+h.w/2>s.cat.x-650);
  while(s.hazards.at(-1).x<s.cat.x+1700)addHazard(s);
}
function step(s,dt){
  s.age+=dt;s.landTime=Math.max(0,s.landTime-dt);
  if(s.phase==='charge')s.charge=Math.min(JUMP.chargeTime,s.charge+dt);
  checkSpikes(s);
  if(s.phase==='air'){
    s.cat.x+=s.cat.vx*dt;s.cat.y+=s.cat.vy*dt+.5*JUMP.gravity*dt*dt;s.cat.vy+=JUMP.gravity*dt;
    checkSpikes(s);
    if(s.phase==='air'&&s.cat.vy>0&&s.cat.y>=0)land(s);
  }else if(s.phase==='dead'){
    s.deathTime+=dt;s.cat.x+=s.cat.vx*dt;s.cat.y+=s.cat.vy*dt;s.cat.vy+=JUMP.gravity*dt;
    if(s.cat.y>0){s.cat.y=0;s.cat.vy=0;s.cat.vx*=.8;}
    if(s.deathTime>.7){s.status='ended';s.events.push({type:'end',result:'spike'});}
  }
  if(s.phase!=='dead')s.camera+=(Math.max(0,s.cat.x-140)-s.camera)*(1-Math.exp(-8*dt));
  for(const e of s.fx)e.age+=dt;s.fx=s.fx.filter(e=>e.age<e.life);
}
export function updateJump(s,dt){
  if(s.paused||s.status!=='play'||!Number.isFinite(dt)||dt<=0)return;
  let remaining=Math.min(dt,.1);
  while(remaining>1e-9&&s.status==='play'){
    // At most one silhouette pixel of travel per check, including slow frames.
    const speed=s.phase==='air'?Math.max(Math.abs(s.cat.vx),Math.abs(s.cat.vy)+JUMP.gravity/120):0;
    const sub=Math.min(1/120,speed?1/speed:1/120,remaining);step(s,sub);remaining-=sub;
  }
}
