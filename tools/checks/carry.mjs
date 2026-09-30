// The carry-over rule at the step up (docs/systems/ladder.md, "Inflating and the `carry` check"): the sensible bot plays
// seeds 1 to 3 into the allotment (tools/carry.ts), and each sealed garden's Output matches its last full year within
// 1 %, its land and carbon carry into the plot exactly, and a first cycle rebuilt from the sealed node is inside
// INFLATE_TOLERANCE of the totals it was sealed with (Reliability, a spread measured over one cycle, inside its own 15 %).
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';

export default async function({ok,root}){
  const out=execFileSync(process.execPath,[join(root,'node_modules/vite-node/vite-node.mjs'),join(root,'tools/carry.ts'),'1','2','3'],{cwd:root,encoding:'utf8',maxBuffer:1<<24});
  const runs=out.split('\n').filter(l=>l.startsWith('{')).map(l=>JSON.parse(l));
  ok('carry: the bot steps up on seeds 1 to 3 with no errors',runs.length===3&&runs.every(r=>r.stepUp!==null&&r.err===0&&r.report),runs.map(r=>`seed ${r.seed}: day ${r.stepUp}`).join(', '));
  for(const r of runs){const c=r.report;if(!c)continue;
    ok(`carry: seed ${r.seed}'s plot's Output matches the garden's last full year within 1 %`,c.output.off<=0.01,`${c.output.sealed.toFixed(3)} against ${c.output.year.toFixed(3)} kg a day`);
    ok(`carry: seed ${r.seed}'s land and carbon carry into the plot exactly`,c.land&&c.carbon);
    ok(`carry: seed ${r.seed}'s rebuilt first cycle is inside the tolerance`,c.rebuilt.ok&&c.reliability.ok,
      c.rebuilt.off.map(o=>`${o.key} ${o.rebuilt.toFixed(2)} for ${o.sealed.toFixed(2)}`).join(', ')||`Reliability ${c.reliability.rebuilt.toFixed(1)} for ${c.reliability.sealed.toFixed(1)}`);
  }
}
