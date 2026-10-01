// The zoom back in (part 9, src/sim/zoom.ts, src/ui/ZoomCard.tsx, the renderer's trace and dive): at the allotment in
// its first summer the slug outbreak draws the trace to the player's plot and puts a card up with Go down and Send someone
// and the adviser's fee; Go down plays the dive (a tap skips it) into the garden with the deadline strip and Back up; the
// garden's own tools break the outbreak, the strip says so, and Back up returns to the allotment with the plot marked
// Rescued; reduced motion cuts straight in; at 320 px portrait, a phone on its side, a tablet and a desktop the card and
// the one-line strip fit and nothing spills off the page. Screenshots go to build/check/zoom-*.png.
import {join} from 'node:path';

const ready=page=>page.waitForSelector('.map[data-renderer]',{timeout:8000}).then(()=>page.waitForSelector('[data-sim="ready"]',{timeout:8000})).catch(()=>{});
const send=(page,cmd)=>page.evaluate(c=>window.__sim.send(c),cmd);
const shows=(page,sel,on=true,timeout=4000)=>page.waitForFunction(([s,o])=>!!document.querySelector(s)===o,[sel,on],{timeout}).then(()=>true,()=>false);
const spill=page=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);

// the step up's latched garden (tools/checks/stepup.mjs), the plot taken, and the allotment run day by day to the outbreak
async function outbreak(page){
  await page.waitForFunction(()=>window.__sim?.snapshot()?.seed!==undefined&&!!document.querySelector('.card-overlay'),null,{timeout:8000}).catch(()=>{});
  const save=JSON.parse(await page.evaluate(()=>window.__sim.save()));
  save.hours=24*364;save.seen=['card.first-plan','card.skip','garden.slugs','garden.shed','garden.money'];
  const samples=Array.from({length:52},(_,w)=>({output:2*(0.5+(w%4)/4),quality:0,upkeep:0,carbon:0.3,health:{soil:62}}));
  save.graph.nodes.kitchen.levers.goal={history:{level:1,sampleDays:7,cap:52,samples,land:{}},mark:{delivered:0,carbon:0},fed:Array(52).fill(0.6),offered:save.hours};
  for(let i=0;i<5;i++){await send(page,{type:'load',save:JSON.stringify(save)});await send(page,{type:'speed',speed:0});
    await page.waitForTimeout(200);if(await page.evaluate(h=>window.__sim.snapshot().hours===h,save.hours))break}
  // the plot taken, and the allotment played a day at a time until the slugs come, then a day for the trace to unfold
  return page.evaluate(async()=>{
    await window.__sim.send({type:'step-up'});
    for(let d=0;d<200&&!window.__sim.snapshot().zoom;d++)await window.__sim.send({type:'tick',hours:24});
    const s=await window.__sim.send({type:'tick',hours:24});
    return {level:s.level,zoom:!!s.zoom,seen:s.seen.includes('zoom.trace')};
  });
}
// a moment at 1× brings a paused view up to the snapshot (a paused view moves only on a tick of more than four steps)
const settle=async page=>{await send(page,{type:'speed',speed:1});await page.waitForTimeout(600);await send(page,{type:'speed',speed:0});await page.waitForTimeout(300)};

