// A neighbour's plot drawn from its totals (src/ui/map/detail.ts): the beds drawn add back up to the plot's totals within
// the carry check's 5 % (the founding spec's "Inflating"), its layout is the same every time for a seed and a plot, and
// its beds stay on the tile without overlapping.
import {describe, expect, it} from 'vitest';
import {PLAYER_PLOT, plotBox, TILE} from '../../data/allotment';
import {neighbourPlots} from '../../sim/allotment';
import type {GraphNode} from '../../sim/graph';
import {carryCheck, inflateTarget, SEALED, type LadderTotals} from '../../sim/ladder';
import {detailOf, drawnTotals, totalsOf} from './detail';

const BASE: LadderTotals = {
  output: 0.3, quality: 60, reliability: 60, upkeep: 0.05, health: 62, freshness: 0, carbon: 0.04, land: {crops: 30, grass: 60},
  outputByGroup: {potatoes: 0.1, salads: 0.08, tomatoes: 0.04, greens: 0.08},
};
/** The eleven neighbours' plots for a seed, as the allotment's graph holds them. */
const plots = (seed: number): GraphNode[] => neighbourPlots(seed, BASE).map((p) => ({
  id: p.id, kind: 'plot', name: `${p.holder.name}’s plot`, box: plotBox(Number(p.id.slice(5)) - 1), stocks: {},
  levers: {[SEALED.lever]: p.sealed, holder: p.holder}, totals: p.sealed.totals,
}) as unknown as GraphNode);

describe('a neighbour’s plot from its totals', () => {
  it('adds back up to the plot’s totals within 5 %, its mix group by group', () => {
    for (const seed of [1, 2, 3, 4, 5])
      for (const n of plots(seed)) {
        const t = totalsOf(n), d = detailOf(seed, n), check = carryCheck(inflateTarget(t, 2).totals, drawnTotals(d, t));
        expect(check.off, `${seed} ${n.id}`).toEqual([]);
        expect(d.kg).toBeGreaterThan(0);
      }
  });

  it('is laid out the same every time for a seed and a plot, and differently for another seed', () => {
    const [a] = plots(3), [b] = plots(4);
    expect(detailOf(3, a!)).toEqual(detailOf(3, a!));
    expect(JSON.stringify(detailOf(3, a!).beds.map((x) => x.crop))).not.toBe(JSON.stringify(detailOf(4, b!).beds.map((x) => x.crop)));
  });

  it('keeps its beds on the tile, none overlapping, fewer dug where the Output is low', () => {
    for (const n of plots(2)) {
      const d = detailOf(2, n);
      for (const [i, x] of d.beds.entries()) {
        expect(x.box.x).toBeGreaterThanOrEqual(0);
        expect(x.box.y).toBeGreaterThanOrEqual(0);
        expect(x.box.x + x.box.w).toBeLessThanOrEqual(TILE.w);
        expect(x.box.y + x.box.h).toBeLessThanOrEqual(TILE.h);
        for (const y of d.beds.slice(i + 1)) expect(x.box.x + x.box.w <= y.box.x || y.box.x + y.box.w <= x.box.x || x.box.y + x.box.h <= y.box.y || y.box.y + y.box.h <= x.box.y).toBe(true);
      }
    }
    const [n] = plots(1), low = {...n!, totals: {...n!.totals, output: 0.05}}, high = {...n!, totals: {...n!.totals, output: 0.6}};
    const dug = (m: GraphNode) => detailOf(1, m).beds.filter((b) => b.crop).length;
    expect(dug(low)).toBeLessThan(dug(high));
    expect(plots(1).some((m) => m.id === PLAYER_PLOT)).toBe(false);
  });
});
