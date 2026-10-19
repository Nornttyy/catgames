using System;
using System.Collections.Generic;
using UnityEngine;

namespace CatGames {
 public sealed class JumpGame:MiniGame {
  public const float Gravity=1100,Launch=560,ChargeTime=1.1f;
  public sealed class Hazard {public float x,w;public int count;public bool cleared;}
  public readonly List<Hazard> hazards=new List<Hazard>();
  public string phase="ready",color;public float x=140,y,vx,vy,charge,camera,landTime,deathTime;public int jumps,cleared,streak,bestStreak;
  int nextId=1,hitFrame;readonly Func<float> random;readonly CatSilhouettes masks;
  public JumpGame(string cat,CatSilhouettes hit,Func<float> rng=null){color=cat;masks=hit;random=rng??(()=>UnityEngine.Random.value);for(int i=0;i<6;i++)AddHazard();}
  public static float Speed(float charge)=>80+360*Mathf.Clamp01(charge/ChargeTime);
  public int CurrentFrame=>phase=="charge"?12+Mathf.Min(3,(int)(charge/.17f)):phase=="air"?(vy<0?6:7):phase=="dead"?hitFrame:landTime>0?13:Frame("idle",age);
  void AddHazard(){int id=nextId++;float d=Mathf.Min(1,(id-1)/35f);int count=id<4?1:random()<d*.48f?2:1;float w=72*count,gap=id<3?210:140+random()*(100-d*32);var last=hazards.Count>0?hazards[hazards.Count-1]:null;hazards.Add(new Hazard{x=last==null?340:last.x+last.w/2+gap+w/2,w=w,count=count});}
  public override void Action(string action){
   if(ended||phase=="dead")return;
   if(action=="down"&&phase=="ready"&&!Check()){charge=0;phase="charge";Check();}
   if(action=="up"&&phase=="charge"&&!Check()){vx=Speed(charge);vy=-Launch;phase="air";landTime=0;Check();Emit("jump");}
   if(action=="cancel"&&phase=="charge"){phase="ready";charge=0;}
  }
  bool Check(){if(phase=="dead"||ended)return false;foreach(var h in hazards)if(masks.Hits(color,CurrentFrame,x,y,h.x-h.w/2,h.count)){hitFrame=CurrentFrame;phase="dead";charge=0;deathTime=0;vx=-65;vy=-240;Emit("bonk");return true;}return false;}
  void Land(){y=vy=vx=charge=0;phase="ready";landTime=.19f;jumps++;if(Check())return;int count=0;float left=masks.Left(color,CurrentFrame,x);foreach(var h in hazards)if(!h.cleared&&left>h.x+h.w/2){h.cleared=true;count++;}streak=count>0?streak+count:0;bestStreak=Mathf.Max(bestStreak,streak);cleared+=count;score+=count+(count>1?1:0);Emit(count>1?"perfect":"land",null,count,x,y);hazards.RemoveAll(h=>h.x+h.w/2<x-650);while(hazards[hazards.Count-1].x<x+1700)AddHazard();}
  public override void Update(float dt,float direction){
   if(ended)return;float left=Mathf.Min(.1f,dt);
   while(left>0&&!ended){float speed=phase=="air"?Mathf.Max(Mathf.Abs(vx),Mathf.Abs(vy)+Gravity/120):0;float sub=Mathf.Min(left,speed>0?Mathf.Min(1f/120,1/speed):1f/120);Step(sub);left-=sub;}
  }
  void Step(float dt){age+=dt;landTime=Dec(landTime,dt);if(phase=="charge")charge=Mathf.Min(ChargeTime,charge+dt);Check();
   if(phase=="air"){x+=vx*dt;y+=vy*dt+.5f*Gravity*dt*dt;vy+=Gravity*dt;Check();if(phase=="air"&&vy>0&&y>=0)Land();}
   else if(phase=="dead"){deathTime+=dt;x+=vx*dt;y+=vy*dt;vy+=Gravity*dt;if(y>0){y=0;vy=0;vx*=.8f;}if(deathTime>.7f)Finish(false,"碰到尖刺了");}
   if(phase!="dead")camera+=(Mathf.Max(0,x-140)-camera)*(1-Mathf.Exp(-8*dt));
  }
  public override void Draw(CatPaint p,string selected){
   p.Rect(0,0,600,900,"#8ddcf6");var yard=p.art["jump-yard"];float w=1100,h=w*yard.height/yard.width,yy=470-h*.6f,xx=-(camera*.16f%w)-110;p.Rect(0,yy+h-2,600,900,"#8fda7e");for(int i=0;i<2;i++)p.Image("jump-yard",xx+i*w,yy,w,h);
   var grass=p.art["jump-grass"];float gh=1050f*grass.height/grass.width,start=Mathf.Floor(camera/1050)*1050;p.Rect(0,596+gh-18,600,900,"#8dce50");for(int i=-1;i<2;i++)p.Image("jump-grass",start+i*1050-camera,582,1050,gh);
   foreach(var b in hazards)if(b.x+b.w/2>camera-100&&b.x-b.w/2<camera+700)for(int i=0;i<b.count;i++)p.Image("jump-spikes",b.x-b.w/2+i*72-camera,596-CatSilhouettes.SpikeHeight,72,CatSilhouettes.SpikeHeight);
   p.Oval(x-camera,598,66,10,"#466c4933");p.Cat(color,x-camera,596+y,150,CurrentFrame,rotation:phase=="dead"?-Mathf.Min(.7f,deathTime)*86:0);
   if(phase=="charge")p.Bar(x-camera-47,616,94,charge/ChargeTime,"#ffd16c",7);
  }
 }
 public sealed class CatSilhouettes {
  public const float SpikeHeight=72f*174/512;
  sealed class Mask {public int w,h,left,right,top,bottom;public bool[] solid;}
  readonly Dictionary<string,Mask[]> cats=new Dictionary<string,Mask[]>();readonly Mask spike;
  static Mask Make(Texture2D t,Rect r,int w,int h){
   var px=t.GetPixels32();var m=new Mask{w=w,h=h,left=w,right=0,top=h,bottom=0,solid=new bool[w*h]};
   for(int y=0;y<h;y++)for(int x=0;x<w;x++){int sx=Mathf.Clamp((int)(r.x+(x+.5f)*r.width/w),0,t.width-1),sy=Mathf.Clamp(t.height-1-(int)(r.y+(y+.5f)*r.height/h),0,t.height-1);bool hit=px[sy*t.width+sx].a>=96;m.solid[y*w+x]=hit;if(hit){m.left=Mathf.Min(m.left,x);m.right=Mathf.Max(m.right,x+1);m.top=Mathf.Min(m.top,y);m.bottom=Mathf.Max(m.bottom,y+1);}}return m;
  }
  public CatSilhouettes(Dictionary<string,Texture2D> art){foreach(var color in CatPaint.Colors){var frames=new Mask[16];for(int f=0;f<16;f++)frames[f]=Make(art["cat-"+color],new Rect(f%4*360,f/4*310,360,310),150,130);cats[color]=frames;}var t=art["jump-spikes"];spike=Make(t,new Rect(0,0,t.width,t.height),72,25);}
  public float Left(string color,int frame,float x)=>x-215*150f/360+cats[color][frame].left;
  public bool Hits(string color,int frame,float x,float y,float spikeLeft,int count){
   var a=cats[color][frame];float ax=x-215*150f/360,ay=y-290*150f/360,sy=(310*150f/360)/a.h,by=-SpikeHeight,bs=SpikeHeight/spike.h;
   for(int c=0;c<count;c++){float bx=spikeLeft+c*72;if(ax+a.right<=bx+spike.left||ax+a.left>=bx+spike.right||ay+a.bottom*sy<=by+spike.top*bs||ay+a.top*sy>=by+spike.bottom*bs)continue;
    int start=Mathf.Max(a.top,Mathf.FloorToInt((by-ay)/sy)),end=Mathf.Min(a.bottom,Mathf.CeilToInt((by+SpikeHeight-ay)/sy));
    for(int row=start;row<end;row++){int y0=Mathf.Max(spike.top,Mathf.FloorToInt((ay+row*sy-by)/bs)),y1=Mathf.Min(spike.bottom,Mathf.CeilToInt((ay+(row+1)*sy-by)/bs));
     for(int col=a.left;col<a.right;col++)if(a.solid[row*a.w+col]){int x0=Mathf.Max(spike.left,Mathf.FloorToInt(ax+col-bx)),x1=Mathf.Min(spike.right,Mathf.CeilToInt(ax+col+1-bx));for(int ry=y0;ry<y1;ry++)for(int rx=x0;rx<x1;rx++)if(spike.solid[ry*spike.w+rx])return true;}
    }
   }return false;
  }
 }
}
