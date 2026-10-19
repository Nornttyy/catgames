// Deform only the painted tail in the original six-frame racing atlas.
// Head, body and feet retain their original pixels, pose and registration.
export const TAIL_PATHS=[
  [[94,173],[78,178],[60,193],[43,202],[28,203]],
  [[124,194],[115,198],[107,209],[106,220]],
  [[141,181],[149,191],[153,203],[150,213]],
  [[94,184],[82,194],[72,208],[59,218],[48,219]],
  [[136,193],[127,204],[113,215],[101,220]],
  [[109,207],[96,218],[78,229],[60,232],[46,231]],
];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rigs=TAIL_PATHS.map(points=>{
  let length=0;const segments=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
    segments.push({a,dx,dy,len,start:length});length+=len;
  }
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  return {segments,length,left:Math.floor((Math.min(...xs)-24)/8)*8,top:Math.floor((Math.min(...ys)-24)/8)*8,
    right:Math.ceil((Math.max(...xs)+24)/8)*8,bottom:Math.ceil((Math.max(...ys)+24)/8)*8};
});
export function tailWeight(frame,x,y){
  const rig=rigs[frame];let distance=Infinity,u=0;
  for(const s of rig.segments){
    const t=clamp(((x-s.a[0])*s.dx+(y-s.a[1])*s.dy)/(s.len*s.len),0,1);
    const d=Math.hypot(x-s.a[0]-s.dx*t,y-s.a[1]-s.dy*t);
    if(d<distance){distance=d;u=(s.start+s.len*t)/rig.length;}
  }
  // Full strength inside the ink outline; smooth falloff in transparent padding.
  const edge=clamp((22-distance)/12,0,1),root=clamp((u-.16)/.84,0,1);
  return {u,weight:root*root*(3-2*root)*edge*edge*(3-2*edge)};
}
export function bendTail(frame,x,y,time=0,amount=1,turn=0){
  const {u,weight}=tailWeight(frame,x,y);
  const phase=time*6.2-u*2.3;
  // Delayed tip motion, not rigid rotation of the entire tail.
  const dx=weight*(Math.sin(phase)*2*amount+clamp(turn,-1,1)*3);
  const dy=weight*(Math.sin(phase-.65)*4.8*amount);
  return {x:x+dx,y:y+dy};
}
const geometry=rigs.map((r,frame)=>{
  const triangles=[];
  for(let y=r.top;y<r.bottom;y+=8)for(let x=r.left;x<r.right;x+=8){
    const a={x,y},b={x:x+8,y},c={x:x+8,y:y+8},d={x,y:y+8};
    triangles.push([a,b,c],[a,c,d]);
  }
  return {...r,frame,triangles};
});
function triangle(ctx,img,sx,sy,src,dst){
  const [a,b,c]=src,[p,q,r]=dst;
  const ux=b.x-a.x,uy=b.y-a.y,vx=c.x-a.x,vy=c.y-a.y,det=ux*vy-uy*vx;
  const dx=q.x-p.x,dy=q.y-p.y,ex=r.x-p.x,ey=r.y-p.y;
  const aa=(dx*vy-ex*uy)/det,bb=(dy*vy-ey*uy)/det,cc=(ex*ux-dx*vx)/det,dd=(ey*ux-dy*vx)/det;
  ctx.save();ctx.beginPath();
  // A tiny overlap avoids antialias seams between adjacent skin triangles.
  const mx=(p.x+q.x+r.x)/3,my=(p.y+q.y+r.y)/3;
  for(let i=0;i<3;i++){const v=dst[i],len=Math.hypot(v.x-mx,v.y-my),x=v.x+(v.x-mx)/len*.32,y=v.y+(v.y-my)/len*.32;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
  ctx.closePath();ctx.clip();ctx.transform(aa,bb,cc,dd,p.x-aa*a.x-cc*a.y,p.y-bb*a.x-dd*a.y);
  ctx.drawImage(img,sx,sy,256,256,0,0,256,256);ctx.restore();
}
const buffers=new WeakMap();
function bufferFor(img,row){
  if(!buffers.has(img))buffers.set(img,new Map());const rows=buffers.get(img);
  if(!rows.has(row)){const canvas=document.createElement('canvas');canvas.width=canvas.height=320;rows.set(row,canvas);}
  return rows.get(row);
}
export function drawRaceCatSprite(ctx,img,row,frame,size,time=0,amount=1,turn=0){
  const sx=frame*256,sy=row*256;
  ctx.save();ctx.translate(-size/2,-242/256*size);ctx.scale(size/256,size/256);
  if(amount===0&&turn===0){ctx.drawImage(img,sx,sy,256,256,0,0,256,256);ctx.restore();return;}
  // Composite at integral source pixels first, so skin seams never cross the body
  // when the final cat is drawn at fractional screen scale / camera coordinates.
  const canvas=bufferFor(img,row),skin=canvas.getContext('2d');skin.setTransform(1,0,0,1,0,0);skin.clearRect(0,0,320,320);skin.translate(32,32);
  const r=geometry[frame];
  const regions=[[0,0,256,r.top],[0,r.bottom,256,256-r.bottom],[0,r.top,r.left,r.bottom-r.top],[r.right,r.top,256-r.right,r.bottom-r.top]];
  for(const [x,y,w,h]of regions)if(w>0&&h>0)skin.drawImage(img,sx+x,sy+y,w,h,x,y,w,h);
  for(const src of r.triangles){
    const dst=src.map(p=>bendTail(frame,p.x,p.y,time,amount,turn));triangle(skin,img,sx,sy,src,dst);
  }
  ctx.drawImage(canvas,-32,-32);
  ctx.restore();
}
