// The allotment's first season (part 8, src/ui/SeasonPanel.tsx, src/ui/map/season.ts, src/sim/season.ts): from a step
// up, the neighbours show as a column of names with a face each; after a fortnight the second plot is offered and taken
// from the panel, the helper's offer accepted and their watching set to an audit from it, and the panel shows the
// helper's report, never the truth it leaves out; the first dry spell brings the trough's section and the motion as a
// card with For, Against and Abstain, and a vote from the card shows the room's hands; the swap shed unfolds with the
// first surplus and is turned on from the panel; and at 320 px portrait, a phone on its side, a tablet and a desktop the
// season's sections show with nothing spilling off the page. Screenshots go to build/check/season-*.png.
import {join} from 'node:path';

const ready=page=>page.waitForSelector('.map[data-renderer]',{timeout:8000}).then(()=>page.waitForSelector('[data-sim="ready"]',{timeout:8000})).catch(()=>{});
const send=(page,cmd)=>page.evaluate(c=>window.__sim.send(c),cmd);
const shows=(page,sel,on=true,timeout=4000)=>page.waitForFunction(([s,o])=>!!document.querySelector(s)===o,[sel,on],{timeout}).then(()=>true,()=>false);
const spill=page=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
// ticks a day at a time until a condition on the snapshot holds, or a day limit; returns the days it took, or null
const until=(page,cond,days)=>page.evaluate(async([c,d])=>{const f=new Function('s',`return (${c})`);let s=window.__sim.snapshot();
  for(let i=0;i<d;i++){if(f(s))return i;s=await window.__sim.send({type:'tick',hours:24})}return f(s)?d:null},[cond,days]);

// a garden a year in with its offer latched, then the plot taken (as the stepup group does)
async function allotment(page){
  await page.waitForFunction(()=>window.__sim?.snapshot()?.seed!==undefined&&!!document.querySelector('.card-overlay'),null,{timeout:8000}).catch(()=>{});
  const save=JSON.parse(await page.evaluate(()=>window.__sim.save()));
  save.hours=24*364;save.seen=['card.first-plan','card.try-faster'];
  const samples=Array.from({length:52},(_,w)=>({output:2*(0.5+(w%4)/4),quality:0,upkeep:0,carbon:0.3,health:{soil:62}}));
  save.graph.nodes.kitchen.levers.goal={history:{level:1,sampleDays:7,cap:52,samples,land:{}},mark:{delivered:0,carbon:0},fed:Array(52).fill(0.6),offered:save.hours};
  for(let i=0;i<5;i++){await send(page,{type:'load',save:JSON.stringify(save)});await send(page,{type:'speed',speed:0});
    await page.waitForTimeout(200);if(await page.evaluate(h=>window.__sim.snapshot().hours===h,save.hours))break}
  await send(page,{type:'card',id:'year',answer:'ok'});
  await send(page,{type:'step-up'});
  await page.waitForFunction(()=>window.__sim.snapshot().level===2&&!document.querySelector('.map[data-zooming]'),null,{timeout:8000}).catch(()=>{});
}
const tab=(page,id)=>page.evaluate(i=>document.querySelector(`#tab-${i}`)?.click(),id);

