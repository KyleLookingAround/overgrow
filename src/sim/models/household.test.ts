// The household economy's plausibility test: a full-time gardener gets about four garden hours on a weekday and more at
// weekends (the owner's figure, which the gardener now takes from here); a partner moving from work to help cuts the wage and adds garden hours; a
// garden that meets the veg ask saves its kg at shop prices; a week's shop's carbon is mostly meat and dairy and its
// transport share is small; the kitchen's ask is the basket's veg; poorer households spend more of their income on
// food; and many households' demand is the sum of each.
import {describe, expect, it} from 'vitest';
import {DECILES, FOOD_GROUPS, PLOT, PRICE, VEG, type FoodGroup} from '../../data/household';
import {applyFlow, makeGraph} from '../graph';
import type {Flow} from '../graph';
import {rng} from '../random';
import {newLedger} from './kitchen';
import {
  basket, commute, demand, footprint, gardenHours, hoursPerPlot, household, householdGardenHours, householdLedgerOf, HOUSEHOLD,
  keptness, kitchenAsk, newMember, newHouseholdLedger, purse, shop, startHousehold, townDemand, transportShare, weekFlows,
  weekGardenHours, weekWage, withJob, withMember, withWorkShare, workHours,
} from './household';
import type {TickContext} from '../clock';

const gardener = startHousehold().members[0]!;
const sumKg = (o: Partial<Record<FoodGroup, number>>) => Object.values(o).reduce((s, v) => s + (v ?? 0), 0);

describe('members and hours', () => {
  it('gives a full-time gardener about four garden hours on a weekday and more at weekends, as jobs.ts does', () => {
    for (let d = 0; d < 5; d++) expect(gardenHours(gardener, d)).toBeCloseTo(4, 6);
    for (let d = 5; d < 7; d++) {
      expect(gardenHours(gardener, d)).toBeCloseTo(6, 6);
      expect(gardenHours(gardener, d)).toBeGreaterThan(gardenHours(gardener, 0));
    }
  });

  it('takes a weekday for the job, with a wage near the median take-home, and none at weekends', () => {
    expect(workHours(gardener, 2)).toBe(8);
    expect(workHours(gardener, 6)).toBe(0);
    expect(weekWage(gardener)).toBeGreaterThan(500);
    expect(weekWage(gardener)).toBeLessThan(700);
  });

  it('has the gardener leave through the gate in the morning and come home in the evening on a working day only', () => {
    const c = commute(gardener, 1)!;
    expect(c.leaves).toBeGreaterThan(7);
    expect(c.leaves).toBeLessThan(10);
    expect(c.returns).toBeGreaterThan(16);
    expect(c.returns).toBeLessThan(19);
    expect(commute(gardener, 5)).toBeNull();
  });

  it('trades wage for garden hours when the partner moves from work to help', () => {
    const partner = newMember('partner', 'Sam', 'partner', 'full');
    const both = withMember(startHousehold(), partner);
    const helping = withWorkShare(both, 'partner', 0);
    const mixed = withWorkShare(both, 'partner', 0.5);
    expect(weekWage(helping.members[1]!)).toBe(0);
    expect(weekWage(mixed.members[1]!)).toBeCloseTo(weekWage(partner) / 2);
    const wage = (h: typeof both) => h.members.reduce((s, m) => s + weekWage(m), 0);
    expect(wage(helping)).toBeLessThan(wage(mixed));
    expect(wage(mixed)).toBeLessThan(wage(both));
    expect(weekGardenHours(helping)).toBeGreaterThan(weekGardenHours(mixed));
    expect(weekGardenHours(mixed)).toBeGreaterThan(weekGardenHours(both));
    expect(householdGardenHours(helping, 1)).toBeGreaterThan(householdGardenHours(both, 1) + 2);
  });

  it('cuts the wage and adds garden hours for part-time at the smallholding, and keeps the lever between 0 and 1', () => {
    const part = withJob(startHousehold(), 'gardener', 'part');
    expect(weekWage(part.members[0]!)).toBeCloseTo(weekWage(gardener) * 0.6);
    expect(weekGardenHours(part)).toBeGreaterThan(weekGardenHours(startHousehold()) + 6);
    expect(withWorkShare(startHousehold(), 'gardener', 3).members[0]!.workShare).toBe(1);
  });

  it('keeps a plot by the hours its household has: a full-time worker keeps one, longer hours or more plots neglect it', () => {
    expect(keptness(hoursPerPlot(startHousehold()))).toBe(1);
    const long = {members: [{...gardener, workShare: 1.25}]}; // overtime: ten hours a day
    expect(hoursPerPlot(long)).toBeLessThan(hoursPerPlot(startHousehold()));
    expect(keptness(PLOT.hoursPerWeek / 3)).toBeCloseTo(1 / 3);
    expect(keptness(hoursPerPlot(startHousehold(), 8))).toBeLessThan(1);
  });
});

