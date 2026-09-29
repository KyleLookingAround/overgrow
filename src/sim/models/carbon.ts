// Carbon and land: the compost heap, compost going back to the beds, and digging a bed out of the lawn. Green waste
// the gardener brings to the heap carries the carbon its plants took from the air (counted as it reaches the heap) and
// its nitrogen, phosphorus and potassium; the heap breaks it down by the day's warmth, sending some carbon back to the
// air as CO₂, a little methane and nitrous oxide besides, and keeping the rest as compost, which the gardener spreads on
// a bed before sowing: its carbon and nitrogen go into the bed's fresh organic matter, where the soil model takes over,
// and its phosphorus and potassium into the bed's pools, so what the crops took comes back, less what left as food. Digging moves a plot's
// land from grass to crops, a land-use change whose soil carbon effect is the soil model's: bare, dug ground loses
// organic matter faster and gets none of grass's back. docs/systems/carbon.md says how it works.
//
// Sources: IPCC 2006 Guidelines, vol. 5 ch. 4 (biological treatment of solid waste), table 4.1: composting emits about
//   4 g CH₄ and 0.3 g N₂O per kg of waste on a wet basis (for waste of about 40 % dry matter), here scaled to green
//   waste's dry matter; IPCC AR6 WGI ch. 7 for the gases' 100-year warming (non-fossil CH₄ 27, N₂O 273); Bernal, Alburquerque
//   & Moral (2009), "Composting of animal manures and chemical criteria for compost maturity assessment", for a heap
//   losing about half its carbon as CO₂ and a fifth of its nitrogen as it matures; RothC's temperature factor (Coleman &
//   Jenkinson 1996) for the pace; fresh vegetable matter of about 12 % dry matter, 42 % of it carbon. A bed's waste
//   carries the nutrients its crops left in their residue (src/sim/models/crops.ts, RB209's offtake); other waste fresh
//   produce's (McCance & Widdowson, src/data/crops.ts); WRAP's PAS 100 compost analyses for the compost's P and K.
//   IPCC 2006 vol. 4 ch. 5 and 6 for the land-use change: cropland's long-term soil carbon about 0.7 of grassland's
//   (F_LU for long-term cultivation, temperate moist) over the default 20 years.
// Simplifies: one heap, well mixed, breaking down at one rate set by the air's temperature (no hot phase, no turning,
//   no moisture); compost is one product, carrying the steady carbon of mature compost and a share of the heap's
//   nitrogen, phosphorus and potassium by its part of the compost there and the compost the heap's waste will make; methane and nitrous oxide counted as CO₂e as the waste breaks down; the plants' carbon counted when
//   their waste reaches the heap, not as they grow (what's eaten breathes its carbon out elsewhere); the lawn's clippings
//   aren't collected. A bag of peat compost (part 6) will come in from the `bought` boundary with its carbon, and its
//   extraction's emissions from `bought` to the air, spread the same way as this compost.
//   Fast effect: the heap taking in a summer's waste and the dial moving down as it does. Slow effect: compost keeping
//   the beds' organic matter up, and dug ground losing carbon over decades.
import {PRODUCE} from '../../data/crops';
import {BAGGED, DIG} from '../../data/garden';
import {BIN} from '../../data/shed';
import {owns} from '../kit';
import type {System, TickContext} from '../clock';
import {qty, type GraphNode} from '../graph';
import {ATMOSPHERE} from '../state';
import {cropOf, finish, IN_WASTE, NUTRIENTS, WASTE} from './crops';
import {SOIL, tempFactor} from './soil';
import {weatherOf} from './weather';

export const HEAP = 'heap';
/** The heap's stocks: green waste, finished compost (both kg), and the nitrogen, phosphorus and potassium in them (its
 *  carbon is its `carbon`). */
