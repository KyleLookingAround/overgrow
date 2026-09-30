// The game's state, what a new game starts from, and the snapshot the UI is shown. What's saved is exactly the State
// below less `rejected`, `errors` and `effects` (src/sim/save.ts); anything only the screen needs lives in the UI. The founding
// spec's "The simulation's state and time" sets the list.
import {BUTT_LITRES, GARDEN, PLACES, START_MONEY, WAYS} from '../data/garden';
import type {FoodGroup} from '../data/household';
import type {Speed} from '../data/ladder';
import type {Activity} from './activity';
import type {Below} from './allotment';
import type {Effect} from './effects';
import {zoomView, type Zoom, type ZoomView} from './zoom';
import {levelClock} from './clock';
import {ALL, nodeList, copyNode, copyStock, makeGraph, qty, takeTouched, type Edge, type Flow, type Graph, type GraphNode, type LeverValue, type NodeId, type NodeSpec, type Stock} from './graph';
import {GARDENER, GARDENER_LEVERS} from './gardener';
import {NO_KIT} from './kit';
import {BED_FLOWER_LEVERS, LAWN_LEVERS} from './models/biodiversity';
import {BED_LEVERS, overwintered} from './models/crops';
import {householdNode, startCupboard} from './models/household';
import {newLedger, shopProduct, type Ledger} from './models/kitchen';
import {startGoal} from './goal';
import {newPurse} from './purse';
import {rng, type Rng} from './random';
import {BED_PEST_LEVERS, LAWN_PEST_LEVERS, startingSlugs} from './models/pests';
import {startingSoil} from './models/soil';


export interface State {
  seed: number;
  /** The game's main stream; each system also gets its own dice per tick (src/sim/clock.ts). */
  rng: Rng;
  /** Game hours since the start. */
  hours: number;
  level: number;
  speed: Speed;
  /** The household node: its money is the purse the top bar shows. */
  home: NodeId;
  /** The current level's graph: every node's stocks and levers. */
  graph: Graph;
  /** The flows of the last tick command, merged. */
  flows: Flow[];
  activities: Activity[];
  /** The levels below, sealed into a node of this one, each kept compactly for the zoom back in (src/sim/allotment.ts). */
  ladder: Below[];
  /** The zoom back in (part 9, src/sim/zoom.ts): the slug outbreak on the player's plot and its rescue, once it has come. */
  zoom: Zoom | null;
  upgrades: string[];
  laws: string[];
  goals: Record<string, LeverValue>;
  settings: Record<string, LeverValue>;
  /** Cards, hints and instruments already shown: what has unfolded (src/data/unfold.ts). */
  seen: string[];
  /** Spacing what unfolds (round four): the game day the last batch unfolded, and the keys waiting for a later day, since
   *  from the third day on no more than one batch unfolds a day (src/sim/commands.ts). */
  unfolding: {day: number; waiting: string[]};
  /** The game hour each of the week's decision cards was last answered (the glut, the catalogue, a frost, a dry spell),
   *  so each asks once for what it's about (src/sim/commands.ts). */
  answered: Record<string, number>;
  /** Why the last command was refused, or null. Not saved. */
  rejected: string | null;
  /** Flows a system tried that couldn't move, in the last tick. Not saved; the long run asserts there are none. */
  errors: string[];
  /** Every effect of the last tick command with its cause and place, merged (src/sim/effects.ts). Not saved. */
  effects: Effect[];
}

/** The air above the level: emissions go to its carbon stock and sinks draw from it, so carbon balances in the graph. */
export const ATMOSPHERE = 'atmosphere';

/** The first plan: bed 1 follows the rotation once its overwintered salad leaves are done, and radishes are sown in
 *  bed 2 on the first morning. */
export const DEFAULT_PLAN: Record<string, string> = {'bed-1': 'rotation', 'bed-2': 'radish'};
/** The head start (the owner's pick, #11): bed 1 has salad leaves sown last September, a day or so of March warmth from
 *  their first cut, so the first harvest comes on day 2 or 3 while the spring sowings grow at the real pace. */
export const HEAD_START = {bed: 'bed-1', crop: 'salad', sownHoursAgo: 24 * 176, ddToGo: 5} as const;

