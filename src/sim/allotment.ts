// The allotment (level 2): the step up that seals the garden into a plot, the allotment's graph of twelve plots (the
// player's the sealed garden, eleven neighbours' drawn from the seed), the player's plot's three-lever plan, and the
// `allotment` system that runs the level each day and week: the plan onto the sealed node, the plots' food to their
// households, the people on their plots, the household's week and the level's own history. The sealed nodes themselves
// tick by `sealedSystem` (src/sim/ladder.ts). The founding spec's "The carry-over rule" and "The allotment";
// docs/systems/allotment.md says how it works; part 8's first season is src/sim/season.ts.
//
// Sources: as src/data/allotment.ts's (the National Allotment Society and RHS on plots, care, rent and yields; the
//   fertiliser literature on bought feed's carbon), and the household model's time (src/sim/models/household.ts).
// Simplifies: a plot is one sealed node (no beds; the weather, water and pests reach it through src/sim/season.ts); the neighbours' plots are drawn
//   once from the seed and then only tick; the household eats what the plot gives up to its week's veg and the rest
//   leaves as given away; the people on the map walk to their plots on the days their plots gave food, for the hours
//   their households have.
//   Fast effect: this season's Output from the mix and the feed. Slow effect: Health's point a season from the care and
//   the feed.
import {
  ALLOTMENT_DAYS, CARE, FEEDS, LEVER_DAYS, MIXES, NEIGHBOUR_RANGE, PLAN_LEVERS, PLAYER_PLOT, PLOTS, RENT_PER_DAY, SHARED, TROUGH_L, plotBox, plotId,
  type Care, type Feed, type Mix,
} from '../data/allotment';
import {TRUST, type Habit} from '../data/agency';
import {CAPITAL, START_RULES} from '../data/committee';
import {BASKET, PLOT, PRICE, VEG, type FoodGroup} from '../data/household';
import {INFLATE_RELIABILITY_TOLERANCE, PRODUCT_GROUPS, type ProductGroup} from '../data/ladder-rules';
import type {Activity} from './activity';
import {calendar, type System, type TickContext} from './clock';
import {gardenStatus, goalOf, offered} from './goal';
import {makeGraph, qty, type Edge, type Graph, type GraphNode, type LandUse, type LeverValue, type NodeSpec} from './graph';
import {
  carryCheck, emptyHistory, inflateTarget, layoutRng, record, sampleOf, sealedTick, sealNode, SEALED, windowTotals, type ByGroup, type CarryResult, type History,
  type LadderTotals, type SealPlan, type SealedNode,
} from './ladder';
import {allotment as people, plotHours} from './models/agency';
import {CAPITAL_STOCK, COMMITTEE, GOODWILL_STOCK, RULES} from './models/committee';
import {HOURS_LEFT} from './models/labour';
import {isSecond, keptOf, playerLand, seasonNodes, SHEDS} from './season';
import {basket, householdWage, keptness, membersOf, restSpend, people as heads, weekGardenHours, type Household, type Member} from './models/household';
import {rng} from './random';
import {ATMOSPHERE, type State} from './state';

export const ALLOTMENT = 2;
/** The household's node at the allotment: its purse, its members, the level's ledger and its history. */
export const HOME = 'household';
/** The player's figure on the map, as at the garden. */
const GARDENER = 'gardener';

/** A level the player has left, kept compactly for the zoom back in (part 9): the game hour it was sealed, its totals as
 *  sealed and its graph as it stood (the stocks and levers the save already had; no flows, activities or effects). */
export interface Below {
  level: number;
  hours: number;
  totals: LadderTotals;
  graph: Graph;
  /** The game hour its graph stands at, once it has been run on since it was sealed (part 9's zoom back in). */
  at?: number;
}

/** Who holds a neighbour's plot, in brief, for the plot list: the full agent is their own node (src/sim/season.ts). */
export interface Holder {
  id: string;
  name: string;
  habit: Habit;
  /** Hours a week their household gives the plot. */
  hours: number;
  neglected: boolean;
}

