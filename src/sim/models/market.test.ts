// The market models' plausibility test: N subscriber households' demand is household.ts's for the same N; a box scheme's
// revenue is steadier than a farm shop's but lower a kg; a short box cuts goodwill and then the subscribers over months,
// and topping up pays over a long run and not over a month; a strict standard raises the price and the waste together,
// and wins with plenty and loses when supply is short; the shop's footfall follows season, weekday and price from the
// game's dice; a dearer shop wins when stock is short and loses when it is plentiful; unsold stock keeps spoiling;
// holding potatoes for the spring pays and holding salad doesn't; and the systems move the kg, the £ and the carbon.
import {describe, expect, it} from 'vitest';
import {BOX, SHOP} from '../../data/market';
import {PRICE, VEG} from '../../data/household';
import {GRADE, TEMPS} from '../../data/storage';
import {applyFlow, makeGraph, stockTotals, type Flow, type LeverValue} from '../graph';
import {calendar, type TickContext} from '../clock';
import {rng} from '../random';
import {demand, townDemand} from './household';
import {ENERGY_USED, PURSE} from './energy';
import {KEEPING} from './storage';
import {
  ageStock, BOX_NODE, boxPrice, FARM_SHOP, boxPromise, boxScheme, customersToday, dispose, emptyStock, farmShop, fillWeek, footfallMean, grade, holdValue, LEDGER,
  nextGoodwill, noKg, promised, restock, schemeDemand, SCHEME, schemeOf, serveDay, SHOP_NODE, shopOf, startScheme, startShop, step, stockOf,
  subscribers, type Kg, type Ledger, type Scheme, type Shop, type Stock,
} from './market';
import {STORE} from './storage';
import {ATMOSPHERE} from '../state';

const plenty = (kg = 1e6): Stock => ({kg: {potatoes: kg, salads: kg, tomatoes: kg, greens: kg}, life: noKg()});
/** A stock that covers `share` of the week's promise, with a margin for grading and the road. */
const supply = (s: Scheme, share: number): Stock => {
  const p = promised(s.counts), kg = noKg();
  for (const g of VEG) kg[g] = p[g] * share * 1.07;
  return {kg, life: noKg()};
};
const sum = (k: Kg) => VEG.reduce((a, g) => a + k[g], 0);
const cv = (xs: number[]) => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) / m;
};
const ONE_DAY = (i: number) => calendar(24 * i);

describe('the box scheme’s households', () => {
  it('demands what household.ts says for the same number of households, and is linear in them', () => {
    const a = schemeDemand([0, 0, 0, 0, 40, 0, 0, 0, 0, 0]), b = demand(4, 40);
    for (const g of VEG) expect(a.kg[g]).toBeCloseTo(b.kg[g], 9);
    expect(schemeDemand([0, 0, 0, 0, 80, 0, 0, 0, 0, 0]).spend).toBeCloseTo(2 * a.spend, 6);
    const counts = startScheme(40).counts;
    expect(schemeDemand(counts).spend).toBeCloseTo(townDemand(counts).spend, 9);
    expect(subscribers(startScheme(40))).toBeCloseTo(40, 9);
  });

  it('promises each box a set share of its household’s weekly veg, richer boxes larger, at a price below a shop’s', () => {
    for (const g of VEG) expect(boxPromise(4)[g]).toBeCloseTo(BOX.share * demand(4, 1).kg[g], 9);
    expect(sum(boxPromise(9))).toBeGreaterThan(sum(boxPromise(1)) * 0.8);
    const full = VEG.reduce((s, g) => s + boxPromise(4)[g] * PRICE[g], 0);
    expect(boxPrice(4, BOX.priceIndex)).toBeCloseTo(full * BOX.priceIndex, 9);
    expect(BOX.priceIndex).toBeLessThan(SHOP.priceIndex);
  });
});

