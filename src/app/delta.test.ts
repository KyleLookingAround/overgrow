import {describe, expect, it} from 'vitest';
import {churn} from '../sim/churn';
import {createSim} from '../sim/index';
import {diff, patcher} from './delta';

describe('delta', () => {
  it('rebuilds every snapshot of a long run exactly from deltas', () => {
    const sim = createSim(4, [churn]), patch = patcher();
    let sent = null, small = 0;
    for (let i = 0; i < 24 * 60; i++) {
      const snap = sim.apply({type: 'tick', hours: 1}), d = diff(sent, snap);
      if (!d.whole) small++;
      expect(patch(structuredClone(d))).toEqual(snap);
      sent = snap;
    }
    expect(small).toBe(24 * 60 - 1);
  });
  it('sends the whole snapshot again after a new game or a load', () => {
    const sim = createSim(4, [churn]), a = sim.apply({type: 'tick', hours: 5}), save = sim.save();
    expect(diff(a, sim.apply({type: 'new-game', seed: 9})).whole).toBeDefined();
    const b = sim.apply({type: 'tick', hours: 5});
    expect(diff(b, sim.apply({type: 'load', save})).whole).toBeDefined();
  });
  it('sends only the nodes that changed', () => {
    const sim = createSim(4), a = sim.apply({type: 'tick', hours: 1}), b = sim.apply({type: 'tick', hours: 1});
    expect(diff(a, b).changed).toEqual([]);
  });
});
