// Builds the page (vite build → dist/), then the map sessions query (docs/graph.json, tools/graph.mjs) and the lists
// joined from one file per entry (tools/join.mjs). `npm run build` runs this; the Pages workflow publishes dist/.
// The rules every file keeps (no Math.random() in the sim, the sim never touching the DOM, every model naming its
// sources) are checked by tools/rules.mjs, which the `rules` check group runs; this only refuses to build on them.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {root} from './rules.mjs';

const fail=m=>{console.error('build: '+m);process.exit(1)};
const {problems}=await import('./rules.mjs');
const bad=problems();
if(bad.length)fail(bad.join('\nbuild: '));
try{execFileSync('npx',['vite','build','--logLevel','warn'],{cwd:root,stdio:'inherit'})}catch(e){fail('vite build failed')}
{const {build:graph}=await import('./graph.mjs');writeFileSync(join(root,'docs/graph.json'),JSON.stringify(graph(),null,1))}
{const {joinedFiles,rejoin}=await import('./join.mjs');for(const f of joinedFiles()){let s;try{s=rejoin(f)}catch(e){fail(e.message)}if(s!==readFileSync(join(root,f),'utf8'))writeFileSync(join(root,f),s)}}
const page=readFileSync(join(root,'dist/index.html'),'utf8');
console.log(`built dist/ (index.html ${page.length} bytes), docs/graph.json and the joined lists`);
