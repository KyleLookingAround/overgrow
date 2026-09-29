// The kitchen's plausibility test: its ask is about 1 kg a day in DEFRA's rough mix; two beds of potatoes and salad
// leaves meet about half of it or more for a week in summer (most of it on seeds 2 and 3) and hardly any in April; a
// glut goes to the honesty box and earns money; and what isn't eaten in time goes off.
import {describe, expect, it} from 'vitest';
import {ASK, BOX} from '../../data/kitchen';
import {calendar} from '../clock';
import {createSim} from '../index';

const season = (seed: number) => {
  const sim = createSim(seed);
  // bed 1's overwintered salad leaves, then more salad; potatoes in bed 2
  sim.apply({type: 'plan', node: 'bed-1', lever: 'sow', value: 'salad'});
  sim.apply({type: 'plan', node: 'bed-2', lever: 'sow', value: 'potatoes'});
  const met: Record<number, number[]> = {};
  for (let d = 0; d < 200; d++) {
    const s = sim.apply({type: 'tick', hours: 24});
    (met[calendar(s.hours).month] ??= []).push(s.kitchen!.met);
  }
  return {met, ledger: sim.snapshot().kitchen!, money: sim.snapshot().money};
};
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const bestWeek = (xs: number[]) => Math.max(...xs.slice(6).map((_, i) => mean(xs.slice(i, i + 7))));

describe('kitchen', () => {
  it('asks about 1 kg of veg a day, potatoes the biggest share', () => {
    const total = Object.values(ASK).reduce((s, v) => s + v, 0);
    expect(total).toBeGreaterThan(0.8);
    expect(total).toBeLessThan(1.2);
    expect(Math.max(...Object.values(ASK))).toBe(ASK.potatoes);
  });

  it('has about half its need or more met by two beds for a week in summer, and hardly any in April', () => {
    for (const seed of [1, 2, 3]) {
      const {met, ledger} = season(seed);
      expect(mean(met[4]!)).toBeLessThan(0.15);
      expect(bestWeek([...met[6]!, ...met[7]!, ...met[8]!])).toBeGreaterThan(0.45);
      // what was picked was eaten, sold, went off or is still in the kitchen (wasted also counts what rotted unpicked)
      expect(ledger.eaten + ledger.sold).toBeLessThanOrEqual(ledger.picked + 1e-6);
      expect(ledger.eaten).toBeGreaterThan(0.5 * ledger.picked);
    }
  });

  it('sends a glut to the honesty box, where passers-by buy it into the purse', () => {
    const sim = createSim(2);
    // radishes in bed 2, all ready together
    for (let d = 0; d < 80; d++) sim.apply({type: 'tick', hours: 24});
    const s = sim.snapshot(), l = s.kitchen!;
    expect(l.sold).toBeGreaterThan(1);
    expect(l.earned).toBeCloseTo(l.sold * BOX.price);
    expect(s.money).toBeCloseTo(20 + l.earned);
    expect(l.firstSale).not.toBeNull();
    expect(l.firstSale!).toBeGreaterThan(l.firstHarvest!);
    expect(l.wasted).toBeGreaterThan(0); // salad leaves don't keep
  });

  it('refuses a plan for its ledger', () => {
    const sim = createSim(1);
    expect(sim.apply({type: 'plan', node: 'kitchen', lever: 'ledger', value: null}).rejected).toMatch(/ledger/);
  });
});
