// Storage and spoilage's plausibility test: salad keeps days and potatoes weeks at ambient, both far longer cold;
// spoilage roughly doubles or more for each 10 °C (Q10); the kitchen's own days fall out at the home stage; a typical
// chain's losses fall in WRAP's order (home the most, then the farm, then store, shelf and road) and add up; a cold store
// pays for itself for salad in summer and not for potatoes in winter, and costs energy and carbon; a van round's fuel and
// temperature; and the system moves spoiled produce off the shelf to the store's waste with the kg kept whole.
import {describe, expect, it} from 'vitest';
import {CROPS} from '../../data/crops';
import {KEEP_DAYS} from '../../data/kitchen';
import {PRODUCTS, PRODUCT_IDS, TARGET_SHARES, TEMPS, VAN, type ProductId} from '../../data/storage';
import {applyFlow, makeGraph, stockTotals, type Flow, type LeverValue} from '../graph';
import type {TickContext} from '../clock';
import {rng} from '../random';
import {coldStoreKWh, LOADS} from './energy';
import {
  age, chainLosses, coldBenefit, coldCost, fieldLoss, fresh, homeWaste, hold, KEEPING, keepsIn, lossShares, rateFactor, round, roomFor, shelfLife,
  storage, survives, tempAt, typicalChain, wasteFootprint,
} from './storage';

describe('shelf life and Q10', () => {
  it('has salad keep days and potatoes weeks in a shed, both far longer in a cold store', () => {
    expect(keepsIn('salad', 'shed', 15)).toBeGreaterThan(2);
    expect(keepsIn('salad', 'shed', 15)).toBeLessThan(7);
    expect(keepsIn('potatoes', 'shed', 15)).toBeGreaterThan(30);
    expect(keepsIn('salad', 'cold store', 15)).toBeGreaterThan(2.5 * keepsIn('salad', 'shed', 15));
    expect(keepsIn('potatoes', 'cold store', 15)).toBeGreaterThan(1.9 * keepsIn('potatoes', 'shed', 15));
  });

  it('spoils about two to three and a half times as fast for every 10 °C warmer', () => {
    for (const p of PRODUCT_IDS) {
      const r = rateFactor(p, 30) / rateFactor(p, 20);
      expect(r).toBeGreaterThanOrEqual(2);
      expect(r).toBeLessThanOrEqual(3.5);
      expect(shelfLife(p, 10)).toBeCloseTo(shelfLife(p, 20) * r, 5);
    }
  });

  it('keeps tomatoes and beans out of the cold room’s chill, but not salad or eggs', () => {
    expect(tempAt('tomatoes', 'cold store', 15)).toBeGreaterThanOrEqual(10);
    expect(tempAt('beans', 'cold store', 15)).toBeGreaterThanOrEqual(7);
    expect(tempAt('salad', 'cold store', 15)).toBe(TEMPS.cold);
    expect(tempAt('eggs', 'shelf', 15)).toBe(TEMPS.chilled);
  });

  it('has the home stage fall out of the kitchen’s own days within 20 %, and its keep-days follow', () => {
    for (const crop of Object.values(CROPS)) {
      if (crop.flower || crop.dugIn) continue; // grown for the bees or the soil, never kept or eaten
      const home = shelfLife(crop.product as ProductId, TEMPS.home);
      expect(Math.abs(home / crop.keeps.kitchen - 1)).toBeLessThan(0.2);
      const kitchen = Math.min(KEEP_DAYS, crop.keeps.kitchen / 2), ours = Math.min(KEEP_DAYS, home / 2);
      expect(Math.abs(ours / kitchen - 1)).toBeLessThan(0.2);
    }
  });
});

describe('lots', () => {
  it('ages a lot without losing a kilogram: what is left and what went are what there was', () => {
    let lot = fresh('salad', 10), gone = 0;
    for (let d = 0; d < 8; d++) {
      const a = age(lot, 'shed', 1, 15);
      gone += a.spoiled;
      lot = a.lot;
    }
    expect(lot.kg + gone).toBeCloseTo(10, 9);
    expect(lot.kg).toBeLessThan(1);
    expect(survives(0)).toBe(1);
    expect(survives(1)).toBe(0);
  });

  it('loses little early and all together late, faster when warm', () => {
    const at = (t: number) => age(fresh('salad', 1), 'shed', 1, t).spoiled;
    expect(at(15)).toBeLessThan(0.05);
    expect(homeWaste('salad', 0.6)).toBeGreaterThan(homeWaste('salad', 0));
    const warm = hold('salad', 100, 3, 25, false), cool = hold('salad', 100, 3, 5, false);
    expect(warm.spoiled).toBeGreaterThan(cool.spoiled);
  });
});