describe('the weekly basket and shop', () => {
  it('has a kitchen ask that falls out of the basket within 10 % of the fixed one, and grows with the household', () => {
    // the kitchen's fixed ask before part 6b: about 1 kg a day for an average household of 2.4 (NHS five a day, ONS)
    const ASK = {potatoes: 0.4, salads: 0.3, tomatoes: 0.15, greens: 0.15};
    const ask = kitchenAsk(2.4), fixed = Object.values(ASK).reduce((s, v) => s + v, 0);
    const total = VEG.reduce((s, g) => s + ask[g], 0);
    expect(Math.abs(total - fixed) / fixed).toBeLessThan(0.1);
    for (const g of VEG) expect(Math.abs(ask[g] - ASK[g]) / ASK[g]).toBeLessThan(0.1);
    expect(kitchenAsk(2)[VEG[0]!]).toBeGreaterThan(kitchenAsk(1)[VEG[0]!]);
    expect(kitchenAsk(2)[VEG[0]!]).toBeCloseTo(2 * kitchenAsk(1)[VEG[0]!]);
  });

  it('costs about £30 a person a week at Family Food prices, meat and fish the largest part', () => {
    const b = basket(1);
    const cost = FOOD_GROUPS.reduce((s, g) => s + b[g] * PRICE[g], 0);
    expect(cost).toBeGreaterThan(24);
    expect(cost).toBeLessThan(38);
    const meat = b.meat * PRICE.meat;
    expect(FOOD_GROUPS.every((g) => b[g] * PRICE[g] <= meat)).toBe(true);
  });

  it('saves the kg the garden supplied at shop prices, and has the shop buy the rest', () => {
    const need = basket(1);
    const none = shop(need, {});
    const veg = Object.fromEntries(VEG.map((g) => [g, need[g]]));
    const met = shop(need, veg);
    const savedBy = VEG.reduce((s, g) => s + need[g] * PRICE[g], 0);
    expect(none.saved).toBe(0);
    expect(met.saved).toBeCloseTo(savedBy);
    expect(met.cost).toBeCloseTo(none.cost - savedBy);
    for (const g of VEG) expect(met.buy[g]).toBeCloseTo(0);
    expect(met.buy.meat).toBe(need.meat);
    // a glut beyond the week's need saves nothing more
    const glut = shop(need, {potatoes: need.potatoes + 5});
    expect(glut.saved).toBeCloseTo(need.potatoes * PRICE.potatoes);
    expect(glut.spare).toBeCloseTo(5);
    expect(shop(need, {}, 1.2).cost).toBeCloseTo(none.cost * 1.2);
  });
});

