// A neighbour's plot opened in detail from its totals (docs/specs/one-map.md, "How it works", item 3; the spike's brief,
// item 4): beds on the plot's seeded layout (layoutRng in src/sim/ladder.ts, from the game's seed and the plot's id, so it
// always looks the same), as many dug as its Output fills, each bed's crop from the plot's mix, its plants as many as the
// kg it stands for and tinted by the plot's Health, with a shed or a heap in a corner. Looking only: no sim runs and
// nothing is saved; the renderer draws it when the plot is big enough on screen to see (src/ui/map/camera.ts's
// detailAlpha) and drops it when it isn't. The drawn beds add back up to the plot's totals within the carry check's 5 %
// (the founding spec's "Inflating": inflateTarget and carryCheck, src/ui/map/detail.test.ts). Nothing here changes the
// game.
import type {Graphics} from 'pixi.js';
import {TILE} from '../../data/allotment';
import type {CropId} from '../../data/crops';
import type {ProductGroup} from '../../data/ladder-rules';
import {holderOf, sealedOf} from '../../sim/allotment';
import type {Box, GraphNode} from '../../sim/graph';
import {layoutRng, type LadderTotals} from '../../sim/ladder';
import type {Camera} from './camera';
import * as kit from './kit';
import type {Palette} from './palette';
import {leaves, plant, SHAPE} from './plants';

/** A bed of a plot drawn from its totals: where it is on the tile (the tile's own metres), its crop and mix group (none
 *  left in grass), how many plants it's drawn with, and its Health. */
export interface DetailBed {
  box: Box;
  crop: CropId | null;
  group: ProductGroup | null;
  plants: number;
  health: number;
}

/** A plot drawn from its totals: its beds, the shed or heap in its corner, and what the drawing adds up to (kg a day in
 *  all and by group, and the beds' mean Health). */
export interface PlotDetail {
  beds: DetailBed[];
  shed: Box | null;
  heap: Box | null;
  kg: number;
  groups: Partial<Record<ProductGroup, number>>;
  health: number;
}

/** kg a day each drawn plant stands for: small enough that the rounding stays well inside 5 % of a plot's Output. */
export const PLANT_KG = 0.004;
/** The kg a day that digs every bed: the tile's own measure (src/ui/map/allotment.ts). */
const FULL_KG = 0.5;
/** The crops each of the plot's groups is drawn as. */
const CROPS_OF: Partial<Record<ProductGroup, CropId[]>> = {
  potatoes: ['potatoes'], salads: ['lettuce', 'salad', 'radish'], tomatoes: ['tomatoes'], greens: ['kale', 'leeks', 'beans', 'onions', 'broad-beans'],
};
const PLOT_GROUPS = Object.keys(CROPS_OF) as ProductGroup[];
/** The tile's layout, m: a margin, two rows of beds with a path between, beds 1.2 m wide with narrow paths. */
const MARGIN = 0.5, PATH = 0.8, BED_W = 1.2, GAP = 0.45;

/** Shares a whole number out by weights, the largest remainders first, so the parts add up to it exactly. */
function share(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, w) => a + w, 0);
  if (!(sum > 0) || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / sum), out = exact.map(Math.floor);
  let left = total - out.reduce((a, n) => a + n, 0);
  const order = exact.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of order) {
    if (left <= 0) break;
    out[i]!++;
    left--;
  }
  return out;
}

/** The totals a plot is drawn from: its node's Output and Health, and its mix from what it sealed, scaled to them. */
export function totalsOf(n: GraphNode): LadderTotals {
  const sealed = sealedOf(n)?.totals, t: LadderTotals = {...(sealed ?? n.totals), ...n.totals, land: {...n.totals.land}};
  const mix = sealed?.outputByGroup;
  if (mix) {
    const sum = PLOT_GROUPS.reduce((a, g) => a + (mix[g] ?? 0), 0);
    t.outputByGroup = sum > 0 ? Object.fromEntries(PLOT_GROUPS.filter((g) => (mix[g] ?? 0) > 0).map((g) => [g, (n.totals.output * mix[g]!) / sum])) : undefined;
  }
  return t;
}

