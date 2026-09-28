// Quick regression checks for build/test.html. Run with: npm run check, or npm run check -- <group>
// Each file in tools/checks/ is a group named after it: it exports a default async function that gets the helpers below
// and reports through ok(name, pass, info), and its opening comment says what it covers (docs/SYSTEMS.md lists them all,
// joined from those comments). Add a group by adding a file; nothing here lists them.
// Every page is seeded (window.__seed), so a failure repeats when you run it again.
// Exit code 1 if anything fails. Screenshots of failures go to build/check/.
import {chromium} from 'playwright';
import {mkdirSync,readdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..'),url=pathToFileURL(join(root,'build/test.html')).href,out=join(root,'build/check');
mkdirSync(out,{recursive:true});
const only=process.argv[2];
const SAVE_KEY='overgrow-save-v1'; // the one localStorage key the game saves to (the project notes, "Rules every change keeps")
const exe=process.env.CHROMIUM_PATH;
let browser=null;const getBrowser=async()=>browser||(browser=await chromium.launch(exe?{executablePath:exe}:{}));
const results=[];const ok=(name,pass,info)=>{results.push([name,!!pass]);console.log(`${pass?'PASS':'FAIL'}  ${name}${info?'  '+info:''}`)};
const ignorable=m=>/fonts\.(googleapis|gstatic)|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|net::/.test(m);

// open build/test.html at a viewport. seed: the game's random seed; still: no frame loop, so only the check moves the
// game on; save: a save's JSON text, put in localStorage before the page loads; touch: a phone (touch, mobile, 2x)
async function open(vp={width:1280,height:800},{save=null,touch=false,seed=1,still=false}={}){
  const b=await getBrowser();
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:touch?2:1,hasTouch:touch,isMobile:touch});
  await ctx.addInitScript(([seed,still])=>{window.__seed=seed;if(still)window.requestAnimationFrame=()=>0},[seed,still]);
  if(save)await ctx.addInitScript(([k,s])=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem(k,s);sessionStorage.setItem('seeded','1')}},[SAVE_KEY,save]);
  const page=await ctx.newPage();const errs=[];
  page.on('pageerror',e=>errs.push(e.message));page.on('console',c=>{if(c.type()==='error'&&!ignorable(c.text()))errs.push(c.text())});
  await page.goto(url);await page.waitForTimeout(300);
  return {ctx,page,errs};
}

// the groups, one file each in tools/checks/, in file-name order
const groups=readdirSync(join(root,'tools/checks')).filter(f=>f.endsWith('.mjs')).sort().map(f=>f.slice(0,-4));
if(only&&!groups.includes(only)){console.log(`no check group "${only}"; the groups are ${groups.join(', ')}`);process.exit(1)}
// a group that throws reports one line for the whole group
for(const g of groups)if(!only||only===g)
  try{await (await import(pathToFileURL(join(root,'tools/checks',g+'.mjs')).href)).default({open,ok,root,out,url,SAVE_KEY,get browser(){return getBrowser()}})}
  catch(e){const msg=String(e&&e.message||e).split('\n')[0].slice(0,200);ok(`${g}: *`,false,'the group stopped: '+msg)}
if(browser)await browser.close();
const failed=results.filter(r=>!r[1]).length;
console.log(`\n${results.length-failed}/${results.length} passed`);
process.exit(failed?1:0);
