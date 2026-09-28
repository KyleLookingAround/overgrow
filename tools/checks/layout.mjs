// The page's shell at every size (320×568, 568×320, 390×844, 844×390, 768×1024, 1440×900): the top bar, the map and
// the panel each inside the viewport, the panel below the map as a sheet on portrait phones and beside it otherwise, no
// overflow, every button at least 40 px on touch, the sheet folding to its heading, the dark scheme, and the top bar
// and panel working by keyboard alone.
import {join} from 'node:path';

const box=(page,sel)=>page.evaluate(s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,r:b.right,b:b.bottom}},sel);
const inside=(b,vw,vh)=>b&&b.w>0&&b.h>0&&b.x>=-0.5&&b.y>=-0.5&&b.r<=vw+0.5&&b.b<=vh+0.5;

export default async function({ok,open,out}){
  const sizes=[[320,568,true],[568,320,true],[390,844,true],[844,390,true],[768,1024,true],[1440,900,false]];
  for(const [w,h,touch] of sizes){
    const {ctx,page,errs}=await open({width:w,height:h},{touch});
    await page.waitForSelector('[data-sim="ready"]',{timeout:8000}).catch(()=>{});
    await page.waitForTimeout(300);
    const [top,map,panel,head]=await Promise.all(['.topbar','.map','.panel','.panel-head'].map(s=>box(page,s)));
    const parts=await page.evaluate(()=>[...document.querySelectorAll('.topbar .date,.topbar .money,.topbar .dial,.topbar .speed')].map(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,r:b.right,b:b.bottom}}));
    const flow=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,sh:document.documentElement.scrollHeight,ch:document.documentElement.clientHeight}));
    const sheet=w<700&&!(h<=500&&w>=500);
    const placed=sheet?panel&&map&&panel.y>=map.b-1&&panel.b<=h+0.5:panel&&map&&panel.x>=map.r-1&&panel.y>=top.b-1;
    const bad=[!inside(top,w,h)&&'the top bar isn\'t in view',parts.length!==7&&`${parts.length} of 7 top-bar parts`,parts.some(p=>!inside(p,w,h))&&'a top-bar part is out of view',
      !inside(map,w,h)&&'the map isn\'t in view',map&&(map.w<150||map.h<120)&&`the map is only ${map&&Math.round(map.w)}×${map&&Math.round(map.h)}`,
      !inside(panel,w,h)&&'the panel isn\'t in view',!inside(head,w,h)&&'the panel\'s heading isn\'t in view',!placed&&(sheet?'the sheet isn\'t below the map':'the panel isn\'t beside the map'),
      map&&top&&map.y<top.b-1&&'the map is under the top bar',flow.sw>flow.cw&&`scroll width ${flow.sw}`,flow.sh>flow.ch&&`scroll height ${flow.sh}`,errs[0]].filter(Boolean);
    ok(`layout: at ${w}×${h} the top bar, map and ${sheet?'sheet below':'panel beside'} are in view, with no overflow or errors`,!bad.length,bad.join('; '));
    if(touch){
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
    const reach=async(test)=>{for(let i=0;i<30;i++){await page.keyboard.press('Tab');if(await page.evaluate(test))return true}return false};
    const toPause=await reach(()=>document.activeElement?.getAttribute('aria-label')==='Pause');
    if(toPause)await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const paused=await page.evaluate(()=>document.querySelector('.pause')?.getAttribute('aria-pressed')==='true'&&window.__sim.snapshot().speed===0);
    const toBed=await reach(()=>document.activeElement?.textContent==='Bed 1');
    if(toBed)await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    const shown=await page.evaluate(()=>document.querySelector('.place h3')?.textContent);
    const ring=await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle);
    ok('layout: by keyboard alone, pause the clock and open a place, with the focus shown',toPause&&paused&&toBed&&shown==='Bed 1'&&ring!=='none'&&!errs.length,`pause ${toPause}/${paused}, bed ${toBed}, shown ${shown}, outline ${ring} ${errs[0]||''}`);
    await ctx.close()}
}