describe('a box scheme against a farm shop', () => {
  const box = (weeks: number) => {
    let s = startScheme(40);
    const rev: number[] = [], kg: number[] = [];
    for (let w = 0; w < weeks; w++) {
      const {week} = fillWeek(s, plenty(), 1 + w * 7, 10);
      rev.push(week.revenue);
      kg.push(sum(week.delivered));
      s = step(s, week.fill);
    }
    return {rev, kg};
  };
  const shop = (seed: number, weeks: number) => {
    const r = rng(seed), rev: number[] = [], kg: number[] = [];
    let cash = 0, sold = 0;
    for (let d = 0; d < weeks * 7; d++) {
      const date = ONE_DAY(d);
      const {day} = serveDay(startShop({shelf: plenty()}), {season: date.season, weekday: date.weekday, dayOfYear: date.dayOfYear}, r);
      cash += day.revenue;
      sold += sum(day.sold);
      if (d % 7 === 6) {
        rev.push(cash);
        kg.push(sold);
        cash = sold = 0;
      }
    }
    return {rev, kg};
  };

  it('earns steadier money from the box scheme (a lower coefficient of variation), and less a kg', () => {
    const b = box(52), s = shop(3, 52);
    expect(cv(b.rev)).toBeLessThan(cv(s.rev) / 3);
    const perKgBox = b.rev.reduce((x, y) => x + y, 0) / b.kg.reduce((x, y) => x + y, 0);
    const perKgShop = s.rev.reduce((x, y) => x + y, 0) / s.kg.reduce((x, y) => x + y, 0);
    expect(perKgBox).toBeLessThan(perKgShop);
  });

  it('is the same on other seeds, and the shop’s weeks really vary between seeds', () => {
    for (const seed of [1, 2, 5]) expect(cv(box(52).rev)).toBeLessThan(cv(shop(seed, 52).rev));
    expect(shop(1, 4).rev).not.toEqual(shop(2, 4).rev);
    expect(shop(1, 4).rev).toEqual(shop(1, 4).rev);
  });
});

describe('goodwill and subscribers', () => {
  const run = (share: number, topUp: boolean, months: number) => {
    let s = startScheme(40, {topUp}), profit = 0;
    for (let w = 0; w < months * BOX.weeksPerMonth; w++) {
      const {week} = fillWeek(s, supply(s, share), 100, 10);
      profit += week.profit;
      s = step(s, week.fill);
    }
    return {s, profit};
  };

  it('cuts goodwill in a week with a short box, and builds it with a full one', () => {
    expect(nextGoodwill(0.8, 0.6)).toBeLessThan(0.8);
    expect(nextGoodwill(0.8, 1)).toBeGreaterThan(0.8);
    const s = startScheme(40), short = fillWeek(s, supply(s, 0.6), 100, 10).week;
    expect(short.fill).toBeLessThan(0.8);
    expect(short.revenue).toBeLessThan(fillWeek(s, plenty(), 100, 10).week.revenue);
    expect(sum(short.short)).toBeGreaterThan(0);
  });

  it('loses subscribers over months when boxes are short, and keeps them when they are full', () => {
    const full = run(1, false, 12), short = run(0.7, false, 12);
    expect(subscribers(short.s)).toBeLessThan(subscribers(full.s) * 0.75);
    expect(short.s.goodwill).toBeLessThan(full.s.goodwill);
    expect(subscribers(full.s)).toBeGreaterThan(35);
  });

  it('is cheaper not to top up a short box for a month, dearer over two years: the shortfall costs later', () => {
    expect(run(0.85, false, 1).profit).toBeGreaterThan(run(0.85, true, 1).profit);
    expect(run(0.85, true, 24).profit).toBeGreaterThan(run(0.85, false, 24).profit);
  });

  it('fills a short box from imports at a cost and the carbon of what is imported', () => {
    const s = startScheme(40, {topUp: true}), w = fillWeek(s, supply(s, 0.5), 100, 10).week;
    expect(w.fill).toBeCloseTo(1, 6);
    expect(sum(w.imported)).toBeGreaterThan(0);
    expect(w.importCost).toBeGreaterThan(0);
    expect(w.importCo2e).toBeGreaterThan(0);
    expect(fillWeek(startScheme(40), plenty(), 100, 10).week.importCost).toBe(0);
  });

  it('draws a van round’s fuel and hours for the scheme’s size', () => {
    const w = fillWeek(startScheme(40), plenty(), 100, 10).week;
    expect(w.round.stops).toBe(40);
    expect(w.fuel).toBeGreaterThan(0);
    expect(w.hours.pack).toBeCloseTo((40 * BOX.packMin) / 60, 6);
    expect(w.hours.drive).toBeGreaterThan(1);
  });
});

