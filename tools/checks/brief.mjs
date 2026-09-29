// docs/briefs/TEMPLATE.md and every session brief in docs/briefs/ have all their sections, filled in
// (tools/brief.mjs), and a brief without "How it fits and grows" fails unless it's one started before that section.
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

export default async function({ok,root}){
  // every brief a session was started from, and the template, has all its sections (tools/brief.mjs)
  const {checkBrief}=await import('../brief.mjs'),dir=join(root,'docs/briefs'),fs=readdirSync(dir).filter(f=>f.endsWith('.md')).sort();
  const bad=fs.flatMap(f=>checkBrief(readFileSync(join(dir,f),'utf8'),f==='TEMPLATE.md',f.slice(0,-3)).map(b=>f+': '+b));
  ok('brief: the template and every brief in docs/briefs/ have all their sections',fs.includes('TEMPLATE.md')&&!bad.length,bad[0]||`${fs.length} files`);
  // "How it fits and grows" (docs/decisions/ADR-2026-09-29-born-small-grows-up.md): the template, filled in, passes;
  // without the section, or without the web named in it, it fails, except under a name started before the section
  const {BEFORE}=await import('../brief.mjs'),tpl=readFileSync(join(dir,'TEMPLATE.md'),'utf8').replace(/<fill:[^>]*>/g,'1');
  const cut=tpl.replace(/^## How it fits and grows\n[\s\S]*?(?=^## )/m,''),unnamed=tpl.replace(/systems-web\.md/g,'the web');
  const miss=b=>b.some(x=>x.includes('"## How it fits and grows"')),need=b=>b.some(x=>x.includes('"How it fits and grows" must'));
  const cases=[!checkBrief(tpl,false,'new-part').length,cut!==tpl&&miss(checkBrief(cut,false,'new-part')),need(checkBrief(unnamed,false,'new-part')),
    !checkBrief(cut,false,'sealing-maths').length&&BEFORE.has('sealing-maths')];
  ok('brief: "How it fits and grows" is required, naming the systems web, in every brief not started before it',cases.every(Boolean),`cases ${cases.map(c=>c?'ok':'FAIL').join(' ')}`);
}
