// The soft fruit model's plausibility: a full summer's fruit is about what the RHS gives for an established planting, the
// season peaks in July, and a new planting crops only from its second summer.
import {describe, expect, it} from 'vitest';
import {FRUIT_YIELD, maturity, ripening, SEASON} from './fruit';

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
