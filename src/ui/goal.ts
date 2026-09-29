// What the goal bar says (the founding spec, "What makes the jump feel earned"; win W18), from the snapshot alone, so a
// Vitest test holds it. Before the first harvest it counts down to that; after, it shows the step-up offer's three
// numbers over the window stepUpStatus() takes (the garden's last full year, src/sim/ladder.ts) and names the one holding
// the player back, in a player's words. Early in the year it says what the window is waiting for, not an empty bar.
import {CROPS} from '../data/crops';
import type {Requirement} from '../data/ladder-rules';
import {GOAL, type Goal} from '../sim/goal';
import {stepUpStatus, windowTotals, type RequirementStatus} from '../sim/ladder';
import {cropOf, progress, stageOf} from '../sim/models/crops';
import type {Snapshot} from '../sim/state';

export interface GoalLine {
  /** The one line: the goal, and what's holding it back. */
  text: string;
  /** The three requirements, the furthest from its target first, or null before the first harvest. */
  rows: RequirementStatus[] | null;
  /** The share of the window there is so far, 0–1, or null before the first harvest. */
  window: number | null;
}

const NAME: Record<Requirement, string> = {output: 'Output', reliability: 'Reliability', health: 'Health'};
/** What raises each, in a few words a player understands. */
export const RAISE: Record<Requirement, string> = {
  output: 'more to pick: keep every bed sown',
  reliability: 'a steadier mix of crops',
  health: 'compost, the rotation and steady watering',
};
/** A requirement's value against its target, as the bar shows it. */
export function valueText(r: RequirementStatus): string {
  const v = r.key === 'output' ? r.value.toFixed(1) : String(Math.round(r.value)), t = r.key === 'output' ? `${r.target} kg a day` : String(r.target);
  return `${NAME[r.key]} ${v} of ${t}`;
}

export function goalLine(snap: Pick<Snapshot, 'nodes' | 'kitchen'>): GoalLine {
  if (snap.kitchen?.firstHarvest == null) {
    // the crop nearest its first pick
    let best: {name: string; bed: string; p: number; ready: boolean} | null = null;
    for (const n of snap.nodes) {
      const c = n.kind === 'bed' ? cropOf(n) : null;
      if (!c || c.dead) continue;
      const ready = stageOf(c) === 'ready', p = ready ? 1 : progress(c);
      if (!best || p > best.p) best = {name: CROPS[c.id].name.toLowerCase(), bed: n.name, p, ready};
    }
    const text = !best ? 'First harvest: sow a bed' : best.ready ? `First harvest: ${best.name} in ${best.bed}, ready to pick` : `First harvest: ${best.name} in ${best.bed}, ${Math.round(100 * best.p)} % grown`;
    return {text, rows: null, window: null};
  }
  const g = (snap.nodes.find((n) => n.id === 'kitchen')?.levers[GOAL] as unknown as Goal | null | undefined) ?? null, w = g ? windowTotals(g.history) : null, st = stepUpStatus(w), weeks = Math.round(st.days / 7), of = Math.round(st.windowDays / 7);
  if (!w) return {text: 'The allotment: the committee looks at your garden’s whole year, from its first full week', rows: null, window: 0};
  const held = st.binding ? `${valueText(st.binding)}: ${RAISE[st.binding.key]}` : 'All three met';
  return {text: st.full ? held : `${held} (${weeks} of ${of} weeks so far)`, rows: st.requirements, window: Math.min(1, st.days / st.windowDays)};
}
