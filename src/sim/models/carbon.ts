// Carbon and land: the compost heap, compost going back to the beds, and digging a bed out of the lawn. Green waste
// the gardener brings to the heap carries the carbon its plants took from the air (counted as it reaches the heap) and
// its nitrogen; the heap breaks it down by the day's warmth, sending some carbon back to the air as CO₂, a little
// methane and nitrous oxide besides, and keeping the rest as compost, which the gardener spreads on a bed before sowing:
// its carbon and nitrogen go into the bed's fresh organic matter, where the soil model takes over. Digging moves a plot's
// land from grass to crops, a land-use change whose soil carbon effect is the soil model's: bare, dug ground loses
// organic matter faster and gets none of grass's back. docs/systems/carbon.md says how it works.
//
// Sources: IPCC 2006 Guidelines, vol. 5 ch. 4 (biological treatment of solid waste), table 4.1: composting emits about
//   4 g CH₄ and 0.3 g N₂O per kg of waste on a wet basis (for waste of about 40 % dry matter), here scaled to green
//   waste's dry matter; IPCC AR6 WGI ch. 7 for the gases' 100-year warming (non-fossil CH₄ 27, N₂O 273); Bernal, Alburquerque
//   & Moral (2009), "Composting of animal manures and chemical criteria for compost maturity assessment", for a heap
//   losing about half its carbon as CO₂ and a fifth of its nitrogen as it matures; RothC's temperature factor (Coleman &
//   Jenkinson 1996) for the pace; fresh vegetable matter of about 12 % dry matter, 42 % of it carbon and 3 % nitrogen.
//   IPCC 2006 vol. 4 ch. 5 and 6 for the land-use change: cropland's long-term soil carbon about 0.7 of grassland's
//   (F_LU for long-term cultivation, temperate moist) over the default 20 years.
// Simplifies: one heap, well mixed, breaking down at one rate set by the air's temperature (no hot phase, no turning,
//   no moisture); compost is one product, with the heap's carbon and nitrogen shared across it by the steady ratios of
//   mature compost; methane and nitrous oxide counted as CO₂e as the waste breaks down; the plants' carbon counted when
//   their waste reaches the heap, not as they grow (what's eaten breathes its carbon out elsewhere); the lawn's clippings
//   aren't collected. A bag of peat compost (part 6) will come in from the `bought` boundary with its carbon, and its
//   extraction's emissions from `bought` to the air, spread the same way as this compost.
//   Fast effect: the heap taking in a summer's waste and the dial moving down as it does. Slow effect: compost keeping
//   the beds' organic matter up, and dug ground losing carbon over decades.
import type {System, TickContext} from '../clock';
import {qty, type GraphNode} from '../graph';
import {ATMOSPHERE} from '../state';
import {SOIL, tempFactor} from './soil';
import {weatherOf} from './weather';

export const HEAP = 'heap';
/** The heap's stocks: green waste, finished compost (both kg), and the nitrogen in them (its carbon is its `carbon`). */
export const HEAPED = {waste: 'waste', compost: 'compost', nitrogen: 'nitrogen.organic'} as const;

/** kg CO₂e of plant carbon, and kg N, in a kg of fresh green waste (12 % dry matter, 42 % and 3 % of that). */
export const WASTE_C = 0.12 * 0.42 * (44 / 12), WASTE_N = 0.12 * 0.03;
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
/** The carbon and nitrogen in a kg of finished compost. */
export const COMPOST_C = (WASTE_C * (1 - CO2_SHARE)) / COMPOST_YIELD, COMPOST_N = (WASTE_N * (1 - N_LOST)) / COMPOST_YIELD;

const at = (node: string, stock: string) => ({node, stock});
// the air node, looked up when used (state.ts and the models import each other)
const air = () => at(ATMOSPHERE, 'carbon');

