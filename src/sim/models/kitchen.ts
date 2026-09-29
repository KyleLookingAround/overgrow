// The kitchen: the household's daily ask of the garden, what met it, and the honesty box at the gate. The ask is the
// weekly basket's veg for the household's people (src/sim/models/household.ts's basket). Each evening the household
// eats the day's ask from what's been picked, a group that's short made up by more of another, then what the garden
// didn't meet from the weekly shop's food in the cupboard, and the rest of its diet from the shop; what's been picked
// goes off by its shelf life, and goes to the kitchen's waste for the heap; and passers-by buy from the honesty box, the
// best first, the money going into the household's purse. The gardener carries what's over the next two days' ask to
// the box. The day's ask, what met it and the running totals are the kitchen's `ledger` lever, which the snapshot
// carries as `kitchen`. docs/systems/kitchen.md says how it works.
//
// Sources: DEFRA Family Food (the household's veg by group and weight, potatoes the largest); NHS "5 A Day" (five 80 g
//   portions a person a day) and ONS "Families and households" (2.4 people a household) for about 1 kg a day; WRAP's
//   household food waste studies for fresh produce going off at home by its shelf life (salad in days, potatoes in
//   weeks); an honesty box as a farm-gate sale at a flat price per kg, where buyers pick the best-looking produce first
//   (the root of retail's cosmetic standards: WRAP, "Food waste in primary production", 2019).
// Simplifies: one meal a day at 18:00 eats the whole day's ask; within a group the shortest-keeping is eaten first, and a
//   group can stand in for another up to twice its own ask; the shop's food makes up the rest and never goes off before
//   it's eaten; the day's ask is noted from the second evening, the first counted like any other; produce goes off at a
//   steady rate from the day it's picked; passers-by take up to a fixed amount a day, more at weekends, the best first
//   by its quality when picked (one quality a product at each place, mixed by weight); nothing is peeled or trimmed.
//   Fast effect: the day's ask met or not, and a glut going to the box for money. Slow effect: the share of the
//   household's veg the garden grows, week by week, and the food wasted along the way.
import {CROPS, type Group} from '../../data/crops';
import {BASKET, FOOD_GROUPS, VEG, type FoodGroup} from '../../data/household';
import {BOX, EXTRAS, GIFT, GLUT, KEEP_DAYS, MEAL_HOUR, PRESERVE, STORE, STRETCH, type GlutPolicy} from '../../data/kitchen';
import {calendar, type System, type TickContext} from '../clock';
import {note} from '../effects';
import {qty, type Graph, type GraphNode, type LeverValue} from '../graph';

/** The kitchen's running account, kept as its `ledger` lever and replaced, never changed in place. */
export interface Ledger {
  /** The day index of the last meal. */
  day: number;
  /** The day's ask, kg, and what the last meal ate of each product. */
  ask: number;
  ate: Record<string, number>;
  /** The share of the ask the last meal met, 0–1, and the last seven days' shares, oldest first. */
  met: number;
  week: number[];
  /** Since the start, kg: picked, eaten, gone off or left to rot, and sold at the box; and £ the box took. */
  picked: number;
  eaten: number;
  wasted: number;
  sold: number;
  earned: number;
  /** Game hours of the first produce picked and the first sale, or null. */
  firstHarvest: number | null;
  firstSale: number | null;
  /** Since the start, kg preserved and given to a neighbour, and the neighbour's goodwill. */
  preserved: number;
  given: number;
  goodwill: number;
  /** Game hours the current glut began and was last seen, or null: the glut card asks once a glut. */
  glutFrom: number | null;
  glutAt: number | null;
}

export const KITCHEN = 'kitchen', GATE = 'gate';
/** The household node beside the garden (src/sim/models/household.ts): its members set the kitchen's ask. */
export const HOUSEHOLD = 'household';

/** The kitchen's daily ask, kg by veg group, for a household of `people`: the weekly basket's veg over seven days, so
 *  the ask grows when the household does. */
