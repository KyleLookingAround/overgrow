// The livestock model's plausibility test: three hens lay about a laying breed's 250–300 eggs a year, few in winter; feed
// conversion sits in FAO's ranges; a lamb's methane and manure gases per kg of meat are far above a pig's and an egg's
// and a fraction of Poore & Nemecek's whole-chain figure; manure nitrogen a head is inside IPCC's range; overstocking
// lowers welfare and output and wears the ground; a missed feed or a cold snap cuts today's eggs; a flock's methane
// adds up; the risk of illness rises with density and low welfare; and on the graph, the day's flows balance.
import {describe, expect, it} from 'vitest';
import {N_RANGE, PER_KG, PRODUCT_ROW, SALE_PRICE, SPECIES, EGG_KG, type SpeciesId} from '../../data/livestock';
import {runStep, type TickContext} from '../clock';
import {applyFlow, imbalance, makeNode, qty, stockTotals, type Flow, type Graph, type LeverValue} from '../graph';
import {rng} from '../random';
import {gardenGraph} from '../state';
import {HEAP} from './carbon';
import {
  aggregate, availableN, clearOut, dayFlows, diseaseRisk, fallsIll, footprint, GWP_CH4, heapGases, herdOf, hoursNeeded, ILL_DAYS, LIVE, livestock,
  manureGases, newHerd, OUTBREAKS, outbreak, outbreaksOf, perHead, priceOf, sellEggs, setHerd, slaughter, step, stocking, treat, type Conditions, type Herd,
} from './livestock';
import {eventKgLost, showEvent} from '../ladder';
import {sunOn, type WeatherDay} from './weather';

const FULL = {feed: 1e6, water: 1e6};
/** A temperate year's air and light: a mean of 10 °C swinging 7 either way, the day 8 K wide, and the real day length. */
const dayOfYear = (d: number): Conditions => {
  const t = 10 - 7 * Math.cos(((d - 15) / 365) * 2 * Math.PI);
  return {tmax: t + 4, tmin: t - 4, length: sunOn(d + 1).length, dayOfYear: d + 1};
};
const MILD: Conditions = {tmax: 14, tmin: 6, length: 12, dayOfYear: 120};
const WARM: Conditions = {tmax: 22, tmin: 16, length: 14, dayOfYear: 180};

/** A year (or `days`) of a herd, fed and watered to need unless `supply` says otherwise. */
function run(h: Herd, days: number, supply = FULL, cond: (d: number) => Conditions = dayOfYear, from = 0) {
  const t = {eggs: 0, feed: 0, gain: 0, methane: 0, gases: 0, n: 0, nLost: 0, welfare: [] as number[], eggsByDay: [] as number[]};
  for (let d = from; d < from + days; d++) {
    const r = step(h, cond(d % 365), supply);
    h = r.herd;
    t.eggs += r.eggs; t.feed += r.feed + r.grass; t.gain += r.gain; t.methane += r.methane; t.gases += r.gases; t.n += r.manure.nitrogen; t.nLost += r.nLost;
    t.welfare.push(h.welfare); t.eggsByDay.push(r.eggs);
  }
  return {...t, herd: h};
}