describe('grading', () => {
  it('sends the graded-out share to waste, more for a strict standard', () => {
    const kg = {potatoes: 100, salads: 100, tomatoes: 100, greens: 100};
    const loose = grade(kg, 'loose'), strict = grade(kg, 'strict');
    expect(sum(strict.out)).toBeGreaterThan(sum(loose.out) * 2);
    for (const g of VEG) expect(loose.out[g] + loose.usable[g]).toBeCloseTo(100, 9);
    expect(dispose(strict.out, 'waste').co2e).toBeGreaterThan(dispose(strict.out, 'compost').co2e);
    expect(dispose(strict.out, 'feed').value).toBeGreaterThan(0);
  });

  it('raises the price per kg and the waste together when boxes are plentiful', () => {
    const loose = fillWeek(startScheme(40), plenty(), 100, 10).week, strict = fillWeek(startScheme(40, {standard: 'strict'}), plenty(), 100, 10).week;
    expect(strict.revenue / sum(strict.delivered)).toBeGreaterThan(loose.revenue / sum(loose.delivered));
    expect(strict.revenue).toBeGreaterThan(loose.revenue);
    expect(sum(strict.graded)).toBeGreaterThan(sum(loose.graded));
    expect(sum(strict.raw)).toBeGreaterThan(sum(loose.raw));
  });

  it('is not always better: with too little picked, a strict standard earns less', () => {
    const s = startScheme(40), scarce = supply(s, 0.5);
    expect(fillWeek(startScheme(40, {standard: 'strict'}), scarce, 100, 10).week.revenue).toBeLessThan(fillWeek(s, scarce, 100, 10).week.revenue);
    for (const g of VEG) expect(GRADE[g].strict).toBeGreaterThan(GRADE[g].loose);
  });
});

describe('the farm shop', () => {
  it('draws more walkers-in at weekends and in summer, fewer when it is dearer, from the dice', () => {
    const d = (season: string, weekday: number) => ({season, weekday});
    expect(footfallMean(d('summer', 5), 1.25)).toBeGreaterThan(footfallMean(d('summer', 1), 1.25));
    expect(footfallMean(d('summer', 1), 1.25)).toBeGreaterThan(footfallMean(d('winter', 1), 1.25));
    expect(footfallMean(d('summer', 5), 1.6)).toBeLessThan(footfallMean(d('summer', 5), 1.25));
    const r = rng(9), n = 2000;
    let sum1 = 0;
    for (let i = 0; i < n; i++) sum1 += customersToday(30, r);
    expect(sum1 / n).toBeGreaterThan(26);
    expect(sum1 / n).toBeLessThan(34);
    expect(customersToday(30, rng(4))).toBe(customersToday(30, rng(4)));
  });

  it('buys by households’ baskets and the price elasticity: a dearer shelf sells fewer kg a customer', () => {
    const date = {season: 'summer', weekday: 5, dayOfYear: 190};
    const kgPer = (index: number) => {
      const r = rng(2);
      let kg = 0, customers = 0;
      for (let i = 0; i < 40; i++) {
        const {day} = serveDay(startShop({priceIndex: index, shelf: plenty()}), date, r);
        kg += sum(day.sold);
        customers += day.customers;
      }
      return kg / customers;
    };
    expect(kgPer(1.6)).toBeLessThan(kgPer(1));
    expect(kgPer(1)).toBeGreaterThan(0.5);
  });

  it('is a price lever with no best setting: dearer wins when the shelf is short, cheaper when it is plentiful', () => {
    const takings = (index: number, kg: number) => {
      const r = rng(7);
      let cash = 0;
      for (let d = 0; d < 120; d++) {
        const date = ONE_DAY(d + 100);
        const shelf: Stock = {kg: {potatoes: kg, salads: kg, tomatoes: kg, greens: kg}, life: noKg()};
        cash += serveDay(startShop({priceIndex: index, shelf}), {season: date.season, weekday: date.weekday, dayOfYear: date.dayOfYear}, r).day.revenue;
      }
      return cash;
    };
    expect(takings(1.8, 1)).toBeGreaterThan(takings(0.9, 1));
    expect(takings(0.9, 1e6)).toBeGreaterThan(takings(1.8, 1e6));
  });

  it('keeps what does not sell on the shelf, dulling and spoiling: salad is gone in a week or two, potatoes are not', () => {
    let shelf: Stock = {kg: {potatoes: 50, salads: 50, tomatoes: 50, greens: 50}, life: noKg()};
    for (let d = 0; d < 12; d++) shelf = ageStock(shelf, 'shelf', 1, 10).stock;
    expect(shelf.kg.salads).toBeLessThan(2);
    expect(shelf.kg.potatoes).toBeGreaterThan(48);
    expect(shelf.life.salads).toBeGreaterThan(shelf.life.potatoes);
  });

  it('restocks the shelf graded to its standard, the graded-out share going to waste', () => {
    const r = restock(startShop({standard: 'strict'}), {potatoes: 100, salads: 100, tomatoes: 100, greens: 100});
    expect(sum(r.graded)).toBeGreaterThan(0);
    expect(sum(r.shop.shelf.kg) + sum(r.graded)).toBeCloseTo(400, 9);
  });

  it('earns a higher price for a strict standard on the same sales', () => {
    const date = {season: 'summer', weekday: 5, dayOfYear: 190};
    const perKg = (standard: 'loose' | 'strict') => {
      const {day} = serveDay(startShop({standard, shelf: plenty()}), date, rng(11));
      return day.revenue / sum(day.sold);
    };
    expect(perKg('strict')).toBeGreaterThan(perKg('loose'));
  });
});

