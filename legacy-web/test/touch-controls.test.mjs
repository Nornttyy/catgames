import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ActionBuffer,DirectionPad,padDirection,bindDirectionPad} from '../touch-controls.js';
import {createBrawl,brawlAction,updateBrawl} from '../brawl-model.js';

test('an early action is accepted once when ready, never auto-repeats',()=>{
  const b=new ActionBuffer(.16);let ready=false,fired=0;
  const act=()=>{if(!ready)return false;fired++;return true;};
  b.press('attack',10);b.flush(10,act);assert.equal(fired,0);
  ready=true;b.flush(10.1,act);b.flush(10.11,act);assert.equal(fired,1);
});
test('stale presses expire and pause/reset clears all queued actions',()=>{
  const b=new ActionBuffer();let fired=0;
  b.press('jump',1);b.flush(1.17,()=>{fired++;return true;});assert.equal(fired,0);
  b.press('jump',2);b.press('attack',2);b.clear();b.flush(2.01,()=>{fired++;return true;});assert.equal(fired,0);
});
test('jump and attack can be pressed together without losing either action',()=>{
  const b=new ActionBuffer(),actions=[];b.press('jump',0);b.press('attack',0);
  b.flush(.02,a=>{actions.push(a);return true;});assert.deepEqual(actions,['jump','attack']);
});
test('a press just before attack cooldown ends is retained without reducing cooldown',()=>{
  const s=createBrawl(),c=s.cats[0],b=new ActionBuffer();s.phase='fight';s.cats=s.cats.slice(0,1);
  c.cooldown=.1;b.press('attack',0);b.flush(0,a=>brawlAction(s,a));assert.equal(c.attack,0);
  // Keep the match alive during this isolated action test.
  c.cooldown=.04;b.flush(.06,a=>brawlAction(s,a));assert.equal(c.attack,0);
  c.cooldown=0;b.flush(.11,a=>brawlAction(s,a));assert.ok(c.attack>0);assert.equal(c.cooldown,1.25);
});
test('movement accepts two independent fingers, release/cancel cannot leave it stuck',()=>{
  const p=new DirectionPad();p.set(1,-1);assert.equal(p.value,-1);
  p.set(2,1);assert.equal(p.value,0);p.release(1);assert.equal(p.value,1);
  p.release(2);assert.equal(p.value,0);p.set(8,1);p.clear();assert.equal(p.value,0);
});
test('sliding across the pad changes direction and small drift is tolerated',()=>{
  const r={left:10,right:150,top:700,bottom:770};
  assert.equal(padDirection(30,740,r),-1);assert.equal(padDirection(130,740,r),1);
  assert.equal(padDirection(82,740,r,-1),-1);assert.equal(padDirection(154,775,r,1),1);
  assert.equal(padDirection(190,740,r,1),0);assert.equal(padDirection(30,640,r,-1),0);
});
class PadElement {
  handlers=new Map();captured=[];
  addEventListener(name,fn){this.handlers.set(name,fn);}
  getBoundingClientRect(){return {left:0,right:140,top:0,bottom:70};}
  setPointerCapture(id){this.captured.push(id);}
  send(type,{id=1,x=20,y=30,button=0}={}){this.handlers.get(type)?.({pointerId:id,clientX:x,clientY:y,button,preventDefault(){}});}
}
test('actual pad binding supports slide reversal, outside release and pointer cancellation',()=>{
  const el=new PadElement(),p=new DirectionPad();bindDirectionPad(el,p,{enabled:()=>true});
  el.send('pointerdown');assert.equal(p.value,-1);assert.deepEqual(el.captured,[1]);
  el.send('pointermove',{x:120});assert.equal(p.value,1);
  el.send('pointerup',{x:500});assert.equal(p.value,0);
  el.send('pointerdown',{id:2});el.send('pointercancel',{id:2});assert.equal(p.value,0);
  el.send('pointerdown',{id:3});el.send('lostpointercapture',{id:3});assert.equal(p.value,0);
});
test('disabled controls and right-click do not move the player',()=>{
  const el=new PadElement(),p=new DirectionPad();let enabled=false;
  bindDirectionPad(el,p,{enabled:()=>enabled});el.send('pointerdown');assert.equal(p.value,0);
  enabled=true;el.send('pointerdown',{button:2});assert.equal(p.value,0);
  el.send('pointerdown');assert.equal(p.value,-1);enabled=false;el.send('pointermove');assert.equal(p.value,0);
});
test('releasing movement brakes rather than walking forever',()=>{
  const s=createBrawl();s.phase='fight';s.cats.forEach(c=>c.invincible=999);
  for(let i=0;i<30;i++)updateBrawl(s,1/60,1);
  const x=s.cats[0].x;for(let i=0;i<30;i++)updateBrawl(s,1/60,0);
  assert.ok(s.cats[0].x-x<16);assert.ok(Math.abs(s.cats[0].vx)<1);
});
test('brawl HUD keeps health and match info but removes the lined position strip',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/brawl-map|data-fighter/);
  for(const id of ['brawl-health','brawl-health-text','score','time','pause'])assert.ok(html.includes(`id="${id}"`));
});
