// The allotment on the map (level 2), in the owner's flat, top-down, soft style: each plot a tile tinted by its Health
// (from the dry soil of a poor one to the lawn's green of a good one) with rows of crop as many as its Output fills, the
// neglected plot gone to weeds, the player's plot outlined; the sheds, and the trough with its water. The paths are the
// garden's path. The plots' numbers are the page's labels over the map (src/ui/PlotLabels.tsx); the people walking to
// their plots are the renderer's movers, from the allotment's activities. Nothing drawn changes the game.
import type {Graphics} from 'pixi.js';
import {PLAYER_PLOT} from '../../data/allotment';
import type {GraphNode} from '../../sim/graph';
import type {Camera} from './draw';
import type {Paint, Palette} from './palette';
import {drawQueue, drawSeasonPlot, seasonKey} from './season';

const px = (n: GraphNode, c: Camera) => ({x: c.x + n.box!.x * c.s, y: c.y + n.box!.y * c.s, w: n.box!.w * c.s, h: n.box!.h * c.s});

/** Two colours mixed, 0 all the first, 1 all the second. */
export function blend(a: Paint, b: Paint, t: number): Paint {
  const k = Math.min(1, Math.max(0, t)), ch = (s: number) => Math.round((((a.color >> s) & 255) * (1 - k)) + (((b.color >> s) & 255) * k));
  return {color: (ch(16) << 16) | (ch(8) << 8) | ch(0), alpha: a.alpha + (b.alpha - a.alpha) * k};
}

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
export function drawAllotmentNode(g: Graphics, n: GraphNode, c: Camera, pal: Palette): boolean {
  if (n.kind !== 'plot' && n.kind !== 'sheds' && n.kind !== 'trough') return false;
  const r = px(n, c), round = 0.3 * c.s;
  if (n.kind === 'sheds') {
    const h = r.h / 2 - 0.3 * c.s;
    for (const y of [r.y, r.y + r.h / 2 + 0.3 * c.s]) {
      g.roundRect(r.x + 0.1 * c.s, y + 0.15 * c.s, r.w, h, 0.2 * c.s).fill(pal['shadow-deep']);
      g.roundRect(r.x, y, r.w, h, 0.2 * c.s).fill(pal.shed);
      g.roundRect(r.x, y, r.w, h / 2, 0.2 * c.s).fill(pal['shed-roof']);
    }
    return true;
  }
  if (n.kind === 'trough') {
    const full = Math.min(1, (n.stocks.water?.amount ?? 0) / (n.stocks.water?.cap ?? 1)), inset = 0.15 * c.s;
    g.roundRect(r.x + 0.08 * c.s, r.y + 0.12 * c.s, r.w, r.h, 0.2 * c.s).fill(pal.shadow);
    g.roundRect(r.x, r.y, r.w, r.h, 0.2 * c.s).fill(pal.tank);
    g.roundRect(r.x + inset, r.y + inset, (r.w - 2 * inset) * Math.max(0.1, full), r.h - 2 * inset, 0.1 * c.s).fill(pal.water);
    drawQueue(g, n, c, pal);
    return true;
  }
  // a plot: its ground tinted by Health, rows of crop for its Output, weeds where it's neglected
  const health = n.totals.health / 100, neglected = holderNeglected(n) || n.totals.health < 30;
  g.roundRect(r.x + 0.1 * c.s, r.y + 0.15 * c.s, r.w, r.h, round).fill(pal.shadow);
  g.roundRect(r.x, r.y, r.w, r.h, round).fill(blend(pal['bed-dry'], pal['bed-dug'], (n.totals.health - 25) / 45));
  const rows = Math.max(1, Math.min(8, Math.round((n.totals.output / FULL_KG) * 8))), pad = 0.8 * c.s, gap = (r.h - 2 * pad) / 8;
  const leaf = blend(pal['leaf-light'], pal.leaf, health);
  for (let i = 0; i < rows; i++) g.roundRect(r.x + pad, r.y + pad + i * gap + gap * 0.25, r.w - 2 * pad, gap * 0.5, gap * 0.25).fill(leaf);
  if (neglected)
    // weeds: the lawn's grass coming back over it, in clumps
    for (let i = 0; i < 18; i++) {
      const fx = ((i * 7919) % 97) / 97, fy = ((i * 104729) % 89) / 89;
      g.circle(r.x + pad + fx * (r.w - 2 * pad), r.y + pad + fy * (r.h - 2 * pad), (0.45 + 0.3 * ((i * 31) % 7) / 7) * c.s).fill(pal['bed-grass']);
    }
  drawSeasonPlot(g, n, c, pal);
  if (n.id === PLAYER_PLOT) g.roundRect(r.x - 0.15 * c.s, r.y - 0.15 * c.s, r.w + 0.3 * c.s, r.h + 0.3 * c.s, round + 0.15 * c.s).stroke({width: Math.max(2, 0.2 * c.s), color: pal.pulse.color, alpha: 1});
  return true;
}
