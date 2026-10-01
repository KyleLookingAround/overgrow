// The land as organic parcels, drawn by code (docs/decisions/ADR-2026-10-01-organic-parcels.md; docs/specs/one-map.md,
// "Land as organic parcels"): from each field's outline, never its cells. A field filled by its use and its crop's stage on
// the day (src/data/land.ts's calendar: oilseed rape yellow in May, wheat gold in July, stubble in August, ploughed earth in
// autumn), furrows or tramlines across arable land at the field's own angle, clipped to it; a wood as overlapping
// canopies; the pond as water inside a soft shore; the yard as gravel with a house and a barn; and the hedges along every
// boundary between fields, smoothed, with the odd hedgerow tree. Drawn once into one Graphics and kept until the land or
// the stage changes (`landKey`). Every colour is a token (palette.ts). Nothing drawn changes the game.
import type {Graphics} from 'pixi.js';
import {stageOn, type CropStage} from '../../data/land';
import {hedges, outlines, type Field, type Land} from '../../sim/land';
import type {Camera} from './camera';
import * as kit from './kit';
import type {Paint, Palette} from './palette';

/** Hedges' width, m; furrows' and tramlines' spacing, m; a canopy's radius, m; and how often a hedgerow tree stands. */
const HEDGE_M = 2.6, FURROW_M = 6, TRAM_M = 24, CANOPY_M = [5, 9] as const, TREE_EVERY_M = 70;

/** Corner-cutting (Chaikin): a line's points smoothed, its ends kept unless it closes. */
export function smooth(pts: readonly number[], closed: boolean, rounds = 2): number[] {
  let p = [...pts];
  for (let r = 0; r < rounds; r++) {
    const n = p.length / 2, out: number[] = [];
    if (!closed) out.push(p[0]!, p[1]!);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const j = (i + 1) % n, x0 = p[2 * i]!, y0 = p[2 * i + 1]!, x1 = p[2 * j]!, y1 = p[2 * j + 1]!;
      out.push(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1, 0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1);
    }
    if (!closed) out.push(p[2 * n - 2]!, p[2 * n - 1]!);
    p = out;
  }
  return p;
}

