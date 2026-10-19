export const MAX_WORLD_FX=12;
const durations={impact:.34,shield:.4,food:.65,pepper:.5,bubble:.5,jump:.24,land:.28};
const clamp=v=>Math.max(0,Math.min(1,v));
export function emitWorldFX(s,kind,x,y,extra={}){
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  s.fx.push({kind,x,y,age:0,life:durations[kind]||.34,...extra});
  if(s.fx.length>MAX_WORLD_FX)s.fx.splice(0,s.fx.length-MAX_WORLD_FX);
}
export function effectPhase(f){
  const t=clamp(f.age/f.life);
  return {t,expand:1-(1-clamp(t*3.5))**3,fade:clamp((1-t)/.66),travel:1-(1-t)**2};
}
function path(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
function outlined(ctx,fill,stroke='#6b4a31',width=2.5){ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();ctx.fill();}
export function drawDashRibbon(ctx,progress,power=false){
  const fade=Math.sin(clamp(progress)*Math.PI);ctx.save();ctx.globalAlpha=.85*fade;
  ctx.beginPath();ctx.moveTo(-17,-65);ctx.bezierCurveTo(-49,-66,-81,-59,-119,-45);ctx.bezierCurveTo(-79,-48,-40,-43,-19,-40);ctx.quadraticCurveTo(-29,-52,-17,-65);
  outlined(ctx,power?'#ffb970':'#fff1be','#b68b57',1.5);
  ctx.beginPath();ctx.moveTo(-30,-55);ctx.quadraticCurveTo(-67,-53,-92,-47);ctx.strokeStyle='#fffef3';ctx.lineWidth=3;ctx.stroke();ctx.restore();
}
export function drawWorldFX(ctx,f,reduced=false,owner=null){
  const {t,expand,fade,travel}=effectPhase(f);if(t>=1)return;
  // Reduced motion keeps a small stationary cue rather than hiding successful hits.
  const beside=owner&&['food','pepper'].includes(f.kind);
  ctx.save();ctx.translate(owner?owner.x+(beside?48:0):f.x,owner?owner.y-(beside?95:60):f.y);ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha=fade;
  if(reduced){ctx.fillStyle=f.kind==='food'?'#8ce0b9':'#fff4c1';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();ctx.restore();return;}
  if(f.kind==='impact'){
    ctx.scale(f.dir||1,1);ctx.translate(travel*9,0);const r=12+expand*32;
    // A compact bright contact, then an uneven comic splash and directional recoil.
    const pts=[[-.3,-.22],[-.46,-1.1],[.1,-.5],[.65,-1.06],[.52,-.24],[1.12,-.15],[.58,.23],[.65,.97],[.07,.54],[-.44,.85],[-.28,.2],[-.87,.1]].map(([x,y])=>[x*r,y*r]);
    path(ctx,pts);outlined(ctx,t<.16?'#fffbed':f.power?'#ffa663':'#ffd580');
    ctx.globalAlpha=fade*(1-clamp(t*1.65));ctx.beginPath();ctx.ellipse(1,-2,8+expand*5,19+expand*5,-.16,0,Math.PI*2);ctx.fillStyle='#fffef6';ctx.fill();
    ctx.globalAlpha=fade*.85;ctx.strokeStyle='#fff5d6';ctx.lineWidth=4*(1-t);
    ctx.beginPath();ctx.moveTo(r*.68,-r*.72);ctx.quadraticCurveTo(r*1.12,0,r*.75,r*.72);ctx.stroke();
  }else if(f.kind==='shield'){
    // Three bubble pieces peel away; not another expanding impact ring.
    for(let i=0;i<3;i++){
      const a=i*Math.PI*2/3-.4;ctx.save();ctx.translate(Math.cos(a)*travel*28,Math.sin(a)*travel*28);ctx.rotate(a);
      ctx.beginPath();ctx.arc(0,0,43+expand*7,-.62,.62);ctx.strokeStyle='#4e8b9b';ctx.lineWidth=8*(1-t)+1;ctx.stroke();ctx.strokeStyle='#c8f8ff';ctx.lineWidth=5*(1-t)+1;ctx.stroke();ctx.restore();
    }
  }else if(f.kind==='food'){
    ctx.translate(0,-travel*46);const r=14;
    path(ctx,[[-5,-r],[5,-r],[5,-5],[r,-5],[r,5],[5,5],[5,r],[-5,r],[-5,5],[-r,5],[-r,-5],[-5,-5]]);outlined(ctx,'#edfff5','#4d9b7a',4);
    ctx.strokeStyle='#9be4bd';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-23,16);ctx.quadraticCurveTo(-28,1,-23,-10);ctx.moveTo(23,16);ctx.quadraticCurveTo(28,1,23,-10);ctx.stroke();
  }else if(f.kind==='pepper'){
    ctx.translate(0,-travel*24);ctx.beginPath();ctx.moveTo(-21,16);ctx.bezierCurveTo(-32,-7,-13,-7,-12,-27);ctx.quadraticCurveTo(-2,-19,-1,-7);ctx.quadraticCurveTo(14,-24,10,-39);ctx.bezierCurveTo(35,-15,28,12,15,20);ctx.closePath();outlined(ctx,'#ffb56f','#a55a38');
    ctx.beginPath();ctx.moveTo(-8,17);ctx.quadraticCurveTo(-13,5,2,-10);ctx.quadraticCurveTo(15,8,8,19);ctx.fillStyle='#fff6b6';ctx.fill();
  }else if(['ice','glove','feather','speed'].includes(f.kind)){
    ctx.translate(0,-travel*24);ctx.strokeStyle=f.kind==='ice'?'#8cdaef':f.kind==='glove'?'#ee9280':'#a3ddbf';ctx.lineWidth=4;
    if(f.kind==='ice'){for(let i=0;i<3;i++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(-22,0);ctx.lineTo(22,0);ctx.moveTo(13,-7);ctx.lineTo(20,0);ctx.lineTo(13,7);ctx.stroke();}}
    else{ctx.beginPath();ctx.arc(0,0,30+expand*16,-2.6,-.2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,30+expand*16,.5,2.8);ctx.stroke();}
  }else if(f.kind==='bubble'){
    ctx.strokeStyle='#75bdd0';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,-1,44+expand*13,56+expand*12,0,-2.9,2.8);ctx.stroke();ctx.strokeStyle='#e6fcff';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,-1,39+expand*13,50+expand*12,0,-2.6,-1.5);ctx.stroke();
  }else{
    // Two low, grounded puffs. No particle spray and no camera-space sliding.
    for(const dir of [-1,1]){
      ctx.save();ctx.scale(dir,1);ctx.translate(travel*22,0);
      ctx.beginPath();ctx.moveTo(7,0);ctx.quadraticCurveTo(0,-12,12,-12);ctx.bezierCurveTo(14,-25,31,-18,27,-10);ctx.quadraticCurveTo(41,-14,40,-2);ctx.quadraticCurveTo(24,4,7,0);outlined(ctx,'#fff2d5','#c8ae7b',1.5);ctx.restore();
    }
  }
  ctx.restore();
}
