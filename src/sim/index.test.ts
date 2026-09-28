import {describe, expect, it} from 'vitest';
import {createSim} from './index';

describe('sim', () => {
  it('plays a long headless run without errors and repeats it from the seed', () => {
    const play = () => {
      const sim = createSim(7);
      for (let i = 0; i < 24 * 365 * 2; i++) sim.apply({type: 'tick', hours: 1});
      return sim.snapshot();
    };
    const a = play(), b = play();
    expect(a).toEqual(b);
    expect(a.hours).toBe(24 * 365 * 2);
  });
  it('starts a new game from a chosen seed', () => {
    const sim = createSim(1);
    sim.apply({type: 'tick', hours: 5});
    expect(sim.apply({type: 'new-game', seed: 42})).toEqual({seed: 42, hours: 0});
  });
});
