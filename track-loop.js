// Overlap identical upright copies once, off-screen. Never invert scenery.
const cache=new WeakMap();
export function loopTexture(image){
  if(cache.has(image))return cache.get(image);
  const overlap=Math.round(image.height*.075),height=image.height-overlap;
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=height;
  const c=canvas.getContext('2d');c.drawImage(image,0,overlap,image.width,height,0,0,image.width,height);
  const strip=document.createElement('canvas');strip.width=image.width;strip.height=overlap;
  const s=strip.getContext('2d');s.drawImage(image,0,0,image.width,overlap,0,0,image.width,overlap);
  s.globalCompositeOperation='destination-in';const mask=s.createLinearGradient(0,0,0,overlap);mask.addColorStop(0,'#ffffff00');mask.addColorStop(1,'#ffffffff');s.fillStyle=mask;s.fillRect(0,0,strip.width,overlap);
  c.drawImage(strip,0,height-overlap);cache.set(image,canvas);return canvas;
}
