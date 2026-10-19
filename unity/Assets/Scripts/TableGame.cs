using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace CatGames {
 public sealed class TableGame:MiniGame {
  public sealed class Prop {public string kind;public float x,fall;public bool gone;}
  public readonly List<Prop> props=new List<Prop>();public float x=550,camera,anim,target,ownerTime=5,ownerX=550,noiseX=550,noise,suspicion,active;public int facing=1,falls;
  public string action="idle",owner="away",tutorial;public bool hidden,seen;bool hasTarget,pendingHide,pushed,rechecking,recheckQueued;Prop pending;float tutorialDelay;
  public TableGame(bool teach){time=60;tutorial=teach?"push":null;if(teach)x=920;int[] coords={990,936,882,112,166,220,274,328,382,718,772,826};string[] kinds={"mug","bottle","books","duck"};for(int i=0;i<coords.Length;i++)props.Add(new Prop{x=coords[i],kind=kinds[i%4]});camera=CameraFor(x);}
  public static float CameraFor(float x)=>Mathf.Clamp(x-600f/1.9f/2,0,1100-600f/1.9f);
  float Diff=>tutorial!=null?0:Mathf.Clamp01(Mathf.Max(active/60,falls/12f));
  public float Gaze=>Mathf.Clamp(ownerX+Mathf.Sin(age*1.35f)*65,110,990);
  void Set(string next){if(action!=next){action=next;anim=0;}}
  public void Skip(){tutorial=null;active=0;owner="away";ownerTime=5;suspicion=noise=0;rechecking=recheckQueued=seen=false;Emit("learned");}
  public override void Pointer(Vector2 pos,int phase){if(phase!=0||ended)return;float px=pos.x/1.9f+camera;if(pos.y<360||pos.y>700)return;var prop=props.Where(p=>!p.gone).OrderBy(p=>Mathf.Abs(p.x-px)).FirstOrDefault();if(prop!=null&&Mathf.Abs(prop.x-px)<30){Target(prop);return;}foreach(float cover in new[]{450f,650f})if(Mathf.Abs(cover-px)<45){Hide(cover);return;}if(tutorial==null){pending=null;pendingHide=false;hidden=false;hasTarget=true;target=Clamp(px,75,1025);Set("walk");}}
  void Target(Prop p){if(action=="push"||tutorial=="hide"||tutorial=="wait"||tutorial=="push"&&p!=props[0])return;facing=p.x>=x?1:-1;hidden=false;pending=p;pendingHide=false;target=Clamp(p.x-facing*40,75,1025);hasTarget=true;Set("walk");}
  void Hide(float at){if(tutorial=="push")return;hidden=false;pending=null;pendingHide=true;target=at;hasTarget=true;Set("walk");}
  public override void Action(string a){if(a=="hide")Hide(Mathf.Abs(x-450)<Mathf.Abs(x-650)?450:650);if(a=="skip")Skip();}
  void Warn(bool again=false){owner="warning";ownerTime=1.75f-.25f*Diff;rechecking=again;ownerX=Clamp(noiseX,150,950);Emit("warning");}
  void Drop(Prop p){p.gone=true;p.fall=0;falls++;int n=p.kind=="duck"?15:10;score+=n;float sound=p.kind=="books"?.12f:p.kind=="bottle"?.24f:p.kind=="mug"?.38f:.56f;noise=Mathf.Clamp01(noise+sound);noiseX=p.x;if(tutorial==null){if(owner=="away")ownerTime=Mathf.Min(ownerTime,2.8f-1.8f*noise-.4f*Diff);if(owner=="look"&&noise>=.62f)recheckQueued=true;}Emit("fall",p.kind,n,p.x,590);if(tutorial=="push"){tutorial="hide";noiseX=x;Warn();}}
  public override void Update(float dt,float direction){if(ended)return;dt=Mathf.Min(dt,.04f);age+=dt;anim+=dt;if(tutorial==null){active+=dt;time=Dec(time,dt);if(time==0&&falls<12){Finish(false,"时间到");return;}if(direction!=0&&action!="push"){hidden=false;pending=null;pendingHide=false;hasTarget=true;target=Clamp(x+direction*35,75,1025);Set("walk");}}
   if(hasTarget){float dx=target-x;if(Mathf.Abs(dx)>2)facing=dx>=0?1:-1;if(Mathf.Abs(dx)>290*dt){x+=Mathf.Sign(dx)*290*dt;Set("walk");}else{x=target;hasTarget=false;if(pendingHide){hidden=true;Set("hide");if(tutorial=="hide"){tutorial="wait";tutorialDelay=2.8f;owner="look";ownerTime=2.4f;}}else if(pending!=null){Set("push");pushed=false;}else Set("idle");}}
   if(action=="push"&&anim>=.21f&&pending!=null&&!pushed){if(!pending.gone){Emit("push");Drop(pending);}pushed=true;}if(action=="push"&&anim>.52f){pending=null;Set("idle");}
   foreach(var p in props)if(p.gone)p.fall=Mathf.Min(.7f,p.fall+dt);noise=Dec(noise,dt*.045f);seen=false;
   if(tutorial=="wait"){tutorialDelay-=dt;if(tutorialDelay<=0)Skip();}
   if(tutorial!="push"&&tutorial!="wait"){ownerTime-=dt;if(ownerTime<=0){if(owner=="away")Warn();else if(owner=="warning"){owner="look";ownerTime=rechecking?1.8f:2.6f+.6f*Diff;ownerX=Clamp(noiseX,150,950);recheckQueued=tutorial==null&&!rechecking&&noise>=.62f;}else if(tutorial==null&&!rechecking&&recheckQueued){recheckQueued=false;Warn(true);}else{owner="away";rechecking=recheckQueued=false;ownerTime=5.2f-1.8f*Diff+Random.value*.8f-noise*.6f;noise*=.5f;}}}
   if(owner=="look"){ownerX+=Clamp(noiseX-ownerX,-180*dt,180*dt);seen=!hidden&&Mathf.Abs(x-Gaze)<(tutorial!=null?210:240+30*Diff);}
   suspicion=Clamp(suspicion+dt*(seen?(tutorial!=null?37:55+15*Diff):hidden?-18:-2),0,tutorial!=null?70:100);if(suspicion>=100)Finish(false,"被发现了");else if(props.All(p=>p.gone&&p.fall>=.7f)&&tutorial==null)Finish(true,"桌面清空");camera+=(CameraFor(x)-camera)*(1-Mathf.Exp(-9*dt));
  }
  public override void Draw(CatPaint p,string color){p.Cover("room-side");p.Bottom("owner-"+(owner=="away"?0:owner=="warning"?1:2),300,430,145);if(owner=="warning")p.Label("!",350,282,60,60,40,"#d67a2b");float z=1.9f;
   var table=p.art["table-side"];p.Image("table-side",(50-camera)*z,590,1000*z,1000*z*table.height/table.width);
   foreach(var item in props){if(item.gone&&item.fall>=.7f)continue;float a=1-Mathf.Clamp01((item.fall-.45f)/.25f);p.Bottom(item.kind+"-side",(item.x-camera)*z,590+460*item.fall*item.fall*z,(item.kind=="books"?49:46)*z,a);}
   p.Cat(color,(x-camera)*z,590,140*z,Frame(action,anim),facing);
   p.Bottom("cushion-side",(450-camera)*z,590,112*z);p.Bottom("popcorn-side",(650-camera)*z,590,80*z);
   if(owner=="look")p.Bar(180,180,240,suspicion/100,seen?"#f18e72":"#86c7a5",8);
  }
 }
}
