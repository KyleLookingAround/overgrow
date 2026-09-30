// The carry-over rule's maths, pure: a small history a level keeps and the five headline numbers taken from it, a sealed
// node's tick, an event shown at any level, inflating's target and layout key, and the step-up offer's test. docs/systems/ladder.md
// says how it works and how part 7 wires it. It is a rule of the game, not a real-world model, so it has no sources; each
// part says which section of the founding spec (docs/specs/overgrow.md) it implements:
//   History, record(), windowTotals(), reliability(), healthIndex()  "The carry-over rule", Sealing: the totals over the last full cycle
//   sumTotals(), wildlifeIndex(), sampleOf()                         "The carry-over rule", Sealing, as the owner's answers on #29 (Q2, Q3, Q6) set it:
//                                                                    demand and hours in the totals, Output by product group, wildlife in Health, a parent summed from its children
//   sealNode(), sealedTick(), healthFactor(), sealedSystem           "The carry-over rule", Sealing: a sealed node keeps running by its totals
//   showEvent(), eventKgLost(), eventValueLost(), eventFactor()      "The carry-over rule", How events cross scales (and the insurance hook: the £ beside the kg)
//   inflateTarget(), carryCheck(), layoutKey()                       "The carry-over rule", Inflating
//   stepUpStatus()                                                   "The first playable slice", What makes the jump feel earned (and win W18); its window is
//                                                                    the level's last full rhythm cycle (#29 Q15), the garden's a full year
// Fast effect: a sealed node's output each tick, lumpy by its Reliability. Slow effect: its Health drifting toward the plan.
import {
  HEALTH_DRIFT_PER_SEASON, HEALTH_FLOOR, HEALTH_PARTS, HEALTH_PENALTY, HEALTH_WEIGHTS, INFLATE_FLOOR, INFLATE_TOLERANCE, PRODUCT_GROUPS, RHYTHMS,
  SEASON_DAYS, STEP_UP, STEP_UP_HINTS, WILDLIFE_PARTS, WILDLIFE_WEIGHTS, type HealthPart, type ProductGroup, type Requirement, type Rhythm,
  type StepUpRules, type WildlifePart,
} from '../data/ladder-rules';
import {LEVELS} from '../data/ladder';
import type {System, TickContext} from './clock';
import {emptyTotals, qty, type LandUse, type LeverValue, type Qty, type Totals} from './graph';
import {rng as makeRng, type Rng} from './random';
import {ATMOSPHERE} from './state';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const DAY_HOURS = 24;

// ---- what a level carries beside the five numbers (#29 Q2, Q3) ----

/** An amount by product group, kg unless said (a group left out is none). */
export type ByGroup = Partial<Record<ProductGroup, number>>;

/** What a level's people want: kg by product group, and the £ they spend on it. */
export interface Demand {
  kg: ByGroup;
  spend: number;
}

/** The people-hours a level had and the ones it used. */
export interface Hours {
  had: number;
  used: number;
}

/**
 * The graph's `Totals` with what the sealing maths adds (the owner's answers on #29, Q2 and Q3): Output by product
 * group (kg a day, adding up to `output`), demand (kg a day by group and £ a day spent) and hours (people-hours a day had
 * and used). They're optional, so a level that has none (the garden's first sample) carries none. `graph.ts` has no
 * change: a node's `totals` takes this as it is, and part 7 may hoist the fields into `Totals` itself.
 */
export interface LadderTotals extends Totals {
  outputByGroup?: ByGroup;
  demand?: Demand;
  hours?: Hours;
}

const sumOf = (g: ByGroup) => {
  let s = 0;
  for (const k in g) s += g[k as ProductGroup] ?? 0;
  return s;
};
const addTo = (into: ByGroup, g: ByGroup, k = 1) => {
  for (const key in g) into[key as ProductGroup] = (into[key as ProductGroup] ?? 0) + (g[key as ProductGroup] ?? 0) * k;
};
const copyExtras = (t: LadderTotals): LadderTotals => {
  const out: LadderTotals = {...t, land: {...t.land}};
  if (t.outputByGroup) out.outputByGroup = {...t.outputByGroup};
  if (t.demand) out.demand = {kg: {...t.demand.kg}, spend: t.demand.spend};
  if (t.hours) out.hours = {...t.hours};
  return out;
};

