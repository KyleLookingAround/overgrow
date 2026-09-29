// Storage and spoilage: how long each product keeps at each temperature, the lots that age in the field, a shed, a cold
// store, a van, on a shelf and at home, what is lost at each stage of the chain, what a cold store costs and saves, and
// what a van's round burns. Pure functions over kg, °C, days, kWh and £, and a `storage` system, not yet listed in
// src/sim/systems.ts (part 14 adds it). docs/systems/storage.md says how it works.
//
// Sources: Q10 spoilage kinetics (Labuza 1982; Tijskens and Polderdijk 1996: the rate of quality loss in fresh produce
//   rises by about 2 to 3 times for each 10 °C); WRAP's UK household and supply-chain food waste studies (households
//   about 70 % of post-farm food waste by weight, retail about 4 %, salad and potatoes among the most wasted at home);
//   FAO (Gustavsson et al. 2011: in Europe about a fifth of fruit and veg is lost at production and another fifth at
//   home); DESNZ's conversion factors for the van's diesel and the cold room's electricity (through energy.ts); chilling
//   injury thresholds from postharvest guides (tomatoes and beans do not like a cold room).
// Simplifies: a lot has one age, its `life` used (0 fresh to 1 all gone), and ageing adds days over the shelf life at the
//   place's temperature; the share of a lot gone at a life is life to the fifth power, and survivors keep the lot's life
//   (a mean, not a spread); temperatures are steady over a step, from the day's mean; a shed follows the outside air
//   partway, and a van sits a few degrees above it; humidity, gases (ethylene), handling damage and sprout suppression
//   are folded into the shelf life and the dark store's multiple; a household eats a purchase evenly over its days.
//   Fast effect: kg gone off today, dulling produce and a cold room's bill. Slow effect: the share of the harvest
//   wasted at each stage across the year, and the carbon and land behind it, which is what the Explain card shows.
import {
  GRADE, LOSS_POWER, PRODUCTS, PRODUCT_IDS, REF_C, ROUTES, STANDS_FOR, TEMPS, VAN, type Place, type ProductId, type Route, type Standard,
} from '../../data/storage';
import {BASKET} from '../../data/household';
import type {Group} from '../../data/crops';
import type {System, TickContext} from '../clock';
import {qty, type Graph, type GraphNode, type LeverValue} from '../graph';
import {co2e, coldStoreKWh, costOf, loadsOf} from './energy';
import {footprintOf} from './household';
import {weatherOf} from './weather';

/** The farm's store: where harvested produce waits for a box or the shop. Part 14 adds the node. */
export const STORE = 'store';
/** The lever a node lists how its produce is kept in: where it is, and its `life` by product. */
export const KEEPING = 'keeping';

// ---- lots and life ----

/** A lot: kg of a product, and the share of its shelf life used up, 0 fresh to 1 gone. */
export interface Lot {
  product: ProductId;
  kg: number;
  life: number;
}
export const fresh = (product: ProductId, kg: number): Lot => ({product, kg, life: 0});

/** The share of a lot still there at a life. */
export const survives = (life: number) => 1 - Math.min(1, Math.max(0, life)) ** LOSS_POWER;
/** Freshness, 0–1: what price and looks follow. */
export const freshness = (life: number) => Math.max(0, 1 - life);

/** The temperature (°C) a product is at in a place, given the outside air. A cold store is the setpoint or, where the
 *  product is hurt by cold, the coldest it likes. */
