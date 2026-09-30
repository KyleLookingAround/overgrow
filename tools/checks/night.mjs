// The quiet night (src/ui/quiet-night.ts), on seed 1 in December: once the gardener has gone to bed with nothing live on
// the map and no card or notice waiting, the night passes four times faster than the chosen speed, with the moon on the
// pressed speed and one "Quiet nights pass quickly" notice the first time; pause still pauses; an Explain card open hands the
// pace back at once; dawn hands it back at 06:00. On a phone under reduced motion the moon shows still, and the top bar
// keeps to two rows with it; on a tablet, where 4×, 8× and 16× share a button, to one.
import {join} from 'node:path';

const ready=page=>page.waitForSelector('.map[data-renderer]',{timeout:8000}).then(()=>page.waitForSelector('[data-sim="ready"]',{timeout:8000})).catch(()=>{});
const send=(page,cmd)=>page.evaluate(c=>window.__sim.send(c),cmd);
const view=page=>page.evaluate(()=>window.__sim.view());
const quiet=(page,on,timeout=15000)=>page.waitForFunction(on=>window.__sim.view().quiet===on,on,{timeout}).then(()=>true,()=>false);
// the moon that shows (one on the pressed speed's button), and whether it sits on that button's corner
const moon=page=>page.evaluate(()=>{const m=[...document.querySelectorAll('.topbar .quiet-night')].find(e=>e.getClientRects().length);if(!m)return null;const b=m.closest('button');
  const r=m.getBoundingClientRect(),t=document.querySelector('.topbar').getBoundingClientRect();
  return {inBar:r.y>=t.y-0.5&&r.x>=t.x-0.5&&r.right<=t.right+0.5,title:m.getAttribute('title'),anim:getComputedStyle(m).animationName,on:b?.getAttribute('aria-pressed')==='true'||b?.classList.contains('speed-cycle'),label:b?.getAttribute('aria-label')}});
// game hours the view moves a real second, measured in the page over a stretch of real time and divided by the time that
// really passed: timed from outside, the two reads' round trips on a slow runner stretch the stretch, and a pace of 8
// read as 13
async function rate(page,ms=400){return page.evaluate(ms=>new Promise(done=>{const h0=window.__sim.view().hours,t0=performance.now();
  setTimeout(()=>done((window.__sim.view().hours-h0)/((performance.now()-t0)/1000)),ms)}),ms)}
// dismiss every notice waiting (the week's decisions, a bed's card, the nudge), so nothing waits but the quiet night's own
async function clear(page){for(let i=0;i<12;i++){const b=await page.$('.notice:not(:has-text("Quiet nights")) .notice-close');if(!b)return;await b.click().catch(()=>{});await page.waitForTimeout(250)}}
// 18:00 on day 279, in December: a night with no frost and no slug out all through, on seed 1
const EVENING=278*24+12;
// the top bar's parts, their rows counted by overlapping extents (a small icon centred on a row is on it), and whether any
// is outside the bar or overlaps another
const rowsOf=page=>page.evaluate(()=>{const t=document.querySelector('.topbar').getBoundingClientRect(),parts=[...document.querySelectorAll('.topbar .level,.topbar .date,.topbar .money,.topbar .dial,.topbar .speed,.topbar .speed-cycle')].filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect())
      let rows=0,bottom=-1;for(const b of parts.slice().sort((a,b)=>a.y-b.y)){if(b.y>=bottom-0.5)rows++;bottom=Math.max(bottom,b.bottom)}return {rows,inside:parts.every(b=>b.right<=t.right+0.5&&b.x>=t.x-0.5),overlap:parts.some((a,i)=>parts.some((b,j)=>j>i&&a.x<b.right-0.5&&b.x<a.right-0.5&&a.y<b.bottom-0.5&&b.y<a.bottom-0.5))}});

