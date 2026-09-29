// The carry-over rule's maths, pure: a small history a level keeps and the five headline numbers taken from it, a sealed
// node's tick, an event shown at any level, inflating's target and layout key, and the step-up offer's test. docs/systems/ladder.md
// says how it works and how part 7 wires it. It is a rule of the game, not a real-world model, so it has no sources; each
// part says which section of the founding spec (docs/specs/overgrow.md) it implements:
//   History, record(), windowTotals(), reliability(), healthIndex()  "The carry-over rule", Sealing: the totals over the last full cycle
//   sealNode(), sealedTick(), healthFactor(), sealedSystem           "The carry-over rule", Sealing: a sealed node keeps running by its totals
//   showEvent(), eventKgLost(), eventFactor()                        "The carry-over rule", How events cross scales
//   inflateTarget(), carryCheck(), layoutKey()                       "The carry-over rule", Inflating
//   stepUpStatus()                                                   "The first playable slice", What makes the jump feel earned (and win W18)
// Fast effect: a sealed node's output each tick, lumpy by its Reliability. Slow effect: its Health drifting toward the plan.
import {
  HEALTH_DRIFT_PER_SEASON, HEALTH_FLOOR, HEALTH_PARTS, HEALTH_PENALTY, HEALTH_WEIGHTS, INFLATE_FLOOR, INFLATE_TOLERANCE, RHYTHMS,
  SEASON_DAYS, STEP_UP, STEP_UP_HINTS, type HealthPart, type Requirement, type Rhythm, type StepUpRules,
} from '../data/ladder-rules';
import {LEVELS} from '../data/ladder';
import type {System, TickContext} from './clock';
import {qty, type LandUse, type LeverValue, type Qty, type Totals} from './graph';
import {rng as makeRng, type Rng} from './random';
import {ATMOSPHERE} from './state';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const DAY_HOURS = 24;

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
  /** The slow stocks behind Health as they stand, each 0–100; a level records the ones it has. */
  health: Partial<Record<HealthPart, number>>;
}

/**
 * The ring: the last full cycle of samples, oldest first, capped at the window (28 a day for the garden, and a year of
 * weeks at level 7), so it's about a dozen numbers a sample and never the level's detail. Saved state (plain JSON).
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

export interface WindowTotals {
  totals: Totals;
  /** Game days the samples cover. */
  days: number;
  /** The window is full: the last whole cycle is in the ring. */
  full: boolean;
}

/**
 * The five headline numbers, the carbon and the land over the ring (null while it's empty). Output, Upkeep and carbon
 * are per-day means; Quality and Freshness are weighted by output; Reliability is over the per-day series; Health is the
 * index at the end of the window (it's a stock, not a flow); land is as it stands.
 */
export function windowTotals(h: History): WindowTotals | null {
  const n = h.samples.length;
  if (!n) return null;
  const d = h.sampleDays;
  const perDay: number[] = [];
  let out = 0, up = 0, co2 = 0, q = 0, fr = 0;
  for (const s of h.samples) {
    out += s.output;
    up += s.upkeep;
    co2 += s.carbon;
    q += s.quality * s.output;
    fr += (s.freshness ?? 0) * s.output;
    perDay.push(s.output / d);
  }
  const days = n * d;
  return {
    totals: {
      output: out / days, quality: out > 0 ? q / out : 0, reliability: reliability(perDay), upkeep: up / days,
      health: healthIndex(h.samples[n - 1]!.health), freshness: out > 0 ? fr / out : 0, carbon: co2 / days, land: {...h.land},
    },
    days,
    full: n >= h.cap,
  };
}

// ---- a sealed node's tick ----

/** What the player last set for a sealed node: the Health it drifts to, and optionally the carbon and land it follows. */
export interface SealPlan {
  health: number;
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
  totals: Totals;
  plan: SealPlan;
  events: GameEvent[];
  /** Game hours it was last ticked (or sealed). */
  at: number;
}

