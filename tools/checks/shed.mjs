// The shed (src/data/shed.ts, src/sim/shed.ts, the Shed tab): an offer is hidden until it's worth having and a buy is
// refused before its key unfolds; once it has, the Shed tab shows it with its price, what it saves and what it costs
// besides, and a Buy button; buying pays its price from the purse, puts it in the shed's list and takes the offer away;
// a second buy of the same thing is refused; and an offer not yet worth having (the hose) is hidden, never greyed.
const ready=page=>page.waitForSelector('.map[data-renderer]',{timeout:8000}).then(()=>page.waitForSelector('[data-sim="ready"]',{timeout:8000})).catch(()=>{});
const send=(page,cmd)=>page.evaluate(c=>window.__sim.send(c),cmd);
const until=(page,key,days,step=1)=>page.evaluate(async([k,d,st])=>{let s=window.__sim.snapshot();
  for(let i=0;i<d*24/st&&!s.seen.includes(k);i++)s=await window.__sim.send({type:'tick',hours:st});return s.seen.includes(k)?s.hours:null},[key,days,step]);
const shows=(page,sel,on=true)=>page.waitForFunction(([s,o])=>!!document.querySelector(s)===o,[sel,on],{timeout:4000}).then(()=>true,()=>false);
const kit=page=>page.evaluate(()=>window.__sim.snapshot().nodes.find(n=>n.id==='shed').levers.kit);

export default async function({ok,open}){
  const {ctx,page,errs}=await open({width:1440,height:900});await ready(page);
  await send(page,{type:'card',id:'first-plan',answer:'accept'});await send(page,{type:'speed',speed:0});
  const early=(await send(page,{type:'buy',id:'beer-trap'})).rejected;
  ok('shed: a buy is refused before its offer unfolds',/isn’t offering/.test(early??''),String(early));
  // the first evening's torch patrol unfolds the Shed tab and the beer traps; payday a few days on the money
  const at=await until(page,'shed.beer-trap',3),paid=await until(page,'garden.money',8,24);
  await send(page,{type:'tick',hours:5});
  await page.waitForFunction(h=>window.__sim.view().cur>=h,paid??0,{timeout:8000}).catch(()=>{});
  await page.click('#tab-shed');
  const offer=await shows(page,'[data-offer="beer-trap"] button.buy');
  const card=await page.evaluate(()=>({text:document.querySelector('[data-offer="beer-trap"]')?.textContent??'',hose:!!document.querySelector('[data-offer="hose"]'),
    greyed:[...document.querySelectorAll('.offer button')].some(b=>b.disabled)}));
  ok('shed: once worth having, the offer shows its price, what it saves and what it costs besides, with a Buy button; one not yet worth having is hidden, not greyed',
    at!==null&&offer&&/£4\.00/.test(card.text)&&/Saves/.test(card.text)&&/But/.test(card.text)&&!card.hose&&!card.greyed,JSON.stringify({at,offer,...card}));
  const before=await page.evaluate(()=>window.__sim.snapshot().money);
  await page.click('[data-offer="beer-trap"] button.buy');
  await page.waitForFunction(()=>window.__sim.snapshot().nodes.find(n=>n.id==='shed').levers.kit.owned.includes('beer-trap'),null,{timeout:4000}).catch(()=>{});
  const after=await page.evaluate(()=>window.__sim.snapshot().money),k=await kit(page);
  const listed=await shows(page,'[data-kit="beer-trap"]'),gone=await shows(page,'[data-offer="beer-trap"]',false);
  const again=(await send(page,{type:'buy',id:'beer-trap'})).rejected,saved=JSON.parse(await page.evaluate(()=>window.__sim.save())).upgrades;
  ok('shed: buying pays its price from the purse, lists it in the shed and in the saved upgrades, and takes the offer away; a second buy is refused',
    Math.abs(before-after-4)<1e-6&&k.owned.includes('beer-trap')&&listed&&gone&&/already/.test(again??'')&&saved.includes('beer-trap')&&!errs.length,
    JSON.stringify({before,after,owned:k.owned,listed,gone,again,saved,errs}));
  await ctx.close();
}
