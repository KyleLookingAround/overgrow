// Effects: every change in the game with a cause and a place (the owner's win W3, docs/ideas/final-call-wins.md). This
// file is the one way in: it records each effect's kind, its cause and amount and the node it happened at. Every flow a
// system moves is one, its `what` the cause (flowEffects(), from the tick's merged flows), and a system notes an event
// that moves nothing with note() (a frost, a Smith period, slugs grazing a seedling bed), merged by cause, place and
// unit. Both are carried in the snapshot; the Explain table (src/data/explain.ts) says what each cause is, and the
// Explain card, the badges and the map's pulse read them. docs/systems/explain.md says how it works.
import {KIND_BY_CAUSE, type Kind} from '../data/explain';
import type {TickContext} from './clock';
import {isBoundary, type Flow, type Graph, type NodeId} from './graph';

export interface Effect {
  /** What sort of effect, from the Explain table: 'unknown' for a cause with no entry (the checks fail on it). */
  kind: Kind | 'unknown';
  /** Why: a flow's `what`, or an event's name ('frost', 'slugs', 'Smith period'). The Explain table's key. */
  cause: string;
  /** Where on the map it happened: a node id. */
  at: NodeId;
  /** How much, in `unit`: a flow's unit, or an event's ('share' of a crop, '°C', 'dd' of growth, 'slugs'). */
  amount: number;
  unit: string;
}

export const kindOf = (cause: string): Kind | 'unknown' => KIND_BY_CAUSE[cause] ?? 'unknown';

/** Collects a tick command's effects, merged by cause, place and unit. */
export class Recorder {
  private by = new Map<string, Effect>();
  add(cause: string, at: NodeId, amount: number, unit: string) {
    if (!Number.isFinite(amount)) return;
    const k = cause + '|' + at + '|' + unit, had = this.by.get(k);
    if (had) had.amount += amount;
    else this.by.set(k, {kind: kindOf(cause), cause, at, amount, unit});
  }
  list(): Effect[] {
    return [...this.by.values()];
  }
}

// the recorder a graph's tick is writing to: commands.ts opens one for the length of a tick command
const open = new WeakMap<Graph, Recorder>();
export const recordInto = (g: Graph, r: Recorder | null) => void (r ? open.set(g, r) : open.delete(g));

/** Where a flow happened: the end it reaches if that's drawn on the map, else the end it leaves if that is, else
 *  whichever end is a node (the gardener's hours). */
export function placeOf(g: Graph, f: Flow): NodeId | null {
  const to = isBoundary(f.to) ? null : f.to.node, from = isBoundary(f.from) ? null : f.from.node;
  if (to && g.nodes[to]?.box) return to;
  if (from && g.nodes[from]?.box) return from;
  return to ?? from;
}

/** The one entry point: records an effect at a place. Flows are noted by the tick itself, once merged (commands.ts). */
export function note(c: Pick<TickContext, 'graph'>, cause: string, at: NodeId, amount: number, unit: string) {
  open.get(c.graph)?.add(cause, at, amount, unit);
}

/** A tick's merged flows as effects, each of its `what` at its place: one each, since the merge already joined the flows
 *  with the same cause, ends and unit (two with different ends at one place stay two). */
export function flowEffects(g: Graph, flows: readonly Flow[]): Effect[] {
  const out: Effect[] = [];
  for (const f of flows) {
    const at = placeOf(g, f);
    if (at) out.push({kind: kindOf(f.what), cause: f.what, at, amount: f.amount, unit: f.unit});
  }
  return out;
}
