import {frameFor} from './model.js?v=controls-7';

// Rendering and collision must use the same authored frame, size and anchor.
export const CAT_ART={frameWidth:360,frameHeight:310,width:150,anchorX:215,anchorY:290};
export function jumpFrame(s){
  if(s.phase==='charge')return 12+Math.min(3,Math.floor(s.charge/.17));
  if(s.phase==='air')return s.cat.vy<0?6:7;
  if(s.phase==='dead')return s.hitFrame??2;
  if(s.landTime>0)return 13;
  return frameFor('idle',s.age);
}
