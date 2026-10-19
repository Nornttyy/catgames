import test from 'node:test';
import assert from 'node:assert/strict';
import {COVERS,ROUND_TIME,createGame,update,targetProp,hideAt,skipTutorial,difficultyFor,ownerTiming,gazeFor} from '../model.js';
const tick=(s,seconds)=>{for(let t=0;t<seconds;t+=.02)update(s,.02);};

test('late round is tenser but always gives enough warning to reach cover',()=>{
  const s=createGame(),early=ownerTiming(s),earlyGaze=gazeFor(s).radius;
  s.activeTime=ROUND_TIME*.9;s.falls=10;const late=ownerTiming(s);
  assert.ok(late.away<early.away);assert.ok(late.catchRate>early.catchRate);
  assert.ok(gazeFor(s).radius>earlyGaze);
  assert.ok(late.warning>=1.5);assert.ok(late.warning>375/290);
});
test('loud items bring the owner back sooner than quiet ones',()=>{
  const push=kind=>{const s=createGame();s.props[0].kind=kind;s.props[0].x=590;targetProp(s,0);tick(s,.4);return s;};
  const quiet=push('books'),loud=push('duck');
  assert.ok(loud.owner.noise>quiet.owner.noise);
  assert.ok(loud.owner.timer<quiet.owner.timer);
});
test('two loud drops trigger a telegraphed second check, never an instant extra look',()=>{
  const s=createGame();s.props[0].x=590;s.props[1].x=630;s.props[0].kind=s.props[1].kind='duck';
  targetProp(s,0);tick(s,.6);targetProp(s,1);tick(s,.6);hideAt(s,'popcorn');
  let second=false,awayAfter=false;
  for(let t=0;t<15&&s.status==='play';t+=.02){
    update(s,.02);
    if(!second&&s.owner.rechecking){
      second=true;assert.equal(s.owner.phase,'warning');assert.ok(s.owner.timer>=1.5);
      assert.equal(s.events.at(-1).type,'warning');
    }
    if(second&&s.owner.phase==='away'){awayAfter=true;break;}
  }
  assert.ok(second&&awayAfter);assert.notEqual(s.result,'caught');
});
test('responding to the shortest warning reaches safety even at the far edges',()=>{
  for(const x of [75,1025]){
    const s=createGame();s.activeTime=59;s.time=30;s.cat.x=x;s.owner.x=x;s.owner.noiseX=x;
    s.owner.phase='warning';s.owner.timer=1.5;
    const cover=[...COVERS].sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x))[0];
    hideAt(s,cover.id);tick(s,4);assert.equal(s.cat.hidden,true);assert.equal(s.owner.suspicion,0);
  }
});
test('tutorial waiting cannot silently increase the real difficulty',()=>{
  const s=createGame({tutorial:true});tick(s,120);
  assert.equal(s.activeTime,0);assert.equal(s.time,ROUND_TIME);assert.equal(difficultyFor(s),0);
  skipTutorial(s);assert.equal(s.owner.noise,0);assert.equal(s.owner.rechecking,false);
  assert.equal(s.activeTime,0);tick(s,1);assert.ok(s.activeTime>0&&s.activeTime<1.1);
});
test('remaining hidden cannot win, and the final drop before deadline still counts',()=>{
  const hidden=createGame();hidden.cat.hidden=true;tick(hidden,ROUND_TIME+1);
  assert.equal(hidden.result,'time');assert.equal(hidden.falls,0);
  const final=createGame();final.props=[final.props[0]];final.props[0].x=590;final.time=.4;
  targetProp(final,0);tick(final,1);assert.equal(final.result,'cleared');
});

function rng(seed){seed=Math.imul(seed,0x9e3779b9)>>>0;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};}
export function simulate(seed,cautious){
  const s=createGame({random:rng(seed)});
  for(let t=0;t<ROUND_TIME+2&&s.status==='play';t+=.02){
    const c=s.cat,o=s.owner;
    if(cautious&&(o.phase!=='away'||o.suspicion>25)){
      if(!c.hidden&&!c.pending?.cover){
        const cover=[...COVERS].sort((a,b)=>Math.abs(a.x-c.x)-Math.abs(b.x-c.x))[0];hideAt(s,cover.id);
      }
    }else if(!c.target&&c.action!=='push'){
      const p=s.props.filter(p=>!p.gone).sort((a,b)=>Math.abs(a.x-c.x)-Math.abs(b.x-c.x))[0];if(p)targetProp(s,p.id);
    }
    update(s,.02);
  }
  return {result:s.result,falls:s.falls,seconds:Math.round(s.activeTime*10)/10};
}
test('careful timing is viable, rushing through owner checks is not a free clear',()=>{
  const careful=Array.from({length:12},(_,i)=>simulate(i+1,true));
  const rush=Array.from({length:12},(_,i)=>simulate(i+1,false));
  assert.ok(careful.filter(s=>s.result==='cleared').length>=8,JSON.stringify(careful));
  assert.ok(rush.filter(s=>s.result==='caught').length>=8,JSON.stringify(rush));
});
