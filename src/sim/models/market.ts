// The smallholding's first market beyond the gate: a box scheme (households who take a box a week at a set price, a
// promised mix, goodwill that decides who stays and who joins), a farm shop (footfall by season and weekday, drawn from
// the game's dice, buying by households' baskets and a price elasticity), cosmetic grading, seasonal prices and the
// imports that fill a short box. Pure functions over kg by veg group, £ and hours, and `boxScheme` and `farmShop`
// systems, not yet listed in src/sim/systems.ts (part 14 adds them). docs/systems/market.md says how it works.
//
// Sources: DEFRA Family Food and ONS Family Spending (baskets, prices, income deciles, through household.ts's demand);
//   Green et al. (2013, BMJ) for price elasticities (again through household.ts); box-scheme and CSA network surveys and
//   farm retail association figures for the order of churn (a few per cent a month), the box's share of a household's
//   veg and farm-shop footfall (busier at weekends and in summer); DEFRA's fresh-veg price series for the seasons;
//   WRAP for what farms reject on looks (through storage.ts's GRADE).
// Simplifies: every household of a decile is the same household, and a box is a set share of its veg basket; goodwill
//   moves toward the share of the promise delivered, one number for the scheme; joiners and leavers are expected values,
//   not counted people; a farm shop's customers are Poisson draws around a mean that a day's luck spreads, and each buys a
//   fixed share of a week's veg at the shop's price, whatever it sells; unmet demand walks out to a supermarket; prices
//   are national averages times a lever, seasonal and by freshness; the wholesaler's price is one share of shop prices.
//   Fast effect: this week's box filled or short, and a day's sales. Slow effect: goodwill and so the subscribers
//   over months, and the price and waste a standard sets across a season.
import {BOX, FRESH_PRICE, IMPORT, SEASONAL, SHOP} from '../../data/market';
import {GRADE, GRADE_PREMIUM, PRODUCTS, PRODUCT_IDS, STANDS_FOR, type Route, type Standard} from '../../data/storage';
import {PRICE, VEG} from '../../data/household';
import type {Group} from '../../data/crops';
import {calendar, type System, type TickContext} from '../clock';
import {qty, type End, type GraphNode, type LeverValue} from '../graph';
import type {Rng} from '../random';
import {ATMOSPHERE} from '../state';
import {burn, PURSE} from './energy';
import {demand, footprintOf, townDemand, type Demand} from './household';
import {age, blendLife, keepingOf, outsideOf, round, STORE, wasteFootprint, type Round} from './storage';

export const BOX_NODE = 'box';
export const SHOP_NODE = 'shop';
/** The lever a node keeps its box scheme or its farm shop in, and the running account beside it. */
export const SCHEME = 'scheme';
export const FARM_SHOP = 'shop';
export const LEDGER = 'ledger';

// ---- veg by group, and what it fetches ----

/** Kg by veg group. */
export type Kg = Record<Group, number>;
export const noKg = (): Kg => ({potatoes: 0, salads: 0, tomatoes: 0, greens: 0});
const each = <T>(f: (g: Group) => T) => VEG.map(f);
const total = (k: Kg) => VEG.reduce((s, g) => s + k[g], 0);
/** Kg by group and how used each is (life, 0 fresh to 1 gone), the way the market sees a store or a shelf. */
export interface Stock {
  kg: Kg;
  life: Kg;
}
export const emptyStock = (): Stock => ({kg: noKg(), life: noKg()});

/** Seasonal price multiple for a group on a day of the year: dearest at its peak, cheapest half a year on. */
export const seasonal = (g: Group, dayOfYear: number) => 1 + SEASONAL[g].amp * Math.cos((2 * Math.PI * (dayOfYear - SEASONAL[g].peak)) / 365);
/** What freshness does to price: a fresh lot earns the full price, one with none of its life left FRESH_PRICE.min of it. */
export const freshPrice = (life: number) => 1 - (1 - FRESH_PRICE.min) * Math.min(1, Math.max(0, life)) ** FRESH_PRICE.power;
/** £ a kg of a group at a price lever, on a day, at a life. */
export const pricePerKg = (g: Group, index: number, dayOfYear: number, life = 0) => PRICE[g] * index * seasonal(g, dayOfYear) * freshPrice(life);

