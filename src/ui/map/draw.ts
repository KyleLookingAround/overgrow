// How each kind of node is drawn, in the owner's pick of art style (docs/specs/overgrow/art-styles.html, style A):
// flat, top-down and soft, rounded shapes with no outlines and soft shadows, in greens, soil browns and cream. Shapes
// are drawn in CSS pixels through the camera, so they stay crisp at any zoom. Colours come from the tokens (palette.ts).
// The weather and the soil are drawn from the snapshot's day of weather and each bed's water, never announced; the crops
// from each bed's crop (its stage, its water stress, frost, the leaves pests have nibbled and blight has browned) and the
// produce waiting on it; flowers in bloom and a border of them along a bed's edge; and what the gardener carries from
// their activity.
import {allotmentKey, drawAllotmentNode} from './allotment';
import type {Graphics} from 'pixi.js';
import {START} from '../../data/ladder';
import {calendar} from '../../sim/clock';
import type {CropId} from '../../data/crops';
import type {Box, GraphNode} from '../../sim/graph';
import {cropOf, foodKey, progress, specOf, stageOf, type Stage} from '../../sim/models/crops';
import {borderOf, inFlower} from '../../sim/models/biodiversity';
import {pestsOf} from '../../sim/models/pests';
import {limitsOf} from '../../sim/models/soil';
import {hourOf, type WeatherDay, type WeatherHour} from '../../sim/models/weather';
import type {Snapshot} from '../../sim/state';
import type {View} from '../../app/clock-loop';
import type {Palette, Paint} from './palette';

/** Metres to CSS pixels: x = cam.x + metres × cam.s. */
export interface Camera {
  x: number;
  y: number;
  s: number;
}

/** Fits every drawn node on the canvas with a margin, centred. */
export function camera(nodes: readonly GraphNode[], w: number, h: number): Camera {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes) {
    const b = n.box!;
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w);
    y1 = Math.max(y1, b.y + b.h);
  }
  if (!Number.isFinite(x0)) return {x: 0, y: 0, s: 1};
  const bw = x1 - x0, bh = y1 - y0, margin = Math.min(w, h) * 0.04;
  const s = Math.max(0.01, Math.min((w - 2 * margin) / bw, (h - 2 * margin) / bh));
  return {x: (w - bw * s) / 2 - x0 * s, y: (h - bh * s) / 2 - y0 * s, s};
}

/** A bed plot is dug once most of it is cropland rather than grass (the panel and the map agree on this). */
export const isDug = (n: GraphNode) => {
  const crops = n.stocks['land.crops']?.amount ?? 0;
  return crops > 0 && crops >= (n.stocks['land.grass']?.amount ?? 0);
};

/** What the ground's drawing depends on besides the graph's rev: which bed plots are dug. */
export function groundKey(nodes: readonly GraphNode[]): string {
  let k = '';
  for (const n of nodes) if (n.kind === 'bed') k += isDug(n) ? '1' : '0';
  return k + allotmentKey(nodes);
}

const px = (b: Box, c: Camera) => ({x: c.x + b.x * c.s, y: c.y + b.y * c.s, w: b.w * c.s, h: b.h * c.s});

/** A soft shadow, offset down and to the right, then the shape. */
function soft(g: Graphics, r: {x: number; y: number; w: number; h: number}, radius: number, c: Camera, pal: Palette) {
  g.roundRect(r.x + 0.06 * c.s, r.y + 0.09 * c.s, r.w, r.h, radius).fill(pal.shadow);
}

/** A dashed line inside a box, the mark of a bed plot not yet dug. */
function dashes(g: Graphics, r: {x: number; y: number; w: number; h: number}, c: Camera, pal: Palette) {
  const inset = 0.05 * c.s, dash = 0.15 * c.s, gap = 0.125 * c.s, t = Math.max(1, 0.04 * c.s);
  const x0 = r.x + inset, y0 = r.y + inset, x1 = r.x + r.w - inset, y1 = r.y + r.h - inset;
  for (let x = x0 + dash / 2; x + dash <= x1; x += dash + gap) {
    g.rect(x, y0, dash, t);
    g.rect(x, y1 - t, dash, t);
  }
  for (let y = y0 + dash / 2; y + dash <= y1; y += dash + gap) {
    g.rect(x0, y, t, dash);
    g.rect(x1 - t, y, t, dash);
  }
  g.fill(pal['plot-line']);
}

