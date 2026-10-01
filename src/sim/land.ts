// The land as organic parcels (docs/decisions/ADR-2026-10-01-organic-parcels.md; docs/specs/one-map.md, "Land as organic
// parcels" and "Land that remembers"): a seeded mosaic of irregular cells over a rectangle of land, no grid and no two
// alike, with fields as connected sets of them that join (consolidation) and split into strips (inheritance) along the
// cells' own edges, conserving area by construction. The cells are never drawn: src/ui/map/land.ts draws the fields'
// outlines and the hedges between them. Pure, and built ahead of level 3: part 11 makes each field a node and saves the
// land's changes. docs/systems/land.md says how it works.
//
// The mosaic is a Voronoi diagram of jittered points relaxed by Lloyd's algorithm, cut by our own code: each cell is the
// land's rectangle clipped by the half-plane nearer its point than each other point. Vertices the cells share are snapped
// together, so every edge knows the cell across it (or the land's edge), which gives exact neighbours, outlines and hedges.
import {LAND, SMALLHOLDING, FIELD_CROPS, type FieldCrop, type FieldKind} from '../data/land';
import {rng, type Rng} from './random';

/** A cell of the mosaic: its point, its polygon as x, y pairs (m, y down), its area (m²) and, for each edge (vertex k to
 *  k + 1), the cell across it or -1 at the land's edge. */
export interface Cell {
  id: number;
  x: number;
  y: number;
  poly: number[];
  area: number;
  across: number[];
}

/** A field: a connected set of cells, with its kind and, if arable, its crop. */
export interface Field {
  id: string;
  kind: FieldKind;
  crop: FieldCrop | null;
  cells: number[];
}

/** A change to the land, for part 11 to save: the day, a join or a split, the fields it took and the ones it made. */
export interface LandChange {
  day: number;
  what: 'join' | 'split';
  from: string[];
  into: string[];
}

export interface Land {
  seed: number;
  /** The land's rectangle, m. */
  w: number;
  h: number;
  cells: Cell[];
  fields: Field[];
  /** Each cell's field, by index into `fields`' ids. */
  fieldOf: string[];
  changes: LandChange[];
  /** The next field's number. */
  next: number;
}

const EPS = 1e-6;

/** The polygon clipped to the half-plane where (p − m)·n ≤ 0 (Sutherland–Hodgman, one plane). */
function clip(poly: number[], mx: number, my: number, nx: number, ny: number): number[] {
  const out: number[] = [], n = poly.length / 2;
  const side = (i: number) => (poly[2 * i]! - mx) * nx + (poly[2 * i + 1]! - my) * ny;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = side(i), b = side(j);
    if (a <= 0) out.push(poly[2 * i]!, poly[2 * i + 1]!);
    if ((a < 0 && b > 0) || (a > 0 && b < 0)) {
      const t = a / (a - b);
      out.push(poly[2 * i]! + (poly[2 * j]! - poly[2 * i]!) * t, poly[2 * i + 1]! + (poly[2 * j + 1]! - poly[2 * i + 1]!) * t);
    }
  }
  return out;
}

/** A polygon's signed area (positive clockwise in y-down coordinates) and centroid. */
export function shoelace(poly: number[]): {area: number; cx: number; cy: number} {
  let a = 0, cx = 0, cy = 0;
  const n = poly.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, x0 = poly[2 * i]!, y0 = poly[2 * i + 1]!, x1 = poly[2 * j]!, y1 = poly[2 * j + 1]!, c = x0 * y1 - x1 * y0;
    a += c;
    cx += (x0 + x1) * c;
    cy += (y0 + y1) * c;
  }
  a /= 2;
  return Math.abs(a) < EPS ? {area: 0, cx: poly[0] ?? 0, cy: poly[1] ?? 0} : {area: a, cx: cx / (6 * a), cy: cy / (6 * a)};
}

/** Each point's Voronoi cell inside the rectangle. Near points first, and a cell stops clipping once the rest are too far
 *  to touch it. */