export const HEAPED = {waste: 'waste', compost: 'compost', nitrogen: 'nitrogen.organic', phosphorus: 'phosphorus', potassium: 'potassium'} as const;
const IN_HEAP = {n: HEAPED.nitrogen, p: HEAPED.phosphorus, k: HEAPED.potassium} as const;

/** kg CO₂e of plant carbon in a kg of fresh green waste (12 % dry matter, 42 % of that carbon). */
export const WASTE_C = 0.12 * 0.42 * (44 / 12);
/** Of the carbon that breaks down, the share that goes to the air as CO₂; the rest stays in the compost. */
export const CO2_SHARE = 0.45;
/** Of the nitrogen, the share lost as ammonia, N₂O and N₂. */
export const N_LOST = 0.2;
/** kg of finished compost from a kg of green waste (most of the rest is water). */
export const COMPOST_YIELD = 0.25;
/** kg CO₂e of methane and nitrous oxide from a kg of green waste composted: IPCC's 4 g CH₄ and 0.3 g N₂O a kg of 40 %
 *  dry-matter waste, scaled to 12 %, at 27 and 273 times CO₂. */
export const OTHER_GASES = (0.12 / 0.4) * (0.004 * 27 + 0.0003 * 273);
/** How fast the heap breaks down, a year, at RothC's temperature factor of 1 (about 9 °C): half gone in about three months. */
const K_HEAP = 3;
/** The carbon in a kg of finished compost. */
export const COMPOST_C = (WASTE_C * (1 - CO2_SHARE)) / COMPOST_YIELD;

const at = (node: string, stock: string) => ({node, stock});
// the air node, looked up when used (state.ts and the models import each other)
const air = () => at(ATMOSPHERE, 'carbon');

/**
 * Carries green waste from a place (a bed, the kitchen) onto the heap, with the carbon and nutrients it holds. A bed's
 * waste carries the phosphorus and potassium its crops left in their residue, its share of what lies there; waste from
 * anywhere else (the kitchen's scraps, what went off) carries fresh produce's, which left the garden as food.
 */
export function toHeap(c: TickContext, from: GraphNode, kg: number) {
  const have = from.stocks.waste?.amount ?? 0;
  kg = Math.min(kg, have);
  if (kg <= 1e-9 || !c.graph.nodes[HEAP]) return;
  c.flow({what: 'to the heap', unit: 'kgWaste', product: 'greens', amount: qty(kg, 'kgWaste'), from: at(from.id, 'waste'), to: at(HEAP, HEAPED.waste)});
  c.flow({what: 'plant carbon', unit: 'kgCO2e', amount: qty(kg * WASTE_C, 'kgCO2e'), from: air(), to: at(HEAP, 'carbon')});
  for (const [key, unit] of NUTRIENTS) {
    if (from.kind === 'bed') {
      const share = (from.stocks[IN_WASTE[key]]?.amount ?? 0) * Math.min(1, kg / have);
      if (share > 0) c.flow({what: 'plant nutrients', unit, amount: qty(share, unit), from: at(from.id, IN_WASTE[key]), to: at(HEAP, IN_HEAP[key])});
    } else c.flow({what: 'plant nutrients', unit, amount: qty(kg * PRODUCE[key], unit), from: {boundary: 'growth'}, to: at(HEAP, IN_HEAP[key])});
  }
}

/** Finished compost on the heap, kg. */
export const compostOn = (g: {nodes: Record<string, GraphNode>}) => g.nodes[HEAP]?.stocks[HEAPED.compost]?.amount ?? 0;

/**
 * Spreads compost from the heap on a bed: its carbon and nitrogen go into the bed's fresh organic matter, and its
 * phosphorus and potassium into the bed's pools. The heap is well mixed, so a kg of compost carries its share of the
 * heap's P and K: of the compost there and the compost its waste will make.
 */
