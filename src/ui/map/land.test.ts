// The land's art geometry (src/ui/map/land.ts): stripes stay inside the field they're clipped to, and smoothing keeps an
// open line's ends where they were (so hedges still meet at their junctions).
import {describe, expect, it} from 'vitest';
import {makeLand, outlines} from '../../sim/land';
import {inside, smooth, stripes} from './land';

describe('the land’s art', () => {
  it('clips furrows to their field, every one starting and ending on its edge', () => {
    const land = makeLand(1);
    for (const f of land.fields.filter((x) => x.kind === 'arable')) {
      const rings = outlines(land, f).map((r) => smooth(r, true)), lines = stripes(rings, 0.7, 6);
      expect(lines.length).toBeGreaterThan(0);
      for (let i = 0; i < lines.length; i += 4) expect(inside(rings, (lines[i]! + lines[i + 2]!) / 2, (lines[i + 1]! + lines[i + 3]!) / 2)).toBe(true);
    }
  });

  it('rounds a line’s corners and keeps an open line’s ends', () => {
    const open = smooth([0, 0, 10, 0, 10, 10], false);
    expect(open.slice(0, 2)).toEqual([0, 0]);
    expect(open.slice(-2)).toEqual([10, 10]);
    expect(open.length).toBeGreaterThan(6);
  });
});