/** Grades `kg` (raw, as picked) to a standard: what passes and what's graded out, by group. */
export function grade(kg: Kg, standard: Standard): {usable: Kg; out: Kg} {
  const usable = noKg(), out = noKg();
  for (const g of VEG) {
    out[g] = kg[g] * GRADE[g][standard];
    usable[g] = kg[g] - out[g];
  }
  return {usable, out};
}
/** Where graded-out kg goes and what it carries: kg CO₂e beyond growing it, land behind it (m² a year), and £ it's worth. */
export function dispose(out: Kg, route: Route) {
  const r = {co2e: 0, land: 0, value: 0};
  for (const g of VEG) {
    const w = wasteFootprint(g, out[g], route);
    r.co2e += w.co2e;
    r.land += w.land;
    r.value += w.value;
  }
  return r;
}
/** Ages a stock by days at the storage model's temperature for a place: what goes off, kg by group. */
export function ageStock(s: Stock, place: 'shelf' | 'van' | 'shed' | 'cold store', days: number, outsideC: number): {stock: Stock; spoiled: Kg} {
  const out = emptyStock(), spoiled = noKg();
  for (const g of VEG) {
    const a = age({product: STANDS_FOR[g], kg: s.kg[g], life: s.life[g]}, place, days, outsideC);
    out.kg[g] = a.lot.kg;
    out.life[g] = a.lot.life;
    spoiled[g] = a.spoiled;
  }
  return {stock: out, spoiled};
}

// ---- the box scheme ----

/** The scheme: subscribers by income decile (lowest first), goodwill (0–1), the box's price as a multiple of national shop
 *  prices, the cosmetic standard its produce is graded to, whether a short box is topped up from a wholesaler, and the weeks run. */
export interface Scheme {
  counts: number[];
  goodwill: number;
  priceIndex: number;
  standard: Standard;
  topUp: boolean;
  weeks: number;
}
/** A new scheme of `n` subscribers spread over the deciles that take boxes. */
export const startScheme = (n: number, o: Partial<Omit<Scheme, 'counts'>> = {}): Scheme => ({
  counts: BOX.deciles.map((w) => w * n), goodwill: BOX.startGoodwill, priceIndex: BOX.priceIndex, standard: 'loose', topUp: false, weeks: 0, ...o,
});
export const subscribers = (s: Pick<Scheme, 'counts'>) => s.counts.reduce((a, b) => a + b, 0);

/** The mix a box promises, kg by veg group, for a household of a decile: a set share of its weekly veg from household.ts's demand. */
export function boxPromise(decile: number): Kg {
  const d = demand(decile, 1, 1).kg, out = noKg();
  for (const g of VEG) out[g] = BOX.share * d[g];
  return out;
}
/** A week's promise, kg by group, over all subscribers. */
export function promised(counts: readonly number[]): Kg {
  const out = noKg();
  counts.forEach((n, i) => {
    if (n <= 0) return;
    const p = boxPromise(i);
    for (const g of VEG) out[g] += n * p[g];
  });
  return out;
}
/** The £ a full box costs a household of a decile at a price lever. */
export const boxPrice = (decile: number, priceIndex: number) => VEG.reduce((s, g) => s + boxPromise(decile)[g] * PRICE[g] * priceIndex, 0);
/** The scheme's subscribers as households: their weekly demand from household.ts (N households demand N times one). */
export const schemeDemand = (counts: readonly number[], price: number | Kg = 1): Demand => townDemand(counts, price);
/** Hours a week: packing the boxes and driving the round. */
export const boxHours = (s: Pick<Scheme, 'counts'>, r: Pick<Round, 'hours'>) => ({pack: (subscribers(s) * BOX.packMin) / 60, drive: r.hours});

