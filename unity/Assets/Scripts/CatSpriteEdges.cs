using UnityEngine;
namespace CatGames {
 public static class CatSpriteEdges {
  static Material material;
  public static Material Material { get { if(!material)material=new Material(Shader.Find("CatGames/Clean Cat Edges"));return material; } }
  public static bool IsCat(string key)=>key.StartsWith("cat-")||key.StartsWith("side-stride-")||key=="race-cats-back";
  public static Vector4 Bounds(Rect rect,Texture t)=>new Vector4(rect.xMin/t.width,rect.yMin/t.height,rect.xMax/t.width,rect.yMax/t.height);
 }
}
