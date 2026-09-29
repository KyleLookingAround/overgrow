// The Explain card (src/ui/Explain.tsx, src/data/explain.ts, src/sim/effects.ts): a seeded week played hour by hour
// records no cause without an entry in the Explain table; one effect of each kind seen is tapped in its place's panel
// and opens its card (title, mechanism, fast and slow effects, source) with the map pulsing at the place; a creature
// drawn on the map opens its card when tapped; and on a 320 px phone on an evening with slugs out their badge is placed inside the map
// with no two badges overlapping (the same placement helper the map draws with, src/ui/map/placement.ts), and a tap on
// it opens the card inside the map; and the slugs' policy line stays hidden (and refused) until the slugs come up
// (src/data/unfold.ts).
import {join} from 'node:path';

const ready=page=>page.waitForSelector('.map[data-renderer]',{timeout:8000}).then(()=>page.waitForSelector('[data-sim="ready"]',{timeout:8000})).catch(()=>{});
const card=page=>page.evaluate(()=>{const c=document.querySelector('.card-overlay'),e=c?.querySelector('.explain');if(!c||!e)return null;const b=c.getBoundingClientRect();
  return {cause:e.dataset.cause,kind:e.dataset.kind,title:c.querySelector('.card-title')?.textContent??'',rows:c.querySelectorAll('.explain-rows dd').length,source:c.querySelector('.card-foot')?.textContent??'',
    box:{x:b.x,y:b.y,r:b.right,b:b.bottom}}});
const shut=page=>page.evaluate(()=>document.querySelector('.card-close')?.click());

