using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
namespace CatGames {
 // Small, code-native control symbols: sharp at any phone resolution.
 public sealed class CatGlyph:MaskableGraphic {
  public string kind;
  protected override void OnPopulateMesh(VertexHelper h){
   h.Clear();var r=rectTransform.rect;float s=Mathf.Min(r.width,r.height)/40;
   Vector2 P(float x,float y)=>r.center+new Vector2(x,-y)*s;
   void Disk(Vector2 p,float radius){int start=h.currentVertCount;h.AddVert(p,color,Vector2.zero);for(int i=0;i<=12;i++){float a=i*Mathf.PI/6;h.AddVert(p+new Vector2(Mathf.Cos(a),Mathf.Sin(a))*radius,color,Vector2.zero);if(i>0)h.AddTriangle(start,start+i,start+i+1);}}
   void Line(float x,float y,float xx,float yy,float w=3.2f){var a=P(x,y);var b=P(xx,yy);var n=new Vector2(-(b-a).y,(b-a).x).normalized*w*s/2;int i=h.currentVertCount;h.AddVert(a+n,color,Vector2.zero);h.AddVert(b+n,color,Vector2.zero);h.AddVert(b-n,color,Vector2.zero);h.AddVert(a-n,color,Vector2.zero);h.AddTriangle(i,i+1,i+2);h.AddTriangle(i,i+2,i+3);Disk(a,w*s/2);Disk(b,w*s/2);}
   void Path(params Vector2[] ps){for(int i=1;i<ps.Length;i++)Line(ps[i-1].x,ps[i-1].y,ps[i].x,ps[i].y);}
   if(kind=="left"||kind=="right"){float d=kind=="left"?-1:1;Path(new Vector2(-5*d,-11),new Vector2(6*d,0),new Vector2(-5*d,11));}
   else if(kind=="pause"){Line(-6,-10,-6,10,5);Line(6,-10,6,10,5);}
   else if(kind=="jump"){Path(new Vector2(-10,1),new Vector2(0,-11),new Vector2(10,1));Line(0,-9,0,10);Line(-13,15,13,15,2.5f);}
   else if(kind=="slide"||kind=="drop"){Path(new Vector2(-8,0),new Vector2(0,9),new Vector2(8,0));Line(0,-10,0,7);Line(-14,-14,14,-14,2.5f);}
   else if(kind=="attack"){Path(new Vector2(-12,-9),new Vector2(0,-13),new Vector2(11,-5),new Vector2(7,7),new Vector2(-3,12),new Vector2(-11,3),new Vector2(-12,-9));Line(-17,-1,-11,-1,2);Line(-20,7,-14,7,2);Line(13,-12,17,-16,2);Line(15,0,20,0,2);}
   else if(kind=="music"){Path(new Vector2(-4,10),new Vector2(-4,-11),new Vector2(12,-15),new Vector2(12,6));Disk(P(-9,11),5*s);Disk(P(7,7),5*s);}
   else if(kind=="play"){Path(new Vector2(-6,-12),new Vector2(11,0),new Vector2(-6,12),new Vector2(-6,-12));}
  }
 }
 public sealed class CatButtonMotion:MonoBehaviour,IPointerDownHandler,IPointerUpHandler,IPointerExitHandler {
  RectTransform rect;Vector2 origin;float depth;bool held;int pointer;
  void Awake(){rect=(RectTransform)transform;}
  void Start(){origin=rect.anchoredPosition;}
  bool Active(){var b=GetComponent<Button>();return !b||b.IsInteractable();}
  public void OnPointerDown(PointerEventData e){if(e.button!=PointerEventData.InputButton.Left||!Active())return;held=true;pointer=e.pointerId;}
  public void OnPointerUp(PointerEventData e){if(e.pointerId==pointer)held=false;}
  public void OnPointerExit(PointerEventData e){if(e.pointerId==pointer)held=false;}
  void Update(){depth=Mathf.MoveTowards(depth,held&&Active()?4:0,Time.unscaledDeltaTime*85);rect.anchoredPosition=origin+Vector2.down*depth;}
  void OnDisable(){held=false;depth=0;}
 }
 public sealed class CatButtonGloss:BaseMeshEffect {
  public override void ModifyMesh(VertexHelper h){if(!IsActive())return;var r=((RectTransform)transform).rect;var v=new UIVertex();for(int i=0;i<h.currentVertCount;i++){h.PopulateUIVertex(ref v,i);float t=Mathf.InverseLerp(r.yMin,r.yMax,v.position.y);Color c=v.color;v.color=Color.Lerp(c,Color.Lerp(c,Color.white,.28f),t);h.SetUIVertex(v,i);}}
 }
}
