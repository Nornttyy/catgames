export const DIFFICULTIES={
  casual:{label:'休闲',racePattern:'single',brawlTactics:'chase'},
  normal:{label:'普通',racePattern:'mixed',brawlTactics:'dodge'},
  hard:{label:'困难',racePattern:'combo',brawlTactics:'counter'},
};
export const MAPS={race:[{id:'garden',name:'花园小径',art:'race-track-vertical',file:'race-track-vertical.webp'},{id:'harbor',name:'海边栈道',art:'race-harbor',file:'race-harbor.png'}],brawl:[{id:'kitchen',name:'厨房混战',art:'brawl-kitchen',file:'brawl-kitchen.webp'},{id:'living',name:'客厅乱斗',art:'brawl-living',file:'brawl-living.png'}]};
export function difficultyKey(key){return Object.hasOwn(DIFFICULTIES,key)?key:'normal';}
export function mapFor(mode,key){const list=MAPS[mode]||MAPS.race;return list.find(m=>m.id===key)||list[0];}
