import {COLORS,COVERS,TABLE_Y,WORLD_WIDTH,DROP_DURATION,createGame,update,frameFor,targetProp,moveTo,hideAt,skipTutorial,gazeFor} from './model.js?v=controls-7';
import {PLAY_ZOOM,cameraFor,projectX,unprojectX,targetBounds,propPose,hudCopy,sceneFor} from './view.js?v=controls-7';
import {FISH_HOME,FISH_GOAL,FISH_CAPACITY,FISH_CHANCES,haulValue,createFishGame,beginReach,aimPaw,retractPaw,updateFish,fishHudCopy,fishHidden} from './fish-model.js?v=controls-7';
import {drawFishScene,projectFishY,unprojectFishY} from './fish-view.js?v=controls-7';
import {FISH_PROP_ART} from './fish-props.js?v=controls-7';
import {homeLayout,drawHomeScene} from './home-view.js?v=controls-7';
import {JUMP,createJumpGame,beginJump,releaseJump,cancelJump,updateJump} from './jump-model.js?v=controls-7';
import {drawJumpScene,JUMP_BASE} from './jump-view.js?v=controls-7';
import {RACE,createRace,raceAction,updateRace} from './race-model.js?v=controls-7';
import {drawRaceScene,raceScreenPoint} from './race-view.js?v=controls-7';
import {chainState,resultSummary} from './ui-model.js?v=controls-7';
import {makeBurst,tickParticles,drawParticles} from './feedback.js?v=controls-7';
import {BRAWL,createBrawl,brawlAction,updateBrawl} from './brawl-model.js?v=controls-7';
import {drawBrawlScene} from './brawl-view.js?v=controls-7';
import {setBrawlViewport,brawlScreenPoint} from './brawl-camera.js?v=controls-7';
import {GameAudio} from './audio.js?v=cat-meows-1';
import {loadAssets} from './asset-loader.js?v=controls-7';
import {MAPS,DIFFICULTIES,difficultyKey,mapFor} from './match-options.js?v=controls-7';
import {drawCatSprite} from './cat-sprite.js?v=controls-7';
import {ActionBuffer,DirectionPad,bindDirectionPad} from './touch-controls.js?v=controls-7';
import {loadSave} from './save-store.js?v=canvas-return-1';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d'),root=$('game');
const saved=loadSave();
let color=COLORS.includes(saved.color)?saved.color:'gray',muted=!!saved.muted,best=Number(saved.best)||0,taught=!!saved.taught;
const MODES=['table','fish','jump','race','brawl'];
let mode=MODES.includes(saved.mode)?saved.mode:'brawl',fishBest=Number(saved.fishBest)||0,fishTaught=!!saved.fishTaught;
let jumpBest=Number(saved.jumpBest)||0,jumpTaught=!!saved.jumpTaught,jumpPointer=null,jumpKey=false;
let raceBest=Number(saved.raceBest)||0,raceTaught=!!saved.raceTaught,racePointer=null;
let brawlBest=Number(saved.brawlBest)||0,brawlTaught=!!saved.brawlTaught,brawlTapUntil=0,brawlTapDirection=0;
const brawlPad=new DirectionPad(),actionBuffer=new ActionBuffer(.16);
const matchSettings={race:{difficulty:difficultyKey(saved.matchSettings?.race?.difficulty),map:mapFor('race',saved.matchSettings?.race?.map).id},brawl:{difficulty:difficultyKey(saved.matchSettings?.brawl?.difficulty),map:mapFor('brawl',saved.matchSettings?.brawl?.map).id}};
const matchRecords=saved.matchRecords||{};
let screen='loading',game=null,preview='idle',previewTime=0,clock=0,last=0,width=600,height=900,ratio=1,dragging=false,camera=250,walkHeld=0;
const images={},effects=[],buttons=new Map(),audio=new GameAudio({muted,onStatus:syncSound});audio.preload();
const fxCanvas=$('feedback'),fxCtx=fxCanvas.getContext('2d'),particles=[],motion=matchMedia('(prefers-reduced-motion: reduce)'),uiAnimations=new WeakMap();
let lastRank=6,wasAir=false;
function pulse(el,kind='good'){
  if(motion.matches||!el)return;
  uiAnimations.get(el)?.cancel();
  const frames=kind==='hit'?[{translate:'0 0'},{translate:'-3px 0'},{translate:'3px 0'},{translate:'0 0'}]:[{scale:'1'},{scale:'1.1',offset:.32},{scale:'1'}];
  uiAnimations.set(el,el.animate(frames,{duration:kind==='hit'?230:290,easing:'ease-out'}));
}
function gameFeedback(e){
  if(!game)return;
  let p;
  if(mode==='race'){const r=game.racers[0];p=raceScreenPoint(game,r.x,r.lane,ratio);p.y+=r.y*.65*ratio;}
  else if(mode==='brawl')p=brawlScreenPoint(game,e.x??game.cats[0].x,e.y??game.cats[0].y);
  else if(mode==='jump')p={x:game.cat.x-game.camera,y:JUMP_BASE+game.cat.y*ratio};
  else if(mode==='fish')p={x:e.x??game.paw.x,y:projectFishY(e.y??game.paw.y,ratio)};
  else p={x:projectX(e.x??game.cat.x,camera),y:TABLE_Y+((e.y??game.cat.y)-TABLE_Y)*PLAY_ZOOM};
  const kind=['bonk','spotted','clink'].includes(e.type)?'hit':['race-boost','perfect','shield-break'].includes(e.type)?'boost':['race-lane','race-slide','jump','land'].includes(e.type)?'dust':['race-clear','grab','fish','fall','pickup'].includes(e.type)?'good':null;
  if(kind&&mode!=='brawl')particles.push(...makeBurst(kind,p.x,p.y-(kind==='dust'?0:25*ratio),{reduced:motion.matches}));
  if(['fall','fish','perfect'].includes(e.type)||(e.type==='land'&&mode==='jump'))pulse(document.querySelector('.score'));
  if(['bonk','spotted'].includes(e.type))pulse(document.querySelector('.score'),'hit');
  if(['race-clear','race-boost'].includes(e.type)){
    const n=chainState(game.racers[0].clean,game.racers[0].boost).filled;
    document.querySelectorAll('.chain-cells i').forEach((el,i)=>{if(i<n)pulse(el);});
  }
  if(e.type==='grab')pulse($('haul-value'));
  if(e.type==='brawl-hit'&&e.hurt)pulse($('brawl-health'),'hit');
}
function showResult(summary){
  audio.setScene('result');
  $('result-title').textContent=summary.title;$('result-score').textContent=summary.score;
  $('result-record').hidden=!summary.record;$('result').dataset.win=String(summary.win||summary.record);
  document.querySelector('.result-mark use').setAttribute('href',summary.win||summary.record?'#icon-cup':'#icon-paw');
  $('result-stats').replaceChildren(...summary.stats.map(([label,value])=>{
    const tile=document.createElement('div');tile.className='result-stat';const small=document.createElement('small'),b=document.createElement('b');small.textContent=label;b.textContent=value;tile.append(small,b);return tile;
  }));
  const confetti=document.querySelector('.confetti');confetti.replaceChildren();
  if((summary.win||summary.record)&&!motion.matches)for(let i=0;i<8;i++){
    const bit=document.createElement('i');bit.style.setProperty('--x',`${(i*37)%100}%`);bit.style.setProperty('--delay',`${(i%7)*.065}s`);bit.style.setProperty('--c',['#ffd45e','#80d9bb','#ff9b82','#fff8da'][i%4]);confetti.append(bit);
  }
  $('result').hidden=false;
}
function save(){try{localStorage.setItem('cat-games-v1',JSON.stringify({...saved,color,muted,best,taught,mode,fishBest,fishTaught,jumpBest,jumpTaught,raceBest,raceTaught,brawlBest,brawlTaught,matchSettings,matchRecords}))}catch{}}
const files=[...new Set(['brawl-shelf.png','brawl-kitchen.webp','item-food.png','item-shield.png','item-pepper.png','item-speed.png','title-catgames.png','room-side.webp','menu-nook.webp','race-track-vertical.webp','race-cats-back.png','race-hurdle.png','race-gate.png','jump-yard.webp','jump-grass.png','jump-spikes.png','table-side.png','kitchen-side.webp','fish-snack.png',...Object.values(FISH_PROP_ART).map(p=>p.file),...COLORS.flatMap(c=>[`cat-${c}.png`,`cat-fish-${c}.png`,`paw-round-${c}.png`]),...['mug','bottle','books','duck','cushion','popcorn'].map(p=>`${p}-side.png`),'owner-0.png','owner-1.png','owner-2.png'])];
async function load(){
  $('retry-load').hidden=true;$('loading').dataset.error='false';$('load-label').textContent='正在开门…';
  const result=await loadAssets(files,{cache:assetCache,onAsset(file,img){
    images[file.split('.')[0].replace(/-side$/,'')]=img;
    if(file===`cat-${color}.png`){const f=document.querySelector('.loading-cat-frame');f.style.backgroundImage=`url("${img.src}")`;f.classList.add('ready');}
  },onProgress(n,total){const percent=Math.round(n/total*100);$('load-value').textContent=percent+'%';$('load-fill').style.width=percent+'%';$('load-progress').setAttribute('aria-valuenow',percent);}});
  if(result.failed.length){$('load-label').textContent='没加载完，点一下重试';$('loading').dataset.error='true';$('retry-load').hidden=false;}
  else show('home');
}
const assetCache=new Map();
files.unshift(`cat-${color}.png`);
files.push('race-harbor.png','brawl-living.png',...['magnet','feather','glove','ice'].map(k=>`item-${k}.png`),...COLORS.map(c=>`side-stride-${c}.png`));
$('loading-cat').onclick=()=>{const b=$('loading-cat');b.classList.remove('petting');void b.offsetWidth;b.classList.add('petting');sound('tap');};
$('loading-cat').addEventListener('animationend',()=>$('loading-cat').classList.remove('petting'));
$('retry-load').onclick=load;
function syncHome(){document.querySelectorAll('[data-game]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.game===mode));const records={table:best,fish:fishBest,jump:jumpBest};document.querySelectorAll('[data-record]').forEach(el=>{const m=el.dataset.record,n=m==='brawl'?brawlBest:raceBest;el.textContent=['race','brawl'].includes(m)?(n?`最佳第 ${n} 名`:m==='brawl'?'6 猫混战 · 人机':'3 猫同跑 · 人机'):`纪录 ${records[m]}`;});$('start').innerHTML=`${{fish:'去偷吃',table:'开始捣蛋',jump:'出去跳一跳',race:'去跑酷',brawl:'去开打'}[mode]} <span aria-hidden="true">▶</span>`;document.querySelectorAll('.shelf-dots i').forEach((el,i)=>el.classList.toggle('current',i===MODES.indexOf(mode)));document.querySelector(`[data-game="${mode}"]`)?.scrollIntoView({block:'nearest',inline:'center',behavior:motion.matches?'instant':'smooth'});}
function clearJumpInput(){if(game&&mode==='jump')cancelJump(game);jumpPointer=null;jumpKey=false;racePointer=null;brawlPad.clear();actionBuffer.clear();brawlTapUntil=0;document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
function show(next){clearJumpInput();screen=next;audio.setScene(next);dragging=false;walkHeld=0;keys.clear();particles.length=0;for(const id of ['loading','home','picker','play'])$(id).hidden=id!==next;$('paused').hidden=true;$('result').hidden=true;if(next==='home'){syncHome();game=null;$('scene').setAttribute('aria-label','客厅里的猫猫');}if(next==='picker')previewTime=0;}
document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>{mode=b.dataset.game;syncHome();save();sound('tap');});
$('shelf-next').onclick=()=>{mode=MODES[(MODES.indexOf(mode)+1)%MODES.length];syncHome();save();sound('tap');};
function resize(){const rect=root.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(2,devicePixelRatio||1);for(const [c,context] of [[canvas,ctx],[fxCanvas,fxCtx]]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);context.setTransform(dpr*width/600,0,0,dpr*height/900,0,0);}ratio=(width/600)/(height/900);if(mode==='brawl'&&game)setBrawlViewport(game,ratio);const hit=homeLayout(ratio).hit;Object.assign($('home-cat').style,{left:`${hit.x/6}%`,top:`${hit.y/9}%`,width:`${hit.w/6}%`,height:`${hit.h/9}%`});}
new ResizeObserver(resize).observe(root);
function unlock(){audio.unlock();}
function sound(type,kind='mug'){audio.play(type,kind);}
document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);
function syncSound(){document.querySelectorAll('.sound').forEach(el=>{const blocked=audio.needsGesture,label=blocked?'开启音乐':muted?'打开声音':'关闭声音';el.dataset.blocked=String(blocked);el.setAttribute('aria-label',label);el.textContent=el.id==='sound-home'?(muted||blocked?'♪':'♫'):label;});}
document.querySelectorAll('.sound').forEach(el=>el.onclick=()=>{if(el.dataset.blocked==='true'){muted=false;audio.setMuted(false);audio.unlock();}else{muted=!muted;audio.setMuted(muted);}syncSound();save();});syncSound();
function syncPicker(){document.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.color===color));document.querySelectorAll('[data-motion]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.motion===preview));}
$('wardrobe').onclick=()=>{show('picker');syncPicker();};$('close-picker').onclick=$('select-cat').onclick=()=>{save();show('home');sound('tap');};
$('home-cat').onclick=()=>$('wardrobe').click();
document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{color=b.dataset.color;save();syncPicker();sound('tap');});
document.querySelectorAll('[data-motion]').forEach(b=>b.onclick=()=>{preview=b.dataset.motion;previewTime=0;syncPicker();sound('tap');});
function start(forceTutorial=false){
  $('match-setup').hidden=true;show('play');game=mode==='brawl'?createBrawl({color,tutorial:forceTutorial||!brawlTaught,...matchSettings.brawl,ratio}):mode==='race'?createRace({color,tutorial:forceTutorial||!raceTaught,...matchSettings.race}):mode==='jump'?createJumpGame({tutorial:forceTutorial||!jumpTaught,color}):mode==='fish'?createFishGame({tutorial:forceTutorial||!fishTaught}):createGame({tutorial:forceTutorial||!taught});
  if(mode==='brawl')document.querySelector('.brawl-meta span').textContent=mapFor(mode,game.map).name+' · '+DIFFICULTIES[game.difficulty].label;
  if(mode==='race')document.querySelector('.race-meta span').textContent='3 猫竞速 · '+DIFFICULTIES[game.difficulty].label;
  $('play').classList.toggle('brawl-mode',mode==='brawl');$('brawl-hud').hidden=mode!=='brawl';$('brawl-controls').hidden=mode!=='brawl';$('race-items').hidden=mode!=='race';
  $('play').classList.toggle('fish-mode',mode==='fish');$('play').setAttribute('aria-label',mode==='fish'?'偷吃鱼干':'桌子捣蛋');$('scene').setAttribute('aria-label',mode==='fish'?'猫猫偷吃鱼干，拖动猫爪绕开碗碟':'猫猫和桌子');
  $('play').classList.toggle('jump-mode',mode==='jump');$('jump-press').hidden=mode!=='jump';$('jump-streak').hidden=mode!=='jump';
  if(mode==='jump'){$('play').setAttribute('aria-label','小猫跳一跳');$('scene').setAttribute('aria-label','房子外的小猫跳一跳，按住蓄力松开起跳，避开尖刺');}
  $('play').classList.toggle('race-mode',mode==='race');$('race-hud').hidden=mode!=='race';$('race-controls').hidden=mode!=='race';
  if(mode==='race'){$('play').setAttribute('aria-label','猫猫跑酷赛，人机竞速');$('scene').setAttribute('aria-label','向前跑的三跑道竞速，左右滑动换道，上滑跳跃，下滑钻行');}
  if(mode==='brawl'){$('play').setAttribute('aria-label','猫咪大乱斗，人机混战');$('scene').setAttribute('aria-label',mapFor(mode,game.map).name+'，左右移动，空格跳跃，J键冲撞，S键跳下台面');}
  document.querySelector('.score small').textContent=mode==='brawl'?'剩余猫咪':mode==='race'?'当前名次':mode==='jump'?'跳跃分':mode==='fish'?'偷吃分':'捣蛋分';$('fish-paw').hidden=mode!=='fish';$('retract').hidden=mode!=='fish';
  $('fish-haul').hidden=mode!=='fish';$('fish-chances').hidden=mode!=='fish';
  if(mode==='table')camera=cameraFor(game.cat.x);walkHeld=0;effects.length=0;lastRank=mode==='race'?game.rank:6;wasAir=false;buildTargets();updateHud();
}
function openMatch(){
  if(!MAPS[mode])return start();
  const settings=matchSettings[mode];$('match-title').textContent=mode==='race'?'跑一场':'来场大乱斗';
  $('match-maps').replaceChildren(...MAPS[mode].map(m=>{const b=document.createElement('button');b.className='map-choice';b.setAttribute('aria-pressed',m.id===settings.map);b.innerHTML=`<img src="assets/${m.file}" alt=""><strong>${m.name}</strong>`;b.onclick=()=>{settings.map=m.id;save();openMatch();sound('tap');};return b;}));
  document.querySelectorAll('[data-difficulty]').forEach(b=>{b.setAttribute('aria-pressed',b.dataset.difficulty===settings.difficulty);b.onclick=()=>{settings.difficulty=b.dataset.difficulty;save();openMatch();sound('tap');};});
  const record=matchRecords[`${mode}:${settings.map}:${settings.difficulty}`];$('match-record').textContent=record?`本场地最佳 第 ${record} 名`:mode==='race'?'900 米 · 3 猫同线出发':'6 猫混战 · 上下台面';
  $('match-setup').hidden=false;
}
$('match-close').onclick=()=>$('match-setup').hidden=true;$('match-start').onclick=()=>start();
$('start').onclick=openMatch;$('learn').onclick=()=>start(true);$('replay').onclick=()=>start();
$('result-home').onclick=$('pause-home').onclick=()=>show('home');
$('pause').onclick=()=>pause();$('resume').onclick=()=>resume();
function resume(){if(!game||game.status!=='play')return;clearJumpInput();keys.clear();game.paused=false;audio.setPaused(false);$('paused').hidden=true;}
function togglePause(){if(game?.paused)resume();else pause();}
function pause(){walkHeld=0;dragging=false;keys.clear();clearJumpInput();if(game?.status==='play'){if(mode==='fish')retractPaw(game);game.paused=true;audio.setPaused(true);$('paused').hidden=false;}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();audio.setVisible(!document.hidden);});
$('skip').onclick=()=>{if(mode==='race'){game.tutorial=false;raceTaught=true;}else if(mode==='jump'){game.tutorial=false;jumpTaught=true;}else if(mode==='fish'){game.tutorial=null;fishTaught=true;}else{skipTutorial(game);taught=true;}save();updateHud();};
$('retract').onclick=()=>{if(game&&mode==='fish')retractPaw(game);};
$('hide').onclick=()=>{
  if(!game)return;
  const cover=[...COVERS].sort((a,b)=>Math.hypot(a.x-game.cat.x,a.y-game.cat.y)-Math.hypot(b.x-game.cat.x,b.y-game.cat.y))[0];hideAt(game,cover.id);
};
function buildTargets(){
  $('targets').replaceChildren();buttons.clear();
  if(mode!=='table')return;
  const names={mug:'杯子',bottle:'水瓶',books:'书本',duck:'小鸭'};
  for(const p of game.props){const b=document.createElement('button');b.className='hit-target';b.setAttribute('aria-label',`推${names[p.kind]} ${p.id+1}`);b.onclick=()=>targetProp(game,p.id);$('targets').append(b);buttons.set(p.id,b);}
  for(const c of COVERS){const b=document.createElement('button');b.className='hit-target';b.setAttribute('aria-label',c.id==='cushion'?'躲到靠垫后面':'躲到爆米花后面');b.onclick=()=>hideAt(game,c.id);$('targets').append(b);buttons.set(c.id,b);}
}
function updateTargets(){
  if(!game)return;
  for(const p of [...game.props,...COVERS]){
    const b=buttons.get(p.id),rect=targetBounds(p,camera,ratio);b.hidden=rect.hidden;
    b.style.left=`${rect.x/6}%`;b.style.top=`${rect.y/9}%`;b.style.width=`${rect.width/6}%`;b.style.height=`${rect.height/9}%`;
    b.classList.toggle('guided',game.tutorial==='push'&&p.id===0||game.tutorial==='hide'&&p.id==='popcorn');
    b.disabled=!!(game.paused||game.status!=='play'||game.tutorial==='push'&&p.id!==0||game.tutorial==='wait'||(game.tutorial==='hide'||game.cat.action==='push')&&typeof p.id==='number');
  }
}
function point(e){const r=canvas.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*600;return mode==='fish'?{x,y:unprojectFishY((e.clientY-r.top)/r.height*900,ratio)}:{x:unprojectX(x,camera),y:TABLE_Y};}
function pointerDown(e){if(screen!=='play'||!game||game.paused||mode==='brawl')return;if(mode==='race'){if(racePointer||e.button>0)return;e.preventDefault();racePointer={id:e.pointerId,x:e.clientX,y:e.clientY,acted:false};e.currentTarget.setPointerCapture(e.pointerId);return;}if(mode==='jump'){if(jumpPointer!==null||jumpKey||e.button>0)return;if(beginJump(game)){e.preventDefault();jumpPointer=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);}return;}const p=point(e);if(mode==='fish'){dragging=beginReach(game,p.x,p.y);}else{dragging=true;moveTo(game,p.x,p.y);}if(dragging){e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);}}
function pointerMove(e){if(mode==='race'){const p=racePointer;if(p?.id===e.pointerId&&!p.acted){const dx=e.clientX-p.x,dy=e.clientY-p.y;if(Math.max(Math.abs(dx),Math.abs(dy))>22){requestAction(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'slide':'jump'));p.acted=true;}}return;}if(mode==='jump')return;if(dragging&&game){const p=point(e);if(mode==='fish')aimPaw(game,p.x,p.y);else moveTo(game,p.x,p.y);}}
function pointerUp(e){if(mode==='race'){if(racePointer?.id===e.pointerId){if(e.type==='pointerup'&&!racePointer.acted)requestAction('jump');racePointer=null;}return;}if(mode==='jump'){if(e.pointerId===jumpPointer){jumpPointer=null;if(e.type==='pointerup')releaseJump(game);else cancelJump(game);}return;}if(dragging&&mode==='fish'&&game)retractPaw(game);dragging=false;}
for(const el of [canvas,$('fish-paw'),$('jump-press')]){el.addEventListener('pointerdown',pointerDown);el.addEventListener('pointermove',pointerMove);for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,pointerUp);}
$('fish-paw').onclick=e=>{if(e.detail===0&&game&&mode==='fish')beginReach(game,game.paw.x,game.paw.y);};
function controlsReady(){return screen==='play'&&game?.status==='play'&&!game.paused&&(mode==='brawl'?game.phase==='fight'&&game.cats[0].hp>0:mode==='race'&&game.phase==='run');}
function flushActions(){
  if(!controlsReady()){actionBuffer.clear();return;}
  actionBuffer.flush(clock,action=>{
    if(mode==='brawl'){
      const c=game.cats[0];if(action==='jump'&&!c.grounded&&c.coyote<=0)return false;
      return brawlAction(game,action);
    }
    if(action==='jump'&&game.racers[0].y<-.5)return false;
    return raceAction(game,action);
  });
}
function requestAction(action){
  if(!controlsReady())return;
  if(mode==='race'&&['left','right'].includes(action)){raceAction(game,action);return;}
  // Opposite vertical inputs replace each other instead of firing together on landing.
  if(['jump','slide','drop'].includes(action))for(const a of ['jump','slide','drop'])actionBuffer.pending.delete(a);
  actionBuffer.press(action,clock);flushActions();
}
for(const [id,action] of [['race-jump','jump'],['race-slide','slide'],['race-left','left'],['race-right','right'],['brawl-jump','jump'],['brawl-attack','attack'],['brawl-drop','drop']]){
  const b=$(id),owner=id.startsWith('brawl')?'brawl':'race';
  b.addEventListener('pointerdown',e=>{if(e.button>0||mode!==owner||!controlsReady())return;e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('pressed');requestAction(action);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>b.classList.remove('pressed'));
  b.addEventListener('pointercancel',()=>actionBuffer.pending.delete(action));
  b.onclick=e=>{if(e.detail===0&&mode===owner)requestAction(action);};
}
for(const id of ['brawl-controls','race-controls'])$(id).addEventListener('contextmenu',e=>e.preventDefault());
bindDirectionPad($('brawl-move-pad'),brawlPad,{enabled:()=>mode==='brawl'&&controlsReady(),onChange:dir=>{
  $('brawl-left').classList.toggle('pressed',dir<0);$('brawl-right').classList.toggle('pressed',dir>0);
}});
for(const [id,direction] of [['brawl-left',-1],['brawl-right',1]]){
  $(id).onclick=e=>{if(e.detail===0&&mode==='brawl'&&controlsReady()){brawlTapDirection=direction;brawlTapUntil=clock+.22;}};
}
const keys=new Set();document.addEventListener('keydown',e=>{
  if(screen!=='play'||!game)return;
  if(e.key==='Escape'){e.preventDefault();if(!e.repeat)togglePause();return;}
  if(mode==='brawl'){
    const key=e.key.toLowerCase();if(['a','d','w','s','j','k',' ','arrowleft','arrowright','arrowup','arrowdown'].includes(key))e.preventDefault();
    if(!game.paused){keys.add(key);if(!e.repeat){if([' ','w','k','arrowup'].includes(key))requestAction('jump');if(key==='j')requestAction('attack');if(['s','arrowdown'].includes(key))requestAction('drop');}}return;
  }
  if(mode==='race'){
    const key=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright','w','s','a','d'].includes(key))e.preventDefault();
    if(!e.repeat){if([' ','arrowup','w'].includes(key))requestAction('jump');if(['arrowdown','s'].includes(key))requestAction('slide');if(['arrowleft','a'].includes(key))requestAction('left');if(['arrowright','d'].includes(key))requestAction('right');}return;
  }
  if(mode==='jump'){
    if([' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','Escape'].includes(e.key))e.preventDefault();
    if(e.key==='Escape')pause();
    if(e.key===' '&&!e.repeat&&!jumpKey&&jumpPointer===null&&!game.paused)jumpKey=beginJump(game);
    return;
  }
  if(mode==='fish'){
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s',' ','e','Escape'].includes(e.key)){e.preventDefault();keys.add(e.key);}
    if(e.key==='Escape')pause();else if(e.key===' '||e.key==='e')retractPaw(game);
    else if(!game.paused)beginReach(game,game.paw.x,game.paw.y);return;
  }
  if(['ArrowLeft','ArrowRight',' ','a','d','e','Escape'].includes(e.key)){e.preventDefault();keys.add(e.key);}
  if(e.key==='Escape')pause();
  if(e.repeat)return;
  if(e.key==='e')$('hide').click();
  if(e.key===' '){const p=game.props.filter(p=>!p.gone).sort((a,b)=>Math.hypot(a.x-game.cat.x,a.y-game.cat.y)-Math.hypot(b.x-game.cat.x,b.y-game.cat.y))[0];if(p)targetProp(game,p.id);}
});document.addEventListener('keyup',e=>{keys.delete(e.key);keys.delete(e.key.toLowerCase());if(e.key===' '&&jumpKey){e.preventDefault();jumpKey=false;if(game&&mode==='jump')releaseJump(game);}});window.addEventListener('blur',()=>{keys.clear();walkHeld=0;clearJumpInput();});
for(const [id,direction] of [['move-left',-1],['move-right',1]]){
  const b=$(id);b.addEventListener('pointerdown',e=>{walkHeld=direction;b.setPointerCapture(e.pointerId);if(game)moveTo(game,game.cat.x+direction*35,TABLE_Y);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>walkHeld=0);
  b.addEventListener('click',()=>{if(game)moveTo(game,game.cat.x+direction*55,TABLE_Y);});
}
function updateHud(){
  if(!game)return;const s=game;
  if(mode==='brawl'){
    const c=s.cats[0],alive=s.cats.filter(c=>c.hp>0).length;
    $('score').textContent=`${alive} 只`;$('time').textContent=Math.ceil(s.remaining);$('time').parentElement.classList.toggle('urgent',s.remaining<15);
    $('attention').hidden=true;$('skip').hidden=true;$('brawl-health-text').textContent=`${Math.ceil(c.hp)} / 100`;
    const hp=$('brawl-health');hp.setAttribute('aria-valuenow',Math.ceil(c.hp));hp.querySelector('i').style.width=`${c.hp}%`;hp.classList.toggle('low',c.hp<35);
    document.querySelectorAll('[data-brawl-buff]').forEach(el=>{const t=c[el.dataset.brawlBuff];el.hidden=t<=0;el.querySelector('b').textContent=`${Math.ceil(t)}s`;});
    for(const id of ['brawl-left','brawl-right','brawl-jump','brawl-drop','brawl-attack'])$(id).disabled=s.phase!=='fight'||s.paused||s.status!=='play'||c.hp<=0;
    $('brawl-drop').disabled||=!c.grounded||c.surface===0;
    const attack=$('brawl-attack'),cooldown=attack.querySelector('.cooldown-label');
    attack.classList.toggle('cooling',c.cooldown>0);attack.style.setProperty('--ready',1-Math.min(1,c.cooldown/(c.glove>0?.78:BRAWL.cooldown)));
    cooldown.hidden=c.cooldown<=0;cooldown.textContent=c.cooldown>0?c.cooldown.toFixed(1):'';
    $('brawl-left').classList.toggle('active',c.dir<0);$('brawl-right').classList.toggle('active',c.dir>0);$('brawl-attack').classList.toggle('active',c.attack>0);
    $('tip').hidden=!s.tutorial||s.time>8;$('tip').textContent='跳上台面 · 再跳登高 · ↓ 跳下';
    if(s.time>8&&!brawlTaught){brawlTaught=true;save();}return;
  }
  if(mode==='race'){
    const r=s.racers[0];$('score').textContent=`${s.rank}/3`;$('attention').hidden=true;
    if(s.rank<lastRank&&s.phase==='run')pulse(document.querySelector('.score'));lastRank=s.rank;
    $('race-distance').textContent=`${Math.max(0,Math.round((RACE.finish-r.x)/20))} 米`;
    $('race-clean').textContent=r.boost>0?'冲刺中':`${r.clean%3} / 3`;$('race-clean').classList.toggle('boosting',r.boost>0);
    const chain=chainState(r.clean,r.boost);document.querySelector('.race-chain').classList.toggle('boosting',chain.boosting);
    document.querySelectorAll('.chain-cells i').forEach((el,i)=>el.classList.toggle('filled',i<chain.filled));
    $('race-progress').style.setProperty('--progress',r.x/RACE.finish);
    document.querySelectorAll('[data-race-buff]').forEach(el=>{const t=r[el.dataset.raceBuff];el.hidden=t<=0;el.querySelector('b').textContent=`${Math.ceil(t)}s`;});
    document.querySelectorAll('[data-racer]').forEach((el,i)=>{const runner=s.racers[i];el.style.left=`${Math.min(98,runner.x/RACE.finish*100)}%`;el.style.setProperty('--fur',({gray:'#b3ada5',orange:'#ffb653',cream:'#fff2cf',black:'#48474d'})[runner.color]);el.setAttribute('aria-label',`${i?'电脑猫':'你'}：${Math.round(runner.x/RACE.finish*100)}%`);});
    for(const id of ['race-jump','race-slide','race-left','race-right'])$(id).disabled=s.phase!=='run'||s.paused||s.status!=='play'||(id==='race-left'&&r.laneTarget===0)||(id==='race-right'&&r.laneTarget===2);
    $('race-slide').classList.toggle('active',r.slide>0);$('race-jump').classList.toggle('active',r.y<0);
    $('tip').hidden=!s.tutorial||s.time>9;$('tip').textContent='左右换道 · 上跳下钻';$('skip').hidden=true;return;
  }
  if(mode==='jump'){
    $('score').textContent=s.score;$('attention').hidden=true;$('skip').hidden=!s.tutorial;
    $('tip').hidden=!s.tutorial;$('tip').textContent=s.phase==='charge'?'松手起跳':'按住蓄力 · 松手起跳';
    $('jump-streak').textContent=`${Math.max(0,Math.floor((s.cat.x-140)/20))} 米`;$('jump-streak').classList.toggle('hot',s.streak>2);
    const b=$('jump-press');b.textContent=s.phase==='charge'?'松手起跳':s.phase==='air'?'起跳中':s.phase==='dead'?'没站稳':'按住蓄力';b.classList.toggle('charging',s.phase==='charge');b.style.setProperty('--charge',s.charge/JUMP.chargeTime);b.disabled=s.paused||s.phase==='air'||s.phase==='dead'||s.status!=='play';return;
  }
  const o=s.owner,copy=mode==='fish'?fishHudCopy(s):hudCopy(s);
  $('score').textContent=s.score;$('time').textContent=Math.ceil(s.time);$('time').parentElement.classList.toggle('urgent',s.time<15);
  $('progress').textContent=mode==='fish'?`${s.caught} / ${FISH_GOAL}`:`${s.falls} / ${s.props.length}`;$('suspicion').style.width=`${o.suspicion}%`;$('suspicion').parentElement.setAttribute('aria-valuenow',Math.round(o.suspicion));
  $('owner-label').textContent=copy.alert;$('attention').hidden=!copy.alertVisible;
  $('owner-label').parentElement.classList.toggle('warning',o.phase==='warning');$('owner-label').parentElement.classList.toggle('danger',o.seen);
  $('tip').textContent=copy.tip;$('tip').hidden=!copy.tip;
  if(mode==='fish'){
    const b=$('fish-paw');b.style.left=`${s.paw.x/6}%`;b.style.top=`${projectFishY(s.paw.y,ratio)/9}%`;b.classList.toggle('guided',s.tutorial==='reach');
    b.disabled=s.paused||s.status!=='play'||s.paw.returning;$('retract').disabled=fishHidden(s)||s.paused||s.paw.returning;$('skip').hidden=!s.tutorial;
    const count=s.paw.bag.length,value=haulValue(s);$('fish-haul').hidden=!!s.tutorial;
    $('haul-value').textContent=count?`+${value}`:`0 / ${FISH_CAPACITY}`;
    $('fish-haul').setAttribute('aria-label',`手里 ${count} 条，带回可得 ${value} 分`);
    document.querySelectorAll('.haul-slots img').forEach((img,i)=>img.classList.toggle('filled',i<count));
    $('fish-haul').classList.toggle('full',count===FISH_CAPACITY);
    $('retract').textContent=count?`带回 ${count} 条 ↶`:'收爪 ↶';
    $('fish-chances').setAttribute('aria-label',`剩余 ${FISH_CHANCES-s.mistakes} 次机会`);
    document.querySelectorAll('#fish-chances i').forEach((el,i)=>el.classList.toggle('lost',i<s.mistakes));return;
  }
  $('skip').hidden=!s.tutorial;$('hide').disabled=s.tutorial==='push'||s.tutorial==='wait';
  $('hide').textContent=s.cat.hidden?'已藏好':'躲起来';$('route-dot').style.left=`${s.cat.x/WORLD_WIDTH*100}%`;updateTargets();
}
function sprite(img,x,y,w,rotation=0,alpha=1){if(!img)return;const h=w*img.height/img.width;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(1,ratio);ctx.rotate(rotation);ctx.drawImage(img,-w/2,-h,w,h);ctx.restore();}
function catSprite(x,y,w,frame,facing=1){drawCatSprite(ctx,images,color,x,y,w,frame,facing,ratio);}
function shadow(x,y,w){ctx.fillStyle='#75532926';ctx.beginPath();ctx.ellipse(x,y,w,w*.22*ratio,0,0,Math.PI*2);ctx.fill();}
function table(x,y,w){const img=images.table;if(img)ctx.drawImage(img,x,y,w,w*img.height/img.width*ratio);}
function drawScene(dt){
  ctx.clearRect(0,0,600,900);if(!images.room)return;ctx.drawImage(images.room,0,0,600,900);
  if(screen==='loading')return;
  if(screen==='home'){drawHomeScene(ctx,{images,catSprite,ratio,clock});return;}
  if(screen==='play'&&mode==='brawl'){drawBrawlScene(ctx,game,{images,ratio,reduced:motion.matches});return;}
  if(screen==='play'&&mode==='race'){drawRaceScene(ctx,game,{images,ratio,reduced:motion.matches});return;}
  if(screen==='play'&&mode==='jump'){drawJumpScene(ctx,game,{images,ratio,color,clock});return;}
  if(sceneFor(screen,mode)==='kitchen'){drawFishScene(ctx,game,{images,sprite,catSprite,ratio,clock,color,effects});return;}
  if(screen==='picker'){
    const t=previewTime;let f=frameFor(preview,t),x=315;
    if(preview==='push')f=frameFor('push',t%1.8);
    if(preview==='hide'){const phase=t%3.7;f=phase<1.8?frameFor('hide',phase):frameFor('rise',phase-1.8);}
    if(preview==='walk')x+=Math.sin(t*.9)*30;
    table(35,530,530);catSprite(x,530,315,f);
  }else if(game){
    const o=game.owner;
    if(o.phase==='look'||o.phase==='warning'){
      const gaze=gazeFor(game);
      ctx.save();ctx.globalAlpha=o.phase==='warning'?.07:.17;ctx.fillStyle=o.seen?'#ff482f':'#fff8bd';ctx.beginPath();ctx.moveTo(300,330);ctx.lineTo(projectX(gaze.x-gaze.radius,camera),TABLE_Y);ctx.lineTo(projectX(gaze.x+gaze.radius,camera),TABLE_Y);ctx.closePath();ctx.fill();ctx.restore();
    }
    sprite(images[`owner-${o.phase==='away'?0:o.phase==='warning'?1:2}`],300,430,145);
    if(o.phase==='warning'){ctx.font='900 35px sans-serif';ctx.fillStyle='#fff6bb';ctx.strokeStyle='#353229';ctx.lineWidth=4;ctx.strokeText('!',380,315);ctx.fillText('!',380,315);}
    ctx.save();ctx.translate(-camera*PLAY_ZOOM,TABLE_Y);ctx.scale(PLAY_ZOOM,PLAY_ZOOM);ctx.translate(0,-TABLE_Y);table(50,TABLE_Y,1000);
    const all=[...game.props.filter(p=>!p.gone||p.fall<DROP_DURATION).map(p=>({type:'prop',...p})),{type:'cat',...game.cat},...COVERS.map(c=>({type:'cover',...c}))];
    for(const item of all){
      if(item.type==='cat'){catSprite(item.x,item.y,140,frameFor(item.action,item.anim),item.facing);}
      else if(item.type==='cover'){sprite(images[item.id],item.x,item.y,item.id==='cushion'?112:80);}
      else{
        const pose=propPose(item);
        sprite(images[item.kind],pose.x,pose.y,item.kind==='books'?49:46,0,pose.alpha);
      }
    }
    for(const e of effects){
      ctx.save();ctx.globalAlpha=Math.max(0,1-e.age/e.life);ctx.translate(e.x+e.vx*e.age,e.y+e.vy*e.age+80*e.age*e.age);
      if(e.text){ctx.font='900 25px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#775237';ctx.fillStyle='#fff9cf';ctx.strokeText(e.text,0,0);ctx.fillText(e.text,0,0);}
      else{ctx.rotate(e.age*4);ctx.fillStyle=e.color;ctx.beginPath();for(let n=0;n<8;n++){const a=n*Math.PI/4,r=n%2?3:8;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(!n)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();}ctx.restore();
    }
    ctx.restore();
  }
}
function handleEvents(){for(const e of game.events.splice(0)){
  sound(e.type,e.count??e.kind??e.result);
  gameFeedback(e);
  if(e.type==='fall'){
    effects.push({text:`+${e.score}`,x:e.x,y:e.y-35,vx:0,vy:-95,age:0,life:.85});
  }
  if(e.type==='fish')effects.push({text:`+${e.score}`,x:e.x,y:e.y-60,vx:0,vy:-75,age:0,life:.8});
  if(e.type==='grab'&&e.count>1)effects.push({text:`${e.count}连偷`,x:e.x,y:e.y-55,vx:0,vy:-40,age:0,life:.65});
  if(e.type==='spotted')effects.push({text:e.lost?`掉了${e.lost}条`:'被瞧见了',x:e.x+30,y:e.y,vx:0,vy:-35,age:0,life:.8});
  if(e.type==='clink')effects.push({text:'!',x:e.x,y:e.y-15,vx:0,vy:-30,age:0,life:.45});
  if(e.type==='learned'){if(mode==='race')raceTaught=true;else if(mode==='jump')jumpTaught=true;else if(mode==='fish')fishTaught=true;else taught=true;save();}
  if(e.type==='end'){
    const recordKey=`${mode}:${game.map}:${game.difficulty}`;
    const summary=resultSummary(mode,game,MAPS[mode]?(matchRecords[recordKey]||0):{jump:jumpBest,fish:fishBest,table:best}[mode],e.result);
    if(MAPS[mode])matchRecords[recordKey]=matchRecords[recordKey]?Math.min(matchRecords[recordKey],game.rank):game.rank;
    if(mode==='brawl')brawlBest=brawlBest?Math.min(brawlBest,game.rank):game.rank;
    else if(mode==='race')raceBest=raceBest?Math.min(raceBest,game.rank):game.rank;
    else if(mode==='jump')jumpBest=Math.max(jumpBest,game.score);
    else if(mode==='fish')fishBest=Math.max(fishBest,game.score);
    else best=Math.max(best,game.score);
    save();showResult(summary);
  }
}}
function loop(now){
  const dt=Math.min(.04,(now-last)/1000||0);last=now;clock+=dt;previewTime+=dt;
  if(game&&screen==='play'&&!game.paused){
    if(mode==='brawl'){
      const dx=(keys.has('d')||keys.has('arrowright')||brawlPad.value>0?1:0)-(keys.has('a')||keys.has('arrowleft')||brawlPad.value<0?1:0);
      updateBrawl(game,dt,dx||(clock<brawlTapUntil?brawlTapDirection:0));
    }else if(mode==='race'){updateRace(game,dt);}else if(mode==='jump'){updateJump(game,dt);}else if(mode==='fish'){
      const dx=(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0),dy=(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0);
      if(dx||dy)aimPaw(game,game.paw.x+dx*650*dt,game.paw.y+dy*650*dt);updateFish(game,dt);
    }else{if(!game.tutorial){const dx=walkHeld||(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0);if(dx)moveTo(game,game.cat.x+dx*35,TABLE_Y);}update(game,dt);camera+=(cameraFor(game.cat.x)-camera)*(1-Math.exp(-9*dt));}
    if(mode==='brawl'||mode==='race')flushActions();
    handleEvents();effects.forEach(e=>e.age+=dt);for(let i=effects.length-1;i>=0;i--)if(effects[i].age>=effects[i].life)effects.splice(i,1);updateHud();
  }
  if(!game?.paused)tickParticles(particles,dt);
  drawScene(dt);fxCtx.clearRect(0,0,600,900);if(screen==='play')drawParticles(fxCtx,particles,ratio);requestAnimationFrame(loop);
}
resize();audio.unlock();load();requestAnimationFrame(loop);
