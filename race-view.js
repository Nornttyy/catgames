import {RACE,raceFrame} from './race-model.js';
import {drawItem} from './item-view.js';
const ink='#353229',colors=['gray','orange','cream','black'];
export const RACE_VIEW={anchor:680,forwardScale:.8,catSize:152};
const laneX=lane=>300+(lane-1)*RACE.laneWidth;
function text(ctx,value,x,y,size,color='#fff9e9'){
  ctx.font=`900 ${size}px "PingFang SC",sans-serif`;ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=5;ctx.strokeStyle=ink;ctx.fillStyle=color;ctx.strokeText(value,x,y);ctx.fillText(value,x,y);
}
export function raceScreenPoint(s,distance,lane,ratio=1){
  return {x:laneX(lane),y:RACE_VIEW.anchor-(distance-s.camera)*RACE_VIEW.forwardScale*ratio};
}
function drawCat(ctx,s,r,images,ratio){
  const img=images['race-cats-back'];if(!img)return;
  const {x,y}=raceScreenPoint(s,r.x,r.lane,ratio),frame=raceFrame(r,s.phase),row=Math.max(0,colors.indexOf(r.color));
  const size=RACE_VIEW.catSize,jump=r.y*.65*ratio;
  ctx.fillStyle=r.id===0?'#ffc84e66':'#71603b2a';ctx.beginPath();ctx.ellipse(x,y,36,11*ratio,0,0,Math.PI*2);ctx.fill();
  if(r.id===0){ctx.strokeStyle='#ffdb58';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,43,15*ratio,0,0,Math.PI*2);ctx.stroke();}
  if(r.boost>0||r.itemBoost>0){ctx.strokeStyle='#fff4a1';ctx.lineWidth=5;ctx.lineCap='round';for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x+i*24,y+18*ratio);ctx.lineTo(x+i*24,y+(42+Math.sin(s.age*18+i)*9)*ratio);ctx.stroke();}}
  ctx.save();ctx.translate(x,y+jump);ctx.scale(1,ratio);
  if(r.invincible>0)ctx.globalAlpha=.68+.32*Math.sin(s.age*18)**2;
  if(r.stumble>.4)ctx.rotate(.11*Math.sin((.9-r.stumble)*16));
  ctx.drawImage(img,frame*256,row*256,256,256,-size/2,-242/256*size,size,size);
  if(r.shield>0){ctx.fillStyle='#90eaff15';ctx.strokeStyle='#b1f0ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,-65,63,76,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
  if(r.id===0){ctx.fillStyle='#ffdb58';ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-9,-129);ctx.lineTo(9,-129);ctx.lineTo(0,-117);ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.restore();
}
function drawObstacle(ctx,s,o,lane,images,ratio){
  const kind=o.lanes[lane],img=images[kind==='gate'?'race-gate':'race-hurdle'];if(!img)return;
  const {x,y}=raceScreenPoint(s,o.x,lane,ratio),w=kind==='gate'?116:108,h=w*img.height/img.width;
  ctx.fillStyle='#69553a24';ctx.beginPath();ctx.ellipse(x,y+2*ratio,w*.48,10*ratio,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(img,x-w/2,y-h*ratio,w,h*ratio);
}
export function drawRaceScene(ctx,s,{images,ratio,reduced=false}){
  const bg=images['race-track-vertical'];ctx.fillStyle='#f7ce98';ctx.fillRect(0,0,600,900);
  if(bg){
    const h=600*bg.height/bg.width*ratio,scroll=s.camera*RACE_VIEW.forwardScale*ratio;
    for(let n=Math.floor((-scroll-100)/h);n<(900-scroll)/h+1;n++){
      const y=n*h+scroll;ctx.save();
      // Mirrored tile edges meet the same painted edge, avoiding a hard seam.
      if(Math.abs(n)%2){ctx.translate(0,y+h);ctx.scale(1,-1);ctx.drawImage(bg,0,0,600,h);}
      else ctx.drawImage(bg,0,y,600,h);
      ctx.restore();
    }
  }
  ctx.strokeStyle='#fff8df90';ctx.lineWidth=3;ctx.setLineDash([24*ratio,27*ratio]);ctx.lineDashOffset=-s.camera*RACE_VIEW.forwardScale*ratio;
  for(const x of [236,364]){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,900);ctx.stroke();}ctx.setLineDash([]);
  // Speed accents live at the track margins, never on the readable obstacle lanes.
  if((s.racers[0].boost>0||s.racers[0].itemBoost>0)&&!reduced){
    ctx.save();ctx.lineCap='round';
    for(let i=0;i<12;i++){
      const x=i%2?534+(i%3)*10:66-(i%3)*10,y=190+((s.age*570+i*113)%550);
      ctx.globalAlpha=.18+(i%3)*.1;ctx.strokeStyle=i%3?'#fff9df':'#ffdd65';ctx.lineWidth=3+i%2;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+35+(i%4)*12);ctx.stroke();
    }ctx.restore();
  }
  for(const distance of [70,RACE.finish]){
    const {y}=raceScreenPoint(s,distance,1,ratio);if(y< -70||y>980)continue;
    for(let r=0;r<2;r++)for(let col=0;col<24;col++){ctx.fillStyle=(r+col)%2?'#fff9e9':ink;ctx.fillRect(108+col*16,y+r*16*ratio,16,16*ratio);}
    if(distance===RACE.finish)text(ctx,'终点',300,y-24*ratio,32,'#ffda65');
  }
  const objects=[];
  for(const item of s.items||[]){
    if(item.taken)continue;const p=raceScreenPoint(s,item.x,item.lane,ratio);if(p.y<-80||p.y>980)continue;
    objects.push({distance:item.x,draw:()=>drawItem(ctx,images,item.kind,p.x,p.y-30*ratio,53,s.age,ratio)});
  }
  for(const o of s.obstacles){
    const {y}=raceScreenPoint(s,o.x,1,ratio);if(y<-100||y>1050)continue;
    o.lanes.forEach((kind,lane)=>{if(kind)objects.push({distance:o.x,draw:()=>drawObstacle(ctx,s,o,lane,images,ratio)});});
  }
  for(const r of s.racers){
    const {y}=raceScreenPoint(s,r.x,r.lane,ratio);if(y<-80||y>1050)continue;
    objects.push({distance:r.x+(r.y<0?-65:0),draw:()=>drawCat(ctx,s,r,images,ratio)});
  }
  // Far objects first; a cat behind a rail is occluded, and a jumping cat clears it.
  objects.sort((a,b)=>b.distance-a.distance).forEach(o=>o.draw());
  for(const f of reduced?[]:s.fx){
    const p=raceScreenPoint(s,f.x,f.lane,ratio),t=f.age/f.life;ctx.save();ctx.globalAlpha=(1-t)**1.5;ctx.lineCap='round';ctx.strokeStyle=f.kind==='boost'?'#ffe889':'#fff9e9';ctx.lineWidth=5*(1-t);
    const radius=12+(1-(1-t)**3)*58;
    if(f.kind==='boost'){
      ctx.beginPath();ctx.ellipse(p.x,p.y+4*ratio,radius,radius*.3*ratio,0,0,Math.PI*2);ctx.stroke();
    }else for(let i=0;i<6;i++){
      const a=i*Math.PI*2/6;ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*radius,p.y-42*ratio+Math.sin(a)*radius*ratio);ctx.lineTo(p.x+Math.cos(a)*(radius+11),p.y-42*ratio+Math.sin(a)*(radius+11)*ratio);ctx.stroke();
    }ctx.restore();
  }
  const ahead=s.racers.filter(r=>r.id&&raceScreenPoint(s,r.x,r.lane,ratio).y<30);
  if(ahead.length)text(ctx,`↑ ${ahead.length}`,557,168,19,'#fff1bd');
  const fade=ctx.createLinearGradient(0,0,0,160);fade.addColorStop(0,'#fff8eaf2');fade.addColorStop(.55,'#fff8eadd');fade.addColorStop(1,'#fff8ea00');ctx.fillStyle=fade;ctx.fillRect(0,0,600,160);
  if(s.phase==='countdown'||s.time<.55){
    ctx.save();ctx.translate(300,365);ctx.scale(1,ratio);
    const q=s.phase==='countdown'?1-(s.countdown%1):s.time/.55;
    if(!reduced){const size=1+Math.sin(Math.min(1,q*2)*Math.PI)*.09;ctx.scale(size,size);}
    ctx.fillStyle='#fff8e9ed';ctx.strokeStyle='#5a4c35';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,61,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#ffcf5e';ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,0,53,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-q));ctx.stroke();
    text(ctx,s.phase==='countdown'?String(Math.ceil(s.countdown)):'跑！',0,23,s.phase==='countdown'?68:43,'#ffde73');ctx.restore();
  }
  if(s.flash>0&&!reduced){
    // A short warm edge cue, not a full-screen flash over obstacles.
    const edge=ctx.createLinearGradient(0,0,600,0);edge.addColorStop(0,`rgba(255,120,83,${s.flash*1.4})`);edge.addColorStop(.13,'#ff785300');edge.addColorStop(.87,'#ff785300');edge.addColorStop(1,`rgba(255,120,83,${s.flash*1.4})`);ctx.fillStyle=edge;ctx.fillRect(0,0,600,900);
  }
}
