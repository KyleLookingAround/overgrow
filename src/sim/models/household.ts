// The household economy: who lives in the household, their jobs, hours and wages, the weekly shop, what shop food carries
// in carbon, land and water, the purse, and the same baskets summed over many households (an allotment's neighbours, a
// box scheme's customers, a town's income deciles). Pure functions over the graph's typed quantities, and a `household`
// system that runs after the kitchen: the gardener does the weekly shop on the way home from work on their last working
// day, with the week's pay and the rest of life's spending, and the shop's food lands in the kitchen's cupboard.
// docs/systems/household.md says how it works.
//
// Sources: ONS Annual Survey of Hours and Earnings (about 37.5 paid hours and a median take-home of about £590 a week
//   for full-time work) and DfT's National Travel Survey (about half an hour each way to work); DEFRA Family Food (the
//   weekly basket by food group and its prices) and ONS Family Spending and "Effects of taxes and benefits on household
//   income" (what households of each income decile spend and have); Poore & Nemecek (2018, Science 360: farm-to-shop
//   carbon, land and water per kg, with transport a small share for most foods); Green et al. (2013, BMJ: own-price
//   elasticities of food demand); allotment societies (about six hours a week keeps a ten-rod plot).
// Simplifies: hours are averages by weekday, not a diary; a job is none, part-time or full-time, the pay by the hour at
//   work, with no overtime, sick days or holidays; the shop is one weekly basket bought at national average prices (a
//   decile's price and mix differ by a flat multiple), every group at once, what the garden gave last week less what's
//   still in the cupboard, with nothing bought in bulk or on offer and no waste at home (the kitchen counts that), and
//   no packaging; pay and the rest of life's spending move on the same day; a group's footprint is a global mean weighted to a UK basket, the same
//   every week; the household's other spending is one flat outgoing; nothing here is a chance, so it draws no dice.
//   Fast effect: the week's shop, wages and outgoings in the purse, and the hours the garden gets that day. Slow effect:
//   the household's diet footprint in carbon, land and water, and the time traded between the job and the garden.
import {
  AIR, BASKET, DAY, DECILES, ELASTICITY, FOOD_GROUPS, FOOTPRINT, GARDEN_SHARE, JOBS, MIX_HIGH, MIX_LOW, PLOT, PRICE,
  PRICE_PAID, REST_SPEND, SENSITIVITY, VEG, WAGE, type FoodGroup, type JobKind, type Role,
} from '../../data/household';
import {CROPS} from '../../data/crops';
import type {Group} from '../../data/crops';
import type {System, TickContext} from '../clock';
import {note} from '../effects';
import {qty, type Boundary, type Flow, type Graph, type GraphNode, type LeverValue, type NodeSpec, type Qty} from '../graph';
import {HOUSEHOLD, KITCHEN, kitchenAsk, ledgerOf, shopProduct} from './kitchen';

export {HOUSEHOLD, kitchenAsk};
/** Where the household's money is kept: the kitchen's purse, where the honesty box pays and the top bar shows. Moving it
 *  to the household node is this line and the state's `home`. */
export const PURSE = {node: KITCHEN, stock: 'money'} as const;

// ---- members and their hours ----

export interface Member {
  id: string;
  name: string;
  role: Role;
  job: JobKind;
  /** The work-or-help lever, 0–1: the share of the job's hours actually worked. 1 is all work, 0 is all help. */
  workShare: number;
}
export interface Household {
  members: Member[];
}

export const newMember = (id: string, name: string, role: Role, job: JobKind = 'none', workShare = 1): Member => ({id, name, role, job, workShare});
/** A new game's household: the gardener, in a full-time job. */
export const startHousehold = (): Household => ({members: [newMember('gardener', 'You', 'gardener', 'full')]});

