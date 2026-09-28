// The game's source files and how they join into one script. Used by build.mjs, where.mjs and the build check.
// src/game/*.js are joined in file-name order inside one strict IIFE, so they share one scope:
// each file can use anything any other file declares at the top level.
import {readFileSync,readdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

export const root=join(dirname(fileURLToPath(import.meta.url)),'..');
export const OPEN="(()=>{\n'use strict';\n",CLOSE='})();\n';
export const HEAD='<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n';

export const shell=()=>readFileSync(join(root,'src/shell.html'),'utf8');
export const parts=()=>readdirSync(join(root,'src/game')).filter(f=>f.endsWith('.js')).sort()
  .map(file=>({file:'src/game/'+file,text:readFileSync(join(root,'src/game',file),'utf8')}));
export const joinGame=ps=>OPEN+ps.map(p=>p.text).join('')+CLOSE;
export const page=(sh,js)=>HEAD+sh.replace('/*GAME*/',()=>js);

// Runs must repeat from a seed: anything that can change the game takes its randomness from rnd() (00-random.js).
// Math.random() is allowed only on a line ending with // cosmetic (sound, drawing). Returns "file:line" for each slip.
export function randomSlips(ps){
  const out=[];
  for(const p of ps){if(p.file==='src/game/00-random.js')continue;
    p.text.split('\n').forEach((l,i)=>{if(/Math\.random\(/.test(l)&&!/\/\/ cosmetic$/.test(l))out.push(`${p.file}:${i+1}`)})}
  return out;
}

// Turns a line number in the joined script, or in the built page, into src/game/<file>:<line>.
const lineCount=s=>s.split('\n').length-1;
export function locate(ps,line){
  let at=lineCount(OPEN);
  if(line<=at)return {file:'(opening wrapper)',line};
  for(const p of ps){const n=lineCount(p.text);if(line<=at+n)return {file:p.file,line:line-at};at+=n}
  return {file:'(closing wrapper)',line:line-at};
}
export function locatePage(sh,ps,line){
  const before=lineCount(HEAD+sh.slice(0,sh.indexOf('/*GAME*/')));
  if(line<=lineCount(HEAD))return {file:'(page head, tools/sources.mjs)',line};
  return line<=before?{file:'src/shell.html',line:line-lineCount(HEAD)}:locate(ps,line-before);
}