export function drawNode(g: Graphics, n: GraphNode, c: Camera, pal: Palette) {
  if (drawAllotmentNode(g, n, c, pal)) return;
  const r = px(n.box!, c), round = 0.175 * c.s;
  switch (n.kind) {
    case 'lawn':
      g.rect(r.x, r.y, r.w, r.h).fill(pal.lawn);
      return;
    case 'kitchen': {
      const edge = 0.075 * c.s;
      g.rect(r.x, r.y, r.w, r.h - edge).fill(pal.house);
      g.rect(r.x, r.y + r.h - edge, r.w, edge).fill(pal['house-edge']);
      return;
    }
    case 'path':
      g.roundRect(r.x, r.y, r.w, r.h, 0.2 * c.s).fill(pal.path);
      return;
    case 'bed': {
      const dug = isDug(n);
      soft(g, r, round, c, pal);
      g.roundRect(r.x, r.y, r.w, r.h, round).fill(dug ? pal['bed-dug'] : pal['bed-grass']);
      if (!dug) dashes(g, r, c, pal);
      return;
    }
    case 'shed':
      g.roundRect(r.x + 0.075 * c.s, r.y + 0.1 * c.s, r.w, r.h, 0.15 * c.s).fill(pal['shadow-deep']);
      g.roundRect(r.x, r.y, r.w, r.h, 0.15 * c.s).fill(pal.shed);
      g.roundRect(r.x, r.y, r.w, r.h / 2, 0.15 * c.s).fill(pal['shed-roof']);
      return;
    case 'butt':
      g.circle(r.x + r.w / 2 + 0.05 * c.s, r.y + r.h / 2 + 0.07 * c.s, r.w / 2).fill(pal.shadow);
      g.circle(r.x + r.w / 2, r.y + r.h / 2, r.w / 2).fill(pal.butt);
      return; // the water in it is live: drawLive
    case 'tap':
      g.roundRect(r.x + r.w * 0.3, r.y, r.w * 0.4, r.h, r.w * 0.1).fill(pal.tap);
      g.circle(r.x + r.w / 2, r.y + r.h * 0.3, r.w / 2).fill(pal.tap);
      return;
    case 'heap': {
      const inset = 0.15 * c.s;
      g.roundRect(r.x, r.y, r.w, r.h, 0.15 * c.s).fill(pal['heap-rim']);
      g.roundRect(r.x + inset, r.y + inset, r.w - 2 * inset, r.h - 2 * inset, 0.125 * c.s).fill(pal.heap);
      return;
    }
    case 'gate': {
      // the honesty box on its post, by the side gate
      g.roundRect(r.x + 0.04 * c.s, r.y + 0.06 * c.s, r.w, r.h, 0.06 * c.s).fill(pal.shadow);
      g.roundRect(r.x, r.y, r.w, r.h, 0.06 * c.s).fill(pal.gate);
      g.roundRect(r.x + r.w * 0.25, r.y + r.h * 0.4, r.w * 0.5, r.h * 0.14, 0.02 * c.s).fill(pal['gate-slot']);
      return;
    }
    case 'hens': {
      // the run, and the house at its left end with its roof
      soft(g, r, round, c, pal);
      g.roundRect(r.x, r.y, r.w, r.h, round).fill(pal.run);
      const house = {x: r.x + 0.1 * c.s, y: r.y + 0.15 * c.s, w: 1.1 * c.s, h: r.h - 0.3 * c.s};
      g.roundRect(house.x, house.y, house.w, house.h, 0.1 * c.s).fill(pal['hen-house']);
      g.roundRect(house.x, house.y, house.w, house.h / 2, 0.1 * c.s).fill(pal['shed-roof']);
      return;
    }
    case 'fruit':
      soft(g, r, round, c, pal);
      g.roundRect(r.x, r.y, r.w, r.h, round).fill(pal['bed-dug']);
      return;
    case 'bench':
      g.rect(r.x, r.y, r.w, r.h).fill(pal['bed-dug']);
      return;
    default:
      soft(g, r, round, c, pal);
      g.roundRect(r.x, r.y, r.w, r.h, round).fill(pal.shed);
  }
}

