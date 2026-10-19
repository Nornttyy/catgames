import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pawRig,drawForeleg,drawPaw} from '../paw-rig.js';
import {fishCatLayers,drawFishScene} from '../fish-view.js';
import {FISH_HOME,createFishGame,beginReach,aimPaw,retractPaw,updateFish} from '../fish-model.js';
test('a gameplay body has three original feet plus exactly one dynamic foreleg',()=>{
  assert.deepEqual(fishCatLayers(),{body:'three-legged',dynamicForeleg:true});
  assert.deepEqual(fishCatLayers(true),{body:'full',dynamicForeleg:false});
});
test('rest, reaching, holding and retracting all use the same single-foreleg rig',()=>{
  const s=createFishGame({tutorial:true});
  for(const phase of ['rest','reach','hold','return']){
    if(phase==='reach'){beginReach(s,FISH_HOME.x,FISH_HOME.y);aimPaw(s,190,390);for(let i=0;i<40;i++)updateFish(s,.01);}
    if(phase==='hold')s.paw.carrying=true;
    if(phase==='return'){retractPaw(s);for(let i=0;i<40;i++)updateFish(s,.01);}
    assert.equal(fishCatLayers().body,'three-legged');assert.equal(fishCatLayers().dynamicForeleg,true);
  }
});
test('resting wrist sits in the replaced forepaw position, not as a fifth paw beside the face',()=>{
  const rig=pawRig(FISH_HOME);assert.ok(rig.end.x<rig.bodyX);assert.ok(rig.end.y>600);
});
test('actual gameplay renderer never overlays its dynamic paw on the full four-foot atlas',()=>{
  for(const color of ['gray','orange','cream','black'])for(const phase of ['rest','reach','holding','return']){
    const drawn=[],fullCats=[],body={kind:`three-feet-${color}`},paw={kind:`round-paw-${color}`};
    const ctx=new Proxy({drawImage(img){drawn.push(img);}},{get:(target,key)=>key in target?target[key]:()=>{}});
    const s=createFishGame();if(phase!=='rest'){s.paw.x=470;s.paw.y=430;}s.paw.carrying=phase==='holding';s.paw.returning=phase==='return';
    drawFishScene(ctx,s,{images:{kitchen:{},[`cat-fish-${color}`]:body,[`paw-round-${color}`]:paw},sprite:()=>{},catSprite:(...args)=>fullCats.push(args),ratio:1,clock:0,color,effects:[]});
    assert.equal(fullCats.length,0,`${color}/${phase}: full atlas must not add an extra foot`);
    assert.equal(drawn.filter(img=>img===body).length,1,`${color}/${phase}: exactly one three-foot body`);
    assert.equal(drawn.filter(img=>img===paw).length,1,`${color}/${phase}: exactly one matching generated paw`);
  }
});
test('stretchable foreleg follows recorded turns, not a newly posed curved limb',()=>{
  const path=[{...FISH_HOME},{x:175,y:375},{x:490,y:375}],p={x:490,y:570,path};
  const rig=pawRig(p);assert.deepEqual(rig.route,[rig.root,...path,rig.end]);
  assert.notEqual(rig.route[1],path[0]);assert.deepEqual(p.path,path);
});
test('restoring stretch keeps the body planted without extra lean, wrist rotation or scaling',()=>{
  for(const x of [85,114,400,550])for(const y of [375,590,620]){const r=pawRig({x,y});assert.equal(r.bodyX,126);assert.deepEqual(r.end,{x,y});assert.equal(r.angle,undefined);assert.equal(r.handScale,undefined);}
});
test('returning unwinds the visible route and joins the same paw throughout',()=>{
  const s=createFishGame({tutorial:true});beginReach(s,FISH_HOME.x,FISH_HOME.y);aimPaw(s,190,390);
  for(let i=0;i<60;i++)updateFish(s,.01);
  const before=s.paw.path.length;assert.ok(before>10);retractPaw(s);
  for(let i=0;i<10;i++)updateFish(s,.01);
  const r=pawRig(s.paw);assert.ok(s.paw.path.length<before);assert.deepEqual(r.route.at(-1),r.end);
  for(let i=0;i<100;i++)updateFish(s,.01);
  assert.deepEqual(pawRig(s.paw).end,FISH_HOME);assert.equal(s.paw.path.length,1);
});
test('generated paw keeps the original bounds and only the existing gripping tilt',()=>{
  for(const gripping of [false,true]){
    const draws=[],translations=[],rotations=[],image={kind:'generated-paw'};
    const ctx=new Proxy({drawImage(...args){draws.push(args);},translate(...args){translations.push(args);},rotate(a){rotations.push(a);},ellipse(){assert.fail('no placeholder paw');},fill(){assert.fail('no procedural paw fill');},scale(){assert.fail('no paw scaling');}},{get:(target,key)=>key in target?target[key]:()=>{}});
    drawPaw(ctx,pawRig({x:490,y:570}),image,gripping);
    assert.deepEqual(draws,[[image,-24,-19,48,38]]);assert.deepEqual(translations,[[490,570]]);
    assert.deepEqual(rotations,gripping?[-.15]:[]);
  }
});
test('all four generated paw assets are transparent 4x PNGs and loaded before play',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  assert.ok(app.includes('`paw-round-${c}.png`'));
  for(const color of ['gray','orange','cream','black']){
    const png=await readFile(new URL(`../assets/paw-round-${color}.png`,import.meta.url));
    assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16),192);assert.equal(png.readUInt32BE(20),152);
    assert.equal(png[25],6,'RGBA transparency, not a baked background');
  }
});
test('foreleg renderer uses a single round-ended route with outline and fill strokes',()=>{
  const points=[],strokes=[];
  const ctx=new Proxy({moveTo(x,y){points.push({x,y});},lineTo(x,y){points.push({x,y});},stroke(){strokes.push([this.lineWidth,this.lineCap,this.lineJoin]);}},{get:(target,key)=>key in target?target[key]:()=>{}});
  const rig=pawRig({x:490,y:570,path:[FISH_HOME,{x:180,y:400},{x:490,y:400}]});
  drawForeleg(ctx,rig,'#ebe5da');assert.deepEqual(points,rig.route);assert.deepEqual(strokes,[[30,'round','round'],[22,'round','round']]);
});
