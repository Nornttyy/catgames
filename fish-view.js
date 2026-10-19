import {FISH_HOME} from './fish-model.js?v=room-6';
import {frameFor} from './model.js?v=room-6';
import {pawRig,drawForeleg,drawPaw} from './paw-rig.js?v=room-6';
import {FISH_PROP_ART,FISH_SNACK_WIDTH,fishProp} from './fish-props.js?v=room-6';
export const projectFishY=(y,ratio)=>620+(y-620)*ratio;
export const unprojectFishY=(y,ratio)=>620+(y-620)/ratio;
export function fishCatLayers(home=false){
  // A full four-legged atlas frame must NEVER be drawn with the dynamic foreleg.
  return home?{body:'full',dynamicForeleg:false}:{body:'three-legged',dynamicForeleg:true};
}
function drawFishBody(ctx,img,x,y,w,ratio){
  if(!img)return;
  const scale=w/360;
  ctx.drawImage(img,x-215*scale,y-290*scale*ratio,w,310*scale*ratio);
}
export function drawFishScene(ctx,s,{images,sprite,catSprite,ratio,clock,color,effects,home=false}){
  const bg=images.kitchen;if(!bg)return;
  // The source's counter edge is at y=990/1536; align it with the game floor.
  const bgHeight=620/(990/1536);ctx.drawImage(bg,0,0,600,bgHeight);
  const o=s.owner,py=y=>projectFishY(y,ratio);
  const p=s.paw,rig=pawRig(p),layers=fishCatLayers(home),fur={gray:['#ebe5da','#48443f'],orange:['#fff8ef','#ef9034'],cream:['#fff3d5','#d9c29c'],black:['#303033','#333139']}[color];
  if(!home){
    ctx.save();ctx.beginPath();ctx.rect(0,0,600,619);ctx.clip();
    sprite(images[`owner-${o.phase==='away'?0:o.phase==='warning'?1:2}`],443,644,155);
    if(o.phase!=='away'){
      ctx.globalAlpha=o.phase==='warning'?.12:.2;ctx.fillStyle=o.seen?'#ff7157':'#ffeb8a';ctx.beginPath();ctx.moveTo(428,py(400));ctx.lineTo(195,620);ctx.lineTo(565,620);ctx.closePath();ctx.fill();
    }
    ctx.restore();
    if(o.phase==='warning'){
      ctx.save();ctx.font='900 40px sans-serif';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#353229';ctx.fillStyle='#ffde62';ctx.strokeText('!',530,py(420));ctx.fillText('!',530,py(420));ctx.restore();
    }
    // A small clock beside the owner lets players judge how greedy to be.
    ctx.save();ctx.translate(530,py(445));ctx.scale(1,ratio);
    ctx.fillStyle='#fff9e9';ctx.strokeStyle='#353229';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle=o.phase==='away'?'#56a886':o.phase==='warning'?'#ee9f30':'#eb6e59';ctx.lineWidth=6;
    ctx.beginPath();ctx.arc(0,0,12,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,Math.min(1,o.timer/o.duration)));ctx.stroke();ctx.restore();
  }
  if(layers.dynamicForeleg){
    ctx.save();ctx.translate(0,620);ctx.scale(1,ratio);ctx.translate(0,-620);drawForeleg(ctx,rig,fur[0]);ctx.restore();
  }
  const obstacles=home?[fishProp('bowls',362)]:s.obstacles;
  for(const b of obstacles){
    const art=FISH_PROP_ART[b.kind],img=images[art.asset];if(!img)continue;
    const wobble=b.wobble?Math.sin(b.wobble*42)*.09*b.wobble/.55:0;
    // ratio only undoes the portrait canvas transform; no per-layout stretching.
    ctx.save();ctx.translate(b.x,620);ctx.scale(1,ratio);ctx.rotate(wobble);ctx.drawImage(img,-art.w/2,-art.h,art.w,art.h);ctx.restore();
  }
  const snacks=home?[{x:488,y:590,state:'tray',golden:false}]:s.snacks;
  for(const f of snacks){
    const occupied=f.state==='tray',width=FISH_SNACK_WIDTH;
    ctx.save();ctx.translate(f.x,py(f.y+25));ctx.scale(1,ratio);ctx.globalAlpha=occupied?1:.35;
    ctx.fillStyle=f.golden?'#fff0b5':'#fff9e9';ctx.strokeStyle=f.golden?'#be8521':'#353229';ctx.lineWidth=f.golden?4:3;
    ctx.beginPath();ctx.ellipse(0,0,width*.53,7,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
    if(occupied){
      sprite(images['fish-snack'],f.x,py(f.y+23),width);
      if(f.golden){
        ctx.save();ctx.translate(f.x+29,py(f.y-24));ctx.scale(1,ratio);ctx.rotate(clock*.7);
        ctx.fillStyle='#fff5a1';ctx.strokeStyle='#bd8318';ctx.lineWidth=2;
        ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?3:9;if(!i)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
      }
    }
  }
  // Body covers the shoulder seam. Dishes cover the foreleg, but not its tip.
  if(layers.body==='full')catSprite(174,620,290,frameFor('idle',clock));
  else drawFishBody(ctx,images[`cat-fish-${color}`],rig.bodyX,620,240,ratio);
  if(!home){
    ctx.save();ctx.translate(0,620);ctx.scale(1,ratio);ctx.translate(0,-620);
    drawPaw(ctx,rig,images[`paw-round-${color}`],p.carrying);
    if(s.tutorial==='reach'){
      ctx.globalAlpha=.7+.2*Math.sin(clock*3);ctx.strokeStyle='#fff9e9';ctx.lineWidth=3;ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(FISH_HOME.x+20,FISH_HOME.y-32);ctx.quadraticCurveTo(225,490,260,465);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(249,467);ctx.lineTo(260,465);ctx.lineTo(258,478);ctx.stroke();
    }
    ctx.restore();
    p.bag.forEach((f,i)=>{
      const pop=Math.sin(Math.min(1,f.grabAge/.22)*Math.PI)*5;
      sprite(images['fish-snack'],p.x+6+(i-(p.bag.length-1)/2)*18,py(p.y-6-i*13-pop),FISH_SNACK_WIDTH,-.12+(i-1)*.12);
    });
    if(s.cooldown>0){
      ctx.save();ctx.globalAlpha=Math.min(1,s.cooldown*3);ctx.font='900 27px sans-serif';ctx.fillStyle='#f26d60';ctx.fillText('♥',155,py(445)-Math.sin(s.cooldown*3)*10);ctx.restore();
    }
    for(const e of effects){
      ctx.save();ctx.globalAlpha=Math.max(0,1-e.age/e.life);ctx.translate(e.x+e.vx*e.age,py(e.y+e.vy*e.age+70*e.age*e.age));
      if(e.text){ctx.textAlign='center';ctx.font='900 30px sans-serif';ctx.lineWidth=4;ctx.strokeStyle='#725036';ctx.fillStyle='#fff9d0';ctx.strokeText(e.text,0,0);ctx.fillText(e.text,0,0);}else{ctx.fillStyle=e.color;ctx.rotate(e.age*3);ctx.fillRect(-4,-4,8,8);}ctx.restore();
    }
    if(s.startle>0){ctx.save();ctx.globalAlpha=s.startle*.12;ctx.fillStyle='#ed7a64';ctx.fillRect(0,0,600,900);ctx.restore();}
  }
}