export interface Week {
  /** Kg promised, taken raw from the store, graded out, lost on the road, delivered from stock, imported, and still short. */
  promised: Kg;
  raw: Kg;
  graded: Kg;
  road: Kg;
  delivered: Kg;
  imported: Kg;
  short: Kg;
  /** Kg delivered (own and imported) over kg promised, 0–1. */
  fill: number;
  /** £ in from subscribers (a short box is paid for what's in it), out on imports, out on the van's fuel, and left. */
  revenue: number;
  importCost: number;
  fuel: number;
  profit: number;
  /** Carbon of the imports and the van, kg CO₂e; the round; and the hours it takes. */
  importCo2e: number;
  round: Round;
  hours: {pack: number; drive: number};
}

/**
 * A week of boxes from a stock: takes what the boxes need (more raw kg than delivered, for what the standard grades out
 * and the van's ride spoils), finds each group's short kg, and tops them up from a wholesaler if the scheme does. Returns
 * the week and the stock left. Pure: the system does the moving.
 */
export function fillWeek(s: Scheme, stock: Stock, dayOfYear: number, outsideC: number): {week: Week; left: Stock} {
  const want = promised(s.counts), rd = round(subscribers(s), outsideC), left = emptyStock();
  const w: Week = {
    promised: want, raw: noKg(), graded: noKg(), road: noKg(), delivered: noKg(), imported: noKg(), short: noKg(),
    fill: 1, revenue: 0, importCost: 0, fuel: rd.cost, profit: 0, importCo2e: 0, round: rd, hours: boxHours(s, rd),
  };
  for (const g of VEG) {
    const life = stock.life[g], ride = age({product: STANDS_FOR[g], kg: 1, life}, 'van', rd.aboard / 24, outsideC).lot.kg;
    const pass = (1 - GRADE[g][s.standard]) * ride;
    const raw = Math.min(stock.kg[g], pass > 0 ? want[g] / pass : 0);
    w.raw[g] = raw;
    w.graded[g] = raw * GRADE[g][s.standard];
    w.road[g] = raw * (1 - GRADE[g][s.standard]) * (1 - ride);
    w.delivered[g] = raw * pass;
    w.short[g] = Math.max(0, want[g] - w.delivered[g]);
    left.kg[g] = stock.kg[g] - raw;
    left.life[g] = stock.life[g];
    if (s.topUp && w.short[g] > 1e-9) {
      w.imported[g] = w.short[g];
      w.short[g] = 0;
      w.importCost += w.imported[g] * PRICE[g] * IMPORT.priceShare * seasonal(g, dayOfYear);
      w.importCo2e += footprintOf(g, w.imported[g]).carbon;
    }
    w.revenue += (w.delivered[g] + w.imported[g]) * PRICE[g] * s.priceIndex * standardPremium(s.standard);
  }
  const kg = total(want);
  w.fill = kg > 0 ? (total(w.delivered) + total(w.imported)) / kg : 1;
  w.profit = w.revenue - w.importCost - w.fuel;
  return {week: w, left};
}

/** Goodwill after a week: it moves toward the share of the promise delivered. */
export const nextGoodwill = (goodwill: number, fill: number) => goodwill + BOX.rate * (fill - goodwill);

/** A month on: who leaves (a few per cent, more when goodwill is low or the price has crept up) and who joins (a few, and
 *  more by word of mouth, scaled by goodwill squared and how cheap the box looks). Expected values, spread over the deciles. */