export default async function({ok,open,out}){
  let save=null;
  {const {ctx,page,errs}=await open({width:1440,height:900});await ready(page);await allotment(page);
    await until(page,'s.seen.includes("allotment.neighbours")',3);
    await tab(page,'allotment');
    const people=await shows(page,'.neighbour-list')&&await page.evaluate(()=>({n:document.querySelectorAll('.neighbour').length,faces:document.querySelectorAll('.neighbour-face[aria-label]').length}));
    ok('season: the neighbours show as a column of names with a face each',people&&people.n===11&&people.faces===11,JSON.stringify(people));
    await tab(page,'plot');
    const offered=await until(page,'s.seen.includes("agency.helper")',20);
    const card=await shows(page,'.second-plot[data-state="offered"]');
    ok('season: the second plot is offered after a fortnight, hidden until then',offered!==null&&offered>=10&&card,`day ${offered}`);
    await page.click('.second-plot .card-actions .primary');
    const offer=await shows(page,'.second-plot .offer');
    await page.click('.second-plot .offer .primary');
    const helped=await shows(page,'.second-plot[data-state="helped"] #watching');
    await page.selectOption('#watching','audit');
    const audit=await page.waitForFunction(()=>window.__sim.snapshot().nodes.some(n=>n.levers.helping?.watching==='audit'),null,{timeout:4000}).then(()=>true,()=>false);
    ok('season: the plot is taken, the helper’s offer accepted and an audit set, all from the panel',offer&&helped&&audit);
    await until(page,'s.nodes.some(n=>(n.levers.takings?.weeks??0)>=2)',21);
    const report=await page.evaluate(()=>{const s=window.__sim.snapshot(),h=s.nodes.find(n=>n.levers.helping),t=h.levers.takings,sp=s.nodes.find(n=>n.levers.second)?.levers.second;
      return {text:document.querySelector('.second-plot .report')?.textContent??'',reported:sp.reported,hidden:t.hidden}});
    ok('season: the panel shows the helper’s report, never what it leaves out',/says they took/.test(report.text)&&!/hidden/i.test(report.text),JSON.stringify(report));
    // the first dry spell: the trough, and the motion as a card
    const dry=await until(page,'s.seen.includes("committee.panel")',200);
    await page.waitForTimeout(300);
    const motion=await page.evaluate(()=>({trough:!!document.querySelector('.trough'),buttons:[...document.querySelectorAll('.motion .card-actions button')].map(b=>b.textContent)}));
    await page.evaluate(()=>document.querySelector('.motion')?.scrollIntoView());
    await page.screenshot({path:join(out,'season-motion.png')});
    ok('season: the first dry spell brings the trough and the motion as a card with its buttons',dry!==null&&motion.trough&&motion.buttons.join()==='For,Against,Abstain',`day ${dry}: ${JSON.stringify(motion)}`);
    await page.click('.motion .card-actions .primary');
    const hands=await shows(page,'.motion[data-held="yes"] .hands');
    ok('season: a vote from the card shows the room’s hands',hands&&await page.evaluate(()=>!!window.__sim.snapshot().nodes.find(n=>n.id==='committee').levers.motion.tally));
    const shed=await until(page,'s.seen.includes("allotment.shed")',200);
    const box=await shows(page,'.swap-shed input[type=checkbox]');
    if(box)await page.click('.swap-shed input[type=checkbox]');
    const on=await page.waitForFunction(()=>window.__sim.snapshot().nodes.find(n=>n.id==='household').levers.swap==='on',null,{timeout:4000}).then(()=>true,()=>false);
    ok('season: the swap shed unfolds with the first surplus and is turned on from the panel',shed!==null&&box&&on,`day ${shed}`);
    await page.screenshot({path:join(out,'season-desktop-play.png')});
    ok('season: no errors on the page',!errs.length,errs.slice(0,2).join('; '));
    save=await page.evaluate(()=>window.__sim.save());
    await ctx.close()}
  for(const [name,vp,touch] of [['phone',{width:320,height:568},true],['phone-side',{width:568,height:320},true],['phone-tall',{width:390,height:844},true],['landscape',{width:844,height:390},true],['tablet',{width:768,height:1024},true],['desktop',{width:1440,height:900},false]]){
    const {ctx,page,errs}=await open(vp,{save,touch});await ready(page);
    await page.waitForFunction(()=>window.__sim?.snapshot()?.level===2,null,{timeout:8000}).catch(()=>{});
    await page.evaluate(()=>{const b=document.querySelector('.sheet-toggle[aria-expanded="false"]');if(b)b.click()});
    await page.waitForTimeout(400);
    const plot=await page.evaluate(()=>['.second-plot','.trough','.motion','.swap-shed'].filter(s=>document.querySelector(s)));
    await page.screenshot({path:join(out,`season-${name}.png`),fullPage:true});
    await tab(page,'allotment');await page.waitForTimeout(200);
    const faces=await page.evaluate(()=>document.querySelectorAll('.neighbour-face').length);
    await page.evaluate(()=>document.querySelector('.neighbours')?.scrollIntoView());
    await page.screenshot({path:join(out,`season-${name}-neighbours.png`)});
    ok(`season: at ${vp.width} × ${vp.height} the season’s sections and the neighbours’ faces show, and nothing spills off the page`,plot.length===4&&faces===11&&!await spill(page)&&!errs.length,`${plot.join(' ')}; ${faces} faces${errs[0]?'; '+errs[0]:''}`);
    await ctx.close()}
}
