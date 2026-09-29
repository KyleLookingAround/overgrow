// The graph every level is made of (docs/decisions/ADR-2026-09-28-scale-free-graph.md): nodes with stocks, levers and
// totals whatever their size, edges between them, and flows in SI units that are conserved. A bed and a country are the
// same shape; only the node's kind and the data change. docs/systems/graph.md says how it works.
//
// Units are part of the types: a quantity is a number branded with its unit, so litres can't be added to kg of nitrogen
// by mistake (add() and sub() refuse it at compile time), and a flow's unit must match the stocks it leaves and reaches.

declare const unitBrand: unique symbol;

/** The units a stock or a flow is carried in. Food, feed and waste are kg by product. */
export type Unit =
  | 'L' // water, litres
  | 'kgN' | 'kgP' | 'kgK' // nutrients
  | 'kgCO2e' // carbon, as CO₂ equivalent
  | 'kgFood' | 'kgFeed' | 'kgWaste' // by product
  | 'h' // labour, hours
  | 'kWh' // energy
  | 'GBP' // money, pounds
  | 'm2' // land, square metres
  | 'pests' // a population count
  | 'support'; // opinion, support points

/** A number in a unit. Make one with qty(); combine with add() and sub(). */
export type Qty<U extends Unit> = number & {readonly [unitBrand]: U};

export const qty = <U extends Unit>(n: number, _unit: U): Qty<U> => n as Qty<U>;
export const add = <U extends Unit>(a: Qty<U>, b: Qty<NoInfer<U>>): Qty<U> => (a + b) as Qty<U>;
export const sub = <U extends Unit>(a: Qty<U>, b: Qty<NoInfer<U>>): Qty<U> => (a - b) as Qty<U>;
export const scale = <U extends Unit>(a: Qty<U>, k: number): Qty<U> => (a * k) as Qty<U>;

/** How a node's land is used. Land is counted on every node from the first bed, so the top-level land budget is a sum. */
export type LandUse = 'crops' | 'grass' | 'built' | 'path' | 'water' | 'woodland';

export interface Stock<U extends Unit = Unit> {
  unit: U;
  amount: Qty<U>;
  /** Food, feed and waste are kept by product ('salad', 'potatoes'); other stocks leave it out. */
  product?: string;
  /** The most it can hold, where there's a limit (a butt holds 200 L). Models keep to it; the graph doesn't. */
  cap?: Qty<U>;
}

export type NodeId = string;

/** Where a node sits on its level's map, in metres from the top-left corner. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A lever's value: what the player (or a manager, or the bot) has set. Plans, policies and laws are all levers; a
 * system declares the levers a node has, and reads them each tick.
 */
export type LeverValue = string | number | boolean | null | LeverValue[] | {[key: string]: LeverValue};

/**
 * The five headline numbers a node is judged by, and its carbon and land (the founding spec, "The carry-over rule").
 * Every node carries them from the start; sealing (part 7) computes them over the level's cycle, so it adds no field.
 */
export interface Totals {
  /** Food delivered, kg a day. */
  output: number;
  /** How good it is, weighted by output, 0–100. */
  quality: number;
  /** How steady the output is: 100 × (1 − the coefficient of variation over the window), 0–100. */
  reliability: number;
  /** What it costs to run, £ a day. */
  upkeep: number;
  /** The slow stocks behind it as one index, 0–100. */
  health: number;
  /** Output-weighted shelf life, days (from the town up; 0 below). */
  freshness: number;
  /** kg CO₂e a day, emissions less sinks. */
  carbon: number;
  /** m² by use. */
  land: Partial<Record<LandUse, number>>;
}

export interface GraphNode {
  id: NodeId;
  /** What it is ('bed', 'butt', 'shed', 'region'): the renderer draws by kind and systems act by kind. */
  kind: string;
  name: string;
  /** On the map, or null for a node that isn't drawn (the atmosphere). */
  box: Box | null;
  /** Every node has a 'carbon' stock (kg CO₂e) and at least one 'land.<use>' stock (m²). */
  stocks: Record<string, Stock>;
  levers: Record<string, LeverValue>;
  totals: Totals;
}

