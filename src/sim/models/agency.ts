// Other people as agents: a household, skills, weighted goals, a habit and a hidden integrity; what they do each week from
// their time and habit; a helper's take against what they report and what watching narrows; goodwill and trust as slow
// stocks per relationship; and an adviser with an interest (the seed catalogue). Pure functions over the graph's typed
// quantities, and an `agency` system, not yet listed in src/sim/systems.ts (part 8 adds it). docs/systems/agency.md says
// how it works.
//
// Sources: the principal–agent problem (Jensen & Meckling 1976; Holmström 1979: an agent with goals of their own, hidden
//   action, and monitoring that costs the principal); repeated-game trust as a slow stock that a kept promise builds a
//   little and a broken one costs a lot (Axelrod 1984; Ostrom 1990 on monitoring in common-pool sites); allotment hours
//   and yields from National Allotment Society guidance (through household.ts's PLOT); the biased adviser after Inderst
//   & Ottaviani (2012, "How (not) to pay for advice": a seller who advises is paid on what they sell).
// Simplifies: four wants and four habits, one honesty number that never changes (it is who they are, not what they've
//   learnt), no memory of past weeks in an agent's choices beyond goodwill and trust; a helper takes a share of the
//   harvest and never a share of the hours; a report is the truth with the hidden part scaled by honesty (there are no
//   lies about anything else); watching is three settings, not a schedule; a week's luck is one draw on the hours and
//   one on the chance to take; goodwill is one number a person, not a ledger of favours; an adviser scores by a flat bias.
//   Fast effect: a week's hours on a plot, the kg a helper took and what they said they took, and the hours a watch cost.
//   Slow effect: goodwill drifting back to neutral, trust in a report coming to match the truth, and the hidden gap
//   between what is reported and what was taken, kept by the flows.
import {
  CARBON_CHOICE, CATALOGUE, GOAL_SPREAD, HABITS, HELP, INTEGRITY, NEIGHBOURS, PLOT_SHARE, SHAPES, TRUST, WANTS, WATCH, WEEK_JITTER,
  type Habit, type HouseholdShape, type Want, type Watching,
} from '../../data/agency';
import type {Role as LabourRole, SkillName} from '../../data/labour';
import type {System, TickContext} from '../clock';
import {qty, type GraphNode, type LeverValue} from '../graph';
import {rng, type Rng} from '../random';
import {HOURS_LEFT, type Worker} from './labour';
import {keptness, newMember, weekGardenHours, type Household} from './household';

/** The levers an agent's node keeps its person, its relationship with the player and, while they help, the job in. */
export const AGENT = 'agent';
export const RELATION = 'relation';
export const HELPING = 'helping';
/** The running account of a helper (the truth, for the bot and for tests; a panel shows `reported`). */
export const TAKINGS = 'takings';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const setLever = (n: GraphNode, k: string, v: unknown) => void (n.levers[k] = v as LeverValue);

// ---- people ----

export type Goals = Record<Want, number>;

/**
 * A person. `integrity` is hidden: nothing the player sees should show it, only what an audit finds. `household` comes
 * from household.ts, so the same functions size their time as the player's. `plot` is where they garden, or null.
 */
export interface Agent {
  id: string;
  name: string;
  habit: Habit;
  goals: Goals;
  integrity: number;
  skills: Partial<Record<SkillName, number>>;
  household: Household;
  plot: string | null;
}

/** A habit's goals, each strayed from by up to GOAL_SPREAD of itself, then made to sum to 1. */
export function goalsFor(habit: Habit, rng: Rng): Goals {
  const out = {} as Goals;
  let total = 0;
  for (const w of WANTS) total += out[w] = HABITS[habit].goals[w] * (1 + (rng.next() * 2 - 1) * GOAL_SPREAD);
  for (const w of WANTS) out[w] /= total;
  return out;
}

/** How honest a person of a habit is, drawn around the site's mean and the habit's shift, between INTEGRITY's bounds. */
export function integrityFor(habit: Habit, rng: Rng, cap: number = INTEGRITY.max): number {
  const x = INTEGRITY.mean + (rng.next() * 2 - 1) * INTEGRITY.spread + HABITS[habit].integrity;
  return Math.min(Math.min(cap, INTEGRITY.max), Math.max(INTEGRITY.min, x));
}