function voronoi(xs: number[], ys: number[], w: number, h: number): number[][] {
  const n = xs.length, cells: number[][] = [];
  for (let i = 0; i < n; i++) {
    const order = Array.from({length: n}, (_, j) => j).filter((j) => j !== i)
      .sort((a, b) => (xs[a]! - xs[i]!) ** 2 + (ys[a]! - ys[i]!) ** 2 - ((xs[b]! - xs[i]!) ** 2 + (ys[b]! - ys[i]!) ** 2));
    let poly = [0, 0, w, 0, w, h, 0, h];
    for (const j of order) {
      // a point more than twice the cell's furthest vertex away can't cut it
      let far = 0;
      for (let k = 0; k < poly.length; k += 2) far = Math.max(far, (poly[k]! - xs[i]!) ** 2 + (poly[k + 1]! - ys[i]!) ** 2);
      if ((xs[j]! - xs[i]!) ** 2 + (ys[j]! - ys[i]!) ** 2 > 4 * far) break;
      poly = clip(poly, (xs[i]! + xs[j]!) / 2, (ys[i]! + ys[j]!) / 2, xs[j]! - xs[i]!, ys[j]! - ys[i]!);
    }
    cells.push(poly);
  }
  return cells;
}

/** The cells, their vertices snapped together so shared edges match exactly, and each edge's cell across. */
function mosaic(polys: number[][], xs: number[], ys: number[]): Cell[] {
  const verts: number[] = [], bucket = new Map<string, number[]>(), SNAP = 1e-4, size = 0.01;
  const vertex = (x: number, y: number) => {
    const bx = Math.floor(x / size), by = Math.floor(y / size);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const v of bucket.get(`${bx + dx},${by + dy}`) ?? []) if (Math.abs(verts[2 * v]! - x) < SNAP && Math.abs(verts[2 * v + 1]! - y) < SNAP) return v;
    const v = verts.length / 2;
    verts.push(x, y);
    const key = `${bx},${by}`, list = bucket.get(key);
    if (list) list.push(v);
    else bucket.set(key, [v]);
    return v;
  };
  const rings = polys.map((p) => {
    const ids: number[] = [];
    for (let k = 0; k < p.length; k += 2) {
      const v = vertex(p[k]!, p[k + 1]!);
      if (ids[ids.length - 1] !== v) ids.push(v);
    }
    while (ids.length > 1 && ids[0] === ids[ids.length - 1]) ids.pop();
    return ids;
  });
  const owners = new Map<string, number[]>(), key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  rings.forEach((r, c) => r.forEach((v, k) => {
    const e = key(v, r[(k + 1) % r.length]!), list = owners.get(e);
    if (list) list.push(c);
    else owners.set(e, [c]);
  }));
  return rings.map((r, c) => {
    const poly = r.flatMap((v) => [verts[2 * v]!, verts[2 * v + 1]!]);
    const across = r.map((v, k) => owners.get(key(v, r[(k + 1) % r.length]!))!.find((o) => o !== c) ?? -1);
    return {id: c, x: xs[c]!, y: ys[c]!, poly, area: Math.abs(shoelace(poly).area), across};
  });
}

/** A seeded mosaic of irregular cells over a w × h rectangle, about cellM2 each. */
export function makeCells(seed: number, w: number, h: number, cellM2: number = LAND.cellM2, relax: number = LAND.relax): Cell[] {
  const dice = rng(seed ^ 0x51ed), n = Math.max(4, Math.round((w * h) / cellM2));
  const cols = Math.max(2, Math.round(Math.sqrt((n * w) / h))), rows = Math.max(2, Math.ceil(n / cols)), cw = w / cols, ch = h / rows;
  let xs: number[] = [], ys: number[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      xs.push((c + 0.1 + 0.8 * dice.next()) * cw);
      ys.push((r + 0.1 + 0.8 * dice.next()) * ch);
    }
  let polys = voronoi(xs, ys, w, h);
  for (let i = 0; i < relax; i++) {
    const c = polys.map(shoelace);
    xs = c.map((k) => k.cx);
    ys = c.map((k) => k.cy);
    polys = voronoi(xs, ys, w, h);
  }
  return mosaic(polys, xs, ys);
}

/** The cells' neighbours, from their shared edges. */
export const neighbours = (cells: readonly Cell[], c: number): number[] => [...new Set(cells[c]!.across.filter((a) => a >= 0))];

/** Grows a connected set of up to `size` free cells from one, the frontier picked by the dice. */
function grow(cells: readonly Cell[], free: Set<number>, from: number, size: number, dice: Rng): number[] {
  const got = [from], frontier = new Set<number>();
  free.delete(from);
  const add = (c: number) => {
    for (const n of neighbours(cells, c)) if (free.has(n)) frontier.add(n);
  };
  add(from);
  while (got.length < size && frontier.size) {
    const list = [...frontier].sort((a, b) => a - b), pick = list[Math.floor(dice.next() * list.length)]!;
    frontier.delete(pick);
    if (!free.has(pick)) continue;
    free.delete(pick);
    got.push(pick);
    add(pick);
  }
  return got;
}

