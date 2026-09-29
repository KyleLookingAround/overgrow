import {describe, expect, it} from 'vitest';
import {gateOf, UNFOLD, unfolded} from './unfold';

describe('unfold', () => {
  it('fails closed: a key not in the table never unfolds, whatever has been seen', () => {
    expect(unfolded(['no.such.key'], 'no.such.key')).toBe(false);
    expect(unfolded([], 'pests.slugs')).toBe(false);
    expect(unfolded(['pests.slugs'], 'pests.slugs')).toBe(true);
    for (const u of Object.values(UNFOLD)) expect(u.causes.length).toBeGreaterThan(0);
  });
  it('gates the pest policy, flowers along an edge and a bed of marigolds, and nothing else', () => {
    expect(gateOf('slugs', 'trap')).toBe('pests.slugs');
    expect(gateOf('edge', 'marigolds')).toBe('flowers');
    expect(gateOf('edge', 'none')).toBeNull();
    expect(gateOf('sow', 'marigolds')).toBe('flowers');
    expect(gateOf('sow', 'radish')).toBeNull();
    expect(gateOf('waterBelow', 0.5)).toBeNull();
  });
});