// the nodes the weather is drawn from, looked up once per snapshot rather than every frame
const found = new WeakMap<GraphNode[], {air: GraphNode | null; lawn: GraphNode | null; dug: GraphNode[]; butts: GraphNode[]}>();
function lookup(s: Snapshot) {
  let f = found.get(s.nodes);
  if (!f) {
    f = {air: null, lawn: null, dug: [], butts: []};
    for (const n of s.nodes) {
      if (n.kind === 'atmosphere') f.air = n;
      else if (n.kind === 'lawn') f.lawn = n;
      else if (n.kind === 'butt' && n.box) f.butts.push(n);
      else if (n.kind === 'bed' && n.box && isDug(n)) f.dug.push(n);
    }
    found.set(s.nodes, f);
  }
  return f;
}
/** The day of weather a snapshot carries on its air node, or null. */
const dayOf = (s: Snapshot) => (lookup(s).air?.levers.weather as unknown as WeatherDay | null | undefined) ?? null;

/** The weather at the view time, from whichever of the two snapshots holds that day, and the hour of the day. */
export function weatherAt(v: View): {day: WeatherDay; hour: WeatherHour; t: number} | null {
  const d = calendar(v.hours), t = (((v.hours + START.hour) % 24) + 24) % 24, day = [dayOf(v.cur), dayOf(v.prev)].find((w) => w?.day === d.dayIndex);
  return day ? {day, hour: hourOf(day, t), t} : null;
}

const mix = (a: Paint, b: Paint, k: number): number => {
  const ch = (x: number, s: number) => (x >> s) & 255, t = Math.min(1, Math.max(0, k));
  let out = 0;
  for (const s of [16, 8, 0]) out |= Math.round(ch(a.color, s) + (ch(b.color, s) - ch(a.color, s)) * t) << s;
  return out;
};

/**
 * A dug bed's soil colour by its water: what you see is the surface, so it pales from the dug colour towards dry as the
 * surface's evaporable water goes (FAO-56's TEW: bare soil dries at the top long before the roots' water runs out), and
 * darkens towards wet above field capacity, fully once there's a surface's worth (REW) more than it holds. -1 is a dry
 * crust, 0 moist, 1 soaked.
 */
export function wetness(n: GraphNode): number {
  const lim = limitsOf(n), w = n.stocks.water?.amount ?? 0;
  if (w <= lim.fc) return -Math.min(1, Math.max(0, (lim.fc - w) / Math.max(1e-9, lim.tew)));
  return Math.min(1, (w - lim.fc) / Math.max(1e-9, lim.rew)); // a surface's worth of water standing in it: soaked
}
/** How wet the surface is from the rain itself, 0–1: darkening as it falls, harder the heavier, and drying over three
 *  hours after the spell. */
export function surfaceWet(w: {day: WeatherDay; t: number} | null): number {
  if (!w || !w.day.rainHours) return 0;
  const since = w.t - w.day.rainFrom, rate = Math.min(1, 0.5 + w.day.rain / w.day.rainHours / 4);
  if (since < 0) return 0;
  if (since < w.day.rainHours) return rate * Math.min(1, since / 0.5 + 0.2);
  return rate * Math.max(0, 1 - (since - w.day.rainHours) / 3);
}
export const soilColour = (wet: number, pal: Palette) => (wet < 0 ? mix(pal['bed-dug'], pal['bed-dry'], -wet) : mix(pal['bed-dug'], pal['bed-wet'], wet));

/** How a crop sits in a 2 × 1.5 m bed: rows by plants in a row. */
const GRID: Record<CropId, [number, number]> = {
  salad: [4, 9], radish: [4, 8], lettuce: [3, 5], beans: [2, 6], potatoes: [2, 4], tomatoes: [2, 3], marigolds: [3, 6],
  kale: [2, 4], leeks: [3, 9], 'winter-salad': [4, 9], 'broad-beans': [2, 7], garlic: [3, 10], onions: [3, 10], 'green-manure': [6, 14],
};
const LIGHT = new Set<CropId>(['lettuce', 'radish', 'salad', 'marigolds', 'winter-salad', 'garlic', 'onions', 'leeks', 'green-manure']);

