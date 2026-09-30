// The page's shell at every size in the brief's device list (the spec docs/specs/ui-overhaul.md): the phones 320×568,
// 360×640, 375×667, 390×844, 414×896 and 430×932 upright and on their side, the tablets 768×1024, 1024×768, 820×1180 and
// 1024×1366, and 1280×800, 1440×900, 1920×1080, 2560×1440 and 3440×1440, phones and tablets with touch, isMobile and a
// device scale factor of 3 or 2. At each: the top bar, the map and the panel inside the viewport with no overflow or
// errors; the top bar one row (at most 60 px) with the date, the money, the dial and exactly one speed control (the six
// speeds, four with 4×, 8× and 16× sharing one below 1024 px, the folded button below 700 px, or on a sheet layout the
// pill at the map's foot); the panel as a sheet below the map on
// phones and tablets held upright and beside it otherwise; the map's share of the screen above its class's floor (42 %
// on a phone with the sheet at rest, 50 % on a phone on its side or a tablet held upright, 60 % beside a side panel, 70 %
// from 1920 px and 78 % from 2560 px); every tap target at least 44 px on touch (the UI record's 40 px on a mouse); the
// goal bar at the map's foot, clear of the speed pill; three notices at once showing one, inside the map, over less
// than a quarter of it; and on a touch page the sheet's three resting heights (half at rest, tall, then peek with the
// map grown), tapped. At 390×844 and 1440×900 a card docks away from its place (a low bed's card at the top, a high
// bed's at the foot) and folds a phone's sheet while it's up, the speed pill kept clear of it; the fullscreen button shows only where the browser has the
// API, and there it goes in and out; the dark scheme swaps the colours; the top bar and panel work by keyboard alone
// with the focus shown; and the safe areas are named on every side. Each page answers the first plan's card and shows
// every detail, the fullest the chrome gets (src/data/unfold.ts).
import {join} from 'node:path';

const box=(page,sel)=>page.evaluate(s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length)return null;const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,r:b.right,b:b.bottom}},sel);
const inside=(b,vw,vh)=>b&&b.w>0&&b.h>0&&b.x>=-0.5&&b.y>=-0.5&&b.r<=vw+0.5&&b.b<=vh+0.5;
const within=(a,b)=>a&&b&&a.x>=b.x-0.5&&a.y>=b.y-0.5&&a.r<=b.r+0.5&&a.b<=b.b+0.5;
const settle=page=>page.waitForTimeout(250);

// the brief's device list: [w, h, touch, device scale factor]
const PHONES=[[320,568],[360,640],[375,667],[390,844],[414,896],[430,932]];
const SIZES=[...PHONES.map(([w,h])=>[w,h,true,3]),...PHONES.map(([w,h])=>[h,w,true,3]),[768,1024,true,2],[1024,768,true,2],[820,1180,true,2],[1024,1366,true,2],
  [1280,800,false,1],[1440,900,false,1],[1920,1080,false,1],[2560,1440,false,1],[3440,1440,false,1]];
/** The device class the stylesheet's queries give a size, and the map's floor for it. */
function classOf(w,h){
  if(h<=500&&w>=500)return {name:'phone on its side',sheet:false,floor:0.5};
  if(w<700)return {name:'phone',sheet:true,floor:0.42};
  if(h>w&&w<1024)return {name:'tablet held upright',sheet:true,floor:0.5};
  return {name:w>=2560?'ultrawide':w>=1920?'large screen':'side panel',sheet:false,floor:w>=2560?0.78:w>=1920?0.7:0.6};
}