describe('livestock: what it makes', () => {
  it('has three hens lay about a laying breed’s 250–300 eggs a year each, and few in winter', () => {
    const y = run(newHerd('hen', 3, 12, {disease: false}), 365);
    const each = y.eggs / EGG_KG / 3;
    expect(each).toBeGreaterThan(250);
    expect(each).toBeLessThan(300);
    // December to February against June to August: hens lay a good deal less in the short days
    const rate = (a: number, b: number) => y.eggsByDay.slice(a, b).reduce((s, x) => s + x, 0) / (b - a);
    const winter = (rate(0, 45) + rate(335, 365)) / 2, summer = rate(152, 243);
    expect(winter).toBeLessThan(0.65 * summer);
    expect(winter).toBeGreaterThan(0.25 * summer); // fewer, not none
  });

  it('gets feed conversion inside FAO’s ranges', () => {
    const fcr = (id: SpeciesId, product: (r: ReturnType<typeof run>) => number, days: number, start: Partial<Herd> = {}) => {
      const r = run(newHerd(id, 1, SPECIES[id].land, {disease: false, sward: 0.25, shelter: 1, ...start}), days, {feed: 1e6, water: 1e6}, () => WARM);
      return r.feed / product(r);
    };
    // layers: about 2–3 kg of feed for a kg of egg (FAO); grower pigs 2.5–4 a kg of gain; lambs 4–9 a kg of gain
    const hens = run(newHerd('hen', 3, 12, {disease: false}), 365);
    expect(hens.feed / hens.eggs).toBeGreaterThan(2);
    expect(hens.feed / hens.eggs).toBeLessThan(3.2);
    expect(fcr('pig', (r) => r.gain, 30, {weight: 60})).toBeGreaterThan(2.5);
    expect(fcr('pig', (r) => r.gain, 30, {weight: 60})).toBeLessThan(4);
    expect(fcr('lamb', (r) => r.gain, 30, {weight: 20})).toBeGreaterThan(4);
    expect(fcr('lamb', (r) => r.gain, 30, {weight: 20})).toBeLessThan(9);
  });

  it('cuts today’s eggs for a missed feed, an empty trough or a cold snap', () => {
    const eggs = (supply = FULL, c = MILD) => step(newHerd('hen', 3, 12), {...c, length: 15}, supply).eggs;
    const normal = eggs();
    expect(eggs({feed: 0, water: 1e6})).toBeLessThan(0.05 * normal);
    expect(eggs({feed: 0.5 * 3 * SPECIES.hen.intake, water: 1e6})).toBeLessThan(0.7 * normal);
    expect(eggs({feed: 1e6, water: 0})).toBeLessThan(0.05 * normal);
    const snap = eggs(FULL, {tmax: -3, tmin: -10, length: 15, dayOfYear: 30});
    expect(snap).toBeLessThan(0.95 * normal);
    expect(snap).toBeGreaterThan(0.5 * normal);
    // without a house the same night is worse
    const bare = step(newHerd('hen', 3, 12, {shelter: 0}), {tmax: -3, tmin: -10, length: 15, dayOfYear: 30}, FULL).eggs;
    expect(bare).toBeLessThan(snap);
  });
});