/** The back garden on day 1 (src/data/garden.ts), as the level-1 graph. */
export function gardenGraph(): Graph {
  const area = (b: {w: number; h: number}) => b.w * b.h;
  const built = PLACES.filter((p) => p.id !== 'lawn').reduce((s, p) => s + area(p.box), 0);
  const nodes: NodeSpec[] = PLACES.map((p) => {
    const spec: NodeSpec = {id: p.id, kind: p.kind, name: p.name, box: {...p.box}, land: {[p.land]: p.id === 'lawn' ? GARDEN.w * GARDEN.h - built : area(p.box)}};
    if (p.id === 'butt') spec.stocks = {water: {unit: 'L', amount: qty(BUTT_LITRES.start, 'L'), cap: qty(BUTT_LITRES.cap, 'L')}};
    if (p.id === 'kitchen') spec.stocks = {money: {unit: 'GBP', amount: qty(START_MONEY, 'GBP')}, ...cupboard()};
    if (p.soil) spec.stocks = startingSoil(p.soil, spec.land![p.land]!, p.land === 'grass');
    // slugs in the dug beds and the lawn's edge (src/sim/models/pests.ts)
    if (p.id === 'lawn' || p.dug) Object.assign(spec.stocks!, startingSlugs(spec.land![p.land]!, p.id === 'lawn'));
    if (p.kind === 'bed') spec.levers = {...BED_LEVERS(DEFAULT_PLAN[p.id] ?? 'none'), ...BED_PEST_LEVERS(), ...BED_FLOWER_LEVERS()};
    if (p.id === 'lawn') spec.levers = {...LAWN_PEST_LEVERS(), ...LAWN_LEVERS()};
    // the kitchen's ledger, and the level's history for the goal (src/sim/goal.ts)
    // the goal's year counts from the game's first day: the first Monday's sample takes in the days before it
    if (p.id === 'kitchen') spec.levers = {ledger: newLedger() as unknown as LeverValue, goal: startGoal() as unknown as LeverValue, quality: {}, glut: 'sell', box: 'spare', purse: newPurse() as unknown as LeverValue};
    if (p.id === 'gate') spec.levers = {quality: {}};
    // the garden's kit: what's been bought from the shed (src/sim/kit.ts)
    if (p.id === 'shed') spec.levers = {kit: {...NO_KIT, owned: []} as unknown as LeverValue};
    return spec;
  });
  // the gardener: their hours for the day, the watering line, their tools and the day's jobs (src/sim/gardener.ts)
  nodes.push({id: GARDENER, kind: 'person', name: 'The gardener', box: null, stocks: {hours: {unit: 'h', amount: qty(0, 'h')}}, levers: GARDENER_LEVERS()});
  // the household beside the garden: the gardener alone, in a full-time job (src/sim/models/household.ts)
  nodes.push(householdNode());
  // the air carries the level's weather (src/sim/models/weather.ts), drawn from the first hour
  nodes.push({id: ATMOSPHERE, kind: 'atmosphere', name: 'The air', box: null, levers: {weather: null, forecast: null}});
  const edges: Edge[] = WAYS.map((w, i) => ({id: `way-${i + 1}`, from: w.from, to: w.to, carries: [...w.carries]}));
  for (const p of PLACES) edges.push({id: `air-${p.id}`, from: p.id, to: ATMOSPHERE, carries: ['kgCO2e']});
  // slugs crawl between the lawn's edge and every bed
  for (const p of PLACES) if (p.kind === 'bed') edges.push({id: `slugs-${p.id}`, from: 'lawn', to: p.id, carries: ['pests']});
  const g = makeGraph(nodes, edges);
  overwintered(g.nodes[HEAD_START.bed]!, HEAD_START.crop, HEAD_START.sownHoursAgo, HEAD_START.ddToGo);
  return g;
}

/** The kitchen's cupboard on day 1: last week's shop, its veg and the rest of the diet. */
function cupboard(): Record<string, Stock> {
  const out: Record<string, Stock> = {};
  for (const [g, kg] of Object.entries(startCupboard()) as [FoodGroup, number][]) {
    const product = shopProduct(g), had = out[`food.${product}`]?.amount ?? 0;
    out[`food.${product}`] = {unit: 'kgFood', amount: qty(had + kg, 'kgFood'), product};
  }
  return out;
}

export function newState(seed: number, speed: Speed = 1): State {
  return {
    seed, rng: rng(seed), hours: 0, level: 1, speed, home: 'kitchen', graph: gardenGraph(), flows: [], ladder: [], zoom: null,
    // the gardener stands by the shed on the first morning
    activities: [{id: 'g-start', who: GARDENER, kind: 'person', doing: 'rest', from: 'shed', to: 'shed', start: 0, end: 0.5}],
    upgrades: [], laws: [], goals: {}, settings: {}, seen: [], unfolding: {day: -1, waiting: []}, answered: {}, rejected: null, errors: [], effects: [],
  };
}

/** What the UI is shown after each command. Runtime-only detail (the camera, animations) never lives here. */
export interface Snapshot {
  seed: number;
  /** Game hours since the start. */
  hours: number;
  level: number;
  /** Game hours in one step at this level. */
  step: number;
  speed: Speed;
  /** The household's money, £. */
  money: number;
  /** kg CO₂e this level has put into the air since the start, less what it took back out. */
  carbon: number;
  /** The graph's revision: the ground only needs redrawing when it changes. */
  rev: number;
  nodes: GraphNode[];
  edges: Edge[];
  /** The flows of the last tick command, merged. */
  flows: Flow[];
  /** The last tick command's effects, each with its kind, cause, amount and place (src/sim/effects.ts). */
  effects: Effect[];
  /** What has unfolded (src/data/unfold.ts): the instruments the player has influence over so far, and the cards answered. */
  seen: string[];
  /** The page's saved settings ('details': show every number early). */
  settings: Record<string, LeverValue>;
  /** The game hour each decision card was last answered (State's `answered`). */
  answered: Record<string, number>;
  activities: Activity[];
  /** The zoom back in: the outbreak, the deadline and the rescue, while down in the garden too (null until it comes). */
  zoom: ZoomView | null;
  /** The kitchen's ledger: the day's ask and what met it, and what's been picked, eaten, wasted, sold and earned. */
  kitchen: Ledger | null;
  rejected: string | null;
  errors: string[];
}