/** The household's running account at the allotment, kept as its `ledger` lever and replaced, never changed in place. */
export interface AllotmentLedger {
  /** The game hour the plot was taken. */
  since: number;
  /** kg the plot gave this week, by group, and the week's sample's marks. */
  week: ByGroup;
  /** Since the step up: kg the plot gave, kg the household ate of it, kg given away, and £ saved at the shop. */
  grown: number;
  eaten: number;
  given: number;
  saved: number;
  /** The last week's purse: £ in wages, out at the shop and on the rest of life, and saved. */
  last: {wages: number; shop: number; rest: number; saved: number; kg: number} | null;
}

/** The level's own history, for its own offer later (part 10). */
export interface LevelGoal {
  history: History;
}

export const sealedOf = (n: GraphNode | undefined) => (n?.levers[SEALED.lever] as unknown as SealedNode | undefined) ?? null;
export const holderOf = (n: GraphNode | undefined) => (n?.levers.holder as unknown as Holder | undefined) ?? null;
export const ledgerAt = (g: Graph) => (g.nodes[HOME]?.levers.ledger as unknown as AllotmentLedger | undefined) ?? null;
/** The garden's totals as sealed, kept beside the plan so the plan is always worked out from them. */
export const baseOf = (n: GraphNode | undefined) => (n?.levers.base as unknown as LadderTotals | undefined) ?? null;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const sum = (g: ByGroup) => PRODUCT_GROUPS.reduce((s, k) => s + (g[k] ?? 0), 0);
const scaleTo = (g: ByGroup, total: number): ByGroup => {
  const t = sum(g), out: ByGroup = {};
  for (const k of PRODUCT_GROUPS) if (g[k]) out[k] = t > 0 ? (g[k]! * total) / t : 0;
  return out;
};

/** The garden's mix when its history kept none: the household's veg basket's proportions (the garden grew for the kitchen). */
export function basketMix(output: number): ByGroup {
  const out: ByGroup = {};
  for (const g of VEG) out[g as ProductGroup] = BASKET[g];
  return scaleTo(out, output);
}

/** The land of a level's nodes by use, m², as it stands: every node's land stocks but the household's and the air's. */
export function landOf(g: Graph): Partial<Record<LandUse, number>> {
  const out: Partial<Record<LandUse, number>> = {};
  for (const n of Object.values(g.nodes)) {
    if (n.kind === 'household' || n.kind === 'atmosphere' || n.kind === 'person') continue;
    for (const [k, s] of Object.entries(n.stocks))
      if (k.startsWith('land.') && s.amount > 0) out[k.slice(5) as LandUse] = (out[k.slice(5) as LandUse] ?? 0) + s.amount;
  }
  return out;
}

/** The plan of the player's plot from its three levers, worked out from the garden's totals as sealed: care moves
 *  Health's target by how kept it leaves the ground, the mix reweights the groups and the kg, the feed trades Health
 *  against the kg, £ and carbon. The default plan (the garden's own care, its mix and its compost) leaves the garden as it
 *  was, but for the plot's rent. */
export function planFor(base: LadderTotals, care: Care, mix: Mix, feed: Feed): SealPlan & Required<Pick<SealPlan, 'output' | 'mix' | 'upkeep' | 'carbon'>> {
  const kept = (h: number) => keptness(h, PLOT.m2), m = MIXES[mix], f = FEEDS[feed];
  const output = base.output * m.output * f.output;
  const weighted: ByGroup = {};
  const had = base.outputByGroup ?? basketMix(base.output);
  for (const g of PRODUCT_GROUPS) if (had[g]) weighted[g] = had[g]! * ((m.weight as Partial<Record<ProductGroup, number>>)[g] ?? 1);
  return {
    health: clamp(base.health + CARE.points * (kept(care) - kept(CARE.base)) + f.health, 0, 100),
    output, mix: scaleTo(weighted, output), upkeep: base.upkeep + RENT_PER_DAY + f.upkeep, carbon: base.carbon + f.carbon,
  };
}

/** The player's plot's plan as its levers stand. */
export function planOf(n: GraphNode): SealPlan | null {
  const base = baseOf(n);
  if (!base) return null;
  return planFor(base, n.levers[PLAN_LEVERS.care] as Care, n.levers[PLAN_LEVERS.mix] as Mix, n.levers[PLAN_LEVERS.feed] as Feed);
}