describe('livestock: what it gives off', () => {
  it('puts a lamb’s methane and manure gases per kg of meat far above a pig’s and an egg’s, and a fraction of Poore & Nemecek’s', () => {
    const lamb = footprint('lamb'), pig = footprint('pig'), egg = footprint('hen');
    const total = (f: typeof lamb) => f.methane + f.manure;
    expect(total(lamb)).toBeGreaterThan(5 * total(pig));
    expect(total(lamb)).toBeGreaterThan(20 * total(egg));
    expect(egg.methane).toBe(0); // poultry make no enteric methane
    // the whole chain (feed, land, transport) is more than the herd's own gases; enteric methane is a third or so of lamb's
    const share = total(lamb) / PER_KG[PRODUCT_ROW.lamb].ghg;
    expect(share).toBeGreaterThan(0.15);
    expect(share).toBeLessThan(0.6);
    expect(PER_KG.lamb.ghg).toBeGreaterThan(PER_KG.lamb.range[0]);
    expect(PER_KG.lamb.ghg).toBeLessThan(PER_KG.lamb.range[1]);
    expect(total(pig)).toBeLessThan(PER_KG.pig.ghg);
    expect(total(egg)).toBeLessThan(PER_KG.eggs.ghg);
    // and the diet question in Poore & Nemecek's own numbers: lamb costs far more land and carbon than an egg or a pig
    expect(PER_KG.lamb.ghg).toBeGreaterThan(3 * PER_KG.pig.ghg);
    expect(PER_KG.lamb.land).toBeGreaterThan(20 * PER_KG.pig.land);
  });

  it('gives no per-kg figure for a breeding animal rather than dividing by nothing', () => {
    expect(footprint('ewe').product).toBe(0);
    expect(Number.isFinite(footprint('cow').methane)).toBe(true);
  });

  it('counts a flock’s methane by IPCC’s Tier 1 factors, adding up over the years', () => {
    const y = (id: SpeciesId, head: number) => run(newHerd(id, head, head * SPECIES[id].land, {disease: false, sward: 0.25}), 365, FULL, () => MILD).methane;
    expect(y('ewe', 100) / 100 / GWP_CH4).toBeGreaterThan(6); // kg CH₄ a ewe a year: IPCC's 8, when fed to need
    expect(y('ewe', 100) / 100 / GWP_CH4).toBeLessThan(10);
    expect(y('cow', 10) / 10 / GWP_CH4).toBeGreaterThan(40);
    expect(y('cow', 10) / 10 / GWP_CH4).toBeLessThan(70);
    expect(y('pig', 10) / 10 / GWP_CH4).toBeLessThan(2);
    expect(y('hen', 3)).toBe(0);
    // a hundred ewes over ten years: about 216 t CO₂e, the dial's sizeable share
    expect((10 * y('ewe', 100)) / 1000).toBeGreaterThan(150);
    expect((10 * y('ewe', 100)) / 1000).toBeLessThan(300);
  });

  it('excretes nitrogen a head inside IPCC’s range, and values it by RB209', () => {
    for (const id of Object.keys(SPECIES) as SpeciesId[]) {
      // a day at the species' own weight, fed to need, over a year (a grower would be heavier by the end of one)
      const n = 365 * step(newHerd(id, 1, SPECIES[id].land, {disease: false, sward: 0.25}), MILD, FULL).manure.nitrogen;
      expect(n, id).toBeGreaterThan(N_RANGE[id][0]);
      expect(n, id).toBeLessThan(N_RANGE[id][1]);
    }
    // poultry manure is quick, farmyard manure slow: a kg N of hen droppings is worth three times a ewe's to a first crop
    expect(availableN('hen', 1)).toBeGreaterThan(2 * availableN('ewe', 1));
  });

  it('counts manure’s gases by how it is managed: a heap’s are the carbon model’s, pasture and spreading are here', () => {
    const day = (manage: 'heap' | 'spread' | 'pasture') => step(newHerd('pig', 10, 1000, {manage}), MILD, FULL);
    expect(day('heap').gases).toBe(0);
    expect(heapGases(day('heap').manure.kg)).toBeGreaterThan(0);
    expect(day('pasture').gases).toBeGreaterThan(day('spread').gases); // EF3 0.02 against EF1 0.01, and a little more methane
    expect(day('pasture').nLost).toBeGreaterThan(0);
    expect(day('spread').nLost).toBeLessThan(day('pasture').nLost);
    // nitrous oxide dominates the manure gases on the ground; methane from dry, aerobic manure is small
    const m = day('pasture'), g = manureGases(SPECIES.pig, m.manure, m.manure.kg * SPECIES.pig.manure.dry, 'pasture');
    expect(g.nitrous).toBeGreaterThan(5 * g.methane);
  });
});

