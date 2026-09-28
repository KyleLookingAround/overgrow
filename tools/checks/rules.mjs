// The rules every source file keeps (tools/rules.mjs): Math.random() only in the seeded generator or on a `// cosmetic`
// line, the sim and its data never importing the UI or naming the DOM, and every model in src/sim/models/ naming its
// sources and what it simplifies. Each rule is also proved to catch a slip, on a small fixture.
import {mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

export default async function({ok,root}){
  const {randomSlips,layerSlips,sourceSlips,walk}=await import('../rules.mjs');
  ok('rules: no source file draws from Math.random() outside the seeded generator',!randomSlips().length,randomSlips()[0]||'');
  ok('rules: the sim and its data import nothing from the UI and never name the DOM',!layerSlips().length,layerSlips()[0]||'');
  ok('rules: every model names its sources and what it simplifies',!sourceSlips().length,sourceSlips()[0]||`${walk('src/sim/models').length} models`);
  // each rule catches a slip: a throwaway folder that the walk sees like any other
  const dir='src/sim/models/zz-check-fixture';mkdirSync(join(root,dir),{recursive:true});
  try{
    writeFileSync(join(root,dir,'slip.ts'),"import {x} from '../../ui/App';\nconst a=Math.random();\nconst b=Math.random(); // cosmetic\nconst w=window.innerWidth;\n");
    const r=randomSlips([dir+'/slip.ts']),l=layerSlips([dir+'/slip.ts']),s=sourceSlips([dir+'/slip.ts']);
    ok('rules: the randomness rule catches a slip and allows a cosmetic line',r.length===1&&r[0].startsWith(dir+'/slip.ts:2'),r.join('; '));
    ok('rules: the layers rule catches a UI import and a DOM name',l.length===2,l.join('; '));
    ok('rules: the sources rule catches a model with no sources',s.length===2,s.join('; '));
  }finally{rmSync(join(root,dir),{recursive:true,force:true})}
}
