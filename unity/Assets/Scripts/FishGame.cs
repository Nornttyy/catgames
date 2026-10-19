using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace CatGames {
 public sealed class FishGame:MiniGame {
  public static readonly Vector2 Home=new Vector2(114,608);public Vector2 paw=Home,target=Home;public readonly List<Vector2> path=new List<Vector2>{Home};public bool dragging,returning;
  public sealed class Dish {public string kind;public float x,baseX,w,h,wobble;public bool moving;}
  public sealed class Snack {public float x,y,baseX,phase,drift;public int state,value=100;public bool golden;}
  public readonly List<Dish> dishes=new List<Dish>();public readonly List<Snack> snacks=new List<Snack>(),bag=new List<Snack>();
  public int caught,mistakes,board,trips,bestHaul;public float cooldown,hitCooldown,boardAge,ownerTime=6.3f,ownerDuration=6.3f,suspicion,noise;public string owner="away",tutorial;public bool seen;readonly int[] order={0,1,2,3,4,5};
  public FishGame(bool teach){time=65;tutorial=teach?"reach":null;for(int i=5;i>1;i--){int j=UnityEngine.Random.Range(1,i+1);int t=order[i];order[i]=order[j];order[j]=t;}Board(teach);}
  static Dish Make(string kind,float x,bool moving=false){float w=84,h=63;if(kind=="bowls")h=84*420f/404;if(kind=="bowls-low")h=40.5f;if(kind=="bowls-tall")h=151.5f;if(kind=="thermos-tall"){w=56;h=180.25f;}return new Dish{kind=kind,x=x,baseX=x,w=w,h=h,moving=moving};}
  static string Key(string kind)=>kind=="mug"?"mug-side":kind=="bowls"?"bowl-stack":kind;
  void Board(bool teach=false){dishes.Clear();snacks.Clear();boardAge=0;int v=order[board%6];string[][] kinds={new[]{"mug","bowls"},new[]{"bowls-tall","mug"},new[]{"mug","thermos-tall"},new[]{"bowls","bowls-tall"},new[]{"thermos-tall","mug"},new[]{"mug","bowls-tall"}};if(teach)dishes.Add(Make("mug",322));else{dishes.Add(Make(kinds[v][0],310,v==5));dishes.Add(Make(kinds[v][1],450,v==1||v==4));}
   string[][] stands={new string[]{null,null,null},new[]{null,"bowls",null},new[]{null,null,"bowls-low"},new[]{null,"bowls",null},new[]{null,"bowls-low","bowls"},new string[]{null,null,null}};
   for(int i=0;i<(teach?1:Mathf.Min(3,12-caught));i++){float x=teach?488:new[]{244,381,526}[i],y=590;string stand=teach?null:stands[v][i];if(stand!=null){var dish=Make(stand,x);dishes.Add(dish);y=620-dish.h-25;}snacks.Add(new Snack{x=x,baseX=x,y=y,phase=i*1.7f,golden=!teach&&i==2,value=!teach&&i==2?180:100,drift=!teach&&y==590?(board>0?9:5):0});}
  }
  public int Haul=>Mathf.RoundToInt(bag.Sum(f=>f.value)*new[]{0,1,1.5f,2}[bag.Count]);
  public override void Pointer(Vector2 p,int phase){if(ended)return;if(phase==0){if(cooldown==0&&!returning&&Vector2.Distance(p,paw)<75)dragging=true;}if(phase==1&&dragging)target=new Vector2(Clamp(p.x,85,550),Clamp(p.y,375,620));if(phase==2&&dragging)Action("return");}
  public override void Action(string a){if(a=="return"){dragging=false;returning=true;target=Home;}if(a=="skip"){tutorial=null;Emit("learned");}}
  Dish Obstacle(Vector2 p)=>dishes.Find(d=>p.x>d.x-d.w*.42f-12&&p.x<d.x+d.w*.42f+12&&p.y>620-d.h-4&&p.y<635);
  void Collect(){if(bag.Count>=3||returning||!dragging)return;var f=snacks.Find(n=>n.state==0&&Vector2.Distance(paw,new Vector2(n.x,n.y))<29);if(f==null)return;f.state=1;bag.Add(f);Emit("grab",null,bag.Count,paw.x,paw.y);if(tutorial!=null)tutorial="return";}
  bool Move(Vector2 dest,float budget,bool back=false){float distance=Vector2.Distance(paw,dest);if(distance<.01f){if(!back)Collect();return true;}float length=Mathf.Min(distance,budget);Vector2 dir=(dest-paw)/distance;for(float d=0;d<length;){float step=Mathf.Min(3,length-d);Vector2 next=paw+dir*step;var hit=Obstacle(next);if(hit!=null&&!back){if(hitCooldown==0){hitCooldown=.55f;hit.wobble=.55f;noise=Mathf.Clamp01(noise+.32f);if(owner=="away")ownerTime=Mathf.Min(ownerTime,1.1f);Emit("clink");}return false;}paw=next;d+=step;if(!back&&Vector2.Distance(paw,path[path.Count-1])>=6){for(int i=path.Count-3;i>=0;i--)if(Vector2.Distance(paw,path[i])<8){path.RemoveRange(i+1,path.Count-i-1);break;}path.Add(paw);}if(!back)Collect();}return length>=distance-.01f;}
  void Reset(){paw=target=Home;returning=dragging=false;bag.Clear();path.Clear();path.Add(Home);}
  void Owner(string phase,float duration){owner=phase;ownerTime=ownerDuration=duration;seen=false;}
  void Deliver(){int count=bag.Count,n=Haul;foreach(var f in bag)f.state=2;Reset();if(count==0)return;caught+=count;score+=n;bestHaul=Mathf.Max(bestHaul,count);trips++;cooldown=.4f;Emit("fish",null,n,Home.x,Home.y);if(caught>=12){Finish(true,"鱼干到手");return;}if(snacks.All(s=>s.state==2)){if(tutorial!=null){tutorial=null;Emit("learned");}else board++;Board();Owner("away",Mathf.Max(4.9f,6.3f-board*.28f));suspicion=0;}}
  public override void Update(float dt,float direction){if(ended)return;dt=Mathf.Min(.05f,dt);age+=dt;boardAge+=dt;cooldown=Dec(cooldown,dt);hitCooldown=Dec(hitCooldown,dt);foreach(var d in dishes){d.wobble=Dec(d.wobble,dt);if(d.moving)d.x=d.baseX+Mathf.Sin(boardAge*1.7f)*9;}foreach(var f in snacks)if(f.state==0)f.x=f.baseX+Mathf.Sin(boardAge*1.3f+f.phase)*f.drift;
   if(returning){float budget=650*dt;while(path.Count>0&&budget>0){var dest=path[path.Count-1];float distance=Vector2.Distance(paw,dest);bool done=Move(dest,budget,true);budget-=distance;if(done)path.RemoveAt(path.Count-1);else break;}if(path.Count==0)Deliver();}else if(dragging){Move(target,650*dt);if(bag.Count>0&&Vector2.Distance(paw,Home)<23)Deliver();}
   if(ended||tutorial!=null)return;time=Dec(time,dt);ownerTime-=dt;noise=Dec(noise,dt*.07f);if(ownerTime<=0){if(owner=="away"){Owner("warning",1.8f);Emit("warning");}else if(owner=="warning")Owner("look",1.6f+board*.12f);else Owner("away",Mathf.Max(4.6f,6.1f-board*.25f+UnityEngine.Random.value*.6f-noise*.7f));}seen=owner=="look"&&!(bag.Count==0&&Vector2.Distance(paw,Home)<22);suspicion=Clamp(suspicion+dt*(seen?125:-80),0,100);if(suspicion>=100){foreach(var f in bag)f.state=0;Reset();mistakes++;time=Dec(time,4);cooldown=.65f;suspicion=0;Owner("away",4.8f);Emit("spotted");if(mistakes>=3)Finish(false,"被发现了");}if(time<=0&&!ended)Finish(false,"时间到");
  }
  public override void Draw(CatPaint p,string color){p.Image("kitchen-side",0,0,600,620/(990f/1536));p.Bottom("owner-"+(owner=="away"?0:owner=="warning"?1:2),443,620,130);if(owner=="warning")p.Label("!",500,373,60,60,40,"#c77924");
   string fur=color=="orange"?"#fff8ef":color=="cream"?"#fff3d5":color=="black"?"#303033":"#ebe5da";Vector2 last=new Vector2(110,581);foreach(var point in path){p.Line(last.x,last.y,point.x,point.y,30,"#292723");last=point;}p.Line(last.x,last.y,paw.x,paw.y,30,"#292723");last=new Vector2(110,581);foreach(var point in path){p.Line(last.x,last.y,point.x,point.y,22,fur);last=point;}p.Line(last.x,last.y,paw.x,paw.y,22,fur);
   foreach(var d in dishes)p.Image(Key(d.kind),d.x-d.w/2,620-d.h,d.w,d.h,rotation:d.wobble>0?Mathf.Sin(d.wobble*42)*5*d.wobble/.55f:0);
   foreach(var f in snacks){p.Oval(f.x,f.y+25,83,14,f.golden?"#fff0b5":"#fff9e9");if(f.state==0)p.Bottom("fish-snack",f.x,f.y+23,78);}
   p.Image("cat-fish-"+color,126-215*240f/360,620-290*240f/360,240,310*240f/360);p.Image("paw-round-"+color,paw.x-24,paw.y-19,48,38,rotation:bag.Count>0?-8:0);
   for(int i=0;i<bag.Count;i++)p.Bottom("fish-snack",paw.x+10+i*12,paw.y-15-i*10,44);
   p.Bar(472,438,110,Mathf.Clamp01(ownerTime/ownerDuration),owner=="away"?"#79cfad":owner=="warning"?"#f3ba58":"#ee8d74",5);
  }
 }
}