export function spread(c: TickContext, bed: GraphNode, kg: number) {
  const heap = c.graph.nodes[HEAP];
  if (!heap) return;
  const compost = compostOn(c.graph), will = compost + (heap.stocks[HEAPED.waste]?.amount ?? 0) * COMPOST_YIELD;
  kg = Math.min(kg, compost);
  if (kg <= 1e-9) return;
  c.flow({what: 'spreading compost', unit: 'kgWaste', product: 'compost', amount: qty(kg, 'kgWaste'), from: at(HEAP, HEAPED.compost), to: {boundary: 'decay'}});
  const carbon = Math.min(kg * COMPOST_C, Math.max(0, heap.stocks.carbon?.amount ?? 0));
  if (carbon > 0) c.flow({what: 'compost', unit: 'kgCO2e', amount: qty(carbon, 'kgCO2e'), from: at(HEAP, 'carbon'), to: at(bed.id, SOIL.fresh)});
  for (const [key, unit, soil] of NUTRIENTS) {
    const moved = (Math.max(0, heap.stocks[IN_HEAP[key]]?.amount ?? 0) * kg) / will;
    if (moved > 0) c.flow({what: 'compost', unit, amount: qty(moved, unit), from: at(HEAP, IN_HEAP[key]), to: at(bed.id, key === 'n' ? SOIL.organicN : soil)});
  }
}

/** Digs part of a bed plot out of the lawn: its land from grass to crops, its edging and bagged compost paid for, the
 *  compost's carbon and nutrients into the soil, and the flush of CO₂ from the organic matter turning it over exposes
 *  (src/data/garden.ts's DIG). */
export function dig(c: TickContext, bed: GraphNode, m2: number) {
  m2 = Math.min(m2, bed.stocks['land.grass']?.amount ?? 0);
  if (m2 <= 1e-9) return;
  c.flow({what: 'digging', unit: 'm2', amount: qty(m2, 'm2'), from: at(bed.id, 'land.grass'), to: at(bed.id, 'land.crops')});
  const purse = () => Math.max(0, c.graph.nodes.kitchen?.stocks.money?.amount ?? 0);
  const edging = Math.min(DIG.edgingPerM2 * m2, purse());
  if (edging > 1e-9) c.flow({what: 'edging', unit: 'GBP', amount: qty(edging, 'GBP'), from: at('kitchen', 'money'), to: {boundary: 'bought'}});
  // the compost the purse can pay for, forked in with its carbon and nutrients
  const kg = Math.min(DIG.compostKgPerM2 * m2, purse() / DIG.compostGbpPerKg);
  if (kg > 1e-9) {
    c.flow({what: 'bagged compost', unit: 'GBP', amount: qty(kg * DIG.compostGbpPerKg, 'GBP'), from: at('kitchen', 'money'), to: {boundary: 'bought'}});
    c.flow({what: 'bagged compost', unit: 'kgCO2e', amount: qty(kg * BAGGED.co2e, 'kgCO2e'), from: {boundary: 'bought'}, to: at(bed.id, SOIL.fresh)});
    for (const [key, unit, soil] of NUTRIENTS)
      c.flow({what: 'bagged compost', unit, amount: qty(kg * BAGGED[key], unit), from: {boundary: 'bought'}, to: at(bed.id, key === 'n' ? SOIL.organicN : soil)});
  }
  const flush = Math.min(DIG.flushPerM2 * m2, Math.max(0, bed.stocks[SOIL.humus]?.amount ?? 0));
  if (flush > 1e-9 && c.graph.nodes[ATMOSPHERE]) c.flow({what: 'digging', unit: 'kgCO2e', amount: qty(flush, 'kgCO2e'), from: at(bed.id, SOIL.humus), to: air()});
}

/**
 * Digs a green manure in where it stands: the crop is finished (its residue and the nutrients it held left on the bed,
 * src/sim/models/crops.ts), and then all of that goes into the soil instead of to the heap: the residue's carbon, taken
 * from the air as it grew, into the bed's fresh organic matter, its nitrogen into the organic pool, and its phosphorus
 * and potassium back into the bed's.
 */
