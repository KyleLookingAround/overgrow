// Unfolding (src/data/unfold.ts, src/sim/commands.ts, the top bar, the panel and the badges): a new game shows only
// the core (the date, the speeds, the gardener, the sowing plan and the places) under the first plan's card; each
// trigger reveals its key (the first watering the watering line and moisture, the first slugs their policy line, the
// first evening's patrol the Shed tab, the second evening's ask the Kitchen tab and, with it, the gardener home from work
// their job's line, the first payday the money, the first week the garden fed the household groceries saved, the first
// compost the soil's numbers, the carbon dial and the shop food's footprint beside it); a key not in the table fails
// closed, even from a save; a hidden
// lever's command is refused; the keys a tick reaches together make one sign, not one each, and the sign is still under
// reduced motion; and "Show all details" shows every number, tab and dial but opens no lever (the sim's gates stay).
const ready=page=>page.waitForSelector('.map[data-renderer]',{timeout:8000}).then(()=>page.waitForSelector('[data-sim="ready"]',{timeout:8000})).catch(()=>{});
const send=(page,cmd)=>page.evaluate(c=>window.__sim.send(c),cmd);
const has=(page,sel)=>page.evaluate(s=>!!document.querySelector(s),sel);
// ticks an hour at a time (a day at a time once `fast`) until a key is seen, or a day limit
const until=(page,key,days,step=1)=>page.evaluate(async([k,d,st])=>{let s=window.__sim.snapshot();
  for(let i=0;i<d*24/st&&!s.seen.includes(k);i++)s=await window.__sim.send({type:'tick',hours:st});return s.seen.includes(k)?s.hours:null},[key,days,step]);
// waits for the page to show (or not) a selector
const shows=(page,sel,on=true)=>page.waitForFunction(([s,o])=>!!document.querySelector(s)===o,[sel,on],{timeout:4000}).then(()=>true,()=>false);
const rowsOf=page=>page.evaluate(()=>[...document.querySelectorAll('.place dt')].map(d=>d.textContent));
const pick=(page,name)=>page.evaluate(n=>[...document.querySelectorAll('.place-button')].find(b=>b.textContent===n)?.click(),name);

// what each key shows, when it first unfolds on seed 1 (days), the step to tick by, and the tab it shows on
const TRIGGERS=[
  ['garden.water','#plan-water',1,1],
  ['garden.slugs','#policy-slugs',2,1],
  ['garden.shed','#tab-shed',2,1],
  ['garden.kitchen','#tab-kitchen',3,1],
  ['household.commute','.job-line',3,1],
  ['garden.money','.topbar .money',8,24],
  ['household.groceries','[data-cause="groceries saved"]',30,24,'#tab-kitchen'],
];

