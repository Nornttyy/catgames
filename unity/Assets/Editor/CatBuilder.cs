using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace CatGames.Editor {
 public sealed class CatImporter:AssetPostprocessor {
  public static bool Readable(string path)=>CatSpriteEdges.IsCat(Path.GetFileNameWithoutExtension(path))||path.Contains("jump-spikes")||path.Contains("race-track")||path.Contains("race-harbor")||path.Contains("brawl-kitchen")||path.Contains("brawl-living");
  public static void Configure(TextureImporter t,string path){t.textureType=TextureImporterType.Default;t.npotScale=TextureImporterNPOTScale.None;t.isReadable=Readable(path);t.alphaSource=TextureImporterAlphaSource.FromInput;t.alphaIsTransparency=true;t.mipmapEnabled=false;t.textureCompression=TextureImporterCompression.Uncompressed;t.maxTextureSize=4096;t.filterMode=FilterMode.Bilinear;t.wrapMode=TextureWrapMode.Clamp;foreach(string platform in new[]{"WebGL","Standalone"})t.ClearPlatformTextureSettings(platform);}
  void OnPreprocessTexture(){if(!assetPath.Contains("Resources/Art/"))return;Configure((TextureImporter)assetImporter,assetPath);}
  void OnPreprocessAudio(){var a=(AudioImporter)assetImporter;var s=a.defaultSampleSettings;s.loadType=assetPath.Contains("cat-bgm")?AudioClipLoadType.Streaming:AudioClipLoadType.DecompressOnLoad;s.compressionFormat=assetPath.Contains("cat-bgm")?AudioCompressionFormat.Vorbis:AudioCompressionFormat.PCM;s.quality=.7f;a.defaultSampleSettings=s;a.forceToMono=!assetPath.Contains("cat-bgm");}
 }
 public static class CatBuilder {
  static void Prepare(){
   foreach(string file in Directory.GetFiles("Assets/Resources/Art","*.png")){var t=(TextureImporter)AssetImporter.GetAtPath(file);bool wrong=t.npotScale!=TextureImporterNPOTScale.None||t.isReadable!=CatImporter.Readable(file)||!t.alphaIsTransparency||t.mipmapEnabled||t.textureCompression!=TextureImporterCompression.Uncompressed||t.filterMode!=FilterMode.Bilinear||t.wrapMode!=TextureWrapMode.Clamp||t.maxTextureSize!=4096||t.alphaSource!=TextureImporterAlphaSource.FromInput||t.GetPlatformTextureSettings("WebGL").overridden||t.GetPlatformTextureSettings("Standalone").overridden;if(wrong){CatImporter.Configure(t,file);t.SaveAndReimport();}}
   Directory.CreateDirectory("Assets/Scenes");Directory.CreateDirectory("Builds");Directory.CreateDirectory("QA");
   var scene=EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);new GameObject("小猫游戏多 · Native Unity").AddComponent<CatWorld>();EditorSceneManager.SaveScene(scene,"Assets/Scenes/CatGames.unity");
   EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene("Assets/Scenes/CatGames.unity",true)};
   PlayerSettings.companyName="CatGames";PlayerSettings.productName="小猫游戏多";PlayerSettings.bundleVersion="1.0.0";PlayerSettings.SetApplicationIdentifier(UnityEditor.Build.NamedBuildTarget.Standalone,"com.nornttyy.catgames");
   PlayerSettings.defaultScreenWidth=600;PlayerSettings.defaultScreenHeight=900;PlayerSettings.fullScreenMode=FullScreenMode.Windowed;PlayerSettings.resizableWindow=true;PlayerSettings.runInBackground=false;PlayerSettings.defaultInterfaceOrientation=UIOrientation.Portrait;PlayerSettings.colorSpace=ColorSpace.Gamma;
   PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Standalone,ScriptingImplementation.Mono2x);
   var settings=new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset")[0]);var input=settings.FindProperty("activeInputHandler");if(input!=null){input.intValue=0;settings.ApplyModifiedPropertiesWithoutUndo();}
   var gs=new SerializedObject(AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/GraphicsSettings.asset")[0]);var always=gs.FindProperty("m_AlwaysIncludedShaders");foreach(string name in new[]{"Sprites/Default","UI/Default","CatGames/Clean Cat Edges"}){var shader=Shader.Find(name);bool found=false;for(int i=0;i<always.arraySize;i++)if(always.GetArrayElementAtIndex(i).objectReferenceValue==shader)found=true;if(!found&&shader){int n=always.arraySize;always.InsertArrayElementAtIndex(n);always.GetArrayElementAtIndex(n).objectReferenceValue=shader;}}gs.ApplyModifiedPropertiesWithoutUndo();AssetDatabase.SaveAssets();
  }
  [MenuItem("小猫游戏多/构建 Mac 试玩")]
  public static void BuildMac(){Prepare();Checks();var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{"Assets/Scenes/CatGames.unity"},target=BuildTarget.StandaloneOSX,locationPathName="Builds/小猫游戏多.app",options=BuildOptions.None});if(report.summary.result!=BuildResult.Succeeded)throw new Exception("CAT_BUILD_FAILED "+report.summary.result);Debug.Log("CAT_MAC_BUILD_OK "+report.summary.totalSize);}
  [MenuItem("小猫游戏多/构建网页试玩")]
  public static void BuildWeb(){Prepare();Checks();if(!BuildPipeline.IsBuildTargetSupported(BuildTargetGroup.WebGL,BuildTarget.WebGL))throw new Exception("Web build module is not available");PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Gzip;PlayerSettings.WebGL.decompressionFallback=true;PlayerSettings.WebGL.dataCaching=true;PlayerSettings.WebGL.template="PROJECT:CatGames";PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.WebGL,ScriptingImplementation.IL2CPP);var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions{scenes=new[]{"Assets/Scenes/CatGames.unity"},target=BuildTarget.WebGL,locationPathName="Builds/Web",options=BuildOptions.None});if(report.summary.result!=BuildResult.Succeeded)throw new Exception("CAT_WEB_BUILD_FAILED "+report.summary.result);Debug.Log("CAT_WEB_BUILD_OK "+report.summary.totalSize);}
  [MenuItem("小猫游戏多/检查迁移规则")]
  public static void Checks(){
   int n=0;void Check(bool ok,string label){if(!ok)throw new Exception("CAT_CHECK_FAILED "+label);n++;}
   var art=new System.Collections.Generic.Dictionary<string,Texture2D>();foreach(var c in CatPaint.Colors){art["cat-"+c]=Resources.Load<Texture2D>("Art/cat-"+c);Check(art["cat-"+c]!=null,"cat "+c);Check(art["cat-"+c].width==1440&&art["cat-"+c].height==1240,"unaltered atlas dimensions "+c);}art["jump-spikes"]=Resources.Load<Texture2D>("Art/jump-spikes");var masks=new CatSilhouettes(art);
   Check(Mathf.Approximately(JumpGame.Speed(0),80)&&Mathf.Approximately(JumpGame.Speed(1.1f),440),"charge speeds");
   foreach(var c in CatPaint.Colors)for(int frame=0;frame<16;frame++){Check(!masks.Hits(c,frame,140,0,304,1),"spawn safe "+c+frame);Check(masks.Hits(c,frame,340,0,304,1),"all poses hit visible spikes "+c+frame);}
   var j=new JumpGame("gray",masks,()=>.5f);j.Action("down");j.Update(.1f,0);j.Action("up");float vx=j.vx;j.Action("up");Check(j.phase=="air"&&j.vx==vx,"no air re-launch");j.Action("down");Check(j.phase=="air","no charge in air");
   var race=new RaceGame("gray",()=>.3f);race.Action("left");Check(race.runners[0].laneTarget==1,"race countdown lock");for(int i=0;i<370;i++)race.Update(.01f,0);race.Action("right");Check(race.runners[0].laneTarget==2&&race.runners[0].lane==1,"lane starts smoothly");race.Update(.1f,0);Check(race.runners[0].lane>1&&race.runners[0].lane<2,"interpolated lane");race.Update(.1f,0);Check(Mathf.Approximately(race.runners[0].lane,2),"lane complete");Check(race.obstacles.All(o=>o.lanes.Any(k=>k==null)),"safe lane in every row");
   var b=new BrawlGame("gray");Check(b.cats.Count==6&&b.items.Count==3,"native brawl population");foreach(var s in BrawlGame.Surfaces)Check(s.id=="floor"||BrawlGame.Route("floor",s.id).Count>0,"reachable "+s.id);b.cats[1].invincible=0;Check(b.Damage(b.cats[0],b.cats[1])&&b.cats[1].hp==80,"same brawl damage");Check(!b.Damage(b.cats[0],b.cats[1]),"one hit per dash");
   var table=new TableGame(false);Check(table.props.Count==12&&table.time==60,"table content intact");var fish=new FishGame(false);Check(fish.snacks.Count==3&&fish.time==65,"fish content intact");Check(fish.dishes.Count==2,"fish props intact");
   foreach(string key in new[]{"jump","lane","cat-bgm","hit-a","pickup"})Check(Resources.Load<AudioClip>("Audio/"+key)!=null,"audio "+key);Check(Resources.Load<Font>("Fonts/CatSans")!=null,"Chinese font");
   MigrationChecks.Run();VisualChecks.Run();Debug.Log("CAT_RULE_CHECKS_PASS "+n);File.WriteAllText("QA/checks.txt","PASS "+n+" checks\n"+DateTime.UtcNow.ToString("O"));
  }
 }
}