export function tempAt(product: ProductId, place: Place, outsideC: number): number {
  switch (place) {
    case 'field': return outsideC;
    case 'shed': return TEMPS.shed.follows * outsideC + (1 - TEMPS.shed.follows) * TEMPS.shed.base;
    case 'cold store': return Math.max(TEMPS.cold, PRODUCTS[product].coldMin);
    case 'van': return outsideC + TEMPS.van;
    case 'shelf': return PRODUCTS[product].coldMin <= TEMPS.cold ? TEMPS.chilled : TEMPS.shelf.follows * outsideC + (1 - TEMPS.shelf.follows) * TEMPS.shelf.base;
    case 'home': return TEMPS.home;
  }
}
/** How many times faster than at 20 °C it spoils at a temperature (Q10). */
export const rateFactor = (product: ProductId, tempC: number) => PRODUCTS[product].q10 ** ((tempC - REF_C) / 10);
/** Days it keeps at a temperature, in a dark, ventilated store or not. */
export const shelfLife = (product: ProductId, tempC: number, dark = false) =>
  (PRODUCTS[product].shelf * (dark ? PRODUCTS[product].dark : 1)) / rateFactor(product, tempC);
/** Days a product keeps in a place: the shed and the cold store are dark stores. */
export const keepsIn = (product: ProductId, place: Place, outsideC: number) =>
  shelfLife(product, tempAt(product, place, outsideC), place === 'shed' || place === 'cold store');

/** Ages a lot by some days in a place: its new life, kg left and kg gone. Conserved: kg = left + gone. */
export function age(lot: Lot, place: Place, days: number, outsideC: number): {lot: Lot; spoiled: number} {
  const life = lot.life + Math.max(0, days) / keepsIn(lot.product, place, outsideC);
  const was = survives(lot.life);
  const kg = was > 1e-12 ? (lot.kg * survives(life)) / was : 0;
  return {lot: {product: lot.product, kg, life}, spoiled: lot.kg - kg};
}
/** Ages a lot by hours (a van's round). */
export const ageHours = (lot: Lot, place: Place, hours: number, outsideC: number) => age(lot, place, hours / 24, outsideC);

/** The life of a mix: kg already there at a life, and kg added at another (the mean, weighted by kg). */
export const blendLife = (kg: number, life: number, addKg: number, addLife: number) => (kg + addKg > 0 ? (kg * life + addKg * addLife) / (kg + addKg) : 0);

/** Kg of a lot a household wastes at home, as a share, if it arrives with `life` used and eats it evenly over the days it
 *  takes: what is left when the household gets round to it has gone off. */
export function homeWaste(product: ProductId, life = 0, eatDays = PRODUCTS[product].eatDays, tempC = TEMPS.home): number {
  const sh = shelfLife(product, tempC), steps = 24, start = survives(life);
  if (start <= 1e-12) return 1;
  let eaten = 0;
  for (let i = 0; i < steps; i++) eaten += survives(life + (((i + 0.5) / steps) * eatDays) / sh) / start;
  return 1 - eaten / steps;
}

// ---- losses by stage ----

/** How a chain runs: days held in store (ambient shed, or cold), hours the produce is on the road, days on the shelf, the
 *  standard it is graded to, and the outside air's temperature, °C. */
export interface Chain {
  holdDays: number;
  cold: boolean;
  roadHours: number;
  shelfDays: number;
  standard: Standard;
  outsideC: number;
}
/** Kg lost at each stage, and eaten: they sum to the kg harvestable. */
export interface Losses {
  harvestable: number;
  unharvested: number;
  graded: number;
  store: number;
  road: number;
  shelf: number;
  home: number;
  eaten: number;
}
/** Field loss: the unharvested and the graded out. */
export const fieldLoss = (l: Losses) => l.unharvested + l.graded;
/** The share of kg graded out of a group at a standard. */
export const gradedShare = (group: Group, standard: Standard) => GRADE[group][standard];

/** A product's chain from field to plate: `harvestable` kg in, the unharvested and the graded out lost at the field, then
 *  the store, the van, the shelf and the home each ageing what's left. */