/** A household of a shape: the plot-holder, a partner if any, a child at school if any. */
export function householdOf(id: string, name: string, shape: HouseholdShape): Household {
  const members = [newMember(id, name, 'gardener', shape.holder)];
  if (shape.partner) members.push(newMember(`${id}-partner`, 'Partner', 'partner', shape.partner));
  if (shape.child) members.push(newMember(`${id}-child`, 'Child', 'child', 'school'));
  return {members};
}

/** A person made from a habit and a household: goals, honesty and skill from the dice. */
export function makeAgent(id: string, name: string, habit: Habit, household: Household, rng: Rng, plot: string | null = null): Agent {
  const skill = clamp01(0.3 + rng.next() * 0.6);
  return {id, name, habit, goals: goalsFor(habit, rng), integrity: integrityFor(habit, rng), skills: {sowing: skill, harvest: skill, general: skill}, household, plot};
}

// ---- their week ----

/** The hours a week a person gives their own plot on average: their household's garden hours, a share of them, and the habit's effort. */
export const plotHours = (a: Agent) => weekGardenHours(a.household) * PLOT_SHARE * HABITS[a.habit].effort;
/** The hours a week they would lend a neighbour: a share of the household's garden hours, less their wish to rest. */
export const spareHours = (a: Agent) => weekGardenHours(a.household) * HELP.lend * (1 - a.goals.rest);

export interface Week {
  /** Hours on their own plot this week, and how kept that leaves it, 0 to 1. */
  hours: number;
  kept: number;
}
/** Their week: the average, spread by a week's luck from the dice. What a plot needs is household.ts's `keptness`. */
export function weekPlan(a: Agent, rng: Rng): Week {
  const hours = plotHours(a) * (1 + (rng.next() * 2 - 1) * WEEK_JITTER);
  return {hours, kept: keptness(hours)};
}

export interface Allotment {
  /** The eleven neighbours, each on a plot from `plot-2` to `plot-12` (the player's is `plot-1`). */
  agents: Agent[];
  /** The neighbour who offers to help with the second plot: the most spare time of the generous and the competitive, their honesty kept low. */
  helper: string;
  /** The plot whose household has the least time. */
  neglected: string;
}

/**
 * The allotment from a seed: which neighbour holds which plot is shuffled, everything else about them is drawn. The
 * helper is the generous or competitive neighbour with the most spare hours, and never among the honest ones. The
 * neglected plot is the one whose household spends the fewest hours on it: neglect comes from time, not from a script.
 */
export function allotment(rng: Rng): Allotment {
  const order = NEIGHBOURS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const agents = order.map((n, i) => {
    const p = NEIGHBOURS[n]!, id = `neighbour-${n + 1}`;
    return makeAgent(id, p.name, p.habit, householdOf(id, p.name, SHAPES[p.shape]!), rng, `plot-${i + 2}`);
  });
  const neglected = agents.reduce((low, a) => (plotHours(a) < plotHours(low) ? a : low));
  const willing = agents.filter((a) => (a.habit === 'generous' || a.habit === 'competitive') && a !== neglected);
  const helper = willing.reduce((most, a) => (spareHours(a) > spareHours(most) ? a : most));
  helper.integrity = Math.min(helper.integrity, INTEGRITY.helperMax);
  return {agents, helper: helper.id, neglected: neglected.plot!};
}

/** The plot the first zoom back in picks (the founding spec: slugs from a neighbour's neglected plot), from the game's seed: the plot and its holder. Its timing stays scripted; this only says where it comes from. */
export function neglectedPlot(seed: number): {plot: string; who: string} {
  const {agents, neglected} = allotment(rng(seed));
  return {plot: neglected, who: agents.find((a) => a.plot === neglected)!.id};
}

// ---- reports against the truth ----

/** How much of what's hidden a report carries: an honest person tells all of it, a watched one is caught telling some, an unwatched dishonest one tells none. 1 − (1 − integrity)(1 − watch). */
export const honesty = (integrity: number, watch: number) => 1 - (1 - integrity) * (1 - watch);
/** What a report says when there's something to hide: the plain part and the hidden part times honesty. Used for kg taken, and (reversed, see `padded`) for hours. */
export const reportOf = (plain: number, hidden: number, integrity: number, watch: number) => plain + hidden * honesty(integrity, watch);
/** What a report claims when the truth is worked hours and there's slack to pad with: the more honest or watched, the less padding. The hired hand's version of the same gap. */
export const padded = (worked: number, slack: number, integrity: number, watch: number) => worked + slack * (1 - honesty(integrity, watch));

