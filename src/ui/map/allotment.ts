// The allotment on the map (level 2), drawn with the style kit (src/ui/map/kit.ts, plants.ts; docs/specs/map-art.md), the
// kit's first second level: each plot a tile of dug soil tinted by its Health (from the dry soil of a poor one to the
// dark loam of a good one) with rows of plants as many as its Output fills, their leaves yellowing as Health falls, the
// neglected plot gone to grass and weeds, the player's plot outlined; the sheds with their roofs, and the trough with its
// water. The paths are the kit's gravel, the grass between the plots the kit's lawn, and a hedge runs round the whole
// site (drawGround in draw.ts). The plots' numbers are the page's labels over the map (src/ui/PlotLabels.tsx); the
// people walking to their plots are the renderer's movers, from the allotment's activities. Nothing drawn changes the
// game.
import type {Graphics} from 'pixi.js';
import {PLAYER_PLOT} from '../../data/allotment';
import type {GraphNode} from '../../sim/graph';
import type {Camera} from './draw';
import * as kit from './kit';
import type {Paint, Palette} from './palette';
import {leaves, plant} from './plants';
import {drawQueue, drawSeasonPlot, seasonKey} from './season';

const px = (n: GraphNode, c: Camera) => ({x: c.x + n.box!.x * c.s, y: c.y + n.box!.y * c.s, w: n.box!.w * c.s, h: n.box!.h * c.s});

/** Two colours mixed, 0 all the first, 1 all the second. */
export const blend = (a: Paint, b: Paint, t: number): Paint => kit.mix(a, b, t);

/** The kg a day that fills a tile with rows. */
const FULL_KG = 0.5;
const holderNeglected = (n: GraphNode) => (n.levers.holder as {neglected?: boolean} | undefined)?.neglected === true;

/** What the allotment's ground depends on beside the graph's revision: each plot's Health and Output, coarsely. */
export function allotmentKey(nodes: readonly GraphNode[]): string {
  let k = '';
  for (const n of nodes) if (n.kind === 'plot') k += `${Math.round(n.totals.health / 4)}.${Math.round((n.totals.output / FULL_KG) * 8)},`;
  return k + seasonKey(nodes);
}

/** Draws an allotment node if it is one, and says whether it did. */
export function drawAllotmentNode(g: Graphics, n: GraphNode, c: Camera, pal: Palette, seed = 0): boolean {
  if (n.kind !== 'plot' && n.kind !== 'sheds' && n.kind !== 'trough') return false;
  const r = px(n, c), s = c.s, round = 0.175 * s;
  if (n.kind === 'sheds') {
    // two sheds, one above the other, with a gap between
    const h = r.h / 2 - 0.3 * s;
    for (const y of [r.y, r.y + r.h / 2 + 0.3 * s]) kit.shed(g, {x: r.x, y, w: r.w, h}, s, pal);
    return true;
  }
  if (n.kind === 'trough') {
    const full = Math.min(1, (n.stocks.water?.amount ?? 0) / (n.stocks.water?.cap ?? 1)), inset = 0.15 * s;
    kit.shadow(g, r, 0.2 * s, s, pal);
    g.roundRect(r.x, r.y, r.w, r.h, 0.2 * s).fill(pal.tank);
    g.roundRect(r.x + inset * 0.5, r.y + inset * 0.5, r.w - inset, r.h * 0.3, 0.1 * s).fill(pal['butt-rim']);
    g.roundRect(r.x + inset, r.y + inset, (r.w - 2 * inset) * Math.max(0.1, full), r.h - 2 * inset, 0.1 * s).fill(pal.water);
    drawQueue(g, n, c, pal); // the queue for the trough in a dry spell (part 8, src/ui/map/season.ts)
    return true;
  }
  // a plot: dug soil tinted by Health, rows of plants for its Output, weeds where it's neglected
  const health = Math.min(1, Math.max(0, n.totals.health / 100)), neglected = holderNeglected(n) || n.totals.health < 30;
  kit.shadow(g, r, round, s, pal);
  kit.soil(g, r, s, pal, kit.mix(pal['bed-dry'], pal['bed-dug'], (n.totals.health - 25) / 45));
  const rows = Math.max(1, Math.min(8, Math.round((n.totals.output / FULL_KG) * 8))), pad = 0.8 * s, gap = (r.h - 2 * pad) / 8;
  // the plants: a rosette a plant, its green fuller the healthier the plot and yellowing as it fails
  const colours = leaves(pal, kit.mix(pal['leaf-light'], pal.leaf, health), {ready: false, stress: 0, hunger: Math.min(0.6, 1 - health), burnt: 0, blight: 0});
  const across = Math.max(4, Math.floor((r.w - 2 * pad) / (0.6 * s))), cw = (r.w - 2 * pad) / across, rad = Math.min(cw, gap) * 0.42;
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < across; j++)
      plant(g, 'rosette', r.x + pad + cw * (j + 0.5), r.y + pad + gap * (i + 0.5), rad, pal, colours, {ready: false, droop: 0, phase: ((i * 5 + j * 3) % 6) * 0.5});
  if (neglected) {
    // weeds: the grass coming back over it in clumps, with tufts
    for (let i = 0; i < 18; i++) {
      const fx = kit.scatter(seed, n.id, i), fy = kit.scatter(seed, n.id, 100 + i);
      g.circle(r.x + pad + fx * (r.w - 2 * pad), r.y + pad + fy * (r.h - 2 * pad), (0.45 + 0.3 * kit.scatter(seed, n.id, 200 + i)) * s);
    }
    g.fill(pal['bed-grass']);
    const len = Math.max(2, 0.25 * s), wide = Math.max(1, 0.05 * s);
    for (let i = 0; i < 40; i++) {
      const x = r.x + pad + kit.scatter(seed, n.id, 300 + i) * (r.w - 2 * pad), y = r.y + pad + kit.scatter(seed, n.id, 400 + i) * (r.h - 2 * pad), a = (kit.scatter(seed, n.id, 500 + i) - 0.5) * 1.2;
      g.poly([x - wide, y + len * 0.3, x + wide, y + len * 0.3, x + Math.sin(a) * len, y - Math.cos(a) * len]);
    }
    g.fill(pal['lawn-tuft']);
  }
  drawSeasonPlot(g, n, c, pal); // the season's marks on a plot (part 8)
  if (n.id === PLAYER_PLOT) g.roundRect(r.x - 0.15 * s, r.y - 0.15 * s, r.w + 0.3 * s, r.h + 0.3 * s, round + 0.15 * s).stroke({width: Math.max(2, 0.2 * s), color: pal.pulse.color, alpha: 1});
  return true;
}
