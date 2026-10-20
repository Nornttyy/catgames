import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installTouchGuards,PointerOwner} from '../mobile-input.js';
import {createJumpGame,beginJump,cancelJump,releaseJump} from '../jump-model.js';

class Surface {
  handlers=new Map();
  addEventListener(type,handler,options){this.handlers.set(type,{handler,options});}
  send(type,{native=false,count=1,cancelable=true}={}){
    const e={target:{closest:()=>native?{}:null},touches:Array(count),cancelable,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};
    this.handlers.get(type)?.handler(e);return e;
  }
}
test('game blocks selection, image dragging, long-press and browser zoom gestures',()=>{
  const root=new Surface();installTouchGuards(root);
  for(const type of ['contextmenu','selectstart','dragstart','dblclick','gesturestart','gesturechange','gestureend']){
    assert.equal(root.send(type).defaultPrevented,true,type);
    assert.equal(root.handlers.get(type).options.passive,false);
  }
});
test('normal taps and single-finger menu scrolling are not cancelled',()=>{
  const root=new Surface();installTouchGuards(root);
  assert.equal(root.send('touchmove').defaultPrevented,false);
  assert.equal(root.send('touchmove',{count:2}).defaultPrevented,true);
  assert.equal(root.handlers.has('touchstart'),false);
  assert.equal(root.handlers.has('touchend'),false);
  assert.equal(root.handlers.has('click'),false);
});
test('actual links and text fields retain native interaction; non-cancelable events are safe',()=>{
  const root=new Surface();installTouchGuards(root);
  for(const type of ['contextmenu','selectstart','dblclick','touchmove']){
    assert.equal(root.send(type,{native:true,count:2}).defaultPrevented,false);
    assert.equal(root.send(type,{cancelable:false,count:2}).defaultPrevented,false);
  }
});
test('second finger cannot steal, move or end the original drag',()=>{
  const owner=new PointerOwner();
  assert.equal(owner.claim(0),true);
  assert.equal(owner.claim(2),false);assert.equal(owner.owns(2),false);
  assert.equal(owner.release(2),false);assert.equal(owner.owns(0),true);
  assert.equal(owner.release(0),true);assert.equal(owner.owns(0),false);
  assert.equal(owner.claim(3),true);owner.clear();assert.equal(owner.owns(3),false);
});
test('cancelled jump charges do not launch on a late release',()=>{
  const s=createJumpGame();assert.equal(beginJump(s),true);
  s.charge=.5;cancelJump(s);assert.equal(releaseJump(s),false);
  assert.equal(s.phase,'ready');assert.equal(s.charge,0);
});
test('live entry loads scoped touch protection, preserves menu pan and browser-level zoom',()=>{
  const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');
  assert.match(read('index.html'),/mobile-input\.css\?v=touch-1/);
  assert.doesNotMatch(read('index.html'),/user-scalable=no|maximum-scale=1/);
  const css=read('mobile-input.css');
  assert.match(css,/-webkit-user-select:none/);assert.match(css,/-webkit-touch-callout:none/);
  assert.match(css,/#home \.game-select[^}]+touch-action:pan-x/);
  assert.match(css,/#scene,#play,#play \*\{touch-action:none/);
  const js=read('app.js');assert.match(js,/installTouchGuards\(root\)/);
  assert.match(js,/dragPointer\.owns\(e\.pointerId\)/);
  assert.match(js,/if\(!dragPointer\.release\(e\.pointerId\)\)return/);
  assert.match(js,/window\.addEventListener\('blur',pause\)/);
  assert.match(js,/e\.detail===0&&game&&mode==='table'/);
});
