import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RaceSwipe,bindRaceSwipes} from '../race-input.js';
import {createRace,raceAction} from '../race-model.js';
const event=(x=100,y=100,id=1)=>({clientX:x,clientY:y,pointerId:id,button:0,preventDefault(){}});

test('four deliberate directions map to lane, jump and slide before lifting',()=>{
 for(const [x,y,action] of [[150,101,'right'],[50,101,'left'],[101,50,'jump'],[101,150,'slide']]){
   const swipe=new RaceSwipe();assert.equal(swipe.begin(event()),true);
   assert.equal(swipe.move(event(x,y)),action);
   assert.equal(swipe.move(event(x*2,y*2)),null);
   assert.equal(swipe.end(event(x,y)),null);
 }
});
test('taps, tiny hand jitter and ambiguous diagonals do not jump or change lane',()=>{
 const swipe=new RaceSwipe();swipe.begin(event());
 assert.equal(swipe.move(event(105,104)),null);
 assert.equal(swipe.end(event(105,104)),null);
 swipe.begin(event());assert.equal(swipe.move(event(125,124)),null);
 assert.equal(swipe.move(event(150,124)),'right');
});
test('short flicks finish on pointerup even when the browser skipped move samples',()=>{
 const swipe=new RaceSwipe();swipe.begin(event());
 assert.equal(swipe.end(event(100,70)),'jump');assert.equal(swipe.pointer,null);
});
test('second finger cannot steal or end a swipe; cancelled gestures cannot fire later',()=>{
 const swipe=new RaceSwipe();swipe.begin(event());
 assert.equal(swipe.begin(event(100,100,2)),false);
 assert.equal(swipe.move(event(20,100,2)),null);
 assert.equal(swipe.end(event(20,100,2)),null);assert.equal(swipe.owns(1),true);
 assert.equal(swipe.end(event(20,100),true),null);
 assert.equal(swipe.move(event(150,100)),null);
});
test('threshold scales with CSS width, not canvas resolution, without making tablets sluggish',()=>{
 for(const [width,distance] of [[320,16],[390,19],[1200,26]]){
   const swipe=new RaceSwipe();swipe.begin(event(),width);
   assert.equal(swipe.move(event(100+distance,100)),'right');
 }
});
class Surface{
 handlers=new Map();captured=new Set();
 addEventListener(type,handler){this.handlers.set(type,handler);}
 getBoundingClientRect(){return {width:390};}
 setPointerCapture(id){this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){this.captured.delete(id);this.send('lostpointercapture',100,100,id);}
 send(type,x=100,y=100,id=1){this.handlers.get(type)?.(event(x,y,id));}
}
test('real binding captures outside release, ignores tap and survives pause/cancel',()=>{
 const el=new Surface(),actions=[];let enabled=true;
 const input=bindRaceSwipes(el,{enabled:()=>enabled,onAction:a=>actions.push(a)});
 el.send('pointerdown');assert.equal(el.captured.has(1),true);
 el.send('pointermove',20,100);el.send('pointerup',-300,100);
 assert.deepEqual(actions,['left']);assert.equal(el.captured.size,0);
 el.send('pointerdown');el.send('pointerup');assert.equal(actions.length,1);
 el.send('pointerdown');el.send('pointercancel',100,200);assert.equal(actions.length,1);
 el.send('pointerdown');enabled=false;el.send('pointermove',100,200);assert.equal(el.captured.size,0);
 enabled=true;el.send('pointerdown');input.clear();el.send('pointerup',100,200);assert.equal(actions.length,1);
 el.send('pointerdown');el.send('pointerup',100,200);assert.deepEqual(actions,['left','slide']);
});
test('one long stroke moves one lane only; a fresh stroke can move again',()=>{
 const s=createRace({tutorial:false});s.phase='run';const el=new Surface();
 bindRaceSwipes(el,{enabled:()=>true,onAction:a=>raceAction(s,a)});
 el.send('pointerdown');el.send('pointermove',20,100);el.send('pointermove',-200,100);el.send('pointerup',-400,100);
 assert.equal(s.racers[0].laneTarget,0);assert.equal(s.events.filter(e=>e.type==='race-lane').length,1);
 el.send('pointerdown');el.send('pointermove',200,100);el.send('pointerup',200,100);
 assert.equal(s.racers[0].laneTarget,1);
 el.send('pointerdown');el.send('pointerup',100,170);assert.ok(s.racers[0].slide>0);
 el.send('pointerdown');el.send('pointerup',100,30);assert.ok(s.racers[0].vy<0);
});
test('race buttons are removed while brawl controls and keyboard support remain',()=>{
 const read=f=>fs.readFileSync(new URL(`../${f}`,import.meta.url),'utf8');
 assert.doesNotMatch(read('index.html'),/id="race-(controls|left|right|jump|slide)"/);
 assert.doesNotMatch(read('app.js'),/\$\('race-controls'\)|racePointer/);
 assert.match(read('index.html'),/id="brawl-controls"/);
 assert.match(read('app.js'),/raceSwipes=bindRaceSwipes\(canvas/);
 assert.match(read('app.js'),/左右滑换道 · 上滑跳 · 下滑铲/);
 assert.match(read('app.js'),/arrowleft/);
});