// ---- the history a level keeps, and the totals taken from it ----

/** What a level samples each day (or each tick of a level that ticks slower): the amounts over the sample, never detail. */
export interface Sample {
  /** Food delivered over the sample, kg. */
  output: Qty<'kgFood'>;
  /** How good it was, 0–100. Weighted by output when the samples are combined. */
  quality: number;
  /** What running the level cost over the sample, £. */
  upkeep: Qty<'GBP'>;
  /** Emissions less sinks over the sample, kg CO₂e (a sink is negative). */
  carbon: Qty<'kgCO2e'>;
  /** Output-weighted shelf life in days, from the town up. */
  freshness?: number;
  /** The slow stocks behind Health as they stand, each 0–100; a level records the ones it has (wildlife from `wildlifeIndex()`). */
  health: Partial<Record<HealthPart, number>>;
  /** Food delivered over the sample by product group, kg: `sampleOf()` makes `output` their sum. */
  groups?: ByGroup;
  /** What the level's people wanted over the sample: kg by group, and £ spent. */
  demand?: Demand;
  /** The people-hours the level had and used over the sample. */
  hours?: Hours;
}

/** A sample from the output by group: `output` is their sum, so the headline and the mix can't disagree. */
export function sampleOf(groups: ByGroup, rest: Omit<Sample, 'output' | 'groups'>): Sample {
  return {...rest, output: qty(sumOf(groups), 'kgFood'), groups: {...groups}};
}

/**
 * The ring: the last full cycle of samples, oldest first, capped at the window (a year of weeks for the garden and the allotment, days from level 3, and a year of
 * weeks at level 7), so it's about thirty numbers a sample and never the level's detail. Saved state (plain JSON).
 */
export interface History {
  level: number;
  /** Game days each sample spans. */
  sampleDays: number;
  /** The most samples kept: the window over the sample. */
  cap: number;
  samples: Sample[];
  /** The land by use as it stands now, m². */
  land: Partial<Record<LandUse, number>>;
}

export const rhythmOf = (level: number): Rhythm => RHYTHMS[clamp(level, 1, RHYTHMS.length) - 1]!;

export function emptyHistory(level: number): History {
  const r = rhythmOf(level);
  return {level, sampleDays: r.sampleDays, cap: Math.ceil(r.windowDays / r.sampleDays - 1e-9), samples: [], land: {}};
}

/** The ring with a new sample on the end (and the land as it stands), the oldest dropped past the cap. A new object. */
export function record(h: History, sample: Sample, land: History['land'] = h.land): History {
  const samples = h.samples.length >= h.cap ? [...h.samples.slice(h.samples.length - h.cap + 1), sample] : [...h.samples, sample];
  return {...h, samples, land: {...land}};
}

/** 100 × (1 − the coefficient of variation) of a series (population standard deviation over its mean), clamped 0–100. */
export function reliability(series: readonly number[]): number {
  const n = series.length;
  if (!n) return 0;
  let sum = 0;
  for (const x of series) sum += x;
  const mean = sum / n;
  if (mean <= 0) return 0;
  let ss = 0;
  for (const x of series) ss += (x - mean) ** 2;
  return clamp(100 * (1 - Math.sqrt(ss / n) / mean), 0, 100);
}

/** The wildlife part of Health: flowers, hedges and margins as one index, their weighted mean over the ones given (0 when none: a level with no wildlife leaves `health.wildlife` out rather than recording that 0). */
export function wildlifeIndex(parts: Partial<Record<WildlifePart, number>>): number {
  let sum = 0, w = 0;
  for (const p of WILDLIFE_PARTS) {
    const v = parts[p];
    if (v === undefined) continue;
    sum += WILDLIFE_WEIGHTS[p] * clamp(v, 0, 100);
    w += WILDLIFE_WEIGHTS[p];
  }
  return w ? sum / w : 0;
}

