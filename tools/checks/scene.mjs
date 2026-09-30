// The map (src/ui/map/): it draws the garden in the owner's style on WebGL, and on Canvas 2D where WebGL is missing;
// it interpolates between snapshots, gliding between ticks and jumping per tick under prefers-reduced-motion; the
// weather is drawn from the sim's (rain crossing the garden only while it rains, still but shown under reduced motion,
// frost on a frosty morning, the dug beds paling as they dry and darkening when soaked, puddles on the path, the dawn's glow); each
// dug bed's crop drawn in its crop's silhouette; a seeded, paused screenshot
// repeats exactly; and a check-only synthetic scene of 5,000 nodes and 5,000 people runs, logging the speed budget's
// figures (frame time, and the snapshot's copy across the worker boundary at 4× CPU throttling).
import {join} from 'node:path';

// the share of a screenshot's pixels near each of some CSS colours, measured in the page
async function shares(page,sel,vars){
  const png=(await page.locator(sel).screenshot()).toString('base64');
  return page.evaluate(async([png,vars])=>{
    const img=new Image();img.src='data:image/png;base64,'+png;await img.decode();
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);
    const d=x.getImageData(0,0,c.width,c.height).data,cs=getComputedStyle(document.documentElement);
    return Object.fromEntries(vars.map(v=>{const h=cs.getPropertyValue(v).trim().slice(1,7),t=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));let n=0;
      for(let i=0;i<d.length;i+=4)if(Math.abs(d[i]-t[0])+Math.abs(d[i+1]-t[1])+Math.abs(d[i+2]-t[2])<40)n++;return [v,n/(d.length/4)]}));
  },[png,vars]);
}
const ready=page=>page.waitForSelector('.map[data-renderer]',{timeout:8000}).then(()=>page.waitForSelector('[data-sim="ready"]',{timeout:8000})).catch(()=>{});
const view=page=>page.evaluate(()=>window.__sim.view());
// a new game run to midday and paused, so the light is full and every colour is the token's own
async function midday(page){
  await page.evaluate(()=>window.__sim.send({type:'new-game',seed:1,speed:4}));
  await page.waitForFunction(()=>window.__sim.view().hours>=6,null,{timeout:8000}).catch(()=>{});
  await page.evaluate(()=>window.__sim.send({type:'speed',speed:0}));await page.waitForTimeout(200);
}
// the day of weather on the newest snapshot's air node
const air=page=>page.evaluate(()=>window.__sim.snapshot().nodes.find(n=>n.kind==='atmosphere').levers.weather);
// a new game, paused, then on to 01:00 on day 2, and day by day until the day passes a test; null if none does in time
async function findDay(page,test,days){
  await page.evaluate(async()=>{await window.__sim.send({type:'new-game',seed:1,speed:0});await window.__sim.send({type:'tick',hours:19})});
  for(let i=0;i<days;i++){const w=await air(page);if(w&&await page.evaluate(test,w))return w;await page.evaluate(()=>window.__sim.send({type:'tick',hours:24}))}
  return null;
}
// on to an hour later the same day, shown paused: the sim runs to the hour after it, more than four steps ahead, so the
// paused view jumps to one step behind the sim, the hour asked for (src/app/clock-loop.ts)
const showHour=(page,hour)=>page.evaluate(async h=>{const now=(window.__sim.snapshot().hours+6)%24;await window.__sim.send({type:'tick',hours:h+1-now})},hour);
// the weather drawn two frames after the view reaches that hour
const drawn=page=>page.waitForFunction(()=>{const v=window.__sim.view(),s=window.__sim.snapshot();return v.weather&&v.hours===s.hours-1},null,{timeout:8000})
  .then(()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(window.__sim.view()))))),()=>page.evaluate(()=>window.__sim.view()));
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:NaN};
const p95=a=>{const s=[...a].sort((x,y)=>x-y);return s.length?s[Math.floor(s.length*0.95)]:NaN};