/** The garden's totals to seal: its year's totals (Output, Upkeep, carbon and Health as the ring has them), Reliability
 *  as the offer counted it (the weeks' shares of the household's veg met, src/sim/goal.ts), the land as it stands, and
 *  the mix of the household's veg. Null before the offer. */
export function gardenTotals(g: Graph): LadderTotals | null {
  const goal = goalOf(g), w = goal ? windowTotals(goal.history) : null;
  if (!goal || !w) return null;
  const reliability = gardenStatus(goal).requirements.find((r) => r.key === 'reliability')?.value ?? w.totals.reliability;
  const t: LadderTotals = {...w.totals, reliability, land: landOf(g)};
  t.outputByGroup = w.totals.outputByGroup ?? basketMix(t.output);
  return t;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The eleven neighbours' plots from the seed: who holds each from the household model (the same draw as
 *  `neglectedPlot(seed)`), and their totals from the layout's dice, near the player's garden. */
export function neighbourPlots(seed: number, base: LadderTotals): {holder: Holder; sealed: SealedNode; id: string}[] {
  const who = people(rng(seed)), dice = layoutRng(seed, 'allotment'), R = NEIGHBOUR_RANGE;
  const hours = who.agents.map((a) => plotHours(a)), kept = hours.map((h) => keptness(h, PLOT.m2));
  const lo = Math.min(...kept), hi = Math.max(...kept);
  const luck = () => 1 + (dice.next() * 2 - 1) * R.jitter;
  return who.agents.map((a, i) => {
    const t = hi > lo ? (kept[i]! - lo) / (hi - lo) : 0.5, neglected = a.plot === who.neglected;
    const output = base.output * lerp(R.output[0], R.output[1], t) * luck();
    let health = clamp(lerp(R.health[0], R.health[1], t) + (dice.next() * 2 - 1) * R.jitter * 50, 0, 100);
    if (neglected) health = Math.min(health, R.neglected);
    const totals: LadderTotals = {
      ...base, output, health, reliability: clamp(base.reliability * luck(), 0, 100), upkeep: base.upkeep + RENT_PER_DAY * luck(),
      carbon: base.carbon * luck(), land: {...base.land}, outputByGroup: scaleTo(base.outputByGroup ?? basketMix(output), output),
    };
    // where its Health heads comes from its holder's week (src/sim/season.ts), a point a season at most (the sealing rules)
    const sealed = sealNode(totals, 0);
    return {id: a.plot!, sealed, holder: {id: a.id, name: a.name, habit: a.habit, hours: hours[i]!, neglected}};
  });
}

