// Energy: what fuel and electricity emit and cost, what a pump, a cold store and a polytunnel heater use, and every use
// as flows: the fuel in from `bought` (electricity from `grid`) to the place that burns it, its carbon to the air node,
// and its price out of the purse. docs/systems/energy.md says how it works and what the wiring part adds.
//
// Sources: UK Government greenhouse gas conversion factors for company reporting (DESNZ, formerly BEIS, with DEFRA),
//   2025–26 editions, for kg CO₂e per litre of diesel and petrol and per kWh of grid electricity and gas, and the fuels'
//   gross calorific values; pump work is ρ·g·h over the pump's efficiency (physics); a cold store's and a tunnel
//   heater's daily kWh are typical farm energy audit figures (Carbon Trust and AHDB energy-on-farm audits, rounded),
//   the heater by conduction through the cover.
// Simplifies: emission factors are single national averages, fixed for the game (the grid's falling as it decarbonises
//   belongs to the level above); a fuel's upstream emissions are in its factor, not counted as a separate flow; the
//   cold store's load is linear in outside temperature and volume, with no door openings or stock heat; the tunnel is
//   held at one setpoint with no sun, no wind and no thermal screen; prices are flat (the energy loop in part 14 moves
//   them). Fast effect: a day's bill and its carbon, and a frosty night's heater. Slow effect: the running total of
//   energy used and carbon emitted, which the dial and the farm's account carry for years.
import {COLD_STORE, FUELS, PUMP, TUNNEL, type Fuel} from '../../data/energy';
import type {System, TickContext} from '../clock';
import {qty, type GraphNode} from '../graph';
import {ATMOSPHERE} from '../state';
import {weatherOf} from './weather';

/** The stock a node keeps its running total of energy used in, kWh. The wiring part gives nodes that burn something this stock (or lets the first flow make it). */
export const ENERGY_USED = 'energy.used';
/** The node whose `money` stock pays for standing loads: the household's, until the wiring part passes `state.home`. */
export const PURSE = 'kitchen';
/** The lever a node lists its standing loads in: cold stores and tunnel heaters, run each day by the energy system. */
export const LOADS = 'loads';

/** kg CO₂e for a litre (diesel, petrol) or a kWh (electricity, gas) of a fuel. */
export const co2e = (fuel: Fuel, amount: number) => amount * FUELS[fuel].co2e;
/** £ for a litre or a kWh of a fuel. */
export const costOf = (fuel: Fuel, amount: number) => amount * FUELS[fuel].price;
/** kWh of energy in a litre or a kWh of a fuel. */
export const kWhOf = (fuel: Fuel, amount: number) => amount * FUELS[fuel].kWh;

/** Electricity a pump uses to lift a cubic metre through a head in metres, kWh: ρ·g·h over the pump's efficiency. */
export const pumpKWhPerM3 = (headM: number, efficiency = PUMP.efficiency) => (PUMP.rho * PUMP.g * Math.max(0, headM)) / efficiency / 3.6e6;
/** Electricity to lift some litres through a head, kWh. */
export const pumpKWh = (litres: number, headM: number) => (litres / 1000) * pumpKWhPerM3(headM);

/** A cold store's electricity for some days, kWh: its volume in m³ and the outside air's mean temperature, °C. Never below a standing load (the compressor and fans hold 4 °C even in winter). */
export function coldStoreKWh(m3: number, outsideC: number, days = 1) {
  const c = COLD_STORE;
  return Math.max(c.floorPerM3Day, c.kWhPerM3Day + c.perDegree * (outsideC - c.refTemp)) * m3 * days;
}

/** The fuel a polytunnel heater burns to keep the tunnel at its setpoint for some days, kWh of electricity or gas. */
export function tunnelHeatKWh(floorM2: number, outsideC: number, fuel: 'electricity' | 'gas' = 'electricity', days = 1) {
  const t = TUNNEL, cover = floorM2 * t.coverPerFloor, deficit = Math.max(0, t.setpoint - outsideC);
  return (cover * t.uCover * deficit * 24 * days) / 1000 / (t.efficiency[fuel] ?? 1);
}