export function nextMonth(s: Scheme): number[] {
  const n = subscribers(s), price = s.priceIndex / BOX.refPrice;
  const leave = Math.min(1, (BOX.churn + BOX.unhappy * (1 - s.goodwill)) * price);
  const join = (BOX.join + BOX.word * n) * s.goodwill ** 2 * price ** -BOX.priceElasticity;
  const spread = BOX.deciles.reduce((a, b) => a + b, 0);
  return s.counts.map((c, i) => c * (1 - leave) + (join * BOX.deciles[i]!) / spread);
}
/** The scheme after a week with a fill: goodwill moves, and every fourth week the subscribers change. */
export function step(s: Scheme, fill: number): Scheme {
  const weeks = s.weeks + 1, goodwill = nextGoodwill(s.goodwill, fill), next = {...s, weeks, goodwill};
  return weeks % BOX.weeksPerMonth === 0 ? {...next, counts: nextMonth(next)} : next;
}

// ---- the farm shop ----

/** The shop: its price as a multiple of national shop prices (a lever), the standard its produce is graded to, and its
 *  shelf (kg and life by group). */
export interface Shop {
  priceIndex: number;
  standard: Standard;
  shelf: Stock;
}
export const startShop = (o: Partial<Shop> = {}): Shop => ({priceIndex: SHOP.priceIndex, standard: 'strict', shelf: emptyStock(), ...o});

/** Customers a day on average: the season and the weekday, and the price (a dearer shop draws fewer). */
export const footfallMean = (d: {season: string; weekday: number}, priceIndex: number) =>
  SHOP.base * SHOP.season[d.season]! * SHOP.weekday[d.weekday]! * (SHOP.refPrice / priceIndex) ** SHOP.elasticity;

/** A standard normal draw (Box–Muller) from the game's dice. */
function normal(r: Rng) {
  return Math.sqrt(-2 * Math.log(1 - r.next())) * Math.cos(2 * Math.PI * r.next());
}
/** A Poisson draw around a mean (Knuth's product for small means, a normal for large). */
function poisson(mean: number, r: Rng): number {
  if (mean <= 0) return 0;
  if (mean > 40) return Math.max(0, Math.round(mean + Math.sqrt(mean) * normal(r)));
  const l = Math.exp(-mean);
  let k = 0, p = 1;
  do {
    k++;
    p *= r.next();
  } while (p > l);
  return k - 1;
}
/** A day's customers: a Poisson draw around the mean, the mean spread by the day's luck (weather and chance). */
export const customersToday = (mean: number, r: Rng) => poisson(mean * Math.max(0, 1 + SHOP.luck * normal(r)), r);

export interface Day {
  customers: number;
  /** Kg sold by group, and kg wanted that the shelf didn't have (they walk out). */
  sold: Kg;
  unmet: Kg;
  revenue: number;
}
/** Draws which decile each customer is from the shop's weights: the counts by decile. */
function deciles(customers: number, r: Rng): number[] {
  const out = SHOP.deciles.map(() => 0), sum = SHOP.deciles.reduce((a, b) => a + b, 0);
  for (let i = 0; i < customers; i++) {
    let u = r.next() * sum, d = 0;
    while (d < out.length - 1 && u >= SHOP.deciles[d]!) u -= SHOP.deciles[d++]!;
    out[d]!++;
  }
  return out;
}
/**
 * A day at the shop: the customers, each a household of a decile buying its visit's share of a week's veg at the shop's
 * price along household.ts's elasticity, up to what the shelf has. Returns the day and the shelf left (unsold produce stays
 * and spoils: age it with `ageStock`).
 */