export interface Watch {
  /** Hours it costs the player this week. */
  hours: number;
  /** How far it closes the gap between report and truth, 0 to 1. */
  watch: number;
  /** What it costs the watched person's goodwill this week. */
  goodwill: number;
}
export const watchOf = (w: Watching): Watch => WATCH[w];

export interface Take {
  /** The harvest, kg, the agreed share of it, and what they took beyond that (the truth). */
  harvest: number;
  agreed: number;
  extra: number;
  /** All they took, kg, and what they said they took. */
  took: number;
  reported: number;
  /** What the report leaves out: took − reported. It's in the flows, not in any number the player sees. */
  gap: number;
  /** The share of the hidden part they'd tell if nobody looked: what an audit compares the truth against, and so what it teaches trust. */
  candour: number;
}

/**
 * A helper's week on the second plot: the agreed share of the harvest, and beyond it what their appetite and their honesty
 * let them take, less what being watched deters. The take is spread by the week's chance (about 1 on average). The report
 * is `reportOf`: what they say they took is the agreed share and the honesty-scaled part of the rest.
 */
export function helperWeek(a: Agent, harvest: number, watching: Watching, rng: Rng): Take {
  const w = WATCH[watching], agreed = harvest * HELP.share, chance = 0.6 + rng.next() * 0.8;
  const appetite = HELP.extra * HABITS[a.habit].grab * (1 - a.integrity) * chance * (1 - WATCH.deter * w.watch);
  const extra = Math.min(Math.max(0, harvest - agreed), harvest * appetite);
  const took = agreed + extra, reported = reportOf(agreed, extra, a.integrity, w.watch);
  return {harvest, agreed, extra, took, reported, gap: took - reported, candour: honesty(a.integrity, 0)};
}

/** What one week of a second plot comes to for the player, in kg and in hours, with a helper (at a watching setting) or without. */
export interface SecondPlot {
  /** The player's hours, all told (the plot's, or the watching's). */
  hours: number;
  /** The kg that reach the player, and the kg taken from them beyond the agreed share (never shown). */
  kg: number;
  hidden: number;
  /** kg plus the hours' worth, at `hourKg`, out of a common purse of hours: bigger is better for the player. */
  value: number;
}
/** A week of the second plot, done alone (`helper` null: the player's hours and all of the harvest) or with a helper, at the price of an hour. */
export function secondPlot(o: {helper: Agent | null; watching?: Watching; hourKg?: number; kept?: number}, rng: Rng): SecondPlot {
  const hourKg = o.hourKg ?? HELP.hourKg, harvest = HELP.plotKg * (o.kept ?? 1);
  if (!o.helper) return {hours: HELP.hoursNeeded, kg: harvest, hidden: 0, value: harvest - HELP.hoursNeeded * hourKg};
  const w = WATCH[o.watching ?? 'trust'], t = helperWeek(o.helper, harvest, o.watching ?? 'trust', rng);
  return {hours: w.hours, kg: harvest - t.took, hidden: t.gap, value: harvest - t.took - w.hours * hourKg};
}

// ---- trust and goodwill ----

/** A relationship with the player: their goodwill towards you, and your trust in what they report, both 0 to 1 and slow. */
export interface Relation {
  goodwill: number;
  trust: number;
}
export const newRelation = (): Relation => ({goodwill: TRUST.baseline, trust: TRUST.prior});

/** A step towards 1 or 0: `delta` at the middle, smaller as it nears the end it is heading for, so goodwill has no cliff. */
const step = (g: number, delta: number) => clamp01(g + delta * 2 * (delta > 0 ? 1 - g : g));

/** What can move a relationship. */
export type Event =
  | {type: 'kept'}
  | {type: 'missed'}
  | {type: 'shared'; kg: number}
  | {type: 'help'; hours: number}
  | {type: 'carbon'; choice: string}
  | {type: 'watch'; watching: Watching}
  | {type: 'found'; gap: number};

