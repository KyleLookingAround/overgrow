// The first minute (the founding spec, "The first minute"; wins W5, W17 and W21), played on seed 1: the page opens
// paused on the first plan's card, with nothing else over the map (a tap on a number waits behind it and opens once the
// card is answered); "Sow them" starts the clock; the gardener sows and waters bed 2 in the morning, their hours ticking
// down; at dusk slugs come out on the damp beds (the check makes the evening damp itself, so a new draw of the dice can't
// move it) and the gardener goes out with a torch; a tap on a slug's badge opens the first Explain card; by the next
// morning the Shed tab shows the beer trap and the goal's line counts down to the first harvest; the kitchen's first ask
// comes on day 2; the gardener leaves for work at 08:30 on day 1 with no sign, and their job unfolds in the kitchen's
// sign on day 2's evening, not one of its own; no "try faster" nudge shows in the first minute, and once it's over it
// shows once, at 1×, and goes when answered. "Let them choose" hands bed 2 to the gardener's rotation.
import {join} from 'node:path';

const ready=page=>page.waitForSelector('.map[data-renderer]',{timeout:8000}).then(()=>page.waitForSelector('[data-sim="ready"]',{timeout:8000})).catch(()=>{});
const send=(page,cmd)=>page.evaluate(c=>window.__sim.send(c),cmd);
const snap=page=>page.evaluate(()=>window.__sim.snapshot());
// every activity over some hours, an hour at a time
const hourly=(page,h)=>page.evaluate(async h=>{const acts=new Map();for(let i=0;i<h;i++){const s=await window.__sim.send({type:'tick',hours:1});for(const a of s.activities)acts.set(a.id,a)}return [...acts.values()]},h);
// a paused view jumps only on a tick of more than four steps: tick on to an hour that way, and wait until it's drawn
async function drawnAt(page,hours){
  const now=(await snap(page)).hours;
  // the view lands a step behind the newest: at `hours` or just past it
  await send(page,{type:'tick',hours:Math.max(5,hours-now+1)});
  await page.waitForFunction(h=>window.__sim.view().cur>=h,hours,{timeout:8000}).catch(()=>{});
  await page.waitForTimeout(150);
}
const overMap=page=>page.evaluate(()=>({cards:[...document.querySelectorAll('.card-overlay .card-title')].map(t=>t.textContent),notices:document.querySelectorAll('.notice').length,
  goal:document.querySelector('.goal-bar .goal-text')?.dataset.text??null}));

