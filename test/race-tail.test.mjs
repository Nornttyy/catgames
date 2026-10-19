import test from 'node:test';
import assert from 'node:assert/strict';
import {TAIL_PATHS,bendTail,tailWeight} from '../race-tail.js';
import {createRace,raceFrame} from '../race-model.js';

test('original four running frames are restored at the original cadence',()=>{
  const r=createRace().racers[0];
  for(let i=0;i<44;i++){r.anim=(i+.01)/11;assert.equal(raceFrame(r),i%4);}
  assert.equal(raceFrame(r,'countdown'),1);
  r.finishTime=20;assert.equal(raceFrame(r),1);
});
test('tail roots stay pinned, and head, torso and toes never move with tail sway',()=>{
  for(let f=0;f<6;f++)for(let t=0;t<2;t+=.07){
    for(const [x,y]of [TAIL_PATHS[f][0],[128,125],[128,165],[130,240],[200,200]]){
      assert.deepEqual(bendTail(f,x,y,t,1,1),{x,y},`frame ${f}, point ${x},${y}`);
    }
  }
});
test('tail deformation is bounded and continuous at 60 fps',()=>{
  for(let f=0;f<6;f++){
    const [x,y]=TAIL_PATHS[f].at(-1);let distance=0;
    for(let t=0;t<2;t+=1/60){
      const a=bendTail(f,x,y,t),b=bendTail(f,x,y,t+1/60);
      distance=Math.max(distance,Math.hypot(a.x-x,a.y-y));
      assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1.1);
    }
    assert.ok(distance>4&&distance<6);
  }
});
test('idle/reduced motion is pixel-identical to the old pose; turn bends only the tail',()=>{
  for(let f=0;f<6;f++)for(const [x,y]of TAIL_PATHS[f])assert.deepEqual(bendTail(f,x,y,2,0,0),{x,y});
  const [x,y]=TAIL_PATHS[0].at(-1),a=bendTail(0,x,y,0,0,-1),b=bendTail(0,x,y,0,0,1);
  assert.equal(b.x-a.x,6);assert.equal(a.y,b.y);assert.equal(tailWeight(0,94,173).weight,0);
});