/** The allotment's graph: twelve plots, the player's the sealed garden, the shared places, the household and the air. */
export function allotmentGraph(seed: number, garden: SealedNode, home: {money: number; members: Member[]}, hours: number): Graph {
  const nodes: NodeSpec[] = [], edges: Edge[] = [], base = garden.totals;
  const plot = (id: string, i: number, name: string, levers: Record<string, LeverValue>, land: LadderTotals['land']): NodeSpec => ({
    id, kind: 'plot', name, box: plotBox(i), land: {...land}, levers,
    stocks: {[SEALED.food]: {unit: 'kgFood', amount: qty(0, 'kgFood'), product: SEALED.product}},
  });
  const plan = {[PLAN_LEVERS.care]: CARE.base as Care, [PLAN_LEVERS.mix]: 'as grown' as Mix, [PLAN_LEVERS.feed]: 'compost' as Feed};
  const mine: SealedNode = {...garden, at: hours};
  mine.plan = planFor(base, plan.care, plan.mix, plan.feed);
  nodes.push(plot(PLAYER_PLOT, 0, 'Your plot', {
    [SEALED.lever]: mine as unknown as LeverValue, base: base as unknown as LeverValue, [SEALED.payer]: HOME, ...plan,
  }, base.land));
  const drawn = neighbourPlots(seed, base), season = seasonNodes(seed, drawn.map((n) => ({id: n.id, base: n.sealed.totals.output})));
  for (const n of drawn) {
    const i = Number(n.id.slice(5)) - 1;
    n.sealed.at = hours;
    nodes.push(plot(n.id, i, `${n.holder.name}’s plot`, {
      [SEALED.lever]: n.sealed as unknown as LeverValue, holder: n.holder as unknown as LeverValue, kept: season.kept[n.id] as unknown as LeverValue,
    }, n.sealed.totals.land));
  }
  // the neighbours themselves (src/sim/models/agency.ts), and the committee they sit on (src/sim/models/committee.ts)
  nodes.push(...season.neighbours);
  nodes.push({
    id: COMMITTEE, kind: 'committee', name: 'The committee', box: null, land: {built: 0},
    stocks: {[CAPITAL_STOCK]: {unit: 'support', amount: qty(CAPITAL.start, 'support')}, [GOODWILL_STOCK]: {unit: 'support', amount: qty(TRUST.baseline, 'support')}},
    levers: {[RULES]: {...START_RULES} as unknown as LeverValue, motion: null},
  });
  for (const p of SHARED) {
    const spec: NodeSpec = {id: p.id, kind: p.kind, name: p.name, box: {...p.box}, land: {[p.land]: p.box.w * p.box.h}};
    if (p.id === 'trough') (spec.stocks = {water: {unit: 'L', amount: qty(TROUGH_L.start, 'L'), cap: qty(TROUGH_L.cap, 'L')}}), (spec.levers = {today: null});
    // the swap shed's shelf (src/sim/season.ts)
    if (p.id === SHEDS) (spec.stocks = {[SEALED.food]: {unit: 'kgFood', amount: qty(0, 'kgFood'), product: SEALED.product}}),
      (spec.levers = {shelf: {byGroup: {}, left: 0, took: 0, first: null} as unknown as LeverValue});
    nodes.push(spec);
  }
  const ledger: AllotmentLedger = {since: hours, week: {}, grown: 0, eaten: 0, given: 0, saved: 0, last: null};
  const goal: LevelGoal = {history: emptyHistory(ALLOTMENT)};
  nodes.push({
    id: HOME, kind: 'household', name: 'The household', box: null, land: {built: 0},
    // its hours for the allotment this week (src/sim/season.ts): its garden hours less the plot's care
    stocks: {money: {unit: 'GBP', amount: qty(home.money, 'GBP')}, [HOURS_LEFT]: {unit: 'h', amount: qty(Math.max(0, weekGardenHours({members: home.members}) - plan.care), 'h')}},
    levers: {members: home.members as unknown as LeverValue, ledger: ledger as unknown as LeverValue, goal: goal as unknown as LeverValue, swap: 'off', seed},
  });
  nodes.push({id: ATMOSPHERE, kind: 'atmosphere', name: 'The air', box: null, levers: {weather: null, forecast: null}});
  for (let i = 0; i < PLOTS; i++) edges.push({id: `air-${plotId(i)}`, from: plotId(i), to: ATMOSPHERE, carries: ['kgCO2e']});
  edges.push({id: 'harvest-home', from: PLAYER_PLOT, to: HOME, carries: ['kgFood']});
  edges.push({id: 'trough-water', from: 'trough', to: PLAYER_PLOT, carries: ['L']});
  // food to the swap shed from every plot, and the helper's take from the neglected plot to their home
  for (let i = 0; i < PLOTS; i++) edges.push({id: `swap-${plotId(i)}`, from: plotId(i), to: SHEDS, carries: ['kgFood']});
  edges.push({id: 'helper-take', from: season.neglected, to: season.helper, carries: ['kgFood']});
  const g = makeGraph(nodes, edges);
  // each plot shows its sealed numbers from the first hour, not after its first tick
  for (let i = 0; i < PLOTS; i++) {
    const n = g.nodes[plotId(i)]!, sealed = sealedOf(n)!;
    n.totals = {...sealed.totals, land: {...sealed.totals.land}};
  }
  return g;
}

/** Takes the plot: seals the garden with its year's totals, keeps its graph below, and builds the allotment. Refused
 *  unless the garden's offer is latched. Returns why not, or null. */