/** What an event is worth to goodwill, before the shrinking step. Watching costs its `goodwill` a week; being found out costs a step at least, and a step for each kg it found beyond the first. */
export function worth(e: Event): number {
  switch (e.type) {
    case 'kept': return TRUST.events.kept!;
    case 'missed': return TRUST.events.missed!;
    case 'shared': return Math.min(TRUST.sharedCap, e.kg * TRUST.events.shared!);
    case 'help': return e.hours * TRUST.events.help!;
    case 'carbon': return CARBON_CHOICE[e.choice] ?? 0;
    case 'watch': return -WATCH[e.watching].goodwill;
    case 'found': return Math.min(TRUST.events.gap!, e.gap * TRUST.events.gap!);
  }
}
/** A relationship with its goodwill moved by a raw amount (a vote's aftermath). */
export const nudged = (r: Relation, delta: number): Relation => ({...r, goodwill: step(r.goodwill, delta)});
/** A relationship after an event. Trust doesn't move here: only an audit moves it (`learn`). */
export const after = (r: Relation, e: Event): Relation => nudged(r, worth(e));
/** Goodwill drifts back to neutral, a little every week: kept promises and shared surplus have to be kept up. */
export const drift = (r: Relation): Relation => ({...r, goodwill: lerp(r.goodwill, TRUST.baseline, TRUST.drift)});
/** The kg a person gives away at the swap shed out of a surplus: the habit's share of it. */
export const shared = (a: Agent, surplus: number) => Math.max(0, surplus) * HABITS[a.habit].give;
/** The same event for many relationships (the whole site sees a bonfire). */
export const among = (rs: Record<string, Relation>, e: Event): Record<string, Relation> => Object.fromEntries(Object.entries(rs).map(([k, r]) => [k, after(r, e)]));
/** How much a site likes you: the mean goodwill across its relationships (the committee's goodwill). */
export const siteGoodwill = (rs: Iterable<Relation>) => {
  let n = 0, s = 0;
  for (const r of rs) (n++, (s += r.goodwill));
  return n ? s / n : TRUST.baseline;
};

/**
 * What a watched week teaches the player: their trust in this person's reports moves `learn × watch` of the way to how
 * candid they were (the share of the hidden part they'd have told unwatched; 1 when there was nothing hidden). Goodwill pays for
 * the watching, and more for what it found. Returns the relationship after.
 */
export function audited(r: Relation, t: Take, watching: Watching): Relation {
  const w = WATCH[watching];
  if (w.watch <= 0) return r;
  const seen = t.extra > 1e-9 ? t.candour : 1;
  const trust = lerp(r.trust, seen, TRUST.learn * w.watch);
  let out = after({...r, trust}, {type: 'watch', watching});
  if (t.gap > 1e-9) out = after(out, {type: 'found', gap: t.gap * w.watch});
  return out;
}

// ---- an adviser with an interest ----

/** Something an adviser can recommend, with how good it really is (0 to 1) and whether the adviser sells it. */
export interface Option {
  id: string;
  merit: number;
  own: boolean;
}
/** What the adviser scores an option: its merit, and its own products' scaled up by the bias. */
export const score = (o: Option, bias: number = CATALOGUE.bias) => o.merit * (o.own ? 1 + bias : 1);
/** The `n` best by the adviser's score (ties to the better merit); an honest adviser is the same with bias 0. */
export const recommend = (options: readonly Option[], n: number, bias: number = CATALOGUE.bias): Option[] =>
  [...options].sort((a, b) => score(b, bias) - score(a, bias) || b.merit - a.merit).slice(0, n);
/** What the Explain card shows: the list against the honest one, and the own products it carries that the honest list wouldn't. */
export function tilt(options: readonly Option[], n: number, bias: number = CATALOGUE.bias) {
  const list = recommend(options, n, bias), fair = recommend(options, n, 0), fairIds = new Set(fair.map((o) => o.id));
  return {
    list, fair, bias,
    own: list.filter((o) => o.own).length,
    ownFair: fair.filter((o) => o.own).length,
    displaced: list.filter((o) => !fairIds.has(o.id)),
  };
}

// ---- the same people one level up ----

/** A person as a labour.ts `Worker` (part 13's first hire): their skills, and their goals as a cap on hours, a lazy person's lower. Their honesty is theirs alone; `padded` is what they claim in hours. */
export function asWorker(a: Agent, role: LabourRole = 'hired hand'): Worker {
  return {id: a.id, role, skills: a.skills, goals: a.goals.rest > 0.4 ? {hoursCap: 6} : {}};
}

