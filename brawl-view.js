import {BRAWL,attackPhase} from './brawl-model.js?v=room-6';
import {drawItem} from './item-view.js?v=room-6';
import {drawWorldFX,drawDashRibbon} from './brawl-fx.js?v=room-6';
import {frameFor} from './model.js?v=room-6';
import {mapFor} from './match-options.js?v=room-6';
import {drawCatSprite} from './cat-sprite.js?v=room-6';
import {BRAWL_ROOM,BRAWL_BASE,brawlScreenPoint} from './brawl-camera.js?v=room-6';
export {BRAWL_BASE};
const ink='#40392e';
function label(ctx,t,x,y,size,color='#fff8d7'){
  ctx.font=`900 ${size}px "PingFang SC",sans-serif`;ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle=ink;ctx.fillStyle=color;ctx.strokeText(t,x,y);ctx.fillText(t,x,y);
}
export function brawlFrame(c){
  if(c.hp<=0)return 15;
  if(c.stun>0)return 2;
  const p=attackPhase(c);if(p==='windup')return 14;if(p==='dash')return 19;
  if(!c.grounded)return c.vy<0?24:25;if(c.land>0)return 26;
  return Math.abs(c.vx)>25?frameFor('walk',c.anim):frameFor('idle',c.anim);
}
function cat(ctx,c,images,ratio,reduced){
  const img=images[`cat-${c.color}`];if(!img)return;
  const w=140,k=w/360,frame=brawlFrame(c),phase=attackPhase(c);
  ctx.save();ctx.translate(c.x,c.y);ctx.scale(c.facing,1);
  if(c.hp<=0){ctx.globalAlpha=Math.max(.15,1-c.deadTime*1.8);ctx.rotate(.2);}
  if(phase==='dash'&&!reduced)drawDashRibbon(ctx,1-(c.attack-BRAWL.recovery)/BRAWL.active,c.power>0);
  if(!reduced){
    if(c.stun>0){ctx.rotate(-.16*(c.stun/.15));ctx.translate(-5,0);}
    else if(phase==='windup'){const t=1-(c.attack-BRAWL.active-BRAWL.recovery)/BRAWL.windup;ctx.translate(-8*t,0);ctx.rotate(-.06*t);}
    else if(phase==='dash')ctx.rotate(.08);
  }
  drawCatSprite(ctx,images,c.color,0,0,w,frame);
  if(c.flash>0&&!reduced){ctx.save();ctx.globalAlpha=c.flash/.16*.55;ctx.globalCompositeOperation='screen';drawCatSprite(ctx,images,c.color,0,0,w,frame);ctx.restore();}
  if(c.chilled>0){ctx.strokeStyle='#80dff4';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-25,-5);ctx.lineTo(-11,-13);ctx.lineTo(0,-4);ctx.lineTo(13,-13);ctx.lineTo(27,-5);ctx.stroke();}
  if(phase==='windup'){ctx.strokeStyle=c.id===0?'#ffe7a7':'#edb197';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-61,-59);ctx.lineTo(-72,-64);ctx.moveTo(-66,-42);ctx.lineTo(-78,-42);ctx.stroke();}
  if(c.power>0){ctx.strokeStyle='#ee835b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-18,-3);ctx.quadraticCurveTo(10,5,32,-4);ctx.stroke();}
  ctx.restore();
  if(c.hp>0){
    ctx.fillStyle='#544933';ctx.beginPath();ctx.roundRect(c.x-28,c.y-130,56,9,4);ctx.fill();ctx.fillStyle=c.id===0?'#7dd7ad':'#ed9c87';ctx.beginPath();ctx.roundRect(c.x-26,c.y-128,52*c.hp/100,5,2);ctx.fill();
    if(c.id===0){label(ctx,'你',c.x,c.y-142,16,'#fff6ca');ctx.strokeStyle='#ffd466';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(c.x,c.y+4,33,7,0,0,Math.PI*2);ctx.stroke();}
    if(c.shield>0){ctx.strokeStyle='#a2ecfff0';ctx.fillStyle='#83dff318';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(c.x,c.y-53,57,68,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#ffffffbe';ctx.beginPath();ctx.ellipse(c.x,c.y-53,51,61,0,-2.5,-1.6);ctx.stroke();}
  }
}
export function drawBrawlScene(ctx,s,{images,ratio,reduced=false}){
  ctx.fillStyle='#a7e9cf';ctx.fillRect(0,0,600,900);
  const view=s.viewport,zoom=view?.zoom||1;
  ctx.save();ctx.translate(-s.camera*zoom,BRAWL_BASE-(s.cameraY||0)*ratio*zoom);ctx.scale(zoom,ratio*zoom);
  const bg=images[mapFor('brawl',s.map).art];if(bg){
    // Edge-clamped wall continuation matches each source column (including the
    // cooker vent) exactly. Never stretch the furniture or append a mismatched fill.
    ctx.drawImage(bg,0,0,bg.width,1,BRAWL_ROOM.left,BRAWL_ROOM.top,BRAWL_ROOM.width,BRAWL_ROOM.artTop-BRAWL_ROOM.top+1);
    ctx.drawImage(bg,BRAWL_ROOM.left,BRAWL_ROOM.artTop,BRAWL_ROOM.width,BRAWL_ROOM.artHeight);
  }
  const shelf=images['brawl-shelf'];
  if(shelf)for(const p of s.counters.filter(p=>p.shelf)){const w=p.right-p.left;ctx.drawImage(shelf,p.left,p.y,w,w*shelf.height/shelf.width);}
  // A subtle lip makes the existing cupboard/window tops read as walkable ledges.
  ctx.lineCap='round';ctx.lineWidth=3;ctx.strokeStyle='#fff5caaa';
  for(const p of s.counters.filter(p=>!p.shelf&&p.id!=='counter')){ctx.beginPath();ctx.moveTo(p.left+12,p.y+4);ctx.lineTo(p.right-12,p.y+4);ctx.stroke();}
  const right=s.camera+(view?.width||600);
  for(const item of s.items)if(!item.taken&&item.x>s.camera-70&&item.x<right+70)drawItem(ctx,images,item.kind,item.x,item.y,54,s.age,1);
  for(const c of s.cats){if(c.hp<=0&&c.deadTime>.6)continue;const p=s.surfaces.filter(p=>c.x>p.left&&c.x<p.right&&p.y>=c.y-2).sort((a,b)=>a.y-b.y)[0];const ground=p?.y||0;ctx.fillStyle='#3d674c24';ctx.globalAlpha=Math.max(.15,1-(ground-c.y)/400);ctx.beginPath();ctx.ellipse(c.x,ground,30,6,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  // The player is not hidden behind a bot occupying the same lane.
  for(const c of [...s.cats.slice(1),s.cats[0]])if(c.x>s.camera-150&&c.x<right+150&&(c.hp>0||c.deadTime<.6))cat(ctx,c,images,ratio,reduced);
  for(const f of s.fx)drawWorldFX(ctx,f,reduced,f.owner!==undefined?s.cats[f.owner]:null);ctx.restore();
  if(s.phase==='countdown'){
    ctx.save();ctx.translate(300,355);ctx.scale(1,ratio);ctx.fillStyle='#fff9e9ee';ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,55,0,Math.PI*2);ctx.fill();ctx.stroke();label(ctx,String(Math.ceil(s.countdown)),0,23,65,'#ffda72');ctx.restore();
  }
  const off=s.cats.filter(c=>c.id&&c.hp>0).map(c=>brawlScreenPoint(s,c.x,c.y).x);
  for(const side of [-1,1]){const count=off.filter(x=>side<0?x<20:x>580).length;if(count)label(ctx,side<0?`‹ ${count}`:`${count} ›`,side<0?31:569,570,18);}
}
