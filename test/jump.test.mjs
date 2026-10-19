import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JUMP,createJumpGame,beginJump,releaseJump,cancelJump,updateJump,jumpSpeed,flightTime,touchesSpike} from '../jump-model.js';
import {jumpFrame} from '../jump-view.js';
const rng=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
function advance(s,time,dt=1/120){for(let t=0;t<time-1e-9;t+=dt)updateJump(s,Math.min(dt,time-t));}
function chargeTo(s,x){return ((x-s.cat.x)/flightTime()-JUMP.minSpeed)/(JUMP.maxSpeed-JUMP.minSpeed)*JUMP.chargeTime;}
function jumpTo(s,x){beginJump(s);const q=chargeTo(s,x);assert.ok(q>=0&&q<=JUMP.chargeTime);advance(s,q);releaseJump(s);for(let i=0;i<250&&s.phase==='air';i++)updateJump(s,1/120);}
test('standing cat does not move or auto-jump, continuous grass has no platforms',()=>{
  const s=createJumpGame();advance(s,10);assert.deepEqual(s.cat,{x:140,y:0,vx:0,vy:0});assert.equal(s.phase,'ready');assert.equal(s.platforms,undefined);
});
test('charge grows distance and caps without auto-release',()=>{
  const s=createJumpGame();beginJump(s);advance(s,4);assert.equal(s.phase,'charge');assert.equal(s.cat.x,140);assert.equal(s.charge,JUMP.chargeTime);assert.ok(jumpSpeed(.8)>jumpSpeed(.3));assert.equal(jumpSpeed(20),JUMP.maxSpeed);releaseJump(s);assert.equal(s.cat.vx,JUMP.maxSpeed);
});
test('jump uses an arc and cannot be steered or jumped again in air',()=>{
  const s=createJumpGame();beginJump(s);advance(s,.4);releaseJump(s);const vx=s.cat.vx;advance(s,.2);assert.ok(s.cat.y<0);assert.equal(beginJump(s),false);assert.equal(releaseJump(s),false);assert.equal(s.cat.vx,vx);
});
test('short jump lands on grass; no false pitfall, no free score',()=>{
  const s=createJumpGame();beginJump(s);releaseJump(s);advance(s,2);assert.equal(s.phase,'ready');assert.equal(s.status,'play');assert.equal(s.cat.y,0);assert.equal(s.score,0);assert.equal(s.jumps,1);
});
test('a safe jump over spikes scores once, not while still airborne',()=>{
  const s=createJumpGame({random:rng(4)});beginJump(s);advance(s,chargeTo(s,455));releaseJump(s);advance(s,.5);assert.equal(s.score,0);advance(s,.6);assert.equal(s.phase,'ready');assert.equal(s.cleared,1);assert.equal(s.score,1);
  beginJump(s);releaseJump(s);advance(s,1.1);assert.equal(s.score,1);
});
test('landing on spikes fails and emits the result only once',()=>{
  const s=createJumpGame();jumpTo(s,340);assert.equal(s.reason,'spike');advance(s,2);assert.equal(s.status,'ended');assert.equal(s.events.filter(e=>e.type==='end').length,1);advance(s,3);assert.equal(s.events.filter(e=>e.type==='end').length,1);assert.equal(beginJump(s),false);assert.equal(s.score,0);
});
test('sprite silhouettes exclude transparent corners and safe grass',()=>{
  const s=createJumpGame(),h=s.hazards[0];assert.ok(touchesSpike({x:h.x,y:-4},h));assert.ok(!touchesSpike({x:h.x-h.w/2-20,y:0},h));assert.ok(!touchesSpike({x:h.x,y:-40},h));
});
test('front paw and rear silhouette beyond the old central rectangle hit spikes',()=>{
  const h=createJumpGame().hazards[0];
  for(const color of ['gray','orange','cream','black']){
    assert.ok(touchesSpike({x:h.x-60,y:-5},h,6,color),color+' front paw');
    assert.ok(touchesSpike({x:h.x+80,y:-10},h,6,color),color+' rear silhouette');
    assert.ok(!touchesSpike({x:h.x-70,y:-5},h,6,color),color+' clear transparent front');
    assert.ok(!touchesSpike({x:h.x,y:-30},h,6,color),color+' above tips');
  }
});
test('standing and charging contact fails without requiring an airborne frame',()=>{
  for(const phase of ['ready','charge'])for(const color of ['gray','orange','cream','black']){
    const s=createJumpGame({color});s.phase=phase;s.cat.x=s.hazards[0].x;
    updateJump(s,1/120);assert.equal(s.phase,'dead');assert.equal(s.reason,'spike');
    assert.equal(s.events.filter(e=>e.type==='bonk').length,1);
  }
});
test('crouching into spikes is detected when the visible pose changes',()=>{
  const s=createJumpGame();s.cat.x=s.hazards[0].x-70;
  assert.equal(beginJump(s),true);advance(s,.5);
  assert.equal(s.phase,'dead');assert.equal(s.hitFrame,14);
});
test('cannot launch out of a spike before the next animation tick',()=>{
  const s=createJumpGame();beginJump(s);s.cat.x=s.hazards[0].x;
  assert.equal(releaseJump(s),false);assert.equal(s.phase,'dead');
});
test('landing pose is checked before awarding a successful jump',()=>{
  const s=createJumpGame();s.phase='air';s.cat.x=s.hazards[0].x-60;s.cat.y=-.01;s.cat.vx=0;s.cat.vy=10;
  assert.equal(touchesSpike(s.cat,s.hazards[0],7),false);
  updateJump(s,1/120);assert.equal(s.phase,'dead');assert.equal(s.hitFrame,13);
  assert.equal(s.score,0);assert.ok(!s.events.some(e=>e.type==='land'));
});
test('slow display frames cannot skip a spike collision',()=>{
  for(const dt of [1/120,1/60,1/30,.1]){
    const s=createJumpGame();s.phase='air';s.cat={x:260,y:-2,vx:JUMP.maxSpeed,vy:20};
    advance(s,.3,dt);assert.equal(s.phase,'dead');assert.equal(s.reason,'spike');
  }
});
test('every cat color can clear a long sequence and safely charge again',()=>{
  for(const color of ['gray','orange','cream','black']){
    const s=createJumpGame({color,random:rng(9)});
    for(let n=0;n<160;n++){
      const h=s.hazards.find(h=>!h.cleared);jumpTo(s,h.x+h.w/2+76);
      advance(s,.4);assert.equal(s.phase,'ready',color+' obstacle '+n);
    }
  }
});
test('pause freezes charge; cancel never launches',()=>{
  const s=createJumpGame();beginJump(s);advance(s,.3);s.paused=true;const q=s.charge;advance(s,2);assert.equal(s.charge,q);assert.equal(releaseJump(s),false);cancelJump(s);s.paused=false;assert.equal(s.phase,'ready');assert.equal(s.charge,0);assert.equal(releaseJump(s),false);
});
test('physics matches at 30, 60 and 120 fps',()=>{
  const results=[1/30,1/60,1/120].map(dt=>{const s=createJumpGame({random:rng(3)});beginJump(s);advance(s,.4,dt);releaseJump(s);advance(s,.7,dt);return s.cat;});
  for(const c of results){assert.ok(Math.abs(c.x-results[0].x)<.001);assert.ok(Math.abs(c.y-results[0].y)<.001);}
});
test('seeded endless grass always has a safe route; old hazards do not accumulate',()=>{
  for(let seed=1;seed<=30;seed++){
    const s=createJumpGame({random:rng(seed),tutorial:false});
    for(let n=0;n<150;n++){
      const h=s.hazards.find(h=>!h.cleared);
      const target=h.x+h.w/2+76;
      jumpTo(s,target);
      assert.equal(s.phase,'ready','seed '+seed+' obstacle '+n);
      assert.equal(s.cleared,n+1);
      assert.ok(s.hazards.length<16);s.events.length=0;
    }
  }
});
test('hazards gain grouped spikes gradually, keeping one authored sprite size',()=>{
  const s=createJumpGame({random:rng(8)});assert.ok(s.hazards.slice(0,3).every(h=>h.count===1));
  let groups=0;
  for(let n=0;n<120;n++){const h=s.hazards.find(h=>!h.cleared);groups+=h.count===2;assert.equal(h.w,h.count*JUMP.spikeWidth);jumpTo(s,h.x+h.w/2+76);}
  assert.ok(groups>5);
});
test('charge uses authored crouch poses rather than stretched cat art',()=>{
  const s=createJumpGame();assert.equal(jumpFrame(s),0);beginJump(s);advance(s,.8);assert.equal(jumpFrame(s),15);releaseJump(s);assert.equal(jumpFrame(s),6);advance(s,.6);assert.equal(jumpFrame(s),7);
});
test('jump scene has grass and no box, cushion or platform runtime assets',async()=>{
  const view=await readFile(new URL('../jump-view.js',import.meta.url),'utf8');
  assert.ok(view.includes("images['jump-grass']"));assert.ok(!/crate|cushion|platform/i.test(view));
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  assert.ok(!app.includes('jump-crate'));assert.ok(app.includes('jumpBest'));assert.ok(app.includes('jumpTaught'));
});
