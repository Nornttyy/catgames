// Local licensed recordings. One shared mixer, bounded voices, no oscillator beeps.
export const CAT_CALLS={
  'meow-jump':['meow-jump','meow-mew','meow-short'],
  'meow-slide':['meow-jump','meow-short','meow-mew'],
  'meow-charge':['meow-short','meow-jump','meow-mew'],
  'meow-hurt':['meow-hurt','meow-grumble','meow-short'],
};
export const SAMPLES=[...new Set(Object.values(CAT_CALLS).flat()),'land','drop','ceramic','shield','tap','pluck','whoosh','lane','pickup','win','lose','tick'];
export const MUSIC='./audio/cat-bgm.mp3';
export const MAX_VOICES=8;
export class CatCallDeck{
  constructor(random=Math.random){this.random=random;this.bags=new Map();this.lastByCue=new Map();this.last=null;}
  next(key,available=()=>true){
    const pool=(CAT_CALLS[key]||[]).filter(available);
    if(!pool.length)return null;
    let bag=(this.bags.get(key)||[]).filter(name=>pool.includes(name));
    if(!bag.length)bag=[...pool];
    let choices=bag.filter(name=>name!==this.last&&name!==this.lastByCue.get(key));
    if(!choices.length)choices=pool.filter(name=>name!==this.last&&name!==this.lastByCue.get(key));
    if(!choices.length)choices=pool.filter(name=>name!==this.lastByCue.get(key));
    if(!choices.length)choices=pool;
    const name=choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))];
    this.bags.set(key,bag.filter(n=>n!==name));this.last=name;this.lastByCue.set(key,name);
    return name;
  }
}
export function soundCue(type,kind){
  const cue=(name,gain=.55,rate=1,gap=.065)=>({name,gain,rate,gap});
  if(['charge','table','learned'].includes(type))return null;
  if(type==='fall')return cue(['mug','bottle'].includes(kind)?'ceramic':'drop',.65);
  if(type==='brawl-hit'||type==='bonk')return cue('meow-hurt',.88,1,.20);
  if(type==='shield-break')return cue('shield',.8,1,.1);
  if(type==='brawl-charge')return cue('meow-charge',.72,1.08,.22);
  if(type==='race-slide')return cue('meow-slide',.64,1.04,.22);
  if(type==='jump')return cue('meow-jump',.72,1,.18);
  if(type==='land')return cue('land',.45,1,.12);
  if(type==='clink')return cue('ceramic',.6,1.18,.1);
  if(type==='warning'||type==='spotted')return cue('lose',.55,.85,.25);
  if(type==='pickup')return cue(kind==='shield'?'shield':kind==='pepper'?'whoosh':'pickup',.6,1.1,.12);
  if(['grab','fish','perfect','race-clear','brawl-ko'].includes(type))return cue('pickup',.52,type==='grab'?1.15:1,.12);
  if(['race-boost','race-go'].includes(type))return cue('win',.6,1,.18);
  if(type==='race-tick')return cue('pluck',.45,.85,.2);
  if(type==='race-lane')return cue('lane',.32,1,.055);
  if(type==='push')return cue('whoosh',.2,1.25,.08);
  if(type==='end')return cue(kind==='cleared'?'win':'lose',.68,kind==='cleared'?1:.8,.3);
  return cue('tap',.45,1,.04);
}
export function musicLevel(scene,{muted=false,paused=false,visible=true}={}){
  if(muted||paused||!visible)return 0;
  return scene==='play'?.13:scene==='result'?.10:scene==='loading'?.16:.21;
}
export class GameAudio{
  constructor({muted=false,fetcher=(...args)=>globalThis.fetch(...args),onStatus=()=>{}}={}){
    this.muted=muted;this.paused=false;this.visible=true;this.scene='loading';this.fetcher=fetcher;
    this.onStatus=onStatus;this.blocked=false;this.playAttempt=0;
    this.raw=new Map();this.buffers=new Map();this.voices=[];this.recent=new Map();this.catCalls=new CatCallDeck();
  }
  preload(){
    if(this.loading)return this.loading;
    this.loading=Promise.allSettled(SAMPLES.map(async name=>{
      const r=await this.fetcher(`./audio/${name}.wav`);if(!r.ok)throw Error(name);
      const data=await r.arrayBuffer();this.raw.set(name,data);
      if(this.ctx)await this.decode(name,data);
    }));return this.loading;
  }
  async decode(name,data){try{this.buffers.set(name,await this.ctx.decodeAudioData(data.slice(0)));}catch{}}
  get needsGesture(){return !this.muted&&(this.blocked||!!this.ctx&&this.ctx.state!=='running');}
  unlock(){
    if(this.muted||!this.visible)return;
    try{
      if(!this.ctx){
        const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return;
        const c=this.ctx=new Context();this.master=c.createGain();this.sfx=c.createGain();this.musicGain=c.createGain();
        const limiter=c.createDynamicsCompressor();limiter.threshold.value=-5;limiter.knee.value=4;limiter.ratio.value=8;limiter.attack.value=.002;limiter.release.value=.12;
        this.master.gain.value=.85;this.sfx.gain.value=.8;this.musicGain.gain.value=0;
        this.sfx.connect(this.master);this.musicGain.connect(this.master);this.master.connect(limiter);limiter.connect(c.destination);
        this.music=document.createElement('audio');this.music.id='cat-bgm';this.music.hidden=true;this.music.loop=true;this.music.preload='auto';this.music.src=MUSIC;
        this.music.setAttribute('aria-label','背景音乐');document.body.append(this.music);
        c.onstatechange=()=>this.onStatus();
        c.createMediaElementSource(this.music).connect(this.musicGain);
        for(const [name,data] of this.raw)this.decode(name,data);
        this.preload();
      }
      // Try once on entry; a real tap retries both APIs synchronously if blocked.
      this.ctx.resume().then(()=>this.onStatus()).catch(()=>{this.blocked=true;this.onStatus();});this.mix();this.onStatus();
    }catch{/* Audio never blocks the game. */}
  }
  ramp(param,value,seconds=.12){const t=this.ctx.currentTime;param.cancelScheduledValues(t);param.setValueAtTime(param.value,t);param.linearRampToValueAtTime(value,t+seconds);}
  mix(){
    if(!this.ctx)return;clearTimeout(this.pauseTimer);
    this.ramp(this.master.gain,this.muted||!this.visible?0:.85,.035);
    const level=musicLevel(this.scene,this);this.ramp(this.musicGain.gain,level,.22);
    if(level>0){
      const attempt=++this.playAttempt;
      this.music.play().then(()=>{if(attempt===this.playAttempt){this.blocked=false;this.onStatus();}}).catch(error=>{
        if(attempt===this.playAttempt&&error.name==='NotAllowedError'){this.blocked=true;this.onStatus();}
      });
    }
    else if(!this.visible||this.muted)this.music.pause();
    else this.pauseTimer=setTimeout(()=>{if(!musicLevel(this.scene,this))this.music.pause();},240);
  }
  setMuted(value){this.muted=value;if(value)this.stopVoices();else this.unlock();this.mix();this.onStatus();}
  setScene(scene){this.scene=scene;this.paused=false;this.mix();}
  setPaused(value){this.paused=value;if(value)this.stopVoices();this.mix();}
  setVisible(value){this.visible=value;if(!value){this.stopVoices();this.music?.pause();this.ctx?.suspend().catch(()=>{});}else if(!this.muted)this.ctx?.resume().catch(()=>{});this.mix();}
  stopVoices(){for(const source of [...this.voices]){try{source.stop();}catch{}}this.voices.length=0;this.catVoice=null;}
  play(type,kind){
    if(this.muted||!this.visible||this.paused||this.ctx?.state!=='running')return false;
    const cue=soundCue(type,kind);if(!cue)return false;
    const c=this.ctx,now=c.currentTime,key=cue.name;
    if(now-(this.recent.get(key)??-10)<cue.gap)return false;
    const catCall=!!CAT_CALLS[key],priority=key==='meow-hurt'?3:key==='meow-charge'?2:1;
    // Keep hurt calls readable, but do not queue old actions to play late.
    if(catCall&&this.catVoice&&this.catVoice.catPriority>priority)return false;
    const name=catCall?this.catCalls.next(key,n=>this.buffers.has(n)):key,buffer=this.buffers.get(name);
    if(!buffer)return false;this.recent.set(key,now);
    if(catCall&&this.catVoice){
      // A short crossfade avoids clicks when a hit interrupts another meow.
      const old=this.catVoice;this.ramp(old.catGain.gain,0,.025);
      try{old.stop(now+.025);}catch{}
    }
    while(this.voices.length>=MAX_VOICES){try{this.voices.shift().stop();}catch{}}
    const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;source.playbackRate.value=cue.rate;gain.gain.value=cue.gain;
    if(catCall){source.catCue=key;source.catSample=name;source.catPriority=priority;source.catGain=gain;this.catVoice=source;}
    source.connect(gain);gain.connect(this.sfx);this.voices.push(source);
    source.onended=()=>{source.disconnect();gain.disconnect();const i=this.voices.indexOf(source);if(i>=0)this.voices.splice(i,1);if(this.catVoice===source)this.catVoice=null;};
    source.start();return true;
  }
}
