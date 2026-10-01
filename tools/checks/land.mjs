// The land as organic parcels (src/sim/land.ts, src/ui/map/land.ts; docs/briefs/organic-land.md), in its check-only scene:
// a smallholding's land draws by code with no error, its oilseed rape yellow in May and not in July, its hedges and woods
// in their colours; a join and a split redraw it with the area kept; the camera zooms over it and redraws crisp once it
// rests; leaving the scene returns to the game; and at 320 × 568 and 390 × 844 nothing spills off the page. It logs the
// speed budget's figures: the land generated and drawn on a phone at 4× CPU throttling, and the scene's frame at
// 1440 × 900. Screenshots go to build/check/land-*.png.
import {join} from 'node:path';

const ready=page=>page.waitForSelector('.map[data-renderer]',{timeout:8000}).then(()=>page.waitForSelector('[data-sim="ready"]',{timeout:8000})).catch(()=>{});
const view=page=>page.evaluate(()=>window.__sim.view());
const spill=page=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:NaN};
// the share of the map's pixels near each of some CSS colours
async function shares(page,vars){
  const png=(await page.locator('.map canvas').screenshot()).toString('base64');
  return page.evaluate(async([png,vars])=>{
    const img=new Image();img.src='data:image/png;base64,'+png;await img.decode();
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);
    const d=x.getImageData(0,0,c.width,c.height).data,cs=getComputedStyle(document.documentElement);
    return Object.fromEntries(vars.map(v=>{const h=cs.getPropertyValue(v).trim().slice(1,7),t=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));let n=0;
      for(let i=0;i<d.length;i+=4)if(Math.abs(d[i]-t[0])+Math.abs(d[i+1]-t[1])+Math.abs(d[i+2]-t[2])<30)n++;return [v,n/(d.length/4)]}));
  },[png,vars]);
}
// the land shown, drawn, and the drawing's count when it settled
const show=async(page,seed,day)=>{const n=(await view(page)).landDrawn;await page.evaluate(([s,d])=>window.__sim.land(s,d),[seed,day]);
  await page.waitForFunction(n=>window.__sim.view().landDrawn>n,n,{timeout:5000}).catch(()=>{});await page.waitForTimeout(150)};
const area=page=>page.evaluate(()=>{const l=window.__sim.landNow();return l.fields.reduce((a,f)=>a+f.cells.reduce((b,c)=>b+l.cells[c].area,0),0)});

