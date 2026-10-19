// One authored footprint per asset. Layouts choose objects, never width/height.
// Generated assets are exported at 4×; older art keeps its native aspect ratio.
export const FISH_PROP_ART=Object.freeze({
  mug:Object.freeze({asset:'mug',file:'mug-side.png',w:84,h:63}),
  bowls:Object.freeze({asset:'bowl-stack',file:'bowl-stack.png',w:84,h:84*420/404}),
  'bowls-low':Object.freeze({asset:'bowls-low',file:'bowls-low.png',w:84,h:40.5}),
  'bowls-tall':Object.freeze({asset:'bowls-tall',file:'bowls-tall.png',w:84,h:151.5}),
  'thermos-tall':Object.freeze({asset:'thermos-tall',file:'thermos-tall.png',w:56,h:180.25})
});
export const FISH_SNACK_WIDTH=78;
export function fishProp(kind,x,{id=0,moving=false,stand=false}={}){
  const art=FISH_PROP_ART[kind];
  if(!art)throw new Error(`Unknown fish prop: ${kind}`);
  return {kind,x,baseX:x,y:620,w:art.w,h:art.h,id,moving,stand,wobble:0};
}