export function serveDay(shop: Shop, date: {season: string; weekday: number; dayOfYear: number}, r: Rng): {day: Day; shelf: Stock} {
  const customers = customersToday(footfallMean(date, shop.priceIndex), r), day: Day = {customers, sold: noKg(), unmet: noKg(), revenue: 0};
  const price = Object.fromEntries(VEG.map((g) => [g, shop.priceIndex * seasonal(g, date.dayOfYear)])) as Kg;
  const want = noKg();
  deciles(customers, r).forEach((n, i) => {
    if (n <= 0) return;
    const d = demand(i, n, price).kg;
    for (const g of VEG) want[g] += SHOP.visit * d[g];
  });
  const shelf = emptyStock();
  for (const g of VEG) {
    const sold = Math.min(want[g], shop.shelf.kg[g]);
    day.sold[g] = sold;
    day.unmet[g] = want[g] - sold;
    day.revenue += sold * pricePerKg(g, shop.priceIndex, date.dayOfYear, shop.shelf.life[g]) * standardPremium(shop.standard);
    shelf.kg[g] = shop.shelf.kg[g] - sold;
    shelf.life[g] = shop.shelf.life[g];
  }
  return {day, shelf};
}
/** Puts raw produce on the shelf: graded to the standard (the rest graded out), its life mixed with what's already there. */
export function restock(shop: Shop, raw: Kg, life: Kg = noKg()): {shop: Shop; graded: Kg} {
  const {usable, out} = grade(raw, shop.standard), shelf = emptyStock();
  for (const g of VEG) {
    shelf.kg[g] = shop.shelf.kg[g] + usable[g];
    shelf.life[g] = shelf.kg[g] > 0 ? (shop.shelf.kg[g] * shop.shelf.life[g] + usable[g] * life[g]) / shelf.kg[g] : 0;
  }
  return {shop: {...shop, shelf}, graded: out};
}
/** The premium a strict standard earns on what it sells: the price multiple over a loose one (buyers pay for uniform looks). */
export const standardPremium = (standard: Standard) => (standard === 'strict' ? GRADE_PREMIUM : 1);

// ---- the market's worth: sell now or store ----

/** What holding `kg` of a group for some days is worth against selling today, £: the kg that survive at the later season's
 *  price and their freshness, less the cold room's bill if it's cold (storage.ts prices it). The trade-off has no fixed
 *  answer: potatoes keep for months and are dearer in spring; salad goes in days. */
export function holdValue(g: Group, kg: number, days: number, dayOfYear: number, outsideC: number, index: number, cold: boolean, coldCost = 0) {
  const a = age({product: STANDS_FOR[g], kg, life: 0}, cold ? 'cold store' : 'shed', days, outsideC);
  const now = kg * pricePerKg(g, index, dayOfYear), later = a.lot.kg * pricePerKg(g, index, dayOfYear + days, a.lot.life);
  return {now, later, gain: later - coldCost - now};
}

// ---- the systems ----

/** The scheme's running account since the start, kept as its `ledger` lever and replaced, never changed in place. */
export interface Ledger {
  weeks: number;
  revenue: number;
  imports: number;
  fuel: number;
  delivered: number;
  graded: number;
  spoiled: number;
  shortWeeks: number;
  /** Game hours of the first box and the first short box, or null (the unfolding's cues and the bot's milestones). */
  firstBox: number | null;
  firstShort: number | null;
}
export const newLedger = (): Ledger => ({weeks: 0, revenue: 0, imports: 0, fuel: 0, delivered: 0, graded: 0, spoiled: 0, shortWeeks: 0, firstBox: null, firstShort: null});
export const schemeOf = (n: GraphNode | undefined) => (n?.levers[SCHEME] as unknown as Scheme | undefined) ?? null;
export const shopOf = (n: GraphNode | undefined) => (n?.levers[FARM_SHOP] as unknown as Shop | undefined) ?? null;
const ledgerOf = (n: GraphNode) => (n.levers[LEDGER] as unknown as Ledger | undefined) ?? newLedger();
/** The shop's running account since the start. */
export interface ShopLedger {
  days: number;
  customers: number;
  revenue: number;
  sold: number;
  unmet: number;
  firstSale: number | null;
}
export const newShopLedger = (): ShopLedger => ({days: 0, customers: 0, revenue: 0, sold: 0, unmet: 0, firstSale: null});
const shopLedgerOf = (n: GraphNode) => (n.levers[LEDGER] as unknown as ShopLedger | undefined) ?? newShopLedger();
const setLever = (n: GraphNode, k: string, v: unknown) => void (n.levers[k] = v as LeverValue);