const pickCrop = (dice: Rng): FieldCrop => {
  const w = SMALLHOLDING.crops, total = FIELD_CROPS.reduce((a, c) => a + w[c], 0);
  let r = dice.next() * total;
  for (const c of FIELD_CROPS) if ((r -= w[c]) < 0) return c;
  return FIELD_CROPS[0]!;
};

/** Each cell's field id. */
function index(cells: readonly Cell[], fields: readonly Field[]): string[] {
  const of: string[] = Array(cells.length).fill('');
  for (const f of fields) for (const c of f.cells) of[c] = f.id;
  return of;
}

/**
 * A smallholding's land from a seed: the yard by the lane along the top edge, a pond, a wood in a corner, then fields of
 * three to twelve cells grown from the rest, about two in five of them grass and the others in crops. A scrap too small to
 * be a field joins its neighbour.
 */
export function makeLand(seed: number, w: number = SMALLHOLDING.w, h: number = SMALLHOLDING.h): Land {
  const cells = makeCells(seed, w, h), dice = rng(seed ^ 0x1a4d), free = new Set(cells.map((c) => c.id)), fields: Field[] = [];
  let next = 1;
  const field = (kind: FieldKind, ids: number[], crop: FieldCrop | null = null) => fields.push({id: `field-${next++}`, kind, crop, cells: ids.sort((a, b) => a - b)});
  // the yard: the cell nearest the middle of the top edge, and a neighbour
  const top = cells.reduce((b, c) => (Math.hypot(c.x - w / 2, c.y) < Math.hypot(b.x - w / 2, b.y) ? c : b));
  field('yard', grow(cells, free, top.id, SMALLHOLDING.yardCells, dice));
  // a wood grown from the corner furthest from the yard, and a pond in a cell away from the edges
  const corner = cells.reduce((b, c) => (Math.hypot(c.x, c.y - h) < Math.hypot(b.x, b.y - h) ? c : b));
  const [lo, hi] = SMALLHOLDING.woodCells;
  field('wood', grow(cells, free, corner.id, lo + Math.floor(dice.next() * (hi - lo + 1)), dice));
  const inner = cells.filter((c) => free.has(c.id) && c.across.every((a) => a >= 0) && c.y > h * 0.3 && c.y < h * 0.7);
  if (inner.length) field('water', grow(cells, free, inner[Math.floor(dice.next() * inner.length)]!.id, 1, dice));
  // the fields: grown from the lowest-numbered free cell each time, to a size from the dice; then, in an order the dice
  // shuffle, grass until it has its share of the cells and crops on the rest, so there's always some of each
  const [few, most] = LAND.fieldCells, grown: number[][] = [];
  while (free.size) grown.push(grow(cells, free, Math.min(...free), few + Math.floor(dice.next() * (most - few + 1)), dice));
  const farmedCells = grown.reduce((a, g) => a + g.length, 0);
  let grassCells = 0;
  const order = grown.map((g, i) => [dice.next(), i] as const).sort((a, b) => a[0] - b[0]).map(([, i]) => i), grass = new Set<number>();
  for (const i of order) {
    if (grass.size && grassCells + grown[i]!.length / 2 > SMALLHOLDING.grass * farmedCells) continue;
    if (grass.size === grown.length - 1) break;
    grass.add(i);
    grassCells += grown[i]!.length;
  }
  grown.forEach((g, i) => (grass.has(i) ? field('grass', g) : field('arable', g, pickCrop(dice))));
  // scraps under the smallest field join a farmed neighbour
  let land: Land = {seed, w, h, cells, fields, fieldOf: index(cells, fields), changes: [], next};
  for (const f of [...land.fields]) {
    if (f.cells.length >= few || (f.kind !== 'arable' && f.kind !== 'grass')) continue;
    const by = [...new Set(f.cells.flatMap((c) => neighbours(cells, c)).map((c) => land.fieldOf[c]!))].map((id) => land.fields.find((x) => x.id === id)!)
      .filter((x) => x.id !== f.id && (x.kind === 'arable' || x.kind === 'grass'));
    const into = by.sort((a, b) => a.cells.length - b.cells.length)[0];
    if (!into) continue;
    const fs = land.fields.filter((x) => x.id !== f.id).map((x) => (x.id === into.id ? {...x, cells: [...x.cells, ...f.cells].sort((a, b) => a - b)} : x));
    land = {...land, fields: fs, fieldOf: index(cells, fs)};
  }
  return land;
}

