using System;
namespace CatGames {
 public static class MatchOptions {
  public static readonly string[] Difficulties={"casual","normal","hard"};
  public static readonly string[] Labels={"休闲","普通","困难"};
  public static string Valid(string value)=>Array.IndexOf(Difficulties,value)<0?"normal":value;
  public static string Label(string value)=>Labels[Array.IndexOf(Difficulties,Valid(value))];
  public static string MapName(Mode mode,string map)=>mode==Mode.Race?(map=="harbor"?"海边栈道":"花园小径"):(map=="living"?"客厅乱斗":"厨房混战");
 }
}