/** A plot's beds from its totals, on its seeded layout. */
export function detailOf(seed: number, n: GraphNode): PlotDetail {
  const t = totalsOf(n), dice = layoutRng(seed, n.id), rowH = (TILE.h - 2 * MARGIN - PATH) / 2;
  const across = Math.floor((TILE.w - 2 * MARGIN + GAP) / (BED_W + GAP)), step = (TILE.w - 2 * MARGIN + GAP) / across;
  // a shed or a heap in one corner, where a bed would be
  const corner = Math.floor(dice.next() * 4), shedHere = dice.next() < 0.5, slots: Box[] = [];
  let spot: Box | null = null;
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < across; i++) {
      const box = {x: MARGIN + i * step, y: MARGIN + row * (rowH + PATH), w: step - GAP, h: rowH};
      const k = (row ? 2 : 0) + (i === 0 ? 0 : i === across - 1 ? 1 : -9);
      if (k === corner) spot = box;
      else slots.push(box);
    }
  const shed = spot && shedHere ? {x: spot.x, y: spot.y + spot.h * 0.3, w: spot.w, h: spot.h * 0.45} : null;
  const heap = spot && !shedHere ? {x: spot.x + spot.w * 0.1, y: spot.y + spot.h * 0.35, w: spot.w * 0.8, h: spot.w * 0.8} : null;
  // as many beds dug as the Output fills, in a seeded order; the rest left in grass
  const order = slots.map((_, i) => [dice.next(), i] as const).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  const dug = Math.max(1, Math.min(slots.length, Math.ceil((slots.length * Math.max(0, t.output)) / FULL_KG)));
  // the mix: each group's share of the Output, beds for each (every group with any kg gets one while beds last), then the
  // plants, as many as the kg, shared between the group's beds by the layout's dice
  const kgs = PLOT_GROUPS.map((g) => (t.outputByGroup ? t.outputByGroup[g] ?? 0 : g === 'greens' ? t.output : 0));
  const present = PLOT_GROUPS.map((_, i) => i).filter((i) => kgs[i]! > 0);
  const bedsOf = share(dug, PLOT_GROUPS.map((_, i) => (kgs[i]! > 0 ? kgs[i]! : 0)));
  for (const i of present) if (!bedsOf[i]) {
    const most = bedsOf.indexOf(Math.max(...bedsOf));
    if (bedsOf[most]! > 1) {
      bedsOf[most]!--;
      bedsOf[i] = 1;
    }
  }
  const plantsOf = share(Math.round(Math.max(0, t.output) / PLANT_KG), PLOT_GROUPS.map((_, i) => (bedsOf[i]! > 0 ? kgs[i]! : 0)));
  const beds: DetailBed[] = [], groups: PlotDetail['groups'] = {};
  let at = 0;
  PLOT_GROUPS.forEach((g, i) => {
    const count = bedsOf[i]!;
    if (!count) return;
    const each = share(plantsOf[i]!, Array.from({length: count}, () => 0.7 + 0.6 * dice.next())), crops = CROPS_OF[g]!;
    groups[g] = plantsOf[i]! * PLANT_KG;
    for (let k = 0; k < count; k++) beds.push({box: slots[order[at++]!]!, crop: crops[Math.floor(dice.next() * crops.length)]!, group: g, plants: each[k]!, health: 0});
  });
  for (; at < slots.length; at++) beds.push({box: slots[order[at]!]!, crop: null, group: null, plants: 0, health: 0});
  // each bed's Health about the plot's, their mean the plot's
  const spread = beds.map(() => (dice.next() - 0.5) * 12), mean = spread.reduce((a, x) => a + x, 0) / Math.max(1, spread.length);
  beds.forEach((b, i) => (b.health = Math.min(100, Math.max(0, t.health + spread[i]! - mean))));
  const health = beds.reduce((a, b) => a + b.health, 0) / Math.max(1, beds.length);
  return {beds, shed, heap, kg: beds.reduce((a, b) => a + b.plants, 0) * PLANT_KG, groups, health};
}

/** What a plot's drawing adds up to, as totals to hold against the plot's own (the carry check's comparison). */
export function drawnTotals(d: PlotDetail, t: LadderTotals): LadderTotals {
  return {...t, land: {...t.land}, output: d.kg, health: d.health, outputByGroup: t.outputByGroup ? {...d.groups} : undefined};
}

/** Draws a plot's detail inside its tile through a camera fitted to the tile (camera.ts's inside): the grass between
 *  the beds, the dug beds' soil tinted by their Health with their plants, the beds left in grass, and the shed or heap. */
export function drawDetail(g: Graphics, d: PlotDetail, n: GraphNode, c: Camera, pal: Palette, seed: number) {
  const s = c.s, px = (b: Box): kit.Rect => ({x: c.x + b.x * s, y: c.y + b.y * s, w: b.w * s, h: b.h * s});
  const neglected = holderOf(n)?.neglected === true;
  g.roundRect(c.x, c.y, TILE.w * s, TILE.h * s, 0.175 * s).fill(neglected ? pal['bed-grass'] : pal.lawn);
  for (const b of d.beds) {
    const r = px(b.box);
    if (!b.crop) {
      g.roundRect(r.x, r.y, r.w, r.h, 0.12 * s).fill(pal['bed-grass']);
      continue;
    }
    kit.shadow(g, r, 0.12 * s, s, pal);
    kit.soil(g, r, s, pal, kit.mix(pal['bed-dry'], pal['bed-dug'], (b.health - 25) / 45));
    // the plants in rows down the bed, each a plant of the crop's silhouette, yellowing as Health falls
    const health = Math.min(1, Math.max(0, b.health / 100)), colours = leaves(pal, kit.mix(pal['leaf-light'], pal.leaf, health), {ready: false, stress: 0, hunger: Math.min(0.6, 1 - health), burnt: 0, blight: 0});
    const cols = Math.max(1, Math.round(Math.sqrt((b.plants * r.w) / r.h))), rows = Math.max(1, Math.ceil(b.plants / cols)), pad = 0.12 * s;
    const cw = (r.w - 2 * pad) / cols, ch = (r.h - 2 * pad) / rows, rad = Math.min(cw, ch) * 0.45;
    for (let k = 0; k < b.plants; k++) {
      const i = Math.floor(k / cols), j = k % cols;
      plant(g, SHAPE[b.crop], r.x + pad + cw * (j + 0.5), r.y + pad + ch * (i + 0.5), rad, pal, colours, {ready: false, droop: 0, phase: ((i * 5 + j * 3) % 6) * 0.5});
    }
  }
  if (d.shed) kit.shed(g, px(d.shed), s, pal);
  if (d.heap) kit.heap(g, px(d.heap), s, pal, seed, n.id);
}