describe('shop food’s footprint', () => {
  const typical = shop(basket(2.4), {}).buy;

  it('is dominated by meat and dairy for a typical basket, about two tonnes CO₂e a person a year', () => {
    const f = footprint(typical);
    const md = f.byGroup.meat + f.byGroup.dairy;
    expect(md / f.carbon).toBeGreaterThan(0.6);
    const perPersonYear = (f.carbon / 2.4) * 52;
    expect(perPersonYear).toBeGreaterThan(1200);
    expect(perPersonYear).toBeLessThan(3000);
    expect(f.land).toBeGreaterThan(0);
    expect(f.water).toBeGreaterThan(0);
  });

  it('has transport a small share, under 10 %, though air-freighted produce is the exception', () => {
    const f = footprint(typical);
    expect(transportShare(f)).toBeLessThan(0.1);
    expect(transportShare(f)).toBeGreaterThan(0);
    // per kg, a group that arrives by air carries far more transport than the same group by sea
    const beans = footprint({greens: 1}), sea = footprint({potatoes: 1});
    expect(beans.transport / beans.carbon).toBeGreaterThan(transportShare(sea) * 0.5);
    expect(beans.transport).toBeGreaterThan(sea.transport);
  });

  it('carries carbon, land and water for a week’s shop into the household as flows that add up', () => {
    const h = startHousehold(), s = shop(basket(1), {}), fp = footprint(s.buy);
    const flows = weekFlows(h, s, fp);
    const total = (unit: string) => flows.filter((f) => f.unit === unit && 'node' in f.to && f.to.node === HOUSEHOLD).reduce((a, f) => a + f.amount, 0);
    expect(total('kgCO2e')).toBeCloseTo(fp.carbon);
    expect(total('m2')).toBeCloseTo(fp.land);
    expect(total('L')).toBeCloseTo(fp.water);
  });
});

describe('the purse', () => {
  it('gains for a gardener in work and can go down when the partner stops work', () => {
    const one = purse(startHousehold(), shop(basket(1), {}).cost);
    expect(one.net).toBeGreaterThan(0);
    expect(one.net).toBeLessThan(one.wages / 2);
    const helping = withWorkShare(withMember(startHousehold(), newMember('partner', 'Sam', 'partner', 'full')), 'partner', 0);
    const down = purse(helping, shop(basket(2), {}).cost);
    expect(down.net).toBeLessThan(0);
  });

  it('counts sales as money in and the garden’s saving as less bought', () => {
    const h = startHousehold(), need = basket(1);
    const dear = purse(h, shop(need, {}).cost, 0), cheap = purse(h, shop(need, {potatoes: need.potatoes}).cost, 10);
    expect(cheap.net).toBeGreaterThan(dear.net + 10);
  });
});

describe('many households', () => {
  it('has a lower-income decile spending a larger share of its income on food', () => {
    const shares = DECILES.map((_, i) => demand(i, 1).share);
    for (let i = 1; i < shares.length; i++) expect(shares[i]!).toBeLessThan(shares[i - 1]!);
    expect(shares[0]!).toBeGreaterThan(0.08);
    expect(shares[0]!).toBeLessThan(0.25);
    expect(shares[9]!).toBeLessThan(0.08);
    // and buy less fruit and meat a person
    expect(demand(0, 1).kg.fruit / DECILES[0]!.people).toBeLessThan(demand(9, 1).kg.fruit / DECILES[9]!.people);
  });

  it('has N identical households demand N times one', () => {
    const one = demand(4, 1), ten = demand(4, 10);
    for (const g of FOOD_GROUPS) expect(ten.kg[g]).toBeCloseTo(10 * one.kg[g]);
    expect(ten.spend).toBeCloseTo(10 * one.spend);
  });

  it('has a town’s demand be the sum of its deciles, and fall as prices rise, more so for the poorer', () => {
    const counts = [900, 1000, 1100, 1200, 1300, 1200, 1100, 1000, 800, 600];
    const town = townDemand(counts);
    const parts = counts.map((n, i) => demand(i, n));
    for (const g of FOOD_GROUPS) expect(town.kg[g]).toBeCloseTo(parts.reduce((s, p) => s + p.kg[g], 0));
    expect(town.spend).toBeCloseTo(parts.reduce((s, p) => s + p.spend, 0));
    // meat's elasticity is about -0.7: 10 % dearer, about 7 % less bought
    const dearer = townDemand(counts, {meat: 1.1});
    const drop = 1 - dearer.kg.meat / town.kg.meat;
    expect(drop).toBeGreaterThan(0.05);
    expect(drop).toBeLessThan(0.1);
    expect(1 - demand(0, 1, {meat: 1.1}).kg.meat / demand(0, 1).kg.meat).toBeGreaterThan(1 - demand(9, 1, {meat: 1.1}).kg.meat / demand(9, 1).kg.meat);
  });
});

