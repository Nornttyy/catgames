mergeInto(LibraryManager.library, {
 CatReadSave: function() {
  var json='{}';
  try {
   var modern=localStorage.getItem('catgames-unity-mirror');
   if(modern)json=modern;
   else {
    var old=JSON.parse(localStorage.getItem('cat-games-v1')||'{}');
    var modes=['table','fish','jump','race','brawl'];var records=[];
    ['race','brawl'].forEach(function(mode){(mode==='race'?['garden','harbor']:['kitchen','living']).forEach(function(map){['casual','normal','hard'].forEach(function(d){records.push(Number((old.matchRecords||{})[mode+':'+map+':'+d])||0);});});});
    var settings=old.matchSettings||{},race=settings.race||{},brawl=settings.brawl||{};
    json=JSON.stringify({color:old.color||'gray',mode:Math.max(0,modes.indexOf(old.mode)),muted:!!old.muted,best:[old.best||0,old.fishBest||0,old.jumpBest||0,old.raceBest||0,old.brawlBest||0],taught:[!!old.taught,!!old.fishTaught,!!old.jumpTaught,!!old.raceTaught,!!old.brawlTaught],raceDifficulty:race.difficulty||'normal',brawlDifficulty:brawl.difficulty||'normal',raceMap:race.map||'garden',brawlMap:brawl.map||'kitchen',matchRecords:records});
   }
  }catch(e){}
  var size=lengthBytesUTF8(json)+1;var ptr=_malloc(size);stringToUTF8(json,ptr,size);return ptr;
 },
 CatWriteSave:function(ptr){try{var json=UTF8ToString(ptr);localStorage.setItem('catgames-unity-mirror',json);localStorage.setItem('cat-unity-muted',JSON.parse(json).muted?'1':'0');}catch(e){}}
});
