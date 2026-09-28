// docs/briefs/TEMPLATE.md and every session brief in docs/briefs/ have all their sections, filled in
// (tools/brief.mjs).
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';

export default async function({ok,root}){
  // every brief a session was started from, and the template, has all its sections (tools/brief.mjs)
  const {checkBrief}=await import('../brief.mjs'),dir=join(root,'docs/briefs'),fs=readdirSync(dir).filter(f=>f.endsWith('.md')).sort();
  const bad=fs.flatMap(f=>checkBrief(readFileSync(join(dir,f),'utf8'),f==='TEMPLATE.md').map(b=>f+': '+b));
  ok('brief: the template and every brief in docs/briefs/ have all their sections',fs.includes('TEMPLATE.md')&&!bad.length,bad[0]||`${fs.length} files`);
}
