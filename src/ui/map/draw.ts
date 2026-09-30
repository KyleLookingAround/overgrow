// How the garden is drawn, with the style kit (kit.ts, plants.ts; docs/specs/map-art.md) in the owner's pick of art
// style (docs/specs/overgrow/art-styles.html, style A): flat, top-down and soft, rounded shapes with no outlines, light
// from the top left and soft shadows, in greens, soil browns and cream. Shapes are drawn in CSS pixels through the
// camera, so they stay crisp at any zoom. Colours come from the tokens (palette.ts).
// Four passes: the ground (drawGround: the hedge, the lawn with its stripes, the paths, the house wall, the fence, the
// shed and the rest, drawn once), the tilth over the dug beds (drawTilth, once), what grows (drawGrown: each bed's crop
// from its stage, its water stress, its hunger, frost, the leaves pests have nibbled and blight has browned, and the
// produce waiting on it; the borders; the kit and the big buys; blossom and berries; fallen leaves; once a snapshot),
// and what changes every frame (drawLive: each dug bed's soil colour from its water, the wet lawn, puddles on the paths,
// the butt's water; drawOver: the frost's rime and the hens). Nothing drawn changes the game.
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
import * as kit from './kit';
import {leaves, plant, seedling, sward, SHAPE, type Shape} from './plants';

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
  return k;
}

export const px = (b: Box, c: Camera): kit.Rect => ({x: c.x + b.x * c.s, y: c.y + b.y * c.s, w: b.w * c.s, h: b.h * c.s});