/** The Health index from the slow stocks: their weighted mean over the parts given (0 when there are none). */
export function healthIndex(parts: Sample['health']): number {
  let sum = 0, w = 0;
  for (const p of HEALTH_PARTS) {
    const v = parts[p];
    if (v === undefined) continue;
    sum += HEALTH_WEIGHTS[p] * clamp(v, 0, 100);
    w += HEALTH_WEIGHTS[p];
  }
  return w ? sum / w : 0;
}

/** Reliability as a per-day figure: a sample of several days is already averaged, so its spread is scaled up by the square root of its days. */
const perDayReliability = (perDay: readonly number[], sampleDays: number) => clamp(100 - (100 - reliability(perDay)) * Math.sqrt(sampleDays), 0, 100);

const scaled = (g: ByGroup, k: number): ByGroup => {
  const out: ByGroup = {};
  addTo(out, g, k);
  return out;
};

export interface WindowTotals {
  totals: LadderTotals;
  /** Game days the samples cover. */
  days: number;
  /** The window is full: the last whole cycle is in the ring. */
  full: boolean;
}

/**
 * The five headline numbers, the carbon and the land over the ring (null while it's empty). Output, Upkeep and carbon
 * are per-day means; Quality and Freshness are weighted by output; Reliability is over the series of samples, restated per day (a weekly sample's spread scaled up by √7); Health is the
 * index at the end of the window (it's a stock, not a flow); land is as it stands.
 */
export function windowTotals(h: History): WindowTotals | null {
  const n = h.samples.length;
  if (!n) return null;
  const d = h.sampleDays;
  const perDay: number[] = [];
  let out = 0, up = 0, co2 = 0, q = 0, fr = 0, spend = 0, had = 0, used = 0;
  const groups: ByGroup = {}, want: ByGroup = {};
  let anyGroups = false, anyDemand = false, anyHours = false;
  for (const s of h.samples) {
    out += s.output;
    up += s.upkeep;
    co2 += s.carbon;
    q += s.quality * s.output;
    fr += (s.freshness ?? 0) * s.output;
    perDay.push(s.output / d);
    if (s.groups) (anyGroups = true), addTo(groups, s.groups);
    if (s.demand) (anyDemand = true), addTo(want, s.demand.kg), (spend += s.demand.spend);
    if (s.hours) (anyHours = true), (had += s.hours.had), (used += s.hours.used);
  }
  const days = n * d;
  const totals: LadderTotals = {
    output: out / days, quality: out > 0 ? q / out : 0, reliability: perDayReliability(perDay, d), upkeep: up / days,
    health: healthIndex(h.samples[n - 1]!.health), freshness: out > 0 ? fr / out : 0, carbon: co2 / days, land: {...h.land},
  };
  if (anyGroups) totals.outputByGroup = scaled(groups, 1 / days);
  if (anyDemand) totals.demand = {kg: scaled(want, 1 / days), spend: spend / days};
  if (anyHours) totals.hours = {had: had / days, used: used / days};
  return {totals, days, full: n >= h.cap};
}

/** A sealed child for `sumTotals()`: its totals, and optionally its series of output a day over the window (from its history). */
export interface SumChild {
  totals: LadderTotals;
  series?: readonly number[];
}

/**
 * A parent's totals from its sealed children, for level 3 up (a field of plots, a town of households, a region of farms).
 * Output, demand (by group and £), hours, upkeep, carbon and land add; Quality, Freshness and Health are weighted by
 * output (a plain mean when nothing is delivered); Reliability is that of the summed series when every child brings its
 * series over the same window, and otherwise from the children's spreads taken as independent (their variances add, so
 * a hundred lumpy farms are steadier together than any one), so a parent of many is steadier than its parts. The parent's
 * groups add up to its Output when its children's do.
 */
