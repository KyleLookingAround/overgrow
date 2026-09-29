// Digging (the plan's `dig` on a plot under grass, src/sim/gardener.ts and src/sim/models/carbon.ts): the command is open
// from the start, but "Dig this bed" shows on a grass plot's card only once every dug bed is in use (`garden.dig`), with
// its hours, price and carbon; tapping it has the gardener dig over the following days (the edging's price and the
// soil's flush of carbon are the Vitest tests', src/sim/shed.test.ts), and the dug bed joins the plan.
const ready=page=>page.waitForSelector('.map[data-renderer]',{timeout:8000}).then(()=>page.waitForSelector('[data-sim="ready"]',{timeout:8000})).catch(()=>{});
const send=(page,cmd)=>page.evaluate(c=>window.__sim.send(c),cmd);
const shows=(page,sel,on=true)=>page.waitForFunction(([s,o])=>!!document.querySelector(s)===o,[sel,on],{timeout:4000}).then(()=>true,()=>false);
const pick=(page,name)=>page.evaluate(n=>[...document.querySelectorAll('.place-button')].find(b=>b.textContent===n)?.click(),name);
const bed=(page,id)=>page.evaluate(i=>{const n=window.__sim.snapshot().nodes.find(x=>x.id===i);return {grass:n.stocks['land.grass']?.amount??0,crops:n.stocks['land.crops']?.amount??0,dig:n.levers.dig}},id);

export default async function({ok,open}){
  const {ctx,page,errs}=await open({width:1440,height:900});await ready(page);
  // a save from before the dug beds were full: no "Dig this bed" yet
  const save=JSON.parse(await page.evaluate(()=>window.__sim.save()));save.seen=['card.first-plan'];
  await send(page,{type:'load',save:JSON.stringify(save)});await send(page,{type:'speed',speed:0});
  await pick(page,'Bed 3');
  const hidden=await shows(page,'.dig-offer button.dig',false);
  // the first day: both dug beds are in use, so digging comes up
  const s=await page.evaluate(async()=>{let s=window.__sim.snapshot();for(let i=0;i<24&&!s.seen.includes('garden.dig');i++)s=await window.__sim.send({type:'tick',hours:1});return s.seen.includes('garden.dig')});
  await send(page,{type:'tick',hours:5});
  await pick(page,'Bed 4');await pick(page,'Bed 3');
  const offered=await shows(page,'.dig-offer button.dig'),text=await page.evaluate(()=>document.querySelector('.dig-offer')?.textContent??'');
  ok('dig: “Dig this bed” shows on a grass plot’s card only once every dug bed is in use, with its hours, price and carbon',
    hidden&&s&&offered&&/h of the gardener’s time/.test(text)&&/£36\.90 for edging and compost/.test(text)&&/carbon/.test(text),JSON.stringify({hidden,s,offered,text}));
  const money=await page.evaluate(()=>window.__sim.snapshot().money),carbon=await page.evaluate(()=>window.__sim.snapshot().carbon);
  await page.click('.dig-offer button.dig');
  await page.waitForFunction(()=>window.__sim.snapshot().nodes.find(n=>n.id==='bed-3').levers.dig===true,null,{timeout:4000}).catch(()=>{});
  const started=await bed(page,'bed-3');
  // over the next few days the gardener digs it, a square metre a job
  await page.evaluate(async()=>{for(let i=0;i<6;i++)await window.__sim.send({type:'tick',hours:24})});
  await send(page,{type:'tick',hours:5});
  const done=await bed(page,'bed-3'),spent=await page.evaluate(()=>window.__sim.snapshot().money);
  const inPlan=await shows(page,'#plan-bed-3');
  ok('dig: the gardener digs it over the following days, and the dug bed joins the plan',
    started.dig===true&&done.grass<1e-6&&Math.abs(done.crops-3)<1e-6&&inPlan&&!errs.length,JSON.stringify({started,done,money,spent,carbon,inPlan,errs}));
  // the refused cases: a bed that's dug already
  const again=(await send(page,{type:'plan',node:'bed-1',lever:'dig',value:true})).rejected;
  ok('dig: digging a bed that’s dug already is refused',/dug already/.test(again??''),String(again));
  await ctx.close();
}
