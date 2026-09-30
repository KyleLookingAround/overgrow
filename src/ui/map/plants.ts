// Plants drawn from above at any scale (docs/specs/map-art.md): each crop has a silhouette that reads at phone size
// without pixel detail (a rosette, a fan of blades, a bush, a climber on a cane, a flowering rosette or a fine sward),
// drawn as one polygon a plant with a lit top, and each stage shows: two seed leaves as a seedling, the silhouette growing
// to its size, and a fuller green with a small sheen when ready to pick. Stress shows on the leaves (drooping and paling
// under water stress, yellowing when short of nutrients, blackened by frost, browned by blight). Nothing here changes
// the game.
import type {Graphics} from 'pixi.js';
import type {CropId} from '../../data/crops';
import type {Paint, Palette} from './palette';
import {mix} from './kit';

export type Shape = 'rosette' | 'blades' | 'bush' | 'climber' | 'flower' | 'sward';

/** Each crop's silhouette. */
export const SHAPE: Record<CropId, Shape> = {
  salad: 'rosette', radish: 'rosette', lettuce: 'rosette', kale: 'rosette', 'winter-salad': 'rosette',
  leeks: 'blades', garlic: 'blades', onions: 'blades',
  potatoes: 'bush', 'broad-beans': 'bush',
  beans: 'climber', tomatoes: 'climber',
  marigolds: 'flower',
  'green-manure': 'sward',
};

/** The leaf colours a plant is drawn in: its lit top and its shaded underside. */
export interface Leaves {
  top: Paint;
  under: Paint;
}

/** The leaf colours for a plant's state: the crop's green, fuller when ready, paling and yellowing towards wilt with water
 *  stress (0–1) and hunger (the share of its nutrients it's short, 0–1), blackened by frost (0–1) and browned by blight
 *  (0–1). */
export function leaves(pal: Palette, base: Paint, opts: {ready: boolean; stress: number; hunger: number; burnt: number; blight: number}): Leaves {
  let top = opts.ready ? mix(base, pal['leaf-ripe'], 0.6) : base, under = pal['leaf-dark'];
  const yellow = Math.min(1, opts.stress + 0.7 * opts.hunger);
  if (opts.burnt > 0) {
    top = mix(top, pal.blackened, opts.burnt);
    under = mix(under, pal.blackened, opts.burnt);
  } else if (yellow > 0) {
    top = mix(top, pal.wilt, yellow);
    under = mix(under, pal.wilt, yellow * 0.7);
  }
  if (opts.blight > 0) {
    top = mix(top, pal.blight, opts.blight);
    under = mix(under, pal.blight, opts.blight * 0.8);
  }
  return {top, under};
}

/** The outline of a shape, as points round (x, y) with a radius: a rosette's lobes, a fan's blades, a bush's blob. */
function outline(shape: Shape, x: number, y: number, rad: number, phase: number, droop: number): number[] {
  const pts: number[] = [];
  const lobes = shape === 'rosette' ? 6 : shape === 'flower' ? 5 : shape === 'blades' ? 5 : 3;
  const depth = shape === 'blades' ? 0.75 : shape === 'rosette' || shape === 'flower' ? 0.3 : 0.15;
  const n = shape === 'blades' ? lobes * 2 : 24;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + phase;
    const k = shape === 'blades' ? (i % 2 ? 1 - depth : 1) : 1 - depth * (0.5 - 0.5 * Math.cos(lobes * (a - phase)));
    // drooping: the leaves sag towards the ground, so the outline squashes and drops a little
    pts.push(x + Math.cos(a) * rad * k, y + Math.sin(a) * rad * k * (1 - 0.25 * droop) + droop * rad * 0.15);
  }
  return pts;
}

/**
 * One plant at (x, y) with a radius in pixels, at a scale s (px a metre): the shaded shape, then its lit top offset up
 * and left, a sheen when ready, and the flower's head. A plant smaller than a pixel or so is a dot.
 */
export function plant(g: Graphics, shape: Shape, x: number, y: number, rad: number, pal: Palette, colours: Leaves, opts: {ready: boolean; droop: number; phase: number; bloom?: boolean}) {
  if (rad < 1.2) {
    g.circle(x, y, Math.max(0.8, rad)).fill(colours.top);
    return;
  }
  g.poly(outline(shape, x, y, rad, opts.phase, opts.droop)).fill(colours.under);
  const lift = shape === 'blades' ? 0.55 : 0.72;
  g.poly(outline(shape, x - rad * 0.15, y - rad * 0.2, rad * lift, opts.phase + 0.3, opts.droop)).fill(colours.top);
  if (opts.bloom) g.circle(x, y - rad * 0.2, rad * 0.45).fill(pal.marigold);
  if (opts.ready && rad > 3) g.circle(x - rad * 0.35, y - rad * 0.4, Math.max(1, rad * 0.16)).fill(pal.sheen);
}

/** A seedling: two seed leaves either side of a point. */
export function seedling(g: Graphics, x: number, y: number, rad: number, pal: Palette) {
  const r = Math.max(1, rad);
  g.ellipse(x - r * 0.7, y, r * 0.7, r * 0.45);
  g.ellipse(x + r * 0.7, y, r * 0.7, r * 0.45);
  g.fill(pal.seedling);
}

/** A sward (green manure): a soft cover over the bed, its colour, with tufts across it. */
export function sward(g: Graphics, r: {x: number; y: number; w: number; h: number}, s: number, colours: Leaves, cover: number, tufts: number, at: (i: number) => [number, number]) {
  const inset = 0.1 * s;
  g.roundRect(r.x + inset, r.y + inset, r.w - 2 * inset, r.h - 2 * inset, 0.12 * s).fill({color: colours.under.color, alpha: 0.35 + 0.55 * cover});
  const len = Math.max(1.5, 0.1 * s * (0.4 + 0.6 * cover)), wide = Math.max(1, 0.03 * s);
  for (let i = 0; i < tufts; i++) {
    const [x, y] = at(i);
    g.poly([x - wide, y + len * 0.3, x + wide, y + len * 0.3, x + (i % 3 - 1) * len * 0.3, y - len]);
  }
  g.fill(colours.top);
}
