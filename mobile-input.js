// Scope browser-gesture protection to the game, not other pages or browser zoom.
export function installTouchGuards(root){
  const isNative=e=>!!e.target?.closest?.('input, textarea, select, [contenteditable="true"], a[href]');
  const prevent=e=>{if(!isNative(e)&&e.cancelable)e.preventDefault();};
  for(const type of ['contextmenu','selectstart','dragstart','dblclick','gesturestart','gesturechange','gestureend']){
    root.addEventListener(type,prevent,{passive:false});
  }
  // Older iOS WebViews need a non-passive fallback as well as touch-action.
  // Do not stop propagation: both thumbs must still reach their own controls.
  root.addEventListener('touchmove',e=>{
    if(e.touches.length>1)prevent(e);
  },{passive:false});
}

// Only the finger that started a drag may move or end it.
export class PointerOwner {
  id=null;
  claim(id){if(this.id!==null)return false;this.id=id;return true;}
  owns(id){return this.id!==null&&this.id===id;}
  release(id){if(!this.owns(id))return false;this.clear();return true;}
  clear(){this.id=null;}
}