/** A connection flows can travel: a pipe, a path, a road, a trade lane. */
export interface Edge {
  id: string;
  from: NodeId;
  to: NodeId;
  carries: Unit[];
}

/** Where a flow comes from or goes to that isn't a stock in the graph: the edge of the model, named. */
export type Boundary =
  | 'rain' // water falling on the level
  | 'evapotranspiration' // water back to the air from soil and leaves
  | 'drainage' // water below the roots, into the ground
  | 'runoff' // water off the surface, into the drains
  | 'mains' // tap water from the supply
  | 'bought' // anything bought in from outside the level
  | 'sold' // anything sold out of it
  | 'eaten' // food eaten (it leaves the model as people)
  | 'time' // the hours people have
  | 'grid' // energy from the grid
  | 'growth' // plants making food and matter from air, water and sun, and the nutrients they take up from the soil
  | 'decay' // matter breaking down: food going off (out as food, back as waste), what a heap loses to the air, and creatures dying
  | 'wild' // creatures arriving from and leaving for beyond the level (winged aphids on the wind)
  | 'wages' // pay from a household member's employer
  | 'shop' // the shop a household buys its food from, and where that food's farm-to-shop footprint came from
  | 'rest of life'; // everything else a household spends on: housing, bills, travel, savings

export type End = {node: NodeId; stock: string} | {boundary: Boundary};

/** A movement in one tick. It leaves one end and arrives at the other, so a tick's balance can be summed. */
export interface Flow<U extends Unit = Unit> {
  /** What it is, for the Explain card and the renderer ('watering', 'rain', 'compost'). */
  what: string;
  unit: U;
  amount: Qty<U>;
  product?: string;
  from: End;
  to: End;
}

export interface Graph {
  nodes: Record<NodeId, GraphNode>;
  edges: Edge[];
  /** Goes up whenever nodes or edges are added, removed or moved, so the renderer knows to redraw the ground. */
  rev: number;
}

// ---- building ----

const LAND_PREFIX = 'land.';
export const landKey = (use: LandUse) => LAND_PREFIX + use;

export function emptyTotals(): Totals {
  return {output: 0, quality: 0, reliability: 0, upkeep: 0, health: 0, freshness: 0, carbon: 0, land: {}};
}

export interface NodeSpec {
  id: NodeId;
  kind: string;
  name: string;
  box?: Box | null;
  /** Land by use, m². A node with none still gets an empty land stock, so every node has one. */
  land?: Partial<Record<LandUse, number>>;
  /** Stocks besides carbon and land. */
  stocks?: Record<string, Stock>;
  carbon?: number;
  levers?: Record<string, LeverValue>;
}

/** A node with carbon and land on it, whatever else it has. */
export function makeNode(spec: NodeSpec): GraphNode {
  const stocks: Record<string, Stock> = {carbon: {unit: 'kgCO2e', amount: qty(spec.carbon ?? 0, 'kgCO2e')}};
  const land = Object.entries(spec.land ?? {}) as [LandUse, number][];
  if (!land.length) land.push(['built', 0]);
  for (const [use, m2] of land) stocks[landKey(use)] = {unit: 'm2', amount: qty(m2, 'm2')};
  Object.assign(stocks, spec.stocks);
  const totals = emptyTotals();
  for (const [use, m2] of land) totals.land[use] = m2;
  return {id: spec.id, kind: spec.kind, name: spec.name, box: spec.box ?? null, stocks, levers: {...spec.levers}, totals};
}

export function makeGraph(nodes: NodeSpec[], edges: Edge[]): Graph {
  const g: Graph = {nodes: {}, edges: [], rev: 1};
  for (const n of nodes) g.nodes[n.id] = makeNode(n);
  for (const e of edges) {
    if (!g.nodes[e.from] || !g.nodes[e.to]) throw new Error(`edge ${e.id} joins a node that isn't there`);
    g.edges.push(e);
  }
  return g;
}

/** A node's land by use, m². */
export function landOf(n: GraphNode): Partial<Record<LandUse, number>> {
  const out: Partial<Record<LandUse, number>> = {};
  for (const [k, s] of Object.entries(n.stocks)) if (k.startsWith(LAND_PREFIX)) out[k.slice(LAND_PREFIX.length) as LandUse] = s.amount;
  return out;
}

