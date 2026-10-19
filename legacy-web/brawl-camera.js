// Keep the furniture at its authored coordinates. The plain top wall continues
// above the painting to give the highest ledges headroom for a full jump.
// Renderer and camera share the complete bounds; there is no extra flat-color floor.
export const BRAWL_ROOM={left:0,top:-1220,width:1800,height:1409,artTop:-711,artHeight:900};
export const BRAWL_BASE=700;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function brawlViewport(ratio=1){
  ratio=Number.isFinite(ratio)&&ratio>0?ratio:1;
  // Keep aspect ratio. A tall phone must not reveal more vertical world than the art contains.
  const zoom=Math.max(1,900/(ratio*BRAWL_ROOM.height));
  const width=600/zoom,height=900/(ratio*zoom),vertical=ratio*zoom;
  return {ratio,zoom,width,height,
    minX:BRAWL_ROOM.left,maxX:BRAWL_ROOM.left+BRAWL_ROOM.width-width,
    minY:BRAWL_ROOM.top+BRAWL_BASE/vertical,
    maxY:BRAWL_ROOM.top+BRAWL_ROOM.height-(900-BRAWL_BASE)/vertical};
}
export function setBrawlViewport(s,ratio=1,initial=false){
  s.viewport=brawlViewport(ratio);const v=s.viewport,c=s.cats[0];
  s.camera=clamp(initial?c.x-v.width/2:s.camera,v.minX,v.maxX);
  s.cameraY=clamp(initial?c.y+220:s.cameraY,v.minY,v.maxY);
}
export function updateBrawlCamera(s,dt){
  if(!s.viewport)setBrawlViewport(s);
  const v=s.viewport,c=s.cats[0];
  // Smooth the unconstrained target, THEN clamp the actual camera. At an edge,
  // it reaches the exact limit and stays still while the character keeps moving.
  s.camera=clamp(s.camera+(c.x-v.width/2-s.camera)*(1-Math.exp(-8*dt)),v.minX,v.maxX);
  s.cameraY=clamp(s.cameraY+(c.y+220-s.cameraY)*(1-Math.exp(-7*dt)),v.minY,v.maxY);
}
export function brawlScreenPoint(s,x,y){
  const v=s.viewport||brawlViewport();
  return {x:(x-s.camera)*v.zoom,y:BRAWL_BASE+(y-s.cameraY)*v.ratio*v.zoom};
}
