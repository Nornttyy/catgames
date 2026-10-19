export const COLORS = ['gray','orange','cream','black'];
export const TABLE_Y = 590;
export const WORLD_WIDTH = 1100;
export const DROP_DURATION = .7;
export const ROUND_TIME = 60;
export const PROP_NOISE = {books:.12,bottle:.24,mug:.38,duck:.56};
export const BOUNDS = {left:50,right:1050,top:TABLE_Y,bottom:TABLE_Y};
export const COVERS = [{id:'cushion',x:450,y:TABLE_Y,r:44},{id:'popcorn',x:650,y:TABLE_Y,r:36}];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function difficultyFor(s){
  return s.tutorial?0:clamp(Math.max(s.activeTime/ROUND_TIME,s.falls/Math.max(1,s.props.length)),0,1);
}
export function ownerTiming(s){
  const d=difficultyFor(s);
  return {away:5.2-1.8*d,warning:1.75-.25*d,look:2.6+.6*d,catchRate:55+15*d};
}
export function gazeFor(s){
  return {x:clamp(s.owner.x+Math.sin(s.elapsed*1.35)*65,110,990),radius:s.tutorial?210:240+30*difficultyFor(s)};
}
export function skipTutorial(s){
  if(s.status!=='play'||!s.tutorial)return;
  s.tutorial=null;s.activeTime=0;s.owner.phase='away';s.owner.timer=5;
  s.owner.suspicion=0;s.owner.noise=0;s.owner.rechecking=false;s.owner.recheckQueued=false;s.owner.seen=false;
}
export function frameFor(action,t) {
  if(action==='walk') return 4+Math.floor(t*9)%4;
  if(action==='push') return 8+Math.min(3,Math.floor(t/.13));
  if(action==='hide') return 12+Math.min(3,Math.floor(t/.12));
  if(action==='rise') return 15-Math.min(3,Math.floor(t/.12));
  const phase=t%4.8;
  return phase>4.42?2:phase>4.2?1:0;
}
export function createGame({tutorial=false,random=Math.random}={}) {
  const coords=[990,936,882,112,166,220,274,328,382,718,772,826];
  return {status:'play',time:ROUND_TIME,elapsed:0,activeTime:0,score:0,falls:0,pushes:0,
    tutorial:tutorial?'push':null,tutorialDelay:0,random,
    cat:{x:tutorial?920:550,y:TABLE_Y,facing:1,action:'idle',anim:0,target:null,hidden:false,pending:null},
    props:coords.map((x,i)=>({id:i,kind:['mug','bottle','books','duck'][i%4],x,y:TABLE_Y,fall:0,gone:false})),
    owner:{phase:'away',timer:5,x:550,noiseX:550,noise:0,suspicion:0,seen:false,rechecking:false,recheckQueued:false},
    events:[],particles:[],paused:false,result:null};
}
export function setAction(s,action){if(s.cat.action!==action){s.cat.action=action;s.cat.anim=0;}}
export function moveTo(s,x,y){
  if(s.status!=='play'||s.paused||s.tutorial)return;
  s.cat.hidden=false;s.cat.pending=null;s.cat.target={x:clamp(x,75,1025),y:TABLE_Y};
  setAction(s,'walk');
}
export function targetProp(s,id){
  if(s.status!=='play'||s.paused||s.tutorial==='hide'||s.tutorial==='wait')return;
  if(s.cat.action==='push')return;
  if(s.tutorial==='push'&&id!==0)return;
  const p=s.props.find(p=>p.id===id&&!p.gone);if(!p)return;
  const facing=p.x>=s.cat.x?1:-1;
  s.cat.hidden=false;s.cat.pending={id,facing};
  s.cat.target={x:clamp(p.x-facing*40,75,1025),y:TABLE_Y};
  setAction(s,'walk');
}
export function hideAt(s,id){
  if(s.status!=='play'||s.paused||s.tutorial==='push')return;
  const c=COVERS.find(c=>c.id===id);if(!c)return;
  s.cat.hidden=false;s.cat.pending={cover:id};s.cat.target={x:c.x,y:TABLE_Y};setAction(s,'walk');
}
function finish(s,result){s.status='over';s.result=result;s.cat.target=null;s.events.push({type:'end',result});}
function noise(s,x,value){
  const o=s.owner;o.noise=clamp(o.noise+value,0,1);o.noiseX=x;
  if(s.tutorial)return;
  if(o.phase==='away')o.timer=Math.min(o.timer,2.8-1.8*o.noise-.4*difficultyFor(s));
  if(o.phase==='look'&&o.noise>=.62)o.recheckQueued=true;
}
function warn(s,rechecking=false){
  const o=s.owner;o.phase='warning';o.timer=ownerTiming(s).warning;
  o.rechecking=rechecking;o.x=clamp(o.noiseX,150,950);s.events.push({type:'warning'});
}
function dropProp(s,p){
  // A paw knocks only its selected item over the front edge, wherever it stands.
  p.gone=true;p.fall=0;s.falls++;
  const score=p.kind==='duck'?15:10;s.score+=score;noise(s,p.x,PROP_NOISE[p.kind]??.24);
  s.events.push({type:'fall',kind:p.kind,x:p.x,y:TABLE_Y,score});
  if(s.tutorial==='push'){s.tutorial='hide';s.owner.noiseX=s.cat.x;warn(s);}
}
export function update(s,dt){
  if(s.status!=='play'||s.paused)return;
  dt=clamp(dt,0,.04);s.elapsed+=dt;s.cat.anim+=dt;
  if(!s.tutorial){s.activeTime+=dt;s.time=Math.max(0,s.time-dt);if(s.time===0&&s.falls<s.props.length){finish(s,'time');return;}}
  const cat=s.cat;
  if(cat.target){
    const dx=cat.target.x-cat.x,dy=0,d=Math.abs(dx),step=290*dt;
    if(Math.abs(dx)>2)cat.facing=dx>=0?1:-1;
    if(d>step){cat.x+=dx/d*step;cat.y+=dy/d*step;setAction(s,'walk');}
    else{
      cat.x=cat.target.x;cat.y=cat.target.y;cat.target=null;
      if(cat.pending?.cover){cat.hidden=true;setAction(s,'hide');if(s.tutorial==='hide'){s.tutorial='wait';s.tutorialDelay=2.8;s.owner.phase='look';s.owner.timer=2.4;}}
      else if(cat.pending){setAction(s,'push');cat.pending.hit=false;}
      else setAction(s,'idle');
    }
  }
  if(cat.action==='push'&&cat.anim>=.21&&cat.pending&&!cat.pending.hit){
    const target=s.props.find(p=>p.id===cat.pending.id&&!p.gone);
    if(target){cat.facing=cat.pending.facing;s.pushes++;s.events.push({type:'push',x:target.x,y:target.y});dropProp(s,target);}
    cat.pending.hit=true;
  }
  if(cat.action==='push'&&cat.anim>.52){cat.pending=null;setAction(s,'idle');}
  for(const p of s.props){
    if(p.gone)p.fall=Math.min(DROP_DURATION,p.fall+dt);
  }
  const o=s.owner;o.noise=Math.max(0,o.noise-dt*.045);o.seen=false;
  if(s.tutorial==='wait'){s.tutorialDelay-=dt;if(s.tutorialDelay<=0){skipTutorial(s);s.events.push({type:'learned'});}}
  if(s.tutorial!=='push'&&s.tutorial!=='wait'){
    o.timer-=dt;
    if(o.timer<=0){
      if(o.phase==='away')warn(s);
      else if(o.phase==='warning'){
        o.phase='look';o.timer=o.rechecking?1.8:ownerTiming(s).look;o.x=clamp(o.noiseX,150,950);
        o.recheckQueued=!s.tutorial&&!o.rechecking&&o.noise>=.62;
      }else if(!s.tutorial&&!o.rechecking&&o.recheckQueued){
        o.recheckQueued=false;warn(s,true);
      }else{
        o.phase='away';o.rechecking=false;o.recheckQueued=false;
        o.timer=ownerTiming(s).away+s.random()*.8-o.noise*.6;o.noise*=.5;
      }
    }
  }
  if(o.phase==='look'){
    o.x+=clamp(o.noiseX-o.x,-180*dt,180*dt);
    const gaze=gazeFor(s);o.seen=!cat.hidden&&Math.abs(cat.x-gaze.x)<gaze.radius;
  }
  o.suspicion=clamp(o.suspicion+dt*(o.seen?(s.tutorial?37:ownerTiming(s).catchRate):cat.hidden?-18:-2),0,s.tutorial?70:100);
  if(o.suspicion>=100)finish(s,'caught');
  else if(s.props.every(p=>p.gone&&p.fall>=DROP_DURATION)&&!s.tutorial)finish(s,'cleared');
}
