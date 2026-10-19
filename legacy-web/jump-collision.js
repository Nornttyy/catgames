import {CAT_ART} from './jump-art.js?v=controls-7';
import {CAT_MASKS,SPIKE_MASK} from './jump-masks.js?v=controls-7';
const scale=CAT_ART.width/CAT_ART.frameWidth;
function catShape(cat,frame,color){
  const mask=(CAT_MASKS[color]||CAT_MASKS.gray)[frame]||CAT_MASKS.gray[0];
  return {mask,x:cat.x-CAT_ART.anchorX*scale,y:cat.y-CAT_ART.anchorY*scale,sy:CAT_ART.frameHeight*scale/mask.height};
}
export function catLeft(cat,frame=0,color='gray'){
  const a=catShape(cat,frame,color);return a.x+a.mask.bounds[0];
}
function overlaps(a,b){
  const ab=a.mask.bounds,bb=b.mask.bounds;
  if(a.x+ab[2]<=b.x+bb[0]||a.x+ab[0]>=b.x+bb[2]||a.y+ab[3]*a.sy<=b.y+bb[1]*b.sy||a.y+ab[1]*a.sy>=b.y+bb[3]*b.sy)return false;
  const first=Math.max(ab[1],Math.floor((b.y+bb[1]*b.sy-a.y)/a.sy));
  const last=Math.min(ab[3],Math.ceil((b.y+bb[3]*b.sy-a.y)/a.sy));
  for(let ay=first;ay<last;ay++){
    const ar=a.mask.rows[ay];if(!ar.length)continue;
    const by0=Math.max(bb[1],Math.floor((a.y+ay*a.sy-b.y)/b.sy));
    const by1=Math.min(bb[3],Math.ceil((a.y+(ay+1)*a.sy-b.y)/b.sy));
    for(let by=by0;by<by1;by++){
      const br=b.mask.rows[by];
      for(let i=0;i<ar.length;i+=2)for(let j=0;j<br.length;j+=2){
        if(a.x+ar[i]<b.x+br[j+1]&&a.x+ar[i+1]>b.x+br[j])return true;
      }
    }
  }return false;
}
export const SPIKE_ART_HEIGHT=72*174/512;
export function touchesSpike(cat,b,frame=0,color='gray'){
  const a=catShape(cat,frame,color);
  for(let n=0;n<b.count;n++){
    if(overlaps(a,{mask:SPIKE_MASK,x:b.x-b.w/2+n*72,y:b.y-SPIKE_ART_HEIGHT,sy:SPIKE_ART_HEIGHT/SPIKE_MASK.height}))return true;
  }return false;
}
