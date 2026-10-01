// The step up (part 7, src/ui/StepUpCard.tsx, src/ui/AllotmentPanel.tsx, src/ui/map/allotment.ts): with the garden's
// offer latched, the step-up card lists what the allotment opens with "Take the plot" and "Stay in the garden a while";
// staying keeps the offer as a bar with the same button; taking it plays the zoom-out (a tap skips it) and lands on the
// allotment's twelve plots with their labels, the top bar saying "Allotment" and the panel's two tabs, the plan's care
// lever set from the panel; reduced motion cuts straight there; at 320 px portrait, a phone on its side, a tablet and a
// desktop nothing spills off the page. Screenshots go to build/check/stepup-*.png.
import {join} from 'node:path';

const ready=page=>page.waitForSelector('.map[data-renderer]',{timeout:8000}).then(()=>page.waitForSelector('[data-sim="ready"]',{timeout:8000})).catch(()=>{});
const send=(page,cmd)=>page.evaluate(c=>window.__sim.send(c),cmd);
const shows=(page,sel,on=true,timeout=4000)=>page.waitForFunction(([s,o])=>!!document.querySelector(s)===o,[sel,on],{timeout}).then(()=>true,()=>false);

// a garden a year in with its offer latched: a year of weekly samples, the veg met at 60 % every week
async function latched(page){
  // the page's first morning is up (its first plan's card) before the save goes in, so its start can't land after it
  await page.waitForFunction(()=>window.__sim?.snapshot()?.seed!==undefined&&!!document.querySelector('.card-overlay'),null,{timeout:8000}).catch(()=>{});
  const save=JSON.parse(await page.evaluate(()=>window.__sim.save()));
  save.hours=24*364;save.seen=['card.first-plan','card.skip'];
  const samples=Array.from({length:52},(_,w)=>({output:2*(0.5+(w%4)/4),quality:0,upkeep:0,carbon:0.3,health:{soil:62}}));
  save.graph.nodes.kitchen.levers.goal={history:{level:1,sampleDays:7,cap:52,samples,land:{}},mark:{delivered:0,carbon:0},fed:Array(52).fill(0.6),offered:save.hours};
  // the page's own start (a new game) may land after a load sent too early: load until it holds
  for(let i=0;i<5;i++){await send(page,{type:'load',save:JSON.stringify(save)});await send(page,{type:'speed',speed:0});
    await page.waitForTimeout(200);if(await page.evaluate(h=>window.__sim.snapshot().hours===h,save.hours))break}
}
const spill=page=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);