/** Each state's copies of its nodes at the last snapshot. The snapshot copied every stock of every node every hour,
 *  about a fifth of a garden day's time (6b's and the playable garden's look backs); now a node copies again only the
 *  stocks flows moved since (src/sim/graph.ts's `takeTouched`), reusing its last copy of the rest, and a node nothing
 *  touched whose levers are the same values and whose totals are the same numbers is its last copy. Runtime only. */
const copies = new WeakMap<State, Map<NodeId, GraphNode>>();
/** The graph each state's copies were taken from: a level changed (the step up, going down and back up) copies afresh. */
const copiedFrom = new WeakMap<State, Graph>();

/** Whether a node's levers are the same values as its last copy's (levers are replaced, never changed in place). */
function sameLevers(a: GraphNode['levers'], b: GraphNode['levers']): boolean {
  let k = 0;
  for (const key in a) {
    if (a[key] !== b[key]) return false;
    k++;
  }
  for (const _ in b) k--;
  return k === 0;
}

/** Whether a node's totals are the same numbers as its last copy's. */
function sameTotals(x: GraphNode['totals'], y: GraphNode['totals']): boolean {
  if (x.health !== y.health || x.output !== y.output || x.quality !== y.quality || x.reliability !== y.reliability || x.upkeep !== y.upkeep ||
    x.freshness !== y.freshness || x.carbon !== y.carbon) return false;
  for (const use in x.land) if (x.land[use as keyof typeof x.land] !== y.land[use as keyof typeof y.land]) return false;
  return true;
}

/** A node's copy from its last one: the stocks flows moved copied again and the rest reused, its levers and totals
 *  reused if they're the same; the last copy itself if nothing changed. */
function recopy(n: GraphNode, c: GraphNode, moved: Set<string> | undefined): GraphNode {
  const levers = sameLevers(n.levers, c.levers) ? c.levers : {...n.levers};
  const totals = sameTotals(n.totals, c.totals) ? c.totals : {...n.totals, land: {...n.totals.land}};
  let stocks = c.stocks;
  if (moved) {
    // a flow only moves or makes a stock (one set or removed directly marks the node ALL, copied whole)
    stocks = {...c.stocks};
    for (const k of moved) if (n.stocks[k]) stocks[k] = copyStock(n.stocks[k]);
  }
  return stocks === c.stocks && levers === c.levers && totals === c.totals ? c : {...c, stocks, levers, totals};
}

/** The nodes, copied: again where they changed, the last copy where they didn't. */
function nodeCopies(s: State): GraphNode[] {
  const same = copiedFrom.get(s) === s.graph, had = same ? copies.get(s) : undefined, touched = takeTouched(s.graph), changed = same ? touched : undefined, now = had && changed ? had : new Map<NodeId, GraphNode>(), out: GraphNode[] = [];
  for (const n of nodeList(s.graph)) {
    const id = n.id, c = had?.get(id), moved = changed?.get(id);
    const copy = !c || !changed || moved?.has(ALL) ? copyNode(n) : recopy(n, c, moved);
    if (copy !== c) now.set(id, copy);
    out.push(copy);
  }
  // nodes gone from the graph leave the kept copies too
  if (now.size > out.length) for (const id of now.keys()) if (!(id in s.graph.nodes)) now.delete(id);
  copies.set(s, now);
  copiedFrom.set(s, s.graph);
  return out;
}

/** The edges' copy, kept while the graph's revision and edge list stay the same (edges change only with the revision). */
const edgeCopies = new WeakMap<Graph, {rev: number; n: number; copy: Edge[]}>();
function edgesOf(g: Graph): Edge[] {
  const had = edgeCopies.get(g);
  if (had && had.rev === g.rev && had.n === g.edges.length) return had.copy;
  const copy = g.edges.slice();
  edgeCopies.set(g, {rev: g.rev, n: g.edges.length, copy});
  return copy;
}

export function snapshotOf(s: State): Snapshot {
  const nodes = nodeCopies(s);
  return {
    seed: s.seed, hours: s.hours, level: s.level, step: levelClock(s.level).stepHours, speed: s.speed,
    money: s.graph.nodes[s.home]?.stocks.money?.amount ?? 0,
    carbon: s.graph.nodes[ATMOSPHERE]?.stocks.carbon?.amount ?? 0,
    rev: s.graph.rev, nodes, edges: edgesOf(s.graph), flows: s.flows, effects: s.effects, seen: s.seen, settings: s.settings, answered: s.answered, zoom: zoomView(s.zoom),
    // an activity never changes once started (src/sim/activity.ts): the list is copied, the activities shared
    activities: s.activities.slice(),
    kitchen: (s.graph.nodes.kitchen?.levers.ledger as unknown as Ledger | undefined) ?? null, rejected: s.rejected, errors: s.errors,
  };
}