describe('losses by stage', () => {
  it('adds up: every kg harvestable is lost at a stage or eaten', () => {
    for (const p of PRODUCT_IDS) {
      const l = chainLosses(p, 100, {holdDays: PRODUCTS[p].hold, cold: false, roadHours: 4, shelfDays: PRODUCTS[p].shelfDays, standard: 'loose', outsideC: 15});
      expect(l.unharvested + l.graded + l.store + l.road + l.shelf + l.home + l.eaten).toBeCloseTo(100, 6);
    }
  });

  it('puts most waste at home and on the farm, then the store, the shelf and the road, as WRAP and FAO have it', () => {
    for (const outside of [12, 20]) {
      const s = lossShares(typicalChain(outside));
      expect(s.home).toBeGreaterThan(s.field);
      expect(s.field).toBeGreaterThan(s.store);
      expect(s.store).toBeGreaterThan(s.shelf);
      expect(s.shelf).toBeGreaterThan(s.road);
      expect(s.home + s.field).toBeGreaterThan(0.8);
    }
    // near WRAP's shares in a mild year: home about half, the farm about a third or less
    const s = lossShares(typicalChain(12));
    expect(s.home).toBeGreaterThan(TARGET_SHARES.home - 0.15);
    expect(s.home).toBeLessThan(TARGET_SHARES.home + 0.2);
    expect(s.field).toBeGreaterThan(TARGET_SHARES.field - 0.15);
    expect(s.field).toBeLessThan(TARGET_SHARES.field + 0.15);
    expect(s.shelf).toBeLessThan(0.1);
  });

  it('loses about a quarter to a half of a household’s veg between the field and the plate, in FAO’s range', () => {
    const l = typicalChain(12), lost = (l.harvestable - l.eaten) / l.harvestable;
    expect(lost).toBeGreaterThan(0.15);
    expect(lost).toBeLessThan(0.5);
  });

  it('wastes more of a lot the strict standard grades out, and more when it is warm', () => {
    expect(fieldLoss(typicalChain(12, 'strict'))).toBeGreaterThan(fieldLoss(typicalChain(12, 'loose')));
    expect(typicalChain(20).eaten).toBeLessThan(typicalChain(5).eaten);
  });

  it('carries the carbon growing it took, and the methane of landfill against compost, and the land behind it', () => {
    const waste = wasteFootprint('salads', 10, 'waste'), compost = wasteFootprint('salads', 10, 'compost');
    expect(waste.co2e).toBeGreaterThan(10 * 0.6);
    expect(waste.co2e).toBeGreaterThan(compost.co2e);
    expect(waste.land).toBeGreaterThan(0);
    expect(wasteFootprint('salads', 10, 'feed').value).toBeGreaterThan(0);
  });
});

describe('the cold store', () => {
  it('uses the energy model’s kWh, priced and counted for carbon', () => {
    const c = coldCost(20, 15, 1);
    expect(c.kWh).toBeCloseTo(coldStoreKWh(20, 15), 9);
    expect(c.cost).toBeCloseTo(c.kWh * 0.27, 6);
    expect(c.co2e).toBeCloseTo(c.kWh * 0.2, 6);
    expect(coldCost(20, 25).kWh).toBeGreaterThan(coldCost(20, 5).kWh);
  });

  it('pays for itself for a lot of salad in summer, and not for potatoes in winter', () => {
    const salad = coldBenefit('salad', 120, 4, 22, 3);
    expect(salad.saved).toBeGreaterThan(50);
    expect(salad.net).toBeGreaterThan(0);
    const potatoes = coldBenefit('potatoes', 4000, 90, 5, 1.1);
    expect(potatoes.net).toBeLessThan(0);
    expect(potatoes.energy).toBeGreaterThan(0);
  });

  it('is a trade-off that goes both ways: worth it for potatoes held through a warm autumn, not for a day’s salad in winter', () => {
    expect(coldBenefit('potatoes', 4000, 90, 12, 1.1).net).toBeGreaterThan(0);
    expect(coldBenefit('salad', 120, 1, 5, 3).net).toBeLessThan(0);
    expect(coldBenefit('salad', 120, 4, 22, 3).co2e).toBeGreaterThan(0);
  });

  it('cuts a typical chain’s waste in summer for the energy and carbon it costs', () => {
    expect(typicalChain(22, 'loose', true).eaten).toBeGreaterThan(typicalChain(22, 'loose', false).eaten);
    expect(roomFor('salad', 120)).toBeGreaterThan(roomFor('potatoes', 120));
  });
});