export default async function({ok,open,out,url,browser}){
  {const {ctx,page,errs}=await open({width:1440,height:900});await ready(page);await latched(page);
    const card=await shows(page,'.step-up-card');
    const opens=await page.evaluate(()=>document.querySelectorAll('.step-up-opens li').length);
    const buttons=await page.evaluate(()=>[...document.querySelectorAll('.card-overlay .card-actions button')].map(b=>b.textContent));
    await page.screenshot({path:join(out,'stepup-card.png')});
    ok('stepup: the latched offer shows the step-up card, listing what the allotment opens, with take and stay',card&&opens>=3&&buttons.includes('Take the plot')&&buttons.includes('Stay in the garden a while'),`${opens} lines; ${buttons.join(', ')}`);
    await page.evaluate(()=>[...document.querySelectorAll('.card-overlay button')].find(b=>b.textContent==='Stay in the garden a while').click());
    const bar=await shows(page,'.stay-bar .step-up-take');
    ok('stepup: staying keeps the offer as a bar with the same button, still in the garden',bar&&await page.evaluate(()=>window.__sim.snapshot().level)===1);
    await page.click('.stay-bar .step-up-take');
    const zooming=await shows(page,'.map[data-zooming]',true,3000);
    await page.waitForTimeout(1200);await page.screenshot({path:join(out,'stepup-zoom.png')});
    const done=await shows(page,'.map[data-zooming]',false,6000);
    await page.waitForTimeout(300);await page.screenshot({path:join(out,'stepup-allotment.png')});
    const s=await page.evaluate(()=>({level:window.__sim.snapshot().level,plots:window.__sim.snapshot().nodes.filter(n=>n.kind==='plot').length,
      labels:document.querySelectorAll('.plot-label').length,mine:!!document.querySelector('.plot-label.mine'),top:document.querySelector('.topbar .level')?.textContent,
      tabs:[...document.querySelectorAll('.panel .tab')].map(b=>b.textContent)}));
    ok('stepup: taking the plot plays the zoom-out, about three seconds, and ends on the allotment',zooming&&done&&s.level===2);
    ok('stepup: twelve plots with their labels, the player\'s marked, "Allotment" in the top bar and the panel\'s two tabs',
      s.plots===12&&s.labels===12&&s.mine&&s.top==='Allotment'&&s.tabs.join()==='Your plot,The allotment',JSON.stringify(s));
    await page.selectOption('#plot-care','3');
    const care=await page.waitForFunction(()=>window.__sim.snapshot().nodes.find(n=>n.id==='plot-1').levers.care===3,null,{timeout:4000}).then(()=>true,()=>false);
    ok('stepup: the plot\'s care is set from the panel, and the mix waits its turn',care&&!await page.$('#plot-mix'));
    await page.click('#tab-allotment');
    const rows=await page.evaluate(()=>({rows:document.querySelectorAll('.plot-row').length,neglected:document.querySelectorAll('.plot-row[data-neglected]').length}));
    await page.screenshot({path:join(out,'stepup-list.png')});
    ok('stepup: the allotment tab lists the twelve plots, one neglected',rows.rows===12&&rows.neglected===1,JSON.stringify(rows));
    // a tap during the zoom-out skips it
    await send(page,{type:'new-game',seed:1,speed:0});await latched(page);await shows(page,'.step-up-card');
    await page.click('.card-overlay .step-up-take');await shows(page,'.map[data-zooming]',true,3000);
    const t0=Date.now();await page.mouse.click(400,400);const skipped=await shows(page,'.map[data-zooming]',false,1000);
    ok('stepup: a tap skips the zoom-out',skipped&&Date.now()-t0<1500);
    ok('stepup: no errors on the page',!errs.length,errs.slice(0,2).join('; '));
    await ctx.close()}
  // reduced motion: straight to the allotment; and the sizes
  for(const [name,vp,touch] of [['phone',{width:320,height:640},true],['landscape',{width:740,height:360},true],['tablet',{width:820,height:1180},true],['desktop',{width:1440,height:900},false]]){
    const b=await browser,ctx=await b.newContext({viewport:vp,deviceScaleFactor:touch?2:1,hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});
    await ctx.addInitScript(()=>{window.__seed=1});
    const page=await ctx.newPage(),errs=[];page.on('pageerror',e=>errs.push(e.message));
    await page.goto(url);await ready(page);await latched(page);
    // under reduced motion a paused view holds the step before a jump: a moment running (on the checks' fast clock)
    // brings it up to the save
    await page.evaluate(()=>window.__sim.clock(4));await send(page,{type:'speed',speed:1});await page.waitForTimeout(1200);await send(page,{type:'speed',speed:0});await page.evaluate(()=>window.__sim.clock(1));
    await shows(page,'.step-up-card');await page.screenshot({path:join(out,`stepup-card-${name}.png`)});
    const cardSpill=await spill(page);
    await page.click('.card-overlay .step-up-take');
    const cut=await page.waitForFunction(()=>window.__sim.snapshot().level===2,null,{timeout:4000}).then(()=>true,()=>false);
    await page.waitForTimeout(400);
    const zoomed=await page.evaluate(()=>!!document.querySelector('.map[data-zooming]'));
    await page.screenshot({path:join(out,`stepup-${name}.png`)});
    ok(`stepup: at ${vp.width} × ${vp.height}, reduced motion cuts straight to the allotment, and nothing spills off the page`,cut&&!zoomed&&!cardSpill&&!await spill(page)&&!errs.length,errs[0]||'');
    await ctx.close()}
}
