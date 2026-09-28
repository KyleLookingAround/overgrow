// The browser checks on the built page (dist/), run with: npm run check, or node tools/check.mjs <group>
// (npm run check also builds, typechecks and runs the Vitest tests on the sim first).
// Each file in tools/checks/ is a group named after it: it exports a default async function that gets the helpers below
// and reports through ok(name, pass, info), and its opening comment says what it covers (docs/SYSTEMS.md lists them all,
// joined from those comments). Add a group by adding a file; nothing here lists them. A group that needs no browser
// (brief, graph, rules) just doesn't call open().
// dist/ is served over HTTP from here, since a module script or a worker won't load from file://. Every page gets the
// seed in window.__seed, so a failure repeats. Exit code 1 if anything fails. Screenshots of failures go to build/check/.
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {existsSync,mkdirSync,readdirSync,readFileSync} from 'node:fs';
import {dirname,extname,join,normalize} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..'),dist=join(root,'dist'),out=join(root,'build/check');
mkdirSync(out,{recursive:true});
const only=process.argv[2];
const SAVE_KEY='overgrow-save-v1'; // the one localStorage key the game saves to (the project notes)
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.map':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer((req,res)=>{const p=join(dist,normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^\/+/,'')||'index.html');
  if(!p.startsWith(dist)||!existsSync(p)){res.writeHead(404);res.end();return}
  res.writeHead(200,{'content-type':TYPES[extname(p)]||'application/octet-stream'});res.end(readFileSync(p))});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/`;
const exe=process.env.CHROMIUM_PATH;
let browser=null;const getBrowser=async()=>browser||(browser=await chromium.launch(exe?{executablePath:exe}:{}));
const results=[];const ok=(name,pass,info)=>{results.push([name,!!pass]);console.log(`${pass?'PASS':'FAIL'}  ${name}${info?'  '+info:''}`)};
const ignorable=m=>/fonts\.(googleapis|gstatic)|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|net::/.test(m);

// open the built page at a viewport. seed: the game's random seed; save: a save's JSON text, put in localStorage before
// the page loads; touch: a phone (touch, mobile, 2x)
async function open(vp={width:1280,height:800},{save=null,touch=false,seed=1}={}){
  const b=await getBrowser();
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:touch?2:1,hasTouch:touch,isMobile:touch});
  await ctx.addInitScript(seed=>{window.__seed=seed},seed);
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
server.close();
const failed=results.filter(r=>!r[1]).length;
console.log(`\n${results.length-failed}/${results.length} passed`);
process.exit(failed?1:0);
