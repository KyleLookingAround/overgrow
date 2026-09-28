// Builds the single-page game from src/:
//   dist/index.html  - the page GitHub Pages publishes
//   build/test.html  - the same page with window.__sim exposed, for the checks and the bot
// Then writes docs/graph.json (tools/graph.mjs) and rejoins the joined lists (tools/join.mjs).
// Plain Node, no dependencies.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {Script} from 'node:vm';
import {root,shell as readShell,parts as readParts,joinGame,page,locate,randomSlips} from './sources.mjs';

const parts=readParts(),shell=readShell();
const fail=m=>{console.error('build: '+m);process.exit(1)};
const parse=(code,filename,where=l=>`${filename}:${l}`)=>{try{new Script(code,{filename})}catch(e){
  const l=+((e.stack||'').split('\n')[0].match(/:(\d+)$/)||[])[1];fail(`${e.message} at ${l?where(l):filename}`)}};

if(!shell.includes('/*GAME*/'))fail('src/shell.html has lost its /*GAME*/ marker');
if(!parts.length)fail('src/game/ has no .js files');
for(const p of parts){
  if(!p.text.endsWith('\n'))fail(p.file+' must end with a newline');
  if(/<\/script/i.test(p.text))fail(p.file+' must not contain a closing script tag');
  parse(p.text,p.file); // each file is whole statements, so a slip is reported against the right file
}
const slips=randomSlips(parts);
if(slips.length)fail(`${slips[0]} uses Math.random(); use rnd() for anything that can change the game, or end the line with // cosmetic if it only affects sound or drawing`+(slips.length>1?` (and ${slips.length-1} more)`:''));
const game=joinGame(parts);
if(!game.includes('/*SIM_HOOK*/'))fail('src/game has lost its /*SIM_HOOK*/ marker');
parse(game,'src/game',l=>{const w=locate(parts,l);return w.file+':'+w.line}); // a top-level const or let declared twice across files
// two top-level functions with one name silently replace each other
const names=[];
for(const p of parts)for(const m of p.text.matchAll(/^function ([A-Za-z0-9_$]+)/gm))names.push([m[1],p.file]);
const dup=[...new Set(names.filter(([n],i)=>names.findIndex(([o])=>o===n)!==i).map(([n])=>n))];
if(dup.length)fail('duplicate top-level functions: '+dup.map(n=>`${n} in ${names.filter(([o])=>o===n).map(([,f])=>f).join(' and ')}`).join('; '));

// window.__sim (build/test.html only): every top-level name the tools reach as S.<name> or __sim.<name> (tools/,
// tools/checks/ and its lib/, and throwaway scripts in build/), found here rather than kept in a list. A top-level let
// gets a getter and a setter, so the checks read its live value, not a copy made when the page loaded.
const topLevel=new Map(); // name -> 'let' or 'const'
for(const p of parts)for(const line of p.text.split('\n')){
  const m=line.match(/^(?:async\s+)?(function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/);if(!m)continue;
  const kind=m[1]==='let'?'let':'const';topLevel.set(m[2],kind);
  if(m[1]!=='const'&&m[1]!=='let')continue;
  let d=0;for(let k=m[0].length;k<line.length;k++){const c=line[k]; // more names in the same declaration, outside brackets
    if('([{'.includes(c))d++;else if(')]}'.includes(c))d--;else if(c===';'&&!d)break;
    else if(c===','&&!d){const n=line.slice(k+1).match(/^\s*([A-Za-z_$][\w$]*)\s*=(?!=)/);if(n)topLevel.set(n[1],kind)}
    else if(c==='"'||c==="'"||c==='`'){const e=line.indexOf(c,k+1);if(e<0)break;k=e}}
}
const scripts=d=>existsSync(join(root,d))?readdirSync(join(root,d)).filter(f=>/\.m?js$/.test(f)).map(f=>d+'/'+f):[];
const used=new Set();
for(const f of [...scripts('tools'),...scripts('tools/checks'),...scripts('tools/checks/lib'),...scripts('build')])
  for(const m of readFileSync(join(root,f),'utf8').matchAll(/\b(?:S|__sim)\.([A-Za-z_$][\w$]*)/g))used.add(m[1]);
const simNames=[...used].filter(n=>topLevel.has(n)).sort();
const SIM='window.__sim={'+simNames.map(n=>topLevel.get(n)==='let'?`get ${n}(){return ${n}},set ${n}(v){${n}=v}`:n).join(',')+'};';
const simGame=game.replace('/*SIM_HOOK*/',()=>SIM);

const built=page(shell,game);
mkdirSync(join(root,'dist'),{recursive:true});
writeFileSync(join(root,'dist/index.html'),built);
mkdirSync(join(root,'build'),{recursive:true});
writeFileSync(join(root,'build/test.html'),page(shell,simGame));
{const {build:graph}=await import('./graph.mjs');writeFileSync(join(root,'docs/graph.json'),JSON.stringify(graph(),null,1))} // the map sessions query
// the lists joined from one file per entry (tools/join.mjs): lessons, roadmap, decisions, systems, checks and files
{const {joinedFiles,rejoin}=await import('./join.mjs');for(const f of joinedFiles()){let s;try{s=rejoin(f)}catch(e){fail(e.message)}if(s!==readFileSync(join(root,f),'utf8'))writeFileSync(join(root,f),s)}}
console.log(`built dist/index.html (${Math.round(built.length/1024)} KB) from ${parts.length} files, build/test.html (${simNames.length} names in __sim), docs/graph.json and the joined lists`);
