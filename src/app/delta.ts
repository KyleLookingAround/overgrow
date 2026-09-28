// Snapshot deltas across the worker boundary: after the first snapshot, the worker sends only the nodes whose stocks,
// levers or totals changed and the activities that started or ended, and the page patches its copy. A 5,000-node
// snapshot copied whole took far past the 2 ms budget on a throttled phone (docs/SYSTEMS.md, "Speed budget"), so the
// founding spec's fallback applies from the start. A new game, a load or a changed graph (its rev) sends it whole again.
// A changed node sends only the stocks that changed. An activity never changes once started (a system ends it and
// starts another with a new id); one that reaches its end time is dropped on both sides, so only one cut short is sent.
import type {Activity} from '../sim/activity';
import type {GraphNode, LeverValue, Stock, Totals} from '../sim/graph';
import type {Snapshot} from '../sim/state';

/** A changed node: its changed stocks (all of them, with `allStocks`, if one went), and its levers or totals if changed. */
export type NodePatch = Pick<GraphNode, 'id'> & Partial<Pick<GraphNode, 'stocks' | 'levers' | 'totals'>> & {allStocks?: true};

export interface SnapshotDelta {
  base: Omit<Snapshot, 'nodes' | 'edges' | 'activities'>;
  /** The whole graph and every activity: the first time, and after a new game, a load or a change to the graph. */
  whole?: Pick<Snapshot, 'nodes' | 'edges' | 'activities'>;
  changed?: NodePatch[];
  started?: Activity[];
  ended?: string[];
}

/** The stocks that changed from a to b, null if none; all of b's if one of a's is gone. */
const stockChanges = (a: Record<string, Stock>, b: Record<string, Stock>): {stocks: Record<string, Stock>; allStocks?: true} | null => {
  let out: Record<string, Stock> | null = null, n = 0;
  for (const k in b) {
    const x = a[k], y = b[k]!;
    if (!x || x.amount !== y.amount || x.cap !== y.cap) (out ??= {})[k] = y;
    n++;
  }
  if (n !== Object.keys(a).length) return {stocks: b, allStocks: true};
  return out && {stocks: out};
};
const sameLevers = (a: Record<string, LeverValue>, b: Record<string, LeverValue>) => {
  let n = 0;
  for (const k in b) {
    if (a[k] !== b[k]) return false;
    n++;
  }
  return n === Object.keys(a).length;
};
const sameTotals = (a: Totals, b: Totals) =>
  a.output === b.output && a.quality === b.quality && a.reliability === b.reliability && a.upkeep === b.upkeep && a.health === b.health &&
  a.freshness === b.freshness && a.carbon === b.carbon && sameLevers(a.land, b.land);

/** The worker's side: what changed from the last snapshot sent to the next. */
export function diff(prev: Snapshot | null, next: Snapshot): SnapshotDelta {
  const {nodes, edges, activities, ...base} = next;
  const whole = () => ({base, whole: {nodes, edges, activities}});
  if (!prev || prev.rev !== next.rev || prev.seed !== next.seed || next.hours < prev.hours || prev.nodes.length !== nodes.length) return whole();
  const changed: NodePatch[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const a = prev.nodes[i]!, b = nodes[i]!;
    if (a.id !== b.id) return whole();
    const s = stockChanges(a.stocks, b.stocks), l = !sameLevers(a.levers, b.levers), t = !sameTotals(a.totals, b.totals);
    if (s || l || t) changed.push({id: b.id, ...s, ...(l && {levers: b.levers}), ...(t && {totals: b.totals})});
  }
  const had = new Set(prev.activities.map((a) => a.id)), has = new Set(activities.map((a) => a.id)), expired = next.hours - next.step;
  return {
    base, changed, started: activities.filter((a) => !had.has(a.id)),
    ended: prev.activities.filter((a) => !has.has(a.id) && a.end >= expired).map((a) => a.id),
  };
}

/** The page's side: keeps the last snapshot and patches it with each delta. */
export function patcher() {
  let cur: Snapshot | null = null, index = new Map<string, number>();
  return (d: SnapshotDelta): Snapshot => {
    if (d.whole || !cur) {
      const w = d.whole ?? {nodes: [], edges: [], activities: []};
      index = new Map(w.nodes.map((n, i) => [n.id, i]));
      return (cur = {...d.base, ...w});
    }
    let nodes = cur.nodes, activities = cur.activities;
    if (d.changed?.length) {
      nodes = nodes.slice();
      for (const p of d.changed) {
        const i = index.get(p.id);
        if (i === undefined) continue;
        const {allStocks, ...fields} = p, n = nodes[i]!;
        nodes[i] = {...n, ...fields, stocks: p.stocks ? (allStocks ? p.stocks : {...n.stocks, ...p.stocks}) : n.stocks};
      }
    }
    const expired = d.base.hours - d.base.step, gone = new Set(d.ended);
    if (gone.size || activities.some((a) => a.end < expired)) activities = activities.filter((a) => a.end >= expired && !gone.has(a.id));
    if (d.started?.length) activities = activities.concat(d.started);
    return (cur = {...d.base, nodes, edges: cur.edges, activities});
  };
}
