using System;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

namespace CatGames {
 public sealed class CatPress:MonoBehaviour,IPointerDownHandler,IPointerUpHandler,IPointerExitHandler {
  public Action down,up;bool held;
  public void OnPointerDown(PointerEventData e){if(e.button!=PointerEventData.InputButton.Left)return;var b=GetComponent<Button>();if(b&&!b.IsInteractable())return;held=true;down?.Invoke();}
  public void OnPointerUp(PointerEventData e){if(!held)return;held=false;up?.Invoke();}
  public void OnPointerExit(PointerEventData e){}
  void OnDisable(){if(held){held=false;up?.Invoke();}}
 }
 public sealed class CatMovePad:MonoBehaviour,IPointerDownHandler,IPointerUpHandler,IDragHandler,IInitializePotentialDragHandler {
  public Action<float> changed;readonly System.Collections.Generic.Dictionary<int,float> fingers=new System.Collections.Generic.Dictionary<int,float>();
  public void OnInitializePotentialDrag(PointerEventData e){e.useDragThreshold=false;}
  void Set(PointerEventData e){RectTransformUtility.ScreenPointToLocalPointInRectangle((RectTransform)transform,e.position,e.pressEventCamera,out var p);var r=((RectTransform)transform).rect;float previous=fingers.TryGetValue(e.pointerId,out var n)?n:0;fingers[e.pointerId]=p.x<r.xMin-24||p.x>r.xMax+24||p.y<r.yMin-28||p.y>r.yMax+28?0:Mathf.Abs(p.x-r.center.x)<5&&previous!=0?previous:p.x<r.center.x?-1:1;Notify();}
  void Notify(){float total=0;foreach(float value in fingers.Values)total+=value;changed?.Invoke(Mathf.Clamp(total,-1,1));}
  public void OnPointerDown(PointerEventData e){if(e.button==PointerEventData.InputButton.Left)Set(e);}
  public void OnDrag(PointerEventData e){if(fingers.ContainsKey(e.pointerId))Set(e);}
  public void OnPointerUp(PointerEventData e){fingers.Remove(e.pointerId);Notify();}
  public void Reset(){fingers.Clear();Notify();}
  void OnDisable(){Reset();}
 }
 public sealed class CatUI {
  public readonly RectTransform root;readonly Font font;readonly CatPaint art;
  public CatUI(RectTransform root,Font f,CatPaint p){this.root=root;font=f;art=p;}
  public void Clear(){foreach(Transform c in root){c.gameObject.SetActive(false);UnityEngine.Object.Destroy(c.gameObject);}}
  static void Place(RectTransform r,Rect a){bool top=r.parent&&r.parent.GetComponent<Canvas>();float height=top&&r.name=="Panel"&&a.height>150?a.height*CatPaint.ViewHeight/900:a.height;float y=top?a.center.y*CatPaint.ViewHeight/900-height/2:a.y;r.anchorMin=r.anchorMax=new Vector2(0,1);r.pivot=new Vector2(0,1);r.anchoredPosition=new Vector2(a.x,-y);r.sizeDelta=new Vector2(a.width,height);}
  public Text Text(string value,Rect r,int size=24,string color="#40392e",Transform parent=null){var o=new GameObject(value,typeof(RectTransform));o.transform.SetParent(parent??root,false);var t=o.AddComponent<Text>();t.font=font;t.text=value;t.color=CatPaint.C(color);t.fontSize=size;t.fontStyle=FontStyle.Bold;t.alignment=TextAnchor.MiddleCenter;t.raycastTarget=false;t.verticalOverflow=VerticalWrapMode.Overflow;Place(t.rectTransform,r);return t;}
  public Image Panel(Rect r,string color,Transform parent=null){var o=new GameObject("Panel",typeof(RectTransform));o.transform.SetParent(parent??root,false);var i=o.AddComponent<Image>();i.sprite=art.Sprite("panel");i.type=Image.Type.Sliced;i.pixelsPerUnitMultiplier=100;i.color=CatPaint.C(color);i.raycastTarget=false;Place(i.rectTransform,r);return i;}
  public Image Plate(Rect r,string color){Panel(new Rect(r.x,r.y+7,r.width,r.height),"#9d9274");Panel(r,"#51483c");Panel(new Rect(r.x+2,r.y+2,r.width-4,r.height-4),"#fffef4");var p=Panel(new Rect(r.x+5,r.y+7,r.width-10,r.height-12),color);return p;}
  void Glyph(string kind,Rect r,Transform parent){var o=new GameObject("Control icon",typeof(RectTransform));o.transform.SetParent(parent,false);var g=o.AddComponent<CatGlyph>();g.kind=kind;g.color=CatPaint.C("#494133");g.raycastTarget=false;Place(g.rectTransform,r);}
  public Button Button(string title,Rect area,Action click,string fill="#fff8e8",int size=25,Action down=null,Action up=null){
   Panel(new Rect(area.x,area.y+6,area.width,area.height),"#5c503b");var panel=Panel(area,"#4b4437");panel.raycastTarget=true;
   Panel(new Rect(2,2,area.width-4,area.height-4),"#fff5d7",panel.transform);
   var face=Panel(new Rect(4,5,area.width-8,area.height-10),fill,panel.transform);face.gameObject.AddComponent<CatButtonGloss>();var button=panel.gameObject.AddComponent<Button>();button.targetGraphic=face;panel.gameObject.AddComponent<CatButtonMotion>();
   var c=button.colors;c.normalColor=Color.white;c.highlightedColor=new Color(1,1,.95f);c.pressedColor=new Color(.87f,.93f,.88f);c.disabledColor=new Color(.8f,.8f,.8f,.7f);c.fadeDuration=.07f;button.colors=c;if(click!=null)button.onClick.AddListener(()=>click());
   string icon=title=="◀"||title=="‹"?"left":title=="▶"||title=="›"?"right":title=="Ⅱ"?"pause":title=="♫"||title=="♪"?"music":title=="跳跃"?"jump":title=="冲撞"?"attack":title=="下钻"?"slide":title=="下台"?"drop":null;
   bool symbolOnly=icon=="left"||icon=="right"||icon=="pause"||icon=="music";
   if(symbolOnly)Glyph(icon,new Rect(area.width/2-20,area.height/2-20,40,40),panel.transform);
   else if(icon!=null&&area.height>=75){Glyph(icon,new Rect(area.width/2-22,9,44,40),panel.transform);Text(title,new Rect(3,area.height-39,area.width-6,30),Mathf.Min(size,20),parent:panel.transform);}
   else Text(title,new Rect(4,0,area.width-8,area.height),size,parent:panel.transform);
   if(down!=null||up!=null){var press=panel.gameObject.AddComponent<CatPress>();press.down=down;press.up=up;}return button;
  }
  public void Hit(Rect area,Action click){var o=new GameObject("猫咪换色",typeof(RectTransform));o.transform.SetParent(root,false);var i=o.AddComponent<Image>();i.color=Color.clear;Place(i.rectTransform,area);o.AddComponent<Button>().onClick.AddListener(()=>click());}
  public CatMovePad MovePad(Rect r,Action<float> changed){var bg=Plate(r,"#fff2d5");bg.raycastTarget=true;Glyph("left",new Rect(r.width/4-21,r.height/2-21,42,42),bg.transform);Glyph("right",new Rect(r.width*3/4-21,r.height/2-21,42,42),bg.transform);Panel(new Rect(r.width/2-1,22,2,r.height-44),"#d4c8aa",bg.transform);var pad=bg.gameObject.AddComponent<CatMovePad>();pad.changed=changed;bg.gameObject.AddComponent<CatButtonMotion>();return pad;}
 }
}