export default async function({ok,open}){
  const {ctx,page,errs}=await open({width:1440,height:900});await ready(page);
  // a new game from the page: paused on the first plan's card, with only the core showing
  const core=await page.evaluate(()=>({card:document.querySelector('.card-overlay .card-title')?.textContent??null,speed:window.__sim.snapshot()?.speed,
    tabs:[...document.querySelectorAll('.tab')].map(t=>t.textContent),money:!!document.querySelector('.topbar .money'),dial:!!document.querySelector('.dial'),
    temp:!!document.querySelector('.temp'),water:!!document.querySelector('#plan-water'),sow:!!document.querySelector('#plan-bed-2'),gardener:!!document.querySelector('.card .job'),
    speeds:document.querySelectorAll('.speeds .speed').length,goal:!!document.querySelector('.goal-bar')}));
  ok('unfold: a new game shows only the core, paused under the first plan’s card',
    core.card==='The first plan'&&core.speed===0&&core.tabs.join()==='Garden'&&!core.money&&!core.dial&&!core.temp&&!core.water&&core.sow&&core.gardener&&core.speeds===4&&!core.goal,JSON.stringify(core));
  await pick(page,'Bed 1');
  const bare=await rowsOf(page);
  ok('unfold: a bed’s panel shows no soil numbers before they unfold',!bare.some(r=>/Moisture|Organic|Nitrogen|Carbon/.test(r)),bare.join(', '));

  // a hidden lever's command is refused; unknown keys fail closed, even from a save
  const refused=(await send(page,{type:'plan',node:'gardener',lever:'waterBelow',value:0.75})).rejected;
  const save=JSON.parse(await page.evaluate(()=>window.__sim.save()));save.seen=['garden.nonsense','pests.slugs','water'];
  await send(page,{type:'load',save:JSON.stringify(save)});
  const closed=await page.evaluate(()=>window.__sim.send({type:'policy',node:'gardener',lever:'slugs',value:'trap'}).then(s=>s.rejected));
  const hidden=!(await has(page,'#policy-slugs'))&&!(await has(page,'#plan-water'))&&!(await has(page,'#tab-shed'));
  ok('unfold: a hidden lever’s command is refused, and keys not in the table (an old save’s) unfold nothing',/come up/.test(refused??'')&&/come up/.test(closed??'')&&hidden,`${refused} / ${closed} / hidden ${hidden}`);

  // each trigger reveals its key, and what it shows
  await send(page,{type:'new-game',seed:1,speed:0});
  const got=[],none=[];
  for(const [,sel] of TRIGGERS)if(await has(page,sel))none.push(sel);
  for(const [key,sel,days,step,tab] of TRIGGERS){
    if(tab)await page.click(tab).catch(()=>{});
    const before=none.includes(sel),at=await until(page,key,days,step);
    // a paused view jumps only on a tick of more than four steps, to the step before the newest
    await send(page,{type:'tick',hours:5});
    await page.waitForFunction(h=>window.__sim.view().cur>=h,at??0,{timeout:8000}).catch(()=>{});
    if(tab)await page.click(tab).catch(()=>{});
    const after=await shows(page,sel);
    if(tab)await page.click('#tab-garden').catch(()=>{});
    got.push(`${key}: ${at===null?"never":`day ${Math.floor((at+6)/24)+1}`}${!before&&after?"":` ✗ ${before} ${after}`}`);
  }
  ok('unfold: each trigger reveals its key and what it shows (the watering line, the slugs’ line, the Shed and Kitchen tabs, the job, the money, groceries saved)',!got.some(g=>/never|✗/.test(g))&&!errs.length,got.join('; '));
  await pick(page,'Bed 1');
  const wet=await rowsOf(page);
  ok('unfold: moisture shows with the watering line, N-P-K not yet',wet.includes('Moisture')&&!wet.includes('Organic matter'),wet.join(', '));

  // the first compost is the first feeding and the first carbon choice at once, and the shop food's footprint comes beside
  // the dial: one sign for the three, never one each
  const soil=await until(page,'garden.carbon',160,24);
  // one sign shows at a time (src/ui/notices.ts): the batch's waits its turn behind any before it
  await page.waitForSelector('.notice.unfold[data-keys*="garden.carbon"]',{timeout:25000}).catch(()=>{});
  const signs=await page.evaluate(()=>[...document.querySelectorAll('.notice.unfold')].map(n=>n.dataset.keys));
  const both=signs.filter(k=>/garden\.(soil|carbon)|household\.footprint/.test(k));
  const dial=await shows(page,'.dial'),bag=await shows(page,'.topbar .dial-shop');
  await pick(page,'Bed 2');
  const fed=await rowsOf(page);
  ok('unfold: keys that unfold together make one sign with all of them, and each shows what it reveals (the dial, the footprint beside it, organic matter)',
    soil!==null&&both.length===1&&/garden\.soil/.test(both[0])&&/garden\.carbon/.test(both[0])&&/household\.footprint/.test(both[0])&&dial&&bag&&fed.includes('Organic matter'),JSON.stringify({soil,signs,dial,bag,fed}));
  await page.emulateMedia({reducedMotion:'reduce'});
  const still=await page.evaluate(()=>{const n=document.querySelector('.notice.unfold');return n?getComputedStyle(n).animationName:null});
  ok('unfold: under reduced motion the sign is a still ring, not a pulse',still==='none',String(still));
  await ctx.close();

  // "Show all details": every number, tab and dial shows on a new game, and no lever opens
  {const {ctx,page,errs}=await open({width:1440,height:900});await ready(page);
    await send(page,{type:'card',id:'first-plan',answer:'accept'});await send(page,{type:'speed',speed:0});
    await page.click('.details input');
    await page.waitForFunction(()=>window.__sim.snapshot().settings.details===true,null,{timeout:4000}).catch(()=>{});
    await send(page,{type:'tick',hours:2});
    await pick(page,'Bed 1');
    const all=await page.evaluate(()=>({tabs:[...document.querySelectorAll('.tab')].map(t=>t.textContent),money:!!document.querySelector('.topbar .money'),dial:!!document.querySelector('.dial'),
      footprint:!!document.querySelector('.topbar .dial-shop'),job:!!document.querySelector('.job-line'),
      temp:!!document.querySelector('.temp'),rows:[...document.querySelectorAll('.place dt')].map(d=>d.textContent)}));
    const aphids=(await send(page,{type:'policy',node:'gardener',lever:'aphids',value:'pick'})).rejected;
    ok('unfold: “Show all details” shows every tab, the money, the dial and the footprint, the job, the temperature and the soil’s numbers, and opens no lever',
      all.tabs.join()==='Garden,Shed,Kitchen'&&all.money&&all.dial&&all.footprint&&all.job&&all.temp&&all.rows.includes('Organic matter')&&!(await has(page,'#policy-aphids'))&&/come up/.test(aphids??'')&&!errs.length,
      JSON.stringify({...all,aphids}));
    await ctx.close()}
}
