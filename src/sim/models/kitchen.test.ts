// The kitchen's plausibility test: its ask is the weekly basket's veg, about 1 kg a day for an average household of 2.4
// and 0.42 kg for the gardener alone, in DEFRA's rough mix; two beds of potatoes and salad leaves meet about half of it
// or more for a week in summer and little in April; a glut goes to the honesty box and earns money, the best first;
// what isn't eaten in time goes off; and the shop's food makes up the rest of every meal.
import {describe, expect, it} from 'vitest';
import {BOX} from '../../data/kitchen';
import {calendar} from '../clock';
import {createSim} from '../index';
import {householdLedgerOf} from './household';
import {kitchenAsk, qualityAt} from './kitchen';

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
  it('asks about 1 kg of veg a day of an average household, potatoes the biggest share, and less of one person', () => {
    const sum = (a: Record<string, number>) => Object.values(a).reduce((s, v) => s + v, 0), avg = kitchenAsk(2.4), one = kitchenAsk(1);
    expect(sum(avg)).toBeGreaterThan(0.8);
    expect(sum(avg)).toBeLessThan(1.2);
    expect(Math.max(...Object.values(avg))).toBe(avg.potatoes);
    expect(sum(one)).toBeCloseTo(sum(avg) / 2.4);
    expect(createSim(1).snapshot().kitchen!.ask).toBeCloseTo(sum(one));
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
    // the purse: the start, the box's takings, and the weeks' pay less the shop and the rest of life
    const sim2 = createSim(2);
    for (let d = 0; d < 80; d++) sim2.apply({type: 'tick', hours: 24});
    const h = householdLedgerOf(JSON.parse(sim2.save()).graph);
    expect(h.wages).toBeGreaterThan(0);
    expect(s.money).toBeCloseTo(20 + l.earned + h.wages - h.shopped - h.rest);
    expect(l.firstSale).not.toBeNull();
    expect(l.firstSale!).toBeGreaterThan(l.firstHarvest!);
    expect(l.wasted).toBeGreaterThan(0); // salad leaves don't keep
  });

  it('refuses a plan for its ledger or its produce’s quality', () => {
    const sim = createSim(1);
    expect(sim.apply({type: 'plan', node: 'kitchen', lever: 'ledger', value: null}).rejected).toMatch(/ledger/);
    expect(sim.apply({type: 'plan', node: 'gate', lever: 'quality', value: {}}).rejected).toMatch(/quality/);
  });

  it('lets passers-by take the best first, so the poorer produce is left in the box', () => {
    const sim = createSim(1), save = JSON.parse(sim.save());
    const gate = save.graph.nodes.gate;
    gate.stocks['food.radish'] = {unit: 'kgFood', amount: 5, product: 'radish'};
    gate.stocks['food.salad'] = {unit: 'kgFood', amount: 5, product: 'salad'};
    gate.levers.quality = {radish: 40, salad: 90};
    sim.apply({type: 'load', save: JSON.stringify(save)});
    sim.apply({type: 'tick', hours: 13}); // to the first evening's sales
    const after = JSON.parse(sim.save()).graph.nodes.gate;
    const left = (p: string) => after.stocks[`food.${p}`]?.amount ?? 0;
    // a weekday's 2 kg all went on the salad; the radishes only went off
    expect(5 - left('salad')).toBeGreaterThan(1.9);
    expect(qualityAt(after, 'salad')).toBe(90);
    expect(left('radish')).toBeGreaterThan(left('salad'));
  });

  it('eats what the garden doesn’t meet from the shop’s food, and keeps days of it in the cupboard', () => {
    const sim = createSim(1), s = sim.apply({type: 'tick', hours: 13});
    const shop = s.flows.filter((f) => f.what === 'shop food eaten'), kg = shop.reduce((a, f) => a + f.amount, 0);
    // one person's day: the basket's 8.5 kg a week over seven days, near enough all from the shop on the first evening
    expect(kg).toBeGreaterThan(1);
    expect(kg).toBeLessThan(1.4);
    expect(shop.some((f) => f.product === 'shop-meat')).toBe(true);
  });
});