/** A field by its id, or undefined. */
export const fieldById = (land: Land, id: string) => land.fields.find((f) => f.id === id);
/** A field's area, m². */
export const areaOf = (land: Land, f: Field) => f.cells.reduce((a, c) => a + land.cells[c]!.area, 0);
/** Whether two fields share an edge. */
export const touching = (land: Land, a: Field, b: Field) => a.cells.some((c) => land.cells[c]!.across.some((x) => x >= 0 && land.fieldOf[x] === b.id));

/** Whether a set of cells is connected through shared edges. */
export function connected(land: Land, ids: readonly number[]): boolean {
  if (!ids.length) return false;
  const want = new Set(ids), seen = new Set([ids[0]!]), todo = [ids[0]!];
  while (todo.length) for (const n of neighbours(land.cells, todo.pop()!)) if (want.has(n) && !seen.has(n)) (seen.add(n), todo.push(n));
  return seen.size === want.size;
}

const farmed = (f: Field) => f.kind === 'arable' || f.kind === 'grass';

/** Consolidation: two neighbouring farmed fields joined into one, the bigger one's use kept, up to JOIN_MOST cells.
 *  The new land, or why not. */
export function joinFields(land: Land, a: string, b: string, day: number): Land | string {
  const fa = fieldById(land, a), fb = fieldById(land, b);
  if (!fa || !fb || fa === fb) return 'two different fields';
  if (!farmed(fa) || !farmed(fb)) return 'only fields in crops or grass join';
  if (!touching(land, fa, fb)) return 'they don’t share a boundary';
  if (fa.cells.length + fb.cells.length > LAND.joinMost) return 'it would be too big a field';
  const big = areaOf(land, fa) >= areaOf(land, fb) ? fa : fb, id = `field-${land.next}`;
  const joined: Field = {id, kind: big.kind, crop: big.crop, cells: [...fa.cells, ...fb.cells].sort((x, y) => x - y)};
  const fields = [...land.fields.filter((f) => f !== fa && f !== fb), joined];
  return {...land, fields, fieldOf: index(land.cells, fields), next: land.next + 1, changes: [...land.changes, {day, what: 'join', from: [a, b], into: [id]}]};
}

/**
 * Inheritance: a farmed field split into n strips running at an angle (radians, 0 along x), shared out by area across the
 * strips and then mended so each strip is connected; each keeps the field's use. The new land, or why not.
 */
export function splitField(land: Land, id: string, n: number, angle: number, day: number): Land | string {
  const f = fieldById(land, id);
  if (!f) return 'no such field';
  if (!farmed(f)) return 'only fields in crops or grass split';
  if (n < 2 || n > f.cells.length) return 'too small a field for that many strips';
  // across the strips: the cells ordered by their distance off the strips' direction, cut into n equal areas
  const s = Math.sin(angle), c = Math.cos(angle), off = (k: number) => -s * land.cells[k]!.x + c * land.cells[k]!.y;
  const order = [...f.cells].sort((x, y) => off(x) - off(y)), total = areaOf(land, f), strip: number[] = Array(land.cells.length).fill(-1);
  let run = 0;
  for (const k of order) {
    strip[k] = Math.min(n - 1, Math.floor(((run + land.cells[k]!.area / 2) / total) * n));
    run += land.cells[k]!.area;
  }
  // a strip in pieces gives its smaller pieces to the strip they touch most, until each is one piece
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const mine: number[] = f.cells.filter((k) => strip[k] === i);
      if (mine.length < 2) continue;
      const pieces: number[][] = [], seen = new Set<number>();
      for (const k of mine) {
        if (seen.has(k)) continue;
        const piece: number[] = [k], todo: number[] = [k];
        seen.add(k);
        while (todo.length) for (const m of neighbours(land.cells, todo.pop()!)) if (strip[m] === i && !seen.has(m)) (seen.add(m), piece.push(m), todo.push(m));
        pieces.push(piece);
      }
      if (pieces.length < 2) continue;
      pieces.sort((a, b) => b.length - a.length);
      for (const piece of pieces.slice(1)) {
        const votes = new Map<number, number>();
        for (const k of piece) for (const m of neighbours(land.cells, k)) if (strip[m]! >= 0 && strip[m] !== i) votes.set(strip[m]!, (votes.get(strip[m]!) ?? 0) + 1);
        const to = [...votes].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0];
        if (to === undefined) continue;
        for (const k of piece) strip[k] = to;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const strips = Array.from({length: n}, (_, i) => f.cells.filter((k) => strip[k] === i)).filter((x) => x.length);
  if (strips.length < 2 || strips.some((x) => !connected(land, x))) return 'that field won’t split that way';
  const made = strips.map((cells, i) => ({id: `field-${land.next + i}`, kind: f.kind, crop: f.crop, cells}));
  const fields = [...land.fields.filter((x) => x !== f), ...made];
  return {...land, fields, fieldOf: index(land.cells, fields), next: land.next + made.length, changes: [...land.changes, {day, what: 'split', from: [id], into: made.map((x) => x.id)}]};
}

