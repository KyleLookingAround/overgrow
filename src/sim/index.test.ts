import {describe, expect, it} from 'vitest';
import {churn} from './churn';
import {createSim} from './index';

describe('sim', () => {
  it('plays a long headless run without errors and repeats it from the seed', () => {
    const play = () => {
      const sim = createSim(7);
      for (let i = 0; i < 24 * 365 * 2; i++) expect(sim.apply({type: 'tick', hours: 1}).errors).toEqual([]);
      return sim.snapshot();
    };
    const a = play(), b = play();
    expect(a).toEqual(b);
    expect(a.hours).toBe(24 * 365 * 2);
  });

  it('plays on exactly as it would have after a save and load mid-run', () => {
    const straight = createSim(7, [churn]), broken = createSim(7, [churn]);
    for (let i = 0; i < 24 * 200; i++) {
      straight.apply({type: 'tick', hours: 1});
      broken.apply({type: 'tick', hours: 1});
    }
    const text = broken.save(), resumed = createSim(99, [churn]);
    expect(resumed.apply({type: 'load', save: text}).rejected).toBeNull();
    for (let i = 0; i < 24 * 530; i++) {
      straight.apply({type: 'tick', hours: 1});
      resumed.apply({type: 'tick', hours: 1});
    }
    const a = straight.snapshot(), b = resumed.snapshot();
    expect(b).toEqual(a);
    expect(b.errors).toEqual([]);
    expect(b.activities.length).toBeGreaterThan(0);
  });

  it('starts a new game from a chosen seed, on the garden on day 1', () => {
    const sim = createSim(1);
    sim.apply({type: 'tick', hours: 5});
    const s = sim.apply({type: 'new-game', seed: 42});
    expect(s).toMatchObject({seed: 42, hours: 0, level: 1, step: 1, speed: 1, money: 20, carbon: 0});
    expect(s.nodes.filter((n) => n.kind === 'bed')).toHaveLength(6);
  });

  it('runs a garden day in well under the 2 ms budget', () => {
    const sim = createSim(3, [churn]), days = 200;
    for (let i = 0; i < 24 * 20; i++) sim.apply({type: 'tick', hours: 1}); // warm up
    const t0 = performance.now();
    for (let i = 0; i < 24 * days; i++) sim.apply({type: 'tick', hours: 1});
    const perDay = (performance.now() - t0) / days;
    expect(perDay).toBeLessThan(2);
  });
});