export default async function({ok,open,out}){
  {const {ctx,page,errs}=await open({width:1440,height:900});await ready(page);
    // 0–10 s: paused on the first plan's card, nothing else over it; a tap on a number waits behind it
    await page.click('.card .num[data-cause="work"]').catch(()=>{});
    await page.waitForTimeout(300);
    const s0=await snap(page),m0=await overMap(page),text=await page.evaluate(()=>document.querySelector('.first-plan')?.textContent??'');
    ok('first minute: the page opens at 06:00 on day 1, paused, on the first plan’s card (salad in bed 1, radishes in bed 2), with nothing over it',
      s0.hours===0&&s0.speed===0&&m0.cards.join()==='The first plan'&&!m0.notices&&m0.goal===null&&/Salad leaves in bed 1/.test(text)&&/Radishes in bed 2/.test(text),JSON.stringify({hours:s0.hours,speed:s0.speed,...m0}));
    await page.screenshot({path:join(out,'first-minute-card-1440x900.png')});
    // accept: the clock starts, and the Explain card that waited opens
    await page.click('.card-actions .primary');
    const started=await page.waitForFunction(()=>window.__sim.snapshot().hours>=1,null,{timeout:6000}).then(()=>true,()=>false);
    const queued=await page.waitForFunction(()=>document.querySelector('.card-overlay .explain')?.dataset.cause,null,{timeout:4000}).then(r=>r.jsonValue(),()=>null);
    const s1=await snap(page);
    ok('first minute: “Sow them” keeps the plan and starts the clock at 1×, and the card that waited behind it opens after',
      started&&s1.seen.includes('card.first-plan')&&s1.speed===1&&s1.nodes.find(n=>n.id==='bed-2').levers.sow==='radish'&&queued==='work',`started ${started}, speed ${s1.speed}, queued ${queued}`);
    await page.evaluate(()=>document.querySelector('.card-close')?.click());
    // 06:00–12:00, from the first morning again, an hour at a time: the gardener sows bed 2 and waters it in, the day's
    // hours ticking down
    await send(page,{type:'speed',speed:0});await page.waitForTimeout(300);
    await send(page,{type:'new-game',seed:1,speed:0});
    const morning=await hourly(page,6),left1=(await snap(page)).nodes.find(n=>n.id==='gardener').stocks.hours.amount;
    ok('first minute: in the morning the gardener sows bed 2 and waters it in, their hours ticking down',
      morning.some(a=>a.doing==='sow'&&a.to==='bed-2')&&morning.some(a=>a.doing==='water'&&a.to==='bed-2')&&left1>0&&left1<4,`${morning.map(a=>a.doing).join(' ')}; ${left1.toFixed(2)} h of 4 left`);
    // then off to work through the gate, before 08:30, after the sowing and watering: no sign for it on day 1
    const leave=morning.find(a=>a.doing==='leave'),sown=morning.filter(a=>a.doing==='water'||a.doing==='sow').every(a=>a.end<=(leave?.start??0)+1e-9);
    const signs1=await page.evaluate(()=>document.querySelectorAll('.notice.unfold[data-keys*="household"]').length),seen1=(await snap(page)).seen;
    ok('first minute: after the sowing and watering the gardener leaves for work through the gate by 08:30, with no sign for it',
      leave?.to==='gate'&&leave.end<=2.5+1e-9&&sown&&morning.some(a=>a.doing==='away')&&!signs1&&!seen1.includes('household.commute'),JSON.stringify({leave,sown,signs1}));
    // dusk: the check makes the evening damp itself (W21), so the slugs come out on any draw of the dice
    // (the save from the morning's end, so the dusk is more than four steps on: a paused view follows a jump that long)
    await send(page,{type:'tick',hours:Math.max(0,6-(await snap(page)).hours)});
    const save=JSON.parse(await page.evaluate(()=>window.__sim.save()));
    const lawn=save.graph.nodes.lawn;lawn.levers.outbreak={...lawn.levers.outbreak,wet:save.hours};
    // and the first plan's card answered, as a player would have on the first morning
    save.seen=[...save.seen,'card.first-plan'];
    await send(page,{type:'load',save:JSON.stringify(save)});
    const [out2,torch]=await page.evaluate(async()=>{let most=0;const t=new Set();for(let i=0;i<12;i++){const s=await window.__sim.send({type:'tick',hours:1});
      most=Math.max(most,...s.nodes.map(n=>n.levers.pests?.out??0));for(const a of s.activities)if(a.doing==='torch')t.add(a.id)}return [most,t.size]});
    const s2=await snap(page);
    ok('first minute: at dusk slugs come out on the damp beds and the gardener goes out with a torch',out2>=0.5&&torch>0&&s2.seen.includes('garden.slugs'),`slugs out ${out2.toFixed(1)}, torch ${torch}`);
    // the first Explain: a tap on a slug's badge
    await send(page,{type:'new-game',seed:1,speed:0});
    await send(page,{type:'card',id:'first-plan',answer:'accept'});await send(page,{type:'speed',speed:0});
    await send(page,{type:'load',save:JSON.stringify(save)});
    // find the first hour slugs are out, then load the morning again and tick there in one jump: a paused view lands on
    // the step behind the newest, the hour found, however slowly the page draws
    const at=await page.evaluate(async()=>{for(let i=0;i<14;i++){const s=await window.__sim.send({type:'tick',hours:1});if(s.nodes.some(n=>(n.levers.pests?.out??0)>=1))return s.hours}return null});
    await send(page,{type:'load',save:JSON.stringify(save)});
    if(at!==null)await send(page,{type:'tick',hours:at-save.hours+1});
    await page.waitForFunction(h=>window.__sim.view().cur>=h,at??0,{timeout:10000}).catch(()=>{});
    const badge=await page.waitForSelector('.badge[data-cause="slugs"]',{timeout:8000}).then(()=>true,()=>false);
    if(badge)await page.click('.badge[data-cause="slugs"]');
    const first=await page.waitForFunction(()=>document.querySelector('.card-overlay .explain')?.dataset.cause,null,{timeout:4000}).then(r=>r.jsonValue(),()=>null);
    ok('first minute: a tap on a slug’s badge opens the first Explain card, on slugs',first==='slugs',`badge ${badge}, card ${first}`);
    await page.screenshot({path:join(out,'first-minute-slugs-1440x900.png')});
    await page.evaluate(()=>document.querySelector('.card-close')?.click());
    // day 2, morning: the beer trap in the shed, and the goal bar counting down to the first harvest
    await drawnAt(page,26);
    // the goal bar gives way to a notice: wait for the night's signs to go, one at a time (src/ui/notices.ts)
    const goal=await page.waitForSelector('.goal-bar .goal-text',{timeout:25000}).then(e=>e.getAttribute('data-text'),()=>'');
    await page.click('#tab-shed').catch(()=>{});
    const shed=await page.waitForFunction(()=>document.querySelector('.offer')?.textContent,null,{timeout:4000}).then(r=>r.jsonValue(),()=>'');
    ok('first minute: by the second morning the Shed tab shows the beer trap, and the goal’s line counts down to the first harvest',
      /Beer traps/.test(shed)&&/drown/.test(shed)&&/Buy beer traps/.test(shed)&&/^First harvest: .+ in Bed \d, (\d+ % grown|ready to pick)$/.test(goal),`${shed} | ${goal}`);
    await page.click('#tab-garden').catch(()=>{});
    // day 2, evening: the kitchen's first ask, and the gardener home from work in the same sign
    const noAsk=!(await page.evaluate(()=>!!document.querySelector('#tab-kitchen'))),noJob=!(await snap(page)).seen.includes('household.commute');
    await drawnAt(page,37);
    // it waits its turn behind any sign still showing
    const sign=await page.waitForSelector('.notice.unfold[data-keys*="garden.kitchen"]',{timeout:20000}).then(e=>e.getAttribute('data-keys'),()=>'');
    await page.click('#tab-kitchen').catch(()=>{});
    const ask=await page.waitForFunction(()=>document.querySelector('#ask-title')?.textContent,null,{timeout:4000}).then(r=>r.jsonValue(),()=>'');
    ok('first minute: the kitchen’s first ask comes on the second evening',noAsk&&/The day’s ask/.test(ask),`before ${!noAsk}, ${ask}`);
    ok('first minute: the gardener’s job unfolds in the kitchen’s sign on the second evening, not in a sign of its own',noJob&&/household\.commute/.test(sign??''),`before ${!noJob}, sign ${sign}`);
    await page.click('#tab-garden').catch(()=>{});
    // no nudge in the first minute
    const early=await page.evaluate(()=>[...document.querySelectorAll('.notice')].some(n=>/Try 2×/.test(n.textContent)));
    // once the first minute is over and the first cut is in, before the wait for the spring sowings: the nudge once at 1×,
    // gone when answered, never back (other choices, a frost's or a bed's, may wait in the queue beside it)
    await page.evaluate(async()=>{for(let i=0;i<14;i++){const s=await window.__sim.send({type:'tick',hours:24});if(s.kitchen?.firstHarvest!=null&&s.hours>120)break}});
    await send(page,{type:'speed',speed:1});
    // the nudge waits its turn in the queue behind the fortnight's signs
    const nudgeSel='button.notice-action:text-is("Try 2×")';
    const nudge=await page.waitForSelector(nudgeSel,{timeout:30000}).then(()=>true,()=>false);
    if(nudge)await page.click(nudgeSel);
    // the answer reaches the worker and the page redraws: wait for the nudge to go, then back at 1× it must stay gone
    const hasNudge=()=>[...document.querySelectorAll('.notice')].some(n=>/Try 2×/.test(n.textContent));
    await page.waitForFunction(()=>![...document.querySelectorAll('.notice')].some(n=>/Try 2×/.test(n.textContent)),null,{timeout:5000}).catch(()=>{});
    const s3=await snap(page);
    await send(page,{type:'speed',speed:1});
    await page.waitForTimeout(600);
    const back=await page.evaluate(hasNudge);
    ok('first minute: no “try faster” nudge in the first minute; once it’s over it shows once at 1× and goes when answered',
      !early&&nudge&&s3.speed===2&&s3.seen.includes('card.try-faster')&&!back&&!errs.length,JSON.stringify({early,nudge,speed:s3.speed,back,err:errs[0]}));
    await ctx.close()}

  // "Let them choose": bed 2 follows the gardener's rotation, and a phone shows the card inside the map
  {const {ctx,page,errs}=await open({width:320,height:568},{touch:true});await ready(page);
    const c=await page.evaluate(()=>{const m=document.querySelector('.map').getBoundingClientRect(),b=document.querySelector('.card-overlay')?.getBoundingClientRect();
      return b?{inside:b.x>=m.x-0.5&&b.right<=m.right+0.5&&b.y>=m.y-0.5&&b.bottom<=m.bottom+0.5,buttons:[...document.querySelectorAll('.card-actions button')].map(x=>x.getBoundingClientRect().height)}:null});
    await page.screenshot({path:join(out,'first-minute-card-320x568.png')});
    const choose=await page.$$('.card-actions button');
    if(choose[1])await choose[1].tap();
    const s=await page.waitForFunction(()=>window.__sim.snapshot().seen.includes('card.first-plan')&&window.__sim.snapshot(),null,{timeout:4000}).then(r=>r.jsonValue(),()=>null);
    ok('first minute: at 320×568 the card sits inside the map with 40 px buttons, and “Let them choose” hands bed 2 to the rotation',
      c?.inside&&c.buttons.every(h=>h>=40)&&s?.nodes.find(n=>n.id==='bed-2').levers.sow==='rotation'&&s?.speed===1&&!errs.length,JSON.stringify({c,sow:s?.nodes.find(n=>n.id==='bed-2').levers.sow,err:errs[0]}));
    await ctx.close()}
}
