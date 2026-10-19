// A short input buffer forgives early presses, never holds an action indefinitely.
export class ActionBuffer {
  constructor(window=.16){this.window=window;this.pending=new Map();}
  press(action,now){this.pending.set(action,now+this.window);}
  flush(now,perform){
    for(const [action,expires] of this.pending){
      if(now>expires||perform(action))this.pending.delete(action);
    }
  }
  clear(){this.pending.clear();}
}

export class DirectionPad {
  constructor(){this.pointers=new Map();}
  set(id,direction){this.pointers.set(id,Math.sign(direction));}
  release(id){this.pointers.delete(id);}
  clear(){this.pointers.clear();}
  get value(){return Math.sign([...this.pointers.values()].reduce((sum,n)=>sum+n,0));}
}

export function padDirection(x,y,rect,previous=0){
  // A finger can drift slightly outside the artwork without losing movement.
  if(x<rect.left-24||x>rect.right+24||y<rect.top-28||y>rect.bottom+28)return 0;
  const dx=x-(rect.left+rect.right)/2;
  return Math.abs(dx)<5?previous:Math.sign(dx);
}

export function bindDirectionPad(element,state,{enabled,onChange=()=>{}}){
  const refresh=()=>onChange(state.value);
  element.addEventListener('pointerdown',e=>{
    if(e.button>0||!enabled())return;
    e.preventDefault();
    const dir=padDirection(e.clientX,e.clientY,element.getBoundingClientRect());
    state.set(e.pointerId,dir);element.setPointerCapture(e.pointerId);refresh();
  });
  element.addEventListener('pointermove',e=>{
    if(!state.pointers.has(e.pointerId))return;
    if(!enabled()){state.clear();refresh();return;}
    e.preventDefault();state.set(e.pointerId,padDirection(e.clientX,e.clientY,element.getBoundingClientRect(),state.pointers.get(e.pointerId)));refresh();
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(type,e=>{state.release(e.pointerId);refresh();});
}
