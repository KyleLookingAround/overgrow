// The allotment's first season on the map (part 8), over part 7's plots: weeds on a plot as its holder's week leaves it
// untended (and fewer as the second plot is reclaimed), slugs creeping onto the plots beside an untended one by the
// pressure the sim gives them, a short plot's crops paler in a dry spell, the queue at the trough when it leaves plots
// short, and the helper's barrow heaped a little beyond what they say they took. Each end state is drawn from the
// snapshot, so reduced motion shows it still. Nothing drawn changes the game.
import type {Graphics} from 'pixi.js';
import type {GraphNode} from '../../sim/graph';
import {keptOf, pressureOf, secondOf, waterOf} from '../../sim/season';
import type {Camera} from './draw';
import type {Palette} from './palette';

const px = (n: GraphNode, c: Camera) => ({x: c.x + n.box!.x * c.s, y: c.y + n.box!.y * c.s, w: n.box!.w * c.s, h: n.box!.h * c.s});
/** A fixed scatter in a tile, 0 to 1 each way: the same clumps every frame. */
const spot = (i: number) => ({fx: ((i * 7919) % 97) / 97, fy: ((i * 104729) % 89) / 89, r: ((i * 31) % 7) / 7});

/** How untended a plot is, 0 to 1: a neighbour's by their week, the second plot by what's left to reclaim. */
export function untended(n: GraphNode): number {
  const sp = secondOf(n);
  if (sp?.taken != null) return 1 - sp.reclaimed;
  const k = keptOf(n);
  return k ? Math.max(0, 1 - k.kept) : 0;
}
const shortOf = (n: GraphNode) => {
  const w = waterOf(n);
  return w && w.need > 0 ? Math.max(0, 1 - w.given / w.need) : 0;
};

/** What the season's ground depends on, coarsely: each plot's weeds, slugs and thirst, and the trough's queue. */
export function seasonKey(nodes: readonly GraphNode[]): string {
  let k = '';
  for (const n of nodes) {
    if (n.kind === 'plot') k += `${Math.round(untended(n) * 10)}.${Math.round(pressureOf(n) * 10)}.${Math.round(shortOf(n) * 4)},`;
    else if (n.kind === 'trough') k += `q${(n.levers.today as {short?: string[]} | null)?.short?.length ?? 0}`;
  }
  return k;
}

/** A plot's season on top of its tile: its thirst, its weeds and the slugs creeping in. */
export function drawSeasonPlot(g: Graphics, n: GraphNode, c: Camera, pal: Palette) {
  const r = px(n, c), pad = 0.8 * c.s, dry = shortOf(n);
  // a short plot's crops pale and wilt
  if (dry > 0.2) g.roundRect(r.x + pad, r.y + pad, r.w - 2 * pad, r.h - 2 * pad, 0.3 * c.s).fill({color: pal.wilt.color, alpha: 0.35 * dry});
  // weeds, as many clumps as it's untended
  const weeds = Math.round(untended(n) * 24);
  for (let i = 0; i < weeds; i++) {
    const s = spot(i + 5);
    g.circle(r.x + pad + s.fx * (r.w - 2 * pad), r.y + pad + s.fy * (r.h - 2 * pad), (0.35 + 0.3 * s.r) * c.s).fill(pal['bed-grass']);
  }
  // slugs from next door: along the edge nearest the plot's neighbours, as many as the pressure
  const slugs = Math.round(pressureOf(n) * 14);
  for (let i = 0; i < slugs; i++) {
    const s = spot(i + 40), edge = i % 4, t = s.fx;
    const x = edge === 0 ? r.x + t * r.w : edge === 1 ? r.x + r.w - 0.4 * c.s : edge === 2 ? r.x + t * r.w : r.x + 0.4 * c.s;
    const y = edge === 0 ? r.y + 0.4 * c.s : edge === 1 ? r.y + t * r.h : edge === 2 ? r.y + r.h - 0.4 * c.s : r.y + t * r.h;
    g.ellipse(x, y, 0.28 * c.s, 0.12 * c.s).fill(pal.slug);
  }
}

/** The queue at the trough: one figure for each plot it left short, lined up along the path beside it. */
export function drawQueue(g: Graphics, trough: GraphNode, c: Camera, pal: Palette) {
  const short = (trough.levers.today as {short?: string[]} | null)?.short?.length ?? 0;
  if (!short) return;
  const r = px(trough, c), s = Math.max(4, 0.45 * c.s);
  for (let i = 0; i < Math.min(8, short + 1); i++) {
    const x = r.x - (i + 1) * s * 1.1, y = r.y + r.h / 2;
    g.circle(x, y + 0.1 * s, 0.45 * s).fill(pal['shadow-deep']);
    g.circle(x, y, 0.42 * s).fill(pal.person);
    g.circle(x, y - 0.2 * s, 0.25 * s).fill(pal.skin);
  }
}

/** The helper's barrow: its heap by what they carry against what they said they took, so a little too full shows. */
export function drawBarrow(g: Graphics, carry: {amount: number; of?: number}, x: number, y: number, s: number, pal: Palette) {
  const full = carry.of && carry.of > 0 ? Math.min(1.6, carry.amount / carry.of) : 1;
  g.roundRect(x - 0.18 * s, y - 0.08 * s, 0.36 * s, 0.18 * s, 0.04 * s).fill(pal.can);
  g.circle(x + 0.2 * s, y + 0.1 * s, 0.05 * s).fill(pal['shadow-deep']);
  // the heap: a mound that grows past the barrow's rim when they carry more than they said
  g.ellipse(x, y - 0.08 * s, 0.17 * s, 0.1 * s * full).fill(pal.basket);
  g.ellipse(x, y - 0.1 * s - 0.04 * s * full, 0.1 * s, 0.06 * s * full).fill(pal['leaf-light']);
}