/** A bed's crop, drawn from its state: drills before the shoots, plants growing to their size, drooping and yellowing
 *  as the soil dries past their stress point, blackened by frost, and the ripe produce showing. Returns its stage. */
function drawCrop(g: Graphics, n: GraphNode, hours: number, c: Camera, pal: Palette): Stage | null {
  const s = cropOf(n);
  if (!s) return null;
  const spec = specOf(s), stage = stageOf(s), [rows, cols] = GRID[s.id], r = px(n.box!, c), pad = 0.12 * c.s;
  const cw = (r.w - 2 * pad) / cols, ch = (r.h - 2 * pad) / rows;
  if (stage === 'sown') {
    const t = Math.max(1, 0.03 * c.s);
    for (let i = 0; i < rows; i++) g.rect(r.x + pad, r.y + pad + ch * (i + 0.5) - t / 2, r.w - 2 * pad, t);
    g.fill(pal.drill);
    return stage;
  }
  const size = 0.2 + 0.8 * progress(s), stress = Math.max(0, Math.min(1, (0.75 - s.ks) / 0.75));
  const burnt = s.dead ? 1 : s.frosted !== undefined ? Math.max(0, 1 - (hours - s.frosted) / (24 * 7)) : 0;
  const leaf = LIGHT.has(s.id) ? pal['leaf-light'] : pal.leaf, blight = pestsOf(n).blight;
  // blight browns the tops as it spreads, over any wilting
  const brown = (c: number): Paint => ({color: c, alpha: 1});
  const top0 = burnt > 0 ? mix(leaf, pal.blackened, burnt) : mix(leaf, pal.wilt, stress);
  const under0 = burnt > 0 ? mix(pal['leaf-dark'], pal.blackened, burnt) : mix(pal['leaf-dark'], pal.wilt, stress * 0.7);
  const top = blight > 0 ? mix(brown(top0), pal.blight, blight) : top0, under = blight > 0 ? mix(brown(under0), pal.blight, blight * 0.8) : under0;
  const rad = Math.min(cw, ch) * 0.5 * size * (1 - 0.2 * stress);
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) g.circle(r.x + pad + cw * (j + 0.5), r.y + pad + ch * (i + 0.5), rad);
  g.fill(under);
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) g.circle(r.x + pad + cw * (j + 0.5) - rad * 0.15, r.y + pad + ch * (i + 0.5) - rad * 0.2, rad * 0.72);
  g.fill(top);
  // nibbled leaves: bites out of the plants' edges, more the more the pests have taken
  if (s.lost > 0.03 && !s.dead) {
    const bites = Math.min(rows * cols, Math.ceil(rows * cols * Math.min(1, s.lost * 2)));
    for (let k = 0; k < bites; k++) {
      const i = k % rows, j = Math.floor(k / rows) % cols, a = (i * 7 + j * 3) % 6;
      g.circle(r.x + pad + cw * (j + 0.5) + Math.cos(a) * rad * 0.7, r.y + pad + ch * (i + 0.5) + Math.sin(a) * rad * 0.7, rad * 0.35);
    }
    g.fill(pal['bed-dug']);
  }
  // marigolds in bloom
  if (s.id === 'marigolds' && stage !== 'growing' && !s.dead) {
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++) g.circle(r.x + pad + cw * (j + 0.5), r.y + pad + ch * (i + 0.5) - rad * 0.2, rad * 0.45);
    g.fill(pal.marigold);
  }
  // what's ripe, where it shows: tomatoes and radishes by colour, beans as pods
  const ripe = n.stocks[foodKey(spec.product)]?.amount ?? 0;
  if (ripe > 0.01 && !s.dead && (s.id === 'tomatoes' || s.id === 'radish' || s.id === 'beans')) {
    const dot = Math.max(1.5, rad * 0.28), per = s.id === 'radish' ? 1 : 3;
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++)
        for (let k = 0; k < per; k++) {
          const a = (k / per) * Math.PI * 2 + i + j, x = r.x + pad + cw * (j + 0.5) + Math.cos(a) * rad * (per > 1 ? 0.5 : 0), y = r.y + pad + ch * (i + 0.5) + Math.sin(a) * rad * (per > 1 ? 0.5 : 0) + (per > 1 ? 0 : rad * 0.55);
          if (s.id === 'beans') g.roundRect(x - dot * 0.4, y - dot * 1.2, dot * 0.8, dot * 2.4, dot * 0.4);
          else g.circle(x, y, dot);
        }
    g.fill(s.id === 'tomatoes' ? pal['fruit-red'] : s.id === 'radish' ? pal['fruit-pink'] : pal['leaf-dark']);
  }
  return stage;
}