export default async function({ok,open,out}){
  // a week on a desktop page: every cause known, and one effect of each kind opened from its place
  {const {ctx,page,errs}=await open({width:1440,height:900});
    await ready(page);
    await page.evaluate(()=>window.__sim.send({type:'speed',speed:0}));
    const week=await page.evaluate(async()=>{
      const seen={},unknown=new Set(),causes=new Set();
      for(let i=0;i<24*7;i++){const s=await window.__sim.send({type:'tick',hours:1});
        for(const e of s.effects){causes.add(e.cause);if(e.kind==='unknown')unknown.add(e.cause);else seen[e.kind]={cause:e.cause,at:e.at}}}
      return {seen,unknown:[...unknown],causes:causes.size}});
    ok('explain: a seeded week records no cause without an entry in the Explain table',week.unknown.length===0&&week.causes>20,`${week.causes} causes; with no entry: ${week.unknown.join(', ')||'none'}`);
    await page.waitForFunction(()=>window.__sim.view().cur===window.__sim.snapshot().hours,null,{timeout:8000}).catch(()=>{});
    const kinds=Object.keys(week.seen),bad=[];
    for(const kind of kinds){
      const {at}=week.seen[kind];
      const name=await page.evaluate(id=>window.__sim.snapshot().nodes.find(n=>n.id===id&&n.box)?.name??null,at);
      if(name)await page.evaluate(n=>[...document.querySelectorAll('.place-button')].find(b=>b.textContent===n)?.click(),name);
      const sel=name?`.lately .effect[data-kind="${kind}"]`:`[data-kind="${kind}"]`;
      const tapped=await page.waitForSelector(sel,{timeout:3000}).then(e=>e.click().then(()=>true),()=>false);
      const c=tapped?await page.waitForFunction(()=>document.querySelector('.card-overlay .explain'),null,{timeout:3000}).then(()=>card(page),()=>null):null;
      const pulse=await page.evaluate(()=>window.__sim.view().pulse);
      const fine=c&&c.kind===kind&&c.title&&c.rows===3&&/Source/.test(c.source)&&(!name||pulse===at);
      if(!fine)bad.push(`${kind} at ${at}: ${tapped?JSON.stringify({...c,box:undefined,pulse}):'nothing to tap'}`);
      if(kind==='pest')await page.screenshot({path:join(out,'explain-card-1440x900.png')});
      await shut(page);
    }
    ok(`explain: one effect of each kind seen opens its card, the map pulsing at its place (${kinds.join(', ')})`,kinds.length>=7&&!bad.length,bad.join('; '));
    // a creature on the map: tap it and its card opens
    await page.evaluate(()=>window.__sim.send({type:'tick',hours:13})); // on to the evening
    await page.waitForFunction(()=>window.__sim.view().creatures?.length,null,{timeout:8000}).catch(()=>{});
    const k=await page.evaluate(()=>window.__sim.view().creatures?.[0]??null),m=await page.evaluate(()=>{const b=document.querySelector('.map canvas').getBoundingClientRect();return {x:b.x,y:b.y}});
    if(k)await page.mouse.click(m.x+k.x,m.y+k.y);
    const c=k?await page.waitForFunction(()=>document.querySelector('.card-overlay .explain'),null,{timeout:3000}).then(()=>card(page),()=>null):null;
    ok('explain: a creature drawn on the map opens its card when tapped',k&&c&&c.cause===k.cause&&!errs.length,`${JSON.stringify(k)} → ${c?.cause} ${errs[0]||''}`);
    await ctx.close()}

  // a 320 px phone on the first evening with slugs out: the slugs' badge placed inside the map, none overlapping, and a tap opens the card
  {const {ctx,page,errs}=await open({width:320,height:568},{touch:true});
    await ready(page);
    await page.evaluate(()=>window.__sim.send({type:'speed',speed:0}));
    const before=await page.evaluate(()=>({line:!!document.querySelector('#policy-slugs'),refused:null}));
    before.refused=await page.evaluate(()=>window.__sim.send({type:'policy',node:'gardener',lever:'slugs',value:'trap'}).then(s=>s.rejected));
    // on to the first hour slugs are out (a mild, damp evening)
    const at=await page.evaluate(async()=>{for(let i=0;i<24*7;i++){const s=await window.__sim.send({type:'tick',hours:1});
      if(s.nodes.some(n=>n.levers.pests?.out>=4))return s.hours}return null});
    // one hour more: a paused view jumps to a step behind the newest, the hour just found
    if(at!==null)await page.evaluate(()=>window.__sim.send({type:'tick',hours:1}));
    await page.waitForFunction(h=>window.__sim.view().cur>=h,at??0,{timeout:8000}).catch(()=>{});
    await page.waitForSelector('.badge[data-cause="slugs"]',{timeout:5000}).catch(()=>{});
    const after=await page.waitForSelector('#policy-slugs',{timeout:5000}).then(()=>true,()=>false);
    ok('explain: the slugs’ policy line unfolds once the slugs come up, and is refused before',!before.line&&/come up/.test(before.refused??'')&&after,JSON.stringify({before,after}));
    const badges=await page.evaluate(()=>{const m=document.querySelector('.map').getBoundingClientRect();
      return {map:{x:m.x,y:m.y,r:m.right,b:m.bottom},list:[...document.querySelectorAll('.badge')].map(b=>{const r=b.getBoundingClientRect();return {cause:b.dataset.cause,x:r.x,y:r.y,w:r.width,h:r.height}})}});
    const l=badges.list,apart=l.every((a,i)=>l.every((b,j)=>j<=i||Math.abs(a.x-b.x)>=a.w-0.5||Math.abs(a.y-b.y)>=a.h-0.5));
    const inMap=l.every(b=>b.x>=badges.map.x-0.5&&b.y>=badges.map.y-0.5&&b.x+b.w<=badges.map.r+0.5&&b.y+b.h<=badges.map.b+0.5&&b.w>=40&&b.h>=40);
    const slug=l.find(b=>b.cause==='slugs');
    ok('explain: at 320×568 the badges sit inside the map, 40 px each, none overlapping, with slugs out after dark',slug&&apart&&inMap,JSON.stringify(l.map(b=>b.cause)));
    if(slug)await page.touchscreen.tap(slug.x+slug.w/2,slug.y+slug.h/2);
    const c=slug?await page.waitForFunction(()=>document.querySelector('.card-overlay .explain'),null,{timeout:3000}).then(()=>card(page),()=>null):null;
    const cardIn=c&&c.box.x>=badges.map.x-0.5&&c.box.r<=badges.map.r+0.5&&c.box.y>=badges.map.y-0.5&&c.box.b<=badges.map.b+0.5;
    const pulse=await page.evaluate(()=>window.__sim.view().pulse);
    ok('explain: at 320×568 a tap on the slugs’ badge opens the slugs’ card inside the map, the map pulsing at the bed',c?.cause==='slugs'&&cardIn&&/^bed-/.test(pulse??'')&&!errs.length,
      `${c?.cause} ${JSON.stringify(c?.box)} pulse ${pulse} ${errs[0]||''}`);
    await page.screenshot({path:join(out,'explain-card-320x568.png')});
    await ctx.close()}
}