/** A line along the cells' edges: its points as x, y pairs, and whether it closes on itself. */
export interface Line {
  pts: number[];
  closed: boolean;
}

/** Chains edges (pairs of points) into lines through the points where exactly two meet. */
function chain(edges: readonly [number, number, number, number][]): Line[] {
  const key = (x: number, y: number) => `${x.toFixed(4)},${y.toFixed(4)}`, at = new Map<string, number[]>();
  edges.forEach((e, i) => {
    for (const k of [key(e[0], e[1]), key(e[2], e[3])]) {
      const l = at.get(k);
      if (l) l.push(i);
      else at.set(k, [i]);
    }
  });
  const used = new Set<number>(), lines: Line[] = [];
  const walk = (start: number, fromEnd: boolean): number[] => {
    const pts: number[] = [];
    let i = start, x = fromEnd ? edges[i]![2] : edges[i]![0], y = fromEnd ? edges[i]![3] : edges[i]![1];
    pts.push(x, y);
    for (;;) {
      used.add(i);
      const e = edges[i]!, same = Math.abs(e[0] - x) < 1e-4 && Math.abs(e[1] - y) < 1e-4;
      x = same ? e[2] : e[0];
      y = same ? e[3] : e[1];
      pts.push(x, y);
      const nexts = (at.get(key(x, y)) ?? []).filter((j) => !used.has(j));
      if ((at.get(key(x, y))?.length ?? 0) !== 2 || !nexts.length) break;
      i = nexts[0]!;
    }
    return pts;
  };
  // open lines start at a point where other than two edges meet; what's left are loops
  edges.forEach((e, i) => {
    if (used.has(i)) return;
    const a = at.get(key(e[0], e[1]))!.length, b = at.get(key(e[2], e[3]))!.length;
    if (a !== 2) lines.push({pts: walk(i, false), closed: false});
    else if (b !== 2) lines.push({pts: walk(i, true), closed: false});
  });
  edges.forEach((_, i) => {
    if (used.has(i)) return;
    const pts = walk(i, false);
    lines.push({pts: pts.slice(0, -2), closed: true});
  });
  return lines;
}

/** The edges of a set of cells that face outside it: the set's outline, as pairs of points. */
function rim(land: Land, ids: readonly number[]): [number, number, number, number][] {
  const inside = new Set(ids), out: [number, number, number, number][] = [];
  for (const c of ids) {
    const cell = land.cells[c]!, n = cell.poly.length / 2;
    cell.across.forEach((a, k) => {
      if (a >= 0 && inside.has(a)) return;
      const j = (k + 1) % n;
      out.push([cell.poly[2 * k]!, cell.poly[2 * k + 1]!, cell.poly[2 * j]!, cell.poly[2 * j + 1]!]);
    });
  }
  return out;
}

/** A field's outline: closed rings of points (one, or more with a hole round a pond). */
export const outlines = (land: Land, f: Field): number[][] => chain(rim(land, f.cells)).map((l) => l.pts);

/** The hedges: every boundary between two fields and along the land's edge, as lines that run from junction to junction,
 *  except round the pond and the yard, which have their own edges. */
export function hedges(land: Land): Line[] {
  const kind = new Map(land.fields.map((f) => [f.id, f.kind])), edges: [number, number, number, number][] = [];
  for (const cell of land.cells) {
    const n = cell.poly.length / 2, mine = land.fieldOf[cell.id]!;
    cell.across.forEach((a, k) => {
      // each shared edge once, from the lower-numbered cell
      if (a >= 0 && (a < cell.id || land.fieldOf[a] === mine)) return;
      const other = a >= 0 ? land.fieldOf[a]! : null;
      if (kind.get(mine) === 'water' || (other && kind.get(other) === 'water')) return;
      const j = (k + 1) % n;
      edges.push([cell.poly[2 * k]!, cell.poly[2 * k + 1]!, cell.poly[2 * j]!, cell.poly[2 * j + 1]!]);
    });
  }
  return chain(edges);
}