describe('livestock: welfare and health', () => {
  it('lets overstocking lower welfare and output, and wear the run bare', () => {
    const at = (m2: number) => run(newHerd('hen', 3, m2, {disease: false}), 120, FULL, dayOfYear, 100);
    const roomy = at(12), packed = at(3);
    expect(stocking(newHerd('hen', 3, 3))).toBe(4);
    expect(packed.herd.welfare).toBeLessThan(0.85 * roomy.herd.welfare);
    expect(packed.eggs).toBeLessThan(0.9 * roomy.eggs);
    expect(packed.herd.ground).toBeLessThan(0.7 * roomy.herd.ground);
    expect(roomy.herd.welfare).toBeGreaterThan(0.95);
  });

  it('wears a pasture and a flock down over a summer when there are too many ewes', () => {
    const summer = (head: number) => {
      let h = newHerd('ewe', head, 10000, {disease: false, sward: 0.15}), min = 1;
      for (let d = 90; d < 270; d++) { h = step(h, dayOfYear(d), {feed: 0, water: 1e6}).herd; min = Math.min(min, h.welfare); }
      return {h, min};
    };
    const fit = summer(12), over = summer(36); // 12 ewes on a hectare is a good density; 36 is three times over
    expect(fit.h.ground).toBeGreaterThan(0.95);
    expect(over.h.ground).toBeLessThan(0.5);
    expect(over.h.welfare).toBeLessThan(fit.h.welfare - 0.2);
    expect(over.h.sward).toBeLessThan(fit.h.sward);
  });

  it('lets welfare fall faster than it mends, and a drought of water bite hardest', () => {
    let h = newHerd('pig', 4, 400, {disease: false});
    for (let d = 0; d < 10; d++) h = step(h, MILD, {feed: 1e6, water: 0}).herd;
    const thirsty = h.welfare;
    expect(thirsty).toBeLessThan(0.8);
    for (let d = 0; d < 10; d++) h = step(h, MILD, FULL).herd;
    expect(h.welfare).toBeGreaterThan(thirsty);
    expect(h.welfare).toBeLessThan(0.95); // ten days back does not undo ten days down
  });

  it('cuts eggs and gain when welfare is low', () => {
    const low = {...newHerd('hen', 3, 12), welfare: 0.35}, well = newHerd('hen', 3, 12);
    expect(step(low, MILD, FULL).eggs).toBeLessThan(0.5 * step(well, MILD, FULL).eggs);
    const pig = (w: number) => step({...newHerd('pig', 4, 400), welfare: w}, MILD, FULL).gain;
    expect(pig(0.35)).toBeLessThan(0.5 * pig(1));
  });

  it('finishes a grower at its finishing weight and no further', () => {
    const pig = run(newHerd('pig', 1, 100, {disease: false, weight: 30}), 200, FULL, () => MILD);
    expect(pig.herd.weight).toBeCloseTo(SPECIES.pig.finish, 5);
    expect(pig.gain).toBeCloseTo(70, 3);
  });

  it('raises the risk of illness with density and low welfare, and rolls it from the Rng it is given', () => {
    const well = newHerd('ewe', 12, 10000), packed = newHerd('ewe', 36, 10000), poorly = {...well, welfare: 0.3};
    expect(diseaseRisk(packed)).toBeGreaterThan(1.5 * diseaseRisk(well));
    expect(diseaseRisk(poorly)).toBeGreaterThan(2.5 * diseaseRisk(well));
    expect(diseaseRisk({...well, disease: false})).toBe(0);
    // a year of daily chances at good density: about the species' yearly chance
    const r = rng(7), risk = diseaseRisk(well);
    let falls = 0;
    for (let y = 0; y < 400; y++) for (let d = 0; d < 365; d++) if (fallsIll(risk, r)) { falls++; break; }
    expect(falls / 400).toBeGreaterThan(SPECIES.ewe.illness - 0.06);
    expect(falls / 400).toBeLessThan(SPECIES.ewe.illness + 0.06);
    // the same seed, the same year
    const a = rng(3), b = rng(3);
    expect([1, 2, 3, 4].map(() => fallsIll(0.5, a))).toEqual([1, 2, 3, 4].map(() => fallsIll(0.5, b)));
    // a sick herd makes half as much, and a treated one mends in days
    const sick = {...newHerd('hen', 3, 12), ill: 21};
    expect(step(sick, MILD, FULL).eggs).toBeLessThan(0.6 * step(newHerd('hen', 3, 12), MILD, FULL).eggs);
    expect(treat(sick).ill).toBeLessThan(sick.ill);
    expect(treat({...sick, ill: 2}).ill).toBe(2);
  });
});

