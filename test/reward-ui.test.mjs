import test from 'node:test';
import assert from 'node:assert/strict';
import {bindRewardAd} from '../reward-ui.js';

test('actual reward dialog gates claims, traps focus, closes safely and restores the previous UI',()=>{
 const original=Object.fromEntries(['document','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const handlers={},frames=new Map(),nodes=new Map();let serial=0,opened=0,closed=0,paid=0;
 const doc={hidden:false,activeElement:null,addEventListener(type,fn){handlers[type]=fn;}};
 function node(id){const n={id,inert:false,hidden:false,disabled:false,dataset:{},textContent:'',focus(){doc.activeElement=n;}};nodes.set(id,n);return n;}
 const background=node('home'),other=node('wallet'),ad=node('reward-ad');other.inert=true;ad.hidden=true;
 for(const id of ['ad-countdown','ad-progress','ad-claim','ad-close','ad-title','ad-copy','ad-prop'])node(id);
 const root={children:[background,other,ad],querySelector(selector){return nodes.get(selector.slice(1));}};
 globalThis.document=doc;globalThis.requestAnimationFrame=fn=>{frames.set(++serial,fn);return serial;};
 globalThis.cancelAnimationFrame=id=>frames.delete(id);
 try{
   const ui=bindRewardAd(root,{onOpen(){opened++;},onClose(){closed++;}});
   const request={placement:'picker',coins:40,onClaim(){paid+=40;}};
   background.focus();assert.equal(ui.open(request),true);
   assert.equal(ui.open(request),false);assert.equal(opened,1);assert.equal(ad.hidden,false);
   assert.equal(background.inert,true);assert.equal(other.inert,true);
   assert.equal(nodes.get('ad-claim').disabled,true);nodes.get('ad-claim').onclick();assert.equal(paid,0);
   let now=performance.now();
   const advance=()=>{now+=250;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));};
   doc.hidden=true;for(let i=0;i<30;i++)advance();
   assert.equal(nodes.get('ad-claim').disabled,true);
   doc.hidden=false;for(let i=0;i<21;i++)advance();
   assert.equal(nodes.get('ad-claim').disabled,false);
   let prevented=false;
   handlers.keydown({key:'Tab',preventDefault(){prevented=true;},stopImmediatePropagation(){}});
   assert.equal(prevented,true);assert.equal(doc.activeElement,nodes.get('ad-claim'));
   nodes.get('ad-claim').onclick();nodes.get('ad-claim').onclick();
   assert.equal(paid,40);assert.equal(ui.isOpen,false);assert.equal(closed,1);
   assert.equal(background.inert,false);assert.equal(other.inert,true);assert.equal(ad.hidden,true);
   assert.equal(doc.activeElement,background);assert.equal(frames.size,0);
   ui.open(request);nodes.get('ad-close').onclick();assert.equal(paid,40);assert.equal(closed,2);
   assert.equal(ui.open({...request,placement:'unknown'}),false);
   ui.open(request);handlers.keydown({key:'Escape',preventDefault(){},stopImmediatePropagation(){}});
   assert.equal(ui.isOpen,false);assert.equal(paid,40);
   let revived=0;
   assert.equal(ui.open({placement:'revive',onClaim(){revived++;}}),true);
   assert.equal(nodes.get('ad-claim').textContent,'看完后复活');
   nodes.get('ad-claim').onclick();assert.equal(revived,0);
   nodes.get('ad-close').onclick();assert.equal(revived,0);
   ui.open({placement:'revive',onClaim(){revived++;}});
   for(let i=0;i<21;i++)advance();
   assert.equal(nodes.get('ad-claim').textContent,'复活继续');
   nodes.get('ad-claim').onclick();nodes.get('ad-claim').onclick();assert.equal(revived,1);assert.equal(paid,40);
 }finally{
   for(const [key,descriptor] of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
 }
});
