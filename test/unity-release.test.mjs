import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const info = JSON.parse(read('build-info.json'));

test('homepage runs compiled Unity, not the legacy JavaScript game', () => {
  const html = read('index.html');
  assert.match(html, /createUnityInstance/);
  assert.match(html, /productVersion:'1\.0\.0'/);
  assert.doesNotMatch(html, /src=["'](?:\.\/)?app\.js/);
  assert.equal(info.engine, 'Unity');
  assert.equal(info.editor, '6000.3.20f1');
  assert.deepEqual(info.modes, ['table', 'fish', 'jump', 'race', 'brawl']);
  assert.match(html, /audio-credits\.html/);
});

test('every Unity payload exists, matches its SHA256 and has a cache version', () => {
  const html = read('index.html');
  assert.equal(Object.keys(info.files).length, 4);
  for (const [file, expected] of Object.entries(info.files)) {
    const bytes = fs.readFileSync(path.join(root, file));
    assert.equal(bytes.length, expected.bytes);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), expected.sha256);
    assert.ok(html.includes(file + '?v=' + expected.sha256.slice(0, 12)));
    assert.ok(bytes.length < 100 * 1024 * 1024, 'GitHub individual-file limit');
    if (file.endsWith('.wasm.unityweb')) assert.equal(gunzipSync(bytes).subarray(0, 4).toString('hex'), '0061736d');
  }
});

test('all five native modes, scene, animation assets and licenses are in the project', () => {
  for (const mode of ['Table', 'Fish', 'Jump', 'Race', 'Brawl']) {
    assert.match(read('unity/Assets/Scripts/' + mode + 'Game.cs'), new RegExp('class ' + mode + 'Game'));
  }
  assert.match(read('unity/Assets/Scenes/CatGames.unity'), /Native Unity/);
  for (const color of ['gray', 'orange', 'cream', 'black']) {
    assert.ok(fs.existsSync(path.join(root, 'unity/Assets/Resources/Art/side-stride-' + color + '.png')));
  }
  assert.match(read('Noto-SIL-OFL.txt'), /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(read('audio-credits.html'), /Kevin MacLeod/);
  for (const dir of ['Library', 'Tools', 'Logs', 'Temp', 'Backups']) assert.equal(fs.existsSync(path.join(root, 'unity', dir)), false);
});

function bridge(initial = {}, broken = false) {
  const values = new Map(Object.entries(initial));
  let result = '';
  const context = {
    LibraryManager: { library: {} },
    mergeInto: (target, source) => Object.assign(target, source),
    localStorage: {
      getItem: key => { if (broken) throw new Error('Storage blocked'); return values.get(key) ?? null; },
      setItem: (key, value) => { if (broken) throw new Error('Storage blocked'); values.set(key, value); },
    },
    lengthBytesUTF8: text => Buffer.byteLength(text), _malloc: () => 1,
    stringToUTF8: text => { result = text; }, UTF8ToString: text => text,
  };
  vm.runInNewContext(read('unity/Assets/Plugins/WebGL/CatSave.jslib'), context);
  return {
    load() { context.LibraryManager.library.CatReadSave(); return JSON.parse(result); },
    store(value) { context.LibraryManager.library.CatWriteSave(JSON.stringify(value)); }, values,
  };
}

test('old browser progress migrates without changing or removing the old save', () => {
  const old = { color: 'orange', mode: 'brawl', muted: true, best: 91, fishBest: 22, jumpBest: 18, raceBest: 2, brawlBest: 1,
    taught: true, fishTaught: true, matchSettings: { race: { map: 'harbor', difficulty: 'hard' }, brawl: { map: 'living', difficulty: 'casual' } },
    matchRecords: { 'race:harbor:hard': 2, 'brawl:living:casual': 1 } };
  const original = JSON.stringify(old), b = bridge({ 'cat-games-v1': original }), saved = b.load();
  assert.equal(saved.mode, 4); assert.equal(saved.color, 'orange'); assert.equal(saved.muted, true);
  assert.deepEqual(saved.best, [91, 22, 18, 2, 1]); assert.deepEqual(saved.taught, [true, true, false, false, false]);
  assert.equal(saved.raceMap, 'harbor'); assert.equal(saved.brawlDifficulty, 'casual');
  assert.equal(saved.matchRecords[5], 2); assert.equal(saved.matchRecords[9], 1);
  assert.equal(b.values.get('cat-games-v1'), original);
});

test('Unity save mirror takes precedence and persists the audio setting', () => {
  const modern = { color: 'cream', mode: 3, muted: false };
  const b = bridge({ 'catgames-unity-mirror': JSON.stringify(modern), 'cat-games-v1': '{"color":"black"}' });
  assert.deepEqual(b.load(), modern);
  b.store({ ...modern, muted: true });
  assert.equal(b.values.get('cat-unity-muted'), '1');
  assert.equal(b.load().muted, true);
});

test('empty and blocked storage do not break Unity initialization', () => {
  const empty = bridge().load(); assert.equal(empty.color, 'gray'); assert.equal(empty.matchRecords.length, 12);
  assert.deepEqual(bridge({}, true).load(), {});
  assert.doesNotThrow(() => bridge({}, true).store({ muted: false }));
  assert.deepEqual(bridge({ 'cat-games-v1': 'invalid JSON' }).load(), {});
});