/** What changes tick by tick without moving: the soil in the dug beds and what grows in them, the water in a butt, and
 *  the frost. */
export function drawLive(g: Graphics, v: View, c: Camera, pal: Palette, w = weatherAt(v)): {soil: Record<string, number>; frost: number; crops: Record<string, Stage>} {
  const crops: Record<string, Stage> = {};
  const soil: Record<string, number> = {}, film = surfaceWet(w);
  const cur = lookup(v.cur), before = lookup(v.prev);
  for (const n of cur.dug) {
    const was = before.dug.find((p) => p.id === n.id), now = wetness(n), below = was ? wetness(was) + (now - wetness(was)) * v.alpha : now;
    const wet = below + (Math.max(below, 0.8) - below) * film; // rain on the surface darkens it before it soaks in
    const r = px(n.box!, c);
    g.roundRect(r.x, r.y, r.w, r.h, 0.175 * c.s).fill(soilColour(wet, pal));
    soil[n.id] = wet;
    const stage = drawCrop(g, n, v.hours, c, pal);
    if (stage) crops[n.id] = stage;
    // a border of flowers along the bed's front edge: green plants, orange once in bloom
    const b = borderOf(n);
    if (b) {
      const k = Math.min(1, 0.4 + b.dd / 400), dot = Math.max(1.5, 0.07 * c.s * k), y = r.y + r.h - 0.1 * c.s;
      for (let i = 0; i < 9; i++) g.circle(r.x + r.w * (0.08 + (0.84 * i) / 8), y, dot);
      g.fill(inFlower(b) ? pal.marigold : pal['leaf-light']);
    }
  }
  for (const n of cur.butts) {
    const fill = (node: GraphNode | undefined) => {
      const w = node?.stocks.water;
      return w && w.cap ? Math.min(1, Math.max(0, w.amount / w.cap)) : 0;
    };
    const was = fill(before.butts.find((p) => p.id === n.id)), now = fill(n), f = was + (now - was) * v.alpha;
    if (f <= 0) continue;
    const r = px(n.box!, c);
    g.circle(r.x + r.w / 2, r.y + r.h / 2, (r.w / 2) * 0.67 * Math.sqrt(f)).fill(pal.water);
  }
  drawKit(g, v.cur.nodes, c, pal);
  drawSites(g, v.cur.nodes, v.hours, c, pal);
  // a pale rime over the garden while the grass is below 0 °C, harder the colder it is
  const frost = (w?.hour.frost ?? 0) * pal.frostMax, lawn = cur.lawn?.box;
  if (frost > 0 && lawn) {
    const r = px(lawn, c);
    g.rect(r.x, r.y, r.w, r.h).fill({color: pal.frost.color, alpha: frost});
  }
  return {soil, frost, crops};
}

/** What the shed sold, drawn where it's in use (src/sim/kit.ts): a pot of beer sunk in a corner of each dug bed, the hose
 *  coiled on its reel by the tap, the bin's lid over the heap, the second butt beside the first, and the cold frame's
 *  glass over its bed. Nematodes work below ground, unseen. */