describe('livestock: on the graph', () => {
  const MILD_DAY: WeatherDay = {day: 0, dayOfYear: 120, wet: false, rain: 0, rainFrom: 0, rainHours: 0, tmax: 14, tmin: 6, sun: 5, length: 14, zMax: 0, zMin: 0, zSun: 0, warming: 0};

  /** The garden with a hen house joined to the heap, the lawn and the air, and a paddock of pigs. */
  function farm(manage: 'heap' | 'pasture' | 'spread') {
    const g: Graph = gardenGraph();
    const edges = (id: string) => [
      {id: `${id}-heap`, from: id, to: HEAP, carries: ['kgWaste' as const, 'kgCO2e' as const, 'kgN' as const]},
      {id: `${id}-air`, from: id, to: 'atmosphere', carries: ['kgCO2e' as const]},
      {id: `${id}-lawn`, from: id, to: 'lawn', carries: ['kgCO2e' as const, 'kgN' as const]},
    ];
    g.nodes.henhouse = makeNode({id: 'henhouse', kind: 'henhouse', name: 'Hen house', land: {built: 2}, stocks: {
      [LIVE.feed]: {unit: 'kgFeed', product: 'feed', amount: qty(20, 'kgFeed')}, [LIVE.water]: {unit: 'L', amount: qty(50, 'L')},
    }});
    g.edges.push(...edges('henhouse'));
    setHerd(g.nodes.henhouse!, newHerd('hen', 3, 12, {manage, field: 'lawn', disease: false}));
    g.nodes.atmosphere!.levers.weather = MILD_DAY as unknown as LeverValue;
    return g;
  }
  const context = (g: Graph) => {
    const flows: Flow[] = [];
    const ctx = {dt: 24, level: 1, graph: g, activity: () => {}, flow: (f: Flow) => {
      const bad = applyFlow(g, f);
      if (bad) throw new Error(bad);
      flows.push(f);
      return null;
    }};
    return {ctx: ctx as unknown as TickContext, flows, raw: ctx};
  };

  it('feeds the hens, lays eggs, keeps droppings for the heap, and balances every day', () => {
    const g = farm('heap'), {ctx, flows, raw} = context(g), hen = g.nodes.henhouse!;
    let h = 6;
    for (let d = 0; d < 30; d++) {
      const before = stockTotals(Object.values(g.nodes)), n = flows.length;
      h = runStep([livestock], raw as never, 1, h);
      const off = imbalance(before, stockTotals(Object.values(g.nodes)), flows.slice(n));
      expect(off).toEqual({});
    }
    expect(hen.stocks[LIVE.feed]!.amount).toBeLessThan(20);
    expect(hen.stocks[LIVE.eggs]!.amount / EGG_KG).toBeGreaterThan(30); // a month of three hens
    expect(hen.stocks[LIVE.manure]!.amount).toBeGreaterThan(5);
    const droppings = hen.stocks[LIVE.manure]!.amount, carbon = g.nodes.atmosphere!.stocks.carbon!.amount;
    expect(carbon).toBeLessThan(0); // the droppings' carbon came out of the air
    clearOut(ctx, hen);
    expect(hen.stocks[LIVE.manure]!.amount).toBeCloseTo(0);
    expect(g.nodes[HEAP]!.stocks.waste!.amount).toBeCloseTo(droppings);
    expect(g.nodes[HEAP]!.stocks.carbon!.amount).toBeGreaterThan(0);
    expect(herdOf(hen)!.welfare).toBeGreaterThan(0.9);
    expect(herdOf(hen)).not.toBeNull();
  });

  it('leaves pasture droppings in the field’s soil, and spreads manure the same way', () => {
    for (const how of ['pasture', 'spread'] as const) {
      const g = farm(how), {flows} = context(g), raw = context(g).raw, lawn = g.nodes.lawn!;
      const c0 = lawn.stocks['carbon.fresh']!.amount, n0 = lawn.stocks['nitrogen.organic']!.amount;
      runStep([livestock], raw as never, 1, 6);
      void flows;
      expect(lawn.stocks['carbon.fresh']!.amount, how).toBeGreaterThan(c0);
      expect(lawn.stocks['nitrogen.organic']!.amount, how).toBeGreaterThan(n0);
      expect(g.nodes.henhouse!.stocks[LIVE.manure]?.amount ?? 0).toBe(0);
    }
  });

  it('makes flows that all move (no missing stock or edge) and skips a node with no herd', () => {
    const g = farm('heap'), day = step(herdOf(g.nodes.henhouse!)!, MILD, {feed: 20, water: 50});
    for (const f of dayFlows('henhouse', day, {field: 'lawn', heap: HEAP})) expect(applyFlow(g, f), f.what).toBeNull();
    const g2 = gardenGraph();
    g2.nodes.atmosphere!.levers.weather = MILD_DAY as unknown as LeverValue;
    const before = JSON.stringify(g2.nodes);
    runStep([livestock], context(g2).raw as never, 1, 6);
    expect(JSON.stringify(g2.nodes)).toBe(before);
  });

  it('costs little: a hundred herds a day', () => {
    const g = farm('pasture'), {raw} = context(g), hen = g.nodes.henhouse!;
    for (let i = 0; i < 99; i++) g.nodes[`h${i}`] = {...hen, id: `h${i}`, stocks: {...hen.stocks}, levers: {...hen.levers}};
    const t0 = performance.now();
    let h = 6;
    for (let d = 0; d < 20; d++) h = runStep([livestock], raw as never, 1, h);
    expect((performance.now() - t0) / 20).toBeLessThan(10); // ms a game day for a hundred herds: the note gives the measured figure
  });
});