// ---- flows ----

export const isBoundary = (e: End): e is {boundary: Boundary} => 'boundary' in e;

/** Whether an edge joins two nodes (either way) and carries a unit. */
/** Each graph's edges as "a b unit" keys both ways, built again when the edge list, its length or the graph's revision changes. */
const joins = new WeakMap<Graph, {edges: Edge[]; n: number; rev: number; keys: Set<string>}>();
export function joined(g: Graph, a: NodeId, b: NodeId, unit: Unit): boolean {
  let j = joins.get(g);
  if (!j || j.edges !== g.edges || j.n !== g.edges.length || j.rev !== g.rev) {
    const keys = new Set<string>();
    for (const e of g.edges) for (const u of e.carries) keys.add(e.from + ' ' + e.to + ' ' + u).add(e.to + ' ' + e.from + ' ' + u);
    joins.set(g, (j = {edges: g.edges, n: g.edges.length, rev: g.rev, keys}));
  }
  return j.keys.has(a + ' ' + b + ' ' + unit);
}

/** Why one end of a flow can't take it, or null. */
function endProblem(g: Graph, f: Flow, end: End, leaving: boolean): string | null {
  if (isBoundary(end)) return null;
  const n = g.nodes[end.node];
  if (!n) return `${f.what}: no node ${end.node}`;
  const s = n.stocks[end.stock];
  if (!s) return leaving ? `${f.what}: ${end.node} has no stock ${end.stock}` : null;
  if (s.unit !== f.unit) return `${f.what}: ${end.node}.${end.stock} is in ${s.unit}, the flow in ${f.unit}`;
  if ((s.product ?? '') !== (f.product ?? '')) return `${f.what}: ${end.node}.${end.stock} holds ${s.product ?? 'no product'}, the flow ${f.product ?? 'none'}`;
  return null;
}

/**
 * Why a flow can't move, or null if it can: a positive, finite amount; ends that exist, in the flow's unit and product;
 * and between two nodes, an edge that carries it. A flow may arrive at a stock that isn't there yet (the first salad in
 * the kitchen); it can't leave one.
 */
export function flowProblem(g: Graph, f: Flow): string | null {
  if (!Number.isFinite(f.amount) || f.amount < 0) return `${f.what}: the amount ${f.amount} isn't a positive number`;
  if (isBoundary(f.from) && isBoundary(f.to)) return `${f.what}: runs from one boundary to another`;
  const bad = endProblem(g, f, f.from, true) ?? endProblem(g, f, f.to, false);
  if (bad) return bad;
  if (!isBoundary(f.from) && !isBoundary(f.to) && f.from.node !== f.to.node && !joined(g, f.from.node, f.to.node, f.unit))
    return `${f.what}: no edge between ${f.from.node} and ${f.to.node} carries ${f.unit}`;
  return null;
}

/** Moves a flow: out of one end and into the other. Returns why it couldn't, and then moves nothing. */
/** The stocks flows have moved since the last snapshot, by node and by graph (runtime only, never saved): the snapshot
 *  copies those again and reuses its copy of the rest (src/sim/state.ts). `ALL` marks a node changed outside a flow. */
export type Touched = Map<NodeId, Set<string>>;
export const ALL = '*';
const touched = new WeakMap<Graph, Touched>();
/** Starts (or restarts) noting the stocks flows touch on a graph, and returns what was noted since the last start. */
export function takeTouched(g: Graph): Touched | undefined {
  const had = touched.get(g);
  touched.set(g, new Map());
  return had;
}
const mark = (t: Touched, id: NodeId, stock: string) => {
  const s = t.get(id);
  if (s) s.add(stock);
  else t.set(id, new Set([stock]));
};
/** Notes a node as changed outside a flow (a stock set directly, a stock's cap), so the next snapshot copies it again. */
export const touch = (g: Graph, id: NodeId) => void (touched.has(g) && mark(touched.get(g)!, id, ALL));