/** Seals a level's totals into a node at a game hour, with the plan starting where the node stands. */
export function sealNode(totals: Totals, hours: number, plan?: Partial<SealPlan>): SealedNode {
  return {totals: {...totals, land: {...totals.land}}, plan: {health: totals.health, ...plan}, events: [], at: hours};
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
export function sealedTick(node: SealedNode, hours: number, rng: Rng): SealedTick {
  const days = (hours - node.at) / DAY_HOURS;
  const t = node.totals;
  if (days <= 0) return {node, output: qty(0, 'kgFood'), lost: qty(0, 'kgFood'), upkeep: qty(0, 'GBP'), carbon: qty(0, 'kgCO2e')};
  const step = (HEALTH_DRIFT_PER_SEASON * days) / SEASON_DAYS;
  const health = clamp(node.plan.health, 0, 100) - t.health;
  const drifted = t.health + clamp(health, -step, step);
  const cv = (100 - clamp(t.reliability, 0, 100)) / 100 / Math.sqrt(days);
  const events = eventFactor(node.events, node.at, hours);
  const base = t.output * days * healthFactor(drifted) * noiseFactor(rng, cv);
  const carbon = node.plan.carbon ?? t.carbon;
  const next: SealedNode = {
    totals: {...t, health: drifted, carbon, land: {...(node.plan.land ?? t.land)}},
    plan: node.plan,
    events: node.events.filter((e) => e.from + e.days * DAY_HOURS > hours),
    at: hours,
  };
  return {node: next, output: qty(base * events, 'kgFood'), lost: qty(base * (1 - events), 'kgFood'), upkeep: qty(t.upkeep * days, 'GBP'), carbon: qty(carbon * days, 'kgCO2e')};
}

/**
 * The lever a sealed node keeps its `SealedNode` under, and the stocks the system below moves: the food it delivers
 * (product 'produce', from the `growth` boundary) and the money its upkeep is paid from, if the node has a `money` stock.
 * docs/systems/ladder.md says what the wiring part adds.
 */
export const SEALED = {lever: 'sealed', food: 'food', product: 'produce', money: 'money'} as const;

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
        if (r.upkeep > 0 && n.stocks[SEALED.money]) ctx.flow({what: 'upkeep', unit: 'GBP', amount: r.upkeep, from: {node: n.id, stock: SEALED.money}, to: {boundary: 'bought'}});
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

/** The expected food an event destroys, kg, as the level shows it: its size × the output shown × the days shown. */
export const eventKgLost = (shown: Pick<ShownEvent, 'size' | 'days'>, outputKgPerDay: number) => shown.size * outputKgPerDay * shown.days;

// ---- inflating ----

/** What a rebuilt detail level's first cycle must reproduce. */
export interface InflateTarget {
  totals: Totals;
  /** The share it may be off by (5 %). */
  tolerance: number;
  /** The cycle to run before comparing, game days. */
  windowDays: number;
  /** The events to rebuild it with. */
  events: GameEvent[];
}

/** The target for zooming back into a node that sealed a level's totals: the totals as sealed, over that level's window. */
export function inflateTarget(sealed: Totals, level: number, events: GameEvent[] = []): InflateTarget {
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
export function carryCheck(sealed: Totals, rebuilt: Totals, tolerance = INFLATE_TOLERANCE): CarryResult {
  const off: CarryResult['off'] = [];
  const cmp = (key: string, a: number, b: number, floor: number) => {
    const error = Math.abs(b - a) / Math.max(Math.abs(a), floor);
    if (error > tolerance) off.push({key, sealed: a, rebuilt: b, error});
  };
  for (const k of ['output', 'quality', 'reliability', 'upkeep', 'health', 'freshness', 'carbon'] as const) cmp(k, sealed[k], rebuilt[k], INFLATE_FLOOR[k]);
  const uses = new Set([...Object.keys(sealed.land), ...Object.keys(rebuilt.land)]) as Set<LandUse>;
  for (const u of uses) cmp(`land.${u}`, sealed.land[u] ?? 0, rebuilt.land[u] ?? 0, INFLATE_FLOOR.land);
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
