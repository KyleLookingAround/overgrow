// The carbon model's plausibility test: a heap stores most of its waste's carbon as compost and emits the rest, with a
// little methane and nitrous oxide of IPCC's size; compost spread on a bed feeds its organic matter and returns the
// phosphorus and potassium its waste carried in, conserved and about as rich as WRAP's PAS 100 composts; and a plot dug
// out of the lawn loses soil carbon over twenty years to roughly IPCC's cropland factor against grass.
import {describe, expect, it} from 'vitest';
import {runStep, type TickContext} from '../clock';
import {applyFlow, qty, type Flow, type Graph, type LeverValue} from '../graph';
import {gardenGraph} from '../state';
import {carbon, COMPOST_YIELD, compostOn, dig, HEAP, spread, toHeap, WASTE_C} from './carbon';
import {SOIL, soil} from './soil';
import {water} from './water';
import {weather, type WeatherDay} from './weather';

const MILD: WeatherDay = {day: 0, dayOfYear: 120, wet: false, rain: 0, rainFrom: 0, rainHours: 0, tmax: 14, tmin: 6, sun: 5, length: 14, zMax: 0, zMin: 0, zSun: 0, warming: 0};

function context(g: Graph, dt = 24) {
  const flows: Flow[] = [];
  const ctx = {dt, level: 1, graph: g, activity: () => {}, flow: (f: Flow) => {
    const bad = applyFlow(g, f);
    if (bad) throw new Error(bad);
    flows.push(f);
    return null;
  }};
  return {ctx, flows};
}
const sum = (flows: Flow[], what: string, unit: string) => flows.filter((f) => f.what === what && f.unit === unit).reduce((s, f) => s + f.amount, 0);