export const isWeekend = (weekday: number) => weekday >= 5;
/** Hours at the workplace on a weekday (0 Monday to 6 Sunday), the work-or-help lever applied. */
export const workHours = (m: Member, weekday: number) => JOBS[m.job].hours[weekday]! * m.workShare;
/** The commute, both ways, on a day worked. */
export const commuteHours = (m: Member, weekday: number) => (workHours(m, weekday) > 0 ? JOBS[m.job].commute : 0);
/** Hours left after sleep, essentials, work and the commute. */
export const freeHours = (m: Member, weekday: number) => Math.max(0, DAY.waking - DAY.essentials - workHours(m, weekday) - commuteHours(m, weekday));
/** The hours a member gives the garden that day: their share of the free hours, the rest being the rest of life. */
export function gardenHours(m: Member, weekday: number): number {
  const share = GARDEN_SHARE[m.role];
  return freeHours(m, weekday) * (isWeekend(weekday) ? share.weekend : share.weekday);
}
/** The household's garden hours on a weekday, and by member. */
export const householdGardenHours = (h: Household, weekday: number) => h.members.reduce((s, m) => s + gardenHours(m, weekday), 0);
/** The garden hours of the week: five weekdays and a weekend. */
export const weekGardenHours = (h: Household) => [0, 1, 2, 3, 4, 5, 6].reduce((s, d) => s + householdGardenHours(h, d), 0);

/** Take-home pay for a day: the hours at work at the hourly rate. */
export const dayWage = (m: Member, weekday: number) => (workHours(m, weekday) * WAGE.fullWeek) / WAGE.fullHours;
/** Take-home pay for a week, £. */
export const weekWage = (m: Member) => [0, 1, 2, 3, 4, 5, 6].reduce((s, d) => s + dayWage(m, d), 0);
export const householdWage = (h: Household) => h.members.reduce((s, m) => s + weekWage(m), 0);

/** The day of the week (0 Monday) a member does the weekly shop on the way home: their last working day, or null if they
 *  don't work (the week's turn shops for them). */
export function shopDay(m: Member): number | null {
  for (let d = 6; d >= 0; d--) if (workHours(m, d) > 0) return d;
  return null;
}

/** When a member leaves through the gate and comes home, as hours of the day, or null on a day at home: what the map
 *  draws. They're away for the work and the commute. */
export function commute(m: Member, weekday: number): {leaves: number; returns: number} | null {
  const away = workHours(m, weekday);
  if (away <= 0) return null;
  const j = JOBS[m.job];
  return {leaves: j.depart, returns: j.depart + away + j.commute};
}

/** The work-or-help lever: the member's share of their job worked, kept between 0 and 1. Returns a new household. */
export const withWorkShare = (h: Household, id: string, workShare: number): Household => ({
  members: h.members.map((m) => (m.id === id ? {...m, workShare: Math.min(1, Math.max(0, workShare))} : m)),
});
/** Changes a member's job (part-time at the smallholding is the same lever as the gardener's). */
export const withJob = (h: Household, id: string, job: JobKind): Household => ({members: h.members.map((m) => (m.id === id ? {...m, job} : m))});
export const withMember = (h: Household, m: Member): Household => ({members: [...h.members, m]});

/** How kept an allotment plot is, 0–1, from the hours its household gives it in a week: the share of the hours it needs. */
export const keptness = (hoursPerWeek: number, m2: number = PLOT.m2) => Math.min(1, Math.max(0, hoursPerWeek / ((PLOT.hoursPerWeek * m2) / PLOT.m2)));
/** Hours a plot gets in a week from a household with `plots` plots to share them across. */
export const hoursPerPlot = (h: Household, plots = 1) => weekGardenHours(h) / Math.max(1, plots);

// ---- the weekly basket ----

export type Kg = Partial<Record<FoodGroup, number>>;
const sum = (o: Kg) => Object.values(o).reduce((s, v) => s + (v ?? 0), 0);
const kgOf = (o: Kg, g: FoodGroup) => o[g] ?? 0;

/** The week's basket for a household of `people`, kg by group. */
export function basket(people: number): Record<FoodGroup, number> {
  const out = {} as Record<FoodGroup, number>;
  for (const g of FOOD_GROUPS) out[g] = BASKET[g] * people;
  return out;
}
/** The number of people in a household. */
export const people = (h: Household) => h.members.length;

