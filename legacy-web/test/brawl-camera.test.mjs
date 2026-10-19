import test from 'node:test';
import assert from 'node:assert/strict';
import {BRAWL_ROOM,brawlViewport,setBrawlViewport,updateBrawlCamera,brawlScreenPoint} from '../brawl-camera.js';
import {createBrawl,updateBrawl} from '../brawl-model.js';
const settle=s=>{for(let i=0;i<240;i++)updateBrawlCamera(s,1/60);};
const covered=s=>{
  const a=brawlScreenPoint(s,BRAWL_ROOM.left,BRAWL_ROOM.top),b=brawlScreenPoint(s,BRAWL_ROOM.left+BRAWL_ROOM.width,BRAWL_ROOM.top+BRAWL_ROOM.height);
  assert.ok(a.x<=1e-8&&a.y<=1e-8&&b.x>=600-1e-8&&b.y>=900-1e-8,JSON.stringify({a,b,view:s.viewport}));
};
test('painted room covers every screen edge at all camera limits and phone aspect ratios',()=>{
  for(const ratio of [.48,.6,.7,1,1.25,1.5,2])for(const map of ['kitchen','living']){
    const s=createBrawl({ratio,map});covered(s);
    for(const x of [35,300,900,1500,1765])for(const y of [-1000,-662,-274,0]){
      Object.assign(s.cats[0],{x,y});for(let i=0;i<120;i++){updateBrawlCamera(s,1/60);covered(s);}
    }
  }
});
test('left and right camera edges lock exactly while the player moves within the edge zone',()=>{
  for(const ratio of [.7,1,1.25])for(const side of ['left','right']){
    const s=createBrawl({ratio}),v=s.viewport,c=s.cats[0],left=side==='left';
    c.x=left?35:1765;settle(s);const locked=left?v.minX:v.maxX;assert.equal(s.camera,locked);
    const a=brawlScreenPoint(s,c.x,c.y);c.x+=left?60:-60;settle(s);
    assert.equal(s.camera,locked);assert.notEqual(brawlScreenPoint(s,c.x,c.y).x,a.x);
    c.x=900;updateBrawlCamera(s,1/60);assert.notEqual(s.camera,locked);covered(s);
  }
});
test('ceiling and floor do not reveal flat-color space when following a jump',()=>{
  for(const ratio of [.65,1.25]){
    const s=createBrawl({ratio});s.cats[0].y=-1000;settle(s);assert.equal(s.cameraY,s.viewport.minY);covered(s);
    s.cats[0].y=0;settle(s);assert.equal(s.cameraY,s.viewport.maxY);covered(s);
  }
});
test('resize immediately clamps an existing camera without moving the cat or changing physics',()=>{
  const s=createBrawl({ratio:1.5});s.cats[0].x=1765;s.cats[0].y=-600;settle(s);
  const before={...s.cats[0]};setBrawlViewport(s,.55);covered(s);assert.deepEqual(s.cats[0],before);
  setBrawlViewport(s,1.5);covered(s);
});
test('camera already fits during countdown and remains frozen on pause',()=>{
  const s=createBrawl({ratio:.65,map:'living'}),before=[s.camera,s.cameraY];
  updateBrawl(s,.1);assert.deepEqual([s.camera,s.cameraY],before);covered(s);
  s.phase='fight';s.paused=true;updateBrawl(s,.1,1);assert.deepEqual([s.camera,s.cameraY],before);
});
test('invalid viewport values use safe defaults',()=>{
  for(const ratio of [NaN,Infinity,0,-1])assert.deepEqual(brawlViewport(ratio),brawlViewport(1));
});
test('highest ledge jump has real headroom inside the bounded scene',()=>{
  const highest=-662,featherHeight=(1060*1.13)**2/(2*1850);
  assert.ok(highest-featherHeight-140>BRAWL_ROOM.top);
  assert.equal(BRAWL_ROOM.artTop,-711);assert.equal(BRAWL_ROOM.artHeight,900);
});
