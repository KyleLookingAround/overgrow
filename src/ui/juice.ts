// The map's small rewards (the playable garden, round two), read from each snapshot against the one before, so a Vitest
// test holds them: a purchase pulses where the thing now stands (the buy's `buying` effect is at its place); a sale at
// the honesty box sends a coin from the box towards the purse; the first harvest bursts over its bed; and a sowing drops
// its seed on the bed. Nothing here changes the game. Under reduced motion each shows as a still (page.css).
import type {Snapshot} from '../sim/state';

export type JuiceKind = 'pulse' | 'coin' | 'burst' | 'seed';
export interface Juice {
  id: number;
  kind: JuiceKind;
  /** The node it's drawn over. */
  at: string;
}
/** How long each shows, ms. */
export const JUICE_MS = 1600;

/** The rewards a snapshot brings, against the one before it (none after a new game or a load). */
export function juiceOf(before: Snapshot, after: Snapshot, next: () => number): Juice[] {
  const out: Juice[] = [];
  for (const e of after.effects) if (e.cause === 'buying') out.push({id: next(), kind: 'pulse', at: e.at});
  if (after.flows.some((f) => f.what === 'honesty box' && f.unit === 'GBP')) out.push({id: next(), kind: 'coin', at: 'gate'});
  if (before.kitchen?.firstHarvest == null && after.kitchen?.firstHarvest != null) {
    const pick = after.flows.find((f) => f.what === 'picking' && 'node' in f.from);
    if (pick && 'node' in pick.from) out.push({id: next(), kind: 'burst', at: pick.from.node});
  }
  // a sowing: a crop in a bed that had none
  for (const n of after.nodes) {
    if (n.kind !== 'bed' || !n.levers.crop) continue;
    const was = before.nodes.find((b) => b.id === n.id);
    if (was && !was.levers.crop) out.push({id: next(), kind: 'seed', at: n.id});
  }
  return out;
}
