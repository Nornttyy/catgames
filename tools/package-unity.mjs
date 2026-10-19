import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv.includes('--replace-live')) throw new Error('The live game is Canvas again. Unity is archived; pass --replace-live only for an explicitly requested Unity deployment.');
const project = path.resolve(process.argv.slice(2).find(arg=>!arg.startsWith('--')) || path.join(repo, 'unity'));
const build = path.join(project, 'Builds', 'Web');
const htmlPath = path.join(build, 'index.html');
if (!fs.existsSync(htmlPath)) throw new Error('Build Unity Web first: 小猫游戏多 → 构建网页试玩');
let html = fs.readFileSync(htmlPath, 'utf8');
if (!html.includes('createUnityInstance') || html.includes('{{{')) throw new Error('Expected a compiled Unity Web build, not a template');

// Only export game-owned build artifacts. Never copy Library, Tools, logs or QA saves.
const exported = [];
for (const entry of ['Build', 'StreamingAssets', 'cat.png', 'title.png', 'cat-bgm.mp3']) {
  const source = path.join(build, entry);
  if (fs.existsSync(source)) { fs.cpSync(source, path.join(repo, entry), { recursive: true }); exported.push(entry); }
}
const files = {};
html = html.replace(/Build\/([A-Za-z0-9_.-]+)(?:\?v=[a-f0-9]+)?(?=['"])/g, (_, name) => {
  const file = fs.readFileSync(path.join(repo, 'Build', name));
  const hash = crypto.createHash('sha256').update(file).digest('hex');
  files['Build/' + name] = { sha256: hash, bytes: file.length };
  return 'Build/' + name + '?v=' + hash.slice(0, 12);
});
fs.writeFileSync(path.join(repo, 'index.html'), html);

if (project !== path.join(repo, 'unity')) {
  for (const dir of ['Assets', 'Packages', 'ProjectSettings', 'Design/Licenses']) {
    fs.cpSync(path.join(project, dir), path.join(repo, 'unity', dir), {
      recursive: true, filter: source => path.basename(source) !== '.DS_Store',
    });
  }
}
fs.cpSync(path.join(project, 'Design/Licenses/Noto-SIL-OFL.txt'), path.join(repo, 'Noto-SIL-OFL.txt'));
const editor = fs.readFileSync(path.join(project, 'ProjectSettings/ProjectVersion.txt'), 'utf8').match(/m_EditorVersion: (.+)/)?.[1];
fs.writeFileSync(path.join(repo, 'build-info.json'), JSON.stringify({
  engine: 'Unity', editor, version: '1.0.0', gameplay: 'native C# / IL2CPP / WebAssembly',
  modes: ['table', 'fish', 'jump', 'race', 'brawl'], files,
}, null, 2) + '\n');
console.log('Unity source + Web build packaged:', exported.join(', '));