function drawKit(g: Graphics, nodes: readonly GraphNode[], c: Camera, pal: Palette) {
  const kit = nodes.find((n) => n.id === 'shed')?.levers.kit as {owned?: string[]} | undefined, owned = kit?.owned ?? [];
  if (!owned.length) return;
  const at = (id: string) => nodes.find((n) => n.id === id)?.box;
  if (owned.includes('beer-trap'))
    for (const n of nodes) if (n.kind === 'bed' && isDug(n)) {
      const r = px(n.box!, c);
      g.circle(r.x + r.w - 0.14 * c.s, r.y + 0.14 * c.s, 0.06 * c.s).fill(pal.trap);
    }
  const tap = at('tap');
  if (owned.includes('hose') && tap) {
    const r = px(tap, c), cx = r.x + r.w + 0.3 * c.s, cy = r.y + r.h / 2, t = Math.max(1.5, 0.04 * c.s);
    for (const k of [0.18, 0.12]) g.circle(cx, cy, k * c.s).stroke({width: t, color: pal.hose.color});
  }
  const heap = at('heap');
  if (owned.includes('compost-bin') && heap) {
    const r = px(heap, c), inset = 0.2 * c.s;
    g.roundRect(r.x + inset, r.y + inset, r.w - 2 * inset, r.h - 2 * inset, 0.25 * c.s).fill(pal.bin);
  }
  const butt = at('butt');
  if (owned.includes('water-butt') && butt) {
    const r = px(butt, c);
    g.circle(r.x + r.w / 2 + 0.05 * c.s, r.y + r.h * 1.5 + 0.07 * c.s, r.w / 2).fill(pal.shadow);
    g.circle(r.x + r.w / 2, r.y + r.h * 1.5, r.w / 2).fill(pal.butt);
  }
  // raised beds: their boards around the bed
  for (const n of nodes) if (n.kind === 'bed' && n.levers.raised === true) {
    const r = px(n.box!, c), t = Math.max(2, 0.08 * c.s);
    g.roundRect(r.x, r.y, r.w, r.h, 0.12 * c.s).stroke({width: t, color: pal.timber.color});
  }
  if (owned.includes('water-tank')) {
    const r = px(TANK_BOX, c);
    g.roundRect(r.x + 0.05 * c.s, r.y + 0.07 * c.s, r.w, r.h, 0.1 * c.s).fill(pal.shadow);
    g.roundRect(r.x, r.y, r.w, r.h, 0.1 * c.s).fill(pal.tank);
  }
  // the lean-to growhouse against the house's sunny wall: clear panels over its shelves of pots
  if (owned.includes('lean-to')) {
    const r = px(LEAN_TO_BOX, c), t = Math.max(1, 0.03 * c.s);
    g.rect(r.x, r.y, r.w, r.h).fill({color: pal.frame.color, alpha: 0.4}).stroke({width: t, color: pal['frame-edge'].color});
    for (let i = 0; i < 5; i++) g.circle(r.x + ((i + 0.5) * r.w) / 5, r.y + r.h * 0.55, 0.1 * c.s).fill(pal.leaf);
  }
  // cloches: a clear tunnel along the bed, its hoops across it
  const cloched = nodes.find((n) => n.kind === 'bed' && n.levers.cover === 'cloches');
  if (cloched) {
    const r = px(cloched.box!, c), t = Math.max(1, 0.03 * c.s), inset = 0.12 * c.s;
    g.roundRect(r.x + inset, r.y + inset, r.w - 2 * inset, r.h - 2 * inset, 0.3 * c.s).fill({color: pal.frame.color, alpha: 0.3}).stroke({width: t, color: pal['frame-edge'].color});
    for (let i = 1; i < 5; i++) g.moveTo(r.x + (r.w * i) / 5, r.y + inset).lineTo(r.x + (r.w * i) / 5, r.y + r.h - inset).stroke({width: t, color: pal['frame-edge'].color});
  }
  const framed = nodes.find((n) => n.kind === 'bed' && n.levers.cover === 'cold-frame');
  if (framed) {
    const r = px(framed.box!, c), t = Math.max(1.5, 0.05 * c.s);
    g.roundRect(r.x, r.y, r.w, r.h, 0.175 * c.s).fill({color: pal.frame.color, alpha: 0.35}).stroke({width: t, color: pal['frame-edge'].color});
    g.moveTo(r.x + r.w / 2, r.y).lineTo(r.x + r.w / 2, r.y + r.h).stroke({width: t, color: pal['frame-edge'].color});
  }
}

