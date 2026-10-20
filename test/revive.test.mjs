import test from 'node:test';
import assert from 'node:assert/strict';
import {canRevive,reviveGame} from '../revive.js';
import {createGame,update} from '../model.js';
import {createFishGame,updateFish} from '../fish-model.js';
import {createJumpGame,beginJump,releaseJump,updateJump,touchesSpike} from '../jump-model.js';
import {createBrawl,damageCat,updateBrawl} from '../brawl-model.js';
import {loadEconomy,settleRound,doubleRound} from '../economy.js';

test('only a real loss is eligible, never wins, timer results, races, or a second revive',()=>{
  for(const mode of ['table','fish']){
    const s={status:'over',result:'caught',time:20};
    assert.equal(canRevive(mode,s),true);
    assert.equal(canRevive(mode,{...s,result:'time'}),false);
    assert.equal(canRevive(mode,{...s,result:'cleared'}),false);
    assert.equal(canRevive(mode,{...s,reviveUsed:true}),false);
    assert.equal(canRevive(mode,{...s,status:'play'}),false);
  }
  assert.equal(canRevive('race',{status:'ended'}),false);
  assert.equal(canRevive('brawl',{status:'ended',remaining:0,cats:[{hp:0},{hp:100}]}),false);
});
test('jump revival preserves the route, score and last safe landing, then collides normally',()=>{
  const s=createJumpGame({tutorial:false,color:'black',random:()=>.5});
  beginJump(s);s.charge=.35;releaseJump(s);
  for(let i=0;i<500&&s.status==='play';i++)updateJump(s,.04);
  assert.equal(s.status,'ended');assert.equal(canRevive('jump',s),true);
  const hazards=JSON.stringify(s.hazards),score=s.score,cleared=s.cleared;
  assert.equal(reviveGame('jump',s),true);
  assert.equal(s.cat.x,140);assert.equal(s.score,score);assert.equal(s.cleared,cleared);
  assert.equal(JSON.stringify(s.hazards),hazards);
  for(const f of [0,2,12,13,14,15])assert.equal(s.hazards.some(h=>touchesSpike(s.cat,h,f,s.color)),false);
  beginJump(s);s.charge=.35;releaseJump(s);
  for(let i=0;i<500&&s.status==='play';i++)updateJump(s,.04);
  assert.equal(s.status,'ended');assert.equal(canRevive('jump',s),false);
});
test('brawl returns full health on a real platform with brief protection, keeping opponents and stats',()=>{
  const s=createBrawl({random:()=>.5}),c=s.cats[0];
  s.phase='finish';s.status='ended';s.time=22;s.remaining=63;s.deathWait=.7;
  c.hp=0;c.kills=2;c.damage=90;c.stun=2;c.vx=400;
  const enemies=JSON.stringify(s.cats.slice(1)),items=JSON.stringify(s.items);
  assert.equal(reviveGame('brawl',s),true);
  assert.equal(c.hp,100);assert.equal(c.kills,2);assert.equal(c.damage,90);
  assert.equal(c.invincible,3);assert.equal(c.vx,0);assert.equal(c.stun,0);
  assert.equal(s.time,22);assert.equal(s.remaining,63);assert.equal(s.deathWait,0);
  assert.equal(JSON.stringify(s.cats.slice(1)),enemies);assert.equal(JSON.stringify(s.items),items);
  assert.ok(s.surfaces.some(p=>p.id===c.surfaceId&&p.y===c.y&&c.x>p.left&&c.x<p.right));
  assert.equal(damageCat(s,s.cats[1],c),false);
  for(let i=0;i<20;i++)updateBrawl(s,.04,0);
  assert.equal(s.status,'play');assert.equal(c.hp,100);assert.equal(canRevive('brawl',s),false);
});
test('table revival does not replace fallen objects or discard points',()=>{
  const s=createGame();s.status='over';s.result='caught';s.owner.suspicion=100;
  s.props[0].gone=true;s.falls=1;s.score=10;s.time=30;
  const props=s.props;
  assert.equal(reviveGame('table',s),true);
  assert.equal(s.props,props);assert.equal(s.props[0].gone,true);assert.equal(s.score,10);
  assert.equal(s.owner.phase,'away');assert.equal(s.owner.suspicion,0);assert.equal(s.time,30);
  update(s,.04);assert.equal(s.status,'play');assert.equal(s.falls,1);
});
test('fish revival restores chances without duplicating or dropping fish',()=>{
  const s=createFishGame();s.status='over';s.result='caught';s.mistakes=3;
  s.time=35;s.caught=3;s.score=400;s.snacks[0].state='held';
  s.paw.bag=[s.snacks[0]];s.paw.carrying=true;
  const board=s.board,order=[...s.order],snacks=s.snacks;
  assert.equal(reviveGame('fish',s),true);
  assert.equal(s.score,400);assert.equal(s.caught,3);assert.equal(s.mistakes,0);
  assert.equal(s.snacks,snacks);assert.equal(s.snacks[0].state,'tray');assert.equal(s.paw.bag.length,0);
  assert.deepEqual(s.order,order);assert.equal(s.board,board);assert.equal(s.time,35);
  updateFish(s,.04);assert.equal(s.status,'play');
});
test('revived rounds only pay additional progress, including doubling before or after revive',()=>{
  for(const earlyDouble of [true,false]){
    const wallet=loadEconomy(),round={status:'ended',cleared:2};
    assert.equal(settleRound(wallet,'same','jump',round),6);
    if(earlyDouble)doubleRound(wallet,'same');
    round.cleared=5;assert.equal(settleRound(wallet,'same','jump',round),earlyDouble?18:9);
    if(!earlyDouble)doubleRound(wallet,'same');
    assert.equal(wallet.coins,30);assert.equal(wallet.lastRound.coins,15);
    assert.equal(settleRound(wallet,'same','jump',round),0);
    assert.equal(settleRound(wallet,'same','jump',{...round,cleared:1}),0);
    assert.equal(doubleRound(wallet,'same'),0);assert.equal(wallet.coins,30);
  }
});
