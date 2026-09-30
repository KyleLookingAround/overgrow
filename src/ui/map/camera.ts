// The map's camera (docs/specs/one-map.md, "What they see"; docs/briefs/one-map-spike.md, item 1): the player's zoom over
// a level's widest view, from the whole level (the garden to its fence, the whole allotment) in to one of its places
// filling the view (a bed in the garden, a plot at the allotment). A page setting, never game state: nothing here changes
// the game. How far in it is sets the clock's pace (src/app/clock-loop.ts's setZoom, src/data/ladder.ts's
// secondsPerDayAt), and detail comes by size on screen (detailAlpha): a place's inside shows as it grows big enough to
// see and fades the same way. Pure, so the checks and the tests can ask it where things are. docs/systems/map.md.
import type {Box, GraphNode} from '../../sim/graph';

/** Metres to CSS pixels: x = cam.x + metres × cam.s. */
export interface Camera {
  x: number;
  y: number;
  s: number;
}

/** The player's zoom: `k` times closer than the level's widest view (1 at the widest), centred on a point in metres. */
export interface Zoom {
  k: number;
  x: number;
  y: number;
}

/** The kind of place each level zooms in to at its closest: a bed in the garden, a plot at the allotment. Levels without
 *  one don't zoom yet (each part that builds a level adds its band). */
export const UNIT: Readonly<Record<number, string>> = {1: 'bed', 2: 'plot'};

/** How much of the view a place fills at the closest zoom, and the width on screen, px, over which a place's inside fades
 *  in (a plot's beds, a bed's plants). */
const FILL = 0.92;
export const DETAIL_PX = {from: 120, to: 240} as const;

/** The rectangle every node with a box fits in, metres, or null with none. */
export function boundsOf(nodes: readonly GraphNode[]): Box | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes) {
    const b = n.box;
    if (!b) continue;
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w);
    y1 = Math.max(y1, b.y + b.h);
  }
  return Number.isFinite(x0) ? {x: x0, y: y0, w: x1 - x0, h: y1 - y0} : null;
}

/** Fits a rectangle, metres, on a w × h canvas with a margin, centred: the level's widest view. */
export function fit(b: Box, w: number, h: number): Camera {
  const margin = Math.min(w, h) * 0.04;
  const s = Math.max(0.01, Math.min((w - 2 * margin) / Math.max(1e-6, b.w), (h - 2 * margin) / Math.max(1e-6, b.h)));
  return {x: (w - b.w * s) / 2 - b.x * s, y: (h - b.h * s) / 2 - b.y * s, s};
}

/** The widest view: the whole level, centred. */
export const widest = (b: Box): Zoom => ({k: 1, x: b.x + b.w / 2, y: b.y + b.h / 2});

/** The camera a zoom gives on a w × h canvas. */
export function viewOf(b: Box, w: number, h: number, z: Zoom): Camera {
  const s = fit(b, w, h).s * z.k;
  return {x: w / 2 - z.x * s, y: h / 2 - z.y * s, s};
}

/** How close the camera goes at a level: until the smallest of its places the level zooms in to fills the view; 1 (no
 *  zoom) at a level without one. */
export function closest(nodes: readonly GraphNode[], level: number, b: Box, w: number, h: number): number {
  const kind = UNIT[level];
  let most = 1;
  if (!kind) return most;
  const base = fit(b, w, h).s;
  for (const n of nodes) if (n.kind === kind && n.box) most = Math.max(most, (Math.min(w / n.box.w, h / n.box.h) * FILL) / base);
  return most;
}

/** A zoom kept inside its level: between the widest view and the closest, and never showing past the level's edge
 *  (the level sets the camera's limit: nothing beyond it is drawn), so every view lies inside the widest one. */
