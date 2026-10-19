using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

namespace CatGames {
 public sealed class CatWorld:MonoBehaviour {
  public static readonly string[] Titles={"桌子捣蛋","偷吃鱼干","小猫跳一跳","猫猫跑酷赛","猫咪大乱斗"};
  public CatPaint paint;public CatSave save;public MiniGame game;public string screen="loading";public Mode mode;public CatSound sound;public bool paused;
  CatUI ui;CatSilhouettes masks;Camera cam;Font font;float clock,loadProgress,petUntil;float heldLeft,heldRight;bool dragging;Vector2 pointerStart;string loadingError;Button jumpButton,attackButton,dropButton;Text jumpText,attackText;CatMovePad movePad;float moveDirection;readonly Dictionary<string,float> actions=new Dictionary<string,float>();int lastW,lastH;
  readonly List<Tuple<Vector2,float,string>> feedback=new List<Tuple<Vector2,float,string>>();
  void Awake(){
   Application.targetFrameRate=60;QualitySettings.vSyncCount=0;save=CatSave.Load();mode=(Mode)save.mode;
   #if !UNITY_WEBGL
   Screen.orientation=ScreenOrientation.Portrait;
   #endif
   cam=new GameObject("Portrait 2D Camera").AddComponent<Camera>();cam.transform.position=new Vector3(0,0,-10);cam.orthographic=true;cam.orthographicSize=450;cam.clearFlags=CameraClearFlags.SolidColor;cam.backgroundColor=CatPaint.C("#d6eddb");cam.gameObject.AddComponent<AudioListener>();
   font=Resources.Load<Font>("Fonts/CatSans");var labels=Canvas("World labels",30000);var controls=Canvas("Touch HUD",31000);paint=new CatPaint(transform,labels,font);ui=new CatUI(controls,font,paint);
   if(!FindFirstObjectByType<EventSystem>()){var es=new GameObject("Touch and keyboard events");es.AddComponent<EventSystem>();es.AddComponent<StandaloneInputModule>();}
   sound=gameObject.AddComponent<CatSound>();sound.Init(save.muted);Layout();BuildUI();StartCoroutine(Load());
  }
  RectTransform Canvas(string name,int order){var o=new GameObject(name,typeof(RectTransform));var c=o.AddComponent<Canvas>();c.renderMode=RenderMode.ScreenSpaceCamera;c.worldCamera=cam;c.planeDistance=1;c.sortingOrder=order;var scaler=o.AddComponent<CanvasScaler>();scaler.uiScaleMode=CanvasScaler.ScaleMode.ConstantPixelSize;scaler.scaleFactor=cam.pixelWidth/600f;scaler.referenceResolution=new Vector2(600,900);scaler.screenMatchMode=CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;scaler.matchWidthOrHeight=0;o.AddComponent<GraphicRaycaster>();return (RectTransform)o.transform;}
  IEnumerator Load(){
   string[] files={"title-catgames","cat-"+save.color,"fish-snack","menu-nook","jump-yard","jump-grass","jump-spikes","race-track-vertical","race-cats-back","race-hurdle","race-gate","brawl-kitchen","brawl-shelf","item-food","item-shield","item-pepper","item-speed","room-side","kitchen-side","table-side","mug-side","bottle-side","books-side","duck-side","cushion-side","popcorn-side","bowl-stack","bowls-low","bowls-tall","thermos-tall","owner-0","owner-1","owner-2","cat-gray","cat-orange","cat-cream","cat-black","cat-fish-gray","cat-fish-orange","cat-fish-cream","cat-fish-black","paw-round-gray","paw-round-orange","paw-round-cream","paw-round-black","side-stride-gray","side-stride-orange","side-stride-cream","side-stride-black","race-harbor","brawl-living","item-magnet","item-feather","item-glove","item-ice"};
   var audioLoad=StartCoroutine(sound.Load());int done=0;var all=files.Distinct().ToArray();
   foreach(var file in all){var request=Resources.LoadAsync<Texture2D>("Art/"+file);yield return request;var texture=request.asset as Texture2D;if(!texture){loadingError="加载失败："+file;Debug.LogError(loadingError);yield break;}paint.art[file]=texture;loadProgress=++done/(float)all.Length;}
   masks=new CatSilhouettes(paint.art);paint.PrepareScenery();yield return audioLoad;screen="home";sound.Scene(false);BuildUI();
   var args=Environment.GetCommandLineArgs();int qa=Array.IndexOf(args,"-catQA");if(qa>=0&&qa+1<args.Length)StartCoroutine(QA(args[qa+1]));
  }
  void Layout(){lastW=Screen.width;lastH=Screen.height;float aspect=Screen.width/(float)Screen.height,target=2f/3;cam.rect=aspect>target?new Rect((1-target/aspect)/2,0,target/aspect,1):new Rect(0,0,1,1);CatPaint.ViewHeight=600*cam.pixelHeight/cam.pixelWidth;cam.orthographicSize=CatPaint.ViewHeight/2;foreach(var scaler in FindObjectsByType<CanvasScaler>(FindObjectsSortMode.None))scaler.scaleFactor=cam.pixelWidth/600f;if(paint!=null)BuildUI();}
  public void StartGame(){paused=false;ClearInput();bool teach=!save.taught[(int)mode];game=mode==Mode.Jump?(MiniGame)new JumpGame(save.color,masks):mode==Mode.Race?new RaceGame(save.color,null,save.raceDifficulty,save.raceMap):mode==Mode.Brawl?new BrawlGame(save.color,save.brawlDifficulty,save.brawlMap):mode==Mode.Fish?new FishGame(teach):new TableGame(teach);screen="play";sound.Pause(false);sound.Scene(true);BuildUI();}
  void Home(){ClearInput();game?.Action("cancel");paused=false;game=null;screen="home";sound.Pause(false);sound.Scene(false);BuildUI();}
  void Select(int d){mode=(Mode)(((int)mode+d+5)%5);save.mode=(int)mode;save.Store();sound.Cue("tap");BuildUI();}
  void Mute(){save.muted=!save.muted;save.Store();sound.Mute(save.muted);BuildUI();}
  void Pause(){if(screen!="play"||game==null||game.ended)return;paused=true;ClearInput();game.Action("cancel");if(mode==Mode.Fish)game.Action("return");sound.Pause(true);BuildUI();}
  void Resume(){ClearInput();paused=false;sound.Pause(false);BuildUI();}
  void ClearInput(){actions.Clear();moveDirection=heldLeft=heldRight=0;dragging=false;if(movePad)movePad.Reset();game?.Action("cancel");}
  bool Ready()=>screen=="play"&&!paused&&game!=null&&!game.ended&&(!(game is RaceGame r)||r.phase=="run")&&(!(game is BrawlGame b)||b.phase=="fight"&&b.cats[0].hp>0);
  void Act(string action){if(!Ready())return;if(mode!=Mode.Race&&mode!=Mode.Brawl){game.Action(action);return;}if(action=="left"||action=="right"){game.Action(action);return;}if(action=="jump"){actions.Remove("slide");actions.Remove("drop");}if(action=="slide"||action=="drop")actions.Remove("jump");actions[action]=clock+.16f;FlushActions();}
  void FlushActions(){if(!Ready()){actions.Clear();return;}foreach(string key in actions.Keys.ToArray()){if(clock>actions[key]){actions.Remove(key);continue;}if(key=="jump"&&(game is BrawlGame b&&!b.cats[0].grounded&&b.cats[0].coyote<=0||game is RaceGame r&&r.runners[0].y<-.5f))continue;bool done=game is BrawlGame bg?bg.TryAction(key):game is RaceGame rg&&rg.TryAction(key);if(done)actions.Remove(key);}}
  void PlaySelected(){if(mode==Mode.Race||mode==Mode.Brawl){screen="match";BuildUI();}else StartGame();}
  void BuildUI(){ClearInput();ui.Clear();jumpButton=attackButton=dropButton=null;jumpText=attackText=null;
   if(screen=="loading"){ui.Hit(new Rect(110,330,370,260),()=>petUntil=clock+.55f);ui.Button(save.muted?"开启音乐":"音乐已开启",new Rect(365,819,190,46),Mute,size:17);return;}
   if(screen=="home"){
    ui.Button(save.muted?"♪":"♫",new Rect(505,26,60,55),Mute,size:25);ui.Button("?",new Rect(35,26,60,55),()=>{save.taught[(int)mode]=false;StartGame();},size:27);
    ui.Hit(new Rect(170,282,280,260),()=>{screen="picker";BuildUI();});ui.Button("换只猫",new Rect(219,533,162,48),()=>{screen="picker";BuildUI();},size:20);
    ui.Button("‹",new Rect(28,649,55,58),()=>Select(-1),size:36);ui.Button("›",new Rect(517,649,55,58),()=>Select(1),size:36);
    ui.Hit(new Rect(95,610,410,145),()=>PlaySelected());ui.Button("开始玩",new Rect(135,797,330,67),PlaySelected,"#ffda78",29);return;
   }
   if(screen=="picker"){
    ui.Button("‹",new Rect(30,28,60,55),Home,size:35);ui.Text("挑一只猫",new Rect(130,30,340,50),29);
    string[] names={"灰白","橘白","奶白","黑猫"};for(int i=0;i<4;i++){int n=i;ui.Button(names[i],new Rect(40+i*135,634,115,58),()=>{save.color=CatPaint.Colors[n];save.Store();BuildUI();},save.color==CatPaint.Colors[i]?"#ffda78":"#fff8e8",23);}
    ui.Button("就选这只",new Rect(135,785,330,68),Home,"#ffda78",27);return;
   }
   if(screen=="match"){
    ui.Button("‹",new Rect(30,28,64,58),Home,size:35);ui.Text(Titles[(int)mode],new Rect(120,32,360,48),31);
    string[] maps=mode==Mode.Race?new[]{"garden","harbor"}:new[]{"kitchen","living"};string selected=mode==Mode.Race?save.raceMap:save.brawlMap,difficulty=mode==Mode.Race?save.raceDifficulty:save.brawlDifficulty;
    for(int i=0;i<2;i++){string map=maps[i];ui.Button(MatchOptions.MapName(mode,map),new Rect(42+i*266,490,250,57),()=>{if(mode==Mode.Race)save.raceMap=map;else save.brawlMap=map;save.Store();BuildUI();},selected==map?"#ffda78":"#fff8e8",22);ui.Hit(new Rect(42+i*266,190,250,290),()=>{if(mode==Mode.Race)save.raceMap=map;else save.brawlMap=map;save.Store();BuildUI();});}
    for(int i=0;i<3;i++){string key=MatchOptions.Difficulties[i];ui.Button(MatchOptions.Labels[i],new Rect(45+i*174,603,162,64),()=>{if(mode==Mode.Race)save.raceDifficulty=key;else save.brawlDifficulty=key;save.Store();BuildUI();},difficulty==key?"#a9e2c7":"#fff8e8",25);}
    int record=save.matchRecords[save.RecordIndex(mode)];ui.Text(record>0?"本场地最佳 第 "+record+" 名":mode==Mode.Race?"900 米 · 3 猫同线出发":"6 猫混战 · 上下台面",new Rect(65,701,470,40),20);
    ui.Button(mode==Mode.Race?"去跑酷":"去开打",new Rect(135,797,330,67),StartGame,"#ffda78",29);return;
   }
   if(screen=="result"){
    ui.Panel(new Rect(58,238,484,476),"#fff8e8");string title=game.result,detail="最高分 "+save.best[(int)mode];
    if(game is RaceGame race){title=race.rank==1?"冲线第一！":race.rank==2?"差一点！":"到终点啦";var runner=race.runners[0];detail="用时 "+runner.finish.ToString("0.0")+" 秒\n最长连过 "+runner.bestClean+" 组    碰撞 "+runner.misses+" 次";}
    if(game is BrawlGame brawl){title=brawl.rank==1?"小霸王！":brawl.cats[0].hp<=0?"先歇一会儿":"时间到";var cat=brawl.cats[0];detail="击倒 "+cat.kills+" 只    伤害 "+cat.damage+"\n坚持 "+Mathf.FloorToInt(brawl.time)+" 秒";}
    if(game is FishGame fish)detail="带回 "+fish.caught+" 条    最高分 "+save.best[1];
    if(game is JumpGame jump)detail="越过 "+jump.cleared+" 组    最高分 "+save.best[2];
    ui.Text(title,new Rect(85,263,430,58),35);ui.Text(mode==Mode.Brawl||mode==Mode.Race?"第 "+game.rank+" 名":game.score+" 分",new Rect(95,335,410,62),41);ui.Text(detail,new Rect(80,417,440,80),22);
    ui.Button("再来一次",new Rect(125,532,350,65),StartGame,"#ffda78",27);ui.Button("回到客厅",new Rect(125,625,350,57),Home,size:24);return;
   }
   if(paused){ui.Panel(new Rect(100,278,400,345),"#fff8e8");ui.Text("暂停",new Rect(160,302,280,60),34);ui.Button("继续",new Rect(160,385,280,65),Resume,"#ffda78",27);ui.Button("回到客厅",new Rect(160,470,280,58),Home,size:24);ui.Button(save.muted?"打开声音":"关闭声音",new Rect(215,553,170,42),Mute,size:18);return;}
   ui.Button("Ⅱ",new Rect(513,24,60,56),Pause,size:23);
   if(mode==Mode.Jump){jumpButton=ui.Button("按住蓄力",new Rect(130,794,340,70),null,"#ffda78",27,()=>Act("down"),()=>Act("up"));jumpText=jumpButton.GetComponentInChildren<Text>();}
   if(mode==Mode.Race){ui.Button("◀",new Rect(24,785,99,88),null,size:30,down:()=>Act("left"));ui.Button("▶",new Rect(133,785,99,88),null,size:30,down:()=>Act("right"));ui.Button("下钻",new Rect(328,795,104,78),null,size:24,down:()=>Act("slide"));ui.Button("跳跃",new Rect(454,765,122,108),null,"#ffda78",28,down:()=>Act("jump"));}
   if(mode==Mode.Brawl||mode==Mode.Table)movePad=ui.MovePad(new Rect(24,785,208,88),n=>moveDirection=Ready()?n:0);
   if(mode==Mode.Table)ui.Button("躲起来",new Rect(410,796,165,72),()=>Act("hide"),"#ffda78",24);
   if(mode==Mode.Fish)ui.Button("收爪",new Rect(390,794,180,70),()=>Act("return"),"#ffda78",27);
   if(mode==Mode.Brawl){dropButton=ui.Button("下台",new Rect(72,712,112,61),null,size:22,down:()=>Act("drop"));ui.Button("跳跃",new Rect(330,718,110,84),null,"#b6e7ce",25,down:()=>Act("jump"));attackButton=ui.Button("冲撞",new Rect(464,765,112,108),null,"#ffda78",27,down:()=>Act("attack"));attackText=attackButton.GetComponentInChildren<Text>();}
  }
  Vector2 Pointer(){var v=cam.ScreenToViewportPoint(Input.mousePosition);return new Vector2(v.x*600,(1-v.y)*CatPaint.ViewHeight-CatPaint.Extra/2);}
  void Inputs(){if(screen=="home"){if(Input.GetKeyDown(KeyCode.LeftArrow))Select(-1);if(Input.GetKeyDown(KeyCode.RightArrow))Select(1);if(Input.GetKeyDown(KeyCode.Return))PlaySelected();return;}if(screen=="match"){if(Input.GetKeyDown(KeyCode.Escape))Home();if(Input.GetKeyDown(KeyCode.Return))StartGame();return;}if(screen=="result"){if(Input.GetKeyDown(KeyCode.Return))StartGame();if(Input.GetKeyDown(KeyCode.Escape))Home();return;}if(Input.GetKeyDown(KeyCode.Escape)){if(paused)Resume();else Pause();}if(paused||screen!="play"||game.ended)return;
   if(mode==Mode.Jump){if(Input.GetKeyDown(KeyCode.Space))Act("down");if(Input.GetKeyUp(KeyCode.Space))Act("up");}
   else{if(Input.GetKeyDown(KeyCode.Space)||Input.GetKeyDown(KeyCode.UpArrow)||Input.GetKeyDown(KeyCode.W)||Input.GetKeyDown(KeyCode.K))Act("jump");if(Input.GetKeyDown(KeyCode.DownArrow)||Input.GetKeyDown(KeyCode.S))Act(mode==Mode.Brawl?"drop":"slide");if(Input.GetKeyDown(KeyCode.J))Act("attack");}
   if(mode==Mode.Race){if(Input.GetKeyDown(KeyCode.LeftArrow)||Input.GetKeyDown(KeyCode.A))Act("left");if(Input.GetKeyDown(KeyCode.RightArrow)||Input.GetKeyDown(KeyCode.D))Act("right");}
   if(Input.GetMouseButtonDown(0)){bool over=EventSystem.current&&(Input.touchCount>0?EventSystem.current.IsPointerOverGameObject(Input.GetTouch(0).fingerId):EventSystem.current.IsPointerOverGameObject());if(!over){dragging=true;pointerStart=Pointer();game.Pointer(pointerStart,0);if(mode==Mode.Jump)Act("down");}}
   if(dragging&&Input.GetMouseButton(0))game.Pointer(Pointer(),1);
   if(dragging&&Input.GetMouseButtonUp(0)){dragging=false;Vector2 p=Pointer();game.Pointer(p,2);if(mode==Mode.Jump)Act("up");if(mode==Mode.Race){var d=p-pointerStart;if(d.magnitude>=28)Act(Mathf.Abs(d.x)>Mathf.Abs(d.y)?(d.x<0?"left":"right"):(d.y<0?"jump":"slide"));}}
  }
  void Update(){if(lastW!=Screen.width||lastH!=Screen.height)Layout();clock+=Time.unscaledDeltaTime;Inputs();if(screen=="play"&&!paused){float dir=moveDirection+(Input.GetKey(KeyCode.D)||Input.GetKey(KeyCode.RightArrow)?1:0)-(Input.GetKey(KeyCode.A)||Input.GetKey(KeyCode.LeftArrow)?1:0);FlushActions();game.Update(Time.deltaTime,Mathf.Clamp(dir,-1,1));FlushActions();foreach(var e in game.events){sound.Cue(e.type,e.kind);if(e.type=="learned")save.taught[(int)mode]=true;}game.events.Clear();if((mode==Mode.Jump&&((JumpGame)game).jumps>0)||(mode==Mode.Race||mode==Mode.Brawl)&&game.time>9)save.taught[(int)mode]=true;
    if(game.ended){int i=(int)mode;save.best[i]=mode==Mode.Race||mode==Mode.Brawl?(save.best[i]==0?game.rank:Mathf.Min(save.best[i],game.rank)):Mathf.Max(save.best[i],game.score);if(mode==Mode.Race||mode==Mode.Brawl){int key=save.RecordIndex(mode),prior=save.matchRecords[key];save.matchRecords[key]=prior==0?game.rank:Mathf.Min(prior,game.rank);}save.Store();screen="result";sound.Scene(false);BuildUI();}
    if(jumpButton){var j=(JumpGame)game;jumpText.text=j.phase=="charge"?"松手起跳":j.phase=="air"?"起跳中":j.phase=="dead"?"没站稳":"按住蓄力";}
    if(attackButton){var b=(BrawlGame)game;var c=b.cats[0];attackButton.interactable=b.phase=="fight"&&c.hp>0;attackText.text=c.cooldown>0?"冲撞\n"+c.cooldown.ToString("0.0"):"冲撞";dropButton.interactable=c.grounded&&c.surface!=0&&b.phase=="fight";}
   }
   Draw();
  }
  void Draw(){paint.Begin();paint.Overlay=screen=="home"||screen=="picker"||screen=="loading"||screen=="match";paint.OffsetY=0;paint.Zoom=1;if(screen=="loading"){
    paint.Rect(0,0,600,900,"#d8f0df");paint.Oval(300,355,710,650,"#f6f6e7");paint.Fit("title-catgames",new Rect(85,80,430,250));paint.Oval(295,550,305,25,"#bedac0");paint.Cat(save.color,275,548,250,clock<petUntil?MiniGame.Frame("push",.55f-(petUntil-clock)):MiniGame.Frame("idle",clock));paint.Bottom("fish-snack",428,544,70);paint.Label(loadingError??"正在开门…",120,620,260,42,20,align:TextAnchor.MiddleLeft);paint.Label(Mathf.RoundToInt(loadProgress*100)+"%",414,620,70,42,22);paint.Bar(120,680,360,loadProgress,"#edb75b",16);
   }else if(screen=="match"){
    paint.Cover("menu-nook");paint.Rect(0,0,600,900,"#fff8e8dd");string[] keys=mode==Mode.Race?new[]{"race-track-vertical","race-harbor"}:new[]{"brawl-kitchen","brawl-living"};for(int i=0;i<2;i++){paint.Round(42+i*266,180,250,300,"#fff8e8");paint.Fit(keys[i],new Rect(50+i*266,190,234,280));}
   }else if(screen=="home"||screen=="picker"){
    paint.Cover("menu-nook");if(screen=="home")paint.Fit("title-catgames",new Rect(68,30,464,230));paint.Cat(save.color,321,screen=="home"?510:538,screen=="home"?300:355,MiniGame.Frame("idle",clock));
    if(screen=="home"){paint.Round(95,610,410,145,"#fff8e8");string[] icons={"mug-side","fish-snack","jump-spikes","race-hurdle","item-pepper"};paint.Fit(icons[(int)mode],new Rect(117,632,95,95));paint.Label(Titles[(int)mode],216,630,262,48,30);int n=save.best[(int)mode];string record=(mode==Mode.Race||mode==Mode.Brawl)?(n>0?"最佳第 "+n+" 名":(mode==Mode.Race?"3 猫同跑 · 人机":"6 猫混战 · 人机")):"纪录 "+n;paint.Label(record,216,686,260,30,18,"#7c7963");for(int i=0;i<5;i++)paint.Oval(252+i*24,773,10,10,i==(int)mode?"#e5a73d":"#b8baa0");}
   }else if(game!=null){paint.OffsetY=CatPaint.Extra/2;if(game is BrawlGame battle)paint.Zoom=battle.ViewZoom;game.Draw(paint,save.color);paint.OffsetY=0;paint.Zoom=1;paint.Overlay=true;if(screen=="play"&&!paused)DrawHUD();if(paused||screen=="result")paint.Rect(0,0,600,900,"#30362b66");}
   paint.End();
  }
  void DrawHUD(){paint.Round(25,24,145,80,"#fff8e8f0");paint.Round(235,24,130,66,"#fff8e8f0");string value=game.score.ToString(),time=Mathf.CeilToInt(game.time)+" 秒",caption="捣蛋分";
   if(game is JumpGame j){caption="跳跃分";time=Mathf.Max(0,(int)((j.x-140)/20))+" 米";if(!save.taught[2])paint.Label("按住蓄力 · 松手起跳",100,725,400,35,22,"#3b5d40");}
   if(game is RaceGame r){caption="当前名次";value=r.rank+" / 3";time=Mathf.Max(0,Mathf.RoundToInt((RaceGame.FinishDistance-r.runners[0].x)/20))+" 米";paint.Bar(95,133,410,r.runners[0].x/RaceGame.FinishDistance,"#e9bb56",6);paint.Label(r.runners[0].boost>0?"冲刺中":r.runners[0].clean%3+" / 3",220,163,160,30,22);if(!save.taught[3]&&r.time<9)paint.Label("左右换道 · 上跳下钻",90,736,420,35,22);}
   if(game is BrawlGame b){caption="剩余猫咪";value=b.cats.Count(c=>c.hp>0)+" 只";time=Mathf.CeilToInt(b.remaining)+" 秒";paint.Bar(95,133,410,b.cats[0].hp/100f,"#7dd7ad",10);paint.Label(b.cats[0].hp+" / 100",225,157,150,30,19);}
   if(game is FishGame f){caption="偷吃分";paint.Label(f.caught+" / 12",70,788,150,50,27);paint.Label("机会 "+(3-f.mistakes),70,841,150,30,19);if(f.owner!="away")paint.Label(f.seen?"暴露":f.owner=="warning"?"收爪":"警觉",190,142,220,40,24,"#9e4d35");if(f.tutorial!=null)paint.Label(f.tutorial=="reach"?"拖猫爪":"松手收爪",185,695,230,42,24);}
   if(game is TableGame t){paint.Label(t.falls+" / 12",246,811,140,44,25);if(t.tutorial!=null)paint.Label(t.tutorial=="push"?"点杯子":t.tutorial=="hide"?"躲起来":"等等",185,689,230,42,25);if(t.owner!="away")paint.Label(t.seen?"暴露":t.owner=="warning"?"小心":"警觉",200,133,200,40,24,"#a25132");}
   paint.Label(caption,29,29,137,27,16,"#6c705d");paint.Label(value,29,56,137,43,31);paint.Label(time,240,33,120,48,23);
  }
  void OnApplicationFocus(bool focus){if(!focus&&screen=="play")Pause();if(sound)sound.Pause(!focus||paused);}
  IEnumerator QA(string dir){
   System.IO.Directory.CreateDirectory(dir);yield return new WaitForSeconds(.5f);yield return Capture(dir,"home");
   foreach(Mode m in Enum.GetValues(typeof(Mode))){mode=m;save.taught[(int)m]=true;StartGame();yield return new WaitForSeconds(3.3f);if(m==Mode.Jump){game.Action("down");yield return new WaitForSeconds(.65f);game.Action("up");yield return new WaitForSeconds(.35f);}if(m==Mode.Race){game.Action("right");game.Action("jump");yield return new WaitForSeconds(.3f);}if(m==Mode.Brawl){game.Action("jump");game.Action("attack");yield return new WaitForSeconds(.25f);}yield return Capture(dir,m.ToString().ToLower());Home();}
   Debug.Log("CAT_NATIVE_QA_COMPLETE");Home();
  }
  IEnumerator Capture(string dir,string name){yield return new WaitForEndOfFrame();ScreenCapture.CaptureScreenshot(System.IO.Path.Combine(dir,name+".png"));yield return new WaitForSeconds(.2f);}
 }
}
