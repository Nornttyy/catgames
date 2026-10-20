import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CATS,GIFT_COINS,loadEconomy,ownsCat,equippedCat,buyCat,coinsForRound,settleRound,doubleRound,giftsLeft,claimGift,RewardSession,dayKey} from '../economy.js';
import {loadSave} from '../save-store.js';
import {createRace,raceAction,updateRace} from '../race-model.js';

test('new and pre-economy saves own only black without discarding existing records',()=>{
 const old={color:'orange',best:999,matchRecords:{'race:garden:hard':1},muted:true};
 const storage={getItem:key=>key==='cat-games-v1'?JSON.stringify(old):null};
 const saved=loadSave(storage),wallet=loadEconomy(saved.economy);
 assert.deepEqual(wallet.owned,['black']);assert.equal(wallet.coins,0);
 assert.equal(equippedCat(wallet,saved.color),'black');assert.equal(saved.best,999);
 assert.equal(saved.muted,true);assert.equal(saved.matchRecords['race:garden:hard'],1);
});
test('unlocked cats and currency persist; corrupt saves cannot create invalid balances',()=>{
 const wallet=loadEconomy({version:1,coins:201.9,owned:['gray','gray','oops'],giftDay:'x',giftCount:99});
 assert.deepEqual(wallet.owned,['black','gray']);assert.equal(wallet.coins,201);
 assert.equal(equippedCat(wallet,'gray'),'gray');assert.equal(equippedCat(wallet,'cream'),'black');
 assert.deepEqual(loadEconomy(JSON.parse(JSON.stringify(wallet))),wallet);
 for(const coins of [-10,Infinity,NaN,'oops'])assert.equal(loadEconomy({version:1,coins}).coins,0);
});
test('purchases charge the exact price once, require enough coins, never unlock by preview',()=>{
 const w=loadEconomy();
 assert.equal(buyCat(w,'gray'),false);assert.equal(buyCat(w,'missing'),false);
 assert.equal(equippedCat(w,'orange'),'black');assert.deepEqual(w.owned,['black']);
 w.coins=600;
 assert.equal(buyCat(w,'gray'),true);assert.equal(w.coins,420);
 assert.equal(buyCat(w,'gray'),false);assert.equal(w.coins,420);
 assert.equal(buyCat(w,'orange'),true);assert.equal(w.coins,60);
 assert.equal(buyCat(w,'cream'),false);assert.equal(ownsCat(w,'black'),true);
 assert.deepEqual(CATS.map(c=>c.price),[0,180,360,600]);
});
test('all five modes award performance coins, even on loss, but not on quit or zero actions',()=>{
 assert.equal(coinsForRound('table',{status:'over',falls:4},'caught'),12);
 assert.equal(coinsForRound('table',{status:'over',falls:12},'cleared'),48);
 assert.equal(coinsForRound('fish',{status:'over',caught:8},'caught'),16);
 assert.equal(coinsForRound('jump',{status:'ended',cleared:7}),21);
 assert.equal(coinsForRound('race',{status:'ended',rank:3,racers:[{finishTime:60,bestClean:2}]}),32);
 assert.equal(coinsForRound('brawl',{status:'ended',rank:5,time:60,cats:[{kills:1}]}),14);
 for(const mode of ['table','fish','jump','race','brawl']){
   assert.equal(coinsForRound(mode,{status:'play',falls:20,caught:20,cleared:20,time:60,rank:1}),0);
   assert.equal(coinsForRound(mode,{status:'ended'}),0);
 }
 assert.equal(coinsForRound('jump',{status:'ended',cleared:10000}),60);
 assert.equal(coinsForRound('race',{status:'ended',rank:1,racers:[{finishTime:null}]}),0);
});
test('round settlement and doubling are idempotent including after a reload',()=>{
 let w=loadEconomy();
 assert.equal(settleRound(w,'round1','jump',{status:'ended',cleared:4}),12);
 assert.equal(settleRound(w,'round1','jump',{status:'ended',cleared:4}),0);
 assert.equal(doubleRound(w,'wrong'),0);assert.equal(doubleRound(w,'round1'),12);
 w=loadEconomy(JSON.parse(JSON.stringify(w)));
 assert.equal(doubleRound(w,'round1'),0);assert.equal(w.coins,24);
 assert.equal(settleRound(w,'round1','jump',{status:'ended',cleared:4}),0);
 settleRound(w,'round2','jump',{status:'ended',cleared:0});
 assert.equal(doubleRound(w,'round2'),0);assert.equal(doubleRound(w,'round1'),0);
});
test('wallet and wardrobe share one daily supply limit with no cash or endless ad farming',()=>{
 const w=loadEconomy();assert.equal(giftsLeft(w,'a'),3);
 for(let i=0;i<3;i++)assert.equal(claimGift(w,'a'),GIFT_COINS);
 assert.equal(giftsLeft(w,'a'),0);assert.equal(claimGift(w,'a'),0);assert.equal(w.coins,120);
 assert.equal(claimGift(w,'b'),40);assert.equal(giftsLeft(w,'b'),2);
 assert.equal(dayKey(new Date(2026,9,20)),'2026-10-20');
});
test('simulated ad requires five foreground seconds, is cancellable, and can pay only once',()=>{
 let earned=0;
 const ad=new RewardSession();
 ad.advance(Infinity);ad.advance(NaN);ad.advance(-10);
 assert.equal(ad.elapsed,0);assert.equal(ad.claim(()=>earned++),false);
 ad.advance(40,false);assert.equal(ad.elapsed,0);
 ad.advance(100);assert.equal(ad.elapsed,.25); // returning from background cannot skip timer
 for(let i=0;i<19;i++)ad.advance(.25);
 assert.equal(ad.ready,true);assert.equal(ad.claim(()=>earned++),true);
 assert.equal(ad.claim(()=>earned++),false);assert.equal(earned,1);
 const cancelled=new RewardSession();cancelled.advance(.25);cancelled.cancel();
 for(let i=0;i<25;i++)cancelled.advance(.25);
 assert.equal(cancelled.claim(()=>earned++),false);assert.equal(earned,1);
});
test('finished real race gives coins and never affects gameplay stats',()=>{
 const race=createRace({color:'black',tutorial:false,random:()=>.5});
 let ticks=0;while(race.status==='play'&&ticks++<14000){if(ticks%90===0)raceAction(race,'jump');updateRace(race,1/60);}
 assert.equal(race.status,'ended');
 const snapshot=JSON.stringify(race),w=loadEconomy();
 assert.ok(settleRound(w,'actual-race','race',race)>0);
 assert.equal(JSON.stringify(race),snapshot);assert.equal(race.racers[0].color,'black');
});
test('UI discloses mock ads at all three entry points and keeps the normal result reward free',()=>{
 const read=f=>fs.readFileSync(new URL(`../${f}`,import.meta.url),'utf8');
 const html=read('index.html'),app=read('app.js'),ad=read('reward-ui.js');
 for(const id of ['wallet-reward','picker-reward','result-double'])assert.match(html,new RegExp(`id="${id}"[^>]*>[\\s\\S]*?模拟广告`));
 assert.match(html,/非真实广告 · 不跳转/);assert.match(html,/id="ad-close"/);
 assert.match(app,/settleRound\(economy,roundId,mode,game,e.result\)/);
 assert.doesNotMatch(ad,/https?:|fetch\(|window\.open|location\./);
 assert.match(app,/pickerColor=b.dataset.color/);
 assert.match(app,/color=equippedCat\(economy,color\)/);
});
