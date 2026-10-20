import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {soundCue,SAMPLES,GameAudio,CAT_CALLS,CatCallDeck} from '../audio.js';
test('jump and hurt use distinct, short locally packaged cat calls',()=>{
 assert.equal(soundCue('jump').name,'meow-jump');
 for(const type of ['brawl-hit','bonk'])assert.equal(soundCue(type).name,'meow-hurt');
 assert.equal(soundCue('shield-break').name,'shield');
 for(const name of ['meow-jump','meow-hurt']){assert.ok(SAMPLES.includes(name));const b=fs.readFileSync(new URL(`../audio/${name}.wav`,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');assert.ok(b.length>25000&&b.length<65000);}
});
test('hurt takes priority and cat calls do not pile up',()=>{
 const audio=new GameAudio();audio.ctx={state:'running',currentTime:1,createGain:()=>({gain:{value:1,cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}),createBufferSource:()=>({playbackRate:{},connect(){},disconnect(){},start(){},stop(time){this.stopAt=time;this.stopped=true;this.onended?.();}})};
 audio.sfx={};audio.buffers.set('meow-jump',{});audio.buffers.set('meow-hurt',{});
 assert.equal(audio.play('jump'),true);const jump=audio.catVoice;audio.ctx.currentTime+=.1;
 assert.equal(audio.play('brawl-hit'),true);assert.equal(jump.stopped,true);assert.equal(audio.voices.length,1);
 assert.ok(Math.abs(jump.stopAt-1.125)<.001);
 audio.ctx.currentTime+=.3;
 for(const event of ['jump','race-slide','brawl-charge'])assert.equal(audio.play(event),false);
 assert.equal(audio.catVoice.catCue,'meow-hurt');
 audio.stopVoices();assert.equal(audio.catVoice,null);assert.equal(audio.voices.length,0);
});
test('jump, slide, charge and hurt each have three recordings, not just pitch shifts',()=>{
 assert.equal(soundCue('race-slide').name,'meow-slide');
 assert.equal(soundCue('brawl-charge').name,'meow-charge');
 const unique=new Set();
 for(const pool of Object.values(CAT_CALLS)){
   assert.equal(new Set(pool).size,3);
   for(const name of pool){
     unique.add(name);assert.ok(SAMPLES.includes(name));
     const wav=fs.readFileSync(new URL(`../audio/${name}.wav`,import.meta.url));
     assert.equal(wav.toString('ascii',0,4),'RIFF');
     assert.equal(wav.toString('ascii',8,12),'WAVE');
     assert.ok(wav.length>20000&&wav.length<130000);
   }
 }
 assert.equal(unique.size,5);assert.equal(SAMPLES.length,new Set(SAMPLES).size);
});
test('variety deck cycles the whole action pool without consecutive repeats',()=>{
 const deck=new CatCallDeck(()=>0);
 for(const key of Object.keys(CAT_CALLS)){
   let previous=null;const seen=new Set();
   for(let i=0;i<15;i++){const name=deck.next(key);assert.notEqual(name,previous);previous=name;seen.add(name);}
   assert.deepEqual([...seen].sort(),[...CAT_CALLS[key]].sort());
 }
});
test('switching actions avoids the last recording and unloaded clips never get picked',()=>{
 const deck=new CatCallDeck(()=>0);
 let prev;
 for(let i=0;i<60;i++){
   const name=deck.next(Object.keys(CAT_CALLS)[i%4]);assert.notEqual(name,prev);prev=name;
 }
 assert.equal(deck.next('meow-jump',()=>false),null);
 assert.equal(deck.next('meow-slide',n=>n==='meow-short'),'meow-short');
});
test('preloading includes all five retained cat recordings exactly once',async()=>{
 const urls=[];const audio=new GameAudio({fetcher:async url=>{urls.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}});
 await audio.preload();await audio.preload();
 assert.equal(urls.length,SAMPLES.length);
 assert.equal(urls.filter(url=>url.includes('meow-')).length,5);
 assert.ok(!urls.some(url=>url.includes('meow-chirp')));
});
test('rejected sample 3 is neither packaged nor selectable by any action',()=>{
 assert.ok(!SAMPLES.includes('meow-chirp'));
 assert.ok(!Object.values(CAT_CALLS).flat().includes('meow-chirp'));
 assert.equal(fs.existsSync(new URL('../audio/meow-chirp.wav',import.meta.url)),false);
});
