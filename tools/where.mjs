// Finds the source line behind a line number in an error from dist/index.html or build/test.html.
//   node tools/where.mjs 2345        ->  src/game/15-panel.js:112
// Both pages have the same line numbers; build/test.html only adds text on the /*SIM_HOOK*/ line.
import {shell,parts,locatePage} from './sources.mjs';
const lines=process.argv.slice(2).map(Number).filter(n=>n>0);
if(!lines.length){console.error('usage: node tools/where.mjs <line> [<line>...]');process.exit(1)}
const sh=shell(),ps=parts();
for(const n of lines){const w=locatePage(sh,ps,n);console.log(`${n}  ->  ${w.file}:${w.line}`)}