/** Where the lean-to stands: against the house wall, above bed 3 and short of the tap. */
const LEAN_TO_BOX: Box = {x: 5.3, y: 0.55, w: 2.2, h: 0.5};
/** Where the rainwater tank stands: against the house wall in the corner past the shed. */
const TANK_BOX: Box = {x: 11.35, y: 0.55, w: 0.55, h: 1.2};

/** The big buys, drawn over their places each frame: the greenhouse's glass and its bars, the hens scratching about their
 *  run (a cosmetic wander from the clock, however many are in), the fruit cage's canes and bushes under the net with the
 *  ripe fruit on them, the cordon redcurrants along the fence, one for each planted, and the blackcurrant bush. An empty
 *  hen house (round four) is its run with no hens in it. */
function drawSites(g: Graphics, nodes: readonly GraphNode[], hours: number, c: Camera, pal: Palette) {
  for (const n of nodes) {
    const r = n.box && px(n.box, c);
    if (!r) continue;
    if (n.levers.cover === 'greenhouse') {
      const t = Math.max(1.5, 0.05 * c.s);
      g.roundRect(r.x, r.y, r.w, r.h, 0.1 * c.s).fill({color: pal.frame.color, alpha: 0.4}).stroke({width: t, color: pal['frame-edge'].color});
      g.moveTo(r.x, r.y + r.h / 2).lineTo(r.x + r.w, r.y + r.h / 2).stroke({width: t, color: pal['frame-edge'].color});
      for (let i = 1; i < 4; i++) g.moveTo(r.x + (r.w * i) / 4, r.y).lineTo(r.x + (r.w * i) / 4, r.y + r.h).stroke({width: t / 2, color: pal['frame-edge'].color});
    }
    if (n.kind === 'hens') {
      const head = Number((n.levers.herd as {head?: number} | null)?.head ?? 0), run = {x: r.x + 1.3 * c.s, w: r.w - 1.5 * c.s};
      for (let i = 0; i < head; i++) {
        // day and night they keep to the house; by day each wanders its own slow loop
        const out = (hours + 6) % 24 > 7 && (hours + 6) % 24 < 20, a = hours * 0.9 + i * 2.1;
        const x = out ? run.x + run.w * (0.5 + 0.4 * Math.sin(a)) : r.x + (0.35 + 0.3 * i) * c.s;
        const y = out ? r.y + r.h * (0.5 + 0.3 * Math.cos(a * 1.3)) : r.y + r.h * 0.75;
        g.ellipse(x, y, 0.13 * c.s, 0.1 * c.s).fill(pal.hen);
        g.circle(x + 0.1 * c.s, y - 0.04 * c.s, 0.035 * c.s).fill(pal.comb);
      }
    }
    if (n.kind === 'fruit' && n.id === 'cordons') {
      // the cordons up the fence, one a planting, spaced along the strip, with their ripe fruit
      const plants = ((n.levers.bushes as {plants?: unknown[]} | null)?.plants ?? []).length, ripe = n.stocks['food.berries']?.amount ?? 0;
      for (let i = 0; i < plants; i++) {
        const x = r.x + (i + 0.5) * (r.w / 6), y = r.y + r.h * 0.5;
        g.circle(x, y, 0.2 * c.s).fill(pal['leaf-dark']);
        g.circle(x - 0.05 * c.s, y - 0.05 * c.s, 0.12 * c.s).fill(pal.leaf);
        const dots = Math.min(4, Math.ceil(ripe * 3));
        for (let k = 0; k < dots; k++) g.circle(x + 0.12 * c.s * Math.cos(k * 1.9 + i), y + 0.12 * c.s * Math.sin(k * 1.9 + i), 0.035 * c.s).fill(pal.berry);
      }
      continue;
    }
    if (n.kind === 'fruit' && n.id === 'bush') {
      // the one blackcurrant bush, unnetted, with its ripe fruit
      const x = r.x + r.w / 2, y = r.y + r.h / 2, ripe = n.stocks['food.berries']?.amount ?? 0;
      g.circle(x, y, 0.4 * c.s).fill(pal['leaf-dark']);
      g.circle(x - 0.1 * c.s, y - 0.1 * c.s, 0.25 * c.s).fill(pal.leaf);
      for (let k = 0; k < Math.min(6, Math.ceil(ripe * 4)); k++) g.circle(x + 0.25 * c.s * Math.cos(k * 1.9), y + 0.25 * c.s * Math.sin(k * 1.9), 0.045 * c.s).fill(pal.berry);
      continue;
    }
    if (n.kind === 'fruit') {
      const ripe = n.stocks['food.berries']?.amount ?? 0, bushes = 6;
      for (let i = 0; i < bushes; i++) {
        const x = r.x + ((i % 3) + 0.5) * (r.w / 3), y = r.y + (Math.floor(i / 3) + 0.5) * (r.h / 2);
        g.circle(x, y, 0.35 * c.s).fill(pal['leaf-dark']);
        g.circle(x - 0.08 * c.s, y - 0.08 * c.s, 0.22 * c.s).fill(pal.leaf);
        // the ripe fruit showing, more of it the more there is to pick
        const dots = Math.min(6, Math.ceil(ripe * 4));
        for (let k = 0; k < dots; k++) g.circle(x + 0.22 * c.s * Math.cos(k * 1.9 + i), y + 0.22 * c.s * Math.sin(k * 1.9 + i), 0.045 * c.s).fill(pal.berry);
      }
      // the net over it all
      const t = Math.max(1, 0.02 * c.s);
      for (let x = r.x; x <= r.x + r.w + 1e-6; x += 0.4 * c.s) g.moveTo(x, r.y).lineTo(x, r.y + r.h).stroke({width: t, color: pal.net.color, alpha: pal.net.alpha});
      for (let y = r.y; y <= r.y + r.h + 1e-6; y += 0.4 * c.s) g.moveTo(r.x, y).lineTo(r.x + r.w, y).stroke({width: t, color: pal.net.color, alpha: pal.net.alpha});
    }
  }
}