export function digIn(c: TickContext, bed: GraphNode) {
  const s = cropOf(bed);
  if (!s) return;
  finish(c, bed, s, 'digging in');
  const kg = bed.stocks[WASTE]?.amount ?? 0;
  if (kg <= 1e-9) return;
  c.flow({what: 'digging in', unit: 'kgWaste', product: 'greens', amount: qty(kg, 'kgWaste'), from: at(bed.id, WASTE), to: {boundary: 'decay'}});
  if (c.graph.nodes[ATMOSPHERE]) c.flow({what: 'digging in', unit: 'kgCO2e', amount: qty(kg * WASTE_C, 'kgCO2e'), from: air(), to: at(bed.id, SOIL.fresh)});
  for (const [key, unit, soil] of NUTRIENTS) {
    const held = Math.max(0, bed.stocks[IN_WASTE[key]]?.amount ?? 0);
    if (held > 1e-12) c.flow({what: 'digging in', unit, amount: qty(held, unit), from: at(bed.id, IN_WASTE[key]), to: at(bed.id, key === 'n' ? SOIL.organicN : soil)});
  }
}

/** The heap's day: some of its waste breaks down into compost, CO₂ and the other gases. */
function heapDay(c: TickContext, heap: GraphNode, temp: number, days: number) {
  const waste = heap.stocks[HEAPED.waste]?.amount ?? 0;
  if (waste <= 1e-9) return;
  // a closed bin keeps the heap warmer and moister: faster, less nitrogen lost, a little more methane (src/data/shed.ts)
  const bin = owns(c.graph, 'compost-bin'), pace = bin ? BIN.pace : 1, nLost = bin ? BIN.nLost : N_LOST, gases = bin ? BIN.gases : 1;
  const kg = waste * (1 - Math.exp(-K_HEAP * pace * tempFactor(temp) * (days / 365)));
  if (kg <= 1e-9) return;
  c.flow({what: 'composting', unit: 'kgWaste', product: 'greens', amount: qty(kg, 'kgWaste'), from: at(HEAP, HEAPED.waste), to: {boundary: 'decay'}});
  c.flow({what: 'composting', unit: 'kgWaste', product: 'compost', amount: qty(kg * COMPOST_YIELD, 'kgWaste'), from: {boundary: 'decay'}, to: at(HEAP, HEAPED.compost)});
  const co2 = Math.min(kg * WASTE_C * CO2_SHARE, Math.max(0, heap.stocks.carbon?.amount ?? 0));
  if (co2 > 0) c.flow({what: 'composting', unit: 'kgCO2e', amount: qty(co2, 'kgCO2e'), from: at(HEAP, 'carbon'), to: air()});
  c.flow({what: 'methane and nitrous oxide', unit: 'kgCO2e', amount: qty(kg * OTHER_GASES * gases, 'kgCO2e'), from: {boundary: 'decay'}, to: air()});
  // the nitrogen lost is a share of what was in the waste that broke down: the heap's, by the waste it was made from
  const n = Math.max(0, heap.stocks[HEAPED.nitrogen]?.amount ?? 0), made = waste + compostOn(c.graph) / COMPOST_YIELD;
  const lost = (n * nLost * kg) / made;
  if (lost > 0) c.flow({what: 'composting', unit: 'kgN', amount: qty(lost, 'kgN'), from: at(HEAP, HEAPED.nitrogen), to: {boundary: 'decay'}});
}

export const carbon: System = {
  name: 'carbon',
  on: {
    day(c) {
      const heap = c.graph.nodes[HEAP], w = weatherOf(c.graph);
      if (!heap || !w || !c.graph.nodes[ATMOSPHERE]) return;
      const step = w.step ?? [w], temp = step.reduce((s, d) => s + (d.tmax + d.tmin) / 2, 0) / step.length;
      heapDay(c, heap, temp, Math.max(1, c.dt / 24));
    },
  },
};
