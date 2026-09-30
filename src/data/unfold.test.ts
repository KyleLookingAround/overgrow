import {describe, expect, it} from 'vitest';
import {CAUSES} from './explain';
import {gateOf, GATES, revealed, shows, UNFOLD, unfolded} from './unfold';

describe('unfold', () => {
  it('fails closed: a key not in the table never unfolds or shows, whatever has been seen or set', () => {
    expect(unfolded(['no.such.key'], 'no.such.key')).toBe(false);
    expect(shows(['no.such.key'], 'no.such.key', true)).toBe(false);
    expect(unfolded([], 'garden.slugs')).toBe(false);
    expect(unfolded(['garden.slugs'], 'garden.slugs')).toBe(true);
    expect(shows([], 'garden.money', true)).toBe(true);
    expect(shows([], 'garden.money')).toBe(false);
  });
  it('names every key by level and system, with a cause the Explain table knows and a short line on why', () => {
    const known = new Set(Object.values(CAUSES).flatMap((e) => e.causes));
    for (const [k, u] of Object.entries(UNFOLD)) {
      expect(k).toMatch(/^(garden|household|shed|allotment|agency|committee)\.[a-z-]+$/);
      expect(u.causes.length).toBeGreaterThan(0);
      for (const c of u.causes) expect(known.has(c), `${k}: ${c}`).toBe(true);
      expect(u.why.length).toBeLessThan(90);
    }
    for (const g of GATES) expect(g.key in UNFOLD).toBe(true);
  });
  it('reveals every key a batch of causes reaches, once, in the table’s order', () => {
    expect(revealed([], ['spreading compost'])).toEqual(['garden.soil', 'garden.carbon', 'household.footprint', 'shed.compost-bin', 'shed.hens']);
    expect(revealed(['garden.soil'], ['spreading compost', 'watering'])).toEqual(['garden.water', 'garden.carbon', 'household.footprint', 'shed.compost-bin', 'shed.hens']);
    // the gardener home from work on day 2 comes with the kitchen's first ask: one batch, the kitchen first
    expect(revealed(['garden.water', 'garden.slugs', 'garden.shed'], ['commute', 'ask', 'eating'])).toEqual(['garden.kitchen', 'household.commute']);
    // payday reveals the money, and the first week the garden fed the household reveals groceries saved beside it
    expect(revealed([], ['groceries saved', 'wages'])).toEqual(['garden.money', 'household.groceries']);
    expect(revealed([], ['rain', 'growth'])).toEqual([]);
  });
  it('gates the watering line, the pest policy, flowers along an edge, a bed of marigolds and a winter crop, and nothing else', () => {
    expect(gateOf('winter', 'garlic')).toBe('garden.winter');
    expect(gateOf('winter', 'none')).toBeNull();
    expect(gateOf('waterBelow', 0.5)).toBe('garden.water');
    expect(gateOf('slugs', 'trap')).toBe('garden.slugs');
    expect(gateOf('edge', 'marigolds')).toBe('garden.flowers');
    expect(gateOf('edge', 'none')).toBeNull();
    expect(gateOf('sow', 'marigolds')).toBe('garden.flowers');
    expect(gateOf('sow', 'radish')).toBeNull();
    expect(gateOf('dig', true)).toBeNull();
  });
});
