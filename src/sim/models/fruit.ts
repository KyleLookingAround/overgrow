// Soft fruit: raspberry canes and currant bushes in a netted cage on the lawn (the shed's fruit cage, src/data/shed.ts),
// and cordon redcurrants planted one at a time along the fence in bare-root season, each dated from its own planting.
// A new planting crops lightly the next summer and fully from the one after, since summer raspberries fruit on last
// year's canes and currants on older wood; each summer the fruit ripens over about seven weeks, most in the middle of
// July, and what isn't picked within a few days goes soft and drops. The net keeps the birds off, so what ripens is the
// gardener's to pick. It runs on the `fruit` system's day tick and does nothing without a `bushes` lever on a node.
//
// Sources: RHS, "Raspberries", "Blackcurrants" and "Fruit cages" (planting to first crop, the season, about 1.5–2 kg a m²
//   of an established planting); Garden Organic's growing guides for the same.
// Simplifies: one planting of mixed canes and bushes, one season from July to mid-August with a triangular peak, no
//   pruning, feeding, pests or disease; yield doesn't depend on the weather or the soil's water (canes are deep-rooted
//   and established ones are rarely watered in a British summer); the bushes never age out (a planting lasts 10–15
//   years, longer than the garden's level). Fast effect: fruit every few days in July, picked or lost. Slow effect: a
//   crop only from the second summer, and full from the third: a slow payback on the cage's price. A cordon gives its own
//   kg a summer (RHS, "Redcurrants": about 1 kg from a cordon), not the cage's yield a m²; the fence keeps the birds off
//   no better than the cage, a simplification.
import {qty, type GraphNode, type LeverValue} from '../graph';
import type {System, TickContext} from '../clock';
import {recordWaste} from './kitchen';
import {CORDON} from '../../data/shed';

export const BERRIES = 'berries';
export const BERRY_KEY = `food.${BERRIES}`;

/** An established planting's fruit a summer, kg a m² (RHS: raspberries and currants about 1.5–2). */
export const FRUIT_YIELD = 1.6;
/** The season, as days of the year: the first fruit, the peak and the last (early July to mid-August). */
export const SEASON = {from: 182, peak: 200, to: 230};
/** Days a ripe raspberry keeps on the cane before it goes soft and drops. */
export const KEEPS_ON_PLANT = 3;
/** The share of a full crop by days since planting: none the first summer, a light one the next, full after. */
export function maturity(days: number): number {
  return days < 240 ? 0 : days < 600 ? 0.4 : 1;
}

/** The planting: when it went in, game hours, and for cordons each cordon's planting (null until its first day). Kept as
 *  the node's `bushes` lever. */
export interface Bushes {
  planted: number | null;
  plants?: (number | null)[];
}
export const bushesOf = (n: GraphNode): Bushes | null => (n.levers.bushes as unknown as Bushes | undefined) ?? null;
export const newBushes = (hours: number): LeverValue => ({planted: hours}) as unknown as LeverValue;

/** The share of a summer's fruit that ripens on a day of the year: a triangle over the season, summing to one. */
export function ripening(dayOfYear: number): number {
  const {from, peak, to} = SEASON;
  if (dayOfYear < from || dayOfYear > to) return 0;
  const h = 2 / (to - from);
  return dayOfYear <= peak ? (h * (dayOfYear - from)) / (peak - from) : (h * (to - dayOfYear)) / (to - peak);
}

/** Ripe fruit waiting on the bushes, kg. */
export const ripeFruit = (n: GraphNode) => n.stocks[BERRY_KEY]?.amount ?? 0;

function day(c: TickContext) {
  const days = Math.max(1, Math.round(c.dt / 24));
  for (const n of Object.values(c.graph.nodes)) {
    // a new planting is dated on its first day (the shed's buy has no clock)
    if (n.kind === 'fruit' && n.levers.bushes === null) n.levers.bushes = newBushes(c.hours);
    let b = bushesOf(n);
    if (!b) continue;
    // a cordon planted since yesterday is dated today
    if (b.plants?.includes(null)) n.levers.bushes = (b = {...b, plants: b.plants.map((t) => t ?? c.hours)}) as unknown as LeverValue;
    const area = n.stocks['land.crops']?.amount ?? 0;
    // the fruit a summer when full: the cage's by its area, and each cordon's by its own age
    const full = b.plants ? b.plants.reduce<number>((a, t) => a + CORDON.kg * maturity((c.hours - (t ?? c.hours)) / 24), 0) : FRUIT_YIELD * area * maturity((c.hours - (b.planted ?? c.hours)) / 24);
    // what's been on the canes too long drops, then today's fruit ripens
    const lost = ripeFruit(n) * (1 - Math.exp(-days / KEEPS_ON_PLANT));
    if (lost > 1e-9) {
      c.flow({what: 'fruit dropping', unit: 'kgFood', product: BERRIES, amount: qty(lost, 'kgFood'), from: {node: n.id, stock: BERRY_KEY}, to: {boundary: 'decay'}});
      recordWaste(c.graph, lost);
    }
    const doy = c.date.dayOfYear, share = days === 1 ? ripening(doy) : Array.from({length: days}, (_, i) => ripening(doy - i)).reduce((a, x) => a + x, 0);
    const kg = full * share;
    if (kg > 1e-9) c.flow({what: 'fruit ripening', unit: 'kgFood', product: BERRIES, amount: qty(kg, 'kgFood'), from: {boundary: 'growth'}, to: {node: n.id, stock: BERRY_KEY}});
  }
}

export const fruit: System = {
  name: 'fruit',
  on: {day},
  command(cmd, g) {
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && cmd.lever === 'bushes' && g.nodes[cmd.node]) return 'the bushes are planted, not set';
    return undefined;
  },
};
