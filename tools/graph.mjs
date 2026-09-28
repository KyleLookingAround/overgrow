// A map of the game for sessions finding their way around, built from the source every time (plain Node, no dependencies).
//   node tools/graph.mjs <name>     everything related to a system, file, function, name or check group
//   node tools/graph.mjs --write    writes docs/graph.json (git-ignored; npm run build does this too)
//   node tools/graph.mjs --check    fails on broken doc links and docs/systems/ files that name no game files; warns when a
//                                   system's file changed on this branch but its notes didn't
// What it reads: src/game/*.js (top-level functions and names), tools/checks/*.mjs (each group and what it calls through
// window.__sim), and the docs' own link lines: docs/systems/ (one file per system, and the game files it names),
// docs/decisions/, docs/specs/ (issue and PRs), and docs/lessons/ (each "→" line's targets).
// Final Call's version also maps saved fields and hook tables; add those here when the game has them (the spec says which).
import {readFileSync,readdirSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execSync} from 'node:child_process';

const root=join(dirname(fileURLToPath(import.meta.url)),'..'),rd=p=>readFileSync(join(root,p),'utf8');
const ls=d=>existsSync(join(root,d))?readdirSync(join(root,d)).sort():[];
const uniq=a=>[...new Set(a)].sort(),all=(s,re,k=1)=>[...s.matchAll(re)].map(m=>m[k]);