describe('the van', () => {
  it('burns diesel by the kilometre for a round of stops, warm as a van in the sun, in more rounds when it holds too few', () => {
    const r = round(40, 15);
    expect(r.km).toBeCloseTo(VAN.baseKm + 40 * VAN.kmPerStop, 6);
    expect(r.litres).toBeCloseTo((r.km * VAN.litresPer100km) / 100, 6);
    expect(r.cost).toBeCloseTo(r.litres * 0.85, 6);
    expect(r.co2e).toBeCloseTo(r.litres * 2.7, 6);
    expect(r.tempC).toBeGreaterThan(15);
    expect(r.hours).toBeGreaterThan(1);
    expect(r.hours).toBeLessThan(6);
    expect(round(VAN.capacity + 1, 15).rounds).toBe(2);
  });
});

describe('the storage system', () => {
  const build = (cold: boolean) => {
    const g = makeGraph([{
      id: 'store', kind: 'store', name: 'Store',
      stocks: {'food.salad': {unit: 'kgFood', amount: 50 as never, product: 'salad'}},
      levers: {[KEEPING]: {place: 'shed', life: {}} as unknown as LeverValue, ...(cold ? {[LOADS]: [{kind: 'cold store', m3: 2}] as unknown as LeverValue} : {})},
    }], []);
    const flows: Flow[] = [];
    const ctx = {tick: 'day', hours: 24, dt: 24, date: null, level: 3, graph: g, rng: rng(1), activity: () => {}, flow: (f: Flow) => {
      const bad = applyFlow(g, f);
      if (bad) throw new Error(bad);
      flows.push(f);
      return null;
    }} as unknown as TickContext;
    return {g, ctx, flows};
  };

  it('ages what a store holds, sends what goes off to its waste, and keeps every kilogram', () => {
    const {g, ctx} = build(false);
    const before = stockTotals(Object.values(g.nodes))['kgFood:salad']!;
    for (let d = 0; d < 3; d++) storage.on.day!(ctx);
    const left = g.nodes.store!.stocks['food.salad']!.amount, waste = g.nodes.store!.stocks.waste?.amount ?? 0;
    expect(left).toBeLessThan(50);
    expect(left + waste).toBeCloseTo(before, 6);
    expect((g.nodes.store!.levers[KEEPING] as unknown as {life: Record<string, number>}).life.salad).toBeGreaterThan(0);
  });

  it('spoils less with the cold store on, the load the energy system pays for', () => {
    const a = build(false), b = build(true);
    for (let d = 0; d < 6; d++) {
      storage.on.day!(a.ctx);
      storage.on.day!(b.ctx);
    }
    expect(b.g.nodes.store!.stocks['food.salad']!.amount).toBeGreaterThan(a.g.nodes.store!.stocks['food.salad']!.amount);
  });

  it('refuses to have the keeping lever set', () => {
    expect(storage.command!({type: 'plan', node: 'store', lever: KEEPING, value: null}, makeGraph([], []), 3)).toMatch(/where it is/);
  });
});

describe('speed', () => {
  it('costs microseconds a day for a store, a van and a shelf', () => {
    const t0 = performance.now(), n = 5000;
    for (let i = 0; i < n; i++) {
      for (const p of PRODUCT_IDS) age(fresh(p, 50), 'shed', 1, 12);
      round(40, 12);
      typicalChain(12);
    }
    const ms = (performance.now() - t0) / n;
    expect(ms).toBeLessThan(0.5);
    console.info(`storage: ${(ms * 1000).toFixed(1)} µs a day for nine products aged, a round and a typical chain`);
  });
});
