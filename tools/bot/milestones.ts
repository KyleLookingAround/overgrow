// The milestones the bot reports the game day of, in the order the game reaches them (the founding spec, "How the bot
// measures pacing and balance from the first build"). Each is read from what the snapshot shows after a tick: its
// flows, its activities and the days so far. A milestone a later part brings has its line here already, without a
// `reached`: that part fills it in, and until then the bot leaves it out of what it prints.
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

/** kg of food the kitchen wants a day (the founding spec, "Harvest and demand"). */
export const KITCHEN_NEED_KG = 1;

/** The last seven days' food eaten, a day, including today so far. */
const eatenWeek = (d: Diary) => {
  const days = [...d.days.slice(-6), ...(d.current ? [d.current] : [])];
  return days.length < 7 ? 0 : days.reduce((a, x) => a + x.eaten, 0) / 7;
};

export const MILESTONES: readonly Milestone[] = [
  {id: 'first-sowing', label: 'First sowing', part: 3, reached: ({snap}) => snap.activities.some((a) => a.doing === 'sow') || snap.flows.some((f) => /sow/i.test(f.what))},
  {id: 'first-harvest', label: 'First harvest', part: 3, reached: ({diary}) => (diary.current?.harvested ?? 0) > 0},
  {id: 'first-sale', label: 'First sale', part: 3, reached: ({diary}) => (diary.current?.sold ?? 0) > 0},
  {id: 'half-kitchen', label: "Half the kitchen's need met (a week)", part: 3, reached: ({diary}) => eatenWeek(diary) >= KITCHEN_NEED_KG / 2},
  // each upgrade in the shed, by its id, and the first of them
  {id: 'first-upgrade', label: 'First upgrade', part: 6},
  {id: 'allotment-offer', label: 'The allotment offer', part: 7},
  {id: 'first-swap', label: 'First swap', part: 8},
  {id: 'second-plot', label: 'The second plot', part: 8},
];
