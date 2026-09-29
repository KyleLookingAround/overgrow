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
  it('sends every stock again when one is gone', () => {
    const sim = createSim(4), a = sim.snapshot(), b = structuredClone(a), patch = patcher();
    const bed = b.nodes.find((n) => n.id === 'bed-1')!;
    delete bed.stocks['land.crops'];
    bed.stocks.water = {unit: 'L', amount: 1 as never};
    patch(diff(null, a));
    expect(patch(structuredClone(diff(a, b)))).toEqual(b);
  });
  it('sends only the nodes that changed', () => {
    const still = createSim(4, []), a = still.apply({type: 'tick', hours: 1}), b = still.apply({type: 'tick', hours: 1});
    expect(diff(a, b).changed).toEqual([]);
    // the weather's first hour wets or dries the beds and the lawn, and draws the day on the air: those, and no others
    const sim = createSim(4), c = sim.apply({type: 'tick', hours: 1}), d = sim.apply({type: 'tick', hours: 1});
    const kinds = new Set(diff(c, d).changed!.map((p) => d.nodes.find((n) => n.id === p.id)!.kind));
    expect([...kinds].every((k) => ['bed', 'lawn', 'atmosphere'].includes(k))).toBe(true);
  });
});