export interface Shop {
  /** What the household needs a week, kg by group, and what the garden met. */
  need: Record<FoodGroup, number>;
  met: Record<FoodGroup, number>;
  /** What the shop must supply, kg by group, and its total cost, £. */
  buy: Record<FoodGroup, number>;
  cost: number;
  /** The garden's kg at shop prices, £, up to what the household needed: groceries saved. */
  saved: number;
  /** What the garden grew beyond the week's need, kg: it goes to the honesty box, not the shop's tally. */
  spare: number;
}

/** The week's shop: what the garden supplied, kg by group, against what the household eats. A price index above 1 makes
 *  everything dearer. */
export function shop(need: Record<FoodGroup, number>, supplied: Kg, priceIndex = 1): Shop {
  const buy = {} as Record<FoodGroup, number>, met = {} as Record<FoodGroup, number>;
  let cost = 0, saved = 0, spare = 0;
  for (const g of FOOD_GROUPS) {
    met[g] = Math.min(need[g], kgOf(supplied, g));
    buy[g] = need[g] - met[g];
    spare += Math.max(0, kgOf(supplied, g) - need[g]);
    cost += buy[g] * PRICE[g] * priceIndex;
    saved += met[g] * PRICE[g] * priceIndex;
  }
  return {need, met, buy, cost, saved, spare};
}

/** What the shop actually sells the household: the week's shortfall less what's still in the cupboard, kg by group, at
 *  its cost. Groceries saved and the spare stay the garden's (from `shop`). */
export function restock(s: Shop, cupboard: Kg, priceIndex = 1): Shop {
  const buy = {} as Record<FoodGroup, number>;
  let cost = 0;
  for (const g of FOOD_GROUPS) {
    buy[g] = Math.max(0, s.buy[g] - kgOf(cupboard, g));
    cost += buy[g] * PRICE[g] * priceIndex;
  }
  return {...s, buy, cost};
}

// ---- the shop's footprint ----

export interface Footprint {
  /** kg CO₂e, m² a year of land, L of fresh water, and the part of the carbon that is transport. */
  carbon: number;
  land: number;
  water: number;
  transport: number;
  /** The carbon by group, kg CO₂e. */
  byGroup: Record<FoodGroup, number>;
}
/** What a group's kg carries from farm to shop: carbon (with air freight added), land, water, and the transport share. */
export function footprintOf(g: FoodGroup, kg: number) {
  const f = FOOTPRINT[g], air = f.air * kg * AIR;
  return {carbon: kg * f.co2e + air, land: kg * f.land, water: kg * f.water, transport: kg * f.co2e * f.transport + air};
}
/** A week's shop's footprint: what the kg bought carry, by group and in all. */
export function footprint(buy: Kg): Footprint {
  const out: Footprint = {carbon: 0, land: 0, water: 0, transport: 0, byGroup: {} as Record<FoodGroup, number>};
  for (const g of FOOD_GROUPS) {
    const f = footprintOf(g, kgOf(buy, g));
    out.byGroup[g] = f.carbon;
    out.carbon += f.carbon;
    out.land += f.land;
    out.water += f.water;
    out.transport += f.transport;
  }
  return out;
}
/** The share of a footprint's carbon that is transport, 0–1. */
export const transportShare = (f: Footprint) => (f.carbon > 0 ? f.transport / f.carbon : 0);

// ---- the purse ----

export interface Purse {
  /** £ a week: wages and sales in, the shop and the rest of life out, and what's left. */
  wages: number;
  sales: number;
  shop: number;
  rest: number;
  net: number;
}
/** The rest of life's flat outgoing for a household, £ a week. */
export const restSpend = (h: Household) => h.members.reduce((s, m) => s + REST_SPEND[m.role], 0);
/** A week's money: the player's money is the gardener's budget for the garden, so this is what the purse gains or loses. */
export function purse(h: Household, shopCost: number, sales = 0): Purse {
  const wages = householdWage(h), rest = restSpend(h);
  return {wages, sales, shop: shopCost, rest, net: wages + sales - shopCost - rest};
}

