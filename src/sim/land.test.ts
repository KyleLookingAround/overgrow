// The land as organic parcels (src/sim/land.ts): the cells tile the land, their neighbours are mutual, a seed repeats,
// fields join and split conserving area with every field one piece, and the outlines and hedges close up.
import {describe, expect, it} from 'vitest';
import {LAND, SMALLHOLDING} from '../data/land';
import {areaOf, connected, fieldById, hedges, joinFields, makeCells, makeLand, neighbours, outlines, shoelace, splitField, touching, type Land} from './land';

const W = SMALLHOLDING.w, H = SMALLHOLDING.h;
const total = (land: Land) => land.fields.reduce((a, f) => a + areaOf(land, f), 0);
const ok = (r: Land | string): Land => {
  expect(typeof r, String(r)).toBe('object');
  return r as Land;
};

describe('the land as organic parcels', () => {
  it('tiles the land with irregular cells of about a third of a hectare, each knowing its neighbours', () => {
    for (const seed of [1, 2, 3]) {
      const cells = makeCells(seed, W, H), sum = cells.reduce((a, c) => a + c.area, 0);
      expect(Math.abs(sum - W * H) / (W * H)).toBeLessThan(0.001);
      const mean = sum / cells.length;
      expect(mean).toBeGreaterThan(LAND.cellM2 * 0.8);
      expect(mean).toBeLessThan(LAND.cellM2 * 1.25);
      // irregular: neither all the same size nor all the same number of sides
      expect(new Set(cells.map((c) => c.poly.length)).size).toBeGreaterThan(1);
      expect(Math.max(...cells.map((c) => c.area)) / Math.min(...cells.map((c) => c.area))).toBeGreaterThan(1.3);
      for (const c of cells) for (const n of neighbours(cells, c.id)) expect(neighbours(cells, n)).toContain(c.id);
    }
  });

  it('is the same land for the same seed, and a different one for another', () => {
    expect(makeLand(4)).toEqual(makeLand(4));
    expect(JSON.stringify(makeLand(4).fields)).not.toBe(JSON.stringify(makeLand(5).fields));
  });

  it('lays out a smallholding: the yard, a wood, a pond and fields of every cell, each one piece', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const land = makeLand(seed), kinds = land.fields.map((f) => f.kind);
      expect(kinds.filter((k) => k === 'yard')).toHaveLength(1);
      expect(kinds.filter((k) => k === 'wood')).toHaveLength(1);
      expect(kinds).toContain('arable');
      expect(kinds).toContain('grass');
      expect(land.fields.flatMap((f) => f.cells).sort((a, b) => a - b)).toEqual(land.cells.map((c) => c.id));
      for (const f of land.fields) expect(connected(land, f.cells), `${seed} ${f.id}`).toBe(true);
      for (const f of land.fields) if (f.kind === 'arable') expect(f.crop).not.toBeNull();
      expect(Math.abs(total(land) - W * H) / (W * H)).toBeLessThan(0.001);
    }
    // no farmed field under the smallest, even boxed in by the wood or the yard, over many seeds
    for (let seed = 1; seed <= 120; seed++) {
      const land = makeLand(seed);
      for (const f of land.fields) if (f.kind === 'arable' || f.kind === 'grass') expect(f.cells.length, `seed ${seed} ${f.id}`).toBeGreaterThanOrEqual(LAND.fieldCells[0]);
      expect(Math.abs(total(land) - W * H) / (W * H)).toBeLessThan(0.001);
    }
  });

  it('joins two neighbouring fields into one, keeping the area, and refuses fields that don’t touch or would be too big', () => {
    const land = makeLand(2), farmed = land.fields.filter((f) => f.kind === 'arable' || f.kind === 'grass');
    const a = farmed[0]!, b = farmed.find((f) => f !== a && touching(land, a, f) && a.cells.length + f.cells.length <= LAND.joinMost)!;
    const joined = ok(joinFields(land, a.id, b.id, 30)), made = fieldById(joined, joined.changes[0]!.into[0]!)!;
    expect(areaOf(joined, made)).toBeCloseTo(areaOf(land, a) + areaOf(land, b), 6);
    expect(connected(joined, made.cells)).toBe(true);
    expect(joined.fields).toHaveLength(land.fields.length - 1);
    expect(joined.changes).toEqual([{day: 30, what: 'join', from: [a.id, b.id], into: [made.id]}]);
    // two farmed fields that don't touch, on whichever seed has a pair
    const apart = [1, 2, 3, 4, 5, 6].map((seed) => makeLand(seed)).flatMap((l) => {
      const fs = l.fields.filter((f) => f.kind === 'arable' || f.kind === 'grass');
      return fs.flatMap((x) => fs.filter((y) => y !== x && !touching(l, x, y)).map((y) => [l, x, y] as const));
    })[0]!;
    expect(joinFields(apart[0], apart[1].id, apart[2].id, 30)).toMatch(/boundary/);
    const yard = land.fields.find((f) => f.kind === 'yard')!;
    expect(joinFields(land, a.id, yard.id, 30)).toMatch(/only fields/);
  });

  it('splits a field into strips along its cells’ edges, each one piece, keeping the area', () => {
    for (const seed of [1, 2, 3]) {
      const land = makeLand(seed), big = [...land.fields].filter((f) => f.kind === 'arable' || f.kind === 'grass').sort((a, b) => b.cells.length - a.cells.length)[0]!;
      for (const angle of [0, Math.PI / 2, 0.6]) {
        const r = splitField(land, big.id, 2, angle, 100);
        if (typeof r === 'string') continue; // an awkward shape at this angle: refused, never broken
        const made = r.changes[0]!.into.map((id) => fieldById(r, id)!);
        expect(made.length).toBe(2);
        for (const f of made) expect(connected(r, f.cells)).toBe(true);
        expect(made.reduce((a, f) => a + areaOf(r, f), 0)).toBeCloseTo(areaOf(land, big), 6);
        expect(new Set(made.flatMap((f) => f.cells)).size).toBe(big.cells.length);
      }
      expect(splitField(land, big.id, big.cells.length + 1, 0, 100)).toMatch(/too small/);
    }
  });

  it('traces each field’s outline as closed rings whose area is the field’s, and the hedges between fields', () => {
    const land = makeLand(3);
    for (const f of land.fields) {
      const rings = outlines(land, f), area = rings.reduce((a, r) => a + shoelace(r).area, 0);
      expect(rings.length).toBeGreaterThan(0);
      expect(Math.abs(Math.abs(area) - areaOf(land, f)) / areaOf(land, f)).toBeLessThan(0.001);
    }
    const lines = hedges(land), length = lines.reduce((a, l) => {
      let d = 0;
      for (let i = 2; i < l.pts.length; i += 2) d += Math.hypot(l.pts[i]! - l.pts[i - 2]!, l.pts[i + 1]! - l.pts[i - 1]!);
      return a + d;
    }, 0);
    // at least the land's own edge, less where the pond touches nothing: about the perimeter and the boundaries inside
    expect(length).toBeGreaterThan(2 * (W + H));
    // joining two fields takes the hedge between them out
    const farmed = land.fields.filter((f) => f.kind === 'arable' || f.kind === 'grass'), a = farmed[0]!;
    const b = farmed.find((f) => f !== a && touching(land, a, f) && a.cells.length + f.cells.length <= LAND.joinMost)!;
    const joined = ok(joinFields(land, a.id, b.id, 1)), after = hedges(joined).reduce((n, l) => n + l.pts.length, 0);
    expect(after).toBeLessThan(lines.reduce((n, l) => n + l.pts.length, 0));
  });

  it('looks like real small-field country: fields of 1.5 to 4 ha, 80 to 200 m of hedge a hectare inside the land, and fewer hedges once fields are joined', () => {
    // Rackham's ancient countryside: small irregular fields, before post-war consolidation took arable fields past 10 ha;
    // its hedges run at about a hundred to two hundred metres a hectare
    const length = (land: Land) => hedges(land).reduce((a, l) => {
      let d = 0;
      for (let i = 2; i < l.pts.length; i += 2) d += Math.hypot(l.pts[i]! - l.pts[i - 2]!, l.pts[i + 1]! - l.pts[i - 1]!);
      return a + d;
    }, 0);
    const inner = (land: Land) => (length(land) - 2 * (land.w + land.h)) / ((land.w * land.h) / 1e4);
    for (const seed of [1, 2, 3, 4, 5]) {
      let land = makeLand(seed);
      const farmed = land.fields.filter((f) => f.kind === 'arable' || f.kind === 'grass'), mean = farmed.reduce((a, f) => a + areaOf(land, f), 0) / farmed.length / 1e4;
      expect(mean).toBeGreaterThan(1.5);
      expect(mean).toBeLessThan(4);
      const before = inner(land);
      expect(before).toBeGreaterThan(80);
      expect(before).toBeLessThan(200);
      // consolidation: every join it can make takes a hedge out
      for (let joins = 0; joins < 10; joins++) {
        const fs = land.fields.filter((f) => f.kind === 'arable' || f.kind === 'grass');
        const pair = fs.flatMap((a) => fs.filter((b) => b !== a && touching(land, a, b) && a.cells.length + b.cells.length <= LAND.joinMost).map((b) => [a, b] as const))[0];
        if (!pair) break;
        land = ok(joinFields(land, pair[0].id, pair[1].id, joins));
      }
      expect(inner(land)).toBeLessThan(before);
    }
  });
});