export function stepUp(s: State): string | null {
  if (s.level !== 1 || s.ladder.length) return 'the plot is already yours';
  if (!offered(goalOf(s.graph))) return 'the committee hasn’t offered a plot yet';
  const totals = gardenTotals(s.graph);
  if (!totals) return 'the garden’s year isn’t in yet';
  const garden = sealNode(totals, s.hours);
  const money = s.graph.nodes[s.home]?.stocks.money?.amount ?? 0, members = membersOf(s.graph).members;
  s.ladder = [...s.ladder, {level: 1, hours: s.hours, totals, graph: s.graph}];
  const below = s.graph.nodes[ATMOSPHERE]?.levers;
  s.graph = allotmentGraph(s.seed, garden, {money, members}, s.hours);
  // the same sky: the garden's weather and its run of dry days carry on over the allotment
  const air = s.graph.nodes[ATMOSPHERE];
  if (air && below) (air.levers.weather = below.weather ?? null), (air.levers.forecast = below.forecast ?? null);
  s.level = ALLOTMENT;
  s.home = HOME;
  s.flows = [];
  s.activities = [];
  s.effects = [{kind: 'crop', cause: 'sealing', at: PLAYER_PLOT, amount: totals.output, unit: 'kgFood'}];
  return null;
}

/** Days since the plot was taken. */
export const daysSince = (g: Graph, hours: number) => (hours - (ledgerAt(g)?.since ?? hours)) / 24;
/** Whole days the plot has been played, by its last tick (so the sim, the page and the bot agree on what's unfolded). */
export const plotDays = (g: Graph) => Math.floor(daysSince(g, sealedOf(g.nodes[PLAYER_PLOT])?.at ?? 0) + 1e-9);
/** Whether a plan lever has unfolded yet: care at once, the mix after a week, the feed after three. */
export const leverOpen = (lever: keyof typeof LEVER_DAYS, days: number) => days >= LEVER_DAYS[lever];

const OPTIONS: Record<string, readonly LeverValue[]> = {
  [PLAN_LEVERS.care]: CARE.options, [PLAN_LEVERS.mix]: Object.keys(MIXES), [PLAN_LEVERS.feed]: Object.keys(FEEDS),
};

/** A person's afternoon on their plot: the walk from the sheds, the work, and the walk back, then away. */
function visit(ctx: TickContext, who: string, plot: string, from: number, hours: number) {
  const walk = 0.25, end = from + walk + hours;
  ctx.activity({id: `${who}-in-${from}`, who, kind: 'person', doing: 'walk', from: 'sheds', to: plot, via: ['spine'], start: from, end: from + walk});
  ctx.activity({id: `${who}-work-${from}`, who, kind: 'person', doing: 'work', from: plot, to: plot, start: from + walk, end});
  ctx.activity({id: `${who}-out-${from}`, who, kind: 'person', doing: 'walk', from: plot, to: 'sheds', via: ['spine'], start: end, end: end + walk});
  ctx.activity({id: `${who}-away-${from}`, who, kind: 'person', doing: 'away', from: 'sheds', to: 'sheds', start: end + walk, end: end + walk + 0.1});
}

/** The household's week at the allotment: wages in, the shop for the basket less what the plot gave, and the rest of life. */
function week(ctx: TickContext, home: GraphNode, l: AllotmentLedger) {
  const h: Household = membersOf(ctx.graph), need = basket(heads(h));
  let shop = 0, saved = 0, eaten = 0;
  for (const g of Object.keys(need) as FoodGroup[]) {
    const got = Math.min(need[g], (l.week as Partial<Record<FoodGroup, number>>)[g] ?? 0);
    eaten += got;
    shop += (need[g] - got) * PRICE[g];
    saved += got * PRICE[g];
  }
  const wages = householdWage(h), rest = restSpend(h), grown = sum(l.week);
  if (wages > 0) ctx.flow({what: 'wages', unit: 'GBP', amount: qty(wages, 'GBP'), from: {boundary: 'wages'}, to: {node: HOME, stock: 'money'}});
  const pay = (what: string, gbp: number, to: 'shop' | 'rest of life') => {
    const had = home.stocks.money?.amount ?? 0, amount = Math.min(had, gbp);
    if (amount > 1e-9) ctx.flow({what, unit: 'GBP', amount: qty(amount, 'GBP'), from: {node: HOME, stock: 'money'}, to: {boundary: to}});
  };
  pay('the weekly shop', shop, 'shop');
  pay('the rest of life', rest, 'rest of life');
  // the level's own history: the plot's week, its upkeep and carbon, and its ground
  const n = ctx.graph.nodes[PLAYER_PLOT], sealed = sealedOf(n), goal = home.levers.goal as unknown as LevelGoal | undefined;
  if (sealed && goal) {
    const t = sealed.totals;
    // the land: the plot's, and the second plot's as it's reclaimed (src/sim/season.ts)
    const history = record(goal.history, sampleOf(l.week, {quality: 0, upkeep: qty(t.upkeep * 7, 'GBP'), carbon: qty(t.carbon * 7, 'kgCO2e'), health: {soil: t.health}}), playerLand(ctx.graph, t.land) as LadderTotals['land']);
    home.levers.goal = {history} as unknown as LeverValue;
  }
  home.levers.ledger = {...l, week: {}, eaten: l.eaten + eaten, given: l.given + Math.max(0, grown - eaten), saved: l.saved + saved,
    last: {wages, shop, rest, saved, kg: grown}} as unknown as LeverValue;
}

