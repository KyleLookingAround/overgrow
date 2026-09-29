// The garden at work (src/sim/gardener.ts, src/sim/models/crops.ts, src/sim/models/kitchen.ts, the map and the Garden
// and Kitchen tabs): a seeded game with the default plan opens with bed 1's overwintered salad leaves growing (the
// owner's head start, #11), and shows the gardener sow bed 2 and water it in on day 1, a can a trip from the butt, the
// soil darkening; the drills drawn, then shoots at the real pace; a first harvest from bed 1 carried to the kitchen in
// the first week; the gardener drawn where their job is; the Kitchen tab showing the day's ask and what met it; and the
// Garden tab's plan changing what the gardener does next.
import {join} from 'node:path';

// radish shoots in bed 2 at the real pace on seed 1 (day 7), with a little room; the overwintered salad's first cut in the
// first week (day 5 on seed 1)
const SHOOTS_BY = 12, HARVEST_BY = 7;

const ready=page=>page.waitForSelector('.map[data-renderer]',{timeout:8000}).then(()=>page.waitForSelector('[data-sim="ready"]',{timeout:8000})).catch(()=>{});
const send=(page,cmd)=>page.evaluate(c=>window.__sim.send(c),cmd);
const snap=page=>page.evaluate(()=>window.__sim.snapshot());
// every activity and flow over some hours, an hour at a time
async function hourly(page,hours){
  return page.evaluate(async h=>{const acts=new Map(),flows=[];
    for(let i=0;i<h;i++){const s=await window.__sim.send({type:'tick',hours:1});for(const a of s.activities)acts.set(a.id,a);flows.push(...s.flows)}
    return {acts:[...acts.values()],flows}},hours);
}
// the view drawn after a tick of more than four steps, which a paused view jumps to (one step behind the sim)
async function drawnNow(page){
  await page.waitForFunction(()=>{const v=window.__sim.view(),s=window.__sim.snapshot();return v.crops&&v.hours===s.hours-1},null,{timeout:8000}).catch(()=>{});
  return page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(window.__sim.view())))));
}
// a new game run at 1× until the view reaches an hour, then paused there, drawn
async function runTo(page,hours,setup=[]){
  await send(page,{type:'new-game',seed:1,speed:0});
  for(const c of setup)await send(page,c);
  await send(page,{type:'speed',speed:1});
  await page.waitForFunction(h=>window.__sim.view().hours>=h,hours,{timeout:15000}).catch(()=>{});
  await send(page,{type:'speed',speed:0});
  return page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(window.__sim.view())))));
}
const day=h=>Math.floor(h/24)+1;

