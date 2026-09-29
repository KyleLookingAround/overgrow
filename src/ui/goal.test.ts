import {describe, expect, it} from 'vitest';
import {createSim} from '../sim/index';
import {goalLine} from './goal';

describe('the goal bar', () => {
  it('counts down to the first harvest, then shows the three numbers over the year and names the one holding the garden back', () => {
    const sim = createSim(1);
    const first = goalLine(sim.snapshot());
    expect(first.text).toMatch(/^First harvest: salad leaves in Bed 1, \d+ % grown$/);
    expect(first.rows).toBeNull();
    let s = sim.snapshot();
    while (s.kitchen?.firstHarvest == null) s = sim.apply({type: 'tick', hours: 24});
    // before the ring's first week: what the window is waiting for, never an empty bar
    const waiting = goalLine(s);
    expect(waiting.text).toMatch(/whole year|weeks so far/);
    for (let d = 0; d < 35; d++) s = sim.apply({type: 'tick', hours: 24});
    const later = goalLine(s);
    expect(later.rows!.map((r) => r.key).sort()).toEqual(['health', 'output', 'reliability']);
    expect(later.text).toMatch(/^(Output|Reliability|Health) [\d.]+ of [\d.]+( kg a day)?: .+ \(\d+ of 52 weeks so far\)$/);
    expect(later.window).toBeGreaterThan(0);
    expect(later.window).toBeLessThan(1);
    // the one named is the furthest from its target
    expect(later.text.startsWith({output: 'Output', reliability: 'Reliability', health: 'Health'}[later.rows![0]!.key])).toBe(true);
  });
});