export function sumTotals(children: readonly SumChild[]): LadderTotals {
  const out = {...emptyTotals()} as LadderTotals;
  if (!children.length) return out;
  let q = 0, fr = 0, hp = 0, var2 = 0, spend = 0, had = 0, used = 0, hp0 = 0;
  const groups: ByGroup = {}, want: ByGroup = {};
  let anyGroups = false, anyDemand = false, anyHours = false;
  for (const {totals: t} of children) {
    out.output += t.output;
    out.upkeep += t.upkeep;
    out.carbon += t.carbon;
    q += t.quality * t.output;
    fr += t.freshness * t.output;
    hp += t.health * t.output;
    hp0 += t.health;
    var2 += (((100 - clamp(t.reliability, 0, 100)) / 100) * t.output) ** 2;
    for (const [u, m2] of Object.entries(t.land) as [LandUse, number][]) out.land[u] = (out.land[u] ?? 0) + m2;
    if (t.outputByGroup) (anyGroups = true), addTo(groups, t.outputByGroup);
    if (t.demand) (anyDemand = true), addTo(want, t.demand.kg), (spend += t.demand.spend);
    if (t.hours) (anyHours = true), (had += t.hours.had), (used += t.hours.used);
  }
  const o = out.output;
  out.quality = o > 0 ? q / o : 0;
  out.freshness = o > 0 ? fr / o : 0;
  out.health = o > 0 ? hp / o : hp0 / children.length;
  const n = children[0]!.series?.length ?? 0;
  if (n > 0 && children.every((c) => c.series?.length === n)) {
    const sum = Array.from({length: n}, (_, i) => children.reduce((s, c) => s + c.series![i]!, 0));
    out.reliability = reliability(sum);
  } else out.reliability = o > 0 ? clamp(100 * (1 - Math.sqrt(var2) / o), 0, 100) : 0;
  if (anyGroups) out.outputByGroup = groups;
  if (anyDemand) out.demand = {kg: want, spend};
  if (anyHours) out.hours = {had, used};
  return out;
}

// ---- a sealed node's tick ----

/** What the player last set for a sealed node: the Health it drifts to, and optionally the carbon and land it follows. */
export interface SealPlan {
  health: number;
  /** kg a day the node's Output runs at before Health, events and luck; the sealed figure if left out (the allotment's mix and feed, part 7). */
  output?: number;
  /** kg a day by product group, adding up to `output`; the sealed mix if left out. */
  mix?: ByGroup;
  /** £ a day it costs; the sealed figure if left out. */
  upkeep?: number;
  /** kg CO₂e a day the node emits less sinks; the sealed figure if left out. */
  carbon?: number;
  /** m² by use; the sealed land if left out. */
  land?: Partial<Record<LandUse, number>>;
}

/**
 * An event on a node ("How events cross scales"): where it's hands-on, the share of the node's output it destroys while
 * it lasts (its size), and when. Times are game hours, like the clock.
 */
export interface GameEvent {
  id: string;
  /** What it is ('pests', 'drought'): the tile's icon and the region's tint are picked by it. */
  kind: string;
  /** Said in the region's line: "pest year". */
  label: string;
  /** What it hits, for the region's line ("veg"). */
  product?: string;
  /** Where, for the region's line ("the east"): invented places only. */
  place?: string;
  /** The level where it's hands-on, 1 to 8. */
  homeLevel: number;
  /** The share of the node's output it destroys over its duration, 0–1. */
  size: number;
  /** Game hours the event starts. */
  from: number;
  /** How long it lasts, in game days. */
  days: number;
}

/** A node sealed into the level above: its totals, its plan and its events. Saved state (plain JSON). */
export interface SealedNode {
  totals: LadderTotals;
  plan: SealPlan;
  events: GameEvent[];
  /** Game hours it was last ticked (or sealed). */
  at: number;
}

