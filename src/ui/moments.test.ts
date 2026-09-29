// Moments: the first harvest and the first sale each make one line when they happen, and a season's turn a line of how
// the season went, counted from the kitchen's ledger.
import {describe, expect, it} from 'vitest';
import {createSim} from '../sim/index';
import {markOf, momentsOf, type Moment} from './moments';

describe('moments', () => {
  it('says the first harvest and the first sale once, and each season’s turn with its totals', () => {
    const sim = createSim(1);
    let before = sim.snapshot(), mark = markOf(before);
    const all: {day: number; m: Moment}[] = [];
    for (let h = 0; h < 24 * 100; h++) {
      const after = sim.apply({type: 'tick', hours: 1}), r = momentsOf(before, after, mark);
      for (const m of r.moments) all.push({day: Math.floor((after.hours + 6) / 24) + 1, m});
      before = after;
      mark = r.mark;
    }
    const kinds = all.map((x) => x.m.kind);
    expect(kinds.filter((k) => k === 'harvest')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'sale')).toHaveLength(1);
    expect(all.find((x) => x.m.kind === 'harvest')!.m.text).toMatch(/^First harvest: [\d.]+ kg of salad leaves$/);
    expect(all.find((x) => x.m.kind === 'sale')!.m.text).toMatch(/^First sale at the honesty box: £\d+\.\d\d$/);
    // the game starts on 15 March, and the calendar's summer on 1 May (src/sim/clock.ts): day 48; then August's autumn
    const season = all.filter((x) => x.m.kind === 'season');
    expect(season).toHaveLength(1);
    expect(season[0]!.day).toBe(48);
    expect(season[0]!.m.text).toMatch(/^Spring in the garden: [\d.]+ kg picked, [\d.]+ kg eaten, [\d.]+ kg sold \(£[\d.]+\)$/);
  });
});
