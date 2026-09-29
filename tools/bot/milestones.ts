// The milestones the bot reports the game day of, in the order the game reaches them (the founding spec, "How the bot
// measures pacing and balance from the first build"). Each is read from what the snapshot shows after a tick: a crop sown
// in a bed, and the kitchen's ledger (src/sim/models/kitchen.ts), which keeps the first harvest, the first sale and the
// share of the ask met at each meal. A milestone a later part brings has its line here already, without a `reached`:
// that part fills it in, and until then the bot leaves it out of what it prints.
import {gardenStatus, goalOf} from '../../src/sim/goal';
import type {Snapshot} from '../../src/sim/state';
import type {Diary} from './measure';

/** What a milestone is judged on, after each tick. */
export interface Watch {
  snap: Snapshot;
  diary: Diary;
}

export interface Milestone {
  id: string;
  label: string;
  /** The part of the first slice that brings it (docs/specs/overgrow.md, "The first roadmap"). */
  part: number;
  /** True from the tick it's reached. Missing until its part fills it in. */
  reached?: (w: Watch) => boolean;
}

/** When a bed's crop was sown, in game hours; before the start for the head start's overwintered salad (#11). */
const sownAt = (n: Snapshot['nodes'][number]) => (n.levers.crop as {sown?: number} | null | undefined)?.sown ?? -Infinity;

/** The share of the kitchen's ask met, over the last seven meals (the kitchen's ledger); 0 before there are seven. */
const metWeek = (s: Snapshot) => {
  const week = s.kitchen?.week ?? [];
  return week.length < 7 ? 0 : week.slice(-7).reduce((a, x) => a + x, 0) / 7;
};

export const MILESTONES: readonly Milestone[] = [
  {id: 'first-sowing', label: 'First sowing', part: 3, reached: ({snap}) => snap.nodes.some((n) => n.kind === 'bed' && sownAt(n) >= 0)},
  {id: 'first-harvest', label: 'First harvest', part: 3, reached: ({snap}) => snap.kitchen?.firstHarvest != null},
  {id: 'first-sale', label: 'First sale', part: 3, reached: ({snap}) => snap.kitchen?.firstSale != null},
  {id: 'half-kitchen', label: "Half the kitchen's need met (a week)", part: 3, reached: ({snap}) => metWeek(snap) >= 0.5},
  // each upgrade in the shed, by its id, and the first of them
  {id: 'first-upgrade', label: 'First upgrade', part: 6, reached: ({snap}) => {
    const kit = snap.nodes.find((n) => n.id === 'shed')?.levers.kit as {owned?: unknown[]; nematodes?: number} | undefined;
    return !!kit && ((kit.owned?.length ?? 0) > 0 || (kit.nematodes ?? 0) > 0);
  }},
  // the offer's three requirements met over the garden's year (src/sim/goal.ts): the level's-end card
  {id: 'allotment-offer', label: 'The allotment offer', part: 7, reached: ({snap}) => gardenStatus(goalOf({nodes: Object.fromEntries(snap.nodes.map((n) => [n.id, n]))} as never)).ready},
  {id: 'first-swap', label: 'First swap', part: 8},
  {id: 'second-plot', label: 'The second plot', part: 8},
];
