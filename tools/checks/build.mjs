// The built page (dist/, from vite build): it exists, loads nothing from elsewhere but fonts, opens without errors,
// says "Overgrow", gets an answer from the simulation worker, and has no sideways overflow or page scroll from a
// 320 px phone, portrait and landscape, to a 2560 px screen; and the game saves on the device and carries on from its
// save when the page is opened again.
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';

export default async function({ok,open,root,out,SAVE_KEY}){
  const index=join(root,'dist/index.html');
  ok('build: dist/index.html is built',existsSync(index));
  const html=existsSync(index)?readFileSync(index,'utf8'):'';
  // a static site with no runtime services: nothing loaded from elsewhere but fonts
  const ext=[...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="(https?:)?\/\/([^"/]+)/gi)].map(m=>m[2]).filter(h=>!/fonts\.(googleapis|gstatic)\.com$/.test(h));
  ok('build: the page loads nothing from elsewhere but fonts',!ext.length,ext.join(', '));
  ok('build: every asset is referenced relatively, so the page works under a sub-path',!/(src|href)="\//.test(html));

  const sizes=[[320,568,true],[568,320,true],[390,844,true],[844,390,true],[768,1024,true],[1440,900,false],[2560,1440,false]];
  for(const [w,h,touch] of sizes){
    const {ctx,page,errs}=await open({width:w,height:h},{touch});
    await page.waitForSelector('[data-sim="ready"]',{timeout:5000}).catch(()=>{});
    const r=await page.evaluate(()=>({title:document.title,text:document.body.innerText,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,
      sh:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight,sim:document.querySelector('[data-sim]')?.getAttribute('data-sim'),
      panel:(()=>{const b=document.querySelector('.panel')?.getBoundingClientRect();return b?{top:b.top,bottom:b.bottom,right:b.right,h:b.height}:null})(),vh:innerHeight,vw:innerWidth}));
    // the panel is really in view: inside the viewport, with room for its text
    const inView=r.panel&&r.panel.top>=0&&r.panel.bottom<=r.vh+1&&r.panel.right<=r.vw+1&&r.panel.h>=60;
    const good=!errs.length&&/Overgrow/.test(r.title)&&/Overgrow/.test(r.text)&&r.sw<=r.cw&&r.sh<=r.ch&&r.sim==='ready'&&inView;
    if(!good||w===390||w===1440)await page.screenshot({path:join(out,`build-${w}x${h}.png`)});
    ok(`build: at ${w}×${h} the page opens, says Overgrow, the worker answers, the panel is in view, no errors, no overflow`,good,errs[0]||(r.sw>r.cw?`scroll width ${r.sw} > ${r.cw}`:r.sh>r.ch?`scroll height ${r.sh} > ${r.ch}`:r.sim!=='ready'?`sim ${r.sim}`:!inView?`panel at ${JSON.stringify(r.panel)} in ${r.vw}×${r.vh}`:''));
    await ctx.close();
  }

  // the save: a game day passes, the page saves, and opened again it carries on from there with the same seed
  {const {ctx,page,errs}=await open({width:1440,height:900},{seed:3});
    await page.waitForSelector('[data-sim="ready"]',{timeout:5000}).catch(()=>{});
    await page.evaluate(()=>window.__sim.send({type:'tick',hours:30}));await page.waitForTimeout(500);
    const saved=await page.evaluate(k=>{try{return JSON.parse(localStorage.getItem(k))}catch{return null}},SAVE_KEY);
    await page.reload();await page.waitForSelector('[data-sim="ready"]',{timeout:5000}).catch(()=>{});await page.waitForTimeout(300);
    const s=await page.evaluate(()=>window.__sim.snapshot());
    const good=saved&&saved.version>=1&&saved.hours>=30&&s&&s.seed===3&&s.hours>=saved.hours&&!errs.length;
    ok('build: the game saves each game day and carries on from its save when opened again',good,`saved ${saved&&saved.hours} h, reopened at ${s&&s.hours} h, seed ${s&&s.seed} ${errs[0]||''}`);
    await ctx.close()}
}
