// The energy model's plausibility test: a litre of diesel is about DEFRA's 2.5–2.8 kg CO₂e, petrol a little less, a kWh
// of grid electricity a fifth of a kilogram and gas a little less; a pump's electricity is ρ·g·h over its efficiency;
// a cold store and a frost-free tunnel use farm-audit sums of kWh; and every use is flows that keep the carbon whole.
import {describe, expect, it} from 'vitest';
import {FUELS} from '../../data/energy';
import {runStep} from '../clock';
import {applyFlow, stockTotals, type Flow, type Graph, type LeverValue} from '../graph';
import {gardenGraph} from '../state';
import {burn, co2e, coldStoreKWh, costOf, ENERGY_INDEX, energy, indexOf, kWhOf, LOADS, pump, pumpKWh, pumpKWhPerM3, tunnelHeatKWh, type EnergyIndex} from './energy';
import type {WeatherDay} from './weather';

const COLD: WeatherDay = {day: 0, dayOfYear: 20, wet: false, rain: 0, rainFrom: 0, rainHours: 0, tmax: 2, tmin: -4, sun: 1, length: 8, zMax: 0, zMin: 0, zSun: 0, warming: 0};

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

describe('energy', () => {
  it('emits about DEFRA’s kg CO₂e a litre of diesel and petrol and a kWh of electricity and gas', () => {
    expect(co2e('diesel', 1)).toBeGreaterThan(2.5); // DESNZ 2025: about 2.5 (biofuel blend) to 2.7 (mineral) kg a litre
    expect(co2e('diesel', 1)).toBeLessThan(2.85);
    expect(co2e('petrol', 1)).toBeGreaterThan(2.1);
    expect(co2e('petrol', 1)).toBeLessThan(co2e('diesel', 1));
    expect(co2e('electricity', 1)).toBeGreaterThan(0.15);
    expect(co2e('electricity', 1)).toBeLessThan(0.25);
    expect(co2e('gas', 1)).toBeGreaterThan(0.17);
    expect(co2e('gas', 1)).toBeLessThan(0.2);
    // per kWh of energy, gas is the lightest of the burned fuels and diesel the heaviest
    const perKWh = (f: 'diesel' | 'petrol' | 'gas') => co2e(f, 1) / kWhOf(f, 1);
    expect(perKWh('gas')).toBeLessThan(perKWh('diesel'));
    expect(costOf('diesel', 100)).toBeCloseTo(100 * FUELS.diesel.price);
  });

  it('lifts a cubic metre of water for ρ·g·h over the pump’s efficiency', () => {
    // 1 m³ through 10 m at 100 % is 0.027 kWh; at 45 % about 0.06
    expect(pumpKWhPerM3(10, 1)).toBeCloseTo(0.0273, 3);
    expect(pumpKWhPerM3(10)).toBeGreaterThan(0.05);
    expect(pumpKWhPerM3(10)).toBeLessThan(0.07);
    expect(pumpKWh(5000, 30)).toBeCloseTo(5 * pumpKWhPerM3(30));
    expect(pumpKWhPerM3(40)).toBeGreaterThan(3.9 * pumpKWhPerM3(10)); // linear in the lift
  });

  it('runs a cold store at farm-audit kWh and heats a tunnel more on a colder night', () => {
    const day = coldStoreKWh(20, 15);
    expect(day).toBeGreaterThan(8); // a 20 m³ room: about 12 kWh on a mild day
    expect(day).toBeLessThan(16);
    expect(coldStoreKWh(20, 25)).toBeGreaterThan(day);
    expect(coldStoreKWh(20, 5)).toBeLessThan(day);
    expect(coldStoreKWh(20, -10)).toBeGreaterThan(0); // the compressor and fans still run in a frost
    expect(tunnelHeatKWh(30, 5)).toBe(0); // no frost, no heat
    expect(tunnelHeatKWh(30, 0)).toBeGreaterThan(30);
    expect(tunnelHeatKWh(30, -5)).toBeCloseTo(2 * tunnelHeatKWh(30, 0));
    expect(tunnelHeatKWh(30, 0, 'gas')).toBeGreaterThan(tunnelHeatKWh(30, 0)); // gas is burnt at 85 %: more fuel for the same heat
  });

  it('makes every use a flow: fuel in from the boundary, its carbon to the air, its price out of the purse', () => {
    const g = gardenGraph(), {ctx, flows} = context(g), air = g.nodes.atmosphere!.stocks.carbon!, purse = g.nodes.kitchen!.stocks.money!;
    const money = purse.amount;
    const use = burn(ctx as never, 'shed', 'diesel', 24, 'ploughing', 'kitchen');
    expect(use.co2e).toBeCloseTo(24 * FUELS.diesel.co2e);
    expect(air.amount).toBeCloseTo(use.co2e);
    expect(g.nodes.shed!.stocks['energy.used']!.amount).toBeCloseTo(use.kWh);
    expect(purse.amount).toBeCloseTo(money - use.cost);
    expect(flows.find((f) => f.unit === 'kWh')!.from).toEqual({boundary: 'bought'});
    // electricity comes from the grid, not bought in
    burn(ctx as never, 'shed', 'electricity', 10, 'lights');
    expect(flows.filter((f) => f.unit === 'kWh').at(-1)!.from).toEqual({boundary: 'grid'});
    // a pump on a level with an air node adds its carbon too
    const before = air.amount;
    pump(ctx as never, 'shed', 10000, 20);
    expect(air.amount).toBeCloseTo(before + co2e('electricity', pumpKWh(10000, 20)));
    expect(stockTotals(Object.values(g.nodes))['kgCO2e']).toBeGreaterThan(0);
  });

  it('heats a tunnel on a frosty night even when the day’s mean is above the setpoint', () => {
    const g = gardenGraph(), {ctx} = context(g);
    g.nodes.atmosphere!.levers.weather = {...COLD, tmax: 12, tmin: -3} as unknown as LeverValue; // mean 4.5 °C
    g.nodes.shed!.levers[LOADS] = [{kind: 'tunnel heater', m2: 30, fuel: 'electricity'}] as unknown as LeverValue;
    runStep([energy], ctx, 1, 23);
    expect(g.nodes.shed!.stocks['energy.used']!.amount).toBeGreaterThan(20);
  });

  it('runs standing loads each day against the weather, and the household pays', () => {
    const g = gardenGraph(), {ctx, flows} = context(g);
    g.nodes.atmosphere!.levers.weather = COLD as unknown as LeverValue;
    g.nodes.shed!.levers[LOADS] = [{kind: 'cold store', m3: 20}, {kind: 'tunnel heater', m2: 30, fuel: 'electricity'}] as unknown as LeverValue;
    const money = g.nodes.kitchen!.stocks.money!.amount;
    runStep([energy], ctx, 1, 23);
    expect(g.nodes.shed!.stocks['energy.used']!.amount).toBeGreaterThan(50); // a frosty day: the store and the heater together
    expect(flows.some((f) => f.what === 'polytunnel heater')).toBe(true);
    expect(g.nodes.kitchen!.stocks.money!.amount).toBeLessThan(money);
    expect(g.nodes.atmosphere!.stocks.carbon!.amount).toBeGreaterThan(5);
  });
});

