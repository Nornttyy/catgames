import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadSave,mergeUnitySave} from '../save-store.js';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
function storage(values={}){const data=new Map(Object.entries(values));return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}

test('live entry restores the actual Canvas game and keeps the Unity source backup',()=>{
 const html=read('index.html');assert.match(html,/id="scene"/);assert.match(html,/app\.js\?v=canvas-return/);assert.doesNotMatch(html,/createUnityInstance|Web\.wasm/);
 for(const mode of ['table','fish','jump','race','brawl'])assert.ok(html.includes(`data-game="${mode}"`));
 assert.ok(fs.existsSync(new URL('unity/Assets/Scripts/CatWorld.cs',root)));
 assert.equal(JSON.parse(read('build-info.json')).engine,'Canvas 2D');
});
test('all local module imports and HTML asset references resolve',()=>{
 for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.js'))){const js=read(file);for(const m of js.matchAll(/(?:from\s*|import\s*)['"]\.\/([^'"?]+)(?:\?[^'"]*)?['"]/g))assert.ok(fs.existsSync(new URL(m[1],root)),`${file}: ${m[1]}`);}
 for(const m of read('index.html').matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g))if(!m[1].includes(':'))assert.ok(fs.existsSync(new URL(m[1],root)),m[1]);
});
test('merges best scores and smallest nonzero ranks without losing old fields',()=>{
 const out=mergeUnitySave({best:100,fishBest:12,raceBest:1,brawlBest:0,extra:'keep',matchRecords:{'race:garden:normal':1}},{best:[80,20,6,2,3],taught:[true,false,true],color:'orange',mode:3,muted:true,raceMap:'harbor',raceDifficulty:'hard',matchRecords:[0,2]});
 assert.deepEqual([out.best,out.fishBest,out.jumpBest,out.raceBest,out.brawlBest],[100,20,6,1,3]);assert.equal(out.extra,'keep');assert.equal(out.matchRecords['race:garden:normal'],1);assert.equal(out.mode,'race');assert.equal(out.color,'orange');assert.equal(out.matchSettings.race.map,'harbor');assert.equal(out.muted,true);
});
test('Unity migration is one-time and preserves recoverable originals',()=>{
 const old='{"color":"gray","best":9}',unity=JSON.stringify({best:[10,0,0,0,0],color:'orange'}),s=storage({'cat-games-v1':old,'catgames-unity-mirror':unity});
 assert.equal(loadSave(s).color,'orange');assert.equal(s.getItem('cat-games-before-canvas-return'),old);assert.equal(s.getItem('catgames-unity-mirror'),unity);
 s.setItem('cat-games-v1','{"color":"cream","best":30}');assert.equal(loadSave(s).color,'cream');assert.equal(loadSave(s).best,30);
});
test('old-only, corrupt and unavailable storage are safe',()=>{
 assert.equal(loadSave(storage({'cat-games-v1':'{"best":14}'})).best,14);
 assert.deepEqual(loadSave(storage({'cat-games-v1':'null','catgames-unity-mirror':'bad'})),{});
 assert.deepEqual(loadSave({getItem(){throw Error('blocked');}}),{});
});
