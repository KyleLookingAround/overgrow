// The one map's camera (src/ui/map/camera.ts, the renderer's lens, src/ui/MapView.tsx's gestures; docs/specs/one-map.md
// and its spike's brief): in the garden the wheel zooms about the pointer, a drag pans, the breadcrumb names the bed the
// camera is in and its ‹ flies back out, a tap still opens the place under it, and the pace stays the garden's 12 s a day;
// on a phone a two-finger pinch zooms in and the + and − buttons fly a step, each hidden at its end; at the allotment the
// widest view runs a day in 6 s, your plot holds the garden it keeps (with its golden tag) and runs at the garden's 12 s
// when it fills the view, a neighbour's plot opens from its totals when it's big enough, within the one-off budget at 4×
// CPU throttling, and the frame's cost is logged at the widest, halfway and closest zooms for the speed budget. Nothing
// spills off the page at 320×568, 390×844 and 1440×900. Screenshots go to build/check/camera-*.png.
import {join} from 'node:path';

const ready=page=>page.waitForSelector('.map[data-renderer]',{timeout:8000}).then(()=>page.waitForSelector('[data-sim="ready"]',{timeout:8000})).catch(()=>{});
const send=(page,cmd)=>page.evaluate(c=>window.__sim.send(c),cmd);
const view=page=>page.evaluate(()=>window.__sim.view());
const spill=page=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
const mapBox=page=>page.$eval('.map',e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}});
const crumb=page=>page.evaluate(()=>document.querySelector('.crumb-here')?.textContent??null);
// the camera at rest: the zoom unchanged over a few frames
const rest=page=>page.waitForFunction(()=>new Promise(r=>{const a=JSON.stringify(window.__sim.view().zoomed);setTimeout(()=>r(JSON.stringify(window.__sim.view().zoomed)===a),250)}),null,{timeout:6000}).catch(()=>{});
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:NaN};

// the step up's latched garden (tools/checks/stepup.mjs), and the plot taken
async function allotment(page){
  await page.waitForFunction(()=>window.__sim?.snapshot()?.seed!==undefined&&!!document.querySelector('.card-overlay'),null,{timeout:8000}).catch(()=>{});
  const save=JSON.parse(await page.evaluate(()=>window.__sim.save()));
  save.hours=24*364;save.seen=['card.first-plan','card.skip'];
  const samples=Array.from({length:52},(_,w)=>({output:2*(0.5+(w%4)/4),quality:0,upkeep:0,carbon:0.3,health:{soil:62}}));
  save.graph.nodes.kitchen.levers.goal={history:{level:1,sampleDays:7,cap:52,samples,land:{}},mark:{delivered:0,carbon:0},fed:Array(52).fill(0.6),offered:save.hours};
  for(let i=0;i<5;i++){await send(page,{type:'load',save:JSON.stringify(save)});await send(page,{type:'speed',speed:0});
    await page.waitForTimeout(200);if(await page.evaluate(h=>window.__sim.snapshot().hours===h,save.hours))break}
  await send(page,{type:'step-up'});
  await page.waitForFunction(()=>!document.querySelector('.map[data-zooming]')&&window.__sim.snapshot().level===2&&window.__sim.view().cur>0,null,{timeout:8000}).catch(()=>{});
}
// the frame's median cost over two seconds of running
const frames=page=>page.evaluate(()=>new Promise(r=>setTimeout(()=>r(window.__sim.view().frames),2000)));