export default async function({ok,open:bare,out}){
  // each page with the first plan's card answered and every detail showing: the fullest the chrome gets
  const open=async(vp,opts)=>{const r=await bare(vp,opts);await r.page.waitForSelector('[data-sim="ready"]',{timeout:8000}).catch(()=>{});
    await r.page.evaluate(async()=>{await window.__sim.send({type:'card',id:'first-plan',answer:'accept'});await window.__sim.send({type:'setting',key:'details',value:true})});
    await r.page.waitForFunction(()=>document.querySelectorAll('.tab').length===3,null,{timeout:5000}).catch(()=>{});await settle(r.page);return r};
  const measure=page=>page.evaluate(()=>{
    const box=s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length)return null;const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,r:b.right,b:b.bottom}};
    const vis=s=>[...document.querySelectorAll(s)].filter(e=>e.getClientRects().length).length;
    return {top:box('.topbar'),map:box('.map'),panel:box('.panel'),head:box('.panel-head'),body:box('.panel-body'),goal:box('.goal-bar'),pill:box('.speed-pill'),full:box('.fullscreen'),
      date:vis('.topbar .date'),money:vis('.topbar .money'),dial:vis('.topbar .dial'),speeds:vis('.topbar .speeds .speed'),cycle:vis('.topbar .speed-cycle'),pillOn:vis('.speed-pill'),
      canFull:!!document.fullscreenEnabled,flow:{sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,sh:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight}}});
  for(const [w,h,touch,dsf] of SIZES){
    const cls=classOf(w,h),{ctx,page,errs}=await open({width:w,height:h},{touch,dsf});
    const m=await measure(page);
    const placed=cls.sheet?m.panel&&m.map&&m.panel.y>=m.map.b-1&&m.panel.b<=h+0.5:m.panel&&m.map&&m.panel.x>=m.map.r-1&&m.panel.y>=m.top.b-1;
    const share=m.map?(m.map.w*m.map.h)/(w*h):0;
    const bad=[!inside(m.top,w,h)&&'the top bar isn\'t in view',!inside(m.map,w,h)&&'the map isn\'t in view',!inside(m.panel,w,h)&&'the panel isn\'t in view',!inside(m.head,w,h)&&'the panel\'s head isn\'t in view',
      !placed&&(cls.sheet?'the sheet isn\'t below the map':'the panel isn\'t beside the map'),m.map&&m.top&&m.map.y<m.top.b-1&&'the map is under the top bar',
      m.flow.sw>m.flow.cw&&`scroll width ${m.flow.sw}`,m.flow.sh>m.flow.ch&&`scroll height ${m.flow.sh}`,errs[0]].filter(Boolean);
    ok(`layout: at ${w}×${h} (${cls.name}) the top bar, map and ${cls.sheet?'sheet below':'panel beside'} are in view, with no overflow or errors`,!bad.length,bad.join('; '));
    ok(`layout: at ${w}×${h} the map takes ${Math.round(100*share)} % of the screen, at least ${Math.round(100*cls.floor)} %`,share>=cls.floor,m.map&&`${Math.round(m.map.w)}×${Math.round(m.map.h)}`);
    // the top bar: one row, its parts, and exactly one speed control where the layout puts it
    // the speeds: six buttons on a wide bar, four with 4×, 8× and 16× sharing one below 1024 px, one folded button below 700 px, the pill on a sheet
    const bar=m.top.w-24,full=bar>=1024?6:4;
    const controls=(m.speeds>0?1:0)+(m.cycle?1:0)+(m.pillOn?1:0),want=cls.sheet?'the pill at the map\'s foot':bar<700?'the folded button':full===6?'the six speeds':'four buttons, the fast speeds sharing one';
    const right=cls.sheet?m.pillOn&&!m.cycle&&m.speeds===0:bar<700?m.cycle&&!m.pillOn&&m.speeds===0:m.speeds===full&&!m.cycle&&!m.pillOn;
    ok(`layout: at ${w}×${h} the top bar is one row with the date, the money and the dial, and the speed is ${want}`,m.top&&m.top.h<=60&&m.date&&m.money&&m.dial&&controls===1&&right,
      JSON.stringify({h:m.top&&Math.round(m.top.h),date:m.date,money:m.money,dial:m.dial,speeds:m.speeds,cycle:m.cycle,pill:m.pillOn}));
    // the goal bar at the map's foot, clear of the speed pill
    ok(`layout: at ${w}×${h} the goal bar sits inside the map at its foot${m.pillOn?', clear of the speed pill':''}`,within(m.goal,m.map)&&m.goal.b>=m.map.b-60&&(!m.pill||m.goal.r<=m.pill.x+0.5),JSON.stringify({goal:m.goal,pill:m.pill}));
    if(touch){
      const small=await page.evaluate(()=>[...document.querySelectorAll('button,select,summary,[role=button]')].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect();return [b.textContent.trim().slice(0,24)||b.getAttribute('aria-label'),Math.round(r.width),Math.round(r.height)]}).filter(([,bw,bh])=>bw<44||bh<44));
      ok(`layout: at ${w}×${h} every tap target is at least 44 px`,!small.length,small.slice(0,4).map(s=>`${s[0]} ${s[1]}×${s[2]}`).join(', '));
    }else{
      const small=await page.evaluate(()=>[...document.querySelectorAll('button,select')].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect();return [b.textContent.trim().slice(0,24)||b.getAttribute('aria-label'),Math.round(r.width),Math.round(r.height)]}).filter(([,bw,bh])=>bw<40||bh<40));
      ok(`layout: at ${w}×${h} every control is at least 40 px`,!small.length,small.slice(0,4).map(s=>`${s[0]} ${s[1]}×${s[2]}`).join(', '));
    }
    // three notices at once show one, inside the map, over less than a quarter of it (three refusals through the plan's menu)
    await page.evaluate(()=>{for(const v of ['x1','x2','x3']){const sel=document.querySelector('#plan-bed-1');if(!sel)return;const o=document.createElement('option');o.value=v;sel.appendChild(o);sel.value=v;sel.dispatchEvent(new Event('change',{bubbles:true}))}});
    await page.waitForSelector('.notice',{timeout:4000}).catch(()=>{});
    const n=await box(page,'.notices .notice'),count=await page.evaluate(()=>document.querySelectorAll('.notice').length),waiting=await page.evaluate(()=>document.querySelector('.notice-waiting')?.textContent??'');
    const nshare=m.map&&n?(n.w*n.h)/(m.map.w*m.map.h):1;
    ok(`layout: at ${w}×${h} three notices show one at a time, inside the map, over less than a quarter of it`,count===1&&within(n,m.map)&&nshare<0.25&&/\+[2-9]/.test(waiting),JSON.stringify({count,notice:n,share:+nshare.toFixed(3),waiting}));
    await page.evaluate(()=>document.querySelector('.notice-close')?.click());
    // a touch sheet: its three resting heights, tapped
    if(cls.sheet&&touch){
      ok(`layout: at ${w}×${h} the sheet at rest shows at least 150 px of panel under the top bar, the map and its head`,m.body&&m.body.h>=150,`body ${m.body&&Math.round(m.body.h)} px`);
      // the sheet's height moves in a transition, slow on a software-drawn runner: wait until two reads 300 ms apart agree
      const settled=()=>page.waitForFunction(()=>{const h=Math.round(document.querySelector('.panel').getBoundingClientRect().height);const same=window.__sheetH===h;window.__sheetH=h;return same},null,{polling:300,timeout:6000}).catch(()=>{});
      const tapToggle=async()=>{const t=await box(page,'.sheet-toggle');await page.touchscreen.tap(t.x+t.w/2,t.y+t.h/2);await page.evaluate(()=>{window.__sheetH=-1});await settled()};
      await tapToggle();
      const tall=await measure(page);
      await tapToggle();
      const peek=await measure(page),peekBody=await page.evaluate(()=>getComputedStyle(document.querySelector('.panel-body')).display);
      ok(`layout: at ${w}×${h} the sheet's button opens it tall and then folds it to its head, the map growing`,
        tall.panel.h>m.panel.h+40&&inside(tall.head,w,h)&&peekBody==='none'&&inside(peek.head,w,h)&&inside(peek.panel,w,h)&&peek.map.h>m.map.h+40&&tall.map.h>=160,
        `panel ${Math.round(m.panel.h)}→${Math.round(tall.panel.h)}→${Math.round(peek.panel.h)}, map ${Math.round(m.map.h)}→${Math.round(tall.map.h)}→${Math.round(peek.map.h)}, body ${peekBody}`);
      // a tab tap opens it again
      const tab=await box(page,'#tab-garden');await page.touchscreen.tap(tab.x+tab.w/2,tab.y+tab.h/2);await settle(page);
      const again=await page.evaluate(()=>document.querySelector('.panel').dataset.sheet);
      ok(`layout: at ${w}×${h} a tab tap opens the folded sheet`,again==='half',`sheet ${again}`);
    }
    // a card docks away from its place, and on a phone folds the sheet while it's up
    if((w===390&&h===844)||(w===1440&&h===900)){
      const dockOf=async(bed)=>{
        await page.evaluate(id=>{[...document.querySelectorAll('.place-button')].find(b=>b.textContent===id)?.click()},bed);
        await page.waitForFunction(id=>document.querySelector('.place h3')?.textContent===id,bed,{timeout:4000}).catch(()=>{});
        await page.evaluate(()=>document.querySelector('.place .num')?.click());
        const up=await page.waitForSelector('.card-overlay .explain',{timeout:4000}).then(()=>true,()=>false);await settle(page);
        const dock=await page.evaluate(()=>document.querySelector('.map-over')?.dataset.dock),c=await box(page,'.card-overlay'),mm=await measure(page);
        const body=await page.evaluate(()=>getComputedStyle(document.querySelector('.panel-body')).display);
        const pillOver=!!(mm.pill&&c&&mm.pill.x<c.r&&mm.pill.r>c.x&&mm.pill.y<c.b&&mm.pill.b>c.y);
        await page.keyboard.press('Escape');await settle(page);
        return {up,dock,card:c,map:mm.map,pill:mm.pillOn,pillOver,body,goal:mm.goal};
      };
      const low=await dockOf('Bed 4'),high=await dockOf('Bed 1');
      ok(`layout: at ${w}×${h} a low bed's card docks at the top of the map and a high bed's at its foot, each inside the map with the goal bar gone`,
        low.up&&low.dock==='top'&&within(low.card,low.map)&&low.card.y<=low.map.y+60&&!low.goal&&high.up&&high.dock==='bottom'&&within(high.card,high.map)&&high.card.b>=high.map.b-60,
        JSON.stringify({low:{dock:low.dock,card:low.card,map:low.map,goal:low.goal},high:{dock:high.dock,card:high.card}}));
      if(cls.sheet)ok(`layout: at ${w}×${h} a card folds the sheet to its head while it's up, keeps the speed pill clear of it, and the card's body has room`,
        low.body==='none'&&low.pill&&!low.pillOver&&low.card.h>=200&&high.pill&&!high.pillOver,`body ${low.body}, pill ${low.pill} over ${low.pillOver}/${high.pillOver}, card ${low.card&&Math.round(low.card.h)} px`);
      // fullscreen: the button only where the browser has the API, and there it goes in and out
      const f=await box(page,'.fullscreen');
      if(!m.canFull)ok(`layout: at ${w}×${h} the fullscreen button is hidden where the browser has no Fullscreen API`,!f,JSON.stringify(f));
      else{
        await page.click('.fullscreen');await settle(page);
        const inFull=await page.evaluate(()=>({el:!!document.fullscreenElement,pressed:document.querySelector('.fullscreen')?.getAttribute('aria-pressed')}));
        await page.click('.fullscreen');await settle(page);
        const outFull=await page.evaluate(()=>({el:!!document.fullscreenElement,pressed:document.querySelector('.fullscreen')?.getAttribute('aria-pressed')}));
        const after=await measure(page);
        ok(`layout: at ${w}×${h} the fullscreen button takes the page in and out of fullscreen, and the layout holds`,f&&within(f,m.map)&&inFull.el&&inFull.pressed==='true'&&!outFull.el&&outFull.pressed==='false'&&inside(after.map,w,h)&&inside(after.panel,w,h),JSON.stringify({f,inFull,outFull}));
      }
    }
    await page.screenshot({path:join(out,`layout-${w}x${h}.png`)});
    await ctx.close();
  }

  // safe areas: the page's stylesheet keeps env(safe-area-inset-*) clear on every side
  {const {ctx,page}=await open({width:390,height:844},{touch:true,dsf:3});
    const sides=await page.evaluate(()=>{const css=[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText)}catch{return []}}).join('\n');
      return ['top','right','bottom','left'].filter(k=>css.includes(`safe-area-inset-${k}`))});
    ok('layout: safe areas are kept clear on every side',sides.length===4,sides.join(', '));
    // a tap on the map lands through the layer over it (no badge there): the place under it opens
    await page.waitForSelector('.map[data-renderer]',{timeout:8000}).catch(()=>{});
    const m=await box(page,'.map'),cam=await page.evaluate(()=>window.__sim.view().cam),hit=await page.evaluate(([mx,my])=>document.elementFromPoint(mx,my)?.tagName,[m.x+m.w*0.6,m.y+m.h*0.45]);
    if(cam){const bed=await page.evaluate(()=>window.__sim.snapshot().nodes.find(n=>n.id==='bed-4').box);
      await page.touchscreen.tap(m.x+cam.x+(bed.x+bed.w*0.3)*cam.s,m.y+cam.y+(bed.y+bed.h*0.6)*cam.s);}
    const opened=await page.waitForFunction(()=>document.querySelector('.place h3')?.textContent==='Bed 4',null,{timeout:5000}).then(()=>true,()=>false);
    ok('layout: a tap on the map lands through the layer over it',opened&&hit==='CANVAS',`opened ${opened}, under the point: ${hit}`);
    await ctx.close()}

  // the dark scheme: the tokens change, the page still draws without errors
  {const {ctx,page,errs}=await open({width:390,height:844},{touch:true,dsf:3});
    await page.emulateMedia({colorScheme:'dark'});
    await page.waitForSelector('[data-sim="ready"]',{timeout:8000}).catch(()=>{});
    await settle(page);
    const bg=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
    ok('layout: the dark scheme swaps the colours and draws without errors',bg==='rgb(19, 26, 21)'&&!errs.length,`background ${bg} ${errs[0]||''}`);
    await page.screenshot({path:join(out,'layout-390x844-dark.png')});await ctx.close()}

  // the keyboard alone: tab to the pause button and press it, then to a place and open it
  {const {ctx,page,errs}=await open({width:1440,height:900});
    await page.waitForSelector('[data-sim="ready"]',{timeout:8000}).catch(()=>{});
    const reach=async(test)=>{for(let i=0;i<40;i++){await page.keyboard.press('Tab');if(await page.evaluate(test))return true}return false};
    const toPause=await reach(()=>document.activeElement?.getAttribute('aria-label')==='Pause');
    if(toPause)await page.keyboard.press('Enter');
    // the top bar follows the map's frames, which software WebGL on CI draws a few times a second: wait for it
    const paused=await page.waitForFunction(()=>document.querySelector('.pause')?.getAttribute('aria-pressed')==='true'&&window.__sim.snapshot()?.speed===0,null,{timeout:5000}).then(()=>true,()=>false);
    const toBed=await reach(()=>document.activeElement?.textContent==='Bed 1');
    if(toBed)await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.place h3'),null,{timeout:5000}).catch(()=>{});
    const shown=await page.evaluate(()=>document.querySelector('.place h3')?.textContent);
    const ring=await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle);
    ok('layout: by keyboard alone, pause the clock and open a place, with the focus shown',toPause&&paused&&toBed&&shown==='Bed 1'&&ring!=='none'&&!errs.length,`pause ${toPause}/${paused}, bed ${toBed}, shown ${shown}, outline ${ring} ${errs[0]||''}`);
    await ctx.close()}
}
