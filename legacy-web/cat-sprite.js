// Frame 16..27 selects the new eight-step movement atlas, then jump/fall/land/rest.
// One registration per frame keeps the feet on the floor without changing body scale.
const registrations=new WeakMap();
export function atlasRegistration(img,cols=4,rows=3){
  if(registrations.has(img))return registrations.get(img);
  const fw=img.width/cols,fh=img.height/rows,canvas=document.createElement('canvas');
  canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
  const data=ctx.getImageData(0,0,canvas.width,canvas.height).data,frames=[];
  for(let f=0;f<cols*rows;f++){
    const sx=Math.round(f%cols*fw),sy=Math.round(Math.floor(f/cols)*fh),ex=Math.round((f%cols+1)*fw),ey=Math.round((Math.floor(f/cols)+1)*fh);
    let bottom=sy;
    for(let y=ey-1;y>=sy;y--){let n=0;for(let x=sx;x<ex;x++)if(data[(y*canvas.width+x)*4+3]>100)n++;if(n>6){bottom=y+1;break;}}
    frames.push({sx,sy,w:ex-sx,h:ey-sy,foot:bottom-sy});
  }
  registrations.set(img,frames);return frames;
}
export function drawCatSprite(ctx,images,color,x,y,w,frame=0,facing=1,ratio=1){
  const movement=frame>=16,img=images[(movement?'side-stride-':'cat-')+color];if(!img)return;
  ctx.save();ctx.translate(x,y);ctx.scale(facing,ratio);
  if(movement){
    const f=atlasRegistration(img)[frame-16],k=w/f.w;
    ctx.drawImage(img,f.sx,f.sy,f.w,f.h,-w*.60,-f.foot*k,w,f.h*k);
  }else{
    const k=w/360;ctx.drawImage(img,frame%4*360,Math.floor(frame/4)*310,360,310,-215*k,-290*k,w,310*k);
  }
  ctx.restore();
}
