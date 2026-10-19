import test from 'node:test';import assert from 'node:assert/strict';
import {createBrawl,brawlTactic,BRAWL} from '../brawl-model.js';
import {createRace,raceAction,updateRace,RACE} from '../race-model.js';
function setup(difficulty){const s=createBrawl({difficulty}),c=s.cats[1],t=s.cats[0];Object.assign(c,{x:500,y:0,cooldown:0,attack:0,grounded:true});Object.assign(t,{x:610,y:0,facing:-1,attack:BRAWL.active+BRAWL.recovery+.05,cooldown:1});return {s,c,t};}
test('casual chases, normal and hard evade visible attacks, without reading player input',()=>{
  for(const difficulty of ['casual','normal','hard']){const {s,c,t}=setup(difficulty);assert.equal(brawlTactic(s,c,t),difficulty==='casual'?'attack':'dodge');}
});
test('hard uses attack recovery openings and retreats from active shields',()=>{
  const hard=setup('hard'),normal=setup('normal');
  for(const {s,c,t}of [hard,normal]){t.x=660;t.attack=.1;assert.equal(brawlTactic(s,c,t),s.difficulty==='hard'?'attack':'chase');}
  hard.t.x=610;hard.t.attack=0;hard.t.shield=4;assert.equal(brawlTactic(hard.s,hard.c,hard.t),'retreat');
  hard.c.cooldown=1;hard.t.shield=0;assert.equal(brawlTactic(hard.s,hard.c,hard.t),'retreat');
});
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};}
test('a legal lane/jump/slide route clears every generated course, even at boosted speed with feather',()=>{
  for(const difficulty of ['casual','normal','hard'])for(let seed=1;seed<=12;seed++)for(const boosted of [false,true]){
    const s=createRace({difficulty,random:random(seed)}),r=s.racers[0],acted=new Set();s.phase='run';s.items=[];
    if(boosted){r.boost=999;r.feather=999;}
    for(let i=0;i<7000&&s.status==='play';i++){
      const o=s.obstacles[r.next];
      if(o&&!acted.has(o.id)&&o.x-r.x<240){
        const safe=o.lanes.findIndex(k=>!k);
        if(safe<0)assert.ok(raceAction(s,o.lanes[0]==='gate'?'slide':'jump'));
        else for(let j=0;j<2&&r.laneTarget!==safe;j++)assert.ok(raceAction(s,r.laneTarget<safe?'right':'left'));
        acted.add(o.id);
      }
      updateRace(s,1/60);
    }
    assert.equal(r.misses,0,`${difficulty}, seed ${seed}, boosted ${boosted}`);assert.ok(r.x>=RACE.finish);
  }
});
