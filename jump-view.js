import {JUMP} from './jump-model.js?v=room-6';
import {CAT_ART,jumpFrame} from './jump-art.js?v=room-6';
export {jumpFrame} from './jump-art.js?v=room-6';
export const JUMP_BASE=596;
function star(ctx,x,y,r,color){ctx.fillStyle=color;ctx.beginPath();for(let n=0;n<8;n++){const a=n*Math.PI/4,rr=n%2?r*.35:r;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}ctx.closePath();ctx.fill();}
export function drawJumpScene(ctx,s,{images,ratio,color,clock}){
  if(!s)return;
  const yard=images['jump-yard'],grass=images['jump-grass'],spikes=images['jump-spikes'];
  ctx.fillStyle='#8ddcf6';ctx.fillRect(0,0,600,900);
  if(yard){
    // Uniform image scale: a separate, slow background layer, not stretched scenery.
    const w=1100,h=w*yard.height/yard.width*ratio,y=470-h*.60;
    const x=-((s.camera*.16)%w)-110;
    ctx.fillStyle='#8fda7e';ctx.fillRect(0,y+h-2,600,900-y-h+2);
    for(let i=0;i<2;i++)ctx.drawImage(yard,x+i*w,y,w,h);
  }
  ctx.save();ctx.translate(0,JUMP_BASE);ctx.scale(1,ratio);ctx.translate(-s.camera,0);
  if(grass){
    const w=1050,h=w*grass.height/grass.width,start=Math.floor(s.camera/w)*w;
    ctx.fillStyle='#8dce50';ctx.fillRect(s.camera,h-18,600,900/ratio);
    for(let i=-1;i<2;i++)ctx.drawImage(grass,start+i*w,-14,w,h);
  }
  for(const b of s.hazards){
    if(b.x+b.w/2<s.camera-100||b.x-b.w/2>s.camera+700)continue;
    if(spikes){const w=JUMP.spikeWidth,h=JUMP.spikeHeight;for(let n=0;n<b.count;n++)ctx.drawImage(spikes,b.x-b.w/2+n*w,b.y-h,w,h);}
  }
  const c=s.cat,img=images[`cat-${s.color||color}`],w=CAT_ART.width,scale=w/CAT_ART.frameWidth,frame=jumpFrame(s);
  if(s.phase==='air'){
    ctx.fillStyle='#ffffff80';for(let i=1;i<=3;i++){ctx.beginPath();ctx.arc(c.x-i*17,c.y-55+i*5,5-i,0,Math.PI*2);ctx.fill();}
  }
  if(img){
    ctx.save();ctx.translate(c.x,c.y);if(s.phase==='dead')ctx.rotate(-Math.min(.7,s.deathTime)*1.5);
    ctx.drawImage(img,frame%4*CAT_ART.frameWidth,Math.floor(frame/4)*CAT_ART.frameHeight,CAT_ART.frameWidth,CAT_ART.frameHeight,-CAT_ART.anchorX*scale,-CAT_ART.anchorY*scale,w,CAT_ART.frameHeight*scale);ctx.restore();
  }
  if(s.phase==='charge'){
    const q=s.charge/JUMP.chargeTime;
    ctx.strokeStyle='#353229';ctx.lineWidth=3;ctx.fillStyle='#fff9e9';ctx.beginPath();ctx.roundRect(c.x-47,c.y+20,94,13,7);ctx.fill();ctx.stroke();
    ctx.fillStyle=q>.9?'#ffb651':'#67cdb0';ctx.beginPath();ctx.roundRect(c.x-44,c.y+23,Math.max(2,88*q),7,4);ctx.fill();
    if(q===1){star(ctx,c.x+61,c.y-30,7,'#ffde61');}
  }
  for(const e of s.fx){
    const t=e.age/e.life;ctx.save();ctx.globalAlpha=1-t;
    if(e.type!=='oops'){
      ctx.strokeStyle=e.type==='perfect'?'#ffeb91':'#ffffff';ctx.lineWidth=4*(1-t);ctx.beginPath();ctx.ellipse(e.x,e.y+3,15+t*65,5+t*14,0,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<(e.type==='perfect'?8:4);i++){const a=i*Math.PI/4;star(ctx,e.x+Math.cos(a)*t*95,e.y-30+Math.sin(a)*t*60,7*(1-t),i%2?'#fff9de':'#ffd75b');}
    }
    ctx.font=`900 ${e.type==='perfect'?31:27}px sans-serif`;ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#624e38';ctx.fillStyle='#fff6bc';
    const label=e.type==='oops'?'!':e.type==='perfect'?`一跃 ${e.count} 组 +${e.points}`:`+${e.points}`;
    const y=e.y-(e.type==='oops'?0:120)-e.age*40;ctx.strokeText(label,e.x,y);ctx.fillText(label,e.x,y);ctx.restore();
  }
  ctx.restore();
}
