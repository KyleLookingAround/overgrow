import {describe, expect, it} from 'vitest';
import {rng} from './random';

describe('rng', () => {
  it('repeats a run exactly from the same seed', () => {
    const a = rng(1), b = rng(1);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });
  it('gives different streams from different seeds', () => {
    const a = rng(1), b = rng(2);
    expect(Array.from({length: 8}, () => a.next())).not.toEqual(Array.from({length: 8}, () => b.next()));
  });
  it('stays in [0, 1) and looks flat', () => {
    const r = rng(3), n = 20000;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      sum += x;
    }
    expect(sum / n).toBeGreaterThan(0.48);
    expect(sum / n).toBeLessThan(0.52);
  });
});