export function clampZoom(z: Zoom, b: Box, w: number, h: number, most: number): Zoom {
  const k = Math.min(most, Math.max(1, z.k)), s = fit(b, w, h).s * k, hw = w / 2 / s, hh = h / 2 / s;
  const along = (c: number, lo: number, size: number, half: number) => (size <= 2 * half ? lo + size / 2 : Math.min(lo + size - half, Math.max(lo + half, c)));
  return {k, x: along(z.x, b.x, b.w, hw), y: along(z.y, b.y, b.h, hh)};
}

/** Zooms by a factor about a point on screen, px, which stays where it is (a pinch's middle, the wheel's pointer). */
export function zoomAbout(z: Zoom, factor: number, sx: number, sy: number, b: Box, w: number, h: number, most: number): Zoom {
  const c = viewOf(b, w, h, z), mx = (sx - c.x) / c.s, my = (sy - c.y) / c.s;
  const k = Math.min(most, Math.max(1, z.k * factor)), s = fit(b, w, h).s * k;
  return clampZoom({k, x: mx - (sx - w / 2) / s, y: my - (sy - h / 2) / s}, b, w, h, most);
}

/** Moves the view by a drag of dx, dy px: the ground follows the finger. */
export function panBy(z: Zoom, dx: number, dy: number, b: Box, w: number, h: number, most: number): Zoom {
  const s = fit(b, w, h).s * z.k;
  return clampZoom({k: z.k, x: z.x - dx / s, y: z.y - dy / s}, b, w, h, most);
}

/** The zoom at which a place fills the view, centred on it. */
export function fillWith(box: Box, b: Box, w: number, h: number, most: number): Zoom {
  const k = (Math.min(w / box.w, h / box.h) * FILL) / fit(b, w, h).s;
  return clampZoom({k, x: box.x + box.w / 2, y: box.y + box.h / 2}, b, w, h, most);
}

/** How far in the camera is, 0 at the level's widest view to 1 at its closest, in log space (each pinch the same step):
 *  the clock's pace follows it. */
export const depth = (z: Zoom, most: number): number => (most > 1 ? Math.min(1, Math.max(0, Math.log(z.k) / Math.log(most))) : 0);

/** The place the camera has zoomed into, for the breadcrumb: once past halfway in, the level's place under the view's
 *  centre (or the nearest), else null. */
export function placeIn(nodes: readonly GraphNode[], level: number, z: Zoom, most: number): GraphNode | null {
  const kind = UNIT[level];
  if (!kind || depth(z, most) < 0.5) return null;
  let best: GraphNode | null = null, d = Infinity;
  for (const n of nodes) {
    if (n.kind !== kind || !n.box) continue;
    const b = n.box, dx = Math.max(b.x - z.x, 0, z.x - b.x - b.w), dy = Math.max(b.y - z.y, 0, z.y - b.y - b.h), e = dx * dx + dy * dy;
    if (e < d) {
      d = e;
      best = n;
    }
  }
  return best;
}

/** Between two zooms, 0 at the first and 1 at the second: the scale in log space, so a flight's zoom looks even. */
export function between(a: Zoom, b: Zoom, e: number): Zoom {
  return {k: Math.exp(Math.log(a.k) + (Math.log(b.k) - Math.log(a.k)) * e), x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e};
}

/** How much of a place's inside shows at its width on screen, px: none while it's too small to see, all once it's big. */
export function detailAlpha(px: number): number {
  const t = Math.min(1, Math.max(0, (px - DETAIL_PX.from) / (DETAIL_PX.to - DETAIL_PX.from)));
  return t * t * (3 - 2 * t);
}

/** The camera that draws a place's own layout (a kept garden's, or one drawn from a plot's totals) inside its box on a
 *  camera: fitted to the box, centred, with no margin. */
export function inside(layout: Box, box: Box, c: Camera): Camera {
  const s = c.s * Math.min(box.w / layout.w, box.h / layout.h);
  const x = c.x + (box.x + box.w / 2) * c.s - (layout.x + layout.w / 2) * s, y = c.y + (box.y + box.h / 2) * c.s - (layout.y + layout.h / 2) * s;
  return {x, y, s};
}
