// Presentation only: no game rules, rewards, or saved progress live here.
export const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
export function chainState(clean,boost){
  return {filled:boost>0?3:Math.max(0,clean)%3,boosting:boost>0};
}
export function resultSummary(mode,s,previous=0,result=''){
  if(mode==='brawl'){
    const c=s.cats[0],record=previous>0&&s.rank<previous;
    return {win:s.rank===1,record,title:s.rank===1?'厨房小霸王！':c.hp<=0?'先歇一会儿':'时间到',score:`第 ${s.rank} 名`,stats:[['击倒',`${c.kills} 只`],['伤害',String(c.damage)],['坚持',`${Math.floor(s.time)} 秒`]]};
  }
  if(mode==='race'){
    const r=s.racers[0],record=previous>0&&s.rank<previous;
    return {win:s.rank===1,record,title:s.rank===1?'冲线第一！':s.rank===2?'差一点！':'到终点啦',score:`第 ${s.rank} 名`,
      stats:[['用时',`${r.finishTime.toFixed(1)} 秒`],['最长连过',`${r.bestClean} 组`],['碰撞',`${r.misses} 次`]]};
  }
  const record=s.score>previous,win=result==='cleared';
  if(mode==='jump')return {win:record,record,title:record?'新纪录！':'碰到尖刺啦',score:String(s.score),stats:[['越过',`${s.cleared} 组`],['本次得分',String(s.score)],['最高分',String(Math.max(previous,s.score))]]};
  return {win,record,title:result==='caught'?'被发现了':win?(mode==='fish'?'吃饱啦！':'桌面清空！'):'时间到',score:String(s.score),
    stats:mode==='fish'?[['带回',`${s.caught} 条`],['最多连偷',`${s.bestHaul} 条`],['最高分',String(Math.max(previous,s.score))]]:[['推落',`${s.falls} 件`],['剩余',`${s.props.length-s.falls} 件`],['最高分',String(Math.max(previous,s.score))]]};
}
