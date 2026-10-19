Shader "CatGames/Clean Cat Edges" {
 Properties {
  [PerRendererData] _MainTex("Sprite",2D)="white" {}
  _Color("Tint",Color)=(1,1,1,1)
  [HideInInspector] _RendererColor("Renderer Color",Color)=(1,1,1,1)
  [HideInInspector] _Flip("Flip",Vector)=(1,1,1,1)
  _FrameUV("Frame bounds",Vector)=(0,0,1,1)
 }
 SubShader {
  Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" "CanUseSpriteAtlas"="False" }
  Cull Off Lighting Off ZWrite Off
  Blend One OneMinusSrcAlpha
  Pass {
   CGPROGRAM
   #pragma vertex SpriteVert
   #pragma fragment CatFrag
   #include "UnitySprites.cginc"
   float4 _MainTex_TexelSize;
   float4 _FrameUV;
   fixed4 CatTexel(float2 uv) {
    // Sample texel centres inside THIS animation cell. Transparent RGB never
    // participates in interpolation; leave the painted outline untouched.
    uv=clamp(uv,_FrameUV.xy+_MainTex_TexelSize.xy*.5,_FrameUV.zw-_MainTex_TexelSize.xy*.5);
    fixed4 c=tex2D(_MainTex,uv); c.rgb*=c.a; return c;
   }
   fixed4 CatFrag(v2f i):SV_Target {
    float2 p=i.texcoord*_MainTex_TexelSize.zw-.5;
    float2 f=frac(p),baseUV=(floor(p)+.5)*_MainTex_TexelSize.xy;
    fixed4 a=lerp(CatTexel(baseUV),CatTexel(baseUV+float2(_MainTex_TexelSize.x,0)),f.x);
    fixed4 b=lerp(CatTexel(baseUV+float2(0,_MainTex_TexelSize.y)),CatTexel(baseUV+_MainTex_TexelSize.xy),f.x);
    fixed4 c=lerp(a,b,f.y);c.rgb*=i.color.rgb*i.color.a;c.a*=i.color.a;return c;
   }
   ENDCG
  }
 }
}