export function build(){
  const files={},defs={};
  for(const f of ls('src/game').filter(f=>f.endsWith('.js'))){
    const s=rd('src/game/'+f);
    const funcs=uniq([...all(s,/^function\s+(\w+)/gm),...all(s,/^(?:const|let)\s+(\w+)\s*=\s*(?:\([^)]*\)|\w+)\s*=>/gm)]);
    const names=uniq(all(s,/^(?:const|let)\s+(\w+)\s*=/gm)).filter(n=>!funcs.includes(n));
    files[f]={funcs,names};for(const n of [...funcs,...names])(defs[n]||(defs[n]=[])).push(f);
  }
  const checks={};
  for(const f of ls('tools/checks').filter(f=>f.endsWith('.mjs'))){const s=rd('tools/checks/'+f);checks[f.slice(0,-4)]={file:'tools/checks/'+f,sim:uniq(all(s,/\bS\.(\w+)/g).concat(all(s,/__sim\.(\w+)/g)))}}
  const titled=d=>ls(d).filter(f=>f.endsWith('.md')&&f!=='README.md'&&f!=='TEMPLATE.md').map(f=>{const s=rd(d+'/'+f);return {file:d+'/'+f,title:(s.match(/^# (.*)/m)||[])[1]||f,text:s}});
  const decisions=titled('docs/decisions').filter(d=>/\/ADR-/.test(d.file)).map(d=>({file:d.file,title:d.title,refs:refsIn(d.text.replace(/## Context[\s\S]*?(?=\n## )/,''))}));
  const specs=titled('docs/specs').map(d=>({file:d.file,title:d.title,issue:(d.text.match(/Issue: #(\d+)/)||[])[1]||null,refs:refsIn(d.text)}));
  const lessons=titled('docs/lessons').map(d=>({file:d.file,title:d.title,to:uniq(d.text.split('\n').filter(l=>l.includes('→')).flatMap(l=>refsIn(l.slice(l.indexOf('→')))))}));
  return {files,defs,checks,systems:systems(),decisions,specs,lessons};
}
// file references in a piece of docs: `12-garden.js`, src/game/…, tools/…, docs/…, .claude/skills/<name>, and `feature` playbook mentions
function refsIn(s){
  s=s.replace(/`[^`]*\bNN-[^`]*`/g,''); // placeholders such as src/game/NN-name.js
  return uniq([...all(s,/\b(\d\d-[\w-]+\.js)\b/g).map(f=>'src/game/'+f),...all(s,/\b((?:src|tools|docs|\.github)\/[\w./-]+\.(?:js|mjs|md|json|html|yml))\b/g),
    ...all(s,/`(\w+)` playbook/g).map(p=>'.claude/skills/'+p+'/SKILL.md'),...all(s,/\.claude\/skills\/(\w+)/g).map(p=>'.claude/skills/'+p+'/SKILL.md')]);
}
// docs/systems/: each file is a system, named by its "# " line; its files are the game files its text names
function systems(){
  const out={};
  for(const f of ls('docs/systems').filter(f=>f.endsWith('.md'))){const s=rd('docs/systems/'+f),k=(s.match(/^# (.+)/m)||[])[1]||f,refs=refsIn(s);
    out[k]={doc:'docs/systems/'+f,files:refs.filter(x=>x.startsWith('src/game/')),refs,names:uniq(all(s,/`(\w+)(?:\([^`]*\))?`/g))}}
  return out;
}
// the check groups that call any of these names through window.__sim
export function checksCalling(g,names){return Object.entries(g.checks).filter(([,c])=>c.sim.some(n=>names.includes(n))).map(([k])=>k)}
// everything related to a name, in a short list
export function query(g,q){
  const lo=q.toLowerCase(),out=[],add=(k,v)=>{v=[].concat(v).filter(Boolean);if(v.length)out.push(`${k}: ${uniq(v).join(', ')}`)};
  const docsFor=paths=>({sys:Object.entries(g.systems).filter(([,s])=>s.files.some(f=>paths.includes(f))).map(([k])=>k),
    dec:g.decisions.filter(d=>d.refs.some(f=>paths.includes(f))).map(d=>d.file),les:g.lessons.filter(l=>l.to.some(f=>paths.includes(f))).map(l=>l.title),spec:g.specs.filter(s=>s.refs.some(f=>paths.includes(f))).map(s=>s.file)});
  const file=Object.keys(g.files).find(f=>f===q||f.replace(/\.js$/,'')===q||f.slice(3).replace(/\.js$/,'')===lo);
  const sysName=Object.keys(g.systems).find(k=>k.toLowerCase()===lo)||Object.keys(g.systems).find(k=>k.toLowerCase().includes(lo));
  if(file){const F=g.files[file],d=docsFor(['src/game/'+file]);out.push(`file src/game/${file}`);add('functions',F.funcs);add('names',F.names);
    add('checks',checksCalling(g,F.funcs.concat(F.names)));add('systems',d.sys);add('specs',d.spec);add('decisions',d.dec);add('lessons',d.les);return out}
  if(sysName){const S=g.systems[sysName],d=docsFor(S.files);out.push(`system "${sysName}" (${S.doc})`);add('files',S.files.map(f=>f.slice(9)));
    add('checks',checksCalling(g,S.files.flatMap(f=>{const F=g.files[f.slice(9)];return F?F.funcs.concat(F.names):[]})));add('specs',d.spec);add('decisions',d.dec);add('lessons',d.les);return out}
  if(g.checks[q]){const c=g.checks[q];out.push(`check group ${q} (${c.file})`);add('calls',c.sim);add('defined in',c.sim.flatMap(n=>g.defs[n]||[]));return out}
  if(g.defs[q]){const at=g.defs[q],d=docsFor(at.map(f=>'src/game/'+f));out.push(`name ${q}`);add('defined in',at);
    add('used in',Object.keys(g.files).filter(f=>!at.includes(f)&&new RegExp('\\b'+q+'\\b').test(rd('src/game/'+f))));add('checks',checksCalling(g,[q]));add('systems',d.sys);add('decisions',d.dec);return out}
  // anything else: names, systems, files and docs that contain it
  add('names like it',Object.keys(g.defs).filter(n=>n.toLowerCase().includes(lo)).slice(0,20));add('systems like it',Object.keys(g.systems).filter(k=>k.toLowerCase().includes(lo)));
  add('files like it',Object.keys(g.files).filter(f=>f.includes(lo)));
  add('docs like it',[...g.decisions,...g.specs,...g.lessons].filter(d=>d.file.toLowerCase().includes(lo)||d.title.toLowerCase().includes(lo)).map(d=>d.file));
  return out.length?out:[`nothing found for ${q}`];
}
// broken links, systems without files, and systems whose files changed without their notes
export function check(g){
  const errs=[],warns=[],exists=p=>existsSync(join(root,p));
  for(const [k,S] of Object.entries(g.systems)){if(!S.files.length)errs.push(`${S.doc}: "${k}" names no game files`);for(const f of S.refs)if(!exists(f))errs.push(`${S.doc} links to ${f}, which doesn't exist`)}
  for(const d of g.decisions)for(const f of d.refs)if(!exists(f))errs.push(`${d.file} links to ${f}, which doesn't exist`);
  for(const s of g.specs)for(const f of s.refs)if(!exists(f)&&!/\/(new|parts?)\b/.test(f))errs.push(`${s.file} links to ${f}, which doesn't exist`);
  for(const l of g.lessons)for(const f of l.to)if(!exists(f))errs.push(`${l.file} points at ${f}, which doesn't exist`);
  let changed=[];try{const base=execSync('git merge-base HEAD origin/main',{cwd:root,stdio:['ignore','pipe','ignore']}).toString().trim();changed=execSync(`git diff --name-only ${base}`,{cwd:root}).toString().split('\n').filter(Boolean)}catch(e){}
  if(changed.length)for(const [k,S] of Object.entries(g.systems)){const hit=S.files.filter(f=>changed.includes(f));if(hit.length&&!changed.includes(S.doc))warns.push(`${hit.join(', ')} changed but ${S.doc} ("${k}") didn't: is it still true?`)}
  return {errs,warns};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const a=process.argv.slice(2),g=build();
  if(a[0]==='--write'){mkdirSync(join(root,'docs'),{recursive:true});writeFileSync(join(root,'docs/graph.json'),JSON.stringify(g,null,1));console.log('wrote docs/graph.json')}
  else if(a[0]==='--check'){const {errs,warns}=check(g);for(const w of warns)console.log('WARN  '+w);for(const e of errs)console.log('FAIL  '+e);console.log(errs.length?`${errs.length} broken`:'graph: links and sections all sound');process.exit(errs.length?1:0)}
  else if(a.length)for(const q of a)console.log(query(g,q).join('\n')+'\n');
  else console.log('node tools/graph.mjs <system | file | function | name | check group>   (--write, --check)');
}
