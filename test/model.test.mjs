import test from 'node:test';import assert from 'node:assert/strict';
import {COLORS,TABLE_Y,DROP_DURATION,ROUND_TIME,createGame,update,targetProp,hideAt,moveTo,frameFor} from '../model.js';
const tick=(s,seconds)=>{for(let t=0;t<seconds;t+=.02)update(s,.02);};
test('four colors and extended walking frames cover all actions',()=>{assert.equal(COLORS.length,4);for(const [a,base] of [['idle',0],['walk',16],['push',8],['hide',12]])for(let t=0;t<5;t+=.05){const f=frameFor(a,t);assert.ok(f>=base&&f<base+(a==='walk'?8:4));}assert.equal(frameFor('hide',2),15);assert.equal(frameFor('rise',2),12);});
test('tap approaches then pushes and scores a falling object',()=>{const s=createGame();targetProp(s,0);tick(s,2);assert.ok(s.pushes>0);assert.ok(s.falls>0);assert.ok(s.score>0);});
test('tutorial waits for push then actual hide; timer does not run early',()=>{const s=createGame({tutorial:true});tick(s,10);assert.equal(s.time,ROUND_TIME);targetProp(s,3);assert.equal(s.cat.target,null);targetProp(s,0);tick(s,2);assert.equal(s.tutorial,'hide');hideAt(s,'popcorn');tick(s,5);assert.equal(s.tutorial,null);assert.equal(s.cat.hidden,true);assert.ok(s.time<ROUND_TIME);});
test('cover protects cat; moving leaves cover',()=>{const s=createGame();hideAt(s,'cushion');tick(s,2);assert.ok(s.cat.hidden);s.owner.phase='look';s.owner.timer=3;s.owner.x=s.cat.x;tick(s,2);assert.equal(s.owner.suspicion,0);moveTo(s,300,500);assert.equal(s.cat.hidden,false);});
test('pause freezes both timer and animation',()=>{const s=createGame();s.paused=true;tick(s,10);assert.equal(s.time,ROUND_TIME);assert.equal(s.cat.anim,0);});
test('round ends at time limit and ignores further commands',()=>{const s=createGame();s.cat.hidden=true;tick(s,ROUND_TIME+1);assert.equal(s.result,'time');const time=s.time;targetProp(s,0);tick(s,3);assert.equal(s.time,time);assert.equal(s.cat.target,null);});
test('exposure can end the round but hiding recovers suspicion',()=>{const s=createGame();s.owner.phase='look';s.owner.timer=10;s.owner.x=300;s.owner.noiseX=300;s.cat.x=300;tick(s,3);assert.equal(s.result,'caught');});
test('side view rejects vertical movement and keeps live objects on the same ledge',()=>{const s=createGame();moveTo(s,900,100);tick(s,1);assert.equal(s.cat.y,TABLE_Y);assert.ok(s.cat.x>550);moveTo(s,500,890);tick(s,1);assert.equal(s.cat.y,TABLE_Y);assert.ok(s.props.every(p=>p.y===TABLE_Y));});
test('a selected object drops straight down even in the middle of the table',()=>{const s=createGame();s.props[0].x=600;targetProp(s,0);tick(s,.7);assert.equal(s.props[0].gone,true);assert.equal(s.props[0].x,600);assert.equal(s.props[0].y,TABLE_Y);assert.equal(s.falls,1);assert.equal(s.score,10);});
test('cat remains within the horizontal tabletop bounds',()=>{const s=createGame();moveTo(s,-5000,0);tick(s,2);assert.equal(s.cat.x,75);moveTo(s,9999,9999);tick(s,4);assert.equal(s.cat.x,1025);assert.equal(s.cat.y,TABLE_Y);});
test('one paw drops exactly one item without moving even overlapping neighbours',()=>{
  const s=createGame();s.owner.timer=100;s.props[0].x=600;s.props[1].x=610;s.props[2].x=620;
  const neighbours=s.props.slice(1).map(p=>({...p}));
  targetProp(s,0);tick(s,3);
  assert.equal(s.pushes,1);assert.equal(s.falls,1);assert.equal(s.score,10);
  assert.deepEqual(s.props.slice(1),neighbours);
  assert.equal(s.events.filter(e=>e.type==='fall').length,1);
});
test('rapid taps cannot add more targets during a paw animation',()=>{
  const s=createGame();s.owner.timer=100;s.props[0].x=590;s.props[1].x=630;
  targetProp(s,0);update(s,.02);assert.equal(s.cat.action,'push');
  for(let i=0;i<20;i++){targetProp(s,1);update(s,.02);}
  tick(s,.2);assert.equal(s.falls,1);assert.equal(s.props[0].gone,true);assert.equal(s.props[1].gone,false);
});
test('separate pushes give base scores without a chain multiplier',()=>{
  const s=createGame();s.owner.timer=100;s.props[0].x=590;s.props[1].x=630;
  targetProp(s,0);tick(s,.7);targetProp(s,1);tick(s,.7);
  assert.equal(s.falls,2);assert.equal(s.score,20);
  assert.deepEqual(s.events.filter(e=>e.type==='fall').map(e=>e.score),[10,10]);
});
test('last item finishes its drop before the clear result appears',()=>{
  const s=createGame();s.props=[s.props[0]];s.props[0].x=590;
  targetProp(s,0);tick(s,.3);assert.equal(s.falls,1);assert.equal(s.status,'play');
  tick(s,1);assert.equal(s.result,'cleared');assert.equal(s.props[0].fall,DROP_DURATION);
});