export function applyFlow(g: Graph, f: Flow): string | null {
  const bad = flowProblem(g, f);
  if (bad) return bad;
  const t = touched.get(g);
  if (t) {
    if (!isBoundary(f.from)) mark(t, f.from.node, f.from.stock);
    if (!isBoundary(f.to)) mark(t, f.to.node, f.to.stock);
  }
  if (!isBoundary(f.from)) {
    const s = g.nodes[f.from.node]!.stocks[f.from.stock]!;
    s.amount = sub(s.amount, f.amount);
  }
  if (!isBoundary(f.to)) {
    const n = g.nodes[f.to.node]!;
    const s = (n.stocks[f.to.stock] ??= f.product === undefined ? {unit: f.unit, amount: qty(0, f.unit)} : {unit: f.unit, amount: qty(0, f.unit), product: f.product});
    s.amount = add(s.amount, f.amount);
  }
  return null;
}

// ---- the balance ----

/** The key a quantity is summed under: its unit and, for food, feed and waste, its product. */
const balanceKey = (unit: Unit, product?: string) => (product ? `${unit}:${product}` : unit);

/** Every stock of a set of nodes (a graph's, or a snapshot's) summed by unit (and product). */
export function stockTotals(nodes: Iterable<{stocks: Record<string, Stock>}>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const n of nodes)
    for (const s of Object.values(n.stocks)) {
      const k = balanceKey(s.unit, s.product);
      out[k] = (out[k] ?? 0) + s.amount;
    }
  return out;
}

/** What crossed the boundary in a set of flows, by unit (and product): in less out. */
export function boundaryNet(flows: readonly Flow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of flows) {
    const k = balanceKey(f.unit, f.product);
    const d = (isBoundary(f.from) ? f.amount : 0) - (isBoundary(f.to) ? f.amount : 0);
    if (d) out[k] = (out[k] ?? 0) + d;
  }
  return out;
}

/**
 * How far a tick is from balancing, per unit: the change in the graph's stocks less what crossed its boundary. Every
 * entry is zero, to rounding, when nothing appeared from nowhere (the `conservation` test).
 */
export function imbalance(before: Record<string, number>, after: Record<string, number>, flows: readonly Flow[]): Record<string, number> {
  const net = boundaryNet(flows), out: Record<string, number> = {};
  for (const k of new Set([...Object.keys(before), ...Object.keys(after), ...Object.keys(net)])) {
    const d = (after[k] ?? 0) - (before[k] ?? 0) - (net[k] ?? 0);
    if (Math.abs(d) > 1e-9 * Math.max(1, Math.abs(before[k] ?? 0), Math.abs(after[k] ?? 0))) out[k] = d;
  }
  return out;
}

/** Flows with the same ends, unit and product merged into one, so a snapshot over several steps stays small. */
export function mergeFlows(flows: readonly Flow[]): Flow[] {
  // bucketed by what, then matched field by field: cheaper than a string key for each of a tick's flows
  const by = new Map<string, Flow[]>(), out: Flow[] = [];
  for (const f of flows) {
    let bucket = by.get(f.what);
    if (!bucket) by.set(f.what, (bucket = []));
    const had = bucket.find((m) => m.unit === f.unit && m.product === f.product && sameEnd(m.from, f.from) && sameEnd(m.to, f.to));
    if (had) had.amount = add(had.amount, f.amount);
    else {
      const m = {...f};
      bucket.push(m);
      out.push(m);
    }
  }
  return out;
}

/** Whether two ends are the same stock, or the same boundary. */
function sameEnd(a: End, b: End): boolean {
  if ('boundary' in a) return 'boundary' in b && a.boundary === b.boundary;
  return !('boundary' in b) && a.node === b.node && a.stock === b.stock;
}

/** A copy of a node that later ticks can't change. */
/** A stock's copy. */
export const copyStock = (s: Stock): Stock => {
  const c: Stock = {unit: s.unit, amount: s.amount};
  if (s.cap !== undefined) c.cap = s.cap;
  if (s.product !== undefined) c.product = s.product;
  return c;
};

export function copyNode(n: GraphNode): GraphNode {
  const stocks: Record<string, Stock> = {};
  for (const k in n.stocks) stocks[k] = copyStock(n.stocks[k]!);
  return {...n, box: n.box && {...n.box}, stocks, levers: {...n.levers}, totals: {...n.totals, land: {...n.totals.land}}};
}
