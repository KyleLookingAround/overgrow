// The page's shell at every size (320×568, 568×320, 390×844, 844×390, 768×1024, 1440×900): the top bar, the map and
// the panel each inside the viewport, the panel below the map as a sheet on portrait phones and beside it otherwise, no
// overflow, the panel's tab strip fitting its row with the sheet's toggle, every button and menu at least 40 px on
// touch, the sheet still showing a useful panel under the fixed chrome, the sheet folding to its heading, the dark
// scheme, and the top bar and panel working by keyboard alone. The top bar as a row (the owner's wins W2 and W11): one
// row where it's 640 px or wider inside its padding, with pause and every speed (4×, 8× and 16× sharing one button below 960 px), and below that at most two rows with the speeds folded into one
// button that cycles them, tapped on a touch page; safe areas kept clear on every side; and a tap on the map landing
// through the layer over it (W12). Notices (the playable garden) never bury a phone's map: three at once show one, in a
// line, over less than a quarter of the map at 390×844 and 320×568. Each page answers the first plan's card and shows every detail, the fullest the
// chrome gets (src/data/unfold.ts).
import {join} from 'node:path';

const box=(page,sel)=>page.evaluate(s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,r:b.right,b:b.bottom}},sel);
const inside=(b,vw,vh)=>b&&b.w>0&&b.h>0&&b.x>=-0.5&&b.y>=-0.5&&b.r<=vw+0.5&&b.b<=vh+0.5;