/** Seals a level's totals into a node at a game hour, with the plan starting where the node stands. */
export function sealNode(totals: LadderTotals, hours: number, plan?: Partial<SealPlan>): SealedNode {
  return {totals: copyExtras(totals), plan: {...plan, health: plan?.health ?? totals.health}, events: [], at: hours};
}

/** What a point of Health below 50 costs: 1 % of Output each, down to nothing. */
export const healthFactor = (health: number) => Math.max(0, 1 - HEALTH_PENALTY * Math.max(0, HEALTH_FLOOR - health));

/**
 * The share of output that survives the events over a stretch of game hours: each event takes its size for the hours of
 * it that fall inside, so a stretch of any length loses the same kg as the event does over its whole duration.
 */
export function eventFactor(events: readonly GameEvent[], from: number, to: number): number {
  if (to <= from) return 1;
  let f = 1;
  for (const e of events) {
    const overlap = Math.min(to, e.from + e.days * DAY_HOURS) - Math.max(from, e.from);
    if (overlap > 0) f *= 1 - clamp(e.size, 0, 1) * (overlap / (to - from));
  }
  return f;
}

/**
 * A multiplier with mean 1 and coefficient of variation `cv`, from two draws of `rng` (always two, so the stream doesn't
 * depend on the node): lognormal, so output never goes negative however lumpy the node. "1 + noise" of the spec is this.
 */
function noiseFactor(rng: Rng, cv: number): number {
  const u = Math.max(rng.next(), 1e-12), v = rng.next();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  const s2 = Math.log(1 + cv * cv);
  return Math.exp(Math.sqrt(s2) * z - s2 / 2);
}

export interface SealedTick {
  /** The node after the tick. */
  node: SealedNode;
  /** Food delivered over the tick, kg. */
  output: Qty<'kgFood'>;
  /** Food the events destroyed over the tick, kg (for the tile's "Output −20 %"). */
  lost: Qty<'kgFood'>;
  /** Output and the loss by product group, kg, in the node's own mix (empty for a node sealed without one): the groups add up to `output` and `lost`. */
  byGroup: ByGroup;
  lostByGroup: ByGroup;
  /** What the loss was worth, £, at the prices given (0 without them): the insurance hook. */
  lostGBP: number;
  /** Upkeep paid over the tick, £. */
  upkeep: Qty<'GBP'>;
  /** Emissions less sinks over the tick, kg CO₂e: positive is emitted, negative stored. */
  carbon: Qty<'kgCO2e'>;
}

/**
 * One tick of a sealed node, up to game hour `hours`: output = Output × event modifiers × Health's factor × (1 + noise),
 * the noise mean zero with a spread of (100 − Reliability) % a day (over a tick of several days it averages down by the
 * square root of them, so a week isn't as lumpy as a day); Health drifting toward the plan by at most a point a season;
 * upkeep paid; emissions and land following the plan. Nothing inside is simulated in detail.
 */
