// Restore the stretchable sleeve: it follows the route and unwinds on return.
export function pawRig(paw){
  const bodyX=126,root={x:110,y:581};
  const end={x:paw.x,y:paw.y};
  const route=[root,...(paw.path||[]).map(p=>({x:p.x,y:p.y})),end];
  return {bodyX,root,end,route};
}
export function drawForeleg(ctx,rig,fur){
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();rig.route.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.strokeStyle='#292723';ctx.lineWidth=30;ctx.stroke();
  ctx.strokeStyle=fur;ctx.lineWidth=22;ctx.stroke();ctx.restore();
}
export function drawPaw(ctx,rig,image,gripping=false){
  if(!image)return; // The asset loader gates gameplay until every paw is ready.
  ctx.save();ctx.translate(rig.end.x,rig.end.y);
  if(gripping)ctx.rotate(-.15);
  // Match the old oval including its outline; don't enlarge the generated art.
  ctx.drawImage(image,-24,-19,48,38);ctx.restore();
}