/** A dashed line inside a box, the mark of a bed plot not yet dug. */
function dashes(g: Graphics, r: kit.Rect, c: Camera, pal: Palette) {
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

/** The ground: the hedge round the outside, then every node with a box in the graph's order (the lawn first, under
 *  everything), and the fence along the lawn's sides with a gap at the side gate. */
export function drawGround(g: Graphics, nodes: readonly GraphNode[], w: number, h: number, c: Camera, pal: Palette, seed: number) {
  const lawn = nodes.find((n) => n.kind === 'lawn')?.box;
  if (lawn) kit.hedge(g, px(lawn, c), w, h, c.s, pal, seed);
  else g.rect(0, 0, w, h).fill(pal.edge);
  for (const n of nodes) if (n.box) drawNode(g, n, c, pal, seed);
  if (lawn) {
    const r = px(lawn, c), wall = nodes.find((n) => n.kind === 'kitchen')?.box, top = wall ? c.y + (wall.y + wall.h) * c.s : r.y;
    const gate = nodes.find((n) => n.kind === 'gate')?.box;
    const gap: [number, number] | undefined = gate && gate.x < lawn.x + 0.5 ? [gate.y - 0.15 - (top - c.y) / c.s, gate.y + gate.h + 0.15 - (top - c.y) / c.s] : undefined;
    kit.fence(g, r.x, top, r.x, r.y + r.h, c.s, pal, gap);
    kit.fence(g, r.x, r.y + r.h, r.x + r.w, r.y + r.h, c.s, pal);
    kit.fence(g, r.x + r.w, top, r.x + r.w, r.y + r.h, c.s, pal);
  }
}

export function drawNode(g: Graphics, n: GraphNode, c: Camera, pal: Palette, seed = 0) {
  const r = px(n.box!, c), round = 0.175 * c.s;
  switch (n.kind) {
    case 'lawn':
      kit.lawn(g, r, c.s, pal, seed, n.id);
      return;
    case 'kitchen':
      kit.wall(g, r, c.s, pal);
      return;
    case 'path':
      kit.path(g, r, c.s, pal, seed, n.id);
      return;
    case 'bed': {
      const dug = isDug(n);
      kit.shadow(g, r, round, c.s, pal);
      if (dug) kit.soil(g, r, c.s, pal, pal['bed-dug']);
      else {
        g.roundRect(r.x, r.y, r.w, r.h, round).fill(pal['bed-grass']);
        dashes(g, r, c, pal);
      }
      return;
    }
    case 'shed':
      kit.shed(g, r, c.s, pal);
      return;
    case 'butt':
      kit.butt(g, r.x + r.w / 2, r.y + r.h / 2, r.w / 2, c.s, pal);
      return; // the water in it is live: drawLive
    case 'tap':
      kit.tap(g, r, c.s, pal);
      return;
    case 'heap':
      kit.heap(g, r, c.s, pal, seed, n.id);
      return;
    case 'gate': {
      // the honesty box on its post, by the side gate
      g.roundRect(r.x + 0.04 * c.s, r.y + 0.06 * c.s, r.w, r.h, 0.06 * c.s).fill(pal.shadow);
      g.roundRect(r.x, r.y, r.w, r.h, 0.06 * c.s).fill(pal.gate);
      g.roundRect(r.x + r.w * 0.25, r.y + r.h * 0.4, r.w * 0.5, r.h * 0.14, 0.02 * c.s).fill(pal['gate-slot']);
      return;
    }
    case 'hens': {
      // the run, and the house at its left end with its roof
      kit.shadow(g, r, round, c.s, pal);
      g.roundRect(r.x, r.y, r.w, r.h, round).fill(pal.run);
      const house = {x: r.x + 0.1 * c.s, y: r.y + 0.15 * c.s, w: 1.1 * c.s, h: r.h - 0.3 * c.s};
      g.roundRect(house.x + kit.LIGHT.dx * c.s, house.y + kit.LIGHT.dy * c.s, house.w, house.h, 0.1 * c.s).fill(pal.shadow);
      g.roundRect(house.x, house.y, house.w, house.h, 0.1 * c.s).fill(pal['hen-house']);
      g.roundRect(house.x, house.y, house.w, house.h / 2, 0.1 * c.s).fill(pal['shed-roof']);
      g.roundRect(house.x, house.y, house.w / 2, house.h / 2, 0.1 * c.s).fill(pal['roof-lit']);
      return;
    }
    case 'fruit':
      kit.shadow(g, r, round, c.s, pal);
      kit.soil(g, r, c.s, pal, pal['bed-dug']);
      return;
    case 'bench':
      g.rect(r.x, r.y, r.w, r.h).fill(pal['bed-dug']);
      return;
    default:
      kit.shadow(g, r, round, c.s, pal);
      g.roundRect(r.x, r.y, r.w, r.h, round).fill(pal.shed);
  }
}

/** The tilth over every dug bed, drawn once over the soil's live colour. */
export function drawTilth(g: Graphics, nodes: readonly GraphNode[], c: Camera, pal: Palette, seed: number) {
  for (const n of nodes) if (n.box && (n.kind === 'fruit' || (n.kind === 'bed' && isDug(n)))) kit.tilth(g, px(n.box, c), c.s, pal, seed, n.id);
}

// the nodes the weather is drawn from, looked up once per snapshot rather than every frame
const found = new WeakMap<GraphNode[], {air: GraphNode | null; lawn: GraphNode | null; dug: GraphNode[]; butts: GraphNode[]; paths: GraphNode[]; heap: GraphNode | null}>();
export function lookup(s: Snapshot) {
  let f = found.get(s.nodes);
  if (!f) {
    f = {air: null, lawn: null, dug: [], butts: [], paths: [], heap: null};
    for (const n of s.nodes) {
      if (n.kind === 'atmosphere') f.air = n;
      else if (n.kind === 'lawn') f.lawn = n;
      else if (n.kind === 'heap') f.heap = n;
      else if (n.kind === 'butt' && n.box) f.butts.push(n);
      else if (n.kind === 'path' && n.box) f.paths.push(n);
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
export const soilColour = (wet: number, pal: Palette): Paint => (wet < 0 ? kit.mix(pal['bed-dug'], pal['bed-dry'], -wet) : kit.mix(pal['bed-dug'], pal['bed-wet'], wet));

/** How a crop sits in a 2 × 1.5 m bed: rows by plants in a row. */
const GRID: Record<CropId, [number, number]> = {
  salad: [4, 9], radish: [4, 8], lettuce: [3, 5], beans: [2, 6], potatoes: [2, 4], tomatoes: [2, 3], marigolds: [3, 6],
  kale: [2, 4], leeks: [3, 9], 'winter-salad': [4, 9], 'broad-beans': [2, 7], garlic: [3, 10], onions: [3, 10], 'green-manure': [6, 14],
};
const LIGHT_LEAF = new Set<CropId>(['lettuce', 'radish', 'salad', 'marigolds', 'winter-salad', 'garlic', 'onions', 'leeks', 'green-manure']);

/** A bed's crop, drawn from its state: drills before the shoots, seedlings, plants growing to their size in their crop's
 *  silhouette, drooping and yellowing as the soil dries past their stress point or the soil runs short, blackened by
 *  frost, fuller with a sheen when ready, and the ripe produce showing. Returns its stage and shape. */
function drawCrop(g: Graphics, n: GraphNode, hours: number, c: Camera, pal: Palette): {stage: Stage; shape: Shape} | null {
  const s = cropOf(n);
  if (!s) return null;
  const spec = specOf(s), stage = stageOf(s), shape = SHAPE[s.id], [rows, cols] = GRID[s.id], r = px(n.box!, c), pad = 0.14 * c.s;
  const cw = (r.w - 2 * pad) / cols, ch = (r.h - 2 * pad) / rows, at = (i: number, j: number): [number, number] => [r.x + pad + cw * (j + 0.5), r.y + pad + ch * (i + 0.5)];
  if (stage === 'sown') {
    const t = Math.max(1, 0.03 * c.s);
    for (let i = 0; i < rows; i++) g.rect(r.x + pad, r.y + pad + ch * (i + 0.5) - t / 2, r.w - 2 * pad, t);
    g.fill(pal.drill);
    return {stage, shape};
  }
  const grown = progress(s), stress = Math.max(0, Math.min(1, (0.75 - s.ks) / 0.75));
  const hunger = s.need > 0 ? Math.max(0, Math.min(1, 1 - s.got / s.need)) : 0;
  const burnt = s.dead ? 1 : s.frosted !== undefined ? Math.max(0, 1 - (hours - s.frosted) / (24 * 7)) : 0;
  const base = LIGHT_LEAF.has(s.id) ? pal['leaf-light'] : pal.leaf, blight = pestsOf(n).blight, ready = stage === 'ready' && !s.dead;
  const colours = leaves(pal, base, {ready, stress, hunger: stage === 'over' ? Math.max(hunger, 0.35) : hunger, burnt, blight});
  const size = 0.2 + 0.8 * grown, rad = Math.min(cw, ch) * 0.5 * size * (1 - 0.2 * stress);
  if (shape === 'sward') {
    sward(g, r, c.s, colours, grown, Math.floor((rows * cols) / 2), (k) => at(k % rows, Math.floor(k / rows) % cols));
    return {stage, shape};
  }
  // a seedling: two seed leaves, until it's a quarter grown
  if (grown < 0.25 && !s.dead) {
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) seedling(g, ...at(i, j), rad * 0.8, pal);
    return {stage, shape};
  }
  if (shape === 'climber') for (let i = 0; i < rows; i++) kit.cane(g, r.x + pad * 0.5, r.y + pad + ch * (i + 0.5), r.x + r.w - pad * 0.5, r.y + pad + ch * (i + 0.5), c.s, pal);
  const bloom = s.id === 'marigolds' && stage !== 'growing' && !s.dead;
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) plant(g, shape, ...at(i, j), rad, pal, colours, {ready, droop: stress, phase: ((i * 7 + j * 3) % 6) * 0.5, bloom});
  // nibbled leaves: bites out of the plants' edges, more the more the pests have taken
  if (s.lost > 0.03 && !s.dead) {
    const bites = Math.min(rows * cols, Math.ceil(rows * cols * Math.min(1, s.lost * 2)));
    for (let k = 0; k < bites; k++) {
      const i = k % rows, j = Math.floor(k / rows) % cols, a = (i * 7 + j * 3) % 6, [x, y] = at(i, j);
      g.circle(x + Math.cos(a) * rad * 0.7, y + Math.sin(a) * rad * 0.7, rad * 0.35);
    }
    g.fill(pal['bed-dug']);
  }
  // what's ripe, where it shows: tomatoes and radishes by colour, beans as pods
  const ripe = n.stocks[foodKey(spec.product)]?.amount ?? 0;
  if (ripe > 0.01 && !s.dead && (s.id === 'tomatoes' || s.id === 'radish' || s.id === 'beans')) {
    const dot = Math.max(1.5, rad * 0.28), per = s.id === 'radish' ? 1 : 3;
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++)
        for (let k = 0; k < per; k++) {
          const a = (k / per) * Math.PI * 2 + i + j, [cx, cy] = at(i, j), x = cx + Math.cos(a) * rad * (per > 1 ? 0.5 : 0), y = cy + Math.sin(a) * rad * (per > 1 ? 0.5 : 0) + (per > 1 ? 0 : rad * 0.55);
          if (s.id === 'beans') g.roundRect(x - dot * 0.4, y - dot * 1.2, dot * 0.8, dot * 2.4, dot * 0.4);
          else g.circle(x, y, dot);
        }
    g.fill(s.id === 'tomatoes' ? pal['fruit-red'] : s.id === 'radish' ? pal['fruit-pink'] : pal['leaf-dark']);
  }
  return {stage, shape};
}

/** What grows and what stands, drawn once a snapshot: each dug bed's crop and border, the kit in use, the big buys, the
 *  cordons with their blossom or berries, and the leaves lying on the lawn in autumn. */
export function drawGrown(g: Graphics, s: Snapshot, c: Camera, pal: Palette): {crops: Record<string, Stage>; shapes: Record<string, Shape>; leaves: number} {
  const crops: Record<string, Stage> = {}, shapes: Record<string, Shape> = {}, at = lookup(s), d = calendar(s.hours);
  // fallen leaves on the grass from mid-October, thickest in mid-November, gone by mid-December (cosmetic, from the
  // calendar: the leaves card's season, src/sim/shed.ts)
  const leaves = at.lawn?.box ? Math.round(80 * Math.max(0, 1 - Math.abs(d.dayOfYear - 318) / 30)) : 0;
  if (leaves > 0) {
    const over = s.nodes.filter((n) => n.box && n.kind !== 'lawn').map((n) => px(n.box!, c));
    kit.fallenLeaves(g, px(at.lawn!.box!, c), c.s, pal, s.seed, 'lawn', leaves, (x, y) => over.some((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h));
  }
  for (const n of at.dug) {
    const r = px(n.box!, c), drawn = drawCrop(g, n, s.hours, c, pal);
    if (drawn) {
      crops[n.id] = drawn.stage;
      shapes[n.id] = drawn.shape;
    }
    // a border of flowers along the bed's front edge: green plants, orange once in bloom
    const b = borderOf(n);
    if (b) {
      const k = Math.min(1, 0.4 + b.dd / 400), dot = Math.max(1.5, 0.07 * c.s * k), y = r.y + r.h - 0.1 * c.s;
      for (let i = 0; i < 9; i++) g.circle(r.x + r.w * (0.08 + (0.84 * i) / 8), y, dot);
      g.fill(inFlower(b) ? pal.marigold : pal['leaf-light']);
    }
  }
  drawKit(g, s.nodes, c, pal);
  drawSites(g, s.nodes, d.dayOfYear, c, pal);
  return {crops, shapes, leaves};
}

/** What changes every frame under the plants: the soil in the dug beds, the wet lawn, puddles on the paths and the water
 *  in the butts. */
export function drawLive(g: Graphics, v: View, c: Camera, pal: Palette, w = weatherAt(v)): {soil: Record<string, number>; puddles: number} {
  const soil: Record<string, number> = {}, film = surfaceWet(w);
  const cur = lookup(v.cur), before = lookup(v.prev);
  if (cur.lawn?.box && film > 0) {
    const r = px(cur.lawn.box, c);
    g.rect(r.x, r.y, r.w, r.h).fill({color: pal['lawn-wet'].color, alpha: pal['lawn-wet'].alpha * film});
  }
  for (const n of cur.dug) {
    const was = before.dug.find((p) => p.id === n.id), now = wetness(n), below = was ? wetness(was) + (now - wetness(was)) * v.alpha : now;
    const wet = below + (Math.max(below, 0.8) - below) * film; // rain on the surface darkens it before it soaks in
    kit.soil(g, px(n.box!, c), c.s, pal, soilColour(wet, pal));
    soil[n.id] = wet;
  }
  let puddles = 0;
  for (const n of cur.paths) {
    kit.puddles(g, px(n.box!, c), c.s, pal, v.cur.seed, n.id, film);
    if (film > 0.02) puddles++;
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
  return {soil, puddles};
}

/** What changes every frame over the plants: the hens about their run, and the frost's rime over the garden and on the
 *  beds' edges and the shed's roof. Returns the frost's opacity. */
export function drawOver(g: Graphics, v: View, c: Camera, pal: Palette, w = weatherAt(v), still = false): number {
  const cur = lookup(v.cur);
  drawHens(g, v.cur.nodes, still ? Math.floor(v.hours) : v.hours, c, pal);
  // a pale rime over the garden while the grass is below 0 °C, harder the colder it is
  const frost = (w?.hour.frost ?? 0) * pal.frostMax, lawn = cur.lawn?.box;
  if (frost > 0 && lawn) {
    const r = px(lawn, c);
    g.rect(r.x, r.y, r.w, r.h).fill({color: pal.frost.color, alpha: frost});
    const t = Math.max(1, 0.05 * c.s);
    for (const n of v.cur.nodes) {
      if (!n.box || (n.kind !== 'bed' && n.kind !== 'shed' && n.kind !== 'heap' && n.kind !== 'fruit')) continue;
      const b = px(n.box, c);
      g.roundRect(b.x, b.y, b.w, b.h, 0.15 * c.s).stroke({width: t, color: pal.frost.color, alpha: frost * 1.2});
    }
  }
  return frost;
}

/** What the shed sold, drawn where it's in use (src/sim/kit.ts): a pot of beer sunk in a corner of each dug bed, the hose
 *  coiled on its reel by the tap, the bin's lid over the heap, the second butt beside the first, and the cold frame's
 *  glass over its bed. Nematodes work below ground, unseen. */
function drawKit(g: Graphics, nodes: readonly GraphNode[], c: Camera, pal: Palette) {
  const kitLever = nodes.find((n) => n.id === 'shed')?.levers.kit as {owned?: string[]} | undefined, owned = kitLever?.owned ?? [];
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
    g.roundRect(r.x + inset, r.y + inset, (r.w - 2 * inset) / 2, r.h - 2 * inset, 0.25 * c.s).fill({color: pal['roof-lit'].color, alpha: 0.18});
  }
  const butt = at('butt');
  if (owned.includes('water-butt') && butt) {
    const r = px(butt, c);
    kit.butt(g, r.x + r.w / 2, r.y + r.h * 1.5, r.w / 2, c.s, pal);
  }
  // raised beds: their boards around the bed
  for (const n of nodes) if (n.kind === 'bed' && n.levers.raised === true) {
    const r = px(n.box!, c), t = Math.max(2, 0.08 * c.s);
    g.roundRect(r.x, r.y, r.w, r.h, 0.12 * c.s).stroke({width: t, color: pal.timber.color});
  }
  if (owned.includes('water-tank')) {
    const r = px(TANK_BOX, c);
    g.roundRect(r.x + kit.LIGHT.dx * c.s, r.y + kit.LIGHT.dy * c.s, r.w, r.h, 0.1 * c.s).fill(pal.shadow);
    g.roundRect(r.x, r.y, r.w, r.h, 0.1 * c.s).fill(pal.tank);
    g.roundRect(r.x + 0.04 * c.s, r.y + 0.04 * c.s, r.w * 0.4, r.h - 0.08 * c.s, 0.06 * c.s).fill({color: pal['butt-rim'].color, alpha: 0.35});
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

/** Where the rainwater tank stands: against the house wall in the corner past the shed. */
const TANK_BOX: Box = {x: 11.35, y: 0.55, w: 0.55, h: 1.2};

/** The big buys, drawn over their places once a snapshot: the greenhouse's glass and its bars, the fruit cage's bushes
 *  under the net with the ripe fruit on them, and the cordon redcurrants along the fence, one for each planted, in
 *  blossom in April. */
function drawSites(g: Graphics, nodes: readonly GraphNode[], dayOfYear: number, c: Camera, pal: Palette) {
  for (const n of nodes) {
    const r = n.box && px(n.box, c);
    if (!r) continue;
    if (n.levers.cover === 'greenhouse') {
      const t = Math.max(1.5, 0.05 * c.s);
      g.roundRect(r.x, r.y, r.w, r.h, 0.1 * c.s).fill({color: pal.frame.color, alpha: 0.4}).stroke({width: t, color: pal['frame-edge'].color});
      g.moveTo(r.x, r.y + r.h / 2).lineTo(r.x + r.w, r.y + r.h / 2).stroke({width: t, color: pal['frame-edge'].color});
      for (let i = 1; i < 4; i++) g.moveTo(r.x + (r.w * i) / 4, r.y).lineTo(r.x + (r.w * i) / 4, r.y + r.h).stroke({width: t / 2, color: pal['frame-edge'].color});
    }
    if (n.kind === 'fruit' && n.id === 'cordons') {
      // the cordons up the fence, one a planting, spaced along the strip, with their blossom or their ripe fruit
      const plants = ((n.levers.bushes as {plants?: unknown[]} | null)?.plants ?? []).length, ripe = n.stocks['food.berries']?.amount ?? 0;
      const blossom = dayOfYear >= 95 && dayOfYear <= 125;
      for (let i = 0; i < plants; i++) {
        const x = r.x + (i + 0.5) * (r.w / 6), y = r.y + r.h * 0.5;
        kit.cane(g, x, r.y + 0.05 * c.s, x, r.y + r.h - 0.05 * c.s, c.s, pal);
        g.circle(x, y, 0.2 * c.s).fill(pal['leaf-dark']);
        g.circle(x - 0.05 * c.s, y - 0.05 * c.s, 0.12 * c.s).fill(pal.leaf);
        const dots = blossom ? 5 : Math.min(4, Math.ceil(ripe * 3)), tone = blossom ? pal.blossom : pal.berry;
        for (let k = 0; k < dots; k++) g.circle(x + 0.13 * c.s * Math.cos(k * 1.9 + i), y + 0.13 * c.s * Math.sin(k * 1.9 + i), 0.035 * c.s).fill(tone);
      }
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

/** The hens scratching about their run: a cosmetic wander from the clock, the three of them, each stepping along its
 *  own slow loop by day and in the house at night. */
function drawHens(g: Graphics, nodes: readonly GraphNode[], hours: number, c: Camera, pal: Palette) {
  for (const n of nodes) {
    if (n.kind !== 'hens' || !n.box) continue;
    const r = px(n.box, c), head = Number((n.levers.herd as {head?: number} | null)?.head ?? 0), run = {x: r.x + 1.3 * c.s, w: r.w - 1.5 * c.s};
    for (let i = 0; i < head; i++) {
      const out = (hours + 6) % 24 > 7 && (hours + 6) % 24 < 20, a = hours * 0.9 + i * 2.1;
      const x = out ? run.x + run.w * (0.5 + 0.4 * Math.sin(a)) : r.x + (0.35 + 0.3 * i) * c.s;
      const y = out ? r.y + r.h * (0.5 + 0.3 * Math.cos(a * 1.3)) : r.y + r.h * 0.75;
      const facing = out ? Math.atan2(-0.39 * Math.sin(a * 1.3) * r.h, 0.4 * Math.cos(a) * run.w) : Math.PI / 2;
      kit.hen(g, x, y, c.s, pal, facing, out && Math.floor(hours * 40 + i) % 2 === 0 ? 1 : 0);
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

/** A person from above, about 0.4 m across, drawn at a scale in pixels per metre, centred on (0, 0): the kit's figure. */
export function drawPerson(g: Graphics, s: number, pal: Palette, who: 'gardener' | 'household' = 'gardener', frame: 0 | 1 | 2 = 0) {
  kit.figure(g, s, pal, who, frame);
}
