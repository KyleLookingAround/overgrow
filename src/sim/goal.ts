// The goal: the level's history for the step-up offer (the founding spec, "What makes the jump feel earned"; win W18).
// Each week it records a sample of what the garden delivered (eaten and sold, from the kitchen's ledger), the carbon it
// put into the air and the dug beds' soil health into the level's ring (src/sim/ladder.ts, a year of weeks for the
// garden, from the game's first day), kept as the household's `goal` lever, which no command can set. Beside the ring it keeps
// each week's share of the household's veg the garden met at its meals (the kitchen's ledger), and the garden's offer
// takes its Reliability from those: how steadily the garden fed the household, week in, week out, over the year
// (gardenStatus(); docs/decisions/ADR-2026-09-29-garden-reliability.md says why it isn't the ring's spread). The goal
// bar and the level's-end card read gardenStatus(); part 7's sealing takes the ring. docs/systems/ladder.md says how.
import type {System} from './clock';
import {qty, type Graph, type LeverValue} from './graph';
import {emptyHistory, record, stepUpStatus, windowTotals, type History, type StepUpStatus} from './ladder';
import {ledgerOf, KITCHEN} from './models/kitchen';
import {ATMOSPHERE} from './state';

export interface Goal {
  history: History;
  /** The running totals at the last sample: kg delivered since the start, and kg CO₂e in the air. */
  mark: {delivered: number; carbon: number};
  /** Each week's share of the household's veg ask the garden met at its meals, 0–1, as many weeks as the ring holds. */
  fed: number[];
  /** The game hour the offer was first met, or null: latched, so progress that falls back doesn't take it away (the
   *  step-up command waits for it, src/sim/allotment.ts). */
  offered: number | null;
}

/** Whether the garden's offer has been met and latched: the step-up card comes, and the plot can be taken. */
export const offered = (g: Goal | null) => g?.offered != null;

/** The garden's step-up offer over its goal (the founding spec, "What makes the jump feel earned"): the ring's Output and
 *  Health, and Reliability as 100 × the mean of the weeks' shares of the veg ask met, so a garden that feeds the
 *  household every week of the year, winter included, is the reliable one. */
export function gardenStatus(g: Goal | null): StepUpStatus {
  const w = g ? windowTotals(g.history) : null;
  if (!w || !g) return stepUpStatus(w);
  const fed = g.fed.slice(-g.history.samples.length), reliability = fed.length ? (100 * fed.reduce((a, x) => a + x, 0)) / fed.length : 0;
  return stepUpStatus({...w, totals: {...w.totals, reliability}});
}

/** A new game's goal: an empty ring from the first day, so its first sample (the first Monday's) takes in the days
 *  before it, and a garden that does well can meet the offer inside its first year. */
export const startGoal = (): Goal => ({history: emptyHistory(1), mark: {delivered: 0, carbon: 0}, fed: [], offered: null});

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
      // a graph with no goal yet (a test's own) starts its ring at the first Monday
      if (!had) return void (k.levers[GOAL] = {history: emptyHistory(c.level), mark: {delivered, carbon}, fed: [], offered: null} as unknown as LeverValue);
      const met = l.week.length ? l.week.reduce((a, x) => a + Math.min(1, x), 0) / l.week.length : 0;
      const history = record(had.history, {
        output: qty(Math.max(0, delivered - had.mark.delivered), 'kgFood'), quality: 0, upkeep: qty(0, 'GBP'),
        carbon: qty(carbon - had.mark.carbon, 'kgCO2e'), health: {soil: soilHealth(c.graph)},
      });
      const next: Goal = {history, mark: {delivered, carbon}, fed: [...had.fed, met].slice(-history.cap), offered: had.offered ?? null};
      if (next.offered === null && gardenStatus(next).ready) next.offered = c.hours;
      k.levers[GOAL] = next as unknown as LeverValue;
    },
  },
  command(cmd) {
    if ((cmd.type === 'plan' || cmd.type === 'policy' || cmd.type === 'law') && cmd.lever === GOAL) return 'the goal’s history is kept, not set';
    return undefined;
  },
};