// ---- many households: allotment neighbours, box-scheme customers, a town's deciles ----

/** A decile's basket differs from the average by a multiple in proportion between the lowest and the highest. */
const along = (i: number) => i / (DECILES.length - 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface Demand {
  /** kg a week by group, the £ spent on it, and the households' weekly income, £. */
  kg: Record<FoodGroup, number>;
  spend: number;
  income: number;
  /** spend over income, 0–1. */
  share: number;
}
/**
 * The weekly demand of `n` households of a decile (0 the lowest to 9 the highest) at a price index (one for all groups,
 * or by group): the basket, scaled by the decile's mix and its people, moved by the price along a constant own-price
 * elasticity that's larger for the poorer deciles. Linear in n: N households demand N times one.
 */
export function demand(decile: number, n: number, price: number | Kg = 1): Demand {
  const i = Math.min(DECILES.length - 1, Math.max(0, Math.round(decile))), d = DECILES[i]!, t = along(i);
  const kg = {} as Record<FoodGroup, number>;
  let spend = 0;
  for (const g of FOOD_GROUPS) {
    const p = typeof price === 'number' ? price : (price[g] ?? 1);
    const e = ELASTICITY[g] * lerp(SENSITIVITY.low, SENSITIVITY.high, t);
    const mix = lerp(MIX_LOW[g], MIX_HIGH[g], t);
    kg[g] = n * d.people * BASKET[g] * mix * p ** e;
    spend += kg[g] * PRICE[g] * lerp(PRICE_PAID.low, PRICE_PAID.high, t) * p;
  }
  const income = (n * d.income * 1000) / 52;
  return {kg, spend, income, share: spend / income};
}
/** A town's demand: the households of each decile (`counts[0]` the lowest), summed. */
export function townDemand(counts: readonly number[], price: number | Kg = 1): Demand {
  const out: Demand = {kg: Object.fromEntries(FOOD_GROUPS.map((g) => [g, 0])) as Record<FoodGroup, number>, spend: 0, income: 0, share: 0};
  counts.forEach((n, i) => {
    if (n <= 0) return;
    const d = demand(i, n, price);
    for (const g of FOOD_GROUPS) out.kg[g] += d.kg[g];
    out.spend += d.spend;
    out.income += d.income;
  });
  out.share = out.income > 0 ? out.spend / out.income : 0;
  return out;
}

// ---- flows and the system ----

/** The boundaries a household's flows cross (`Boundary` in src/sim/graph.ts has them): the employer, the shop and the
 *  rest of the household's life. */
export type HBoundary = Boundary;
type HEnd = {node: string; stock: string} | {boundary: HBoundary};
export interface HFlow<U extends Flow['unit'] = Flow['unit']> extends Omit<Flow<U>, 'from' | 'to'> {
  from: HEnd;
  to: HEnd;
}

/** The flows a week moves: wages in, the shop and the rest of life out of the purse, and the shop food's carbon, land and
 *  water carried in to the household node's footprint stocks, never to the air. The food itself is `shopFood`'s. */
export function weekFlows(h: Household, s: Shop, fp: Footprint, node: string = HOUSEHOLD): HFlow[] {
  const out: HFlow[] = [];
  const money = (what: string, amount: number, from: HEnd, to: HEnd) => {
    if (amount > 1e-9) out.push({what, unit: 'GBP', amount: qty(amount, 'GBP'), from, to});
  };
  money('wages', householdWage(h), {boundary: 'wages'}, PURSE);
  money('the weekly shop', s.cost, PURSE, {boundary: 'shop'});
  money('the rest of life', restSpend(h), PURSE, {boundary: 'rest of life'});
  const carried = (what: string, unit: 'kgCO2e' | 'm2' | 'L', amount: number, stock: string) => {
    if (amount > 1e-9) out.push({what, unit, amount: amount as Qty<typeof unit>, from: {boundary: 'shop'}, to: {node, stock}});
  };
  carried('shop food carbon', 'kgCO2e', fp.carbon, 'carbon');
  carried('shop food land', 'm2', fp.land, 'footprint.land');
  carried('shop food water', 'L', fp.water, 'footprint.water');
  return out;
}
/** The shop's food into the kitchen's cupboard, a stock by group. */
export function shopFood(s: Shop, kitchen: string = KITCHEN): Flow[] {
  const out: Flow[] = [];
  for (const g of FOOD_GROUPS) {
    const kg = s.buy[g], product = shopProduct(g);
    if (kg > 1e-9) out.push({what: 'shop food', unit: 'kgFood', product, amount: qty(kg, 'kgFood'), from: {boundary: 'shop'}, to: {node: kitchen, stock: `food.${product}`}});
  }
  return out;
}
/** What's in a kitchen's cupboard from the shop, kg by group. */
export function cupboardIn(k: GraphNode | undefined): Kg {
  const out: Kg = {};
  for (const f of FOOD_GROUPS) out[f] = k?.stocks[`food.${shopProduct(f)}`]?.amount ?? 0;
  return out;
}
export const cupboardOf = (g: Graph) => cupboardIn(g.nodes[KITCHEN]);
/** Days of food in the cupboard: its kg over what the household eats a day (the basket's rate), from a snapshot's nodes. */
export function cupboardDays(nodes: readonly GraphNode[]): number {
  const h = membersIn(nodes.find((n) => n.id === HOUSEHOLD));
  return sum(cupboardIn(nodes.find((n) => n.id === KITCHEN))) / Math.max(1e-9, sum(basket(people(h))) / 7);
}

/** The household's running account, kept as its `ledger` lever and replaced, never changed in place. */
export interface HouseholdLedger {
  /** The day index of the last day counted, and the kg the garden supplied since the last shop, by group. */
  day: number;
  supplied: Kg;
  /** Since the start: £ in wages, spent in the shop, spent on the rest of life, and groceries saved; kg bought; carbon,
   *  land and water the shop carried. */
  wages: number;
  shopped: number;
  rest: number;
  saved: number;
  bought: number;
  carbon: number;
  land: number;
  water: number;
  /** Game hours of the first wage and the first shop, or null (the bot's milestones), and of the last shop. */
  firstWage: number | null;
  firstShop: number | null;
  lastShop: number | null;
  /** The last week's shop, for the kitchen's panel: £ spent, groceries saved, kg bought, its carbon and the share of it
   *  that's transport, and the week's pay and rest of life. */
  week: {cost: number; saved: number; kg: number; carbon: number; transport: number; wages: number; rest: number} | null;
}
export const newHouseholdLedger = (): HouseholdLedger => ({
  day: -1, supplied: {}, wages: 0, shopped: 0, rest: 0, saved: 0, bought: 0, carbon: 0, land: 0, water: 0, firstWage: null, firstShop: null,
  lastShop: null, week: null,
});
/** A household node's members (a new game's household without one). */
export const membersIn = (n: GraphNode | undefined): Household => ({members: ((n?.levers.members as unknown as Member[] | undefined) ?? startHousehold().members)});
export const membersOf = (g: Graph): Household => membersIn(g.nodes[HOUSEHOLD]);
export const householdLedgerIn = (n: GraphNode | undefined): HouseholdLedger => (n?.levers.ledger as unknown as HouseholdLedger | undefined) ?? newHouseholdLedger();
export const householdLedgerOf = (g: Graph): HouseholdLedger => householdLedgerIn(g.nodes[HOUSEHOLD]);

/** Each day: counts what the last meal ate of the garden's produce, by food group. */
function tally(c: TickContext, node: NonNullable<Graph['nodes'][string]>) {
  const k = ledgerOf(c.graph), l = householdLedgerOf(c.graph);
  if (k.day <= l.day) return;
  const supplied: Kg = {...l.supplied};
  for (const [product, kg] of Object.entries(k.ate)) {
    const crop = CROPS[product as keyof typeof CROPS];
    if (crop?.group) supplied[crop.group] = kgOf(supplied, crop.group) + kg;
  }
  node.levers.ledger = {...l, day: k.day, supplied} as unknown as LeverValue;
}

/** The week's shop, pay and the rest of life, and the footprint the shop carried: the week's basket less what the garden
 *  gave since the last shop and what's still in the cupboard, its food into the kitchen. The gardener does it on the way
 *  home on their last working day (src/sim/gardener.ts); the week's turn does it for a household that didn't. */
export function weeklyShop(c: TickContext) {
  const node = c.graph.nodes[HOUSEHOLD];
  if (!node || !('ledger' in node.levers)) return;
  const h = membersOf(c.graph), l = householdLedgerOf(c.graph);
  const s = restock(shop(basket(people(h)), l.supplied), cupboardOf(c.graph)), fp = footprint(s.buy), wages = householdWage(h), rest = restSpend(h);
  for (const f of weekFlows(h, s, fp, node.id)) c.flow(f as Flow);
  for (const f of shopFood(s)) c.flow(f);
  // the garden's share of the week's veg at the shop's prices: the groceries it saved
  if (s.saved > 0.005) note(c, 'groceries saved', KITCHEN, s.saved, 'GBP');
  node.levers.ledger = {
    ...l, supplied: {}, wages: l.wages + wages, shopped: l.shopped + s.cost, rest: l.rest + rest, saved: l.saved + s.saved,
    bought: l.bought + sum(s.buy), carbon: l.carbon + fp.carbon, land: l.land + fp.land, water: l.water + fp.water,
    firstWage: l.firstWage ?? (wages > 0 ? c.hours : null), firstShop: l.firstShop ?? c.hours, lastShop: c.hours,
    week: {cost: s.cost, saved: s.saved, kg: sum(s.buy), carbon: fp.carbon, transport: transportShare(fp), wages, rest},
  } as unknown as LeverValue;
}

/** About what this week's shop will carry home, kg, from what the garden has given and the cupboard holds now: the
 *  bags the gardener is drawn with. */
export function shopEstimate(g: Graph): number {
  const s = restock(shop(basket(people(membersOf(g))), householdLedgerOf(g).supplied), cupboardOf(g));
  return sum(s.buy);
}

/** A new game's household node beside the garden: the gardener alone in a full-time job, the ledger, and the shop food's
 *  footprint stocks beside the carbon every node has. No box: the house is the kitchen's strip on the map. */
export function householdNode(): NodeSpec {
  return {
    id: HOUSEHOLD, kind: 'household', name: 'The household', box: null, land: {built: 0},
    stocks: {'footprint.land': {unit: 'm2', amount: qty(0, 'm2')}, 'footprint.water': {unit: 'L', amount: qty(0, 'L')}},
    levers: {members: startHousehold().members as unknown as LeverValue, ledger: newHouseholdLedger() as unknown as LeverValue},
  };
}
/** The cupboard a new game starts with: a week's basket, bought last week, kg by group. */
export const startCupboard = (h: Household = startHousehold()) => basket(people(h));

export const household: System = {
  name: 'household',
  on: {
    day(c) {
      const n = c.graph.nodes[HOUSEHOLD];
      if (n && 'ledger' in n.levers) tally(c, n);
    },
    week(c) {
      // a week gone by with no shop (nobody worked its last day): shop now
      const n = c.graph.nodes[HOUSEHOLD], last = householdLedgerOf(c.graph).lastShop;
      if (n && 'ledger' in n.levers && (last === null || c.hours - last > 6 * 24)) weeklyShop(c);
    },
  },
  command(cmd) {
    if ((cmd.type !== 'plan' && cmd.type !== 'policy' && cmd.type !== 'law') || cmd.node !== HOUSEHOLD) return undefined;
    if (cmd.lever === 'ledger') return 'the household’s ledger is kept, not set';
    // the job's hours are fixed until part-time at the smallholding, and the partner moves in at part 10
    if (cmd.lever === 'members') return 'the household’s jobs are fixed for now';
    return undefined;
  },
};