describe('carbon', () => {
  it('composts green waste: most of its carbon stored in the compost, the rest to the air, with methane and nitrous oxide', () => {
    const g = gardenGraph(), {ctx, flows} = context(g), air = g.nodes.atmosphere!.stocks.carbon!;
    g.nodes.kitchen!.stocks.waste = {unit: 'kgWaste', product: 'greens', amount: qty(10, 'kgWaste')};
    toHeap(ctx as unknown as TickContext, g.nodes.kitchen!, 10);
    const taken = -air.amount;
    expect(taken).toBeCloseTo(10 * WASTE_C); // the plants' carbon, counted as it reaches the heap
    g.nodes.atmosphere!.levers.weather = MILD as unknown as LeverValue;
    for (let d = 0, h = 18; d < 365; d++) h = runStep([carbon], ctx, 1, h);
    const heap = g.nodes[HEAP]!, stored = heap.stocks.carbon!.amount, co2 = sum(flows, 'composting', 'kgCO2e');
    expect(heap.stocks.waste!.amount).toBeLessThan(0.5); // a year at 10 °C: nearly all broken down
    expect(compostOn(g)).toBeGreaterThan(0.9 * 10 * COMPOST_YIELD);
    expect(stored).toBeGreaterThan(co2);
    expect(stored + co2).toBeCloseTo(taken);
    // IPCC 2006's composting factors scaled to green waste: tens of grams of CO₂e a kg, not kilograms
    const gases = sum(flows, 'methane and nitrous oxide', 'kgCO2e') / 10;
    expect(gases).toBeGreaterThan(0.01);
    expect(gases).toBeLessThan(0.2);
    // on the dial: the heap is still a small net sink while its compost sits there
    expect(air.amount).toBeLessThan(0);
  });

  it('spreads compost on a bed, adding its carbon and nitrogen to the bed’s fresh organic matter', () => {
    const g = gardenGraph(), {ctx} = context(g), bed = g.nodes['bed-1']!;
    const heap = g.nodes[HEAP]!;
    heap.stocks.compost = {unit: 'kgWaste', product: 'compost', amount: qty(15, 'kgWaste')};
    heap.stocks.carbon!.amount = qty(6, 'kgCO2e');
    heap.stocks['nitrogen.organic'] = {unit: 'kgN', amount: qty(0.2, 'kgN')};
    const fresh = bed.stocks[SOIL.fresh]!.amount, n = bed.stocks[SOIL.organicN]!.amount;
    spread(ctx as unknown as TickContext, bed, 15);
    expect(compostOn(g)).toBe(0);
    expect(bed.stocks[SOIL.fresh]!.amount - fresh).toBeGreaterThan(5);
    expect(bed.stocks[SOIL.organicN]!.amount - n).toBeGreaterThan(0.1);
  });

  it('carries a bed’s residue’s phosphorus and potassium onto the heap and back to a bed with the compost, none made or lost', () => {
    const g = gardenGraph(), {ctx} = context(g), c = ctx as unknown as TickContext, from = g.nodes['bed-2']!, to = g.nodes['bed-1']!;
    const pk = (unit: string) => Object.values(g.nodes).reduce((s, n) => s + Object.values(n.stocks).filter((x) => x.unit === unit).reduce((t, x) => t + x.amount, 0), 0);
    // a finished crop of lettuce left 1.8 kg of leaves and roots, holding a fifth of what it took (15 kg P and 150 kg K a hectare over 3 m²)
    from.stocks.waste = {unit: 'kgWaste', product: 'greens', amount: qty(1.8, 'kgWaste')};
    from.stocks['waste.phosphorus'] = {unit: 'kgP', amount: qty(0.2 * 0.0045, 'kgP')};
    from.stocks['waste.potassium'] = {unit: 'kgK', amount: qty(0.2 * 0.045, 'kgK')};
    const p0 = pk('kgP'), k0 = pk('kgK');
    toHeap(c, from, 0.9); // half of it now, half later
    expect(g.nodes[HEAP]!.stocks.phosphorus!.amount).toBeCloseTo(0.5 * 0.2 * 0.0045, 9);
    toHeap(c, from, 0.9);
    g.nodes.atmosphere!.levers.weather = MILD as unknown as LeverValue;
    for (let d = 0, h = 18; d < 365; d++) h = runStep([carbon], ctx, 1, h);
    const before = to.stocks.phosphorus!.amount, beforeK = to.stocks.potassium!.amount;
    spread(c, to, compostOn(g));
    // nearly all of it comes back (a little still in the waste left to break down), and nothing is made or lost
    expect(to.stocks.phosphorus!.amount - before).toBeGreaterThan(0.9 * 0.2 * 0.0045);
    expect(to.stocks.potassium!.amount - beforeK).toBeGreaterThan(0.9 * 0.2 * 0.045);
    expect(pk('kgP')).toBeCloseTo(p0, 12);
    expect(pk('kgK')).toBeCloseTo(k0, 12);
    // WRAP's PAS 100 green composts hold about 0.1–0.3 % P and 0.3–0.8 % K fresh; compost of vegetable residue is richer
    const compost = 1.8 * COMPOST_YIELD, p = (0.2 * 0.0045) / compost, k = (0.2 * 0.045) / compost;
    expect(p).toBeGreaterThan(0.0005);
    expect(p).toBeLessThan(0.01);
    expect(k).toBeGreaterThan(0.003);
    expect(k).toBeLessThan(0.05);
  });

  it('carries the fresh produce’s phosphorus and potassium on the kitchen’s scraps', () => {
    const g = gardenGraph(), {ctx} = context(g);
    g.nodes.kitchen!.stocks.waste = {unit: 'kgWaste', product: 'greens', amount: qty(2, 'kgWaste')};
    toHeap(ctx as unknown as TickContext, g.nodes.kitchen!, 2);
    // McCance and Widdowson: about 0.3 g of phosphorus and 3 g of potassium in a kg of vegetables
    expect(g.nodes[HEAP]!.stocks.phosphorus!.amount).toBeCloseTo(0.0006, 9);
    expect(g.nodes[HEAP]!.stocks.potassium!.amount).toBeCloseTo(0.006, 9);
  });

  it('lets a plot dug out of the lawn lose soil carbon over twenty years, to roughly IPCC’s cropland factor', () => {
    const g = gardenGraph(), {ctx} = context(g), dug = g.nodes['bed-3']!, grass = g.nodes['bed-4']!;
    dig(ctx as unknown as TickContext, dug, 3);
    expect(dug.stocks['land.grass']!.amount).toBe(0);
    expect(dug.stocks['land.crops']!.amount).toBe(3);
    const soilC = (id: string) => g.nodes[id]!.stocks[SOIL.humus]!.amount + g.nodes[id]!.stocks[SOIL.fresh]!.amount;
    for (let h = 0; h < 24 * 365 * 20; ) h = runStep([weather, water, soil], ctx, 4, h);
    const ratio = soilC('bed-3') / soilC('bed-4');
    // IPCC's F_LU for long-term cultivation, temperate moist, is 0.69 (± 12 %); bare ground loses more than a crop's
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(0.85);
  });
});
