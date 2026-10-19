using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace CatGames {
 public sealed class CatSound:MonoBehaviour {
  readonly Dictionary<string,AudioClip> clips=new Dictionary<string,AudioClip>();readonly Dictionary<string,float> recent=new Dictionary<string,float>();
  readonly List<AudioSource> voices=new List<AudioSource>();AudioSource music;bool muted,paused;int serial;
  public void Init(bool mute){muted=mute;music=gameObject.AddComponent<AudioSource>();music.loop=true;music.playOnAwake=false;music.volume=.16f;for(int i=0;i<8;i++){var s=gameObject.AddComponent<AudioSource>();s.playOnAwake=false;s.spatialBlend=0;voices.Add(s);}}
  public IEnumerator Load(){var req=Resources.LoadAsync<AudioClip>("Audio/cat-bgm");yield return req;music.clip=(AudioClip)req.asset;if(!muted)music.Play();foreach(string key in new[]{"jump","lane","hit-a","hit-b","hit-c","land","drop","ceramic","shield","tap","pluck","whoosh","pickup","win","lose","tick"}){var r=Resources.LoadAsync<AudioClip>("Audio/"+key);yield return r;clips[key]=(AudioClip)r.asset;}}
  public void Scene(bool playing){if(music)music.volume=playing?.13f:.21f;}
  public void Mute(bool m){muted=m;if(m){music.Pause();foreach(var s in voices)s.Stop();}else if(!paused&&music.clip)music.UnPause();if(!m&&!paused&&!music.isPlaying&&music.clip)music.Play();}
  public void Pause(bool p){paused=p;if(p){music.Pause();foreach(var s in voices)s.Stop();}else if(!muted){music.UnPause();if(!music.isPlaying&&music.clip)music.Play();}}
  public void Cue(string type,string kind=null){
   if(muted||paused)return;string key="tap";float volume=.38f,pitch=1,gap=.06f;
   switch(type){case "charge":case "learned":case "table":return;
    case "jump":key="jump";volume=.40f;gap=.11f;break;
    case "race-lane":key="lane";volume=.26f;gap=.055f;break;
    case "brawl-charge":case "race-slide":key="whoosh";volume=.30f;pitch=1.08f;break;
    case "push":key="whoosh";volume=.16f;pitch=1.25f;break;
    case "bonk":case "brawl-hit":key=new[]{"hit-a","hit-b","hit-c"}[serial++%3];volume=.65f;break;
    case "shield-break":key="shield";volume=.65f;break;
    case "land":key="land";volume=.32f;gap=.12f;break;
    case "fall":key=kind=="mug"||kind=="bottle"?"ceramic":"drop";volume=.48f;break;
    case "clink":key="ceramic";pitch=1.18f;break;
    case "warning":case "spotted":key="lose";volume=.38f;pitch=.85f;gap=.25f;break;
    case "race-tick":key="pluck";pitch=.85f;break;
    case "race-go":case "race-boost":key="win";volume=.42f;break;
    case "grab":case "fish":case "perfect":case "pickup":case "race-clear":case "brawl-ko":key="pickup";volume=.42f;gap=.12f;break;
    case "end":key=kind=="cleared"?"win":"lose";volume=.52f;break;
   }
   if(!clips.TryGetValue(key,out var clip)||!clip)return;if(recent.TryGetValue(key,out var t)&&Time.unscaledTime-t<gap)return;recent[key]=Time.unscaledTime;
   AudioSource voice=voices.Find(s=>!s.isPlaying)??voices[serial++%voices.Count];voice.Stop();voice.clip=clip;voice.pitch=pitch;voice.volume=volume;voice.Play();
  }
 }
}