export default async function({ok,open,out}){
  // it draws: the lawn, the dug beds and the grass plots, on WebGL, with nothing drawn from elsewhere
  {const {ctx,page,errs}=await open({width:1440,height:900});await ready(page);await midday(page);
    const v=await view(page),s=await shares(page,'.map',['--map-lawn','--map-bed-dug','--map-bed-grass']);
    await page.evaluate(()=>window.__sim.send({type:'speed',speed:1}));
    ok('scene: the map draws the garden on WebGL',v.renderer==='webgl'&&s['--map-lawn']>0.3&&s['--map-bed-dug']>0.01&&s['--map-bed-grass']>0.01&&!errs.length,`${v.renderer} ${JSON.stringify(s)} ${errs[0]||''}`);
    // each dug bed's crop is drawn in its crop's silhouette (src/ui/map/plants.ts), named in the stats
    const shapes=['rosette','blades','bush','climber','flower','sward'];
    ok('scene: each dug bed’s crop is drawn with its crop’s silhouette',v.shapes&&Object.keys(v.crops).length>0&&Object.keys(v.crops).every(id=>shapes.includes(v.shapes[id])),JSON.stringify(v.shapes));
    // it interpolates: within one tick the view time takes several values between the snapshots either side of it
    // (sampled frame by frame, however slow the frames, for up to 5 s)
    const inTick=await page.evaluate(()=>new Promise(done=>{const by={},t0=performance.now();
      const f=()=>{const v=window.__sim.view();if(v.alpha>0&&v.alpha<1&&v.hours>v.prev&&v.hours<v.cur)(by[v.cur]??=new Set()).add(v.hours);
        const best=Math.max(0,...Object.values(by).map(s=>s.size));if(best>=2||performance.now()-t0>5000)done(best);else requestAnimationFrame(f)};requestAnimationFrame(f)}));
    ok('scene: the view glides between snapshots at 1×',inTick>=2,`${inTick} view times inside one tick`);
    // and what moves glides with it: people walking in a small synthetic scene at 1× move between two frames of one tick
    await page.evaluate(()=>window.__sim.bench(20,20,1));await page.waitForFunction(()=>window.__sim.view().movers.length>=10,null,{timeout:8000}).catch(()=>{});
    const pair=await page.evaluate(()=>new Promise(done=>{let a=null;const t0=performance.now();
      const f=()=>{const v=window.__sim.view();if(a&&v.cur===a.cur&&v.hours>a.hours){done([a,v]);return}if(!a||v.cur!==a.cur)a=v;
        if(performance.now()-t0>5000)done([a,v]);else requestAnimationFrame(f)};requestAnimationFrame(f)}));
    const [a,b]=pair,moved=a.movers.filter(m=>{const n=b.movers.find(x=>x.id===m.id);return n&&Math.hypot(n.x-m.x,n.y-m.y)>0.05}).length;
    ok('scene: people drawn from activities move smoothly between ticks',a.movers.length>=10&&moved>=5&&a.cur===b.cur,`${moved} of ${a.movers.length} moved within tick ${a.cur}→${b.cur}`);
    // and they step as they walk: over a few frames, some figure is drawn mid-step
    const stepped=await page.evaluate(()=>new Promise(done=>{let best=0,n=0;const f=()=>{best=Math.max(best,window.__sim.view().stepping);if(++n>=30||best>0)done(best);else requestAnimationFrame(f)};requestAnimationFrame(f)}));
    ok('scene: people step through a walk cycle as they move',stepped>0,`${stepped} figures mid-step`);
    await page.screenshot({path:join(out,'scene-1440x900.png')});await ctx.close()}

  // prefers-reduced-motion: the view jumps from tick to tick
  {const {ctx,page,errs}=await open({width:1440,height:900});await page.emulateMedia({reducedMotion:'reduce'});await ready(page);
    await page.evaluate(()=>window.__sim.bench(20));await page.waitForTimeout(600);
    const seen=[];for(let i=0;i<30;i++){seen.push(await view(page));await page.waitForTimeout(50)}
    const whole=seen.every(x=>Number.isInteger(x.hours)),ticks=new Set(seen.map(x=>x.hours)).size;
    const still=seen.every((x,i)=>!i||x.hours!==seen[i-1].hours||JSON.stringify(x.movers)===JSON.stringify(seen[i-1].movers)),standing=seen.every(x=>x.stepping===0);
    ok('scene: under reduced motion the map jumps per tick instead of gliding',whole&&ticks>=2&&still&&standing&&!errs.length,`whole hours ${whole}, ${ticks} ticks seen, movers still between ticks ${still}, no figure mid-step ${standing}`);
    await ctx.close()}

  // the weather, drawn from the sim's: rain while it rains and not after, moving between frames even while paused; the
  // dug beds darker in the rain than on a dry afternoon; and frost on a frosty morning
  {const {ctx,page,errs}=await open({width:1440,height:900});await ready(page);
    const wet=await findDay(page,w=>w.rainHours>=3&&w.rainFrom>=6&&w.rainFrom+w.rainHours<=19,60);
    let rain=null,after=null,moved=false,soaked=null;
    if(wet){await showHour(page,wet.rainFrom+1);rain=await drawn(page);
      const a=await page.evaluate(()=>window.__sim.view().weather.drops);await page.waitForTimeout(250);const b=await page.evaluate(()=>window.__sim.view().weather.drops);
      moved=a.length>0&&JSON.stringify(a)!==JSON.stringify(b);
      soaked=rain.weather.soil['bed-1'];
      await page.screenshot({path:join(out,'scene-rain-1440x900.png')});
      await showHour(page,wet.rainFrom+wet.rainHours+4);after=await drawn(page)}
    ok('scene: rain falls across the garden while the sim says it rains, and stops when it stops',wet&&rain.weather.rain>=40&&after.weather.rain===0&&moved&&!errs.length,
      wet?`day ${wet.day}: ${rain.weather.rain} drops at ${wet.rainFrom+1}:00 (moving ${moved}), ${after.weather.rain} after ${errs[0]||''}`:'no wet day in 60');
    const dry=await findDay(page,w=>!w.wet&&w.sun>6,60);let parched=null;
    if(dry){await showHour(page,15);parched=await drawn(page);await page.screenshot({path:join(out,'scene-dry-1440x900.png')})}
    const pale=parched?.weather.soil['bed-1'];
    ok('scene: a dug bed is drawn darker in the rain than on a dry sunny afternoon',soaked!==null&&pale!==undefined&&soaked>pale+0.2,`bed 1 soil ${soaked} in the rain, ${pale} on a dry afternoon (−1 dry, 1 soaked)`);
    const cold=await findDay(page,w=>w.tmin<-1&&w.sun>2,400);let rime=null;
    if(cold){const rise=Math.floor(12-cold.length/2);await showHour(page,rise);rime=await drawn(page);await page.screenshot({path:join(out,'scene-frost-1440x900.png')})}
    ok('scene: frost lies on the garden on a frosty morning',cold&&rime.weather.frost>0&&!errs.length,cold?`day ${cold.day}, minimum ${cold.tmin.toFixed(1)} °C: frost ${rime.weather.frost.toFixed(2)}`:'no frosty day in 400');
    // the light: a warm glow as the sun rises, none at midday or mid-afternoon; puddles on the path in the rain, none on a dry afternoon
    ok('scene: the dawn glows warm at sunrise and not in the afternoon',cold&&rime.weather.dawn>0&&parched&&parched.weather.dawn===0,`dawn ${rime?.weather.dawn?.toFixed(2)} at sunrise, ${parched?.weather.dawn} at 15:00`);
    ok('scene: puddles lie on the path in the rain and not on a dry afternoon',wet&&rain.weather.puddles>0&&parched&&parched.weather.puddles===0,`${rain?.weather.puddles} paths puddled in the rain, ${parched?.weather.puddles} on a dry afternoon`);
    await ctx.close()}

  // under reduced motion the rain is still shown, but stands still between ticks (at 1×, since a paused view under
  // reduced motion holds the snapshot before a jump)
  {const {ctx,page,errs}=await open({width:844,height:390},{touch:true});await page.emulateMedia({reducedMotion:'reduce'});await ready(page);
    const wet=await findDay(page,w=>w.rainHours>=3&&w.rainFrom>=6&&w.rainFrom+w.rainHours<=19,60);let a=[],b=[],same=false;
    if(wet){await showHour(page,wet.rainFrom);await page.evaluate(()=>window.__sim.send({type:'speed',speed:1}));
      await page.waitForFunction(()=>window.__sim.view().weather?.rain>0,null,{timeout:10000}).catch(()=>{});
      for(let i=0;i<4&&!same;i++){const x=await page.evaluate(()=>window.__sim.view());await page.waitForTimeout(150);const y=await page.evaluate(()=>window.__sim.view());
        if(x.hours===y.hours){a=x.weather.drops;b=y.weather.drops;same=true}}}
    ok('scene: under reduced motion the rain is shown but doesn\'t fall',a.length>0&&JSON.stringify(a)===JSON.stringify(b)&&!errs.length,`${a.length} drops, the same 150 ms later in one tick ${JSON.stringify(a)===JSON.stringify(b)} ${errs[0]||''}`);
    await ctx.close()}

  // a seeded, paused screenshot repeats exactly
  {const shot=async()=>{const {ctx,page}=await open({width:844,height:390},{touch:true});await ready(page);
      await page.evaluate(()=>window.__sim.send({type:'new-game',seed:1,speed:0}));await page.waitForTimeout(500);
      const b=await page.locator('.map').screenshot();await ctx.close();return b};
    const a=await shot(),b=await shot();
    ok('scene: a seeded screenshot of the paused map repeats exactly',a.length>1000&&a.equals(b),`${a.length} and ${b.length} bytes`)}

  // no WebGL: Pixi's Canvas 2D renderer draws the same garden
  {const {ctx,page,errs}=await open({width:390,height:844},{touch:true});
    await ctx.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/.test(t)?null:get.call(this,t,...a)}});
    await page.reload();await ready(page);await midday(page);
    const v=await view(page),s=await shares(page,'.map',['--map-lawn','--map-bed-dug']);
    ok('scene: without WebGL the map falls back to Canvas 2D and still draws',v.renderer==='canvas'&&s['--map-lawn']>0.15&&s['--map-bed-dug']>0.01&&!errs.length,`${v.renderer} ${JSON.stringify(s)} ${errs[0]||''}`);
    await page.screenshot({path:join(out,'scene-canvas-390x844.png')});await ctx.close()}

  // the speed budget's figures (docs/SYSTEMS.md, "Speed budget"), logged: the garden's frame at 1440×900; 5,000 people
  // over 5,000 nodes at 1440×900, and on a phone-sized page at 4× CPU throttling, and 50 people over the same nodes
  // there, with each tick's copy across the worker boundary. The perf check (part 15) will assert them; this only
  // proves the scene runs.
  const measure=async(vp,touch,throttle,n,m=n,speed=1)=>{
    const {ctx,page,errs}=await open(vp,{touch});await ready(page);
    const cdp=await ctx.newCDPSession(page);if(throttle)await cdp.send('Emulation.setCPUThrottlingRate',{rate:throttle});
    if(n)await page.evaluate(([n,m])=>window.__sim.bench(n,m),[n,m]);
    // the garden's own game opens paused on the first plan's card: answering it starts the clock
    else await page.evaluate(async s=>{await window.__sim.send({type:'card',id:'first-plan',answer:'accept'});if(s!==1)await window.__sim.send({type:'speed',speed:s})},speed);
    await page.waitForTimeout(1500);
    const h0=(await page.evaluate(()=>window.__sim.view())).hours,c0=(await page.evaluate(()=>window.__sim.copyTimes())).read.length,f0=await page.evaluate(()=>{window.__fps=0;const f=()=>{window.__fps++;requestAnimationFrame(f)};requestAnimationFrame(f);return performance.now()});
    await page.waitForTimeout(3000);
    const r=await page.evaluate(([c0,f0])=>{const c=window.__sim.copyTimes();return {v:window.__sim.view(),read:c.read.slice(c0),patched:c.patched.slice(c0),written:c.written.slice(c0),fps:window.__fps/((performance.now()-f0)/1000),secs:(performance.now()-f0)/1000}},[c0,f0]);
    // the most the worker gives: eight-hour ticks back to back, as fast as it answers (the game only; a bench isn't ticked)
    const most=n?0:await page.evaluate(async()=>{const t=performance.now();for(let i=0;i<20;i++)await window.__sim.send({type:'tick',hours:8});return 160/((performance.now()-t)/1000)});
    await ctx.close();
    return {movers:r.v.movers.length,frame:median(r.v.frames),frame95:p95(r.v.frames),read:median(r.read.map((x,i)=>x+r.patched[i])),read95:p95(r.read.map((x,i)=>x+r.patched[i])),reading:median(r.read),patching:median(r.patched),written:median(r.written),ticks:r.read.length,fps:r.fps,rate:(r.v.hours-h0)/r.secs,most,errs};
  };
  const fmt=m=>`draw ${m.frame.toFixed(2)} ms a frame (p95 ${m.frame95.toFixed(2)}), ${m.fps.toFixed(0)} fps here; copy on the page ${m.read.toFixed(2)} ms a tick (p95 ${m.read95.toFixed(2)}; reading ${m.reading.toFixed(2)}, patching ${m.patching.toFixed(2)}), written in the worker ${m.written.toFixed(2)} ms, over ${m.ticks} ticks`;
  const garden=await measure({width:1440,height:900},false,0,0);
  ok('scene: speed, the garden at 1440×900',garden.frame>0&&!garden.errs.length,fmt(garden));
  const big=await measure({width:1440,height:900},false,0,5000);
  ok('scene: speed, 5,000 people over 5,000 nodes at 1440×900',big.movers>=16&&!big.errs.length,fmt(big));
  const phone=await measure({width:390,height:844},true,4,5000);
  ok('scene: speed, 5,000 people over 5,000 nodes on a phone at 4× CPU throttling',phone.movers>=16&&!phone.errs.length,fmt(phone));
  const nodes=await measure({width:390,height:844},true,4,5000,50);
  ok('scene: speed, 50 people over 5,000 nodes on a phone at 4× CPU throttling',nodes.movers>=16&&!nodes.errs.length,fmt(nodes));
  // the garden at 16×, its fastest speed (32 game hours a second), on the throttled phone: the worker keeps up
  const top=await measure({width:390,height:844},true,4,0,0,16);
  ok('scene: speed, the garden at 16× on a phone at 4× CPU throttling keeps up (32 game hours a second)',top.rate>=28&&!top.errs.length,`${fmt(top)}; the view ran ${top.rate.toFixed(1)} game hours a second, and the worker gives up to ${top.most.toFixed(0)}`);
}