export default async function({ok,open,out}){
  const {ctx,page,errs:all}=await open({width:1440,height:900});await ready(page);
  const errs={get length(){return all.filter(e=>!/favicon|status of 404/.test(e)).length},get 0(){return all.filter(e=>!/favicon|status of 404/.test(e))[0]}};
  await send(page,{type:'new-game',seed:1,speed:0});
  await page.waitForFunction(()=>window.__sim.view().hours===0&&window.__sim.view().weather,null,{timeout:8000}).catch(()=>{});
  const before=(await page.evaluate(()=>window.__sim.view())).weather?.soil??{};

  // day 1: both beds sown and watered in, a can a trip from the butt, and the soil darker for it
  await send(page,{type:'new-game',seed:1,speed:0});
  const d1=await hourly(page,8),at=(doing,bed)=>d1.acts.filter(a=>a.doing===doing&&a.to===bed).length;
  const cans=d1.acts.filter(a=>a.doing==='carry'&&a.carry?.unit==='L');
  const s1=await snap(page),crop=id=>s1.nodes.find(n=>n.id===id).levers.crop;
  ok('garden: on day 1 the gardener sows bed 2 and waters it in, a can a trip from the butt, beside bed 1’s overwintered salad',
    at('sow','bed-1')===0&&at('sow','bed-2')===1&&at('water','bed-2')>=1&&cans.length>=1&&cans.every(a=>a.from==='butt'&&a.carry.amount<=10)&&crop('bed-1')?.id==='salad'&&crop('bed-2')?.id==='radish'&&!errs.length,
    `sown ${at('sow','bed-1')}/${at('sow','bed-2')}, watered ${at('water','bed-1')}/${at('water','bed-2')}, ${cans.length} cans, crops ${crop('bed-1')?.id}/${crop('bed-2')?.id} ${errs[0]||''}`);
  const v1=await runTo(page,1.5);
  ok('garden: the watered bed is drawn darker, its drills sown, bed 1’s salad growing, and the gardener back by the shed',
    v1.weather.soil['bed-2']>(before['bed-2']??0)&&v1.crops['bed-1']==='growing'&&v1.crops['bed-2']==='sown'&&v1.gardener?.to==='shed',
    `bed 2 soil ${before['bed-2']} → ${v1.weather.soil['bed-2']}, crops ${JSON.stringify(v1.crops)}, gardener ${JSON.stringify(v1.gardener)}`);
  await page.screenshot({path:join(out,'garden-day1-1440x900.png')});

  // shoots, then the first harvest, day by day
  await send(page,{type:'new-game',seed:1,speed:0});
  let shoots=null,first=null;
  for(let d=1;d<=SHOOTS_BY+2&&(first===null||shoots===null);d++){
    const s=await send(page,{type:'tick',hours:24});
    if(shoots===null){const v=await drawnNow(page);if(v.crops['bed-2']==='growing')shoots=day(v.hours)}
    if(s.kitchen?.firstHarvest!=null)first=day(s.kitchen.firstHarvest);
  }
  ok(`garden: bed 2's shoots are drawn by day ${SHOOTS_BY}`,shoots!==null&&shoots<=SHOOTS_BY,`shoots on day ${shoots}`);
  ok(`garden: the first harvest reaches the kitchen in the first week (by day ${HARVEST_BY})`,first!==null&&first<=HARVEST_BY,`first harvest on day ${first}`);
  // that day again, hour by hour: picked on the bed and carried in a basket to the kitchen
  await send(page,{type:'new-game',seed:1,speed:0});
  if(first)await send(page,{type:'tick',hours:24*(first-1)});
  const dH=await hourly(page,12),picks=dH.acts.filter(a=>a.doing==='pick'),baskets=dH.acts.filter(a=>a.doing==='carry'&&a.carry?.unit==='kgFood'&&a.to==='kitchen');
  const moved=dH.flows.filter(f=>f.what==='picking').reduce((s,f)=>s+f.amount,0);
  ok('garden: the harvest is picked and carried to the kitchen in a basket, the kilograms moving as it arrives',
    picks.length>0&&baskets.length>0&&Math.abs(moved-baskets.reduce((s,a)=>s+a.carry.amount,0))<1e-6&&moved>0,`${picks.length} picks, ${baskets.length} baskets, ${moved.toFixed(2)} kg picked`);
  await send(page,{type:'tick',hours:12});
  const vH=await drawnNow(page);await page.screenshot({path:join(out,'garden-harvest-1440x900.png')});
  await page.click('#tab-kitchen');
  const kitchen=await page.waitForFunction(()=>/Met \d+ %/.test(document.querySelector('.panel-body')?.textContent||''),null,{timeout:5000}).then(()=>true,()=>false);
  ok('garden: the Kitchen tab shows the day’s ask and what met it',kitchen&&vH.crops['bed-1'],`${kitchen} ${JSON.stringify(vH.crops)}`);
  await page.screenshot({path:join(out,'garden-kitchen-1440x900.png')});
  await page.click('#tab-garden');

  // the gardener drawn where the job is: digging a plot out of the lawn, an hour's spade work a square metre, once home
  // from work (the day's first hours go on the sowing); ticked there in one jump, as a paused view follows one
  await send(page,{type:'new-game',seed:1,speed:0});
  await send(page,{type:'plan',node:'bed-3',lever:'dig',value:true});
  await send(page,{type:'tick',hours:13});
  await page.waitForFunction(()=>window.__sim.view().cur>=12,null,{timeout:8000}).catch(()=>{});
  const vD=await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(window.__sim.view()))))),b=(await snap(page)).nodes.find(n=>n.id==='bed-3').box,c=vD.cam,g=vD.gardener;
  const inside=g&&g.x>=c.x+b.x*c.s&&g.x<=c.x+(b.x+b.w)*c.s&&g.y>=c.y+b.y*c.s&&g.y<=c.y+(b.y+b.h)*c.s;
  ok('garden: the gardener is drawn at the job in hand (digging bed 3 at 18:00, home from work)',g?.doing==='dig'&&inside,JSON.stringify(g));

  // the Garden tab's plan changes what the gardener does next: lettuce in bed 2 instead of radishes
  await send(page,{type:'new-game',seed:1,speed:0});
  await page.waitForSelector('#plan-bed-2',{timeout:5000}).catch(()=>{});
  await page.selectOption('#plan-bed-2','lettuce').catch(()=>{});
  await page.waitForFunction(()=>window.__sim.snapshot().nodes.find(n=>n.id==='bed-2').levers.sow==='lettuce',null,{timeout:5000}).catch(()=>{});
  const dP=await hourly(page,2),s2=await snap(page);
  ok('garden: the Garden tab’s plan changes what the gardener sows next',s2.nodes.find(n=>n.id==='bed-2').levers.crop?.id==='lettuce'&&dP.acts.some(a=>a.doing==='sow'&&a.to==='bed-2'),
    `bed 2: ${s2.nodes.find(n=>n.id==='bed-2').levers.crop?.id}`);
  // and a higher watering line sends them out with the can within the hour: after ten days with the line at never, at
  // 18:00, home from work
  await page.selectOption('#plan-water','0').catch(()=>{});
  await page.waitForFunction(()=>window.__sim.snapshot().nodes.find(n=>n.id==='gardener').levers.waterBelow===0,null,{timeout:5000}).catch(()=>{});
  const now=(await snap(page)).hours;
  await send(page,{type:'tick',hours:24*10+(((12-now)%24)+24)%24});
  await page.selectOption('#plan-water','0.75').catch(()=>{});
  await page.waitForFunction(()=>window.__sim.snapshot().nodes.find(n=>n.id==='gardener').levers.waterBelow===0.75,null,{timeout:5000}).catch(()=>{});
  const dW=await hourly(page,2);
  ok('garden: raising the watering line sends the gardener out to water',dW.acts.some(a=>a.doing==='water')&&!errs.length,`${dW.acts.map(a=>a.doing).join(' ')} ${errs[0]||''}`);
  await ctx.close();
}