export function chainLosses(product: ProductId, harvestable: number, chain: Chain): Losses {
  const spec = PRODUCTS[product], group = spec.group as Group;
  const unharvested = harvestable * spec.unharvested;
  const graded = (harvestable - unharvested) * (GRADE[group]?.[chain.standard] ?? 0);
  let lot = fresh(product, harvestable - unharvested - graded);
  const stage = (place: Place, days: number) => {
    const a = age(lot, place, days, chain.outsideC);
    lot = a.lot;
    return a.spoiled;
  };
  const store = stage(chain.cold ? 'cold store' : 'shed', chain.holdDays);
  const road = stage('van', chain.roadHours / 24);
  const shelf = stage('shelf', chain.shelfDays);
  const home = lot.kg * homeWaste(product, lot.life);
  return {harvestable, unharvested, graded, store, road, shelf, home, eaten: lot.kg - home};
}

/** The typical chain of a UK household's veg: the basket's mix of potatoes, salad, tomatoes and greens, each held and shelved
 *  its usual days, on a 4-hour van round, in the outside air's temperature. Losses summed over the mix, kg a week for a
 *  household of one person's basket. */
export function typicalChain(outsideC = 12, standard: Standard = 'loose', cold = false): Losses {
  const sum: Losses = {harvestable: 0, unharvested: 0, graded: 0, store: 0, road: 0, shelf: 0, home: 0, eaten: 0};
  for (const [group, product] of Object.entries(STANDS_FOR) as [Group, ProductId][]) {
    const spec = PRODUCTS[product];
    const l = chainLosses(product, BASKET[group], {holdDays: spec.hold, cold, roadHours: 4, shelfDays: spec.shelfDays, standard, outsideC});
    for (const k of Object.keys(sum) as (keyof Losses)[]) sum[k] += l[k];
  }
  return sum;
}
/** Each stage's share of the food lost, 0–1: field (unharvested and graded), store, road, shelf and home. */
export function lossShares(l: Losses) {
  const lost = l.harvestable - l.eaten || 1;
  return {field: fieldLoss(l) / lost, store: l.store / lost, road: l.road / lost, shelf: l.shelf / lost, home: l.home / lost};
}

/** What wasted food carries beyond the farm: the carbon growing it took plus where it went (landfill methane, compost),
 *  and the land behind it in m² a year, for `kg` of a group. */
export function wasteFootprint(group: Parameters<typeof footprintOf>[0], kg: number, route: Route = 'waste') {
  const f = footprintOf(group, kg);
  return {co2e: f.carbon + kg * ROUTES[route].co2e, land: f.land, value: kg * ROUTES[route].value};
}

// ---- the cold store ----

/** Cubic metres of cold room some kg of a product fills. */
export const roomFor = (product: ProductId, kg: number) => kg / PRODUCTS[product].density;
/** A cold room's use for some days: kWh, £ and kg CO₂e (energy.ts's load, price and grid factor). */
export function coldCost(m3: number, outsideC: number, days = 1) {
  const kWh = coldStoreKWh(m3, outsideC, days);
  return {kWh, cost: costOf('electricity', kWh), co2e: co2e('electricity', kWh)};
}
export interface Hold {
  /** Kg left after the days, kg gone, and the life used. */
  kg: number;
  spoiled: number;
  life: number;
}
/** Holds a fresh lot for some days, in a shed or a cold store. */
export function hold(product: ProductId, kg: number, days: number, outsideC: number, cold: boolean): Hold {
  const a = age(fresh(product, kg), cold ? 'cold store' : 'shed', days, outsideC);
  return {kg: a.lot.kg, spoiled: a.spoiled, life: a.lot.life};
}
export interface ColdBenefit {
  /** Kg the cold store saves against the shed, the room's £ and carbon, the saved kg's value, and the net, £. */
  saved: number;
  energy: number;
  co2e: number;
  value: number;
  net: number;
}
/** Whether the cold store pays for holding `kg` of a product for some days at a price a kg: the kg it saves over an ambient
 *  shed, worth `price` each, against the room's electricity. Only the room this lot needs is counted. */
export function coldBenefit(product: ProductId, kg: number, days: number, outsideC: number, price: number): ColdBenefit {
  const warm = hold(product, kg, days, outsideC, false), cold = hold(product, kg, days, outsideC, true);
  const c = coldCost(roomFor(product, kg), outsideC, days), saved = cold.kg - warm.kg, value = saved * price;
  return {saved, energy: c.cost, co2e: c.co2e, value, net: value - c.cost};
}

