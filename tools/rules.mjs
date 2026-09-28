// The rules every source file keeps, checked from the files themselves (plain Node, no dependencies). tools/build.mjs
// refuses to build on a broken one; the `rules` check group reports each. docs/SYSTEMS.md "Rules" says why.
//   node tools/rules.mjs      lists the problems, exit code 1 if any
// The rules:
//   randomness  Math.random() only in src/sim/random.ts, or on a line ending with `// cosmetic` (drawing, sound).
//   layers      src/sim/ and src/data/ import nothing from src/ui/ or src/app/, and never name window, document,
//               localStorage, self or postMessage: the sim runs the same in a worker, in Node and in a test.
//   sources     every model in src/sim/models/ has a `// Sources:` block naming what it's based on and a
//               `// Simplifies:` line saying what it leaves out (docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md).
import {readFileSync,readdirSync,statSync,existsSync} from 'node:fs';
import {dirname,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

export const root=join(dirname(fileURLToPath(import.meta.url)),'..');
/** every source file under a folder, as paths relative to the repo root */
export function walk(dir){
  const out=[],abs=join(root,dir);if(!existsSync(abs))return out;
  for(const f of readdirSync(abs).sort()){const p=join(abs,f);if(statSync(p).isDirectory())out.push(...walk(join(dir,f)));else if(/\.(ts|tsx|css)$/.test(f))out.push(relative(root,p))}
  return out;
}
const rd=p=>readFileSync(join(root,p),'utf8');

export function randomSlips(files=walk('src')){
  const out=[];
  for(const f of files){if(f==='src/sim/random.ts'||!/\.tsx?$/.test(f))continue;
    rd(f).split('\n').forEach((l,i)=>{if(/Math\.random\(/.test(l.replace(/\/\/.*$/,''))&&!/\/\/ cosmetic\s*$/.test(l))out.push(`${f}:${i+1} uses Math.random(); draw from the game's Rng, or end the line with // cosmetic if it only affects drawing or sound`)})}
  return out;
}
export function layerSlips(files=walk('src')){
  const out=[];
  for(const f of files){if(!/^src\/(sim|data)\//.test(f)||!/\.tsx?$/.test(f))continue;
    rd(f).split('\n').forEach((l,i)=>{
      if(/^\s*import\b.*from\s+['"][^'"]*\/(ui|app)\//.test(l)||/^\s*import\b.*from\s+['"]preact/.test(l))out.push(`${f}:${i+1} imports the UI or the app; the sim and its data stay pure`);
      if(/\b(window|document|localStorage|sessionStorage|postMessage|requestAnimationFrame)\b/.test(l)&&!/^\s*\/\//.test(l))out.push(`${f}:${i+1} names ${RegExp.$1}; the sim runs the same in a worker, in Node and in a test`);
      if(/(^|[^\w.])self\b/.test(l)&&!/^\s*\/\//.test(l))out.push(`${f}:${i+1} names self; the worker boundary lives in src/app/`);
    })}
  return out;
}
export function sourceSlips(files=walk('src/sim/models')){
  const out=[];
  for(const f of files){if(!/\.tsx?$/.test(f)||/\.test\.ts$/.test(f))continue;const s=rd(f);
    if(!/^\/\/ Sources:\s*\S/m.test(s))out.push(`${f} has no "// Sources:" block naming what its mechanism is based on`);
    if(!/^\/\/ Simplifies:\s*\S/m.test(s))out.push(`${f} has no "// Simplifies:" line saying what it leaves out`);
  }
  return out;
}
export const problems=()=>[...randomSlips(),...layerSlips(),...sourceSlips()];

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const bad=problems();for(const b of bad)console.log('FAIL  '+b);
  console.log(bad.length?`${bad.length} broken`:'rules: every source file keeps them');process.exit(bad.length?1:0);
}
