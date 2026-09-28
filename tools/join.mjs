// Joins the lists every session used to add a line to, from one file per entry, so two sessions never edit the same
// lines (plain Node, no dependencies; docs/decisions/ADR-2026-09-28-one-file-per-entry.md).
//   node tools/join.mjs              what's waiting: lessons since the last tidy, What's new fragments for the next release,
//                                    and any joined list that's out of date
//   node tools/join.mjs --write      rewrites the joined lists (npm run build does this); it also clears a merge conflict
//                                    that lies only inside them, and fails if one lies outside
//   node tools/join.mjs --check      fails on a malformed entry or a joined list that's out of date
//   node tools/join.mjs lessons      the lessons, grouped by theme
// The entries:
//   docs/lessons/<pr>-<short-name>.md   one look back per PR; an optional first line "Theme: <theme>" groups it (the tidy
//                                       sets it). docs/lessons/.last-tidy lists the files the last tidy saw.
//   docs/roadmap.d/<date>-<name>.md     a roadmap item; first line "Section: now|next|runbook|done", then the item
//   src/updates.d/<short-name>.md       a What's new entry waiting for a release (no version: the release gives it one)
//   docs/decisions/ADR-*.md, docs/systems/*.md, tools/checks/*.mjs, src/**/*.ts   read for their indexes
// Each joined list sits between <!-- joined:<name> … --> and <!-- /joined:<name> --> in the file that shows it.
import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {root,walk} from './rules.mjs';

export {root};
const rd=p=>readFileSync(join(root,p),'utf8'),ls=d=>existsSync(join(root,d))?readdirSync(join(root,d)).sort():[];
export const TIDY_AT=8; // a tidy of the lessons runs once this many are new since the last one