export function sealedTick(node: SealedNode, hours: number, rng: Rng, price?: number | ByGroup): SealedTick {
  const days = (hours - node.at) / DAY_HOURS;
  const t = node.totals;
  if (days <= 0) return {node, output: qty(0, 'kgFood'), lost: qty(0, 'kgFood'), upkeep: qty(0, 'GBP'), carbon: qty(0, 'kgCO2e'), byGroup: {}, lostByGroup: {}, lostGBP: 0};
  const step = (HEALTH_DRIFT_PER_SEASON * days) / SEASON_DAYS;
  const health = clamp(node.plan.health, 0, 100) - t.health;
  const drifted = t.health + clamp(health, -step, step);
  const cv = (100 - clamp(t.reliability, 0, 100)) / 100 / Math.sqrt(days);
  const events = eventFactor(node.events, node.at, hours);
  const rate = node.plan.output ?? t.output, upkeep = node.plan.upkeep ?? t.upkeep, planned = node.plan.mix ?? t.outputByGroup;
  const base = rate * days * healthFactor(drifted) * noiseFactor(rng, cv);
  const carbon = node.plan.carbon ?? t.carbon;
  const totals: LadderTotals = {...t, output: rate, upkeep, health: drifted, carbon, land: {...(node.plan.land ?? t.land)}};
  if (planned) totals.outputByGroup = {...planned};
  const next: SealedNode = {
    totals,
    plan: node.plan,
    events: node.events.filter((e) => e.from + e.days * DAY_HOURS > hours),
    at: hours,
  };
  const mix = planned, total = mix ? sumOf(mix) : 0;
  const byGroup = total > 0 ? scaled(mix!, (base * events) / total) : {}, lostByGroup = total > 0 ? scaled(mix!, (base * (1 - events)) / total) : {};
  const lost = base * (1 - events);
  const lostGBP = typeof price === 'number' ? lost * price : PRODUCT_GROUPS.reduce((s, g) => s + (lostByGroup[g] ?? 0) * (price?.[g] ?? 0), 0);
  return {
    node: next, output: qty(base * events, 'kgFood'), lost: qty(lost, 'kgFood'), upkeep: qty(upkeep * days, 'GBP'), carbon: qty(carbon * days, 'kgCO2e'),
    byGroup, lostByGroup, lostGBP,
  };
}

/**
 * The lever a sealed node keeps its `SealedNode` under, and the stocks the system below moves: the food it delivers
 * (product 'produce', from the `growth` boundary) and the money its upkeep is paid from, if the node has a `money` stock.
 * docs/systems/ladder.md says what the wiring part adds.
 */
export const SEALED = {lever: 'sealed', food: 'food', product: 'produce', money: 'money', payer: 'payer'} as const;

/** Runs every sealed node on the graph on the day tick; part 7 lists it in src/sim/systems.ts with one line. */
export const sealedSystem: System = {
  name: 'sealed',
  on: {
    day(ctx: TickContext) {
      for (const n of Object.values(ctx.graph.nodes)) {
        const sealed = n.levers[SEALED.lever] as unknown as SealedNode | null | undefined;
        if (!sealed || typeof sealed !== 'object') continue;
        const r = sealedTick(sealed, ctx.hours, ctx.rng);
        if (r.output > 0) ctx.flow({what: 'harvest', unit: 'kgFood', product: SEALED.product, amount: r.output, from: {boundary: 'growth'}, to: {node: n.id, stock: SEALED.food}});
        // upkeep comes from the node's own money, or from the node its `payer` lever names (the player's household), while
        // there's enough to pay it
        const payer = typeof n.levers[SEALED.payer] === 'string' ? (n.levers[SEALED.payer] as string) : n.id;
        if (r.upkeep > 0 && (ctx.graph.nodes[payer]?.stocks[SEALED.money]?.amount ?? 0) >= r.upkeep) ctx.flow({what: 'upkeep', unit: 'GBP', amount: r.upkeep, from: {node: payer, stock: SEALED.money}, to: {boundary: 'bought'}});
        if (r.carbon > 0) ctx.flow({what: 'emissions', unit: 'kgCO2e', amount: r.carbon, from: {boundary: 'bought'}, to: {node: ATMOSPHERE, stock: 'carbon'}});
        else if (r.carbon < 0) ctx.flow({what: 'sink', unit: 'kgCO2e', amount: qty(-r.carbon, 'kgCO2e'), from: {node: ATMOSPHERE, stock: 'carbon'}, to: {node: n.id, stock: 'carbon'}});
        n.levers[SEALED.lever] = r.node as unknown as LeverValue;
        n.totals = r.node.totals;
      }
    },
  },
};

// ---- events across scales ----

/** Game days one step of a level's sim spans: an hour at levels 1 and 2, a day at 3 to 5, a week at 6 and 7. */
export const tickDays = (level: number) => LEVELS[clamp(level, 1, LEVELS.length) - 1]!.stepHours / DAY_HOURS;

