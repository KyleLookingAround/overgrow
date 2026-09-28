// The build and the page it makes (tools/build.mjs): dist/index.html and build/test.html exist and are one self-contained
// page each, Math.random() without // cosmetic is caught, and the page opens without errors, says "Overgrow", and has no
// sideways overflow from a 320 px phone to a 2560 px screen, portrait and landscape.
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';

export default async function({ok,open,root,out}){
  const dist=join(root,'dist/index.html');
  ok('build: dist/index.html and build/test.html are built',existsSync(dist)&&existsSync(join(root,'build/test.html')));
  const html=existsSync(dist)?readFileSync(dist,'utf8'):'';
  // one page, no runtime dependencies: nothing loaded from elsewhere but fonts
  const ext=[...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="(https?:)?\/\/([^"/]+)/gi)].map(m=>m[2]).filter(h=>!/fonts\.(googleapis|gstatic)\.com$/.test(h));
  ok('build: the page loads nothing from elsewhere but fonts',!ext.length,ext.join(', '));
  ok('build: the published page has no window.__sim',html&&!html.includes('window.__sim'));
  const {randomSlips}=await import('../sources.mjs');
  const slips=randomSlips([{file:'src/game/10-x.js',text:'const a=Math.random();\nconst b=Math.random(); // cosmetic\n'},{file:'src/game/00-random.js',text:'Math.random();\n'}]);
  ok('build: Math.random() is caught unless the line ends with // cosmetic',slips.length===1&&slips[0]==='src/game/10-x.js:1',slips.join(', '));
  const {parts}=await import('../sources.mjs'),real=randomSlips(parts());
  ok('build: no game file uses Math.random() for play',!real.length,real.join(', '));

  const sizes=[[320,568,true],[568,320,true],[390,844,true],[844,390,true],[768,1024,true],[1440,900,false],[2560,1440,false]];
  for(const [w,h,touch] of sizes){
    const {ctx,page,errs}=await open({width:w,height:h},{touch});
    const r=await page.evaluate(()=>({title:document.title,text:document.body.innerText,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
    const good=!errs.length&&/Overgrow/.test(r.title)&&/Overgrow/.test(r.text)&&r.sw<=r.cw;
    if(!good||w===390||w===1440)await page.screenshot({path:join(out,`build-${w}x${h}.png`)});
    ok(`build: the page opens at ${w}×${h}, says Overgrow, no errors, no sideways overflow`,good,errs[0]||(r.sw>r.cw?`scroll width ${r.sw} > ${r.cw}`:''));
    await ctx.close();
  }
}