/** The kg and life of a node's produce by veg group (its `food.<product>` stocks; life from its `keeping` lever). */
export function stockOf(n: GraphNode): Stock {
  const s = emptyStock(), life = keepingOf(n)?.life ?? {};
  for (const p of PRODUCT_IDS) {
    const g = PRODUCTS[p].group as Group, kg = n.stocks[`food.${p}`]?.amount ?? 0;
    if (!VEG.includes(g) || kg <= 0) continue;
    s.life[g] = (s.kg[g] * s.life[g] + kg * (life[p] ?? 0)) / (s.kg[g] + kg);
    s.kg[g] += kg;
  }
  return s;
}
/** Moves `kg` of a group off a node's shelves, across its products in proportion to what it holds, to somewhere; returns how much moved. */
function take(c: TickContext, n: GraphNode, g: Group, kg: number, what: string, to: End | ((product: string) => End), waste?: string) {
  const held = PRODUCT_IDS.filter((p) => PRODUCTS[p].group === g && (n.stocks[`food.${p}`]?.amount ?? 0) > 0);
  const all = held.reduce((s, p) => s + n.stocks[`food.${p}`]!.amount, 0);
  if (kg <= 1e-9 || all <= 0) return 0;
  const moved = Math.min(kg, all);
  for (const p of held) {
    const part = (moved * n.stocks[`food.${p}`]!.amount) / all;
    c.flow({what, unit: 'kgFood', product: p, amount: qty(part, 'kgFood'), from: {node: n.id, stock: `food.${p}`}, to: typeof to === 'function' ? to(p) : to});
    if (waste) c.flow({what, unit: 'kgWaste', product: 'greens', amount: qty(part, 'kgWaste'), from: {boundary: 'decay'}, to: {node: waste, stock: 'waste'}});
  }
  return moved;
}
const pay = (c: TickContext, what: string, gbp: number, from: 'sold' | 'purse') => {
  if (!(gbp > 1e-9) || !c.graph.nodes[PURSE]) return;
  if (from === 'sold') c.flow({what, unit: 'GBP', amount: qty(gbp, 'GBP'), from: {boundary: 'sold'}, to: {node: PURSE, stock: 'money'}});
  else c.flow({what, unit: 'GBP', amount: qty(gbp, 'GBP'), from: {node: PURSE, stock: 'money'}, to: {boundary: 'bought'}});
};

/** The box scheme system: each week, packs and delivers the boxes from the store, moves what left the store (delivered to
 *  `sold`, graded out and lost on the road to the store's waste), pays the imports and the van's diesel, takes the
 *  subscribers' money, and moves goodwill and (each month) the subscribers. Not yet listed in src/sim/systems.ts. */
