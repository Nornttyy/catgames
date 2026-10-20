// Screen-space gestures: one deliberate swipe = one action, never tap-to-jump.
export class RaceSwipe {
  pointer=null;
  begin(e,width=390){
    if(this.pointer||e.button>0)return false;
    this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,acted:false,threshold:Math.max(14,Math.min(24,width*.045))};
    return true;
  }
  owns(id){return this.pointer?.id===id;}
  move(e){
    const p=this.pointer;if(!p||p.id!==e.pointerId||p.acted)return null;
    const dx=e.clientX-p.x,dy=e.clientY-p.y,ax=Math.abs(dx),ay=Math.abs(dy);
    if(Math.max(ax,ay)<p.threshold||Math.max(ax,ay)<Math.min(ax,ay)*1.2)return null;
    p.acted=true;
    return ax>ay?(dx>0?'right':'left'):(dy>0?'slide':'jump');
  }
  end(e,cancelled=false){
    if(!this.owns(e.pointerId))return null;
    const action=cancelled?null:this.move(e);this.clear();return action;
  }
  clear(){this.pointer=null;}
}

export function bindRaceSwipes(element,{enabled,onAction}){
  const swipe=new RaceSwipe();
  const clear=()=>{
    const id=swipe.pointer?.id;swipe.clear();
    if(id!==undefined&&element.hasPointerCapture?.(id))element.releasePointerCapture(id);
  };
  element.addEventListener('pointerdown',e=>{
    if(!enabled()||!swipe.begin(e,element.getBoundingClientRect().width))return;
    e.preventDefault();element.setPointerCapture(e.pointerId);
  });
  element.addEventListener('pointermove',e=>{
    if(!swipe.owns(e.pointerId))return;
    if(!enabled()){clear();return;}
    e.preventDefault();const action=swipe.move(e);if(action)onAction(action);
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture']){
    element.addEventListener(type,e=>{
      if(!swipe.owns(e.pointerId))return;
      const action=swipe.end(e,type!=='pointerup'||!enabled());
      if(element.hasPointerCapture?.(e.pointerId))element.releasePointerCapture(e.pointerId);
      if(action)onAction(action);
    });
  }
  return {clear};
}
