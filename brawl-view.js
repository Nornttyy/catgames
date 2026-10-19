import {BRAWL,COUNTERS,SURFACES,attackPhase} from './brawl-model.js?v=feedback-audio-1';
import {drawItem} from './item-view.js';
import {drawWorldFX,drawDashRibbon} from './brawl-fx.js?v=feedback-audio-1';
export const BRAWL_BASE=700;
const ink='#40392e';
function label(ctx,t,x,y,size,color='#fff8d7'){
  ctx.font=`900 ${size}px "PingFang SC",sans-serif`;ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle=ink;ctx.fillStyle=color;ctx.strokeText(t,x,y);ctx.fillText(t,x,y);
}
export function brawlFrame(c){
  if(c.hp<=0)return 15;
  if(c.stun>0)return 2;
  const p=attackPhase(c);if(p==='windup')return 14;if(p==='dash')return 7;
  if(!c.grounded)return 6;if(c.land>0)return 14;
  return Math.abs(c.vx)>25?4+Math.floor(c.anim*12)%4:Math.floor(c.anim*2)%4;
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
  ctx.drawImage(img,frame%4*360,Math.floor(frame/4)*310,360,310,-215*k,-290*k,w,310*k);
  if(c.flash>0&&!reduced){ctx.save();ctx.globalAlpha=c.flash/.16*.55;ctx.globalCompositeOperation='screen';ctx.drawImage(img,frame%4*360,Math.floor(frame/4)*310,360,310,-215*k,-290*k,w,310*k);ctx.restore();}
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
  ctx.save();ctx.translate(-s.camera,BRAWL_BASE-(s.cameraY||0)*ratio);ctx.scale(1,ratio);
  const bg=images['brawl-kitchen'];if(bg){const h=BRAWL.width*bg.height/bg.width;ctx.drawImage(bg,0,-h*.79,BRAWL.width,h);ctx.fillStyle='#a2e8e0';ctx.fillRect(0,h*.21-1,BRAWL.width,900);}
  const shelf=images['brawl-shelf'];
  if(shelf)for(const p of COUNTERS.filter(p=>p.shelf)){const w=p.right-p.left;ctx.drawImage(shelf,p.left,p.y,w,w*shelf.height/shelf.width);}
  // A subtle lip makes the existing cupboard/window tops read as walkable ledges.
  ctx.lineCap='round';ctx.lineWidth=3;ctx.strokeStyle='#fff5caaa';
  for(const p of COUNTERS.filter(p=>!p.shelf&&p.id!=='counter')){ctx.beginPath();ctx.moveTo(p.left+12,p.y+4);ctx.lineTo(p.right-12,p.y+4);ctx.stroke();}
  for(const item of s.items)if(!item.taken&&item.x>s.camera-70&&item.x<s.camera+670)drawItem(ctx,images,item.kind,item.x,item.y,54,s.age,1);
  for(const c of s.cats){if(c.hp<=0&&c.deadTime>.6)continue;const p=SURFACES.filter(p=>c.x>p.left&&c.x<p.right&&p.y>=c.y-2).sort((a,b)=>a.y-b.y)[0];const ground=p?.y||0;ctx.fillStyle='#3d674c24';ctx.globalAlpha=Math.max(.15,1-(ground-c.y)/400);ctx.beginPath();ctx.ellipse(c.x,ground,30,6,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  // The player is not hidden behind a bot occupying the same lane.
  for(const c of [...s.cats.slice(1),s.cats[0]])if(c.x>s.camera-150&&c.x<s.camera+750&&(c.hp>0||c.deadTime<.6))cat(ctx,c,images,ratio,reduced);
  for(const f of s.fx)drawWorldFX(ctx,f,reduced,f.owner!==undefined?s.cats[f.owner]:null);ctx.restore();
  if(s.phase==='countdown'){
    ctx.save();ctx.translate(300,355);ctx.scale(1,ratio);ctx.fillStyle='#fff9e9ee';ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,55,0,Math.PI*2);ctx.fill();ctx.stroke();label(ctx,String(Math.ceil(s.countdown)),0,23,65,'#ffda72');ctx.restore();
  }
  const off=s.cats.filter(c=>c.id&&c.hp>0&&(c.x<s.camera+20||c.x>s.camera+580));
  for(const side of [-1,1]){const count=off.filter(c=>side<0?c.x<s.camera+20:c.x>s.camera+580).length;if(count)label(ctx,side<0?`‹ ${count}`:`${count} ›`,side<0?31:569,570,18);}
}
