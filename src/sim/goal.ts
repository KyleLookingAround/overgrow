// The goal: the level's history for the step-up offer (the founding spec, "What makes the jump feel earned"; win W18).
// Each week it records a sample of what the garden delivered (eaten and sold, from the kitchen's ledger), the carbon it
// put into the air and the dug beds' soil health into the level's ring (src/sim/ladder.ts, a year of weeks for the
// garden, from the first Monday), kept as the household's `goal` lever, which no command can set. The goal bar reads stepUpStatus() over it;
// part 7's sealing takes the same ring. docs/systems/ladder.md says how the ring and the test work.
import type {System} from './clock';
import {qty, type Graph, type LeverValue} from './graph';
import {emptyHistory, record, type History} from './ladder';
import {ledgerOf, KITCHEN} from './models/kitchen';
import {ATMOSPHERE} from './state';

export interface Goal {
  history: History;
  /** The running totals at the last sample: kg delivered since the start, and kg CO₂e in the air. */
  mark: {delivered: number; carbon: number};
}

export const GOAL = 'goal';
export const goalOf = (g: Graph): Goal | null => (g.nodes[KITCHEN]?.levers[GOAL] as unknown as Goal | null | undefined) ?? null;

/** The dug beds' mean soil health, 0–100 (each bed's own index, its `totals.health`). */
function soilHealth(g: Graph): number {
  const beds = Object.values(g.nodes).filter((n) => n.kind === 'bed' && (n.stocks['land.crops']?.amount ?? 0) > 0);
  return beds.length ? beds.reduce((a, n) => a + n.totals.health, 0) / beds.length : 0;
}

export const goal: System = {
  name: 'goal',
  on: {
    week(c) {
      const k = c.graph.nodes[KITCHEN];
      if (!k || !(GOAL in k.levers)) return;
      const had = goalOf(c.graph), l = ledgerOf(c.graph), delivered = l.eaten + l.sold, carbon = c.graph.nodes[ATMOSPHERE]?.stocks.carbon?.amount ?? 0;
      // the first Monday starts the ring: the days before it are less than a week
      if (!had) return void (k.levers[GOAL] = {history: emptyHistory(c.level), mark: {delivered, carbon}} as unknown as LeverValue);
      const history = record(had.history, {
        output: qty(Math.max(0, delivered - had.mark.delivered), 'kgFood'), quality: 0, upkeep: qty(0, 'GBP'),
        carbon: qty(carbon - had.mark.carbon, 'kgCO2e'), health: {soil: soilHealth(c.graph)},
      });
      k.levers[GOAL] = {history, mark: {delivered, carbon}} as unknown as LeverValue;
    },
  },
  command(cmd) {
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && cmd.lever === GOAL) return 'the goal’s history is kept, not set';
    return undefined;
  },
};