describe('selling now or holding', () => {
  it('pays to hold potatoes from autumn to spring, and not to hold salad', () => {
    expect(holdValue('potatoes', 1000, 120, 285, 8, 1, false).gain).toBeGreaterThan(0);
    expect(holdValue('salads', 100, 10, 200, 15, 1, false).gain).toBeLessThan(0);
    expect(holdValue('salads', 100, 10, 200, 15, 1, true, 5).gain).toBeLessThan(0);
  });

  it('is not the same every year: the season and the temperature decide, and holding warm potatoes for long loses', () => {
    expect(holdValue('potatoes', 1000, 120, 285, 8, 1, false).gain).toBeGreaterThan(holdValue('potatoes', 1000, 150, 120, 18, 1, false).gain);
    expect(holdValue('potatoes', 1000, 400, 285, 18, 1, false).gain).toBeLessThan(0);
    expect(TEMPS.home).toBeGreaterThan(0);
  });
});

describe('the systems', () => {
  const build = () => {
    const stock = (p: string, kg: number) => ({unit: 'kgFood' as const, amount: kg as never, product: p});
    const g = makeGraph([
      {id: STORE, kind: 'store', name: 'Store', stocks: {'food.potatoes': stock('potatoes', 400), 'food.salad': stock('salad', 200), 'food.tomatoes': stock('tomatoes', 150), 'food.beans': stock('beans', 150)}, levers: {[KEEPING]: {place: 'shed', life: {}} as unknown as LeverValue}},
      {id: BOX_NODE, kind: 'box', name: 'Box scheme', levers: {[SCHEME]: startScheme(40, {topUp: true}) as never}},
      {id: SHOP_NODE, kind: 'shop', name: 'Farm shop', levers: {[FARM_SHOP]: startShop() as never, target: {potatoes: 20, salads: 15, tomatoes: 8, greens: 8} as never, [KEEPING]: {place: 'shelf', life: {}} as unknown as LeverValue}},
      {id: PURSE, kind: 'kitchen', name: 'Kitchen', stocks: {money: {unit: 'GBP', amount: 100 as never}}},
      {id: ATMOSPHERE, kind: 'atmosphere', name: 'Air', levers: {weather: null}},
    ], [{id: 'store-shop', from: STORE, to: SHOP_NODE, carries: ['kgFood']}]);
    const flows: Flow[] = [];
    const ctx = (tick: 'day' | 'week', hours: number, seed = 1) => ({
      tick, hours, dt: 24, date: calendar(hours), level: 3, graph: g, rng: rng(seed), activity: () => {}, flow: (f: Flow) => {
        const bad = applyFlow(g, f);
        if (bad) throw new Error(bad);
        flows.push(f);
        return null;
      },
    }) as unknown as TickContext;
    return {g, ctx, flows};
  };

  it('has the box scheme take from the store, deliver, pay, top up and burn diesel, with the kg kept whole', () => {
    const {g, ctx, flows} = build();
    const before = stockTotals(Object.values(g.nodes));
    boxScheme.on.week!(ctx('week', 24 * 100));
    const money = g.nodes[PURSE]!.stocks.money!.amount, sold = flows.filter((f) => f.to && 'boundary' in f.to && f.to.boundary === 'sold' && f.unit === 'kgFood').reduce((s, f) => s + f.amount, 0);
    expect(sold).toBeGreaterThan(30);
    expect(money).toBeGreaterThan(100 - 20);
    expect(g.nodes[BOX_NODE]!.stocks[ENERGY_USED]!.amount).toBeGreaterThan(0);
    expect(g.nodes[ATMOSPHERE]!.stocks.carbon!.amount).toBeGreaterThan(0);
    const after = stockTotals(Object.values(g.nodes)), leftFood = ['potatoes', 'salad', 'tomatoes', 'beans'].reduce((s, p) => s + (after[`kgFood:${p}`] ?? 0), 0);
    const startFood = ['potatoes', 'salad', 'tomatoes', 'beans'].reduce((s, p) => s + (before[`kgFood:${p}`] ?? 0), 0);
    const gone = flows.filter((f) => f.unit === 'kgFood').reduce((s, f) => s + f.amount, 0);
    expect(leftFood + gone).toBeCloseTo(startFood, 6);
    const l = g.nodes[BOX_NODE]!.levers[LEDGER] as unknown as Ledger;
    expect(l.weeks).toBe(1);
    expect(l.firstBox).toBe(24 * 100);
    expect((schemeOf(g.nodes[BOX_NODE])!).weeks).toBe(1);
  });

  it('has the farm shop restock from the store, sell to the dice and pay the purse, the same on the same seed', () => {
    const run = (seed: number) => {
      const {g, ctx} = build();
      for (let d = 0; d < 20; d++) farmShop.on.day!(ctx('day', 24 * (150 + d), seed));
      return g.nodes[PURSE]!.stocks.money!.amount;
    };
    expect(run(3)).toBeGreaterThan(100);
    expect(run(3)).toBe(run(3));
    expect(run(3)).not.toBe(run(4));
    expect(shopOf(build().g.nodes[SHOP_NODE])!.standard).toBe('strict');
  });

  it('reads a node’s stock by veg group', () => {
    const {g} = build(), s = stockOf(g.nodes[STORE]!);
    expect(s.kg.potatoes).toBe(400);
    expect(s.kg.salads).toBe(200);
    expect(sum(emptyStock().kg)).toBe(0);
  });

  it('refuses to have a ledger set', () => {
    expect(boxScheme.command!({type: 'plan', node: BOX_NODE, lever: LEDGER, value: null}, makeGraph([], []), 3)).toMatch(/ledger/);
    expect(farmShop.command!({type: 'plan', node: SHOP_NODE, lever: LEDGER, value: null}, makeGraph([], []), 3)).toMatch(/ledger/);
  });
});

describe('speed', () => {
  it('costs well under a millisecond for a day of a store, a van, a shop and a 40-box scheme', () => {
    const s = startScheme(40), shop: Shop = startShop({shelf: plenty()}), r = rng(1);
    const t0 = performance.now(), n = 3000;
    for (let i = 0; i < n; i++) {
      const date = ONE_DAY(i);
      serveDay(shop, {season: date.season, weekday: date.weekday, dayOfYear: date.dayOfYear}, r);
      if (i % 7 === 0) fillWeek(s, plenty(), date.dayOfYear, 10);
      if (i % 28 === 0) step(s, 0.9);
    }
    const ms = (performance.now() - t0) / n;
    expect(ms).toBeLessThan(1);
    console.info(`market: ${(ms * 1000).toFixed(1)} µs a day for the shop, plus a week's boxes every seventh`);
  });
});