export function kitchenAsk(people: number): Record<Group, number> {
  const out = {} as Record<Group, number>;
  for (const g of VEG) out[g] = (BASKET[g] * people) / 7;
  return out;
}
/** The people the kitchen feeds: the household node's members (one, the gardener, without the node). */
export function eaters(g: Graph): number {
  const m = g.nodes[HOUSEHOLD]?.levers.members;
  return Array.isArray(m) ? m.length : 1;
}
/** Today's ask of the kitchen, kg by veg group, and in all. */
export const askOf = (g: Graph) => kitchenAsk(eaters(g));
const total = (ask: Record<Group, number>) => Object.values(ask).reduce((s, v) => s + v, 0);

/** The shop's food in the cupboard, apart from the garden's produce: two stocks, its veg (`food.shop-veg`) and the rest
 *  of the diet (`food.shop-food`), since the meal needs only those two apart; the household model keeps what's in them
 *  by food group in the basket's proportions. Two, not one a group: the snapshot copies every stock each hour. */
export const SHOP_VEG = 'shop-veg', SHOP_FOOD = 'shop-food';
export const shopProduct = (g: FoodGroup) => ((VEG as readonly string[]).includes(g) ? SHOP_VEG : SHOP_FOOD);

export const newLedger = (): Ledger => ({
  day: -1, ask: total(kitchenAsk(1)), ate: {}, met: 0, week: [], picked: 0, eaten: 0, wasted: 0, sold: 0, earned: 0, firstHarvest: null, firstSale: null,
  preserved: 0, given: 0, goodwill: 0, glutFrom: null, glutAt: null,
});
export const ledgerOf = (g: Graph): Ledger => (g.nodes[KITCHEN]?.levers.ledger as unknown as Ledger | undefined) ?? newLedger();
function update(g: Graph, change: (l: Ledger) => Partial<Ledger>) {
  const k = g.nodes[KITCHEN];
  if (!k || !('ledger' in k.levers)) return;
  const l = ledgerOf(g);
  k.levers.ledger = {...l, ...change(l)} as unknown as LeverValue;
}
/** The kitchen's preserves: the glut frozen, bottled or pickled (src/data/kitchen.ts's PRESERVE). */
export const PRESERVES = 'preserves';
/** What the household does with a glut: the kitchen's `glut` lever. */
export const glutPolicy = (g: Graph): GlutPolicy => (g.nodes[KITCHEN]?.levers.glut as GlutPolicy | undefined) ?? 'sell';
/** Room left in the freezer, kg. */
export const preserveRoom = (g: Graph) => Math.max(0, PRESERVE.cap - (g.nodes[KITCHEN]?.stocks[`food.${PRESERVES}`]?.amount ?? 0));
/** Notes a glut on a day: the kitchen has more than GLUT.kg over its need; a new glut after GLUT.gapDays without one. */
export function recordGlut(g: Graph, hours: number) {
  update(g, (l) => ({glutFrom: l.glutAt !== null && hours - l.glutAt <= GLUT.gapDays * 24 ? l.glutFrom : hours, glutAt: hours}));
}
/** Preserves a glut in the kitchen: each product out as itself and back as preserves, the jars and bags from the purse. */
export function preserve(c: TickContext, items: {product: string; kg: number}[]) {
  const k = c.graph.nodes[KITCHEN];
  if (!k) return;
  let done = 0;
  for (const it of items) {
    const kg = Math.min(it.kg, stockOf(k, it.product), preserveRoom(c.graph) - done);
    if (kg <= 1e-9) continue;
    c.flow({what: 'preserving', unit: 'kgFood', product: it.product, amount: qty(kg, 'kgFood'), from: {node: k.id, stock: `food.${it.product}`}, to: {boundary: 'preserving'}});
    c.flow({what: 'preserving', unit: 'kgFood', product: PRESERVES, amount: qty(kg, 'kgFood'), from: {boundary: 'preserving'}, to: {node: k.id, stock: `food.${PRESERVES}`}});
    done += kg;
  }
  const gbp = Math.min(done * PRESERVE.gbpPerKg, Math.max(0, k.stocks.money?.amount ?? 0));
  if (gbp > 1e-9) c.flow({what: 'jars and bags', unit: 'GBP', amount: qty(gbp, 'GBP'), from: {node: k.id, stock: 'money'}, to: {boundary: 'bought'}});
  if (done > 0) update(c.graph, (l) => ({preserved: l.preserved + done}));
}
/** Gives a glut over the fence to a neighbour: the food leaves the garden, and the neighbour's goodwill grows. */
export function give(c: TickContext, items: {product: string; kg: number}[]) {
  const k = c.graph.nodes[KITCHEN];
  if (!k) return;
  let done = 0;
  for (const it of items) {
    const kg = Math.min(it.kg, stockOf(k, it.product));
    if (kg <= 1e-9) continue;
    c.flow({what: 'given to a neighbour', unit: 'kgFood', product: it.product, amount: qty(kg, 'kgFood'), from: {node: k.id, stock: `food.${it.product}`}, to: {boundary: 'given'}});
    done += kg;
  }
  if (done > 0) update(c.graph, (l) => ({given: l.given + done, goodwill: l.goodwill + done * GIFT.goodwillPerKg}));
}