describe('livestock: hooks for the levels above', () => {
  const g0 = () => {
    const g: Graph = gardenGraph();
    g.nodes.paddock = makeNode({id: 'paddock', kind: 'paddock', name: 'Paddock', land: {grass: 100}, stocks: {
      [LIVE.eggs]: {unit: 'kgFood', product: 'eggs', amount: qty(4, 'kgFood')}, [LIVE.mass]: {unit: 'kgFood', product: 'liveweight', amount: qty(100, 'kgFood')},
      [LIVE.feed]: {unit: 'kgFeed', product: 'feed', amount: qty(1e3, 'kgFeed')}, [LIVE.water]: {unit: 'L', amount: qty(1e3, 'L')},
    }});
    g.edges.push(
      {id: 'paddock-heap', from: 'paddock', to: HEAP, carries: ['kgWaste', 'kgCO2e', 'kgN']}, {id: 'paddock-air', from: 'paddock', to: 'atmosphere', carries: ['kgCO2e']},
    );
    g.nodes.atmosphere!.levers.weather = {day: 0, dayOfYear: 120, wet: false, rain: 0, rainFrom: 0, rainHours: 0, tmax: 14, tmin: 6, sun: 5, length: 14, zMax: 0, zMin: 0, zSun: 0, warming: 0} as unknown as LeverValue;
    return g;
  };
  const ctxOf = (g: Graph) => {
    const flows: Flow[] = [];
    const raw = {dt: 24, level: 3, graph: g, activity: () => {}, flow: (f: Flow) => {
      const bad = applyFlow(g, f);
      if (bad) throw new Error(bad);
      flows.push(f);
      return null;
    }};
    return {c: {...raw, hours: 24} as unknown as TickContext, flows, raw};
  };

  it('gives hours a head, a good deal more for a cow than a hen, and more when ill', () => {
    expect(hoursNeeded(newHerd('hen', 3, 12))).toBeCloseTo(3 * SPECIES.hen.hours, 9);
    expect(SPECIES.hen.hours * 365).toBeGreaterThan(1); // a hen takes an hour or two a year
    expect(SPECIES.hen.hours * 365).toBeLessThan(3);
    expect(SPECIES.ewe.hours * 365).toBeGreaterThan(4); // Nix: a ewe 5–8 h a year
    expect(SPECIES.ewe.hours * 365).toBeLessThan(10);
    expect(SPECIES.cow.hours).toBeGreaterThan(SPECIES.ewe.hours);
    const pigs = newHerd('pig', 20, 2000);
    expect(hoursNeeded({...pigs, ill: 10})).toBeGreaterThan(hoursNeeded(pigs));
    expect(hoursNeeded(pigs, 7)).toBeCloseTo(7 * hoursNeeded(pigs), 9);
    expect(hoursNeeded({...pigs, head: 0})).toBe(0);
  });

  it('sells eggs at a price: the food leaves to `sold`, the money comes into the purse, and the graph balances', () => {
    const g = g0(), {c, flows} = ctxOf(g), before = stockTotals(Object.values(g.nodes)), purse = g.nodes.kitchen!.stocks.money!.amount;
    const r = sellEggs(c, g.nodes.paddock!, 3);
    expect(r).toMatchObject({kg: 3, head: 0});
    expect(r.gbp).toBeCloseTo(3 * priceOf('hen'), 9);
    expect(g.nodes.paddock!.stocks[LIVE.eggs]!.amount).toBeCloseTo(1, 9);
    expect(g.nodes.kitchen!.stocks.money!.amount).toBeCloseTo(purse + r.gbp, 9);
    expect(imbalance(before, stockTotals(Object.values(g.nodes)), flows)).toEqual({});
    expect(sellEggs(c, g.nodes.paddock!).kg).toBeCloseTo(1, 9); // the rest
    expect(sellEggs(c, g.nodes.paddock!)).toEqual({kg: 0, gbp: 0, head: 0}); // none left
    // about £3 a kg is about £2 a dozen
    expect(priceOf('hen') * EGG_KG * 12).toBeGreaterThan(1.5);
    expect(priceOf('hen') * EGG_KG * 12).toBeLessThan(3);
  });

  it('slaughters some of a herd: their share of the liveweight leaves as carcass and waste, the money is for whole carcasses, the herd is fewer', () => {
    const g = g0(), {c, flows} = ctxOf(g), node = g.nodes.paddock!, before = stockTotals(Object.values(g.nodes)), purse = g.nodes.kitchen!.stocks.money!.amount;
    setHerd(node, newHerd('pig', 10, 1000, {weight: 100}));
    const r = slaughter(c, node, 4);
    expect(r.head).toBe(4);
    expect(r.kg).toBeCloseTo(100 * 0.4 * SPECIES.pig.dressing, 9); // 40 % of the stock, as carcass
    expect(r.gbp).toBeCloseTo(4 * 100 * SPECIES.pig.dressing * SALE_PRICE.pig.perKg, 9); // £900 or so for four pigs of 75 kg carcass at £3
    expect(r.gbp).toBeGreaterThan(400);
    expect(herdOf(node)!.head).toBe(6);
    expect(node.stocks[LIVE.mass]!.amount).toBeCloseTo(60, 9);
    expect(g.nodes.kitchen!.stocks.money!.amount).toBeCloseTo(purse + r.gbp, 9);
    expect(imbalance(before, stockTotals(Object.values(g.nodes)), flows)).toEqual({}); // the waste left as `decay`
    // more than there are is all of them, and lamb fetches more a kg than pork or mutton
    expect(slaughter(c, node, 100).head).toBe(6);
    expect(slaughter(c, node)).toEqual({kg: 0, gbp: 0, head: 0});
    expect(priceOf('lamb')).toBeGreaterThan(priceOf('pig'));
    expect(priceOf('cow')).toBeGreaterThan(priceOf('ewe'));
  });

  it('makes illness an event that shows a level up and two levels up with the kg the herd loses', () => {
    const h = newHerd('hen', 100, 400), e = outbreak('coop', h, 240);
    expect(e).toMatchObject({kind: 'disease', homeLevel: 1, size: 0.5, days: ILL_DAYS, from: 240, product: 'eggs'});
    expect(outbreak('field', newHerd('ewe', 10, 8000), 0).homeLevel).toBe(3);
    expect(outbreak('field', newHerd('lamb', 10, 3000, {level: 4}), 0).homeLevel).toBe(4);
    const eggsAWeek = (ill: number) => {
      let herd = {...h, ill};
      let kg = 0;
      for (let d = 0; d < ILL_DAYS; d++) {
        const r = step(herd, WARM, FULL);
        herd = r.herd;
        kg += r.eggs;
      }
      return kg;
    };
    const well = eggsAWeek(0), sick = eggsAWeek(ILL_DAYS), perDay = well / ILL_DAYS;
    // the herd's own loss over the illness is half its output (and a little more as welfare falls behind it)
    expect(well - sick).toBeGreaterThan(0.5 * well * 0.95);
    expect(well - sick).toBeLessThan(0.5 * well * 1.5);
    // the event's kg are that half at home, one level up and two up (a region of 20 such coops: this one is a twentieth of its output)
    const home = showEvent(e, 1)!, tile = showEvent(e, 2)!, region = showEvent(e, 3, {node: perDay, region: 20 * perDay})!;
    expect(home.mode).toBe('thing');
    expect(tile.text).toBe('Output −50 % for 21 days');
    expect(region.text).toBe('outbreak: eggs −3 %');
    expect(region.tint).toBe('disease');
    const kg = eventKgLost(home, perDay);
    expect(kg).toBeCloseTo(0.5 * well, 9);
    expect(eventKgLost(tile, perDay)).toBeCloseTo(kg, 9);
    expect(eventKgLost(region, 20 * perDay)).toBeCloseTo(kg, 9);
    // a treated outbreak is shorter, and loses fewer kg
    expect(eventKgLost(showEvent(outbreak('coop', h, 0, 4), 1)!, perDay)).toBeLessThan(kg / 4);
  });

  it('raises the event on the node when a herd falls ill, and drops it once it is over', () => {
    const g = g0(), {raw} = ctxOf(g), node = g.nodes.paddock!;
    // packed tight, badly kept and unfed: the daily chance is at its highest
    setHerd(node, newHerd('pig', 40, 40, {welfare: 0, ground: 0.2}));
    let hours = 0, found = -1;
    for (let d = 0; d < 4000 && found < 0; d++) {
      node.stocks[LIVE.feed]!.amount = qty(0, 'kgFeed');
      hours = runStep([livestock], raw as never, 3, hours);
      if (outbreaksOf(node).length) found = d;
    }
    expect(found).toBeGreaterThanOrEqual(0);
    const ev = outbreaksOf(node)[0]!;
    expect(node.levers[OUTBREAKS]).toHaveLength(1);
    expect(ev).toMatchObject({kind: 'disease', label: 'outbreak', homeLevel: 3, size: 0.5, days: ILL_DAYS, product: 'meat'});
    expect(ev.from).toBeGreaterThan(0);
    expect(ev.from).toBeLessThanOrEqual(hours);
    expect(herdOf(node)!.ill).toBeGreaterThan(0);
  });

  it('gives a herd of many a per-head day: the same as stepping the whole herd, and hens near their yearly eggs', () => {
    const many = newHerd('hen', 2000, 8000, {disease: false, shelter: 0.9}), r = step(many, WARM, FULL), p = perHead('hen', WARM);
    const agg = aggregate(p, 2000);
    expect(agg.eggs).toBeCloseTo(r.eggs, 6);
    expect(agg.feed).toBeCloseTo(r.feed, 6);
    expect(agg.methane).toBeCloseTo(r.methane, 9);
    expect(agg.manure).toBeCloseTo(r.manure.kg, 6);
    expect(agg.hours).toBeCloseTo(hoursNeeded(many), 9);
    // sheep on grass: the aggregate is a herd of one, not a real herd's sward (it grazes as much as it takes, the good density)
    const ewe = perHead('ewe', MILD), flock = step(newHerd('ewe', 300, 300 * SPECIES.ewe.land, {disease: false, sward: 0.25}), MILD, FULL);
    expect(aggregate(ewe, 300).methane).toBeCloseTo(flock.methane, 6);
    expect(aggregate(ewe, 300).manure).toBeCloseTo(flock.manure.kg, 6);
    // a hen lays 250–300 eggs a year over the seasons, up to her rate (0.95 a day) at the best of the light
    const eggs = (p.eggs / EGG_KG) * 365;
    expect(eggs).toBeGreaterThan(300);
    expect(eggs).toBeLessThan(365);
    // more days and more head scale it up, and a poorly kept herd makes less
    expect(aggregate(p, 10, 7).eggs).toBeCloseTo(70 * p.eggs, 9);
    expect(perHead('hen', WARM, 0.5).eggs).toBeLessThan(p.eggs);
    // a lamb has a carcass to sell and a hen has none
    expect(perHead('lamb', MILD).meat).toBeGreaterThan(0);
    expect(perHead('hen', MILD).meat).toBe(0);
  });
});
