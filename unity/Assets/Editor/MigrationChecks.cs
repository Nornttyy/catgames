using System;
using System.Linq;
using UnityEngine;
namespace CatGames.Editor {
 public static class MigrationChecks {
  public static void Run(){
   int checks=0;Action<bool,string> check=(ok,label)=>{if(!ok)throw new Exception("MIGRATION_CHECK_FAILED "+label);checks++;};
   foreach(string color in CatPaint.Colors){check(Resources.Load<Texture2D>("Art/side-stride-"+color)!=null,"side walk atlas "+color);}
   foreach(string key in new[]{"race-harbor","brawl-living","item-magnet","item-feather","item-glove","item-ice"})check(Resources.Load<Texture2D>("Art/"+key)!=null,key);
   check(MiniGame.Frame("idle",4.36f)==2&&MiniGame.Frame("idle",4.43f)==0,"single fast blink");check(Enumerable.Range(0,8).Select(i=>MiniGame.Frame("walk",i/12f+.001f)).Distinct().Count()==8,"8 movement frames");
   foreach(string difficulty in MatchOptions.Difficulties)foreach(string map in new[]{"garden","harbor"}){
    var r=new RaceGame("gray",()=>.3f,difficulty,map);check(r.runners.Count==3,"3 racers");check(r.runners.All(c=>c.x==120&&c.speed==340),"same starting line and speed");check(RaceGame.FinishDistance==18000,"900 m race");
    check(r.items.Select(i=>i.kind).Distinct().Count()==4,"all racing pickups");check(r.obstacles.All(o=>o.lanes.Any(k=>k==null)||o.lanes.Distinct().Count()==1),"every obstacle row passable");
    if(difficulty=="casual")check(r.obstacles.All(o=>o.lanes.Count(k=>k!=null)<=1),"casual single action");if(difficulty=="hard")check(r.obstacles.Any(o=>o.lanes.All(k=>k=="gate")),"hard full-row duck");
    check(!r.TryAction("jump"),"countdown locks input");for(int i=0;i<320;i++)r.Update(.01f,0);check(r.TryAction("jump"),"jump after countdown");r.Update(.01f,0);check(!r.TryAction("slide"),"no slide in air");
    var c=r.runners[0];foreach(string kind in new[]{"magnet","feather","shield","speed"})r.Take(c,new RaceGame.Item{kind=kind});check(c.magnet==7&&c.feather==8&&c.shield==10&&c.itemBoost==2.6f,"race item effects");
   }
   foreach(string difficulty in MatchOptions.Difficulties)foreach(string map in new[]{"kitchen","living"}){
    var b=new BrawlGame("gray",difficulty,map);check(b.cats.Count==6&&b.cats.All(c=>c.hp==100),"6 cats, difficulty does not inflate health");
    foreach(var surface in b.surfaces)check(surface.id=="floor"||BrawlGame.Route("floor",surface.id,b.surfaces).Count>0,"reachable ledge "+surface.id);
    b.phase="fight";var c=b.cats[0];foreach(string kind in new[]{"speed","glove","ice","feather"})b.Take(c,new BrawlGame.Item{kind=kind});check(c.speed==7&&c.glove==9&&c.ice==9&&c.feather==8,"brawl items");
    check(b.TryAction("attack")&&Mathf.Approximately(c.cooldown,.78f),"glove cooldown");check(!b.TryAction("attack"),"no repeated attack during cooldown");
    var other=b.cats[1];other.invincible=0;check(b.Damage(c,other)&&other.hp==80&&other.chilled>0,"ice damage and slow");check(!b.Damage(c,other),"one hit per dash");
    c.x=1725;c.y=-660;b.Update(.02f,0);check(b.camera<=1200&&b.camera>=0&&b.cameraY>=-520&&b.cameraY<=-11,"camera stays in room");
   }
   for(int frame=0;frame<6;frame++){var point=new Vector2(200,80);check(Vector2.Distance(point,CatTailMesh.Bend(frame,point,.5f,1,1))<.001f,"tail deformation leaves head alone");}
   Debug.Log("CAT_MIGRATION_CHECKS_PASS "+checks);System.IO.Directory.CreateDirectory("QA");System.IO.File.WriteAllText("QA/migration-checks.txt","PASS "+checks+" checks\n"+DateTime.UtcNow.ToString("O"));
  }
 }
}