/** What a person carries, from above, about 0.25 m across: a watering can, a basket of produce, or a bucket of compost
 *  or waste. */
export type Item = 'can' | 'basket' | 'bags' | 'compost';
export function drawItem(g: Graphics, item: Item, x: number, y: number, s: number, pal: Palette) {
  if (item === 'can') {
    g.roundRect(x - 0.09 * s, y - 0.07 * s, 0.18 * s, 0.14 * s, 0.03 * s).fill(pal.can);
    g.rect(x + 0.08 * s, y - 0.015 * s, 0.1 * s, 0.03 * s).fill(pal.can);
  } else if (item === 'basket') {
    g.circle(x, y, 0.11 * s).fill(pal.basket);
    g.circle(x, y, 0.07 * s).fill(pal['leaf-light']);
  } else if (item === 'bags') {
    // two shopping bags, one in each hand
    g.roundRect(x - 0.05 * s, y - 0.09 * s, 0.14 * s, 0.16 * s, 0.03 * s).fill(pal.bags);
    g.roundRect(x - 0.47 * s, y - 0.09 * s, 0.14 * s, 0.16 * s, 0.03 * s).fill(pal.bags);
  } else g.circle(x, y, 0.1 * s).fill(pal.compost);
}
/** The item an activity's carry is drawn as, or null. */
export const itemOf = (carry: {unit: string; product?: string} | undefined): Item | null =>
  !carry ? null : carry.unit === 'L' ? 'can' : carry.unit === 'kgFood' ? (carry.product === 'shop' ? 'bags' : 'basket') : carry.unit === 'kgWaste' ? 'compost' : null;

/** A person from above, about 0.4 m across, drawn at a scale in pixels per metre, centred on (0, 0) at their feet. */
export function drawPerson(g: Graphics, s: number, pal: Palette) {
  g.ellipse(0, 0.175 * s, 0.2 * s, 0.08 * s).fill(pal['shadow-deep']);
  g.ellipse(0, 0, 0.17 * s, 0.21 * s).fill(pal.person);
  g.circle(0, -0.09 * s, 0.12 * s).fill(pal.skin);
  g.arc(0, -0.11 * s, 0.15 * s, Math.PI, 0).fill(pal.hat);
}