export default async function({ok,open,out}){
  {const {ctx,page,errs}=await open({width:1440,height:900});await ready(page);
    await page.evaluate(()=>window.__sim.send({type:'speed',speed:0}));
    // seed 1 has a field of oilseed rape: yellow in May, ripe by July
    await show(page,1,130);
    const may=await shares(page,['--map-field-rape','--map-hedge-leaf','--map-canopy','--map-water']);
    await page.screenshot({path:join(out,'land-may.png')});
    await show(page,1,200);
    const july=await shares(page,['--map-field-rape','--map-field-ripe']);
    await page.screenshot({path:join(out,'land-july.png')});
    const fields=await page.evaluate(()=>window.__sim.landNow().fields.map(f=>f.kind));
    ok('land: a smallholding draws by code, its rape yellow in May and ripe in July, with hedges, a wood and a pond',
      may['--map-field-rape']>0.02&&july['--map-field-rape']<0.002&&july['--map-field-ripe']>0.02&&may['--map-hedge-leaf']>0.01&&may['--map-canopy']>0.01&&may['--map-water']>0.002&&
      fields.includes('yard')&&fields.includes('wood')&&!errs.length,JSON.stringify({may,july,fields,err:errs[0]}));
    // a join and a split redraw the land, the area kept
    const a0=await area(page),pair=await page.evaluate(()=>{const l=window.__sim.landNow(),farmed=l.fields.filter(f=>f.kind==='arable'||f.kind==='grass');
      for(const x of farmed)for(const y of farmed)if(x!==y&&x.cells.length+y.cells.length<=18&&x.cells.some(c=>l.cells[c].across.some(o=>o>=0&&y.cells.includes(o))))return [x.id,y.id];return null});
    const n0=(await view(page)).landDrawn,joined=pair?await page.evaluate(([x,y])=>window.__sim.landJoin(x,y),pair):'no pair';
    await page.waitForFunction(n=>window.__sim.view().landDrawn>n,n0,{timeout:5000}).catch(()=>{});
    const big=await page.evaluate(()=>window.__sim.landNow().fields.filter(f=>f.kind==='arable'||f.kind==='grass').sort((a,b)=>b.cells.length-a.cells.length)[0].id);
    let split='no angle';for(const angle of [0,1.57,0.6,2.2]){split=await page.evaluate(([id,a])=>window.__sim.landSplit(id,2,a),[big,angle]);if(typeof split!=='string')break}
    const a1=await area(page),drawn=(await view(page)).landDrawn;
    await page.screenshot({path:join(out,'land-changed.png')});
    ok('land: fields join and split along their edges, the land redrawn and its area kept',typeof joined!=='string'&&typeof split!=='string'&&Math.abs(a1-a0)<1e-6*a0&&drawn>n0&&!errs.length,
      JSON.stringify({joined:typeof joined==='string'?joined:joined.length,split:typeof split==='string'?split:split.length,a0,a1,err:errs[0]}));
    // the camera: zoomed in, the land redrawn crisp once it rests
    const before=(await view(page)).landDrawn;
    await page.evaluate(()=>window.__sim.zoomBy(3,innerWidth/3,innerHeight/3));
    await page.waitForFunction(n=>window.__sim.view().landDrawn>n,before,{timeout:5000}).catch(()=>{});
    const z=await view(page);
    await page.screenshot({path:join(out,'land-zoomed.png')});
    ok('land: the camera zooms over the land and redraws it crisp once it rests',z.zoomed.k>2.5&&z.landDrawn>before,JSON.stringify({k:z.zoomed.k,drawn:z.landDrawn}));
    // the scene's frame, for the speed budget
    const frames=await page.evaluate(()=>new Promise(r=>setTimeout(()=>r(window.__sim.view().frames),2500)));
    ok('land: speed, the land scene\'s frame at 1440 × 900',frames.length>0&&!errs.length,`draw ${median(frames).toFixed(2)} ms a frame`);
    // leaving the scene returns to the game's map
    await page.evaluate(()=>window.__sim.land(null));await page.waitForTimeout(500);
    const back=await page.evaluate(()=>window.__sim.view().crops&&Object.keys(window.__sim.view().crops).length);
    ok('land: leaving the scene returns to the game\'s map',back>0&&!errs.length,`crops drawn ${back}`);
    await ctx.close()}

  // phones: the scene fits, and the one-offs on a throttled phone
  for(const vp of [{width:320,height:568},{width:390,height:844}]){
    const {ctx,page,errs}=await open(vp,{touch:true});await ready(page);
    const cdp=await ctx.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    const gen=await page.evaluate(()=>{const t=performance.now();for(let i=0;i<5;i++)window.__sim.land(i+1,130);return (performance.now()-t)/5});
    await page.waitForTimeout(800);
    const drawn=[];for(const day of [130,200,300]){await page.evaluate(d=>window.__sim.landDay(d),day);await page.waitForTimeout(500);drawn.push(...(await view(page)).landMs.slice(-1))}
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
    await page.screenshot({path:join(out,`land-${vp.width}x${vp.height}.png`)});
    ok(`land: speed, at ${vp.width}×${vp.height} on a phone at 4× CPU throttling a smallholding's land is made and drawn inside the budget, and nothing spills`,
      gen<40&&Math.max(...drawn)<40&&!(await spill(page))&&!errs.length,`made and first shown ${gen.toFixed(1)} ms each (setLand only queues the drawing); drawn ${drawn.map(x=>x.toFixed(1)).join(', ')} ms ${errs[0]||''}`);
    await ctx.close()}
}
