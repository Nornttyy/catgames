import {clamp01} from './ui-model.js?v=room-6';
export const MAX_PARTICLES=18;
export function makeBurst(kind,x,y,{random=Math.random,reduced=false}={}){
  if(reduced)return [];
  // One authored shape sequence per action, not a radial spray of particles.
  return [{x,y,age:0,life:kind==='hit'?.3:kind==='dust'?.32:.46,kind,rotation:(random()-.5)*.3}];
}
export function tickParticles(items,dt){
  const step=Math.max(0,Math.min(.05,dt));
  for(const p of items)p.age+=step;
  for(let i=items.length-1;i>=0;i--)if(items[i].age>=items[i].life)items.splice(i,1);
  if(items.length>MAX_PARTICLES)items.splice(0,items.length-MAX_PARTICLES);
}
export function drawParticles(ctx,items,ratio=1){
  for(const p of items){
    const t=clamp01(p.age/p.life),e=1-(1-t)**3;
    ctx.save();ctx.globalAlpha=(1-t)**1.2;ctx.translate(p.x,p.y);ctx.scale(1,ratio);ctx.lineCap='round';
    if(p.kind==='dust'){
      ctx.fillStyle='#fff5d8';for(const side of [-1,1]){ctx.beginPath();ctx.ellipse(side*(12+e*24),4,7+e*8,3*(1-t)+1,side*.15,0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle='#fffaf0';ctx.lineWidth=2*(1-t);ctx.beginPath();ctx.ellipse(0,5,14+e*32,4+e*5,0,0,Math.PI*2);ctx.stroke();
    }else if(p.kind==='hit'){
      ctx.rotate(p.rotation);const size=16+Math.sin(Math.min(t*2,1)*Math.PI)*16;
      ctx.fillStyle=t<.25?'#fffef1':'#ffd3a3';ctx.strokeStyle='#98653a';ctx.lineWidth=1.5;
      ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5,r=i%2?size*.35:size;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();
      ctx.strokeStyle='#fff9e9';ctx.lineWidth=3*(1-t);ctx.beginPath();ctx.arc(0,0,20+e*37,-.7,.65);ctx.stroke();
    }else{
      ctx.strokeStyle=p.kind==='boost'?'#ffe486':'#d6fff0';ctx.lineWidth=5*(1-t);ctx.beginPath();ctx.ellipse(0,12,12+e*48,4+e*13,0,0,Math.PI*2);ctx.stroke();
      const x=20+e*20,y=-8-e*28,size=(p.kind==='boost'?15:9)*(1-t);ctx.fillStyle='#fff9db';ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?size*.28:size;ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }
}