/** What one use came to. */
export interface Use {
  fuel: Fuel;
  /** Litres or kWh, as the fuel is bought. */
  amount: number;
  kWh: number;
  co2e: number;
  cost: number;
}

/**
 * Burns some of a fuel at a node: its energy in from `bought` (or `grid`) to the node's running total, its carbon from
 * `bought` to the air node, and its price from the payer's purse (a node with a `money` stock) out to `bought`. Every
 * use is a flow, so the carbon account stays whole.
 */
export function burn(c: TickContext, node: string, fuel: Fuel, amount: number, what: string, payer?: string): Use {
  const spec = FUELS[fuel], use: Use = {fuel, amount, kWh: kWhOf(fuel, amount), co2e: co2e(fuel, amount), cost: costOf(fuel, amount)};
  if (!(amount > 1e-9)) return {...use, amount: 0, kWh: 0, co2e: 0, cost: 0};
  c.flow({what, unit: 'kWh', amount: qty(use.kWh, 'kWh'), from: {boundary: spec.from}, to: {node, stock: ENERGY_USED}});
  if (c.graph.nodes[ATMOSPHERE]) c.flow({what, unit: 'kgCO2e', amount: qty(use.co2e, 'kgCO2e'), from: {boundary: 'bought'}, to: {node: ATMOSPHERE, stock: 'carbon'}});
  if (payer && c.graph.nodes[payer]?.stocks.money) c.flow({what, unit: 'GBP', amount: qty(use.cost, 'GBP'), from: {node: payer, stock: 'money'}, to: {boundary: 'bought'}});
  return use;
}

/** A pump lifting some litres through a head at a node, on the grid. */
export const pump = (c: TickContext, node: string, litres: number, headM: number, payer?: string) =>
  burn(c, node, 'electricity', pumpKWh(litres, headM), 'pumping', payer);

/** A standing load on a node's `loads` lever. */
export type Load = {kind: 'cold store'; m3: number} | {kind: 'tunnel heater'; m2: number; fuel: 'electricity' | 'gas'};

/** The loads a node lists. */
export const loadsOf = (n: GraphNode) => (Array.isArray(n.levers[LOADS]) ? (n.levers[LOADS] as unknown as Load[]) : []);

/** A day's (or longer step's) standing loads at a node, given the outside air's mean temperature and the night's (a tunnel's heater runs on the cold hours, not the day's mean). */
export function loadDay(c: TickContext, n: GraphNode, temp: number, night: number, days: number, payer?: string): Use[] {
  const out: Use[] = [];
  for (const l of loadsOf(n)) {
    if (l.kind === 'cold store') out.push(burn(c, n.id, 'electricity', coldStoreKWh(l.m3, temp, days), 'cold store', payer));
    else if (l.kind === 'tunnel heater') out.push(burn(c, n.id, l.fuel, tunnelHeatKWh(l.m2, night, l.fuel, days), 'polytunnel heater', payer));
  }
  return out;
}

/** The energy system: each day, every node with standing loads runs them against the weather; the household pays. Not yet listed in src/sim/systems.ts (part 13 does). */
export const energy: System = {
  name: 'energy',
  on: {
    day(c) {
      const w = weatherOf(c.graph);
      if (!w) return;
      const step = w.step ?? [w], temp = step.reduce((s, d) => s + (d.tmax + d.tmin) / 2, 0) / step.length, days = Math.max(1, c.dt / 24);
      // the heater is judged on the night: halfway between the day's mean and its minimum
      const night = (temp + step.reduce((s, d) => s + d.tmin, 0) / step.length) / 2;
      for (const n of Object.values(c.graph.nodes)) if (loadsOf(n).length) loadDay(c, n, temp, night, days, PURSE);
    },
  },
};