// ---- the entries ----
export function lessons(){
  return ls('docs/lessons').filter(f=>f.endsWith('.md')).map(f=>{const s=rd('docs/lessons/'+f),theme=(s.match(/^Theme:\s*(.+)$/m)||[])[1];
    return {file:f,theme:theme?theme.trim():'',title:(s.match(/^# (.+)$/m)||[])[1]||f,pr:+(f.match(/^(\d+)-/)||[])[1]||0,text:s}});
}
export function lastTidy(){const p='docs/lessons/.last-tidy';return existsSync(join(root,p))?rd(p).split('\n').map(l=>l.trim()).filter(Boolean):[]}
export const newLessons=()=>{const seen=new Set(lastTidy());return lessons().filter(l=>!seen.has(l.file))};
const SECTIONS=['now','next','runbook','done'];
export function roadmap(){
  return ls('docs/roadmap.d').filter(f=>f.endsWith('.md')).map(f=>{const s=rd('docs/roadmap.d/'+f),m=s.match(/^Section:\s*(\w+)\s*\n/);
    return {file:f,section:m?m[1].toLowerCase():null,body:m?s.slice(m[0].length).trim():s.trim()}});
}
export const updates=()=>ls('src/updates.d').filter(f=>f.endsWith('.md')&&f!=='README.md').map(f=>({file:f,text:rd('src/updates.d/'+f)}));
const comment=s=>{const out=[];for(const l of s.split('\n')){if(!l.startsWith('//'))break;out.push(l.replace(/^\/\/\s?/,''))}return out.join(' ').replace(/\s+/g,' ').trim()};

// ---- the joined lists: [file, name, text] ----
const byPr=(a,b)=>(b.pr||1e9)-(a.pr||1e9)||a.file.localeCompare(b.file);
function lessonIndex(){
  const all=lessons(),themes=[...new Set(all.map(l=>l.theme).filter(Boolean))].sort(),out=[];
  const item=l=>`- [${l.title}](lessons/${l.file})`;
  for(const t of themes)out.push(`### ${t[0].toUpperCase()+t.slice(1)}`,'',...all.filter(l=>l.theme===t).sort(byPr).map(item),'');
  const rest=all.filter(l=>!l.theme).sort(byPr);
  if(rest.length){if(themes.length)out.push('### Not sorted yet','');out.push(...rest.map(item))}
  return out.join('\n').trim();
}
function roadmapSection(sec){
  const items=roadmap().filter(r=>r.section===sec);if(sec==='done')items.reverse();
  return items.map(r=>r.body).join('\n')||'';
}
function decisionTable(){
  const rows=ls('docs/decisions').filter(f=>/^ADR-.*\.md$/.test(f)).map(f=>{const s=rd('docs/decisions/'+f),t=((s.match(/^# (.+)$/m)||[])[1]||f).replace(/^ADR-[\d-]+:\s*/,'');
    const st=((s.match(/## Status\s*\n+([^\n]+)/)||[])[1]||'');
    const note=/^superseded in part/i.test(st)?' (superseded in part)':/^superseded/i.test(st)?' (superseded)':/experiment/i.test(st)?' (an experiment)':'';
    return `| [${f.slice(0,-3)}](${f}) | ${t}${note} |`});
  return ['| Record | Decision |','| --- | --- |',...rows].join('\n');
}
function systemList(){
  return ls('docs/systems').filter(f=>f.endsWith('.md')).map(f=>{const s=rd('docs/systems/'+f),t=(s.match(/^# (.+)$/m)||[])[1]||f;
    const files=[...new Set([...s.split('\n\n')[1]?.matchAll(/(?<![\w.])(src\/[\w./-]+\.tsx?)\b/g)??[]].map(m=>m[1]))];
    return `- [${t}](systems/${f})${files.length?' ('+files.map(x=>'`'+x+'`').join(', ')+')':''}`}).join('\n');
}
function checkList(){
  return ls('tools/checks').filter(f=>f.endsWith('.mjs')).map(f=>`- \`${f.slice(0,-4)}\`: ${comment(rd('tools/checks/'+f))||'(no opening comment yet)'}`).join('\n');
}
function fileTable(){
  const rows=walk('src').filter(f=>/\.(tsx?|css)$/.test(f)&&!/\.test\.ts$/.test(f)).map(f=>{const first=rd(f).split('\n')[0];
    const t=first.replace(/^(\/\/|\/\*)\s*/,'').replace(/\s*\*\/\s*$/,'').trim();
    return `| \`${f}\` | ${t||'(no opening comment yet)'} |`});
  return ['| File | What\'s in it (its first line) |','| --- | --- |',...rows].join('\n');
}
export const LISTS=[
  ['docs/LESSONS.md','lessons','docs/lessons/',lessonIndex],
  ['docs/ROADMAP.md','now','docs/roadmap.d/ (Section: now)',()=>roadmapSection('now')],
  ['docs/ROADMAP.md','next','docs/roadmap.d/ (Section: next)',()=>roadmapSection('next')],
  ['docs/ROADMAP.md','runbook','docs/roadmap.d/ (Section: runbook)',()=>roadmapSection('runbook')],
  ['docs/ROADMAP.md','done','docs/roadmap.d/ (Section: done)',()=>roadmapSection('done')],
  ['docs/decisions/README.md','decisions','the ADR files here',decisionTable],
  ['docs/SYSTEMS.md','systems','docs/systems/',systemList],
  ['docs/SYSTEMS.md','checks','tools/checks/, each file\'s opening comment',checkList],
  ['docs/SYSTEMS.md','files','src/, each file\'s first line',fileTable],
];

// a file with each of its joined lists rebuilt; throws on a conflict marker outside them
const START=n=>new RegExp(`^<!-- joined:${n}\\b.*-->$`,'m'),END=n=>`<!-- /joined:${n} -->`;
export function rejoin(file){
  let s=rd(file);
  for(const [f,n,from,make] of LISTS){if(f!==file)continue;
    const a=s.match(START(n));if(!a)throw new Error(`${file} has lost its <!-- joined:${n} --> marker`);
    const i=a.index+a[0].length,j=s.indexOf(END(n),i);if(j<0)throw new Error(`${file} has lost its ${END(n)} marker`);
    const body=make();
    s=s.slice(0,a.index)+`<!-- joined:${n} from ${from} by tools/join.mjs: don't edit between these lines -->\n`+(body?body+'\n':'')+s.slice(j);
  }
  const c=s.match(/^(<{7}|={7}|>{7})( |$)/m);if(c)throw new Error(`${file} has a merge conflict outside its joined lists (line ${s.slice(0,c.index).split('\n').length}): resolve it by hand`);
  return s;
}
export const joinedFiles=()=>[...new Set(LISTS.map(l=>l[0]))];
export function stale(){return joinedFiles().filter(f=>{try{return rejoin(f)!==rd(f)}catch(e){return true}})}
export function problems(){
  const bad=[];
  for(const r of roadmap())if(!SECTIONS.includes(r.section))bad.push(`docs/roadmap.d/${r.file}: first line must be "Section: ${SECTIONS.join('|')}"`);
  for(const l of lessons()){if(!/^(\d+|main)-[\w-]+\.md$/.test(l.file))bad.push(`docs/lessons/${l.file}: name it <pr>-<short-name>.md`);if(!/^# /m.test(l.text))bad.push(`docs/lessons/${l.file}: no "# title · date" line`)}
  for(const u of updates()){if(/^\s*(v|version)\s*[:=]?\s*\d+/im.test(u.text))bad.push(`src/updates.d/${u.file}: no version number in a fragment; the release gives it one`);
    if(!/^- /m.test(u.text))bad.push(`src/updates.d/${u.file}: needs the points players will see, as "- " lines`)}
  return bad;
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const a=process.argv[2];
  if(a==='--write'){let failed=0;for(const f of joinedFiles()){try{const s=rejoin(f);if(s!==rd(f)){writeFileSync(join(root,f),s);console.log('joined '+f)}}catch(e){console.error('join: '+e.message);failed++}}process.exit(failed?1:0)}
  else if(a==='--check'){const bad=[...problems(),...stale().map(f=>`${f} is out of date: run node tools/join.mjs --write (npm run build does)`)];for(const b of bad)console.log('FAIL  '+b);if(!bad.length)console.log('join: entries sound, lists up to date');process.exit(bad.length?1:0)}
  else if(a==='lessons')console.log(lessonIndex());
  else{
    const n=newLessons().length,u=updates(),st=stale(),bad=problems();
    console.log(`lessons: ${n} new since the last tidy${n>=TIDY_AT?` (${TIDY_AT} or more: say so in the PR, and the coordinator starts the tidy by hand, coordinator playbook §8)`:` (the tidy runs at ${TIDY_AT})`}`);
    console.log(`What's new fragments waiting for a release: ${u.length}${u.length?' ('+u.map(x=>x.file).join(', ')+')':''}`);
    console.log(st.length?`out of date: ${st.join(', ')} (node tools/join.mjs --write)`:'joined lists: up to date');
    for(const b of bad)console.log('FAIL  '+b);
  }
}
