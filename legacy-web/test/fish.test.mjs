import test from 'node:test';
import assert from 'node:assert/strict';
import {FISH_HOME,FISH_GOAL,FISH_TIME,FISH_CAPACITY,FISH_CHANCES,haulValue,createFishGame,beginReach,aimPaw,retractPaw,updateFish,fishHudCopy,fishHidden,fishLayout,fishObstacleAt} from '../fish-model.js';
const tick=(s,n)=>{for(let t=0;t<n;t+=.01)updateFish(s,.01);};
const aim=(s,x,y,secs=1)=>{aimPaw(s,x,y);tick(s,secs);};
function collect(s){beginReach(s,FISH_HOME.x,FISH_HOME.y);aim(s,190,390,.4);aim(s,s.fish.x,390,.6);aim(s,s.fish.x,s.fish.y,.4);assert.ok(s.paw.carrying);retractPaw(s);tick(s,1.5);}
test('paw requires a close intentional grab, never taps a distant fish to win',()=>{
  const s=createFishGame();assert.equal(beginReach(s,500,590),false);aimPaw(s,500,590);tick(s,1);assert.ok(fishHidden(s));assert.equal(s.caught,0);
});
test('large pointer jumps stop at dishes instead of tunneling',()=>{
  const s=createFishGame({tutorial:true});beginReach(s,174,587);aim(s,500,587);assert.ok(s.paw.x<285);assert.equal(s.paw.carrying,false);assert.ok(s.events.some(e=>e.type==='clink'));
});
test('reach around dishes, grab fish and retract along path to score exactly once',()=>{
  const s=createFishGame({tutorial:true});collect(s);assert.equal(s.caught,1);assert.equal(s.score,100);assert.ok(fishHidden(s));assert.equal(s.tutorial,null);tick(s,.7);assert.equal(s.score,100);
});
test('releasing without a fish returns safely without scoring',()=>{
  const s=createFishGame();beginReach(s,174,587);aim(s,200,400,.3);retractPaw(s);tick(s,1);assert.ok(fishHidden(s));assert.equal(s.score,0);
});
test('pause freezes movement, owner, and clock',()=>{
  const s=createFishGame();beginReach(s,174,587);aimPaw(s,180,390);s.paused=true;const before=JSON.stringify(s);tick(s,2);assert.equal(JSON.stringify(s),before);
});
test('tutorial gives short prompts and does not run out or get caught',()=>{
  const s=createFishGame({tutorial:true});assert.equal(fishHudCopy(s).tip,'拖猫爪');tick(s,100);assert.equal(s.time,FISH_TIME);assert.equal(s.status,'play');s.tutorial=null;assert.equal(fishHudCopy(s).tip,'');
});
test('owner turns with a full warning; first mistake allows recovery and third ends the run',()=>{
  const s=createFishGame({random:()=>0});tick(s,6.4);assert.equal(s.owner.phase,'warning');assert.ok(s.owner.timer>1.6);
  beginReach(s,FISH_HOME.x,FISH_HOME.y);aim(s,200,390,2.7);assert.equal(s.mistakes,1);assert.equal(s.status,'play');assert.ok(fishHidden(s));
  for(let i=1;i<FISH_CHANCES;i++){tick(s,.7);beginReach(s,FISH_HOME.x,FISH_HOME.y);aim(s,200,390,.5);s.owner.phase='look';s.owner.timer=2;tick(s,.85);}
  assert.equal(s.result,'caught');assert.equal(s.mistakes,3);
});
test('retracting at the warning is fast enough even from the far fish',()=>{
  const s=createFishGame({tutorial:true});beginReach(s,174,587);aim(s,190,390,.4);aim(s,500,390,.6);aim(s,500,590,.4);s.tutorial=null;s.owner.phase='warning';s.owner.timer=1.55;retractPaw(s);tick(s,3);assert.equal(s.status,'play');assert.equal(s.caught,1);assert.equal(s.owner.suspicion,0);
});
function travel(s,x,y){
  aimPaw(s,x,y);for(let i=0;i<200&&Math.hypot(s.paw.x-x,s.paw.y-y)>1;i++)updateFish(s,.01);
  assert.ok(Math.hypot(s.paw.x-x,s.paw.y-y)<2,`route blocked at ${s.paw.x},${s.paw.y} toward ${x},${y}`);
}
function grab(s,f){
  travel(s,s.paw.x,390);travel(s,f.x,390);
  for(let i=0;i<150&&f.state==='tray';i++){aimPaw(s,f.x,f.y);updateFish(s,.01);}
  assert.equal(f.state,'held',`fish ${f.id} must be reachable on layout ${s.variant}`);
}
function bank(s){retractPaw(s);for(let i=0;i<700&&s.paw.returning;i++)updateFish(s,.01);assert.ok(fishHidden(s));}
test('all six authored routes retain an overhead lane and distinct obstacle shapes',()=>{
  const layouts=[];
  for(let r=0;r<6;r++){
    const s=createFishGame({random:()=>0});s.obstacles=fishLayout(r);layouts.push(JSON.stringify(s.obstacles));
    for(let x=120;x<=550;x+=5)assert.equal(fishObstacleAt(s,{x,y:390}),undefined);
    beginReach(s,FISH_HOME.x,FISH_HOME.y);for(const f of s.snacks)grab(s,f);bank(s);assert.equal(s.caught,3);
  }
  assert.equal(new Set(layouts).size,6);
});
test('three fish stay unbanked until return, then pay the full haul bonus once',()=>{
  const s=createFishGame({random:()=>0});beginReach(s,FISH_HOME.x,FISH_HOME.y);
  for(const f of s.snacks)grab(s,f);
  assert.equal(s.paw.bag.length,FISH_CAPACITY);assert.equal(s.score,0);assert.equal(s.caught,0);assert.equal(haulValue(s),760);
  bank(s);assert.equal(s.caught,3);assert.equal(s.score,760);assert.equal(s.bestHaul,3);tick(s,.5);assert.equal(s.score,760);
});
test('banking one fish preserves the other two and their route instead of respawning a whole table',()=>{
  const s=createFishGame({random:()=>0}),board=s.board,fish=s.snacks[0];beginReach(s,FISH_HOME.x,FISH_HOME.y);grab(s,fish);bank(s);
  assert.equal(s.score,100);assert.equal(s.board,board);assert.equal(fish.state,'banked');assert.equal(s.snacks.filter(f=>f.state==='tray').length,2);
});
test('two fish pay more than two separate single-fish returns',()=>{
  const s=createFishGame({random:()=>0});beginReach(s,FISH_HOME.x,FISH_HOME.y);grab(s,s.snacks[0]);grab(s,s.snacks[1]);
  assert.equal(haulValue(s),300);bank(s);assert.equal(s.score,300);
});
test('dragging back up after grabbing retracts the old branch instead of drawing extra arms',()=>{
  const s=createFishGame({random:()=>0});beginReach(s,FISH_HOME.x,FISH_HOME.y);grab(s,s.snacks[0]);
  const x=s.paw.x;assert.ok(s.paw.path.some(p=>Math.abs(p.x-x)<10&&p.y>500));
  travel(s,x,390);travel(s,380,390);
  assert.equal(s.paw.path.some(p=>Math.abs(p.x-x)<10&&p.y>500),false);
  assert.equal(s.paw.bag.length,1);bank(s);assert.equal(s.score,100);
});
test('being spotted drops only the unbanked fish and keeps all secured progress',()=>{
  const s=createFishGame({random:()=>0});beginReach(s,FISH_HOME.x,FISH_HOME.y);grab(s,s.snacks[0]);bank(s);tick(s,.5);
  beginReach(s,FISH_HOME.x,FISH_HOME.y);const target=s.snacks[1];grab(s,target);s.owner.phase='look';s.owner.timer=3;
  tick(s,.85);assert.equal(s.score,100);assert.equal(s.caught,1);assert.equal(target.state,'tray');assert.equal(s.paw.bag.length,0);assert.equal(s.mistakes,1);
});
test('plates move, pause freezes them, and fish on bowl stands remain supported',()=>{
  const s=createFishGame({random:()=>0}),x=s.snacks[0].x;tick(s,.5);assert.notEqual(s.snacks[0].x,x);
  s.paused=true;const snapshot=JSON.stringify(s);tick(s,2);assert.equal(JSON.stringify(s),snapshot);
});
test('authored board order varies without losing or duplicating a layout',()=>{
  const a=createFishGame({random:()=>0}),b=createFishGame({random:()=>.99});assert.notDeepEqual(a.order,b.order);
  assert.deepEqual([...a.order].sort(),[0,1,2,3,4,5]);assert.equal(a.order[0],0);
});
test('greedy but careful players can clear all randomized boards and raised plates',()=>{
  const seen=new Set();
  for(let seed=1;seed<=24;seed++){
    let n=Math.imul(seed,2654435761)>>>0;const random=()=>((n=Math.imul(n,1664525)+1013904223>>>0)/4294967296);
    const s=createFishGame({random});
    for(let attempt=0;attempt<6&&s.status==='play';attempt++){
      while(s.status==='play'&&(s.owner.phase!=='away'||s.owner.timer<5||s.cooldown>0))tick(s,.05);
      if(s.status!=='play')break;seen.add(s.variant);beginReach(s,FISH_HOME.x,FISH_HOME.y);
      for(const f of s.snacks.filter(f=>f.state==='tray'))grab(s,f);bank(s);
    }
    assert.equal(s.result,'cleared',`seed ${seed}`);assert.equal(s.score,3040);assert.equal(s.caught,FISH_GOAL);assert.ok(s.time>20);assert.equal(s.mistakes,0);
  }
  assert.equal(seen.size,6);
});
test('a safe single-fish strategy can clear, but earns less than a greedy clear',()=>{
  const s=createFishGame({random:()=>0});
  for(let i=0;i<20&&s.status==='play';i++){
    while(s.status==='play'&&(s.owner.phase!=='away'||s.owner.timer<3||s.cooldown>0))tick(s,.05);
    if(s.status!=='play')break;beginReach(s,FISH_HOME.x,FISH_HOME.y);grab(s,s.snacks.find(f=>f.state==='tray'));bank(s);
  }
  assert.equal(s.result,'cleared');assert.equal(s.score,1520);assert.ok(s.time>0);
});
test('timeout is a real loss, and ended games cannot accept a new grab',()=>{
  const s=createFishGame();tick(s,FISH_TIME+1);assert.equal(s.result,'time');assert.equal(beginReach(s,174,587),false);
});
