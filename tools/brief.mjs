// Checks a session's brief against docs/briefs/TEMPLATE.md (plain Node, no dependencies).
//   node tools/brief.mjs <file> [more files]    fails, naming the file and section, if a brief isn't ready to start from
// A brief needs every section below, each with something in it, and no "<fill: …>" left (the template itself may keep them).
// Some sections need a particular thing: a tools/graph.mjs query to read first, a commit author's address, the needs-owner
// queue in when to stop, and an estimate in dollars in the cost budget.
import {readFileSync} from 'node:fs';
import {basename} from 'node:path';
import {fileURLToPath} from 'node:url';

export const SECTIONS=[
  ['Goal and what it may touch',/\btouch\b/i,'say which files and hooks it may touch'],
  ['Read first',/tools\/graph\.mjs \S/,'give a `node tools/graph.mjs <name>` query'],
  ['Speed budget',null],
  ['Commit author',/<[^<>@\s]+@[^<>@\s]+>/,'give the author as Name <email>'],
  ['Who merges and when',null],
  ["What's left for others",null],
  ['When to stop and ask',/needs-owner/,'name the `needs-owner` issue queue'],
  ['Cost budget',/\$\s?\d/,'give an estimate in dollars'],
];

// problems with one brief's text, as a list of lines; the template may keep its <fill: …> placeholders
export function checkBrief(text,template=false){
  const bad=[],fills=text.match(/<fill:[^>]*>/g)||[];
  if(template)text=text.replace(/<fill:[^>]*>/g,'1');
  else if(fills.length)bad.push(`${fills.length} left to fill in, first ${fills[0]}`);
  if(!/^# \S/m.test(text))bad.push('no title line (# Brief: …)');
  const parts=text.split(/^## +/m).slice(1).map(p=>{const i=p.indexOf('\n');return [p.slice(0,i<0?p.length:i).trim(),i<0?'':p.slice(i+1).trim()]});
  for(const [name,need,what] of SECTIONS){
    const hit=parts.find(([h])=>h.toLowerCase().replace(/’/g,"'")===name.toLowerCase());
    if(!hit){bad.push(`missing section "## ${name}"`);continue}
    if(!hit[1])bad.push(`"${name}" is empty`);
    else if(need&&!need.test(hit[1]))bad.push(`"${name}" must ${what}`);
  }
  return bad;
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const files=process.argv.slice(2);
  if(!files.length){console.log('node tools/brief.mjs <file> [more files]   checks each brief against docs/briefs/TEMPLATE.md');process.exit(2)}
  let failed=0;
  for(const f of files){let text;try{text=readFileSync(f,'utf8')}catch(e){console.log(`FAIL  ${f}: can't read it`);failed++;continue}
    const bad=checkBrief(text,basename(f)==='TEMPLATE.md');
    if(bad.length){failed++;for(const b of bad)console.log(`FAIL  ${f}: ${b}`)}else console.log(`PASS  ${f}`)}
  process.exit(failed?1:0);
}
