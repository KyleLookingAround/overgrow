// The garden over four years, the check for Bug #47 (its output fell to a fifth by year three once the beds' phosphorus
// and potassium ran out): on seeds 1 to 3, with the garden's own gardener and plan, the kitchen still picks most of
// year one's kg in year three, and no dug bed's phosphorus or potassium runs out, not for a day.
import {describe, expect, it} from 'vitest';
import {createSim} from './index';
import {SOIL} from './models/soil';

const YEARS = 4, SEEDS = [1, 2, 3];

function play(seed: number) {
  const sim = createSim(seed), picked: number[] = [];
  let before = 0, lowest = Infinity;
  for (let y = 0; y < YEARS; y++) {
    for (let d = 0; d < 365; d++) {
      const s = sim.apply({type: 'tick', hours: 24});
      expect(s.errors).toEqual([]);
      for (const n of s.nodes) if (n.kind === 'bed' && (n.stocks['land.crops']?.amount ?? 0) > 0)
        lowest = Math.min(lowest, n.stocks[SOIL.phosphorus]!.amount, n.stocks[SOIL.potassium]!.amount);
    }
    const now = sim.snapshot().kitchen!.picked;
    picked.push(now - before);
    before = now;
  }
  return {picked, lowest};
}

describe('the garden over four years', () => {
  it('keeps giving: year three picks most of what year one did, and no bed runs out of phosphorus or potassium', () => {
    const runs = SEEDS.map(play);
    for (const r of runs) {
      expect(r.lowest).toBeGreaterThan(0);
      // each seed's third year at least three fifths of its first: seed 1's is held under 70 % by bed 2's clubroot
      // (radish after radish, rotation's lesson) and its nitrogen, not by phosphorus or potassium
      expect(r.picked[2]!).toBeGreaterThan(0.6 * r.picked[0]!);
    }
    // and the three together at least 70 %
    const total = (y: number) => runs.reduce((s, r) => s + r.picked[y]!, 0);
    expect(total(2)).toBeGreaterThan(0.7 * total(0));
  }, 60_000);
});