/** The allotment's day and week (level 2 only): listed before `sealedSystem`, so the plan is on the node before it ticks
 *  and yesterday's food leaves the plots before today's comes. */
export const allotment: System = {
  name: 'allotment',
  levels: [ALLOTMENT],
  on: {
    day(ctx) {
      const home = ctx.graph.nodes[HOME], l = ledgerAt(ctx.graph);
      if (!home || !l) return;
      const date = calendar(ctx.hours), weekend = date.weekday >= 5, week: ByGroup = {...l.week};
      let grown = 0;
      for (let i = 0; i < PLOTS; i++) {
        const n = ctx.graph.nodes[plotId(i)], sealed = sealedOf(n);
        if (!n || !sealed) continue;
        // the second plot's food waits on it for the week, for the helper's share (src/sim/season.ts)
        if (isSecond(n)) continue;
        // the player's plan onto their sealed node
        if (n.id === PLAYER_PLOT) {
          const plan = planOf(n);
          if (plan) n.levers[SEALED.lever] = {...sealed, plan} as unknown as LeverValue;
        }
        // yesterday's food off the plot: the player's to the household, a neighbour's to theirs
        const kg = n.stocks[SEALED.food]?.amount ?? 0;
        if (kg > 1e-9) {
          if (n.id === PLAYER_PLOT) {
            ctx.flow({what: 'eaten from the plot', unit: 'kgFood', product: SEALED.product, amount: qty(kg, 'kgFood'), from: {node: n.id, stock: SEALED.food}, to: {boundary: 'eaten'}});
            const mix = sealed.totals.outputByGroup ?? basketMix(1), t = sum(mix);
            for (const g of PRODUCT_GROUPS) if (mix[g]) week[g] = (week[g] ?? 0) + (kg * mix[g]!) / t;
            grown = kg;
          } else ctx.flow({what: 'a neighbour’s harvest', unit: 'kgFood', product: SEALED.product, amount: qty(kg, 'kgFood'), from: {node: n.id, stock: SEALED.food}, to: {boundary: 'eaten'}});
          // the plot's holder on it for their hours: after work on a weekday, late morning at the weekend
          const hours = n.id === PLAYER_PLOT ? Number(n.levers[PLAN_LEVERS.care] ?? CARE.base) : keptOf(n)?.hours ?? holderOf(n)?.hours ?? 0;
          const visits = Math.max(1, Math.round(hours / 1.5)), today = ctx.rng.next() < visits / 7;
          if (hours > 0 && today) visit(ctx, n.id === PLAYER_PLOT ? GARDENER : holderOf(n)!.id, n.id, ctx.hours + (weekend ? 4 : 11) + ctx.rng.next() * 2, Math.min(3, hours / visits));
        }
      }
      home.levers.ledger = {...l, week, grown: l.grown + grown} as unknown as LeverValue;
    },
    week(ctx) {
      const home = ctx.graph.nodes[HOME], l = ledgerAt(ctx.graph);
      if (home && l) week(ctx, home, l);
    },
  },
  command(cmd, graph, level) {
    if (level !== ALLOTMENT || (cmd.type !== 'plan' && cmd.type !== 'policy' && cmd.type !== 'law')) return undefined;
    const n = graph.nodes[cmd.node];
    if (!n || n.kind !== 'plot') return undefined;
    if (n.id !== PLAYER_PLOT) return 'that’s a neighbour’s plot';
    if (!(cmd.lever in OPTIONS)) return 'the plot’s plan is its care, its mix and its feed';
    if (!OPTIONS[cmd.lever]!.includes(cmd.value)) return `${cmd.lever} is ${OPTIONS[cmd.lever]!.join(', ')}`;
    if (!leverOpen(cmd.lever as keyof typeof LEVER_DAYS, plotDays(graph))) return 'that hasn’t come up at the allotment yet';
    return null;
  },
};