/** Counts food that went off, in the garden or the kitchen. */
export const recordWaste = (g: Graph, kg: number) => update(g, (l) => ({wasted: l.wasted + kg}));
/** Counts produce the gardener brought in, and mixes its quality into the kitchen's. */
export function recordPick(g: Graph, hours: number, kg: number, product?: string, q?: number) {
  if (product !== undefined && q !== undefined) mixQuality(g, KITCHEN, product, kg, q);
  update(g, (l) => ({picked: l.picked + kg, firstHarvest: l.firstHarvest ?? hours}));
}

// ---- quality: what passers-by pick first ----

/** The quality, 0–100, of each product held at a place (the kitchen's and the box's `quality` lever), or 50 if unknown. */
export const qualityAt = (n: GraphNode | undefined, product: string): number =>
  Number(((n?.levers.quality ?? {}) as Record<string, LeverValue>)[product] ?? 50);
/** Mixes `kg` of a product of quality `q` into what a place holds, by weight (before the kg arrive). */
export function mixQuality(g: Graph, at: string, product: string, kg: number, q: number) {
  const n = g.nodes[at];
  if (!n || !('quality' in n.levers) || kg <= 0) return;
  const have = stockOf(n, product), was = qualityAt(n, product), mixed = have > 1e-9 ? (was * have + q * kg) / (have + kg) : q;
  n.levers.quality = {...((n.levers.quality ?? {}) as Record<string, LeverValue>), [product]: Math.round(mixed * 10) / 10};
}

const PRODUCTS = Object.values(CROPS);
/** What's over the kitchen's need now, as the household's glut policy keeps it (src/sim/gardener.ts carries it off). */
export const surplusOf = (g: Graph) => {
  const k = g.nodes[KITCHEN];
  return k ? surplus(k, askOf(g), glutPolicy(g) !== 'sell') : [];
};

/** Everything the kitchen keeps and the box sells: the crops at the box's price, and the eggs and fruit at theirs. */
const SOLD: {product: string; keeps: number; price: number}[] = [
  ...PRODUCTS.map((c) => ({product: c.product, keeps: c.keeps.kitchen, price: BOX.price})),
  ...EXTRAS.map((x) => ({product: x.product, keeps: x.keeps, price: x.box})),
];
const inGroup = (group: Group) => PRODUCTS.filter((c) => c.group === group).sort((a, b) => a.keeps.kitchen - b.keeps.kitchen);
/** Each product's stock key, made once rather than a string built at every look. */
const KEYS = new Map<string, string>();
const keyOf = (product: string) => {
  let k = KEYS.get(product);
  if (k === undefined) KEYS.set(product, (k = `food.${product}`));
  return k;
};
const stockOf = (n: GraphNode, product: string) => n.stocks[keyOf(product)]?.amount ?? 0;

/** What's in the kitchen beyond what the household will eat while it's fresh, by product: the gardener carries it to the
 *  honesty box. The kitchen keeps a group's stretched ask for half each product's shelf life, up to three weeks, and what
 *  stores (STORE) for up to five months. */
