import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FISH_PROP_ART,FISH_SNACK_WIDTH,fishProp} from '../fish-props.js';
import {createFishGame,fishLayout} from '../fish-model.js';
import {drawFishScene} from '../fish-view.js';

test('every fixed prop footprint retains its PNG aspect ratio',async()=>{
  for(const [kind,art] of Object.entries(FISH_PROP_ART)){
    const png=await readFile(new URL(`../assets/${art.file}`,import.meta.url));
    assert.equal(png[25],6,`${kind}: preserve transparency`);
    assert.ok(Math.abs(art.w/art.h-png.readUInt32BE(16)/png.readUInt32BE(20))<1e-10,`${kind}: no independent width/height stretching`);
  }
});
test('all layouts, stands and tutorial use the same size for the same prop',()=>{
  for(const o of [...Array.from({length:6},(_,r)=>fishLayout(r)).flat(),...createFishGame({tutorial:true}).obstacles,...Object.keys(FISH_PROP_ART).map(k=>fishProp(k,100,{stand:true,w:1,h:999}))]){
    assert.equal(o.w,FISH_PROP_ART[o.kind].w);assert.equal(o.h,FISH_PROP_ART[o.kind].h);
  }
  assert.notEqual(FISH_PROP_ART['bowls-low'].asset,FISH_PROP_ART.bowls.asset);
  assert.notEqual(FISH_PROP_ART['bowls-tall'].asset,FISH_PROP_ART.bowls.asset);
});
test('renderer ignores arbitrary obstacle size and keeps fish size on plates, in hand and home',()=>{
  for(const home of [false,true])for(const ratio of [.7,1,1.3]){
    const s=createFishGame(),draws=[],fishDraws=[],fish={},mug={};
    s.paw.bag.push({...s.snacks[0],grabAge:0});s.snacks[0].state='held';
    s.obstacles[0].w=400;s.obstacles[0].h=400;
    const ctx=new Proxy({drawImage(...args){draws.push(args);}},{get:(t,k)=>k in t?t[k]:()=>{}});
    drawFishScene(ctx,s,{images:{kitchen:{},mug,'bowl-stack':{},'fish-snack':fish},sprite:(...args)=>{if(args[0]===fish)fishDraws.push(args);},catSprite:()=>{},ratio,clock:0,color:'gray',effects:[],home});
    for(const [,x,y,w] of fishDraws)assert.equal(w,FISH_SNACK_WIDTH);
    assert.ok(fishDraws.length);
    if(!home)assert.deepEqual(draws.find(d=>d[0]===mug).slice(1),[-42,-63,84,63]);
  }
});
