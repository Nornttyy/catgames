export function drawItem(ctx,images,kind,x,y,size=52,age=0,ratio=1){
  const img=images[`item-${kind}`];if(!img)return;
  ctx.save();ctx.translate(x,y);ctx.scale(1,ratio);
  ctx.fillStyle='#4a5d4524';ctx.beginPath();ctx.ellipse(0,size*.48,size*.3,5,0,0,Math.PI*2);ctx.fill();
  // A gentle lift and one orbiting glint; the artwork is never stretched.
  const bob=Math.sin(age*2.6)*3;ctx.drawImage(img,-size/2,-size/2+bob,size,size);
  const a=age*.9;ctx.strokeStyle='#fffbee';ctx.lineWidth=2;const gx=Math.cos(a)*size*.42,gy=Math.sin(a)*size*.34;
  ctx.beginPath();ctx.moveTo(gx-3,gy);ctx.lineTo(gx+3,gy);ctx.moveTo(gx,gy-3);ctx.lineTo(gx,gy+3);ctx.stroke();ctx.restore();
}
