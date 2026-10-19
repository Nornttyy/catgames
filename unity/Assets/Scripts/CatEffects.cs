using UnityEngine;
namespace CatGames {
 public static class CatEffects {
  static readonly Vector2[] Splash={new Vector2(-.3f,-.22f),new Vector2(-.46f,-1.1f),new Vector2(.1f,-.5f),new Vector2(.65f,-1.06f),new Vector2(.52f,-.24f),new Vector2(1.12f,-.15f),new Vector2(.58f,.23f),new Vector2(.65f,.97f),new Vector2(.07f,.54f),new Vector2(-.44f,.85f),new Vector2(-.28f,.2f),new Vector2(-.87f,.1f)};
  public static void Footfall(CatPaint p,float x,float y,float t){float outwards=12+26*t,w=19*(1-t);if(w<1)return;for(int side=-1;side<=1;side+=2){p.Oval(x+outwards*side,y-3-7*t,w+3,w*.55f+3,"#b19b6f90");p.Oval(x+outwards*side,y-4-7*t,w,w*.55f,"#fff6dcbb");}}
  public static void Pickup(CatPaint p,float x,float y,float t,string kind){float fade=Mathf.Clamp01((1-t)*3),pop=1+Mathf.Sin(Mathf.Clamp01(t*3)*Mathf.PI)*.18f;y-=t*35;
   if(kind=="food"){var ps=new[]{new Vector2(-5,-16),new Vector2(5,-16),new Vector2(5,-5),new Vector2(16,-5),new Vector2(16,5),new Vector2(5,5),new Vector2(5,16),new Vector2(-5,16),new Vector2(-5,5),new Vector2(-16,5),new Vector2(-16,-5),new Vector2(-5,-5)};for(int i=0;i<ps.Length;i++)ps[i]=new Vector2(x,y)+ps[i]*pop;p.Polygon(ps,"#539673",fade);}
   else{float size=34*pop;p.Bottom("item-"+kind,x,y+size/2,size,fade);}
   if(t<.5f){float d=25+9*t;p.Line(x-d,y+5,x-d+4,y-3,2,"#fffbed");p.Line(x+d-4,y-3,x+d,y-9,2,"#fffbed");}
  }
  public static void Impact(CatPaint p,float x,float y,float age,bool shield,bool power){float t=Mathf.Clamp01(age/.35f),expand=1-Mathf.Pow(1-Mathf.Clamp01(t*3.5f),3),fade=Mathf.Clamp01((1-t)/.66f),r=12+expand*32;if(shield){for(int j=0;j<3;j++){float start=j*Mathf.PI*2/3-.4f;for(int n=0;n<8;n++){float a=start-.6f+n*.15f,b=a+.15f;p.Line(x+Mathf.Cos(a)*r,y+Mathf.Sin(a)*r,x+Mathf.Cos(b)*r,y+Mathf.Sin(b)*r,5*(1-t)+1,"#b5f1ff");}}return;}var points=new Vector2[Splash.Length];for(int i=0;i<points.Length;i++)points[i]=new Vector2(x,y)+Splash[i]*(r+2);p.Polygon(points,"#885f39",fade);for(int i=0;i<points.Length;i++)points[i]=new Vector2(x,y)+Splash[i]*r;p.Polygon(points,t<.16f?"#fffbed":power?"#ffa663":"#ffd580",fade);if(t<.45f)p.Oval(x+1,y-2,12+expand*10,26+expand*10,"#fffef6");}
  public static void Dash(CatPaint p,float x,float y,int facing,float progress,bool power){float fade=Mathf.Sin(Mathf.Clamp01(progress)*Mathf.PI);var points=new[]{new Vector2(-17,-65),new Vector2(-49,-66),new Vector2(-81,-59),new Vector2(-119,-45),new Vector2(-79,-48),new Vector2(-40,-43),new Vector2(-19,-40),new Vector2(-29,-52)};for(int i=0;i<points.Length;i++)points[i]=new Vector2(x+points[i].x*facing,y+points[i].y);p.Polygon(points,power?"#ffb970":"#fff1be",.85f*fade);p.Line(x-30*facing,y-55,x-92*facing,y-47,3*fade,"#fffef3");}
 }
}