// ---- the van ----

/** A round: boxes delivered, its distance, hours on the road, the diesel it burns and what that costs, and the temperature
 *  the produce sits at. */
export interface Round {
  stops: number;
  rounds: number;
  km: number;
  hours: number;
  /** Hours produce is aboard, on average: half the round. */
  aboard: number;
  litres: number;
  cost: number;
  co2e: number;
  tempC: number;
}
/** A day's delivery: `stops` doorsteps, in as many rounds as the van's capacity needs. */
export function round(stops: number, outsideC: number): Round {
  const n = Math.max(0, Math.round(stops)), rounds = Math.ceil(n / VAN.capacity);
  const km = rounds * VAN.baseKm + n * VAN.kmPerStop, hours = km / VAN.speed + (n * VAN.stopMin) / 60, litres = (km * VAN.litresPer100km) / 100;
  return {stops: n, rounds, km, hours, aboard: hours / 2, litres, cost: costOf('diesel', litres), co2e: co2e('diesel', litres), tempC: outsideC + TEMPS.van};
}

// ---- the system ----

/** How a node's produce is kept: the place, and each product's life used. */
export interface Keeping {
  place: Place;
  life: Record<string, number>;
}
export const keepingOf = (n: GraphNode): Keeping | null => (n.levers[KEEPING] as unknown as Keeping | undefined) ?? null;
const FALLBACK_C = 10;

/** Ages the produce on a node for some days: what goes off leaves the food stock and lands in the node's waste (for the heap). */
export function spoil(c: TickContext, n: GraphNode, k: Keeping, days: number, outsideC: number): number {
  const cold = k.place === 'shed' && loadsOf(n).some((l) => l.kind === 'cold store');
  const place: Place = cold ? 'cold store' : k.place, life: Record<string, number> = {...k.life};
  let lost = 0;
  for (const product of PRODUCT_IDS) {
    const stock = n.stocks[`food.${product}`], kg = stock?.amount ?? 0;
    if (!stock || kg <= 1e-9) continue;
    const a = age({product, kg, life: life[product] ?? 0}, place, days, outsideC);
    life[product] = a.lot.life;
    if (a.spoiled > 1e-9) {
      c.flow({what: 'going off', unit: 'kgFood', product, amount: qty(a.spoiled, 'kgFood'), from: {node: n.id, stock: `food.${product}`}, to: {boundary: 'decay'}});
      c.flow({what: 'going off', unit: 'kgWaste', product: 'greens', amount: qty(a.spoiled, 'kgWaste'), from: {boundary: 'decay'}, to: {node: n.id, stock: 'waste'}});
      lost += a.spoiled;
    }
  }
  n.levers[KEEPING] = {place: k.place, life} as unknown as LeverValue;
  return lost;
}

/** The outside air's mean temperature over the step. */
export function outsideOf(g: Graph): number {
  const w = weatherOf(g);
  if (!w) return FALLBACK_C;
  const step = w.step ?? [w];
  return step.reduce((s, d) => s + (d.tmax + d.tmin) / 2, 0) / step.length;
}

/** The storage system: each day, every node that lists how it keeps produce ages what it holds. It reads a cold store's
 *  load (energy.ts burns the electricity), so switching the cold store on is the energy loads' lever. Not yet listed in
 *  src/sim/systems.ts (part 14 does). */
export const storage: System = {
  name: 'storage',
  on: {
    day(c) {
      const days = Math.max(1, c.dt / 24), out = outsideOf(c.graph);
      for (const n of Object.values(c.graph.nodes)) {
        const k = keepingOf(n);
        if (k) spoil(c, n, k, days, out);
      }
    },
  },
  command(cmd) {
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && cmd.lever === KEEPING) return 'how produce is kept follows where it is, not a setting';
    return undefined;
  },
};