export default async function({ok,open,out}){
  // the garden at 1440×900: the wheel, a drag, the breadcrumb, a tap, the pace
  {const {ctx,page,errs}=await open({width:1440,height:900});await ready(page);
    await send(page,{type:'card',id:'first-plan',answer:'accept'});await page.waitForTimeout(500);
    const m=await mapBox(page),bed=await page.evaluate(()=>window.__sim.snapshot().nodes.find(n=>n.id==='bed-2').box),cam0=(await view(page)).cam;
    const bx=m.x+cam0.x+(bed.x+bed.w/2)*cam0.s,by=m.y+cam0.y+(bed.y+bed.h/2)*cam0.s;
    // a few notches at the map's middle: the point under the pointer stays put (away from the garden's edge, where the
    // view stops rather than show past it)
    const mx=m.x+m.w/2,my=m.y+m.h/2,wx=(m.w/2-cam0.x)/cam0.s,wy=(m.h/2-cam0.y)/cam0.s;
    await page.mouse.move(mx,my);for(let i=0;i<3;i++){await page.mouse.wheel(0,-150);await page.waitForTimeout(40)}
    await rest(page);
    const z0=await view(page),still=Math.hypot(m.x+z0.cam.x+wx*z0.cam.s-mx,m.y+z0.cam.y+wy*z0.cam.s-my);
    // then on in over bed 2 until it fills the view
    const bx2=m.x+z0.cam.x+(bed.x+bed.w/2)*z0.cam.s,by2=m.y+z0.cam.y+(bed.y+bed.h/2)*z0.cam.s;
    await page.mouse.move(bx2,by2);for(let i=0;i<12;i++){await page.mouse.wheel(0,-150);await page.waitForTimeout(40)}
    await rest(page);
    const z=await view(page),name=await crumb(page),day=z.day;
    await page.screenshot({path:join(out,'camera-garden-bed.png')});
    ok('camera: in the garden the wheel zooms in about the pointer, and the breadcrumb names the bed',z0.zoomed.k>1.5&&z.zoomed.k>3&&still<4&&name==='Bed 2'&&Math.abs(day-12)<0.5,
      JSON.stringify({k:z.zoomed.k,still:+still.toFixed(1),name,day}));
    // a drag pans the view with the finger
    const x0=z.zoomed.x;await page.mouse.move(m.x+m.w/2,m.y+m.h/2);await page.mouse.down();await page.mouse.move(m.x+m.w/2+120,m.y+m.h/2,{steps:6});await page.mouse.up();await rest(page);
    const dragged=(await view(page)).zoomed;
    ok('camera: a drag moves the view, the ground following the pointer',dragged.x<x0-0.1,JSON.stringify({from:x0,to:dragged.x}));
    // a tap still opens the place under it, through the zoomed camera
    const c=(await view(page)).cam,b2=await page.evaluate(()=>window.__sim.snapshot().nodes.find(n=>n.id==='bed-2').box);
    // the middle of the part of bed 2 that's on the map
    const x0b=Math.max(m.x+4,m.x+c.x+b2.x*c.s),x1b=Math.min(m.x+m.w-4,m.x+c.x+(b2.x+b2.w)*c.s),y0b=Math.max(m.y+4,m.y+c.y+b2.y*c.s),y1b=Math.min(m.y+m.h-4,m.y+c.y+(b2.y+b2.h)*c.s);
    await page.mouse.click((x0b+x1b)/2,(y0b+y1b)/2);
    const opened=await page.waitForFunction(()=>document.querySelector('.place h3')?.textContent==='Bed 2',null,{timeout:4000}).then(()=>true,()=>false);
    ok('camera: zoomed in, a tap opens the place under it',opened);
    // the breadcrumb's ‹ flies back out to the widest view
    await page.click('.crumb-up');await rest(page);
    const out1=await view(page);
    ok('camera: the breadcrumb\'s ‹ flies back out to the whole garden',Math.abs(out1.zoomed.k-1)<1e-6&&!(await crumb(page))&&!(await spill(page))&&!errs.length,JSON.stringify({k:out1.zoomed.k,err:errs[0]}));
    await ctx.close()}

  // a phone: a pinch, and the + and − buttons, each hidden at its end
  for(const vp of [{width:390,height:844},{width:320,height:568}]){
    const {ctx,page,errs}=await open(vp,{touch:true});await ready(page);
    await send(page,{type:'card',id:'first-plan',answer:'accept'});await page.waitForTimeout(500);
    const m=await mapBox(page),cx=m.x+m.w/2,cy=m.y+m.h/2,cdp=await ctx.newCDPSession(page);
    const touch=(type,d)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:cx-d,y:cy,id:1},{x:cx+d,y:cy,id:2}]});
    await touch('touchStart',20);for(let d=30;d<=120;d+=10){await touch('touchMove',d);await page.waitForTimeout(16)}await touch('touchEnd',0);await rest(page);
    const pinched=(await view(page)).zoomed.k;
    const ends=async()=>page.evaluate(()=>({in:!!document.querySelector('.zoom-in:not([data-end])'),out:!!document.querySelector('.zoom-out:not([data-end])')}));
    await page.evaluate(()=>window.__sim.fly(null));await page.waitForFunction(()=>window.__sim.view().zoomed.k===1&&!!document.querySelector('.zoom-out[data-end]'),null,{timeout:5000}).catch(()=>{});
    const wide=await ends();
    for(let i=0;i<5;i++){await page.tap('.zoom-in:not([data-end])').catch(()=>{});await page.waitForTimeout(550)}
    await page.waitForSelector('.zoom-in[data-end]',{state:'attached',timeout:5000}).catch(()=>{});await rest(page);
    const deep=await ends(),k=(await view(page)).zoomed.k;
    await page.screenshot({path:join(out,`camera-garden-${vp.width}x${vp.height}.png`)});
    const here=await page.evaluate(()=>{const e=document.querySelector('.crumb-up');if(!e)return null;const r=e.getBoundingClientRect();return {w:r.width,h:r.height,name:getComputedStyle(document.querySelector('.crumb-name')).display}});
    ok(`camera: at ${vp.width}×${vp.height} a pinch zooms in, the + and − fly a step and hide at their ends, and the breadcrumb keeps its back arrow`,
      pinched>1.5&&wide.in&&!wide.out&&k>4&&!deep.in&&deep.out&&here&&here.w>=44&&here.h>=44&&(vp.width>=390||here.name==='none')&&!(await spill(page))&&!errs.length,
      JSON.stringify({pinched,wide,deep,k,here,err:errs[0]}));
    await ctx.close()}

  // the allotment at 1440×900: the pace by the zoom, your plot's garden, a neighbour's from its totals, the frame's cost
  {const {ctx,page,errs}=await open({width:1440,height:900},{});await page.emulateMedia({reducedMotion:'reduce'});await ready(page);
    await allotment(page);await send(page,{type:'speed',speed:1});await page.waitForTimeout(600);
    const wide=await view(page),wideF=median(await frames(page));
    await page.screenshot({path:join(out,'camera-allotment.png')});
    await page.evaluate(()=>window.__sim.zoomBy(2,720,450));await rest(page);
    const half=await view(page),halfF=median(await frames(page));
    await page.evaluate(()=>window.__sim.fly('plot-1'));await rest(page);
    const mine=await view(page),mineF=median(await frames(page)),name=await crumb(page);
    await page.screenshot({path:join(out,'camera-allotment-mine.png')});
    ok('camera: at the allotment a day takes 6 s at the widest view and the garden\'s 12 s with your plot filling the view, between them in between',
      Math.abs(wide.day-6)<0.3&&half.day>6.3&&half.day<11.7&&Math.abs(mine.day-12)<0.5,JSON.stringify({wide:wide.day,half:half.day,mine:mine.day}));
    ok('camera: your plot holds the garden it keeps, shown whole when the plot fills the view, and the breadcrumb says so',mine.inner>0.99&&name==='Your plot',JSON.stringify({inner:mine.inner,name}));
    await page.evaluate(()=>window.__sim.fly('plot-6'));await rest(page);
    const six=await view(page);
    await page.screenshot({path:join(out,'camera-allotment-neighbour.png')});
    ok('camera: a neighbour\'s plot opens in detail from its totals when it fills the view',six.detailed.includes('plot-6')&&!errs.length,JSON.stringify({detailed:six.detailed,err:errs[0]}));
    ok('camera: speed, the allotment\'s frame at 1440×900 with the garden composed in it (widest, halfway, your plot)',wideF>0&&!errs.length,
      `draw ${wideF.toFixed(2)}, ${halfF.toFixed(2)} and ${mineF.toFixed(2)} ms a frame`);
    await ctx.close()}

  // the one-off: a neighbour's plot drawn from its totals on a phone at 4× CPU throttling, under 20 ms
  {const {ctx,page,errs}=await open({width:390,height:844},{touch:true});await page.emulateMedia({reducedMotion:'reduce'});await ready(page);
    await allotment(page);
    const cdp=await ctx.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    for(const id of ['plot-2','plot-5','plot-8','plot-11']){await page.evaluate(id=>window.__sim.fly(id),id);await rest(page)}
    const ms=(await view(page)).detailMs,worst=Math.max(...ms);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
    await page.screenshot({path:join(out,'camera-allotment-390x844.png')});
    ok('camera: speed, a neighbour\'s plot drawn from its totals on a phone at 4× CPU throttling takes under 20 ms',ms.length>=4&&worst<20&&!(await spill(page))&&!errs.length,
      `${ms.length} drawn, median ${median(ms).toFixed(1)} ms, worst ${worst.toFixed(1)} ms ${errs[0]||''}`);
    await ctx.close()}
}