/** How an event shows: the thing itself, the node's tile, or a regional tint and one line. Data for the UI to read. */
export interface ShownEvent {
  mode: 'thing' | 'tile' | 'region';
  event: GameEvent;
  /** The share of output it destroys per day shown, over `days`; scaled down when the duration was rounded up. */
  size: number;
  /** The days shown: the event's, or one tick of the showing level if that's longer. */
  days: number;
  /** The tile's or the region's line: "Output −20 % for 10 days", "pest year in the east: veg −5 %". The thing has none. */
  text: string;
  /** The region's tint by event kind (the event's kind); empty otherwise. */
  tint: string;
}

const pct = (size: number) => Math.max(1, Math.round(size * 100));
const daysText = (d: number) => (Math.round(d) === 1 ? '1 day' : `${Math.max(1, Math.round(d))} days`);

/**
 * An event as a level shows it, or null below its home level. At its home level it's the thing itself; one level up the
 * node's tile; two or more up a regional tint, whose size is the node's share of the region's output (pass both outputs).
 * A duration shorter than a tick of the showing level rounds up to a tick, the size scaled down so the kg stay the same.
 */
export function showEvent(event: GameEvent, showingLevel: number, out?: {node: number; region: number}): ShownEvent | null {
  const up = showingLevel - event.homeLevel;
  if (up < 0) return null;
  const days = Math.max(event.days, tickDays(showingLevel));
  let size = (event.size * event.days) / days;
  if (up >= 2 && out && out.region > 0) size *= out.node / out.region;
  const mode = up === 0 ? 'thing' : up === 1 ? 'tile' : 'region';
  const text = mode === 'thing' ? '' : mode === 'tile'
    ? `Output −${pct(size)} % for ${daysText(days)}`
    : `${event.label}${event.place ? ` in ${event.place}` : ''}: ${event.product ?? 'output'} −${pct(size)} %`;
  return {mode, event, size, days, text, tint: mode === 'region' ? event.kind : ''};
}

/**
 * The expected food an event destroys, kg, as the level shows it: its size × the output shown × the days shown. Pass the
 * output of what the event is shown on: the node's for a thing or a tile, the region's for a region (its size is a share of that).
 */
export const eventKgLost = (shown: Pick<ShownEvent, 'size' | 'days'>, outputKgPerDay: number) => shown.size * outputKgPerDay * shown.days;

/** What those kg were worth, £, at a price a kg: the same at every level, so an insurance scheme can pay out on it (the money loss beside the kg lost). */
export const eventValueLost = (shown: Pick<ShownEvent, 'size' | 'days'>, outputKgPerDay: number, pricePerKg: number) => eventKgLost(shown, outputKgPerDay) * pricePerKg;

// ---- inflating ----

/** What a rebuilt detail level's first cycle must reproduce. */
export interface InflateTarget {
  totals: LadderTotals;
  /** The share it may be off by (5 %). */
  tolerance: number;
  /** The cycle to run before comparing, game days. */
  windowDays: number;
  /** The events to rebuild it with. */
  events: GameEvent[];
}

/** The target for zooming back into a node that sealed a level's totals: the totals as sealed, over that level's window. */
export function inflateTarget(sealed: LadderTotals, level: number, events: GameEvent[] = []): InflateTarget {
  return {totals: sealed, tolerance: INFLATE_TOLERANCE, windowDays: rhythmOf(level).windowDays, events};
}

export interface CarryResult {
  ok: boolean;
  /** The numbers that are off by more than the tolerance (none when ok). */
  off: {key: string; sealed: number; rebuilt: number; error: number}[];
}

/**
 * Whether a rebuilt level's first-cycle totals are within the tolerance of the sealed ones: each number's error against
 * the sealed value (or the number's floor, for a node with almost none of it), and each land use the same. The `carry`
 * test's core.
 */
