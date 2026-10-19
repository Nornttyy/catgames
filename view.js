import {TABLE_Y,WORLD_WIDTH,DROP_DURATION,clamp} from './model.js?v=room-6';

// Selecting a game changes its menu controls, not the shared living room.
export const sceneFor=(screen,mode)=>screen==='play'&&mode==='fish'?'kitchen':'living-room';

// Only the interactive foreground moves closer; the room and HUD stay fixed.
export const VIEW_WIDTH=600;
export const PLAY_ZOOM=1.9;
export const visibleWorldWidth=VIEW_WIDTH/PLAY_ZOOM;
export const cameraFor=x=>clamp(x-visibleWorldWidth/2,0,WORLD_WIDTH-visibleWorldWidth);
export const projectX=(x,camera)=>(x-camera)*PLAY_ZOOM;
export const unprojectX=(x,camera)=>x/PLAY_ZOOM+camera;
export const projectY=y=>TABLE_Y+(y-TABLE_Y)*PLAY_ZOOM;

export function hudCopy(s){
  const o=s.owner;
  const alertVisible=s.status==='play'&&(o.seen||o.phase!=='away'||o.noise>=.62||o.suspicion>0);
  return {
    alertVisible,
    alert:alertVisible?(o.seen?'暴露':o.phase==='warning'?'小心':'警觉'):'',
    tip:s.status==='play'?({push:'点杯子',hide:'躲起来',wait:'等等'}[s.tutorial]??''):''
  };
}

export function propPose(p){
  const t=p.gone?clamp(p.fall,0,DROP_DURATION):0;
  return {x:p.x,y:p.y+460*t*t,alpha:1-clamp((t-.45)/(DROP_DURATION-.45),0,1)};
}

export function targetBounds(p,camera,ratio){
  const cover=typeof p.id==='string';
  const width=(cover?90:48)*PLAY_ZOOM;
  const x=projectX(p.x,camera);
  return {x,y:projectY(p.y),width,height:70*PLAY_ZOOM*ratio,
    hidden:!!p.gone||x+width/2<0||x-width/2>VIEW_WIDTH};
}
