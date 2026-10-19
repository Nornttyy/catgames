import {frameFor} from './model.js';

// Draw the room as a single image with uniform cover fitting, not stretched.
export function homeLayout(ratio,imageWidth=1024,imageHeight=1536){
  const scale=Math.max(600/imageWidth,900/(imageHeight*ratio));
  const w=imageWidth*scale,h=imageHeight*scale*ratio;
  const room={x:(600-w)/2,y:(900-h)/2,w,h};
  const catWidth=Math.min(340,234/ratio*360/290);
  const cat={x:300+25*catWidth/360,y:room.y+room.h*.555,w:catWidth};
  return {room,cat,hit:{x:300-catWidth*.39,y:cat.y-catWidth*.76*ratio,w:catWidth*.78,h:catWidth*.78*ratio}};
}
export function drawHomeScene(ctx,{images,catSprite,ratio,clock}){
  const img=images['menu-nook'];if(!img)return;
  const {room,cat}=homeLayout(ratio,img.width,img.height);
  ctx.drawImage(img,room.x,room.y,room.w,room.h);
  catSprite(cat.x,cat.y,cat.w,frameFor('idle',clock));
}