export default async function({ok,open,out}){
  let save=null;
  {const {ctx,page,errs}=await open({width:1440,height:900});await ready(page);
    await send(page,{type:'new-game',seed:1,speed:0});
    // the first plan kept and the "try faster" nudge answered, as a player would have by December
    await send(page,{type:'card',id:'first-plan',answer:'accept'});await send(page,{type:'card',id:'try-faster',answer:'no'});await send(page,{type:'speed',speed:0});
    await page.evaluate(async h=>{while(window.__sim.snapshot().hours<h)await window.__sim.send({type:'tick',hours:Math.min(240,h-window.__sim.snapshot().hours)})},EVENING);
    await page.waitForFunction(h=>window.__sim.view().cur>=h,EVENING,{timeout:8000}).catch(()=>{});
    save=await page.evaluate(()=>window.__sim.save());
    await page.waitForTimeout(300);await clear(page);
    // at 1×: the gardener goes to bed and the night passes quickly, with the moon and its notice
    await send(page,{type:'speed',speed:1});await clear(page);
    // the night lasts under two seconds at this pace: read the moon and the notice the moment it's quiet, then the pace,
    // and the screenshot last
    const on=await quiet(page,true),m=await moon(page);
    const note=await page.evaluate(()=>[...document.querySelectorAll('.notice')].some(n=>/Quiet nights pass quickly/.test(n.textContent)));
    const fast=on?await rate(page,300):0;
    await page.screenshot({path:join(out,'night-quiet-1440x900.png')});
    ok('night: a quiet night passes at four times 1× (8 game hours a second), with the moon on the pressed speed and one notice',
      on&&fast>5&&fast<12&&m?.title==='Quiet night: passing quickly'&&m.on&&m.inBar&&/quiet night/.test(m.label)&&note,JSON.stringify({on,fast:+fast.toFixed(1),m,note}));
    // pause still pauses, from the start of the next quiet night (this one is nearly over by now, so the pause, which
    // lands a frame or two later, still lands in the night)
    await quiet(page,false,5000);
    const during=await quiet(page,true,20000);
    await send(page,{type:'speed',speed:0});
    const off=await quiet(page,false,3000),h0=(await view(page)).hours;await page.waitForTimeout(400);const h1=(await view(page)).hours;
    ok('night: pause still pauses a quiet night, and the moon goes',during&&off&&h1===h0&&!(await moon(page)),JSON.stringify({during,off,h0,h1,clock:(h0+6)%24}));
    // something needs the player: an Explain card open hands the pace back
    const tap=await page.$('.topbar .money, .topbar .dial, .num[data-cause]');
    if(tap)await tap.click();
    const card=await page.waitForSelector('.card-overlay .explain',{timeout:4000}).then(()=>true,()=>false);
    await send(page,{type:'speed',speed:1});await page.waitForTimeout(300);
    const slow=await rate(page),held=!(await view(page)).quiet;
    ok('night: with an Explain card open the night runs at the chosen speed',card&&held&&slow<3.5&&!(await moon(page)),JSON.stringify({card,held,slow:+slow.toFixed(1)}));
    await page.evaluate(()=>document.querySelector('.card-close')?.click());
    // dawn hands it back, whichever night it is by now
    const again=await quiet(page,true,15000),next=Math.floor((await view(page)).hours/24+1)*24;
    const dawn=await page.waitForFunction(d=>window.__sim.view().hours>=d+0.5,next,{timeout:15000}).then(()=>true,()=>false);
    const day=await rate(page),after=await view(page);
    ok('night: dawn hands the pace back at 06:00, and the moon goes',again&&dawn&&!after.quiet&&day<3.5&&!(await moon(page))&&!errs.length,JSON.stringify({again,dawn,quiet:after.quiet,day:+day.toFixed(1),err:errs[0]}));
    await ctx.close()}

  // a tablet, where 4×, 8× and 16× share a button: the top bar keeps to one row with the moon
  {const {ctx,page,errs}=await open({width:768,height:1024},{save});await ready(page);
    await send(page,{type:'speed',speed:0});await page.waitForTimeout(300);await clear(page);
    await send(page,{type:'speed',speed:1});await clear(page);
    const on=await quiet(page,true),m=await moon(page),bar=await rowsOf(page);
    await page.screenshot({path:join(out,'night-quiet-768x1024.png'),clip:{x:0,y:0,width:768,height:120}});
    ok('night: at 768×1024 the top bar keeps to one row with the moon',on&&m?.inBar&&bar.rows===1&&bar.inside&&!bar.overlap&&!errs.length,JSON.stringify({on,m:!!m,bar,err:errs[0]}));
    await ctx.close()}

  // a phone under reduced motion: the moon shows still, and the top bar keeps to two rows with it
  {const {ctx,page,errs}=await open({width:320,height:568},{touch:true,save});
    await page.emulateMedia({reducedMotion:'reduce'});await ready(page);
    await send(page,{type:'speed',speed:0});await page.waitForTimeout(300);await clear(page);
    await send(page,{type:'speed',speed:1});await clear(page);
    const on=await quiet(page,true),m=await moon(page);
    const bar=await rowsOf(page);
    await page.screenshot({path:join(out,'night-quiet-320x568.png')});
    ok('night: at 320×568 under reduced motion the moon shows still, and the top bar keeps to two rows with it',
      on&&m?.anim==='none'&&m.inBar&&bar.rows<=2&&bar.inside&&!bar.overlap&&!errs.length,JSON.stringify({on,m,bar,err:errs[0]}));
    await ctx.close()}
}
