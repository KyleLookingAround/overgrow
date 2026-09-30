// Activities: who is doing what, where, from when to when (the gardener watering bed 3 from 08:00 to 08:20; a lorry on
// a run leaving at 05:00). The snapshot carries them beside the flows, and the map animates from them, so everything
// that moves is drawn from something the sim has (the founding spec, "The look: a living map"). Part 1 defines the
// shape and how the map places one; the gardener's are the first real ones (src/sim/gardener.ts). docs/systems/map.md.
import type {Box, NodeId, Unit} from './graph';

export interface Activity {
  /** Unique while it lasts. */
  id: string;
  /** Who: 'gardener', 'neighbour-3', 'lorry-12'. */
  who: string;
  /** How the map draws them: 'person', 'barrow', 'van'. */
  kind: string;
  /** What they're doing: 'walk', 'water', 'sow', 'deliver'. */
  doing: string;
  /** Where it starts and where it ends (the same node for work in place). */
  from: NodeId;
  to: NodeId;
  /** Places passed on the way, in order. */
  via?: NodeId[];
  /** Game hours. */
  start: number;
  end: number;
  /** What's carried, if anything: the can, a basket of salad; `of`, what the load is measured against (a helper's barrow
   *  against what they said they took). */
  carry?: {unit: Unit; amount: number; product?: string; of?: number};
}

export interface Placed {
  x: number;
  y: number;
  /** 0 at the start, 1 at the end. */
  progress: number;
  /** -1 heading left, 1 right, 0 still. */
  facing: -1 | 0 | 1;
}

const centre = (b: Box) => ({x: b.x + b.w / 2, y: b.y + b.h / 2});

/**
 * Where an activity's actor is at a game hour: along the straight legs from its start through each place on the way to
 * its end, at an even pace, held at the ends before and after. Null if a place it names has no box on the map.
 */
export function placeAt(a: Activity, hours: number, boxOf: (id: NodeId) => Box | null | undefined): Placed | null {
  const pts: {x: number; y: number}[] = [];
  for (const id of [a.from, ...(a.via ?? []), a.to]) {
    const b = boxOf(id);
    if (!b) return null;
    pts.push(centre(b));
  }
  const span = a.end - a.start, progress = span > 0 ? Math.min(1, Math.max(0, (hours - a.start) / span)) : 1;
  const legs = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y)), total = legs.reduce((s, l) => s + l, 0);
  if (!total) return {...pts[0]!, progress, facing: 0};
  let d = progress * total;
  for (let i = 0; i < legs.length; i++) {
    const l = legs[i]!, p = pts[i]!, q = pts[i + 1]!;
    if (d <= l || i === legs.length - 1) {
      const k = l ? Math.min(1, d / l) : 1, dx = q.x - p.x;
      return {x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, progress, facing: progress <= 0 || progress >= 1 || !dx ? 0 : dx > 0 ? 1 : -1};
    }
    d -= l;
  }
  return {...pts[pts.length - 1]!, progress, facing: 0};
}
