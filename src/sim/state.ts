// The game's state, what a new game starts from, and the snapshot the UI is shown. What's saved is exactly the State
// below less `rejected` and `errors` (src/sim/save.ts); anything only the screen needs lives in the UI. The founding
// spec's "The simulation's state and time" sets the list.
import {BUTT_LITRES, GARDEN, PLACES, START_MONEY, WAYS} from '../data/garden';
import type {Speed} from '../data/ladder';
import type {Activity} from './activity';
import {levelClock} from './clock';
import {copyNode, makeGraph, qty, type Edge, type Flow, type Graph, type GraphNode, type LeverValue, type NodeId, type NodeSpec} from './graph';
import {rng, type Rng} from './random';
import {startingSoil} from './models/soil';

/** A level the player has finished, sealed into one node of the next: its totals and its plan (part 7). */
export interface SealedNode {
  level: number;
  node: GraphNode;
}

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
  /** The levels below, sealed. */
  ladder: SealedNode[];
  upgrades: string[];
  laws: string[];
  goals: Record<string, LeverValue>;
  settings: Record<string, LeverValue>;
  /** Cards and hints already shown. */
  seen: string[];
  /** Why the last command was refused, or null. Not saved. */
  rejected: string | null;
  /** Flows a system tried that couldn't move, in the last tick. Not saved; the long run asserts there are none. */
  errors: string[];
}

/** The air above the level: emissions go to its carbon stock and sinks draw from it, so carbon balances in the graph. */
export const ATMOSPHERE = 'atmosphere';

/** The back garden on day 1 (src/data/garden.ts), as the level-1 graph. */
export function gardenGraph(): Graph {
  const area = (b: {w: number; h: number}) => b.w * b.h;
  const built = PLACES.filter((p) => p.id !== 'lawn').reduce((s, p) => s + area(p.box), 0);
  const nodes: NodeSpec[] = PLACES.map((p) => {
    const spec: NodeSpec = {id: p.id, kind: p.kind, name: p.name, box: {...p.box}, land: {[p.land]: p.id === 'lawn' ? GARDEN.w * GARDEN.h - built : area(p.box)}};
    if (p.id === 'butt') spec.stocks = {water: {unit: 'L', amount: qty(BUTT_LITRES.start, 'L'), cap: qty(BUTT_LITRES.cap, 'L')}};
    if (p.id === 'kitchen') spec.stocks = {money: {unit: 'GBP', amount: qty(START_MONEY, 'GBP')}};
    if (p.soil) spec.stocks = startingSoil(p.soil, spec.land![p.land]!, p.land === 'grass');
    return spec;
  });
  // the air carries the level's weather (src/sim/models/weather.ts), drawn from the first hour
  nodes.push({id: ATMOSPHERE, kind: 'atmosphere', name: 'The air', box: null, levers: {weather: null}});
  const edges: Edge[] = WAYS.map((w, i) => ({id: `way-${i + 1}`, from: w.from, to: w.to, carries: [...w.carries]}));
  for (const p of PLACES) edges.push({id: `air-${p.id}`, from: p.id, to: ATMOSPHERE, carries: ['kgCO2e']});
  return makeGraph(nodes, edges);
}

export function newState(seed: number, speed: Speed = 1): State {
  return {
    seed, rng: rng(seed), hours: 0, level: 1, speed, home: 'kitchen', graph: gardenGraph(), flows: [], activities: [], ladder: [],
    upgrades: [], laws: [], goals: {}, settings: {}, seen: [], rejected: null, errors: [],
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
  activities: Activity[];
  rejected: string | null;
  errors: string[];
}

export function snapshotOf(s: State): Snapshot {
  const nodes = Object.values(s.graph.nodes);
  return {
    seed: s.seed, hours: s.hours, level: s.level, step: levelClock(s.level).stepHours, speed: s.speed,
    money: s.graph.nodes[s.home]?.stocks.money?.amount ?? 0,
    carbon: s.graph.nodes[ATMOSPHERE]?.stocks.carbon?.amount ?? 0,
    rev: s.graph.rev, nodes: nodes.map(copyNode), edges: s.graph.edges.slice(), flows: s.flows,
    activities: s.activities.map((a) => ({...a})), rejected: s.rejected, errors: s.errors,
  };
}