export function surplus(k: GraphNode, ask: Record<Group, number>, tight = false): {product: string; kg: number}[] {
  const out: {product: string; kg: number}[] = [];
  for (const group of VEG) {
    let room = ask[group] * STRETCH * STORE.days;
    // the longest-keeping first, each for as long as it keeps; a household that preserves or gives away its gluts keeps
    // only a few days' ask of what doesn't store, and freezes or gives the rest while it's fresh (WRAP)
    for (const c of inGroup(group).reverse()) {
      const cap = c.keeps.kitchen >= STORE.keeps ? STORE.days : tight ? PRESERVE.freshDays : KEEP_DAYS, stretch = tight && c.keeps.kitchen < STORE.keeps ? 1 : STRETCH;
      const have = stockOf(k, c.product), keep = Math.min(have, room, ask[group] * stretch * Math.min(cap, c.keeps.kitchen / 2));
      room -= keep;
      if (have - keep > 0.05) out.push({product: c.product, kg: have - keep});
    }
  }
  // eggs and fruit: what the household will eat while they keep, up to the three weeks, and the rest to the box
  const people = eaters0(ask);
  for (const x of EXTRAS) {
    const have = stockOf(k, x.product), keep = Math.min(have, ((x.perWeek * people) / 7) * Math.min(KEEP_DAYS, x.keeps / 2));
    if (have - keep > 0.05) out.push({product: x.product, kg: have - keep});
  }
  return out;
}
/** The people an ask is for (the ask is the basket's veg a day, a person's times the people). */
const eaters0 = (ask: Record<Group, number>) => total(ask) / total(kitchenAsk(1));

function meal(c: TickContext, k: GraphNode, day: number) {
  const ate: Record<string, number> = {};
  const eat = (group: Group, want: number) => {
    let left = want;
    for (const crop of inGroup(group)) {
      const kg = Math.min(left, stockOf(k, crop.product));
      if (kg <= 1e-9) continue;
      c.flow({what: 'eating', unit: 'kgFood', product: crop.product, amount: qty(kg, 'kgFood'), from: {node: k.id, stock: `food.${crop.product}`}, to: {boundary: 'eaten'}});
      ate[crop.product] = (ate[crop.product] ?? 0) + kg;
      left -= kg;
    }
    return want - left;
  };
  const ask = askOf(c.graph), want = total(ask);
  let eaten = 0;
  for (const g of VEG) eaten += eat(g, ask[g]);
  // a short group made up by more of another, up to its stretch; then what's been preserved
  for (const g of VEG) if (eaten < want - 1e-9) eaten += eat(g, Math.min(want - eaten, ask[g] * (STRETCH - 1)));
  const jar = Math.min(Math.max(0, want - eaten), stockOf(k, PRESERVES));
  if (jar > 1e-9) {
    c.flow({what: 'eating', unit: 'kgFood', product: PRESERVES, amount: qty(jar, 'kgFood'), from: {node: k.id, stock: `food.${PRESERVES}`}, to: {boundary: 'eaten'}});
    ate[PRESERVES] = jar;
    eaten += jar;
  }
  const met = Math.min(1, eaten / want);
  // what the garden didn't meet comes from the shop's veg; then the rest of the diet, a seventh of the week's basket,
  // less the garden's eggs and fruit eaten in its place
  fromShop(c, k, SHOP_VEG, Math.max(0, want - eaten));
  const people = eaters(c.graph);
  let extras = 0;
  for (const x of EXTRAS) {
    const kg = Math.min(stockOf(k, x.product), (x.perWeek * people) / 7);
    if (kg <= 1e-9) continue;
    c.flow({what: 'eating', unit: 'kgFood', product: x.product, amount: qty(kg, 'kgFood'), from: {node: k.id, stock: `food.${x.product}`}, to: {boundary: 'eaten'}});
    ate[x.product] = kg;
    extras += kg;
  }
  const rest = FOOD_GROUPS.reduce((s, g) => s + ((VEG as readonly string[]).includes(g) ? 0 : (BASKET[g] * people) / 7), 0);
  fromShop(c, k, SHOP_FOOD, Math.max(0, rest - extras));
  update(c.graph, (l) => ({day, ask: want, ate, met, week: [...l.week, met].slice(-7), eaten: l.eaten + eaten + extras}));
  // the day's ask of the garden, from the second evening: the first evening's meal is what the house already had in (the
  // founding spec's first minute has the kitchen's first ask on day 2)
  if (day >= 1) note(c, 'ask', k.id, want, 'kgFood');
}

/** Eats up to `kg` of the shop's food from one of the cupboard's stocks; returns what was eaten. */
function fromShop(c: TickContext, k: GraphNode, product: string, kg: number): number {
  const eat = Math.min(kg, stockOf(k, product));
  if (eat <= 1e-9) return 0;
  c.flow({what: 'shop food eaten', unit: 'kgFood', product, amount: qty(eat, 'kgFood'), from: {node: k.id, stock: `food.${product}`}, to: {boundary: 'eaten'}});
  return eat;
}