/** Whether a point is inside any of a field's rings (even-odd, so a pond's hole counts out). */
export function inside(rings: readonly number[][], x: number, y: number): boolean {
  let hit = false;
  for (const r of rings)
    for (let i = 0, n = r.length / 2, j = n - 1; i < n; j = i++) {
      const xi = r[2 * i]!, yi = r[2 * i + 1]!, xj = r[2 * j]!, yj = r[2 * j + 1]!;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
  return hit;
}

/** A field's stripes at an angle, spacing apart, clipped to its rings: the segments, as x0, y0, x1, y1 in metres. */
export function stripes(rings: readonly number[][], angle: number, spacing: number): number[] {
  const dx = Math.cos(angle), dy = Math.sin(angle), out: number[] = [];
  let lo = Infinity, hi = -Infinity;
  for (const r of rings) for (let i = 0; i < r.length; i += 2) {
    const t = -dy * r[i]! + dx * r[i + 1]!;
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
  }
  for (let t = Math.ceil(lo / spacing) * spacing; t <= hi; t += spacing) {
    // where the line −dy·x + dx·y = t crosses the rings, in order along it
    const along: number[] = [];
    for (const r of rings)
      for (let i = 0, n = r.length / 2; i < n; i++) {
        const j = (i + 1) % n, x0 = r[2 * i]!, y0 = r[2 * i + 1]!, x1 = r[2 * j]!, y1 = r[2 * j + 1]!;
        const a = -dy * x0 + dx * y0 - t, b = -dy * x1 + dx * y1 - t;
        if ((a < 0) === (b < 0)) continue;
        const k = a / (a - b), x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
        along.push(dx * x + dy * y);
      }
    along.sort((p, q) => p - q);
    for (let i = 0; i + 1 < along.length; i += 2) {
      const s0 = along[i]!, s1 = along[i + 1]!;
      out.push(dx * s0 - dy * t, dy * s0 + dx * t, dx * s1 - dy * t, dy * s1 + dx * t);
    }
  }
  return out;
}

/** A field's own number from its id, for its angle and its trees (the same every time). */
const hashOf = (seed: number, id: string, k = 0) => kit.scatter(seed, id, k);

/** The colour a stage of an arable crop shows. */
const STAGE: Record<CropStage, 'field-ploughed' | 'field-drilled' | 'field-green' | 'field-ripe' | 'field-stubble'> = {
  ploughed: 'field-ploughed', drilled: 'field-drilled', green: 'field-green', flowering: 'field-green', ripe: 'field-ripe', stubble: 'field-stubble',
};
function fillOf(f: Field, day: number, pal: Palette): Paint {
  if (f.kind === 'grass') return pal['field-grass'];
  if (f.kind === 'wood') return pal.canopy;
  if (f.kind === 'water') return pal.water;
  if (f.kind === 'yard') return pal.path;
  const stage = stageOn(f.crop!, day);
  if (stage === 'flowering') return f.crop === 'oilseed-rape' ? pal['field-rape'] : f.crop === 'field-beans' ? pal['field-bean'] : pal['field-green'];
  return pal[STAGE[stage]];
}

/** What the land's drawing depends on: its fields and each arable field's stage on the day. */
export function landKey(land: Land, day: number): string {
  let k = `${land.seed}.${land.next}.${land.fields.length}`;
  for (const f of land.fields) k += f.kind === 'arable' ? `,${stageOn(f.crop!, day)}` : ',';
  return k;
}

/** The land drawn through a camera on the day of the year (1 to 366). */
export function drawLand(g: Graphics, land: Land, c: Camera, pal: Palette, day: number) {
  const s = c.s, X = (x: number) => c.x + x * s, Y = (y: number) => c.y + y * s;
  const ring = (pts: readonly number[]) => pts.map((v, i) => (i % 2 ? Y(v) : X(v)));
  g.rect(X(0), Y(0), land.w * s, land.h * s).fill(pal['field-grass']);
  for (const f of land.fields) {
    const raw = outlines(land, f), rings = raw.map((r) => smooth(r, true)), fill = fillOf(f, day, pal);
    // the fill, its corners rounded (the hedges cover where neighbours' rounding parts)
    for (const r of rings) g.poly(ring(r)).fill(f.kind === 'water' ? pal['path-edge'] : fill);
    if (f.kind === 'water') {
      // the pond: water inside its shore
      for (const r of raw) {
        const cx = r.filter((_, i) => i % 2 === 0).reduce((a, v) => a + v, 0) / (r.length / 2), cy = r.filter((_, i) => i % 2 === 1).reduce((a, v) => a + v, 0) / (r.length / 2);
        g.poly(ring(smooth(r.map((v, i) => (i % 2 ? cy + (v - cy) * 0.8 : cx + (v - cx) * 0.8)), true, 3))).fill(pal.water);
      }
      continue;
    }
    if (f.kind === 'arable') {
      // furrows across bare and young land, tramlines through a standing crop, at the field's own angle
      const stage = stageOn(f.crop!, day), tall = stage === 'flowering' || stage === 'ripe' || (stage === 'green' && f.crop !== 'potatoes');
      const spacing = tall ? TRAM_M : FURROW_M;
      if (spacing * s >= 3) {
        const lines = stripes(rings, hashOf(land.seed, f.id) * Math.PI, spacing);
        for (let i = 0; i < lines.length; i += 4) g.moveTo(X(lines[i]!), Y(lines[i + 1]!)).lineTo(X(lines[i + 2]!), Y(lines[i + 3]!));
        g.stroke({width: Math.max(1, (tall ? 0.6 : 0.9) * s), color: pal.furrow.color, alpha: pal.furrow.alpha});
      }
    }
    if (f.kind === 'wood' || f.kind === 'yard') {
      // the wood's canopies, or the yard's house and barn, placed inside the field by its own dice
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const r of rings) for (let i = 0; i < r.length; i += 2) (x0 = Math.min(x0, r[i]!), x1 = Math.max(x1, r[i]!), y0 = Math.min(y0, r[i + 1]!), y1 = Math.max(y1, r[i + 1]!));
      if (f.kind === 'yard') {
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        kit.shed(g, {x: X(cx - 14), y: Y(cy - 9), w: 12 * s, h: 9 * s}, s, pal);
        kit.shed(g, {x: X(cx + 2), y: Y(cy - 4), w: 16 * s, h: 11 * s}, s, pal);
        continue;
      }
      const tops: [number, number, number][] = [];
      for (let k = 0; k < 160 && tops.length < 70; k++) {
        const x = x0 + hashOf(land.seed, f.id, 10 + k) * (x1 - x0), y = y0 + hashOf(land.seed, f.id, 300 + k) * (y1 - y0);
        if (inside(rings, x, y)) tops.push([x, y, CANOPY_M[0] + hashOf(land.seed, f.id, 600 + k) * (CANOPY_M[1] - CANOPY_M[0])]);
      }
      for (const [x, y, r] of tops) g.circle(X(x), Y(y), r * s);
      g.fill(pal.canopy);
      for (const [x, y, r] of tops) g.circle(X(x - r * 0.2), Y(y - r * 0.25), r * 0.6 * s);
      g.fill(pal['canopy-lit']);
    }
  }
  // the hedges, along every boundary between fields and round the land, smoothed, with the odd tree standing in them
  const lines = hedges(land), trees: [number, number][] = [];
  for (const l of lines) {
    const p = ring(smooth(l.pts, l.closed));
    g.moveTo(p[0]!, p[1]!);
    for (let i = 2; i < p.length; i += 2) g.lineTo(p[i]!, p[i + 1]!);
    if (l.closed) g.closePath();
    let run = 0;
    for (let i = 2; i < l.pts.length; i += 2) {
      run += Math.hypot(l.pts[i]! - l.pts[i - 2]!, l.pts[i + 1]! - l.pts[i - 1]!);
      if (run >= TREE_EVERY_M && hashOf(land.seed, `tree${l.pts[i]!.toFixed(1)}`) < 0.5) (trees.push([l.pts[i]!, l.pts[i + 1]!]), (run = 0));
    }
  }
  g.stroke({width: Math.max(2, HEDGE_M * s), color: pal['hedge-leaf'].color, alpha: pal['hedge-leaf'].alpha, cap: 'round', join: 'round'});
  for (const [x, y] of trees) g.circle(X(x), Y(y), 4.5 * s);
  g.fill(pal.canopy);
  for (const [x, y] of trees) g.circle(X(x - 0.9), Y(y - 1.1), 2.6 * s);
  g.fill(pal['canopy-lit']);
}
