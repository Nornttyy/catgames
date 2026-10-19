import test from 'node:test';
import assert from 'node:assert/strict';
import {TABLE_Y,WORLD_WIDTH,DROP_DURATION} from '../model.js';
import {VIEW_WIDTH,PLAY_ZOOM,visibleWorldWidth,cameraFor,projectX,unprojectX,projectY,targetBounds,propPose} from '../view.js';

test('close camera centers the cat without showing outside the world',()=>{
  assert.equal(PLAY_ZOOM,1.9);
  assert.equal(cameraFor(0),0);
  assert.equal(cameraFor(WORLD_WIDTH),WORLD_WIDTH-visibleWorldWidth);
  assert.ok(Math.abs(projectX(550,cameraFor(550))-VIEW_WIDTH/2)<1e-8);
  for(let x=75;x<=1025;x+=25){
    const camera=cameraFor(x);
    assert.ok(camera>=0&&camera+visibleWorldWidth<=WORLD_WIDTH);
    assert.ok(projectX(x,camera)>=0&&projectX(x,camera)<=VIEW_WIDTH);
  }
});
test('pointer coordinates invert the exact drawing transform',()=>{
  for(const camera of [0,cameraFor(550),cameraFor(1025)]){
    for(const x of [0,50,280,590,900,1050]){
      assert.ok(Math.abs(unprojectX(projectX(x,camera),camera)-x)<1e-8);
    }
  }
  assert.equal(projectY(TABLE_Y),TABLE_Y);
  assert.equal(projectY(TABLE_Y-100),TABLE_Y-190);
});
test('touch targets follow the camera and scale with the art',()=>{
  const p={id:0,x:550,y:TABLE_Y},camera=cameraFor(550),rect=targetBounds(p,camera,.7);
  assert.ok(Math.abs(rect.x-300)<1e-8);
  assert.equal(rect.y,TABLE_Y);
  assert.equal(rect.width,48*PLAY_ZOOM);
  assert.equal(rect.height,70*PLAY_ZOOM*.7);
  assert.equal(rect.hidden,false);
  assert.equal(targetBounds({...p,gone:true},camera,.7).hidden,true);
  assert.equal(targetBounds({...p,x:30},camera,.7).hidden,true);
  assert.equal(targetBounds({...p,x:1050},camera,.7).hidden,true);
  assert.equal(targetBounds({...p,id:'cushion'},camera,.7).width,90*PLAY_ZOOM);
});
test('fall rendering travels only down, stays opaque initially and fades at the end',()=>{
  const item={x:600,y:TABLE_Y,gone:true,fall:0};let lastY=TABLE_Y;
  for(let t=0;t<=DROP_DURATION;t+=.02){
    const pose=propPose({...item,fall:t});assert.equal(pose.x,600);
    assert.ok(pose.y>=lastY);assert.ok(pose.alpha>=0&&pose.alpha<=1);lastY=pose.y;
  }
  assert.equal(propPose({...item,fall:.4}).alpha,1);
  assert.equal(propPose({...item,fall:DROP_DURATION}).alpha,0);
  assert.deepEqual(propPose({...item,gone:false,fall:.6}),{x:600,y:TABLE_Y,alpha:1});
});
