using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace CatGames {
 public sealed class RaceGame:MiniGame {
  public const float FinishDistance=18000,Speed=340,LaneWidth=128;
  public sealed class Runner {public int id,next,clean,bestClean,misses,passed,laneTarget,planId=-1,planTarget;public string color,planKind;public float x,y,vy,lane,laneFrom,laneAge=1,laneDuration=.18f,speed,skill,slide,slideCooldown,stumble,invincible,boost,anim,jumpBuffer,shield,itemBoost,magnet,feather,finish=-1;public bool planDone,planMistake,planChange;public readonly HashSet<int> hit=new HashSet<int>();}
  public sealed class Obstacle {public int id;public float x;public string[] lanes=new string[3];}
  public sealed class Item {public float x;public int lane;public string kind;public bool taken;}
  public readonly List<Runner> runners=new List<Runner>();public readonly List<Obstacle> obstacles=new List<Obstacle>();public readonly List<Item> items=new List<Item>();
  public string phase="countdown";public readonly string difficulty,map;public float countdown=3,camera=120,flash;readonly Func<float> random;
  public RaceGame(string color,Func<float> rng=null,string difficulty="normal",string map="garden"){rank=1;random=rng??(()=>UnityEngine.Random.value);this.difficulty=MatchOptions.Valid(difficulty);this.map=map=="harbor"?map:"garden";var botColors=CatPaint.Colors.Where(c=>c!=color).ToArray();for(int i=0;i<3;i++){int lane=new[]{1,0,2}[i];runners.Add(new Runner{id=i,color=i==0?color:botColors[i-1],x=120,speed=Speed,skill=i==0?1:.94f,lane=lane,laneFrom=lane,laneTarget=lane,anim=i*.13f});}
   float d=1100;for(int i=0;d<FinishDistance-500;i++){var o=new Obstacle{id=i,x=d};int safe=Mathf.Min(2,(int)(random()*3));string kind=random()<.55f?"hurdle":"gate";if(i<2)o.lanes[1]=i==0?"hurdle":"gate";else if(this.difficulty=="casual")o.lanes[safe]=kind;else if(this.difficulty=="hard"&&i%6<2)for(int l=0;l<3;l++)o.lanes[l]=i%6==0?"hurdle":"gate";else for(int l=0;l<3;l++)if(l!=safe)o.lanes[l]=l%2==1?kind:kind=="gate"?"hurdle":"gate";obstacles.Add(o);if(i%2==0){int n=items.Count;items.Add(new Item{x=d+240,lane=n%3,kind=new[]{"shield","speed","magnet","feather"}[n%4]});}d+=650+random()*120;}
  }
  static bool Jump(Runner r){if(r.finish>=0||r.stumble>.38f)return false;if(r.y<-.5f){r.jumpBuffer=.13f;return false;}r.slide=0;r.y=-.01f;r.vy=-700;r.jumpBuffer=0;return true;}
  static bool Slide(Runner r){if(r.finish>=0||r.stumble>.38f||r.y<-.5f||r.slide>0||r.slideCooldown>0)return false;r.slide=1.05f;r.slideCooldown=1.19f;return true;}
  public static bool ChangeLane(Runner r,int target){target=Mathf.Clamp(target,0,2);if(r.finish>=0||target==r.laneTarget)return false;r.laneFrom=r.lane;r.laneTarget=target;r.laneAge=0;r.laneDuration=.18f*Mathf.Max(.7f,Mathf.Abs(target-r.lane));return true;}
  public override void Action(string action){TryAction(action);}
  public bool TryAction(string action){if(ended||phase!="run")return false;var r=runners[0];bool lane=action=="left"||action=="right";bool accepted=lane?ChangeLane(r,r.laneTarget+(action=="left"?-1:1)):action=="jump"?Jump(r):action=="slide"&&Slide(r);if(accepted)Emit(lane?"race-lane":action=="jump"?"jump":"race-slide");return accepted;}
  public static bool Contact(Runner r,Obstacle o){if(Mathf.Abs(r.x-o.x)>34)return false;for(int l=0;l<3;l++){string kind=o.lanes[l];if(kind==null||Mathf.Abs(r.lane-l)*LaneWidth>=76)continue;if(kind=="hurdle"&&-r.y<44)return true;if(kind=="gate"&&-r.y+(r.slide>0?28:88)>56)return true;}return false;}
  void Bot(Runner r){if(r.next>=obstacles.Count)return;var o=obstacles[r.next];if(r.planId!=o.id){r.planId=o.id;r.planDone=false;r.planKind=o.lanes[r.laneTarget];r.planMistake=random()>r.skill;r.planTarget=Array.FindIndex(o.lanes,k=>k==null);r.planChange=r.planTarget>=0&&random()<.62f;}float speed=r.speed+(r.boost>0||r.itemBoost>0?85:0);if(!r.planDone&&o.x-r.x<=speed*(r.planChange?.9f:.48f)){r.planDone=true;if(r.planKind==null||r.planMistake)return;if(r.planChange)ChangeLane(r,r.planTarget);else if(r.planKind=="gate")Slide(r);else Jump(r);}}
  void Collide(Runner r,Obstacle o){r.hit.Add(o.id);if(r.shield>0){r.shield=0;r.invincible=.8f;if(r.id==0)Emit("shield-break");return;}r.misses++;r.clean=0;r.boost=0;r.slide=0;r.stumble=.9f;r.invincible=1.15f;if(r.id==0){Emit("bonk");flash=.2f;}}
  public override void Update(float dt,float direction){if(ended)return;float left=Mathf.Min(.1f,dt);while(left>0&&!ended){float sub=Mathf.Min(left,1f/240);Step(sub);left-=sub;}}
  void Step(float dt){age+=dt;flash=Dec(flash,dt);if(phase=="countdown"){int old=Mathf.CeilToInt(countdown);countdown=Dec(countdown,dt);if(Mathf.CeilToInt(countdown)!=old)Emit(countdown==0?"race-go":"race-tick");if(countdown==0)phase="run";return;}time+=dt;
   foreach(var r in runners){if(r.finish>=0)continue;r.slide=Dec(r.slide,dt);r.slideCooldown=Dec(r.slideCooldown,dt);r.stumble=Dec(r.stumble,dt);r.invincible=Dec(r.invincible,dt);r.boost=Dec(r.boost,dt);r.jumpBuffer=Dec(r.jumpBuffer,dt);r.shield=Dec(r.shield,dt);r.itemBoost=Dec(r.itemBoost,dt);r.magnet=Dec(r.magnet,dt);r.feather=Dec(r.feather,dt);if(r.id>0)Bot(r);
    r.laneAge=Mathf.Min(r.laneDuration,r.laneAge+dt);float t=r.laneAge/r.laneDuration;r.lane=Mathf.Lerp(r.laneFrom,r.laneTarget,t*t*(3-2*t));float speed=(r.speed+(r.boost>0||r.itemBoost>0?85:0))*(r.stumble>0?.27f:1),previous=r.x;r.x+=speed*dt;r.anim+=dt*speed/Speed;
    if(r.y<0||r.vy<0){float gravity=r.feather>0?1000:1300;r.y+=r.vy*dt+.5f*gravity*dt*dt;r.vy+=gravity*dt;if(r.y>=0){r.y=r.vy=0;if(r.id==0)Emit("land");if(r.jumpBuffer>0)Jump(r);}}
    foreach(var i in items)if(!i.taken&&Mathf.Abs(r.x-i.x)<(r.magnet>0?145:35)&&Mathf.Abs(r.lane-i.lane)<(r.magnet>0?2.1f:.38f)&&(r.magnet>0||-r.y<125))Take(r,i);
    if(r.next<obstacles.Count){var o=obstacles[r.next];if(!r.hit.Contains(o.id)&&r.invincible==0&&Contact(r,o))Collide(r,o);if(r.x>o.x+60){r.next++;r.passed++;if(!r.hit.Contains(o.id)){r.clean++;r.bestClean=Mathf.Max(r.bestClean,r.clean);if(r.id==0)Emit("race-clear");if(r.clean%3==0){r.boost=1.65f;if(r.id==0)Emit("race-boost");}}}}
    if(r.x>=FinishDistance){r.finish=time-dt+(FinishDistance-previous)/speed;r.x=FinishDistance;}
   }
   rank=runners.OrderBy(r=>r.finish>=0?r.finish:10000-r.x/FinishDistance).ThenBy(r=>r.id).ToList().FindIndex(r=>r.id==0)+1;camera=runners[0].x;if(runners[0].finish>=0){phase="finish";score=rank;Finish(rank==1,"第 "+rank+" 名");}
  }
  public void Take(Runner r,Item i){if(i.taken)return;i.taken=true;if(i.kind=="shield")r.shield=10;else if(i.kind=="magnet")r.magnet=7;else if(i.kind=="feather")r.feather=8;else r.itemBoost=2.6f;if(r.id==0)Emit("pickup",i.kind);}
  float ScreenY(float distance)=>680-(distance-camera)*.8f;
  public override void Draw(CatPaint p,string color){
   p.Rect(0,0,600,900,"#f7ce98");string track=map=="harbor"?"loop-harbor":"loop-garden";var bg=p.art[track];float h=600f*bg.height/bg.width,scroll=camera*.8f;for(int n=Mathf.FloorToInt((-scroll-p.OffsetY-100)/h);n<(CatPaint.ViewHeight-p.OffsetY-scroll)/h+1;n++)p.Image(track,0,n*h+scroll,600,h);
   foreach(float x in new[]{236f,364f})for(float y=-50+scroll%51;y<CatPaint.ViewHeight-p.OffsetY;y+=51)p.Rect(x,y,3,24,"#fff8df90");
   foreach(float d in new[]{120f,FinishDistance}){float y=ScreenY(d);if(y< -70-p.OffsetY||y>CatPaint.ViewHeight-p.OffsetY+80)continue;for(int r=0;r<2;r++)for(int c=0;c<24;c++)p.Rect(108+c*16,y+r*16,16,16,(r+c)%2==0?"#39362e":"#fff9e9");}
   var draw=new List<KeyValuePair<float,Action>>();foreach(var i in items){if(i.taken)continue;var item=i;float y=ScreenY(i.x);if(y< -80-p.OffsetY||y>CatPaint.ViewHeight-p.OffsetY+80)continue;draw.Add(new KeyValuePair<float,Action>(i.x,()=>p.Bottom("item-"+item.kind,300+(item.lane-1)*128,y-15,53)));}
   foreach(var o in obstacles){float y=ScreenY(o.x);if(y< -100-p.OffsetY||y>CatPaint.ViewHeight-p.OffsetY+150)continue;for(int l=0;l<3;l++){if(o.lanes[l]==null)continue;string key="race-"+o.lanes[l];float x=300+(l-1)*128,w=o.lanes[l]=="gate"?116:108;draw.Add(new KeyValuePair<float,Action>(o.x,()=>p.Bottom(key,x,y,w)));}}
   foreach(var rr in runners){var r=rr;float y=ScreenY(r.x);if(y< -80||y>1050)continue;draw.Add(new KeyValuePair<float,Action>(r.x+(r.y<0?-65:0),()=>{
    float x=300+(r.lane-1)*128;int frame=r.slide>0?5:r.y<0?4:phase=="countdown"||r.finish>=0||r.stumble>.35f?1:(int)(r.anim*11)%4,row=Array.IndexOf(CatPaint.Colors,r.color);
    p.Oval(x,y,72,22,r.id==0?"#ffc84e66":"#71603b2a");float alpha=r.invincible>0?.68f+.32f*Mathf.Pow(Mathf.Sin(age*18),2):1;
    if(r.boost>0||r.itemBoost>0)for(int k=-1;k<=1;k++)p.Line(x+k*24,y+18,x+k*24,y+50,4,"#fff4a1");
    float turn=(r.laneFrom-r.laneTarget)*(1-Mathf.Min(1,r.laneAge/r.laneDuration));p.RaceCat(r.id,row,frame,x,y+r.y*.65f,152,r.anim,phase=="run"&&r.finish<0?1:0,turn,alpha);
    if(r.shield>0)p.Ring(x,y+r.y*.65f-65,63,76,3,"#b1f0ff");if(r.id==0)p.Label("你",x-30,y+r.y*.65f-165,60,32,18,"#6c4f27");
   }));}
   draw.Sort((a,b)=>b.Key.CompareTo(a.Key));foreach(var d in draw)d.Value();
   if(phase=="countdown"){p.Oval(300,365,122,122,"#fff8e9ef");p.Label(Mathf.CeilToInt(countdown).ToString(),230,303,140,124,68,"#cc8b36");}
  }
 }
}
