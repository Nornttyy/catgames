using System;
using System.IO;
using UnityEditor;
using UnityEngine;
namespace CatGames.Editor {
 public static class VisualChecks {
  public static void Run(){
   int n=0;void Check(bool ok,string label){if(!ok)throw new Exception("CAT_VISUAL_CHECK_FAILED "+label);n++;}
   var shader=Shader.Find("CatGames/Clean Cat Edges");Check(shader!=null,"cat alpha shader exists");Check(!ShaderUtil.ShaderHasError(shader),"cat shader compiled");
   foreach(string path in Directory.GetFiles("Assets/Resources/Art","*.png")){
    string key=Path.GetFileNameWithoutExtension(path);if(!CatSpriteEdges.IsCat(key))continue;
    var imported=AssetDatabase.LoadAssetAtPath<Texture2D>(path);var settings=(TextureImporter)AssetImporter.GetAtPath(path);
    Check(imported.isReadable&&!settings.mipmapEnabled&&settings.textureCompression==TextureImporterCompression.Uncompressed,"uncompressed cat "+key);
    var original=new Texture2D(2,2,TextureFormat.RGBA32,false);ImageConversion.LoadImage(original,File.ReadAllBytes(path));
    Check(original.width==imported.width&&original.height==imported.height,"cat dimensions "+key);
    var a=original.GetPixels32();var b=imported.GetPixels32();bool same=true;for(int i=0;i<a.Length;i++)if(a[i].a!=b[i].a){same=false;break;}
    Check(same,"all cat alpha pixels preserved "+key);UnityEngine.Object.DestroyImmediate(original);
   }
   var t=Resources.Load<Texture2D>("Art/race-cats-back");var bounds=CatSpriteEdges.Bounds(new Rect(256,512,256,256),t);Check(Mathf.Approximately(bounds.x,1f/6)&&bounds.y==.5f&&Mathf.Approximately(bounds.z,2f/6)&&bounds.w==.75f,"cell UV bounds");
   var brawl=new BrawlGame("gray");brawl.phase="fight";brawl.Take(brawl.cats[0],new BrawlGame.Item{kind="food"});Check(brawl.fx.Exists(f=>f.kind=="food"),"pickup feedback emitted");
   for(int i=0;i<50;i++)brawl.Take(brawl.cats[0],new BrawlGame.Item{kind="ice"});Check(brawl.fx.Count<=16,"bounded feedback pool");
   Debug.Log("CAT_VISUAL_CHECKS_PASS "+n);
  }
 }
}