export const boxScheme: System = {
  name: 'box scheme',
  on: {
    week(c) {
      const n = c.graph.nodes[BOX_NODE], store = c.graph.nodes[STORE], s = schemeOf(n);
      if (!n || !store || !s) return;
      const {week: w} = fillWeek(s, stockOf(store), c.date?.dayOfYear ?? 1, outsideOf(c.graph));
      for (const g of VEG) {
        take(c, store, g, w.delivered[g], 'box scheme', {boundary: 'sold'});
        take(c, store, g, w.graded[g] + w.road[g], 'graded out and lost on the road', {boundary: 'decay'}, store.id);
      }
      pay(c, 'box scheme', w.revenue, 'sold');
      pay(c, 'top-up imports', w.importCost, 'purse');
      if (w.importCo2e > 1e-9 && c.graph.nodes[ATMOSPHERE]) c.flow({what: 'top-up imports', unit: 'kgCO2e', amount: qty(w.importCo2e, 'kgCO2e'), from: {boundary: 'bought'}, to: {node: ATMOSPHERE, stock: 'carbon'}});
      burn(c, n.id, 'diesel', w.round.litres, 'delivery round', PURSE);
      const l = ledgerOf(n), short = w.fill < 0.999;
      setLever(n, LEDGER, {
        weeks: l.weeks + 1, revenue: l.revenue + w.revenue, imports: l.imports + w.importCost, fuel: l.fuel + w.fuel,
        delivered: l.delivered + total(w.delivered) + total(w.imported), graded: l.graded + total(w.graded), spoiled: l.spoiled + total(w.road),
        shortWeeks: l.shortWeeks + (short ? 1 : 0), firstBox: l.firstBox ?? (total(w.delivered) > 0 ? c.hours : null), firstShort: l.firstShort ?? (short ? c.hours : null),
      } satisfies Ledger);
      setLever(n, SCHEME, step(s, w.fill));
    },
  },
  command(cmd) {
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && cmd.node === BOX_NODE && cmd.lever === LEDGER) return 'the scheme’s ledger is kept, not set';
    return undefined;
  },
};

/** The farm shop system: each morning the store restocks the shelf up to the `target` kg a group (graded to the shop's
 *  standard, the rest to the store's waste); each day customers come from the game's dice and buy; and the takings go to
 *  the purse. Unsold produce stays on the shelf, where the storage system ages it. Not yet listed in src/sim/systems.ts. */
export const farmShop: System = {
  name: 'farm shop',
  on: {
    day(c) {
      const n = c.graph.nodes[SHOP_NODE], store = c.graph.nodes[STORE], shop = shopOf(n);
      if (!n || !shop) return;
      const target = (n.levers.target as unknown as Kg | undefined) ?? noKg(), days = Math.max(1, Math.round(c.dt / 24));
      for (let i = 0; i < days; i++) {
        const date = calendar(c.hours - (days - 1 - i) * 24), have = stockOf(n);
        if (store) {
          const want = noKg(), from = stockOf(store), keep = keepingOf(n);
          for (const g of VEG) want[g] = Math.min(from.kg[g], Math.max(0, (target[g] - have.kg[g]) / (1 - GRADE[g][shop.standard])));
          const {graded} = restock({...shop, shelf: emptyStock()}, want);
          const life: Record<string, number> = {...(keep?.life ?? {})};
          for (const g of VEG) {
            const moved = take(c, store, g, want[g] - graded[g], 'restocking the shop', (p) => ({node: n.id, stock: `food.${p}`}));
            take(c, store, g, graded[g], 'graded out', {boundary: 'decay'}, store.id);
            // the shelf's produce is as old as the mean of what was there and what came in
            for (const p of PRODUCT_IDS) if (PRODUCTS[p].group === g && (n.stocks[`food.${p}`]?.amount ?? 0) > 0) life[p] = blendLife(have.kg[g], have.life[g], moved, from.life[g]);
          }
          if (keep) setLever(n, 'keeping', {...keep, life});
        }
        const {day} = serveDay({...shop, shelf: stockOf(n)}, date, c.rng);
        for (const g of VEG) take(c, n, g, day.sold[g], 'farm shop', {boundary: 'sold'});
        pay(c, 'farm shop', day.revenue, 'sold');
        const l = shopLedgerOf(n);
        setLever(n, LEDGER, {
          days: l.days + 1, customers: l.customers + day.customers, revenue: l.revenue + day.revenue, sold: l.sold + total(day.sold), unmet: l.unmet + total(day.unmet),
          firstSale: l.firstSale ?? (day.revenue > 0 ? c.hours : null),
        } satisfies ShopLedger);
      }
    },
  },
  command(cmd) {
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && cmd.node === SHOP_NODE && cmd.lever === LEDGER) return 'the shop’s ledger is kept, not set';
    return undefined;
  },
};
