// Starts the page: the stylesheet, the simulation worker, the save, the clock loop and the UI. A save on the device is
// carried on from; otherwise a new game starts from window.__seed (the checks) or a fresh seed. The game saves every game
// day, after the player changes something, and when the page is hidden or closed. docs/systems/saving.md.
import {render} from 'preact';
import '../ui/styles/tokens.css';
import '../ui/styles/page.css';
import {App} from '../ui/App';
import type {MapRenderer} from '../ui/map/renderer';
import {calendar} from '../sim/clock';
import type {Command} from '../sim/index';
import {freshSeed} from '../sim/random';
import type {Snapshot} from '../sim/state';
import {createLoop} from './clock-loop';
import {connectSim} from './sim-client';
import {readSave, writeSave} from './storage';
import {joinFields, makeLand, splitField, type Land} from '../sim/land';

// The checks set window.__seed so a run repeats, and then get window.__sim (docs/SYSTEMS.md, "The sim in a worker").
declare global {
  interface Window {
    __seed?: number;
    __sim?: unknown;
  }
}

const sim = connectSim();
const loop = createLoop(sim);
let latest: Snapshot | null = null, lastText: string | null = null, savedDay = -1, keep = true;

async function save() {
  if (!keep) return;
  lastText = await sim.save();
  writeSave(lastText);
}
sim.onSnapshot((s) => {
  const day = calendar(s.hours).dayIndex;
  if (latest && day !== savedDay) void save();
  savedDay = day;
  latest = s;
});
const send = async (cmd: Command) => {
  const s = await sim.send(cmd);
  if (cmd.type !== 'tick' && !s.rejected) void save();
  return s;
};
// hidden: save now, while the page can still answer; closed: write the last save we have, which can't wait
document.addEventListener('visibilitychange', () => void (document.visibilityState === 'hidden' && save()));
addEventListener('pagehide', () => void (keep && lastText && writeSave(lastText)));

async function start() {
  const text = readSave();
  if (text) {
    const s = await sim.send({type: 'load', save: text});
    if (!s.rejected) return;
    // a save from a newer version of the game is left alone rather than overwritten; anything else unreadable is replaced
    if (/newer version/.test(s.rejected)) keep = false;
    console.warn('Overgrow: ' + s.rejected);
  }
  // a new game opens paused on the first plan's card, which starts the clock (the founding spec, "The first minute")
  await sim.send({type: 'new-game', seed: window.__seed ?? freshSeed(), speed: 0});
}
void start().then(save);

let renderer: MapRenderer | null = null;
// the check-only land scene (docs/briefs/organic-land.md): the land shown, and its day of the year
let land: Land | null = null, landDay = 1;
if (window.__seed !== undefined)
  window.__sim = {
    send,
    snapshot: () => latest,
    save: () => sim.save(),
    view: () => {
      const v = loop.view(), st = renderer?.stats();
      return {
        hours: v?.hours ?? null, alpha: v?.alpha ?? null, prev: v?.prev.hours ?? null, cur: v?.cur.hours ?? null, renderer: renderer?.kind ?? null,
        frames: st?.frames ?? [], movers: st?.movers ?? [], stepping: st?.stepping ?? 0, cam: st?.cam ?? null, weather: st?.weather ?? null, crops: st?.crops ?? null, shapes: st?.shapes ?? null,
        gardener: st?.gardener ?? null, life: st?.life ?? null, creatures: st?.creatures ?? [], torch: st?.torch ?? false, pulse: st?.pulse ?? null, quiet: v?.quiet ?? false, night: st?.night ?? null, trace: st?.trace ?? false, dive: st?.dive ?? null,
        skip: v?.skip ?? false, day: v?.day ?? null, zoomed: st?.zoomed ?? null, inner: st?.inner ?? 0, detailed: st?.detailed ?? [], detailMs: st?.detailMs ?? [], landMs: st?.landMs ?? [], landDrawn: st?.landDrawn ?? 0,
      };
    },
    bench: (n: number, m?: number, speed?: number) => loop.bench(n, m, speed),
    // the checks' fast clock: k times the zoom's pace, never a player's control (1 to stop)
    clock: (k: number) => loop.checkClock(k),
    // the camera, as the + and − buttons and the breadcrumb move it: fly to a place (or out, null), or zoom about a point
    fly: (id: string | null) => renderer?.flyTo(id),
    zoomBy: (factor: number, x: number, y: number) => renderer?.zoomBy(factor, x, y),
    // the land as organic parcels, shown in place of the level: a seed's smallholding on a day of the year (null returns
    // to the game), a join or a split of its fields (the new land's fields, or why not), and the land as it stands
    land: (seed: number | null, day = 1) => {
      land = seed === null ? null : makeLand(seed);
      landDay = day;
      renderer?.setLand(land && {land, day});
      return land?.fields ?? null;
    },
    landDay: (day: number) => {
      landDay = day;
      renderer?.setLand(land && {land, day});
    },
    landJoin: (a: string, b: string) => {
      const r = land ? joinFields(land, a, b, landDay) : 'no land';
      if (typeof r === 'string') return r;
      land = r;
      renderer?.setLand({land, day: landDay});
      return r.fields;
    },
    landSplit: (id: string, n: number, angle: number) => {
      const r = land ? splitField(land, id, n, angle, landDay) : 'no land';
      if (typeof r === 'string') return r;
      land = r;
      renderer?.setLand({land, day: landDay});
      return r.fields;
    },
    landNow: () => land,
    copyTimes: () => sim.copyTimes(),
  };

render(<App sim={{...sim, send}} loop={loop} onRenderer={(r) => void (renderer = r)} />, document.getElementById('app')!);