/** Carries green waste from a place (a bed, the kitchen) onto the heap, with the carbon and nitrogen it holds. */
export function toHeap(c: TickContext, from: GraphNode, kg: number) {
  const have = from.stocks.waste?.amount ?? 0;
  kg = Math.min(kg, have);
  if (kg <= 1e-9 || !c.graph.nodes[HEAP]) return;
  c.flow({what: 'to the heap', unit: 'kgWaste', product: 'greens', amount: qty(kg, 'kgWaste'), from: at(from.id, 'waste'), to: at(HEAP, HEAPED.waste)});
  c.flow({what: 'plant carbon', unit: 'kgCO2e', amount: qty(kg * WASTE_C, 'kgCO2e'), from: air(), to: at(HEAP, 'carbon')});
  c.flow({what: 'plant nitrogen', unit: 'kgN', amount: qty(kg * WASTE_N, 'kgN'), from: {boundary: 'growth'}, to: at(HEAP, HEAPED.nitrogen)});
}

/** Finished compost on the heap, kg. */
export const compostOn = (g: {nodes: Record<string, GraphNode>}) => g.nodes[HEAP]?.stocks[HEAPED.compost]?.amount ?? 0;

/** Spreads compost from the heap on a bed: its carbon and nitrogen go into the bed's fresh organic matter. */
export function spread(c: TickContext, bed: GraphNode, kg: number) {
  const heap = c.graph.nodes[HEAP];
  if (!heap) return;
  kg = Math.min(kg, compostOn(c.graph));
  if (kg <= 1e-9) return;
  c.flow({what: 'spreading compost', unit: 'kgWaste', product: 'compost', amount: qty(kg, 'kgWaste'), from: at(HEAP, HEAPED.compost), to: {boundary: 'decay'}});
  const carbon = Math.min(kg * COMPOST_C, Math.max(0, heap.stocks.carbon?.amount ?? 0));
  const n = Math.min(kg * COMPOST_N, Math.max(0, heap.stocks[HEAPED.nitrogen]?.amount ?? 0));
  if (carbon > 0) c.flow({what: 'compost', unit: 'kgCO2e', amount: qty(carbon, 'kgCO2e'), from: at(HEAP, 'carbon'), to: at(bed.id, SOIL.fresh)});
  if (n > 0) c.flow({what: 'compost', unit: 'kgN', amount: qty(n, 'kgN'), from: at(HEAP, HEAPED.nitrogen), to: at(bed.id, SOIL.organicN)});
}

/** Digs part of a bed plot out of the lawn: its land from grass to crops. */
export function dig(c: TickContext, bed: GraphNode, m2: number) {
  m2 = Math.min(m2, bed.stocks['land.grass']?.amount ?? 0);
  if (m2 > 1e-9) c.flow({what: 'digging', unit: 'm2', amount: qty(m2, 'm2'), from: at(bed.id, 'land.grass'), to: at(bed.id, 'land.crops')});
}

/** The heap's day: some of its waste breaks down into compost, CO₂ and the other gases. */
function heapDay(c: TickContext, heap: GraphNode, temp: number, days: number) {
  const waste = heap.stocks[HEAPED.waste]?.amount ?? 0;
  if (waste <= 1e-9) return;
  const kg = waste * (1 - Math.exp(-K_HEAP * tempFactor(temp) * (days / 365)));
  if (kg <= 1e-9) return;
  c.flow({what: 'composting', unit: 'kgWaste', product: 'greens', amount: qty(kg, 'kgWaste'), from: at(HEAP, HEAPED.waste), to: {boundary: 'decay'}});
  c.flow({what: 'composting', unit: 'kgWaste', product: 'compost', amount: qty(kg * COMPOST_YIELD, 'kgWaste'), from: {boundary: 'decay'}, to: at(HEAP, HEAPED.compost)});
  const co2 = Math.min(kg * WASTE_C * CO2_SHARE, Math.max(0, heap.stocks.carbon?.amount ?? 0));
  if (co2 > 0) c.flow({what: 'composting', unit: 'kgCO2e', amount: qty(co2, 'kgCO2e'), from: at(HEAP, 'carbon'), to: air()});
  c.flow({what: 'methane and nitrous oxide', unit: 'kgCO2e', amount: qty(kg * OTHER_GASES, 'kgCO2e'), from: {boundary: 'decay'}, to: air()});
  const lost = Math.min(kg * WASTE_N * N_LOST, Math.max(0, heap.stocks[HEAPED.nitrogen]?.amount ?? 0));
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