export default async function({ok,open:bare,out}){
  // each page with the first plan's card answered and every detail showing: the fullest the chrome gets
  const open=async(...a)=>{const r=await bare(...a);await r.page.waitForSelector('[data-sim="ready"]',{timeout:8000}).catch(()=>{});
    await r.page.evaluate(async()=>{await window.__sim.send({type:'card',id:'first-plan',answer:'accept'});await window.__sim.send({type:'setting',key:'details',value:true})});
    await r.page.waitForFunction(()=>document.querySelectorAll('.tab').length===3,null,{timeout:5000}).catch(()=>{});return r};
  const sizes=[[320,568,true],[568,320,true],[390,844,true],[844,390,true],[768,1024,true],[1440,900,false]];
  for(const [w,h,touch] of sizes){
    const {ctx,page,errs}=await open({width:w,height:h},{touch});
    await page.waitForSelector('[data-sim="ready"]',{timeout:8000}).catch(()=>{});
    await page.waitForTimeout(300);
    const [top,map,panel,head]=await Promise.all(['.topbar','.map','.panel','.panel-head'].map(s=>box(page,s)));
    const parts=await page.evaluate(()=>[...document.querySelectorAll('.topbar .level,.topbar .date,.topbar .money,.topbar .dial,.topbar .speed,.topbar .speed-cycle')].filter(e=>e.getClientRects().length).map(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,r:b.right,b:b.bottom}}));
    const bar=await page.evaluate(()=>{const t=document.querySelector('.topbar');if(!t)return 0;const cs=getComputedStyle(t);return Math.round(t.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight))});
    const folded=bar<640,mid=!folded&&bar<960,want=folded?5:mid?8:10;
    const flow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,sh:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight}));
    const sheet=w<700&&!(h<=500&&w>=500);
    const placed=sheet?panel&&map&&panel.y>=map.b-1&&panel.b<=h+0.5:panel&&map&&panel.x>=map.r-1&&panel.y>=top.b-1;
    const bad=[!inside(top,w,h)&&'the top bar isn\'t in view',parts.length!==want&&`${parts.length} of ${want} top-bar parts`,parts.some(p=>!inside(p,w,h))&&'a top-bar part is out of view',
      !inside(map,w,h)&&'the map isn\'t in view',map&&(map.w<150||map.h<120)&&`the map is only ${map&&Math.round(map.w)}×${map&&Math.round(map.h)}`,
      !inside(panel,w,h)&&'the panel isn\'t in view',!inside(head,w,h)&&'the panel\'s heading isn\'t in view',!placed&&(sheet?'the sheet isn\'t below the map':'the panel isn\'t beside the map'),
      map&&top&&map.y<top.b-1&&'the map is under the top bar',flow.sw>flow.cw&&`scroll width ${flow.sw}`,flow.sh>flow.ch&&`scroll height ${flow.sh}`,errs[0]].filter(Boolean);
    ok(`layout: at ${w}×${h} the top bar, map and ${sheet?'sheet below':'panel beside'} are in view, with no overflow or errors`,!bad.length,bad.join('; '));
    // the row, not only each control: the parts' rows counted by where they sit, and the speeds folded below 640 px
    const rows=parts.length?[...new Set(parts.map(p=>Math.round((p.y+p.h/2)/12)))].length:0;
    const fold=await page.evaluate(()=>({four:[...document.querySelectorAll('.topbar .speed')].filter(e=>e.getClientRects().length).length,one:!!document.querySelector('.topbar .speed-cycle')?.getClientRects().length}));
    ok(`layout: at ${w}×${h} the top bar (${bar} px) is ${folded?'at most two rows, its speeds folded into one button':`one row with pause and ${mid?'its speeds, 4×, 8× and 16× sharing a button':'every speed'}`}`,
      folded?rows<=2&&fold.one&&fold.four===0:rows===1&&!fold.one&&fold.four===(mid?4:6),`${rows} rows, ${fold.four} speeds, cycle ${fold.one}`);
    if(folded&&touch){
      // the folded button cycles every speed: 1× → 2× → 4× → 8× → 16× → pause → 1×
      const seen=[await page.evaluate(()=>window.__sim.snapshot()?.speed)];
      for(let i=0;i<6;i++){
        // measured each time: the button widens at 16×, and it sits at the bar's right end
        const c=await box(page,'.topbar .speed-cycle');
        await page.touchscreen.tap(c.x+c.w/2,c.y+c.h/2);
        await page.waitForFunction(b=>{const s=window.__sim.snapshot()?.speed;return s!==undefined&&s!==b},seen[seen.length-1],{timeout:5000}).catch(()=>{});
        seen.push(await page.evaluate(()=>window.__sim.snapshot()?.speed));
      }
      ok(`layout: at ${w}×${h} a tap on the folded speed button cycles every speed`,seen.join()==='1,2,4,8,16,0,1',seen.join(' → '));
    }
    if(mid){
      // a bar a little narrow: 4×, 8× and 16× fold into one button that cycles them
      const seen=[];
      for(let i=0;i<3;i++){await page.click('.topbar .speed-fast');await page.waitForTimeout(400);seen.push(await page.evaluate(()=>window.__sim.snapshot()?.speed))}
      await page.click('.topbar .speed[aria-label="Speed 1×"]');await page.waitForTimeout(300);
      ok(`layout: at ${w}×${h} 4×, 8× and 16× share one button that cycles them`,seen.join()==='4,8,16',seen.join(' → '));
    }
    // the tab strip and the sheet's toggle share the panel's head: both inside it, side by side, with nothing overflowing
    const strip=await page.evaluate(()=>{const h=document.querySelector('.panel-head'),t=document.querySelector('.tabs'),g=document.querySelector('.sheet-toggle');
      if(!h||!t)return null;const hb=h.getBoundingClientRect(),tb=t.getBoundingClientRect(),gb=g?.offsetParent?g.getBoundingClientRect():null;
      return {over:h.scrollWidth-h.clientWidth,inside:tb.left>=hb.left-0.5&&tb.right<=hb.right+0.5,clear:!gb||gb.left>=tb.right,w:Math.round(tb.width),head:Math.round(hb.width),tabs:t.children.length}});
    ok(`layout: at ${w}×${h} the panel's tab strip fits its row`,strip&&strip.tabs>=2&&strip.over<=0&&strip.inside&&strip.clear,JSON.stringify(strip));
    if(sheet){
      const body=await box(page,'.panel-body');
      ok(`layout: at ${w}×${h} the sheet shows at least 150 px of panel under the top bar, the map and its head`,body&&body.h>=150,`body ${body&&Math.round(body.h)} px`);
    }
    if(touch){
      const menus=await page.evaluate(()=>[...document.querySelectorAll('select')].filter(s=>s.offsetParent).map(s=>{const r=s.getBoundingClientRect();return [s.id||s.getAttribute('aria-label'),r.width,r.height]}).filter(([,sw,sh])=>sh<40));
      ok(`layout: at ${w}×${h} every menu is at least 40 px tall`,!menus.length,menus.slice(0,3).map(s=>`${s[0]} ${Math.round(s[1])}×${Math.round(s[2])}`).join(', '));
      const small=await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>{const r=b.getBoundingClientRect();return [b.textContent.trim()||b.getAttribute('aria-label'),r.width,r.height]}).filter(([,bw,bh])=>bw<40||bh<40));
      ok(`layout: at ${w}×${h} every button is at least 40 px`,!small.length,small.slice(0,3).map(s=>`${s[0]} ${Math.round(s[1])}×${Math.round(s[2])}`).join(', '));
    }
    if(sheet){
      await page.click('.sheet-toggle');await page.waitForTimeout(100);
      const [p2,m2,h2]=await Promise.all(['.panel','.map','.panel-head'].map(s=>box(page,s)));
      const body=await page.evaluate(()=>getComputedStyle(document.querySelector('.panel-body')).display);
      ok(`layout: at ${w}×${h} the sheet folds to its heading and the map grows`,body==='none'&&inside(h2,w,h)&&inside(p2,w,h)&&m2.h>map.h+20,`body ${body}, map ${Math.round(map.h)}→${Math.round(m2.h)}`);
    }
    await page.screenshot({path:join(out,`layout-${w}x${h}.png`)});
    await ctx.close();
  }

  // safe areas: the page's stylesheet keeps env(safe-area-inset-*) clear on every side
  {const {ctx,page}=await open({width:390,height:844},{touch:true});
    const sides=await page.evaluate(()=>{const css=[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText)}catch{return []}}).join('\n');
      return ['top','right','bottom','left'].filter(k=>css.includes(`safe-area-inset-${k}`))});
    ok('layout: safe areas are kept clear on every side',sides.length===4,sides.join(', '));
    // a tap on the map lands through the layer over it (no badge there): the place under it opens
    await page.waitForSelector('.map[data-renderer]',{timeout:8000}).catch(()=>{});
    const m=await box(page,'.map'),cam=await page.evaluate(()=>window.__sim.view().cam),hit=await page.evaluate(([mx,my])=>document.elementFromPoint(mx,my)?.tagName,[m.x+m.w*0.2,m.y+m.h*0.8]);
    if(cam){const bed=await page.evaluate(()=>window.__sim.snapshot().nodes.find(n=>n.id==='bed-4').box);
      await page.touchscreen.tap(m.x+cam.x+(bed.x+bed.w*0.3)*cam.s,m.y+cam.y+(bed.y+bed.h*0.6)*cam.s);}
    const opened=await page.waitForFunction(()=>document.querySelector('.place h3')?.textContent==='Bed 4',null,{timeout:5000}).then(()=>true,()=>false);
    ok('layout: a tap on the map lands through the layer over it',opened&&hit==='CANVAS',`opened ${opened}, under the point: ${hit}`);
    await ctx.close()}

  // the dark scheme: the tokens change, the page still draws without errors
  {const {ctx,page,errs}=await open({width:390,height:844},{touch:true});
    await page.emulateMedia({colorScheme:'dark'});
    await page.waitForSelector('[data-sim="ready"]',{timeout:8000}).catch(()=>{});
    await page.waitForTimeout(200);
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
  // notices on a phone: one at a time, one line, never most of the map
  for(const [w,h] of [[390,844],[320,568]]){const {ctx,page,errs}=await open({width:w,height:h},{touch:true});
    // the page makes a notice from a refusal the panel sent: three through the plan's select
    await page.evaluate(()=>{for(const v of ['x1','x2','x3']){const sel=document.querySelector('#plan-bed-1');if(!sel)return;const o=document.createElement('option');o.value=v;sel.appendChild(o);sel.value=v;sel.dispatchEvent(new Event('change',{bubbles:true}))}});
    await page.waitForSelector('.notice',{timeout:4000}).catch(()=>{});
    const m=await box(page,'.map'),n=await box(page,'.notices'),count=await page.evaluate(()=>document.querySelectorAll('.notice').length),waiting=await page.evaluate(()=>document.querySelector('.notice-waiting')?.textContent??'');
    const share=m&&n?(n.w*n.h)/(m.w*m.h):1;
    ok(`layout: at ${w}×${h} three notices show one at a time, in a line, over less than a quarter of the map`,count===1&&share<0.25&&/\+[2-9]/.test(waiting)&&!errs.length,JSON.stringify({count,share:+share.toFixed(3),waiting,errs}));
    await ctx.close()}
}