/** The allotment's length in game hours, for the bot and the long run: about two years (src/data/allotment.ts). */
export const ALLOTMENT_HOURS = ALLOTMENT_DAYS * 24;

// ---- the carry check (docs/systems/ladder.md, "Inflating and the `carry` check") ----

export interface CarryReport {
  /** The plot's Output as sealed, and the garden's last full year's own: its samples' kg over its days. */
  output: {sealed: number; year: number; off: number};
  /** Whether the plot carries the garden's land (m² by use, as it stood) and its carbon (kg CO₂e a day) exactly. */
  land: boolean;
  carbon: boolean;
  /** The sealed garden rebuilt for one cycle (a year, day by day) against its totals, every number but Reliability
   *  inside INFLATE_TOLERANCE; and Reliability, a spread measured over one cycle, inside its own tolerance. */
  rebuilt: CarryResult;
  reliability: {sealed: number; rebuilt: number; off: number; ok: boolean};
}

/** The carry-over rule held to account: a sealed garden's Output against its last full year (within 1 %), its land and
 *  carbon carried exactly, and a first cycle rebuilt from the sealed node inside `INFLATE_TOLERANCE` of the totals it was
 *  sealed with. Until part 9 rebuilds the garden in detail, the rebuilt cycle is the sealed node's own daily ticks. Null before the step up. */
export function carryReport(s: Pick<State, 'ladder' | 'graph' | 'seed'>): CarryReport | null {
  const below = s.ladder.find((b) => b.level === 1), base = baseOf(s.graph.nodes[PLAYER_PLOT]), goal = below ? goalOf(below.graph) : null;
  if (!below || !base || !goal || !goal.history.samples.length) return null;
  const h = goal.history, days = h.samples.length * h.sampleDays, year = h.samples.reduce((a, x) => a + x.output, 0) / days;
  // sampled daily, the rebuilt cycle's spread is measured over 364 days, not 52 weeks: its Reliability's own sampling
  // error is then well inside the tolerance, which a year of weeks' isn't (about 10 % of the spread)
  let node = sealNode(base, 0), rebuilt: History = {...emptyHistory(1), sampleDays: 1, cap: days}, week: ByGroup = {};
  const dice = layoutRng(s.seed, `${PLAYER_PLOT}:carry`);
  for (let d = 1; d <= days; d++) {
    const r = sealedTick(node, d * 24, dice);
    node = r.node;
    for (const g of PRODUCT_GROUPS) if (r.byGroup[g]) week[g] = (week[g] ?? 0) + r.byGroup[g]!;
    rebuilt = record(rebuilt, sampleOf(week, {quality: base.quality, upkeep: qty(base.upkeep, 'GBP'), carbon: qty(base.carbon, 'kgCO2e'), health: {soil: node.totals.health}}), base.land);
    week = {};
  }
  const same = (a: LadderTotals['land'], b: LadderTotals['land']) => [...new Set([...Object.keys(a), ...Object.keys(b)])].every((k) => Math.abs((a[k as LandUse] ?? 0) - (b[k as LandUse] ?? 0)) < 1e-9);
  const again = windowTotals(rebuilt)!.totals, off = Math.abs(again.reliability - base.reliability) / Math.max(1, base.reliability);
  return {
    output: {sealed: base.output, year, off: year > 0 ? Math.abs(base.output - year) / year : base.output},
    land: same(base.land, landOf(below.graph)), carbon: Math.abs(base.carbon - (windowTotals(h)?.totals.carbon ?? NaN)) < 1e-9,
    rebuilt: carryCheck(inflateTarget(base, 1).totals, {...again, reliability: base.reliability}),
    reliability: {sealed: base.reliability, rebuilt: again.reliability, off, ok: off <= INFLATE_RELIABILITY_TOLERANCE},
  };
}