export function carryCheck(sealed: LadderTotals, rebuilt: LadderTotals, tolerance = INFLATE_TOLERANCE): CarryResult {
  const off: CarryResult['off'] = [];
  const cmp = (key: string, a: number, b: number, floor: number) => {
    const error = Math.abs(b - a) / Math.max(Math.abs(a), floor);
    if (error > tolerance) off.push({key, sealed: a, rebuilt: b, error});
  };
  for (const k of ['output', 'quality', 'reliability', 'upkeep', 'health', 'freshness', 'carbon'] as const) cmp(k, sealed[k], rebuilt[k], INFLATE_FLOOR[k]);
  const uses = new Set([...Object.keys(sealed.land), ...Object.keys(rebuilt.land)]) as Set<LandUse>;
  for (const u of uses) cmp(`land.${u}`, sealed.land[u] ?? 0, rebuilt.land[u] ?? 0, INFLATE_FLOOR.land);
  // a level sealed with its mix must be rebuilt with it, group by group (one sealed without any is compared on the total alone)
  if (sealed.outputByGroup) for (const g of PRODUCT_GROUPS) cmp(`group.${g}`, sealed.outputByGroup[g] ?? 0, rebuilt.outputByGroup?.[g] ?? 0, INFLATE_FLOOR.output);
  return {ok: off.length === 0, off};
}

/** A small, fast hash of a string into 32 bits (FNV-1a). */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** The seed of a node's layout when its level is rebuilt: from the game's seed and the node's id alone, so it always looks the same. */
export const layoutKey = (seed: number, nodeId: string): number => (hash(`layout:${nodeId}`) ^ Math.imul(seed | 0, 0x9e3779b1)) >>> 0;

/** The dice to lay a rebuilt level out with, from `layoutKey()`. */
export const layoutRng = (seed: number, nodeId: string): Rng => makeRng(layoutKey(seed, nodeId));

// ---- the step-up offer ----

export interface RequirementStatus {
  key: Requirement;
  value: number;
  target: number;
  met: boolean;
  /** How far there is to go as a share of the target, 0 when met. */
  shortfall: number;
  /** value ÷ target, 0–1, for the goal bar's fill. */
  progress: number;
  /** One line on what raises it. */
  hint: string;
}

export interface StepUpStatus {
  /** All three met over a full window. */
  ready: boolean;
  /** The three requirements, the furthest from its target first (win W18). */
  requirements: RequirementStatus[];
  /** The one holding the player back: the furthest from its target, or null when all are met. */
  binding: RequirementStatus | null;
  /** Game days of history there are, against the window: an offer waits for the whole window. */
  days: number;
  windowDays: number;
  full: boolean;
}

/**
 * The step-up offer's test on the last window's totals (null while there's no history): Output, Reliability and Health
 * at least the rules' figures over a full window. Says which requirement is holding the player back by how far each
 * is from its target as a share of it. A goal bar whose progress can fall back after it was met should hold at "met"
 * once the offer has been made; that's the wiring part's latch, not this function's.
 */
export function stepUpStatus(w: WindowTotals | null, rules: StepUpRules = STEP_UP[1]!): StepUpStatus {
  const keys: Requirement[] = ['output', 'reliability', 'health'];
  const rows = keys.map((key): RequirementStatus => {
    const value = w ? w.totals[key] : 0, target = rules[key];
    const met = value >= target;
    return {key, value, target, met, shortfall: met ? 0 : (target - value) / target, progress: clamp(value / target, 0, 1), hint: STEP_UP_HINTS[key]};
  });
  const requirements = [...rows].sort((a, b) => b.shortfall - a.shortfall);
  const full = w?.full ?? false;
  return {
    ready: full && rows.every((r) => r.met),
    requirements,
    binding: requirements[0]!.met ? null : requirements[0]!,
    days: w?.days ?? 0,
    windowDays: rhythmOf(rules.from).windowDays,
    full,
  };
}
