// The soft fruit model's plausibility: a full summer's fruit is about what the RHS gives for an established planting, the
// season peaks in July, and a new planting crops only from its second summer; a bare-root cordon planted in November
// gives a light crop the next July and about its kilo a summer after.
import {describe, expect, it} from 'vitest';
import {FRUIT_YIELD, maturity, ripening, SEASON} from './fruit';
import {createSim} from '../index';
import {calendar} from '../clock';
import {CORDON} from '../../data/shed';

describe('soft fruit', () => {
  it('ripens a whole summer’s crop over the season, most of it in July', () => {
    let all = 0, july = 0;
    for (let d = 1; d <= 365; d++) {
      all += ripening(d);
      if (d >= 182 && d <= 212) july += ripening(d);
    }
    expect(all).toBeCloseTo(1, 2);
    expect(july).toBeGreaterThan(0.6);
    expect(ripening(SEASON.from - 1)).toBe(0);
    expect(ripening(SEASON.to + 1)).toBe(0);
  });

  it('gives an established cage about 10 kg a summer, and nothing the first summer', () => {
    // a 3 × 2 m cage
    expect(FRUIT_YIELD * 6).toBeGreaterThan(8);
    expect(FRUIT_YIELD * 6).toBeLessThan(13);
    expect(maturity(100)).toBe(0);
    expect(maturity(400)).toBeGreaterThan(0);
    expect(maturity(400)).toBeLessThan(1);
    expect(maturity(700)).toBe(1);
  });
});

describe('a cordon redcurrant', () => {
  it('planted in November, crops lightly the next summer and about a kilo the one after', () => {
    const sim = createSim(1), save = JSON.parse(sim.save());
    save.graph.nodes.kitchen.stocks.money.amount = 500;
    save.seen = ['card.first-plan', 'shed.cordon'];
    sim.apply({type: 'load', save: JSON.stringify(save)});
    while (calendar(sim.snapshot().hours).month !== 11) sim.apply({type: 'tick', hours: 24});
    sim.apply({type: 'tick', hours: 24});
    expect(sim.apply({type: 'buy', id: 'cordon'}).rejected).toBeNull();
    // what ripened each summer: the berries picked or dropped, from the kitchen's ledger and the node
    const summer = () => {
      const was = sim.snapshot().kitchen!.picked;
      for (let d = 0; d < 365; d++) sim.apply({type: 'tick', hours: 24});
      return sim.snapshot().kitchen!.picked - was;
    };
    // the fruit is picked with the rest: compare a garden with and without the cordon over the same two years
    const first = summer(), second = summer();
    const bare = createSim(1), s2 = JSON.parse(bare.save());
    s2.graph.nodes.kitchen.stocks.money.amount = 500;
    s2.seen = ['card.first-plan', 'shed.cordon'];
    bare.apply({type: 'load', save: JSON.stringify(s2)});
    while (calendar(bare.snapshot().hours).month !== 11) bare.apply({type: 'tick', hours: 24});
    bare.apply({type: 'tick', hours: 24});
    const run = () => {
      const was = bare.snapshot().kitchen!.picked;
      for (let d = 0; d < 365; d++) bare.apply({type: 'tick', hours: 24});
      return bare.snapshot().kitchen!.picked - was;
    };
    const f0 = run(), s0 = run();
    // a light crop, then about its kilo (a little dropped before it's picked)
    expect(first - f0).toBeGreaterThan(0.2 * CORDON.kg);
    expect(first - f0).toBeLessThan(0.6 * CORDON.kg);
    expect(second - s0).toBeGreaterThan(0.7 * CORDON.kg);
    expect(second - s0).toBeLessThan(1.1 * CORDON.kg);
  });
});