// ---- the system ----

export interface Takings {
  weeks: number;
  /** The truth: kg taken beyond the agreed share, all told, and what was said. For tests and the bot; a panel shows `reported`. */
  hidden: number;
  reported: number;
  took: number;
  hoursWatched: number;
  first: number | null;
}
export const newTakings = (): Takings => ({weeks: 0, hidden: 0, reported: 0, took: 0, hoursWatched: 0, first: null});
export const agentOf = (n: GraphNode) => (n.levers[AGENT] as unknown as Agent | undefined) ?? null;
export const relationOf = (n: GraphNode) => (n.levers[RELATION] as unknown as Relation | undefined) ?? newRelation();
export const takingsOf = (n: GraphNode) => (n.levers[TAKINGS] as unknown as Takings | undefined) ?? newTakings();
export interface Helping {
  /** The plot node they work and take from. */
  plot: string;
  watching: Watching;
  /** The player's node whose hours a watch costs (its `hours` stock), if any. */
  payer?: string;
}

const foods = (n: GraphNode) => Object.entries(n.stocks).filter(([k, s]) => k.startsWith('food.') && s.amount > 1e-9);

/** Moves what a helper took off the plot's shelves to their own, in proportion to what's there, a flow a product; returns kg moved. */
function takeOff(c: TickContext, plot: GraphNode, to: GraphNode, kg: number): number {
  const held = foods(plot), all = held.reduce((s, [, st]) => s + st.amount, 0), moved = Math.min(kg, all);
  if (moved <= 1e-9) return 0;
  for (const [key, st] of held)
    c.flow({what: 'taken home', unit: 'kgFood', product: st.product, amount: qty((moved * st.amount) / all, 'kgFood'), from: {node: plot.id, stock: key}, to: {node: to.id, stock: key}});
  return moved;
}

/**
 * The agency system: each week every person with an `agent` lever plans their week (its `week` lever), their goodwill
 * drifts back to neutral, and a helper (a `helping` lever) works the plot they were given: what they took moves from the
 * plot's shelves to theirs, a watch costs the player's hours, trust and goodwill move, and the running account records the truth beside
 * the report. Not yet listed in src/sim/systems.ts.
 */
export const agency: System = {
  name: 'agency',
  on: {
    week(c) {
      for (const n of Object.values(c.graph.nodes)) {
        const a = agentOf(n);
        if (!a) continue;
        setLever(n, 'week', weekPlan(a, c.rng));
        let r = drift(relationOf(n));
        const job = n.levers[HELPING] as unknown as Helping | undefined, plot = job ? c.graph.nodes[job.plot] : undefined;
        if (job && plot) {
          const harvest = foods(plot).reduce((s, [, st]) => s + st.amount, 0), t = helperWeek(a, harvest, job.watching, c.rng);
          const took = takeOff(c, plot, n, t.took), scaled = t.took > 1e-9 ? took / t.took : 0;
          const w = WATCH[job.watching], payer = job.payer ? c.graph.nodes[job.payer] : undefined;
          if (payer?.stocks[HOURS_LEFT] && w.hours > 1e-9) c.flow({what: 'watching the helper', unit: 'h', amount: qty(Math.min(w.hours, payer.stocks[HOURS_LEFT].amount), 'h'), from: {node: payer.id, stock: HOURS_LEFT}, to: {boundary: 'time'}});
          r = audited(r, {...t, took, reported: t.reported * scaled, gap: t.gap * scaled}, job.watching);
          r = after(r, {type: 'help', hours: Math.min(HELP.hoursNeeded, spareHours(a))});
          const l = takingsOf(n);
          setLever(n, TAKINGS, {
            weeks: l.weeks + 1, hidden: l.hidden + t.gap * scaled, reported: l.reported + t.reported * scaled, took: l.took + took,
            hoursWatched: l.hoursWatched + w.hours, first: l.first ?? (took > 0 ? c.hours : null),
          } satisfies Takings);
        }
        setLever(n, RELATION, r);
      }
    },
  },
  command(cmd) {
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && (cmd.lever === AGENT || cmd.lever === RELATION || cmd.lever === TAKINGS)) return 'a person’s honesty, goodwill and takings are kept, not set';
    return undefined;
  },
};
