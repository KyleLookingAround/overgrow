// Checks a session's brief against docs/briefs/TEMPLATE.md (plain Node, no dependencies).
//   node tools/brief.mjs <file> [more files]    fails, naming the file and section, if a brief isn't ready to start from
// A brief needs every section below, each with something in it, and no "<fill: …>" left (the template itself may keep them).
// Some sections need a particular thing: a tools/graph.mjs query to read first, a commit author's address, the needs-owner
// queue in when to stop, an estimate in dollars in the cost budget, and "How it fits and grows" naming the systems web
// (docs/decisions/ADR-2026-09-29-born-small-grows-up.md), except in the briefs started before that section, named in BEFORE.
import {readFileSync} from 'node:fs';
import {basename} from 'node:path';
import {fileURLToPath} from 'node:url';

export const SECTIONS=[
  ['Goal and what it may touch',/\btouch\b/i,'say which files and hooks it may touch'],
  ['Read first',/tools\/graph\.mjs \S/,'give a `node tools/graph.mjs <name>` query'],
  ['How it fits and grows',/systems-web\.md/,'name its rows in the systems web (`docs/specs/overgrow/systems-web.md`)'],
  ['Speed budget',null],
  ['Commit author',/<[^<>@\s]+@[^<>@\s]+>/,'give the author as Name <email>'],
  ['Who merges and when',null],
  ["What's left for others",null],
  ['When to stop and ask',/needs-owner/,'name the `needs-owner` issue queue'],
  ['Cost budget',/\$\s?\d/,'give an estimate in dollars'],
];

// the briefs started before "How it fits and grows" (merged or in flight when it came in), which may leave it out;
// never reuse one of these names for a new brief, or it skips the section; after a merge from main, run the brief check
// again, since a brief that merged in the meantime may need its name here
export const BEFORE=new Set(['bot-and-baselines','coordinator-first-slice','coordinator-first-slice-2','crops-and-gardener','final-call-wins','graph-and-clock','household-model',
  'labour-machinery-energy','livestock-model','overgrow-setup','pests-wildlife-explain','sealing-maths','storage-and-market','systems-web','weather-soil-water']);

// problems with one brief's text, as a list of lines; the template may keep its <fill: …> placeholders, and a brief
// named in BEFORE (by its file name without .md) may leave out "How it fits and grows"
export function checkBrief(text,template=false,name=''){
  const bad=[],fills=text.match(/<fill:[^>]*>/g)||[];
  if(template)text=text.replace(/<fill:[^>]*>/g,'1');
  else if(fills.length)bad.push(`${fills.length} left to fill in, first ${fills[0]}`);
  if(!/^# \S/m.test(text))bad.push('no title line (# Brief: …)');
  const parts=text.split(/^## +/m).slice(1).map(p=>{const i=p.indexOf('\n');return [p.slice(0,i<0?p.length:i).trim(),i<0?'':p.slice(i+1).trim()]});
  for(const [sec,need,what] of SECTIONS){
    const hit=parts.find(([h])=>h.toLowerCase().replace(/’/g,"'")===sec.toLowerCase());
    if(!hit){if(!(sec==='How it fits and grows'&&BEFORE.has(name)))bad.push(`missing section "## ${sec}"`);continue}
    if(!hit[1])bad.push(`"${sec}" is empty`);
    else if(need&&!need.test(hit[1]))bad.push(`"${sec}" must ${what}`);
  }
  return bad;
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const files=process.argv.slice(2);
  if(!files.length){console.log('node tools/brief.mjs <file> [more files]   checks each brief against docs/briefs/TEMPLATE.md');process.exit(2)}
  let failed=0;
  for(const f of files){let text;try{text=readFileSync(f,'utf8')}catch(e){console.log(`FAIL  ${f}: can't read it`);failed++;continue}
    const bad=checkBrief(text,basename(f)==='TEMPLATE.md',basename(f,'.md'));
    if(bad.length){failed++;for(const b of bad)console.log(`FAIL  ${f}: ${b}`)}else console.log(`PASS  ${f}`)}
  process.exit(failed?1:0);
}
