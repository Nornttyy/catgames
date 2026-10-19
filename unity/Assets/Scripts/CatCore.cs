using System;
using System.Collections.Generic;
using UnityEngine;
using System.Runtime.InteropServices;

namespace CatGames {
 public enum Mode { Table, Fish, Jump, Race, Brawl }
 public sealed class GameEvent { public string type,kind; public float x,y; public int amount; public GameEvent(string t,string k=null,int n=0,float px=0,float py=0){type=t;kind=k;amount=n;x=px;y=py;} }
 public abstract class MiniGame {
  public bool ended,won; public float age,time; public int score,rank; public string result="";
  public readonly List<GameEvent> events=new List<GameEvent>();
  public virtual void Action(string action){} public virtual void Pointer(Vector2 p,int phase){} public abstract void Update(float dt,float direction); public abstract void Draw(CatPaint p,string color);
  protected void Emit(string type,string kind=null,int count=0,float x=0,float y=0){events.Add(new GameEvent(type,kind,count,x,y));}
  protected void Finish(bool win,string reason){if(ended)return;ended=true;won=win;result=reason;Emit("end",win?"cleared":"finished");}
  protected static float Clamp(float v,float a,float b)=>Mathf.Clamp(v,a,b);
  protected static float Dec(float n,float dt)=>Mathf.Max(0,n-dt);
  public static int Frame(string action,float t){
   if(action=="walk")return 16+(int)(t*12)%8;
   if(action=="push")return 8+Mathf.Min(3,(int)(t/.13f));
   if(action=="hide")return 12+Mathf.Min(3,(int)(t/.12f));
   if(action=="rise")return 15-Mathf.Min(3,(int)(t/.12f));
   var q=t%4.8f;return q>=4.35f&&q<4.425f?2:0;
  }
 }
 [Serializable] public class CatSave {
  public string color="gray"; public int mode=2; public bool muted; public int[] best=new int[5]; public bool[] taught=new bool[5];
  public string raceDifficulty="normal",brawlDifficulty="normal",raceMap="garden",brawlMap="kitchen";
  public int[] matchRecords=new int[12];
  public int RecordIndex(Mode mode)=>((mode==Mode.Brawl?2:0)+(mode==Mode.Brawl?(brawlMap=="living"?1:0):(raceMap=="harbor"?1:0)))*3+Array.IndexOf(MatchOptions.Difficulties,mode==Mode.Brawl?brawlDifficulty:raceDifficulty);
  #if UNITY_WEBGL && !UNITY_EDITOR
  [DllImport("__Internal")]static extern string CatReadSave();
  [DllImport("__Internal")]static extern void CatWriteSave(string json);
  #endif
  public void Store(){string json=JsonUtility.ToJson(this);PlayerPrefs.SetString("catgames-unity-v1",json);PlayerPrefs.Save();
   #if UNITY_WEBGL && !UNITY_EDITOR
   CatWriteSave(json);
   #endif
  }
  public static CatSave Load(){try{string json=PlayerPrefs.GetString("catgames-unity-v1","{}");
   #if UNITY_WEBGL && !UNITY_EDITOR
   if(!PlayerPrefs.HasKey("catgames-unity-v1"))json=CatReadSave();
   #endif
   var s=JsonUtility.FromJson<CatSave>(json)??new CatSave();if(s.best==null||s.best.Length!=5)s.best=new int[5];if(s.taught==null||s.taught.Length!=5)s.taught=new bool[5];if(s.matchRecords==null||s.matchRecords.Length!=12)s.matchRecords=new int[12];if(Array.IndexOf(CatPaint.Colors,s.color)<0)s.color="gray";s.mode=Mathf.Clamp(s.mode,0,4);s.raceDifficulty=MatchOptions.Valid(s.raceDifficulty);s.brawlDifficulty=MatchOptions.Valid(s.brawlDifficulty);s.raceMap=s.raceMap=="harbor"?"harbor":"garden";s.brawlMap=s.brawlMap=="living"?"living":"kitchen";return s;}catch{return new CatSave();}}
 }
}
