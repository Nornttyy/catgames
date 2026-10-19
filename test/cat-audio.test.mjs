import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {soundCue,SAMPLES,GameAudio} from '../audio.js';
test('jump and hurt use distinct, short locally packaged cat calls',()=>{
 assert.equal(soundCue('jump').name,'meow-jump');
 for(const type of ['brawl-hit','bonk'])assert.equal(soundCue(type).name,'meow-hurt');
 assert.equal(soundCue('shield-break').name,'shield');
 for(const name of ['meow-jump','meow-hurt']){assert.ok(SAMPLES.includes(name));const b=fs.readFileSync(new URL(`../audio/${name}.wav`,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');assert.ok(b.length>25000&&b.length<65000);}
});
test('hurt takes priority and cat calls do not pile up',()=>{
 const audio=new GameAudio();audio.ctx={state:'running',currentTime:1,createGain:()=>({gain:{},connect(){},disconnect(){}}),createBufferSource:()=>({playbackRate:{},connect(){},disconnect(){},start(){},stop(){this.stopped=true;this.onended?.();}})};
 audio.sfx={};audio.buffers.set('meow-jump',{});audio.buffers.set('meow-hurt',{});
 assert.equal(audio.play('jump'),true);const jump=audio.catVoice;audio.ctx.currentTime+=.1;
 assert.equal(audio.play('brawl-hit'),true);assert.equal(jump.stopped,true);assert.equal(audio.voices.length,1);
 audio.ctx.currentTime+=.3;assert.equal(audio.play('jump'),false);assert.equal(audio.catVoice.catCue,'meow-hurt');
 audio.stopVoices();assert.equal(audio.catVoice,null);assert.equal(audio.voices.length,0);
});