/** Passers-by buy from the honesty box, the best first; the money goes into the household's purse. */
function sales(c: TickContext, gate: GraphNode, k: GraphNode, weekend: boolean) {
  let room = weekend ? BOX.weekend : BOX.perDay, sold = 0;
  const best = SOLD.filter((p) => stockOf(gate, p.product) > 1e-9).sort((a, b) => qualityAt(gate, b.product) - qualityAt(gate, a.product));
  let earned = 0;
  for (const crop of best) {
    const kg = Math.min(room, stockOf(gate, crop.product));
    if (kg <= 1e-9) continue;
    c.flow({what: 'honesty box', unit: 'kgFood', product: crop.product, amount: qty(kg, 'kgFood'), from: {node: gate.id, stock: `food.${crop.product}`}, to: {boundary: 'sold'}});
    room -= kg;
    sold += kg;
    earned += kg * crop.price;
  }
  if (sold <= 0) return;
  c.flow({what: 'honesty box', unit: 'GBP', amount: qty(earned, 'GBP'), from: {boundary: 'sold'}, to: {node: k.id, stock: 'money'}});
  update(c.graph, (l) => ({sold: l.sold + sold, earned: l.earned + earned, firstSale: l.firstSale ?? c.hours}));
}

/** Produce going off where it's kept: in the kitchen to its waste (for the heap), at the box thrown out. */
function goingOff(c: TickContext, n: GraphNode, days: number, toWaste: boolean) {
  let lost = 0;
  for (const crop of SOLD) {
    const kg = stockOf(n, crop.product) * (1 - Math.exp(-days / crop.keeps));
    if (kg <= 1e-6) continue;
    c.flow({what: 'going off', unit: 'kgFood', product: crop.product, amount: qty(kg, 'kgFood'), from: {node: n.id, stock: `food.${crop.product}`}, to: {boundary: 'decay'}});
    if (toWaste) c.flow({what: 'going off', unit: 'kgWaste', product: 'greens', amount: qty(kg, 'kgWaste'), from: {boundary: 'decay'}, to: {node: n.id, stock: 'waste'}});
    lost += kg;
  }
  if (lost > 0) recordWaste(c.graph, lost);
}

export const kitchen: System = {
  name: 'kitchen',
  on: {
    hour(c) {
      const k = c.graph.nodes[KITCHEN], gate = c.graph.nodes[GATE];
      if (!k || !('ledger' in k.levers)) return;
      // the evening meal, once a day (every day of a longer step)
      const days = c.dt >= 24 ? Math.round(c.dt / 24) : calendar(c.hours - c.dt).hour < MEAL_HOUR && c.date.hour >= MEAL_HOUR ? 1 : 0;
      for (let i = 0; i < days; i++) {
        const d = calendar(c.hours - (days - 1 - i) * 24);
        meal(c, k, d.dayIndex);
        if (gate) sales(c, gate, k, d.weekday >= 5);
        goingOff(c, k, 1, true);
        if (gate) goingOff(c, gate, 1, false);
        const jars = stockOf(k, PRESERVES) * (1 - Math.exp(-1 / PRESERVE.keeps));
        if (jars > 1e-6) {
          c.flow({what: 'going off', unit: 'kgFood', product: PRESERVES, amount: qty(jars, 'kgFood'), from: {node: k.id, stock: `food.${PRESERVES}`}, to: {boundary: 'decay'}});
          recordWaste(c.graph, jars);
        }
      }
    },
  },
  command(cmd, g) {
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && cmd.node === KITCHEN && cmd.lever === 'ledger') return 'the kitchen’s ledger is kept, not set';
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && (cmd.node === KITCHEN || cmd.node === GATE) && cmd.lever === 'quality') return 'quality is the produce’s, not set';
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && cmd.node === KITCHEN && cmd.lever === 'glut')
      return cmd.type !== 'policy' ? 'a glut is the household’s policy' : ['sell', 'preserve', 'give'].includes(String(cmd.value)) ? null : 'sell, preserve or give';
    return undefined;
  },
};
