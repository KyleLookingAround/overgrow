// How each kind of node is drawn, in the owner's pick of art style (docs/specs/overgrow/art-styles.html, style A):
// flat, top-down and soft, rounded shapes with no outlines and soft shadows, in greens, soil browns and cream. Shapes
// are drawn in CSS pixels through the camera, so they stay crisp at any zoom. Colours come from the tokens (palette.ts).
// The weather and the soil are drawn from the snapshot's day of weather and each bed's water, never announced.
import type {Graphics} from 'pixi.js';
import {START} from '../../data/ladder';
import {calendar} from '../../sim/clock';
import type {Box, GraphNode} from '../../sim/graph';
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
  return k;
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
    case 'bench':
      g.rect(r.x, r.y, r.w, r.h).fill(pal['bed-dug']);
      return;
    default:
      soft(g, r, round, c, pal);
      g.roundRect(r.x, r.y, r.w, r.h, round).fill(pal.shed);
  }
}

/** The day of weather a snapshot carries on its air node, or null. */
const dayOf = (s: Snapshot) => (s.nodes.find((n) => n.kind === 'atmosphere')?.levers.weather as unknown as WeatherDay | null | undefined) ?? null;

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
export const soilColour = (wet: number, pal: Palette) => (wet < 0 ? mix(pal['bed-dug'], pal['bed-dry'], -wet) : mix(pal['bed-dug'], pal['bed-wet'], wet));

/** What changes tick by tick without moving: the soil in the dug beds, the water in a butt, and the frost. */
export function drawLive(g: Graphics, v: View, c: Camera, pal: Palette, w = weatherAt(v)): {soil: Record<string, number>; frost: number} {
  const soil: Record<string, number> = {};
  for (const n of v.cur.nodes) {
    if (n.kind !== 'bed' || !n.box || !isDug(n)) continue;
    const was = v.prev.nodes.find((p) => p.id === n.id), now = wetness(n), wet = was ? wetness(was) + (now - wetness(was)) * v.alpha : now;
    const r = px(n.box, c);
    g.roundRect(r.x, r.y, r.w, r.h, 0.175 * c.s).fill(soilColour(wet, pal));
    soil[n.id] = wet;
  }
  for (const n of v.cur.nodes) {
    if (n.kind !== 'butt' || !n.box) continue;
    const fill = (node: GraphNode | undefined) => {
      const w = node?.stocks.water;
      return w && w.cap ? Math.min(1, Math.max(0, w.amount / w.cap)) : 0;
    };
    const was = fill(v.prev.nodes.find((p) => p.id === n.id)), now = fill(n), f = was + (now - was) * v.alpha;
    if (f <= 0) continue;
    const r = px(n.box, c);
    g.circle(r.x + r.w / 2, r.y + r.h / 2, (r.w / 2) * 0.67 * Math.sqrt(f)).fill(pal.water);
  }
  // a pale rime over the garden while the grass is below 0 °C, harder the colder it is
  const frost = (w?.hour.frost ?? 0) * pal.frostMax, lawn = v.cur.nodes.find((n) => n.kind === 'lawn')?.box;
  if (frost > 0 && lawn) {
    const r = px(lawn, c);
    g.rect(r.x, r.y, r.w, r.h).fill({color: pal.frost.color, alpha: frost});
  }
  return {soil, frost};
}

/** A person from above, about 0.4 m across, drawn at a scale in pixels per metre, centred on (0, 0) at their feet. */
export function drawPerson(g: Graphics, s: number, pal: Palette) {
  g.ellipse(0, 0.175 * s, 0.2 * s, 0.08 * s).fill(pal['shadow-deep']);
  g.ellipse(0, 0, 0.17 * s, 0.21 * s).fill(pal.person);
  g.circle(0, -0.09 * s, 0.12 * s).fill(pal.skin);
  g.arc(0, -0.11 * s, 0.15 * s, Math.PI, 0).fill(pal.hat);
}