export default async function({ok,open,out,url,browser}){
  {const {ctx,page,errs}=await open({width:1440,height:900});await ready(page);
    const o=await outbreak(page);await settle(page);
    const card=await shows(page,'.zoom-card .zoom-down');
    const v=await page.evaluate(()=>({trace:window.__sim.view().trace,buttons:[...document.querySelectorAll('.zoom-card button')].map(b=>b.textContent),text:document.querySelector('.zoom-card')?.textContent??''}));
    await page.screenshot({path:join(out,'zoom-trace.png')});
    ok('zoom: the outbreak comes in the allotment\'s first summer, draws the trace to the player\'s plot and puts up Go down and Send someone with the fee',
      o.level===2&&o.zoom&&o.seen&&card&&v.trace&&v.buttons.includes('Go down')&&v.buttons.some(b=>/Send .*£\d+/.test(b))&&/days to fix it/.test(v.text),JSON.stringify({o,v}));
    await page.click('.zoom-card .zoom-down');
    const diving=await shows(page,'.map[data-zooming]',true,3000);
    await page.waitForTimeout(1200);await page.screenshot({path:join(out,'zoom-dive.png')});
    const dived=await shows(page,'.map[data-zooming]',false,6000);
    const strip=await shows(page,'.zoom-strip .zoom-up');
    await page.waitForTimeout(300);await page.screenshot({path:join(out,'zoom-garden.png')});
    const g=await page.evaluate(()=>({level:window.__sim.snapshot().level,beds:window.__sim.snapshot().nodes.filter(n=>n.kind==='bed').length,text:document.querySelector('.zoom-strip p')?.textContent??'',card:!!document.querySelector('.zoom-card'),goal:!!document.querySelector('.goal-bar')}));
    ok('zoom: Go down plays the dive into the garden, with the deadline strip, Back up, and no goal bar',diving&&dived&&strip&&g.level===1&&g.beds>=6&&/days left/.test(g.text)&&!g.card&&!g.goal,JSON.stringify(g));
    // the garden's own tools: the torch patrol, and nematodes from the shed once the beds are thriving
    const fixed=await page.evaluate(async()=>{
      await window.__sim.send({type:'policy',node:'gardener',lever:'slugs',value:'pick'});
      await window.__sim.send({type:'tick',hours:24});
      await window.__sim.send({type:'buy',id:'nematodes'});
      for(let h=0;h<24*14&&!window.__sim.snapshot().zoom.rescued;h+=6)await window.__sim.send({type:'tick',hours:6});
      return !!window.__sim.snapshot().zoom.rescued;
    });
    await settle(page);
    const done=await page.waitForFunction(()=>/Rescued/.test(document.querySelector('.zoom-strip p')?.textContent??''),null,{timeout:4000}).then(()=>true,()=>false);
    await page.screenshot({path:join(out,'zoom-rescued.png')});
    ok('zoom: the garden\'s tools break the outbreak before the deadline, and the strip says so',fixed&&done);
    await page.click('.zoom-strip .zoom-up');
    const up=await page.waitForFunction(()=>window.__sim.snapshot().level===2,null,{timeout:4000}).then(()=>true,()=>false);
    await shows(page,'.map[data-zooming]',false,6000);
    const mark=await shows(page,'.rescued-mark');
    await page.screenshot({path:join(out,'zoom-back-up.png')});
    const s=await page.evaluate(()=>({rescued:window.__sim.snapshot().nodes.find(n=>n.id==='plot-1').levers.rescued,strip:!!document.querySelector('.zoom-strip'),card:!!document.querySelector('.zoom-card'),trace:window.__sim.view().trace}));
    ok('zoom: Back up returns to the allotment, the plot marked Rescued, the card and the trace gone',up&&mark&&!!s.rescued&&!s.strip&&!s.card&&!s.trace,JSON.stringify(s));
    ok('zoom: no errors on the page',!errs.length,errs.slice(0,2).join('; '));
    await ctx.close()}
  // reduced motion: straight in and out; and the sizes
  for(const [name,vp,touch] of [['phone',{width:320,height:640},true],['landscape',{width:740,height:360},true],['tablet',{width:820,height:1180},true],['desktop',{width:1440,height:900},false]]){
    const b=await browser,ctx=await b.newContext({viewport:vp,deviceScaleFactor:touch?2:1,hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});
    await ctx.addInitScript(()=>{window.__seed=1});
    const page=await ctx.newPage(),errs=[];page.on('pageerror',e=>errs.push(e.message));
    await page.goto(url);await ready(page);await outbreak(page);await settle(page);
    await shows(page,'.zoom-card .zoom-down');await page.screenshot({path:join(out,`zoom-card-${name}.png`)});
    const cardFits=await page.evaluate(()=>{const c=document.querySelector('.zoom-card')?.getBoundingClientRect(),m=document.querySelector('.map')?.getBoundingClientRect();return !!c&&!!m&&c.left>=m.left-1&&c.right<=m.right+1&&c.top>=m.top-1&&c.bottom<=m.bottom+1});
    const cardSpill=await spill(page);
    if(touch)await page.tap('.zoom-card .zoom-down');else await page.click('.zoom-card .zoom-down');
    const cut=await page.waitForFunction(()=>window.__sim.snapshot().level===1,null,{timeout:4000}).then(()=>true,()=>false);
    await shows(page,'.zoom-strip');await page.waitForTimeout(300);
    const st=await page.evaluate(()=>{const p=document.querySelector('.zoom-strip p'),r=document.querySelector('.zoom-strip')?.getBoundingClientRect();
      return {zooming:!!document.querySelector('.map[data-zooming]'),lines:p?Math.round(p.getBoundingClientRect().height/parseFloat(getComputedStyle(p).lineHeight||'20')):0,h:r?.height??0,w:r?.width??0}});
    await page.screenshot({path:join(out,`zoom-${name}.png`)});
    ok(`zoom: at ${vp.width} × ${vp.height}, the card fits the map, reduced motion cuts straight in, the strip is one line, and nothing spills off the page`,
      cardFits&&cut&&!st.zooming&&st.lines<=1&&st.h<=64&&!cardSpill&&!await spill(page)&&!errs.length,JSON.stringify(st)+(errs[0]||''));
    await ctx.close()}
}
