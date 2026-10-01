// The style kit every level's map draws with (docs/specs/map-art.md): the ground, the paths, the walls, the sheds, the
// water, the figures and the small life, each a function of a rectangle in CSS pixels, a scale in pixels per metre and
// the palette, so the garden's beds, the allotment's plots and the smallholding's fields are the same drawing at their
// own size. The style is the owner's pick, flat, top-down and soft (docs/specs/overgrow/art-styles.html, style A): rounded
// shapes with no outlines, light from the top left, soft shadows down and to the right. Every colour is a --map-* token
// (palette.ts). Scatter is seeded from the game's seed, so a screenshot repeats; nothing here changes the game.
import type {Graphics} from 'pixi.js';
import type {Paint, Palette} from './palette';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A number in [0, 1) from the game's seed, a place and an index: the same every frame (cosmetic). */
export function scatter(seed: number, id: string, i: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  for (let k = 0; k < id.length; k++) h = Math.imul(h ^ id.charCodeAt(k), 0x01000193);
  h = Math.imul(h ^ (i + 1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Two paints mixed, k of the way from a to b (the alpha is a's). */
export function mix(a: Paint, b: Paint, k: number): Paint {
  const ch = (x: number, sh: number) => (x >> sh) & 255, t = Math.min(1, Math.max(0, k));
  let out = 0;
  for (const sh of [16, 8, 0]) out |= Math.round(ch(a.color, sh) + (ch(b.color, sh) - ch(a.color, sh)) * t) << sh;
  return {color: out, alpha: a.alpha};
}

/** Where the light comes from: every raised thing's shadow falls this far down and right, in metres. */
export const LIGHT = {dx: 0.06, dy: 0.09};

/** A soft contact shadow under a rounded shape. */
export function shadow(g: Graphics, r: Rect, radius: number, s: number, pal: Palette, deep = false) {
  g.roundRect(r.x + LIGHT.dx * s, r.y + LIGHT.dy * s, r.w, r.h, radius).fill(deep ? pal['shadow-deep'] : pal.shadow);
}

/** The lawn: grass with mowing stripes across it (alternate bands 0.6 m wide, a shade paler; none on rough grass) and a
 *  sparse scatter of tufts, seeded. The stripes run the long way. */
export function lawn(g: Graphics, r: Rect, s: number, pal: Palette, seed: number, id = 'lawn', stripes = true) {
  g.rect(r.x, r.y, r.w, r.h).fill(pal.lawn);
  if (stripes) {
    const band = 0.6 * s, along = r.w >= r.h, n = Math.ceil((along ? r.h : r.w) / band);
    for (let i = 0; i < n; i += 2) {
      if (along) g.rect(r.x, r.y + i * band, r.w, Math.min(band, r.h - i * band));
      else g.rect(r.x + i * band, r.y, Math.min(band, r.w - i * band), r.h);
    }
    g.fill(pal['lawn-stripe']);
  }
  // tufts: a small dark blade or two every square metre or so
  const m2 = (r.w * r.h) / (s * s), tufts = Math.min(300, Math.round(m2 * (m2 > 200 ? 0.3 : 1.0))), len = Math.max(2, 0.09 * s), wide = Math.max(1, 0.03 * s);
  for (let i = 0; i < tufts; i++) {
    const x = r.x + scatter(seed, id, i) * r.w, y = r.y + scatter(seed, id, 500 + i) * r.h, a = (scatter(seed, id, 1000 + i) - 0.5) * 1.2;
    g.poly([x - wide, y + len * 0.3, x + wide, y + len * 0.3, x + Math.sin(a) * len, y - Math.cos(a) * len]);
  }
  g.fill(pal['lawn-tuft']);
}

/** The hedge round the outside: the edge's green with leaf dabs along the garden's boundary, two rows deep. */
export function hedge(g: Graphics, garden: Rect, area: Rect, s: number, pal: Palette, seed: number) {
  g.rect(area.x, area.y, area.w, area.h).fill(pal.edge);
  const step = 0.32 * s, rad = 0.17 * s;
  if (rad < 1.5) return;
  const x0 = garden.x - rad * 0.4, x1 = garden.x + garden.w + rad * 0.4, y0 = garden.y - rad * 0.4, y1 = garden.y + garden.h + rad * 0.4;
  let i = 0;
  const dab = (x: number, y: number, dx: number, dy: number) => {
    for (let row = 0; row < 2; row++) {
      const k = scatter(seed, 'hedge', i++), off = (row + 0.6 + 0.5 * k) * rad * 1.3;
      g.circle(x + dx * off + (scatter(seed, 'hedge', i++) - 0.5) * rad * 0.6, y + dy * off + (scatter(seed, 'hedge', i++) - 0.5) * rad * 0.6, rad * (0.8 + 0.4 * k));
    }
  };
  for (let x = x0; x <= x1; x += step) {
    dab(x, y0, 0, -1);
    dab(x, y1, 0, 1);
  }
  for (let y = y0; y <= y1; y += step) {
    dab(x0, y, -1, 0);
    dab(x1, y, 1, 0);
  }
  g.fill(pal['hedge-leaf']);
}

/** A fence of timber panels along a line of posts, from (x0, y0) to (x1, y1), with a gap (a gate) between two distances
 *  along it in metres, if any. Posts every 1.8 m. */
export function fence(g: Graphics, x0: number, y0: number, x1: number, y1: number, s: number, pal: Palette, gap?: [number, number]) {
  const len = Math.hypot(x1 - x0, y1 - y0) / s;
  if (!(len > 0)) return;
  const ux = (x1 - x0) / (len * s), uy = (y1 - y0) / (len * s), t = Math.max(2, 0.12 * s);
  const seg = (a: number, b: number) => {
    const ax = x0 + ux * a * s, ay = y0 + uy * a * s, bx = x0 + ux * b * s, by = y0 + uy * b * s;
    g.moveTo(ax, ay).lineTo(bx, by).stroke({width: t, color: pal.fence.color, alpha: pal.fence.alpha, cap: 'round'});
  };
  if (gap) {
    seg(0, gap[0]);
    seg(gap[1], len);
  } else seg(0, len);
  const post = Math.max(2, 0.16 * s);
  for (let d = 0; d <= len + 1e-6; d += 1.8) {
    if (gap && d > gap[0] && d < gap[1]) continue;
    g.circle(x0 + ux * d * s, y0 + uy * d * s, post / 2);
  }
  g.fill(pal['fence-post']);
}

/** Dug soil: a rounded bed in a colour with a darker rim inside its edge. */
export function soil(g: Graphics, r: Rect, s: number, pal: Palette, colour: Paint) {
  const round = 0.175 * s, rim = Math.max(1, 0.06 * s);
  g.roundRect(r.x, r.y, r.w, r.h, round).fill(pal['soil-rim']);
  g.roundRect(r.x + rim, r.y + rim, r.w - 2 * rim, r.h - 2 * rim, round - rim * 0.6).fill(colour);
}

/** Crumbs of tilth over dug soil, seeded: drawn once over the soil's colour, which changes under them. */
export function tilth(g: Graphics, r: Rect, s: number, pal: Palette, seed: number, id: string) {
  const m2 = (r.w * r.h) / (s * s), n = Math.min(120, Math.round(m2 * (m2 > 20 ? 2 : 12))), pad = 0.1 * s, dot = Math.max(1, 0.028 * s);
  for (let i = 0; i < n; i++) {
    const x = r.x + pad + scatter(seed, id, 2000 + i) * (r.w - 2 * pad), y = r.y + pad + scatter(seed, id, 3000 + i) * (r.h - 2 * pad);
    g.ellipse(x, y, dot * (0.8 + 0.6 * scatter(seed, id, 4000 + i)), dot * 0.7);
  }
  g.fill(pal.tilth);
}

/** A gravel path: a soft darker edge under a warm top, with a few pale pebbles. */
export function path(g: Graphics, r: Rect, s: number, pal: Palette, seed: number, id: string) {
  const round = 0.2 * s, edge = Math.max(1, 0.05 * s);
  g.roundRect(r.x, r.y, r.w, r.h, round).fill(pal['path-edge']);
  g.roundRect(r.x + edge, r.y + edge, r.w - 2 * edge, r.h - 2 * edge, round - edge).fill(pal.path);
  const m2 = (r.w * r.h) / (s * s), n = Math.min(200, Math.round(m2 * 3)), dot = Math.max(1, 0.03 * s);
  for (let i = 0; i < n; i++) g.circle(r.x + edge * 2 + scatter(seed, id, 5000 + i) * (r.w - 4 * edge), r.y + edge * 2 + scatter(seed, id, 6000 + i) * (r.h - 4 * edge), dot * (0.7 + 0.6 * scatter(seed, id, 7000 + i)));
  g.fill(pal.pebble);
}

/** Puddles lying on a path, k of the way to full (0 none): a few ellipses of standing water. */
export function puddles(g: Graphics, r: Rect, s: number, pal: Palette, seed: number, id: string, k: number) {
  if (k <= 0.02) return;
  const m2 = (r.w * r.h) / (s * s), n = Math.min(40, Math.max(1, Math.round(m2 * 0.7))), inset = 0.12 * s;
  for (let i = 0; i < n; i++) {
    const x = r.x + inset + scatter(seed, id, 8000 + i) * (r.w - 2 * inset), y = r.y + inset + scatter(seed, id, 9000 + i) * (r.h - 2 * inset);
    const a = (0.12 + 0.12 * scatter(seed, id, 9500 + i)) * s * k, b = Math.min(a * 0.6, (r.h - 2 * inset) / 2);
    g.ellipse(x, y, a, Math.max(1, b));
  }
  g.fill({color: pal.puddle.color, alpha: pal.puddle.alpha * Math.min(1, k)});
}

/** The house's back wall along the top: rendered cream with the eave's shadow at its foot, a back door with a stone
 *  step in the middle, and a window either side. */
export function wall(g: Graphics, r: Rect, s: number, pal: Palette) {
  const edge = 0.075 * s;
  g.rect(r.x, r.y, r.w, r.h - edge).fill(pal.house);
  g.rect(r.x, r.y + r.h - edge, r.w, edge).fill(pal['house-edge']);
  const door = {w: 0.8 * s, h: Math.min(r.h - edge, 0.22 * s)}, cx = r.x + r.w / 2;
  g.roundRect(cx - door.w / 2, r.y + r.h - edge - door.h, door.w, door.h, 0.03 * s).fill(pal.door);
  g.roundRect(cx - door.w * 0.6, r.y + r.h - edge, door.w * 1.2, Math.max(1, 0.1 * s), 0.02 * s).fill(pal.step);
  const win = {w: 0.9 * s, h: Math.min(r.h - edge, 0.16 * s)};
  for (const wx of [r.x + r.w * 0.22, r.x + r.w * 0.72]) g.roundRect(wx - win.w / 2, r.y + r.h - edge - win.h, win.w, win.h, 0.02 * s).fill(pal.window);
}

/** A shed: timber walls under a pitched roof seen from above, its ridge along the long way, the left slope lit. */
export function shed(g: Graphics, r: Rect, s: number, pal: Palette) {
  const round = 0.15 * s;
  g.roundRect(r.x + 0.075 * s, r.y + 0.1 * s, r.w, r.h, round).fill(pal['shadow-deep']);
  g.roundRect(r.x, r.y, r.w, r.h, round).fill(pal.shed);
  const over = 0.06 * s, roof = {x: r.x - over, y: r.y - over, w: r.w + 2 * over, h: r.h + 2 * over};
  g.roundRect(roof.x, roof.y, roof.w, roof.h, round).fill(pal['shed-roof']);
  const along = roof.w >= roof.h;
  if (along) g.roundRect(roof.x, roof.y, roof.w, roof.h / 2, round).fill(pal['roof-lit']);
  else g.roundRect(roof.x, roof.y, roof.w / 2, roof.h, round).fill(pal['roof-lit']);
}

/** A compost heap: a timber rim round a mound of dark crumbs. */
export function heap(g: Graphics, r: Rect, s: number, pal: Palette, seed: number, id: string) {
  const inset = 0.12 * s;
  shadow(g, r, 0.15 * s, s, pal);
  g.roundRect(r.x, r.y, r.w, r.h, 0.15 * s).fill(pal['heap-rim']);
  g.roundRect(r.x + inset, r.y + inset, r.w - 2 * inset, r.h - 2 * inset, 0.12 * s).fill(pal.heap);
  const n = 14, dot = Math.max(1, 0.05 * s);
  for (let i = 0; i < n; i++) g.ellipse(r.x + inset * 1.5 + scatter(seed, id, i) * (r.w - 3 * inset), r.y + inset * 1.5 + scatter(seed, id, 100 + i) * (r.h - 3 * inset), dot * (0.6 + 0.8 * scatter(seed, id, 200 + i)), dot * 0.6);
  g.fill(pal['heap-crumb']);
}

/** A water butt from above: a barrel with a rim highlight on its lit side. Its water is drawn live over it. */
export function butt(g: Graphics, cx: number, cy: number, radius: number, s: number, pal: Palette) {
  g.circle(cx + LIGHT.dx * s, cy + LIGHT.dy * s, radius).fill(pal.shadow);
  g.circle(cx, cy, radius).fill(pal.butt);
  g.circle(cx - radius * 0.12, cy - radius * 0.12, radius * 0.78).fill(pal['butt-rim']);
  g.circle(cx, cy, radius * 0.68).fill(pal.butt);
}

/** A garden tap on its standpipe. */
export function tap(g: Graphics, r: Rect, s: number, pal: Palette) {
  g.roundRect(r.x + r.w * 0.3, r.y, r.w * 0.4, r.h, r.w * 0.1).fill(pal.tap);
  g.circle(r.x + r.w / 2, r.y + r.h * 0.3, r.w / 2).fill(pal.tap);
  g.circle(r.x + r.w * 0.42, r.y + r.h * 0.22, r.w * 0.16).fill(pal['butt-rim']);
}

/** Fallen leaves lying on the grass, n of them, seeded: two browns, each leaf a small pointed ellipse. */
export function fallenLeaves(g: Graphics, r: Rect, s: number, pal: Palette, seed: number, id: string, n: number, covered?: (x: number, y: number) => boolean) {
  const len = Math.max(2, 0.12 * s), wide = Math.max(1, 0.06 * s);
  for (const [tone, from] of [[pal['autumn-leaf'], 0], [pal['autumn-leaf-2'], 1]] as const) {
    for (let i = from; i < n; i += 2) {
      const x = r.x + scatter(seed, id, 10000 + i) * r.w, y = r.y + scatter(seed, id, 11000 + i) * r.h, a = scatter(seed, id, 12000 + i) * Math.PI;
      if (covered?.(x, y)) continue; // on a bed, a path or a roof, not the grass
      const c = Math.cos(a), sn = Math.sin(a);
      g.poly([x + c * len, y + sn * len, x - sn * wide, y + c * wide, x - c * len, y - sn * len, x + sn * wide, y - c * wide]);
    }
    g.fill(tone);
  }
}

/** A person from above, about 0.4 m across, centred on (0, 0) at their middle: a shadow, two feet (the forward one
 *  stepping in frames 1 and 2), a body, a head, and a hat (the gardener) or hair (the household). */
export function figure(g: Graphics, s: number, pal: Palette, who: 'gardener' | 'household', frame: 0 | 1 | 2) {
  g.ellipse(0.02 * s, 0.17 * s, 0.2 * s, 0.08 * s).fill(pal['shadow-deep']);
  const step = frame === 0 ? 0 : 0.07 * s, left = frame === 1 ? -step : frame === 2 ? step : 0;
  g.ellipse(-0.09 * s, 0.14 * s + left, 0.05 * s, 0.04 * s);
  g.ellipse(0.09 * s, 0.14 * s - left, 0.05 * s, 0.04 * s);
  g.fill(pal.foot);
  g.ellipse(0, 0, 0.17 * s, 0.21 * s).fill(who === 'gardener' ? pal.person : pal['person-2']);
  g.circle(0, -0.09 * s, 0.12 * s).fill(pal.skin);
  if (who === 'gardener') g.arc(0, -0.11 * s, 0.15 * s, Math.PI, 0).fill(pal.hat);
  else g.arc(0, -0.1 * s, 0.12 * s, Math.PI * 1.05, Math.PI * 1.95).fill(pal.hair);
}

/** A hen from above: body, a tail, a head with its comb, stepping. */
export function hen(g: Graphics, x: number, y: number, s: number, pal: Palette, facing: number, frame: 0 | 1) {
  const body = 0.13 * s, dx = Math.cos(facing), dy = Math.sin(facing);
  g.ellipse(x + LIGHT.dx * s * 0.5, y + LIGHT.dy * s * 0.5, body, body * 0.75).fill(pal.shadow);
  g.ellipse(x, y, body, body * 0.75).fill(pal.hen);
  g.poly([x - dx * body * 0.8 - dy * body * 0.25, y - dy * body * 0.8 + dx * body * 0.25, x - dx * body * 1.35, y - dy * body * 1.35 + (frame ? body * 0.1 : 0), x - dx * body * 0.8 + dy * body * 0.25, y - dy * body * 0.8 - dx * body * 0.25]).fill(pal['hen-tail']);
  const hx = x + dx * body * 0.85, hy = y + dy * body * 0.85;
  g.circle(hx, hy, body * 0.42).fill(pal.hen);
  g.circle(hx, hy - body * 0.3, body * 0.22).fill(pal.comb);
  g.circle(hx + dx * body * 0.45, hy + dy * body * 0.45, body * 0.14).fill(pal.beak);
}

/** A bee: a striped body with two pale wings. */
export function bee(g: Graphics, x: number, y: number, rad: number, pal: Palette, beat: number) {
  const w = rad * (0.9 + 0.3 * beat);
  g.ellipse(x - rad * 0.4, y - rad * 0.9, w, rad * 0.55);
  g.ellipse(x + rad * 0.4, y - rad * 0.9, w, rad * 0.55);
  g.fill(pal.wing);
  g.ellipse(x, y, rad * 1.3, rad).fill(pal.bee);
  g.rect(x - rad * 0.2, y - rad, rad * 0.4, rad * 2).fill(pal['bee-stripe']);
}

/** A slug: a body with a head end and two eye stalks. */
export function slug(g: Graphics, x: number, y: number, dir: number, len: number, wide: number, pal: Palette) {
  const dx = Math.cos(dir), dy = Math.sin(dir);
  g.ellipse(x, y, len / 2, wide / 2).fill(pal.slug);
  const hx = x + (dx * len) / 2, hy = y + (dy * len) / 2;
  g.circle(hx, hy, wide * 0.45).fill(pal.slug);
  const t = Math.max(1, wide * 0.18);
  for (const side of [-1, 1]) g.moveTo(hx, hy).lineTo(hx + dx * wide * 0.7 - dy * side * wide * 0.5, hy + dy * wide * 0.7 + dx * side * wide * 0.5).stroke({width: t, color: pal.slug.color});
}

/** A ladybird: a red back with a spot and a dark head. */
export function ladybird(g: Graphics, x: number, y: number, rad: number, pal: Palette, facing: number) {
  g.circle(x, y, rad).fill(pal.ladybird);
  g.circle(x, y, rad * 0.35).fill(pal['ladybird-spot']);
  g.circle(x + Math.cos(facing) * rad * 0.8, y + Math.sin(facing) * rad * 0.8, rad * 0.45).fill(pal['ladybird-spot']);
}

/** A butterfly: two pairs of wings either side of a thin body, the wings folding with the beat (0 flat, 1 closed). */
export function butterfly(g: Graphics, x: number, y: number, rad: number, pal: Palette, beat: number) {
  const open = rad * (1 - 0.7 * beat);
  g.ellipse(x - open * 0.7, y - rad * 0.35, open * 0.7, rad * 0.55);
  g.ellipse(x + open * 0.7, y - rad * 0.35, open * 0.7, rad * 0.55);
  g.ellipse(x - open * 0.55, y + rad * 0.4, open * 0.5, rad * 0.4);
  g.ellipse(x + open * 0.55, y + rad * 0.4, open * 0.5, rad * 0.4);
  g.fill(pal.butterfly);
  g.ellipse(x, y, rad * 0.12, rad * 0.8).fill(pal['bee-stripe']);
}

/** A robin: a round brown body, a red breast, a head with an eye and a tail. */
export function robin(g: Graphics, x: number, y: number, rad: number, pal: Palette, facing: number) {
  const dx = Math.cos(facing), dy = Math.sin(facing);
  g.poly([x - dx * rad * 0.8 - dy * rad * 0.2, y - dy * rad * 0.8 + dx * rad * 0.2, x - dx * rad * 1.5, y - dy * rad * 1.5, x - dx * rad * 0.8 + dy * rad * 0.2, y - dy * rad * 0.8 - dx * rad * 0.2]).fill(pal.robin);
  g.ellipse(x, y, rad, rad * 0.8).fill(pal.robin);
  g.circle(x + dx * rad * 0.35, y + dy * rad * 0.35, rad * 0.5).fill(pal['robin-breast']);
  g.circle(x + dx * rad * 0.85, y + dy * rad * 0.85, rad * 0.4).fill(pal.robin);
  g.circle(x + dx * rad * 0.95 - dy * rad * 0.15, y + dy * rad * 0.95 + dx * rad * 0.15, Math.max(0.6, rad * 0.1)).fill(pal.eye);
}

/** Steam rising off a warm heap in cold air: three soft puffs drifting up and fading, k the phase 0–1. */
export function steam(g: Graphics, x: number, y: number, s: number, pal: Palette, k: number) {
  for (let i = 0; i < 3; i++) {
    const p = (k + i / 3) % 1, rad = (0.1 + 0.18 * p) * s;
    g.circle(x + (i - 1) * 0.12 * s + Math.sin(p * 6 + i) * 0.05 * s, y - p * 0.6 * s, rad).fill({color: pal.steam.color, alpha: pal.steam.alpha * (1 - p)});
  }
}

/** A cane or a wire along a row: a thin tan line. */
export function cane(g: Graphics, x0: number, y0: number, x1: number, y1: number, s: number, pal: Palette) {
  g.moveTo(x0, y0).lineTo(x1, y1).stroke({width: Math.max(1, 0.03 * s), color: pal.cane.color, cap: 'round'});
}
