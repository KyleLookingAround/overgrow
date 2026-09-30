// Renders the manifest's PNG icons from public/icon.svg with Chromium (run after changing the icon): node tools/icons.mjs
import {chromium} from 'playwright';
import {readFileSync,writeFileSync} from 'node:fs';
const svg=readFileSync('public/icon.svg','utf8');
const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
const page=await browser.newPage();
// the maskable icon keeps its art inside the safe zone (80 % of the square) on the lawn's green, with no rounded corners
for(const [name,size,maskable] of [['icon-192',192,false],['icon-512',512,false],['icon-maskable-512',512,true],['apple-touch-icon',180,true]]){
  await page.setViewportSize({width:size,height:size});
  const inner=maskable?svg.replace(/rx="96"/,'rx="0"').replace('<svg ','<svg style="transform:scale(0.8);transform-origin:center" '):svg;
  await page.setContent(`<style>html,body{margin:0;background:${maskable?'#8fbf72':'transparent'}}svg{display:block;width:${size}px;height:${size}px}</style>${inner}`);
  writeFileSync(`public/${name}.png`,await page.screenshot({omitBackground:!maskable,type:'png'}));
  console.log(name,size);
}
await browser.close();