describe('energy: the index the level above sets', () => {
  const lever = (i: EnergyIndex) => i as unknown as LeverValue;

  it('changes nothing without one', () => {
    expect(co2e('electricity', 10)).toBe(co2e('electricity', 10, undefined));
    expect(costOf('diesel', 10)).toBeCloseTo(10 * FUELS.diesel.price, 9);
    expect(co2e('electricity', 10, {})).toBeCloseTo(10 * FUELS.electricity.co2e, 9);
    expect(costOf('diesel', 10, {price: {}})).toBeCloseTo(costOf('diesel', 10), 9);
  });

  it('lets the grid’s carbon factor fall and rise, for electricity only', () => {
    const cleaner = {gridCo2e: 0.05};
    expect(co2e('electricity', 100, cleaner)).toBeCloseTo(5, 9);
    expect(co2e('electricity', 100, cleaner)).toBeLessThan(co2e('electricity', 100));
    expect(co2e('electricity', 100, {gridCo2e: 0.5})).toBeGreaterThan(co2e('electricity', 100));
    expect(co2e('diesel', 10, cleaner)).toBeCloseTo(co2e('diesel', 10), 9); // a litre of diesel is the same whatever the grid is
    expect(co2e('gas', 10, cleaner)).toBeCloseTo(co2e('gas', 10), 9);
  });

  it('multiplies a fuel’s price by the index, that fuel alone', () => {
    const shock = {price: {diesel: 2, electricity: 1.5}};
    expect(costOf('diesel', 10, shock)).toBeCloseTo(2 * costOf('diesel', 10), 9);
    expect(costOf('electricity', 10, shock)).toBeCloseTo(1.5 * costOf('electricity', 10), 9);
    expect(costOf('gas', 10, shock)).toBeCloseTo(costOf('gas', 10), 9);
  });

  it('is read from the node that burns, or from whoever pays, and every use’s flows follow it', () => {
    const run = (place?: 'shed' | 'kitchen', index: EnergyIndex = {gridCo2e: 0.05, price: {electricity: 2}}) => {
      const g = gardenGraph(), {ctx, flows} = context(g);
      if (place) g.nodes[place]!.levers[ENERGY_INDEX] = lever(index);
      const money = g.nodes.kitchen!.stocks.money!.amount, air = g.nodes.atmosphere!.stocks.carbon!.amount;
      const use = burn(ctx as never, 'shed', 'electricity', 10, 'lights', 'kitchen');
      return {use, spent: money - g.nodes.kitchen!.stocks.money!.amount, emitted: g.nodes.atmosphere!.stocks.carbon!.amount - air, flows, ctx, g};
    };
    const base = run(), onNode = run('shed'), onPayer = run('kitchen');
    for (const r of [onNode, onPayer]) {
      expect(r.use.co2e).toBeCloseTo(0.5, 9);
      expect(r.use.cost).toBeCloseTo(2 * base.use.cost, 9);
      expect(r.spent).toBeCloseTo(r.use.cost, 9); // the purse pays the indexed price
      expect(r.emitted).toBeCloseTo(0.5, 9); // and the air is told the indexed carbon: the account stays whole
      expect(r.flows.find((f) => f.unit === 'kgCO2e')!.amount).toBeCloseTo(0.5, 9);
    }
    expect(base.emitted).toBeCloseTo(2, 9);
    // an explicit index beats the lever, and a pump reads the lever too
    const g = gardenGraph(), {ctx} = context(g);
    g.nodes.shed!.levers[ENERGY_INDEX] = lever({gridCo2e: 0.05});
    expect(indexOf(ctx as never, 'shed')).toEqual({gridCo2e: 0.05});
    expect(indexOf(ctx as never, 'kitchen')).toBeUndefined();
    expect(burn(ctx as never, 'shed', 'electricity', 10, 'lights', undefined, {gridCo2e: 0.4}).co2e).toBeCloseTo(4, 9);
    expect(pump(ctx as never, 'shed', 10000, 20).co2e).toBeCloseTo(0.05 * pumpKWh(10000, 20), 9);
  });

  it('runs the standing loads at the index’s price and carbon', () => {
    const day = (index?: EnergyIndex) => {
      const g = gardenGraph(), {ctx} = context(g, 24);
      g.nodes.atmosphere!.levers.weather = COLD as unknown as LeverValue;
      g.nodes.shed!.levers[LOADS] = [{kind: 'cold store', m3: 20}] as unknown as LeverValue;
      if (index) g.nodes.shed!.levers[ENERGY_INDEX] = lever(index);
      const money = g.nodes.kitchen!.stocks.money!.amount, air = g.nodes.atmosphere!.stocks.carbon!.amount;
      runStep([energy], ctx as never, 1, 6);
      return {spent: money - g.nodes.kitchen!.stocks.money!.amount, emitted: g.nodes.atmosphere!.stocks.carbon!.amount - air};
    };
    const now = day(), dearer = day({price: {electricity: 2}, gridCo2e: 0.1});
    expect(dearer.spent).toBeCloseTo(2 * now.spent, 9);
    expect(dearer.emitted).toBeCloseTo(now.emitted / 2, 9);
  });
});