describe('the household system', () => {
  const build = () => {
    const g = makeGraph([
      {id: 'kitchen', kind: 'kitchen', name: 'Kitchen', stocks: {money: {unit: 'GBP', amount: 20 as never}}, levers: {ledger: newLedger() as never}},
      {id: HOUSEHOLD, kind: 'household', name: 'Household', levers: {members: startHousehold().members as never, ledger: newHouseholdLedger() as never}},
    ], []);
    const ctx = (tick: 'day' | 'week', hours: number): TickContext => ({
      tick, hours, dt: 1, date: null as never, level: 1, graph: g, rng: rng(1), flow: (f: Flow) => applyFlow(g, f), activity: () => {},
    });
    return {g, ctx};
  };

  it('pays the wage into the purse, takes the shop and the rest of life out, and carries the footprint in', () => {
    const {g, ctx} = build();
    household.on.week!(ctx('week', 168));
    const l = householdLedgerOf(g);
    expect(l.wages).toBeGreaterThan(500);
    expect(l.shopped).toBeGreaterThan(0);
    expect(l.saved).toBe(0);
    expect(l.firstWage).toBe(168);
    expect(g.nodes.kitchen!.stocks.money!.amount).toBeCloseTo(20 + l.wages - l.shopped - l.rest);
    expect(g.nodes[HOUSEHOLD]!.stocks.carbon!.amount).toBeCloseTo(l.carbon);
    expect(g.nodes[HOUSEHOLD]!.stocks['footprint.land']!.amount).toBeCloseTo(l.land);
  });

  it('counts what the garden supplied from the kitchen’s meals and saves it at shop prices at the week’s shop', () => {
    const {g, ctx} = build();
    g.nodes.kitchen!.levers.ledger = {...newLedger(), day: 3, ate: {potatoes: 2.5}} as never;
    household.on.day!(ctx('day', 24));
    expect(householdLedgerOf(g).supplied.potatoes).toBeCloseTo(2.5);
    household.on.day!(ctx('day', 25)); // the same meal isn't counted twice
    expect(householdLedgerOf(g).supplied.potatoes).toBeCloseTo(2.5);
    household.on.week!(ctx('week', 168));
    const l = householdLedgerOf(g);
    expect(l.saved).toBeCloseTo(basket(1).potatoes * PRICE.potatoes); // only what the week needed
    expect(l.supplied).toEqual({});
    expect(sumKg({potatoes: l.bought})).toBeGreaterThan(0);
  });

  it('does nothing without a household node, and refuses a plan on its ledger', () => {
    const g = makeGraph([{id: 'kitchen', kind: 'kitchen', name: 'Kitchen', levers: {ledger: newLedger() as never}}], []);
    const c = {tick: 'week', hours: 168, dt: 1, date: null as never, level: 1, graph: g, rng: rng(1), flow: () => null, activity: () => {}} as TickContext;
    expect(() => household.on.week!(c)).not.toThrow();
    expect(household.command!({type: 'plan', node: HOUSEHOLD, lever: 'ledger', value: null}, g, 1)).toMatch(/ledger/);
  });
});

describe('speed', () => {
  it('costs well under a millisecond a day for one household and a town of ten deciles', () => {
    const h = startHousehold();
    const t0 = performance.now();
    for (let i = 0; i < 10000; i++) householdGardenHours(h, i % 7);
    const day = (performance.now() - t0) / 10000;
    const t1 = performance.now();
    for (let i = 0; i < 1000; i++) townDemand([900, 1000, 1100, 1200, 1300, 1200, 1100, 1000, 800, 600]);
    const town = (performance.now() - t1) / 1000;
    expect(day).toBeLessThan(0.1);
    expect(town).toBeLessThan(1);
    console.info(`household: ${(day * 1000).toFixed(2)} µs a day of hours; a town of ten deciles ${(town * 1000).toFixed(1)} µs`);
  });
});
