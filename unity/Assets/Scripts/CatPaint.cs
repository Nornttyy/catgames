using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace CatGames {
 // A pooled native 2D renderer: every texture/frame is an actual Unity sprite.
 public sealed class CatPaint {
  public static float ViewHeight=900;
  public static float Extra=>ViewHeight-900;
  public float OffsetY,Zoom=1;public bool Overlay;
  public static readonly string[] Colors={"gray","orange","cream","black"};
  public readonly Dictionary<string,Texture2D> art=new Dictionary<string,Texture2D>();
  readonly Dictionary<string,Sprite> sprites=new Dictionary<string,Sprite>();
  readonly List<SpriteRenderer> pool=new List<SpriteRenderer>(); readonly List<Text> labels=new List<Text>();
  readonly Transform parent;readonly RectTransform textRoot;readonly Font font;int used,words,drawOrder,polygonCount;readonly List<MeshFilter> polygons=new List<MeshFilter>();
  readonly Dictionary<string,float[]> feet=new Dictionary<string,float[]>();readonly Dictionary<int,CatTailMesh> tails=new Dictionary<int,CatTailMesh>();
  public CatPaint(Transform p,RectTransform root,Font f){parent=p;textRoot=root;font=f;art["solid"]=Texture2D.whiteTexture;art["circle"]=Shape(false);art["panel"]=Shape(true);}
  static Texture2D Shape(bool round){var t=new Texture2D(64,64,TextureFormat.RGBA32,false);var pixels=new Color32[4096];for(int y=0;y<64;y++)for(int x=0;x<64;x++){float dx=Mathf.Abs(x-31.5f),dy=Mathf.Abs(y-31.5f);float d=round?Mathf.Sqrt(Mathf.Pow(Mathf.Max(0,dx-17),2)+Mathf.Pow(Mathf.Max(0,dy-17),2))-14:Mathf.Sqrt(dx*dx+dy*dy)-31;pixels[y*64+x]=new Color(1,1,1,Mathf.Clamp01(.5f-d));}t.SetPixels32(pixels);t.Apply();t.wrapMode=TextureWrapMode.Clamp;return t;}
  public static Color C(string hex){ColorUtility.TryParseHtmlString(hex,out var c);return c;}
  public void Begin(){used=0;words=0;drawOrder=0;polygonCount=0;foreach(var tail in tails.Values)tail.Hide();} public void End(){for(int i=used;i<pool.Count;i++)pool[i].enabled=false;for(int i=words;i<labels.Count;i++)labels[i].enabled=false;for(int i=polygonCount;i<polygons.Count;i++)polygons[i].GetComponent<MeshRenderer>().enabled=false;}
  public Sprite Sprite(string key,int frame=-1,int cols=4,int rows=4){
   string cache=key+":"+frame+":"+cols+":"+rows;if(sprites.TryGetValue(cache,out var ready))return ready;
   if(!art.TryGetValue(key,out var t))return null;
   var rect=frame<0?new Rect(0,0,t.width,t.height):new Rect(frame%cols*(t.width/(float)cols),(rows-1-frame/cols)*(t.height/(float)rows),t.width/(float)cols,t.height/(float)rows);
   var sprite=UnityEngine.Sprite.Create(t,rect,new Vector2(.5f,.5f),1,0,SpriteMeshType.FullRect,key=="panel"?new Vector4(20,20,20,20):Vector4.zero);sprites[cache]=sprite;return sprite;
  }
  public void Image(string key,float x,float y,float w,float h,Color? tint=null,int frame=-1,int cols=4,int rows=4,float rotation=0,bool flip=false,bool screen=false){
   var sp=Sprite(key,frame,cols,rows);if(sp==null)return;
   SpriteRenderer r;if(used==pool.Count){var o=new GameObject("Sprite "+used);o.transform.SetParent(parent);r=o.AddComponent<SpriteRenderer>();pool.Add(r);}else r=pool[used];
   float z=Overlay||screen?1:Zoom,cx=(x+w/2)*z,cy=screen?y+h/2:Overlay?(y+h/2)*ViewHeight/900:(y+h/2-700)*Zoom+700+OffsetY;
   used++;r.enabled=true;r.sprite=sp;r.color=tint??Color.white;r.sortingOrder=drawOrder++;r.flipX=flip;r.drawMode=key=="panel"?SpriteDrawMode.Sliced:SpriteDrawMode.Simple;r.size=new Vector2(w*z,h*z);r.transform.position=new Vector3(cx-300,ViewHeight/2-cy,0);r.transform.localScale=key=="panel"?Vector3.one:new Vector3(w*z/sp.rect.width,h*z/sp.rect.height,1);r.transform.rotation=Quaternion.Euler(0,0,-rotation);
  }
  public void Fit(string key,Rect area){if(!art.TryGetValue(key,out var t))return;float k=Mathf.Min(area.width/t.width,area.height/t.height);Image(key,area.center.x-t.width*k/2,area.center.y-t.height*k/2,t.width*k,t.height*k);}
  public void Cover(string key){if(!art.TryGetValue(key,out var t))return;float k=Mathf.Max(600f/t.width,ViewHeight/t.height);Image(key,(600-t.width*k)/2,(ViewHeight-t.height*k)/2,t.width*k,t.height*k,screen:true);}
  public void Bottom(string key,float x,float bottom,float w,float alpha=1,float rotation=0){if(!art.TryGetValue(key,out var t))return;Image(key,x-w/2,bottom-w*t.height/t.width,w,w*t.height/t.width,new Color(1,1,1,alpha),rotation:rotation);}
  public void Cat(string color,float x,float foot,float w,int frame=0,int facing=1,float alpha=1,float rotation=0){if(frame>=16){string key="side-stride-"+color;var t=art[key];float fw=t.width/4f,fh=t.height/3f,k=w/fw;int f=Mathf.Clamp(frame-16,0,11);if(!feet.TryGetValue(key,out var bottoms)){bottoms=new float[12];var data=t.GetPixels32();for(int n=0;n<12;n++){int sx=n%4*(int)fw,sy=(2-n/4)*(int)fh;bottoms[n]=fh;for(int y=sy;y<sy+fh;y++){int count=0;for(int xx=sx;xx<sx+fw;xx++)if(data[y*t.width+xx].a>100)count++;if(count>6){bottoms[n]=fh-(y-sy);break;}}}feet[key]=bottoms;}Image(key,x-w*(facing>0?.60f:.40f),foot-bottoms[f]*k,w,fh*k,new Color(1,1,1,alpha),f,4,3,rotation,facing<0);return;}float oldK=w/360f;float left=facing>0?x-215*oldK:x-145*oldK;Image("cat-"+color,left,foot-290*oldK,w,310*oldK,new Color(1,1,1,alpha),frame,rotation:rotation,flip:facing<0);}
  public void RaceCat(int id,int row,int frame,float x,float foot,float size,float time,float amount,float turn,float alpha){if(!tails.TryGetValue(id,out var mesh)){mesh=new CatTailMesh(parent,art["race-cats-back"]);tails[id]=mesh;}mesh.Draw(row,frame,x,foot+OffsetY,size,time,amount,turn,alpha,drawOrder++);}
  public void Polygon(Vector2[] points,string color,float alpha=1){MeshFilter filter;if(polygonCount==polygons.Count){var o=new GameObject("Comic shape",typeof(MeshFilter),typeof(MeshRenderer));o.transform.SetParent(parent);filter=o.GetComponent<MeshFilter>();filter.sharedMesh=new Mesh();filter.sharedMesh.MarkDynamic();var material=new Material(Shader.Find("Sprites/Default"));material.mainTexture=Texture2D.whiteTexture;o.GetComponent<MeshRenderer>().sharedMaterial=material;polygons.Add(filter);}else filter=polygons[polygonCount];polygonCount++;var vertices=new Vector3[points.Length+1];var triangles=new int[points.Length*3];var colors=new Color[vertices.Length];var uv=new Vector2[vertices.Length];Vector2 center=Vector2.zero;foreach(var point in points)center+=point;center/=points.Length;vertices[0]=new Vector3(center.x*Zoom-300,ViewHeight/2-((center.y-700)*Zoom+700+OffsetY));Color tint=C(color);tint.a*=alpha;for(int i=0;i<colors.Length;i++)colors[i]=tint;for(int i=0;i<points.Length;i++){vertices[i+1]=new Vector3(points[i].x*Zoom-300,ViewHeight/2-((points[i].y-700)*Zoom+700+OffsetY));triangles[i*3]=0;triangles[i*3+1]=i+1;triangles[i*3+2]=(i+1)%points.Length+1;}var mesh=filter.sharedMesh;mesh.Clear();mesh.vertices=vertices;mesh.triangles=triangles;mesh.uv=uv;mesh.colors=colors;var renderer=filter.GetComponent<MeshRenderer>();renderer.enabled=true;renderer.sortingOrder=drawOrder++;}
  public void PrepareScenery(){Loop("race-track-vertical","loop-garden");Loop("race-harbor","loop-harbor");foreach(string name in new[]{"brawl-kitchen","brawl-living"}){var t=art[name];var wall=new Texture2D(t.width,1,TextureFormat.RGBA32,false);wall.SetPixels(t.GetPixels(0,t.height-1,t.width,1));wall.Apply();wall.wrapMode=TextureWrapMode.Clamp;art[name+"-wall"]=wall;}}
  void Loop(string source,string key){var t=art[source];int overlap=Mathf.RoundToInt(t.height*.075f),height=t.height-overlap;var data=t.GetPixels32();var pixels=new Color32[t.width*height];Array.Copy(data,pixels,pixels.Length);for(int y=0;y<overlap;y++){float a=1-y/(float)overlap;for(int x=0;x<t.width;x++){int i=y*t.width+x;pixels[i]=Color.Lerp(pixels[i],data[(height+y)*t.width+x],a);}}var loop=new Texture2D(t.width,height,TextureFormat.RGBA32,false);loop.SetPixels32(pixels);loop.Apply();loop.wrapMode=TextureWrapMode.Clamp;art[key]=loop;}
  public void Rect(float x,float y,float w,float h,string color){bool full=x==0&&y==0&&w==600&&h==900;Image("solid",x,y,w,full?ViewHeight:h,C(color),screen:full);}
  public void Round(float x,float y,float w,float h,string color)=>Image("panel",x,y,w,h,C(color));
  public void Oval(float x,float y,float w,float h,string color)=>Image("circle",x-w/2,y-h/2,w,h,C(color));
  public void Line(float x,float y,float xx,float yy,float width,string color){var d=new Vector2(xx-x,yy-y);float length=d.magnitude;Image("solid",(x+xx-length)/2,(y+yy-width)/2,length,width,C(color),rotation:Mathf.Atan2(d.y,d.x)*Mathf.Rad2Deg);Oval(x,y,width,width,color);Oval(xx,yy,width,width,color);}
  public void Ring(float x,float y,float rx,float ry,float width,string color){for(int i=0;i<32;i++){float a=i*Mathf.PI/16,b=(i+1)*Mathf.PI/16;Line(x+Mathf.Cos(a)*rx,y+Mathf.Sin(a)*ry,x+Mathf.Cos(b)*rx,y+Mathf.Sin(b)*ry,width,color);}}
  public void Label(string value,float x,float y,float w=200,float h=40,int size=24,string color="#40392e",TextAnchor align=TextAnchor.MiddleCenter){
   Text t;if(words==labels.Count){var o=new GameObject("World label "+words,typeof(RectTransform));o.transform.SetParent(textRoot,false);t=o.AddComponent<Text>();t.font=font;t.raycastTarget=false;t.fontStyle=FontStyle.Bold;t.horizontalOverflow=HorizontalWrapMode.Wrap;t.verticalOverflow=VerticalWrapMode.Overflow;labels.Add(t);}else t=labels[words];words++;t.enabled=true;if(t.text!=value)t.text=value;t.fontSize=size;t.color=C(color);t.alignment=align;
   var r=t.rectTransform;r.anchorMin=r.anchorMax=new Vector2(0,1);r.pivot=new Vector2(0,1);float z=Overlay?1:Zoom,cy=Overlay?(y+h/2)*ViewHeight/900:(y+h/2-700)*Zoom+700+OffsetY;r.anchoredPosition=new Vector2(x*z,-cy+h*z/2);r.sizeDelta=new Vector2(w*z,h*z);t.fontSize=Mathf.RoundToInt(size*z);
  }
  public void Bar(float x,float y,float w,float value,string color="#79cfad",float height=12){Round(x,y,w,height+6,"#4d4a3c");if(value>0)Round(x+3,y+3,(w-6)*Mathf.Clamp01(value),height,color);}
 }
}
